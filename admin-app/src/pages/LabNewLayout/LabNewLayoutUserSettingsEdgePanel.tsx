import type { IDockviewPanelProps } from 'dockview-react'
import { useLabNewLayoutData } from './useLabNewLayoutWorkspace'

type UserSettingsEdgePanelParams = {
  label?: string
  phase?: string
  position?: string
}

export function LabNewLayoutUserSettingsEdgePanel(props: IDockviewPanelProps<UserSettingsEdgePanelParams>) {
  const panelParams = props.params ?? {}
  const {
    authUid,
    authDisplayName,
    authEmail,
    authPhotoUrl,
    studioProjects,
    studioProjectId,
    studioFolders,
    studioActiveFolderId,
  } = useLabNewLayoutData()
  const selectedProject = studioProjects.find((project) => project.id === studioProjectId) ?? null
  const selectedFolder = studioFolders.find((folder) => folder.id === studioActiveFolderId) ?? null
  const profileInitial = (authDisplayName || authEmail || 'U').trim().charAt(0).toUpperCase()

  return (
    <div className="lab-newlayout-edge-panel lab-newlayout-edge-panel--user-settings" data-position={panelParams.position ?? 'edge'}>
      <div className="lab-newlayout-edge-head">
        <span className="lab-newlayout-edge-title">{panelParams.label ?? props.api.title}</span>
        {panelParams.phase ? <span className="lab-newlayout-phase-badge">{panelParams.phase}</span> : null}
      </div>

      {!authUid ? (
        <div className="lab-newlayout-explorer-empty">Sign in to review your account and workspace settings.</div>
      ) : (
        <>
          <div className="lab-newlayout-user-settings-card">
            {authPhotoUrl ? (
              <img className="lab-newlayout-user-settings-avatar" src={authPhotoUrl} alt="" />
            ) : (
              <span className="lab-newlayout-user-settings-avatar lab-newlayout-user-avatar--fallback" aria-hidden="true">
                {profileInitial}
              </span>
            )}
            <div className="lab-newlayout-user-settings-copy">
              <div className="lab-newlayout-user-settings-name">{authDisplayName || 'Signed-in user'}</div>
              <div className="lab-newlayout-user-settings-email">{authEmail || 'No email available'}</div>
            </div>
          </div>

          <div className="lab-newlayout-user-settings-section">
            <div className="lab-newlayout-explorer-folders-label">Active Workspace</div>
            <div className="lab-newlayout-user-settings-row">
              <span>Project</span>
              <strong>{selectedProject?.name || 'No project selected'}</strong>
            </div>
            <div className="lab-newlayout-user-settings-row">
              <span>Folder</span>
              <strong>{selectedFolder?.name || 'No folder selected'}</strong>
            </div>
          </div>

          <div className="lab-newlayout-user-settings-section">
            <div className="lab-newlayout-explorer-folders-label">Account</div>
            <div className="lab-newlayout-user-settings-row">
              <span>Status</span>
              <strong>Connected</strong>
            </div>
            <div className="lab-newlayout-user-settings-row">
              <span>Workspace</span>
              <strong>ToorGen Studio</strong>
            </div>
          </div>
        </>
      )}
    </div>
  )
}