import { useMemo } from 'react'
import type { WorkhubMember, WorkhubMoodBoard, WorkhubVisibility } from '../../../lib/workhubRepo'

interface MoodBoardSettingsDialogProps {
  isOpen: boolean
  busyKey: string
  moodBoard: WorkhubMoodBoard | null
  workspaceOptions: Array<{ id: string; name: string }>
  projectOptions: Array<{ id: string; workspaceId: string; name: string; depth: number }>
  workspaceId: string
  projectId: string
  title: string
  accessVisibility: WorkhubVisibility
  accessMemberUids: string[]
  canSetRestricted: boolean
  restrictableMembers: WorkhubMember[]
  onWorkspaceIdChange: (value: string) => void
  onProjectIdChange: (value: string) => void
  onTitleChange: (value: string) => void
  onVisibilityChange: (value: WorkhubVisibility) => void
  onToggleMember: (uid: string) => void
  onClose: () => void
  onSave: () => void
}

export function MoodBoardSettingsDialog({
  isOpen,
  busyKey,
  moodBoard,
  workspaceOptions,
  projectOptions,
  workspaceId,
  projectId,
  title,
  accessVisibility,
  accessMemberUids,
  canSetRestricted,
  restrictableMembers,
  onWorkspaceIdChange,
  onProjectIdChange,
  onTitleChange,
  onVisibilityChange,
  onToggleMember,
  onClose,
  onSave,
}: MoodBoardSettingsDialogProps) {
  const filteredProjectOptions = useMemo(
    () => projectOptions.filter((item) => item.workspaceId === workspaceId),
    [projectOptions, workspaceId],
  )

  if (!isOpen || !moodBoard) return null

  return (
    <div className="workhub-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="workhub-modal workhub-document-settings-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="workhub-modal-head">
          <div>
            <h2>Mood board settings</h2>
            <p>Manage board location, title, and access policy.</p>
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
            <span>Board title</span>
            <input value={title} onChange={(event) => onTitleChange(event.target.value)} placeholder="Mood board title" />
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
              <option value="">Workspace level (no parent folder)</option>
              {filteredProjectOptions.map((item) => (
                <option key={item.id} value={item.id}>{`${'— '.repeat(item.depth)}${item.name}`}</option>
              ))}
            </select>
          </label>

          <label className="workhub-icon-field">
            <span>Access policy</span>
            <div className="workhub-project-settings-access-options">
              <label className="workhub-access-toggle">
                <input
                  type="checkbox"
                  checked={accessVisibility === 'workspace'}
                  onChange={() => onVisibilityChange('workspace')}
                  disabled={!canSetRestricted}
                />
                <span className={`workhub-access-label${accessVisibility === 'workspace' ? ' is-active' : ''}`}>Visible to workspace</span>
              </label>
              <label className="workhub-access-toggle">
                <input
                  type="checkbox"
                  checked={accessVisibility === 'restricted'}
                  onChange={() => onVisibilityChange('restricted')}
                  disabled={!canSetRestricted}
                />
                <span className={`workhub-access-label${accessVisibility === 'restricted' ? ' is-active' : ''}`}>Hidden from supporters</span>
              </label>
            </div>
            {!canSetRestricted && (
              <small className="workhub-create-hint-text">Only admins can change restricted access.</small>
            )}
          </label>

          {accessVisibility === 'restricted' && (
            <div className="workhub-member-picker workhub-project-settings-member-picker">
              {restrictableMembers.map((item) => {
                const checked = accessMemberUids.includes(item.uid)
                return (
                  <button
                    key={item.uid}
                    type="button"
                    className={`workhub-member-chip${checked ? ' is-selected' : ''}`}
                    onClick={() => onToggleMember(item.uid)}
                    disabled={!canSetRestricted}
                  >
                    {item.displayName || item.email}
                  </button>
                )
              })}
              {restrictableMembers.length === 0 && (
                <span className="workhub-project-settings-member-picker-note">No additional members available for restricted access.</span>
              )}
            </div>
          )}

          <div className="workhub-doc-settings-note">
            If this board is under a restricted folder, folder access policy takes precedence.
          </div>

          <div className="workhub-create-actions">
            <div className="workhub-create-actions-group">
              <button type="button" className="workhub-ghost-btn" onClick={onClose}>Cancel</button>
              <button type="submit" className="workhub-primary-btn" disabled={busyKey === 'moodboard:settings'}>
                {busyKey === 'moodboard:settings' ? 'Saving...' : 'Save settings'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
