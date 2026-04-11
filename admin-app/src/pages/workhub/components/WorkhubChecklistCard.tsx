import type { WorkhubTaskChecklistItem } from '../../../lib/workhubRepo'

export interface WorkhubChecklistCardProps {
  title?: string
  items: WorkhubTaskChecklistItem[]
  readOnly?: boolean
  draftValue: string
  onDraftChange: (value: string) => void
  onAdd: () => void
  editingItemId: string | null
  editingItemText: string
  onEditingItemTextChange: (value: string) => void
  onEditStart: (item: WorkhubTaskChecklistItem) => void
  onEditSave: (item: WorkhubTaskChecklistItem) => void
  onEditCancel: () => void
  onToggle: (item: WorkhubTaskChecklistItem, checked: boolean) => void
  onRemove: (item: WorkhubTaskChecklistItem) => void
  emptyStateText?: string
}

export function WorkhubChecklistCard({
  title = 'Checklist',
  items,
  readOnly = false,
  draftValue,
  onDraftChange,
  onAdd,
  editingItemId,
  editingItemText,
  onEditingItemTextChange,
  onEditStart,
  onEditSave,
  onEditCancel,
  onToggle,
  onRemove,
  emptyStateText = 'No checklist items yet.',
}: WorkhubChecklistCardProps) {
  const doneCount = items.filter((item) => item.completed).length
  const progress = items.length > 0 ? Math.round((doneCount / items.length) * 100) : 0

  return (
    <div className="workhub-detail-card">
      <h3>{title}</h3>
      {items.length > 0 && (
        <div className="workhub-doc-checklist-progress">
          <div className="workhub-doc-checklist-bar">
            <div className="workhub-doc-checklist-bar-fill" style={{ width: `${progress}%` }} />
          </div>
          <span>{doneCount}/{items.length}</span>
        </div>
      )}
      <div className="workhub-checklist-items">
        {items.length === 0 ? (
          <div className="workhub-empty-state">{emptyStateText}</div>
        ) : (
          items.map((item) => (
            <div key={item.id} className="workhub-checklist-item even">
              <div className="workhub-checklist-left">
                <div className="workhub-checklist-item-main">
                  <input
                    type="checkbox"
                    checked={item.completed}
                    disabled={readOnly}
                    onChange={(event) => onToggle(item, event.target.checked)}
                  />
                  {editingItemId === item.id ? (
                    <input
                      type="text"
                      className="workhub-checklist-edit-input"
                      autoFocus
                      value={editingItemText}
                      onChange={(event) => onEditingItemTextChange(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault()
                          onEditSave(item)
                        }
                        if (event.key === 'Escape') {
                          event.preventDefault()
                          onEditCancel()
                        }
                      }}
                      onBlur={() => onEditSave(item)}
                    />
                  ) : (
                    <span
                      className={`workhub-checklist-item-text${item.completed ? ' is-checked' : ''}`}
                      onDoubleClick={() => {
                        if (!readOnly) onEditStart(item)
                      }}
                    >
                      {item.text}
                    </span>
                  )}
                </div>
              </div>
              <div className="workhub-checklist-actions">
                <button
                  type="button"
                  className="workhub-checklist-edit"
                  onClick={() => onEditStart(item)}
                  title="Edit item"
                  disabled={readOnly}
                >
                  ✏️
                </button>
                <button
                  type="button"
                  className="workhub-checklist-remove"
                  onClick={() => onRemove(item)}
                  title="Remove item"
                  disabled={readOnly}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      {!readOnly && (
        <div className="workhub-checklist-url-row compact-row">
          <input
            type="text"
            value={draftValue}
            onChange={(event) => onDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                onAdd()
              }
            }}
            placeholder="Add checklist item"
          />
          <button type="button" onClick={onAdd}>➕</button>
        </div>
      )}
    </div>
  )
}
