import {
  useCallback,
  type Dispatch,
  type MouseEvent as ReactMouseEvent,
  type SetStateAction,
} from 'react'

type WorkhubActiveSection = 'home' | 'workspaces' | 'users' | 'tasks' | 'notes' | 'dashboard' | 'clients'

interface UseWorkhubProjectTreeSidebarHandlersParams {
  setActionMenuProjectId: Dispatch<SetStateAction<string | null>>
  setActionMenuPosition: Dispatch<SetStateAction<{ x: number; y: number }>>
  setProjectAccessDialogId: Dispatch<SetStateAction<string>>
  setSelectedProjectId: Dispatch<SetStateAction<string>>
  setSelectedNoteProjectId: Dispatch<SetStateAction<string>>
  setActiveSection: (section: WorkhubActiveSection) => void
  setSelectedTaskId: Dispatch<SetStateAction<string>>
  setExpandedProjectIds: Dispatch<SetStateAction<string[]>>
  setSidebarCollapsed: Dispatch<SetStateAction<boolean>>
  setProjectsGroupExpanded: Dispatch<SetStateAction<boolean>>
}

export function useWorkhubProjectTreeSidebarHandlers({
  setActionMenuProjectId,
  setActionMenuPosition,
  setProjectAccessDialogId,
  setSelectedProjectId,
  setSelectedNoteProjectId,
  setActiveSection,
  setSelectedTaskId,
  setExpandedProjectIds,
  setSidebarCollapsed,
  setProjectsGroupExpanded,
}: UseWorkhubProjectTreeSidebarHandlersParams) {
  const handleProjectActionMenu = useCallback((projectId: string, event: ReactMouseEvent<HTMLElement>) => {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    setActionMenuProjectId(projectId)
    setActionMenuPosition({ x: rect.left, y: rect.bottom + 4 })
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
    setActiveSection('tasks')
    setSelectedTaskId('')
  }, [setActiveSection, setSelectedNoteProjectId, setSelectedProjectId, setSelectedTaskId])

  const openWorkspaceOverview = useCallback(() => {
    setSelectedProjectId('all')
    setSelectedNoteProjectId('')
    setActiveSection('dashboard')
    setSelectedTaskId('')
  }, [setActiveSection, setSelectedNoteProjectId, setSelectedProjectId, setSelectedTaskId])

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
