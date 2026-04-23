import { useEffect, useMemo, useRef, useState } from 'react'
import {
  createWorkhubNotifications,
  setWorkhubCommentLike,
  setWorkhubCommentReaction,
  type WorkhubMember,
  type WorkhubTaskComment,
} from '../../../lib/workhubRepo'

const PAGE_SIZE = 6
const URL_PATTERN = /((?:https?:\/\/|www\.)[^\s<]+)/gi
const REPLY_PREFIX_RE = /^(↩ Reply to [^\n]+)\n([\s\S]*)$/

function stripNestedReplyPrefix(value: string): string {
  let output = value || ''
  // Keep a single-level quote by removing nested reply prefixes from the body.
  while (true) {
    const match = output.match(REPLY_PREFIX_RE)
    if (!match) return output
    output = (match[2] || '').trimStart()
  }
}

function splitReplyQuoteAndBody(value: string): { quote: string | null; body: string } {
  const match = (value || '').match(REPLY_PREFIX_RE)
  if (!match) return { quote: null, body: value || '' }
  return {
    quote: match[1] || null,
    body: stripNestedReplyPrefix(match[2] || ''),
  }
}

function normalizeDetectedUrl(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
}

function stripTrailingPunctuation(value: string): { link: string; trailing: string } {
  const match = value.match(/[),.;!?]+$/)
  if (!match) return { link: value, trailing: '' }
  const trailing = match[0]
  return {
    link: value.slice(0, Math.max(0, value.length - trailing.length)),
    trailing,
  }
}

