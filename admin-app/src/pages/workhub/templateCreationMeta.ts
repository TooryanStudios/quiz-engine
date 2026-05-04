import type {
  WorkhubProjectIntent,
  WorkhubProjectPriority,
  WorkhubProjectType,
} from '../../lib/workhubRepo'
import type { WorkhubWorkspaceTemplateId } from './templates/types'

export type WorkhubTemplateCreationIntent = WorkhubProjectIntent

interface WorkhubTemplateCreationIntentDefaults {
  priority: WorkhubProjectPriority
  projectType: WorkhubProjectType
  billingCycle?: string
}

export interface WorkhubTemplateCreationIntentMeta {
  icon: string
  title: string
  subtitle: string
  submitLabel: string
  subjectLabel: string
  actionLabel: string
  defaults: WorkhubTemplateCreationIntentDefaults
}

const WORKHUB_TEMPLATE_CREATION_INTENT_META: Record<WorkhubTemplateCreationIntent, WorkhubTemplateCreationIntentMeta> = {
  project: {
    icon: '📁',
    title: 'Create Folder',
    subtitle: 'Create a folder/container to organize related items.',
    submitLabel: 'Create folder',
    subjectLabel: 'Folder',
    actionLabel: 'Add folder',
    defaults: {
      priority: 'medium',
      projectType: 'other',
    },
  },
  proposal: {
    icon: '🧾',
    title: 'Create Proposal',
    subtitle: 'Capture proposal-specific information like submission date, time, and bid scope.',
    submitLabel: 'Create proposal',
    subjectLabel: 'Proposal',
    actionLabel: 'Create proposal',
    defaults: {
      priority: 'high',
      projectType: 'tender',
    },
  },
  lead: {
    icon: '🎯',
    title: 'Create Lead',
    subtitle: 'Capture qualification and source details for lead intake.',
    submitLabel: 'Create lead',
    subjectLabel: 'Lead',
    actionLabel: 'Create lead',
    defaults: {
      priority: 'medium',
      projectType: 'lead',
    },
  },
  finance_invoice_stream: {
    icon: '🧾',
    title: 'Create Invoice Stream',
    subtitle: 'Set billing-cycle and owner information for recurring invoice operations.',
    submitLabel: 'Create invoice stream',
    subjectLabel: 'Invoice stream',
    actionLabel: 'Create invoice stream',
    defaults: {
      priority: 'high',
      projectType: 'direct_award',
      billingCycle: 'monthly',
    },
  },
  finance_payment_cycle: {
    icon: '💸',
    title: 'Create Payment Cycle',
    subtitle: 'Capture payment-cycle timing and approval ownership.',
    submitLabel: 'Create payment cycle',
    subjectLabel: 'Payment cycle',
    actionLabel: 'Create payment cycle',
    defaults: {
      priority: 'medium',
      projectType: 'other',
    },
  },
  marketing_campaign: {
    icon: '📣',
    title: 'Create Campaign',
    subtitle: 'Define campaign objective, channel, and launch timeline.',
    submitLabel: 'Create campaign',
    subjectLabel: 'Campaign',
    actionLabel: 'Create campaign',
    defaults: {
      priority: 'medium',
      projectType: 'other',
    },
  },
  marketing_content_stream: {
    icon: '🧩',
    title: 'Create Content Stream',
    subtitle: 'Define channel cadence and content production schedule.',
    submitLabel: 'Create content stream',
    subjectLabel: 'Content stream',
    actionLabel: 'Create content stream',
    defaults: {
      priority: 'medium',
      projectType: 'other',
    },
  },
  hr_requisition: {
    icon: '👥',
    title: 'Create Requisition',
    subtitle: 'Capture department and hiring-owner context for recruiting.',
    submitLabel: 'Create requisition',
    subjectLabel: 'Requisition',
    actionLabel: 'Create requisition',
    defaults: {
      priority: 'high',
      projectType: 'other',
    },
  },
  hr_onboarding_track: {
    icon: '🧭',
    title: 'Create Onboarding Track',
    subtitle: 'Define onboarding ownership and completion targets.',
    submitLabel: 'Create onboarding track',
    subjectLabel: 'Onboarding track',
    actionLabel: 'Create onboarding track',
    defaults: {
      priority: 'medium',
      projectType: 'other',
    },
  },
  hr_department_unit: {
    icon: '🏢',
    title: 'Create Department',
    subtitle: 'Create a department unit for the organization structure.',
    submitLabel: 'Create department',
    subjectLabel: 'Department',
    actionLabel: 'Create department',
    defaults: {
      priority: 'medium',
      projectType: 'other',
    },
  },
  hr_sub_department_unit: {
    icon: '🧩',
    title: 'Create Sub-department',
    subtitle: 'Create a child department under an existing department.',
    submitLabel: 'Create sub-department',
    subjectLabel: 'Sub-department',
    actionLabel: 'Create sub-department',
    defaults: {
      priority: 'medium',
      projectType: 'other',
    },
  },
  hr_employee_profile: {
    icon: '🪪',
    title: 'Create Employee Profile',
    subtitle: 'Capture employee identity, authority level, and role profile details.',
    submitLabel: 'Create employee profile',
    subjectLabel: 'Employee profile',
    actionLabel: 'Create employee profile',
    defaults: {
      priority: 'medium',
      projectType: 'other',
    },
  },
  hr_leave_case: {
    icon: '🏖️',
    title: 'Create Leave Case',
    subtitle: 'Track leave requests, approvers, and return-to-work commitments.',
    submitLabel: 'Create leave case',
    subjectLabel: 'Leave case',
    actionLabel: 'Create leave case',
    defaults: {
      priority: 'medium',
      projectType: 'other',
    },
  },
  hr_kpi_cycle: {
    icon: '📈',
    title: 'Create KPI Cycle',
    subtitle: 'Set KPI/OKR cycle ownership, cadence, and close targets.',
    submitLabel: 'Create KPI cycle',
    subjectLabel: 'KPI cycle',
    actionLabel: 'Create KPI cycle',
    defaults: {
      priority: 'high',
      projectType: 'other',
    },
  },
  hr_initiative_program: {
    icon: '🌟',
    title: 'Create Initiative Program',
    subtitle: 'Define motivation, engagement, and recognition initiatives.',
    submitLabel: 'Create initiative program',
    subjectLabel: 'Initiative program',
    actionLabel: 'Create initiative program',
    defaults: {
      priority: 'medium',
      projectType: 'other',
    },
  },
  hr_learning_certification: {
    icon: '🎓',
    title: 'Create Learning Record',
    subtitle: 'Track certifications, renewals, and professional upgrade evidence.',
    submitLabel: 'Create learning record',
    subjectLabel: 'Learning record',
    actionLabel: 'Create learning record',
    defaults: {
      priority: 'medium',
      projectType: 'other',
    },
  },
}

