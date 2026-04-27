import { useCallback, useMemo } from 'react'
import type { WorkhubProject, WorkhubProjectIntent, WorkhubProjectType, WorkhubWorkspace } from '../../../lib/workhubRepo'
import {
  PROJECT_TYPE_OPTIONS,
  type WorkhubProjectColorMeaning,
} from '../constants'
import {
  WORKHUB_INTENT_ALLOWED_PROJECT_TYPES,
  buildProjectDescriptionFromIntentDrafts,
  resolveEffectiveProjectIntent,
} from '../projectUtils'
import {
  getTemplateCreationIntentMeta,
} from '../templateCreationMeta'
import { formatProjectDeadlineDate } from '../taskUtils'
import type { WorkhubWorkspaceTemplateId } from '../workspaceTemplates'

interface UseWorkhubSelectedProjectContextParams {
  selectedProject: WorkhubProject | null
  currentUid: string
  visibleProjectById: Record<string, WorkhubProject>
  visibleProjectsByParent: Map<string, WorkhubProject[]>
  visibleWorkspaceProjects: WorkhubProject[]
  flatVisibleProjectOptions: Array<{ id: string; name: string; depth: number }>
  workspaceByIdForFiltering: Record<string, WorkhubWorkspace>
  selectedWorkspaceTemplateIntentSet: Set<WorkhubProjectIntent>
  selectedWorkspaceTemplateId: WorkhubWorkspaceTemplateId
  selectedProjectColorDraft: string
  selectedProjectNarrativeDraft: string
  selectedProjectIntentDetailDrafts: Record<string, string>
  selectedProjectTypeDraft: WorkhubProjectType | ''
  selectedWorkspaceProjectColorMeanings: WorkhubProjectColorMeaning[]
}

