import { useState, useEffect, useRef, memo, useMemo, createContext, useContext, type KeyboardEvent as ReactKeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode, type Dispatch, type SetStateAction } from 'react'
import type { WorkhubTask, WorkhubTaskStatus, WorkhubTaskStatusConfig, WorkhubMember, WorkhubTaskChecklistItem, WorkhubMilestone } from '../../../lib/workhubRepo'
import type { WorkhubImageReview } from '../imageReview'
import { WorkhubTaskAttachmentCard } from './WorkhubTaskAttachmentCard'
import { WorkhubTaskChecklistCard } from './WorkhubTaskChecklistCard'

// ─── Shared context (Priority 4) ───────────────────────────────────────────
interface TaskDetailSharedContextValue {
  memberByUid: Record<string, WorkhubMember>
  formatDueDateShort: (date: string, time?: string) => string
  formatTime: (timestamp: unknown) => string
  projectNameById: Record<string, string>
  attachmentReviews: Record<string, WorkhubImageReview>
  isImageAttachmentUrl: (url: string) => boolean
  openAttachmentLightbox: (url: string) => void
  getInitials: (name: string) => string
  getUrlHostLabel: (url: string) => string
  attachmentViewMode: string
  setAttachmentViewMode: (mode: string) => void
}

const TaskDetailSharedContext = createContext<TaskDetailSharedContextValue | null>(null)

function useTaskDetailShared() {
  const ctx = useContext(TaskDetailSharedContext)
  if (!ctx) throw new Error('TaskDetailSharedContext not provided')
  return ctx
}

// ─── Finance info sub-type ──────────────────────────────────────────────────
interface TaskFinanceInfo {
  currency: string
  totalValue: number
  usedValue: number
  remaining: number
}

// ─── Typed props interface (Priority 2) ─────────────────────────────────────
export interface WorkhubTaskDetailPanelProps {
  isMobileWorkhubLayout: boolean
  showStandaloneHeader?: boolean
  selectedTask: WorkhubTask
  setSelectedTaskId: (id: string) => void
  setTaskDeleteConfirmOpen: (open: boolean) => void
  detailMenuOpen: string
  setDetailMenuOpen: (key: string) => void
  setDetailMenuCoords: (coords: { top: number; left: number; right: number } | null) => void
  selectedProjectEffectiveTaskStatuses: WorkhubTaskStatusConfig[]
  PRIORITY_LABELS: Record<string, string>
  memberByUid: Record<string, WorkhubMember>
  selectedTaskAssignableMembers: WorkhubMember[]
  formatDueDateShort: (date: string, time?: string) => string
  selectedTaskFinanceInfo: TaskFinanceInfo | null
  handleSelectedTaskValueSave: (task: WorkhubTask, amountDraft: string, currencyDraft: string) => void
  handleSelectedTaskTitleSave: (task: WorkhubTask, draft: string) => void
  handleSelectedTaskDescriptionSave: (task: WorkhubTask, draft: string) => void
  selectedTaskParentEntityLabel: string
  projectNameById: Record<string, string>
  formatTime: (timestamp: unknown) => string
  buildChecklist: (task: WorkhubTask) => WorkhubTaskChecklistItem[]
  getChecklistDetailKey: (taskId: string, itemId: string) => string
  expandedChecklistDetailKeys: Set<string>
  toggleChecklistItemDetails: (key: string) => void
  editingChecklistScope: string
  editingChecklistTaskId: string
  editingChecklistItemId: string
  editingChecklistItemText: string
  setEditingChecklistItemText: (text: string) => void
  handleChecklistItemToggle: (task: WorkhubTask, itemId: string, checked: boolean) => void
  handleChecklistItemEditStart: (taskId: string, itemId: string, text: string, scope: 'inline' | 'details') => void
  handleChecklistItemEditSave: (task: WorkhubTask, itemId: string) => void
  handleChecklistItemEditCancel: () => void
  handleChecklistRemove: (task: WorkhubTask, itemId: string) => void
  checklistDetailsDrafts: Record<string, string>
  setChecklistDetailsDrafts: Dispatch<SetStateAction<Record<string, string>>>
  handleChecklistItemDetailsSave: (task: WorkhubTask, itemId: string) => void
  checklistAttachmentDrafts: Record<string, string>
  setChecklistAttachmentDrafts: Dispatch<SetStateAction<Record<string, string>>>
  handleChecklistAttachmentAdd: (task: WorkhubTask, itemId: string) => void
  handleChecklistAttachmentFileUpload: (task: WorkhubTask, itemId: string, files: File[]) => Promise<void>
  uploadingChecklistAttachmentKey: string
  attachmentViewMode: string
  isImageAttachmentUrl: (url: string) => boolean
  openAttachmentLightbox: (url: string) => void
  attachmentReviews: Record<string, WorkhubImageReview>
  handleChecklistAttachmentRemove: (task: WorkhubTask, itemId: string, url: string) => void
  checklistLinkDrafts: Record<string, string>
  setChecklistLinkDrafts: Dispatch<SetStateAction<Record<string, string>>>
  handleChecklistLinkAdd: (task: WorkhubTask, itemId: string) => void
  handleChecklistLinkRemove: (task: WorkhubTask, itemId: string, link: string) => void
  taskChecklistDrafts: Record<string, string>
  setTaskChecklistDrafts: Dispatch<SetStateAction<Record<string, string>>>
  selectedWorkspaceScopeType: string
  taskChecklistValueDrafts: Record<string, string>
  setTaskChecklistValueDrafts: Dispatch<SetStateAction<Record<string, string>>>
  handleChecklistAdd: (task: WorkhubTask) => void
  busyKey: string
  handleTaskUpdate: (task: WorkhubTask, patch: Partial<WorkhubTask>, options?: { silent?: boolean }) => Promise<void>
  taskDiscussionNode: ReactNode
  taskAttachmentsCollapsed: boolean
  setTaskAttachmentsCollapsed: Dispatch<SetStateAction<boolean>>
  setAttachmentViewMode: (mode: string) => void
  taskAttachmentTitleDrafts: Record<string, string>
  setTaskAttachmentTitleDrafts: Dispatch<SetStateAction<Record<string, string>>>
  taskAttachmentDrafts: Record<string, string>
  setTaskAttachmentDrafts: Dispatch<SetStateAction<Record<string, string>>>
  taskAttachmentFilePathDrafts: Record<string, string>
  taskAttachmentFileDrafts: Record<string, File[]>
  setTaskAttachmentFileDrafts: Dispatch<SetStateAction<Record<string, File[]>>>
  setTaskAttachmentFilePathDrafts: Dispatch<SetStateAction<Record<string, string>>>
  uploadingTaskAttachmentId: string
  handleTaskAttachmentAdd: (task: WorkhubTask) => void
  handleTaskAttachmentFileUpload: (task: WorkhubTask, files: File[]) => Promise<void>
  getTaskAttachments: (task: WorkhubTask) => string[]
  getTaskAttachmentTitle: (task: WorkhubTask, url: string) => string
  handleTaskAttachmentRemove: (task: WorkhubTask, url: string) => void
  getTaskLinks: (task: WorkhubTask) => string[]
  taskLinkTitleDrafts: Record<string, string>
  setTaskLinkTitleDrafts: Dispatch<SetStateAction<Record<string, string>>>
  taskLinkDrafts: Record<string, string>
  setTaskLinkDrafts: Dispatch<SetStateAction<Record<string, string>>>
  handleTaskLinkAdd: (task: WorkhubTask) => void
  taskLinkEditingDrafts: Record<string, string | null>
  handleTaskLinkEditCancel: (taskId: string) => void
  getTaskLinkTitle: (task: WorkhubTask, link: string) => string
  getUrlHostLabel: (url: string) => string
  getInitials: (name: string) => string
  handleTaskLinkEditStart: (task: WorkhubTask, link: string) => void
  handleTaskLinkRemove: (task: WorkhubTask, link: string) => void
  milestones?: WorkhubMilestone[]
  onLinkTaskToMilestone?: (taskId: string, milestoneId: string | null) => void
}

