import type { WorkhubHomeWidget, WorkhubHomeWidgetMetrics } from './homeWidgetTypes'
import { asCount, countByStatusKeywords } from './homeWidgetUtils'
import type { WorkhubWorkspaceTemplateModule } from './types'

function buildMarketingHomeWidgets(metrics: WorkhubHomeWidgetMetrics): WorkhubHomeWidget[] {
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

export const MARKETING_WORKSPACE_TEMPLATE_MODULE: WorkhubWorkspaceTemplateModule = {
  definition: {
    id: 'marketing',
    label: 'Marketing workspace',
    description: 'Plan campaigns, content production, review cycles, and publishing timelines.',
    graphic: 'MKT',
    highlights: ['Campaign planning', 'Content cadence'],
    workspaceType: 'technical',
    taskStatuses: [
      { id: 'planning', label: 'Planning', color: '#64748b' },
      { id: 'production', label: 'Production', color: '#2563eb' },
      { id: 'review', label: 'Review', color: '#8b5cf6' },
      { id: 'scheduled', label: 'Scheduled', color: '#0ea5e9' },
      { id: 'published', label: 'Published', color: '#10b981' },
      { id: 'on_hold', label: 'On Hold', color: '#f59e0b' },
      { id: 'canceled', label: 'Canceled', color: '#ef4444' },
    ],
    mode: 'preset',
  },
  buildHomeWidgets: buildMarketingHomeWidgets,
}
