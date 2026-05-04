import { useEffect, useState } from 'react'
import type { WorkhubClient, WorkhubProjectPriority } from '../../../lib/workhubRepo'
import { PROJECT_PRIORITY_OPTIONS } from '../constants'
import { getTemplateCreationIntentMeta, type WorkhubTemplateCreationIntent } from '../templateCreationMeta'
import type { WorkhubWorkspaceTemplateId } from '../workspaceTemplates'

export type { WorkhubTemplateCreationIntent } from '../templateCreationMeta'

export interface WorkhubTemplateCreationDraft {
  name: string
  description: string
  departmentCode: string
  headEmployeeId: string
  parentDepartment: string
  departmentEmail: string
  departmentPhone: string
  employeeId: string
  payrollId: string
  nameArabic: string
  gender: string
  birthday: string
  subDepartment: string
  jobTitle: string
  jobGrade: string
  authorityLevel: string
  roleProfile: string
  employmentStatus: string
  workMode: string
  employmentType: string
  basicSalary: string
  salaryAllowances: string
  salaryDeductions: string
  paymentFrequency: string
  availableLeaveDays: string
  usedLeaveDays: string
  hireDate: string
  exitDate: string
  managerEmployeeId: string
  emergencyContact: string
  passportNumber: string
  nationalId: string
  bankAccount: string
  referenceUrl: string
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
  approvalOwner: string
  leaveType: string
  cycleOwner: string
  primaryKpi: string
  programType: string
  certificationName: string
  certificationIssuer: string
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
          className={`workhub-modal-form compact-create${props.intent === 'hr_employee_profile' ? ' workhub-employee-create-compact' : ''}`}
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

          {props.intent === 'hr_department_unit' && (
            <>
              <label className="workhub-icon-field">
                <span>🏢 Department name</span>
                <input value={props.draft.name} onChange={(event) => props.onDraftChange({ name: event.target.value })} placeholder="e.g. Human Resources" />
              </label>
              <div className="workhub-field-grid two compact">
                <label className="workhub-icon-field">
                  <span>🔢 Department code</span>
                  <input value={props.draft.departmentCode} onChange={(event) => props.onDraftChange({ departmentCode: event.target.value })} placeholder="e.g. HR-001" />
                </label>
                <label className="workhub-icon-field">
                  <span>🧑‍💼 Head employee ID</span>
                  <input value={props.draft.headEmployeeId} onChange={(event) => props.onDraftChange({ headEmployeeId: event.target.value })} placeholder="Assign now or later" />
                </label>
              </div>
              <div className="workhub-field-grid two compact">
                <label className="workhub-icon-field">
                  <span>✉️ Department email</span>
                  <input value={props.draft.departmentEmail} onChange={(event) => props.onDraftChange({ departmentEmail: event.target.value })} placeholder="hr@company.com" />
                </label>
                <label className="workhub-icon-field">
                  <span>📞 Department phone</span>
                  <input value={props.draft.departmentPhone} onChange={(event) => props.onDraftChange({ departmentPhone: event.target.value })} placeholder="+968 ..." />
                </label>
              </div>
              <label className="workhub-icon-field">
                <span>📝 Department summary</span>
                <textarea value={props.draft.description} onChange={(event) => props.onDraftChange({ description: event.target.value })} rows={3} placeholder="Responsibility scope, authority boundaries, and service model" />
              </label>
            </>
          )}

          {props.intent === 'hr_sub_department_unit' && (
            <>
              <label className="workhub-icon-field">
                <span>🧩 Sub-department name</span>
                <input value={props.draft.name} onChange={(event) => props.onDraftChange({ name: event.target.value })} placeholder="e.g. Talent Acquisition" />
              </label>
              <div className="workhub-field-grid two compact">
                <label className="workhub-icon-field">
                  <span>🏢 Parent department</span>
                  <input value={props.draft.parentDepartment} onChange={(event) => props.onDraftChange({ parentDepartment: event.target.value })} placeholder="Parent department name" />
                </label>
                <label className="workhub-icon-field">
                  <span>🔢 Sub-department code</span>
                  <input value={props.draft.departmentCode} onChange={(event) => props.onDraftChange({ departmentCode: event.target.value })} placeholder="e.g. HR-TA" />
                </label>
              </div>
              <label className="workhub-icon-field">
                <span>🧑‍💼 Head employee ID</span>
                <input value={props.draft.headEmployeeId} onChange={(event) => props.onDraftChange({ headEmployeeId: event.target.value })} placeholder="Sub-department head employee ID" />
              </label>
              <label className="workhub-icon-field">
                <span>📝 Sub-department summary</span>
                <textarea value={props.draft.description} onChange={(event) => props.onDraftChange({ description: event.target.value })} rows={3} placeholder="Team purpose, operating scope, and dependencies" />
              </label>
            </>
          )}