export function useWorkhubSelectedProjectContext({
  selectedProject,
  currentUid,
  visibleProjectById,
  visibleProjectsByParent,
  visibleWorkspaceProjects,
  flatVisibleProjectOptions,
  workspaceByIdForFiltering,
  selectedWorkspaceTemplateIntentSet,
  selectedWorkspaceTemplateId,
  selectedProjectColorDraft,
  selectedProjectNarrativeDraft,
  selectedProjectIntentDetailDrafts,
  selectedProjectTypeDraft,
  selectedWorkspaceProjectColorMeanings,
}: UseWorkhubSelectedProjectContextParams) {
  const selectedProjectEffectiveIntent = useMemo<WorkhubProjectIntent>(() => {
    if (!selectedProject) return 'project'
    return resolveEffectiveProjectIntent(selectedProject, workspaceByIdForFiltering, selectedWorkspaceTemplateIntentSet)
  }, [selectedProject, selectedWorkspaceTemplateIntentSet, workspaceByIdForFiltering])

  const projectIntentById = useMemo(() => {
    const map: Record<string, WorkhubProjectIntent> = {}
    visibleWorkspaceProjects.forEach((item) => {
      map[item.id] = resolveEffectiveProjectIntent(item, workspaceByIdForFiltering, selectedWorkspaceTemplateIntentSet)
    })
    return map
  }, [selectedWorkspaceTemplateIntentSet, visibleWorkspaceProjects, workspaceByIdForFiltering])

  const projectIntentMetaById = useMemo(() => {
    const map: Record<string, ReturnType<typeof getTemplateCreationIntentMeta>> = {}
    Object.entries(projectIntentById).forEach(([projectId, effectiveIntent]) => {
      map[projectId] = getTemplateCreationIntentMeta(effectiveIntent, selectedWorkspaceTemplateId)
    })
    return map
  }, [projectIntentById, selectedWorkspaceTemplateId])

  const projectIntentIconById = useMemo(
    () => Object.fromEntries(Object.entries(projectIntentMetaById).map(([projectId, meta]) => [projectId, meta.icon])) as Record<string, string>,
    [projectIntentMetaById],
  )

  const projectSelectorIconById = useMemo(
    () => Object.fromEntries(visibleWorkspaceProjects.map((item) => {
      const effectiveIntent = projectIntentById[item.id] || 'project'
      const icon = effectiveIntent === 'project' ? '📁' : (projectIntentMetaById[item.id]?.icon || '📁')
      return [item.id, icon]
    })) as Record<string, string>,
    [projectIntentById, projectIntentMetaById, visibleWorkspaceProjects],
  )

  const selectedProjectIntentMeta = useMemo(
    () => (selectedProject
      ? (projectIntentMetaById[selectedProject.id] || getTemplateCreationIntentMeta(selectedProjectEffectiveIntent, selectedWorkspaceTemplateId))
      : getTemplateCreationIntentMeta(selectedProjectEffectiveIntent, selectedWorkspaceTemplateId)),
    [projectIntentMetaById, selectedProject, selectedProjectEffectiveIntent, selectedWorkspaceTemplateId],
  )

  const selectedProjectLineage = useMemo(() => {
    if (!selectedProject) return [] as WorkhubProject[]
    const lineage: WorkhubProject[] = []
    const visited = new Set<string>()
    let current: WorkhubProject | null = selectedProject
    while (current && !visited.has(current.id)) {
      lineage.unshift(current)
      visited.add(current.id)
      const parentId: string = current.parentProjectId || ''
      current = parentId ? (visibleProjectById[parentId] || null) : null
    }
    return lineage
  }, [selectedProject, visibleProjectById])

  const taskContextTrail = useMemo(
    () => selectedProjectLineage.slice(-3),
    [selectedProjectLineage],
  )

  const quickTaskViewTargetProject = useMemo(() => {
    for (let index = selectedProjectLineage.length - 1; index >= 0; index -= 1) {
      const project = selectedProjectLineage[index]
      const effectiveIntent = projectIntentById[project.id] || 'project'
      if (effectiveIntent === 'project') return project
    }
    return null
  }, [projectIntentById, selectedProjectLineage])

  const resolveTaskItemDisplayMode = useCallback((projectId: string): 'list' | 'cards' | 'grid' | 'timeline' => {
    if (!projectId || projectId === 'all') return 'list'
    const visited = new Set<string>()
    let currentId = projectId
    while (currentId && !visited.has(currentId)) {
      visited.add(currentId)
      const project = visibleProjectById[currentId]
      if (!project) break
      const userMode = currentUid ? project.userPreferences?.[currentUid]?.taskItemDisplayMode : undefined
      if (userMode) return userMode
      const mode = project.taskItemDisplayMode || 'inherit'
      if (mode !== 'inherit') return mode
      currentId = project.parentProjectId || ''
    }
    return 'list'
  }, [currentUid, visibleProjectById])

  const taskItemDisplayMode = useMemo(() => {
    if (!selectedProject || selectedProject.id === 'all') return 'list' as const
    return resolveTaskItemDisplayMode(selectedProject.id)
  }, [resolveTaskItemDisplayMode, selectedProject])

  const selectedProjectPeriodLabel = useMemo(() => {
    if (!selectedProject) return ''
    const startLabel = formatProjectDeadlineDate(selectedProject.projectStartDate || '')
    const endLabel = formatProjectDeadlineDate(selectedProject.projectDeadline || '')
    if (startLabel && endLabel) return `${startLabel} -> ${endLabel}`
    return endLabel || startLabel || ''
  }, [selectedProject])

  const selectedProjectSubmissionTimeLabel = useMemo(
    () => (selectedProject?.projectType === 'tender' ? (selectedProject.submissionTime || '') : ''),
    [selectedProject],
  )

  const selectedProjectColorMeaning = useMemo(
    () => {
      const normalizedColor = selectedProjectColorDraft.trim().toLowerCase()
      const match = selectedWorkspaceProjectColorMeanings.find((item) => item.color.toLowerCase() === normalizedColor)
      if (match) return match
      return {
        color: selectedProjectColorDraft,
        label: 'Custom color',
        hint: `Custom meaning (${selectedProjectColorDraft.toUpperCase()}).`,
      }
    },
    [selectedProjectColorDraft, selectedWorkspaceProjectColorMeanings],
  )

  const selectedProjectDisplayName = useMemo(
    () => (selectedProject ? `${selectedProjectIntentMeta.icon} ${selectedProject.name}` : ''),
    [selectedProject, selectedProjectIntentMeta],
  )

  const flatVisibleProjectOptionsWithIcons = useMemo(
    () => flatVisibleProjectOptions.map((item) => ({
      ...item,
      name: `${projectSelectorIconById[item.id] || '📁'} ${item.name}`,
    })),
    [flatVisibleProjectOptions, projectSelectorIconById],
  )

  const selectedProjectComposedDescriptionDraft = useMemo(
    () => buildProjectDescriptionFromIntentDrafts(
      selectedProjectEffectiveIntent,
      selectedProjectNarrativeDraft,
      selectedProjectIntentDetailDrafts,
    ),
    [selectedProjectEffectiveIntent, selectedProjectIntentDetailDrafts, selectedProjectNarrativeDraft],
  )

  const selectedProjectTypeOptions = useMemo(() => {
    const constrainedTypes = WORKHUB_INTENT_ALLOWED_PROJECT_TYPES[selectedProjectEffectiveIntent]
    const allowedTypes = new Set<WorkhubProjectType>(constrainedTypes || PROJECT_TYPE_OPTIONS.map((option) => option.value))
    if (selectedProjectTypeDraft && !allowedTypes.has(selectedProjectTypeDraft)) {
      allowedTypes.add(selectedProjectTypeDraft)
    }
    return PROJECT_TYPE_OPTIONS.filter((option) => allowedTypes.has(option.value))
  }, [selectedProjectEffectiveIntent, selectedProjectTypeDraft])

  // Expose visibleProjectsByParent for consumers that need project children
  const selectedProjectChildren = useMemo(
    () => (selectedProject ? visibleProjectsByParent.get(selectedProject.id) || [] : visibleProjectsByParent.get('') || []),
    [selectedProject, visibleProjectsByParent],
  )

  return {
    selectedProjectEffectiveIntent,
    projectIntentById,
    projectIntentMetaById,
    projectIntentIconById,
    projectSelectorIconById,
    selectedProjectIntentMeta,
    selectedProjectLineage,
    taskContextTrail,
    quickTaskViewTargetProject,
    resolveTaskItemDisplayMode,
    taskItemDisplayMode,
    selectedProjectPeriodLabel,
    selectedProjectSubmissionTimeLabel,
    selectedProjectColorMeaning,
    selectedProjectDisplayName,
    flatVisibleProjectOptionsWithIcons,
    selectedProjectComposedDescriptionDraft,
    selectedProjectTypeOptions,
    selectedProjectChildren,
  }
}
