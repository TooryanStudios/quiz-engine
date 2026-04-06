import { useState } from 'react'
import type { WorkhubClient, WorkhubMember, WorkhubProjectPriority, WorkhubProjectType, WorkhubTaskPriority, WorkhubTaskStatus, WorkhubTaskStatusConfig, WorkhubVisibility } from '../../../lib/workhubRepo'
import { PRIORITY_LABELS, PROJECT_PRIORITY_OPTIONS, PROJECT_TYPE_OPTIONS } from '../constants'

export function CreateDialog(props: {
  isOpen: boolean
  createDialogType: 'project' | 'task'
  onClose: () => void
  onDialogTypeChange: (value: 'project' | 'task') => void
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
  canCreateProject: boolean
  canCreateTask: boolean
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
          {(['project', 'task'] as const).map((type) => (
            <button key={type} className={`workhub-switcher-btn${props.createDialogType === type ? ' is-active' : ''}`} onClick={() => props.onDialogTypeChange(type)}>
              {type === 'project' ? '📁 Project' : '✅ Task'}
            </button>
          ))}
        </div>

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
