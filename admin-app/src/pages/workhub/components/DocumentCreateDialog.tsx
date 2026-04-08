export function DocumentCreateDialog(props: {
  isOpen: boolean
  busyKey: string
  canCreate: boolean
  title: string
  body: string
  projectId: string
  projectOptions: Array<{ id: string; name: string; depth: number }>
  onTitleChange: (value: string) => void
  onBodyChange: (value: string) => void
  onProjectIdChange: (value: string) => void
  onClose: () => void
  onCreate: () => void
}) {
  if (!props.isOpen) return null

  return (
    <div className="workhub-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) props.onClose() }}>
      <div className="workhub-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="workhub-modal-head">
          <div>
            <h2>Create document</h2>
            <p>Create a workspace document for scope, requirements, or project details.</p>
          </div>
          <button className="workhub-ghost-btn" onClick={props.onClose}>Close</button>
        </div>

        <form
          className="workhub-modal-form compact-create"
          onSubmit={(event) => {
            event.preventDefault()
            props.onCreate()
          }}
        >
          <label className="workhub-icon-field">
            <span>Document title</span>
            <input
              value={props.title}
              onChange={(event) => props.onTitleChange(event.target.value)}
              placeholder="Scope of work"
              autoFocus
            />
          </label>

          <label className="workhub-icon-field">
            <span>Attach to</span>
            <select value={props.projectId} onChange={(event) => props.onProjectIdChange(event.target.value)}>
              <option value="">Workspace (general document)</option>
              {props.projectOptions.map((item) => (
                <option key={item.id} value={item.id}>{`${'-- '.repeat(item.depth)}${item.name}`}</option>
              ))}
            </select>
          </label>

          <label className="workhub-icon-field">
            <span>Document body</span>
            <textarea
              rows={14}
              value={props.body}
              onChange={(event) => props.onBodyChange(event.target.value)}
              placeholder="Start typing..."
            />
          </label>

          <div className="workhub-create-actions">
            <div className="workhub-create-actions-group">
              <button type="button" className="workhub-ghost-btn" onClick={props.onClose}>Cancel</button>
              <button type="submit" className="workhub-primary-btn" disabled={!props.canCreate || props.busyKey === 'document:create'}>
                {props.busyKey === 'document:create' ? 'Creating...' : 'Create document'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
