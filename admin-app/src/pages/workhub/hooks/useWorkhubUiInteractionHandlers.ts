import {
  useCallback,
  type Dispatch,
  type SetStateAction,
} from 'react'
import {
  markWorkhubNotificationRead,
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
  notifications: WorkhubNotification[]
  tasks: WorkhubTask[]
  visibleWorkspaceProjects: WorkhubProject[]
  setSelectedProjectId: Dispatch<SetStateAction<string>>
  setSelectedNoteProjectId: Dispatch<SetStateAction<string>>
  setSelectedTaskId: Dispatch<SetStateAction<string>>
  setActiveSection: (section: WorkhubActiveSection) => void
  navigateToProfile: () => void
  showToast: (payload: { message: string; type?: 'success' | 'error' | 'info' | 'warning'; durationMs?: number }) => void
}

export function useWorkhubUiInteractionHandlers({
  notificationMenuOpen,
  setNotificationMenuOpen,
  accountMenuOpen,
  setAccountMenuOpen,
  notifications,
  tasks,
  visibleWorkspaceProjects,
  setSelectedProjectId,
  setSelectedNoteProjectId,
  setSelectedTaskId,
  setActiveSection,
  navigateToProfile,
  showToast,
}: UseWorkhubUiInteractionHandlersParams) {
  const handleNotificationClick = useCallback(async (notification: WorkhubNotification) => {
    setNotificationMenuOpen(false)
    setAccountMenuOpen(false)
    if (!notification.read) {
      try {
        await markWorkhubNotificationRead(notification.id)
      } catch {
        // Best effort: navigation should still work even if read-state update fails.
      }
    }

    if (notification.entityType === 'task') {
      const targetTask = tasks.find((item) => item.id === notification.entityId)
      if (!targetTask) {
        showToast({ type: 'error', message: 'This task is no longer available.' })
        return
      }
      setSelectedProjectId(targetTask.projectId)
      setSelectedNoteProjectId(targetTask.projectId)
      setSelectedTaskId(targetTask.id)
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
      setActiveSection('tasks')
      return
    }

    setActiveSection('home')
  }, [
    setNotificationMenuOpen,
    setAccountMenuOpen,
    tasks,
    showToast,
    setSelectedProjectId,
    setSelectedNoteProjectId,
    setSelectedTaskId,
    setActiveSection,
    visibleWorkspaceProjects,
  ])

  const handleToggleNotificationMenu = useCallback(() => {
    const opening = !notificationMenuOpen
    setNotificationMenuOpen(opening)
    if (opening) setAccountMenuOpen(false)
    if (!opening) return

    const unreadIds = notifications.filter((item) => !item.read).map((item) => item.id)
    if (unreadIds.length === 0) return
    void Promise.all(unreadIds.map((id) => markWorkhubNotificationRead(id).catch(() => undefined)))
  }, [notificationMenuOpen, notifications, setAccountMenuOpen, setNotificationMenuOpen])

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
