import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase'

export type AiImageKind = 'cover' | 'question_media'

type GenerateAiImageRequest =
  | { kind: 'cover'; title?: string; quizSummary?: string; quizId?: string }
  | { kind: 'question_media'; questionText: string; answerSummary?: string; quizContext?: string; quizId?: string }

type GenerateAiImageResponse = {
  imageUrl: string
  storagePath: string
}

function getCallableCode(err: unknown): string | undefined {
  const maybeCode = (err as { code?: unknown } | null | undefined)?.code
  return typeof maybeCode === 'string' ? maybeCode : undefined
}

function looksLikeCorsOrNetworkFailure(err: unknown): boolean {
  const code = getCallableCode(err)
  // When the browser blocks the request (CORS/preflight), the Functions SDK often surfaces it as "internal".
  if (code === 'functions/internal' || code === 'internal' || code === 'functions/unavailable') {
    return true
  }

  const raw = String((err as any)?.message ?? '')
  return raw.includes('No \'Access-Control-Allow-Origin\'') || raw.includes('net::ERR_FAILED') || raw === 'internal'
}

function looksLikeNotFound(err: unknown): boolean {
  const code = getCallableCode(err)
  if (code === 'functions/not-found' || code === 'not-found') return true
  const msg = (err as { message?: unknown } | null | undefined)?.message
  return typeof msg === 'string' && msg.toLowerCase().includes('not found')
}

export async function generateAndStoreAiImage(params: GenerateAiImageRequest): Promise<GenerateAiImageResponse> {
  const callable = httpsCallable<GenerateAiImageRequest, GenerateAiImageResponse>(functions, 'generateAiImage')

  try {
    const result = await callable(params)
    const imageUrl = result.data?.imageUrl?.trim()
    const storagePath = result.data?.storagePath?.trim()
    if (!imageUrl || !storagePath) throw new Error('AI image generation returned an invalid response.')
    return { imageUrl, storagePath }
  } catch (err) {
    // Backwards-compat fallback: if `generateAiImage` isn't deployed yet.
    if (!looksLikeNotFound(err) && !looksLikeCorsOrNetworkFailure(err)) throw err

    if (params.kind === 'cover') {
      const legacy = httpsCallable<{ title?: string; quizSummary?: string }, GenerateAiImageResponse>(functions, 'generateQuizCoverImage')
      const result = await legacy({ title: params.title, quizSummary: params.quizSummary })
      const imageUrl = result.data?.imageUrl?.trim()
      const storagePath = result.data?.storagePath?.trim()
      if (!imageUrl || !storagePath) throw new Error('AI image generation returned an invalid response.')
      return { imageUrl, storagePath }
    }

    // For question media: try the legacy callable first, then fall back to cover generator as last resort.
    try {
      const legacy = httpsCallable<{ questionText: string; answerSummary?: string }, GenerateAiImageResponse>(functions, 'generateQuestionMediaImage')
      const result = await legacy({ questionText: params.questionText, answerSummary: params.answerSummary })
      const imageUrl = result.data?.imageUrl?.trim()
      const storagePath = result.data?.storagePath?.trim()
      if (!imageUrl || !storagePath) throw new Error('AI image generation returned an invalid response.')
      return { imageUrl, storagePath }
    } catch (legacyErr) {
      if (!looksLikeNotFound(legacyErr)) throw legacyErr
      const legacyCover = httpsCallable<{ title?: string; quizSummary?: string }, GenerateAiImageResponse>(functions, 'generateQuizCoverImage')
      const result = await legacyCover({ title: params.questionText.slice(0, 80), quizSummary: params.answerSummary })
      const imageUrl = result.data?.imageUrl?.trim()
      const storagePath = result.data?.storagePath?.trim()
      if (!imageUrl || !storagePath) throw new Error('AI image generation returned an invalid response.')
      return { imageUrl, storagePath }
    }
  }
}
