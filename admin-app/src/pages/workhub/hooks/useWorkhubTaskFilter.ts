import { useMemo } from 'react'
import type { WorkhubProject, WorkhubTask, WorkhubTaskStatusConfig, WorkhubWorkspace } from '../../../lib/workhubRepo'
import { getTaskAttachments } from '../taskDataUtils'
import { isEffectivelyEmptyTaskTitle } from '../taskUtils'
import { buildWorkspaceTaskStatuses } from '../statusTemplates'

interface UseWorkhubTaskFilterParams {
  tasks: WorkhubTask[]
  visibleProjectIds: Set<string>
  visibleProjectsByParent: Map<string, WorkhubProject[]>
  visibleWorkspaceProjects: WorkhubProject[]
  selectedProjectId: string
  selectedAssigneeUid: string
  selectedWorkspace: WorkhubWorkspace | null
  selectedWorkspaceScopeType: string
  taskFilterRequireAttachments: boolean
  taskFilterRequireChecklist: boolean
  taskFilterPriority: string
  selectedTaskStatusTab: string
}

export function useWorkhubTaskFilter({
  tasks,
  visibleProjectIds,
  visibleProjectsByParent,
  visibleWorkspaceProjects,
  selectedProjectId,
  selectedAssigneeUid,
  selectedWorkspace,
  selectedWorkspaceScopeType,
  taskFilterRequireAttachments,
  taskFilterRequireChecklist,
  taskFilterPriority,
  selectedTaskStatusTab,
}: UseWorkhubTaskFilterParams) {
  const workspaceTaskStatuses = useMemo<WorkhubTaskStatusConfig[]>(() => {
    if (Array.isArray(selectedWorkspace?.taskStatuses) && (selectedWorkspace?.taskStatuses?.length ?? 0) > 0) {
      return selectedWorkspace!.taskStatuses!.map((item) => ({ ...item }))
    }
    return buildWorkspaceTaskStatuses('workspace_default', selectedWorkspaceScopeType)
  }, [selectedWorkspace?.id, selectedWorkspace?.taskStatuses, selectedWorkspaceScopeType])

  const effectiveStatusesByProjectId = useMemo(() => {
    const cache = new Map<string, WorkhubTaskStatusConfig[]>()
    const byId = new Map(visibleWorkspaceProjects.map((p) => [p.id, p]))

    function resolve(projectId: string, depth = 0): WorkhubTaskStatusConfig[] {
      if (depth > 20) return workspaceTaskStatuses
      if (cache.has(projectId)) return cache.get(projectId)!
      const project = byId.get(projectId)
      if (!project) { cache.set(projectId, workspaceTaskStatuses); return workspaceTaskStatuses }
      if (Array.isArray(project.taskStatuses) && project.taskStatuses.length > 0) {
        const result = project.taskStatuses.map((item) => ({ ...item }))
        cache.set(projectId, result)
        return result
      }
      if (project.parentProjectId) {
        const parentResult = resolve(project.parentProjectId, depth + 1)
        cache.set(projectId, parentResult)
        return parentResult
      }
      cache.set(projectId, workspaceTaskStatuses)
      return workspaceTaskStatuses
    }

    visibleWorkspaceProjects.forEach((p) => resolve(p.id))
    return cache
  }, [visibleWorkspaceProjects, workspaceTaskStatuses])

  const selectedProjectEffectiveTaskStatuses = useMemo(() => {
    if (!selectedProjectId || selectedProjectId === 'all') return workspaceTaskStatuses
    return effectiveStatusesByProjectId.get(selectedProjectId) ?? workspaceTaskStatuses
  }, [selectedProjectId, effectiveStatusesByProjectId, workspaceTaskStatuses])

  const defaultTaskStatusId = useMemo(
    () => workspaceTaskStatuses.find((item) => item.id === 'backlog')?.id || workspaceTaskStatuses[0]?.id || 'backlog',
    [workspaceTaskStatuses],
  )

  const workspaceScopedTasks = useMemo(() => {
    return tasks.filter((item) => {
      if (!visibleProjectIds.has(item.projectId)) return false
      if (isEffectivelyEmptyTaskTitle(item.title || '')) return false
      if (selectedAssigneeUid !== 'all' && item.assigneeUid !== selectedAssigneeUid) return false
      return true
    })
  }, [selectedAssigneeUid, tasks, visibleProjectIds])

  const workspaceTaskCountByProjectId = useMemo(() => {
    const counts: Record<string, number> = {}
    workspaceScopedTasks.forEach((task) => {
      counts[task.projectId] = (counts[task.projectId] || 0) + 1
    })
    return counts
  }, [workspaceScopedTasks])

  const workspaceDoneTaskCountByProjectId = useMemo(() => {
    const counts: Record<string, number> = {}
    workspaceScopedTasks.forEach((task) => {
      if (!/done|complete/i.test(task.status)) return
      counts[task.projectId] = (counts[task.projectId] || 0) + 1
    })
    return counts
  }, [workspaceScopedTasks])

  const workspaceTaskProgressByProjectId = useMemo(() => {
    const cache: Record<string, { done: number; total: number }> = {}
    const visiting = new Set<string>()

    const resolveProgress = (projectId: string): { done: number; total: number } => {
      if (!projectId) return { done: 0, total: 0 }
      if (cache[projectId]) return cache[projectId]
      if (visiting.has(projectId)) {
        return {
          done: workspaceDoneTaskCountByProjectId[projectId] || 0,
          total: workspaceTaskCountByProjectId[projectId] || 0,
        }
      }
      visiting.add(projectId)
      let done = workspaceDoneTaskCountByProjectId[projectId] || 0
      let total = workspaceTaskCountByProjectId[projectId] || 0
      const children = visibleProjectsByParent.get(projectId) || []
      children.forEach((child) => {
        const childProgress = resolveProgress(child.id)
        done += childProgress.done
        total += childProgress.total
      })
      visiting.delete(projectId)
      const result = { done, total }
      cache[projectId] = result
      return result
    }

    visibleWorkspaceProjects.forEach((project) => {
      cache[project.id] = resolveProgress(project.id)
    })

    return cache
  }, [visibleProjectsByParent, visibleWorkspaceProjects, workspaceDoneTaskCountByProjectId, workspaceTaskCountByProjectId])

  const visibleTasks = useMemo(() => {
    if (selectedProjectId === 'all') return workspaceScopedTasks
    return workspaceScopedTasks.filter((item) => item.projectId === selectedProjectId)
  }, [selectedProjectId, workspaceScopedTasks])

  const taskCountByStatus = useMemo(
    () => tasks.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1
      return acc
    }, {} as Record<string, number>),
    [tasks],
  )

  const taskFilterBaseTasks = useMemo(() => {
    return visibleTasks.filter((item) => {
      if (taskFilterRequireAttachments && getTaskAttachments(item).length === 0) return false
      if (taskFilterRequireChecklist && (!Array.isArray(item.checklist) || item.checklist.length === 0)) return false
      if (taskFilterPriority !== 'all' && item.priority !== taskFilterPriority) return false
      return true
    })
  }, [taskFilterPriority, taskFilterRequireAttachments, taskFilterRequireChecklist, visibleTasks])

  const activeTaskFilterCount = useMemo(() => {
    let count = 0
    if (taskFilterRequireAttachments) count += 1
    if (taskFilterRequireChecklist) count += 1
    if (taskFilterPriority !== 'all') count += 1
    return count
  }, [taskFilterPriority, taskFilterRequireAttachments, taskFilterRequireChecklist])

  const filteredTasks = useMemo(() => {
    if (selectedTaskStatusTab === 'all') return taskFilterBaseTasks
    return taskFilterBaseTasks.filter((item) => item.status === selectedTaskStatusTab)
  }, [selectedTaskStatusTab, taskFilterBaseTasks])

  const filteredTaskCountByStatus = useMemo(() => {
    const grouped: Record<string, number> = {}
    for (const item of filteredTasks) {
      grouped[item.status] = (grouped[item.status] || 0) + 1
    }
    return grouped
  }, [filteredTasks])

  const financeStatusTotals = useMemo<Record<string, number>>(() => {
    if (selectedWorkspaceScopeType !== 'finance') return {}
    const totals: Record<string, number> = {}
    for (const task of filteredTasks) {
      if (typeof task.valueAmount === 'number' && Number.isFinite(task.valueAmount) && task.valueAmount > 0) {
        totals[task.status] = Math.round(((totals[task.status] || 0) + task.valueAmount) * 100) / 100
      }
    }
    return totals
  }, [filteredTasks, selectedWorkspaceScopeType])

  const financeWorkspaceCurrency = useMemo<string>(() => {
    if (selectedWorkspaceScopeType !== 'finance') return ''
    for (const task of filteredTasks) {
      if (task.valueCurrency) return task.valueCurrency
    }
    return 'OMR'
  }, [filteredTasks, selectedWorkspaceScopeType])

  const taskFilterBaseTaskCountByStatus = useMemo(() => {
    const grouped: Record<string, number> = {}
    for (const item of taskFilterBaseTasks) {
      grouped[item.status] = (grouped[item.status] || 0) + 1
    }
    return grouped
  }, [taskFilterBaseTasks])

  const completedStatusForHighlight = useMemo(() => {
    const completedCandidates = selectedProjectEffectiveTaskStatuses.filter((status) => {
      const token = `${status.id} ${status.label}`.toLowerCase()
      return token.includes('done') || token.includes('complete') || token.includes('closed')
    })
    if (completedCandidates.length === 0) return null
    const withTasks = completedCandidates.find((status) => (taskFilterBaseTaskCountByStatus[status.id] || 0) > 0)
    return withTasks || completedCandidates[0] || null
  }, [selectedProjectEffectiveTaskStatuses, taskFilterBaseTaskCountByStatus])

  const completedHighlightCount = useMemo(
    () => (completedStatusForHighlight ? (taskFilterBaseTaskCountByStatus[completedStatusForHighlight.id] || 0) : 0),
    [completedStatusForHighlight, taskFilterBaseTaskCountByStatus],
  )

  return {
    workspaceTaskStatuses,
    effectiveStatusesByProjectId,
    selectedProjectEffectiveTaskStatuses,
    defaultTaskStatusId,
    workspaceScopedTasks,
    workspaceTaskCountByProjectId,
    workspaceDoneTaskCountByProjectId,
    workspaceTaskProgressByProjectId,
    visibleTasks,
    taskCountByStatus,
    taskFilterBaseTasks,
    activeTaskFilterCount,
    filteredTasks,
    filteredTaskCountByStatus,
    financeStatusTotals,
    financeWorkspaceCurrency,
    taskFilterBaseTaskCountByStatus,
    completedStatusForHighlight,
    completedHighlightCount,
  }
}
