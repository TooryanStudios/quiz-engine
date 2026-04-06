import {
  useCallback,
  type Dispatch,
  type SetStateAction,
} from 'react'
import {
  createWorkhubActivity,
  createWorkhubNotifications,
  updateWorkhubProject,
  type WorkhubProject,
  type WorkhubProjectType,
} from '../../../lib/workhubRepo'
import { isValidHexColor, normalizeMemberUids } from '../projectUtils'

interface UseWorkhubProjectDetailHandlersParams {
  currentUserUid: string
  selectedWorkspaceId: string
  selectedWorkspaceAccessMemberUids: string[]
  selectedProject: WorkhubProject | null
  canEditSelectedProject: boolean
  selectedProjectNameDraft: string
  selectedProjectDescriptionDraft: string
  setSelectedProjectDescriptionDraft: Dispatch<SetStateAction<string>>
  selectedProjectColorDraft: string
  setSelectedProjectColorDraft: Dispatch<SetStateAction<string>>
  selectedProjectStartDateDraft: string
  selectedProjectDeadlineDraft: string
  selectedProjectSubmissionTimeDraft: string
  selectedProjectTypeDraft: WorkhubProjectType
  setSelectedProjectColorMenuOpen: Dispatch<SetStateAction<boolean>>
  setBusyKey: Dispatch<SetStateAction<string>>
  showToast: (payload: { message: string; type?: 'success' | 'error' | 'info' | 'warning'; durationMs?: number }) => void
}

export function useWorkhubProjectDetailHandlers({
  currentUserUid,
  selectedWorkspaceId,
  selectedWorkspaceAccessMemberUids,
  selectedProject,
  canEditSelectedProject,
  selectedProjectNameDraft,
  selectedProjectDescriptionDraft,
  setSelectedProjectDescriptionDraft,
  selectedProjectColorDraft,
  setSelectedProjectColorDraft,
  selectedProjectStartDateDraft,
  selectedProjectDeadlineDraft,
  selectedProjectSubmissionTimeDraft,
  selectedProjectTypeDraft,
  setSelectedProjectColorMenuOpen,
  setBusyKey,
  showToast,
}: UseWorkhubProjectDetailHandlersParams) {
  const handleSaveSelectedProjectDetails = useCallback(async () => {
    if (!currentUserUid || !selectedWorkspaceId || !selectedProject) return
    if (!canEditSelectedProject) {
      showToast({ type: 'error', message: 'You do not have permission to edit this project.' })
      return
    }

    const nextName = selectedProjectNameDraft.trim()
    if (!nextName) {
      showToast({ type: 'error', message: 'Project name is required.' })
      return
    }
    if (!isValidHexColor(selectedProjectColorDraft)) {
      showToast({ type: 'error', message: 'Pick a valid project color.' })
      return
    }
    if (selectedProjectTypeDraft === 'tender' && !selectedProjectSubmissionTimeDraft.trim()) {
      showToast({ type: 'error', message: 'Submission time is required for tender projects.' })
      return
    }
    if (selectedProjectStartDateDraft && selectedProjectDeadlineDraft && selectedProjectStartDateDraft > selectedProjectDeadlineDraft) {
      showToast({ type: 'error', message: 'Deadline cannot be earlier than the start date.' })
      return
    }

    setBusyKey(`project-detail:${selectedProject.id}`)
    try {
      await updateWorkhubProject(selectedProject.id, {
        name: nextName,
        description: selectedProjectDescriptionDraft.trim(),
        color: selectedProjectColorDraft,
        projectStartDate: selectedProjectStartDateDraft,
        projectDeadline: selectedProjectDeadlineDraft,
        submissionTime: selectedProjectTypeDraft === 'tender' ? selectedProjectSubmissionTimeDraft.trim() : '',
        projectType: selectedProjectTypeDraft,
      })
      await createWorkhubActivity({
        workspaceId: selectedWorkspaceId,
        actorUid: currentUserUid,
        entityType: 'project',
        entityId: selectedProject.id,
        action: 'settings_update',
        message: `${nextName} settings were updated`,
        visibility: selectedProject.visibility,
        memberUids: selectedProject.memberUids,
      })
      await createWorkhubNotifications({
        workspaceId: selectedWorkspaceId,
        actorUid: currentUserUid,
        recipientUids: selectedProject.visibility === 'restricted'
          ? normalizeMemberUids(selectedProject.memberUids)
          : normalizeMemberUids(selectedWorkspaceAccessMemberUids),
        entityType: 'project',
        entityId: selectedProject.id,
        action: 'settings_update',
        message: `updated settings for project "${nextName}"`,
      })
      showToast({ type: 'success', message: 'Project details updated.' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not update project details.'
      showToast({ type: 'error', message })
    } finally {
      setBusyKey('')
    }
  }, [
    canEditSelectedProject,
    currentUserUid,
    selectedProject,
    selectedProjectColorDraft,
    selectedProjectDeadlineDraft,
    selectedProjectDescriptionDraft,
    selectedProjectNameDraft,
    selectedProjectStartDateDraft,
    selectedProjectSubmissionTimeDraft,
    selectedProjectTypeDraft,
    selectedWorkspaceAccessMemberUids,
    selectedWorkspaceId,
    setBusyKey,
    showToast,
  ])

  const handleSelectedProjectDescriptionBlur = useCallback(async () => {
    if (!selectedProject || !canEditSelectedProject) return
    const nextDescription = selectedProjectDescriptionDraft.trim()
    if (nextDescription === (selectedProject.description || '')) return
    setBusyKey(`project-detail:${selectedProject.id}`)
    try {
      await updateWorkhubProject(selectedProject.id, { description: nextDescription })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not update project description.'
      showToast({ type: 'error', message })
      setSelectedProjectDescriptionDraft(selectedProject.description || '')
    } finally {
      setBusyKey('')
    }
  }, [
    canEditSelectedProject,
    selectedProject,
    selectedProjectDescriptionDraft,
    setBusyKey,
    setSelectedProjectDescriptionDraft,
    showToast,
  ])

  const handleSelectedProjectColorSelect = useCallback(async (nextColor: string) => {
    setSelectedProjectColorDraft(nextColor)
    setSelectedProjectColorMenuOpen(false)
    if (!selectedProject || !canEditSelectedProject) return
    if (nextColor === selectedProject.color) return
    setBusyKey(`project-detail:${selectedProject.id}`)
    try {
      await updateWorkhubProject(selectedProject.id, { color: nextColor })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not update project color.'
      showToast({ type: 'error', message })
      setSelectedProjectColorDraft(selectedProject.color)
    } finally {
      setBusyKey('')
    }
  }, [
    canEditSelectedProject,
    selectedProject,
    setBusyKey,
    setSelectedProjectColorDraft,
    setSelectedProjectColorMenuOpen,
    showToast,
  ])

  return {
    handleSaveSelectedProjectDetails,
    handleSelectedProjectDescriptionBlur,
    handleSelectedProjectColorSelect,
  }
}
