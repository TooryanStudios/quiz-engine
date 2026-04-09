import { useEffect, useState } from 'react'
import type { WorkhubClient, WorkhubMember, WorkhubProject, WorkhubProjectIntent, WorkhubProjectPriority, WorkhubProjectType, WorkhubVisibility } from '../../../lib/workhubRepo'
import { PROJECT_PRIORITY_OPTIONS, type WorkhubProjectColorMeaning } from '../constants'
import { BUILD_NUMBER, BUILD_TIME_UTC } from '../../../buildInfo'

export function ProjectSettingsDialog(props: {
  project: WorkhubProject | null
  intent: WorkhubProjectIntent
  entityIcon?: string
  entityLabel: string
  canDelete: boolean
  parentOptions: Array<{ id: string; name: string; depth: number }>
  clientOptions: WorkhubClient[]
  approvedMembers: WorkhubMember[]
  projectColors: string[]
  projectColorMeanings: WorkhubProjectColorMeaning[]
  settingsName: string
  settingsDescription: string
  settingsColor: string
  settingsParentId: string
  settingsDeadline: string
  settingsDeadlineLabel: string
  settingsSubmissionTime: string
  settingsType: WorkhubProjectType
  typeOptions: Array<{ value: WorkhubProjectType; label: string }>
  settingsPriority: WorkhubProjectPriority
  showMonetaryValue: boolean
  monetaryValueLabel: string
  settingsValueAmount: string
  settingsValueCurrency: string
  settingsMainPanelView: 'tasks' | 'dashboard'
  settingsTaskItemDisplayMode: 'inherit' | 'list' | 'cards' | 'grid'
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
  onValueAmountChange: (value: string) => void
  onValueCurrencyChange: (value: string) => void
  onMainPanelViewChange: (value: 'tasks' | 'dashboard') => void
  onTaskItemDisplayModeChange: (value: 'inherit' | 'list' | 'cards' | 'grid') => void
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
  const entityIcon = props.entityIcon || '📁'
  const entityLabel = props.entityLabel || 'Project'
  const entityLabelLower = entityLabel.toLowerCase()
  const colorMeaningByColor = new Map(props.projectColorMeanings.map((item) => [item.color.toLowerCase(), item]))
  const selectedColorMeaning = colorMeaningByColor.get(props.settingsColor.toLowerCase()) || {
    color: props.settingsColor,
    label: 'Custom color',
    hint: `Custom meaning (${props.settingsColor.toUpperCase()}).`,
  }
  const isFolderContainer = props.intent === 'project'
  const deletePhraseExpected = `DELETE ${entityLabel.toUpperCase()}`
  const hasDeleteBlockers = props.childCount > 0 || props.taskCount > 0
  const canDeleteProject = props.canDelete
    && !hasDeleteBlockers
    && deleteTypedName.trim() === props.project.name
    && deletePhrase.trim() === deletePhraseExpected
    && deleteAcknowledge

  useEffect(() => {
    setDeleteTypedName('')
    setDeletePhrase('')
    setDeleteAcknowledge(false)
  }, [props.project?.id])

  return (
    <div className="workhub-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) props.onClose() }}>
      <div className="workhub-modal workhub-project-settings-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="workhub-modal-head workhub-project-settings-head">
          <div>
            <h2>{`${entityIcon} ${entityLabel} settings`}</h2>
            <span className="workhub-psettings-version">{`v${BUILD_NUMBER} · ${BUILD_TIME_UTC}`}</span>
          </div>
        </div>
        <div className="workhub-project-settings-body">
          <section className="workhub-project-settings-main">
            <h3 className="workhub-project-settings-section-title">General details</h3>

            <div className="workhub-project-settings-grid-preview">
              <label className="workhub-col-span-6">
                <span>{`${entityLabel} name`}</span>
                <input name="projectSettingsName" value={props.settingsName} onChange={(event) => props.onNameChange(event.target.value)} placeholder={`${entityLabel} name`} />
              </label>
              {!isFolderContainer && (
                <label className="workhub-col-span-3">
                  <span>{props.settingsDeadlineLabel}</span>
                  <input type="date" value={props.settingsDeadline} onChange={(event) => props.onDeadlineChange(event.target.value)} />
                </label>
              )}
              {!isFolderContainer && (props.settingsType === 'tender' ? (
                <label className="workhub-col-span-3">
                  <span>Submission time</span>
                  <input type="time" value={props.settingsSubmissionTime} onChange={(event) => props.onSubmissionTimeChange(event.target.value)} />
                </label>
              ) : (
                <label className="workhub-col-span-3">
                  <span>Submission time</span>
                  <input type="time" value="" disabled />
                </label>
              ))}

              <label className="workhub-col-span-6">
                <span>{isFolderContainer ? 'Parent folder/category' : 'Parent item/category'}</span>
                <select name="projectSettingsParent" value={props.settingsParentId} onChange={(event) => props.onParentChange(event.target.value)}>
                  <option value="">{isFolderContainer ? 'Top-level folder' : 'Top-level item'}</option>
                  {props.parentOptions.map((item) => <option key={item.id} value={item.id}>{`${'— '.repeat(item.depth)}${item.name}`}</option>)}
                </select>
              </label>
              {!isFolderContainer && (
                <label className="workhub-col-span-3">
                  <span>Client</span>
                  <select name="projectSettingsClient" value={props.settingsClientId} onChange={(event) => props.onClientChange(event.target.value)}>
                    <option value="">No client assigned</option>
                    {props.clientOptions.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
                  </select>
                </label>
              )}
              {!isFolderContainer && (
                <label className="workhub-col-span-3">
                  <span>{`${entityLabel} type`}</span>
                  <select name="projectSettingsType" value={props.settingsType} onChange={(event) => props.onTypeChange(event.target.value as WorkhubProjectType)}>
                    {props.typeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
              )}

              <label className={isFolderContainer ? 'workhub-col-span-6' : 'workhub-col-span-4'}>
                <span>Storage Method (For attachments)</span>
                <select name="projectSettingsStorageMethod" value={props.settingsStorageMethod} onChange={(event) => props.onStorageMethodChange(event.target.value as 'firebase' | 'drive')}>
                  <option value="firebase">Attachments</option>
                  <option value="drive">Google Drive</option>
                </select>
              </label>
              {!isFolderContainer && (
                <label className="workhub-col-span-3">
                  <span>{`${entityLabel} priority`}</span>
                  <select name="projectSettingsPriority" value={props.settingsPriority} onChange={(event) => props.onPriorityChange(event.target.value as WorkhubProjectPriority)}>
                    {PROJECT_PRIORITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
              )}
              <div className={`${isFolderContainer ? 'workhub-col-span-6' : 'workhub-col-span-5'} workhub-project-settings-access-field`}>
                <span>Access and visibility</span>
                <div className="workhub-project-settings-access-options">
                  <label className="workhub-access-toggle">
                    <input
                      type="checkbox"
                      checked={props.accessVisibility === 'workspace'}
                      onChange={() => props.onVisibilityChange('workspace')}
                    />
                    <span className={`workhub-access-label${props.accessVisibility === 'workspace' ? ' is-active' : ''}`}>Visible to workspace</span>
                  </label>
                  <label className="workhub-access-toggle">
                    <input
                      type="checkbox"
                      checked={props.accessVisibility === 'restricted'}
                      onChange={() => props.onVisibilityChange('restricted')}
                    />
                    <span className={`workhub-access-label${props.accessVisibility === 'restricted' ? ' is-active' : ''}`}>Restricted</span>
                  </label>
                </div>
              </div>
            </div>

            {props.accessVisibility === 'restricted' && (
              <div className="workhub-member-picker workhub-project-settings-member-picker">
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
                {props.childCount} child item{props.childCount === 1 ? '' : 's'} · {props.taskCount} task{props.taskCount === 1 ? '' : 's'}
              </div>
              {!props.project.driveFolderId && props.onEnsureDriveFolder && (
                <button
                  type="button"
                  className="workhub-ghost-btn"
                  onClick={props.onEnsureDriveFolder}
                  disabled={props.busyKey === `drive:${props.project.id}`}
                >
                  {props.busyKey === `drive:${props.project.id}` ? 'Creating...' : '📁 Create Drive folder'}
                </button>
              )}
            </div>

            <div className="workhub-project-settings-divider" />

            <div className="workhub-project-settings-bottom-grid">
              <label className="workhub-project-settings-description-field">
                <span>Description</span>
                <textarea name="projectSettingsDescription" value={props.settingsDescription} onChange={(event) => props.onDescriptionChange(event.target.value)} rows={4} placeholder={`${entityLabel} details`} />
              </label>

              <div className="workhub-project-settings-color-field">
                <span>Status color</span>
                <div className="workhub-color-pills">
                  {props.projectColors.map((color) => {
                    const colorMeaning = colorMeaningByColor.get(color.toLowerCase())
                    const colorLabel = colorMeaning ? `${colorMeaning.label}: ${colorMeaning.hint}` : color
                    return (
                      <button
                        key={color}
                        type="button"
                        className={`workhub-color-pill${props.settingsColor === color ? ' active' : ''}`}
                        style={{ background: color }}
                        onClick={() => props.onColorChange(color)}
                        title={colorLabel}
                        aria-label={colorLabel}
                      />
                    )
                  })}
                </div>
                <div className="workhub-color-meaning-note">
                  <strong>{selectedColorMeaning.label}</strong>
                  <span>{selectedColorMeaning.hint}</span>
                </div>
              </div>
            </div>

            <details className="workhub-project-settings-advanced">
              <summary>Advanced options</summary>
              <div className="workhub-settings-group-body">
                {props.showMonetaryValue && (
                  <div className="workhub-field-grid two compact workhub-project-settings-money-grid">
                    <label>
                      <span>{props.monetaryValueLabel}</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={props.settingsValueAmount}
                        onChange={(event) => props.onValueAmountChange(event.target.value)}
                        placeholder="0"
                      />
                    </label>
                    <label>
                      <span>Currency</span>
                      <input
                        value={props.settingsValueCurrency}
                        onChange={(event) => props.onValueCurrencyChange(event.target.value.toUpperCase().slice(0, 3))}
                        placeholder="USD"
                        maxLength={3}
                      />
                    </label>
                  </div>
                )}
                <div>
                  <span>Main panel default</span>
                  <div className="workhub-switcher compact-switcher" style={{ marginTop: 6 }}>
                    <button
                      type="button"
                      className={`workhub-switcher-btn${props.settingsMainPanelView === 'dashboard' ? ' is-active' : ''}`}
                      onClick={() => props.onMainPanelViewChange('dashboard')}
                    >
                      Dashboard summary
                    </button>
                    <button
                      type="button"
                      className={`workhub-switcher-btn${props.settingsMainPanelView === 'tasks' ? ' is-active' : ''}`}
                      onClick={() => props.onMainPanelViewChange('tasks')}
                    >
                      Tasks view
                    </button>
                  </div>
                </div>
                {isFolderContainer && (
                  <label style={{ display: 'block', marginTop: 10 }}>
                    <span>Task items display mode</span>
                    <select
                      value={props.settingsTaskItemDisplayMode}
                      onChange={(event) => props.onTaskItemDisplayModeChange(event.target.value as 'inherit' | 'list' | 'cards' | 'grid')}
                      style={{ marginTop: 6 }}
                    >
                      <option value="inherit">Inherit from parent folder</option>
                      <option value="list">List rows</option>
                      <option value="cards">Cards</option>
                      <option value="grid">Grid</option>
                    </select>
                  </label>
                )}
              </div>
            </details>
          </section>
        </div>

        <div className="workhub-project-settings-sticky-actions">
          {props.canDelete && (
            <details className="workhub-project-settings-danger-inline">
              <summary>{`Danger zone: manage move, assign members, and delete this ${entityLabelLower}.`}</summary>
              <div className="workhub-danger-zone">
                <p>{`Deleting this ${entityLabelLower} is irreversible. Complete the confirmation fields below to enable deletion.`}</p>
                {hasDeleteBlockers && (
                  <div className="workhub-badge is-danger" style={{ width: 'fit-content' }}>
                    Move or delete child items and tasks first.
                  </div>
                )}
                <label>
                  <span>{`Type ${entityLabelLower} name exactly: ${props.project.name}`}</span>
                  <input
                    name="projectDeleteTypedName"
                    value={deleteTypedName}
                    onChange={(event) => setDeleteTypedName(event.target.value)}
                    placeholder={props.project.name}
                  />
                </label>
                <label>
                  <span>{`Type ${deletePhraseExpected}`}</span>
                  <input
                    name="projectDeletePhrase"
                    value={deletePhrase}
                    onChange={(event) => setDeletePhrase(event.target.value)}
                    placeholder={deletePhraseExpected}
                  />
                </label>
                <label className="workhub-checkline">
                  <input
                    name="projectDeleteAcknowledge"
                    type="checkbox"
                    checked={deleteAcknowledge}
                    onChange={(event) => setDeleteAcknowledge(event.target.checked)}
                  />
                  <span>{`I understand this permanently removes the ${entityLabelLower}.`}</span>
                </label>
                <button
                  className="workhub-danger-btn"
                  disabled={!canDeleteProject || props.busyKey === `delete:${props.project.id}`}
                  onClick={props.onDelete}
                >
                  {props.busyKey === `delete:${props.project.id}` ? 'Deleting…' : `Delete ${entityLabelLower} forever`}
                </button>
              </div>
            </details>
          )}
          <div className="workhub-psettings-footer-btns">
            <button className="workhub-primary-btn" disabled={props.busyKey === `access:${props.project.id}`} onClick={props.onSave}>
              {props.busyKey === `access:${props.project.id}` ? 'Saving…' : 'Save settings'}
            </button>
            <button className="workhub-ghost-btn" onClick={props.onClose}>Close</button>
          </div>
        </div>
      </div>
    </div>
  )
}
