import { memo, useState } from 'react'
import type { WorkhubTemplateCreationIntent } from '../templateCreationMeta'
import type { WorkhubWorkspaceTemplateId } from '../workspaceTemplates'

interface WorkhubTemplateCreateActionOption {
  id: string
  icon: string
  label: string
  intent: WorkhubTemplateCreationIntent
}

export const ProjectActionMenu = memo(function ProjectActionMenu(props: {
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
  onCreateNote: (projectId?: string) => void
  onCreateTemplateEntity: (intent: WorkhubTemplateCreationIntent, projectId?: string) => void
  onOpenSettings: (projectId: string) => void
  onOpenMoodBoard: (entityType: 'workspace' | 'project', entityId: string) => void
  onOpenFlowProjectLab: (entityType: 'workspace' | 'project', entityId: string) => void
  onOpenProsConsLab: (entityType: 'workspace' | 'project', entityId: string) => void
  moodBoardEnabled?: boolean
  contextName?: string
}) {
  if (!props.projectId) return null
  const [showAdvancedActions, setShowAdvancedActions] = useState(false)

  const trFolder = props.workspaceType === 'hr' ? 'folder' : props.workspaceType === 'finance' ? 'ledger' : 'project'
  const trTask = props.workspaceType === 'hr' ? 'objective' : props.workspaceType === 'finance' ? 'record' : 'task'
  const selectedWorkspaceProjectId = props.selectedProjectId !== 'all' ? props.selectedProjectId : ''

  if (props.projectId === '__workspace__') {
    const nonProjectTemplateActions = props.templateCreateActions.filter((action) => action.intent !== 'project')
    return (
      <div className="workhub-modal-backdrop transparent" onMouseDown={(e) => { if (e.target === e.currentTarget) props.onClose() }}>
        <div className="workhub-action-dialog" onMouseDown={(event) => event.stopPropagation()}>
          <div className="workhub-action-dialog-head">
            <span>Create new{props.contextName ? <span className="workhub-action-dialog-context">{props.contextName}</span> : null}</span>
            <button type="button" className="workhub-action-dialog-close" onClick={props.onClose} aria-label="Close">✕</button>
          </div>
          <div className="workhub-action-dialog-grid">
            <button
              type="button"
              className="workhub-action-card is-record-action"
              disabled={!props.canCreateTopCategory}
              onClick={() => { props.onClose(); props.onCreateTask(selectedWorkspaceProjectId) }}
            >
              <span className="workhub-action-card-icon">🧾</span>
              <span className="workhub-action-card-label">{trTask}</span>
            </button>
            <button
              type="button"
              className="workhub-action-card"
              disabled={!props.canCreateTopCategory}
              onClick={() => { props.onClose(); props.onCreateDocument(selectedWorkspaceProjectId) }}
            >
              <span className="workhub-action-card-icon">📝</span>
              <span className="workhub-action-card-label">Document</span>
            </button>
            <button
              type="button"
              className="workhub-action-card is-note-action"
              disabled={!props.canCreateTopCategory}
              onClick={() => { props.onClose(); props.onCreateNote(selectedWorkspaceProjectId) }}
            >
              <span className="workhub-action-card-icon">🗒️</span>
              <span className="workhub-action-card-label">Note</span>
            </button>
            <button
              type="button"
              className="workhub-action-card is-project-action"
              disabled={!props.canCreateTopCategory}
              onClick={() => { props.onClose(); props.onCreateTemplateEntity('project', '') }}
            >
              <span className="workhub-action-card-icon">🚀</span>
              <span className="workhub-action-card-label">Project</span>
            </button>
            <button
              type="button"
              className="workhub-action-card is-folder-action"
              disabled={!props.canCreateTopCategory}
              onClick={() => { props.onClose(); props.onCreateSubProject('') }}
            >
              <span className="workhub-action-card-icon">📁</span>
              <span className="workhub-action-card-label">Folder</span>
            </button>
            <button
              type="button"
              className="workhub-action-card-toggle"
              onClick={() => setShowAdvancedActions((current) => !current)}
            >
              {showAdvancedActions ? 'Hide extra tools' : 'Show more tools'}
            </button>
            {showAdvancedActions ? <div className="workhub-action-dialog-divider" /> : null}
            {showAdvancedActions ? (
              <>
            {selectedWorkspaceProjectId && (
              <>
                <button
                  type="button"
                  className="workhub-action-card is-project-action"
                  disabled={!props.canCreateTopCategory}
                  onClick={() => { props.onClose(); props.onCreateTemplateEntity('project', selectedWorkspaceProjectId) }}
                >
                  <span className="workhub-action-card-icon">🚀</span>
                  <span className="workhub-action-card-label">Sub-project</span>
                </button>
                <button
                  type="button"
                  className="workhub-action-card is-folder-action"
                  disabled={!props.canCreateTopCategory}
                  onClick={() => { props.onClose(); props.onCreateSubProject(selectedWorkspaceProjectId) }}
                >
                  <span className="workhub-action-card-icon">📁</span>
                  <span className="workhub-action-card-label">Sub-folder</span>
                </button>
              </>
            )}
            {nonProjectTemplateActions.map((action) => (
              <button
                key={action.id}
                type="button"
                className="workhub-action-card"
                disabled={!props.canCreateTopCategory}
                onClick={() => { props.onClose(); props.onCreateTemplateEntity(action.intent, '') }}
              >
                <span className="workhub-action-card-icon">{action.icon}</span>
                <span className="workhub-action-card-label">{action.label}</span>
              </button>
            ))}
            {props.moodBoardEnabled !== false && (
              <button
                type="button"
                className="workhub-action-card is-moodboard-action"
                onClick={() => {
                  props.onClose()
                  props.onOpenMoodBoard(selectedWorkspaceProjectId ? 'project' : 'workspace', selectedWorkspaceProjectId || '__workspace__')
                }}
              >
                <span className="workhub-action-card-icon">🎨</span>
                <span className="workhub-action-card-label">Mood board</span>
              </button>
            )}
            <button
              type="button"
              className="workhub-action-card"
              onClick={() => {
                props.onClose()
                props.onOpenFlowProjectLab(selectedWorkspaceProjectId ? 'project' : 'workspace', selectedWorkspaceProjectId || '__workspace__')
              }}
            >
              <span className="workhub-action-card-icon">🧭</span>
              <span className="workhub-action-card-label">Flow Project Lab</span>
            </button>
            <button
              type="button"
              className="workhub-action-card is-proscons-action"
              onClick={() => {
                props.onClose()
                props.onOpenProsConsLab(selectedWorkspaceProjectId ? 'project' : 'workspace', selectedWorkspaceProjectId || '__workspace__')
              }}
            >
              <span className="workhub-action-card-icon">⚖️</span>
              <span className="workhub-action-card-label">Pros &amp; Cons</span>
            </button>
              </>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="workhub-modal-backdrop transparent" onMouseDown={(e) => { if (e.target === e.currentTarget) props.onClose() }}>
      <div className="workhub-action-dialog" onMouseDown={(event) => event.stopPropagation()}>
        <div className="workhub-action-dialog-head">
          <span>Create new{props.contextName ? <span className="workhub-action-dialog-context">{props.contextName}</span> : null}</span>
          <button type="button" className="workhub-action-dialog-close" onClick={props.onClose} aria-label="Close">✕</button>
        </div>
        <div className="workhub-action-dialog-grid">
          <button type="button" className="workhub-action-card is-record-action" onClick={() => { props.onClose(); props.onCreateTask(props.projectId || '') }}>
            <span className="workhub-action-card-icon">🧾</span>
            <span className="workhub-action-card-label" style={{ textTransform: 'capitalize' }}>{trTask}</span>
          </button>
          <button type="button" className="workhub-action-card" onClick={() => { props.onClose(); props.onCreateDocument(props.projectId || '') }}>
            <span className="workhub-action-card-icon">📝</span>
            <span className="workhub-action-card-label">Document</span>
          </button>
          <button type="button" className="workhub-action-card is-note-action" onClick={() => { props.onClose(); props.onCreateNote(props.projectId || '') }}>
            <span className="workhub-action-card-icon">🗒️</span>
            <span className="workhub-action-card-label">Note</span>
          </button>
          <button
            type="button"
            className="workhub-action-card is-project-action"
            onClick={() => { props.onClose(); props.onCreateTemplateEntity('project', props.projectId || '') }}
          >
            <span className="workhub-action-card-icon">🚀</span>
            <span className="workhub-action-card-label" style={{ textTransform: 'capitalize' }}>
              {trFolder === 'project' ? 'project' : trFolder}
            </span>
          </button>
          <button
            type="button"
            className="workhub-action-card is-folder-action"
            onClick={() => { props.onClose(); props.onCreateSubProject(props.projectId || '') }}
          >
            <span className="workhub-action-card-icon">📁</span>
            <span className="workhub-action-card-label" style={{ textTransform: 'capitalize' }}>folder</span>
          </button>
          {props.canManageProject && (
            <button type="button" className="workhub-action-card is-settings-action" onClick={() => { props.onClose(); props.onOpenSettings(props.projectId || '') }}>
              <span className="workhub-action-card-icon">⚙️</span>
              <span className="workhub-action-card-label">Open settings</span>
            </button>
          )}
          <button
            type="button"
            className="workhub-action-card-toggle"
            onClick={() => setShowAdvancedActions((current) => !current)}
          >
            {showAdvancedActions ? 'Hide extra tools' : 'Show more tools'}
          </button>
          {showAdvancedActions ? <div className="workhub-action-dialog-divider" /> : null}
          {showAdvancedActions ? props.templateCreateActions.map((action) => (
            <button
              key={action.id}
              type="button"
              className="workhub-action-card"
              onClick={() => {
                props.onClose()
                if (action.intent === 'project') {
                  props.onCreateSubProject(props.projectId || '')
                  return
                }
                props.onCreateTemplateEntity(action.intent, props.projectId || '')
              }}
            >
              <span className="workhub-action-card-icon">{action.icon}</span>
              <span className="workhub-action-card-label" style={action.intent === 'project' ? { textTransform: 'capitalize' } : undefined}>
                {action.intent === 'project' ? `sub-${trFolder}` : action.label}
              </span>
            </button>
          )) : null}
          {showAdvancedActions && props.moodBoardEnabled !== false && (
            <button
              type="button"
              className="workhub-action-card is-moodboard-action"
              onClick={() => { props.onClose(); props.onOpenMoodBoard('project', props.projectId || '') }}
            >
              <span className="workhub-action-card-icon">🎨</span>
              <span className="workhub-action-card-label">Mood board</span>
            </button>
          )}
          {showAdvancedActions ? <button
            type="button"
            className="workhub-action-card"
            onClick={() => { props.onClose(); props.onOpenFlowProjectLab('project', props.projectId || '') }}
          >
            <span className="workhub-action-card-icon">🧭</span>
            <span className="workhub-action-card-label">Flow Project Lab</span>
          </button> : null}
          {showAdvancedActions ? <button
            type="button"
            className="workhub-action-card is-proscons-action"
            onClick={() => { props.onClose(); props.onOpenProsConsLab('project', props.projectId || '') }}
          >
            <span className="workhub-action-card-icon">⚖️</span>
            <span className="workhub-action-card-label">Pros &amp; Cons</span>
          </button> : null}
        </div>
      </div>
    </div>
  )
})
