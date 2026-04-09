import {
  useCallback,
  type Dispatch,
  type MouseEvent as ReactMouseEvent,
  type SetStateAction,
} from 'react'

type WorkhubActiveSection = 'home' | 'users' | 'tasks' | 'notes' | 'dashboard' | 'clients'

interface UseWorkhubProjectTreeSidebarHandlersParams {
  setActionMenuProjectId: Dispatch<SetStateAction<string | null>>
  setActionMenuPosition: Dispatch<SetStateAction<{ x: number; y: number }>>
  setProjectAccessDialogId: Dispatch<SetStateAction<string>>
  setSelectedProjectId: Dispatch<SetStateAction<string>>
  setSelectedNoteProjectId: Dispatch<SetStateAction<string>>
  setSelectedDocumentId: Dispatch<SetStateAction<string>>
  setActiveSection: (section: WorkhubActiveSection) => void
  setSelectedTaskId: Dispatch<SetStateAction<string>>
  setExpandedProjectIds: Dispatch<SetStateAction<string[]>>
  setSidebarCollapsed: Dispatch<SetStateAction<boolean>>
  setProjectsGroupExpanded: Dispatch<SetStateAction<boolean>>
  resolveProjectMainPanelSection?: (projectId: string) => 'tasks' | 'dashboard'
}

export function useWorkhubProjectTreeSidebarHandlers({
  setActionMenuProjectId,
  setActionMenuPosition,
  setProjectAccessDialogId,
  setSelectedProjectId,
  setSelectedNoteProjectId,
  setSelectedDocumentId,
  setActiveSection,
  setSelectedTaskId,
  setExpandedProjectIds,
  setSidebarCollapsed,
  setProjectsGroupExpanded,
  resolveProjectMainPanelSection,
}: UseWorkhubProjectTreeSidebarHandlersParams) {
  const handleProjectActionMenu = useCallback((projectId: string, event: ReactMouseEvent<HTMLElement>) => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const menuWidth = 196
    const menuHeight = 236
    const margin = 8

    const nextX = Math.min(
      Math.max(rect.left, margin),
      Math.max(margin, viewportWidth - menuWidth - margin),
    )

    const defaultY = rect.bottom + 4
    const shouldOpenUp = (defaultY + menuHeight) > (viewportHeight - margin)
    const upY = rect.top - menuHeight - 4
    const nextY = shouldOpenUp
      ? Math.max(margin, upY)
      : Math.min(defaultY, Math.max(margin, viewportHeight - menuHeight - margin))

    setActionMenuProjectId(projectId)
    setActionMenuPosition({ x: nextX, y: nextY })
  }, [setActionMenuPosition, setActionMenuProjectId])

  const closeActionMenu = useCallback(() => {
    setActionMenuProjectId(null)
  }, [setActionMenuProjectId])

  const openProjectSettingsDialog = useCallback((projectId: string) => {
    setProjectAccessDialogId(projectId)
  }, [setProjectAccessDialogId])

  const handleSelectProject = useCallback((projectId: string) => {
    setSelectedProjectId(projectId)
    setSelectedNoteProjectId(projectId)
    setSelectedDocumentId('')
    setActiveSection(resolveProjectMainPanelSection ? resolveProjectMainPanelSection(projectId) : 'tasks')
    setSelectedTaskId('')
  }, [resolveProjectMainPanelSection, setActiveSection, setSelectedDocumentId, setSelectedNoteProjectId, setSelectedProjectId, setSelectedTaskId])

  const openWorkspaceOverview = useCallback(() => {
    setSelectedProjectId('all')
    setSelectedNoteProjectId('')
    setSelectedDocumentId('')
    setActiveSection('dashboard')
    setSelectedTaskId('')
  }, [setActiveSection, setSelectedDocumentId, setSelectedNoteProjectId, setSelectedProjectId, setSelectedTaskId])

  const toggleProjectExpansion = useCallback((projectId: string) => {
    setExpandedProjectIds((current) => current.includes(projectId)
      ? current.filter((item) => item !== projectId)
      : [...current, projectId])
  }, [setExpandedProjectIds])

  const handleExpandSidebar = useCallback(() => {
    setSidebarCollapsed(false)
  }, [setSidebarCollapsed])

  const handleCollapseSidebar = useCallback(() => {
    setSidebarCollapsed(true)
  }, [setSidebarCollapsed])

  const handleToggleProjectsGroup = useCallback(() => {
    setProjectsGroupExpanded((current) => !current)
  }, [setProjectsGroupExpanded])

  return {
    handleProjectActionMenu,
    closeActionMenu,
    openProjectSettingsDialog,
    handleSelectProject,
    openWorkspaceOverview,
    toggleProjectExpansion,
    handleExpandSidebar,
    handleCollapseSidebar,
    handleToggleProjectsGroup,
  }
}
