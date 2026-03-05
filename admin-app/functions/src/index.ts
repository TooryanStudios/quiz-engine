import * as admin from 'firebase-admin'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { defineString } from 'firebase-functions/params'
import * as functionsV1 from 'firebase-functions/v1'


admin.initializeApp()

// Reads from functions/.env (gitignored) — never hardcoded in source.
const masterEmailParam = defineString('MASTER_EMAIL')
const geminiApiKeyParam = defineString('GEMINI_API_KEY')

const TRIAL_INITIAL_CREDITS = 100
const COST_COVER_IMAGE = 20
const COST_QUESTION_MEDIA_IMAGE = 10
const COST_QUESTION_CHECK = 2

// Vertex AI Imagen — uses the Cloud Function's built-in service account (ADC).
// No extra API key needed; the service account just needs the "Vertex AI User" role in IAM.
async function geminiGenerateImage(params: { apiKey: string; prompt: string }) {
  const { prompt } = params

  // 1. Get an access token from the metadata server (available in all GCP runtimes)
  const tokenRes = await fetch(
    'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
    { headers: { 'Metadata-Flavor': 'Google' } }
  )
  if (!tokenRes.ok) {
    throw new HttpsError('internal', `Failed to get GCP access token: ${tokenRes.status}`)
  }
  const tokenData = await tokenRes.json() as { access_token: string }
  const accessToken = tokenData.access_token

  // 2. Get the project ID (available in Cloud Functions via env var)
  const projectId = process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || ''
  if (!projectId) throw new HttpsError('internal', 'Could not determine GCP project ID.')

  // 3. Call Vertex AI Imagen endpoint
  const endpoint =
    `https://us-central1-aiplatform.googleapis.com/v1/projects/${projectId}/locations/us-central1/publishers/google/models/imagen-3.0-generate-001:predict`

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      instances: [{ prompt }],
      parameters: { sampleCount: 1 },
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new HttpsError('internal', `Image generation failed: ${errorText}`)
  }

  const payload = await response.json() as {
    predictions?: Array<{ bytesBase64Encoded?: string; mimeType?: string }>
  }

  const base64Str = payload.predictions?.[0]?.bytesBase64Encoded
  if (!base64Str) {
    throw new HttpsError('internal', `Image API returned no valid image data: ${JSON.stringify(payload)}`)
  }

  const contentType = payload.predictions?.[0]?.mimeType || 'image/jpeg'
  const imageBuffer = Buffer.from(base64Str, 'base64')
  return { imageBuffer, contentType }
}

async function storeImageAndGetUrl(params: { storagePath: string; imageBuffer: Buffer; contentType: string }) {
  const { storagePath, imageBuffer, contentType } = params
  const bucket = admin.storage().bucket()
  const file = bucket.file(storagePath)

  const downloadToken = `${Date.now()}-${Math.random().toString(36).slice(2)}`
  await file.save(imageBuffer, {
    contentType,
    metadata: {
      cacheControl: 'public,max-age=3600',
      metadata: {
        firebaseStorageDownloadTokens: downloadToken,
      },
    },
    resumable: false,
  })

  const imageUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media&token=${downloadToken}`
  return { imageUrl }
}

async function generateStoreAndChargeImage(params: {
  uid: string
  apiKey: string
  prompt: string
  storagePathPrefix: string
  cost: number
  reason: string
}) {
  const { uid, apiKey, prompt, storagePathPrefix, cost, reason } = params
  let charged = false
  try {
    await chargeCredits({ uid, cost, reason })
    charged = true

    const { imageBuffer, contentType } = await geminiGenerateImage({ apiKey, prompt })
    const ext = contentType.includes('jpeg') ? 'jpg' : 'png'
    const storagePath = `${storagePathPrefix}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const { imageUrl } = await storeImageAndGetUrl({ storagePath, imageBuffer, contentType })
    return { imageUrl, storagePath }
  } catch (err) {
    if (charged) {
      await refundCredits({ uid, amount: cost, reason: `${reason}_failed` })
    }
    throw err
  }
}

