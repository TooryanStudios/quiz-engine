import { addDoc, arrayRemove, arrayUnion, collection, deleteDoc, deleteField, doc, getDoc, getDocs, limit, onSnapshot as firestoreOnSnapshot, orderBy, query, runTransaction, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from './firebase'
import {
  buildWorkhubProsConsDefaults,
  buildWorkhubProsConsPersistencePayload,
  type WorkhubMoodBoardProsCons,
} from './workhubProsCons'

export type WorkhubMemberStatus = 'pending' | 'approved' | 'suspended'
export type WorkhubMemberRole = 'member' | 'manager' | 'admin'
export type WorkhubVisibility = 'workspace' | 'restricted'
export type WorkhubTaskStatus = string
export type WorkhubTaskPriority = 'low' | 'medium' | 'high' | 'urgent'
export type WorkhubProjectType = 'tender' | 'lead' | 'direct_award' | 'other'
export type WorkhubProjectPriority = 'low' | 'medium' | 'high' | 'critical'
export type WorkhubProjectIntent =
  | 'project'
  | 'proposal'
  | 'lead'
  | 'finance_invoice_stream'
  | 'finance_payment_cycle'
  | 'marketing_campaign'
  | 'marketing_content_stream'
  | 'hr_requisition'
  | 'hr_onboarding_track'

export interface WorkhubTaskStatusConfig {
  id: string
  label: string
  color: string
}

export interface WorkhubProjectColorMeaningConfig {
  color: string
  label: string
  hint: string
}

export interface WorkhubMember {
  uid: string
  email: string
  displayName: string
  photoURL: string
  status: WorkhubMemberStatus
  role: WorkhubMemberRole
  emailAccessEnabled?: boolean
  emailActivityEnabled?: boolean
  requestedAt?: unknown
  approvedAt?: unknown
  approvedBy?: string
  lastSeenAt?: unknown
}

export interface WorkhubWorkspace {
  id: string
  name: string
  description: string
  type: 'technical' | 'hr' | 'finance'
  treeMetaDisplayMode?: 'counts' | 'countdown' | 'progress'
  taskDueDisplayMode?: 'remaining' | 'date'
  showProjectColorDots?: boolean
  templateId?: string
  taskStatuses?: WorkhubTaskStatusConfig[]
  projectColorMeanings?: WorkhubProjectColorMeaningConfig[]
  accessMemberUids?: string[]
  memberAccessLevels?: Record<string, 'full' | 'custom'>
  invitedEmails?: string[]
  moodBoardEnabled?: boolean
  activityWindowDays?: 7 | 14 | 30
  createdBy: string
  createdAt?: unknown
}

export interface WorkhubProject {
  id: string
  workspaceId: string
  parentProjectId?: string | null
  sortOrder?: number
  intent?: WorkhubProjectIntent
  mainPanelView?: 'tasks' | 'dashboard' | 'dashboard_with_details'
  taskItemDisplayMode?: 'inherit' | 'list' | 'cards' | 'grid' | 'timeline'
  valueAmount?: number
  valueCurrency?: string
  tenderNumber?: string
  proposalId?: string
  technicalProposalUrl?: string
  financialProposalUrl?: string
  name: string
  description: string
  color: string
  visibility: WorkhubVisibility
  memberUids: string[]
  projectStartDate?: string
  projectDeadline?: string
  projectType?: WorkhubProjectType
  submissionTime?: string
  proposalServices?: string[]
  priority?: WorkhubProjectPriority
  clientId?: string
  notes?: string
  taskStatuses?: WorkhubTaskStatusConfig[]
  userPreferences?: Record<string, WorkhubProjectUserPreference>
  attachments?: string[]
  attachmentTitles?: Record<string, string>
  driveFolderId?: string
  storageMethod?: 'firebase' | 'drive'
  createdBy: string
  createdAt?: unknown
  updatedAt?: unknown
  notesUpdatedAt?: unknown
  notesUpdatedBy?: string
}

export type WorkhubFolderNotifyDelivery = 'in_app' | 'both'

export interface WorkhubProjectNotificationPreference {
  id: string
  workspaceId: string
  projectId: string
  userUid: string
  enabled: boolean
  taskCreated: boolean
  taskCompleted: boolean
  folderCompleted: boolean
  delivery: WorkhubFolderNotifyDelivery
  createdAt?: unknown
  updatedAt?: unknown
}

export interface WorkhubProjectUserPreference {
  taskItemDisplayMode?: 'list' | 'cards' | 'grid' | 'timeline'
  updatedAt?: unknown
}

export interface WorkhubDocumentChecklistItem {
  id: string
  text: string
  completed: boolean
}

export interface WorkhubDocumentEditEntry {
  uid: string
  at: string
}

export interface WorkhubDocumentTab {
  id: string
  title: string
  icon?: string
  body: string
}

export type WorkhubDocumentPageSize = 'A4' | 'Letter' | 'Legal' | 'A3'
export type WorkhubDocumentPageOrientation = 'portrait' | 'landscape'
export type WorkhubDocumentPrintContentMode = 'structured' | 'html'

export interface WorkhubDocumentPrintBlock {
  mode?: WorkhubDocumentPrintContentMode
  html?: string
  logoUrl?: string
  title?: string
  subtitle?: string
  address?: string
  signatureLabel?: string
  showDocumentTitle?: boolean
}

export interface WorkhubDocumentMasterPageVariant {
  showHeader?: boolean
  showFooter?: boolean
  showPageNumbers?: boolean
  header?: WorkhubDocumentPrintBlock
  footer?: WorkhubDocumentPrintBlock
}

export interface WorkhubDocumentMasterPage {
  pageSize?: WorkhubDocumentPageSize
  orientation?: WorkhubDocumentPageOrientation
  marginTopMm?: number
  marginRightMm?: number
  marginBottomMm?: number
  marginLeftMm?: number
  firstPage?: WorkhubDocumentMasterPageVariant
  laterPages?: WorkhubDocumentMasterPageVariant

  // Cover page
  showCoverPage?: boolean
  /** Which date to display on the cover: 'none' | 'creation' | 'print' */
  coverDateMode?: 'none' | 'creation' | 'print'
  /** Whether to show the document name on the cover page. Default true. */
  coverShowDocumentName?: boolean
  /** Whether to show the active tab name on the cover page. Default true. */
  coverShowTabName?: boolean
  /** Visual theme for the cover page. One of the COVER_THEMES ids. Default 'warm'. */
  coverTheme?: string
  /** Custom tag line shown above the title on the cover page. */
  coverTagLine?: string

  // Watermark
  showWatermark?: boolean
  /** URL of the image to use as a per-page watermark (typically outline logo). */
  watermarkLogoUrl?: string
  /** Scale of the center watermark as a percentage 10–100. Default 50. */
  watermarkScale?: number
  /** Opacity of the center watermark as a percentage 1–30. Default 8. */
  watermarkOpacity?: number
  /** Layout mode: 'center' = single centered mark, 'triple' = center + top-right + bottom-left corners. */
  watermarkLayout?: 'center' | 'triple'
  /** Opacity of the corner watermarks as a percentage 1–20. Default 5. */
  watermarkCornerOpacity?: number
  /** Size of the corner watermarks as a percentage of page width 10–80. Default 30. */
  watermarkCornerScale?: number

  // Legacy flat fields kept for backward compatibility with Phase 1 documents.
  headerHtml?: string
  footerHtml?: string
  showHeader?: boolean
  showFooter?: boolean
  showPageNumbers?: boolean
}

export interface WorkhubDocument {
  id: string
  workspaceId: string
  projectId?: string | null
  sortOrder?: number
  hasOutgoingReferences?: boolean
  referenceSourceDocumentId?: string | null
  referenceSourceWorkspaceId?: string | null
  referenceSourceProjectId?: string | null
  referenceTabIds?: string[]
  type?: 'document' | 'note'
  icon?: string
  title: string
  body: string
  tabs?: WorkhubDocumentTab[]
  masterPage?: WorkhubDocumentMasterPage
  checklist?: WorkhubDocumentChecklistItem[]
  attachments?: string[]
  links?: string[]
  editedBy?: WorkhubDocumentEditEntry[]
  isLocked?: boolean
  lockedBy?: string | null
  lockedAt?: unknown
  shareToken?: string | null
  shareEnabled?: boolean
  visibility: WorkhubVisibility
  memberUids: string[]
  editMemberUids?: string[]
  notifyMode?: 'all' | 'selected' | 'none'
  notifyUids?: string[]
  createdBy: string
  createdAt?: unknown
  updatedAt?: unknown
}

export interface WorkhubDocumentDraft {
  id: string
  workspaceId: string
  documentId: string
  userUid: string
  title: string
  body: string
  tabs?: WorkhubDocumentTab[]
  activeTabId?: string
  masterPage?: WorkhubDocumentMasterPage
  createdAt?: unknown
  updatedAt?: unknown
}

export type WorkhubMilestoneStatus = 'not_started' | 'in_progress' | 'completed' | 'at_risk'

export interface WorkhubMilestone {
  id: string
  workspaceId: string
  projectId: string
  name: string
  description?: string
  dueDate?: string
  status: WorkhubMilestoneStatus
  color?: string
  sortOrder: number
  createdBy: string
  createdAt?: unknown
  updatedAt?: unknown
}

export interface WorkhubTask {
  id: string
  workspaceId: string
  projectId: string
  milestoneId?: string | null
  sortOrder?: number
  title: string
  description: string
  attachments?: string[]
  attachmentTitles?: Record<string, string>
  imageUrls?: string[]
  links?: string[]
  linkTitles?: Record<string, string>
  linkCreatedBy?: Record<string, string>
  visibility: WorkhubVisibility
  memberUids: string[]
  status: WorkhubTaskStatus
  priority: WorkhubTaskPriority
  assigneeUid: string
  assigneeUids?: string[]
  startDate?: string
  dueDate: string
  dueTime?: string
  checklist?: WorkhubTaskChecklistItem[]
  valueAmount?: number
  valueCurrency?: string
  completedAt?: string
  createdBy: string
  createdAt?: unknown
  updatedAt?: unknown
  notifyMode?: 'all' | 'selected' | 'none'
  notifyUids?: string[]
}

export interface WorkhubTaskChecklistItem {
  id: string
  text: string
  completed: boolean
  valueAmount?: number
  details?: string
  attachments?: string[]
  imageUrls?: string[]
  links?: string[]
}

export interface WorkhubTaskComment {
  id: string
  workspaceId: string
  taskId?: string
  entityType?: 'task' | 'project' | 'document'
  entityId?: string
  authorUid: string
  body: string
  likedByUids?: string[]
  reactionByUid?: Record<string, string>
  createdAt?: unknown
  updatedAt?: unknown
  editedAt?: unknown
}

export interface WorkhubActivity {
  id: string
  workspaceId: string
  actorUid: string
  entityType: 'workspace' | 'project' | 'task' | 'comment' | 'member' | 'document' | 'moodboard'
  entityId: string
  action: string
  message: string
  visibility?: WorkhubVisibility
  memberUids?: string[]
  createdAt?: unknown
  // Chat-specific fields
  threadId?: string
  replyToActivityId?: string
  imageUrl?: string
  targetPath?: string
  messagePriority?: WorkhubChatMessagePriority
  messageDeliveryState?: WorkhubChatMessageDeliveryState
  messageReactions?: Record<string, string>
  receivedByUids?: string[]
  readByUids?: string[]
  editedAt?: unknown
  deletedAt?: unknown
  deletedBy?: string
}

export type WorkhubChatMessagePriority = 'normal' | 'high'
export type WorkhubChatMessageDeliveryState = 'ok' | 'failed'

export interface WorkhubNotification {
  id: string
  workspaceId: string
  recipientUid: string
  actorUid: string
  entityType: 'workspace' | 'project' | 'task' | 'comment' | 'member' | 'document' | 'moodboard'
  entityId: string
  action: string
  message: string
  projectId?: string
  targetPath?: string
  threadId?: string
  activityId?: string
  imageUrl?: string
  commentPreview?: string
  messagePriority?: WorkhubChatMessagePriority
  delivery?: WorkhubFolderNotifyDelivery
  read: boolean
  createdAt?: unknown
}

export interface WorkhubClient {
  id: string
  workspaceId: string
  name: string
  contactPerson?: string
  email?: string
  phone?: string
  website?: string
  address?: string
  industry?: string
  logoUrl?: string
  notes?: string
  createdBy: string
  createdAt?: unknown
  updatedAt?: unknown
}

export interface WorkhubCompanyService {
  id: string
  name: string
  normalizedName: string
  createdBy: string
  createdAt?: unknown
  updatedAt?: unknown
}

const membersCol = collection(db, 'workhub_members')
const workspacesCol = collection(db, 'workhub_workspaces')
const projectsCol = collection(db, 'workhub_projects')
const documentsCol = collection(db, 'workhub_documents')
const tasksCol = collection(db, 'workhub_tasks')
const commentsCol = collection(db, 'workhub_task_comments')
const activityCol = collection(db, 'workhub_activity')
const notificationsCol = collection(db, 'workhub_notifications')
const projectNotificationPrefsCol = collection(db, 'workhub_project_notification_prefs')
const clientsCol = collection(db, 'workhub_clients')
const documentDraftsCol = collection(db, 'workhub_document_drafts')
const milestonesCol = collection(db, 'workhub_milestones')
const companyServicesCol = collection(db, 'workhub_company_services')

function getTimeValue(value: unknown): number {
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

function sortByNewest<T extends { createdAt?: unknown }>(items: T[]): T[] {
  return [...items].sort((a, b) => getTimeValue(b.createdAt) - getTimeValue(a.createdAt))
}

function getProjectOrderValue(project: Pick<WorkhubProject, 'sortOrder' | 'createdAt'>): number {
  if (typeof project.sortOrder === 'number' && Number.isFinite(project.sortOrder)) {
    return project.sortOrder
  }
  return getTimeValue(project.createdAt)
}

function sortProjects(items: WorkhubProject[]): WorkhubProject[] {
  return [...items].sort((a, b) => {
    const orderDelta = getProjectOrderValue(a) - getProjectOrderValue(b)
    if (orderDelta !== 0) return orderDelta
    return getTimeValue(a.createdAt) - getTimeValue(b.createdAt)
  })
}

function getTaskOrderValue(task: Pick<WorkhubTask, 'sortOrder' | 'createdAt'>): number {
  if (typeof task.sortOrder === 'number' && Number.isFinite(task.sortOrder)) {
    return task.sortOrder
  }
  return getTimeValue(task.createdAt)
}

function sortTasks(items: WorkhubTask[]): WorkhubTask[] {
  return [...items].sort((a, b) => {
    const orderDelta = getTaskOrderValue(a) - getTaskOrderValue(b)
    if (orderDelta !== 0) return orderDelta
    return getTimeValue(a.createdAt) - getTimeValue(b.createdAt)
  })
}

function sortDocuments(items: WorkhubDocument[]): WorkhubDocument[] {
  return [...items].sort((a, b) => {
    const leftOrder = typeof a.sortOrder === 'number' && Number.isFinite(a.sortOrder)
      ? a.sortOrder
      : getTimeValue(a.createdAt)
    const rightOrder = typeof b.sortOrder === 'number' && Number.isFinite(b.sortOrder)
      ? b.sortOrder
      : getTimeValue(b.createdAt)
    if (leftOrder !== rightOrder) return leftOrder - rightOrder
    return getTimeValue(a.createdAt) - getTimeValue(b.createdAt)
  })
}

function sortMoodBoards(items: WorkhubMoodBoard[]): WorkhubMoodBoard[] {
  return [...items].sort((left, right) => {
    const leftOrder = typeof left.sortOrder === 'number' && Number.isFinite(left.sortOrder)
      ? left.sortOrder
      : getTimeValue(left.createdAt)
    const rightOrder = typeof right.sortOrder === 'number' && Number.isFinite(right.sortOrder)
      ? right.sortOrder
      : getTimeValue(right.createdAt)
    const orderDelta = leftOrder - rightOrder
    if (orderDelta !== 0) return orderDelta
    const titleDelta = (left.title || '').localeCompare(right.title || '')
    if (titleDelta !== 0) return titleDelta
    return left.id.localeCompare(right.id)
  })
}

function mergeDocumentsById(groups: WorkhubDocument[][]) {
  const map = new Map<string, WorkhubDocument>()
  groups.flat().forEach((item) => {
    map.set(item.id, item)
  })
  return sortDocuments(Array.from(map.values()))
}

function sortMembers(items: WorkhubMember[]): WorkhubMember[] {
  return [...items].sort((a, b) => {
    const statusRank: Record<WorkhubMemberStatus, number> = { pending: 0, approved: 1, suspended: 2 }
    const statusDelta = statusRank[a.status] - statusRank[b.status]
    if (statusDelta !== 0) return statusDelta
    return a.displayName.localeCompare(b.displayName)
  })
}

function mergeById<T extends { id: string; createdAt?: unknown }>(groups: T[][]) {
  const map = new Map<string, T>()
  groups.flat().forEach((item) => {
    map.set(item.id, item)
  })
  return sortByNewest(Array.from(map.values()))
}

function mergeProjectsById(groups: WorkhubProject[][]) {
  const map = new Map<string, WorkhubProject>()
  groups.flat().forEach((item) => {
    map.set(item.id, item)
  })
  return sortProjects(Array.from(map.values()))
}

function mergeTasksById(groups: WorkhubTask[][]) {
  const map = new Map<string, WorkhubTask>()
  groups.flat().forEach((item) => {
    map.set(item.id, item)
  })
  return sortTasks(Array.from(map.values()))
}

function sortClients(items: WorkhubClient[]) {
  return [...items].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
}

function sortCompanyServices(items: WorkhubCompanyService[]) {
  return [...items].sort((a, b) => (a.name || '').localeCompare(b.name || ''))
}

function normalizeCompanyServiceName(value: string): string {
  return value.trim().replace(/\s+/g, ' ')
}

function normalizeCompanyServiceKey(value: string): string {
  return normalizeCompanyServiceName(value).toLowerCase()
}

function mergeClientsById(groups: WorkhubClient[][]) {
  const map = new Map<string, WorkhubClient>()
  groups.flat().forEach((item) => {
    map.set(item.id, item)
  })
  return sortClients(Array.from(map.values()))
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== 'object') return false
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

function stripUndefinedDeep<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .map((item) => stripUndefinedDeep(item))
      .filter((item) => item !== undefined) as T
  }

  if (!isPlainObject(value)) return value

  const next: Record<string, unknown> = {}
  Object.entries(value).forEach(([key, entryValue]) => {
    if (entryValue === undefined) return
    next[key] = stripUndefinedDeep(entryValue)
  })
  return next as T
}

