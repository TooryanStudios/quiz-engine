import { useEffect, useMemo, useState } from 'react'
import type { IDockviewPanelProps } from 'dockview-react'
import { loadUserPrefs } from '../../lib/adminRepo'
import {
  createFolder,
  createProject,
  deleteFolder,
  deleteStudioProject,
  moveFolder,
  updateFolder,
  updateStudioProject,
} from '../../lib/studioService'
import { useLabNewLayoutData } from './useLabNewLayoutWorkspace'

type ExplorerEdgePanelParams = {
  label?: string
  phase?: string
  position?: string
}

const buildFolderPathIds = (
  targetFolderId: string,
  folders: Array<{ id: string; parentId?: string | null }>,
): string[] => {
  const byId = new Map(folders.map((folder) => [folder.id, folder]))
  const visited = new Set<string>()
  const path: string[] = []
  let cursor: string | null = targetFolderId

  while (cursor) {
    if (visited.has(cursor)) {
      break
    }
    visited.add(cursor)
    const folder = byId.get(cursor)
    if (!folder) {
      break
    }
    path.push(folder.id)
    cursor = (folder.parentId || '').trim() || null
  }

  return path.reverse()
}

const buildSelectionUrlPath = (projectId: string, folderPathIds: string[]): string => {
  const safeProjectId = encodeURIComponent(projectId.trim())
  if (folderPathIds.length === 0) {
    return `/lab/newlayout/p/${safeProjectId}`
  }
  const safeFolderPath = folderPathIds.map((id) => encodeURIComponent(id)).join('/')
  return `/lab/newlayout/p/${safeProjectId}/f/${safeFolderPath}`
}

const buildVideoEditorUrl = (
  project: { id: string; name: string },
  folder: { id: string; name: string } | null,
): string => {
  const params = new URLSearchParams()
  params.set('studioProjectId', project.id)
  params.set('studioProjectName', project.name)
  if (folder) {
    params.set('studioFolderId', folder.id)
    params.set('studioFolderName', folder.name)
  }
  params.set('source', 'lab-newlayout')
  return `/vidEdit?${params.toString()}`
}

