import { useState, useEffect, memo, useMemo, createContext, useContext, type ReactNode, type Dispatch, type SetStateAction } from 'react'
import type { WorkhubTask, WorkhubTaskStatusConfig, WorkhubMember, WorkhubTaskChecklistItem } from '../../../lib/workhubRepo'
import type { WorkhubImageReview } from '../imageReview'
import { WorkhubTaskAttachmentCard } from './WorkhubTaskAttachmentCard'
import { WorkhubTaskChecklistCard } from './WorkhubTaskChecklistCard'

// ─── Shared context (Priority 4) ───────────────────────────────────────────
interface TaskDetailSharedContextValue {
  memberByUid: Record<string, WorkhubMember>
  formatDueDateShort: (date: string) => string
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
  selectedTask: WorkhubTask
  setSelectedTaskId: (id: string) => void
  setTaskDeleteConfirmOpen: (open: boolean) => void
  detailMenuOpen: string
  setDetailMenuOpen: (key: string) => void
  setDetailMenuCoords: (coords: { top: number; left: number; right: number } | null) => void
  selectedProjectEffectiveTaskStatuses: WorkhubTaskStatusConfig[]
  PRIORITY_LABELS: Record<string, string>
  memberByUid: Record<string, WorkhubMember>
  formatDueDateShort: (date: string) => string
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

interface DetailChipButtonProps {
  label: string
  value: string
  menuKey: string
  detailMenuOpen: string
  setDetailMenuOpen: (key: string) => void
  setDetailMenuCoords: (coords: { top: number; left: number; right: number } | null) => void
}

function DetailChipButton({ label, value, menuKey, detailMenuOpen, setDetailMenuOpen, setDetailMenuCoords }: DetailChipButtonProps) {
  return (
    <div className="workhub-detail-icon-wrap">
      <button
        type="button"
        className="workhub-detail-icon-btn"
        title={`${label}: ${value}`}
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect()
          if (detailMenuOpen === menuKey) {
            setDetailMenuOpen('')
            setDetailMenuCoords(null)
          } else {
            setDetailMenuOpen(menuKey)
            setDetailMenuCoords({ top: rect.bottom + 4, left: rect.left, right: window.innerWidth - rect.right })
          }
        }}
      >
        <span className="workhub-detail-chip-label">{label}</span>
        <span className="workhub-detail-chip-value">{value}</span>
        <span className="workhub-detail-chip-edit" aria-hidden="true">{'\u25BE'}</span>
      </button>
    </div>
  )
}

// ─── Links section (Priority 3 – extracted memoized component) ─────────────
interface TaskDetailLinksSectionProps {
  selectedTask: WorkhubTask
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
  const { attachmentViewMode, setAttachmentViewMode, getUrlHostLabel, getInitials, memberByUid } = useTaskDetailShared()
  const taskLinks: string[] = getTaskLinks(selectedTask)
  return (
    <div className="workhub-detail-card workhub-task-resource-card">
      <div className="workhub-task-attachments-head">
        <span>{`Links (${taskLinks.length})`}</span>
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
      {taskLinks.length === 0 && (
        <div className="workhub-empty-state">No links yet.</div>
      )}
    </div>
  )
})

