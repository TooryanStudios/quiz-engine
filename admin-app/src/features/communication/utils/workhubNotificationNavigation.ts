import type { WorkhubNotification } from '../../../lib/workhubRepo'

type WorkhubNotificationWithProject = WorkhubNotification & {
  projectId?: string
}

type WorkhubNotificationWithAction = WorkhubNotification & {
  action?: string
  targetPath?: string
}

function encodeSegment(value: string): string {
  return encodeURIComponent(value.trim())
}

function resolveProjectParam(projectId: string | undefined): string {
  const normalized = (projectId || '').trim()
  if (!normalized) return 'all'
  return normalized
}

export function resolveWorkhubNotificationPath(notification: WorkhubNotification): string {
  const workspaceId = (notification.workspaceId || '').trim()
  const withProject = notification as WorkhubNotificationWithProject
  const withAction = notification as WorkhubNotificationWithAction
  const explicitTargetPath = (withAction.targetPath || '').trim()
  if (explicitTargetPath) return explicitTargetPath

  const normalizedIncomingAction = (withAction.action || '').trim().toLowerCase()
  if (normalizedIncomingAction === 'chat_message' || normalizedIncomingAction === 'chat_message_edited' || normalizedIncomingAction === 'chat_message_high') {
    return '/messages'
  }

  if (!workspaceId) return '/workhub'

  const projectParam = resolveProjectParam(withProject.projectId)
  const encodedWorkspaceId = encodeSegment(workspaceId)
  const normalizedAction = normalizedIncomingAction

  if (notification.entityType === 'task' && notification.entityId) {
    const params = new URLSearchParams({ p: projectParam })
    return `/workhub/w/${encodedWorkspaceId}/t/${encodeSegment(notification.entityId)}?${params.toString()}`
  }

  if (notification.entityType === 'document' && notification.entityId) {
    const params = new URLSearchParams({ p: projectParam })
    return `/workhub/w/${encodedWorkspaceId}/d/${encodeSegment(notification.entityId)}?${params.toString()}`
  }

  if (notification.entityType === 'project' && notification.entityId) {
    return `/workhub/w/${encodedWorkspaceId}/p/${encodeSegment(notification.entityId)}`
  }

  // Task comments are currently stored as entityType=comment with entityId=taskId.
  if (notification.entityType === 'comment' && notification.entityId) {
    const params = new URLSearchParams({ p: projectParam })
    return `/workhub/w/${encodedWorkspaceId}/t/${encodeSegment(notification.entityId)}?${params.toString()}`
  }

  if (notification.entityType === 'member' || normalizedAction === 'approved' || normalizedAction === 'suspended') {
    return `/workhub/w/${encodedWorkspaceId}/s/users`
  }

  return `/workhub/w/${encodedWorkspaceId}`
}

export function getTimeValue(value: unknown): number {
  if (!value) return 0
  if (typeof value === 'object' && value !== null && 'toMillis' in value && typeof (value as { toMillis?: unknown }).toMillis === 'function') {
    return (value as { toMillis: () => number }).toMillis()
  }
  if (typeof value === 'object' && value !== null && 'seconds' in value) {
    const seconds = Number((value as { seconds?: unknown }).seconds || 0)
    const nanoseconds = Number((value as { nanoseconds?: unknown }).nanoseconds || 0)
    return (seconds * 1000) + Math.floor(nanoseconds / 1_000_000)
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

export function formatNotificationTime(value: unknown): string {
  const timestamp = getTimeValue(value)
  if (!timestamp) return ''

  const now = Date.now()
  const deltaMs = Math.max(0, now - timestamp)
  const minuteMs = 60_000
  const hourMs = 60 * minuteMs
  const dayMs = 24 * hourMs

  if (deltaMs < minuteMs) return 'now'
  if (deltaMs < hourMs) return `${Math.floor(deltaMs / minuteMs)}m`
  if (deltaMs < dayMs) return `${Math.floor(deltaMs / hourMs)}h`
  if (deltaMs < 7 * dayMs) return `${Math.floor(deltaMs / dayMs)}d`

  return new Date(timestamp).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
  })
}

export function formatFullMessageTime(value: unknown): string {
  const timestamp = getTimeValue(value)
  if (!timestamp) return ''
  const d = new Date(timestamp)
  const date = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  return `${date} · ${time}`
}
