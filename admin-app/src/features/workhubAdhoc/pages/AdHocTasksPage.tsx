import { onAuthStateChanged } from 'firebase/auth'
import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createWorkhubTask,
  subscribeAllWorkhubMembers,
  subscribeOwnWorkhubMember,
  subscribeWorkhubTasks,
  subscribeWorkhubWorkspaces,
  updateWorkhubTask,
  type WorkhubMember,
  type WorkhubTask,
  type WorkhubTaskPriority,
  type WorkhubWorkspace,
} from '../../../lib/workhubRepo'
import { auth } from '../../../lib/firebase'
import { useToast } from '../../../lib/ToastContext'
import { canAccessWorkspace } from '../../../pages/workhub/projectUtils'
import { WORKHUB_ADHOC_PROJECT_ID, isAdHocWorkhubTask } from '../constants'
import '../workhubAdhoc.css'

const MASTER_EMAIL = import.meta.env.VITE_MASTER_EMAIL as string | undefined

function getCurrentDateInputValue(): string {
  const now = new Date()
  const timezoneOffsetMs = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - timezoneOffsetMs).toISOString().slice(0, 10)
}

function formatDueDate(value: string): string {
  if (!value) return '-'
  const parsed = Date.parse(`${value}T00:00:00`)
  if (!Number.isFinite(parsed)) return value
  return new Date(parsed).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function resolveDoneStatusLabel(status: string): string {
  const token = status.toLowerCase()
  if (token.includes('done') || token.includes('complete') || token.includes('closed')) return 'Done'
  if (token.includes('progress')) return 'In Progress'
  return 'Backlog'
}

export function AdHocTasksPage() {
  const { showToast } = useToast()
  const [userUid, setUserUid] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [member, setMember] = useState<WorkhubMember | null>(null)
  const [members, setMembers] = useState<WorkhubMember[]>([])
  const [workspaces, setWorkspaces] = useState<WorkhubWorkspace[]>([])
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState('')
  const [tasks, setTasks] = useState<WorkhubTask[]>([])
  const [busy, setBusy] = useState(false)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [assigneeUid, setAssigneeUid] = useState('')
  const [priority, setPriority] = useState<WorkhubTaskPriority>('medium')
  const [dueDate, setDueDate] = useState(getCurrentDateInputValue())

  useEffect(() => {
    let unsubMember: (() => void) | null = null
    const unsubAuth = onAuthStateChanged(auth, (nextUser) => {
      if (unsubMember) {
        unsubMember()
        unsubMember = null
      }

      if (!nextUser) {
        setUserUid('')
        setUserEmail('')
        setMember(null)
        return
      }

      setUserUid(nextUser.uid)
      setUserEmail(nextUser.email || '')
      unsubMember = subscribeOwnWorkhubMember(nextUser.uid, setMember)
    })

    return () => {
      if (unsubMember) unsubMember()
      unsubAuth()
    }
  }, [])

  useEffect(() => {
    if (!member || member.status !== 'approved') {
      setMembers([])
      setWorkspaces([])
      return
    }
    const unsubMembers = subscribeAllWorkhubMembers(setMembers)
    const unsubWorkspaces = subscribeWorkhubWorkspaces(setWorkspaces)
    return () => {
      unsubMembers()
      unsubWorkspaces()
    }
  }, [member])

  const isPrivilegedMember = useMemo(
    () => !!(member && (member.role === 'admin' || member.role === 'manager' || (!!MASTER_EMAIL && userEmail === MASTER_EMAIL))),
    [member, userEmail],
  )

  const visibleWorkspaces = useMemo(
    () => workspaces.filter((item) => canAccessWorkspace(item, userUid, userEmail, isPrivilegedMember)),
    [isPrivilegedMember, userEmail, userUid, workspaces],
  )

  const memberNameByUid = useMemo(
    () => Object.fromEntries(members.map((item) => [item.uid, item.displayName || item.email])) as Record<string, string>,
    [members],
  )

  useEffect(() => {
    if (!selectedWorkspaceId && visibleWorkspaces.length > 0) {
      setSelectedWorkspaceId(visibleWorkspaces[0].id)
      return
    }
    if (selectedWorkspaceId && !visibleWorkspaces.some((item) => item.id === selectedWorkspaceId)) {
      setSelectedWorkspaceId(visibleWorkspaces[0]?.id || '')
    }
  }, [selectedWorkspaceId, visibleWorkspaces])

  useEffect(() => {
    if (!selectedWorkspaceId || !member || member.status !== 'approved') {
      setTasks([])
      return
    }
    return subscribeWorkhubTasks(selectedWorkspaceId, userUid, isPrivilegedMember, setTasks)
  }, [isPrivilegedMember, member, selectedWorkspaceId, userUid])

  const adHocTasks = useMemo(
    () => tasks.filter((item) => isAdHocWorkhubTask(item.projectId)),
    [tasks],
  )

  const handleCreate = useCallback(async () => {
    const trimmedTitle = title.trim()
    if (!selectedWorkspaceId || !trimmedTitle || !userUid) return

    setBusy(true)
    try {
      await createWorkhubTask({
        workspaceId: selectedWorkspaceId,
        projectId: WORKHUB_ADHOC_PROJECT_ID,
        title: trimmedTitle,
        description: description.trim(),
        visibility: 'workspace',
        memberUids: [],
        status: 'backlog',
        priority,
        assigneeUid,
        startDate: '',
        dueDate: dueDate || getCurrentDateInputValue(),
        createdBy: userUid,
      })
      setTitle('')
      setDescription('')
      setAssigneeUid('')
      setPriority('medium')
      setDueDate(getCurrentDateInputValue())
      showToast({ type: 'success', message: 'Ad-hoc task created.' })
    } catch (error) {
      console.error('Failed to create ad-hoc task.', error)
      showToast({ type: 'error', message: 'Could not create ad-hoc task.' })
    } finally {
      setBusy(false)
    }
  }, [assigneeUid, description, dueDate, priority, selectedWorkspaceId, showToast, title, userUid])

  const handleMarkDone = useCallback(async (task: WorkhubTask) => {
    setBusy(true)
    try {
      await updateWorkhubTask(task.id, { status: 'done' })
      showToast({ type: 'success', message: 'Task marked as done.' })
    } catch (error) {
      console.error('Failed to mark ad-hoc task as done.', error)
      showToast({ type: 'error', message: 'Could not update the task.' })
    } finally {
      setBusy(false)
    }
  }, [showToast])

  const headerWorkspaceName = useMemo(
    () => visibleWorkspaces.find((item) => item.id === selectedWorkspaceId)?.name || 'No workspace selected',
    [selectedWorkspaceId, visibleWorkspaces],
  )

  return (
    <section className="adhoc-shell">
      <header className="adhoc-card adhoc-header">
        <div>
          <h1>Ops Tasks (Non-Project)</h1>
          <p>
            Workspace-level tasks that are not attached to projects. Use this for operational follow-ups,
            compliance checks, and internal actions.
          </p>
        </div>
      </header>

      <div className="adhoc-grid">
        <section className="adhoc-card">
          <h2>Create Ad-Hoc Task</h2>
          <div className="adhoc-form">
            <label>
              Workspace
              <select value={selectedWorkspaceId} onChange={(event) => setSelectedWorkspaceId(event.target.value)}>
                {visibleWorkspaces.length === 0 && <option value="">No accessible workspace</option>}
                {visibleWorkspaces.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </label>

            <label>
              Title
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Follow up on supplier invoice routing"
              />
            </label>

            <label>
              Description
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Context, expected output, and constraints"
              />
            </label>

            <label>
              Assign To
              <select value={assigneeUid} onChange={(event) => setAssigneeUid(event.target.value)}>
                <option value="">Unassigned</option>
                {members
                  .filter((item) => item.status === 'approved')
                  .map((item) => (
                    <option key={item.uid} value={item.uid}>{item.displayName || item.email}</option>
                  ))}
              </select>
            </label>

            <label>
              Priority
              <select value={priority} onChange={(event) => setPriority(event.target.value as WorkhubTaskPriority)}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </label>

            <label>
              Due Date
              <input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
            </label>

            <button
              type="button"
              disabled={busy || !selectedWorkspaceId || !title.trim()}
              onClick={() => {
                void handleCreate()
              }}
            >
              {busy ? 'Saving...' : 'Create Task'}
            </button>
          </div>
        </section>

        <section className="adhoc-card">
          <h2>{headerWorkspaceName} - Queue</h2>
          {adHocTasks.length === 0 ? (
            <div className="adhoc-empty">
              No ad-hoc tasks found in this workspace. Create one from the panel on the left.
            </div>
          ) : (
            <div className="adhoc-list">
              {adHocTasks.map((task) => (
                <article key={task.id} className="adhoc-item">
                  <div className="adhoc-item-main">
                    <strong>{task.title}</strong>
                    <span className="adhoc-item-meta">
                      <span className="adhoc-item-status">{resolveDoneStatusLabel(task.status)}</span>
                      <span>Priority: {task.priority}</span>
                      <span>Due: {formatDueDate(task.dueDate)}</span>
                      <span>Assignee: {memberNameByUid[task.assigneeUid] || 'Unassigned'}</span>
                    </span>
                  </div>

                  <div className="adhoc-item-actions">
                    <button
                      type="button"
                      disabled={busy || resolveDoneStatusLabel(task.status) === 'Done'}
                      onClick={() => {
                        void handleMarkDone(task)
                      }}
                    >
                      Mark Done
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  )
}
