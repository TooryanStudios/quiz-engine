import type { WorkhubProjectPriority, WorkhubProjectType, WorkhubTaskPriority } from '../../lib/workhubRepo'

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

export const PROJECT_COLORS = ['#6d5efc', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6']

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
