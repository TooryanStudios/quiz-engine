import React, { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  confirmWorkhubActivityReceipt,
  markWorkhubNotificationRead,
  subscribeWorkhubNotifications,
  subscribeAllWorkhubMembers,
  type WorkhubNotification,
  type WorkhubMember,
} from '../../../lib/workhubRepo'
import { useToast } from '../../../lib/ToastContext'
import { useDialog } from '../../../lib/DialogContext'
import { resolveWorkhubNotificationPath } from '../utils/workhubNotificationNavigation'
import { dispatchChatDockOpen } from '../utils/chatDockEvents'
import { playChatReceiveSound, readChatSoundPrefs } from '../utils/chatSound'

interface UseCommunicationNotificationToastsParams {
  userUid: string
  enabled: boolean
  chatOpen?: boolean
}

type UrgentQueueItem = {
  notification: WorkhubNotification
  senderName: string
  senderAvatar?: string
  chatPreview: string
  imageUrl?: string
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function normalizeChatPreview(message: string, senderName: string): string {
  const normalizedMessage = (message || '').trim()
  const normalizedSender = (senderName || '').trim()
  if (!normalizedMessage) return 'New message'
  if (!normalizedSender) return normalizedMessage

  const senderPattern = escapeRegExp(normalizedSender)
  const withSenderPrefix = new RegExp(`^${senderPattern}\\s*:\\s*`, 'i')
  const withReminderPrefix = new RegExp(`^Reminder\\s+from\\s+${senderPattern}\\s*:\\s*`, 'i')

  return normalizedMessage
    .replace(withReminderPrefix, '')
    .replace(withSenderPrefix, '')
    .trim() || 'New message'
}

export function useCommunicationNotificationToasts({
  userUid,
  enabled,
  chatOpen = false,
}: UseCommunicationNotificationToastsParams) {
  const navigate = useNavigate()
  const { showToast } = useToast()
  const { show: showDialog } = useDialog()
  const initializedRef = useRef(false)
  const seenIdsRef = useRef<Set<string>>(new Set())
  const membersRef = useRef<WorkhubMember[]>([])
  const markingReadRef = useRef<Set<string>>(new Set())
  const urgentQueueRef = useRef<UrgentQueueItem[]>([])
  const urgentShowingRef = useRef(false)

  useEffect(() => {
    if (!enabled || !userUid) return
    return subscribeAllWorkhubMembers((items) => { membersRef.current = items })
  }, [enabled, userUid])

  useEffect(() => {
    if (!enabled || !userUid) {
      initializedRef.current = false
      seenIdsRef.current = new Set()
      return
    }

    return subscribeWorkhubNotifications(userUid, (items) => {
      if (!initializedRef.current) {
        seenIdsRef.current = new Set(items.map((item) => item.id))
        initializedRef.current = true
        return
      }

      const unseen = items.filter((item) => !seenIdsRef.current.has(item.id))
      if (unseen.length === 0) return

      const processUrgentQueue = () => {
        if (urgentShowingRef.current) return
        const queued = urgentQueueRef.current.shift()
        if (!queued) return
        urgentShowingRef.current = true

        const { notification, senderName, senderAvatar, chatPreview, imageUrl } = queued
        const urgentDialogContent = React.createElement(
          'div',
          { style: { display: 'grid', gap: '10px' } },
          React.createElement('style', null, '@keyframes urgentDialogShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-5px)}40%{transform:translateX(5px)}60%{transform:translateX(-3px)}80%{transform:translateX(3px)}}'),
          React.createElement(
            'div',
            {
              style: {
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: 'linear-gradient(135deg, #fee2e2 0%, #fff1f1 100%)',
                border: '1px solid #fecaca',
                borderRadius: '10px',
                padding: '10px 12px',
                animation: 'urgentDialogShake 0.46s ease-in-out 1',
              },
            },
            senderAvatar
              ? React.createElement('img', {
                  src: senderAvatar,
                  alt: senderName,
                  style: {
                    width: '34px',
                    height: '34px',
                    borderRadius: '999px',
                    objectFit: 'cover',
                    border: '1px solid #fca5a5',
                  },
                })
              : React.createElement(
                'span',
                {
                  style: {
                    width: '34px',
                    height: '34px',
                    borderRadius: '999px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    color: '#7f1d1d',
                    background: '#fecaca',
                  },
                },
                (senderName || 'T').slice(0, 1).toUpperCase(),
              ),
            React.createElement(
              'div',
              { style: { display: 'grid' } },
              React.createElement('strong', { style: { color: '#7f1d1d', fontSize: '0.95rem' } }, 'Urgent Message'),
              React.createElement('span', { style: { color: '#991b1b', fontSize: '0.82rem' } }, senderName),
            ),
          ),
          React.createElement('p', { style: { margin: 0, color: 'var(--text-mid)', lineHeight: 1.5 } }, chatPreview),
          !!imageUrl && React.createElement(
            'a',
            {
              href: imageUrl,
              target: '_blank',
              rel: 'noreferrer',
              style: { width: 'fit-content', display: 'inline-flex', borderRadius: '8px', border: '1px solid #fecaca', overflow: 'hidden' },
              title: 'Open image full size',
            },
            React.createElement('img', {
              src: imageUrl,
              alt: 'Urgent message attachment',
              style: {
                width: '84px',
                height: '84px',
                objectFit: 'cover',
                display: 'block',
              },
            }),
          ),
          React.createElement('small', { style: { color: '#991b1b', fontWeight: 700 } }, 'This message requires receive confirmation.'),
        )

        showDialog({
          title: 'High Priority Message',
          message: urgentDialogContent,
          confirmText: 'Confirm Received',
          cancelText: 'Open Chat',
          onConfirm: async () => {
            await markWorkhubNotificationRead(notification.id).catch(() => undefined)
            const activityId = (notification as WorkhubNotification & { activityId?: string }).activityId || ''
            if (activityId && userUid) {
              await confirmWorkhubActivityReceipt({ activityId, recipientUid: userUid }).catch(() => undefined)
            }
            dispatchChatDockOpen({
              threadId: (notification.threadId || '').trim() || undefined,
              actorUid: notification.actorUid,
              source: 'toast',
            })
            urgentShowingRef.current = false
            window.setTimeout(processUrgentQueue, 0)
          },
          onCancel: () => {
            dispatchChatDockOpen({
              threadId: (notification.threadId || '').trim() || undefined,
              actorUid: notification.actorUid,
              source: 'toast',
            })
            urgentShowingRef.current = false
            window.setTimeout(processUrgentQueue, 0)
          },
        })
      }

      unseen.slice().reverse().forEach((item: WorkhubNotification) => {
        seenIdsRef.current.add(item.id)
        if (item.actorUid === userUid) return

        const targetPath = resolveWorkhubNotificationPath(item)
        const action = (item.action || '').trim().toLowerCase()
        const isChatMessage = action === 'chat_message' || action === 'chat_message_edited'
        const isHighPriorityChatMessage = action === 'chat_message_high'

        const actor = membersRef.current.find((m) => m.uid === item.actorUid)
        const senderName = (actor?.displayName || actor?.email || 'Team member').trim()
        const senderAvatar = (actor?.photoURL || '').trim() || undefined
        const chatPreview = normalizeChatPreview(item.message || '', senderName)
        const imageUrl = (item.imageUrl || '').trim() || undefined

        if ((isChatMessage || isHighPriorityChatMessage) && !readChatSoundPrefs().muteReceive) {
          playChatReceiveSound()
        }

        if (isHighPriorityChatMessage) {
          urgentQueueRef.current.push({
            notification: item,
            senderName,
            senderAvatar,
            chatPreview,
            imageUrl,
          })
          processUrgentQueue()
          return
        }

        showToast({
          type: 'info',
          durationMs: 7000,
          message: item.message || 'New notification',
          actionLabel: isChatMessage ? 'Open chat' : 'Open',
          ...(isChatMessage ? {
            senderName,
            senderAvatar,
            messagePreview: chatPreview,
          } : {}),
          onAction: () => {
            void markWorkhubNotificationRead(item.id).catch(() => undefined)
            if (isChatMessage) {
              dispatchChatDockOpen({
                threadId: (item.threadId || '').trim() || undefined,
                actorUid: item.actorUid,
                source: 'toast',
              })
              return
            }
            navigate(targetPath)
          },
        })
      })
    })
  }, [enabled, navigate, showDialog, showToast, userUid])

  useEffect(() => {
    if (!enabled || !userUid || !chatOpen) return

    return subscribeWorkhubNotifications(userUid, (items) => {
      const unreadChatItems = items.filter((item) => {
        if (item.read) return false
        const action = (item.action || '').trim().toLowerCase()
        return action === 'chat_message' || action === 'chat_message_edited'
      })

      if (unreadChatItems.length === 0) return

      unreadChatItems.forEach((item) => {
        if (markingReadRef.current.has(item.id)) return
        markingReadRef.current.add(item.id)
        void markWorkhubNotificationRead(item.id)
          .catch(() => undefined)
          .finally(() => {
            markingReadRef.current.delete(item.id)
          })
      })
    })
  }, [chatOpen, enabled, userUid])
}
