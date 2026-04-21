import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import type { WorkhubNotification } from '../../../lib/workhubRepo'
import { useWorkhubNotificationCenter } from '../hooks/useWorkhubNotificationCenter'
import { formatNotificationTime } from '../utils/workhubNotificationNavigation'
import '../communication.css'

interface InAppNotificationCenterProps {
  userUid: string
  isAr: boolean
}

function resolveEntityLabel(notification: WorkhubNotification, isAr: boolean): string {
  if (notification.entityType === 'task') return isAr ? 'مهمة' : 'Task'
  if (notification.entityType === 'project') return isAr ? 'مشروع' : 'Project'
  if (notification.entityType === 'document') return isAr ? 'مستند' : 'Document'
  if (notification.entityType === 'comment') return isAr ? 'تعليق' : 'Comment'
  if (notification.entityType === 'member') return isAr ? 'عضو' : 'Member'
  return isAr ? 'تحديث' : 'Update'
}

export function InAppNotificationCenter({ userUid, isAr }: InAppNotificationCenterProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const { notifications, unreadCount, openNotification } = useWorkhubNotificationCenter({
    userUid,
    enabled: !!userUid,
    maxItems: 25,
  })

  useEffect(() => {
    setOpen(false)
  }, [location.pathname, location.search])

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Node)) return
      if (containerRef.current && !containerRef.current.contains(target)) {
        setOpen(false)
      }
    }

    document.addEventListener('mousedown', handleDocumentClick)
    return () => document.removeEventListener('mousedown', handleDocumentClick)
  }, [])

  const handleNotificationClick = useCallback(async (notification: WorkhubNotification) => {
    const targetPath = await openNotification(notification)
    setOpen(false)
    navigate(targetPath)
  }, [navigate, openNotification])

  const unreadLabel = useMemo(() => {
    if (unreadCount <= 0) return ''
    if (unreadCount > 99) return '99+'
    return String(unreadCount)
  }, [unreadCount])

  return (
    <div className="shell-notify-center" ref={containerRef}>
      <button
        type="button"
        className={`shell-comm-btn${open ? ' is-active' : ''}`}
        aria-label={isAr ? 'الإشعارات' : 'Notifications'}
        title={isAr ? 'الإشعارات' : 'Notifications'}
        onClick={() => setOpen((prev) => !prev)}
      >
        <span aria-hidden="true">🔔</span>
        {unreadLabel && <span className="shell-comm-btn-badge">{unreadLabel}</span>}
      </button>

      {open && (
        <section className="shell-notify-popover" role="dialog" aria-label={isAr ? 'مركز الإشعارات' : 'Notification center'}>
          <header className="shell-notify-popover-header">
            <strong>{isAr ? 'الإشعارات' : 'Notifications'}</strong>
            <span>
              {unreadCount > 0
                ? (isAr ? `${unreadCount} غير مقروءة` : `${unreadCount} unread`)
                : (isAr ? 'لا يوجد جديد' : 'All caught up')}
            </span>
          </header>

          {notifications.length === 0 ? (
            <div className="shell-notify-empty">
              {isAr ? 'لا توجد إشعارات بعد.' : 'No notifications yet.'}
            </div>
          ) : (
            <div className="shell-notify-list">
              {notifications.map((item) => {
                const entityLabel = resolveEntityLabel(item, isAr)
                const timeLabel = formatNotificationTime(item.createdAt)
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`shell-notify-item${item.read ? '' : ' is-unread'}`}
                    onClick={() => {
                      void handleNotificationClick(item)
                    }}
                  >
                    <span className={`shell-notify-dot${item.read ? ' is-read' : ''}`} aria-hidden="true" />
                    <span className="shell-notify-content">
                      <span className="shell-notify-message">{item.message || (isAr ? 'تحديث جديد' : 'New update')}</span>
                      <span className="shell-notify-meta">
                        <span>{entityLabel}</span>
                        {timeLabel && <span>{timeLabel}</span>}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
