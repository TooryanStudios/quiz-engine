import { memo } from 'react'
import type { WorkhubMember, WorkhubTask, WorkhubTaskChecklistItem, WorkhubTaskPriority, WorkhubTaskStatus, WorkhubTaskStatusConfig } from '../../../lib/workhubRepo'
import { PRIORITY_LABELS, getPriorityIcon, getTaskStatusIcon } from '../constants'
import { DEFAULT_TASK_STATUSES } from '../statusTemplates'
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

export { TaskRow, emptyTaskRowMeta }
export type { TaskRowMeta, TaskRowCallbacks }
