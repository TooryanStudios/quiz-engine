import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  markWorkhubNotificationRead,
  subscribeWorkhubNotifications,
  type WorkhubNotification,
} from '../../../lib/workhubRepo'
import { resolveWorkhubNotificationPath } from '../utils/workhubNotificationNavigation'

interface UseWorkhubNotificationCenterParams {
  userUid: string
  enabled: boolean
  maxItems?: number
}

export function useWorkhubNotificationCenter({
  userUid,
  enabled,
  maxItems = 20,
}: UseWorkhubNotificationCenterParams) {
  const [notifications, setNotifications] = useState<WorkhubNotification[]>([])

  useEffect(() => {
    if (!enabled || !userUid) {
      setNotifications([])
      return
    }
    return subscribeWorkhubNotifications(userUid, setNotifications)
  }, [enabled, userUid])

  const unreadCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications],
  )

  const visibleNotifications = useMemo(
    () => notifications.slice(0, maxItems),
    [maxItems, notifications],
  )

  const openNotification = useCallback(async (notification: WorkhubNotification) => {
    if (!notification.read) {
      await markWorkhubNotificationRead(notification.id).catch(() => undefined)
    }
    return resolveWorkhubNotificationPath(notification)
  }, [])

  return {
    notifications: visibleNotifications,
    unreadCount,
    openNotification,
  }
}
