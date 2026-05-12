import 'img-comparison-slider'
import 'img-comparison-slider/dist/styles.css'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { Fragment, Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { Link, useLocation, useNavigate, useNavigationType } from 'react-router-dom'
import { auth, storage } from '../lib/firebase'
import { markSignOut } from '../lib/signOutState'
import { useToast } from '../lib/ToastContext'
import {
  addWorkhubComment,
  createWorkhubActivity,
  createWorkhubClient,
  createWorkhubCompanyService,
  createWorkhubNotifications,
  createWorkhubDocument,
  createWorkhubProject,
  createWorkhubTask,
  createWorkhubWorkspace,
  deleteWorkhubClient,
  deleteWorkhubComment,
  deleteWorkhubDocument,
  deleteWorkhubProject,
  deleteWorkhubTask,
  deleteWorkhubWorkspace,
  requestWorkhubAccess,
  setWorkhubMemberStatus,
  subscribeAllWorkhubMembers,
  subscribeOwnWorkhubMember,
  subscribeWorkhubActivity,
  subscribeWorkhubClients,
  subscribeWorkhubCommentsByEntity,
  subscribeWorkhubCompanyServices,
  subscribeWorkhubClientsMulti,
  subscribeWorkhubDocuments,
  getWorkhubDocumentById,
  listWorkhubProjectNotificationPreferences,
  markWorkhubNotificationRead,
  saveWorkhubDocumentNotifyPrefs,
  saveWorkhubProjectNotificationPreference,
  subscribeWorkhubNotifications,
  subscribeWorkhubProjectNotificationPreference,
  subscribeWorkhubProjects,
  subscribeWorkhubProjectsMulti,
  subscribeWorkhubTasks,
  subscribeWorkhubWorkspaces,
  ensureWorkhubDriveProjectFolder,
  uploadWorkhubAttachmentToDrive,
  updateWorkhubMemberProfile,
  updateWorkhubProject,
  updateWorkhubProjectUserPreference,
  updateWorkhubComment,
  updateWorkhubTask,
  updateWorkhubClient,
  updateWorkhubWorkspace,
  type WorkhubActivity,
  type WorkhubClient,
  type WorkhubDocument,
  type WorkhubFolderNotifyDelivery,
  type WorkhubMember,
  type WorkhubNotification,
  type WorkhubProject,
  type WorkhubProjectNotificationPreference,
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
  deleteWorkhubMoodBoard,
  subscribeWorkhubMoodBoardsForWorkspace,
  type WorkhubMoodBoard,
  updateWorkhubMoodBoard,
  updateWorkhubMoodBoardChecklist,
  updateWorkhubMoodBoardFlow,
  updateWorkhubMoodBoardImages,
  updateWorkhubMoodBoardProsCons,
  updateWorkhubMoodBoardTabs,
  updateWorkhubMoodBoardTitle,
  updateWorkhubDocument,
} from '../lib/workhubRepo'

import { ProjectActionMenu } from './workhub/components/ProjectActionMenu'
import { TeamDialog } from './workhub/components/TeamDialog'
import { WorkspaceSettingsDialog } from './workhub/components/WorkspaceSettingsDialog'
import { WorkspaceBrowserDialog } from './workhub/components/WorkspaceBrowserDialog'
import { WorkhubStyles } from './workhub/components/WorkhubStyles'
import { type TaskRowCallbacks, type TaskRowMeta } from './workhub/components/TaskRow'
import { type QuickAddTaskSubmitInput } from './workhub/components/QuickAddTaskRow'
import { ProjectSettingsDialog } from './workhub/components/ProjectSettingsDialog'
import { CreateDialog } from './workhub/components/CreateDialog'
import { CreateWorkspaceDialog } from './workhub/components/CreateWorkspaceDialog'
import { DocumentCreateDialog } from './workhub/components/DocumentCreateDialog'
import { AddItemDialog } from './workhub/components/AddItemDialog'
import { DocumentSettingsDialog } from './workhub/components/DocumentSettingsDialog'
import { MoodBoardSettingsDialog } from './workhub/components/MoodBoardSettingsDialog'
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
  PROJECT_COLORS,
  PROJECT_TYPE_OPTIONS,
  PROJECT_PRIORITY_OPTIONS,
  DEFAULT_SUBMISSION_TIME,
  resolveProjectColorMeanings,
  type WorkhubProjectColorMeaning,
} from './workhub/constants'
import { cloneDefaultTaskStatuses } from './workhub/statusTemplates'
import {
  DEFAULT_WORKHUB_WORKSPACE_TEMPLATE_ID,
  resolveWorkhubWorkspaceTemplateIcon,
  resolveWorkhubWorkspaceTemplateForWorkspace,
  type WorkhubWorkspaceTemplateId,
} from './workhub/workspaceTemplates'
import {
  formatProjectDeadlineDate,
  formatTime,
  getInitials,
  isImageAttachmentUrl,
  normalizeTaskTitle,
  resolveProjectDeadlineMs,
  splitTaskTitles,
} from './workhub/taskUtils'
import {
  buildProjectDescriptionFromIntentDrafts,
  buildProjectTree,
  canAccessWorkspace,
  canViewProjectWithAncestors,
  collectProjectBranchIds,
  collectProjectLineage,
  flattenProjectTree,
  inferLegacyProjectIntent,
  isStartAfterEnd,
  isValidHexColor,
  makeTaskStatusId,
  normalizeInviteEmails,
  normalizeMemberUids,
  resolveEffectiveProjectIntent,
  WORKHUB_INTENT_ALLOWED_PROJECT_TYPES,
  splitTemplateDescriptionForIntent,
} from './workhub/projectUtils'
import { useWorkhubProjectTree } from './workhub/hooks/useWorkhubProjectTree'
import { useWorkhubSelectedProjectContext } from './workhub/hooks/useWorkhubSelectedProjectContext'
import { useWorkhubTaskFilter } from './workhub/hooks/useWorkhubTaskFilter'
import { useWorkhubGlobalFinder } from './workhub/hooks/useWorkhubGlobalFinder'
import { useWorkhubNotificationDerived } from './workhub/hooks/useWorkhubNotificationDerived'
import { useWorkhubDashboardStats } from './workhub/hooks/useWorkhubDashboardStats'
import { useWorkhubPipelineReport, type WorkhubPipelineReportGroupKey } from './workhub/hooks/useWorkhubPipelineReport'
import type { WorkhubEntityFinderEntry } from './workhub/finderUtils'
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
import { useWorkhubAddItemDialog, type AddItemType } from './workhub/hooks/useWorkhubAddItemDialog'
import { useWorkhubWorkspaceTemplates } from './workhub/hooks/useWorkhubWorkspaceTemplates'
import { MilestoneCreateEditDialog } from './workhub/components/MilestoneCreateEditDialog'
import { useWorkhubMilestones } from './workhub/hooks/useWorkhubMilestones'
import { getTaskSelectionSnapshot, setTaskSelectionId, subscribeTaskSelection } from './workhub/taskSelectionStore'
import type { WorkhubUserAccessDraft, WorkhubUserAccessMode, WorkhubUserWorkspaceDraft } from './workhub/accessTypes'
import { shouldResetSelectedProjectAfterHydration } from './workhub/routeHydrationGuards'
import { dispatchChatDockOpen } from '../features/communication/utils/chatDockEvents'
import { resolveWorkhubNotificationPath } from '../features/communication/utils/workhubNotificationNavigation'

const MASTER_EMAIL = import.meta.env.VITE_MASTER_EMAIL as string | undefined
const WORKHUB_PHONE_MAX_WIDTH = 767
const WORKHUB_DESKTOP_MIN_WIDTH = WORKHUB_PHONE_MAX_WIDTH + 1
const WORKHUB_DISCUSSION_PAGE_SIZE = 6
const DEFAULT_STATUS_TASK_RENDER_LIMIT = 80
const DASHBOARD_DETAIL_RAIL_DEFAULT_WIDTH = 340
const DASHBOARD_DETAIL_RAIL_MIN_WIDTH = 300
const DASHBOARD_DETAIL_RAIL_MAX_WIDTH = 620
const DASHBOARD_MAIN_COLUMN_MIN = 720

const WorkhubNotesSectionLazy = lazy(async () => {
  const mod = await import('./workhub/components/WorkhubNotesSection')
  return { default: mod.WorkhubNotesSection }
})

const WorkhubMoodboardSectionLazy = lazy(async () => {
  const mod = await import('./workhub/components/WorkhubMoodboardSection')
  return { default: mod.WorkhubMoodboardSection }
})

const WorkhubTasksSectionLazy = lazy(async () => {
  const mod = await import('./workhub/components/WorkhubTasksSection')
  return { default: mod.WorkhubTasksSection }
})

const WorkhubProjectDetailRailLazy = lazy(async () => {
  const mod = await import('./workhub/components/WorkhubProjectDetailRail')
  return { default: mod.WorkhubProjectDetailRail }
})

const WorkhubUsersSectionLazy = lazy(async () => {
  const mod = await import('./workhub/components/WorkhubUsersSection')
  return { default: mod.WorkhubUsersSection }
})

const WorkhubClientsSectionLazy = lazy(async () => {
  const mod = await import('./workhub/components/WorkhubClientsSection')
  return { default: mod.WorkhubClientsSection }
})

const WorkhubHomeSectionLazy = lazy(async () => {
  const mod = await import('./workhub/components/WorkhubHomeSection')
  return { default: mod.WorkhubHomeSection }
})

const WorkhubDiscussionCardLazy = lazy(async () => {
  const mod = await import('./workhub/components/WorkhubDiscussionCard')
  return { default: mod.WorkhubDiscussionCard }
})

type WorkhubFolderNotificationEvent = 'task_created' | 'task_completed' | 'folder_completed'

type WorkhubFolderNotificationSettings = {
  enabled: boolean
  taskCreated: boolean
  taskCompleted: boolean
  folderCompleted: boolean
  delivery: WorkhubFolderNotifyDelivery
}

const DEFAULT_WORKHUB_FOLDER_NOTIFICATION_SETTINGS: WorkhubFolderNotificationSettings = {
  enabled: false,
  taskCreated: false,
  taskCompleted: true,
  folderCompleted: true,
  delivery: 'in_app',
}

const DEFAULT_PIPELINE_REPORT_GROUP_SELECTION: Record<WorkhubPipelineReportGroupKey, boolean> = {
  open_proposals: true,
  closed_proposals: true,
  submitted_proposals: true,
  dropped_proposals: true,
  running_projects: true,
}

function escapePipelineReportHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function normalizeFolderNotificationSettings(
  value: Partial<WorkhubProjectNotificationPreference> | null | undefined,
): WorkhubFolderNotificationSettings {
  return {
    enabled: !!value?.enabled,
    taskCreated: !!value?.taskCreated,
    taskCompleted: !!value?.taskCompleted,
    folderCompleted: !!value?.folderCompleted,
    delivery: value?.delivery === 'both' ? 'both' : 'in_app',
  }
}

function getWorkhubDocumentIcon(document: { type?: string; icon?: string | null; referenceSourceDocumentId?: string | null; hasOutgoingReferences?: boolean } | null | undefined) {
  if (document?.referenceSourceDocumentId) return '🔗'
  if (document?.hasOutgoingReferences) return '🌐'
  return (document?.icon || '').trim() || (document?.type === 'note' ? '🗒️' : '📝')
}
function getCurrentDateInputValue(): string {
  const now = new Date()
  const timezoneOffsetMs = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - timezoneOffsetMs).toISOString().slice(0, 10)
}

function normalizeColorInputValue(value: unknown, fallback = '#ffffff'): string {
  if (typeof value !== 'string' || !value.trim()) return fallback
  const trimmed = value.trim()
  const hexMatch = trimmed.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (hexMatch) {
    if (hexMatch[1].length === 6) return trimmed
    const [r, g, b] = hexMatch[1].split('')
    return `#${r}${r}${g}${g}${b}${b}`
  }

  const rgbMatch = trimmed.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([0-9]*\.?[0-9]+))?\s*\)$/i)
  if (!rgbMatch) return fallback
  const [red, green, blue] = rgbMatch.slice(1, 4).map((channel) => {
    const parsed = Number(channel)
    return Math.max(0, Math.min(255, Number.isFinite(parsed) ? parsed : 0))
  })
  return `#${[red, green, blue].map((channel) => channel.toString(16).padStart(2, '0')).join('')}`
}

function getColorAlpha(value: unknown, fallback: number): number {
  if (typeof value !== 'string') return fallback
  const rgbaMatch = value.trim().match(/^rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*([0-9]*\.?[0-9]+)\s*\)$/i)
  if (!rgbaMatch) return fallback
  const parsed = Number(rgbaMatch[1])
  return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : fallback
}

function hexToRgba(value: string, alpha: number): string {
  const normalized = normalizeColorInputValue(value, '#ffffff')
  const hex = normalized.slice(1)
  const red = Number.parseInt(hex.slice(0, 2), 16)
  const green = Number.parseInt(hex.slice(2, 4), 16)
  const blue = Number.parseInt(hex.slice(4, 6), 16)
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`
}

type WorkhubViewMode = 'tabs' | 'workspace_tree'

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

function clampDashboardDetailRailWidth(width: number): number {
  if (typeof window === 'undefined') {
    return Math.min(DASHBOARD_DETAIL_RAIL_MAX_WIDTH, Math.max(DASHBOARD_DETAIL_RAIL_MIN_WIDTH, width))
  }
  const viewportAwareMax = Math.max(DASHBOARD_DETAIL_RAIL_MIN_WIDTH, window.innerWidth - DASHBOARD_MAIN_COLUMN_MIN)
  const maxWidth = Math.min(DASHBOARD_DETAIL_RAIL_MAX_WIDTH, viewportAwareMax)
  return Math.min(maxWidth, Math.max(DASHBOARD_DETAIL_RAIL_MIN_WIDTH, width))
}

function normalizeProposalServiceName(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function normalizeProposalServiceKey(value: string): string {
  return normalizeProposalServiceName(value).toLowerCase()
}

function dedupeProposalServices(values: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  values.forEach((entry) => {
    const name = normalizeProposalServiceName(entry)
    const key = normalizeProposalServiceKey(name)
    if (!name || seen.has(key)) return
    seen.add(key)
    result.push(name)
  })
  return result
}

function isMasterAdminEmail(email: string): boolean {
  const normalizedMasterEmail = (MASTER_EMAIL || '').trim().toLowerCase()
  if (!normalizedMasterEmail) return false
  return (email || '').trim().toLowerCase() === normalizedMasterEmail
}

function isPrivilegedWorkhubRole(role: unknown): boolean {
  const normalizedRole = typeof role === 'string' ? role.trim().toLowerCase() : ''
  return normalizedRole === 'admin' || normalizedRole === 'manager' || normalizedRole === 'administrator'
}

const DEFAULT_PROPOSAL_SERVICE_OPTIONS = [
  '2D Animation',
  '3D Animation',
  'Motion Graphics',
  'Web Design',
  'Software Development',
  'Video Production',
  'Music Creation',
  'Interactive Game Development',
  'Branding',
  'UI/UX Design',
  'Digital Marketing',
  'Content Production',
]

function resolveWorkspaceScopeType(
  workspace: Pick<WorkhubWorkspace, 'type' | 'templateId'> | null | undefined,
): WorkhubWorkspace['type'] {
  return resolveWorkhubWorkspaceTemplateForWorkspace(workspace).template.workspaceType
}

function getTemplateDateRangeValidationMessage(intent: WorkhubTemplateCreationIntent): string {
  switch (intent) {
    case 'marketing_campaign':
      return 'Campaign end date cannot be earlier than launch date.'
    case 'marketing_content_stream':
      return 'Target date cannot be earlier than content stream start date.'
    case 'hr_onboarding_track':
      return 'Completion target cannot be earlier than onboarding start date.'
    case 'hr_leave_case':
      return 'Return-to-work target cannot be earlier than leave start date.'
    case 'hr_kpi_cycle':
      return 'Cycle close date cannot be earlier than cycle start date.'
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
    case 'hr_department_unit':
      return 'Department review date'
    case 'hr_sub_department_unit':
      return 'Sub-department review date'
    case 'hr_employee_profile':
      return 'Profile review date'
    case 'hr_leave_case':
      return 'Return-to-work target'
    case 'hr_kpi_cycle':
      return 'Cycle close date'
    case 'hr_initiative_program':
      return 'Program checkpoint'
    case 'hr_learning_certification':
      return 'Renewal / expiry date'
    case 'project':
    default:
      return projectType === 'tender' ? 'Submission date' : 'Final submission deadline'
  }
}

function resolveProjectMainPanelView(mainPanelView: WorkhubProject['mainPanelView']): 'tasks' | 'dashboard' {
  return (mainPanelView === 'dashboard' || mainPanelView === 'dashboard_with_details') ? 'dashboard' : 'tasks'
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
    'Organization unit': 'Organization units',
    Department: 'Departments',
    'Sub-department': 'Sub-departments',
    Campaign: 'Campaigns',
    Requisition: 'Requisitions',
    'Employee profile': 'Employee profiles',
    'Leave case': 'Leave cases',
    'KPI cycle': 'KPI cycles',
    'Initiative program': 'Initiative programs',
    'Learning record': 'Learning records',
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
      return 'Organization structure'
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

function canCreateTasksForIntent(intent: WorkhubProjectIntent): boolean {
  return intent !== 'hr_employee_profile'
}

function parseDetailNumber(value: string): number | null {
  const raw = (value || '').trim()
  if (!raw) return null
  const normalized = raw.replace(/,/g, '')
  const match = normalized.match(/-?\d+(?:\.\d+)?/)
  if (!match) return null
  const parsed = Number(match[0])
  return Number.isFinite(parsed) ? parsed : null
}

function parseHrLineValue(description: string, label: string): string {
  const normalizedLabel = label.trim().toLowerCase()
  if (!normalizedLabel) return ''
  const lines = (description || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  const matched = lines.find((line) => line.toLowerCase().startsWith(`${normalizedLabel}:`))
  if (!matched) return ''
  return matched.slice(matched.indexOf(':') + 1).trim()
}

function pickFirstDirectoryPerson(value: string): string {
  const normalized = (value || '').trim()
  if (!normalized) return ''
  const [first] = normalized.split(/[;,|]/).map((part) => part.trim()).filter(Boolean)
  return first || ''
}

function resolveSupervisorCandidateFromProject(project: Pick<WorkhubProject, 'description'>, intent: WorkhubProjectIntent): string {
  const splitDescription = splitTemplateDescriptionForIntent(intent, project.description || '')
  const details = splitDescription.detailsByKey
  const candidate = (
    details['head of department']
    || details['sub-department lead']
    || details['manager employee id']
    || details.owner
    || details['approval owner']
    || details['onboarding owner']
    || details['cycle owner']
    || details['program owner']
  )?.trim()
  if (candidate) return candidate

  const stakeholderCandidate = pickFirstDirectoryPerson(parseHrLineValue(project.description || '', 'Stakeholders'))
  if (stakeholderCandidate) return stakeholderCandidate
  return pickFirstDirectoryPerson(parseHrLineValue(project.description || '', 'Stakeholder'))
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

function buildInitialTemplateCreationDraft(intent: WorkhubTemplateCreationIntent): WorkhubTemplateCreationDraft {
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

  // Legacy alias compatibility:
  // /workhub/u/:workspaceId and /workhub/users/:workspaceId -> users panel
  // /workhub/u and /workhub/users keep section intent until workspace resolves.
  if (parts[0] === 'u' || parts[0] === 'users') {
    const wsId = decodeURIComponent(parts[1] || '')
    return {
      source: 'legacy',
      kind: 'workspace',
      wsId,
      projId: normalizedContextProjectId,
      section: 'users',
      entityId: '',
    }
  }

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
  if (normalizedSection === 'users') {
    return `/workhub/u/${encodedWorkspaceId}${search}`
  }

  if (normalizedSection === 'dashboard') {
    return `/workhub/w/${encodedWorkspaceId}${search}`
  }

  return `/workhub/w/${encodedWorkspaceId}/s/${normalizedSection}${search}`
}

function resolveMoodboardPanelMode(panelVariant?: string | null): 'classic' | 'v2' | 'flow' | 'proscons' {
  if (panelVariant === 'flow') return 'flow'
  if (panelVariant === 'proscons') return 'proscons'
  if (panelVariant === 'v2') return 'v2'
  return 'classic'
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

function getWorkhubEntitySortOrderValue(sortOrder: unknown, createdAt: unknown, updatedAt: unknown): number {
  if (typeof sortOrder === 'number' && Number.isFinite(sortOrder)) return sortOrder
  return getUnknownTimeValue(createdAt || updatedAt)
}

function buildQuickDocumentTabs(initialBody = '') {
  const tabId = `tab_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  return [{ id: tabId, title: 'Main', body: initialBody }]
}

function haveSameMembers(left: string[] | undefined, right: string[] | undefined): boolean {
  const leftMembers = normalizeMemberUids(left || [])
  const rightMembers = normalizeMemberUids(right || [])
  if (leftMembers.length !== rightMembers.length) return false
  const rightSet = new Set(rightMembers)
  return leftMembers.every((uid) => rightSet.has(uid))
}