const WORKHUB_PROJECTS_TEMPLATE_PROJECT_INTENT_META: WorkhubTemplateCreationIntentMeta = {
  icon: '🚀',
  title: 'Create Project',
  subtitle: 'Create a project to organize deliverables and tasks.',
  submitLabel: 'Create project',
  subjectLabel: 'Project',
  actionLabel: 'Add project',
  defaults: {
    priority: 'medium',
    projectType: 'other',
  },
}

const WORKHUB_HR_TEMPLATE_PROJECT_INTENT_META: WorkhubTemplateCreationIntentMeta = {
  icon: '🏛️',
  title: 'Create Organization Unit',
  subtitle: 'Create an organization-level container for departments and employee records.',
  submitLabel: 'Create organization unit',
  subjectLabel: 'Organization unit',
  actionLabel: 'Create organization unit',
  defaults: {
    priority: 'medium',
    projectType: 'other',
  },
}

export function getTemplateCreationIntentMeta(
  intent: WorkhubTemplateCreationIntent,
  workspaceTemplateId?: WorkhubWorkspaceTemplateId,
): WorkhubTemplateCreationIntentMeta {
  if (intent === 'project' && workspaceTemplateId === 'projects') {
    return WORKHUB_PROJECTS_TEMPLATE_PROJECT_INTENT_META
  }
  if (intent === 'project' && workspaceTemplateId === 'hr') {
    return WORKHUB_HR_TEMPLATE_PROJECT_INTENT_META
  }
  return WORKHUB_TEMPLATE_CREATION_INTENT_META[intent]
}

