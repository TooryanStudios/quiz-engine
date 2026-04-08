import { EMPTY_WORKSPACE_TEMPLATE_MODULE } from './emptyTemplate'
import { FINANCE_WORKSPACE_TEMPLATE_MODULE } from './financeTemplate'
import { HR_WORKSPACE_TEMPLATE_MODULE } from './hrTemplate'
import { MARKETING_WORKSPACE_TEMPLATE_MODULE } from './marketingTemplate'
import { PROJECTS_WORKSPACE_TEMPLATE_MODULE } from './projectsTemplate'
import { PROPOSALS_LEADS_WORKSPACE_TEMPLATE_MODULE } from './proposalsLeadsTemplate'
import {
  type WorkhubWorkspaceTemplateId,
  type WorkhubWorkspaceTemplateModule,
} from './types'

export const WORKHUB_WORKSPACE_TEMPLATE_MODULES: WorkhubWorkspaceTemplateModule[] = [
  EMPTY_WORKSPACE_TEMPLATE_MODULE,
  PROJECTS_WORKSPACE_TEMPLATE_MODULE,
  FINANCE_WORKSPACE_TEMPLATE_MODULE,
  HR_WORKSPACE_TEMPLATE_MODULE,
  MARKETING_WORKSPACE_TEMPLATE_MODULE,
  PROPOSALS_LEADS_WORKSPACE_TEMPLATE_MODULE,
]

const WORKHUB_WORKSPACE_TEMPLATE_MODULES_BY_ID = new Map<WorkhubWorkspaceTemplateId, WorkhubWorkspaceTemplateModule>(
  WORKHUB_WORKSPACE_TEMPLATE_MODULES.map((module) => [module.definition.id, module]),
)

export function resolveWorkhubWorkspaceTemplateModule(templateId: WorkhubWorkspaceTemplateId): WorkhubWorkspaceTemplateModule {
  const module = WORKHUB_WORKSPACE_TEMPLATE_MODULES_BY_ID.get(templateId)
  if (module) return module
  throw new Error(`Unknown WorkHub workspace template module: ${templateId}`)
}
