import * as admin from 'firebase-admin'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { defineString } from 'firebase-functions/params'
import * as functionsV1 from 'firebase-functions/v1'
import nodemailer from 'nodemailer'
import sharp from 'sharp'


admin.initializeApp()

// Reads from functions/.env (gitignored) — never hardcoded in source.
const masterEmailParam = defineString('MASTER_EMAIL')
const geminiApiKeyParam = defineString('GEMINI_API_KEY')
const workhubDriveFolderIdParam = defineString('WORKHUB_DRIVE_FOLDER_ID')
const driveClientIdParam = defineString('DRIVE_CLIENT_ID')
const driveClientSecretParam = defineString('DRIVE_CLIENT_SECRET')
const driveRefreshTokenParam = defineString('DRIVE_REFRESH_TOKEN')
const emailNotificationsEnabledParam = defineString('EMAIL_NOTIFICATIONS_ENABLED')
const smtpHostParam = defineString('SMTP_HOST')
const smtpPortParam = defineString('SMTP_PORT')
const smtpSecureParam = defineString('SMTP_SECURE')
const smtpUserParam = defineString('SMTP_USER')
const smtpPassParam = defineString('SMTP_PASS')
const smtpFromParam = defineString('SMTP_FROM')
const smtpReplyToParam = defineString('SMTP_REPLY_TO')

const TRIAL_INITIAL_CREDITS = 100
const COST_COVER_IMAGE = 20
const COST_QUESTION_MEDIA_IMAGE = 10
const COST_QUESTION_CHECK = 2

let smtpTransporter: nodemailer.Transporter | null = null

function parseBooleanEnv(value: string | undefined, defaultValue = false): boolean {
  if (typeof value !== 'string') return defaultValue
  const normalized = value.trim().toLowerCase()
  if (!normalized) return defaultValue
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on'
}

function toValidEmail(value: string | null | undefined): string | null {
  const email = (value || '').trim()
  if (!email) return null
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

async function getSmtpTransporter() {
  if (smtpTransporter) return smtpTransporter

  const host = smtpHostParam.value().trim()
  const portRaw = smtpPortParam.value().trim()
  const port = Number(portRaw || '587')
  if (!host || !Number.isFinite(port) || port <= 0) {
    throw new Error('SMTP_HOST and SMTP_PORT must be configured with valid values.')
  }

  const secure = parseBooleanEnv(smtpSecureParam.value(), port === 465)
  const user = smtpUserParam.value().trim()
  const pass = smtpPassParam.value()

  smtpTransporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: user ? { user, pass } : undefined,
  })
  return smtpTransporter
}

async function deliverEmailMessage(params: {
  to: string | string[]
  subject: string
  text: string
  html: string
}) {
  const from = smtpFromParam.value().trim()
  if (!from) {
    throw new Error('SMTP_FROM is not configured.')
  }

  const recipients = Array.isArray(params.to) ? params.to : [params.to]
  const validRecipients = Array.from(new Set(
    recipients
      .map((email) => toValidEmail(email))
      .filter((email): email is string => !!email),
  ))

  if (!validRecipients.length) {
    throw new Error('No valid recipients found.')
  }

  // --- Gmail 500/day Limit Safeguard ---
  const todayKey = new Date().toISOString().split('T')[0]
  const statsRef = admin.firestore().collection('system_config').doc(`mail_stats_${todayKey}`)
  const statsDoc = await statsRef.get()
  const todayCount = statsDoc.exists ? statsDoc.data()?.count || 0 : 0
  const upcomingTotal = todayCount + validRecipients.length

  if (upcomingTotal > 490) {
    console.warn(`[deliverEmailMessage] Daily email safeguard triggered. (${todayCount} sent today + ${validRecipients.length} pending > 490). Email dropped.`)

    const limitNotified = statsDoc.exists ? !!statsDoc.data()?.limitNotified : false
    if (!limitNotified) {
      const msg = 'Daily email sending limit (490) reached. Outbound emails are paused.'
      const adminEmail = masterEmailParam.value().trim()

      if (adminEmail) {
        // Send a one-off final email using nodemailer directly, bypassing our internal guard
        try {
          const alertTransporter = await getSmtpTransporter()
          await alertTransporter.sendMail({
            from,
            to: adminEmail,
            subject: '[URGENT] WorkHub Email Limit Reached',
            text: msg,
            html: `<p><strong>${msg}</strong></p><p>Please switch your SMTP provider to SendGrid, Resend, or Mailgun to lift this limit.</p>`
          })
        } catch (err) {
          console.error('[deliverEmailMessage] Alert email failed', err)
        }
        
        // Send an in-app notification to the master admin
        try {
          const membersSnap = await admin.firestore().collection('workhub_members').where('email', '==', adminEmail).limit(1).get()
          if (!membersSnap.empty) {
            const adminUid = membersSnap.docs[0].id
            await admin.firestore().collection('workhub_notifications').add({
              recipientUid: adminUid,
              actorUid: 'system',
              entityType: 'system_alert',
              entityId: todayKey,
              action: 'alert',
              message: msg,
              isRead: false,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            })
          }
        } catch (err) {
          console.error('[deliverEmailMessage] In-app notification alert failed', err)
        }
      }

      // Mark that we alerted the admin today to avoid bombardment
      await statsRef.set({ limitNotified: true }, { merge: true })
    }

    return { recipients: [], suppressed: true, reason: 'daily_limit_reached' }
  }

  const transporter = await getSmtpTransporter()
  await transporter.verify()
  const replyTo = smtpReplyToParam.value().trim()
  await transporter.sendMail({
    from,
    to: validRecipients,
    replyTo: replyTo || undefined,
    subject: params.subject,
    text: params.text,
    html: params.html,
  })

  await statsRef.set({
    count: admin.firestore.FieldValue.increment(validRecipients.length),
    lastPulse: admin.firestore.FieldValue.serverTimestamp()
  }, { merge: true })

  return { recipients: validRecipients, suppressed: false }
}

async function sendNotificationEmail(params: {
  to: string | string[]
  subject: string
  text: string
  html: string
}) {
  if (!parseBooleanEnv(emailNotificationsEnabledParam.value(), false)) {
    return false
  }

  try {
    await deliverEmailMessage(params)
    return true
  } catch (error) {
    console.error('[email] Failed to send notification email.', error)
    return false
  }
}

