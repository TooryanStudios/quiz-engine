import type { WorkhubTemplateCreationDraft } from './components/TemplateCreateDialog'
import { getTemplateCreationIntentMeta, type WorkhubTemplateCreationIntent } from './templateCreationMeta'
export function buildInitialTemplateCreationDraft(intent: WorkhubTemplateCreationIntent): WorkhubTemplateCreationDraft {
  const base: WorkhubTemplateCreationDraft = {
    name: '',
    description: '',
    employeeId: '',
    authorityLevel: '',
    roleProfile: '',
    referenceUrl: '',
    clientId: '',
    tenderNumber: '',
    proposalId: '',
    startDate: '',
    deadline: new Date().toLocaleDateString('en-CA'),
    submissionTime: '12:00',
    priority: 'medium',
    leadSource: '',
    qualificationNotes: '',
    billingCycle: '',
    paymentOwner: '',
    campaignChannel: '',
    campaignObjective: '',
    cadence: '',
    department: '',
    departmentCode: '',
    headEmployeeId: '',
    parentDepartment: '',
    departmentEmail: '',
    departmentPhone: '',
    approvalOwner: '',
    leaveType: '',
    cycleOwner: '',
    primaryKpi: '',
    programType: '',
    certificationName: '',
    certificationIssuer: '',
    payrollId: '',
    nameArabic: '',
    gender: '',
    birthday: '',
    subDepartment: '',
    jobTitle: '',
    jobGrade: '',
    employmentStatus: '',
    workMode: '',
    employmentType: '',
    basicSalary: '',
    salaryAllowances: '',
    salaryDeductions: '',
    paymentFrequency: '',
    availableLeaveDays: '',
    usedLeaveDays: '',
    hireDate: '',
    exitDate: '',
    managerEmployeeId: '',
    emergencyContact: '',
    passportNumber: '',
    nationalId: '',
    bankAccount: '',
    hiringManager: '',
    onboardingOwner: '',
    budgetAmount: '',
  }
  const intentMeta = getTemplateCreationIntentMeta(intent)
  return {
    ...base,
    priority: intentMeta.defaults.priority,
    billingCycle: intentMeta.defaults.billingCycle || '',
  }
}

