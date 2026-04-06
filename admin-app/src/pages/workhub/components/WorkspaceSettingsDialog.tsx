import type { WorkhubMember, WorkhubWorkspace } from '../../../lib/workhubRepo'

export function WorkspaceSettingsDialog(props: {
  workspace: WorkhubWorkspace | null
  busyKey: string
  projectCount: number
  taskCount: number
  members: WorkhubMember[]
  pendingMembers: WorkhubMember[]
  approvedMembers: WorkhubMember[]
  workspaces: WorkhubWorkspace[]
  memberWorkspaceSummaryByUid: Record<string, { count: number; names: string[] }>
  workspaceAccessMemberUids: string[]
  workspaceInviteEmails: string[]
  workspaceInviteEmailDraft: string
  deleteTypedName: string
  deletePhrase: string
  deleteAcknowledge: boolean
  settingsName: string
  settingsDescription: string
  onClose: () => void
  onSettingsNameChange: (value: string) => void
  onSettingsDescriptionChange: (value: string) => void
  onWorkspaceAccessToggle: (uid: string, checked: boolean) => void
  onToggleUserWorkspace: (uid: string, workspaceId: string, checked: boolean) => void
  onWorkspaceInviteDraftChange: (value: string) => void
  onWorkspaceInviteAdd: () => void
  onWorkspaceInviteRemove: (email: string) => void
  onApproveRequest: (uid: string) => void
  onRejectRequest: (uid: string) => void
  workspaceMemberAccessLevels: Record<string, 'full' | 'custom'>
  onMemberAccessLevelChange: (uid: string, level: 'full' | 'custom') => void
  onDeleteTypedNameChange: (value: string) => void
  onDeletePhraseChange: (value: string) => void
  onDeleteAcknowledgeChange: (value: boolean) => void
  onSave: () => void
  onDelete: () => void
}) {
  if (!props.workspace) return null
  const canDelete = props.deleteTypedName.trim() === props.workspace.name && props.deletePhrase.trim() === 'DELETE WORKSPACE' && props.deleteAcknowledge

  return (
    <div className="workhub-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) props.onClose() }}>
      <div className="workhub-modal large workhub-workspace-settings-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="workhub-modal-head">
          <div>
            <h2>Workspace settings</h2>
            <p>Manage workspace details and lifecycle controls.</p>
          </div>
          <button className="workhub-ghost-btn" onClick={props.onClose}>Close</button>
        </div>
        <div className="workhub-settings-tab-panel">
          <div className="workhub-modal-form">
            <label>
              <span>Workspace name</span>
              <input name="workspaceSettingsName" value={props.settingsName} onChange={(event) => props.onSettingsNameChange(event.target.value)} placeholder="Workspace name" />
            </label>
            <label>
              <span>Description</span>
              <textarea name="workspaceSettingsDescription" value={props.settingsDescription} onChange={(event) => props.onSettingsDescriptionChange(event.target.value)} rows={4} placeholder="Workspace description" />
            </label>
            <button className="workhub-primary-btn" disabled={props.busyKey === `workspace-settings:${props.workspace.id}`} onClick={props.onSave}>
              {props.busyKey === `workspace-settings:${props.workspace.id}` ? 'Saving…' : 'Save workspace'}
            </button>
          </div>

          <details className="workhub-collapsible-danger">
            <summary>Danger zone</summary>
            <div className="workhub-danger-zone">
              <p>Deleting this workspace is irreversible. You must complete all confirmations below.</p>
              <div className="workhub-meta-line">{props.projectCount} project{props.projectCount === 1 ? '' : 's'} · {props.taskCount} task{props.taskCount === 1 ? '' : 's'}</div>
              <label>
                <span>Type workspace name exactly: {props.workspace.name}</span>
                <input name="workspaceDeleteTypedName" value={props.deleteTypedName} onChange={(event) => props.onDeleteTypedNameChange(event.target.value)} placeholder={props.workspace.name} />
              </label>
              <label>
                <span>Type DELETE WORKSPACE</span>
                <input name="workspaceDeletePhrase" value={props.deletePhrase} onChange={(event) => props.onDeletePhraseChange(event.target.value)} placeholder="DELETE WORKSPACE" />
              </label>
              <label className="workhub-checkline">
                <input name="workspaceDeleteAcknowledge" type="checkbox" checked={props.deleteAcknowledge} onChange={(event) => props.onDeleteAcknowledgeChange(event.target.checked)} />
                <span>I understand this action permanently removes the workspace.</span>
              </label>
              <button className="workhub-danger-btn" disabled={!canDelete || props.busyKey === `workspace-delete:${props.workspace.id}`} onClick={props.onDelete}>
                {props.busyKey === `workspace-delete:${props.workspace.id}` ? 'Deleting…' : 'Delete workspace forever'}
              </button>
            </div>
          </details>
        </div>
      </div>
    </div>
  )
}