function truncateEmailText(value: string, maxLength = 120) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (trimmed.length <= maxLength) return trimmed
  return `${trimmed.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`
}

function withTrailingPeriod(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return ''
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`
}

function startCaseFromSlug(value: string) {
  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (match) => match.toUpperCase())
}

type WorkhubNotificationRecord = {
  workspaceId?: string
  recipientUid?: string
  actorUid?: string
  entityType?: 'workspace' | 'project' | 'task' | 'comment' | 'member' | 'document' | string
  entityId?: string
  projectId?: string
  action?: string
  message?: string
  commentPreview?: string
}

// ---------------------------------------------------------------------------
// Branded HTML email builder
// ---------------------------------------------------------------------------
function buildEmailHtml(params: {
  recipientName: string
  headline: string
  bodyText?: string
  contextRows: Array<{ label: string; value: string }>
  commentPreview?: string
  ctaLabel: string
  ctaUrl: string
  workspaceName: string
  preferencesUrl: string
}): string {
  const rows = params.contextRows
    .map(
      (row) =>
        `<tr><td style="padding:3px 0;font-size:13px;color:#374151;"><span style="display:inline-block;min-width:80px;color:#9ca3af;font-size:12px;">${escapeHtml(row.label)}</span>${escapeHtml(row.value)}</td></tr>`,
    )
    .join('')

  const contextBlock = rows
    ? `<table cellpadding="0" cellspacing="0" role="presentation" style="width:100%;background:#f7f9fd;border:1px solid #e2eaf7;border-radius:6px;padding:10px 14px;margin-top:16px;">${rows}</table>`
    : ''

  const commentBlock = params.commentPreview
    ? `<blockquote style="margin:20px 0 0;padding:12px 16px;border-left:3px solid #1e3a5f;background:#eef3fc;border-radius:0 6px 6px 0;font-size:14px;color:#374151;line-height:1.55;font-style:italic;">${escapeHtml(params.commentPreview)}</blockquote>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1.0"/>
</head>
<body style="margin:0;padding:0;background:#f1f5fb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f1f5fb;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" role="presentation" style="background:#ffffff;border-radius:10px;overflow:hidden;width:100%;max-width:560px;box-shadow:0 2px 12px rgba(20,40,80,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:#1e3a5f;padding:18px 32px;line-height:1;">
              <span style="color:#ffffff;font-size:17px;font-weight:700;letter-spacing:0.2px;">Tooryan WorkHub</span>
              <span style="color:#6b91b8;font-size:13px;margin-left:10px;">· ${escapeHtml(params.workspaceName)}</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:28px 32px 32px;">
              <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;">Hi ${escapeHtml(params.recipientName)},</p>
              <h2 style="margin:0 0 12px;font-size:17px;font-weight:700;color:#111827;line-height:1.3;">${escapeHtml(params.headline)}</h2>
              ${params.bodyText ? `<p style="margin:0;font-size:14px;color:#4b5563;line-height:1.6;">${escapeHtml(params.bodyText)}</p>` : ''}
              ${contextBlock}
              ${commentBlock}
              <!-- CTA -->
              <table cellpadding="0" cellspacing="0" role="presentation" style="margin-top:28px;">
                <tr>
                  <td style="background:#1e3a5f;border-radius:7px;">
                    <a href="${params.ctaUrl}" style="display:inline-block;padding:11px 26px;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;letter-spacing:0.1px;">${escapeHtml(params.ctaLabel)}</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f7f9fd;border-top:1px solid #e2eaf7;padding:14px 32px;">
              <p style="margin:0;font-size:11px;color:#b0b8cc;line-height:1.5;">
                You're receiving this because you're a Tooryan WorkHub member.
                <a href="${params.preferencesUrl}" style="color:#7a94bc;text-decoration:underline;">Manage email preferences</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

type WorkhubWorkspaceRecord = {
  name?: string
}

type WorkhubProjectRecord = {
  name?: string
}

type WorkhubTaskRecord = {
  title?: string
}

type WorkhubDocumentRecord = {
  title?: string
}

type WorkhubMemberProfile = {
  email?: string
  displayName?: string
  emailAccessEnabled?: boolean
  emailActivityEnabled?: boolean
}

async function getOptionalDoc<T>(path: string): Promise<T | null> {
  const snap = await admin.firestore().doc(path).get()
  return snap.exists ? (snap.data() as T) : null
}

async function getWorkhubMemberContact(uid: string) {
  if (!uid) return { email: null, displayName: null, emailAccessEnabled: undefined, emailActivityEnabled: undefined }
  const member = await getOptionalDoc<WorkhubMemberProfile>(`workhub_members/${uid}`)
  return {
    email: toValidEmail(member?.email),
    displayName: member?.displayName?.trim() || null,
    emailAccessEnabled: member?.emailAccessEnabled,
    emailActivityEnabled: member?.emailActivityEnabled,
  }
}

function getWorkhubActorLabel(actor: { displayName: string | null; email: string | null }) {
  return actor.displayName || actor.email || 'A teammate'
}

function shouldEmailWorkhubNotification(notification: WorkhubNotificationRecord) {
  const entityType = (notification.entityType || '').trim().toLowerCase()
  const action = (notification.action || '').trim().toLowerCase()
  const rawMessage = (notification.message || '').trim().toLowerCase()
  if (!entityType || !action) return false
  if (entityType === 'member' && (action === 'approved' || action === 'suspended')) {
    return false
  }

  if (action === 'share' && entityType === 'document') {
    return true
  }

  if (action === 'task_update' && entityType === 'task' && rawMessage.startsWith('assigned you to task')) {
    return true
  }

  if (action === 'approved' && entityType === 'workspace') {
    return true
  }

  return false
}

async function notifyMemberAboutWorkhubNotification(notification: WorkhubNotificationRecord) {
  if (!shouldEmailWorkhubNotification(notification)) return false

  const recipientUid = typeof notification.recipientUid === 'string' ? notification.recipientUid.trim() : ''
  const actorUid = typeof notification.actorUid === 'string' ? notification.actorUid.trim() : ''
  const workspaceId = typeof notification.workspaceId === 'string' ? notification.workspaceId.trim() : ''
  const entityType = typeof notification.entityType === 'string' ? notification.entityType.trim().toLowerCase() : ''
  const entityId = typeof notification.entityId === 'string' ? notification.entityId.trim() : ''
  const projectId = typeof notification.projectId === 'string' ? notification.projectId.trim() : ''
  const action = typeof notification.action === 'string' ? notification.action.trim() : ''
  const rawMessage = typeof notification.message === 'string' ? notification.message.trim() : ''
  const commentPreview = typeof notification.commentPreview === 'string' ? notification.commentPreview.trim() : ''
  if (!recipientUid || !rawMessage) return false

  const recipientPromise = getWorkhubMemberContact(recipientUid)
  const actorPromise = getWorkhubMemberContact(actorUid)
  const workspacePromise = workspaceId
    ? getOptionalDoc<WorkhubWorkspaceRecord>(`workhub_workspaces/${workspaceId}`)
    : Promise.resolve(null)
  const projectPromise = entityType === 'project'
    ? getOptionalDoc<WorkhubProjectRecord>(`workhub_projects/${entityId}`)
    : Promise.resolve(null)
  const taskPromise = entityType === 'task' || entityType === 'comment'
    ? getOptionalDoc<WorkhubTaskRecord>(`workhub_tasks/${entityId}`)
    : Promise.resolve(null)
  const documentPromise = entityType === 'document'
    ? getOptionalDoc<WorkhubDocumentRecord>(`workhub_documents/${entityId}`)
    : Promise.resolve(null)

  const [recipient, actor, workspace, project, task, document] = await Promise.all([
    recipientPromise,
    actorPromise,
    workspacePromise,
    projectPromise,
    taskPromise,
    documentPromise,
  ])

  if (!recipient.email) return false
  if (!normalizeWorkhubEmailPreference(recipient.emailActivityEnabled)) return false

  const recipientName = recipient.displayName || 'there'
  const actorName = getWorkhubActorLabel(actor)
  const workspaceName = workspace?.name?.trim() || 'Tooryan WorkHub'
  const entityTitle = entityType === 'project'
    ? project?.name?.trim() || ''
    : entityType === 'task' || entityType === 'comment'
      ? task?.title?.trim() || ''
      : entityType === 'document'
        ? document?.title?.trim() || ''
        : ''
  const entityLabel = entityType === 'comment'
    ? 'Task'
    : entityType
      ? startCaseFromSlug(entityType)
      : 'Item'

  // Build subject: action-oriented, scannable
  const headlineVerb = action === 'comment'
    ? 'commented on'
    : action === 'task_resolved'
      ? 'resolved'
      : action === 'task_update'
        ? 'assigned you to'
        : action === 'share'
          ? 'shared'
          : rawMessage
  const headline = action === 'share'
    ? `${actorName} shared "${truncateEmailText(entityTitle || 'a document', 60)}" with you`
    : `${actorName} ${headlineVerb}${entityTitle ? ` "${truncateEmailText(entityTitle, 60)}"` : ''}`
  const subject = `[Tooryan WorkHub] ${truncateEmailText(headline, 100)}`

  const workhubBaseUrl = 'https://qyan-om.web.app/workhub'
  const preferencesUrl = `${workhubBaseUrl}#settings`

  // Build a direct deep-link to the task when we have workspace + task + project IDs
  const taskDeepLink =
    (entityType === 'task' || entityType === 'comment') && workspaceId && entityId && projectId
      ? `${workhubBaseUrl}/w/${encodeURIComponent(workspaceId)}/t/${encodeURIComponent(entityId)}?p=${encodeURIComponent(projectId)}`
      : null
  const workhubUrl = taskDeepLink ?? workhubBaseUrl

  const isComment = action === 'comment'
  const isShare = action === 'share'

  const contextRows: Array<{ label: string; value: string }> = isComment
    ? [{ label: 'Workspace', value: workspaceName }]
    : isShare
      ? [
          { label: 'Workspace', value: workspaceName },
          { label: 'Access', value: rawMessage.includes('edit access') ? 'Edit' : 'View' },
        ]
      : [
          { label: 'Workspace', value: workspaceName },
          ...(entityTitle ? [{ label: entityLabel, value: entityTitle }] : []),
        ]

  const bodyText = (isComment || isShare)
    ? undefined
    : withTrailingPeriod(`${actorName} ${rawMessage}`)

  // Determine CTA label based on entity
  const ctaLabel = entityType === 'comment' || entityType === 'task'
    ? 'View task'
    : entityType === 'document'
      ? 'Open document'
      : 'Open Tooryan WorkHub'

  // Plain-text version
  const plainLines = [
    `Hi ${recipientName},`,
    '',
    withTrailingPeriod(`${actorName} ${rawMessage}`),
    ...(commentPreview ? ['', `"${commentPreview}"`] : []),
    '',
    `Workspace: ${workspaceName}`,
    ...(!isComment && entityTitle ? [`${entityLabel}: ${entityTitle}`] : []),
    '',
    `${ctaLabel}: ${workhubUrl}`,
    '',
    `Manage email preferences: ${preferencesUrl}`,
  ]

  await sendNotificationEmail({
    to: recipient.email,
    subject,
    text: plainLines.join('\n'),
    html: buildEmailHtml({
      recipientName,
      headline,
      bodyText,
      contextRows,
      commentPreview: commentPreview || undefined,
      ctaLabel,
      ctaUrl: workhubUrl,
      workspaceName,
      preferencesUrl,
    }),
  })

  return true
}

async function notifyAdminAboutWorkhubAccessRequest(params: {
  uid: string
  email: string
  displayName: string
  hasWorkspaceInvite: boolean
}) {
  const adminEmail = toValidEmail(masterEmailParam.value())
  if (!adminEmail) return

  const requesterName = params.displayName.trim() || '(no display name)'
  const requesterEmail = params.email.trim() || '(no email)'
  const inviteLabel = params.hasWorkspaceInvite ? 'Yes — workspace invite found' : 'No'
  const reviewUrl = 'https://qyan-om.web.app/workhub'

  const contextRows = [
    { label: 'Name', value: requesterName },
    { label: 'Email', value: requesterEmail },
    { label: 'UID', value: params.uid },
    { label: 'Has invite', value: inviteLabel },
  ]

  const plainLines = [
    'A user has requested WorkHub access and is waiting for approval.',
    '',
    `Name: ${requesterName}`,
    `Email: ${requesterEmail}`,
    `UID: ${params.uid}`,
    `Workspace invite: ${inviteLabel}`,
    '',
    `Review request: ${reviewUrl}`,
  ]

  await sendNotificationEmail({
    to: adminEmail,
    subject: `[Tooryan WorkHub] Access request — ${requesterName}`,
    text: plainLines.join('\n'),
    html: buildEmailHtml({
      recipientName: 'Admin',
      headline: `New access request from ${requesterName}`,
      bodyText: 'A user has requested WorkHub access and is waiting for your approval.',
      contextRows,
      ctaLabel: 'Review request',
      ctaUrl: reviewUrl,
      workspaceName: 'Tooryan WorkHub',
      preferencesUrl: reviewUrl,
    }),
  })
}

async function notifyMemberAboutWorkhubStatusChange(params: {
  toEmail: string
  displayName: string
  status: WorkhubMemberStatus
  emailAccessEnabled?: boolean
}) {
  if (!normalizeWorkhubEmailPreference(params.emailAccessEnabled)) return

  const memberEmail = toValidEmail(params.toEmail)
  if (!memberEmail) return

  const memberName = params.displayName.trim() || 'there'
  const isApproved = params.status === 'approved'
  const headline = isApproved
    ? 'Your Tooryan WorkHub access has been approved'
    : 'Your Tooryan WorkHub access has been suspended'
  const bodyText = isApproved
    ? 'You now have access to Tooryan WorkHub. Sign in and start collaborating with your team.'
    : 'Your Tooryan WorkHub account has been suspended. Contact your administrator if you believe this is an error.'
  const subject = isApproved ? '[Tooryan WorkHub] Access approved — you\'re in' : '[Tooryan WorkHub] Access suspended'
  const workhubUrl = 'https://qyan-om.web.app/workhub'
  const preferencesUrl = `${workhubUrl}#settings`

  const plainLines = [
    `Hi ${memberName},`,
    '',
    bodyText,
    '',
    isApproved ? `Open Tooryan WorkHub: ${workhubUrl}` : `Contact admin if needed.`,
    '',
    `Manage email preferences: ${preferencesUrl}`,
  ]

  await sendNotificationEmail({
    to: memberEmail,
    subject,
    text: plainLines.join('\n'),
    html: buildEmailHtml({
      recipientName: memberName,
      headline,
      bodyText,
      contextRows: [],
      ctaLabel: isApproved ? 'Open Tooryan WorkHub' : 'Contact administrator',
      ctaUrl: workhubUrl,
      workspaceName: 'Tooryan WorkHub',
      preferencesUrl,
    }),
  })
}
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

type WorkhubMemberStatus = 'pending' | 'approved' | 'suspended'
type WorkhubMemberRole = 'member' | 'manager' | 'admin'

type WorkhubMemberRecord = {
  email: string
  displayName: string
  photoURL: string
  status: WorkhubMemberStatus
  role: WorkhubMemberRole
  emailAccessEnabled?: boolean
  emailActivityEnabled?: boolean
  requestedAt: admin.firestore.FieldValue | admin.firestore.Timestamp | null
  approvedAt?: admin.firestore.FieldValue | admin.firestore.Timestamp | null
  approvedBy?: string | null
  lastSeenAt?: admin.firestore.FieldValue | admin.firestore.Timestamp | null
}

function assertMasterAdmin(request: { auth?: { token?: Record<string, unknown>; uid?: string } | null }) {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be signed in.')
  }
  const isClaimAdmin = request.auth.token?.['admin'] === true
  const email = typeof request.auth.token?.['email'] === 'string' ? request.auth.token['email'] : ''
  const isMasterEmail = !!email && email === masterEmailParam.value()
  if (!isClaimAdmin && !isMasterEmail) {
    throw new HttpsError('permission-denied', 'Not authorized.')
  }
}

