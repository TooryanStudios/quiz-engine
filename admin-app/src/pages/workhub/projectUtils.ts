import type { WorkhubProject, WorkhubProjectIntent, WorkhubProjectType, WorkhubWorkspace } from '../../lib/workhubRepo'
import type { WorkhubTemplateCreationIntent } from './templateCreationMeta'
import { resolveWorkhubWorkspaceTemplateForWorkspace } from './workspaceTemplates'

export interface WorkhubDetailFieldDefinition {
  label: string
  descriptionKey: string
}

export const WORKHUB_INTENT_DETAIL_FIELDS: Record<WorkhubProjectIntent, WorkhubDetailFieldDefinition[]> = {
  project: [],
  proposal: [
    { label: 'Estimated value', descriptionKey: 'estimated value' },
  ],
  lead: [
    { label: 'Lead source', descriptionKey: 'lead source' },
    { label: 'Qualification notes', descriptionKey: 'qualification notes' },
  ],
  finance_invoice_stream: [
    { label: 'Billing cycle', descriptionKey: 'billing cycle' },
    { label: 'Approval owner', descriptionKey: 'approval owner' },
  ],
  finance_payment_cycle: [
    { label: 'Payment owner', descriptionKey: 'payment owner' },
  ],
  marketing_campaign: [
    { label: 'Campaign objective', descriptionKey: 'campaign objective' },
    { label: 'Primary channel', descriptionKey: 'primary channel' },
  ],
  marketing_content_stream: [
    { label: 'Channel', descriptionKey: 'channel' },
    { label: 'Cadence', descriptionKey: 'cadence' },
  ],
  hr_requisition: [
    { label: 'Department', descriptionKey: 'department' },
    { label: 'Hiring manager', descriptionKey: 'hiring manager' },
  ],
  hr_onboarding_track: [
    { label: 'Onboarding owner', descriptionKey: 'onboarding owner' },
  ],
  hr_department_unit: [
    { label: 'Department code', descriptionKey: 'department code' },
    { label: 'Head employee ID', descriptionKey: 'head employee id' },
    { label: 'Department email', descriptionKey: 'department email' },
    { label: 'Department phone', descriptionKey: 'department phone' },
  ],
  hr_sub_department_unit: [
    { label: 'Department code', descriptionKey: 'department code' },
    { label: 'Parent department', descriptionKey: 'parent department' },
    { label: 'Head employee ID', descriptionKey: 'head employee id' },
  ],
  hr_employee_profile: [
    { label: 'Employee ID', descriptionKey: 'employee id' },
    { label: 'Payroll ID', descriptionKey: 'payroll id' },
    { label: 'Name in English', descriptionKey: 'name in english' },
    { label: 'Name in Arabic', descriptionKey: 'name in arabic' },
    { label: 'Legal full name', descriptionKey: 'legal full name' },
    { label: 'Preferred name', descriptionKey: 'preferred name' },
    { label: 'Gender', descriptionKey: 'gender' },
    { label: 'Birthday', descriptionKey: 'birthday' },
    { label: 'Work email', descriptionKey: 'work email' },
    { label: 'Phone', descriptionKey: 'phone' },
    { label: 'Department', descriptionKey: 'department' },
    { label: 'Sub-department', descriptionKey: 'sub-department' },
    { label: 'Base location', descriptionKey: 'base location' },
    { label: 'Job title', descriptionKey: 'job title' },
    { label: 'Job grade', descriptionKey: 'job grade' },
    { label: 'Authority level', descriptionKey: 'authority level' },
    { label: 'Role profile', descriptionKey: 'role profile' },
    { label: 'Employee status', descriptionKey: 'employee status' },
    { label: 'Work mode', descriptionKey: 'work mode' },
    { label: 'Employment type', descriptionKey: 'employment type' },
    { label: 'Probation end', descriptionKey: 'probation end' },
    { label: 'Basic salary', descriptionKey: 'basic salary' },
    { label: 'Salary cycle', descriptionKey: 'salary cycle' },
    { label: 'Salary allowances', descriptionKey: 'salary allowances' },
    { label: 'Salary deductions', descriptionKey: 'salary deductions' },
    { label: 'Payment frequency', descriptionKey: 'payment frequency' },
    { label: 'Available leave days', descriptionKey: 'available leave days' },
    { label: 'Used leave days', descriptionKey: 'used leave days' },
    { label: 'Annual leave allowance', descriptionKey: 'annual leave allowance' },
    { label: 'Annual leave balance', descriptionKey: 'annual leave balance' },
    { label: 'Sick leave balance', descriptionKey: 'sick leave balance' },
    { label: 'Hire date', descriptionKey: 'hire date' },
    { label: 'Exit date', descriptionKey: 'exit date' },
    { label: 'Certification due date', descriptionKey: 'certification due date' },
    { label: 'Visa permit expiry', descriptionKey: 'visa permit expiry' },
    { label: 'Manager employee ID', descriptionKey: 'manager employee id' },
    { label: 'Emergency contact', descriptionKey: 'emergency contact' },
    { label: 'Passport number', descriptionKey: 'passport number' },
    { label: 'National ID', descriptionKey: 'national id' },
    { label: 'Bank account', descriptionKey: 'bank account' },
    { label: 'CV link', descriptionKey: 'cv link' },
    { label: 'Profile photo URL', descriptionKey: 'profile photo url' },
    { label: 'ID / passport URL', descriptionKey: 'id passport url' },
    { label: 'Certification files URL', descriptionKey: 'certification files url' },
  ],
  hr_leave_case: [
    { label: 'Employee ID', descriptionKey: 'employee id' },
    { label: 'Department', descriptionKey: 'department' },
    { label: 'Approver', descriptionKey: 'approver' },
    { label: 'Leave type', descriptionKey: 'leave type' },
  ],
  hr_kpi_cycle: [
    { label: 'Cycle owner', descriptionKey: 'cycle owner' },
    { label: 'Department', descriptionKey: 'department' },
    { label: 'Cadence', descriptionKey: 'cadence' },
    { label: 'Primary KPI', descriptionKey: 'primary kpi' },
  ],
  hr_initiative_program: [
    { label: 'Program owner', descriptionKey: 'program owner' },
    { label: 'Department', descriptionKey: 'department' },
    { label: 'Program type', descriptionKey: 'program type' },
    { label: 'Cadence', descriptionKey: 'cadence' },
  ],
  hr_learning_certification: [
    { label: 'Employee ID', descriptionKey: 'employee id' },
    { label: 'Certification', descriptionKey: 'certification' },
    { label: 'Issuer', descriptionKey: 'issuer' },
    { label: 'Evidence link', descriptionKey: 'evidence link' },
    { label: 'Renewal date', descriptionKey: 'renewal date' },
  ],
}

