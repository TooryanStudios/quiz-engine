import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import type { WorkhubProjectIntent, WorkhubProjectType } from '../../../lib/workhubRepo'

interface WorkhubProjectTypeOption {
  value: WorkhubProjectType
  label: string
}

export interface WorkhubEntityIntentDetailFormProps {
  intent: WorkhubProjectIntent
  canEdit: boolean
  name: string
  onNameChange: (value: string) => void
  onNameEnter: () => void
  projectType: WorkhubProjectType
  typeOptions: WorkhubProjectTypeOption[]
  onProjectTypeChange: (value: WorkhubProjectType) => void
  startDate: string
  onStartDateChange: (value: string) => void
  deadline: string
  onDeadlineChange: (value: string) => void
  submissionTime: string
  onSubmissionTimeChange: (value: string) => void
  valueAmount: string
  onValueAmountChange: (value: string) => void
  valueCurrency: string
  onValueCurrencyChange: (value: string) => void
  narrative: string
  onNarrativeChange: (value: string) => void
  onNarrativeBlur: () => void
  detailDrafts: Record<string, string>
  onDetailDraftChange: (key: string, value: string) => void
  proposalServiceOptions: string[]
  selectedProposalServices: string[]
  onSelectedProposalServicesChange: (services: string[]) => void
  canCreateProposalServiceOption: boolean
  onCreateProposalServiceOption: (name: string) => void
}

function normalizeServiceLabel(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function normalizeServiceKey(value: string): string {
  return normalizeServiceLabel(value).toLowerCase()
}

function dedupeServices(values: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  values.forEach((value) => {
    const normalized = normalizeServiceLabel(value)
    const key = normalizeServiceKey(normalized)
    if (!normalized || seen.has(key)) return
    seen.add(key)
    result.push(normalized)
  })
  return result
}

function AutoGrowTextarea(props: {
  value: string
  className?: string
  rows?: number
  placeholder?: string
  disabled?: boolean
  onChange: (event: ChangeEvent<HTMLTextAreaElement>) => void
  onBlur?: () => void
}) {
  const { className, rows = 4, value } = props
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    const element = textareaRef.current
    if (!element) return
    const maxAutoHeight = 280
    const minAutoHeight = Math.max(rows * 22, 88)
    element.style.height = 'auto'
    const nextHeight = Math.min(maxAutoHeight, Math.max(element.scrollHeight, minAutoHeight))
    element.style.height = `${nextHeight}px`
    element.style.overflowY = element.scrollHeight > maxAutoHeight ? 'auto' : 'hidden'
  }, [rows, value])

  return (
    <textarea
      ref={textareaRef}
      value={props.value}
      onChange={props.onChange}
      onBlur={props.onBlur}
      rows={rows}
      placeholder={props.placeholder}
      disabled={props.disabled}
      className={`${className || ''} workhub-auto-grow-textarea`.trim()}
    />
  )
}

function renderTypeField(props: WorkhubEntityIntentDetailFormProps, label: string) {
  return (
    <label>
      <span>{label}</span>
      <select
        value={props.projectType}
        onChange={(event) => props.onProjectTypeChange(event.target.value as WorkhubProjectType)}
        disabled={!props.canEdit || props.typeOptions.length <= 1}
      >
        {props.typeOptions.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  )
}

function renderNameField(props: WorkhubEntityIntentDetailFormProps, label: string, placeholder: string) {
  return (
    <label>
      <span>{label}</span>
      <input
        value={props.name}
        onChange={(event) => props.onNameChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return
          event.preventDefault()
          if (!props.canEdit) return
          props.onNameEnter()
        }}
        placeholder={placeholder}
        disabled={!props.canEdit}
      />
    </label>
  )
}

function renderNarrativeField(
  props: WorkhubEntityIntentDetailFormProps,
  label: string,
  placeholder: string,
  rows = 4,
) {
  return (
    <label className="workhub-span-2">
      <span>{label}</span>
      <AutoGrowTextarea
        value={props.narrative}
        onChange={(event) => props.onNarrativeChange(event.target.value)}
        onBlur={props.onNarrativeBlur}
        rows={rows}
        placeholder={placeholder}
        disabled={!props.canEdit}
      />
      {renderDetectedLinks(props.narrative)}
    </label>
  )
}

function renderMonetaryValueFields(
  props: WorkhubEntityIntentDetailFormProps,
  amountLabel: string,
  amountPlaceholder: string,
) {
  const displayValue = props.valueAmount === '' || props.valueAmount === '0'
    ? props.valueAmount
    : (() => {
        const n = parseFloat(props.valueAmount.replace(/,/g, ''))
        return Number.isFinite(n) ? n.toLocaleString('en-US') : props.valueAmount
      })()
  return (
    <div className="workhub-field-grid two compact workhub-span-2">
      <label className="workhub-span-2">
        <span style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'space-between' }}>
          <span>{amountLabel}</span>
          <span style={{ fontWeight: 600, color: '#4a5e78', fontSize: '0.78rem' }}>{props.valueCurrency || 'OMR'}</span>
        </span>
        <input
          type="text"
          inputMode="decimal"
          value={displayValue}
          onChange={(event) => props.onValueAmountChange(event.target.value.replace(/,/g, ''))}
          placeholder={amountPlaceholder}
          disabled={!props.canEdit}
        />
      </label>
    </div>
  )
}

function detailValue(props: WorkhubEntityIntentDetailFormProps, key: string): string {
  return props.detailDrafts[key] || ''
}

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

function renderDetectedLinks(value: string) {
  const links = extractUrls(value)
  if (links.length === 0) return null
  return (
    <div className="workhub-detected-links" aria-label="Detected links">
      {links.map((url) => {
        const href = /^https?:\/\//i.test(url) ? url : `https://${url}`
        return (
          <a key={url} href={href} target="_blank" rel="noreferrer noopener" className="workhub-detected-link">
            {url}
          </a>
        )
      })}
    </div>
  )
}

