import type { WorkhubWorkspaceTemplateId } from './workspaceTemplates'

export type WorkhubHomeWidgetTone = 'neutral' | 'good' | 'warn' | 'danger'

export interface WorkhubHomeWidget {
  id: string
  title: string
  value: string
  detail: string
  tone?: WorkhubHomeWidgetTone
}

export interface WorkhubHomeWidgetMetrics {
  totalTasks: number
  activeTasks: number
  inProgressTasks: number
  urgentTasks: number
  completionRate: number
  projectsCount: number
  restrictedProjectsCount: number
  assignedMembersCount: number
  workspaceClientCount: number
  unreadNotifications: number
  pendingMembersCount: number
  upcomingDeadlineProjectsCount: number
  nearTermDeadlineProjectsCount: number
  overdueProjectsCount: number
  recentActivityCount: number
  taskStatusCounts: Record<string, number>
  taskStatusLabels: Record<string, string>
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

function asCount(value: number): string {
  if (!Number.isFinite(value)) return '0'
  return String(Math.max(0, Math.round(value)))
}

function asPercent(value: number): string {
  return `${clampPercent(value)}%`
}

function countByStatusKeywords(metrics: WorkhubHomeWidgetMetrics, keywords: string[]): number {
  const normalizedKeywords = keywords.map((keyword) => keyword.toLowerCase())
  return Object.entries(metrics.taskStatusCounts).reduce((total, [statusId, count]) => {
    if (!count) return total
    const label = `${statusId} ${metrics.taskStatusLabels[statusId] || ''}`.toLowerCase()
    return normalizedKeywords.some((keyword) => label.includes(keyword)) ? total + count : total
  }, 0)
}

function buildEmptyWidgets(metrics: WorkhubHomeWidgetMetrics): WorkhubHomeWidget[] {
  return [
    {
      id: 'empty-tasks',
      title: 'Tasks in scope',
      value: asCount(metrics.totalTasks),
      detail: 'Start by adding your first project and task structure.',
      tone: 'neutral',
    },
    {
      id: 'empty-projects',
      title: 'Projects mapped',
      value: asCount(metrics.projectsCount),
      detail: 'Group work into clear streams before adding workload.',
      tone: 'neutral',
    },
    {
      id: 'empty-members',
      title: 'Assigned members',
      value: asCount(metrics.assignedMembersCount),
      detail: 'Invite the core team and set owner responsibilities early.',
      tone: 'neutral',
    },
    {
      id: 'empty-ready-state',
      title: 'Workspace readiness',
      value: metrics.totalTasks === 0 && metrics.projectsCount === 0 ? 'Ready' : 'In setup',
      detail: 'Use quick-add actions to scaffold your starting workflow.',
      tone: metrics.totalTasks === 0 && metrics.projectsCount === 0 ? 'good' : 'warn',
    },
  ]
}

function buildProjectsWidgets(metrics: WorkhubHomeWidgetMetrics): WorkhubHomeWidget[] {
  return [
    {
      id: 'projects-active',
      title: 'Active tasks',
      value: asCount(metrics.activeTasks),
      detail: 'All non-completed items in the current scope.',
      tone: metrics.activeTasks > 0 ? 'warn' : 'good',
    },
    {
      id: 'projects-urgent',
      title: 'Urgent tasks',
      value: asCount(metrics.urgentTasks),
      detail: 'Priority items requiring immediate action.',
      tone: metrics.urgentTasks > 0 ? 'danger' : 'good',
    },
    {
      id: 'projects-deadlines',
      title: 'Near-term deadlines',
      value: asCount(metrics.nearTermDeadlineProjectsCount),
      detail: 'Projects due within the next two days.',
      tone: metrics.nearTermDeadlineProjectsCount > 0 ? 'warn' : 'good',
    },
    {
      id: 'projects-delivery-rate',
      title: 'Delivery rate',
      value: asPercent(metrics.completionRate),
      detail: 'Completion across the current task scope.',
      tone: metrics.completionRate >= 70 ? 'good' : 'neutral',
    },
  ]
}

function buildFinanceWidgets(metrics: WorkhubHomeWidgetMetrics): WorkhubHomeWidget[] {
  const approvalQueue = countByStatusKeywords(metrics, ['received', 'review', 'approval', 'hold'])
  const settledItems = countByStatusKeywords(metrics, ['paid', 'approved', 'closed'])
  const disputeQueue = countByStatusKeywords(metrics, ['rejected', 'blocked'])

  return [
    {
      id: 'finance-approvals',
      title: 'Approval queue',
      value: asCount(approvalQueue),
      detail: 'Items waiting for review, approval, or release.',
      tone: approvalQueue > 0 ? 'warn' : 'good',
    },
    {
      id: 'finance-settled',
      title: 'Settled items',
      value: asCount(settledItems),
      detail: 'Tasks marked paid, approved, or closed.',
      tone: settledItems > 0 ? 'good' : 'neutral',
    },
    {
      id: 'finance-disputes',
      title: 'Dispute/block queue',
      value: asCount(disputeQueue),
      detail: 'Rejected or blocked items that need escalation.',
      tone: disputeQueue > 0 ? 'danger' : 'good',
    },
    {
      id: 'finance-clients',
      title: 'Linked clients',
      value: asCount(metrics.workspaceClientCount),
      detail: 'Workspace-linked clients and payees in your scope.',
      tone: 'neutral',
    },
  ]
}

function buildMarketingWidgets(metrics: WorkhubHomeWidgetMetrics): WorkhubHomeWidget[] {
  const productionQueue = countByStatusKeywords(metrics, ['planning', 'production', 'doing', 'execution', 'draft'])
  const reviewQueue = countByStatusKeywords(metrics, ['review', 'qa', 'approval'])
  const scheduledQueue = countByStatusKeywords(metrics, ['scheduled', 'calendar'])
  const publishedCount = countByStatusKeywords(metrics, ['published', 'done', 'completed', 'closed'])

  return [
    {
      id: 'marketing-production',
      title: 'Production queue',
      value: asCount(productionQueue),
      detail: 'Items in planning and content production stages.',
      tone: productionQueue > 0 ? 'warn' : 'good',
    },
    {
      id: 'marketing-review',
      title: 'Review queue',
      value: asCount(reviewQueue),
      detail: 'Creative and compliance approvals pending.',
      tone: reviewQueue > 0 ? 'warn' : 'good',
    },
    {
      id: 'marketing-scheduled',
      title: 'Scheduled items',
      value: asCount(scheduledQueue),
      detail: 'Assets planned for publishing windows.',
      tone: 'neutral',
    },
    {
      id: 'marketing-published',
      title: 'Published output',
      value: asCount(publishedCount),
      detail: 'Items completed and released.',
      tone: publishedCount > 0 ? 'good' : 'neutral',
    },
  ]
}

function buildProposalsWidgets(metrics: WorkhubHomeWidgetMetrics): WorkhubHomeWidget[] {
  const openPipeline = countByStatusKeywords(metrics, ['new_lead', 'lead', 'qualified', 'proposal', 'submitted', 'negotiation', 'clarification'])
  const wonCount = countByStatusKeywords(metrics, ['won', 'awarded'])
  const lostCount = countByStatusKeywords(metrics, ['lost', 'rejected'])

  return [
    {
      id: 'proposals-pipeline',
      title: 'Open pipeline',
      value: asCount(openPipeline),
      detail: 'Leads and proposals currently in motion.',
      tone: openPipeline > 0 ? 'warn' : 'neutral',
    },
    {
      id: 'proposals-wins',
      title: 'Won opportunities',
      value: asCount(wonCount),
      detail: 'Proposals converted into successful outcomes.',
      tone: wonCount > 0 ? 'good' : 'neutral',
    },
    {
      id: 'proposals-losses',
      title: 'Lost opportunities',
      value: asCount(lostCount),
      detail: 'Track reasons and improve qualification quality.',
      tone: lostCount > 0 ? 'danger' : 'good',
    },
    {
      id: 'proposals-deadlines',
      title: 'Upcoming deadlines',
      value: asCount(metrics.upcomingDeadlineProjectsCount),
      detail: 'Priority opportunities with visible due dates.',
      tone: metrics.overdueProjectsCount > 0 ? 'warn' : 'neutral',
    },
  ]
}

export function buildWorkhubHomeWidgets(
  templateId: WorkhubWorkspaceTemplateId,
  metrics: WorkhubHomeWidgetMetrics,
): WorkhubHomeWidget[] {
  switch (templateId) {
    case 'empty':
      return buildEmptyWidgets(metrics)
    case 'finance':
      return buildFinanceWidgets(metrics)
    case 'marketing':
      return buildMarketingWidgets(metrics)
    case 'proposals_leads':
      return buildProposalsWidgets(metrics)
    case 'projects':
    default:
      return buildProjectsWidgets(metrics)
  }
}
