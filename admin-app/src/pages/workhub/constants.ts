import type { WorkhubProjectPriority, WorkhubProjectType, WorkhubTaskPriority } from '../../lib/workhubRepo'
import type { WorkhubWorkspaceTemplateId } from './workspaceTemplates'

export const PRIORITY_LABELS: Record<WorkhubTaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
}

export const getPriorityIcon = (priority: WorkhubTaskPriority) => {
  switch (priority) {
    case 'urgent': return '🚩'
    case 'high': return '⚡'
    case 'medium': return '📌'
    case 'low': return '📎'
    default: return '📎'
  }
}

export const getTaskStatusIcon = (statusId: string) => {
  const normalized = statusId.toLowerCase()
  if (normalized.includes('backlog')) return '🕒'
  if (normalized.includes('open')) return '📂'
  if (normalized.includes('progress')) return '⚙️'
  if (normalized.includes('review')) return '👁️'
  if (normalized.includes('complete') || normalized.includes('done')) return '✅'
  if (normalized.includes('cancel')) return '⛔'
  return '•'
}

export const PROJECT_COLORS = ['#6d5efc', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6', '#64748b']

export interface WorkhubProjectColorMeaning {
  color: string
  label: string
  hint: string
}

const PROJECT_COLOR_MEANINGS_BY_TEMPLATE: Record<WorkhubWorkspaceTemplateId, WorkhubProjectColorMeaning[]> = {
  projects: [
    { color: '#6d5efc', label: 'Approved', hint: 'Approved and queued for kickoff.' },
    { color: '#10b981', label: 'Running', hint: 'Active delivery is underway.' },
    { color: '#f59e0b', label: 'In progress', hint: 'Work is moving through execution milestones.' },
    { color: '#ef4444', label: 'Blocked', hint: 'Blocked and waiting on a dependency or decision.' },
    { color: '#06b6d4', label: 'Submitted', hint: 'Submitted to stakeholders for confirmation.' },
    { color: '#8b5cf6', label: 'Review', hint: 'Under internal review and feedback.' },
    { color: '#64748b', label: 'Completed', hint: 'Completed and formally closed.' },
  ],
  proposals_leads: [
    { color: '#6d5efc', label: 'Approved', hint: 'Approved to proceed with pursuit.' },
    { color: '#10b981', label: 'Awarded', hint: 'Awarded by the client.' },
    { color: '#f59e0b', label: 'Proposal in progress', hint: 'Proposal drafting and pricing are in progress.' },
    { color: '#ef4444', label: 'Lost / dropped', hint: 'Opportunity was lost or withdrawn.' },
    { color: '#06b6d4', label: 'Submitted', hint: 'Submitted to the client and awaiting response.' },
    { color: '#8b5cf6', label: 'Running', hint: 'Active client engagement and follow-up.' },
    { color: '#64748b', label: 'Closed', hint: 'Opportunity closed and archived.' },
  ],
  finance: [
    { color: '#6d5efc', label: 'Approved', hint: 'Approved by finance for release.' },
    { color: '#10b981', label: 'Running', hint: 'Payment operation is currently running.' },
    { color: '#f59e0b', label: 'Pending approval', hint: 'Waiting for required finance approval.' },
    { color: '#ef4444', label: 'Overdue', hint: 'Past due date or blocked from release.' },
    { color: '#06b6d4', label: 'Submitted', hint: 'Submitted for posting or payment processing.' },
    { color: '#8b5cf6', label: 'Review', hint: 'Under compliance or controller review.' },
    { color: '#64748b', label: 'Reconciled', hint: 'Posted, settled, and reconciled in ledger.' },
  ],
  marketing: [
    { color: '#6d5efc', label: 'Approved', hint: 'Approved for launch.' },
    { color: '#10b981', label: 'Running', hint: 'Campaign is live and actively running.' },
    { color: '#f59e0b', label: 'Production', hint: 'Assets and content are in production.' },
    { color: '#ef4444', label: 'Blocked', hint: 'Blocked by dependencies, approvals, or budget.' },
    { color: '#06b6d4', label: 'Submitted', hint: 'Submitted for final approval or publishing.' },
    { color: '#8b5cf6', label: 'Review', hint: 'Creative is under review.' },
    { color: '#64748b', label: 'Completed', hint: 'Campaign completed and archived.' },
  ],
  hr: [
    { color: '#6d5efc', label: 'Approved', hint: 'Requisition or headcount approved.' },
    { color: '#10b981', label: 'Running', hint: 'Hiring or onboarding workflow is active.' },
    { color: '#f59e0b', label: 'Interviewing', hint: 'Candidates are in interview stages.' },
    { color: '#ef4444', label: 'Blocked', hint: 'Process is stalled and needs intervention.' },
    { color: '#06b6d4', label: 'Submitted', hint: 'Offer or onboarding package submitted for approval.' },
    { color: '#8b5cf6', label: 'Review', hint: 'Candidate profile or onboarding plan under review.' },
    { color: '#64748b', label: 'Filled', hint: 'Role is filled and officially closed.' },
  ],
  empty: [
    { color: '#6d5efc', label: 'Approved', hint: 'Approved to proceed.' },
    { color: '#10b981', label: 'Running', hint: 'Currently active and running.' },
    { color: '#f59e0b', label: 'In progress', hint: 'Work is actively in progress.' },
    { color: '#ef4444', label: 'Blocked', hint: 'Blocked and awaiting intervention.' },
    { color: '#06b6d4', label: 'Submitted', hint: 'Submitted for review or approval.' },
    { color: '#8b5cf6', label: 'Review', hint: 'Under review.' },
    { color: '#64748b', label: 'Completed', hint: 'Completed and archived.' },
  ],
}

function normalizeColor(value: string): string {
  return value.trim().toLowerCase()
}

function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value.trim())
}

