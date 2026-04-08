import { memo, useEffect, useRef, useState } from 'react'
import type { WorkhubMember, WorkhubTaskPriority, WorkhubTaskStatus, WorkhubTaskStatusConfig } from '../../../lib/workhubRepo'
import { PRIORITY_LABELS, getPriorityIcon } from '../constants'
import { normalizeTaskTitle } from '../taskUtils'

export interface QuickAddTaskSubmitInput {
  statusId: string
  title: string
  assigneeUid: string
  priority: WorkhubTaskPriority
  dueDate: string
  projectId: string
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
                  aria-label={`Assignee: ${quickAddAssigneeLabel}`}
                  onClick={() => {
                    setAssigneeMenuOpen((current) => !current)
                    setPriorityMenuOpen(false)
                  }}
                >
                  <span className="workhub-assignee-badge">
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
                  aria-label={`Priority: ${PRIORITY_LABELS[priority]}`}
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

export { QuickAddTaskRow }
