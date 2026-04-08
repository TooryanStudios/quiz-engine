import type { WorkhubHomeWidget, WorkhubHomeWidgetMetrics } from './homeWidgetTypes'
import { asCount, asPercent } from './homeWidgetUtils'
import type { WorkhubWorkspaceTemplateModule } from './types'

function buildProjectsHomeWidgets(metrics: WorkhubHomeWidgetMetrics): WorkhubHomeWidget[] {
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

export const PROJECTS_WORKSPACE_TEMPLATE_MODULE: WorkhubWorkspaceTemplateModule = {
  definition: {
    id: 'projects',
    label: 'Projects workspace',
    description: 'Standard project execution flow with tasks, sub-projects, and delivery tracking.',
    graphic: 'PROJ',
    highlights: ['Delivery pipeline', 'Cross-team execution'],
    workspaceType: 'technical',
    statusTemplateId: 'workspace_default',
    mode: 'preset',
  },
  buildHomeWidgets: buildProjectsHomeWidgets,
}
