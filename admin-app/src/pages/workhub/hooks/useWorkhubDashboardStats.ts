import { useMemo } from 'react'
import type {
  WorkhubActivity,
  WorkhubClient,
  WorkhubMember,
  WorkhubProject,
  WorkhubTask,
  WorkhubTaskStatusConfig,
} from '../../../lib/workhubRepo'
import { DEFAULT_SUBMISSION_TIME, PROJECT_PRIORITY_RANK } from '../constants'
import { formatProjectDeadlineDate, formatTime, getInitials, resolveProjectDeadlineMs } from '../taskUtils'
import { buildWorkhubHomeWidgets } from '../homeTemplateWidgets'
import type { WorkhubWorkspaceTemplateId } from '../workspaceTemplates'
import type { WorkhubTaskPriority } from '../../../lib/workhubRepo'

interface TaskCounts {
  total: number
  done: number
  inProgress: number
  urgent: number
}

interface UseWorkhubDashboardStatsParams {
  visibleTasks: WorkhubTask[]
  workspaceTaskStatuses: WorkhubTaskStatusConfig[]
  taskCounts: TaskCounts
  scopeAssignableMembers: Array<Pick<WorkhubMember, 'uid' | 'displayName' | 'email'>>
  workspaceAssignableMembers: Array<Pick<WorkhubMember, 'uid'>>
  memberNameByUid: Record<string, string>
  workspaceProjects: WorkhubProject[]
  visibleWorkspaceProjects: WorkhubProject[]
  activity: WorkhubActivity[]
  currentUid: string
  isPrivilegedMember: boolean
  activityWindowDays: 7 | 14 | 30 | undefined
  allClientById: Record<string, WorkhubClient>
  clients: WorkhubClient[]
  scopedWorkspaceIds: string[]
  selectedWorkspaceTemplateId: WorkhubWorkspaceTemplateId
  unreadNotificationCount: number
  pendingMembersCount: number
}

