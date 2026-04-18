import { useMemo } from 'react'
import type { WorkhubNotification, WorkhubProject, WorkhubTask } from '../../../lib/workhubRepo'

interface UseWorkhubNotificationDerivedParams {
  notifications: WorkhubNotification[]
  tasks: WorkhubTask[]
  selectedWorkspaceId: string
  workspaceProjectById: Record<string, WorkhubProject>
}

export function useWorkhubNotificationDerived({
  notifications,
  tasks,
  selectedWorkspaceId,
  workspaceProjectById,
}: UseWorkhubNotificationDerivedParams) {
  const unreadNotificationCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications],
  )

  const taskById = useMemo(
    () => Object.fromEntries(tasks.map((item) => [item.id, item])) as Record<string, WorkhubTask>,
    [tasks],
  )

  const unreadCommentCountByTaskId = useMemo(() => {
    const counts: Record<string, number> = {}
    const unreadCommentNotifications = notifications.filter((item) => !item.read && item.entityType === 'comment' && !!item.entityId)
    if (unreadCommentNotifications.length === 0) return counts
    unreadCommentNotifications.forEach((item) => {
      const targetTask = taskById[item.entityId]
      if (!targetTask || targetTask.workspaceId !== selectedWorkspaceId) return
      counts[targetTask.id] = (counts[targetTask.id] || 0) + 1
    })
    return counts
  }, [notifications, selectedWorkspaceId, taskById])

  const unreadCommentCountByProjectId = useMemo(() => {
    const counts: Record<string, number> = {}
    if (Object.keys(unreadCommentCountByTaskId).length === 0) return counts
    Object.entries(unreadCommentCountByTaskId).forEach(([taskId, unreadCount]) => {
      const task = taskById[taskId]
      if (!task?.projectId || unreadCount <= 0) return
      let pointerId = task.projectId
      const visited = new Set<string>()
      while (pointerId && !visited.has(pointerId)) {
        visited.add(pointerId)
        counts[pointerId] = (counts[pointerId] || 0) + unreadCount
        pointerId = workspaceProjectById[pointerId]?.parentProjectId || ''
      }
    })
    return counts
  }, [taskById, unreadCommentCountByTaskId, workspaceProjectById])

  return {
    unreadNotificationCount,
    unreadCommentCountByTaskId,
    unreadCommentCountByProjectId,
  }
}
