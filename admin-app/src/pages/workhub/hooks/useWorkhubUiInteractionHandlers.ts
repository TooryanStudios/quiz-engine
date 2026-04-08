import {
  useCallback,
  type Dispatch,
  type SetStateAction,
} from 'react'
import {
  type WorkhubDocument,
  type WorkhubNotification,
  type WorkhubProject,
  type WorkhubTask,
} from '../../../lib/workhubRepo'

type WorkhubActiveSection = 'home' | 'users' | 'tasks' | 'notes' | 'dashboard' | 'clients'

interface UseWorkhubUiInteractionHandlersParams {
  notificationMenuOpen: boolean
  setNotificationMenuOpen: Dispatch<SetStateAction<boolean>>
  accountMenuOpen: boolean
  setAccountMenuOpen: Dispatch<SetStateAction<boolean>>
  tasks: WorkhubTask[]
  documents: WorkhubDocument[]
  visibleWorkspaceProjects: WorkhubProject[]
  setSelectedProjectId: Dispatch<SetStateAction<string>>
  setSelectedNoteProjectId: Dispatch<SetStateAction<string>>
  setSelectedTaskId: Dispatch<SetStateAction<string>>
  setSelectedDocumentId: Dispatch<SetStateAction<string>>
  setActiveSection: (section: WorkhubActiveSection) => void
  openDocumentFromNotification: (notification: WorkhubNotification) => Promise<boolean>
  resolveProjectMainPanelSection?: (projectId: string) => 'tasks' | 'dashboard'
  navigateToProfile: () => void
  showToast: (payload: { message: string; type?: 'success' | 'error' | 'info' | 'warning'; durationMs?: number }) => void
}

export function useWorkhubUiInteractionHandlers({
  notificationMenuOpen,
  setNotificationMenuOpen,
  accountMenuOpen,
  setAccountMenuOpen,
  tasks,
  documents,
  visibleWorkspaceProjects,
  setSelectedProjectId,
  setSelectedNoteProjectId,
  setSelectedTaskId,
  setSelectedDocumentId,
  setActiveSection,
  openDocumentFromNotification,
  resolveProjectMainPanelSection,
  navigateToProfile,
  showToast,
}: UseWorkhubUiInteractionHandlersParams) {
  const handleNotificationClick = useCallback(async (notification: WorkhubNotification) => {
    setNotificationMenuOpen(false)
    setAccountMenuOpen(false)

    if (notification.entityType === 'task') {
      const targetTask = tasks.find((item) => item.id === notification.entityId)
      if (!targetTask) {
        showToast({ type: 'error', message: 'This task is no longer available.' })
        return
      }
      setSelectedProjectId(targetTask.projectId)
      setSelectedNoteProjectId(targetTask.projectId)
      setSelectedTaskId(targetTask.id)
      setSelectedDocumentId('')
      setActiveSection('tasks')
      return
    }

    if (notification.entityType === 'project') {
      if (!visibleWorkspaceProjects.some((item) => item.id === notification.entityId)) {
        showToast({ type: 'error', message: 'This project is no longer available.' })
        return
      }
      setSelectedProjectId(notification.entityId)
      setSelectedNoteProjectId(notification.entityId)
      setSelectedTaskId('')
      setSelectedDocumentId('')
      setActiveSection(resolveProjectMainPanelSection ? resolveProjectMainPanelSection(notification.entityId) : 'tasks')
      return
    }

    if (notification.entityType === 'document') {
      const targetDocument = documents.find((item) => item.id === notification.entityId)
      if (!targetDocument) {
        console.log('[Notification] document not in documents list, calling openDocumentFromNotification for', notification.entityId, 'docs count:', documents.length)
        const opened = await openDocumentFromNotification(notification)
        if (opened) return
        showToast({ type: 'error', message: 'This document is no longer available.' })
        return
      }
      console.log('[Notification] document found in documents (inline path): id', targetDocument.id, 'title', targetDocument.title, 'body length', (targetDocument.body || '').length)

      const targetProjectId = targetDocument.projectId && visibleWorkspaceProjects.some((item) => item.id === targetDocument.projectId)
        ? targetDocument.projectId
        : 'all'

      setSelectedProjectId(targetProjectId)
      setSelectedNoteProjectId(targetDocument.projectId || '')
      setSelectedTaskId('')
      setSelectedDocumentId(targetDocument.id)
      setActiveSection('notes')
      return
    }

    setSelectedDocumentId('')
    setActiveSection('home')
  }, [
    setNotificationMenuOpen,
    setAccountMenuOpen,
    tasks,
    documents,
    showToast,
    setSelectedProjectId,
    setSelectedNoteProjectId,
    setSelectedTaskId,
    setSelectedDocumentId,
    setActiveSection,
    openDocumentFromNotification,
    resolveProjectMainPanelSection,
    visibleWorkspaceProjects,
  ])

  const handleToggleNotificationMenu = useCallback(() => {
    const opening = !notificationMenuOpen
    setNotificationMenuOpen(opening)
    if (opening) setAccountMenuOpen(false)
  }, [notificationMenuOpen, setAccountMenuOpen, setNotificationMenuOpen])

  const handleToggleAccountMenu = useCallback(() => {
    const opening = !accountMenuOpen
    setAccountMenuOpen(opening)
    if (opening) setNotificationMenuOpen(false)
  }, [accountMenuOpen, setAccountMenuOpen, setNotificationMenuOpen])

  const handleOpenAccountSettings = useCallback(() => {
    setAccountMenuOpen(false)
    navigateToProfile()
  }, [navigateToProfile, setAccountMenuOpen])

  return {
    handleNotificationClick,
    handleToggleNotificationMenu,
    handleToggleAccountMenu,
    handleOpenAccountSettings,
  }
}
