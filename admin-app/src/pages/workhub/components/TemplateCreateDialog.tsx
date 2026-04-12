import { useEffect, useState } from 'react'
import type { WorkhubClient, WorkhubProjectPriority } from '../../../lib/workhubRepo'
import { PROJECT_PRIORITY_OPTIONS } from '../constants'
import { getTemplateCreationIntentMeta, type WorkhubTemplateCreationIntent } from '../templateCreationMeta'
import type { WorkhubWorkspaceTemplateId } from '../workspaceTemplates'

export type { WorkhubTemplateCreationIntent } from '../templateCreationMeta'

export interface WorkhubTemplateCreationDraft {
  name: string
  description: string
  clientId: string
  tenderNumber: string
  proposalId: string
  startDate: string
  deadline: string
  submissionTime: string
  priority: WorkhubProjectPriority
  leadSource: string
  qualificationNotes: string
  billingCycle: string
  paymentOwner: string
  campaignChannel: string
  campaignObjective: string
  cadence: string
  department: string
  hiringManager: string
  onboardingOwner: string
  budgetAmount: string
}

function renderPriorityField(
  draft: WorkhubTemplateCreationDraft,
  onDraftChange: (patch: Partial<WorkhubTemplateCreationDraft>) => void,
) {
  return (
    <label className="workhub-icon-field">
      <span>🚩 Priority</span>
      <select
        name="templatePriority"
        value={draft.priority}
        onChange={(event) => onDraftChange({ priority: event.target.value as WorkhubProjectPriority })}
      >
        {PROJECT_PRIORITY_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  )
}

function renderClientField(
  draft: WorkhubTemplateCreationDraft,
  clientOptions: WorkhubClient[],
  onDraftChange: (patch: Partial<WorkhubTemplateCreationDraft>) => void,
  quickClientName: string,
  onQuickClientNameChange: (value: string) => void,
  onCreateClientInline: (name: string) => Promise<string | null>,
  busyKey: string,
  label = '🏢 Client',
) {
  return (
    <>
      <label className="workhub-icon-field">
        <span>{label}</span>
        <select
          name="templateClient"
          value={draft.clientId}
          onChange={(event) => onDraftChange({ clientId: event.target.value })}
        >
          <option value="">No client assigned</option>
          {clientOptions.map((client) => (
            <option key={client.id} value={client.id}>{client.name}</option>
          ))}
        </select>
      </label>
      <div className="workhub-inline-row workhub-client-quick-add">
        <input
          name="templateQuickClientName"
          value={quickClientName}
          onChange={(event) => onQuickClientNameChange(event.target.value)}
          placeholder="Add client by name (minimal info)"
        />
        <button
          type="button"
          className="workhub-ghost-btn"
          disabled={!quickClientName.trim() || busyKey === 'client:create'}
          onClick={() => {
            void onCreateClientInline(quickClientName).then((clientId) => {
              if (!clientId) return
              onDraftChange({ clientId })
              onQuickClientNameChange('')
            })
          }}
        >
          {busyKey === 'client:create' ? 'Adding…' : '➕ Add client'}
        </button>
      </div>
    </>
  )
}

export function TemplateCreateDialog(props: {
  isOpen: boolean
  intent: WorkhubTemplateCreationIntent | null
  workspaceTemplateId?: WorkhubWorkspaceTemplateId
  draft: WorkhubTemplateCreationDraft
  clientOptions: WorkhubClient[]
  busyKey: string
  canCreate: boolean
  onCreateClientInline: (name: string) => Promise<string | null>
  onDraftChange: (patch: Partial<WorkhubTemplateCreationDraft>) => void
  onClose: () => void
  onCreate: () => void
}) {
  if (!props.isOpen || !props.intent) return null

  const [quickClientName, setQuickClientName] = useState('')

  useEffect(() => {
    setQuickClientName('')
  }, [props.intent, props.isOpen])

  const intentMeta = getTemplateCreationIntentMeta(props.intent, props.workspaceTemplateId)

  return (
    <div className="workhub-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) props.onClose() }}>
      <div className="workhub-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="workhub-modal-head">
          <div>
            <h2 className={`workhub-template-create-title${props.intent === 'proposal' ? ' is-proposal' : ''}`}>{intentMeta.title}</h2>
            <p>{intentMeta.subtitle}</p>
          </div>
        </div>

        <form
          className="workhub-modal-form compact-create"
          onSubmit={(event) => {
            event.preventDefault()
            props.onCreate()
          }}
        >
          {props.intent === 'project' && (
            <>
              <label className="workhub-icon-field">
                <span>{`${intentMeta.icon} ${intentMeta.subjectLabel} name`}</span>
                <input value={props.draft.name} onChange={(event) => props.onDraftChange({ name: event.target.value })} placeholder={`${intentMeta.subjectLabel} name`} />
              </label>
              <div className="workhub-field-grid two compact workhub-create-date-grid">
                <label className="workhub-icon-field">
                  <span>🗓️ Start date</span>
                  <input type="date" value={props.draft.startDate} onChange={(event) => props.onDraftChange({ startDate: event.target.value })} />
                </label>
                <label className="workhub-icon-field">
                  <span>🏁 Deadline</span>
                  <input type="date" value={props.draft.deadline} onChange={(event) => props.onDraftChange({ deadline: event.target.value })} />
                </label>
              </div>
              {renderPriorityField(props.draft, props.onDraftChange)}
              {renderClientField(
                props.draft,
                props.clientOptions,
                props.onDraftChange,
                quickClientName,
                setQuickClientName,
                props.onCreateClientInline,
                props.busyKey,
              )}
              <label className="workhub-icon-field">
                <span>📝 Brief</span>
                <textarea value={props.draft.description} onChange={(event) => props.onDraftChange({ description: event.target.value })} rows={3} placeholder="Project summary" />
              </label>
            </>
          )}

          {props.intent === 'proposal' && (
            <>
              <label className="workhub-icon-field">
                <span>🧾 Proposal title</span>
                <input value={props.draft.name} onChange={(event) => props.onDraftChange({ name: event.target.value })} placeholder="Proposal title" />
              </label>
              <div className="workhub-field-grid two compact">
                <label className="workhub-icon-field">
                  <span>🔢 Tender / RFP number</span>
                  <input
                    value={props.draft.tenderNumber}
                    onChange={(event) => props.onDraftChange({ tenderNumber: event.target.value })}
                    placeholder="e.g. RFP-2026-041"
                  />
                </label>
                <label className="workhub-icon-field">
                  <span>🆔 Our proposal ID</span>
                  <input
                    value={props.draft.proposalId}
                    onChange={(event) => props.onDraftChange({ proposalId: event.target.value })}
                    placeholder="e.g. QYAN-PR-117"
                  />
                </label>
              </div>
              {renderClientField(
                props.draft,
                props.clientOptions,
                props.onDraftChange,
                quickClientName,
                setQuickClientName,
                props.onCreateClientInline,
                props.busyKey,
                '🏢 Client (required)',
              )}
              <div className="workhub-field-grid two compact workhub-create-date-grid">
                <label className="workhub-icon-field">
                  <span>📅 Submission date</span>
                  <input type="date" value={props.draft.deadline} onChange={(event) => props.onDraftChange({ deadline: event.target.value })} />
                </label>
                <label className="workhub-icon-field">
                  <span>⏰ Submission time</span>
                  <input type="time" value={props.draft.submissionTime} onChange={(event) => props.onDraftChange({ submissionTime: event.target.value })} />
                </label>
              </div>
              <div className="workhub-field-grid two compact">
                <label className="workhub-icon-field">
                  <span>💰 Estimated value</span>
                  <input value={props.draft.budgetAmount} onChange={(event) => props.onDraftChange({ budgetAmount: event.target.value })} placeholder="e.g. 250000 OMR" />
                </label>
                {renderPriorityField(props.draft, props.onDraftChange)}
              </div>
              <label className="workhub-icon-field">
                <span>📝 Scope summary</span>
                <textarea value={props.draft.description} onChange={(event) => props.onDraftChange({ description: event.target.value })} rows={3} placeholder="Proposal scope, deliverables, and assumptions" />
              </label>
            </>
          )}

          {props.intent === 'lead' && (
            <>
              <label className="workhub-icon-field">
                <span>🎯 Lead title</span>
                <input value={props.draft.name} onChange={(event) => props.onDraftChange({ name: event.target.value })} placeholder="Lead title" />
              </label>
              <div className="workhub-field-grid two compact">
                <label className="workhub-icon-field">
                  <span>📡 Lead source</span>
                  <input value={props.draft.leadSource} onChange={(event) => props.onDraftChange({ leadSource: event.target.value })} placeholder="Referral, website, outbound, event" />
                </label>
                <label className="workhub-icon-field">
                  <span>📅 Expected close date</span>
                  <input type="date" value={props.draft.deadline} onChange={(event) => props.onDraftChange({ deadline: event.target.value })} />
                </label>
              </div>
              {renderClientField(
                props.draft,
                props.clientOptions,
                props.onDraftChange,
                quickClientName,
                setQuickClientName,
                props.onCreateClientInline,
                props.busyKey,
              )}
              <label className="workhub-icon-field">
                <span>🧪 Qualification notes</span>
                <textarea value={props.draft.qualificationNotes} onChange={(event) => props.onDraftChange({ qualificationNotes: event.target.value })} rows={3} placeholder="Need, budget, authority, timeline" />
              </label>
              {renderPriorityField(props.draft, props.onDraftChange)}
            </>
          )}

          {props.intent === 'finance_invoice_stream' && (
            <>
              <label className="workhub-icon-field">
                <span>🧾 Stream name</span>
                <input value={props.draft.name} onChange={(event) => props.onDraftChange({ name: event.target.value })} placeholder="Invoice stream name" />
              </label>
              <div className="workhub-field-grid two compact">
                <label className="workhub-icon-field">
                  <span>🔁 Billing cycle</span>
                  <select value={props.draft.billingCycle} onChange={(event) => props.onDraftChange({ billingCycle: event.target.value })}>
                    <option value="">Select cycle</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="milestone">Milestone-based</option>
                  </select>
                </label>
                <label className="workhub-icon-field">
                  <span>📅 First due date</span>
                  <input type="date" value={props.draft.deadline} onChange={(event) => props.onDraftChange({ deadline: event.target.value })} />
                </label>
              </div>
              {renderClientField(
                props.draft,
                props.clientOptions,
                props.onDraftChange,
                quickClientName,
                setQuickClientName,
                props.onCreateClientInline,
                props.busyKey,
                '🏢 Client / payee',
              )}
              <label className="workhub-icon-field">
                <span>👤 Approval owner</span>
                <input value={props.draft.paymentOwner} onChange={(event) => props.onDraftChange({ paymentOwner: event.target.value })} placeholder="Finance owner" />
              </label>
              {renderPriorityField(props.draft, props.onDraftChange)}
              <label className="workhub-icon-field">
                <span>📝 Notes</span>
                <textarea value={props.draft.description} onChange={(event) => props.onDraftChange({ description: event.target.value })} rows={3} placeholder="Controls, thresholds, and review notes" />
              </label>
            </>
          )}

          {props.intent === 'finance_payment_cycle' && (
            <>
              <label className="workhub-icon-field">
                <span>💸 Payment cycle name</span>
                <input value={props.draft.name} onChange={(event) => props.onDraftChange({ name: event.target.value })} placeholder="Payment cycle name" />
              </label>
              <div className="workhub-field-grid two compact">
                <label className="workhub-icon-field">
                  <span>📅 Disbursement date</span>
                  <input type="date" value={props.draft.deadline} onChange={(event) => props.onDraftChange({ deadline: event.target.value })} />
                </label>
                <label className="workhub-icon-field">
                  <span>👤 Approval owner</span>
                  <input value={props.draft.paymentOwner} onChange={(event) => props.onDraftChange({ paymentOwner: event.target.value })} placeholder="Approval owner" />
                </label>
              </div>
              {renderPriorityField(props.draft, props.onDraftChange)}
              <label className="workhub-icon-field">
                <span>📝 Notes</span>
                <textarea value={props.draft.description} onChange={(event) => props.onDraftChange({ description: event.target.value })} rows={3} placeholder="Cycle scope and release checkpoints" />
              </label>
            </>
          )}

          {props.intent === 'marketing_campaign' && (
            <>
              <label className="workhub-icon-field">
                <span>📣 Campaign name</span>
                <input value={props.draft.name} onChange={(event) => props.onDraftChange({ name: event.target.value })} placeholder="Campaign name" />
              </label>
              <label className="workhub-icon-field">
                <span>🎯 Objective</span>
                <input value={props.draft.campaignObjective} onChange={(event) => props.onDraftChange({ campaignObjective: event.target.value })} placeholder="Awareness, lead-gen, conversion" />
              </label>
              <div className="workhub-field-grid two compact">
                <label className="workhub-icon-field">
                  <span>📡 Channel</span>
                  <select value={props.draft.campaignChannel} onChange={(event) => props.onDraftChange({ campaignChannel: event.target.value })}>
                    <option value="">Select channel</option>
                    <option value="social">Social</option>
                    <option value="email">Email</option>
                    <option value="paid_ads">Paid ads</option>
                    <option value="events">Events</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </label>
                <label className="workhub-icon-field">
                  <span>🗓️ Launch date</span>
                  <input type="date" value={props.draft.startDate} onChange={(event) => props.onDraftChange({ startDate: event.target.value })} />
                </label>
              </div>
              <div className="workhub-field-grid two compact">
                <label className="workhub-icon-field">
                  <span>🏁 End date</span>
                  <input type="date" value={props.draft.deadline} onChange={(event) => props.onDraftChange({ deadline: event.target.value })} />
                </label>
                {renderPriorityField(props.draft, props.onDraftChange)}
              </div>
              {renderClientField(
                props.draft,
                props.clientOptions,
                props.onDraftChange,
                quickClientName,
                setQuickClientName,
                props.onCreateClientInline,
                props.busyKey,
              )}
              <label className="workhub-icon-field">
                <span>📝 Brief</span>
                <textarea value={props.draft.description} onChange={(event) => props.onDraftChange({ description: event.target.value })} rows={3} placeholder="Audience, message, and success criteria" />
              </label>
            </>
          )}

          {props.intent === 'marketing_content_stream' && (
            <>
              <label className="workhub-icon-field">
                <span>🧩 Content stream name</span>
                <input value={props.draft.name} onChange={(event) => props.onDraftChange({ name: event.target.value })} placeholder="Content stream" />
              </label>
              <div className="workhub-field-grid two compact">
                <label className="workhub-icon-field">
                  <span>📡 Channel</span>
                  <input value={props.draft.campaignChannel} onChange={(event) => props.onDraftChange({ campaignChannel: event.target.value })} placeholder="LinkedIn, YouTube, Blog" />
                </label>
                <label className="workhub-icon-field">
                  <span>🔁 Cadence</span>
                  <input value={props.draft.cadence} onChange={(event) => props.onDraftChange({ cadence: event.target.value })} placeholder="Daily, weekly, bi-weekly" />
                </label>
              </div>
              <div className="workhub-field-grid two compact">
                <label className="workhub-icon-field">
                  <span>🗓️ Start date</span>
                  <input type="date" value={props.draft.startDate} onChange={(event) => props.onDraftChange({ startDate: event.target.value })} />
                </label>
                <label className="workhub-icon-field">
                  <span>🏁 Target date</span>
                  <input type="date" value={props.draft.deadline} onChange={(event) => props.onDraftChange({ deadline: event.target.value })} />
                </label>
              </div>
              <label className="workhub-icon-field">
                <span>📝 Scope</span>
                <textarea value={props.draft.description} onChange={(event) => props.onDraftChange({ description: event.target.value })} rows={3} placeholder="Format mix, approvals, and output targets" />
              </label>
            </>
          )}

          {props.intent === 'hr_requisition' && (
            <>
              <label className="workhub-icon-field">
                <span>👥 Requisition title</span>
                <input value={props.draft.name} onChange={(event) => props.onDraftChange({ name: event.target.value })} placeholder="Role / requisition name" />
              </label>
              <div className="workhub-field-grid two compact">
                <label className="workhub-icon-field">
                  <span>🏢 Department</span>
                  <input value={props.draft.department} onChange={(event) => props.onDraftChange({ department: event.target.value })} placeholder="Department" />
                </label>
                <label className="workhub-icon-field">
                  <span>👤 Hiring manager</span>
                  <input value={props.draft.hiringManager} onChange={(event) => props.onDraftChange({ hiringManager: event.target.value })} placeholder="Hiring manager" />
                </label>
              </div>
              <div className="workhub-field-grid two compact">
                <label className="workhub-icon-field">
                  <span>📅 Target hire date</span>
                  <input type="date" value={props.draft.deadline} onChange={(event) => props.onDraftChange({ deadline: event.target.value })} />
                </label>
                {renderPriorityField(props.draft, props.onDraftChange)}
              </div>
              <label className="workhub-icon-field">
                <span>📝 Role notes</span>
                <textarea value={props.draft.description} onChange={(event) => props.onDraftChange({ description: event.target.value })} rows={3} placeholder="Scope, must-have skills, and hiring notes" />
              </label>
            </>
          )}

          {props.intent === 'hr_onboarding_track' && (
            <>
              <label className="workhub-icon-field">
                <span>🧭 Track name</span>
                <input value={props.draft.name} onChange={(event) => props.onDraftChange({ name: event.target.value })} placeholder="Onboarding track name" />
              </label>
              <div className="workhub-field-grid two compact">
                <label className="workhub-icon-field">
                  <span>👤 Onboarding owner</span>
                  <input value={props.draft.onboardingOwner} onChange={(event) => props.onDraftChange({ onboardingOwner: event.target.value })} placeholder="Track owner" />
                </label>
                <label className="workhub-icon-field">
                  <span>🗓️ Start date</span>
                  <input type="date" value={props.draft.startDate} onChange={(event) => props.onDraftChange({ startDate: event.target.value })} />
                </label>
              </div>
              <label className="workhub-icon-field">
                <span>🏁 Completion target</span>
                <input type="date" value={props.draft.deadline} onChange={(event) => props.onDraftChange({ deadline: event.target.value })} />
              </label>
              <label className="workhub-icon-field">
                <span>📝 Track details</span>
                <textarea value={props.draft.description} onChange={(event) => props.onDraftChange({ description: event.target.value })} rows={3} placeholder="Milestones and owner expectations" />
              </label>
            </>
          )}

          <div className="workhub-create-actions">
            <div className="workhub-create-actions-group">
              <button type="button" className="workhub-ghost-btn" onClick={props.onClose}>Close</button>
              <button type="submit" className="workhub-primary-btn" disabled={!props.canCreate || props.busyKey === 'template-create'}>
                {props.busyKey === 'template-create' ? 'Creating…' : `${intentMeta.icon} ${intentMeta.submitLabel}`}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
