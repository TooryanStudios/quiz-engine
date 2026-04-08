import {
  useCallback,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'
import {
  createWorkhubActivity,
  createWorkhubDocument,
  type WorkhubProject,
  type WorkhubVisibility,
} from '../../../lib/workhubRepo'
import { normalizeMemberUids } from '../projectUtils'

interface UseWorkhubDocumentCreationParams {
  currentUserUid: string
  selectedWorkspaceId: string
  selectedProjectId: string
  workspaceProjectById: Record<string, WorkhubProject>
  setBusyKey: Dispatch<SetStateAction<string>>
  showToast: (payload: { message: string; type?: 'success' | 'error' | 'info' | 'warning'; durationMs?: number }) => void
  onDocumentCreated?: (documentId: string, projectId: string | null) => void
}

export function useWorkhubDocumentCreation({
  currentUserUid,
  selectedWorkspaceId,
  selectedProjectId,
  workspaceProjectById,
  setBusyKey,
  showToast,
  onDocumentCreated,
}: UseWorkhubDocumentCreationParams) {
  const [documentDialogOpen, setDocumentDialogOpen] = useState(false)
  const [documentTitleDraft, setDocumentTitleDraft] = useState('')
  const [documentBodyDraft, setDocumentBodyDraft] = useState('')
  const [documentProjectIdDraft, setDocumentProjectIdDraft] = useState('')

  const openDocumentCreateDialog = useCallback((projectId = '') => {
    const preferredProjectId = projectId || (selectedProjectId !== 'all' ? selectedProjectId : '')
    const targetProjectId = workspaceProjectById[preferredProjectId] ? preferredProjectId : ''
    setDocumentProjectIdDraft(targetProjectId)
    setDocumentTitleDraft('')
    setDocumentBodyDraft('')
    setDocumentDialogOpen(true)
  }, [selectedProjectId, workspaceProjectById])

  const closeDocumentCreateDialog = useCallback(() => {
    setDocumentDialogOpen(false)
  }, [])

  const handleCreateDocument = useCallback(async () => {
    if (!selectedWorkspaceId || !currentUserUid) return

    const title = documentTitleDraft.trim()
    if (!title) {
      showToast({ type: 'error', message: 'Document title is required.' })
      return
    }

    const targetProject = documentProjectIdDraft ? workspaceProjectById[documentProjectIdDraft] : null
    const visibility: WorkhubVisibility = targetProject?.visibility || 'workspace'
    const memberUids = visibility === 'restricted'
      ? normalizeMemberUids(targetProject?.memberUids?.length ? targetProject.memberUids : [currentUserUid])
      : []

    setBusyKey('document:create')
    try {
      const documentId = await createWorkhubDocument({
        workspaceId: selectedWorkspaceId,
        projectId: targetProject?.id || null,
        title,
        body: documentBodyDraft,
        visibility,
        memberUids,
        createdBy: currentUserUid,
      })

      await createWorkhubActivity({
        workspaceId: selectedWorkspaceId,
        actorUid: currentUserUid,
        entityType: 'document',
        entityId: documentId,
        action: 'create',
        message: `Created document ${title}`,
        visibility,
        memberUids,
      })

      onDocumentCreated?.(documentId, targetProject?.id || null)
      setDocumentDialogOpen(false)
      setDocumentTitleDraft('')
      setDocumentBodyDraft('')
      setDocumentProjectIdDraft('')
      showToast({ type: 'success', message: 'Document created.' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not create document.'
      showToast({ type: 'error', message })
    } finally {
      setBusyKey('')
    }
  }, [
    currentUserUid,
    documentBodyDraft,
    documentProjectIdDraft,
    documentTitleDraft,
    onDocumentCreated,
    selectedWorkspaceId,
    setBusyKey,
    showToast,
    workspaceProjectById,
  ])

  const createDocumentQuick = useCallback(async (projectId = '') => {
    if (!selectedWorkspaceId || !currentUserUid) return

    const targetProject = projectId ? (workspaceProjectById[projectId] || null) : null
    const visibility: WorkhubVisibility = targetProject?.visibility || 'workspace'
    const memberUids = visibility === 'restricted'
      ? normalizeMemberUids(targetProject?.memberUids?.length ? targetProject.memberUids : [currentUserUid])
      : []

    const title = 'New document'
    setBusyKey('document:create')
    try {
      const documentId = await createWorkhubDocument({
        workspaceId: selectedWorkspaceId,
        projectId: targetProject?.id || null,
        title,
        body: '',
        visibility,
        memberUids,
        createdBy: currentUserUid,
      })

      await createWorkhubActivity({
        workspaceId: selectedWorkspaceId,
        actorUid: currentUserUid,
        entityType: 'document',
        entityId: documentId,
        action: 'create',
        message: `Created document ${title}`,
        visibility,
        memberUids,
      })

      onDocumentCreated?.(documentId, targetProject?.id || null)
      showToast({ type: 'success', message: 'Document created.' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not create document.'
      showToast({ type: 'error', message })
    } finally {
      setBusyKey('')
    }
  }, [
    currentUserUid,
    onDocumentCreated,
    selectedWorkspaceId,
    setBusyKey,
    showToast,
    workspaceProjectById,
  ])

  return {
    documentDialogOpen,
    documentTitleDraft,
    setDocumentTitleDraft,
    documentBodyDraft,
    setDocumentBodyDraft,
    documentProjectIdDraft,
    setDocumentProjectIdDraft,
    openDocumentCreateDialog,
    closeDocumentCreateDialog,
    handleCreateDocument,
    createDocumentQuick,
  }
}
