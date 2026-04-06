import type { WorkhubHomeWidgetMetrics } from './homeWidgetTypes'
import { asCount, countByStatusKeywords } from './homeWidgetUtils'
import type { WorkhubWorkspaceTemplateModule } from './types'

function buildFinanceHomeWidgets(metrics: WorkhubHomeWidgetMetrics) {
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

export const FINANCE_WORKSPACE_TEMPLATE_MODULE: WorkhubWorkspaceTemplateModule = {
  definition: {
    id: 'finance',
    label: 'Finance workspace',
    description: 'Track receipts, approvals, payment cycles, and financial operations.',
    graphic: 'FIN',
    highlights: ['Approvals', 'Payment cycles'],
    workspaceType: 'finance',
    statusTemplateId: 'workspace_default',
    mode: 'preset',
  },
  buildHomeWidgets: buildFinanceHomeWidgets,
}
