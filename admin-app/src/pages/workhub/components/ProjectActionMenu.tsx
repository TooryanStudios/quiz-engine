export function ProjectActionMenu(props: {
  projectId: string | null
    workspaceType: 'technical' | 'hr' | 'finance'
    position: { x: number; y: number }
    canManageProject: boolean
    canCreateTopCategory: boolean
    onClose: () => void
    onCreateWorkspace: () => void
    onCreateTask: (projectId: string) => void
    onCreateSubProject: (projectId: string) => void
    onOpenSettings: (projectId: string) => void
  }) {
    if (!props.projectId) return null

    const trFolder = props.workspaceType === 'hr' ? 'folder' : props.workspaceType === 'finance' ? 'ledger' : 'project'
    const trCat = props.workspaceType === 'hr' ? 'directory' : props.workspaceType === 'finance' ? 'main ledger' : 'category'
    const trTask = props.workspaceType === 'hr' ? 'objective' : props.workspaceType === 'finance' ? 'record' : 'task'

    if (props.projectId === '__workspace__') {
      return (
        <div className="workhub-modal-backdrop transparent" onClick={props.onClose}>
          <div
            className="workhub-action-menu"
            style={{ left: `${props.position.x}px`, top: `${props.position.y}px` }}
            onClick={(event) => event.stopPropagation()}
          >
            <button type="button" className="workhub-action-menu-item" onClick={() => { props.onClose(); props.onCreateWorkspace() }}>
              <span className="workhub-action-icon">🏢</span>
              <span>New workspace</span>
            </button>
            <button
              type="button"
              className="workhub-action-menu-item"
              disabled={!props.canCreateTopCategory}
              onClick={() => { props.onClose(); props.onCreateSubProject('') }}
            >
              <span className="workhub-action-icon">▸</span>
              <span style={{ textTransform: 'capitalize' }}>Top {trCat}</span>
            </button>
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
          <button type="button" className="workhub-action-menu-item" onClick={() => { props.onClose(); props.onCreateSubProject(props.projectId || '') }}>
            <span className="workhub-action-icon">▸</span>
            <span style={{ textTransform: 'capitalize' }}>New sub-{trFolder}</span>
          </button>
          {props.canManageProject && (
            <button type="button" className="workhub-action-menu-item" onClick={() => { props.onClose(); props.onOpenSettings(props.projectId || '') }}>
              <span className="workhub-action-icon">⚙</span>
              <span style={{ textTransform: 'capitalize' }}>{trFolder} settings</span>
            </button>
          )}
        </div>
      </div>
    )
  }
