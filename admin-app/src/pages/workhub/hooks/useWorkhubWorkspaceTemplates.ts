import { useMemo } from 'react'
import {
  buildTaskStatusesForWorkhubWorkspaceTemplate,
  resolveWorkhubWorkspaceTemplate,
  WORKHUB_WORKSPACE_TEMPLATES,
  type WorkhubWorkspaceTemplateId,
} from '../workspaceTemplates'

export function useWorkhubWorkspaceTemplates(selectedTemplateId: WorkhubWorkspaceTemplateId) {
  const selectedTemplate = useMemo(
    () => resolveWorkhubWorkspaceTemplate(selectedTemplateId),
    [selectedTemplateId],
  )

  const initialTaskStatuses = useMemo(
    () => buildTaskStatusesForWorkhubWorkspaceTemplate(selectedTemplate),
    [selectedTemplate],
  )

  return {
    selectedTemplate,
    templates: WORKHUB_WORKSPACE_TEMPLATES,
    initialTaskStatuses,
  }
}