function normalizeChecklistItems(items: WorkhubTaskChecklistItem[] | null | undefined): WorkhubTaskChecklistItem[] {
  const usedIds = new Set<string>()
  return (items || []).map((item, index) => {
    const baseId = typeof item?.id === 'string' && item.id.trim()
      ? item.id.trim()
      : `chk_${index + 1}`
    let nextId = baseId
    let suffix = 1
    while (usedIds.has(nextId)) {
      nextId = `${baseId}_${suffix++}`
    }
    usedIds.add(nextId)

    return stripUndefinedDeep({
      ...item,
      id: nextId,
      text: typeof item?.text === 'string' ? item.text : '',
      completed: !!item?.completed,
    }) as WorkhubTaskChecklistItem
  })
}

function normalizeMemberUids(uids: string[] | null | undefined): string[] {
  return Array.from(new Set((uids || []).filter((uid): uid is string => typeof uid === 'string' && uid.length > 0)))
}

function safeListen(start: () => (() => void), onFailure?: () => void) {
  try {
    return start()
  } catch (error) {
    console.error('[workhubRepo] Failed to start Firestore listener', error)
    onFailure?.()
    return () => undefined
  }
}

const onSnapshot: typeof firestoreOnSnapshot = ((...args: Parameters<typeof firestoreOnSnapshot>) => {
  try {
    return firestoreOnSnapshot(...args)
  } catch (error) {
    console.error('[workhubRepo] onSnapshot setup failed', error)
    const maybeErrorHandler = args[2]
    if (typeof maybeErrorHandler === 'function') {
      ;(maybeErrorHandler as (error: unknown) => void)(error)
    }
    return () => undefined
  }
}) as typeof firestoreOnSnapshot

export function subscribeOwnWorkhubMember(uid: string, onData: (member: WorkhubMember | null) => void) {
  return safeListen(
    () => onSnapshot(
      doc(db, 'workhub_members', uid),
      (snap) => {
        onData(snap.exists() ? ({ uid: snap.id, ...snap.data() } as WorkhubMember) : null)
      },
      () => onData(null),
    ),
    () => onData(null),
  )
}