export const WORKHUB_INTENT_ALLOWED_PROJECT_TYPES: Partial<Record<WorkhubProjectIntent, WorkhubProjectType[]>> = {
  proposal: ['tender'],
  lead: ['lead'],
  finance_invoice_stream: ['direct_award'],
  finance_payment_cycle: ['other'],
  marketing_campaign: ['other'],
  marketing_content_stream: ['other'],
  hr_requisition: ['other'],
  hr_onboarding_track: ['other'],
  hr_department_unit: ['other'],
  hr_sub_department_unit: ['other'],
  hr_employee_profile: ['other'],
  hr_leave_case: ['other'],
  hr_kpi_cycle: ['other'],
  hr_initiative_program: ['other'],
  hr_learning_certification: ['other'],
}

function inferLegacyHrIntent(project: Pick<WorkhubProject, 'name' | 'description'>): WorkhubProjectIntent {
  const name = (project.name || '').toLowerCase()
  const description = (project.description || '').toLowerCase()
  const haystack = `${name}\n${description}`

  if (/(sub-?department|sub department|team unit|division)/.test(haystack)) return 'hr_sub_department_unit'
  if (/(department|org unit|organization unit|head of department|department code)/.test(haystack)) return 'hr_department_unit'
  if (/(leave case|leave type|return-to-work|return to work|approver)/.test(haystack)) return 'hr_leave_case'
  if (/(kpi cycle|okr|primary kpi|cycle owner|performance cycle)/.test(haystack)) return 'hr_kpi_cycle'
  if (/(initiative program|motivation|engagement|recognition program)/.test(haystack)) return 'hr_initiative_program'
  if (/(certification|renewal|issuer|learning record|training)/.test(haystack)) return 'hr_learning_certification'
  if (/(employee id|payroll id|basic salary|available leave|work mode|employee profile|authority level)/.test(haystack)) return 'hr_employee_profile'
  if (/(onboarding|joining plan|welcome plan)/.test(haystack)) return 'hr_onboarding_track'

  return 'hr_department_unit'
}

