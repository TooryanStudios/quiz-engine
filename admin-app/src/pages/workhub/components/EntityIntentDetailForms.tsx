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
    <div className="workhub-detail-grid workhub-project-detail-grid">
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
    case 'project':
    default:
      return <ProjectIntentDetailForm {...props} />
  }
}
