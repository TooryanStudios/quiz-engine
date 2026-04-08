import type { WorkhubHomeWidget, WorkhubHomeWidgetMetrics } from './homeWidgetTypes'
import { asCount, asPercent, countByStatusKeywords } from './homeWidgetUtils'
import type { WorkhubWorkspaceTemplateModule } from './types'

function buildFinanceHomeWidgets(metrics: WorkhubHomeWidgetMetrics): WorkhubHomeWidget[] {
  const invoiceIntakeQueue = countByStatusKeywords(metrics, ['invoice_received', 'invoice_review', 'budget_check'])
  const approvalQueue = countByStatusKeywords(metrics, ['approval_pending', 'approval', 'hold'])
  const scheduledPayments = countByStatusKeywords(metrics, ['scheduled_payment', 'payment'])
  const settledItems = countByStatusKeywords(metrics, ['paid', 'reconciliation', 'reconciled', 'closed'])
  const disputeQueue = countByStatusKeywords(metrics, ['dispute', 'rejected', 'blocked'])
  const paymentReliability = asPercent((settledItems / Math.max(1, settledItems + disputeQueue + approvalQueue)) * 100)

  return [
    {
      id: 'finance-invoice-intake',
      title: 'Invoice intake',
      value: asCount(invoiceIntakeQueue),
      detail: 'Invoices waiting for review and budget checks.',
      tone: invoiceIntakeQueue > 0 ? 'warn' : 'good',
    },
    {
      id: 'finance-approvals',
      title: 'Approval backlog',
      value: asCount(approvalQueue),
      detail: 'Items pending approver signoff or hold release.',
      tone: approvalQueue > 0 ? 'warn' : 'good',
    },
    {
      id: 'finance-payment-run',
      title: 'Payment run queue',
      value: asCount(scheduledPayments),
      detail: 'Payments scheduled for release in current cycles.',
      tone: scheduledPayments > 0 ? 'neutral' : 'good',
    },
    {
      id: 'finance-settled',
      title: 'Settled items',
      value: asCount(settledItems),
      detail: 'Invoices marked paid or reconciled in this workspace.',
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
      id: 'finance-payment-reliability',
      title: 'Payment reliability',
      value: paymentReliability,
      detail: 'Share of settled invoices across approval and dispute flow.',
      tone: settledItems >= disputeQueue ? 'good' : 'warn',
    },
  ]
}

export const FINANCE_WORKSPACE_TEMPLATE_MODULE: WorkhubWorkspaceTemplateModule = {
  definition: {
    id: 'finance',
    label: 'Finance workspace',
    description: 'Track invoices, approvals, payment runs, reconciliation, and cashflow control.',
    graphic: 'FIN',
    highlights: ['Invoice lifecycle', 'Cashflow visibility', 'Payment controls'],
    workspaceType: 'finance',
    taskStatuses: [
      { id: 'invoice_received', label: 'Invoice Received', color: '#64748b' },
      { id: 'invoice_review', label: 'Invoice Review', color: '#2563eb' },
      { id: 'budget_check', label: 'Budget Check', color: '#0ea5e9' },
      { id: 'approval_pending', label: 'Approval Pending', color: '#8b5cf6' },
      { id: 'scheduled_payment', label: 'Scheduled Payment', color: '#f59e0b' },
      { id: 'paid', label: 'Paid', color: '#10b981' },
      { id: 'reconciliation', label: 'Reconciliation', color: '#14b8a6' },
      { id: 'disputed', label: 'Disputed', color: '#ef4444' },
    ],
    mode: 'preset',
  },
  buildHomeWidgets: buildFinanceHomeWidgets,
}
