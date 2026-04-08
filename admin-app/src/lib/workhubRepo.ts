import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from './firebase'

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
  templateId?: string
  taskStatuses?: WorkhubTaskStatusConfig[]
  projectColorMeanings?: WorkhubProjectColorMeaningConfig[]
  accessMemberUids?: string[]
  memberAccessLevels?: Record<string, 'full' | 'custom'>
  invitedEmails?: string[]
  createdBy: string
  createdAt?: unknown
}

export interface WorkhubProject {
  id: string
  workspaceId: string
  parentProjectId?: string | null
  intent?: WorkhubProjectIntent
  mainPanelView?: 'tasks' | 'dashboard'
  valueAmount?: number
  valueCurrency?: string
  name: string
  description: string
  color: string
  visibility: WorkhubVisibility
  memberUids: string[]
  projectStartDate?: string
  projectDeadline?: string
  projectType?: WorkhubProjectType
  submissionTime?: string
  priority?: WorkhubProjectPriority
  clientId?: string
  notes?: string
  driveFolderId?: string
  storageMethod?: 'firebase' | 'drive'
  createdBy: string
  createdAt?: unknown
  updatedAt?: unknown
  notesUpdatedAt?: unknown
  notesUpdatedBy?: string
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

export interface WorkhubDocument {
  id: string
  workspaceId: string
  projectId?: string | null
  title: string
  body: string
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
  createdBy: string
  createdAt?: unknown
  updatedAt?: unknown
}

export interface WorkhubTask {
  id: string
  workspaceId: string
  projectId: string
  sortOrder?: number
  title: string
  description: string
  attachments?: string[]
  imageUrls?: string[]
  links?: string[]
  visibility: WorkhubVisibility
  memberUids: string[]
  status: WorkhubTaskStatus
  priority: WorkhubTaskPriority
  assigneeUid: string
  dueDate: string
  checklist?: WorkhubTaskChecklistItem[]
  completedAt?: string
  createdBy: string
  createdAt?: unknown
  updatedAt?: unknown
}

export interface WorkhubTaskChecklistItem {
  id: string
  text: string
  completed: boolean
  details?: string
  attachments?: string[]
  imageUrls?: string[]
  links?: string[]
}

export interface WorkhubTaskComment {
  id: string
  workspaceId: string
  taskId: string
  authorUid: string
  body: string
  createdAt?: unknown
}

export interface WorkhubActivity {
  id: string
  workspaceId: string
  actorUid: string
  entityType: 'workspace' | 'project' | 'task' | 'comment' | 'member' | 'document'
  entityId: string
  action: string
  message: string
  visibility?: WorkhubVisibility
  memberUids?: string[]
  createdAt?: unknown
}

export interface WorkhubNotification {
  id: string
  workspaceId: string
  recipientUid: string
  actorUid: string
  entityType: 'workspace' | 'project' | 'task' | 'comment' | 'member' | 'document'
  entityId: string
  action: string
  message: string
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

const membersCol = collection(db, 'workhub_members')
const workspacesCol = collection(db, 'workhub_workspaces')
const projectsCol = collection(db, 'workhub_projects')
const documentsCol = collection(db, 'workhub_documents')
const tasksCol = collection(db, 'workhub_tasks')
const commentsCol = collection(db, 'workhub_task_comments')
const activityCol = collection(db, 'workhub_activity')
const notificationsCol = collection(db, 'workhub_notifications')
const clientsCol = collection(db, 'workhub_clients')

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

function getDocumentOrderValue(document: Pick<WorkhubDocument, 'updatedAt' | 'createdAt'>): number {
  return getTimeValue(document.updatedAt || document.createdAt)
}

function sortDocuments(items: WorkhubDocument[]): WorkhubDocument[] {
  return [...items].sort((a, b) => {
    const orderDelta = getDocumentOrderValue(b) - getDocumentOrderValue(a)
    if (orderDelta !== 0) return orderDelta
    return getTimeValue(b.createdAt) - getTimeValue(a.createdAt)
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

function mergeClientsById(groups: WorkhubClient[][]) {
  const map = new Map<string, WorkhubClient>()
  groups.flat().forEach((item) => {
    map.set(item.id, item)
  })
  return sortClients(Array.from(map.values()))
}

export function subscribeOwnWorkhubMember(uid: string, onData: (member: WorkhubMember | null) => void) {
  return onSnapshot(doc(db, 'workhub_members', uid), (snap) => {
    onData(snap.exists() ? ({ uid: snap.id, ...snap.data() } as WorkhubMember) : null)
  })
}

export function subscribeAllWorkhubMembers(onData: (members: WorkhubMember[]) => void) {
  return onSnapshot(membersCol, (snap) => {
    onData(sortMembers(snap.docs.map((item) => ({ uid: item.id, ...item.data() } as WorkhubMember))))
  })
}

export async function requestWorkhubAccess(): Promise<WorkhubMember> {
  const fn = httpsCallable<undefined, { member: WorkhubMember }>(functions, 'requestWorkhubAccess')
  const result = await fn()
  return result.data.member
}

export async function setWorkhubMemberStatus(input: { uid: string; status: WorkhubMemberStatus; role?: WorkhubMemberRole }): Promise<WorkhubMember> {
  const fn = httpsCallable<typeof input, { member: WorkhubMember }>(functions, 'setWorkhubMemberStatus')
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
  return onSnapshot(workspacesCol, (snap) => {
    onData(sortByNewest(snap.docs.map((item) => ({ id: item.id, ...item.data() } as WorkhubWorkspace))))
  })
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
  patch: Partial<Pick<WorkhubWorkspace, 'name' | 'description' | 'type' | 'templateId' | 'taskStatuses' | 'projectColorMeanings' | 'accessMemberUids' | 'memberAccessLevels' | 'invitedEmails'>>,
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
  return onSnapshot(q, (snap) => {
    const clients = snap.docs.map((item) => ({ id: item.id, ...item.data() } as WorkhubClient))
    onData(sortClients(clients))
  })
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
    return onSnapshot(q, (snap) => {
      bucketedItems[bucketIndex] = snap.docs.map((item) => ({ id: item.id, ...item.data() } as WorkhubClient))
      emit()
    })
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

export function subscribeWorkhubProjects(workspaceId: string, currentUid: string, canSeeAll: boolean, onData: (items: WorkhubProject[]) => void) {
  if (canSeeAll) {
    const q = query(projectsCol, where('workspaceId', '==', workspaceId))
    return onSnapshot(q, (snap) => {
      onData(sortByNewest(snap.docs.map((item) => ({ id: item.id, ...item.data() } as WorkhubProject))))
    })
  }

  const workspaceQuery = query(projectsCol, where('workspaceId', '==', workspaceId), where('visibility', '==', 'workspace'))
  const restrictedQuery = query(projectsCol, where('workspaceId', '==', workspaceId), where('visibility', '==', 'restricted'), where('memberUids', 'array-contains', currentUid))
  let workspaceItems: WorkhubProject[] = []
  let restrictedItems: WorkhubProject[] = []
  const emit = () => onData(mergeById([workspaceItems, restrictedItems]))
  const unsubWorkspace = onSnapshot(workspaceQuery, (snap) => {
    workspaceItems = snap.docs.map((item) => ({ id: item.id, ...item.data() } as WorkhubProject))
    emit()
  })
  const unsubRestricted = onSnapshot(restrictedQuery, (snap) => {
    restrictedItems = snap.docs.map((item) => ({ id: item.id, ...item.data() } as WorkhubProject))
    emit()
  })
  return () => {
    unsubWorkspace()
    unsubRestricted()
  }
}

export async function createWorkhubProject(input: {
  workspaceId: string
  parentProjectId?: string | null
  intent?: WorkhubProjectIntent
  mainPanelView?: 'tasks' | 'dashboard'
  valueAmount?: number
  valueCurrency?: string
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
  priority?: WorkhubProjectPriority
  clientId?: string
  createdBy: string
}): Promise<string> {
  const docRef = await addDoc(projectsCol, {
    workspaceId: input.workspaceId,
    parentProjectId: input.parentProjectId || null,
    intent: input.intent || 'project',
    mainPanelView: input.mainPanelView || 'tasks',
    valueAmount: typeof input.valueAmount === 'number' && Number.isFinite(input.valueAmount) ? Math.max(0, input.valueAmount) : 0,
    valueCurrency: (input.valueCurrency || 'USD').trim().toUpperCase(),
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
    priority: input.priority || 'medium',
    clientId: input.clientId || '',
    notes: '',
    createdBy: input.createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return docRef.id
}

export async function updateWorkhubProject(projectId: string, patch: Partial<Pick<WorkhubProject, 'parentProjectId' | 'intent' | 'mainPanelView' | 'valueAmount' | 'valueCurrency' | 'name' | 'description' | 'color' | 'notes' | 'notesUpdatedBy' | 'visibility' | 'memberUids' | 'storageMethod' | 'projectStartDate' | 'projectDeadline' | 'projectType' | 'submissionTime' | 'priority' | 'clientId'>>) {
  const payload: Record<string, unknown> = {
    ...patch,
    updatedAt: serverTimestamp(),
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'notes')) {
    payload.notesUpdatedAt = serverTimestamp()
  }
  await updateDoc(doc(db, 'workhub_projects', projectId), payload)
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
    return onSnapshot(q, (snap) => {
      onData(sortDocuments(snap.docs.map((item) => ({ id: item.id, ...item.data() } as WorkhubDocument))))
    })
  }

  const workspaceQuery = query(documentsCol, where('workspaceId', '==', workspaceId), where('visibility', '==', 'workspace'))
  const restrictedQuery = query(documentsCol, where('memberUids', 'array-contains', currentUid))
  let workspaceItems: WorkhubDocument[] = []
  let restrictedItems: WorkhubDocument[] = []
  const emit = () => onData(mergeDocumentsById([workspaceItems, restrictedItems]))
  const unsubWorkspace = onSnapshot(workspaceQuery, (snap) => {
    workspaceItems = snap.docs.map((item) => ({ id: item.id, ...item.data() } as WorkhubDocument)
    )
    emit()
  })
  const unsubRestricted = onSnapshot(restrictedQuery, (snap) => {
    restrictedItems = snap.docs
      .map((item) => ({ id: item.id, ...item.data() } as WorkhubDocument))
      .filter((item) => item.workspaceId === workspaceId && item.visibility === 'restricted')
    emit()
  })
  return () => {
    unsubWorkspace()
    unsubRestricted()
  }
}

export async function createWorkhubDocument(input: {
  workspaceId: string
  projectId?: string | null
  title: string
  body: string
  visibility: WorkhubVisibility
  memberUids: string[]
  createdBy: string
}): Promise<string> {
  const docRef = await addDoc(documentsCol, {
    workspaceId: input.workspaceId,
    projectId: input.projectId || null,
    title: input.title,
    body: input.body,
    isLocked: false,
    lockedBy: null,
    lockedAt: null,
    visibility: input.visibility,
    memberUids: input.memberUids,
    editMemberUids: input.visibility === 'restricted' ? input.memberUids : [],
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

export async function updateWorkhubDocument(
  documentId: string,
  patch: Partial<Pick<WorkhubDocument, 'projectId' | 'title' | 'body' | 'checklist' | 'attachments' | 'links' | 'editedBy' | 'isLocked' | 'lockedBy' | 'lockedAt' | 'shareToken' | 'shareEnabled' | 'visibility' | 'memberUids' | 'editMemberUids'>>,
) {
  const payload: Record<string, unknown> = {
    ...patch,
    updatedAt: serverTimestamp(),
  }
  if (Object.prototype.hasOwnProperty.call(patch, 'projectId')) {
    payload.projectId = patch.projectId || null
  }
  await updateDoc(doc(db, 'workhub_documents', documentId), payload)
}

export async function deleteWorkhubDocument(documentId: string) {
  await deleteDoc(doc(db, 'workhub_documents', documentId))
}

export function subscribeWorkhubTasks(workspaceId: string, currentUid: string, canSeeAll: boolean, onData: (items: WorkhubTask[]) => void) {
  if (canSeeAll) {
    const q = query(tasksCol, where('workspaceId', '==', workspaceId))
    return onSnapshot(q, (snap) => {
      onData(sortTasks(snap.docs.map((item) => ({ id: item.id, ...item.data() } as WorkhubTask))))
    })
  }

  const workspaceQuery = query(tasksCol, where('workspaceId', '==', workspaceId), where('visibility', '==', 'workspace'))
  const restrictedQuery = query(tasksCol, where('workspaceId', '==', workspaceId), where('visibility', '==', 'restricted'), where('memberUids', 'array-contains', currentUid))
  let workspaceItems: WorkhubTask[] = []
  let restrictedItems: WorkhubTask[] = []
  const emit = () => onData(mergeTasksById([workspaceItems, restrictedItems]))
  const unsubWorkspace = onSnapshot(workspaceQuery, (snap) => {
    workspaceItems = snap.docs.map((item) => ({ id: item.id, ...item.data() } as WorkhubTask))
    emit()
  })
  const unsubRestricted = onSnapshot(restrictedQuery, (snap) => {
    restrictedItems = snap.docs.map((item) => ({ id: item.id, ...item.data() } as WorkhubTask))
    emit()
  })
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
  dueDate: string
  checklist?: WorkhubTaskChecklistItem[]
  createdBy: string
}): Promise<string> {
  const docRef = await addDoc(tasksCol, {
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
    dueDate: input.dueDate,
    checklist: input.checklist || [],
    createdBy: input.createdBy,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return docRef.id
}

export async function updateWorkhubTask(taskId: string, patch: Partial<Pick<WorkhubTask, 'title' | 'description' | 'attachments' | 'imageUrls' | 'links' | 'status' | 'priority' | 'assigneeUid' | 'dueDate' | 'checklist' | 'completedAt' | 'sortOrder'>>) {
  await updateDoc(doc(db, 'workhub_tasks', taskId), {
    ...patch,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteWorkhubTask(taskId: string) {
  await deleteDoc(doc(db, 'workhub_tasks', taskId))
}

export function subscribeWorkhubComments(taskId: string, onData: (items: WorkhubTaskComment[]) => void) {
  const q = query(commentsCol, where('taskId', '==', taskId))
  return onSnapshot(q, (snap) => {
    onData(sortByNewest(snap.docs.map((item) => ({ id: item.id, ...item.data() } as WorkhubTaskComment))))
  })
}

export async function addWorkhubTaskComment(input: { workspaceId: string; taskId: string; authorUid: string; body: string }): Promise<string> {
  const docRef = await addDoc(commentsCol, {
    workspaceId: input.workspaceId,
    taskId: input.taskId,
    authorUid: input.authorUid,
    body: input.body,
    createdAt: serverTimestamp(),
  })
  return docRef.id
}

export function subscribeWorkhubActivity(workspaceId: string, currentUid: string, canSeeAll: boolean, onData: (items: WorkhubActivity[]) => void) {
  if (canSeeAll) {
    const q = query(activityCol, where('workspaceId', '==', workspaceId))
    return onSnapshot(q, (snap) => {
      onData(sortByNewest(snap.docs.map((item) => ({ id: item.id, ...item.data() } as WorkhubActivity)).slice(0, 40)))
    })
  }

  const workspaceQuery = query(activityCol, where('workspaceId', '==', workspaceId), where('visibility', '==', 'workspace'))
  const restrictedQuery = query(activityCol, where('workspaceId', '==', workspaceId), where('visibility', '==', 'restricted'), where('memberUids', 'array-contains', currentUid))
  let workspaceItems: WorkhubActivity[] = []
  let restrictedItems: WorkhubActivity[] = []
  const emit = () => onData(mergeById([workspaceItems, restrictedItems]).slice(0, 40))
  const unsubWorkspace = onSnapshot(workspaceQuery, (snap) => {
    workspaceItems = snap.docs.map((item) => ({ id: item.id, ...item.data() } as WorkhubActivity))
    emit()
  })
  const unsubRestricted = onSnapshot(restrictedQuery, (snap) => {
    restrictedItems = snap.docs.map((item) => ({ id: item.id, ...item.data() } as WorkhubActivity))
    emit()
  })
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
    createdAt: serverTimestamp(),
  })
}

export function subscribeWorkhubNotifications(recipientUid: string, onData: (items: WorkhubNotification[]) => void) {
  const q = query(
    notificationsCol,
      where('recipientUid', '==', recipientUid),
  )
  return onSnapshot(q, (snap) => {
      onData(sortByNewest(snap.docs.map((item) => ({ id: item.id, ...item.data() } as WorkhubNotification))))
  })
}

export async function createWorkhubNotifications(input: {
  workspaceId: string
  actorUid: string
  recipientUids: string[]
  entityType: WorkhubNotification['entityType']
  entityId: string
  action: string
  message: string
}) {
  const targets = Array.from(new Set(input.recipientUids.filter((uid) => !!uid && uid !== input.actorUid)))
  if (targets.length === 0) return
  await Promise.all(targets.map((recipientUid) => addDoc(notificationsCol, {
    workspaceId: input.workspaceId,
    recipientUid,
    actorUid: input.actorUid,
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    message: input.message,
    read: false,
    createdAt: serverTimestamp(),
  })))
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
