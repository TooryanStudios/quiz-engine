import type { WorkhubTaskStatusConfig, WorkhubWorkspace } from '../../lib/workhubRepo'
import { buildWorkspaceTaskStatuses, type WorkhubStatusTemplateId } from './statusTemplates'

export type WorkhubWorkspaceTemplateId =
  | 'empty'
  | 'projects'
  | 'finance'
  | 'marketing'
  | 'proposals_leads'

export interface WorkhubWorkspaceTemplateOption {
  value: WorkhubWorkspaceTemplateId
  label: string
  description: string
}

export interface WorkhubWorkspaceTemplateDefinition {
  id: WorkhubWorkspaceTemplateId
  label: string
  description: string
  graphic: string
  highlights: string[]
  workspaceType: WorkhubWorkspace['type']
  statusTemplateId?: WorkhubStatusTemplateId
  taskStatuses?: WorkhubTaskStatusConfig[]
  mode: 'empty' | 'preset'
}

export const DEFAULT_WORKHUB_WORKSPACE_TEMPLATE_ID: WorkhubWorkspaceTemplateId = 'projects'

// Add/remove templates by editing this array only.
export const WORKHUB_WORKSPACE_TEMPLATES: WorkhubWorkspaceTemplateDefinition[] = [
  {
    id: 'empty',
    label: 'Empty workspace',
    description: 'Start from a clean workspace and customize everything manually.',
    graphic: 'EMPTY',
    highlights: ['Blank canvas', 'Custom workflow'],
    workspaceType: 'technical',
    mode: 'empty',
  },
  {
    id: 'projects',
    label: 'Projects workspace',
    description: 'Standard project execution flow with tasks, sub-projects, and delivery tracking.',
    graphic: 'PROJ',
    highlights: ['Delivery pipeline', 'Cross-team execution'],
    workspaceType: 'technical',
    statusTemplateId: 'workspace_default',
    mode: 'preset',
  },
  {
    id: 'finance',
    label: 'Finance workspace',
    description: 'Track receipts, approvals, payment cycles, and financial operations.',
    graphic: 'FIN',
    highlights: ['Approvals', 'Payment cycles'],
    workspaceType: 'finance',
    statusTemplateId: 'workspace_default',
    mode: 'preset',
  },
  {
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
  {
    id: 'proposals_leads',
    label: 'Proposals & leads workspace',
    description: 'Manage lead pipeline, proposal drafting, negotiations, and win/loss outcomes.',
    graphic: 'LEAD',
    highlights: ['Lead funnel', 'Win/loss tracking'],
    workspaceType: 'technical',
    taskStatuses: [
      { id: 'new_lead', label: 'New lead', color: '#64748b' },
      { id: 'qualified', label: 'Qualified', color: '#2563eb' },
      { id: 'proposal_draft', label: 'Proposal Draft', color: '#0ea5e9' },
      { id: 'submitted', label: 'Submitted', color: '#8b5cf6' },
      { id: 'negotiation', label: 'Negotiation', color: '#f59e0b' },
      { id: 'won', label: 'Won', color: '#10b981' },
      { id: 'lost', label: 'Lost', color: '#ef4444' },
    ],
    mode: 'preset',
  },
]

export const WORKHUB_WORKSPACE_TEMPLATE_OPTIONS: WorkhubWorkspaceTemplateOption[] = WORKHUB_WORKSPACE_TEMPLATES.map((template) => ({
  value: template.id,
  label: template.label,
  description: template.description,
}))

export function isWorkhubWorkspaceTemplateId(value: string): value is WorkhubWorkspaceTemplateId {
  return WORKHUB_WORKSPACE_TEMPLATES.some((template) => template.id === value)
}

export function resolveWorkhubWorkspaceTemplateIdForWorkspace(
  workspace: Pick<WorkhubWorkspace, 'type' | 'templateId'> | null | undefined,
): WorkhubWorkspaceTemplateId {
  if (workspace?.templateId && isWorkhubWorkspaceTemplateId(workspace.templateId)) {
    return workspace.templateId
  }
  if (workspace?.type === 'finance') {
    return 'finance'
  }
  return DEFAULT_WORKHUB_WORKSPACE_TEMPLATE_ID
}

export function resolveWorkhubWorkspaceTemplate(templateId: WorkhubWorkspaceTemplateId): WorkhubWorkspaceTemplateDefinition {
  return WORKHUB_WORKSPACE_TEMPLATES.find((template) => template.id === templateId)
    || WORKHUB_WORKSPACE_TEMPLATES.find((template) => template.id === DEFAULT_WORKHUB_WORKSPACE_TEMPLATE_ID)
    || WORKHUB_WORKSPACE_TEMPLATES[0]
}

export function buildTaskStatusesForWorkhubWorkspaceTemplate(template: WorkhubWorkspaceTemplateDefinition): WorkhubTaskStatusConfig[] {
  if (template.mode === 'empty') return []
  if (template.taskStatuses && template.taskStatuses.length > 0) {
    return template.taskStatuses.map((status) => ({ ...status }))
  }
  return buildWorkspaceTaskStatuses(template.statusTemplateId || 'workspace_default', template.workspaceType)
}
