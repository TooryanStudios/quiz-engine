import { useState } from 'react'
import type { IDockviewPanelProps } from 'dockview-react'
import { useLabNewLayoutData } from './useLabNewLayoutWorkspace'

type ExplorerEdgePanelParams = {
  label?: string
  phase?: string
  position?: string
}

export function LabNewLayoutExplorerEdgePanel(props: IDockviewPanelProps<ExplorerEdgePanelParams>) {
  const {
    authUid,
    studioProjects,
    studioProjectsLoading,
    studioProjectId,
    studioFolders,
    studioFoldersLoading,
    studioActiveFolderId,
    setStudioProjectId,
    setStudioActiveFolderId,
  } = useLabNewLayoutData()
  const [isProjectDialogOpen, setProjectDialogOpen] = useState(false)
  const selectedProject = studioProjects.find((project) => project.id === studioProjectId) ?? null
  const selectedFolder = studioFolders.find((folder) => folder.id === studioActiveFolderId) ?? null

  return (
    <div className="lab-newlayout-edge-panel lab-newlayout-edge-panel--explorer" data-position={props.params.position ?? 'edge'}>
      <div className="lab-newlayout-edge-head">
        <span className="lab-newlayout-edge-title">{props.params.label ?? props.api.title}</span>
        {props.params.phase ? <span className="lab-newlayout-phase-badge">{props.params.phase}</span> : null}
      </div>

      <button
        type="button"
        className="lab-newlayout-explorer-button"
        disabled={!authUid}
        onClick={() => setProjectDialogOpen(true)}
      >
        Select Project
      </button>

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
                <div className="lab-newlayout-explorer-empty">No folders found in this project.</div>
              ) : (
                studioFolders.map((folder) => (
                  <button
                    key={folder.id}
                    type="button"
                    className={`lab-newlayout-explorer-folder${folder.id === studioActiveFolderId ? ' is-active' : ''}`}
                    onClick={() => setStudioActiveFolderId(folder.id)}
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