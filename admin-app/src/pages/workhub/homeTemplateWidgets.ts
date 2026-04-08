import type { WorkhubWorkspaceTemplateId } from './workspaceTemplates'
import { resolveWorkhubWorkspaceTemplateModule } from './templates/registry'
import type { WorkhubHomeWidget, WorkhubHomeWidgetMetrics } from './templates/homeWidgetTypes'

export type { WorkhubHomeWidget, WorkhubHomeWidgetMetrics, WorkhubHomeWidgetTone } from './templates/homeWidgetTypes'

export function buildWorkhubHomeWidgets(
  templateId: WorkhubWorkspaceTemplateId,
  metrics: WorkhubHomeWidgetMetrics,
): WorkhubHomeWidget[] {
  return resolveWorkhubWorkspaceTemplateModule(templateId).buildHomeWidgets(metrics)
}
