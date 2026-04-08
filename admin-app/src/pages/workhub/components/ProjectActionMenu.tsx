import type { WorkhubTemplateCreationIntent } from '../templateCreationMeta'
import type { WorkhubWorkspaceTemplateId } from '../workspaceTemplates'

interface WorkhubTemplateCreateActionOption {
  id: string
  icon: string
  label: string
  intent: WorkhubTemplateCreationIntent
}

export function ProjectActionMenu(props: {
  projectId: string | null
  workspaceType: 'technical' | 'hr' | 'finance'
  workspaceTemplateId: WorkhubWorkspaceTemplateId
  selectedProjectId: string
  position: { x: number; y: number }
  canManageProject: boolean
  canCreateTopCategory: boolean
  templateCreateActions: WorkhubTemplateCreateActionOption[]
  onClose: () => void
  onCreateTask: (projectId: string) => void
  onCreateSubProject: (projectId: string) => void
  onCreateDocument: (projectId?: string) => void
  onCreateTemplateEntity: (intent: WorkhubTemplateCreationIntent, projectId?: string) => void
  onOpenSettings: (projectId: string) => void
}) {
  if (!props.projectId) return null

  const trFolder = props.workspaceType === 'hr' ? 'folder' : props.workspaceType === 'finance' ? 'ledger' : 'project'
  const trTask = props.workspaceType === 'hr' ? 'objective' : props.workspaceType === 'finance' ? 'record' : 'task'
  const selectedWorkspaceProjectId = props.selectedProjectId !== 'all' ? props.selectedProjectId : ''

  if (props.projectId === '__workspace__') {
    const isProjectsWorkspace = props.workspaceTemplateId === 'projects'
    return (
      <div className="workhub-modal-backdrop transparent" onClick={props.onClose}>
        <div
          className="workhub-action-menu"
          style={{ left: `${props.position.x}px`, top: `${props.position.y}px` }}
          onClick={(event) => event.stopPropagation()}
        >
          {isProjectsWorkspace ? (
            <>
              <button
                type="button"
                className="workhub-action-menu-item"
                disabled={!props.canCreateTopCategory}
                onClick={() => {
                  props.onClose()
                  props.onCreateSubProject('')
                }}
              >
                <span className="workhub-action-icon">🚀</span>
                <span>Add project</span>
              </button>
              {selectedWorkspaceProjectId && (
                <button
                  type="button"
                  className="workhub-action-menu-item"
                  disabled={!props.canCreateTopCategory}
                  onClick={() => {
                    props.onClose()
                    props.onCreateSubProject(selectedWorkspaceProjectId)
                  }}
                >
                  <span className="workhub-action-icon">📁</span>
                  <span>Add sub-project</span>
                </button>
              )}
              <button
                type="button"
                className="workhub-action-menu-item"
                disabled={!props.canCreateTopCategory}
                onClick={() => {
                  props.onClose()
                  props.onCreateTask(selectedWorkspaceProjectId)
                }}
              >
                <span className="workhub-action-icon">✅</span>
                <span>Add task</span>
              </button>
              <button
                type="button"
                className="workhub-action-menu-item"
                disabled={!props.canCreateTopCategory}
                onClick={() => {
                  props.onClose()
                  props.onCreateDocument(selectedWorkspaceProjectId)
                }}
              >
                <span className="workhub-action-icon">📝</span>
                <span>Add document</span>
              </button>
            </>
          ) : (
            <>
              {props.templateCreateActions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  className="workhub-action-menu-item"
                  disabled={!props.canCreateTopCategory}
                  onClick={() => {
                    props.onClose()
                    if (action.intent === 'project') {
                      props.onCreateSubProject('')
                      return
                    }
                    props.onCreateTemplateEntity(action.intent, '')
                  }}
                >
                  <span className="workhub-action-icon">{action.icon}</span>
                  <span>{action.label}</span>
                </button>
              ))}
              <button
                type="button"
                className="workhub-action-menu-item"
                disabled={!props.canCreateTopCategory}
                onClick={() => {
                  props.onClose()
                  props.onCreateDocument(selectedWorkspaceProjectId)
                }}
              >
                <span className="workhub-action-icon">📝</span>
                <span>Add document</span>
              </button>
            </>
          )}
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
        <button type="button" className="workhub-action-menu-item" onClick={() => { props.onClose(); props.onCreateDocument(props.projectId || '') }}>
          <span className="workhub-action-icon">📝</span>
          <span>New document</span>
        </button>
        {props.workspaceTemplateId === 'projects' && (
          <button
            type="button"
            className="workhub-action-menu-item"
            onClick={() => {
              props.onClose()
              props.onCreateSubProject('')
            }}
          >
            <span className="workhub-action-icon">🚀</span>
            <span>New project</span>
          </button>
        )}
        {props.templateCreateActions.map((action) => (
          <button
            key={action.id}
            type="button"
            className="workhub-action-menu-item"
            onClick={() => {
              props.onClose()
              if (action.intent === 'project') {
                props.onCreateSubProject(props.projectId || '')
                return
              }
              props.onCreateTemplateEntity(action.intent, props.projectId || '')
            }}
          >
            <span className="workhub-action-icon">{action.icon}</span>
            <span style={action.intent === 'project' ? { textTransform: 'capitalize' } : undefined}>
              {action.intent === 'project' ? `New sub-${trFolder}` : action.label}
            </span>
          </button>
        ))}
        {props.canManageProject && (
          <button type="button" className="workhub-action-menu-item" onClick={() => { props.onClose(); props.onOpenSettings(props.projectId || '') }}>
            <span className="workhub-action-icon">⚙</span>
            <span>Open settings</span>
          </button>
        )}
      </div>
    </div>
  )
}
