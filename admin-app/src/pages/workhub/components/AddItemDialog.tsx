export function AddItemDialog(props: {
  isOpen: boolean
  projectId: string
  contextName?: string
  extraActions?: Array<{ id: string; icon: string; label: string; description: string; group: 'Create' | 'Tools' | 'Manage'; disabled?: boolean; onClick: () => void }>
  canCreateTask?: boolean
  onClose: () => void
  onCreateTask: () => void
  onCreateDocument: () => void
  onCreateNote: () => void
  onCreateMoodBoard: () => void
}) {
  if (!props.isOpen) return null

  return (
    <div className="workhub-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) props.onClose() }}>
      <div className="workhub-modal workhub-add-item-dialog" role="dialog" aria-modal="true" aria-label="Add item" onMouseDown={(event) => event.stopPropagation()}>
        <div className="workhub-modal-head">
          <div>
            <h2>Add item</h2>
            <p>Choose an action for {props.contextName || 'this item'}.</p>
          </div>
          <button className="workhub-ghost-btn" onClick={props.onClose}>Close</button>
        </div>

        <div className="workhub-modal-body">
          <div className="workhub-add-item-options">
            {props.canCreateTask !== false && (
              <button
                type="button"
                className="workhub-add-item-option"
                onClick={() => {
                  props.onCreateTask()
                  props.onClose()
                }}
              >
                <div className="workhub-add-item-option-icon">✓</div>
                <div className="workhub-add-item-option-content">
                  <strong>Task</strong>
                  <span>Create a new task or milestone</span>
                </div>
              </button>
            )}

            <button
              type="button"
              className="workhub-add-item-option"
              onClick={() => {
                props.onCreateDocument()
                props.onClose()
              }}
            >
              <div className="workhub-add-item-option-icon">📝</div>
              <div className="workhub-add-item-option-content">
                <strong>Document</strong>
                <span>Create a document for scope or requirements</span>
              </div>
            </button>

            <button
              type="button"
              className="workhub-add-item-option"
              onClick={() => {
                props.onCreateNote()
                props.onClose()
              }}
            >
              <div className="workhub-add-item-option-icon">🗒️</div>
              <div className="workhub-add-item-option-content">
                <strong>Note</strong>
                <span>Create a quick note or meeting summary</span>
              </div>
            </button>

            <button
              type="button"
              className="workhub-add-item-option"
              onClick={() => {
                props.onCreateMoodBoard()
                props.onClose()
              }}
            >
              <div className="workhub-add-item-option-icon">🎨</div>
              <div className="workhub-add-item-option-content">
                <strong>Mood Board</strong>
                <span>Create a visual mood board or design collection</span>
              </div>
            </button>
          </div>
          {(['Create', 'Tools', 'Manage'] as const).map(group => {
            const actions = (props.extraActions || []).filter(action => action.group === group)
            if (!actions.length) return null
            return <section key={group} aria-label={group}>
              <h3 style={{ fontSize: 13, margin: '20px 0 10px' }}>{group === 'Create' ? 'More items' : group}</h3>
              <div className="workhub-add-item-options">{actions.map(action => <button
                key={action.id} type="button" className="workhub-add-item-option" disabled={action.disabled}
                onClick={() => { props.onClose(); action.onClick() }}>
                <div className="workhub-add-item-option-icon" aria-hidden="true">{action.icon}</div>
                <div className="workhub-add-item-option-content"><strong>{action.label}</strong><span>{action.description}</span></div>
              </button>)}</div>
            </section>
          })}
        </div>
      </div>
    </div>
  )
}
