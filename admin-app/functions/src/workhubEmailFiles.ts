import * as admin from 'firebase-admin'
import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { defineSecret, defineString } from 'firebase-functions/params'
import { createHash } from 'node:crypto'

const apiKey = defineSecret('WORKHUB_RESEND_API_KEY')
const clientId = defineString('DRIVE_CLIENT_ID')
const clientSecret = defineString('DRIVE_CLIENT_SECRET')
const refreshToken = defineString('DRIVE_REFRESH_TOKEN')
const folderId = defineString('WORKHUB_DRIVE_FOLDER_ID')
type ProviderFile = { id: string; filename: string; content_type: string; size: number; download_url?: string }
type EmailFile = { id: string; emailId: string; name: string; contentType: string; size: number; provider: 'resend'; driveUrl?: string; driveSaveState?: 'saving' | 'failed' }

async function updateFiles(ref: admin.firestore.DocumentReference, attachments: EmailFile[]) {
  await admin.firestore().runTransaction(async tx => {
    const message = (await tx.get(ref)).data()
    if (!message || message.deletedAt) return
    const previous = (message.attachments || []) as EmailFile[]
    tx.update(ref, { attachments: attachments.map(file => {
      const saved = previous.find(item => item.id === file.id)?.driveUrl
      return saved ? { ...file, driveUrl: saved } : file
    }), emailAttachmentState: 'ready' })
  })
}

async function receiving<T>(path: string): Promise<T> {
  const response = await fetch(`https://api.resend.com/emails/receiving/${path}`, { headers: { Authorization: `Bearer ${apiKey.value()}` }, signal: AbortSignal.timeout(15000) })
  if (!response.ok) throw new Error(`Receiving attachments API ${response.status}`)
  return response.json() as Promise<T>
}

export async function listEmailFiles(emailId: string, read = receiving): Promise<EmailFile[]> {
  const files: EmailFile[] = []
  let after = ''
  do {
    const page = await read<{ data: ProviderFile[]; has_more: boolean }>(`${encodeURIComponent(emailId)}/attachments${after ? `?after=${encodeURIComponent(after)}` : ''}`)
    files.push(...page.data.map(file => ({ id: file.id, emailId, name: file.filename || 'Attachment', contentType: file.content_type || 'application/octet-stream', size: file.size, provider: 'resend' as const })))
    after = page.has_more ? page.data[page.data.length - 1]?.id : ''
    if (page.has_more && !after) throw new Error('Invalid attachment pagination')
  } while (after)
  return files
}

export const processWorkhubEmailAttachments = onDocumentCreated({ document: 'workhub_activity/{activityId}', region: 'us-central1', secrets: [apiKey], retry: true, timeoutSeconds: 540, memory: '512MiB', maxInstances: 3 }, async event => {
  const message = event.data?.data()
  if (!event.data || message?.source !== 'email' || !message.emailSourceId || !message.attachmentCount) return
  const receipt = (await admin.firestore().collection('workhub_email_receipts').doc(createHash('sha256').update(message.emailSourceId).digest('hex')).get()).data()
  if (!receipt || receipt.activityId !== event.params.activityId) return
  // At-least-once event delivery must never overwrite a later Drive save.
  const existing = (await event.data.ref.get()).data()
  if (existing?.emailAttachmentState === 'ready' && existing.attachments?.every((file: EmailFile) => !!file.driveUrl)) return
  try {
    const attachments = await listEmailFiles(message.emailSourceId)
    await updateFiles(event.data.ref, attachments)
    const current = (await event.data.ref.get()).data()
    const saveError = await autoSaveEmailFiles((current?.attachments || []) as EmailFile[], async file => {
      const details = await receiving<ProviderFile>(`${encodeURIComponent(receipt.emailId)}/attachments/${encodeURIComponent(file.id)}`)
      await saveToDrive(event.data!.ref, file, details, providerDownloadUrl(details.download_url || ''))
    }, (file, state) => setSaveState(event.data!.ref, file.id, state))
    if (saveError && Date.now() - (message.createdAt?.toMillis?.() || Date.parse(event.time)) < 60 * 60 * 1000) throw saveError
  } catch (error) {
    if ((await event.data.ref.get()).data()?.emailAttachmentState !== 'ready') await event.data.ref.update({ emailAttachmentState: 'failed' })
    console.error('[workhub email files] Metadata pending', error instanceof Error ? error.message : 'Unknown error')
    // Bound automatic retries; after one hour the user can retry explicitly.
    const createdAt = message.createdAt?.toMillis?.() || Date.parse(event.time)
    if (Date.now() - createdAt > 60 * 60 * 1000) return
    throw error
  }
})