type EntitlementsDoc = {
  plan: 'free' | 'starter' | 'pro'
  creditsRemaining: number
  trialGranted: boolean
  trialInitialCredits: number
  activePackIds: string[]
  createdAt: admin.firestore.FieldValue
  updatedAt: admin.firestore.FieldValue
}

function entitlementsRef(uid: string) {
  return admin.firestore().doc(`entitlements/${uid}`)
}

async function chargeCredits(params: {
  uid: string
  cost: number
  reason: string
}): Promise<{ creditsRemaining: number }> {
  const { uid, cost, reason } = params
  if (!uid) throw new HttpsError('unauthenticated', 'Must be signed in.')
  if (!Number.isFinite(cost) || cost <= 0) {
    throw new HttpsError('invalid-argument', 'Invalid credit cost.')
  }

  const ref = entitlementsRef(uid)

  try {
    const remaining = await admin.firestore().runTransaction(async (tx) => {
      const snap = await tx.get(ref)
      let current = 0
      if (!snap.exists) {
        const doc: Omit<EntitlementsDoc, 'createdAt' | 'updatedAt'> & { createdAt: admin.firestore.FieldValue; updatedAt: admin.firestore.FieldValue } = {
          plan: 'free',
          creditsRemaining: TRIAL_INITIAL_CREDITS,
          trialGranted: true,
          trialInitialCredits: TRIAL_INITIAL_CREDITS,
          activePackIds: [],
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }
        tx.set(ref, doc)
        current = TRIAL_INITIAL_CREDITS
      } else {
        const data = snap.data() as Partial<EntitlementsDoc> & { creditsRemaining?: unknown }
        current = typeof data.creditsRemaining === 'number' ? data.creditsRemaining : 0
      }
      if (current < cost) {
        throw new HttpsError('resource-exhausted', `Out of credits. Required: ${cost}, remaining: ${current}.`)
      }
      const next = current - cost
      tx.update(ref, {
        creditsRemaining: next,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastCharge: { cost, reason, at: admin.firestore.FieldValue.serverTimestamp() },
      })
      return next
    })
    return { creditsRemaining: remaining }
  } catch (err) {
    if (err instanceof HttpsError) throw err
    throw new HttpsError('internal', `Failed to charge credits (${reason}).`)
  }
}

async function refundCredits(params: { uid: string; amount: number; reason: string }) {
  const { uid, amount, reason } = params
  if (!uid || !Number.isFinite(amount) || amount <= 0) return
  const ref = entitlementsRef(uid)
  await admin.firestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) return
    const data = snap.data() as { creditsRemaining?: unknown }
    const current = typeof data.creditsRemaining === 'number' ? data.creditsRemaining : 0
    tx.update(ref, {
      creditsRemaining: current + amount,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      lastRefund: { amount, reason, at: admin.firestore.FieldValue.serverTimestamp() },
    })
  })
}

/**
 * Auth trigger — creates entitlements/{uid} with a one-time trial credit wallet.
 * Client writes to entitlements are blocked by Firestore rules.
 */
export const onAuthUserCreated = functionsV1
  .region('us-central1')
  .auth.user()
  .onCreate(async (user: functionsV1.auth.UserRecord) => {
  const uid = user.uid
  if (!uid) return

  const ref = entitlementsRef(uid)
  const snap = await ref.get()
  if (snap.exists) return

  const doc: EntitlementsDoc = {
    plan: 'free',
    creditsRemaining: TRIAL_INITIAL_CREDITS,
    trialGranted: true,
    trialInitialCredits: TRIAL_INITIAL_CREDITS,
    activePackIds: [],
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }

  await ref.set(doc)
})


export interface AuthUserRecord {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  disabled: boolean
  creationTime: string | null
  lastSignInTime: string | null
}

/**
 * Callable function — lists all Firebase Auth users.
 * Only callable by the master admin.
 */
export const listAuthUsers = onCall({ region: 'us-central1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be signed in.')
  }
  if (request.auth.token.email !== masterEmailParam.value()) {
    throw new HttpsError('permission-denied', 'Not authorized.')
  }

  const users: AuthUserRecord[] = []
  let pageToken: string | undefined

  do {
    const result = await admin.auth().listUsers(1000, pageToken)
    for (const u of result.users) {
      users.push({
        uid: u.uid,
        email: u.email ?? null,
        displayName: u.displayName ?? null,
        photoURL: u.photoURL ?? null,
        disabled: u.disabled,
        creationTime: u.metadata.creationTime ?? null,
        lastSignInTime: u.metadata.lastSignInTime ?? null,
      })
    }
    pageToken = result.pageToken
  } while (pageToken)

  return { users }
})