          {props.intent === 'hr_employee_profile' && (
            <>
              <label className="workhub-icon-field">
                <span>🪪 Employee name</span>
                <input value={props.draft.name} onChange={(event) => props.onDraftChange({ name: event.target.value })} placeholder="Employee full name" />
              </label>
              <label className="workhub-icon-field">
                <span>🇴🇲 Name in Arabic</span>
                <input value={props.draft.nameArabic} onChange={(event) => props.onDraftChange({ nameArabic: event.target.value })} placeholder="Employee name in Arabic" />
              </label>
              <div className="workhub-field-grid two compact">
                <label className="workhub-icon-field">
                  <span>🔢 Employee ID</span>
                  <input value={props.draft.employeeId} onChange={(event) => props.onDraftChange({ employeeId: event.target.value })} placeholder="e.g. EMP-0142" />
                </label>
                <label className="workhub-icon-field">
                  <span>🧾 Payroll ID</span>
                  <input value={props.draft.payrollId} onChange={(event) => props.onDraftChange({ payrollId: event.target.value })} placeholder="Payroll identifier" />
                </label>
              </div>
              <div className="workhub-field-grid two compact">
                <label className="workhub-icon-field">
                  <span>🏢 Department</span>
                  <input value={props.draft.department} placeholder="Auto from selected parent" disabled />
                </label>
                <label className="workhub-icon-field">
                  <span>🧩 Sub-department</span>
                  <input value={props.draft.subDepartment} placeholder="Auto from selected parent" disabled />
                </label>
              </div>
              <div className="workhub-field-grid two compact">
                <label className="workhub-icon-field">
                  <span>🛡️ Authority level</span>
                  <select value={props.draft.authorityLevel} onChange={(event) => props.onDraftChange({ authorityLevel: event.target.value })}>
                    <option value="">Select authority level</option>
                    <option value="employee">Staff</option>
                    <option value="supervisor">Team lead</option>
                    <option value="manager">Manager</option>
                    <option value="director">Department head</option>
                    <option value="executive">Executive</option>
                  </select>
                </label>
                <label className="workhub-icon-field">
                  <span>💼 Role profile</span>
                  <input value={props.draft.roleProfile} onChange={(event) => props.onDraftChange({ roleProfile: event.target.value })} placeholder="Job title / role summary" />
                </label>
              </div>
              <div className="workhub-field-grid two compact">
                <label className="workhub-icon-field">
                  <span>🏷️ Job title</span>
                  <input value={props.draft.jobTitle} onChange={(event) => props.onDraftChange({ jobTitle: event.target.value })} placeholder="Job title" />
                </label>
                <label className="workhub-icon-field">
                  <span>📊 Job grade</span>
                  <input value={props.draft.jobGrade} onChange={(event) => props.onDraftChange({ jobGrade: event.target.value })} placeholder="Grade / level" />
                </label>
              </div>
              <div className="workhub-field-grid two compact">
                <label className="workhub-icon-field">
                  <span>📌 Employment status</span>
                  <select value={props.draft.employmentStatus} onChange={(event) => props.onDraftChange({ employmentStatus: event.target.value })}>
                    <option value="">Select status</option>
                    <option value="active">Active</option>
                    <option value="remote_contract">Remote Contract</option>
                    <option value="suspended">Suspended</option>
                    <option value="resigned">Resigned</option>
                    <option value="terminated">Terminated</option>
                  </select>
                </label>
                <label className="workhub-icon-field">
                  <span>🖥️ Work mode</span>
                  <select value={props.draft.workMode} onChange={(event) => props.onDraftChange({ workMode: event.target.value })}>
                    <option value="">Select work mode</option>
                    <option value="on_site">On-site</option>
                    <option value="remote">Remote</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </label>
              </div>
              <div className="workhub-field-grid two compact">
                <label className="workhub-icon-field">
                  <span>📃 Employment type</span>
                  <select value={props.draft.employmentType} onChange={(event) => props.onDraftChange({ employmentType: event.target.value })}>
                    <option value="">Select type</option>
                    <option value="full_time">Full-time</option>
                    <option value="part_time">Part-time</option>
                    <option value="contract">Contract</option>
                    <option value="intern">Intern</option>
                  </select>
                </label>
                <label className="workhub-icon-field">
                  <span>🧑‍💼 Manager employee ID</span>
                  <input value={props.draft.managerEmployeeId} placeholder="Auto from department stakeholders" disabled />
                </label>
              </div>
              <div className="workhub-field-grid two compact">
                <label className="workhub-icon-field">
                  <span>💰 Basic salary</span>
                  <input value={props.draft.basicSalary} onChange={(event) => props.onDraftChange({ basicSalary: event.target.value })} placeholder="e.g. 1200 OMR" />
                </label>
                <label className="workhub-icon-field">
                  <span>🎁 Salary allowances</span>
                  <input value={props.draft.salaryAllowances} onChange={(event) => props.onDraftChange({ salaryAllowances: event.target.value })} placeholder="Housing, transport, etc." />
                </label>
              </div>
              <div className="workhub-field-grid two compact">
                <label className="workhub-icon-field">
                  <span>➖ Salary deductions</span>
                  <input value={props.draft.salaryDeductions} onChange={(event) => props.onDraftChange({ salaryDeductions: event.target.value })} placeholder="Loans, penalties, etc." />
                </label>
                <label className="workhub-icon-field">
                  <span>💳 Payment frequency</span>
                  <select value={props.draft.paymentFrequency} onChange={(event) => props.onDraftChange({ paymentFrequency: event.target.value })}>
                    <option value="">Select frequency</option>
                    <option value="monthly">Monthly</option>
                    <option value="bi_weekly">Bi-weekly</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </label>
              </div>
              <div className="workhub-field-grid two compact">
                <label className="workhub-icon-field">
                  <span>🏖️ Available leave days</span>
                  <input value={props.draft.availableLeaveDays} onChange={(event) => props.onDraftChange({ availableLeaveDays: event.target.value })} placeholder="e.g. 30" />
                </label>
                <label className="workhub-icon-field">
                  <span>📆 Used leave days</span>
                  <input value={props.draft.usedLeaveDays} onChange={(event) => props.onDraftChange({ usedLeaveDays: event.target.value })} placeholder="e.g. 8" />
                </label>
              </div>
              <div className="workhub-field-grid two compact">
                <label className="workhub-icon-field">
                  <span>🗓️ Hire date</span>
                  <input type="date" value={props.draft.hireDate} onChange={(event) => props.onDraftChange({ hireDate: event.target.value })} />
                </label>
                <label className="workhub-icon-field">
                  <span>🚪 Exit date</span>
                  <input type="date" value={props.draft.exitDate} onChange={(event) => props.onDraftChange({ exitDate: event.target.value })} />
                </label>
              </div>
              <div className="workhub-field-grid two compact">
                <label className="workhub-icon-field">
                  <span>⚧️ Gender</span>
                  <select value={props.draft.gender} onChange={(event) => props.onDraftChange({ gender: event.target.value })}>
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="non_binary">Non-binary</option>
                    <option value="prefer_not_to_say">Prefer not to say</option>
                  </select>
                </label>
                <label className="workhub-icon-field">
                  <span>🎂 Birthday</span>
                  <input type="date" value={props.draft.birthday} onChange={(event) => props.onDraftChange({ birthday: event.target.value })} />
                </label>
              </div>
              <div className="workhub-field-grid two compact">
                <label className="workhub-icon-field">
                  <span>🛂 Passport number</span>
                  <input value={props.draft.passportNumber} onChange={(event) => props.onDraftChange({ passportNumber: event.target.value })} placeholder="Passport number" />
                </label>
                <label className="workhub-icon-field">
                  <span>🆔 National ID</span>
                  <input value={props.draft.nationalId} onChange={(event) => props.onDraftChange({ nationalId: event.target.value })} placeholder="National / civil ID number" />
                </label>
              </div>
              <div className="workhub-field-grid two compact">
                <label className="workhub-icon-field">
                  <span>🏦 Bank account</span>
                  <input value={props.draft.bankAccount} onChange={(event) => props.onDraftChange({ bankAccount: event.target.value })} placeholder="IBAN / account reference" />
                </label>
                <label className="workhub-icon-field">
                  <span>📞 Emergency contact</span>
                  <input value={props.draft.emergencyContact} onChange={(event) => props.onDraftChange({ emergencyContact: event.target.value })} placeholder="Name and phone" />
                </label>
                <label className="workhub-icon-field">
                  <span>🔗 CV or profile link</span>
                  <input value={props.draft.referenceUrl} onChange={(event) => props.onDraftChange({ referenceUrl: event.target.value })} placeholder="CV URL, drive link, or profile source" />
                </label>
              </div>
              <label className="workhub-icon-field">
                <span>📝 Employee notes</span>
                <textarea value={props.draft.description} onChange={(event) => props.onDraftChange({ description: event.target.value })} rows={3} placeholder="Joining/upgrades/certifications/pictures and any additional HR notes" />
              </label>
            </>
          )}

