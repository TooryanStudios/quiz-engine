import type { WorkhubTaskStatusConfig, WorkhubWorkspace } from '../../lib/workhubRepo'
import { buildWorkspaceTaskStatuses } from './statusTemplates'
import { WORKHUB_WORKSPACE_TEMPLATE_MODULES, resolveWorkhubWorkspaceTemplateModule } from './templates/registry'
import {
  DEFAULT_WORKHUB_WORKSPACE_TEMPLATE_ID,
  type WorkhubWorkspaceTemplateDefinition,
  type WorkhubWorkspaceTemplateId,
  type WorkhubWorkspaceTemplateOption,
} from './templates/types'

export type {
  WorkhubWorkspaceTemplateDefinition,
  WorkhubWorkspaceTemplateId,
  WorkhubWorkspaceTemplateModule,
  WorkhubWorkspaceTemplateOption,
} from './templates/types'
export { DEFAULT_WORKHUB_WORKSPACE_TEMPLATE_ID } from './templates/types'

// Add/remove templates by editing the per-template modules and registry.
export const WORKHUB_WORKSPACE_TEMPLATES: WorkhubWorkspaceTemplateDefinition[] = WORKHUB_WORKSPACE_TEMPLATE_MODULES
  .map((module) => module.definition)

export const WORKHUB_WORKSPACE_TEMPLATE_OPTIONS: WorkhubWorkspaceTemplateOption[] = WORKHUB_WORKSPACE_TEMPLATES.map((template) => ({
  value: template.id,
  label: template.label,
  description: template.description,
}))

export function isWorkhubWorkspaceTemplateId(value: string): value is WorkhubWorkspaceTemplateId {
  return WORKHUB_WORKSPACE_TEMPLATES.some((template) => template.id === value)
}

export interface WorkhubWorkspaceTemplateDeprecationRule {
  legacyTemplateId: string
  replacementTemplateId: WorkhubWorkspaceTemplateId
  reason: string
}

export const WORKHUB_WORKSPACE_TEMPLATE_DEPRECATION_RULES: ReadonlyArray<WorkhubWorkspaceTemplateDeprecationRule> = [
  {
    legacyTemplateId: 'legacy_hr',
    replacementTemplateId: 'hr',
    reason: 'Legacy HR template has been replaced by the HR KPI workspace template.',
  },
]

export type WorkhubWorkspaceTemplateResolutionSource =
  | 'explicit'
  | 'workspace_type_fallback'
  | 'default_fallback'
  | 'deprecated_replacement'
  | 'missing_template'

export interface WorkhubWorkspaceTemplateResolution {
  templateId: WorkhubWorkspaceTemplateId
  template: WorkhubWorkspaceTemplateDefinition
  source: WorkhubWorkspaceTemplateResolutionSource
  requestedTemplateId?: string
  warning?: string
}

export interface WorkhubWorkspaceTemplateDeletionGuard {
  templateId: WorkhubWorkspaceTemplateId
  canDelete: boolean
  blockingWorkspaceIds: string[]
  reason: string | null
}

export interface WorkhubWorkspaceTemplateMigrationPlanItem {
  workspaceId: string
  fromTemplateId: string
  toTemplateId: WorkhubWorkspaceTemplateId
  reason: string
}

function resolveFallbackTemplateIdForWorkspaceType(workspaceType: WorkhubWorkspace['type'] | undefined): WorkhubWorkspaceTemplateId {
  if (workspaceType === 'finance') return 'finance'
  if (workspaceType === 'hr') return 'hr'
  return DEFAULT_WORKHUB_WORKSPACE_TEMPLATE_ID
}

function findTemplateDeprecationRule(templateId: string): WorkhubWorkspaceTemplateDeprecationRule | null {
  const normalized = templateId.trim().toLowerCase()
  return WORKHUB_WORKSPACE_TEMPLATE_DEPRECATION_RULES.find(
    (rule) => rule.legacyTemplateId.trim().toLowerCase() === normalized,
  ) || null
}

