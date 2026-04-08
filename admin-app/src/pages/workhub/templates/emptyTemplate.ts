import type { WorkhubHomeWidget, WorkhubHomeWidgetMetrics } from './homeWidgetTypes'
import { asCount } from './homeWidgetUtils'
import type { WorkhubWorkspaceTemplateModule } from './types'

function buildEmptyHomeWidgets(metrics: WorkhubHomeWidgetMetrics): WorkhubHomeWidget[] {
  return [
    {
      id: 'empty-tasks',
      title: 'Tasks in scope',
      value: asCount(metrics.totalTasks),
      detail: 'Start by adding your first project and task structure.',
      tone: 'neutral' as const,
    },
    {
      id: 'empty-projects',
      title: 'Projects mapped',
      value: asCount(metrics.projectsCount),
      detail: 'Group work into clear streams before adding workload.',
      tone: 'neutral' as const,
    },
    {
      id: 'empty-members',
      title: 'Assigned members',
      value: asCount(metrics.assignedMembersCount),
      detail: 'Invite the core team and set owner responsibilities early.',
      tone: 'neutral' as const,
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

export const EMPTY_WORKSPACE_TEMPLATE_MODULE: WorkhubWorkspaceTemplateModule = {
  definition: {
    id: 'empty',
    label: 'Empty workspace',
    description: 'Start from a clean workspace and customize everything manually.',
    graphic: 'EMPTY',
    highlights: ['Blank canvas', 'Custom workflow'],
    workspaceType: 'technical',
    mode: 'empty',
  },
  buildHomeWidgets: buildEmptyHomeWidgets,
}