export function buildTemplateCreationDescription(intent: WorkhubTemplateCreationIntent, draft: WorkhubTemplateCreationDraft): string {
  const lines: string[] = []
  if (draft.description.trim()) lines.push(draft.description.trim())

  switch (intent) {
    case 'proposal':
      if (draft.tenderNumber.trim()) lines.push(`Tender number: ${draft.tenderNumber.trim()}`)
      if (draft.proposalId.trim()) lines.push(`Proposal ID: ${draft.proposalId.trim()}`)
      if (draft.budgetAmount.trim()) lines.push(`Estimated value: ${draft.budgetAmount.trim()}`)
      break
    case 'lead':
      if (draft.leadSource.trim()) lines.push(`Lead source: ${draft.leadSource.trim()}`)
      if (draft.qualificationNotes.trim()) lines.push(`Qualification notes: ${draft.qualificationNotes.trim()}`)
      break
    case 'finance_invoice_stream':
      if (draft.billingCycle.trim()) lines.push(`Billing cycle: ${draft.billingCycle.trim()}`)
      if (draft.paymentOwner.trim()) lines.push(`Approval owner: ${draft.paymentOwner.trim()}`)
      break
    case 'finance_payment_cycle':
      if (draft.paymentOwner.trim()) lines.push(`Payment owner: ${draft.paymentOwner.trim()}`)
      break
    case 'marketing_campaign':
      if (draft.campaignObjective.trim()) lines.push(`Campaign objective: ${draft.campaignObjective.trim()}`)
      if (draft.campaignChannel.trim()) lines.push(`Primary channel: ${draft.campaignChannel.trim()}`)
      break
    case 'marketing_content_stream':
      if (draft.campaignChannel.trim()) lines.push(`Channel: ${draft.campaignChannel.trim()}`)
      if (draft.cadence.trim()) lines.push(`Cadence: ${draft.cadence.trim()}`)
      break
    case 'hr_requisition':
      if (draft.department.trim()) lines.push(`Department: ${draft.department.trim()}`)
      if (draft.hiringManager.trim()) lines.push(`Hiring manager: ${draft.hiringManager.trim()}`)
      break
    case 'hr_onboarding_track':
      if (draft.onboardingOwner.trim()) lines.push(`Onboarding owner: ${draft.onboardingOwner.trim()}`)
      break
    case 'hr_department_unit':
      if (draft.departmentCode.trim()) lines.push(`Department code: ${draft.departmentCode.trim()}`)
      if (draft.headEmployeeId.trim()) lines.push(`Head employee ID: ${draft.headEmployeeId.trim()}`)
      if (draft.departmentEmail.trim()) lines.push(`Department email: ${draft.departmentEmail.trim()}`)
      if (draft.departmentPhone.trim()) lines.push(`Department phone: ${draft.departmentPhone.trim()}`)
      break
    case 'hr_sub_department_unit':
      if (draft.departmentCode.trim()) lines.push(`Department code: ${draft.departmentCode.trim()}`)
      if (draft.parentDepartment.trim()) lines.push(`Parent department: ${draft.parentDepartment.trim()}`)
      if (draft.headEmployeeId.trim()) lines.push(`Head employee ID: ${draft.headEmployeeId.trim()}`)
      break
    case 'hr_employee_profile':
      if (draft.employeeId.trim()) lines.push(`Employee ID: ${draft.employeeId.trim()}`)
      if (draft.payrollId.trim()) lines.push(`Payroll ID: ${draft.payrollId.trim()}`)
      if (draft.name.trim()) lines.push(`Name in English: ${draft.name.trim()}`)
      if (draft.nameArabic.trim()) lines.push(`Name in Arabic: ${draft.nameArabic.trim()}`)
      if (draft.gender.trim()) lines.push(`Gender: ${draft.gender.trim()}`)
      if (draft.birthday.trim()) lines.push(`Birthday: ${draft.birthday.trim()}`)
      if (draft.department.trim()) lines.push(`Department: ${draft.department.trim()}`)
      if (draft.subDepartment.trim()) lines.push(`Sub-department: ${draft.subDepartment.trim()}`)
      if (draft.jobTitle.trim()) lines.push(`Job title: ${draft.jobTitle.trim()}`)
      if (draft.jobGrade.trim()) lines.push(`Job grade: ${draft.jobGrade.trim()}`)
      if (draft.authorityLevel.trim()) lines.push(`Authority level: ${draft.authorityLevel.trim()}`)
      if (draft.roleProfile.trim()) lines.push(`Role profile: ${draft.roleProfile.trim()}`)
      if (draft.employmentStatus.trim()) lines.push(`Employee status: ${draft.employmentStatus.trim()}`)
      if (draft.workMode.trim()) lines.push(`Work mode: ${draft.workMode.trim()}`)
      if (draft.employmentType.trim()) lines.push(`Employment type: ${draft.employmentType.trim()}`)
      if (draft.basicSalary.trim()) lines.push(`Basic salary: ${draft.basicSalary.trim()}`)
      if (draft.salaryAllowances.trim()) lines.push(`Salary allowances: ${draft.salaryAllowances.trim()}`)
      if (draft.salaryDeductions.trim()) lines.push(`Salary deductions: ${draft.salaryDeductions.trim()}`)
      if (draft.paymentFrequency.trim()) lines.push(`Payment frequency: ${draft.paymentFrequency.trim()}`)
      if (draft.availableLeaveDays.trim()) lines.push(`Available leave days: ${draft.availableLeaveDays.trim()}`)
      if (draft.usedLeaveDays.trim()) lines.push(`Used leave days: ${draft.usedLeaveDays.trim()}`)
      if (draft.hireDate.trim()) lines.push(`Hire date: ${draft.hireDate.trim()}`)
      if (draft.exitDate.trim()) lines.push(`Exit date: ${draft.exitDate.trim()}`)
      if (draft.managerEmployeeId.trim()) lines.push(`Manager employee ID: ${draft.managerEmployeeId.trim()}`)
      if (draft.emergencyContact.trim()) lines.push(`Emergency contact: ${draft.emergencyContact.trim()}`)
      if (draft.passportNumber.trim()) lines.push(`Passport number: ${draft.passportNumber.trim()}`)
      if (draft.nationalId.trim()) lines.push(`National ID: ${draft.nationalId.trim()}`)
      if (draft.bankAccount.trim()) lines.push(`Bank account: ${draft.bankAccount.trim()}`)
      if (draft.referenceUrl.trim()) lines.push(`CV link: ${draft.referenceUrl.trim()}`)
      break
    case 'hr_leave_case':
      if (draft.employeeId.trim()) lines.push(`Employee ID: ${draft.employeeId.trim()}`)
      if (draft.department.trim()) lines.push(`Department: ${draft.department.trim()}`)
      if (draft.approvalOwner.trim()) lines.push(`Approver: ${draft.approvalOwner.trim()}`)
      if (draft.leaveType.trim()) lines.push(`Leave type: ${draft.leaveType.trim()}`)
      break
    case 'hr_kpi_cycle':
      if (draft.cycleOwner.trim()) lines.push(`Cycle owner: ${draft.cycleOwner.trim()}`)
      if (draft.department.trim()) lines.push(`Department: ${draft.department.trim()}`)
      if (draft.cadence.trim()) lines.push(`Cadence: ${draft.cadence.trim()}`)
      if (draft.primaryKpi.trim()) lines.push(`Primary KPI: ${draft.primaryKpi.trim()}`)
      break
    case 'hr_initiative_program':
      if (draft.cycleOwner.trim()) lines.push(`Program owner: ${draft.cycleOwner.trim()}`)
      if (draft.department.trim()) lines.push(`Department: ${draft.department.trim()}`)
      if (draft.programType.trim()) lines.push(`Program type: ${draft.programType.trim()}`)
      if (draft.cadence.trim()) lines.push(`Cadence: ${draft.cadence.trim()}`)
      break
    case 'hr_learning_certification':
      if (draft.employeeId.trim()) lines.push(`Employee ID: ${draft.employeeId.trim()}`)
      if (draft.certificationName.trim()) lines.push(`Certification: ${draft.certificationName.trim()}`)
      if (draft.certificationIssuer.trim()) lines.push(`Issuer: ${draft.certificationIssuer.trim()}`)
      if (draft.referenceUrl.trim()) lines.push(`Evidence link: ${draft.referenceUrl.trim()}`)
      if (draft.deadline.trim()) lines.push(`Renewal date: ${draft.deadline.trim()}`)
      break
    case 'project':
    default:
      break
  }

  return lines.join('\n')
}