export function resolveWorkhubWorkspaceTemplateForWorkspace(
  workspace: Pick<WorkhubWorkspace, 'type' | 'templateId'> | null | undefined,
): WorkhubWorkspaceTemplateResolution {
  if (workspace?.templateId) {
    if (isWorkhubWorkspaceTemplateId(workspace.templateId)) {
      const template = resolveWorkhubWorkspaceTemplate(workspace.templateId)
      return {
        templateId: workspace.templateId,
        template,
        source: 'explicit',
      }
    }

    const deprecationRule = findTemplateDeprecationRule(workspace.templateId)
    if (deprecationRule) {
      const template = resolveWorkhubWorkspaceTemplate(deprecationRule.replacementTemplateId)
      return {
        templateId: deprecationRule.replacementTemplateId,
        template,
        source: 'deprecated_replacement',
        requestedTemplateId: workspace.templateId,
        warning: `Template "${workspace.templateId}" is deprecated. ${deprecationRule.reason} This workspace now targets "${template.label}".`,
      }
    }

    const fallbackTemplateId = resolveFallbackTemplateIdForWorkspaceType(workspace.type)
    const template = resolveWorkhubWorkspaceTemplate(fallbackTemplateId)
    return {
      templateId: fallbackTemplateId,
      template,
      source: 'missing_template',
      requestedTemplateId: workspace.templateId,
      warning: `Template "${workspace.templateId}" is not available. Reassign this workspace to an active template to avoid behavior drift.`,
    }
  }

  const fallbackTemplateId = resolveFallbackTemplateIdForWorkspaceType(workspace?.type)
  const template = resolveWorkhubWorkspaceTemplate(fallbackTemplateId)
  const source: WorkhubWorkspaceTemplateResolutionSource = workspace?.type && workspace.type !== 'technical'
    ? 'workspace_type_fallback'
    : 'default_fallback'

  return {
    templateId: fallbackTemplateId,
    template,
    source,
  }
}

export function resolveWorkhubWorkspaceTemplateIdForWorkspace(
  workspace: Pick<WorkhubWorkspace, 'type' | 'templateId'> | null | undefined,
): WorkhubWorkspaceTemplateId {
  return resolveWorkhubWorkspaceTemplateForWorkspace(workspace).templateId
}

export function resolveWorkhubWorkspaceTemplate(templateId: WorkhubWorkspaceTemplateId): WorkhubWorkspaceTemplateDefinition {
  return resolveWorkhubWorkspaceTemplateModule(templateId).definition
}

export function resolveWorkhubWorkspaceTemplateIcon(templateId: WorkhubWorkspaceTemplateId): string {
  switch (templateId) {
    case 'proposals_leads':
      return '🧾'
    case 'finance':
      return '💸'
    case 'marketing':
      return '📣'
    case 'hr':
      return '👥'
    case 'empty':
      return '🧩'
    case 'projects':
    default:
      return '📁'
  }
}

export function buildWorkhubWorkspaceTemplateDeletionGuard(
  templateId: WorkhubWorkspaceTemplateId,
  workspaces: Array<Pick<WorkhubWorkspace, 'id' | 'templateId'> | null | undefined>,
): WorkhubWorkspaceTemplateDeletionGuard {
  const blockingWorkspaceIds = workspaces
    .filter((workspace): workspace is Pick<WorkhubWorkspace, 'id' | 'templateId'> => Boolean(workspace?.id))
    .filter((workspace) => workspace.templateId === templateId)
    .map((workspace) => workspace.id)

  if (templateId === DEFAULT_WORKHUB_WORKSPACE_TEMPLATE_ID) {
    return {
      templateId,
      canDelete: false,
      blockingWorkspaceIds,
      reason: 'The default template cannot be removed because it is used as the system fallback.',
    }
  }

  if (blockingWorkspaceIds.length > 0) {
    return {
      templateId,
      canDelete: false,
      blockingWorkspaceIds,
      reason: `Template is still referenced by ${blockingWorkspaceIds.length} workspace(s).`,
    }
  }

  return {
    templateId,
    canDelete: true,
    blockingWorkspaceIds,
    reason: null,
  }
}

export function buildWorkhubWorkspaceTemplateMigrationPlan(
  workspaces: Array<Pick<WorkhubWorkspace, 'id' | 'templateId'> | null | undefined>,
): WorkhubWorkspaceTemplateMigrationPlanItem[] {
  return workspaces.flatMap((workspace) => {
    if (!workspace?.id || !workspace.templateId) return []
    const deprecationRule = findTemplateDeprecationRule(workspace.templateId)
    if (!deprecationRule) return []
    return [{
      workspaceId: workspace.id,
      fromTemplateId: workspace.templateId,
      toTemplateId: deprecationRule.replacementTemplateId,
      reason: deprecationRule.reason,
    }]
  })
}

export function buildTaskStatusesForWorkhubWorkspaceTemplate(template: WorkhubWorkspaceTemplateDefinition): WorkhubTaskStatusConfig[] {
  if (template.mode === 'empty') return []
  if (template.taskStatuses && template.taskStatuses.length > 0) {
    return template.taskStatuses.map((status) => ({ ...status }))
  }
  return buildWorkspaceTaskStatuses(template.statusTemplateId || 'workspace_default', template.workspaceType)
}