function normalizeMeaningText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function resolveProjectColorMeanings(
  templateId: WorkhubWorkspaceTemplateId,
  overrides?: Array<Partial<WorkhubProjectColorMeaning> | null | undefined>,
): WorkhubProjectColorMeaning[] {
  const defaults = PROJECT_COLOR_MEANINGS_BY_TEMPLATE[templateId] || PROJECT_COLOR_MEANINGS_BY_TEMPLATE.projects
  const safeOverrides = Array.isArray(overrides) ? overrides : []

  return defaults.map((fallback, index) => {
    const override = safeOverrides[index]
    if (!override) return { ...fallback }

    const nextColor = typeof override.color === 'string' && isHexColor(override.color)
      ? normalizeColor(override.color)
      : fallback.color
    const nextLabel = normalizeMeaningText(override.label) || fallback.label
    const nextHint = normalizeMeaningText(override.hint) || fallback.hint

    return {
      color: nextColor,
      label: nextLabel,
      hint: nextHint,
    }
  })
}

export function resolveProjectColorMeaning(
  templateId: WorkhubWorkspaceTemplateId,
  color: string,
  overrides?: Array<Partial<WorkhubProjectColorMeaning> | null | undefined>,
): WorkhubProjectColorMeaning {
  const normalized = normalizeColor(color)
  const match = resolveProjectColorMeanings(templateId, overrides).find((item) => normalizeColor(item.color) === normalized)
  if (match) return match
  return {
    color,
    label: 'Custom color',
    hint: `Custom meaning (${color.toUpperCase()}).`,
  }
}

export const PROJECT_TYPE_OPTIONS: Array<{ value: WorkhubProjectType; label: string }> = [
  { value: 'tender', label: 'Tender' },
  { value: 'lead', label: 'Lead' },
  { value: 'direct_award', label: 'Direct award' },
  { value: 'other', label: 'Other' },
]

export const PROJECT_PRIORITY_OPTIONS: Array<{ value: WorkhubProjectPriority; label: string; color: string }> = [
  { value: 'critical', label: 'Critical', color: '#dc2626' },
  { value: 'high', label: 'High', color: '#ea580c' },
  { value: 'medium', label: 'Medium', color: '#2563eb' },
  { value: 'low', label: 'Low', color: '#64748b' },
]

export const PROJECT_PRIORITY_RANK: Record<WorkhubProjectPriority, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
}