/**
 * Sets the `admin: true` custom claim on the calling user if their email
 * matches MASTER_EMAIL. Call this once from the admin panel to migrate
 * away from email-based Firestore rule checks to claim-based checks.
 * After calling this, sign out and back in to get a refreshed token.
 */
export const grantAdminClaim = onCall({ region: 'us-central1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be signed in.')
  }
  if (request.auth.token.email !== masterEmailParam.value()) {
    throw new HttpsError('permission-denied', 'Not authorized.')
  }
  if (request.auth.token['admin'] === true) {
    return { message: 'Admin claim already set.' }
  }
  await admin.auth().setCustomUserClaims(request.auth.uid, { admin: true })
  return { message: 'Admin claim granted. Sign out and back in to apply.' }
})

type GenerateCoverRequest = {
  title?: string
  quizSummary?: string
}

type GenerateCoverResponse = {
  imageUrl: string
  storagePath: string
}

function buildCoverPrompt(title: string, quizSummary: string): string {
  const safeTitle = title.trim() || 'Quiz Game'
  const safeSummary = quizSummary.trim() || 'General educational trivia quiz content.'
  return [
    'Create a new original quiz cover image that is visually stunning and directly relevant to the quiz topic.',
    'Style: artistic digital illustration, vibrant saturated colors, dynamic composition, modern game UI aesthetics.',
    'Requirements: no text, no letters, no numbers, no watermarks, no UI overlays.',
    'The image must immediately convey the theme and subject matter of the quiz at a glance.',
    `Quiz title: ${safeTitle}`,
    `Quiz content and theme: ${safeSummary}`,
    'Make the image exciting, immersive, and game-like — suitable as the hero image for a trivia game.',
  ].join('\n')
}

export const generateQuizCoverImage = onCall<GenerateCoverRequest, Promise<GenerateCoverResponse>>(
  { region: 'us-central1' },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Must be signed in.')
    }

    const apiKey = geminiApiKeyParam.value()
    if (!apiKey) {
      throw new HttpsError('failed-precondition', 'GEMINI_API_KEY is not configured in Cloud Functions.')
    }

    const title = typeof request.data?.title === 'string' ? request.data.title : ''
    const quizSummary = typeof request.data?.quizSummary === 'string' ? request.data.quizSummary : ''
    const prompt = buildCoverPrompt(title, quizSummary)

    const { imageUrl, storagePath } = await generateStoreAndChargeImage({
      uid: request.auth.uid,
      apiKey,
      prompt,
      storagePathPrefix: `quiz-covers/ai/${request.auth.uid}`,
      cost: COST_COVER_IMAGE,
      reason: 'ai_cover_image',
    })
    return { imageUrl, storagePath }
  },
)

type GenerateAiImageRequest =
  | { kind: 'cover'; title?: string; quizSummary?: string; quizId?: string }
  | { kind: 'question_media'; questionText: string; answerSummary?: string; quizContext?: string; quizId?: string }

type GenerateAiImageResponse = {
  imageUrl: string
  storagePath: string
}

