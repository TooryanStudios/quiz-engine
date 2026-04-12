import type { WorkhubClient, WorkhubMember, WorkhubProject, WorkhubProjectIntent, WorkhubProjectPriority, WorkhubProjectType, WorkhubTaskStatusConfig, WorkhubVisibility } from '../../../lib/workhubRepo'
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
  settingsTenderNumber: string
  settingsProposalId: string
  showMonetaryValue: boolean
  monetaryValueLabel: string
  settingsValueAmount: string
  settingsValueCurrency: string
  settingsMainPanelView: 'tasks' | 'dashboard'
  settingsTaskItemDisplayMode: 'inherit' | 'list' | 'cards' | 'grid'
  settingsTaskStatuses: WorkhubTaskStatusConfig[] | null
  workspaceTaskStatuses: WorkhubTaskStatusConfig[]
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
  onTenderNumberChange: (value: string) => void
  onProposalIdChange: (value: string) => void
  onValueAmountChange: (value: string) => void
  onValueCurrencyChange: (value: string) => void
  onMainPanelViewChange: (value: 'tasks' | 'dashboard') => void
  onTaskItemDisplayModeChange: (value: 'inherit' | 'list' | 'cards' | 'grid') => void
  onTaskStatusesChange: (statuses: WorkhubTaskStatusConfig[] | null) => void
  onApplyViewSettingsToSubItems?: () => void
  applyViewSettingsBusy?: boolean
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
  const hasDeleteBlockers = props.childCount > 0 || props.taskCount > 0

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
              {!isFolderContainer && (
                <label className="workhub-col-span-3">
                  <span>Tender / RFP number</span>
                  <input
                    name="projectSettingsTenderNumber"
                    value={props.settingsTenderNumber}
                    onChange={(event) => props.onTenderNumberChange(event.target.value)}
                    placeholder="e.g. RFP-2026-041"
                  />
                </label>
              )}
              {!isFolderContainer && (
                <label className="workhub-col-span-3">
                  <span>Our proposal ID</span>
                  <input
                    name="projectSettingsProposalId"
                    value={props.settingsProposalId}
                    onChange={(event) => props.onProposalIdChange(event.target.value)}
                    placeholder="e.g. QYAN-PR-117"
                  />
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
                    <label className="workhub-span-2">
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'space-between' }}>
                        <span>{props.monetaryValueLabel}</span>
                        <span style={{ fontWeight: 600, color: '#4a5e78', fontSize: '0.78rem' }}>{props.settingsValueCurrency || 'OMR'}</span>
                      </span>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={props.settingsValueAmount === '' || props.settingsValueAmount === '0'
                          ? props.settingsValueAmount
                          : (() => { const n = parseFloat(props.settingsValueAmount.replace(/,/g, '')); return Number.isFinite(n) ? n.toLocaleString('en-US') : props.settingsValueAmount })()
                        }
                        onChange={(event) => props.onValueAmountChange(event.target.value.replace(/,/g, ''))}
                        placeholder="0"
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
                  <div style={{ marginTop: 8 }}>
                    <button
                      type="button"
                      className="workhub-ghost-btn"
                      onClick={() => props.onApplyViewSettingsToSubItems?.()}
                      disabled={!props.onApplyViewSettingsToSubItems || !!props.applyViewSettingsBusy}
                    >
                      {props.applyViewSettingsBusy ? 'Applying…' : 'Apply current view settings to all sub-items'}
                    </button>
                  </div>
                )}
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
                <div className="workhub-project-statuses-section" style={{ marginTop: 14 }}>
                  <div className="workhub-project-statuses-header">
                    <span className="workhub-project-statuses-title">Task statuses</span>
                    {props.settingsTaskStatuses === null ? (
                      <span className="workhub-project-statuses-inherit-badge">Inheriting from parent / workspace</span>
                    ) : (
                      <span className="workhub-project-statuses-custom-badge">{props.settingsTaskStatuses.length} custom statuses</span>
                    )}
                  </div>
                  {props.settingsTaskStatuses === null ? (
                    <div className="workhub-project-statuses-inherit-preview">
                      {props.workspaceTaskStatuses.map((s) => (
                        <span key={s.id} className="workhub-project-statuses-inherit-chip" style={{ background: s.color + '22', color: s.color, borderColor: s.color + '55' }}>
                          {s.label}
                        </span>
                      ))}
                      <button
                        type="button"
                        className="workhub-project-statuses-override-btn"
                        onClick={() => props.onTaskStatusesChange(props.workspaceTaskStatuses.map((s) => ({ ...s })))}
                      >
                        Override for this folder
                      </button>
                    </div>
                  ) : (
                    <div className="workhub-project-statuses-custom-editor">
                      {props.settingsTaskStatuses.map((status, index) => (
                        <div key={status.id} className="workhub-project-status-row">
                          <input
                            type="color"
                            value={status.color}
                            onChange={(e) => {
                              const next = props.settingsTaskStatuses!.map((s, i) => i === index ? { ...s, color: e.target.value } : s)
                              props.onTaskStatusesChange(next)
                            }}
                            className="workhub-project-status-color-input"
                          />
                          <input
                            type="text"
                            value={status.label}
                            placeholder="Status label"
                            onChange={(e) => {
                              const next = props.settingsTaskStatuses!.map((s, i) => i === index ? { ...s, label: e.target.value } : s)
                              props.onTaskStatusesChange(next)
                            }}
                            className="workhub-project-status-label-input"
                          />
                          <button
                            type="button"
                            className="workhub-danger-btn workhub-project-status-remove-btn"
                            disabled={props.settingsTaskStatuses!.length <= 1}
                            onClick={() => props.onTaskStatusesChange(props.settingsTaskStatuses!.filter((_, i) => i !== index))}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      <div className="workhub-project-statuses-actions">
                        <button
                          type="button"
                          className="workhub-ghost-btn workhub-project-status-add-btn"
                          onClick={() => {
                            const colors = ['#6b7280', '#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6']
                            const next = [
                              ...props.settingsTaskStatuses!,
                              { id: `status_${Date.now()}`, label: 'New status', color: colors[props.settingsTaskStatuses!.length % colors.length] },
                            ]
                            props.onTaskStatusesChange(next)
                          }}
                        >
                          + Add status
                        </button>
                        <button
                          type="button"
                          className="workhub-ghost-btn"
                          onClick={() => props.onTaskStatusesChange(null)}
                        >
                          Reset to inherited
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </details>
          </section>
        </div>

        <div className="workhub-project-settings-sticky-actions">
          {props.canDelete && (
            <div className="workhub-project-settings-delete-action">
              <button
                type="button"
                className="workhub-danger-btn workhub-project-settings-delete-btn"
                disabled={hasDeleteBlockers || props.busyKey === `delete:${props.project.id}`}
                onClick={props.onDelete}
                title={hasDeleteBlockers ? 'Move or delete child items and tasks first.' : `Delete ${entityLabelLower}`}
                aria-label={`Delete ${entityLabelLower}`}
              >
                {props.busyKey === `delete:${props.project.id}` ? '⏳' : '🗑'}
              </button>
              <span className="workhub-project-settings-delete-note">
                {hasDeleteBlockers ? 'Move or delete child items and tasks first.' : `Delete this ${entityLabelLower}.`}
              </span>
            </div>
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
