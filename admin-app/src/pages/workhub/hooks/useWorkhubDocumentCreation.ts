import {
  useCallback,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react'
import {
  createWorkhubActivity,
  createWorkhubDocument,
  type WorkhubDocumentTab,
  type WorkhubProject,
  type WorkhubVisibility,
} from '../../../lib/workhubRepo'
import { normalizeMemberUids } from '../projectUtils'

function buildDefaultDocumentTabs(initialBody: string): WorkhubDocumentTab[] {
  const tabId = `tab_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  return [{ id: tabId, title: 'Main', body: initialBody }]
}

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
    const notifyUids = normalizeMemberUids(memberUids).filter((uid) => uid !== currentUserUid)
    const notifyMode = notifyUids.length > 0 ? 'selected' : 'all'

    setBusyKey('document:create')
    try {
      const documentId = await createWorkhubDocument({
        workspaceId: selectedWorkspaceId,
        projectId: targetProject?.id || null,
        title,
        body: documentBodyDraft,
        tabs: buildDefaultDocumentTabs(documentBodyDraft),
        visibility,
        memberUids,
        notifyMode,
        notifyUids,
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
    const notifyUids = normalizeMemberUids(memberUids).filter((uid) => uid !== currentUserUid)
    const notifyMode = notifyUids.length > 0 ? 'selected' : 'all'

    const title = 'New document'
    setBusyKey('document:create')
    try {
      const documentId = await createWorkhubDocument({
        workspaceId: selectedWorkspaceId,
        projectId: targetProject?.id || null,
        title,
        body: '',
        tabs: buildDefaultDocumentTabs(''),
        visibility,
        memberUids,
        notifyMode,
        notifyUids,
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

  const createNoteQuick = useCallback(async (projectId = '') => {
    if (!selectedWorkspaceId || !currentUserUid) return

    const targetProject = projectId ? (workspaceProjectById[projectId] || null) : null
    const visibility: WorkhubVisibility = targetProject?.visibility || 'workspace'
    const memberUids = visibility === 'restricted'
      ? normalizeMemberUids(targetProject?.memberUids?.length ? targetProject.memberUids : [currentUserUid])
      : []
    const notifyUids = normalizeMemberUids(memberUids).filter((uid) => uid !== currentUserUid)
    const notifyMode = notifyUids.length > 0 ? 'selected' : 'all'

    const now = new Date()
    const dateLabel = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    const title = `Note – ${dateLabel}`

    setBusyKey('note:create')
    try {
      const documentId = await createWorkhubDocument({
        workspaceId: selectedWorkspaceId,
        projectId: targetProject?.id || null,
        type: 'note',
        title,
        body: '',
        visibility,
        memberUids,
        notifyMode,
        notifyUids,
        createdBy: currentUserUid,
      })

      onDocumentCreated?.(documentId, targetProject?.id || null)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not create note.'
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
    createNoteQuick,
  }
}

