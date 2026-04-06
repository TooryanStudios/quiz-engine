import type { WorkhubTask } from '../../lib/workhubRepo'

export function getTaskOrderValue(task: Pick<WorkhubTask, 'sortOrder' | 'createdAt'>): number {
  if (typeof task.sortOrder === 'number' && Number.isFinite(task.sortOrder)) {
    return task.sortOrder
  }
  if (!task.createdAt) return 0
  if (typeof task.createdAt === 'object' && task.createdAt !== null && 'toMillis' in task.createdAt && typeof (task.createdAt as { toMillis?: unknown }).toMillis === 'function') {
    return (task.createdAt as { toMillis: () => number }).toMillis()
  }
  if (typeof task.createdAt === 'object' && task.createdAt !== null && 'seconds' in task.createdAt) {
    const seconds = Number((task.createdAt as { seconds?: unknown }).seconds || 0)
    const nanoseconds = Number((task.createdAt as { nanoseconds?: unknown }).nanoseconds || 0)
    return (seconds * 1000) + Math.floor(nanoseconds / 1_000_000)
  }
  if (typeof task.createdAt === 'string') {
    const parsed = Date.parse(task.createdAt)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

export function getOrderedTasksForStatus(
  tasks: WorkhubTask[],
  workspaceId: string,
  statusId: string,
): WorkhubTask[] {
  return tasks
    .filter((item) => item.workspaceId === workspaceId && item.status === statusId)
    .sort((a, b) => {
      const orderDelta = getTaskOrderValue(a) - getTaskOrderValue(b)
      if (orderDelta !== 0) return orderDelta
      return getTaskOrderValue(a) - getTaskOrderValue(b)
    })
}

export function getNextTaskSortOrder(
  tasks: WorkhubTask[],
  workspaceId: string,
  statusId: string,
): number {
  const orderedTasks = getOrderedTasksForStatus(tasks, workspaceId, statusId)
  const lastTask = orderedTasks.at(-1)
  if (!lastTask) return Date.now()
  return getTaskOrderValue(lastTask) + 1024
}