export function buildProjectDescriptionFromIntentDrafts(
  intent: WorkhubProjectIntent,
  narrative: string,
  detailsByKey: Record<string, string>,
): string {
  const lines: string[] = []
  if (narrative.trim()) lines.push(narrative.trim())
  WORKHUB_INTENT_DETAIL_FIELDS[intent].forEach((field) => {
    const value = (detailsByKey[field.descriptionKey] || '').trim()
    if (!value) return
    lines.push(`${field.label}: ${value}`)
  })
  return lines.join('\n')
}

export function splitTemplateDescriptionForIntent(
  intent: WorkhubProjectIntent,
  description: string,
): { narrative: string; detailsByKey: Record<string, string> } {
  const normalizedDescription = description.trim()
  if (!normalizedDescription) return { narrative: '', detailsByKey: {} }

  const intentFields = WORKHUB_INTENT_DETAIL_FIELDS[intent]
  if (intentFields.length === 0) return { narrative: normalizedDescription, detailsByKey: {} }

  const supportedKeys = new Set(intentFields.map((field) => field.descriptionKey))
  const narrativeLines: string[] = []
  const detailsByKey: Record<string, string> = {}

  normalizedDescription
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .forEach((line) => {
      const separatorIndex = line.indexOf(':')
      if (separatorIndex <= 0) { narrativeLines.push(line); return }
      const key = line.slice(0, separatorIndex).trim().toLowerCase()
      const value = line.slice(separatorIndex + 1).trim()
      if (!supportedKeys.has(key) || !value) { narrativeLines.push(line); return }
      detailsByKey[key] = value
    })

  return { narrative: narrativeLines.join('\n').trim(), detailsByKey }
}

export function isValidHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value)
}

export function normalizeMemberUids(uids: string[]): string[] {
  return Array.from(new Set(uids.filter(Boolean)))
}

export function normalizeInviteEmails(emails: string[]): string[] {
  return Array.from(new Set(emails.map((value) => value.trim().toLowerCase()).filter(Boolean)))
}

export function canAccessWorkspace(
  workspace: WorkhubWorkspace,
  uid: string,
  email: string,
  isPrivileged: boolean,
): boolean {
  if (isPrivileged) return true
  const accessMemberUids = normalizeMemberUids(workspace.accessMemberUids || [])
  const invitedEmails = normalizeInviteEmails(workspace.invitedEmails || [])
  const hasUidAccess = accessMemberUids.includes(uid)
  const hasEmailInvite = !!email && invitedEmails.includes(email.trim().toLowerCase())
  return hasUidAccess || hasEmailInvite
}

export function canViewProject(project: WorkhubProject, uid: string, canSeeAllProjects: boolean): boolean {
  if (canSeeAllProjects) return true
  if (project.visibility !== 'restricted') return true
  return project.createdBy === uid || project.memberUids.includes(uid)
}

