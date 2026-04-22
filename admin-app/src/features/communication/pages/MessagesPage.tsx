import { useRef, useMemo, useState, useEffect } from 'react'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { useNavigate } from 'react-router-dom'
import { auth, storage } from '../../../lib/firebase'
import { formatNotificationTime } from '../utils/workhubNotificationNavigation'
import {
  useGlobalTeamChat,
  buildThreadId,
  THREAD_EVERYONE,
  type SendTeamChatMessageOptions,
  type TeamChatMessage,
} from '../hooks/useGlobalTeamChat'
import '../communication.css'

const CHAT_REACTIONS = ['👍', '❤️', '😂', '🎉', '😮', '😢'] as const
const CHAT_PINNED_THREADS_KEY = 'workhub_chat_pinned_threads_v1'
const CHAT_MUTED_THREADS_KEY = 'workhub_chat_muted_threads_v1'

function readThreadFlagMap(storageKey: string): Record<string, true> {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).filter(([threadId, value]) => !!threadId && value === true).map(([threadId]) => [threadId, true]),
    )
  } catch {
    return {}
  }
}

function writeThreadFlagMap(storageKey: string, map: Record<string, true>) {
  localStorage.setItem(storageKey, JSON.stringify(map))
}

function extractMentionQuery(text: string, cursorIndex: number): string {
  const left = text.slice(0, Math.max(0, cursorIndex))
  const match = left.match(/@([a-zA-Z0-9._-]{0,60})$/)
  return match ? match[1] : ''
}

function insertMention(text: string, cursorIndex: number, mentionKey: string) {
  const left = text.slice(0, Math.max(0, cursorIndex))
  const right = text.slice(Math.max(0, cursorIndex))
  const nextLeft = left.replace(/@([a-zA-Z0-9._-]{0,60})$/, `@${mentionKey} `)
  return `${nextLeft}${right}`
}

type PendingChatImage = {
  id: string
  file: File
  previewUrl: string
  signature: string
  displayName: string
}

function looksLikeGenericPastedName(name: string): boolean {
  return /^image\.(png|jpe?g|gif|webp|bmp)$/i.test((name || '').trim())
}

