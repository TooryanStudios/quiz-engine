import type { WorkhubTaskStatusConfig, WorkhubWorkspace } from '../../../lib/workhubRepo'
import type { WorkhubStatusTemplateId } from '../statusTemplates'
import type { WorkhubHomeWidget, WorkhubHomeWidgetMetrics } from './homeWidgetTypes'

export type WorkhubWorkspaceTemplateId =
  | 'empty'
  | 'projects'
  | 'finance'
  | 'hr'
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

export interface WorkhubWorkspaceTemplateModule {
  definition: WorkhubWorkspaceTemplateDefinition
  buildHomeWidgets: (metrics: WorkhubHomeWidgetMetrics) => WorkhubHomeWidget[]
}

export const DEFAULT_WORKHUB_WORKSPACE_TEMPLATE_ID: WorkhubWorkspaceTemplateId = 'projects'
