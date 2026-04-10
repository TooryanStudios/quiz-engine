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
  type WorkhubProjectIntent,
  type WorkhubProjectType,
} from '../../../lib/workhubRepo'
import { isStartAfterEnd, isValidHexColor, normalizeMemberUids } from '../projectUtils'

function parseMonetaryAmountInput(value: string): number | null {
  const normalized = value.trim()
  if (!normalized) return 0
  const parsed = Number(normalized)
  if (!Number.isFinite(parsed) || parsed < 0) return null
  return Math.round(parsed * 100) / 100
}

function normalizeCurrencyInput(value: string): string {
  const normalized = value.trim().toUpperCase().replace(/[^A-Z]/g, '')
  const nextCurrency = normalized === 'USD' ? 'OMR' : normalized
  return (nextCurrency || 'OMR').slice(0, 3)
}

interface UseWorkhubProjectDetailHandlersParams {
  currentUserUid: string
  selectedWorkspaceId: string
  selectedWorkspaceAccessMemberUids: string[]
  selectedProject: WorkhubProject | null
  selectedProjectIntent: WorkhubProjectIntent
  canEditSelectedProject: boolean
  selectedProjectNameDraft: string
  selectedProjectDescriptionDraft: string
  resolvedProjectDescriptionDraft?: string
  setSelectedProjectDescriptionDraft: Dispatch<SetStateAction<string>>
  selectedProjectColorDraft: string
  setSelectedProjectColorDraft: Dispatch<SetStateAction<string>>
  selectedProjectStartDateDraft: string
  selectedProjectDeadlineDraft: string
  selectedProjectSubmissionTimeDraft: string
  selectedProjectTypeDraft: WorkhubProjectType
  selectedProjectValueAmountDraft: string
  selectedProjectValueCurrencyDraft: string
  setSelectedProjectColorMenuOpen: Dispatch<SetStateAction<boolean>>
  setBusyKey: Dispatch<SetStateAction<string>>
  showToast: (payload: { message: string; type?: 'success' | 'error' | 'info' | 'warning'; durationMs?: number }) => void
}

export function useWorkhubProjectDetailHandlers({
  currentUserUid,
  selectedWorkspaceId,
  selectedWorkspaceAccessMemberUids,
  selectedProject,
  selectedProjectIntent,
  canEditSelectedProject,
  selectedProjectNameDraft,
  selectedProjectDescriptionDraft,
  resolvedProjectDescriptionDraft,
  setSelectedProjectDescriptionDraft,
  selectedProjectColorDraft,
  setSelectedProjectColorDraft,
  selectedProjectStartDateDraft,
  selectedProjectDeadlineDraft,
  selectedProjectSubmissionTimeDraft,
  selectedProjectTypeDraft,
  selectedProjectValueAmountDraft,
  selectedProjectValueCurrencyDraft,
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
    const nextDescription = (resolvedProjectDescriptionDraft ?? selectedProjectDescriptionDraft).trim()
    if (!nextName) {
      showToast({ type: 'error', message: 'Project name is required.' })
      return
    }
    if (!isValidHexColor(selectedProjectColorDraft)) {
      showToast({ type: 'error', message: 'Pick a valid project color.' })
      return
    }
    const isFolderContainer = selectedProjectIntent === 'project'
    if (!isFolderContainer && selectedProjectTypeDraft === 'tender' && !selectedProjectSubmissionTimeDraft.trim()) {
      showToast({ type: 'error', message: 'Submission time is required for tender projects.' })
      return
    }
    if (
      !isFolderContainer
      && selectedProjectStartDateDraft
      && selectedProjectDeadlineDraft
      && isStartAfterEnd(selectedProjectStartDateDraft, selectedProjectDeadlineDraft)
    ) {
      showToast({ type: 'error', message: 'Deadline cannot be earlier than the start date.' })
      return
    }
    let nextValueAmount = 0
    let nextValueCurrency = normalizeCurrencyInput(selectedProjectValueCurrencyDraft)
    if (!isFolderContainer) {
      const parsedValueAmount = parseMonetaryAmountInput(selectedProjectValueAmountDraft)
      if (parsedValueAmount === null) {
        showToast({ type: 'error', message: 'Value amount must be zero or a positive number.' })
        return
      }
      nextValueAmount = parsedValueAmount
    }

    setBusyKey(`project-detail:${selectedProject.id}`)
    try {
      await updateWorkhubProject(selectedProject.id, {
        name: nextName,
        description: nextDescription,
        color: selectedProjectColorDraft,
        ...(isFolderContainer ? {} : {
          projectStartDate: selectedProjectStartDateDraft,
          projectDeadline: selectedProjectDeadlineDraft,
          submissionTime: selectedProjectTypeDraft === 'tender' ? selectedProjectSubmissionTimeDraft.trim() : '',
          projectType: selectedProjectTypeDraft,
          valueAmount: nextValueAmount,
          valueCurrency: nextValueCurrency,
        }),
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
    selectedProjectIntent,
    selectedProjectColorDraft,
    selectedProjectDeadlineDraft,
    selectedProjectDescriptionDraft,
    selectedProjectNameDraft,
    selectedProjectStartDateDraft,
    selectedProjectSubmissionTimeDraft,
    selectedProjectTypeDraft,
    selectedProjectValueAmountDraft,
    selectedProjectValueCurrencyDraft,
    resolvedProjectDescriptionDraft,
    selectedWorkspaceAccessMemberUids,
    selectedWorkspaceId,
    setBusyKey,
    showToast,
  ])

  const handleSelectedProjectDescriptionBlur = useCallback(async () => {
    if (!selectedProject || !canEditSelectedProject) return
    const nextDescription = (resolvedProjectDescriptionDraft ?? selectedProjectDescriptionDraft).trim()
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
    resolvedProjectDescriptionDraft,
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