function getImageExtension(file: File): string {
  const fromType = (file.type.split('/')[1] || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  if (fromType) return fromType
  const fromName = ((file.name || '').split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '')
  return fromName || 'png'
}

function buildClipboardDisplayName(file: File, ordinal: number): string {
  const ext = getImageExtension(file)
  return `pasted-image-${Date.now()}-${String(ordinal).padStart(2, '0')}.${ext}`
}

function withChatLinkedMarker(targetPath: string): string {
  const [pathAndQuery, hash = ''] = targetPath.split('#')
  const [path, query = ''] = pathAndQuery.split('?')
  const params = new URLSearchParams(query)
  params.set('chatLinked', '1')
  const next = `${path}?${params.toString()}`
  return hash ? `${next}#${hash}` : next
}

async function buildFileSignature(file: File): Promise<string> {
  try {
    const bytes = new Uint8Array(await file.arrayBuffer())
    const digest = await crypto.subtle.digest('SHA-256', bytes)
    const hex = Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('')
    return `${file.type}:${file.size}:${hex}`
  } catch {
    return `${file.type}:${file.size}:${file.lastModified}`
  }
}

export function MessagesPage() {
  const navigate = useNavigate()
  const currentUser = auth.currentUser
  const [draft, setDraft] = useState('')
  const [sendError, setSendError] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pendingImagesRef = useRef<PendingChatImage[]>([])
  const speechRecognitionRef = useRef<{ stop?: () => void } | null>(null)
  const voiceBaseDraftRef = useRef('')
  const threadListRef = useRef<HTMLDivElement>(null)
  const messageElementRefs = useRef<Record<string, HTMLElement | null>>({})
  const stickToBottomRef = useRef(true)
  const threadEndRef = useRef<HTMLDivElement>(null)
  const [selectedRecipientUids, setSelectedRecipientUids] = useState<string[]>([])
  const [recipientInitialized, setRecipientInitialized] = useState(false)
  const [recipientAddMode, setRecipientAddMode] = useState(false)
  const [seenUnreadStampByThread, setSeenUnreadStampByThread] = useState<Record<string, number>>({})
  const [hoveredMessageId, setHoveredMessageId] = useState('')
  const [pendingDeleteMessageId, setPendingDeleteMessageId] = useState('')
  const [editingMessageId, setEditingMessageId] = useState('')
  const [editingDraft, setEditingDraft] = useState('')
  const [selectedPriority, setSelectedPriority] = useState<SendTeamChatMessageOptions['priority']>('normal')
  const [mentionQuery, setMentionQuery] = useState('')
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 })
  const [pendingImages, setPendingImages] = useState<PendingChatImage[]>([])
  const [attachmentInfo, setAttachmentInfo] = useState('')
  const [previewImageUrl, setPreviewImageUrl] = useState('')
  const [previewImageAlt, setPreviewImageAlt] = useState('')
  const [isRecordingVoice, setIsRecordingVoice] = useState(false)
  const [reactionPickerMessageId, setReactionPickerMessageId] = useState('')
  const [receiptDetailsMessageId, setReceiptDetailsMessageId] = useState('')
  const [replyingToMessageId, setReplyingToMessageId] = useState('')
  const [highlightedMessageId, setHighlightedMessageId] = useState('')
  const [pinnedThreadIds, setPinnedThreadIds] = useState<Record<string, true>>(() => readThreadFlagMap(CHAT_PINNED_THREADS_KEY))
  const [mutedThreadIds, setMutedThreadIds] = useState<Record<string, true>>(() => readThreadFlagMap(CHAT_MUTED_THREADS_KEY))
  const [searchText, setSearchText] = useState('')
  const [senderFilterUid, setSenderFilterUid] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'normal' | 'high'>('all')
  const [filterHasImage, setFilterHasImage] = useState(false)
  const [filterHasLink, setFilterHasLink] = useState(false)

  const chatUser = useMemo(() => {
    if (!currentUser) return null
    return {
      uid: currentUser.uid,
      displayName: currentUser.displayName || undefined,
      email: currentUser.email || undefined,
      photoURL: currentUser.photoURL || undefined,
    }
  }, [currentUser])

  const activeThreadId = useMemo(
    () => selectedRecipientUids.length === 0
      ? THREAD_EVERYONE
      : buildThreadId([...(chatUser ? [chatUser.uid] : []), ...selectedRecipientUids]),
    [chatUser, selectedRecipientUids],
  )

  const {
    messages,
    sendMessage,
    remindMessage,
    editMessage,
    deleteMessage,
    confirmMessageReceipt,
    setMessageReaction,
    clearMessageReaction,
    sendTyping,
    typingIndicators,
    sending,
    approvedMembers,
    unreadStampByThread,
  } = useGlobalTeamChat({
    user: chatUser,
    enabled: !!chatUser,
    threadId: activeThreadId,
    markAsReadActive: true,
  })

  const mentionOptions = useMemo(() => {
    const q = mentionQuery.trim().toLowerCase()
    if (!q) return []
    return approvedMembers
      .filter((member) => {
        const display = (member.displayName || '').trim().toLowerCase()
        const key = (member.email || '').split('@')[0].trim().toLowerCase()
        return display.includes(q) || key.includes(q)
      })
      .slice(0, 6)
  }, [approvedMembers, mentionQuery])

  useEffect(() => {
    if (!stickToBottomRef.current) return
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleThreadScroll = () => {
    const el = threadListRef.current
    if (!el) return
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight
    stickToBottomRef.current = distanceFromBottom < 64
  }

  useEffect(() => {
    if (!chatUser?.uid) return
    const hasText = draft.trim().length > 0
    const timer = window.setTimeout(() => {
      void sendTyping(hasText, selectedRecipientUids.length > 0 ? selectedRecipientUids : undefined)
    }, 250)
    return () => window.clearTimeout(timer)
  }, [chatUser?.uid, draft, selectedRecipientUids, sendTyping])

  useEffect(() => {
    if (!chatUser?.uid) return
    const timer = window.setTimeout(() => {
      void sendTyping(false, selectedRecipientUids.length > 0 ? selectedRecipientUids : undefined)
    }, 3000)
    return () => window.clearTimeout(timer)
  }, [chatUser?.uid, draft, selectedRecipientUids, sendTyping])

  useEffect(() => {
    if (recipientInitialized) return
    if (!chatUser?.uid) return
    setSelectedRecipientUids([chatUser.uid])
    setRecipientInitialized(true)
  }, [chatUser?.uid, recipientInitialized])

  useEffect(() => {
    pendingImagesRef.current = pendingImages
  }, [pendingImages])

  useEffect(() => {
    return () => {
      speechRecognitionRef.current?.stop?.()
      pendingImagesRef.current.forEach((image) => URL.revokeObjectURL(image.previewUrl))
    }
  }, [])

  const selectRecipient = (uid: string) => {
    setSelectedRecipientUids((prev) => {
      if (recipientAddMode) {
        return prev.includes(uid) ? prev.filter((u) => u !== uid) : [...prev, uid]
      }
      return [uid]
    })
  }

  const togglePinnedThread = (threadId: string) => {
    setPinnedThreadIds((prev) => {
      const next = { ...prev }
      if (next[threadId]) delete next[threadId]
      else next[threadId] = true
      writeThreadFlagMap(CHAT_PINNED_THREADS_KEY, next)
      return next
    })
  }

  const toggleMutedThread = (threadId: string) => {
    setMutedThreadIds((prev) => {
      const next = { ...prev }
      if (next[threadId]) delete next[threadId]
      else next[threadId] = true
      writeThreadFlagMap(CHAT_MUTED_THREADS_KEY, next)
      return next
    })
  }

  const markThreadSeen = (threadId: string) => {
    const threadStamp = unreadStampByThread[threadId] || Date.now()
    setSeenUnreadStampByThread((prev) => {
      if ((prev[threadId] || 0) >= threadStamp) return prev
      return { ...prev, [threadId]: threadStamp }
    })
  }

  const hasUnreadForThread = (threadId: string) => {
    if (mutedThreadIds[threadId]) return false
    const latestUnreadStamp = unreadStampByThread[threadId] || 0
    const seenStamp = seenUnreadStampByThread[threadId] || 0
    return latestUnreadStamp > 0 && latestUnreadStamp > seenStamp && activeThreadId !== threadId
  }

  const orderedMembers = useMemo(() => {
    return [...approvedMembers].sort((a, b) => {
      const aThreadId = chatUser?.uid ? buildThreadId([chatUser.uid, a.uid]) : ''
      const bThreadId = chatUser?.uid ? buildThreadId([chatUser.uid, b.uid]) : ''
      const aPinned = aThreadId && pinnedThreadIds[aThreadId] ? 1 : 0
      const bPinned = bThreadId && pinnedThreadIds[bThreadId] ? 1 : 0
      if (aPinned !== bPinned) return bPinned - aPinned
      const aLabel = (a.displayName || a.email || a.uid).toLowerCase()
      const bLabel = (b.displayName || b.email || b.uid).toLowerCase()
      return aLabel.localeCompare(bLabel)
    })
  }, [approvedMembers, chatUser?.uid, pinnedThreadIds])

  const filteredMessages = useMemo(() => {
    const q = searchText.trim().toLowerCase()
    return messages.filter((item) => {
      if (senderFilterUid !== 'all' && item.senderUid !== senderFilterUid) return false
      if (priorityFilter !== 'all' && item.priority !== priorityFilter) return false
      if (filterHasImage && !item.imageUrl) return false
      if (filterHasLink && !item.targetPath) return false
      if (q) {
        const haystack = `${item.text || ''} ${item.senderName || ''}`.toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [messages, searchText, senderFilterUid, priorityFilter, filterHasImage, filterHasLink])

  const messageById = useMemo(
    () => Object.fromEntries(messages.map((msg) => [msg.id, msg] as const)),
    [messages],
  )

  useEffect(() => {
    markThreadSeen(activeThreadId)
  }, [activeThreadId])

  const handleSend = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalized = draft.trim()
    if ((!normalized && pendingImages.length === 0) || sending || isUploadingImage) return
    setSendError('')

    const uploadedImageUrls: string[] = []
    if (pendingImages.length > 0 && chatUser?.uid) {
      setIsUploadingImage(true)
      setUploadProgress({ current: 0, total: pendingImages.length })
      try {
        for (let idx = 0; idx < pendingImages.length; idx += 1) {
          const image = pendingImages[idx]
          setUploadProgress({ current: idx + 1, total: pendingImages.length })
          const ext = (image.file.type.split('/')[1] || 'png').toLowerCase().replace(/[^a-z0-9]/g, '')
          const path = `workhub_chat_images/${chatUser.uid}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
          const storageRef = ref(storage, path)
          await uploadBytes(storageRef, image.file)
          const imageUrl = await getDownloadURL(storageRef)
          uploadedImageUrls.push(imageUrl)
        }
      } catch {
        setSendError('Image upload failed.')
        setIsUploadingImage(false)
        setUploadProgress({ current: 0, total: 0 })
        return
      } finally {
        setIsUploadingImage(false)
        setUploadProgress({ current: 0, total: 0 })
      }
    }

    const messageOptions = {
      recipientUids: selectedRecipientUids.length > 0 ? selectedRecipientUids : undefined,
      priority: selectedPriority,
      replyToActivityId: replyingToMessageId || undefined,
    }
    let sent = true
    if (uploadedImageUrls.length === 0) {
      sent = await sendMessage(normalized, messageOptions)
    } else {
      for (let idx = 0; idx < uploadedImageUrls.length; idx += 1) {
        const ok = await sendMessage(idx === 0 ? normalized : '', { ...messageOptions, imageUrl: uploadedImageUrls[idx] })
        if (!ok) {
          sent = false
          break
        }
      }
    }
    if (!sent) {
      setSendError('Could not send the message right now.')
      return
    }
    stickToBottomRef.current = true
    setDraft('')
    setMentionQuery('')
    setSelectedPriority('normal')
    setReplyingToMessageId('')
    setAttachmentInfo('')
    pendingImages.forEach((image) => URL.revokeObjectURL(image.previewUrl))
    setPendingImages([])
  }

  const handleTextareaKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      event.currentTarget.form?.requestSubmit()
    }
  }

  const handleTextareaChange = (value: string) => {
    setDraft(value)
    const cursor = inputRef.current?.selectionStart ?? value.length
    setMentionQuery(extractMentionQuery(value, cursor))
  }

  const handleSelectMention = (member: { displayName: string; email: string }) => {
    const mentionKey = (member.displayName || member.email.split('@')[0] || '').trim().replace(/\s+/g, '_')
    const cursor = inputRef.current?.selectionStart ?? draft.length
    const next = insertMention(draft, cursor, mentionKey)
    setDraft(next)
    setMentionQuery('')
    window.setTimeout(() => inputRef.current?.focus(), 0)
  }

  const stagePendingImages = async (files: File[], source: 'picker' | 'clipboard' = 'picker') => {
    if (!files.length) return
    setSendError('')
    const images = files.filter((file) => file.type.startsWith('image/'))
    if (!images.length) return
    const signatures = await Promise.all(images.map((file) => buildFileSignature(file)))
    let ignoredDuplicates = 0
    setPendingImages((prev) => {
      const existing = new Set(prev.map((item) => item.signature))
      const next = [...prev]
      let added = 0

      images.forEach((file, index) => {
        const signature = signatures[index]
        if (!signature || existing.has(signature)) {
          ignoredDuplicates += 1
          return
        }
        existing.add(signature)
        added += 1
        const rawName = (file.name || '').trim()
        const displayName = source === 'clipboard' || !rawName || looksLikeGenericPastedName(rawName)
          ? buildClipboardDisplayName(file, added)
          : rawName
        next.push({
          id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
          file,
          previewUrl: URL.createObjectURL(file),
          signature,
          displayName,
        })
      })

      return next
    })
    if (ignoredDuplicates > 0) {
      setAttachmentInfo(ignoredDuplicates === 1 ? 'Image already attached.' : `${ignoredDuplicates} images were already attached.`)
    } else {
      setAttachmentInfo('')
    }
  }

  const handlePaste = async (event: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = Array.from(event.clipboardData?.items || [])
    const pastedImages = items
      .filter((item) => item.type.startsWith('image/'))
      .map((item) => item.getAsFile())
      .filter((file): file is File => !!file)
    if (!pastedImages.length) return

    event.preventDefault()
    await stagePendingImages(pastedImages, 'clipboard')
  }

  const handlePickImage = () => {
    fileInputRef.current?.click()
  }

  const handleImageFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    event.currentTarget.value = ''
    if (!files.length) return
    await stagePendingImages(files, 'picker')
  }

  const openImagePreview = (url: string, alt: string) => {
    setPreviewImageUrl(url)
    setPreviewImageAlt(alt)
  }

  const handleToggleVoiceInput = () => {
    if (isRecordingVoice) {
      speechRecognitionRef.current?.stop?.()
      setIsRecordingVoice(false)
      return
    }

    const ctor = (window as Window & { SpeechRecognition?: any; webkitSpeechRecognition?: any }).SpeechRecognition
      || (window as Window & { SpeechRecognition?: any; webkitSpeechRecognition?: any }).webkitSpeechRecognition

    if (!ctor) {
      setSendError('Voice input is not supported in this browser.')
      return
    }

    setSendError('')
    const recognition = new ctor()
    voiceBaseDraftRef.current = draft.trim()
    recognition.lang = 'en-US'
    recognition.interimResults = true
    recognition.continuous = true
    recognition.maxAlternatives = 1
    recognition.onresult = (event: any) => {
      const segments: string[] = []
      for (let i = 0; i < (event.results?.length || 0); i += 1) {
        const result = event.results[i]
        const transcript = (result[0]?.transcript || '').trim()
        if (!transcript) continue
        segments.push(transcript)
      }
      const recognized = segments.join(' ').trim()
      const base = voiceBaseDraftRef.current
      const nextDraft = recognized
        ? `${base}${base ? ' ' : ''}${recognized}`
        : base
      setDraft(nextDraft)
      setMentionQuery('')
    }
    recognition.onerror = () => {
      setSendError('Could not start voice input.')
      setIsRecordingVoice(false)
    }
    recognition.onend = () => {
      setIsRecordingVoice(false)
    }

    speechRecognitionRef.current = recognition
    try {
      recognition.start()
      setIsRecordingVoice(true)
    } catch {
      setSendError('Could not start voice input.')
      setIsRecordingVoice(false)
    }
  }

  const handleStartEdit = (item: TeamChatMessage) => {
    setEditingMessageId(item.id)
    setEditingDraft(item.text)
  }

  const handleSaveEdit = async () => {
    if (!editingMessageId || !editingDraft.trim()) return
    const ok = await editMessage(editingMessageId, editingDraft)
    if (ok) {
      setEditingMessageId('')
      setEditingDraft('')
    }
  }

  const handleRemind = async (item: TeamChatMessage) => {
    await remindMessage(item)
  }

  const removePendingImage = (id: string) => {
    setPendingImages((prev) => {
      const target = prev.find((image) => image.id === id)
      if (target) URL.revokeObjectURL(target.previewUrl)
      return prev.filter((image) => image.id !== id)
    })
  }

  const clearPendingImages = () => {
    setAttachmentInfo('')
    setPendingImages((prev) => {
      prev.forEach((image) => URL.revokeObjectURL(image.previewUrl))
      return []
    })
  }

  const handleDeleteMessage = async (item: TeamChatMessage) => {
    await deleteMessage(item.id)
    setPendingDeleteMessageId('')
  }

  const handleConfirmReceipt = async (item: TeamChatMessage) => {
    await confirmMessageReceipt(item.id)
  }

  const jumpToMessage = (messageId: string) => {
    if (!messageId) return
    const el = messageElementRefs.current[messageId]
    if (!el) return
    stickToBottomRef.current = false
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setHighlightedMessageId(messageId)
    window.setTimeout(() => {
      setHighlightedMessageId((current) => (current === messageId ? '' : current))
    }, 2200)
  }

  const memberLabel = (uid: string) => {
    const m = approvedMembers.find((member) => member.uid === uid)
    return (m?.displayName || m?.email || uid).trim()
  }

  return (
    <section className="panel shell-messages-page">
      <header className="shell-messages-page-head">
        <h1>Messages</h1>
        <p>Send to the full team, a group, or just one person.</p>
      </header>

      {/* Recipient picker */}
      <div className="shell-chat-to-row">
        <span className="shell-chat-to-label">To:</span>
        <div className="shell-chat-to-chips">
          <button
            type="button"
            className={`shell-chat-to-chip${selectedRecipientUids.length === 0 ? ' is-active' : ''}${hasUnreadForThread(THREAD_EVERYONE) ? ' has-unread' : ''}`}
            onClick={() => {
              markThreadSeen(THREAD_EVERYONE)
              setSelectedRecipientUids([])
              setRecipientInitialized(true)
            }}
          >
            Everyone
          </button>
          <button
            type="button"
            className={`shell-chat-to-chip shell-chat-to-chip-mode${recipientAddMode ? ' is-active' : ''}`}
            onClick={() => setRecipientAddMode((value) => !value)}
            title="Toggle multi-recipient add mode"
          >
            {recipientAddMode ? 'Add mode on' : 'Add mode off'}
          </button>
          {orderedMembers.map((member) => {
            const isMe = member.uid === chatUser?.uid
            const label = isMe ? 'Me' : (member.displayName || member.email || member.uid).trim()
            const active = selectedRecipientUids.includes(member.uid)
            const memberThreadId = chatUser?.uid ? buildThreadId([chatUser.uid, member.uid]) : ''
            const showUnreadDot = !isMe && !!memberThreadId && hasUnreadForThread(memberThreadId)
            const showPinned = !!memberThreadId && !!pinnedThreadIds[memberThreadId]
            return (
              <button
                key={member.uid}
                type="button"
                title={isMe ? 'Send to yourself' : label}
                className={`shell-chat-to-chip${active ? ' is-active' : ''}${showUnreadDot ? ' has-unread' : ''}`}
                onClick={() => {
                  if (memberThreadId) markThreadSeen(memberThreadId)
                  setRecipientInitialized(true)
                  selectRecipient(member.uid)
                }}
              >
                {showPinned ? `📌 ${label}` : label}
              </button>
            )
          })}
        </div>
      </div>
      <div className="shell-chat-thread-controls">
        <button
          type="button"
          className={`shell-chat-thread-control${pinnedThreadIds[activeThreadId] ? ' is-active' : ''}`}
          onClick={() => togglePinnedThread(activeThreadId)}
        >
          {pinnedThreadIds[activeThreadId] ? 'Unpin thread' : 'Pin thread'}
        </button>
        <button
          type="button"
          className={`shell-chat-thread-control${mutedThreadIds[activeThreadId] ? ' is-active' : ''}`}
          onClick={() => toggleMutedThread(activeThreadId)}
        >
          {mutedThreadIds[activeThreadId] ? 'Unmute thread' : 'Mute thread'}
        </button>
      </div>
      <div className="shell-chat-filter-row">
        <input
          className="shell-chat-filter-input"
          value={searchText}
          onChange={(event) => setSearchText(event.target.value)}
          placeholder="Search messages"
        />
        <select
          className="shell-chat-filter-select"
          value={senderFilterUid}
          onChange={(event) => setSenderFilterUid(event.target.value)}
        >
          <option value="all">All senders</option>
          {orderedMembers.map((member) => (
            <option key={member.uid} value={member.uid}>{(member.displayName || member.email || member.uid).trim()}</option>
          ))}
        </select>
        <select
          className="shell-chat-filter-select"
          value={priorityFilter}
          onChange={(event) => setPriorityFilter(event.target.value as 'all' | 'normal' | 'high')}
        >
          <option value="all">All priorities</option>
          <option value="normal">Normal</option>
          <option value="high">High</option>
        </select>
        <label className="shell-chat-filter-toggle">
          <input type="checkbox" checked={filterHasImage} onChange={(event) => setFilterHasImage(event.target.checked)} /> Image
        </label>
        <label className="shell-chat-filter-toggle">
          <input type="checkbox" checked={filterHasLink} onChange={(event) => setFilterHasLink(event.target.checked)} /> Link
        </label>
      </div>

      <div className="shell-messages-page-thread" ref={threadListRef} onScroll={handleThreadScroll}>
        {filteredMessages.length === 0 ? (
          <div className="shell-chat-empty-thread">
            {messages.length === 0
              ? (selectedRecipientUids.length === 0
                ? 'No team messages yet. Send the first update.'
                : `Start a conversation with ${selectedRecipientUids
                    .map((uid) => {
                      const m = approvedMembers.find((member) => member.uid === uid)
                      return (m?.displayName || m?.email || uid).trim()
                    })
                    .join(', ')}.`)
              : 'No messages match the current filters.'}
          </div>
        ) : (
          filteredMessages.map((item) => {
            const mine = item.senderUid === chatUser?.uid
            const isDeleted = !!item.deletedAt
            const isEditing = editingMessageId === item.id
              const repliedMessage = item.replyToActivityId ? messageById[item.replyToActivityId] : undefined
              const myReaction = chatUser?.uid ? (item.reactionsByUid[chatUser.uid] || '') : ''
              const reactionCounts = Object.values(item.reactionsByUid).reduce<Record<string, number>>((acc, reaction) => {
                if (!reaction) return acc
                acc[reaction] = (acc[reaction] || 0) + 1
                return acc
              }, {})
              const isReadByAll = item.expectedRecipientUids.length > 0 && item.expectedRecipientUids.every((uid) => item.readByUids.includes(uid))
              const hasAnyReceipt = item.receivedByUids.some((uid) => item.expectedRecipientUids.includes(uid))
              const isDeliveryError = item.deliveryState === 'failed'
            return (
              <article
                key={item.id}
                className={`shell-chat-msg${mine ? ' is-mine' : ''}${isDeleted ? ' is-deleted' : ''}${highlightedMessageId === item.id ? ' is-linked-highlight' : ''}`}
                ref={(el) => {
                  messageElementRefs.current[item.id] = el
                }}
                onMouseEnter={() => setHoveredMessageId(item.id)}
                onMouseLeave={() => setHoveredMessageId('')}
              >
                <div className="shell-chat-msg-head">
                  <div className="shell-chat-msg-author">
                    {item.senderPhotoURL ? (
                      <img src={item.senderPhotoURL} alt={mine ? 'You' : item.senderName} className="shell-chat-msg-avatar" />
                    ) : (
                      <span className="shell-chat-msg-avatar-fallback">{(mine ? 'Y' : (item.senderName || 'T').slice(0, 1)).toUpperCase()}</span>
                    )}
                    <strong>{mine ? 'You' : item.senderName}</strong>
                  </div>
                  <small>{formatNotificationTime(item.createdAt)}</small>
                </div>

                {isEditing ? (
                  <div className="shell-chat-edit-wrap">
                    <textarea
                      className="shell-chat-edit-textarea"
                      rows={3}
                      value={editingDraft}
                      onChange={(event) => setEditingDraft(event.target.value)}
                    />
                    <div className="shell-chat-edit-actions">
                      <button type="button" onClick={handleSaveEdit}>Save</button>
                      <button type="button" onClick={() => setEditingMessageId('')}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    {isDeleted ? (
                      <p className="shell-chat-deleted-text">This message was deleted.</p>
                    ) : (
                      <>
                        {item.replyToActivityId && (
                          <div
                            className="shell-chat-reply-quote"
                            role="button"
                            tabIndex={0}
                            onClick={() => jumpToMessage(item.replyToActivityId || '')}
                            onKeyDown={(event) => {
                              if (event.key !== 'Enter' && event.key !== ' ') return
                              event.preventDefault()
                              jumpToMessage(item.replyToActivityId || '')
                            }}
                          >
                            <strong>
                              {repliedMessage
                                ? (repliedMessage.senderUid === chatUser?.uid ? 'You' : repliedMessage.senderName)
                                : 'Original message'}
                            </strong>
                            <span>
                              {repliedMessage
                                ? (repliedMessage.deletedAt
                                  ? 'This message was deleted.'
                                  : ((repliedMessage.text || '').trim() || (repliedMessage.imageUrl ? 'Image attachment' : 'Message unavailable')))
                                : 'Message unavailable'}
                            </span>
                          </div>
                        )}
                        {!!item.text && <p>{item.text}</p>}
                        {!!item.imageUrl && (
                          <img
                            src={item.imageUrl}
                            alt="Sent attachment"
                            className="shell-chat-msg-image"
                            onClick={() => openImagePreview(item.imageUrl || '', 'Sent attachment')}
                          />
                        )}
                        {item.priority === 'high' && <small className="shell-chat-priority-tag">High priority</small>}
                        {item.priority === 'high' && item.receivedByUids.length > 0 && (
                          <small className="shell-chat-receipt-tag">Receive confirmed</small>
                        )}
                        {mine && (
                          <span className="shell-chat-delivery-wrap">
                            <button
                              type="button"
                              className={`shell-chat-delivery-status shell-chat-delivery-btn${isReadByAll ? ' is-read' : ''}${isDeliveryError ? ' is-error' : ''}`}
                              onClick={() => setReceiptDetailsMessageId((current) => (current === item.id ? '' : item.id))}
                              title="View delivery details"
                            >
                              <span
                                className={`shell-chat-delivery-tick${hasAnyReceipt ? ' is-active' : ''}`}
                              >
                                ✓
                              </span>
                              <span
                                className={`shell-chat-delivery-tick${isReadByAll ? ' is-active' : ''}`}
                              >
                                ✓
                              </span>
                            </button>
                            {receiptDetailsMessageId === item.id && item.expectedRecipientUids.length > 0 && (
                              <div className="shell-chat-delivery-popover">
                                <strong>Delivery details</strong>
                                {item.expectedRecipientUids.map((uid) => {
                                  const received = item.receivedByUids.includes(uid)
                                  const read = item.readByUids.includes(uid)
                                  return (
                                    <div key={`${item.id}_${uid}`} className="shell-chat-delivery-row">
                                      <span className="shell-chat-delivery-user">{memberLabel(uid)}</span>
                                      <span className={`shell-chat-delivery-state${read ? ' is-read' : received ? ' is-received' : ''}`}>
                                        {read ? 'Read' : received ? 'Received' : 'Pending'}
                                      </span>
                                    </div>
                                  )
                                })}
                              </div>
                            )}
                          </span>
                        )}
                        {!mine && item.priority === 'high' && !item.receivedByUids.includes(chatUser?.uid || '') && (
                          <button type="button" className="shell-chat-receipt-btn" onClick={() => void handleConfirmReceipt(item)}>
                            Confirm received
                          </button>
                        )}
                        {!!item.editedAt && <small className="shell-chat-edited-indicator">(edited)</small>}
                        {!isDeleted && (
                          <div className="shell-chat-reactions-wrap">
                            <button
                              type="button"
                              className={`shell-chat-reaction-btn${myReaction ? ' is-active' : ''}`}
                              onClick={() => setReactionPickerMessageId((current) => (current === item.id ? '' : item.id))}
                            >
                              {myReaction || '😀'}
                            </button>
                            {reactionPickerMessageId === item.id && (
                              <div className="shell-chat-reaction-picker">
                                {CHAT_REACTIONS.map((reaction) => (
                                  <button
                                    key={reaction}
                                    type="button"
                                    className={`shell-chat-reaction-option${myReaction === reaction ? ' is-active' : ''}`}
                                    onClick={() => {
                                      if (myReaction === reaction) {
                                        void clearMessageReaction(item.id)
                                      } else {
                                        void setMessageReaction(item.id, reaction)
                                      }
                                      setReactionPickerMessageId('')
                                    }}
                                  >
                                    {reaction}
                                  </button>
                                ))}
                              </div>
                            )}
                            {Object.entries(reactionCounts).length > 0 && (
                              <div className="shell-chat-reaction-summary">
                                {Object.entries(reactionCounts).map(([reaction, count]) => (
                                  <span key={`${item.id}_${reaction}`} className="shell-chat-reaction-chip">{reaction} {count}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </>
                )}
                {!!item.targetPath && item.targetPath !== '/messages' && (
                  <button
                    type="button"
                    className="shell-chat-msg-link"
                    onClick={() => navigate(withChatLinkedMarker(item.targetPath || '/messages'))}
                  >
                    Open linked item
                  </button>
                )}
                {!isDeleted && !isEditing && (
                  <button
                    type="button"
                    className="shell-chat-msg-link"
                    onClick={() => {
                      setReplyingToMessageId(item.id)
                      window.setTimeout(() => inputRef.current?.focus(), 0)
                    }}
                  >
                    Reply
                  </button>
                )}

                {mine && hoveredMessageId === item.id && !isDeleted && !isEditing && (
                  <div className="shell-chat-msg-actions">
                    {pendingDeleteMessageId === item.id ? (
                      <>
                        <button type="button" className="shell-chat-msg-action shell-chat-msg-action-confirm" title="Confirm delete" onClick={() => void handleDeleteMessage(item)}>OK</button>
                        <button type="button" className="shell-chat-msg-action" title="Cancel delete" onClick={() => setPendingDeleteMessageId('')}>No</button>
                      </>
                    ) : (
                      <>
                        <button type="button" className="shell-chat-msg-action" title="Remind recipients" onClick={() => void handleRemind(item)}>
                          <svg className="shell-chat-msg-action-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                            <circle cx="12" cy="13" r="7" stroke="currentColor" strokeWidth="2" />
                            <path d="M12 9.5V13L14.2 14.6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M8.4 4.5L6.8 6.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            <path d="M15.6 4.5L17.2 6.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                        </button>
                        <button type="button" className="shell-chat-msg-action" title="Edit message" onClick={() => handleStartEdit(item)}>
                          <svg className="shell-chat-msg-action-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                            <path d="M5 19L8.7 18.2L18 8.9L15.1 6L5.8 15.3L5 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M13.9 7.1L16.8 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                        </button>
                        <button type="button" className="shell-chat-msg-action shell-chat-msg-action-danger" title="Delete message" onClick={() => setPendingDeleteMessageId(item.id)}>
                          <svg className="shell-chat-msg-action-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                            <path d="M4.8 7.2H19.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            <path d="M9.2 4.8H14.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            <path d="M7.2 7.2L8 19.2H16L16.8 7.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M10 10.2V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            <path d="M14 10.2V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </article>
            )
          })
        )}

        {typingIndicators.length > 0 && (
          <div className="shell-chat-typing-dock" role="status" aria-live="polite">
            <div className="shell-chat-typing-bubble" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <span className="shell-chat-typing-label">
              {typingIndicators.length === 1
                ? `${typingIndicators[0].name} is typing...`
                : `${typingIndicators[0].name} and ${typingIndicators.length - 1} more are typing...`}
            </span>
          </div>
        )}

        <div ref={threadEndRef} />
      </div>

      <footer className="shell-chat-dock-footer is-composer">
        {replyingToMessageId && (
          <div className="shell-chat-replying-bar">
            <div className="shell-chat-replying-content">
              <strong>Replying to {messageById[replyingToMessageId]?.senderUid === chatUser?.uid ? 'yourself' : (messageById[replyingToMessageId]?.senderName || 'message')}</strong>
              <span>
                {messageById[replyingToMessageId]
                  ? ((messageById[replyingToMessageId].text || '').trim() || (messageById[replyingToMessageId].imageUrl ? 'Image attachment' : 'Message'))
                  : 'Message unavailable'}
              </span>
            </div>
            <button type="button" className="shell-chat-msg-action" onClick={() => setReplyingToMessageId('')} aria-label="Cancel reply">x</button>
          </div>
        )}
        <form className="shell-chat-composer" onSubmit={handleSend}>
          <button
            type="button"
            className="shell-chat-aux-btn"
            onClick={handlePickImage}
            aria-label="Attach image"
            title="Attach image"
            disabled={isUploadingImage || sending}
          >
            <svg className="shell-chat-aux-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <rect x="3.5" y="4.5" width="17" height="15" rx="3.5" stroke="currentColor" strokeWidth="2" />
              <circle cx="9" cy="10" r="1.5" fill="currentColor" />
              <path d="M6.8 16.1L10.3 12.6L12.9 15.2L15.2 13L17.3 16.1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <textarea
            ref={inputRef}
            value={draft}
            rows={1}
            onChange={(event) => handleTextareaChange(event.target.value)}
            onKeyDown={handleTextareaKeyDown}
            onBlur={() => {
              void sendTyping(false, selectedRecipientUids.length > 0 ? selectedRecipientUids : undefined)
            }}
            onPaste={handlePaste}
            placeholder="Type a message... (Shift+Enter for newline)"
            aria-label="Type a message"
            className="shell-chat-textarea"
          />
          <button
            type="button"
            className={`shell-chat-aux-btn${isRecordingVoice ? ' is-active' : ''}`}
            onClick={handleToggleVoiceInput}
            aria-label={isRecordingVoice ? 'Stop voice input' : 'Start voice input'}
            title={isRecordingVoice ? 'Stop voice input' : 'Start voice input'}
            disabled={isUploadingImage || sending}
          >
            <svg className="shell-chat-aux-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <rect x="9" y="3.5" width="6" height="10" rx="3" stroke="currentColor" strokeWidth="2" />
              <path d="M6.5 10.5V11.2C6.5 14.237 8.963 16.7 12 16.7C15.037 16.7 17.5 14.237 17.5 11.2V10.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M12 16.7V20.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <button type="submit" className="shell-chat-send-circle" disabled={(sending || (!draft.trim() && pendingImages.length === 0) || isUploadingImage)} aria-label="Send">
            <svg viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M10 3L10 17M10 3L5 8M10 3L15 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="shell-chat-hidden-file-input"
            onChange={handleImageFileChange}
          />
        </form>

        <div className="shell-chat-priority-row" role="group" aria-label="Message priority">
          <span className="shell-chat-priority-label">Priority:</span>
          <button
            type="button"
            className={`shell-chat-priority-btn${selectedPriority === 'normal' ? ' is-active' : ''}`}
            onClick={() => setSelectedPriority('normal')}
          >
            Normal
          </button>
          <button
            type="button"
            className={`shell-chat-priority-btn shell-chat-priority-btn-high${selectedPriority === 'high' ? ' is-active' : ''}`}
            onClick={() => setSelectedPriority('high')}
          >
            Very high
          </button>
        </div>

        {pendingImages.length > 0 && (
          <div className="shell-chat-attachment-strip" role="list" aria-label="Attached images">
            {pendingImages.map((image, index) => (
              <div key={image.id} className="shell-chat-inline-attachment" title={image.displayName || `Image ${index + 1}`}>
                <img src={image.previewUrl} alt="Attached image" onClick={() => openImagePreview(image.previewUrl, image.displayName || 'Attached image')} />
                <span>{image.displayName || `Image ${index + 1}`}</span>
                <button type="button" onClick={() => removePendingImage(image.id)} aria-label="Remove attached image">x</button>
              </div>
            ))}
          </div>
        )}

        {(pendingImages.length > 0 || isUploadingImage) && (
          <div className="shell-chat-upload-indicator" role="status" aria-live="polite">
            <span className={`shell-chat-upload-dot${isUploadingImage ? ' is-busy' : ''}`} aria-hidden="true" />
            <span>
              {isUploadingImage
                ? `Uploading ${uploadProgress.current}/${uploadProgress.total || pendingImages.length}`
                : `${pendingImages.length} image${pendingImages.length === 1 ? '' : 's'} attached (will upload on Send)`}
            </span>
            {!isUploadingImage && pendingImages.length > 0 && (
              <button
                type="button"
                className="shell-chat-upload-clear"
                onClick={clearPendingImages}
              >
                Remove all
              </button>
            )}
          </div>
        )}

        {mentionOptions.length > 0 && (
          <div className="shell-chat-mention-list">
            {mentionOptions.map((member) => (
              <button
                key={member.uid}
                type="button"
                onClick={() => handleSelectMention({ displayName: member.displayName || '', email: member.email || '' })}
              >
                @{(member.displayName || member.email?.split('@')[0] || member.uid).trim()}
              </button>
            ))}
          </div>
        )}

        {sendError && <p className="shell-chat-send-error">{sendError}</p>}
        {attachmentInfo && <p className="shell-chat-attachment-note">{attachmentInfo}</p>}

        {previewImageUrl && (
          <div className="shell-chat-image-preview-backdrop" role="dialog" aria-label="Image preview" onClick={() => setPreviewImageUrl('')}>
            <button
              type="button"
              className="shell-chat-image-preview-close"
              aria-label="Close image preview"
              onClick={() => setPreviewImageUrl('')}
            >
              x
            </button>
            <img
              src={previewImageUrl}
              alt={previewImageAlt || 'Image preview'}
              className="shell-chat-image-preview-full"
              onClick={(event) => event.stopPropagation()}
            />
          </div>
        )}
      </footer>
    </section>
  )
}