/** Returns a badge count for an attachment URL based on its review data. */
function computeAttachmentReviewCount(reviews: Record<string, WorkhubImageReview>, url: string): number {
  const review = reviews[url]
  if (!review) return 0
  return (review.notes.trim() ? 1 : 0)
    + (review.comments.length)
    + (review.markers.length)
    + (review.modificationChecks.length)
}

interface DetailFieldCardProps {
  icon: string
  label: string
  children: ReactNode
}

function DetailFieldCard({ icon, label, children }: DetailFieldCardProps) {
  const hasLabel = label.trim().length > 0
  return (
    <div className="workhub-detail-icon-wrap">
      <div className="workhub-detail-icon-btn workhub-detail-icon-field">
        <span className="workhub-detail-chip-icon" aria-hidden="true">{icon}</span>
        <span className="workhub-detail-chip-copy">
          {hasLabel && <span className="workhub-detail-chip-label">{label}</span>}
          {children}
        </span>
      </div>
    </div>
  )
}

interface DetailMetaItemProps {
  icon: string
  label: string
  value: ReactNode
}

function DetailMetaItem({ icon, label, value }: DetailMetaItemProps) {
  return (
    <div className="workhub-detail-meta-item">
      <span className="workhub-detail-meta-icon" aria-hidden="true">{icon}</span>
      <span className="workhub-detail-meta-copy">
        <span className="workhub-detail-meta-label">{label}</span>
        <span className="workhub-detail-meta-value">{value}</span>
      </span>
    </div>
  )
}

// ─── Links section (Priority 3 – extracted memoized component) ─────────────
interface TaskDetailLinksSectionProps {
  selectedTask: WorkhubTask
  embedded?: boolean
  getTaskLinks: (task: WorkhubTask) => string[]
  taskLinkTitleDrafts: Record<string, string>
  setTaskLinkTitleDrafts: Dispatch<SetStateAction<Record<string, string>>>
  taskLinkDrafts: Record<string, string>
  setTaskLinkDrafts: Dispatch<SetStateAction<Record<string, string>>>
  handleTaskLinkAdd: (task: WorkhubTask) => void
  taskLinkEditingDrafts: Record<string, string | null>
  handleTaskLinkEditCancel: (taskId: string) => void
  getTaskLinkTitle: (task: WorkhubTask, link: string) => string
  handleTaskLinkEditStart: (task: WorkhubTask, link: string) => void
  handleTaskLinkRemove: (task: WorkhubTask, link: string) => void
}

