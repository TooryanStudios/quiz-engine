import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  createWorkhubActivity,
  createWorkhubActivityWithId,
  createWorkhubNotifications,
  clearWorkhubActivityReaction,
  confirmWorkhubActivityReceipt,
  markWorkhubActivityRead,
  setWorkhubActivityReaction,
  softDeleteWorkhubActivity,
  subscribeAllWorkhubMembers,
  subscribeWorkhubActivity,
  updateWorkhubActivityDeliveryState,
  type WorkhubActivity,
  type WorkhubChatMessageDeliveryState,
  type WorkhubChatMessagePriority,
  type WorkhubMember,
  updateWorkhubActivityMessage,
} from '../../../lib/workhubRepo'
import { getTimeValue } from '../utils/workhubNotificationNavigation'

export const GLOBAL_CHAT_WORKSPACE_ID = '__communication_global__'
export const THREAD_EVERYONE = 'everyone'

export interface TeamChatUser {
  uid: string
  displayName?: string
  email?: string
  photoURL?: string
}

export interface TeamChatMessage {
  id: string
  text: string
  replyToActivityId?: string
  imageUrl?: string
  senderUid: string
  senderName: string
  senderPhotoURL: string
  createdAt?: unknown
  editedAt?: unknown
  deletedAt?: unknown
  deletedBy?: string
  targetPath?: string
  threadId: string
  priority: WorkhubChatMessagePriority
  deliveryState: WorkhubChatMessageDeliveryState
  reactionsByUid: Record<string, string>
  receivedByUids: string[]
  readByUids: string[]
  expectedRecipientUids: string[]
}

export interface TeamTypingIndicator {
  uid: string
  name: string
}

export interface SendTeamChatMessageOptions {
  targetPath?: string
  targetTaskId?: string
  /** UIDs to send to. Empty / omitted = broadcast to everyone. Include sender UID to send to self too. */
  recipientUids?: string[]
  imageUrl?: string
  priority?: WorkhubChatMessagePriority
  replyToActivityId?: string
}

interface UseGlobalTeamChatParams {
  user: TeamChatUser | null
  enabled: boolean
  /** The active thread to show. Default 'everyone'. */
  threadId?: string
  /** Whether incoming messages in active thread should be auto-marked received/read. */
  markAsReadActive?: boolean
}

const TYPING_TTL_MS = 3_000

export function parseThreadParticipantUids(threadId: string): string[] {
  const normalized = (threadId || '').trim()
  if (!normalized || normalized === THREAD_EVERYONE) return []
  return normalized.split('|').map((uid) => uid.trim()).filter(Boolean)
}

/** Build a stable thread ID from a set of participant UIDs (sorted, pipe-delimited). */
export function buildThreadId(uids: string[]): string {
  const unique = Array.from(new Set(uids.filter(Boolean)))
  if (unique.length === 0) return THREAD_EVERYONE
  return unique.sort().join('|')
}

function resolveSenderName(user: TeamChatUser | null, membersByUid: Record<string, WorkhubMember>): string {
  if (!user) return 'Team member'
  const fromMembers = membersByUid[user.uid]
  const displayName = (fromMembers?.displayName || user.displayName || '').trim()
  if (displayName) return displayName
  const email = (fromMembers?.email || user.email || '').trim()
  if (email) return email.split('@')[0]
  return 'Team member'
}

function toMessage(item: WorkhubActivity, membersByUid: Record<string, WorkhubMember>): TeamChatMessage {
  const member = membersByUid[item.actorUid]
  return {
    id: item.id,
    text: item.message || '',
    replyToActivityId: (item.replyToActivityId || '').trim() || undefined,
    imageUrl: (item.imageUrl || '').trim() || undefined,
    senderUid: item.actorUid,
    senderName: (member?.displayName || member?.email || 'Team member').trim() || 'Team member',
    senderPhotoURL: (member?.photoURL || '').trim(),
    createdAt: item.createdAt,
    editedAt: item.editedAt,
    deletedAt: item.deletedAt,
    deletedBy: item.deletedBy,
    targetPath: (item.targetPath || '').trim() || undefined,
    threadId: (item.threadId || THREAD_EVERYONE).trim() || THREAD_EVERYONE,
    priority: item.messagePriority === 'high' ? 'high' : 'normal',
    deliveryState: item.messageDeliveryState === 'failed' ? 'failed' : 'ok',
    reactionsByUid: item.messageReactions && typeof item.messageReactions === 'object'
      ? Object.fromEntries(Object.entries(item.messageReactions).filter(([uid, reaction]) => !!uid && typeof reaction === 'string' && reaction.trim().length > 0))
      : {},
    receivedByUids: Array.isArray(item.receivedByUids) ? item.receivedByUids.filter(Boolean) : [],
    readByUids: Array.isArray(item.readByUids) ? item.readByUids.filter(Boolean) : [],
    expectedRecipientUids: [],
  }
}