export function subscribeAllWorkhubMembers(onData: (members: WorkhubMember[]) => void) {
  return safeListen(
    () => onSnapshot(
      membersCol,
      (snap) => {
        onData(sortMembers(snap.docs.map((item) => ({ uid: item.id, ...item.data() } as WorkhubMember))))
      },
      () => onData([]),
    ),
    () => onData([]),
  )
}

export async function requestWorkhubAccess(): Promise<WorkhubMember> {
  const fn = httpsCallable<undefined, { member: WorkhubMember }>(functions, 'requestWorkhubAccess')
  const result = await fn()
  return result.data.member
}

export async function setWorkhubMemberStatus(input: { uid: string; status: WorkhubMemberStatus; role?: WorkhubMemberRole; reason?: string }): Promise<WorkhubMember> {
  const fn = httpsCallable<typeof input, { member: WorkhubMember }>(functions, 'setWorkhubMemberStatus')
  const result = await fn(input)
  return result.data.member
}

export async function updateWorkhubMemberProfile(input: { uid: string; displayName: string }): Promise<WorkhubMember> {
  const fn = httpsCallable<typeof input, { member: WorkhubMember }>(functions, 'updateWorkhubMemberProfile')
  const result = await fn(input)
  return result.data.member
}

export async function updateOwnWorkhubEmailPreferences(input: { emailAccessEnabled?: boolean; emailActivityEnabled?: boolean }): Promise<WorkhubMember> {
  const fn = httpsCallable<typeof input, { member: WorkhubMember }>(functions, 'updateOwnWorkhubEmailPreferences')
  const result = await fn(input)
  return result.data.member
}

export async function uploadWorkhubAttachmentToDrive(input: { fileName: string; contentType: string; dataBase64: string; parentFolderId?: string }): Promise<{ url: string; fileId: string; fileName: string }> {
  const fn = httpsCallable<typeof input, { url: string; fileId: string; fileName: string }>(functions, 'uploadWorkhubAttachmentToDrive')
  const result = await fn(input)
  return result.data
}

export async function ensureWorkhubDriveProjectFolder(input: { projectId: string; projectName: string }): Promise<{ folderId: string }> {
  const fn = httpsCallable<typeof input, { folderId: string }>(functions, 'ensureWorkhubDriveProjectFolder')
  const result = await fn(input)
  return result.data
}

export async function deleteWorkhubAttachmentFromDrive(fileId: string): Promise<{ success: boolean }> {
  const fn = httpsCallable<{ fileId: string }, { success: boolean }>(functions, 'deleteWorkhubAttachmentFromDrive')
  const result = await fn({ fileId })
  return result.data
}

export function subscribeWorkhubWorkspaces(onData: (items: WorkhubWorkspace[]) => void) {
  return safeListen(
    () => onSnapshot(
      workspacesCol,
      (snap) => {
        onData(sortByNewest(snap.docs.map((item) => ({ id: item.id, ...item.data() } as WorkhubWorkspace))))
      },
      () => onData([]),
    ),
    () => onData([]),
  )
}

export async function createWorkhubWorkspace(input: { name: string; description: string; type: 'technical' | 'hr' | 'finance'; templateId?: string; createdBy: string }): Promise<string> {
  const payload: Record<string, unknown> = {
    name: input.name,
    description: input.description,
    type: input.type,
    createdBy: input.createdBy,
    createdAt: serverTimestamp(),
  }
  if (input.templateId) {
    payload.templateId = input.templateId
  }
  const docRef = await addDoc(workspacesCol, payload)
  return docRef.id
}

export async function updateWorkhubWorkspace(
  workspaceId: string,
  patch: Partial<Pick<WorkhubWorkspace, 'name' | 'description' | 'type' | 'treeMetaDisplayMode' | 'taskDueDisplayMode' | 'showProjectColorDots' | 'templateId' | 'taskStatuses' | 'projectColorMeanings' | 'accessMemberUids' | 'memberAccessLevels' | 'invitedEmails' | 'activityWindowDays'>>,
) {
  await updateDoc(doc(db, 'workhub_workspaces', workspaceId), {
    ...patch,
  })
}

export async function deleteWorkhubWorkspace(workspaceId: string) {
  await deleteDoc(doc(db, 'workhub_workspaces', workspaceId))
}

export function subscribeWorkhubClients(workspaceId: string, onData: (items: WorkhubClient[]) => void) {
  const q = query(clientsCol, where('workspaceId', '==', workspaceId))
  return safeListen(
    () => onSnapshot(
      q,
      (snap) => {
        const clients = snap.docs.map((item) => ({ id: item.id, ...item.data() } as WorkhubClient))
        onData(sortClients(clients))
      },
      () => onData([]),
    ),
    () => onData([]),
  )
}

export function subscribeWorkhubClientsMulti(workspaceIds: string[], onData: (items: WorkhubClient[]) => void) {
  const uniqueIds = Array.from(new Set(workspaceIds.filter(Boolean)))
  if (!uniqueIds.length) {
    onData([])
    return () => {}
  }

  const chunkSize = 10
  const idChunks: string[][] = []
  for (let index = 0; index < uniqueIds.length; index += chunkSize) {
    idChunks.push(uniqueIds.slice(index, index + chunkSize))
  }

  let bucketedItems: WorkhubClient[][] = idChunks.map(() => [])
  const emit = () => onData(mergeClientsById(bucketedItems))

  const unsubscribers = idChunks.map((chunk, bucketIndex) => {
    const q = query(clientsCol, where('workspaceId', 'in', chunk))
    return safeListen(
      () => onSnapshot(
        q,
        (snap) => {
          bucketedItems[bucketIndex] = snap.docs.map((item) => ({ id: item.id, ...item.data() } as WorkhubClient))
          emit()
        },
        () => {
          bucketedItems[bucketIndex] = []
          emit()
        },
      ),
      () => {
        bucketedItems[bucketIndex] = []
        emit()
      },
    )
  })

  return () => {
    bucketedItems = []
    unsubscribers.forEach((unsubscribe) => unsubscribe())
  }
}

