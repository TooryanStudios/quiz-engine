import type { WorkhubTaskStatusConfig } from '../../lib/workhubRepo'

export type WorkhubStatusTemplateId = 'workspace_default' | 'tender_pipeline' | 'delivery_execution' | 'simple_kanban'

export const DEFAULT_TASK_STATUSES: WorkhubTaskStatusConfig[] = [
  { id: 'backlog', label: 'to-do', color: '#6b7280' },
  { id: 'open', label: 'Open', color: '#3b82f6' },
  { id: 'in_progress', label: 'In Progress', color: '#f59e0b' },
  { id: 'review', label: 'Review', color: '#8b5cf6' },
  { id: 'completed', label: 'Completed', color: '#10b981' },
  { id: 'canceled', label: 'Canceled', color: '#ef4444' },
]

export const WORKSPACE_STATUS_TEMPLATE_OPTIONS: Array<{ value: WorkhubStatusTemplateId; label: string; description: string }> = [
  { value: 'workspace_default', label: 'Workspace default', description: 'Recommended set based on workspace type.' },
  { value: 'tender_pipeline', label: 'Tender pipeline', description: 'Stages for bids from qualification to award.' },
  { value: 'delivery_execution', label: 'Delivery execution', description: 'Stages for project execution and handover.' },
  { value: 'simple_kanban', label: 'Simple kanban', description: 'Lean four-step flow for quick teams.' },
]

const STATUS_TEMPLATE_PRESETS: Record<Exclude<WorkhubStatusTemplateId, 'workspace_default'>, WorkhubTaskStatusConfig[]> = {
  tender_pipeline: [
    { id: 'qualified', label: 'Qualified', color: '#64748b' },
    { id: 'proposal_draft', label: 'Proposal Draft', color: '#2563eb' },
    { id: 'submitted', label: 'Submitted', color: '#0ea5e9' },
    { id: 'clarification', label: 'Clarification', color: '#f59e0b' },
    { id: 'negotiation', label: 'Negotiation', color: '#8b5cf6' },
    { id: 'awarded', label: 'Awarded', color: '#10b981' },
    { id: 'lost', label: 'Lost', color: '#ef4444' },
  ],
  delivery_execution: [
    { id: 'kickoff', label: 'Kickoff', color: '#64748b' },
    { id: 'planning', label: 'Planning', color: '#2563eb' },
    { id: 'execution', label: 'Execution', color: '#f59e0b' },
    { id: 'qa_qc', label: 'QA/QC', color: '#8b5cf6' },
    { id: 'handover', label: 'Handover', color: '#0ea5e9' },
    { id: 'closed', label: 'Closed', color: '#10b981' },
    { id: 'blocked', label: 'Blocked', color: '#ef4444' },
  ],
  simple_kanban: [
    { id: 'todo', label: 'To-do', color: '#64748b' },
    { id: 'doing', label: 'Doing', color: '#2563eb' },
    { id: 'done', label: 'Done', color: '#10b981' },
    { id: 'blocked', label: 'Blocked', color: '#ef4444' },
  ],
}

export const cloneDefaultTaskStatuses = () => DEFAULT_TASK_STATUSES.map((status) => ({ ...status }))

export function buildWorkspaceTaskStatuses(
  templateId: WorkhubStatusTemplateId,
  workspaceType: 'technical' | 'hr' | 'finance',
): WorkhubTaskStatusConfig[] {
  if (templateId !== 'workspace_default') {
    return STATUS_TEMPLATE_PRESETS[templateId].map((status) => ({ ...status }))
  }

  if (workspaceType === 'finance') {
    return [
      { id: 'received', label: 'Received', color: '#64748b' },
      { id: 'review', label: 'Review', color: '#2563eb' },
      { id: 'approved', label: 'Approved', color: '#10b981' },
      { id: 'paid', label: 'Paid', color: '#0ea5e9' },
      { id: 'hold', label: 'On Hold', color: '#f59e0b' },
      { id: 'rejected', label: 'Rejected', color: '#ef4444' },
    ]
  }

  if (workspaceType === 'hr') {
    return [
      { id: 'intake', label: 'Intake', color: '#64748b' },
      { id: 'screening', label: 'Screening', color: '#2563eb' },
      { id: 'interview', label: 'Interview', color: '#8b5cf6' },
      { id: 'offer', label: 'Offer', color: '#0ea5e9' },
      { id: 'onboarded', label: 'Onboarded', color: '#10b981' },
      { id: 'closed', label: 'Closed', color: '#ef4444' },
    ]
  }

  return cloneDefaultTaskStatuses()
}