export const generateAiImage = onCall<GenerateAiImageRequest, Promise<GenerateAiImageResponse>>(
  { region: 'us-central1', cors: true },
  async (request) => {
    if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Must be signed in.')
    const apiKey = geminiApiKeyParam.value()
    if (!apiKey) throw new HttpsError('failed-precondition', 'GEMINI_API_KEY is not configured in Cloud Functions.')

    const data = request.data as any
    const kind = data?.kind
    if (kind !== 'cover' && kind !== 'question_media') {
      throw new HttpsError('invalid-argument', 'Invalid kind.')
    }

    const quizIdRaw = typeof data?.quizId === 'string' ? data.quizId.trim() : ''
    const quizId = quizIdRaw && !quizIdRaw.includes('/') ? quizIdRaw : ''

    if (quizId) {
      const quizSnap = await admin.firestore().doc(`quizzes/${quizId}`).get()
      if (!quizSnap.exists) {
        throw new HttpsError('not-found', 'Quiz not found.')
      }
      const quizData = quizSnap.data() as { ownerId?: unknown } | undefined
      const ownerId = typeof quizData?.ownerId === 'string' ? quizData.ownerId : ''
      const isAdmin = request.auth?.token?.admin === true
      if (!isAdmin && ownerId !== request.auth.uid) {
        throw new HttpsError('permission-denied', 'Not allowed to generate assets for this quiz.')
      }
    }

    if (kind === 'cover') {
      const title = typeof data?.title === 'string' ? data.title : ''
      const quizSummary = typeof data?.quizSummary === 'string' ? data.quizSummary : ''
      const prompt = buildCoverPrompt(title, quizSummary)
      const { imageUrl, storagePath } = await generateStoreAndChargeImage({
        uid: request.auth.uid,
        apiKey,
        prompt,
        storagePathPrefix: quizId
          ? `quiz-assets/${quizId}/covers/ai`
          : `quiz-covers/ai/${request.auth.uid}`,
        cost: COST_COVER_IMAGE,
        reason: 'ai_cover_image',
      })
      return { imageUrl, storagePath }
    }

    const questionText = typeof data?.questionText === 'string' ? data.questionText : ''
    const answerSummary = typeof data?.answerSummary === 'string' ? data.answerSummary : ''
    const quizContext = typeof data?.quizContext === 'string' ? data.quizContext : ''
    if (!questionText.trim()) {
      throw new HttpsError('invalid-argument', 'questionText is required.')
    }
    const prompt = buildQuestionMediaPrompt(questionText, answerSummary, quizContext)
    const { imageUrl, storagePath } = await generateStoreAndChargeImage({
      uid: request.auth.uid,
      apiKey,
      prompt,
      storagePathPrefix: quizId
        ? `quiz-assets/${quizId}/question-media/ai`
        : `quiz-media/ai/${request.auth.uid}`,
      cost: COST_QUESTION_MEDIA_IMAGE,
      reason: 'ai_question_media_image',
    })
    return { imageUrl, storagePath }
  },
)

type AiContextFile = { name: string; type: string; data: string }

type GenerateQuizQuestionsRequest = {
  promptText: string
  questionCount: number
  contextFiles?: AiContextFile[]
}

type GenerateQuizQuestionsResponse = {
  title?: string
  questions: unknown[]
  extractedText?: string
  creditsRemaining: number
}