const TaskDetailLinksSection = memo(function TaskDetailLinksSection({
  selectedTask,
  embedded = false,
  getTaskLinks,
  taskLinkTitleDrafts,
  setTaskLinkTitleDrafts,
  taskLinkDrafts,
  setTaskLinkDrafts,
  handleTaskLinkAdd,
  taskLinkEditingDrafts,
  handleTaskLinkEditCancel,
  getTaskLinkTitle,
  handleTaskLinkEditStart,
  handleTaskLinkRemove,
}: TaskDetailLinksSectionProps) {
  const { attachmentViewMode, getUrlHostLabel, getInitials, memberByUid } = useTaskDetailShared()
  const taskLinks: string[] = getTaskLinks(selectedTask)
  return (
    <div className={embedded ? 'workhub-task-resource-card workhub-task-resource-card-embedded' : 'workhub-detail-card workhub-task-resource-card'}>
      <div className="workhub-task-attachments-head">
        <span>{`Links (${taskLinks.length})`}</span>
      </div>
      <div className="workhub-task-attachment-editor">
        <div className="workhub-checklist-url-row compact-row">
          <input
            type="text"
            value={taskLinkTitleDrafts[selectedTask.id] || ''}
            onChange={(event) => setTaskLinkTitleDrafts((current) => ({ ...current, [selectedTask.id]: event.target.value }))}
            onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); handleTaskLinkAdd(selectedTask) } }}
            placeholder="Title (optional)"
            style={{ flex: '1 1 120px', minWidth: 0 }}
          />
          <input
            type="url"
            value={taskLinkDrafts[selectedTask.id] || ''}
            onChange={(event) => setTaskLinkDrafts((current) => ({ ...current, [selectedTask.id]: event.target.value }))}
            onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); handleTaskLinkAdd(selectedTask) } }}
            placeholder="Paste URL and press Enter"
            style={{ flex: '2 1 200px', minWidth: 0 }}
          />
          <button type="button" onClick={() => handleTaskLinkAdd(selectedTask)}>
            {taskLinkEditingDrafts[selectedTask.id] ? '✓' : '+'}
          </button>
        </div>
        {taskLinkEditingDrafts[selectedTask.id] && (
          <div className="workhub-checklist-url-row compact-row is-stacked">
            <button type="button" className="workhub-ghost-btn" onClick={() => handleTaskLinkEditCancel(selectedTask.id)}>Cancel edit</button>
          </div>
        )}
      </div>
      {taskLinks.length > 0 && (
        <div className={`workhub-checklist-url-list view-${attachmentViewMode}`}>
          {taskLinks.map((link: string) => {
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
                    <span className="workhub-task-attachment-icon">{'\u{1F517}'}</span>
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
                  <button type="button" title="Edit link" aria-label="Edit link" onClick={() => handleTaskLinkEditStart(selectedTask, link)}>{'\u270F'}</button>
                  <button
                    type="button"
                    title="Remove link"
                    aria-label="Remove link"
                    onClick={() => {
                      if (!window.confirm('Remove this link?')) return
                      handleTaskLinkRemove(selectedTask, link)
                    }}
                  >
                    {'\u{1F5D1}'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
})

// ─── Main panel (Priority 3 – memo wrapped) ─────────────────────────────────
export const WorkhubTaskDetailPanel = memo(function WorkhubTaskDetailPanel({
  isMobileWorkhubLayout,
  showStandaloneHeader = true,
  selectedTask,
  setSelectedTaskId,
  setTaskDeleteConfirmOpen,
  detailMenuOpen: _detailMenuOpen,
  setDetailMenuOpen: _setDetailMenuOpen,
  setDetailMenuCoords: _setDetailMenuCoords,
  selectedProjectEffectiveTaskStatuses,
  PRIORITY_LABELS,
  memberByUid,
  selectedTaskAssignableMembers,
  formatDueDateShort,
  selectedTaskFinanceInfo,
  handleSelectedTaskValueSave,
  handleSelectedTaskTitleSave,
  handleSelectedTaskDescriptionSave,
  selectedTaskParentEntityLabel,
  projectNameById,
  formatTime,
  buildChecklist,
  getChecklistDetailKey,
  expandedChecklistDetailKeys,
  toggleChecklistItemDetails,
  editingChecklistScope,
  editingChecklistTaskId,
  editingChecklistItemId,
  editingChecklistItemText,
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
  taskChecklistDrafts,
  setTaskChecklistDrafts,
  selectedWorkspaceScopeType,
  taskChecklistValueDrafts,
  setTaskChecklistValueDrafts,
  handleChecklistAdd,
  busyKey,
  handleTaskUpdate,
  taskDiscussionNode,
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
  milestones,
  onLinkTaskToMilestone,
}: WorkhubTaskDetailPanelProps) {
  // Priority 1 – local draft state
  const [titleDraft, setTitleDraft] = useState(selectedTask.title || '')
  const [descriptionDraft, setDescriptionDraft] = useState(selectedTask.description || '')
  const [valueAmountDraft, setValueAmountDraft] = useState(selectedTask.valueAmount != null ? String(selectedTask.valueAmount) : '')
  const [valueCurrencyDraft, setValueCurrencyDraft] = useState(selectedTask.valueCurrency || '')
  const [assigneeMenuOpen, setAssigneeMenuOpen] = useState(false)
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [dialogDetailsPaneWidth, setDialogDetailsPaneWidth] = useState(56)
  const [isDialogResizing, setIsDialogResizing] = useState(false)
  const assigneeMenuRef = useRef<HTMLDivElement | null>(null)
  const dialogLayoutRef = useRef<HTMLDivElement | null>(null)
  const dialogResizeStateRef = useRef<{ startX: number; startWidth: number } | null>(null)
  const titleEditorRef = useRef<HTMLTextAreaElement | null>(null)
  const descriptionEditorRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    setTitleDraft(selectedTask.title || '')
    setDescriptionDraft(selectedTask.description || '')
    setValueAmountDraft(selectedTask.valueAmount != null ? String(selectedTask.valueAmount) : '')
    setValueCurrencyDraft(selectedTask.valueCurrency || '')
    setAssigneeMenuOpen(false)
    setIsEditingTitle(false)
    setIsEditingDescription(false)
  }, [
    selectedTask.id,
    selectedTask.title,
    selectedTask.description,
    selectedTask.valueAmount,
    selectedTask.valueCurrency,
  ]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isEditingTitle) return
    titleEditorRef.current?.focus()
    const valueLength = titleEditorRef.current?.value.length || 0
    titleEditorRef.current?.setSelectionRange(valueLength, valueLength)
  }, [isEditingTitle])

  useEffect(() => {
    if (!isEditingDescription) return
    descriptionEditorRef.current?.focus()
    const valueLength = descriptionEditorRef.current?.value.length || 0
    descriptionEditorRef.current?.setSelectionRange(valueLength, valueLength)
  }, [isEditingDescription])

  useEffect(() => {
    if (!assigneeMenuOpen) return

    function isInsideAssigneeMenu(target: EventTarget | null) {
      const node = target as Node | null
      return !!node && !!assigneeMenuRef.current?.contains(node)
    }

    function handleOutsidePointerDown(event: PointerEvent) {
      if (!isInsideAssigneeMenu(event.target)) {
        setAssigneeMenuOpen(false)
      }
    }

    function handleOutsideMouseDown(event: MouseEvent) {
      if (!isInsideAssigneeMenu(event.target)) {
        setAssigneeMenuOpen(false)
      }
    }

    function handleOutsideTouchStart(event: TouchEvent) {
      if (!isInsideAssigneeMenu(event.target)) {
        setAssigneeMenuOpen(false)
      }
    }

    function handleOutsideFocusIn(event: FocusEvent) {
      if (!isInsideAssigneeMenu(event.target)) {
        setAssigneeMenuOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setAssigneeMenuOpen(false)
      }
    }

    document.addEventListener('pointerdown', handleOutsidePointerDown, true)
    document.addEventListener('mousedown', handleOutsideMouseDown, true)
    document.addEventListener('touchstart', handleOutsideTouchStart, true)
    document.addEventListener('focusin', handleOutsideFocusIn, true)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('pointerdown', handleOutsidePointerDown, true)
      document.removeEventListener('mousedown', handleOutsideMouseDown, true)
      document.removeEventListener('touchstart', handleOutsideTouchStart, true)
      document.removeEventListener('focusin', handleOutsideFocusIn, true)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [assigneeMenuOpen])

  // Priority 4 – shared context value (memoised so TaskDetailLinksSection's memo is not defeated)
  const sharedContextValue = useMemo<TaskDetailSharedContextValue>(() => ({
    memberByUid,
    formatDueDateShort,
    formatTime,
    projectNameById,
    attachmentReviews,
    isImageAttachmentUrl,
    openAttachmentLightbox,
    getInitials,
    getUrlHostLabel,
    attachmentViewMode,
    setAttachmentViewMode,
  }), [memberByUid, formatDueDateShort, formatTime, projectNameById, attachmentReviews, isImageAttachmentUrl, openAttachmentLightbox, getInitials, getUrlHostLabel, attachmentViewMode, setAttachmentViewMode])
  const isSplitDialogLayout = !showStandaloneHeader && !isMobileWorkhubLayout
  useEffect(() => {
    const layout = dialogLayoutRef.current
    if (!layout || !isSplitDialogLayout) return
    layout.style.setProperty('--workhub-task-dialog-details-width', `${dialogDetailsPaneWidth}%`)
    return () => {
      layout.style.removeProperty('--workhub-task-dialog-details-width')
    }
  }, [dialogDetailsPaneWidth, isSplitDialogLayout])

  useEffect(() => {
    const stopDialogResize = () => {
      setIsDialogResizing(false)
      dialogResizeStateRef.current = null
      document.body.style.removeProperty('cursor')
      document.body.style.removeProperty('user-select')
      window.removeEventListener('pointermove', handleDialogResizePointerMove)
      window.removeEventListener('pointerup', stopDialogResize)
    }

    const handleDialogResizePointerMove = (event: PointerEvent) => {
      const resizeState = dialogResizeStateRef.current
      const layout = dialogLayoutRef.current
      if (!resizeState || !layout) return
      const layoutWidth = layout.getBoundingClientRect().width
      if (layoutWidth <= 0) return
      const widthDelta = ((event.clientX - resizeState.startX) / layoutWidth) * 100
      const nextWidth = Math.min(68, Math.max(42, resizeState.startWidth + widthDelta))
      setDialogDetailsPaneWidth(nextWidth)
    }

    if (!isDialogResizing) return () => undefined

    window.addEventListener('pointermove', handleDialogResizePointerMove)
    window.addEventListener('pointerup', stopDialogResize)
    return () => {
      stopDialogResize()
    }
  }, [isDialogResizing])

  const handleDialogResizePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!isSplitDialogLayout || !dialogLayoutRef.current) return
    event.preventDefault()
    dialogResizeStateRef.current = {
      startX: event.clientX,
      startWidth: dialogDetailsPaneWidth,
    }
    setIsDialogResizing(true)
    document.body.style.setProperty('cursor', 'col-resize')
    document.body.style.setProperty('user-select', 'none')
  }

  const handleDialogResizeKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!isSplitDialogLayout) return
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      setDialogDetailsPaneWidth((current) => Math.max(42, current - 4))
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      setDialogDetailsPaneWidth((current) => Math.min(68, current + 4))
    }
  }

  const priorityValues = Object.keys(PRIORITY_LABELS) as Array<keyof typeof PRIORITY_LABELS>
  const selectedTaskAssigneeUids = useMemo(() => {
    const validUidSet = new Set(selectedTaskAssignableMembers.map((member) => member.uid))
    const fromTask = (selectedTask.assigneeUids || []).filter((uid) => validUidSet.has(uid))
    const primary = selectedTask.assigneeUid && validUidSet.has(selectedTask.assigneeUid) ? selectedTask.assigneeUid : ''
    const ordered = primary
      ? [primary, ...fromTask.filter((uid) => uid !== primary)]
      : fromTask
    return Array.from(new Set(ordered))
  }, [selectedTask.assigneeUid, selectedTask.assigneeUids, selectedTaskAssignableMembers])

  const assigneeSummaryLabel = useMemo(() => {
    if (selectedTaskAssigneeUids.length === 0) return 'Unassigned'
    const first = selectedTaskAssigneeUids[0]
    const firstLabel = memberByUid[first]?.displayName || memberByUid[first]?.email || first
    if (selectedTaskAssigneeUids.length === 1) return firstLabel
    return `${firstLabel} +${selectedTaskAssigneeUids.length - 1}`
  }, [memberByUid, selectedTaskAssigneeUids])
  const statusIconById = useMemo(() => {
    const iconMap: Record<string, string> = {}
    for (const item of selectedProjectEffectiveTaskStatuses) {
      const iconLike = typeof (item as any)?.icon === 'string' && (item as any).icon.trim().length > 0
        ? String((item as any).icon).trim()
        : '◉'
      iconMap[item.id] = iconLike
    }
    return iconMap
  }, [selectedProjectEffectiveTaskStatuses])
  const priorityIconMap: Record<string, string> = {
    low: '▿',
    medium: '◆',
    high: '▲',
    urgent: '⬆',
  }

  const updateTaskAssignees = (nextUids: string[]) => {
    const normalized = Array.from(new Set(nextUids.filter(Boolean)))
    void handleTaskUpdate(selectedTask, {
      assigneeUid: normalized[0] || '',
      assigneeUids: normalized.length > 0 ? normalized : undefined,
    })
  }

  const toggleTaskAssignee = (uid: string) => {
    const next = selectedTaskAssigneeUids.includes(uid)
      ? selectedTaskAssigneeUids.filter((itemUid) => itemUid !== uid)
      : [...selectedTaskAssigneeUids, uid]
    updateTaskAssignees(next)
  }

  const overviewCard = (
    <div className="workhub-detail-card">
      {showStandaloneHeader && !isMobileWorkhubLayout && (
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
              <span className="workhub-detail-danger-icon" aria-hidden="true">{'\u{1F5D1}'}</span>
            </button>
          </div>
        </div>
      )}
      <div className="workhub-detail-icon-row">
        <DetailFieldCard
          icon={statusIconById[selectedTask.status] || '◉'}
          label=""
        >
          <select
            className="workhub-detail-field-select"
            value={selectedTask.status}
            onChange={(event) => { void handleTaskUpdate(selectedTask, { status: event.target.value as WorkhubTaskStatus }) }}
            title="Task status"
            aria-label="Task status"
          >
            {selectedProjectEffectiveTaskStatuses.map((value: any) => (
              <option key={value.id} value={value.id}>{value.label}</option>
            ))}
          </select>
        </DetailFieldCard>
        <DetailFieldCard
          icon={priorityIconMap[selectedTask.priority] || '◆'}
          label=""
        >
          <select
            className="workhub-detail-field-select"
            value={selectedTask.priority}
            onChange={(event) => { void handleTaskUpdate(selectedTask, { priority: event.target.value as WorkhubTask['priority'] }) }}
            title="Task priority"
            aria-label="Task priority"
          >
            {priorityValues.map((value) => (
              <option key={value} value={value}>{PRIORITY_LABELS[value]}</option>
            ))}
          </select>
        </DetailFieldCard>
        <DetailFieldCard
          icon="👤"
          label=""
        >
          <div className="workhub-detail-assignee-picker" ref={assigneeMenuRef}>
            <button
              type="button"
              className="workhub-detail-assignee-trigger"
              onClick={() => setAssigneeMenuOpen((open) => !open)}
              title="Task assignees"
              aria-label="Task assignees"
              aria-expanded={assigneeMenuOpen}
            >
              <span className="workhub-detail-assignee-pills" title={assigneeSummaryLabel}>
                <span className="workhub-detail-assignee-icon-only" aria-hidden="true">👤</span>
              </span>
              <span className="workhub-detail-assignee-chevron" aria-hidden>▾</span>
            </button>
            {assigneeMenuOpen && (
              <div className="workhub-detail-assignee-menu">
                <button
                  type="button"
                  className={`workhub-composer-notify-option${selectedTaskAssigneeUids.length === 0 ? ' is-active' : ''}`}
                  onClick={() => updateTaskAssignees([])}
                >
                  No one
                </button>
                <div className="workhub-composer-notify-divider" />
                {selectedTaskAssignableMembers.map((item) => {
                  const checked = selectedTaskAssigneeUids.includes(item.uid)
                  return (
                    <label key={item.uid} className="workhub-composer-notify-check">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleTaskAssignee(item.uid)}
                      />
                      {item.displayName || item.email || item.uid}
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        </DetailFieldCard>
        <DetailFieldCard
          icon="↗"
          label="Start"
        >
          <div className="workhub-detail-field-date-row">
            <input
              type="date"
              className="workhub-detail-field-input"
              value={selectedTask.startDate || ''}
              onChange={(event) => { void handleTaskUpdate(selectedTask, { startDate: event.target.value }) }}
              title="Start date"
              aria-label="Start date"
            />
          </div>
        </DetailFieldCard>
        <DetailFieldCard
          icon="🗓"
          label="Due date"
        >
          <div className="workhub-detail-field-date-row">
            <input
              type="date"
              className="workhub-detail-field-input"
              value={selectedTask.dueDate || ''}
              onChange={(event) => { void handleTaskUpdate(selectedTask, { dueDate: event.target.value }) }}
              title="Due date"
              aria-label="Due date"
            />
            <input
              type="time"
              className="workhub-detail-field-input"
              value={selectedTask.dueTime || ''}
              onChange={(event) => { void handleTaskUpdate(selectedTask, { dueTime: event.target.value }) }}
              title="Due time"
              aria-label="Due time"
            />
          </div>
        </DetailFieldCard>

        {isMobileWorkhubLayout && (
          <div className="workhub-detail-icon-wrap">
            <button
              type="button"
              className="workhub-detail-icon-btn workhub-detail-icon-btn-danger"
              title="Delete task"
              aria-label="Delete task"
              onClick={() => setTaskDeleteConfirmOpen(true)}
            >
              <span className="workhub-detail-danger-icon" aria-hidden="true">{'\u{1F5D1}'}</span>
            </button>
          </div>
        )}
      </div>
      <div className="workhub-task-title-divider" aria-hidden="true" />
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
                value={valueAmountDraft}
                onChange={(event) => setValueAmountDraft(event.target.value)}
                onBlur={() => handleSelectedTaskValueSave(selectedTask, valueAmountDraft, valueCurrencyDraft)}
                placeholder="0.00"
              />
            </label>
            <label className="workhub-task-finance-field">
              <span>Currency</span>
              <input
                type="text"
                value={valueCurrencyDraft || selectedTaskFinanceInfo.currency}
                onChange={(event) => setValueCurrencyDraft(event.target.value.toUpperCase())}
                onBlur={() => handleSelectedTaskValueSave(selectedTask, valueAmountDraft, valueCurrencyDraft)}
                maxLength={6}
                placeholder="OMR"
              />
            </label>
          </div>
          {selectedTaskFinanceInfo.totalValue > 0 && (
            <div className="workhub-task-finance-summary">
              <progress
                className={`workhub-task-finance-track${selectedTaskFinanceInfo.remaining < 0 ? ' is-over' : ''}`}
                max={100}
                value={Math.min(100, Math.round((selectedTaskFinanceInfo.usedValue / selectedTaskFinanceInfo.totalValue) * 100))}
              />
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
      <div className="workhub-task-heading-block">
        {isEditingTitle ? (
          <textarea
            ref={titleEditorRef}
            className="workhub-task-title-edit-input workhub-task-name-input"
            value={titleDraft}
            onChange={(event) => setTitleDraft(event.target.value)}
            onKeyDown={(event) => {
              if (!(event.key === 'Enter' && (event.ctrlKey || event.metaKey))) return
              event.preventDefault()
              handleSelectedTaskTitleSave(selectedTask, titleDraft)
              setIsEditingTitle(false)
            }}
            onBlur={() => {
              handleSelectedTaskTitleSave(selectedTask, titleDraft)
              setIsEditingTitle(false)
            }}
            rows={2}
          />
        ) : (
          <button
            type="button"
            className="workhub-task-heading-display workhub-task-title-display"
            onClick={() => setIsEditingTitle(true)}
            title="Click to edit task name"
          >
            {titleDraft.trim() || 'Untitled task'}
          </button>
        )}
      </div>

      <div className="workhub-task-heading-block workhub-task-description-block">
        {isEditingDescription ? (
          <textarea
            ref={descriptionEditorRef}
            className="workhub-task-details-input"
            value={descriptionDraft}
            onChange={(event) => setDescriptionDraft(event.target.value)}
            onBlur={() => {
              handleSelectedTaskDescriptionSave(selectedTask, descriptionDraft)
              setIsEditingDescription(false)
            }}
            placeholder="Add task details"
          />
        ) : (
          <button
            type="button"
            className="workhub-task-heading-display workhub-task-description-display"
            onClick={() => setIsEditingDescription(true)}
            title="Click to edit task details"
          >
            {descriptionDraft.trim() || 'Add task details'}
          </button>
        )}
      </div>
    </div>
  )
  const detailSections = (
    <>
      {overviewCard}

      <WorkhubTaskChecklistCard
        task={selectedTask}
        checklist={buildChecklist(selectedTask)}
        getChecklistDetailKey={getChecklistDetailKey}
        expandedChecklistDetailKeys={[...expandedChecklistDetailKeys]}
        onToggleChecklistItemDetails={toggleChecklistItemDetails}
        editingChecklistScope={editingChecklistScope as 'inline' | 'details' | null}
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
        onChecklistDetailsDraftChange={(detailKey, value) => setChecklistDetailsDrafts((current: Record<string, string>) => ({ ...current, [detailKey]: value }))}
        onChecklistItemDetailsSave={(itemId) => handleChecklistItemDetailsSave(selectedTask, itemId)}
        checklistAttachmentDrafts={checklistAttachmentDrafts}
        onChecklistAttachmentDraftChange={(detailKey, value) => setChecklistAttachmentDrafts((current: Record<string, string>) => ({ ...current, [detailKey]: value }))}
        onChecklistAttachmentAdd={(itemId) => handleChecklistAttachmentAdd(selectedTask, itemId)}
        onChecklistAttachmentFileUpload={(itemId, files) => { void handleChecklistAttachmentFileUpload(selectedTask, itemId, files) }}
        uploadingChecklistAttachmentKey={uploadingChecklistAttachmentKey}
        attachmentViewMode={attachmentViewMode as 'list' | 'thumbnail' | 'card'}
        isImageAttachmentUrl={isImageAttachmentUrl}
        onOpenAttachmentLightbox={openAttachmentLightbox}
        getAttachmentReviewCount={(url) => computeAttachmentReviewCount(attachmentReviews, url)}
        onChecklistAttachmentRemove={(itemId, url) => { if (window.confirm('Remove this attachment?')) handleChecklistAttachmentRemove(selectedTask, itemId, url) }}
        checklistLinkDrafts={checklistLinkDrafts}
        onChecklistLinkDraftChange={(detailKey, value) => setChecklistLinkDrafts((current: Record<string, string>) => ({ ...current, [detailKey]: value }))}
        onChecklistLinkAdd={(itemId) => handleChecklistLinkAdd(selectedTask, itemId)}
        onChecklistLinkRemove={(itemId, link) => { if (window.confirm('Remove this link?')) handleChecklistLinkRemove(selectedTask, itemId, link) }}
        taskChecklistDraft={taskChecklistDrafts[selectedTask.id] || ''}
        onTaskChecklistDraftChange={(value) => setTaskChecklistDrafts((current: Record<string, string>) => ({ ...current, [selectedTask.id]: value }))}
        isFinanceLayout={selectedWorkspaceScopeType === 'finance'}
        taskChecklistValueDraft={taskChecklistValueDrafts[selectedTask.id] || ''}
        onTaskChecklistValueDraftChange={(value) => setTaskChecklistValueDrafts((current: Record<string, string>) => ({ ...current, [selectedTask.id]: value }))}
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
          const newItem = {
            id: `chk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            text: draft,
            completed: false,
            valueAmount: normalizedValue,
          }
          const next = [...buildChecklist(selectedTask), newItem]
          setTaskChecklistDrafts((current: Record<string, string>) => ({ ...current, [selectedTask.id]: '' }))
          setTaskChecklistValueDrafts((current: Record<string, string>) => ({ ...current, [selectedTask.id]: '' }))
          void handleTaskUpdate(selectedTask, { checklist: next }, { silent: true })
        }}
        checklistAddDisabled={!taskChecklistDrafts[selectedTask.id]?.trim() || busyKey === 'task'}
      />

      <div className="workhub-detail-card workhub-task-resource-combined-card">
        <WorkhubTaskAttachmentCard
          task={selectedTask}
          collapsed={taskAttachmentsCollapsed}
          onToggleCollapsed={() => setTaskAttachmentsCollapsed((current: boolean) => !current)}
          attachmentViewMode={attachmentViewMode as 'list' | 'thumbnail' | 'card'}
          onAttachmentViewModeChange={setAttachmentViewMode as (mode: 'list' | 'thumbnail' | 'card') => void}
          attachmentTitleDraft={taskAttachmentTitleDrafts[selectedTask.id] || ''}
          onAttachmentTitleDraftChange={(value) => setTaskAttachmentTitleDrafts((current: Record<string, string>) => ({ ...current, [selectedTask.id]: value }))}
          attachmentUrlDraft={taskAttachmentDrafts[selectedTask.id] || ''}
          onAttachmentUrlDraftChange={(value) => setTaskAttachmentDrafts((current: Record<string, string>) => ({ ...current, [selectedTask.id]: value }))}
          attachmentFilePathDraft={taskAttachmentFilePathDrafts[selectedTask.id] || ''}
          attachmentFileDrafts={taskAttachmentFileDrafts[selectedTask.id] || []}
          onAttachmentFileDraftsChange={(files) => setTaskAttachmentFileDrafts((current: Record<string, File[]>) => ({ ...current, [selectedTask.id]: files }))}
          onAttachmentFilePathDraftChange={(value) => setTaskAttachmentFilePathDrafts((current: Record<string, string>) => ({ ...current, [selectedTask.id]: value }))}
          uploadingTaskAttachmentId={uploadingTaskAttachmentId}
          onAddAttachment={() => handleTaskAttachmentAdd(selectedTask)}
          onUploadAttachmentFiles={() => {
            const files = taskAttachmentFileDrafts[selectedTask.id] || []
            if (files.length === 0) return
            void (async () => {
              await handleTaskAttachmentFileUpload(selectedTask, files)
              setTaskAttachmentFileDrafts((current: Record<string, File[]>) => ({ ...current, [selectedTask.id]: [] }))
              setTaskAttachmentFilePathDrafts((current: Record<string, string>) => ({ ...current, [selectedTask.id]: '' }))
            })()
          }}
          attachments={getTaskAttachments(selectedTask)}
          getAttachmentTitle={(url) => getTaskAttachmentTitle(selectedTask, url)}
          getAttachmentReviewCount={(url) => computeAttachmentReviewCount(attachmentReviews, url)}
          isImageAttachmentUrl={isImageAttachmentUrl}
          onOpenAttachmentLightbox={openAttachmentLightbox}
          onRemoveAttachment={(url) => handleTaskAttachmentRemove(selectedTask, url)}
          embedded
        />

        <TaskDetailLinksSection
          selectedTask={selectedTask}
          embedded
          getTaskLinks={getTaskLinks}
          taskLinkTitleDrafts={taskLinkTitleDrafts}
          setTaskLinkTitleDrafts={setTaskLinkTitleDrafts}
          taskLinkDrafts={taskLinkDrafts}
          setTaskLinkDrafts={setTaskLinkDrafts}
          handleTaskLinkAdd={handleTaskLinkAdd}
          taskLinkEditingDrafts={taskLinkEditingDrafts}
          handleTaskLinkEditCancel={handleTaskLinkEditCancel}
          getTaskLinkTitle={getTaskLinkTitle}
          handleTaskLinkEditStart={handleTaskLinkEditStart}
          handleTaskLinkRemove={handleTaskLinkRemove}
        />
      </div>

      <details className="workhub-detail-collapsible-info">
        <summary>Task information</summary>
        <div className="workhub-detail-meta-grid">
          <DetailMetaItem
            icon="📁"
            label={selectedTaskParentEntityLabel}
            value={projectNameById[selectedTask.projectId] || `Unknown ${selectedTaskParentEntityLabel.toLowerCase()}`}
          />
          <DetailMetaItem
            icon="🕓"
            label="Created"
            value={formatTime(selectedTask.createdAt)}
          />
          <DetailMetaItem
            icon="↗"
            label="Start date"
            value={formatDueDateShort(selectedTask.startDate || '')}
          />
          <DetailMetaItem
            icon="⏱"
            label="Updated"
            value={formatTime(selectedTask.updatedAt)}
          />
          <DetailMetaItem
            icon="🗓"
            label="Due date"
            value={formatDueDateShort(selectedTask.dueDate || '')}
          />
          <DetailMetaItem
            icon="👤"
            label="Assignee"
            value={memberByUid[selectedTask.assigneeUid]?.displayName || memberByUid[selectedTask.assigneeUid]?.email || 'Unassigned'}
          />
          {milestones && milestones.length > 0 && onLinkTaskToMilestone && (
            <label className="workhub-detail-meta-select">
              <span>🏁 Milestone</span>
              <select
                className="workhub-input workhub-select workhub-milestone-select"
                value={selectedTask.milestoneId || ''}
                onChange={(e) => {
                  const value = e.target.value
                  void onLinkTaskToMilestone(selectedTask.id, value || null)
                }}
              >
                <option value="">— None —</option>
                {milestones.map((ms) => (
                  <option key={ms.id} value={ms.id}>{ms.name}</option>
                ))}
              </select>
            </label>
          )}
        </div>
      </details>
    </>
  )
  return (
    <TaskDetailSharedContext.Provider value={sharedContextValue}>
      <>
      {showStandaloneHeader && isMobileWorkhubLayout && (
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
            <button type="button" className="workhub-ghost-mini" onClick={() => setSelectedTaskId('')}>{'\u2715'}</button>
          </div>
        </div>
      )}
      {isSplitDialogLayout ? (
        <div
          ref={dialogLayoutRef}
          className={`workhub-task-dialog-layout${isDialogResizing ? ' is-resizing' : ''}`}
        >
          <section className="workhub-task-dialog-details-pane">
            {detailSections}
          </section>
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize task detail panels"
            tabIndex={0}
            className="workhub-task-dialog-splitter"
            onPointerDown={handleDialogResizePointerDown}
            onKeyDown={handleDialogResizeKeyDown}
          />
          <section className="workhub-task-dialog-discussion-pane">
            {taskDiscussionNode}
          </section>
        </div>
      ) : (
        <>
          {detailSections}
          {taskDiscussionNode}
        </>
      )}
    </>
    </TaskDetailSharedContext.Provider>
  )
})
