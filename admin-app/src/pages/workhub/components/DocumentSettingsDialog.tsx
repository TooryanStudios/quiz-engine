import { useMemo, useState } from 'react'
import type { WorkhubDocument } from '../../../lib/workhubRepo'
import { EmojiPickerPopover, EMOJI_SET_DOCUMENTS } from '../../../components/EmojiPickerPopover'

interface DocumentSettingsDialogProps {
  isOpen: boolean
  busyKey: string
  document: WorkhubDocument | null
  workspaceOptions: Array<{ id: string; name: string }>
  projectOptions: Array<{ id: string; workspaceId: string; name: string; depth: number }>
  workspaceId: string
  projectId: string
  icon: string
  onWorkspaceIdChange: (value: string) => void
  onProjectIdChange: (value: string) => void
  onIconChange: (value: string) => void
  onClose: () => void
  onSave: () => void
}

export function DocumentSettingsDialog({
  isOpen,
  busyKey,
  document,
  workspaceOptions,
  projectOptions,
  workspaceId,
  projectId,
  icon,
  onWorkspaceIdChange,
  onProjectIdChange,
  onIconChange,
  onClose,
  onSave,
}: DocumentSettingsDialogProps) {
  const [iconPickerOpen, setIconPickerOpen] = useState(false)

  const filteredProjectOptions = useMemo(
    () => projectOptions.filter((item) => item.workspaceId === workspaceId),
    [projectOptions, workspaceId],
  )

  if (!isOpen || !document) return null

  const fallbackIcon = document.type === 'note' ? '🗒️' : '📝'
  const effectiveIcon = icon || fallbackIcon
  const typeLabel = document.type === 'note' ? 'note' : 'document'

  return (
    <div className="workhub-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="workhub-modal workhub-document-settings-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="workhub-modal-head">
          <div>
            <h2>{document.type === 'note' ? 'Note settings' : 'Document settings'}</h2>
            <p>Change the icon and choose where this {typeLabel} is stored.</p>
          </div>
          <button className="workhub-ghost-btn" onClick={onClose}>Close</button>
        </div>

        <form
          className="workhub-modal-form compact-create"
          onSubmit={(event) => {
            event.preventDefault()
            onSave()
          }}
        >
          <label className="workhub-icon-field">
            <span>Current {typeLabel}</span>
            <div className="workhub-doc-settings-note">{document.title || (document.type === 'note' ? 'Untitled note' : 'Untitled document')}</div>
          </label>

          <label className="workhub-icon-field">
            <span>Icon</span>
            <div className="workhub-doc-settings-icon-row">
              <div className="workhub-doc-settings-icon-popover-wrap">
                <button
                  type="button"
                  className="workhub-doc-settings-icon-trigger"
                  onClick={() => setIconPickerOpen((current) => !current)}
                  title="Choose icon"
                  aria-label="Choose icon"
                >
                  <span className="workhub-doc-settings-icon-preview" aria-hidden="true">{effectiveIcon}</span>
                  <span>{icon ? 'Change icon' : 'Choose icon'}</span>
                </button>
                {iconPickerOpen && (
                  <EmojiPickerPopover
                    value={icon}
                    emojis={EMOJI_SET_DOCUMENTS}
                    onSelect={(emoji) => onIconChange(emoji)}
                    onClear={icon ? () => onIconChange('') : undefined}
                    onClose={() => setIconPickerOpen(false)}
                  />
                )}
              </div>
            </div>
          </label>

          <label className="workhub-icon-field">
            <span>Workspace</span>
            <select value={workspaceId} onChange={(event) => onWorkspaceIdChange(event.target.value)}>
              {workspaceOptions.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>

          <label className="workhub-icon-field">
            <span>Store under</span>
            <select value={projectId} onChange={(event) => onProjectIdChange(event.target.value)}>
              <option value="">Workspace level (no parent project)</option>
              {filteredProjectOptions.map((item) => (
                <option key={item.id} value={item.id}>{`${'— '.repeat(item.depth)}${item.name}`}</option>
              ))}
            </select>
          </label>

          <div className="workhub-doc-settings-note">
            Moving into a project will inherit that project's visibility rules. Keeping it at workspace level makes it a general workspace {typeLabel}.
          </div>

          <div className="workhub-create-actions">
            <div className="workhub-create-actions-group">
              <button type="button" className="workhub-ghost-btn" onClick={onClose}>Cancel</button>
              <button type="submit" className="workhub-primary-btn" disabled={busyKey === 'document:settings'}>
                {busyKey === 'document:settings' ? 'Saving...' : 'Save settings'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}