async function driveToken(): Promise<string> {
  if (!clientId.value() || !clientSecret.value() || !refreshToken.value() || !folderId.value()) throw new HttpsError('failed-precondition', 'Google Drive connection is not configured.')
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: clientId.value(), client_secret: clientSecret.value(), refresh_token: refreshToken.value(), grant_type: 'refresh_token' }), signal: AbortSignal.timeout(15000) })
  if (!response.ok) throw new HttpsError('failed-precondition', 'Reconnect the Google Drive account.')
  return (await response.json() as { access_token: string }).access_token
}

export function providerDownloadUrl(value: string): URL {
  // This URL comes only from the authenticated Resend API, never the client.
  // Resend can use different CDN hosts; do not require one example hostname.
  const url = new URL(value)
  if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Invalid provider download URL')
  return url
}

export const accessWorkhubEmailAttachment = onCall<{ activityId: string; attachmentId?: string; action: 'preview' | 'thumbnail' | 'save' | 'retry' }>({ region: 'us-central1', secrets: [apiKey], timeoutSeconds: 120, memory: '512MiB', maxInstances: 3 }, async request => {
  const uid = request.auth?.uid
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in to access attachments.')
  const { activityId, attachmentId, action } = request.data || {}
  if (!activityId || !/^[a-zA-Z0-9_-]{1,150}$/.test(activityId) || !['preview', 'thumbnail', 'save', 'retry'].includes(action)) throw new HttpsError('invalid-argument', 'Invalid attachment request.')
  const db = admin.firestore()
  const activityRef = db.collection('workhub_activity').doc(activityId)
  const [member, activity] = await Promise.all([db.collection('workhub_members').doc(uid).get(), activityRef.get()])
  const message = activity.data()
  if (member.data()?.status !== 'approved' || !message || message.deletedAt || message.workspaceId !== '__communication_global__' || message.source !== 'email' || (message.threadId !== 'everyone' && !message.memberUids?.includes(uid))) throw new HttpsError('permission-denied', 'Chat access is required.')
  const receipt = (await db.collection('workhub_email_receipts').doc(createHash('sha256').update(String(message.emailSourceId || '')).digest('hex')).get()).data()
  if (!receipt || receipt.activityId !== activityId || (receipt.threadId !== 'everyone' && !receipt.memberUids?.includes(uid))) throw new HttpsError('permission-denied', 'Verified email access is required.')
  if (action === 'retry') {
    const attachments = await listEmailFiles(message.emailSourceId)
    await updateFiles(activityRef, attachments)
    return { ready: true }
  }
  const attachments = (message.attachments || []) as EmailFile[]
  const attachment = attachments.find(file => file.id === attachmentId)
  if (!attachment) throw new HttpsError('not-found', 'Attachment is not ready.')
  if (action === 'save' && attachment.driveUrl && /^https:\/\/drive\.google\.com\/file\/d\/[\w-]+\//.test(attachment.driveUrl)) return { url: attachment.driveUrl }
  let details: ProviderFile
  try { details = await receiving<ProviderFile>(`${encodeURIComponent(receipt.emailId)}/attachments/${encodeURIComponent(attachment.id)}`) }
  catch (error) {
    const driveId = attachment.driveUrl?.match(/^https:\/\/drive\.google\.com\/file\/d\/([\w-]+)\//)?.[1]
    if (driveId && action !== 'save') return { url: action === 'thumbnail' ? `https://drive.google.com/thumbnail?id=${driveId}&sz=w320` : attachment.driveUrl }
    throw error
  }
  const url = providerDownloadUrl(details.download_url || '')
  if (action === 'preview' || action === 'thumbnail') return { url: url.toString() }
  return { url: await saveToDrive(activityRef, attachment, details, url) }
})

async function saveToDrive(activityRef: admin.firestore.DocumentReference, attachment: EmailFile, details: ProviderFile, url: URL): Promise<string> {
  if (details.size > 20 * 1024 * 1024) throw new HttpsError('invalid-argument', 'Use a Drive link for files larger than 20 MB.')
  const token = await driveToken()
  const sourceId = createHash('sha256').update(`${attachment.emailId}:${attachment.id}`).digest('hex')
  const q = `'${folderId.value().replace(/'/g, "\\'")}' in parents and trashed=false and appProperties has { key='workhubEmailAttachment' and value='${sourceId}' }`
  const existing = await fetch(`https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&includeItemsFromAllDrives=true&q=${encodeURIComponent(q)}&fields=files(id,webViewLink)`, { headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000) })
  if (!existing.ok) throw new HttpsError('failed-precondition', 'Cannot access the configured Google Drive folder.')
  let saved = (await existing.json() as { files: Array<{ id: string; webViewLink?: string }> }).files[0]
  if (!saved) {
    const response = await fetch(url, { signal: AbortSignal.timeout(20000) })
    if (!response.ok || !response.body) throw new HttpsError('unavailable', 'Attachment is not available. Try again.')
    const chunks: Uint8Array[] = []
    let size = 0
    for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
      size += chunk.length
      if (size > 20 * 1024 * 1024) throw new HttpsError('invalid-argument', 'Attachment exceeds 20 MB.')
      chunks.push(chunk)
    }
    const boundary = `workhub_${sourceId}`
    const metadata = { name: attachment.name, mimeType: /^[\w.+-]+\/[\w.+-]+$/.test(attachment.contentType) ? attachment.contentType : 'application/octet-stream', parents: [folderId.value()], appProperties: { workhubEmailAttachment: sourceId } }
    const body = Buffer.concat([Buffer.from(`--${boundary}\r\nContent-Type: application/json\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: application/octet-stream\r\n\r\n`), ...chunks, Buffer.from(`\r\n--${boundary}--` )])
    const upload = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,webViewLink', { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': `multipart/related; boundary=${boundary}` }, body, signal: AbortSignal.timeout(30000) })
    if (!upload.ok) throw new HttpsError('unavailable', 'Google Drive could not save this attachment.')
    saved = await upload.json() as { id: string; webViewLink?: string }
  }
  const driveUrl = saved.webViewLink || `https://drive.google.com/file/d/${saved.id}/view`
  await admin.firestore().runTransaction(async tx => {
    const current = (await tx.get(activityRef)).data()
    if (!current || current.deletedAt) throw new HttpsError('not-found', 'Message no longer available.')
    tx.update(activityRef, { attachments: (current.attachments as EmailFile[]).map(file => file.id === attachment.id ? { id: file.id, emailId: file.emailId, name: file.name, size: file.size, contentType: file.contentType, provider: file.provider, driveUrl } : file) })
  })
  return driveUrl
}

async function setSaveState(ref: admin.firestore.DocumentReference, id: string, state: 'saving' | 'failed') {
  await admin.firestore().runTransaction(async tx => {
    const current = (await tx.get(ref)).data()
    if (!current || current.deletedAt) return
    tx.update(ref, { attachments: (current.attachments as EmailFile[]).map(file => file.id === id && !file.driveUrl ? { ...file, driveSaveState: state } : file) })
  })
}

export async function autoSaveEmailFiles(files: EmailFile[], save: (file: EmailFile) => Promise<void>, report: (file: EmailFile, state: 'saving' | 'failed') => Promise<void>): Promise<unknown> {
  let error: unknown
  for (const file of files) {
    if (file.driveUrl) continue
    try {
      await report(file, 'saving')
      await save(file)
    } catch (failure) {
      await report(file, 'failed')
      error = failure
    }
  }
  return error
}
