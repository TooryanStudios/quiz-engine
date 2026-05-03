export function AddItemDialog(props: {
  isOpen: boolean
  projectId: string
  onClose: () => void
  onCreateTask: () => void
  onCreateDocument: () => void
  onCreateNote: () => void
  onCreateMoodBoard: () => void
}) {
  if (!props.isOpen) return null

  return (
    <div className="workhub-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) props.onClose() }}>
      <div className="workhub-modal workhub-add-item-dialog" onMouseDown={(event) => event.stopPropagation()}>
        <div className="workhub-modal-head">
          <div>
            <h2>Add item</h2>
            <p>Choose what type of item to add to this project.</p>
          </div>
          <button className="workhub-ghost-btn" onClick={props.onClose}>Close</button>
        </div>

        <div className="workhub-modal-body">
          <div className="workhub-add-item-options">
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
        </div>
      </div>
    </div>
  )
}