function workhubMemberRef(uid: string) {
  return admin.firestore().doc(`workhub_members/${uid}`)
}

function normalizeWorkhubStatus(value: unknown): WorkhubMemberStatus {
  return value === 'approved' || value === 'suspended' ? value : 'pending'
}

function normalizeWorkhubRole(value: unknown): WorkhubMemberRole {
  return value === 'manager' || value === 'admin' ? value : 'member'
}

function normalizeWorkhubEmailPreference(value: unknown, defaultValue = true) {
  return typeof value === 'boolean' ? value : defaultValue
}

function mapWorkhubMember(uid: string, data: Partial<WorkhubMemberRecord> | undefined) {
  return {
    uid,
    email: typeof data?.email === 'string' ? data.email : '',
    displayName: typeof data?.displayName === 'string' ? data.displayName : '',
    photoURL: typeof data?.photoURL === 'string' ? data.photoURL : '',
    status: normalizeWorkhubStatus(data?.status),
    role: normalizeWorkhubRole(data?.role),
    emailAccessEnabled: normalizeWorkhubEmailPreference(data?.emailAccessEnabled),
    emailActivityEnabled: normalizeWorkhubEmailPreference(data?.emailActivityEnabled),
    requestedAt: data?.requestedAt ?? null,
    approvedAt: data?.approvedAt ?? null,
    approvedBy: typeof data?.approvedBy === 'string' ? data.approvedBy : null,
    lastSeenAt: data?.lastSeenAt ?? null,
  }
}

