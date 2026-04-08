import { memo } from 'react'
import type { WorkhubMember, WorkhubTask, WorkhubTaskChecklistItem, WorkhubTaskPriority, WorkhubTaskStatus } from '../../../lib/workhubRepo'
import { PRIORITY_LABELS, getPriorityIcon } from '../constants'
import { formatDueDateShort, getInitials, normalizeTaskTitle } from '../taskUtils'

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
  meta: TaskRowMeta
  callbacks: TaskRowCallbacks
}

const TaskRow = memo(function TaskRow({
  task, index, isChecked, isSelected, isDropTarget, isDragSource,
  statusMenuOpen, priorityMenuOpen, moreMenuOpen, assigneeMenuOpen,
  editingTitle, editingTitleText, checklistExpanded, checklistDraft,
  editingChecklistItemId, editingChecklistScope, editingChecklistText,
  isTaskBusy, taskAssignee, taskCreator, assignableMembers, meta, callbacks,
}: TaskRowProps) {
  const { checklist } = meta
  const assigneeLabel = taskAssignee?.displayName || taskAssignee?.email || 'Unassigned'
  const creatorLabel = taskCreator?.displayName || taskCreator?.email || 'Unknown'
  const showCreatorSeparately = taskCreator && taskCreator.uid !== task.assigneeUid
  const assigneeIsCreator = taskCreator?.uid === task.assigneeUid
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
                  >
                    {normalizeTaskTitle(task.title || '') || 'Untitled task'}
                  </strong>
                </>
              )}
            </div>
          </div>
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
              <input
                type="date"
                className="workhub-task-due-input"
                value={task.dueDate || ''}
                onClick={(event) => event.stopPropagation()}
                onChange={(event) => callbacks.onDueDateChange(task, event.target.value)}
                aria-label={task.dueDate ? `Due date: ${formatDueDateShort(task.dueDate)}` : 'Set due date'}
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
            <button
              className="workhub-checklist-toggle"
              onClick={(event) => { event.stopPropagation(); callbacks.onToggleChecklist(task.id) }}
              aria-label="Toggle checklist"
            >
              {checklist.length}
            </button>
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
