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
  valueAmount?: number
  valueCurrency?: string
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
  isFinanceLayout?: boolean
  financeCurrency?: string
  currentUid: string
  activeDragTaskId: string
  activeDragStatusId: string
  dropTargetKey: string
  focusTrigger?: number
  onFocusHandled?: () => void
  onDragOverEnd: (statusId: string) => void
  onDropToEnd: (statusId: string) => void
  onCommit: (input: QuickAddTaskSubmitInput) => Promise<boolean | undefined>
}) {
  const { status, assignableMembersByProjectId, workspaceAssignableMembers, memberByUid, flatVisibleProjectOptions, defaultProjectId, selectedProjectId, isFinanceLayout = false, financeCurrency = 'OMR', currentUid, activeDragTaskId, activeDragStatusId, dropTargetKey, focusTrigger, onFocusHandled, onDragOverEnd, onDropToEnd, onCommit } = props
  const [title, setTitle] = useState('')
  const [assigneeUid, setAssigneeUid] = useState('')
  const [priority, setPriority] = useState<WorkhubTaskPriority>('medium')
  const [dueDate, setDueDate] = useState('')
  const [projectId, setProjectId] = useState('')
  const [valueAmountDraft, setValueAmountDraft] = useState('')
  const [assigneeMenuOpen, setAssigneeMenuOpen] = useState(false)
  const [priorityMenuOpen, setPriorityMenuOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const isCommittingRef = useRef(false)
  const skipNextBlurCommitRef = useRef(false)
  const contextScopeRef = useRef(`${selectedProjectId}|${defaultProjectId}`)
  const titleDraftRef = useRef('')
  const assigneeDraftRef = useRef('')
  const priorityDraftRef = useRef<WorkhubTaskPriority>('medium')
  const dueDateDraftRef = useRef('')
  const projectDraftRef = useRef('')
  const valueAmountDraftRef = useRef('')
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
    if (!focusTrigger) return
    inputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    inputRef.current?.focus()
    onFocusHandled?.()
  }, [focusTrigger, onFocusHandled])

  useEffect(() => {
    if (quickAddAssignableMembers.length === 0) {
      if (assigneeUid) {
        setAssigneeUid('')
        assigneeDraftRef.current = ''
      }
      return
    }
    if (assigneeUid && quickAddAssignableMembers.some((member) => member.uid === assigneeUid)) return
    if (canAssignCurrentUser) {
      if (assigneeUid !== '') {
        setAssigneeUid('')
        assigneeDraftRef.current = ''
      }
      return
    }
    const fallbackUid = quickAddAssignableMembers[0]?.uid || ''
    if (fallbackUid !== assigneeUid) {
      setAssigneeUid(fallbackUid)
      assigneeDraftRef.current = fallbackUid
    }
  }, [assigneeUid, canAssignCurrentUser, quickAddAssignableMembers])

  const resetDraft = () => {
    setTitle('')
    titleDraftRef.current = ''
    setAssigneeUid('')
    assigneeDraftRef.current = ''
    setPriority('medium')
    priorityDraftRef.current = 'medium'
    setDueDate('')
    dueDateDraftRef.current = ''
    setProjectId('')
    projectDraftRef.current = ''
    setValueAmountDraft('')
    valueAmountDraftRef.current = ''
    setAssigneeMenuOpen(false)
    setPriorityMenuOpen(false)
  }

  useEffect(() => {
    const nextScope = `${selectedProjectId}|${defaultProjectId}`
    if (contextScopeRef.current === nextScope) return
    contextScopeRef.current = nextScope
    resetDraft()
  }, [defaultProjectId, selectedProjectId])

  const commitWithTitle = async (rawTitle: string) => {
    const trimmedTitle = normalizeTaskTitle(rawTitle)
    if (!trimmedTitle || submitting || isCommittingRef.current) return false
    isCommittingRef.current = true
    skipNextBlurCommitRef.current = true
    const snapshot = {
      title: titleDraftRef.current,
      assigneeUid: assigneeDraftRef.current,
      priority: priorityDraftRef.current,
      dueDate: dueDateDraftRef.current,
      projectId: projectDraftRef.current,
      valueAmountDraft: valueAmountDraftRef.current,
    }
    setTitle('')
    titleDraftRef.current = ''
    setValueAmountDraft('')
    valueAmountDraftRef.current = ''
    setAssigneeMenuOpen(false)
    setPriorityMenuOpen(false)
    setSubmitting(true)
    try {
      const parsedValue = Number(snapshot.valueAmountDraft)
      const created = await onCommit({
        statusId: status.id,
        title: trimmedTitle,
        assigneeUid: snapshot.assigneeUid,
        priority: snapshot.priority,
        dueDate: snapshot.dueDate,
        projectId: snapshot.projectId,
        valueAmount: isFinanceLayout && Number.isFinite(parsedValue) && parsedValue >= 0 ? Math.round(parsedValue * 100) / 100 : undefined,
        valueCurrency: isFinanceLayout ? financeCurrency : undefined,
      })
      if (created) {
        resetDraft()
        return true
      }
      setTitle(snapshot.title)
      titleDraftRef.current = snapshot.title
      setAssigneeUid(snapshot.assigneeUid)
      assigneeDraftRef.current = snapshot.assigneeUid
      setPriority(snapshot.priority)
      priorityDraftRef.current = snapshot.priority
      setDueDate(snapshot.dueDate)
      dueDateDraftRef.current = snapshot.dueDate
      setProjectId(snapshot.projectId)
      projectDraftRef.current = snapshot.projectId
      setValueAmountDraft(snapshot.valueAmountDraft)
      valueAmountDraftRef.current = snapshot.valueAmountDraft
      return false
    } finally {
      setSubmitting(false)
      isCommittingRef.current = false
    }
  }

  const commitDraft = async (rawTitle?: string) => commitWithTitle(typeof rawTitle === 'string' ? rawTitle : title)

  return (
    <article
      ref={rootRef}
      className={`workhub-task-row workhub-task-row-draft${showDetails ? ' is-selected' : ''}${assigneeMenuOpen || priorityMenuOpen ? ' has-open-menu' : ''}${dropTargetKey === `end:${status.id}` ? ' is-drop-target' : ''}`}
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
          if (skipNextBlurCommitRef.current) {
            skipNextBlurCommitRef.current = false
            return
          }
          if (isCommittingRef.current) return
          const active = document.activeElement
          if (rootRef.current?.contains(active)) return
          const currentInputValue = titleDraftRef.current
          if (currentInputValue.trim()) {
            void commitDraft(currentInputValue)
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
                onChange={(event) => {
                  setTitle(event.target.value)
                  titleDraftRef.current = event.target.value
                }}
                onPaste={(event) => {
                  const pastedText = event.clipboardData.getData('text')
                  if (!/\r?\n/.test(pastedText)) return
                  event.preventDefault()
                  void commitWithTitle(pastedText)
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    void commitDraft(event.currentTarget.value)
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
          {isFinanceLayout ? (
            <div className="workhub-task-col finance-value">
              {showDetails ? (
                <div className="workhub-quick-add-finance-value-wrap" title="Task value">
                  <span className="workhub-finance-value-currency">{financeCurrency}</span>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    className="workhub-quick-add-value-input"
                    value={valueAmountDraft}
                    onChange={(event) => {
                      setValueAmountDraft(event.target.value)
                      valueAmountDraftRef.current = event.target.value
                    }}
                    placeholder="0.00"
                  />
                </div>
              ) : <span className="workhub-quick-add-placeholder" />}
            </div>
          ) : (
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
          )}
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
                          assigneeDraftRef.current = ''
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
                          assigneeDraftRef.current = member.uid
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
              <input className="workhub-quick-add-date" type="date" value={dueDate} onChange={(event) => {
                setDueDate(event.target.value)
                dueDateDraftRef.current = event.target.value
              }} />
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
                          priorityDraftRef.current = priorityValue
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
            {showDetails ? (
              <>
                {selectedProjectId === 'all' && flatVisibleProjectOptions.length > 1 ? (
                  <select className="workhub-quick-add-select workhub-quick-add-project-select" value={projectId} onChange={(event) => {
                    setProjectId(event.target.value)
                    projectDraftRef.current = event.target.value
                  }}>
                    <option value="">Auto</option>
                    {flatVisibleProjectOptions.map((project) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </select>
                ) : <span className="workhub-quick-add-inline-note">List later</span>}
                {isFinanceLayout && (
                  <button
                    type="button"
                    className="workhub-quick-add-confirm"
                    disabled={submitting}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => { void commitDraft() }}
                  >
                    {submitting ? '...' : 'Add'}
                  </button>
                )}
              </>
            ) : <span className="workhub-quick-add-placeholder" />}
          </div>
          {!isFinanceLayout && (
            <div className="workhub-task-col actions-inline">
              {showDetails ? (
                <button
                  type="button"
                  className="workhub-quick-add-confirm"
                  disabled={submitting}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => { void commitDraft() }}
                >
                  {submitting ? '...' : 'Add'}
                </button>
              ) : <span className="workhub-quick-add-placeholder" />}
            </div>
          )}
        </div>
      </div>
    </article>
  )
})

export { QuickAddTaskRow }
