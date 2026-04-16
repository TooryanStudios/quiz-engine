import { useEffect, useMemo, useRef, useState } from 'react'
import type { WorkhubMember, WorkhubTaskComment } from '../../../lib/workhubRepo'

const PAGE_SIZE = 6

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
  onComposerSend: (text: string) => Promise<void>
  composerBusy: boolean
  composerPlaceholder?: string
  emptyStateText?: string
  // Notify-recipients selector (only rendered when notifyCandidates is provided)
  notifyMode?: 'all' | 'selected' | 'none'
  notifyUids?: string[]
  notifyCandidates?: Array<{ uid: string; label: string }>
  onNotifyModeChange?: (mode: 'all' | 'selected' | 'none') => void
  onNotifyUidsChange?: (uids: string[]) => void
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
  onComposerSend,
  composerBusy,
  composerPlaceholder = 'Write an update for your team...',
  emptyStateText = 'No messages yet. Start the discussion.',
  notifyMode = 'all',
  notifyUids = [],
  notifyCandidates,
  onNotifyModeChange,
  onNotifyUidsChange,
}: WorkhubDiscussionCardProps) {
  const [notifyDropdownOpen, setNotifyDropdownOpen] = useState(false)
  const [localComposerText, setLocalComposerText] = useState('')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const notifyRowRef = useRef<HTMLDivElement>(null)

  // Reset visible count when the entity changes (different task/doc opened)
  const firstCommentId = comments[0]?.id
  useEffect(() => { setVisibleCount(PAGE_SIZE) }, [firstCommentId])
  useEffect(() => {
    if (!notifyDropdownOpen) return
    function handleOutsideClick(e: MouseEvent) {
      if (notifyRowRef.current && !notifyRowRef.current.contains(e.target as Node)) {
        setNotifyDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [notifyDropdownOpen])
  function getInitials(value: string): string {
    const parts = value.trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return '?'
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase()
  }

  // Sort oldest-first, then show latest PAGE_SIZE (bottom of list = newest)
  const sortedComments = useMemo(() =>
    [...comments].sort((a, b) => {
      const ta = (a.createdAt as { seconds?: number } | null)?.seconds ?? 0
      const tb = (b.createdAt as { seconds?: number } | null)?.seconds ?? 0
      return ta - tb
    }),
    [comments],
  )
  const totalCount = sortedComments.length
  const hiddenCount = Math.max(0, totalCount - visibleCount)
  const visibleComments = sortedComments.slice(hiddenCount)

  return (
    <div className="workhub-detail-card workhub-discussion-card">
      <div className="workhub-task-attachments-head">
        <span>{title}</span>
        <span>{`${totalCount} message${totalCount === 1 ? '' : 's'}`}</span>
      </div>
      <div className="workhub-comment-list workhub-comment-list-chat">
        {hiddenCount > 0 && (
          <button
            type="button"
            className="workhub-show-more-btn"
            onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
          >
            Show {Math.min(hiddenCount, PAGE_SIZE)} older message{Math.min(hiddenCount, PAGE_SIZE) === 1 ? '' : 's'}
          </button>
        )}
        {visibleComments.map((item) => {
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
        {totalCount === 0 && <div className="workhub-empty-state">{emptyStateText}</div>}
      </div>
      <div className="workhub-comment-composer">
        <textarea
          value={localComposerText}
          onChange={(event) => setLocalComposerText(event.target.value)}
          placeholder={composerPlaceholder}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              const text = localComposerText.trim()
              if (!text) return
              setLocalComposerText('')
              void onComposerSend(text).catch(() => setLocalComposerText(text))
            }
          }}
        />
        {notifyCandidates !== undefined && (
          <div className="workhub-composer-notify-row" ref={notifyRowRef}>
            <span className="workhub-composer-notify-label">Notify</span>
            <div
              className="workhub-composer-notify-trigger"
              role="button"
              tabIndex={0}
              onClick={() => setNotifyDropdownOpen((v) => !v)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setNotifyDropdownOpen((v) => !v) }}
            >
              {notifyMode === 'all'
                ? 'All involved'
                : notifyMode === 'none'
                  ? 'No one'
                  : `${notifyUids.length} selected`}
              <span className="workhub-composer-notify-chevron" aria-hidden>▾</span>
            </div>
            {notifyDropdownOpen && (
              <div className="workhub-composer-notify-menu">
                <button
                  type="button"
                  className={`workhub-composer-notify-option${notifyMode === 'all' ? ' is-active' : ''}`}
                  onClick={() => { onNotifyModeChange?.('all'); setNotifyDropdownOpen(false) }}
                >
                  All involved
                </button>
                <button
                  type="button"
                  className={`workhub-composer-notify-option${notifyMode === 'none' ? ' is-active' : ''}`}
                  onClick={() => { onNotifyModeChange?.('none'); setNotifyDropdownOpen(false) }}
                >
                  No one
                </button>
                <div className="workhub-composer-notify-divider" />
                {notifyCandidates.map((candidate) => {
                  const checked = notifyMode === 'selected' && notifyUids.includes(candidate.uid)
                  return (
                    <label key={candidate.uid} className="workhub-composer-notify-check">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...notifyUids, candidate.uid]
                            : notifyUids.filter((u) => u !== candidate.uid)
                          onNotifyUidsChange?.(next)
                          if (notifyMode !== 'selected') onNotifyModeChange?.('selected')
                        }}
                      />
                      {candidate.label}
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        )}
        <button type="button" onClick={() => {
          const text = localComposerText.trim()
          if (!text) return
          setLocalComposerText('')
          void onComposerSend(text).catch(() => setLocalComposerText(text))
        }} disabled={composerBusy || !localComposerText.trim()}>
          {composerBusy ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  )
}