          {props.intent === 'hr_leave_case' && (
            <>
              <label className="workhub-icon-field">
                <span>🏖️ Leave case title</span>
                <input value={props.draft.name} onChange={(event) => props.onDraftChange({ name: event.target.value })} placeholder="Employee leave case" />
              </label>
              <div className="workhub-field-grid two compact">
                <label className="workhub-icon-field">
                  <span>🔢 Employee ID</span>
                  <input value={props.draft.employeeId} onChange={(event) => props.onDraftChange({ employeeId: event.target.value })} placeholder="Employee identifier" />
                </label>
                <label className="workhub-icon-field">
                  <span>🏷️ Leave type</span>
                  <input value={props.draft.leaveType} onChange={(event) => props.onDraftChange({ leaveType: event.target.value })} placeholder="Annual, sick, unpaid, maternity" />
                </label>
              </div>
              <div className="workhub-field-grid two compact">
                <label className="workhub-icon-field">
                  <span>👤 Approver</span>
                  <input value={props.draft.approvalOwner} onChange={(event) => props.onDraftChange({ approvalOwner: event.target.value })} placeholder="Approving authority" />
                </label>
                <label className="workhub-icon-field">
                  <span>🗓️ Leave start</span>
                  <input type="date" value={props.draft.startDate} onChange={(event) => props.onDraftChange({ startDate: event.target.value })} />
                </label>
              </div>
              <label className="workhub-icon-field">
                <span>🏁 Return-to-work target</span>
                <input type="date" value={props.draft.deadline} onChange={(event) => props.onDraftChange({ deadline: event.target.value })} />
              </label>
              <label className="workhub-icon-field">
                <span>📝 Leave details</span>
                <textarea value={props.draft.description} onChange={(event) => props.onDraftChange({ description: event.target.value })} rows={3} placeholder="Reason, handover notes, and policy references" />
              </label>
            </>
          )}

