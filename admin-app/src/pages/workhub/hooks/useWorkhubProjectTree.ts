import { useMemo } from 'react'
import type { WorkhubProject } from '../../../lib/workhubRepo'
import { buildProjectTree, flattenProjectTree } from '../projectUtils'

interface UseWorkhubProjectTreeParams {
  visibleWorkspaceProjects: WorkhubProject[]
  expandedProjectIds: string[]
  selectedProjectId: string
  selectedProjectDeadlineDraft: string
  selectedProjectSubmissionTimeDraft: string
}

export function useWorkhubProjectTree({
  visibleWorkspaceProjects,
  expandedProjectIds,
  selectedProjectId,
  selectedProjectDeadlineDraft,
  selectedProjectSubmissionTimeDraft,
}: UseWorkhubProjectTreeParams) {
  const visibleProjectById = useMemo(
    () => Object.fromEntries(visibleWorkspaceProjects.map((item) => [item.id, item])) as Record<string, WorkhubProject>,
    [visibleWorkspaceProjects],
  )

  const visibleProjectsByParent = useMemo(() => {
    const map = new Map<string, WorkhubProject[]>()
    visibleWorkspaceProjects.forEach((item) => {
      const key = item.parentProjectId || ''
      const bucket = map.get(key) || []
      bucket.push(item)
      map.set(key, bucket)
    })
    return map
  }, [visibleWorkspaceProjects])

  const visibleProjectTree = useMemo(() => buildProjectTree(visibleWorkspaceProjects), [visibleWorkspaceProjects])

  const defaultCollapsedClosedRootIds = useMemo(
    () => visibleProjectTree
      .filter((node) => /closed/i.test((node.name || '').trim()))
      .map((node) => node.id),
    [visibleProjectTree],
  )

  const collapsedClosedRootIdSet = useMemo(
    () => new Set(defaultCollapsedClosedRootIds.filter((id) => !expandedProjectIds.includes(id))),
    [defaultCollapsedClosedRootIds, expandedProjectIds],
  )

  const liveProjectTree = useMemo(() => {
    const activeProject = selectedProjectId && selectedProjectId !== 'all'
      ? (visibleProjectById[selectedProjectId] || null)
      : null
    const hasDraftDeadline = !!activeProject && selectedProjectDeadlineDraft !== (activeProject.projectDeadline || '')
    const hasDraftTime = !!activeProject && selectedProjectSubmissionTimeDraft !== (activeProject.submissionTime || '')
    if (!hasDraftDeadline && !hasDraftTime) {
      if (collapsedClosedRootIdSet.size === 0) return visibleProjectTree
      return buildProjectTree(visibleWorkspaceProjects, collapsedClosedRootIdSet)
    }
    const patched = visibleWorkspaceProjects.map((project) => {
      if (project.id !== selectedProjectId) return project
      return {
        ...project,
        ...(hasDraftDeadline ? { projectDeadline: selectedProjectDeadlineDraft } : {}),
        ...(hasDraftTime ? { submissionTime: selectedProjectSubmissionTimeDraft } : {}),
      }
    })
    return buildProjectTree(patched, collapsedClosedRootIdSet)
  }, [collapsedClosedRootIdSet, visibleProjectTree, visibleWorkspaceProjects, visibleProjectById, selectedProjectId, selectedProjectDeadlineDraft, selectedProjectSubmissionTimeDraft])

  const flatVisibleProjectOptions = useMemo(() => flattenProjectTree(visibleProjectTree), [visibleProjectTree])

  const visibleProjectIds = useMemo(
    () => new Set(visibleWorkspaceProjects.map((item) => item.id)),
    [visibleWorkspaceProjects],
  )

  const selectedProject = useMemo(
    () => visibleProjectById[selectedProjectId] || null,
    [selectedProjectId, visibleProjectById],
  )

  return {
    visibleProjectById,
    visibleProjectsByParent,
    visibleProjectTree,
    defaultCollapsedClosedRootIds,
    collapsedClosedRootIdSet,
    liveProjectTree,
    flatVisibleProjectOptions,
    visibleProjectIds,
    selectedProject,
  }
}
