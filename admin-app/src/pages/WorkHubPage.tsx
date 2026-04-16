import { onAuthStateChanged, signOut } from 'firebase/auth'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useNavigationType } from 'react-router-dom'
import { auth, storage } from '../lib/firebase'
import { markSignOut } from '../lib/signOutState'
import { useToast } from '../lib/ToastContext'
import {
  addWorkhubComment,
  createWorkhubActivity,
  createWorkhubClient,
  createWorkhubNotifications,
  createWorkhubProject,
  createWorkhubTask,
  createWorkhubWorkspace,
  deleteWorkhubClient,
  deleteWorkhubDocument,
  deleteWorkhubProject,
  deleteWorkhubTask,
  deleteWorkhubWorkspace,
  requestWorkhubAccess,
  setWorkhubMemberStatus,
  subscribeAllWorkhubMembers,
  subscribeOwnWorkhubMember,
  subscribeWorkhubActivity,
  subscribeWorkhubCommentsByEntity,
  subscribeWorkhubClientsMulti,
  subscribeWorkhubDocuments,
  getWorkhubDocumentById,
  markWorkhubNotificationRead,
  saveWorkhubDocumentNotifyPrefs,
  saveWorkhubTaskNotifyPrefs,
  subscribeWorkhubNotifications,
  subscribeWorkhubProjectsMulti,
  subscribeWorkhubTasks,
  subscribeWorkhubWorkspaces,
  ensureWorkhubDriveProjectFolder,
  uploadWorkhubAttachmentToDrive,
  updateWorkhubProject,
  updateWorkhubComment,
  updateWorkhubTask,
  updateWorkhubClient,
  updateWorkhubWorkspace,
  type WorkhubActivity,
  type WorkhubClient,
  type WorkhubDocument,
  type WorkhubMember,
  type WorkhubNotification,
  type WorkhubProject,
  type WorkhubProjectIntent,
  type WorkhubProjectPriority,
  type WorkhubProjectType,
  type WorkhubTask,
  type WorkhubTaskChecklistItem,
  type WorkhubTaskComment,
  type WorkhubTaskPriority,
  type WorkhubTaskStatus,
  type WorkhubTaskStatusConfig,
  type WorkhubVisibility,
  type WorkhubWorkspace,
  createWorkhubMoodBoard,
  subscribeWorkhubMoodBoardsForWorkspace,
  type WorkhubMoodBoard,
} from '../lib/workhubRepo'

import { ProjectActionMenu } from './workhub/components/ProjectActionMenu'
import { MoodBoardPanel } from './workhub/components/MoodBoardDialog'
import { TeamDialog } from './workhub/components/TeamDialog'
import { WorkspaceSettingsDialog } from './workhub/components/WorkspaceSettingsDialog'
import { WorkhubStyles } from './workhub/components/WorkhubStyles'
import { TaskRow, emptyTaskRowMeta, type TaskRowCallbacks, type TaskRowMeta } from './workhub/components/TaskRow'
import { QuickAddTaskRow, type QuickAddTaskSubmitInput } from './workhub/components/QuickAddTaskRow'
import { ProjectSettingsDialog } from './workhub/components/ProjectSettingsDialog'
import { CreateDialog } from './workhub/components/CreateDialog'
import { CreateWorkspaceDialog } from './workhub/components/CreateWorkspaceDialog'
import { DocumentCreateDialog } from './workhub/components/DocumentCreateDialog'
import { WorkhubEntityIntentDetailForm } from './workhub/components/EntityIntentDetailForms'
import { ProjectTreeNodes } from './workhub/components/ProjectTreeNodes'
import {
  TemplateCreateDialog,
  type WorkhubTemplateCreationDraft,
} from './workhub/components/TemplateCreateDialog'
import {
  getTemplateCreationIntentMeta,
  resolveWorkspaceTemplateCreateActions,
  resolveWorkspaceTemplateIntents,
  type WorkhubWorkspaceTemplateCreateAction,
  type WorkhubTemplateCreationIntent,
} from './workhub/templateCreationMeta'
import {
  PRIORITY_LABELS,
  getPriorityIcon,
  getTaskStatusIcon,
  PROJECT_COLORS,
  PROJECT_TYPE_OPTIONS,
  PROJECT_PRIORITY_OPTIONS,
  PROJECT_PRIORITY_RANK,
  resolveProjectColorMeanings,
  type WorkhubProjectColorMeaning,
} from './workhub/constants'
import { buildWorkspaceTaskStatuses, cloneDefaultTaskStatuses } from './workhub/statusTemplates'
import {
  DEFAULT_WORKHUB_WORKSPACE_TEMPLATE_ID,
  resolveWorkhubWorkspaceTemplateIcon,
  resolveWorkhubWorkspaceTemplateForWorkspace,
  type WorkhubWorkspaceTemplateId,
} from './workhub/workspaceTemplates'
import { buildWorkhubHomeWidgets } from './workhub/homeTemplateWidgets'
import {
  formatDueDateShort,
  formatProjectDeadlineDate,
  formatTime,
  getInitials,
  isEffectivelyEmptyTaskTitle,
  isImageAttachmentUrl,
  normalizeTaskTitle,
  resolveProjectDeadlineMs,
  splitTaskTitles,
} from './workhub/taskUtils'
import {
  buildProjectTree,
  canAccessWorkspace,
  canViewProject,
  collectProjectBranchIds,
  collectProjectLineage,
  flattenProjectTree,
  isStartAfterEnd,
  isValidHexColor,
  makeTaskStatusId,
  normalizeInviteEmails,
  normalizeMemberUids,
} from './workhub/projectUtils'
import {
  ATTACHMENT_REVIEW_STORAGE_KEY,
  createEmptyImageReview,
  type WorkhubImageReview,
} from './workhub/imageReview'
import { buildChecklist, deriveAttachmentTitle, getTaskAttachmentTitle, getTaskAttachments, getTaskLinkTitle, getTaskLinks, getUrlHostLabel } from './workhub/taskDataUtils'
import { getNextTaskSortOrder, getOrderedTasksForStatus } from './workhub/taskOrdering'
import { useWorkhubImageReviewHandlers } from './workhub/hooks/useWorkhubImageReviewHandlers'
import { useWorkhubAccessHandlers } from './workhub/hooks/useWorkhubAccessHandlers'
import { useWorkhubTaskDetailHandlers } from './workhub/hooks/useWorkhubTaskDetailHandlers'
import { useWorkhubProjectDetailHandlers } from './workhub/hooks/useWorkhubProjectDetailHandlers'
import { useWorkhubUiInteractionHandlers } from './workhub/hooks/useWorkhubUiInteractionHandlers'
import { useWorkhubProjectTreeSidebarHandlers } from './workhub/hooks/useWorkhubProjectTreeSidebarHandlers'
import { useWorkhubDocumentCreation } from './workhub/hooks/useWorkhubDocumentCreation'
import { useWorkhubWorkspaceTemplates } from './workhub/hooks/useWorkhubWorkspaceTemplates'
import { useWorkhubDocEditorHandlers } from './workhub/hooks/useWorkhubDocEditorHandlers'
import { WorkhubDocEditor } from './workhub/components/WorkhubDocEditor'
import { WorkhubDiscussionCard } from './workhub/components/WorkhubDiscussionCard'
import { WorkhubTaskAttachmentCard } from './workhub/components/WorkhubTaskAttachmentCard'
import { WorkhubTaskChecklistCard } from './workhub/components/WorkhubTaskChecklistCard'
import { WorkhubProjectAttachmentCard } from './workhub/components/WorkhubProjectAttachmentCard'
import type { WorkhubUserAccessDraft, WorkhubUserAccessMode, WorkhubUserWorkspaceDraft } from './workhub/accessTypes'

const MASTER_EMAIL = import.meta.env.VITE_MASTER_EMAIL as string | undefined
const DEFAULT_SUBMISSION_TIME = '10:00'
const WORKHUB_PHONE_MAX_WIDTH = 767
const WORKHUB_DESKTOP_MIN_WIDTH = WORKHUB_PHONE_MAX_WIDTH + 1
const DEFAULT_STATUS_TASK_RENDER_LIMIT = 80
const STATUS_TASK_RENDER_INCREMENT = 80

function getCurrentDateInputValue(): string {
  const now = new Date()
  const timezoneOffsetMs = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - timezoneOffsetMs).toISOString().slice(0, 10)
}

function shiftDateInputValue(baseDate: string, daysDelta: number): string {
  const trimmed = baseDate.trim()
  if (!trimmed) return ''
  const parsed = Date.parse(`${trimmed}T00:00:00`)
  if (!Number.isFinite(parsed)) return ''
  const target = new Date(parsed)
  target.setDate(target.getDate() + daysDelta)
  const timezoneOffsetMs = target.getTimezoneOffset() * 60_000
  return new Date(target.getTime() - timezoneOffsetMs).toISOString().slice(0, 10)
}

function resolveWorkspaceScopeType(
  workspace: Pick<WorkhubWorkspace, 'type' | 'templateId'> | null | undefined,
): WorkhubWorkspace['type'] {
  return resolveWorkhubWorkspaceTemplateForWorkspace(workspace).template.workspaceType
}

function inferLegacyProjectIntent(
  project: Pick<WorkhubProject, 'workspaceId' | 'projectType'>,
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
      return 'hr_requisition'
    case 'empty':
    case 'projects':
    default:
      return 'project'
  }
}

function getTemplateDateRangeValidationMessage(intent: WorkhubTemplateCreationIntent): string {
  switch (intent) {
    case 'marketing_campaign':
      return 'Campaign end date cannot be earlier than launch date.'
    case 'marketing_content_stream':
      return 'Target date cannot be earlier than content stream start date.'
    case 'hr_onboarding_track':
      return 'Completion target cannot be earlier than onboarding start date.'
    default:
      return 'Deadline cannot be earlier than start date.'
  }
}

function getIntentSettingsDeadlineLabel(intent: WorkhubProjectIntent, projectType: WorkhubProjectType): string {
  switch (intent) {
    case 'proposal':
      return 'Submission date'
    case 'lead':
      return 'Expected close date'
    case 'finance_invoice_stream':
      return 'First due date'
    case 'finance_payment_cycle':
      return 'Disbursement date'
    case 'marketing_campaign':
      return 'Campaign end date'
    case 'marketing_content_stream':
      return 'Target date'
    case 'hr_requisition':
      return 'Target hire date'
    case 'hr_onboarding_track':
      return 'Completion target'
    case 'project':
    default:
      return projectType === 'tender' ? 'Submission date' : 'Final submission deadline'
  }
}

function resolveProjectMainPanelView(mainPanelView: WorkhubProject['mainPanelView']): 'tasks' | 'dashboard' {
  return mainPanelView === 'dashboard' ? 'dashboard' : 'tasks'
}

const MONEY_RELATED_INTENTS = new Set<WorkhubProjectIntent>([
  'proposal',
  'lead',
  'finance_invoice_stream',
  'finance_payment_cycle',
  'marketing_campaign',
  'marketing_content_stream',
])

function normalizeMoneyCurrency(value: string | undefined): string {
  const normalized = (value || '').trim().toUpperCase().replace(/[^A-Z]/g, '')
  const nextCurrency = normalized === 'USD' ? 'OMR' : normalized
  return (nextCurrency || 'OMR').slice(0, 3)
}

function parseMonetaryAmountInput(value: string): number | null {
  const normalized = value.trim()
  if (!normalized) return 0
  const parsed = Number(normalized)
  if (!Number.isFinite(parsed) || parsed < 0) return null
  return Math.round(parsed * 100) / 100
}

function parseMonetaryNumberFromText(value: string): number {
  const matched = value.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/)
  if (!matched) return 0
  const parsed = Number(matched[0])
  if (!Number.isFinite(parsed) || parsed <= 0) return 0
  return Math.round(parsed * 100) / 100
}

function resolveProjectMonetaryAmount(project: Pick<WorkhubProject, 'valueAmount' | 'description'>): number {
  if (typeof project.valueAmount === 'number' && Number.isFinite(project.valueAmount) && project.valueAmount > 0) {
    return Math.round(project.valueAmount * 100) / 100
  }
  const lines = (project.description || '').split('\n')
  for (const line of lines) {
    const separatorIndex = line.indexOf(':')
    if (separatorIndex <= 0) continue
    const key = line.slice(0, separatorIndex).trim().toLowerCase()
    if (!/(estimated value|potential value|value|budget|amount|invoice value|payment value)/.test(key)) continue
    const parsed = parseMonetaryNumberFromText(line.slice(separatorIndex + 1))
    if (parsed > 0) return parsed
  }
  return 0
}

function resolveProjectMonetaryCurrency(project: Pick<WorkhubProject, 'valueCurrency' | 'description'>): string {
  if ((project.valueCurrency || '').trim()) return normalizeMoneyCurrency(project.valueCurrency)
  const description = (project.description || '').toUpperCase()
  const matched = description.match(/\b[A-Z]{3}\b/)
  return normalizeMoneyCurrency(matched ? matched[0] : 'OMR')
}

function addMonetaryTotal(target: Record<string, number>, currency: string, amount: number) {
  if (amount <= 0) return
  target[currency] = Math.round(((target[currency] || 0) + amount) * 100) / 100
}

function pluralizeDashboardSubjectLabel(label: string): string {
  const normalized = label.trim()
  const irregularMap: Record<string, string> = {
    Proposal: 'Proposals',
    Lead: 'Leads',
    Folder: 'Folders',
    Project: 'Projects',
    Campaign: 'Campaigns',
    Requisition: 'Requisitions',
    'Content stream': 'Content streams',
    'Invoice stream': 'Invoice streams',
    'Payment cycle': 'Payment cycles',
    'Onboarding track': 'Onboarding tracks',
  }
  if (irregularMap[normalized]) return irregularMap[normalized]
  return normalized.endsWith('s') ? normalized : `${normalized}s`
}

function resolveWorkspaceCollectionHeading(templateId: WorkhubWorkspaceTemplateId): string {
  switch (templateId) {
    case 'proposals_leads':
      return 'Lead & proposal categories'
    case 'finance':
      return 'Finance categories'
    case 'marketing':
      return 'Campaign categories'
    case 'hr':
      return 'HR categories'
    case 'projects':
      return 'Project categories'
    default:
      return 'Top-level categories'
  }
}

function formatMonetaryAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${currency} ${amount.toLocaleString()}`
  }
}

function formatMonetaryTotalsByCurrency(totalsByCurrency: Record<string, number>): string {
  const entries = Object.entries(totalsByCurrency).filter(([, amount]) => amount > 0)
  if (entries.length === 0) return '0'
  return entries
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([currency, amount]) => formatMonetaryAmount(amount, currency))
    .join(' + ')
}

function shouldShowMonetaryValueField(intent: WorkhubProjectIntent): boolean {
  return MONEY_RELATED_INTENTS.has(intent)
}

function getIntentMonetaryValueLabel(intent: WorkhubProjectIntent): string {
  switch (intent) {
    case 'proposal':
      return 'Proposal value'
    case 'lead':
      return 'Lead value'
    case 'finance_invoice_stream':
      return 'Invoice stream value'
    case 'finance_payment_cycle':
      return 'Payment cycle value'
    case 'marketing_campaign':
      return 'Campaign budget value'
    case 'marketing_content_stream':
      return 'Content budget value'
    case 'project':
    case 'hr_requisition':
    case 'hr_onboarding_track':
    default:
      return 'Value amount'
  }
}

function resolveEffectiveProjectIntent(
  project: Pick<WorkhubProject, 'workspaceId' | 'projectType' | 'intent'>,
  workspaceById: Record<string, Pick<WorkhubWorkspace, 'type' | 'templateId'> | undefined>,
  allowedIntents: Set<WorkhubTemplateCreationIntent>,
): WorkhubProjectIntent {
  // Folder containers must stay as project intent in every workspace template.
  if (project.intent === 'project') {
    return 'project'
  }
  if (project.intent && allowedIntents.has(project.intent)) {
    return project.intent
  }
  return inferLegacyProjectIntent(project, workspaceById)
}

function buildInitialTemplateCreationDraft(intent: WorkhubTemplateCreationIntent): WorkhubTemplateCreationDraft {
  const base: WorkhubTemplateCreationDraft = {
    name: '',
    description: '',
    clientId: '',
    tenderNumber: '',
    proposalId: '',
    startDate: '',
    deadline: getCurrentDateInputValue(),
    submissionTime: DEFAULT_SUBMISSION_TIME,
    priority: 'medium',
    leadSource: '',
    qualificationNotes: '',
    billingCycle: '',
    paymentOwner: '',
    campaignChannel: '',
    campaignObjective: '',
    cadence: '',
    department: '',
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

function buildTemplateCreationDescription(intent: WorkhubTemplateCreationIntent, draft: WorkhubTemplateCreationDraft): string {
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
    case 'project':
    default:
      break
  }

  return lines.join('\n')
}

interface WorkhubDetailFieldDefinition {
  label: string
  descriptionKey: string
}

interface WorkhubIntentDescriptionSplit {
  narrative: string
  detailsByKey: Record<string, string>
}

const WORKHUB_INTENT_DETAIL_FIELDS: Record<WorkhubProjectIntent, WorkhubDetailFieldDefinition[]> = {
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
}

// ── URL helpers ────────────────────────────────────────────────────────────
type WorkhubCanonicalSection = 'home' | 'users' | 'tasks' | 'notes' | 'dashboard' | 'clients'
type WorkhubParsedRouteKind = 'root' | 'workspace' | 'project' | 'document' | 'moodboard' | 'task'

type WorkhubParsedRoute = {
  source: 'canonical' | 'legacy'
  kind: WorkhubParsedRouteKind
  wsId: string
  projId: string
  section: string
  entityId: string
}

type WorkhubPersistedRouteMap = Record<string, string>

const WORKHUB_WORKSPACE_SECTIONS = new Set<WorkhubCanonicalSection>(['home', 'users', 'tasks', 'notes', 'dashboard', 'clients'])
const WORKHUB_LEGACY_SECTIONS = new Set<string>([...WORKHUB_WORKSPACE_SECTIONS, 'moodboard'])

function isWorkhubWorkspaceSection(value: string): value is WorkhubCanonicalSection {
  return WORKHUB_WORKSPACE_SECTIONS.has(value as WorkhubCanonicalSection)
}

function parseLegacyWorkhubPathname(pathname: string): Pick<WorkhubParsedRoute, 'wsId' | 'projId' | 'section' | 'entityId'> {
  const parts = pathname.replace(/^\/workhub\/?/, '').split('/').filter(Boolean)
  let wsId = ''
  let projId = 'all'
  let section = ''
  let entityId = ''

  if (parts[0]) wsId = decodeURIComponent(parts[0])
  if (parts[1]) {
    const seg2 = decodeURIComponent(parts[1])
    if (WORKHUB_LEGACY_SECTIONS.has(seg2)) {
      section = seg2
      if (parts[2]) entityId = decodeURIComponent(parts[2])
    } else {
      projId = seg2
      if (parts[2]) {
        const seg3 = decodeURIComponent(parts[2])
        if (WORKHUB_LEGACY_SECTIONS.has(seg3)) {
          section = seg3
          if (parts[3]) entityId = decodeURIComponent(parts[3])
        }
      }
    }
  }

  return { wsId, projId, section, entityId }
}

function parseWorkhubPathname(pathname: string, search = ''): WorkhubParsedRoute {
  const parts = pathname.replace(/^\/workhub\/?/, '').split('/').filter(Boolean)
  const searchParams = new URLSearchParams(search)
  const contextProjectId = (searchParams.get('p') || '').trim()
  const normalizedContextProjectId = contextProjectId && contextProjectId !== 'all' ? contextProjectId : 'all'

  if (parts.length === 0) {
    return { source: 'canonical', kind: 'root', wsId: '', projId: 'all', section: '', entityId: '' }
  }

  if (parts[0] === 'w') {
    const wsId = decodeURIComponent(parts[1] || '')
    if (!wsId) {
      return { source: 'canonical', kind: 'root', wsId: '', projId: 'all', section: '', entityId: '' }
    }

    const marker = decodeURIComponent(parts[2] || '')
    const value = decodeURIComponent(parts[3] || '')

    if (!marker) {
      return { source: 'canonical', kind: 'workspace', wsId, projId: normalizedContextProjectId, section: 'dashboard', entityId: '' }
    }

    if (marker === 's') {
      const section = isWorkhubWorkspaceSection(value) ? value : 'dashboard'
      return { source: 'canonical', kind: 'workspace', wsId, projId: normalizedContextProjectId, section, entityId: '' }
    }

    if (marker === 'p' && value) {
      return { source: 'canonical', kind: 'project', wsId, projId: value, section: '', entityId: '' }
    }

    if (marker === 'd' && value) {
      return { source: 'canonical', kind: 'document', wsId, projId: normalizedContextProjectId, section: 'notes', entityId: value }
    }

    if (marker === 'm' && value) {
      return { source: 'canonical', kind: 'moodboard', wsId, projId: normalizedContextProjectId, section: 'moodboard', entityId: value }
    }

    if (marker === 't' && value) {
      return { source: 'canonical', kind: 'task', wsId, projId: normalizedContextProjectId, section: 'tasks', entityId: value }
    }

    return { source: 'canonical', kind: 'workspace', wsId, projId: normalizedContextProjectId, section: 'dashboard', entityId: '' }
  }

  const legacy = parseLegacyWorkhubPathname(pathname)
  if (!legacy.wsId) {
    return { source: 'legacy', kind: 'root', wsId: '', projId: 'all', section: '', entityId: '' }
  }

  if (legacy.section === 'notes' && legacy.entityId) {
    return { source: 'legacy', kind: 'document', wsId: legacy.wsId, projId: 'all', section: 'notes', entityId: legacy.entityId }
  }

  if (legacy.section === 'moodboard' && legacy.entityId) {
    return { source: 'legacy', kind: 'moodboard', wsId: legacy.wsId, projId: 'all', section: 'moodboard', entityId: legacy.entityId }
  }

  if (legacy.section === 'tasks' && legacy.entityId) {
    return { source: 'legacy', kind: 'task', wsId: legacy.wsId, projId: 'all', section: 'tasks', entityId: legacy.entityId }
  }

  if (legacy.projId && legacy.projId !== 'all' && (!legacy.section || legacy.section === 'tasks' || legacy.section === 'dashboard')) {
    return { source: 'legacy', kind: 'project', wsId: legacy.wsId, projId: legacy.projId, section: '', entityId: '' }
  }

  if (legacy.section === 'moodboard' && !legacy.entityId) {
    return { source: 'legacy', kind: 'workspace', wsId: legacy.wsId, projId: legacy.projId || 'all', section: 'dashboard', entityId: '' }
  }

  const section = isWorkhubWorkspaceSection(legacy.section) ? legacy.section : 'dashboard'
  return { source: 'legacy', kind: 'workspace', wsId: legacy.wsId, projId: legacy.projId || 'all', section, entityId: '' }
}

function buildWorkhubRouteSearch(projId: string): string {
  if (!projId || projId === 'all') return ''
  const params = new URLSearchParams({ p: projId })
  return `?${params.toString()}`
}

function buildWorkhubEntityRouteSearch(projId: string): string {
  const params = new URLSearchParams({ p: projId && projId !== 'all' ? projId : 'all' })
  return `?${params.toString()}`
}

function buildWorkhubPathname(wsId: string, projId: string, section: string, entityId = ''): string {
  if (!wsId) return '/workhub'

  const encodedWorkspaceId = encodeURIComponent(wsId)
  const encodedProjectId = projId && projId !== 'all' ? encodeURIComponent(projId) : ''
  const encodedEntityId = entityId ? encodeURIComponent(entityId) : ''
  const normalizedSection = isWorkhubWorkspaceSection(section) ? section : 'dashboard'

  if (normalizedSection === 'notes' && encodedEntityId) {
    return `/workhub/w/${encodedWorkspaceId}/d/${encodedEntityId}${buildWorkhubEntityRouteSearch(projId)}`
  }

  if (section === 'moodboard' && encodedEntityId) {
    return `/workhub/w/${encodedWorkspaceId}/m/${encodedEntityId}${buildWorkhubEntityRouteSearch(projId)}`
  }

  if (normalizedSection === 'tasks' && encodedEntityId) {
    return `/workhub/w/${encodedWorkspaceId}/t/${encodedEntityId}${buildWorkhubEntityRouteSearch(projId)}`
  }

  if ((normalizedSection === 'tasks' || normalizedSection === 'dashboard') && encodedProjectId) {
    return `/workhub/w/${encodedWorkspaceId}/p/${encodedProjectId}`
  }

  const search = buildWorkhubRouteSearch(projId)
  if (normalizedSection === 'dashboard') {
    return `/workhub/w/${encodedWorkspaceId}${search}`
  }

  return `/workhub/w/${encodedWorkspaceId}/s/${normalizedSection}${search}`
}

function splitPersistedWorkhubRoute(value: string): { pathname: string; search: string } {
  const trimmedValue = value.trim()
  const [pathname = '', ...searchParts] = trimmedValue.split('?')
  return {
    pathname,
    search: searchParts.length ? `?${searchParts.join('?')}` : '',
  }
}

function readPersistedWorkhubRouteMap(storageKey: string): WorkhubPersistedRouteMap {
  if (!storageKey) return {}

  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>)
        .filter(([workspaceId, route]) => workspaceId && typeof route === 'string')
        .map(([workspaceId, route]) => [workspaceId, (route as string).trim()]),
    )
  } catch {
    return {}
  }
}

function writePersistedWorkhubRouteMap(storageKey: string, routeMap: WorkhubPersistedRouteMap) {
  if (!storageKey) return
  if (Object.keys(routeMap).length === 0) {
    localStorage.removeItem(storageKey)
    return
  }
  localStorage.setItem(storageKey, JSON.stringify(routeMap))
}

function normalizePersistedWorkhubRoute(value: string): string {
  const { pathname, search } = splitPersistedWorkhubRoute(value)
  if (!pathname.startsWith('/workhub')) return ''
  const parsedRoute = parseWorkhubPathname(pathname, search)
  if (!parsedRoute.wsId) return ''
  return buildWorkhubPathname(parsedRoute.wsId, parsedRoute.projId, parsedRoute.section, parsedRoute.entityId)
}

function normalizeWorkhubLabel(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function isSubmittedProposalFolderName(value: string): boolean {
  const normalized = normalizeWorkhubLabel(value)
  return normalized === 'submitted proposals' || (normalized.includes('submitted') && normalized.includes('proposal'))
}
// ────────────────────────────────────────────────────────────────────────────

const WORKHUB_INTENT_ALLOWED_PROJECT_TYPES: Partial<Record<WorkhubProjectIntent, WorkhubProjectType[]>> = {
  proposal: ['tender'],
  lead: ['lead'],
  finance_invoice_stream: ['direct_award'],
  finance_payment_cycle: ['other'],
  marketing_campaign: ['other'],
  marketing_content_stream: ['other'],
  hr_requisition: ['other'],
  hr_onboarding_track: ['other'],
}

function splitTemplateDescriptionForIntent(
  intent: WorkhubProjectIntent,
  description: string,
): WorkhubIntentDescriptionSplit {
  const normalizedDescription = description.trim()
  if (!normalizedDescription) {
    return { narrative: '', detailsByKey: {} }
  }

  const intentFields = WORKHUB_INTENT_DETAIL_FIELDS[intent]
  if (intentFields.length === 0) {
    return { narrative: normalizedDescription, detailsByKey: {} }
  }

  const supportedKeys = new Set(intentFields.map((field) => field.descriptionKey))
  const narrativeLines: string[] = []
  const detailsByKey: Record<string, string> = {}

  normalizedDescription
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .forEach((line) => {
      const separatorIndex = line.indexOf(':')
      if (separatorIndex <= 0) {
        narrativeLines.push(line)
        return
      }

      const key = line.slice(0, separatorIndex).trim().toLowerCase()
      const value = line.slice(separatorIndex + 1).trim()
      if (!supportedKeys.has(key) || !value) {
        narrativeLines.push(line)
        return
      }

      detailsByKey[key] = value
    })

  return {
    narrative: narrativeLines.join('\n').trim(),
    detailsByKey,
  }
}

function buildProjectDescriptionFromIntentDrafts(
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

interface WorkhubEntityFinderEntry {
  projectId: string
  workspaceId: string
  name: string
  workspaceName: string
  subjectLabel: string
  clientName: string
  nameLower: string
  workspaceNameLower: string
  subjectLabelLower: string
  clientNameLower: string
  descriptionLower: string
  searchableText: string
  order: number
}

function scoreWorkhubEntityFinderEntry(entry: WorkhubEntityFinderEntry, normalizedQuery: string): number {
  if (!normalizedQuery) return 1

  let score = 0

  if (entry.nameLower === normalizedQuery) score += 220
  if (entry.nameLower.startsWith(normalizedQuery)) score += 140

  const nameIndex = entry.nameLower.indexOf(normalizedQuery)
  if (nameIndex >= 0) score += 110 - Math.min(nameIndex, 80)

  const workspaceIndex = entry.workspaceNameLower.indexOf(normalizedQuery)
  if (workspaceIndex >= 0) score += 38 - Math.min(workspaceIndex, 30)

  if (entry.subjectLabelLower.includes(normalizedQuery)) score += 24
  if (entry.clientNameLower && entry.clientNameLower.includes(normalizedQuery)) score += 22
  if (entry.descriptionLower.includes(normalizedQuery)) score += 18

  const queryTokens = normalizedQuery.split(/\s+/).filter((token) => token.length > 0)
  if (queryTokens.length > 1) {
    const matchedTokenCount = queryTokens.reduce((count, token) => (
      entry.searchableText.includes(token) ? count + 1 : count
    ), 0)
    score += matchedTokenCount * 14
  }

  return score
}

function getUnknownTimeValue(value: unknown): number {
  if (!value) return 0
  if (typeof value === 'object' && value !== null && 'toMillis' in value && typeof (value as { toMillis?: unknown }).toMillis === 'function') {
    return ((value as { toMillis: () => number }).toMillis())
  }
  if (typeof value === 'object' && value !== null && 'seconds' in value) {
    const seconds = Number((value as { seconds?: unknown }).seconds || 0)
    const nanoseconds = Number((value as { nanoseconds?: unknown }).nanoseconds || 0)
    return (seconds * 1000) + Math.floor(nanoseconds / 1_000_000)
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

export default function WorkHubPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const navigationType = useNavigationType()
  const { showToast } = useToast()
  const workhubDebugEnabled = import.meta.env.DEV && typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)
  // navigateRef ensures the auth listener effect never re-runs due to React Router
  // re-creating the navigate function on every URL change (useNavigateUnstable behaviour).
  const navigateRef = useRef(navigate)
  navigateRef.current = navigate
  const [userEmail, setUserEmail] = useState('')
  const [userName, setUserName] = useState('')
  const [member, setMember] = useState<WorkhubMember | null>(null)
  const [memberLoading, setMemberLoading] = useState(true)
  const [requestingAccess, setRequestingAccess] = useState(false)
  const [members, setMembers] = useState<WorkhubMember[]>([])
  const [workspaces, setWorkspaces] = useState<WorkhubWorkspace[]>([])
  const [clients, setClients] = useState<WorkhubClient[]>([])
  const [projects, setProjects] = useState<WorkhubProject[]>([])
  const [documents, setDocuments] = useState<WorkhubDocument[]>([])
  const [tasks, setTasks] = useState<WorkhubTask[]>([])
  const [activity, setActivity] = useState<WorkhubActivity[]>([])
  const [notifications, setNotifications] = useState<WorkhubNotification[]>([])
  const [notificationMenuOpen, setNotificationMenuOpen] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [dashboardSummaryCollapsed, setDashboardSummaryCollapsed] = useState(false)
  const [globalFinderOpen, setGlobalFinderOpen] = useState(false)
  const [globalFinderQuery, setGlobalFinderQuery] = useState('')
  const [globalFinderActiveIndex, setGlobalFinderActiveIndex] = useState(0)
  const [comments, setComments] = useState<WorkhubTaskComment[]>([])
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState('all')
  const [selectedAssigneeUid, setSelectedAssigneeUid] = useState('all')
  const [selectedTaskId, setSelectedTaskId] = useState('')
  const [selectedNoteProjectId, setSelectedNoteProjectId] = useState('')
  const [selectedDocumentId, setSelectedDocumentId] = useState('')
  const [pendingNotificationDocument, setPendingNotificationDocument] = useState<WorkhubDocument | null>(null)
  const [activeSection, setActiveSection] = useState<'home' | 'users' | 'tasks' | 'notes' | 'dashboard' | 'clients' | 'moodboard'>('dashboard')
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<WorkhubCanonicalSection>('dashboard')
  const [quickAddFocusTrigger, setQuickAddFocusTrigger] = useState(0)
  const [quickAddFocusStatusId, setQuickAddFocusStatusId] = useState('')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createDialogType, setCreateDialogType] = useState<'project' | 'task'>('project')
  const [templateCreateDialogOpen, setTemplateCreateDialogOpen] = useState(false)
  const [templateCreateIntent, setTemplateCreateIntent] = useState<WorkhubTemplateCreationIntent | null>(null)
  const [templateCreateDraft, setTemplateCreateDraft] = useState<WorkhubTemplateCreationDraft>(buildInitialTemplateCreationDraft('project'))
  const [templateCreateParentProjectId, setTemplateCreateParentProjectId] = useState('')
  const [workspaceCreateDialogOpen, setWorkspaceCreateDialogOpen] = useState(false)
  const [teamDialogOpen, setTeamDialogOpen] = useState(false)
  const [workspaceSettingsId, setWorkspaceSettingsId] = useState('')
  const [projectAccessDialogId, setProjectAccessDialogId] = useState('')
  const [workspaceName, setWorkspaceName] = useState('')
  const [workspaceDescription, setWorkspaceDescription] = useState('')
  const [workspaceTemplateId, setWorkspaceTemplateId] = useState<WorkhubWorkspaceTemplateId>(DEFAULT_WORKHUB_WORKSPACE_TEMPLATE_ID)
  const [workspaceSettingsName, setWorkspaceSettingsName] = useState('')
  const [workspaceSettingsDescription, setWorkspaceSettingsDescription] = useState('')
  const [workspaceTreeMetaDisplayMode, setWorkspaceTreeMetaDisplayMode] = useState<'counts' | 'countdown' | 'progress'>('counts')
  const [workspaceTaskDueDisplayMode, setWorkspaceTaskDueDisplayMode] = useState<'remaining' | 'date'>('remaining')
  const [workspaceActivityWindowDays, setWorkspaceActivityWindowDays] = useState<7 | 14 | 30>(30)
  const [workspaceMoodBoardEnabled, setWorkspaceMoodBoardEnabled] = useState(true)
  const [workspaceShowProjectColorDots, setWorkspaceShowProjectColorDots] = useState(true)
  const [workspaceProjectColorMeaningDrafts, setWorkspaceProjectColorMeaningDrafts] = useState<WorkhubProjectColorMeaning[]>([])
  const [workspaceAccessMemberUids, setWorkspaceAccessMemberUids] = useState<string[]>([])
  const [workspaceMemberAccessLevels, setWorkspaceMemberAccessLevels] = useState<Record<string, 'full' | 'custom'>>({})
  const [workspaceInviteEmails, setWorkspaceInviteEmails] = useState<string[]>([])
  const [workspaceInviteEmailDraft, setWorkspaceInviteEmailDraft] = useState('')
  const taskSelectionPerfRef = useRef<{ taskId: string; startedAt: number } | null>(null)
  const [workspaceDeleteTypedName, setWorkspaceDeleteTypedName] = useState('')
  const [workspaceDeletePhrase, setWorkspaceDeletePhrase] = useState('')
  const [workspaceDeleteAcknowledge, setWorkspaceDeleteAcknowledge] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [projectParentId, setProjectParentId] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [projectColor, setProjectColor] = useState(PROJECT_COLORS[0])
  const [projectStartDate, setProjectStartDate] = useState('')
  const [projectDeadline, setProjectDeadline] = useState(getCurrentDateInputValue())
  const [projectSubmissionTime, setProjectSubmissionTime] = useState(DEFAULT_SUBMISSION_TIME)
  const [projectType, setProjectType] = useState<WorkhubProjectType>('tender')
  const [projectPriority, setProjectPriority] = useState<WorkhubProjectPriority>('medium')
  const [projectClientId, setProjectClientId] = useState('')
  const [closeProjectAfterCreate, setCloseProjectAfterCreate] = useState(true)
  const [projectVisibility, setProjectVisibility] = useState<WorkhubVisibility>('workspace')
  const [projectStorageMethod, setProjectStorageMethod] = useState<'firebase' | 'drive'>('firebase')
  const [projectMemberUids, setProjectMemberUids] = useState<string[]>([])
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [taskStatus, setTaskStatus] = useState<WorkhubTaskStatus>('backlog')
  const [taskPriority, setTaskPriority] = useState<WorkhubTaskPriority>('medium')
  const [taskAssigneeUid, setTaskAssigneeUid] = useState('')
  const [taskStartDate, setTaskStartDate] = useState(getCurrentDateInputValue())
  const [taskDueDate, setTaskDueDate] = useState(() => shiftDateInputValue(getCurrentDateInputValue(), 1))
  const [selectedTaskStatusTab, setSelectedTaskStatusTab] = useState<'all' | WorkhubTaskStatus>('all')
  const [expandedTaskStatusIds, setExpandedTaskStatusIds] = useState<string[]>([])
  const [statusTaskRenderLimitById, setStatusTaskRenderLimitById] = useState<Record<string, number>>({})
  const [taskFilterMenuOpen, setTaskFilterMenuOpen] = useState(false)
  const [taskFilterRequireAttachments, setTaskFilterRequireAttachments] = useState(false)
  const [taskFilterRequireChecklist, setTaskFilterRequireChecklist] = useState(false)
  const [taskFilterPriority, setTaskFilterPriority] = useState<'all' | WorkhubTaskPriority>('all')
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [gearMenuOpen, setGearMenuOpen] = useState(false)
  const [mobileGearMenuOpenUp, setMobileGearMenuOpenUp] = useState(false)
  const [statusDrafts, setStatusDrafts] = useState<WorkhubTaskStatusConfig[]>([])
  const [selectedStatusDraftId, setSelectedStatusDraftId] = useState('')
  const [editingCommentId, setEditingCommentId] = useState('')
  const [editingCommentText, setEditingCommentText] = useState('')
  const [discussionNotifyMode, setDiscussionNotifyMode] = useState<'all' | 'selected' | 'none'>('all')
  const [discussionNotifyUids, setDiscussionNotifyUids] = useState<string[]>([])
  const [discussionNotifyOwnerKey, setDiscussionNotifyOwnerKey] = useState('')
  const [busyKey, setBusyKey] = useState('')
  const [batchCreateProgress, setBatchCreateProgress] = useState<{ total: number; created: number; source: 'dialog' | 'quick-add' } | null>(null)
  const [dragTaskId, setDragTaskId] = useState('')
  const [dragStatusId, setDragStatusId] = useState('')
  const [dropTargetKey, setDropTargetKey] = useState('')
  const [bootstrappingMasterAccess, setBootstrappingMasterAccess] = useState(false)
  const [masterBootstrapAttempted, setMasterBootstrapAttempted] = useState(false)
  const [accessVisibility, setAccessVisibility] = useState<WorkhubVisibility>('workspace')
  const [accessMemberUids, setAccessMemberUids] = useState<string[]>([])
  const [expandedProjectIds, setExpandedProjectIds] = useState<string[]>([])
  const [projectsGroupExpanded, setProjectsGroupExpanded] = useState(true)
  const [documentsGroupExpanded, setDocumentsGroupExpanded] = useState(true)
  const [settingsProjectName, setSettingsProjectName] = useState('')
  const [settingsProjectDescription, setSettingsProjectDescription] = useState('')
  const [settingsProjectColor, setSettingsProjectColor] = useState(PROJECT_COLORS[0])
  const [settingsProjectParentId, setSettingsProjectParentId] = useState('')
  const [settingsProjectDeadline, setSettingsProjectDeadline] = useState('')
  const [settingsProjectSubmissionTime, setSettingsProjectSubmissionTime] = useState(DEFAULT_SUBMISSION_TIME)
  const [settingsProjectType, setSettingsProjectType] = useState<WorkhubProjectType>('other')
  const [settingsProjectPriority, setSettingsProjectPriority] = useState<WorkhubProjectPriority>('medium')
  const [settingsProjectValueAmountDraft, setSettingsProjectValueAmountDraft] = useState('')
  const [settingsProjectValueCurrencyDraft, setSettingsProjectValueCurrencyDraft] = useState('OMR')
  const [settingsProjectTaskStatuses, setSettingsProjectTaskStatuses] = useState<WorkhubTaskStatusConfig[] | null>(null)
  const [settingsProjectTenderNumber, setSettingsProjectTenderNumber] = useState('')
  const [settingsProjectProposalId, setSettingsProjectProposalId] = useState('')
  const [settingsTechnicalProposalUrl, setSettingsTechnicalProposalUrl] = useState('')
  const [settingsFinancialProposalUrl, setSettingsFinancialProposalUrl] = useState('')
  const [settingsProjectMainPanelView, setSettingsProjectMainPanelView] = useState<'tasks' | 'dashboard'>('tasks')
  const [settingsProjectTaskItemDisplayMode, setSettingsProjectTaskItemDisplayMode] = useState<'inherit' | 'list' | 'cards' | 'grid'>('inherit')
  const [settingsProjectClientId, setSettingsProjectClientId] = useState('')
  const [settingsStorageMethod, setSettingsStorageMethod] = useState<'firebase' | 'drive'>('firebase')
  const [selectedClientId, setSelectedClientId] = useState('')
  const [clientDeleteTargetId, setClientDeleteTargetId] = useState('')
  const [expandedUserPickerUid, setExpandedUserPickerUid] = useState<string | null>(null)
  const [userWorkspaceFilter, setUserWorkspaceFilter] = useState<'all' | string>('all')
  const [userAccessDraftByUid, setUserAccessDraftByUid] = useState<Record<string, WorkhubUserAccessDraft>>({})
  const [clientNameDraft, setClientNameDraft] = useState('')
  const [clientContactPersonDraft, setClientContactPersonDraft] = useState('')
  const [clientEmailDraft, setClientEmailDraft] = useState('')
  const [clientPhoneDraft, setClientPhoneDraft] = useState('')
  const [clientWebsiteDraft, setClientWebsiteDraft] = useState('')
  const [clientAddressDraft, setClientAddressDraft] = useState('')
  const [clientIndustryDraft, setClientIndustryDraft] = useState('')
  const [clientLogoUrlDraft, setClientLogoUrlDraft] = useState('')
  const [clientNotesDraft, setClientNotesDraft] = useState('')
  const [actionMenuProjectId, setActionMenuProjectId] = useState<string | null>(null)
  const [actionMenuPosition, setActionMenuPosition] = useState({ x: 0, y: 0 })
  const [workspaceMoodBoards, setWorkspaceMoodBoards] = useState<WorkhubMoodBoard[]>([])
  const [selectedMoodBoardId, setSelectedMoodBoardId] = useState('')
  const [, setQuickAddOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [treePanelWidth, setTreePanelWidth] = useState<number>(() => {
    const saved = localStorage.getItem('workhub:treePanelWidth')
    const n = saved ? parseInt(saved, 10) : 0
    return n >= 200 && n <= 600 ? n : 280
  })
  const treeResizeDragRef = useRef<{ startX: number; startWidth: number } | null>(null)
  const shellLayoutRef = useRef<HTMLDivElement>(null)
  const [isMobileWorkhubLayout, setIsMobileWorkhubLayout] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(`(max-width: ${WORKHUB_PHONE_MAX_WIDTH}px)`).matches
  })
  const [mobileWorkspacePanelOpen, setMobileWorkspacePanelOpen] = useState(false)
  const [mobileWorkspacePanelClosing, setMobileWorkspacePanelClosing] = useState(false)
  const mobileWorkspacePanelCloseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closeMobileWorkspacePanel = useCallback(() => {
    setMobileWorkspacePanelClosing(true)
    if (mobileWorkspacePanelCloseTimerRef.current) clearTimeout(mobileWorkspacePanelCloseTimerRef.current)
    mobileWorkspacePanelCloseTimerRef.current = setTimeout(() => {
      setMobileWorkspacePanelOpen(false)
      setMobileWorkspacePanelClosing(false)
      mobileWorkspacePanelCloseTimerRef.current = null
    }, 300)
  }, [])
  const [expandedTaskChecklistIds, setExpandedTaskChecklistIds] = useState<string[]>([])
  const [expandedChecklistDetailKeys, setExpandedChecklistDetailKeys] = useState<string[]>([])
  const [taskChecklistDrafts, setTaskChecklistDrafts] = useState<Record<string, string>>({})
  const [taskChecklistValueDrafts, setTaskChecklistValueDrafts] = useState<Record<string, string>>({})
  const [taskAttachmentDrafts, setTaskAttachmentDrafts] = useState<Record<string, string>>({})
  const [taskAttachmentTitleDrafts, setTaskAttachmentTitleDrafts] = useState<Record<string, string>>({})
  const [taskAttachmentFileDrafts, setTaskAttachmentFileDrafts] = useState<Record<string, File[]>>({})
  const [taskAttachmentFilePathDrafts, setTaskAttachmentFilePathDrafts] = useState<Record<string, string>>({})
  const [taskLinkDrafts, setTaskLinkDrafts] = useState<Record<string, string>>({})
  const [taskLinkTitleDrafts, setTaskLinkTitleDrafts] = useState<Record<string, string>>({})
  const [taskLinkEditingDrafts, setTaskLinkEditingDrafts] = useState<Record<string, string>>({})
  const [uploadingTaskAttachmentId, setUploadingTaskAttachmentId] = useState('')
  const [checklistDetailsDrafts, setChecklistDetailsDrafts] = useState<Record<string, string>>({})
  const [checklistAttachmentDrafts, setChecklistAttachmentDrafts] = useState<Record<string, string>>({})
  const [checklistLinkDrafts, setChecklistLinkDrafts] = useState<Record<string, string>>({})
  const [uploadingChecklistAttachmentKey, setUploadingChecklistAttachmentKey] = useState('')
  const [detailMenuOpen, setDetailMenuOpen] = useState<'status' | 'priority' | 'assignee' | 'dueDate' | ''>('')
  const [detailMenuCoords, setDetailMenuCoords] = useState<{ top: number; left: number; right: number } | null>(null)
  const [selectedTaskTitleDraft, setSelectedTaskTitleDraft] = useState('')
  const [selectedTaskDescriptionDraft, setSelectedTaskDescriptionDraft] = useState('')
  const [selectedTaskValueAmountDraft, setSelectedTaskValueAmountDraft] = useState('')
  const [selectedTaskValueCurrencyDraft, setSelectedTaskValueCurrencyDraft] = useState('')
  const [selectedProjectNameDraft, setSelectedProjectNameDraft] = useState('')
  const [selectedProjectDescriptionDraft, setSelectedProjectDescriptionDraft] = useState('')
  const [selectedProjectNarrativeDraft, setSelectedProjectNarrativeDraft] = useState('')
  const [selectedProjectIntentDetailDrafts, setSelectedProjectIntentDetailDrafts] = useState<Record<string, string>>({})
  const [selectedProjectColorDraft, setSelectedProjectColorDraft] = useState(PROJECT_COLORS[0])
  const [selectedProjectStartDateDraft, setSelectedProjectStartDateDraft] = useState('')
  const [selectedProjectDeadlineDraft, setSelectedProjectDeadlineDraft] = useState('')
  const [selectedProjectSubmissionTimeDraft, setSelectedProjectSubmissionTimeDraft] = useState('')
  const [selectedProjectDraftOwnerId, setSelectedProjectDraftOwnerId] = useState('')
  const [selectedProjectTypeDraft, setSelectedProjectTypeDraft] = useState<WorkhubProjectType>('other')
  const [selectedProjectValueAmountDraft, setSelectedProjectValueAmountDraft] = useState('')
  const [selectedProjectValueCurrencyDraft, setSelectedProjectValueCurrencyDraft] = useState('OMR')
  const [selectedProjectAttachmentTitleDraft, setSelectedProjectAttachmentTitleDraft] = useState('')
  const [selectedProjectAttachmentDraft, setSelectedProjectAttachmentDraft] = useState('')
  const [selectedProjectAttachmentFileDrafts, setSelectedProjectAttachmentFileDrafts] = useState<File[]>([])
  const [selectedProjectAttachmentFilePathDraft, setSelectedProjectAttachmentFilePathDraft] = useState('')
  const [uploadingSelectedProjectAttachment, setUploadingSelectedProjectAttachment] = useState(false)
  const [selectedProjectColorMenuOpen, setSelectedProjectColorMenuOpen] = useState(false)
  const [settingsProjectCreateDeliveryFolder, setSettingsProjectCreateDeliveryFolder] = useState(false)
  const [editingTaskTitleId, setEditingTaskTitleId] = useState<string | null>(null)
  const [editingTaskTitleText, setEditingTaskTitleText] = useState('')
  const [editingChecklistTaskId, setEditingChecklistTaskId] = useState<string | null>(null)
  const [editingChecklistItemId, setEditingChecklistItemId] = useState<string | null>(null)
  const [editingChecklistScope, setEditingChecklistScope] = useState<'inline' | 'details' | null>(null)
  const [editingChecklistItemText, setEditingChecklistItemText] = useState('')
  const [openTaskMoreMenuId, setOpenTaskMoreMenuId] = useState('')
  const [openTaskStatusMenuId, setOpenTaskStatusMenuId] = useState('')
  const [openTaskPriorityMenuId, setOpenTaskPriorityMenuId] = useState('')
  const [openTaskAssigneeMenuId, setOpenTaskAssigneeMenuId] = useState('')
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([])
  const [bulkStatusMenuOpen, setBulkStatusMenuOpen] = useState(false)
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false)
  const [taskDeleteConfirmOpen, setTaskDeleteConfirmOpen] = useState(false)
  const [attachmentReviews, setAttachmentReviews] = useState<Record<string, WorkhubImageReview>>({})
  const [attachmentViewMode, setAttachmentViewMode] = useState<'thumbnail' | 'list' | 'card'>('thumbnail')
  const [taskAttachmentsCollapsed, setTaskAttachmentsCollapsed] = useState(true)
  const [projectAttachmentsCollapsed, setProjectAttachmentsCollapsed] = useState(false)
  const [attachmentDeletePrompt, setAttachmentDeletePrompt] = useState<{ task: WorkhubTask, attachment: string, isDriveFile: boolean } | null>(null)
  const globalFinderInputRef = useRef<HTMLInputElement | null>(null)
  const mobileGearMenuAnchorRef = useRef<HTMLDivElement | null>(null)
  const mobileGearMenuRef = useRef<HTMLDivElement | null>(null)
  const statusBootstrapWorkspaceIdsRef = useRef<Set<string>>(new Set())
  const projectIntentMigrationIdsRef = useRef<Set<string>>(new Set())
  // Stable ref that always carries the latest unstable values needed by taskRowCallbacks
  const _cbRef = useRef<{
    dragTaskId: string; dragStatusId: string; dropTargetKey: string
    editingTaskTitleText: string; editingChecklistItemText: string
    taskChecklistDrafts: Record<string, string>
    selectedTaskIdSet: Set<string>; selectedTaskCount: number
    handleTaskUpdate: (task: WorkhubTask, updates: Partial<WorkhubTask>, options?: { silent?: boolean }) => Promise<void>
    handleBulkStatusChange: (statusId: WorkhubTaskStatus) => Promise<void>
    handleTaskReorder: (draggedId: string, statusId: string, targetTaskId: string | null) => Promise<void>
  }>({
    dragTaskId: '', dragStatusId: '', dropTargetKey: '',
    editingTaskTitleText: '', editingChecklistItemText: '',
    taskChecklistDrafts: {}, selectedTaskIdSet: new Set(), selectedTaskCount: 0,
    handleTaskUpdate: async () => {}, handleBulkStatusChange: async () => {}, handleTaskReorder: async () => {},
  })

  useEffect(() => {
    const handleDocumentPointerDown = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (target.closest('.workhub-task-status-btn, .workhub-task-status-menu, .workhub-priority-indicator, .workhub-task-priority-menu, .workhub-task-more-btn, .workhub-task-more-menu, .workhub-detail-icon-btn, .workhub-detail-icon-menu, .workhub-task-filter-btn, .workhub-task-filter-menu, .workhub-bulk-status-btn, .workhub-bulk-status-menu, .workhub-task-assignee-btn, .workhub-task-assignee-menu, .workhub-notify-btn, .workhub-notify-menu, .workhub-account-btn, .workhub-account-menu, .workhub-project-color-select-btn, .workhub-project-color-select-menu, .workhub-mobile-workspace-panel, .workhub-mobile-workspace-toggle, .workhub-mobile-footer, .workhub-mobile-footer-btn')) {
        return
      }
      setOpenTaskStatusMenuId('')
      setOpenTaskPriorityMenuId('')
      setOpenTaskMoreMenuId('')
      setOpenTaskAssigneeMenuId('')
      setTaskFilterMenuOpen(false)
      setBulkStatusMenuOpen(false)
      setDetailMenuOpen('')
      setNotificationMenuOpen(false)
      setAccountMenuOpen(false)
      setSelectedProjectColorMenuOpen(false)
      closeMobileWorkspacePanel()
      if (!target.closest('.workhub-gear-btn, .workhub-gear-menu')) {
        setGearMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleDocumentPointerDown)
    return () => document.removeEventListener('mousedown', handleDocumentPointerDown)
  }, [])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(ATTACHMENT_REVIEW_STORAGE_KEY)
      if (!raw) return
      const parsed = JSON.parse(raw) as Record<string, WorkhubImageReview>
      if (parsed && typeof parsed === 'object') {
        setAttachmentReviews(parsed)
      }
    } catch {
      setAttachmentReviews({})
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(ATTACHMENT_REVIEW_STORAGE_KEY, JSON.stringify(attachmentReviews))
  }, [attachmentReviews])

  useEffect(() => {
    const root = document.documentElement
    root.classList.add('workhub-font-compact')
    root.classList.add('workhub-page-active')
    return () => {
      root.classList.remove('workhub-font-compact')
      root.classList.remove('workhub-page-active')
    }
  }, [])

  useEffect(() => {
    if (!isMobileWorkhubLayout) return

    const allowScrollSelector = [
      '.workhub-task-sections',
      '.workhub-mobile-tree-panel-body',
      '.workhub-mobile-workspace-panel',
      '.workhub-task-detail-rail.is-mobile-drawer.is-open',
      '.workhub-task-detail-rail.is-mobile-drawer.is-open .workhub-detail-card',
      '.workhub-main-stage',
      '.workhub-summary-strip',
      '.workhub-modal',
      '.workhub-project-settings-body',
      '.workhub-settings-tab-panel',
      '.workhub-modal-form',
    ].join(', ')

    const handleTouchMove = (event: TouchEvent) => {
      const target = event.target as HTMLElement | null
      if (!target) {
        event.preventDefault()
        return
      }
      if (target.closest(allowScrollSelector)) return
      event.preventDefault()
    }

    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    return () => {
      document.removeEventListener('touchmove', handleTouchMove)
    }
  }, [isMobileWorkhubLayout])

  useEffect(() => {
    if (!isMobileWorkhubLayout || !mobileWorkspacePanelOpen || !gearMenuOpen) {
      setMobileGearMenuOpenUp(false)
      return
    }

    const repositionMenu = () => {
      const anchor = mobileGearMenuAnchorRef.current
      const menu = mobileGearMenuRef.current
      if (!anchor || !menu) return

      const anchorRect = anchor.getBoundingClientRect()
      const menuHeight = Math.max(menu.offsetHeight || 0, 92)
      const spaceBelow = window.innerHeight - anchorRect.bottom
      const spaceAbove = anchorRect.top

      setMobileGearMenuOpenUp(spaceBelow < menuHeight + 8 && spaceAbove > menuHeight + 8)
    }

    repositionMenu()
    window.addEventListener('resize', repositionMenu)
    window.addEventListener('scroll', repositionMenu, true)
    return () => {
      window.removeEventListener('resize', repositionMenu)
      window.removeEventListener('scroll', repositionMenu, true)
    }
  }, [gearMenuOpen, isMobileWorkhubLayout, mobileWorkspacePanelOpen])

  useEffect(() => {
    const handleGlobalFinderShortcut = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey)) return
      if (event.key.toLowerCase() !== 'k') return
      event.preventDefault()
      setQuickAddOpen(false)
      setNotificationMenuOpen(false)
      setAccountMenuOpen(false)
      setGlobalFinderQuery('')
      setGlobalFinderActiveIndex(0)
      setGlobalFinderOpen(true)
    }

    window.addEventListener('keydown', handleGlobalFinderShortcut)
    return () => window.removeEventListener('keydown', handleGlobalFinderShortcut)
  }, [])

  useEffect(() => {
    if (!globalFinderOpen) return
    const frameId = window.requestAnimationFrame(() => {
      globalFinderInputRef.current?.focus()
      globalFinderInputRef.current?.select()
    })
    return () => window.cancelAnimationFrame(frameId)
  }, [globalFinderOpen])

  useEffect(() => {
    if (!globalFinderOpen) return
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setGlobalFinderOpen(false)
      setGlobalFinderQuery('')
      setGlobalFinderActiveIndex(0)
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [globalFinderOpen])

  useEffect(() => {
    if (!workhubDebugEnabled) return
    const mountAt = performance.now()
    console.info('[WorkHubDebug] mount', {
      path: `${location.pathname}${location.search}`,
      navigationType,
      mountAt,
    })
    return () => {
      console.info('[WorkHubDebug] unmount', {
        path: `${location.pathname}${location.search}`,
        livedMs: Math.round(performance.now() - mountAt),
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!workhubDebugEnabled) return
    console.info('[WorkHubDebug] route', {
      path: `${location.pathname}${location.search}`,
      navigationType,
      memberLoading,
      selectedWorkspaceId,
      selectedProjectId,
      selectedTaskId,
    })
  }, [location.pathname, location.search, memberLoading, navigationType, selectedProjectId, selectedTaskId, selectedWorkspaceId, workhubDebugEnabled])

  useEffect(() => {
    if (!workhubDebugEnabled) return
    console.info('[WorkHubDebug] memberLoading', {
      memberLoading,
      hasMember: !!member,
      path: `${location.pathname}${location.search}`,
    })
  }, [location.pathname, location.search, member, memberLoading, workhubDebugEnabled])

  useEffect(() => {
    if (!workhubDebugEnabled || !selectedTaskId) return
    const selection = taskSelectionPerfRef.current
    window.requestAnimationFrame(() => {
      console.info('[WorkHubDebug] selectedTask paint', {
        taskId: selectedTaskId,
        elapsedMs: selection?.taskId === selectedTaskId ? Math.round(performance.now() - selection.startedAt) : null,
        path: `${location.pathname}${location.search}`,
      })
    })
  }, [location.pathname, location.search, selectedTaskId, workhubDebugEnabled])

  useEffect(() => {
    let unsubMember: (() => void) | null = null
    const unsub = onAuthStateChanged(auth, (user) => {
      if (workhubDebugEnabled) {
        console.info('[WorkHubDebug] auth state changed', {
          hasUser: !!user,
          path: `${window.location.pathname}${window.location.search}`,
        })
      }
      if (unsubMember) {
        unsubMember()
        unsubMember = null
      }
      if (!user) {
        setMember(null)
        setMemberLoading(false)
        setBootstrappingMasterAccess(false)
        setMasterBootstrapAttempted(false)
        navigateRef.current('/login', { replace: true, state: { returnTo: '/workhub' } })
        return
      }
      setMemberLoading(true)
      setBootstrappingMasterAccess(false)
      setMasterBootstrapAttempted(false)
      setUserEmail(user.email || '')
      setUserName(user.displayName || user.email?.split('@')[0] || 'Member')
      unsubMember = subscribeOwnWorkhubMember(user.uid, (next) => {
        if (workhubDebugEnabled) {
          console.info('[WorkHubDebug] member subscription resolved', {
            hasMember: !!next,
            status: next?.status || '',
            path: `${window.location.pathname}${window.location.search}`,
          })
        }
        setMember(next)
        setMemberLoading(false)
      })
    })
    return () => {
      if (unsubMember) unsubMember()
      unsub()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workhubDebugEnabled])

  useEffect(() => {
    if (!member || member.status !== 'approved') return
    const unsubMembers = subscribeAllWorkhubMembers(setMembers)
    const unsubWorkspaces = subscribeWorkhubWorkspaces(setWorkspaces)
    return () => {
      unsubMembers()
      unsubWorkspaces()
    }
  }, [member])

  useEffect(() => {
    if (!member || member.status !== 'approved') {
      setProjects([])
      setTasks([])
      setActivity([])
      return
    }
    const localUid = auth.currentUser?.uid || ''
    const localPrivileged = !!((!!MASTER_EMAIL && userEmail === MASTER_EMAIL) || member.role === 'admin' || member.role === 'manager')
    const accessibleWorkspaceIds = workspaces
      .filter((item) => canAccessWorkspace(item, localUid, userEmail, localPrivileged))
      .map((item) => item.id)

    if (accessibleWorkspaceIds.length === 0) {
      setProjects([])
      setTasks([])
      setActivity([])
      return
    }

    const unsubProjects = subscribeWorkhubProjectsMulti(accessibleWorkspaceIds, localUid, localPrivileged, setProjects)

    if (!selectedWorkspaceId) {
      setTasks([])
      setActivity([])
      return () => {
        unsubProjects()
      }
    }

    const unsubTasks = subscribeWorkhubTasks(selectedWorkspaceId, localUid, localPrivileged, setTasks)
    const unsubActivity = subscribeWorkhubActivity(selectedWorkspaceId, localUid, localPrivileged, setActivity)
    return () => {
      unsubProjects()
      unsubTasks()
      unsubActivity()
    }
  }, [member, selectedWorkspaceId, userEmail, workspaces])

  useEffect(() => {
    if (!member || member.status !== 'approved') {
      setClients([])
      return
    }
    const localUid = auth.currentUser?.uid || ''
    const localPrivileged = !!((!!MASTER_EMAIL && userEmail === MASTER_EMAIL) || member.role === 'admin' || member.role === 'manager')
    const accessibleWorkspaceIds = workspaces
      .filter((item) => canAccessWorkspace(item, localUid, userEmail, localPrivileged))
      .map((item) => item.id)
    if (!accessibleWorkspaceIds.length) {
      setClients([])
      return
    }
    return subscribeWorkhubClientsMulti(accessibleWorkspaceIds, setClients)
  }, [member, userEmail, workspaces])

  useEffect(() => {
    const localUid = auth.currentUser?.uid || ''
    if (!selectedWorkspaceId || !localUid || !member || member.status !== 'approved') {
      setDocuments([])
      return
    }
    const localPrivileged = !!((!!MASTER_EMAIL && userEmail === MASTER_EMAIL) || member.role === 'admin' || member.role === 'manager')
    return subscribeWorkhubDocuments(selectedWorkspaceId, localUid, localPrivileged, setDocuments)
  }, [member, selectedWorkspaceId, userEmail])

  useEffect(() => {
    if (!member || member.status !== 'approved') {
      setComments([])
      setEditingCommentId('')
      setEditingCommentText('')
      return
    }

    let entityType: 'task' | 'project' | 'document' | '' = ''
    let entityId = ''
    if (activeSection === 'notes' && selectedDocumentId) {
      entityType = 'document'
      entityId = selectedDocumentId
    } else if (activeSection === 'tasks' && selectedTaskId) {
      entityType = 'task'
      entityId = selectedTaskId
    } else if (activeSection === 'tasks' && selectedProjectId && selectedProjectId !== 'all') {
      entityType = 'project'
      entityId = selectedProjectId
    }

    if (!entityType || !entityId) {
      setComments([])
      setEditingCommentId('')
      setEditingCommentText('')
      return
    }

    const unsubComments = subscribeWorkhubCommentsByEntity(entityType, entityId, setComments)
    return () => unsubComments()
  }, [activeSection, member, selectedDocumentId, selectedProjectId, selectedTaskId])

  useEffect(() => {
    const localUid = auth.currentUser?.uid || ''
    if (!localUid || !member || member.status !== 'approved') {
      setNotifications([])
      return
    }
    return subscribeWorkhubNotifications(localUid, setNotifications)
  }, [member])

  useEffect(() => {
    if (!selectedWorkspaceId) {
      setWorkspaceMoodBoards([])
      return
    }
    return subscribeWorkhubMoodBoardsForWorkspace(selectedWorkspaceId, setWorkspaceMoodBoards)
  }, [selectedWorkspaceId])

  useEffect(() => {
    if (!member || member.status !== 'approved') return
    const workspaceById = Object.fromEntries(workspaces.map((item) => [item.id, item])) as Record<string, WorkhubWorkspace>
    const pendingProjects = projects
      .map((item) => ({
        item,
        workspaceIntentSet: new Set(resolveWorkspaceTemplateIntents(resolveWorkhubWorkspaceTemplateForWorkspace(workspaceById[item.workspaceId]).templateId)),
        inferredIntent: inferLegacyProjectIntent(item, workspaceById),
      }))
      .filter(({ item, workspaceIntentSet, inferredIntent }) => {
        const hasMissingOrInvalidIntent = !item.intent || !workspaceIntentSet.has(item.intent)
        if (!hasMissingOrInvalidIntent) return false
        return inferredIntent !== item.intent
      })
      .filter(({ item }) => !projectIntentMigrationIdsRef.current.has(item.id))
    if (!pendingProjects.length) return

    pendingProjects.forEach(({ item }) => projectIntentMigrationIdsRef.current.add(item.id))

    void Promise.all(
      pendingProjects.map(async ({ item, inferredIntent }) => {
        try {
          await updateWorkhubProject(item.id, { intent: inferredIntent })
        } catch (error) {
          projectIntentMigrationIdsRef.current.delete(item.id)
          console.error('Failed to backfill WorkHub project intent.', { projectId: item.id, error })
        }
      }),
    )
  }, [member, projects, workspaces])

  const currentUid = auth.currentUser?.uid || ''
  const workspaceSelectionStorageKey = useMemo(
    () => currentUid ? `workhub:selectedWorkspace:${currentUid}` : '',
    [currentUid],
  )
  const projectSelectionStorageKey = useMemo(
    () => currentUid ? `workhub:selectedProjectByWorkspace:${currentUid}` : '',
    [currentUid],
  )
  const expandedProjectSelectionStorageKey = useMemo(
    () => currentUid ? `workhub:expandedProjectsByWorkspace:${currentUid}` : '',
    [currentUid],
  )
  const workspaceRouteMemoryStorageKey = useMemo(
    () => currentUid ? `workhub:lastRouteByWorkspace:${currentUid}` : '',
    [currentUid],
  )
  const MAX_EXPANDED_PROJECT_IDS_PER_WORKSPACE = 300
  const MAX_EXPANDED_PROJECT_WORKSPACES = 120
  const expandedProjectSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function readExpandedProjectsByWorkspaceMap() {
    if (!expandedProjectSelectionStorageKey) return {} as Record<string, string[]>
    try {
      const raw = localStorage.getItem(expandedProjectSelectionStorageKey)
      if (!raw) return {} as Record<string, string[]>
      const parsed = JSON.parse(raw) as Record<string, unknown>
      const normalized: Record<string, string[]> = {}
      Object.entries(parsed).forEach(([workspaceId, value]) => {
        if (!Array.isArray(value)) return
        const nextExpandedIds = Array.from(new Set(value.filter((item): item is string => typeof item === 'string')))
          .slice(0, MAX_EXPANDED_PROJECT_IDS_PER_WORKSPACE)
        normalized[workspaceId] = nextExpandedIds
      })
      return normalized
    } catch {
      return {} as Record<string, string[]>
    }
  }
  const isMasterAdmin = !!MASTER_EMAIL && userEmail === MASTER_EMAIL
  const isPrivilegedMember = !!(isMasterAdmin || member?.role === 'admin' || member?.role === 'manager')
  const accountDisplayName = member?.displayName || userName || userEmail.split('@')[0] || 'Member'
  const accountEmail = member?.email || userEmail || auth.currentUser?.email || ''
  const accountAvatarUrl = (member?.photoURL || auth.currentUser?.photoURL || '').trim()
  const accountInitials = getInitials(accountDisplayName || accountEmail || 'Member')
  const {
    lightboxImageUrl,
    setLightboxImageUrl,
    lightboxTool,
    setLightboxTool,
    lightboxImageFit,
    setLightboxImageFit,
    lightboxImageAspect,
    setLightboxImageAspect,
    lightboxLineStart,
    setLightboxLineStart,
    lightboxMarkerEditorId,
    lightboxMarkerDraft,
    setLightboxMarkerDraft,
    lightboxMarkerResolved,
    setLightboxMarkerResolved,
    lightboxStageRef,
    lightboxDragRef,
    openAttachmentLightbox,
    handleLightboxStageClick,
    openLightboxMarkerEditor,
    closeLightboxMarkerEditor,
    handleLightboxMarkerEditorSave,
    handleMarkerPointerDown,
    handleLightboxFullscreenToggle,
  } = useWorkhubImageReviewHandlers({
    attachmentReviews,
    setAttachmentReviews,
    markerAuthor: auth.currentUser?.displayName || auth.currentUser?.email || member?.displayName || member?.email || 'Member',
    showToast,
  })
  const visibleWorkspaces = useMemo(
    () => workspaces.filter((item) => canAccessWorkspace(item, currentUid, userEmail, isPrivilegedMember)),
    [currentUid, isPrivilegedMember, userEmail, workspaces],
  )
  const approvedMembers = useMemo(() => members.filter((item) => item.status === 'approved'), [members])
  const pendingMembers = useMemo(() => members.filter((item) => item.status === 'pending'), [members])
  const selectedWorkspace = useMemo(() => visibleWorkspaces.find((item) => item.id === selectedWorkspaceId) || null, [selectedWorkspaceId, visibleWorkspaces])
  const selectedWorkspaceTemplateResolution = useMemo(
    () => resolveWorkhubWorkspaceTemplateForWorkspace(selectedWorkspace),
    [selectedWorkspace],
  )
  const selectedWorkspaceTemplateId = selectedWorkspaceTemplateResolution.templateId
  const selectedWorkspaceHomeTemplate = selectedWorkspaceTemplateResolution.template
  const taskDueDisplayMode = selectedWorkspace?.taskDueDisplayMode || 'remaining'
  const selectedWorkspaceScopeType = selectedWorkspaceHomeTemplate.workspaceType
  const treeMetaDisplayMode = selectedWorkspace?.treeMetaDisplayMode || 'counts'
  const showProjectColorDots = selectedWorkspace?.showProjectColorDots !== false
  const selectedWorkspaceTemplateIntentSet = useMemo(
    () => new Set(resolveWorkspaceTemplateIntents(selectedWorkspaceTemplateId)),
    [selectedWorkspaceTemplateId],
  )
  const workspaceByIdForFiltering = useMemo(
    () => Object.fromEntries(workspaces.map((item) => [item.id, item])) as Record<string, WorkhubWorkspace>,
    [workspaces],
  )
  const allClientById = useMemo(
    () => Object.fromEntries(clients.map((item) => [item.id, item])) as Record<string, WorkhubClient>,
    [clients],
  )
  const clientDeleteTarget = useMemo(
    () => clientDeleteTargetId ? (allClientById[clientDeleteTargetId] || null) : null,
    [allClientById, clientDeleteTargetId],
  )
  const workspaceAssignableMemberUids = useMemo(
    () => normalizeMemberUids(selectedWorkspace?.accessMemberUids || []),
    [selectedWorkspace],
  )
  const workspaceAssignableMemberUidSet = useMemo(
    () => new Set(workspaceAssignableMemberUids),
    [workspaceAssignableMemberUids],
  )
  const workspaceAssignableMembers = useMemo(
    () => approvedMembers.filter((item) => workspaceAssignableMemberUidSet.has(item.uid)),
    [approvedMembers, workspaceAssignableMemberUidSet],
  )
  const workhubShareCandidates = useMemo(
    () => approvedMembers.filter((item) => item.uid !== currentUid),
    [approvedMembers, currentUid],
  )
  const scopedWorkspaceIds = useMemo(() => {
    if (!selectedWorkspaceId) return [] as string[]
    if (selectedWorkspaceScopeType === 'technical') return [selectedWorkspaceId]
    return Array.from(new Set([
      selectedWorkspaceId,
      ...workspaces.filter((item) => resolveWorkspaceScopeType(item) === 'technical').map((item) => item.id),
    ]))
  }, [selectedWorkspaceId, selectedWorkspaceScopeType, workspaces])
  const workspaceProjects = useMemo(() => {
    const scopedIds = new Set(scopedWorkspaceIds)
    return projects.filter((item) => scopedIds.has(item.workspaceId))
  }, [projects, scopedWorkspaceIds])
  const workspaceProjectsByParent = useMemo(() => {
    const map = new Map<string, WorkhubProject[]>()
    workspaceProjects.forEach((item) => {
      const key = item.parentProjectId || ''
      const bucket = map.get(key) || []
      bucket.push(item)
      map.set(key, bucket)
    })
    return map
  }, [workspaceProjects])
  const currentUserAccessLevel = selectedWorkspace?.memberAccessLevels?.[currentUid] || 'custom'
  const canSeeAllProjects = isPrivilegedMember || currentUserAccessLevel === 'full'
  const visibleWorkspaceProjects = useMemo(
    () => workspaceProjects.filter((item) => {
      if (!canViewProject(item, currentUid, canSeeAllProjects)) return false
      const effectiveIntent = resolveEffectiveProjectIntent(item, workspaceByIdForFiltering, selectedWorkspaceTemplateIntentSet)
      return selectedWorkspaceTemplateIntentSet.has(effectiveIntent)
    }),
    [canSeeAllProjects, currentUid, selectedWorkspaceTemplateIntentSet, workspaceByIdForFiltering, workspaceProjects],
  )
  const visibleWorkspaceById = useMemo(
    () => Object.fromEntries(visibleWorkspaces.map((item) => [item.id, item])) as Record<string, WorkhubWorkspace>,
    [visibleWorkspaces],
  )
  const globalFinderEntries = useMemo(() => {
    const entries: WorkhubEntityFinderEntry[] = []

    projects.forEach((item, index) => {
      const workspace = visibleWorkspaceById[item.workspaceId]
      if (!workspace) return

      const workspaceAccessLevel = workspace.memberAccessLevels?.[currentUid] || 'custom'
      const canSeeWorkspaceProjects = isPrivilegedMember || workspaceAccessLevel === 'full'
      if (!canViewProject(item, currentUid, canSeeWorkspaceProjects)) return

      const workspaceTemplateId = resolveWorkhubWorkspaceTemplateForWorkspace(workspace).templateId
      const workspaceIntentSet = new Set(resolveWorkspaceTemplateIntents(workspaceTemplateId))
      const effectiveIntent = resolveEffectiveProjectIntent(item, workspaceByIdForFiltering, workspaceIntentSet)
      if (!workspaceIntentSet.has(effectiveIntent)) return

      const intentMeta = getTemplateCreationIntentMeta(effectiveIntent, workspaceTemplateId)
      const clientName = (item.clientId ? (allClientById[item.clientId]?.name || '') : '').trim()
      const description = (item.description || '').trim()

      entries.push({
        projectId: item.id,
        workspaceId: item.workspaceId,
        name: item.name,
        workspaceName: workspace.name,
        subjectLabel: intentMeta.subjectLabel,
        clientName,
        nameLower: item.name.toLowerCase(),
        workspaceNameLower: workspace.name.toLowerCase(),
        subjectLabelLower: intentMeta.subjectLabel.toLowerCase(),
        clientNameLower: clientName.toLowerCase(),
        descriptionLower: description.toLowerCase(),
        searchableText: [item.name, workspace.name, intentMeta.subjectLabel, clientName, description].join(' ').toLowerCase(),
        order: index,
      })
    })

    return entries
  }, [allClientById, currentUid, isPrivilegedMember, projects, visibleWorkspaceById, workspaceByIdForFiltering])
  const globalFinderResults = useMemo(() => {
    const normalizedQuery = globalFinderQuery.trim().toLowerCase()
    const maxResults = normalizedQuery ? 36 : 18

    return globalFinderEntries
      .map((entry) => ({
        entry,
        score: scoreWorkhubEntityFinderEntry(entry, normalizedQuery),
      }))
      .filter(({ score }) => normalizedQuery ? score > 0 : true)
      .sort((left, right) => {
        if (right.score !== left.score) return right.score - left.score
        if (left.entry.order !== right.entry.order) return left.entry.order - right.entry.order
        return left.entry.name.localeCompare(right.entry.name)
      })
      .slice(0, maxResults)
      .map(({ entry }) => entry)
  }, [globalFinderEntries, globalFinderQuery])
  const globalFinderResolvedActiveIndex = useMemo(
    () => (globalFinderResults.length === 0 ? -1 : Math.min(globalFinderActiveIndex, globalFinderResults.length - 1)),
    [globalFinderActiveIndex, globalFinderResults.length],
  )
  const resolveProjectMainPanelSection = useCallback((projectId: string): 'tasks' | 'dashboard' => {
    const project = projects.find((item) => item.id === projectId)
    return resolveProjectMainPanelView(project?.mainPanelView)
  }, [projects])
  const openDocumentFromNotification = useCallback(async (notification: WorkhubNotification) => {
    const targetDocument = await getWorkhubDocumentById(notification.entityId)
    if (!targetDocument) {
      console.log('[Notification] getWorkhubDocumentById returned null for', notification.entityId)
      return false
    }
    console.log('[Notification] openDocumentFromNotification: doc', targetDocument.id, 'workspace', targetDocument.workspaceId, 'title', targetDocument.title, 'body length', (targetDocument.body || '').length)

    setPendingNotificationDocument(targetDocument)
    setSelectedWorkspaceId(targetDocument.workspaceId)
    setSelectedProjectId('all')
    setSelectedNoteProjectId(targetDocument.projectId || '')
    setSelectedTaskId('')
    setSelectedDocumentId(targetDocument.id)
    setSelectedMoodBoardId('')
    setActiveSection('notes')
    setProjectsGroupExpanded(true)
    setSidebarCollapsed(false)
    return true
  }, [])
  const {
    handleNotificationClick,
    handleToggleNotificationMenu,
    handleToggleAccountMenu,
    handleOpenAccountSettings,
  } = useWorkhubUiInteractionHandlers({
    notificationMenuOpen,
    setNotificationMenuOpen,
    accountMenuOpen,
    setAccountMenuOpen,
    tasks,
    documents,
    visibleWorkspaceProjects,
    setSelectedProjectId,
    setSelectedNoteProjectId,
    setSelectedTaskId,
    setSelectedDocumentId,
    setActiveSection,
    openDocumentFromNotification,
    resolveProjectMainPanelSection,
    navigateToProfile: () => navigate('/profile'),
    showToast,
  })
  const handleNotificationMenuItemClick = useCallback(async (item: WorkhubNotification) => {
    if (!item.read) {
      await markWorkhubNotificationRead(item.id).catch(() => undefined)
    }
    await handleNotificationClick(item)
  }, [handleNotificationClick])
  const {
    selectedTemplate: selectedCreateWorkspaceTemplate,
    templates: workspaceTemplateDefinitions,
    initialTaskStatuses: workspaceTemplateTaskStatuses,
  } = useWorkhubWorkspaceTemplates(workspaceTemplateId)
  const visibleProjectById = useMemo(
    () => Object.fromEntries(visibleWorkspaceProjects.map((item) => [item.id, item])) as Record<string, WorkhubProject>,
    [visibleWorkspaceProjects],
  )
  const visibleProjectsByParent = useMemo(() => {
    const map = new Map<string, WorkhubProject[]>()
    visibleWorkspaceProjects.forEach((item) => {
      const key = item.parentProjectId || ''
      const bucket = map.get(key) || []
      bucket.push(item)
      map.set(key, bucket)
    })
    return map
  }, [visibleWorkspaceProjects])
  const visibleProjectTree = useMemo(() => buildProjectTree(visibleWorkspaceProjects), [visibleWorkspaceProjects])
  const defaultCollapsedClosedRootIds = useMemo(
    () => visibleProjectTree
      .filter((node) => /closed/i.test((node.name || '').trim()))
      .map((node) => node.id),
    [visibleProjectTree],
  )
  const collapsedClosedRootIdSet = useMemo(
    () => new Set(defaultCollapsedClosedRootIds.filter((id) => !expandedProjectIds.includes(id))),
    [defaultCollapsedClosedRootIds, expandedProjectIds],
  )
  const liveProjectTree = useMemo(() => {
    const activeProject = selectedProjectId && selectedProjectId !== 'all'
      ? (visibleWorkspaceProjects.find((project) => project.id === selectedProjectId) || null)
      : null
    const hasDraftDeadline = !!activeProject && selectedProjectDeadlineDraft !== (activeProject.projectDeadline || '')
    const hasDraftTime = !!activeProject && selectedProjectSubmissionTimeDraft !== (activeProject.submissionTime || '')
    if (!hasDraftDeadline && !hasDraftTime) {
      if (collapsedClosedRootIdSet.size === 0) return visibleProjectTree
      return buildProjectTree(visibleWorkspaceProjects, collapsedClosedRootIdSet)
    }
    const patched = visibleWorkspaceProjects.map((project) => {
      if (project.id !== selectedProjectId) return project
      return {
        ...project,
        ...(hasDraftDeadline ? { projectDeadline: selectedProjectDeadlineDraft } : {}),
        ...(hasDraftTime ? { submissionTime: selectedProjectSubmissionTimeDraft } : {}),
      }
    })
    return buildProjectTree(patched, collapsedClosedRootIdSet)
  }, [collapsedClosedRootIdSet, visibleProjectTree, visibleWorkspaceProjects, selectedProjectId, selectedProjectDeadlineDraft, selectedProjectSubmissionTimeDraft])
  const flatVisibleProjectOptions = useMemo(() => flattenProjectTree(visibleProjectTree), [visibleProjectTree])
  const visibleProjectIds = useMemo(() => new Set(visibleWorkspaceProjects.map((item) => item.id)), [visibleWorkspaceProjects])
  const selectedProject = useMemo(() => visibleWorkspaceProjects.find((item) => item.id === selectedProjectId) || null, [selectedProjectId, visibleWorkspaceProjects])
  const selectedProjectEffectiveIntent = useMemo(() => {
    if (!selectedProject) return 'project' as WorkhubProjectIntent
    return resolveEffectiveProjectIntent(selectedProject, workspaceByIdForFiltering, selectedWorkspaceTemplateIntentSet)
  }, [selectedProject, selectedWorkspaceTemplateIntentSet, workspaceByIdForFiltering])
  const projectIntentById = useMemo(() => {
    const map: Record<string, WorkhubProjectIntent> = {}
    visibleWorkspaceProjects.forEach((item) => {
      map[item.id] = resolveEffectiveProjectIntent(item, workspaceByIdForFiltering, selectedWorkspaceTemplateIntentSet)
    })
    return map
  }, [selectedWorkspaceTemplateIntentSet, visibleWorkspaceProjects, workspaceByIdForFiltering])
  const projectIntentMetaById = useMemo(() => {
    const map: Record<string, ReturnType<typeof getTemplateCreationIntentMeta>> = {}
    Object.entries(projectIntentById).forEach(([projectId, effectiveIntent]) => {
      map[projectId] = getTemplateCreationIntentMeta(effectiveIntent, selectedWorkspaceTemplateId)
    })
    return map
  }, [projectIntentById, selectedWorkspaceTemplateId])
  const projectIntentIconById = useMemo(
    () => Object.fromEntries(Object.entries(projectIntentMetaById).map(([projectId, meta]) => [projectId, meta.icon])) as Record<string, string>,
    [projectIntentMetaById],
  )
  const projectSelectorIconById = useMemo(
    () => Object.fromEntries(visibleWorkspaceProjects.map((item) => {
      const effectiveIntent = projectIntentById[item.id] || 'project'
      const icon = effectiveIntent === 'project' ? '📁' : (projectIntentMetaById[item.id]?.icon || '📁')
      return [item.id, icon]
    })) as Record<string, string>,
    [projectIntentById, projectIntentMetaById, visibleWorkspaceProjects],
  )
  const selectedProjectIntentMeta = useMemo(
    () => (selectedProject
      ? (projectIntentMetaById[selectedProject.id] || getTemplateCreationIntentMeta(selectedProjectEffectiveIntent, selectedWorkspaceTemplateId))
      : getTemplateCreationIntentMeta(selectedProjectEffectiveIntent, selectedWorkspaceTemplateId)),
    [projectIntentMetaById, selectedProject, selectedProjectEffectiveIntent, selectedWorkspaceTemplateId],
  )
  const selectedProjectLineage = useMemo(() => {
    if (!selectedProject) return [] as WorkhubProject[]

    const lineage: WorkhubProject[] = []
    const visited = new Set<string>()
    let current: WorkhubProject | null = selectedProject
    while (current && !visited.has(current.id)) {
      lineage.unshift(current)
      visited.add(current.id)
      const parentId: string = current.parentProjectId || ''
      current = parentId ? (visibleProjectById[parentId] || null) : null
    }

    return lineage
  }, [selectedProject, visibleProjectById])
  const taskContextTrail = useMemo(
    () => selectedProjectLineage.slice(-3),
    [selectedProjectLineage],
  )
  const resolveTaskItemDisplayMode = useCallback((projectId: string): 'list' | 'cards' | 'grid' => {
    if (!projectId || projectId === 'all') return 'list'

    const visited = new Set<string>()
    let currentId = projectId
    while (currentId && !visited.has(currentId)) {
      visited.add(currentId)
      const project = visibleProjectById[currentId]
      if (!project) break
      const mode = project.taskItemDisplayMode || 'inherit'
      if (mode !== 'inherit') return mode
      currentId = project.parentProjectId || ''
    }

    return 'list'
  }, [visibleProjectById])
  const taskItemDisplayMode = useMemo(
    () => (selectedProjectId && selectedProjectId !== 'all' ? resolveTaskItemDisplayMode(selectedProjectId) : 'list'),
    [resolveTaskItemDisplayMode, selectedProjectId],
  )
  const selectedProjectPeriodLabel = useMemo(() => {
    if (!selectedProject) return ''
    const startLabel = formatProjectDeadlineDate(selectedProject.projectStartDate || '')
    const endLabel = formatProjectDeadlineDate(selectedProject.projectDeadline || '')
    if (startLabel && endLabel) return `${startLabel} -> ${endLabel}`
    return endLabel || startLabel || ''
  }, [selectedProject])
  const selectedProjectSubmissionTimeLabel = useMemo(
    () => (selectedProject?.projectType === 'tender' ? (selectedProject.submissionTime || '') : ''),
    [selectedProject],
  )
  const selectedWorkspaceProjectColorMeanings = useMemo(
    () => resolveProjectColorMeanings(selectedWorkspaceTemplateId, selectedWorkspace?.projectColorMeanings),
    [selectedWorkspace?.projectColorMeanings, selectedWorkspaceTemplateId],
  )
  const selectedWorkspaceProjectColorOptions = useMemo(
    () => selectedWorkspaceProjectColorMeanings.map((item) => item.color),
    [selectedWorkspaceProjectColorMeanings],
  )
  const selectedWorkspaceDisplayName = useMemo(
    () => (selectedWorkspace ? `${resolveWorkhubWorkspaceTemplateIcon(selectedWorkspaceTemplateId)} ${selectedWorkspace.name}` : ''),
    [selectedWorkspace, selectedWorkspaceTemplateId],
  )
  const selectedProjectColorMeaning = useMemo(
    () => {
      const normalizedColor = selectedProjectColorDraft.trim().toLowerCase()
      const match = selectedWorkspaceProjectColorMeanings.find((item) => item.color.toLowerCase() === normalizedColor)
      if (match) return match
      return {
        color: selectedProjectColorDraft,
        label: 'Custom color',
        hint: `Custom meaning (${selectedProjectColorDraft.toUpperCase()}).`,
      }
    },
    [selectedProjectColorDraft, selectedWorkspaceProjectColorMeanings],
  )
  const selectedProjectDisplayName = useMemo(
    () => (selectedProject ? `${selectedProjectIntentMeta.icon} ${selectedProject.name}` : ''),
    [selectedProject, selectedProjectIntentMeta],
  )
  const flatVisibleProjectOptionsWithIcons = useMemo(
    () => flatVisibleProjectOptions.map((item) => ({
      ...item,
      name: `${projectSelectorIconById[item.id] || '📁'} ${item.name}`,
    })),
    [flatVisibleProjectOptions, projectSelectorIconById],
  )
  const selectedProjectComposedDescriptionDraft = useMemo(
    () => buildProjectDescriptionFromIntentDrafts(
      selectedProjectEffectiveIntent,
      selectedProjectNarrativeDraft,
      selectedProjectIntentDetailDrafts,
    ),
    [selectedProjectEffectiveIntent, selectedProjectIntentDetailDrafts, selectedProjectNarrativeDraft],
  )
  const selectedProjectTypeOptions = useMemo(() => {
    const constrainedTypes = WORKHUB_INTENT_ALLOWED_PROJECT_TYPES[selectedProjectEffectiveIntent]
    const allowedTypes = new Set<WorkhubProjectType>(constrainedTypes || PROJECT_TYPE_OPTIONS.map((option) => option.value))
    if (selectedProjectTypeDraft && !allowedTypes.has(selectedProjectTypeDraft)) {
      allowedTypes.add(selectedProjectTypeDraft)
    }
    return PROJECT_TYPE_OPTIONS.filter((option) => allowedTypes.has(option.value))
  }, [selectedProjectEffectiveIntent, selectedProjectTypeDraft])
  const workspaceScopedTasks = useMemo(() => {
    return tasks.filter((item) => {
      if (!visibleProjectIds.has(item.projectId)) return false
      if (isEffectivelyEmptyTaskTitle(item.title || '')) return false
      if (selectedAssigneeUid !== 'all' && item.assigneeUid !== selectedAssigneeUid) return false
      return true
    })
  }, [selectedAssigneeUid, tasks, visibleProjectIds])
  const workspaceTaskCountByProjectId = useMemo(() => {
    const counts: Record<string, number> = {}
    workspaceScopedTasks.forEach((task) => {
      counts[task.projectId] = (counts[task.projectId] || 0) + 1
    })
    return counts
  }, [workspaceScopedTasks])
  const workspaceDoneTaskCountByProjectId = useMemo(() => {
    const counts: Record<string, number> = {}
    workspaceScopedTasks.forEach((task) => {
      if (!/done|complete/i.test(task.status)) return
      counts[task.projectId] = (counts[task.projectId] || 0) + 1
    })
    return counts
  }, [workspaceScopedTasks])
  const workspaceTaskProgressByProjectId = useMemo(() => {
    const cache: Record<string, { done: number; total: number }> = {}
    const visiting = new Set<string>()

    const resolveProgress = (projectId: string): { done: number; total: number } => {
      if (!projectId) return { done: 0, total: 0 }
      if (cache[projectId]) return cache[projectId]
      if (visiting.has(projectId)) {
        return {
          done: workspaceDoneTaskCountByProjectId[projectId] || 0,
          total: workspaceTaskCountByProjectId[projectId] || 0,
        }
      }

      visiting.add(projectId)
      let done = workspaceDoneTaskCountByProjectId[projectId] || 0
      let total = workspaceTaskCountByProjectId[projectId] || 0

      const children = visibleProjectsByParent.get(projectId) || []
      children.forEach((child) => {
        const childProgress = resolveProgress(child.id)
        done += childProgress.done
        total += childProgress.total
      })

      visiting.delete(projectId)
      const result = { done, total }
      cache[projectId] = result
      return result
    }

    visibleWorkspaceProjects.forEach((project) => {
      cache[project.id] = resolveProgress(project.id)
    })

    return cache
  }, [
    visibleProjectsByParent,
    visibleWorkspaceProjects,
    workspaceDoneTaskCountByProjectId,
    workspaceTaskCountByProjectId,
  ])
  const visibleTasks = useMemo(() => {
    if (selectedProjectId === 'all') return workspaceScopedTasks
    return workspaceScopedTasks.filter((item) => item.projectId === selectedProjectId)
  }, [selectedProjectId, workspaceScopedTasks])
  const groupedProjectsWorkspace = selectedWorkspaceScopeType !== 'technical'
  const mirroredProjectRoots = useMemo(
    () => (groupedProjectsWorkspace ? liveProjectTree.filter((item) => item.workspaceId !== selectedWorkspaceId) : []),
    [groupedProjectsWorkspace, liveProjectTree, selectedWorkspaceId],
  )
  const localWorkspaceRoots = useMemo(
    () => (groupedProjectsWorkspace ? liveProjectTree.filter((item) => item.workspaceId === selectedWorkspaceId) : liveProjectTree),
    [groupedProjectsWorkspace, liveProjectTree, selectedWorkspaceId],
  )
  const workspaceTaskStatuses = useMemo(() => {
    if (Array.isArray(selectedWorkspace?.taskStatuses) && selectedWorkspace.taskStatuses.length > 0) {
      return selectedWorkspace.taskStatuses.map((item) => ({ ...item }))
    }
    return buildWorkspaceTaskStatuses('workspace_default', selectedWorkspaceScopeType)
  }, [selectedWorkspace?.id, selectedWorkspace?.taskStatuses, selectedWorkspaceScopeType])

  // Resolve effective statuses for a project: project > nearest ancestor > workspace
  const effectiveStatusesByProjectId = useMemo(() => {
    const cache = new Map<string, WorkhubTaskStatusConfig[]>()
    const byId = new Map(visibleWorkspaceProjects.map((p) => [p.id, p]))
    function resolve(projectId: string, depth = 0): WorkhubTaskStatusConfig[] {
      if (depth > 20) return workspaceTaskStatuses
      if (cache.has(projectId)) return cache.get(projectId)!
      const project = byId.get(projectId)
      if (!project) { cache.set(projectId, workspaceTaskStatuses); return workspaceTaskStatuses }
      if (Array.isArray(project.taskStatuses) && project.taskStatuses.length > 0) {
        const result = project.taskStatuses.map((item) => ({ ...item }))
        cache.set(projectId, result)
        return result
      }
      if (project.parentProjectId) {
        const parentResult = resolve(project.parentProjectId, depth + 1)
        cache.set(projectId, parentResult)
        return parentResult
      }
      cache.set(projectId, workspaceTaskStatuses)
      return workspaceTaskStatuses
    }
    visibleWorkspaceProjects.forEach((p) => resolve(p.id))
    return cache
  }, [visibleWorkspaceProjects, workspaceTaskStatuses])

  const selectedProjectEffectiveTaskStatuses = useMemo(() => {
    if (!selectedProjectId || selectedProjectId === 'all') return workspaceTaskStatuses
    return effectiveStatusesByProjectId.get(selectedProjectId) ?? workspaceTaskStatuses
  }, [selectedProjectId, effectiveStatusesByProjectId, workspaceTaskStatuses])

  const defaultTaskStatusId = useMemo(
    () => workspaceTaskStatuses.find((item) => item.id === 'backlog')?.id || workspaceTaskStatuses[0]?.id || 'backlog',
    [workspaceTaskStatuses],
  )
  const taskCountByStatus = useMemo(
    () => tasks.reduce((acc, item) => {
      acc[item.status] = (acc[item.status] || 0) + 1
      return acc
    }, {} as Record<string, number>),
    [tasks],
  )
  const selectedStatusDraft = useMemo(
    () => statusDrafts.find((item) => item.id === selectedStatusDraftId) || statusDrafts[0] || null,
    [selectedStatusDraftId, statusDrafts],
  )
  const taskFilterBaseTasks = useMemo(() => {
    return visibleTasks.filter((item) => {
      if (taskFilterRequireAttachments && getTaskAttachments(item).length === 0) return false
      if (taskFilterRequireChecklist && (!Array.isArray(item.checklist) || item.checklist.length === 0)) return false
      if (taskFilterPriority !== 'all' && item.priority !== taskFilterPriority) return false
      return true
    })
  }, [taskFilterPriority, taskFilterRequireAttachments, taskFilterRequireChecklist, visibleTasks])
  const activeTaskFilterCount = useMemo(() => {
    let count = 0
    if (taskFilterRequireAttachments) count += 1
    if (taskFilterRequireChecklist) count += 1
    if (taskFilterPriority !== 'all') count += 1
    return count
  }, [taskFilterPriority, taskFilterRequireAttachments, taskFilterRequireChecklist])
  const filteredTasks = useMemo(() => {
    if (selectedTaskStatusTab === 'all') return taskFilterBaseTasks
    return taskFilterBaseTasks.filter((item) => item.status === selectedTaskStatusTab)
  }, [selectedTaskStatusTab, taskFilterBaseTasks])
  const filteredTaskCountByStatus = useMemo(() => {
    const grouped: Record<string, number> = {}
    for (const item of filteredTasks) {
      grouped[item.status] = (grouped[item.status] || 0) + 1
    }
    return grouped
  }, [filteredTasks])
  const financeStatusTotals = useMemo<Record<string, number>>(() => {
    if (selectedWorkspaceScopeType !== 'finance') return {}
    const totals: Record<string, number> = {}
    for (const task of filteredTasks) {
      if (typeof task.valueAmount === 'number' && Number.isFinite(task.valueAmount) && task.valueAmount > 0) {
        totals[task.status] = Math.round(((totals[task.status] || 0) + task.valueAmount) * 100) / 100
      }
    }
    return totals
  }, [filteredTasks, selectedWorkspaceScopeType])
  const financeWorkspaceCurrency = useMemo<string>(() => {
    if (selectedWorkspaceScopeType !== 'finance') return ''
    for (const task of filteredTasks) {
      if (task.valueCurrency) return task.valueCurrency
    }
    return 'OMR'
  }, [filteredTasks, selectedWorkspaceScopeType])
  const taskFilterBaseTaskCountByStatus = useMemo(() => {
    const grouped: Record<string, number> = {}
    for (const item of taskFilterBaseTasks) {
      grouped[item.status] = (grouped[item.status] || 0) + 1
    }
    return grouped
  }, [taskFilterBaseTasks])
  const completedStatusForHighlight = useMemo(() => {
    const completedCandidates = selectedProjectEffectiveTaskStatuses.filter((status) => {
      const token = `${status.id} ${status.label}`.toLowerCase()
      return token.includes('done') || token.includes('complete') || token.includes('closed')
    })
    if (completedCandidates.length === 0) return null
    const withTasks = completedCandidates.find((status) => (taskFilterBaseTaskCountByStatus[status.id] || 0) > 0)
    return withTasks || completedCandidates[0] || null
  }, [selectedProjectEffectiveTaskStatuses, taskFilterBaseTaskCountByStatus])
  const completedHighlightCount = useMemo(
    () => (completedStatusForHighlight ? (taskFilterBaseTaskCountByStatus[completedStatusForHighlight.id] || 0) : 0),
    [completedStatusForHighlight, taskFilterBaseTaskCountByStatus],
  )
  const collapsibleStatusIdSet = useMemo(() => new Set(
    selectedProjectEffectiveTaskStatuses
      .filter((status) => {
        const token = `${status.id} ${status.label}`.toLowerCase()
        return token.includes('done') || token.includes('complete') || token.includes('closed')
      })
      .map((status) => status.id),
  ), [selectedProjectEffectiveTaskStatuses])
  const renderedTaskStatuses = useMemo(() => {
    if (selectedTaskStatusTab === 'all') {
      if (selectedProjectEffectiveTaskStatuses.length > 0) return selectedProjectEffectiveTaskStatuses
      return selectedProjectEffectiveTaskStatuses[0] ? [selectedProjectEffectiveTaskStatuses[0]] : []
    }
    return selectedProjectEffectiveTaskStatuses.filter((status) => status.id === selectedTaskStatusTab)
  }, [selectedTaskStatusTab, selectedProjectEffectiveTaskStatuses])
  const expandedRenderableStatusIdSet = useMemo(() => {
    if (selectedTaskStatusTab !== 'all') {
      return new Set(renderedTaskStatuses.map((status) => status.id))
    }
    return new Set(
      renderedTaskStatuses
        .filter((status) => !collapsibleStatusIdSet.has(status.id) || expandedTaskStatusIds.includes(status.id))
        .map((status) => status.id),
    )
  }, [collapsibleStatusIdSet, expandedTaskStatusIds, renderedTaskStatuses, selectedTaskStatusTab])
  const renderedTaskListsByStatus = useMemo(() => {
    const grouped: Record<string, WorkhubTask[]> = {}
    const groupedCount: Record<string, number> = {}
    if (expandedRenderableStatusIdSet.size === 0) return grouped
    for (const item of filteredTasks) {
      if (!expandedRenderableStatusIdSet.has(item.status)) continue
      const currentCount = groupedCount[item.status] || 0
      const limit = statusTaskRenderLimitById[item.status] || DEFAULT_STATUS_TASK_RENDER_LIMIT
      if (currentCount >= limit) continue
      if (!grouped[item.status]) grouped[item.status] = []
      grouped[item.status].push(item)
      groupedCount[item.status] = currentCount + 1
    }
    return grouped
  }, [expandedRenderableStatusIdSet, filteredTasks, statusTaskRenderLimitById])
  // Pre-compute expensive per-task metadata — only recalculates when task DATA changes,
  // not when selectedTaskIds / other UI state changes.
  const taskMetaById = useMemo<Record<string, TaskRowMeta>>(() => {
    const result: Record<string, TaskRowMeta> = {}
    const isFinanceScope = selectedWorkspaceScopeType === 'finance'
    for (const task of tasks) {
      const checklist = buildChecklist(task)
      let financeValue: TaskRowMeta['financeValue'] = null
      if (isFinanceScope && typeof task.valueAmount === 'number' && task.valueAmount > 0) {
        const totalValue = task.valueAmount
        const currency = task.valueCurrency || 'OMR'
        let usedValue = 0
        for (const item of checklist) {
          if (typeof item.valueAmount === 'number' && Number.isFinite(item.valueAmount)) {
            usedValue += item.valueAmount
          }
        }
        financeValue = { totalValue, usedValue, remaining: totalValue - usedValue, currency }
      }
      result[task.id] = {
        checklist,
        checklistDoneCount: checklist.filter((item) => item.completed).length,
        checklistDetailsCount: checklist.filter((item) => (item.details || '').trim().length > 0).length,
        checklistImagesCount: checklist.reduce((sum, item) => sum + (item.attachments?.length || 0), 0),
        checklistLinksCount: checklist.reduce((sum, item) => sum + (item.links?.length || 0), 0),
        taskAttachmentCount: getTaskAttachments(task).length,
        financeValue,
      }
    }
    return result
  }, [tasks, selectedWorkspaceScopeType])
  const selectedTask = useMemo(() => visibleTasks.find((item) => item.id === selectedTaskId) || null, [selectedTaskId, visibleTasks])
  useEffect(() => {
    setTaskAttachmentsCollapsed(false)
  }, [selectedTask?.id])

  useEffect(() => {
    setProjectAttachmentsCollapsed(false)
  }, [selectedProject?.id])
  const selectedTaskIdSet = useMemo(() => new Set(selectedTaskIds), [selectedTaskIds])
  const expandedTaskChecklistIdsSet = useMemo(() => new Set(expandedTaskChecklistIds), [expandedTaskChecklistIds])
  const selectedTasks = useMemo(() => tasks.filter((item) => selectedTaskIdSet.has(item.id)), [selectedTaskIdSet, tasks])
  const selectedTaskCount = selectedTasks.length
  // Stable callbacks bag — created once on mount, reads current state via _cbRef.
  // This lets TaskRow be memoised: it only re-renders when its own props change.
  const taskRowCallbacks = useMemo<TaskRowCallbacks>(() => ({
    onDragOver: (event, taskId, taskStatus) => {
      const { dragTaskId, dragStatusId, dropTargetKey: cur } = _cbRef.current
      if (!dragTaskId || dragTaskId === taskId || dragStatusId !== taskStatus) return
      event.preventDefault()
      if (cur !== taskId) setDropTargetKey(taskId)
    },
    onDrop: (event, taskId, taskStatus) => {
      const { dragTaskId, dragStatusId } = _cbRef.current
      if (!dragTaskId || dragTaskId === taskId || dragStatusId !== taskStatus) return
      event.preventDefault()
      void _cbRef.current.handleTaskReorder(dragTaskId, taskStatus, taskId)
    },
    onRowClick: (taskId) => {
      if (workhubDebugEnabled) {
        taskSelectionPerfRef.current = { taskId, startedAt: performance.now() }
        console.info('[WorkHubDebug] row click', {
          taskId,
          path: `${location.pathname}${location.search}`,
        })
      }
      setSelectedTaskId(taskId)
      setOpenTaskMoreMenuId('')
      setOpenTaskStatusMenuId('')
      setOpenTaskPriorityMenuId('')
      setOpenTaskAssigneeMenuId('')
    },
    onDoubleClickRow: (taskId) => {
      setExpandedTaskChecklistIds((cur) => cur.includes(taskId) ? cur.filter((id) => id !== taskId) : [...cur, taskId])
    },
    onDragStart: (event, taskId, taskStatus) => {
      event.stopPropagation()
      setDragTaskId(taskId)
      setDragStatusId(taskStatus)
      setDropTargetKey('')
      event.dataTransfer.effectAllowed = 'move'
      event.dataTransfer.setData('text/plain', taskId)
    },
    onDragEnd: () => { setDragTaskId(''); setDragStatusId(''); setDropTargetKey('') },
    onCheckboxChange: (taskId, checked) => {
      setSelectedTaskIds((cur) => {
        if (checked) return cur.includes(taskId) ? cur : [...cur, taskId]
        return cur.filter((id) => id !== taskId)
      })
    },
    onTitleEditStart: (task) => { setEditingTaskTitleId(task.id); setEditingTaskTitleText(task.title) },
    onTitleEditTextChange: (text) => setEditingTaskTitleText(text),
    onTitleEditSave: (task) => {
      const nextTitle = normalizeTaskTitle(_cbRef.current.editingTaskTitleText)
      setEditingTaskTitleId(null)
      setEditingTaskTitleText('')
      if (!nextTitle || nextTitle === normalizeTaskTitle(task.title || '')) return
      void _cbRef.current.handleTaskUpdate(task, { title: nextTitle }, { silent: true })
    },
    onTitleEditCancel: () => { setEditingTaskTitleId(null); setEditingTaskTitleText('') },
    onOpenStatusMenu: (taskId) => {
      setOpenTaskStatusMenuId((cur) => cur === taskId ? '' : taskId)
      setOpenTaskMoreMenuId('')
      setOpenTaskPriorityMenuId('')
      setOpenTaskAssigneeMenuId('')
    },
    onOpenPriorityMenu: (taskId) => {
      setOpenTaskPriorityMenuId((cur) => cur === taskId ? '' : taskId)
      setOpenTaskStatusMenuId('')
      setOpenTaskMoreMenuId('')
      setOpenTaskAssigneeMenuId('')
    },
    onOpenMoreMenu: (taskId) => {
      setOpenTaskMoreMenuId((cur) => cur === taskId ? '' : taskId)
      setOpenTaskStatusMenuId('')
      setOpenTaskPriorityMenuId('')
      setOpenTaskAssigneeMenuId('')
    },
    onOpenAssigneeMenu: (taskId) => {
      setOpenTaskAssigneeMenuId((cur) => cur === taskId ? '' : taskId)
      setOpenTaskStatusMenuId('')
      setOpenTaskPriorityMenuId('')
      setOpenTaskMoreMenuId('')
    },
    onAssigneeSelect: (task, uid) => {
      void _cbRef.current.handleTaskUpdate(task, { assigneeUid: uid || undefined }, { silent: true })
      setOpenTaskAssigneeMenuId('')
    },
    onStatusSelect: (task, statusId) => {
      const { selectedTaskIdSet: set, selectedTaskCount: count } = _cbRef.current
      if (set.has(task.id) && count > 1) {
        void _cbRef.current.handleBulkStatusChange(statusId)
      } else {
        void _cbRef.current.handleTaskUpdate(task, { status: statusId }, { silent: true })
      }
      setOpenTaskStatusMenuId('')
    },
    onPrioritySelect: (task, priorityValue) => {
      void _cbRef.current.handleTaskUpdate(task, { priority: priorityValue }, { silent: true })
      setOpenTaskPriorityMenuId('')
    },
    onToggleChecklist: (taskId) => {
      setExpandedTaskChecklistIds((cur) => cur.includes(taskId) ? cur.filter((id) => id !== taskId) : [...cur, taskId])
      setOpenTaskMoreMenuId('')
      setOpenTaskStatusMenuId('')
      setOpenTaskPriorityMenuId('')
    },
    onDueDateChange: (task, value) => {
      void _cbRef.current.handleTaskUpdate(task, { dueDate: value }, { silent: true })
    },
    onOpenDetails: (taskId) => {
      setSelectedTaskId(taskId)
      setOpenTaskMoreMenuId('')
      setOpenTaskStatusMenuId('')
      setOpenTaskPriorityMenuId('')
    },
    onChecklistItemToggle: (task, itemId, checked) => {
      const next = buildChecklist(task).map((item) => item.id === itemId ? { ...item, completed: checked } : item)
      void _cbRef.current.handleTaskUpdate(task, { checklist: next }, { silent: true })
    },
    onChecklistItemEditStart: (taskId, itemId, text, scope) => {
      setEditingChecklistTaskId(taskId)
      setEditingChecklistItemId(itemId)
      setEditingChecklistScope(scope)
      setEditingChecklistItemText(text)
    },
    onChecklistItemTextChange: (text) => setEditingChecklistItemText(text),
    onChecklistItemEditSave: (task, itemId) => {
      const newText = _cbRef.current.editingChecklistItemText.trim()
      setEditingChecklistTaskId(null)
      setEditingChecklistItemId(null)
      setEditingChecklistScope(null)
      setEditingChecklistItemText('')
      if (!newText) return
      const next = buildChecklist(task).map((item) => item.id === itemId ? { ...item, text: newText } : item)
      void _cbRef.current.handleTaskUpdate(task, { checklist: next }, { silent: true })
    },
    onChecklistItemEditCancel: () => {
      setEditingChecklistTaskId(null)
      setEditingChecklistItemId(null)
      setEditingChecklistScope(null)
      setEditingChecklistItemText('')
    },
    onChecklistRemove: (task, itemId) => {
      const next = buildChecklist(task).filter((item) => item.id !== itemId)
      void _cbRef.current.handleTaskUpdate(task, { checklist: next }, { silent: true })
    },
    onChecklistAdd: (task) => {
      const draft = (_cbRef.current.taskChecklistDrafts[task.id] || '').trim()
      if (!draft) return
      const newItem: WorkhubTaskChecklistItem = {
        id: `chk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        text: draft, completed: false,
      }
      const next = [...buildChecklist(task), newItem]
      setTaskChecklistDrafts((cur) => ({ ...cur, [task.id]: '' }))
      void _cbRef.current.handleTaskUpdate(task, { checklist: next }, { silent: true })
    },
    onChecklistDraftChange: (taskId, value) => {
      setTaskChecklistDrafts((cur) => ({ ...cur, [taskId]: value }))
    },
    onChecklistItemValueChange: (task, itemId, value) => {
      const next = buildChecklist(task).map((item) =>
        item.id === itemId ? { ...item, valueAmount: value !== null ? value : undefined } : item,
      )
      void _cbRef.current.handleTaskUpdate(task, { checklist: next }, { silent: true })
    },
    onTaskValueChange: (task, value) => {
      void _cbRef.current.handleTaskUpdate(task, { valueAmount: value !== null ? value : undefined }, { silent: true })
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [])
  const selectedWorkspaceSettings = useMemo(() => workspaces.find((item) => item.id === workspaceSettingsId) || null, [workspaceSettingsId, workspaces])
  const selectedWorkspaceSettingsTemplateResolution = useMemo(
    () => resolveWorkhubWorkspaceTemplateForWorkspace(selectedWorkspaceSettings),
    [selectedWorkspaceSettings],
  )
  const selectedWorkspaceSettingsTemplate = useMemo(() => {
    const template = selectedWorkspaceSettingsTemplateResolution.template
    return {
      id: template.id,
      label: template.label,
      graphic: template.graphic,
      description: template.description,
      warning: selectedWorkspaceSettingsTemplateResolution.warning || '',
    }
  }, [selectedWorkspaceSettingsTemplateResolution])
  const selectedWorkspaceSettingsDefaultProjectColorMeanings = useMemo(
    () => resolveProjectColorMeanings(selectedWorkspaceSettingsTemplate.id),
    [selectedWorkspaceSettingsTemplate.id],
  )
  const selectedWorkspaceProjectCount = useMemo(
    () => (selectedWorkspaceSettings ? projects.filter((item) => item.workspaceId === selectedWorkspaceSettings.id).length : 0),
    [projects, selectedWorkspaceSettings],
  )
  const selectedWorkspaceTaskCount = useMemo(
    () => (selectedWorkspaceSettings ? tasks.filter((item) => item.workspaceId === selectedWorkspaceSettings.id).length : 0),
    [selectedWorkspaceSettings, tasks],
  )

  useEffect(() => {
    setSelectedTaskIds((current) => current.filter((taskId) => tasks.some((task) => task.id === taskId)))
  }, [tasks])

  useEffect(() => {
    const projectName = selectedProject?.name?.trim()
    document.title = projectName ? `WorkHub | ${projectName}` : 'WorkHub'
  }, [selectedProject?.name])

  async function handleTaskReorder(draggedId: string, statusId: string, targetTaskId: string | null) {
    if (!draggedId || !selectedWorkspaceId) return
    const orderedTasks = getOrderedTasksForStatus(tasks, selectedWorkspaceId, statusId)
    const draggedTask = orderedTasks.find((item) => item.id === draggedId)
    if (!draggedTask) return
    const remainingTasks = orderedTasks.filter((item) => item.id !== draggedId)
    const insertIndex = targetTaskId ? remainingTasks.findIndex((item) => item.id === targetTaskId) : remainingTasks.length
    remainingTasks.splice(insertIndex < 0 ? remainingTasks.length : insertIndex, 0, draggedTask)
    const changedTasks = remainingTasks.filter((item, index) => item.sortOrder !== ((index + 1) * 1024))
    if (changedTasks.length === 0) {
      setDragTaskId('')
      setDragStatusId('')
      setDropTargetKey('')
      return
    }
    setBusyKey('task-sort')
    try {
      await Promise.all(remainingTasks.map((item, index) => updateWorkhubTask(item.id, { sortOrder: (index + 1) * 1024 })))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not reorder tasks.'
      showToast({ type: 'error', message })
    } finally {
      setBusyKey('')
      setDragTaskId('')
      setDragStatusId('')
      setDropTargetKey('')
    }
  }
  const selectedNoteProject = useMemo(() => visibleWorkspaceProjects.find((item) => item.id === selectedNoteProjectId) || null, [selectedNoteProjectId, visibleWorkspaceProjects])
  const selectedAccessProject = useMemo(() => workspaceProjects.find((item) => item.id === projectAccessDialogId) || null, [projectAccessDialogId, workspaceProjects])
  const selectedAccessProjectEffectiveIntent = useMemo(() => {
    if (!selectedAccessProject) return 'project' as WorkhubProjectIntent
    return resolveEffectiveProjectIntent(selectedAccessProject, workspaceByIdForFiltering, selectedWorkspaceTemplateIntentSet)
  }, [selectedAccessProject, selectedWorkspaceTemplateIntentSet, workspaceByIdForFiltering])
  const selectedAccessProjectIntentMeta = useMemo(
    () => getTemplateCreationIntentMeta(selectedAccessProjectEffectiveIntent, selectedWorkspaceTemplateId),
    [selectedAccessProjectEffectiveIntent, selectedWorkspaceTemplateId],
  )
  const selectedAccessProjectDeadlineLabel = useMemo(
    () => getIntentSettingsDeadlineLabel(selectedAccessProjectEffectiveIntent, settingsProjectType),
    [selectedAccessProjectEffectiveIntent, settingsProjectType],
  )
  const selectedAccessProjectShowMonetaryValue = useMemo(
    () => shouldShowMonetaryValueField(selectedAccessProjectEffectiveIntent),
    [selectedAccessProjectEffectiveIntent],
  )
  const selectedAccessProjectMonetaryValueLabel = useMemo(
    () => getIntentMonetaryValueLabel(selectedAccessProjectEffectiveIntent),
    [selectedAccessProjectEffectiveIntent],
  )
  const settingsProjectTypeOptions = useMemo(() => {
    const constrainedTypes = WORKHUB_INTENT_ALLOWED_PROJECT_TYPES[selectedAccessProjectEffectiveIntent]
    const allowedTypes = new Set<WorkhubProjectType>(constrainedTypes || PROJECT_TYPE_OPTIONS.map((option) => option.value))
    if (settingsProjectType && !allowedTypes.has(settingsProjectType)) {
      allowedTypes.add(settingsProjectType)
    }
    return PROJECT_TYPE_OPTIONS.filter((option) => allowedTypes.has(option.value))
  }, [selectedAccessProjectEffectiveIntent, settingsProjectType])
  const selectedAccessProjectBranchIds = useMemo(() => {
    if (!selectedAccessProject) return new Set<string>()
    return collectProjectBranchIds(selectedAccessProject.id, workspaceProjectsByParent)
  }, [selectedAccessProject, workspaceProjectsByParent])
  const settingsParentOptions = useMemo(() => {
    const availableOptions = selectedAccessProject
      ? flatVisibleProjectOptions.filter((item) => !selectedAccessProjectBranchIds.has(item.id))
      : flatVisibleProjectOptions
    return availableOptions.map((item) => {
      const effectiveIntent = projectIntentById[item.id] || 'project'
      const icon = effectiveIntent === 'project'
        ? (item.id === settingsProjectParentId ? '📂' : '📁')
        : (projectSelectorIconById[item.id] || '📁')
      return {
        ...item,
        name: `${icon} ${item.name}`,
      }
    })
  }, [
    flatVisibleProjectOptions,
    projectIntentById,
    projectSelectorIconById,
    selectedAccessProject,
    selectedAccessProjectBranchIds,
    settingsProjectParentId,
  ])
  const settingsProjectColorMeaning = useMemo(
    () => selectedWorkspaceProjectColorMeanings.find((item) => item.color.toLowerCase() === settingsProjectColor.trim().toLowerCase()) || null,
    [selectedWorkspaceProjectColorMeanings, settingsProjectColor],
  )
  const settingsProjectStatusLabelNormalized = useMemo(
    () => normalizeWorkhubLabel(settingsProjectColorMeaning?.label || ''),
    [settingsProjectColorMeaning],
  )
  const submittedProposalTargetProject = useMemo(() => {
    if (selectedWorkspaceTemplateId !== 'proposals_leads') return null
    if (selectedAccessProjectEffectiveIntent !== 'proposal') return null
    return workspaceProjects.find((project) => (
      project.workspaceId === selectedWorkspaceId
      && resolveEffectiveProjectIntent(project, workspaceByIdForFiltering, selectedWorkspaceTemplateIntentSet) === 'project'
      && isSubmittedProposalFolderName(project.name)
    )) || null
  }, [
    selectedAccessProjectEffectiveIntent,
    selectedWorkspaceId,
    selectedWorkspaceTemplateId,
    selectedWorkspaceTemplateIntentSet,
    workspaceByIdForFiltering,
    workspaceProjects,
  ])
  const proposalProjectsWorkspace = useMemo(() => {
    if (selectedWorkspaceTemplateId !== 'proposals_leads') return null
    if (selectedAccessProjectEffectiveIntent !== 'proposal') return null
    return visibleWorkspaces.find((workspace) => resolveWorkhubWorkspaceTemplateForWorkspace(workspace).templateId === 'projects') || null
  }, [selectedAccessProjectEffectiveIntent, selectedWorkspaceTemplateId, visibleWorkspaces])
  const proposalProjectsWorkspaceIntentSet = useMemo(
    () => new Set(resolveWorkspaceTemplateIntents(proposalProjectsWorkspace ? resolveWorkhubWorkspaceTemplateForWorkspace(proposalProjectsWorkspace).templateId : 'projects')),
    [proposalProjectsWorkspace],
  )
  const existingProposalDeliveryFolder = useMemo(() => {
    if (!proposalProjectsWorkspace) return null
    const normalizedProjectName = normalizeWorkhubLabel(settingsProjectName)
    if (!normalizedProjectName) return null
    return projects.find((project) => (
      project.workspaceId === proposalProjectsWorkspace.id
      && resolveEffectiveProjectIntent(project, workspaceByIdForFiltering, proposalProjectsWorkspaceIntentSet) === 'project'
      && normalizeWorkhubLabel(project.name) === normalizedProjectName
    )) || null
  }, [projects, proposalProjectsWorkspace, proposalProjectsWorkspaceIntentSet, settingsProjectName, workspaceByIdForFiltering])
  const proposalDeliveryFolderColor = useMemo(() => {
    if (!proposalProjectsWorkspace) return '#10b981'
    const runningMeaning = resolveProjectColorMeanings(
      resolveWorkhubWorkspaceTemplateForWorkspace(proposalProjectsWorkspace).templateId,
      proposalProjectsWorkspace.projectColorMeanings,
    ).find((item) => normalizeWorkhubLabel(item.label).includes('running'))
    return runningMeaning?.color || '#10b981'
  }, [proposalProjectsWorkspace])
  const proposalStatusSuggestion = useMemo(() => {
    if (selectedWorkspaceTemplateId !== 'proposals_leads') return null
    if (selectedAccessProjectEffectiveIntent !== 'proposal') return null

    if (settingsProjectStatusLabelNormalized.includes('submitted')) {
      if (!submittedProposalTargetProject) {
        return {
          title: 'Submitted folder unavailable',
          description: 'No "Submitted proposals" folder was found in this workspace.',
          buttonLabel: '',
          applied: true,
          appliedLabel: 'No "Submitted proposals" folder was found in this workspace.',
        }
      }
      const alreadyApplied = settingsProjectParentId === submittedProposalTargetProject.id
      return {
        title: 'Move to Submitted proposals',
        description: 'Set the parent item/category to Submitted proposals before saving.',
        buttonLabel: 'Use Submitted proposals',
        applied: alreadyApplied,
        appliedLabel: `Parent item/category is set to ${submittedProposalTargetProject.name}.`,
        onApply: () => setSettingsProjectParentId(submittedProposalTargetProject.id),
      }
    }

    if (settingsProjectStatusLabelNormalized.includes('running')) {
      if (!proposalProjectsWorkspace) {
        return {
          title: 'Projects workspace unavailable',
          description: 'No accessible Projects workspace was found for creating a delivery folder.',
          buttonLabel: '',
          applied: true,
          appliedLabel: 'No accessible Projects workspace was found for creating a delivery folder.',
        }
      }
      if (existingProposalDeliveryFolder) {
        return {
          title: 'Delivery folder already exists',
          description: '',
          buttonLabel: '',
          applied: true,
          appliedLabel: `A matching folder already exists in ${proposalProjectsWorkspace.name}.`,
        }
      }
      return {
        title: 'Create delivery folder in Projects workspace',
        description: `Create a folder named "${settingsProjectName.trim() || 'this proposal'}" in ${proposalProjectsWorkspace.name} when you save.`,
        buttonLabel: `Create in ${proposalProjectsWorkspace.name}`,
        applied: settingsProjectCreateDeliveryFolder,
        appliedLabel: `A new folder will be created in ${proposalProjectsWorkspace.name} when you save.`,
        onApply: () => setSettingsProjectCreateDeliveryFolder(true),
        onCancel: () => setSettingsProjectCreateDeliveryFolder(false),
        cancelLabel: 'Cancel',
      }
    }

    return null
  }, [
    existingProposalDeliveryFolder,
    proposalProjectsWorkspace,
    selectedAccessProjectEffectiveIntent,
    selectedWorkspaceTemplateId,
    settingsProjectCreateDeliveryFolder,
    settingsProjectName,
    settingsProjectParentId,
    settingsProjectStatusLabelNormalized,
    submittedProposalTargetProject,
  ])
  const selectedAccessProjectTaskCount = useMemo(
    () => tasks.filter((item) => selectedAccessProjectBranchIds.has(item.projectId)).length,
    [selectedAccessProjectBranchIds, tasks],
  )
  const selectedAccessProjectChildCount = useMemo(
    () => (selectedAccessProject ? (workspaceProjectsByParent.get(selectedAccessProject.id) || []).length : 0),
    [selectedAccessProject, workspaceProjectsByParent],
  )
  const projectNameById = useMemo(
    () => Object.fromEntries(visibleWorkspaceProjects.map((item) => [item.id, `${projectSelectorIconById[item.id] || '📁'} ${item.name}`])),
    [projectSelectorIconById, visibleWorkspaceProjects],
  )
  const workspaceProjectById = useMemo(
    () => Object.fromEntries(workspaceProjects.map((item) => [item.id, item])) as Record<string, WorkhubProject>,
    [workspaceProjects],
  )
  const assignableMembersByProjectId = useMemo(() => {
    const map: Record<string, WorkhubMember[]> = {}
    workspaceProjects.forEach((project) => {
      // Privileged members (master admin / admin / manager) can assign any workspace member
      // to any project they can view — their elevated access is not limited by project membership.
      if (project.visibility !== 'restricted' || isPrivilegedMember) {
        map[project.id] = workspaceAssignableMembers
        return
      }
      const restrictedUids = normalizeMemberUids([...(project.memberUids || []), project.createdBy])
        .filter((uid) => workspaceAssignableMemberUidSet.has(uid))
      const restrictedUidSet = new Set(restrictedUids)
      map[project.id] = approvedMembers.filter((member) => restrictedUidSet.has(member.uid))
    })
    return map
  }, [approvedMembers, isPrivilegedMember, workspaceAssignableMemberUidSet, workspaceAssignableMembers, workspaceProjects])
  const scopeAssignableMembers = useMemo(() => {
    if (selectedProjectId !== 'all') {
      return assignableMembersByProjectId[selectedProjectId] || workspaceAssignableMembers
    }
    if (visibleWorkspaceProjects.length === 0) return workspaceAssignableMembers
    const byUid = new Map<string, WorkhubMember>()
    visibleWorkspaceProjects.forEach((project) => {
      const allowed = assignableMembersByProjectId[project.id] || workspaceAssignableMembers
      allowed.forEach((member) => byUid.set(member.uid, member))
    })
    return Array.from(byUid.values())
  }, [assignableMembersByProjectId, selectedProjectId, visibleWorkspaceProjects, workspaceAssignableMembers])
  const scopeAssignableMemberUidSet = useMemo(
    () => new Set(scopeAssignableMembers.map((item) => item.uid)),
    [scopeAssignableMembers],
  )
  const memberNameByUid = useMemo(() => Object.fromEntries(members.map((item) => [item.uid, item.displayName || item.email || item.uid])), [members])
  const selectedBranchChildProjects = useMemo(
    () => (selectedProject ? visibleProjectsByParent.get(selectedProject.id) || [] : visibleProjectsByParent.get('') || []),
    [selectedProject, visibleProjectsByParent],
  )
  const selectedProjectBranchIds = useMemo(() => {
    if (!selectedProject) return new Set<string>()
    return collectProjectBranchIds(selectedProject.id, visibleProjectsByParent)
  }, [selectedProject, visibleProjectsByParent])
  const selectedProjectBranchProjects = useMemo(() => {
    if (!selectedProject) return [] as WorkhubProject[]
    return visibleWorkspaceProjects.filter((item) => selectedProjectBranchIds.has(item.id))
  }, [selectedProject, selectedProjectBranchIds, visibleWorkspaceProjects])
  const selectedScopeProjects = useMemo(
    () => (selectedProject ? selectedProjectBranchProjects : visibleWorkspaceProjects),
    [selectedProject, selectedProjectBranchProjects, visibleWorkspaceProjects],
  )
  const selectedScopeDescendantProjects = useMemo(
    () => (selectedProject ? selectedProjectBranchProjects.filter((item) => item.id !== selectedProject.id) : visibleWorkspaceProjects),
    [selectedProject, selectedProjectBranchProjects, visibleWorkspaceProjects],
  )
  const selectedDashboardFocusIntent = useMemo<WorkhubProjectIntent>(() => {
    const descendantIntentCounts = new Map<WorkhubProjectIntent, number>()
    selectedScopeDescendantProjects.forEach((project) => {
      const intent = projectIntentById[project.id] || 'project'
      if (intent === 'project') return
      descendantIntentCounts.set(intent, (descendantIntentCounts.get(intent) || 0) + 1)
    })

    const dominantIntent = Array.from(descendantIntentCounts.entries())
      .sort((left, right) => right[1] - left[1])[0]?.[0]

    if (dominantIntent) return dominantIntent
    if (selectedProject && selectedProjectEffectiveIntent !== 'project') return selectedProjectEffectiveIntent

    return resolveWorkspaceTemplateCreateActions(selectedWorkspaceTemplateId)[0]?.intent || selectedProjectEffectiveIntent || 'project'
  }, [projectIntentById, selectedProject, selectedProjectEffectiveIntent, selectedScopeDescendantProjects, selectedWorkspaceTemplateId])
  const selectedDashboardFocusMeta = useMemo(
    () => getTemplateCreationIntentMeta(selectedDashboardFocusIntent, selectedWorkspaceTemplateId),
    [selectedDashboardFocusIntent, selectedWorkspaceTemplateId],
  )
  const selectedDashboardOverviewTitle = useMemo(() => {
    if (!selectedProject) return selectedWorkspaceDisplayName || 'Workspace overview'

    const subjectLabel = selectedDashboardFocusMeta.subjectLabel
    const subjectPlural = pluralizeDashboardSubjectLabel(subjectLabel)

    if (selectedProjectEffectiveIntent !== 'project') {
      return `${selectedDashboardFocusMeta.icon} ${subjectLabel} summary`
    }

    return `${selectedDashboardFocusMeta.icon} ${subjectPlural} overview`
  }, [selectedDashboardFocusMeta, selectedProject, selectedProjectEffectiveIntent, selectedWorkspaceDisplayName])
  const selectedDashboardChildrenTitle = useMemo(() => {
    if (!selectedProject) return resolveWorkspaceCollectionHeading(selectedWorkspaceTemplateId)

    switch (selectedDashboardFocusIntent) {
      case 'proposal':
        return 'Available proposals'
      case 'lead':
        return 'Active leads'
      case 'marketing_campaign':
        return 'Active campaigns'
      case 'marketing_content_stream':
        return 'Content streams'
      case 'finance_invoice_stream':
        return 'Invoice streams'
      case 'finance_payment_cycle':
        return 'Payment cycles'
      case 'hr_requisition':
        return 'Open requisitions'
      case 'hr_onboarding_track':
        return 'Onboarding tracks'
      default:
        return pluralizeDashboardSubjectLabel(selectedDashboardFocusMeta.subjectLabel)
    }
  }, [selectedDashboardFocusIntent, selectedDashboardFocusMeta.subjectLabel, selectedProject, selectedWorkspaceTemplateId])
  const selectedProjectDashboardSummary = useMemo(() => {
    if (!selectedProject) return null
    if (selectedProjectDraftOwnerId !== selectedProject.id) return null

    const now = Date.now()
    const normalizedProjectColor = (selectedProject.color || '').trim().toLowerCase()
    const projectStatusMeaning = selectedWorkspaceProjectColorMeanings.find((item) => item.color.toLowerCase() === normalizedProjectColor) || null
    const normalizedProjectStatusLabel = normalizeWorkhubLabel(projectStatusMeaning?.label || '')
    const isSubmittedStatus = normalizedProjectStatusLabel.includes('submitted')
    const deadlineMs = resolveProjectDeadlineMs(selectedProject)
    const hasDeadline = Number.isFinite(deadlineMs)
    const deltaMs = hasDeadline ? (deadlineMs - now) : Number.NaN
    const isOverdue = hasDeadline ? deltaMs < 0 : false
    const absMs = hasDeadline ? Math.abs(deltaMs) : 0
    const dayMs = 24 * 60 * 60 * 1000
    const hourMs = 60 * 60 * 1000
    const minuteMs = 60 * 1000

    let timeLeftText = 'No submission deadline set'
    let timeLeftLabel = 'Time left'
    let countdownShort = '--'
    if (isSubmittedStatus) {
      timeLeftLabel = 'Status'
      const submittedAtMs = getUnknownTimeValue(selectedProject.updatedAt || selectedProject.createdAt)
      const elapsedMs = submittedAtMs > 0 ? Math.max(0, now - submittedAtMs) : 0
      if (submittedAtMs > 0) {
        if (elapsedMs < hourMs) {
          const minutes = Math.max(1, Math.floor(elapsedMs / minuteMs) || 1)
          timeLeftText = `Submitted ${minutes} minute${minutes === 1 ? '' : 's'} ago`
          countdownShort = `Sub ${minutes}m`
        } else if (elapsedMs < dayMs) {
          const hours = Math.max(1, Math.floor(elapsedMs / hourMs))
          timeLeftText = `Submitted ${hours} hour${hours === 1 ? '' : 's'} ago`
          countdownShort = `Sub ${hours}h`
        } else {
          const days = Math.max(1, Math.floor(elapsedMs / dayMs))
          timeLeftText = `Submitted ${days} day${days === 1 ? '' : 's'} ago`
          countdownShort = `Sub ${days}d`
        }
      } else {
        timeLeftText = 'Submitted'
        countdownShort = 'Sub'
      }
    } else if (hasDeadline) {
      if (absMs < hourMs) {
        const minutes = Math.max(1, Math.ceil(absMs / minuteMs))
        timeLeftText = isOverdue
          ? `Overdue by ${minutes} minute${minutes === 1 ? '' : 's'}`
          : `${minutes} minute${minutes === 1 ? '' : 's'} remaining`
        countdownShort = isOverdue ? `${minutes}m+` : `${minutes}m`
      } else if (absMs < dayMs) {
        const hours = Math.max(1, Math.ceil(absMs / hourMs))
        timeLeftText = isOverdue
          ? `Overdue by ${hours} hour${hours === 1 ? '' : 's'}`
          : `${hours} hour${hours === 1 ? '' : 's'} remaining`
        countdownShort = isOverdue ? `${hours}h+` : `${hours}h`
      } else {
        const days = Math.max(1, Math.ceil(absMs / dayMs))
        timeLeftText = isOverdue
          ? `Overdue by ${days} day${days === 1 ? '' : 's'}`
          : `${days} day${days === 1 ? '' : 's'} remaining`
        countdownShort = isOverdue ? `${days}d+` : `${days}d`
      }
    }

    const clientName = (selectedProject.clientId ? (allClientById[selectedProject.clientId]?.name || '') : '').trim()
    const totalAmount = resolveProjectMonetaryAmount(selectedProject)
    const totalCurrency = resolveProjectMonetaryCurrency(selectedProject)
    const deadlineLabel = selectedProject.projectType === 'tender' ? 'Submission deadline' : 'Final deadline'
    const submissionTimeLabel = selectedProject.projectType === 'tender'
      ? (selectedProject.submissionTime || DEFAULT_SUBMISSION_TIME)
      : (selectedProject.submissionTime || '')
    const urgencyPercent = hasDeadline
      ? (isSubmittedStatus
        ? 0
        : isOverdue
        ? 100
        : Math.max(8, Math.round(((14 - Math.min(Math.max(0, Math.ceil((deadlineMs - now) / dayMs)), 14)) / 14) * 100)))
      : 0

    return {
      clientName,
      tenderNumber: (selectedProject.tenderNumber || '').trim(),
      proposalId: (selectedProject.proposalId || '').trim(),
      deadlineLabel,
      deadlineDate: formatProjectDeadlineDate(selectedProject.projectDeadline || ''),
      submissionTimeLabel,
      timeLeftLabel,
      timeLeftText,
      countdownShort,
      hasDeadline,
      isOverdue: isSubmittedStatus ? false : isOverdue,
      urgencyPercent,
      totalAmount,
      totalCurrency,
      brief: (selectedProject.description || '').trim(),
    }
  }, [allClientById, selectedProject, selectedProjectDraftOwnerId, selectedWorkspaceProjectColorMeanings])
  function renderDashboardProjectCard(project: WorkhubProject, depth = 0): JSX.Element {
    const intentMeta = projectIntentMetaById[project.id] || getTemplateCreationIntentMeta(resolveEffectiveProjectIntent(project, workspaceByIdForFiltering, selectedWorkspaceTemplateIntentSet), selectedWorkspaceTemplateId)
    const progress = workspaceTaskProgressByProjectId[project.id] || { done: 0, total: 0 }
    const completionPercent = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0
    const normalizedCompletion = Math.max(0, Math.min(100, completionPercent))
    const isCompleted = progress.total > 0 && normalizedCompletion >= 100
    const completionLabel = progress.total > 0 ? `${normalizedCompletion}%` : '--'
    const isProposalTemplate = selectedWorkspaceTemplateId === 'proposals_leads'
    const deadlineMs = isProposalTemplate ? resolveProjectDeadlineMs(project) : Number.NaN
    const hasDeadline = Number.isFinite(deadlineMs)
    const deadlineDate = formatProjectDeadlineDate(project.projectDeadline || '')
    const deltaMs = hasDeadline ? (deadlineMs - Date.now()) : Number.NaN
    const absMs = hasDeadline ? Math.abs(deltaMs) : 0
    const isOverdue = hasDeadline ? deltaMs < 0 : false
    const nearDeadlineMs = 72 * 60 * 60 * 1000
    const isNearDeadline = hasDeadline && !isOverdue && absMs <= nearDeadlineMs
    const totalHours = hasDeadline ? Math.max(0, Math.floor(absMs / (1000 * 60 * 60))) : 0
    const monthHours = 24 * 30
    const months = Math.floor(totalHours / monthHours)
    const afterMonthsHours = totalHours - (months * monthHours)
    const days = Math.floor(afterMonthsHours / 24)
    const hours = afterMonthsHours % 24
    const monthPart = months > 0 ? `${months}mo` : ''
    const dayPart = days > 0 ? `${days}d` : ''
    const hourPart = `${hours}h`
    const deadlineText = !hasDeadline
      ? 'No deadline'
      : [monthPart, dayPart, hourPart].filter(Boolean).join(' ').trim() || '0h'
    const normalizedProjectColor = (project.color || '').trim().toLowerCase()
    const projectStatusMeaning = selectedWorkspaceProjectColorMeanings.find((item) => item.color.toLowerCase() === normalizedProjectColor) || null
    const normalizedProjectStatusLabel = normalizeWorkhubLabel(projectStatusMeaning?.label || '')
    const isSubmittedProposalCard = isProposalTemplate && (
      normalizedProjectStatusLabel.includes('submitted')
      || (!!selectedProject && isSubmittedProposalFolderName(selectedProject.name))
    )
    const proposalValueAmount = resolveProjectMonetaryAmount(project)
    const proposalValueCurrency = resolveProjectMonetaryCurrency(project)
    const submissionTimeValue = (project.submissionTime || '').trim()
    const submissionTimeLabel = submissionTimeValue
      ? new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(new Date(`2000-01-01T${submissionTimeValue}`))
      : ''

    return (
      <article
        key={project.id}
        className={`workhub-project-card compact-card is-clickable is-category-card${isProposalTemplate ? ' is-proposal-card' : ''} depth-${Math.min(depth, 4)}`}
        style={{ ['--workhub-category-accent' as string]: project.color }}
        role="button"
        tabIndex={0}
        onClick={() => handleSelectProject(project.id)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            handleSelectProject(project.id)
          }
        }}
      >
        <div className="workhub-project-card-minimal-layout">
          <div className="workhub-project-title-row">
            <span className="workhub-project-category-icon" aria-hidden="true">{intentMeta.icon || '📁'}</span>
            <strong>{project.name}</strong>
          </div>
          {isProposalTemplate && hasDeadline && (
            <>
              <strong className={`workhub-project-card-days-left workhub-ltr-token${isOverdue ? ' is-overdue' : ''}${isNearDeadline ? ' is-near' : ''}`}>{deadlineText}</strong>
              {deadlineDate && <span className="workhub-project-card-date workhub-ltr-token">{deadlineDate}{submissionTimeLabel ? ` | ${submissionTimeLabel}` : ''}</span>}
            </>
          )}
          {isSubmittedProposalCard ? (
            <div className="workhub-project-card-value-row">
              <span className="workhub-project-card-value-label">Proposal value</span>
              <strong className="workhub-project-card-value-text workhub-ltr-token">{formatMonetaryAmount(proposalValueAmount, proposalValueCurrency)}</strong>
            </div>
          ) : (
            <div className="workhub-project-card-progress-row">
              <div className="workhub-project-card-progress-track">
                <div
                  className={`workhub-project-card-progress-fill${isCompleted ? ' is-complete' : ''}`}
                  style={{ width: progress.total > 0 ? `${normalizedCompletion}%` : '0%' }}
                />
              </div>
              <span className={`workhub-project-card-progress-pct${isCompleted ? ' is-complete' : ''}`}>{completionLabel}</span>
            </div>
          )}
        </div>
      </article>
    )
  }
  const selectedScopeMonetaryTotalsByCurrency = useMemo(() => {
    const totals: Record<string, number> = {}
    selectedScopeProjects.forEach((project) => {
      const amount = resolveProjectMonetaryAmount(project)
      const currency = resolveProjectMonetaryCurrency(project)
      addMonetaryTotal(totals, currency, amount)
    })
    return totals
  }, [selectedScopeProjects])
  const selectedScopeMonetaryTotalText = useMemo(
    () => formatMonetaryTotalsByCurrency(selectedScopeMonetaryTotalsByCurrency),
    [selectedScopeMonetaryTotalsByCurrency],
  )
  const selectedScopeMoneyIntentTotals = useMemo(() => {
    const totals = {
      leads: {} as Record<string, number>,
      proposals: {} as Record<string, number>,
      finance: {} as Record<string, number>,
      marketing: {} as Record<string, number>,
    }
    selectedScopeDescendantProjects.forEach((project) => {
      const effectiveIntent = resolveEffectiveProjectIntent(project, workspaceByIdForFiltering, selectedWorkspaceTemplateIntentSet)
      const amount = resolveProjectMonetaryAmount(project)
      if (amount <= 0) return
      const currency = resolveProjectMonetaryCurrency(project)
      if (effectiveIntent === 'lead') {
        addMonetaryTotal(totals.leads, currency, amount)
        return
      }
      if (effectiveIntent === 'proposal') {
        addMonetaryTotal(totals.proposals, currency, amount)
        return
      }
      if (effectiveIntent === 'finance_invoice_stream' || effectiveIntent === 'finance_payment_cycle') {
        addMonetaryTotal(totals.finance, currency, amount)
        return
      }
      if (effectiveIntent === 'marketing_campaign' || effectiveIntent === 'marketing_content_stream') {
        addMonetaryTotal(totals.marketing, currency, amount)
      }
    })
    return totals
  }, [selectedScopeDescendantProjects, selectedWorkspaceTemplateIntentSet, workspaceByIdForFiltering])
  const selectedScopeLeadValueText = useMemo(
    () => formatMonetaryTotalsByCurrency(selectedScopeMoneyIntentTotals.leads),
    [selectedScopeMoneyIntentTotals.leads],
  )
  const selectedScopeProposalValueText = useMemo(
    () => formatMonetaryTotalsByCurrency(selectedScopeMoneyIntentTotals.proposals),
    [selectedScopeMoneyIntentTotals.proposals],
  )
  const selectedScopeFinanceValueText = useMemo(
    () => formatMonetaryTotalsByCurrency(selectedScopeMoneyIntentTotals.finance),
    [selectedScopeMoneyIntentTotals.finance],
  )
  const selectedScopeMarketingValueText = useMemo(
    () => formatMonetaryTotalsByCurrency(selectedScopeMoneyIntentTotals.marketing),
    [selectedScopeMoneyIntentTotals.marketing],
  )
  const memberByUid = useMemo(() => Object.fromEntries(members.map((item) => [item.uid, item])) as Record<string, WorkhubMember>, [members])
  const memberWorkspaceSummaryByUid = useMemo(() => {
    const result: Record<string, { count: number; names: string[] }> = {}
    members.forEach((item) => {
      const names = workspaces
        .filter((workspace) => canAccessWorkspace(workspace, item.uid, item.email || '', false))
        .map((workspace) => workspace.name)
      result[item.uid] = { count: names.length, names }
    })
    return result
  }, [members, workspaces])
  const userManagementMembers = useMemo(() => {
    if (userWorkspaceFilter === 'all') return members
    const selectedFilterWorkspace = visibleWorkspaces.find((item) => item.id === userWorkspaceFilter)
    if (!selectedFilterWorkspace) return members
    const scopedUids = new Set(normalizeMemberUids(selectedFilterWorkspace.accessMemberUids || []))
    return members.filter((item) => item.status === 'pending' || scopedUids.has(item.uid))
  }, [members, userWorkspaceFilter, visibleWorkspaces])
  const userManagementPendingMembers = useMemo(
    () => userManagementMembers.filter((item) => item.status === 'pending'),
    [userManagementMembers],
  )
  const userManagementApprovedMembers = useMemo(
    () => userManagementMembers.filter((item) => item.status === 'approved'),
    [userManagementMembers],
  )
  const userAccessModeByUid = useMemo(() => {
    const result: Record<string, 'full' | 'workspace_based'> = {}
    const relevantWorkspaces = workspaces
    members.forEach((item) => {
      if (!relevantWorkspaces.length) {
        result[item.uid] = 'workspace_based'
        return
      }
      const hasAllWorkspaceAccess = relevantWorkspaces.every((workspace) => normalizeMemberUids(workspace.accessMemberUids || []).includes(item.uid))
      const hasFullLevelEverywhere = relevantWorkspaces.every((workspace) => (workspace.memberAccessLevels?.[item.uid] || 'custom') === 'full')
      result[item.uid] = hasAllWorkspaceAccess && hasFullLevelEverywhere ? 'full' : 'workspace_based'
    })
    return result
  }, [members, workspaces])
  const fullAccessMemberUids = useMemo(
    () => Object.entries(userAccessModeByUid).filter(([, mode]) => mode === 'full').map(([uid]) => uid),
    [userAccessModeByUid],
  )
  const userAccessSourceByUid = useMemo(() => {
    const result: Record<string, WorkhubUserAccessDraft> = {}
    members.forEach((item) => {
      const workspaceById: Record<string, WorkhubUserWorkspaceDraft> = {}
      workspaces.forEach((workspace) => {
        const hasWorkspaceAccess = normalizeMemberUids(workspace.accessMemberUids || []).includes(item.uid)
        workspaceById[workspace.id] = {
          enabled: hasWorkspaceAccess,
          level: (workspace.memberAccessLevels?.[item.uid] || 'custom') as 'full' | 'custom',
        }
      })
      result[item.uid] = {
        mode: userAccessModeByUid[item.uid] || 'workspace_based',
        workspaceById,
      }
    })
    return result
  }, [members, userAccessModeByUid, workspaces])
  const userAccessEffectiveByUid = useMemo(() => {
    const result: Record<string, WorkhubUserAccessDraft> = {}
    members.forEach((item) => {
      const source = userAccessSourceByUid[item.uid] || { mode: 'workspace_based' as WorkhubUserAccessMode, workspaceById: {} }
      const draft = userAccessDraftByUid[item.uid]
      result[item.uid] = draft || source
    })
    return result
  }, [members, userAccessDraftByUid, userAccessSourceByUid])
  const userAccessDraftDirtyByUid = useMemo(() => {
    const result: Record<string, boolean> = {}
    members.forEach((item) => {
      const source = userAccessSourceByUid[item.uid]
      const draft = userAccessDraftByUid[item.uid]
      if (!source || !draft) {
        result[item.uid] = false
        return
      }
      if (draft.mode !== source.mode) {
        result[item.uid] = true
        return
      }
      const workspaceIds = new Set([...Object.keys(source.workspaceById), ...Object.keys(draft.workspaceById)])
      result[item.uid] = Array.from(workspaceIds).some((workspaceId) => {
        const sourceEntry = source.workspaceById[workspaceId] || { enabled: false, level: 'custom' as const }
        const draftEntry = draft.workspaceById[workspaceId] || { enabled: false, level: 'custom' as const }
        return sourceEntry.enabled !== draftEntry.enabled || sourceEntry.level !== draftEntry.level
      })
    })
    return result
  }, [members, userAccessDraftByUid, userAccessSourceByUid])
  const {
    handleWorkspaceAccessToggle,
    handleToggleUserWorkspace,
    handleSetUserAccessModeDraft,
    handleToggleUserWorkspaceDraft,
    handleSetUserWorkspaceLevelDraft,
    handleDiscardUserAccessDraft,
    handleSaveUserAccessDraft,
    handleWorkspaceInviteAdd,
    handleWorkspaceInviteRemove,
    handleApproveRequestGlobal,
    handleRejectRequestGlobal,
    handleApproveRequestForWorkspace,
    handleRejectRequestForWorkspace,
    handleMemberAccessLevelChange,
  } = useWorkhubAccessHandlers({
    selectedWorkspaceSettings,
    workspaceAccessMemberUids,
    setWorkspaceAccessMemberUids,
    workspaceInviteEmails,
    setWorkspaceInviteEmails,
    workspaceInviteEmailDraft,
    setWorkspaceInviteEmailDraft,
    workspaceMemberAccessLevels,
    setWorkspaceMemberAccessLevels,
    workspaces,
    userAccessSourceByUid,
    userAccessDraftByUid,
    setUserAccessDraftByUid,
    userAccessDraftDirtyByUid,
    currentUserUid: currentUid,
    setBusyKey,
    showToast,
  })
  const {
    getChecklistDetailKey,
    toggleChecklistItemDetails,
    handleChecklistItemToggle,
    handleChecklistRemove,
    handleChecklistAdd,
    handleChecklistItemEditStart,
    handleChecklistItemEditSave,
    handleChecklistItemDetailsSave,
    handleChecklistAttachmentAdd,
    handleChecklistAttachmentRemove,
    handleTaskAttachmentFileUpload,
    handleChecklistAttachmentFileUpload,
    handleChecklistLinkAdd,
    handleChecklistLinkRemove,
    handleTaskAttachmentAdd,
    handleTaskAttachmentRemove,
    confirmAttachmentRemoval,
    handleSelectedTaskDescriptionSave,
    handleSelectedTaskTitleSave,
    handleTaskLinkEditStart,
    handleTaskLinkEditCancel,
    handleTaskLinkAdd,
    handleTaskLinkRemove,
    handleChecklistItemEditCancel,
  } = useWorkhubTaskDetailHandlers({
    visibleWorkspaceProjects,
    taskChecklistDrafts,
    setTaskChecklistDrafts,
    taskAttachmentDrafts,
    setTaskAttachmentDrafts,
    taskAttachmentTitleDrafts,
    setTaskAttachmentTitleDrafts,
    taskLinkDrafts,
    setTaskLinkDrafts,
    taskLinkTitleDrafts,
    setTaskLinkTitleDrafts,
    taskLinkEditingDrafts,
    setTaskLinkEditingDrafts,
    checklistDetailsDrafts,
    checklistAttachmentDrafts,
    setChecklistAttachmentDrafts,
    checklistLinkDrafts,
    setChecklistLinkDrafts,
    setExpandedChecklistDetailKeys,
    editingChecklistItemText,
    setEditingChecklistTaskId,
    setEditingChecklistItemId,
    setEditingChecklistScope,
    setEditingChecklistItemText,
    selectedTaskDescriptionDraft,
    selectedTaskTitleDraft,
    setSelectedTaskTitleDraft,
    setUploadingTaskAttachmentId,
    setUploadingChecklistAttachmentKey,
    attachmentDeletePrompt,
    setAttachmentDeletePrompt,
    currentUserUid: currentUid,
    handleTaskUpdate,
    showToast,
  })

  const handleSelectedTaskValueSave = useCallback((task: WorkhubTask) => {
    const rawAmount = selectedTaskValueAmountDraft.trim()
    const nextAmount = rawAmount === '' ? null : parseMonetaryAmountInput(rawAmount)
    const nextCurrency = normalizeMoneyCurrency(selectedTaskValueCurrencyDraft) || 'OMR'
    const currentAmount = task.valueAmount ?? null
    const currentCurrency = task.valueCurrency || 'OMR'
    if (nextAmount === currentAmount && nextCurrency === currentCurrency) return
    const patch: Partial<WorkhubTask> = {}
    if (nextAmount !== null && Number.isFinite(nextAmount)) {
      patch.valueAmount = nextAmount
      patch.valueCurrency = nextCurrency
    } else {
      patch.valueAmount = 0
      patch.valueCurrency = nextCurrency
    }
    void _cbRef.current.handleTaskUpdate(task, patch, { silent: true })
  }, [selectedTaskValueAmountDraft, selectedTaskValueCurrencyDraft])

  const taskCounts = useMemo(() => ({
    total: visibleTasks.length,
    done: visibleTasks.filter((item) => /done|complete/i.test(item.status)).length,
    inProgress: visibleTasks.filter((item) => item.status === 'in_progress').length,
    urgent: visibleTasks.filter((item) => item.priority === 'urgent').length,
  }), [visibleTasks])
  const unreadNotificationCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications],
  )
  const taskById = useMemo(
    () => Object.fromEntries(tasks.map((item) => [item.id, item])) as Record<string, WorkhubTask>,
    [tasks],
  )
  const unreadCommentCountByTaskId = useMemo(() => {
    const counts: Record<string, number> = {}
    const unreadCommentNotifications = notifications.filter((item) => !item.read && item.entityType === 'comment' && !!item.entityId)
    if (unreadCommentNotifications.length === 0) return counts
    unreadCommentNotifications.forEach((item) => {
      const targetTask = taskById[item.entityId]
      if (!targetTask || targetTask.workspaceId !== selectedWorkspaceId) return
      counts[targetTask.id] = (counts[targetTask.id] || 0) + 1
    })
    return counts
  }, [notifications, selectedWorkspaceId, taskById])
  const unreadCommentCountByProjectId = useMemo(() => {
    const counts: Record<string, number> = {}
    if (Object.keys(unreadCommentCountByTaskId).length === 0) return counts
    Object.entries(unreadCommentCountByTaskId).forEach(([taskId, unreadCount]) => {
      const task = taskById[taskId]
      if (!task?.projectId || unreadCount <= 0) return
      let pointerId = task.projectId
      const visited = new Set<string>()
      while (pointerId && !visited.has(pointerId)) {
        visited.add(pointerId)
        counts[pointerId] = (counts[pointerId] || 0) + unreadCount
        pointerId = workspaceProjectById[pointerId]?.parentProjectId || ''
      }
    })
    return counts
  }, [taskById, unreadCommentCountByTaskId, workspaceProjectById])
  const overviewStatusBuckets = useMemo(() => {
    const statusCounts = new Map<string, number>()
    visibleTasks.forEach((task) => {
      statusCounts.set(task.status, (statusCounts.get(task.status) || 0) + 1)
    })
    return workspaceTaskStatuses.map((status) => ({
      id: status.id,
      label: status.label,
      color: status.color,
      count: statusCounts.get(status.id) || 0,
    }))
  }, [visibleTasks, workspaceTaskStatuses])

  useEffect(() => {
    if (!selectedTaskId) return
    const unreadTaskCommentNotifications = notifications.filter(
      (item) => !item.read && item.entityType === 'comment' && item.entityId === selectedTaskId,
    )
    if (unreadTaskCommentNotifications.length === 0) return
    void Promise.all(unreadTaskCommentNotifications.map((item) => markWorkhubNotificationRead(item.id).catch(() => undefined)))
  }, [notifications, selectedTaskId])
  const overviewPriorityBuckets = useMemo(() => {
    const priorities: Array<{ id: WorkhubTaskPriority; label: string; count: number; color: string }> = [
      { id: 'urgent', label: 'Urgent', count: 0, color: '#ef4444' },
      { id: 'high', label: 'High', count: 0, color: '#f59e0b' },
      { id: 'medium', label: 'Medium', count: 0, color: '#3b82f6' },
      { id: 'low', label: 'Low', count: 0, color: '#10b981' },
    ]
    const byId = new Map(priorities.map((item) => [item.id, item]))
    visibleTasks.forEach((task) => {
      const bucket = byId.get(task.priority)
      if (bucket) bucket.count += 1
    })
    return priorities
  }, [visibleTasks])
  const overviewCompletedCount = useMemo(() => {
    const completedStatusIds = new Set(
      workspaceTaskStatuses
        .filter((item) => /done|complete/i.test(item.id) || /done|complete/i.test(item.label))
        .map((item) => item.id),
    )
    if (completedStatusIds.size === 0) {
      completedStatusIds.add('done')
      completedStatusIds.add('completed')
    }
    return visibleTasks.filter((item) => completedStatusIds.has(item.status)).length
  }, [visibleTasks, workspaceTaskStatuses])
  const overviewCompletionRate = useMemo(
    () => (taskCounts.total > 0 ? Math.round((overviewCompletedCount / taskCounts.total) * 100) : 0),
    [overviewCompletedCount, taskCounts.total],
  )
  const tasksByAssignee = useMemo(() => {
    return scopeAssignableMembers
      .map((person) => {
        const personTasks = visibleTasks.filter((task) => task.assigneeUid === person.uid)
        return {
          uid: person.uid,
          name: person.displayName || person.email,
          total: personTasks.length,
          inProgress: personTasks.filter((task) => task.status === 'in_progress').length,
          done: personTasks.filter((task) => /done|complete/i.test(task.status)).length,
        }
      })
      .filter((item) => item.total > 0)
      .sort((a, b) => b.total - a.total)
  }, [scopeAssignableMembers, visibleTasks])
  const restrictedProjectsCount = useMemo(() => workspaceProjects.filter((item) => item.visibility === 'restricted').length, [workspaceProjects])
  const visibleActivity = useMemo(
    () => (isPrivilegedMember
      ? activity
      : activity.filter((item) => item.visibility !== 'restricted' || (item.memberUids || []).includes(currentUid))),
    [activity, currentUid, isPrivilegedMember],
  )
  const overviewRecentTimeline = useMemo(
    () => visibleActivity.slice(0, 8).map((item) => ({
      id: item.id,
      actor: memberNameByUid[item.actorUid] || item.actorUid,
      message: item.message,
      createdAt: formatTime(item.createdAt),
      action: item.action,
    })),
    [memberNameByUid, visibleActivity],
  )
  const teamActivityHeatmap = useMemo(() => {
    const windowDays: 7 | 14 | 30 = (selectedWorkspace?.activityWindowDays ?? 30) as 7 | 14 | 30
    const MS_PER_DAY = 86_400_000
    const now = Date.now()
    const days: string[] = []
    for (let i = windowDays - 1; i >= 0; i--) {
      const d = new Date(now - i * MS_PER_DAY)
      days.push(d.toISOString().slice(0, 10))
    }
    const daySet = new Set(days)
    function tsToDateKey(createdAt: unknown): string {
      if (!createdAt || typeof createdAt !== 'object') return ''
      if ('toMillis' in createdAt && typeof (createdAt as { toMillis?: unknown }).toMillis === 'function') {
        return new Date((createdAt as { toMillis: () => number }).toMillis()).toISOString().slice(0, 10)
      }
      if ('seconds' in createdAt) {
        return new Date(Number((createdAt as { seconds?: unknown }).seconds || 0) * 1000).toISOString().slice(0, 10)
      }
      return ''
    }
    const countByActorDay = new Map<string, Map<string, number>>()
    for (const item of visibleActivity) {
      const key = tsToDateKey(item.createdAt)
      if (!key || !daySet.has(key)) continue
      if (!countByActorDay.has(item.actorUid)) countByActorDay.set(item.actorUid, new Map())
      const byDay = countByActorDay.get(item.actorUid)!
      byDay.set(key, (byDay.get(key) ?? 0) + 1)
    }
    const rows = workspaceAssignableMembers
      .map((member) => {
        const byDay = countByActorDay.get(member.uid) ?? new Map<string, number>()
        const totalInWindow = Array.from(byDay.values()).reduce((s, v) => s + v, 0)
        return {
          uid: member.uid,
          name: memberNameByUid[member.uid] || member.uid,
          initials: getInitials(memberNameByUid[member.uid] || member.uid),
          totalInWindow,
          dayCounts: days.map((d) => byDay.get(d) ?? 0),
        }
      })
      .sort((a, b) => b.totalInWindow - a.totalInWindow)
    return { days, rows, windowDays }
  }, [visibleActivity, workspaceAssignableMembers, memberNameByUid, selectedWorkspace?.activityWindowDays])
  const displayedTeamActivityDays = useMemo(() => [...teamActivityHeatmap.days].reverse(), [teamActivityHeatmap.days])
  const overviewPriorityProjects = useMemo(() => {
    const now = Date.now()
    const oneDayMs = 24 * 60 * 60 * 1000
    const timelineHorizonDays = 14
    return visibleWorkspaceProjects
      .map((project) => {
        const deadlineMs = resolveProjectDeadlineMs(project)
        const daysRemaining = Number.isFinite(deadlineMs)
          ? Math.floor((deadlineMs - now) / oneDayMs)
          : Number.POSITIVE_INFINITY
        const priority = project.priority || 'medium'
        const priorityRank = PROJECT_PRIORITY_RANK[priority]
        const isOverdue = daysRemaining < 0
        const urgencyPercent = isOverdue
          ? 100
          : Math.round(((timelineHorizonDays - Math.min(daysRemaining, timelineHorizonDays)) / timelineHorizonDays) * 100)
        const countdownText = isOverdue
          ? `Overdue by ${Math.abs(daysRemaining)} day${Math.abs(daysRemaining) === 1 ? '' : 's'}`
          : daysRemaining === 0
            ? 'Due today'
            : `${daysRemaining} day${daysRemaining === 1 ? '' : 's'} remaining`
        return {
          project,
          deadlineMs,
          daysRemaining,
          priority,
          priorityRank,
          isOverdue,
          urgencyPercent,
          countdownText,
          isHighPriority: priorityRank >= PROJECT_PRIORITY_RANK.high,
          isNearTwoDays: daysRemaining >= 0 && daysRemaining <= 2,
        }
      })
      .filter((item) => Number.isFinite(item.deadlineMs))
      .filter((item) => item.isHighPriority || item.daysRemaining <= 7)
      .sort((a, b) => {
        if (a.isNearTwoDays !== b.isNearTwoDays) return a.isNearTwoDays ? -1 : 1
        if (a.daysRemaining !== b.daysRemaining) return a.daysRemaining - b.daysRemaining
        return b.priorityRank - a.priorityRank
      })
      .slice(0, 8)
      .map((item) => ({
        id: item.project.id,
        name: item.project.name,
        type: item.project.projectType || 'other',
        priority: item.priority,
        deadlineDate: formatProjectDeadlineDate(item.project.projectDeadline || ''),
        submissionTime: item.project.projectType === 'tender' ? (item.project.submissionTime || DEFAULT_SUBMISSION_TIME) : '',
        daysRemaining: item.daysRemaining,
        countdownShort: item.isOverdue ? `${Math.abs(item.daysRemaining)}d+` : `${item.daysRemaining}d`,
        countdownText: item.countdownText,
        urgencyPercent: Math.max(8, item.urgencyPercent),
        isOverdue: item.isOverdue,
        isNearTwoDays: item.isNearTwoDays,
          clientName: allClientById[item.project.clientId || '']?.name || '',
      }))
        }, [allClientById, visibleWorkspaceProjects])
  const homeWidgetTaskStatusCounts = useMemo(
    () => visibleTasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1
      return acc
    }, {} as Record<string, number>),
    [visibleTasks],
  )
  const homeWidgetTaskStatusLabels = useMemo(
    () => Object.fromEntries(workspaceTaskStatuses.map((status) => [status.id, status.label])) as Record<string, string>,
    [workspaceTaskStatuses],
  )
  const workspaceClientCount = useMemo(() => {
    if (!scopedWorkspaceIds.length) return 0
    const scopedIds = new Set(scopedWorkspaceIds)
    return clients.filter((item) => scopedIds.has(item.workspaceId)).length
  }, [clients, scopedWorkspaceIds])
  const displayedOverviewPriorityProjects = useMemo(
    () => overviewPriorityProjects.slice(0, 6),
    [overviewPriorityProjects],
  )
  const overduePriorityProjectsCount = useMemo(
    () => overviewPriorityProjects.filter((item) => item.isOverdue).length,
    [overviewPriorityProjects],
  )
  const nearTermPriorityProjectsCount = useMemo(
    () => overviewPriorityProjects.filter((item) => !item.isOverdue && item.daysRemaining <= 2).length,
    [overviewPriorityProjects],
  )
  const homeTemplateWidgets = useMemo(
    () => buildWorkhubHomeWidgets(selectedWorkspaceTemplateId, {
      totalTasks: taskCounts.total,
      activeTasks: Math.max(taskCounts.total - overviewCompletedCount, 0),
      inProgressTasks: taskCounts.inProgress,
      urgentTasks: taskCounts.urgent,
      completionRate: overviewCompletionRate,
      projectsCount: visibleWorkspaceProjects.length,
      restrictedProjectsCount,
      assignedMembersCount: tasksByAssignee.length,
      workspaceClientCount,
      unreadNotifications: unreadNotificationCount,
      pendingMembersCount: pendingMembers.length,
      upcomingDeadlineProjectsCount: overviewPriorityProjects.length,
      nearTermDeadlineProjectsCount: nearTermPriorityProjectsCount,
      overdueProjectsCount: overduePriorityProjectsCount,
      recentActivityCount: overviewRecentTimeline.length,
      taskStatusCounts: homeWidgetTaskStatusCounts,
      taskStatusLabels: homeWidgetTaskStatusLabels,
    }),
    [
      homeWidgetTaskStatusCounts,
      homeWidgetTaskStatusLabels,
      nearTermPriorityProjectsCount,
      overviewCompletedCount,
      overviewCompletionRate,
      overviewPriorityProjects.length,
      overviewRecentTimeline.length,
      overduePriorityProjectsCount,
      pendingMembers.length,
      restrictedProjectsCount,
      selectedWorkspaceTemplateId,
      taskCounts.inProgress,
      taskCounts.total,
      taskCounts.urgent,
      tasksByAssignee.length,
      unreadNotificationCount,
      visibleWorkspaceProjects.length,
      workspaceClientCount,
    ],
  )
  const workspaceDocuments = useMemo(
    () => {
      const items = documents.filter((item) => item.workspaceId === selectedWorkspaceId)
      if (!pendingNotificationDocument || pendingNotificationDocument.workspaceId !== selectedWorkspaceId) {
        return items
      }
      if (items.some((item) => item.id === pendingNotificationDocument.id)) {
        return items
      }
      return [...items, pendingNotificationDocument].sort(
        (left, right) => getUnknownTimeValue(right.updatedAt || right.createdAt) - getUnknownTimeValue(left.updatedAt || left.createdAt),
      )
    },
    [documents, pendingNotificationDocument, selectedWorkspaceId],
  )
  const workspaceLevelDocuments = useMemo(() => {
    return [...workspaceDocuments]
      .filter((item) => !item.projectId)
      .sort((left, right) => getUnknownTimeValue(right.updatedAt || right.createdAt) - getUnknownTimeValue(left.updatedAt || left.createdAt))
  }, [workspaceDocuments])
  const workspaceDocumentsByProjectId = useMemo(() => {
    const grouped: Record<string, WorkhubDocument[]> = {}
    workspaceDocuments.forEach((item) => {
      if (!item.projectId) return
      if (!visibleProjectIds.has(item.projectId)) return
      if (!grouped[item.projectId]) grouped[item.projectId] = []
      grouped[item.projectId].push(item)
    })
    Object.values(grouped).forEach((items) => {
      items.sort((left, right) => getUnknownTimeValue(right.updatedAt || right.createdAt) - getUnknownTimeValue(left.updatedAt || left.createdAt))
    })
    return grouped
  }, [visibleProjectIds, workspaceDocuments])
  const workspaceMoodBoardsByProjectId = useMemo(() => {
    const grouped: Record<string, WorkhubMoodBoard[]> = {}
    workspaceMoodBoards.forEach((item) => {
      if (!item.entityId || !visibleProjectIds.has(item.entityId)) return
      if (!grouped[item.entityId]) grouped[item.entityId] = []
      grouped[item.entityId].push(item)
    })
    Object.values(grouped).forEach((items) => {
      items.sort((left, right) => getUnknownTimeValue(right.updatedAt || right.createdAt) - getUnknownTimeValue(left.updatedAt || left.createdAt))
    })
    return grouped
  }, [visibleProjectIds, workspaceMoodBoards])
  const workspaceLevelMoodBoards = useMemo(() => {
    return [...workspaceMoodBoards]
      .filter((item) => !item.entityId || !visibleProjectIds.has(item.entityId))
      .sort((left, right) => getUnknownTimeValue(right.updatedAt || right.createdAt) - getUnknownTimeValue(left.updatedAt || left.createdAt))
  }, [visibleProjectIds, workspaceMoodBoards])
  const selectedProjectDashboardMedia = useMemo(() => {
    if (!selectedProject) return [] as Array<{ id: string; url: string; label: string; source: string }>

    const result: Array<{ id: string; url: string; label: string; source: string }> = []
    const seenUrls = new Set<string>()
    const append = (url: string, id: string, label: string, source: string) => {
      const normalized = (url || '').trim()
      if (!normalized || !isImageAttachmentUrl(normalized) || seenUrls.has(normalized)) return
      seenUrls.add(normalized)
      result.push({ id, url: normalized, label, source })
    }

    ;(selectedProject.attachments || []).forEach((url, idx) => {
      append(
        url,
        `project-attachment:${idx}`,
        selectedProject.attachmentTitles?.[url] || deriveAttachmentTitle(url),
        'Project attachment',
      )
    })

    const scopedDocs = workspaceDocuments.filter((doc) => !!doc.projectId && selectedProjectBranchIds.has(doc.projectId))
    scopedDocs.forEach((doc) => {
      ;(doc.attachments || []).forEach((url, idx) => {
        append(
          url,
          `doc:${doc.id}:${idx}`,
          doc.title || 'Untitled document',
          doc.type === 'note' ? 'Note' : 'Document',
        )
      })
    })

    const scopedBoards = workspaceMoodBoards.filter((board) => !!board.entityId && selectedProjectBranchIds.has(board.entityId))
    scopedBoards.forEach((board) => {
      board.images.slice(0, 3).forEach((image, idx) => {
        append(
          image.url,
          `mood:${board.id}:${idx}`,
          board.title || 'Mood board',
          'Mood board',
        )
      })
    })

    return result.slice(0, 8)
  }, [selectedProject, selectedProjectBranchIds, workspaceDocuments, workspaceMoodBoards])
  const selectedProjectDashboardRelatedCounts = useMemo(() => {
    if (!selectedProject) return { docs: 0, notes: 0, moodBoards: 0 }
    const scopedDocs = workspaceDocuments.filter((doc) => !!doc.projectId && selectedProjectBranchIds.has(doc.projectId))
    const docs = scopedDocs.filter((item) => item.type !== 'note').length
    const notes = scopedDocs.filter((item) => item.type === 'note').length
    const moodBoards = workspaceMoodBoards.filter((board) => !!board.entityId && selectedProjectBranchIds.has(board.entityId)).length
    return { docs, notes, moodBoards }
  }, [selectedProject, selectedProjectBranchIds, workspaceDocuments, workspaceMoodBoards])
  const selectedProjectDashboardDocuments = useMemo(() => {
    if (!selectedProject) {
      return [] as Array<{ id: string; title: string; type: 'document' | 'note'; projectName: string }>
    }
    return workspaceDocuments
      .filter((doc) => !!doc.projectId && selectedProjectBranchIds.has(doc.projectId))
      .sort((a, b) => getUnknownTimeValue(b.updatedAt || b.createdAt) - getUnknownTimeValue(a.updatedAt || a.createdAt))
      .slice(0, 6)
      .map((doc) => ({
        id: doc.id,
        title: (doc.title || '').trim() || (doc.type === 'note' ? 'Untitled note' : 'Untitled document'),
        type: doc.type === 'note' ? 'note' : 'document',
        projectName: projectNameById[doc.projectId || ''] || '',
      }))
  }, [projectNameById, selectedProject, selectedProjectBranchIds, workspaceDocuments])
  const workspaceDocumentById = useMemo(
    () => Object.fromEntries(workspaceDocuments.map((item) => [item.id, item])) as Record<string, WorkhubDocument>,
    [workspaceDocuments],
  )
  const scopedWorkspaceDocuments = useMemo(() => {
    const filtered = workspaceDocuments.filter((item) => {
      if (selectedProjectId === 'all') return true
      if (!item.projectId) return true
      // Always include the pending notification document regardless of project scope
      if (pendingNotificationDocument?.id === item.id) return true
      return selectedProjectBranchIds.has(item.projectId)
    })
    return [...filtered].sort((left, right) => {
      const rightValue = getUnknownTimeValue(right.updatedAt || right.createdAt)
      const leftValue = getUnknownTimeValue(left.updatedAt || left.createdAt)
      return rightValue - leftValue
    })
  }, [pendingNotificationDocument, selectedProjectBranchIds, selectedProjectId, workspaceDocuments])
  const selectedDocument = useMemo(
    () => {
      const fromScoped = scopedWorkspaceDocuments.find((item) => item.id === selectedDocumentId)
      if (fromScoped) return fromScoped
      if (pendingNotificationDocument?.id === selectedDocumentId) return pendingNotificationDocument
      if (selectedDocumentId && workspaceDocumentById[selectedDocumentId]) return workspaceDocumentById[selectedDocumentId]
      return null
    },
    [pendingNotificationDocument, scopedWorkspaceDocuments, selectedDocumentId, workspaceDocumentById],
  )

  const activeMoodBoard = useMemo(
    () => workspaceMoodBoards.find((b) => b.id === selectedMoodBoardId) ?? null,
    [workspaceMoodBoards, selectedMoodBoardId],
  )
  const relatedProjectId = selectedTask?.projectId || (selectedProjectId !== 'all' ? selectedProjectId : '')
  const relatedDocumentsForSelection = useMemo(() => {
    if (!relatedProjectId) return []
    return workspaceDocumentsByProjectId[relatedProjectId] || []
  }, [relatedProjectId, workspaceDocumentsByProjectId])
  const relatedNotesForSelection = useMemo(
    () => relatedDocumentsForSelection.filter((item) => item.type === 'note'),
    [relatedDocumentsForSelection],
  )
  const relatedDocsForSelection = useMemo(
    () => relatedDocumentsForSelection.filter((item) => item.type !== 'note'),
    [relatedDocumentsForSelection],
  )
  const relatedMoodBoardsForSelection = useMemo(() => {
    if (selectedWorkspace?.moodBoardEnabled === false || !relatedProjectId) return []
    return workspaceMoodBoardsByProjectId[relatedProjectId] || []
  }, [relatedProjectId, selectedWorkspace?.moodBoardEnabled, workspaceMoodBoardsByProjectId])
  const relatedSelectionItemCount = relatedDocsForSelection.length + relatedNotesForSelection.length + relatedMoodBoardsForSelection.length
  const hasRelatedSelectionItems = relatedSelectionItemCount > 0

  const selectedDiscussionTarget = useMemo(() => {
    if (activeSection === 'moodboard' && activeMoodBoard) {
      return {
        entityType: 'document' as const,
        entityId: activeMoodBoard.id,
        workspaceId: activeMoodBoard.workspaceId,
        label: activeMoodBoard.title?.trim() || 'Mood Board',
        visibility: 'workspace' as const,
        memberUids: [] as string[],
      }
    }
    if (activeSection === 'notes' && selectedDocument) {
      return {
        entityType: 'document' as const,
        entityId: selectedDocument.id,
        workspaceId: selectedDocument.workspaceId,
        label: selectedDocument.title?.trim() || 'Untitled document',
        visibility: selectedDocument.visibility,
        memberUids: selectedDocument.memberUids,
      }
    }
    if (activeSection === 'tasks' && selectedTask) {
      return {
        entityType: 'task' as const,
        entityId: selectedTask.id,
        workspaceId: selectedTask.workspaceId,
        label: normalizeTaskTitle(selectedTask.title || '') || 'Untitled task',
        visibility: selectedTask.visibility,
        memberUids: selectedTask.memberUids,
      }
    }
    if (activeSection === 'tasks' && selectedProject && selectedProjectId !== 'all') {
      return {
        entityType: 'project' as const,
        entityId: selectedProject.id,
        workspaceId: selectedProject.workspaceId,
        label: selectedProject.name?.trim() || 'Untitled item',
        visibility: selectedProject.visibility,
        memberUids: selectedProject.memberUids,
      }
    }
    return null
  }, [activeSection, selectedDocument, selectedProject, selectedProjectId, selectedTask])
  const discussionNotifyCandidateUids = useMemo(() => {
    const priorCommenterUids = comments.map((item) => item.authorUid)

    if (!selectedDiscussionTarget) return [] as string[]

    if (selectedDiscussionTarget.entityType === 'task' && selectedTask) {
      return normalizeMemberUids([
        ...resolveTaskNotificationRecipients(selectedTask),
        ...priorCommenterUids,
      ]).filter((uid) => uid !== currentUid)
    }

    if (activeSection === 'notes' && selectedDocument) {
      const workspaceRecipientUids = normalizeMemberUids(selectedWorkspace?.accessMemberUids || [])
      const restrictedRecipientUids = normalizeMemberUids([
        ...(selectedDocument.memberUids || []),
        ...(selectedDocument.editMemberUids || []),
        selectedDocument.createdBy,
      ])
      const scopedRecipientUids = selectedDocument.visibility === 'restricted'
        ? restrictedRecipientUids
        : workspaceRecipientUids
      return normalizeMemberUids([
        ...scopedRecipientUids,
        ...priorCommenterUids,
      ]).filter((uid) => uid !== currentUid)
    }

    if (activeSection === 'moodboard' && activeMoodBoard) {
      const relatedProject = activeMoodBoard.entityType === 'project'
        ? workspaceProjectById[activeMoodBoard.entityId]
        : null
      const scopedRecipientUids = relatedProject
        ? normalizeMemberUids([
          ...(relatedProject.memberUids || []),
          relatedProject.createdBy,
          activeMoodBoard.createdBy,
        ])
        : normalizeMemberUids([
          ...(selectedWorkspace?.accessMemberUids || []),
          activeMoodBoard.createdBy,
        ])
      return normalizeMemberUids([
        ...scopedRecipientUids,
        ...priorCommenterUids,
      ]).filter((uid) => uid !== currentUid)
    }

    if (selectedDiscussionTarget.entityType === 'project' && selectedProject) {
      const workspaceRecipientUids = normalizeMemberUids(selectedWorkspace?.accessMemberUids || [])
      const restrictedRecipientUids = normalizeMemberUids([
        ...(selectedProject.memberUids || []),
        selectedProject.createdBy,
      ])
      const scopedRecipientUids = selectedProject.visibility === 'restricted'
        ? restrictedRecipientUids
        : workspaceRecipientUids
      return normalizeMemberUids([
        ...scopedRecipientUids,
        ...priorCommenterUids,
      ]).filter((uid) => uid !== currentUid)
    }

    return [] as string[]
  }, [
    activeMoodBoard,
    activeSection,
    comments,
    currentUid,
    selectedDiscussionTarget,
    selectedDocument,
    selectedProject,
    selectedTask,
    selectedWorkspace?.accessMemberUids,
    workspaceProjectById,
  ])
  const discussionNotifyCandidates = useMemo(
    () => discussionNotifyCandidateUids.map((uid) => ({
      uid,
      label: memberByUid[uid]?.displayName || memberByUid[uid]?.email || uid,
    })),
    [discussionNotifyCandidateUids, memberByUid],
  )
  const discussionNotifyCandidateUidSet = useMemo(
    () => new Set(discussionNotifyCandidateUids),
    [discussionNotifyCandidateUids],
  )
  const selectedDiscussionStoredNotify = useMemo(() => {
    if (activeSection === 'notes' && selectedDocument) {
      const storedUids = normalizeMemberUids(
        Array.isArray(selectedDocument.notifyUids) && selectedDocument.notifyUids.length > 0
          ? selectedDocument.notifyUids
          : [...(selectedDocument.editMemberUids || []), ...(selectedDocument.memberUids || [])],
      ).filter((uid) => uid !== currentUid)
      return {
        mode: selectedDocument.notifyMode || (storedUids.length > 0 ? 'selected' : 'all'),
        uids: storedUids,
      }
    }
    if (activeSection === 'tasks' && selectedTask) {
      const storedUids = normalizeMemberUids(
        Array.isArray(selectedTask.notifyUids) && selectedTask.notifyUids.length > 0
          ? selectedTask.notifyUids
          : [...(selectedTask.memberUids || []), selectedTask.assigneeUid],
      ).filter((uid) => uid !== currentUid)
      return {
        mode: selectedTask.notifyMode || (storedUids.length > 0 ? 'selected' : 'all'),
        uids: storedUids,
      }
    }
    return {
      mode: 'all' as const,
      uids: [] as string[],
    }
  }, [activeSection, currentUid, selectedDocument, selectedTask])
  const resolveDiscussionNotificationRecipients = useCallback(() => {
    if (discussionNotifyMode === 'none') return [] as string[]
    if (discussionNotifyMode === 'selected') {
      return normalizeMemberUids(discussionNotifyUids.filter((uid) => discussionNotifyCandidateUidSet.has(uid)))
    }
    return discussionNotifyCandidateUids
  }, [discussionNotifyCandidateUidSet, discussionNotifyCandidateUids, discussionNotifyMode, discussionNotifyUids])
  useEffect(() => {
    const targetKey = selectedDiscussionTarget ? `${selectedDiscussionTarget.entityType}:${selectedDiscussionTarget.entityId}` : ''
    const nextUids = normalizeMemberUids(
      selectedDiscussionStoredNotify.uids.filter((uid) => discussionNotifyCandidateUidSet.has(uid)),
    )
    setDiscussionNotifyMode(selectedDiscussionStoredNotify.mode)
    setDiscussionNotifyUids(nextUids)
    setDiscussionNotifyOwnerKey(targetKey)
  }, [discussionNotifyCandidateUidSet, selectedDiscussionStoredNotify, selectedDiscussionTarget])
  useEffect(() => {
    setDiscussionNotifyUids((current) => current.filter((uid) => discussionNotifyCandidateUidSet.has(uid)))
  }, [discussionNotifyCandidateUidSet])
  useEffect(() => {
    if (!selectedDiscussionTarget) return
    const targetKey = `${selectedDiscussionTarget.entityType}:${selectedDiscussionTarget.entityId}`
    if (discussionNotifyOwnerKey !== targetKey) return
    const nextUids = normalizeMemberUids(discussionNotifyUids.filter((uid) => discussionNotifyCandidateUidSet.has(uid)))
    const storedUids = normalizeMemberUids(
      selectedDiscussionStoredNotify.uids.filter((uid) => discussionNotifyCandidateUidSet.has(uid)),
    )
    if (discussionNotifyMode === selectedDiscussionStoredNotify.mode && nextUids.join('|') === storedUids.join('|')) {
      return
    }
    if (selectedDiscussionTarget.entityType === 'task' && selectedTask) {
      void saveWorkhubTaskNotifyPrefs(selectedTask.id, discussionNotifyMode, nextUids)
      return
    }
    if (activeSection === 'notes' && selectedDocument) {
      void saveWorkhubDocumentNotifyPrefs(selectedDocument.id, discussionNotifyMode, nextUids)
    }
  }, [
    activeSection,
    discussionNotifyCandidateUidSet,
    discussionNotifyMode,
    discussionNotifyOwnerKey,
    discussionNotifyUids,
    selectedDiscussionStoredNotify,
    selectedDiscussionTarget,
    selectedDocument,
    selectedTask,
  ])
  const taskDialogProjectId = selectedProjectId === 'all' ? selectedNoteProject?.id || flatVisibleProjectOptions[0]?.id || '' : selectedProjectId
  const taskDialogAssignableMembers = useMemo(
    () => assignableMembersByProjectId[taskDialogProjectId] || workspaceAssignableMembers,
    [assignableMembersByProjectId, taskDialogProjectId, workspaceAssignableMembers],
  )
  const quickAddDefaultProjectId = useMemo(
    () => (selectedProjectId !== 'all' ? selectedProjectId : selectedNoteProject?.id || flatVisibleProjectOptions[0]?.id || ''),
    [flatVisibleProjectOptions, selectedNoteProject?.id, selectedProjectId],
  )
  const selectedTaskAssignableMembers = useMemo(
    () => (selectedTask ? (assignableMembersByProjectId[selectedTask.projectId] || workspaceAssignableMembers) : workspaceAssignableMembers),
    [assignableMembersByProjectId, selectedTask, workspaceAssignableMembers],
  )
  const selectedTaskParentEntityLabel = useMemo(() => {
    if (!selectedTask) return 'Item'
    const parentEntity = workspaceProjectById[selectedTask.projectId]
    if (!parentEntity) return 'Item'
    const parentIntent = resolveEffectiveProjectIntent(parentEntity, workspaceByIdForFiltering, selectedWorkspaceTemplateIntentSet)
    return getTemplateCreationIntentMeta(parentIntent, selectedWorkspaceTemplateId).subjectLabel
  }, [selectedTask, selectedWorkspaceTemplateId, selectedWorkspaceTemplateIntentSet, workspaceByIdForFiltering, workspaceProjectById])

  const selectedTaskFinanceInfo = useMemo(() => {
    if (!selectedTask || selectedWorkspaceScopeType !== 'finance') return null
    const totalValue = typeof selectedTask.valueAmount === 'number' && Number.isFinite(selectedTask.valueAmount) ? selectedTask.valueAmount : 0
    const currency = selectedTask.valueCurrency || 'OMR'
    let usedValue = 0
    for (const item of (selectedTask.checklist || [])) {
      if (typeof item.valueAmount === 'number' && Number.isFinite(item.valueAmount)) {
        usedValue += item.valueAmount
      }
    }
    const remaining = totalValue - usedValue
    return { totalValue, usedValue, remaining, currency }
  }, [selectedTask, selectedWorkspaceScopeType])
  const canEditSelectedProject = useMemo(
    () => !!selectedProject && (isPrivilegedMember || selectedProject.createdBy === currentUid),
    [currentUid, isPrivilegedMember, selectedProject],
  )
  const {
    handleSaveSelectedProjectDetails,
    handleSelectedProjectDescriptionBlur,
    handleSelectedProjectColorSelect,
  } = useWorkhubProjectDetailHandlers({
    currentUserUid: currentUid,
    selectedWorkspaceId,
    selectedWorkspaceAccessMemberUids: selectedWorkspace?.accessMemberUids || [],
    selectedProject,
    selectedProjectIntent: selectedProjectEffectiveIntent,
    canEditSelectedProject,
    selectedProjectNameDraft,
    selectedProjectDescriptionDraft,
    resolvedProjectDescriptionDraft: selectedProjectComposedDescriptionDraft,
    setSelectedProjectDescriptionDraft,
    selectedProjectColorDraft,
    setSelectedProjectColorDraft,
    selectedProjectStartDateDraft,
    selectedProjectDeadlineDraft,
    selectedProjectSubmissionTimeDraft,
    selectedProjectTypeDraft,
    selectedProjectValueAmountDraft,
    selectedProjectValueCurrencyDraft,
    setProjects,
    setSelectedProjectColorMenuOpen,
    setBusyKey,
    showToast,
  })
  const {
    handleProjectActionMenu,
    closeActionMenu,
    openProjectSettingsDialog,
    handleSelectProject,
    toggleProjectExpansion,
    handleExpandSidebar,
    handleCollapseSidebar,
    handleToggleProjectsGroup,
  } = useWorkhubProjectTreeSidebarHandlers({
    setActionMenuProjectId,
    setActionMenuPosition,
    setProjectAccessDialogId,
    setSelectedProjectId,
    setSelectedNoteProjectId,
    setSelectedDocumentId,
    setActiveSection,
    setSelectedTaskId,
    setExpandedProjectIds,
    setSidebarCollapsed,
    setProjectsGroupExpanded,
    resolveProjectMainPanelSection,
  })

  const handleTreeResizePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    treeResizeDragRef.current = { startX: e.clientX, startWidth: treePanelWidth }
    e.currentTarget.setPointerCapture(e.pointerId)
  }, [treePanelWidth])

  const handleTreeResizePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!treeResizeDragRef.current || !shellLayoutRef.current) return
    const dx = e.clientX - treeResizeDragRef.current.startX
    const next = Math.min(600, Math.max(200, treeResizeDragRef.current.startWidth + dx))
    // Mutate DOM directly — no React re-render during drag
    shellLayoutRef.current.style.gridTemplateColumns = `${next}px 4px minmax(0, 1fr)`
  }, [])

  const handleTreeResizePointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!treeResizeDragRef.current) return
    const dx = e.clientX - treeResizeDragRef.current.startX
    const next = Math.min(600, Math.max(200, treeResizeDragRef.current.startWidth + dx))
    setTreePanelWidth(next)
    localStorage.setItem('workhub:treePanelWidth', String(next))
    treeResizeDragRef.current = null
  }, [])
  const resolveRememberedWorkspaceRoute = useCallback((workspaceId: string) => {
    if (!workspaceId || !workspaceRouteMemoryStorageKey) return ''
    if (!visibleWorkspaces.some((item) => item.id === workspaceId)) return ''

    const routeMap = readPersistedWorkhubRouteMap(workspaceRouteMemoryStorageKey)
    const savedRoute = routeMap[workspaceId] || ''
    if (!savedRoute) return ''

    const normalizedRoute = normalizePersistedWorkhubRoute(savedRoute)
    if (!normalizedRoute) return ''

    const { pathname, search } = splitPersistedWorkhubRoute(normalizedRoute)
    const parsedRoute = parseWorkhubPathname(pathname, search)
    return parsedRoute.wsId === workspaceId ? normalizedRoute : ''
  }, [visibleWorkspaces, workspaceRouteMemoryStorageKey])
  const navigateToWorkspaceSection = useCallback((
    section: WorkhubCanonicalSection,
    workspaceId = selectedWorkspaceId,
    projectId: string = 'all',
  ) => {
    setSelectedProjectId(projectId || 'all')
    setSelectedNoteProjectId('')
    setSelectedDocumentId('')
    setSelectedMoodBoardId('')
    setSelectedTaskId('')
    setPendingNotificationDocument(null)
    setActiveWorkspaceTab(section)
    setActiveSection(section)
    setProjectsGroupExpanded(true)
    setSidebarCollapsed(false)

    if (!workspaceId) {
      setSelectedWorkspaceId('')
      if (location.pathname !== '/workhub') {
        navigate('/workhub')
      }
      return
    }

    setSelectedWorkspaceId(workspaceId)
    const nextProjectId = projectId || 'all'
    const nextPath = buildWorkhubPathname(workspaceId, nextProjectId, section)
    const currentPath = `${location.pathname}${location.search}`
    if (currentPath !== nextPath) {
      navigate(nextPath)
    }
  }, [location.pathname, location.search, navigate, selectedWorkspaceId])
  const navigateToWorkspaceOverview = useCallback((workspaceId: string) => {
    navigateToWorkspaceSection('dashboard', workspaceId)
  }, [navigateToWorkspaceSection])
  const navigateToRememberedWorkspaceRoute = useCallback((workspaceId: string) => {
    if (!workspaceId) return

    setPendingNotificationDocument(null)
    setProjectsGroupExpanded(true)
    setSidebarCollapsed(false)

    const rememberedRoute = resolveRememberedWorkspaceRoute(workspaceId)
    if (!rememberedRoute) {
      navigateToWorkspaceOverview(workspaceId)
      return
    }

    setSelectedWorkspaceId(workspaceId)
    if (`${location.pathname}${location.search}` !== rememberedRoute) {
      navigate(rememberedRoute)
    }
  }, [location.pathname, location.search, navigate, navigateToWorkspaceOverview, resolveRememberedWorkspaceRoute])
  const {
    documentDialogOpen,
    documentTitleDraft,
    setDocumentTitleDraft,
    documentBodyDraft,
    setDocumentBodyDraft,
    documentProjectIdDraft,
    setDocumentProjectIdDraft,
    openDocumentCreateDialog,
    closeDocumentCreateDialog,
    handleCreateDocument,
    createDocumentQuick,
    createNoteQuick,
  } = useWorkhubDocumentCreation({
    currentUserUid: currentUid,
    selectedWorkspaceId,
    selectedProjectId,
    workspaceProjectById,
    setBusyKey,
    showToast,
    onDocumentCreated: (documentId, projectId) => {
      if (projectId) {
        setSelectedProjectId(projectId)
        setSelectedNoteProjectId(projectId)
      }
      setSelectedDocumentId(documentId)
      setSelectedMoodBoardId('')
      setActiveSection('notes')
      setProjectsGroupExpanded(true)
      setSidebarCollapsed(false)
    },
  })
  const docEditor = useWorkhubDocEditorHandlers({
    selectedDocument: selectedDocument ?? undefined,
    selectedWorkspaceId,
    workspaceProjectById,
    workhubShareCandidates,
    showToast,
    setBusyKey,
    setSelectedDocumentId,
    createActivity: createWorkhubActivity,
    createNotifications: createWorkhubNotifications,
    deleteDocument: deleteWorkhubDocument,
    normalizeMemberUids,
  })
  const selectedProjectDetailsChanged = useMemo(() => {
    if (!selectedProject) return false
    const selectedProjectType = selectedProject.projectType || 'other'
    const selectedProjectSubmissionTime = selectedProjectType === 'tender'
      ? (selectedProject.submissionTime || DEFAULT_SUBMISSION_TIME)
      : ''
    const selectedProjectValueAmount = resolveProjectMonetaryAmount(selectedProject)
    const selectedProjectValueCurrency = normalizeMoneyCurrency(selectedProject.valueCurrency)
    const nextValueAmount = parseMonetaryAmountInput(selectedProjectValueAmountDraft)
    const nextValueCurrency = normalizeMoneyCurrency(selectedProjectValueCurrencyDraft)
    return (
      selectedProjectNameDraft.trim() !== selectedProject.name
      || selectedProjectComposedDescriptionDraft.trim() !== (selectedProject.description || '')
      || selectedProjectColorDraft !== selectedProject.color
      || selectedProjectStartDateDraft !== (selectedProject.projectStartDate || '')
      || selectedProjectDeadlineDraft !== (selectedProject.projectDeadline || '')
      || selectedProjectSubmissionTimeDraft !== selectedProjectSubmissionTime
      || selectedProjectTypeDraft !== selectedProjectType
      || (nextValueAmount !== null && nextValueAmount !== selectedProjectValueAmount)
      || nextValueCurrency !== selectedProjectValueCurrency
    )
  }, [
    selectedProject,
    selectedProjectColorDraft,
    selectedProjectComposedDescriptionDraft,
    selectedProjectDeadlineDraft,
    selectedProjectNameDraft,
    selectedProjectStartDateDraft,
    selectedProjectSubmissionTimeDraft,
    selectedProjectTypeDraft,
    selectedProjectValueAmountDraft,
    selectedProjectValueCurrencyDraft,
  ])
  const parsedWorkhubPath = useMemo(() => parseWorkhubPathname(location.pathname, location.search), [location.pathname, location.search])
  const selectedWorkspaceParam = parsedWorkhubPath.wsId
  const selectedProjectParam = parsedWorkhubPath.projId
  const selectedEntityParam = parsedWorkhubPath.entityId
  const selectedSectionParam = useMemo<WorkhubCanonicalSection | ''>(
    () => (isWorkhubWorkspaceSection(parsedWorkhubPath.section) ? parsedWorkhubPath.section : ''),
    [parsedWorkhubPath.section],
  )
  const previousSelectedSectionParamRef = useRef<string | null>(null)
  const prevSelectedWorkspaceIdRef = useRef(selectedWorkspaceId)
  const prevSelectedProjectIdRef = useRef(selectedProjectId)
  const prevSelectedEntityIdRef = useRef('')
  const isWorkspaceSelectionResolved = useMemo(() => {
    if (!selectedWorkspaceId) return false
    return visibleWorkspaces.some((item) => item.id === selectedWorkspaceId)
  }, [selectedWorkspaceId, visibleWorkspaces])

  useEffect(() => {
    setSelectedTaskTitleDraft(selectedTask?.title || '')
    setSelectedTaskDescriptionDraft(selectedTask?.description || '')
    setSelectedTaskValueAmountDraft(selectedTask?.valueAmount != null ? String(selectedTask.valueAmount) : '')
    setSelectedTaskValueCurrencyDraft(selectedTask?.valueCurrency || '')
    setDetailMenuOpen('')
  }, [selectedTask?.id, selectedTask?.title, selectedTask?.description, selectedTask?.valueAmount, selectedTask?.valueCurrency])

  useEffect(() => {
    if (!selectedProject) {
      setSelectedProjectDraftOwnerId('')
      setSelectedProjectNameDraft('')
      setSelectedProjectDescriptionDraft('')
      setSelectedProjectNarrativeDraft('')
      setSelectedProjectIntentDetailDrafts({})
      setSelectedProjectColorDraft(selectedWorkspaceProjectColorOptions[0] || PROJECT_COLORS[0])
      setSelectedProjectStartDateDraft('')
      setSelectedProjectDeadlineDraft('')
      setSelectedProjectSubmissionTimeDraft('')
      setSelectedProjectTypeDraft('other')
      setSelectedProjectValueAmountDraft('0')
      setSelectedProjectValueCurrencyDraft('OMR')
      setSelectedProjectAttachmentTitleDraft('')
      setSelectedProjectAttachmentDraft('')
      setSelectedProjectAttachmentFileDrafts([])
      setSelectedProjectAttachmentFilePathDraft('')
      setSelectedProjectColorMenuOpen(false)
      return
    }
    const nextProjectType = selectedProject.projectType || 'other'
    const splitDescription = splitTemplateDescriptionForIntent(selectedProjectEffectiveIntent, selectedProject.description || '')
    setSelectedProjectNameDraft(selectedProject.name)
    setSelectedProjectDescriptionDraft(selectedProject.description || '')
    setSelectedProjectNarrativeDraft(splitDescription.narrative)
    setSelectedProjectIntentDetailDrafts(splitDescription.detailsByKey)
    setSelectedProjectColorDraft(selectedProject.color)
    setSelectedProjectStartDateDraft(selectedProject.projectStartDate || '')
    setSelectedProjectDeadlineDraft(selectedProject.projectDeadline || '')
    setSelectedProjectSubmissionTimeDraft(nextProjectType === 'tender' ? (selectedProject.submissionTime || DEFAULT_SUBMISSION_TIME) : '')
    setSelectedProjectDraftOwnerId(selectedProject.id)
    setSelectedProjectTypeDraft(nextProjectType)
    setSelectedProjectValueAmountDraft(String(resolveProjectMonetaryAmount(selectedProject)))
    setSelectedProjectValueCurrencyDraft(normalizeMoneyCurrency(selectedProject.valueCurrency))
    setSelectedProjectAttachmentTitleDraft('')
    setSelectedProjectAttachmentDraft('')
    setSelectedProjectAttachmentFileDrafts([])
    setSelectedProjectAttachmentFilePathDraft('')
    setSelectedProjectColorMenuOpen(false)
  }, [
    selectedProject?.color,
    selectedProject?.projectDeadline,
    selectedProject?.description,
    selectedProject?.id,
    selectedProject?.name,
    selectedProject?.projectStartDate,
    selectedProject?.submissionTime,
    selectedProject?.projectType,
    selectedProject?.valueAmount,
    selectedProject?.valueCurrency,
    selectedProject?.attachments,
    selectedProjectEffectiveIntent,
    selectedWorkspaceProjectColorOptions,
  ])

  const selectedProjectAttachments = useMemo(
    () => selectedProject?.attachments || [],
    [selectedProject?.attachments],
  )

  const handleSelectedProjectAttachmentAdd = useCallback(async () => {
    if (!selectedProject || !canEditSelectedProject) return
    const nextUrl = selectedProjectAttachmentDraft.trim()
    if (!nextUrl) return
    const nextTitle = selectedProjectAttachmentTitleDraft.trim()
    const nextAttachments = Array.from(new Set([...selectedProjectAttachments, nextUrl]))
    const nextAttachmentTitles: Record<string, string> = {
      ...(selectedProject.attachmentTitles || {}),
      [nextUrl]: nextTitle || deriveAttachmentTitle(nextUrl),
    }
    setBusyKey(`project-detail:${selectedProject.id}`)
    try {
      await updateWorkhubProject(selectedProject.id, {
        attachments: nextAttachments,
        attachmentTitles: nextAttachmentTitles,
      })
      setSelectedProjectAttachmentTitleDraft('')
      setSelectedProjectAttachmentDraft('')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not add attachment.'
      showToast({ type: 'error', message })
    } finally {
      setBusyKey('')
    }
  }, [canEditSelectedProject, selectedProject, selectedProjectAttachmentDraft, selectedProjectAttachmentTitleDraft, selectedProjectAttachments, setBusyKey, showToast])

  const handleSelectedProjectAttachmentRemove = useCallback(async (url: string) => {
    if (!selectedProject || !canEditSelectedProject) return
    if (!window.confirm('Remove this attachment?')) return
    const nextAttachments = selectedProjectAttachments.filter((item) => item !== url)
    const nextAttachmentTitles = { ...(selectedProject.attachmentTitles || {}) }
    delete nextAttachmentTitles[url]
    setBusyKey(`project-detail:${selectedProject.id}`)
    try {
      await updateWorkhubProject(selectedProject.id, {
        attachments: nextAttachments,
        attachmentTitles: Object.keys(nextAttachmentTitles).length > 0 ? nextAttachmentTitles : {},
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not remove attachment.'
      showToast({ type: 'error', message })
    } finally {
      setBusyKey('')
    }
  }, [canEditSelectedProject, selectedProject, selectedProjectAttachments, setBusyKey, showToast])

  const fileToBase64 = useCallback(async (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = typeof reader.result === 'string' ? reader.result : ''
        const base64 = result.includes(',') ? result.split(',')[1] : result
        if (!base64) {
          reject(new Error('Could not read file data.'))
          return
        }
        resolve(base64)
      }
      reader.onerror = () => reject(new Error('Could not read file data.'))
      reader.readAsDataURL(file)
    })
  }, [])

  const uploadProjectAttachment = useCallback(async (file: File, project: WorkhubProject) => {
    const isDrive = project.storageMethod === 'drive'
    if (isDrive) {
      const dataBase64 = await fileToBase64(file)
      const folderResult = await ensureWorkhubDriveProjectFolder({ projectId: project.id, projectName: project.name })
      const result = await uploadWorkhubAttachmentToDrive({
        fileName: file.name,
        contentType: file.type || 'application/octet-stream',
        dataBase64,
        parentFolderId: folderResult.folderId,
      })
      return result.url
    }
    const extension = file.name.split('.').pop() || 'bin'
    const isImage = file.type.startsWith('image/')
    const isVideo = file.type.startsWith('video/')
    const subfolder = isImage ? 'images' : (isVideo ? 'videos' : 'docs')
    const storagePath = `workhub-attachments/${project.workspaceId}/${project.id}/${subfolder}/${crypto.randomUUID()}.${extension}`
    const storageRef = ref(storage, storagePath)
    await uploadBytes(storageRef, file, { contentType: file.type || 'application/octet-stream' })
    return await getDownloadURL(storageRef)
  }, [fileToBase64])

  const handleSelectedProjectAttachmentFileUpload = useCallback(async () => {
    if (!selectedProject || !canEditSelectedProject || selectedProjectAttachmentFileDrafts.length === 0) return
    setUploadingSelectedProjectAttachment(true)
    setBusyKey(`project-detail:${selectedProject.id}`)
    try {
      const uploadedUrls = await Promise.all(selectedProjectAttachmentFileDrafts.map((file) => uploadProjectAttachment(file, selectedProject)))
      const nextAttachments = Array.from(new Set([...selectedProjectAttachments, ...uploadedUrls]))
      const nextAttachmentTitles: Record<string, string> = {
        ...(selectedProject.attachmentTitles || {}),
      }
      uploadedUrls.forEach((url, index) => {
        const fileName = selectedProjectAttachmentFileDrafts[index]?.name?.trim()
        if (fileName) nextAttachmentTitles[url] = fileName
      })
      await updateWorkhubProject(selectedProject.id, {
        attachments: nextAttachments,
        attachmentTitles: nextAttachmentTitles,
      })
      setSelectedProjectAttachmentTitleDraft('')
      setSelectedProjectAttachmentFileDrafts([])
      setSelectedProjectAttachmentFilePathDraft('')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not upload attachment.'
      showToast({ type: 'error', message })
    } finally {
      setUploadingSelectedProjectAttachment(false)
      setBusyKey('')
    }
  }, [canEditSelectedProject, selectedProject, selectedProjectAttachmentFileDrafts, selectedProjectAttachments, setBusyKey, showToast, uploadProjectAttachment])

  useEffect(() => {
    if (selectedWorkspaceProjectColorOptions.length === 0) return
    const fallbackColor = selectedWorkspaceProjectColorOptions[0]
    setProjectColor((current) => selectedWorkspaceProjectColorOptions.includes(current) ? current : fallbackColor)
  }, [selectedWorkspaceProjectColorOptions])

  // Sync workspace from URL to state
  useEffect(() => {
    if (selectedWorkspaceParam && workspaces.some((item) => item.id === selectedWorkspaceParam) && selectedWorkspaceId !== selectedWorkspaceParam) {
      setSelectedWorkspaceId(selectedWorkspaceParam)
    }
  }, [selectedWorkspaceParam, workspaces]) // Left out selectedWorkspaceId intentionally to avoid loop on local changes

  // Sync project context or project entity route from URL to state.
  useEffect(() => {
    if (parsedWorkhubPath.kind !== 'workspace' && parsedWorkhubPath.kind !== 'project') return

    if (selectedProjectParam === 'all') {
      setSelectedProjectId('all')
      setSelectedNoteProjectId('')
      return
    }

    const matchedProject = visibleWorkspaceProjects.find((item) => item.id === selectedProjectParam)
    if (!matchedProject) return

    setSelectedProjectId(selectedProjectParam)
    setSelectedNoteProjectId(selectedProjectParam)

    if (parsedWorkhubPath.kind === 'project') {
      setSelectedDocumentId('')
      setSelectedMoodBoardId('')
      setSelectedTaskId('')
      setActiveSection(resolveProjectMainPanelSection(selectedProjectParam))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    parsedWorkhubPath.kind,
    resolveProjectMainPanelSection,
    selectedProjectParam,
    visibleWorkspaceProjects,
  ])

  // Sync workspace-section routes from URL to state.
  useEffect(() => {
    if (parsedWorkhubPath.kind !== 'workspace') return

    const previousParam = previousSelectedSectionParamRef.current
    previousSelectedSectionParamRef.current = selectedSectionParam
    if (!selectedSectionParam) return
    if (previousParam === selectedSectionParam) return
    setSelectedDocumentId('')
    setSelectedMoodBoardId('')
    setSelectedTaskId('')
    setActiveWorkspaceTab(selectedSectionParam)
    setActiveSection(selectedSectionParam)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsedWorkhubPath.kind, selectedSectionParam])

  // Sync typed entity routes (and legacy deep links) from URL to state.
  // NOTE: selectedDocumentId, selectedMoodBoardId, selectedProjectId are intentionally
  // excluded from deps. Including them causes an oscillation loop: a user click sets state
  // (e.g. docB), this effect fires because state changed, sees URL still says docA, and
  // reverts state back to docA. These values are only used as no-op guards; React bails
  // out automatically when setState is called with the already-current value.
  useEffect(() => {
    if (!selectedEntityParam) return

    const resolvedContextProjectId = (
      selectedProjectParam
      && (selectedProjectParam === 'all' || visibleProjectIds.has(selectedProjectParam))
    )
      ? selectedProjectParam
      : ''

    if (parsedWorkhubPath.kind === 'document') {
      const targetDocument = workspaceDocumentById[selectedEntityParam]
      if (!targetDocument) return
      if (targetDocument.projectId) {
        const lineage = collectProjectLineage(targetDocument.projectId, workspaceProjectById)
        setExpandedProjectIds((current) => Array.from(new Set([...current, ...lineage])))
      }
      const nextProjectId = resolvedContextProjectId || (targetDocument.projectId && visibleProjectIds.has(targetDocument.projectId)
        ? targetDocument.projectId
        : 'all')
      setSelectedProjectId(nextProjectId)
      setSelectedNoteProjectId(targetDocument.projectId || '')
      setSelectedTaskId('')
      setSelectedDocumentId(targetDocument.id)
      setSelectedMoodBoardId('')
      setActiveSection('notes')
      return
    }

    if (parsedWorkhubPath.kind === 'moodboard') {
      const targetBoard = workspaceMoodBoards.find((item) => item.id === selectedEntityParam)
      if (!targetBoard) return
      const nextProjectId = resolvedContextProjectId || (targetBoard.entityType === 'project' && visibleProjectIds.has(targetBoard.entityId)
        ? targetBoard.entityId
        : 'all')
      setSelectedProjectId(nextProjectId)
      setSelectedNoteProjectId(targetBoard.entityType === 'project' ? targetBoard.entityId : '')
      setSelectedMoodBoardId(targetBoard.id)
      setSelectedDocumentId('')
      setSelectedTaskId('')
      setActiveSection('moodboard')
      return
    }

    if (parsedWorkhubPath.kind === 'task') {
      const targetTask = tasks.find((item) => item.id === selectedEntityParam)
      if (!targetTask) return
      if (targetTask.projectId) {
        const lineage = collectProjectLineage(targetTask.projectId, workspaceProjectById)
        setExpandedProjectIds((current) => Array.from(new Set([...current, ...lineage])))
      }
      const nextProjectId = resolvedContextProjectId || (targetTask.projectId && visibleProjectIds.has(targetTask.projectId)
        ? targetTask.projectId
        : 'all')
      setSelectedProjectId(nextProjectId)
      setSelectedNoteProjectId(targetTask.projectId || '')
      setSelectedTaskId(targetTask.id)
      setSelectedDocumentId('')
      setSelectedMoodBoardId('')
      setActiveSection('tasks')
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    parsedWorkhubPath.kind,
    selectedEntityParam,
    selectedProjectParam,
    tasks,
    visibleProjectIds,
    workspaceDocumentById,
    workspaceMoodBoards,
    workspaceProjectById,
  ])

  // Sync state → URL immediately. Uses replace only on the very first auto-selection
  // (no workspace in the URL yet). Every subsequent navigation pushes a real history
  // entry so that browser back / forward works within the app.
  useEffect(() => {
    if (!selectedWorkspaceId || !isWorkspaceSelectionResolved) return

    const prevWorkspaceId = prevSelectedWorkspaceIdRef.current
    prevSelectedWorkspaceIdRef.current = selectedWorkspaceId
    const workspaceChangedThisRender = prevWorkspaceId !== selectedWorkspaceId

    const expectedProjectParam = activeSection === 'notes'
      ? (selectedNoteProjectId || selectedProjectId || 'all')
      : (selectedProjectId || 'all')

    // Track whether the project changed THIS render (i.e. a user action or URL→state
    // sync just updated it) vs. remaining unchanged while some other param is still
    // catching up. Must be computed before any early return so the ref stays current.
    const prevProjectId = prevSelectedProjectIdRef.current
    prevSelectedProjectIdRef.current = expectedProjectParam
    const projectChangedThisRender = prevProjectId !== expectedProjectParam

    // During browser back/forward (POP), the URL should temporarily lead while the
    // workspace / project / section state catches up. Without this guard, stale state can
    // immediately push the old path back into history and cause a flicker loop.
    //
    // IMPORTANT: Do NOT apply this block when the project just changed this render.
    // If navigationType stays 'POP' from the initial page load (it never advances to
    // 'PUSH' until the first programmatic navigate() call), this guard would permanently
    // block every user click that tries to change the project — the URL would never
    // update. Exempting renders where the project actually changed ensures user
    // navigation always produces a URL update.
    const expectedEntityParam = activeSection === 'notes'
      ? selectedDocumentId
      : (activeSection === 'moodboard'
        ? selectedMoodBoardId
        : (activeSection === 'tasks' ? selectedTaskId : ''))
    const prevEntityId = prevSelectedEntityIdRef.current
    prevSelectedEntityIdRef.current = expectedEntityParam
    const entityChangedThisRender = prevEntityId !== expectedEntityParam

    if (
      navigationType === 'POP'
      && !workspaceChangedThisRender
      && !projectChangedThisRender
      && !entityChangedThisRender
      && (
        (!!selectedWorkspaceParam && selectedWorkspaceId !== selectedWorkspaceParam)
        || (!!selectedProjectParam && expectedProjectParam !== selectedProjectParam)
        || (!!selectedSectionParam && activeSection !== selectedSectionParam)
        || (!!selectedEntityParam && expectedEntityParam !== selectedEntityParam)
      )
    ) {
      return
    }

    // Guard against stale state overwriting the URL when the URL names a specific
    // project but state hasn't changed yet (timing races outside of POP navigation).
    // Uses the same projectChangedThisRender signal: if nothing changed we're still
    // waiting for the URL→state sync to finish — don't race it.
    if (
      selectedProjectParam
      && selectedProjectParam !== 'all'
      && expectedProjectParam !== selectedProjectParam
      && !projectChangedThisRender
    ) {
      return
    }

    if (
      !!selectedEntityParam
      && expectedEntityParam !== selectedEntityParam
      && !entityChangedThisRender
    ) {
      return
    }

    const targetProject = expectedProjectParam || 'all'
    // Mood boards are entity-only routes. If no board is selected, canonicalize to
    // the workspace dashboard instead of preserving a stale /moodboard suffix.
    const targetSection = activeSection === 'moodboard' && !selectedMoodBoardId
      ? 'dashboard'
      : activeSection
    const targetEntityId = targetSection === 'notes'
      ? selectedDocumentId
      : (targetSection === 'moodboard'
        ? selectedMoodBoardId
        : (targetSection === 'tasks' ? selectedTaskId : ''))
    let newPath = buildWorkhubPathname(selectedWorkspaceId, targetProject, targetSection, targetEntityId)

    if (!parsedWorkhubPath.wsId) {
      const rememberedRoute = resolveRememberedWorkspaceRoute(selectedWorkspaceId)
      if (rememberedRoute) {
        newPath = rememberedRoute
      }
    }

    const currentPath = `${location.pathname}${location.search}`
    if (currentPath === newPath) return

    // Replace when bootstrapping from no workspace or canonicalizing a legacy URL.
    const shouldReplace = !parsedWorkhubPath.wsId || parsedWorkhubPath.source === 'legacy'
    navigate(newPath, { replace: shouldReplace })
  }, [
    activeSection,
    isWorkspaceSelectionResolved,
    location.pathname,
    location.search,
    navigate,
    navigationType,
    parsedWorkhubPath.source,
    parsedWorkhubPath.wsId,
    selectedDocumentId,
    selectedEntityParam,
    selectedMoodBoardId,
    selectedNoteProjectId,
    selectedProjectId,
    selectedProjectParam,
    selectedSectionParam,
    selectedTaskId,
    selectedWorkspaceId,
    selectedWorkspaceParam,
    resolveRememberedWorkspaceRoute,
  ])

  useEffect(() => {
    if (!workspaceRouteMemoryStorageKey || !selectedWorkspaceId || !isWorkspaceSelectionResolved) return

    const currentRoute = normalizePersistedWorkhubRoute(`${location.pathname}${location.search}`)
    if (!currentRoute) return

    const { pathname, search } = splitPersistedWorkhubRoute(currentRoute)
    const parsedRoute = parseWorkhubPathname(pathname, search)
    if (parsedRoute.wsId !== selectedWorkspaceId) return

    const routeMap = readPersistedWorkhubRouteMap(workspaceRouteMemoryStorageKey)
    if (routeMap[selectedWorkspaceId] === currentRoute) return

    writePersistedWorkhubRouteMap(workspaceRouteMemoryStorageKey, {
      ...routeMap,
      [selectedWorkspaceId]: currentRoute,
    })
  }, [
    isWorkspaceSelectionResolved,
    location.pathname,
    location.search,
    selectedWorkspaceId,
    workspaceRouteMemoryStorageKey,
  ])

  useEffect(() => {
    if (!workspaceRouteMemoryStorageKey || memberLoading || member?.status !== 'approved') return

    const routeMap = readPersistedWorkhubRouteMap(workspaceRouteMemoryStorageKey)
    if (Object.keys(routeMap).length === 0) return

    const visibleWorkspaceIdSet = new Set(visibleWorkspaces.map((item) => item.id))
    const cleanedRouteMap: WorkhubPersistedRouteMap = {}
    let changed = false

    Object.entries(routeMap).forEach(([workspaceId, savedRoute]) => {
      if (!visibleWorkspaceIdSet.has(workspaceId)) {
        changed = true
        return
      }

      const normalizedRoute = normalizePersistedWorkhubRoute(savedRoute)
      if (!normalizedRoute) {
        changed = true
        return
      }

      const { pathname, search } = splitPersistedWorkhubRoute(normalizedRoute)
      const parsedRoute = parseWorkhubPathname(pathname, search)
      if (parsedRoute.wsId !== workspaceId) {
        changed = true
        return
      }

      cleanedRouteMap[workspaceId] = normalizedRoute
      if (normalizedRoute !== savedRoute) {
        changed = true
      }
    })

    if (!changed && Object.keys(cleanedRouteMap).length === Object.keys(routeMap).length) return
    writePersistedWorkhubRouteMap(workspaceRouteMemoryStorageKey, cleanedRouteMap)
  }, [member?.status, memberLoading, visibleWorkspaces, workspaceRouteMemoryStorageKey])

  useEffect(() => {
    if (!projectSelectionStorageKey || !selectedWorkspaceId) return
    try {
      const raw = localStorage.getItem(projectSelectionStorageKey)
      const parsed = raw ? JSON.parse(raw) as Record<string, string> : {}
      localStorage.setItem(projectSelectionStorageKey, JSON.stringify({
        ...parsed,
        [selectedWorkspaceId]: selectedProjectId || 'all',
      }))
    } catch {
      // Ignore storage serialization issues and keep UI state functional.
    }
  }, [projectSelectionStorageKey, selectedProjectId, selectedWorkspaceId])

  useEffect(() => {
    if (!projectSelectionStorageKey) return
    try {
      const raw = localStorage.getItem(projectSelectionStorageKey)
      if (!raw) return
      const parsed = JSON.parse(raw) as Record<string, string>
      const workspaceIdSet = new Set(workspaces.map((item) => item.id))
      const projectById = new Map(projects.map((item) => [item.id, item] as const))
      const cleaned: Record<string, string> = {}
      let changed = false

      Object.entries(parsed).forEach(([workspaceId, projectId]) => {
        if (!workspaceIdSet.has(workspaceId)) {
          changed = true
          return
        }
        if (projectId === 'all') {
          cleaned[workspaceId] = 'all'
          return
        }
        const project = projectById.get(projectId)
        if (!project || project.workspaceId !== workspaceId) {
          changed = true
          return
        }
        cleaned[workspaceId] = projectId
      })

      if (!changed && Object.keys(cleaned).length === Object.keys(parsed).length) return
      if (Object.keys(cleaned).length === 0) {
        localStorage.removeItem(projectSelectionStorageKey)
        return
      }
      localStorage.setItem(projectSelectionStorageKey, JSON.stringify(cleaned))
    } catch {
      // Ignore malformed persisted values.
    }
  }, [projectSelectionStorageKey, projects, workspaces])

  useEffect(() => {
    if (selectedProjectParam || !projectSelectionStorageKey || !selectedWorkspaceId || !isWorkspaceSelectionResolved) return
    try {
      const raw = localStorage.getItem(projectSelectionStorageKey)
      if (!raw) return
      const parsed = JSON.parse(raw) as Record<string, string>
      const savedProjectId = parsed[selectedWorkspaceId] || ''
      if (!savedProjectId) return
      if (savedProjectId === 'all') {
        if (selectedProjectId !== 'all') setSelectedProjectId('all')
        return
      }
      if (visibleWorkspaceProjects.some((item) => item.id === savedProjectId) && selectedProjectId !== savedProjectId) {
        setSelectedProjectId(savedProjectId)
        setSelectedNoteProjectId(savedProjectId)
      }
    } catch {
      // Ignore malformed persisted values.
    }
  }, [isWorkspaceSelectionResolved, projectSelectionStorageKey, selectedProjectId, selectedProjectParam, selectedWorkspaceId, visibleWorkspaceProjects])

  useEffect(() => {
    if (!workspaceSelectionStorageKey) return
    if (!selectedWorkspaceId) {
      localStorage.removeItem(workspaceSelectionStorageKey)
      return
    }
    localStorage.setItem(workspaceSelectionStorageKey, selectedWorkspaceId)
  }, [selectedWorkspaceId, workspaceSelectionStorageKey])

  useEffect(() => {
    if (selectedWorkspaceId && visibleWorkspaces.some((item) => item.id === selectedWorkspaceId)) return

    // Prefer explicit URL workspace to avoid refresh races that jump to the first workspace.
    if (selectedWorkspaceParam && visibleWorkspaces.some((item) => item.id === selectedWorkspaceParam)) {
      if (selectedWorkspaceId !== selectedWorkspaceParam) {
        setSelectedWorkspaceId(selectedWorkspaceParam)
      }
      return
    }

    if (!selectedWorkspaceId && workspaceSelectionStorageKey) {
      const savedWorkspaceId = localStorage.getItem(workspaceSelectionStorageKey) || ''
      if (savedWorkspaceId && visibleWorkspaces.some((item) => item.id === savedWorkspaceId)) {
        setSelectedWorkspaceId(savedWorkspaceId)
        return
      }
    }

    setSelectedWorkspaceId(visibleWorkspaces[0]?.id || '')
  }, [selectedWorkspaceId, selectedWorkspaceParam, visibleWorkspaces, workspaceSelectionStorageKey])

  useEffect(() => {
    if (selectedProjectId === 'all') return
    if (visibleWorkspaceProjects.some((item) => item.id === selectedProjectId)) return
    setSelectedProjectId('all')
  }, [selectedProjectId, visibleWorkspaceProjects])

  useEffect(() => {
    if (!selectedProjectId || selectedProjectId === 'all') return
    const lineage = collectProjectLineage(selectedProjectId, visibleProjectById)
    if (lineage.length === 0) return
    setExpandedProjectIds((current) => Array.from(new Set([...current, ...lineage])))
  }, [selectedProjectId, visibleProjectById])

  useEffect(() => {
    if (!selectedWorkspaceId) {
      setExpandedProjectIds([])
      return
    }

    if (visibleProjectTree.length === 0) {
      setExpandedProjectIds([])
      return
    }

    const savedMap = readExpandedProjectsByWorkspaceMap()
    if (Object.prototype.hasOwnProperty.call(savedMap, selectedWorkspaceId)) {
      const savedExpandedIds = savedMap[selectedWorkspaceId] || []
      const visibleProjectIdSet = new Set(visibleWorkspaceProjects.map((item) => item.id))
      const nextExpandedIds = savedExpandedIds.filter((id) => visibleProjectIdSet.has(id))
      setExpandedProjectIds(nextExpandedIds)
      return
    }

    const defaultExpandedIds = visibleProjectTree
      .map((item) => item.id)
      .filter((id) => !defaultCollapsedClosedRootIds.includes(id))
    setExpandedProjectIds(defaultExpandedIds)
  }, [defaultCollapsedClosedRootIds, expandedProjectSelectionStorageKey, selectedWorkspaceId, visibleProjectTree, visibleWorkspaceProjects])

  useEffect(() => {
    if (!expandedProjectSelectionStorageKey || !selectedWorkspaceId) return
    if (expandedProjectSaveTimerRef.current) {
      clearTimeout(expandedProjectSaveTimerRef.current)
    }

    expandedProjectSaveTimerRef.current = setTimeout(() => {
      const map = readExpandedProjectsByWorkspaceMap()
      const knownWorkspaceIdSet = new Set(workspaces.map((item) => item.id))
      const workspaceEntries = Object.entries(map)
        .filter(([workspaceId]) => knownWorkspaceIdSet.size === 0 || knownWorkspaceIdSet.has(workspaceId))
      const trimmedWorkspaceEntries = workspaceEntries.slice(-MAX_EXPANDED_PROJECT_WORKSPACES)
      const cleanedMap = Object.fromEntries(trimmedWorkspaceEntries) as Record<string, string[]>
      const nextExpandedIds = Array.from(new Set(expandedProjectIds)).slice(0, MAX_EXPANDED_PROJECT_IDS_PER_WORKSPACE)
      localStorage.setItem(expandedProjectSelectionStorageKey, JSON.stringify({
        ...cleanedMap,
        [selectedWorkspaceId]: nextExpandedIds,
      }))
    }, 220)

    return () => {
      if (expandedProjectSaveTimerRef.current) {
        clearTimeout(expandedProjectSaveTimerRef.current)
      }
    }
  }, [expandedProjectIds, expandedProjectSelectionStorageKey, selectedWorkspaceId, workspaces])

  useEffect(() => {
    setProjectsGroupExpanded(true)
  }, [selectedWorkspaceId])

  useEffect(() => {
    if (selectedNoteProjectId && visibleWorkspaceProjects.some((item) => item.id === selectedNoteProjectId)) return
    setSelectedNoteProjectId(visibleWorkspaceProjects[0]?.id || '')
  }, [selectedNoteProjectId, visibleWorkspaceProjects])

  useEffect(() => {
    if (!pendingNotificationDocument) return
    if (selectedWorkspaceId !== pendingNotificationDocument.workspaceId) return

    // If navigation/user selection has already moved to a different document,
    // stop forcing the pending notification selection to avoid selection loops.
    if (selectedDocumentId && selectedDocumentId !== pendingNotificationDocument.id) {
      setPendingNotificationDocument(null)
      return
    }

    const targetDocument = workspaceDocumentById[pendingNotificationDocument.id]
    if (!targetDocument) return

    const nextProjectId = targetDocument.projectId && visibleProjectIds.has(targetDocument.projectId)
      ? targetDocument.projectId
      : 'all'

    if (targetDocument.projectId) {
      const lineage = collectProjectLineage(targetDocument.projectId, workspaceProjectById)
      setExpandedProjectIds((current) => Array.from(new Set([...current, ...lineage])))
    }

    setSelectedProjectId(nextProjectId)
    setSelectedNoteProjectId(targetDocument.projectId || '')
    setSelectedTaskId('')
    setSelectedDocumentId(targetDocument.id)
    setSelectedMoodBoardId('')
    setActiveSection('notes')
    setProjectsGroupExpanded(true)
    setSidebarCollapsed(false)
    if (documents.some((item) => item.id === pendingNotificationDocument.id && item.workspaceId === pendingNotificationDocument.workspaceId)) {
      setPendingNotificationDocument(null)
    }
  }, [
    documents,
    pendingNotificationDocument,
    selectedDocumentId,
    selectedWorkspaceId,
    visibleProjectIds,
    workspaceDocumentById,
    workspaceProjectById,
  ])

  useEffect(() => {
    if (!selectedDocumentId) return
    // Keep current selection while project scope catches up after tree navigation.
    if (workspaceDocumentById[selectedDocumentId]) return
    // Keep notification-opened documents selected while workspace switching catches up.
    if (pendingNotificationDocument?.id === selectedDocumentId) return
    // Document is no longer accessible at all — clear selection.
    setSelectedDocumentId('')
  }, [pendingNotificationDocument, selectedDocumentId, selectedWorkspaceId, workspaceDocumentById])

  useEffect(() => {
    if (!selectedMoodBoardId) return
    if (workspaceMoodBoards.some((item) => item.id === selectedMoodBoardId)) return
    if (activeSection === 'moodboard') {
      setActiveSection('dashboard')
    }
    setSelectedMoodBoardId('')
  }, [activeSection, selectedMoodBoardId, workspaceMoodBoards])

  useEffect(() => {
    if (selectedAssigneeUid === 'all') return
    if (scopeAssignableMemberUidSet.has(selectedAssigneeUid)) return
    setSelectedAssigneeUid('all')
  }, [scopeAssignableMemberUidSet, selectedAssigneeUid])

  useEffect(() => {
    if (!selectedTaskId) return
    if (visibleTasks.some((item) => item.id === selectedTaskId)) return
    setSelectedTaskId('')
  }, [selectedTaskId, visibleTasks])

  useEffect(() => {
    if (selectedTaskStatusTab === 'all') return
    if (selectedProjectEffectiveTaskStatuses.some((status) => status.id === selectedTaskStatusTab)) return
    setSelectedTaskStatusTab('all')
  }, [selectedProjectEffectiveTaskStatuses, selectedTaskStatusTab])

  useEffect(() => {
    const next: Record<string, number> = {}
    selectedProjectEffectiveTaskStatuses.forEach((status) => {
      next[status.id] = DEFAULT_STATUS_TASK_RENDER_LIMIT
    })
    setStatusTaskRenderLimitById(next)
  }, [selectedProjectEffectiveTaskStatuses])

  useEffect(() => {
    if (!selectedTask) {
      setTaskDeleteConfirmOpen(false)
    }
  }, [selectedTask])

  useEffect(() => {
    if (taskStatus && workspaceTaskStatuses.some((item) => item.id === taskStatus)) return
    setTaskStatus(defaultTaskStatusId)
  }, [defaultTaskStatusId, taskStatus, workspaceTaskStatuses])

  useEffect(() => {
    if (selectedTaskStatusTab === 'all') return
    if (workspaceTaskStatuses.some((item) => item.id === selectedTaskStatusTab)) return
    setSelectedTaskStatusTab('all')
  }, [selectedTaskStatusTab, workspaceTaskStatuses])

  useEffect(() => {
    if (!statusDialogOpen) return
    setStatusDrafts(workspaceTaskStatuses.map((item) => ({ ...item })))
    setSelectedStatusDraftId(workspaceTaskStatuses[0]?.id || '')
  }, [statusDialogOpen, workspaceTaskStatuses])

  useEffect(() => {
    if (!statusDialogOpen) return
    if (!selectedStatusDraftId && statusDrafts[0]?.id) {
      setSelectedStatusDraftId(statusDrafts[0].id)
      return
    }
    if (selectedStatusDraftId && statusDrafts.some((item) => item.id === selectedStatusDraftId)) return
    setSelectedStatusDraftId(statusDrafts[0]?.id || '')
  }, [selectedStatusDraftId, statusDialogOpen, statusDrafts])

  useEffect(() => {
    if (taskAssigneeUid || !currentUid) return
    if (!taskDialogAssignableMembers.some((item) => item.uid === currentUid)) return
    setTaskAssigneeUid(currentUid)
  }, [currentUid, taskAssigneeUid, taskDialogAssignableMembers])

  useEffect(() => {
    if (taskDialogAssignableMembers.length === 0) {
      if (taskAssigneeUid) setTaskAssigneeUid('')
      return
    }
    if (taskAssigneeUid && taskDialogAssignableMembers.some((item) => item.uid === taskAssigneeUid)) return
    if (currentUid && taskDialogAssignableMembers.some((item) => item.uid === currentUid)) {
      if (taskAssigneeUid !== currentUid) setTaskAssigneeUid(currentUid)
      return
    }
    const fallbackUid = taskDialogAssignableMembers[0]?.uid || ''
    if (fallbackUid !== taskAssigneeUid) {
      setTaskAssigneeUid(fallbackUid)
    }
  }, [currentUid, taskAssigneeUid, taskDialogAssignableMembers])

  useEffect(() => {
    if (!selectedWorkspaceSettings) return
    setWorkspaceSettingsName(selectedWorkspaceSettings.name)
    setWorkspaceSettingsDescription(selectedWorkspaceSettings.description || '')
    setWorkspaceTreeMetaDisplayMode(selectedWorkspaceSettings.treeMetaDisplayMode || 'counts')
    setWorkspaceTaskDueDisplayMode(selectedWorkspaceSettings.taskDueDisplayMode || 'remaining')
    setWorkspaceActivityWindowDays((selectedWorkspaceSettings.activityWindowDays ?? 30) as 7 | 14 | 30)
    setWorkspaceMoodBoardEnabled(selectedWorkspaceSettings.moodBoardEnabled !== false)
    setWorkspaceShowProjectColorDots(selectedWorkspaceSettings.showProjectColorDots !== false)
    setWorkspaceProjectColorMeaningDrafts(resolveProjectColorMeanings(
      selectedWorkspaceSettingsTemplate.id,
      selectedWorkspaceSettings.projectColorMeanings,
    ))
    setWorkspaceAccessMemberUids(normalizeMemberUids(selectedWorkspaceSettings.accessMemberUids || []))
    setWorkspaceMemberAccessLevels(selectedWorkspaceSettings.memberAccessLevels || {})
    setWorkspaceInviteEmails(normalizeInviteEmails(selectedWorkspaceSettings.invitedEmails || []))
    setWorkspaceInviteEmailDraft('')
    setWorkspaceDeleteTypedName('')
    setWorkspaceDeletePhrase('')
    setWorkspaceDeleteAcknowledge(false)
  }, [selectedWorkspaceSettings, selectedWorkspaceSettingsTemplate.id])

  useEffect(() => {
    if (!selectedAccessProject) return
    const selectedAccessProjectType = selectedAccessProject.projectType || 'other'
    setSettingsProjectName(selectedAccessProject.name)
    setSettingsProjectDescription(selectedAccessProject.description || '')
    setSettingsProjectColor(selectedAccessProject.color)
    setSettingsProjectParentId(selectedAccessProject.parentProjectId || '')
    setSettingsProjectDeadline(selectedAccessProject.projectDeadline || '')
    setSettingsProjectSubmissionTime(selectedAccessProjectType === 'tender' ? (selectedAccessProject.submissionTime || DEFAULT_SUBMISSION_TIME) : '')
    setSettingsProjectType(selectedAccessProjectType)
    setSettingsProjectPriority(selectedAccessProject.priority || 'medium')
    setSettingsProjectTenderNumber(selectedAccessProject.tenderNumber || '')
    setSettingsProjectProposalId(selectedAccessProject.proposalId || '')
    setSettingsTechnicalProposalUrl(selectedAccessProject.technicalProposalUrl || '')
    setSettingsFinancialProposalUrl(selectedAccessProject.financialProposalUrl || '')
    setSettingsProjectValueAmountDraft(String(resolveProjectMonetaryAmount(selectedAccessProject)))
    setSettingsProjectValueCurrencyDraft(normalizeMoneyCurrency(selectedAccessProject.valueCurrency))
    setSettingsProjectMainPanelView(resolveProjectMainPanelView(selectedAccessProject.mainPanelView))
    setSettingsProjectTaskItemDisplayMode(selectedAccessProject.taskItemDisplayMode || 'inherit')
    setSettingsProjectTaskStatuses(
      Array.isArray(selectedAccessProject.taskStatuses) && selectedAccessProject.taskStatuses.length > 0
        ? selectedAccessProject.taskStatuses.map((s) => ({ ...s }))
        : null,
    )
    setSettingsProjectClientId(selectedAccessProject.clientId || '')
    setSettingsStorageMethod(selectedAccessProject.storageMethod || 'firebase')
    setAccessVisibility(selectedAccessProject.visibility || 'workspace')
    setAccessMemberUids(selectedAccessProject.memberUids || [])
    setSettingsProjectCreateDeliveryFolder(false)
  }, [selectedAccessProject])

  useEffect(() => {
    if (!settingsProjectStatusLabelNormalized.includes('running')) {
      setSettingsProjectCreateDeliveryFolder(false)
      return
    }
    if (!proposalProjectsWorkspace || !!existingProposalDeliveryFolder) {
      setSettingsProjectCreateDeliveryFolder(false)
    }
  }, [existingProposalDeliveryFolder, proposalProjectsWorkspace, settingsProjectStatusLabelNormalized])

  useEffect(() => {
    if (!selectedWorkspaceId || !selectedWorkspace || !isPrivilegedMember) return
    if (Array.isArray(selectedWorkspace.taskStatuses) && selectedWorkspace.taskStatuses.length > 0) return
    if (statusBootstrapWorkspaceIdsRef.current.has(selectedWorkspaceId)) return
    statusBootstrapWorkspaceIdsRef.current.add(selectedWorkspaceId)
    void updateWorkhubWorkspace(selectedWorkspaceId, { taskStatuses: cloneDefaultTaskStatuses() }).catch(() => {
      statusBootstrapWorkspaceIdsRef.current.delete(selectedWorkspaceId)
    })
  }, [isPrivilegedMember, selectedWorkspace, selectedWorkspaceId])

  useEffect(() => {
    if (selectedClientId === '__new__') {
      return
    }
    if (!clients.length) {
      setSelectedClientId('')
      setClientNameDraft('')
      setClientContactPersonDraft('')
      setClientEmailDraft('')
      setClientPhoneDraft('')
      setClientWebsiteDraft('')
      setClientAddressDraft('')
      setClientIndustryDraft('')
      setClientLogoUrlDraft('')
      setClientNotesDraft('')
      return
    }
    if (!selectedClientId || !allClientById[selectedClientId]) {
      setSelectedClientId(clients[0].id)
      return
    }
    const client = allClientById[selectedClientId]
    setClientNameDraft(client.name || '')
    setClientContactPersonDraft(client.contactPerson || '')
    setClientEmailDraft(client.email || '')
    setClientPhoneDraft(client.phone || '')
    setClientWebsiteDraft(client.website || '')
    setClientAddressDraft(client.address || '')
    setClientIndustryDraft(client.industry || '')
    setClientLogoUrlDraft(client.logoUrl || '')
    setClientNotesDraft(client.notes || '')
  }, [allClientById, clients, selectedClientId])

  useEffect(() => {
    if (projectVisibility === 'restricted' && projectMemberUids.length === 0 && currentUid) {
      setProjectMemberUids([currentUid])
    }
  }, [currentUid, projectMemberUids.length, projectVisibility])

  useEffect(() => {
    if (projectType === 'tender') {
      if (!projectSubmissionTime) {
        setProjectSubmissionTime(DEFAULT_SUBMISSION_TIME)
      }
      return
    }
    if (projectSubmissionTime) {
      setProjectSubmissionTime('')
    }
  }, [projectSubmissionTime, projectType])

  useEffect(() => {
    if (settingsProjectType === 'tender') {
      if (!settingsProjectSubmissionTime) {
        setSettingsProjectSubmissionTime(DEFAULT_SUBMISSION_TIME)
      }
      return
    }
    if (settingsProjectSubmissionTime) {
      setSettingsProjectSubmissionTime('')
    }
  }, [settingsProjectSubmissionTime, settingsProjectType])

  useEffect(() => {
    if (selectedProjectTypeDraft === 'tender') {
      if (!selectedProjectSubmissionTimeDraft) {
        setSelectedProjectSubmissionTimeDraft(DEFAULT_SUBMISSION_TIME)
      }
      return
    }
    if (selectedProjectSubmissionTimeDraft) {
      setSelectedProjectSubmissionTimeDraft('')
    }
  }, [selectedProjectSubmissionTimeDraft, selectedProjectTypeDraft])

  useEffect(() => {
    if (!auth.currentUser || !isMasterAdmin) return
    if (member?.status === 'approved' && member.role === 'admin') {
      setBootstrappingMasterAccess(false)
      return
    }
    if (memberLoading || masterBootstrapAttempted) return
    let cancelled = false
    const loadingTimeout = window.setTimeout(() => {
      if (cancelled) return
      setBootstrappingMasterAccess(false)
    }, 8000)
    setMasterBootstrapAttempted(true)
    setBootstrappingMasterAccess(true)
    void requestWorkhubAccess()
      .then((nextMember) => {
        if (cancelled) return
        setMember(nextMember)
      })
      .catch((error) => {
        if (cancelled) return
        const message = error instanceof Error ? error.message : 'Could not prepare your WorkHub admin access.'
        showToast({ type: 'error', message })
      })
      .finally(() => {
        if (cancelled) return
        clearTimeout(loadingTimeout)
        setBootstrappingMasterAccess(false)
      })
    return () => {
      cancelled = true
      clearTimeout(loadingTimeout)
    }
  }, [isMasterAdmin, masterBootstrapAttempted, member?.role, member?.status, memberLoading, showToast])

  async function handleRequestAccess() {
    setRequestingAccess(true)
    try {
      const nextMember = await requestWorkhubAccess()
      setMember(nextMember)
      showToast({
        type: 'success',
        message: nextMember.status === 'approved'
          ? 'Your WorkHub access is ready.'
          : 'Your WorkHub access request was submitted.',
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not request access.'
      showToast({ type: 'error', message })
    } finally {
      setRequestingAccess(false)
    }
  }

  async function handleCreateWorkspace() {
    if (!auth.currentUser) return
    if (!workspaceName.trim()) {
      showToast({ type: 'error', message: 'Workspace name is required.' })
      return
    }
    setBusyKey('workspace')
    try {
      const workspaceId = await createWorkhubWorkspace({
        name: workspaceName.trim(),
        description: workspaceDescription.trim(),
        type: selectedCreateWorkspaceTemplate.workspaceType,
        templateId: selectedCreateWorkspaceTemplate.id,
        createdBy: auth.currentUser.uid,
      })
      const accessUids = normalizeMemberUids([...fullAccessMemberUids, auth.currentUser.uid])
      const fullAccessLevels = fullAccessMemberUids.reduce((acc, uid) => {
        acc[uid] = 'full'
        return acc
      }, {} as Record<string, 'full' | 'custom'>)
      const workspacePatch: Parameters<typeof updateWorkhubWorkspace>[1] = {
        accessMemberUids: accessUids,
        memberAccessLevels: fullAccessLevels,
      }
      if (workspaceTemplateTaskStatuses.length > 0) {
        workspacePatch.taskStatuses = workspaceTemplateTaskStatuses
      }
      await updateWorkhubWorkspace(workspaceId, {
        ...workspacePatch,
      })
      await createWorkhubActivity({
        workspaceId,
        actorUid: auth.currentUser.uid,
        entityType: 'workspace',
        entityId: workspaceId,
        action: 'create',
        message: `Created workspace ${workspaceName.trim()}`,
      })
      setWorkspaceName('')
      setWorkspaceDescription('')
      setWorkspaceTemplateId(DEFAULT_WORKHUB_WORKSPACE_TEMPLATE_ID)
      setSelectedWorkspaceId(workspaceId)
      setWorkspaceCreateDialogOpen(false)
      setActiveSection('home')
      showToast({ type: 'success', message: 'Workspace created.' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not create workspace.'
      showToast({ type: 'error', message })
    } finally {
      setBusyKey('')
    }
  }

  const handleWorkspaceProjectColorMeaningChange = useCallback((
    index: number,
    patch: Partial<WorkhubProjectColorMeaning>,
  ) => {
    setWorkspaceProjectColorMeaningDrafts((current) => current.map((item, itemIndex) => {
      if (itemIndex !== index) return item
      return {
        ...item,
        ...patch,
      }
    }))
  }, [])

  const handleRemoveWorkspaceProjectColorMeaning = useCallback((index: number) => {
    setWorkspaceProjectColorMeaningDrafts((current) => {
      if (current.length <= 1) return current
      return current.filter((_, itemIndex) => itemIndex !== index)
    })
  }, [])

  const handleResetWorkspaceProjectColorMeanings = useCallback(() => {
    setWorkspaceProjectColorMeaningDrafts(selectedWorkspaceSettingsDefaultProjectColorMeanings.map((item) => ({ ...item })))
  }, [selectedWorkspaceSettingsDefaultProjectColorMeanings])

  async function handleSaveWorkspaceSettings() {
    if (!auth.currentUser || !selectedWorkspaceSettings) return
    if (!workspaceSettingsName.trim()) {
      showToast({ type: 'error', message: 'Workspace name is required.' })
      return
    }
    const colorMeaningSource = workspaceProjectColorMeaningDrafts.length > 0
      ? workspaceProjectColorMeaningDrafts
      : selectedWorkspaceSettingsDefaultProjectColorMeanings
    const normalizedProjectColorMeanings: WorkhubProjectColorMeaning[] = []
    for (let index = 0; index < colorMeaningSource.length; index += 1) {
      const item = colorMeaningSource[index]
      const color = (item.color || '').trim().toLowerCase()
      const label = (item.label || '').trim()
      const hint = (item.hint || '').trim()
      if (!isValidHexColor(color)) {
        showToast({ type: 'error', message: `Color ${index + 1} must be a valid hex value.` })
        return
      }
      if (!label) {
        showToast({ type: 'error', message: `Color ${index + 1} label is required.` })
        return
      }
      if (!hint) {
        showToast({ type: 'error', message: `Color ${index + 1} meaning is required.` })
        return
      }
      normalizedProjectColorMeanings.push({ color, label, hint })
    }
    const previousWorkspaceSnapshot = selectedWorkspaceSettings
    const optimisticWorkspacePatch = {
      name: workspaceSettingsName.trim(),
      description: workspaceSettingsDescription.trim(),
      treeMetaDisplayMode: workspaceTreeMetaDisplayMode,
      taskDueDisplayMode: workspaceTaskDueDisplayMode,
      activityWindowDays: workspaceActivityWindowDays,
      moodBoardEnabled: workspaceMoodBoardEnabled,
      showProjectColorDots: workspaceShowProjectColorDots,
      projectColorMeanings: normalizedProjectColorMeanings,
      accessMemberUids: normalizeMemberUids(workspaceAccessMemberUids),
      invitedEmails: normalizeInviteEmails(workspaceInviteEmails),
    }
    setWorkspaces((current) => current.map((item) => (item.id === selectedWorkspaceSettings.id ? { ...item, ...optimisticWorkspacePatch } : item)))
    setBusyKey(`workspace-settings:${selectedWorkspaceSettings.id}`)
    try {
      await updateWorkhubWorkspace(selectedWorkspaceSettings.id, optimisticWorkspacePatch)
      await createWorkhubActivity({
        workspaceId: selectedWorkspaceSettings.id,
        actorUid: auth.currentUser.uid,
        entityType: 'workspace',
        entityId: selectedWorkspaceSettings.id,
        action: 'update',
        message: `Updated workspace ${workspaceSettingsName.trim()}`,
      })
      setWorkspaceSettingsId('')
      showToast({ type: 'success', message: 'Workspace settings updated.' })
    } catch (error) {
      setWorkspaces((current) => current.map((item) => (item.id === previousWorkspaceSnapshot.id ? previousWorkspaceSnapshot : item)))
      const message = error instanceof Error ? error.message : 'Could not update workspace settings.'
      showToast({ type: 'error', message })
    } finally {
      setBusyKey('')
    }
  }

  async function handleDeleteWorkspace() {
    if (!auth.currentUser || !selectedWorkspaceSettings) return
    if (workspaceDeleteTypedName.trim() !== selectedWorkspaceSettings.name || workspaceDeletePhrase.trim() !== 'DELETE WORKSPACE' || !workspaceDeleteAcknowledge) {
      showToast({ type: 'error', message: 'Complete all deletion confirmations exactly.' })
      return
    }
    setBusyKey(`workspace-delete:${selectedWorkspaceSettings.id}`)
    try {
      await deleteWorkhubWorkspace(selectedWorkspaceSettings.id)
      if (selectedWorkspaceId === selectedWorkspaceSettings.id) {
        const fallback = workspaces.find((item) => item.id !== selectedWorkspaceSettings.id)
        navigateToWorkspaceOverview(fallback?.id || '')
      }
      setWorkspaceSettingsId('')
      showToast({ type: 'success', message: 'Workspace deleted.' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not delete workspace.'
      showToast({ type: 'error', message })
    } finally {
      setBusyKey('')
    }
  }

  function openWorkspaceSettings(workspaceId: string) {
    if (workspaceId !== selectedWorkspaceId) {
      navigateToWorkspaceOverview(workspaceId)
    }
    setWorkspaceSettingsId(workspaceId)
  }

  async function handleCreateClientInline(name: string, preset?: Partial<WorkhubClient>, workspaceIdOverride?: string) {
    const targetWorkspaceId = workspaceIdOverride || selectedWorkspaceId
    if (!auth.currentUser || !targetWorkspaceId) return null
    const trimmedName = name.trim()
    if (!trimmedName) {
      showToast({ type: 'error', message: 'Client name is required.' })
      return null
    }
    setBusyKey('client:create')
    try {
      const clientId = await createWorkhubClient({
        workspaceId: targetWorkspaceId,
        name: trimmedName,
        contactPerson: (preset?.contactPerson || '').trim(),
        email: (preset?.email || '').trim(),
        phone: (preset?.phone || '').trim(),
        website: (preset?.website || '').trim(),
        address: (preset?.address || '').trim(),
        industry: (preset?.industry || '').trim(),
        logoUrl: (preset?.logoUrl || '').trim(),
        notes: (preset?.notes || '').trim(),
        createdBy: auth.currentUser.uid,
      })
      showToast({ type: 'success', message: 'Client added.' })
      return clientId
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not create client.'
      showToast({ type: 'error', message })
      return null
    } finally {
      setBusyKey('')
    }
  }

  async function handleSaveClientDetails() {
    if (!selectedClientId) return
    const trimmedName = clientNameDraft.trim()
    if (!trimmedName) {
      showToast({ type: 'error', message: 'Client name is required.' })
      return
    }
    if (clientEmailDraft.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clientEmailDraft.trim())) {
      showToast({ type: 'error', message: 'Enter a valid client email.' })
      return
    }
    const previousClientSnapshot = clients.find((item) => item.id === selectedClientId) || null
    const optimisticClientPatch = {
      name: trimmedName,
      contactPerson: clientContactPersonDraft.trim(),
      email: clientEmailDraft.trim(),
      phone: clientPhoneDraft.trim(),
      website: clientWebsiteDraft.trim(),
      address: clientAddressDraft.trim(),
      industry: clientIndustryDraft.trim(),
      logoUrl: clientLogoUrlDraft.trim(),
      notes: clientNotesDraft.trim(),
    }
    setClients((current) => current.map((item) => (item.id === selectedClientId ? { ...item, ...optimisticClientPatch } : item)))
    setBusyKey(`client:save:${selectedClientId}`)
    try {
      await updateWorkhubClient(selectedClientId, optimisticClientPatch)
      showToast({ type: 'success', message: 'Client details updated.' })
    } catch (error) {
      if (previousClientSnapshot) {
        setClients((current) => current.map((item) => (item.id === previousClientSnapshot.id ? previousClientSnapshot : item)))
      }
      const message = error instanceof Error ? error.message : 'Could not save client details.'
      showToast({ type: 'error', message })
    } finally {
      setBusyKey('')
    }
  }

  async function handleDeleteClientDetails() {
    if (!selectedClientId || selectedClientId === '__new__') return
    setClientDeleteTargetId(selectedClientId)
  }

  function handleCancelClientDelete() {
    setClientDeleteTargetId('')
  }

  async function handleConfirmClientDelete() {
    if (!clientDeleteTargetId) return
    const targetClient = allClientById[clientDeleteTargetId]
    if (!targetClient) {
      handleCancelClientDelete()
      return
    }
    const linkedProjects = projects.filter((project) => project.clientId === clientDeleteTargetId)
    if (linkedProjects.length > 0) {
      showToast({ type: 'error', message: 'Unassign this client from projects before deleting it.' })
      return
    }
    setBusyKey(`client:delete:${clientDeleteTargetId}`)
    try {
      await deleteWorkhubClient(clientDeleteTargetId)
      setSelectedClientId('')
      handleCancelClientDelete()
      showToast({ type: 'success', message: 'Client deleted.' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not delete client.'
      showToast({ type: 'error', message })
    } finally {
      setBusyKey('')
    }
  }

  async function handleCreateClientFromManager() {
    const targetWorkspaceId = selectedWorkspaceId || visibleWorkspaces[0]?.id || ''
    if (!targetWorkspaceId) {
      showToast({ type: 'error', message: 'Select a workspace before creating a client.' })
      return
    }
    const clientId = await handleCreateClientInline(clientNameDraft, {
      contactPerson: clientContactPersonDraft,
      email: clientEmailDraft,
      phone: clientPhoneDraft,
      website: clientWebsiteDraft,
      address: clientAddressDraft,
      industry: clientIndustryDraft,
      logoUrl: clientLogoUrlDraft,
      notes: clientNotesDraft,
    }, targetWorkspaceId)
    if (clientId) setSelectedClientId(clientId)
  }

  async function handleClientLogoFileUpload(file: File) {
    if (!selectedWorkspaceId) return
    if (!file.type.startsWith('image/')) {
      showToast({ type: 'error', message: 'Please select an image file for the logo.' })
      return
    }
    const maxBytes = 4 * 1024 * 1024
    if (file.size > maxBytes) {
      showToast({ type: 'error', message: 'Logo size must be 4 MB or smaller.' })
      return
    }
    const extension = file.name.split('.').pop() || 'png'
    const storagePath = `workhub-clients/${selectedWorkspaceId}/logos/${crypto.randomUUID()}.${extension}`
    setBusyKey('client:logo-upload')
    try {
      const storageRef = ref(storage, storagePath)
      await uploadBytes(storageRef, file, { contentType: file.type })
      const logoUrl = await getDownloadURL(storageRef)
      setClientLogoUrlDraft(logoUrl)
      showToast({ type: 'success', message: 'Client logo uploaded.' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not upload client logo.'
      showToast({ type: 'error', message })
    } finally {
      setBusyKey('')
    }
  }

  async function handleCreateProject(options?: { keepDialogOpen?: boolean }) {
    if (!auth.currentUser || !selectedWorkspaceId) return
    if (!projectName.trim()) {
      showToast({ type: 'error', message: 'Folder name is required.' })
      return
    }
    if (!isValidHexColor(projectColor)) {
      showToast({ type: 'error', message: 'Pick a valid project color.' })
      return
    }
    const normalizedStartDate = projectStartDate.trim()
    const normalizedDeadline = projectDeadline.trim()
    if (normalizedStartDate && normalizedDeadline && isStartAfterEnd(normalizedStartDate, normalizedDeadline)) {
      showToast({ type: 'error', message: 'Deadline cannot be earlier than the start date.' })
      return
    }
    const memberUids = projectVisibility === 'restricted'
      ? normalizeMemberUids(projectMemberUids.length > 0 ? projectMemberUids : [auth.currentUser.uid])
      : []
    const shouldKeepOpen = options?.keepDialogOpen === true || !closeProjectAfterCreate
    const currentParentId = projectParentId
    const projectIntent: WorkhubProjectIntent = 'project'
    setBusyKey('project')
    try {
      const pName = projectName.trim()
      const projectId = await createWorkhubProject({
        workspaceId: selectedWorkspaceId,
        parentProjectId: currentParentId || null,
        intent: projectIntent,
        name: pName,
        description: projectDescription.trim(),
        color: projectColor,
        projectStartDate: normalizedStartDate,
        projectDeadline: normalizedDeadline,
        projectType: 'other',
        submissionTime: '',
        priority: projectPriority,
        clientId: projectClientId,
        visibility: projectVisibility,
        memberUids,
        storageMethod: projectStorageMethod,
        createdBy: auth.currentUser.uid,
      })
      await createWorkhubActivity({
        workspaceId: selectedWorkspaceId,
        actorUid: auth.currentUser.uid,
        entityType: 'project',
        entityId: projectId,
        action: 'create',
        message: `Created folder ${pName}`,
        visibility: projectVisibility,
        memberUids,
      })
      
      // Async folder creation (non-blocking)
      ensureWorkhubDriveProjectFolder({ projectId, projectName: pName }).catch((err) => {
        console.error('Failed to create drive folder:', err)
      })

      setProjectName('')
      setProjectDescription('')
      if (!shouldKeepOpen) {
        setProjectParentId('')
        setProjectStartDate('')
        setProjectDeadline('')
        setProjectSubmissionTime('')
        setProjectType('other')
        setProjectPriority('medium')
        setProjectClientId('')
        const projectColorPool = selectedWorkspaceProjectColorOptions.length > 0 ? selectedWorkspaceProjectColorOptions : PROJECT_COLORS
        setProjectColor(projectColorPool[(Math.floor(Math.random() * projectColorPool.length))])
        setProjectVisibility('workspace')
        setProjectMemberUids([])
      }
      setSelectedProjectId(projectId)
      setSelectedNoteProjectId(projectId)
      if (!shouldKeepOpen) {
        setCreateDialogOpen(false)
      }
      setExpandedProjectIds((current) => Array.from(new Set([...current, ...(currentParentId ? [currentParentId] : []), projectId])))
      setActiveSection('home')
      const workspaceName = selectedWorkspace?.name?.trim() || 'current workspace'
      showToast({ type: 'success', message: `Folder created in ${workspaceName}.` })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not create folder.'
      showToast({ type: 'error', message })
    } finally {
      setBusyKey('')
    }
  }

  async function handleCreateTask() {
    if (!auth.currentUser || !selectedWorkspaceId) return
    const titles = splitTaskTitles(taskTitle)
    if (titles.length === 0) {
      showToast({ type: 'error', message: 'Task title is required.' })
      return
    }
    if (!visibleWorkspaceProjects[0] && selectedProjectId === 'all') {
      showToast({ type: 'error', message: 'Create a project first.' })
      return
    }
    const targetProject = selectedProjectId !== 'all'
      ? visibleWorkspaceProjects.find((item) => item.id === selectedProjectId) || null
      : selectedNoteProject || visibleWorkspaceProjects[0] || null
    const targetProjectId = targetProject?.id || ''
    if (!targetProjectId) {
      showToast({ type: 'error', message: 'Pick a project for the task.' })
      return
    }
    const allowedAssigneeUids = new Set((assignableMembersByProjectId[targetProjectId] || workspaceAssignableMembers).map((item) => item.uid))
    const assigneeUid = taskAssigneeUid || auth.currentUser.uid
    const initialTaskNotifyUids = normalizeMemberUids([...(targetProject?.memberUids || []), assigneeUid]).filter((uid) => uid !== auth.currentUser?.uid)
    const initialTaskNotifyMode = initialTaskNotifyUids.length > 0 ? 'selected' : 'all'
    if (assigneeUid && !isPrivilegedMember && !allowedAssigneeUids.has(assigneeUid)) {
      showToast({ type: 'error', message: 'Assignee must be a member of the selected project.' })
      return
    }
    setBusyKey('task')
    try {
      const baseSortOrder = getNextTaskSortOrder(tasks, selectedWorkspaceId, taskStatus)
      const createdTaskIds: string[] = []
      if (titles.length > 1) {
        setBatchCreateProgress({ total: titles.length, created: 0, source: 'dialog' })
      }
      for (const [index, title] of titles.entries()) {
        const taskId = await createWorkhubTask({
          workspaceId: selectedWorkspaceId,
          projectId: targetProjectId,
          sortOrder: baseSortOrder + index,
          title,
          description: taskDescription.trim(),
          visibility: targetProject?.visibility || 'workspace',
          memberUids: targetProject?.memberUids || [],
          status: taskStatus,
          priority: taskPriority,
          assigneeUid,
          startDate: taskStartDate,
          dueDate: taskDueDate,
          notifyMode: initialTaskNotifyMode,
          notifyUids: initialTaskNotifyUids,
          createdBy: auth.currentUser.uid,
        })
        createdTaskIds.push(taskId)
        if (titles.length > 1) {
          setBatchCreateProgress({ total: titles.length, created: index + 1, source: 'dialog' })
        }
        await createWorkhubActivity({
          workspaceId: selectedWorkspaceId,
          actorUid: auth.currentUser.uid,
          entityType: 'task',
          entityId: taskId,
          action: 'create',
          message: `Created task ${title}`,
          visibility: targetProject?.visibility || 'workspace',
          memberUids: targetProject?.memberUids || [],
        })
        await createWorkhubNotifications({
          workspaceId: selectedWorkspaceId,
          actorUid: auth.currentUser.uid,
          recipientUids: resolveCreatedTaskNotificationRecipients({
            visibility: targetProject?.visibility || 'workspace',
            memberUids: targetProject?.memberUids || [],
            projectMemberUids: targetProject?.memberUids || [],
            assigneeUid,
            createdBy: auth.currentUser.uid,
          }),
          entityType: 'task',
          entityId: taskId,
          action: 'create',
          message: `created task \"${title}\"`,
        })
      }
      setTaskTitle('')
      setTaskDescription('')
      setTaskStatus(defaultTaskStatusId)
      setTaskPriority('medium')
      setTaskAssigneeUid(auth.currentUser.uid)
      const today = getCurrentDateInputValue()
      setTaskStartDate(today)
      setTaskDueDate(shiftDateInputValue(today, 1))
      if (createdTaskIds.length > 0) {
        setSelectedTaskId(createdTaskIds[createdTaskIds.length - 1])
      }
      setCreateDialogOpen(false)
      setActiveSection('tasks')
      showToast({
        type: 'success',
        message: createdTaskIds.length === 1 ? 'Task created.' : `${createdTaskIds.length} tasks created.`,
      })
      if (titles.length > 1) {
        window.setTimeout(() => setBatchCreateProgress(null), 400)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not create task.'
      showToast({ type: 'error', message })
      setBatchCreateProgress(null)
    } finally {
      setBusyKey('')
    }
  }

  async function handleQuickAddTask(input: QuickAddTaskSubmitInput) {
    if (!auth.currentUser || !selectedWorkspaceId) return
    const titles = splitTaskTitles(input.title)
    if (titles.length === 0) return false
    const resolvedProjectId = input.projectId || (selectedProjectId !== 'all' ? selectedProjectId : selectedNoteProject?.id || visibleWorkspaceProjects[0]?.id || '')
    const targetProject = visibleWorkspaceProjects.find((item) => item.id === resolvedProjectId) || null
    if (!targetProject) {
      showToast({ type: 'error', message: 'Select a project first.' })
      return false
    }
    const allowedAssigneeUids = new Set((assignableMembersByProjectId[targetProject.id] || workspaceAssignableMembers).map((item) => item.uid))
    const assigneeUid = input.assigneeUid || auth.currentUser.uid
    const initialTaskNotifyUids = normalizeMemberUids([...(targetProject.memberUids || []), assigneeUid]).filter((uid) => uid !== auth.currentUser?.uid)
    const initialTaskNotifyMode = initialTaskNotifyUids.length > 0 ? 'selected' : 'all'
    if (assigneeUid && !isPrivilegedMember && !allowedAssigneeUids.has(assigneeUid)) {
      showToast({ type: 'error', message: 'Assignee must be a member of the selected project.' })
      return false
    }
    try {
      const baseSortOrder = getNextTaskSortOrder(tasks, selectedWorkspaceId, input.statusId)
      const createdTaskIds: string[] = []
      if (titles.length > 1) {
        setBatchCreateProgress({ total: titles.length, created: 0, source: 'quick-add' })
      }
      for (const [index, title] of titles.entries()) {
        const taskId = await createWorkhubTask({
          workspaceId: selectedWorkspaceId,
          projectId: targetProject.id,
          sortOrder: baseSortOrder + index,
          title,
          description: '',
          visibility: targetProject.visibility || 'workspace',
          memberUids: targetProject.memberUids || [],
          status: input.statusId as WorkhubTaskStatus,
          priority: input.priority,
          assigneeUid,
          startDate: getCurrentDateInputValue(),
          dueDate: input.dueDate || shiftDateInputValue(getCurrentDateInputValue(), 1),
          valueAmount: selectedWorkspaceScopeType === 'finance' ? input.valueAmount : undefined,
          valueCurrency: selectedWorkspaceScopeType === 'finance' ? (input.valueCurrency || 'OMR') : undefined,
          notifyMode: initialTaskNotifyMode,
          notifyUids: initialTaskNotifyUids,
          createdBy: auth.currentUser.uid,
        })
        createdTaskIds.push(taskId)
        if (titles.length > 1) {
          setBatchCreateProgress({ total: titles.length, created: index + 1, source: 'quick-add' })
        }
        await createWorkhubActivity({
          workspaceId: selectedWorkspaceId,
          actorUid: auth.currentUser.uid,
          entityType: 'task',
          entityId: taskId,
          action: 'create',
          message: `Created task ${title}`,
          visibility: targetProject.visibility || 'workspace',
          memberUids: targetProject.memberUids || [],
        })
        await createWorkhubNotifications({
          workspaceId: selectedWorkspaceId,
          actorUid: auth.currentUser.uid,
          recipientUids: resolveCreatedTaskNotificationRecipients({
            visibility: targetProject.visibility || 'workspace',
            memberUids: targetProject.memberUids || [],
            projectMemberUids: targetProject.memberUids || [],
            assigneeUid,
            createdBy: auth.currentUser.uid,
          }),
          entityType: 'task',
          entityId: taskId,
          action: 'create',
          message: `created task \"${title}\"`,
        })
      }
      if (createdTaskIds.length > 0) {
        setSelectedTaskId(createdTaskIds[createdTaskIds.length - 1])
      }
      setActiveSection('tasks')
      if (createdTaskIds.length > 1) {
        showToast({ type: 'success', message: `${createdTaskIds.length} tasks created.` })
        window.setTimeout(() => setBatchCreateProgress(null), 400)
      }
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not create task.'
      showToast({ type: 'error', message })
      setBatchCreateProgress(null)
      return false
    }
  }

  async function handleTaskUpdate(task: WorkhubTask, updates: Partial<WorkhubTask>, options?: { silent?: boolean }) {
    if (!auth.currentUser) return
    if (typeof updates.assigneeUid === 'string' && updates.assigneeUid !== task.assigneeUid && updates.assigneeUid && !isPrivilegedMember) {
      const allowedAssignees = assignableMembersByProjectId[task.projectId] || workspaceAssignableMembers
      if (!allowedAssignees.some((item) => item.uid === updates.assigneeUid)) {
        showToast({ type: 'error', message: 'Assignee must be a member of this project.' })
        return
      }
    }
    setBusyKey('task')
    const nextUpdates = { ...updates }
    if (updates.status && updates.status !== task.status && typeof nextUpdates.sortOrder !== 'number') {
      nextUpdates.sortOrder = getNextTaskSortOrder(tasks, selectedWorkspaceId, updates.status)
    }
    const previousTaskSnapshot = task
    setTasks((current) => current.map((item) => {
      if (item.id !== task.id) return item
      return {
        ...item,
        ...nextUpdates,
        updatedAt: new Date().toISOString(),
      }
    }))
    try {
      await updateWorkhubTask(task.id, nextUpdates)
      const changedLabels: string[] = []
      if (typeof updates.status === 'string' && updates.status !== task.status) changedLabels.push('status')
      if (typeof updates.priority === 'string' && updates.priority !== task.priority) changedLabels.push('priority')
      if (typeof updates.assigneeUid === 'string' && updates.assigneeUid !== task.assigneeUid) changedLabels.push('assignee')
      if (typeof updates.dueDate === 'string' && updates.dueDate !== task.dueDate) changedLabels.push('due date')
      if (typeof updates.title === 'string' && updates.title.trim() !== task.title.trim()) changedLabels.push('title')
      if (changedLabels.length > 0 && selectedWorkspaceId) {
        const assigneeChanging = typeof updates.assigneeUid === 'string' && updates.assigneeUid !== task.assigneeUid
        const otherLabels = changedLabels.filter((l) => l !== 'assignee')

        // Broadcast non-assignee changes to normal stakeholders
        if (otherLabels.length > 0) {
          const nextStatus = typeof updates.status === 'string' ? updates.status : task.status
          const normalizedStatus = nextStatus.toLowerCase()
          const resolved = normalizedStatus.includes('done') || normalizedStatus.includes('complete') || normalizedStatus.includes('resolved')
          const updateSummary = resolved && updates.status && updates.status !== task.status
            ? `resolved task \"${task.title}\"`
            : `updated ${otherLabels.join(', ')} on task \"${task.title}\"`
          // Strip assigneeUid from updates so the new assignee is not injected into the broadcast recipients
          const { assigneeUid: _drop, ...updatesForBroadcast } = updates
          await createWorkhubNotifications({
            workspaceId: selectedWorkspaceId,
            actorUid: auth.currentUser.uid,
            recipientUids: resolveTaskNotificationRecipients(task, assigneeChanging ? updatesForBroadcast : updates),
            entityType: 'task',
            entityId: task.id,
            action: resolved ? 'task_resolved' : 'task_update',
            message: updateSummary,
          })
        }

        // Only notify the newly assigned user — no one else needs to know about assignee changes
        if (assigneeChanging && updates.assigneeUid) {
          await createWorkhubNotifications({
            workspaceId: selectedWorkspaceId,
            actorUid: auth.currentUser.uid,
            recipientUids: [updates.assigneeUid],
            entityType: 'task',
            entityId: task.id,
            action: 'task_update',
            message: `assigned you to task \"${task.title}\"`,
          })
        }
      }
      if (!options?.silent) {
        showToast({ type: 'success', message: 'Task updated.' })
      }
      // Clear selected task if it moved to a different status tab
      if (updates.status && updates.status !== task.status) {
        setSelectedTaskId('')
      }
    } catch (error) {
      setTasks((current) => current.map((item) => (item.id === task.id ? previousTaskSnapshot : item)))
      const message = error instanceof Error ? error.message : 'Could not update task.'
      showToast({ type: 'error', message })
    } finally {
      setBusyKey('')
    }
  }

  function clearTaskSelection() {
    setSelectedTaskIds([])
    setBulkStatusMenuOpen(false)
  }

  async function handleBulkStatusChange(statusId: WorkhubTaskStatus) {
    if (!auth.currentUser || !selectedWorkspaceId || selectedTasks.length === 0) return
    setBusyKey('bulk-task')
    try {
      const baseSortOrder = getNextTaskSortOrder(tasks, selectedWorkspaceId, statusId)
      await Promise.all(selectedTasks.map((task, index) => {
        const patch: Partial<WorkhubTask> = { status: statusId }
        if (task.status !== statusId) patch.sortOrder = baseSortOrder + index
        return updateWorkhubTask(task.id, patch)
      }))
      await createWorkhubActivity({
        workspaceId: selectedWorkspaceId,
        actorUid: auth.currentUser.uid,
        entityType: 'task',
        entityId: selectedTasks[0].id,
        action: 'bulk_status_update',
        message: `Moved ${selectedTasks.length} task${selectedTasks.length === 1 ? '' : 's'} to ${workspaceTaskStatuses.find((item) => item.id === statusId)?.label || statusId}`,
      })
      await createWorkhubNotifications({
        workspaceId: selectedWorkspaceId,
        actorUid: auth.currentUser.uid,
        recipientUids: normalizeMemberUids(selectedTasks.flatMap((task) => resolveTaskNotificationRecipients(task, { status: statusId }))),
        entityType: 'task',
        entityId: selectedTasks[0].id,
        action: 'bulk_status_update',
        message: `moved ${selectedTasks.length} task${selectedTasks.length === 1 ? '' : 's'} to ${workspaceTaskStatuses.find((item) => item.id === statusId)?.label || statusId}`,
      })
      showToast({ type: 'success', message: `Updated ${selectedTasks.length} task${selectedTasks.length === 1 ? '' : 's'}.` })
      clearTaskSelection()
      setSelectedTaskId('')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not update selected tasks.'
      showToast({ type: 'error', message })
    } finally {
      setBusyKey('')
    }
  }

  async function handleBulkDeleteSelected() {
    if (!auth.currentUser || !selectedWorkspaceId || selectedTasks.length === 0) return
    setBusyKey('bulk-task')
    try {
      await Promise.all(selectedTasks.map((task) => deleteWorkhubTask(task.id)))
      await createWorkhubActivity({
        workspaceId: selectedWorkspaceId,
        actorUid: auth.currentUser.uid,
        entityType: 'task',
        entityId: selectedTasks[0].id,
        action: 'bulk_delete',
        message: `Deleted ${selectedTasks.length} task${selectedTasks.length === 1 ? '' : 's'}`,
      })
      showToast({ type: 'success', message: `Deleted ${selectedTasks.length} task${selectedTasks.length === 1 ? '' : 's'}.` })
      clearTaskSelection()
      setSelectedTaskId('')
      setBulkDeleteConfirmOpen(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not delete selected tasks.'
      showToast({ type: 'error', message })
    } finally {
      setBusyKey('')
    }
  }

  async function handleDeleteSingleTask(task: WorkhubTask) {
    if (!auth.currentUser || !selectedWorkspaceId) return
    setBusyKey('task-delete')
    try {
      await deleteWorkhubTask(task.id)
      await createWorkhubActivity({
        workspaceId: selectedWorkspaceId,
        actorUid: auth.currentUser.uid,
        entityType: 'task',
        entityId: task.id,
        action: 'delete',
        message: `Deleted task ${task.title || 'Untitled task'}`,
      })
      showToast({ type: 'success', message: 'Task deleted.' })
      setSelectedTaskIds((current) => current.filter((id) => id !== task.id))
      setSelectedTaskId('')
      setTaskDeleteConfirmOpen(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not delete task.'
      showToast({ type: 'error', message })
    } finally {
      setBusyKey('')
    }
  }

  async function handleAddComment(nextCommentBody: string) {
    const normalizedCommentBody = nextCommentBody.trim()
    if (!auth.currentUser || !selectedDiscussionTarget || !normalizedCommentBody) return
    setBusyKey('comment')
    try {
      await addWorkhubComment({
        workspaceId: selectedDiscussionTarget.workspaceId,
        entityType: selectedDiscussionTarget.entityType,
        entityId: selectedDiscussionTarget.entityId,
        authorUid: auth.currentUser.uid,
        body: normalizedCommentBody,
      })
      await createWorkhubActivity({
        workspaceId: selectedDiscussionTarget.workspaceId,
        actorUid: auth.currentUser.uid,
        entityType: 'comment',
        entityId: selectedDiscussionTarget.entityId,
        action: 'comment',
        message: `Commented on ${selectedDiscussionTarget.label}`,
        visibility: selectedDiscussionTarget.visibility,
        memberUids: selectedDiscussionTarget.memberUids,
      })
      const notificationRecipientUids = resolveDiscussionNotificationRecipients()
      if (notificationRecipientUids.length > 0) {
        await createWorkhubNotifications({
          workspaceId: selectedDiscussionTarget.workspaceId,
          actorUid: auth.currentUser.uid,
          recipientUids: notificationRecipientUids,
          entityType: selectedDiscussionTarget.entityType === 'task' ? 'comment' : selectedDiscussionTarget.entityType,
          entityId: selectedDiscussionTarget.entityId,
          action: 'comment',
          message: `commented on \"${selectedDiscussionTarget.label}\": ${normalizedCommentBody.slice(0, 88)}${normalizedCommentBody.length > 88 ? '…' : ''}`,
          commentPreview: normalizedCommentBody,
        })
      }
      showToast({ type: 'success', message: 'Comment added.' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not add comment.'
      showToast({ type: 'error', message })
    } finally {
      setBusyKey('')
    }
  }

  function handleStartCommentEdit(comment: WorkhubTaskComment) {
    const currentUid = auth.currentUser?.uid || ''
    if (!currentUid || comment.authorUid !== currentUid) return
    setEditingCommentId(comment.id)
    setEditingCommentText(comment.body || '')
  }

  function handleCancelCommentEdit() {
    setEditingCommentId('')
    setEditingCommentText('')
  }

  async function handleSaveCommentEdit(comment: WorkhubTaskComment) {
    const currentUid = auth.currentUser?.uid || ''
    if (!currentUid || comment.authorUid !== currentUid) return
    const nextBody = editingCommentText.trim()
    if (!nextBody || nextBody === (comment.body || '').trim()) {
      handleCancelCommentEdit()
      return
    }
    setBusyKey(`comment-edit:${comment.id}`)
    try {
      await updateWorkhubComment(comment.id, { body: nextBody })
      showToast({ type: 'success', message: 'Comment updated.' })
      handleCancelCommentEdit()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not update comment.'
      showToast({ type: 'error', message })
    } finally {
      setBusyKey('')
    }
  }

  function renderDiscussionCard() {
    return (
      <WorkhubDiscussionCard
        comments={comments}
        currentUid={auth.currentUser?.uid || ''}
        memberByUid={memberByUid}
        showAuthorAvatar
        formatTime={formatTime}
        editingId={editingCommentId}
        editingText={editingCommentText}
        onEditStart={handleStartCommentEdit}
        onEditChange={setEditingCommentText}
        onEditCancel={handleCancelCommentEdit}
        onEditSave={handleSaveCommentEdit}
        editBusyKey={busyKey}
        onComposerSend={handleAddComment}
        composerBusy={busyKey === 'comment'}
        notifyMode={discussionNotifyMode}
        notifyUids={discussionNotifyUids}
        notifyCandidates={discussionNotifyCandidates}
        onNotifyModeChange={setDiscussionNotifyMode}
        onNotifyUidsChange={setDiscussionNotifyUids}
      />
    )
  }

  async function handleMemberModeration(targetUid: string, status: 'approved' | 'suspended', role?: 'member' | 'manager' | 'admin') {
    setBusyKey(`member:${targetUid}:${status}`)
    try {
      const updated = await setWorkhubMemberStatus({ uid: targetUid, status, role })
      if (auth.currentUser && updated.status === 'approved' && selectedWorkspaceId) {
        await createWorkhubActivity({
          workspaceId: selectedWorkspaceId,
          actorUid: auth.currentUser.uid,
          entityType: 'member',
          entityId: targetUid,
          action: status,
          message: `${updated.displayName || updated.email} was ${status}`,
        })
        await createWorkhubNotifications({
          workspaceId: selectedWorkspaceId,
          actorUid: auth.currentUser.uid,
          recipientUids: [targetUid],
          entityType: 'member',
          entityId: targetUid,
          action: status,
          message: `your membership was ${status}`,
        })
      }
      showToast({ type: 'success', message: `Member ${status}.` })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not update member.'
      showToast({ type: 'error', message })
    } finally {
      setBusyKey('')
    }
  }

  async function handleSignOut() {
    markSignOut()
    await signOut(auth)
    navigate('/login', { replace: true, state: { signedOut: true } })
  }

  async function handleSaveProjectAccess() {
    if (!auth.currentUser || !selectedWorkspaceId || !selectedAccessProject) return
    const entityLabel = selectedAccessProjectIntentMeta.subjectLabel
    const entityLabelLower = entityLabel.toLowerCase()
    const isFolderContainer = selectedAccessProjectEffectiveIntent === 'project'
    if (!settingsProjectName.trim()) {
      showToast({ type: 'error', message: `${entityLabel} name is required.` })
      return
    }
    if (!isValidHexColor(settingsProjectColor)) {
      showToast({ type: 'error', message: `Pick a valid ${entityLabelLower} color.` })
      return
    }
    if (!isFolderContainer && !settingsProjectDeadline.trim()) {
      showToast({ type: 'error', message: `${entityLabel} ${selectedAccessProjectDeadlineLabel.toLowerCase()} is required.` })
      return
    }
    if (!isFolderContainer && settingsProjectType === 'tender' && !settingsProjectSubmissionTime) {
      showToast({ type: 'error', message: `Submission time is required for ${entityLabelLower} settings.` })
      return
    }
    const settingsValueAmount = isFolderContainer
      ? resolveProjectMonetaryAmount(selectedAccessProject)
      : parseMonetaryAmountInput(settingsProjectValueAmountDraft)
    if (!isFolderContainer && settingsValueAmount === null) {
      showToast({ type: 'error', message: `${entityLabel} value must be zero or a positive number.` })
      return
    }
    const settingsValueCurrency = isFolderContainer
      ? normalizeMoneyCurrency(selectedAccessProject.valueCurrency)
      : normalizeMoneyCurrency(settingsProjectValueCurrencyDraft)
    const shouldCreateProposalDeliveryFolder = (
      selectedWorkspaceTemplateId === 'proposals_leads'
      && selectedAccessProjectEffectiveIntent === 'proposal'
      && settingsProjectStatusLabelNormalized.includes('running')
      && settingsProjectCreateDeliveryFolder
      && !!proposalProjectsWorkspace
      && !existingProposalDeliveryFolder
      && !!settingsProjectName.trim()
    )
    const memberUids = accessVisibility === 'restricted'
      ? normalizeMemberUids(accessMemberUids.length > 0 ? accessMemberUids : [selectedAccessProject.createdBy])
      : []
    const previousProjectSnapshot = selectedAccessProject
    const optimisticProjectPatch = {
      name: settingsProjectName.trim(),
      description: settingsProjectDescription.trim(),
      color: settingsProjectColor,
      parentProjectId: settingsProjectParentId || null,
      projectDeadline: settingsProjectDeadline,
      projectType: settingsProjectType,
      submissionTime: settingsProjectType === 'tender' ? settingsProjectSubmissionTime : '',
      priority: settingsProjectPriority,
      valueAmount: settingsValueAmount || 0,
      valueCurrency: settingsValueCurrency,
      mainPanelView: settingsProjectMainPanelView,
      tenderNumber: settingsProjectTenderNumber.trim(),
      proposalId: settingsProjectProposalId.trim(),
      technicalProposalUrl: settingsTechnicalProposalUrl.trim(),
      financialProposalUrl: settingsFinancialProposalUrl.trim(),
      taskItemDisplayMode: isFolderContainer ? settingsProjectTaskItemDisplayMode : (selectedAccessProject.taskItemDisplayMode || 'inherit'),
      taskStatuses: settingsProjectTaskStatuses ?? [],
      clientId: settingsProjectClientId,
      storageMethod: settingsStorageMethod,
      visibility: accessVisibility,
      memberUids,
    }
    setProjects((current) => current.map((item) => (item.id === selectedAccessProject.id ? { ...item, ...optimisticProjectPatch } : item)))
    setBusyKey(`access:${selectedAccessProject.id}`)
    try {
      await updateWorkhubProject(selectedAccessProject.id, optimisticProjectPatch)
      setSelectedProjectId(selectedAccessProject.id)
      setSelectedNoteProjectId(selectedAccessProject.id)
      await createWorkhubActivity({
        workspaceId: selectedWorkspaceId,
        actorUid: auth.currentUser.uid,
        entityType: 'project',
        entityId: selectedAccessProject.id,
        action: 'settings_update',
        message: `${entityLabel} ${settingsProjectName.trim()} settings were updated`,
        visibility: accessVisibility,
        memberUids,
      })
      await createWorkhubNotifications({
        workspaceId: selectedWorkspaceId,
        actorUid: auth.currentUser.uid,
        recipientUids: accessVisibility === 'restricted'
          ? normalizeMemberUids(memberUids)
          : normalizeMemberUids(selectedWorkspace?.accessMemberUids || []),
        entityType: 'project',
        entityId: selectedAccessProject.id,
        action: 'settings_update',
        message: `updated settings for ${entityLabelLower} "${settingsProjectName.trim()}"`,
      })
      let deliveryFolderCreated = false
      let deliveryFolderWarning = ''
      if (shouldCreateProposalDeliveryFolder && proposalProjectsWorkspace) {
        try {
          const deliveryFolderId = await createWorkhubProject({
            workspaceId: proposalProjectsWorkspace.id,
            parentProjectId: null,
            intent: 'project',
            name: settingsProjectName.trim(),
            description: `Delivery folder created from proposal "${settingsProjectName.trim()}".`,
            color: proposalDeliveryFolderColor,
            visibility: 'workspace',
            memberUids: [],
            storageMethod: 'firebase',
            projectType: 'other',
            submissionTime: '',
            priority: 'medium',
            clientId: '',
            createdBy: auth.currentUser.uid,
          })
          await createWorkhubActivity({
            workspaceId: proposalProjectsWorkspace.id,
            actorUid: auth.currentUser.uid,
            entityType: 'project',
            entityId: deliveryFolderId,
            action: 'create',
            message: `Created folder ${settingsProjectName.trim()} from proposal ${settingsProjectName.trim()}`,
          })
          ensureWorkhubDriveProjectFolder({ projectId: deliveryFolderId, projectName: settingsProjectName.trim() }).catch((error) => {
            console.error('Failed to create drive folder for delivery project:', error)
          })
          deliveryFolderCreated = true
        } catch (error) {
          deliveryFolderWarning = error instanceof Error ? error.message : 'Could not create the Projects workspace folder.'
        }
      }
      setSettingsProjectCreateDeliveryFolder(false)
      setProjectAccessDialogId('')
      if (deliveryFolderWarning) {
        showToast({ type: 'warning', message: `${entityLabel} settings updated, but the Projects workspace folder could not be created: ${deliveryFolderWarning}` })
      } else if (deliveryFolderCreated && proposalProjectsWorkspace) {
        showToast({ type: 'success', message: `${entityLabel} settings updated. A delivery folder was created in ${proposalProjectsWorkspace.name}.` })
      } else {
        showToast({ type: 'success', message: `${entityLabel} settings updated.` })
      }
    } catch (error) {
      setProjects((current) => current.map((item) => (item.id === previousProjectSnapshot.id ? previousProjectSnapshot : item)))
      const message = error instanceof Error ? error.message : `Could not update ${entityLabelLower} settings.`
      showToast({ type: 'error', message })
    } finally {
      setBusyKey('')
    }
  }

  async function handleApplyViewSettingsToSubItems() {
    if (!auth.currentUser || !selectedWorkspaceId || !selectedAccessProject) return
    if (selectedAccessProjectEffectiveIntent !== 'project') return

    const descendantProjects = workspaceProjects.filter((project) => (
      project.id !== selectedAccessProject.id && selectedAccessProjectBranchIds.has(project.id)
    ))
    if (descendantProjects.length === 0) {
      showToast({ type: 'info', message: 'No sub-items found to update.' })
      return
    }

    const folderIds = new Set(
      descendantProjects
        .filter((project) => resolveEffectiveProjectIntent(project, workspaceByIdForFiltering, selectedWorkspaceTemplateIntentSet) === 'project')
        .map((project) => project.id),
    )

    if (!window.confirm(
      `Apply current view settings to ${descendantProjects.length} sub-item${descendantProjects.length === 1 ? '' : 's'}?\n\n`
      + `Main panel default: ${settingsProjectMainPanelView}\n`
      + `Task items display mode: ${settingsProjectTaskItemDisplayMode} (applies to ${folderIds.size} folder${folderIds.size === 1 ? '' : 's'})`,
    )) {
      return
    }

    const previousProjectsSnapshot = projects
    const optimisticPatchById = new Map<string, Partial<WorkhubProject>>()
    descendantProjects.forEach((project) => {
      optimisticPatchById.set(project.id, {
        mainPanelView: settingsProjectMainPanelView,
        ...(folderIds.has(project.id) ? { taskItemDisplayMode: settingsProjectTaskItemDisplayMode } : {}),
      })
    })

    setProjects((current) => current.map((project) => {
      const patch = optimisticPatchById.get(project.id)
      return patch ? { ...project, ...patch } : project
    }))
    setBusyKey(`access-propagate:${selectedAccessProject.id}`)

    try {
      await Promise.all(descendantProjects.map((project) => {
        const patch: Partial<WorkhubProject> = { mainPanelView: settingsProjectMainPanelView }
        if (folderIds.has(project.id)) {
          patch.taskItemDisplayMode = settingsProjectTaskItemDisplayMode
        }
        return updateWorkhubProject(project.id, patch)
      }))

      await createWorkhubActivity({
        workspaceId: selectedWorkspaceId,
        actorUid: auth.currentUser.uid,
        entityType: 'project',
        entityId: selectedAccessProject.id,
        action: 'settings_propagate',
        message: `Applied view settings from ${selectedAccessProject.name} to ${descendantProjects.length} sub-item${descendantProjects.length === 1 ? '' : 's'}`,
      })
      showToast({ type: 'success', message: `View settings applied to ${descendantProjects.length} sub-item${descendantProjects.length === 1 ? '' : 's'}.` })
    } catch (error) {
      setProjects(previousProjectsSnapshot)
      const message = error instanceof Error ? error.message : 'Could not apply view settings to sub-items.'
      showToast({ type: 'error', message })
    } finally {
      setBusyKey('')
    }
  }

  async function handleEnsureDriveFolder() {
    if (!selectedAccessProject) return
    setBusyKey(`drive:${selectedAccessProject.id}`)
    try {
      await ensureWorkhubDriveProjectFolder({
        projectId: selectedAccessProject.id,
        projectName: selectedAccessProject.name,
      })
      showToast({ type: 'success', message: 'Drive folder created successfully.' })
    } catch (error) {
      console.error('Error creating drive folder:', error)
      const message = error instanceof Error ? error.message : 'Could not create Drive folder.'
      showToast({ type: 'error', message })
    } finally {
      setBusyKey('')
    }
  }

  async function handleDeleteProject() {
    if (!auth.currentUser || !selectedWorkspaceId || !selectedAccessProject) return
    const entityLabel = selectedAccessProjectIntentMeta.subjectLabel
    const entityLabelLower = entityLabel.toLowerCase()
    if (selectedAccessProjectChildCount > 0) {
      showToast({ type: 'error', message: 'Move or delete child items first.' })
      return
    }
    if (selectedAccessProjectTaskCount > 0) {
      showToast({ type: 'error', message: `Move or delete ${entityLabelLower} tasks first.` })
      return
    }
    if (!window.confirm(`Delete ${entityLabelLower} "${selectedAccessProject.name}"?`)) {
      return
    }
    setBusyKey(`delete:${selectedAccessProject.id}`)
    try {
      await deleteWorkhubProject(selectedAccessProject.id)
      await createWorkhubActivity({
        workspaceId: selectedWorkspaceId,
        actorUid: auth.currentUser.uid,
        entityType: 'project',
        entityId: selectedAccessProject.id,
        action: 'delete',
        message: `Deleted ${entityLabelLower} ${selectedAccessProject.name}`,
      })
      if (selectedProjectId === selectedAccessProject.id) setSelectedProjectId('all')
      if (selectedNoteProjectId === selectedAccessProject.id) setSelectedNoteProjectId('')
      setProjectAccessDialogId('')
      showToast({ type: 'success', message: `${entityLabel} deleted.` })
    } catch (error) {
      const message = error instanceof Error ? error.message : `Could not delete ${entityLabelLower}.`
      showToast({ type: 'error', message })
    } finally {
      setBusyKey('')
    }
  }

  function closeStatusDialog() {
    setStatusDialogOpen(false)
    setStatusDrafts([])
    setSelectedStatusDraftId('')
  }

  function handleStatusDraftChange(statusId: string, patch: Partial<WorkhubTaskStatusConfig>) {
    setStatusDrafts((current) => current.map((item) => item.id === statusId ? { ...item, ...patch } : item))
  }

  function handleDeleteTaskStatusDraft(statusId: string) {
    const usageCount = taskCountByStatus[statusId] || 0
    if (usageCount > 0) {
      showToast({ type: 'error', message: 'Move tasks out of this status before deleting it.' })
      return
    }
    if (statusDrafts.length <= 1) {
      showToast({ type: 'error', message: 'Keep at least one task status.' })
      return
    }
    setStatusDrafts((current) => {
      const next = current.filter((item) => item.id !== statusId)
      if (selectedStatusDraftId === statusId) {
        setSelectedStatusDraftId(next[0]?.id || '')
      }
      return next
    })
    if (selectedTaskStatusTab === statusId) setSelectedTaskStatusTab('all')
    if (taskStatus === statusId) setTaskStatus(defaultTaskStatusId)
  }

  function handleAddTaskStatusDraft() {
    const n = statusDrafts.length + 1
    const label = `New Status ${n}`
    const color = PROJECT_COLORS[statusDrafts.length % PROJECT_COLORS.length]
    const statusId = makeTaskStatusId(label)
    setStatusDrafts((current) => [...current, { id: statusId, label, color }])
    setSelectedStatusDraftId(statusId)
  }

  async function handleSaveTaskStatuses() {
    if (!auth.currentUser || !selectedWorkspaceId) return
    if (statusDrafts.length === 0) {
      showToast({ type: 'error', message: 'Add at least one status.' })
      return
    }
    if (statusDrafts.some((item) => !item.label.trim())) {
      showToast({ type: 'error', message: 'Every status needs a name.' })
      return
    }
    if (statusDrafts.some((item) => !isValidHexColor(item.color))) {
      showToast({ type: 'error', message: 'Every status needs a valid color.' })
      return
    }
    const ids = statusDrafts.map((item) => item.id)
    if (new Set(ids).size !== ids.length) {
      showToast({ type: 'error', message: 'Status ids must be unique.' })
      return
    }

    const previousWorkspaceSnapshot = workspaces.find((item) => item.id === selectedWorkspaceId) || null
    const updatedStatuses = statusDrafts.map((item) => ({ ...item, label: item.label.trim() }))
    setWorkspaces((current) => current.map((item) => (item.id === selectedWorkspaceId ? { ...item, taskStatuses: updatedStatuses } : item)))
    setBusyKey('status')
    try {
      await updateWorkhubWorkspace(selectedWorkspaceId, { taskStatuses: updatedStatuses })
      await createWorkhubActivity({
        workspaceId: selectedWorkspaceId,
        actorUid: auth.currentUser.uid,
        entityType: 'workspace',
        entityId: selectedWorkspaceId,
        action: 'status_update',
        message: 'Updated task statuses',
      })
      if (!updatedStatuses.some((item) => item.id === selectedTaskStatusTab) && selectedTaskStatusTab !== 'all') {
        setSelectedTaskStatusTab('all')
      }
      if (!updatedStatuses.some((item) => item.id === taskStatus)) {
        setTaskStatus(updatedStatuses[0]?.id || defaultTaskStatusId)
      }
      showToast({ type: 'success', message: 'Task statuses updated.' })
      closeStatusDialog()
    } catch (error) {
      if (previousWorkspaceSnapshot) {
        setWorkspaces((current) => current.map((item) => (item.id === previousWorkspaceSnapshot.id ? previousWorkspaceSnapshot : item)))
      }
      const message = error instanceof Error ? error.message : 'Could not update task statuses.'
      showToast({ type: 'error', message })
    } finally {
      setBusyKey('')
    }
  }

  function handleTaskStartDateChange(value: string) {
    setTaskStartDate(value)
    const suggestedDueDate = shiftDateInputValue(value, 1)
    if (!suggestedDueDate) return
    setTaskDueDate((current) => {
      if (!current) return suggestedDueDate
      if (current <= value) return suggestedDueDate
      return current
    })
  }

  function openCreateTaskDialog(projectId = '') {
    setQuickAddOpen(false)
    if (projectId) {
      setSelectedProjectId(projectId)
      setSelectedNoteProjectId(projectId)
    }
    const today = getCurrentDateInputValue()
    setTaskStartDate(today)
    setTaskDueDate(shiftDateInputValue(today, 1))
    setCreateDialogType('task')
    setCreateDialogOpen(true)
  }

  function openCreateProjectDialog(
    parentId = '',
  ) {
    setQuickAddOpen(false)
    setProjectParentId(parentId)
    setProjectType('other')
    setProjectStartDate('')
    setProjectDeadline('')
    setProjectSubmissionTime('')
    setProjectPriority('medium')
    setProjectClientId('')
    setCreateDialogType('project')
    setCreateDialogOpen(true)
  }

  function openTemplateCreateDialog(intent: WorkhubTemplateCreationIntent, parentProjectId = '') {
    setQuickAddOpen(false)
    setTemplateCreateIntent(intent)
    setTemplateCreateParentProjectId(parentProjectId)
    setTemplateCreateDraft(buildInitialTemplateCreationDraft(intent))
    setTemplateCreateDialogOpen(true)
  }

  function openWorkspaceTypeCreateDialog(intent: WorkhubTemplateCreationIntent, parentProjectId = '') {
    if (intent === 'project') {
      openCreateProjectDialog(parentProjectId)
      return
    }
    openTemplateCreateDialog(intent, parentProjectId)
  }

  function closeTemplateCreateDialog() {
    setTemplateCreateDialogOpen(false)
    setTemplateCreateIntent(null)
    setTemplateCreateParentProjectId('')
  }

  async function handleCreateTemplateEntity() {
    if (!auth.currentUser || !selectedWorkspaceId || !templateCreateIntent) return

    const draft = templateCreateDraft
    const name = draft.name.trim()
    if (!name) {
      showToast({ type: 'error', message: 'Name is required.' })
      return
    }

    const requireField = (value: string, message: string): boolean => {
      if (value.trim()) return true
      showToast({ type: 'error', message })
      return false
    }

    switch (templateCreateIntent) {
      case 'project':
        if (!requireField(draft.deadline, 'Project deadline is required.')) return
        break
      case 'proposal':
        if (!requireField(draft.clientId, 'Proposal client is required.')) return
        if (!requireField(draft.tenderNumber, 'Tender / RFP number is required for proposals.')) return
        if (!requireField(draft.proposalId, 'Our proposal ID is required for proposals.')) return
        if (!requireField(draft.deadline, 'Submission date is required for proposals.')) return
        if (!requireField(draft.submissionTime, 'Submission time is required for proposals.')) return
        break
      case 'lead':
        if (!requireField(draft.leadSource, 'Lead source is required.')) return
        if (!requireField(draft.deadline, 'Expected close date is required.')) return
        break
      case 'finance_invoice_stream':
        if (!requireField(draft.billingCycle, 'Billing cycle is required.')) return
        if (!requireField(draft.deadline, 'First due date is required.')) return
        if (!requireField(draft.paymentOwner, 'Approval owner is required.')) return
        break
      case 'finance_payment_cycle':
        if (!requireField(draft.deadline, 'Disbursement date is required.')) return
        if (!requireField(draft.paymentOwner, 'Approval owner is required.')) return
        break
      case 'marketing_campaign':
        if (!requireField(draft.campaignObjective, 'Campaign objective is required.')) return
        if (!requireField(draft.campaignChannel, 'Campaign channel is required.')) return
        if (!requireField(draft.startDate, 'Launch date is required.')) return
        if (!requireField(draft.deadline, 'Campaign end date is required.')) return
        break
      case 'marketing_content_stream':
        if (!requireField(draft.campaignChannel, 'Content channel is required.')) return
        if (!requireField(draft.cadence, 'Content cadence is required.')) return
        if (!requireField(draft.startDate, 'Content stream start date is required.')) return
        if (!requireField(draft.deadline, 'Target date is required.')) return
        break
      case 'hr_requisition':
        if (!requireField(draft.department, 'Department is required.')) return
        if (!requireField(draft.hiringManager, 'Hiring manager is required.')) return
        if (!requireField(draft.deadline, 'Target hire date is required.')) return
        break
      case 'hr_onboarding_track':
        if (!requireField(draft.onboardingOwner, 'Onboarding owner is required.')) return
        if (!requireField(draft.startDate, 'Onboarding start date is required.')) return
        if (!requireField(draft.deadline, 'Completion target is required.')) return
        break
      default:
        break
    }

    if (draft.startDate.trim() && draft.deadline.trim() && isStartAfterEnd(draft.startDate.trim(), draft.deadline.trim())) {
      showToast({ type: 'error', message: getTemplateDateRangeValidationMessage(templateCreateIntent) })
      return
    }

    const intentMeta = getTemplateCreationIntentMeta(templateCreateIntent, selectedWorkspaceTemplateId)
    const projectType = intentMeta.defaults.projectType
    const description = buildTemplateCreationDescription(templateCreateIntent, draft)
    const projectSubject = intentMeta.subjectLabel
    const resolvedParentProjectId = templateCreateParentProjectId || (selectedProjectId !== 'all' ? selectedProjectId : '')

    setBusyKey('template-create')
    try {
      const projectColorPool = selectedWorkspaceProjectColorOptions.length > 0 ? selectedWorkspaceProjectColorOptions : PROJECT_COLORS
      const projectId = await createWorkhubProject({
        workspaceId: selectedWorkspaceId,
        parentProjectId: resolvedParentProjectId || null,
        intent: templateCreateIntent,
        name,
        description,
        color: projectColorPool[(Math.floor(Math.random() * projectColorPool.length))],
        visibility: 'workspace',
        memberUids: [],
        storageMethod: 'firebase',
        projectStartDate: draft.startDate.trim(),
        projectDeadline: draft.deadline.trim(),
        projectType,
        submissionTime: templateCreateIntent === 'proposal' ? draft.submissionTime.trim() : '',
        tenderNumber: templateCreateIntent === 'proposal' ? draft.tenderNumber.trim() : '',
        proposalId: templateCreateIntent === 'proposal' ? draft.proposalId.trim() : '',
        priority: draft.priority,
        clientId: draft.clientId.trim(),
        createdBy: auth.currentUser.uid,
      })

      await createWorkhubActivity({
        workspaceId: selectedWorkspaceId,
        actorUid: auth.currentUser.uid,
        entityType: 'project',
        entityId: projectId,
        action: 'create',
        message: `Created ${projectSubject} ${name}`,
      })

      ensureWorkhubDriveProjectFolder({ projectId, projectName: name }).catch((error) => {
        console.error('Failed to create drive folder:', error)
      })

      setSelectedProjectId(projectId)
      setSelectedNoteProjectId(projectId)
      setActiveSection('home')
      closeTemplateCreateDialog()
      const workspaceName = selectedWorkspace?.name?.trim() || 'current workspace'
      showToast({ type: 'success', message: `${projectSubject} created in ${workspaceName}.` })
    } catch (error) {
      const message = error instanceof Error ? error.message : `Could not create ${projectSubject.toLowerCase()}.`
      showToast({ type: 'error', message })
    } finally {
      setBusyKey('')
    }
  }

  function focusQuickAddInline(projectId?: string) {
    if (projectId) {
      setSelectedProjectId(projectId)
      setSelectedNoteProjectId(projectId)
    }
    const statusId = workspaceTaskStatuses.find((item) => item.id === 'backlog')?.id || workspaceTaskStatuses[0]?.id || defaultTaskStatusId
    setQuickAddFocusStatusId(statusId)
    setQuickAddFocusTrigger((n) => n + 1)
    setActiveSection('tasks')
  }

  function openCreateWorkspaceDialog() {
    setQuickAddOpen(false)
    setWorkspaceCreateDialogOpen(true)
  }

  function openGlobalFinder() {
    setQuickAddOpen(false)
    setNotificationMenuOpen(false)
    setAccountMenuOpen(false)
    setGlobalFinderQuery('')
    setGlobalFinderActiveIndex(0)
    setGlobalFinderOpen(true)
  }

  function closeGlobalFinder() {
    setGlobalFinderOpen(false)
    setGlobalFinderQuery('')
    setGlobalFinderActiveIndex(0)
  }

  function handleGlobalFinderSelect(entry: WorkhubEntityFinderEntry) {
    setSelectedWorkspaceId(entry.workspaceId)
    setSelectedProjectId(entry.projectId)
    setSelectedNoteProjectId(entry.projectId)
    setSelectedTaskId('')
    setActiveSection(resolveProjectMainPanelSection(entry.projectId))
    setProjectsGroupExpanded(true)
    setSidebarCollapsed(false)
    closeGlobalFinder()
  }

  function handleSelectDocumentFromTree(documentId: string) {
    const document = workspaceDocumentById[documentId]
    if (!document) return
    const nextProjectId = document.projectId && visibleProjectIds.has(document.projectId)
      ? document.projectId
      : 'all'
    if (document.projectId) {
      const lineage = collectProjectLineage(document.projectId, workspaceProjectById)
      setExpandedProjectIds((current) => Array.from(new Set([...current, ...lineage])))
    }
    setSelectedProjectId(nextProjectId)
    setSelectedNoteProjectId(document.projectId || '')
    setSelectedTaskId('')
    setSelectedDocumentId(document.id)
    setSelectedMoodBoardId('')
    setActiveSection('notes')
    setProjectsGroupExpanded(true)
    setSidebarCollapsed(false)
    closeActionMenu()
  }

  const handleMobileWorkspaceChange = useCallback((workspaceId: string) => {
    setGearMenuOpen(false)
    if (workspaceId !== selectedWorkspaceId) {
      navigateToRememberedWorkspaceRoute(workspaceId)
    }
    setMobileWorkspacePanelOpen(true)
  }, [navigateToRememberedWorkspaceRoute, selectedWorkspaceId])

  const handleMobileWorkspaceOverviewSelect = useCallback(() => {
    setGearMenuOpen(false)
    navigateToWorkspaceSection('dashboard')
    closeMobileWorkspacePanel()
  }, [navigateToWorkspaceSection, closeMobileWorkspacePanel])

  const handleMobileProjectSelect = useCallback((projectId: string) => {
    setGearMenuOpen(false)
    // On mobile, always navigate to the explicit tasks section URL so the
    // section is encoded in the URL (kind='workspace') rather than inferred
    // from the project's Firestore mainPanelView. This guarantees a visible
    // content change regardless of how each project is configured.
    setSelectedProjectId(projectId)
    setSelectedNoteProjectId('')
    setSelectedDocumentId('')
    setSelectedTaskId('')
    setSelectedMoodBoardId('')
    setActiveSection('tasks')
    setActiveWorkspaceTab('tasks')
    setProjectsGroupExpanded(true)
    setSidebarCollapsed(false)
    if (selectedWorkspaceId) {
      navigate(`/workhub/w/${encodeURIComponent(selectedWorkspaceId)}/s/tasks?p=${encodeURIComponent(projectId)}`)
    }
    closeMobileWorkspacePanel()
  }, [closeMobileWorkspacePanel, navigate, selectedWorkspaceId, setGearMenuOpen, setSelectedProjectId, setSelectedNoteProjectId, setSelectedDocumentId, setSelectedTaskId, setSelectedMoodBoardId, setActiveSection, setActiveWorkspaceTab, setProjectsGroupExpanded, setSidebarCollapsed])

  const handleMobileDocumentSelect = useCallback((documentId: string) => {
    setGearMenuOpen(false)
    handleSelectDocumentFromTree(documentId)
    closeMobileWorkspacePanel()
  }, [handleSelectDocumentFromTree, closeMobileWorkspacePanel])

  const handleSelectMoodBoardFromTree = useCallback((boardId: string) => {
    const board = workspaceMoodBoards.find((item) => item.id === boardId)
    if (board?.entityType === 'project' && board.entityId) {
      const lineage = collectProjectLineage(board.entityId, workspaceProjectById)
      if (lineage.length > 0) {
        setExpandedProjectIds((current) => Array.from(new Set([...current, ...lineage])))
      }
      if (visibleProjectIds.has(board.entityId)) {
        setSelectedProjectId(board.entityId)
      }
      setSelectedNoteProjectId(board.entityId)
    }
    if (board?.entityType === 'workspace') {
      setSelectedProjectId('all')
      setSelectedNoteProjectId('')
    }
    setSelectedMoodBoardId(boardId)
    setSelectedDocumentId('')
    setSelectedTaskId('')
    setActiveSection('moodboard')
    setProjectsGroupExpanded(true)
    setSidebarCollapsed(false)
    closeActionMenu()
  }, [closeActionMenu, visibleProjectIds, workspaceMoodBoards, workspaceProjectById])

  const handleMobileMoodBoardSelect = useCallback((boardId: string) => {
    setGearMenuOpen(false)
    handleSelectMoodBoardFromTree(boardId)
    closeMobileWorkspacePanel()
  }, [handleSelectMoodBoardFromTree, closeMobileWorkspacePanel])

  function resolveTaskNotificationRecipients(task: WorkhubTask, updates?: Partial<WorkhubTask>) {
    const nextVisibility = updates?.visibility || task.visibility
    const taskProject = workspaceProjectById[task.projectId]
    const workspaceRecipientUids = normalizeMemberUids(selectedWorkspace?.accessMemberUids || [])
    const restrictedRecipientUids = normalizeMemberUids([
      ...task.memberUids,
      ...(Array.isArray(updates?.memberUids) ? updates.memberUids : []),
      ...(taskProject?.memberUids || []),
      task.createdBy,
      taskProject?.createdBy || '',
    ])
    const scopedRecipientUids = nextVisibility === 'restricted' ? restrictedRecipientUids : workspaceRecipientUids
    return normalizeMemberUids([
      ...scopedRecipientUids,
      task.assigneeUid,
      typeof updates?.assigneeUid === 'string' ? updates.assigneeUid : '',
    ])
  }

  function resolveCreatedTaskNotificationRecipients(input: {
    visibility: WorkhubVisibility
    memberUids: string[]
    projectMemberUids: string[]
    assigneeUid: string
    createdBy: string
  }) {
    const workspaceRecipientUids = normalizeMemberUids(selectedWorkspace?.accessMemberUids || [])
    const restrictedRecipientUids = normalizeMemberUids([
      ...input.memberUids,
      ...input.projectMemberUids,
      input.createdBy,
      input.assigneeUid,
    ])
    const scopedRecipientUids = input.visibility === 'restricted' ? restrictedRecipientUids : workspaceRecipientUids
    return normalizeMemberUids([
      ...scopedRecipientUids,
      input.assigneeUid,
    ])
  }

  // Sync _cbRef with the latest render-time values so stable callbacks can read them
  _cbRef.current.dragTaskId = dragTaskId
  _cbRef.current.dragStatusId = dragStatusId
  _cbRef.current.dropTargetKey = dropTargetKey
  _cbRef.current.editingTaskTitleText = editingTaskTitleText
  _cbRef.current.editingChecklistItemText = editingChecklistItemText
  _cbRef.current.taskChecklistDrafts = taskChecklistDrafts
  _cbRef.current.selectedTaskIdSet = selectedTaskIdSet
  _cbRef.current.selectedTaskCount = selectedTaskCount
  _cbRef.current.handleTaskUpdate = handleTaskUpdate
  _cbRef.current.handleBulkStatusChange = handleBulkStatusChange
  _cbRef.current.handleTaskReorder = handleTaskReorder

  const activeImageReview = lightboxImageUrl ? (attachmentReviews[lightboxImageUrl] || createEmptyImageReview()) : null
  const activeCheckboxMarkers = activeImageReview
    ? activeImageReview.markers.filter((marker) => marker.type === 'checkbox' && !marker.checked)
    : []
  const activePointMarkers = activeImageReview
    ? activeImageReview.markers.filter((marker) => marker.type === 'point')
    : []
  const activeLineMarkers = activeImageReview
    ? activeImageReview.markers.filter((marker) => marker.type === 'line' && marker.x2 !== undefined && marker.y2 !== undefined)
    : []
  const activeMarkerIndexById = useMemo(
    () => new Map((activeImageReview?.markers || []).map((marker, index) => [marker.id, index + 1])),
    [activeImageReview],
  )
  const activeEditingMarker = activeImageReview?.markers.find((marker) => marker.id === lightboxMarkerEditorId) || null
  const activeEditingMarkerAnchor = activeEditingMarker
    ? {
      x: activeEditingMarker.type === 'line' && activeEditingMarker.x2 !== undefined
        ? (activeEditingMarker.x + activeEditingMarker.x2) / 2
        : activeEditingMarker.x,
      y: activeEditingMarker.type === 'line' && activeEditingMarker.y2 !== undefined
        ? (activeEditingMarker.y + activeEditingMarker.y2) / 2
        : activeEditingMarker.y,
    }
    : null

  useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia(`(max-width: ${WORKHUB_PHONE_MAX_WIDTH}px)`)
    const apply = (matches: boolean) => setIsMobileWorkhubLayout(matches)
    apply(media.matches)
    const onChange = (event: MediaQueryListEvent) => apply(event.matches)
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const check = () => setSidebarCollapsed(window.innerWidth < WORKHUB_DESKTOP_MIN_WIDTH)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  useEffect(() => {
    if (!isMobileWorkhubLayout) {
      setMobileWorkspacePanelOpen(false)
    }
  }, [isMobileWorkhubLayout])

  if (memberLoading || (bootstrappingMasterAccess && !member)) {
    return (
      <div className="workhub-shell">
        <div className="workhub-center-card">
          <div className="workhub-spinner" />
          <h1>Loading WorkHub</h1>
          <p>Preparing your private company workspace.</p>
          <WorkhubStyles phoneMaxWidth={WORKHUB_PHONE_MAX_WIDTH} />
        </div>
      </div>
    )
  }

  if (!member) {
    return (
      <div className="workhub-shell">
        <div className="workhub-center-card">
          <span className="workhub-badge">Private Internal Tool</span>
          <h1>Welcome to WorkHub</h1>
          <p>This area is restricted to approved company members. Request access once and your administrators can approve you.</p>
          <div className="workhub-center-actions">
            <button className="workhub-primary-btn" disabled={requestingAccess} onClick={handleRequestAccess}>
              {requestingAccess ? 'Requesting…' : 'Request company access'}
            </button>
            <Link to="/dashboard" className="workhub-secondary-link">Back to admin app</Link>
          </div>
          <div className="workhub-meta-line">Signed in as {userEmail || userName}</div>
          <WorkhubStyles phoneMaxWidth={WORKHUB_PHONE_MAX_WIDTH} />
        </div>
      </div>
    )
  }

  if (member.status !== 'approved') {
    return (
      <div className="workhub-shell">
        <div className="workhub-center-card">
          <span className={`workhub-badge ${member.status === 'suspended' ? 'is-danger' : ''}`}>{member.status === 'pending' ? 'Pending approval' : 'Access suspended'}</span>
          <h1>{member.status === 'pending' ? 'Your request is under review' : 'Your WorkHub access is currently disabled'}</h1>
          <p>
            {member.status === 'pending'
              ? 'A company administrator needs to approve your membership before you can enter the private workspace.'
              : 'Please contact your company administrator if you believe this was a mistake.'}
          </p>
          <div className="workhub-center-actions">
            {member.status === 'pending' && (
              <button className="workhub-primary-btn" disabled={requestingAccess} onClick={handleRequestAccess}>
                {requestingAccess ? 'Refreshing…' : 'Refresh request'}
              </button>
            )}
            <button className="workhub-ghost-btn" onClick={handleSignOut}>Sign out</button>
          </div>
          <div className="workhub-meta-line">Requested: {formatTime(member.requestedAt)}</div>
          <WorkhubStyles phoneMaxWidth={WORKHUB_PHONE_MAX_WIDTH} />
        </div>
      </div>
    )
  }

  if (!isPrivilegedMember && visibleWorkspaces.length === 0) {
    return (
      <div className="workhub-shell workhub-no-access-shell">
        <div className="workhub-no-access-card">
          <div className="workhub-no-access-icon" aria-hidden="true">🔒</div>
          <div className="workhub-no-access-brand">WorkHub</div>
          <h1 className="workhub-no-access-title">No workspace access</h1>
          <p className="workhub-no-access-body">
            Your account is active, but you haven't been added to any workspace yet.<br />
            Contact your administrator to be granted access.
          </p>
          <div className="workhub-no-access-user">
            <span className="workhub-no-access-avatar">
              {(userEmail || userName || '?')[0].toUpperCase()}
            </span>
            <span>{userEmail || userName}</span>
          </div>
          <button className="workhub-ghost-btn" onClick={handleSignOut}>Sign out</button>
        </div>
        <WorkhubStyles phoneMaxWidth={WORKHUB_PHONE_MAX_WIDTH} />
      </div>
    )
  }

  const sidebarTemplateTitle = selectedWorkspaceId ? selectedWorkspaceHomeTemplate.label : 'Workspace'

  const workspaceDisplayNameById: Record<string, string> = {}
  visibleWorkspaces.forEach((workspace) => {
    const templateId = resolveWorkhubWorkspaceTemplateForWorkspace(workspace).templateId
    workspaceDisplayNameById[workspace.id] = `${resolveWorkhubWorkspaceTemplateIcon(templateId)} ${workspace.name}`
  })

  const workhubHeaderTabs = [
    {
      id: 'home',
      section: 'home' as const,
      icon: '⌂',
      label: 'Home',
      onClick: () => navigateToWorkspaceSection('home'),
    },
    {
      id: 'tasks',
      section: 'tasks' as const,
      icon: '✓',
      label: 'Tasks',
      onClick: () => navigateToWorkspaceSection('tasks'),
    },
    {
      id: 'notes',
      section: 'notes' as const,
      icon: '📝',
      label: 'Editor',
      onClick: () => navigateToWorkspaceSection('notes'),
    },
    {
      id: 'dashboard',
      section: 'dashboard' as const,
      icon: '📊',
      label: 'Dashboard',
      onClick: () => navigateToWorkspaceSection('dashboard'),
    },
    {
      id: 'clients',
      section: 'clients' as const,
      icon: '🏢',
      label: 'Clients',
      onClick: () => navigateToWorkspaceSection('clients'),
    },
    ...(isPrivilegedMember
      ? [{
          id: 'users',
          section: 'users' as const,
          icon: '👥',
          label: 'Users',
          onClick: () => navigateToWorkspaceSection('users'),
        }]
      : []),
  ]
  const accountMenuNavigationTabs = workhubHeaderTabs.filter((tab) => !['home', 'tasks', 'notes', 'dashboard'].includes(tab.id))

  const workspaceTemplateCreateActionsBase: WorkhubWorkspaceTemplateCreateAction[] = selectedWorkspaceId
    ? resolveWorkspaceTemplateCreateActions(selectedWorkspaceTemplateId)
    : []
  const workspaceProjectActionLabel = selectedWorkspaceTemplateId === 'projects' ? 'Add project' : 'Add folder'
  const workspaceProjectActionIcon = selectedWorkspaceTemplateId === 'projects' ? '🚀' : '📁'

  const workspaceTemplateCreateActions: WorkhubWorkspaceTemplateCreateAction[] = selectedWorkspaceId
    ? (() : WorkhubWorkspaceTemplateCreateAction[] => {
      const hasProjectAction = workspaceTemplateCreateActionsBase.some((action) => action.intent === 'project')
      if (hasProjectAction) {
        return workspaceTemplateCreateActionsBase.map((action) => action.intent === 'project'
          ? { ...action, label: workspaceProjectActionLabel }
          : action)
      }
      return [
        ...workspaceTemplateCreateActionsBase,
        {
          id: 'create-folder-shortcut',
          intent: 'project',
          icon: workspaceProjectActionIcon,
          label: workspaceProjectActionLabel,
          tone: 'secondary' as const,
          fullWidth: true,
        },
      ]
    })()
    : []

  const sidebarTemplateActions: Array<{
    id: string
    icon: string
    label: string
    tone: 'primary' | 'secondary'
    fullWidth?: boolean
    onClick: () => void
  }> = workspaceTemplateCreateActions.map((action) => ({
    id: action.id,
    icon: action.icon,
    label: action.label,
    tone: action.tone,
    fullWidth: action.fullWidth,
    onClick: () => openWorkspaceTypeCreateDialog(action.intent),
  }))
  const sidebarPrimaryCreateAction = sidebarTemplateActions.find((action) => action.tone === 'primary') || sidebarTemplateActions[0] || null
  const emptyProjectsMessage = sidebarPrimaryCreateAction
    ? `No items yet. Use "${sidebarPrimaryCreateAction.label}" to get started.`
    : 'No items yet. Create a top-level category first.'

  return (
    <div className={`workhub-shell${isMobileWorkhubLayout ? ' is-mobile' : ''}${isMobileWorkhubLayout && !!selectedTask ? ' task-detail-open' : ''}${isMobileWorkhubLayout && mobileWorkspacePanelOpen ? ' workspace-drawer-open' : ''}`} dir="ltr">
      <div className="workhub-app">
        <header className="workhub-topbar">
          <div className="workhub-topbar-main">
            <div className="workhub-brand-wrap">
              <span className="workhub-brand" aria-label="WorkHub">
                <span className="workhub-brand-initial">W</span>ork<span className="workhub-brand-initial">H</span>ub
              </span>
            </div>
            <span className="workhub-topbar-divider" aria-hidden="true" />
            {isMobileWorkhubLayout ? (
              <div className="workhub-mobile-workspace-entry">
                <button
                  type="button"
                  className={`workhub-mobile-workspace-toggle${mobileWorkspacePanelOpen ? ' is-active' : ''}`}
                  onClick={() => setMobileWorkspacePanelOpen((current) => !current)}
                  aria-label="Toggle workspace list"
                  aria-expanded={mobileWorkspacePanelOpen}
                >
                  <span aria-hidden="true">☰</span>
                  <span className="workhub-mobile-context-label">
                    {selectedProject ? selectedProject.name : (selectedWorkspace ? (workspaceDisplayNameById[selectedWorkspaceId] || selectedWorkspace.name) : 'Workspaces')}
                  </span>
                </button>
              </div>
            ) : (
              <div className="workhub-workspace-tabs-wrap">
                <div className="workhub-workspace-tabs" role="tablist" aria-label="Workspaces">
                  {visibleWorkspaces.map((item) => {
                    const workspaceDisplayName = workspaceDisplayNameById[item.id] || item.name
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`workhub-tab workhub-workspace-tab${selectedWorkspaceId === item.id ? ' is-active' : ''}`}
                        onClick={() => {
                          if (item.id !== selectedWorkspaceId) {
                            navigateToRememberedWorkspaceRoute(item.id)
                          }
                        }}
                        title={workspaceDisplayName}
                      >
                        {workspaceDisplayName}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
          <nav className="workhub-header-actions">
            <button
              type="button"
              className="workhub-tab workhub-find-command-btn workhub-top-nav-icon-btn"
              onClick={openGlobalFinder}
              disabled={globalFinderEntries.length === 0}
              title="Find entity by name (Ctrl+K)"
              aria-label="Find (Ctrl+K)"
            >
              <span aria-hidden="true">⌕</span>
            </button>
            <div className="workhub-notify-wrap">
              <button
                type="button"
                className={`workhub-notify-btn${notificationMenuOpen ? ' is-open' : ''}${unreadNotificationCount > 0 ? ' has-unread' : ''}`}
                onClick={handleToggleNotificationMenu}
                aria-label="Notifications"
                title="Notifications"
              >
                <span
                  aria-hidden="true"
                  className={`workhub-notify-btn-icon${unreadNotificationCount > 0 ? ' has-unread' : ''}`}
                >
                  🔔
                </span>
                {unreadNotificationCount > 0 && <span className="workhub-notify-badge">{unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}</span>}
              </button>
              {notificationMenuOpen && (
                <div className="workhub-notify-menu">
                  <div className="workhub-notify-head">
                    <strong>Notifications</strong>
                    {unreadNotificationCount > 0 && <span>{unreadNotificationCount} unread</span>}
                  </div>
                  <div className="workhub-notify-list">
                    {notifications.length === 0 && <div className="workhub-notify-empty">No notifications yet.</div>}
                    {notifications.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`workhub-notify-item${item.read ? '' : ' is-unread'}`}
                        onClick={() => { void handleNotificationMenuItemClick(item) }}
                      >
                        <div className="workhub-notify-item-main">
                          <span
                            aria-hidden="true"
                            className={`workhub-notify-item-icon${item.read ? ' is-hidden' : ''}`}
                          >
                            🔔
                          </span>
                          <span className="workhub-notify-message">{item.message}</span>
                        </div>
                        <small>{formatTime(item.createdAt)}</small>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="workhub-account-wrap">
              <button
                type="button"
                className={`workhub-account-btn${accountMenuOpen ? ' is-open' : ''}`}
                onClick={handleToggleAccountMenu}
                aria-label="Account"
                title="Account"
              >
                {accountAvatarUrl ? (
                  <img className="workhub-account-avatar" src={accountAvatarUrl} alt="User avatar" />
                ) : (
                  <span className="workhub-account-avatar" aria-hidden="true">{accountInitials}</span>
                )}
                <span className="workhub-account-caret" aria-hidden="true">{accountMenuOpen ? '▴' : '▾'}</span>
              </button>
              {accountMenuOpen && (
                <div className="workhub-account-menu">
                  <div className="workhub-account-menu-head">
                    {accountAvatarUrl ? (
                      <img className="workhub-account-avatar" src={accountAvatarUrl} alt="User avatar" />
                    ) : (
                      <span className="workhub-account-avatar" aria-hidden="true">{accountInitials}</span>
                    )}
                    <div className="workhub-account-menu-identity">
                      <strong>{accountDisplayName}</strong>
                      <span>{accountEmail || 'No email'}</span>
                    </div>
                  </div>
                  {accountMenuNavigationTabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      className="workhub-account-menu-action"
                      onClick={() => {
                        setAccountMenuOpen(false)
                        tab.onClick()
                      }}
                    >
                      {tab.label}
                    </button>
                  ))}
                  {isPrivilegedMember && (
                    <button
                      type="button"
                      className="workhub-account-menu-action"
                      onClick={() => {
                        setAccountMenuOpen(false)
                        openCreateWorkspaceDialog()
                      }}
                    >
                      Create workspace
                    </button>
                  )}
                  {selectedWorkspaceId && (
                    <button
                      type="button"
                      className="workhub-account-menu-action"
                      onClick={() => {
                        setAccountMenuOpen(false)
                        openWorkspaceSettings(selectedWorkspaceId)
                      }}
                    >
                      Workspace settings
                    </button>
                  )}
                  <button type="button" className="workhub-account-menu-action" onClick={handleOpenAccountSettings}>Account settings</button>
                  <button
                    type="button"
                    className="workhub-account-menu-action"
                    onClick={() => {
                      setAccountMenuOpen(false)
                      void handleSignOut()
                    }}
                  >
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </nav>
        </header>

        {isMobileWorkhubLayout && (mobileWorkspacePanelOpen || mobileWorkspacePanelClosing) && (
          <div
            className={`workhub-mobile-workspace-panel-backdrop${mobileWorkspacePanelClosing ? ' is-closing' : ''}`}
            onClick={() => {
              setGearMenuOpen(false)
              closeMobileWorkspacePanel()
            }}
          >
            <aside
              className="workhub-mobile-workspace-panel"
              role="dialog"
              aria-modal="true"
              aria-label="Workspace list"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="workhub-mobile-detail-drawer-head workhub-mobile-workspace-panel-head">
                <button
                  type="button"
                  className="workhub-mobile-detail-drawer-handle"
                  aria-label="Close workspace list"
                  onClick={() => {
                    setGearMenuOpen(false)
                    closeMobileWorkspacePanel()
                  }}
                />
                <div className="workhub-mobile-workspace-picker-row workhub-mobile-workspace-toolbar">
                  <select
                    id="workhub-mobile-workspace-select"
                    className="workhub-mobile-workspace-picker-select"
                    value={selectedWorkspaceId}
                    onChange={(event) => handleMobileWorkspaceChange(event.target.value)}
                  >
                    {visibleWorkspaces.map((item) => {
                      const workspaceDisplayName = workspaceDisplayNameById[item.id] || item.name
                      return (
                        <option key={item.id} value={item.id}>
                          {workspaceDisplayName}
                        </option>
                      )
                    })}
                  </select>
                  <div className="workhub-mobile-workspace-picker-actions">
                    <button
                      type="button"
                      className={`workhub-ghost-mini workhub-mobile-workspace-overview-btn${selectedProjectId === 'all' && activeSection === 'dashboard' ? ' is-active' : ''}`}
                      onClick={handleMobileWorkspaceOverviewSelect}
                      title="Workspace overview"
                      aria-label="Workspace overview"
                      disabled={!selectedWorkspaceId}
                    >
                      📊
                    </button>
                    {isPrivilegedMember && (
                      <>
                        <button
                          type="button"
                          className="workhub-plus-btn"
                          onClick={(event) => handleProjectActionMenu('__workspace__', event)}
                          title="Create items"
                          aria-label="Create items"
                          disabled={!selectedWorkspaceId}
                        >
                          +
                        </button>
                        {selectedWorkspaceId && (
                          <div className="workhub-mobile-gear-wrap" ref={mobileGearMenuAnchorRef}>
                            <button
                              type="button"
                              className="workhub-gear-btn"
                              onClick={() => setGearMenuOpen((v) => !v)}
                              title="Workspace options"
                              aria-label="Workspace options"
                            >
                              ⚙
                            </button>
                            {gearMenuOpen && (
                              <div ref={mobileGearMenuRef} className={`workhub-gear-menu${mobileGearMenuOpenUp ? ' is-up' : ''}`}>
                                <button type="button" className="workhub-gear-menu-item" onClick={() => { setGearMenuOpen(false); openWorkspaceSettings(selectedWorkspaceId) }}>Workspace settings</button>
                                <button type="button" className="workhub-gear-menu-item" onClick={() => { setGearMenuOpen(false); setStatusDialogOpen(true) }}>Status settings</button>
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                    <button
                      type="button"
                      className="workhub-ghost-mini"
                      onClick={() => {
                        setGearMenuOpen(false)
                        closeMobileWorkspacePanel()
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              </div>
              <div className="workhub-mobile-workspace-panel-body">
                <div className="workhub-mobile-tree-panel">
                  <div className="workhub-mobile-tree-panel-body">
                    {visibleProjectTree.length > 0 ? (
                      <ProjectTreeNodes
                        nodes={liveProjectTree}
                        treeMetaDisplayMode={treeMetaDisplayMode}
                        showProjectColorDots={showProjectColorDots}
                        selectedProjectId={selectedProjectId}
                        expandedProjectIds={expandedProjectIds}
                        directTaskCountByProjectId={workspaceTaskCountByProjectId}
                        unreadCommentCountByProjectId={unreadCommentCountByProjectId}
                        taskProgressByProjectId={workspaceTaskProgressByProjectId}
                        projectIntentById={projectIntentById}
                        projectIntentIconById={projectIntentIconById}
                        selectedDocumentId={activeSection === 'notes' ? selectedDocumentId : ''}
                        selectedMoodBoardId={activeSection === 'moodboard' ? selectedMoodBoardId : ''}
                        documentsByProjectId={workspaceDocumentsByProjectId}
                        moodBoardsByProjectId={workspaceMoodBoardsByProjectId}
                        isPrivilegedMember={isPrivilegedMember}
                        onSelectProject={(projectId) => {
                          handleMobileProjectSelect(projectId)
                        }}
                        onSelectDocument={(documentId) => {
                          handleMobileDocumentSelect(documentId)
                        }}
                        onSelectMoodBoard={(boardId) => {
                          handleMobileMoodBoardSelect(boardId)
                        }}
                        onToggleExpansion={toggleProjectExpansion}
                        onOpenActionMenu={handleProjectActionMenu}
                        onOpenSettings={openProjectSettingsDialog}
                        projectColorMeanings={selectedWorkspaceProjectColorMeanings}
                      />
                    ) : (
                      <div className="workhub-empty-state">No project tree items yet.</div>
                    )}

                    <div className="workhub-tree-group">
                      <button
                        type="button"
                        className="workhub-tree-group-toggle"
                        onClick={() => setDocumentsGroupExpanded((current) => !current)}
                      >
                        <span className="workhub-tree-group-label">
                          <span className="workhub-tree-group-caret">{documentsGroupExpanded ? '▾' : '▸'}</span>
                          <strong>Workspace docs</strong>
                        </span>
                        <small>{workspaceLevelDocuments.length + (selectedWorkspace?.moodBoardEnabled !== false ? workspaceLevelMoodBoards.length : 0)} item{workspaceLevelDocuments.length + (selectedWorkspace?.moodBoardEnabled !== false ? workspaceLevelMoodBoards.length : 0) === 1 ? '' : 's'}</small>
                      </button>
                      {documentsGroupExpanded && (
                        workspaceLevelDocuments.length > 0 || (selectedWorkspace?.moodBoardEnabled !== false && workspaceLevelMoodBoards.length > 0) ? (
                          <div className="workhub-tree-docs-list">
                            {workspaceLevelDocuments.map((item) => {
                              const isActiveDocument = activeSection === 'notes' && selectedDocumentId === item.id
                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  className={`workhub-tree-doc-item${isActiveDocument ? ' is-active' : ''}`}
                                  onClick={() => {
                                    handleMobileDocumentSelect(item.id)
                                  }}
                                  title={item.title}
                                >
                                  <span className="workhub-tree-doc-item-title">📝 {item.title}</span>
                                  <span className="workhub-tree-doc-item-meta">Workspace document</span>
                                </button>
                              )
                            })}
                            {selectedWorkspace?.moodBoardEnabled !== false && workspaceLevelMoodBoards.map((item) => {
                              const isActiveMoodBoard = activeSection === 'moodboard' && selectedMoodBoardId === item.id
                              return (
                                <button
                                  key={item.id}
                                  type="button"
                                  className={`workhub-tree-doc-item${isActiveMoodBoard ? ' is-active' : ''}`}
                                  onClick={() => {
                                    handleMobileMoodBoardSelect(item.id)
                                  }}
                                  title={item.title}
                                >
                                  <span className="workhub-tree-doc-item-title">🎨 {item.title}</span>
                                  <span className="workhub-tree-doc-item-meta">Workspace mood board</span>
                                </button>
                              )
                            })}
                          </div>
                        ) : (
                          <div className="workhub-empty-state">No workspace-level documents yet.</div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        )}

        <div
          ref={shellLayoutRef}
          className={`workhub-shell-layout${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}
          style={!isMobileWorkhubLayout && !sidebarCollapsed ? { gridTemplateColumns: `${treePanelWidth}px 4px minmax(0, 1fr)` } : undefined}
        >
          {!isMobileWorkhubLayout && (
            <aside className={`workhub-panel workhub-tree-sidebar${sidebarCollapsed ? ' is-collapsed' : ''}`}>
            {sidebarCollapsed ? (
              <div className="workhub-panel-head compact is-collapsed-head">
                <button className="workhub-sidebar-toggle" onClick={handleExpandSidebar} title="Expand sidebar" aria-label="Expand sidebar">
                  ⟩
                </button>
              </div>
            ) : (
              <div className="workhub-panel-head compact">
                <div className="workhub-panel-head-title">
                  <h2>{sidebarTemplateTitle}</h2>
                </div>
                <button className="workhub-sidebar-toggle" onClick={handleCollapseSidebar} title="Collapse sidebar" aria-label="Collapse sidebar">
                  ⟨
                </button>
              </div>
            )}
            {!sidebarCollapsed && (
              <>
                <div className="workhub-tree-actions workhub-sidebar-template-actions">
                  <div className="workhub-tree-overview-row">
                    <button
                      className={`workhub-tree-overview${selectedProjectId === 'all' && activeSection === 'dashboard' ? ' is-active' : ''}`}
                      onClick={() => navigateToWorkspaceSection('dashboard')}
                    >
                      Workspace overview
                    </button>
                    {isPrivilegedMember && (
                      <div className="workhub-tree-overview-actions">
                        <button
                          type="button"
                          className="workhub-plus-btn"
                          title="Create items"
                          aria-label="Create items"
                          onClick={(event) => handleProjectActionMenu('__workspace__', event)}
                          disabled={!selectedWorkspaceId}
                        >
                          +
                        </button>
                        <div style={{ position: 'relative' }}>
                          <button
                            type="button"
                            className="workhub-gear-btn"
                            title="Workspace options"
                            aria-label="Workspace options"
                            onClick={() => setGearMenuOpen((v) => !v)}
                            disabled={!selectedWorkspaceId}
                          >
                            ⚙
                          </button>
                          {gearMenuOpen && selectedWorkspaceId && (
                            <div className="workhub-gear-menu">
                              <button type="button" className="workhub-gear-menu-item" onClick={() => { setGearMenuOpen(false); openWorkspaceSettings(selectedWorkspaceId) }}>Workspace settings</button>
                              <button type="button" className="workhub-gear-menu-item" onClick={() => { setGearMenuOpen(false); setStatusDialogOpen(true) }}>Status settings</button>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="workhub-tree-scroll">
                  {groupedProjectsWorkspace ? (
                    <>
                      {selectedWorkspaceScopeType !== 'finance' && (
                      <div className="workhub-tree-group">
                        <button
                          type="button"
                          className="workhub-tree-group-toggle"
                          onClick={handleToggleProjectsGroup}
                        >
                          <span className="workhub-tree-group-label">
                            <span className="workhub-tree-group-caret">{projectsGroupExpanded ? '▾' : '▸'}</span>
                            <strong>Projects</strong>
                          </span>
                          <small>{mirroredProjectRoots.length} root item{mirroredProjectRoots.length === 1 ? '' : 's'}</small>
                        </button>
                        {projectsGroupExpanded && (
                          mirroredProjectRoots.length > 0 ? (
                            <div className="workhub-tree-group-body">
                              <ProjectTreeNodes
                                nodes={mirroredProjectRoots}
                                treeMetaDisplayMode={treeMetaDisplayMode}
                                showProjectColorDots={showProjectColorDots}
                                selectedProjectId={selectedProjectId}
                                expandedProjectIds={expandedProjectIds}
                                directTaskCountByProjectId={workspaceTaskCountByProjectId}
                                unreadCommentCountByProjectId={unreadCommentCountByProjectId}
                                taskProgressByProjectId={workspaceTaskProgressByProjectId}
                                projectIntentById={projectIntentById}
                                projectIntentIconById={projectIntentIconById}
                                selectedDocumentId={activeSection === 'notes' ? selectedDocumentId : ''}
                                selectedMoodBoardId={activeSection === 'moodboard' ? selectedMoodBoardId : ''}
                                documentsByProjectId={workspaceDocumentsByProjectId}
                                moodBoardsByProjectId={workspaceMoodBoardsByProjectId}
                                isPrivilegedMember={isPrivilegedMember}
                                onSelectProject={handleSelectProject}
                                onSelectDocument={handleSelectDocumentFromTree}
                                onSelectMoodBoard={handleSelectMoodBoardFromTree}
                                onToggleExpansion={toggleProjectExpansion}
                                onOpenActionMenu={handleProjectActionMenu}
                                onOpenSettings={openProjectSettingsDialog}
                                projectColorMeanings={selectedWorkspaceProjectColorMeanings}
                              />
                            </div>
                          ) : (
                            <div className="workhub-empty-state">No technical projects found yet. Create a project in a technical workspace first.</div>
                          )
                        )}
                      </div>
                      )}
                      {localWorkspaceRoots.length > 0 && (
                        <div className="workhub-tree-group-body">
                          <ProjectTreeNodes
                            nodes={localWorkspaceRoots}
                            treeMetaDisplayMode={treeMetaDisplayMode}
                            showProjectColorDots={showProjectColorDots}
                            selectedProjectId={selectedProjectId}
                            expandedProjectIds={expandedProjectIds}
                            directTaskCountByProjectId={workspaceTaskCountByProjectId}
                            unreadCommentCountByProjectId={unreadCommentCountByProjectId}
                            taskProgressByProjectId={workspaceTaskProgressByProjectId}
                            projectIntentById={projectIntentById}
                            projectIntentIconById={projectIntentIconById}
                            selectedDocumentId={activeSection === 'notes' ? selectedDocumentId : ''}
                            selectedMoodBoardId={activeSection === 'moodboard' ? selectedMoodBoardId : ''}
                            documentsByProjectId={workspaceDocumentsByProjectId}
                            moodBoardsByProjectId={workspaceMoodBoardsByProjectId}
                            isPrivilegedMember={isPrivilegedMember}
                            onSelectProject={handleSelectProject}
                            onSelectDocument={handleSelectDocumentFromTree}
                            onSelectMoodBoard={handleSelectMoodBoardFromTree}
                            onToggleExpansion={toggleProjectExpansion}
                            onOpenActionMenu={handleProjectActionMenu}
                            onOpenSettings={openProjectSettingsDialog}
                            projectColorMeanings={selectedWorkspaceProjectColorMeanings}
                          />
                        </div>
                      )}
                    </>
                  ) : visibleProjectTree.length > 0 ? (
                    <ProjectTreeNodes
                      nodes={liveProjectTree}
                      treeMetaDisplayMode={treeMetaDisplayMode}
                      showProjectColorDots={showProjectColorDots}
                      selectedProjectId={selectedProjectId}
                      expandedProjectIds={expandedProjectIds}
                      directTaskCountByProjectId={workspaceTaskCountByProjectId}
                      unreadCommentCountByProjectId={unreadCommentCountByProjectId}
                      taskProgressByProjectId={workspaceTaskProgressByProjectId}
                      projectIntentById={projectIntentById}
                      projectIntentIconById={projectIntentIconById}
                      selectedDocumentId={activeSection === 'notes' ? selectedDocumentId : ''}
                      selectedMoodBoardId={activeSection === 'moodboard' ? selectedMoodBoardId : ''}
                      documentsByProjectId={workspaceDocumentsByProjectId}
                      moodBoardsByProjectId={workspaceMoodBoardsByProjectId}
                      isPrivilegedMember={isPrivilegedMember}
                      onSelectProject={handleSelectProject}
                      onSelectDocument={handleSelectDocumentFromTree}
                      onSelectMoodBoard={handleSelectMoodBoardFromTree}
                      onToggleExpansion={toggleProjectExpansion}
                      onOpenActionMenu={handleProjectActionMenu}
                      onOpenSettings={openProjectSettingsDialog}
                      projectColorMeanings={selectedWorkspaceProjectColorMeanings}
                    />
                  ) : (
                    <div className="workhub-empty-state workhub-empty-projects-cta">
                      <span>{emptyProjectsMessage}</span>
                      <button
                        type="button"
                        className="workhub-primary-mini"
                        onClick={() => sidebarPrimaryCreateAction?.onClick()}
                        disabled={!selectedWorkspaceId || !sidebarPrimaryCreateAction}
                      >
                        {sidebarPrimaryCreateAction?.label || 'Create first item'}
                      </button>
                    </div>
                  )}

                  <div className="workhub-tree-group">
                    <button
                      type="button"
                      className="workhub-tree-group-toggle"
                      onClick={() => setDocumentsGroupExpanded((current) => !current)}
                    >
                      <span className="workhub-tree-group-label">
                        <span className="workhub-tree-group-caret">{documentsGroupExpanded ? '▾' : '▸'}</span>
                        <strong>Workspace docs</strong>
                      </span>
                      <small>{workspaceLevelDocuments.length + (selectedWorkspace?.moodBoardEnabled !== false ? workspaceLevelMoodBoards.length : 0)} item{workspaceLevelDocuments.length + (selectedWorkspace?.moodBoardEnabled !== false ? workspaceLevelMoodBoards.length : 0) === 1 ? '' : 's'}</small>
                    </button>
                    {documentsGroupExpanded && (
                      workspaceLevelDocuments.length > 0 || (selectedWorkspace?.moodBoardEnabled !== false && workspaceLevelMoodBoards.length > 0) ? (
                        <div className="workhub-tree-docs-list">
                          {workspaceLevelDocuments.map((item) => {
                            const isActiveDocument = activeSection === 'notes' && selectedDocumentId === item.id
                            return (
                              <button
                                key={item.id}
                                type="button"
                                className={`workhub-tree-doc-item${isActiveDocument ? ' is-active' : ''}`}
                                onClick={() => handleSelectDocumentFromTree(item.id)}
                                title={item.title}
                              >
                                <span className="workhub-tree-doc-item-title">📝 {item.title}</span>
                                <span className="workhub-tree-doc-item-meta">Workspace document</span>
                              </button>
                            )
                          })}
                          {selectedWorkspace?.moodBoardEnabled !== false && workspaceLevelMoodBoards.map((item) => {
                            const isActiveMoodBoard = activeSection === 'moodboard' && selectedMoodBoardId === item.id
                            return (
                              <button
                                key={item.id}
                                type="button"
                                className={`workhub-tree-doc-item${isActiveMoodBoard ? ' is-active' : ''}`}
                                onClick={() => handleSelectMoodBoardFromTree(item.id)}
                                title={item.title}
                              >
                                <span className="workhub-tree-doc-item-title">🎨 {item.title}</span>
                                <span className="workhub-tree-doc-item-meta">Workspace mood board</span>
                              </button>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="workhub-empty-state">No workspace-level documents yet.</div>
                      )
                    )}
                  </div>
                </div>
              </>
            )}
            </aside>
          )}
          {!isMobileWorkhubLayout && !sidebarCollapsed && (
            <div
              className="workhub-tree-resize-handle"
              onPointerDown={handleTreeResizePointerDown}
              onPointerMove={handleTreeResizePointerMove}
              onPointerUp={handleTreeResizePointerUp}
            />
          )}

          <section className="workhub-main-stage">

            {activeSection === 'dashboard' && (
              <main className="workhub-section-stack is-dashboard">
                <section className="workhub-panel">
                  <div className="workhub-panel-head compact">
                    <div>
                      <h2>{selectedDashboardOverviewTitle}</h2>
                    </div>
                    <div className="workhub-panel-head-controls">
                      <span className="workhub-badge">{selectedProject ? `${selectedBranchChildProjects.length} direct children` : `${visibleWorkspaceProjects.length} visible projects`}</span>
                      <button
                        type="button"
                        className="workhub-collapse-toggle"
                        onClick={() => setDashboardSummaryCollapsed((current) => !current)}
                        aria-expanded={!dashboardSummaryCollapsed}
                        aria-label={dashboardSummaryCollapsed ? 'Expand proposal summary' : 'Collapse proposal summary'}
                        title={dashboardSummaryCollapsed ? 'Expand proposal summary' : 'Collapse proposal summary'}
                      >
                        {dashboardSummaryCollapsed ? '▾' : '▴'}
                      </button>
                    </div>
                  </div>
                  {!dashboardSummaryCollapsed && (
                    <>
                      <div className="workhub-summary-strip">
                        <div className="workhub-summary-tile"><strong>{taskCounts.total}</strong><span>Tasks in view</span></div>
                        <div className="workhub-summary-tile"><strong>{taskCounts.inProgress}</strong><span>In progress</span></div>
                        <div className="workhub-summary-tile"><strong>{taskCounts.urgent}</strong><span>Urgent</span></div>
                        <div className="workhub-summary-tile"><strong>{restrictedProjectsCount}</strong><span>Restricted projects</span></div>
                      </div>
                      {isPrivilegedMember && (
                      <div className="workhub-summary-strip">
                        <div className="workhub-summary-tile">
                          <strong>{selectedScopeMonetaryTotalText}</strong>
                          <span>{selectedProject ? `${pluralizeDashboardSubjectLabel(selectedDashboardFocusMeta.subjectLabel)} summary value` : 'Workspace total value'}</span>
                        </div>
                        <div className="workhub-summary-tile">
                          <strong>{selectedScopeLeadValueText}</strong>
                          <span>{selectedProject ? 'Sub-leads value' : 'Leads value'}</span>
                        </div>
                        <div className="workhub-summary-tile">
                          <strong>{selectedScopeProposalValueText}</strong>
                          <span>{selectedProject ? 'Sub-proposals value' : 'Proposals value'}</span>
                        </div>
                        <div className="workhub-summary-tile">
                          <strong>{selectedScopeFinanceValueText}</strong>
                          <span>{selectedProject ? 'Sub-finance value' : 'Finance value'}</span>
                        </div>
                        <div className="workhub-summary-tile">
                          <strong>{selectedScopeMarketingValueText}</strong>
                          <span>{selectedProject ? 'Sub-marketing value' : 'Marketing value'}</span>
                        </div>
                      </div>
                      )}
                      {!isMobileWorkhubLayout && (
                        <div className="workhub-home-actions">
                          {selectedProject && <button className="workhub-primary-btn" onClick={() => openCreateProjectDialog(selectedProject.id)}>{`${selectedDashboardFocusMeta.icon} ${selectedDashboardFocusMeta.actionLabel}`}</button>}
                          {selectedProject && <button className="workhub-ghost-btn" onClick={() => openCreateTaskDialog(selectedProject.id)}>✅ Add task</button>}
                          {selectedProject && (workspaceTaskProgressByProjectId[selectedProject.id]?.total ?? 0) > 0 && (
                            <button className="workhub-ghost-btn" onClick={() => navigateToWorkspaceSection('tasks', selectedWorkspaceId, selectedProject.id)}>View tasks</button>
                          )}
                        </div>
                      )}
                      {isMobileWorkhubLayout && (
                        <div className="workhub-mobile-dashboard-actions">
                          {selectedProject && <button className="workhub-primary-btn" onClick={() => openCreateProjectDialog(selectedProject.id)}>{`${selectedDashboardFocusMeta.icon} ${selectedDashboardFocusMeta.actionLabel}`}</button>}
                          {selectedProject && <button className="workhub-ghost-btn" onClick={() => openCreateTaskDialog(selectedProject.id)}>✅ Add task</button>}
                          {selectedProject && (workspaceTaskProgressByProjectId[selectedProject.id]?.total ?? 0) > 0 && (
                            <button className="workhub-ghost-btn" onClick={() => navigateToWorkspaceSection('tasks', selectedWorkspaceId, selectedProject.id)}>View tasks</button>
                          )}
                        </div>
                      )}
                    </>
                  )}
                  {selectedWorkspaceTemplateId === 'proposals_leads' && selectedProject && (
                    <div className="workhub-inline-children-block">
                      <div className="workhub-inline-children-head">
                        <h3>{selectedDashboardChildrenTitle}</h3>
                      </div>
                      <div className="workhub-project-card-grid">
                        {selectedBranchChildProjects.map((project) => renderDashboardProjectCard(project, 0))}
                        {selectedBranchChildProjects.length === 0 && <div className="workhub-empty-state">No child projects here yet.</div>}
                      </div>
                    </div>
                  )}
                  {selectedProject && selectedProjectDashboardSummary && (
                    <div className="workhub-proposal-focus-grid">
                      <article className="workhub-overview-card workhub-proposal-focus-card">
                        <div className="workhub-overview-head">
                          <h3>Proposal intelligence</h3>
                          <span>{selectedProjectDashboardSummary.countdownShort}</span>
                        </div>
                        <div className="workhub-proposal-focus-meta">
                          {selectedProjectDashboardSummary.tenderNumber && (
                            <span className="workhub-proposal-chip">
                              <strong>Tender #</strong>
                              <em className="workhub-ltr-token">{selectedProjectDashboardSummary.tenderNumber}</em>
                            </span>
                          )}
                          {selectedProjectDashboardSummary.proposalId && (
                            <span className="workhub-proposal-chip">
                              <strong>Proposal ID</strong>
                              <em className="workhub-ltr-token">{selectedProjectDashboardSummary.proposalId}</em>
                            </span>
                          )}
                          {selectedProjectDashboardSummary.clientName && (
                            <span className="workhub-proposal-chip">
                              <strong>Client</strong>
                              <em dir="auto">{selectedProjectDashboardSummary.clientName}</em>
                            </span>
                          )}
                          <span className="workhub-proposal-chip">
                            <strong>Value</strong>
                            <em className="workhub-ltr-token">{selectedProjectDashboardSummary.totalCurrency} {selectedProjectDashboardSummary.totalAmount.toLocaleString('en-US')}</em>
                          </span>
                        </div>
                        <div className="workhub-proposal-deadline-row">
                          <div className="workhub-proposal-deadline-col">
                            <span>{selectedProjectDashboardSummary.deadlineLabel}</span>
                            <strong className="workhub-ltr-token">{selectedProjectDashboardSummary.deadlineDate || 'Not set'}</strong>
                          </div>
                          <div className="workhub-proposal-deadline-col">
                            <span>Submission time</span>
                            <strong className="workhub-ltr-token">{selectedProjectDashboardSummary.submissionTimeLabel || 'Not set'}</strong>
                          </div>
                          <div className={`workhub-proposal-deadline-col is-countdown${selectedProjectDashboardSummary.isOverdue ? ' is-over' : ''}`}>
                            <span>{selectedProjectDashboardSummary.timeLeftLabel}</span>
                            <strong className="workhub-ltr-token">{selectedProjectDashboardSummary.timeLeftText}</strong>
                          </div>
                        </div>
                        {selectedProjectDashboardSummary.hasDeadline && (
                          <div className="workhub-project-risk-progress-track workhub-proposal-countdown-track" aria-hidden="true">
                            <span style={{ width: `${selectedProjectDashboardSummary.urgencyPercent}%` }} />
                          </div>
                        )}
                        <p className="workhub-proposal-brief">{selectedProjectDashboardSummary.brief || 'Add a short brief in the description to keep the team aligned on this submission.'}</p>
                      </article>

                      <article className="workhub-overview-card workhub-proposal-focus-card">
                        <div className="workhub-overview-head">
                          <h3>Documents and mood boards</h3>
                          <span>{selectedProjectDashboardMedia.length} previews</span>
                        </div>
                        <div className="workhub-summary-strip workhub-proposal-doc-counters">
                          <div className="workhub-summary-tile"><strong>{selectedProjectDashboardRelatedCounts.docs}</strong><span>Docs</span></div>
                          <div className="workhub-summary-tile"><strong>{selectedProjectDashboardRelatedCounts.notes}</strong><span>Notes</span></div>
                          <div className="workhub-summary-tile"><strong>{selectedProjectDashboardRelatedCounts.moodBoards}</strong><span>Mood boards</span></div>
                        </div>
                        {selectedProjectDashboardMedia.length > 0 ? (
                          <div className="workhub-proposal-thumb-grid">
                            {selectedProjectDashboardMedia.map((item) => (
                              <figure key={item.id} className="workhub-proposal-thumb" title={`${item.label} · ${item.source}`}>
                                <img src={item.url} alt={item.label} loading="lazy" />
                                <figcaption>
                                  <strong dir="auto">{item.label}</strong>
                                  <span>{item.source}</span>
                                </figcaption>
                              </figure>
                            ))}
                          </div>
                        ) : (
                          <div className="workhub-empty-state">No document or mood board image previews yet for this scope.</div>
                        )}
                        {selectedProjectDashboardDocuments.length > 0 && (
                          <div className="workhub-proposal-doc-list">
                            {selectedProjectDashboardDocuments.map((doc) => (
                              <button
                                key={doc.id}
                                type="button"
                                className="workhub-proposal-doc-item"
                                onClick={() => {
                                  setSelectedDocumentId(doc.id)
                                  setActiveSection('notes')
                                }}
                                title={doc.projectName ? `${doc.title} · ${doc.projectName}` : doc.title}
                              >
                                <span className="workhub-proposal-doc-icon" aria-hidden="true">{doc.type === 'note' ? '📝' : '📄'}</span>
                                <span className="workhub-proposal-doc-copy">
                                  <strong dir="auto">{doc.title}</strong>
                                  <small>{doc.projectName || (doc.type === 'note' ? 'Note' : 'Document')}</small>
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </article>
                    </div>
                  )}
                  {selectedProjectId === 'all' && (
                    <div className="workhub-overview-dashboard">
                      <article className="workhub-overview-card">
                        <div className="workhub-overview-head">
                          <h3>Status distribution</h3>
                          <span>{taskCounts.total} tasks</span>
                        </div>
                        <div className="workhub-overview-status-list">
                          {overviewStatusBuckets.map((bucket) => {
                            const percentage = taskCounts.total > 0 ? Math.round((bucket.count / taskCounts.total) * 100) : 0
                            return (
                              <div key={bucket.id} className="workhub-overview-status-row">
                                <div className="workhub-overview-status-label">
                                  <span className="status-dot" style={{ background: bucket.color }} />
                                  <span>{bucket.label}</span>
                                  <strong>{bucket.count}</strong>
                                </div>
                                <div className="workhub-overview-status-bar">
                                  <span style={{ width: `${Math.max(percentage, bucket.count > 0 ? 6 : 0)}%`, background: bucket.color }} />
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </article>

                      <article className="workhub-overview-card">
                        <div className="workhub-overview-head">
                          <h3>Priority load</h3>
                          <span>{taskCounts.urgent} urgent</span>
                        </div>
                        <div className="workhub-overview-priority-stack">
                          {overviewPriorityBuckets.map((bucket) => {
                            const total = Math.max(taskCounts.total, 1)
                            const width = Math.max(Math.round((bucket.count / total) * 100), bucket.count > 0 ? 7 : 0)
                            return (
                              <div
                                key={bucket.id}
                                className="workhub-overview-priority-segment"
                                style={{ width: `${width}%`, background: bucket.color, opacity: bucket.count > 0 ? 1 : 0.24 }}
                                title={`${bucket.label}: ${bucket.count}`}
                              />
                            )
                          })}
                        </div>
                        <div className="workhub-overview-priority-legend">
                          {overviewPriorityBuckets.map((bucket) => (
                            <span key={bucket.id}>
                              <i style={{ background: bucket.color }} />
                              {bucket.label} {bucket.count}
                            </span>
                          ))}
                        </div>
                      </article>

                      <article className="workhub-overview-card">
                        <div className="workhub-overview-head">
                          <h3>Priority projects & deadlines</h3>
                          <span>{overviewPriorityProjects.length} tracked</span>
                        </div>
                        <div className="workhub-project-risk-list">
                          {displayedOverviewPriorityProjects.length === 0 && <div className="workhub-empty-state">No high-priority projects with upcoming deadlines.</div>}
                          {displayedOverviewPriorityProjects.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              className={`workhub-project-risk-item${item.isNearTwoDays ? ' is-near-deadline' : ''}`}
                              onClick={() => handleSelectProject(item.id)}
                            >
                              <div className="workhub-project-risk-item-main">
                                <div className="workhub-project-risk-title-wrap">
                                  <strong dir="auto">{item.name}</strong>
                                  {item.clientName && <span className="workhub-project-risk-client" dir="auto">{item.clientName}</span>}
                                </div>
                                <span className={`workhub-project-risk-priority-chip priority-${item.priority}`}>{PROJECT_PRIORITY_OPTIONS.find((entry) => entry.value === item.priority)?.label || item.priority}</span>
                              </div>
                              <div className="workhub-project-risk-meta-row">
                                <div className="workhub-project-risk-calendar" aria-hidden="true">
                                  <span className="workhub-project-risk-calendar-head">DUE</span>
                                  <span className="workhub-project-risk-calendar-date workhub-ltr-token">{item.deadlineDate}</span>
                                </div>
                                <div className="workhub-project-risk-date-wrap">
                                  <span>{item.type === 'tender' ? 'Submission deadline' : 'Final submission deadline'}</span>
                                  <div className="workhub-project-risk-date-values">
                                    <span className="workhub-ltr-token">{item.deadlineDate}</span>
                                    {item.submissionTime && <span className="workhub-ltr-token">{item.submissionTime}</span>}
                                  </div>
                                </div>
                                <div
                                  className={`workhub-project-risk-clock${item.isOverdue ? ' is-overdue' : ''}`}
                                  style={{ ['--wh-risk-progress' as string]: `${item.urgencyPercent}%` }}
                                  aria-label={item.countdownText}
                                >
                                  <span className="workhub-ltr-token">{item.countdownShort}</span>
                                </div>
                              </div>
                              <div className="workhub-project-risk-progress-track" aria-hidden="true">
                                <span style={{ width: `${item.urgencyPercent}%` }} />
                              </div>
                              <small className="workhub-project-risk-countdown">{item.countdownText}</small>
                            </button>
                          ))}
                        </div>
                      </article>

                      <article className="workhub-overview-card">
                        <div className="workhub-overview-head">
                          <h3>Completion progress</h3>
                          <span>{overviewCompletionRate}%</span>
                        </div>
                        <div className="workhub-overview-progress-track">
                          <span style={{ width: `${overviewCompletionRate}%` }} />
                        </div>
                        <div className="workhub-overview-progress-meta">
                          <span>{overviewCompletedCount} completed</span>
                          <span>{Math.max(taskCounts.total - overviewCompletedCount, 0)} remaining</span>
                        </div>
                      </article>

                      <article className="workhub-overview-card">
                        <div className="workhub-overview-head">
                          <h3>Recent timeline</h3>
                          <span>{overviewRecentTimeline.length} events</span>
                        </div>
                        <div className="workhub-overview-timeline">
                          {overviewRecentTimeline.length === 0 && <div className="workhub-empty-state">No activity yet.</div>}
                          {overviewRecentTimeline.map((entry) => (
                            <div key={entry.id} className="workhub-overview-timeline-item">
                              <span className="timeline-dot" />
                              <div>
                                <strong>{entry.actor}</strong>
                                <p>{entry.message}</p>
                                <small>{entry.createdAt}</small>
                              </div>
                            </div>
                          ))}
                        </div>
                      </article>

                      <article className="workhub-overview-card workhub-overview-card-full">
                        <div className="workhub-overview-head">
                          <h3>Team activity</h3>
                          <span>Last {teamActivityHeatmap.windowDays} days</span>
                        </div>
                        {teamActivityHeatmap.rows.length === 0 ? (
                          <div className="workhub-empty-state">No team members or activity in this period.</div>
                        ) : (
                          <div className="workhub-team-activity-wrap">
                            <div
                              className="workhub-team-activity-grid"
                              style={{ gridTemplateColumns: `160px repeat(${teamActivityHeatmap.days.length}, 32px)` }}
                            >
                              <div className="workhub-tah-label-cell" />
                              {displayedTeamActivityDays.map((day, index) => {
                                const dow = new Date(day + 'T12:00:00').getDay()
                                const isWeekend = dow === 0 || dow === 6
                                const previousDay = displayedTeamActivityDays[index - 1]
                                const isMonthStart = index === 0 || day.slice(5, 7) !== previousDay.slice(5, 7)
                                const monthLabel = new Date(day + 'T12:00:00').toLocaleString(undefined, { month: 'short' })
                                return (
                                  <div
                                    key={day}
                                    className={`workhub-tah-day-head${isWeekend ? ' is-weekend' : ''}${isMonthStart ? ' is-month-start' : ''}`}
                                    title={day}
                                  >
                                    <span className={`workhub-tah-month-label${isMonthStart ? ' is-visible' : ''}`}>{isMonthStart ? monthLabel : ''}</span>
                                    <span>{day.slice(8)}</span>
                                  </div>
                                )
                              })}
                              {teamActivityHeatmap.rows.map((row) => (
                                <Fragment key={row.uid}>
                                  <div className="workhub-tah-label-cell">
                                    <span className="workhub-tah-avatar">{row.initials}</span>
                                    <span className="workhub-tah-name">{row.name}</span>
                                    <span className="workhub-tah-total">{row.totalInWindow}</span>
                                  </div>
                                  {displayedTeamActivityDays.map((day, i) => {
                                    const count = row.dayCounts[row.dayCounts.length - 1 - i] ?? 0
                                    const dow = new Date(day + 'T12:00:00').getDay()
                                    const isWeekend = dow === 0 || dow === 6
                                    const previousDay = displayedTeamActivityDays[i - 1]
                                    const isMonthStart = i === 0 || day.slice(5, 7) !== previousDay.slice(5, 7)
                                    const lv = count === 0 ? 0 : count === 1 ? 1 : count <= 3 ? 2 : count <= 6 ? 3 : 4
                                    return (
                                      <div
                                        key={day}
                                        className={`workhub-tah-cell lv${lv}${isWeekend ? ' is-weekend' : ''}${isMonthStart ? ' is-month-start' : ''}`}
                                        title={`${row.name} · ${day} · ${count} action${count !== 1 ? 's' : ''}`}
                                      />
                                    )
                                  })}
                                </Fragment>
                              ))}
                            </div>
                          </div>
                        )}
                      </article>
                    </div>
                  )}
                </section>

                {!(selectedWorkspaceTemplateId === 'proposals_leads' && selectedProject) && (
                  <section className="workhub-panel">
                    <div className="workhub-panel-head compact">
                      <div>
                        <h2>{selectedDashboardChildrenTitle}</h2>
                      </div>
                    </div>
                    <div className="workhub-project-card-grid">
                      {selectedBranchChildProjects.map((project) => renderDashboardProjectCard(project, 0))}
                      {selectedBranchChildProjects.length === 0 && <div className="workhub-empty-state">No child projects here yet.</div>}
                    </div>
                  </section>
                )}
              </main>
            )}

            {activeSection === 'users' && isPrivilegedMember && (
              <main className="workhub-section-stack">
                <section className="workhub-panel workhub-user-management-panel">
                  <div className="workhub-panel-head compact">
                    <div>
                      <h2>User management</h2>
                      <p>Approve requests and choose access mode per user: Full or Workspace-based.</p>
                    </div>
                    <div className="workhub-user-management-tools">
                      <label>
                        <span>Workspace scope</span>
                        <select
                          value={userWorkspaceFilter}
                          onChange={(event) => {
                            setUserWorkspaceFilter(event.target.value)
                            setExpandedUserPickerUid(null)
                          }}
                        >
                          <option value="all">All accessible workspaces</option>
                          {visibleWorkspaces.map((workspace) => (
                            <option key={workspace.id} value={workspace.id}>{workspaceDisplayNameById[workspace.id] || workspace.name}</option>
                          ))}
                        </select>
                      </label>
                    </div>
                  </div>

                  <div className="workhub-members-section">
                    <div className="workhub-members-section-head">
                      <strong>Members</strong>
                      <span className="workhub-members-count">
                        {userManagementApprovedMembers.length} active
                        {userManagementPendingMembers.length > 0 && (
                          <span className="workhub-pending-badge">{userManagementPendingMembers.length} pending</span>
                        )}
                      </span>
                    </div>
                    {userManagementMembers.length === 0 && (
                      <div className="workhub-empty-state">No members match this scope.</div>
                    )}
                    <div className="workhub-member-list">
                      {userManagementMembers.map((item) => {
                        const isPending = item.status === 'pending'
                        const isSuspended = item.status === 'suspended'
                        const summary = memberWorkspaceSummaryByUid[item.uid] || { count: 0, names: [] }
                        const effectiveAccess = userAccessEffectiveByUid[item.uid] || { mode: 'workspace_based' as WorkhubUserAccessMode, workspaceById: {} }
                        const accessMode = effectiveAccess.mode
                        const isPickerOpen = expandedUserPickerUid === item.uid
                        const isBusyRequest = busyKey === `member-request:${item.uid}`
                        const isSavingAccess = busyKey === `user-access-save:${item.uid}`
                        const hasDraftChanges = userAccessDraftDirtyByUid[item.uid] || false
                        const initials = (item.displayName || item.email || '?')
                          .split(' ').map((word: string) => word[0]).slice(0, 2).join('').toUpperCase()
                        return (
                          <div key={item.uid} className="workhub-member-row-wrap">
                            <div className={`workhub-member-row settings-row${isPending ? ' is-pending' : ''}${isSuspended ? ' is-suspended' : ''}`}>
                              <div className="workhub-member-avatar settings-avatar" aria-hidden="true">{initials}</div>
                              <div className="workhub-member-identity">
                                <span className="workhub-member-name">{item.displayName || item.email || item.uid}</span>
                                <span className="workhub-member-email">{item.email || '—'}</span>
                              </div>
                              <div className="workhub-member-workspaces">
                                <span className="workhub-ws-count-label">
                                  {summary.count > 0 ? `${summary.count} workspace${summary.count === 1 ? '' : 's'}` : <span className="workhub-muted">No workspaces</span>}
                                </span>
                              </div>
                              <div className="workhub-member-actions">
                                {isPending ? (
                                  <>
                                    <span className="workhub-status-pill pending">Pending request</span>
                                    <button
                                      type="button"
                                      className="workhub-approve-btn"
                                      disabled={isBusyRequest}
                                      onClick={() => { void handleApproveRequestGlobal(item.uid) }}
                                      title="Approve user"
                                    >
                                      {isBusyRequest ? '…' : 'Approve'}
                                    </button>
                                    <button
                                      type="button"
                                      className="workhub-decline-btn"
                                      disabled={isBusyRequest}
                                      onClick={() => { void handleRejectRequestGlobal(item.uid) }}
                                      title="Decline request"
                                    >
                                      Reject
                                    </button>
                                  </>
                                ) : isSuspended ? (
                                  <span className="workhub-status-pill suspended">Suspended</span>
                                ) : (
                                  <>
                                    <div className="workhub-user-mode-toggle" title="Access mode">
                                      <button
                                        type="button"
                                        className={`workhub-user-mode-btn${accessMode === 'full' ? ' is-active' : ''}`}
                                        disabled={isSavingAccess}
                                        onClick={() => {
                                          setExpandedUserPickerUid(null)
                                          handleSetUserAccessModeDraft(item.uid, 'full')
                                        }}
                                      >
                                        Full
                                      </button>
                                      <button
                                        type="button"
                                        className={`workhub-user-mode-btn${accessMode === 'workspace_based' ? ' is-active' : ''}`}
                                        disabled={isSavingAccess}
                                        onClick={() => {
                                          handleSetUserAccessModeDraft(item.uid, 'workspace_based')
                                          setExpandedUserPickerUid(item.uid)
                                        }}
                                      >
                                        Workspace
                                      </button>
                                    </div>
                                    {accessMode === 'workspace_based' ? (
                                      <button
                                        type="button"
                                        className={`workhub-ws-count-btn${isPickerOpen ? ' is-open' : ''}`}
                                        disabled={isSavingAccess}
                                        onClick={() => setExpandedUserPickerUid(isPickerOpen ? null : item.uid)}
                                      >
                                        Manage access
                                        <span className="workhub-ws-count-chevron">{isPickerOpen ? '▲' : '▼'}</span>
                                      </button>
                                    ) : (
                                      <span className="workhub-user-mode-pill">All workspaces</span>
                                    )}
                                    <button
                                      type="button"
                                      className="workhub-ghost-mini"
                                      disabled={!hasDraftChanges || isSavingAccess}
                                      onClick={() => handleDiscardUserAccessDraft(item.uid)}
                                    >
                                      Discard
                                    </button>
                                    <button
                                      type="button"
                                      className="workhub-primary-mini"
                                      disabled={!hasDraftChanges || isSavingAccess}
                                      onClick={() => { void handleSaveUserAccessDraft(item.uid) }}
                                    >
                                      {isSavingAccess ? 'Saving…' : 'Save'}
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                            {isPickerOpen && accessMode === 'workspace_based' && (
                              <div className="workhub-ws-picker">
                                <div className="workhub-ws-picker-title">Workspace access for {item.displayName || item.email}</div>
                                <div className="workhub-ws-picker-list">
                                  {visibleWorkspaces.map((workspace) => {
                                    const workspaceEntry = effectiveAccess.workspaceById[workspace.id] || { enabled: false, level: 'custom' as const }
                                    const isChecked = workspaceEntry.enabled
                                    const accessLevel = workspaceEntry.level
                                    return (
                                      <div key={workspace.id} className="workhub-ws-picker-row">
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          disabled={isSavingAccess}
                                          onChange={(event) => handleToggleUserWorkspaceDraft(item.uid, workspace.id, event.target.checked)}
                                        />
                                        <span className="workhub-ws-picker-name">{workspaceDisplayNameById[workspace.id] || workspace.name}</span>
                                        {isChecked && (
                                          <div className="workhub-access-level-toggle workhub-ws-access-level-toggle" title="Access level for this workspace">
                                            <button
                                              type="button"
                                              className={`workhub-access-level-btn${accessLevel === 'full' ? ' is-active' : ''}`}
                                              disabled={isSavingAccess}
                                              onClick={() => handleSetUserWorkspaceLevelDraft(item.uid, workspace.id, 'full')}
                                            >
                                              Full
                                            </button>
                                            <button
                                              type="button"
                                              className={`workhub-access-level-btn${accessLevel === 'custom' ? ' is-active' : ''}`}
                                              disabled={isSavingAccess}
                                              onClick={() => handleSetUserWorkspaceLevelDraft(item.uid, workspace.id, 'custom')}
                                            >
                                              Custom
                                            </button>
                                          </div>
                                        )}
                                        {workspace.id === selectedWorkspaceId && <span className="workhub-ws-picker-badge current">Current</span>}
                                      </div>
                                    )
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </section>
              </main>
            )}

            {activeSection === 'clients' && (
              <main className="workhub-section-stack">
                <section className="workhub-panel">
                  <div className="workhub-panel-head compact">
                    <div>
                      <h2>Client management</h2>
                      <p>Maintain client profiles and link them to projects for better bid and delivery tracking. Only client name is required.</p>
                    </div>
                    <div className="workhub-panel-tools">
                      <button
                        className="workhub-ghost-btn"
                        onClick={() => {
                          setSelectedClientId('__new__')
                          setClientNameDraft('')
                          setClientContactPersonDraft('')
                          setClientEmailDraft('')
                          setClientPhoneDraft('')
                          setClientWebsiteDraft('')
                          setClientAddressDraft('')
                          setClientIndustryDraft('')
                          setClientLogoUrlDraft('')
                          setClientNotesDraft('')
                        }}
                      >
                        ➕ New client
                      </button>
                      {selectedClientId === '__new__' ? (
                        <button type="button" className="workhub-primary-btn" onClick={() => { void handleCreateClientFromManager() }} disabled={busyKey === 'client:create'}>
                          {busyKey === 'client:create' ? 'Creating…' : '🏢 Create client'}
                        </button>
                      ) : (
                        <button type="button" className="workhub-primary-btn" onClick={() => { void handleSaveClientDetails() }} disabled={!selectedClientId || busyKey === `client:save:${selectedClientId}`}>
                          {busyKey === `client:save:${selectedClientId}` ? 'Saving…' : 'Save client'}
                        </button>
                      )}
                      <button
                        className="workhub-danger-btn"
                        onClick={handleDeleteClientDetails}
                        disabled={!selectedClientId || selectedClientId === '__new__' || busyKey === `client:delete:${selectedClientId}`}
                      >
                        {busyKey === `client:delete:${selectedClientId}` ? 'Deleting…' : 'Delete client'}
                      </button>
                    </div>
                  </div>
                  <div className="workhub-client-layout">
                    <div className="workhub-client-list">
                      {clients.map((client) => {
                        const linkedCount = projects.filter((project) => project.clientId === client.id).length
                        const workspace = visibleWorkspaces.find((item) => item.id === client.workspaceId) || null
                        const workspaceName = workspace
                          ? (workspaceDisplayNameById[workspace.id] || workspace.name)
                          : 'Workspace'
                        return (
                          <button
                            key={client.id}
                            type="button"
                            className={`workhub-client-list-item${selectedClientId === client.id ? ' is-active' : ''}`}
                            onClick={() => setSelectedClientId(client.id)}
                          >
                            <strong>{client.name}</strong>
                            <span>{client.contactPerson || client.email || 'No contact details'}</span>
                            <small className="workhub-client-workspace-label">{workspaceName}</small>
                            <small>{linkedCount} linked project{linkedCount === 1 ? '' : 's'}</small>
                          </button>
                        )
                      })}
                      {clients.length === 0 && <div className="workhub-empty-state">No clients yet. Create your first client profile.</div>}
                    </div>
                    <div className="workhub-modal-form workhub-client-form">
                      <label>
                        <span>Client name</span>
                        <input value={clientNameDraft} onChange={(event) => setClientNameDraft(event.target.value)} placeholder="Acme Industries" />
                      </label>
                      <label>
                        <span>Contact person</span>
                        <input value={clientContactPersonDraft} onChange={(event) => setClientContactPersonDraft(event.target.value)} placeholder="Primary contact" />
                      </label>
                      <div className="workhub-field-grid two compact">
                        <label>
                          <span>Email</span>
                          <input type="email" value={clientEmailDraft} onChange={(event) => setClientEmailDraft(event.target.value)} placeholder="contact@client.com" />
                        </label>
                        <label>
                          <span>Phone</span>
                          <input value={clientPhoneDraft} onChange={(event) => setClientPhoneDraft(event.target.value)} placeholder="+971 ..." />
                        </label>
                      </div>
                      <div className="workhub-field-grid two compact">
                        <label>
                          <span>Website</span>
                          <input value={clientWebsiteDraft} onChange={(event) => setClientWebsiteDraft(event.target.value)} placeholder="https://client.com" />
                        </label>
                        <label>
                          <span>Industry</span>
                          <input value={clientIndustryDraft} onChange={(event) => setClientIndustryDraft(event.target.value)} placeholder="Construction, Oil & Gas, Tech..." />
                        </label>
                      </div>
                      <label>
                        <span>Address</span>
                        <textarea rows={2} value={clientAddressDraft} onChange={(event) => setClientAddressDraft(event.target.value)} placeholder="Client address" />
                      </label>
                      <label>
                        <span>Logo URL</span>
                        <input value={clientLogoUrlDraft} onChange={(event) => setClientLogoUrlDraft(event.target.value)} placeholder="https://.../logo.png" />
                      </label>
                      <div className="workhub-inline-row workhub-client-logo-upload-row">
                        <label className="workhub-file-upload-btn workhub-client-logo-upload-btn">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(event) => {
                              const file = event.target.files?.[0]
                              event.target.value = ''
                              if (!file) return
                              void handleClientLogoFileUpload(file)
                            }}
                          />
                          Upload logo
                        </label>
                        {busyKey === 'client:logo-upload' && <span className="workhub-meta-line">Uploading logo…</span>}
                      </div>
                      {clientLogoUrlDraft.trim() && (
                        <div className="workhub-client-logo-preview">
                          <img src={clientLogoUrlDraft} alt="Client logo preview" onError={(event) => { (event.currentTarget as HTMLImageElement).style.display = 'none' }} />
                        </div>
                      )}
                      <label>
                        <span>Notes</span>
                        <textarea rows={4} value={clientNotesDraft} onChange={(event) => setClientNotesDraft(event.target.value)} placeholder="Commercial terms, preferred formats, compliance notes..." />
                      </label>
                    </div>
                  </div>
                </section>
              </main>
            )}

        {activeSection === 'notes' && (
          <WorkhubDocEditor
            {...docEditor}
            selectedDocument={selectedDocument ?? undefined}
            scopedWorkspaceDocuments={scopedWorkspaceDocuments}
            selectedProjectId={selectedProjectId}
            taskContextTrail={taskContextTrail}
            taskContextIconByProjectId={Object.fromEntries(taskContextTrail.map((project) => [project.id, projectIntentMetaById[project.id]?.icon || '📁']))}
            selectedProjectPeriodLabel={selectedProjectPeriodLabel}
            selectedProjectSubmissionTimeLabel={selectedProjectSubmissionTimeLabel}
            onSelectProject={handleSelectProject}
            busyKey={busyKey}
            memberByUid={memberByUid}
            workspaceProjectById={workspaceProjectById}
            workhubShareCandidates={workhubShareCandidates}
            isImageAttachmentUrl={isImageAttachmentUrl}
            openAttachmentLightbox={openAttachmentLightbox}
            formatTime={formatTime}
            openDocumentCreateDialog={openDocumentCreateDialog}
            isMobileLayout={isMobileWorkhubLayout}
            discussionComments={comments}
            onDiscussionSend={handleAddComment}
            discussionBusy={busyKey === 'comment'}
            discussionNotifyMode={discussionNotifyMode}
            discussionNotifyUids={discussionNotifyUids}
            discussionNotifyCandidates={discussionNotifyCandidates}
            onDiscussionNotifyModeChange={setDiscussionNotifyMode}
            onDiscussionNotifyUidsChange={setDiscussionNotifyUids}
            discussionEditingId={editingCommentId}
            discussionEditingText={editingCommentText}
            onDiscussionEditStart={handleStartCommentEdit}
            onDiscussionEditChange={setEditingCommentText}
            onDiscussionEditCancel={handleCancelCommentEdit}
            onDiscussionEditSave={handleSaveCommentEdit}
            discussionEditBusyKey={busyKey}
            currentUid={auth.currentUser?.uid || ''}
          />
        )}

        {activeSection === 'moodboard' && (
          <MoodBoardPanel
            board={activeMoodBoard}
            entityLabel={
              activeMoodBoard?.entityType === 'project'
                ? (workspaceProjectById[activeMoodBoard.entityId]?.name || 'Project')
                : (selectedWorkspace?.name || 'Workspace')
            }
            workspaceProjectById={workspaceProjectById}
            currentUid={currentUid}
            canEdit={isPrivilegedMember}
            memberByUid={memberByUid}
            formatTime={formatTime}
            busyKey={busyKey}
            onCreateBoard={async (title) => {
              if (!selectedWorkspaceId) return null
              const id = await createWorkhubMoodBoard({
                workspaceId: selectedWorkspaceId,
                entityType: activeMoodBoard?.entityType ?? 'workspace',
                entityId: activeMoodBoard?.entityId ?? selectedWorkspaceId,
                title,
                createdBy: currentUid,
              })
              setSelectedMoodBoardId(id)
              return id
            }}
            onUploadImage={async (boardId, file) => {
              const ext = file.name.split('.').pop() ?? 'jpg'
              const storagePath = `workhub-moodboards/${selectedWorkspaceId}/${boardId}/${crypto.randomUUID()}.${ext}`
              const storageRef = ref(storage, storagePath)
              await uploadBytes(storageRef, file, { contentType: file.type || 'application/octet-stream' })
              return await getDownloadURL(storageRef)
            }}
            onBoardDeleted={() => {
              setSelectedMoodBoardId('')
              setActiveSection('dashboard')
            }}
            onOpenAttachmentLightbox={openAttachmentLightbox}
            getAttachmentReviewCount={(url) => {
              const review = attachmentReviews[url]
              return (review?.notes.trim() ? 1 : 0)
                + (review?.comments.length || 0)
                + (review?.markers.length || 0)
                + (review?.modificationChecks.length || 0)
            }}
            discussionComments={comments}
            onDiscussionSend={handleAddComment}
            discussionBusy={busyKey === 'comment'}
            discussionNotifyMode={discussionNotifyMode}
            discussionNotifyUids={discussionNotifyUids}
            discussionNotifyCandidates={discussionNotifyCandidates}
            onDiscussionNotifyModeChange={setDiscussionNotifyMode}
            onDiscussionNotifyUidsChange={setDiscussionNotifyUids}
            discussionEditingId={editingCommentId}
            discussionEditingText={editingCommentText}
            onDiscussionEditStart={handleStartCommentEdit}
            onDiscussionEditChange={setEditingCommentText}
            onDiscussionEditCancel={handleCancelCommentEdit}
            onDiscussionEditSave={handleSaveCommentEdit}
            discussionEditBusyKey={busyKey}
          />
        )}

        {activeSection === 'tasks' && (
          <main className="workhub-content-area">
            <div className="workhub-task-main-column">
              <div className={`workhub-task-sections compact-sections task-view-${taskItemDisplayMode}`}>
                {taskContextTrail.length > 0 && (() => {
                const currentContextProject = taskContextTrail[taskContextTrail.length - 1]
                const breadcrumbProjects = taskContextTrail.slice(0, -1)
                const currentContextIcon = currentContextProject ? (projectIntentMetaById[currentContextProject.id]?.icon || '📁') : '📁'

                return (
                  <div className="workhub-task-context-strip" role="navigation" aria-label="Current item path">
                    {breadcrumbProjects.length > 0 && (
                      <div className="workhub-task-context-path">
                        {breadcrumbProjects.map((project, index) => {
                          const isLastBreadcrumb = index === breadcrumbProjects.length - 1
                          const icon = projectIntentMetaById[project.id]?.icon || '📁'
                          const iconKind = icon === '🚀' ? 'project' : 'folder'
                          return (
                            <div key={project.id} className="workhub-task-context-node-wrap">
                              <button
                                type="button"
                                className="workhub-task-context-node"
                                onClick={() => handleSelectProject(project.id)}
                                title={project.name}
                              >
                                <span className={`workhub-task-context-node-icon is-${iconKind}-kind`} aria-hidden="true">{icon}</span>
                                <span className="workhub-task-context-node-text">
                                  <span className="workhub-task-context-node-title">{project.name}</span>
                                </span>
                              </button>
                              {!isLastBreadcrumb && <span className="workhub-task-context-sep" aria-hidden="true">›</span>}
                            </div>
                          )
                        })}
                      </div>
                    )}
                    <div className="workhub-task-context-current">
                      <div className="workhub-task-context-current-title">
                        <span className="workhub-task-context-current-icon" aria-hidden="true">{currentContextIcon}</span>
                        <span>{currentContextProject?.name || selectedWorkspaceDisplayName || 'Workspace overview'}</span>
                      </div>
                      {(selectedProjectPeriodLabel || selectedProjectSubmissionTimeLabel) && (
                        <div className="workhub-task-context-current-meta" title="Current item details">
                          {selectedProjectPeriodLabel && <span><strong>Period:</strong> {selectedProjectPeriodLabel}</span>}
                          {selectedProjectSubmissionTimeLabel && <span className="workhub-ltr-token"><strong>Time:</strong> {selectedProjectSubmissionTimeLabel}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                )
                })()}
                <div className="workhub-status-tabs">
                  {(() => {
                  const visibleStatusTabs = selectedProjectEffectiveTaskStatuses
                  const showAllTab = visibleStatusTabs.length > 1
                  const allTaskCount = taskFilterBaseTasks.length

                  return (
                    <>
                      {showAllTab && (
                        <button
                          type="button"
                          className={`workhub-status-tab${selectedTaskStatusTab === 'all' ? ' is-active' : ''}`}
                          onClick={() => setSelectedTaskStatusTab('all')}
                          data-status-color="backlog"
                          style={{ ['--status-color' as string]: '#6b7280' }}
                        >
                          {`All (${allTaskCount})`}
                        </button>
                      )}
                      {visibleStatusTabs.map((status) => {
                        const statusTaskCount = taskFilterBaseTaskCountByStatus[status.id] || 0
                        return (
                          <button
                            key={status.id}
                            type="button"
                            className={`workhub-status-tab${selectedTaskStatusTab === status.id ? ' is-active' : ''}`}
                            onClick={() => setSelectedTaskStatusTab(status.id)}
                            data-status-color={status.id}
                            style={{ ['--status-color' as string]: status.color }}
                          >
                            {`${status.label} (${statusTaskCount})`}
                          </button>
                        )
                      })}
                      {completedStatusForHighlight && completedHighlightCount > 0 && (
                        <button
                          type="button"
                          className={`workhub-completed-highlight${selectedTaskStatusTab === completedStatusForHighlight.id ? ' is-active' : ''}`}
                          onClick={() => setSelectedTaskStatusTab((current) => current === completedStatusForHighlight.id ? 'all' : completedStatusForHighlight.id)}
                          title="Open completed tasks"
                        >
                          <span className="workhub-completed-highlight-icon" aria-hidden="true">✓</span>
                          <span>{`Team wins ${completedHighlightCount}`}</span>
                          {selectedTaskStatusTab === completedStatusForHighlight.id ? (
                            <span className="workhub-completed-highlight-cta">Back to board</span>
                          ) : (
                            <span className="workhub-completed-highlight-cta">View completed</span>
                          )}
                        </button>
                      )}
                    </>
                  )
                  })()}
                  <div className="workhub-task-filter-wrap">
                  <button
                    type="button"
                    className={`workhub-status-manage-btn workhub-task-filter-btn${activeTaskFilterCount > 0 ? ' is-active' : ''}`}
                    onClick={() => setTaskFilterMenuOpen((current) => !current)}
                    aria-label="Filter tasks"
                    title="Filter tasks"
                  >
                    <span className="workhub-task-filter-icon" aria-hidden="true" />
                    {activeTaskFilterCount > 0 && <span className="workhub-task-filter-badge">{activeTaskFilterCount}</span>}
                  </button>
                  {taskFilterMenuOpen && (
                    <div className="workhub-task-filter-menu">
                      <div className="workhub-task-filter-menu-head">
                        <strong>Task filters</strong>
                        {activeTaskFilterCount > 0 && (
                          <button
                            type="button"
                            className="workhub-task-filter-clear"
                            onClick={() => {
                              setTaskFilterRequireAttachments(false)
                              setTaskFilterRequireChecklist(false)
                              setTaskFilterPriority('all')
                            }}
                          >
                            Clear
                          </button>
                        )}
                      </div>
                      <label className="workhub-task-filter-check">
                        <input name="taskFilterRequireAttachments" type="checkbox" checked={taskFilterRequireAttachments} onChange={(event) => setTaskFilterRequireAttachments(event.target.checked)} />
                        <span>Has attachments</span>
                      </label>
                      <label className="workhub-task-filter-check">
                        <input name="taskFilterRequireChecklist" type="checkbox" checked={taskFilterRequireChecklist} onChange={(event) => setTaskFilterRequireChecklist(event.target.checked)} />
                        <span>Has checklist</span>
                      </label>
                      <div className="workhub-task-filter-group">
                        <span>Priority</span>
                        <div className="workhub-task-filter-priority-row">
                          {(['all', 'urgent', 'high', 'medium', 'low'] as const).map((value) => (
                            <button
                              key={value}
                              type="button"
                              className={`workhub-task-filter-pill${taskFilterPriority === value ? ' is-active' : ''}`}
                              onClick={() => setTaskFilterPriority(value)}
                            >
                              {value === 'all' ? 'Any' : PRIORITY_LABELS[value]}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                  </div>
                  {selectedTaskCount > 0 && (
                    <>
                      <div className="workhub-bulk-status-wrap">
                      <button
                        type="button"
                        className="workhub-status-manage-btn workhub-bulk-status-btn"
                        onClick={() => setBulkStatusMenuOpen((current) => !current)}
                        aria-label="Bulk change status"
                        title="Bulk change status"
                      >
                        ⇆
                      </button>
                      {bulkStatusMenuOpen && (
                        <div className="workhub-bulk-status-menu">
                          {selectedProjectEffectiveTaskStatuses.map((status) => (
                            <button key={status.id} type="button" onClick={() => void handleBulkStatusChange(status.id)}>
                              <span className="status-dot" style={{ ['--status-color' as string]: status.color }} />
                              <span>{status.label}</span>
                            </button>
                          ))}
                          <button type="button" className="workhub-bulk-clear-btn" onClick={clearTaskSelection}>Clear selection</button>
                        </div>
                      )}
                      </div>
                      <button
                        type="button"
                        className="workhub-status-manage-btn workhub-bulk-delete-btn"
                        onClick={() => setBulkDeleteConfirmOpen(true)}
                        aria-label="Delete selected tasks"
                        title="Delete selected tasks"
                      >
                        🗑
                      </button>
                    </>
                  )}
                </div>
                <div className={`workhub-task-table-wrap${selectedWorkspaceScopeType === 'finance' ? ' is-finance' : ''}`}>
                  {selectedWorkspaceScopeType === 'finance' && (
                    <div className="workhub-task-table-head shared">
                      <span className="workhub-select-all-head">
                        <input
                          type="checkbox"
                          checked={selectedTaskCount > 0 && selectedTaskCount === filteredTasks.length}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedTaskIds(filteredTasks.map((t) => t.id))
                            else setSelectedTaskIds([])
                          }}
                          aria-label="Select all tasks"
                        />
                        Task name
                      </span>
                      <span>Value</span>
                      <span>Assignee</span>
                      <span>Due date</span>
                      <span>Priority</span>
                      <span>Items</span>
                    </div>
                  )}
                  {(() => {
                  return renderedTaskStatuses
                    .map((status) => ({
                      status,
                      statusTasks: renderedTaskListsByStatus[status.id] || [],
                      statusTaskCount: filteredTaskCountByStatus[status.id] || 0,
                    }))
                    .map(({ status, statusTasks, statusTaskCount }) => {
                    const statusIsCollapsible = collapsibleStatusIdSet.has(status.id)
                    const statusIsExpanded = !statusIsCollapsible || selectedTaskStatusTab !== 'all' || expandedTaskStatusIds.includes(status.id)
                    const isCollapsedCollapsible = statusIsCollapsible && !statusIsExpanded && selectedTaskStatusTab === 'all'
                    return (
                      <section key={status.id} className={`workhub-task-group compact-group${statusIsCollapsible ? ' is-collapsible' : ''}${isCollapsedCollapsible ? ' is-collapsed' : ''}`}>
                        <div
                          className="workhub-task-group-head"
                          onClick={() => {
                            if (!statusIsCollapsible || selectedTaskStatusTab !== 'all') return
                            setExpandedTaskStatusIds((current) => current.includes(status.id)
                              ? current.filter((item) => item !== status.id)
                              : [...current, status.id])
                          }}
                        >
                          <div className="workhub-task-group-head-left">
                            {isCollapsedCollapsible && <span className="workhub-task-group-done-icon" aria-hidden="true">✓</span>}
                            <h3 style={{ '--status-color': status.color } as any}>{status.label}</h3>
                            {isCollapsedCollapsible && statusTaskCount > 0 && (
                              <span className="workhub-task-group-done-hint">— {statusTaskCount} task{statusTaskCount === 1 ? '' : 's'} completed</span>
                            )}
                            {selectedWorkspaceScopeType === 'finance' && (financeStatusTotals[status.id] ?? 0) > 0 && (
                              <span className="workhub-task-group-total">
                                {financeWorkspaceCurrency} {(financeStatusTotals[status.id] ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            className="workhub-task-group-toggle"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (!statusIsCollapsible || selectedTaskStatusTab !== 'all') return
                              setExpandedTaskStatusIds((current) => current.includes(status.id)
                                ? current.filter((item) => item !== status.id)
                                : [...current, status.id])
                            }}
                            title={statusIsExpanded ? 'Collapse status' : 'Expand status'}
                            aria-label={statusIsExpanded ? `Collapse ${status.label}` : `Expand ${status.label}`}
                          >
                            <span>{statusTaskCount}</span>
                            {statusIsCollapsible && selectedTaskStatusTab === 'all' && (
                              <span className="workhub-task-group-toggle-caret" aria-hidden="true">{statusIsExpanded ? '▾' : '▸'}</span>
                            )}
                          </button>
                        </div>
                        <div className="workhub-task-group-body">
                          {statusIsExpanded && (
                            <>
                          {statusTasks.map((task, index) => (
                            <TaskRow
                              key={task.id}
                              task={task}
                              dueDisplayMode={taskDueDisplayMode}
                              index={index}
                              isChecked={selectedTaskIdSet.has(task.id)}
                              isSelected={selectedTaskId === task.id}
                              isDropTarget={dropTargetKey === task.id}
                              isDragSource={dragTaskId === task.id}
                              statusMenuOpen={openTaskStatusMenuId === task.id}
                              priorityMenuOpen={openTaskPriorityMenuId === task.id}
                              moreMenuOpen={openTaskMoreMenuId === task.id}
                              assigneeMenuOpen={openTaskAssigneeMenuId === task.id}
                              editingTitle={editingTaskTitleId === task.id}
                              editingTitleText={editingTaskTitleId === task.id ? editingTaskTitleText : ''}
                              checklistExpanded={expandedTaskChecklistIdsSet.has(task.id)}
                              checklistDraft={taskChecklistDrafts[task.id] || ''}
                              editingChecklistItemId={editingChecklistTaskId === task.id ? editingChecklistItemId : null}
                              editingChecklistScope={editingChecklistTaskId === task.id ? editingChecklistScope : null}
                              editingChecklistText={editingChecklistTaskId === task.id ? editingChecklistItemText : ''}
                              isTaskBusy={busyKey === 'task'}
                              taskAssignee={memberByUid[task.assigneeUid]}
                              assignableMembers={assignableMembersByProjectId[task.projectId] || workspaceAssignableMembers}
                              taskCreator={memberByUid[task.createdBy]}
                              meta={taskMetaById[task.id] ?? emptyTaskRowMeta}
                              unreadCommentCount={unreadCommentCountByTaskId[task.id] || 0}
                              isFinanceLayout={selectedWorkspaceScopeType === 'finance'}
                              callbacks={taskRowCallbacks}
                            />
                          ))}
                          <QuickAddTaskRow
                            key={`quick-add-${status.id}`}
                            status={status}
                            assignableMembersByProjectId={assignableMembersByProjectId}
                            workspaceAssignableMembers={workspaceAssignableMembers}
                            memberByUid={memberByUid}
                            flatVisibleProjectOptions={flatVisibleProjectOptionsWithIcons}
                            defaultProjectId={quickAddDefaultProjectId}
                            selectedProjectId={selectedProjectId}
                            selectedTaskStatusTab={selectedTaskStatusTab}
                            isFinanceLayout={selectedWorkspaceScopeType === 'finance'}
                            financeCurrency={financeWorkspaceCurrency || 'OMR'}
                            currentUid={auth.currentUser?.uid || ''}
                            activeDragTaskId={dragTaskId}
                            activeDragStatusId={dragStatusId}
                            dropTargetKey={dropTargetKey}
                            focusTrigger={quickAddFocusStatusId === status.id ? quickAddFocusTrigger : 0}
                            onFocusHandled={() => setQuickAddFocusStatusId('')}
                            onDragOverEnd={(statusId) => setDropTargetKey(`end:${statusId}`)}
                            onDropToEnd={(statusId) => { void handleTaskReorder(dragTaskId, statusId, null) }}
                            onCommit={handleQuickAddTask}
                          />
                          {statusTaskCount > statusTasks.length && (
                            <button
                              type="button"
                              className="workhub-task-group-more-btn"
                              onClick={() => setStatusTaskRenderLimitById((current) => ({
                                ...current,
                                [status.id]: (current[status.id] || DEFAULT_STATUS_TASK_RENDER_LIMIT) + STATUS_TASK_RENDER_INCREMENT,
                              }))}
                            >
                              {`Show ${Math.min(STATUS_TASK_RENDER_INCREMENT, statusTaskCount - statusTasks.length)} more (${statusTasks.length}/${statusTaskCount})`}
                            </button>
                          )}
                            </>
                          )}
                        </div>
                      </section>
                    )
                  })
                  })()}
                </div>
              </div>

              {hasRelatedSelectionItems && (
                <details className="workhub-task-related-bar">
                  <summary>
                    <span>{selectedTask ? 'Task related items' : `${selectedProjectIntentMeta.subjectLabel} related items`}</span>
                    <small>{relatedSelectionItemCount} item{relatedSelectionItemCount === 1 ? '' : 's'}</small>
                  </summary>
                  <div className="workhub-task-related-groups">
                    {relatedDocsForSelection.length > 0 && (
                      <div className="workhub-task-related-group">
                        <h4>Documents</h4>
                        <div className="workhub-task-related-list">
                          {relatedDocsForSelection.slice(0, 8).map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              className={`workhub-task-related-chip${selectedDocumentId === item.id ? ' is-active' : ''}`}
                              title={item.title || 'Untitled document'}
                              onClick={() => {
                                setSelectedMoodBoardId('')
                                setSelectedDocumentId(item.id)
                                setActiveSection('notes')
                              }}
                            >
                              {item.title || 'Untitled document'}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {relatedNotesForSelection.length > 0 && (
                      <div className="workhub-task-related-group">
                        <h4>Notes</h4>
                        <div className="workhub-task-related-list">
                          {relatedNotesForSelection.slice(0, 8).map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              className={`workhub-task-related-chip${selectedDocumentId === item.id ? ' is-active' : ''}`}
                              title={item.title || 'Untitled note'}
                              onClick={() => {
                                setSelectedMoodBoardId('')
                                setSelectedDocumentId(item.id)
                                setActiveSection('notes')
                              }}
                            >
                              {item.title || 'Untitled note'}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {relatedMoodBoardsForSelection.length > 0 && (
                      <div className="workhub-task-related-group">
                        <h4>Mood boards</h4>
                        <div className="workhub-task-related-list">
                          {relatedMoodBoardsForSelection.slice(0, 8).map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              className={`workhub-task-related-chip${selectedMoodBoardId === item.id ? ' is-active' : ''}`}
                              title={item.title || 'Untitled mood board'}
                              onClick={() => {
                                setSelectedDocumentId('')
                                setSelectedMoodBoardId(item.id)
                                setActiveSection('moodboard')
                              }}
                            >
                              {item.title || 'Untitled mood board'}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </details>
              )}
            </div>

            <aside
              className={`workhub-task-detail-rail${isMobileWorkhubLayout ? ' is-mobile-drawer' : ''}${isMobileWorkhubLayout && selectedTask ? ' is-open' : ''}`}
              aria-hidden={isMobileWorkhubLayout && !selectedTask}
            >
              {selectedTask ? (
                <>
                  {isMobileWorkhubLayout && (
                    <div className="workhub-mobile-detail-drawer-head">
                      <button
                        type="button"
                        className="workhub-mobile-detail-drawer-handle"
                        aria-label="Close task details"
                        onClick={() => setSelectedTaskId('')}
                        onTouchStart={(e) => {
                          const startY = e.touches[0].clientY
                          const el = e.currentTarget
                          const onMove = (mv: TouchEvent) => {
                            if (mv.touches[0].clientY - startY > 60) {
                              el.removeEventListener('touchmove', onMove)
                              el.removeEventListener('touchend', onEnd)
                              setSelectedTaskId('')
                            }
                          }
                          const onEnd = () => {
                            el.removeEventListener('touchmove', onMove)
                            el.removeEventListener('touchend', onEnd)
                          }
                          el.addEventListener('touchmove', onMove, { passive: true })
                          el.addEventListener('touchend', onEnd, { passive: true })
                        }}
                      />
                      <div className="workhub-mobile-detail-drawer-title-row">
                        <strong>Task details</strong>
                        <button type="button" className="workhub-ghost-mini" onClick={() => setSelectedTaskId('')}>✕</button>
                      </div>
                    </div>
                  )}
                  <div className="workhub-detail-card">
                    {!isMobileWorkhubLayout && (
                      <div className="workhub-detail-card-head">
                        <strong>Task details</strong>
                        <div className="workhub-detail-card-head-actions">
                          <button
                            type="button"
                            className="workhub-detail-delete-task-btn"
                            title="Delete task"
                            aria-label="Delete task"
                            onClick={() => setTaskDeleteConfirmOpen(true)}
                          >
                            <span className="workhub-detail-danger-icon" aria-hidden="true">🗑</span>
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="workhub-detail-icon-row">
                      <div className="workhub-detail-icon-wrap">
                        <button
                          type="button"
                          className="workhub-detail-icon-btn"
                          title={`Status: ${selectedTask.status}`}
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect()
                            if (detailMenuOpen === 'status') { setDetailMenuOpen(''); setDetailMenuCoords(null) }
                            else { setDetailMenuOpen('status'); setDetailMenuCoords({ top: rect.bottom + 4, left: rect.left, right: window.innerWidth - rect.right }) }
                          }}
                        >
                          <span className="workhub-detail-chip-label">Status</span>
                          <span className="workhub-detail-chip-value">{selectedProjectEffectiveTaskStatuses.find((value) => value.id === selectedTask.status)?.label || selectedTask.status}</span>
                          <span className="workhub-detail-chip-edit" aria-hidden="true">▾</span>
                        </button>
                      </div>

                      <div className="workhub-detail-icon-wrap">
                        <button
                          type="button"
                          className="workhub-detail-icon-btn"
                          title={`Priority: ${PRIORITY_LABELS[selectedTask.priority]}`}
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect()
                            if (detailMenuOpen === 'priority') { setDetailMenuOpen(''); setDetailMenuCoords(null) }
                            else { setDetailMenuOpen('priority'); setDetailMenuCoords({ top: rect.bottom + 4, left: rect.left, right: window.innerWidth - rect.right }) }
                          }}
                        >
                          <span className="workhub-detail-chip-label">Priority</span>
                          <span className="workhub-detail-chip-value">{PRIORITY_LABELS[selectedTask.priority]}</span>
                          <span className="workhub-detail-chip-edit" aria-hidden="true">▾</span>
                        </button>
                      </div>

                      <div className="workhub-detail-icon-wrap">
                        <button
                          type="button"
                          className="workhub-detail-icon-btn"
                          title="Assignee"
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect()
                            if (detailMenuOpen === 'assignee') { setDetailMenuOpen(''); setDetailMenuCoords(null) }
                            else { setDetailMenuOpen('assignee'); setDetailMenuCoords({ top: rect.bottom + 4, left: rect.left, right: window.innerWidth - rect.right }) }
                          }}
                        >
                          <span className="workhub-detail-chip-label">Assignee</span>
                          <span className="workhub-detail-chip-value">{memberByUid[selectedTask.assigneeUid]?.displayName || memberByUid[selectedTask.assigneeUid]?.email || 'Unassigned'}</span>
                          <span className="workhub-detail-chip-edit" aria-hidden="true">▾</span>
                        </button>
                      </div>

                      <div className="workhub-detail-icon-wrap">
                        <button
                          type="button"
                          className="workhub-detail-icon-btn"
                          title={`Due date: ${formatDueDateShort(selectedTask.dueDate || '')}`}
                          onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect()
                            if (detailMenuOpen === 'dueDate') { setDetailMenuOpen(''); setDetailMenuCoords(null) }
                            else { setDetailMenuOpen('dueDate'); setDetailMenuCoords({ top: rect.bottom + 4, left: rect.left, right: window.innerWidth - rect.right }) }
                          }}
                        >
                          <span className="workhub-detail-chip-label">Due date</span>
                          <span className="workhub-detail-chip-value">{formatDueDateShort(selectedTask.dueDate || '')}</span>
                          <span className="workhub-detail-chip-edit" aria-hidden="true">▾</span>
                        </button>
                      </div>

                      {isMobileWorkhubLayout && (
                        <div className="workhub-detail-icon-wrap">
                          <button
                            type="button"
                            className="workhub-detail-icon-btn workhub-detail-icon-btn-danger"
                            title="Delete task"
                            aria-label="Delete task"
                            onClick={() => setTaskDeleteConfirmOpen(true)}
                          >
                            <span className="workhub-detail-danger-icon" aria-hidden="true">🗑</span>
                          </button>
                        </div>
                      )}
                    </div>
                    {selectedTaskFinanceInfo !== null && (
                      <div className="workhub-task-finance-block">
                        <div className="workhub-task-finance-head">
                          <span className="workhub-task-finance-label">Invoice value</span>
                          <span className="workhub-task-finance-currency">{selectedTaskFinanceInfo.currency}</span>
                        </div>
                        <div className="workhub-task-finance-inputs">
                          <label className="workhub-task-finance-field">
                            <span>Total value</span>
                            <input
                              type="number"
                              min={0}
                              step={0.01}
                              value={selectedTaskValueAmountDraft}
                              onChange={(event) => setSelectedTaskValueAmountDraft(event.target.value)}
                              onBlur={() => handleSelectedTaskValueSave(selectedTask)}
                              placeholder="0.00"
                            />
                          </label>
                          <label className="workhub-task-finance-field">
                            <span>Currency</span>
                            <input
                              type="text"
                              value={selectedTaskValueCurrencyDraft || selectedTaskFinanceInfo.currency}
                              onChange={(event) => setSelectedTaskValueCurrencyDraft(event.target.value.toUpperCase())}
                              onBlur={() => handleSelectedTaskValueSave(selectedTask)}
                              maxLength={6}
                              placeholder="OMR"
                            />
                          </label>
                        </div>
                        {selectedTaskFinanceInfo.totalValue > 0 && (
                          <div className="workhub-task-finance-summary">
                            <div className="workhub-task-finance-track">
                              <div
                                className="workhub-task-finance-fill"
                                style={{ width: `${Math.min(100, Math.round((selectedTaskFinanceInfo.usedValue / selectedTaskFinanceInfo.totalValue) * 100))}%` }}
                              />
                            </div>
                            <div className="workhub-task-finance-pills">
                              <span className="workhub-finance-pill used" title="Allocated from checklist items">
                                Used: {selectedTaskFinanceInfo.usedValue.toFixed(2)}
                              </span>
                              <span className={`workhub-finance-pill remaining${selectedTaskFinanceInfo.remaining < 0 ? ' over' : ''}`}>
                                {selectedTaskFinanceInfo.remaining < 0
                                  ? `Over: ${Math.abs(selectedTaskFinanceInfo.remaining).toFixed(2)}`
                                  : `Remaining: ${selectedTaskFinanceInfo.remaining.toFixed(2)}`}
                              </span>
                            </div>
                            <p className="workhub-task-finance-hint">Set amounts on checklist items below to track usage</p>
                          </div>
                        )}
                      </div>
                    )}
                    <label className="workhub-task-detail-name-field">
                      <span>Task name</span>
                      <textarea
                        className="workhub-task-title-edit-input workhub-task-name-input"
                        value={selectedTaskTitleDraft}
                        onChange={(event) => setSelectedTaskTitleDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (!(event.key === 'Enter' && (event.ctrlKey || event.metaKey))) return
                          event.preventDefault()
                          handleSelectedTaskTitleSave(selectedTask)
                          event.currentTarget.blur()
                        }}
                        onBlur={() => handleSelectedTaskTitleSave(selectedTask)}
                        rows={2}
                      />
                    </label>
                    <textarea
                      className="workhub-task-details-input"
                      value={selectedTaskDescriptionDraft}
                      onChange={(event) => setSelectedTaskDescriptionDraft(event.target.value)}
                      onBlur={() => handleSelectedTaskDescriptionSave(selectedTask)}
                      placeholder="Task details"
                    />
                    <details className="workhub-detail-collapsible-info">
                      <summary>Task information</summary>
                      <div className="workhub-detail-meta">
                        <span>{`${selectedTaskParentEntityLabel}: ${projectNameById[selectedTask.projectId] || `Unknown ${selectedTaskParentEntityLabel.toLowerCase()}`}`}</span>
                        <span>Assignee: {memberByUid[selectedTask.assigneeUid]?.displayName || memberByUid[selectedTask.assigneeUid]?.email || 'Unassigned'}</span>
                        <span>Start date: {formatDueDateShort(selectedTask.startDate || '')}</span>
                        <span>Due date: {formatDueDateShort(selectedTask.dueDate || '')}</span>
                        <span>Updated: {formatTime(selectedTask.updatedAt)}</span>
                      </div>
                    </details>
                  </div>

                  <WorkhubTaskChecklistCard
                    task={selectedTask}
                    checklist={buildChecklist(selectedTask)}
                    getChecklistDetailKey={getChecklistDetailKey}
                    expandedChecklistDetailKeys={expandedChecklistDetailKeys}
                    onToggleChecklistItemDetails={toggleChecklistItemDetails}
                    editingChecklistScope={editingChecklistScope}
                    editingChecklistTaskId={editingChecklistTaskId}
                    editingChecklistItemId={editingChecklistItemId}
                    editingChecklistItemText={editingChecklistItemText}
                    onEditingChecklistItemTextChange={setEditingChecklistItemText}
                    onChecklistItemToggle={(itemId, checked) => handleChecklistItemToggle(selectedTask, itemId, checked)}
                    onChecklistItemEditStart={handleChecklistItemEditStart}
                    onChecklistItemEditSave={(itemId) => handleChecklistItemEditSave(selectedTask, itemId)}
                    onChecklistItemEditCancel={handleChecklistItemEditCancel}
                    onChecklistRemove={(itemId) => handleChecklistRemove(selectedTask, itemId)}
                    checklistDetailsDrafts={checklistDetailsDrafts}
                    onChecklistDetailsDraftChange={(detailKey, value) => setChecklistDetailsDrafts((current) => ({ ...current, [detailKey]: value }))}
                    onChecklistItemDetailsSave={(itemId) => handleChecklistItemDetailsSave(selectedTask, itemId)}
                    checklistAttachmentDrafts={checklistAttachmentDrafts}
                    onChecklistAttachmentDraftChange={(detailKey, value) => setChecklistAttachmentDrafts((current) => ({ ...current, [detailKey]: value }))}
                    onChecklistAttachmentAdd={(itemId) => handleChecklistAttachmentAdd(selectedTask, itemId)}
                    onChecklistAttachmentFileUpload={(itemId, files) => { void handleChecklistAttachmentFileUpload(selectedTask, itemId, files) }}
                    uploadingChecklistAttachmentKey={uploadingChecklistAttachmentKey}
                    attachmentViewMode={attachmentViewMode}
                    isImageAttachmentUrl={isImageAttachmentUrl}
                    onOpenAttachmentLightbox={openAttachmentLightbox}
                    getAttachmentReviewCount={(url) => {
                      const review = attachmentReviews[url]
                      return (review?.notes.trim() ? 1 : 0)
                        + (review?.comments.length || 0)
                        + (review?.markers.length || 0)
                        + (review?.modificationChecks.length || 0)
                    }}
                    onChecklistAttachmentRemove={(itemId, url) => { if (window.confirm('Remove this attachment?')) handleChecklistAttachmentRemove(selectedTask, itemId, url) }}
                    checklistLinkDrafts={checklistLinkDrafts}
                    onChecklistLinkDraftChange={(detailKey, value) => setChecklistLinkDrafts((current) => ({ ...current, [detailKey]: value }))}
                    onChecklistLinkAdd={(itemId) => handleChecklistLinkAdd(selectedTask, itemId)}
                    onChecklistLinkRemove={(itemId, link) => { if (window.confirm('Remove this link?')) handleChecklistLinkRemove(selectedTask, itemId, link) }}
                    taskChecklistDraft={taskChecklistDrafts[selectedTask.id] || ''}
                    onTaskChecklistDraftChange={(value) => setTaskChecklistDrafts((current) => ({ ...current, [selectedTask.id]: value }))}
                    isFinanceLayout={selectedWorkspaceScopeType === 'finance'}
                    taskChecklistValueDraft={taskChecklistValueDrafts[selectedTask.id] || ''}
                    onTaskChecklistValueDraftChange={(value) => setTaskChecklistValueDrafts((current) => ({ ...current, [selectedTask.id]: value }))}
                    financeCurrency={selectedTask.valueCurrency || 'OMR'}
                    onChecklistAdd={(valueAmount) => {
                      if (selectedWorkspaceScopeType !== 'finance') {
                        handleChecklistAdd(selectedTask)
                        return
                      }
                      const draft = (taskChecklistDrafts[selectedTask.id] || '').trim()
                      if (!draft) return
                      const normalizedValue = typeof valueAmount === 'number' && Number.isFinite(valueAmount) && valueAmount >= 0
                        ? Math.round(valueAmount * 100) / 100
                        : undefined
                      const newItem: WorkhubTaskChecklistItem = {
                        id: `chk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                        text: draft,
                        completed: false,
                        valueAmount: normalizedValue,
                      }
                      const next = [...buildChecklist(selectedTask), newItem]
                      setTaskChecklistDrafts((current) => ({ ...current, [selectedTask.id]: '' }))
                      setTaskChecklistValueDrafts((current) => ({ ...current, [selectedTask.id]: '' }))
                      void handleTaskUpdate(selectedTask, { checklist: next }, { silent: true })
                    }}
                    checklistAddDisabled={!taskChecklistDrafts[selectedTask.id]?.trim() || busyKey === 'task'}
                  />

                  {renderDiscussionCard()}

                  <WorkhubTaskAttachmentCard
                    task={selectedTask}
                    collapsed={taskAttachmentsCollapsed}
                    onToggleCollapsed={() => setTaskAttachmentsCollapsed((current) => !current)}
                    attachmentViewMode={attachmentViewMode}
                    onAttachmentViewModeChange={setAttachmentViewMode}
                    attachmentTitleDraft={taskAttachmentTitleDrafts[selectedTask.id] || ''}
                    onAttachmentTitleDraftChange={(value) => setTaskAttachmentTitleDrafts((current) => ({ ...current, [selectedTask.id]: value }))}
                    attachmentUrlDraft={taskAttachmentDrafts[selectedTask.id] || ''}
                    onAttachmentUrlDraftChange={(value) => setTaskAttachmentDrafts((current) => ({ ...current, [selectedTask.id]: value }))}
                    attachmentFilePathDraft={taskAttachmentFilePathDrafts[selectedTask.id] || ''}
                    attachmentFileDrafts={taskAttachmentFileDrafts[selectedTask.id] || []}
                    onAttachmentFileDraftsChange={(files) => setTaskAttachmentFileDrafts((current) => ({ ...current, [selectedTask.id]: files }))}
                    onAttachmentFilePathDraftChange={(value) => setTaskAttachmentFilePathDrafts((current) => ({ ...current, [selectedTask.id]: value }))}
                    uploadingTaskAttachmentId={uploadingTaskAttachmentId}
                    onAddAttachment={() => handleTaskAttachmentAdd(selectedTask)}
                    onUploadAttachmentFiles={() => {
                      const files = taskAttachmentFileDrafts[selectedTask.id] || []
                      if (files.length === 0) return
                      void (async () => {
                        await handleTaskAttachmentFileUpload(selectedTask, files)
                        setTaskAttachmentFileDrafts((current) => ({ ...current, [selectedTask.id]: [] }))
                        setTaskAttachmentFilePathDrafts((current) => ({ ...current, [selectedTask.id]: '' }))
                      })()
                    }}
                    attachments={getTaskAttachments(selectedTask)}
                    getAttachmentTitle={(url) => getTaskAttachmentTitle(selectedTask, url)}
                    getAttachmentReviewCount={(url) => {
                      const review = attachmentReviews[url]
                      return (review?.notes.trim() ? 1 : 0)
                        + (review?.comments.length || 0)
                        + (review?.markers.length || 0)
                        + (review?.modificationChecks.length || 0)
                    }}
                    isImageAttachmentUrl={isImageAttachmentUrl}
                    onOpenAttachmentLightbox={openAttachmentLightbox}
                    onRemoveAttachment={(url) => handleTaskAttachmentRemove(selectedTask, url)}
                  />

                  <div className="workhub-detail-card workhub-task-resource-card">
                    <div className="workhub-task-attachments-head">
                      <span>{`Links (${getTaskLinks(selectedTask).length})`}</span>
                      <div className="workhub-view-mode-toggle">
                        <button type="button" className={attachmentViewMode === 'list' ? 'active' : ''} onClick={() => setAttachmentViewMode('list')} title="Minimal List">List</button>
                        <button type="button" className={attachmentViewMode === 'thumbnail' ? 'active' : ''} onClick={() => setAttachmentViewMode('thumbnail')} title="Small Thumbnails">Thumbs</button>
                        <button type="button" className={attachmentViewMode === 'card' ? 'active' : ''} onClick={() => setAttachmentViewMode('card')} title="Cards">Cards</button>
                      </div>
                    </div>
                    <div className="workhub-task-attachment-editor">
                      <div className="workhub-checklist-url-row compact-row is-stacked">
                        <input
                          type="text"
                          value={taskLinkTitleDrafts[selectedTask.id] || ''}
                          onChange={(event) => setTaskLinkTitleDrafts((current) => ({ ...current, [selectedTask.id]: event.target.value }))}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault()
                              handleTaskLinkAdd(selectedTask)
                            }
                          }}
                          placeholder="Link title"
                        />
                      </div>
                      <div className="workhub-checklist-url-row compact-row">
                        <input
                          type="url"
                          value={taskLinkDrafts[selectedTask.id] || ''}
                          onChange={(event) => setTaskLinkDrafts((current) => ({ ...current, [selectedTask.id]: event.target.value }))}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault()
                              handleTaskLinkAdd(selectedTask)
                            }
                          }}
                          placeholder="Task link URL"
                        />
                        <button type="button" onClick={() => handleTaskLinkAdd(selectedTask)}>
                          {taskLinkEditingDrafts[selectedTask.id] ? 'Save' : 'Add link'}
                        </button>
                      </div>
                      {taskLinkEditingDrafts[selectedTask.id] && (
                        <div className="workhub-checklist-url-row compact-row is-stacked">
                          <button type="button" className="workhub-ghost-btn" onClick={() => handleTaskLinkEditCancel(selectedTask.id)}>
                            Cancel edit
                          </button>
                        </div>
                      )}
                    </div>
                    {getTaskLinks(selectedTask).length > 0 && (
                      <div className={`workhub-checklist-url-list view-${attachmentViewMode}`}>
                        {getTaskLinks(selectedTask).map((link) => {
                          const linkTitle = getTaskLinkTitle(selectedTask, link)
                          const linkHost = getUrlHostLabel(link)
                          const linkCreatorUid = selectedTask.linkCreatedBy?.[link] || selectedTask.createdBy
                          const linkCreator = memberByUid[linkCreatorUid]
                          const linkCreatorLabel = linkCreator?.displayName || linkCreator?.email || 'Unknown'
                          const linkCreatorInitials = getInitials(linkCreator?.displayName || linkCreator?.email || 'Link')
                          return (
                            <div key={link} className="workhub-checklist-url-item workhub-task-image-item workhub-task-link-item">
                              <a href={link} target="_blank" rel="noreferrer" className="workhub-task-image-link workhub-task-link-card" title={link}>
                                <span className="workhub-link-hero">
                                  <span className="workhub-task-attachment-icon">🔗</span>
                                  <span className="workhub-attachment-copy workhub-link-copy">
                                    <strong>{linkTitle}</strong>
                                    <small>{linkHost}</small>
                                  </span>
                                </span>
                                {attachmentViewMode !== 'list' && (
                                  <span className="workhub-link-meta" title={linkCreatorLabel}>
                                    <span className="workhub-link-meta-avatar">
                                      {linkCreator?.photoURL
                                        ? <img src={linkCreator.photoURL} alt={linkCreatorLabel} />
                                        : <span>{linkCreatorInitials}</span>}
                                    </span>
                                  </span>
                                )}
                              </a>
                              <div className="workhub-link-item-actions">
                                <button type="button" title="Edit link" aria-label="Edit link" onClick={() => handleTaskLinkEditStart(selectedTask, link)}>✏</button>
                                <button
                                  type="button"
                                  title="Remove link"
                                  aria-label="Remove link"
                                  onClick={() => {
                                    if (!window.confirm('Remove this link?')) return
                                    handleTaskLinkRemove(selectedTask, link)
                                  }}
                                >
                                  🗑
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                    {getTaskLinks(selectedTask).length === 0 && (
                      <div className="workhub-empty-state">No links yet.</div>
                    )}
                  </div>

                </>
              ) : selectedProject ? (
                <div className="workhub-detail-card">
                  <div className="workhub-task-row-title detail-title">
                    <span className="workhub-project-dot" style={{ background: selectedProjectColorDraft }} />
                    <h3 className="workhub-project-properties-title">
                      {canEditSelectedProject ? `${selectedProjectIntentMeta.subjectLabel} properties` : `${selectedProjectIntentMeta.subjectLabel} details`}
                    </h3>
                  </div>

                  <WorkhubEntityIntentDetailForm
                    intent={selectedProjectEffectiveIntent}
                    canEdit={canEditSelectedProject}
                    name={selectedProjectNameDraft}
                    onNameChange={setSelectedProjectNameDraft}
                    onNameEnter={() => { void handleSaveSelectedProjectDetails() }}
                    projectType={selectedProjectTypeDraft}
                    typeOptions={selectedProjectTypeOptions}
                    onProjectTypeChange={setSelectedProjectTypeDraft}
                    startDate={selectedProjectStartDateDraft}
                    onStartDateChange={setSelectedProjectStartDateDraft}
                    deadline={selectedProjectDeadlineDraft}
                    onDeadlineChange={setSelectedProjectDeadlineDraft}
                    submissionTime={selectedProjectSubmissionTimeDraft}
                    onSubmissionTimeChange={setSelectedProjectSubmissionTimeDraft}
                    valueAmount={selectedProjectValueAmountDraft}
                    onValueAmountChange={setSelectedProjectValueAmountDraft}
                    valueCurrency={selectedProjectValueCurrencyDraft}
                    onValueCurrencyChange={setSelectedProjectValueCurrencyDraft}
                    narrative={selectedProjectNarrativeDraft}
                    onNarrativeChange={setSelectedProjectNarrativeDraft}
                    onNarrativeBlur={() => { void handleSelectedProjectDescriptionBlur() }}
                    detailDrafts={selectedProjectIntentDetailDrafts}
                    onDetailDraftChange={(key, value) => {
                      setSelectedProjectIntentDetailDrafts((current) => ({
                        ...current,
                        [key]: value,
                      }))
                    }}
                  />

                  {renderDiscussionCard()}

                  <div className="workhub-detail-grid workhub-project-detail-grid">
                    <div className="workhub-span-2">
                      <WorkhubProjectAttachmentCard
                        collapsed={projectAttachmentsCollapsed}
                        onToggleCollapsed={() => setProjectAttachmentsCollapsed((current) => !current)}
                        attachmentViewMode={attachmentViewMode}
                        onAttachmentViewModeChange={setAttachmentViewMode}
                        canEdit={canEditSelectedProject}
                        attachmentTitleDraft={selectedProjectAttachmentTitleDraft}
                        onAttachmentTitleDraftChange={setSelectedProjectAttachmentTitleDraft}
                        attachmentUrlDraft={selectedProjectAttachmentDraft}
                        onAttachmentUrlDraftChange={setSelectedProjectAttachmentDraft}
                        attachmentFilePathDraft={selectedProjectAttachmentFilePathDraft}
                        attachmentFileDrafts={selectedProjectAttachmentFileDrafts}
                        onAttachmentFileDraftsChange={setSelectedProjectAttachmentFileDrafts}
                        onAttachmentFilePathDraftChange={setSelectedProjectAttachmentFilePathDraft}
                        uploadingAttachment={uploadingSelectedProjectAttachment}
                        onAddAttachment={() => { void handleSelectedProjectAttachmentAdd() }}
                        onUploadAttachments={() => { void handleSelectedProjectAttachmentFileUpload() }}
                        attachments={selectedProjectAttachments}
                        getAttachmentTitle={(url) => selectedProject.attachmentTitles?.[url]?.trim() || deriveAttachmentTitle(url)}
                        isImageAttachmentUrl={isImageAttachmentUrl}
                        onOpenAttachmentLightbox={openAttachmentLightbox}
                        onRemoveAttachment={(url) => { void handleSelectedProjectAttachmentRemove(url) }}
                      />
                    </div>
                  </div>

                  <div className="workhub-detail-grid workhub-project-detail-grid">
                    <label>
                      <span>Status color</span>
                      <div className="workhub-project-color-select">
                        <button
                          type="button"
                          className={`workhub-project-color-select-btn${selectedProjectColorMenuOpen ? ' is-open' : ''}`}
                          onClick={() => setSelectedProjectColorMenuOpen((current) => !current)}
                          disabled={!canEditSelectedProject}
                        >
                          <span className="workhub-project-color-swatch" style={{ background: selectedProjectColorDraft }} />
                          <span className="workhub-project-color-select-copy">
                            <strong>{selectedProjectColorMeaning.label}</strong>
                            <small>{selectedProjectColorMeaning.hint}</small>
                          </span>
                          <span className="workhub-project-color-caret" aria-hidden="true">{selectedProjectColorMenuOpen ? '▴' : '▾'}</span>
                        </button>
                        {selectedProjectColorMenuOpen && (
                          <div className="workhub-project-color-select-menu">
                            {selectedWorkspaceProjectColorMeanings.map((option) => (
                              <button
                                key={option.color}
                                type="button"
                                className={`workhub-project-color-option${selectedProjectColorDraft === option.color ? ' is-active' : ''}`}
                                onClick={() => { void handleSelectedProjectColorSelect(option.color) }}
                              >
                                <span className="workhub-project-color-swatch" style={{ background: option.color }} />
                                <span className="workhub-project-color-option-copy">
                                  <strong>{option.label}</strong>
                                  <small>{option.hint}</small>
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </label>
                  </div>

                  <details className="workhub-detail-collapsible-info">
                    <summary>{`${selectedProjectIntentMeta.subjectLabel} information`}</summary>
                    <div className="workhub-detail-meta">
                      <span>{`Workspace: ${selectedWorkspaceDisplayName}`}</span>
                      <span>{`Parent ${selectedProjectIntentMeta.subjectLabel.toLowerCase()}: ${selectedProject.parentProjectId ? (projectNameById[selectedProject.parentProjectId] || 'Unknown item') : 'Root level'}`}</span>
                      <span>Created: {formatTime(selectedProject.createdAt)}</span>
                      <span>Updated: {formatTime(selectedProject.updatedAt)}</span>
                    </div>
                  </details>

                  {canEditSelectedProject ? (
                    <div className="workhub-project-detail-actions">
                      <button type="button" className="workhub-ghost-btn" onClick={() => setProjectAccessDialogId(selectedProject.id)}>
                        {`Open ${selectedProjectIntentMeta.subjectLabel.toLowerCase()} settings`}
                      </button>
                      <button
                        type="button"
                        className="workhub-primary-btn"
                        disabled={!selectedProjectDetailsChanged || busyKey === `project-detail:${selectedProject.id}`}
                        onClick={() => { void handleSaveSelectedProjectDetails() }}
                      >
                        {busyKey === `project-detail:${selectedProject.id}` ? 'Saving…' : `Save ${selectedProjectIntentMeta.subjectLabel.toLowerCase()}`}
                      </button>
                    </div>
                  ) : (
                    <div className="workhub-project-detail-readonly-note">Read-only: contact a workspace admin to edit this item.</div>
                  )}
                </div>
              ) : (
                <div className="workhub-detail-card">
                  <div className="workhub-empty-state">Select a task or workspace item to view details.</div>
                </div>
              )}
            </aside>
          </main>
        )}

        {isMobileWorkhubLayout && activeSection === 'tasks' && selectedTask && (
          <button
            type="button"
            className="workhub-task-detail-drawer-backdrop"
            aria-label="Close task details"
            onClick={() => setSelectedTaskId('')}
          />
        )}

        {activeSection === 'home' && (
          <main className="workhub-section-stack">
            <section className="workhub-panel">
              <div className="workhub-panel-head">
                <div>
                  <h2>Home</h2>
                  <p>
                    {selectedWorkspaceId
                      ? `${selectedWorkspaceHomeTemplate.label}. ${selectedWorkspaceHomeTemplate.description}`
                      : 'Select a workspace to load template-focused home panels.'}
                  </p>
                </div>
              </div>
              <div className="workhub-summary-strip">
                <div className="workhub-summary-tile"><strong>{selectedWorkspace?.name || 'No workspace selected'}</strong><span>Current workspace</span></div>
                <div className="workhub-summary-tile"><strong>{selectedProject ? selectedProjectDisplayName : 'All projects'}</strong><span>Current scope</span></div>
                <div className="workhub-summary-tile"><strong>{taskCounts.total}</strong><span>Tasks in scope</span></div>
                <div className="workhub-summary-tile"><strong>{tasksByAssignee.length}</strong><span>Members with assigned tasks</span></div>
              </div>
              {selectedWorkspaceId && selectedWorkspaceTemplateResolution.warning ? (
                <div className="workhub-template-warning-note">{selectedWorkspaceTemplateResolution.warning}</div>
              ) : null}
              {selectedWorkspaceId ? (
                <div className="workhub-home-template-grid">
                  {homeTemplateWidgets.map((widget) => (
                    <article key={widget.id} className={`workhub-overview-card workhub-home-widget${widget.tone ? ` is-${widget.tone}` : ''}`}>
                      <div className="workhub-overview-head">
                        <h3>{widget.title}</h3>
                        <span>{widget.value}</span>
                      </div>
                      <p className="workhub-home-widget-note">{widget.detail}</p>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="workhub-empty-state">Select a workspace to view template-based home widgets.</div>
              )}
              <div className="workhub-home-actions">
                <button className="workhub-primary-btn" onClick={() => navigateToWorkspaceSection('dashboard')} disabled={!selectedWorkspaceId}>Open workspace overview</button>
                <button className="workhub-ghost-btn" onClick={() => navigateToWorkspaceSection('tasks')} disabled={!selectedWorkspaceId}>Go to tasks</button>
                <button className="workhub-ghost-btn" onClick={() => selectedWorkspaceId && openWorkspaceSettings(selectedWorkspaceId)} disabled={!selectedWorkspaceId}>Workspace settings</button>
              </div>
            </section>
          </main>
        )}

          {isMobileWorkhubLayout && (
            <nav className="workhub-mobile-footer" aria-label="Mobile navigation">
              <button
                type="button"
                className={`workhub-mobile-footer-btn${activeWorkspaceTab === 'home' ? ' is-active' : ''}`}
                onClick={() => {
                  setQuickAddOpen(false)
                  navigateToWorkspaceSection('home')
                }}
                aria-label="Home"
                title="Home"
              >
                <span aria-hidden="true">⌂</span>
                <small>Home</small>
              </button>
              <button
                type="button"
                className={`workhub-mobile-footer-btn${activeWorkspaceTab === 'tasks' ? ' is-active' : ''}`}
                onClick={() => {
                  setQuickAddOpen(false)
                  navigateToWorkspaceSection('tasks')
                }}
                aria-label="Tasks"
                title="Tasks"
              >
                <span aria-hidden="true">☑</span>
                <small>Tasks</small>
              </button>
              <button
                type="button"
                className="workhub-mobile-footer-btn workhub-mobile-footer-btn-quick"
                onClick={(event) => {
                  setQuickAddOpen(false)
                  handleProjectActionMenu('__workspace__', event)
                }}
                aria-label="Quick add"
                title="Quick add"
                disabled={!selectedWorkspaceId}
              >
                <span aria-hidden="true">+</span>
                <small>Add</small>
              </button>
              <button
                type="button"
                className={`workhub-mobile-footer-btn${mobileWorkspacePanelOpen ? ' is-active' : ''}`}
                onClick={() => {
                  setQuickAddOpen(false)
                  setGearMenuOpen(false)
                  setMobileWorkspacePanelOpen((current) => !current)
                }}
                aria-label="Workspaces"
                title="Workspaces"
              >
                <span aria-hidden="true">▤</span>
                <small>Workspaces</small>
              </button>
              <button
                type="button"
                className="workhub-mobile-footer-btn"
                onClick={() => {
                  setQuickAddOpen(false)
                  setAccountMenuOpen(false)
                  handleOpenAccountSettings()
                }}
                aria-label="Account settings"
                title="Account settings"
              >
                <span aria-hidden="true">◯</span>
                <small>Account</small>
              </button>
            </nav>
          )}

          </section>
        </div>

        {globalFinderOpen && (
          <div className="workhub-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeGlobalFinder() }}>
            <div className="workhub-modal workhub-global-finder-modal" onMouseDown={(event) => event.stopPropagation()}>
              <div className="workhub-modal-head">
                <div>
                  <h2>Find entity by name</h2>
                  <p>Search leads, proposals, and projects across every workspace you can access.</p>
                </div>
                <button type="button" className="workhub-ghost-btn" onClick={closeGlobalFinder}>Close</button>
              </div>
              <div className="workhub-global-finder-body">
                <label className="workhub-global-finder-input-wrap">
                  <span>Search</span>
                  <input
                    ref={globalFinderInputRef}
                    type="text"
                    value={globalFinderQuery}
                    onChange={(event) => {
                      setGlobalFinderQuery(event.target.value)
                      setGlobalFinderActiveIndex(0)
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'ArrowDown') {
                        event.preventDefault()
                        setGlobalFinderActiveIndex((current) => Math.min(current + 1, Math.max(globalFinderResults.length - 1, 0)))
                        return
                      }
                      if (event.key === 'ArrowUp') {
                        event.preventDefault()
                        setGlobalFinderActiveIndex((current) => Math.max(current - 1, 0))
                        return
                      }
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        const selectedIndex = globalFinderResolvedActiveIndex >= 0 ? globalFinderResolvedActiveIndex : 0
                        const selectedEntry = globalFinderResults[selectedIndex]
                        if (selectedEntry) handleGlobalFinderSelect(selectedEntry)
                        return
                      }
                      if (event.key === 'Escape') {
                        event.preventDefault()
                        closeGlobalFinder()
                      }
                    }}
                    placeholder="Type an entity name"
                  />
                </label>
                <div className="workhub-global-finder-results" role="listbox" aria-label="Entity search results">
                  {globalFinderResults.length === 0 ? (
                    <div className="workhub-global-finder-empty">
                      {globalFinderQuery.trim()
                        ? `No entities match "${globalFinderQuery.trim()}".`
                        : 'No entities available yet.'}
                    </div>
                  ) : (
                    globalFinderResults.map((entry, index) => (
                      <button
                        key={entry.projectId}
                        type="button"
                        className={`workhub-global-finder-result${index === globalFinderResolvedActiveIndex ? ' is-active' : ''}`}
                        onMouseEnter={() => setGlobalFinderActiveIndex(index)}
                        onClick={() => handleGlobalFinderSelect(entry)}
                        role="option"
                        aria-selected={index === globalFinderResolvedActiveIndex}
                      >
                        <div className="workhub-global-finder-result-main">
                          <strong>{entry.name}</strong>
                          <span className="workhub-global-finder-result-type">{entry.subjectLabel}</span>
                        </div>
                        <div className="workhub-global-finder-result-meta">
                          <span>{entry.workspaceName}</span>
                          {entry.clientName && <span>{entry.clientName}</span>}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <CreateWorkspaceDialog
          isOpen={workspaceCreateDialogOpen}
          onClose={() => setWorkspaceCreateDialogOpen(false)}
          workspaceName={workspaceName}
          workspaceDescription={workspaceDescription}
          workspaceTemplateId={workspaceTemplateId}
          workspaceTemplates={workspaceTemplateDefinitions}
          busyKey={busyKey}
          canCreateWorkspace={isPrivilegedMember}
          onWorkspaceNameChange={setWorkspaceName}
          onWorkspaceDescriptionChange={setWorkspaceDescription}
          onWorkspaceTemplateChange={setWorkspaceTemplateId}
          onCreateWorkspace={() => { void handleCreateWorkspace() }}
        />

        <CreateDialog
          isOpen={createDialogOpen}
          createDialogType={createDialogType}
          onClose={() => setCreateDialogOpen(false)}
          onDialogTypeChange={setCreateDialogType}
          projectName={projectName}
          projectParentId={projectParentId}
          projectDescription={projectDescription}
          projectColor={projectColor}
          projectStartDate={projectStartDate}
          projectDeadline={projectDeadline}
          projectSubmissionTime={projectSubmissionTime}
          projectType={projectType}
          projectPriority={projectPriority}
          projectClientId={projectClientId}
          clientOptions={clients}
          closeProjectAfterCreate={closeProjectAfterCreate}
          projectStorageMethod={projectStorageMethod}
          projectVisibility={projectVisibility}
          projectMemberUids={projectMemberUids}
          taskTitle={taskTitle}
          taskDescription={taskDescription}
          taskStatus={taskStatus}
          taskProjectId={taskDialogProjectId}
          taskAssigneeUid={taskAssigneeUid}
          taskPriority={taskPriority}
          taskStartDate={taskStartDate}
          taskDueDate={taskDueDate}
          taskStatusOptions={workspaceTaskStatuses}
          projectColorOptions={selectedWorkspaceProjectColorOptions}
          projectColorMeanings={selectedWorkspaceProjectColorMeanings}
          projectOptions={flatVisibleProjectOptionsWithIcons}
          approvedMembers={approvedMembers}
          taskAssignableMembers={taskDialogAssignableMembers}
          busyKey={busyKey}
          canCreateProject={!!selectedWorkspaceId}
          canCreateTask={!!selectedWorkspaceId}
          onProjectNameChange={setProjectName}
          onProjectParentIdChange={setProjectParentId}
          onProjectDescriptionChange={setProjectDescription}
          onProjectColorChange={setProjectColor}
          onProjectStartDateChange={setProjectStartDate}
          onProjectDeadlineChange={setProjectDeadline}
          onProjectSubmissionTimeChange={setProjectSubmissionTime}
          onProjectTypeChange={setProjectType}
          onProjectPriorityChange={setProjectPriority}
          onProjectClientIdChange={setProjectClientId}
          onCreateClientInline={(name) => handleCreateClientInline(name, undefined, selectedWorkspaceId)}
          onCloseProjectAfterCreateChange={setCloseProjectAfterCreate}
          onProjectStorageMethodChange={setProjectStorageMethod}
          onProjectVisibilityChange={setProjectVisibility}
          onProjectMemberToggle={(uid) => {
            const checked = projectMemberUids.includes(uid)
            setProjectMemberUids((current) => checked ? current.filter((item) => item !== uid) : [...current, uid])
          }}
          onTaskTitleChange={setTaskTitle}
          onTaskDescriptionChange={setTaskDescription}
          onTaskStatusChange={setTaskStatus}
          onTaskProjectIdChange={setSelectedProjectId}
          onTaskAssigneeChange={setTaskAssigneeUid}
          onTaskPriorityChange={setTaskPriority}
          onTaskStartDateChange={handleTaskStartDateChange}
          onTaskDueDateChange={setTaskDueDate}
          onCreateProject={() => { void handleCreateProject() }}
          onCreateProjectKeepOpen={() => { void handleCreateProject({ keepDialogOpen: true }) }}
          onCreateTask={() => { void handleCreateTask() }}
        />

        <TemplateCreateDialog
          isOpen={templateCreateDialogOpen}
          intent={templateCreateIntent}
          workspaceTemplateId={selectedWorkspaceTemplateId}
          draft={templateCreateDraft}
          clientOptions={clients}
          busyKey={busyKey}
          canCreate={!!selectedWorkspaceId}
          onCreateClientInline={(name) => handleCreateClientInline(name, undefined, selectedWorkspaceId)}
          onDraftChange={(patch) => setTemplateCreateDraft((current) => ({ ...current, ...patch }))}
          onClose={closeTemplateCreateDialog}
          onCreate={() => { void handleCreateTemplateEntity() }}
        />

        <DocumentCreateDialog
          isOpen={documentDialogOpen}
          busyKey={busyKey}
          canCreate={!!selectedWorkspaceId}
          title={documentTitleDraft}
          body={documentBodyDraft}
          projectId={documentProjectIdDraft}
          projectOptions={flatVisibleProjectOptionsWithIcons}
          onTitleChange={setDocumentTitleDraft}
          onBodyChange={setDocumentBodyDraft}
          onProjectIdChange={setDocumentProjectIdDraft}
          onClose={closeDocumentCreateDialog}
          onCreate={() => { void handleCreateDocument() }}
        />

        <TeamDialog
          isOpen={teamDialogOpen}
          onClose={() => setTeamDialogOpen(false)}
          members={members}
          isMasterAdmin={isMasterAdmin}
          currentUserUid={auth.currentUser?.uid || ''}
          pendingCount={pendingMembers.length}
          busyKey={busyKey}
          onModerate={(uid, status, role) => { void handleMemberModeration(uid, status, role) }}
        />

        <WorkspaceSettingsDialog
          workspace={selectedWorkspaceSettings}
          workspaceTemplateId={selectedWorkspaceSettingsTemplate.id}
          workspaceTemplateLabel={selectedWorkspaceSettingsTemplate.label}
          workspaceTemplateGraphic={selectedWorkspaceSettingsTemplate.graphic}
          workspaceTemplateDescription={selectedWorkspaceSettingsTemplate.description}
          workspaceTemplateWarning={selectedWorkspaceSettingsTemplate.warning}
          busyKey={busyKey}
          projectCount={selectedWorkspaceProjectCount}
          taskCount={selectedWorkspaceTaskCount}
          members={members}
          pendingMembers={pendingMembers}
          approvedMembers={approvedMembers}
          memberWorkspaceSummaryByUid={memberWorkspaceSummaryByUid}
          workspaceAccessMemberUids={workspaceAccessMemberUids}
          workspaceInviteEmails={workspaceInviteEmails}
          workspaceInviteEmailDraft={workspaceInviteEmailDraft}
          deleteTypedName={workspaceDeleteTypedName}
          deletePhrase={workspaceDeletePhrase}
          deleteAcknowledge={workspaceDeleteAcknowledge}
          settingsName={workspaceSettingsName}
          settingsDescription={workspaceSettingsDescription}
          treeMetaDisplayMode={workspaceTreeMetaDisplayMode}
          taskDueDisplayMode={workspaceTaskDueDisplayMode}
          activityWindowDays={workspaceActivityWindowDays}
          moodBoardEnabled={workspaceMoodBoardEnabled}
          showProjectColorDots={workspaceShowProjectColorDots}
          onMoodBoardEnabledChange={setWorkspaceMoodBoardEnabled}
          onShowProjectColorDotsChange={setWorkspaceShowProjectColorDots}
          projectColorMeanings={workspaceProjectColorMeaningDrafts}
          onClose={() => setWorkspaceSettingsId('')}
          onSettingsNameChange={setWorkspaceSettingsName}
          onSettingsDescriptionChange={setWorkspaceSettingsDescription}
          onTreeMetaDisplayModeChange={setWorkspaceTreeMetaDisplayMode}
          onTaskDueDisplayModeChange={setWorkspaceTaskDueDisplayMode}
          onActivityWindowDaysChange={setWorkspaceActivityWindowDays}
          onProjectColorMeaningChange={handleWorkspaceProjectColorMeaningChange}
          onRemoveProjectColorMeaning={handleRemoveWorkspaceProjectColorMeaning}
          onResetProjectColorMeanings={handleResetWorkspaceProjectColorMeanings}
          onWorkspaceAccessToggle={handleWorkspaceAccessToggle}
          onToggleUserWorkspace={(uid, wsId, checked) => { void handleToggleUserWorkspace(uid, wsId, checked) }}
          workspaces={workspaces}
          onWorkspaceInviteDraftChange={setWorkspaceInviteEmailDraft}
          onWorkspaceInviteAdd={handleWorkspaceInviteAdd}
          onWorkspaceInviteRemove={handleWorkspaceInviteRemove}
          onApproveRequest={handleApproveRequestForWorkspace}
          onRejectRequest={handleRejectRequestForWorkspace}
          workspaceMemberAccessLevels={workspaceMemberAccessLevels}
          onMemberAccessLevelChange={(uid, level) => { void handleMemberAccessLevelChange(uid, level) }}
          onDeleteTypedNameChange={setWorkspaceDeleteTypedName}
          onDeletePhraseChange={setWorkspaceDeletePhrase}
          onDeleteAcknowledgeChange={setWorkspaceDeleteAcknowledge}
          onSave={() => { void handleSaveWorkspaceSettings() }}
          onDelete={() => { void handleDeleteWorkspace() }}
        />

        <ProjectActionMenu
          projectId={actionMenuProjectId}
          contextName={
            actionMenuProjectId && actionMenuProjectId !== '__workspace__'
              ? (workspaceProjectById[actionMenuProjectId]?.name ?? undefined)
              : undefined
          }
          workspaceType={selectedWorkspaceScopeType}
          workspaceTemplateId={selectedWorkspaceTemplateId}
          selectedProjectId={selectedProjectId}
          position={actionMenuPosition}
          canManageProject={isPrivilegedMember}
          canCreateTopCategory={!!selectedWorkspaceId}
          templateCreateActions={workspaceTemplateCreateActions}
          onClose={closeActionMenu}
          onCreateTask={(projectId) => {
            if (projectId) {
              focusQuickAddInline(projectId)
              return
            }
            openCreateTaskDialog(projectId)
          }}
          onCreateSubProject={(projectId) => openCreateProjectDialog(projectId)}
          onCreateDocument={(projectId) => {
            if (projectId) {
              void createDocumentQuick(projectId)
              return
            }
            openDocumentCreateDialog(projectId || '')
          }}
          onCreateNote={(projectId) => { void createNoteQuick(projectId || '') }}
          onCreateTemplateEntity={(intent, projectId) => openWorkspaceTypeCreateDialog(intent, projectId || '')}
          onOpenSettings={(projectId) => setProjectAccessDialogId(projectId)}
          moodBoardEnabled={selectedWorkspace?.moodBoardEnabled !== false}
          onOpenMoodBoard={async (entityType, entityId) => {
            // Find or create board for this entity, then navigate to moodboard panel
            let board = workspaceMoodBoards.find((b) => b.entityType === entityType && b.entityId === entityId) ?? null
            if (!board && selectedWorkspaceId) {
              const label = entityType === 'workspace' ? (selectedWorkspace?.name || 'Workspace') : (workspaceProjectById[entityId]?.name || 'Project')
              const newId = await createWorkhubMoodBoard({
                workspaceId: selectedWorkspaceId,
                entityType,
                entityId,
                title: `${label} — Mood Board`,
                createdBy: currentUid,
              })
              setSelectedMoodBoardId(newId)
            } else {
              setSelectedMoodBoardId(board?.id ?? '')
            }
            setSelectedDocumentId('')
            setSelectedTaskId('')
            setActiveSection('moodboard')
          }}
        />

        <ProjectSettingsDialog
          project={selectedAccessProject}
          intent={selectedAccessProjectEffectiveIntent}
          entityIcon={selectedAccessProjectIntentMeta.icon}
          entityLabel={selectedAccessProjectIntentMeta.subjectLabel}
          canDelete={selectedAccessProject?.workspaceId === selectedWorkspaceId}
          parentOptions={settingsParentOptions}
          clientOptions={clients}
          approvedMembers={approvedMembers}
          projectColors={selectedWorkspaceProjectColorOptions}
          projectColorMeanings={selectedWorkspaceProjectColorMeanings}
          settingsName={settingsProjectName}
          settingsDescription={settingsProjectDescription}
          settingsColor={settingsProjectColor}
          statusSuggestion={proposalStatusSuggestion}
          settingsParentId={settingsProjectParentId}
          settingsDeadline={settingsProjectDeadline}
          settingsDeadlineLabel={selectedAccessProjectDeadlineLabel}
          settingsSubmissionTime={settingsProjectSubmissionTime}
          settingsType={settingsProjectType}
          typeOptions={settingsProjectTypeOptions}
          settingsPriority={settingsProjectPriority}
          settingsTenderNumber={settingsProjectTenderNumber}
          settingsProposalId={settingsProjectProposalId}
          settingsTechnicalProposalUrl={settingsTechnicalProposalUrl}
          settingsFinancialProposalUrl={settingsFinancialProposalUrl}
          showMonetaryValue={selectedAccessProjectShowMonetaryValue}
          monetaryValueLabel={selectedAccessProjectMonetaryValueLabel}
          settingsValueAmount={settingsProjectValueAmountDraft}
          settingsValueCurrency={settingsProjectValueCurrencyDraft}
          settingsMainPanelView={settingsProjectMainPanelView}
          settingsTaskItemDisplayMode={settingsProjectTaskItemDisplayMode}
          settingsTaskStatuses={settingsProjectTaskStatuses}
          workspaceTaskStatuses={workspaceTaskStatuses}
          settingsClientId={settingsProjectClientId}
          settingsStorageMethod={settingsStorageMethod}
          accessVisibility={accessVisibility}
          accessMemberUids={accessMemberUids}
          childCount={selectedAccessProject ? projects.filter((p) => p.parentProjectId === selectedAccessProject.id).length : 0}
          taskCount={selectedAccessProject ? tasks.filter((t) => t.projectId === selectedAccessProject.id).length : 0}
          busyKey={busyKey}
          onClose={() => setProjectAccessDialogId('')}
          onNameChange={setSettingsProjectName}
          onDescriptionChange={setSettingsProjectDescription}
          onColorChange={setSettingsProjectColor}
          onParentChange={setSettingsProjectParentId}
          onDeadlineChange={setSettingsProjectDeadline}
          onSubmissionTimeChange={setSettingsProjectSubmissionTime}
          onTypeChange={setSettingsProjectType}
          onPriorityChange={setSettingsProjectPriority}
          onTenderNumberChange={setSettingsProjectTenderNumber}
          onProposalIdChange={setSettingsProjectProposalId}
          onTechnicalProposalUrlChange={setSettingsTechnicalProposalUrl}
          onFinancialProposalUrlChange={setSettingsFinancialProposalUrl}
          onValueAmountChange={setSettingsProjectValueAmountDraft}
          onValueCurrencyChange={setSettingsProjectValueCurrencyDraft}
          onMainPanelViewChange={setSettingsProjectMainPanelView}
          onTaskItemDisplayModeChange={setSettingsProjectTaskItemDisplayMode}
          onTaskStatusesChange={setSettingsProjectTaskStatuses}
          onApplyViewSettingsToSubItems={() => { void handleApplyViewSettingsToSubItems() }}
          applyViewSettingsBusy={busyKey === `access-propagate:${selectedAccessProject?.id || ''}`}
          onClientChange={setSettingsProjectClientId}
          onCreateClientInline={handleCreateClientInline}
          onStorageMethodChange={setSettingsStorageMethod}
          onVisibilityChange={setAccessVisibility}
          onToggleMember={(uid) => {
            const checked = accessMemberUids.includes(uid)
            setAccessMemberUids((current) => checked ? current.filter((item) => item !== uid) : [...current, uid])
          }}
          onDelete={handleDeleteProject}
          onSave={handleSaveProjectAccess}
          onEnsureDriveFolder={handleEnsureDriveFolder}
        />

        {lightboxImageUrl && activeImageReview && (
          <div className="workhub-modal-backdrop workhub-image-review-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setLightboxImageUrl('') }}>
            <div className="workhub-modal workhub-image-review-modal" onMouseDown={(event) => event.stopPropagation()}>
              <div className="workhub-image-review-topbar">
                <div className="workhub-image-review-topbar-title">
                  <span className="workhub-image-review-topbar-label">Image review</span>
                  <span className="workhub-image-review-topbar-hint">Tap image to place markers · Double-click marker to edit</span>
                </div>
                <button className="workhub-ghost-btn workhub-image-review-close-btn" onClick={() => setLightboxImageUrl('')}>Close</button>
              </div>

              <div className="workhub-image-review-layout">
                <div className="workhub-image-review-stage-wrap">
                  <div className="workhub-image-review-toolbar">
                    <div className="workhub-image-tool-group">
                      <button type="button" className={lightboxTool === 'point' ? 'is-active' : ''} onClick={() => { setLightboxTool('point'); setLightboxLineStart(null) }}>Point</button>
                      <button type="button" className={lightboxTool === 'line' ? 'is-active' : ''} onClick={() => setLightboxTool('line')}>Line</button>
                      <button type="button" className={lightboxTool === 'checkbox' ? 'is-active' : ''} onClick={() => { setLightboxTool('checkbox'); setLightboxLineStart(null) }}>Checkbox</button>
                    </div>
                    <span className="workhub-image-review-tip">
                      {lightboxTool === 'line' && lightboxLineStart ? 'Tap second point to finish line' : 'Tap image to add annotation'}
                    </span>
                    <div className="workhub-image-review-fit-group">
                      <button type="button" className={lightboxImageFit === 'contain' ? 'is-active' : ''} onClick={() => setLightboxImageFit('contain')}>Fit</button>
                      <button type="button" className={lightboxImageFit === 'cover' ? 'is-active' : ''} onClick={() => setLightboxImageFit('cover')}>Fill</button>
                      <button type="button" className={lightboxImageFit === 'scale-down' ? 'is-active' : ''} onClick={() => setLightboxImageFit('scale-down')}>Smart</button>
                    </div>
                    <button type="button" onClick={() => { void handleLightboxFullscreenToggle() }}>Fullscreen</button>
                  </div>

                  <div ref={lightboxStageRef} className="workhub-image-review-stage" onClick={handleLightboxStageClick} style={lightboxImageAspect ? { '--img-aspect': lightboxImageAspect } as React.CSSProperties : undefined}>
                    <img src={lightboxImageUrl} alt="Attachment" className="workhub-image-review-image" style={{ objectFit: lightboxImageFit }} onLoad={(e) => { const img = e.currentTarget; setLightboxImageAspect(img.naturalWidth / img.naturalHeight) }} />

                    <svg className="workhub-image-review-lines" viewBox="0 0 100 100" preserveAspectRatio="none">
                      {activeLineMarkers.map((marker) => (
                        <line
                          key={marker.id}
                          x1={marker.x}
                          y1={marker.y}
                          x2={marker.x2}
                          y2={marker.y2}
                          stroke="#ff5f56"
                          strokeWidth="0.6"
                          onClick={(event) => {
                            event.stopPropagation()
                            openLightboxMarkerEditor(marker.id)
                          }}
                        />
                      ))}
                    </svg>

                    <div className="workhub-image-review-pin-layer">
                      {activePointMarkers.map((marker) => (
                        <button
                          key={marker.id}
                          type="button"
                          className={`workhub-image-marker point${marker.resolved ? ' is-resolved' : ''}`}
                          style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                          onClick={(event) => {
                            event.stopPropagation()
                            if (lightboxDragRef.current) return
                            openLightboxMarkerEditor(marker.id)
                          }}
                          onPointerDown={(event) => handleMarkerPointerDown(marker.id, event)}
                          title={marker.text || 'Point annotation'}
                        >
                          {activeMarkerIndexById.get(marker.id) || '?'}
                        </button>
                      ))}
                      {activeCheckboxMarkers.map((marker) => (
                        <button
                          key={marker.id}
                          type="button"
                          className={`workhub-image-marker ${marker.type}${marker.resolved ? ' is-resolved' : ''}`}
                          style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
                          onClick={(event) => {
                            event.stopPropagation()
                            if (lightboxDragRef.current) return
                            openLightboxMarkerEditor(marker.id)
                          }}
                          onPointerDown={(event) => handleMarkerPointerDown(marker.id, event)}
                          title={marker.text || 'Checkbox annotation'}
                        >
                          {activeMarkerIndexById.get(marker.id) || '?'}
                        </button>
                      ))}
                    </div>

                    {lightboxMarkerEditorId && activeEditingMarker && activeEditingMarkerAnchor && (
                      <div
                        className="workhub-image-marker-inline-editor"
                        style={{
                          left: `min(calc(${activeEditingMarkerAnchor.x}% + 14px), calc(100% - 296px))`,
                          top: `${activeEditingMarkerAnchor.y}%`,
                        }}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <textarea
                          value={lightboxMarkerDraft}
                          onChange={(event) => setLightboxMarkerDraft(event.target.value)}
                          placeholder="Annotation note…"
                          autoFocus
                        />
                        <label className="workhub-image-marker-resolve-row">
                          <input type="checkbox" checked={lightboxMarkerResolved} onChange={(e) => setLightboxMarkerResolved(e.target.checked)} />
                          <span>Mark as resolved</span>
                        </label>
                        <div className="workhub-image-marker-editor-actions">
                          <button type="button" className="workhub-image-inline-btn" onClick={closeLightboxMarkerEditor}>Cancel</button>
                          <button type="button" className="workhub-image-inline-btn is-primary" onClick={handleLightboxMarkerEditorSave}>Save</button>
                        </div>
                      </div>
                    )}

                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {statusDialogOpen && (
          <div className="workhub-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) closeStatusDialog() }}>
            <div className="workhub-modal workhub-status-editor-modal" onMouseDown={(event) => event.stopPropagation()}>
              <div className="workhub-modal-head">
                <h2>Task Statuses</h2>
                <button className="workhub-ghost-btn" onClick={closeStatusDialog}>Close</button>
              </div>
              <div className="workhub-modal-form">
                <div className="workhub-status-editor-layout">
                  <div className="workhub-status-editor-sidebar">
                    <div className="workhub-status-editor-list compact-list">
                      {statusDrafts.map((status) => {
                        const usageCount = taskCountByStatus[status.id] || 0
                        const isActive = selectedStatusDraft?.id === status.id
                        return (
                          <button
                            key={status.id}
                            type="button"
                            className={`workhub-status-list-item${isActive ? ' is-active' : ''}`}
                            onClick={() => setSelectedStatusDraftId(status.id)}
                          >
                            <span className="workhub-status-list-item-main">
                              <span className="workhub-status-list-swatch" style={{ background: status.color }} />
                              <span className="workhub-status-list-text">
                                <strong>{status.label}</strong>
                                <small>{usageCount} task{usageCount === 1 ? '' : 's'}</small>
                              </span>
                            </span>
                          </button>
                        )
                      })}
                    </div>
                    <button type="button" className="workhub-status-add-btn" onClick={handleAddTaskStatusDraft}>
                      + Add status
                    </button>
                  </div>
                  <div className="workhub-status-editor-detail">
                    {selectedStatusDraft ? (
                      <>
                        <div className="workhub-status-editor-detail-head">
                          <div className="workhub-inline-row">
                            <span className="workhub-status-list-swatch large" style={{ background: selectedStatusDraft.color }} />
                            <div>
                              <h3>{selectedStatusDraft.label}</h3>
                              <div className="workhub-meta-line">{taskCountByStatus[selectedStatusDraft.id] || 0} task{(taskCountByStatus[selectedStatusDraft.id] || 0) === 1 ? '' : 's'}</div>
                            </div>
                          </div>
                        </div>
                        <label>
                          <span>Name</span>
                          <input value={selectedStatusDraft.label} onChange={(event) => handleStatusDraftChange(selectedStatusDraft.id, { label: event.target.value })} placeholder="Status name" />
                        </label>
                        <label>
                          <span>Color</span>
                          <input value={selectedStatusDraft.color} onChange={(event) => handleStatusDraftChange(selectedStatusDraft.id, { color: event.target.value })} placeholder="#6d5efc" />
                          <div className="workhub-color-pills" style={{ marginTop: 6 }}>
                            {PROJECT_COLORS.map((color) => (
                              <button key={color} type="button" className={`workhub-color-pill${selectedStatusDraft.color === color ? ' active' : ''}`} style={{ background: color }} onClick={() => handleStatusDraftChange(selectedStatusDraft.id, { color })} />
                            ))}
                          </div>
                        </label>
                        <div className="workhub-status-editor-detail-actions">
                          <button
                            type="button"
                            className="workhub-danger-btn"
                            disabled={(taskCountByStatus[selectedStatusDraft.id] || 0) > 0 || statusDrafts.length <= 1}
                            onClick={() => handleDeleteTaskStatusDraft(selectedStatusDraft.id)}
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="workhub-empty-state">Select a status to edit.</div>
                    )}
                  </div>
                </div>
                <div className="workhub-project-settings-actions">
                  <button className="workhub-ghost-btn" onClick={closeStatusDialog}>Cancel</button>
                  <button type="button" className="workhub-primary-btn" disabled={busyKey === 'status'} onClick={() => { void handleSaveTaskStatuses() }}>
                    {busyKey === 'status' ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {attachmentDeletePrompt && (
          <div className="workhub-modal-backdrop workhub-delete-prompt-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) confirmAttachmentRemoval('cancel') }}>
            <div className="workhub-modal workhub-delete-prompt-modal" onMouseDown={(event) => event.stopPropagation()}>
              <div className="workhub-modal-head">
                <div>
                  <h2>Remove attachment</h2>
                  {attachmentDeletePrompt.isDriveFile ? (
                    <p>Choose how to remove this file.</p>
                  ) : (
                    <p>Are you sure you want to remove this attachment?</p>
                  )}
                </div>
                <button className="workhub-ghost-btn" onClick={() => confirmAttachmentRemoval('cancel')}>✕</button>
              </div>
              <div className="workhub-delete-prompt-filename">
                <span>📎</span>
                <span>{attachmentDeletePrompt.attachment.split('id=')[1]?.slice(0, 32) || attachmentDeletePrompt.attachment.split('/').pop()?.slice(0, 48) || 'Attachment'}</span>
              </div>
              <div className="workhub-delete-prompt-actions">
                <button type="button" className="workhub-primary-btn" onClick={() => confirmAttachmentRemoval('remove_only')}>
                  Remove from list only
                </button>
                {attachmentDeletePrompt.isDriveFile && (
                  <button type="button" className="workhub-danger-btn" onClick={() => confirmAttachmentRemoval('delete_permanently')}>
                    Remove &amp; delete from Drive
                  </button>
                )}
                <button type="button" className="workhub-ghost-btn" onClick={() => confirmAttachmentRemoval('cancel')}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {bulkDeleteConfirmOpen && selectedTaskCount > 0 && (
          <div className="workhub-modal-backdrop workhub-delete-prompt-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && busyKey !== 'bulk-task') setBulkDeleteConfirmOpen(false) }}>
            <div className="workhub-modal workhub-delete-prompt-modal" onMouseDown={(event) => event.stopPropagation()}>
              <div className="workhub-modal-head">
                <div>
                  <h2>Delete selected tasks</h2>
                  <p>Are you sure you want to delete {selectedTaskCount} selected task{selectedTaskCount === 1 ? '' : 's'}?</p>
                </div>
                <button className="workhub-ghost-btn" disabled={busyKey === 'bulk-task'} onClick={() => setBulkDeleteConfirmOpen(false)}>✕</button>
              </div>
              <div className="workhub-delete-prompt-actions">
                <button type="button" className="workhub-danger-btn" disabled={busyKey === 'bulk-task'} onClick={() => { void handleBulkDeleteSelected() }}>
                  {busyKey === 'bulk-task' ? 'Deleting...' : 'Delete selected'}
                </button>
                <button type="button" className="workhub-ghost-btn" disabled={busyKey === 'bulk-task'} onClick={() => setBulkDeleteConfirmOpen(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {taskDeleteConfirmOpen && selectedTask && (
          <div className="workhub-modal-backdrop workhub-delete-prompt-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && busyKey !== 'task-delete') setTaskDeleteConfirmOpen(false) }}>
            <div className="workhub-modal workhub-delete-prompt-modal" onMouseDown={(event) => event.stopPropagation()}>
              <div className="workhub-modal-head">
                <div>
                  <h2>Delete task</h2>
                  <p>Are you sure you want to delete this task?</p>
                </div>
                <button className="workhub-ghost-btn" disabled={busyKey === 'task-delete'} onClick={() => setTaskDeleteConfirmOpen(false)}>✕</button>
              </div>
              <div className="workhub-delete-prompt-filename">
                <span>✅</span>
                <span>{normalizeTaskTitle(selectedTask.title || '') || 'Untitled task'}</span>
              </div>
              <div className="workhub-delete-prompt-actions">
                <button type="button" className="workhub-danger-btn" disabled={busyKey === 'task-delete'} onClick={() => { void handleDeleteSingleTask(selectedTask) }}>
                  {busyKey === 'task-delete' ? 'Deleting...' : 'Delete task'}
                </button>
                <button type="button" className="workhub-ghost-btn" disabled={busyKey === 'task-delete'} onClick={() => setTaskDeleteConfirmOpen(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {clientDeleteTarget && (
          <div className="workhub-modal-backdrop workhub-delete-prompt-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && busyKey !== `client:delete:${clientDeleteTarget.id}`) handleCancelClientDelete() }}>
            <div className="workhub-modal workhub-delete-prompt-modal" onMouseDown={(event) => event.stopPropagation()}>
              <div className="workhub-modal-head">
                <div>
                  <h2>Delete client</h2>
                  <p>Are you sure you want to delete this client?</p>
                </div>
                <button className="workhub-ghost-btn" disabled={busyKey === `client:delete:${clientDeleteTarget.id}`} onClick={handleCancelClientDelete}>✕</button>
              </div>
              <div className="workhub-delete-prompt-filename">
                <span>🗑</span>
                <span>{clientDeleteTarget.name}</span>
              </div>
              <div className="workhub-delete-prompt-actions">
                <button
                  type="button"
                  className="workhub-danger-btn"
                  disabled={busyKey === `client:delete:${clientDeleteTarget.id}`}
                  onClick={() => { void handleConfirmClientDelete() }}
                >
                  {busyKey === `client:delete:${clientDeleteTarget.id}` ? 'Deleting…' : 'Delete client'}
                </button>
                <button type="button" className="workhub-ghost-btn" disabled={busyKey === `client:delete:${clientDeleteTarget.id}`} onClick={handleCancelClientDelete}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {batchCreateProgress && (
          <div className="workhub-batch-progress" role="status" aria-live="polite">
            <div className="workhub-batch-progress-head">
              <strong>{batchCreateProgress.source === 'dialog' ? 'Creating tasks' : 'Adding tasks'}</strong>
              <span>{batchCreateProgress.created}/{batchCreateProgress.total}</span>
            </div>
            <div className="workhub-batch-progress-bar" aria-hidden="true">
              <span style={{ width: `${Math.max(4, Math.round((batchCreateProgress.created / Math.max(1, batchCreateProgress.total)) * 100))}%` }} />
            </div>
          </div>
        )}

      </div>

        {detailMenuOpen && detailMenuCoords && selectedTask && (
          <>
            <div
              style={{ position: 'fixed', inset: 0, zIndex: 199 }}
              onMouseDown={() => { setDetailMenuOpen(''); setDetailMenuCoords(null) }}
            />
            <div
              className="workhub-detail-icon-menu workhub-detail-icon-menu-fixed"
              style={{ position: 'fixed', top: detailMenuCoords.top, right: detailMenuCoords.right, zIndex: 200 }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {detailMenuOpen === 'status' && selectedProjectEffectiveTaskStatuses.map((value) => (
                <button
                  key={value.id}
                  type="button"
                  className={selectedTask.status === value.id ? 'is-active' : ''}
                  onClick={() => { void handleTaskUpdate(selectedTask, { status: value.id as WorkhubTaskStatus }); setDetailMenuOpen(''); setDetailMenuCoords(null) }}
                >
                  <span>{getTaskStatusIcon(value.id)}</span>
                  <span>{value.label}</span>
                </button>
              ))}
              {detailMenuOpen === 'priority' && (Object.keys(PRIORITY_LABELS) as WorkhubTaskPriority[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={selectedTask.priority === value ? 'is-active' : ''}
                  onClick={() => { void handleTaskUpdate(selectedTask, { priority: value }); setDetailMenuOpen(''); setDetailMenuCoords(null) }}
                >
                  <span>{getPriorityIcon(value)}</span>
                  <span>{PRIORITY_LABELS[value]}</span>
                </button>
              ))}
              {detailMenuOpen === 'assignee' && selectedTaskAssignableMembers.map((item) => (
                <button
                  key={item.uid}
                  type="button"
                  className={selectedTask.assigneeUid === item.uid ? 'is-active' : ''}
                  onClick={() => { void handleTaskUpdate(selectedTask, { assigneeUid: item.uid }); setDetailMenuOpen(''); setDetailMenuCoords(null) }}
                >
                  {item.displayName || item.email}
                </button>
              ))}
              {detailMenuOpen === 'dueDate' && (
                <>
                  <input
                    type="date"
                    value={selectedTask.dueDate || ''}
                    onChange={(event) => void handleTaskUpdate(selectedTask, { dueDate: event.target.value })}
                  />
                  <button type="button" onClick={() => { void handleTaskUpdate(selectedTask, { dueDate: '' }); setDetailMenuOpen(''); setDetailMenuCoords(null) }}>Clear</button>
                </>
              )}
            </div>
          </>
        )}

      <WorkhubStyles phoneMaxWidth={WORKHUB_PHONE_MAX_WIDTH} />
    </div>
  )
}