export async function createWorkhubClient(input: {
  workspaceId: string
  name: string
  contactPerson?: string
  email?: string
  phone?: string
  website?: string
  address?: string
  industry?: string
  logoUrl?: string
  notes?: string
  createdBy: string
}): Promise<string> {
  const docRef = await addDoc(clientsCol, {
    workspaceId: input.workspaceId,
    name: input.name,
    contactPerson: input.contactPerson || '',
    email: input.email || '',
    phone: input.phone || '',
    website: input.website || '',
    address: input.address || '',
    industry: input.industry || '',
    logoUrl: input.logoUrl || '',
    notes: input.notes || '',
    createdBy: input.createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return docRef.id
}

export async function updateWorkhubClient(
  clientId: string,
  patch: Partial<Pick<WorkhubClient, 'name' | 'contactPerson' | 'email' | 'phone' | 'website' | 'address' | 'industry' | 'logoUrl' | 'notes'>>,
) {
  await updateDoc(doc(db, 'workhub_clients', clientId), {
    ...patch,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteWorkhubClient(clientId: string) {
  await deleteDoc(doc(db, 'workhub_clients', clientId))
}

export function subscribeWorkhubCompanyServices(onData: (items: WorkhubCompanyService[]) => void) {
  return safeListen(
    () => onSnapshot(
      companyServicesCol,
      (snap) => {
        const items = snap.docs.map((item) => ({ id: item.id, ...item.data() } as WorkhubCompanyService))
        onData(sortCompanyServices(items))
      },
      () => onData([]),
    ),
    () => onData([]),
  )
}

export async function createWorkhubCompanyService(input: { name: string; createdBy: string }): Promise<string> {
  const name = normalizeCompanyServiceName(input.name)
  const normalizedName = normalizeCompanyServiceKey(name)
  if (!name) {
    throw new Error('Service name is required.')
  }

  const existing = await getDocs(query(companyServicesCol, where('normalizedName', '==', normalizedName), limit(1)))
  if (!existing.empty) {
    return existing.docs[0].id
  }

  const docRef = await addDoc(companyServicesCol, {
    name,
    normalizedName,
    createdBy: input.createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return docRef.id
}

export function subscribeWorkhubProjects(workspaceId: string, currentUid: string, canSeeAll: boolean, onData: (items: WorkhubProject[]) => void) {
  if (canSeeAll) {
    const q = query(projectsCol, where('workspaceId', '==', workspaceId))
    return safeListen(
      () => onSnapshot(
        q,
        (snap) => {
          onData(sortProjects(snap.docs.map((item) => ({ id: item.id, ...item.data() } as WorkhubProject))))
        },
        () => onData([]),
      ),
      () => onData([]),
    )
  }

  const workspaceQuery = query(projectsCol, where('workspaceId', '==', workspaceId), where('visibility', '==', 'workspace'))
  const restrictedQuery = query(projectsCol, where('workspaceId', '==', workspaceId), where('visibility', '==', 'restricted'), where('memberUids', 'array-contains', currentUid))
  let workspaceItems: WorkhubProject[] = []
  let restrictedItems: WorkhubProject[] = []
  const emit = () => onData(mergeProjectsById([workspaceItems, restrictedItems]))
  const unsubWorkspace = safeListen(
    () => onSnapshot(
      workspaceQuery,
      (snap) => {
        workspaceItems = snap.docs.map((item) => ({ id: item.id, ...item.data() } as WorkhubProject))
        emit()
      },
      () => {
        workspaceItems = []
        emit()
      },
    ),
    () => {
      workspaceItems = []
      emit()
    },
  )
  const unsubRestricted = safeListen(
    () => onSnapshot(
      restrictedQuery,
      (snap) => {
        restrictedItems = snap.docs.map((item) => ({ id: item.id, ...item.data() } as WorkhubProject))
        emit()
      },
      () => {
        restrictedItems = []
        emit()
      },
    ),
    () => {
      restrictedItems = []
      emit()
    },
  )
  return () => {
    unsubWorkspace()
    unsubRestricted()
  }
}

export async function createWorkhubProject(input: {
  workspaceId: string
  parentProjectId?: string | null
  intent?: WorkhubProjectIntent
  mainPanelView?: 'tasks' | 'dashboard' | 'dashboard_with_details'
  valueAmount?: number
  valueCurrency?: string
  tenderNumber?: string
  proposalId?: string
  technicalProposalUrl?: string
  financialProposalUrl?: string
  name: string
  description: string
  color: string
  visibility: WorkhubVisibility
  memberUids: string[]
  storageMethod: 'firebase' | 'drive'
  projectStartDate?: string
  projectDeadline?: string
  projectType?: WorkhubProjectType
  submissionTime?: string
  proposalServices?: string[]
  priority?: WorkhubProjectPriority
  clientId?: string
  createdBy: string
}): Promise<string> {
  const docRef = await addDoc(projectsCol, {
    workspaceId: input.workspaceId,
    parentProjectId: input.parentProjectId || null,
    sortOrder: Date.now(),
    intent: input.intent || 'project',
    mainPanelView: input.mainPanelView || 'tasks',
    valueAmount: typeof input.valueAmount === 'number' && Number.isFinite(input.valueAmount) ? Math.max(0, input.valueAmount) : 0,
    valueCurrency: (input.valueCurrency || 'OMR').trim().toUpperCase(),
    tenderNumber: (input.tenderNumber || '').trim(),
    proposalId: (input.proposalId || '').trim(),
    technicalProposalUrl: (input.technicalProposalUrl || '').trim(),
    financialProposalUrl: (input.financialProposalUrl || '').trim(),
    name: input.name,
    description: input.description,
    color: input.color,
    visibility: input.visibility,
    memberUids: input.memberUids,
    storageMethod: input.storageMethod,
    projectStartDate: input.projectStartDate || '',
    projectDeadline: input.projectDeadline || '',
    projectType: input.projectType || 'other',
    submissionTime: input.submissionTime || '',
    proposalServices: normalizeMemberUids(input.proposalServices || []),
    priority: input.priority || 'medium',
    clientId: input.clientId || '',
    notes: '',
    createdBy: input.createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return docRef.id
}

export async function updateWorkhubProject(projectId: string, patch: Partial<Pick<WorkhubProject, 'parentProjectId' | 'sortOrder' | 'intent' | 'mainPanelView' | 'taskItemDisplayMode' | 'valueAmount' | 'valueCurrency' | 'tenderNumber' | 'proposalId' | 'technicalProposalUrl' | 'financialProposalUrl' | 'name' | 'description' | 'color' | 'notes' | 'attachments' | 'attachmentTitles' | 'notesUpdatedBy' | 'visibility' | 'memberUids' | 'storageMethod' | 'projectStartDate' | 'projectDeadline' | 'projectType' | 'submissionTime' | 'proposalServices' | 'priority' | 'clientId' | 'taskStatuses'>>) {
  const payload: Record<string, unknown> = {
    ...patch,
    updatedAt: serverTimestamp(),
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'proposalServices')) {
    payload.proposalServices = normalizeMemberUids(patch.proposalServices || [])
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'notes')) {
    payload.notesUpdatedAt = serverTimestamp()
  }
  await updateDoc(doc(db, 'workhub_projects', projectId), payload)
}

export async function updateWorkhubProjectUserPreference(
  projectId: string,
  userUid: string,
  preference: WorkhubProjectUserPreference,
): Promise<void> {
  if (!projectId || !userUid) return
  await setDoc(doc(db, 'workhub_projects', projectId), {
    userPreferences: {
      [userUid]: {
        taskItemDisplayMode: preference.taskItemDisplayMode || 'list',
        updatedAt: serverTimestamp(),
      },
    },
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

export async function deleteWorkhubProject(projectId: string) {
  await deleteDoc(doc(db, 'workhub_projects', projectId))
}

export function subscribeWorkhubDocuments(
  workspaceId: string,
  currentUid: string,
  canSeeAll: boolean,
  onData: (items: WorkhubDocument[]) => void,
) {
  if (canSeeAll) {
    const q = query(documentsCol, where('workspaceId', '==', workspaceId))
    return safeListen(
      () => onSnapshot(
        q,
        (snap) => {
          onData(sortDocuments(snap.docs.map((item) => ({ id: item.id, ...item.data() } as WorkhubDocument))))
        },
        () => onData([]),
      ),
      () => onData([]),
    )
  }

  const workspaceQuery = query(documentsCol, where('workspaceId', '==', workspaceId), where('visibility', '==', 'workspace'))
  const restrictedQuery = query(
    documentsCol,
    where('workspaceId', '==', workspaceId),
    where('visibility', '==', 'restricted'),
    where('memberUids', 'array-contains', currentUid),
  )
  let workspaceItems: WorkhubDocument[] = []
  let restrictedItems: WorkhubDocument[] = []
  const emit = () => onData(mergeDocumentsById([workspaceItems, restrictedItems]))
  const unsubWorkspace = safeListen(
    () => onSnapshot(
      workspaceQuery,
      (snap) => {
        workspaceItems = snap.docs.map((item) => ({ id: item.id, ...item.data() } as WorkhubDocument)
        )
        emit()
      },
      () => {
        workspaceItems = []
        emit()
      },
    ),
    () => {
      workspaceItems = []
      emit()
    },
  )
  const unsubRestricted = safeListen(
    () => onSnapshot(
      restrictedQuery,
      (snap) => {
        restrictedItems = snap.docs.map((item) => ({ id: item.id, ...item.data() } as WorkhubDocument))
        emit()
      },
      () => {
        restrictedItems = []
        emit()
      },
    ),
    () => {
      restrictedItems = []
      emit()
    },
  )
  return () => {
    unsubWorkspace()
    unsubRestricted()
  }
}

export async function createWorkhubDocument(input: {
  workspaceId: string
  projectId?: string | null
  type?: 'document' | 'note'
  icon?: string
  title: string
  body: string
  tabs?: WorkhubDocumentTab[]
  masterPage?: WorkhubDocumentMasterPage
  visibility: WorkhubVisibility
  memberUids: string[]
  notifyMode?: 'all' | 'selected' | 'none'
  notifyUids?: string[]
  createdBy: string
}): Promise<string> {
  const normalizedTabs = Array.isArray(input.tabs)
    ? input.tabs.map((tab) => ({
        id: String(tab.id || '').trim(),
        title: String(tab.title || '').trim() || 'Main',
        ...(tab.icon ? { icon: String(tab.icon).trim() } : {}),
        body: String(tab.body || ''),
      })).filter((tab) => tab.id)
    : undefined

  const docRef = await addDoc(documentsCol, {
    workspaceId: input.workspaceId,
    projectId: input.projectId || null,
    sortOrder: Date.now(),
    type: input.type || 'document',
    icon: (input.icon || '').trim() || null,
    title: input.title,
    body: input.body,
    ...(normalizedTabs ? { tabs: normalizedTabs } : {}),
    masterPage: input.masterPage || null,
    isLocked: false,
    lockedBy: null,
    lockedAt: null,
    visibility: input.visibility,
    memberUids: input.memberUids,
    editMemberUids: input.visibility === 'restricted' ? input.memberUids : [],
    notifyMode: input.notifyMode || 'all',
    notifyUids: input.notifyUids || [],
    createdBy: input.createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return docRef.id
}

export async function getWorkhubDocumentByShareToken(token: string): Promise<WorkhubDocument | null> {
  const q = query(collection(db, 'workhub_documents'), where('shareToken', '==', token), where('shareEnabled', '==', true), limit(1))
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...d.data() } as WorkhubDocument
}

export async function getWorkhubDocumentById(documentId: string): Promise<WorkhubDocument | null> {
  const snap = await getDoc(doc(db, 'workhub_documents', documentId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as WorkhubDocument
}

export class WorkhubDocumentConflictError extends Error {
  readonly code = 'workhub_document_conflict'
  readonly currentUpdatedAtMs: number

  constructor(currentUpdatedAtMs: number) {
    super('Document was updated by another collaborator.')
    this.name = 'WorkhubDocumentConflictError'
    this.currentUpdatedAtMs = currentUpdatedAtMs
  }
}

type WorkhubDocumentUpdatePatch = Partial<Pick<WorkhubDocument, 'projectId' | 'sortOrder' | 'hasOutgoingReferences' | 'referenceSourceDocumentId' | 'referenceSourceWorkspaceId' | 'referenceSourceProjectId' | 'referenceTabIds' | 'icon' | 'title' | 'body' | 'tabs' | 'masterPage' | 'checklist' | 'attachments' | 'links' | 'editedBy' | 'isLocked' | 'lockedBy' | 'lockedAt' | 'shareToken' | 'shareEnabled' | 'visibility' | 'memberUids' | 'editMemberUids' | 'notifyMode' | 'notifyUids'>>

function getWorkhubTimestampMs(value: unknown): number {
  if (!value) return 0
  if (typeof value === 'object' && value !== null && 'toMillis' in value && typeof (value as { toMillis?: unknown }).toMillis === 'function') {
    return (value as { toMillis: () => number }).toMillis()
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

function buildWorkhubDocumentUpdatePayload(patch: WorkhubDocumentUpdatePatch): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    ...patch,
    updatedAt: serverTimestamp(),
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'projectId')) {
    payload.projectId = patch.projectId || null
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'hasOutgoingReferences')) {
    payload.hasOutgoingReferences = Boolean(patch.hasOutgoingReferences)
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'referenceSourceDocumentId')) {
    payload.referenceSourceDocumentId = patch.referenceSourceDocumentId || null
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'referenceSourceWorkspaceId')) {
    payload.referenceSourceWorkspaceId = patch.referenceSourceWorkspaceId || null
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'referenceSourceProjectId')) {
    payload.referenceSourceProjectId = patch.referenceSourceProjectId || null
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'referenceTabIds')) {
    payload.referenceTabIds = Array.isArray(patch.referenceTabIds) ? patch.referenceTabIds : []
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'icon')) {
    payload.icon = (patch.icon || '').trim() || null
  }
  return payload
}

export async function updateWorkhubDocument(
  documentId: string,
  patch: WorkhubDocumentUpdatePatch,
) {
  const payload = buildWorkhubDocumentUpdatePayload(patch)
  await updateDoc(doc(db, 'workhub_documents', documentId), payload)
}

export async function updateWorkhubDocumentWithOptimisticConcurrency(
  documentId: string,
  patch: WorkhubDocumentUpdatePatch,
  expectedUpdatedAtMs: number | null | undefined,
) {
  const docRef = doc(db, 'workhub_documents', documentId)
  const expected = typeof expectedUpdatedAtMs === 'number' && Number.isFinite(expectedUpdatedAtMs)
    ? expectedUpdatedAtMs
    : null

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(docRef)
    if (!snap.exists()) {
      throw new Error('Document not found.')
    }

    const currentData = snap.data() as WorkhubDocument
    const currentUpdatedAtMs = getWorkhubTimestampMs(currentData.updatedAt || currentData.createdAt)
    if (expected != null && expected > 0 && currentUpdatedAtMs > 0 && currentUpdatedAtMs !== expected) {
      throw new WorkhubDocumentConflictError(currentUpdatedAtMs)
    }

    transaction.update(docRef, buildWorkhubDocumentUpdatePayload(patch))
  })
}

export async function getWorkhubDocumentReferencesBySource(sourceDocumentId: string): Promise<WorkhubDocument[]> {
  if (!sourceDocumentId) return []
  const q = query(documentsCol, where('referenceSourceDocumentId', '==', sourceDocumentId))
  const snap = await getDocs(q)
  return sortDocuments(snap.docs.map((item) => ({ id: item.id, ...item.data() } as WorkhubDocument)))
}

function getWorkhubDocumentDraftId(documentId: string, userUid: string) {
  return `${documentId}__${userUid}`
}

export async function saveWorkhubDocumentDraft(input: {
  workspaceId: string
  documentId: string
  userUid: string
  title: string
  body: string
  tabs: WorkhubDocumentTab[]
  activeTabId: string
  masterPage: WorkhubDocumentMasterPage
}) {
  const draftId = getWorkhubDocumentDraftId(input.documentId, input.userUid)
  await setDoc(doc(documentDraftsCol, draftId), {
    workspaceId: input.workspaceId,
    documentId: input.documentId,
    userUid: input.userUid,
    title: input.title,
    body: input.body,
    tabs: input.tabs,
    activeTabId: input.activeTabId,
    masterPage: input.masterPage,
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

export async function getWorkhubDocumentDraft(documentId: string, userUid: string): Promise<WorkhubDocumentDraft | null> {
  if (!documentId || !userUid) return null
  const draftId = getWorkhubDocumentDraftId(documentId, userUid)
  const snap = await getDoc(doc(documentDraftsCol, draftId))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as WorkhubDocumentDraft
}

export async function deleteWorkhubDocumentDraft(documentId: string, userUid: string) {
  if (!documentId || !userUid) return
  const draftId = getWorkhubDocumentDraftId(documentId, userUid)
  await deleteDoc(doc(documentDraftsCol, draftId))
}

export async function saveWorkhubDocumentNotifyPrefs(
  documentId: string,
  mode: 'all' | 'selected' | 'none',
  uids: string[],
) {
  await updateDoc(doc(db, 'workhub_documents', documentId), {
    notifyMode: mode,
    notifyUids: uids,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteWorkhubDocument(documentId: string) {
  await deleteDoc(doc(db, 'workhub_documents', documentId))
}

export function subscribeWorkhubTasks(workspaceId: string, currentUid: string, canSeeAll: boolean, onData: (items: WorkhubTask[]) => void) {
  if (canSeeAll) {
    const q = query(tasksCol, where('workspaceId', '==', workspaceId))
    return safeListen(
      () => onSnapshot(
        q,
        (snap) => {
          onData(sortTasks(snap.docs.map((item) => ({ id: item.id, ...item.data() } as WorkhubTask))))
        },
        () => onData([]),
      ),
      () => onData([]),
    )
  }

  const workspaceQuery = query(tasksCol, where('workspaceId', '==', workspaceId), where('visibility', '==', 'workspace'))
  const restrictedQuery = query(tasksCol, where('workspaceId', '==', workspaceId), where('visibility', '==', 'restricted'), where('memberUids', 'array-contains', currentUid))
  let workspaceItems: WorkhubTask[] = []
  let restrictedItems: WorkhubTask[] = []
  const emit = () => onData(mergeTasksById([workspaceItems, restrictedItems]))
  const unsubWorkspace = safeListen(
    () => onSnapshot(
      workspaceQuery,
      (snap) => {
        workspaceItems = snap.docs.map((item) => ({ id: item.id, ...item.data() } as WorkhubTask))
        emit()
      },
      () => {
        workspaceItems = []
        emit()
      },
    ),
    () => {
      workspaceItems = []
      emit()
    },
  )
  const unsubRestricted = safeListen(
    () => onSnapshot(
      restrictedQuery,
      (snap) => {
        restrictedItems = snap.docs.map((item) => ({ id: item.id, ...item.data() } as WorkhubTask))
        emit()
      },
      () => {
        restrictedItems = []
        emit()
      },
    ),
    () => {
      restrictedItems = []
      emit()
    },
  )
  return () => {
    unsubWorkspace()
    unsubRestricted()
  }
}

export async function createWorkhubTask(input: {
  workspaceId: string
  projectId: string
  sortOrder?: number
  title: string
  description: string
  visibility: WorkhubVisibility
  memberUids: string[]
  status: WorkhubTaskStatus
  priority: WorkhubTaskPriority
  assigneeUid: string
  assigneeUids?: string[]
  startDate?: string
  dueDate: string
  dueTime?: string
  valueAmount?: number
  valueCurrency?: string
  checklist?: WorkhubTaskChecklistItem[]
  notifyMode?: 'all' | 'selected' | 'none'
  notifyUids?: string[]
  createdBy: string
}): Promise<string> {
  const payload = stripUndefinedDeep({
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    sortOrder: input.sortOrder ?? Date.now(),
    title: input.title,
    description: input.description,
    visibility: input.visibility,
    memberUids: input.memberUids,
    status: input.status || 'backlog',
    priority: input.priority,
    assigneeUid: input.assigneeUid,
    assigneeUids: input.assigneeUids && input.assigneeUids.length > 0 ? input.assigneeUids : [input.assigneeUid],
    startDate: input.startDate || '',
    dueDate: input.dueDate,
    dueTime: input.dueTime || '',
    valueAmount: typeof input.valueAmount === 'number' && Number.isFinite(input.valueAmount) ? input.valueAmount : undefined,
    valueCurrency: (input.valueCurrency || '').trim().toUpperCase() || undefined,
    checklist: input.checklist || [],
    notifyMode: input.notifyMode || 'all',
    notifyUids: input.notifyUids || [],
    createdBy: input.createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  const docRef = await addDoc(tasksCol, payload)
  return docRef.id
}

export async function saveWorkhubTaskNotifyPrefs(
  taskId: string,
  mode: 'all' | 'selected' | 'none',
  uids: string[],
) {
  await updateDoc(doc(db, 'workhub_tasks', taskId), {
    notifyMode: mode,
    notifyUids: uids,
  })
}

export async function updateWorkhubTask(taskId: string, patch: Partial<Pick<WorkhubTask, 'projectId' | 'milestoneId' | 'title' | 'description' | 'attachments' | 'attachmentTitles' | 'imageUrls' | 'links' | 'linkTitles' | 'linkCreatedBy' | 'visibility' | 'memberUids' | 'status' | 'priority' | 'assigneeUid' | 'assigneeUids' | 'startDate' | 'dueDate' | 'dueTime' | 'valueAmount' | 'valueCurrency' | 'checklist' | 'completedAt' | 'sortOrder'>>) {
  const normalizedPatch: Record<string, unknown> = {
    ...patch,
  }

  // Explicit undefined from UI means "clear this field".
  if (Object.prototype.hasOwnProperty.call(patch, 'valueAmount') && patch.valueAmount === undefined) {
    normalizedPatch.valueAmount = deleteField()
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'valueCurrency') && patch.valueCurrency === undefined) {
    normalizedPatch.valueCurrency = deleteField()
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'assigneeUids') && patch.assigneeUids === undefined) {
    normalizedPatch.assigneeUids = deleteField()
  }

  const payload = stripUndefinedDeep({
    ...normalizedPatch,
    updatedAt: serverTimestamp(),
  })

  await updateDoc(doc(db, 'workhub_tasks', taskId), payload)
}

export async function deleteWorkhubTask(taskId: string) {
  await deleteDoc(doc(db, 'workhub_tasks', taskId))
}

export function subscribeWorkhubComments(
  taskId: string,
  onData: (items: WorkhubTaskComment[]) => void,
  options?: { maxCount?: number; onHasMore?: (hasMore: boolean) => void },
) {
  const maxCount = typeof options?.maxCount === 'number' && options.maxCount > 0 ? options.maxCount : 0
  const fetchLimit = maxCount > 0 ? maxCount + 1 : 0
  const mapSnapshot = (snap: { docs: Array<{ id: string; data: () => unknown }> }) => {
    const mapped = snap.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<WorkhubTaskComment, 'id'>) }))
    if (fetchLimit > 0) {
      const newestFirst = sortByNewest(mapped)
      const hasMore = newestFirst.length > maxCount
      options?.onHasMore?.(hasMore)
      onData(newestFirst.slice(0, maxCount))
      return
    }
    options?.onHasMore?.(false)
    onData(sortByNewest(mapped))
  }
  const fallbackQuery = query(commentsCol, where('taskId', '==', taskId))
  if (fetchLimit <= 0) {
    return safeListen(
      () => onSnapshot(
        fallbackQuery,
        mapSnapshot,
        () => {
          options?.onHasMore?.(false)
          onData([])
        },
      ),
      () => {
        options?.onHasMore?.(false)
        onData([])
      },
    )
  }

  const primaryQuery = query(commentsCol, where('taskId', '==', taskId), orderBy('createdAt', 'desc'), limit(fetchLimit))
  let fallbackUnsub: (() => void) | null = null
  const primaryUnsub = safeListen(
    () => onSnapshot(
      primaryQuery,
      mapSnapshot,
      () => {
        fallbackUnsub = safeListen(
          () => onSnapshot(
            fallbackQuery,
            mapSnapshot,
            () => {
              options?.onHasMore?.(false)
              onData([])
            },
          ),
          () => {
            options?.onHasMore?.(false)
            onData([])
          },
        )
      },
    ),
    () => {
      options?.onHasMore?.(false)
      onData([])
    },
  )
  return () => {
    primaryUnsub()
    fallbackUnsub?.()
  }
}

export function subscribeWorkhubCommentsByEntity(
  entityType: 'task' | 'project' | 'document',
  entityId: string,
  onData: (items: WorkhubTaskComment[]) => void,
  options?: { maxCount?: number; onHasMore?: (hasMore: boolean) => void },
) {
  const maxCount = typeof options?.maxCount === 'number' && options.maxCount > 0 ? options.maxCount : 0
  const fetchLimit = maxCount > 0 ? maxCount + 1 : 0
  const mapSnapshot = (snap: { docs: Array<{ id: string; data: () => unknown }> }) => {
    const mapped = snap.docs.map((item) => ({ id: item.id, ...(item.data() as Omit<WorkhubTaskComment, 'id'>) }))
    const normalized = entityType === 'task'
      ? mapped
      : mapped.filter((item) => item.entityType === entityType && item.entityId === entityId)
    if (fetchLimit > 0) {
      const newestFirst = sortByNewest(normalized)
      const hasMore = newestFirst.length > maxCount
      options?.onHasMore?.(hasMore)
      onData(newestFirst.slice(0, maxCount))
      return
    }
    options?.onHasMore?.(false)
    onData(sortByNewest(normalized))
  }

  const fallbackQuery = entityType === 'task'
    ? query(commentsCol, where('taskId', '==', entityId))
    : query(commentsCol, where('entityType', '==', entityType), where('entityId', '==', entityId))

  if (fetchLimit <= 0) {
    return safeListen(
      () => onSnapshot(
        fallbackQuery,
        mapSnapshot,
        () => {
          options?.onHasMore?.(false)
          onData([])
        },
      ),
      () => {
        options?.onHasMore?.(false)
        onData([])
      },
    )
  }

  const primaryQuery = entityType === 'task'
    ? query(commentsCol, where('taskId', '==', entityId), orderBy('createdAt', 'desc'), limit(fetchLimit))
    : query(commentsCol, where('entityType', '==', entityType), where('entityId', '==', entityId), orderBy('createdAt', 'desc'), limit(fetchLimit))

  let fallbackUnsub: (() => void) | null = null
  const primaryUnsub = safeListen(
    () => onSnapshot(
      primaryQuery,
      mapSnapshot,
      () => {
        fallbackUnsub = safeListen(
          () => onSnapshot(
            fallbackQuery,
            mapSnapshot,
            () => {
              options?.onHasMore?.(false)
              onData([])
            },
          ),
          () => {
            options?.onHasMore?.(false)
            onData([])
          },
        )
      },
    ),
    () => {
      options?.onHasMore?.(false)
      onData([])
    },
  )
  return () => {
    primaryUnsub()
    fallbackUnsub?.()
  }
}

export async function addWorkhubTaskComment(input: { workspaceId: string; taskId: string; authorUid: string; body: string }): Promise<string> {
  return addWorkhubComment({
    workspaceId: input.workspaceId,
    entityType: 'task',
    entityId: input.taskId,
    authorUid: input.authorUid,
    body: input.body,
  })
}

export async function addWorkhubComment(input: {
  workspaceId: string
  entityType: 'task' | 'project' | 'document'
  entityId: string
  authorUid: string
  body: string
}): Promise<string> {
  const trimmedBody = input.body.trim()
  const docRef = await addDoc(commentsCol, {
    workspaceId: input.workspaceId,
    taskId: input.entityType === 'task' ? input.entityId : '',
    entityType: input.entityType,
    entityId: input.entityId,
    authorUid: input.authorUid,
    body: trimmedBody,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return docRef.id
}

export async function updateWorkhubComment(commentId: string, patch: Pick<WorkhubTaskComment, 'body'>): Promise<void> {
  await updateDoc(doc(db, 'workhub_task_comments', commentId), {
    body: (patch.body || '').trim(),
    updatedAt: serverTimestamp(),
    editedAt: serverTimestamp(),
  })
}

export async function setWorkhubCommentLike(input: {
  commentId: string
  userUid: string
  liked: boolean
}): Promise<void> {
  await updateDoc(doc(db, 'workhub_task_comments', input.commentId), {
    likedByUids: input.liked ? arrayUnion(input.userUid) : arrayRemove(input.userUid),
    updatedAt: serverTimestamp(),
  })
}

export async function setWorkhubCommentReaction(input: {
  commentId: string
  userUid: string
  reaction: string | null
}): Promise<void> {
  const reactionPath = `reactionByUid.${input.userUid}`
  await updateDoc(doc(db, 'workhub_task_comments', input.commentId), {
    [reactionPath]: input.reaction ? input.reaction : deleteField(),
    updatedAt: serverTimestamp(),
  })
}

export async function deleteWorkhubComment(commentId: string): Promise<void> {
  await deleteDoc(doc(db, 'workhub_task_comments', commentId))
}

export function subscribeWorkhubActivity(workspaceId: string, currentUid: string, canSeeAll: boolean, onData: (items: WorkhubActivity[]) => void) {
  if (canSeeAll) {
    const q = query(activityCol, where('workspaceId', '==', workspaceId))
    return safeListen(
      () => onSnapshot(
        q,
        (snap) => {
          onData(sortByNewest(snap.docs.map((item) => ({ id: item.id, ...item.data() } as WorkhubActivity)).slice(0, 300)))
        },
        () => onData([]),
      ),
      () => onData([]),
    )
  }

  const workspaceQuery = query(activityCol, where('workspaceId', '==', workspaceId), where('visibility', '==', 'workspace'))
  const restrictedQuery = query(activityCol, where('workspaceId', '==', workspaceId), where('visibility', '==', 'restricted'), where('memberUids', 'array-contains', currentUid))
  let workspaceItems: WorkhubActivity[] = []
  let restrictedItems: WorkhubActivity[] = []
  const emit = () => onData(mergeById([workspaceItems, restrictedItems]).slice(0, 300))
  const unsubWorkspace = safeListen(
    () => onSnapshot(
      workspaceQuery,
      (snap) => {
        workspaceItems = snap.docs.map((item) => ({ id: item.id, ...item.data() } as WorkhubActivity))
        emit()
      },
      () => {
        workspaceItems = []
        emit()
      },
    ),
    () => {
      workspaceItems = []
      emit()
    },
  )
  const unsubRestricted = safeListen(
    () => onSnapshot(
      restrictedQuery,
      (snap) => {
        restrictedItems = snap.docs.map((item) => ({ id: item.id, ...item.data() } as WorkhubActivity))
        emit()
      },
      () => {
        restrictedItems = []
        emit()
      },
    ),
    () => {
      restrictedItems = []
      emit()
    },
  )
  return () => {
    unsubWorkspace()
    unsubRestricted()
  }
}

export async function createWorkhubActivity(input: {
  workspaceId: string
  actorUid: string
  entityType: WorkhubActivity['entityType']
  entityId: string
  action: string
  message: string
  visibility?: WorkhubVisibility
  memberUids?: string[]
  threadId?: string
  replyToActivityId?: string
  imageUrl?: string
  targetPath?: string
  messagePriority?: WorkhubChatMessagePriority
  messageDeliveryState?: WorkhubChatMessageDeliveryState
}) {
  await addDoc(activityCol, {
    workspaceId: input.workspaceId,
    actorUid: input.actorUid,
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    message: input.message,
    visibility: input.visibility || 'workspace',
    memberUids: input.memberUids || [],
    ...(input.threadId ? { threadId: input.threadId } : {}),
    ...(input.replyToActivityId ? { replyToActivityId: input.replyToActivityId } : {}),
    ...(input.imageUrl ? { imageUrl: input.imageUrl } : {}),
    ...(input.targetPath ? { targetPath: input.targetPath } : {}),
    ...(input.messagePriority ? { messagePriority: input.messagePriority } : {}),
    ...(input.messageDeliveryState ? { messageDeliveryState: input.messageDeliveryState } : {}),
    receivedByUids: [],
    readByUids: [],
    createdAt: serverTimestamp(),
  })
}

export function subscribeWorkhubNotifications(
  recipientUid: string,
  onData: (items: WorkhubNotification[]) => void,
  options?: { maxCount?: number },
) {
  const maxCount = Number.isFinite(options?.maxCount) ? Math.max(1, Math.floor(options?.maxCount as number)) : 0
  const q = query(
    notificationsCol,
    where('recipientUid', '==', recipientUid),
  )
  return safeListen(
    () => onSnapshot(
      q,
      (snap) => {
        const items = sortByNewest(snap.docs.map((item) => ({ id: item.id, ...item.data() } as WorkhubNotification)))
        if (maxCount <= 0) {
          onData(items)
          return
        }
        // Keep all unread notifications visible even when using a paging cap.
        const visibleItems = items.filter((item, index) => index < maxCount || !item.read)
        onData(visibleItems)
      },
      () => onData([]),
    ),
    () => onData([]),
  )
}

export async function createWorkhubNotifications(input: {
  workspaceId: string
  actorUid: string
  recipientUids: string[]
  entityType: WorkhubNotification['entityType']
  entityId: string
  projectId?: string
  action: string
  message: string
  commentPreview?: string
  delivery?: WorkhubFolderNotifyDelivery
  targetPath?: string
  threadId?: string
  activityId?: string
  imageUrl?: string
  messagePriority?: WorkhubChatMessagePriority
}) {
  const targets = Array.from(new Set(input.recipientUids.filter((uid) => !!uid && uid !== input.actorUid)))
  if (targets.length === 0) return
  await Promise.all(targets.map((recipientUid) => addDoc(notificationsCol, {
    workspaceId: input.workspaceId,
    recipientUid,
    actorUid: input.actorUid,
    entityType: input.entityType,
    entityId: input.entityId,
    ...(input.projectId ? { projectId: input.projectId } : {}),
    action: input.action,
    message: input.message,
    ...(input.delivery ? { delivery: input.delivery } : {}),
    ...(input.commentPreview ? { commentPreview: input.commentPreview } : {}),
    ...(input.targetPath ? { targetPath: input.targetPath } : {}),
    ...(input.threadId ? { threadId: input.threadId } : {}),
    ...(input.activityId ? { activityId: input.activityId } : {}),
    ...(input.imageUrl ? { imageUrl: input.imageUrl } : {}),
    ...(input.messagePriority ? { messagePriority: input.messagePriority } : {}),
    read: false,
    createdAt: serverTimestamp(),
  })))
}

function getWorkhubProjectNotificationPrefId(projectId: string, userUid: string) {
  return `${projectId}__${userUid}`
}

export function subscribeWorkhubProjectNotificationPreference(
  projectId: string,
  userUid: string,
  onData: (item: WorkhubProjectNotificationPreference | null) => void,
) {
  if (!projectId || !userUid) {
    onData(null)
    return () => undefined
  }
  const prefId = getWorkhubProjectNotificationPrefId(projectId, userUid)
  return safeListen(
    () => onSnapshot(
      doc(projectNotificationPrefsCol, prefId),
      (snap) => {
        if (!snap.exists()) {
          onData(null)
          return
        }
        onData({ id: snap.id, ...snap.data() } as WorkhubProjectNotificationPreference)
      },
      () => onData(null),
    ),
    () => onData(null),
  )
}

export async function saveWorkhubProjectNotificationPreference(input: {
  workspaceId: string
  projectId: string
  userUid: string
  enabled: boolean
  taskCreated: boolean
  taskCompleted: boolean
  folderCompleted: boolean
  delivery: WorkhubFolderNotifyDelivery
}) {
  const prefId = getWorkhubProjectNotificationPrefId(input.projectId, input.userUid)
  const payload = {
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    userUid: input.userUid,
    enabled: !!input.enabled,
    taskCreated: !!input.taskCreated,
    taskCompleted: !!input.taskCompleted,
    folderCompleted: !!input.folderCompleted,
    delivery: input.delivery === 'both' ? 'both' : 'in_app',
    updatedAt: serverTimestamp(),
  }
  await setDoc(doc(projectNotificationPrefsCol, prefId), {
    ...payload,
    createdAt: serverTimestamp(),
  }, { merge: true })
}

export async function listWorkhubProjectNotificationPreferences(projectId: string): Promise<WorkhubProjectNotificationPreference[]> {
  if (!projectId) return []
  const q = query(projectNotificationPrefsCol, where('projectId', '==', projectId))
  const snap = await getDocs(q)
  return snap.docs.map((item) => ({ id: item.id, ...item.data() } as WorkhubProjectNotificationPreference))
}

export async function markWorkhubNotificationRead(notificationId: string) {
  await updateDoc(doc(db, 'workhub_notifications', notificationId), {
    read: true,
  })
}


export function subscribeWorkhubProjectsMulti(workspaceIds: string[], currentUid: string, canSeeAll: boolean, onData: (items: WorkhubProject[]) => void) {
  const unsubs: (() => void)[] = []
  const lists: Record<string, WorkhubProject[]> = {}
  const emit = () => onData(sortByNewest(Object.values(lists).flat()))
  workspaceIds.forEach((id) => {
    lists[id] = []
    unsubs.push(subscribeWorkhubProjects(id, currentUid, canSeeAll, (items) => {
      lists[id] = items
      emit()
    }))
  })
  return () => unsubs.forEach(u => u())
}

// ── Mood Boards ────────────────────────────────────────────────────────────────

export type WorkhubMoodBoardEntityType = 'workspace' | 'project' | 'task' | 'document'

export interface WorkhubMoodBoardImage {
  id?: string
  tabId?: string
  url: string
  label?: string
  addedBy: string
  addedAt?: unknown
  x?: number
  y?: number
  width?: number
  height?: number
  z?: number
}

export interface WorkhubMoodBoardTab {
  id: string
  title: string
}

export interface WorkhubMoodBoardUserPreference {
  imageLayout?: 'compact' | 'large'
  showGridBackground?: boolean
  detailsCollapsed?: boolean
  updatedAt?: unknown
}

export type {
  WorkhubMoodBoardProsCons,
  WorkhubProsConsAmountMode,
  WorkhubProsConsChartVariant,
  WorkhubProsConsCustomFieldAppliesTo,
  WorkhubProsConsCustomFieldDefinition,
  WorkhubProsConsCustomFieldType,
  WorkhubProsConsGroup,
  WorkhubProsConsGroupingMode,
  WorkhubProsConsItem,
  WorkhubProsConsRecommendation,
  WorkhubProsConsRecommendationTone,
  WorkhubProsConsScoringConfig,
  WorkhubProsConsScoringMethod,
  WorkhubProsConsSide,
} from './workhubProsCons'

export interface WorkhubMoodBoard {
  id: string
  workspaceId: string
  entityType: WorkhubMoodBoardEntityType
  entityId: string
  visibility: WorkhubVisibility
  memberUids: string[]
  sortOrder?: number
  panelVariant?: 'classic' | 'v2' | 'flow' | 'proscons'
  title: string
  flowViewport?: {
    x: number
    y: number
    zoom: number
  }
  flowNodes?: Array<{
    id: string
    type?: string
    position: { x: number; y: number }
    data?: Record<string, unknown>
    style?: Record<string, unknown>
  }>
  flowEdges?: Array<{
    id: string
    source: string
    target: string
    type?: string
    animated?: boolean
    label?: string
  }>
  flowSettings?: {
    canvasAppearance?: {
      backgroundColor?: string
      patternColor?: string
      pattern?: 'dots' | 'lines'
    }
    showNavigationPreview?: boolean
    showImageLabels?: boolean
  }
  tabs?: WorkhubMoodBoardTab[]
  activeTabId?: string
  images: WorkhubMoodBoardImage[]
  userPreferences?: Record<string, WorkhubMoodBoardUserPreference>
  checklist?: WorkhubTaskChecklistItem[]
  prosCons?: WorkhubMoodBoardProsCons
  createdBy: string
  createdAt?: unknown
  updatedAt?: unknown
}

export function subscribeWorkhubMoodBoardsForWorkspace(
  workspaceId: string,
  currentUid: string,
  canSeeAll: boolean,
  onData: (boards: WorkhubMoodBoard[]) => void,
) {
  const q = query(
    collection(db, 'workhub_mood_boards'),
    where('workspaceId', '==', workspaceId),
  )
  return safeListen(
    () => onSnapshot(
      q,
      (snap) => {
        const items = snap.docs.map((d) => ({ id: d.id, ...d.data() } as WorkhubMoodBoard))
        const visibleItems = canSeeAll
          ? items
          : items.filter((item) => (
            item.visibility !== 'restricted'
            || item.createdBy === currentUid
            || normalizeMemberUids(item.memberUids || []).includes(currentUid)
          ))
        onData(sortMoodBoards(visibleItems))
      },
      () => onData([]),
    ),
    () => onData([]),
  )
}

export function subscribeWorkhubMoodBoard(
  entityType: WorkhubMoodBoardEntityType,
  entityId: string,
  onData: (board: WorkhubMoodBoard | null) => void,
) {
  const q = query(
    collection(db, 'workhub_mood_boards'),
    where('entityType', '==', entityType),
    where('entityId', '==', entityId),
    limit(1),
  )
  return safeListen(
    () => onSnapshot(
      q,
      (snap) => {
        if (snap.empty) { onData(null); return }
        const d = snap.docs[0]
        onData({ id: d.id, ...d.data() } as WorkhubMoodBoard)
      },
      () => onData(null),
    ),
    () => onData(null),
  )
}

export async function createWorkhubMoodBoard(input: {
  workspaceId: string
  entityType: WorkhubMoodBoardEntityType
  entityId: string
  title: string
  panelVariant?: 'classic' | 'v2' | 'flow' | 'proscons'
  visibility?: WorkhubVisibility
  memberUids?: string[]
  createdBy: string
}): Promise<string> {
  const defaultTabs: WorkhubMoodBoardTab[] = [{ id: 'tab-main', title: 'Board' }]
  const nextPanelVariant = input.panelVariant || 'classic'
  const nextFlowSettings = nextPanelVariant === 'v2'
    ? { showNavigationPreview: false, showImageLabels: false }
    : null
  const nextProsCons = nextPanelVariant === 'proscons'
    ? buildWorkhubProsConsDefaults({
      topic: input.title,
      objective: '',
      recommendationNote: '',
      currency: 'USD',
      pros: [],
      cons: [],
    })
    : null
  const ref = await addDoc(collection(db, 'workhub_mood_boards'), {
    workspaceId: input.workspaceId,
    entityType: input.entityType,
    entityId: input.entityId,
    visibility: input.visibility || 'workspace',
    memberUids: input.visibility === 'restricted'
      ? normalizeMemberUids(input.memberUids?.length ? input.memberUids : [input.createdBy])
      : [],
    sortOrder: Date.now(),
    title: input.title,
    panelVariant: nextPanelVariant,
    flowNodes: [],
    flowEdges: [],
    ...(nextFlowSettings ? { flowSettings: nextFlowSettings } : {}),
    ...(nextProsCons ? { prosCons: nextProsCons } : {}),
    tabs: defaultTabs,
    activeTabId: defaultTabs[0].id,
    images: [],
    checklist: [],
    createdBy: input.createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return ref.id
}

export async function updateWorkhubMoodBoardChecklist(
  boardId: string,
  checklist: WorkhubTaskChecklistItem[],
): Promise<void> {
  await updateDoc(doc(db, 'workhub_mood_boards', boardId), {
    checklist: normalizeChecklistItems(checklist),
    updatedAt: serverTimestamp(),
  })
}

export async function updateWorkhubMoodBoard(
  boardId: string,
  patch: Partial<Pick<WorkhubMoodBoard, 'workspaceId' | 'entityType' | 'entityId' | 'sortOrder' | 'title' | 'visibility' | 'memberUids'>>,
): Promise<void> {
  await updateDoc(doc(db, 'workhub_mood_boards', boardId), {
    ...patch,
    updatedAt: serverTimestamp(),
  })
}

export async function updateWorkhubMoodBoardProsCons(
  boardId: string,
  prosCons: WorkhubMoodBoard['prosCons'],
): Promise<void> {
  await updateDoc(doc(db, 'workhub_mood_boards', boardId), {
    prosCons: buildWorkhubProsConsPersistencePayload(prosCons),
    updatedAt: serverTimestamp(),
  })
}

export async function addWorkhubMoodBoardImage(
  boardId: string,
  newImage: WorkhubMoodBoardImage,
): Promise<void> {
  const payload = stripUndefinedDeep(newImage)
  await updateDoc(doc(db, 'workhub_mood_boards', boardId), {
    images: arrayUnion(payload),
    updatedAt: serverTimestamp(),
  })
}

// ── Activity / Chat functions ───────────────────────────────────────────────

export async function createWorkhubActivityWithId(input: {
  workspaceId: string
  actorUid: string
  entityType: WorkhubActivity['entityType']
  entityId: string
  action: string
  message: string
  visibility?: WorkhubVisibility
  memberUids?: string[]
  threadId?: string
  replyToActivityId?: string
  imageUrl?: string
  targetPath?: string
  messagePriority?: WorkhubChatMessagePriority
  messageDeliveryState?: WorkhubChatMessageDeliveryState
}): Promise<string> {
  const ref = doc(activityCol)
  await setDoc(ref, {
    workspaceId: input.workspaceId,
    actorUid: input.actorUid,
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    message: input.message,
    visibility: input.visibility || 'workspace',
    memberUids: input.memberUids || [],
    ...(input.threadId ? { threadId: input.threadId } : {}),
    ...(input.replyToActivityId ? { replyToActivityId: input.replyToActivityId } : {}),
    ...(input.imageUrl ? { imageUrl: input.imageUrl } : {}),
    ...(input.targetPath ? { targetPath: input.targetPath } : {}),
    ...(input.messagePriority ? { messagePriority: input.messagePriority } : {}),
    ...(input.messageDeliveryState ? { messageDeliveryState: input.messageDeliveryState } : {}),
    receivedByUids: [],
    readByUids: [],
    createdAt: serverTimestamp(),
  })
  return ref.id
}

export async function confirmWorkhubActivityReceipt(input: { activityId: string; recipientUid: string }) {
  const activityId = input.activityId.trim()
  const recipientUid = input.recipientUid.trim()
  if (!activityId || !recipientUid) return
  await updateDoc(doc(activityCol, activityId), {
    receivedByUids: arrayUnion(recipientUid),
    receivedConfirmedAt: serverTimestamp(),
  })
}

export async function markWorkhubActivityRead(input: { activityId: string; recipientUid: string }) {
  const activityId = input.activityId.trim()
  const recipientUid = input.recipientUid.trim()
  if (!activityId || !recipientUid) return
  await updateDoc(doc(activityCol, activityId), {
    readByUids: arrayUnion(recipientUid),
    readAt: serverTimestamp(),
  })
}

export async function updateWorkhubActivityDeliveryState(input: { activityId: string; state: WorkhubChatMessageDeliveryState }) {
  const activityId = input.activityId.trim()
  if (!activityId) return
  await updateDoc(doc(activityCol, activityId), {
    messageDeliveryState: input.state,
  })
}

export async function setWorkhubActivityReaction(input: { activityId: string; uid: string; reaction: string }) {
  const activityId = input.activityId.trim()
  const uid = input.uid.trim()
  const reaction = input.reaction.trim()
  if (!activityId || !uid || !reaction) return
  await updateDoc(doc(activityCol, activityId), {
    [`messageReactions.${uid}`]: reaction,
  })
}

export async function clearWorkhubActivityReaction(input: { activityId: string; uid: string }) {
  const activityId = input.activityId.trim()
  const uid = input.uid.trim()
  if (!activityId || !uid) return
  await updateDoc(doc(activityCol, activityId), {
    [`messageReactions.${uid}`]: deleteField(),
  })
}

export async function updateWorkhubActivityMessage(input: { activityId: string; message: string }) {
  const activityId = input.activityId.trim()
  if (!activityId) return
  await updateDoc(doc(activityCol, activityId), {
    message: input.message,
    editedAt: serverTimestamp(),
  })
}

export async function softDeleteWorkhubActivity(input: { activityId: string; actorUid: string }) {
  const activityId = input.activityId.trim()
  if (!activityId) return
  await updateDoc(doc(activityCol, activityId), {
    message: '',
    imageUrl: deleteField(),
    deletedBy: input.actorUid,
    deletedAt: serverTimestamp(),
  })
}

export async function removeWorkhubMoodBoardImage(
  boardId: string,
  images: WorkhubMoodBoardImage[],
  index: number,
): Promise<void> {
  await updateDoc(doc(db, 'workhub_mood_boards', boardId), stripUndefinedDeep({
    images: images.filter((_, i) => i !== index),
    updatedAt: serverTimestamp(),
  }))
}

export async function updateWorkhubMoodBoardImages(
  boardId: string,
  images: WorkhubMoodBoardImage[],
): Promise<void> {
  await updateDoc(doc(db, 'workhub_mood_boards', boardId), stripUndefinedDeep({
    images,
    updatedAt: serverTimestamp(),
  }))
}

export async function updateWorkhubMoodBoardTitle(boardId: string, title: string): Promise<void> {
  await updateDoc(doc(db, 'workhub_mood_boards', boardId), {
    title,
    updatedAt: serverTimestamp(),
  })
}

export async function updateWorkhubMoodBoardFlow(
  boardId: string,
  flowNodes: WorkhubMoodBoard['flowNodes'],
  flowEdges: WorkhubMoodBoard['flowEdges'],
  flowViewport?: WorkhubMoodBoard['flowViewport'],
  flowSettings?: WorkhubMoodBoard['flowSettings'],
): Promise<void> {
  const payload = stripUndefinedDeep({
    flowNodes: flowNodes || [],
    flowEdges: flowEdges || [],
    flowViewport: flowViewport || { x: 0, y: 0, zoom: 1 },
    flowSettings: flowSettings || {},
    updatedAt: serverTimestamp(),
  })
  await updateDoc(doc(db, 'workhub_mood_boards', boardId), payload)
}

export async function finalizeWorkhubMoodBoardImageUploads(
  boardId: string,
  uploads: Array<{
    nodeId: string
    imageUrl: string
    label?: string
    position?: { x: number; y: number }
    style?: Record<string, unknown>
  }>,
): Promise<void> {
  if (!boardId) return
  const normalizedUploads = (uploads || []).filter((item) => {
    return !!item
      && typeof item.nodeId === 'string'
      && item.nodeId.trim().length > 0
      && typeof item.imageUrl === 'string'
      && item.imageUrl.trim().length > 0
  })
  if (!normalizedUploads.length) return

  await runTransaction(db, async (transaction) => {
    const boardRef = doc(db, 'workhub_mood_boards', boardId)
    const snapshot = await transaction.get(boardRef)
    if (!snapshot.exists()) return

    const current = snapshot.data() as Partial<WorkhubMoodBoard>
    type WorkhubFlowNode = NonNullable<WorkhubMoodBoard['flowNodes']>[number]
    const currentNodes = (Array.isArray(current.flowNodes) ? current.flowNodes : []) as NonNullable<WorkhubMoodBoard['flowNodes']>
    const nextNodes: NonNullable<WorkhubMoodBoard['flowNodes']> = [...currentNodes]
    const indexById = new Map<string, number>()

    nextNodes.forEach((node, index) => {
      if (!node || typeof node !== 'object') return
      const nodeId = typeof node.id === 'string' ? node.id.trim() : ''
      if (!nodeId) return
      indexById.set(nodeId, index)
    })

    normalizedUploads.forEach((upload) => {
      const nodeId = upload.nodeId.trim()
      const existingIndex = indexById.get(nodeId)

      if (existingIndex === undefined) {
        const createdNode = stripUndefinedDeep({
          id: nodeId,
          type: 'imageNode',
          position: upload.position || { x: 0, y: 0 },
          data: {
            kind: 'image',
            imageUrl: upload.imageUrl,
            isUploading: false,
            ...(upload.label && upload.label.trim() ? { label: upload.label.trim() } : {}),
          },
          style: upload.style || { width: 220, height: 150 },
        }) as WorkhubFlowNode
        nextNodes.push(createdNode)
        indexById.set(nodeId, nextNodes.length - 1)
        return
      }

      const existingNode = nextNodes[existingIndex] as WorkhubFlowNode
      const existingData = (existingNode?.data && typeof existingNode.data === 'object')
        ? (existingNode.data as Record<string, unknown>)
        : {}

      nextNodes[existingIndex] = stripUndefinedDeep({
        id: existingNode.id || nodeId,
        type: existingNode.type || 'imageNode',
        position: existingNode.position || upload.position || { x: 0, y: 0 },
        style: existingNode.style || upload.style || { width: 220, height: 150 },
        data: {
          ...existingData,
          kind: 'image',
          imageUrl: upload.imageUrl,
          isUploading: false,
          ...(upload.label && upload.label.trim() && !String(existingData.label || '').trim()
            ? { label: upload.label.trim() }
            : {}),
        },
      }) as WorkhubFlowNode
    })

    transaction.update(boardRef, stripUndefinedDeep({
      flowNodes: nextNodes,
      updatedAt: serverTimestamp(),
    }))
  })
}

export async function updateWorkhubMoodBoardTabs(
  boardId: string,
  tabs: WorkhubMoodBoardTab[],
  activeTabId: string,
): Promise<void> {
  if (!boardId) return
  const normalizedTabs = (tabs || [])
    .map((item) => ({
      id: (item.id || '').trim(),
      title: (item.title || '').trim(),
    }))
    .filter((item) => item.id && item.title)
  if (!normalizedTabs.length) return
  const fallbackActiveTabId = normalizedTabs[0].id
  const nextActiveTabId = normalizedTabs.some((item) => item.id === activeTabId)
    ? activeTabId
    : fallbackActiveTabId
  await updateDoc(doc(db, 'workhub_mood_boards', boardId), stripUndefinedDeep({
    tabs: normalizedTabs,
    activeTabId: nextActiveTabId,
    updatedAt: serverTimestamp(),
  }))
}

export async function updateWorkhubMoodBoardUserPreference(
  boardId: string,
  userUid: string,
  preference: WorkhubMoodBoardUserPreference,
): Promise<void> {
  if (!boardId || !userUid) return
  await setDoc(doc(db, 'workhub_mood_boards', boardId), {
    userPreferences: {
      [userUid]: {
        imageLayout: preference.imageLayout === 'compact' ? 'compact' : 'large',
        showGridBackground: !!preference.showGridBackground,
        detailsCollapsed: typeof preference.detailsCollapsed === 'boolean' ? preference.detailsCollapsed : true,
        updatedAt: serverTimestamp(),
      },
    },
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

export async function deleteWorkhubMoodBoard(boardId: string): Promise<void> {
  await deleteDoc(doc(db, 'workhub_mood_boards', boardId))
}

// ── Milestones ─────────────────────────────────────────────────────────────────

export function subscribeWorkhubMilestones(
  projectId: string,
  onData: (items: WorkhubMilestone[]) => void,
): () => void {
  if (!projectId) {
    onData([])
    return () => {}
  }
  const q = query(milestonesCol, where('projectId', '==', projectId))
  return safeListen(
    () => onSnapshot(
      q,
      (snap) => {
        const items = snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as WorkhubMilestone))
          .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        onData(items)
      },
      () => onData([]),
    ),
    () => onData([]),
  )
}

export async function createWorkhubMilestone(input: {
  workspaceId: string
  projectId: string
  name: string
  description?: string
  dueDate?: string
  status: WorkhubMilestoneStatus
  color?: string
  sortOrder: number
  createdBy: string
}): Promise<string> {
  const docRef = await addDoc(milestonesCol, {
    workspaceId: input.workspaceId,
    projectId: input.projectId,
    name: input.name.trim(),
    description: (input.description || '').trim(),
    dueDate: input.dueDate || '',
    status: input.status,
    color: input.color || '',
    sortOrder: input.sortOrder,
    createdBy: input.createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return docRef.id
}

export async function updateWorkhubMilestone(
  milestoneId: string,
  patch: Partial<Pick<WorkhubMilestone, 'name' | 'description' | 'dueDate' | 'status' | 'color' | 'sortOrder'>>,
): Promise<void> {
  await updateDoc(doc(db, 'workhub_milestones', milestoneId), {
    ...patch,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteWorkhubMilestone(milestoneId: string): Promise<void> {
  await deleteDoc(doc(db, 'workhub_milestones', milestoneId))
}