export function useWorkhubDashboardStats({
  visibleTasks,
  workspaceTaskStatuses,
  taskCounts,
  scopeAssignableMembers,
  workspaceAssignableMembers,
  memberNameByUid,
  workspaceProjects,
  visibleWorkspaceProjects,
  activity,
  currentUid,
  isPrivilegedMember,
  activityWindowDays,
  allClientById,
  clients,
  scopedWorkspaceIds,
  selectedWorkspaceTemplateId,
  unreadNotificationCount,
  pendingMembersCount,
}: UseWorkhubDashboardStatsParams) {
  const overviewStatusBuckets = useMemo(() => {
    const statusCounts = new Map<string, number>()
    visibleTasks.forEach((task) => {
      statusCounts.set(task.status, (statusCounts.get(task.status) || 0) + 1)
    })
    return workspaceTaskStatuses.map((status) => ({
      id: status.id,
      label: status.label,
      color: status.color,
      count: statusCounts.get(status.id) || 0,
    }))
  }, [visibleTasks, workspaceTaskStatuses])

  const overviewPriorityBuckets = useMemo(() => {
    const priorities: Array<{ id: WorkhubTaskPriority; label: string; count: number; color: string }> = [
      { id: 'urgent', label: 'Urgent', count: 0, color: '#ef4444' },
      { id: 'high', label: 'High', count: 0, color: '#f59e0b' },
      { id: 'medium', label: 'Medium', count: 0, color: '#3b82f6' },
      { id: 'low', label: 'Low', count: 0, color: '#10b981' },
    ]
    const byId = new Map(priorities.map((item) => [item.id, item]))
    visibleTasks.forEach((task) => {
      const bucket = byId.get(task.priority)
      if (bucket) bucket.count += 1
    })
    return priorities
  }, [visibleTasks])

  const overviewCompletedCount = useMemo(() => {
    const completedStatusIds = new Set(
      workspaceTaskStatuses
        .filter((item) => /done|complete/i.test(item.id) || /done|complete/i.test(item.label))
        .map((item) => item.id),
    )
    if (completedStatusIds.size === 0) {
      completedStatusIds.add('done')
      completedStatusIds.add('completed')
    }
    return visibleTasks.reduce((n, item) => n + (completedStatusIds.has(item.status) ? 1 : 0), 0)
  }, [visibleTasks, workspaceTaskStatuses])

  const overviewCompletionRate = useMemo(
    () => (taskCounts.total > 0 ? Math.round((overviewCompletedCount / taskCounts.total) * 100) : 0),
    [overviewCompletedCount, taskCounts.total],
  )

  const tasksByAssignee = useMemo(() => {
    const countsByUid = new Map<string, { total: number; inProgress: number; done: number }>()
    for (const task of visibleTasks) {
      const uid = task.assigneeUid || ''
      if (!uid) continue
      let entry = countsByUid.get(uid)
      if (!entry) { entry = { total: 0, inProgress: 0, done: 0 }; countsByUid.set(uid, entry) }
      entry.total++
      if (task.status === 'in_progress') entry.inProgress++
      if (/done|complete/i.test(task.status)) entry.done++
    }
    return scopeAssignableMembers
      .map((person) => {
        const counts = countsByUid.get(person.uid)
        if (!counts) return null
        return { uid: person.uid, name: person.displayName || person.email, ...counts }
      })
      .filter((item): item is NonNullable<typeof item> => item !== null && item.total > 0)
      .sort((a, b) => b.total - a.total)
  }, [scopeAssignableMembers, visibleTasks])

  const restrictedProjectsCount = useMemo(
    () => workspaceProjects.filter((item) => item.visibility === 'restricted').length,
    [workspaceProjects],
  )

  const visibleActivity = useMemo(
    () => (isPrivilegedMember
      ? activity
      : activity.filter((item) => item.visibility !== 'restricted' || (item.memberUids || []).includes(currentUid))),
    [activity, currentUid, isPrivilegedMember],
  )

  const overviewRecentTimeline = useMemo(
    () => visibleActivity.slice(0, 8).map((item) => ({
      id: item.id,
      actor: memberNameByUid[item.actorUid] || item.actorUid,
      message: item.message,
      createdAt: formatTime(item.createdAt),
      action: item.action,
    })),
    [memberNameByUid, visibleActivity],
  )

  const teamActivityHeatmap = useMemo(() => {
    const windowDays: 7 | 14 | 30 = (activityWindowDays ?? 30) as 7 | 14 | 30
    const MS_PER_DAY = 86_400_000
    const now = Date.now()
    const days: string[] = []
    for (let i = windowDays - 1; i >= 0; i--) {
      const d = new Date(now - i * MS_PER_DAY)
      days.push(d.toISOString().slice(0, 10))
    }
    const daySet = new Set(days)
    function tsToDateKey(createdAt: unknown): string {
      if (!createdAt || typeof createdAt !== 'object') return ''
      if ('toMillis' in createdAt && typeof (createdAt as { toMillis?: unknown }).toMillis === 'function') {
        return new Date((createdAt as { toMillis: () => number }).toMillis()).toISOString().slice(0, 10)
      }
      if ('seconds' in createdAt) {
        return new Date(Number((createdAt as { seconds?: unknown }).seconds || 0) * 1000).toISOString().slice(0, 10)
      }
      return ''
    }
    const countByActorDay = new Map<string, Map<string, number>>()
    for (const item of visibleActivity) {
      const key = tsToDateKey(item.createdAt)
      if (!key || !daySet.has(key)) continue
      if (!countByActorDay.has(item.actorUid)) countByActorDay.set(item.actorUid, new Map())
      const byDay = countByActorDay.get(item.actorUid)!
      byDay.set(key, (byDay.get(key) ?? 0) + 1)
    }
    const rows = workspaceAssignableMembers
      .map((member) => {
        const byDay = countByActorDay.get(member.uid) ?? new Map<string, number>()
        const totalInWindow = Array.from(byDay.values()).reduce((s, v) => s + v, 0)
        return {
          uid: member.uid,
          name: memberNameByUid[member.uid] || member.uid,
          initials: getInitials(memberNameByUid[member.uid] || member.uid),
          totalInWindow,
          dayCounts: days.map((d) => byDay.get(d) ?? 0),
        }
      })
      .sort((a, b) => b.totalInWindow - a.totalInWindow)
    return { days, rows, windowDays }
  }, [activityWindowDays, memberNameByUid, visibleActivity, workspaceAssignableMembers])

  const displayedTeamActivityDays = useMemo(() => [...teamActivityHeatmap.days].reverse(), [teamActivityHeatmap.days])

  const overviewPriorityProjects = useMemo(() => {
    const now = Date.now()
    const oneDayMs = 24 * 60 * 60 * 1000
    const timelineHorizonDays = 14
    return visibleWorkspaceProjects
      .map((project) => {
        const deadlineMs = resolveProjectDeadlineMs(project)
        const daysRemaining = Number.isFinite(deadlineMs)
          ? Math.floor((deadlineMs - now) / oneDayMs)
          : Number.POSITIVE_INFINITY
        const priority = project.priority || 'medium'
        const priorityRank = PROJECT_PRIORITY_RANK[priority]
        const isOverdue = daysRemaining < 0
        const urgencyPercent = isOverdue
          ? 100
          : Math.round(((timelineHorizonDays - Math.min(daysRemaining, timelineHorizonDays)) / timelineHorizonDays) * 100)
        const countdownText = isOverdue
          ? `Overdue by ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? '' : 's'}`
          : daysRemaining === 0
            ? 'Due today'
            : `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining`
        return {
          project,
          deadlineMs,
          daysRemaining,
          priority,
          priorityRank,
          isOverdue,
          urgencyPercent,
          countdownText,
          isHighPriority: priorityRank >= PROJECT_PRIORITY_RANK.high,
          isNearTwoDays: daysRemaining >= 0 && daysRemaining <= 2,
        }
      })
      .filter((item) => Number.isFinite(item.deadlineMs))
      .filter((item) => item.isHighPriority || item.daysRemaining <= 7)
      .sort((a, b) => {
        if (a.isNearTwoDays !== b.isNearTwoDays) return a.isNearTwoDays ? -1 : 1
        if (a.daysRemaining !== b.daysRemaining) return a.daysRemaining - b.daysRemaining
        return b.priorityRank - a.priorityRank
      })
      .slice(0, 8)
      .map((item) => ({
        id: item.project.id,
        name: item.project.name,
        type: item.project.projectType || 'other',
        priority: item.priority,
        deadlineDate: formatProjectDeadlineDate(item.project.projectDeadline || ''),
        submissionTime: item.project.projectType === 'tender' ? (item.project.submissionTime || DEFAULT_SUBMISSION_TIME) : '',
        daysRemaining: item.daysRemaining,
        countdownShort: item.isOverdue ? `${Math.abs(item.daysRemaining)}d+` : `${item.daysRemaining}d`,
        countdownText: item.countdownText,
        urgencyPercent: Math.max(8, item.urgencyPercent),
        isOverdue: item.isOverdue,
        isNearTwoDays: item.isNearTwoDays,
        clientName: allClientById[item.project.clientId || '']?.name || '',
      }))
  }, [allClientById, visibleWorkspaceProjects])

  const homeWidgetTaskStatusCounts = useMemo(
    () => visibleTasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1
      return acc
    }, {} as Record<string, number>),
    [visibleTasks],
  )

  const homeWidgetTaskStatusLabels = useMemo(
    () => Object.fromEntries(workspaceTaskStatuses.map((status) => [status.id, status.label])) as Record<string, string>,
    [workspaceTaskStatuses],
  )

  const workspaceClientCount = useMemo(() => {
    if (!scopedWorkspaceIds.length) return 0
    const scopedIds = new Set(scopedWorkspaceIds)
    return clients.filter((item) => scopedIds.has(item.workspaceId)).length
  }, [clients, scopedWorkspaceIds])

  const displayedOverviewPriorityProjects = useMemo(
    () => overviewPriorityProjects.slice(0, 6),
    [overviewPriorityProjects],
  )

  const overduePriorityProjectsCount = useMemo(
    () => overviewPriorityProjects.filter((item) => item.isOverdue).length,
    [overviewPriorityProjects],
  )

  const nearTermPriorityProjectsCount = useMemo(
    () => overviewPriorityProjects.filter((item) => !item.isOverdue && item.daysRemaining <= 2).length,
    [overviewPriorityProjects],
  )

  const homeTemplateWidgets = useMemo(
    () => buildWorkhubHomeWidgets(selectedWorkspaceTemplateId, {
      totalTasks: taskCounts.total,
      activeTasks: Math.max(taskCounts.total - overviewCompletedCount, 0),
      inProgressTasks: taskCounts.inProgress,
      urgentTasks: taskCounts.urgent,
      completionRate: overviewCompletionRate,
      projectsCount: visibleWorkspaceProjects.length,
      restrictedProjectsCount,
      assignedMembersCount: tasksByAssignee.length,
      workspaceClientCount,
      unreadNotifications: unreadNotificationCount,
      pendingMembersCount,
      upcomingDeadlineProjectsCount: overviewPriorityProjects.length,
      nearTermDeadlineProjectsCount: nearTermPriorityProjectsCount,
      overdueProjectsCount: overduePriorityProjectsCount,
      recentActivityCount: overviewRecentTimeline.length,
      taskStatusCounts: homeWidgetTaskStatusCounts,
      taskStatusLabels: homeWidgetTaskStatusLabels,
    }),
    [
      homeWidgetTaskStatusCounts,
      homeWidgetTaskStatusLabels,
      nearTermPriorityProjectsCount,
      overviewCompletedCount,
      overviewCompletionRate,
      overviewPriorityProjects.length,
      overviewRecentTimeline.length,
      overduePriorityProjectsCount,
      pendingMembersCount,
      restrictedProjectsCount,
      selectedWorkspaceTemplateId,
      taskCounts.inProgress,
      taskCounts.total,
      taskCounts.urgent,
      tasksByAssignee.length,
      unreadNotificationCount,
      visibleWorkspaceProjects.length,
      workspaceClientCount,
    ],
  )

  return {
    overviewStatusBuckets,
    overviewPriorityBuckets,
    overviewCompletedCount,
    overviewCompletionRate,
    tasksByAssignee,
    restrictedProjectsCount,
    visibleActivity,
    overviewRecentTimeline,
    teamActivityHeatmap,
    displayedTeamActivityDays,
    overviewPriorityProjects,
    displayedOverviewPriorityProjects,
    overduePriorityProjectsCount,
    nearTermPriorityProjectsCount,
    homeWidgetTaskStatusCounts,
    homeWidgetTaskStatusLabels,
    workspaceClientCount,
    homeTemplateWidgets,
  }
}
