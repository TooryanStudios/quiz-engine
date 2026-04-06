import { onAuthStateChanged, signOut } from 'firebase/auth'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { auth, storage } from '../lib/firebase'
import { markSignOut } from '../lib/signOutState'
import { useToast } from '../lib/ToastContext'
import {
  addWorkhubTaskComment,
  createWorkhubActivity,
  createWorkhubClient,
  createWorkhubNotifications,
  createWorkhubProject,
  createWorkhubTask,
  createWorkhubWorkspace,
  deleteWorkhubClient,
  deleteWorkhubProject,
  deleteWorkhubTask,
  deleteWorkhubWorkspace,
  requestWorkhubAccess,
  setWorkhubMemberStatus,
  markWorkhubNotificationRead,
  subscribeAllWorkhubMembers,
  subscribeOwnWorkhubMember,
  subscribeWorkhubActivity,
  subscribeWorkhubComments,
  subscribeWorkhubClientsMulti,
  subscribeWorkhubNotifications,
  subscribeWorkhubProjectsMulti,
  subscribeWorkhubTasks,
  subscribeWorkhubWorkspaces,
  uploadWorkhubAttachmentToDrive,
  ensureWorkhubDriveProjectFolder,
  deleteWorkhubAttachmentFromDrive,
  updateWorkhubProject,
  updateWorkhubTask,
  updateWorkhubClient,
  updateWorkhubWorkspace,
  type WorkhubActivity,
  type WorkhubClient,
  type WorkhubMember,
  type WorkhubNotification,
  type WorkhubProject,
  type WorkhubProjectPriority,
  type WorkhubProjectType,
  type WorkhubTask,
  type WorkhubTaskChecklistItem,
  type WorkhubTaskPriority,
  type WorkhubTaskStatus,
  type WorkhubVisibility,
  type WorkhubWorkspace,
} from '../lib/workhubRepo'

const MASTER_EMAIL = import.meta.env.VITE_MASTER_EMAIL as string | undefined
const PRIORITY_LABELS: Record<WorkhubTaskPriority, string> = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
}

const getPriorityIcon = (priority: WorkhubTaskPriority) => {
  switch (priority) {
    case 'urgent': return '🚩'
    case 'high': return '⚡'
    case 'medium': return '📌'
    case 'low': return '📎'
    default: return '📎'
  }
}

const getTaskStatusIcon = (statusId: string) => {
  const normalized = statusId.toLowerCase()
  if (normalized.includes('backlog')) return '🕒'
  if (normalized.includes('open')) return '📂'
  if (normalized.includes('progress')) return '⚙️'
  if (normalized.includes('review')) return '👁️'
  if (normalized.includes('complete') || normalized.includes('done')) return '✅'
  if (normalized.includes('cancel')) return '⛔'
  return '•'
}
const PROJECT_COLORS = ['#6d5efc', '#10b981', '#f59e0b', '#ef4444', '#06b6d4', '#8b5cf6']
const PROJECT_TYPE_OPTIONS: Array<{ value: WorkhubProjectType; label: string }> = [
  { value: 'tender', label: 'Tender' },
  { value: 'lead', label: 'Lead' },
  { value: 'direct_award', label: 'Direct award' },
  { value: 'other', label: 'Other' },
]
const PROJECT_PRIORITY_OPTIONS: Array<{ value: WorkhubProjectPriority; label: string; color: string }> = [
  { value: 'critical', label: 'Critical', color: '#dc2626' },
  { value: 'high', label: 'High', color: '#ea580c' },
  { value: 'medium', label: 'Medium', color: '#2563eb' },
  { value: 'low', label: 'Low', color: '#64748b' },
]

const PROJECT_PRIORITY_RANK: Record<WorkhubProjectPriority, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
}

function formatTime(value: unknown): string {
  if (!value) return '—'
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
    return ((value as { toDate: () => Date }).toDate()).toLocaleString()
  }
  if (typeof value === 'object' && value !== null && 'seconds' in value) {
    const seconds = Number((value as { seconds?: unknown }).seconds || 0)
    return new Date(seconds * 1000).toLocaleString()
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    if (Number.isFinite(parsed)) return new Date(parsed).toLocaleString()
  }
  return '—'
}

function initialsOf(name: string) {
  return name
    .split(' ')
    .map((part) => part.trim().slice(0, 1))
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'WM'
}

function isValidHexColor(value: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value)
}

function normalizeMemberUids(uids: string[]) {
  return Array.from(new Set(uids.filter(Boolean)))
}

function normalizeInviteEmails(emails: string[]) {
  return Array.from(new Set(emails.map((value) => value.trim().toLowerCase()).filter(Boolean)))
}

function canAccessWorkspace(
  workspace: WorkhubWorkspace,
  uid: string,
  email: string,
  isPrivileged: boolean,
) {
  if (isPrivileged) return true
  const accessMemberUids = normalizeMemberUids(workspace.accessMemberUids || [])
  const invitedEmails = normalizeInviteEmails(workspace.invitedEmails || [])
  const hasUidAccess = accessMemberUids.includes(uid)
  const hasEmailInvite = !!email && invitedEmails.includes(email.trim().toLowerCase())
  return hasUidAccess || hasEmailInvite
}

function formatDueDateShort(value: string) {
  if (!value) return 'No due date'
  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed)) return value
  return new Date(parsed).toLocaleDateString(undefined, { day: 'numeric', month: 'numeric', year: '2-digit' })
}

function resolveProjectDeadlineMs(project: Pick<WorkhubProject, 'projectDeadline' | 'submissionTime' | 'projectType'>) {
  const dateValue = (project.projectDeadline || '').trim()
  if (!dateValue) return Number.NaN
  if (project.projectType === 'tender') {
    const timeValue = (project.submissionTime || '').trim() || '23:59'
    const parsed = Date.parse(`${dateValue}T${timeValue}`)
    return Number.isFinite(parsed) ? parsed : Number.NaN
  }
  const parsed = Date.parse(`${dateValue}T23:59`)
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

function formatProjectDeadlineDate(value: string) {
  const normalized = (value || '').trim()
  const parts = normalized.split('-')
  if (parts.length === 3 && parts[0].length === 4) {
    const [year, month, day] = parts
    return `${day}-${month}-${year}`
  }
  return normalized
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

function isImageAttachmentUrl(value: string) {
  const url = (value || '').trim().toLowerCase()
  if (!url) return false
  if (url.startsWith('data:image/')) return true
  try {
    const parsed = new URL(url)
    if (/\.(png|jpe?g|gif|webp|bmp|svg|avif)$/i.test(parsed.pathname)) return true
    const nameParam = parsed.searchParams.get('name') || parsed.searchParams.get('filename') || ''
    return /\.(png|jpe?g|gif|webp|bmp|svg|avif)$/i.test(nameParam)
  } catch {
    return /\.(png|jpe?g|gif|webp|bmp|svg|avif)(\?.*)?$/i.test(url)
  }
}

function canViewProject(project: WorkhubProject, uid: string, canSeeAllProjects: boolean) {
  if (canSeeAllProjects) return true
  if (project.visibility !== 'restricted') return true
  return project.createdBy === uid || project.memberUids.includes(uid)
}

function getWorkspaceType(workspace: Pick<WorkhubWorkspace, 'type'> | null | undefined): 'technical' | 'hr' | 'finance' {
  return workspace?.type || 'technical'
}

function makeTaskStatusId(label: string) {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || `status_${Date.now()}`
}

// Strip invisible/control characters that can make a task look blank while still being non-empty.
const INVISIBLE_TASK_TITLE_CHARS = /[\u0000-\u001F\u007F-\u009F\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2069\u2800\u3164\uFEFF\uFFA0]/g

function normalizeTaskTitle(rawTitle: string): string {
  return rawTitle
    .replace(INVISIBLE_TASK_TITLE_CHARS, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function isEffectivelyEmptyTaskTitle(rawTitle: string): boolean {
  const normalized = normalizeTaskTitle(rawTitle)
  if (!normalized) return true
  const semantic = normalized.replace(/[\p{P}\p{S}\p{M}\p{Z}\p{C}_]+/gu, '')
  return semantic.length === 0
}

function splitTaskTitles(rawTitle: string): string[] {
  return rawTitle
    .split(/[\r\n\u2028\u2029]+/)
    .map((line) => normalizeTaskTitle(line))
    .filter(Boolean)
}

type WorkhubProjectTreeNode = WorkhubProject & { children: WorkhubProjectTreeNode[] }
type WorkhubImageMarkerType = 'point' | 'line' | 'checkbox'

interface WorkhubImageComment {
  id: string
  author: string
  text: string
  createdAt: string
}

interface WorkhubImageMarker {
  id: string
  type: WorkhubImageMarkerType
  x: number
  y: number
  x2?: number
  y2?: number
  text?: string
  checked?: boolean
  resolved?: boolean
  createdBy?: string
  createdAt?: string
}

interface WorkhubImageModificationCheck {
  id: string
  label: string
  done: boolean
  createdBy: string
  createdAt: string
}

interface WorkhubImageReview {
  notes: string
  comments: WorkhubImageComment[]
  markers: WorkhubImageMarker[]
  modificationChecks: WorkhubImageModificationCheck[]
}

interface QuickAddTaskSubmitInput {
  statusId: string
  title: string
  assigneeUid: string
  priority: WorkhubTaskPriority
  dueDate: string
  projectId: string
}

type WorkhubUserAccessMode = 'full' | 'workspace_based'

interface WorkhubUserWorkspaceDraft {
  enabled: boolean
  level: 'full' | 'custom'
}

interface WorkhubUserAccessDraft {
  mode: WorkhubUserAccessMode
  workspaceById: Record<string, WorkhubUserWorkspaceDraft>
}

const ATTACHMENT_REVIEW_STORAGE_KEY = 'workhub_attachment_reviews_v1'

function createEmptyImageReview(): WorkhubImageReview {
  return {
    notes: '',
    comments: [],
    markers: [],
    modificationChecks: [],
  }
}

function buildProjectTree(items: WorkhubProject[]): WorkhubProjectTreeNode[] {
  const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name))
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
      children: build(item.id),
    }))
  }
  return build('')
}

function flattenProjectTree(nodes: WorkhubProjectTreeNode[], depth = 0): Array<{ id: string; name: string; depth: number }> {
  return nodes.flatMap((node) => [
    { id: node.id, name: node.name, depth },
    ...flattenProjectTree(node.children, depth + 1),
  ])
}

function collectProjectBranchIds(projectId: string, byParent: Map<string, WorkhubProject[]>): Set<string> {
  const ids = new Set<string>()
  const visit = (id: string) => {
    ids.add(id)
    ;(byParent.get(id) || []).forEach((child) => visit(child.id))
  }
  if (projectId) visit(projectId)
  return ids
}

function collectProjectLineage(projectId: string, byId: Record<string, WorkhubProject>) {
  const lineage: string[] = []
  let pointer = byId[projectId]
  while (pointer?.parentProjectId) {
    lineage.unshift(pointer.parentProjectId)
    pointer = byId[pointer.parentProjectId]
  }
  return lineage
}

import type { WorkhubTaskStatusConfig } from '../lib/workhubRepo'

type WorkhubStatusTemplateId = 'workspace_default' | 'tender_pipeline' | 'delivery_execution' | 'simple_kanban'

const DEFAULT_TASK_STATUSES: WorkhubTaskStatusConfig[] = [
  { id: 'backlog', label: 'to-do', color: '#6b7280' },
  { id: 'open', label: 'Open', color: '#3b82f6' },
  { id: 'in_progress', label: 'In Progress', color: '#f59e0b' },
  { id: 'review', label: 'Review', color: '#8b5cf6' },
  { id: 'completed', label: 'Completed', color: '#10b981' },
  { id: 'canceled', label: 'Canceled', color: '#ef4444' },
]

function cloneDefaultTaskStatuses() {
  return DEFAULT_TASK_STATUSES.map((status) => ({ ...status }))
}

const WORKSPACE_STATUS_TEMPLATE_OPTIONS: Array<{ value: WorkhubStatusTemplateId; label: string; description: string }> = [
  { value: 'workspace_default', label: 'Workspace default', description: 'Recommended set based on workspace type.' },
  { value: 'tender_pipeline', label: 'Tender pipeline', description: 'Stages for bids from qualification to award.' },
  { value: 'delivery_execution', label: 'Delivery execution', description: 'Stages for project execution and handover.' },
  { value: 'simple_kanban', label: 'Simple kanban', description: 'Lean four-step flow for quick teams.' },
]

const STATUS_TEMPLATE_PRESETS: Record<Exclude<WorkhubStatusTemplateId, 'workspace_default'>, WorkhubTaskStatusConfig[]> = {
  tender_pipeline: [
    { id: 'qualified', label: 'Qualified', color: '#64748b' },
    { id: 'proposal_draft', label: 'Proposal Draft', color: '#2563eb' },
    { id: 'submitted', label: 'Submitted', color: '#0ea5e9' },
    { id: 'clarification', label: 'Clarification', color: '#f59e0b' },
    { id: 'negotiation', label: 'Negotiation', color: '#8b5cf6' },
    { id: 'awarded', label: 'Awarded', color: '#10b981' },
    { id: 'lost', label: 'Lost', color: '#ef4444' },
  ],
  delivery_execution: [
    { id: 'kickoff', label: 'Kickoff', color: '#64748b' },
    { id: 'planning', label: 'Planning', color: '#2563eb' },
    { id: 'execution', label: 'Execution', color: '#f59e0b' },
    { id: 'qa_qc', label: 'QA/QC', color: '#8b5cf6' },
    { id: 'handover', label: 'Handover', color: '#0ea5e9' },
    { id: 'closed', label: 'Closed', color: '#10b981' },
    { id: 'blocked', label: 'Blocked', color: '#ef4444' },
  ],
  simple_kanban: [
    { id: 'todo', label: 'To-do', color: '#64748b' },
    { id: 'doing', label: 'Doing', color: '#2563eb' },
    { id: 'done', label: 'Done', color: '#10b981' },
    { id: 'blocked', label: 'Blocked', color: '#ef4444' },
  ],
}

function buildWorkspaceTaskStatuses(templateId: WorkhubStatusTemplateId, workspaceType: 'technical' | 'hr' | 'finance') {
  if (templateId !== 'workspace_default') {
    return STATUS_TEMPLATE_PRESETS[templateId].map((status) => ({ ...status }))
  }
  if (workspaceType === 'finance') {
    return [
      { id: 'received', label: 'Received', color: '#64748b' },
      { id: 'review', label: 'Review', color: '#2563eb' },
      { id: 'approved', label: 'Approved', color: '#10b981' },
      { id: 'paid', label: 'Paid', color: '#0ea5e9' },
      { id: 'hold', label: 'On Hold', color: '#f59e0b' },
      { id: 'rejected', label: 'Rejected', color: '#ef4444' },
    ]
  }
  if (workspaceType === 'hr') {
    return [
      { id: 'intake', label: 'Intake', color: '#64748b' },
      { id: 'screening', label: 'Screening', color: '#2563eb' },
      { id: 'interview', label: 'Interview', color: '#8b5cf6' },
      { id: 'offer', label: 'Offer', color: '#0ea5e9' },
      { id: 'onboarded', label: 'Onboarded', color: '#10b981' },
      { id: 'closed', label: 'Closed', color: '#ef4444' },
    ]
  }
  return cloneDefaultTaskStatuses()
}

// ---------------------------------------------------------------------------
// Pure helpers (no component state — safe to call from useMemo / TaskRow)
// ---------------------------------------------------------------------------
function buildChecklist(task: WorkhubTask): WorkhubTaskChecklistItem[] {
  if (!Array.isArray(task.checklist)) return []
  return task.checklist.map((item) => ({
    ...item,
    details: item.details || '',
    attachments: Array.isArray(item.attachments) ? item.attachments : (Array.isArray(item.imageUrls) ? item.imageUrls : []),
    imageUrls: Array.isArray(item.imageUrls) ? item.imageUrls : [],
    links: Array.isArray(item.links) ? item.links : [],
  }))
}

function getTaskAttachments(task: WorkhubTask): string[] {
  if (Array.isArray(task.attachments)) return task.attachments
  return Array.isArray(task.imageUrls) ? task.imageUrls : []
}

function getTaskLinks(task: WorkhubTask): string[] {
  return Array.isArray(task.links) ? task.links : []
}

// ---------------------------------------------------------------------------
// TaskRow — memoised so only the row(s) whose props actually changed re-render
// ---------------------------------------------------------------------------
interface TaskRowMeta {
  checklist: WorkhubTaskChecklistItem[]
  checklistDoneCount: number
  checklistDetailsCount: number
  checklistImagesCount: number
  checklistLinksCount: number
  taskAttachmentCount: number
}
const emptyTaskRowMeta: TaskRowMeta = {
  checklist: [], checklistDoneCount: 0, checklistDetailsCount: 0,
  checklistImagesCount: 0, checklistLinksCount: 0, taskAttachmentCount: 0,
}

interface TaskRowCallbacks {
  onDragOver: (event: React.DragEvent, taskId: string, taskStatus: string) => void
  onDrop: (event: React.DragEvent, taskId: string, taskStatus: string) => void
  onRowClick: (taskId: string) => void
  onDoubleClickRow: (taskId: string) => void
  onDragStart: (event: React.DragEvent<HTMLButtonElement>, taskId: string, taskStatus: string) => void
  onDragEnd: () => void
  onCheckboxChange: (taskId: string, checked: boolean) => void
  onTitleEditStart: (task: WorkhubTask) => void
  onTitleEditTextChange: (text: string) => void
  onTitleEditSave: (task: WorkhubTask) => void
  onTitleEditCancel: () => void
  onOpenStatusMenu: (taskId: string) => void
  onOpenPriorityMenu: (taskId: string) => void
  onOpenMoreMenu: (taskId: string) => void
  onOpenAssigneeMenu: (taskId: string) => void
  onAssigneeSelect: (task: WorkhubTask, uid: string) => void
  onStatusSelect: (task: WorkhubTask, statusId: WorkhubTaskStatus) => void
  onPrioritySelect: (task: WorkhubTask, priorityValue: WorkhubTaskPriority) => void
  onToggleChecklist: (taskId: string) => void
  onOpenDetails: (taskId: string) => void
  onChecklistItemToggle: (task: WorkhubTask, itemId: string, checked: boolean) => void
  onChecklistItemEditStart: (taskId: string, itemId: string, text: string, scope: 'inline' | 'details') => void
  onChecklistItemTextChange: (text: string) => void
  onChecklistItemEditSave: (task: WorkhubTask, itemId: string) => void
  onChecklistItemEditCancel: () => void
  onChecklistRemove: (task: WorkhubTask, itemId: string) => void
  onChecklistAdd: (task: WorkhubTask) => void
  onChecklistDraftChange: (taskId: string, value: string) => void
}

interface TaskRowProps {
  task: WorkhubTask
  index: number
  isChecked: boolean
  isSelected: boolean
  isDropTarget: boolean
  isDragSource: boolean
  statusMenuOpen: boolean
  priorityMenuOpen: boolean
  moreMenuOpen: boolean
  assigneeMenuOpen: boolean
  editingTitle: boolean
  editingTitleText: string
  checklistExpanded: boolean
  checklistDraft: string
  editingChecklistItemId: string | null
  editingChecklistScope: 'inline' | 'details' | null
  editingChecklistText: string
  isTaskBusy: boolean
  taskAssignee: WorkhubMember | undefined
  assignableMembers: WorkhubMember[]
  taskCreator: WorkhubMember | undefined
  statuses: WorkhubTaskStatusConfig[]
  meta: TaskRowMeta
  callbacks: TaskRowCallbacks
}

const TaskRow = memo(function TaskRow({
  task, index, isChecked, isSelected, isDropTarget, isDragSource,
  statusMenuOpen, priorityMenuOpen, moreMenuOpen, assigneeMenuOpen,
  editingTitle, editingTitleText, checklistExpanded, checklistDraft,
  editingChecklistItemId, editingChecklistScope, editingChecklistText,
  isTaskBusy, taskAssignee, taskCreator, assignableMembers, statuses, meta, callbacks,
}: TaskRowProps) {
  const { checklist, checklistDoneCount, checklistDetailsCount, checklistImagesCount, checklistLinksCount, taskAttachmentCount } = meta
  const assigneeLabel = taskAssignee?.displayName || taskAssignee?.email || 'Unassigned'
  const creatorLabel = taskCreator?.displayName || taskCreator?.email || 'Unknown'
  const showCreatorSeparately = taskCreator && taskCreator.uid !== task.assigneeUid
  const assigneeIsCreator = taskCreator?.uid === task.assigneeUid
  const currentTaskStatus = statuses.find((s) => s.id === task.status) || DEFAULT_TASK_STATUSES.find((s) => s.id === task.status)
  const currentTaskStatusLabel = currentTaskStatus?.label || task.status
  const currentTaskStatusColor = currentTaskStatus?.color || '#8aa0c7'
  const hasOpenInlineMenu = statusMenuOpen || priorityMenuOpen || moreMenuOpen || assigneeMenuOpen

  return (
    <article
      className={`workhub-task-row${isSelected ? ' is-selected' : ''}${isChecked ? ' is-checked' : ''}${index % 2 === 1 ? ' is-alt' : ''}${hasOpenInlineMenu ? ' has-open-menu' : ''}${isDropTarget ? ' is-drop-target' : ''}${isDragSource ? ' is-dragging' : ''}`}
      onDragOver={(event) => callbacks.onDragOver(event, task.id, task.status)}
      onDrop={(event) => callbacks.onDrop(event, task.id, task.status)}
      onClick={() => callbacks.onRowClick(task.id)}
    >
      <div
        className="workhub-task-row-main"
        onDoubleClick={(event) => {
          event.stopPropagation()
          const target = event.target as HTMLElement
          if (target.closest('.workhub-task-row-title')) return
          callbacks.onDoubleClickRow(task.id)
        }}
      >
        <div className="workhub-task-row-grid">
          <div className="workhub-task-col details">
            <button
              type="button"
              className="workhub-task-drag-handle"
              draggable
              onClick={(event) => event.stopPropagation()}
              onDragStart={(event) => { event.stopPropagation(); callbacks.onDragStart(event, task.id, task.status) }}
              onDragEnd={() => callbacks.onDragEnd()}
              title="Drag to reorder"
              aria-label="Drag to reorder"
            >
              ⋮⋮
            </button>
            <input
              type="checkbox"
              checked={isChecked}
              onChange={(event) => callbacks.onCheckboxChange(task.id, event.target.checked)}
              onClick={(event) => event.stopPropagation()}
            />
            <div
              className="workhub-task-row-title"
              onDoubleClick={(event) => {
                event.stopPropagation()
                if (!editingTitle) callbacks.onTitleEditStart(task)
              }}
            >
              {editingTitle ? (
                <input
                  type="text"
                  className="workhub-task-title-edit-input"
                  value={editingTitleText}
                  onChange={(event) => callbacks.onTitleEditTextChange(event.target.value)}
                  onClick={(event) => event.stopPropagation()}
                  onDoubleClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => {
                    event.stopPropagation()
                    if (event.key === 'Enter') { event.preventDefault(); callbacks.onTitleEditSave(task) }
                    else if (event.key === 'Escape') { event.preventDefault(); callbacks.onTitleEditCancel() }
                  }}
                  onBlur={() => callbacks.onTitleEditSave(task)}
                  autoFocus
                />
              ) : (
                <>
                  <strong
                    onDoubleClick={(event) => { event.stopPropagation(); callbacks.onTitleEditStart(task) }}
                    title="Double-click to rename"
                  >
                    {normalizeTaskTitle(task.title || '') || 'Untitled task'}
                  </strong>
                  <span className="workhub-title-edit-hint" aria-hidden="true">edit</span>
                </>
              )}
            </div>
          </div>
          <div className="workhub-task-col status">
            <button
              type="button"
              className="workhub-task-status-btn"
              style={{ '--status-color': currentTaskStatusColor } as React.CSSProperties}
              onClick={(event) => {
                event.stopPropagation()
                callbacks.onOpenStatusMenu(task.id)
              }}
              title={currentTaskStatusLabel}
              aria-label={`Status: ${currentTaskStatusLabel}`}
            >
              <span className="status-dot" />
            </button>
            {statusMenuOpen && (
              <div className="workhub-task-status-menu" onClick={(event) => event.stopPropagation()}>
                {statuses.map((taskStatus) => (
                  <button
                    key={taskStatus.id}
                    type="button"
                    className={task.status === taskStatus.id ? 'is-active' : ''}
                    style={{ '--status-color': taskStatus.color } as React.CSSProperties}
                    onClick={() => callbacks.onStatusSelect(task, taskStatus.id as WorkhubTaskStatus)}
                  >
                    <span className="status-dot" />
                    <span className="status-icon">{getTaskStatusIcon(taskStatus.id)}</span>
                    <span>{taskStatus.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="workhub-task-col assignee">
            <div className="workhub-task-people">
              {showCreatorSeparately && (
                <span className="workhub-assignee-badge workhub-task-creator-badge" title={`Created by ${creatorLabel}`}>
                  {taskCreator!.photoURL
                    ? <img src={taskCreator!.photoURL} alt={creatorLabel} />
                    : <span className="workhub-assignee-initials">{getInitials(creatorLabel)}</span>}
                </span>
              )}
              <button
                type="button"
                className={`workhub-assignee-badge workhub-task-assignee-btn${assigneeIsCreator ? ' is-creator' : ''}`}
                title={assigneeLabel}
                onClick={(event) => {
                  event.stopPropagation()
                  callbacks.onOpenAssigneeMenu(task.id)
                }}
              >
                {taskAssignee?.photoURL
                  ? <img src={taskAssignee.photoURL} alt={assigneeLabel} />
                  : <span className="workhub-assignee-fallback">👤</span>}
              </button>
            </div>
            {assigneeMenuOpen && (
              <div className="workhub-task-assignee-menu" onClick={(event) => event.stopPropagation()}>
                <button
                  type="button"
                  className={!task.assigneeUid ? 'is-active' : ''}
                  onClick={() => callbacks.onAssigneeSelect(task, '')}
                >
                  Unassigned
                </button>
                {assignableMembers.map((member) => (
                  <button
                    key={member.uid}
                    type="button"
                    className={task.assigneeUid === member.uid ? 'is-active' : ''}
                    onClick={() => callbacks.onAssigneeSelect(task, member.uid)}
                  >
                    {member.displayName || member.email}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="workhub-task-col due">
            <span className={task.dueDate ? 'is-set' : 'is-empty'}>📅 {formatDueDateShort(task.dueDate || '')}</span>
          </div>
          <div className="workhub-task-col priority">
            <button
              type="button"
              className={`workhub-priority-indicator priority-${task.priority}`}
              title={`Priority: ${PRIORITY_LABELS[task.priority]}`}
              aria-label={`Priority: ${PRIORITY_LABELS[task.priority]}`}
              onClick={(event) => {
                event.stopPropagation()
                callbacks.onOpenPriorityMenu(task.id)
              }}
            >
              {getPriorityIcon(task.priority)}
            </button>
            {priorityMenuOpen && (
              <div className="workhub-task-priority-menu" onClick={(event) => event.stopPropagation()}>
                {(Object.keys(PRIORITY_LABELS) as WorkhubTaskPriority[]).map((priorityValue) => (
                  <button
                    key={priorityValue}
                    type="button"
                    className={task.priority === priorityValue ? 'is-active' : ''}
                    onClick={() => callbacks.onPrioritySelect(task, priorityValue)}
                  >
                    <span className={`workhub-priority-indicator priority-${priorityValue}`}>{getPriorityIcon(priorityValue)}</span>
                    <span>{PRIORITY_LABELS[priorityValue]}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="workhub-task-col checklist-inline">
            <button
              className="workhub-checklist-toggle"
              onClick={(event) => { event.stopPropagation(); callbacks.onToggleChecklist(task.id) }}
              title="Toggle checklist"
            >
              {checklistExpanded ? '▾' : '▸'} {checklist.length > 0 ? `${checklistDoneCount}/${checklist.length}` : 'List'}
            </button>
            {(checklistDetailsCount > 0 || checklistImagesCount > 0 || checklistLinksCount > 0) && (
              <span className="workhub-checklist-meta" title={`Details: ${checklistDetailsCount} • Attachments: ${checklistImagesCount} • Links: ${checklistLinksCount}`}>
                {checklistDetailsCount > 0 && <span>📝{checklistDetailsCount}</span>}
                {checklistImagesCount > 0 && <span>📎{checklistImagesCount}</span>}
                {checklistLinksCount > 0 && <span>🔗{checklistLinksCount}</span>}
              </span>
            )}
          </div>
          <div className="workhub-task-col actions-inline">
            {taskAttachmentCount > 0 && (
              <span
                className="workhub-task-attachment-indicator"
                title={`${taskAttachmentCount} attachment${taskAttachmentCount === 1 ? '' : 's'}`}
                aria-label={`${taskAttachmentCount} attachment${taskAttachmentCount === 1 ? '' : 's'}`}
              >
                📎
              </span>
            )}
            <button className="workhub-gear-btn" onClick={(event) => { event.stopPropagation(); callbacks.onOpenDetails(task.id) }}>
              ⚙️
            </button>
          </div>
          <div className="workhub-task-col more">
            <button
              type="button"
              className="workhub-task-more-btn"
              onClick={(event) => {
                event.stopPropagation()
                callbacks.onOpenMoreMenu(task.id)
              }}
              title="More"
              aria-label="More"
            >
              ⋯
            </button>
            {moreMenuOpen && (
              <div className="workhub-task-more-menu" onClick={(event) => event.stopPropagation()}>
                <button type="button" onClick={() => callbacks.onToggleChecklist(task.id)}>
                  {checklistExpanded ? 'Hide list' : 'Show list'} {checklist.length > 0 ? `(${checklistDoneCount}/${checklist.length})` : ''}
                </button>
                <button type="button" onClick={() => callbacks.onOpenDetails(task.id)}>
                  Open details
                </button>
              </div>
            )}
          </div>
        </div>
        {checklistExpanded && (
          <div className="workhub-task-checklist" onClick={(event) => event.stopPropagation()}>
            {checklist.length === 0 ? (
              <div className="workhub-checklist-empty">No checklist items yet.</div>
            ) : (
              <div className="workhub-checklist-items">
                {checklist.map((item, itemIndex) => (
                  <div key={item.id} className={`workhub-checklist-item ${itemIndex % 2 === 0 ? 'even' : 'odd'}`}>
                    <div className="workhub-checklist-left">
                      <div className="workhub-checklist-item-main">
                        <input
                          type="checkbox"
                          checked={item.completed}
                          onChange={(event) => callbacks.onChecklistItemToggle(task, item.id, event.target.checked)}
                          onClick={(event) => event.stopPropagation()}
                        />
                        {editingChecklistScope === 'inline' && editingChecklistItemId === item.id ? (
                          <input
                            type="text"
                            value={editingChecklistText}
                            onChange={(event) => callbacks.onChecklistItemTextChange(event.target.value)}
                            onKeyDown={(event) => {
                              event.stopPropagation()
                              if (event.key === 'Enter') { event.preventDefault(); callbacks.onChecklistItemEditSave(task, item.id) }
                              else if (event.key === 'Escape') { event.preventDefault(); callbacks.onChecklistItemEditCancel() }
                            }}
                            onBlur={() => callbacks.onChecklistItemEditSave(task, item.id)}
                            className="workhub-checklist-edit-input"
                            autoFocus
                          />
                        ) : (
                          <span
                            className={`workhub-checklist-item-text${item.completed ? ' is-checked' : ''}`}
                            onDoubleClick={() => callbacks.onChecklistItemEditStart(task.id, item.id, item.text, 'inline')}
                          >
                            {item.text}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="workhub-checklist-actions">
                      <button
                        type="button"
                        className="workhub-checklist-edit"
                        onClick={(e) => { e.stopPropagation(); callbacks.onChecklistItemEditStart(task.id, item.id, item.text, 'inline') }}
                        title="Edit checklist item"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        className="workhub-checklist-remove"
                        onClick={(e) => { e.stopPropagation(); callbacks.onChecklistRemove(task, item.id) }}
                        title="Delete checklist item"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="workhub-checklist-add">
              <input
                type="text"
                value={checklistDraft}
                placeholder="Add checklist item"
                onChange={(event) => callbacks.onChecklistDraftChange(task.id, event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') { event.preventDefault(); callbacks.onChecklistAdd(task) }
                }}
              />
              <button type="button" onClick={() => callbacks.onChecklistAdd(task)} disabled={!checklistDraft.trim() || isTaskBusy}>
                Add
              </button>
            </div>
          </div>
        )}
      </div>
    </article>
  )
})

export default function WorkHubPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { showToast } = useToast()
  const [userEmail, setUserEmail] = useState('')
  const [userName, setUserName] = useState('')
  const [member, setMember] = useState<WorkhubMember | null>(null)
  const [memberLoading, setMemberLoading] = useState(true)
  const [requestingAccess, setRequestingAccess] = useState(false)
  const [members, setMembers] = useState<WorkhubMember[]>([])
  const [workspaces, setWorkspaces] = useState<WorkhubWorkspace[]>([])
  const [clients, setClients] = useState<WorkhubClient[]>([])
  const [projects, setProjects] = useState<WorkhubProject[]>([])
  const [tasks, setTasks] = useState<WorkhubTask[]>([])
  const [activity, setActivity] = useState<WorkhubActivity[]>([])
  const [notifications, setNotifications] = useState<WorkhubNotification[]>([])
  const [notificationMenuOpen, setNotificationMenuOpen] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [comments, setComments] = useState<Array<{ id: string; workspaceId: string; taskId: string; authorUid: string; body: string; createdAt?: unknown }>>([])
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('')
  const [selectedProjectId, setSelectedProjectId] = useState('all')
  const [selectedAssigneeUid, setSelectedAssigneeUid] = useState('all')
  const [selectedTaskId, setSelectedTaskId] = useState('')
  const [selectedNoteProjectId, setSelectedNoteProjectId] = useState('')
  const [activeSection, setActiveSection] = useState<'home' | 'workspaces' | 'users' | 'tasks' | 'notes' | 'dashboard' | 'clients'>('home')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [createDialogType, setCreateDialogType] = useState<'workspace' | 'project' | 'task'>('project')
  const [teamDialogOpen, setTeamDialogOpen] = useState(false)
  const [workspaceSettingsId, setWorkspaceSettingsId] = useState('')
  const [projectAccessDialogId, setProjectAccessDialogId] = useState('')
  const [workspaceName, setWorkspaceName] = useState('')
  const [workspaceDescription, setWorkspaceDescription] = useState('')
  const [workspaceType, setWorkspaceType] = useState<'technical' | 'hr' | 'finance'>('technical')
  const [workspaceStatusTemplate, setWorkspaceStatusTemplate] = useState<WorkhubStatusTemplateId>('workspace_default')
  const [workspaceSettingsName, setWorkspaceSettingsName] = useState('')
  const [workspaceSettingsDescription, setWorkspaceSettingsDescription] = useState('')
  const [workspaceAccessMemberUids, setWorkspaceAccessMemberUids] = useState<string[]>([])
  const [workspaceMemberAccessLevels, setWorkspaceMemberAccessLevels] = useState<Record<string, 'full' | 'custom'>>({})
  const [workspaceInviteEmails, setWorkspaceInviteEmails] = useState<string[]>([])
  const [workspaceInviteEmailDraft, setWorkspaceInviteEmailDraft] = useState('')
  const [workspaceDeleteTypedName, setWorkspaceDeleteTypedName] = useState('')
  const [workspaceDeletePhrase, setWorkspaceDeletePhrase] = useState('')
  const [workspaceDeleteAcknowledge, setWorkspaceDeleteAcknowledge] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [projectParentId, setProjectParentId] = useState('')
  const [projectDescription, setProjectDescription] = useState('')
  const [projectColor, setProjectColor] = useState(PROJECT_COLORS[0])
  const [projectStartDate, setProjectStartDate] = useState('')
  const [projectDeadline, setProjectDeadline] = useState('')
  const [projectSubmissionTime, setProjectSubmissionTime] = useState('')
  const [projectType, setProjectType] = useState<WorkhubProjectType>('tender')
  const [projectPriority, setProjectPriority] = useState<WorkhubProjectPriority>('medium')
  const [projectClientId, setProjectClientId] = useState('')
  const [closeProjectAfterCreate, setCloseProjectAfterCreate] = useState(true)
  const [projectVisibility, setProjectVisibility] = useState<WorkhubVisibility>('workspace')
  const [projectStorageMethod, setProjectStorageMethod] = useState<'firebase' | 'drive'>('firebase')
  const [projectMemberUids, setProjectMemberUids] = useState<string[]>([])
  const [projectNotesDraft, setProjectNotesDraft] = useState('')
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [taskStatus, setTaskStatus] = useState<WorkhubTaskStatus>('backlog')
  const [taskPriority, setTaskPriority] = useState<WorkhubTaskPriority>('medium')
  const [taskAssigneeUid, setTaskAssigneeUid] = useState('')
  const [taskDueDate, setTaskDueDate] = useState('')
  const [selectedTaskStatusTab, setSelectedTaskStatusTab] = useState<'all' | WorkhubTaskStatus>('all')
  const [taskFilterMenuOpen, setTaskFilterMenuOpen] = useState(false)
  const [taskFilterRequireAttachments, setTaskFilterRequireAttachments] = useState(false)
  const [taskFilterRequireChecklist, setTaskFilterRequireChecklist] = useState(false)
  const [taskFilterPriority, setTaskFilterPriority] = useState<'all' | WorkhubTaskPriority>('all')
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [statusDrafts, setStatusDrafts] = useState<WorkhubTaskStatusConfig[]>([])
  const [selectedStatusDraftId, setSelectedStatusDraftId] = useState('')
  const [commentText, setCommentText] = useState('')
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
  const [settingsProjectName, setSettingsProjectName] = useState('')
  const [settingsProjectDescription, setSettingsProjectDescription] = useState('')
  const [settingsProjectColor, setSettingsProjectColor] = useState(PROJECT_COLORS[0])
  const [settingsProjectParentId, setSettingsProjectParentId] = useState('')
  const [settingsProjectDeadline, setSettingsProjectDeadline] = useState('')
  const [settingsProjectSubmissionTime, setSettingsProjectSubmissionTime] = useState('')
  const [settingsProjectType, setSettingsProjectType] = useState<WorkhubProjectType>('other')
  const [settingsProjectPriority, setSettingsProjectPriority] = useState<WorkhubProjectPriority>('medium')
  const [settingsProjectClientId, setSettingsProjectClientId] = useState('')
  const [settingsStorageMethod, setSettingsStorageMethod] = useState<'firebase' | 'drive'>('firebase')
  const [selectedClientId, setSelectedClientId] = useState('')
  const [clientDeleteTargetId, setClientDeleteTargetId] = useState('')
  const [clientDeleteTypedName, setClientDeleteTypedName] = useState('')
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
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [expandedTaskChecklistIds, setExpandedTaskChecklistIds] = useState<string[]>([])
  const [expandedChecklistDetailKeys, setExpandedChecklistDetailKeys] = useState<string[]>([])
  const [taskChecklistDrafts, setTaskChecklistDrafts] = useState<Record<string, string>>({})
  const [taskAttachmentDrafts, setTaskAttachmentDrafts] = useState<Record<string, string>>({})
  const [taskLinkDrafts, setTaskLinkDrafts] = useState<Record<string, string>>({})
  const [uploadingTaskAttachmentId, setUploadingTaskAttachmentId] = useState('')
  const [checklistDetailsDrafts, setChecklistDetailsDrafts] = useState<Record<string, string>>({})
  const [checklistAttachmentDrafts, setChecklistAttachmentDrafts] = useState<Record<string, string>>({})
  const [checklistLinkDrafts, setChecklistLinkDrafts] = useState<Record<string, string>>({})
  const [uploadingChecklistAttachmentKey, setUploadingChecklistAttachmentKey] = useState('')
  const [detailMenuOpen, setDetailMenuOpen] = useState<'status' | 'priority' | 'assignee' | 'dueDate' | ''>('')
  const [selectedTaskTitleDraft, setSelectedTaskTitleDraft] = useState('')
  const [selectedTaskDescriptionDraft, setSelectedTaskDescriptionDraft] = useState('')
  const [selectedProjectNameDraft, setSelectedProjectNameDraft] = useState('')
  const [selectedProjectDescriptionDraft, setSelectedProjectDescriptionDraft] = useState('')
  const [selectedProjectColorDraft, setSelectedProjectColorDraft] = useState(PROJECT_COLORS[0])
  const [selectedProjectStartDateDraft, setSelectedProjectStartDateDraft] = useState('')
  const [selectedProjectDeadlineDraft, setSelectedProjectDeadlineDraft] = useState('')
  const [selectedProjectSubmissionTimeDraft, setSelectedProjectSubmissionTimeDraft] = useState('')
  const [selectedProjectTypeDraft, setSelectedProjectTypeDraft] = useState<WorkhubProjectType>('other')
  const [selectedProjectColorMenuOpen, setSelectedProjectColorMenuOpen] = useState(false)
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
  const [lightboxImageUrl, setLightboxImageUrl] = useState('')
  const [attachmentReviews, setAttachmentReviews] = useState<Record<string, WorkhubImageReview>>({})
  const [lightboxTool, setLightboxTool] = useState<WorkhubImageMarkerType>('point')
  const [lightboxImageFit, setLightboxImageFit] = useState<'contain' | 'cover' | 'scale-down'>('contain')
  const [lightboxImageAspect, setLightboxImageAspect] = useState<number | null>(null)
  const [lightboxLineStart, setLightboxLineStart] = useState<{ x: number; y: number } | null>(null)
  const [lightboxMarkerEditorId, setLightboxMarkerEditorId] = useState('')
  const [lightboxMarkerDraft, setLightboxMarkerDraft] = useState('')
  const [lightboxMarkerResolved, setLightboxMarkerResolved] = useState(false)
  const [lightboxMarkerEditorIsNew, setLightboxMarkerEditorIsNew] = useState(false)
  const [attachmentViewMode, setAttachmentViewMode] = useState<'thumbnail' | 'list' | 'card'>('thumbnail')
  const [attachmentDeletePrompt, setAttachmentDeletePrompt] = useState<{ task: WorkhubTask, attachment: string, isDriveFile: boolean } | null>(null)
  const lightboxStageRef = useRef<HTMLDivElement | null>(null)
  const lightboxDragRef = useRef<{ markerId: string; imageUrl: string } | null>(null)
  const statusBootstrapWorkspaceIdsRef = useRef<Set<string>>(new Set())
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
      if (target.closest('.workhub-task-status-btn, .workhub-task-status-menu, .workhub-priority-indicator, .workhub-task-priority-menu, .workhub-task-more-btn, .workhub-task-more-menu, .workhub-detail-icon-btn, .workhub-detail-icon-menu, .workhub-task-filter-btn, .workhub-task-filter-menu, .workhub-bulk-status-btn, .workhub-bulk-status-menu, .workhub-task-assignee-btn, .workhub-task-assignee-menu, .workhub-notify-btn, .workhub-notify-menu, .workhub-account-btn, .workhub-account-menu, .workhub-project-color-select-btn, .workhub-project-color-select-menu')) {
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
    return () => {
      root.classList.remove('workhub-font-compact')
    }
  }, [])

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
        navigate('/login', { replace: true, state: { returnTo: '/workhub' } })
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
  }, [navigate])

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
    if (!selectedWorkspaceId || !member || member.status !== 'approved') return
    const localUid = auth.currentUser?.uid || ''
    const localPrivileged = !!((!!MASTER_EMAIL && userEmail === MASTER_EMAIL) || member.role === 'admin' || member.role === 'manager')
    const selectedWp = workspaces.find((w) => w.id === selectedWorkspaceId)
    const targetWpIds = [selectedWorkspaceId]
    if (getWorkspaceType(selectedWp) !== 'technical') {
      targetWpIds.push(...workspaces.filter((w) => getWorkspaceType(w) === 'technical').map((w) => w.id))
    }
    const unsubProjects = subscribeWorkhubProjectsMulti(Array.from(new Set(targetWpIds)), localUid, localPrivileged, setProjects)
    const unsubTasks = subscribeWorkhubTasks(selectedWorkspaceId, localUid, localPrivileged, setTasks)
    const unsubActivity = subscribeWorkhubActivity(selectedWorkspaceId, localUid, localPrivileged, setActivity)
    return () => {
      unsubProjects()
      unsubTasks()
      unsubActivity()
    }
  }, [member, selectedWorkspaceId, userEmail])

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
    if (!selectedTaskId || !member || member.status !== 'approved') {
      setComments([])
      return
    }
    const unsubComments = subscribeWorkhubComments(selectedTaskId, setComments)
    return () => unsubComments()
  }, [member, selectedTaskId])

  useEffect(() => {
    const localUid = auth.currentUser?.uid || ''
    if (!selectedWorkspaceId || !localUid || !member || member.status !== 'approved') {
      setNotifications([])
      return
    }
    return subscribeWorkhubNotifications(selectedWorkspaceId, localUid, setNotifications)
  }, [member, selectedWorkspaceId])

  const currentUid = auth.currentUser?.uid || ''
  const workspaceSelectionStorageKey = useMemo(
    () => currentUid ? `workhub:selectedWorkspace:${currentUid}` : '',
    [currentUid],
  )
  const projectSelectionStorageKey = useMemo(
    () => currentUid ? `workhub:selectedProjectByWorkspace:${currentUid}` : '',
    [currentUid],
  )
  const isMasterAdmin = !!MASTER_EMAIL && userEmail === MASTER_EMAIL
  const isPrivilegedMember = !!(isMasterAdmin || member?.role === 'admin' || member?.role === 'manager')
  const accountDisplayName = member?.displayName || userName || userEmail.split('@')[0] || 'Member'
  const accountEmail = member?.email || userEmail || auth.currentUser?.email || ''
  const accountAvatarUrl = (member?.photoURL || auth.currentUser?.photoURL || '').trim()
  const accountInitials = getInitials(accountDisplayName || accountEmail || 'Member')
  const visibleWorkspaces = useMemo(
    () => workspaces.filter((item) => canAccessWorkspace(item, currentUid, userEmail, isPrivilegedMember)),
    [currentUid, isPrivilegedMember, userEmail, workspaces],
  )
  const approvedMembers = useMemo(() => members.filter((item) => item.status === 'approved'), [members])
  const pendingMembers = useMemo(() => members.filter((item) => item.status === 'pending'), [members])
  const selectedWorkspace = useMemo(() => visibleWorkspaces.find((item) => item.id === selectedWorkspaceId) || null, [selectedWorkspaceId, visibleWorkspaces])
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
  const scopedWorkspaceIds = useMemo(() => {
    if (!selectedWorkspaceId) return [] as string[]
    if (getWorkspaceType(selectedWorkspace) === 'technical') return [selectedWorkspaceId]
    return Array.from(new Set([
      selectedWorkspaceId,
      ...workspaces.filter((item) => getWorkspaceType(item) === 'technical').map((item) => item.id),
    ]))
  }, [selectedWorkspace, selectedWorkspaceId, workspaces])
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
    () => workspaceProjects.filter((item) => canViewProject(item, currentUid, canSeeAllProjects)),
    [currentUid, canSeeAllProjects, workspaceProjects],
  )
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
  const flatVisibleProjectOptions = useMemo(() => flattenProjectTree(visibleProjectTree), [visibleProjectTree])
  const visibleProjectIds = useMemo(() => new Set(visibleWorkspaceProjects.map((item) => item.id)), [visibleWorkspaceProjects])
  const selectedProject = useMemo(() => visibleWorkspaceProjects.find((item) => item.id === selectedProjectId) || null, [selectedProjectId, visibleWorkspaceProjects])
  const workspaceScopedTasks = useMemo(() => {
    return tasks.filter((item) => {
      if (!visibleProjectIds.has(item.projectId)) return false
      if (isEffectivelyEmptyTaskTitle(item.title || '')) return false
      if (selectedAssigneeUid !== 'all' && item.assigneeUid !== selectedAssigneeUid) return false
      return true
    })
  }, [selectedAssigneeUid, tasks, visibleProjectIds])
  const visibleTasks = useMemo(() => {
    if (selectedProjectId === 'all') return workspaceScopedTasks
    return workspaceScopedTasks.filter((item) => item.projectId === selectedProjectId)
  }, [selectedProjectId, workspaceScopedTasks])
  const groupedProjectsWorkspace = getWorkspaceType(selectedWorkspace) !== 'technical'
  const mirroredProjectRoots = useMemo(
    () => (groupedProjectsWorkspace ? visibleProjectTree.filter((item) => item.workspaceId !== selectedWorkspaceId) : []),
    [groupedProjectsWorkspace, selectedWorkspaceId, visibleProjectTree],
  )
  const localWorkspaceRoots = useMemo(
    () => (groupedProjectsWorkspace ? visibleProjectTree.filter((item) => item.workspaceId === selectedWorkspaceId) : visibleProjectTree),
    [groupedProjectsWorkspace, selectedWorkspaceId, visibleProjectTree],
  )
  const workspaceTaskStatuses = useMemo(() => {
    if (Array.isArray(selectedWorkspace?.taskStatuses) && selectedWorkspace.taskStatuses.length > 0) {
      return selectedWorkspace.taskStatuses.map((item) => ({ ...item }))
    }
    return buildWorkspaceTaskStatuses('workspace_default', selectedWorkspace?.type || 'technical')
  }, [selectedWorkspace?.id, selectedWorkspace?.taskStatuses])
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
  const filteredTasksByStatus = useMemo(() => {
    const grouped: Record<string, WorkhubTask[]> = {}
    for (const item of filteredTasks) {
      if (!grouped[item.status]) grouped[item.status] = []
      grouped[item.status].push(item)
    }
    return grouped
  }, [filteredTasks])
  // Pre-compute expensive per-task metadata — only recalculates when task DATA changes,
  // not when selectedTaskIds / other UI state changes.
  const taskMetaById = useMemo<Record<string, TaskRowMeta>>(() => {
    const result: Record<string, TaskRowMeta> = {}
    for (const task of tasks) {
      const checklist = buildChecklist(task)
      result[task.id] = {
        checklist,
        checklistDoneCount: checklist.filter((item) => item.completed).length,
        checklistDetailsCount: checklist.filter((item) => (item.details || '').trim().length > 0).length,
        checklistImagesCount: checklist.reduce((sum, item) => sum + (item.attachments?.length || 0), 0),
        checklistLinksCount: checklist.reduce((sum, item) => sum + (item.links?.length || 0), 0),
        taskAttachmentCount: getTaskAttachments(task).length,
      }
    }
    return result
  }, [tasks])
  const selectedTask = useMemo(() => visibleTasks.find((item) => item.id === selectedTaskId) || null, [selectedTaskId, visibleTasks])
  const selectedTaskIdSet = useMemo(() => new Set(selectedTaskIds), [selectedTaskIds])
  const expandedTaskChecklistIdsSet = useMemo(() => new Set(expandedTaskChecklistIds), [expandedTaskChecklistIds])
  const selectedTasks = useMemo(() => tasks.filter((item) => selectedTaskIdSet.has(item.id)), [selectedTaskIdSet, tasks])
  const selectedTaskCount = selectedTasks.length
  const visibleTaskIds = useMemo(() => filteredTasks.map((item) => item.id), [filteredTasks])
  const allVisibleTasksSelected = useMemo(
    () => visibleTaskIds.length > 0 && visibleTaskIds.every((taskId) => selectedTaskIdSet.has(taskId)),
    [selectedTaskIdSet, visibleTaskIds],
  )
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [])
  const selectedWorkspaceSettings = useMemo(() => workspaces.find((item) => item.id === workspaceSettingsId) || null, [workspaceSettingsId, workspaces])
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

  function getTaskOrderValue(task: Pick<WorkhubTask, 'sortOrder' | 'createdAt'>) {
    if (typeof task.sortOrder === 'number' && Number.isFinite(task.sortOrder)) {
      return task.sortOrder
    }
    if (!task.createdAt) return 0
    if (typeof task.createdAt === 'object' && task.createdAt !== null && 'toMillis' in task.createdAt && typeof (task.createdAt as { toMillis?: unknown }).toMillis === 'function') {
      return (task.createdAt as { toMillis: () => number }).toMillis()
    }
    if (typeof task.createdAt === 'object' && task.createdAt !== null && 'seconds' in task.createdAt) {
      const seconds = Number((task.createdAt as { seconds?: unknown }).seconds || 0)
      const nanoseconds = Number((task.createdAt as { nanoseconds?: unknown }).nanoseconds || 0)
      return (seconds * 1000) + Math.floor(nanoseconds / 1_000_000)
    }
    if (typeof task.createdAt === 'string') {
      const parsed = Date.parse(task.createdAt)
      return Number.isFinite(parsed) ? parsed : 0
    }
    return 0
  }

  function getOrderedTasksForStatus(statusId: string) {
    return tasks
      .filter((item) => item.workspaceId === selectedWorkspaceId && item.status === statusId)
      .sort((a, b) => {
        const orderDelta = getTaskOrderValue(a) - getTaskOrderValue(b)
        if (orderDelta !== 0) return orderDelta
        return getTaskOrderValue(a) - getTaskOrderValue(b)
      })
  }

  function getNextTaskSortOrder(statusId: string) {
    const orderedTasks = getOrderedTasksForStatus(statusId)
    const lastTask = orderedTasks.at(-1)
    if (!lastTask) return Date.now()
    return getTaskOrderValue(lastTask) + 1024
  }

  async function handleTaskReorder(draggedId: string, statusId: string, targetTaskId: string | null) {
    if (!draggedId || !selectedWorkspaceId) return
    const orderedTasks = getOrderedTasksForStatus(statusId)
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
  const selectedAccessProjectBranchIds = useMemo(() => {
    if (!selectedAccessProject) return new Set<string>()
    return collectProjectBranchIds(selectedAccessProject.id, workspaceProjectsByParent)
  }, [selectedAccessProject, workspaceProjectsByParent])
  const settingsParentOptions = useMemo(() => {
    if (!selectedAccessProject) return flatVisibleProjectOptions
    return flatVisibleProjectOptions.filter((item) => !selectedAccessProjectBranchIds.has(item.id))
  }, [flatVisibleProjectOptions, selectedAccessProject, selectedAccessProjectBranchIds])
  const selectedAccessProjectTaskCount = useMemo(
    () => tasks.filter((item) => selectedAccessProjectBranchIds.has(item.projectId)).length,
    [selectedAccessProjectBranchIds, tasks],
  )
  const selectedAccessProjectChildCount = useMemo(
    () => (selectedAccessProject ? (workspaceProjectsByParent.get(selectedAccessProject.id) || []).length : 0),
    [selectedAccessProject, workspaceProjectsByParent],
  )
  const projectNameById = useMemo(() => Object.fromEntries(workspaceProjects.map((item) => [item.id, item.name])), [workspaceProjects])
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
  const taskCounts = useMemo(() => ({
    total: visibleTasks.length,
    done: visibleTasks.filter((item) => item.status === 'done').length,
    inProgress: visibleTasks.filter((item) => item.status === 'in_progress').length,
    urgent: visibleTasks.filter((item) => item.priority === 'urgent').length,
  }), [visibleTasks])
  const unreadNotificationCount = useMemo(
    () => notifications.filter((item) => !item.read).length,
    [notifications],
  )
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
          done: personTasks.filter((task) => task.status === 'done').length,
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
        submissionTime: item.project.projectType === 'tender' ? (item.project.submissionTime || '') : '',
        daysRemaining: item.daysRemaining,
        countdownShort: item.isOverdue ? `${Math.abs(item.daysRemaining)}d+` : `${item.daysRemaining}d`,
        countdownText: item.countdownText,
        urgencyPercent: Math.max(8, item.urgencyPercent),
        isOverdue: item.isOverdue,
        isNearTwoDays: item.isNearTwoDays,
          clientName: allClientById[item.project.clientId || '']?.name || '',
      }))
        }, [allClientById, visibleWorkspaceProjects])
  const projectNotesChanged = (selectedNoteProject?.notes || '') !== projectNotesDraft
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
  const canEditSelectedProject = useMemo(
    () => !!selectedProject && (isPrivilegedMember || selectedProject.createdBy === currentUid),
    [currentUid, isPrivilegedMember, selectedProject],
  )
  const selectedProjectDetailsChanged = useMemo(() => {
    if (!selectedProject) return false
    return (
      selectedProjectNameDraft.trim() !== selectedProject.name
      || selectedProjectDescriptionDraft.trim() !== (selectedProject.description || '')
      || selectedProjectColorDraft !== selectedProject.color
      || selectedProjectStartDateDraft !== (selectedProject.projectStartDate || '')
      || selectedProjectDeadlineDraft !== (selectedProject.projectDeadline || '')
      || selectedProjectSubmissionTimeDraft !== (selectedProject.submissionTime || '')
      || selectedProjectTypeDraft !== (selectedProject.projectType || 'other')
    )
  }, [
    selectedProject,
    selectedProjectColorDraft,
    selectedProjectDeadlineDraft,
    selectedProjectDescriptionDraft,
    selectedProjectNameDraft,
    selectedProjectStartDateDraft,
    selectedProjectSubmissionTimeDraft,
    selectedProjectTypeDraft,
  ])
  const selectedWorkspaceParam = useMemo(() => new URLSearchParams(location.search).get('workspace') || '', [location.search])
  const selectedProjectParam = useMemo(() => new URLSearchParams(location.search).get('project') || '', [location.search])
  const isWorkspaceSelectionResolved = useMemo(() => {
    if (!selectedWorkspaceId) return false
    if (!visibleWorkspaces.some((item) => item.id === selectedWorkspaceId)) return false
    if (selectedWorkspaceParam) return selectedWorkspaceId === selectedWorkspaceParam
    return true
  }, [selectedWorkspaceId, selectedWorkspaceParam, visibleWorkspaces])

  useEffect(() => {
    setSelectedTaskTitleDraft(selectedTask?.title || '')
    setSelectedTaskDescriptionDraft(selectedTask?.description || '')
    setDetailMenuOpen('')
  }, [selectedTask?.id, selectedTask?.title, selectedTask?.description])

  useEffect(() => {
    if (!selectedProject) {
      setSelectedProjectNameDraft('')
      setSelectedProjectDescriptionDraft('')
      setSelectedProjectColorDraft(PROJECT_COLORS[0])
      setSelectedProjectStartDateDraft('')
      setSelectedProjectDeadlineDraft('')
      setSelectedProjectSubmissionTimeDraft('')
      setSelectedProjectTypeDraft('other')
      setSelectedProjectColorMenuOpen(false)
      return
    }
    setSelectedProjectNameDraft(selectedProject.name)
    setSelectedProjectDescriptionDraft(selectedProject.description || '')
    setSelectedProjectColorDraft(selectedProject.color)
    setSelectedProjectStartDateDraft(selectedProject.projectStartDate || '')
    setSelectedProjectDeadlineDraft(selectedProject.projectDeadline || '')
    setSelectedProjectSubmissionTimeDraft(selectedProject.submissionTime || '')
    setSelectedProjectTypeDraft(selectedProject.projectType || 'other')
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
  ])

  // Sync workspace from URL to state
  useEffect(() => {
    if (selectedWorkspaceParam && workspaces.some((item) => item.id === selectedWorkspaceParam) && selectedWorkspaceId !== selectedWorkspaceParam) {
      setSelectedWorkspaceId(selectedWorkspaceParam)
    }
  }, [selectedWorkspaceParam, workspaces]) // Left out selectedWorkspaceId intentionally to avoid loop on local changes

  // Sync project from URL to state
  useEffect(() => {
    if (!selectedProjectParam) return

    if (selectedProjectParam === 'all') {
      if (selectedProjectId !== 'all') {
        setSelectedProjectId('all')
      }
      return
    }

    if (visibleWorkspaceProjects.some((item) => item.id === selectedProjectParam) && selectedProjectId !== selectedProjectParam) {
      setSelectedProjectId(selectedProjectParam)
      setSelectedNoteProjectId(selectedProjectParam)
      setActiveSection('tasks')
    }
  }, [selectedProjectParam, visibleWorkspaceProjects]) // Left out selectedProjectId intentionally

  useEffect(() => {
    if (!selectedWorkspaceId || !isWorkspaceSelectionResolved) return

    const params = new URLSearchParams(location.search)
    const targetProject = selectedProjectId || 'all'
    let changed = false

    if (params.get('workspace') !== selectedWorkspaceId) {
      params.set('workspace', selectedWorkspaceId)
      changed = true
    }

    if (params.get('project') !== targetProject) {
      params.set('project', targetProject)
      changed = true
    }

    if (!changed) return

    const nextSearch = params.toString()
    const syncTimer = window.setTimeout(() => {
      navigate(`${location.pathname}?${nextSearch}`, { replace: true })
    }, 120)

    return () => window.clearTimeout(syncTimer)
  }, [isWorkspaceSelectionResolved, location.pathname, location.search, navigate, selectedProjectId, selectedWorkspaceId])

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
    if (visibleProjectTree.length === 0) {
      setExpandedProjectIds([])
      return
    }
    setExpandedProjectIds((current) => {
      if (current.length > 0) return current
      return visibleProjectTree.map((item) => item.id)
    })
  }, [visibleProjectTree])

  useEffect(() => {
    setProjectsGroupExpanded(true)
  }, [selectedWorkspaceId])

  useEffect(() => {
    if (selectedNoteProjectId && visibleWorkspaceProjects.some((item) => item.id === selectedNoteProjectId)) return
    setSelectedNoteProjectId(visibleWorkspaceProjects[0]?.id || '')
  }, [selectedNoteProjectId, visibleWorkspaceProjects])

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
    if (!taskAssigneeUid && currentUid) {
      setTaskAssigneeUid(currentUid)
    }
  }, [currentUid, taskAssigneeUid])

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
    setProjectNotesDraft(selectedNoteProject?.notes || '')
  }, [selectedNoteProject?.id, selectedNoteProject?.notes])

  useEffect(() => {
    if (!selectedWorkspaceSettings) return
    setWorkspaceSettingsName(selectedWorkspaceSettings.name)
    setWorkspaceSettingsDescription(selectedWorkspaceSettings.description || '')
    setWorkspaceAccessMemberUids(normalizeMemberUids(selectedWorkspaceSettings.accessMemberUids || []))
    setWorkspaceMemberAccessLevels(selectedWorkspaceSettings.memberAccessLevels || {})
    setWorkspaceInviteEmails(normalizeInviteEmails(selectedWorkspaceSettings.invitedEmails || []))
    setWorkspaceInviteEmailDraft('')
    setWorkspaceDeleteTypedName('')
    setWorkspaceDeletePhrase('')
    setWorkspaceDeleteAcknowledge(false)
  }, [selectedWorkspaceSettings])

  useEffect(() => {
    if (!selectedAccessProject) return
    setSettingsProjectName(selectedAccessProject.name)
    setSettingsProjectDescription(selectedAccessProject.description || '')
    setSettingsProjectColor(selectedAccessProject.color)
    setSettingsProjectParentId(selectedAccessProject.parentProjectId || '')
    setSettingsProjectDeadline(selectedAccessProject.projectDeadline || '')
    setSettingsProjectSubmissionTime(selectedAccessProject.submissionTime || '')
    setSettingsProjectType(selectedAccessProject.projectType || 'other')
    setSettingsProjectPriority(selectedAccessProject.priority || 'medium')
    setSettingsProjectClientId(selectedAccessProject.clientId || '')
    setSettingsStorageMethod(selectedAccessProject.storageMethod || 'firebase')
    setAccessVisibility(selectedAccessProject.visibility || 'workspace')
    setAccessMemberUids(selectedAccessProject.memberUids || [])
  }, [selectedAccessProject])

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
    if (projectType !== 'tender' && projectSubmissionTime) {
      setProjectSubmissionTime('')
    }
  }, [projectSubmissionTime, projectType])

  useEffect(() => {
    if (settingsProjectType !== 'tender' && settingsProjectSubmissionTime) {
      setSettingsProjectSubmissionTime('')
    }
  }, [settingsProjectSubmissionTime, settingsProjectType])

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

  function openAttachmentLightbox(url: string) {
    setLightboxImageUrl(url)
    setLightboxTool('point')
    setLightboxImageFit('contain')
    setLightboxImageAspect(null)
    setLightboxLineStart(null)
    setLightboxMarkerEditorId('')
    setLightboxMarkerDraft('')
    setLightboxMarkerEditorIsNew(false)
  }

  function updateImageReview(url: string, updater: (current: WorkhubImageReview) => WorkhubImageReview) {
    setAttachmentReviews((current) => {
      const base = current[url] || createEmptyImageReview()
      return {
        ...current,
        [url]: updater(base),
      }
    })
  }

  function getLightboxClickPosition(event: React.MouseEvent<HTMLDivElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 100
    const y = ((event.clientY - rect.top) / rect.height) * 100
    return {
      x: Math.min(100, Math.max(0, x)),
      y: Math.min(100, Math.max(0, y)),
    }
  }

  function handleLightboxStageClick(event: React.MouseEvent<HTMLDivElement>) {
    if (!lightboxImageUrl) return
    // If a new unsaved empty marker editor is open, discard it before placing another
    if (lightboxMarkerEditorIsNew && !lightboxMarkerDraft.trim() && lightboxMarkerEditorId) {
      handleLightboxMarkerRemove(lightboxMarkerEditorId)
      setLightboxMarkerEditorId('')
      setLightboxMarkerDraft('')
      setLightboxMarkerEditorIsNew(false)
    }
    const position = getLightboxClickPosition(event)
    const markerAuthor = auth.currentUser?.displayName || auth.currentUser?.email || member?.displayName || member?.email || 'Member'
    if (lightboxTool === 'line') {
      if (!lightboxLineStart) {
        setLightboxLineStart(position)
        return
      }
      const markerId = `mk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
      updateImageReview(lightboxImageUrl, (review) => ({
        ...review,
        markers: [...review.markers, {
          id: markerId,
          type: 'line',
          x: lightboxLineStart.x,
          y: lightboxLineStart.y,
          x2: position.x,
          y2: position.y,
          text: '',
          createdBy: markerAuthor,
          createdAt: new Date().toISOString(),
        }],
      }))
      setLightboxLineStart(null)
      setLightboxMarkerEditorId(markerId)
      setLightboxMarkerDraft('')
      setLightboxMarkerEditorIsNew(true)
      return
    }
    const markerId = `mk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    updateImageReview(lightboxImageUrl, (review) => ({
      ...review,
      markers: [...review.markers, {
        id: markerId,
        type: lightboxTool,
        x: position.x,
        y: position.y,
        checked: lightboxTool === 'checkbox' ? false : undefined,
        text: '',
        createdBy: markerAuthor,
        createdAt: new Date().toISOString(),
      }],
    }))
    setLightboxMarkerEditorId(markerId)
    setLightboxMarkerDraft('')
    setLightboxMarkerEditorIsNew(true)
  }

  function handleLightboxMarkerRemove(markerId: string) {
    if (!lightboxImageUrl) return
    updateImageReview(lightboxImageUrl, (review) => ({
      ...review,
      markers: review.markers.filter((marker) => marker.id !== markerId),
    }))
    if (lightboxMarkerEditorId === markerId) {
      setLightboxMarkerEditorId('')
      setLightboxMarkerDraft('')
      setLightboxMarkerEditorIsNew(false)
    }
  }

  function openLightboxMarkerEditor(markerId: string, isNew = false) {
    if (!lightboxImageUrl) return
    const marker = (attachmentReviews[lightboxImageUrl] || createEmptyImageReview()).markers.find((item) => item.id === markerId)
    if (!marker) return
    setLightboxMarkerEditorId(markerId)
    setLightboxMarkerDraft(marker.text || '')
    setLightboxMarkerResolved(marker.resolved ?? false)
    setLightboxMarkerEditorIsNew(isNew)
  }

  function closeLightboxMarkerEditor() {
    if (!lightboxImageUrl) return
    if (lightboxMarkerEditorIsNew && !lightboxMarkerDraft.trim() && lightboxMarkerEditorId) {
      handleLightboxMarkerRemove(lightboxMarkerEditorId)
    }
    setLightboxMarkerEditorId('')
    setLightboxMarkerDraft('')
    setLightboxMarkerResolved(false)
    setLightboxMarkerEditorIsNew(false)
  }

  function handleLightboxMarkerEditorSave() {
    if (!lightboxImageUrl || !lightboxMarkerEditorId) return
    const nextText = lightboxMarkerDraft.trim()
    if (!nextText) {
      showToast({ type: 'error', message: 'Annotation title is required.' })
      return
    }
    updateImageReview(lightboxImageUrl, (review) => ({
      ...review,
      markers: review.markers.map((marker) => marker.id === lightboxMarkerEditorId
        ? { ...marker, text: nextText, resolved: lightboxMarkerResolved }
        : marker),
    }))
    setLightboxMarkerEditorId('')
    setLightboxMarkerDraft('')
    setLightboxMarkerResolved(false)
    setLightboxMarkerEditorIsNew(false)
  }

  function handleMarkerPointerDown(markerId: string, event: React.PointerEvent<HTMLButtonElement>) {
    event.stopPropagation()
    const imageUrl = lightboxImageUrl
    if (!imageUrl) return
    const el = event.currentTarget
    el.setPointerCapture(event.pointerId)
    const startX = event.clientX
    const startY = event.clientY
    lightboxDragRef.current = null
    function onMove(e: PointerEvent) {
      if (!lightboxStageRef.current) return
      if (!lightboxDragRef.current && Math.hypot(e.clientX - startX, e.clientY - startY) < 5) return
      lightboxDragRef.current = { markerId, imageUrl }
      const rect = lightboxStageRef.current.getBoundingClientRect()
      const x = Math.max(1, Math.min(99, ((e.clientX - rect.left) / rect.width) * 100))
      const y = Math.max(1, Math.min(99, ((e.clientY - rect.top) / rect.height) * 100))
      setAttachmentReviews((prev) => {
        const review = prev[imageUrl] || createEmptyImageReview()
        return { ...prev, [imageUrl]: { ...review, markers: review.markers.map((m) => m.id === markerId ? { ...m, x, y } : m) } }
      })
    }
    function onUp() {
      el.removeEventListener('pointermove', onMove)
      el.removeEventListener('pointerup', onUp)
      el.removeEventListener('pointercancel', onUp)
      setTimeout(() => { lightboxDragRef.current = null }, 100)
    }
    el.addEventListener('pointermove', onMove)
    el.addEventListener('pointerup', onUp)
    el.addEventListener('pointercancel', onUp)
  }

  async function handleLightboxFullscreenToggle() {
    const stage = lightboxStageRef.current
    if (!stage) return
    if (document.fullscreenElement) {
      await document.exitFullscreen()
      return
    }
    await stage.requestFullscreen()
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
        type: workspaceType,
        createdBy: auth.currentUser.uid,
      })
      const accessUids = normalizeMemberUids([...fullAccessMemberUids, auth.currentUser.uid])
      const fullAccessLevels = fullAccessMemberUids.reduce((acc, uid) => {
        acc[uid] = 'full'
        return acc
      }, {} as Record<string, 'full' | 'custom'>)
      await updateWorkhubWorkspace(workspaceId, {
        accessMemberUids: accessUids,
        memberAccessLevels: fullAccessLevels,
        taskStatuses: buildWorkspaceTaskStatuses(workspaceStatusTemplate, workspaceType),
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
      setWorkspaceStatusTemplate('workspace_default')
      setSelectedWorkspaceId(workspaceId)
      setCreateDialogOpen(false)
      setActiveSection('workspaces')
      showToast({ type: 'success', message: 'Workspace created.' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not create workspace.'
      showToast({ type: 'error', message })
    } finally {
      setBusyKey('')
    }
  }

  async function handleSaveWorkspaceSettings() {
    if (!auth.currentUser || !selectedWorkspaceSettings) return
    if (!workspaceSettingsName.trim()) {
      showToast({ type: 'error', message: 'Workspace name is required.' })
      return
    }
    setBusyKey(`workspace-settings:${selectedWorkspaceSettings.id}`)
    try {
      await updateWorkhubWorkspace(selectedWorkspaceSettings.id, {
        name: workspaceSettingsName.trim(),
        description: workspaceSettingsDescription.trim(),
        accessMemberUids: normalizeMemberUids(workspaceAccessMemberUids),
        invitedEmails: normalizeInviteEmails(workspaceInviteEmails),
      })
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
      const message = error instanceof Error ? error.message : 'Could not update workspace settings.'
      showToast({ type: 'error', message })
    } finally {
      setBusyKey('')
    }
  }

  async function handleWorkspaceAccessToggle(uid: string, checked: boolean) {
    if (!selectedWorkspaceSettings) return
    const nextUids = checked
      ? normalizeMemberUids([...workspaceAccessMemberUids, uid])
      : workspaceAccessMemberUids.filter((item) => item !== uid)
    setWorkspaceAccessMemberUids(nextUids)
    setBusyKey(`workspace-access:${selectedWorkspaceSettings.id}:${uid}`)
    try {
      await updateWorkhubWorkspace(selectedWorkspaceSettings.id, {
        accessMemberUids: nextUids,
        invitedEmails: normalizeInviteEmails(workspaceInviteEmails),
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not update access.'
      showToast({ type: 'error', message })
      setWorkspaceAccessMemberUids(workspaceAccessMemberUids)
    } finally {
      setBusyKey('')
    }
  }

  async function handleToggleUserWorkspace(uid: string, workspaceId: string, checked: boolean) {
    const targetWorkspace = workspaces.find((w) => w.id === workspaceId)
    if (!targetWorkspace) return
    const current = normalizeMemberUids(targetWorkspace.accessMemberUids || [])
    const currentAccessLevels = { ...(targetWorkspace.memberAccessLevels || {}) } as Record<string, 'full' | 'custom'>
    const next = checked
      ? normalizeMemberUids([...current, uid])
      : current.filter((id) => id !== uid)
    const nextAccessLevels = { ...currentAccessLevels }
    if (!checked) {
      delete nextAccessLevels[uid]
    } else if (!nextAccessLevels[uid]) {
      nextAccessLevels[uid] = 'custom'
    }
    setBusyKey(`user-workspace:${workspaceId}:${uid}`)
    try {
      await updateWorkhubWorkspace(workspaceId, {
        accessMemberUids: next,
        memberAccessLevels: nextAccessLevels,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not update workspace access.'
      showToast({ type: 'error', message })
    } finally {
      setBusyKey('')
    }
  }

  function updateUserAccessDraft(uid: string, updater: (draft: WorkhubUserAccessDraft) => WorkhubUserAccessDraft) {
    setUserAccessDraftByUid((current) => {
      const source = userAccessSourceByUid[uid] || { mode: 'workspace_based' as WorkhubUserAccessMode, workspaceById: {} }
      const base = current[uid] || source
      const next = updater({
        mode: base.mode,
        workspaceById: Object.fromEntries(Object.entries(base.workspaceById).map(([workspaceId, entry]) => [workspaceId, { ...entry }])),
      })
      return { ...current, [uid]: next }
    })
  }

  function handleSetUserAccessModeDraft(uid: string, mode: WorkhubUserAccessMode) {
    updateUserAccessDraft(uid, (draft) => {
      const nextWorkspaceById = Object.fromEntries(Object.entries(draft.workspaceById).map(([workspaceId, entry]) => [workspaceId, { ...entry }]))
      if (mode === 'full') {
        Object.keys(nextWorkspaceById).forEach((workspaceId) => {
          nextWorkspaceById[workspaceId] = { enabled: true, level: 'full' }
        })
      } else {
        Object.keys(nextWorkspaceById).forEach((workspaceId) => {
          nextWorkspaceById[workspaceId] = { enabled: false, level: 'custom' }
        })
      }
      return {
        mode,
        workspaceById: nextWorkspaceById,
      }
    })
  }

  function handleToggleUserWorkspaceDraft(uid: string, workspaceId: string, checked: boolean) {
    updateUserAccessDraft(uid, (draft) => {
      const currentEntry = draft.workspaceById[workspaceId] || { enabled: false, level: 'custom' as const }
      return {
        ...draft,
        workspaceById: {
          ...draft.workspaceById,
          [workspaceId]: {
            enabled: checked,
            level: checked ? currentEntry.level : 'custom',
          },
        },
      }
    })
  }

  function handleSetUserWorkspaceLevelDraft(uid: string, workspaceId: string, level: 'full' | 'custom') {
    updateUserAccessDraft(uid, (draft) => {
      return {
        ...draft,
        workspaceById: {
          ...draft.workspaceById,
          [workspaceId]: {
            enabled: true,
            level,
          },
        },
      }
    })
  }

  function handleDiscardUserAccessDraft(uid: string) {
    setUserAccessDraftByUid((current) => {
      if (!current[uid]) return current
      const next = { ...current }
      delete next[uid]
      return next
    })
  }

  async function handleSaveUserAccessDraft(uid: string) {
    const draft = userAccessDraftByUid[uid]
    if (!draft || !userAccessDraftDirtyByUid[uid]) return
    setBusyKey(`user-access-save:${uid}`)
    try {
      await Promise.all(workspaces.map(async (workspace) => {
        const currentUids = normalizeMemberUids(workspace.accessMemberUids || [])
        const currentLevels = { ...(workspace.memberAccessLevels || {}) } as Record<string, 'full' | 'custom'>
        const hasCurrentAccess = currentUids.includes(uid)
        const workspaceDraft = draft.workspaceById[workspace.id] || { enabled: false, level: 'custom' as const }

        let shouldHaveAccess = workspaceDraft.enabled
        let level: 'full' | 'custom' = workspaceDraft.level
        if (draft.mode === 'full') {
          shouldHaveAccess = true
          level = 'full'
        }

        const nextUids = shouldHaveAccess
          ? (hasCurrentAccess ? currentUids : normalizeMemberUids([...currentUids, uid]))
          : currentUids.filter((itemUid) => itemUid !== uid)
        const nextLevels = { ...currentLevels }
        if (shouldHaveAccess) {
          nextLevels[uid] = level
        } else {
          delete nextLevels[uid]
        }

        const accessChanged = nextUids.length !== currentUids.length || nextUids.some((itemUid, index) => itemUid !== currentUids[index])
        const levelChanged = (currentLevels[uid] || null) !== (nextLevels[uid] || null)
        if (!accessChanged && !levelChanged) return

        await updateWorkhubWorkspace(workspace.id, {
          accessMemberUids: nextUids,
          memberAccessLevels: nextLevels,
        })
      }))

      setUserAccessDraftByUid((current) => {
        const next = { ...current }
        delete next[uid]
        return next
      })
      showToast({ type: 'success', message: 'User access settings saved.' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not save user access settings.'
      showToast({ type: 'error', message })
    } finally {
      setBusyKey('')
    }
  }

  function handleWorkspaceInviteAdd() {
    const next = workspaceInviteEmailDraft.trim().toLowerCase()
    if (!next || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next)) {
      showToast({ type: 'error', message: 'Enter a valid invite email.' })
      return
    }
    setWorkspaceInviteEmails((current) => normalizeInviteEmails([...current, next]))
    setWorkspaceInviteEmailDraft('')
  }

  function handleWorkspaceInviteRemove(email: string) {
    setWorkspaceInviteEmails((current) => current.filter((item) => item !== email))
  }

  async function handleApproveRequestGlobal(targetUid: string) {
    setBusyKey(`member-request:${targetUid}`)
    try {
      await setWorkhubMemberStatus({ uid: targetUid, status: 'approved', role: 'member' })
      showToast({ type: 'success', message: 'User approved. Assign workspace access from Manage access.' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not approve request.'
      showToast({ type: 'error', message })
    } finally {
      setBusyKey('')
    }
  }

  async function handleRejectRequestGlobal(targetUid: string) {
    setBusyKey(`member-request:${targetUid}`)
    try {
      await setWorkhubMemberStatus({ uid: targetUid, status: 'suspended', role: 'member' })
      showToast({ type: 'success', message: 'Access request declined.' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not decline request.'
      showToast({ type: 'error', message })
    } finally {
      setBusyKey('')
    }
  }

  async function handleApproveRequestForWorkspace(targetUid: string) {
    if (!auth.currentUser || !selectedWorkspaceSettings) return
    setBusyKey(`workspace-request:${selectedWorkspaceSettings.id}:${targetUid}`)
    try {
      await setWorkhubMemberStatus({ uid: targetUid, status: 'approved', role: 'member' })
      const nextAccessUids = normalizeMemberUids([...workspaceAccessMemberUids, targetUid])
      setWorkspaceAccessMemberUids(nextAccessUids)
      await updateWorkhubWorkspace(selectedWorkspaceSettings.id, {
        accessMemberUids: nextAccessUids,
        invitedEmails: normalizeInviteEmails(workspaceInviteEmails),
      })
      await createWorkhubNotifications({
        workspaceId: selectedWorkspaceSettings.id,
        actorUid: auth.currentUser.uid,
        recipientUids: [targetUid],
        entityType: 'workspace',
        entityId: selectedWorkspaceSettings.id,
        action: 'approved',
        message: `you were granted access to workspace \"${selectedWorkspaceSettings.name}\"`,
      })
      showToast({ type: 'success', message: 'Request approved and workspace access granted.' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not approve request for this workspace.'
      showToast({ type: 'error', message })
    } finally {
      setBusyKey('')
    }
  }

  async function handleRejectRequestForWorkspace(targetUid: string) {
    if (!auth.currentUser || !selectedWorkspaceSettings) return
    setBusyKey(`workspace-request:${selectedWorkspaceSettings.id}:${targetUid}`)
    try {
      await setWorkhubMemberStatus({ uid: targetUid, status: 'suspended', role: 'member' })
      showToast({ type: 'success', message: 'Access request declined.' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not decline request.'
      showToast({ type: 'error', message })
    } finally {
      setBusyKey('')
    }
  }

  async function handleMemberAccessLevelChange(uid: string, level: 'full' | 'custom') {
    if (!selectedWorkspaceSettings) return
    const next = { ...workspaceMemberAccessLevels, [uid]: level }
    setWorkspaceMemberAccessLevels(next)
    try {
      await updateWorkhubWorkspace(selectedWorkspaceSettings.id, { memberAccessLevels: next })
    } catch (error) {
      setWorkspaceMemberAccessLevels(workspaceMemberAccessLevels)
      const message = error instanceof Error ? error.message : 'Could not update access level.'
      showToast({ type: 'error', message })
    }
  }

  async function handleDeleteWorkspace() {
    if (!auth.currentUser || !selectedWorkspaceSettings) return
    if (selectedWorkspaceProjectCount > 0 || selectedWorkspaceTaskCount > 0) {
      showToast({ type: 'error', message: 'Delete or move all workspace projects and tasks first.' })
      return
    }
    if (workspaceDeleteTypedName.trim() !== selectedWorkspaceSettings.name || workspaceDeletePhrase.trim() !== 'DELETE WORKSPACE' || !workspaceDeleteAcknowledge) {
      showToast({ type: 'error', message: 'Complete all deletion confirmations exactly.' })
      return
    }
    setBusyKey(`workspace-delete:${selectedWorkspaceSettings.id}`)
    try {
      await deleteWorkhubWorkspace(selectedWorkspaceSettings.id)
      if (selectedWorkspaceId === selectedWorkspaceSettings.id) {
        const fallback = workspaces.find((item) => item.id !== selectedWorkspaceSettings.id)
        setSelectedWorkspaceId(fallback?.id || '')
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
    setSelectedWorkspaceId(workspaceId)
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
    setBusyKey(`client:save:${selectedClientId}`)
    try {
      await updateWorkhubClient(selectedClientId, {
        name: trimmedName,
        contactPerson: clientContactPersonDraft.trim(),
        email: clientEmailDraft.trim(),
        phone: clientPhoneDraft.trim(),
        website: clientWebsiteDraft.trim(),
        address: clientAddressDraft.trim(),
        industry: clientIndustryDraft.trim(),
        logoUrl: clientLogoUrlDraft.trim(),
        notes: clientNotesDraft.trim(),
      })
      showToast({ type: 'success', message: 'Client details updated.' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not save client details.'
      showToast({ type: 'error', message })
    } finally {
      setBusyKey('')
    }
  }

  async function handleDeleteClientDetails() {
    if (!selectedClientId || selectedClientId === '__new__') return
    setClientDeleteTargetId(selectedClientId)
    setClientDeleteTypedName('')
  }

  function handleCancelClientDelete() {
    setClientDeleteTargetId('')
    setClientDeleteTypedName('')
  }

  async function handleConfirmClientDelete() {
    if (!clientDeleteTargetId) return
    const targetClient = allClientById[clientDeleteTargetId]
    if (!targetClient) {
      handleCancelClientDelete()
      return
    }
    if (clientDeleteTypedName.trim() !== targetClient.name) {
      showToast({ type: 'error', message: 'Type the exact client name to confirm deletion.' })
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
    const storagePath = `workhub-clients/${selectedWorkspaceId}/logos/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${extension}`
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
      showToast({ type: 'error', message: 'Project name is required.' })
      return
    }
    if (!isValidHexColor(projectColor)) {
      showToast({ type: 'error', message: 'Pick a valid project color.' })
      return
    }
    if (projectType === 'tender' && !projectSubmissionTime) {
      showToast({ type: 'error', message: 'Submission time is required for tender projects.' })
      return
    }
    if (!projectDeadline.trim()) {
      const deadlineLabel = projectType === 'tender' ? 'submission date' : 'final submission deadline'
      showToast({ type: 'error', message: `Project ${deadlineLabel} is required.` })
      return
    }
    const normalizedStartDate = projectStartDate.trim()
    const normalizedDeadline = projectDeadline.trim()
    if (normalizedStartDate && normalizedDeadline && normalizedStartDate > normalizedDeadline) {
      showToast({ type: 'error', message: 'Deadline cannot be earlier than the start date.' })
      return
    }
    const memberUids = projectVisibility === 'restricted'
      ? normalizeMemberUids(projectMemberUids.length > 0 ? projectMemberUids : [auth.currentUser.uid])
      : []
    const shouldKeepOpen = options?.keepDialogOpen === true || !closeProjectAfterCreate
    const currentParentId = projectParentId
    setBusyKey('project')
    try {
      const pName = projectName.trim()
      const projectId = await createWorkhubProject({
        workspaceId: selectedWorkspaceId,
        parentProjectId: currentParentId || null,
        name: pName,
        description: projectDescription.trim(),
        color: projectColor,
        projectStartDate: normalizedStartDate,
        projectDeadline: normalizedDeadline,
        projectType,
        submissionTime: projectType === 'tender' ? projectSubmissionTime : '',
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
        message: `Created project ${pName}`,
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
        setProjectType('tender')
        setProjectPriority('medium')
        setProjectClientId('')
        setProjectColor(PROJECT_COLORS[(Math.floor(Math.random() * PROJECT_COLORS.length))])
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
      showToast({ type: 'success', message: 'Project created.' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not create project.'
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
    if (assigneeUid && !isPrivilegedMember && !allowedAssigneeUids.has(assigneeUid)) {
      showToast({ type: 'error', message: 'Assignee must be a member of the selected project.' })
      return
    }
    setBusyKey('task')
    try {
      const baseSortOrder = getNextTaskSortOrder(taskStatus)
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
          dueDate: taskDueDate,
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
      setTaskDueDate('')
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
    if (assigneeUid && !isPrivilegedMember && !allowedAssigneeUids.has(assigneeUid)) {
      showToast({ type: 'error', message: 'Assignee must be a member of the selected project.' })
      return false
    }
    try {
      const baseSortOrder = getNextTaskSortOrder(input.statusId)
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
          dueDate: input.dueDate,
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

  async function handleSaveProjectNotes() {
    if (!auth.currentUser || !selectedWorkspaceId || !selectedNoteProject) return
    setBusyKey(`notes:${selectedNoteProject.id}`)
    try {
      await updateWorkhubProject(selectedNoteProject.id, {
        notes: projectNotesDraft.trim(),
        notesUpdatedBy: auth.currentUser.uid,
      })
      await createWorkhubActivity({
        workspaceId: selectedWorkspaceId,
        actorUid: auth.currentUser.uid,
        entityType: 'project',
        entityId: selectedNoteProject.id,
        action: 'notes_update',
        message: `Updated notes for ${selectedNoteProject.name}`,
        visibility: selectedNoteProject.visibility,
        memberUids: selectedNoteProject.memberUids,
      })
      showToast({ type: 'success', message: 'Project notes saved.' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not save project notes.'
      showToast({ type: 'error', message })
    } finally {
      setBusyKey('')
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
      nextUpdates.sortOrder = getNextTaskSortOrder(updates.status)
    }
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

  function handleToggleSelectAllVisible(checked: boolean) {
    setSelectedTaskIds((current) => {
      if (checked) {
        return Array.from(new Set([...current, ...visibleTaskIds]))
      }
      const visibleSet = new Set(visibleTaskIds)
      return current.filter((taskId) => !visibleSet.has(taskId))
    })
  }

  async function handleBulkStatusChange(statusId: WorkhubTaskStatus) {
    if (!auth.currentUser || !selectedWorkspaceId || selectedTasks.length === 0) return
    setBusyKey('bulk-task')
    try {
      const baseSortOrder = getNextTaskSortOrder(statusId)
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

  async function handleAddComment() {
    const nextCommentBody = commentText.trim()
    if (!auth.currentUser || !selectedWorkspaceId || !selectedTask || !nextCommentBody) return
    setBusyKey('comment')
    setCommentText('')
    showToast({ type: 'success', message: 'Comment added.' })
    try {
      await addWorkhubTaskComment({
        workspaceId: selectedWorkspaceId,
        taskId: selectedTask.id,
        authorUid: auth.currentUser.uid,
        body: nextCommentBody,
      })
      await createWorkhubActivity({
        workspaceId: selectedWorkspaceId,
        actorUid: auth.currentUser.uid,
        entityType: 'comment',
        entityId: selectedTask.id,
        action: 'comment',
        message: `Commented on ${selectedTask.title}`,
        visibility: selectedTask.visibility,
        memberUids: selectedTask.memberUids,
      })
      await createWorkhubNotifications({
        workspaceId: selectedWorkspaceId,
        actorUid: auth.currentUser.uid,
        recipientUids: normalizeMemberUids([
          ...resolveTaskNotificationRecipients(selectedTask),
          ...comments.map((item) => item.authorUid),
        ]),
        entityType: 'comment',
        entityId: selectedTask.id,
        action: 'comment',
        message: `commented on \"${selectedTask.title}\": ${nextCommentBody.slice(0, 88)}${nextCommentBody.length > 88 ? '…' : ''}`,
      })
    } catch (error) {
      setCommentText(nextCommentBody)
      const message = error instanceof Error ? error.message : 'Could not add comment.'
      showToast({ type: 'error', message })
    } finally {
      setBusyKey('')
    }
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
    if (!settingsProjectName.trim()) {
      showToast({ type: 'error', message: 'Project name is required.' })
      return
    }
    if (!isValidHexColor(settingsProjectColor)) {
      showToast({ type: 'error', message: 'Pick a valid project color.' })
      return
    }
    if (!settingsProjectDeadline.trim()) {
      const deadlineLabel = settingsProjectType === 'tender' ? 'submission date' : 'final submission deadline'
      showToast({ type: 'error', message: `Project ${deadlineLabel} is required.` })
      return
    }
    if (settingsProjectType === 'tender' && !settingsProjectSubmissionTime) {
      showToast({ type: 'error', message: 'Submission time is required for tender projects.' })
      return
    }
    const memberUids = accessVisibility === 'restricted'
      ? normalizeMemberUids(accessMemberUids.length > 0 ? accessMemberUids : [selectedAccessProject.createdBy])
      : []
    setBusyKey(`access:${selectedAccessProject.id}`)
    try {
      await updateWorkhubProject(selectedAccessProject.id, {
        name: settingsProjectName.trim(),
        description: settingsProjectDescription.trim(),
        color: settingsProjectColor,
        parentProjectId: settingsProjectParentId || null,
        projectDeadline: settingsProjectDeadline,
        projectType: settingsProjectType,
        submissionTime: settingsProjectType === 'tender' ? settingsProjectSubmissionTime : '',
        priority: settingsProjectPriority,
        clientId: settingsProjectClientId,
        storageMethod: settingsStorageMethod,
        visibility: accessVisibility,
        memberUids,
      })
      await createWorkhubActivity({
        workspaceId: selectedWorkspaceId,
        actorUid: auth.currentUser.uid,
        entityType: 'project',
        entityId: selectedAccessProject.id,
        action: 'settings_update',
        message: `${settingsProjectName.trim()} settings were updated`,
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
        message: `updated settings for project \"${settingsProjectName.trim()}\"`,
      })
      setProjectAccessDialogId('')
      showToast({ type: 'success', message: 'Project settings updated.' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not update project settings.'
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
    if (selectedAccessProjectChildCount > 0) {
      showToast({ type: 'error', message: 'Move or delete child projects first.' })
      return
    }
    if (selectedAccessProjectTaskCount > 0) {
      showToast({ type: 'error', message: 'Move or delete project tasks first.' })
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
        message: `Deleted project ${selectedAccessProject.name}`,
      })
      if (selectedProjectId === selectedAccessProject.id) setSelectedProjectId('all')
      if (selectedNoteProjectId === selectedAccessProject.id) setSelectedNoteProjectId('')
      setProjectAccessDialogId('')
      showToast({ type: 'success', message: 'Project deleted.' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not delete project.'
      showToast({ type: 'error', message })
    } finally {
      setBusyKey('')
    }
  }

  function handleProjectActionMenu(projectId: string, event: React.MouseEvent) {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
    setActionMenuProjectId(projectId)
    setActionMenuPosition({ x: rect.left, y: rect.bottom + 4 })
  }

  function closeActionMenu() {
    setActionMenuProjectId(null)
  }

  function openProjectSettingsDialog(projectId: string) {
    setProjectAccessDialogId(projectId)
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

    setBusyKey('status')
    try {
      const updatedStatuses = statusDrafts.map((item) => ({ ...item, label: item.label.trim() }))
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
      const message = error instanceof Error ? error.message : 'Could not update task statuses.'
      showToast({ type: 'error', message })
    } finally {
      setBusyKey('')
    }
  }

  function openCreateTaskDialog(projectId = '') {
    setQuickAddOpen(false)
    if (projectId) {
      setSelectedProjectId(projectId)
      setSelectedNoteProjectId(projectId)
    }
    setCreateDialogType('task')
    setCreateDialogOpen(true)
  }

  function openCreateProjectDialog(parentId = '') {
    setQuickAddOpen(false)
    setProjectParentId(parentId)
    setCreateDialogType('project')
    setCreateDialogOpen(true)
  }

  function handleSelectProject(projectId: string) {
    setSelectedProjectId(projectId)
    setSelectedNoteProjectId(projectId)
    setActiveSection('tasks')
    setSelectedTaskId('')
  }

  function openWorkspaceOverview() {
    setSelectedProjectId('all')
    setSelectedNoteProjectId('')
    setActiveSection('dashboard')
    setSelectedTaskId('')
  }

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

  async function handleNotificationClick(notification: WorkhubNotification) {
    setNotificationMenuOpen(false)
    setAccountMenuOpen(false)
    if (!notification.read) {
      try {
        await markWorkhubNotificationRead(notification.id)
      } catch {
        // Best effort: navigation should still work even if read-state update fails.
      }
    }
    if (notification.entityType === 'task') {
      const targetTask = tasks.find((item) => item.id === notification.entityId)
      if (!targetTask) {
        showToast({ type: 'error', message: 'This task is no longer available.' })
        return
      }
      setSelectedProjectId(targetTask.projectId)
      setSelectedNoteProjectId(targetTask.projectId)
      setSelectedTaskId(targetTask.id)
      setActiveSection('tasks')
      return
    }
    if (notification.entityType === 'project') {
      if (!visibleWorkspaceProjects.some((item) => item.id === notification.entityId)) {
        showToast({ type: 'error', message: 'This project is no longer available.' })
        return
      }
      setSelectedProjectId(notification.entityId)
      setSelectedNoteProjectId(notification.entityId)
      setSelectedTaskId('')
      setActiveSection('tasks')
      return
    }
    setActiveSection('home')
  }

  function handleToggleNotificationMenu() {
    const opening = !notificationMenuOpen
    setNotificationMenuOpen(opening)
    if (opening) setAccountMenuOpen(false)
    if (!opening) return
    const unreadIds = notifications.filter((item) => !item.read).map((item) => item.id)
    if (unreadIds.length === 0) return
    void Promise.all(unreadIds.map((id) => markWorkhubNotificationRead(id).catch(() => undefined)))
  }

  function handleToggleAccountMenu() {
    const opening = !accountMenuOpen
    setAccountMenuOpen(opening)
    if (opening) setNotificationMenuOpen(false)
  }

  function handleOpenAccountSettings() {
    setAccountMenuOpen(false)
    navigate('/profile')
  }

  function toggleProjectExpansion(projectId: string) {
    setExpandedProjectIds((current) => current.includes(projectId) ? current.filter((item) => item !== projectId) : [...current, projectId])
  }

  function getChecklistDetailKey(taskId: string, itemId: string) {
    return `${taskId}:${itemId}`
  }

  function toggleChecklistItemDetails(taskId: string, itemId: string) {
    const detailKey = getChecklistDetailKey(taskId, itemId)
    setExpandedChecklistDetailKeys((current) => current.includes(detailKey)
      ? current.filter((item) => item !== detailKey)
      : [...current, detailKey])
  }

  function updateChecklistItem(task: WorkhubTask, itemId: string, updateFn: (item: WorkhubTaskChecklistItem) => WorkhubTaskChecklistItem) {
    const nextChecklist = buildChecklist(task).map((item) => item.id === itemId ? updateFn(item) : item)
    void handleTaskUpdate(task, { checklist: nextChecklist }, { silent: true })
  }

  function handleChecklistItemToggle(task: WorkhubTask, itemId: string, checked: boolean) {
    updateChecklistItem(task, itemId, (item) => ({ ...item, completed: checked }))
  }

  function handleChecklistRemove(task: WorkhubTask, itemId: string) {
    const nextChecklist = buildChecklist(task).filter((item) => item.id !== itemId)
    void handleTaskUpdate(task, { checklist: nextChecklist }, { silent: true })
  }

  function handleChecklistAdd(task: WorkhubTask) {
    const draft = (taskChecklistDrafts[task.id] || '').trim()
    if (!draft) return
    const nextChecklist: WorkhubTaskChecklistItem[] = [
      ...buildChecklist(task),
      {
        id: `chk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        text: draft,
        completed: false,
      },
    ]
    setTaskChecklistDrafts((current) => ({ ...current, [task.id]: '' }))
    void handleTaskUpdate(task, { checklist: nextChecklist }, { silent: true })
  }

  function handleChecklistItemEditStart(taskId: string, itemId: string, currentText: string, scope: 'inline' | 'details') {
    setEditingChecklistTaskId(taskId)
    setEditingChecklistItemId(itemId)
    setEditingChecklistScope(scope)
    setEditingChecklistItemText(currentText)
  }

  function handleChecklistItemEditSave(task: WorkhubTask, itemId: string) {
    const newText = editingChecklistItemText.trim()
    if (!newText) {
      setEditingChecklistTaskId(null)
      setEditingChecklistItemId(null)
      setEditingChecklistScope(null)
      setEditingChecklistItemText('')
      return
    }
    const nextChecklist = buildChecklist(task).map((item) => item.id === itemId ? { ...item, text: newText } : item)
    setEditingChecklistTaskId(null)
    setEditingChecklistItemId(null)
    setEditingChecklistScope(null)
    setEditingChecklistItemText('')
    void handleTaskUpdate(task, { checklist: nextChecklist }, { silent: true })
  }

  function handleChecklistItemDetailsSave(task: WorkhubTask, itemId: string) {
    const detailKey = getChecklistDetailKey(task.id, itemId)
    const details = (checklistDetailsDrafts[detailKey] || '').trim()
    updateChecklistItem(task, itemId, (item) => ({ ...item, details }))
  }

  function handleChecklistAttachmentAdd(task: WorkhubTask, itemId: string) {
    const detailKey = getChecklistDetailKey(task.id, itemId)
    const nextUrl = (checklistAttachmentDrafts[detailKey] || '').trim()
    if (!nextUrl) return
    updateChecklistItem(task, itemId, (item) => ({ ...item, attachments: [...(item.attachments || []), nextUrl] }))
    setChecklistAttachmentDrafts((current) => ({ ...current, [detailKey]: '' }))
  }

  function handleChecklistAttachmentRemove(task: WorkhubTask, itemId: string, attachment: string) {
    updateChecklistItem(task, itemId, (item) => ({ ...item, attachments: (item.attachments || []).filter((url) => url !== attachment) }))
  }

  async function fileToBase64(file: File) {
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
  }

  async function uploadWorkhubAttachment(file: File, project: WorkhubProject) {
    const isDrive = project.storageMethod === 'drive'
    
    if (isDrive) {
      const MAX_BYTES = 7 * 1024 * 1024
      if (file.size > MAX_BYTES) {
        throw new Error(`File ${file.name} exceeds 7 MB limit for Drive upload.`)
      }
      const dataBase64 = await fileToBase64(file)
      const parentFolderId = await resolveProjectDriveFolderId(project)
      const result = await uploadWorkhubAttachmentToDrive({
        fileName: file.name,
        contentType: file.type || 'application/octet-stream',
        dataBase64,
        parentFolderId,
      })
      return result.url
    } else {
      // Firebase Storage
      const extension = file.name.split('.').pop() || 'bin'
      const isImage = file.type.startsWith('image/')
      const isVideo = file.type.startsWith('video/')
      const subfolder = isImage ? 'images' : (isVideo ? 'videos' : 'docs')
      
      const storagePath = `workhub-attachments/${project.workspaceId}/${project.id}/${subfolder}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${extension}`
      const storageRef = ref(storage, storagePath)
      
      await uploadBytes(storageRef, file, { contentType: file.type })
      return await getDownloadURL(storageRef)
    }
  }

  async function resolveProjectDriveFolderId(project: WorkhubProject): Promise<string | undefined> {
    try {
      const result = await ensureWorkhubDriveProjectFolder({ projectId: project.id, projectName: project.name })
      return result.folderId
    } catch {
      return undefined
    }
  }

  async function handleTaskAttachmentFileUpload(task: WorkhubTask, files: File[]) {
    if (files.length === 0) return
    const project = visibleWorkspaceProjects.find((p) => p.id === task.projectId)
    if (!project) return
    setUploadingTaskAttachmentId(task.id)
    try {
      const uploadedUrls = await Promise.all(files.map((file) => uploadWorkhubAttachment(file, project)))
      const nextAttachments = [...getTaskAttachments(task), ...uploadedUrls]
      await handleTaskUpdate(task, { attachments: nextAttachments }, { silent: true })
      showToast({ type: 'success', message: uploadedUrls.length > 1 ? `${uploadedUrls.length} attachments uploaded.` : 'Attachment uploaded.' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not upload attachment.'
      showToast({ type: 'error', message })
    } finally {
      setUploadingTaskAttachmentId('')
    }
  }

  async function handleChecklistAttachmentFileUpload(task: WorkhubTask, itemId: string, files: File[]) {
    if (files.length === 0) return
    const project = visibleWorkspaceProjects.find((p) => p.id === task.projectId)
    if (!project) return
    const key = getChecklistDetailKey(task.id, itemId)
    setUploadingChecklistAttachmentKey(key)
    try {
      const uploadedUrls = await Promise.all(files.map((file) => uploadWorkhubAttachment(file, project)))
      const nextChecklist = buildChecklist(task).map((item) => item.id === itemId
        ? { ...item, attachments: [...(item.attachments || []), ...uploadedUrls] }
        : item)
      await handleTaskUpdate(task, { checklist: nextChecklist }, { silent: true })
      showToast({ type: 'success', message: uploadedUrls.length > 1 ? `${uploadedUrls.length} checklist attachments uploaded.` : 'Checklist attachment uploaded.' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not upload checklist attachment.'
      showToast({ type: 'error', message })
    } finally {
      setUploadingChecklistAttachmentKey('')
    }
  }

  function handleChecklistLinkAdd(task: WorkhubTask, itemId: string) {
    const detailKey = getChecklistDetailKey(task.id, itemId)
    const nextLink = (checklistLinkDrafts[detailKey] || '').trim()
    if (!nextLink) return
    updateChecklistItem(task, itemId, (item) => ({ ...item, links: [...(item.links || []), nextLink] }))
    setChecklistLinkDrafts((current) => ({ ...current, [detailKey]: '' }))
  }

  function handleChecklistLinkRemove(task: WorkhubTask, itemId: string, link: string) {
    updateChecklistItem(task, itemId, (item) => ({ ...item, links: (item.links || []).filter((value) => value !== link) }))
  }

  function handleTaskAttachmentAdd(task: WorkhubTask) {
    const nextUrl = (taskAttachmentDrafts[task.id] || '').trim()
    if (!nextUrl) return
    const nextAttachments = [...getTaskAttachments(task), nextUrl]
    setTaskAttachmentDrafts((current) => ({ ...current, [task.id]: '' }))
    void handleTaskUpdate(task, { attachments: nextAttachments }, { silent: true })
  }

  function handleTaskAttachmentRemove(task: WorkhubTask, attachment: string) {
    const isDriveFile = attachment.includes('drive.google.com/thumbnail?id=')
    setAttachmentDeletePrompt({ task, attachment, isDriveFile })
  }

  function confirmAttachmentRemoval(mode: 'delete_permanently' | 'remove_only' | 'cancel') {
    if (!attachmentDeletePrompt) return
    const { task, attachment } = attachmentDeletePrompt
    
    if (mode === 'cancel') {
      setAttachmentDeletePrompt(null)
      return
    }

    if (mode === 'delete_permanently') {
      const match = attachment.match(/id=([^&]+)/)
      if (match && match[1]) {
        deleteWorkhubAttachmentFromDrive(match[1]).catch((err) => {
          console.error('Failed to delete permanently from Drive:', err)
          showToast({ type: 'error', message: 'Failed to permanently delete from Drive.' })
        })
      }
    }

    const nextAttachments = getTaskAttachments(task).filter((url) => url !== attachment)
    void handleTaskUpdate(task, { attachments: nextAttachments }, { silent: true })
    setAttachmentDeletePrompt(null)
  }

  function handleSelectedTaskDescriptionSave(task: WorkhubTask) {
    const nextDescription = selectedTaskDescriptionDraft.trim()
    if (nextDescription === (task.description || '')) return
    void handleTaskUpdate(task, { description: nextDescription }, { silent: true })
  }

  function handleSelectedTaskTitleSave(task: WorkhubTask) {
    const nextTitle = normalizeTaskTitle(selectedTaskTitleDraft.replace(/\r\n/g, '\n'))
    if (!nextTitle) {
      setSelectedTaskTitleDraft(task.title)
      return
    }
    if (nextTitle === normalizeTaskTitle((task.title || '').replace(/\r\n/g, '\n'))) return
    void handleTaskUpdate(task, { title: nextTitle }, { silent: true })
  }

  async function handleSaveSelectedProjectDetails() {
    if (!auth.currentUser || !selectedWorkspaceId || !selectedProject) return
    if (!canEditSelectedProject) {
      showToast({ type: 'error', message: 'You do not have permission to edit this project.' })
      return
    }
    const nextName = selectedProjectNameDraft.trim()
    if (!nextName) {
      showToast({ type: 'error', message: 'Project name is required.' })
      return
    }
    if (!isValidHexColor(selectedProjectColorDraft)) {
      showToast({ type: 'error', message: 'Pick a valid project color.' })
      return
    }
    if (selectedProjectTypeDraft === 'tender' && !selectedProjectSubmissionTimeDraft.trim()) {
      showToast({ type: 'error', message: 'Submission time is required for tender projects.' })
      return
    }
    if (selectedProjectStartDateDraft && selectedProjectDeadlineDraft && selectedProjectStartDateDraft > selectedProjectDeadlineDraft) {
      showToast({ type: 'error', message: 'Deadline cannot be earlier than the start date.' })
      return
    }
    setBusyKey(`project-detail:${selectedProject.id}`)
    try {
      await updateWorkhubProject(selectedProject.id, {
        name: nextName,
        description: selectedProjectDescriptionDraft.trim(),
        color: selectedProjectColorDraft,
        projectStartDate: selectedProjectStartDateDraft,
        projectDeadline: selectedProjectDeadlineDraft,
        submissionTime: selectedProjectTypeDraft === 'tender' ? selectedProjectSubmissionTimeDraft.trim() : '',
        projectType: selectedProjectTypeDraft,
      })
      await createWorkhubActivity({
        workspaceId: selectedWorkspaceId,
        actorUid: auth.currentUser.uid,
        entityType: 'project',
        entityId: selectedProject.id,
        action: 'settings_update',
        message: `${nextName} settings were updated`,
        visibility: selectedProject.visibility,
        memberUids: selectedProject.memberUids,
      })
      await createWorkhubNotifications({
        workspaceId: selectedWorkspaceId,
        actorUid: auth.currentUser.uid,
        recipientUids: selectedProject.visibility === 'restricted'
          ? normalizeMemberUids(selectedProject.memberUids)
          : normalizeMemberUids(selectedWorkspace?.accessMemberUids || []),
        entityType: 'project',
        entityId: selectedProject.id,
        action: 'settings_update',
        message: `updated settings for project "${nextName}"`,
      })
      showToast({ type: 'success', message: 'Project details updated.' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not update project details.'
      showToast({ type: 'error', message })
    } finally {
      setBusyKey('')
    }
  }

  async function handleSelectedProjectDescriptionBlur() {
    if (!selectedProject || !canEditSelectedProject) return
    const nextDescription = selectedProjectDescriptionDraft.trim()
    if (nextDescription === (selectedProject.description || '')) return
    setBusyKey(`project-detail:${selectedProject.id}`)
    try {
      await updateWorkhubProject(selectedProject.id, { description: nextDescription })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not update project description.'
      showToast({ type: 'error', message })
      setSelectedProjectDescriptionDraft(selectedProject.description || '')
    } finally {
      setBusyKey('')
    }
  }

  async function handleSelectedProjectColorSelect(nextColor: string) {
    setSelectedProjectColorDraft(nextColor)
    setSelectedProjectColorMenuOpen(false)
    if (!selectedProject || !canEditSelectedProject) return
    if (nextColor === selectedProject.color) return
    setBusyKey(`project-detail:${selectedProject.id}`)
    try {
      await updateWorkhubProject(selectedProject.id, { color: nextColor })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not update project color.'
      showToast({ type: 'error', message })
      setSelectedProjectColorDraft(selectedProject.color)
    } finally {
      setBusyKey('')
    }
  }

  function handleTaskLinkAdd(task: WorkhubTask) {
    const nextLink = (taskLinkDrafts[task.id] || '').trim()
    if (!nextLink) return
    const nextLinks = [...getTaskLinks(task), nextLink]
    setTaskLinkDrafts((current) => ({ ...current, [task.id]: '' }))
    void handleTaskUpdate(task, { links: nextLinks }, { silent: true })
  }

  function handleTaskLinkRemove(task: WorkhubTask, link: string) {
    const nextLinks = getTaskLinks(task).filter((value) => value !== link)
    void handleTaskUpdate(task, { links: nextLinks }, { silent: true })
  }

  function handleChecklistItemEditCancel() {
    setEditingChecklistTaskId(null)
    setEditingChecklistItemId(null)
    setEditingChecklistScope(null)
    setEditingChecklistItemText('')
  }

  const renderProjectNodes = (nodes: WorkhubProjectTreeNode[], depth = 0) => nodes.map((node) => {
    const isExpanded = expandedProjectIds.includes(node.id)
    const childCount = node.children.length
    const directTaskCount = workspaceScopedTasks.filter((task) => task.projectId === node.id).length
    return (
      <div key={node.id} className={`workhub-tree-node-wrap${depth === 0 ? ' is-root' : ' is-nested'}`}>
        <div
          className={`workhub-tree-node${selectedProjectId === node.id ? ' is-active' : ''}${depth === 0 && childCount === 0 ? ' is-root-leaf-node' : ''}`}
          style={{ paddingLeft: `${10 + (depth * 14)}px` }}
          role="button"
          tabIndex={0}
          onClick={() => handleSelectProject(node.id)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              handleSelectProject(node.id)
            }
          }}
          onDoubleClick={(event) => {
            const target = event.target as HTMLElement
            if (target.closest('.workhub-tree-toggle, .workhub-tree-node-actions')) return
            if (childCount > 0) {
              toggleProjectExpansion(node.id)
            }
          }}
        >
          {childCount > 0 ? (
            <button
              type="button"
              className="workhub-tree-toggle"
              onClick={(event) => {
                event.stopPropagation()
                toggleProjectExpansion(node.id)
              }}
            >
              <span className={`workhub-tree-toggle-icon${isExpanded ? ' is-expanded' : ''}`} aria-hidden="true">
                <svg viewBox="0 0 12 12" focusable="false" aria-hidden="true">
                  <path d="M4 2.5L7.8 6L4 9.5" />
                </svg>
              </span>
            </button>
          ) : (
            depth === 0 ? null : (
              <span
                className="workhub-tree-leaf-indicator"
                aria-hidden="true"
                title="No sub-projects"
              >
                •
              </span>
            )
          )}
          <div className="workhub-tree-node-main">
            <span className={`workhub-project-dot${depth === 0 ? ' is-root' : ''}`} style={{ background: node.color }} />
            <span className="workhub-tree-node-text">
              <span className="workhub-tree-node-title" title={node.name}>{node.name}</span>
              <span className="workhub-tree-node-meta">({childCount > 0 ? `${childCount} sub-project${childCount > 1 ? 's' : ''}` : `${directTaskCount} task${directTaskCount === 1 ? '' : 's'}`})</span>
            </span>
          </div>
          <div className="workhub-tree-node-actions">
            <button
              type="button"
              className="workhub-plus-btn"
              onClick={(event) => {
                event.stopPropagation()
                handleProjectActionMenu(node.id, event)
              }}
            >
              +
            </button>
            {isPrivilegedMember && (
              <button
                type="button"
                className="workhub-gear-btn"
                onClick={(event) => {
                  event.stopPropagation()
                  openProjectSettingsDialog(node.id)
                }}
              >
                ⚙
              </button>
            )}
          </div>
        </div>
        {childCount > 0 && isExpanded && <div className="workhub-tree-children">{renderProjectNodes(node.children, depth + 1)}</div>}
      </div>
    )
  })

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

  if (memberLoading || (bootstrappingMasterAccess && !member)) {
    return (
      <div className="workhub-shell">
        <div className="workhub-center-card">
          <div className="workhub-spinner" />
          <h1>Loading WorkHub</h1>
          <p>Preparing your private company workspace.</p>
          <WorkhubStyles />
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
          <WorkhubStyles />
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
          <WorkhubStyles />
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
        <WorkhubStyles />
      </div>
    )
  }

  return (
    <div className="workhub-shell" dir="ltr">
      <div className="workhub-app">
        <header className="workhub-topbar">
          <div className="workhub-brand-wrap">
            <span className="workhub-brand" aria-label="WorkHub">
              <span className="workhub-brand-initial">W</span>ork<span className="workhub-brand-initial">H</span>ub
            </span>
            <span className="workhub-brand-subtitle">Developed by Muneer Al Sulaimi 2026</span>
          </div>
          <nav className="workhub-header-actions">
            <button className={`workhub-tab${activeSection === 'home' ? ' is-active' : ''}`} onClick={() => setActiveSection('home')}>Home</button>
            <button className={`workhub-tab${activeSection === 'workspaces' ? ' is-active' : ''}`} onClick={() => setActiveSection('workspaces')}>Workspaces</button>
            {isPrivilegedMember && <button className={`workhub-tab${activeSection === 'users' ? ' is-active' : ''}`} onClick={() => setActiveSection('users')}>Users</button>}
            <button className={`workhub-tab${activeSection === 'clients' ? ' is-active' : ''}`} onClick={() => setActiveSection('clients')}>Clients</button>
            <button className={`workhub-tab${activeSection === 'notes' ? ' is-active' : ''}`} onClick={() => setActiveSection('notes')}>Notes</button>
            <button className={`workhub-tab${activeSection === 'dashboard' ? ' is-active' : ''}`} onClick={openWorkspaceOverview}>Dashboard</button>
            <div className="workhub-notify-wrap">
              <button
                type="button"
                className={`workhub-notify-btn${notificationMenuOpen ? ' is-open' : ''}`}
                onClick={handleToggleNotificationMenu}
                aria-label="Notifications"
                title="Notifications"
              >
                <span aria-hidden="true" style={{fontSize: '0.95rem'}}>🔔</span>
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
                    {notifications.slice(0, 24).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        className={`workhub-notify-item${item.read ? '' : ' is-unread'}`}
                        onClick={() => { void handleNotificationClick(item) }}
                      >
                        <span className="workhub-notify-message">{item.message}</span>
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

        <div className={`workhub-shell-layout${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
          <aside className={`workhub-panel workhub-tree-sidebar${sidebarCollapsed ? ' is-collapsed' : ''}`}>
            {sidebarCollapsed ? (
              <div className="workhub-panel-head compact is-collapsed-head">
                <button className="workhub-sidebar-toggle" onClick={() => setSidebarCollapsed(false)} title="Expand sidebar" aria-label="Expand sidebar">
                  ⟩
                </button>
              </div>
            ) : (
              <div className="workhub-panel-head compact">
                <div>
                  <h2>Workspace</h2>
                </div>
                <button className="workhub-sidebar-toggle" onClick={() => setSidebarCollapsed(true)} title="Collapse sidebar" aria-label="Collapse sidebar">
                  ⟨
                </button>
              </div>
            )}
            {!sidebarCollapsed && (
              <>
                <div className="workhub-tree-actions">
                  <div className="workhub-inline-row" style={{ alignItems: 'flex-end' }}>
                    <label className="workhub-toolbar-select">
                      <select name="selectedWorkspace" value={selectedWorkspaceId} onChange={(event) => setSelectedWorkspaceId(event.target.value)}>
                        {visibleWorkspaces.length === 0 && <option value="">No workspace yet</option>}
                        {visibleWorkspaces.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                      </select>
                    </label>
                    {isPrivilegedMember && <button className="workhub-plus-btn" onClick={(event) => handleProjectActionMenu('__workspace__', event)}>+</button>}
                    {isPrivilegedMember && selectedWorkspaceId && <button className="workhub-gear-btn" onClick={() => openWorkspaceSettings(selectedWorkspaceId)}>⚙</button>}
                  </div>
                </div>
                <div className="workhub-tree-actions">
                  <button
                    className={`workhub-tree-overview${selectedProjectId === 'all' && activeSection === 'dashboard' ? ' is-active' : ''}`}
                    onClick={openWorkspaceOverview}
                  >
                    Workspace overview
                  </button>
                </div>
                <div className="workhub-tree-scroll">
                  {groupedProjectsWorkspace ? (
                    <>
                      <div className="workhub-tree-group">
                        <button
                          type="button"
                          className="workhub-tree-group-toggle"
                          onClick={() => setProjectsGroupExpanded((current) => !current)}
                        >
                          <span className="workhub-tree-group-label">
                            <span className="workhub-tree-group-caret">{projectsGroupExpanded ? '▾' : '▸'}</span>
                            <strong>Projects</strong>
                          </span>
                          <small>{mirroredProjectRoots.length} root item{mirroredProjectRoots.length === 1 ? '' : 's'}</small>
                        </button>
                        {projectsGroupExpanded && (
                          mirroredProjectRoots.length > 0 ? (
                            <div className="workhub-tree-group-body">{renderProjectNodes(mirroredProjectRoots)}</div>
                          ) : (
                            <div className="workhub-empty-state">No technical projects found yet. Create a project in a technical workspace first.</div>
                          )
                        )}
                      </div>
                      {localWorkspaceRoots.length > 0 && <div className="workhub-tree-group-body">{renderProjectNodes(localWorkspaceRoots)}</div>}
                    </>
                  ) : visibleProjectTree.length > 0 ? renderProjectNodes(visibleProjectTree) : (
                    <div className="workhub-empty-state workhub-empty-projects-cta">
                      <span>No projects yet. Create a top-level category first.</span>
                      <button
                        type="button"
                        className="workhub-primary-mini"
                        onClick={() => openCreateProjectDialog('')}
                        disabled={!selectedWorkspaceId}
                      >
                        Create first project
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </aside>

          <section className="workhub-main-stage">

            {activeSection === 'dashboard' && (
              <main className="workhub-section-stack">
                <section className="workhub-panel">
                  <div className="workhub-panel-head compact">
                    <div>
                      <h2>{selectedProject ? selectedProject.name : selectedWorkspace?.name || 'Workspace overview'}</h2>
                      <p>
                        {selectedProject
                          ? selectedProject.description || 'This category/project is ready for nested sub-projects, notes, and tasks.'
                          : selectedWorkspace?.description || 'Select a category from the tree or create a new one to start organizing nested projects.'}
                      </p>
                    </div>
                    <span className="workhub-badge">{selectedProject ? `${selectedBranchChildProjects.length} direct children` : `${visibleWorkspaceProjects.length} visible projects`}</span>
                  </div>
                  <div className="workhub-summary-strip">
                    <div className="workhub-summary-tile"><strong>{taskCounts.total}</strong><span>Tasks in view</span></div>
                    <div className="workhub-summary-tile"><strong>{taskCounts.inProgress}</strong><span>In progress</span></div>
                    <div className="workhub-summary-tile"><strong>{taskCounts.urgent}</strong><span>Urgent</span></div>
                    <div className="workhub-summary-tile"><strong>{restrictedProjectsCount}</strong><span>Restricted projects</span></div>
                  </div>
                  <div className="workhub-home-actions">
                    {selectedProject && <button className="workhub-primary-btn" onClick={() => openCreateProjectDialog(selectedProject.id)}>Add child project</button>}
                    {selectedProject && <button className="workhub-ghost-btn" onClick={() => openCreateTaskDialog(selectedProject.id)}>Add task</button>}
                    <button className="workhub-ghost-btn" onClick={() => setActiveSection('home')}>Open home</button>
                  </div>
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
                          {overviewPriorityProjects.length === 0 && <div className="workhub-empty-state">No high-priority projects with upcoming deadlines.</div>}
                          {overviewPriorityProjects.map((item) => (
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
                    </div>
                  )}
                </section>

                <section className="workhub-panel">
                  <div className="workhub-panel-head compact">
                    <div>
                      <h2>{selectedProject ? 'Sub-projects' : 'Top-level categories'}</h2>
                      <p>{selectedProject ? 'Children of the selected project/category.' : 'These are the main categories in your workspace tree.'}</p>
                    </div>
                  </div>
                  <div className="workhub-project-card-grid">
                    {selectedBranchChildProjects.map((project) => (
                      <article key={project.id} className="workhub-project-card compact-card">
                        <div className="workhub-project-title-row">
                          <span className="workhub-project-dot" style={{ background: project.color }} />
                          <strong>{project.name}</strong>
                          <span className="workhub-badge">{project.visibility === 'restricted' ? 'Restricted' : 'Workspace'}</span>
                        </div>
                        <p>{project.description || 'No description yet.'}</p>
                        <div className="workhub-project-card-actions">
                          <button className="workhub-ghost-mini" onClick={() => handleSelectProject(project.id)}>Open</button>
                          <button className="workhub-plus-btn" onClick={(event) => handleProjectActionMenu(project.id, event)}>+</button>
                          {isPrivilegedMember && <button className="workhub-gear-btn" onClick={() => openProjectSettingsDialog(project.id)}>⚙</button>}
                        </div>
                      </article>
                    ))}
                    {selectedBranchChildProjects.length === 0 && <div className="workhub-empty-state">No child projects here yet.</div>}
                  </div>
                </section>
              </main>
            )}

            {activeSection === 'workspaces' && (
              <main className="workhub-section-stack">
                <section className="workhub-panel">
                  <div className="workhub-panel-head">
                    <div>
                      <h2>Workspaces</h2>
                      <p>Switch the whole project tree by workspace.</p>
                    </div>
                  </div>
                  <div className="workhub-workspace-grid">
                    {visibleWorkspaces.map((workspace) => (
                      <article key={workspace.id} className={`workhub-workspace-card${selectedWorkspaceId === workspace.id ? ' is-active' : ''}`}>
                        <button className="workhub-ghost-mini" onClick={() => setSelectedWorkspaceId(workspace.id)}>Open</button>
                        {isPrivilegedMember && <button className="workhub-gear-btn" onClick={() => openWorkspaceSettings(workspace.id)}>⚙</button>}
                        <strong>{workspace.name}</strong>
                        <span>{workspace.description || 'No description yet.'}</span>
                      </article>
                    ))}
                    {visibleWorkspaces.length === 0 && <div className="workhub-empty-state">No workspace available for your account.</div>}
                  </div>
                </section>
              </main>
            )}

            {activeSection === 'users' && isPrivilegedMember && (
              <main className="workhub-section-stack">
                <section className="workhub-panel">
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
                            <option key={workspace.id} value={workspace.id}>{workspace.name}</option>
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
                                        <span className="workhub-ws-picker-name">{workspace.name}</span>
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
                        New client
                      </button>
                      {selectedClientId === '__new__' ? (
                        <button className="workhub-primary-btn" onClick={() => { void handleCreateClientFromManager() }} disabled={busyKey === 'client:create'}>
                          {busyKey === 'client:create' ? 'Creating…' : 'Create client'}
                        </button>
                      ) : (
                        <button className="workhub-primary-btn" onClick={() => { void handleSaveClientDetails() }} disabled={!selectedClientId || busyKey === `client:save:${selectedClientId}`}>
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
                        const workspaceName = visibleWorkspaces.find((item) => item.id === client.workspaceId)?.name || 'Workspace'
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
          <main className="workhub-section-stack">
            <section className="workhub-panel">
              <div className="workhub-panel-head">
                <div>
                  <h2>Project notes</h2>
                  <p>Notes belong to the selected category/project in the sidebar tree.</p>
                </div>
                <div className="workhub-panel-tools">
                  <button className="workhub-primary-btn" disabled={!selectedProject || !projectNotesChanged || busyKey === 'project-notes'} onClick={() => { void handleSaveProjectNotes() }}>
                    {busyKey === 'project-notes' ? 'Saving...' : 'Save notes'}
                  </button>
                </div>
              </div>
              <div className="workhub-notes-card">
                {selectedProject ? (
                  <>
                    <label>
                      <span>{selectedProject.name}</span>
                    </label>
                    <textarea name="projectNotes" value={projectNotesDraft} onChange={(event) => setProjectNotesDraft(event.target.value)} placeholder="Write key updates, checklist, or notes for this project..." />
                  </>
                ) : (
                  <div className="workhub-empty-state">Select a project to edit notes.</div>
                )}
              </div>
            </section>
          </main>
        )}

        {activeSection === 'tasks' && (
          <main className="workhub-content-area">
            <div className="workhub-task-sections compact-sections">
              <div className="workhub-status-tabs">
                <button
                  type="button"
                  className={`workhub-status-tab${selectedTaskStatusTab === 'all' ? ' is-active' : ''}`}
                  onClick={() => setSelectedTaskStatusTab('all')}
                  data-status-color="backlog"
                  style={{ ['--status-color' as string]: '#6b7280' }}
                >
                  All
                </button>
                {workspaceTaskStatuses.map((status) => {
                  return (
                    <button
                      key={status.id}
                      type="button"
                      className={`workhub-status-tab${selectedTaskStatusTab === status.id ? ' is-active' : ''}`}
                      onClick={() => setSelectedTaskStatusTab(status.id)}
                      data-status-color={status.id}
                      style={{ ['--status-color' as string]: status.color }}
                    >
                      {status.label}
                    </button>
                  )
                })}
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
                          {workspaceTaskStatuses.map((status) => (
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
                {isPrivilegedMember && (
                  <>
                    <button
                      type="button"
                      className="workhub-status-manage-btn"
                      onClick={() => setStatusDialogOpen(true)}
                      aria-label="Manage task statuses"
                      title="Manage task statuses"
                    >
                      ⚙
                    </button>
                  </>
                )}
              </div>
              <div className="workhub-task-table-wrap">
                <div className="workhub-task-table-head shared">
                  <span className="workhub-select-all-head">
                    <input
                      type="checkbox"
                      checked={allVisibleTasksSelected}
                      onChange={(event) => handleToggleSelectAllVisible(event.target.checked)}
                      disabled={visibleTaskIds.length === 0}
                      aria-label="Select all visible tasks"
                    />
                    <span>Task details</span>
                  </span>
                  <span>Status</span>
                  <span>Assignee</span>
                  <span>Due</span>
                  <span>Priority</span>
                  <span className="workhub-col-checklist">Checklist</span>
                  <span className="workhub-col-actions">Actions</span>
                  <span className="workhub-col-more">More</span>
                </div>
                {(() => {
                  const visibleStatuses = selectedTaskStatusTab === 'all'
                    ? workspaceTaskStatuses
                    : workspaceTaskStatuses.filter((s) => s.id === selectedTaskStatusTab)
                  return visibleStatuses.map((status) => {
                    const statusTasks = filteredTasksByStatus[status.id] || []
                    return (
                      <section key={status.id} className="workhub-task-group compact-group">
                        <div className="workhub-task-group-head">
                          <h3 style={{ '--status-color': status.color } as any}>{status.label}</h3>
                          <span>{statusTasks.length}</span>
                        </div>
                        <div className="workhub-task-group-body">
                          {statusTasks.map((task, index) => (
                            <TaskRow
                              key={task.id}
                              task={task}
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
                              statuses={workspaceTaskStatuses}
                              meta={taskMetaById[task.id] ?? emptyTaskRowMeta}
                              callbacks={taskRowCallbacks}
                            />
                          ))}
                          <QuickAddTaskRow
                            key={`quick-add-${status.id}`}
                            status={status}
                            assignableMembersByProjectId={assignableMembersByProjectId}
                            workspaceAssignableMembers={workspaceAssignableMembers}
                            memberByUid={memberByUid}
                            flatVisibleProjectOptions={flatVisibleProjectOptions}
                            defaultProjectId={quickAddDefaultProjectId}
                            selectedProjectId={selectedProjectId}
                            selectedTaskStatusTab={selectedTaskStatusTab}
                            currentUid={auth.currentUser?.uid || ''}
                            activeDragTaskId={dragTaskId}
                            activeDragStatusId={dragStatusId}
                            dropTargetKey={dropTargetKey}
                            onDragOverEnd={(statusId) => setDropTargetKey(`end:${statusId}`)}
                            onDropToEnd={(statusId) => { void handleTaskReorder(dragTaskId, statusId, null) }}
                            onCommit={handleQuickAddTask}
                          />
                        </div>
                      </section>
                    )
                  })
                })()}
              </div>
            </div>

            <aside className="workhub-task-detail-rail">
              <div className="workhub-detail-rail-head">
                <h3>Details</h3>
                <span>{selectedTask ? 'Task selected' : selectedProject ? 'Project selected' : 'No item selected'}</span>
              </div>
              {selectedTask ? (
                <>
                  <div className="workhub-detail-card">
                    <div className="workhub-detail-icon-row">
                      <div className="workhub-detail-icon-wrap">
                        <button
                          type="button"
                          className="workhub-detail-icon-btn"
                          title={`Status: ${selectedTask.status}`}
                          onClick={() => setDetailMenuOpen((current) => current === 'status' ? '' : 'status')}
                        >
                          {getTaskStatusIcon(selectedTask.status)}
                        </button>
                        {detailMenuOpen === 'status' && (
                          <div className="workhub-detail-icon-menu">
                            {workspaceTaskStatuses.map((value) => (
                              <button
                                key={value.id}
                                type="button"
                                className={selectedTask.status === value.id ? 'is-active' : ''}
                                onClick={() => {
                                  void handleTaskUpdate(selectedTask, { status: value.id as WorkhubTaskStatus })
                                  setDetailMenuOpen('')
                                }}
                              >
                                <span>{getTaskStatusIcon(value.id)}</span>
                                <span>{value.label}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="workhub-detail-icon-wrap">
                        <button
                          type="button"
                          className={`workhub-detail-icon-btn workhub-priority-indicator priority-${selectedTask.priority}`}
                          title={`Priority: ${PRIORITY_LABELS[selectedTask.priority]}`}
                          onClick={() => setDetailMenuOpen((current) => current === 'priority' ? '' : 'priority')}
                        >
                          {getPriorityIcon(selectedTask.priority)}
                        </button>
                        {detailMenuOpen === 'priority' && (
                          <div className="workhub-detail-icon-menu">
                            {(Object.keys(PRIORITY_LABELS) as WorkhubTaskPriority[]).map((value) => (
                              <button
                                key={value}
                                type="button"
                                className={selectedTask.priority === value ? 'is-active' : ''}
                                onClick={() => {
                                  void handleTaskUpdate(selectedTask, { priority: value })
                                  setDetailMenuOpen('')
                                }}
                              >
                                <span>{getPriorityIcon(value)}</span>
                                <span>{PRIORITY_LABELS[value]}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="workhub-detail-icon-wrap">
                        <button
                          type="button"
                          className="workhub-detail-icon-btn"
                          title="Assignee"
                          onClick={() => setDetailMenuOpen((current) => current === 'assignee' ? '' : 'assignee')}
                        >
                          👤
                        </button>
                        {detailMenuOpen === 'assignee' && (
                          <div className="workhub-detail-icon-menu">
                            {selectedTaskAssignableMembers.map((item) => (
                              <button
                                key={item.uid}
                                type="button"
                                className={selectedTask.assigneeUid === item.uid ? 'is-active' : ''}
                                onClick={() => {
                                  void handleTaskUpdate(selectedTask, { assigneeUid: item.uid })
                                  setDetailMenuOpen('')
                                }}
                              >
                                {item.displayName || item.email}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="workhub-detail-icon-wrap">
                        <button
                          type="button"
                          className="workhub-detail-icon-btn"
                          title={`Due date: ${formatDueDateShort(selectedTask.dueDate || '')}`}
                          onClick={() => setDetailMenuOpen((current) => current === 'dueDate' ? '' : 'dueDate')}
                        >
                          📅
                        </button>
                        {detailMenuOpen === 'dueDate' && (
                          <div className="workhub-detail-icon-menu">
                            <input
                              type="date"
                              value={selectedTask.dueDate || ''}
                              onChange={(event) => void handleTaskUpdate(selectedTask, { dueDate: event.target.value })}
                            />
                            <button type="button" onClick={() => void handleTaskUpdate(selectedTask, { dueDate: '' })}>Clear</button>
                          </div>
                        )}
                      </div>
                    </div>
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
                    <div className="workhub-task-attachments">
                      <div className="workhub-task-attachments-head">
                        <span>Attachments & links</span>
                        <div className="workhub-view-mode-toggle">
                          <button type="button" className={attachmentViewMode === 'list' ? 'active' : ''} onClick={() => setAttachmentViewMode('list')} title="Minimal List">List</button>
                          <button type="button" className={attachmentViewMode === 'thumbnail' ? 'active' : ''} onClick={() => setAttachmentViewMode('thumbnail')} title="Small Thumbnails">Thumbs</button>
                          <button type="button" className={attachmentViewMode === 'card' ? 'active' : ''} onClick={() => setAttachmentViewMode('card')} title="Cards">Cards</button>
                        </div>
                      </div>
                      <div className="workhub-checklist-url-row compact-row">
                        <input
                          type="url"
                          value={taskAttachmentDrafts[selectedTask.id] || ''}
                          onChange={(event) => setTaskAttachmentDrafts((current) => ({ ...current, [selectedTask.id]: event.target.value }))}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault()
                              handleTaskAttachmentAdd(selectedTask)
                            }
                          }}
                          placeholder="Attachment URL (image, video, pdf, file)"
                        />
                        <button type="button" onClick={() => handleTaskAttachmentAdd(selectedTask)}>Add URL</button>
                        <label className="workhub-file-upload-btn">
                          <input
                            type="file"
                            multiple
                            onChange={(event) => {
                              const files = Array.from(event.target.files || [])
                              if (files.length === 0) return
                              void handleTaskAttachmentFileUpload(selectedTask, files)
                              event.target.value = ''
                            }}
                            disabled={uploadingTaskAttachmentId === selectedTask.id}
                          />
                          {uploadingTaskAttachmentId === selectedTask.id ? 'Uploading…' : 'Upload'}
                        </label>
                      </div>
                      {getTaskAttachments(selectedTask).length > 0 && (
                        <div className={`workhub-checklist-url-list view-${attachmentViewMode}`}>
                          {getTaskAttachments(selectedTask).map((url) => {
                            const review = attachmentReviews[url]
                            const reviewCount = (review?.notes.trim() ? 1 : 0)
                              + (review?.comments.length || 0)
                              + (review?.markers.length || 0)
                              + (review?.modificationChecks.length || 0)
                            return (
                              <div key={url} className="workhub-checklist-url-item workhub-task-image-item">
                                {isImageAttachmentUrl(url) ? (
                                  <button type="button" className="workhub-attachment-preview-btn" onClick={() => openAttachmentLightbox(url)}>
                                    <img src={url} alt="Attachment preview" className="workhub-task-image-thumb" loading="lazy" />
                                    <span>{url}</span>
                                  </button>
                                ) : (
                                  <a href={url} target="_blank" rel="noreferrer" className="workhub-task-image-link">
                                    <span className="workhub-task-attachment-icon">📎</span>
                                    <span>{url}</span>
                                  </a>
                                )}
                                {reviewCount > 0 && (
                                  <span className="workhub-attachment-review-indicator" title={`${reviewCount} note${reviewCount === 1 ? '' : 's'} / annotations`}>
                                    📝 {reviewCount}
                                  </span>
                                )}
                                <button type="button" onClick={() => handleTaskAttachmentRemove(selectedTask, url)}>✕</button>
                              </div>
                            )
                          })}
                        </div>
                      )}

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
                        <button type="button" onClick={() => handleTaskLinkAdd(selectedTask)}>Add link</button>
                      </div>
                      {getTaskLinks(selectedTask).length > 0 && (
                        <div className="workhub-checklist-url-list">
                          {getTaskLinks(selectedTask).map((link) => (
                            <div key={link} className="workhub-checklist-url-item">
                              <a href={link} target="_blank" rel="noreferrer">{link}</a>
                              <button type="button" onClick={() => handleTaskLinkRemove(selectedTask, link)}>✕</button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="workhub-detail-meta">
                      <span>Project: {projectNameById[selectedTask.projectId] || 'Unknown'}</span>
                      <span>Status: {workspaceTaskStatuses.find((value) => value.id === selectedTask.status)?.label || selectedTask.status}</span>
                      <span>Priority: {PRIORITY_LABELS[selectedTask.priority]}</span>
                      <span>Assignee: {memberByUid[selectedTask.assigneeUid]?.displayName || memberByUid[selectedTask.assigneeUid]?.email || 'Unassigned'}</span>
                      <span>Due date: {formatDueDateShort(selectedTask.dueDate || '')}</span>
                      <span>Updated: {formatTime(selectedTask.updatedAt)}</span>
                      {selectedTask.completedAt && <span>Completed: {formatTime(selectedTask.completedAt)}</span>}
                    </div>
                  </div>

                  <div className="workhub-detail-card">
                    <h3>Checklist</h3>
                    {(() => {
                      const checklist = buildChecklist(selectedTask)
                      const checklistDoneCount = checklist.filter((item) => item.completed).length
                      return (
                        <div className="workhub-checklist-items">
                          {checklist.length === 0 ? (
                            <div className="workhub-empty-state">No checklist items yet.</div>
                          ) : (
                            checklist.map((item, index) => {
                              const detailKey = getChecklistDetailKey(selectedTask.id, item.id)
                              const detailsExpanded = expandedChecklistDetailKeys.includes(detailKey)
                              return (
                                <div key={item.id} className="workhub-checklist-item-wrap">
                                  <div className={`workhub-checklist-item ${index % 2 === 0 ? 'even' : 'odd'}`}>
                                    <div className="workhub-checklist-left">
                                      <div className="workhub-checklist-item-main">
                                        <input
                                          type="checkbox"
                                          checked={item.completed}
                                          onChange={(event) => handleChecklistItemToggle(selectedTask, item.id, event.target.checked)}
                                          onClick={(event) => event.stopPropagation()}
                                        />
                                        {editingChecklistScope === 'details' && editingChecklistTaskId === selectedTask.id && editingChecklistItemId === item.id ? (
                                          <input
                                            type="text"
                                            value={editingChecklistItemText}
                                            onChange={(event) => setEditingChecklistItemText(event.target.value)}
                                            onKeyDown={(event) => {
                                              event.stopPropagation()
                                              if (event.key === 'Enter') {
                                                event.preventDefault()
                                                handleChecklistItemEditSave(selectedTask, item.id)
                                              } else if (event.key === 'Escape') {
                                                event.preventDefault()
                                                handleChecklistItemEditCancel()
                                              }
                                            }}
                                            onBlur={() => handleChecklistItemEditSave(selectedTask, item.id)}
                                            className="workhub-checklist-edit-input"
                                            autoFocus
                                          />
                                        ) : (
                                          <span
                                            className={`workhub-checklist-item-text${item.completed ? ' is-checked' : ''}`}
                                            onDoubleClick={() => handleChecklistItemEditStart(selectedTask.id, item.id, item.text, 'details')}
                                          >
                                            {item.text}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    <div className="workhub-checklist-actions">
                                      <button
                                        type="button"
                                        className="workhub-checklist-expand"
                                        onClick={() => toggleChecklistItemDetails(selectedTask.id, item.id)}
                                        title="Checklist item details"
                                      >
                                        {detailsExpanded ? '▾' : '▸'}
                                      </button>
                                      <button
                                        type="button"
                                        className="workhub-checklist-edit"
                                        onClick={(event) => {
                                          event.stopPropagation()
                                          handleChecklistItemEditStart(selectedTask.id, item.id, item.text, 'details')
                                        }}
                                        title="Edit checklist item"
                                      >
                                        ✏️
                                      </button>
                                      <button
                                        type="button"
                                        className="workhub-checklist-remove"
                                        onClick={(event) => {
                                          event.stopPropagation()
                                          handleChecklistRemove(selectedTask, item.id)
                                        }}
                                        title="Delete checklist item"
                                      >
                                        🗑️
                                      </button>
                                    </div>
                                  </div>
                                  {detailsExpanded && (
                                    <div className="workhub-checklist-item-details">
                                      <label className="workhub-checklist-detail-field">
                                        <span>Details</span>
                                        <textarea
                                          value={checklistDetailsDrafts[detailKey] ?? (item.details || '')}
                                          onChange={(event) => setChecklistDetailsDrafts((current) => ({ ...current, [detailKey]: event.target.value }))}
                                          onBlur={() => handleChecklistItemDetailsSave(selectedTask, item.id)}
                                          placeholder="Add item details"
                                        />
                                      </label>

                                      <div className="workhub-checklist-url-row">
                                        <input
                                          type="url"
                                          value={checklistAttachmentDrafts[detailKey] || ''}
                                          onChange={(event) => setChecklistAttachmentDrafts((current) => ({ ...current, [detailKey]: event.target.value }))}
                                          placeholder="Attachment URL"
                                        />
                                        <button type="button" onClick={() => handleChecklistAttachmentAdd(selectedTask, item.id)}>Add URL</button>
                                        <label className="workhub-file-upload-btn">
                                          <input
                                            type="file"
                                            multiple
                                            onChange={(event) => {
                                              const files = Array.from(event.target.files || [])
                                              if (files.length === 0) return
                                              void handleChecklistAttachmentFileUpload(selectedTask, item.id, files)
                                              event.target.value = ''
                                            }}
                                            disabled={uploadingChecklistAttachmentKey === detailKey}
                                          />
                                          {uploadingChecklistAttachmentKey === detailKey ? 'Uploading…' : 'Upload'}
                                        </label>
                                      </div>
                                      {(item.attachments || []).length > 0 && (
                                        <div className={`workhub-checklist-url-list view-${attachmentViewMode}`}>
                                          {(item.attachments || []).map((url) => {
                                            const review = attachmentReviews[url]
                                            const reviewCount = (review?.notes.trim() ? 1 : 0)
                                              + (review?.comments.length || 0)
                                              + (review?.markers.length || 0)
                                              + (review?.modificationChecks.length || 0)
                                            return (
                                              <div key={url} className="workhub-checklist-url-item workhub-task-image-item">
                                                {isImageAttachmentUrl(url) ? (
                                                  <button type="button" className="workhub-attachment-preview-btn" onClick={() => openAttachmentLightbox(url)}>
                                                    <img src={url} alt="Checklist attachment preview" className="workhub-task-image-thumb" loading="lazy" />
                                                    <span>{url}</span>
                                                  </button>
                                                ) : (
                                                  <a href={url} target="_blank" rel="noreferrer" className="workhub-task-image-link">
                                                    <span className="workhub-task-attachment-icon">📎</span>
                                                    <span>{url}</span>
                                                  </a>
                                                )}
                                                {reviewCount > 0 && (
                                                  <span className="workhub-attachment-review-indicator" title={`${reviewCount} note${reviewCount === 1 ? '' : 's'} / annotations`}>
                                                    📝 {reviewCount}
                                                  </span>
                                                )}
                                                <button type="button" onClick={() => handleChecklistAttachmentRemove(selectedTask, item.id, url)}>✕</button>
                                              </div>
                                            )
                                          })}
                                        </div>
                                      )}

                                      <div className="workhub-checklist-url-row">
                                        <input
                                          type="url"
                                          value={checklistLinkDrafts[detailKey] || ''}
                                          onChange={(event) => setChecklistLinkDrafts((current) => ({ ...current, [detailKey]: event.target.value }))}
                                          placeholder="Link URL"
                                        />
                                        <button type="button" onClick={() => handleChecklistLinkAdd(selectedTask, item.id)}>Add link</button>
                                      </div>
                                      {(item.links || []).length > 0 && (
                                        <div className="workhub-checklist-url-list">
                                          {(item.links || []).map((link) => (
                                            <div key={link} className="workhub-checklist-url-item">
                                              <a href={link} target="_blank" rel="noreferrer">{link}</a>
                                              <button type="button" onClick={() => handleChecklistLinkRemove(selectedTask, item.id, link)}>✕</button>
                                            </div>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )
                            })
                          )}
                          {checklist.length > 0 && (
                            <div className="workhub-checklist-summary">
                              {checklistDoneCount}/{checklist.length} completed
                            </div>
                          )}
                        </div>
                      )
                    })()}
                    <div className="workhub-checklist-add">
                      <input
                        type="text"
                        value={taskChecklistDrafts[selectedTask.id] || ''}
                        placeholder="Add checklist item"
                        onChange={(event) => setTaskChecklistDrafts((current) => ({ ...current, [selectedTask.id]: event.target.value }))}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') {
                            event.preventDefault()
                            handleChecklistAdd(selectedTask)
                          }
                        }}
                      />
                      <button type="button" onClick={() => handleChecklistAdd(selectedTask)} disabled={!taskChecklistDrafts[selectedTask.id]?.trim() || busyKey === 'task'}>
                        Add
                      </button>
                    </div>
                  </div>

                  <div className="workhub-detail-card">
                    <h3>Discussion</h3>
                    <div className="workhub-comment-list">
                      {comments.map((item) => (
                        <div key={item.id} className="workhub-comment-item">
                          <strong>{memberNameByUid[item.authorUid] || item.authorUid}</strong>
                          <p>{item.body}</p>
                          <span>{formatTime(item.createdAt)}</span>
                        </div>
                      ))}
                      {comments.length === 0 && <div className="workhub-empty-state">No comments yet.</div>}
                    </div>
                    <div className="workhub-mini-form">
                      <textarea value={commentText} onChange={(event) => setCommentText(event.target.value)} placeholder="Add a comment..." />
                      <button onClick={handleAddComment} disabled={busyKey === 'comment'}>
                        {busyKey === 'comment' ? 'Sending...' : 'Send'}
                      </button>
                    </div>
                  </div>
                </>
              ) : selectedProject ? (
                <div className="workhub-detail-card">
                  <div className="workhub-task-row-title detail-title">
                    <span className="workhub-project-dot" style={{ background: selectedProjectColorDraft }} />
                    <h3>{canEditSelectedProject ? 'Project properties' : 'Project details'}</h3>
                  </div>

                  <div className="workhub-detail-grid workhub-project-detail-grid">
                    <label>
                      <span>Project name</span>
                      <input
                        value={selectedProjectNameDraft}
                        onChange={(event) => setSelectedProjectNameDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key !== 'Enter') return
                          event.preventDefault()
                          if (!canEditSelectedProject) return
                          void handleSaveSelectedProjectDetails()
                        }}
                        placeholder="Project name"
                        disabled={!canEditSelectedProject}
                      />
                    </label>
                    <label>
                      <span>Type</span>
                      <select
                        value={selectedProjectTypeDraft}
                        onChange={(event) => setSelectedProjectTypeDraft(event.target.value as WorkhubProjectType)}
                        disabled={!canEditSelectedProject}
                      >
                        {PROJECT_TYPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </label>
                    <div className="workhub-field-grid two compact workhub-project-detail-date-grid workhub-span-2">
                      <label>
                        <span>Start date</span>
                        <input
                          type="date"
                          value={selectedProjectStartDateDraft}
                          onChange={(event) => setSelectedProjectStartDateDraft(event.target.value)}
                          disabled={!canEditSelectedProject}
                        />
                      </label>
                      <label>
                        <span>Deadline</span>
                        <input
                          type="date"
                          value={selectedProjectDeadlineDraft}
                          onChange={(event) => setSelectedProjectDeadlineDraft(event.target.value)}
                          disabled={!canEditSelectedProject}
                        />
                      </label>
                      {selectedProjectTypeDraft === 'tender' && (
                        <label className="workhub-span-2">
                          <span>Submission time</span>
                          <input
                            type="time"
                            value={selectedProjectSubmissionTimeDraft}
                            onChange={(event) => setSelectedProjectSubmissionTimeDraft(event.target.value)}
                            disabled={!canEditSelectedProject}
                          />
                        </label>
                      )}
                    </div>
                    <label className="workhub-span-2">
                      <span>Description</span>
                      <textarea
                        value={selectedProjectDescriptionDraft}
                        onChange={(event) => setSelectedProjectDescriptionDraft(event.target.value)}
                        onBlur={() => { void handleSelectedProjectDescriptionBlur() }}
                        rows={4}
                        placeholder="Project description"
                        disabled={!canEditSelectedProject}
                      />
                    </label>
                    <label>
                      <span>Color</span>
                      <div className="workhub-project-color-select">
                        <button
                          type="button"
                          className={`workhub-project-color-select-btn${selectedProjectColorMenuOpen ? ' is-open' : ''}`}
                          onClick={() => setSelectedProjectColorMenuOpen((current) => !current)}
                          disabled={!canEditSelectedProject}
                        >
                          <span className="workhub-project-color-swatch" style={{ background: selectedProjectColorDraft }} />
                          <span>Selected color</span>
                          <span className="workhub-project-color-caret" aria-hidden="true">{selectedProjectColorMenuOpen ? '▴' : '▾'}</span>
                        </button>
                        {selectedProjectColorMenuOpen && (
                          <div className="workhub-project-color-select-menu">
                            {PROJECT_COLORS.map((color, index) => (
                              <button
                                key={color}
                                type="button"
                                className={`workhub-project-color-option${selectedProjectColorDraft === color ? ' is-active' : ''}`}
                                onClick={() => { void handleSelectedProjectColorSelect(color) }}
                              >
                                <span className="workhub-project-color-swatch" style={{ background: color }} />
                                <span>{`Color ${index + 1}`}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </label>
                  </div>

                  {canEditSelectedProject ? (
                    <div className="workhub-project-detail-actions">
                      <button type="button" className="workhub-ghost-btn" onClick={() => setProjectAccessDialogId(selectedProject.id)}>
                        Open advanced settings
                      </button>
                      <button
                        type="button"
                        className="workhub-primary-btn"
                        disabled={!selectedProjectDetailsChanged || busyKey === `project-detail:${selectedProject.id}`}
                        onClick={() => { void handleSaveSelectedProjectDetails() }}
                      >
                        {busyKey === `project-detail:${selectedProject.id}` ? 'Saving…' : 'Save project'}
                      </button>
                    </div>
                  ) : (
                    <div className="workhub-project-detail-readonly-note">Read-only: contact a workspace admin to edit this project.</div>
                  )}
                </div>
              ) : (
                <div className="workhub-detail-card">
                  <div className="workhub-empty-state">Select a project or task to view details.</div>
                </div>
              )}
            </aside>
          </main>
        )}

        {activeSection === 'home' && (
          <main className="workhub-section-stack">
            <section className="workhub-panel">
              <div className="workhub-panel-head">
                <div>
                  <h2>Home</h2>
                  <p>Minimal landing page. Use Workspace overview for the full operational dashboard.</p>
                </div>
              </div>
              <div className="workhub-summary-strip">
                <div className="workhub-summary-tile"><strong>{selectedWorkspace?.name || 'No workspace selected'}</strong><span>Current workspace</span></div>
                <div className="workhub-summary-tile"><strong>{selectedProject ? selectedProject.name : 'All projects'}</strong><span>Current scope</span></div>
                <div className="workhub-summary-tile"><strong>{taskCounts.total}</strong><span>Tasks in scope</span></div>
                <div className="workhub-summary-tile"><strong>{tasksByAssignee.length}</strong><span>Members with assigned tasks</span></div>
              </div>
              <div className="workhub-home-actions">
                <button className="workhub-primary-btn" onClick={openWorkspaceOverview} disabled={!selectedWorkspaceId}>Open workspace overview</button>
                <button className="workhub-ghost-btn" onClick={() => setActiveSection('tasks')} disabled={!selectedWorkspaceId}>Go to tasks</button>
                <button className="workhub-ghost-btn" onClick={() => setActiveSection('workspaces')}>Manage workspaces</button>
              </div>
            </section>
          </main>
        )}

          <div className="workhub-floating-add-wrap">
            {quickAddOpen && (
              <div className="workhub-floating-add-menu">
                <button
                  className="workhub-floating-add-option"
                  disabled={!selectedWorkspaceId}
                  onClick={() => openCreateTaskDialog(selectedProjectId !== 'all' ? selectedProjectId : '')}
                >
                  + Task
                </button>
                <button
                  className="workhub-floating-add-option"
                  disabled={!selectedWorkspaceId}
                  onClick={() => openCreateProjectDialog(selectedProjectId !== 'all' ? selectedProjectId : '')}
                >
                  + Project
                </button>
              </div>
            )}
            <button
              className="workhub-floating-add-btn"
              onClick={() => setQuickAddOpen((current) => !current)}
              aria-label="Quick add"
              title="Quick add"
            >
              +
            </button>
          </div>

          </section>
        </div>

        <CreateDialog
          isOpen={createDialogOpen}
          createDialogType={createDialogType}
          onClose={() => setCreateDialogOpen(false)}
          onDialogTypeChange={setCreateDialogType}
          workspaceName={workspaceName}
          workspaceDescription={workspaceDescription}
          workspaceStatusTemplate={workspaceStatusTemplate}
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
          taskDueDate={taskDueDate}
          taskStatusOptions={workspaceTaskStatuses}
          projectColorOptions={PROJECT_COLORS}
          projectOptions={flatVisibleProjectOptions}
          approvedMembers={approvedMembers}
          taskAssignableMembers={taskDialogAssignableMembers}
          busyKey={busyKey}
          canCreateWorkspace={isPrivilegedMember}
          canCreateProject={!!selectedWorkspaceId}
          canCreateTask={!!selectedWorkspaceId}
          workspaceType={workspaceType}
          onWorkspaceTypeChange={setWorkspaceType}
          onWorkspaceStatusTemplateChange={setWorkspaceStatusTemplate}
          onWorkspaceNameChange={setWorkspaceName}
          onWorkspaceDescriptionChange={setWorkspaceDescription}
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
          onTaskDueDateChange={setTaskDueDate}
          onCreateWorkspace={() => { void handleCreateWorkspace() }}
          onCreateProject={() => { void handleCreateProject() }}
          onCreateProjectKeepOpen={() => { void handleCreateProject({ keepDialogOpen: true }) }}
          onCreateTask={() => { void handleCreateTask() }}
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
          onClose={() => setWorkspaceSettingsId('')}
          onSettingsNameChange={setWorkspaceSettingsName}
          onSettingsDescriptionChange={setWorkspaceSettingsDescription}
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
          workspaceType={selectedWorkspace?.type || 'technical'}
          position={actionMenuPosition}
          canManageProject={isPrivilegedMember}
          canCreateTopCategory={!!selectedWorkspaceId}
          onClose={closeActionMenu}
          onCreateWorkspace={() => { setCreateDialogType('workspace'); setCreateDialogOpen(true) }}
          onCreateTask={(projectId) => openCreateTaskDialog(projectId)}
          onCreateSubProject={(projectId) => openCreateProjectDialog(projectId)}
          onOpenSettings={(projectId) => setProjectAccessDialogId(projectId)}
        />

        <ProjectSettingsDialog
          project={selectedAccessProject}
          canDelete={selectedAccessProject?.workspaceId === selectedWorkspaceId}
          parentOptions={settingsParentOptions}
          clientOptions={clients}
          approvedMembers={approvedMembers}
          projectColors={PROJECT_COLORS}
          settingsName={settingsProjectName}
          settingsDescription={settingsProjectDescription}
          settingsColor={settingsProjectColor}
          settingsParentId={settingsProjectParentId}
          settingsDeadline={settingsProjectDeadline}
          settingsSubmissionTime={settingsProjectSubmissionTime}
          settingsType={settingsProjectType}
          settingsPriority={settingsProjectPriority}
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
                  <button className="workhub-primary-btn" disabled={busyKey === 'status'} onClick={() => { void handleSaveTaskStatuses() }}>
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

        {clientDeleteTarget && (
          <div className="workhub-modal-backdrop workhub-delete-prompt-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && busyKey !== `client:delete:${clientDeleteTarget.id}`) handleCancelClientDelete() }}>
            <div className="workhub-modal workhub-delete-prompt-modal" onMouseDown={(event) => event.stopPropagation()}>
              <div className="workhub-modal-head">
                <div>
                  <h2>Delete client</h2>
                  <p>This action is permanent. Type the exact client name to confirm.</p>
                </div>
                <button className="workhub-ghost-btn" disabled={busyKey === `client:delete:${clientDeleteTarget.id}`} onClick={handleCancelClientDelete}>✕</button>
              </div>
              <div className="workhub-modal-form">
                <label>
                  <span>Type client name: {clientDeleteTarget.name}</span>
                  <input
                    value={clientDeleteTypedName}
                    onChange={(event) => setClientDeleteTypedName(event.target.value)}
                    placeholder={clientDeleteTarget.name}
                    disabled={busyKey === `client:delete:${clientDeleteTarget.id}`}
                  />
                </label>
              </div>
              <div className="workhub-delete-prompt-actions">
                <button
                  type="button"
                  className="workhub-danger-btn"
                  disabled={clientDeleteTypedName.trim() !== clientDeleteTarget.name || busyKey === `client:delete:${clientDeleteTarget.id}`}
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
      <WorkhubStyles />
    </div>
  )
}

const QuickAddTaskRow = memo(function QuickAddTaskRow(props: {
  status: WorkhubTaskStatusConfig
  assignableMembersByProjectId: Record<string, WorkhubMember[]>
  workspaceAssignableMembers: WorkhubMember[]
  memberByUid: Record<string, WorkhubMember>
  flatVisibleProjectOptions: Array<{ id: string; name: string; depth: number }>
  defaultProjectId: string
  selectedProjectId: string
  selectedTaskStatusTab: 'all' | WorkhubTaskStatus
  currentUid: string
  activeDragTaskId: string
  activeDragStatusId: string
  dropTargetKey: string
  onDragOverEnd: (statusId: string) => void
  onDropToEnd: (statusId: string) => void
  onCommit: (input: QuickAddTaskSubmitInput) => Promise<boolean | undefined>
}) {
  const { status, assignableMembersByProjectId, workspaceAssignableMembers, memberByUid, flatVisibleProjectOptions, defaultProjectId, selectedProjectId, selectedTaskStatusTab, currentUid, activeDragTaskId, activeDragStatusId, dropTargetKey, onDragOverEnd, onDropToEnd, onCommit } = props
  const [title, setTitle] = useState('')
  const [assigneeUid, setAssigneeUid] = useState('')
  const [priority, setPriority] = useState<WorkhubTaskPriority>('medium')
  const [dueDate, setDueDate] = useState('')
  const [projectId, setProjectId] = useState('')
  const [assigneeMenuOpen, setAssigneeMenuOpen] = useState(false)
  const [priorityMenuOpen, setPriorityMenuOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const rootRef = useRef<HTMLElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const showDetails = title.trim().length > 0
  const effectiveProjectId = projectId || (selectedProjectId !== 'all' ? selectedProjectId : defaultProjectId)
  const quickAddAssignableMembers = assignableMembersByProjectId[effectiveProjectId] || workspaceAssignableMembers
  const canAssignCurrentUser = quickAddAssignableMembers.some((member) => member.uid === currentUid)
  const fallbackAssigneeUid = canAssignCurrentUser ? (assigneeUid || currentUid || '') : (assigneeUid || quickAddAssignableMembers[0]?.uid || '')
  const quickAddAssigneeMember = memberByUid[fallbackAssigneeUid]
  const quickAddAssigneeLabel = quickAddAssigneeMember?.displayName || quickAddAssigneeMember?.email || 'Me'

  useEffect(() => {
    if (selectedTaskStatusTab === status.id) {
      inputRef.current?.focus()
    }
  }, [selectedTaskStatusTab, status.id])

  useEffect(() => {
    if (quickAddAssignableMembers.length === 0) {
      if (assigneeUid) setAssigneeUid('')
      return
    }
    if (assigneeUid && quickAddAssignableMembers.some((member) => member.uid === assigneeUid)) return
    if (canAssignCurrentUser) {
      if (assigneeUid !== '') setAssigneeUid('')
      return
    }
    const fallbackUid = quickAddAssignableMembers[0]?.uid || ''
    if (fallbackUid !== assigneeUid) {
      setAssigneeUid(fallbackUid)
    }
  }, [assigneeUid, canAssignCurrentUser, quickAddAssignableMembers])

  const resetDraft = () => {
    setTitle('')
    setAssigneeUid('')
    setPriority('medium')
    setDueDate('')
    setProjectId('')
    setAssigneeMenuOpen(false)
    setPriorityMenuOpen(false)
  }

  const commitWithTitle = async (rawTitle: string) => {
    const trimmedTitle = normalizeTaskTitle(rawTitle)
    if (!trimmedTitle || submitting) return false
    setSubmitting(true)
    const created = await onCommit({
      statusId: status.id,
      title: trimmedTitle,
      assigneeUid,
      priority,
      dueDate,
      projectId,
    })
    setSubmitting(false)
    if (created) resetDraft()
    return Boolean(created)
  }

  const commitDraft = async () => commitWithTitle(title)

  return (
    <article
      ref={rootRef}
      className={`workhub-task-row workhub-task-row-draft${showDetails ? ' is-selected' : ''}${dropTargetKey === `end:${status.id}` ? ' is-drop-target' : ''}`}
      onDragOver={(event) => {
        if (!activeDragTaskId || activeDragStatusId !== status.id) return
        event.preventDefault()
        onDragOverEnd(status.id)
      }}
      onDrop={(event) => {
        if (!activeDragTaskId || activeDragStatusId !== status.id) return
        event.preventDefault()
        onDropToEnd(status.id)
      }}
      onBlurCapture={() => {
        window.setTimeout(() => {
          const active = document.activeElement
          if (rootRef.current?.contains(active)) return
          if (title.trim()) {
            void commitDraft()
          } else {
            setAssigneeMenuOpen(false)
            setPriorityMenuOpen(false)
          }
        }, 0)
      }}
    >
      <div className="workhub-task-row-main">
        <div className="workhub-task-row-grid">
          <div className="workhub-task-col details">
            <span className="workhub-task-drag-handle workhub-task-drag-handle-placeholder" aria-hidden="true">⋮⋮</span>
            <input type="checkbox" disabled />
            <div className="workhub-task-row-title">
              <input
                ref={inputRef}
                type="text"
                className="workhub-task-title-edit-input workhub-quick-add-title-input"
                placeholder="+ Add task…"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                onPaste={(event) => {
                  const pastedText = event.clipboardData.getData('text')
                  if (!/\r?\n/.test(pastedText)) return
                  event.preventDefault()
                  void commitWithTitle(pastedText)
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    void commitDraft()
                  }
                  if (event.key === 'Escape') {
                    event.preventDefault()
                    resetDraft()
                    inputRef.current?.blur()
                  }
                }}
              />
            </div>
          </div>
          <div className="workhub-task-col status">
            {showDetails ? (
              <button
                type="button"
                className="workhub-task-status-btn workhub-task-status-btn-static"
                style={{ '--status-color': status.color } as React.CSSProperties}
                tabIndex={-1}
                aria-label={`Status: ${status.label}`}
              >
                <span className="status-dot" />
              </button>
            ) : <span className="workhub-quick-add-placeholder" />}
          </div>
          <div className="workhub-task-col assignee">
            {showDetails ? (
              <div className="workhub-quick-add-menu-wrap">
                <button
                  type="button"
                  className="workhub-quick-add-trigger workhub-quick-add-assignee-trigger"
                  title={quickAddAssigneeLabel}
                  onClick={() => {
                    setAssigneeMenuOpen((current) => !current)
                    setPriorityMenuOpen(false)
                  }}
                >
                  <span className="workhub-assignee-badge" title={quickAddAssigneeLabel}>
                    {quickAddAssigneeMember?.photoURL
                      ? <img src={quickAddAssigneeMember.photoURL} alt={quickAddAssigneeLabel} />
                      : <span className="workhub-assignee-fallback">👤</span>}
                  </span>
                </button>
                {assigneeMenuOpen && (
                  <div className="workhub-detail-icon-menu workhub-quick-add-menu">
                    {canAssignCurrentUser && (
                      <button
                        type="button"
                        className={!assigneeUid ? 'is-active' : ''}
                        onClick={() => {
                          setAssigneeUid('')
                          setAssigneeMenuOpen(false)
                        }}
                      >
                        <span className="workhub-assignee-fallback">👤</span>
                        <span>Me</span>
                      </button>
                    )}
                    {quickAddAssignableMembers.map((member) => (
                      <button
                        key={member.uid}
                        type="button"
                        className={assigneeUid === member.uid ? 'is-active' : ''}
                        onClick={() => {
                          setAssigneeUid(member.uid)
                          setAssigneeMenuOpen(false)
                        }}
                      >
                        <span className="workhub-assignee-badge">
                          {member.photoURL
                            ? <img src={member.photoURL} alt={member.displayName || member.email || member.uid} />
                            : <span className="workhub-assignee-fallback">👤</span>}
                        </span>
                        <span>{member.displayName || member.email || member.uid}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : <span className="workhub-quick-add-placeholder" />}
          </div>
          <div className="workhub-task-col due">
            {showDetails ? (
              <input className="workhub-quick-add-date" type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
            ) : <span className="workhub-quick-add-placeholder" />}
          </div>
          <div className="workhub-task-col priority">
            {showDetails ? (
              <div className="workhub-quick-add-menu-wrap">
                <button
                  type="button"
                  className={`workhub-quick-add-trigger workhub-priority-indicator priority-${priority}`}
                  title={`Priority: ${PRIORITY_LABELS[priority]}`}
                  onClick={() => {
                    setPriorityMenuOpen((current) => !current)
                    setAssigneeMenuOpen(false)
                  }}
                >
                  {getPriorityIcon(priority)}
                </button>
                {priorityMenuOpen && (
                  <div className="workhub-task-priority-menu workhub-quick-add-menu">
                    {(Object.keys(PRIORITY_LABELS) as WorkhubTaskPriority[]).map((priorityValue) => (
                      <button
                        key={priorityValue}
                        type="button"
                        className={priority === priorityValue ? 'is-active' : ''}
                        onClick={() => {
                          setPriority(priorityValue)
                          setPriorityMenuOpen(false)
                        }}
                      >
                        <span className={`workhub-priority-indicator priority-${priorityValue}`}>{getPriorityIcon(priorityValue)}</span>
                        <span>{PRIORITY_LABELS[priorityValue]}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : <span className="workhub-quick-add-placeholder" />}
          </div>
          <div className="workhub-task-col checklist-inline">
            {showDetails && selectedProjectId === 'all' && flatVisibleProjectOptions.length > 1 ? (
              <select className="workhub-quick-add-select workhub-quick-add-project-select" value={projectId} onChange={(event) => setProjectId(event.target.value)}>
                <option value="">Auto</option>
                {flatVisibleProjectOptions.map((project) => (
                  <option key={project.id} value={project.id}>{project.name}</option>
                ))}
              </select>
            ) : <span className="workhub-quick-add-inline-note">{showDetails ? 'List later' : ''}</span>}
          </div>
          <div className="workhub-task-col actions-inline">
            {showDetails ? (
              <button type="button" className="workhub-quick-add-confirm" disabled={submitting} onClick={() => { void commitDraft() }}>
                {submitting ? '...' : 'Add'}
              </button>
            ) : <span className="workhub-quick-add-placeholder" />}
          </div>
        </div>
      </div>
    </article>
  )
})

function ProjectActionMenu(props: {
  projectId: string | null
    workspaceType: 'technical' | 'hr' | 'finance'
    position: { x: number; y: number }
    canManageProject: boolean
    canCreateTopCategory: boolean
    onClose: () => void
    onCreateWorkspace: () => void
    onCreateTask: (projectId: string) => void
    onCreateSubProject: (projectId: string) => void
    onOpenSettings: (projectId: string) => void
  }) {
    if (!props.projectId) return null

    const trFolder = props.workspaceType === 'hr' ? 'folder' : props.workspaceType === 'finance' ? 'ledger' : 'project'
    const trCat = props.workspaceType === 'hr' ? 'directory' : props.workspaceType === 'finance' ? 'main ledger' : 'category'
    const trTask = props.workspaceType === 'hr' ? 'objective' : props.workspaceType === 'finance' ? 'record' : 'task'

    if (props.projectId === '__workspace__') {
      return (
        <div className="workhub-modal-backdrop transparent" onClick={props.onClose}>
          <div
            className="workhub-action-menu"
            style={{ left: `${props.position.x}px`, top: `${props.position.y}px` }}
            onClick={(event) => event.stopPropagation()}
          >
            <button type="button" className="workhub-action-menu-item" onClick={() => { props.onClose(); props.onCreateWorkspace() }}>
              <span className="workhub-action-icon">🏢</span>
              <span>New workspace</span>
            </button>
            <button
              type="button"
              className="workhub-action-menu-item"
              disabled={!props.canCreateTopCategory}
              onClick={() => { props.onClose(); props.onCreateSubProject('') }}
            >
              <span className="workhub-action-icon">▸</span>
              <span style={{ textTransform: 'capitalize' }}>Top {trCat}</span>
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="workhub-modal-backdrop transparent" onClick={props.onClose}>
        <div
          className="workhub-action-menu"
          style={{ left: `${props.position.x}px`, top: `${props.position.y}px` }}
          onClick={(event) => event.stopPropagation()}
        >
          <button type="button" className="workhub-action-menu-item" onClick={() => { props.onClose(); props.onCreateTask(props.projectId || '') }}>
            <span className="workhub-action-icon">✓</span>
            <span style={{ textTransform: 'capitalize' }}>New {trTask}</span>
          </button>
          <button type="button" className="workhub-action-menu-item" onClick={() => { props.onClose(); props.onCreateSubProject(props.projectId || '') }}>
            <span className="workhub-action-icon">▸</span>
            <span style={{ textTransform: 'capitalize' }}>New sub-{trFolder}</span>
          </button>
          {props.canManageProject && (
            <button type="button" className="workhub-action-menu-item" onClick={() => { props.onClose(); props.onOpenSettings(props.projectId || '') }}>
              <span className="workhub-action-icon">⚙</span>
              <span style={{ textTransform: 'capitalize' }}>{trFolder} settings</span>
            </button>
          )}
        </div>
      </div>
    )
  }

function ProjectSettingsDialog(props: {
  project: WorkhubProject | null
  canDelete: boolean
  parentOptions: Array<{ id: string; name: string; depth: number }>
  clientOptions: WorkhubClient[]
  approvedMembers: WorkhubMember[]
  projectColors: string[]
  settingsName: string
  settingsDescription: string
  settingsColor: string
  settingsParentId: string
  settingsDeadline: string
  settingsSubmissionTime: string
  settingsType: WorkhubProjectType
  settingsPriority: WorkhubProjectPriority
  settingsClientId: string
  settingsStorageMethod: 'firebase' | 'drive'
  accessVisibility: WorkhubVisibility
  accessMemberUids: string[]
  childCount: number
  taskCount: number
  busyKey: string
  onClose: () => void
  onNameChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onColorChange: (value: string) => void
  onParentChange: (value: string) => void
  onDeadlineChange: (value: string) => void
  onSubmissionTimeChange: (value: string) => void
  onTypeChange: (value: WorkhubProjectType) => void
  onPriorityChange: (value: WorkhubProjectPriority) => void
  onClientChange: (value: string) => void
  onCreateClientInline: (name: string) => Promise<string | null>
  onStorageMethodChange: (value: 'firebase' | 'drive') => void
  onVisibilityChange: (value: WorkhubVisibility) => void
  onToggleMember: (uid: string) => void
  onDelete: () => void
  onSave: () => void
  onEnsureDriveFolder?: () => void
}) {
  if (!props.project) return null
  const [deleteTypedName, setDeleteTypedName] = useState('')
  const [deletePhrase, setDeletePhrase] = useState('')
  const [deleteAcknowledge, setDeleteAcknowledge] = useState(false)
  const [quickClientName, setQuickClientName] = useState('')
  const hasDeleteBlockers = props.childCount > 0 || props.taskCount > 0
  const canDeleteProject = props.canDelete
    && !hasDeleteBlockers
    && deleteTypedName.trim() === props.project.name
    && deletePhrase.trim() === 'DELETE PROJECT'
    && deleteAcknowledge

  useEffect(() => {
    setDeleteTypedName('')
    setDeletePhrase('')
    setDeleteAcknowledge(false)
    setQuickClientName('')
  }, [props.project?.id])

  return (
    <div className="workhub-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) props.onClose() }}>
      <div className="workhub-modal workhub-project-settings-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="workhub-modal-head workhub-project-settings-head">
          <div>
            <h2>Project settings</h2>
            <p>Rename, move, assign members, manage visibility, or delete {props.project.name}.</p>
          </div>
        </div>
        <div className="workhub-project-settings-body">
          <div className="workhub-psettings-left">
          <div className="workhub-settings-panel">
            <div className="workhub-settings-panel-head">General details</div>
            <div className="workhub-settings-group-body">
              <div className="workhub-field-grid two compact workhub-project-settings-grid">
                <label>
                  <span>Project name</span>
                  <input name="projectSettingsName" value={props.settingsName} onChange={(event) => props.onNameChange(event.target.value)} placeholder="Project name" />
                </label>
                <label>
                  <span>Parent project/category</span>
                  <select name="projectSettingsParent" value={props.settingsParentId} onChange={(event) => props.onParentChange(event.target.value)}>
                    <option value="">Top-level category</option>
                    {props.parentOptions.map((item) => <option key={item.id} value={item.id}>{`${'— '.repeat(item.depth)}${item.name}`}</option>)}
                  </select>
                </label>
                <label>
                  <span>Project type</span>
                  <select name="projectSettingsType" value={props.settingsType} onChange={(event) => props.onTypeChange(event.target.value as WorkhubProjectType)}>
                    {PROJECT_TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <label>
                  <span>Project priority</span>
                  <select name="projectSettingsPriority" value={props.settingsPriority} onChange={(event) => props.onPriorityChange(event.target.value as WorkhubProjectPriority)}>
                    {PROJECT_PRIORITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
                <label>
                  <span>{props.settingsType === 'tender' ? 'Submission date' : 'Final submission deadline'}</span>
                  <input type="date" value={props.settingsDeadline} onChange={(event) => props.onDeadlineChange(event.target.value)} />
                </label>
                {props.settingsType === 'tender' ? (
                  <label>
                    <span>Submission time</span>
                    <input type="time" value={props.settingsSubmissionTime} onChange={(event) => props.onSubmissionTimeChange(event.target.value)} />
                  </label>
                ) : (
                  <label>
                    <span>Submission time</span>
                    <input type="time" value="" disabled />
                  </label>
                )}
                <label>
                  <span>Client</span>
                  <select name="projectSettingsClient" value={props.settingsClientId} onChange={(event) => props.onClientChange(event.target.value)}>
                    <option value="">No client assigned</option>
                    {props.clientOptions.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
                  </select>
                </label>
                <label>
                  <span>Storage Method <small style={{ fontWeight: 'normal', color: 'var(--wh-text-secondary)' }}>(For attachments)</small></span>
                  <select name="projectSettingsStorageMethod" value={props.settingsStorageMethod} onChange={(event) => props.onStorageMethodChange(event.target.value as 'firebase' | 'drive')}>
                    <option value="firebase">Firebase Storage (Recommended)</option>
                    <option value="drive">Google Drive</option>
                  </select>
                </label>
              </div>
              <div className="workhub-inline-row workhub-client-quick-add">
                <input
                  name="projectSettingsQuickClient"
                  value={quickClientName}
                  onChange={(event) => setQuickClientName(event.target.value)}
                  placeholder="Client not listed? Add new client"
                />
                <button
                  type="button"
                  className="workhub-ghost-btn"
                  disabled={!quickClientName.trim() || props.busyKey === 'client:create'}
                  onClick={() => {
                    void props.onCreateClientInline(quickClientName).then((clientId) => {
                      if (!clientId) return
                      props.onClientChange(clientId)
                      setQuickClientName('')
                    })
                  }}
                >
                  {props.busyKey === 'client:create' ? 'Adding…' : 'Add client'}
                </button>
              </div>
              <label>
                <span>Description</span>
                <textarea name="projectSettingsDescription" value={props.settingsDescription} onChange={(event) => props.onDescriptionChange(event.target.value)} rows={3} placeholder="Project description" />
              </label>
              <label>
                <span>Color</span>
                <div className="workhub-inline-row workhub-project-settings-color-row">
                  <input name="projectSettingsColor" value={props.settingsColor} onChange={(event) => props.onColorChange(event.target.value)} placeholder="#6d5efc" />
                  <div className="workhub-color-pills">
                    {props.projectColors.map((color) => (
                      <button key={color} type="button" className={`workhub-color-pill${props.settingsColor === color ? ' active' : ''}`} style={{ background: color }} onClick={() => props.onColorChange(color)} />
                    ))}
                  </div>
                </div>
              </label>
            </div>
          </div>
          </div>
          <div className="workhub-psettings-right">
          <div className="workhub-settings-panel">
            <div className="workhub-settings-panel-head">Access and visibility</div>
            <div className="workhub-settings-group-body">
              <div className="workhub-switcher compact-switcher">
                <button className={`workhub-switcher-btn${props.accessVisibility === 'workspace' ? ' is-active' : ''}`} onClick={() => props.onVisibilityChange('workspace')}>Visible to workspace</button>
                <button className={`workhub-switcher-btn${props.accessVisibility === 'restricted' ? ' is-active' : ''}`} onClick={() => props.onVisibilityChange('restricted')}>Restricted</button>
              </div>
              {props.accessVisibility === 'restricted' && (
                <div className="workhub-member-picker">
                  {props.approvedMembers.map((item) => {
                    const checked = props.accessMemberUids.includes(item.uid)
                    return (
                      <button
                        key={item.uid}
                        type="button"
                        className={`workhub-member-chip${checked ? ' is-selected' : ''}`}
                        onClick={() => props.onToggleMember(item.uid)}
                      >
                        {item.displayName || item.email}
                      </button>
                    )
                  })}
                </div>
              )}
              <div className="workhub-project-settings-meta">
                <div className="workhub-meta-line">
                  {props.childCount} child project{props.childCount === 1 ? '' : 's'} · {props.taskCount} task{props.taskCount === 1 ? '' : 's'}
                </div>
                {!props.project.driveFolderId && props.onEnsureDriveFolder && (
                  <button
                    type="button"
                    className="workhub-ghost-btn"
                    onClick={props.onEnsureDriveFolder}
                    disabled={props.busyKey === `drive:${props.project.id}`}
                  >
                    {props.busyKey === `drive:${props.project.id}` ? 'Creating...' : '+ Create Drive folder'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {props.canDelete && (
            <details className="workhub-collapsible-danger">
            <summary>Danger zone</summary>
            <div className="workhub-danger-zone">
              <p>Deleting this project is irreversible. Complete the confirmation fields below to enable deletion.</p>
              {hasDeleteBlockers && (
                <div className="workhub-badge is-danger" style={{ width: 'fit-content' }}>
                  Move or delete child projects and tasks first.
                </div>
              )}
              <label>
                <span>Type project name exactly: {props.project.name}</span>
                <input
                  name="projectDeleteTypedName"
                  value={deleteTypedName}
                  onChange={(event) => setDeleteTypedName(event.target.value)}
                  placeholder={props.project.name}
                />
              </label>
              <label>
                <span>Type DELETE PROJECT</span>
                <input
                  name="projectDeletePhrase"
                  value={deletePhrase}
                  onChange={(event) => setDeletePhrase(event.target.value)}
                  placeholder="DELETE PROJECT"
                />
              </label>
              <label className="workhub-checkline">
                <input
                  name="projectDeleteAcknowledge"
                  type="checkbox"
                  checked={deleteAcknowledge}
                  onChange={(event) => setDeleteAcknowledge(event.target.checked)}
                />
                <span>I understand this permanently removes the project.</span>
              </label>
              <button
                className="workhub-danger-btn"
                disabled={!canDeleteProject || props.busyKey === `delete:${props.project.id}`}
                onClick={props.onDelete}
              >
                {props.busyKey === `delete:${props.project.id}` ? 'Deleting…' : 'Delete project forever'}
              </button>
            </div>
          </details>
          )}
          </div>
        </div>

        <div className="workhub-project-settings-sticky-actions">
          <button className="workhub-ghost-btn" onClick={props.onClose}>Close</button>
          <button className="workhub-primary-btn" disabled={props.busyKey === `access:${props.project.id}`} onClick={props.onSave}>
            {props.busyKey === `access:${props.project.id}` ? 'Saving…' : 'Save settings'}
          </button>
        </div>
      </div>
    </div>
  )
}

function CreateDialog(props: {
  isOpen: boolean
  createDialogType: 'workspace' | 'project' | 'task'
  onClose: () => void
  onDialogTypeChange: (value: 'workspace' | 'project' | 'task') => void
  workspaceName: string
  workspaceDescription: string
  workspaceType: 'technical' | 'hr' | 'finance'
  workspaceStatusTemplate: WorkhubStatusTemplateId
  projectName: string
  projectParentId: string
  projectDescription: string
  projectColor: string
  projectStartDate: string
  projectDeadline: string
  projectSubmissionTime: string
  projectType: WorkhubProjectType
  projectPriority: WorkhubProjectPriority
  projectClientId: string
  clientOptions: WorkhubClient[]
  closeProjectAfterCreate: boolean
  projectStorageMethod: 'firebase' | 'drive'
  projectVisibility: WorkhubVisibility
  projectMemberUids: string[]
  taskTitle: string
  taskDescription: string
  taskStatus: WorkhubTaskStatus
  taskProjectId: string
  taskAssigneeUid: string
  taskPriority: WorkhubTaskPriority
  taskDueDate: string
  taskStatusOptions: WorkhubTaskStatusConfig[]
  projectColorOptions: string[]
  projectOptions: Array<{ id: string; name: string; depth: number }>
  approvedMembers: WorkhubMember[]
  taskAssignableMembers: WorkhubMember[]
  busyKey: string
  canCreateWorkspace: boolean
  canCreateProject: boolean
  canCreateTask: boolean
  onWorkspaceNameChange: (value: string) => void
  onWorkspaceDescriptionChange: (value: string) => void
  onWorkspaceTypeChange: (value: 'technical' | 'hr' | 'finance') => void
  onWorkspaceStatusTemplateChange: (value: WorkhubStatusTemplateId) => void
  onProjectNameChange: (value: string) => void
  onProjectParentIdChange: (value: string) => void
  onProjectDescriptionChange: (value: string) => void
  onProjectColorChange: (value: string) => void
  onProjectStartDateChange: (value: string) => void
  onProjectDeadlineChange: (value: string) => void
  onProjectSubmissionTimeChange: (value: string) => void
  onProjectTypeChange: (value: WorkhubProjectType) => void
  onProjectPriorityChange: (value: WorkhubProjectPriority) => void
  onProjectClientIdChange: (value: string) => void
  onCreateClientInline: (name: string) => Promise<string | null>
  onCloseProjectAfterCreateChange: (value: boolean) => void
  onProjectStorageMethodChange: (value: 'firebase' | 'drive') => void
  onProjectVisibilityChange: (value: WorkhubVisibility) => void
  onProjectMemberToggle: (uid: string) => void
  onTaskTitleChange: (value: string) => void
  onTaskDescriptionChange: (value: string) => void
  onTaskStatusChange: (value: WorkhubTaskStatus) => void
  onTaskProjectIdChange: (value: string) => void
  onTaskAssigneeChange: (value: string) => void
  onTaskPriorityChange: (value: WorkhubTaskPriority) => void
  onTaskDueDateChange: (value: string) => void
  onCreateWorkspace: () => void
  onCreateProject: () => void
  onCreateProjectKeepOpen: () => void
  onCreateTask: () => void
}) {
  const workspaceTaskStatuses = props.taskStatusOptions
  const statusLabels = Object.fromEntries(workspaceTaskStatuses.map((s) => [s.id, s.label])) as Record<WorkhubTaskStatus, string>
  const [projectAdvancedOpen, setProjectAdvancedOpen] = useState(false)
  const [taskAdvancedOpen, setTaskAdvancedOpen] = useState(false)
  const [quickClientName, setQuickClientName] = useState('')
  if (!props.isOpen) return null

  return (
    <div className="workhub-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) props.onClose() }}>
      <div className="workhub-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="workhub-modal-head">
          <div>
            <h2>Create</h2>
            <p>Keep creation compact and out of the main page.</p>
          </div>
          <button className="workhub-ghost-btn" onClick={props.onClose}>Close</button>
        </div>
        <div className="workhub-switcher">
          {(['workspace', 'project', 'task'] as const).map((type) => (
            <button key={type} className={`workhub-switcher-btn${props.createDialogType === type ? ' is-active' : ''}`} onClick={() => props.onDialogTypeChange(type)}>
              {type === 'workspace' ? '🏢 Workspace' : type === 'project' ? '📁 Project' : '✅ Task'}
            </button>
          ))}
        </div>

        {props.createDialogType === 'workspace' && (
          <form
            className="workhub-modal-form"
            onSubmit={(event) => {
              event.preventDefault()
              props.onCreateWorkspace()
            }}
          >
            <label>
              <span>Workspace name</span>
              <input name="workspaceName" value={props.workspaceName} onChange={(event) => props.onWorkspaceNameChange(event.target.value)} placeholder="Operations" />
            </label>
            <label className="workhub-toolbar-select" style={{ marginBottom: '12px' }}>
              <span>Workspace Type</span>
              <select name="workspaceType" value={props.workspaceType} onChange={(e) => props.onWorkspaceTypeChange(e.target.value as any)} style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }}>
                <option value="technical">💻 Technical / Projects</option>
                <option value="hr">👥 HR / Management</option>
                <option value="finance">💰 Finance Hub</option>
              </select>
            </label>
            <label className="workhub-toolbar-select" style={{ marginBottom: '12px' }}>
              <span>Task status template</span>
              <select
                name="workspaceStatusTemplate"
                value={props.workspaceStatusTemplate}
                onChange={(event) => props.onWorkspaceStatusTemplateChange(event.target.value as WorkhubStatusTemplateId)}
                style={{ width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid var(--border)' }}
              >
                {WORKSPACE_STATUS_TEMPLATE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              <small style={{ color: 'var(--wh-text-secondary)' }}>
                {WORKSPACE_STATUS_TEMPLATE_OPTIONS.find((option) => option.value === props.workspaceStatusTemplate)?.description || 'Select a status workflow template.'}
              </small>
            </label>
            <label>
              <span>Description</span>
              <textarea name="workspaceDescription" value={props.workspaceDescription} onChange={(event) => props.onWorkspaceDescriptionChange(event.target.value)} placeholder="What does this workspace cover?" rows={4} />
            </label>
            <button type="submit" className="workhub-primary-btn" disabled={props.busyKey === 'workspace' || !props.canCreateWorkspace}>
              {props.busyKey === 'workspace' ? 'Creating…' : 'Create workspace'}
            </button>
          </form>
        )}

        {props.createDialogType === 'project' && (
          <form
            className="workhub-modal-form compact-create"
            onSubmit={(event) => {
              event.preventDefault()
              props.onCreateProject()
            }}
          >
            <label className="workhub-icon-field">
              <span>📁 Project name</span>
              <input name="projectName" value={props.projectName} onChange={(event) => props.onProjectNameChange(event.target.value)} placeholder="Release project" />
            </label>
            <label className="workhub-icon-field">
              <span>🧭 Parent project/category</span>
              <select name="projectParent" value={props.projectParentId} onChange={(event) => props.onProjectParentIdChange(event.target.value)}>
                <option value="">Top-level category</option>
                {props.projectOptions.map((item) => <option key={item.id} value={item.id}>{`${'— '.repeat(item.depth)}${item.name}`}</option>)}
              </select>
            </label>
            <label className="workhub-icon-field">
              <span>🏷️ Project type</span>
              <select
                name="projectType"
                value={props.projectType}
                onChange={(event) => props.onProjectTypeChange(event.target.value as WorkhubProjectType)}
              >
                {PROJECT_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <div className="workhub-field-grid two compact workhub-create-date-grid">
              <label className="workhub-icon-field">
                <span>🗓️ Project starts</span>
                <input
                  name="projectStartDate"
                  type="date"
                  value={props.projectStartDate}
                  onChange={(event) => props.onProjectStartDateChange(event.target.value)}
                />
              </label>
              <label className="workhub-icon-field">
                <span>{props.projectType === 'tender' ? '📅 Submission date' : '🏁 Final submission deadline'}</span>
                <input
                  name="projectDeadline"
                  type="date"
                  value={props.projectDeadline}
                  onChange={(event) => props.onProjectDeadlineChange(event.target.value)}
                />
              </label>
            </div>
            {props.projectType === 'tender' && (
              <label className="workhub-icon-field">
                <span>⏰ Submission time</span>
                <input
                  name="projectSubmissionTime"
                  type="time"
                  value={props.projectSubmissionTime}
                  onChange={(event) => props.onProjectSubmissionTimeChange(event.target.value)}
                />
              </label>
            )}
            <label className="workhub-icon-field">
              <span>🚩 Project priority</span>
              <select
                name="projectPriority"
                value={props.projectPriority}
                onChange={(event) => props.onProjectPriorityChange(event.target.value as WorkhubProjectPriority)}
              >
                {PROJECT_PRIORITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className="workhub-icon-field">
              <span>🏢 Client</span>
              <select
                name="projectClient"
                value={props.projectClientId}
                onChange={(event) => props.onProjectClientIdChange(event.target.value)}
              >
                <option value="">No client assigned</option>
                {props.clientOptions.map((client) => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </select>
            </label>
            <div className="workhub-inline-row workhub-client-quick-add">
              <input
                name="quickClientName"
                value={quickClientName}
                onChange={(event) => setQuickClientName(event.target.value)}
                placeholder="Client not listed? Add new client"
              />
              <button
                type="button"
                className="workhub-ghost-btn"
                disabled={!quickClientName.trim() || props.busyKey === 'client:create'}
                onClick={() => {
                  void props.onCreateClientInline(quickClientName).then((clientId) => {
                    if (!clientId) return
                    props.onProjectClientIdChange(clientId)
                    setQuickClientName('')
                  })
                }}
              >
                {props.busyKey === 'client:create' ? 'Adding…' : 'Add client'}
              </button>
            </div>
            <button type="button" className="workhub-collapse-toggle" onClick={() => setProjectAdvancedOpen((current) => !current)}>
              {projectAdvancedOpen ? '▾ Hide advanced' : '▸ Show advanced'}
            </button>
            {projectAdvancedOpen && (
              <div className="workhub-collapsible-panel">
                <label className="workhub-icon-field">
                  <span>📝 Description</span>
                  <textarea name="projectDescription" value={props.projectDescription} onChange={(event) => props.onProjectDescriptionChange(event.target.value)} placeholder="Project brief" rows={3} />
                </label>
                <label className="workhub-icon-field">
                  <span>💾 Storage Method <small style={{ fontWeight: 'normal', color: 'var(--wh-text-secondary)' }}>(For attachments)</small></span>
                  <select name="projectStorageMethod" value={props.projectStorageMethod} onChange={(event) => props.onProjectStorageMethodChange(event.target.value as 'firebase' | 'drive')}>
                    <option value="firebase">Firebase Storage (Recommended)</option>
                    <option value="drive">Google Drive</option>
                  </select>
                </label>
                <label className="workhub-icon-field">
                  <span>🎨 Color</span>
                  <div className="workhub-inline-row">
                    <input name="projectColor" value={props.projectColor} onChange={(event) => props.onProjectColorChange(event.target.value)} placeholder="#6d5efc" />
                    <div className="workhub-color-pills">
                      {props.projectColorOptions.map((color) => (
                        <button key={color} type="button" className={`workhub-color-pill${props.projectColor === color ? ' active' : ''}`} style={{ background: color }} onClick={() => props.onProjectColorChange(color)} />
                      ))}
                    </div>
                  </div>
                </label>
                <div className="workhub-switcher compact-switcher">
                  <button className={`workhub-switcher-btn${props.projectVisibility === 'workspace' ? ' is-active' : ''}`} onClick={() => props.onProjectVisibilityChange('workspace')}>🌍 Visible to workspace</button>
                  <button className={`workhub-switcher-btn${props.projectVisibility === 'restricted' ? ' is-active' : ''}`} onClick={() => props.onProjectVisibilityChange('restricted')}>🔒 Restricted</button>
                </div>
                {props.projectVisibility === 'restricted' && (
                  <div className="workhub-member-picker">
                    {props.approvedMembers.map((item) => {
                      const checked = props.projectMemberUids.includes(item.uid)
                      return (
                        <button
                          key={item.uid}
                          type="button"
                          className={`workhub-member-chip${checked ? ' is-selected' : ''}`}
                          onClick={() => props.onProjectMemberToggle(item.uid)}
                        >
                          {item.displayName || item.email}
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
            <div className="workhub-create-actions">
              <label className="workhub-create-option-toggle">
                <input
                  type="checkbox"
                  checked={props.closeProjectAfterCreate}
                  onChange={(event) => props.onCloseProjectAfterCreateChange(event.target.checked)}
                />
                <span>Close after creation</span>
              </label>
              <div className="workhub-create-actions-group">
                <button type="button" className="workhub-ghost-btn" onClick={props.onClose}>Close</button>
                <button
                  type="button"
                  className="workhub-ghost-btn"
                  disabled={!props.canCreateProject || props.busyKey === 'project'}
                  onClick={props.onCreateProjectKeepOpen}
                >
                  {props.busyKey === 'project' ? 'Creating…' : 'Create and keep open'}
                </button>
                <button type="submit" className="workhub-primary-btn" disabled={!props.canCreateProject || props.busyKey === 'project'}>
                  {props.busyKey === 'project' ? 'Creating…' : 'Create project'}
                </button>
              </div>
            </div>
          </form>
        )}

        {props.createDialogType === 'task' && (
          <form
            className="workhub-modal-form compact-create"
            onSubmit={(event) => {
              event.preventDefault()
              props.onCreateTask()
            }}
          >
            <label className="workhub-icon-field">
              <span>✅ Task title</span>
              <textarea
                name="taskTitle"
                value={props.taskTitle}
                onChange={(event) => props.onTaskTitleChange(event.target.value)}
                placeholder="Prepare onboarding checklist"
                rows={3}
              />
              <small style={{ color: 'var(--wh-text-secondary)' }}>One line = one task. Paste multiple lines to create multiple tasks.</small>
            </label>
            <div className="workhub-field-grid two compact compact-core-grid">
              <label className="workhub-icon-field">
                <span>📂 Project</span>
                <select name="taskProject" value={props.taskProjectId} onChange={(event) => props.onTaskProjectIdChange(event.target.value)}>
                  {props.projectOptions.map((item) => <option key={item.id} value={item.id}>{`${'— '.repeat(item.depth)}${item.name}`}</option>)}
                </select>
              </label>
              <label className="workhub-icon-field">
                <span>👤 Assignee</span>
                <select name="taskAssignee" value={props.taskAssigneeUid} onChange={(event) => props.onTaskAssigneeChange(event.target.value)}>
                  {props.taskAssignableMembers.map((item) => <option key={item.uid} value={item.uid}>{item.displayName || item.email}</option>)}
                </select>
              </label>
            </div>
            <button type="button" className="workhub-collapse-toggle" onClick={() => setTaskAdvancedOpen((current) => !current)}>
              {taskAdvancedOpen ? '▾ Hide advanced' : '▸ Show advanced'}
            </button>
            {taskAdvancedOpen && (
              <div className="workhub-collapsible-panel">
                <label className="workhub-icon-field">
                  <span>📝 Description</span>
                  <textarea name="taskDescription" value={props.taskDescription} onChange={(event) => props.onTaskDescriptionChange(event.target.value)} placeholder="Task details" rows={3} />
                </label>
                <div className="workhub-field-grid two compact">
                  <label className="workhub-icon-field">
                    <span>🚩 Priority</span>
                    <select name="taskPriority" value={props.taskPriority} onChange={(event) => props.onTaskPriorityChange(event.target.value as WorkhubTaskPriority)}>
                      {Object.entries(PRIORITY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                    </select>
                  </label>
                  <label className="workhub-icon-field">
                    <span>📌 Status</span>
                    <select name="taskStatus" value={props.taskStatus} onChange={(event) => props.onTaskStatusChange(event.target.value as WorkhubTaskStatus)}>
                      {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{String(label)}</option>)}
                    </select>
                  </label>
                  <label className="workhub-icon-field">
                    <span>📅 Due date</span>
                    <input name="taskDueDate" type="date" value={props.taskDueDate} onChange={(event) => props.onTaskDueDateChange(event.target.value)} />
                  </label>
                </div>
              </div>
            )}
            <button type="submit" className="workhub-primary-btn" disabled={!props.canCreateTask || props.busyKey === 'task'}>
              {props.busyKey === 'task' ? 'Creating…' : 'Create task'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

function TeamDialog(props: {
  isOpen: boolean
  onClose: () => void
  members: WorkhubMember[]
  isMasterAdmin: boolean
  currentUserUid: string
  pendingCount: number
  busyKey: string
  onModerate: (uid: string, status: 'approved' | 'suspended', role?: 'member' | 'manager' | 'admin') => void
}) {
  if (!props.isOpen) return null

  return (
    <div className="workhub-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) props.onClose() }}>
      <div className="workhub-modal large" onMouseDown={(event) => event.stopPropagation()}>
        <div className="workhub-modal-head">
          <div>
            <h2>Team</h2>
            <p>Team management is available on demand instead of on the landing page.</p>
          </div>
          <button className="workhub-ghost-btn" onClick={props.onClose}>Close</button>
        </div>
        <div className="workhub-member-list compact-list">
          {props.members.map((item) => (
            <div key={item.uid} className="workhub-member-row compact-row">
              <div className="workhub-member-main">
                {item.photoURL ? <img src={item.photoURL} alt="" /> : <div className="workhub-member-avatar-fallback">{initialsOf(item.displayName || item.email || item.uid)}</div>}
                <div>
                  <strong>{item.displayName || item.email}</strong>
                  <span>{item.email}</span>
                </div>
              </div>
              <div className="workhub-member-meta">
                <span className={`workhub-status-chip status-${item.status}`}>{item.status}</span>
                <span className="workhub-role-chip">{item.role}</span>
              </div>
              {props.isMasterAdmin && item.uid !== props.currentUserUid && (
                <div className="workhub-member-actions">
                  {item.status !== 'approved' && <button className="workhub-primary-mini" disabled={props.busyKey === `member:${item.uid}:approved`} onClick={() => props.onModerate(item.uid, 'approved', item.role === 'admin' ? 'admin' : 'member')}>Approve</button>}
                  {item.status !== 'suspended' && <button className="workhub-ghost-mini" disabled={props.busyKey === `member:${item.uid}:suspended`} onClick={() => props.onModerate(item.uid, 'suspended', item.role)}>Suspend</button>}
                </div>
              )}
            </div>
          ))}
          {props.members.length === 0 && <div className="workhub-empty-state">No members yet.</div>}
        </div>
        {props.isMasterAdmin && props.pendingCount > 0 && (
          <div className="workhub-admin-note">You have {props.pendingCount} pending membership request{props.pendingCount > 1 ? 's' : ''} to review.</div>
        )}
      </div>
    </div>
  )
}

function WorkspaceSettingsDialog(props: {
  workspace: WorkhubWorkspace | null
  busyKey: string
  projectCount: number
  taskCount: number
  members: WorkhubMember[]
  pendingMembers: WorkhubMember[]
  approvedMembers: WorkhubMember[]
  workspaces: WorkhubWorkspace[]
  memberWorkspaceSummaryByUid: Record<string, { count: number; names: string[] }>
  workspaceAccessMemberUids: string[]
  workspaceInviteEmails: string[]
  workspaceInviteEmailDraft: string
  deleteTypedName: string
  deletePhrase: string
  deleteAcknowledge: boolean
  settingsName: string
  settingsDescription: string
  onClose: () => void
  onSettingsNameChange: (value: string) => void
  onSettingsDescriptionChange: (value: string) => void
  onWorkspaceAccessToggle: (uid: string, checked: boolean) => void
  onToggleUserWorkspace: (uid: string, workspaceId: string, checked: boolean) => void
  onWorkspaceInviteDraftChange: (value: string) => void
  onWorkspaceInviteAdd: () => void
  onWorkspaceInviteRemove: (email: string) => void
  onApproveRequest: (uid: string) => void
  onRejectRequest: (uid: string) => void
  workspaceMemberAccessLevels: Record<string, 'full' | 'custom'>
  onMemberAccessLevelChange: (uid: string, level: 'full' | 'custom') => void
  onDeleteTypedNameChange: (value: string) => void
  onDeletePhraseChange: (value: string) => void
  onDeleteAcknowledgeChange: (value: boolean) => void
  onSave: () => void
  onDelete: () => void
}) {
  if (!props.workspace) return null
  const canDelete = props.deleteTypedName.trim() === props.workspace.name && props.deletePhrase.trim() === 'DELETE WORKSPACE' && props.deleteAcknowledge

  return (
    <div className="workhub-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) props.onClose() }}>
      <div className="workhub-modal large workhub-workspace-settings-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="workhub-modal-head">
          <div>
            <h2>Workspace settings</h2>
            <p>Manage workspace details and lifecycle controls.</p>
          </div>
          <button className="workhub-ghost-btn" onClick={props.onClose}>Close</button>
        </div>
        <div className="workhub-settings-tab-panel">
          <div className="workhub-modal-form">
            <label>
              <span>Workspace name</span>
              <input name="workspaceSettingsName" value={props.settingsName} onChange={(event) => props.onSettingsNameChange(event.target.value)} placeholder="Workspace name" />
            </label>
            <label>
              <span>Description</span>
              <textarea name="workspaceSettingsDescription" value={props.settingsDescription} onChange={(event) => props.onSettingsDescriptionChange(event.target.value)} rows={4} placeholder="Workspace description" />
            </label>
            <button className="workhub-primary-btn" disabled={props.busyKey === `workspace-settings:${props.workspace.id}`} onClick={props.onSave}>
              {props.busyKey === `workspace-settings:${props.workspace.id}` ? 'Saving…' : 'Save workspace'}
            </button>
          </div>

          <details className="workhub-collapsible-danger">
            <summary>Danger zone</summary>
            <div className="workhub-danger-zone">
              <p>Deleting this workspace is irreversible. You must complete all confirmations below.</p>
              <div className="workhub-meta-line">{props.projectCount} project{props.projectCount === 1 ? '' : 's'} · {props.taskCount} task{props.taskCount === 1 ? '' : 's'}</div>
              <label>
                <span>Type workspace name exactly: {props.workspace.name}</span>
                <input name="workspaceDeleteTypedName" value={props.deleteTypedName} onChange={(event) => props.onDeleteTypedNameChange(event.target.value)} placeholder={props.workspace.name} />
              </label>
              <label>
                <span>Type DELETE WORKSPACE</span>
                <input name="workspaceDeletePhrase" value={props.deletePhrase} onChange={(event) => props.onDeletePhraseChange(event.target.value)} placeholder="DELETE WORKSPACE" />
              </label>
              <label className="workhub-checkline">
                <input name="workspaceDeleteAcknowledge" type="checkbox" checked={props.deleteAcknowledge} onChange={(event) => props.onDeleteAcknowledgeChange(event.target.checked)} />
                <span>I understand this action permanently removes the workspace.</span>
              </label>
              <button className="workhub-danger-btn" disabled={!canDelete || props.busyKey === `workspace-delete:${props.workspace.id}`} onClick={props.onDelete}>
                {props.busyKey === `workspace-delete:${props.workspace.id}` ? 'Deleting…' : 'Delete workspace forever'}
              </button>
            </div>
          </details>
        </div>
      </div>
    </div>
  )
}

const WorkhubStyles = memo(function WorkhubStyles() {
  return (
    <style>{`
      html.workhub-font-compact {
        font-size: 15px;
      }
      .workhub-shell {
        height: 100vh;
        padding: 14px 8px 8px;
        background: linear-gradient(180deg, #f8fbff 0%, #eef4ff 100%);
        color: #14213d;
        box-sizing: border-box;
        overflow: hidden;
      }
      .workhub-app {
        max-width: none;
        width: 100%;
        margin: 0 auto;
        font-size: 14px;
        line-height: 1.35;
        height: 100%;
        display: flex;
        flex-direction: column;
        min-height: 0;
        overflow: hidden;
      }
      .workhub-topbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 12px;
        padding: 0 4px;
        height: 56px;
        min-height: 56px;
        flex-shrink: 0;
        border-bottom: 1px solid #e0e8f7;
        margin-bottom: 6px;
      }
      .workhub-brand-wrap {
        display: flex;
        flex-direction: column;
        justify-content: center;
        min-width: 0;
      }
      .workhub-brand {
        font-size: 1.9rem;
        font-weight: 400;
        color: #3b4a6b;
        letter-spacing: 0.03em;
        white-space: nowrap;
        flex-shrink: 0;
        line-height: 1;
      }
      .workhub-brand-initial {
        color: #0f1f3d;
        font-weight: 800;
      }
      .workhub-brand-subtitle {
        margin-top: 2px;
        font-size: 0.76rem;
        font-weight: 600;
        color: #5f6f90;
        white-space: nowrap;
      }
      .workhub-status-editor-modal {
        width: min(620px, calc(100vw - 24px));
      }
      .workhub-status-editor-layout {
        display: grid;
        grid-template-columns: minmax(180px, 220px) minmax(0, 1fr);
        gap: 10px;
      }
      .workhub-status-editor-sidebar,
      .workhub-status-editor-detail {
        border: 1px solid #dbe7ff;
        background: #f9fbff;
        border-radius: 10px;
        padding: 10px;
      }
      .workhub-status-editor-sidebar {
        display: flex;
        flex-direction: column;
        gap: 0;
      }
      .workhub-status-editor-sidebar-head,
      .workhub-panel-head p,
      .workhub-workspace-summary span {
        margin: 3px 0 0;
        color: #60708f;
        line-height: 1.3;
        font-size: 0.88rem;
      }
      .workhub-status-editor-list {
        display: flex;
        flex-direction: column;
        gap: 0;
      }
      .workhub-status-editor-list.compact-list {
        max-height: 240px;
        overflow-y: auto;
        padding-right: 2px;
      }
      .workhub-status-list-item {
        width: 100%;
        border: none;
        border-bottom: 1px solid #edf2fb;
        border-radius: 0;
        padding: 6px 7px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 6px;
        text-align: left;
        cursor: pointer;
        background: transparent;
      }
      .workhub-status-list-item:last-child {
        border-bottom: none;
      }
      .workhub-status-list-item:hover {
        background: #f0f4ff;
      }
      .workhub-status-list-item.is-active {
        background: #e6eeff;
      }
      .workhub-status-list-item-main {
        display: flex;
        align-items: center;
        gap: 7px;
        min-width: 0;
      }
      .workhub-status-list-text {
        display: flex;
        align-items: baseline;
        gap: 5px;
        min-width: 0;
      }
      .workhub-status-list-text strong {
        font-size: 0.8rem;
        color: #17305c;
        line-height: 1.2;
      }
      .workhub-status-list-text small {
        font-size: 0.68rem;
        color: #9aaac2;
        line-height: 1.2;
      }
      .workhub-status-list-swatch {
        width: 10px;
        height: 10px;
        border-radius: 999px;
        flex: 0 0 auto;
        box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.9);
      }
      .workhub-status-list-swatch.large {
        width: 14px;
        height: 14px;
      }
      .workhub-status-editor-add {
        border-top: 1px solid #e3ecfb;
        padding-top: 10px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .workhub-status-editor-add.compact-add {
        margin-top: auto;
      }
      .workhub-status-add-btn {
        width: 100%;
        margin-top: 6px;
        padding: 6px 10px;
        border: 1px dashed #bed1f7;
        border-radius: 8px;
        background: transparent;
        color: #4a6fa5;
        font-size: 0.8rem;
        cursor: pointer;
        text-align: center;
      }
      .workhub-status-add-btn:hover {
        background: #edf4ff;
        border-color: #87a9ff;
      }
      .workhub-status-editor-detail {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      .workhub-status-editor-detail-head h3 {
        margin: 0;
        font-size: 0.96rem;
        color: #17305c;
      }
      .workhub-status-editor-detail-actions {
        display: flex;
        justify-content: flex-end;
      }
      @media (max-width: 760px) {
        .workhub-status-editor-layout {
          grid-template-columns: 1fr;
          min-height: 0;
        }
        .workhub-status-editor-list.compact-list {
          max-height: 180px;
        }
      }
      .workhub-header-actions,
      .workhub-home-actions,
      .workhub-panel-tools,
      .workhub-center-actions,
      .workhub-member-actions,
      .workhub-inline-row,
      .workhub-detail-meta,
      .workhub-meta-row,
      .workhub-task-controls,
      .workhub-project-card-actions,
      .workhub-status-editor-add-head {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
      }
      .workhub-header-actions {
        justify-content: flex-end;
        overflow: visible;
      }
      .workhub-notify-wrap {
        position: relative;
        overflow: visible;
      }
      .workhub-account-wrap {
        position: relative;
        overflow: visible;
      }
      .workhub-notify-btn {
        position: relative;
        border: 1px solid #d8e6fb;
        background: #ffffff;
        color: #355487;
        border-radius: 10px;
        min-width: 38px;
        height: 34px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        overflow: visible;
      }
      .workhub-account-btn {
        position: relative;
        border: 1px solid #d8e6fb;
        background: #ffffff;
        color: #355487;
        border-radius: 10px;
        min-width: 38px;
        height: 34px;
        padding: 0 6px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        cursor: pointer;
      }
      .workhub-notify-btn.is-open,
      .workhub-notify-btn:hover {
        border-color: #7fa3ef;
        background: #edf4ff;
      }
      .workhub-account-btn.is-open,
      .workhub-account-btn:hover {
        border-color: #7fa3ef;
        background: #edf4ff;
      }
      .workhub-account-avatar {
        width: 22px;
        height: 22px;
        border-radius: 999px;
        border: 1px solid #c8d8f4;
        object-fit: cover;
        background: #e6efff;
        color: #214a9f;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 0.64rem;
        font-weight: 800;
        line-height: 1;
        text-transform: uppercase;
      }
      .workhub-account-caret {
        font-size: 0.62rem;
        color: #6f84a8;
      }
      .workhub-notify-badge {
        position: absolute;
        top: -1px;
        right: -1px;
        transform: none;
        background: #295fe6;
        color: #ffffff;
        border-radius: 999px;
        min-width: 20px;
        height: 20px;
        padding: 0 5px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 0.75rem;
        font-weight: 700;
        border: 2px solid #f8fbff;
        white-space: nowrap;
        z-index: 2;
      }
      .workhub-account-menu {
        position: absolute;
        right: 0;
        top: calc(100% + 8px);
        width: min(280px, calc(100vw - 30px));
        background: #ffffff;
        border: 1px solid #dbe7ff;
        border-radius: 10px;
        box-shadow: 0 14px 30px rgba(20, 40, 77, 0.16);
        z-index: 40;
        overflow: hidden;
      }
      .workhub-account-menu-head {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 10px;
        border-bottom: 1px solid #e5eefc;
        background: #f8fbff;
      }
      .workhub-account-menu-identity {
        display: flex;
        flex-direction: column;
        min-width: 0;
      }
      .workhub-account-menu-identity strong {
        font-size: 0.8rem;
        color: #1b2f5b;
        line-height: 1.25;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .workhub-account-menu-identity span {
        font-size: 0.7rem;
        color: #4f6694;
        line-height: 1.25;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .workhub-account-menu-action {
        width: 100%;
        border: 0;
        border-top: 1px solid #edf3ff;
        background: #ffffff;
        color: #244374;
        text-align: left;
        font: inherit;
        font-size: 0.78rem;
        font-weight: 600;
        padding: 9px 10px;
        cursor: pointer;
      }
      .workhub-account-menu-action:hover {
        background: #f5f9ff;
      }
      .workhub-notify-menu {
        position: absolute;
        right: 0;
        top: calc(100% + 8px);
        width: min(360px, calc(100vw - 30px));
        background: #ffffff;
        border: 1px solid #dbe7ff;
        border-radius: 10px;
        box-shadow: 0 14px 30px rgba(20, 40, 77, 0.16);
        z-index: 40;
        overflow: hidden;
      }
      .workhub-notify-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 9px 10px;
        border-bottom: 1px solid #e5eefc;
        background: #f8fbff;
      }
      .workhub-notify-head strong {
        font-size: 0.8rem;
        color: #1b2f5b;
      }
      .workhub-notify-head span {
        font-size: 0.7rem;
        color: #4f6694;
      }
      .workhub-notify-list {
        max-height: 330px;
        overflow-y: auto;
      }
      .workhub-notify-item {
        width: 100%;
        text-align: left;
        border: none;
        border-bottom: 1px solid #edf3ff;
        background: #ffffff;
        padding: 9px 10px;
        display: flex;
        flex-direction: column;
        gap: 4px;
        cursor: pointer;
      }
      .workhub-notify-item:hover {
        background: #f5f9ff;
      }
      .workhub-notify-item.is-unread {
        background: #eef4ff;
      }
      .workhub-notify-message {
        font-size: 0.76rem;
        color: #213a67;
        line-height: 1.3;
      }
      .workhub-notify-item small {
        font-size: 0.68rem;
        color: #7287ad;
      }
      .workhub-notify-empty {
        padding: 12px;
        font-size: 0.76rem;
        color: #5f749c;
      }
      .workhub-toolbar-select {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 126px;
        align-items: flex-start;
      }
      .workhub-toolbar-select span,
      label span {
        display: block;
        font-size: 0.7rem;
        color: #60708f;
        font-weight: 700;
        margin-bottom: 3px;
      }
      .workhub-user-pill {
        display: flex;
        align-items: center;
        gap: 7px;
        padding: 6px 8px;
        border-radius: 11px;
        background: #ffffff;
        border: 1px solid #dbe7ff;
        box-shadow: 0 8px 18px rgba(49, 87, 163, 0.06);
      }
      .workhub-user-pill img,
      .workhub-member-main img {
        width: 26px;
        height: 26px;
        border-radius: 999px;
        object-fit: cover;
      }
      .workhub-user-pill span,
      .workhub-member-avatar-fallback {
        width: 26px;
        height: 26px;
        border-radius: 999px;
        display: grid;
        place-items: center;
        font-weight: 800;
        font-size: 0.68rem;
        background: linear-gradient(135deg, #4f8cff, #7b61ff);
        color: #fff;
      }
      .workhub-user-pill strong {
        font-size: 0.8rem;
        line-height: 1.1;
      }
      .workhub-user-pill small {
        display: block;
        color: #5f6f91;
        text-transform: capitalize;
        font-size: 0.68rem;
        line-height: 1.1;
      }
      .workhub-panel,
      .workhub-center-card,
      .workhub-detail-card {
        background: #ffffff;
        border: 1px solid #dbe7ff;
        box-shadow: 0 10px 22px rgba(58, 92, 168, 0.05);
      }
      .workhub-panel {
        border-radius: 13px;
        padding: 10px;
        margin-bottom: 20px;
      }
      .workhub-panel-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 8px;
        margin-bottom: 8px;
      }
      .workhub-panel-head.compact {
        margin-bottom: 6px;
      }
      .workhub-panel-head h2 {
        margin: 0;
        color: #17284d;
        font-size: 1.14rem;
        line-height: 1.15;
      }
      .workhub-detail-card h3 {
        margin: 0 0 16px 0;
        color: #17305c;
        font-size: 0.8rem;
        font-weight: 600;
      }
      .workhub-task-group-head h3 {
        margin: 0;
        color: #17284d;
        font-size: 0.8rem;
        font-weight: 600;
      }
      .workhub-badge,
      .workhub-role-chip,
      .workhub-status-chip,
      .workhub-priority-pill {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        padding: 2px 5px;
        border-radius: 999px;
        font-size: 0.72rem;
        font-weight: 700;
        white-space: nowrap;
      }
      .workhub-badge {
        background: #edf4ff;
        color: #2757c9;
      }
      .workhub-badge.is-danger,
      .status-suspended {
        background: #fff0f0;
        color: #d14343;
      }
      .status-approved {
        background: #ecfdf3;
        color: #1f9254;
      }
      .status-pending {
        background: #fff7e6;
        color: #b7791f;
      }
      .workhub-role-chip {
        background: #f2edff;
        color: #6650c8;
        text-transform: capitalize;
      }
      .priority-low {
        background: #ecfdf3;
        color: #1f9254;
      }
      .priority-medium {
        background: #edf4ff;
        color: #265bc7;
      }
      .priority-high {
        background: #fff7e8;
        color: #b7791f;
      }
      .priority-urgent {
        background: #fff0f0;
        color: #d14343;
      }
      .workhub-primary-btn,
      .workhub-ghost-btn,
      .workhub-tab {
        border: none;
        background: transparent;
        color: #647392;
        border-radius: 8px;
        padding: 8px 16px;
        font-size: 0.76rem;
        line-height: 1.1;
        font-weight: 600;
        cursor: pointer;
        min-height: 32px;
        transition: color 0.2s cubic-bezier(0.4, 0, 0.2, 1), background 0.2s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        white-space: nowrap;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1;
      }
      .workhub-tab::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 2px;
        background: linear-gradient(90deg, #295fe6 0%, #7b61ff 100%);
        transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        border-radius: 1px;
      }
      .workhub-tab:hover {
        color: #295fe6;
        background: rgba(41, 95, 230, 0.04);
      }
      .workhub-tab:hover::after {
        width: 80%;
      }
      .workhub-tab.is-active {
        color: #295fe6;
        background: linear-gradient(180deg, rgba(41, 95, 230, 0.08) 0%, rgba(41, 95, 230, 0.02) 100%);
        font-weight: 700;
        box-shadow: 0 2px 8px rgba(41, 95, 230, 0.15);
      }
      .workhub-tab.is-active::after {
        width: 100%;
        height: 3px;
        box-shadow: 0 2px 8px rgba(41, 95, 230, 0.4);
      }
      .workhub-primary-mini,
      .workhub-ghost-mini,
      .workhub-secondary-link,
      .workhub-switcher-btn,
      .workhub-member-chip,
      .workhub-workspace-card {
        font: inherit;
      }
      .workhub-primary-btn,
      .workhub-ghost-btn,
      .workhub-primary-mini,
      .workhub-ghost-mini,
      .workhub-secondary-link {
        border-radius: 9px;
        padding: 6px 9px;
        font-size: 0.82rem;
        line-height: 1.1;
        font-weight: 700;
        cursor: pointer;
        text-decoration: none;
        box-sizing: border-box;
        min-height: 28px;
        transition: transform 0.15s ease, opacity 0.2s ease, background 0.2s ease;
      }
      .workhub-primary-btn,
      .workhub-primary-mini {
        border: 0;
        background: linear-gradient(135deg, #4f8cff, #7b61ff);
        color: #fff;
      }
      .workhub-ghost-btn,
      .workhub-ghost-mini,
      .workhub-secondary-link {
        background: #ffffff;
        color: #29446f;
        border: 1px solid #d8e4fa;
      }
      .workhub-primary-mini,
      .workhub-ghost-mini {
        padding: 4px 7px;
        min-height: 24px;
        font-size: 0.74rem;
      }
      .workhub-primary-btn:hover,
      .workhub-ghost-btn:hover,
      .workhub-primary-mini:hover,
      .workhub-ghost-mini:hover,
      .workhub-secondary-link:hover {
        box-shadow: 0 4px 10px rgba(35, 65, 120, 0.12);
        filter: brightness(0.98);
      }
      .workhub-primary-btn:disabled,
      .workhub-ghost-btn:disabled,
      .workhub-primary-mini:disabled,
      .workhub-ghost-mini:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .workhub-shell-layout {
        display: grid;
        grid-template-columns: minmax(280px, 320px) minmax(0, 1fr);
        gap: 8px;
        align-items: stretch;
        margin-bottom: 0;
        flex: 1;
        min-height: 0;
        overflow: hidden;
      }
      .workhub-shell-layout.sidebar-collapsed {
        grid-template-columns: 56px minmax(0, 1fr);
      }
      .workhub-tree-sidebar {
        max-height: 100%;
        min-height: 0;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        border: 1px solid #d7dee8;
        background: #f6f8fb;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.75);
      }
      .workhub-tree-sidebar.is-collapsed {
        padding: 8px 6px;
        overflow: hidden;
      }
      .workhub-panel-head.is-collapsed-head {
        justify-content: center;
        align-items: center;
        margin-bottom: 0;
      }
      .workhub-sidebar-toggle {
        width: 28px;
        height: 28px;
        border-radius: 6px;
        border: 1px solid #dee4ec;
        background: #ffffff;
        color: #3d4a5e;
        font: inherit;
        font-size: 0.9rem;
        line-height: 1;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .workhub-tree-actions + .workhub-tree-actions {
        margin-top: 8px;
      }
      .workhub-tree-actions .workhub-inline-row {
        width: 100%;
        padding: 6px;
        border: 1px solid #e0e6ef;
        border-radius: 8px;
        background: #ffffff;
        box-shadow: 0 1px 4px rgba(33, 47, 75, 0.04);
      }
      .workhub-tree-overview {
        width: 100%;
        border: 1px solid #dde3ec;
        background: #ffffff;
        color: #253349;
        border-radius: 8px;
        padding: 7px 10px;
        text-align: left;
        font: inherit;
        font-size: 0.79rem;
        font-weight: 600;
        letter-spacing: 0.005em;
        cursor: pointer;
        transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
      }
      .workhub-tree-overview:hover {
        border-color: #c3cedd;
        box-shadow: 0 2px 8px rgba(35, 50, 77, 0.08);
        background: #fafcff;
      }
      .workhub-tree-overview.is-active {
        background: #eef3fa;
        border-color: #bcc8d7;
        color: #1f3a63;
        box-shadow: 0 3px 9px rgba(37, 55, 85, 0.1);
      }
      .workhub-tree-scroll {
        display: flex;
        flex-direction: column;
        gap: 3px;
        overflow-y: auto;
        padding-right: 2px;
        margin-top: 6px;
      }
      .workhub-tree-group,
      .workhub-tree-group-body {
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      .workhub-tree-group-toggle {
        width: 100%;
        border: 1px solid #e0e6ef;
        background: #ffffff;
        color: #2b3a50;
        border-radius: 8px;
        padding: 7px 10px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        cursor: pointer;
        font: inherit;
        text-align: left;
      }
      .workhub-tree-group-toggle:hover {
        background: #f6f9fd;
        border-color: #c3cedd;
      }
      .workhub-tree-group-label {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }
      .workhub-tree-group-caret {
        font-size: 0.92rem;
        color: #496183;
      }
      .workhub-tree-group-toggle strong {
        font-size: 0.82rem;
        color: #24344b;
      }
      .workhub-tree-group-toggle small {
        font-size: 0.68rem;
        color: #6f7f96;
      }
      .workhub-tree-node-wrap,
      .workhub-tree-children {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .workhub-tree-node-wrap.is-root {
        padding: 0;
      }
      .workhub-tree-node-wrap.is-root + .workhub-tree-node-wrap.is-root {
        border-top: 0;
        margin-top: 0;
        padding-top: 0;
      }
      .workhub-tree-children {
        gap: 0;
      }
      .workhub-tree-node-wrap.is-nested {
        gap: 0;
      }
      .workhub-tree-node {
        display: grid;
        grid-template-columns: 18px minmax(0, 1fr) auto;
        align-items: center;
        gap: 5px;
        padding: 3px 7px;
        border-radius: 7px;
        border: 1px solid #e2e8f0;
        background: #ffffff;
        box-shadow: 0 1px 3px rgba(33, 47, 75, 0.04);
        transition: background-color 0.18s ease, border-color 0.18s ease, box-shadow 0.18s ease;
        cursor: pointer;
      }
      .workhub-tree-node.is-root-leaf-node {
        grid-template-columns: minmax(0, 1fr) auto;
      }
      .workhub-tree-node-wrap.is-root:nth-child(odd) > .workhub-tree-node,
      .workhub-tree-node-wrap.is-nested:nth-child(odd) > .workhub-tree-node {
        background: #ffffff;
      }
      .workhub-tree-node-wrap.is-root:nth-child(even) > .workhub-tree-node {
        background: #f1f3f5;
      }
      .workhub-tree-node-wrap.is-nested:nth-child(even) > .workhub-tree-node {
        background: #f4f5f7;
      }
      .workhub-tree-node:hover {
        background: #f8fbff;
        border-color: #c8d2df;
        box-shadow: 0 3px 8px rgba(35, 50, 77, 0.08);
      }
      .workhub-tree-node:hover .workhub-tree-node-title {
        color: #1f3451;
      }
      .workhub-tree-node.is-active,
      .workhub-tree-node-wrap.is-root:nth-child(odd) > .workhub-tree-node.is-active,
      .workhub-tree-node-wrap.is-root:nth-child(even) > .workhub-tree-node.is-active,
      .workhub-tree-node-wrap.is-nested:nth-child(odd) > .workhub-tree-node.is-active,
      .workhub-tree-node-wrap.is-nested:nth-child(even) > .workhub-tree-node.is-active {
        background: #dfe8f8;
        border-color: #8ea4c8;
        box-shadow: inset 3px 0 0 #4f74bd, 0 5px 12px rgba(34, 52, 82, 0.14);
      }
      .workhub-tree-toggle {
        width: 17px;
        height: 17px;
        border: 1px solid #e3e8ef;
        border-radius: 4px;
        background: #ffffff;
        color: #566a88;
        font: inherit;
        font-size: 0.82rem;
        cursor: pointer;
        padding: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 1px 2px rgba(33, 47, 75, 0.06);
        transition: border-color 0.18s ease, background 0.18s ease, box-shadow 0.18s ease;
      }
      .workhub-tree-toggle:hover {
        border-color: #c9d4e2;
        background: #f9fbff;
        box-shadow: 0 2px 6px rgba(33, 47, 75, 0.1);
      }
      .workhub-tree-toggle-icon {
        width: 9px;
        height: 9px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transform: rotate(0deg);
        transition: transform 0.18s ease;
      }
      .workhub-tree-toggle-icon.is-expanded {
        transform: rotate(90deg);
      }
      .workhub-tree-toggle-icon svg {
        width: 100%;
        height: 100%;
      }
      .workhub-tree-toggle-icon path {
        fill: none;
        stroke: #5f728f;
        stroke-width: 1.8;
        stroke-linecap: round;
        stroke-linejoin: round;
      }
      .workhub-tree-leaf-indicator {
        width: 17px;
        height: 17px;
        display: grid;
        place-items: center;
        color: #8ea0b8;
        font-size: 0.62rem;
        line-height: 1;
      }
      .workhub-tree-leaf-indicator.is-root-leaf {
        font-size: 0.82rem;
        color: #6e829f;
      }
      .workhub-tree-node-main {
        display: flex;
        align-items: center;
        gap: 5px;
        min-width: 0;
        border: 0;
        background: transparent;
        padding: 0;
        cursor: pointer;
        text-align: left;
      }
      .workhub-tree-node-text {
        display: flex;
        align-items: baseline;
        gap: 3px;
        min-width: 0;
      }
      .workhub-tree-node-title {
        flex: 1 1 auto;
        min-width: 0;
        font-size: 0.74rem;
        line-height: 1.2;
        color: #22324a;
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .workhub-tree-node-meta {
        flex: 0 0 auto;
        color: #6a7b92;
        font-size: 0.62rem;
        line-height: 1.1;
        font-weight: 500;
        white-space: nowrap;
      }
      .workhub-tree-node.is-active .workhub-tree-node-title {
        color: #15386a;
        font-weight: 700;
      }
      .workhub-tree-node.is-active .workhub-tree-node-meta {
        color: #466392;
      }
      .workhub-tree-node-actions {
        display: flex;
        gap: 5px;
        align-items: center;
        opacity: 1;
        visibility: visible;
        transform: translateX(0);
        transition: opacity 0.14s ease, transform 0.14s ease, visibility 0s linear 0s;
      }
      @media (hover: hover) and (pointer: fine) {
        .workhub-tree-node .workhub-tree-node-actions {
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
          transform: translateX(2px);
          transition: opacity 0.14s ease, transform 0.14s ease, visibility 0s linear 0.14s;
        }
        .workhub-tree-node:hover .workhub-tree-node-actions,
        .workhub-tree-node:focus-within .workhub-tree-node-actions {
          opacity: 1;
          visibility: visible;
          pointer-events: auto;
          transform: translateX(0);
          transition: opacity 0.14s ease, transform 0.14s ease, visibility 0s linear 0s;
        }
      }
      .workhub-tree-node-wrap.is-nested > .workhub-tree-node {
        border-radius: 0;
        padding: 2px 6px;
        border: 0;
        box-shadow: none;
      }
      .workhub-tree-node-wrap.is-nested > .workhub-tree-node:hover {
        border: 0;
        box-shadow: none;
      }
      .workhub-tree-node-wrap.is-nested > .workhub-tree-node.is-active {
        border: 0;
        box-shadow: inset 2px 0 0 #4f74bd;
        background: #e4ebf8;
      }
      .workhub-tree-node-wrap.is-nested .workhub-plus-btn,
      .workhub-tree-node-wrap.is-nested .workhub-gear-btn {
        border: 0;
        border-radius: 0;
      }
      .workhub-tree-node .workhub-plus-btn,
      .workhub-tree-node .workhub-gear-btn,
      .workhub-tree-actions .workhub-plus-btn,
      .workhub-tree-actions .workhub-gear-btn {
        border-radius: 4px;
        border-color: #dfe5ee;
        color: #2f3e54;
        background: #ffffff;
      }
      .workhub-tree-node .workhub-plus-btn,
      .workhub-tree-node .workhub-gear-btn {
        width: 20px;
        height: 22px;
        font-size: 0.78rem;
      }
      .workhub-tree-node .workhub-plus-btn:hover,
      .workhub-tree-node .workhub-gear-btn:hover,
      .workhub-tree-actions .workhub-plus-btn:hover,
      .workhub-tree-actions .workhub-gear-btn:hover {
        background: #f6f9fd;
        border-color: #c3cedd;
      }
      .workhub-plus-btn {
        width: 24px;
        height: 28px;
        border-radius: 4px;
        border: 1px solid #d8e4fa;
        background: #ffffff;
        color: #111827;
        font: inherit;
        font-size: 0.96rem;
        font-weight: 800;
        line-height: 1;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.2s ease, border-color 0.2s ease;
      }
      .workhub-plus-btn:hover {
        background: #f7faff;
        border-color: #c8dbff;
      }
      .workhub-gear-btn {
        border-radius: 4px;
        font: inherit;
        font-size: 0.74rem;
        line-height: 1;
        cursor: pointer;
        width: 24px;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        box-sizing: border-box;
      }
      .workhub-gear-btn {
        border: 1px solid #d8e4fa;
        background: #ffffff;
        color: #29446f;
        padding: 0;
        text-align: center;
      }
      .workhub-danger-btn {
        border: 1px solid #f3c5c5;
        background: #fff5f5;
        color: #c23d3d;
        border-radius: 8px;
        font: inherit;
        font-size: 0.78rem;
        font-weight: 700;
        line-height: 1.1;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        width: auto;
        height: auto;
        min-height: 32px;
        padding: 7px 12px;
        box-sizing: border-box;
      }
      .workhub-danger-btn:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
      .workhub-project-settings-footer,
      .workhub-project-settings-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .workhub-project-settings-meta {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        flex-wrap: wrap;
      }
      .workhub-project-settings-color-row {
        align-items: flex-start;
      }
      .workhub-project-settings-modal {
        width: min(1320px, calc(100vw - 16px));
        max-height: min(760px, calc(100vh - 10px));
        overflow: hidden;
        padding: 0;
        display: flex;
        flex-direction: column;
        background: #ffffff;
      }
      .workhub-project-settings-head {
        margin-bottom: 0;
        padding: 8px 12px 6px;
        border-bottom: 1px solid #e4ecfb;
        background: #ffffff;
        flex-shrink: 0;
      }
      .workhub-project-settings-body {
        display: flex;
        flex-direction: row;
        overflow-y: auto;
        min-height: 0;
        flex: 1;
      }
      .workhub-project-settings-body button {
        margin-top: 0;
      }
      .workhub-psettings-left {
        flex: 0 0 64%;
        min-width: 0;
        padding: 8px 8px 8px 12px;
        border-right: 1px solid #e4ecfb;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .workhub-psettings-right {
        flex: 1 1 0;
        min-width: 0;
        padding: 8px 12px 8px 8px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .workhub-settings-panel {
        border: 1px solid #e1ebfb;
        border-radius: 8px;
        background: #ffffff;
        overflow: hidden;
      }
      .workhub-settings-panel-head {
        padding: 6px 9px;
        font-size: 0.78rem;
        font-weight: 700;
        color: #35527f;
        border-bottom: 1px solid #e7eefc;
        background: #ffffff;
      }
      .workhub-project-settings-grid {
        grid-template-columns: repeat(3, minmax(0, 1fr));
      }
      .workhub-settings-group {
        border: 1px solid #e1ebfb;
        border-radius: 10px;
        background: #fbfdff;
        overflow: hidden;
      }
      .workhub-settings-group > summary {
        list-style: none;
        cursor: pointer;
        padding: 8px 10px;
        font-size: 0.78rem;
        font-weight: 700;
        color: #35527f;
        border-bottom: 1px solid #e7eefc;
        background: #f4f8ff;
      }
      .workhub-settings-group-body {
        padding: 6px 9px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .workhub-project-settings-sticky-actions {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 8px;
        padding: 8px 12px;
        border-top: 1px solid #e4ecfb;
        background: #ffffff;
      }
      .workhub-ws-access-level-toggle {
        margin-left: 4px;
      }
      @media (min-width: 1480px) {
        .workhub-project-settings-grid {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }
      }
      .workhub-project-settings-footer {
        justify-content: space-between;
        margin-top: 10px;
        padding-top: 8px;
        border-top: 1px solid #e7eefb;
      }
      .workhub-modal-backdrop.transparent {
        background: transparent;
      }
      .workhub-action-menu {
        position: fixed;
        z-index: 3005;
        width: 210px;
        background: #ffffff;
        border: 1px solid #dbe7ff;
        border-radius: 12px;
        padding: 6px;
        box-shadow: 0 16px 38px rgba(22, 36, 68, 0.2);
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .workhub-action-menu-item {
        border: 0;
        background: #f8fbff;
        color: #1f365f;
        border-radius: 8px;
        padding: 7px 8px;
        display: flex;
        align-items: center;
        gap: 8px;
        font: inherit;
        font-size: 0.78rem;
        font-weight: 700;
        cursor: pointer;
      }
      .workhub-action-menu-item:hover {
        background: #edf4ff;
      }
      .workhub-action-icon {
        width: 18px;
        height: 18px;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        background: #ffffff;
        border: 1px solid #d8e4fa;
        color: #365dba;
        font-size: 0.68rem;
        line-height: 1;
      }
      .workhub-assignee-strip {
        display: grid;
        grid-template-columns: repeat(4, minmax(0, 1fr));
        gap: 8px;
      }
      .workhub-assignee-card {
        border: 1px solid #dbe7ff;
        border-radius: 11px;
        background: #fbfdff;
        padding: 8px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .workhub-assignee-card strong {
        font-size: 0.82rem;
        color: #1c365f;
      }
      .workhub-assignee-metrics {
        display: flex;
        flex-direction: column;
        gap: 2px;
        font-size: 0.72rem;
        color: #5c6c8d;
      }
      .workhub-main-stage {
        min-width: 0;
        min-height: 0;
        overflow: hidden;
        padding-right: 2px;
      }
      .workhub-floating-add-wrap {
        position: fixed;
        right: 14px;
        bottom: 16px;
        z-index: 2500;
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 8px;
      }
      .workhub-floating-add-menu {
        display: flex;
        flex-direction: column;
        gap: 6px;
        background: #ffffff;
        border: 1px solid #dbe7ff;
        border-radius: 10px;
        padding: 8px;
        box-shadow: 0 10px 24px rgba(20, 35, 70, 0.18);
      }
      .workhub-floating-add-option {
        border: 1px solid #dbe7ff;
        background: #f8fbff;
        color: #1f365f;
        border-radius: 8px;
        padding: 6px 10px;
        font: inherit;
        font-size: 0.74rem;
        font-weight: 700;
        cursor: pointer;
      }
      .workhub-floating-add-option:disabled {
        opacity: 0.45;
        cursor: not-allowed;
      }
      .workhub-floating-add-btn {
        width: 38px;
        height: 38px;
        border-radius: 999px;
        border: 1px solid #cfe0ff;
        background: linear-gradient(145deg, #4f8cff, #7b61ff);
        color: #ffffff;
        font: inherit;
        font-size: 1.1rem;
        font-weight: 700;
        line-height: 1;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 10px 24px rgba(44, 84, 176, 0.35);
      }
      .workhub-batch-progress {
        position: fixed;
        right: 14px;
        bottom: 64px;
        z-index: 2501;
        width: 240px;
        border: 1px solid #dbe7ff;
        border-radius: 10px;
        background: #ffffff;
        box-shadow: 0 12px 28px rgba(12, 32, 66, 0.2);
        padding: 9px 10px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .workhub-batch-progress-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        color: #1f365f;
        font-size: 0.74rem;
      }
      .workhub-batch-progress-head strong {
        font-size: 0.76rem;
      }
      .workhub-batch-progress-bar {
        width: 100%;
        height: 8px;
        border-radius: 999px;
        background: #eaf1ff;
        overflow: hidden;
      }
      .workhub-batch-progress-bar span {
        display: block;
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, #4f8cff 0%, #7b61ff 100%);
        transition: width 0.18s ease;
      }
      .workhub-bulk-status-wrap {
        position: relative;
        margin-left: 6px;
      }
      .workhub-bulk-status-btn {
        width: auto;
        min-width: 56px;
        padding: 0 8px;
        font-size: 0.72rem;
        font-weight: 700;
        gap: 4px;
      }
      .workhub-bulk-status-menu {
        position: absolute;
        top: 38px;
        right: 0;
        z-index: 35;
        min-width: 170px;
        border: 1px solid #dce8ff;
        background: #ffffff;
        border-radius: 10px;
        box-shadow: 0 10px 28px rgba(12, 32, 66, 0.16);
        padding: 6px;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .workhub-bulk-status-menu button {
        border: none;
        background: transparent;
        border-radius: 7px;
        padding: 6px 8px;
        text-align: left;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        color: #29466f;
        font-size: 0.73rem;
        cursor: pointer;
      }
      .workhub-bulk-status-menu button:hover {
        background: #eff5ff;
      }
      .workhub-bulk-status-menu .workhub-bulk-clear-btn {
        margin-top: 4px;
        border-top: 1px solid #e3ebff;
        border-radius: 0;
        padding-top: 8px;
        color: #4a5f84;
      }
      .workhub-bulk-delete-btn {
        margin-left: 6px;
        color: #8b2e35;
        border-color: #f0ccd2;
        background: #fff4f5;
      }
      .workhub-bulk-delete-btn:hover {
        background: #ffe8ec;
      }
      .workhub-bulk-delete-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      .workhub-status-tabs {
        display: flex;
        align-items: center;
        gap: 4px;
        padding: 4px 0;
        border-bottom: 1px solid #e3ecfb;
        margin-bottom: 16px;
        flex-wrap: wrap;
        position: relative;
      }
      .workhub-status-tabs::before {
        content: '';
        position: absolute;
        bottom: -1px;
        left: 0;
        right: 0;
        height: 2px;
        background: linear-gradient(90deg, #295fe6 0%, #7b61ff 100%);
        opacity: 0.1;
      }
      .workhub-status-tab {
        border: none;
        background: transparent;
        color: #647392;
        border-radius: 8px 8px 0 0;
        padding: 8px 16px;
        font-size: 0.75rem;
        line-height: 1;
        font-weight: 600;
        cursor: pointer;
        min-height: 32px;
        transition: color 0.2s cubic-bezier(0.4, 0, 0.2, 1), background 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        position: relative;
        white-space: nowrap;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .workhub-status-tab::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 50%;
        transform: translateX(-50%);
        width: 0;
        height: 2px;
        background: var(--status-color, #295fe6);
        transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        border-radius: 1px;
      }
      .workhub-status-tab:hover {
        color: #295fe6;
        background: rgba(41, 95, 230, 0.04);
      }
      .workhub-status-tab:hover::after {
        width: 100%;
      }
      .workhub-status-tab.is-active {
        color: var(--status-color, #295fe6);
        background: linear-gradient(180deg, rgba(41, 95, 230, 0.08) 0%, rgba(41, 95, 230, 0.02) 100%);
        font-weight: 700;
      }
      .workhub-status-tab.is-active::after {
        width: 100%;
        height: 3px;
        box-shadow: 0 2px 8px rgba(41, 95, 230, 0.4);
      }
      .workhub-status-manage-btn {
        margin-left: auto;
        width: 32px;
        height: 32px;
        border-radius: 8px;
        border: 1px solid #d8e4fa;
        background: #f8fbff;
        color: #47608f;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: color 0.2s ease, background 0.2s ease, border-color 0.2s ease;
      }
      .workhub-task-filter-wrap {
        position: relative;
        margin-left: auto;
      }
      .workhub-task-filter-wrap + .workhub-status-manage-btn {
        margin-left: 6px;
      }
      .workhub-task-filter-btn {
        margin-left: 0;
        position: relative;
      }
      .workhub-task-filter-icon {
        width: 15px;
        height: 15px;
        display: block;
        flex: 0 0 auto;
        background: currentColor;
        clip-path: polygon(0 8%, 100% 8%, 66% 46%, 66% 100%, 34% 100%, 34% 46%);
      }
      .workhub-task-filter-btn.is-active {
        color: #295fe6;
        border-color: #87a9ff;
        background: #edf4ff;
      }
      .workhub-task-filter-badge {
        position: absolute;
        top: -4px;
        right: -4px;
        min-width: 14px;
        height: 14px;
        padding: 0 3px;
        border-radius: 999px;
        background: #4d84ff;
        color: #ffffff;
        font-size: 0.62rem;
        font-weight: 800;
        line-height: 14px;
        text-align: center;
      }
      .workhub-task-filter-menu {
        position: absolute;
        top: 38px;
        right: 0;
        z-index: 35;
        width: 220px;
        border: 1px solid #dce8ff;
        background: #ffffff;
        border-radius: 10px;
        box-shadow: 0 10px 28px rgba(12, 32, 66, 0.16);
        padding: 10px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .workhub-task-filter-menu-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .workhub-task-filter-menu-head strong {
        font-size: 0.77rem;
        color: #18345f;
      }
      .workhub-task-filter-clear {
        border: none;
        background: transparent;
        color: #4d84ff;
        font: inherit;
        font-size: 0.7rem;
        font-weight: 700;
        cursor: pointer;
        padding: 0;
        margin: 0;
      }
      .workhub-task-filter-check {
        display: flex;
        align-items: center;
        gap: 7px;
        font-size: 0.74rem;
        color: #35507d;
      }
      .workhub-task-filter-check input {
        margin: 0;
      }
      .workhub-task-filter-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .workhub-task-filter-group > span {
        font-size: 0.69rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: #7388aa;
      }
      .workhub-task-filter-priority-row {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .workhub-task-filter-pill {
        border: 1px solid #d9e5fb;
        background: #f8fbff;
        color: #3e5987;
        border-radius: 999px;
        padding: 4px 8px;
        font: inherit;
        font-size: 0.7rem;
        font-weight: 700;
        cursor: pointer;
      }
      .workhub-task-filter-pill.is-active {
        background: #edf4ff;
        border-color: #87a9ff;
        color: #295fe6;
      }
      .workhub-status-manage-btn:hover {
        color: #295fe6;
        border-color: #87a9ff;
        background: #edf4ff;
      }
      .workhub-status-tab.is-active[data-status-color="backlog"] {
        --status-color: #6b7280;
      }
      .workhub-status-tab.is-active[data-status-color="open"] {
        --status-color: #3b82f6;
      }
      .workhub-status-tab.is-active[data-status-color="in_progress"] {
        --status-color: #f59e0b;
      }
      .workhub-status-tab.is-active[data-status-color="review"] {
        --status-color: #8b5cf6;
      }
      .workhub-status-tab.is-active[data-status-color="completed"] {
        --status-color: #10b981;
      }
      .workhub-status-tab.is-active[data-status-color="canceled"] {
        --status-color: #ef4444;
      }
      .workhub-status-add {
        border: 1px solid #e3ecfb;
        background: transparent;
        color: #94a3b8;
        min-width: 32px;
        padding: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        transition: color 0.2s ease, background 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
        font-size: 1.1rem;
        font-weight: 300;
      }
      .workhub-status-add:hover {
        border-color: #295fe6;
        color: #295fe6;
        background: rgba(41, 95, 230, 0.04);
        transform: scale(1.05);
      }
      .workhub-status-editor-list {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .workhub-status-editor-row {
        border: 1px solid #dbe7ff;
        background: #f9fbff;
        border-radius: 12px;
        padding: 10px;
        display: flex;
        gap: 12px;
        justify-content: space-between;
        align-items: flex-end;
      }
      .workhub-status-editor-fields {
        flex: 1;
        display: grid;
        grid-template-columns: minmax(0, 1fr) minmax(220px, 320px);
        gap: 10px;
      }
      .workhub-status-editor-actions {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 8px;
        min-width: 96px;
      }
      .workhub-status-editor-add {
        border-top: 1px solid #e3ecfb;
        padding-top: 12px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .workhub-status-editor-add-head h3 {
        margin: 0;
        font-size: 0.92rem;
        color: #17305c;
      }
      .workhub-status-editor-add-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
      }
      .workhub-compact-grid {
        display: grid;
        gap: 8px;
        grid-template-columns: minmax(0, 1.05fr) minmax(280px, 0.95fr);
      }
      .workhub-content-area {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 340px;
        gap: 10px;
        align-items: stretch;
        height: calc(100vh - 150px);
        min-height: 0;
        overflow: hidden;
      }
      .workhub-task-sections {
        min-width: 0;
        height: 100%;
        min-height: 0;
        overflow-y: auto;
        overflow-x: hidden;
        padding-right: 2px;
      }
      .workhub-task-table-wrap {
        min-width: 0;
        width: 100%;
        padding-bottom: 4px;
      }
      .workhub-task-detail-rail {
        display: flex;
        flex-direction: column;
        gap: 8px;
        height: 100%;
        min-height: 0;
        overflow-y: auto;
        border-left: 1px solid #e3ecfb;
        padding-left: 10px;
      }
      .workhub-detail-rail-head {
        position: sticky;
        top: 0;
        z-index: 2;
        border: 1px solid #dbe7ff;
        background: #fbfdff;
        border-radius: 10px;
        padding: 8px 10px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .workhub-detail-rail-head h3 {
        margin: 0;
        font-size: 0.82rem;
        color: #1e3a66;
      }
      .workhub-detail-rail-head span {
        color: #647392;
        font-size: 0.72rem;
      }
      .workhub-span-2 {
        grid-column: 1 / -1;
      }
      .workhub-modal-form button {
        margin-top: 16px;
      }
      .workhub-modal-form input:not([type='checkbox']):not([type='radio']),
      .workhub-modal-form textarea,
      .workhub-modal-form select {
        padding: 9px 12px;
      }
      .workhub-status-editor-list button,
      .workhub-status-add-btn {
        margin-top: 0;
      }
      .workhub-summary-strip {
        display: flex;
        flex-wrap: nowrap;
        gap: 12px;
        overflow-x: auto;
        padding-bottom: 2px;
      }
      .workhub-summary-tile {
        background: #f9fbff;
        border: 1px solid #e3ecfb;
        border-radius: 10px;
        padding: 12px;
        text-align: center;
        flex: 0 0 160px;
      }
      .workhub-summary-tile strong {
        display: block;
        margin-bottom: 4px;
        font-size: 1.08rem;
        line-height: 1.1;
        color: #17305b;
      }
      .workhub-summary-tile span {
        color: #627291;
        font-size: 0.82rem;
      }
      .workhub-summary-list {
        display: grid;
        gap: 6px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        margin-top: 10px;
      }
      .workhub-overview-dashboard {
        margin-top: 12px;
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }
      .workhub-overview-card {
        border: 1px solid #dde9ff;
        background: #f9fbff;
        border-radius: 10px;
        padding: 10px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        min-height: 150px;
      }
      .workhub-overview-head {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 8px;
      }
      .workhub-overview-head h3 {
        margin: 0;
        font-size: 0.92rem;
      }
      .workhub-overview-head span {
        color: #5d7095;
        font-size: 0.76rem;
        font-weight: 700;
      }
      .workhub-overview-status-list {
        display: flex;
        flex-direction: column;
        gap: 7px;
      }
      .workhub-overview-status-row {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .workhub-overview-status-label {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 0.77rem;
      }
      .workhub-overview-status-label strong {
        margin-left: auto;
        color: #1f3763;
      }
      .workhub-overview-status-bar {
        width: 100%;
        height: 6px;
        border-radius: 99px;
        background: #e9f0ff;
        overflow: hidden;
      }
      .workhub-overview-status-bar span {
        height: 100%;
        display: block;
        border-radius: 99px;
      }
      .workhub-overview-priority-stack {
        display: flex;
        align-items: stretch;
        gap: 4px;
        height: 30px;
      }
      .workhub-overview-priority-segment {
        border-radius: 6px;
        min-width: 12px;
      }
      .workhub-overview-priority-legend {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
      .workhub-overview-priority-legend span {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-size: 0.74rem;
        color: #51668d;
      }
      .workhub-overview-priority-legend i {
        width: 8px;
        height: 8px;
        border-radius: 99px;
        display: inline-block;
      }
      .workhub-overview-progress-track {
        width: 100%;
        height: 10px;
        border-radius: 99px;
        background: #e5edff;
        overflow: hidden;
      }
      .workhub-overview-progress-track span {
        display: block;
        height: 100%;
        border-radius: 99px;
        background: linear-gradient(90deg, #2563eb 0%, #10b981 100%);
      }
      .workhub-overview-progress-meta {
        display: flex;
        justify-content: space-between;
        font-size: 0.75rem;
        color: #5a6f94;
      }
      .workhub-overview-timeline {
        display: flex;
        flex-direction: column;
        gap: 7px;
        max-height: 190px;
        overflow: auto;
        padding-right: 2px;
      }
      .workhub-overview-timeline-item {
        display: grid;
        grid-template-columns: 10px minmax(0, 1fr);
        gap: 7px;
      }
      .workhub-overview-timeline-item .timeline-dot {
        width: 8px;
        height: 8px;
        border-radius: 99px;
        background: #4f7cff;
        margin-top: 4px;
      }
      .workhub-overview-timeline-item strong {
        font-size: 0.77rem;
      }
      .workhub-overview-timeline-item p {
        margin: 2px 0;
        font-size: 0.75rem;
        color: #5b6f95;
      }
      .workhub-overview-timeline-item small {
        color: #7488ad;
        font-size: 0.7rem;
      }
      .workhub-project-risk-list {
        display: flex;
        flex-direction: column;
        gap: 7px;
        max-height: 210px;
        overflow: auto;
      }
      .workhub-project-risk-item {
        width: 100%;
        border: 1px solid #dce7fb;
        border-radius: 9px;
        background: #fbfdff;
        padding: 8px;
        text-align: left;
        cursor: pointer;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .workhub-project-risk-item:hover {
        background: #f4f8ff;
      }
      .workhub-project-risk-item.is-near-deadline {
        border-color: #f3b66a;
        background: #fff8ef;
      }
      .workhub-project-risk-item-main {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 8px;
      }
      .workhub-project-risk-title-wrap {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 1px;
      }
      .workhub-project-risk-item-main strong {
        font-size: 0.78rem;
        color: #1c345f;
        line-height: 1.3;
      }
      .workhub-project-risk-client {
        font-size: 0.68rem;
        color: #64769c;
        line-height: 1.2;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .workhub-project-risk-priority-chip {
        font-size: 0.66rem;
        font-weight: 700;
        border-radius: 999px;
        padding: 3px 7px;
        border: 1px solid #cfdcf5;
        background: #eef4ff;
        color: #34598e;
        white-space: nowrap;
      }
      .workhub-project-risk-priority-chip.priority-critical {
        border-color: #efb2b2;
        background: #ffeaea;
        color: #9b1c1c;
      }
      .workhub-project-risk-priority-chip.priority-high {
        border-color: #f8d1a1;
        background: #fff3e3;
        color: #9a4a05;
      }
      .workhub-project-risk-meta-row {
        display: grid;
        grid-template-columns: 72px minmax(0, 1fr) 52px;
        gap: 8px;
        align-items: center;
      }
      .workhub-project-risk-calendar {
        border: 1px solid #d8e5fb;
        background: #ffffff;
        border-radius: 8px;
        padding: 4px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
      }
      .workhub-project-risk-calendar-head {
        width: 100%;
        border-radius: 5px;
        background: #e9f1ff;
        color: #2f5695;
        font-size: 0.55rem;
        font-weight: 800;
        letter-spacing: 0.06em;
        text-align: center;
        padding: 1px 0;
      }
      .workhub-project-risk-calendar-date {
        font-size: 0.64rem;
        color: #24467b;
        font-weight: 700;
      }
      .workhub-project-risk-date-wrap {
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 2px;
      }
      .workhub-project-risk-date-wrap > span {
        font-size: 0.65rem;
        color: #66799f;
      }
      .workhub-project-risk-date-values {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
      }
      .workhub-project-risk-date-values span {
        font-size: 0.73rem;
        color: #24467b;
        font-weight: 700;
      }
      .workhub-project-risk-clock {
        --wh-risk-progress: 30%;
        width: 50px;
        height: 50px;
        border-radius: 999px;
        background: conic-gradient(#f59e0b var(--wh-risk-progress), #e7eefc 0);
        position: relative;
        display: grid;
        place-items: center;
      }
      .workhub-project-risk-clock::before {
        content: '';
        position: absolute;
        inset: 5px;
        border-radius: 999px;
        background: #ffffff;
      }
      .workhub-project-risk-clock span {
        position: relative;
        z-index: 1;
        font-size: 0.66rem;
        color: #27477d;
        font-weight: 800;
      }
      .workhub-project-risk-clock.is-overdue {
        background: conic-gradient(#dc2626 var(--wh-risk-progress), #f5d4d4 0);
      }
      .workhub-project-risk-progress-track {
        width: 100%;
        height: 5px;
        border-radius: 999px;
        background: #e6eefc;
        overflow: hidden;
      }
      .workhub-project-risk-progress-track span {
        height: 100%;
        display: block;
        border-radius: 999px;
        background: linear-gradient(90deg, #3b82f6 0%, #f59e0b 100%);
      }
      .workhub-project-risk-countdown {
        font-size: 0.7rem;
        color: #63779c;
      }
      .workhub-ltr-token {
        direction: ltr;
        unicode-bidi: isolate;
        display: inline-block;
      }
      .workhub-user-management-tools {
        display: flex;
        align-items: flex-end;
        gap: 8px;
      }
      .workhub-user-management-tools label {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .workhub-user-management-tools label span {
        font-size: 0.7rem;
        color: #6b7ea3;
        font-weight: 700;
      }
      .workhub-user-management-tools select {
        min-width: 200px;
      }
      .workhub-client-layout {
        display: grid;
        grid-template-columns: minmax(240px, 0.9fr) minmax(0, 1.5fr);
        gap: 10px;
        margin-top: 8px;
      }
      .workhub-client-list {
        border: 1px solid #e0eafb;
        border-radius: 10px;
        background: #fafcff;
        padding: 8px;
        display: flex;
        flex-direction: column;
        gap: 6px;
        max-height: 520px;
        overflow: auto;
      }
      .workhub-client-list-item {
        width: 100%;
        border: 1px solid #dce7fb;
        border-radius: 8px;
        background: #ffffff;
        padding: 8px;
        text-align: left;
        display: flex;
        flex-direction: column;
        gap: 3px;
        cursor: pointer;
      }
      .workhub-client-list-item.is-active {
        border-color: #6d95ea;
        background: #eef4ff;
      }
      .workhub-client-list-item strong {
        font-size: 0.78rem;
        color: #1f3766;
      }
      .workhub-client-list-item span {
        font-size: 0.72rem;
        color: #60739a;
      }
      .workhub-client-list-item small {
        font-size: 0.67rem;
        color: #7f90ae;
      }
      .workhub-client-workspace-label {
        font-size: 0.66rem;
        font-weight: 700;
        color: #4d6390;
      }
      .workhub-client-form {
        gap: 10px;
        margin-top: 0;
      }
      .workhub-client-logo-preview {
        border: 1px dashed #d6e4fc;
        background: #f7fbff;
        border-radius: 8px;
        padding: 8px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      .workhub-client-logo-preview img {
        max-height: 44px;
        max-width: 190px;
        object-fit: contain;
      }
      .workhub-client-logo-upload-row {
        align-items: center;
        gap: 8px;
      }
      .workhub-client-logo-upload-btn {
        margin-top: 0;
      }
      .workhub-client-quick-add {
        align-items: stretch;
      }
      .workhub-client-quick-add input {
        min-width: 200px;
      }
      .workhub-client-quick-add button {
        margin-top: 0;
        white-space: nowrap;
      }
      .workhub-project-card-grid,
      .workhub-workspace-grid {
        display: grid;
        gap: 8px;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      }
      .workhub-project-card.compact-card {
        padding: 7px;
      }
      .workhub-project-title-row,
      .workhub-task-row-title {
        display: flex;
        align-items: center;
        gap: 6px;
        flex-wrap: wrap;
      }
      .workhub-project-title-row.spaced {
        justify-content: space-between;
        margin-bottom: 5px;
      }
      .workhub-task-row-title.detail-title {
        flex-wrap: nowrap;
        align-items: center;
        gap: 7px;
      }
      .workhub-task-row-title.detail-title .workhub-project-dot {
        align-self: center;
      }
      .workhub-task-row-title.detail-title h3 {
        margin: 0;
      }
      .workhub-project-dot {
        width: 9px;
        height: 9px;
        border-radius: 999px;
        flex-shrink: 0;
      }
      .workhub-project-dot.is-root {
        width: 11px;
        height: 11px;
        box-shadow:
          0 0 0 2px #ffffff,
          0 0 0 3px rgba(122, 141, 169, 0.3),
          0 2px 6px rgba(32, 45, 70, 0.2);
      }
      .workhub-tree-node.is-active .workhub-project-dot.is-root {
        box-shadow:
          0 0 0 2px #ffffff,
          0 0 0 3px rgba(94, 122, 169, 0.45),
          0 3px 8px rgba(30, 51, 86, 0.24);
      }
      .workhub-detail-card p {
        margin: 12px 0;
        line-height: 1.4;
        color: #627291;
        font-size: 0.8rem;
      }
      .workhub-workspace-card {
        display: grid;
        grid-template-columns: auto auto 1fr;
        align-items: center;
        gap: 6px;
        text-align: left;
        color: inherit;
      }
      .workhub-danger-zone {
        margin-top: 10px;
        border: 1px solid #f3cccc;
        background: #fff7f7;
        border-radius: 11px;
        padding: 10px;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .workhub-danger-zone h3 {
        margin: 0;
        font-size: 0.88rem;
        color: #a33636;
      }
      .workhub-danger-zone p {
        margin: 0;
        font-size: 0.74rem;
        color: #8c4a4a;
      }
      .workhub-checkline {
        display: flex;
        align-items: center;
        gap: 7px;
      }
      .workhub-checkline input {
        width: 15px;
        height: 15px;
      }
      .workhub-workspace-card.is-active {
        border-color: #7aa2ff;
        box-shadow: 0 10px 20px rgba(77, 132, 255, 0.12);
      }
      .workhub-workspace-card strong,
      .workhub-project-card strong,
      .workhub-project-focus-card strong,
      .workhub-member-main strong,
      .workhub-comment-item strong,
      .workhub-activity-item strong,
      .workhub-task-row-title strong,
      .workhub-task-row-title h3 {
        color: #17305c;
        font-size: 0.8rem;
        line-height: 1.15;
      }
      .workhub-task-row-title strong,
      .workhub-task-row-title h3 {
        font-size: 0.74rem;
        line-height: 1.2;
        font-weight: 400;
      }
      .workhub-title-edit-hint {
        font-size: 0.62rem;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: #7e8fb2;
        opacity: 0;
        transform: translateY(-1px);
        transition: opacity 0.14s ease, transform 0.14s ease;
        pointer-events: none;
      }
      .workhub-task-row-title:hover .workhub-title-edit-hint,
      .workhub-task-row-title:focus-within .workhub-title-edit-hint,
      .workhub-task-row.is-selected .workhub-title-edit-hint {
        opacity: 0.9;
        transform: translateY(0);
      }
      .workhub-workspace-card span,
      .workhub-member-main span,
      .workhub-comment-item span,
      .workhub-activity-item span,
      .workhub-detail-meta span,
      .workhub-task-row-meta span,
      .workhub-meta-line {
        color: #647392;
        font-size: 0.8rem;
        line-height: 1.25;
      }
      .workhub-member-row {
        justify-content: space-between;
      }
      .workhub-member-row.compact-row {
        align-items: flex-start;
      }
      .workhub-member-main {
        display: flex;
        align-items: center;
        gap: 7px;
        min-width: 0;
      }
      .workhub-task-row-quick-actions {
        display: flex;
        gap: 4px;
        align-items: center;
      }
      .workhub-task-row-quick-actions select {
        font-size: 0.65rem;
        padding: 2px 4px;
        border-radius: 3px;
        border: 1px solid #d8e4fa;
        background: #ffffff;
        min-width: 60px;
        max-width: 80px;
      }
      .workhub-task-row-inline {
        display: flex;
        align-items: center;
        gap: 8px;
        width: 100%;
        justify-content: space-between;
      }
      .workhub-task-row-inline input[type="checkbox"] {
        width: 16px;
        height: 16px;
        flex-shrink: 0;
      }
      .workhub-task-row-left {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
        min-width: 0;
      }
      .workhub-checklist-toggle {
        border: 1px solid #d8e4fa;
        background: #f8fbff;
        color: #2f4f84;
        border-radius: 6px;
        padding: 2px 6px;
        font: inherit;
        font-size: 0.66rem;
        line-height: 1.1;
        font-weight: 700;
        cursor: pointer;
        white-space: nowrap;
      }
      .workhub-checklist-meta {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        margin-left: 6px;
        font-size: 0.68rem;
        color: #5772a3;
      }
      .workhub-checklist-meta span {
        display: inline-flex;
        align-items: center;
        gap: 2px;
        padding: 1px 4px;
        border-radius: 8px;
        background: #edf3ff;
      }
      .workhub-task-checklist {
        border-top: 1px dashed #d8e4fa;
        margin-top: 6px;
        padding-top: 6px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .workhub-checklist-empty {
        font-size: 0.72rem;
        color: #657493;
      }
      .workhub-checklist-items {
        display: flex;
        flex-direction: column;
        gap: 0;
        margin-left: 0;
        padding-left: 0;
        border-left: none;
      }
      .workhub-checklist-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 6px 8px;
        border-bottom: 1px solid #f0f4ff;
      }
      .workhub-checklist-item-wrap {
        display: flex;
        flex-direction: column;
      }
      .workhub-checklist-item:last-child {
        border-bottom: none;
      }
      .workhub-checklist-item.even {
        background: #ffffff;
      }
      .workhub-checklist-item.odd {
        background: #f9fbff;
      }
      .workhub-checklist-left {
        display: flex;
        align-items: center;
        flex: 1;
        min-width: 0;
      }
      .workhub-checklist-item-main {
        display: flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
        flex: 1;
        width: 100%;
        justify-content: flex-start;
        text-align: left;
      }
      .workhub-checklist-left input[type="checkbox"] {
        margin: 0;
        flex: 0 0 14px;
      }
      .workhub-checklist-item-text {
        margin: 0;
        font-size: 0.74rem;
        color: #2c3f63;
        font-weight: 500;
        text-align: left;
        flex: 1;
      }
      .workhub-checklist-item-text.is-checked {
        text-decoration: line-through;
        color: #7c8ba6;
      }
      .workhub-checklist-actions {
        display: flex;
        gap: 4px;
        opacity: 0;
        transition: opacity 0.15s;
        flex-shrink: 0;
      }
      .workhub-checklist-item:hover .workhub-checklist-actions {
        opacity: 1;
      }
      .workhub-task-detail-rail .workhub-checklist-actions {
        opacity: 1;
      }
      .workhub-checklist-edit,
      .workhub-checklist-expand,
      .workhub-checklist-remove {
        border: none;
        background: transparent;
        padding: 2px;
        border-radius: 3px;
        cursor: pointer;
        line-height: 1;
        font-size: 0.8rem;
        transition: background-color 0.15s;
      }
      .workhub-checklist-edit:hover {
        background: #e3ecfb;
      }
      .workhub-checklist-expand:hover {
        background: #eef4ff;
      }
      .workhub-checklist-remove:hover {
        background: #ffebee;
      }
      .workhub-checklist-add {
        display: flex;
        gap: 6px;
      }
      .workhub-checklist-add input {
        min-width: 0;
      }
      .workhub-checklist-add button {
        width: auto;
        border: 1px solid #d8e4fa;
        background: #f3f7ff;
        color: #3b5ba9;
        padding: 4px 10px;
        border-radius: 6px;
        font-size: 0.72rem;
        font-weight: 500;
        cursor: pointer;
      }
      .workhub-checklist-edit-input {
        min-width: 0;
        flex: 1;
        background: #ffffff;
        border: 1px solid #d8e4fa;
        border-radius: 4px;
        padding: 2px 6px;
        font-size: 0.74rem;
        color: #2c3f63;
        font-weight: 500;
      }
      .workhub-checklist-edit-input:focus {
        outline: 1px solid #2f4f84;
        outline-offset: 0;
        box-shadow: none;
      }
      .workhub-task-title-edit-input {
        width: 100%;
        min-width: 0;
        border: 1px solid #d8e4fa;
        border-radius: 4px;
        background: #ffffff;
        color: #17305c;
        font-size: 0.74rem;
        font-weight: 400;
        line-height: 1.2;
        padding: 1px 6px;
      }
      .workhub-task-title-edit-input:focus {
        outline: 1px solid #2f4f84;
        outline-offset: 0;
        box-shadow: none;
      }
      .workhub-checklist-item-details {
        border-left: 2px solid #dfe9ff;
        margin: 4px 0 8px 20px;
        padding: 8px 10px;
        background: #f8fbff;
        border-radius: 6px;
      }
      .workhub-checklist-detail-field {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-bottom: 8px;
      }
      .workhub-checklist-detail-field span {
        font-size: 0.72rem;
        color: #5f6f90;
        font-weight: 600;
      }
      .workhub-checklist-detail-field textarea {
        min-height: 54px;
        resize: vertical;
      }
      .workhub-checklist-url-row {
        display: flex;
        gap: 6px;
        margin-top: 6px;
      }
      .workhub-checklist-url-row input {
        min-width: 0;
        flex: 1;
      }
      .workhub-checklist-url-row button {
        width: auto;
      }
      .workhub-checklist-url-list {
        display: flex;
        flex-direction: column;
        gap: 4px;
        margin-top: 6px;
      }
      .workhub-checklist-url-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        padding: 4px 6px;
        border: 1px solid #e2ebff;
        border-radius: 5px;
        background: #ffffff;
      }
      .workhub-checklist-url-item a {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .workhub-task-image-item {
        align-items: center;
      }
      .workhub-task-image-link {
        display: flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
        flex: 1;
      }
      .workhub-task-image-link span {
        min-width: 0;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .workhub-task-image-thumb {
        width: 36px;
        height: 36px;
        object-fit: cover;
        border-radius: 6px;
        border: 1px solid #d8e4fa;
        background: #ffffff;
        flex-shrink: 0;
      }
      .workhub-checklist-url-item button {
        border: none;
        background: transparent;
        color: #6f7f9f;
        cursor: pointer;
      }
      .workhub-attachment-review-indicator {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        height: 20px;
        padding: 0 7px;
        border-radius: 999px;
        border: 1px solid #d6e4ff;
        background: #eef4ff;
        color: #2b4f86;
        font-size: 0.62rem;
        font-weight: 700;
        line-height: 1;
        white-space: nowrap;
        flex-shrink: 0;
      }
      .workhub-task-attachments {
        display: flex;
        flex-direction: column;
        gap: 5px;
        margin: 8px 0;
      }
      .workhub-task-attachments-head {
        font-size: 0.68rem;
        color: #5f6f90;
        font-weight: 600;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }
      .workhub-view-mode-toggle {
        display: flex;
        gap: 2px;
        background: #eef3fc;
        border-radius: 4px;
        padding: 2px;
        flex-shrink: 0;
      }
      .workhub-view-mode-toggle button {
        border: none;
        background: transparent;
        padding: 2px 7px;
        font-size: 0.6rem;
        color: #6f7f9f;
        border-radius: 3px;
        cursor: pointer;
        font-weight: 600;
        letter-spacing: 0.01em;
      }
      .workhub-view-mode-toggle button.active {
        background: #ffffff;
        color: #2a4f83;
        box-shadow: 0 1px 3px rgba(0,0,0,0.12);
      }

      /* ---- LIST mode: compact rows, no thumbnail ---- */
      .workhub-checklist-url-list.view-list .workhub-task-image-thumb {
        display: none;
      }
      .workhub-checklist-url-list.view-list .workhub-attachment-preview-btn {
        gap: 6px;
      }
      .workhub-checklist-url-list.view-list .workhub-checklist-url-item {
        padding: 3px 6px;
      }
      .workhub-checklist-url-list.view-list .workhub-attachment-preview-btn span,
      .workhub-checklist-url-list.view-list .workhub-task-image-link span:not(.workhub-task-attachment-icon) {
        font-size: 0.68rem;
        color: #2a4f83;
      }
      .workhub-checklist-url-list.view-list .workhub-task-image-link .workhub-task-attachment-icon {
        width: 16px;
        height: 16px;
        font-size: 0.75rem;
      }

      /* ---- THUMBNAIL mode: 44px thumb default ---- */
      .workhub-checklist-url-list.view-thumbnail .workhub-task-image-thumb {
        width: 44px;
        height: 44px;
      }

      /* ---- CARD mode: grid of tiles ---- */
      .workhub-checklist-url-list.view-card {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
        gap: 8px;
        padding-top: 4px;
        align-items: start;
      }
      .workhub-checklist-url-list.view-card .workhub-checklist-url-item {
        flex-direction: column;
        align-items: stretch;
        justify-content: flex-start;
        padding: 0;
        position: relative;
        overflow: hidden;
        border-radius: 8px;
      }
      .workhub-checklist-url-list.view-card .workhub-attachment-preview-btn {
        flex-direction: column;
        align-items: stretch;
        width: 100%;
        gap: 0;
        cursor: pointer;
      }
      .workhub-checklist-url-list.view-card .workhub-task-image-thumb {
        width: 100%;
        height: 110px;
        border-radius: 6px 6px 0 0;
        border: none;
        border-bottom: 1px solid #d8e4fa;
        object-fit: cover;
        flex-shrink: 0;
      }
      .workhub-checklist-url-list.view-card .workhub-attachment-preview-btn span {
        font-size: 0.63rem;
        padding: 5px 7px 5px;
        width: 100%;
        box-sizing: border-box;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        color: #2a4f83;
      }
      .workhub-checklist-url-list.view-card .workhub-checklist-url-item > button:last-child:not(.workhub-attachment-preview-btn) {
        position: absolute;
        top: 4px;
        right: 4px;
        background: rgba(255,255,255,0.92);
        border-radius: 50%;
        width: 20px;
        height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 10px;
        box-shadow: 0 1px 4px rgba(0,0,0,0.18);
        color: #2a4f83;
        border: none;
        padding: 0;
        cursor: pointer;
        z-index: 2;
      }
      .workhub-checklist-url-list.view-card .workhub-task-image-link {
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: #f4f8ff;
        border-bottom: 1px solid #d8e4fa;
        height: 110px;
        width: 100%;
        box-sizing: border-box;
        text-decoration: none;
        border-radius: 6px 6px 0 0;
        gap: 6px;
        flex-shrink: 0;
      }
      .workhub-checklist-url-list.view-card .workhub-task-image-link .workhub-task-attachment-icon {
        width: 32px;
        height: 32px;
        font-size: 1.4rem;
        background: transparent;
        border-radius: 0;
      }
      .workhub-checklist-url-list.view-card .workhub-task-image-link span:not(.workhub-task-attachment-icon) {
        font-size: 0.62rem;
        text-align: center;
        color: #2a4f83;
        padding: 0 6px 6px;
        width: 100%;
        box-sizing: border-box;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .workhub-checklist-url-list.view-card .workhub-attachment-review-indicator {
        position: absolute;
        top: 4px;
        left: 4px;
        z-index: 2;
        background: rgba(238, 244, 255, 0.95);
      }
      .workhub-detail-icon-row {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-bottom: 8px;
      }
      .workhub-detail-icon-wrap {
        position: relative;
      }
      .workhub-detail-icon-btn {
        width: 28px;
        height: 28px;
        border-radius: 999px;
        border: 1px solid #d4e2fb;
        background: #f4f8ff;
        color: #2d4f84;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }
      .workhub-detail-icon-menu {
        position: absolute;
        top: 32px;
        left: 0;
        min-width: 160px;
        background: #ffffff;
        border: 1px solid #dbe7ff;
        border-radius: 9px;
        padding: 5px;
        box-shadow: 0 8px 24px rgba(12, 32, 66, 0.16);
        z-index: 15;
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      .workhub-detail-icon-menu button {
        border: none;
        background: transparent;
        border-radius: 6px;
        padding: 5px;
        text-align: left;
        display: flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
        font-size: 0.74rem;
        color: #274168;
      }
      .workhub-detail-icon-menu button:hover,
      .workhub-detail-icon-menu button.is-active {
        background: #eef4ff;
      }
      .workhub-detail-icon-menu input[type="date"] {
        width: 100%;
      }
      .workhub-task-details-input {
        width: 100%;
        min-height: 94px;
        resize: vertical;
      }
      .workhub-task-detail-name-field {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-bottom: 10px;
      }
      .workhub-task-detail-name-field > span {
        font-size: 0.7rem;
        color: #60708f;
        font-weight: 700;
      }
      .workhub-task-name-input {
        min-height: 42px;
        resize: vertical;
        line-height: 1.3;
      }
      .workhub-file-upload-btn {
        border: 1px solid #d6e3fb;
        border-radius: 7px;
        background: #f6f9ff;
        color: #335487;
        font-size: 0.7rem;
        font-weight: 700;
        padding: 0 8px;
        height: 28px;
        display: inline-flex;
        align-items: center;
        cursor: pointer;
        white-space: nowrap;
      }
      .workhub-file-upload-btn input {
        display: none;
      }
      .workhub-attachment-preview-btn {
        border: none;
        background: transparent;
        padding: 0;
        text-align: left;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        color: #2a4f83;
        min-width: 0;
        cursor: pointer;
      }
      .workhub-attachment-preview-btn span {
        display: inline-block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .workhub-image-review-backdrop {
        z-index: 2500;
        padding: 10px;
      }
      .workhub-image-review-modal {
        width: calc(100vw - 20px);
        max-width: 1760px;
        height: auto;
        max-height: calc(100vh - 20px);
        overflow: hidden;
        display: flex;
        flex-direction: column;
        gap: 12px;
        background: linear-gradient(180deg, #ffffff 0%, #f7faff 100%);
        border: 1px solid #dbe7ff;
        color: #173056;
        padding: 14px;
      }
      .workhub-image-review-topbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        flex-shrink: 0;
        background: #ffffff;
        border: 1px solid #dbe7ff;
        border-radius: 12px;
        padding: 10px 12px;
        box-shadow: 0 10px 30px rgba(42, 79, 131, 0.08);
      }
      .workhub-image-review-topbar-title {
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 0;
      }
      .workhub-image-review-topbar-label {
        font-size: 1rem;
        font-weight: 800;
        color: #173056;
      }
      .workhub-image-review-topbar-hint {
        font-size: 0.75rem;
        color: #6b7da0;
      }
      .workhub-image-review-close-btn {
        flex-shrink: 0;
        border: 1px solid #c9d8f7 !important;
        background: #ffffff !important;
        color: #24497f !important;
        border-radius: 10px;
        padding: 6px 14px;
        font-size: 0.76rem;
        font-weight: 700;
      }
      .workhub-image-review-layout {
        display: flex;
        flex-direction: column;
        gap: 12px;
        min-height: 0;
      }
      .workhub-image-review-stage-wrap {
        display: flex;
        flex-direction: column;
        gap: 10px;
        min-height: 0;
      }
      .workhub-image-review-toolbar {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        flex-shrink: 0;
        background: #f8fbff;
        border: 1px solid #dbe7ff;
        border-radius: 12px;
        padding: 8px 10px;
      }
      .workhub-image-tool-group,
      .workhub-image-review-fit-group {
        display: inline-flex;
        gap: 6px;
      }
      .workhub-image-review-toolbar button,
      .workhub-image-inline-btn {
        border: 1px solid #cddcf8;
        background: #ffffff;
        color: #2a4f83;
        border-radius: 9px;
        padding: 5px 10px;
        font-size: 0.72rem;
        font-weight: 700;
        cursor: pointer;
      }
      .workhub-image-review-toolbar button.is-active,
      .workhub-image-inline-btn.is-primary {
        border-color: #2f64d8;
        background: #2f64d8;
        color: #ffffff;
      }
      .workhub-image-review-tip {
        font-size: 0.74rem;
        color: #6b7da0;
      }
      .workhub-image-review-stage {
        position: relative;
        border-radius: 16px;
        border: 1px solid #d7e3fb;
        overflow: hidden;
        background: linear-gradient(180deg, #edf4ff 0%, #e3eefc 100%);
        cursor: crosshair;
        width: 100%;
        max-width: calc(var(--img-aspect, 1.778) * (100vh - 260px));
        aspect-ratio: var(--img-aspect, 1.778);
        max-height: calc(100vh - 260px);
        align-self: center;
        box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.55);
      }
      .workhub-image-review-image {
        width: 100%;
        height: 100%;
        display: block;
      }
      .workhub-image-review-lines {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
      }
      .workhub-image-review-lines line {
        cursor: pointer;
        stroke: #ff5f56;
      }
      .workhub-image-marker {
        position: absolute;
        transform: translate(-50%, -50%);
        width: 28px;
        height: 28px;
        border: 2px solid #ffffff;
        border-radius: 999px;
        background: #2f64d8;
        color: #ffffff;
        font-weight: 800;
        font-size: 0.72rem;
        padding: 0;
        cursor: pointer;
        box-shadow: 0 10px 20px rgba(47, 100, 216, 0.28);
      }
      .workhub-image-marker.point {
        background: #d94f84;
        box-shadow: 0 10px 20px rgba(217, 79, 132, 0.24);
      }
      .workhub-image-marker.is-resolved {
        background: #1a9e5e;
        box-shadow: 0 10px 20px rgba(26, 158, 94, 0.28);
      }
      .workhub-image-marker-resolve-row {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 0.74rem;
        color: #304b74;
        cursor: pointer;
      }
      .workhub-image-marker-dot {
        display: none;
      }
      .workhub-image-review-panels {
        display: grid;
        grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr) minmax(0, 1fr);
        gap: 12px;
        min-height: 0;
      }
      .workhub-image-review-section {
        border: 1px solid #dbe7ff;
        border-radius: 12px;
        background: #ffffff;
        padding: 12px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        min-height: 0;
        box-shadow: 0 10px 24px rgba(42, 79, 131, 0.06);
      }
      .workhub-image-review-notes-section {
        min-height: 170px;
      }
      .workhub-image-review-notes-textarea,
      .workhub-image-marker-inline-editor textarea {
        width: 100%;
        box-sizing: border-box;
        min-height: 110px;
        resize: vertical;
        background: #f8fbff;
        border: 1px solid #d7e3fb;
        color: #173056;
        border-radius: 10px;
      }
      .workhub-image-review-section h4 {
        margin: 0;
        font-size: 0.8rem;
        color: #173056;
      }
      .workhub-image-review-section-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .workhub-image-review-toggle-btn {
        border: 1px solid #cddcf8;
        background: #f4f8ff;
        color: #2a4f83;
        border-radius: 999px;
        padding: 4px 10px;
        font-size: 0.68rem;
        font-weight: 700;
        cursor: pointer;
      }
      .workhub-image-review-mini-row {
        display: flex;
        gap: 8px;
      }
      .workhub-image-review-mini-row button {
        width: auto;
        white-space: nowrap;
      }
      .workhub-image-review-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
        min-height: 0;
      }
      .workhub-image-review-comment-item,
      .workhub-image-review-check-item {
        border: 1px solid #e1ebff;
        background: #f9fbff;
        border-radius: 10px;
        padding: 9px 10px;
      }
      .workhub-image-review-comment-item strong {
        font-size: 0.74rem;
        color: #173056;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .workhub-image-review-comment-item p {
        margin: 5px 0;
        font-size: 0.77rem;
        color: #304b74;
      }
      .workhub-image-review-comment-item span {
        font-size: 0.69rem;
        color: #7a8db1;
      }
      .workhub-pin-badge {
        width: 18px;
        height: 18px;
        border-radius: 999px;
        background: #2f64d8;
        color: #ffffff;
        font-size: 0.64rem;
        display: inline-grid;
        place-items: center;
      }
      .workhub-image-review-check-item {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .workhub-image-review-check-item-row {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        width: 100%;
        gap: 8px;
      }
      .workhub-image-review-check-item-row > label {
        flex: 1;
        min-width: 0;
      }
      .workhub-image-review-check-item label {
        display: inline-flex;
        align-items: center;
        gap: 8px;
        min-width: 0;
      }
      .workhub-image-review-check-item span {
        font-size: 0.74rem;
        color: #304b74;
      }
      .workhub-round-check {
        cursor: pointer;
      }
      .workhub-round-check input {
        position: absolute;
        opacity: 0;
        pointer-events: none;
      }
      .workhub-round-check-indicator {
        width: 15px;
        height: 15px;
        border: 2px solid #89a4d6;
        border-radius: 999px;
        background: #ffffff;
        flex-shrink: 0;
      }
      .workhub-round-check input:checked + .workhub-round-check-indicator {
        border-color: #2f64d8;
        background: #2f64d8;
      }
      .workhub-image-review-check-item button,
      .workhub-image-review-marker-actions button {
        border: 1px solid #cddcf8;
        background: #ffffff;
        color: #2a4f83;
        border-radius: 8px;
        cursor: pointer;
        padding: 4px 8px;
        font-size: 0.7rem;
        font-weight: 700;
      }
      .workhub-image-review-check-item.is-done {
        opacity: 0.72;
      }
      .workhub-image-review-check-item.is-done .workhub-round-check {
        text-decoration: line-through;
      }
      .workhub-image-review-marker-item {
        gap: 4px;
      }
      .workhub-image-review-marker-actions {
        display: inline-flex;
        gap: 8px;
        margin-top: 6px;
      }
      .workhub-image-marker-inline-editor {
        position: absolute;
        transform: translate(8px, -50%);
        width: min(280px, calc(100vw - 48px));
        border: 1px solid #d7e3fb;
        border-radius: 12px;
        background: #ffffff;
        box-shadow: 0 16px 40px rgba(42, 79, 131, 0.18);
        padding: 10px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        z-index: 5;
      }
      .workhub-image-marker-inline-editor textarea {
        min-height: 68px;
      }
      .workhub-image-review-pin-layer {
        position: absolute;
        inset: 0;
        pointer-events: none;
      }
      .workhub-image-review-pin-layer .workhub-image-marker {
        pointer-events: auto;
        cursor: grab;
      }
      .workhub-image-review-pin-layer .workhub-image-marker:active {
        cursor: grabbing;
      }
      .workhub-image-marker-editor-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
      }
      .workhub-delete-prompt-backdrop {
        z-index: 3000;
      }
      .workhub-delete-prompt-modal {
        width: min(400px, calc(100vw - 24px));
      }
      .workhub-delete-prompt-filename {
        display: flex;
        align-items: center;
        gap: 8px;
        background: #f4f8ff;
        border: 1px solid #d8e5fb;
        border-radius: 8px;
        padding: 8px 12px;
        font-size: 0.76rem;
        color: #2a4f83;
        margin-bottom: 16px;
        overflow: hidden;
      }
      .workhub-delete-prompt-filename span:last-child {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        font-family: monospace;
        font-size: 0.72rem;
      }
      .workhub-delete-prompt-actions {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .workhub-checklist-url-row.compact-row {
        gap: 5px;
      }
      .workhub-checklist-url-row.compact-row input {
        min-height: 28px;
        padding: 5px 7px;
        font-size: 0.74rem;
      }
      .workhub-checklist-url-row.compact-row button {
        min-height: 28px;
        padding: 0 8px;
        font-size: 0.72rem;
      }
      .workhub-task-attachment-icon {
        width: 20px;
        height: 20px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        border-radius: 5px;
        background: #eef4ff;
        flex-shrink: 0;
      }
      .workhub-priority-icon {
        font-size: 0.9rem;
        margin-right: 4px;
      }
      .workhub-field-grid.two,
      .workhub-detail-card {
        border-radius: 11px;
        padding: 16px;
        background: #f9fbff;
        border: 1px solid #e3ecfb;
        margin: 12px 0;
      }
      .workhub-detail-grid {
        display: grid;
        gap: 12px;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        margin: 16px 0;
      }
      .workhub-detail-grid label {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .workhub-detail-grid label span {
        font-size: 0.7rem;
        color: #60708f;
        font-weight: 700;
      }
      .workhub-project-detail-grid {
        grid-template-columns: 1fr;
        gap: 10px;
        margin: 10px 0 12px;
      }
      .workhub-project-color-select {
        position: relative;
      }
      .workhub-project-color-select-btn {
        width: 100%;
        min-height: 34px;
        border-radius: 9px;
        border: 1px solid #d8e4fa;
        background: #ffffff;
        color: #19315d;
        padding: 6px 9px;
        font: inherit;
        font-size: 0.82rem;
        line-height: 1.2;
        font-weight: 400;
        display: inline-flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        cursor: pointer;
      }
      .workhub-project-color-select-btn.is-open,
      .workhub-project-color-select-btn:hover {
        border-color: #a5bde8;
        background: #f8fbff;
      }
      .workhub-project-color-select-btn:disabled {
        opacity: 0.65;
        cursor: not-allowed;
      }
      .workhub-project-color-swatch {
        width: 14px;
        height: 14px;
        border-radius: 999px;
        border: 1px solid rgba(31, 50, 94, 0.35);
        flex: 0 0 auto;
      }
      .workhub-project-color-caret {
        margin-left: auto;
        color: #62789f;
        font-size: 0.7rem;
      }
      .workhub-project-color-select-menu {
        position: absolute;
        top: calc(100% + 6px);
        left: 0;
        right: 0;
        border: 1px solid #dbe7ff;
        border-radius: 10px;
        background: #ffffff;
        box-shadow: 0 12px 26px rgba(25, 45, 80, 0.16);
        z-index: 45;
        overflow: hidden;
      }
      .workhub-project-color-option {
        width: 100%;
        border: 0;
        border-bottom: 1px solid #edf2fb;
        background: #ffffff;
        color: #244374;
        text-align: left;
        font: inherit;
        font-size: 0.78rem;
        font-weight: 400;
        padding: 8px 10px;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
      }
      .workhub-project-color-option:last-child {
        border-bottom: 0;
      }
      .workhub-project-color-option:hover,
      .workhub-project-color-option.is-active {
        background: #f3f8ff;
      }
      .workhub-project-detail-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 10px;
        flex-wrap: wrap;
      }
      .workhub-project-detail-actions .workhub-primary-btn,
      .workhub-project-detail-actions .workhub-ghost-btn {
        font-weight: 400;
      }
      .workhub-project-detail-readonly-note {
        margin-top: 10px;
        font-size: 0.74rem;
        color: #647392;
      }
      .workhub-detail-meta {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-top: 16px;
        padding-top: 12px;
        border-top: 1px solid #e3ecfb;
      }
      .workhub-detail-meta span {
        font-size: 0.8rem;
        color: #647392;
        line-height: 1.25;
      }
      .workhub-field-grid.two.compact {
        gap: 6px;
      }
      .workhub-workspace-summary {
        border-radius: 11px;
        padding: 8px;
        background: #f7faff;
        border: 1px solid #e1ebfb;
      }
      .workhub-workspace-summary.bright {
        margin-top: 8px;
      }
      .workhub-color-pills {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        margin-top: 6px;
      }
      .workhub-focus-metrics,
      .workhub-member-picker {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      .workhub-switcher {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
        margin: 12px 0;
      }
      .workhub-switcher.compact-switcher {
        margin: 10px 0;
      }
      .workhub-modal-form.compact-create {
        gap: 10px;
      }
      .workhub-create-date-grid {
        gap: 8px;
      }
      .workhub-create-actions {
        margin-top: 4px;
        padding-top: 10px;
        border-top: 1px solid #e2ebfb;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        flex-wrap: wrap;
      }
      .workhub-create-actions button {
        margin-top: 0;
      }
      .workhub-create-actions-group {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
        margin-left: auto;
      }
      .workhub-create-option-toggle {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        font-size: 0.74rem;
        color: #445f8c;
        font-weight: 600;
      }
      .workhub-create-option-toggle input {
        margin: 0;
      }
      .workhub-icon-field span {
        font-size: 0.76rem;
        font-weight: 700;
        color: #2a446f;
      }
      .workhub-collapse-toggle {
        border: 1px solid #d8e4fa;
        background: #f7faff;
        color: #37598f;
        border-radius: 8px;
        padding: 6px 10px;
        font: inherit;
        font-size: 0.74rem;
        font-weight: 700;
        line-height: 1;
        cursor: pointer;
        text-align: left;
      }
      .workhub-collapsible-panel {
        border: 1px solid #e1ebfb;
        background: #fbfdff;
        border-radius: 10px;
        padding: 10px;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .workhub-field-grid.compact-core-grid {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      .workhub-color-pill {
        width: 20px;
        height: 20px;
        border-radius: 999px;
        border: 2px solid transparent;
        cursor: pointer;
      }
      .workhub-color-pill.active {
        border-color: #1f325e;
      }
      .workhub-task-layout {
        display: grid;
        gap: 8px;
        grid-template-columns: minmax(0, 1.1fr) minmax(290px, 0.9fr);
      }
      .workhub-task-group {
        border-radius: 11px;
        border: 1px solid #e3ecfb;
        background: #f9fbff;
        width: 100%;
        overflow: visible;
      }
      .workhub-task-group-head {
        padding: 7px 8px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #f1f6ff;
        border-bottom: 1px solid #e0eafb;
      }
      .workhub-task-group-head span {
        color: #5870a4;
        font-size: 0.7rem;
        font-weight: 700;
      }
      .workhub-task-group-body {
        padding: 0;
        display: flex;
        flex-direction: column;
        gap: 0;
      }
      .workhub-task-row.workhub-task-row-draft {
        cursor: default;
        background: #fcfdff;
      }
      .workhub-task-row.workhub-task-row-draft:hover {
        background: #f7faff;
        border-color: #e3ecfb;
      }
      .workhub-task-row-draft .workhub-task-row-main {
        padding: 3px 7px;
      }
      .workhub-task-row-draft .workhub-task-col.details input[type="checkbox"] {
        opacity: 0.55;
        pointer-events: none;
      }
      .workhub-quick-add-title-input {
        background: transparent;
        border-color: transparent;
        padding-left: 0;
      }
      .workhub-quick-add-title-input::placeholder {
        color: #aabbd8;
      }
      .workhub-quick-add-title-input:focus {
        border-color: #d8e4fa;
        background: #ffffff;
        padding-left: 6px;
      }
      .workhub-task-status-btn.workhub-task-status-btn-static {
        pointer-events: none;
        cursor: default;
      }
      .workhub-quick-add-menu-wrap {
        position: relative;
      }
      .workhub-quick-add-trigger {
        margin-top: 0;
      }
      .workhub-quick-add-assignee-trigger {
        border: none;
        background: transparent;
        padding: 0;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }
      .workhub-quick-add-select,
      .workhub-quick-add-date {
        width: 100%;
        min-width: 0;
        border: 1px solid #d8e4fa;
        border-radius: 6px;
        background: #ffffff;
        color: #17305c;
        font: inherit;
        font-size: 0.71rem;
        line-height: 1.2;
        padding: 4px 6px;
        outline: none;
      }
      .workhub-quick-add-select:focus,
      .workhub-quick-add-date:focus {
        border-color: #7aa2ff;
      }
      .workhub-quick-add-select {
        cursor: pointer;
      }
      .workhub-quick-add-project-select {
        min-width: 92px;
      }
      .workhub-quick-add-menu {
        z-index: 40;
      }
      .workhub-quick-add-menu .workhub-assignee-badge,
      .workhub-quick-add-menu .workhub-assignee-fallback {
        width: 20px;
        height: 20px;
      }
      .workhub-quick-add-confirm {
        border: 1px solid #5f88ee;
        background: #4d84ff;
        color: #fff;
        border-radius: 6px;
        padding: 4px 10px;
        font: inherit;
        font-size: 0.72rem;
        font-weight: 700;
        cursor: pointer;
        white-space: nowrap;
        margin-top: 0;
      }
      .workhub-quick-add-confirm:hover {
        background: #3a6fe0;
      }
      .workhub-quick-add-placeholder {
        display: block;
        min-height: 26px;
      }
      .workhub-quick-add-inline-note {
        color: #9aaac2;
        font-size: 0.69rem;
        white-space: nowrap;
      }
      .workhub-task-table-head,
      .workhub-task-row-grid {
        display: grid;
        grid-template-columns: minmax(0, 2.6fr) 56px 72px minmax(108px, 1fr) 78px minmax(108px, 0.95fr) 56px;
        gap: 6px;
        align-items: center;
        width: 100%;
        box-sizing: border-box;
      }
      .workhub-col-more,
      .workhub-task-col.more {
        display: none;
      }
      .workhub-task-table-head {
        padding: 7px 8px;
        background: #f4f8ff;
        border-top: 1px solid #e0eafb;
        border-bottom: 1px solid #e0eafb;
      }
      .workhub-task-table-head.shared {
        position: sticky;
        top: 0;
        z-index: 3;
      }
      .workhub-task-table-head span {
        color: #5d7095;
        font-size: 0.68rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .workhub-select-all-head {
        display: inline-flex;
        align-items: center;
        gap: 7px;
      }
      .workhub-select-all-head input {
        margin: 0;
      }
      .workhub-task-row {
        cursor: pointer;
        transition: background-color 0.18s ease, border-color 0.18s ease;
        border-top: 1px solid #e2e8f0;
        border-radius: 0;
        background: #ffffff;
        position: relative;
      }
      .workhub-task-row.has-open-menu {
        z-index: 30;
      }
      .workhub-task-row:first-child {
        border-top: 0;
      }
      .workhub-task-row.is-alt {
        background: #f1f3f5;
      }
      .workhub-task-row:hover {
        background: #f8fbff;
        border-color: #c8d2df;
      }
      .workhub-task-row.is-selected {
        background: #dfe8f8;
        border-color: #8ea4c8;
        box-shadow: inset 3px 0 0 #4f74bd;
      }
      .workhub-task-row.is-checked {
        background: #e7eef9;
        border-color: #a8bad8;
      }
      .workhub-task-row.is-drop-target {
        box-shadow: inset 0 2px 0 #4d84ff;
      }
      .workhub-task-row.is-dragging {
        opacity: 0.5;
      }
      .workhub-task-row:hover .workhub-task-row-title strong {
        color: #1f3451;
      }
      .workhub-task-row.is-selected .workhub-task-row-title strong {
        color: #15386a;
      }
      .workhub-task-row-main {
        display: flex;
        flex-direction: column;
        gap: 0;
        min-width: 0;
        padding: 2px 7px;
      }
      .workhub-task-row-grid {
        min-width: 0;
      }
      .workhub-task-col {
        min-width: 0;
      }
      .workhub-task-col.details {
        display: grid;
        grid-template-columns: 16px 14px minmax(0, 1fr);
        gap: 3px;
        align-items: center;
      }
      .workhub-task-col.details input[type="checkbox"] {
        width: 13px;
        height: 13px;
        margin: 0;
      }
      .workhub-task-drag-handle {
        border: 0;
        background: transparent;
        color: #8ea1c2;
        font: inherit;
        font-size: 0.78rem;
        line-height: 1;
        padding: 0;
        width: 16px;
        height: 12px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: grab;
        user-select: none;
      }
      .workhub-task-drag-handle:hover {
        color: #4d84ff;
      }
      .workhub-task-drag-handle:active {
        cursor: grabbing;
      }
      .workhub-task-drag-handle-placeholder {
        color: transparent;
        cursor: default;
      }
      .workhub-task-col.details .workhub-task-row-title strong {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .workhub-task-col.status,
      .workhub-task-col.assignee {
        display: flex;
      }
      .workhub-task-col.checklist-inline,
      .workhub-task-col.actions-inline {
        display: flex;
        justify-content: flex-end;
      }
      .workhub-task-col.actions-inline {
        align-items: center;
        gap: 6px;
      }
      .workhub-task-col.status,
      .workhub-task-col.priority {
        justify-content: center;
        position: relative;
      }
      .workhub-task-status-btn {
        border: 1px solid color-mix(in srgb, var(--status-color, #8aa0c7) 45%, #dbe6ff);
        background: #f9fbff;
        width: 18px;
        height: 18px;
        border-radius: 999px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        position: relative;
      }
      .workhub-task-status-menu {
        position: absolute;
        top: 30px;
        left: 0;
        z-index: 90;
        min-width: 150px;
        display: flex;
        flex-direction: column;
        gap: 2px;
        border: 1px solid #dce8ff;
        background: #ffffff;
        border-radius: 8px;
        box-shadow: 0 8px 24px rgba(12, 32, 66, 0.16);
        padding: 4px;
      }
      .workhub-task-status-menu button {
        border: 0;
        border-radius: 6px;
        background: transparent;
        text-align: left;
        padding: 6px 8px;
        color: #274168;
        font-size: 0.73rem;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .workhub-task-status-menu button:hover,
      .workhub-task-status-menu button.is-active {
        background: #eff5ff;
      }
      .status-dot {
        width: 7px;
        height: 7px;
        border-radius: 999px;
        background: var(--status-color, #8aa0c7);
        flex-shrink: 0;
      }
      .workhub-task-status-btn .status-dot {
        width: 5px;
        height: 5px;
        box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.95);
      }
      .status-icon {
        line-height: 1;
        font-size: 0.72rem;
      }
      .workhub-assignee-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-width: 0;
      }
      button.workhub-task-assignee-btn {
        border: none;
        background: transparent;
        padding: 0;
        cursor: pointer;
        border-radius: 999px;
      }
      button.workhub-task-assignee-btn:hover .workhub-assignee-fallback,
      button.workhub-task-assignee-btn:hover img {
        transform: translateY(-1px);
      }
      .workhub-task-col.assignee {
        position: relative;
      }
      .workhub-task-assignee-menu {
        position: absolute;
        top: 28px;
        left: 0;
        min-width: 140px;
        background: #ffffff;
        border: 1px solid #dbe7ff;
        border-radius: 9px;
        padding: 5px;
        box-shadow: 0 8px 24px rgba(12, 32, 66, 0.16);
        z-index: 20;
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      .workhub-task-assignee-menu button {
        border: 0;
        border-radius: 6px;
        background: transparent;
        text-align: left;
        padding: 5px 8px;
        color: #274168;
        font-size: 0.73rem;
        cursor: pointer;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .workhub-task-assignee-menu button:hover,
      .workhub-task-assignee-menu button.is-active {
        background: #eff5ff;
      }
      .workhub-assignee-badge img,
      .workhub-assignee-fallback {
        width: 18px;
        height: 18px;
        border-radius: 999px;
        flex-shrink: 0;
        border: 1px solid #b9caec;
        box-shadow: 0 0 0 2px #eef4ff;
      }
      .workhub-assignee-badge img {
        object-fit: cover;
        background: #ffffff;
      }
      .workhub-assignee-fallback {
        display: grid;
        place-items: center;
        background: #edf4ff;
        color: #35548a;
      }
      .workhub-assignee-initials {
        display: grid;
        place-items: center;
        background: #d4e3ff;
        color: #274168;
        font-size: 0.56rem;
        font-weight: 700;
        letter-spacing: 0.03em;
        width: 18px;
        height: 18px;
        border-radius: 999px;
        flex-shrink: 0;
        border: 1px solid #b9caec;
        box-shadow: 0 0 0 2px #eef4ff;
      }
      .workhub-task-people {
        display: flex;
        align-items: center;
        gap: 4px;
      }
      .workhub-task-creator-badge {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: default;
      }
      .workhub-task-creator-badge img,
      .workhub-task-creator-badge .workhub-assignee-initials {
        border-color: #2f66cc;
        box-shadow: 0 0 0 2px #cddfff;
      }
      .workhub-task-assignee-btn img,
      .workhub-task-assignee-btn .workhub-assignee-fallback {
        border-color: transparent;
        box-shadow: none;
      }
      .workhub-task-assignee-btn.is-creator img,
      .workhub-task-assignee-btn.is-creator .workhub-assignee-fallback {
        border-color: #2f66cc;
        box-shadow: 0 0 0 2px #cddfff;
      }
      .workhub-task-col.due span {
        display: block;
        font-size: 0.74rem;
        color: #4f648c;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .workhub-task-col.due span.is-set {
        color: #cf4e67;
      }
      .workhub-task-attachment-indicator {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 14px;
        height: 14px;
        color: #e05567;
        font-size: 0.82rem;
        line-height: 1;
        flex-shrink: 0;
      }
      .workhub-priority-pill {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        font-size: 0.76rem;
        font-weight: 700;
      }
      .workhub-priority-pill .priority-flag {
        font-size: 0.9rem;
        line-height: 1;
      }
      .workhub-priority-pill.priority-urgent,
      .workhub-priority-pill.priority-high {
        color: #d09200;
      }
      .workhub-priority-pill.priority-medium {
        color: #315fd6;
      }
      .workhub-priority-pill.priority-low {
        color: #6f7d96;
      }
      .workhub-priority-indicator {
        width: 18px;
        height: 18px;
        border-radius: 999px;
        display: inline-grid;
        place-items: center;
        font-size: 0.66rem;
        border: 1px solid transparent;
        background: #f4f7fd;
        cursor: pointer;
      }
      .workhub-priority-indicator.priority-urgent,
      .workhub-priority-indicator.priority-high {
        color: #d09200;
        border-color: #f0d9a8;
        background: #fff8ea;
      }
      .workhub-priority-indicator.priority-medium {
        color: #315fd6;
        border-color: #c8d9ff;
        background: #edf3ff;
      }
      .workhub-priority-indicator.priority-low {
        color: #6f7d96;
        border-color: #d7deea;
        background: #f5f7fb;
      }
      .workhub-task-priority-menu {
        position: absolute;
        top: 32px;
        right: 0;
        z-index: 90;
        min-width: 142px;
        display: flex;
        flex-direction: column;
        gap: 2px;
        border: 1px solid #dce8ff;
        background: #ffffff;
        border-radius: 8px;
        box-shadow: 0 8px 24px rgba(12, 32, 66, 0.16);
        padding: 4px;
      }
      .workhub-task-priority-menu button {
        border: 0;
        border-radius: 6px;
        background: transparent;
        text-align: left;
        padding: 4px 6px;
        color: #274168;
        font-size: 0.73rem;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        gap: 6px;
      }
      .workhub-task-priority-menu button:hover,
      .workhub-task-priority-menu button.is-active {
        background: #eff5ff;
      }
      .workhub-task-col.more {
        justify-content: flex-end;
        position: relative;
      }
      .workhub-task-more-btn {
        border: 1px solid #d9e5fa;
        background: #f8fbff;
        color: #4e6490;
        width: 20px;
        height: 20px;
        border-radius: 6px;
        line-height: 1;
        cursor: pointer;
      }
      .workhub-task-col.actions-inline .workhub-gear-btn {
        width: 20px;
        height: 20px;
        border-radius: 6px;
        font-size: 0.66rem;
      }
      .workhub-task-more-menu {
        position: absolute;
        top: 30px;
        right: 0;
        z-index: 90;
        display: flex;
        flex-direction: column;
        gap: 2px;
        min-width: 138px;
        border: 1px solid #dce8ff;
        background: #ffffff;
        border-radius: 8px;
        box-shadow: 0 8px 24px rgba(12, 32, 66, 0.16);
        padding: 4px;
      }
      .workhub-task-more-menu button {
        border: 0;
        border-radius: 6px;
        background: transparent;
        text-align: left;
        padding: 6px 8px;
        color: #274168;
        font-size: 0.73rem;
        cursor: pointer;
      }
      .workhub-task-more-menu button:hover {
        background: #eff5ff;
      }
      .workhub-task-row-meta {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }
      .workhub-notes-textarea {
        min-height: 200px;
      }
      .workhub-notes-card {
        margin-top: 8px;
      }
      .workhub-empty-state,
      .workhub-empty-column,
      .workhub-admin-note {
        padding: 9px;
        border-radius: 11px;
        font-size: 0.8rem;
        color: #627291;
        text-align: center;
        background: #f8fbff;
        border: 1px dashed #cdddf8;
      }
      .workhub-empty-projects-cta {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
      }
      .workhub-empty-projects-cta .workhub-primary-mini {
        margin-top: 0;
      }
      .workhub-empty-state.tall {
        min-height: 100px;
        display: grid;
        place-items: center;
      }
      .workhub-admin-note {
        color: #946200;
      }
      .workhub-no-access-shell {
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(150deg, #eef4ff 0%, #f4f0ff 50%, #eef4ff 100%);
      }
      .workhub-no-access-card {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 14px;
        background: #ffffff;
        border: 1px solid #dce8ff;
        border-radius: 20px;
        padding: 44px 48px 36px;
        max-width: 420px;
        width: calc(100vw - 32px);
        box-shadow: 0 20px 60px rgba(58, 92, 168, 0.10), 0 2px 8px rgba(58, 92, 168, 0.06);
        text-align: center;
      }
      .workhub-no-access-icon {
        font-size: 2.6rem;
        line-height: 1;
        filter: grayscale(0.2);
      }
      .workhub-no-access-brand {
        font-size: 1.05rem;
        font-weight: 800;
        letter-spacing: 0.08em;
        color: #3a5bd9;
        text-transform: uppercase;
      }
      .workhub-no-access-title {
        margin: 0;
        font-size: 1.45rem;
        font-weight: 700;
        color: #0f1f3d;
        line-height: 1.2;
      }
      .workhub-no-access-body {
        margin: 0;
        font-size: 0.88rem;
        color: #6278a0;
        line-height: 1.6;
        max-width: 320px;
      }
      .workhub-no-access-user {
        display: flex;
        align-items: center;
        gap: 9px;
        background: #f4f7ff;
        border: 1px solid #dce7ff;
        border-radius: 999px;
        padding: 6px 14px 6px 6px;
        font-size: 0.8rem;
        color: #4a6098;
        font-weight: 500;
        margin-top: 4px;
      }
      .workhub-no-access-avatar {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: linear-gradient(135deg, #5a7ee8 0%, #3a5bd9 100%);
        color: #fff;
        font-size: 0.75rem;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
      }
      .workhub-center-card {
        max-width: 520px;
        margin: 9vh auto 0;
        border-radius: 18px;
        padding: 18px;
        text-align: center;
      }
      .workhub-spinner {
        width: 44px;
        height: 44px;
        border-radius: 999px;
        border: 4px solid rgba(148, 163, 184, 0.22);
        border-top-color: #4f8cff;
        margin: 0 auto 12px;
        animation: workhubSpin 0.9s linear infinite;
      }
      input,
      textarea,
      select {
        width: 100%;
        border-radius: 9px;
        border: 1px solid #d8e4fa;
        background: #ffffff;
        color: #19315d;
        padding: 7px 9px;
        font: inherit;
        font-size: 0.82rem;
        line-height: 1.2;
        box-sizing: border-box;
      }
      textarea {
        resize: vertical;
      }
      input::placeholder,
      textarea::placeholder {
        color: #91a0bb;
      }
      .workhub-modal-backdrop {
        position: fixed;
        inset: 0;
        z-index: 2000;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(12, 20, 36, 0.64);
        overflow-y: auto;
        padding: 24px 12px 12px;
      }
      .workhub-modal {
        width: min(520px, calc(100vw - 24px));
        max-height: calc(100vh - 40px);
        overflow-y: auto;
        background: #ffffff;
        border: 1px solid #dbe7ff;
        border-radius: 14px;
        box-shadow: 0 24px 60px rgba(18, 33, 63, 0.16);
        padding: 24px;
      }
      .workhub-modal.large {
        width: min(720px, calc(100vw - 24px));
      }
      .workhub-modal.workhub-workspace-settings-modal {
        width: min(980px, calc(100vw - 24px));
      }
      .workhub-settings-tabs {
        display: flex;
        gap: 8px;
        margin-bottom: 12px;
      }
      .workhub-settings-tab {
        border: 1px solid #d8e4fa;
        background: #f8fbff;
        color: #5f6f91;
        border-radius: 8px;
        padding: 6px 10px;
        font-size: 0.78rem;
        font-weight: 700;
        cursor: pointer;
      }
      .workhub-settings-tab.is-active {
        background: #ecf3ff;
        border-color: #87a9ff;
        color: #224ba6;
      }
      .workhub-settings-tab-panel {
        display: flex;
        flex-direction: column;
        gap: 14px;
        max-height: 60vh;
        overflow-y: auto;
        padding-right: 4px;
      }
      .workhub-collapsible-danger {
        border: 1px solid #f3cccc;
        border-radius: 10px;
        background: #fffafa;
        padding: 0;
        overflow: hidden;
      }
      .workhub-collapsible-danger > summary {
        list-style: none;
        cursor: pointer;
        padding: 10px 12px;
        font-size: 0.82rem;
        font-weight: 800;
        color: #a33636;
        border-bottom: 1px solid #f2d6d6;
      }
      .workhub-collapsible-danger[open] > summary {
        background: #fff2f2;
      }
      .workhub-user-list-head,
      .workhub-user-list-row {
        display: grid;
        grid-template-columns: minmax(140px, 1fr) minmax(180px, 1fr) minmax(150px, 1fr) 84px;
        gap: 8px;
        align-items: center;
      }
      .workhub-user-list-head {
        font-size: 0.7rem;
        font-weight: 700;
        text-transform: uppercase;
        color: #6e82a8;
        border-bottom: 1px solid #e3ecfb;
        padding-bottom: 6px;
      }
      .workhub-user-list-body {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .workhub-user-list-row {
        border: 1px solid #e3ecfb;
        border-radius: 8px;
        padding: 7px 8px;
        font-size: 0.77rem;
        color: #35517f;
      }
      /* ── invite section ── */
      .workhub-invite-section {
        border: 1px solid #dce8ff;
        border-radius: 10px;
        padding: 14px 16px;
        background: #f9fbff;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .workhub-invite-section-disabled {
        opacity: 0.5;
        pointer-events: none;
        user-select: none;
        filter: grayscale(0.4);
      }
      .workhub-invite-coming-soon {
        font-size: 0.7rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: #8a9bbf;
        background: #edf1fb;
        border: 1px solid #d0daef;
        border-radius: 999px;
        padding: 2px 9px;
        white-space: nowrap;
        flex-shrink: 0;
      }
      .workhub-invite-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
      }
      .workhub-invite-header strong {
        font-size: 0.88rem;
        font-weight: 700;
        color: #1a3060;
        margin-right: 6px;
      }
      .workhub-invite-header span {
        font-size: 0.78rem;
        color: #7b90b8;
      }
      .workhub-invite-input-row {
        display: flex;
        gap: 8px;
      }
      .workhub-invite-input-row input {
        flex: 1;
        min-width: 0;
        padding: 7px 10px;
        border: 1px solid #c8d9f5;
        border-radius: 7px;
        font-size: 0.84rem;
        color: #1a3060;
        background: #fff;
        outline: none;
      }
      .workhub-invite-input-row input:focus {
        border-color: #5a7ee8;
        box-shadow: 0 0 0 3px rgba(90,126,232,0.13);
      }
      .workhub-invite-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
      }
      .workhub-invite-chip {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        background: #e8eeff;
        border: 1px solid #c2d1f7;
        border-radius: 999px;
        padding: 3px 6px 3px 10px;
        font-size: 0.78rem;
        color: #2a4a8c;
        font-weight: 500;
      }
      .workhub-invite-chip-actions {
        display: flex;
        align-items: center;
        gap: 2px;
      }
      .workhub-invite-chip-send {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 22px;
        height: 22px;
        border-radius: 50%;
        font-size: 0.78rem;
        color: #4a6fa5;
        text-decoration: none;
        cursor: pointer;
        transition: background 0.12s;
      }
      .workhub-invite-chip-send:hover {
        background: #ccdafc;
        color: #1a3487;
      }
      .workhub-invite-chip-remove {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
        border: none;
        border-radius: 50%;
        background: transparent;
        color: #8a9bbf;
        font-size: 1rem;
        line-height: 1;
        cursor: pointer;
        transition: background 0.12s, color 0.12s;
        padding: 0;
      }
      .workhub-invite-chip-remove:hover {
        background: #fcd4d4;
        color: #b03030;
      }
      /* ── invite tracking table ── */
      .workhub-invite-table {
        display: flex;
        flex-direction: column;
        border: 1px solid #dce8ff;
        border-radius: 9px;
        overflow: hidden;
      }
      .workhub-invite-table-head {
        display: grid;
        grid-template-columns: 1fr 160px 160px;
        gap: 8px;
        padding: 7px 12px;
        background: #f2f6ff;
        border-bottom: 1px solid #dce8ff;
        font-size: 0.7rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: #6878a8;
      }
      .workhub-invite-table-row {
        display: grid;
        grid-template-columns: 1fr 160px 160px;
        gap: 8px;
        align-items: center;
        padding: 9px 12px;
        border-bottom: 1px solid #eef2fb;
        background: #fff;
        transition: background 0.1s;
      }
      .workhub-invite-table-row:last-child {
        border-bottom: none;
      }
      .workhub-invite-table-row:hover {
        background: #fafcff;
      }
      .workhub-invite-email {
        font-size: 0.82rem;
        color: #2a4070;
        font-weight: 500;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .workhub-invite-status {
        display: flex;
        align-items: center;
        gap: 5px;
        font-size: 0.75rem;
        font-weight: 600;
        white-space: nowrap;
      }
      .workhub-invite-status-dot {
        font-size: 0.72rem;
        line-height: 1;
      }
      .invite-status-waiting {
        color: #8a9bbf;
      }
      .invite-status-pending {
        color: #8a6200;
      }
      .invite-status-active {
        color: #1e6e45;
      }
      .invite-status-suspended {
        color: #922;
      }
      .workhub-invite-row-actions {
        display: flex;
        align-items: center;
        gap: 6px;
        justify-content: flex-end;
      }
      .workhub-invite-resend {
        font-size: 0.73rem;
        color: #4a6fa5;
        text-decoration: none;
        padding: 3px 8px;
        border: 1px solid #c2d4f5;
        border-radius: 5px;
        background: #f0f5ff;
        white-space: nowrap;
        cursor: pointer;
        transition: background 0.1s, border-color 0.1s;
      }
      .workhub-invite-resend:hover {
        background: #deeaff;
        border-color: #87a9ff;
      }
      .workhub-invite-revoke {
        font-size: 0.73rem;
        color: #9a3030;
        background: transparent;
        border: 1px solid #f0c4c4;
        border-radius: 5px;
        padding: 3px 8px;
        cursor: pointer;
        white-space: nowrap;
        transition: background 0.1s, border-color 0.1s;
      }
      .workhub-invite-revoke:hover {
        background: #fde8e8;
        border-color: #e08080;
      }
      /* ── members section ── */
      .workhub-members-section {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }
      .workhub-members-section-head {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
      }
      .workhub-members-section-head strong {
        font-size: 0.88rem;
        font-weight: 700;
        color: #1a3060;
      }
      .workhub-members-count {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 0.78rem;
        color: #7b90b8;
      }
      .workhub-pending-badge {
        display: inline-flex;
        align-items: center;
        background: #fff3cd;
        color: #7a5400;
        border: 1px solid #f5d87c;
        border-radius: 999px;
        padding: 1px 8px;
        font-size: 0.72rem;
        font-weight: 700;
      }
      .workhub-member-list {
        display: flex;
        flex-direction: column;
        gap: 3px;
        max-height: 520px;
        overflow-y: auto;
      }
      .workhub-member-row-wrap {
        display: flex;
        flex-direction: column;
        gap: 0;
      }
      /* access level toggle (Full / Custom) */
      .workhub-access-level-toggle {
        display: inline-flex;
        border: 1px solid #d8e6fb;
        border-radius: 6px;
        overflow: hidden;
        flex-shrink: 0;
      }
      .workhub-access-level-btn {
        border: none;
        background: transparent;
        padding: 3px 9px;
        font-size: 0.73rem;
        font-weight: 600;
        color: #6b84b8;
        cursor: pointer;
        transition: background 0.1s, color 0.1s;
        white-space: nowrap;
      }
      .workhub-access-level-btn + .workhub-access-level-btn {
        border-left: 1px solid #d8e6fb;
      }
      .workhub-access-level-btn.is-active {
        background: #1a3d8f;
        color: #ffffff;
      }
      .workhub-access-level-btn:not(.is-active):hover {
        background: #eef4ff;
        color: #1a3060;
      }
      /* workspace count button */
      .workhub-ws-count-btn {
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: none;
        border: 1px solid #d8e6fb;
        border-radius: 6px;
        padding: 3px 7px;
        font-size: 0.75rem;
        color: #3a5a9a;
        cursor: pointer;
        white-space: nowrap;
        transition: background 0.1s, border-color 0.1s;
      }
      .workhub-ws-count-btn:hover,
      .workhub-ws-count-btn.is-open {
        background: #e8f0ff;
        border-color: #87a9ff;
      }
      .workhub-ws-count-label {
        font-size: 0.75rem;
        color: #6080b0;
      }
      .workhub-ws-count-chevron {
        font-size: 0.55rem;
        color: #8aa0c8;
      }
      /* workspace picker panel */
      .workhub-ws-picker {
        border: 1px solid #d5e4ff;
        border-top: none;
        border-radius: 0 0 9px 9px;
        background: #f5f9ff;
        padding: 8px 10px 10px;
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .workhub-ws-picker-title {
        font-size: 0.68rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #7390c0;
      }
      .workhub-ws-picker-list {
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      .workhub-ws-picker-row {
        display: flex;
        align-items: center;
        gap: 6px;
        padding: 5px 7px;
        border-radius: 7px;
        cursor: pointer;
        transition: background 0.1s;
      }
      .workhub-ws-picker-row:hover {
        background: #eaf1ff;
      }
      .workhub-ws-picker-row.is-open {
        opacity: 0.7;
        cursor: default;
      }
      .workhub-ws-picker-row.is-current {
        background: #eef3ff;
      }
      .workhub-ws-picker-row input[type="checkbox"] {
        width: 15px;
        height: 15px;
        accent-color: #3a5bd9;
        flex-shrink: 0;
        cursor: pointer;
      }
      .workhub-ws-picker-row.is-open input[type="checkbox"] {
        cursor: not-allowed;
      }
      .workhub-ws-picker-name {
        flex: 1;
        font-size: 0.78rem;
        color: #1c3566;
        font-weight: 500;
      }
      .workhub-ws-picker-badge {
        font-size: 0.66rem;
        font-weight: 700;
        padding: 1px 7px;
        border-radius: 999px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
      }
      .workhub-ws-picker-badge.current {
        background: #e0eaff;
        color: #2a4fa8;
        border: 1px solid #a8c0f5;
      }
      .workhub-ws-picker-badge.open {
        background: #e8f5e9;
        color: #2e6e3a;
        border: 1px solid #a5d6a7;
      }
      .workhub-ws-picker-badge.saving {
        background: #fff3e0;
        color: #7a4800;
        border: 1px solid #ffcc80;
      }
      .workhub-member-row.settings-row {
        display: grid;
        grid-template-columns: 36px 1fr minmax(90px,110px) auto;
        gap: 8px;
        align-items: center;
        border: 1px solid #e8eef9;
        border-radius: 9px;
        padding: 7px 9px;
        background: #fff;
        transition: border-color 0.12s, background 0.12s;
      }
      .workhub-member-row.settings-row:hover {
        border-color: #c2d1f7;
        background: #fafcff;
      }
      .workhub-member-row.settings-row.is-pending {
        border-color: #f5d87c;
        background: #fffdf2;
      }
      .workhub-member-row.settings-row.is-suspended {
        opacity: 0.6;
      }
      .workhub-member-avatar.settings-avatar {
        width: 31px;
        height: 31px;
        border-radius: 50%;
        background: linear-gradient(135deg, #5a7ee8 0%, #3a5bd9 100%);
        color: #fff;
        font-size: 0.64rem;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        letter-spacing: 0.05em;
        user-select: none;
      }
      .workhub-member-identity {
        display: flex;
        flex-direction: column;
        gap: 1px;
        min-width: 0;
      }
      .workhub-member-name {
        font-size: 0.84rem;
        font-weight: 600;
        color: #17305c;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .workhub-member-email {
        font-size: 0.73rem;
        color: #8a9bbf;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .workhub-member-workspaces {
        font-size: 0.75rem;
        color: #6e82a8;
        text-align: center;
      }
      .workhub-member-workspaces .workhub-muted {
        color: #c0cee8;
      }
      .workhub-member-actions {
        display: flex;
        align-items: center;
        gap: 6px;
        justify-content: flex-end;
      }
      .workhub-user-mode-toggle {
        display: inline-flex;
        align-items: center;
        border: 1px solid #d8e6fb;
        border-radius: 6px;
        overflow: hidden;
      }
      .workhub-user-mode-btn {
        border: none;
        background: #ffffff;
        color: #6b84b8;
        padding: 3px 8px;
        font-size: 0.72rem;
        font-weight: 700;
        cursor: pointer;
        line-height: 1.1;
      }
      .workhub-user-mode-btn + .workhub-user-mode-btn {
        border-left: 1px solid #d8e6fb;
      }
      .workhub-user-mode-btn.is-active {
        background: #1a3d8f;
        color: #ffffff;
      }
      .workhub-user-mode-btn:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .workhub-user-mode-pill {
        display: inline-flex;
        align-items: center;
        border: 1px solid #b9cdf7;
        background: #edf4ff;
        color: #2a4fa8;
        border-radius: 999px;
        padding: 2px 8px;
        font-size: 0.68rem;
        font-weight: 700;
      }
      .workhub-status-pill {
        display: inline-flex;
        align-items: center;
        border-radius: 999px;
        padding: 2px 9px;
        font-size: 0.71rem;
        font-weight: 700;
        letter-spacing: 0.02em;
        white-space: nowrap;
      }
      .workhub-status-pill.pending {
        background: #fff3cd;
        color: #7a5400;
        border: 1px solid #f5d87c;
      }
      .workhub-status-pill.suspended {
        background: #fde8e8;
        color: #8b2222;
        border: 1px solid #f5b8b8;
      }
      .workhub-approve-btn {
        padding: 4px 10px;
        border: 1px solid #4caf82;
        border-radius: 6px;
        background: #e8f7f0;
        color: #236645;
        font-size: 0.75rem;
        font-weight: 600;
        cursor: pointer;
        white-space: nowrap;
        transition: background 0.12s, border-color 0.12s;
      }
      .workhub-approve-btn:hover:not(:disabled) {
        background: #cdf0df;
        border-color: #2e9962;
      }
      .workhub-approve-btn:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
      .workhub-decline-btn {
        padding: 4px 8px;
        border: 1px solid #e0b4b4;
        border-radius: 6px;
        background: #fdf2f2;
        color: #b03030;
        font-size: 0.82rem;
        font-weight: 700;
        cursor: pointer;
        line-height: 1;
        transition: background 0.12s, border-color 0.12s;
      }
      .workhub-decline-btn:hover:not(:disabled) {
        background: #fde0e0;
        border-color: #c04040;
      }
      .workhub-decline-btn:disabled {
        opacity: 0.55;
        cursor: not-allowed;
      }
      .workhub-access-toggle {
        display: flex;
        align-items: center;
        gap: 6px;
        cursor: pointer;
      }
      .workhub-access-toggle input[type="checkbox"] {
        width: 15px;
        height: 15px;
        accent-color: #3a5bd9;
        cursor: pointer;
      }
      .workhub-access-label {
        font-size: 0.75rem;
        font-weight: 600;
        color: #9aabce;
        white-space: nowrap;
      }
      .workhub-access-label.is-active {
        color: #2a6f4f;
      }
      .workhub-modal.workhub-image-review-modal {
        width: calc(100vw - 20px);
        max-width: 1760px;
        max-height: calc(100vh - 20px);
        padding: 14px;
      }
      .workhub-modal-head {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 16px;
        margin-bottom: 24px;
      }
      .workhub-modal-head p {
        margin: 3px 0 0;
        color: #627291;
        font-size: 0.84rem;
        line-height: 1.25;
      }
      .workhub-switcher {
        margin-bottom: 6px;
      }
      .workhub-switcher.compact-switcher {
        margin-bottom: 0;
      }
      .workhub-switcher-btn {
        border: 1px solid #d8e4fa;
        background: #f8fbff;
        color: #5f6f91;
        border-radius: 8px;
        padding: 5px 8px;
        font-size: 0.76rem;
        line-height: 1.1;
        font-weight: 700;
        cursor: pointer;
        min-height: 24px;
      }
      .workhub-switcher-btn.is-active {
        background: #ecf3ff;
        border-color: #87a9ff;
        color: #224ba6;
      }
      .workhub-member-chip {
        border: 1px solid #d8e4fa;
        background: #ffffff;
        color: #35517f;
        border-radius: 999px;
        padding: 4px 7px;
        font-size: 0.74rem;
        line-height: 1.1;
        cursor: pointer;
      }
      .workhub-member-chip.is-selected {
        background: #edf4ff;
        border-color: #87a9ff;
        color: #224ba6;
      }
      .dashboard-strip {
        margin-top: 4px;
      }
      @keyframes workhubSpin {
        to { transform: rotate(360deg); }
      }
      @media (max-width: 1200px) {
        .workhub-shell-layout,
        .workhub-compact-grid,
        .workhub-detail-grid {
          grid-template-columns: 1fr;
        }
        .workhub-overview-dashboard {
          grid-template-columns: 1fr;
        }
        .workhub-content-area {
          grid-template-columns: 1fr;
        }
        .workhub-task-detail-rail {
          border-left: 0;
          padding-left: 0;
          max-height: none;
        }
        .workhub-task-table-head,
        .workhub-task-row-grid {
          grid-template-columns: minmax(0, 2.2fr) 52px 40px minmax(78px, 0.95fr) 48px 40px;
          gap: 6px;
        }
        .workhub-col-checklist,
        .workhub-col-actions,
        .workhub-task-col.checklist-inline,
        .workhub-task-col.actions-inline {
          display: none;
        }
        .workhub-col-more,
        .workhub-task-col.more {
          display: flex;
        }
        .workhub-image-review-panels {
          grid-template-columns: 1fr;
        }
        .workhub-client-layout {
          grid-template-columns: 1fr;
        }
      }
      .workhub-tree-sidebar {
        position: static;
        max-height: 100%;
      }
      .workhub-summary-strip {
        grid-template-columns: repeat(2, minmax(0, 1fr));
      }
      @media (max-width: 900px) {
        .workhub-topbar,
        .workhub-header-actions,
        .workhub-project-title-row.spaced {
          flex-direction: column;
          align-items: stretch;
        }
        .workhub-field-grid.two,
        .workhub-detail-grid,
        .workhub-summary-list {
          grid-template-columns: 1fr;
        }
        .workhub-summary-strip {
          display: flex;
          flex-wrap: nowrap;
          overflow-x: auto;
          gap: 8px;
          padding-bottom: 2px;
          -webkit-overflow-scrolling: touch;
        }
        .workhub-summary-strip .workhub-summary-tile {
          flex: 0 0 170px;
        }
        .workhub-overview-card {
          min-height: 0;
        }
        .workhub-header-actions {
          justify-content: flex-start;
        }
        .workhub-modal,
        .workhub-modal.large {
          width: min(100%, calc(100vw - 20px));
        }
        .workhub-modal.workhub-workspace-settings-modal {
          width: min(100%, calc(100vw - 20px));
        }
        .workhub-project-settings-modal {
          width: min(100%, calc(100vw - 20px));
          max-height: calc(100vh - 12px);
        }
        .workhub-project-settings-body {
          flex-direction: column;
        }
        .workhub-psettings-left {
          border-right: none;
          border-bottom: 1px solid #e4ecfb;
          flex: none;
        }
        .workhub-psettings-right {
          flex: none;
        }
        .workhub-project-settings-grid {
          grid-template-columns: 1fr;
        }
        .workhub-project-settings-sticky-actions {
          justify-content: stretch;
        }
        .workhub-project-settings-sticky-actions .workhub-ghost-btn,
        .workhub-project-settings-sticky-actions .workhub-primary-btn {
          flex: 1;
        }
        .workhub-user-list-head {
          display: none;
        }
        .workhub-user-list-row {
          grid-template-columns: 1fr;
          gap: 4px;
        }
        .workhub-member-row.settings-row {
          grid-template-columns: 32px 1fr;
          grid-template-rows: auto auto;
        }
        .workhub-member-workspaces {
          display: none;
        }
        .workhub-member-actions {
          grid-column: 1 / -1;
          justify-content: flex-start;
          flex-wrap: wrap;
        }
        .workhub-invite-input-row {
          flex-direction: column;
        }
        .workhub-invite-table-head {
          display: none;
        }
        .workhub-invite-table-row {
          grid-template-columns: 1fr;
          gap: 5px;
        }
        .workhub-invite-row-actions {
          justify-content: flex-start;
        }
        .workhub-project-risk-meta-row {
          grid-template-columns: minmax(0, 1fr) 52px;
        }
        .workhub-project-risk-calendar {
          display: none;
        }
        .workhub-client-quick-add {
          flex-direction: column;
        }
        .workhub-modal.workhub-image-review-modal {
          width: calc(100vw - 12px);
          max-width: none;
          max-height: calc(100vh - 12px);
          padding: 14px;
        }
        .workhub-task-table-head {
          display: none;
        }
        .workhub-task-row-grid {
          grid-template-columns: 1fr;
          gap: 6px;
        }
        .workhub-task-group {
          width: 100%;
        }
        .workhub-task-table-wrap {
          min-width: 100%;
          width: 100%;
        }
        .workhub-task-col.details {
          grid-template-columns: 18px minmax(0, 1fr);
        }
        .workhub-task-col.more {
          justify-content: flex-start;
        }
        .workhub-image-review-modal {
          width: calc(100vw - 12px);
          max-width: none;
          height: auto;
          max-height: calc(100vh - 12px);
        }
        .workhub-image-review-layout {
          grid-template-rows: auto auto;
        }
        .workhub-image-review-stage {
          max-width: calc(var(--img-aspect, 1.778) * 45vh);
          max-height: 45vh;
        }
        .workhub-image-review-topbar {
          align-items: flex-start;
        }
        .workhub-image-review-topbar-title {
          gap: 4px;
        }
        .workhub-image-review-panels {
          grid-template-columns: 1fr;
        }
      }
    `}</style>
  )
})