function ProjectIntentDetailForm(props: WorkhubEntityIntentDetailFormProps) {
  return (
    <div className="workhub-detail-grid workhub-project-detail-grid workhub-employee-profile-detail-grid">
      {renderNameField(props, 'Folder name', 'Folder name')}
      {renderNarrativeField(props, 'Description', 'Folder notes')}
    </div>
  )
}

function ProposalIntentDetailForm(props: WorkhubEntityIntentDetailFormProps) {
  const [newServiceName, setNewServiceName] = useState('')
  const [servicesExpanded, setServicesExpanded] = useState(false)
  const selectedServiceKeys = useMemo(
    () => new Set(props.selectedProposalServices.map((value) => normalizeServiceKey(value))),
    [props.selectedProposalServices],
  )

  const sortedServiceOptions = useMemo(
    () => dedupeServices(props.proposalServiceOptions),
    [props.proposalServiceOptions],
  )

  const handleToggleService = (value: string, checked: boolean) => {
    const next = normalizeServiceLabel(value)
    if (!next) return
    if (checked) {
      props.onSelectedProposalServicesChange(dedupeServices([...props.selectedProposalServices, next]))
      return
    }
    const targetKey = normalizeServiceKey(next)
    props.onSelectedProposalServicesChange(
      props.selectedProposalServices.filter((item) => normalizeServiceKey(item) !== targetKey),
    )
  }

  const handleCreateService = () => {
    if (!props.canCreateProposalServiceOption) return
    const next = normalizeServiceLabel(newServiceName)
    if (!next) return
    props.onCreateProposalServiceOption(next)
    props.onSelectedProposalServicesChange(dedupeServices([...props.selectedProposalServices, next]))
    setNewServiceName('')
  }

  const handleRemoveService = (value: string) => {
    const targetKey = normalizeServiceKey(value)
    props.onSelectedProposalServicesChange(
      props.selectedProposalServices.filter((item) => normalizeServiceKey(item) !== targetKey),
    )
  }

  return (
    <div className="workhub-detail-grid workhub-project-detail-grid">
      {renderNameField(props, 'Proposal title', 'Proposal title')}
      {renderTypeField(props, 'Proposal type')}
      <div className="workhub-field-grid two compact workhub-project-detail-date-grid workhub-span-2">
        <label>
          <span>Start date</span>
          <input
            type="date"
            value={props.startDate}
            onChange={(event) => props.onStartDateChange(event.target.value)}
            disabled={!props.canEdit}
          />
        </label>
        <label>
          <span>Submission date</span>
          <input
            type="date"
            value={props.deadline}
            onChange={(event) => props.onDeadlineChange(event.target.value)}
            disabled={!props.canEdit}
          />
        </label>
        <label>
          <span>Submission time</span>
          <input
            type="time"
            value={props.submissionTime}
            onChange={(event) => props.onSubmissionTimeChange(event.target.value)}
            disabled={!props.canEdit}
          />
        </label>
      </div>
      {renderMonetaryValueFields(props, 'Estimated value', '250000')}
      <label className="workhub-span-2">
        <span>Services provided</span>
        <div className="workhub-proposal-services-stack">
          <div className="workhub-proposal-services-collapsible">
            <button
              type="button"
              className="workhub-proposal-services-toggle"
              onClick={() => setServicesExpanded((current) => !current)}
              aria-expanded={servicesExpanded}
              aria-controls="workhub-proposal-services-checklist"
            >
              <span>{`Company services (${sortedServiceOptions.length})`}</span>
              <span className="workhub-proposal-services-toggle-meta">
                <strong>{`${props.selectedProposalServices.length} selected`}</strong>
                <span aria-hidden="true">{servicesExpanded ? '▴' : '▾'}</span>
              </span>
            </button>

            {servicesExpanded && (
              <div
                id="workhub-proposal-services-checklist"
                className="workhub-proposal-services-checklist"
                role="group"
                aria-label="Available company services"
              >
                {sortedServiceOptions.map((service) => {
                  const key = normalizeServiceKey(service)
                  const checked = selectedServiceKeys.has(key)
                  return (
                    <label key={service} className="workhub-proposal-service-option">
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={!props.canEdit}
                        onChange={(event) => handleToggleService(service, event.target.checked)}
                      />
                      <span>{service}</span>
                    </label>
                  )
                })}
              </div>
            )}
          </div>

          {props.selectedProposalServices.length > 0 && (
            <ul className="workhub-proposal-selected-services-list">
              {props.selectedProposalServices.map((service) => (
                <li key={service} className="workhub-proposal-selected-service-item">
                  <span>{service}</span>
                  {props.canEdit && (
                    <button
                      type="button"
                      className="workhub-proposal-service-chip-remove"
                      onClick={() => handleRemoveService(service)}
                      aria-label={`Remove ${service}`}
                      title={`Remove ${service}`}
                    >
                      ×
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}

          <div className="workhub-proposal-services-picker">
            <input
              type="text"
              value={newServiceName}
              onChange={(event) => setNewServiceName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter') return
                event.preventDefault()
                if (!props.canCreateProposalServiceOption || !normalizeServiceLabel(newServiceName)) return
                handleCreateService()
              }}
              placeholder="Add new global service (e.g. Animation)"
              disabled={!props.canCreateProposalServiceOption}
            />
            <button
              type="button"
              className="workhub-primary-mini"
              onClick={handleCreateService}
              disabled={!props.canCreateProposalServiceOption || !normalizeServiceLabel(newServiceName)}
            >
              Create
            </button>
          </div>
        </div>
      </label>
      {renderNarrativeField(props, 'Proposal scope', 'Proposal scope, assumptions, and notes')}
    </div>
  )
}

function LeadIntentDetailForm(props: WorkhubEntityIntentDetailFormProps) {
  return (
    <div className="workhub-detail-grid workhub-project-detail-grid">
      {renderNameField(props, 'Lead name', 'Lead name')}
      {renderTypeField(props, 'Lead type')}
      <div className="workhub-field-grid two compact workhub-project-detail-date-grid workhub-span-2">
        <label>
          <span>Start date</span>
          <input
            type="date"
            value={props.startDate}
            onChange={(event) => props.onStartDateChange(event.target.value)}
            disabled={!props.canEdit}
          />
        </label>
        <label>
          <span>Expected close date</span>
          <input
            type="date"
            value={props.deadline}
            onChange={(event) => props.onDeadlineChange(event.target.value)}
            disabled={!props.canEdit}
          />
        </label>
      </div>
      {renderMonetaryValueFields(props, 'Potential value', '50000')}
      <label>
        <span>Lead source</span>
        <input
          value={detailValue(props, 'lead source')}
          onChange={(event) => props.onDetailDraftChange('lead source', event.target.value)}
          placeholder="Referral, website, outbound"
          disabled={!props.canEdit}
        />
      </label>
      <label className="workhub-span-2">
        <span>Qualification notes</span>
        <AutoGrowTextarea
          value={detailValue(props, 'qualification notes')}
          onChange={(event) => props.onDetailDraftChange('qualification notes', event.target.value)}
          rows={3}
          placeholder="Need, budget, authority, timeline"
          disabled={!props.canEdit}
        />
        {renderDetectedLinks(detailValue(props, 'qualification notes'))}
      </label>
      {renderNarrativeField(props, 'Lead details', 'Lead context and follow-up notes')}
    </div>
  )
}

function FinanceInvoiceStreamIntentDetailForm(props: WorkhubEntityIntentDetailFormProps) {
  return (
    <div className="workhub-detail-grid workhub-project-detail-grid">
      {renderNameField(props, 'Invoice stream name', 'Invoice stream name')}
      {renderTypeField(props, 'Finance type')}
      <div className="workhub-field-grid two compact workhub-project-detail-date-grid workhub-span-2">
        <label>
          <span>Start date</span>
          <input
            type="date"
            value={props.startDate}
            onChange={(event) => props.onStartDateChange(event.target.value)}
            disabled={!props.canEdit}
          />
        </label>
        <label>
          <span>First due date</span>
          <input
            type="date"
            value={props.deadline}
            onChange={(event) => props.onDeadlineChange(event.target.value)}
            disabled={!props.canEdit}
          />
        </label>
      </div>
      {renderMonetaryValueFields(props, 'Invoice stream value', '100000')}
      <label>
        <span>Billing cycle</span>
        <input
          value={detailValue(props, 'billing cycle')}
          onChange={(event) => props.onDetailDraftChange('billing cycle', event.target.value)}
          placeholder="Weekly, monthly, quarterly"
          disabled={!props.canEdit}
        />
      </label>
      <label>
        <span>Approval owner</span>
        <input
          value={detailValue(props, 'approval owner')}
          onChange={(event) => props.onDetailDraftChange('approval owner', event.target.value)}
          placeholder="Finance owner"
          disabled={!props.canEdit}
        />
      </label>
      {renderNarrativeField(props, 'Invoice stream notes', 'Controls, thresholds, and operating notes')}
    </div>
  )
}

function FinancePaymentCycleIntentDetailForm(props: WorkhubEntityIntentDetailFormProps) {
  return (
    <div className="workhub-detail-grid workhub-project-detail-grid">
      {renderNameField(props, 'Payment cycle name', 'Payment cycle name')}
      {renderTypeField(props, 'Finance type')}
      <div className="workhub-field-grid two compact workhub-project-detail-date-grid workhub-span-2">
        <label>
          <span>Start date</span>
          <input
            type="date"
            value={props.startDate}
            onChange={(event) => props.onStartDateChange(event.target.value)}
            disabled={!props.canEdit}
          />
        </label>
        <label>
          <span>Disbursement date</span>
          <input
            type="date"
            value={props.deadline}
            onChange={(event) => props.onDeadlineChange(event.target.value)}
            disabled={!props.canEdit}
          />
        </label>
      </div>
      {renderMonetaryValueFields(props, 'Payment cycle value', '100000')}
      <label>
        <span>Payment owner</span>
        <input
          value={detailValue(props, 'payment owner')}
          onChange={(event) => props.onDetailDraftChange('payment owner', event.target.value)}
          placeholder="Approval owner"
          disabled={!props.canEdit}
        />
      </label>
      {renderNarrativeField(props, 'Payment cycle notes', 'Cycle checkpoints and escalation notes')}
    </div>
  )
}

function MarketingCampaignIntentDetailForm(props: WorkhubEntityIntentDetailFormProps) {
  return (
    <div className="workhub-detail-grid workhub-project-detail-grid">
      {renderNameField(props, 'Campaign name', 'Campaign name')}
      {renderTypeField(props, 'Campaign type')}
      <div className="workhub-field-grid two compact workhub-project-detail-date-grid workhub-span-2">
        <label>
          <span>Launch date</span>
          <input
            type="date"
            value={props.startDate}
            onChange={(event) => props.onStartDateChange(event.target.value)}
            disabled={!props.canEdit}
          />
        </label>
        <label>
          <span>Campaign end date</span>
          <input
            type="date"
            value={props.deadline}
            onChange={(event) => props.onDeadlineChange(event.target.value)}
            disabled={!props.canEdit}
          />
        </label>
      </div>
      {renderMonetaryValueFields(props, 'Campaign budget value', '20000')}
      <label>
        <span>Campaign objective</span>
        <input
          value={detailValue(props, 'campaign objective')}
          onChange={(event) => props.onDetailDraftChange('campaign objective', event.target.value)}
          placeholder="Awareness, lead-gen, conversion"
          disabled={!props.canEdit}
        />
      </label>
      <label>
        <span>Primary channel</span>
        <input
          value={detailValue(props, 'primary channel')}
          onChange={(event) => props.onDetailDraftChange('primary channel', event.target.value)}
          placeholder="Social, email, paid ads"
          disabled={!props.canEdit}
        />
      </label>
      {renderNarrativeField(props, 'Campaign details', 'Audience, messaging, and execution notes')}
    </div>
  )
}

function MarketingContentStreamIntentDetailForm(props: WorkhubEntityIntentDetailFormProps) {
  return (
    <div className="workhub-detail-grid workhub-project-detail-grid">
      {renderNameField(props, 'Content stream name', 'Content stream name')}
      {renderTypeField(props, 'Content type')}
      <div className="workhub-field-grid two compact workhub-project-detail-date-grid workhub-span-2">
        <label>
          <span>Content stream start date</span>
          <input
            type="date"
            value={props.startDate}
            onChange={(event) => props.onStartDateChange(event.target.value)}
            disabled={!props.canEdit}
          />
        </label>
        <label>
          <span>Target date</span>
          <input
            type="date"
            value={props.deadline}
            onChange={(event) => props.onDeadlineChange(event.target.value)}
            disabled={!props.canEdit}
          />
        </label>
      </div>
      {renderMonetaryValueFields(props, 'Content budget value', '10000')}
      <label>
        <span>Channel</span>
        <input
          value={detailValue(props, 'channel')}
          onChange={(event) => props.onDetailDraftChange('channel', event.target.value)}
          placeholder="LinkedIn, YouTube, blog"
          disabled={!props.canEdit}
        />
      </label>
      <label>
        <span>Cadence</span>
        <input
          value={detailValue(props, 'cadence')}
          onChange={(event) => props.onDetailDraftChange('cadence', event.target.value)}
          placeholder="Daily, weekly, bi-weekly"
          disabled={!props.canEdit}
        />
      </label>
      {renderNarrativeField(props, 'Content stream details', 'Content format mix and production notes')}
    </div>
  )
}

function HrRequisitionIntentDetailForm(props: WorkhubEntityIntentDetailFormProps) {
  return (
    <div className="workhub-detail-grid workhub-project-detail-grid">
      {renderNameField(props, 'Requisition title', 'Requisition title')}
      {renderTypeField(props, 'Hiring type')}
      <div className="workhub-field-grid two compact workhub-project-detail-date-grid workhub-span-2">
        <label>
          <span>Start date</span>
          <input
            type="date"
            value={props.startDate}
            onChange={(event) => props.onStartDateChange(event.target.value)}
            disabled={!props.canEdit}
          />
        </label>
        <label>
          <span>Target hire date</span>
          <input
            type="date"
            value={props.deadline}
            onChange={(event) => props.onDeadlineChange(event.target.value)}
            disabled={!props.canEdit}
          />
        </label>
      </div>
      <label>
        <span>Department</span>
        <input
          value={detailValue(props, 'department')}
          onChange={(event) => props.onDetailDraftChange('department', event.target.value)}
          placeholder="Department"
          disabled={!props.canEdit}
        />
      </label>
      <label>
        <span>Hiring manager</span>
        <input
          value={detailValue(props, 'hiring manager')}
          onChange={(event) => props.onDetailDraftChange('hiring manager', event.target.value)}
          placeholder="Hiring manager"
          disabled={!props.canEdit}
        />
      </label>
      {renderNarrativeField(props, 'Requisition details', 'Role scope and recruiting notes')}
    </div>
  )
}

function HrOnboardingTrackIntentDetailForm(props: WorkhubEntityIntentDetailFormProps) {
  return (
    <div className="workhub-detail-grid workhub-project-detail-grid">
      {renderNameField(props, 'Onboarding track name', 'Onboarding track name')}
      {renderTypeField(props, 'Onboarding type')}
      <div className="workhub-field-grid two compact workhub-project-detail-date-grid workhub-span-2">
        <label>
          <span>Onboarding start date</span>
          <input
            type="date"
            value={props.startDate}
            onChange={(event) => props.onStartDateChange(event.target.value)}
            disabled={!props.canEdit}
          />
        </label>
        <label>
          <span>Completion target</span>
          <input
            type="date"
            value={props.deadline}
            onChange={(event) => props.onDeadlineChange(event.target.value)}
            disabled={!props.canEdit}
          />
        </label>
      </div>
      <label>
        <span>Onboarding owner</span>
        <input
          value={detailValue(props, 'onboarding owner')}
          onChange={(event) => props.onDetailDraftChange('onboarding owner', event.target.value)}
          placeholder="Onboarding owner"
          disabled={!props.canEdit}
        />
      </label>
      {renderNarrativeField(props, 'Onboarding details', 'Milestones, handover points, and notes')}
    </div>
  )
}

function HrDepartmentUnitIntentDetailForm(props: WorkhubEntityIntentDetailFormProps) {
  return (
    <div className="workhub-detail-grid workhub-project-detail-grid">
      {renderNameField(props, 'Department name', 'Department name')}
      {renderTypeField(props, 'Department type')}
      <label>
        <span>Department code</span>
        <input
          value={detailValue(props, 'department code')}
          onChange={(event) => props.onDetailDraftChange('department code', event.target.value)}
          placeholder="HR-OPS"
          disabled={!props.canEdit}
        />
      </label>
      <label>
        <span>Head of department</span>
        <input
          value={detailValue(props, 'head of department')}
          onChange={(event) => props.onDetailDraftChange('head of department', event.target.value)}
          placeholder="Department owner"
          disabled={!props.canEdit}
        />
      </label>
      <label>
        <span>Cost center</span>
        <input
          value={detailValue(props, 'cost center')}
          onChange={(event) => props.onDetailDraftChange('cost center', event.target.value)}
          placeholder="CC-104"
          disabled={!props.canEdit}
        />
      </label>
      <label>
        <span>Primary location</span>
        <input
          value={detailValue(props, 'primary location')}
          onChange={(event) => props.onDetailDraftChange('primary location', event.target.value)}
          placeholder="HQ, Muscat"
          disabled={!props.canEdit}
        />
      </label>
      {renderNarrativeField(props, 'Department notes', 'Scope, headcount model, and operating notes')}
    </div>
  )
}

function HrSubDepartmentUnitIntentDetailForm(props: WorkhubEntityIntentDetailFormProps) {
  return (
    <div className="workhub-detail-grid workhub-project-detail-grid">
      {renderNameField(props, 'Sub-department name', 'Sub-department name')}
      {renderTypeField(props, 'Sub-department type')}
      <label>
        <span>Department</span>
        <input
          value={detailValue(props, 'department')}
          onChange={(event) => props.onDetailDraftChange('department', event.target.value)}
          placeholder="Parent department"
          disabled={!props.canEdit}
        />
      </label>
      <label>
        <span>Sub-department lead</span>
        <input
          value={detailValue(props, 'sub-department lead')}
          onChange={(event) => props.onDetailDraftChange('sub-department lead', event.target.value)}
          placeholder="Lead name"
          disabled={!props.canEdit}
        />
      </label>
      <label>
        <span>Function</span>
        <input
          value={detailValue(props, 'function')}
          onChange={(event) => props.onDetailDraftChange('function', event.target.value)}
          placeholder="Payroll, benefits, talent ops"
          disabled={!props.canEdit}
        />
      </label>
      <label>
        <span>Headcount cap</span>
        <input
          value={detailValue(props, 'headcount cap')}
          onChange={(event) => props.onDetailDraftChange('headcount cap', event.target.value)}
          placeholder="15"
          disabled={!props.canEdit}
        />
      </label>
      {renderNarrativeField(props, 'Sub-department notes', 'Roles, service ownership, and interfaces')}
    </div>
  )
}

function HrEmployeeProfileIntentDetailForm(props: WorkhubEntityIntentDetailFormProps) {
  const [salaryOpen, setSalaryOpen] = useState(false)
  const departmentValue = detailValue(props, 'department')
  const subDepartmentValue = detailValue(props, 'sub-department')
  const managerValue = detailValue(props, 'manager employee id') || detailValue(props, 'reporting manager')
  const genderValue = detailValue(props, 'gender')
  const authorityLevelValue = detailValue(props, 'authority level')
  const employmentStatusValue = detailValue(props, 'employee status') || detailValue(props, 'employment status')
  const workModeValue = detailValue(props, 'work mode')
  const employmentTypeValue = detailValue(props, 'employment type')

  return (
    <div className="workhub-detail-grid workhub-project-detail-grid">
      {renderNameField(props, 'Employee display name', 'Employee display name')}
      {renderTypeField(props, 'Employment profile type')}

      <h4 className="workhub-span-2">Identity</h4>
      <label>
        <span>Employee ID</span>
        <input
          value={detailValue(props, 'employee id')}
          onChange={(event) => props.onDetailDraftChange('employee id', event.target.value)}
          placeholder="EMP-1042"
          disabled={!props.canEdit}
        />
      </label>
      <label>
        <span>Name in Arabic</span>
        <input
          value={detailValue(props, 'name in arabic') || detailValue(props, 'preferred name')}
          onChange={(event) => props.onDetailDraftChange('name in arabic', event.target.value)}
          placeholder="Employee name in Arabic"
          disabled={!props.canEdit}
        />
      </label>
      <label>
        <span>Birthday</span>
        <input
          type="date"
          value={detailValue(props, 'birthday')}
          onChange={(event) => props.onDetailDraftChange('birthday', event.target.value)}
          disabled={!props.canEdit}
        />
      </label>
      <label>
        <span>Gender</span>
        <select
          value={genderValue}
          onChange={(event) => props.onDetailDraftChange('gender', event.target.value)}
          disabled={!props.canEdit}
        >
          <option value="">Select gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="non_binary">Non-binary</option>
          <option value="prefer_not_to_say">Prefer not to say</option>
        </select>
      </label>
      <label>
        <span>Work email</span>
        <input
          value={detailValue(props, 'work email')}
          onChange={(event) => props.onDetailDraftChange('work email', event.target.value)}
          placeholder="name@company.com"
          disabled={!props.canEdit}
        />
      </label>
      <label>
        <span>Phone</span>
        <input
          value={detailValue(props, 'phone')}
          onChange={(event) => props.onDetailDraftChange('phone', event.target.value)}
          placeholder="+968 ..."
          disabled={!props.canEdit}
        />
      </label>

      <h4 className="workhub-span-2">Organization</h4>
      <label>
        <span>Department</span>
        <input
          value={departmentValue}
          placeholder="Auto from parent department"
          disabled
        />
      </label>
      <label>
        <span>Sub-department</span>
        <input
          value={subDepartmentValue}
          placeholder="Auto from parent sub-department"
          disabled
        />
      </label>
      <label>
        <span>Job title</span>
        <input
          value={detailValue(props, 'job title')}
          onChange={(event) => props.onDetailDraftChange('job title', event.target.value)}
          placeholder="Job title"
          disabled={!props.canEdit}
        />
      </label>
      <label>
        <span>Reporting manager</span>
        <input
          value={managerValue}
          placeholder="Auto from department stakeholders"
          disabled
        />
      </label>

      <h4 className="workhub-span-2">Employment</h4>
      <div className="workhub-field-grid two compact workhub-span-2">
        <label>
          <span>Employment status</span>
          <select
            value={employmentStatusValue}
            onChange={(event) => props.onDetailDraftChange('employee status', event.target.value)}
            disabled={!props.canEdit}
          >
            <option value="">Select status</option>
            <option value="active">Active</option>
            <option value="probation">Probation</option>
            <option value="leave">On leave</option>
            <option value="suspended">Suspended</option>
            <option value="resigned">Resigned</option>
            <option value="terminated">Terminated</option>
          </select>
        </label>
        <label>
          <span>Work mode</span>
          <select
            value={workModeValue}
            onChange={(event) => props.onDetailDraftChange('work mode', event.target.value)}
            disabled={!props.canEdit}
          >
            <option value="">Select work mode</option>
            <option value="on_site">On-site</option>
            <option value="remote">Remote</option>
            <option value="hybrid">Hybrid</option>
          </select>
        </label>
      </div>
      <div className="workhub-field-grid two compact workhub-span-2">
        <label>
          <span>Authority level</span>
          <select
            value={authorityLevelValue}
            onChange={(event) => props.onDetailDraftChange('authority level', event.target.value)}
            disabled={!props.canEdit}
          >
            <option value="">Select authority level</option>
            <option value="employee">Staff</option>
            <option value="supervisor">Team lead</option>
            <option value="manager">Manager</option>
            <option value="director">Department head</option>
            <option value="executive">Executive</option>
          </select>
        </label>
        <label>
          <span>Employment type</span>
          <select
            value={employmentTypeValue}
            onChange={(event) => props.onDetailDraftChange('employment type', event.target.value)}
            disabled={!props.canEdit}
          >
            <option value="">Select type</option>
            <option value="full_time">Full-time</option>
            <option value="part_time">Part-time</option>
            <option value="contract">Contract</option>
            <option value="intern">Intern</option>
          </select>
        </label>
        <label>
          <span>Base location</span>
          <input
            value={detailValue(props, 'base location')}
            onChange={(event) => props.onDetailDraftChange('base location', event.target.value)}
            placeholder="Primary location"
            disabled={!props.canEdit}
          />
        </label>
      </div>

      <label>
        <span>Hire date</span>
        <input
          type="date"
          value={props.startDate}
          onChange={(event) => props.onStartDateChange(event.target.value)}
          disabled={!props.canEdit}
        />
      </label>
      <div className="workhub-field-grid two compact workhub-project-detail-date-grid workhub-span-2">
        <label>
          <span>Contract end</span>
          <input
            type="date"
            value={props.deadline}
            onChange={(event) => props.onDeadlineChange(event.target.value)}
            disabled={!props.canEdit}
          />
        </label>
        <label>
          <span>Probation end</span>
          <input
            type="date"
            value={detailValue(props, 'probation end')}
            onChange={(event) => props.onDetailDraftChange('probation end', event.target.value)}
            disabled={!props.canEdit}
          />
        </label>
      </div>

      <h4 className="workhub-span-2">Leave</h4>
      <div className="workhub-field-grid two compact workhub-span-2">
        <label>
          <span>Annual leave allowance</span>
          <input
            value={detailValue(props, 'annual leave allowance')}
            onChange={(event) => props.onDetailDraftChange('annual leave allowance', event.target.value)}
            placeholder="30"
            disabled={!props.canEdit}
          />
        </label>
        <label>
          <span>Annual leave balance</span>
          <input
            value={detailValue(props, 'annual leave balance')}
            onChange={(event) => props.onDetailDraftChange('annual leave balance', event.target.value)}
            placeholder="18"
            disabled={!props.canEdit}
          />
        </label>
      </div>
      <label>
        <span>Sick leave balance</span>
        <input
          value={detailValue(props, 'sick leave balance')}
          onChange={(event) => props.onDetailDraftChange('sick leave balance', event.target.value)}
          placeholder="10"
          disabled={!props.canEdit}
        />
      </label>

      <details className="workhub-span-2" open={salaryOpen} onToggle={(event) => setSalaryOpen((event.target as HTMLDetailsElement).open)}>
        <summary>Salary and compensation</summary>
        <div className="workhub-field-grid two compact" style={{ marginTop: '10px' }}>
          <label className="workhub-span-2">
            <span>Base salary</span>
            <input
              type="text"
              inputMode="decimal"
              value={props.valueAmount}
              onChange={(event) => props.onValueAmountChange(event.target.value.replace(/,/g, ''))}
              placeholder="1800"
              disabled={!props.canEdit}
            />
          </label>
          <label>
            <span>Salary cycle</span>
            <input
              value={detailValue(props, 'salary cycle')}
              onChange={(event) => props.onDetailDraftChange('salary cycle', event.target.value)}
              placeholder="Monthly"
              disabled={!props.canEdit}
            />
          </label>
          <label>
            <span>Payment frequency</span>
            <input
              value={detailValue(props, 'payment frequency')}
              onChange={(event) => props.onDetailDraftChange('payment frequency', event.target.value)}
              placeholder="Monthly"
              disabled={!props.canEdit}
            />
          </label>
          <label>
            <span>Salary allowances</span>
            <input
              value={detailValue(props, 'salary allowances')}
              onChange={(event) => props.onDetailDraftChange('salary allowances', event.target.value)}
              placeholder="Housing, transport"
              disabled={!props.canEdit}
            />
          </label>
          <label>
            <span>Salary deductions</span>
            <input
              value={detailValue(props, 'salary deductions')}
              onChange={(event) => props.onDetailDraftChange('salary deductions', event.target.value)}
              placeholder="Loans, penalties"
              disabled={!props.canEdit}
            />
          </label>
        </div>
      </details>

      <h4 className="workhub-span-2">Documents</h4>
      <label>
        <span>National ID</span>
        <input
          value={detailValue(props, 'national id') || detailValue(props, 'id number')}
          onChange={(event) => props.onDetailDraftChange('national id', event.target.value)}
          placeholder="National / civil ID number"
          disabled={!props.canEdit}
        />
      </label>
      <label>
        <span>Passport number</span>
        <input
          value={detailValue(props, 'passport number')}
          onChange={(event) => props.onDetailDraftChange('passport number', event.target.value)}
          placeholder="Passport number"
          disabled={!props.canEdit}
        />
      </label>
      <label>
        <span>Certification due date</span>
        <input
          type="date"
          value={detailValue(props, 'certification due date')}
          onChange={(event) => props.onDetailDraftChange('certification due date', event.target.value)}
          disabled={!props.canEdit}
        />
      </label>
      <label>
        <span>Visa / permit expiry</span>
        <input
          type="date"
          value={detailValue(props, 'visa permit expiry')}
          onChange={(event) => props.onDetailDraftChange('visa permit expiry', event.target.value)}
          disabled={!props.canEdit}
        />
      </label>
      <label className="workhub-span-2">
        <span>Profile photo URL</span>
        <input
          type="url"
          value={detailValue(props, 'profile photo url')}
          onChange={(event) => props.onDetailDraftChange('profile photo url', event.target.value)}
          placeholder="https://..."
          disabled={!props.canEdit}
        />
      </label>
      <label className="workhub-span-2">
        <span>CV link</span>
        <input
          type="url"
          value={detailValue(props, 'cv link')}
          onChange={(event) => props.onDetailDraftChange('cv link', event.target.value)}
          placeholder="https://..."
          disabled={!props.canEdit}
        />
      </label>
      <label className="workhub-span-2">
        <span>ID / Passport URL</span>
        <input
          type="url"
          value={detailValue(props, 'id passport url')}
          onChange={(event) => props.onDetailDraftChange('id passport url', event.target.value)}
          placeholder="https://..."
          disabled={!props.canEdit}
        />
      </label>
      <label className="workhub-span-2">
        <span>Certification files URL</span>
        <input
          type="url"
          value={detailValue(props, 'certification files url')}
          onChange={(event) => props.onDetailDraftChange('certification files url', event.target.value)}
          placeholder="https://..."
          disabled={!props.canEdit}
        />
      </label>
      <label>
        <span>Emergency contact</span>
        <input
          value={detailValue(props, 'emergency contact')}
          onChange={(event) => props.onDetailDraftChange('emergency contact', event.target.value)}
          placeholder="Name and phone"
          disabled={!props.canEdit}
        />
      </label>
      {renderNarrativeField(props, 'Profile notes', 'Compliance, payroll, and employee lifecycle notes', 5)}
    </div>
  )
}

function HrLeaveCaseIntentDetailForm(props: WorkhubEntityIntentDetailFormProps) {
  return (
    <div className="workhub-detail-grid workhub-project-detail-grid">
      {renderNameField(props, 'Leave case title', 'Leave case title')}
      {renderTypeField(props, 'Leave case type')}
      <label>
        <span>Employee ID</span>
        <input
          value={detailValue(props, 'employee id')}
          onChange={(event) => props.onDetailDraftChange('employee id', event.target.value)}
          placeholder="EMP-1042"
          disabled={!props.canEdit}
        />
      </label>
      <label>
        <span>Leave type</span>
        <input
          value={detailValue(props, 'leave type')}
          onChange={(event) => props.onDetailDraftChange('leave type', event.target.value)}
          placeholder="Annual, sick, unpaid"
          disabled={!props.canEdit}
        />
      </label>
      <div className="workhub-field-grid two compact workhub-project-detail-date-grid workhub-span-2">
        <label>
          <span>Leave start</span>
          <input
            type="date"
            value={props.startDate}
            onChange={(event) => props.onStartDateChange(event.target.value)}
            disabled={!props.canEdit}
          />
        </label>
        <label>
          <span>Leave end</span>
          <input
            type="date"
            value={props.deadline}
            onChange={(event) => props.onDeadlineChange(event.target.value)}
            disabled={!props.canEdit}
          />
        </label>
      </div>
      <label>
        <span>SLA risk</span>
        <input
          value={detailValue(props, 'sla risk')}
          onChange={(event) => props.onDetailDraftChange('sla risk', event.target.value)}
          placeholder="Low, medium, high"
          disabled={!props.canEdit}
        />
      </label>
      {renderNarrativeField(props, 'Leave notes', 'Approvals, handover, and return-to-work notes')}
    </div>
  )
}

function HrKpiCycleIntentDetailForm(props: WorkhubEntityIntentDetailFormProps) {
  return (
    <div className="workhub-detail-grid workhub-project-detail-grid">
      {renderNameField(props, 'KPI cycle name', 'KPI cycle name')}
      {renderTypeField(props, 'KPI cycle type')}
      <div className="workhub-field-grid two compact workhub-project-detail-date-grid workhub-span-2">
        <label>
          <span>Cycle start</span>
          <input
            type="date"
            value={props.startDate}
            onChange={(event) => props.onStartDateChange(event.target.value)}
            disabled={!props.canEdit}
          />
        </label>
        <label>
          <span>Cycle end</span>
          <input
            type="date"
            value={props.deadline}
            onChange={(event) => props.onDeadlineChange(event.target.value)}
            disabled={!props.canEdit}
          />
        </label>
      </div>
      <label>
        <span>Coverage scope</span>
        <input
          value={detailValue(props, 'coverage scope')}
          onChange={(event) => props.onDetailDraftChange('coverage scope', event.target.value)}
          placeholder="Company, department, sub-department"
          disabled={!props.canEdit}
        />
      </label>
      <label>
        <span>Owner</span>
        <input
          value={detailValue(props, 'owner')}
          onChange={(event) => props.onDetailDraftChange('owner', event.target.value)}
          placeholder="KPI owner"
          disabled={!props.canEdit}
        />
      </label>
      {renderNarrativeField(props, 'Cycle notes', 'Targets, benchmark model, and calibration notes')}
    </div>
  )
}

function HrInitiativeProgramIntentDetailForm(props: WorkhubEntityIntentDetailFormProps) {
  return (
    <div className="workhub-detail-grid workhub-project-detail-grid">
      {renderNameField(props, 'Initiative or program', 'Initiative or program')}
      {renderTypeField(props, 'Initiative type')}
      <div className="workhub-field-grid two compact workhub-project-detail-date-grid workhub-span-2">
        <label>
          <span>Start date</span>
          <input
            type="date"
            value={props.startDate}
            onChange={(event) => props.onStartDateChange(event.target.value)}
            disabled={!props.canEdit}
          />
        </label>
        <label>
          <span>Target date</span>
          <input
            type="date"
            value={props.deadline}
            onChange={(event) => props.onDeadlineChange(event.target.value)}
            disabled={!props.canEdit}
          />
        </label>
      </div>
      <label>
        <span>Sponsor</span>
        <input
          value={detailValue(props, 'sponsor')}
          onChange={(event) => props.onDetailDraftChange('sponsor', event.target.value)}
          placeholder="Executive sponsor"
          disabled={!props.canEdit}
        />
      </label>
      <label>
        <span>People impact</span>
        <input
          value={detailValue(props, 'people impact')}
          onChange={(event) => props.onDetailDraftChange('people impact', event.target.value)}
          placeholder="Headcount, capability, productivity"
          disabled={!props.canEdit}
        />
      </label>
      {renderNarrativeField(props, 'Initiative notes', 'Change plan, milestones, and outcomes')}
    </div>
  )
}

function HrLearningCertificationIntentDetailForm(props: WorkhubEntityIntentDetailFormProps) {
  return (
    <div className="workhub-detail-grid workhub-project-detail-grid">
      {renderNameField(props, 'Learning or certification', 'Learning or certification')}
      {renderTypeField(props, 'Learning type')}
      <label>
        <span>Employee ID</span>
        <input
          value={detailValue(props, 'employee id')}
          onChange={(event) => props.onDetailDraftChange('employee id', event.target.value)}
          placeholder="EMP-1042"
          disabled={!props.canEdit}
        />
      </label>
      <label>
        <span>Provider</span>
        <input
          value={detailValue(props, 'provider')}
          onChange={(event) => props.onDetailDraftChange('provider', event.target.value)}
          placeholder="Training provider"
          disabled={!props.canEdit}
        />
      </label>
      <div className="workhub-field-grid two compact workhub-project-detail-date-grid workhub-span-2">
        <label>
          <span>Start date</span>
          <input
            type="date"
            value={props.startDate}
            onChange={(event) => props.onStartDateChange(event.target.value)}
            disabled={!props.canEdit}
          />
        </label>
        <label>
          <span>Due / expiry date</span>
          <input
            type="date"
            value={props.deadline}
            onChange={(event) => props.onDeadlineChange(event.target.value)}
            disabled={!props.canEdit}
          />
        </label>
      </div>
      <label>
        <span>Certification status</span>
        <input
          value={detailValue(props, 'certification status')}
          onChange={(event) => props.onDetailDraftChange('certification status', event.target.value)}
          placeholder="Due soon, compliant, expired"
          disabled={!props.canEdit}
        />
      </label>
      {renderNarrativeField(props, 'Learning notes', 'Completion evidence, validity, and follow-up')}
    </div>
  )
}

export function WorkhubEntityIntentDetailForm(props: WorkhubEntityIntentDetailFormProps) {
  switch (props.intent) {
    case 'proposal':
      return <ProposalIntentDetailForm {...props} />
    case 'lead':
      return <LeadIntentDetailForm {...props} />
    case 'finance_invoice_stream':
      return <FinanceInvoiceStreamIntentDetailForm {...props} />
    case 'finance_payment_cycle':
      return <FinancePaymentCycleIntentDetailForm {...props} />
    case 'marketing_campaign':
      return <MarketingCampaignIntentDetailForm {...props} />
    case 'marketing_content_stream':
      return <MarketingContentStreamIntentDetailForm {...props} />
    case 'hr_requisition':
      return <HrRequisitionIntentDetailForm {...props} />
    case 'hr_onboarding_track':
      return <HrOnboardingTrackIntentDetailForm {...props} />
    case 'hr_department_unit':
      return <HrDepartmentUnitIntentDetailForm {...props} />
    case 'hr_sub_department_unit':
      return <HrSubDepartmentUnitIntentDetailForm {...props} />
    case 'hr_employee_profile':
      return <HrEmployeeProfileIntentDetailForm {...props} />
    case 'hr_leave_case':
      return <HrLeaveCaseIntentDetailForm {...props} />
    case 'hr_kpi_cycle':
      return <HrKpiCycleIntentDetailForm {...props} />
    case 'hr_initiative_program':
      return <HrInitiativeProgramIntentDetailForm {...props} />
    case 'hr_learning_certification':
      return <HrLearningCertificationIntentDetailForm {...props} />
    case 'project':
    default:
      return <ProjectIntentDetailForm {...props} />
  }
}
