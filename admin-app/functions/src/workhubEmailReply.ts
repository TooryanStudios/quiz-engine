import { parseTaskEmailAction, taskEmailTarget, defaultTaskEmailStatuses } from './workhubTaskEmailActions'
import * as admin from 'firebase-admin'
import { onRequest } from 'firebase-functions/v2/https'
import { defineSecret, defineString } from 'firebase-functions/params'
import { createHash, randomBytes } from 'node:crypto'
import { Webhook } from 'svix'


const apiKey = defineSecret('WORKHUB_RESEND_API_KEY')
const webhookSecret = defineSecret('WORKHUB_RESEND_WEBHOOK_SECRET')
const receivingDomain = defineString('WORKHUB_REPLY_DOMAIN', { default: '' })
const globalWorkspace = '__communication_global__'
const digest = (value: string) => createHash('sha256').update(value).digest('hex')
type Route = { uid: string; email: string; activityId: string; expiresAt: admin.firestore.Timestamp }

export function senderAddress(value: string): string {
  return (value.match(/<([^<>]+)>/)?.[1] || value).trim().toLowerCase()
}

export function replyText(text: string): string {
  const lines = text.replace(/\r/g, '').split('\n')
  const end = lines.findIndex(line => /^\s*(>|On .+wrote:|Le .+écrit\s*:|-----Original Message-----|From:|Sent from my |--\s*$)/i.test(line))
  return lines.slice(0, end < 0 ? lines.length : end).join('\n').trim().slice(0, 12000)
}

export async function createChatReplyAddress(notification: { action?: string; recipientUid?: string; activityId?: string }, email: string): Promise<string | undefined> {
  const domain = receivingDomain.value().trim().toLowerCase()
  if (!domain || !['chat_message', 'chat_message_high'].includes(notification.action || '') || !notification.recipientUid || !notification.activityId) return undefined
  const token = randomBytes(32).toString('hex')
  await admin.firestore().collection('workhub_email_reply_routes').doc(digest(token)).set({
    uid: notification.recipientUid, email: email.toLowerCase(), activityId: notification.activityId,
    expiresAt: admin.firestore.Timestamp.fromMillis(Date.now() + 30 * 86400000),
  } satisfies Route)
  return `reply-${token}@${domain}`
}