export default function WorkHubPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const navigationType = useNavigationType()
  const { showToast } = useToast()
  // navigateRef ensures the auth listener effect never re-runs due to React Router
  // re-creating the navigate function on every URL change (useNavigateUnstable behaviour).
  const navigateRef = useRef(navigate)
  navigateRef.current = navigate

  // Parse the initial location exactly once so state starts hydrated on first render.
  // This prevents a brief flicker of the dashboard view if the user lands directly on a deep link.
  const [initialRoute] = useState(() => parseWorkhubPathname(location.pathname, location.search))

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
  const [notificationFetchLimit, setNotificationFetchLimit] = useState(25)
  const [dataReloadNonce, setDataReloadNonce] = useState(0)
  const [isDataReloading, setIsDataReloading] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [dashboardSummaryCollapsed, setDashboardSummaryCollapsed] = useState(false)
  const [pipelineReportGroupSelection, setPipelineReportGroupSelection] = useState<Record<WorkhubPipelineReportGroupKey, boolean>>(
    DEFAULT_PIPELINE_REPORT_GROUP_SELECTION,
  )
  const [comments, setComments] = useState<WorkhubTaskComment[]>([])
  const [commentsFetchLimit, setCommentsFetchLimit] = useState(WORKHUB_DISCUSSION_PAGE_SIZE)
  const [commentsHasMoreOlder, setCommentsHasMoreOlder] = useState(false)
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState(() => initialRoute.wsId || '')
  const [selectedProjectId, setSelectedProjectId] = useState(() => initialRoute.projId || 'all')
  const [selectedAssigneeUid, setSelectedAssigneeUid] = useState('all')
  const selectedTaskIdSnapshot = useSyncExternalStore(subscribeTaskSelection, getTaskSelectionSnapshot)
  const setSelectedTaskId = useCallback((nextValue: string | ((prevState: string) => string)) => {
    const previousValue = getTaskSelectionSnapshot()
    const resolvedValue = typeof nextValue === 'function'
      ? nextValue(previousValue)
      : (nextValue || '')

    if (resolvedValue === previousValue) return

    setTaskSelectionId(resolvedValue)
  }, [])
  const [selectedNoteProjectId, setSelectedNoteProjectId] = useState('')
  const [selectedDocumentId, setSelectedDocumentId] = useState(() => initialRoute.kind === 'document' ? initialRoute.entityId : '')
  const [pendingNotificationDocument, setPendingNotificationDocument] = useState<WorkhubDocument | null>(null)
  const [activeSection, setActiveSection] = useState<'home' | 'users' | 'tasks' | 'notes' | 'dashboard' | 'clients' | 'moodboard'>(() => {
    if (initialRoute.kind === 'document') return 'notes'
    if (initialRoute.kind === 'moodboard') return 'moodboard'
    if (initialRoute.kind === 'task') return 'tasks'
    if (initialRoute.kind === 'root') return 'home'
    if (initialRoute.kind === 'workspace' && initialRoute.section && isWorkhubWorkspaceSection(initialRoute.section)) return initialRoute.section as any
    return 'dashboard'
  })
  const [workhubViewMode, setWorkhubViewMode] = useState<WorkhubViewMode>('tabs')
  const [workhubViewModeHydrated, setWorkhubViewModeHydrated] = useState(false)
  const [moodboardPanelMode, setMoodboardPanelMode] = useState<'classic' | 'v2' | 'flow' | 'proscons'>('classic')
  const [activeWorkspaceTab, setActiveWorkspaceTab] = useState<WorkhubCanonicalSection>(() => {
    if (isWorkhubWorkspaceSection(initialRoute.section)) return initialRoute.section as WorkhubCanonicalSection
    return 'dashboard'
  })
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
  const [documentSettingsDialogId, setDocumentSettingsDialogId] = useState('')
  const [documentSettingsWorkspaceIdDraft, setDocumentSettingsWorkspaceIdDraft] = useState('')
  const [documentSettingsProjectIdDraft, setDocumentSettingsProjectIdDraft] = useState('')
  const [documentSettingsIconDraft, setDocumentSettingsIconDraft] = useState('')
  const [documentSettingsVisibilityDraft, setDocumentSettingsVisibilityDraft] = useState<WorkhubVisibility>('workspace')
  const [documentSettingsMemberUidsDraft, setDocumentSettingsMemberUidsDraft] = useState<string[]>([])
  const [moodBoardSettingsDialogId, setMoodBoardSettingsDialogId] = useState('')
  const [moodBoardSettingsWorkspaceIdDraft, setMoodBoardSettingsWorkspaceIdDraft] = useState('')
  const [moodBoardSettingsProjectIdDraft, setMoodBoardSettingsProjectIdDraft] = useState('')
  const [moodBoardSettingsTitleDraft, setMoodBoardSettingsTitleDraft] = useState('')
  const [moodBoardSettingsVisibilityDraft, setMoodBoardSettingsVisibilityDraft] = useState<WorkhubVisibility>('workspace')
  const [moodBoardSettingsMemberUidsDraft, setMoodBoardSettingsMemberUidsDraft] = useState<string[]>([])
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
  const [workspaceDeleteTypedName, setWorkspaceDeleteTypedName] = useState('')
  const [workspaceDeletePhrase, setWorkspaceDeletePhrase] = useState('')
  const [workspaceDeleteAcknowledge, setWorkspaceDeleteAcknowledge] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [projectsFeedHydrated, setProjectsFeedHydrated] = useState(false)
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
  const [linkedHighlightedProjectId, setLinkedHighlightedProjectId] = useState('')
  const [linkedHighlightedDocumentId, setLinkedHighlightedDocumentId] = useState('')
  const [linkedHighlightedMoodBoardId, setLinkedHighlightedMoodBoardId] = useState('')
  const [linkedHighlightedTaskId, setLinkedHighlightedTaskId] = useState('')
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
  const [settingsProjectMainPanelView, setSettingsProjectMainPanelView] = useState<'tasks' | 'dashboard' | 'dashboard_with_details'>('tasks')
  const [settingsProjectTaskItemDisplayMode, setSettingsProjectTaskItemDisplayMode] = useState<'inherit' | 'list' | 'cards' | 'grid' | 'timeline'>('inherit')
  const [settingsProjectClientId, setSettingsProjectClientId] = useState('')
  const [settingsProjectFolderNotifications, setSettingsProjectFolderNotifications] = useState<WorkhubFolderNotificationSettings>(DEFAULT_WORKHUB_FOLDER_NOTIFICATION_SETTINGS)
  const [settingsProjectFolderNotificationsBusy, setSettingsProjectFolderNotificationsBusy] = useState(false)
  const [settingsStorageMethod, setSettingsStorageMethod] = useState<'firebase' | 'drive'>('firebase')
  const [selectedClientId, setSelectedClientId] = useState('')
  const [clientDeleteTargetId, setClientDeleteTargetId] = useState('')
  const [expandedUserPickerUid, setExpandedUserPickerUid] = useState<string | null>(null)
  const [userWorkspaceFilter, setUserWorkspaceFilter] = useState<'all' | string>('all')
  const [userAccessDraftByUid, setUserAccessDraftByUid] = useState<Record<string, WorkhubUserAccessDraft>>({})
  const [memberNameDraftByUid, setMemberNameDraftByUid] = useState<Record<string, string>>({})
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
  const [workspaceMoodBoardsLoaded, setWorkspaceMoodBoardsLoaded] = useState(false)
  const [selectedMoodBoardId, setSelectedMoodBoardId] = useState(() => initialRoute.kind === 'moodboard' ? initialRoute.entityId : '')
  const [moodBoardChecklistDraft, setMoodBoardChecklistDraft] = useState('')
  const [moodBoardEditingChecklistId, setMoodBoardEditingChecklistId] = useState<string | null>(null)
  const [moodBoardEditingChecklistText, setMoodBoardEditingChecklistText] = useState('')
  const [, setQuickAddOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [treePanelWidth, setTreePanelWidth] = useState<number>(() => {
    const saved = localStorage.getItem('workhub:treePanelWidth')
    const n = saved ? parseInt(saved, 10) : 0
    return n >= 200 && n <= 600 ? n : 280
  })
  const [dashboardDetailRailWidth, setDashboardDetailRailWidth] = useState<number>(() => {
    const saved = localStorage.getItem('workhub:dashboard-detail-rail-width')
    const n = saved ? parseInt(saved, 10) : NaN
    if (!Number.isFinite(n)) return DASHBOARD_DETAIL_RAIL_DEFAULT_WIDTH
    return clampDashboardDetailRailWidth(n)
  })
  const [isDashboardDetailRailResizing, setIsDashboardDetailRailResizing] = useState(false)
  const treeResizeDragRef = useRef<{ startX: number; startWidth: number } | null>(null)
  const dashboardDetailRailRef = useRef<HTMLElement | null>(null)
  const shellLayoutRef = useRef<HTMLDivElement>(null)
  const [isMobileWorkhubLayout, setIsMobileWorkhubLayout] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(`(max-width: ${WORKHUB_PHONE_MAX_WIDTH}px)`).matches
  })
  const [mobileTaskDetailOpen, setMobileTaskDetailOpen] = useState(false)
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
  const [selectedProjectNameDraft, setSelectedProjectNameDraft] = useState('')
  const [selectedProjectDescriptionDraft, setSelectedProjectDescriptionDraft] = useState('')
  const [selectedProjectNarrativeDraft, setSelectedProjectNarrativeDraft] = useState('')
  const [selectedProjectIntentDetailDrafts, setSelectedProjectIntentDetailDrafts] = useState<Record<string, string>>({})
  const [selectedProposalServicesDraft, setSelectedProposalServicesDraft] = useState<string[]>([])
  const [proposalServiceOptions, setProposalServiceOptions] = useState<string[]>([])
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
  const [taskContextMenuState, setTaskContextMenuState] = useState<{ taskId: string; x: number; y: number } | null>(null)
  const [taskMoveDialogState, setTaskMoveDialogState] = useState<{ taskId: string; workspaceId: string; projectId: string } | null>(null)
  const [projectMoveDialogState, setProjectMoveDialogState] = useState<{ projectId: string; workspaceId: string; parentProjectId: string } | null>(null)
  const [pendingTreeInlineRename, setPendingTreeInlineRename] = useState<{ itemType: 'project' | 'document' | 'moodboard'; itemId: string } | null>(null)
  const [treeItemMoveDialogState, setTreeItemMoveDialogState] = useState<{
    itemType: 'document' | 'moodboard'
    itemId: string
    workspaceId: string
    projectId: string
  } | null>(null)
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([])
  const [bulkStatusMenuOpen, setBulkStatusMenuOpen] = useState(false)
  const [bulkAssigneeMenuOpen, setBulkAssigneeMenuOpen] = useState(false)
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false)
  const [taskDeleteConfirmOpen, setTaskDeleteConfirmOpen] = useState(false)
  const [folderDeleteTarget, setFolderDeleteTarget] = useState<{ id: string; name: string } | null>(null)
  const [attachmentReviews, setAttachmentReviews] = useState<Record<string, WorkhubImageReview>>({})
  const [attachmentViewMode, setAttachmentViewMode] = useState<'thumbnail' | 'list' | 'card'>('thumbnail')
  const [taskAttachmentsCollapsed, setTaskAttachmentsCollapsed] = useState(true)
  const [projectAttachmentsCollapsed, setProjectAttachmentsCollapsed] = useState(true)
  const [attachmentDeletePrompt, setAttachmentDeletePrompt] = useState<{ task: WorkhubTask, attachment: string, isDriveFile: boolean } | null>(null)
  const mobileGearMenuAnchorRef = useRef<HTMLDivElement | null>(null)
  const mobileGearMenuRef = useRef<HTMLDivElement | null>(null)
  const statusBootstrapWorkspaceIdsRef = useRef<Set<string>>(new Set())
  const projectIntentMigrationIdsRef = useRef<Set<string>>(new Set())
  const moodBoardLegacyPurgeWorkspaceIdsRef = useRef<Set<string>>(new Set())
  // Stable ref that always carries the latest unstable values needed by taskRowCallbacks
  const _cbRef = useRef<{
    dragTaskId: string; dragStatusId: string; dropTargetKey: string
    editingTaskTitleText: string; editingChecklistItemText: string
    taskChecklistDrafts: Record<string, string>
    selectedTaskIdSet: Set<string>; selectedTaskCount: number
    handleTaskUpdate: (task: WorkhubTask, updates: Partial<WorkhubTask>, options?: { silent?: boolean }) => Promise<void>
    handleBulkStatusChange: (statusId: WorkhubTaskStatus) => Promise<void>
    handleBulkAssigneeChange: (uids: string[]) => Promise<void>
    handleTaskReorder: (draggedId: string, statusId: string, targetTaskId: string | null) => Promise<void>
    handleQuickAddTask: (input: QuickAddTaskSubmitInput) => Promise<boolean | void>
    clearTaskSelection: () => void
    handleBulkDeleteSelected: () => Promise<void>
    handleDeleteSingleTask: (task: WorkhubTask) => Promise<void>
    handleQuickTaskViewModeChange: (nextMode: 'list' | 'cards' | 'grid' | 'timeline') => Promise<void>
    handleAddTaskComment: (task: WorkhubTask, nextCommentBody: string, notificationRecipientUids: string[]) => Promise<void>
    handleAddComment: (nextCommentBody: string) => Promise<void>
    handleStartCommentEdit: (comment: WorkhubTaskComment) => void
    handleCancelCommentEdit: () => void
    handleSaveCommentEdit: (comment: WorkhubTaskComment) => Promise<void>
    handleDeleteComment: (comment: WorkhubTaskComment) => Promise<void>
  }>({
    dragTaskId: '', dragStatusId: '', dropTargetKey: '',
    editingTaskTitleText: '', editingChecklistItemText: '',
    taskChecklistDrafts: {}, selectedTaskIdSet: new Set(), selectedTaskCount: 0,
    handleTaskUpdate: async () => {}, handleBulkStatusChange: async () => {}, handleBulkAssigneeChange: async () => {}, handleTaskReorder: async () => {},
    handleQuickAddTask: async () => {}, clearTaskSelection: () => {}, handleBulkDeleteSelected: async () => {},
    handleDeleteSingleTask: async () => {}, handleQuickTaskViewModeChange: async () => {}, handleAddTaskComment: async () => {},
    handleAddComment: async () => {}, handleStartCommentEdit: () => {}, handleCancelCommentEdit: () => {},
    handleSaveCommentEdit: async () => {}, handleDeleteComment: async () => {},
  })

  useEffect(() => {
    const handleDocumentPointerDown = (event: MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) return
      if (target.closest('.workhub-task-row, .workhub-task-status-btn, .workhub-task-status-menu, .workhub-priority-indicator, .workhub-task-priority-menu, .workhub-task-more-btn, .workhub-task-more-menu, .workhub-detail-icon-btn, .workhub-detail-icon-menu, .workhub-detail-assignee-picker, .workhub-detail-assignee-trigger, .workhub-detail-assignee-menu, .workhub-task-filter-btn, .workhub-task-filter-menu, .workhub-bulk-status-btn, .workhub-bulk-status-menu, .workhub-bulk-assignee-btn, .workhub-bulk-assignee-menu, .workhub-task-assignee-btn, .workhub-task-card-meta-item.is-assignee, .workhub-task-grid-meta-btn.is-assignee, .workhub-task-assignee-menu, .workhub-task-context-menu, .workhub-notify-btn, .workhub-notify-menu, .workhub-account-btn, .workhub-account-menu, .workhub-project-color-select-btn, .workhub-project-color-select-menu, .workhub-mobile-workspace-panel, .workhub-mobile-workspace-toggle, .workhub-mobile-footer, .workhub-mobile-footer-btn')) {
        return
      }
      setOpenTaskStatusMenuId('')
      setOpenTaskPriorityMenuId('')
      setOpenTaskMoreMenuId('')
      setOpenTaskAssigneeMenuId('')
      setTaskContextMenuState(null)
      setTaskFilterMenuOpen(false)
      setBulkStatusMenuOpen(false)
      setBulkAssigneeMenuOpen(false)
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
    let unsubMember: (() => void) | null = null
    const unsub = onAuthStateChanged(auth, (user) => {
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
        setMember(next)
        setMemberLoading(false)
      })
    })
    return () => {
      if (unsubMember) unsubMember()
      unsub()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!member || member.status !== 'approved') return
    const unsubMembers = subscribeAllWorkhubMembers(setMembers)
    const unsubWorkspaces = subscribeWorkhubWorkspaces(setWorkspaces)
    return () => {
      unsubMembers()
      unsubWorkspaces()
    }
  }, [dataReloadNonce, member])

  useEffect(() => {
    if (!member || member.status !== 'approved') {
      setProjects([])
      setProjectsFeedHydrated(false)
      return
    }

    if (workhubViewMode !== 'tabs') return

    const localUid = auth.currentUser?.uid || ''
    const localPrivileged = !!(isMasterAdminEmail(userEmail) || isPrivilegedWorkhubRole(member.role))

    if (!selectedWorkspaceId) {
      setProjects([])
      setProjectsFeedHydrated(false)
      return
    }

    setProjectsFeedHydrated(false)
    return subscribeWorkhubProjects(selectedWorkspaceId, localUid, localPrivileged, (nextProjects) => {
      setProjectsFeedHydrated(true)
      setProjects(nextProjects)
    })
  }, [dataReloadNonce, member, selectedWorkspaceId, userEmail, workhubViewMode])

  useEffect(() => {
    if (!member || member.status !== 'approved') {
      setProjects([])
      setProjectsFeedHydrated(false)
      return
    }

    if (workhubViewMode !== 'workspace_tree') return

    const localUid = auth.currentUser?.uid || ''
    const localPrivileged = !!(isMasterAdminEmail(userEmail) || isPrivilegedWorkhubRole(member.role))
    const accessibleWorkspaceIds = workspaces
      .filter((item) => canAccessWorkspace(item, localUid, userEmail, localPrivileged))
      .map((item) => item.id)

    if (!accessibleWorkspaceIds.length) {
      setProjects([])
      setProjectsFeedHydrated(false)
      return
    }

    setProjectsFeedHydrated(false)
    return subscribeWorkhubProjectsMulti(accessibleWorkspaceIds, localUid, localPrivileged, (nextProjects) => {
      setProjectsFeedHydrated(true)
      setProjects(nextProjects)
    })
  }, [dataReloadNonce, member, userEmail, workhubViewMode, workspaces])

  useEffect(() => {
    if (!member || member.status !== 'approved') {
      setTasks([])
      setActivity([])
      return
    }

    const localUid = auth.currentUser?.uid || ''
    const localPrivileged = !!(isMasterAdminEmail(userEmail) || isPrivilegedWorkhubRole(member.role))

    if (!selectedWorkspaceId) {
      setTasks([])
      setActivity([])
      return
    }

    const unsubTasks = subscribeWorkhubTasks(selectedWorkspaceId, localUid, localPrivileged, setTasks)
    const unsubActivity = subscribeWorkhubActivity(selectedWorkspaceId, localUid, localPrivileged, setActivity)
    return () => {
      unsubTasks()
      unsubActivity()
    }
  }, [dataReloadNonce, member, selectedWorkspaceId, userEmail])

  useEffect(() => {
    if (!member || member.status !== 'approved') {
      setClients([])
      return
    }

    if (workhubViewMode === 'workspace_tree') {
      const localUid = auth.currentUser?.uid || ''
      const localPrivileged = !!(isMasterAdminEmail(userEmail) || isPrivilegedWorkhubRole(member.role))
      const accessibleWorkspaceIds = workspaces
        .filter((item) => canAccessWorkspace(item, localUid, userEmail, localPrivileged))
        .map((item) => item.id)

      if (!accessibleWorkspaceIds.length) {
        setClients([])
        return
      }

      return subscribeWorkhubClientsMulti(accessibleWorkspaceIds, setClients)
    }

    if (!selectedWorkspaceId) {
      setClients([])
      return
    }

    return subscribeWorkhubClients(selectedWorkspaceId, setClients)
  }, [dataReloadNonce, member, selectedWorkspaceId, userEmail, workhubViewMode, workspaces])

  useEffect(() => {
    const localUid = auth.currentUser?.uid || ''
    if (!selectedWorkspaceId || !localUid || !member || member.status !== 'approved') {
      setDocuments([])
      return
    }
    const localPrivileged = !!(isMasterAdminEmail(userEmail) || isPrivilegedWorkhubRole(member.role))
    return subscribeWorkhubDocuments(selectedWorkspaceId, localUid, localPrivileged, setDocuments)
  }, [dataReloadNonce, member, selectedWorkspaceId, userEmail])

  useEffect(() => {
    if (!member || member.status !== 'approved') {
      setComments([])
      setCommentsHasMoreOlder(false)
      setCommentsFetchLimit(WORKHUB_DISCUSSION_PAGE_SIZE)
      setEditingCommentId('')
      setEditingCommentText('')
      return
    }

    let entityType: 'task' | 'project' | 'document' | '' = ''
    let entityId = ''
    if (activeSection === 'notes' && selectedDocumentId) {
      entityType = 'document'
      // For reference documents, subscribe to comments on the source document
      const doc = documents.find((d) => d.id === selectedDocumentId)
      entityId = doc?.referenceSourceDocumentId || selectedDocumentId
    } else if ((activeSection === 'tasks' || activeSection === 'dashboard') && selectedProjectId && selectedProjectId !== 'all') {
      entityType = 'project'
      entityId = selectedProjectId
    }

    if (!entityType || !entityId) {
      setComments([])
      setCommentsHasMoreOlder(false)
      setCommentsFetchLimit(WORKHUB_DISCUSSION_PAGE_SIZE)
      setEditingCommentId('')
      setEditingCommentText('')
      return
    }

    const unsubComments = subscribeWorkhubCommentsByEntity(
      entityType,
      entityId,
      setComments,
      {
        maxCount: commentsFetchLimit,
        onHasMore: setCommentsHasMoreOlder,
      },
    )
    return () => unsubComments()
  }, [activeSection, commentsFetchLimit, documents, member, selectedDocumentId, selectedProjectId])

  const activeDiscussionEntityKey = useMemo(() => {
    if (activeSection === 'notes' && selectedDocumentId) {
      const selectedDoc = documents.find((item) => item.id === selectedDocumentId)
      const sourceId = selectedDoc?.referenceSourceDocumentId || selectedDocumentId
      return sourceId ? `document:${sourceId}` : ''
    }
    if ((activeSection === 'tasks' || activeSection === 'dashboard') && selectedProjectId && selectedProjectId !== 'all') {
      return `project:${selectedProjectId}`
    }
    return ''
  }, [activeSection, documents, selectedDocumentId, selectedProjectId])

  useEffect(() => {
    setCommentsFetchLimit(WORKHUB_DISCUSSION_PAGE_SIZE)
    setCommentsHasMoreOlder(false)
  }, [activeDiscussionEntityKey])

  useEffect(() => {
    const localUid = auth.currentUser?.uid || ''
    if (!localUid || !member || member.status !== 'approved') {
      setNotifications([])
      return
    }
    return subscribeWorkhubNotifications(localUid, setNotifications, { maxCount: notificationFetchLimit })
  }, [dataReloadNonce, member, notificationFetchLimit])

  const currentUid = auth.currentUser?.uid || ''

  useEffect(() => {
    if (!selectedWorkspaceId) {
      setWorkspaceMoodBoards([])
      setWorkspaceMoodBoardsLoaded(true)
      return
    }
    const workspaceAccessLevel = (workspaces.find((item) => item.id === selectedWorkspaceId)?.memberAccessLevels?.[currentUid] || 'custom')
    const localIsMasterAdmin = isMasterAdminEmail(userEmail)
    const localPrivileged = !!(localIsMasterAdmin || isPrivilegedWorkhubRole(member?.role))
    const canSeeAllMoodBoards = localPrivileged || workspaceAccessLevel === 'full'
    setWorkspaceMoodBoardsLoaded(false)
    return subscribeWorkhubMoodBoardsForWorkspace(selectedWorkspaceId, currentUid, canSeeAllMoodBoards, (data) => {
      setWorkspaceMoodBoards(data)
      setWorkspaceMoodBoardsLoaded(true)
    })
  }, [currentUid, dataReloadNonce, member?.role, selectedWorkspaceId, userEmail, workspaces])

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

  const workhubViewModeStorageKey = useMemo(
    () => currentUid ? `workhub:view-mode:${currentUid}` : '',
    [currentUid],
  )
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
  const expandedProjectInitWorkspaceRef = useRef('')

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
  const isMasterAdmin = isMasterAdminEmail(userEmail)
  const normalizedMasterEmail = (MASTER_EMAIL || '').trim().toLowerCase()
  const isPrivilegedMember = !!(isMasterAdmin || isPrivilegedWorkhubRole(member?.role))
  const isWorkhubAdmin = !!(isMasterAdmin || member?.role === 'admin')
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
    lightboxDraftLine,
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
  const [lightboxCompareMode, setLightboxCompareMode] = useState(false)
  const [lightboxCompareBeforeUrl, setLightboxCompareBeforeUrl] = useState('')
  const [lightboxCompareAfterUrl, setLightboxCompareAfterUrl] = useState('')
  const visibleWorkspaces = useMemo(
    () => workspaces.filter((item) => canAccessWorkspace(item, currentUid, userEmail, isPrivilegedMember)),
    [currentUid, isPrivilegedMember, userEmail, workspaces],
  )
  const [expandedWorkspaceTreeIds, setExpandedWorkspaceTreeIds] = useState<string[]>([])
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
  const projectBrandingByProjectId = useMemo(
    () => Object.fromEntries(projects.map((project) => {
      const client = project.clientId ? allClientById[project.clientId] : undefined
      return [project.id, {
        logoUrl: (client?.logoUrl || '').trim(),
        clientName: (client?.name || '').trim(),
        projectName: (project.name || '').trim(),
      }]
    })) as Record<string, { logoUrl?: string; clientName?: string; projectName?: string }>,
    [allClientById, projects],
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
  const workspaceProjectMap = useMemo(
    () => new Map(workspaceProjects.map((item) => [item.id, item])),
    [workspaceProjects],
  )
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
      if (!canViewProjectWithAncestors(item, currentUid, canSeeAllProjects, workspaceProjectMap)) return false
      const effectiveIntent = resolveEffectiveProjectIntent(item, workspaceByIdForFiltering, selectedWorkspaceTemplateIntentSet)
      return selectedWorkspaceTemplateIntentSet.has(effectiveIntent)
    }),
    [canSeeAllProjects, currentUid, selectedWorkspaceTemplateIntentSet, workspaceByIdForFiltering, workspaceProjectMap, workspaceProjects],
  )
  const visibleWorkspaceById = useMemo(
    () => Object.fromEntries(visibleWorkspaces.map((item) => [item.id, item])) as Record<string, WorkhubWorkspace>,
    [visibleWorkspaces],
  )
  const workspaceTreeProjectsByWorkspaceId = useMemo(() => {
    const grouped: Record<string, WorkhubProject[]> = {}
    visibleWorkspaces.forEach((workspace) => {
      const workspaceTemplateId = resolveWorkhubWorkspaceTemplateForWorkspace(workspace).templateId
      const allowedIntentSet = new Set(resolveWorkspaceTemplateIntents(workspaceTemplateId))
      const workspaceAccessLevel = workspace.memberAccessLevels?.[currentUid] || 'custom'
      const canSeeWorkspaceProjectsForTree = isPrivilegedMember || workspaceAccessLevel === 'full'
      const workspaceProjectItems = projects.filter((project) => project.workspaceId === workspace.id)
      const workspaceProjectMapForTree = new Map(workspaceProjectItems.map((project) => [project.id, project]))
      grouped[workspace.id] = projects.filter((project) => {
        if (project.workspaceId !== workspace.id) return false
        if (!canViewProjectWithAncestors(project, currentUid, canSeeWorkspaceProjectsForTree, workspaceProjectMapForTree)) return false
        const effectiveIntent = resolveEffectiveProjectIntent(project, workspaceByIdForFiltering, allowedIntentSet)
        return allowedIntentSet.has(effectiveIntent)
      })
    })
    return grouped
  }, [currentUid, isPrivilegedMember, projects, visibleWorkspaces, workspaceByIdForFiltering])
  const workspaceTreeNodesByWorkspaceId = useMemo(() => {
    const grouped: Record<string, ReturnType<typeof buildProjectTree>> = {}
    visibleWorkspaces.forEach((workspace) => {
      grouped[workspace.id] = buildProjectTree(workspaceTreeProjectsByWorkspaceId[workspace.id] || [])
    })
    return grouped
  }, [visibleWorkspaces, workspaceTreeProjectsByWorkspaceId])
  const workspaceTreeProjectById = useMemo(
    () => Object.fromEntries(
      Object.values(workspaceTreeProjectsByWorkspaceId)
        .flat()
        .map((project) => [project.id, project]),
    ) as Record<string, WorkhubProject>,
    [workspaceTreeProjectsByWorkspaceId],
  )
  const workspaceTreeVisibleProjectIdSet = useMemo(() => new Set(
    Object.values(workspaceTreeProjectsByWorkspaceId)
      .flat()
      .map((project) => project.id),
  ), [workspaceTreeProjectsByWorkspaceId])
  const workspaceTreeTaskCountByProjectId = useMemo(() => {
    const counts: Record<string, number> = {}
    tasks.forEach((task) => {
      if (!workspaceTreeVisibleProjectIdSet.has(task.projectId)) return
      if (
        selectedAssigneeUid !== 'all'
        && task.assigneeUid !== selectedAssigneeUid
        && !(Array.isArray(task.assigneeUids) && task.assigneeUids.includes(selectedAssigneeUid))
      ) return
      counts[task.projectId] = (counts[task.projectId] || 0) + 1
    })
    return counts
  }, [selectedAssigneeUid, tasks, workspaceTreeVisibleProjectIdSet])
  const workspaceTreeProgressByProjectId = useMemo(() => {
    const directDoneCounts: Record<string, number> = {}
    tasks.forEach((task) => {
      if (!workspaceTreeVisibleProjectIdSet.has(task.projectId)) return
      if (
        selectedAssigneeUid !== 'all'
        && task.assigneeUid !== selectedAssigneeUid
        && !(Array.isArray(task.assigneeUids) && task.assigneeUids.includes(selectedAssigneeUid))
      ) return
      if (!/done|complete/i.test(task.status)) return
      directDoneCounts[task.projectId] = (directDoneCounts[task.projectId] || 0) + 1
    })

    const progress: Record<string, { done: number; total: number }> = {}
    const resolveProgress = (projectId: string): { done: number; total: number } => {
      if (!projectId) return { done: 0, total: 0 }
      if (progress[projectId]) return progress[projectId]
      const project = projects.find((item) => item.id === projectId)
      const directDone = directDoneCounts[projectId] || 0
      const directTotal = workspaceTreeTaskCountByProjectId[projectId] || 0
      if (!project) {
        const result = { done: directDone, total: directTotal }
        progress[projectId] = result
        return result
      }
      const children = (workspaceTreeProjectsByWorkspaceId[project.workspaceId] || []).filter((item) => item.parentProjectId === projectId)
      const result = children.reduce((acc, child) => {
        const childProgress = resolveProgress(child.id)
        return {
          done: acc.done + childProgress.done,
          total: acc.total + childProgress.total,
        }
      }, { done: directDone, total: directTotal })
      progress[projectId] = result
      return result
    }

    Object.values(workspaceTreeProjectsByWorkspaceId)
      .flat()
      .forEach((project) => {
        resolveProgress(project.id)
      })

    return progress
  }, [projects, selectedAssigneeUid, tasks, workspaceTreeProjectsByWorkspaceId, workspaceTreeTaskCountByProjectId, workspaceTreeVisibleProjectIdSet])
  const {
    globalFinderOpen,
    setGlobalFinderOpen,
    globalFinderQuery,
    setGlobalFinderQuery,
    setGlobalFinderActiveIndex,
    globalFinderInputRef,
    globalFinderEntries,
    globalFinderResults,
    globalFinderResolvedActiveIndex,
    closeGlobalFinder,
  } = useWorkhubGlobalFinder({
    projects,
    visibleWorkspaceById,
    allClientById,
    currentUid,
    isPrivilegedMember,
    workspaceByIdForFiltering,
    onBeforeOpen: () => {
      setQuickAddOpen(false)
      setNotificationMenuOpen(false)
      setAccountMenuOpen(false)
    },
  })
  const documentSettingsWorkspaceOptions = useMemo(
    () => visibleWorkspaces.map((workspace) => ({
      id: workspace.id,
      name: `${resolveWorkhubWorkspaceTemplateIcon(resolveWorkhubWorkspaceTemplateForWorkspace(workspace).templateId)} ${workspace.name}`,
    })),
    [visibleWorkspaces],
  )
  const documentSettingsProjectOptions = useMemo(() => {
    const options: Array<{ id: string; workspaceId: string; name: string; depth: number }> = []

    visibleWorkspaces.forEach((workspace) => {
      const workspaceAccessLevel = workspace.memberAccessLevels?.[currentUid] || 'custom'
      const canSeeWorkspaceProjects = isPrivilegedMember || workspaceAccessLevel === 'full'
      const workspaceProjectsForSettings = projects.filter((item) => item.workspaceId === workspace.id)
      const workspaceProjectMapForSettings = new Map(workspaceProjectsForSettings.map((item) => [item.id, item]))
      const workspaceVisibleProjects = workspaceProjectsForSettings.filter((item) => (
        canViewProjectWithAncestors(item, currentUid, canSeeWorkspaceProjects, workspaceProjectMapForSettings)
      ))
      const flatOptions = flattenProjectTree(buildProjectTree(workspaceVisibleProjects))
      flatOptions.forEach((item) => {
        options.push({
          id: item.id,
          workspaceId: workspace.id,
          name: item.name,
          depth: item.depth,
        })
      })
    })

    return options
  }, [currentUid, isPrivilegedMember, projects, visibleWorkspaces])
  const documentSettingsProjectOptionById = useMemo(
    () => Object.fromEntries(documentSettingsProjectOptions.map((item) => [item.id, item])) as Record<string, { id: string; workspaceId: string; name: string; depth: number }>,
    [documentSettingsProjectOptions],
  )
  const resolveProjectMainPanelSection = useCallback((projectId: string): 'tasks' | 'dashboard' => {
    const project = projects.find((item) => item.id === projectId)
    if (project?.intent === 'hr_employee_profile') return 'dashboard'
    return resolveProjectMainPanelView(project?.mainPanelView)
  }, [projects])
  const openDocumentFromNotification = useCallback(async (notification: WorkhubNotification) => {
    const targetDocument = await getWorkhubDocumentById(notification.entityId)
    if (!targetDocument) {
      return false
    }

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
  const handleOptimisticDataReload = useCallback(() => {
    if (isDataReloading) return
    setIsDataReloading(true)
    setProjectsFeedHydrated(false)
    setWorkspaceMoodBoardsLoaded(false)
    setNotificationMenuOpen(false)
    setAccountMenuOpen(false)
    setDataReloadNonce((current) => current + 1)
    window.setTimeout(() => setIsDataReloading(false), 850)
  }, [isDataReloading])
  const handleNotificationMenuItemClick = useCallback(async (item: WorkhubNotification) => {
    if (!item.read) {
      await markWorkhubNotificationRead(item.id).catch(() => undefined)
    }
    setNotificationMenuOpen(false)
    setAccountMenuOpen(false)
    navigate(resolveWorkhubNotificationPath(item))
  }, [navigate, setAccountMenuOpen, setNotificationMenuOpen])
  const {
    selectedTemplate: selectedCreateWorkspaceTemplate,
    templates: workspaceTemplateDefinitions,
    initialTaskStatuses: workspaceTemplateTaskStatuses,
  } = useWorkhubWorkspaceTemplates(workspaceTemplateId)
  const {
    visibleProjectById,
    visibleProjectsByParent,
    visibleProjectTree,
    defaultCollapsedClosedRootIds,
    liveProjectTree,
    flatVisibleProjectOptions,
    visibleProjectIds,
    selectedProject,
  } = useWorkhubProjectTree({
    visibleWorkspaceProjects,
    expandedProjectIds,
    selectedProjectId,
    selectedProjectDeadlineDraft,
    selectedProjectSubmissionTimeDraft,
  })
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
  const {
    selectedProjectEffectiveIntent,
    projectIntentById,
    projectIntentMetaById,
    projectIntentIconById,
    projectSelectorIconById,
    selectedProjectIntentMeta,
    taskContextTrail,
    quickTaskViewTargetProject,
    taskItemDisplayMode,
    selectedProjectPeriodLabel,
    selectedProjectSubmissionTimeLabel,
    selectedProjectColorMeaning,
    selectedProjectDisplayName,
    flatVisibleProjectOptionsWithIcons,
    selectedProjectComposedDescriptionDraft,
    selectedProjectTypeOptions,
  } = useWorkhubSelectedProjectContext({
    selectedProject,
    currentUid,
    visibleProjectById,
    visibleProjectsByParent,
    visibleWorkspaceProjects,
    flatVisibleProjectOptions,
    workspaceByIdForFiltering,
    selectedWorkspaceTemplateIntentSet,
    selectedWorkspaceTemplateId,
    selectedProjectColorDraft,
    selectedProjectNarrativeDraft,
    selectedProjectIntentDetailDrafts,
    selectedProjectTypeDraft,
    selectedWorkspaceProjectColorMeanings,
  })
  const {
    workspaceTaskStatuses,
    effectiveStatusesByProjectId,
    selectedProjectEffectiveTaskStatuses,
    defaultTaskStatusId,
    workspaceTaskCountByProjectId,
    workspaceTaskProgressByProjectId,
    visibleTasks,
    taskCountByStatus,
    taskFilterBaseTasks,
    activeTaskFilterCount,
    filteredTasks,
    filteredTaskCountByStatus,
    financeStatusTotals,
    financeWorkspaceCurrency,
    taskFilterBaseTaskCountByStatus,
    completedStatusForHighlight,
    completedHighlightCount,
  } = useWorkhubTaskFilter({
    tasks,
    visibleProjectIds,
    visibleProjectsByParent,
    visibleWorkspaceProjects,
    selectedProjectId,
    selectedAssigneeUid,
    selectedWorkspace,
    selectedWorkspaceScopeType,
    taskFilterRequireAttachments,
    taskFilterRequireChecklist,
    taskFilterPriority,
    selectedTaskStatusTab,
  })
  const groupedProjectsWorkspace = selectedWorkspaceScopeType !== 'technical'
  const useMirroredWorkspaceRoots = groupedProjectsWorkspace && selectedWorkspaceTemplateId === 'proposals_leads'
  const mirroredProjectRoots = useMemo(
    () => {
      if (!groupedProjectsWorkspace) return []
      if (useMirroredWorkspaceRoots) return liveProjectTree.filter((item) => item.workspaceId !== selectedWorkspaceId)
      return liveProjectTree.filter((item) => item.workspaceId === selectedWorkspaceId)
    },
    [groupedProjectsWorkspace, liveProjectTree, selectedWorkspaceId, useMirroredWorkspaceRoots],
  )
  const localWorkspaceRoots = useMemo(
    () => {
      if (!groupedProjectsWorkspace) return liveProjectTree
      if (useMirroredWorkspaceRoots) return liveProjectTree.filter((item) => item.workspaceId === selectedWorkspaceId)
      return []
    },
    [groupedProjectsWorkspace, liveProjectTree, selectedWorkspaceId, useMirroredWorkspaceRoots],
  )
  const selectedStatusDraft = useMemo(
    () => statusDrafts.find((item) => item.id === selectedStatusDraftId) || statusDrafts[0] || null,
    [selectedStatusDraftId, statusDrafts],
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
      return selectedProjectEffectiveTaskStatuses.filter((status, index) => (
        index === 0 || (filteredTaskCountByStatus[status.id] || 0) > 0
      ))
    }
    return selectedProjectEffectiveTaskStatuses.filter((status) => status.id === selectedTaskStatusTab)
  }, [filteredTaskCountByStatus, selectedTaskStatusTab, selectedProjectEffectiveTaskStatuses])
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
        checklistDoneCount: checklist.reduce((n, item) => n + (item.completed ? 1 : 0), 0),
        checklistDetailsCount: checklist.reduce((n, item) => n + ((item.details || '').trim().length > 0 ? 1 : 0), 0),
        checklistImagesCount: checklist.reduce((sum, item) => sum + (item.attachments?.length || 0), 0),
        checklistLinksCount: checklist.reduce((sum, item) => sum + (item.links?.length || 0), 0),
        taskAttachmentCount: getTaskAttachments(task).length,
        financeValue,
      }
    }
    return result
  }, [tasks, selectedWorkspaceScopeType])
  useEffect(() => {
    setProjectAttachmentsCollapsed(true)
  }, [selectedProject?.id])
  const selectedTaskIdSet = useMemo(() => new Set(selectedTaskIds), [selectedTaskIds])
  const expandedTaskChecklistIdsSet = useMemo(() => new Set(expandedTaskChecklistIds), [expandedTaskChecklistIds])
  const selectedTasks = useMemo(() => tasks.filter((item) => selectedTaskIdSet.has(item.id)), [selectedTaskIdSet, tasks])
  const selectedTaskCount = selectedTasks.length
  const selectedTaskForContextMenu = useMemo(
    () => (taskContextMenuState ? tasks.find((item) => item.id === taskContextMenuState.taskId) || null : null),
    [taskContextMenuState, tasks],
  )
  const workspaceBrowserWorkspaces = useMemo(
    () => visibleWorkspaces.map((item) => ({ id: item.id, name: item.name })),
    [visibleWorkspaces],
  )
  const workspaceBrowserProjects = useMemo(
    () => projects.map((item) => ({ id: item.id, name: item.name, workspaceId: item.workspaceId, parentProjectId: item.parentProjectId || null })),
    [projects],
  )

  const resolveInheritedProjectAccess = useCallback((
    parentProjectId: string | null | undefined,
    fallbackUid: string,
    fallbackVisibility: WorkhubVisibility,
    fallbackMemberUids: string[],
  ): { visibility: WorkhubVisibility; memberUids: string[] } => {
    if (!parentProjectId) {
      return {
        visibility: fallbackVisibility,
        memberUids: fallbackVisibility === 'restricted' ? normalizeMemberUids(fallbackMemberUids) : [],
      }
    }
    const parentProject = projects.find((item) => item.id === parentProjectId) || null
    if (!parentProject || parentProject.visibility !== 'restricted') {
      return {
        visibility: fallbackVisibility,
        memberUids: fallbackVisibility === 'restricted' ? normalizeMemberUids(fallbackMemberUids) : [],
      }
    }
    return {
      visibility: 'restricted',
      memberUids: normalizeMemberUids(parentProject.memberUids?.length ? parentProject.memberUids : [parentProject.createdBy, fallbackUid]),
    }
  }, [projects])

  const applyRestrictedAccessToProjectBranch = useCallback(async (
    rootProjectId: string,
    memberUidsInput: string[],
    updateRootProject = false,
  ) => {
    const memberUids = normalizeMemberUids(memberUidsInput)
    if (!rootProjectId || memberUids.length === 0) return

    const byParent = new Map<string, WorkhubProject[]>()
    projects.forEach((item) => {
      const key = item.parentProjectId || ''
      const bucket = byParent.get(key) || []
      bucket.push(item)
      byParent.set(key, bucket)
    })
    const branchIds = collectProjectBranchIds(rootProjectId, byParent)
    if (!branchIds.has(rootProjectId)) branchIds.add(rootProjectId)

    const notifyUids = memberUids.filter((uid) => uid !== auth.currentUser?.uid)
    const projectUpdates = projects
      .filter((item) => branchIds.has(item.id) && (updateRootProject || item.id !== rootProjectId))
      .filter((item) => item.visibility !== 'restricted' || !haveSameMembers(item.memberUids, memberUids))
      .map((item) => updateWorkhubProject(item.id, {
        visibility: 'restricted',
        memberUids,
      }))

    const taskUpdates = tasks
      .filter((item) => branchIds.has(item.projectId))
      .filter((item) => item.visibility !== 'restricted' || !haveSameMembers(item.memberUids, memberUids))
      .map((item) => updateWorkhubTask(item.id, {
        visibility: 'restricted',
        memberUids,
      }))

    const documentUpdates = documents
      .filter((item) => !!item.projectId && branchIds.has(item.projectId))
      .filter((item) => (
        item.visibility !== 'restricted'
        || !haveSameMembers(item.memberUids, memberUids)
        || !haveSameMembers(item.editMemberUids || [], memberUids)
      ))
      .map((item) => updateWorkhubDocument(item.id, {
        visibility: 'restricted',
        memberUids,
        editMemberUids: memberUids,
        notifyMode: notifyUids.length > 0 ? 'selected' : 'all',
        notifyUids,
      }))

    await Promise.all([...projectUpdates, ...taskUpdates, ...documentUpdates])
  }, [documents, projects, tasks])

  const closeTaskContextMenu = useCallback(() => {
    setTaskContextMenuState(null)
  }, [])

  const openTaskMoveDialog = useCallback((taskId: string) => {
    const task = tasks.find((item) => item.id === taskId)
    if (!task) return
    setTaskContextMenuState(null)
    setTaskMoveDialogState({ taskId: task.id, workspaceId: task.workspaceId, projectId: task.projectId })
  }, [tasks])

  const openProjectMoveDialog = useCallback((projectId: string) => {
    const project = projects.find((item) => item.id === projectId)
    if (!project) return
    setProjectMoveDialogState({
      projectId: project.id,
      workspaceId: project.workspaceId,
      parentProjectId: project.parentProjectId || '',
    })
  }, [projects])

  const handleMoveProjectToFolder = useCallback(async (workspaceId: string, parentProjectId: string) => {
    const pendingMove = projectMoveDialogState
    if (!pendingMove) return
    if (!parentProjectId) {
      showToast({ type: 'warning', message: 'No destination folder selected. Choose a folder in the picker and try again.' })
      return
    }
    if (pendingMove.workspaceId !== workspaceId) {
      showToast({ type: 'warning', message: 'Folder move is currently limited to the current workspace.' })
      return
    }

    const source = projects.find((item) => item.id === pendingMove.projectId)
    if (!source) {
      setProjectMoveDialogState(null)
      return
    }
    if (source.id === parentProjectId) {
      showToast({ type: 'warning', message: 'Cannot move a folder into itself.' })
      return
    }
    if ((source.parentProjectId || null) === parentProjectId) {
      setProjectMoveDialogState(null)
      showToast({ type: 'warning', message: 'Folder is already in this destination.' })
      return
    }

    const projectById = new Map(projects.map((item) => [item.id, item]))
    const targetParent = projectById.get(parentProjectId)
    if (!targetParent) {
      showToast({ type: 'error', message: 'Destination folder was not found.' })
      return
    }
    let cursor: string | null = parentProjectId
    while (cursor) {
      if (cursor === source.id) {
        showToast({ type: 'warning', message: 'Cannot move a folder into itself.' })
        return
      }
      cursor = projectById.get(cursor)?.parentProjectId || null
    }

    const resolveEmployeeHierarchyDefaults = (targetParentId: string | null) => {
      const empty = { department: '', subDepartment: '', managerEmployeeId: '' }
      if (!targetParentId) return empty
      const projectById = new Map(projects.map((item) => [item.id, item]))
      let department = ''
      let subDepartment = ''
      let managerEmployeeId = ''
      let cursor: string | null = targetParentId
      while (cursor) {
        const node = projectById.get(cursor)
        if (!node) break
        const nodeIntent = resolveEffectiveProjectIntent(node, workspaceByIdForFiltering, selectedWorkspaceTemplateIntentSet)
        if (!managerEmployeeId) {
          managerEmployeeId = resolveSupervisorCandidateFromProject(node, nodeIntent)
        }
        if (!subDepartment && nodeIntent === 'hr_sub_department_unit') {
          subDepartment = node.name.trim()
          const subDepartmentDetails = splitTemplateDescriptionForIntent(nodeIntent, node.description || '').detailsByKey
          if (!department) department = (subDepartmentDetails['parent department'] || subDepartmentDetails.department || '').trim()
        }
        if (!department && nodeIntent === 'hr_department_unit') {
          department = node.name.trim()
        }
        cursor = node.parentProjectId || null
      }
      return {
        department,
        subDepartment,
        managerEmployeeId,
      }
    }

    const inheritedAccess = resolveInheritedProjectAccess(parentProjectId, source.createdBy, source.visibility, source.memberUids || [])
    const sourceIntent = resolveEffectiveProjectIntent(source, workspaceByIdForFiltering, selectedWorkspaceTemplateIntentSet)
    const isEmployeeProfileMove = sourceIntent === 'hr_employee_profile'
    const hierarchyDefaults = isEmployeeProfileMove ? resolveEmployeeHierarchyDefaults(parentProjectId) : null
    const employeeDescriptionPatch = (() => {
      if (!isEmployeeProfileMove || !hierarchyDefaults) return undefined
      const splitDescription = splitTemplateDescriptionForIntent('hr_employee_profile', source.description || '')
      const nextDetails = { ...splitDescription.detailsByKey }
      if (hierarchyDefaults.department) nextDetails.department = hierarchyDefaults.department
      else delete nextDetails.department
      if (hierarchyDefaults.subDepartment) nextDetails['sub-department'] = hierarchyDefaults.subDepartment
      else delete nextDetails['sub-department']
      if (hierarchyDefaults.managerEmployeeId) {
        nextDetails['manager employee id'] = hierarchyDefaults.managerEmployeeId
      }
      return buildProjectDescriptionFromIntentDrafts('hr_employee_profile', splitDescription.narrative, nextDetails)
    })()

    setBusyKey(`project-move:${source.id}`)
    try {
      await updateWorkhubProject(source.id, {
        parentProjectId,
        sortOrder: Date.now(),
        visibility: inheritedAccess.visibility,
        memberUids: inheritedAccess.memberUids,
        ...(employeeDescriptionPatch !== undefined ? { description: employeeDescriptionPatch } : {}),
      })
      if (inheritedAccess.visibility === 'restricted') {
        await applyRestrictedAccessToProjectBranch(source.id, inheritedAccess.memberUids)
      }
      setProjectMoveDialogState(null)
      showToast({ type: 'success', message: 'Folder moved.' })
    } catch {
      showToast({ type: 'error', message: 'Could not move folder.' })
    } finally {
      setBusyKey('')
    }
  }, [
    applyRestrictedAccessToProjectBranch,
    projectMoveDialogState,
    projects,
    resolveInheritedProjectAccess,
    selectedWorkspaceTemplateIntentSet,
    showToast,
    workspaceByIdForFiltering,
  ])

  const handleMoveTaskToProject = useCallback(async (workspaceId: string, projectId: string) => {
    const pendingMove = taskMoveDialogState
    if (!pendingMove) return
    const task = tasks.find((item) => item.id === pendingMove.taskId)
    if (!task) {
      setTaskMoveDialogState(null)
      return
    }
    if (workspaceId !== task.workspaceId) {
      showToast({ type: 'warning', message: 'Task move is currently limited to the current workspace.' })
      return
    }
    if (task.projectId === projectId) {
      setTaskMoveDialogState(null)
      showToast({ type: 'warning', message: 'Task is already in this folder.' })
      return
    }

    setBusyKey(`task-move:${task.id}`)
    try {
      await updateWorkhubTask(task.id, { projectId, sortOrder: Date.now() })
      setSelectedProjectId(projectId)
      setSelectedTaskId(task.id)
      setActiveSection('tasks')
      showToast({ type: 'success', message: 'Task moved successfully.' })
      setTaskMoveDialogState(null)
    } catch {
      showToast({ type: 'error', message: 'Could not move task.' })
    } finally {
      setBusyKey('')
    }
  }, [setSelectedTaskId, showToast, taskMoveDialogState, tasks])

  const handleMoveProjectInTree = useCallback(async (sourceProjectId: string, targetParentProjectId: string | null) => {
    const source = projects.find((item) => item.id === sourceProjectId)
    if (!source) return
    if (source.id === (targetParentProjectId || '')) return
    if ((source.parentProjectId || null) === (targetParentProjectId || null)) return

    const projectById = new Map(projects.map((item) => [item.id, item]))
    if (targetParentProjectId) {
      const target = projectById.get(targetParentProjectId)
      if (!target) return
      if (target.workspaceId !== source.workspaceId) {
        showToast({ type: 'warning', message: 'Projects can only be moved inside the same workspace.' })
        return
      }

      let cursor: string | null = targetParentProjectId
      while (cursor) {
        if (cursor === source.id) {
          showToast({ type: 'warning', message: 'Cannot move a folder into itself.' })
          return
        }
        cursor = projectById.get(cursor)?.parentProjectId || null
      }
    }

    const resolveEmployeeHierarchyDefaults = (targetParentId: string | null) => {
      const empty = { department: '', subDepartment: '', managerEmployeeId: '' }
      if (!targetParentId) return empty
      const projectById = new Map(projects.map((item) => [item.id, item]))
      let department = ''
      let subDepartment = ''
      let managerEmployeeId = ''
      let cursor: string | null = targetParentId
      while (cursor) {
        const node = projectById.get(cursor)
        if (!node) break
        const nodeIntent = resolveEffectiveProjectIntent(node, workspaceByIdForFiltering, selectedWorkspaceTemplateIntentSet)
        if (!managerEmployeeId) {
          managerEmployeeId = resolveSupervisorCandidateFromProject(node, nodeIntent)
        }
        if (!subDepartment && nodeIntent === 'hr_sub_department_unit') {
          subDepartment = node.name.trim()
          const subDepartmentDetails = splitTemplateDescriptionForIntent(nodeIntent, node.description || '').detailsByKey
          if (!department) department = (subDepartmentDetails['parent department'] || subDepartmentDetails.department || '').trim()
        }
        if (!department && nodeIntent === 'hr_department_unit') {
          department = node.name.trim()
        }
        cursor = node.parentProjectId || null
      }
      return {
        department,
        subDepartment,
        managerEmployeeId,
      }
    }

    const inheritedAccess = resolveInheritedProjectAccess(
      targetParentProjectId,
      source.createdBy,
      source.visibility,
      source.memberUids || [],
    )
    const sourceIntent = resolveEffectiveProjectIntent(source, workspaceByIdForFiltering, selectedWorkspaceTemplateIntentSet)
    const isEmployeeProfileMove = sourceIntent === 'hr_employee_profile'
    const hierarchyDefaults = isEmployeeProfileMove ? resolveEmployeeHierarchyDefaults(targetParentProjectId) : null
    const employeeDescriptionPatch = (() => {
      if (!isEmployeeProfileMove || !hierarchyDefaults) return undefined
      const splitDescription = splitTemplateDescriptionForIntent('hr_employee_profile', source.description || '')
      const nextDetails = { ...splitDescription.detailsByKey }
      if (hierarchyDefaults.department) nextDetails.department = hierarchyDefaults.department
      else delete nextDetails.department
      if (hierarchyDefaults.subDepartment) nextDetails['sub-department'] = hierarchyDefaults.subDepartment
      else delete nextDetails['sub-department']
      if (hierarchyDefaults.managerEmployeeId) {
        nextDetails['manager employee id'] = hierarchyDefaults.managerEmployeeId
      }
      return buildProjectDescriptionFromIntentDrafts('hr_employee_profile', splitDescription.narrative, nextDetails)
    })()

    setBusyKey(`project-move:${source.id}`)
    try {
      await updateWorkhubProject(source.id, {
        parentProjectId: targetParentProjectId || null,
        sortOrder: Date.now(),
        visibility: inheritedAccess.visibility,
        memberUids: inheritedAccess.memberUids,
        ...(employeeDescriptionPatch !== undefined ? { description: employeeDescriptionPatch } : {}),
      })
      if (inheritedAccess.visibility === 'restricted') {
        await applyRestrictedAccessToProjectBranch(source.id, inheritedAccess.memberUids)
      }
      showToast({ type: 'success', message: 'Folder moved.' })
    } catch {
      showToast({ type: 'error', message: 'Could not move folder.' })
    } finally {
      setBusyKey('')
    }
  }, [
    applyRestrictedAccessToProjectBranch,
    projects,
    resolveInheritedProjectAccess,
    selectedWorkspaceTemplateIntentSet,
    showToast,
    workspaceByIdForFiltering,
  ])

  const handleQuickCreateProjectFromContext = useCallback(async (kind: 'project' | 'folder', parentProjectId = '') => {
    const localUid = auth.currentUser?.uid || currentUid
    if (!selectedWorkspaceId || !localUid) return
    const resolvedParentProjectId = parentProjectId || (selectedProjectId !== 'all' ? selectedProjectId : '')
    if (kind === 'folder' && !resolvedParentProjectId) {
      showToast({ type: 'warning', message: 'No parent folder selected. Select a folder, then create a sub-folder.' })
      return
    }
    const defaultName = kind === 'folder' ? 'New folder' : 'New project'
    const projectColorPool = selectedWorkspaceProjectColorOptions.length > 0 ? selectedWorkspaceProjectColorOptions : PROJECT_COLORS
    const inheritedAccess = resolveInheritedProjectAccess(
      resolvedParentProjectId || null,
      localUid,
      'workspace',
      [],
    )

    if (resolvedParentProjectId) {
      const projectById = new Map(projects.map((item) => [item.id, item]))
      const lineage: string[] = []
      let cursor: string | null = resolvedParentProjectId
      while (cursor) {
        lineage.push(cursor)
        cursor = projectById.get(cursor)?.parentProjectId || null
      }
      setExpandedProjectIds((current) => Array.from(new Set([...current, ...lineage])))
    }

    setBusyKey(`project-create:${kind}`)
    try {
      const projectId = await createWorkhubProject({
        workspaceId: selectedWorkspaceId,
        parentProjectId: resolvedParentProjectId || null,
        intent: 'project',
        name: defaultName,
        description: '',
        color: projectColorPool[(Math.floor(Math.random() * projectColorPool.length))],
        visibility: inheritedAccess.visibility,
        memberUids: inheritedAccess.memberUids,
        storageMethod: 'firebase',
        createdBy: localUid,
      })

      await createWorkhubActivity({
        workspaceId: selectedWorkspaceId,
        actorUid: localUid,
        entityType: 'project',
        entityId: projectId,
        action: 'create',
        message: `Created ${kind} ${defaultName}`,
        visibility: inheritedAccess.visibility,
        memberUids: inheritedAccess.memberUids,
      })

      setSelectedProjectId(projectId)
      setSelectedNoteProjectId(projectId)
      setSelectedDocumentId('')
      setSelectedMoodBoardId('')
      setSelectedTaskId('')
      setActiveSection('tasks')
      setProjectsGroupExpanded(true)
      setSidebarCollapsed(false)
      setPendingTreeInlineRename({ itemType: 'project', itemId: projectId })
      showToast({ type: 'success', message: `${kind === 'folder' ? 'Folder' : 'Project'} created.` })
    } catch {
      showToast({ type: 'error', message: `Could not create ${kind}.` })
    } finally {
      setBusyKey('')
    }
  }, [currentUid, isWorkhubAdmin, projects, resolveInheritedProjectAccess, selectedProjectId, selectedWorkspaceId, selectedWorkspaceProjectColorOptions, showToast])

  const handleQuickCreateDocumentLikeFromContext = useCallback(async (type: 'document' | 'note', projectId = '') => {
    const localUid = auth.currentUser?.uid || currentUid
    if (!selectedWorkspaceId || !localUid) return

    const resolvedProjectId = projectId || (selectedProjectId !== 'all' ? selectedProjectId : '')
    if (!resolvedProjectId) {
      showToast({ type: 'warning', message: 'No folder selected. Right-click a folder in the tree and try again.' })
      return
    }

    const targetProject = projects.find((item) => item.id === resolvedProjectId) || null

    const projectById = new Map(projects.map((item) => [item.id, item]))
    const lineage: string[] = []
    let cursor: string | null = resolvedProjectId
    while (cursor) {
      lineage.push(cursor)
      cursor = projectById.get(cursor)?.parentProjectId || null
    }
    setExpandedProjectIds((current) => Array.from(new Set([...current, ...lineage])))

    const visibility = targetProject?.visibility || 'workspace'
    const memberUids = visibility === 'restricted'
      ? normalizeMemberUids(targetProject?.memberUids?.length ? targetProject.memberUids : [localUid])
      : []
    const notifyUids = normalizeMemberUids(memberUids).filter((uid) => uid !== localUid)
    const notifyMode = notifyUids.length > 0 ? 'selected' : 'all'
    const defaultTitle = type === 'note' ? 'New note' : 'New document'

    setBusyKey(`${type}:create:menu`)
    try {
      const documentId = await createWorkhubDocument({
        workspaceId: selectedWorkspaceId,
        projectId: resolvedProjectId,
        type,
        title: defaultTitle,
        body: '',
        ...(type === 'document' ? { tabs: buildQuickDocumentTabs('') } : {}),
        visibility,
        memberUids,
        notifyMode,
        notifyUids,
        createdBy: localUid,
      })

      await createWorkhubActivity({
        workspaceId: selectedWorkspaceId,
        actorUid: localUid,
        entityType: 'document',
        entityId: documentId,
        action: 'create',
        message: `Created ${type} ${defaultTitle}`,
        visibility,
        memberUids,
      })

      setSelectedProjectId(resolvedProjectId)
      setSelectedNoteProjectId(resolvedProjectId)
      setSelectedDocumentId(documentId)
      setSelectedMoodBoardId('')
      setSelectedTaskId('')
      setActiveSection('notes')
      setPendingTreeInlineRename({ itemType: 'document', itemId: documentId })
      showToast({ type: 'success', message: `${type === 'note' ? 'Note' : 'Document'} created.` })
    } catch {
      showToast({ type: 'error', message: `Could not create ${type}.` })
    } finally {
      setBusyKey('')
    }
  }, [currentUid, projects, selectedProjectId, selectedWorkspaceId, showToast])

  const handleDeleteProjectFromTree = useCallback(async (projectId: string) => {
    const project = projects.find((item) => item.id === projectId)
    if (!project) return

    const hasSubProjects = projects.some((item) => item.parentProjectId === projectId)
    const hasDocuments = documents.some((item) => item.projectId === projectId)
    const hasTasks = tasks.some((item) => item.projectId === projectId)
    const hasMoodBoards = workspaceMoodBoards.some((item) => item.entityType === 'project' && item.entityId === projectId)
    if (hasSubProjects || hasDocuments || hasTasks || hasMoodBoards) {
      showToast({ type: 'warning', message: 'Folder is not empty. Move or delete its nested items before deleting it.' })
      return
    }
    setFolderDeleteTarget({ id: projectId, name: (project.name || '').trim() || 'Untitled folder' })
  }, [documents, projects, selectedProjectId, showToast, tasks, workspaceMoodBoards])

  const handleCancelFolderDelete = useCallback(() => {
    setFolderDeleteTarget(null)
  }, [])

  const handleConfirmFolderDelete = useCallback(async () => {
    if (!folderDeleteTarget) return
    const projectId = folderDeleteTarget.id

    setBusyKey(`project-delete:${projectId}`)
    try {
      await deleteWorkhubProject(projectId)
      if (selectedProjectId === projectId) {
        setSelectedProjectId('all')
        setSelectedNoteProjectId('')
        setSelectedDocumentId('')
        setSelectedMoodBoardId('')
        setSelectedTaskId('')
        setActiveSection('dashboard')
      }
      setFolderDeleteTarget(null)
      showToast({ type: 'success', message: 'Folder deleted.' })
    } catch {
      showToast({ type: 'error', message: 'Could not delete folder.' })
    } finally {
      setBusyKey('')
    }
  }, [folderDeleteTarget, selectedProjectId, showToast])

  const handleMoveDocumentInTree = useCallback(async (documentId: string, targetProjectId: string) => {
    const document = documents.find((item) => item.id === documentId)
    if (!document || !targetProjectId) return
    if (document.projectId === targetProjectId) return

    setBusyKey(`document-move:${document.id}`)
    try {
      await updateWorkhubDocument(document.id, {
        projectId: targetProjectId,
        sortOrder: Date.now(),
      })
      showToast({ type: 'success', message: 'Document moved.' })
    } catch {
      showToast({ type: 'error', message: 'Could not move document.' })
    } finally {
      setBusyKey('')
    }
  }, [documents, showToast])

  const handleReorderDocumentInTree = useCallback(async (sourceDocumentId: string, targetDocumentId: string, projectId: string) => {
    if (!sourceDocumentId || !targetDocumentId || sourceDocumentId === targetDocumentId) return
    const source = documents.find((item) => item.id === sourceDocumentId)
    const target = documents.find((item) => item.id === targetDocumentId)
    if (!source || !target || !projectId) return

    const nextSortOrder = getWorkhubEntitySortOrderValue(target.sortOrder, target.createdAt, target.updatedAt) - 0.5
    setBusyKey(`document-reorder:${sourceDocumentId}`)
    try {
      await updateWorkhubDocument(sourceDocumentId, {
        projectId,
        sortOrder: nextSortOrder,
      })
      showToast({ type: 'success', message: 'Document reordered.' })
    } catch {
      showToast({ type: 'error', message: 'Could not reorder document.' })
    } finally {
      setBusyKey('')
    }
  }, [documents, showToast])

  const handleMoveMoodBoardInTree = useCallback(async (boardId: string, targetProjectId: string) => {
    const board = workspaceMoodBoards.find((item) => item.id === boardId)
    if (!board || !targetProjectId) return
    if (board.entityId === targetProjectId) return
    if (board.entityType !== 'project') {
      showToast({ type: 'warning', message: 'Only project mood boards can be moved in the tree.' })
      return
    }

    setBusyKey(`moodboard-move:${board.id}`)
    try {
      await updateWorkhubMoodBoard(board.id, {
        entityId: targetProjectId,
        sortOrder: Date.now(),
      })
      showToast({ type: 'success', message: 'Mood board moved.' })
    } catch {
      showToast({ type: 'error', message: 'Could not move mood board.' })
    } finally {
      setBusyKey('')
    }
  }, [showToast, workspaceMoodBoards])

  const handleReorderMoodBoardInTree = useCallback(async (sourceBoardId: string, targetBoardId: string, projectId: string) => {
    if (!sourceBoardId || !targetBoardId || sourceBoardId === targetBoardId) return
    const source = workspaceMoodBoards.find((item) => item.id === sourceBoardId)
    const target = workspaceMoodBoards.find((item) => item.id === targetBoardId)
    if (!source || !target || !projectId) return
    if (source.entityType !== 'project' || target.entityType !== 'project') return

    const nextSortOrder = getWorkhubEntitySortOrderValue(target.sortOrder, target.createdAt, target.updatedAt) - 0.5
    setBusyKey(`moodboard-reorder:${sourceBoardId}`)
    try {
      await updateWorkhubMoodBoard(sourceBoardId, {
        entityId: projectId,
        sortOrder: nextSortOrder,
      })
      showToast({ type: 'success', message: 'Mood board reordered.' })
    } catch {
      showToast({ type: 'error', message: 'Could not reorder mood board.' })
    } finally {
      setBusyKey('')
    }
  }, [showToast, workspaceMoodBoards])

  const openTreeItemMoveDialog = useCallback((itemType: 'document' | 'moodboard', itemId: string) => {
    if (itemType === 'document') {
      const document = documents.find((item) => item.id === itemId)
      if (!document) return
      const initialProjectId = document.projectId || (selectedProjectId !== 'all' ? selectedProjectId : '')
      if (!initialProjectId) {
        showToast({ type: 'warning', message: 'Select a destination folder first.' })
        return
      }
      setTreeItemMoveDialogState({
        itemType,
        itemId,
        workspaceId: document.workspaceId,
        projectId: initialProjectId,
      })
      return
    }

    const board = workspaceMoodBoards.find((item) => item.id === itemId)
    if (!board) return
    const initialProjectId = board.entityType === 'project'
      ? board.entityId
      : (selectedProjectId !== 'all' ? selectedProjectId : '')
    if (!initialProjectId) {
      showToast({ type: 'warning', message: 'Select a destination folder first.' })
      return
    }
    setTreeItemMoveDialogState({
      itemType,
      itemId,
      workspaceId: board.workspaceId,
      projectId: initialProjectId,
    })
  }, [documents, selectedProjectId, showToast, workspaceMoodBoards])

  const handleMoveTreeItemToProject = useCallback(async (workspaceId: string, projectId: string) => {
    const pendingMove = treeItemMoveDialogState
    if (!pendingMove) return
    if (!projectId) return
    if (pendingMove.workspaceId !== workspaceId) {
      showToast({ type: 'warning', message: 'Move is currently limited to the current workspace.' })
      return
    }

    if (pendingMove.itemType === 'document') {
      await handleMoveDocumentInTree(pendingMove.itemId, projectId)
    } else {
      await handleMoveMoodBoardInTree(pendingMove.itemId, projectId)
    }
    setTreeItemMoveDialogState(null)
  }, [handleMoveDocumentInTree, handleMoveMoodBoardInTree, showToast, treeItemMoveDialogState])

  const handleRenameProjectFromTree = useCallback(async (projectId: string, nextName?: string) => {
    const project = projects.find((item) => item.id === projectId)
    if (!project) return
    const currentName = (project.name || '').trim() || 'Untitled folder'
    const normalizedName = (nextName || '').trim()
    if (!normalizedName || normalizedName === currentName) return

    setBusyKey(`project-rename:${projectId}`)
    try {
      await updateWorkhubProject(projectId, { name: normalizedName })
      showToast({ type: 'success', message: 'Folder renamed.' })
    } catch {
      showToast({ type: 'error', message: 'Could not rename folder.' })
    } finally {
      setBusyKey('')
    }
  }, [projects, showToast])

  const handleRenameDocumentFromTree = useCallback(async (documentId: string, nextTitle?: string) => {
    const document = documents.find((item) => item.id === documentId)
    if (!document) return
    const currentTitle = (document.title || '').trim() || 'Untitled document'
    const normalizedTitle = (nextTitle || '').trim()
    if (!normalizedTitle || normalizedTitle === currentTitle) return

    setBusyKey(`document-rename:${documentId}`)
    try {
      await updateWorkhubDocument(documentId, { title: normalizedTitle })
      showToast({ type: 'success', message: 'Document renamed.' })
    } catch {
      showToast({ type: 'error', message: 'Could not rename document.' })
    } finally {
      setBusyKey('')
    }
  }, [documents, showToast])

  const handleDuplicateDocumentFromTree = useCallback(async (documentId: string) => {
    const document = documents.find((item) => item.id === documentId)
    const localUid = auth.currentUser?.uid || currentUid
    if (!document || !localUid) return

    const duplicatedTitle = `${(document.title || 'Untitled document').trim() || 'Untitled document'} (Copy)`
    setBusyKey(`document-duplicate:${documentId}`)
    try {
      const duplicatedId = await createWorkhubDocument({
        workspaceId: document.workspaceId,
        projectId: document.projectId || null,
        type: document.type || 'document',
        icon: document.icon || '',
        title: duplicatedTitle,
        body: document.body || '',
        tabs: Array.isArray(document.tabs)
          ? document.tabs.map((tab) => ({
            id: tab.id,
            title: tab.title,
            ...(tab.icon ? { icon: tab.icon } : {}),
            body: tab.body || '',
          }))
          : [],
        masterPage: document.masterPage,
        visibility: document.visibility || 'workspace',
        memberUids: Array.isArray(document.memberUids) ? document.memberUids : [],
        notifyMode: document.notifyMode || 'all',
        notifyUids: Array.isArray(document.notifyUids) ? document.notifyUids : [],
        createdBy: localUid,
      })

      setSelectedWorkspaceId(document.workspaceId)
      setSelectedProjectId(document.projectId || 'all')
      setSelectedNoteProjectId(document.projectId || '')
      setSelectedDocumentId(duplicatedId)
      setSelectedMoodBoardId('')
      setSelectedTaskId('')
      setActiveSection('notes')
      showToast({ type: 'success', message: 'Document duplicated.' })
    } catch {
      showToast({ type: 'error', message: 'Could not duplicate document.' })
    } finally {
      setBusyKey('')
    }
  }, [currentUid, documents, showToast])

  const handleDeleteDocumentFromTree = useCallback(async (documentId: string) => {
    const document = documents.find((item) => item.id === documentId)
    if (!document) return
    if (!window.confirm(`Delete "${(document.title || 'Untitled document').trim() || 'Untitled document'}"?`)) return

    setBusyKey(`document-delete:${documentId}`)
    try {
      await deleteWorkhubDocument(documentId)
      if (selectedDocumentId === documentId) {
        setSelectedDocumentId('')
        if (activeSection === 'notes') {
          setActiveSection('tasks')
        }
      }
      showToast({ type: 'success', message: 'Document deleted.' })
    } catch {
      showToast({ type: 'error', message: 'Could not delete document.' })
    } finally {
      setBusyKey('')
    }
  }, [activeSection, documents, selectedDocumentId, showToast])

  const handleRenameMoodBoardFromTree = useCallback(async (boardId: string, nextTitle?: string) => {
    const board = workspaceMoodBoards.find((item) => item.id === boardId)
    if (!board) return
    const currentTitle = (board.title || '').trim() || 'Mood board'
    const normalizedTitle = (nextTitle || '').trim()
    if (!normalizedTitle || normalizedTitle === currentTitle) return

    setBusyKey(`moodboard-rename:${boardId}`)
    try {
      await updateWorkhubMoodBoardTitle(boardId, normalizedTitle)
      showToast({ type: 'success', message: 'Mood board renamed.' })
    } catch {
      showToast({ type: 'error', message: 'Could not rename mood board.' })
    } finally {
      setBusyKey('')
    }
  }, [showToast, workspaceMoodBoards])

  const handleDuplicateMoodBoardFromTree = useCallback(async (boardId: string) => {
    const board = workspaceMoodBoards.find((item) => item.id === boardId)
    const localUid = auth.currentUser?.uid || currentUid
    if (!board || !localUid) return

    const duplicatedTitle = `${(board.title || 'Mood board').trim() || 'Mood board'} (Copy)`
    setBusyKey(`moodboard-duplicate:${boardId}`)
    try {
      const duplicatedVisibility = board.visibility || 'workspace'
      const duplicatedMemberUids = duplicatedVisibility === 'restricted'
        ? normalizeMemberUids(board.memberUids?.length ? board.memberUids : [board.createdBy || localUid])
        : []
      const duplicatedId = await createWorkhubMoodBoard({
        workspaceId: board.workspaceId,
        entityType: board.entityType,
        entityId: board.entityId,
        title: duplicatedTitle,
        panelVariant: resolveMoodboardPanelMode(board.panelVariant),
        visibility: duplicatedVisibility,
        memberUids: duplicatedMemberUids,
        createdBy: localUid,
      })

      await updateWorkhubMoodBoardFlow(
        duplicatedId,
        board.flowNodes || [],
        board.flowEdges || [],
        board.flowViewport,
        board.flowSettings,
      )
      await updateWorkhubMoodBoardImages(duplicatedId, board.images || [])
      if (Array.isArray(board.tabs) && board.tabs.length > 0) {
        await updateWorkhubMoodBoardTabs(duplicatedId, board.tabs, board.activeTabId || board.tabs[0].id)
      }
      if (Array.isArray(board.checklist)) {
        await updateWorkhubMoodBoardChecklist(duplicatedId, board.checklist)
      }
      if (board.prosCons) {
        await updateWorkhubMoodBoardProsCons(duplicatedId, board.prosCons)
      }

      setSelectedWorkspaceId(board.workspaceId)
      setSelectedProjectId(board.entityType === 'project' ? board.entityId : 'all')
      setSelectedNoteProjectId(board.entityType === 'project' ? board.entityId : '')
      setSelectedMoodBoardId(duplicatedId)
      setSelectedDocumentId('')
      setSelectedTaskId('')
      setActiveSection('moodboard')
      showToast({ type: 'success', message: 'Mood board duplicated.' })
    } catch {
      showToast({ type: 'error', message: 'Could not duplicate mood board.' })
    } finally {
      setBusyKey('')
    }
  }, [currentUid, showToast, workspaceMoodBoards])

  const handleDeleteMoodBoardFromTree = useCallback(async (boardId: string) => {
    const board = workspaceMoodBoards.find((item) => item.id === boardId)
    if (!board) return
    if (!window.confirm(`Delete "${(board.title || 'Mood board').trim() || 'Mood board'}"?`)) return

    setBusyKey(`moodboard-delete:${boardId}`)
    try {
      await deleteWorkhubMoodBoard(boardId)
      if (selectedMoodBoardId === boardId) {
        setSelectedMoodBoardId('')
        if (activeSection === 'moodboard') {
          setActiveSection('tasks')
        }
      }
      showToast({ type: 'success', message: 'Mood board deleted.' })
    } catch {
      showToast({ type: 'error', message: 'Could not delete mood board.' })
    } finally {
      setBusyKey('')
    }
  }, [activeSection, selectedMoodBoardId, showToast, workspaceMoodBoards])

  const copyTaskDeepLink = useCallback(async () => {
    if (!selectedTaskForContextMenu) return
    const path = buildWorkhubPathname(
      selectedTaskForContextMenu.workspaceId,
      selectedTaskForContextMenu.projectId || 'all',
      'tasks',
      selectedTaskForContextMenu.id,
    )
    const absoluteUrl = `${window.location.origin}${path}`
    try {
      await navigator.clipboard.writeText(absoluteUrl)
      showToast({ type: 'success', message: 'Task URL copied.' })
      setTaskContextMenuState(null)
    } catch {
      showToast({ type: 'error', message: 'Could not copy task URL.' })
    }
  }, [selectedTaskForContextMenu, showToast])

  const copyTaskUniqueToken = useCallback(async () => {
    if (!selectedTaskForContextMenu) return
    const token = `workhub-task:${selectedTaskForContextMenu.workspaceId}:${selectedTaskForContextMenu.id}`
    try {
      await navigator.clipboard.writeText(token)
      showToast({ type: 'success', message: 'Task token copied.' })
      setTaskContextMenuState(null)
    } catch {
      showToast({ type: 'error', message: 'Could not copy task token.' })
    }
  }, [selectedTaskForContextMenu, showToast])

  const copyProjectDeepLink = useCallback(async (projectId: string) => {
    if (!projectId || projectId === '__workspace__') return
    const project = projects.find((item) => item.id === projectId)
    if (!project) return
    const path = buildWorkhubPathname(project.workspaceId, project.id, 'dashboard')
    const absoluteUrl = `${window.location.origin}${path}`
    try {
      await navigator.clipboard.writeText(absoluteUrl)
      showToast({ type: 'success', message: 'Folder URL copied.' })
    } catch {
      showToast({ type: 'error', message: 'Could not copy folder URL.' })
    }
  }, [projects, showToast])

  const handleOpenLinkedChat = useCallback(() => {
    const selectedTask = selectedTaskIdSnapshot
      ? (tasks.find((item) => item.id === selectedTaskIdSnapshot) || null)
      : null
    const selectedDocumentForChat = selectedDocumentId
      ? (documents.find((item) => item.id === selectedDocumentId)
        || (pendingNotificationDocument?.id === selectedDocumentId ? pendingNotificationDocument : null)
        || null)
      : null
    const selectedMoodBoardForChat = selectedMoodBoardId
      ? (workspaceMoodBoards.find((item) => item.id === selectedMoodBoardId) || null)
      : null

    let targetPath = ''
    let targetTaskId = ''
    let targetLabel = ''
    const projectTargetPath = selectedWorkspaceId && selectedProject && selectedProjectId !== 'all'
      ? buildWorkhubPathname(selectedWorkspaceId, selectedProjectId, 'dashboard')
      : ''
    const projectTargetLabel = selectedProject
      ? ((selectedProject.name || '').trim() || 'Project')
      : ''

    if (selectedTask) {
      const projectIdForPath = selectedTask.projectId || selectedProjectId || 'all'
      targetPath = buildWorkhubPathname(selectedTask.workspaceId, projectIdForPath, 'tasks', selectedTask.id)
      targetTaskId = selectedTask.id
      targetLabel = (selectedTask.title || '').trim() || 'Untitled task'
    } else if (activeSection === 'notes' && selectedDocumentForChat) {
      const projectIdForPath = selectedDocumentForChat.projectId || selectedProjectId || 'all'
      targetPath = buildWorkhubPathname(selectedDocumentForChat.workspaceId, projectIdForPath, 'notes', selectedDocumentForChat.id)
      targetLabel = (selectedDocumentForChat.title || '').trim() || 'Untitled document'
    } else if (activeSection === 'moodboard' && selectedMoodBoardForChat) {
      const projectIdForPath = selectedMoodBoardForChat.entityType === 'project'
        ? (selectedMoodBoardForChat.entityId || selectedProjectId || 'all')
        : (selectedProjectId || 'all')
      targetPath = buildWorkhubPathname(selectedMoodBoardForChat.workspaceId, projectIdForPath, 'moodboard', selectedMoodBoardForChat.id)
      targetLabel = (selectedMoodBoardForChat.title || '').trim() || 'Mood Board'
    } else if (selectedWorkspaceId && selectedProject && selectedProjectId !== 'all') {
      targetPath = projectTargetPath
      targetLabel = projectTargetLabel
    }

    dispatchChatDockOpen({
      source: 'ui',
      ...(targetPath ? { targetPath } : {}),
      ...(targetTaskId ? { targetTaskId } : {}),
      ...(targetLabel ? { targetLabel } : {}),
      ...(projectTargetPath ? { projectTargetPath } : {}),
      ...(projectTargetLabel ? { projectTargetLabel } : {}),
    })
  }, [
    activeSection,
    documents,
    pendingNotificationDocument,
    selectedProject,
    selectedProjectId,
    selectedDocumentId,
    selectedMoodBoardId,
    selectedTaskIdSnapshot,
    selectedWorkspaceId,
    tasks,
    workspaceMoodBoards,
  ])
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
      setSelectedTaskId(taskId)
      setTaskContextMenuState(null)
      setOpenTaskMoreMenuId('')
      setOpenTaskStatusMenuId('')
      setOpenTaskPriorityMenuId('')
      setOpenTaskAssigneeMenuId('')
      setBulkAssigneeMenuOpen(false)
    },
    onRowContextMenu: (taskId, clientX, clientY) => {
      setOpenTaskMoreMenuId('')
      setOpenTaskStatusMenuId('')
      setOpenTaskPriorityMenuId('')
      setOpenTaskAssigneeMenuId('')
      setBulkAssigneeMenuOpen(false)
      setTaskContextMenuState({ taskId, x: clientX, y: clientY })
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
    onAssigneesChange: (task, uids) => {
      const normalized = Array.from(new Set(uids.filter(Boolean)))
      void _cbRef.current.handleTaskUpdate(
        task,
        {
          assigneeUid: normalized[0] || '',
          assigneeUids: normalized.length > 0 ? normalized : undefined,
        },
        { silent: true },
      )
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

  // Stable prop references for WorkhubTasksSection memo.
  // Each wrapper is created once ([] deps) and reads through _cbRef which is synced every render.
  const stableHandleTaskUpdate = useCallback(
    (task: WorkhubTask, updates: Partial<WorkhubTask>, options?: { silent?: boolean }) => _cbRef.current.handleTaskUpdate(task, updates, options), [])
  const stableHandleTaskReorder = useCallback(
    (draggedId: string, statusId: string, targetTaskId: string | null) => _cbRef.current.handleTaskReorder(draggedId, statusId, targetTaskId), [])
  const stableHandleBulkStatusChange = useCallback(
    (statusId: WorkhubTaskStatus) => _cbRef.current.handleBulkStatusChange(statusId), [])
  const stableHandleBulkAssigneeChange = useCallback(
    (uids: string[]) => _cbRef.current.handleBulkAssigneeChange(uids), [])
  const stableHandleQuickAddTask = useCallback(
    (input: QuickAddTaskSubmitInput) => _cbRef.current.handleQuickAddTask(input), [])
  const stableClearTaskSelection = useCallback(() => _cbRef.current.clearTaskSelection(), [])
  const stableHandleBulkDeleteSelected = useCallback(() => _cbRef.current.handleBulkDeleteSelected(), [])
  const stableHandleDeleteSingleTask = useCallback(
    (task: WorkhubTask) => _cbRef.current.handleDeleteSingleTask(task), [])
  const stableHandleQuickTaskViewModeChange = useCallback(
    (nextMode: 'list' | 'cards' | 'grid' | 'timeline') => _cbRef.current.handleQuickTaskViewModeChange(nextMode), [])
  const stableHandleAddTaskComment = useCallback(
    (task: WorkhubTask, body: string, recipientUids: string[]) => _cbRef.current.handleAddTaskComment(task, body, recipientUids), [])
  const stableHandleAddComment = useCallback(
    (body: string) => _cbRef.current.handleAddComment(body), [])
  const stableHandleStartCommentEdit = useCallback(
    (comment: WorkhubTaskComment) => _cbRef.current.handleStartCommentEdit(comment), [])
  const stableHandleCancelCommentEdit = useCallback(() => _cbRef.current.handleCancelCommentEdit(), [])
  const stableHandleSaveCommentEdit = useCallback(
    (comment: WorkhubTaskComment) => _cbRef.current.handleSaveCommentEdit(comment), [])
  const stableHandleDeleteComment = useCallback(
    (comment: WorkhubTaskComment) => _cbRef.current.handleDeleteComment(comment), [])

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
  const createRestrictedMemberCandidates = useMemo(() => workspaceAssignableMembers.filter((item) => {
    if (item.uid === currentUid) return false
    if (item.role === 'admin') return false
    const candidateEmail = (item.email || '').trim().toLowerCase()
    if (normalizedMasterEmail && candidateEmail === normalizedMasterEmail) return false
    return true
  }), [currentUid, normalizedMasterEmail, workspaceAssignableMembers])
  const createRestrictedMemberUidSet = useMemo(
    () => new Set(createRestrictedMemberCandidates.map((item) => item.uid)),
    [createRestrictedMemberCandidates],
  )
  const selectedAccessProjectRestrictedMemberCandidates = useMemo(() => {
    const creatorUid = selectedAccessProject?.createdBy || ''
    return workspaceAssignableMembers.filter((item) => {
      if (item.uid === currentUid) return false
      if (item.uid === creatorUid) return false
      if (item.role === 'admin') return false
      const candidateEmail = (item.email || '').trim().toLowerCase()
      if (normalizedMasterEmail && candidateEmail === normalizedMasterEmail) return false
      return true
    })
  }, [currentUid, normalizedMasterEmail, selectedAccessProject?.createdBy, workspaceAssignableMembers])
  const selectedAccessProjectRestrictedMemberUidSet = useMemo(
    () => new Set(selectedAccessProjectRestrictedMemberCandidates.map((item) => item.uid)),
    [selectedAccessProjectRestrictedMemberCandidates],
  )
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
  const bulkAssignableMembers = useMemo(() => {
    if (selectedTasks.length === 0) return [] as WorkhubMember[]
    const merged = new Map<string, WorkhubMember>()
    selectedTasks.forEach((task) => {
      const members = assignableMembersByProjectId[task.projectId] || workspaceAssignableMembers
      members.forEach((member) => {
        if (!merged.has(member.uid)) {
          merged.set(member.uid, member)
        }
      })
    })
    return Array.from(merged.values())
  }, [assignableMembersByProjectId, selectedTasks, workspaceAssignableMembers])
  const bulkUnionAssigneeUids = useMemo(() => {
    if (selectedTasks.length === 0) return [] as string[]
    const unionSet = new Set<string>()
    selectedTasks.forEach((task) => {
      const validUidSet = new Set((assignableMembersByProjectId[task.projectId] || workspaceAssignableMembers).map((member) => member.uid))
      const fromTask = Array.isArray(task.assigneeUids) ? task.assigneeUids.filter((uid) => validUidSet.has(uid)) : []
      const primary = task.assigneeUid && validUidSet.has(task.assigneeUid) ? task.assigneeUid : ''
      const ordered = primary
        ? [primary, ...fromTask.filter((uid) => uid !== primary)]
        : fromTask
      ordered.forEach((uid) => unionSet.add(uid))
    })
    return Array.from(unionSet)
  }, [assignableMembersByProjectId, selectedTasks, workspaceAssignableMembers])
  const bulkAssigneeCoverageByUid = useMemo(() => {
    const coverage: Record<string, number> = {}
    if (selectedTasks.length === 0) return coverage

    selectedTasks.forEach((task) => {
      const validUidSet = new Set((assignableMembersByProjectId[task.projectId] || workspaceAssignableMembers).map((member) => member.uid))
      const fromTask = Array.isArray(task.assigneeUids) ? task.assigneeUids.filter((uid) => validUidSet.has(uid)) : []
      const primary = task.assigneeUid && validUidSet.has(task.assigneeUid) ? task.assigneeUid : ''
      const ordered = primary
        ? [primary, ...fromTask.filter((uid) => uid !== primary)]
        : fromTask
      Array.from(new Set(ordered)).forEach((uid) => {
        coverage[uid] = (coverage[uid] || 0) + 1
      })
    })

    return coverage
  }, [assignableMembersByProjectId, selectedTasks, workspaceAssignableMembers])
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
      case 'hr_department_unit':
        return 'Departments'
      case 'hr_sub_department_unit':
        return 'Sub-departments'
      case 'hr_employee_profile':
        return 'Employee profiles'
      case 'hr_leave_case':
        return 'Leave cases'
      case 'hr_kpi_cycle':
        return 'KPI cycles'
      case 'hr_initiative_program':
        return 'Initiative programs'
      case 'hr_learning_certification':
        return 'Learning records'
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
  const selectedEmployeeProfileSummary = useMemo(() => {
    if (!selectedProject) return null
    if (selectedProjectEffectiveIntent !== 'hr_employee_profile') return null

    const details = selectedProjectDraftOwnerId === selectedProject.id ? selectedProjectIntentDetailDrafts : {}
    const detailValue = (...keys: string[]) => {
      for (const key of keys) {
        const value = (details[key] || '').trim()
        if (value) return value
      }
      return ''
    }

    const annualAllowance = parseDetailNumber(detailValue('annual leave allowance', 'available leave days'))
    const annualBalance = parseDetailNumber(detailValue('annual leave balance'))
    const usedLeaveDirect = parseDetailNumber(detailValue('used leave days'))

    const annualUsed = usedLeaveDirect !== null
      ? usedLeaveDirect
      : (annualAllowance !== null && annualBalance !== null
        ? Math.max(annualAllowance - annualBalance, 0)
        : null)

    const annualRemaining = annualBalance !== null
      ? Math.max(annualBalance, 0)
      : (annualAllowance !== null && annualUsed !== null
        ? Math.max(annualAllowance - annualUsed, 0)
        : null)

    return {
      name: (selectedProjectNameDraft || selectedProject.name || '').trim() || 'Employee profile',
      employeeId: detailValue('employee id', 'payroll id'),
      position: detailValue('job title', 'role profile'),
      department: detailValue('department'),
      subDepartment: detailValue('sub-department'),
      status: detailValue('employment status', 'employee status'),
      workMode: detailValue('work mode'),
      profilePhotoUrl: detailValue('profile photo url'),
      cvLink: detailValue('cv link'),
      idPassportUrl: detailValue('id passport url'),
      certificationsUrl: detailValue('certification files url'),
      annualAllowance,
      annualUsed,
      annualRemaining,
    }
  }, [
    selectedProject,
    selectedProjectDraftOwnerId,
    selectedProjectEffectiveIntent,
    selectedProjectIntentDetailDrafts,
    selectedProjectNameDraft,
  ])
  useEffect(() => {
    if (selectedProjectEffectiveIntent !== 'hr_employee_profile') return
    if (activeSection === 'tasks') {
      setActiveWorkspaceTab('dashboard')
      setActiveSection('dashboard')
    }
    if (settingsProjectMainPanelView === 'tasks') {
      setSettingsProjectMainPanelView('dashboard_with_details')
    }
  }, [activeSection, selectedProjectEffectiveIntent, settingsProjectMainPanelView])

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
  const memberEmailByUid = useMemo(() => {
    const result: Record<string, string> = {}
    members.forEach((item) => {
      result[item.uid] = (item.email || '').trim().toLowerCase()
    })
    return result
  }, [members])
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
      const memberEmail = (item.email || '').trim().toLowerCase()
      const workspaceById: Record<string, WorkhubUserWorkspaceDraft> = {}
      workspaces.forEach((workspace) => {
        const hasUidAccess = normalizeMemberUids(workspace.accessMemberUids || []).includes(item.uid)
        const hasEmailInvite = !!memberEmail && normalizeInviteEmails(workspace.invitedEmails || []).includes(memberEmail)
        const hasWorkspaceAccess = hasUidAccess || hasEmailInvite
        workspaceById[workspace.id] = {
          enabled: hasWorkspaceAccess,
          level: (workspace.memberAccessLevels?.[item.uid] || 'custom') as 'full' | 'custom',
          invited: !hasUidAccess && hasEmailInvite,
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
    memberEmailByUid,
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
    setUploadingTaskAttachmentId,
    setUploadingChecklistAttachmentKey,
    attachmentDeletePrompt,
    setAttachmentDeletePrompt,
    currentUserUid: currentUid,
    handleTaskUpdate,
    showToast,
  })

  const handleSelectedTaskValueSave = useCallback((task: WorkhubTask, valueAmountDraft: string, valueCurrencyDraft: string) => {
    const rawAmount = valueAmountDraft.trim()
    const nextAmount = rawAmount === '' ? null : parseMonetaryAmountInput(rawAmount)
    const nextCurrency = normalizeMoneyCurrency(valueCurrencyDraft) || 'OMR'
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
  }, [])

  const taskCounts = useMemo(() => {
    let done = 0; let inProgress = 0; let urgent = 0
    for (const item of visibleTasks) {
      if (/done|complete/i.test(item.status)) done++
      if (item.status === 'in_progress') inProgress++
      if (item.priority === 'urgent') urgent++
    }
    return { total: visibleTasks.length, done, inProgress, urgent }
  }, [visibleTasks])
  const {
    unreadNotificationCount,
    unreadCommentCountByTaskId,
    unreadCommentCountByProjectId,
  } = useWorkhubNotificationDerived({ notifications, tasks, selectedWorkspaceId, workspaceProjectById })
  const {
    overviewStatusBuckets,
    overviewPriorityBuckets,
    overviewCompletedCount,
    overviewCompletionRate,
    tasksByAssignee,
    restrictedProjectsCount,
    overviewRecentTimeline,
    teamActivityHeatmap,
    displayedTeamActivityDays,
    overviewPriorityProjects,
    displayedOverviewPriorityProjects,
    homeTemplateWidgets,
  } = useWorkhubDashboardStats({
    visibleTasks,
    workspaceTaskStatuses,
    taskCounts,
    scopeAssignableMembers,
    workspaceAssignableMembers,
    memberNameByUid,
    workspaceProjects,
    visibleWorkspaceProjects,
    activity,
    currentUid,
    isPrivilegedMember,
    activityWindowDays: selectedWorkspace?.activityWindowDays as 7 | 14 | 30 | undefined,
    allClientById,
    clients,
    scopedWorkspaceIds,
    selectedWorkspaceTemplateId,
    unreadNotificationCount,
    pendingMembersCount: pendingMembers.length,
  })
  const pipelineReport = useWorkhubPipelineReport({
    projects: visibleWorkspaceProjects,
    allClientById,
    projectIntentById,
    selectedWorkspaceTemplateId,
    projectColorMeanings: selectedWorkspaceProjectColorMeanings,
    isWorkspaceOverview: selectedProjectId === 'all',
  })
  const selectedPipelineReportGroupKeys = useMemo(() => new Set(
    (Object.entries(pipelineReportGroupSelection) as Array<[WorkhubPipelineReportGroupKey, boolean]>)
      .filter(([, checked]) => checked)
      .map(([key]) => key),
  ), [pipelineReportGroupSelection])
  const selectedPipelineReportGroups = useMemo(
    () => pipelineReport.groups.filter((group) => selectedPipelineReportGroupKeys.has(group.key)),
    [pipelineReport.groups, selectedPipelineReportGroupKeys],
  )
  const selectedPipelineReportItemCount = useMemo(
    () => selectedPipelineReportGroups.reduce((sum, group) => sum + group.items.length, 0),
    [selectedPipelineReportGroups],
  )
  const selectedPipelineReportTotalLabel = useMemo(() => {
    const totalsByCurrency: Record<string, number> = {}
    selectedPipelineReportGroups.forEach((group) => {
      Object.entries(group.totalAmountByCurrency).forEach(([currency, amount]) => {
        addMonetaryTotal(totalsByCurrency, currency, amount)
      })
    })
    return formatMonetaryTotalsByCurrency(totalsByCurrency)
  }, [selectedPipelineReportGroups])
  const selectedPipelineReportStatsByGroup = useMemo(() => {
    const stats: Record<WorkhubPipelineReportGroupKey, number> = {
      open_proposals: 0,
      closed_proposals: 0,
      submitted_proposals: 0,
      dropped_proposals: 0,
      running_projects: 0,
    }
    selectedPipelineReportGroups.forEach((group) => {
      stats[group.key] = group.items.length
    })
    return stats
  }, [selectedPipelineReportGroups])
  const pipelineReportTitle = useMemo(
    () => `${selectedWorkspaceTemplateId === 'finance' ? 'Finance pipeline report' : 'Proposals pipeline report'} - ${new Date().toISOString().slice(0, 10)}`,
    [selectedWorkspaceTemplateId],
  )
  const pipelineReportAttribution = 'This report is created automatically via Tooryan Studios built-in software WorkHub.'
  const pipelineReportOverallValueLabel = selectedWorkspaceTemplateId === 'finance'
    ? 'Overall pipeline total value'
    : 'Overall proposals total value'
  const buildPipelineReportSnapshotMarkdown = useCallback((generatedAt: string) => (
    [
      `Generated at: ${generatedAt}`,
      '',
      '## Snapshot',
      `- Open: ${selectedPipelineReportStatsByGroup.open_proposals}`,
      `- Closed: ${selectedPipelineReportStatsByGroup.closed_proposals}`,
      `- Submitted: ${selectedPipelineReportStatsByGroup.submitted_proposals}`,
      `- Dropped: ${selectedPipelineReportStatsByGroup.dropped_proposals}`,
      `- Running: ${selectedPipelineReportStatsByGroup.running_projects}`,
      `- Total items: ${selectedPipelineReportItemCount}`,
      `- ${pipelineReportOverallValueLabel}: **${selectedPipelineReportTotalLabel}**`,
    ].join('\n')
  ), [
    pipelineReportOverallValueLabel,
    selectedPipelineReportItemCount,
    selectedPipelineReportStatsByGroup,
    selectedPipelineReportTotalLabel,
  ])
  const handleCopyPipelineReportTable = useCallback(async () => {
    if (!pipelineReport.available) return
    if (selectedPipelineReportGroupKeys.size === 0) {
      showToast({ type: 'warning', message: 'Select at least one group to include in the report.' })
      return
    }

    const table = pipelineReport.buildMarkdownTable(selectedPipelineReportGroupKeys)
    if (!table.trim()) {
      showToast({ type: 'warning', message: 'No report rows available for the selected groups.' })
      return
    }

    const generatedAt = new Date().toLocaleString('en-GB')
    const reportContent = [
      `# ${pipelineReportTitle}`,
      '',
      pipelineReportAttribution,
      '',
      buildPipelineReportSnapshotMarkdown(generatedAt),
      '',
      '## Details',
      '',
      table,
    ].join('\n')

    try {
      await navigator.clipboard.writeText(reportContent)
      showToast({ type: 'success', message: 'Pipeline report copied with statistics and table.' })
    } catch {
      showToast({ type: 'error', message: 'Could not copy the pipeline report.' })
    }
  }, [buildPipelineReportSnapshotMarkdown, pipelineReport, pipelineReportAttribution, pipelineReportTitle, selectedPipelineReportGroupKeys, showToast])
  const handlePrintPipelineReport = useCallback(() => {
    if (!pipelineReport.available) return
    if (selectedPipelineReportGroupKeys.size === 0) {
      showToast({ type: 'warning', message: 'Select at least one group to include in the report.' })
      return
    }
    if (selectedPipelineReportItemCount === 0) {
      showToast({ type: 'warning', message: 'No report rows available for the selected groups.' })
      return
    }

    const generatedAt = new Date().toLocaleString('en-GB')
    const printWindow = window.open('', '_blank', 'width=1200,height=900')
    if (!printWindow) {
      showToast({ type: 'error', message: 'Unable to open print window. Please allow popups and try again.' })
      return
    }

    const rowsHtml = selectedPipelineReportGroups.map((group) => {
      const groupRows = group.items.map((item) => `
        <tr>
          <td>${escapePipelineReportHtml(item.name)}</td>
          <td>${escapePipelineReportHtml(item.clientName)}</td>
          <td>${escapePipelineReportHtml(item.typeLabel)}</td>
          <td>${escapePipelineReportHtml(item.statusLabel)}</td>
          <td>${escapePipelineReportHtml(item.submissionDate)}</td>
          <td>${escapePipelineReportHtml(item.submissionTime)}</td>
          <td class="ltr">${escapePipelineReportHtml(formatMonetaryAmount(item.amount, item.currency))}</td>
        </tr>
      `).join('')
      return `
        <tr class="group-row"><td colspan="7">${escapePipelineReportHtml(group.label)}</td></tr>
        ${groupRows}
        <tr class="group-total-row">
          <td><strong>${escapePipelineReportHtml(group.label)} total</strong></td>
          <td><strong>${group.items.length}</strong></td>
          <td></td>
          <td></td>
          <td></td>
          <td></td>
          <td class="ltr"><strong>${escapePipelineReportHtml(group.totalAmountLabel)}</strong></td>
        </tr>
      `
    }).join('')

    const html = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>${escapePipelineReportHtml(pipelineReportTitle)}</title>
    <style>
      :root { color-scheme: light; }
      /* Force zero @page margins so the layout table fully controls all spacing */
      @page { margin: 0; }
      body {
        margin: 0;
        padding: 0;
        font-family: "Segoe UI", "Tahoma", sans-serif;
        color: #142238;
      }
      /* ── Outer layout table ─────────────────────────────────────
         thead/tfoot repeat on every printed page, providing top and
         bottom margins. The single tbody row has empty side cells
         that act as left/right margins.
      ────────────────────────────────────────────────────────── */
      .page-layout {
        width: 100%;
        border-collapse: collapse;
      }
      .page-layout col.margin-col {
        width: 8mm;
      }
      .page-layout > thead,
      .page-layout > tfoot {
        display: table-header-group;
      }
      .page-layout > tfoot {
        display: table-footer-group;
      }
      .page-layout .margin-top td,
      .page-layout .margin-bottom td,
      .page-layout .margin-side {
        border: none !important;
        background: transparent !important;
        padding: 0 !important;
      }
      .page-layout .margin-top td { height: 10mm; }
      .page-layout .margin-bottom td { height: 8mm; }
      .page-layout .margin-side { width: 8mm; }
      .page-layout .content-cell {
        border: none;
        padding: 0;
        vertical-align: top;
      }
      /* ── Content styles ─────────────────────────────────────── */
      h1 {
        margin: 0 0 8px;
        font-size: 24px;
      }
      .meta {
        margin: 0 0 14px;
        color: #4c5f7f;
        font-size: 12px;
      }
      .attribution {
        margin: 0 0 10px;
        color: #36557f;
        font-size: 16px;
        line-height: 1.35;
        font-weight: 600;
      }
      .snapshot-grid {
        display: grid;
        grid-template-columns: repeat(5, minmax(0, 1fr));
        gap: 8px;
        margin: 0 0 10px;
      }
      .snapshot-card {
        border: 1px solid #dbe6fb;
        border-radius: 8px;
        padding: 8px 10px;
        background: #f8fbff;
      }
      .snapshot-card strong {
        display: block;
        font-size: 18px;
      }
      .snapshot-card span {
        color: #4a6288;
        font-size: 12px;
      }
      .overall-value {
        margin: 0 0 14px;
        padding: 10px 12px;
        border-radius: 10px;
        border: 2px solid #8fb3ef;
        background: #eef5ff;
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 10px;
      }
      .overall-value span {
        font-size: 12px;
        color: #34568a;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        font-weight: 700;
      }
      .overall-value strong {
        font-size: 24px;
        color: #0f2f66;
      }
      .data-table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12px;
      }
      .data-table th, .data-table td {
        border: 1px solid #dce7fb;
        padding: 7px 8px;
        text-align: left;
        vertical-align: top;
      }
      .data-table th {
        background: #f2f7ff;
        color: #213d6d;
        font-weight: 700;
      }
      .data-table .group-row td {
        background: #edf4ff;
        color: #234478;
        font-weight: 700;
      }
      .data-table .group-total-row td {
        background: #f8fbff;
      }
      .ltr {
        direction: ltr;
        text-align: left;
      }
      @media print {
        .data-table { page-break-inside: auto; }
        .data-table tr { page-break-inside: avoid; page-break-after: auto; }
        .data-table thead { display: table-header-group; }
      }
    </style>
  </head>
  <body>
    <!-- Outer layout table: thead/tfoot = top/bottom margins per page; side cells = left/right margins -->
    <table class="page-layout">
      <colgroup>
        <col class="margin-col" />
        <col />
        <col class="margin-col" />
      </colgroup>
      <thead>
        <tr class="margin-top"><td colspan="3"></td></tr>
      </thead>
      <tfoot>
        <tr class="margin-bottom"><td colspan="3"></td></tr>
      </tfoot>
      <tbody>
        <tr>
          <td class="margin-side"></td>
          <td class="content-cell">
            <h1>${escapePipelineReportHtml(pipelineReportTitle)}</h1>
            <p class="attribution">${escapePipelineReportHtml(pipelineReportAttribution)}</p>
            <p class="meta">Generated at: ${escapePipelineReportHtml(generatedAt)}</p>

            <section aria-label="Snapshot">
              <div class="snapshot-grid">
                <div class="snapshot-card"><strong>${selectedPipelineReportStatsByGroup.open_proposals}</strong><span>Open</span></div>
                <div class="snapshot-card"><strong>${selectedPipelineReportStatsByGroup.closed_proposals}</strong><span>Closed</span></div>
                <div class="snapshot-card"><strong>${selectedPipelineReportStatsByGroup.submitted_proposals}</strong><span>Submitted</span></div>
                <div class="snapshot-card"><strong>${selectedPipelineReportStatsByGroup.dropped_proposals}</strong><span>Dropped</span></div>
                <div class="snapshot-card"><strong>${selectedPipelineReportStatsByGroup.running_projects}</strong><span>Running</span></div>
              </div>
              <div class="overall-value">
                <span>${escapePipelineReportHtml(pipelineReportOverallValueLabel)} (${selectedPipelineReportItemCount} items)</span>
                <strong>${escapePipelineReportHtml(selectedPipelineReportTotalLabel)}</strong>
              </div>
            </section>

            <table class="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Client</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Submission date</th>
                  <th>Submission time</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </td>
          <td class="margin-side"></td>
        </tr>
      </tbody>
    </table>
  </body>
</html>`

    printWindow.document.open()
    printWindow.document.write(html)
    printWindow.document.close()

    const triggerPrint = () => {
      printWindow.focus()
      printWindow.print()
    }

    if (printWindow.document.readyState === 'complete') {
      triggerPrint()
    } else {
      printWindow.addEventListener('load', () => {
        triggerPrint()
      }, { once: true })
    }
  }, [
    pipelineReport.available,
    pipelineReportAttribution,
    pipelineReportOverallValueLabel,
    pipelineReportTitle,
    selectedPipelineReportGroupKeys.size,
    selectedPipelineReportGroups,
    selectedPipelineReportItemCount,
    selectedPipelineReportStatsByGroup,
    selectedPipelineReportTotalLabel,
    showToast,
  ])
  const handleCreatePipelineReportDocument = useCallback(async (projectId = '') => {
    if (!selectedWorkspaceId || !currentUid) {
      showToast({ type: 'warning', message: 'Select a workspace first.' })
      return
    }
    if (!pipelineReport.available) {
      showToast({ type: 'info', message: 'Report creation is available in Proposals & Leads and Finance workspace overviews.' })
      return
    }

    const selectedGroups = selectedPipelineReportGroupKeys.size > 0
      ? selectedPipelineReportGroupKeys
      : new Set(Object.keys(DEFAULT_PIPELINE_REPORT_GROUP_SELECTION) as WorkhubPipelineReportGroupKey[])

    const table = pipelineReport.buildMarkdownTable(selectedGroups)
    if (!table.trim()) {
      showToast({ type: 'warning', message: 'No report rows available for the selected groups.' })
      return
    }

    const fallbackProjectId = projectId
      || (selectedProjectId !== 'all' ? selectedProjectId : selectedNoteProject?.id || visibleWorkspaceProjects[0]?.id || '')
    if (!fallbackProjectId) {
      showToast({ type: 'warning', message: 'Create at least one folder/project first, then create the report.' })
      return
    }

    const generatedAt = new Date().toLocaleString('en-GB')
    const title = pipelineReportTitle
    const body = [
      `# ${title}`,
      '',
      pipelineReportAttribution,
      '',
      buildPipelineReportSnapshotMarkdown(generatedAt),
      '',
      '## Details',
      '',
      table,
    ].join('\n')

    setBusyKey('report:create')
    try {
      const documentId = await createWorkhubDocument({
        workspaceId: selectedWorkspaceId,
        projectId: fallbackProjectId,
        type: 'document',
        title,
        body,
        tabs: buildQuickDocumentTabs(body),
        visibility: 'workspace',
        memberUids: [],
        notifyMode: 'none',
        notifyUids: [],
        createdBy: currentUid,
      })

      await createWorkhubActivity({
        workspaceId: selectedWorkspaceId,
        actorUid: currentUid,
        entityType: 'document',
        entityId: documentId,
        action: 'create',
        message: `Created report ${title}`,
        visibility: 'workspace',
        memberUids: [],
      })

      setSelectedProjectId(fallbackProjectId)
      setSelectedNoteProjectId(fallbackProjectId)
      setSelectedDocumentId(documentId)
      setSelectedMoodBoardId('')
      setSelectedTaskId('')
      setActiveSection('notes')
      showToast({ type: 'success', message: 'Report item created in Notes.' })
    } catch {
      showToast({ type: 'error', message: 'Could not create report item.' })
    } finally {
      setBusyKey('')
    }
  }, [
    currentUid,
    buildPipelineReportSnapshotMarkdown,
    pipelineReport,
    pipelineReportAttribution,
    pipelineReportTitle,
    selectedPipelineReportStatsByGroup,
    selectedPipelineReportGroupKeys,
    selectedPipelineReportItemCount,
    selectedPipelineReportTotalLabel,
    selectedWorkspaceId,
    selectedWorkspaceTemplateId,
    selectedProjectId,
    selectedNoteProject?.id,
    showToast,
    visibleWorkspaceProjects,
    setSelectedTaskId,
  ])
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
  const workspaceDocumentsByProjectId = useMemo(() => {
    const grouped: Record<string, WorkhubDocument[]> = {}
    workspaceDocuments.forEach((item) => {
      if (!item.projectId) return
      if (!visibleProjectIds.has(item.projectId)) return
      if (!grouped[item.projectId]) grouped[item.projectId] = []
      grouped[item.projectId].push(item)
    })
    Object.values(grouped).forEach((items) => {
      items.sort((left, right) => {
        const leftSortOrder = getWorkhubEntitySortOrderValue(left.sortOrder, left.createdAt, left.updatedAt)
        const rightSortOrder = getWorkhubEntitySortOrderValue(right.sortOrder, right.createdAt, right.updatedAt)
        if (leftSortOrder !== rightSortOrder) return leftSortOrder - rightSortOrder
        const titleDelta = (left.title || '').localeCompare(right.title || '')
        if (titleDelta !== 0) return titleDelta
        return left.id.localeCompare(right.id)
      })
    })
    return grouped
  }, [visibleProjectIds, workspaceDocuments])
  const workspaceMoodBoardsByProjectId = useMemo(() => {
    const grouped: Record<string, WorkhubMoodBoard[]> = {}
    workspaceMoodBoards.forEach((item) => {
      if (item.entityType !== 'project') return
      if (!item.entityId || !visibleProjectIds.has(item.entityId)) return
      if (!grouped[item.entityId]) grouped[item.entityId] = []
      grouped[item.entityId].push(item)
    })
    Object.values(grouped).forEach((items) => {
      items.sort((left, right) => {
        const leftSortOrder = getWorkhubEntitySortOrderValue(left.sortOrder, left.createdAt, left.updatedAt)
        const rightSortOrder = getWorkhubEntitySortOrderValue(right.sortOrder, right.createdAt, right.updatedAt)
        if (leftSortOrder !== rightSortOrder) return leftSortOrder - rightSortOrder
        const titleDelta = (left.title || '').localeCompare(right.title || '')
        if (titleDelta !== 0) return titleDelta
        return left.id.localeCompare(right.id)
      })
    })
    return grouped
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
      return [] as Array<{
        id: string
        title: string
        type: 'document' | 'note'
        projectName: string
        referenceSourceDocumentId?: string | null
        hasOutgoingReferences?: boolean
      }>
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
        referenceSourceDocumentId: doc.referenceSourceDocumentId || null,
        hasOutgoingReferences: Boolean(doc.hasOutgoingReferences),
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
  const selectedDocumentSettingsTarget = useMemo(
    () => (documentSettingsDialogId ? (workspaceDocumentById[documentSettingsDialogId] || (selectedDocument?.id === documentSettingsDialogId ? selectedDocument : null) || null) : null),
    [documentSettingsDialogId, selectedDocument, workspaceDocumentById],
  )
  const documentSettingsRestrictableMembers = useMemo(() => {
    const creatorUid = selectedDocumentSettingsTarget?.createdBy || ''
    return approvedMembers.filter((item) => {
      if (item.uid === currentUid) return false
      if (item.uid === creatorUid) return false
      if (item.role === 'admin') return false
      const candidateEmail = (item.email || '').trim().toLowerCase()
      if (normalizedMasterEmail && candidateEmail === normalizedMasterEmail) return false
      return true
    })
  }, [approvedMembers, currentUid, normalizedMasterEmail, selectedDocumentSettingsTarget?.createdBy])
  const documentSettingsRestrictableUidSet = useMemo(
    () => new Set(documentSettingsRestrictableMembers.map((item) => item.uid)),
    [documentSettingsRestrictableMembers],
  )

  function openDocumentSettingsDialog(documentId: string) {
    const targetDocument = workspaceDocumentById[documentId] || (selectedDocument?.id === documentId ? selectedDocument : null)
    if (!targetDocument) return
    const targetWorkspaceId = targetDocument.workspaceId || selectedWorkspaceId
    const targetVisibility = targetDocument.visibility || 'workspace'
    const creatorUid = targetDocument.createdBy || ''
    const allowedMemberUidSet = new Set(approvedMembers.filter((item) => {
      if (item.uid === currentUid) return false
      if (item.uid === creatorUid) return false
      if (item.role === 'admin') return false
      const candidateEmail = (item.email || '').trim().toLowerCase()
      if (normalizedMasterEmail && candidateEmail === normalizedMasterEmail) return false
      return true
    }).map((item) => item.uid))
    setDocumentSettingsDialogId(targetDocument.id)
    setDocumentSettingsWorkspaceIdDraft(targetWorkspaceId)
    setDocumentSettingsProjectIdDraft(targetDocument.projectId || '')
    setDocumentSettingsIconDraft(targetDocument.icon || '')
    setDocumentSettingsVisibilityDraft(targetVisibility)
    setDocumentSettingsMemberUidsDraft(
      targetVisibility === 'restricted'
        ? normalizeMemberUids(targetDocument.memberUids || []).filter((uid) => allowedMemberUidSet.has(uid))
        : [],
    )
  }

  function closeDocumentSettingsDialog() {
    setDocumentSettingsDialogId('')
    setDocumentSettingsWorkspaceIdDraft('')
    setDocumentSettingsProjectIdDraft('')
    setDocumentSettingsIconDraft('')
    setDocumentSettingsVisibilityDraft('workspace')
    setDocumentSettingsMemberUidsDraft([])
  }

  function handleDocumentSettingsWorkspaceChange(workspaceId: string) {
    setDocumentSettingsWorkspaceIdDraft(workspaceId)
    setDocumentSettingsProjectIdDraft((current) => {
      const currentProject = documentSettingsProjectOptionById[current]
      return currentProject?.workspaceId === workspaceId ? current : ''
    })
  }

  async function handleSaveDocumentSettings() {
    if (!auth.currentUser || !selectedDocumentSettingsTarget) return

    const nextWorkspaceId = documentSettingsWorkspaceIdDraft || selectedDocumentSettingsTarget.workspaceId
    if (!visibleWorkspaceById[nextWorkspaceId]) {
      showToast({ type: 'error', message: 'Choose an accessible workspace.' })
      return
    }

    const selectedProjectOption = documentSettingsProjectIdDraft ? documentSettingsProjectOptionById[documentSettingsProjectIdDraft] : null
    const nextProjectId = selectedProjectOption?.workspaceId === nextWorkspaceId ? selectedProjectOption.id : ''
    const targetProject = nextProjectId ? (projects.find((item) => item.id === nextProjectId) || null) : null
    const canManageDocumentPolicy = isWorkhubAdmin
    const requestedVisibility = canManageDocumentPolicy
      ? documentSettingsVisibilityDraft
      : (selectedDocumentSettingsTarget.visibility || 'workspace')
    const requestedMemberUids = canManageDocumentPolicy
      ? normalizeMemberUids(documentSettingsMemberUidsDraft.filter((uid) => documentSettingsRestrictableUidSet.has(uid)))
      : normalizeMemberUids(selectedDocumentSettingsTarget.memberUids || [])
    const nextVisibility = targetProject?.visibility === 'restricted'
      ? 'restricted'
      : requestedVisibility
    const nextMemberUids = nextVisibility === 'restricted'
      ? normalizeMemberUids(
        targetProject?.visibility === 'restricted'
          ? (targetProject.memberUids?.length ? targetProject.memberUids : [targetProject.createdBy || auth.currentUser.uid])
          : (requestedMemberUids.length > 0 ? requestedMemberUids : [selectedDocumentSettingsTarget.createdBy || auth.currentUser.uid]),
      )
      : []
    const nextNotifyUids = nextVisibility === 'restricted'
      ? normalizeMemberUids(nextMemberUids).filter((uid) => uid !== auth.currentUser?.uid)
      : []

    setBusyKey('document:settings')
    try {
      await updateWorkhubDocument(selectedDocumentSettingsTarget.id, {
        projectId: nextProjectId || null,
        icon: documentSettingsIconDraft || undefined,
        visibility: nextVisibility,
        memberUids: nextMemberUids,
        editMemberUids: nextVisibility === 'restricted' ? nextMemberUids : [],
        notifyMode: nextVisibility === 'restricted' ? (nextNotifyUids.length > 0 ? 'selected' : 'all') : 'all',
        notifyUids: nextNotifyUids,
      })

      await createWorkhubActivity({
        workspaceId: nextWorkspaceId,
        actorUid: auth.currentUser.uid,
        entityType: 'document',
        entityId: selectedDocumentSettingsTarget.id,
        action: 'update',
        message: `Updated ${selectedDocumentSettingsTarget.type === 'note' ? 'note' : 'document'} settings for ${selectedDocumentSettingsTarget.title}`,
        visibility: nextVisibility,
        memberUids: nextMemberUids,
      })

      setSelectedWorkspaceId(nextWorkspaceId)
      setSelectedProjectId(nextProjectId || 'all')
      setSelectedNoteProjectId(nextProjectId || '')
      setSelectedTaskId('')
      setSelectedMoodBoardId('')
      setSelectedDocumentId(selectedDocumentSettingsTarget.id)
      setActiveSection('notes')
      setProjectsGroupExpanded(true)
      setSidebarCollapsed(false)
      closeDocumentSettingsDialog()
      showToast({ type: 'success', message: `${selectedDocumentSettingsTarget.type === 'note' ? 'Note' : 'Document'} settings updated.` })
    } catch (error) {
      showToast({ type: 'error', message: error instanceof Error ? error.message : 'Could not save document settings.' })
    } finally {
      setBusyKey('')
    }
  }

  const selectedMoodBoardSettingsTarget = useMemo(
    () => (moodBoardSettingsDialogId ? (workspaceMoodBoards.find((item) => item.id === moodBoardSettingsDialogId) || null) : null),
    [moodBoardSettingsDialogId, workspaceMoodBoards],
  )
  const moodBoardSettingsRestrictableMembers = useMemo(() => {
    const creatorUid = selectedMoodBoardSettingsTarget?.createdBy || ''
    return approvedMembers.filter((item) => {
      if (item.uid === currentUid) return false
      if (item.uid === creatorUid) return false
      if (item.role === 'admin') return false
      const candidateEmail = (item.email || '').trim().toLowerCase()
      if (normalizedMasterEmail && candidateEmail === normalizedMasterEmail) return false
      return true
    })
  }, [approvedMembers, currentUid, normalizedMasterEmail, selectedMoodBoardSettingsTarget?.createdBy])
  const moodBoardSettingsRestrictableUidSet = useMemo(
    () => new Set(moodBoardSettingsRestrictableMembers.map((item) => item.uid)),
    [moodBoardSettingsRestrictableMembers],
  )

  function openMoodBoardSettingsDialog(boardId: string) {
    const targetBoard = workspaceMoodBoards.find((item) => item.id === boardId) || null
    if (!targetBoard) return
    const targetWorkspaceId = targetBoard.workspaceId || selectedWorkspaceId
    const targetProjectId = targetBoard.entityType === 'project' ? targetBoard.entityId : ''
    const targetVisibility = targetBoard.visibility || 'workspace'
    const creatorUid = targetBoard.createdBy || ''
    const allowedMemberUidSet = new Set(approvedMembers.filter((item) => {
      if (item.uid === currentUid) return false
      if (item.uid === creatorUid) return false
      if (item.role === 'admin') return false
      const candidateEmail = (item.email || '').trim().toLowerCase()
      if (normalizedMasterEmail && candidateEmail === normalizedMasterEmail) return false
      return true
    }).map((item) => item.uid))
    const targetMemberUids = targetVisibility === 'restricted'
      ? normalizeMemberUids(targetBoard.memberUids || []).filter((uid) => allowedMemberUidSet.has(uid))
      : []
    setMoodBoardSettingsDialogId(targetBoard.id)
    setMoodBoardSettingsWorkspaceIdDraft(targetWorkspaceId)
    setMoodBoardSettingsProjectIdDraft(targetProjectId)
    setMoodBoardSettingsTitleDraft((targetBoard.title || '').trim() || 'Mood board')
    setMoodBoardSettingsVisibilityDraft(targetVisibility)
    setMoodBoardSettingsMemberUidsDraft(targetMemberUids)
  }

  function closeMoodBoardSettingsDialog() {
    setMoodBoardSettingsDialogId('')
    setMoodBoardSettingsWorkspaceIdDraft('')
    setMoodBoardSettingsProjectIdDraft('')
    setMoodBoardSettingsTitleDraft('')
    setMoodBoardSettingsVisibilityDraft('workspace')
    setMoodBoardSettingsMemberUidsDraft([])
  }

  function handleMoodBoardSettingsWorkspaceChange(workspaceId: string) {
    setMoodBoardSettingsWorkspaceIdDraft(workspaceId)
    setMoodBoardSettingsProjectIdDraft((current) => {
      const currentProject = documentSettingsProjectOptionById[current]
      return currentProject?.workspaceId === workspaceId ? current : ''
    })
  }

  async function handleSaveMoodBoardSettings() {
    if (!auth.currentUser || !selectedMoodBoardSettingsTarget) return

    const nextWorkspaceId = moodBoardSettingsWorkspaceIdDraft || selectedMoodBoardSettingsTarget.workspaceId
    if (!visibleWorkspaceById[nextWorkspaceId]) {
      showToast({ type: 'error', message: 'Choose an accessible workspace.' })
      return
    }

    const selectedProjectOption = moodBoardSettingsProjectIdDraft ? documentSettingsProjectOptionById[moodBoardSettingsProjectIdDraft] : null
    const nextProjectId = selectedProjectOption?.workspaceId === nextWorkspaceId ? selectedProjectOption.id : ''
    const targetProject = nextProjectId ? (projects.find((item) => item.id === nextProjectId) || null) : null
    const nextTitle = (moodBoardSettingsTitleDraft || '').trim() || ((selectedMoodBoardSettingsTarget.title || '').trim() || 'Mood board')
    const canManageMoodBoardPolicy = isWorkhubAdmin
    const requestedVisibility = canManageMoodBoardPolicy
      ? moodBoardSettingsVisibilityDraft
      : (selectedMoodBoardSettingsTarget.visibility || 'workspace')
    const requestedMemberUids = canManageMoodBoardPolicy
      ? normalizeMemberUids(moodBoardSettingsMemberUidsDraft.filter((uid) => moodBoardSettingsRestrictableUidSet.has(uid)))
      : normalizeMemberUids(selectedMoodBoardSettingsTarget.memberUids || [])

    const nextVisibility = targetProject?.visibility === 'restricted'
      ? 'restricted'
      : requestedVisibility
    const nextMemberUids = nextVisibility === 'restricted'
      ? normalizeMemberUids(
        targetProject?.visibility === 'restricted'
          ? (targetProject.memberUids?.length ? targetProject.memberUids : [targetProject.createdBy || selectedMoodBoardSettingsTarget.createdBy || auth.currentUser.uid])
          : (requestedMemberUids.length > 0 ? requestedMemberUids : [selectedMoodBoardSettingsTarget.createdBy || auth.currentUser.uid]),
      )
      : []
    const nextEntityType = nextProjectId ? 'project' : 'workspace'
    const nextEntityId = nextProjectId || nextWorkspaceId

    setBusyKey('moodboard:settings')
    try {
      await updateWorkhubMoodBoard(selectedMoodBoardSettingsTarget.id, {
        workspaceId: nextWorkspaceId,
        entityType: nextEntityType,
        entityId: nextEntityId,
        title: nextTitle,
        visibility: nextVisibility,
        memberUids: nextMemberUids,
      })

      await createWorkhubActivity({
        workspaceId: nextWorkspaceId,
        actorUid: auth.currentUser.uid,
        entityType: 'moodboard',
        entityId: selectedMoodBoardSettingsTarget.id,
        action: 'update',
        message: `Updated mood board settings for ${nextTitle}`,
        visibility: nextVisibility,
        memberUids: nextMemberUids,
      })

      setSelectedWorkspaceId(nextWorkspaceId)
      setSelectedProjectId(nextProjectId || 'all')
      setSelectedNoteProjectId(nextProjectId || '')
      setSelectedTaskId('')
      setSelectedDocumentId('')
      setSelectedMoodBoardId(selectedMoodBoardSettingsTarget.id)
      setActiveSection('moodboard')
      setProjectsGroupExpanded(true)
      setSidebarCollapsed(false)
      closeMoodBoardSettingsDialog()
      showToast({ type: 'success', message: 'Mood board settings updated.' })
    } catch (error) {
      showToast({ type: 'error', message: error instanceof Error ? error.message : 'Could not save mood board settings.' })
    } finally {
      setBusyKey('')
    }
  }

  const activeMoodBoard = useMemo(
    () => workspaceMoodBoards.find((b) => b.id === selectedMoodBoardId) ?? null,
    [workspaceMoodBoards, selectedMoodBoardId],
  )
  const activeMoodBoardChecklist = useMemo(
    () => activeMoodBoard?.checklist || [],
    [activeMoodBoard],
  )
  const resolvedMoodboardPanelMode = useMemo(
    () => activeMoodBoard
      ? resolveMoodboardPanelMode(activeMoodBoard.panelVariant)
      : resolveMoodboardPanelMode(moodboardPanelMode),
    [activeMoodBoard, moodboardPanelMode],
  )
  const isResolvingActiveMoodBoard = useMemo(
    () => activeSection === 'moodboard' && !!selectedMoodBoardId && !activeMoodBoard,
    [activeMoodBoard, activeSection, selectedMoodBoardId],
  )

  useEffect(() => {
    if (activeSection !== 'moodboard' || !activeMoodBoard) return
    setMoodboardPanelMode(resolveMoodboardPanelMode(activeMoodBoard.panelVariant))
  }, [activeMoodBoard, activeSection])

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
      // For reference documents, tie discussion to the source document
      const discussionDocId = selectedDocument.referenceSourceDocumentId || selectedDocument.id
      const discussionWorkspaceId = (selectedDocument.referenceSourceDocumentId
        ? selectedDocument.referenceSourceWorkspaceId
        : undefined) || selectedDocument.workspaceId
      return {
        entityType: 'document' as const,
        entityId: discussionDocId,
        workspaceId: discussionWorkspaceId,
        label: selectedDocument.title?.trim() || 'Untitled document',
        visibility: selectedDocument.visibility,
        memberUids: selectedDocument.memberUids,
      }
    }
    if ((activeSection === 'tasks' || activeSection === 'dashboard') && selectedProject && selectedProjectId !== 'all') {
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
  }, [activeSection, selectedDocument, selectedProject, selectedProjectId])
  const discussionNotifyCandidateUids = useMemo(() => {
    const priorCommenterUids = comments.map((item) => item.authorUid)

    if (!selectedDiscussionTarget) return [] as string[]

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
    return {
      mode: 'all' as const,
      uids: [] as string[],
    }
  }, [activeSection, currentUid, selectedDocument])
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
  const resolveTaskParentEntityLabel = useCallback((projectId: string) => {
    if (!projectId) return 'Item'
    const parentEntity = workspaceProjectById[projectId]
    if (!parentEntity) return 'Item'
    const parentIntent = resolveEffectiveProjectIntent(parentEntity, workspaceByIdForFiltering, selectedWorkspaceTemplateIntentSet)
    return getTemplateCreationIntentMeta(parentIntent, selectedWorkspaceTemplateId).subjectLabel
  }, [selectedWorkspaceTemplateId, selectedWorkspaceTemplateIntentSet, workspaceByIdForFiltering, workspaceProjectById])
  const canEditSelectedProject = useMemo(
    () => !!selectedProject && (isPrivilegedMember || currentUserAccessLevel === 'full' || selectedProject.createdBy === currentUid),
    [currentUid, currentUserAccessLevel, isPrivilegedMember, selectedProject],
  )
  const canEditSelectedProjectAttachments = useMemo(() => {
    if (!selectedProject || !currentUid) return false
    if (isPrivilegedMember || currentUserAccessLevel === 'full' || selectedProject.createdBy === currentUid) return true

    if (selectedProject.visibility === 'restricted') {
      return normalizeMemberUids(selectedProject.memberUids || []).includes(currentUid)
    }

    return workspaceAssignableMemberUidSet.has(currentUid)
  }, [currentUid, currentUserAccessLevel, isPrivilegedMember, selectedProject, workspaceAssignableMemberUidSet])

  useEffect(() => {
    if (!currentUid) {
      setProposalServiceOptions(dedupeProposalServices(DEFAULT_PROPOSAL_SERVICE_OPTIONS))
      return
    }
    return subscribeWorkhubCompanyServices((items) => {
      setProposalServiceOptions(dedupeProposalServices([
        ...DEFAULT_PROPOSAL_SERVICE_OPTIONS,
        ...items.map((item) => item.name || ''),
      ]))
    })
  }, [currentUid])

  const handleCreateProposalServiceOption = useCallback(async (name: string) => {
    const normalizedName = normalizeProposalServiceName(name)
    if (!normalizedName) return

    if (!isPrivilegedMember) {
      showToast({ type: 'info', message: 'Only managers/admins can create new services. You can still select from the service list.' })
      return
    }

    const exists = proposalServiceOptions.some((item) => normalizeProposalServiceKey(item) === normalizeProposalServiceKey(normalizedName))
    if (!exists) {
      setProposalServiceOptions((current) => dedupeProposalServices([...current, normalizedName]))
    }

    try {
      await createWorkhubCompanyService({ name: normalizedName, createdBy: currentUid })
      showToast({ type: 'success', message: `Service "${normalizedName}" added to company catalog.` })
    } catch (error) {
      const code = typeof error === 'object' && error && 'code' in error
        ? String((error as { code?: unknown }).code || '')
        : ''
      if (code.includes('permission-denied')) {
        showToast({ type: 'error', message: 'Only managers/admins can create global services. Select from existing services instead.' })
        return
      }
      const message = error instanceof Error ? error.message : 'Could not add company service.'
      showToast({ type: 'error', message })
    }
  }, [currentUid, isPrivilegedMember, proposalServiceOptions, showToast])

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
    selectedProjectProposalServicesDraft: selectedProposalServicesDraft,
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
    setSelectedMoodBoardId,
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

  const showDashboardDetailRail = !isMobileWorkhubLayout
    && workhubViewMode === 'tabs'
    && activeSection === 'dashboard'
    && selectedProject?.mainPanelView === 'dashboard_with_details'

  const resolvedDashboardDetailRailWidth = useMemo(
    () => clampDashboardDetailRailWidth(dashboardDetailRailWidth),
    [dashboardDetailRailWidth],
  )

  useEffect(() => {
    localStorage.setItem('workhub:dashboard-detail-rail-width', String(Math.round(resolvedDashboardDetailRailWidth)))
  }, [resolvedDashboardDetailRailWidth])

  const handleDashboardDetailRailResizeStart = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    if (isMobileWorkhubLayout || !showDashboardDetailRail) return
    event.preventDefault()
    event.stopPropagation()
    setIsDashboardDetailRailResizing(true)
    const initialRight = dashboardDetailRailRef.current?.getBoundingClientRect().right ?? window.innerWidth

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const nextWidth = Math.round(initialRight - moveEvent.clientX)
      setDashboardDetailRailWidth(clampDashboardDetailRailWidth(nextWidth))
    }

    const handlePointerUp = () => {
      setIsDashboardDetailRailResizing(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }, [isMobileWorkhubLayout, showDashboardDetailRail])

  useEffect(() => {
    if (!isMobileWorkhubLayout && showDashboardDetailRail) return
    setIsDashboardDetailRailResizing(false)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [isMobileWorkhubLayout, showDashboardDetailRail])

  useEffect(() => () => {
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
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
    const nextProjectId = projectId || 'all'
    const nextProjectIntent = nextProjectId !== 'all' ? (projectIntentById[nextProjectId] || 'project') : ''
    const resolvedSection: WorkhubCanonicalSection = section === 'tasks' && nextProjectIntent === 'hr_employee_profile'
      ? 'dashboard'
      : section

    setSelectedProjectId(nextProjectId)
    setSelectedNoteProjectId('')
    setSelectedDocumentId('')
    setSelectedMoodBoardId('')
    setSelectedTaskId('')
    setPendingNotificationDocument(null)
    setActiveWorkspaceTab(resolvedSection)
    setActiveSection(resolvedSection)
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
    const nextPath = buildWorkhubPathname(workspaceId, nextProjectId, resolvedSection)
    const currentPath = `${location.pathname}${location.search}`
    if (currentPath !== nextPath) {
      navigate(nextPath)
    }
  }, [location.pathname, location.search, navigate, projectIntentById, selectedWorkspaceId])
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

    // Pre-apply ALL state from the remembered route before navigating.
    // This prevents the state→URL sync from computing a wrong path on the first
    // render after the workspace switch due to stale project/entity state from
    // the previous workspace. Without full pre-application:
    //  – A stale selectedProjectId causes state→URL to append the old project to
    //    the new workspace URL (e.g. /workhub/w/B/p/projA) instead of leaving it
    //    as /workhub/w/B/s/tasks, then the project-clear effect fires, causing
    //    another navigate back, and so on — producing visible workspace flickering.
    //  – A stale entity (task/document/moodboard) triggers the entity guard in
    //    state→URL, which blocks all subsequent navigations until the entity is
    //    cleared by some other interaction.
    const { pathname: remPathname, search: remSearch } = splitPersistedWorkhubRoute(rememberedRoute)
    const remParsed = parseWorkhubPathname(remPathname, remSearch)
    const remSection: WorkhubCanonicalSection = isWorkhubWorkspaceSection(remParsed.section) ? remParsed.section : 'dashboard'
    const remProjectId = remParsed.projId && remParsed.projId !== 'all' ? remParsed.projId : 'all'
    setSelectedProjectId(remProjectId)
    setSelectedNoteProjectId(remSection === 'notes' && remProjectId !== 'all' ? remProjectId : '')
    setSelectedDocumentId(remParsed.kind === 'document' ? remParsed.entityId : '')
    setSelectedMoodBoardId(remParsed.kind === 'moodboard' ? remParsed.entityId : '')
    setSelectedTaskId(remParsed.kind === 'task' ? remParsed.entityId : '')
    setActiveWorkspaceTab(remSection)
    setActiveSection(remSection)

    setSelectedWorkspaceId(workspaceId)
    if (`${location.pathname}${location.search}` !== rememberedRoute) {
      navigate(rememberedRoute)
    }
  }, [location.pathname, location.search, navigate, navigateToWorkspaceOverview, resolveRememberedWorkspaceRoute])
  const toggleWorkspaceTreeExpansion = useCallback((workspaceId: string) => {
    setExpandedWorkspaceTreeIds((current) => current.includes(workspaceId)
      ? current.filter((item) => item !== workspaceId)
      : [...current, workspaceId])
  }, [])
  const handleWorkspaceTreeGroupSelect = useCallback((workspaceId: string) => {
    if (!workspaceId) return
    toggleWorkspaceTreeExpansion(workspaceId)
    if (workspaceId !== selectedWorkspaceId) {
      navigateToRememberedWorkspaceRoute(workspaceId)
    }
  }, [navigateToRememberedWorkspaceRoute, selectedWorkspaceId, toggleWorkspaceTreeExpansion])
  const handleSelectProjectFromWorkspaceTree = useCallback((workspaceId: string, projectId: string) => {
    if (!workspaceId || !projectId) return
    const lineage = collectProjectLineage(projectId, workspaceTreeProjectById)
    if (lineage.length > 0) {
      setExpandedProjectIds((current) => Array.from(new Set([...current, ...lineage])))
    }
    setSelectedWorkspaceId(workspaceId)
    setSelectedProjectId(projectId)
    setSelectedNoteProjectId('')
    setSelectedDocumentId('')
    setSelectedMoodBoardId('')
    setSelectedTaskId('')
    const nextSection = resolveProjectMainPanelSection(projectId)
    setActiveSection(nextSection)
    setActiveWorkspaceTab(nextSection)
    setProjectsGroupExpanded(true)
    setSidebarCollapsed(false)
    navigate(buildWorkhubPathname(workspaceId, projectId, nextSection))
  }, [navigate, resolveProjectMainPanelSection, setSelectedTaskId, workspaceTreeProjectById])
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
  const {
    addItemDialogOpen,
    addItemProjectId,
    openAddItemDialog,
    closeAddItemDialog,
    handleCreateItem: handleCreateItemType,
  } = useWorkhubAddItemDialog({
    selectedProjectId,
    workspaceProjectById,
  })

  const createTaskQuick = useCallback(async (projectId: string) => {
    if (!auth.currentUser || !selectedWorkspaceId || !projectId) return
    const targetProject = visibleProjectById[projectId]
    if (!targetProject) return

    setBusyKey('task')
    try {
      const taskId = await createWorkhubTask({
        workspaceId: selectedWorkspaceId,
        projectId,
        title: 'New task',
        description: '',
        visibility: targetProject.visibility || 'workspace',
        memberUids: targetProject.memberUids || [],
        status: defaultTaskStatusId,
        priority: 'medium',
        assigneeUid: auth.currentUser.uid,
        startDate: undefined,
        dueDate: '',
        createdBy: auth.currentUser.uid,
      })

      setSelectedTaskId(taskId)
      setSelectedDocumentId('')
      setSelectedMoodBoardId('')
      setActiveSection('tasks')
      setProjectsGroupExpanded(true)
      setSidebarCollapsed(false)

      showToast({ type: 'success', message: 'Task created.' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not create task.'
      showToast({ type: 'error', message })
    } finally {
      setBusyKey('')
    }
  }, [auth.currentUser, selectedWorkspaceId, visibleProjectById, defaultTaskStatusId, showToast, setBusyKey])

  const createMoodBoardQuick = useCallback(async (projectId: string) => {
    if (!auth.currentUser || !selectedWorkspaceId || !projectId) return
    const targetProject = visibleProjectById[projectId]
    if (!targetProject) return

    setBusyKey('moodboard')
    try {
      const moodBoardId = await createWorkhubMoodBoard({
        workspaceId: selectedWorkspaceId,
        entityType: 'project',
        entityId: projectId,
        title: 'New mood board',
        createdBy: auth.currentUser.uid,
      })

      setSelectedMoodBoardId(moodBoardId)
      setSelectedDocumentId('')
      setSelectedTaskId('')
      setActiveSection('moodboard')
      setProjectsGroupExpanded(true)
      setSidebarCollapsed(false)

      showToast({ type: 'success', message: 'Mood board created.' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not create mood board.'
      showToast({ type: 'error', message })
    } finally {
      setBusyKey('')
    }
  }, [auth.currentUser, selectedWorkspaceId, visibleProjectById, showToast, setBusyKey])

  const handleCreateItem = useCallback(async (type: AddItemType) => {
    if (addItemProjectId) {
      const lineage = collectProjectLineage(addItemProjectId, workspaceProjectById)
      if (lineage.length > 0) {
        setExpandedProjectIds((current) => Array.from(new Set([...current, ...lineage])))
      }
    }

    try {
      switch (type) {
        case 'task':
          await createTaskQuick(addItemProjectId)
          break
        case 'document':
          await createDocumentQuick(addItemProjectId)
          break
        case 'note':
          await createNoteQuick(addItemProjectId)
          break
        case 'moodboard':
          await createMoodBoardQuick(addItemProjectId)
          break
      }
      handleCreateItemType(type)
    } catch (error) {
      // Error handling is done in the individual creation hooks
    }
  }, [addItemProjectId, createTaskQuick, createDocumentQuick, createNoteQuick, createMoodBoardQuick, handleCreateItemType, workspaceProjectById])
  const settingsMilestones = useWorkhubMilestones({
    projectId: projectAccessDialogId || null,
    workspaceId: selectedWorkspaceId,
    tasks,
    currentUserUid: currentUid,
    showToast,
  })
  // Alias — settings milestones only (for ProjectSettingsDialog). View milestones live in WorkhubTasksSection.
  const milestones = settingsMilestones
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
    const selectedProjectServiceKeys = new Set((selectedProject.proposalServices || []).map((value) => normalizeProposalServiceKey(value)))
    const draftServiceKeys = new Set(selectedProposalServicesDraft.map((value) => normalizeProposalServiceKey(value)))
    const proposalServicesChanged = selectedProjectServiceKeys.size !== draftServiceKeys.size
      || Array.from(draftServiceKeys).some((key) => !selectedProjectServiceKeys.has(key))
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
      || proposalServicesChanged
    )
  }, [
    selectedProject,
    selectedProjectColorDraft,
    selectedProjectComposedDescriptionDraft,
    selectedProjectDeadlineDraft,
    selectedProjectNameDraft,
    selectedProposalServicesDraft,
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
  const prevSelectedWorkspaceIdRef = useRef(selectedWorkspaceId)
  const prevSelectedProjectIdRef = useRef(selectedProjectId)
  const prevSelectedEntityIdRef = useRef('')
  const prevActiveSectionRef = useRef(activeSection)
  const prevParsedKindRef = useRef(parsedWorkhubPath.kind)
  const linkedHighlightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isWorkspaceSelectionResolved = useMemo(() => {
    if (!selectedWorkspaceId) return false
    return visibleWorkspaces.some((item) => item.id === selectedWorkspaceId)
  }, [selectedWorkspaceId, visibleWorkspaces])

  useEffect(() => {
    return () => {
      if (linkedHighlightTimerRef.current) {
        clearTimeout(linkedHighlightTimerRef.current)
        linkedHighlightTimerRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const hasLinkedMarker = params.get('chatLinked') === '1' || params.get('notif') === '1'
    if (!hasLinkedMarker || !selectedEntityParam) return

    if (linkedHighlightTimerRef.current) {
      clearTimeout(linkedHighlightTimerRef.current)
      linkedHighlightTimerRef.current = null
    }

    let nextProjectHighlightId = ''
    let nextDocumentHighlightId = ''
    let nextMoodBoardHighlightId = ''
    let nextTaskHighlightId = ''

    if (parsedWorkhubPath.kind === 'project') {
      nextProjectHighlightId = selectedEntityParam
    } else if (parsedWorkhubPath.kind === 'document') {
      nextDocumentHighlightId = selectedEntityParam
      const targetDocument = workspaceDocumentById[selectedEntityParam]
      if (targetDocument?.projectId && visibleProjectIds.has(targetDocument.projectId)) {
        nextProjectHighlightId = targetDocument.projectId
      }
    } else if (parsedWorkhubPath.kind === 'moodboard') {
      nextMoodBoardHighlightId = selectedEntityParam
      const targetBoard = workspaceMoodBoards.find((item) => item.id === selectedEntityParam)
      if (targetBoard?.entityType === 'project' && targetBoard.entityId && visibleProjectIds.has(targetBoard.entityId)) {
        nextProjectHighlightId = targetBoard.entityId
      }
    } else if (parsedWorkhubPath.kind === 'task') {
      nextTaskHighlightId = selectedEntityParam
      const targetTask = tasks.find((item) => item.id === selectedEntityParam)
      if (targetTask?.projectId && visibleProjectIds.has(targetTask.projectId)) {
        nextProjectHighlightId = targetTask.projectId
      }
    }

    if (!nextProjectHighlightId && selectedProjectParam && selectedProjectParam !== 'all' && visibleProjectIds.has(selectedProjectParam)) {
      nextProjectHighlightId = selectedProjectParam
    }

    setLinkedHighlightedProjectId(nextProjectHighlightId)
    setLinkedHighlightedDocumentId(nextDocumentHighlightId)
    setLinkedHighlightedMoodBoardId(nextMoodBoardHighlightId)
    setLinkedHighlightedTaskId(nextTaskHighlightId)

    linkedHighlightTimerRef.current = setTimeout(() => {
      setLinkedHighlightedProjectId('')
      setLinkedHighlightedDocumentId('')
      setLinkedHighlightedMoodBoardId('')
      setLinkedHighlightedTaskId('')
      linkedHighlightTimerRef.current = null
    }, 5200)
  }, [
    location.search,
    parsedWorkhubPath.kind,
    selectedEntityParam,
    selectedProjectParam,
    tasks,
    visibleProjectIds,
    workspaceDocumentById,
    workspaceMoodBoards,
  ])

  useEffect(() => {
    if (!selectedProject) {
      setSelectedProjectDraftOwnerId('')
      setSelectedProjectNameDraft('')
      setSelectedProjectDescriptionDraft('')
      setSelectedProjectNarrativeDraft('')
      setSelectedProjectIntentDetailDrafts({})
      setSelectedProposalServicesDraft([])
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
    setSelectedProposalServicesDraft(dedupeProposalServices(selectedProject.proposalServices || []))
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
    selectedProject?.proposalServices,
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
    if (!selectedProject || !canEditSelectedProjectAttachments) return
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
  }, [canEditSelectedProjectAttachments, selectedProject, selectedProjectAttachmentDraft, selectedProjectAttachmentTitleDraft, selectedProjectAttachments, setBusyKey, showToast])

  const handleSelectedProjectAttachmentUpdate = useCallback(async (previousUrl: string, nextUrlDraft: string, nextTitleDraft: string) => {
    if (!selectedProject || !canEditSelectedProjectAttachments) return

    const previousKey = previousUrl.trim()
    const nextUrl = nextUrlDraft.trim()
    if (!nextUrl) {
      showToast({ type: 'error', message: 'Attachment link cannot be empty.' })
      return
    }
    if (!selectedProjectAttachments.includes(previousKey)) return

    const replacedAttachments = selectedProjectAttachments.map((item) => item === previousKey ? nextUrl : item)
    const dedupedAttachments = Array.from(new Set(replacedAttachments))
    if (dedupedAttachments.length !== replacedAttachments.length) {
      showToast({ type: 'error', message: 'This link already exists in attachments.' })
      return
    }

    const currentTitles = { ...(selectedProject.attachmentTitles || {}) }
    const fallbackTitle = currentTitles[previousKey] || deriveAttachmentTitle(previousKey)
    const nextTitle = nextTitleDraft.trim() || fallbackTitle || deriveAttachmentTitle(nextUrl)

    if (previousKey !== nextUrl) {
      delete currentTitles[previousKey]
    }
    currentTitles[nextUrl] = nextTitle

    setBusyKey(`project-detail:${selectedProject.id}`)
    try {
      await updateWorkhubProject(selectedProject.id, {
        attachments: dedupedAttachments,
        attachmentTitles: currentTitles,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not update attachment.'
      showToast({ type: 'error', message })
    } finally {
      setBusyKey('')
    }
  }, [canEditSelectedProjectAttachments, deriveAttachmentTitle, selectedProject, selectedProjectAttachments, setBusyKey, showToast])

  const handleSelectedProjectAttachmentRemove = useCallback(async (url: string) => {
    if (!selectedProject || !canEditSelectedProjectAttachments) return
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
  }, [canEditSelectedProjectAttachments, selectedProject, selectedProjectAttachments, setBusyKey, showToast])

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
    if (!selectedProject || !canEditSelectedProjectAttachments || selectedProjectAttachmentFileDrafts.length === 0) return
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
  }, [canEditSelectedProjectAttachments, selectedProject, selectedProjectAttachmentFileDrafts, selectedProjectAttachments, setBusyKey, showToast, uploadProjectAttachment])

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
    if (!selectedSectionParam) return
    if (activeSection === selectedSectionParam) return
    setSelectedDocumentId('')
    setSelectedMoodBoardId('')
    setSelectedTaskId('')
    setActiveWorkspaceTab(selectedSectionParam)
    setActiveSection(selectedSectionParam)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, parsedWorkhubPath.kind, selectedSectionParam])

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
      setProjectsGroupExpanded(true)
      setSidebarCollapsed(false)
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
      setProjectsGroupExpanded(true)
      setSidebarCollapsed(false)
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
      setSelectedTaskStatusTab('all')
      setActiveSection('tasks')
      setProjectsGroupExpanded(true)
      setSidebarCollapsed(false)
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

    // Track section changes before any early return so POP guards can distinguish
    // URL-led hydration from user-initiated section changes.
    const prevSection = prevActiveSectionRef.current
    prevActiveSectionRef.current = activeSection
    const sectionChangedThisRender = prevSection !== activeSection

    // Track URL-kind changes so we can detect the frame where navigate() has
    // landed but the URL→state effects haven't updated activeSection yet.
    const prevKind = prevParsedKindRef.current
    prevParsedKindRef.current = parsedWorkhubPath.kind
    const kindChangedThisRender = prevKind !== parsedWorkhubPath.kind

    // If the URL explicitly targets a section for this workspace, never let
    // stale in-memory section state overwrite it while URL->state hydration is
    // still catching up. This guard is navigation-type agnostic so it also
    // covers non-POP race conditions that can bounce between /s/tasks and root.
    if (
      selectedWorkspaceParam
      && selectedWorkspaceId === selectedWorkspaceParam
      && !!selectedSectionParam
      && activeSection !== selectedSectionParam
      && !sectionChangedThisRender
    ) {
      return
    }

    // If the URL is pointing at a moodboard entity but boards haven't loaded from
    // Firestore yet, hold off. Without this guard the state→URL sync sees
    // activeSection='dashboard' (URL→state hasn't fired yet because workspaceMoodBoards
    // is still empty) and pushes a dashboard URL, causing a visible flicker on refresh.
    if (parsedWorkhubPath.kind === 'moodboard' && !workspaceMoodBoardsLoaded) return

    // If the URL is pointing at a task entity in the active workspace but the task
    // feed hasn't surfaced that item yet, keep URL authority and avoid canonicalizing
    // to a dashboard/project route prematurely.
    if (
      parsedWorkhubPath.kind === 'task'
      && !!selectedEntityParam
      && !!selectedWorkspaceParam
      && selectedWorkspaceId === selectedWorkspaceParam
      && !tasks.some((item) => item.id === selectedEntityParam)
    ) {
      return
    }

    // Guard: the URL kind just transitioned to 'project' in this render (React Router
    // defers navigate() via startTransition, so the URL change can land in a separate
    // render from the synchronous state updates in handleSelectProjectFromTree).
    // In that gap, "Sync workspace-section" may revert activeSection back to the old
    // section before "Sync project" has had a chance to advance it to 'tasks'/'dashboard'.
    // Without this guard, state→URL would compute the old section URL and navigate back,
    // creating the notes ↔ project oscillation loop.  Hold off for exactly one render
    // and let the "Sync project" effect update activeSection first.
    if (kindChangedThisRender && parsedWorkhubPath.kind === 'project') return

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
        : (activeSection === 'tasks'
          ? selectedTaskIdSnapshot
          : ''))
    const prevEntityId = prevSelectedEntityIdRef.current
    prevSelectedEntityIdRef.current = expectedEntityParam
    const entityChangedThisRender = prevEntityId !== expectedEntityParam

    // On refresh/back-forward (POP), when the URL already targets a concrete section
    // for the currently-selected workspace, let URL→state hydration apply first.
    // Without this, the default in-memory section ('dashboard') can win one render
    // and momentarily push a dashboard URL before snapping back.
    if (
      navigationType === 'POP'
      && selectedWorkspaceParam
      && selectedWorkspaceId === selectedWorkspaceParam
      && !!selectedSectionParam
      && activeSection !== selectedSectionParam
      && !sectionChangedThisRender
    ) {
      return
    }

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

    // Guard against stale entity state overwriting the URL in either direction:
    // – URL has entity X but state still says entity Y (race after URL-led navigation)
    // – URL has NO entity but state still holds a stale entity from the previous
    //   workspace (this is the common workspace-switch case where navigate() fires
    //   with the remembered route before URL→state sync has had a chance to clear
    //   the old entity out of state). Without this guard the stale entity is silently
    //   appended to the new workspace URL, corrupting the persisted route memory.
    if (
      expectedEntityParam !== selectedEntityParam
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
        : (targetSection === 'tasks'
          ? selectedTaskIdSnapshot
          : ''))
    let newPath = buildWorkhubPathname(selectedWorkspaceId, targetProject, targetSection, targetEntityId)

    if (!parsedWorkhubPath.wsId) {
      if (parsedWorkhubPath.section === 'users') {
        newPath = buildWorkhubPathname(selectedWorkspaceId, targetProject, 'users')
      } else {
        const rememberedRoute = resolveRememberedWorkspaceRoute(selectedWorkspaceId)
        if (rememberedRoute) {
          newPath = rememberedRoute
        }
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
    parsedWorkhubPath.kind,
    parsedWorkhubPath.source,
    parsedWorkhubPath.wsId,
    selectedDocumentId,
    selectedEntityParam,
    selectedMoodBoardId,
    selectedNoteProjectId,
    selectedProjectId,
    selectedProjectParam,
    selectedSectionParam,
    selectedTaskIdSnapshot,
    selectedWorkspaceId,
    selectedWorkspaceParam,
    workspaceMoodBoardsLoaded,
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
    if (!shouldResetSelectedProjectAfterHydration({
      selectedProjectId,
      projectsFeedHydrated,
      isSelectedProjectVisible: visibleWorkspaceProjects.some((item) => item.id === selectedProjectId),
    })) return
    setSelectedProjectId('all')
  }, [projectsFeedHydrated, selectedProjectId, visibleWorkspaceProjects])

  useEffect(() => {
    if (!selectedProjectId || selectedProjectId === 'all') return
    const lineage = collectProjectLineage(selectedProjectId, visibleProjectById)
    if (lineage.length === 0) return
    setExpandedProjectIds((current) => Array.from(new Set([...current, ...lineage])))
  }, [selectedProjectId, visibleProjectById])

  useEffect(() => {
    if (!selectedWorkspaceId) {
      expandedProjectInitWorkspaceRef.current = ''
      setExpandedProjectIds([])
      return
    }

    if (expandedProjectInitWorkspaceRef.current === selectedWorkspaceId) {
      return
    }

    if (!projectsFeedHydrated) {
      return
    }

    if (visibleProjectTree.length === 0) {
      setExpandedProjectIds([])
      expandedProjectInitWorkspaceRef.current = selectedWorkspaceId
      return
    }

    const savedMap = readExpandedProjectsByWorkspaceMap()
    if (Object.prototype.hasOwnProperty.call(savedMap, selectedWorkspaceId)) {
      const savedExpandedIds = savedMap[selectedWorkspaceId] || []
      const visibleProjectIdSet = new Set(visibleWorkspaceProjects.map((item) => item.id))
      const nextExpandedIds = savedExpandedIds.filter((id) => visibleProjectIdSet.has(id))
      setExpandedProjectIds(nextExpandedIds)
      expandedProjectInitWorkspaceRef.current = selectedWorkspaceId
      return
    }

    const defaultExpandedIds = visibleProjectTree
      .map((item) => item.id)
      .filter((id) => !defaultCollapsedClosedRootIds.includes(id))
    setExpandedProjectIds(defaultExpandedIds)
    expandedProjectInitWorkspaceRef.current = selectedWorkspaceId
  }, [defaultCollapsedClosedRootIds, projectsFeedHydrated, selectedWorkspaceId, visibleProjectTree, visibleWorkspaceProjects])

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
    if (!workspaceMoodBoardsLoaded) return
    if (workspaceMoodBoards.some((item) => item.id === selectedMoodBoardId)) return
    if (activeSection === 'moodboard') {
      setActiveSection('dashboard')
    }
    setSelectedMoodBoardId('')
  }, [activeSection, selectedMoodBoardId, workspaceMoodBoards, workspaceMoodBoardsLoaded])

  useEffect(() => {
    if (!selectedWorkspaceId || !workspaceMoodBoardsLoaded) return
    if (moodBoardLegacyPurgeWorkspaceIdsRef.current.has(selectedWorkspaceId)) return
    moodBoardLegacyPurgeWorkspaceIdsRef.current.add(selectedWorkspaceId)

    const legacyBoards = workspaceMoodBoards.filter((item) => item.panelVariant === 'v2')
    if (!legacyBoards.length) return

    const legacyBoardIds = new Set(legacyBoards.map((item) => item.id))
    if (selectedMoodBoardId && legacyBoardIds.has(selectedMoodBoardId)) {
      setSelectedMoodBoardId('')
      if (activeSection === 'moodboard') {
        setActiveSection('dashboard')
      }
    }

    void (async () => {
      const results = await Promise.allSettled(legacyBoards.map((item) => deleteWorkhubMoodBoard(item.id)))
      const failedCount = results.filter((result) => result.status === 'rejected').length
      const deletedCount = legacyBoards.length - failedCount

      if (deletedCount > 0 && failedCount === 0) {
        showToast({
          type: 'info',
          message: `Deleted ${deletedCount} old mood board${deletedCount === 1 ? '' : 's'} from this workspace.`,
        })
      } else if (failedCount > 0) {
        showToast({
          type: 'warning',
          message: `Deleted ${Math.max(deletedCount, 0)} old mood board${deletedCount === 1 ? '' : 's'}, but ${failedCount} failed to delete.`,
        })
      }
    })()
  }, [activeSection, selectedMoodBoardId, selectedWorkspaceId, showToast, workspaceMoodBoards, workspaceMoodBoardsLoaded])

  useEffect(() => {
    if (selectedAssigneeUid === 'all') return
    if (scopeAssignableMemberUidSet.has(selectedAssigneeUid)) return
    setSelectedAssigneeUid('all')
  }, [scopeAssignableMemberUidSet, selectedAssigneeUid])

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
    setSettingsProjectMainPanelView(
      selectedAccessProject.intent === 'hr_employee_profile' && selectedAccessProject.mainPanelView === 'tasks'
        ? 'dashboard_with_details'
        : (selectedAccessProject.mainPanelView || 'tasks'),
    )
    setSettingsProjectTaskItemDisplayMode(selectedAccessProject.taskItemDisplayMode || 'inherit')
    setSettingsProjectTaskStatuses(
      Array.isArray(selectedAccessProject.taskStatuses) && selectedAccessProject.taskStatuses.length > 0
        ? selectedAccessProject.taskStatuses.map((s) => ({ ...s }))
        : null,
    )
    setSettingsProjectClientId(selectedAccessProject.clientId || '')
    setSettingsStorageMethod(selectedAccessProject.storageMethod || 'firebase')
    setAccessVisibility(selectedAccessProject.visibility || 'workspace')
    setAccessMemberUids(normalizeMemberUids(selectedAccessProject.memberUids || []).filter((uid) => selectedAccessProjectRestrictedMemberUidSet.has(uid)))
    setSettingsProjectCreateDeliveryFolder(false)
  }, [selectedAccessProject, selectedAccessProjectRestrictedMemberUidSet])

  useEffect(() => {
    if (!selectedAccessProject?.id || !selectedWorkspaceId || !currentUid) {
      setSettingsProjectFolderNotifications(DEFAULT_WORKHUB_FOLDER_NOTIFICATION_SETTINGS)
      return
    }
    return subscribeWorkhubProjectNotificationPreference(selectedAccessProject.id, currentUid, (item) => {
      if (!item) {
        setSettingsProjectFolderNotifications(DEFAULT_WORKHUB_FOLDER_NOTIFICATION_SETTINGS)
        return
      }
      setSettingsProjectFolderNotifications(normalizeFolderNotificationSettings(item))
    })
  }, [currentUid, selectedAccessProject?.id, selectedWorkspaceId])

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
    setProjectMemberUids((current) => {
      const next = normalizeMemberUids(current).filter((uid) => createRestrictedMemberUidSet.has(uid))
      if (next.length === current.length && next.every((uid, index) => uid === current[index])) {
        return current
      }
      return next
    })
  }, [createRestrictedMemberUidSet])

  useEffect(() => {
    setAccessMemberUids((current) => {
      const next = normalizeMemberUids(current).filter((uid) => selectedAccessProjectRestrictedMemberUidSet.has(uid))
      if (next.length === current.length && next.every((uid, index) => uid === current[index])) {
        return current
      }
      return next
    })
  }, [selectedAccessProjectRestrictedMemberUidSet])

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

  function normalizeClientNameKey(value: string) {
    return value.trim().toLocaleLowerCase().replace(/\s+/g, ' ')
  }

  async function handleCreateClientInline(name: string, preset?: Partial<WorkhubClient>, workspaceIdOverride?: string) {
    const targetWorkspaceId = workspaceIdOverride || selectedWorkspaceId
    if (!auth.currentUser || !targetWorkspaceId) return null
    const trimmedName = name.trim()
    if (!trimmedName) {
      showToast({ type: 'error', message: 'Client name is required.' })
      return null
    }
    const normalizedName = normalizeClientNameKey(trimmedName)
    const existingClient = clients.find((item) => item.workspaceId === targetWorkspaceId && normalizeClientNameKey(item.name) === normalizedName)
    if (existingClient) {
      showToast({ type: 'error', message: 'A client with this name already exists.' })
      return existingClient.id
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
    const selectedClient = clients.find((item) => item.id === selectedClientId) || null
    if (selectedClient) {
      const normalizedName = normalizeClientNameKey(trimmedName)
      const duplicateClient = clients.find(
        (item) => item.id !== selectedClientId
          && item.workspaceId === selectedClient.workspaceId
          && normalizeClientNameKey(item.name) === normalizedName,
      )
      if (duplicateClient) {
        showToast({ type: 'error', message: 'A client with this name already exists.' })
        return
      }
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
    const shouldKeepOpen = options?.keepDialogOpen === true || !closeProjectAfterCreate
    const currentParentId = projectParentId
    const requestedVisibility = isWorkhubAdmin ? projectVisibility : 'workspace'
    const requestedMemberUids = requestedVisibility === 'restricted'
      ? normalizeMemberUids(projectMemberUids.filter((uid) => createRestrictedMemberUidSet.has(uid)))
      : []
    const inheritedAccess = resolveInheritedProjectAccess(
      currentParentId || null,
      auth.currentUser.uid,
      requestedVisibility,
      requestedMemberUids,
    )
    const visibility = inheritedAccess.visibility
    const memberUids = visibility === 'restricted' ? inheritedAccess.memberUids : []
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
        visibility,
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
        visibility,
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

  const handleSaveProjectFolderNotificationSettings = useCallback(async (patch: Partial<WorkhubFolderNotificationSettings>) => {
    if (!currentUid || !selectedWorkspaceId || !selectedAccessProject) return
    const previousSettings = settingsProjectFolderNotifications
    const nextSettings = normalizeFolderNotificationSettings({
      ...settingsProjectFolderNotifications,
      ...patch,
    })
    setSettingsProjectFolderNotifications(nextSettings)
    setSettingsProjectFolderNotificationsBusy(true)
    try {
      await saveWorkhubProjectNotificationPreference({
        workspaceId: selectedWorkspaceId,
        projectId: selectedAccessProject.id,
        userUid: currentUid,
        enabled: nextSettings.enabled,
        taskCreated: nextSettings.taskCreated,
        taskCompleted: nextSettings.taskCompleted,
        folderCompleted: nextSettings.folderCompleted,
        delivery: nextSettings.delivery,
      })
      showToast({ type: 'success', message: 'Folder notification preferences updated.' })
    } catch (error) {
      setSettingsProjectFolderNotifications(previousSettings)
      const message = error instanceof Error ? error.message : 'Could not save folder notification preferences.'
      showToast({ type: 'error', message })
    } finally {
      setSettingsProjectFolderNotificationsBusy(false)
    }
  }, [currentUid, selectedWorkspaceId, selectedAccessProject, settingsProjectFolderNotifications, showToast])

  const isTaskStatusCompletedForProject = useCallback((projectId: string, statusId: string) => {
    const statusPool = effectiveStatusesByProjectId.get(projectId) || workspaceTaskStatuses
    const statusMeta = statusPool.find((item) => item.id === statusId)
    const token = `${statusId} ${statusMeta?.label || ''}`.toLowerCase()
    return token.includes('done') || token.includes('complete') || token.includes('closed')
  }, [effectiveStatusesByProjectId, workspaceTaskStatuses])

  const resolveFolderCompletionProgress = useCallback((projectId: string, taskList: WorkhubTask[]) => {
    const branchProjectIds = collectProjectBranchIds(projectId, visibleProjectsByParent)
    let done = 0
    let total = 0
    taskList.forEach((item) => {
      if (!branchProjectIds.has(item.projectId)) return
      total += 1
      if (isTaskStatusCompletedForProject(item.projectId, item.status)) done += 1
    })
    return { done, total }
  }, [isTaskStatusCompletedForProject, visibleProjectsByParent])

  const resolveFolderNotificationRecipients = useCallback(async (project: WorkhubProject, eventType: WorkhubFolderNotificationEvent) => {
    const prefs = await listWorkhubProjectNotificationPreferences(project.id)
    if (prefs.length === 0) {
      return { inAppOnly: [] as string[], withEmail: [] as string[] }
    }

    const allowedUidSet = new Set(approvedMembers.map((member) => member.uid))
    if (project.visibility === 'restricted') {
      const projectUidSet = new Set(normalizeMemberUids([...(project.memberUids || []), project.createdBy]))
      Array.from(allowedUidSet).forEach((uid) => {
        if (!projectUidSet.has(uid)) allowedUidSet.delete(uid)
      })
    }

    const inAppOnly: string[] = []
    const withEmail: string[] = []
    prefs.forEach((pref) => {
      if (!allowedUidSet.has(pref.userUid)) return
      const settings = normalizeFolderNotificationSettings(pref)
      if (!settings.enabled) return
      const includeForEvent = eventType === 'task_created'
        ? settings.taskCreated
        : eventType === 'task_completed'
          ? settings.taskCompleted
          : settings.folderCompleted
      if (!includeForEvent) return
      if (settings.delivery === 'both') {
        withEmail.push(pref.userUid)
      } else {
        inAppOnly.push(pref.userUid)
      }
    })

    return {
      inAppOnly: Array.from(new Set(inAppOnly)),
      withEmail: Array.from(new Set(withEmail)),
    }
  }, [approvedMembers])

  const sendFolderEventNotifications = useCallback(async (params: {
    project: WorkhubProject
    eventType: WorkhubFolderNotificationEvent
    entityId: string
    action: string
    message: string
  }) => {
    if (!auth.currentUser) return
    try {
      const recipients = await resolveFolderNotificationRecipients(params.project, params.eventType)
      await Promise.all([
        recipients.inAppOnly.length > 0
          ? createWorkhubNotifications({
              workspaceId: params.project.workspaceId,
              actorUid: auth.currentUser.uid,
              recipientUids: recipients.inAppOnly,
              entityType: 'project',
              entityId: params.entityId,
              projectId: params.project.id,
              action: params.action,
              message: params.message,
              delivery: 'in_app',
            })
          : Promise.resolve(),
        recipients.withEmail.length > 0
          ? createWorkhubNotifications({
              workspaceId: params.project.workspaceId,
              actorUid: auth.currentUser.uid,
              recipientUids: recipients.withEmail,
              entityType: 'project',
              entityId: params.entityId,
              projectId: params.project.id,
              action: params.action,
              message: params.message,
              delivery: 'both',
            })
          : Promise.resolve(),
      ])
    } catch (error) {
      console.error('Failed to send folder event notifications:', error)
    }
  }, [resolveFolderNotificationRecipients])

  async function handleCreateTask() {
    if (!auth.currentUser || !selectedWorkspaceId) return
    const titles = splitTaskTitles(taskTitle)
    if (titles.length === 0) {
      showToast({ type: 'error', message: 'Task title is required.' })
      return
    }
    if (!visibleWorkspaceProjects[0] && selectedProjectId === 'all') {
      const firstEntityLabel = selectedWorkspaceTemplateId === 'hr' ? 'organization unit' : 'project'
      showToast({ type: 'error', message: `Create an ${firstEntityLabel} first.` })
      return
    }
    const targetProject = selectedProjectId !== 'all'
      ? visibleProjectById[selectedProjectId] || null
      : selectedNoteProject || visibleWorkspaceProjects[0] || null
    const targetProjectId = targetProject?.id || ''
    if (!targetProjectId) {
      showToast({ type: 'error', message: 'Pick a folder or organization unit for the task.' })
      return
    }
    const targetIntent = projectIntentById[targetProjectId] || 'project'
    if (!canCreateTasksForIntent(targetIntent)) {
      showToast({ type: 'warning', message: 'Employee profiles are records only. Tasks are disabled for employee profiles.' })
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
          assigneeUids: [assigneeUid],
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
        const createRecipients = normalizeMemberUids(
          initialTaskNotifyMode === 'selected'
            ? initialTaskNotifyUids
            : [...(targetProject?.memberUids || []), assigneeUid],
        ).filter((uid) => uid !== auth.currentUser?.uid)
        if (createRecipients.length > 0) {
          await createWorkhubNotifications({
            workspaceId: selectedWorkspaceId,
            actorUid: auth.currentUser.uid,
            recipientUids: createRecipients,
            entityType: 'task',
            entityId: taskId,
            action: 'task_created',
            message: `created task "${normalizeTaskTitle(title) || 'Untitled task'}"`,
          })
        }
        if (targetProject) {
          await sendFolderEventNotifications({
            project: targetProject,
            eventType: 'task_created',
            entityId: targetProject.id,
            action: 'folder_task_created',
            message: `created task "${normalizeTaskTitle(title) || 'Untitled task'}" in folder "${targetProject.name}"`,
          })
        }
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
          assigneeUids: [assigneeUid],
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
        const createRecipients = normalizeMemberUids(
          initialTaskNotifyMode === 'selected'
            ? initialTaskNotifyUids
            : [...(targetProject.memberUids || []), assigneeUid],
        ).filter((uid) => uid !== auth.currentUser?.uid)
        if (createRecipients.length > 0) {
          await createWorkhubNotifications({
            workspaceId: selectedWorkspaceId,
            actorUid: auth.currentUser.uid,
            recipientUids: createRecipients,
            entityType: 'task',
            entityId: taskId,
            action: 'task_created',
            message: `created task "${normalizeTaskTitle(title) || 'Untitled task'}"`,
          })
        }
        await sendFolderEventNotifications({
          project: targetProject,
          eventType: 'task_created',
          entityId: targetProject.id,
          action: 'folder_task_created',
          message: `created task "${normalizeTaskTitle(title) || 'Untitled task'}" in folder "${targetProject.name}"`,
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
    const allowedAssignees = assignableMembersByProjectId[task.projectId] || workspaceAssignableMembers
    const allowedAssigneeUidSet = new Set(allowedAssignees.map((item) => item.uid))
    if (typeof updates.assigneeUid === 'string' && updates.assigneeUid !== task.assigneeUid && updates.assigneeUid && !isPrivilegedMember) {
      if (!allowedAssigneeUidSet.has(updates.assigneeUid)) {
        showToast({ type: 'error', message: 'Assignee must be a member of this project.' })
        return
      }
    }
    if (Array.isArray(updates.assigneeUids) && !isPrivilegedMember) {
      const hasInvalidAssignee = updates.assigneeUids.some((uid) => !allowedAssigneeUidSet.has(uid))
      if (hasInvalidAssignee) {
        showToast({ type: 'error', message: 'All assignees must be members of this project.' })
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

    const resolveTaskEventNotificationRecipients = (baseTask: WorkhubTask, patch: Partial<WorkhubTask>) => {
      const effectiveTask = { ...baseTask, ...patch }
      const assigneePool = normalizeMemberUids([
        ...(effectiveTask.assigneeUids || []),
        effectiveTask.assigneeUid,
      ])
      const candidatePool = normalizeMemberUids([
        ...(effectiveTask.memberUids || []),
        effectiveTask.createdBy,
        ...assigneePool,
      ])
      const mode = effectiveTask.notifyMode || 'all'
      if (mode === 'none') return [] as string[]
      if (mode === 'selected') {
        const selectedPool = normalizeMemberUids(Array.isArray(effectiveTask.notifyUids) ? effectiveTask.notifyUids : [])
        return selectedPool.filter((uid) => candidatePool.includes(uid) && uid !== auth.currentUser?.uid)
      }
      return candidatePool.filter((uid) => uid !== auth.currentUser?.uid)
    }
    try {
      await updateWorkhubTask(task.id, nextUpdates)
      const statusChanged = typeof updates.status === 'string' && updates.status !== task.status
      const targetProject = visibleProjectById[task.projectId] || null
      if (statusChanged && targetProject) {
        const previousCompleted = isTaskStatusCompletedForProject(task.projectId, task.status)
        const nextCompleted = isTaskStatusCompletedForProject(task.projectId, updates.status as string)
        if (!previousCompleted && nextCompleted) {
          const nextTaskTitle = typeof updates.title === 'string' && updates.title.trim()
            ? updates.title.trim()
            : task.title
          const nextTaskList = tasks.map((item) => (item.id === task.id ? { ...item, ...nextUpdates } : item))
          const previousFolderProgress = resolveFolderCompletionProgress(targetProject.id, tasks)
          const nextFolderProgress = resolveFolderCompletionProgress(targetProject.id, nextTaskList)

          await sendFolderEventNotifications({
            project: targetProject,
            eventType: 'task_completed',
            entityId: targetProject.id,
            action: 'folder_task_completed',
            message: `completed task "${normalizeTaskTitle(nextTaskTitle) || 'Untitled task'}" in folder "${targetProject.name}"`,
          })

          const folderJustCompleted = previousFolderProgress.total > 0
            && nextFolderProgress.total > 0
            && previousFolderProgress.done < previousFolderProgress.total
            && nextFolderProgress.done >= nextFolderProgress.total
          if (folderJustCompleted) {
            await sendFolderEventNotifications({
              project: targetProject,
              eventType: 'folder_completed',
              entityId: targetProject.id,
              action: 'folder_completed',
              message: `folder "${targetProject.name}" reached 100% task completion`,
            })
          }
        }
      }
      const changedLabels: string[] = []
      const normalizeStringList = (value: unknown): string[] => (
        Array.isArray(value)
          ? value
            .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
            .filter(Boolean)
            .sort()
          : []
      )
      const areStringListsEqual = (left: string[], right: string[]) => (
        left.length === right.length && left.every((entry, index) => entry === right[index])
      )

      if (typeof updates.status === 'string' && updates.status !== task.status) changedLabels.push('status')
      if (typeof updates.priority === 'string' && updates.priority !== task.priority) changedLabels.push('priority')
      if (typeof updates.assigneeUid === 'string' && updates.assigneeUid !== task.assigneeUid) changedLabels.push('assignee')
      if (Array.isArray(updates.assigneeUids)) changedLabels.push('assignees')
      if (typeof updates.startDate === 'string' && updates.startDate !== task.startDate) changedLabels.push('start date')
      if (typeof updates.dueDate === 'string' && updates.dueDate !== task.dueDate) changedLabels.push('due date')
      if (typeof updates.dueTime === 'string' && updates.dueTime !== (task.dueTime || '')) changedLabels.push('due time')
      if (typeof updates.title === 'string' && updates.title.trim() !== task.title.trim()) changedLabels.push('title')
      if (typeof updates.description === 'string' && updates.description.trim() !== (task.description || '').trim()) changedLabels.push('description')
      if (Object.prototype.hasOwnProperty.call(updates, 'attachments')) {
        const previousAttachments = normalizeStringList(task.attachments)
        const nextAttachments = normalizeStringList(updates.attachments)
        if (!areStringListsEqual(previousAttachments, nextAttachments)) changedLabels.push('attachments')
      }
      if (Object.prototype.hasOwnProperty.call(updates, 'links')) {
        const previousLinks = normalizeStringList(task.links)
        const nextLinks = normalizeStringList(updates.links)
        if (!areStringListsEqual(previousLinks, nextLinks)) changedLabels.push('links')
      }

      const previousAttachments = normalizeStringList(task.attachments)
      const nextAttachments = Object.prototype.hasOwnProperty.call(updates, 'attachments')
        ? normalizeStringList(updates.attachments)
        : previousAttachments
      const addedAttachmentsCount = nextAttachments.filter((item) => !previousAttachments.includes(item)).length
      const removedAttachmentsCount = previousAttachments.filter((item) => !nextAttachments.includes(item)).length

      const previousLinks = normalizeStringList(task.links)
      const nextLinks = Object.prototype.hasOwnProperty.call(updates, 'links')
        ? normalizeStringList(updates.links)
        : previousLinks
      const addedLinksCount = nextLinks.filter((item) => !previousLinks.includes(item)).length
      const removedLinksCount = previousLinks.filter((item) => !nextLinks.includes(item)).length

      const previousChecklist = buildChecklist(task)
      const nextChecklist = Array.isArray(updates.checklist) ? updates.checklist : previousChecklist
      const previousChecklistById = new Map(previousChecklist.map((item) => [item.id, item]))
      const createdChecklistCount = nextChecklist.filter((item) => !previousChecklistById.has(item.id)).length
      const completedChecklistCount = nextChecklist.filter((item) => {
        const previous = previousChecklistById.get(item.id)
        return !!previous && !previous.completed && !!item.completed
      }).length

      const eventFragments: string[] = []
      if (changedLabels.includes('status')) eventFragments.push('status changed')
      if (changedLabels.includes('priority')) eventFragments.push('priority changed')
      if (changedLabels.includes('assignee') || changedLabels.includes('assignees')) eventFragments.push('assignees updated')
      if (changedLabels.includes('due date') || changedLabels.includes('due time')) eventFragments.push('due schedule updated')
      if (changedLabels.includes('title')) eventFragments.push('title updated')
      if (changedLabels.includes('description')) eventFragments.push('description updated')
      if (addedAttachmentsCount > 0) {
        eventFragments.push(`attachment${addedAttachmentsCount === 1 ? '' : 's'} added`)
      }
      if (removedAttachmentsCount > 0) {
        eventFragments.push(`attachment${removedAttachmentsCount === 1 ? '' : 's'} removed`)
      }
      if (changedLabels.includes('attachments') && addedAttachmentsCount === 0 && removedAttachmentsCount === 0) {
        eventFragments.push('attachments updated')
      }
      if (addedLinksCount > 0) {
        eventFragments.push(`link${addedLinksCount === 1 ? '' : 's'} added`)
      }
      if (removedLinksCount > 0) {
        eventFragments.push(`link${removedLinksCount === 1 ? '' : 's'} removed`)
      }
      if (changedLabels.includes('links') && addedLinksCount === 0 && removedLinksCount === 0) {
        eventFragments.push('links updated')
      }
      if (createdChecklistCount > 0) {
        eventFragments.push(`checklist item${createdChecklistCount === 1 ? '' : 's'} added`)
      }
      if (completedChecklistCount > 0) {
        eventFragments.push(`checklist item${completedChecklistCount === 1 ? '' : 's'} completed`)
      }

      if (changedLabels.length > 0 && selectedWorkspaceId) {
        const recipients = resolveTaskEventNotificationRecipients(task, nextUpdates)
        if (recipients.length > 0 && eventFragments.length > 0) {
          await createWorkhubNotifications({
            workspaceId: selectedWorkspaceId,
            actorUid: auth.currentUser.uid,
            recipientUids: recipients,
            entityType: 'task',
            entityId: task.id,
            action: 'task_update',
            message: `updated task "${normalizeTaskTitle(task.title || '') || 'Untitled task'}": ${eventFragments.join(', ')}`,
          })
        }
      } else if (selectedWorkspaceId && eventFragments.length > 0) {
        const recipients = resolveTaskEventNotificationRecipients(task, nextUpdates)
        if (recipients.length > 0) {
          await createWorkhubNotifications({
            workspaceId: selectedWorkspaceId,
            actorUid: auth.currentUser.uid,
            recipientUids: recipients,
            entityType: 'task',
            entityId: task.id,
            action: 'task_update',
            message: `updated task "${normalizeTaskTitle(task.title || '') || 'Untitled task'}": ${eventFragments.join(', ')}`,
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
    setBulkAssigneeMenuOpen(false)
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

  async function handleBulkAssigneeChange(uids: string[]) {
    if (!auth.currentUser || !selectedWorkspaceId || selectedTasks.length === 0) return
    const normalized = Array.from(new Set(uids.filter(Boolean)))
    setBusyKey('bulk-task')
    try {
      await Promise.all(selectedTasks.map((task) => {
        const validUidSet = new Set((assignableMembersByProjectId[task.projectId] || workspaceAssignableMembers).map((member) => member.uid))
        const nextTaskAssigneeUids = normalized.filter((uid) => validUidSet.has(uid))
        return updateWorkhubTask(task.id, {
          assigneeUid: nextTaskAssigneeUids[0] || '',
          assigneeUids: nextTaskAssigneeUids.length > 0 ? nextTaskAssigneeUids : undefined,
        })
      }))
      await createWorkhubActivity({
        workspaceId: selectedWorkspaceId,
        actorUid: auth.currentUser.uid,
        entityType: 'task',
        entityId: selectedTasks[0].id,
        action: 'bulk_assignee_update',
        message: `Updated assignees for ${selectedTasks.length} task${selectedTasks.length === 1 ? '' : 's'}`,
      })
      showToast({ type: 'success', message: `Updated assignees for ${selectedTasks.length} task${selectedTasks.length === 1 ? '' : 's'}.` })
      setBulkAssigneeMenuOpen(false)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not update assignees for selected tasks.'
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

  async function persistDiscussionComment(
    target: {
      entityType: 'task' | 'project' | 'document'
      entityId: string
      workspaceId: string
      label: string
      visibility: WorkhubVisibility
      memberUids: string[]
    },
    normalizedCommentBody: string,
    notificationRecipientUids: string[],
  ) {
    await addWorkhubComment({
      workspaceId: target.workspaceId,
      entityType: target.entityType,
      entityId: target.entityId,
      authorUid: auth.currentUser!.uid,
      body: normalizedCommentBody,
    })
    await createWorkhubActivity({
      workspaceId: target.workspaceId,
      actorUid: auth.currentUser!.uid,
      entityType: 'comment',
      entityId: target.entityId,
      action: 'comment',
      message: `Commented on ${target.label}`,
      visibility: target.visibility,
      memberUids: target.memberUids,
    })
    if (notificationRecipientUids.length > 0) {
      await createWorkhubNotifications({
        workspaceId: target.workspaceId,
        actorUid: auth.currentUser!.uid,
        recipientUids: notificationRecipientUids,
        entityType: target.entityType === 'task' ? 'comment' : target.entityType,
        entityId: target.entityId,
        action: 'comment',
        message: `commented on "${target.label}": ${normalizedCommentBody.slice(0, 88)}${normalizedCommentBody.length > 88 ? '…' : ''}`,
        commentPreview: normalizedCommentBody,
      })
    }
  }

  async function handleAddComment(nextCommentBody: string) {
    const normalizedCommentBody = nextCommentBody.trim()
    if (!auth.currentUser || !selectedDiscussionTarget || !normalizedCommentBody) return
    setBusyKey('comment')
    try {
      await persistDiscussionComment(selectedDiscussionTarget, normalizedCommentBody, resolveDiscussionNotificationRecipients())
      showToast({ type: 'success', message: 'Comment added.' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not add comment.'
      showToast({ type: 'error', message })
    } finally {
      setBusyKey('')
    }
  }

  async function handleAddTaskComment(task: WorkhubTask, nextCommentBody: string, notificationRecipientUids: string[]) {
    const normalizedCommentBody = nextCommentBody.trim()
    if (!auth.currentUser || !normalizedCommentBody) return
    setBusyKey('comment')
    try {
      const target = {
        entityType: 'task' as const,
        entityId: task.id,
        workspaceId: task.workspaceId,
        label: normalizeTaskTitle(task.title || '') || 'Untitled task',
        visibility: task.visibility,
        memberUids: task.memberUids,
      }
      await persistDiscussionComment(target, normalizedCommentBody, notificationRecipientUids)
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

  async function handleDeleteComment(comment: WorkhubTaskComment) {
    const currentUid = auth.currentUser?.uid || ''
    if (!currentUid || comment.authorUid !== currentUid) return
    setBusyKey(`comment-delete:${comment.id}`)
    try {
      await deleteWorkhubComment(comment.id)
      if (editingCommentId === comment.id) {
        handleCancelCommentEdit()
      }
      showToast({ type: 'success', message: 'Comment deleted.' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not delete comment.'
      showToast({ type: 'error', message })
    } finally {
      setBusyKey('')
    }
  }

  // Memoised project-level discussion node — passed as a ReactNode prop to WorkhubTasksSection.
  // Handlers are stable (via _cbRef wrappers) so this memo only re-runs when discussion data changes.
  const projectDiscussionNode = useMemo(() => (
    <Suspense fallback={<div className="workhub-empty-state">Loading discussion…</div>}>
      <WorkhubDiscussionCardLazy
        comments={comments}
        currentUid={currentUid}
        memberByUid={memberByUid}
        showAuthorAvatar
        formatTime={formatTime}
        editingId={editingCommentId}
        editingText={editingCommentText}
        onEditStart={stableHandleStartCommentEdit}
        onEditChange={setEditingCommentText}
        onEditCancel={stableHandleCancelCommentEdit}
        onEditSave={stableHandleSaveCommentEdit}
        onDelete={stableHandleDeleteComment}
        editBusyKey={busyKey}
        deleteBusyKey={busyKey}
        onComposerSend={stableHandleAddComment}
        composerBusy={busyKey === 'comment'}
        notifyMode={discussionNotifyMode}
        notifyUids={discussionNotifyUids}
        notifyCandidates={discussionNotifyCandidates}
        onNotifyModeChange={setDiscussionNotifyMode}
        onNotifyUidsChange={setDiscussionNotifyUids}
        hasMoreOlderMessages={commentsHasMoreOlder}
        onLoadMoreOlderMessages={() => setCommentsFetchLimit((current) => current + WORKHUB_DISCUSSION_PAGE_SIZE)}
        threadKey={activeDiscussionEntityKey}
      />
    </Suspense>
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [comments, currentUid, memberByUid, editingCommentId, editingCommentText, busyKey,
      discussionNotifyMode, discussionNotifyUids, discussionNotifyCandidates])

  async function handleSaveMemberDisplayName(targetUid: string) {
    const targetMember = memberByUid[targetUid]
    if (!targetMember) return

    const targetEmail = (targetMember.email || '').trim().toLowerCase()
    if (normalizedMasterEmail && targetEmail === normalizedMasterEmail) {
      showToast({ type: 'error', message: 'Master account name cannot be changed.' })
      return
    }

    const draftValue = (memberNameDraftByUid[targetUid] ?? (targetMember.displayName || '')).trim()
    if (!draftValue) {
      showToast({ type: 'error', message: 'Display name cannot be empty.' })
      return
    }
    if (draftValue === (targetMember.displayName || '').trim()) return

    setBusyKey(`member-name:${targetUid}`)
    try {
      const updated = await updateWorkhubMemberProfile({ uid: targetUid, displayName: draftValue })
      setMemberNameDraftByUid((current) => ({
        ...current,
        [targetUid]: updated.displayName || draftValue,
      }))
      showToast({ type: 'success', message: 'Member name updated.' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not update member name.'
      showToast({ type: 'error', message })
    } finally {
      setBusyKey('')
    }
  }

  async function handleMemberModeration(targetUid: string, status: 'approved' | 'suspended', role?: 'member' | 'manager' | 'admin', reason = '') {
    const targetMember = memberByUid[targetUid]
    const targetEmail = (targetMember?.email || '').trim().toLowerCase()
    if (normalizedMasterEmail && targetEmail === normalizedMasterEmail) {
      showToast({ type: 'error', message: 'Master admin status cannot be changed.' })
      return
    }

    let suspensionReason = reason.trim()
    if (status === 'suspended' && !suspensionReason) {
      suspensionReason = (window.prompt('Suspension reason (required):', 'Access suspended by administrator.') || '').trim()
      if (!suspensionReason) {
        showToast({ type: 'info', message: 'Suspension cancelled: reason is required.' })
        return
      }
    }

    setBusyKey(`member:${targetUid}:${status}`)
    try {
      const updated = await setWorkhubMemberStatus({
        uid: targetUid,
        status,
        role,
        ...(status === 'suspended' ? { reason: suspensionReason } : {}),
      })
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
    const canManageFolderHiddenFromSupporters = !isFolderContainer || isWorkhubAdmin
    const requestedVisibility = canManageFolderHiddenFromSupporters
      ? accessVisibility
      : (selectedAccessProject.visibility || 'workspace')
    const requestedAccessMembers = canManageFolderHiddenFromSupporters
      ? normalizeMemberUids(accessMemberUids.filter((uid) => selectedAccessProjectRestrictedMemberUidSet.has(uid)))
      : normalizeMemberUids(selectedAccessProject.memberUids || [])
    const normalizedSettingsMainPanelView = selectedAccessProjectEffectiveIntent === 'hr_employee_profile' && settingsProjectMainPanelView === 'tasks'
      ? 'dashboard_with_details'
      : settingsProjectMainPanelView
    const resolvedAccess = resolveInheritedProjectAccess(
      settingsProjectParentId || null,
      selectedAccessProject.createdBy,
      requestedVisibility,
      requestedVisibility === 'restricted'
        ? (requestedAccessMembers.length > 0 ? requestedAccessMembers : [selectedAccessProject.createdBy])
        : [],
    )
    const nextVisibility = resolvedAccess.visibility
    const memberUids = nextVisibility === 'restricted' ? resolvedAccess.memberUids : []
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
      mainPanelView: normalizedSettingsMainPanelView,
      tenderNumber: settingsProjectTenderNumber.trim(),
      proposalId: settingsProjectProposalId.trim(),
      technicalProposalUrl: settingsTechnicalProposalUrl.trim(),
      financialProposalUrl: settingsFinancialProposalUrl.trim(),
      taskItemDisplayMode: isFolderContainer ? settingsProjectTaskItemDisplayMode : (selectedAccessProject.taskItemDisplayMode || 'inherit'),
      taskStatuses: settingsProjectTaskStatuses ?? [],
      clientId: settingsProjectClientId,
      storageMethod: settingsStorageMethod,
      visibility: nextVisibility,
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
        visibility: nextVisibility,
        memberUids,
      })
      if (isFolderContainer && nextVisibility === 'restricted') {
        await applyRestrictedAccessToProjectBranch(selectedAccessProject.id, memberUids)
      }
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

  async function handleQuickTaskViewModeChange(nextMode: 'list' | 'cards' | 'grid' | 'timeline') {
    const targetProject = quickTaskViewTargetProject
    const localUid = auth.currentUser?.uid || currentUid
    if (!localUid || !selectedWorkspaceId || !targetProject) return

    if ((targetProject.userPreferences?.[localUid]?.taskItemDisplayMode || taskItemDisplayMode) === nextMode) return

    const previousProjectsSnapshot = projects
    setProjects((current) => current.map((item) => (
      item.id === targetProject.id
        ? {
          ...item,
          userPreferences: {
            ...(item.userPreferences || {}),
            [localUid]: {
              ...(item.userPreferences?.[localUid] || {}),
              taskItemDisplayMode: nextMode,
            },
          },
        }
        : item
    )))
    setBusyKey(`task-view:${targetProject.id}`)

    try {
      await updateWorkhubProjectUserPreference(targetProject.id, localUid, { taskItemDisplayMode: nextMode })
    } catch (error) {
      setProjects(previousProjectsSnapshot)
      const message = error instanceof Error ? error.message : 'Could not change task view mode.'
      showToast({ type: 'error', message })
    } finally {
      setBusyKey('')
    }
  }

  useEffect(() => {
    const handleWindowKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || event.key !== 'F2') return

      const target = event.target as HTMLElement | null
      if (target) {
        const tagName = target.tagName
        if (
          target.isContentEditable
          || tagName === 'INPUT'
          || tagName === 'TEXTAREA'
          || tagName === 'SELECT'
        ) {
          return
        }
      }

      if (selectedDocumentId) {
        event.preventDefault()
        setPendingTreeInlineRename({ itemType: 'document', itemId: selectedDocumentId })
        return
      }

      if (selectedMoodBoardId) {
        event.preventDefault()
        setPendingTreeInlineRename({ itemType: 'moodboard', itemId: selectedMoodBoardId })
        return
      }

      if (selectedProjectId && selectedProjectId !== 'all') {
        event.preventDefault()
        setPendingTreeInlineRename({ itemType: 'project', itemId: selectedProjectId })
      }
    }

    window.addEventListener('keydown', handleWindowKeyDown)
    return () => {
      window.removeEventListener('keydown', handleWindowKeyDown)
    }
  }, [selectedDocumentId, selectedMoodBoardId, selectedProjectId])

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
    const effectiveProjectId = projectId || (selectedProjectId !== 'all' ? selectedProjectId : '')
    if (effectiveProjectId) {
      const intent = projectIntentById[effectiveProjectId] || 'project'
      if (!canCreateTasksForIntent(intent)) {
        showToast({ type: 'warning', message: 'Employee profiles are records only. Tasks are disabled for employee profiles.' })
        return
      }
    }
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
    setProjectVisibility('workspace')
    setProjectMemberUids([])
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
      case 'hr_department_unit':
        if (!requireField(draft.departmentCode, 'Department code is required.')) return
        break
      case 'hr_sub_department_unit':
        if (!requireField(draft.departmentCode, 'Sub-department code is required.')) return
        if (!requireField(draft.parentDepartment, 'Parent department is required.')) return
        break
      case 'hr_employee_profile':
        break
      case 'hr_leave_case':
        if (!requireField(draft.employeeId, 'Employee ID is required.')) return
        if (!requireField(draft.leaveType, 'Leave type is required.')) return
        if (!requireField(draft.approvalOwner, 'Approver is required.')) return
        if (!requireField(draft.startDate, 'Leave start date is required.')) return
        if (!requireField(draft.deadline, 'Return-to-work target is required.')) return
        break
      case 'hr_kpi_cycle':
        if (!requireField(draft.cycleOwner, 'Cycle owner is required.')) return
        if (!requireField(draft.department, 'Department is required.')) return
        if (!requireField(draft.primaryKpi, 'Primary KPI is required.')) return
        if (!requireField(draft.cadence, 'Review cadence is required.')) return
        if (!requireField(draft.startDate, 'Cycle start date is required.')) return
        if (!requireField(draft.deadline, 'Cycle close date is required.')) return
        break
      case 'hr_initiative_program':
        if (!requireField(draft.cycleOwner, 'Program owner is required.')) return
        if (!requireField(draft.programType, 'Program type is required.')) return
        if (!requireField(draft.cadence, 'Cadence is required.')) return
        break
      case 'hr_learning_certification':
        if (!requireField(draft.employeeId, 'Employee ID is required.')) return
        if (!requireField(draft.certificationName, 'Certification name is required.')) return
        if (!requireField(draft.certificationIssuer, 'Certification issuer is required.')) return
        if (!requireField(draft.deadline, 'Renewal / expiry date is required.')) return
        break
      default:
        break
    }

    if (draft.startDate.trim() && draft.deadline.trim() && isStartAfterEnd(draft.startDate.trim(), draft.deadline.trim())) {
      showToast({ type: 'error', message: getTemplateDateRangeValidationMessage(templateCreateIntent) })
      return
    }

    if (templateCreateIntent === 'hr_employee_profile' && draft.hireDate.trim() && draft.exitDate.trim() && isStartAfterEnd(draft.hireDate.trim(), draft.exitDate.trim())) {
      showToast({ type: 'error', message: 'Exit date cannot be earlier than hire date.' })
      return
    }

    const resolvedParentProjectId = templateCreateParentProjectId || (selectedProjectId !== 'all' ? selectedProjectId : '')

    if (templateCreateIntent === 'hr_sub_department_unit' && !resolvedParentProjectId) {
      showToast({ type: 'error', message: 'Sub-departments must be created under a department or organization unit.' })
      return
    }

    if (templateCreateIntent === 'hr_employee_profile') {
      if (!resolvedParentProjectId) {
        showToast({ type: 'error', message: 'Employee profiles must be created inside a department or sub-department.' })
        return
      }
      const parentProject = projects.find((item) => item.id === resolvedParentProjectId)
      const parentIntent = parentProject
        ? resolveEffectiveProjectIntent(parentProject, workspaceByIdForFiltering, selectedWorkspaceTemplateIntentSet)
        : 'project'
      if (!['hr_department_unit', 'hr_sub_department_unit'].includes(parentIntent)) {
        showToast({ type: 'error', message: 'Employee profiles can only be created under departments or sub-departments.' })
        return
      }
    }

    const intentMeta = getTemplateCreationIntentMeta(templateCreateIntent, selectedWorkspaceTemplateId)
    const projectType = intentMeta.defaults.projectType
    const employeeHierarchyDefaults = (() => {
      if (templateCreateIntent !== 'hr_employee_profile') return null
      const projectById = new Map(projects.map((item) => [item.id, item]))
      let department = ''
      let subDepartment = ''
      let managerEmployeeId = ''
      let cursor: string | null = resolvedParentProjectId || null
      while (cursor) {
        const node = projectById.get(cursor)
        if (!node) break
        const nodeIntent = resolveEffectiveProjectIntent(node, workspaceByIdForFiltering, selectedWorkspaceTemplateIntentSet)
        if (!managerEmployeeId) {
          managerEmployeeId = resolveSupervisorCandidateFromProject(node, nodeIntent)
        }
        if (!subDepartment && nodeIntent === 'hr_sub_department_unit') {
          subDepartment = node.name.trim()
          const subDepartmentDetails = splitTemplateDescriptionForIntent(nodeIntent, node.description || '').detailsByKey
          if (!department) department = (subDepartmentDetails['parent department'] || subDepartmentDetails.department || '').trim()
        }
        if (!department && nodeIntent === 'hr_department_unit') {
          department = node.name.trim()
        }
        cursor = node.parentProjectId || null
      }
      return { department, subDepartment, managerEmployeeId }
    })()

    if (templateCreateIntent === 'hr_employee_profile' && !employeeHierarchyDefaults?.department.trim()) {
      showToast({ type: 'error', message: 'Could not infer department from the selected parent. Move or create this profile under a department branch.' })
      return
    }

    const descriptionDraft = templateCreateIntent === 'hr_employee_profile' && employeeHierarchyDefaults
      ? {
          ...draft,
          department: employeeHierarchyDefaults.department,
          subDepartment: employeeHierarchyDefaults.subDepartment,
          managerEmployeeId: employeeHierarchyDefaults.managerEmployeeId || draft.managerEmployeeId,
        }
      : draft
    const description = buildTemplateCreationDescription(templateCreateIntent, descriptionDraft)
    const projectSubject = intentMeta.subjectLabel

    const inheritedAccess = resolveInheritedProjectAccess(
      resolvedParentProjectId || null,
      auth.currentUser.uid,
      'workspace',
      [],
    )

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
        visibility: inheritedAccess.visibility,
        memberUids: inheritedAccess.memberUids,
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
        ...(templateCreateIntent === 'hr_employee_profile' ? { mainPanelView: 'dashboard_with_details' as const } : {}),
      })

      await createWorkhubActivity({
        workspaceId: selectedWorkspaceId,
        actorUid: auth.currentUser.uid,
        entityType: 'project',
        entityId: projectId,
        action: 'create',
        message: `Created ${projectSubject} ${name}`,
        visibility: inheritedAccess.visibility,
        memberUids: inheritedAccess.memberUids,
      })

      ensureWorkhubDriveProjectFolder({ projectId, projectName: name }).catch((error) => {
        console.error('Failed to create drive folder:', error)
      })

      const workspaceName = (selectedWorkspace?.name || '').trim() || 'current workspace'
      setSelectedProjectId(projectId)
      setSelectedNoteProjectId(projectId)
      setActiveSection('home')
      closeTemplateCreateDialog()
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

  const handleSelectProjectFromTree = useCallback((projectId: string) => {
    handleSelectProject(projectId)
    if (!selectedWorkspaceId) return
    const nextSection = resolveProjectMainPanelSection ? resolveProjectMainPanelSection(projectId) : 'tasks'
    navigate(buildWorkhubPathname(selectedWorkspaceId, projectId, nextSection))
  }, [handleSelectProject, navigate, resolveProjectMainPanelSection, selectedWorkspaceId])

  const handleSelectDocumentTreeItem = useCallback((documentId: string) => {
    const document = workspaceDocumentById[documentId]
    if (!document) return
    const nextProjectId = document.projectId && visibleProjectIds.has(document.projectId)
      ? document.projectId
      : 'all'
    handleSelectDocumentFromTree(documentId)
    if (!selectedWorkspaceId) return
    navigate(buildWorkhubPathname(selectedWorkspaceId, nextProjectId, 'notes', documentId))
  }, [handleSelectDocumentFromTree, navigate, selectedWorkspaceId, visibleProjectIds, workspaceDocumentById])

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
    setMoodboardPanelMode(resolveMoodboardPanelMode(board?.panelVariant))
    setActiveSection('moodboard')
    setProjectsGroupExpanded(true)
    setSidebarCollapsed(false)
    closeActionMenu()
  }, [closeActionMenu, visibleProjectIds, workspaceMoodBoards, workspaceProjectById])

  const handleSelectMoodBoardTreeItem = useCallback((boardId: string) => {
    const board = workspaceMoodBoards.find((item) => item.id === boardId)
    if (!board) return
    const nextProjectId = board.entityType === 'project' && visibleProjectIds.has(board.entityId)
      ? board.entityId
      : 'all'
    handleSelectMoodBoardFromTree(boardId)
    if (!selectedWorkspaceId) return
    navigate(buildWorkhubPathname(selectedWorkspaceId, nextProjectId, 'moodboard', boardId))
  }, [handleSelectMoodBoardFromTree, navigate, selectedWorkspaceId, visibleProjectIds, workspaceMoodBoards])

  const openMoodBoardVariantForCurrentScope = useCallback(async (panelVariant: 'classic' | 'flow' | 'proscons') => {
    if (!selectedWorkspaceId) {
      showToast({ type: 'info', message: 'Select a workspace first.' })
      navigate('/workhub')
      return
    }

    const useProjectScope = selectedProjectId !== 'all' && visibleProjectIds.has(selectedProjectId)
    const entityType: 'workspace' | 'project' = useProjectScope ? 'project' : 'workspace'
    const entityId = useProjectScope ? selectedProjectId : selectedWorkspaceId

    const scopedBoards = workspaceMoodBoards.filter((board) => (
      board.entityType === entityType
      && board.entityId === entityId
    ))

    const purgedLegacyBoardIds = new Set<string>()
    if (panelVariant === 'classic') {
      const legacyBoards = scopedBoards.filter((board) => resolveMoodboardPanelMode(board.panelVariant) === 'v2')
      if (legacyBoards.length > 0) {
        await Promise.allSettled(legacyBoards.map((board) => deleteWorkhubMoodBoard(board.id)))
        legacyBoards.forEach((board) => purgedLegacyBoardIds.add(board.id))
      }
    }

    const matchingBoards = scopedBoards.filter((board) => (
      !purgedLegacyBoardIds.has(board.id)
      && resolveMoodboardPanelMode(board.panelVariant) === panelVariant
    ))

    let boardId = matchingBoards[0]?.id || ''

    if (!boardId) {
      const label = entityType === 'workspace'
        ? (selectedWorkspace?.name || 'Workspace')
        : (workspaceProjectById[entityId]?.name || 'Project')
      const nextTitle = panelVariant === 'flow'
        ? `${label} — Flow Project Plan`
        : panelVariant === 'proscons'
          ? `${label} — Pros & Cons`
          : `${label} — Mood Board`
      const targetProject = entityType === 'project' ? (workspaceProjectById[entityId] || null) : null
      const boardVisibility = targetProject?.visibility === 'restricted' ? 'restricted' : 'workspace'
      const boardMemberUids = boardVisibility === 'restricted'
        ? normalizeMemberUids(targetProject?.memberUids?.length ? targetProject.memberUids : [targetProject?.createdBy || currentUid])
        : []

      boardId = await createWorkhubMoodBoard({
        workspaceId: selectedWorkspaceId,
        entityType,
        entityId,
        title: nextTitle,
        panelVariant,
        visibility: boardVisibility,
        memberUids: boardMemberUids,
        createdBy: currentUid,
      })
    }

    if (entityType === 'project') {
      const lineage = collectProjectLineage(entityId, workspaceProjectById)
      if (lineage.length > 0) {
        setExpandedProjectIds((current) => Array.from(new Set([...current, ...lineage])))
      }
      setSelectedProjectId(entityId)
      setSelectedNoteProjectId(entityId)
    } else {
      setSelectedProjectId('all')
      setSelectedNoteProjectId('')
    }

    setSelectedMoodBoardId(boardId)
    setSelectedDocumentId('')
    setSelectedTaskId('')
    setMoodboardPanelMode(panelVariant)
    setActiveSection('moodboard')
    setProjectsGroupExpanded(true)
    setSidebarCollapsed(false)

    const projectRouteParam = entityType === 'project' ? entityId : 'all'
    const nextPath = buildWorkhubPathname(selectedWorkspaceId, projectRouteParam, 'moodboard', boardId)
    if (`${location.pathname}${location.search}` !== nextPath) {
      navigate(nextPath)
    }
  }, [
    currentUid,
    location.pathname,
    location.search,
    navigate,
    selectedProjectId,
    selectedWorkspace?.name,
    selectedWorkspaceId,
    showToast,
    visibleProjectIds,
    workspaceMoodBoards,
    workspaceProjectById,
  ])

  const createAndOpenMoodBoardVariantForEntity = useCallback(async (
    panelVariant: 'classic' | 'flow' | 'proscons',
    entityType: 'workspace' | 'project',
    entityId: string,
  ) => {
    if (!selectedWorkspaceId) {
      showToast({ type: 'info', message: 'Select a workspace first.' })
      return
    }

    const normalizedEntityId = entityType === 'workspace' ? selectedWorkspaceId : entityId
    if (entityType === 'project' && !normalizedEntityId) {
      showToast({ type: 'warning', message: 'Select a project first.' })
      return
    }

    const variantLabel = panelVariant === 'flow'
      ? 'Flow Project Plan'
      : panelVariant === 'proscons'
        ? 'Pros & Cons'
        : 'Mood Board'

    const label = entityType === 'workspace'
      ? (selectedWorkspace?.name || 'Workspace')
      : (workspaceProjectById[normalizedEntityId]?.name || 'Project')

    const existingCount = workspaceMoodBoards.filter((board) => (
      board.entityType === entityType
      && board.entityId === normalizedEntityId
      && resolveMoodboardPanelMode(board.panelVariant) === panelVariant
    )).length

    const nextTitle = existingCount === 0
      ? `${label} — ${variantLabel}`
      : `${label} — ${variantLabel} ${existingCount + 1}`
    const targetProject = entityType === 'project' ? (workspaceProjectById[normalizedEntityId] || null) : null
    const boardVisibility = targetProject?.visibility === 'restricted' ? 'restricted' : 'workspace'
    const boardMemberUids = boardVisibility === 'restricted'
      ? normalizeMemberUids(targetProject?.memberUids?.length ? targetProject.memberUids : [targetProject?.createdBy || currentUid])
      : []

    try {
      const newId = await createWorkhubMoodBoard({
        workspaceId: selectedWorkspaceId,
        entityType,
        entityId: normalizedEntityId,
        title: nextTitle,
        panelVariant,
        visibility: boardVisibility,
        memberUids: boardMemberUids,
        createdBy: currentUid,
      })

      if (entityType === 'project') {
        const lineage = collectProjectLineage(normalizedEntityId, workspaceProjectById)
        if (lineage.length > 0) {
          setExpandedProjectIds((current) => Array.from(new Set([...current, ...lineage])))
        }
        setSelectedProjectId(normalizedEntityId)
        setSelectedNoteProjectId(normalizedEntityId)
      } else {
        setSelectedProjectId('all')
        setSelectedNoteProjectId('')
      }

      setSelectedMoodBoardId(newId)
      setSelectedDocumentId('')
      setSelectedTaskId('')
      setMoodboardPanelMode(panelVariant)
      setActiveSection('moodboard')
      setProjectsGroupExpanded(true)
      setSidebarCollapsed(false)

      const projectRouteParam = entityType === 'project' ? normalizedEntityId : 'all'
      const nextPath = buildWorkhubPathname(selectedWorkspaceId, projectRouteParam, 'moodboard', newId)
      if (`${location.pathname}${location.search}` !== nextPath) {
        navigate(nextPath)
      }
    } catch (error) {
      console.error('Failed to create moodboard variant', error)
      showToast({ type: 'error', message: 'Could not create board. Please try again.' })
    }
  }, [
    currentUid,
    location.pathname,
    location.search,
    navigate,
    selectedWorkspace?.name,
    selectedWorkspaceId,
    showToast,
    workspaceMoodBoards,
    workspaceProjectById,
  ])

  const handleMobileMoodBoardSelect = useCallback((boardId: string) => {
    setGearMenuOpen(false)
    handleSelectMoodBoardFromTree(boardId)
    closeMobileWorkspacePanel()
  }, [handleSelectMoodBoardFromTree, closeMobileWorkspacePanel])

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
  _cbRef.current.handleBulkAssigneeChange = handleBulkAssigneeChange
  _cbRef.current.handleTaskReorder = handleTaskReorder
  _cbRef.current.handleQuickAddTask = handleQuickAddTask
  _cbRef.current.clearTaskSelection = clearTaskSelection
  _cbRef.current.handleBulkDeleteSelected = handleBulkDeleteSelected
  _cbRef.current.handleDeleteSingleTask = handleDeleteSingleTask
  _cbRef.current.handleQuickTaskViewModeChange = handleQuickTaskViewModeChange
  _cbRef.current.handleAddTaskComment = handleAddTaskComment
  _cbRef.current.handleAddComment = handleAddComment
  _cbRef.current.handleStartCommentEdit = handleStartCommentEdit
  _cbRef.current.handleCancelCommentEdit = handleCancelCommentEdit
  _cbRef.current.handleSaveCommentEdit = handleSaveCommentEdit
  _cbRef.current.handleDeleteComment = handleDeleteComment

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
    setWorkhubViewModeHydrated(false)
    if (!workhubViewModeStorageKey) return
    const saved = localStorage.getItem(workhubViewModeStorageKey)
    if (saved === 'tabs' || saved === 'workspace_tree') {
      setWorkhubViewMode(saved)
    }
    setWorkhubViewModeHydrated(true)
  }, [workhubViewModeStorageKey])

  useEffect(() => {
    if (!workhubViewModeStorageKey || !workhubViewModeHydrated) return
    localStorage.setItem(workhubViewModeStorageKey, workhubViewMode)
  }, [workhubViewMode, workhubViewModeHydrated, workhubViewModeStorageKey])

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
  const isEmployeeProfileFocus = selectedProjectEffectiveIntent === 'hr_employee_profile'

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
    ...(!isEmployeeProfileFocus
      ? [{
          id: 'tasks',
          section: 'tasks' as const,
          icon: '✓',
          label: 'Tasks',
          onClick: () => navigateToWorkspaceSection('tasks'),
        }]
      : []),
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
  const workspaceProjectActionLabel = selectedWorkspaceTemplateId === 'projects'
    ? 'Add project'
    : selectedWorkspaceTemplateId === 'hr'
      ? 'Add organization unit'
      : 'Add folder'
  const workspaceProjectActionIcon = selectedWorkspaceTemplateId === 'projects'
    ? '🚀'
    : selectedWorkspaceTemplateId === 'hr'
      ? '🏛️'
      : '📁'

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

  const workspaceHierarchyGroupLabel = selectedWorkspaceTemplateId === 'hr'
    ? 'Organization units'
    : selectedWorkspaceTemplateId === 'projects'
      ? 'Projects'
      : 'Folders'
  const workspaceHierarchyEmptyMessage = selectedWorkspaceTemplateId === 'hr'
    ? 'No organization units found yet. Create a root organization unit or department first.'
    : selectedWorkspaceTemplateId === 'projects'
      ? 'No projects found yet. Create a project first.'
      : 'No folders found yet. Create a folder first.'

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
  const workhubTasksSectionProps = {
    isMobileWorkhubLayout,
    workhubViewMode,
    onMobileTaskDetailOpenChange: setMobileTaskDetailOpen,
    taskItemDisplayMode,
    taskContextTrail,
    projectIntentMetaById,
    handleSelectProject,
    selectedWorkspaceDisplayName,
    selectedProjectPeriodLabel,
    selectedProjectSubmissionTimeLabel,
    selectedProjectEffectiveTaskStatuses,
    linkedHighlightedTaskId,
    taskFilterBaseTasks,
    selectedTaskStatusTab,
    setSelectedTaskStatusTab,
    taskFilterBaseTaskCountByStatus,
    completedStatusForHighlight,
    completedHighlightCount,
    quickTaskViewTargetProject,
    busyKey,
    handleQuickTaskViewModeChange: stableHandleQuickTaskViewModeChange,
    activeTaskFilterCount,
    setTaskFilterMenuOpen,
    taskFilterMenuOpen,
    setTaskFilterRequireAttachments,
    setTaskFilterRequireChecklist,
    setTaskFilterPriority,
    taskFilterRequireAttachments,
    taskFilterRequireChecklist,
    taskFilterPriority,
    selectedTaskCount,
    setBulkStatusMenuOpen,
    bulkStatusMenuOpen,
    setBulkAssigneeMenuOpen,
    bulkAssigneeMenuOpen,
    bulkAssignableMembers,
    bulkUnionAssigneeUids,
    bulkAssigneeCoverageByUid,
    handleBulkStatusChange: stableHandleBulkStatusChange,
    handleBulkAssigneeChange: stableHandleBulkAssigneeChange,
    clearTaskSelection: stableClearTaskSelection,
    setBulkDeleteConfirmOpen,
    selectedWorkspaceScopeType,
    filteredTasks,
    setSelectedTaskIds,
    renderedTaskStatuses,
    renderedTaskListsByStatus,
    filteredTaskCountByStatus,
    collapsibleStatusIdSet,
    expandedTaskStatusIds,
    setExpandedTaskStatusIds,
    financeStatusTotals,
    financeWorkspaceCurrency,
    taskDueDisplayMode,
    selectedTaskIdSet,
    taskContextMenuState,
    setTaskContextMenuState,
    dropTargetKey,
    dragTaskId,
    dragStatusId,
    openTaskStatusMenuId,
    openTaskPriorityMenuId,
    openTaskMoreMenuId,
    openTaskAssigneeMenuId,
    editingTaskTitleId,
    editingTaskTitleText,
    expandedTaskChecklistIdsSet,
    taskChecklistDrafts,
    editingChecklistTaskId,
    editingChecklistItemId,
    editingChecklistScope,
    editingChecklistItemText,
    memberByUid,
    assignableMembersByProjectId,
    workspaceAssignableMembers,
    taskMetaById,
    unreadCommentCountByTaskId,
    notifications,
    markWorkhubNotificationRead,
    taskRowCallbacks,
    flatVisibleProjectOptionsWithIcons,
    quickAddDefaultProjectId,
    selectedProjectId,
    currentUid,
    quickAddFocusStatusId,
    quickAddFocusTrigger,
    setQuickAddFocusStatusId,
    setDropTargetKey,
    handleTaskReorder: stableHandleTaskReorder,
    closeTaskContextMenu,
    openTaskMoveDialog,
    copyTaskDeepLink,
    copyTaskUniqueToken,
    handleQuickAddTask: stableHandleQuickAddTask,
    setStatusTaskRenderLimitById,
    selectedProjectIntentMeta,
    workspaceProjectById,
    workspaceDocumentsByProjectId,
    workspaceMoodBoardsByProjectId,
    selectedWorkspaceMoodBoardEnabled: selectedWorkspace?.moodBoardEnabled !== false,
    selectedDocumentId,
    setSelectedMoodBoardId,
    setSelectedDocumentId,
    setActiveSection,
    getWorkhubDocumentIcon,
    selectedMoodBoardId,
    detailMenuOpen,
    setDetailMenuOpen,
    setDetailMenuCoords,
    detailMenuCoords,
    handleSelectedTaskValueSave,
    handleSelectedTaskTitleSave,
    handleSelectedTaskDescriptionSave,
    resolveTaskParentEntityLabel,
    projectNameById,
    formatTime,
    buildChecklist,
    getChecklistDetailKey,
    expandedChecklistDetailKeys,
    toggleChecklistItemDetails,
    setEditingChecklistItemText,
    handleChecklistItemToggle,
    handleChecklistItemEditStart,
    handleChecklistItemEditSave,
    handleChecklistItemEditCancel,
    handleChecklistRemove,
    checklistDetailsDrafts,
    setChecklistDetailsDrafts,
    handleChecklistItemDetailsSave,
    checklistAttachmentDrafts,
    setChecklistAttachmentDrafts,
    handleChecklistAttachmentAdd,
    handleChecklistAttachmentFileUpload,
    uploadingChecklistAttachmentKey,
    attachmentViewMode,
    isImageAttachmentUrl,
    openAttachmentLightbox,
    attachmentReviews,
    handleChecklistAttachmentRemove,
    checklistLinkDrafts,
    setChecklistLinkDrafts,
    handleChecklistLinkAdd,
    handleChecklistLinkRemove,
    setTaskChecklistDrafts,
    taskChecklistValueDrafts,
    setTaskChecklistValueDrafts,
    handleChecklistAdd,
    handleTaskUpdate: stableHandleTaskUpdate,
    handleAddTaskComment: stableHandleAddTaskComment,
    projectDiscussionNode,
    taskAttachmentsCollapsed,
    setTaskAttachmentsCollapsed,
    setAttachmentViewMode,
    taskAttachmentTitleDrafts,
    setTaskAttachmentTitleDrafts,
    taskAttachmentDrafts,
    setTaskAttachmentDrafts,
    taskAttachmentFilePathDrafts,
    taskAttachmentFileDrafts,
    setTaskAttachmentFileDrafts,
    setTaskAttachmentFilePathDrafts,
    uploadingTaskAttachmentId,
    handleTaskAttachmentAdd,
    handleTaskAttachmentFileUpload,
    getTaskAttachments,
    getTaskAttachmentTitle,
    handleTaskAttachmentRemove,
    getTaskLinks,
    taskLinkTitleDrafts,
    setTaskLinkTitleDrafts,
    taskLinkDrafts,
    setTaskLinkDrafts,
    handleTaskLinkAdd,
    taskLinkEditingDrafts,
    handleTaskLinkEditCancel,
    getTaskLinkTitle,
    getUrlHostLabel,
    getInitials,
    handleTaskLinkEditStart,
    handleTaskLinkRemove,
    selectedProject,
    selectedProjectColorDraft,
    canEditSelectedProject,
    canEditSelectedProjectAttachments,
    selectedProjectEffectiveIntent,
    selectedProjectNameDraft,
    setSelectedProjectNameDraft,
    handleSaveSelectedProjectDetails,
    selectedProjectTypeDraft,
    selectedProjectTypeOptions,
    setSelectedProjectTypeDraft,
    selectedProjectStartDateDraft,
    setSelectedProjectStartDateDraft,
    selectedProjectDeadlineDraft,
    setSelectedProjectDeadlineDraft,
    selectedProjectSubmissionTimeDraft,
    setSelectedProjectSubmissionTimeDraft,
    selectedProjectValueAmountDraft,
    setSelectedProjectValueAmountDraft,
    selectedProjectValueCurrencyDraft,
    setSelectedProjectValueCurrencyDraft,
    selectedProjectNarrativeDraft,
    setSelectedProjectNarrativeDraft,
    handleSelectedProjectDescriptionBlur,
    selectedProjectIntentDetailDrafts,
    setSelectedProjectIntentDetailDrafts,
    proposalServiceOptions,
    selectedProposalServicesDraft,
    setSelectedProposalServicesDraft,
    handleCreateProposalServiceOption,
    projectAttachmentsCollapsed,
    setProjectAttachmentsCollapsed,
    selectedProjectAttachmentTitleDraft,
    setSelectedProjectAttachmentTitleDraft,
    selectedProjectAttachmentDraft,
    setSelectedProjectAttachmentDraft,
    selectedProjectAttachmentFilePathDraft,
    setSelectedProjectAttachmentFilePathDraft,
    selectedProjectAttachmentFileDrafts,
    setSelectedProjectAttachmentFileDrafts,
    uploadingSelectedProjectAttachment,
    handleSelectedProjectAttachmentAdd,
    handleSelectedProjectAttachmentFileUpload,
    selectedProjectAttachments,
    deriveAttachmentTitle,
    handleSelectedProjectAttachmentUpdate,
    handleSelectedProjectAttachmentRemove,
    selectedProjectColorMenuOpen,
    setSelectedProjectColorMenuOpen,
    selectedProjectColorMeaning,
    selectedWorkspaceProjectColorMeanings,
    handleSelectedProjectColorSelect,
    setProjectAccessDialogId,
    selectedProjectDetailsChanged,
    setTaskDeleteConfirmOpen,
    taskDeleteConfirmOpen,
    bulkDeleteConfirmOpen,
    handleBulkDeleteSelected: stableHandleBulkDeleteSelected,
    handleDeleteSingleTask: stableHandleDeleteSingleTask,
    visibleTasks,
    // Milestone data is managed inside WorkhubTasksSection to avoid top-level re-renders
    selectedWorkspaceId,
    showToast,
  }
  return (
    <div className={`workhub-shell${isMobileWorkhubLayout ? ' is-mobile' : ''}${isMobileWorkhubLayout && mobileTaskDetailOpen ? ' task-detail-open' : ''}${isMobileWorkhubLayout && mobileWorkspacePanelOpen ? ' workspace-drawer-open' : ''}`} dir="ltr">
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
                >
                  <span aria-hidden="true">☰</span>
                  <span className="workhub-mobile-context-label">
                    {selectedProject ? selectedProject.name : (selectedWorkspace ? (workspaceDisplayNameById[selectedWorkspaceId] || selectedWorkspace.name) : 'Workspaces')}
                  </span>
                </button>
              </div>
            ) : (
              workhubViewMode === 'tabs' ? (
                <div className="workhub-workspace-tabs-wrap">
                  <div className="workhub-workspace-tabs" role="tablist" aria-label="Workspaces">
                    {visibleWorkspaces.map((item) => {
                      const workspaceDisplayName = workspaceDisplayNameById[item.id] || item.name
                      return (
                        <button
                          key={item.id}
                          type="button"
                          className={`workhub-tab workhub-workspace-tab${selectedWorkspaceId === item.id ? ' is-active' : ''}`}
                          role="tab"
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
              ) : null
            )}
          </div>
          <nav className="workhub-header-actions">
            {!isMobileWorkhubLayout && (
              <div className="workhub-view-mode-switch" role="group" aria-label="WorkHub view mode">
                <button
                  type="button"
                  className={`workhub-view-mode-btn${workhubViewMode === 'tabs' ? ' is-active' : ''}`}
                  onClick={() => setWorkhubViewMode('tabs')}
                  data-active={workhubViewMode === 'tabs' ? 'true' : 'false'}
                  title="Tabs view"
                >
                  <span className="workhub-view-mode-btn-icon" aria-hidden="true">▥</span>
                  <span className="workhub-view-mode-btn-label">Tabs</span>
                </button>
                <button
                  type="button"
                  className={`workhub-view-mode-btn${workhubViewMode === 'workspace_tree' ? ' is-active' : ''}`}
                  onClick={() => setWorkhubViewMode('workspace_tree')}
                  data-active={workhubViewMode === 'workspace_tree' ? 'true' : 'false'}
                  title="Workspaces view"
                >
                  <span className="workhub-view-mode-btn-icon" aria-hidden="true">≣</span>
                  <span className="workhub-view-mode-btn-label">Workspaces</span>
                </button>
              </div>
            )}
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
            <button
              type="button"
              className="workhub-tab workhub-top-nav-icon-btn"
              onClick={handleOptimisticDataReload}
              disabled={isDataReloading}
              title={isDataReloading ? 'Reloading...' : 'Reload workspace data'}
              aria-label={isDataReloading ? 'Reloading workspace data' : 'Reload workspace data'}
            >
              <span aria-hidden="true">{isDataReloading ? '...' : '↻'}</span>
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
                    {notifications.map((item) => {
                      const sender = memberByUid[item.actorUid]
                      const senderName = sender?.displayName || sender?.email || 'System'
                      const senderAvatarUrl = (sender?.photoURL || '').trim()
                      return (
                        <button
                          key={item.id}
                          type="button"
                          className={`workhub-notify-item${item.read ? '' : ' is-unread'}`}
                          onClick={() => { void handleNotificationMenuItemClick(item) }}
                        >
                          <span className="workhub-notify-avatar" aria-hidden="true">
                            {senderAvatarUrl
                              ? <img src={senderAvatarUrl} alt="" />
                              : <span>{getInitials(senderName)}</span>}
                          </span>
                          <span className="workhub-notify-item-body">
                            <span className="workhub-notify-meta">
                              <span className="workhub-notify-sender">{senderName}</span>
                              <span>{formatTime(item.createdAt)}</span>
                            </span>
                            <span className="workhub-notify-message">{item.message}</span>
                          </span>
                        </button>
                      )
                    })}
                    {notifications.length >= notificationFetchLimit && (
                      <button
                        type="button"
                        className="workhub-notify-load-more"
                        onClick={() => setNotificationFetchLimit((count) => count + 10)}
                      >
                        Load more
                      </button>
                    )}
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
                  <button
                    type="button"
                    className="workhub-account-menu-action"
                    onClick={() => {
                      setAccountMenuOpen(false)
                      void openMoodBoardVariantForCurrentScope('classic')
                    }}
                  >
                    Open Mood Board
                  </button>
                  <button
                    type="button"
                    className="workhub-account-menu-action"
                    onClick={() => {
                      setAccountMenuOpen(false)
                      void openMoodBoardVariantForCurrentScope('flow')
                    }}
                  >
                    Open Flow Project Plan
                  </button>
                  <button
                    type="button"
                    className="workhub-account-menu-action"
                    onClick={() => {
                      setAccountMenuOpen(false)
                      void openMoodBoardVariantForCurrentScope('proscons')
                    }}
                  >
                    Open Pros &amp; Cons
                  </button>
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
                    aria-label="Select workspace"
                    title="Select workspace"
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
                          className="workhub-ghost-mini"
                          onClick={() => { void handleCreatePipelineReportDocument() }}
                          title="Create report item"
                          aria-label="Create report item"
                          disabled={!pipelineReport.available || !selectedWorkspaceId}
                        >
                          Report
                        </button>
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
                        linkedHighlightedProjectId={linkedHighlightedProjectId}
                        linkedHighlightedDocumentId={linkedHighlightedDocumentId}
                        linkedHighlightedMoodBoardId={linkedHighlightedMoodBoardId}
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
                        isPrivilegedMember={canSeeAllProjects}
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
                        onOpenWorkspaceActionMenu={(event) => handleProjectActionMenu('__workspace__', event)}
                        onQuickAddTask={(projectId) => openAddItemDialog(projectId)}
                        onOpenSettings={openProjectSettingsDialog}
                        onRenameProject={handleRenameProjectFromTree}
                        onMoveProject={handleMoveProjectInTree}
                        onMoveDocument={handleMoveDocumentInTree}
                        onMoveMoodBoard={handleMoveMoodBoardInTree}
                        onReorderDocument={handleReorderDocumentInTree}
                        onReorderMoodBoard={handleReorderMoodBoardInTree}
                        onRenameDocument={handleRenameDocumentFromTree}
                        onDuplicateDocument={handleDuplicateDocumentFromTree}
                        onDeleteDocument={handleDeleteDocumentFromTree}
                        onMoveDocumentViaDialog={(documentId) => openTreeItemMoveDialog('document', documentId)}
                        onOpenDocumentSettings={openDocumentSettingsDialog}
                        onRenameMoodBoard={handleRenameMoodBoardFromTree}
                        onDuplicateMoodBoard={handleDuplicateMoodBoardFromTree}
                        onDeleteMoodBoard={handleDeleteMoodBoardFromTree}
                        onMoveMoodBoardViaDialog={(boardId) => openTreeItemMoveDialog('moodboard', boardId)}
                        onOpenMoodBoardSettings={openMoodBoardSettingsDialog}
                        pendingInlineRename={pendingTreeInlineRename}
                        onConsumePendingInlineRename={() => setPendingTreeInlineRename(null)}
                        projectColorMeanings={selectedWorkspaceProjectColorMeanings}
                      />
                    ) : (
                      <div className="workhub-empty-state">No project tree items yet.</div>
                    )}

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
                {workhubViewMode === 'tabs' ? (
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
                            className="workhub-ghost-mini"
                            title="Create report item"
                            aria-label="Create report item"
                            onClick={() => { void handleCreatePipelineReportDocument() }}
                            disabled={!pipelineReport.available || !selectedWorkspaceId}
                          >
                            Report
                          </button>
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
                ) : null}
                <div className="workhub-tree-scroll">
                  {workhubViewMode === 'workspace_tree' ? (
                    <div className="workhub-tree-workspace-list">
                      {visibleWorkspaces.map((workspace) => {
                        const workspaceId = workspace.id
                        const workspaceNodes = workspaceTreeNodesByWorkspaceId[workspaceId] || []
                        const isExpanded = expandedWorkspaceTreeIds.includes(workspaceId)
                        const workspaceTemplateId = resolveWorkhubWorkspaceTemplateForWorkspace(workspace).templateId
                        const workspaceDisplayName = workspaceDisplayNameById[workspaceId] || workspace.name
                        return (
                          <div key={workspaceId} className={`workhub-tree-workspace-group${selectedWorkspaceId === workspaceId ? ' is-active' : ''}`}>
                            <div className="workhub-tree-workspace-head">
                              <button
                                type="button"
                                className="workhub-tree-workspace-btn"
                                onClick={() => handleWorkspaceTreeGroupSelect(workspaceId)}
                              >
                                <span className="workhub-tree-workspace-label">
                                  <span className={`workhub-tree-workspace-caret${isExpanded ? ' is-expanded' : ''}`}>▸</span>
                                  <span>{workspaceDisplayName}</span>
                                </span>
                                <span className="workhub-tree-workspace-summary">{workspaceNodes.length} root item{workspaceNodes.length === 1 ? '' : 's'}</span>
                              </button>
                              <button
                                type="button"
                                className={`workhub-tree-workspace-overview-btn${selectedWorkspaceId === workspaceId && selectedProjectId === 'all' && activeSection === 'dashboard' ? ' is-active' : ''}`}
                                onClick={(event) => {
                                  event.stopPropagation()
                                  navigateToWorkspaceSection('dashboard', workspaceId)
                                }}
                                title="Workspace overview"
                                aria-label={`Open ${workspaceDisplayName} overview`}
                              >
                                <span aria-hidden="true">⌂</span>
                              </button>
                            </div>
                            <div className={`workhub-tree-workspace-expand-wrap${isExpanded ? ' is-open' : ''}`}>
                              <div className="workhub-tree-workspace-expand-inner">
                                <div className="workhub-tree-workspace-body">
                                {workspaceNodes.length > 0 ? (
                                  <ProjectTreeNodes
                                    nodes={workspaceNodes}
                                    treeMetaDisplayMode={treeMetaDisplayMode}
                                    showProjectColorDots={showProjectColorDots}
                                    selectedProjectId={selectedProjectId}
                                    linkedHighlightedProjectId={linkedHighlightedProjectId}
                                    linkedHighlightedDocumentId={linkedHighlightedDocumentId}
                                    linkedHighlightedMoodBoardId={linkedHighlightedMoodBoardId}
                                    expandedProjectIds={expandedProjectIds}
                                    directTaskCountByProjectId={workspaceTreeTaskCountByProjectId}
                                    unreadCommentCountByProjectId={{}}
                                    taskProgressByProjectId={workspaceTreeProgressByProjectId}
                                    projectIntentById={projectIntentById}
                                    projectIntentIconById={projectIntentIconById}
                                    selectedDocumentId=""
                                    selectedMoodBoardId=""
                                    documentsByProjectId={{}}
                                    moodBoardsByProjectId={{}}
                                    isPrivilegedMember={canSeeAllProjects}
                                    onSelectProject={(projectId) => handleSelectProjectFromWorkspaceTree(workspaceId, projectId)}
                                    onSelectDocument={() => {}}
                                    onSelectMoodBoard={() => {}}
                                    onToggleExpansion={toggleProjectExpansion}
                                    onOpenActionMenu={handleProjectActionMenu}
                                    onOpenWorkspaceActionMenu={(event) => handleProjectActionMenu('__workspace__', event)}
                                    onQuickAddTask={(projectId) => openAddItemDialog(projectId)}
                                    onOpenSettings={openProjectSettingsDialog}
                                    onRenameProject={handleRenameProjectFromTree}
                                    onMoveProject={handleMoveProjectInTree}
                                    onMoveDocument={handleMoveDocumentInTree}
                                    onMoveMoodBoard={handleMoveMoodBoardInTree}
                                    onReorderDocument={handleReorderDocumentInTree}
                                    onReorderMoodBoard={handleReorderMoodBoardInTree}
                                    onRenameDocument={handleRenameDocumentFromTree}
                                    onDuplicateDocument={handleDuplicateDocumentFromTree}
                                    onDeleteDocument={handleDeleteDocumentFromTree}
                                    onMoveDocumentViaDialog={(documentId) => openTreeItemMoveDialog('document', documentId)}
                                    onOpenDocumentSettings={openDocumentSettingsDialog}
                                    onRenameMoodBoard={handleRenameMoodBoardFromTree}
                                    onDuplicateMoodBoard={handleDuplicateMoodBoardFromTree}
                                    onDeleteMoodBoard={handleDeleteMoodBoardFromTree}
                                    onMoveMoodBoardViaDialog={(boardId) => openTreeItemMoveDialog('moodboard', boardId)}
                                    onOpenMoodBoardSettings={openMoodBoardSettingsDialog}
                                    pendingInlineRename={pendingTreeInlineRename}
                                    onConsumePendingInlineRename={() => setPendingTreeInlineRename(null)}
                                    projectColorMeanings={resolveProjectColorMeanings(workspaceTemplateId, workspace.projectColorMeanings)}
                                  />
                                ) : (
                                  <div className="workhub-empty-state">No project items in this workspace yet.</div>
                                )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : groupedProjectsWorkspace ? (
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
                            <strong>{workspaceHierarchyGroupLabel}</strong>
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
                                linkedHighlightedProjectId={linkedHighlightedProjectId}
                                linkedHighlightedDocumentId={linkedHighlightedDocumentId}
                                linkedHighlightedMoodBoardId={linkedHighlightedMoodBoardId}
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
                                isPrivilegedMember={canSeeAllProjects}
                                onSelectProject={handleSelectProjectFromTree}
                                onSelectDocument={handleSelectDocumentTreeItem}
                                onSelectMoodBoard={handleSelectMoodBoardTreeItem}
                                onToggleExpansion={toggleProjectExpansion}
                                onOpenActionMenu={handleProjectActionMenu}
                                onOpenWorkspaceActionMenu={(event) => handleProjectActionMenu('__workspace__', event)}
                                onQuickAddTask={(projectId) => openAddItemDialog(projectId)}
                                onOpenSettings={openProjectSettingsDialog}
                                onRenameProject={handleRenameProjectFromTree}
                                onMoveProject={handleMoveProjectInTree}
                                onMoveDocument={handleMoveDocumentInTree}
                                onMoveMoodBoard={handleMoveMoodBoardInTree}
                                onReorderDocument={handleReorderDocumentInTree}
                                onReorderMoodBoard={handleReorderMoodBoardInTree}
                                onRenameDocument={handleRenameDocumentFromTree}
                                onDuplicateDocument={handleDuplicateDocumentFromTree}
                                onDeleteDocument={handleDeleteDocumentFromTree}
                                onMoveDocumentViaDialog={(documentId) => openTreeItemMoveDialog('document', documentId)}
                                onOpenDocumentSettings={openDocumentSettingsDialog}
                                onRenameMoodBoard={handleRenameMoodBoardFromTree}
                                onDuplicateMoodBoard={handleDuplicateMoodBoardFromTree}
                                onDeleteMoodBoard={handleDeleteMoodBoardFromTree}
                                onMoveMoodBoardViaDialog={(boardId) => openTreeItemMoveDialog('moodboard', boardId)}
                                onOpenMoodBoardSettings={openMoodBoardSettingsDialog}
                                pendingInlineRename={pendingTreeInlineRename}
                                onConsumePendingInlineRename={() => setPendingTreeInlineRename(null)}
                                projectColorMeanings={selectedWorkspaceProjectColorMeanings}
                              />
                            </div>
                          ) : (
                            <div className="workhub-empty-state">{workspaceHierarchyEmptyMessage}</div>
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
                            linkedHighlightedProjectId={linkedHighlightedProjectId}
                            linkedHighlightedDocumentId={linkedHighlightedDocumentId}
                            linkedHighlightedMoodBoardId={linkedHighlightedMoodBoardId}
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
                            isPrivilegedMember={canSeeAllProjects}
                            onSelectProject={handleSelectProjectFromTree}
                            onSelectDocument={handleSelectDocumentTreeItem}
                            onSelectMoodBoard={handleSelectMoodBoardTreeItem}
                            onToggleExpansion={toggleProjectExpansion}
                            onOpenActionMenu={handleProjectActionMenu}
                            onOpenWorkspaceActionMenu={(event) => handleProjectActionMenu('__workspace__', event)}
                            onQuickAddTask={(projectId) => openAddItemDialog(projectId)}
                            onOpenSettings={openProjectSettingsDialog}
                            onRenameProject={handleRenameProjectFromTree}
                            onMoveProject={handleMoveProjectInTree}
                            onMoveDocument={handleMoveDocumentInTree}
                            onMoveMoodBoard={handleMoveMoodBoardInTree}
                            onReorderDocument={handleReorderDocumentInTree}
                            onReorderMoodBoard={handleReorderMoodBoardInTree}
                            onRenameDocument={handleRenameDocumentFromTree}
                            onDuplicateDocument={handleDuplicateDocumentFromTree}
                            onDeleteDocument={handleDeleteDocumentFromTree}
                            onMoveDocumentViaDialog={(documentId) => openTreeItemMoveDialog('document', documentId)}
                            onOpenDocumentSettings={openDocumentSettingsDialog}
                            onRenameMoodBoard={handleRenameMoodBoardFromTree}
                            onDuplicateMoodBoard={handleDuplicateMoodBoardFromTree}
                            onDeleteMoodBoard={handleDeleteMoodBoardFromTree}
                            onMoveMoodBoardViaDialog={(boardId) => openTreeItemMoveDialog('moodboard', boardId)}
                            onOpenMoodBoardSettings={openMoodBoardSettingsDialog}
                            pendingInlineRename={pendingTreeInlineRename}
                            onConsumePendingInlineRename={() => setPendingTreeInlineRename(null)}
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
                      linkedHighlightedProjectId={linkedHighlightedProjectId}
                      linkedHighlightedDocumentId={linkedHighlightedDocumentId}
                      linkedHighlightedMoodBoardId={linkedHighlightedMoodBoardId}
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
                      isPrivilegedMember={canSeeAllProjects}
                      onSelectProject={handleSelectProjectFromTree}
                      onSelectDocument={handleSelectDocumentTreeItem}
                      onSelectMoodBoard={handleSelectMoodBoardTreeItem}
                      onToggleExpansion={toggleProjectExpansion}
                      onOpenActionMenu={handleProjectActionMenu}
                      onOpenWorkspaceActionMenu={(event) => handleProjectActionMenu('__workspace__', event)}
                      onQuickAddTask={(projectId) => openAddItemDialog(projectId)}
                      onOpenSettings={openProjectSettingsDialog}
                      onRenameProject={handleRenameProjectFromTree}
                      onMoveProject={handleMoveProjectInTree}
                      onMoveDocument={handleMoveDocumentInTree}
                      onMoveMoodBoard={handleMoveMoodBoardInTree}
                      onReorderDocument={handleReorderDocumentInTree}
                      onReorderMoodBoard={handleReorderMoodBoardInTree}
                      onRenameDocument={handleRenameDocumentFromTree}
                      onDuplicateDocument={handleDuplicateDocumentFromTree}
                      onDeleteDocument={handleDeleteDocumentFromTree}
                      onMoveDocumentViaDialog={(documentId) => openTreeItemMoveDialog('document', documentId)}
                      onOpenDocumentSettings={openDocumentSettingsDialog}
                      onRenameMoodBoard={handleRenameMoodBoardFromTree}
                      onDuplicateMoodBoard={handleDuplicateMoodBoardFromTree}
                      onDeleteMoodBoard={handleDeleteMoodBoardFromTree}
                      onMoveMoodBoardViaDialog={(boardId) => openTreeItemMoveDialog('moodboard', boardId)}
                      onOpenMoodBoardSettings={openMoodBoardSettingsDialog}
                      pendingInlineRename={pendingTreeInlineRename}
                      onConsumePendingInlineRename={() => setPendingTreeInlineRename(null)}
                      projectColorMeanings={selectedWorkspaceProjectColorMeanings}
                    />
                  ) : !projectsFeedHydrated && !!selectedWorkspaceId ? (
                    <div className="workhub-empty-state">Loading workspace items…</div>
                  ) : (
                    <div className="workhub-empty-state workhub-empty-projects-cta">
                      <span>{emptyProjectsMessage}</span>
                      <div className="workhub-row">
                        <button
                          type="button"
                          className="workhub-primary-mini"
                          onClick={() => sidebarPrimaryCreateAction?.onClick()}
                          disabled={!selectedWorkspaceId || !sidebarPrimaryCreateAction}
                        >
                          {sidebarPrimaryCreateAction?.label || 'Create first item'}
                        </button>
                        <button
                          type="button"
                          className="workhub-ghost-btn"
                          onClick={() => { void openMoodBoardVariantForCurrentScope('classic') }}
                        >
                          Mood Board
                        </button>
                        <button
                          type="button"
                          className="workhub-ghost-btn"
                          onClick={() => { void openMoodBoardVariantForCurrentScope('flow') }}
                        >
                          Flow Project Plan
                        </button>
                        <button
                          type="button"
                          className="workhub-ghost-btn"
                          onClick={() => { void openMoodBoardVariantForCurrentScope('proscons') }}
                        >
                          Pros &amp; Cons
                        </button>
                      </div>
                    </div>
                  )}


                </div>
                <div className="workhub-tree-footer" role="region" aria-label="Workspace quick actions">
                  <button
                    type="button"
                    className="workhub-tree-chat-btn"
                    onClick={handleOpenLinkedChat}
                    title="Open chat"
                  >
                    <span className="workhub-tree-chat-btn-icon" aria-hidden="true">💬</span>
                    <span>Chat</span>
                  </button>
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
              <main
                className={`workhub-section-stack is-dashboard${showDashboardDetailRail ? ' workhub-dashboard-with-details' : ''}`}
                style={showDashboardDetailRail ? { gridTemplateColumns: `minmax(0, 1fr) ${Math.round(resolvedDashboardDetailRailWidth)}px` } : undefined}
              >
                <div className="workhub-dashboard-stack">
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
                          {selectedProject && !isEmployeeProfileFocus && <button className="workhub-primary-btn" onClick={() => openCreateProjectDialog(selectedProject.id)}>{`${selectedDashboardFocusMeta.icon} ${selectedDashboardFocusMeta.actionLabel}`}</button>}
                          {selectedProject && !isEmployeeProfileFocus && canCreateTasksForIntent(projectIntentById[selectedProject.id] || 'project') && <button className="workhub-ghost-btn" onClick={() => openCreateTaskDialog(selectedProject.id)}>✅ Add task</button>}
                          {selectedProject && !isEmployeeProfileFocus && (workspaceTaskProgressByProjectId[selectedProject.id]?.total ?? 0) > 0 && (
                            <button className="workhub-ghost-btn" onClick={() => navigateToWorkspaceSection('tasks', selectedWorkspaceId, selectedProject.id)}>View tasks</button>
                          )}
                        </div>
                      )}
                      {isMobileWorkhubLayout && (
                        <div className="workhub-mobile-dashboard-actions">
                          {selectedProject && !isEmployeeProfileFocus && <button className="workhub-primary-btn" onClick={() => openCreateProjectDialog(selectedProject.id)}>{`${selectedDashboardFocusMeta.icon} ${selectedDashboardFocusMeta.actionLabel}`}</button>}
                          {selectedProject && !isEmployeeProfileFocus && canCreateTasksForIntent(projectIntentById[selectedProject.id] || 'project') && <button className="workhub-ghost-btn" onClick={() => openCreateTaskDialog(selectedProject.id)}>✅ Add task</button>}
                          {selectedProject && !isEmployeeProfileFocus && (workspaceTaskProgressByProjectId[selectedProject.id]?.total ?? 0) > 0 && (
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
                        {selectedBranchChildProjects.length === 0 && <div className="workhub-empty-state">No child items here yet.</div>}
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
                                className={`workhub-proposal-doc-item${doc.hasOutgoingReferences && !doc.referenceSourceDocumentId ? ' is-public-source' : ''}`}
                                onClick={() => {
                                  setSelectedDocumentId(doc.id)
                                  setActiveSection('notes')
                                }}
                                title={doc.projectName ? `${doc.title} · ${doc.projectName}` : doc.title}
                              >
                                <span className="workhub-proposal-doc-icon" aria-hidden="true">{getWorkhubDocumentIcon(doc)}</span>
                                <span className="workhub-proposal-doc-copy">
                                  <strong dir="auto">{doc.title}{doc.hasOutgoingReferences && !doc.referenceSourceDocumentId ? ' (Public source)' : ''}</strong>
                                  <small>{doc.projectName || (doc.type === 'note' ? 'Note' : 'Document')}{doc.referenceSourceDocumentId ? ' • Reference' : ''}{doc.hasOutgoingReferences && !doc.referenceSourceDocumentId ? ' • Public source' : ''}</small>
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </article>
                    </div>
                  )}
                  {selectedProject && selectedEmployeeProfileSummary && (
                    <div className="workhub-overview-dashboard">
                      <article className="workhub-overview-card workhub-employee-profile-card">
                        <div className="workhub-overview-head workhub-employee-profile-head">
                          <h3>Employee summary</h3>
                          <span>{selectedEmployeeProfileSummary.status || 'Status not set'}</span>
                        </div>

                        <div className="workhub-employee-profile-identity">
                          <div className="workhub-employee-photo-frame" aria-hidden="true">
                            {selectedEmployeeProfileSummary.profilePhotoUrl
                              ? <img src={selectedEmployeeProfileSummary.profilePhotoUrl} alt="Employee profile" loading="lazy" />
                              : <span>{(selectedEmployeeProfileSummary.name || 'E').trim()[0]?.toUpperCase() || 'E'}</span>}
                          </div>
                          <div className="workhub-employee-identity-copy">
                            <strong dir="auto">{selectedEmployeeProfileSummary.name}</strong>
                            <span className="workhub-ltr-token">ID: {selectedEmployeeProfileSummary.employeeId || 'Not set'}</span>
                            <span dir="auto">{selectedEmployeeProfileSummary.position || 'Position not set'}</span>
                            <span dir="auto">{selectedEmployeeProfileSummary.department || 'Department not set'}{selectedEmployeeProfileSummary.subDepartment ? ` • ${selectedEmployeeProfileSummary.subDepartment}` : ''}</span>
                          </div>
                        </div>

                        <div className="workhub-summary-strip workhub-employee-leave-strip">
                          <div className="workhub-summary-tile workhub-employee-leave-tile">
                            <strong>{selectedEmployeeProfileSummary.annualAllowance !== null ? selectedEmployeeProfileSummary.annualAllowance : '--'}</strong>
                            <span>Annual leave total</span>
                          </div>
                          <div className="workhub-summary-tile workhub-employee-leave-tile">
                            <strong>{selectedEmployeeProfileSummary.annualUsed !== null ? selectedEmployeeProfileSummary.annualUsed : '--'}</strong>
                            <span>Used leaves</span>
                          </div>
                          <div className="workhub-summary-tile workhub-employee-leave-tile">
                            <strong>{selectedEmployeeProfileSummary.annualRemaining !== null ? selectedEmployeeProfileSummary.annualRemaining : '--'}</strong>
                            <span>Remaining leaves</span>
                          </div>
                        </div>

                        <div className="workhub-employee-link-strip">
                          {selectedEmployeeProfileSummary.cvLink && (
                            <a href={selectedEmployeeProfileSummary.cvLink} target="_blank" rel="noreferrer" className="workhub-ghost-mini">CV</a>
                          )}
                          {selectedEmployeeProfileSummary.idPassportUrl && (
                            <a href={selectedEmployeeProfileSummary.idPassportUrl} target="_blank" rel="noreferrer" className="workhub-ghost-mini">ID / Passport</a>
                          )}
                          {selectedEmployeeProfileSummary.certificationsUrl && (
                            <a href={selectedEmployeeProfileSummary.certificationsUrl} target="_blank" rel="noreferrer" className="workhub-ghost-mini">Certifications</a>
                          )}
                        </div>

                        <div className="workhub-home-actions">
                          <button className="workhub-primary-btn" onClick={() => openTemplateCreateDialog('hr_leave_case', selectedProject.id)}>➕ Add leave</button>
                          <button className="workhub-ghost-btn" onClick={() => openTemplateCreateDialog('hr_leave_case', selectedProject.id)}>✅ Approve leave</button>
                          <button className="workhub-ghost-btn" onClick={() => setProjectAccessDialogId(selectedProject.id)}>Profile settings</button>
                        </div>
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

                      {pipelineReport.available && (
                        <article className="workhub-overview-card workhub-overview-card-full">
                          <div className="workhub-overview-head">
                            <h3>{selectedWorkspaceTemplateId === 'finance' ? 'Finance pipeline report' : 'Proposals and tenders report'}</h3>
                            <span>{selectedPipelineReportItemCount}/{pipelineReport.totalItems} items selected</span>
                          </div>
                          <p className="workhub-pipeline-report-note">
                            Choose groups, then copy a full report or print/save as PDF from a clean HTML layout.
                          </p>
                          <div className="workhub-pipeline-report-filters">
                            {pipelineReport.groups.map((group) => (
                              <label key={group.key} className="workhub-pipeline-report-filter-chip">
                                <input
                                  type="checkbox"
                                  checked={pipelineReportGroupSelection[group.key]}
                                  onChange={(event) => {
                                    const nextChecked = event.target.checked
                                    setPipelineReportGroupSelection((current) => ({
                                      ...current,
                                      [group.key]: nextChecked,
                                    }))
                                  }}
                                />
                                <span>{group.label}</span>
                                <strong>{group.items.length}</strong>
                              </label>
                            ))}
                          </div>
                          <div className="workhub-pipeline-report-summary">
                            <span>{selectedPipelineReportItemCount} row{selectedPipelineReportItemCount === 1 ? '' : 's'} in selection</span>
                            <strong>{selectedPipelineReportTotalLabel}</strong>
                          </div>
                          <div className="workhub-pipeline-report-total-emphasis">
                            <span>{pipelineReportOverallValueLabel}</span>
                            <strong>{selectedPipelineReportTotalLabel}</strong>
                          </div>
                          <div className="workhub-summary-strip">
                            <div className="workhub-summary-tile"><strong>{selectedPipelineReportStatsByGroup.open_proposals}</strong><span>Open</span></div>
                            <div className="workhub-summary-tile"><strong>{selectedPipelineReportStatsByGroup.closed_proposals}</strong><span>Closed</span></div>
                            <div className="workhub-summary-tile"><strong>{selectedPipelineReportStatsByGroup.submitted_proposals}</strong><span>Submitted</span></div>
                            <div className="workhub-summary-tile"><strong>{selectedPipelineReportStatsByGroup.dropped_proposals}</strong><span>Dropped</span></div>
                            <div className="workhub-summary-tile"><strong>{selectedPipelineReportStatsByGroup.running_projects}</strong><span>Running</span></div>
                          </div>
                          <div className="workhub-home-actions">
                            <button
                              type="button"
                              className="workhub-primary-btn"
                              onClick={() => { void handleCopyPipelineReportTable() }}
                              disabled={selectedPipelineReportGroupKeys.size === 0 || selectedPipelineReportItemCount === 0}
                            >
                              Copy report
                            </button>
                            <button
                              type="button"
                              className="workhub-ghost-btn"
                              onClick={handlePrintPipelineReport}
                              disabled={selectedPipelineReportGroupKeys.size === 0 || selectedPipelineReportItemCount === 0}
                            >
                              Print / PDF
                            </button>
                          </div>
                          <div className="workhub-pipeline-report-table-wrap">
                            <table className="workhub-pipeline-report-table">
                              <thead>
                                <tr>
                                  <th>Name</th>
                                  <th>Client</th>
                                  <th>Type</th>
                                  <th>Status</th>
                                  <th>Submission date</th>
                                  <th>Submission time</th>
                                  <th>Amount</th>
                                </tr>
                              </thead>
                              <tbody>
                                {selectedPipelineReportGroups.map((group) => (
                                  <Fragment key={group.key}>
                                    <tr className="workhub-pipeline-report-group-row">
                                      <td colSpan={7}>{group.label}</td>
                                    </tr>
                                    {group.items.map((item) => (
                                      <tr key={item.id}>
                                        <td dir="auto">{item.name}</td>
                                        <td dir="auto">{item.clientName}</td>
                                        <td>{item.typeLabel}</td>
                                        <td>{item.statusLabel}</td>
                                        <td className="workhub-ltr-token">{item.submissionDate}</td>
                                        <td className="workhub-ltr-token">{item.submissionTime}</td>
                                        <td className="workhub-ltr-token">{formatMonetaryAmount(item.amount, item.currency)}</td>
                                      </tr>
                                    ))}
                                    <tr className="workhub-pipeline-report-total-row">
                                      <td><strong>{group.label} total</strong></td>
                                      <td><strong>{group.items.length}</strong></td>
                                      <td />
                                      <td />
                                      <td />
                                      <td />
                                      <td className="workhub-ltr-token"><strong>{group.totalAmountLabel}</strong></td>
                                    </tr>
                                  </Fragment>
                                ))}
                                {selectedPipelineReportGroups.length === 0 && (
                                  <tr>
                                    <td colSpan={7} className="workhub-empty-state">No groups selected.</td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        </article>
                      )}

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
                      {selectedBranchChildProjects.length === 0 && <div className="workhub-empty-state">No child items here yet.</div>}
                    </div>
                  </section>
                )}
                </div>
                {showDashboardDetailRail && (
                  <aside ref={dashboardDetailRailRef} className="workhub-task-detail-rail is-expanded">
                    <button
                      type="button"
                      className={`workhub-task-detail-rail-resize-handle${isDashboardDetailRailResizing ? ' is-active' : ''}`}
                      onPointerDown={handleDashboardDetailRailResizeStart}
                      aria-label="Resize proposal properties panel"
                      title="Drag to resize proposal properties panel"
                    />
                    <div className="workhub-task-detail-rail-scroll">
                      <Suspense fallback={<div className="workhub-empty-state">Loading details…</div>}>
                        <WorkhubProjectDetailRailLazy {...workhubTasksSectionProps} />
                      </Suspense>
                    </div>
                  </aside>
                )}
              </main>
            )}

            {activeSection === 'users' && isPrivilegedMember && (
              <Suspense
                fallback={(
                  <main className="workhub-section-stack">
                    <section className="workhub-panel">
                      <div className="workhub-empty-state">Loading user management…</div>
                    </section>
                  </main>
                )}
              >
                <WorkhubUsersSectionLazy
                  userWorkspaceFilter={userWorkspaceFilter}
                  setUserWorkspaceFilter={setUserWorkspaceFilter}
                  expandedUserPickerUid={expandedUserPickerUid}
                  setExpandedUserPickerUid={setExpandedUserPickerUid}
                  visibleWorkspaces={visibleWorkspaces}
                  workspaceDisplayNameById={workspaceDisplayNameById}
                  userManagementApprovedMembers={userManagementApprovedMembers}
                  userManagementPendingMembers={userManagementPendingMembers}
                  userManagementMembers={userManagementMembers}
                  normalizedMasterEmail={normalizedMasterEmail}
                  memberWorkspaceSummaryByUid={memberWorkspaceSummaryByUid}
                  userAccessEffectiveByUid={userAccessEffectiveByUid}
                  busyKey={busyKey}
                  userAccessDraftDirtyByUid={userAccessDraftDirtyByUid}
                  memberNameDraftByUid={memberNameDraftByUid}
                  setMemberNameDraftByUid={setMemberNameDraftByUid}
                  handleSaveMemberDisplayName={handleSaveMemberDisplayName}
                  handleApproveRequestGlobal={handleApproveRequestGlobal}
                  handleMemberModeration={handleMemberModeration}
                  handleSetUserAccessModeDraft={handleSetUserAccessModeDraft}
                  handleToggleUserWorkspaceDraft={handleToggleUserWorkspaceDraft}
                  handleSetUserWorkspaceLevelDraft={handleSetUserWorkspaceLevelDraft}
                  handleDiscardUserAccessDraft={handleDiscardUserAccessDraft}
                  handleSaveUserAccessDraft={handleSaveUserAccessDraft}
                  selectedWorkspaceId={selectedWorkspaceId}
                />
              </Suspense>
            )}

            {activeSection === 'clients' && (
              <Suspense
                fallback={(
                  <main className="workhub-section-stack">
                    <section className="workhub-panel">
                      <div className="workhub-empty-state">Loading client management…</div>
                    </section>
                  </main>
                )}
              >
                <WorkhubClientsSectionLazy
                  selectedClientId={selectedClientId}
                  setSelectedClientId={setSelectedClientId}
                  busyKey={busyKey}
                  handleCreateClientFromManager={handleCreateClientFromManager}
                  handleSaveClientDetails={handleSaveClientDetails}
                  handleDeleteClientDetails={handleDeleteClientDetails}
                  clients={clients}
                  projects={projects}
                  visibleWorkspaces={visibleWorkspaces}
                  workspaceDisplayNameById={workspaceDisplayNameById}
                  clientNameDraft={clientNameDraft}
                  setClientNameDraft={setClientNameDraft}
                  clientContactPersonDraft={clientContactPersonDraft}
                  setClientContactPersonDraft={setClientContactPersonDraft}
                  clientEmailDraft={clientEmailDraft}
                  setClientEmailDraft={setClientEmailDraft}
                  clientPhoneDraft={clientPhoneDraft}
                  setClientPhoneDraft={setClientPhoneDraft}
                  clientWebsiteDraft={clientWebsiteDraft}
                  setClientWebsiteDraft={setClientWebsiteDraft}
                  clientAddressDraft={clientAddressDraft}
                  setClientAddressDraft={setClientAddressDraft}
                  clientIndustryDraft={clientIndustryDraft}
                  setClientIndustryDraft={setClientIndustryDraft}
                  clientLogoUrlDraft={clientLogoUrlDraft}
                  setClientLogoUrlDraft={setClientLogoUrlDraft}
                  clientNotesDraft={clientNotesDraft}
                  setClientNotesDraft={setClientNotesDraft}
                  handleClientLogoFileUpload={handleClientLogoFileUpload}
                />
              </Suspense>
            )}

        {activeSection === 'notes' && (
          <Suspense
            fallback={(
              <main className="workhub-section-stack">
                <section className="workhub-panel">
                  <div className="workhub-empty-state">Loading document editor…</div>
                </section>
              </main>
            )}
          >
            <WorkhubNotesSectionLazy
              hookInput={{
                selectedDocument: selectedDocument ?? undefined,
                selectedWorkspaceId,
                workspaceProjectById,
                workhubShareCandidates,
                allWorkspaceIds: visibleWorkspaces.map((ws) => ({ id: ws.id, name: ws.name })),
                allWorkspaceProjects: projects.map((p) => ({ id: p.id, name: p.name, workspaceId: p.workspaceId, parentProjectId: p.parentProjectId || null })),
                isPrivilegedMember,
                showToast,
                setBusyKey,
                setSelectedDocumentId,
                createActivity: createWorkhubActivity,
                createNotifications: createWorkhubNotifications,
                deleteDocument: deleteWorkhubDocument,
                normalizeMemberUids,
              }}
              selectedDocument={selectedDocument ?? undefined}
              scopedWorkspaceDocuments={scopedWorkspaceDocuments}
              selectedProjectId={selectedProjectId}
              projectBrandingByProjectId={projectBrandingByProjectId}
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
              onOpenDocumentSettings={openDocumentSettingsDialog}
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
              onDiscussionDelete={handleDeleteComment}
              discussionDeleteBusyKey={busyKey}
              currentUid={auth.currentUser?.uid || ''}
              allWorkspaceIds={visibleWorkspaces.map((ws) => ({ id: ws.id, name: ws.name }))}
              allWorkspaceProjects={projects.map((p) => ({ id: p.id, name: p.name, workspaceId: p.workspaceId, parentProjectId: p.parentProjectId || null }))}
              isPrivilegedMember={isPrivilegedMember}
            />
          </Suspense>
        )}

        {activeSection === 'moodboard' && (
          <Suspense
            fallback={(
              <main className="workhub-section-stack">
                <section className="workhub-panel">
                  <div className="workhub-empty-state">Loading mood board editor…</div>
                </section>
              </main>
            )}
          >
            <WorkhubMoodboardSectionLazy
              isResolvingActiveMoodBoard={isResolvingActiveMoodBoard}
              activeMoodBoard={activeMoodBoard}
              selectedWorkspaceId={selectedWorkspaceId}
              resolvedMoodboardPanelMode={resolvedMoodboardPanelMode}
              setSelectedMoodBoardId={setSelectedMoodBoardId}
              setActiveSection={setActiveSection}
              showToast={showToast}
              activeMoodBoardChecklist={activeMoodBoardChecklist}
              moodBoardChecklistDraft={moodBoardChecklistDraft}
              setMoodBoardChecklistDraft={setMoodBoardChecklistDraft}
              moodBoardEditingChecklistId={moodBoardEditingChecklistId}
              setMoodBoardEditingChecklistId={setMoodBoardEditingChecklistId}
              moodBoardEditingChecklistText={moodBoardEditingChecklistText}
              setMoodBoardEditingChecklistText={setMoodBoardEditingChecklistText}
              comments={comments}
              currentUid={auth.currentUser?.uid || ''}
              memberByUid={memberByUid}
              formatTime={formatTime}
              editingCommentId={editingCommentId}
              editingCommentText={editingCommentText}
              onDiscussionEditStart={handleStartCommentEdit}
              onDiscussionEditChange={setEditingCommentText}
              onDiscussionEditCancel={handleCancelCommentEdit}
              onDiscussionEditSave={handleSaveCommentEdit}
              onDiscussionDelete={handleDeleteComment}
              onDiscussionSend={handleAddComment}
              busyKey={busyKey}
              normalizeColorInputValue={normalizeColorInputValue}
              hexToRgba={hexToRgba}
              getColorAlpha={getColorAlpha}
            />
          </Suspense>
        )}

        {activeSection === 'tasks' && !isEmployeeProfileFocus && (
          <Suspense
            fallback={(
              <main className="workhub-section-stack">
                <section className="workhub-panel">
                  <div className="workhub-empty-state">Loading tasks…</div>
                </section>
              </main>
            )}
          >
            <WorkhubTasksSectionLazy {...workhubTasksSectionProps} />
          </Suspense>
        )}


        {activeSection === 'home' && (
          <Suspense
            fallback={(
              <main className="workhub-section-stack">
                <section className="workhub-panel">
                  <div className="workhub-empty-state">Loading home…</div>
                </section>
              </main>
            )}
          >
            <WorkhubHomeSectionLazy
              selectedWorkspaceId={selectedWorkspaceId}
              selectedWorkspaceName={selectedWorkspace?.name || ''}
              selectedProjectDisplayName={selectedProject ? selectedProjectDisplayName : 'All projects'}
              taskTotal={taskCounts.total}
              membersWithAssignedTasks={tasksByAssignee.length}
              selectedWorkspaceHomeTemplate={selectedWorkspaceHomeTemplate}
              selectedWorkspaceWarning={selectedWorkspaceTemplateResolution.warning || ''}
              homeTemplateWidgets={homeTemplateWidgets}
              navigateToWorkspaceSection={navigateToWorkspaceSection}
              openWorkspaceSettings={openWorkspaceSettings}
            />
          </Suspense>
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
              {!isEmployeeProfileFocus && (
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
              )}
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
          approvedMembers={createRestrictedMemberCandidates}
          taskAssignableMembers={taskDialogAssignableMembers}
          busyKey={busyKey}
          canCreateProject={!!selectedWorkspaceId}
          canCreateTask={!!selectedWorkspaceId}
          canSetRestrictedProjects={isWorkhubAdmin}
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
          onProjectVisibilityChange={(nextVisibility) => {
            setProjectVisibility(isWorkhubAdmin ? nextVisibility : 'workspace')
          }}
          onProjectMemberToggle={(uid) => {
            if (!createRestrictedMemberUidSet.has(uid)) return
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

        <AddItemDialog
          isOpen={addItemDialogOpen}
          projectId={addItemProjectId}
          canCreateTask={canCreateTasksForIntent(projectIntentById[addItemProjectId] || 'project')}
          onClose={closeAddItemDialog}
          onCreateTask={() => { void handleCreateItem('task') }}
          onCreateDocument={() => { void handleCreateItem('document') }}
          onCreateNote={() => { void handleCreateItem('note') }}
          onCreateMoodBoard={() => { void handleCreateItem('moodboard') }}
        />

        <DocumentSettingsDialog
          isOpen={!!selectedDocumentSettingsTarget}
          busyKey={busyKey}
          document={selectedDocumentSettingsTarget}
          workspaceOptions={documentSettingsWorkspaceOptions}
          projectOptions={documentSettingsProjectOptions}
          workspaceId={documentSettingsWorkspaceIdDraft}
          projectId={documentSettingsProjectIdDraft}
          icon={documentSettingsIconDraft}
          accessVisibility={documentSettingsVisibilityDraft}
          accessMemberUids={documentSettingsMemberUidsDraft}
          canSetRestricted={isWorkhubAdmin}
          restrictableMembers={documentSettingsRestrictableMembers}
          onWorkspaceIdChange={handleDocumentSettingsWorkspaceChange}
          onProjectIdChange={setDocumentSettingsProjectIdDraft}
          onIconChange={setDocumentSettingsIconDraft}
          onVisibilityChange={(nextVisibility) => setDocumentSettingsVisibilityDraft(isWorkhubAdmin ? nextVisibility : 'workspace')}
          onToggleMember={(uid) => {
            if (!isWorkhubAdmin) return
            if (!documentSettingsRestrictableUidSet.has(uid)) return
            const checked = documentSettingsMemberUidsDraft.includes(uid)
            setDocumentSettingsMemberUidsDraft((current) => checked ? current.filter((item) => item !== uid) : [...current, uid])
          }}
          onClose={closeDocumentSettingsDialog}
          onSave={() => { void handleSaveDocumentSettings() }}
        />

        <MoodBoardSettingsDialog
          isOpen={!!selectedMoodBoardSettingsTarget}
          busyKey={busyKey}
          moodBoard={selectedMoodBoardSettingsTarget}
          workspaceOptions={documentSettingsWorkspaceOptions}
          projectOptions={documentSettingsProjectOptions}
          workspaceId={moodBoardSettingsWorkspaceIdDraft}
          projectId={moodBoardSettingsProjectIdDraft}
          title={moodBoardSettingsTitleDraft}
          accessVisibility={moodBoardSettingsVisibilityDraft}
          accessMemberUids={moodBoardSettingsMemberUidsDraft}
          canSetRestricted={isWorkhubAdmin}
          restrictableMembers={moodBoardSettingsRestrictableMembers}
          onWorkspaceIdChange={handleMoodBoardSettingsWorkspaceChange}
          onProjectIdChange={setMoodBoardSettingsProjectIdDraft}
          onTitleChange={setMoodBoardSettingsTitleDraft}
          onVisibilityChange={(nextVisibility) => setMoodBoardSettingsVisibilityDraft(isWorkhubAdmin ? nextVisibility : 'workspace')}
          onToggleMember={(uid) => {
            if (!isWorkhubAdmin) return
            if (!moodBoardSettingsRestrictableUidSet.has(uid)) return
            const checked = moodBoardSettingsMemberUidsDraft.includes(uid)
            setMoodBoardSettingsMemberUidsDraft((current) => checked ? current.filter((item) => item !== uid) : [...current, uid])
          }}
          onClose={closeMoodBoardSettingsDialog}
          onSave={() => { void handleSaveMoodBoardSettings() }}
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
          canManageProject={canSeeAllProjects}
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
          onCreateSubProject={(projectId) => { void handleQuickCreateProjectFromContext('folder', projectId) }}
          onCreateDocument={(projectId) => {
            void handleQuickCreateDocumentLikeFromContext('document', projectId || '')
          }}
          onCreateNote={(projectId) => { void handleQuickCreateDocumentLikeFromContext('note', projectId || '') }}
          onCreateTemplateEntity={(intent, projectId) => {
            if (intent === 'project') {
              void handleQuickCreateProjectFromContext('project', projectId || '')
              return
            }
            openWorkspaceTypeCreateDialog(intent, projectId || '')
          }}
          onCreateWorkspaceReport={(projectId) => {
            void handleCreatePipelineReportDocument(projectId || '')
          }}
          onRequestInlineRename={(projectId) => setPendingTreeInlineRename({ itemType: 'project', itemId: projectId })}
          onMoveProject={(projectId) => openProjectMoveDialog(projectId)}
          onCopyProjectLink={(projectId) => { void copyProjectDeepLink(projectId) }}
          onDeleteProject={(projectId) => { void handleDeleteProjectFromTree(projectId) }}
          onOpenSettings={(projectId) => setProjectAccessDialogId(projectId)}
          moodBoardEnabled={selectedWorkspace?.moodBoardEnabled !== false}
          onOpenFlowProjectLab={async (entityType, entityId) => {
            await createAndOpenMoodBoardVariantForEntity('flow', entityType, entityId)
          }}
          onOpenProsConsLab={async (entityType, entityId) => {
            await createAndOpenMoodBoardVariantForEntity('proscons', entityType, entityId)
          }}
          onOpenMoodBoard={async (entityType, entityId) => {
            await createAndOpenMoodBoardVariantForEntity('classic', entityType, entityId)
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
          settingsFolderNotifications={settingsProjectFolderNotifications}
          settingsFolderNotificationsBusy={settingsProjectFolderNotificationsBusy}
          settingsClientId={settingsProjectClientId}
          settingsStorageMethod={settingsStorageMethod}
          accessVisibility={accessVisibility}
          accessMemberUids={accessMemberUids}
          hiddenFromSupporters={accessVisibility === 'restricted'}
          canToggleHiddenFromSupporters={isWorkhubAdmin}
          restrictableMembers={selectedAccessProjectRestrictedMemberCandidates}
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
          onFolderNotificationsChange={handleSaveProjectFolderNotificationSettings}
          onApplyViewSettingsToSubItems={() => { void handleApplyViewSettingsToSubItems() }}
          applyViewSettingsBusy={busyKey === `access-propagate:${selectedAccessProject?.id || ''}`}
          onClientChange={setSettingsProjectClientId}
          onCreateClientInline={handleCreateClientInline}
          onStorageMethodChange={setSettingsStorageMethod}
          onVisibilityChange={setAccessVisibility}
          onHiddenFromSupportersChange={(hidden) => setAccessVisibility(hidden ? 'restricted' : 'workspace')}
          onToggleMember={(uid) => {
            if (selectedAccessProjectEffectiveIntent === 'project' && !isWorkhubAdmin) return
            if (!selectedAccessProjectRestrictedMemberUidSet.has(uid)) return
            const checked = accessMemberUids.includes(uid)
            setAccessMemberUids((current) => checked ? current.filter((item) => item !== uid) : [...current, uid])
          }}
          onDelete={handleDeleteProject}
          onSave={handleSaveProjectAccess}
          onEnsureDriveFolder={handleEnsureDriveFolder}
          milestones={milestones.milestones}
          milestoneProgress={milestones.milestoneProgress}
          canEditMilestones={isPrivilegedMember}
          onAddMilestone={milestones.handleOpenCreateMilestone}
          onEditMilestone={milestones.handleOpenEditMilestone}
          onDeleteMilestone={milestones.handleDeleteMilestone}
          onStatusChangeMilestone={milestones.handleStatusChange}
        />

        <MilestoneCreateEditDialog
          open={milestones.milestoneDialogOpen}
          milestone={milestones.editingMilestone}
          project={selectedAccessProject}
          onSave={(formData) => { void milestones.handleSaveMilestone(formData) }}
          onClose={milestones.handleCloseMilestoneDialog}
        />

        <WorkspaceBrowserDialog
          open={!!taskMoveDialogState}
          title="Move task"
          confirmLabel="Move task"
          workspaces={workspaceBrowserWorkspaces}
          projects={workspaceBrowserProjects}
          initialWorkspaceId={taskMoveDialogState?.workspaceId || ''}
          initialProjectId={taskMoveDialogState?.projectId || ''}
          allowWorkspaceChange={false}
          onClose={() => setTaskMoveDialogState(null)}
          onConfirm={(workspaceId, projectId) => { void handleMoveTaskToProject(workspaceId, projectId) }}
        />

        <WorkspaceBrowserDialog
          open={!!projectMoveDialogState}
          title="Move folder"
          confirmLabel="Move folder"
          workspaces={workspaceBrowserWorkspaces}
          projects={workspaceBrowserProjects}
          initialWorkspaceId={projectMoveDialogState?.workspaceId || ''}
          initialProjectId={projectMoveDialogState?.parentProjectId || ''}
          allowWorkspaceChange={false}
          onClose={() => setProjectMoveDialogState(null)}
          onConfirm={(workspaceId, projectId) => { void handleMoveProjectToFolder(workspaceId, projectId) }}
        />

        <WorkspaceBrowserDialog
          open={!!treeItemMoveDialogState}
          title={treeItemMoveDialogState?.itemType === 'moodboard' ? 'Move mood board' : 'Move document'}
          confirmLabel={treeItemMoveDialogState?.itemType === 'moodboard' ? 'Move mood board' : 'Move document'}
          workspaces={workspaceBrowserWorkspaces}
          projects={workspaceBrowserProjects}
          initialWorkspaceId={treeItemMoveDialogState?.workspaceId || ''}
          initialProjectId={treeItemMoveDialogState?.projectId || ''}
          allowWorkspaceChange={false}
          onClose={() => setTreeItemMoveDialogState(null)}
          onConfirm={(workspaceId, projectId) => { void handleMoveTreeItemToProject(workspaceId, projectId) }}
        />

        {lightboxImageUrl && activeImageReview && (
          <div className="workhub-modal-backdrop workhub-image-review-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) setLightboxImageUrl('') }}>
            <div className="workhub-modal workhub-image-review-modal" onMouseDown={(event) => event.stopPropagation()}>
              <div className="workhub-image-review-topbar">
                <div className="workhub-image-review-topbar-title">
                  <span className="workhub-image-review-topbar-label">Image review</span>
                  <span className="workhub-image-review-topbar-hint">Tap image to place markers · Double-click marker to edit</span>
                </div>
                <button className="workhub-ghost-btn workhub-image-review-close-btn" onClick={() => { setLightboxImageUrl(''); setLightboxCompareMode(false); setLightboxCompareBeforeUrl(''); setLightboxCompareAfterUrl('') }}>Close</button>
              </div>

              <div className="workhub-image-review-layout">
                <div className="workhub-image-review-stage-wrap">
                  <div className="workhub-image-review-toolbar">
                    {!lightboxCompareMode && (
                      <>
                        <div className="workhub-image-tool-group">
                          <button type="button" className={lightboxTool === 'point' ? 'is-active' : ''} onClick={() => setLightboxTool('point')}>Point</button>
                          <button type="button" className={lightboxTool === 'line' ? 'is-active' : ''} onClick={() => setLightboxTool('line')}>Line</button>
                          <button type="button" className={lightboxTool === 'checkbox' ? 'is-active' : ''} onClick={() => setLightboxTool('checkbox')}>Checkbox</button>
                        </div>
                        <span className="workhub-image-review-tip">
                          {lightboxTool === 'line' && lightboxDraftLine ? 'Tap second point to finish line' : 'Tap image to add annotation'}
                        </span>
                        <div className="workhub-image-review-fit-group">
                          <button type="button" className={lightboxImageFit === 'contain' ? 'is-active' : ''} onClick={() => setLightboxImageFit('contain')}>Fit</button>
                          <button type="button" className={lightboxImageFit === 'cover' ? 'is-active' : ''} onClick={() => setLightboxImageFit('cover')}>Fill</button>
                          <button type="button" className={lightboxImageFit === 'scale-down' ? 'is-active' : ''} onClick={() => setLightboxImageFit('scale-down')}>Smart</button>
                        </div>
                        <button type="button" onClick={() => { void handleLightboxFullscreenToggle() }}>Fullscreen</button>
                      </>
                    )}
                    <button
                      type="button"
                      className={lightboxCompareMode ? 'is-active' : ''}
                      onClick={() => {
                        if (!lightboxCompareMode) {
                          setLightboxCompareMode(true)
                          setLightboxCompareBeforeUrl(lightboxImageUrl)
                          setLightboxCompareAfterUrl('')
                        } else {
                          setLightboxCompareMode(false)
                          setLightboxCompareBeforeUrl('')
                          setLightboxCompareAfterUrl('')
                        }
                      }}
                    >
                      Compare
                    </button>
                  </div>

                  {lightboxCompareMode ? (
                    <div className="workhub-image-compare-wrap">
                      <div className="workhub-image-compare-inputs">
                        <label className="workhub-image-compare-input-row">
                          <span>Before</span>
                          <input
                            type="url"
                            value={lightboxCompareBeforeUrl}
                            onChange={(e) => setLightboxCompareBeforeUrl(e.target.value)}
                            placeholder="Before image URL"
                          />
                        </label>
                        <label className="workhub-image-compare-input-row">
                          <span>After</span>
                          <input
                            type="url"
                            value={lightboxCompareAfterUrl}
                            onChange={(e) => setLightboxCompareAfterUrl(e.target.value)}
                            placeholder="After image URL"
                          />
                        </label>
                      </div>
                      {lightboxCompareBeforeUrl && lightboxCompareAfterUrl ? (
                        <div className="workhub-image-compare-stage">
                          <img-comparison-slider value={50} style={{ width: '100%', height: '100%', display: 'block' }}>
                            <img slot="first" src={lightboxCompareBeforeUrl} alt="Before" style={{ width: '100%', display: 'block' }} />
                            <img slot="second" src={lightboxCompareAfterUrl} alt="After" style={{ width: '100%', display: 'block' }} />
                          </img-comparison-slider>
                        </div>
                      ) : (
                        <div className="workhub-image-compare-placeholder">
                          Enter both Before and After image URLs above to preview the comparison.
                        </div>
                      )}
                    </div>
                  ) : (
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
                  )}
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

        {folderDeleteTarget && (
          <div className="workhub-modal-backdrop workhub-delete-prompt-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && busyKey !== `project-delete:${folderDeleteTarget.id}`) handleCancelFolderDelete() }}>
            <div className="workhub-modal workhub-delete-prompt-modal" onMouseDown={(event) => event.stopPropagation()}>
              <div className="workhub-modal-head">
                <div>
                  <h2>Delete folder</h2>
                  <p>Are you sure you want to delete this folder?</p>
                </div>
                <button className="workhub-ghost-btn" disabled={busyKey === `project-delete:${folderDeleteTarget.id}`} onClick={handleCancelFolderDelete}>✕</button>
              </div>
              <div className="workhub-delete-prompt-filename">
                <span>🗑</span>
                <span>{folderDeleteTarget.name}</span>
              </div>
              <div className="workhub-delete-prompt-actions">
                <button
                  type="button"
                  className="workhub-danger-btn"
                  disabled={busyKey === `project-delete:${folderDeleteTarget.id}`}
                  onClick={() => { void handleConfirmFolderDelete() }}
                >
                  {busyKey === `project-delete:${folderDeleteTarget.id}` ? 'Deleting…' : 'Delete folder'}
                </button>
                <button type="button" className="workhub-ghost-btn" disabled={busyKey === `project-delete:${folderDeleteTarget.id}`} onClick={handleCancelFolderDelete}>
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

      <WorkhubStyles phoneMaxWidth={WORKHUB_PHONE_MAX_WIDTH} />
    </div>
  )
}

