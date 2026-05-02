import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import type { WorkhubClient, WorkhubFolderNotifyDelivery, WorkhubMember, WorkhubMilestone, WorkhubProject, WorkhubProjectIntent, WorkhubProjectPriority, WorkhubProjectType, WorkhubTaskStatusConfig, WorkhubVisibility } from '../../../lib/workhubRepo'
import { PROJECT_PRIORITY_OPTIONS, type WorkhubProjectColorMeaning } from '../constants'
import { BUILD_NUMBER, BUILD_TIME_UTC } from '../../../buildInfo'
import { MilestonesPanel } from './MilestonesPanel'
import type { MilestoneProgress } from '../hooks/useWorkhubMilestones'

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
  statusSuggestion?: {
    title: string
    description: string
    buttonLabel: string
    applied: boolean
    appliedLabel?: string
    onApply?: () => void
    onCancel?: () => void
    cancelLabel?: string
  } | null
  settingsParentId: string
  settingsDeadline: string
  settingsDeadlineLabel: string
  settingsSubmissionTime: string
  settingsType: WorkhubProjectType
  typeOptions: Array<{ value: WorkhubProjectType; label: string }>
  settingsPriority: WorkhubProjectPriority
  settingsTenderNumber: string
  settingsProposalId: string
  settingsTechnicalProposalUrl: string
  settingsFinancialProposalUrl: string
  showMonetaryValue: boolean
  monetaryValueLabel: string
  settingsValueAmount: string
  settingsValueCurrency: string
  settingsMainPanelView: 'tasks' | 'dashboard' | 'dashboard_with_details'
  settingsTaskItemDisplayMode: 'inherit' | 'list' | 'cards' | 'grid' | 'timeline'
  settingsTaskStatuses: WorkhubTaskStatusConfig[] | null
  workspaceTaskStatuses: WorkhubTaskStatusConfig[]
  settingsFolderNotifications: {
    enabled: boolean
    taskCreated: boolean
    taskCompleted: boolean
    folderCompleted: boolean
    delivery: WorkhubFolderNotifyDelivery
  }
  settingsFolderNotificationsBusy: boolean
  settingsClientId: string
  settingsStorageMethod: 'firebase' | 'drive'
  accessVisibility: WorkhubVisibility
  accessMemberUids: string[]
  hiddenFromSupporters?: boolean
  canToggleHiddenFromSupporters?: boolean
  restrictableMembers?: WorkhubMember[]
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
  onTechnicalProposalUrlChange: (value: string) => void
  onFinancialProposalUrlChange: (value: string) => void
  onValueAmountChange: (value: string) => void
  onValueCurrencyChange: (value: string) => void
  onMainPanelViewChange: (value: 'tasks' | 'dashboard' | 'dashboard_with_details') => void
  onTaskItemDisplayModeChange: (value: 'inherit' | 'list' | 'cards' | 'grid' | 'timeline') => void
  onTaskStatusesChange: (statuses: WorkhubTaskStatusConfig[] | null) => void
  onFolderNotificationsChange: (patch: Partial<{
    enabled: boolean
    taskCreated: boolean
    taskCompleted: boolean
    folderCompleted: boolean
    delivery: WorkhubFolderNotifyDelivery
  }>) => void
  onApplyViewSettingsToSubItems?: () => void
  applyViewSettingsBusy?: boolean
  onClientChange: (value: string) => void
  onCreateClientInline: (name: string) => Promise<string | null>
  onStorageMethodChange: (value: 'firebase' | 'drive') => void
  onVisibilityChange: (value: WorkhubVisibility) => void
  onHiddenFromSupportersChange?: (value: boolean) => void
  onToggleMember: (uid: string) => void
  onDelete: () => void
  onSave: () => void
  onEnsureDriveFolder?: () => void
  milestones?: WorkhubMilestone[]
  milestoneProgress?: Record<string, MilestoneProgress>
  canEditMilestones?: boolean
  onAddMilestone?: () => void
  onEditMilestone?: (milestone: WorkhubMilestone) => void
  onDeleteMilestone?: (milestoneId: string) => void
  onStatusChangeMilestone?: (milestoneId: string, newStatus: import('../../../lib/workhubRepo').WorkhubMilestoneStatus) => void
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
  const hiddenFromSupporters = props.hiddenFromSupporters ?? (props.accessVisibility === 'restricted')
  const canToggleHiddenFromSupporters = props.canToggleHiddenFromSupporters !== false
  const restrictableMembers = props.restrictableMembers || props.approvedMembers
  const hasDeleteBlockers = props.childCount > 0 || props.taskCount > 0
  const [advancedOpen, setAdvancedOpen] = useState(props.intent === 'proposal')
  const [editingTechnicalProposalUrl, setEditingTechnicalProposalUrl] = useState(props.settingsTechnicalProposalUrl.trim().length === 0)
  const [editingFinancialProposalUrl, setEditingFinancialProposalUrl] = useState(props.settingsFinancialProposalUrl.trim().length === 0)
  const [quickClientName, setQuickClientName] = useState('')

  useEffect(() => {
    setAdvancedOpen(props.intent === 'proposal')
  }, [props.intent, props.project.id])

  useEffect(() => {
    setEditingTechnicalProposalUrl(props.settingsTechnicalProposalUrl.trim().length === 0)
  }, [props.project.id, props.settingsTechnicalProposalUrl])

  useEffect(() => {
    setEditingFinancialProposalUrl(props.settingsFinancialProposalUrl.trim().length === 0)
  }, [props.project.id, props.settingsFinancialProposalUrl])

  useEffect(() => {
    setQuickClientName('')
  }, [props.project.id])

  function extractUrls(value: string): string[] {
    const source = (value || '').trim()
    if (!source) return []
    const matches = source.match(/(?:https?:\/\/|www\.)[^\s<]+/gi) || []
    const deduped: string[] = []
    for (const raw of matches) {
      const normalized = raw.replace(/[),.;!?]+$/g, '')
      if (!normalized) continue
      if (!deduped.includes(normalized)) deduped.push(normalized)
    }
    return deduped
  }

  function AutoGrowTextarea(input: {
    value: string
    rows?: number
    name?: string
    placeholder?: string
    disabled?: boolean
    onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void
  }) {
    const textareaRef = useRef<HTMLTextAreaElement | null>(null)
    const rows = input.rows || 4

    useEffect(() => {
      const element = textareaRef.current
      if (!element) return
      const maxAutoHeight = 280
      const minAutoHeight = Math.max(rows * 22, 90)
      element.style.height = 'auto'
      const nextHeight = Math.min(maxAutoHeight, Math.max(element.scrollHeight, minAutoHeight))
      element.style.height = `${nextHeight}px`
      element.style.overflowY = element.scrollHeight > maxAutoHeight ? 'auto' : 'hidden'
    }, [input.value, rows])

    return (
      <textarea
        ref={textareaRef}
        className="workhub-auto-grow-textarea"
        name={input.name}
        value={input.value}
        onChange={input.onChange}
        rows={rows}
        placeholder={input.placeholder}
        disabled={input.disabled}
      />
    )
  }

  function renderProposalUrlField(input: {
    label: string
    value: string
    name: string
    placeholder: string
    editing: boolean
    onEditToggle: (next: boolean) => void
    onChange: (value: string) => void
  }) {
    const trimmedValue = input.value.trim()
    if (!input.editing && trimmedValue) {
      return (
        <label className="workhub-span-2 workhub-project-settings-link-field">
          <span>{input.label}</span>
          <div className="workhub-project-settings-link-row">
            <a href={trimmedValue} target="_blank" rel="noreferrer" className="workhub-project-settings-link-value" title={trimmedValue}>
              {trimmedValue}
            </a>
            <button
              type="button"
              className="workhub-ghost-mini workhub-project-settings-link-edit-btn"
              onClick={() => input.onEditToggle(true)}
              aria-label={`Edit ${input.label}`}
              title={`Edit ${input.label}`}
            >
              ✏
            </button>
          </div>
        </label>
      )
    }

    return (
      <label className="workhub-span-2 workhub-project-settings-link-field">
        <span>{input.label}</span>
        <div className="workhub-project-settings-link-editor-row">
          <input
            name={input.name}
            type="url"
            value={input.value}
            onChange={(event) => input.onChange(event.target.value)}
            placeholder={input.placeholder}
          />
          {trimmedValue && (
            <button
              type="button"
              className="workhub-ghost-mini workhub-project-settings-link-edit-btn"
              onClick={() => input.onEditToggle(false)}
              aria-label={`Done editing ${input.label}`}
              title={`Done editing ${input.label}`}
            >
              ✓
            </button>
          )}
        </div>
      </label>
    )
  }

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
                <div className="workhub-col-span-3 workhub-project-settings-client-field">
                  <label>
                    <span>Client</span>
                    <select name="projectSettingsClient" value={props.settingsClientId} onChange={(event) => props.onClientChange(event.target.value)}>
                      <option value="">No client assigned</option>
                      {props.clientOptions.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
                    </select>
                  </label>
                  <div className="workhub-inline-row workhub-client-quick-add">
                    <input
                      type="text"
                      value={quickClientName}
                      onChange={(event) => setQuickClientName(event.target.value)}
                      placeholder="Add new client by name"
                    />
                    <button
                      type="button"
                      className="workhub-ghost-mini"
                      disabled={!quickClientName.trim() || props.busyKey === 'client:create'}
                      onClick={() => {
                        const name = quickClientName.trim()
                        if (!name) return
                        void props.onCreateClientInline(name).then((clientId) => {
                          if (!clientId) return
                          props.onClientChange(clientId)
                          setQuickClientName('')
                        })
                      }}
                    >
                      {props.busyKey === 'client:create' ? 'Adding…' : 'Add client'}
                    </button>
                  </div>
                </div>
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
                <span>{isFolderContainer ? 'Supporter visibility' : 'Access and visibility'}</span>
                {isFolderContainer ? (
                  <div className="workhub-project-settings-hidden-toggle-wrap">
                    <label className="workhub-project-settings-hidden-toggle">
                      <input
                        type="checkbox"
                        checked={hiddenFromSupporters}
                        onChange={(event) => {
                          if (!canToggleHiddenFromSupporters) return
                          if (props.onHiddenFromSupportersChange) {
                            props.onHiddenFromSupportersChange(event.target.checked)
                            return
                          }
                          props.onVisibilityChange(event.target.checked ? 'restricted' : 'workspace')
                        }}
                        disabled={!canToggleHiddenFromSupporters}
                      />
                      <span className={`workhub-access-label${hiddenFromSupporters ? ' is-active' : ''}`}>Hidden from supporters</span>
                    </label>
                    <span className="workhub-project-settings-hidden-toggle-help">
                      {hiddenFromSupporters
                        ? 'This folder and its child items are hidden from supporters.'
                        : 'Supporters can currently see this folder.'}
                    </span>
                    {!canToggleHiddenFromSupporters && (
                      <span className="workhub-project-settings-hidden-toggle-note">Only admins can change this setting.</span>
                    )}
                  </div>
                ) : (
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
                )}
              </div>
            </div>

            {(isFolderContainer ? hiddenFromSupporters : props.accessVisibility === 'restricted') && (
              <div className="workhub-member-picker workhub-project-settings-member-picker">
                {restrictableMembers.map((item) => {
                  const checked = props.accessMemberUids.includes(item.uid)
                  return (
                    <button
                      key={item.uid}
                      type="button"
                      className={`workhub-member-chip${checked ? ' is-selected' : ''}`}
                      onClick={() => {
                        if (isFolderContainer && !canToggleHiddenFromSupporters) return
                        props.onToggleMember(item.uid)
                      }}
                      disabled={isFolderContainer && !canToggleHiddenFromSupporters}
                    >
                      {item.displayName || item.email}
                    </button>
                  )
                })}
                {restrictableMembers.length === 0 && (
                  <span className="workhub-project-settings-member-picker-note">No extra members are available for this hidden scope.</span>
                )}
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
                <AutoGrowTextarea
                  name="projectSettingsDescription"
                  value={props.settingsDescription}
                  onChange={(event) => props.onDescriptionChange(event.target.value)}
                  rows={4}
                  placeholder={`${entityLabel} details`}
                />
                {extractUrls(props.settingsDescription).length > 0 && (
                  <div className="workhub-detected-links" aria-label="Detected links in description">
                    {extractUrls(props.settingsDescription).map((url) => {
                      const href = /^https?:\/\//i.test(url) ? url : `https://${url}`
                      return (
                        <a key={url} href={href} target="_blank" rel="noreferrer noopener" className="workhub-detected-link">
                          {url}
                        </a>
                      )
                    })}
                  </div>
                )}
              </label>

              <div className="workhub-project-settings-color-field">
                <span>Status</span>
                <div className="workhub-status-options">
                  {props.projectColors.map((color) => {
                    const colorMeaning = colorMeaningByColor.get(color.toLowerCase()) || {
                      color,
                      label: color,
                      hint: color,
                    }
                    const colorLabel = `${colorMeaning.label}: ${colorMeaning.hint}`
                    return (
                      <button
                        key={color}
                        type="button"
                        className={`workhub-status-option${props.settingsColor === color ? ' active' : ''}`}
                        onClick={() => props.onColorChange(color)}
                        title={colorLabel}
                        aria-label={colorLabel}
                      >
                        <span className="workhub-status-option-dot" style={{ background: color }} aria-hidden="true" />
                        <span className="workhub-status-option-label">{colorMeaning.label}</span>
                      </button>
                    )
                  })}
                </div>
                <div className="workhub-color-meaning-note">
                  <strong>{selectedColorMeaning.label}</strong>
                  <span>{selectedColorMeaning.hint}</span>
                </div>
                {props.statusSuggestion && (
                  <div className={`workhub-project-settings-suggestion${props.statusSuggestion.applied ? ' is-applied' : ''}`}>
                    <div className="workhub-project-settings-suggestion-copy">
                      <strong>{props.statusSuggestion.title}</strong>
                      <span>{props.statusSuggestion.applied ? (props.statusSuggestion.appliedLabel || props.statusSuggestion.description) : props.statusSuggestion.description}</span>
                    </div>
                    <div className="workhub-project-settings-suggestion-actions">
                      {!props.statusSuggestion.applied && props.statusSuggestion.onApply && props.statusSuggestion.buttonLabel && (
                        <button type="button" className="workhub-primary-mini" onClick={props.statusSuggestion.onApply}>
                          {props.statusSuggestion.buttonLabel}
                        </button>
                      )}
                      {props.statusSuggestion.applied && props.statusSuggestion.onCancel && (
                        <button type="button" className="workhub-ghost-mini" onClick={props.statusSuggestion.onCancel}>
                          {props.statusSuggestion.cancelLabel || 'Cancel'}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <details className="workhub-project-settings-advanced" open={advancedOpen} onToggle={(event) => setAdvancedOpen((event.currentTarget as HTMLDetailsElement).open)}>
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
                    {props.intent === 'proposal' && renderProposalUrlField({
                      label: 'Technical proposal URL',
                      value: props.settingsTechnicalProposalUrl,
                      name: 'projectSettingsTechnicalProposalUrl',
                      placeholder: 'https://...',
                      editing: editingTechnicalProposalUrl,
                      onEditToggle: setEditingTechnicalProposalUrl,
                      onChange: props.onTechnicalProposalUrlChange,
                    })}
                    {props.intent === 'proposal' && renderProposalUrlField({
                      label: 'Financial proposal URL',
                      value: props.settingsFinancialProposalUrl,
                      name: 'projectSettingsFinancialProposalUrl',
                      placeholder: 'https://...',
                      editing: editingFinancialProposalUrl,
                      onEditToggle: setEditingFinancialProposalUrl,
                      onChange: props.onFinancialProposalUrlChange,
                    })}
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
                    <button
                      type="button"
                      className={`workhub-switcher-btn${props.settingsMainPanelView === 'dashboard_with_details' ? ' is-active' : ''}`}
                      onClick={() => props.onMainPanelViewChange('dashboard_with_details')}
                    >
                      Dashboard + details
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
                      onChange={(event) => props.onTaskItemDisplayModeChange(event.target.value as 'inherit' | 'list' | 'cards' | 'grid' | 'timeline')}
                      style={{ marginTop: 6 }}
                    >
                      <option value="inherit">Inherit from parent folder</option>
                      <option value="list">List rows</option>
                      <option value="cards">Cards</option>
                      <option value="grid">Grid</option>
                      <option value="timeline">Timeline</option>
                    </select>
                  </label>
                )}
                {isFolderContainer && (
                  <div className="workhub-project-folder-notify-card">
                    <div className="workhub-project-folder-notify-head">
                      <span>My folder notifications</span>
                      {props.settingsFolderNotificationsBusy && <small>Saving…</small>}
                    </div>
                    <label className="workhub-project-folder-notify-toggle">
                      <input
                        type="checkbox"
                        checked={props.settingsFolderNotifications.enabled}
                        onChange={(event) => props.onFolderNotificationsChange({ enabled: event.target.checked })}
                      />
                      <span>Activate notifications for this folder</span>
                    </label>
                    <div className="workhub-project-folder-notify-grid">
                      <label>
                        <input
                          type="checkbox"
                          checked={props.settingsFolderNotifications.taskCreated}
                          disabled={!props.settingsFolderNotifications.enabled}
                          onChange={(event) => props.onFolderNotificationsChange({ taskCreated: event.target.checked })}
                        />
                        <span>When new tasks are created</span>
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={props.settingsFolderNotifications.taskCompleted}
                          disabled={!props.settingsFolderNotifications.enabled}
                          onChange={(event) => props.onFolderNotificationsChange({ taskCompleted: event.target.checked })}
                        />
                        <span>When a task is completed</span>
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={props.settingsFolderNotifications.folderCompleted}
                          disabled={!props.settingsFolderNotifications.enabled}
                          onChange={(event) => props.onFolderNotificationsChange({ folderCompleted: event.target.checked })}
                        />
                        <span>When the folder reaches 100% completion</span>
                      </label>
                    </div>
                    <label className="workhub-project-folder-notify-delivery">
                      <span>Delivery</span>
                      <select
                        value={props.settingsFolderNotifications.delivery}
                        disabled={!props.settingsFolderNotifications.enabled}
                        onChange={(event) => props.onFolderNotificationsChange({ delivery: event.target.value as WorkhubFolderNotifyDelivery })}
                      >
                        <option value="in_app">In-app notification only</option>
                        <option value="both">In-app + email</option>
                      </select>
                    </label>
                  </div>
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

        {props.milestones !== undefined && (
          <div style={{ padding: '0 24px 16px' }}>
            <MilestonesPanel
              milestones={props.milestones}
              milestoneProgress={props.milestoneProgress ?? {}}
              canEdit={props.canEditMilestones ?? false}
              projectName={props.project?.name}
              onAdd={props.onAddMilestone ?? (() => {})}
              onEdit={props.onEditMilestone ?? (() => {})}
              onDelete={props.onDeleteMilestone ?? (() => {})}
              onStatusChange={props.onStatusChangeMilestone ?? (() => {})}
            />
          </div>
        )}

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