// The signing secret authenticates Resend; the per-recipient token and receiving
// server's DMARC result authenticate the reply route and its sender.
export const receiveWorkhubEmailReply = onRequest({ region: 'us-central1', secrets: [apiKey, webhookSecret], timeoutSeconds: 60, maxInstances: 3 }, async (req, res) => {
  if (req.method !== 'POST') { res.status(405).send('POST required'); return }
  let event: { type: string; data?: { email_id?: string } }
  try {
    new Webhook(webhookSecret.value()).verify(req.rawBody.toString('utf8'), {
      'svix-id': req.get('svix-id') || '', 'svix-timestamp': req.get('svix-timestamp') || '', 'svix-signature': req.get('svix-signature') || '',
    })
    event = JSON.parse(req.rawBody.toString('utf8'))
  } catch { res.status(401).send('Invalid signature'); return }
  if (event.type !== 'email.received') { res.status(200).send('Ignored'); return }
  const emailId = event.data?.email_id || ''
  if (!/^[a-zA-Z0-9-]{1,100}$/.test(emailId)) { res.status(400).send('Invalid event'); return }
  try {
    const response = await fetch(`https://api.resend.com/emails/receiving/${encodeURIComponent(emailId)}`, { headers: { Authorization: `Bearer ${apiKey.value()}` }, signal: AbortSignal.timeout(15000) })
    if (!response.ok) throw new Error(`Receiving API ${response.status}`)
    const email = await response.json() as { from: string; to: string[]; text?: string; html?: string; attachments?: Array<{ id: string }>; headers?: Record<string, string>; authentication?: { dmarc?: string } }
    const domain = receivingDomain.value().trim().toLowerCase()
    const address = email.to?.map(senderAddress).find(value => value.endsWith(`@${domain}`) && /^reply-[a-f0-9]{64}@/.test(value))
    if (!address || email.authentication?.dmarc !== 'pass') { res.status(200).send('Sender not verified'); return }
    const headers = Object.fromEntries(Object.entries(email.headers || {}).map(([key, value]) => [key.toLowerCase(), value]))
    if ((headers['auto-submitted'] && headers['auto-submitted'] !== 'no') || /bulk|list|junk/i.test(headers.precedence || '')) { res.status(200).send('Automatic email ignored'); return }
    const token = address.split('@')[0].slice(6)
    const db = admin.firestore()
    const routeSnapshot = await db.collection('workhub_email_reply_routes').doc(digest(token)).get()
    const route = routeSnapshot.data() as Route | undefined
    if (!route || route.expiresAt.toMillis() < Date.now() || senderAddress(email.from) !== route.email) { res.status(200).send('Reply route unavailable'); return }
    const memberRef = db.collection('workhub_members').doc(route.uid)
    const originalRef = db.collection('workhub_activity').doc(route.activityId)
    const [member, original] = await Promise.all([memberRef.get(), originalRef.get()])
    const message = original.data()
    if (member.data()?.status !== 'approved' || senderAddress(member.data()?.email || '') !== route.email || !message || message.deletedAt || message.workspaceId !== globalWorkspace || message.action !== 'chat_message') { res.status(200).send('Access unavailable'); return }
    const threadId = String(message.threadId || 'everyone')
    const participants: string[] = Array.isArray(message.memberUids) ? message.memberUids : []
    if (threadId !== 'everyone' && !participants.includes(route.uid)) { res.status(200).send('Access unavailable'); return }
    const text = replyText(email.text || (email.html || '').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '').replace(/<br\s*\/?>|<\/p>/gi, '\n').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'))

    const recipients = threadId === 'everyone'
      ? (await db.collection('workhub_members').where('status', '==', 'approved').get()).docs.map(doc => doc.id)
      : participants
    const id = `email_${digest(emailId)}`
    const activityRef = db.collection('workhub_activity').doc(id)
    if ((await activityRef.get()).exists) { res.status(200).send('Reply already received'); return }
    const attachmentCount = email.attachments?.length || 0
    const content = text || (attachmentCount ? 'Attachment received' : '')
    if (!content) { res.status(200).send('Empty reply ignored'); return }
    await db.runTransaction(async tx => {
      if ((await tx.get(activityRef)).exists) return
      // Recheck access inside the transaction before posting.
      const [currentMember, currentOriginal] = await Promise.all([tx.get(memberRef), tx.get(originalRef)])
      if (currentMember.data()?.status !== 'approved' || senderAddress(currentMember.data()?.email || '') !== route.email || !currentOriginal.exists || currentOriginal.data()?.deletedAt || currentOriginal.data()?.threadId !== message.threadId || (threadId !== 'everyone' && !currentOriginal.data()?.memberUids?.includes(route.uid))) throw new Error('Access changed')
      const target=taskEmailTarget(currentOriginal.data()?.targetPath,currentOriginal.data()?.message)
      let taskActionApplied=false
      if(target){
        const taskRef=db.collection('workhub_tasks').doc(target.taskId)
        const workspaceRef=db.collection('workhub_workspaces').doc(target.workspaceId)
        const [taskSnapshot,workspaceSnapshot]=await Promise.all([tx.get(taskRef),tx.get(workspaceRef)])
        const task=taskSnapshot.data();const workspace=workspaceSnapshot.data();const actor=currentMember.data()
        const privileged=['admin','administrator','manager'].includes(String(actor?.role||'').toLowerCase())
        const workspaceAccess=privileged||workspace?.createdBy===route.uid||workspace?.accessMemberUids?.includes(route.uid)||workspace?.invitedEmails?.some((email:string)=>senderAddress(email)===route.email)||workspace?.memberAccessLevels?.[route.uid]
        const full=privileged||workspace?.memberAccessLevels?.[route.uid]==='full'
        const readable=(value:admin.firestore.DocumentData)=>full||value.visibility!=='restricted'||value.createdBy===route.uid||value.memberUids?.includes(route.uid)
        let ancestorsReadable=true;let parent=task?.projectId;let statuses=workspace?.taskStatuses?.length?workspace.taskStatuses:defaultTaskEmailStatuses(workspace?.type);const seen=new Set<string>();let statusFound=false
        while(parent){if(seen.has(parent)||seen.size>=30){ancestorsReadable=false;break}seen.add(parent);const parentSnapshot=await tx.get(db.collection('workhub_projects').doc(parent));const project=parentSnapshot.data();if(!project||project.workspaceId!==target.workspaceId||!readable(project)){ancestorsReadable=false;break}if(!statusFound&&project.taskStatuses?.length){statuses=project.taskStatuses;statusFound=true}parent=project.parentProjectId}
        if(task&&workspace&&workspaceAccess&&task.workspaceId===target.workspaceId&&readable(task)&&ancestorsReadable){
          const action=parseTaskEmailAction(content)
          const canAct=privileged||task.createdBy===route.uid||task.assigneeUid===route.uid||task.assigneeUids?.includes(route.uid)
          const validStatus=action.kind==='status'&&statuses.some((status:{id:string})=>status.id===action.status)
          // Plain replies become comments. Approval and status commands require task ownership or assignment.
          if(action.kind==='comment'||canAct&&(action.kind!=='status'||validStatus)){
            tx.create(db.collection('workhub_task_comments').doc(id),{workspaceId:target.workspaceId,taskId:target.taskId,entityType:'task',entityId:target.taskId,authorUid:route.uid,body:content,source:'email',emailSourceId:emailId,createdAt:admin.firestore.FieldValue.serverTimestamp()})
            if(action.kind==='approve'||action.kind==='reject')tx.update(taskRef,{['approvalByUid.'+route.uid]:{decision:action.kind==='approve'?'approved':'rejected',source:'email',activityId:id,at:admin.firestore.Timestamp.now()},updatedAt:admin.firestore.FieldValue.serverTimestamp()})
            if(action.kind==='status')tx.update(taskRef,{status:action.status,updatedAt:admin.firestore.FieldValue.serverTimestamp(),...(['completed','done'].includes(action.status)?{completedAt:new Date().toISOString()}:{completedAt:''})})
            taskActionApplied=true
          }
        }
      }
      tx.create(activityRef, {
        workspaceId: globalWorkspace, actorUid: route.uid, entityType: message.entityType || 'workspace', entityId: message.entityId || globalWorkspace,
        action: 'chat_message', message: content, taskActionApplied, emailSourceId: emailId, attachmentCount, emailAttachmentState: attachmentCount ? 'pending' : 'ready', threadId, visibility: threadId === 'everyone' ? 'workspace' : 'restricted', memberUids: participants,
        replyToActivityId: route.activityId, messagePriority: 'normal', messageDeliveryState: 'ok', receivedByUids: [], readByUids: [],
        ...(message.targetPath ? { targetPath: message.targetPath } : {}), source: 'email', createdAt: admin.firestore.FieldValue.serverTimestamp(),
      })
      tx.create(db.collection('workhub_email_receipts').doc(digest(emailId)), {
        emailId, activityId: id, actorUid: route.uid, threadId, memberUids: participants,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      })
      for (const uid of [...new Set(recipients)].filter(uid => uid !== route.uid)) {
        tx.create(db.collection('workhub_notifications').doc(`${id}_${uid}`), {
          workspaceId: globalWorkspace, actorUid: route.uid, recipientUid: uid, entityType: message.entityType || 'workspace', entityId: message.entityId || globalWorkspace,
          action: 'chat_message', message: `${member.data()?.displayName || 'Team member'} sent you a message`, commentPreview: content, threadId, activityId: id,
          targetPath: message.targetPath || '/messages', read: false, createdAt: admin.firestore.FieldValue.serverTimestamp(),
        })
      }
    })
    res.status(200).send('Reply received')
  } catch (error) { console.error('[workhub email reply] Processing failed', error instanceof Error ? error.message : 'Unknown error'); res.status(500).send('Try again') }
})