async function geminiGenerateJson(params: {
  apiKey: string
  model: string
  promptText: string
  contextFiles: AiContextFile[]
}): Promise<string> {
  const { apiKey, model, promptText, contextFiles } = params
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`

  const parts: Array<Record<string, unknown>> = [{ text: promptText }]
  for (const f of contextFiles) {
    if (!f?.data || !f?.type) continue
    parts.push({
      inlineData: {
        data: f.data,
        mimeType: f.type,
      },
    })
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: {
        responseMimeType: 'application/json',
      },
    }),
  })

  const payload = await response.json().catch(() => ({})) as any
  if (!response.ok) {
    const msg = payload?.error?.message || 'Gemini request failed.'
    throw new Error(msg)
  }

  const text = payload?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text).filter(Boolean).join('')
  if (!text || typeof text !== 'string') throw new Error('Gemini returned no text.')
  return text
}

export const generateQuizQuestions = onCall<GenerateQuizQuestionsRequest, Promise<GenerateQuizQuestionsResponse>>(
  { region: 'us-central1' },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Must be signed in.')
    }

    const apiKey = geminiApiKeyParam.value()
    if (!apiKey) {
      throw new HttpsError('failed-precondition', 'GEMINI_API_KEY is not configured in Cloud Functions.')
    }

    const promptText = typeof request.data?.promptText === 'string' ? request.data.promptText : ''
    const questionCountRaw = request.data?.questionCount
    const questionCount = typeof questionCountRaw === 'number' ? Math.floor(questionCountRaw) : Number(questionCountRaw)
    const contextFiles = Array.isArray(request.data?.contextFiles)
      ? (request.data?.contextFiles as AiContextFile[]).slice(0, 4)
      : []

    if (!promptText.trim()) {
      throw new HttpsError('invalid-argument', 'promptText is required.')
    }
    if (!Number.isFinite(questionCount) || questionCount <= 0 || questionCount > 40) {
      throw new HttpsError('invalid-argument', 'questionCount must be between 1 and 40.')
    }

    // Cost model: 1 credit per question requested.
    let charged = false
    let chargeResult: { creditsRemaining: number } | null = null
    try {
      chargeResult = await chargeCredits({ uid: request.auth.uid, cost: questionCount, reason: 'ai_quiz_questions' })
      charged = true

      const modelCandidates = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.0-flash']
      let lastErr: unknown = null
      let rawText: string | null = null

      for (const model of modelCandidates) {
        try {
          rawText = await geminiGenerateJson({ apiKey, model, promptText, contextFiles })
          break
        } catch (e) {
          lastErr = e
        }
      }

      if (!rawText) {
        const msg = lastErr instanceof Error ? lastErr.message : 'No response from Gemini.'
        throw new HttpsError('internal', `AI generation failed: ${msg}`)
      }

      const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

      let parsed: any = null
      try {
        parsed = JSON.parse(cleaned)
      } catch {
        // Fallback: try to extract JSON object
        const m = cleaned.match(/\{[\s\S]*\}/)
        if (m?.[0]) parsed = JSON.parse(m[0])
      }

      const questions = Array.isArray(parsed)
        ? parsed
        : (parsed && Array.isArray(parsed.questions) ? parsed.questions : null)

      if (!questions || questions.length === 0) {
        throw new HttpsError('internal', 'AI response did not contain a questions array.')
      }

      const title = parsed && typeof parsed.title === 'string' ? parsed.title : undefined
      const extractedText = parsed && typeof parsed.extractedText === 'string' ? parsed.extractedText : undefined
      return {
        title,
        questions,
        extractedText,
        creditsRemaining: chargeResult?.creditsRemaining ?? 0,
      }
    } catch (err) {
      if (charged) {
        await refundCredits({ uid: request.auth.uid, amount: questionCount, reason: 'ai_quiz_questions_failed' })
      }
      if (err instanceof HttpsError) throw err
      const msg = err instanceof Error ? err.message : 'Unknown error'
      throw new HttpsError('internal', `AI generation failed: ${msg}`)
    }
  },
)

type CheckQuestionCorrectnessRequest = {
  questionText: string
  answerSummary?: string
}

type CheckQuestionCorrectnessResponse = {
  verdict: 'ok' | 'issues' | 'uncertain'
  summary: string
  issues: string[]
  suggestions: string[]
  creditsRemaining: number
}

export const checkQuestionCorrectness = onCall<CheckQuestionCorrectnessRequest, Promise<CheckQuestionCorrectnessResponse>>(
  { region: 'us-central1' },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Must be signed in.')
    }

    const apiKey = geminiApiKeyParam.value()
    if (!apiKey) {
      throw new HttpsError('failed-precondition', 'GEMINI_API_KEY is not configured in Cloud Functions.')
    }

    const questionText = typeof request.data?.questionText === 'string' ? request.data.questionText : ''
    const answerSummary = typeof request.data?.answerSummary === 'string' ? request.data.answerSummary : ''

    if (!questionText.trim()) {
      throw new HttpsError('invalid-argument', 'questionText is required.')
    }

    let charged = false
    let chargeResult: { creditsRemaining: number } | null = null
    try {
      chargeResult = await chargeCredits({ uid: request.auth.uid, cost: COST_QUESTION_CHECK, reason: 'ai_question_check' })
      charged = true

      const promptText = [
        'You are verifying a quiz question and its answers.',
        'Return STRICT JSON with keys: verdict ("ok"|"issues"|"uncertain"), summary (string), issues (string[]), suggestions (string[]).',
        'If you are not confident, use verdict="uncertain".',
        'Be concise. Do NOT include markdown fences.',
        '',
        `Question: ${questionText.trim()}`,
        answerSummary.trim() ? `Answers: ${answerSummary.trim()}` : 'Answers: (not provided)',
      ].join('\n')

      const modelCandidates = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.0-flash']
      let lastErr: unknown = null
      let rawText: string | null = null

      for (const model of modelCandidates) {
        try {
          rawText = await geminiGenerateJson({ apiKey, model, promptText, contextFiles: [] })
          break
        } catch (e) {
          lastErr = e
        }
      }

      if (!rawText) {
        const msg = lastErr instanceof Error ? lastErr.message : 'No response from Gemini.'
        throw new HttpsError('internal', `AI check failed: ${msg}`)
      }

      const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      let parsed: any
      try {
        parsed = JSON.parse(cleaned)
      } catch {
        throw new HttpsError('internal', 'AI check returned invalid JSON.')
      }

      const verdict = parsed?.verdict
      const summary = typeof parsed?.summary === 'string' ? parsed.summary : ''
      const issues = Array.isArray(parsed?.issues) ? parsed.issues.filter((x: any) => typeof x === 'string').slice(0, 12) : []
      const suggestions = Array.isArray(parsed?.suggestions) ? parsed.suggestions.filter((x: any) => typeof x === 'string').slice(0, 12) : []

      const safeVerdict: 'ok' | 'issues' | 'uncertain' = verdict === 'ok' || verdict === 'issues' || verdict === 'uncertain'
        ? verdict
        : 'uncertain'

      return {
        verdict: safeVerdict,
        summary: summary || (safeVerdict === 'ok' ? 'Looks correct.' : safeVerdict === 'issues' ? 'Potential issues found.' : 'Not confident.'),
        issues,
        suggestions,
        creditsRemaining: chargeResult?.creditsRemaining ?? 0,
      }
    } catch (err) {
      if (charged) {
        await refundCredits({ uid: request.auth.uid, amount: COST_QUESTION_CHECK, reason: 'ai_question_check_failed' })
      }
      throw err
    }
  },
)

type GenerateQuestionMediaImageRequest = {
  questionText: string
  answerSummary?: string
}

type GenerateQuestionMediaImageResponse = {
  imageUrl: string
  storagePath: string
}

function buildQuestionMediaPrompt(questionText: string, answerSummary: string, quizContext?: string): string {
  const safeQ = questionText.trim()
  const safeA = answerSummary.trim()
  const safeCtx = (quizContext || '').trim()
  return [
    'Create a new original image to accompany a trivia quiz question.',
    'Style: clean modern illustration, high contrast, vibrant colors, game-like aesthetic.',
    'CRITICAL: Do NOT include any text, letters, numbers, logos, or watermarks in the image.',
    'The image must visually represent the topic of the question without explicitly revealing the correct answer.',
    'Make it engaging, clear, and immediately understandable as a visual hint for the question.',
    safeCtx ? `Quiz context (for visual cohesion): ${safeCtx}` : '',
    `Question: ${safeQ}`,
    safeA ? `Answer hints (depict concepts, NOT the exact answer): ${safeA}` : '',
  ].filter(Boolean).join('\n')
}

export const generateQuestionMediaImage = onCall<GenerateQuestionMediaImageRequest, Promise<GenerateQuestionMediaImageResponse>>(
  { region: 'us-central1' },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Must be signed in.')
    }

    const apiKey = geminiApiKeyParam.value()
    if (!apiKey) {
      throw new HttpsError('failed-precondition', 'GEMINI_API_KEY is not configured in Cloud Functions.')
    }

    const questionText = typeof request.data?.questionText === 'string' ? request.data.questionText : ''
    const answerSummary = typeof request.data?.answerSummary === 'string' ? request.data.answerSummary : ''

    if (!questionText.trim()) {
      throw new HttpsError('invalid-argument', 'questionText is required.')
    }

    const prompt = buildQuestionMediaPrompt(questionText, answerSummary)

    const { imageUrl, storagePath } = await generateStoreAndChargeImage({
      uid: request.auth.uid,
      apiKey,
      prompt,
      storagePathPrefix: `quiz-media/ai/${request.auth.uid}`,
      cost: COST_QUESTION_MEDIA_IMAGE,
      reason: 'ai_question_media_image',
    })
    return { imageUrl, storagePath }
  },
)