export function canViewProjectWithAncestors(
  project: WorkhubProject,
  uid: string,
  canSeeAllProjects: boolean,
  projectById: Map<string, WorkhubProject>,
): boolean {
  if (!canViewProject(project, uid, canSeeAllProjects)) return false
  const seen = new Set<string>()
  let cursor = project.parentProjectId || null
  while (cursor) {
    if (seen.has(cursor)) return false
    seen.add(cursor)
    const parent = projectById.get(cursor)
    if (!parent) return false
    if (!canViewProject(parent, uid, canSeeAllProjects)) return false
    cursor = parent.parentProjectId || null
  }
  return true
}

export function getWorkspaceType(
  workspace: Pick<WorkhubWorkspace, 'type'> | null | undefined,
): 'technical' | 'hr' | 'finance' {
  return workspace?.type || 'technical'
}

function toDateOnlyTimestamp(year: number, month: number, day: number): number | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null
  if (month < 1 || month > 12) return null
  if (day < 1 || day > 31) return null
  const candidate = new Date(Date.UTC(year, month - 1, day))
  if (
    candidate.getUTCFullYear() !== year
    || candidate.getUTCMonth() !== month - 1
    || candidate.getUTCDate() !== day
  ) {
    return null
  }
  return candidate.getTime()
}

function parseDateInputCandidates(value: string): number[] {
  const trimmed = value.trim()
  if (!trimmed) return []

  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed)
  if (isoMatch) {
    const candidate = toDateOnlyTimestamp(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]))
    return candidate === null ? [] : [candidate]
  }

  const slashMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed)
  if (slashMatch) {
    const first = Number(slashMatch[1])
    const second = Number(slashMatch[2])
    const year = Number(slashMatch[3])
    const candidates = new Set<number>()

    const monthFirst = toDateOnlyTimestamp(year, first, second)
    if (monthFirst !== null) candidates.add(monthFirst)

    const dayFirst = toDateOnlyTimestamp(year, second, first)
    if (dayFirst !== null) candidates.add(dayFirst)

    return Array.from(candidates)
  }

  const parsed = Date.parse(trimmed)
  if (!Number.isFinite(parsed)) return []
  const candidate = new Date(parsed)
  return [Date.UTC(candidate.getUTCFullYear(), candidate.getUTCMonth(), candidate.getUTCDate())]
}

export function isStartAfterEnd(startDate: string, endDate: string): boolean {
  const startCandidates = parseDateInputCandidates(startDate)
  const endCandidates = parseDateInputCandidates(endDate)
  if (startCandidates.length === 0 || endCandidates.length === 0) return false

  for (const startCandidate of startCandidates) {
    for (const endCandidate of endCandidates) {
      if (startCandidate <= endCandidate) {
        return false
      }
    }
  }

  return true
}

export function makeTaskStatusId(label: string): string {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || `status_${Date.now()}`
}

export type WorkhubProjectTreeNode = WorkhubProject & { children: WorkhubProjectTreeNode[] }

function getSortTimestamp(value: unknown): number {
  if (!value) return 0
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  if (typeof value === 'object') {
    const maybeToMillis = value as { toMillis?: () => number }
    if (typeof maybeToMillis.toMillis === 'function') {
      const millis = maybeToMillis.toMillis()
      return Number.isFinite(millis) ? millis : 0
    }
    const maybeTimestampParts = value as { seconds?: number; nanoseconds?: number }
    if (typeof maybeTimestampParts.seconds === 'number') {
      const nanos = typeof maybeTimestampParts.nanoseconds === 'number' ? maybeTimestampParts.nanoseconds : 0
      return (maybeTimestampParts.seconds * 1000) + Math.floor(nanos / 1_000_000)
    }
  }
  return 0
}