          {props.intent === 'hr_kpi_cycle' && (
            <>
              <label className="workhub-icon-field">
                <span>📈 KPI cycle name</span>
                <input value={props.draft.name} onChange={(event) => props.onDraftChange({ name: event.target.value })} placeholder="Q1 performance cycle" />
              </label>
              <div className="workhub-field-grid two compact">
                <label className="workhub-icon-field">
                  <span>👤 Cycle owner</span>
                  <input value={props.draft.cycleOwner} onChange={(event) => props.onDraftChange({ cycleOwner: event.target.value })} placeholder="People ops / manager" />
                </label>
                <label className="workhub-icon-field">
                  <span>🏢 Department</span>
                  <input value={props.draft.department} onChange={(event) => props.onDraftChange({ department: event.target.value })} placeholder="Department" />
                </label>
              </div>
              <div className="workhub-field-grid two compact">
                <label className="workhub-icon-field">
                  <span>🎯 Primary KPI</span>
                  <input value={props.draft.primaryKpi} onChange={(event) => props.onDraftChange({ primaryKpi: event.target.value })} placeholder="Retention, engagement, productivity" />
                </label>
                <label className="workhub-icon-field">
                  <span>🔁 Review cadence</span>
                  <input value={props.draft.cadence} onChange={(event) => props.onDraftChange({ cadence: event.target.value })} placeholder="Weekly, monthly" />
                </label>
              </div>
              <div className="workhub-field-grid two compact">
                <label className="workhub-icon-field">
                  <span>🗓️ Cycle start</span>
                  <input type="date" value={props.draft.startDate} onChange={(event) => props.onDraftChange({ startDate: event.target.value })} />
                </label>
                <label className="workhub-icon-field">
                  <span>🏁 Cycle close</span>
                  <input type="date" value={props.draft.deadline} onChange={(event) => props.onDraftChange({ deadline: event.target.value })} />
                </label>
              </div>
              {renderPriorityField(props.draft, props.onDraftChange)}
              <label className="workhub-icon-field">
                <span>📝 KPI / OKR notes</span>
                <textarea value={props.draft.description} onChange={(event) => props.onDraftChange({ description: event.target.value })} rows={3} placeholder="Objectives, targets, and review expectations" />
              </label>
            </>
          )}

