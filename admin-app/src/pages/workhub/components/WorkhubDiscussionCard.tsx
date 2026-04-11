import type { WorkhubMember, WorkhubTaskComment } from '../../../lib/workhubRepo'

export interface WorkhubDiscussionCardProps {
  title?: string
  comments: WorkhubTaskComment[]
  currentUid: string
  memberByUid: Record<string, WorkhubMember>
  showAuthorAvatar?: boolean
  formatTime: (value: unknown) => string
  editingId: string
  editingText: string
  onEditStart: (comment: WorkhubTaskComment) => void
  onEditChange: (value: string) => void
  onEditCancel: () => void
  onEditSave: (comment: WorkhubTaskComment) => Promise<void>
  editBusyKey: string
  composerText: string
  onComposerTextChange: (value: string) => void
  onComposerSend: () => Promise<void>
  composerBusy: boolean
  composerPlaceholder?: string
  emptyStateText?: string
}

export function WorkhubDiscussionCard({
  title = 'Discussion',
  comments,
  currentUid,
  memberByUid,
  showAuthorAvatar = false,
  formatTime,
  editingId,
  editingText,
  onEditStart,
  onEditChange,
  onEditCancel,
  onEditSave,
  editBusyKey,
  composerText,
  onComposerTextChange,
  onComposerSend,
  composerBusy,
  composerPlaceholder = 'Write an update for your team...',
  emptyStateText = 'No messages yet. Start the discussion.',
}: WorkhubDiscussionCardProps) {
  function getInitials(value: string): string {
    const parts = value.trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return '?'
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase()
  }

  return (
    <div className="workhub-detail-card workhub-discussion-card">
      <div className="workhub-task-attachments-head">
        <span>{title}</span>
        <span>{`${comments.length} message${comments.length === 1 ? '' : 's'}`}</span>
      </div>
      <div className="workhub-comment-list workhub-comment-list-chat">
        {comments.map((item) => {
          const isOwnMessage = item.authorUid === currentUid
          const isEditing = editingId === item.id
          const author = memberByUid[item.authorUid]
          const authorLabel = author?.displayName || author?.email || item.authorUid
          const authorInitials = getInitials(authorLabel)
          return (
            <div key={item.id} className={`workhub-comment-item${isOwnMessage ? ' is-own' : ''}`}>
              <div className="workhub-comment-bubble">
                <div className="workhub-comment-bubble-head">
                  {showAuthorAvatar ? (
                    <div className="workhub-comment-author">
                      {author?.photoURL
                        ? <img src={author.photoURL} alt={authorLabel} className="workhub-comment-author-avatar" />
                        : <span className="workhub-comment-author-avatar-fallback">{authorInitials}</span>}
                      <strong>{isOwnMessage ? 'You' : authorLabel}</strong>
                    </div>
                  ) : (
                    <strong>{isOwnMessage ? 'You' : authorLabel}</strong>
                  )}
                  <div className="workhub-comment-head-actions">
                    <span>{formatTime(item.editedAt || item.updatedAt || item.createdAt)}</span>
                    {isOwnMessage && !isEditing && (
                      <button
                        type="button"
                        className="workhub-comment-edit-btn"
                        onClick={() => onEditStart(item)}
                        title="Edit message"
                        aria-label="Edit message"
                      >
                        ✏
                      </button>
                    )}
                  </div>
                </div>
                {isEditing ? (
                  <div className="workhub-comment-edit-form">
                    <textarea
                      value={editingText}
                      onChange={(event) => onEditChange(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' && !event.shiftKey) {
                          event.preventDefault()
                          void onEditSave(item)
                        }
                        if (event.key === 'Escape') {
                          event.preventDefault()
                          onEditCancel()
                        }
                      }}
                    />
                    <div className="workhub-comment-edit-actions">
                      <button type="button" className="workhub-ghost-mini" onClick={onEditCancel}>Cancel</button>
                      <button
                        type="button"
                        className="workhub-primary-mini"
                        onClick={() => void onEditSave(item)}
                        disabled={editBusyKey === `comment-edit:${item.id}` || !editingText.trim()}
                      >
                        {editBusyKey === `comment-edit:${item.id}` ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <p>{item.body}</p>
                )}
              </div>
            </div>
          )
        })}
        {comments.length === 0 && <div className="workhub-empty-state">{emptyStateText}</div>}
      </div>
      <div className="workhub-comment-composer">
        <textarea
          value={composerText}
          onChange={(event) => onComposerTextChange(event.target.value)}
          placeholder={composerPlaceholder}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              void onComposerSend()
            }
          }}
        />
        <button type="button" onClick={() => { void onComposerSend() }} disabled={composerBusy || !composerText.trim()}>
          {composerBusy ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  )
}