export function buildProjectTree(items: WorkhubProject[], stopDescendProjectIds?: ReadonlySet<string>): WorkhubProjectTreeNode[] {
  const sorted = [...items].sort((a, b) => {
    const aSortOrder = Number((a as WorkhubProject & { sortOrder?: unknown }).sortOrder)
    const bSortOrder = Number((b as WorkhubProject & { sortOrder?: unknown }).sortOrder)
    const aHasSortOrder = Number.isFinite(aSortOrder)
    const bHasSortOrder = Number.isFinite(bSortOrder)
    if (aHasSortOrder && bHasSortOrder && aSortOrder !== bSortOrder) {
      return aSortOrder - bSortOrder
    }
    if (aHasSortOrder !== bHasSortOrder) {
      return aHasSortOrder ? -1 : 1
    }

    const aCreated = getSortTimestamp(a.createdAt)
    const bCreated = getSortTimestamp(b.createdAt)
    if (aCreated !== bCreated) {
      // Keep older items first to preserve creation order naturally.
      return aCreated - bCreated
    }

    return a.name.localeCompare(b.name)
  })
  const byParent = new Map<string, WorkhubProject[]>()
  sorted.forEach((item) => {
    const key = item.parentProjectId || ''
    const bucket = byParent.get(key) || []
    bucket.push(item)
    byParent.set(key, bucket)
  })
  const build = (parentId: string): WorkhubProjectTreeNode[] => {
    return (byParent.get(parentId) || []).map((item) => ({
      ...item,
      children: stopDescendProjectIds?.has(item.id) ? [] : build(item.id),
    }))
  }
  return build('')
}

export function flattenProjectTree(
  nodes: WorkhubProjectTreeNode[],
  depth = 0,
): Array<{ id: string; name: string; depth: number }> {
  return nodes.flatMap((node) => [
    { id: node.id, name: node.name, depth },
    ...flattenProjectTree(node.children, depth + 1),
  ])
}

export function collectProjectBranchIds(
  projectId: string,
  byParent: Map<string, WorkhubProject[]>,
): Set<string> {
  const ids = new Set<string>()
  const visit = (id: string) => {
    ids.add(id)
    ;(byParent.get(id) || []).forEach((child) => visit(child.id))
  }
  if (projectId) visit(projectId)
  return ids
}

export function collectProjectLineage(projectId: string, byId: Record<string, WorkhubProject>): string[] {
  const lineage: string[] = []
  let pointer = byId[projectId]
  while (pointer?.parentProjectId) {
    lineage.unshift(pointer.parentProjectId)
    pointer = byId[pointer.parentProjectId]
  }
  return lineage
}

export function inferLegacyProjectIntent(
  project: Pick<WorkhubProject, 'workspaceId' | 'projectType' | 'name' | 'description'>,
  workspaceById: Record<string, Pick<WorkhubWorkspace, 'type' | 'templateId'> | undefined>,
): WorkhubProjectIntent {
  const workspace = workspaceById[project.workspaceId]
  const workspaceTemplateId = resolveWorkhubWorkspaceTemplateForWorkspace(workspace).templateId
  switch (workspaceTemplateId) {
    case 'proposals_leads':
      return project.projectType === 'lead' ? 'lead' : 'proposal'
    case 'finance':
      return project.projectType === 'direct_award' ? 'finance_invoice_stream' : 'finance_payment_cycle'
    case 'marketing':
      return 'marketing_campaign'
    case 'hr':
      return inferLegacyHrIntent(project)
    case 'empty':
    case 'projects':
    default:
      return 'project'
  }
}

export function resolveEffectiveProjectIntent(
  project: Pick<WorkhubProject, 'workspaceId' | 'projectType' | 'intent' | 'name' | 'description'>,
  workspaceById: Record<string, Pick<WorkhubWorkspace, 'type' | 'templateId'> | undefined>,
  allowedIntents: Set<WorkhubTemplateCreationIntent>,
): WorkhubProjectIntent {
  if (project.intent === 'project') {
    return 'project'
  }
  if (project.intent && allowedIntents.has(project.intent)) {
    return project.intent
  }
  return inferLegacyProjectIntent(project, workspaceById)
}