          {props.intent === 'hr_initiative_program' && (
            <>
              <label className="workhub-icon-field">
                <span>🌟 Program name</span>
                <input value={props.draft.name} onChange={(event) => props.onDraftChange({ name: event.target.value })} placeholder="Engagement / motivation initiative" />
              </label>
              <div className="workhub-field-grid two compact">
                <label className="workhub-icon-field">
                  <span>👤 Program owner</span>
                  <input value={props.draft.cycleOwner} onChange={(event) => props.onDraftChange({ cycleOwner: event.target.value })} placeholder="Program owner" />
                </label>
                <label className="workhub-icon-field">
                  <span>🏷️ Program type</span>
                  <input value={props.draft.programType} onChange={(event) => props.onDraftChange({ programType: event.target.value })} placeholder="Recognition, wellbeing, innovation" />
                </label>
              </div>
              <div className="workhub-field-grid two compact">
                <label className="workhub-icon-field">
                  <span>🏢 Department</span>
                  <input value={props.draft.department} onChange={(event) => props.onDraftChange({ department: event.target.value })} placeholder="Department or company-wide" />
                </label>
                <label className="workhub-icon-field">
                  <span>🔁 Cadence</span>
                  <input value={props.draft.cadence} onChange={(event) => props.onDraftChange({ cadence: event.target.value })} placeholder="Monthly, quarterly" />
                </label>
              </div>
              {renderPriorityField(props.draft, props.onDraftChange)}
              <label className="workhub-icon-field">
                <span>📝 Program brief</span>
                <textarea value={props.draft.description} onChange={(event) => props.onDraftChange({ description: event.target.value })} rows={3} placeholder="Outcomes, incentives, and participation model" />
              </label>
            </>
          )}

          {props.intent === 'hr_learning_certification' && (
            <>
              <label className="workhub-icon-field">
                <span>🎓 Learning record title</span>
                <input value={props.draft.name} onChange={(event) => props.onDraftChange({ name: event.target.value })} placeholder="Employee learning record" />
              </label>
              <div className="workhub-field-grid two compact">
                <label className="workhub-icon-field">
                  <span>🔢 Employee ID</span>
                  <input value={props.draft.employeeId} onChange={(event) => props.onDraftChange({ employeeId: event.target.value })} placeholder="Employee identifier" />
                </label>
                <label className="workhub-icon-field">
                  <span>📚 Certification</span>
                  <input value={props.draft.certificationName} onChange={(event) => props.onDraftChange({ certificationName: event.target.value })} placeholder="Certification or training name" />
                </label>
              </div>
              <div className="workhub-field-grid two compact">
                <label className="workhub-icon-field">
                  <span>🏛️ Issuer</span>
                  <input value={props.draft.certificationIssuer} onChange={(event) => props.onDraftChange({ certificationIssuer: event.target.value })} placeholder="Provider or institution" />
                </label>
                <label className="workhub-icon-field">
                  <span>🔁 Renewal / expiry</span>
                  <input type="date" value={props.draft.deadline} onChange={(event) => props.onDraftChange({ deadline: event.target.value })} />
                </label>
              </div>
              <label className="workhub-icon-field">
                <span>🔗 Evidence link</span>
                <input value={props.draft.referenceUrl} onChange={(event) => props.onDraftChange({ referenceUrl: event.target.value })} placeholder="Certificate URL or attachment reference" />
              </label>
              <label className="workhub-icon-field">
                <span>📝 Notes</span>
                <textarea value={props.draft.description} onChange={(event) => props.onDraftChange({ description: event.target.value })} rows={3} placeholder="Completion notes, skill upgrades, and competency impact" />
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
