/**
 * Shared WorkHub route helpers used across features.
 */

export function encodeWorkhubWorkspaceProjectSlugSegment(value: string): string {
  return encodeURIComponent((value || '').trim())
}

export function buildWorkhubWorkspaceProjectPath(workspaceId: string, projectId: string): string {
  const encodedWs = encodeWorkhubWorkspaceProjectSlugSegment(workspaceId)
  const encodedProject = encodeWorkhubWorkspaceProjectSlugSegment(projectId)
  if (!encodedWs) return '/workhub'
  if (!encodedProject) return `/workhub/w/${encodedWs}`
  return `/workhub/w/${encodedWs}/p/${encodedProject}`
}