function renderLinkedText(value: string) {
  if (!value) return null
  const segments: Array<string | JSX.Element> = []
  let cursor = 0
  const matches = Array.from(value.matchAll(URL_PATTERN))

  if (matches.length === 0) return value

  matches.forEach((match, index) => {
    const raw = match[0] || ''
    const start = match.index ?? 0
    const end = start + raw.length
    if (start > cursor) {
      segments.push(value.slice(cursor, start))
    }

    const { link, trailing } = stripTrailingPunctuation(raw)
    const href = normalizeDetectedUrl(link)
    if (href) {
      segments.push(
        <a key={`msg-link-${index}-${start}`} href={href} target="_blank" rel="noreferrer noopener">
          {link}
        </a>,
      )
    } else {
      segments.push(raw)
    }
    if (trailing) segments.push(trailing)
    cursor = end
  })

  if (cursor < value.length) {
    segments.push(value.slice(cursor))
  }

  return segments
}

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
  onDelete?: (comment: WorkhubTaskComment) => Promise<void>
  editBusyKey: string
  deleteBusyKey?: string
  deleteConfirmText?: string
  onComposerSend: (text: string) => Promise<void>
  composerBusy: boolean
  dockedComposer?: boolean
  composerPlaceholder?: string
  emptyStateText?: string
  // Notify-recipients selector (only rendered when notifyCandidates is provided)
  notifyMode?: 'all' | 'selected' | 'none'
  notifyUids?: string[]
  notifyCandidates?: Array<{ uid: string; label: string }>
  onNotifyModeChange?: (mode: 'all' | 'selected' | 'none') => void
  onNotifyUidsChange?: (uids: string[]) => void
  highlightCommentId?: string
  hasMoreOlderMessages?: boolean
  onLoadMoreOlderMessages?: () => void
  threadKey?: string
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
  onDelete,
  editBusyKey,
  deleteBusyKey = '',
  deleteConfirmText = 'Delete this message? This cannot be undone.',
  onComposerSend,
  composerBusy,
  dockedComposer = false,
  composerPlaceholder = 'Write an update for your team...',
  emptyStateText = 'No messages yet. Start the discussion.',
  notifyMode = 'all',
  notifyUids = [],
  notifyCandidates,
  onNotifyModeChange,
  onNotifyUidsChange,
  highlightCommentId = '',
  hasMoreOlderMessages = false,
  onLoadMoreOlderMessages,
  threadKey = '',
}: WorkhubDiscussionCardProps) {
  const REACTION_CYCLE = ['😀', '❤️', '🎉', '👍']

  // Soft muted palette — assigned deterministically per UID
  const USER_COLOR_PALETTE = [
    { bg: '#f7f9fc', border: '#dbe3ee', accent: '#5f7897' }, // blue-gray
    { bg: '#f7faf7', border: '#d7e4d9', accent: '#5f7f67' }, // sage
    { bg: '#faf8fc', border: '#e1d9ea', accent: '#75638b' }, // muted violet
    { bg: '#fcfaf7', border: '#e8dfd3', accent: '#8a765c' }, // sand
    { bg: '#fcf8f9', border: '#ead9de', accent: '#8a6873' }, // dusty rose
    { bg: '#f7fafb', border: '#d8e5e7', accent: '#5d7d83' }, // muted teal
    { bg: '#f8f7fb', border: '#ddd9ea', accent: '#6f678a' }, // soft indigo
    { bg: '#faf8f6', border: '#e4ddd6', accent: '#7f7163' }, // warm taupe
  ]

  function getUserColorIndex(uid: string): number {
    let hash = 0
    for (let i = 0; i < uid.length; i++) {
      hash = (hash * 31 + uid.charCodeAt(i)) >>> 0
    }
    return hash % USER_COLOR_PALETTE.length
  }

  const [notifyDropdownOpen, setNotifyDropdownOpen] = useState(false)
  const [localComposerText, setLocalComposerText] = useState('')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [likingMessageId, setLikingMessageId] = useState('')
  const [optimisticLikeByCommentId, setOptimisticLikeByCommentId] = useState<Record<string, boolean>>({})
  const [interactionBusyByComment, setInteractionBusyByComment] = useState<Record<string, boolean>>({})
  const [replyToMessageId, setReplyToMessageId] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState('')
  const notifyRowRef = useRef<HTMLDivElement>(null)
  const composerTextareaRef = useRef<HTMLTextAreaElement>(null)
  const commentListRef = useRef<HTMLDivElement>(null)
  const bottomAnchorRef = useRef<HTMLDivElement>(null)

  function detectTextDirection(value: string): 'rtl' | 'ltr' {
    const hasArabic = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(value)
    return hasArabic ? 'rtl' : 'ltr'
  }

  function syncComposerHeight() {
    const el = composerTextareaRef.current
    if (!el) return
    el.style.height = 'auto'
    const nextHeight = Math.min(el.scrollHeight, 180)
    el.style.height = `${Math.max(46, nextHeight)}px`
    el.style.overflowY = el.scrollHeight > 180 ? 'auto' : 'hidden'
  }

  // Reset visible count when the discussion thread changes (different task/doc/project)
  useEffect(() => { setVisibleCount(PAGE_SIZE) }, [threadKey])
  useEffect(() => {
    if (!notifyDropdownOpen) return
    function isInsideNotifyRow(target: EventTarget | null) {
      const node = target as Node | null
      return !!node && !!notifyRowRef.current?.contains(node)
    }

    function handleOutsidePointerDown(e: PointerEvent) {
      if (!isInsideNotifyRow(e.target)) {
        setNotifyDropdownOpen(false)
      }
    }

    function handleOutsideMouseDown(e: MouseEvent) {
      if (!isInsideNotifyRow(e.target)) {
        setNotifyDropdownOpen(false)
      }
    }

    function handleOutsideTouchStart(e: TouchEvent) {
      if (!isInsideNotifyRow(e.target)) {
        setNotifyDropdownOpen(false)
      }
    }

    function handleOutsideFocusIn(e: FocusEvent) {
      if (!isInsideNotifyRow(e.target)) {
        setNotifyDropdownOpen(false)
      }
    }

    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setNotifyDropdownOpen(false)
      }
    }

    document.addEventListener('pointerdown', handleOutsidePointerDown, true)
    document.addEventListener('mousedown', handleOutsideMouseDown, true)
    document.addEventListener('touchstart', handleOutsideTouchStart, true)
    document.addEventListener('focusin', handleOutsideFocusIn, true)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('pointerdown', handleOutsidePointerDown, true)
      document.removeEventListener('mousedown', handleOutsideMouseDown, true)
      document.removeEventListener('touchstart', handleOutsideTouchStart, true)
      document.removeEventListener('focusin', handleOutsideFocusIn, true)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [notifyDropdownOpen])
  useEffect(() => {
    syncComposerHeight()
  }, [localComposerText])

  // Clear optimistic like overrides once Firestore snapshot catches up.
  useEffect(() => {
    const keys = Object.keys(optimisticLikeByCommentId)
    if (keys.length === 0) return
    setOptimisticLikeByCommentId((current) => {
      let changed = false
      const next: Record<string, boolean> = { ...current }
      keys.forEach((commentId) => {
        const target = comments.find((item) => item.id === commentId)
        if (!target) {
          delete next[commentId]
          changed = true
          return
        }
        const serverLiked = (target.likedByUids || []).includes(currentUid)
        if (serverLiked === current[commentId]) {
          delete next[commentId]
          changed = true
        }
      })
      return changed ? next : current
    })
  }, [comments, currentUid, optimisticLikeByCommentId])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [comments.length])

  // Scroll highlighted comment into view when arriving from a notification
  useEffect(() => {
    if (!highlightCommentId) return
    const el = document.getElementById(`wh-comment-${highlightCommentId}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }, [highlightCommentId])

  function getInitials(value: string): string {
    const parts = value.trim().split(/\s+/).filter(Boolean)
    if (parts.length === 0) return '?'
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase()
  }

  // Sort oldest-first, then show latest PAGE_SIZE (bottom of list = newest).
  // Keep pending comments (without server timestamp yet) at the bottom to avoid
  // top-then-bottom reordering flicker while Firestore resolves createdAt.
  const sortedComments = useMemo(() => {
    const getSortStamp = (value: unknown) => {
      const seconds = (value as { seconds?: number } | null)?.seconds
      return typeof seconds === 'number' && seconds > 0 ? seconds : Number.MAX_SAFE_INTEGER
    }
    return [...comments].sort((a, b) => getSortStamp(a.createdAt) - getSortStamp(b.createdAt))
  }, [comments])
  const totalCount = sortedComments.length
  const hiddenCount = Math.max(0, totalCount - visibleCount)
  const visibleComments = sortedComments.slice(hiddenCount)
  const replyTargetComment = replyToMessageId ? sortedComments.find((item) => item.id === replyToMessageId) : undefined
  const selectedNotifyLabels = useMemo(() => {
    if (notifyMode !== 'selected' || notifyUids.length === 0 || !notifyCandidates) return [] as string[]
    const labelByUid = new Map(notifyCandidates.map((candidate) => [candidate.uid, candidate.label]))
    return notifyUids.map((uid) => labelByUid.get(uid) || uid)
  }, [notifyCandidates, notifyMode, notifyUids])
  const notifyRowNode = notifyCandidates !== undefined ? (
    <div className="workhub-composer-notify-row" ref={notifyRowRef}>
      <span className="workhub-composer-notify-label">Notify</span>
      <button
        type="button"
        className="workhub-composer-notify-trigger"
        onClick={() => setNotifyDropdownOpen((v) => !v)}
        data-expanded={notifyDropdownOpen ? 'true' : 'false'}
        aria-label="Choose notification recipients"
      >
        <span className="workhub-composer-notify-trigger-text">
          {notifyMode === 'all'
            ? 'All involved'
            : notifyMode === 'none'
              ? 'No one'
              : `${notifyUids.length} selected`}
        </span>
        <span className="workhub-composer-notify-chevron" aria-hidden>▾</span>
      </button>
      <div className="workhub-composer-notify-summary" aria-live="polite">
        {notifyMode === 'all' && <span className="workhub-composer-notify-pill is-all">All involved</span>}
        {notifyMode === 'none' && <span className="workhub-composer-notify-pill is-none">No notifications</span>}
        {notifyMode === 'selected' && selectedNotifyLabels.slice(0, 2).map((label) => (
          <span key={label} className="workhub-composer-notify-pill">{label}</span>
        ))}
        {notifyMode === 'selected' && selectedNotifyLabels.length > 2 && (
          <span className="workhub-composer-notify-pill is-more">+{selectedNotifyLabels.length - 2}</span>
        )}
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
  ) : null
  const handleSendComposerMessage = () => {
    const text = localComposerText.trim()
    if (!text) return
    const replyAuthor = replyTargetComment
      ? (memberByUid[replyTargetComment.authorUid]?.displayName || memberByUid[replyTargetComment.authorUid]?.email || replyTargetComment.authorUid)
      : ''
    const rawReplyBody = replyTargetComment ? stripNestedReplyPrefix(replyTargetComment.body || '') : ''
    const replySnippet = rawReplyBody.trim().replace(/\s+/g, ' ').slice(0, 84)
    const replyPrefix = replyTargetComment
      ? `↩ Reply to ${replyAuthor}${replySnippet ? `: "${replySnippet}${replySnippet.length >= 84 ? '…' : ''}"` : ''}\n`
      : ''
    const nextPayload = `${replyPrefix}${text}`
    setLocalComposerText('')
    setReplyToMessageId('')
    void onComposerSend(nextPayload).catch(() => setLocalComposerText(text))
  }

  async function notifyCommentAuthor(params: {
    comment: WorkhubTaskComment
    action: 'like' | 'reaction'
    reaction?: string
  }) {
    if (!currentUid || currentUid === params.comment.authorUid) return
    const workspaceId = (params.comment.workspaceId || '').trim()
    if (!workspaceId) return
    const actorLabel = memberByUid[currentUid]?.displayName || memberByUid[currentUid]?.email || 'Someone'
    const targetLabel = memberByUid[params.comment.authorUid]?.displayName || memberByUid[params.comment.authorUid]?.email || 'your message'
    const { body } = splitReplyQuoteAndBody(params.comment.body || '')
    const preview = body.trim().slice(0, 120)
    const targetEntityId = (params.comment.taskId || params.comment.entityId || params.comment.id || '').trim()
    if (!targetEntityId) return
    const baseMessage = params.action === 'like'
      ? `${actorLabel} liked your message`
      : `${actorLabel} reacted ${params.reaction || ''} to your message`

    await createWorkhubNotifications({
      workspaceId,
      actorUid: currentUid,
      recipientUids: [params.comment.authorUid],
      entityType: 'comment',
      entityId: targetEntityId,
      action: params.action,
      message: `${baseMessage}: ${preview || targetLabel}`,
      commentPreview: preview || params.comment.body || '',
    })
  }

  async function toggleLikeMessage(comment: WorkhubTaskComment) {
    const messageId = comment.id
    if (!messageId || !currentUid || interactionBusyByComment[messageId]) return
    const serverLiked = (comment.likedByUids || []).includes(currentUid)
    const effectiveLiked = Object.prototype.hasOwnProperty.call(optimisticLikeByCommentId, messageId)
      ? optimisticLikeByCommentId[messageId]
      : serverLiked
    const alreadyLiked = effectiveLiked
    const nextLiked = !alreadyLiked
    setOptimisticLikeByCommentId((current) => ({ ...current, [messageId]: nextLiked }))
    setInteractionBusyByComment((current) => ({ ...current, [messageId]: true }))
    if (nextLiked) {
      setLikingMessageId(messageId)
      setTimeout(() => setLikingMessageId(''), 600)
    }
    try {
      await setWorkhubCommentLike({ commentId: messageId, userUid: currentUid, liked: nextLiked })
      if (nextLiked) {
        await notifyCommentAuthor({ comment, action: 'like' })
      }
    } catch (error) {
      console.error('Failed to toggle message like:', error)
    } finally {
      setInteractionBusyByComment((current) => {
        const next = { ...current }
        delete next[messageId]
        return next
      })
      if (!nextLiked) {
        // In unlike path, if server update fails, restore UI from server value.
        setOptimisticLikeByCommentId((current) => {
          if (!Object.prototype.hasOwnProperty.call(current, messageId)) return current
          const next = { ...current }
          const latestServerLiked = (comment.likedByUids || []).includes(currentUid)
          if (latestServerLiked === current[messageId]) {
            delete next[messageId]
          }
          return next
        })
      }
    }
  }

  async function cycleMessageReaction(comment: WorkhubTaskComment) {
    const messageId = comment.id
    if (!messageId || !currentUid || interactionBusyByComment[messageId]) return
    const currentReaction = comment.reactionByUid?.[currentUid] || ''
    const currentIndex = REACTION_CYCLE.indexOf(currentReaction)
      const nextIndex = currentIndex + 1
    const nextReaction = nextIndex >= REACTION_CYCLE.length ? null : REACTION_CYCLE[nextIndex]
    setInteractionBusyByComment((current) => ({ ...current, [messageId]: true }))
    try {
      await setWorkhubCommentReaction({
        commentId: messageId,
        userUid: currentUid,
        reaction: nextReaction,
      })
      if (nextReaction) {
        await notifyCommentAuthor({ comment, action: 'reaction', reaction: nextReaction })
      }
    } catch (error) {
      console.error('Failed to set message reaction:', error)
    } finally {
      setInteractionBusyByComment((current) => {
        const next = { ...current }
        delete next[messageId]
        return next
      })
    }
  }

  const focusComposer = () => {
    requestAnimationFrame(() => {
      const textarea = composerTextareaRef.current
      if (!textarea) return
      textarea.focus()
      const end = textarea.value.length
      textarea.setSelectionRange(end, end)
    })
  }

  const handleReplyClick = (messageId: string) => {
    setReplyToMessageId(messageId)
    focusComposer()
  }

  return (
    <div className={`workhub-detail-card workhub-discussion-card${dockedComposer ? ' is-docked-composer' : ''}`}>
      <div className="workhub-task-attachments-head workhub-discussion-head">
        <div className="workhub-discussion-head-main">
          <span>{title}</span>
          <span>{`${totalCount} message${totalCount === 1 ? '' : 's'}`}</span>
        </div>
        <div className="workhub-discussion-head-actions" aria-hidden="true">
          <span className="workhub-discussion-head-action">⌕</span>
          <span className="workhub-discussion-head-action">🔔</span>
          <span className="workhub-discussion-head-action">≡</span>
        </div>
      </div>
      <div className="workhub-comment-list workhub-comment-list-chat">
        {(hiddenCount > 0 || hasMoreOlderMessages) && (
          <button
            type="button"
            className="workhub-show-more-btn"
            onClick={() => {
              setVisibleCount((n) => n + PAGE_SIZE)
              if (hiddenCount <= 0 && hasMoreOlderMessages) {
                onLoadMoreOlderMessages?.()
              }
            }}
          >
            Show {Math.min(hiddenCount > 0 ? hiddenCount : PAGE_SIZE, PAGE_SIZE)} older message{Math.min(hiddenCount > 0 ? hiddenCount : PAGE_SIZE, PAGE_SIZE) === 1 ? '' : 's'}
          </button>
        )}
        {visibleComments.map((item) => {
          const isOwnMessage = item.authorUid === currentUid
          const isEditing = editingId === item.id
          const isHighlighted = highlightCommentId === item.id
          const baseLikes = new Set(item.likedByUids || [])
          const hasOptimisticLike = Object.prototype.hasOwnProperty.call(optimisticLikeByCommentId, item.id)
          if (hasOptimisticLike) {
            if (optimisticLikeByCommentId[item.id]) baseLikes.add(currentUid)
            else baseLikes.delete(currentUid)
          }
          const isLikedByCurrent = baseLikes.has(currentUid)
          const currentReaction = item.reactionByUid?.[currentUid] || ''
          const likesTotal = baseLikes.size
          const reactionEntries = Object.values(item.reactionByUid || {}).filter(Boolean)
          const reactionsTotal = reactionEntries.length
          const isInteractionBusy = !!interactionBusyByComment[item.id]
          const author = memberByUid[item.authorUid]
          const authorLabel = author?.displayName || author?.email || item.authorUid
          const authorInitials = getInitials(authorLabel)
          const bodyText = item.body || ''
          const { quote: replyQuoteText, body: mainBodyText } = splitReplyQuoteAndBody(bodyText)
          const userColorIdx = getUserColorIndex(item.authorUid)
          const userColor = USER_COLOR_PALETTE[userColorIdx]
          const bubbleStyle = isOwnMessage
            ? { background: '#fbfdff', borderColor: '#cfdef6' }
            : { background: userColor.bg, borderColor: userColor.border }
          const bubbleHeadStyle = isOwnMessage
            ? { borderBottomColor: '#e7effb' }
            : { borderBottomColor: userColor.border }
          const authorTextStyle = isOwnMessage
            ? { color: '#1e3a67' }
            : { color: userColor.accent }
          return (
            <div
              key={item.id}
              id={`wh-comment-${item.id}`}
              className={`workhub-comment-item${isOwnMessage ? ' is-own' : ''}${isHighlighted ? ' is-highlighted' : ''}`}
            >
              <div
                className="workhub-comment-bubble"
                onDoubleClick={() => { void toggleLikeMessage(item) }}
                style={bubbleStyle}
              >
                <div className="workhub-comment-bubble-head" style={bubbleHeadStyle}>
                  {showAuthorAvatar ? (
                    <div className="workhub-comment-author">
                      {author?.photoURL
                        ? <img src={author.photoURL} alt={authorLabel} className="workhub-comment-author-avatar" />
                        : <span className="workhub-comment-author-avatar-fallback" style={{ background: isOwnMessage ? '#dbe7f8' : userColor.border, color: isOwnMessage ? '#2f4f84' : userColor.accent }}>{authorInitials}</span>}
                      <strong style={authorTextStyle}>{isOwnMessage ? 'You' : authorLabel}</strong>
                    </div>
                  ) : (
                    <strong style={authorTextStyle}>{isOwnMessage ? 'You' : authorLabel}</strong>
                  )}
                  <div className="workhub-comment-head-actions">
                    <span>{formatTime(item.editedAt || item.updatedAt || item.createdAt)}</span>
                  </div>
                </div>
                {isEditing ? (
                  <div className="workhub-comment-edit-form">
                    <textarea
                      aria-label="Edit discussion message"
                      title="Edit discussion message"
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
                  <>
                    {replyQuoteText && (
                      <div className="workhub-comment-reply-quote">{replyQuoteText}</div>
                    )}
                    <p dir={detectTextDirection(mainBodyText)}>{renderLinkedText(mainBodyText)}</p>
                    <div className="workhub-comment-actions-bar" aria-label="Message actions">
                      <div className="workhub-comment-actions-left">
                        {isOwnMessage && (
                          <>
                            <button
                              type="button"
                              className="workhub-comment-edit-btn"
                              onClick={() => onEditStart(item)}
                              title="Edit message"
                              aria-label="Edit message"
                            >
                              ✏
                            </button>
                            {onDelete && (
                              deleteConfirmId === item.id ? (
                                <>
                                  <button
                                    type="button"
                                    className="workhub-comment-edit-btn is-delete-confirm"
                                    onClick={() => {
                                      void onDelete(item).finally(() => setDeleteConfirmId(''))
                                    }}
                                    disabled={deleteBusyKey === `comment-delete:${item.id}`}
                                    title={deleteConfirmText}
                                    aria-label="Confirm delete"
                                  >
                                    {deleteBusyKey === `comment-delete:${item.id}` ? '…' : '✓'}
                                  </button>
                                  <button
                                    type="button"
                                    className="workhub-comment-edit-btn"
                                    onClick={() => setDeleteConfirmId('')}
                                    title="Cancel delete"
                                    aria-label="Cancel delete"
                                  >
                                    ✕
                                  </button>
                                </>
                              ) : (
                                <button
                                  type="button"
                                  className="workhub-comment-edit-btn is-delete"
                                  onClick={() => setDeleteConfirmId(item.id)}
                                  disabled={deleteBusyKey === `comment-delete:${item.id}`}
                                  title="Delete message"
                                  aria-label="Delete message"
                                >
                                  🗑
                                </button>
                              )
                            )}
                          </>
                        )}
                      </div>
                      <div className="workhub-comment-actions-right">
                        <button
                          type="button"
                          className={`workhub-comment-action-chip${isLikedByCurrent ? ' is-active-like' : ''}${likingMessageId === item.id ? ' is-liking' : ''}`}
                          title="Like message"
                          aria-label="Like message"
                          onClick={() => { void toggleLikeMessage(item) }}
                          disabled={isInteractionBusy}
                        >
                          {isLikedByCurrent ? '❤️' : '♡'}
                        </button>
                        {likesTotal > 0 && <span className="workhub-comment-action-count">{likesTotal}</span>}
                        <button
                          type="button"
                          className={`workhub-comment-action-chip${currentReaction ? ' is-active-reaction' : ''}`}
                          title="React to message"
                          aria-label="React to message"
                          onClick={() => { void cycleMessageReaction(item) }}
                          disabled={isInteractionBusy}
                        >
                          {currentReaction || '☺'}
                        </button>
                        {reactionsTotal > 0 && <span className="workhub-comment-action-count">{reactionsTotal}</span>}
                        <button
                          type="button"
                          className={`workhub-comment-action-chip${replyToMessageId === item.id ? ' is-active-reply' : ''}`}
                          title="Reply to message"
                          aria-label="Reply to message"
                          onClick={() => handleReplyClick(item.id)}
                        >↩</button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )
        })}
        {totalCount === 0 && <div className="workhub-empty-state">{emptyStateText}</div>}
        <div ref={bottomAnchorRef} style={{ height: 0 }} />
      </div>
      <div className="workhub-comment-composer">
        {dockedComposer && notifyRowNode}
        {replyTargetComment && (
          <div className="workhub-comment-reply-target">
            <span>
              Replying to {memberByUid[replyTargetComment.authorUid]?.displayName || memberByUid[replyTargetComment.authorUid]?.email || replyTargetComment.authorUid}
            </span>
            <button type="button" className="workhub-ghost-mini" onClick={() => setReplyToMessageId('')}>Cancel</button>
          </div>
        )}
        <textarea
          ref={composerTextareaRef}
          dir={detectTextDirection(localComposerText)}
          value={localComposerText}
          onChange={(event) => {
            setLocalComposerText(event.target.value)
            syncComposerHeight()
          }}
          placeholder={composerPlaceholder}
          aria-label="Discussion message"
          disabled={composerBusy}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault()
              handleSendComposerMessage()
            }
          }}
        />
        <div className="workhub-comment-composer-footer">
          {!dockedComposer && notifyRowNode}
          <div className="workhub-comment-composer-tools" aria-hidden="true">
            <span className="workhub-comment-composer-tool">＋</span>
            <span className="workhub-comment-composer-tool">＠</span>
            <span className="workhub-comment-composer-tool">◌</span>
          </div>
          <button
            type="button"
            className="workhub-comment-send-btn"
            onClick={handleSendComposerMessage}
            disabled={composerBusy || !localComposerText.trim()}
            title={composerBusy ? 'Sending...' : 'Send message'}
            aria-label={composerBusy ? 'Sending message' : 'Send message'}
          >
            <span aria-hidden="true">➤</span>
          </button>
        </div>
      </div>
    </div>
  )
}