export const requestWorkhubAccess = onCall({ region: 'us-central1', cors: true }, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Must be signed in.')
  }

  const uid = request.auth.uid
  const email = typeof request.auth.token.email === 'string' ? request.auth.token.email : ''
  const normalizedEmail = email.trim().toLowerCase()
  const displayName = typeof request.auth.token.name === 'string' ? request.auth.token.name : ''
  const photoURL = typeof request.auth.token.picture === 'string' ? request.auth.token.picture : ''
  const ref = workhubMemberRef(uid)

  let hasWorkspaceInvite = false
  if (normalizedEmail) {
    const invitedWorkspaceSnap = await admin
      .firestore()
      .collection('workhub_workspaces')
      .where('invitedEmails', 'array-contains', normalizedEmail)
      .limit(1)
      .get()
    hasWorkspaceInvite = !invitedWorkspaceSnap.empty
  }

  const { member, shouldNotifyAdmin } = await admin.firestore().runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    const existing = snap.exists ? (snap.data() as Partial<WorkhubMemberRecord>) : null
    const isMasterEmail = !!email && email === masterEmailParam.value()
    const autoApproved = isMasterEmail || hasWorkspaceInvite
    const nextStatus: WorkhubMemberStatus = autoApproved ? 'approved' : normalizeWorkhubStatus(existing?.status)
    const nextRole: WorkhubMemberRole = isMasterEmail ? 'admin' : normalizeWorkhubRole(existing?.role)

    tx.set(ref, {
      email,
      displayName,
      photoURL,
      status: nextStatus,
      role: nextRole,
      emailAccessEnabled: normalizeWorkhubEmailPreference(existing?.emailAccessEnabled),
      emailActivityEnabled: normalizeWorkhubEmailPreference(existing?.emailActivityEnabled),
      requestedAt: existing?.requestedAt ?? admin.firestore.FieldValue.serverTimestamp(),
      approvedAt: nextStatus === 'approved'
        ? (existing?.approvedAt ?? admin.firestore.FieldValue.serverTimestamp())
        : null,
      approvedBy: nextStatus === 'approved'
        ? (existing?.approvedBy ?? (isMasterEmail ? uid : 'workspace_invite'))
        : null,
      lastSeenAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true })

    const member = mapWorkhubMember(uid, {
      ...existing,
      email,
      displayName,
      photoURL,
      status: nextStatus,
      role: nextRole,
      emailAccessEnabled: normalizeWorkhubEmailPreference(existing?.emailAccessEnabled),
      emailActivityEnabled: normalizeWorkhubEmailPreference(existing?.emailActivityEnabled),
      approvedBy: nextStatus === 'approved' ? (existing?.approvedBy ?? (isMasterEmail ? uid : 'workspace_invite')) : null,
    })
    const shouldNotifyAdmin = member.status === 'pending' && !existing?.requestedAt
    return { member, shouldNotifyAdmin }
  })

  if (shouldNotifyAdmin) {
    await notifyAdminAboutWorkhubAccessRequest({
      uid,
      email,
      displayName,
      hasWorkspaceInvite,
    })
  }

  return { member }
})

