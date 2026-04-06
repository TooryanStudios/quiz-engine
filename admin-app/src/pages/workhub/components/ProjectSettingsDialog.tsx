import { useEffect, useState } from 'react'
import type { WorkhubClient, WorkhubMember, WorkhubProject, WorkhubProjectPriority, WorkhubProjectType, WorkhubVisibility } from '../../../lib/workhubRepo'
import { PROJECT_PRIORITY_OPTIONS, PROJECT_TYPE_OPTIONS } from '../constants'

export function ProjectSettingsDialog(props: {
  project: WorkhubProject | null
  canDelete: boolean
  parentOptions: Array<{ id: string; name: string; depth: number }>
  clientOptions: WorkhubClient[]
  approvedMembers: WorkhubMember[]
  projectColors: string[]
  settingsName: string
  settingsDescription: string
  settingsColor: string
  settingsParentId: string
  settingsDeadline: string
  settingsSubmissionTime: string
  settingsType: WorkhubProjectType
  settingsPriority: WorkhubProjectPriority
  settingsClientId: string
  settingsStorageMethod: 'firebase' | 'drive'
  accessVisibility: WorkhubVisibility
  accessMemberUids: string[]
  childCount: number
  taskCount: number
  busyKey: string
  onClose: () => void
  onNameChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onColorChange: (value: string) => void
  onParentChange: (value: string) => void
  onDeadlineChange: (value: string) => void
  onSubmissionTimeChange: (value: string) => void
  onTypeChange: (value: WorkhubProjectType) => void
  onPriorityChange: (value: WorkhubProjectPriority) => void
  onClientChange: (value: string) => void
  onCreateClientInline: (name: string) => Promise<string | null>
  onStorageMethodChange: (value: 'firebase' | 'drive') => void
  onVisibilityChange: (value: WorkhubVisibility) => void
  onToggleMember: (uid: string) => void
  onDelete: () => void
  onSave: () => void
  onEnsureDriveFolder?: () => void
}) {
  if (!props.project) return null
  const [deleteTypedName, setDeleteTypedName] = useState('')
  const [deletePhrase, setDeletePhrase] = useState('')
  const [deleteAcknowledge, setDeleteAcknowledge] = useState(false)
  const [quickClientName, setQuickClientName] = useState('')
  const hasDeleteBlockers = props.childCount > 0 || props.taskCount > 0
  const canDeleteProject = props.canDelete
    && !hasDeleteBlockers
    && deleteTypedName.trim() === props.project.name
    && deletePhrase.trim() === 'DELETE PROJECT'
    && deleteAcknowledge

  useEffect(() => {
    setDeleteTypedName('')
    setDeletePhrase('')
    setDeleteAcknowledge(false)
    setQuickClientName('')
  }, [props.project?.id])

  return (
    <div className="workhub-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) props.onClose() }}>
      <div className="workhub-modal workhub-project-settings-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="workhub-modal-head workhub-project-settings-head">
          <div>
            <h2>Project settings</h2>
            <p>Rename, move, assign members, manage visibility, or delete {props.project.name}.</p>
          </div>
        </div>
        <div className="workhub-project-settings-body">
          <div className="workhub-psettings-left">
          <div className="workhub-settings-panel">
            <div className="workhub-settings-panel-head">General details</div>
            <div className="workhub-settings-group-body">
              <div className="workhub-field-grid two compact workhub-project-settings-grid">
                <label>
                  <span>Project name</span>
                  <input name="projectSettingsName" value={props.settingsName} onChange={(event) => props.onNameChange(event.target.value)} placeholder="Project name" />
                </label>
                <label>
                  <span>Parent project/category</span>
                  <select name="projectSettingsParent" value={props.settingsParentId} onChange={(event) => props.onParentChange(event.target.value)}>
                    <option value="">Top-level category</option>
                    {props.parentOptions.map((item) => <option key={item.id} value={item.id}>{`${'— '.repeat(item.depth)}${item.name}`}</option>)}
                  </select>
                </label>
                <label>
                  <span>Project type</span>
                  <select name="projectSettingsType" value={props.settingsType} onChange={(event) => props.onTypeChange(event.target.value as WorkhubProjectType)}>
                    {PROJECT_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <label>
                  <span>Project priority</span>
                  <select name="projectSettingsPriority" value={props.settingsPriority} onChange={(event) => props.onPriorityChange(event.target.value as WorkhubProjectPriority)}>
                    {PROJECT_PRIORITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <label>
                  <span>{props.settingsType === 'tender' ? 'Submission date' : 'Final submission deadline'}</span>
                  <input type="date" value={props.settingsDeadline} onChange={(event) => props.onDeadlineChange(event.target.value)} />
                </label>
                {props.settingsType === 'tender' ? (
                  <label>
                    <span>Submission time</span>
                    <input type="time" value={props.settingsSubmissionTime} onChange={(event) => props.onSubmissionTimeChange(event.target.value)} />
                  </label>
                ) : (
                  <label>
                    <span>Submission time</span>
                    <input type="time" value="" disabled />
                  </label>
                )}
                <label>
                  <span>Client</span>
                  <select name="projectSettingsClient" value={props.settingsClientId} onChange={(event) => props.onClientChange(event.target.value)}>
                    <option value="">No client assigned</option>
                    {props.clientOptions.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
                  </select>
                </label>
                <label>
                  <span>Storage Method <small style={{ fontWeight: 'normal', color: 'var(--wh-text-secondary)' }}>(For attachments)</small></span>
                  <select name="projectSettingsStorageMethod" value={props.settingsStorageMethod} onChange={(event) => props.onStorageMethodChange(event.target.value as 'firebase' | 'drive')}>
                    <option value="firebase">Firebase Storage (Recommended)</option>
                    <option value="drive">Google Drive</option>
                  </select>
                </label>
              </div>
              <div className="workhub-inline-row workhub-client-quick-add">
                <input
                  name="projectSettingsQuickClient"
                  value={quickClientName}
                  onChange={(event) => setQuickClientName(event.target.value)}
                  placeholder="Client not listed? Add new client"
                />
                <button
                  type="button"
                  className="workhub-ghost-btn"
                  disabled={!quickClientName.trim() || props.busyKey === 'client:create'}
                  onClick={() => {
                    void props.onCreateClientInline(quickClientName).then((clientId) => {
                      if (!clientId) return
                      props.onClientChange(clientId)
                      setQuickClientName('')
                    })
                  }}
                >
                  {props.busyKey === 'client:create' ? 'Adding…' : 'Add client'}
                </button>
              </div>
              <label>
                <span>Description</span>
                <textarea name="projectSettingsDescription" value={props.settingsDescription} onChange={(event) => props.onDescriptionChange(event.target.value)} rows={3} placeholder="Project description" />
              </label>
              <label>
                <span>Color</span>
                <div className="workhub-inline-row workhub-project-settings-color-row">
                  <input name="projectSettingsColor" value={props.settingsColor} onChange={(event) => props.onColorChange(event.target.value)} placeholder="#6d5efc" />
                  <div className="workhub-color-pills">
                    {props.projectColors.map((color) => (
                      <button key={color} type="button" className={`workhub-color-pill${props.settingsColor === color ? ' active' : ''}`} style={{ background: color }} onClick={() => props.onColorChange(color)} />
                    ))}
                  </div>
                </div>
              </label>
            </div>
          </div>
          </div>
          <div className="workhub-psettings-right">
          <div className="workhub-settings-panel">
            <div className="workhub-settings-panel-head">Access and visibility</div>
            <div className="workhub-settings-group-body">
              <div className="workhub-switcher compact-switcher">
                <button className={`workhub-switcher-btn${props.accessVisibility === 'workspace' ? ' is-active' : ''}`} onClick={() => props.onVisibilityChange('workspace')}>Visible to workspace</button>
                <button className={`workhub-switcher-btn${props.accessVisibility === 'restricted' ? ' is-active' : ''}`} onClick={() => props.onVisibilityChange('restricted')}>Restricted</button>
              </div>
              {props.accessVisibility === 'restricted' && (
                <div className="workhub-member-picker">
                  {props.approvedMembers.map((item) => {
                    const checked = props.accessMemberUids.includes(item.uid)
                    return (
                      <button
                        key={item.uid}
                        type="button"
                        className={`workhub-member-chip${checked ? ' is-selected' : ''}`}
                        onClick={() => props.onToggleMember(item.uid)}
                      >
                        {item.displayName || item.email}
                      </button>
                    )
                  })}
                </div>
              )}
              <div className="workhub-project-settings-meta">
                <div className="workhub-meta-line">
                  {props.childCount} child project{props.childCount === 1 ? '' : 's'} · {props.taskCount} task{props.taskCount === 1 ? '' : 's'}
                </div>
                {!props.project.driveFolderId && props.onEnsureDriveFolder && (
                  <button
                    type="button"
                    className="workhub-ghost-btn"
                    onClick={props.onEnsureDriveFolder}
                    disabled={props.busyKey === `drive:${props.project.id}`}
                  >
                    {props.busyKey === `drive:${props.project.id}` ? 'Creating...' : '+ Create Drive folder'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {props.canDelete && (
            <details className="workhub-collapsible-danger">
            <summary>Danger zone</summary>
            <div className="workhub-danger-zone">
              <p>Deleting this project is irreversible. Complete the confirmation fields below to enable deletion.</p>
              {hasDeleteBlockers && (
                <div className="workhub-badge is-danger" style={{ width: 'fit-content' }}>
                  Move or delete child projects and tasks first.
                </div>
              )}
              <label>
                <span>Type project name exactly: {props.project.name}</span>
                <input
                  name="projectDeleteTypedName"
                  value={deleteTypedName}
                  onChange={(event) => setDeleteTypedName(event.target.value)}
                  placeholder={props.project.name}
                />
              </label>
              <label>
                <span>Type DELETE PROJECT</span>
                <input
                  name="projectDeletePhrase"
                  value={deletePhrase}
                  onChange={(event) => setDeletePhrase(event.target.value)}
                  placeholder="DELETE PROJECT"
                />
              </label>
              <label className="workhub-checkline">
                <input
                  name="projectDeleteAcknowledge"
                  type="checkbox"
                  checked={deleteAcknowledge}
                  onChange={(event) => setDeleteAcknowledge(event.target.checked)}
                />
                <span>I understand this permanently removes the project.</span>
              </label>
              <button
                className="workhub-danger-btn"
                disabled={!canDeleteProject || props.busyKey === `delete:${props.project.id}`}
                onClick={props.onDelete}
              >
                {props.busyKey === `delete:${props.project.id}` ? 'Deleting…' : 'Delete project forever'}
              </button>
            </div>
          </details>
          )}
          </div>
        </div>

        <div className="workhub-project-settings-sticky-actions">
          <button className="workhub-ghost-btn" onClick={props.onClose}>Close</button>
          <button className="workhub-primary-btn" disabled={props.busyKey === `access:${props.project.id}`} onClick={props.onSave}>
            {props.busyKey === `access:${props.project.id}` ? 'Saving…' : 'Save settings'}
          </button>
        </div>
      </div>
    </div>
  )
}