// ─── Main panel (Priority 3 – memo wrapped) ─────────────────────────────────
export const WorkhubTaskDetailPanel = memo(function WorkhubTaskDetailPanel({
  isMobileWorkhubLayout,
  selectedTask,
  setSelectedTaskId,
  setTaskDeleteConfirmOpen,
  detailMenuOpen,
  setDetailMenuOpen,
  setDetailMenuCoords,
  selectedProjectEffectiveTaskStatuses,
  PRIORITY_LABELS,
  memberByUid,
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
}: WorkhubTaskDetailPanelProps) {
  // Priority 1 – local draft state
  const [titleDraft, setTitleDraft] = useState(selectedTask.title || '')
  const [descriptionDraft, setDescriptionDraft] = useState(selectedTask.description || '')
  const [valueAmountDraft, setValueAmountDraft] = useState(selectedTask.valueAmount != null ? String(selectedTask.valueAmount) : '')
  const [valueCurrencyDraft, setValueCurrencyDraft] = useState(selectedTask.valueCurrency || '')

  useEffect(() => {
    setTitleDraft(selectedTask.title || '')
    setDescriptionDraft(selectedTask.description || '')
    setValueAmountDraft(selectedTask.valueAmount != null ? String(selectedTask.valueAmount) : '')
    setValueCurrencyDraft(selectedTask.valueCurrency || '')
  }, [selectedTask.id]) // eslint-disable-line react-hooks/exhaustive-deps

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
  return (
    <TaskDetailSharedContext.Provider value={sharedContextValue}>
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
            <button type="button" className="workhub-ghost-mini" onClick={() => setSelectedTaskId('')}>{'\u2715'}</button>
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
                <span className="workhub-detail-danger-icon" aria-hidden="true">{'\u{1F5D1}'}</span>
              </button>
            </div>
          </div>
        )}
        <div className="workhub-detail-icon-row">
          <DetailChipButton
            label="Status"
            value={selectedProjectEffectiveTaskStatuses.find((value: any) => value.id === selectedTask.status)?.label || selectedTask.status}
            menuKey="status"
            detailMenuOpen={detailMenuOpen}
            setDetailMenuOpen={setDetailMenuOpen}
            setDetailMenuCoords={setDetailMenuCoords}
          />
          <DetailChipButton
            label="Priority"
            value={PRIORITY_LABELS[selectedTask.priority]}
            menuKey="priority"
            detailMenuOpen={detailMenuOpen}
            setDetailMenuOpen={setDetailMenuOpen}
            setDetailMenuCoords={setDetailMenuCoords}
          />
          <DetailChipButton
            label="Assignee"
            value={memberByUid[selectedTask.assigneeUid]?.displayName || memberByUid[selectedTask.assigneeUid]?.email || 'Unassigned'}
            menuKey="assignee"
            detailMenuOpen={detailMenuOpen}
            setDetailMenuOpen={setDetailMenuOpen}
            setDetailMenuCoords={setDetailMenuCoords}
          />
          <DetailChipButton
            label="Due date"
            value={formatDueDateShort(selectedTask.dueDate || '')}
            menuKey="dueDate"
            detailMenuOpen={detailMenuOpen}
            setDetailMenuOpen={setDetailMenuOpen}
            setDetailMenuCoords={setDetailMenuCoords}
          />

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
            value={titleDraft}
            onChange={(event) => setTitleDraft(event.target.value)}
            onKeyDown={(event) => {
              if (!(event.key === 'Enter' && (event.ctrlKey || event.metaKey))) return
              event.preventDefault()
              handleSelectedTaskTitleSave(selectedTask, titleDraft)
              event.currentTarget.blur()
            }}
            onBlur={() => handleSelectedTaskTitleSave(selectedTask, titleDraft)}
            rows={2}
          />
        </label>
        <textarea
          className="workhub-task-details-input"
          value={descriptionDraft}
          onChange={(event) => setDescriptionDraft(event.target.value)}
          onBlur={() => handleSelectedTaskDescriptionSave(selectedTask, descriptionDraft)}
          placeholder="Task details"
        />
        <details className="workhub-detail-collapsible-info">
          <summary>Task information</summary>
          <div className="workhub-detail-meta">
            <span>{`${selectedTaskParentEntityLabel}: ${projectNameById[selectedTask.projectId] || `Unknown ${selectedTaskParentEntityLabel.toLowerCase()}`}`}</span>
            <span>Assignee: {memberByUid[selectedTask.assigneeUid]?.displayName || memberByUid[selectedTask.assigneeUid]?.email || 'Unassigned'}</span>
            <span>Created: {formatTime(selectedTask.createdAt)}</span>
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

      {taskDiscussionNode}

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
      />

      <TaskDetailLinksSection
        selectedTask={selectedTask}
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
    </>
    </TaskDetailSharedContext.Provider>
  )
})