type SetWorkhubMemberStatusRequest = {
  uid: string
  status: WorkhubMemberStatus
  role?: WorkhubMemberRole
}

export const setWorkhubMemberStatus = onCall<SetWorkhubMemberStatusRequest, Promise<{ member: ReturnType<typeof mapWorkhubMember> }>>(
  { region: 'us-central1', cors: true },
  async (request) => {
    assertMasterAdmin(request)

    const uid = typeof request.data?.uid === 'string' ? request.data.uid.trim() : ''
    const status = normalizeWorkhubStatus(request.data?.status)
    const role = normalizeWorkhubRole(request.data?.role)
    if (!uid) {
      throw new HttpsError('invalid-argument', 'uid is required.')
    }

    const ref = workhubMemberRef(uid)
    const snap = await ref.get()
    if (!snap.exists) {
      throw new HttpsError('not-found', 'WorkHub member request not found.')
    }

    const existing = snap.data() as Partial<WorkhubMemberRecord>
    const payload: Partial<WorkhubMemberRecord> = {
      status,
      role,
      approvedAt: status === 'approved' ? admin.firestore.FieldValue.serverTimestamp() : null,
      approvedBy: status === 'approved' ? request.auth?.uid ?? null : null,
      lastSeenAt: admin.firestore.FieldValue.serverTimestamp(),
    }
    await ref.set(payload, { merge: true })

    const previousStatus = normalizeWorkhubStatus(existing.status)
    if ((status === 'approved' || status === 'suspended') && status !== previousStatus) {
      await notifyMemberAboutWorkhubStatusChange({
        toEmail: existing.email || '',
        displayName: existing.displayName || '',
        status,
        emailAccessEnabled: normalizeWorkhubEmailPreference(existing.emailAccessEnabled),
      })
    }

    return {
      member: mapWorkhubMember(uid, {
        ...existing,
        ...payload,
      }),
    }
  },
)

type UpdateOwnWorkhubEmailPreferencesRequest = {
  emailAccessEnabled?: boolean
  emailActivityEnabled?: boolean
}

export const updateOwnWorkhubEmailPreferences = onCall<UpdateOwnWorkhubEmailPreferencesRequest, Promise<{ member: ReturnType<typeof mapWorkhubMember> }>>(
  { region: 'us-central1', cors: true },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Must be signed in.')
    }
    if (request.data?.emailAccessEnabled !== undefined && typeof request.data.emailAccessEnabled !== 'boolean') {
      throw new HttpsError('invalid-argument', 'emailAccessEnabled must be a boolean.')
    }
    if (request.data?.emailActivityEnabled !== undefined && typeof request.data.emailActivityEnabled !== 'boolean') {
      throw new HttpsError('invalid-argument', 'emailActivityEnabled must be a boolean.')
    }

    const ref = workhubMemberRef(request.auth.uid)
    const snap = await ref.get()
    if (!snap.exists) {
      throw new HttpsError('not-found', 'WorkHub member record not found.')
    }

    const existing = snap.data() as Partial<WorkhubMemberRecord>
    const emailAccessEnabled = normalizeWorkhubEmailPreference(
      request.data?.emailAccessEnabled,
      normalizeWorkhubEmailPreference(existing.emailAccessEnabled),
    )
    const emailActivityEnabled = normalizeWorkhubEmailPreference(
      request.data?.emailActivityEnabled,
      normalizeWorkhubEmailPreference(existing.emailActivityEnabled),
    )

    await ref.set({
      emailAccessEnabled,
      emailActivityEnabled,
      lastSeenAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true })

    return {
      member: mapWorkhubMember(request.auth.uid, {
        ...existing,
        emailAccessEnabled,
        emailActivityEnabled,
      }),
    }
  },
)

type SendWorkhubTestEmailRequest = {
  toEmail?: string
}

type SendWorkhubTestEmailResponse = {
  toEmail: string
  message: string
}