export function LabNewLayoutExplorerEdgePanel(props: IDockviewPanelProps<ExplorerEdgePanelParams>) {
  const panelParams = props.params ?? {}
  const {
    authDisplayName,
    authEmail,
    authPhotoUrl,
    authUid,
    studioProjects,
    studioProjectsLoading,
    studioProjectId,
    studioFolders,
    studioFoldersLoading,
    studioActiveFolderId,
    setStudioProjectId,
    setStudioActiveFolderId,
    openHistoryGallery,
  } = useLabNewLayoutData()
  const [isProjectDialogOpen, setProjectDialogOpen] = useState(false)
  const [isProjectEditorOpen, setProjectEditorOpen] = useState(false)
  const [isFolderEditorOpen, setFolderEditorOpen] = useState(false)
  const [activeOrgId, setActiveOrgId] = useState('')
  const [newProjectName, setNewProjectName] = useState('')
  const [newFolderName, setNewFolderName] = useState('')
  const [renameProjectName, setRenameProjectName] = useState('')
  const [renameFolderName, setRenameFolderName] = useState('')
  const [moveFolderParentId, setMoveFolderParentId] = useState('')
  const [managementStatus, setManagementStatus] = useState('')
  const [isManaging, setIsManaging] = useState(false)
  const selectedProject = studioProjects.find((project) => project.id === studioProjectId) ?? null
  const selectedFolder = studioFolders.find((folder) => folder.id === studioActiveFolderId) ?? null
  const resolvedCreateOrgId = useMemo(
    () => (selectedProject?.orgId || studioProjects[0]?.orgId || activeOrgId || '').trim(),
    [activeOrgId, selectedProject?.orgId, studioProjects],
  )

  useEffect(() => {
    setRenameProjectName(selectedProject?.name ?? '')
  }, [selectedProject?.id, selectedProject?.name])

  useEffect(() => {
    setRenameFolderName(selectedFolder?.name ?? '')
    setMoveFolderParentId(selectedFolder?.parentId ?? '')
  }, [selectedFolder?.id, selectedFolder?.name, selectedFolder?.parentId])

  useEffect(() => {
    if (!selectedProject) {
      setFolderEditorOpen(false)
    }
  }, [selectedProject])

  useEffect(() => {
    if (!authUid) {
      setActiveOrgId('')
      return
    }

    let isCancelled = false
    void (async () => {
      const prefs = await loadUserPrefs(authUid).catch(() => null)
      if (isCancelled) {
        return
      }
      setActiveOrgId((prefs?.activeOrgId || '').trim())
    })()

    return () => {
      isCancelled = true
    }
  }, [authUid])

  const runManagementAction = async (action: () => Promise<void>) => {
    setIsManaging(true)
    setManagementStatus('')
    try {
      await action()
    } catch (error) {
      setManagementStatus(error instanceof Error ? error.message : 'Action failed.')
    } finally {
      setIsManaging(false)
    }
  }

  const handleCreateProject = () => {
    if (!authUid) {
      setManagementStatus('Sign in before creating a project.')
      return
    }
    const trimmedName = newProjectName.trim()
    if (!trimmedName) {
      setManagementStatus('Enter a project name.')
      return
    }
    // Fall back to user's own UID as a personal org when no org is set
    const orgId = resolvedCreateOrgId || authUid

    void runManagementAction(async () => {
      const created = await createProject(
        {
          orgId,
          name: trimmedName,
        },
        {
          uid: authUid,
          displayName: authDisplayName,
          email: authEmail,
          photoUrl: authPhotoUrl,
        },
      )
      const defaultFolder = await createFolder(
        {
          projectId: created.id,
          name: 'Default',
          parentId: null,
        },
        authUid,
      )
      // setStudioProjectId(created.id) // DISABLED FOR DIAGNOSTICS
      // setStudioActiveFolderId(defaultFolder.id) // DISABLED FOR DIAGNOSTICS
      setNewProjectName('')
      setManagementStatus('Project created with a default folder.')
    })
  }

  const handleRenameProject = () => {
    if (!selectedProject) {
      setManagementStatus('Select a project first.')
      return
    }
    const trimmedName = renameProjectName.trim()
    if (!trimmedName) {
      setManagementStatus('Project name cannot be empty.')
      return
    }

    void runManagementAction(async () => {
      await updateStudioProject(selectedProject.id, trimmedName)
      setManagementStatus('Project renamed.')
    })
  }

  const handleDeleteProject = () => {
    if (!selectedProject) {
      setManagementStatus('Select a project first.')
      return
    }

    const approved = window.confirm(`Delete project "${selectedProject.name}"?`)
    if (!approved) {
      return
    }

    void runManagementAction(async () => {
      await deleteStudioProject(selectedProject.id)
      setManagementStatus('Project deleted.')
    })
  }

  const handleCreateFolder = () => {
    if (!selectedProject || !authUid) {
      setManagementStatus('Select a project before creating a folder.')
      return
    }
    const trimmedName = newFolderName.trim()
    if (!trimmedName) {
      setManagementStatus('Enter a folder name.')
      return
    }

    void runManagementAction(async () => {
      const created = await createFolder(
        {
          projectId: selectedProject.id,
          name: trimmedName,
          parentId: null,
        },
        authUid,
      )
      // setStudioActiveFolderId(created.id) // DISABLED FOR DIAGNOSTICS
      setNewFolderName('')
      setManagementStatus('Folder created.')
    })
  }

  const handleCreateDefaultFolder = () => {
    if (!selectedProject || !authUid) {
      setManagementStatus('Select a project before creating a folder.')
      return
    }

    void runManagementAction(async () => {
      const created = await createFolder(
        {
          projectId: selectedProject.id,
          name: 'Default',
          parentId: null,
        },
        authUid,
      )
      // setStudioActiveFolderId(created.id) // DISABLED FOR DIAGNOSTICS
      setManagementStatus('Default folder created.')
    })
  }

  const handleRenameFolder = () => {
    if (!selectedProject || !selectedFolder) {
      setManagementStatus('Select a folder first.')
      return
    }
    const trimmedName = renameFolderName.trim()
    if (!trimmedName) {
      setManagementStatus('Folder name cannot be empty.')
      return
    }

    void runManagementAction(async () => {
      await updateFolder(selectedProject.id, selectedFolder.id, trimmedName)
      setManagementStatus('Folder renamed.')
    })
  }

  const handleMoveFolder = () => {
    if (!selectedProject || !selectedFolder) {
      setManagementStatus('Select a folder first.')
      return
    }
    if (moveFolderParentId === selectedFolder.id) {
      setManagementStatus('A folder cannot be moved under itself.')
      return
    }

    void runManagementAction(async () => {
      await moveFolder(selectedProject.id, selectedFolder.id, moveFolderParentId.trim() || null)
      setManagementStatus('Folder location updated.')
    })
  }

  const handleDeleteFolder = () => {
    if (!selectedProject || !selectedFolder) {
      setManagementStatus('Select a folder first.')
      return
    }

    const approved = window.confirm(`Delete folder "${selectedFolder.name}"?`)
    if (!approved) {
      return
    }

    void runManagementAction(async () => {
      await deleteFolder(selectedProject.id, selectedFolder.id)
      // setStudioActiveFolderId(null) // DISABLED FOR DIAGNOSTICS
      setManagementStatus('Folder deleted.')
    })
  }

  const handleUiFolderClick = (folderId: string) => {
    setStudioActiveFolderId(folderId)
    if (!selectedProject) {
      return
    }

    const folderPathIds = buildFolderPathIds(folderId, studioFolders)
    const nextPath = buildSelectionUrlPath(selectedProject.id, folderPathIds)
    const nextUrl = `${nextPath}${window.location.search}${window.location.hash}`
    if (`${window.location.pathname}${window.location.search}${window.location.hash}` !== nextUrl) {
      window.history.replaceState(window.history.state, '', nextUrl)
    }
  }

  const handleOpenVideoEditor = () => {
    if (!selectedProject) {
      setManagementStatus('Select a project before opening the video editor.')
      return
    }

    window.location.assign(buildVideoEditorUrl(selectedProject, selectedFolder))
  }

  return (
    <div className="lab-newlayout-edge-panel lab-newlayout-edge-panel--explorer" data-position={panelParams.position ?? 'edge'}>
      <div className="lab-newlayout-edge-head">
        <span className="lab-newlayout-edge-title">{panelParams.label ?? props.api.title}</span>
        {panelParams.phase ? <span className="lab-newlayout-phase-badge">{panelParams.phase}</span> : null}
      </div>

      <button
        type="button"
        className="lab-newlayout-explorer-button"
        disabled={!authUid || isManaging}
        onClick={() => setProjectDialogOpen(true)}
      >
        Select Project
      </button>

      <button
        type="button"
        className="lab-newlayout-explorer-button"
        disabled={!studioProjectId}
        onClick={openHistoryGallery}
      >
        View Project Generations
      </button>

      <button
        type="button"
        className="lab-newlayout-explorer-button"
        disabled={!selectedProject || isManaging}
        onClick={handleOpenVideoEditor}
      >
        {selectedFolder ? 'Open Video Editor For Folder' : 'Open Video Editor'}
      </button>

      {!selectedProject ? (
        <div className="lab-newlayout-explorer-warning" role="status">
          <div className="lab-newlayout-explorer-warning-title">Create a project first</div>
          <div className="lab-newlayout-explorer-empty">Generation is disabled until a project and folder are active.</div>
          <input
            className="lab-newlayout-prompt-input lab-newlayout-explorer-inline-input"
            value={newProjectName}
            onChange={(event) => setNewProjectName(event.target.value)}
            placeholder="Project name"
            disabled={!authUid || isManaging}
          />
          <button
            type="button"
            className="lab-newlayout-explorer-button"
            onClick={handleCreateProject}
            disabled={!authUid || isManaging}
          >
            Create Project + Default Folder
          </button>
        </div>
      ) : null}

      <div className="lab-newlayout-explorer-tree" aria-label="Explorer content">
        {!authUid ? (
          <div className="lab-newlayout-explorer-empty">Sign in to load your Studio projects.</div>
        ) : selectedProject ? (
          <>
            <div className="lab-newlayout-explorer-project">{selectedProject.name}</div>
            <div className="lab-newlayout-explorer-folders-label">Folders</div>
            <div className="lab-newlayout-explorer-folders">
              {studioFoldersLoading ? (
                <div className="lab-newlayout-explorer-empty">Loading folders...</div>
              ) : studioFolders.length === 0 ? (
                <div className="lab-newlayout-explorer-warning lab-newlayout-explorer-warning--compact">
                  <div className="lab-newlayout-explorer-warning-title">Create a folder</div>
                  <div className="lab-newlayout-explorer-empty">This project has no folders yet. Create one to enable generation.</div>
                  <button
                    type="button"
                    className="lab-newlayout-explorer-button"
                    onClick={handleCreateDefaultFolder}
                    disabled={isManaging}
                  >
                    Create Default Folder
                  </button>
                </div>
              ) : (
                studioFolders.map((folder) => (
                  <button
                    key={folder.id}
                    type="button"
                    className={`lab-newlayout-explorer-folder${folder.id === studioActiveFolderId ? ' is-active' : ''}`}
                    onClick={() => handleUiFolderClick(folder.id)}
                    title="Diagnostic mode: updates active folder and URL"
                  >
                    {folder.name}
                  </button>
                ))
              )}
            </div>
            {selectedFolder ? (
              <div className="lab-newlayout-explorer-selection">
                <div className="lab-newlayout-explorer-folders-label">Loaded Folder</div>
                <div className="lab-newlayout-explorer-project">{selectedFolder.name}</div>
                <div className="lab-newlayout-explorer-empty">Project: {selectedProject.name}</div>
              </div>
            ) : studioFolders.length > 0 ? (
              <div className="lab-newlayout-explorer-warning lab-newlayout-explorer-warning--compact" role="status">
                <div className="lab-newlayout-explorer-warning-title">Select a folder</div>
                <div className="lab-newlayout-explorer-empty">Choose one folder from the list to enable generation.</div>
              </div>
            ) : null}
          </>
        ) : studioProjectsLoading ? (
          <div className="lab-newlayout-explorer-empty">Loading projects...</div>
        ) : studioProjects.length === 0 ? (
          <div className="lab-newlayout-explorer-empty">No projects available for this account.</div>
        ) : (
          <div className="lab-newlayout-explorer-empty">Select a project to show its folders here.</div>
        )}
      </div>

      <div className="lab-newlayout-explorer-selection">
        <button
          type="button"
          className="lab-newlayout-explorer-button"
          onClick={() => setProjectEditorOpen((current) => !current)}
          disabled={isManaging}
        >
          {isProjectEditorOpen ? 'Hide Project Editor' : 'Show Project Editor'}
        </button>
        {isProjectEditorOpen ? (
          <div className="lab-newlayout-explorer-folders">
            <input
              className="lab-newlayout-prompt-input"
              value={newProjectName}
              onChange={(event) => setNewProjectName(event.target.value)}
              placeholder="New project name"
              disabled={!authUid || isManaging}
            />
            <button
              type="button"
              className="lab-newlayout-explorer-button"
              onClick={handleCreateProject}
              disabled={!authUid || isManaging}
            >
              Create Project + Default Folder
            </button>
            <input
              className="lab-newlayout-prompt-input"
              value={renameProjectName}
              onChange={(event) => setRenameProjectName(event.target.value)}
              placeholder="Rename selected project"
              disabled={!selectedProject || isManaging}
            />
            <button
              type="button"
              className="lab-newlayout-explorer-button"
              onClick={handleRenameProject}
              disabled={!selectedProject || isManaging}
            >
              Rename Project
            </button>
            <button
              type="button"
              className="lab-newlayout-explorer-button"
              onClick={handleDeleteProject}
              disabled={!selectedProject || isManaging}
            >
              Delete Project
            </button>
          </div>
        ) : null}
      </div>

      <div className="lab-newlayout-explorer-selection">
        <button
          type="button"
          className="lab-newlayout-explorer-button"
          onClick={() => setFolderEditorOpen((current) => !current)}
          disabled={!selectedProject || isManaging}
        >
          {isFolderEditorOpen ? 'Hide Folder Editor' : 'Show Folder Editor'}
        </button>
        {isFolderEditorOpen ? (
          <div className="lab-newlayout-explorer-folders">
            <input
              className="lab-newlayout-prompt-input"
              value={newFolderName}
              onChange={(event) => setNewFolderName(event.target.value)}
              placeholder="New folder name"
              disabled={!selectedProject || isManaging}
            />
            <button
              type="button"
              className="lab-newlayout-explorer-button"
              onClick={handleCreateFolder}
              disabled={!selectedProject || isManaging}
            >
              Create Folder
            </button>
            <input
              className="lab-newlayout-prompt-input"
              value={renameFolderName}
              onChange={(event) => setRenameFolderName(event.target.value)}
              placeholder="Rename selected folder"
              disabled={!selectedFolder || isManaging}
            />
            <button
              type="button"
              className="lab-newlayout-explorer-button"
              onClick={handleRenameFolder}
              disabled={!selectedFolder || isManaging}
            >
              Rename Folder
            </button>
            <select
              className="lab-newlayout-select"
              value={moveFolderParentId}
              onChange={(event) => setMoveFolderParentId(event.target.value)}
              disabled={!selectedFolder || isManaging}
              aria-label="Move folder under"
            >
              <option value="">Move to root</option>
              {studioFolders
                .filter((folder) => folder.id !== selectedFolder?.id)
                .map((folder) => (
                  <option key={folder.id} value={folder.id}>{folder.name}</option>
                ))}
            </select>
            <button
              type="button"
              className="lab-newlayout-explorer-button"
              onClick={handleMoveFolder}
              disabled={!selectedFolder || isManaging}
            >
              Move Folder
            </button>
            <button
              type="button"
              className="lab-newlayout-explorer-button"
              onClick={handleDeleteFolder}
              disabled={!selectedFolder || isManaging}
            >
              Delete Folder
            </button>
          </div>
        ) : null}
        <div className="lab-newlayout-explorer-empty" role="status">
          {isManaging ? 'Applying changes...' : managementStatus}
        </div>
      </div>

      {isProjectDialogOpen ? (
        <div
          className="lab-newlayout-explorer-dialog-backdrop"
          role="presentation"
          onClick={() => setProjectDialogOpen(false)}
        >
          <div
            className="lab-newlayout-explorer-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Select project"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="lab-newlayout-explorer-dialog-title">Select Project</div>
            <div className="lab-newlayout-explorer-dialog-options">
              {!authUid ? <div className="lab-newlayout-explorer-empty">Sign in to load projects.</div> : null}
              {authUid && studioProjectsLoading ? <div className="lab-newlayout-explorer-empty">Loading projects...</div> : null}
              {authUid && !studioProjectsLoading && studioProjects.length === 0 ? <div className="lab-newlayout-explorer-empty">No projects found for this account.</div> : null}
              {studioProjects.map((project) => (
                <button
                  key={project.id}
                  type="button"
                  className={`lab-newlayout-explorer-dialog-option${project.id === studioProjectId ? ' is-active' : ''}`}
                  onClick={() => {
                    setStudioProjectId(project.id)
                    setProjectDialogOpen(false)
                  }}
                >
                  {project.name}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="lab-newlayout-explorer-dialog-close"
              onClick={() => setProjectDialogOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}