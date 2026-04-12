import type { WorkhubMember, WorkhubWorkspace } from '../../../lib/workhubRepo'
import type { WorkhubProjectColorMeaning } from '../constants'

export function WorkspaceSettingsDialog(props: {
  workspace: WorkhubWorkspace | null
  workspaceTemplateId: string
  workspaceTemplateLabel: string
  workspaceTemplateGraphic: string
  workspaceTemplateDescription: string
  workspaceTemplateWarning?: string
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
  treeMetaDisplayMode: 'counts' | 'countdown' | 'progress'
  taskDueDisplayMode: 'remaining' | 'date'
  activityWindowDays: 7 | 14 | 30
  moodBoardEnabled: boolean
  showProjectColorDots: boolean
  projectColorMeanings: WorkhubProjectColorMeaning[]
  onClose: () => void
  onSettingsNameChange: (value: string) => void
  onSettingsDescriptionChange: (value: string) => void
  onTreeMetaDisplayModeChange: (value: 'counts' | 'countdown' | 'progress') => void
  onTaskDueDisplayModeChange: (value: 'remaining' | 'date') => void
  onActivityWindowDaysChange: (value: 7 | 14 | 30) => void
  onMoodBoardEnabledChange: (value: boolean) => void
  onShowProjectColorDotsChange: (value: boolean) => void
  onProjectColorMeaningChange: (index: number, patch: Partial<WorkhubProjectColorMeaning>) => void
  onRemoveProjectColorMeaning: (index: number) => void
  onResetProjectColorMeanings: () => void
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
  const deleteValidationMessage = canDelete
    ? 'All confirmations complete. You can delete this workspace.'
    : 'To enable delete: type the exact workspace name, type DELETE WORKSPACE, and check the acknowledgement box in Danger zone.'

  return (
    <div className="workhub-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) props.onClose() }}>
      <div className="workhub-modal large workhub-workspace-settings-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="workhub-modal-head workhub-workspace-settings-head">
          <div>
            <h2>Workspace settings</h2>
            <p>Manage workspace details and lifecycle controls.</p>
          </div>
          <button className="workhub-ghost-btn" onClick={props.onClose}>Close</button>
        </div>
        <div className="workhub-settings-tab-panel">
          <div className="workhub-modal-form">
            <div className={`workhub-workspace-template-id workhub-template-${props.workspaceTemplateId}`}>
              <span className="workhub-template-graphic" aria-hidden="true">
                <span className="workhub-template-graphic-code">{props.workspaceTemplateGraphic}</span>
              </span>
              <div className="workhub-workspace-template-id-content">
                <strong>{props.workspaceTemplateLabel}</strong>
                <span>{props.workspaceTemplateDescription}</span>
              </div>
            </div>
            {props.workspaceTemplateWarning ? (
              <div className="workhub-template-warning-note">{props.workspaceTemplateWarning}</div>
            ) : null}
            <label>
              <span>Workspace name</span>
              <input name="workspaceSettingsName" value={props.settingsName} onChange={(event) => props.onSettingsNameChange(event.target.value)} placeholder="Workspace name" />
            </label>
            <label>
              <span>Description</span>
              <textarea name="workspaceSettingsDescription" value={props.settingsDescription} onChange={(event) => props.onSettingsDescriptionChange(event.target.value)} rows={4} placeholder="Workspace description" />
            </label>
            <label>
              <span>Project tree meta display</span>
              <select
                value={props.treeMetaDisplayMode}
                onChange={(event) => props.onTreeMetaDisplayModeChange(event.target.value as 'counts' | 'countdown' | 'progress')}
              >
                <option value="counts">Show sub-item counts</option>
                <option value="countdown">Show submission time remaining</option>
                <option value="progress">Show task progress (done/total)</option>
              </select>
            </label>
            <label>
              <span>Task due date display</span>
              <select
                value={props.taskDueDisplayMode}
                onChange={(event) => props.onTaskDueDisplayModeChange(event.target.value as 'remaining' | 'date')}
              >
                <option value="remaining">Show time left (days/hours)</option>
                <option value="date">Show actual due date</option>
              </select>
            </label>
            <label>
              <span>Team activity window</span>
              <select
                value={props.activityWindowDays}
                onChange={(event) => props.onActivityWindowDaysChange(Number(event.target.value) as 7 | 14 | 30)}
              >
                <option value={7}>Last 7 days</option>
                <option value={14}>Last 14 days</option>
                <option value={30}>Last 30 days</option>
              </select>
            </label>
            <label className="workhub-toggle-label">
              <span>Mood board feature</span>
              <div className="workhub-toggle-row">
                <button
                  type="button"
                  role="switch"
                  aria-checked={props.moodBoardEnabled}
                  className={`workhub-toggle-btn${props.moodBoardEnabled ? ' is-on' : ''}`}
                  onClick={() => props.onMoodBoardEnabledChange(!props.moodBoardEnabled)}
                >
                  {props.moodBoardEnabled ? 'Enabled' : 'Disabled'}
                </button>
                <span style={{ fontSize: '0.75rem', color: '#7a8faa' }}>
                  {props.moodBoardEnabled ? 'Mood boards are visible in this workspace' : 'Mood boards are hidden for this workspace'}
                </span>
              </div>
            </label>
            <label className="workhub-toggle-label">
              <span>Project color dots</span>
              <div className="workhub-toggle-row">
                <button
                  type="button"
                  role="switch"
                  aria-checked={props.showProjectColorDots}
                  className={`workhub-toggle-btn${props.showProjectColorDots ? ' is-on' : ''}`}
                  onClick={() => props.onShowProjectColorDotsChange(!props.showProjectColorDots)}
                >
                  {props.showProjectColorDots ? 'Enabled' : 'Disabled'}
                </button>
                <span style={{ fontSize: '0.75rem', color: '#7a8faa' }}>
                  {props.showProjectColorDots ? 'Colored dots are visible beside projects in the workspace panel' : 'Colored dots are hidden from the workspace panel'}
                </span>
              </div>
            </label>
            <details className="workhub-workspace-color-meaning-editor">
              <summary className="workhub-workspace-color-meaning-summary">
                <div>
                  <strong>Project color meanings</strong>
                  <span>Customize what each project color means in this workspace template.</span>
                </div>
              </summary>
              <div className="workhub-workspace-color-meaning-head">
                <div />
                <button type="button" className="workhub-ghost-btn" onClick={props.onResetProjectColorMeanings}>Reset defaults</button>
              </div>
              <div className="workhub-workspace-color-meaning-list">
                {props.projectColorMeanings.map((item, index) => (
                  <div key={`workspace-project-color-${index}`} className="workhub-workspace-color-meaning-row">
                    <label className="workhub-workspace-color-cell">
                      <span>Color</span>
                      <div className="workhub-workspace-color-input-row">
                        <input
                          type="color"
                          value={item.color}
                          onChange={(event) => props.onProjectColorMeaningChange(index, { color: event.target.value })}
                          aria-label={`Color ${index + 1}`}
                        />
                        <small>{item.color.toUpperCase()}</small>
                      </div>
                    </label>
                    <label>
                      <span>Label</span>
                      <input
                        value={item.label}
                        onChange={(event) => props.onProjectColorMeaningChange(index, { label: event.target.value })}
                        placeholder="Running"
                      />
                    </label>
                    <label>
                      <span>Meaning</span>
                      <input
                        value={item.hint}
                        onChange={(event) => props.onProjectColorMeaningChange(index, { hint: event.target.value })}
                        placeholder="Approved and currently executing"
                      />
                    </label>
                    <div className="workhub-workspace-color-row-actions">
                      <button
                        type="button"
                        className="workhub-danger-btn"
                        disabled={props.projectColorMeanings.length <= 1}
                        onClick={() => props.onRemoveProjectColorMeaning(index)}
                        title="Delete this status meaning"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </details>
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
        <div className="workhub-workspace-settings-footer">
          <div className="workhub-workspace-delete-hint" aria-live="polite">{deleteValidationMessage}</div>
          <button
            className="workhub-danger-btn"
            disabled={!canDelete || props.busyKey === `workspace-delete:${props.workspace.id}`}
            onClick={props.onDelete}
            title={deleteValidationMessage}
          >
            {props.busyKey === `workspace-delete:${props.workspace.id}` ? 'Deleting…' : 'Delete workspace forever'}
          </button>
          <button className="workhub-primary-btn" disabled={props.busyKey === `workspace-settings:${props.workspace.id}`} onClick={props.onSave}>
            {props.busyKey === `workspace-settings:${props.workspace.id}` ? 'Saving…' : 'Save workspace'}
          </button>
        </div>
      </div>
    </div>
  )
}