export const sendWorkhubTestEmail = onCall<SendWorkhubTestEmailRequest, Promise<SendWorkhubTestEmailResponse>>(
  { region: 'us-central1', cors: true },
  async (request) => {
    assertMasterAdmin(request)

    const requestedToEmail = typeof request.data?.toEmail === 'string' ? request.data.toEmail.trim() : ''
    const fallbackAuthEmail = typeof request.auth?.token?.email === 'string' ? request.auth.token.email : ''
    const targetEmail = toValidEmail(requestedToEmail || fallbackAuthEmail || masterEmailParam.value())

    if (!targetEmail) {
      throw new HttpsError('invalid-argument', 'A valid recipient email is required.')
    }

    try {
      await deliverEmailMessage({
        to: targetEmail,
        subject: '[Tooryan WorkHub] SMTP test email',
        text: [
          'This is a Tooryan WorkHub SMTP test email from Firebase Cloud Functions.',
          '',
          `Recipient: ${targetEmail}`,
          `Triggered by: ${request.auth?.uid || 'unknown'}`,
          `Timestamp (UTC): ${new Date().toISOString()}`,
          '',
          'If you received this, SMTP delivery from Cloud Functions is working.',
        ].join('\n'),
        html: [
          '<p>This is a <strong>Tooryan WorkHub SMTP test email</strong> from Firebase Cloud Functions.</p>',
          '<ul>',
          `<li><strong>Recipient:</strong> ${escapeHtml(targetEmail)}</li>`,
          `<li><strong>Triggered by:</strong> ${escapeHtml(request.auth?.uid || 'unknown')}</li>`,
          `<li><strong>Timestamp (UTC):</strong> ${escapeHtml(new Date().toISOString())}</li>`,
          '</ul>',
          '<p>If you received this, SMTP delivery from Cloud Functions is working.</p>',
        ].join(''),
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to send test email.'
      throw new HttpsError('internal', message)
    }

    return {
      toEmail: targetEmail,
      message: `Test email sent to ${targetEmail}.`,
    }
  },
)

export const onWorkhubNotificationCreated = functionsV1
  .region('us-central1')
  .firestore
  .document('workhub_notifications/{notificationId}')
  .onCreate(async (snap) => {
    const notification = snap.data() as WorkhubNotificationRecord | undefined
    if (!notification) return
    await notifyMemberAboutWorkhubNotification(notification)
  })

type UploadWorkhubAttachmentToDriveRequest = {
  fileName: string
  contentType: string
  dataBase64: string
  parentFolderId?: string
}

type UploadWorkhubAttachmentToDriveResponse = {
  url: string
  fileId: string
  fileName: string
}

function sanitizeUploadName(name: string) {
  const trimmed = name.trim()
  const safe = trimmed.replace(/[^a-zA-Z0-9._-]/g, '_')
  return safe || `file_${Date.now()}`
}

async function getOAuthAccessToken() {
  const clientId = driveClientIdParam.value()
  const clientSecret = driveClientSecretParam.value()
  const refreshToken = driveRefreshTokenParam.value()

  if (!clientId || !clientSecret || !refreshToken) {
    throw new HttpsError('failed-precondition', 'Drive OAuth credentials (CLIENT_ID, SECRET, REFRESH_TOKEN) are not fully configured in .env.')
  }

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  if (!tokenRes.ok) {
    const errorText = await tokenRes.text()
    throw new HttpsError('internal', `Failed to obtain access token from refresh token: ${errorText}`)
  }
  const tokenData = await tokenRes.json() as { access_token: string }
  return tokenData.access_token
}

export const ensureWorkhubDriveProjectFolder = onCall<{ projectId: string; projectName: string }, Promise<{ folderId: string }>>(
  { region: 'us-central1', cors: true },
  async (request) => {
    if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Must be signed in.')

    const uid = request.auth.uid
    const email = typeof request.auth.token.email === 'string' ? request.auth.token.email : ''
    const isClaimAdmin = request.auth.token?.['admin'] === true
    const isMasterEmail = !!email && email === masterEmailParam.value()
    if (!isClaimAdmin && !isMasterEmail) {
      const memberSnap = await workhubMemberRef(uid).get()
      const memberStatus = memberSnap.exists ? (memberSnap.data() as Partial<WorkhubMemberRecord>).status : null
      if (memberStatus !== 'approved') {
        throw new HttpsError('permission-denied', 'WorkHub access is required.')
      }
    }

    const { projectId, projectName } = request.data
    if (!projectId || typeof projectId !== 'string') throw new HttpsError('invalid-argument', 'projectId is required.')
    if (!projectName || typeof projectName !== 'string') throw new HttpsError('invalid-argument', 'projectName is required.')

    const rootFolderId = workhubDriveFolderIdParam.value()
    if (!rootFolderId) throw new HttpsError('failed-precondition', 'WORKHUB_DRIVE_FOLDER_ID is not configured.')

    // Check if we already stored a folderId on this project document
    const projectRef = admin.firestore().collection('workhub_projects').doc(projectId)
    const projectSnap = await projectRef.get()
    if (!projectSnap.exists) throw new HttpsError('not-found', 'Project not found.')
    const existingFolderId = (projectSnap.data() as Record<string, unknown>).driveFolderId
    if (existingFolderId && typeof existingFolderId === 'string') {
      return { folderId: existingFolderId }
    }

    const accessToken = await getOAuthAccessToken()
    const safeName = projectName.replace(/[/\\:*?"<>|]/g, '_').slice(0, 200)

    const createRes = await fetch('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: safeName,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [rootFolderId],
      }),
    })

    if (!createRes.ok) {
      const errorText = await createRes.text()
      throw new HttpsError('internal', `Failed to create Drive folder: ${errorText}`)
    }

    const createPayload = await createRes.json() as { id?: string }
    const folderId = createPayload.id
    if (!folderId) throw new HttpsError('internal', 'Drive folder creation returned no ID.')

    // Persist on the project document so we don't create duplicates
    await projectRef.update({ driveFolderId: folderId })

    return { folderId }
  },
)

export const uploadWorkhubAttachmentToDrive = onCall<UploadWorkhubAttachmentToDriveRequest, Promise<UploadWorkhubAttachmentToDriveResponse>>(
  { region: 'us-central1', cors: true },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Must be signed in.')
    }

    const uid = request.auth.uid
    const email = typeof request.auth.token.email === 'string' ? request.auth.token.email : ''
    const isClaimAdmin = request.auth.token?.['admin'] === true
    const isMasterEmail = !!email && email === masterEmailParam.value()
    if (!isClaimAdmin && !isMasterEmail) {
      const memberSnap = await workhubMemberRef(uid).get()
      const memberStatus = memberSnap.exists ? (memberSnap.data() as Partial<WorkhubMemberRecord>).status : null
      if (memberStatus !== 'approved') {
        throw new HttpsError('permission-denied', 'WorkHub access is required for Drive uploads.')
      }
    }

    const folderId = request.data?.parentFolderId?.trim() || workhubDriveFolderIdParam.value()
    if (!folderId) {
      throw new HttpsError('failed-precondition', 'WORKHUB_DRIVE_FOLDER_ID is not configured.')
    }

    const fileNameRaw = typeof request.data?.fileName === 'string' ? request.data.fileName : ''
    const contentTypeRaw = typeof request.data?.contentType === 'string' ? request.data.contentType : ''
    const dataBase64Raw = typeof request.data?.dataBase64 === 'string' ? request.data.dataBase64 : ''
    if (!fileNameRaw.trim() || !dataBase64Raw.trim()) {
      throw new HttpsError('invalid-argument', 'fileName and dataBase64 are required.')
    }

    const fileName = sanitizeUploadName(fileNameRaw)
    const contentType = contentTypeRaw.trim() || 'application/octet-stream'
    let fileBuffer: Buffer
    try {
      fileBuffer = Buffer.from(dataBase64Raw, 'base64')
    } catch {
      throw new HttpsError('invalid-argument', 'Invalid base64 file payload.')
    }

    const MAX_UPLOAD_BYTES = 7 * 1024 * 1024
    if (fileBuffer.length <= 0 || fileBuffer.length > MAX_UPLOAD_BYTES) {
      throw new HttpsError('invalid-argument', 'File size must be between 1 byte and 7 MB.')
    }

    const accessToken = await getOAuthAccessToken()
    
    // Determine target subfolder based on content type
    let targetFolderId = folderId
    const isImage = contentType.startsWith('image/')
    const isVideo = contentType.startsWith('video/')
    const subfolderName = isImage ? 'images' : (isVideo ? 'vPost' : 'docs')

    try {
      const q = `name='${subfolderName}' and '${targetFolderId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
      const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(q)}&fields=files(id)&supportsAllDrives=true&includeItemsFromAllDrives=true&corpora=allDrives`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      })
      
      let subfolderId: string | null = null
      if (searchRes.ok) {
        const searchData = (await searchRes.json()) as { files?: { id: string }[] }
        if (searchData.files && searchData.files.length > 0) {
          subfolderId = searchData.files[0].id
        }
      }

      if (!subfolderId) {
        const createRes = await fetch('https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: subfolderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: [targetFolderId],
          }),
        })
        if (createRes.ok) {
          const createData = (await createRes.json()) as { id?: string }
          if (createData.id) {
            subfolderId = createData.id
          }
        }
      }

      if (subfolderId) {
        targetFolderId = subfolderId
      }
    } catch (err) {
      console.error(`Failed to resolve or create subfolder ${subfolderName}:`, err)
      // Fallback to uploading into the root project folder
    }

    const driveFileName = `${Date.now()}_${fileName}`

    const uploadWithMetadata = async (metadata: { name: string; parents?: string[] }) => {
      const boundary = `workhub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
      const multipartHeader = Buffer.from(
        `--${boundary}\r\n` +
        'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
        `${JSON.stringify(metadata)}\r\n` +
        `--${boundary}\r\n` +
        `Content-Type: ${contentType}\r\n\r\n`,
        'utf8',
      )
      const multipartFooter = Buffer.from(`\r\n--${boundary}--`, 'utf8')
      const multipartBody = Buffer.concat([multipartHeader, fileBuffer, multipartFooter])

      return fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': `multipart/related; boundary=${boundary}`,
        },
        body: multipartBody,
      })
    }

    const uploadRes = await uploadWithMetadata({
      name: driveFileName,
      parents: [targetFolderId],
    })

    if (!uploadRes.ok) {
      const errorText = await uploadRes.text()
      if (uploadRes.status === 404) {
        throw new HttpsError(
          'failed-precondition',
          `Drive folder not found or service account lacks access. Ensure WORKHUB_DRIVE_FOLDER_ID points to a Shared Drive folder and the service account is a member of that Shared Drive.`,
        )
      }
      if (uploadRes.status === 403 && errorText.includes('storageQuotaExceeded')) {
        throw new HttpsError(
          'failed-precondition',
          `Drive upload failed: service accounts have no personal Drive quota. WORKHUB_DRIVE_FOLDER_ID must point to a Shared Drive folder, and the service account must be added as a Contributor on that Shared Drive.`,
        )
      }
      throw new HttpsError('internal', `Drive upload failed: ${errorText}`)
    }

    const uploadPayload = await uploadRes.json() as { id?: string; name?: string }
    const fileId = uploadPayload.id
    if (!fileId) {
      throw new HttpsError('internal', 'Drive upload succeeded but no file id returned.')
    }

    const permissionRes = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/permissions?supportsAllDrives=true`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ role: 'reader', type: 'anyone' }),
    })

    if (!permissionRes.ok) {
      const errorText = await permissionRes.text()
      throw new HttpsError('internal', `Drive permission update failed: ${errorText}`)
    }

    const url = `https://drive.google.com/thumbnail?id=${encodeURIComponent(fileId)}&sz=w1000&name=${encodeURIComponent(uploadPayload.name || fileName)}`
    return {
      url,
      fileId,
      fileName: uploadPayload.name || fileName,
    }
  },
)