const requiredTemplateFields={"project": [["deadline", "Project deadline is required."]], "proposal": [["clientId", "Proposal client is required."], ["tenderNumber", "Tender / RFP number is required for proposals."], ["proposalId", "Our proposal ID is required for proposals."], ["deadline", "Submission date is required for proposals."], ["submissionTime", "Submission time is required for proposals."]], "lead": [["leadSource", "Lead source is required."], ["deadline", "Expected close date is required."]], "finance_invoice_stream": [["billingCycle", "Billing cycle is required."], ["deadline", "First due date is required."], ["paymentOwner", "Approval owner is required."]], "finance_payment_cycle": [["deadline", "Disbursement date is required."], ["paymentOwner", "Approval owner is required."]], "marketing_campaign": [["campaignObjective", "Campaign objective is required."], ["campaignChannel", "Campaign channel is required."], ["startDate", "Launch date is required."], ["deadline", "Campaign end date is required."]], "marketing_content_stream": [["campaignChannel", "Content channel is required."], ["cadence", "Content cadence is required."], ["startDate", "Content stream start date is required."], ["deadline", "Target date is required."]], "hr_requisition": [["department", "Department is required."], ["hiringManager", "Hiring manager is required."], ["deadline", "Target hire date is required."]], "hr_onboarding_track": [["onboardingOwner", "Onboarding owner is required."], ["startDate", "Onboarding start date is required."], ["deadline", "Completion target is required."]], "hr_department_unit": [["departmentCode", "Department code is required."]], "hr_sub_department_unit": [["departmentCode", "Sub-department code is required."], ["parentDepartment", "Parent department is required."]], "hr_employee_profile": [], "hr_leave_case": [["employeeId", "Employee ID is required."], ["leaveType", "Leave type is required."], ["approvalOwner", "Approver is required."], ["startDate", "Leave start date is required."], ["deadline", "Return-to-work target is required."]], "hr_kpi_cycle": [["cycleOwner", "Cycle owner is required."], ["department", "Department is required."], ["primaryKpi", "Primary KPI is required."], ["cadence", "Review cadence is required."], ["startDate", "Cycle start date is required."], ["deadline", "Cycle close date is required."]], "hr_initiative_program": [["cycleOwner", "Program owner is required."], ["programType", "Program type is required."], ["cadence", "Cadence is required."]], "hr_learning_certification": [["employeeId", "Employee ID is required."], ["certificationName", "Certification name is required."], ["certificationIssuer", "Certification issuer is required."], ["deadline", "Renewal / expiry date is required."]]} as Record<string,[keyof WorkhubTemplateCreationDraft,string][]>
export function validateTemplateCreation(intent:WorkhubTemplateCreationIntent,draft:WorkhubTemplateCreationDraft,parentIntent?:string){
 if(!draft.name.trim())return "Name is required."
 for(const [field,message] of requiredTemplateFields[intent]||[])if(!String(draft[field]).trim())return message
 if(draft.startDate&&draft.deadline&&draft.startDate>draft.deadline)return "Start date cannot be after the deadline."
 if(draft.hireDate&&draft.exitDate&&draft.hireDate>draft.exitDate)return "Exit date cannot be earlier than hire date."
 if(intent==="hr_employee_profile"&&!(["hr_employees_root","hr_department_unit","hr_sub_department_unit"].includes(parentIntent||"")))return "Employee profiles must be created inside Employees, a department, or a sub-department."
 if(intent==="hr_sub_department_unit"&&!parentIntent)return "Choose a parent department."
 return ""
}