interface WorkhubWorkspaceTemplateCreateActionDefinition {
  id: string
  intent: WorkhubTemplateCreationIntent
  tone: 'primary' | 'secondary'
  fullWidth?: boolean
  labelOverride?: string
}

export interface WorkhubWorkspaceTemplateCreateAction {
  id: string
  intent: WorkhubTemplateCreationIntent
  icon: string
  label: string
  tone: 'primary' | 'secondary'
  fullWidth?: boolean
}

const WORKHUB_WORKSPACE_TEMPLATE_CREATE_ACTIONS: Record<WorkhubWorkspaceTemplateId, WorkhubWorkspaceTemplateCreateActionDefinition[]> = {
  proposals_leads: [
    { id: 'create-proposal', intent: 'proposal', tone: 'primary' },
    { id: 'create-lead', intent: 'lead', tone: 'secondary' },
  ],
  finance: [
    { id: 'create-invoice-stream', intent: 'finance_invoice_stream', tone: 'primary' },
    { id: 'create-payment-cycle', intent: 'finance_payment_cycle', tone: 'secondary' },
  ],
  marketing: [
    { id: 'create-campaign', intent: 'marketing_campaign', tone: 'primary' },
    { id: 'create-content-stream', intent: 'marketing_content_stream', tone: 'secondary' },
  ],
  hr: [
    { id: 'create-organization-unit', intent: 'project', tone: 'primary' },
    { id: 'create-department', intent: 'hr_department_unit', tone: 'secondary' },
    { id: 'create-sub-department', intent: 'hr_sub_department_unit', tone: 'secondary' },
    { id: 'create-employee-profile', intent: 'hr_employee_profile', tone: 'secondary' },
    { id: 'create-leave-case', intent: 'hr_leave_case', tone: 'secondary' },
    { id: 'create-kpi-cycle', intent: 'hr_kpi_cycle', tone: 'secondary' },
    { id: 'create-initiative-program', intent: 'hr_initiative_program', tone: 'secondary' },
    { id: 'create-learning-record', intent: 'hr_learning_certification', tone: 'secondary' },
  ],
  empty: [
    {
      id: 'create-first-project',
      intent: 'project',
      tone: 'primary',
      fullWidth: true,
      labelOverride: 'Create first project',
    },
  ],
  projects: [
    {
      id: 'create-new-project',
      intent: 'project',
      tone: 'primary',
      fullWidth: true,
      labelOverride: 'Create new project',
    },
  ],
}

function getWorkspaceTemplateCreateActionDefinitions(
  templateId: WorkhubWorkspaceTemplateId,
): WorkhubWorkspaceTemplateCreateActionDefinition[] {
  return WORKHUB_WORKSPACE_TEMPLATE_CREATE_ACTIONS[templateId] || WORKHUB_WORKSPACE_TEMPLATE_CREATE_ACTIONS.projects
}

export function resolveWorkspaceTemplateCreateActions(
  templateId: WorkhubWorkspaceTemplateId,
): WorkhubWorkspaceTemplateCreateAction[] {
  const actions = getWorkspaceTemplateCreateActionDefinitions(templateId)
  return actions.map((action) => {
    const intentMeta = getTemplateCreationIntentMeta(action.intent, templateId)
    return {
      id: action.id,
      intent: action.intent,
      icon: intentMeta.icon,
      label: action.labelOverride || intentMeta.actionLabel,
      tone: action.tone,
      fullWidth: action.fullWidth,
    }
  })
}

export function resolveWorkspaceTemplateIntents(
  templateId: WorkhubWorkspaceTemplateId,
): WorkhubTemplateCreationIntent[] {
  const intents = new Set(getWorkspaceTemplateCreateActionDefinitions(templateId).map((action) => action.intent))
  // Folder containers are supported in every template.
  intents.add('project')
  return Array.from(intents)
}
