import { memo, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { WorkhubMember, WorkhubTask, WorkhubTaskChecklistItem, WorkhubTaskPriority, WorkhubTaskStatus } from '../../../lib/workhubRepo'
import { PRIORITY_LABELS, getPriorityIcon } from '../constants'
import { formatDueDateShort, formatTaskDueDisplay, getInitials, normalizeTaskTitle } from '../taskUtils'

function parseTaskDateValue(value?: string, endOfDay = false): number | null {
  const normalized = (value || '').trim()
  if (!normalized) return null
  const parsed = Date.parse(`${normalized}T${endOfDay ? '23:59:59' : '00:00:00'}`)
  return Number.isFinite(parsed) ? parsed : null
}

function getTaskRemainingTimeMeta(startDate?: string, dueDate?: string, dueTime?: string) {
  const dueMs = dueDate
    ? (dueTime
      ? Date.parse(`${dueDate}T${dueTime}`)
      : parseTaskDateValue(dueDate, true))
    : null
  if (!dueMs) {
    return {
      percent: 0,
      centerValue: '--',
      centerCaption: 'open',
      textLabel: 'No deadline',
      isOverdue: false,
      hasDueDate: false,
    }
  }

  const now = Date.now()
  const remainingMs = dueMs - now
  if (remainingMs <= 0) {
    return {
      percent: 0,
      centerValue: '0%',
      centerCaption: 'left',
      textLabel: 'Overdue',
      isOverdue: true,
      hasDueDate: true,
    }
  }

  const startMs = parseTaskDateValue(startDate, false)
  const totalMs = startMs && startMs < dueMs
    ? Math.max(dueMs - startMs, 1)
    : 14 * 24 * 60 * 60 * 1000
  const percent = Math.max(0, Math.min(100, Math.round((remainingMs / totalMs) * 100)))

  const oneHour = 60 * 60 * 1000
  const oneDay = 24 * oneHour
  const totalHours = Math.ceil(remainingMs / oneHour)
  const totalDays = Math.ceil(remainingMs / oneDay)
  const centerValue = remainingMs < oneDay
    ? `${Math.max(1, totalHours)}h`
    : totalDays < 31
      ? `${Math.max(1, totalDays)}d`
      : `${Math.max(1, Math.ceil(totalDays / 30))}m`

  return {
    percent,
    centerValue,
    centerCaption: 'left',
    textLabel: formatTaskDueDisplay(dueDate || '', dueTime, 'remaining'),
    isOverdue: false,
    hasDueDate: true,
  }
}

interface TaskRowMeta {
  checklist: WorkhubTaskChecklistItem[]
  checklistDoneCount: number
  checklistDetailsCount: number
  checklistImagesCount: number
  checklistLinksCount: number
  taskAttachmentCount: number
  financeValue?: { totalValue: number; usedValue: number; remaining: number; currency: string } | null
}
const emptyTaskRowMeta: TaskRowMeta = {
  checklist: [], checklistDoneCount: 0, checklistDetailsCount: 0,
  checklistImagesCount: 0, checklistLinksCount: 0, taskAttachmentCount: 0, financeValue: null,
}

interface TaskRowCallbacks {
  onDragOver: (event: React.DragEvent, taskId: string, taskStatus: string) => void
  onDrop: (event: React.DragEvent, taskId: string, taskStatus: string) => void
  onRowClick: (taskId: string) => void
  onRowContextMenu: (taskId: string, clientX: number, clientY: number) => void
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
  onDueDateChange: (task: WorkhubTask, value: string) => void
  onOpenDetails: (taskId: string) => void
  onChecklistItemToggle: (task: WorkhubTask, itemId: string, checked: boolean) => void
  onChecklistItemEditStart: (taskId: string, itemId: string, text: string, scope: 'inline' | 'details') => void
  onChecklistItemTextChange: (text: string) => void
  onChecklistItemEditSave: (task: WorkhubTask, itemId: string) => void
  onChecklistItemEditCancel: () => void
  onChecklistRemove: (task: WorkhubTask, itemId: string) => void
  onChecklistAdd: (task: WorkhubTask) => void
  onChecklistDraftChange: (taskId: string, value: string) => void
  onChecklistItemValueChange?: (task: WorkhubTask, itemId: string, value: number | null) => void
  onTaskValueChange?: (task: WorkhubTask, value: number | null) => void
}

interface TaskRowProps {
  task: WorkhubTask
  dueDisplayMode: 'remaining' | 'date'
  displayMode?: 'list' | 'cards' | 'grid' | 'timeline'
  index: number
  isChecked: boolean
  isSelected: boolean
  isLinkedHighlight?: boolean
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
  meta: TaskRowMeta
  unreadCommentCount?: number
  isFinanceLayout?: boolean
  callbacks: TaskRowCallbacks
}

const TaskRow = memo(function TaskRow({
  task, dueDisplayMode, displayMode = 'list', index, isChecked, isSelected, isLinkedHighlight = false, isDropTarget, isDragSource,
  statusMenuOpen, priorityMenuOpen, moreMenuOpen, assigneeMenuOpen,
  editingTitle, editingTitleText, checklistExpanded, checklistDraft,
  editingChecklistItemId, editingChecklistScope, editingChecklistText,
  isTaskBusy, taskAssignee, taskCreator, assignableMembers, meta, unreadCommentCount = 0, isFinanceLayout, callbacks,
}: TaskRowProps) {
  const { checklist } = meta
  const assigneeBtnRef = useRef<HTMLButtonElement | null>(null)
  const [assigneeMenuStyle, setAssigneeMenuStyle] = useState<React.CSSProperties>({})
  const assigneeLabel = taskAssignee?.displayName || taskAssignee?.email || 'Unassigned'
  const creatorLabel = taskCreator?.displayName || taskCreator?.email || 'Unknown'
  const showCreatorSeparately = taskCreator && taskCreator.uid !== task.assigneeUid
  const assigneeIsCreator = taskCreator?.uid === task.assigneeUid
  const hasOpenInlineMenu = statusMenuOpen || priorityMenuOpen || moreMenuOpen || assigneeMenuOpen
  const dueLabel = formatTaskDueDisplay(task.dueDate || '', task.dueTime, dueDisplayMode)
  const totalAttachmentCount = meta.taskAttachmentCount + meta.checklistImagesCount
  const checklistTotal = checklist.length
  const checklistDone = Math.min(meta.checklistDoneCount, checklistTotal)
  const checklistProgressPercent = checklistTotal > 0
    ? Math.max(8, Math.round((checklistDone / checklistTotal) * 100))
    : 0
  const isCardDisplay = displayMode === 'cards'
  const isGridDisplay = displayMode === 'grid'
  const remainingTimeMeta = getTaskRemainingTimeMeta(task.startDate, task.dueDate, task.dueTime)
  const dueDateLabel = task.dueDate ? formatDueDateShort(task.dueDate, task.dueTime) : 'No deadline'
  const ringRadius = 28
  const ringCircumference = 2 * Math.PI * ringRadius
  const ringOffset = ringCircumference - ((remainingTimeMeta.percent / 100) * ringCircumference)
  const gridRingR = 14
  const gridRingC = 2 * Math.PI * gridRingR
  const gridRingOff = gridRingC - ((remainingTimeMeta.percent / 100) * gridRingC)

  const assigneeMenu = assigneeMenuOpen && createPortal(
    <div
      className="workhub-task-assignee-menu"
      style={assigneeMenuStyle}
      onClick={(event) => event.stopPropagation()}
    >
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
    </div>,
    document.body,
  )

  useEffect(() => {
    if (!assigneeMenuOpen) return
    const btn = assigneeBtnRef.current
    if (!btn) return
    const r = btn.getBoundingClientRect()
    const menuH = Math.min(300, window.innerHeight * 0.42)
    const spaceBelow = window.innerHeight - r.bottom
    const goUp = spaceBelow < menuH + 8 && r.top > spaceBelow
    if (goUp) {
      setAssigneeMenuStyle({ position: 'fixed', bottom: window.innerHeight - r.top + 4, left: r.left, minWidth: 160, zIndex: 9999 })
    } else {
      setAssigneeMenuStyle({ position: 'fixed', top: r.bottom + 4, left: r.left, minWidth: 160, zIndex: 9999 })
    }
  }, [assigneeMenuOpen, assignableMembers.length])

  return (
    <article
      className={`workhub-task-row${isSelected ? ' is-selected' : ''}${isLinkedHighlight ? ' is-linked-highlight' : ''}${isChecked ? ' is-checked' : ''}${index % 2 === 1 ? ' is-alt' : ''}${hasOpenInlineMenu ? ' has-open-menu' : ''}${isDropTarget ? ' is-drop-target' : ''}${isDragSource ? ' is-dragging' : ''}`}
      onDragOver={(event) => callbacks.onDragOver(event, task.id, task.status)}
      onDrop={(event) => callbacks.onDrop(event, task.id, task.status)}
      onClick={() => callbacks.onRowClick(task.id)}
      onContextMenu={(event) => {
        event.preventDefault()
        event.stopPropagation()
        callbacks.onRowContextMenu(task.id, event.clientX, event.clientY)
      }}
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
        {isCardDisplay ? (
          <div className="workhub-task-card-layout">
            <div className="workhub-task-card-main-col">
              <div className="workhub-task-col details workhub-task-card-details">
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(event) => callbacks.onCheckboxChange(task.id, event.target.checked)}
                  onClick={(event) => event.stopPropagation()}
                />
                <div
                  className="workhub-task-row-title workhub-task-card-title"
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
                    <strong onDoubleClick={(event) => { event.stopPropagation(); callbacks.onTitleEditStart(task) }}>
                      {normalizeTaskTitle(task.title || '') || 'Untitled task'}
                    </strong>
                  )}
                </div>
              </div>

              <div className="workhub-task-card-meta-grid">
                <button
                  ref={assigneeBtnRef}
                  type="button"
                  className="workhub-task-card-meta-item is-assignee"
                  aria-label={`Assignee: ${assigneeLabel}`}
                  onClick={(event) => {
                    event.stopPropagation()
                    callbacks.onOpenAssigneeMenu(task.id)
                  }}
                >
                  <span className="workhub-task-card-meta-icon" aria-hidden="true">
                    {taskAssignee?.photoURL
                      ? <img src={taskAssignee.photoURL} alt={assigneeLabel} className="workhub-task-card-meta-avatar" />
                      : <span className="workhub-task-card-meta-avatar-fallback">👤</span>}
                  </span>
                  <span className="workhub-task-card-meta-copy">{assigneeLabel}</span>
                </button>

                <button
                  type="button"
                  className="workhub-task-card-meta-item is-deadline"
                  onClick={(event) => {
                    event.stopPropagation()
                    const container = event.currentTarget.closest('.workhub-task-card-meta-item')
                    const input = container?.querySelector('.workhub-task-due-input') as HTMLInputElement | null
                    if (!input) return
                    const pickerInput = input as HTMLInputElement & { showPicker?: () => void }
                    pickerInput.showPicker?.()
                    input.focus()
                  }}
                  title={task.dueDate ? `Due date: ${formatDueDateShort(task.dueDate, task.dueTime)}` : 'Set due date'}
                >
                  <span className="workhub-task-card-meta-icon" aria-hidden="true">📅</span>
                  <span className="workhub-task-card-meta-copy">{dueDateLabel}</span>
                  <input
                    type="date"
                    lang="en-GB"
                    className="workhub-task-due-input"
                    value={task.dueDate || ''}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => callbacks.onDueDateChange(task, event.target.value)}
                    aria-label={task.dueDate ? `Due date: ${formatDueDateShort(task.dueDate, task.dueTime)}` : 'Set due date'}
                  />
                </button>

                <span className="workhub-task-card-meta-item is-time" title={remainingTimeMeta.textLabel}>
                  <span className="workhub-task-card-meta-icon" aria-hidden="true">⏱</span>
                  <span className="workhub-task-card-meta-copy">{remainingTimeMeta.textLabel}</span>
                </span>

                <span className="workhub-task-card-meta-item is-priority" aria-label={`Priority: ${PRIORITY_LABELS[task.priority]}`}>
                  <span className="workhub-task-card-meta-icon" aria-hidden="true">{getPriorityIcon(task.priority)}</span>
                  <span className="workhub-task-card-meta-copy">{PRIORITY_LABELS[task.priority]}</span>
                </span>
              </div>

              <div className="workhub-task-card-supporting">
                {unreadCommentCount > 0 && (
                  <span
                    className="workhub-task-comment-unread-chip"
                    title={`${unreadCommentCount} unread comment${unreadCommentCount === 1 ? '' : 's'}`}
                    aria-label={`${unreadCommentCount} unread comment${unreadCommentCount === 1 ? '' : 's'}`}
                  >
                    💬 {unreadCommentCount}
                  </span>
                )}
                {totalAttachmentCount > 0 && (
                  <span
                    className="workhub-task-attachment-chip"
                    title={`${totalAttachmentCount} attachment${totalAttachmentCount === 1 ? '' : 's'}`}
                    aria-label={`${totalAttachmentCount} attachment${totalAttachmentCount === 1 ? '' : 's'}`}
                  >
                    📎 {totalAttachmentCount}
                  </span>
                )}
                {checklistTotal > 0 && (
                  <span className="workhub-task-checklist-progress" title={`${checklistDone} of ${checklistTotal} checklist items completed`}>
                    <span className="workhub-task-checklist-progress-track" aria-hidden="true">
                      <span className="workhub-task-checklist-progress-fill" style={{ width: `${checklistProgressPercent}%` }} />
                    </span>
                    <span className="workhub-task-checklist-progress-label">{checklistDone}/{checklistTotal}</span>
                  </span>
                )}
                <button
                  className="workhub-checklist-toggle"
                  onClick={(event) => { event.stopPropagation(); callbacks.onToggleChecklist(task.id) }}
                  aria-label="Toggle checklist"
                >
                  {checklistTotal}
                </button>
              </div>
            </div>

            <div className="workhub-task-card-time-col" aria-label={`Remaining time ${remainingTimeMeta.textLabel}`}>
              <div className={`workhub-task-time-ring${remainingTimeMeta.isOverdue ? ' is-overdue' : ''}${!remainingTimeMeta.hasDueDate ? ' is-empty' : ''}`}>
                <svg viewBox="0 0 72 72" aria-hidden="true">
                  <circle className="workhub-task-time-ring-track" cx="36" cy="36" r={ringRadius} />
                  <circle
                    className="workhub-task-time-ring-progress"
                    cx="36"
                    cy="36"
                    r={ringRadius}
                    style={{ strokeDasharray: `${ringCircumference} ${ringCircumference}`, strokeDashoffset: ringOffset }}
                  />
                </svg>
                <div className="workhub-task-time-ring-center">
                  <strong>{remainingTimeMeta.centerValue}</strong>
                  <span>{remainingTimeMeta.centerCaption}</span>
                </div>
              </div>
            </div>

            {assigneeMenu}
          </div>
        ) : isGridDisplay ? (
          <div
            className="workhub-task-grid-card"
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              width: '100%',
              minWidth: 0,
              padding: '10px 8px 10px 6px',
              boxSizing: 'border-box',
            }}
          >
            <div
              className="workhub-task-grid-card-body"
              style={{
                flex: '1 1 auto',
                minWidth: 0,
                display: 'grid',
                gridTemplateColumns: 'min-content minmax(0, 1fr)',
                columnGap: '8px',
                rowGap: '6px',
                alignItems: 'center',
              }}
            >
              {/* Row 1, Col 1: Checkbox */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <input
                  type="checkbox"
                  style={{ margin: 0, padding: 0 }}
                  checked={isChecked}
                  onChange={(event) => callbacks.onCheckboxChange(task.id, event.target.checked)}
                  onClick={(event) => event.stopPropagation()}
                />
              </div>

              {/* Row 1, Col 2: Title */}
              <div
                className="workhub-task-row-title workhub-task-grid-title"
                style={{ flex: '1 1 auto', minWidth: 0, overflow: 'hidden', textAlign: 'left', direction: 'ltr' }}
                onDoubleClick={(event) => {
                  event.stopPropagation()
                  if (!editingTitle) callbacks.onTitleEditStart(task)
                }}
              >
                {editingTitle ? (
                  <input
                    type="text"
                    className="workhub-task-title-edit-input"
                    style={{ width: '100%', boxSizing: 'border-box' }}
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
                  <strong
                    style={{
                      display: 'block',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      fontWeight: 700,
                      fontSize: '0.82rem',
                    }}
                    onDoubleClick={(event) => { event.stopPropagation(); callbacks.onTitleEditStart(task) }}
                  >
                    {normalizeTaskTitle(task.title || '') || 'Untitled task'}
                  </strong>
                )}
              </div>

              {/* Row 2, Col 1: Avatar */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <button
                  ref={assigneeBtnRef}
                  type="button"
                  className="workhub-task-grid-meta-btn is-assignee"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: 'none',
                    background: 'none',
                    padding: '2px',
                    margin: 0,
                    cursor: 'pointer',
                  }}
                  aria-label={`Assignee: ${assigneeLabel}`}
                  onClick={(event) => { event.stopPropagation(); callbacks.onOpenAssigneeMenu(task.id) }}
                >
                  {taskAssignee?.photoURL
                    ? <img src={taskAssignee.photoURL} alt={assigneeLabel} style={{ width: 16, height: 16, borderRadius: '50%', objectFit: 'cover', display: 'block' }} />
                    : <span style={{ fontSize: '0.72rem', lineHeight: 1 }}>👤</span>}
                </button>
              </div>

              {/* Row 2, Col 2: Date & Priority */}
              <div
                className="workhub-task-grid-line2"
                style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap', minWidth: 0 }}
              >
                <button
                  type="button"
                  className={`workhub-task-grid-meta-btn is-due${task.dueDate ? ' is-set' : ''}`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    border: 'none',
                    background: 'none',
                    color: task.dueDate ? '#2a6aa0' : '#4a6a90',
                    fontWeight: task.dueDate ? 600 : 500,
                    fontSize: '0.71rem',
                    borderRadius: 4,
                    padding: '2px 4px',
                    cursor: 'pointer',
                    position: 'relative',
                  }}
                  onClick={(event) => {
                    event.stopPropagation()
                    const container = event.currentTarget.closest('.workhub-task-grid-line2')
                    const input = container?.querySelector('.workhub-task-due-input') as HTMLInputElement | null
                    if (!input) return
                    const pickerInput = input as HTMLInputElement & { showPicker?: () => void }
                    pickerInput.showPicker?.()
                    input.focus()
                  }}
                  title={task.dueDate ? `Due: ${dueDateLabel}` : 'Set due date'}
                >
                  📅 <span>{dueDateLabel}</span>
                  <input
                    type="date"
                    lang="en-GB"
                    className="workhub-task-due-input"
                    style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0 }}
                    value={task.dueDate || ''}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => callbacks.onDueDateChange(task, event.target.value)}
                    aria-label="Due date"
                  />
                </button>
                <span
                  className={`workhub-priority-indicator priority-${task.priority}`}
                  style={{ fontSize: '0.78rem', lineHeight: 1 }}
                  aria-label={`Priority: ${PRIORITY_LABELS[task.priority]}`}
                >
                  {getPriorityIcon(task.priority)}
                </span>
              </div>
            </div>
            <div
              className={`workhub-task-grid-time-ring${remainingTimeMeta.isOverdue ? ' is-overdue' : ''}${!remainingTimeMeta.hasDueDate ? ' is-empty' : ''}`}
              style={{
                flexShrink: 0,
                width: 40,
                height: 40,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              aria-label={remainingTimeMeta.textLabel}
              title={remainingTimeMeta.textLabel}
            >
              <svg viewBox="0 0 36 36" aria-hidden="true" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                <circle cx="18" cy="18" r={gridRingR} fill="none" stroke="#d8e8f5" strokeWidth="3" />
                <circle
                  cx="18"
                  cy="18"
                  r={gridRingR}
                  fill="none"
                  stroke={remainingTimeMeta.isOverdue ? '#e05050' : (remainingTimeMeta.hasDueDate ? '#4a7cbc' : '#9ab0cc')}
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeDasharray={`${gridRingC} ${gridRingC}`}
                  strokeDashoffset={gridRingOff}
                />
              </svg>
              <div style={{ position: 'relative', zIndex: 1, textAlign: 'center', lineHeight: 1 }}>
                <strong style={{ display: 'block', fontSize: '0.62rem', fontWeight: 700, color: remainingTimeMeta.isOverdue ? '#c03030' : '#2a5585', whiteSpace: 'nowrap' }}>{remainingTimeMeta.centerValue}</strong>
              </div>
            </div>
            {assigneeMenu}
          </div>
        ) : (
          <div className="workhub-task-row-grid">
            <div className="workhub-task-col details">
              <button
                type="button"
                className="workhub-task-drag-handle"
                draggable
                onClick={(event) => event.stopPropagation()}
                onDragStart={(event) => { event.stopPropagation(); callbacks.onDragStart(event, task.id, task.status) }}
                onDragEnd={() => callbacks.onDragEnd()}
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
                  <strong
                    onDoubleClick={(event) => { event.stopPropagation(); callbacks.onTitleEditStart(task) }}
                  >
                    {normalizeTaskTitle(task.title || '') || 'Untitled task'}
                  </strong>
                )}
              </div>
            </div>
            {isFinanceLayout && (
              <div className="workhub-task-col finance-value" onClick={(e) => e.stopPropagation()}>
                <span className="workhub-finance-value-currency">{task.valueCurrency || 'OMR'}</span>
                <input
                  key={task.valueAmount ?? 'empty'}
                  type="number"
                  min={0}
                  step={0.01}
                  className="workhub-finance-value-input"
                  defaultValue={task.valueAmount ?? ''}
                  placeholder="0.00"
                  onClick={(e) => e.stopPropagation()}
                  onKeyDown={(e) => {
                    e.stopPropagation()
                    if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                    if (e.key === 'Escape') (e.target as HTMLInputElement).blur()
                  }}
                  onBlur={(e) => {
                    const raw = e.target.value.trim()
                    const parsed = raw === '' ? null : parseFloat(raw)
                    if (callbacks.onTaskValueChange) {
                      callbacks.onTaskValueChange(task, parsed !== null && !isNaN(parsed) ? parsed : null)
                    }
                  }}
                />
              </div>
            )}
            <div className="workhub-task-col assignee">
              <div className="workhub-task-people">
                {showCreatorSeparately && (
                  <span className="workhub-assignee-badge workhub-task-creator-badge">
                    {taskCreator!.photoURL
                      ? <img src={taskCreator!.photoURL} alt={creatorLabel} />
                      : <span className="workhub-assignee-initials">{getInitials(creatorLabel)}</span>}
                  </span>
                )}
                <button
                  ref={assigneeBtnRef}
                  type="button"
                  className={`workhub-assignee-badge workhub-task-assignee-btn${assigneeIsCreator ? ' is-creator' : ''}`}
                  aria-label={`Assignee: ${assigneeLabel}`}
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
              {assigneeMenu}
            </div>
            <div className="workhub-task-col due">
              <div className="workhub-task-due-inline">
                <button
                  type="button"
                  className="workhub-task-due-picker-trigger"
                  onClick={(event) => {
                    event.stopPropagation()
                    const container = event.currentTarget.closest('.workhub-task-due-inline')
                    const input = container?.querySelector('.workhub-task-due-input') as HTMLInputElement | null
                    if (!input) return
                    const pickerInput = input as HTMLInputElement & { showPicker?: () => void }
                    pickerInput.showPicker?.()
                    input.focus()
                  }}
                  aria-label="Open due date picker"
                >
                  📅
                </button>
                <button
                  type="button"
                  className={`workhub-task-due-label${task.dueDate ? ' is-set' : ''}`}
                  onClick={(event) => {
                    event.stopPropagation()
                    const container = event.currentTarget.closest('.workhub-task-due-inline')
                    const input = container?.querySelector('.workhub-task-due-input') as HTMLInputElement | null
                    if (!input) return
                    const pickerInput = input as HTMLInputElement & { showPicker?: () => void }
                    pickerInput.showPicker?.()
                    input.focus()
                  }}
                  title={task.dueDate ? `Due date: ${formatDueDateShort(task.dueDate, task.dueTime)}` : 'Set due date'}
                  aria-label={task.dueDate ? `Due date ${dueLabel}` : 'Set due date'}
                >
                  {dueLabel}
                </button>
                {task.startDate && (
                  <span className="workhub-task-start-inline" title={`Start date: ${formatDueDateShort(task.startDate)}`}>
                    ▶ {formatDueDateShort(task.startDate)}
                  </span>
                )}
                {checklistTotal > 0 && (
                  <span className="workhub-task-title-checklist-progress" title={`${checklistDone} of ${checklistTotal} checklist items done`}>
                    <span className="workhub-task-checklist-progress-track" aria-hidden="true">
                      <span className="workhub-task-checklist-progress-fill" style={{ width: `${checklistProgressPercent}%` }} />
                    </span>
                    <span className="workhub-task-checklist-progress-label">{checklistDone}/{checklistTotal}</span>
                  </span>
                )}
                <input
                  type="date"
                  lang="en-GB"
                  className="workhub-task-due-input"
                  value={task.dueDate || ''}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => callbacks.onDueDateChange(task, event.target.value)}
                  aria-label={task.dueDate ? `Due date: ${formatDueDateShort(task.dueDate, task.dueTime)}` : 'Set due date'}
                />
              </div>
            </div>
            <div className="workhub-task-col priority">
              <span
                className={`workhub-priority-indicator priority-${task.priority}`}
                aria-label={`Priority: ${PRIORITY_LABELS[task.priority]}`}
              >
                {getPriorityIcon(task.priority)}
              </span>
            </div>
            <div className="workhub-task-col checklist-inline">
              {unreadCommentCount > 0 && (
                <span
                  className="workhub-task-comment-unread-chip"
                  title={`${unreadCommentCount} unread comment${unreadCommentCount === 1 ? '' : 's'}`}
                  aria-label={`${unreadCommentCount} unread comment${unreadCommentCount === 1 ? '' : 's'}`}
                >
                  💬 {unreadCommentCount}
                </span>
              )}
              {totalAttachmentCount > 0 && (
                <span
                  className="workhub-task-attachment-chip"
                  title={`${totalAttachmentCount} attachment${totalAttachmentCount === 1 ? '' : 's'}`}
                  aria-label={`${totalAttachmentCount} attachment${totalAttachmentCount === 1 ? '' : 's'}`}
                >
                  📎
                </span>
              )}
              {checklistTotal > 0 && (
                <span className="workhub-task-checklist-progress" title={`${checklistDone} of ${checklistTotal} checklist items completed`}>
                  <span className="workhub-task-checklist-progress-track" aria-hidden="true">
                    <span className="workhub-task-checklist-progress-fill" style={{ width: `${checklistProgressPercent}%` }} />
                  </span>
                  <span className="workhub-task-checklist-progress-label">{checklistDone}/{checklistTotal}</span>
                </span>
              )}
              <button
                className="workhub-checklist-toggle"
                onClick={(event) => { event.stopPropagation(); callbacks.onToggleChecklist(task.id) }}
                aria-label="Toggle checklist"
              >
                {checklistTotal}
              </button>
            </div>
          </div>
        )}
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
                      {isFinanceLayout && (
                        <input
                          type="number"
                          min={0}
                          step={0.01}
                          className="workhub-checklist-value-input"
                          value={item.valueAmount ?? ''}
                          placeholder="0.00"
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => {
                            const raw = e.target.value.trim()
                            const parsed = raw === '' ? null : parseFloat(raw)
                            if (callbacks.onChecklistItemValueChange) {
                              callbacks.onChecklistItemValueChange(task, item.id, parsed !== null && !isNaN(parsed) ? parsed : null)
                            }
                          }}
                          onBlur={(e) => {
                            const raw = e.target.value.trim()
                            const parsed = raw === '' ? null : parseFloat(raw)
                            if (callbacks.onChecklistItemValueChange) {
                              callbacks.onChecklistItemValueChange(task, item.id, parsed !== null && !isNaN(parsed) ? parsed : null)
                            }
                          }}
                        />
                      )}
                      <button
                        type="button"
                        className="workhub-checklist-edit"
                        onClick={(e) => { e.stopPropagation(); callbacks.onChecklistItemEditStart(task.id, item.id, item.text, 'inline') }}
                        aria-label="Edit checklist item"
                      >
                        ✏️
                      </button>
                      <button
                        type="button"
                        className="workhub-checklist-remove"
                        onClick={(e) => { e.stopPropagation(); callbacks.onChecklistRemove(task, item.id) }}
                        aria-label="Delete checklist item"
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

export { TaskRow, emptyTaskRowMeta }
export type { TaskRowMeta, TaskRowCallbacks }