function extractMentionUids(text: string, approvedMembers: WorkhubMember[]) {
  const byKey = new Map<string, string>()
  approvedMembers.forEach((member) => {
    const display = (member.displayName || '').trim().toLowerCase()
    const displayToken = display.replace(/\s+/g, '_')
    const emailPrefix = (member.email || '').split('@')[0].trim().toLowerCase()
    if (display) byKey.set(display, member.uid)
    if (displayToken) byKey.set(displayToken, member.uid)
    if (emailPrefix) byKey.set(emailPrefix, member.uid)
  })
  const result = new Set<string>()
  const regex = /@([a-zA-Z0-9._-]{2,60})/g
  let match: RegExpExecArray | null = null
  while ((match = regex.exec(text)) !== null) {
    const key = (match[1] || '').toLowerCase()
    const uid = byKey.get(key)
    if (uid) result.add(uid)
  }
  return Array.from(result)
}

export function useGlobalTeamChat({ user, enabled, threadId = THREAD_EVERYONE, markAsReadActive = true }: UseGlobalTeamChatParams) {
  const [members, setMembers] = useState<WorkhubMember[]>([])
  const [activity, setActivity] = useState<WorkhubActivity[]>([])
  const [sending, setSending] = useState(false)
  const [tick, setTick] = useState(0)
  const typingPulseRef = useRef<Record<string, number>>({})
  const markReceiptInFlightRef = useRef<Set<string>>(new Set())
  const markReadInFlightRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    if (!enabled || !user?.uid) {
      setMembers([])
      return
    }
    return subscribeAllWorkhubMembers(setMembers)
  }, [enabled, user?.uid])

  useEffect(() => {
    if (!enabled || !user?.uid) {
      setActivity([])
      return
    }
    return subscribeWorkhubActivity(GLOBAL_CHAT_WORKSPACE_ID, user.uid, false, setActivity)
  }, [enabled, user?.uid])

  const membersByUid = useMemo(() => {
    const map: Record<string, WorkhubMember> = {}
    members.forEach((m) => { map[m.uid] = m })
    return map
  }, [members])

  const approvedMembers = useMemo(
    () => members.filter((m) => m.status === 'approved'),
    [members],
  )

  const approvedMemberUids = useMemo(
    () => approvedMembers.map((m) => m.uid),
    [approvedMembers],
  )

  const messages = useMemo(() => {
    return activity
      .filter((item) => {
        if (item.action !== 'chat_message') return false
        const msgThread = (item.threadId || THREAD_EVERYONE).trim() || THREAD_EVERYONE
        return msgThread === threadId
      })
      .map((item) => {
        const base = toMessage(item, membersByUid)
        const expectedRecipientUids = base.threadId === THREAD_EVERYONE
          ? approvedMemberUids.filter((uid) => uid !== base.senderUid)
          : parseThreadParticipantUids(base.threadId).filter((uid) => uid !== base.senderUid)
        return {
          ...base,
          expectedRecipientUids,
        }
      })
      .sort((a, b) => {
        const aMs = getTimeValue(a.createdAt)
        const bMs = getTimeValue(b.createdAt)
        const safeA = aMs > 0 ? aMs : Number.MAX_SAFE_INTEGER
        const safeB = bMs > 0 ? bMs : Number.MAX_SAFE_INTEGER
        return safeA - safeB
      })
  }, [activity, approvedMemberUids, membersByUid, threadId])

  const unreadStampByThread = useMemo(() => {
    const byThread: Record<string, number> = {}
    if (!user?.uid) return byThread

    activity.forEach((item) => {
      if (item.action !== 'chat_message') return
      if (item.actorUid === user.uid) return
      const readByUids = Array.isArray(item.readByUids) ? item.readByUids.filter(Boolean) : []
      if (readByUids.includes(user.uid)) return

      const msgThread = (item.threadId || THREAD_EVERYONE).trim() || THREAD_EVERYONE
      const createdAtMs = getTimeValue(item.createdAt)
      const safeStamp = createdAtMs > 0 ? createdAtMs : Date.now()
      byThread[msgThread] = Math.max(byThread[msgThread] || 0, safeStamp)
    })

    return byThread
  }, [activity, user?.uid])

  useEffect(() => {
    if (!enabled || !user?.uid || !markAsReadActive) return

    const incomingVisible = messages.filter((item) => item.senderUid !== user.uid)
    incomingVisible.forEach((item) => {
      if (!item.receivedByUids.includes(user.uid) && !markReceiptInFlightRef.current.has(item.id)) {
        markReceiptInFlightRef.current.add(item.id)
        void confirmWorkhubActivityReceipt({ activityId: item.id, recipientUid: user.uid })
          .catch(() => undefined)
          .finally(() => markReceiptInFlightRef.current.delete(item.id))
      }

      if (!item.readByUids.includes(user.uid) && !markReadInFlightRef.current.has(item.id)) {
        markReadInFlightRef.current.add(item.id)
        void markWorkhubActivityRead({ activityId: item.id, recipientUid: user.uid })
          .catch(() => undefined)
          .finally(() => markReadInFlightRef.current.delete(item.id))
      }
    })
  }, [enabled, markAsReadActive, messages, user?.uid])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setTick((current) => current + 1)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [])

  const typingIndicators = useMemo(() => {
    if (!user?.uid) return [] as TeamTypingIndicator[]
    const now = Date.now() + (tick * 0)
    const latestTypingByUid = new Map<string, { type: 'typing' | 'stop' | 'message'; at: number }>()

    for (const item of activity) {
      const msgThread = (item.threadId || THREAD_EVERYONE).trim() || THREAD_EVERYONE
      if (msgThread !== threadId) continue

      const timeValue = getTimeValue(item.createdAt)
      if (timeValue <= 0) continue

      if (item.action === 'chat_typing') {
        const prev = latestTypingByUid.get(item.actorUid)
        if (!prev || timeValue > prev.at) {
          latestTypingByUid.set(item.actorUid, { type: 'typing', at: timeValue })
        }
      }

      if (item.action === 'chat_typing_stop' || item.action === 'chat_message') {
        const prev = latestTypingByUid.get(item.actorUid)
        const nextType: 'stop' | 'message' = item.action === 'chat_typing_stop' ? 'stop' : 'message'
        if (!prev || timeValue > prev.at) {
          latestTypingByUid.set(item.actorUid, { type: nextType, at: timeValue })
        }
      }
    }

    const byUid = new Map<string, TeamTypingIndicator>()
    latestTypingByUid.forEach((state, uid) => {
      if (uid === user.uid) return
      if (state.type !== 'typing') return
      if ((now - state.at) > TYPING_TTL_MS) return
      const member = membersByUid[uid]
      byUid.set(uid, {
        uid,
        name: (member?.displayName || member?.email || 'Someone').trim() || 'Someone',
      })
    })
    return Array.from(byUid.values())
  }, [activity, membersByUid, threadId, tick, user?.uid])

  const sendTyping = useCallback(async (isTyping: boolean, recipientUids?: string[]) => {
    if (!enabled || !user?.uid) return

    const explicitRecipients = recipientUids || []
    const isBroadcast = explicitRecipients.length === 0
    const allParticipants = isBroadcast
      ? []
      : Array.from(new Set([user.uid, ...explicitRecipients]))
    const typingThreadId = isBroadcast ? THREAD_EVERYONE : buildThreadId(allParticipants)

    const now = Date.now()
    if (isTyping) {
      const lastPulse = typingPulseRef.current[typingThreadId] || 0
      if ((now - lastPulse) < 2000) return
      typingPulseRef.current[typingThreadId] = now
    }

    const visibility = isBroadcast ? 'workspace' : 'restricted'
    const memberUids = isBroadcast ? [] : allParticipants

    await createWorkhubActivity({
      workspaceId: GLOBAL_CHAT_WORKSPACE_ID,
      actorUid: user.uid,
      entityType: 'workspace',
      entityId: GLOBAL_CHAT_WORKSPACE_ID,
      action: isTyping ? 'chat_typing' : 'chat_typing_stop',
      message: isTyping ? 'typing' : 'stopped typing',
      threadId: typingThreadId,
      visibility,
      memberUids,
    }).catch(() => undefined)
  }, [enabled, user])

  const sendMessage = useCallback(async (text: string, options?: SendTeamChatMessageOptions) => {
    const normalizedText = text.trim()
    const imageUrl = (options?.imageUrl || '').trim()
    if (!enabled || !user?.uid || (!normalizedText && !imageUrl)) return false

    setSending(true)
    const senderName = resolveSenderName(user, membersByUid)
    const preview = normalizedText.length > 120 ? `${normalizedText.slice(0, 120)}...` : normalizedText
    const targetPath = (options?.targetPath || '/messages').trim() || '/messages'
    const targetTaskId = (options?.targetTaskId || '').trim()
    const priority: WorkhubChatMessagePriority = options?.priority === 'high' ? 'high' : 'normal'
    const replyToActivityId = (options?.replyToActivityId || '').trim()
    const notificationSummary = replyToActivityId
      ? `${senderName} replied${preview ? `: ${preview}` : ''}`
      : `${senderName}: ${preview}`

    // Determine recipients and thread
    const explicitRecipients = options?.recipientUids
    const isBroadcast = !explicitRecipients || explicitRecipients.length === 0
    const allParticipants = isBroadcast
      ? []
      : Array.from(new Set([user.uid, ...explicitRecipients]))
    const msgThreadId = isBroadcast ? THREAD_EVERYONE : buildThreadId(allParticipants)
    const visibility = isBroadcast ? 'workspace' : 'restricted'
    const memberUids = isBroadcast ? [] : allParticipants
    const mentionUids = extractMentionUids(normalizedText, approvedMembers)

    try {
      const activityId = await createWorkhubActivityWithId({
        workspaceId: GLOBAL_CHAT_WORKSPACE_ID,
        actorUid: user.uid,
        entityType: targetTaskId ? 'task' : 'workspace',
        entityId: targetTaskId || GLOBAL_CHAT_WORKSPACE_ID,
        action: 'chat_message',
        message: normalizedText,
        ...(replyToActivityId ? { replyToActivityId } : {}),
        ...(imageUrl ? { imageUrl } : {}),
        targetPath,
        threadId: msgThreadId,
        messagePriority: priority,
        messageDeliveryState: 'ok',
        visibility,
        memberUids,
      })

      // Fan-out notifications: everyone for broadcast, or only explicit recipients (excluding self)
      const notifyUids = isBroadcast
        ? approvedMemberUids.filter((uid) => uid !== user.uid)
        : explicitRecipients.filter((uid) => uid !== user.uid)
      const mergedNotifyUids = Array.from(new Set([...notifyUids, ...mentionUids.filter((uid) => uid !== user.uid)]))

      if (mergedNotifyUids.length > 0) {
        try {
          await createWorkhubNotifications({
            workspaceId: GLOBAL_CHAT_WORKSPACE_ID,
            actorUid: user.uid,
            recipientUids: mergedNotifyUids,
            entityType: targetTaskId ? 'task' : 'workspace',
            entityId: targetTaskId || GLOBAL_CHAT_WORKSPACE_ID,
            action: priority === 'high' ? 'chat_message_high' : 'chat_message',
            message: notificationSummary,
            ...(imageUrl ? { imageUrl } : {}),
            targetPath,
            threadId: msgThreadId,
            activityId,
            messagePriority: priority,
            ...(normalizedText ? { commentPreview: normalizedText } : {}),
          })
        } catch {
          await updateWorkhubActivityDeliveryState({ activityId, state: 'failed' }).catch(() => undefined)
        }
      }

      return true
    } catch (error) {
      console.error('Could not send team chat message', error)
      return false
    } finally {
      setSending(false)
    }
  }, [approvedMemberUids, approvedMembers, enabled, membersByUid, user])

  const remindMessage = useCallback(async (item: TeamChatMessage) => {
    if (!enabled || !user?.uid) return false
    const senderName = resolveSenderName(user, membersByUid)
    const participants = parseThreadParticipantUids(item.threadId)
    const recipients = item.threadId === THREAD_EVERYONE
      ? approvedMemberUids.filter((uid) => uid !== user.uid)
      : participants.filter((uid) => uid && uid !== user.uid)
    if (recipients.length === 0) return false
    await createWorkhubNotifications({
      workspaceId: GLOBAL_CHAT_WORKSPACE_ID,
      actorUid: user.uid,
      recipientUids: recipients,
      entityType: 'workspace',
      entityId: GLOBAL_CHAT_WORKSPACE_ID,
      action: 'chat_message',
      message: `Reminder from ${senderName}: ${(item.text || '').slice(0, 120)}`,
      threadId: item.threadId,
      targetPath: '/messages',
      ...(item.text ? { commentPreview: item.text } : {}),
    })
    return true
  }, [approvedMemberUids, enabled, membersByUid, user])

  const editMessage = useCallback(async (messageId: string, nextText: string) => {
    const normalized = nextText.trim()
    if (!enabled || !user?.uid || !normalized) return false
    const existing = activity.find((item) => item.id === messageId)
    if (!existing) return false

    await updateWorkhubActivityMessage({ activityId: messageId, message: normalized })

    const isBroadcast = ((existing.threadId || THREAD_EVERYONE).trim() || THREAD_EVERYONE) === THREAD_EVERYONE
    const participants = parseThreadParticipantUids(existing.threadId || THREAD_EVERYONE)
    const recipients = isBroadcast
      ? approvedMemberUids.filter((uid) => uid !== user.uid)
      : participants.filter((uid) => uid && uid !== user.uid)

    if (recipients.length > 0) {
      const senderName = resolveSenderName(user, membersByUid)
      await createWorkhubNotifications({
        workspaceId: GLOBAL_CHAT_WORKSPACE_ID,
        actorUid: user.uid,
        recipientUids: recipients,
        entityType: existing.entityType,
        entityId: existing.entityId,
        action: 'chat_message_edited',
        message: `${senderName} edited a message`,
        targetPath: (existing.targetPath || '/messages').trim() || '/messages',
        threadId: (existing.threadId || THREAD_EVERYONE).trim() || THREAD_EVERYONE,
        commentPreview: normalized,
      }).catch(() => undefined)
    }

    return true
  }, [activity, approvedMemberUids, enabled, membersByUid, user])

  const deleteMessage = useCallback(async (messageId: string) => {
    if (!enabled || !user?.uid) return false
    await softDeleteWorkhubActivity({ activityId: messageId, actorUid: user.uid })
    return true
  }, [enabled, user])

  const confirmMessageReceipt = useCallback(async (messageId: string) => {
    if (!enabled || !user?.uid) return false
    await confirmWorkhubActivityReceipt({ activityId: messageId, recipientUid: user.uid })
    return true
  }, [enabled, user?.uid])

  const setMessageReaction = useCallback(async (messageId: string, reaction: string) => {
    if (!enabled || !user?.uid) return false
    await setWorkhubActivityReaction({ activityId: messageId, uid: user.uid, reaction })

    // Notify the original message sender (not ourselves)
    const targetMsg = activity.find((item) => item.id === messageId)
    if (targetMsg && targetMsg.actorUid && targetMsg.actorUid !== user.uid) {
      const reactorName = resolveSenderName(user, membersByUid)
      const preview = (targetMsg.message || '').slice(0, 80).trim()
      try {
        await createWorkhubNotifications({
          workspaceId: GLOBAL_CHAT_WORKSPACE_ID,
          actorUid: user.uid,
          recipientUids: [targetMsg.actorUid],
          entityType: 'workspace',
          entityId: GLOBAL_CHAT_WORKSPACE_ID,
          action: 'chat_reaction',
          message: `${reactorName} reacted ${reaction} to your message${preview ? `: "${preview}"` : ''}`,
          targetPath: '/messages',
          threadId: targetMsg.threadId || THREAD_EVERYONE,
          activityId: messageId,
        })
      } catch {
        // non-critical, ignore
      }
    }

    return true
  }, [activity, enabled, membersByUid, user])

  const clearMessageReaction = useCallback(async (messageId: string) => {
    if (!enabled || !user?.uid) return false
    await clearWorkhubActivityReaction({ activityId: messageId, uid: user.uid })
    return true
  }, [enabled, user?.uid])

  return {
    messages,
    unreadStampByThread,
    sending,
    sendMessage,
    remindMessage,
    editMessage,
    deleteMessage,
    confirmMessageReceipt,
    setMessageReaction,
    clearMessageReaction,
    sendTyping,
    typingIndicators,
    approvedMembers,
  }
}