export const deleteWorkhubAttachmentFromDrive = onCall<{ fileId: string }, Promise<{ success: boolean }>>(
  { region: 'us-central1', cors: true },
  async (request) => {
    if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Must be signed in.')

    const email = typeof request.auth.token.email === 'string' ? request.auth.token.email : ''
    const isClaimAdmin = request.auth.token?.['admin'] === true
    const isMasterEmail = !!email && email === masterEmailParam.value()
    
    if (!isClaimAdmin && !isMasterEmail) {
      const memberSnap = await workhubMemberRef(request.auth.uid).get()
      const memberStatus = memberSnap.exists ? (memberSnap.data() as Partial<WorkhubMemberRecord>).status : null
      if (memberStatus !== 'approved') {
        throw new HttpsError('permission-denied', 'WorkHub access is required.')
      }
    }

    const { fileId } = request.data
    if (!fileId || typeof fileId !== 'string') {
      throw new HttpsError('invalid-argument', 'fileId is required')
    }

    const accessToken = await getOAuthAccessToken()
    
    const delRes = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?supportsAllDrives=true`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    })

    if (!delRes.ok) {
      const errorText = await delRes.text()
      throw new HttpsError('internal', `Drive deletion failed: ${errorText}`)
    }

    return { success: true }
  }
)

type AddUserCreditsRequest = {
  uid: string
  amount: number
  reason?: string
}

type AddUserCreditsResponse = {
  uid: string
  creditsRemaining: number
}

export const addUserCredits = onCall<AddUserCreditsRequest, Promise<AddUserCreditsResponse>>(
  { region: 'us-central1', cors: true },
  async (request) => {
    assertMasterAdmin(request)

    const uid = typeof request.data?.uid === 'string' ? request.data.uid.trim() : ''
    const amountRaw = request.data?.amount
    const amount = typeof amountRaw === 'number' ? Math.floor(amountRaw) : Number(amountRaw)
    const reason = typeof request.data?.reason === 'string' ? request.data.reason.trim() : 'manual_admin_grant'

    if (!uid) {
      throw new HttpsError('invalid-argument', 'uid is required.')
    }
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) {
      throw new HttpsError('invalid-argument', 'amount must be a positive integer up to 1,000,000.')
    }

    const ref = entitlementsRef(uid)
    const creditsRemaining = await admin.firestore().runTransaction(async (tx) => {
      const snap = await tx.get(ref)
      let current = 0

      if (!snap.exists) {
        const doc: EntitlementsDoc = {
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

      const next = current + amount
      tx.set(ref, {
        creditsRemaining: next,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        lastAdminCreditGrant: {
          amount,
          reason,
          byUid: request.auth?.uid ?? null,
          at: admin.firestore.FieldValue.serverTimestamp(),
        },
      }, { merge: true })
      return next
    })

    return { uid, creditsRemaining }
  },
)

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

type CropImageForClientRequest = {
  imageUrl: string
  cropPixels: {
    x: number
    y: number
    width: number
    height: number
  }
  preferredMimeType?: string
}

type CropImageForClientResponse = {
  base64Image: string
  contentType: 'image/png' | 'image/jpeg'
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function validateCropImageUrl(rawUrl: string): URL {
  let parsed: URL
  try {
    parsed = new URL(rawUrl)
  } catch {
    throw new HttpsError('invalid-argument', 'imageUrl must be a valid URL.')
  }

  const allowedHosts = new Set([
    'firebasestorage.googleapis.com',
    'storage.googleapis.com',
  ])

  if (!allowedHosts.has(parsed.hostname)) {
    throw new HttpsError('permission-denied', 'Only Firebase Storage URLs are allowed for crop fallback.')
  }

  return parsed
}

export const cropImageForClient = onCall<CropImageForClientRequest, Promise<CropImageForClientResponse>>(
  { region: 'us-central1', cors: true },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError('unauthenticated', 'Must be signed in.')
    }

    const imageUrl = typeof request.data?.imageUrl === 'string' ? request.data.imageUrl.trim() : ''
    if (!imageUrl) {
      throw new HttpsError('invalid-argument', 'imageUrl is required.')
    }
    const safeUrl = validateCropImageUrl(imageUrl)

    const cropPixelsRaw = request.data?.cropPixels
    if (!cropPixelsRaw || typeof cropPixelsRaw !== 'object') {
      throw new HttpsError('invalid-argument', 'cropPixels is required.')
    }

    const xRaw = Number((cropPixelsRaw as CropImageForClientRequest['cropPixels']).x)
    const yRaw = Number((cropPixelsRaw as CropImageForClientRequest['cropPixels']).y)
    const widthRaw = Number((cropPixelsRaw as CropImageForClientRequest['cropPixels']).width)
    const heightRaw = Number((cropPixelsRaw as CropImageForClientRequest['cropPixels']).height)
    if (![xRaw, yRaw, widthRaw, heightRaw].every((value) => Number.isFinite(value))) {
      throw new HttpsError('invalid-argument', 'cropPixels values must be finite numbers.')
    }

    const sourceRes = await fetch(safeUrl.toString(), { signal: AbortSignal.timeout(20000) })
    if (!sourceRes.ok) {
      throw new HttpsError('failed-precondition', `Failed to load source image (${sourceRes.status}).`)
    }

    const sourceBuffer = Buffer.from(await sourceRes.arrayBuffer())
    const sourceImage = sharp(sourceBuffer, { failOn: 'none' })
    const metadata = await sourceImage.metadata()
    const sourceWidth = metadata.width || 0
    const sourceHeight = metadata.height || 0
    if (sourceWidth <= 0 || sourceHeight <= 0) {
      throw new HttpsError('failed-precondition', 'Source image has invalid dimensions.')
    }

    const left = clampNumber(Math.floor(xRaw), 0, sourceWidth - 1)
    const top = clampNumber(Math.floor(yRaw), 0, sourceHeight - 1)
    const requestedWidth = Math.max(1, Math.floor(widthRaw))
    const requestedHeight = Math.max(1, Math.floor(heightRaw))
    const cropWidth = Math.max(1, Math.min(requestedWidth, sourceWidth - left))
    const cropHeight = Math.max(1, Math.min(requestedHeight, sourceHeight - top))

    const preferredMimeType = request.data?.preferredMimeType === 'image/png' ? 'image/png' : 'image/jpeg'
    const croppedImage = sourceImage.extract({ left, top, width: cropWidth, height: cropHeight })

    let outputBuffer: Buffer
    let contentType: 'image/png' | 'image/jpeg'
    if (preferredMimeType === 'image/png') {
      outputBuffer = await croppedImage.png({ compressionLevel: 9 }).toBuffer()
      contentType = 'image/png'
    } else {
      outputBuffer = await croppedImage.jpeg({ quality: 92, mozjpeg: true }).toBuffer()
      contentType = 'image/jpeg'
    }

    if (outputBuffer.byteLength > 7 * 1024 * 1024) {
      throw new HttpsError('resource-exhausted', 'Cropped image is too large for transfer. Reduce crop area and retry.')
    }

    return {
      base64Image: outputBuffer.toString('base64'),
      contentType,
    }
  },
)
