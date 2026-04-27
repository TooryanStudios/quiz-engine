import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ToorGenFlowCanvas,
  type ToorGenAspectRatio,
  type ToorGenGenerationMode,
  type ToorGenGenerationStatus,
  type ToorGenGenerationRequest,
  type ToorGenModel,
  type ToorGenStoryContext,
} from '../../components/toorgen/ToorGenFlowCanvas'
import '../ToorGenPage.css'

type GenerationStatus = 'IDLE' | 'SUBMITTING' | 'IN_PROGRESS' | 'SUCCESS' | 'FAILED'

const SEEDANCE_PROMPT_CHARACTER_LIMIT = 2000

type StatusPayloadData = {
  task_id?: string
  status?: string
  video_url?: string
  response?: string[] | null
  error?: string
  error_message?: string | null
  consumed_credits?: number
}

type HistoryEntry = {
  taskId: string
  prompt: string
  sourcePrompt?: string
  videoUrl: string
  createdAt: number
  collectionId?: string
  collectionTitle?: string
  generationNodeId?: string
  storyContext?: ToorGenStoryContext
  mode?: ToorGenGenerationMode
  model?: ToorGenModel
  duration?: number
  aspectRatio?: string
  consumedCredits?: number
  generationTimeMs?: number
  requestedModel?: string
  effectiveModel?: string
  fallbackAttempted?: boolean
  fallbackReason?: string
  referenceImages?: string[]
  referenceVideos?: string[]
  qualityPreset?: '540p' | '720p' | '1080p'
  includeAudio?: boolean
  submittedAt?: number
  firstStatusAt?: number
  completedAt?: number
}

type StatusPayload = {
  ok?: boolean
  code?: number
  message?: string
  status?: string
  taskId?: string
  task_id?: string
  videoUrl?: string
  video_url?: string
  error?: string
  consumed_credits?: number
  requested_model?: string
  effective_model?: string
  fallback_model?: string
  fallback_attempted?: boolean
  fallback_reason?: string
  model_proof?: {
    requested_model?: string
    effective_model?: string
    reported_model?: string
    fallback_attempted?: boolean
    fallback_reason?: string
  }
  data?: StatusPayloadData
}

type QueueItem = {
  id: string
  nodeId: string
  taskId: string
  prompt: string
  sourcePrompt?: string
  collectionId?: string
  collectionTitle?: string
  storyContext?: ToorGenStoryContext
  mode: ToorGenGenerationMode
  model?: ToorGenModel
  requestedModel?: string
  effectiveModel?: string
  fallbackAttempted?: boolean
  fallbackReason?: string
  duration: number
  aspectRatio: string
  status: GenerationStatus
  createdAt: number
  updatedAt: number
  errorMessage?: string
  referenceImages?: string[]
  referenceVideos?: string[]
  qualityPreset?: '540p' | '720p' | '1080p'
  includeAudio?: boolean
  submittedAt?: number
  firstStatusAt?: number
}

type NodeTerminalState = {
  status: GenerationStatus
  taskId: string
  errorMessage?: string
}

const HISTORY_KEY = 'toorgen_history'
const QUEUE_KEY = 'toorgen_queue_v1'
const MODEL_KEY = 'toorgen_seedance_model_v1'
const GENERATION_SEQUENCE_KEY = 'toorgen_generation_sequence_v1'
const VIEW_MODE_KEY = 'toorgen_shot_view_mode_v1'
const AUDIO_PREF_KEY = 'toorgen_audio_pref_v1'
const QUALITY_PREF_KEY = 'toorgen_quality_pref_v1'
const STUDIO_MODE_KEY = 'toorgen_studio_mode_v1'
const REFERENCE_IMAGE_URL_KEY = 'toorgen_reference_image_url_v1'
const REFERENCE_IMAGE_UPLOADS_KEY = 'toorgen_reference_image_uploads_v1'
const REFERENCE_VIDEO_URL_KEY = 'toorgen_reference_video_url_v1'
const MAX_GENERATION_REQUEST_SIZE = 8_000_000
const HISTORY_LIMIT = 500
const SLOW_API_WARNING_MS = 3 * 60 * 1000
const STALE_GENERATION_TIMEOUT_MS = 12 * 60 * 1000

const IS_LOCAL_DEV = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)
const CHATBOT_BASE = IS_LOCAL_DEV
  ? ((import.meta.env.VITE_CHATBOT_LOCAL_URL as string | undefined) || '')
  : ''

const buildApiUrl = (path: string) => {
  const base = (CHATBOT_BASE || '').trim().replace(/\/$/, '')
  return base ? `${base}${path}` : path
}

const formatNetworkError = (error: unknown): string => {
  if (error instanceof TypeError) {
    return IS_LOCAL_DEV
      ? 'Seedance API is unreachable. If you use a separate local API server, set VITE_CHATBOT_LOCAL_URL and start that server. Otherwise this app will call /api/seedance on the current origin.'
      : 'Seedance API is unreachable right now. Please try again.'
  }
  return error instanceof Error ? error.message : 'Generation failed.'
}

const createQueueId = () => `queue-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

const normalizeHistoryModel = (entry: HistoryEntry): HistoryEntry => {
  const fallbackModel: ToorGenModel = 'seedance-2.0-fast'
  const requestedModel = (entry.requestedModel || entry.model || fallbackModel) as string
  const effectiveModel = (entry.effectiveModel || requestedModel || fallbackModel) as string
  return {
    ...entry,
    model: (entry.model || requestedModel || fallbackModel) as ToorGenModel,
    requestedModel,
    effectiveModel,
  }
}

const fileToDataUrl = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = () => {
    if (typeof reader.result === 'string') resolve(reader.result)
    else reject(new Error('Unable to read image file.'))
  }
  reader.onerror = () => reject(new Error('Unable to read image file.'))
  reader.readAsDataURL(file)
})

const isHostedUrl = (value: string): boolean => /^https?:\/\//i.test(value) || value.startsWith('/api/seedance/reference-image/')

const loadHistory = (): HistoryEntry[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]') as HistoryEntry[]
    return Array.isArray(parsed) ? parsed.map(normalizeHistoryModel) : []
  } catch {
    return []
  }
}

const loadReferenceUploads = (): string[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(REFERENCE_IMAGE_UPLOADS_KEY) || '[]') as string[]
    return Array.isArray(parsed) ? parsed.filter((value) => typeof value === 'string').slice(0, 8) : []
  } catch {
    return []
  }
}

const saveToHistory = (entry: HistoryEntry) => {
  const existing = loadHistory().filter((e) => e.taskId !== entry.taskId)
  localStorage.setItem(HISTORY_KEY, JSON.stringify([entry, ...existing].slice(0, HISTORY_LIMIT)))
}

const loadQueue = (): QueueItem[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]') as QueueItem[]
    return Array.isArray(parsed)
      ? parsed
        .filter((item) => item && typeof item.id === 'string' && typeof item.status === 'string')
        .slice(0, 100)
      : []
  } catch {
    return []
  }
}

const saveQueue = (items: QueueItem[]) => {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(items.slice(0, 100)))
  } catch {
    // Ignore localStorage quota/unavailable failures.
  }
}

const loadGenerationSequence = (): number => {
  try {
    const raw = Number(localStorage.getItem(GENERATION_SEQUENCE_KEY) || '0')
    return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 0
  } catch {
    return 0
  }
}

const saveGenerationSequence = (value: number) => {
  try {
    localStorage.setItem(GENERATION_SEQUENCE_KEY, String(value))
  } catch {
    // Ignore localStorage failures.
  }
}

const createGenerationName = (collectionTitle: string, sequence: number): string => {
  const baseTitle = collectionTitle.trim() || 'Generation'
  return `${baseTitle} • Run ${sequence.toString().padStart(4, '0')}`
}

const readJsonSafely = async (response: Response): Promise<StatusPayload> => {
  const raw = await response.text()
  if (!raw.trim()) return {}
  try {
    return JSON.parse(raw) as StatusPayload
  } catch {
    if (!response.ok) throw new Error(`Request failed with status ${response.status}.`)
    throw new Error('Server returned a non-JSON response.')
  }
}

const pickTaskId = (payload: StatusPayload): string => payload?.data?.task_id || payload?.taskId || payload?.task_id || ''

const pickVideoUrl = (payload: StatusPayload): string => {
  const data = payload?.data
  if (data) {
    if (Array.isArray(data.response) && data.response.length > 0) return data.response[0]
    if (data.video_url) return data.video_url
  }
  return payload?.videoUrl || payload?.video_url || ''
}

const pickError = (payload: StatusPayload): string => {
  const data = payload?.data
  if (data) {
    if (data.error_message) return data.error_message
    if (data.error) return data.error
  }
  return payload?.error || payload?.message || ''
}

const pickStatus = (payload: StatusPayload): string => payload?.data?.status || payload?.status || ''

const pickConsumedCredits = (payload: StatusPayload): number | null => {
  const value = payload?.data?.consumed_credits ?? payload?.consumed_credits
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

const pickRequestedModel = (payload: StatusPayload): string => {
  const value = payload?.requested_model || payload?.model_proof?.requested_model
  return typeof value === 'string' ? value.trim() : ''
}

const pickEffectiveModel = (payload: StatusPayload): string => {
  const value = payload?.effective_model || payload?.model_proof?.effective_model || payload?.fallback_model
  return typeof value === 'string' ? value.trim() : ''
}

const pickFallbackAttempted = (payload: StatusPayload): boolean => payload?.fallback_attempted === true || payload?.model_proof?.fallback_attempted === true

const pickFallbackReason = (payload: StatusPayload): string => {
  const value = payload?.fallback_reason || payload?.model_proof?.fallback_reason
  return typeof value === 'string' ? value.trim() : ''
}

const formatElapsedTime = (milliseconds: number): string => {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes > 0) return `${minutes}m ${seconds.toString().padStart(2, '0')}s`
  return `${seconds}s`
}

const getAspectRatioClass = (ratio?: string): string => {
  const value = String(ratio || '').trim().replace(/\s+/g, '')
  if (value === '9:16') return 'tg-thumb-ratio-9-16'
  if (value === '4:3') return 'tg-thumb-ratio-4-3'
  if (value === '3:4') return 'tg-thumb-ratio-3-4'
  return 'tg-thumb-ratio-16-9'
}

const buildModelProofBadge = (item: {
  model?: ToorGenModel
  requestedModel?: string
  effectiveModel?: string
  fallbackAttempted?: boolean
}): { text: string; tone: 'verified' | 'requested' | 'fallback' | 'unknown' } => {
  const requested = item.requestedModel || item.model || ''
  const effective = item.effectiveModel || ''

  if (effective && requested && effective !== requested) {
    if (item.fallbackAttempted) return { text: `Fallback ${effective}`, tone: 'fallback' }
    return { text: `Used ${effective}`, tone: 'verified' }
  }
  if (effective) return { text: `Used ${effective}`, tone: 'verified' }
  if (requested) return { text: `Requested ${requested}`, tone: 'requested' }
  return { text: 'Model unknown', tone: 'unknown' }
}

const normalizeStatus = (status?: string): GenerationStatus => {
  const normalized = (status || '').toUpperCase()
  if (!normalized) return 'IDLE'
  if (normalized.includes('SUCCESS')) return 'SUCCESS'
  if (normalized.includes('FAIL')) return 'FAILED'
  if (normalized.includes('PROGRESS') || normalized.includes('PENDING') || normalized.includes('QUEUE')) return 'IN_PROGRESS'
  return 'IN_PROGRESS'
}

const isActiveQueueStatus = (status: GenerationStatus) => status === 'SUBMITTING' || status === 'IN_PROGRESS'

const isQueueItemStale = (item: QueueItem, nowMs: number): boolean => {
  const startedAt = item.submittedAt || item.createdAt
  return nowMs - startedAt >= STALE_GENERATION_TIMEOUT_MS
}

export default function ToorGenPage() {
  const [prompt, setPrompt] = useState('')
  const [duration, setDuration] = useState<number>(5)
  const [aspectRatio, setAspectRatio] = useState<ToorGenAspectRatio>('16:9')
  const [mode, setMode] = useState<ToorGenGenerationMode>('text-to-video')
  const [seedanceModel, setSeedanceModel] = useState<ToorGenModel>(() => {
    try {
      const saved = localStorage.getItem(MODEL_KEY)
      return saved === 'seedance-2.0' ? 'seedance-2.0' : 'seedance-2.0-fast'
    } catch {
      return 'seedance-2.0-fast'
    }
  })

  const [taskId, setTaskId] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [selectedVideoUrl, setSelectedVideoUrl] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [consumedCredits, setConsumedCredits] = useState<number | null>(null)
  const [activeSidebarView, setActiveSidebarView] = useState<'generations' | 'folders'>('generations')
  const [studioMode, setStudioMode] = useState<'simple' | 'flow'>(() => {
    try {
      return localStorage.getItem(STUDIO_MODE_KEY) === 'flow' ? 'flow' : 'simple'
    } catch {
      return 'simple'
    }
  })
  const [shotViewMode, setShotViewMode] = useState<'shot-list' | 'shot-grid' | 'shot-review'>(() => {
    try {
      const saved = localStorage.getItem(VIEW_MODE_KEY)
      return saved === 'shot-list' || saved === 'shot-review' ? saved : 'shot-grid'
    } catch {
      return 'shot-grid'
    }
  })
  const [galleryQuery, setGalleryQuery] = useState('')
  const [gallerySort, setGallerySort] = useState<'newest' | 'oldest' | 'duration'>('newest')
  const [galleryModelFilter, setGalleryModelFilter] = useState<'all' | 'seedance-2.0' | 'seedance-2.0-fast'>('all')
  const [referenceImageUrl, setReferenceImageUrl] = useState<string>(() => {
    try {
      return localStorage.getItem(REFERENCE_IMAGE_URL_KEY) || ''
    } catch {
      return ''
    }
  })
  const [referenceImageThumbs, setReferenceImageThumbs] = useState<string[]>(() => loadReferenceUploads())
  const [referenceVideoUrl, setReferenceVideoUrl] = useState<string>(() => {
    try {
      return localStorage.getItem(REFERENCE_VIDEO_URL_KEY) || ''
    } catch {
      return ''
    }
  })
  const [qualityPreset, setQualityPreset] = useState<'540p' | '720p' | '1080p'>(() => {
    try {
      const saved = localStorage.getItem(QUALITY_PREF_KEY)
      return saved === '540p' || saved === '1080p' ? saved : '720p'
    } catch {
      return '720p'
    }
  })
  const [includeAudio, setIncludeAudio] = useState<boolean>(() => {
    try {
      return localStorage.getItem(AUDIO_PREF_KEY) !== '0'
    } catch {
      return true
    }
  })

  const [resumeTaskId, setResumeTaskId] = useState('')
  const [history, setHistory] = useState<HistoryEntry[]>(() => loadHistory())
  const [queueItems, setQueueItems] = useState<QueueItem[]>(() => loadQueue())
  const [queueNowMs, setQueueNowMs] = useState(() => Date.now())
  const [videoPlayer, setVideoPlayer] = useState<{ url: string; title: string; meta: string } | null>(null)
  const [nodeVideoUrls, setNodeVideoUrls] = useState<Record<string, string>>({})
  const [nodeTerminalStates, setNodeTerminalStates] = useState<Record<string, NodeTerminalState>>({})
  const [isRefreshingQueue, setIsRefreshingQueue] = useState(false)
  const [setupLoadedToast, setSetupLoadedToast] = useState('')

  const queueItemsRef = useRef(queueItems)
  const pollingTimersRef = useRef<Record<string, number>>({})
  const lastGenerationNodeIdRef = useRef('')
  const generationSequenceRef = useRef(loadGenerationSequence())

  const nextGenerationName = useCallback((collectionTitle: string) => {
    const nextValue = generationSequenceRef.current + 1
    generationSequenceRef.current = nextValue
    saveGenerationSequence(nextValue)
    return createGenerationName(collectionTitle, nextValue)
  }, [])

  useEffect(() => {
    queueItemsRef.current = queueItems
  }, [queueItems])

  useEffect(() => {
    saveQueue(queueItems)
  }, [queueItems])

  useEffect(() => {
    const normalized = history.map(normalizeHistoryModel)
    const changed = normalized.some((entry, idx) => (
      entry.model !== history[idx]?.model
      || entry.requestedModel !== history[idx]?.requestedModel
      || entry.effectiveModel !== history[idx]?.effectiveModel
    ))
    if (!changed) return
    setHistory(normalized)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(normalized.slice(0, HISTORY_LIMIT)))
  }, [history])

  useEffect(() => {
    if (videoUrl) setSelectedVideoUrl(videoUrl)
  }, [videoUrl])

  useEffect(() => {
    if (!queueItems.some((item) => isActiveQueueStatus(item.status))) return
    const timer = window.setInterval(() => setQueueNowMs(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [queueItems])

  useEffect(() => {
    try {
      localStorage.setItem(MODEL_KEY, seedanceModel)
    } catch {
      // Ignore localStorage failures.
    }
  }, [seedanceModel])

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_MODE_KEY, shotViewMode)
      localStorage.setItem(QUALITY_PREF_KEY, qualityPreset)
      localStorage.setItem(AUDIO_PREF_KEY, includeAudio ? '1' : '0')
      localStorage.setItem(STUDIO_MODE_KEY, studioMode)
      localStorage.setItem(REFERENCE_IMAGE_URL_KEY, referenceImageUrl)
      localStorage.setItem(REFERENCE_VIDEO_URL_KEY, referenceVideoUrl)
      localStorage.setItem(REFERENCE_IMAGE_UPLOADS_KEY, JSON.stringify(referenceImageThumbs.slice(0, 8)))
    } catch {
      // Ignore localStorage failures.
    }
  }, [shotViewMode, qualityPreset, includeAudio, studioMode, referenceImageUrl, referenceVideoUrl, referenceImageThumbs])

  useEffect(() => {
    if (!setupLoadedToast) return
    const timer = window.setTimeout(() => setSetupLoadedToast(''), 1700)
    return () => window.clearTimeout(timer)
  }, [setupLoadedToast])

  useEffect(() => {
    if (!videoPlayer) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setVideoPlayer(null)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [videoPlayer])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault()
        handleSimpleGenerate()
      }
      if (event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey) {
        const active = document.activeElement as HTMLElement | null
        const isInputFocused = active?.tagName === 'INPUT' || active?.tagName === 'TEXTAREA' || active?.isContentEditable
        if (!isInputFocused) {
          event.preventDefault()
          const promptEl = document.querySelector('.tg-prompt-textarea') as HTMLTextAreaElement | null
          promptEl?.focus()
        }
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [prompt, duration, aspectRatio, seedanceModel, qualityPreset, includeAudio, referenceImageUrl, referenceVideoUrl, referenceImageThumbs])

  const clearPollingTimer = (queueId: string) => {
    const timerId = pollingTimersRef.current[queueId]
    if (typeof timerId === 'number') {
      window.clearInterval(timerId)
      delete pollingTimersRef.current[queueId]
    }
  }

  const clearAllPollingTimers = () => {
    Object.values(pollingTimersRef.current).forEach((timerId) => window.clearInterval(timerId))
    pollingTimersRef.current = {}
  }

  useEffect(() => () => clearAllPollingTimers(), [])

  const patchQueueItem = useCallback((queueId: string, patch: Partial<QueueItem>) => {
    setQueueItems((current) => current.map((item) => (
      item.id === queueId
        ? { ...item, ...patch, updatedAt: Date.now() }
        : item
    )))
  }, [])

  const setNodeTerminalState = useCallback((nodeId: string, nextState: NodeTerminalState) => {
    if (!nodeId || nodeId === '__external__') return
    setNodeTerminalStates((current) => ({ ...current, [nodeId]: nextState }))
  }, [])

  const failQueueItem = useCallback((queueItem: QueueItem, message: string) => {
    patchQueueItem(queueItem.id, { status: 'FAILED', errorMessage: message })
    setNodeTerminalState(queueItem.nodeId, { status: 'FAILED', taskId: queueItem.taskId, errorMessage: message })
    setErrorMessage(message)
    clearPollingTimer(queueItem.id)
  }, [patchQueueItem, setNodeTerminalState])

  const finalizeSuccessfulTask = useCallback((queueItem: QueueItem, nextVideoUrl: string, nextConsumedCredits: number | null) => {
    clearPollingTimer(queueItem.id)
    const completedAt = Date.now()
    const generationTimeMs = Math.max(0, completedAt - queueItem.createdAt)

    if (nextVideoUrl) {
      setNodeVideoUrls((current) => ({ ...current, [queueItem.nodeId]: nextVideoUrl }))
      setVideoUrl(nextVideoUrl)
      setSelectedVideoUrl((current) => current || nextVideoUrl)
    }

    setNodeTerminalState(queueItem.nodeId, {
      status: 'SUCCESS',
      taskId: queueItem.taskId,
      errorMessage: '',
    })

    if (queueItem.taskId && nextVideoUrl) {
      saveToHistory({
        taskId: queueItem.taskId,
        prompt: queueItem.prompt,
        sourcePrompt: queueItem.sourcePrompt,
        videoUrl: nextVideoUrl,
        createdAt: Date.now(),
        collectionId: queueItem.collectionId,
        collectionTitle: queueItem.collectionTitle,
        generationNodeId: queueItem.nodeId,
        storyContext: queueItem.storyContext,
        mode: queueItem.mode,
        model: queueItem.model,
        duration: queueItem.duration,
        aspectRatio: queueItem.aspectRatio,
        generationTimeMs,
        requestedModel: queueItem.requestedModel || queueItem.model,
        effectiveModel: queueItem.effectiveModel || queueItem.requestedModel || queueItem.model,
        fallbackAttempted: queueItem.fallbackAttempted,
        fallbackReason: queueItem.fallbackReason,
        referenceImages: queueItem.referenceImages,
        referenceVideos: queueItem.referenceVideos,
        qualityPreset: queueItem.qualityPreset,
        includeAudio: queueItem.includeAudio,
        submittedAt: queueItem.submittedAt,
        firstStatusAt: queueItem.firstStatusAt,
        completedAt,
        ...(nextConsumedCredits !== null ? { consumedCredits: nextConsumedCredits } : {}),
      })
      setHistory(loadHistory())
    }

    setQueueItems((current) => current.filter((item) => item.id !== queueItem.id))
  }, [setNodeTerminalState])

  const fetchStatusForQueueItem = useCallback(async (queueItem: QueueItem): Promise<GenerationStatus> => {
    if (!queueItem.taskId) return queueItem.status

    if (isQueueItemStale(queueItem, Date.now())) {
      failQueueItem(
        queueItem,
        'Generation timed out after 12 minutes while waiting on the upstream API. This task was marked failed so the queue can continue. Retry with Seedance 2.0 Fast or a shorter duration.',
      )
      return 'FAILED'
    }

    const response = await fetch(`${buildApiUrl('/api/seedance/status')}?task_id=${encodeURIComponent(queueItem.taskId)}`)
    const payload = await readJsonSafely(response)
    if (!response.ok) throw new Error(pickError(payload) || 'Failed to fetch generation status.')

    const nextStatus = normalizeStatus(pickStatus(payload))
    const nextConsumedCredits = pickConsumedCredits(payload)
    const nextRequestedModel = pickRequestedModel(payload) || queueItem.requestedModel || queueItem.model || ''
    const nextEffectiveModel = pickEffectiveModel(payload) || queueItem.effectiveModel || nextRequestedModel
    const nextFallbackAttempted = pickFallbackAttempted(payload) || queueItem.fallbackAttempted === true
    const nextFallbackReason = pickFallbackReason(payload) || queueItem.fallbackReason || ''

    if (nextConsumedCredits !== null) setConsumedCredits(nextConsumedCredits)

    if (nextStatus === 'SUCCESS') {
      const nextVideoUrl = pickVideoUrl(payload)
      finalizeSuccessfulTask({
        ...queueItem,
        requestedModel: nextRequestedModel,
        effectiveModel: nextEffectiveModel,
        fallbackAttempted: nextFallbackAttempted,
        fallbackReason: nextFallbackReason,
      }, nextVideoUrl, nextConsumedCredits)
      return nextStatus
    }

    if (nextStatus === 'FAILED') {
      const message = pickError(payload) || 'Generation failed.'
      failQueueItem(queueItem, message)
      return nextStatus
    }

    patchQueueItem(queueItem.id, {
      status: nextStatus,
      errorMessage: '',
      firstStatusAt: queueItem.firstStatusAt || Date.now(),
      requestedModel: nextRequestedModel,
      effectiveModel: nextEffectiveModel,
      fallbackAttempted: nextFallbackAttempted,
      fallbackReason: nextFallbackReason,
    })

    return nextStatus
  }, [failQueueItem, finalizeSuccessfulTask, patchQueueItem])

  const startPollingForQueueItem = useCallback((queueItem: QueueItem) => {
    if (!queueItem.taskId) return
    clearPollingTimer(queueItem.id)

    pollingTimersRef.current[queueItem.id] = window.setInterval(() => {
      const latest = queueItemsRef.current.find((item) => item.id === queueItem.id)
      if (!latest || !latest.taskId) {
        clearPollingTimer(queueItem.id)
        return
      }
      void fetchStatusForQueueItem(latest).catch((error: unknown) => {
        const message = error instanceof Error ? error.message : 'Status polling failed.'
        failQueueItem(latest, message)
      })
    }, 5000)
  }, [failQueueItem, fetchStatusForQueueItem])

  const clearErrorForInputChange = () => {
    if (errorMessage) setErrorMessage('')
  }

  const handlePromptChange = (nextPrompt: string) => {
    clearErrorForInputChange()
    setPrompt(nextPrompt)
  }

  const handleDurationChange = (nextDuration: number) => {
    clearErrorForInputChange()
    setDuration(nextDuration)
  }

  const handleAspectRatioChange = (nextAspectRatio: ToorGenAspectRatio) => {
    clearErrorForInputChange()
    setAspectRatio(nextAspectRatio)
  }

  const handleModeChange = (nextMode: ToorGenGenerationMode) => {
    clearErrorForInputChange()
    setMode(nextMode)
  }

  const handleModelChange = (nextModel: ToorGenModel) => {
    clearErrorForInputChange()
    setSeedanceModel(nextModel)
  }

  const handleGenerate = async (request: ToorGenGenerationRequest) => {
    const requestedModel = (request.model || seedanceModel || 'seedance-2.0-fast') as ToorGenModel
    const nodeId = request.generationNodeId
    lastGenerationNodeIdRef.current = nodeId
    setErrorMessage('')
    const generationName = nextGenerationName(request.collectionTitle)

    const queueId = createQueueId()
    const baseQueueItem: QueueItem = {
      id: queueId,
      nodeId,
      taskId: '',
      prompt: generationName,
      sourcePrompt: request.sourcePrompt,
      collectionId: request.collectionId,
      collectionTitle: request.collectionTitle,
      storyContext: request.storyContext,
      mode: request.mode,
      model: requestedModel,
      duration: request.duration,
      aspectRatio: request.aspectRatio,
      status: 'SUBMITTING',
      requestedModel,
      effectiveModel: '',
      fallbackAttempted: false,
      fallbackReason: '',
      referenceImages: request.images,
      referenceVideos: request.videos,
      qualityPreset,
      includeAudio,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      errorMessage: '',
    }

    setQueueItems((current) => [baseQueueItem, ...current])

    const finalPrompt = request.prompt.trim()
    if (!request.hasPrompt || !finalPrompt) {
      failQueueItem(baseQueueItem, 'Connect at least one prompt note or write a global prompt before generating.')
      return
    }

    if (finalPrompt.length > SEEDANCE_PROMPT_CHARACTER_LIMIT) {
      failQueueItem(baseQueueItem, `Seedance prompt is ${finalPrompt.length.toLocaleString()} characters. Shorten it to ${SEEDANCE_PROMPT_CHARACTER_LIMIT.toLocaleString()} characters or less.`)
      return
    }

    if (request.mode === 'image-to-video' && request.images.length === 0) {
      failQueueItem(baseQueueItem, request.localMediaCount > 0
        ? 'Some local references cannot be sent as generation inputs. Use a hosted http/https URL for unsupported items.'
        : 'Image-to-video needs at least one connected hosted image URL.')
      return
    }

    try {
      const generationPayload = {
        prompt: finalPrompt,
        model: requestedModel,
        duration: request.duration,
        aspect_ratio: request.aspectRatio,
        ...(request.images.length > 0 ? { images: request.images } : {}),
        ...(request.videos.length > 0 ? { reference_videos: request.videos } : {}),
      }
      const generationPayloadJson = JSON.stringify(generationPayload)
      if (generationPayloadJson.length > MAX_GENERATION_REQUEST_SIZE) {
        throw new Error('Generation request is too large. Shorten the prompt/graph or use hosted media URLs instead of embedded files.')
      }

      const response = await fetch(buildApiUrl('/api/seedance/generate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: generationPayloadJson,
      })

      const payload = await readJsonSafely(response)
      if (!response.ok) throw new Error(pickError(payload) || 'Generation request failed.')

      const newTaskId = pickTaskId(payload)
      if (!newTaskId) throw new Error('No task id returned by the backend.')

      const requestedModelFromResponse = pickRequestedModel(payload) || requestedModel
      const effectiveModelFromResponse = pickEffectiveModel(payload) || requestedModelFromResponse
      const fallbackAttempted = pickFallbackAttempted(payload)
      const fallbackReason = pickFallbackReason(payload)

      setTaskId(newTaskId)
      const initialConsumedCredits = pickConsumedCredits(payload)
      if (initialConsumedCredits !== null) setConsumedCredits(initialConsumedCredits)

      const initialStatus = normalizeStatus(pickStatus(payload) || 'IN_PROGRESS')
      const queueItemWithTask: QueueItem = {
        ...baseQueueItem,
        taskId: newTaskId,
        status: initialStatus,
        requestedModel: requestedModelFromResponse,
        effectiveModel: effectiveModelFromResponse,
        fallbackAttempted,
        fallbackReason,
        updatedAt: Date.now(),
      }

      patchQueueItem(queueId, {
        taskId: newTaskId,
        status: initialStatus,
        submittedAt: Date.now(),
        firstStatusAt: initialStatus === 'IN_PROGRESS' ? Date.now() : undefined,
        requestedModel: requestedModelFromResponse,
        effectiveModel: effectiveModelFromResponse,
        fallbackAttempted,
        fallbackReason,
        errorMessage: '',
      })

      const immediateStatus = await fetchStatusForQueueItem(queueItemWithTask)
      if (isActiveQueueStatus(immediateStatus)) {
        startPollingForQueueItem(queueItemWithTask)
      }
    } catch (error: unknown) {
      const message = formatNetworkError(error)
      failQueueItem(baseQueueItem, message)
    }
  }

  const handleResume = async () => {
    const id = resumeTaskId.trim()
    if (!id) return

    setErrorMessage('')
    setTaskId(id)

    const existing = queueItemsRef.current.find((item) => item.taskId === id)
    const recoveredItem: QueueItem = existing || {
      id: createQueueId(),
      nodeId: lastGenerationNodeIdRef.current || '__external__',
      taskId: id,
      prompt: 'Recovered task',
      mode,
      model: seedanceModel,
      duration,
      aspectRatio,
      status: 'IN_PROGRESS',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      errorMessage: '',
    }

    if (!existing) {
      setQueueItems((current) => [recoveredItem, ...current])
    }

    try {
      const immediateStatus = await fetchStatusForQueueItem(recoveredItem)
      if (isActiveQueueStatus(immediateStatus)) {
        startPollingForQueueItem(recoveredItem)
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unable to fetch task status.'
      failQueueItem(recoveredItem, message)
    }
  }

  const handleRefreshQueue = async () => {
    if (isRefreshingQueue) return
    setIsRefreshingQueue(true)

    try {
      const candidates: QueueItem[] = []
      const seenTasks = new Set<string>()

      for (const item of queueItemsRef.current) {
        if (!item.taskId || seenTasks.has(item.taskId)) continue
        seenTasks.add(item.taskId)
        candidates.push(item)
      }

      const manualTaskId = resumeTaskId.trim()
      if (manualTaskId && !seenTasks.has(manualTaskId)) {
        const recoveredItem: QueueItem = {
          id: createQueueId(),
          nodeId: lastGenerationNodeIdRef.current || '__external__',
          taskId: manualTaskId,
          prompt: 'Recovered task',
          mode,
          model: seedanceModel,
          duration,
          aspectRatio,
          status: 'IN_PROGRESS',
          createdAt: Date.now(),
          updatedAt: Date.now(),
          errorMessage: '',
        }
        setQueueItems((current) => [recoveredItem, ...current])
        candidates.push(recoveredItem)
      }

      await Promise.all(candidates.map(async (item) => {
        try {
          const nextStatus = await fetchStatusForQueueItem(item)
          if (isActiveQueueStatus(nextStatus)) {
            startPollingForQueueItem(item)
          }
        } catch (error: unknown) {
          const message = error instanceof Error ? error.message : 'Unable to refresh task status.'
          failQueueItem(item, message)
        }
      }))
    } finally {
      setIsRefreshingQueue(false)
    }
  }

  const handleStopAllRunning = () => {
    const activeItems = queueItemsRef.current.filter((item) => isActiveQueueStatus(item.status))
    if (activeItems.length === 0) return

    for (const item of activeItems) {
      clearPollingTimer(item.id)
      setNodeTerminalState(item.nodeId, {
        status: 'FAILED',
        taskId: item.taskId,
        errorMessage: 'Stopped by user.',
      })
    }

    setQueueItems((current) => current.map((item) => (
      isActiveQueueStatus(item.status)
        ? { ...item, status: 'FAILED', errorMessage: 'Stopped by user.', updatedAt: Date.now() }
        : item
    )))
  }

  const handleDeleteHistoryEntry = (entry: HistoryEntry) => {
    const title = entry.prompt || entry.taskId || 'this video'
    const confirmed = window.confirm(`Delete "${title}" from videos?`)
    if (!confirmed) return

    const nextHistory = history.filter((item) => item.taskId !== entry.taskId)
    setHistory(nextHistory)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory.slice(0, HISTORY_LIMIT)))

    if (selectedVideoUrl === entry.videoUrl) {
      setSelectedVideoUrl(nextHistory[0]?.videoUrl || '')
    }
    if (videoPlayer?.url === entry.videoUrl) {
      setVideoPlayer(null)
    }
  }

  const handleRemoveFailedQueueItem = (item: QueueItem) => {
    clearPollingTimer(item.id)
    setQueueItems((current) => current.filter((entry) => entry.id !== item.id))
    if (resumeTaskId === item.taskId) setResumeTaskId('')
    if (errorMessage && errorMessage === item.errorMessage) setErrorMessage('')
  }

  const handleRetryFailedQueueItemWithFastModel = (item: QueueItem) => {
    const sourcePrompt = (item.sourcePrompt || item.prompt || '').trim()
    if (!sourcePrompt) {
      setErrorMessage('Retry needs the original prompt, but it is missing for this task.')
      return
    }

    const retryMode: ToorGenGenerationMode = item.mode === 'image-to-video' && (item.referenceImages?.length || 0) > 0
      ? 'image-to-video'
      : 'text-to-video'

    void handleGenerate({
      prompt: sourcePrompt,
      sourcePrompt,
      images: item.referenceImages || [],
      videos: item.referenceVideos || [],
      localMediaCount: 0,
      duration: item.duration || 5,
      aspectRatio: (item.aspectRatio as ToorGenAspectRatio) || '16:9',
      mode: retryMode,
      graphJson: JSON.stringify({
        retryOfTaskId: item.taskId,
        reason: 'retry-fast-model',
      }),
      hasPrompt: true,
      collectionId: item.collectionId || 'simple',
      collectionTitle: item.collectionTitle || 'Generations',
      generationNodeId: item.nodeId || 'simple-composer',
      storyContext: item.storyContext,
      model: 'seedance-2.0-fast',
    })

    clearPollingTimer(item.id)
    setQueueItems((current) => current.filter((entry) => entry.id !== item.id))
    setErrorMessage('')
  }

  const activeQueueItems = useMemo(
    () => queueItems.filter((item) => isActiveQueueStatus(item.status)).sort((a, b) => b.createdAt - a.createdAt),
    [queueItems],
  )

  const failedQueueItems = useMemo(
    () => queueItems.filter((item) => item.status === 'FAILED').sort((a, b) => b.createdAt - a.createdAt),
    [queueItems],
  )

  const hasSubmitting = activeQueueItems.some((item) => item.status === 'SUBMITTING')
  const hasInProgress = activeQueueItems.some((item) => item.status === 'IN_PROGRESS')
  const isGenerating = hasSubmitting || hasInProgress
  const status: GenerationStatus = hasSubmitting
    ? 'SUBMITTING'
    : hasInProgress
      ? 'IN_PROGRESS'
      : failedQueueItems.length > 0
        ? 'FAILED'
        : 'IDLE'

  const { nodeStatuses, nodeTaskIds, nodeErrorMessages } = useMemo(() => {
    const statuses: Record<string, ToorGenGenerationStatus> = {}
    const taskIds: Record<string, string> = {}
    const errors: Record<string, string> = {}

    for (const [nodeId, terminalState] of Object.entries(nodeTerminalStates)) {
      statuses[nodeId] = terminalState.status
      taskIds[nodeId] = terminalState.taskId
      errors[nodeId] = terminalState.errorMessage || ''
    }

    const byNode = new Map<string, QueueItem[]>()
    for (const item of activeQueueItems) {
      if (!item.nodeId || item.nodeId === '__external__') continue
      const current = byNode.get(item.nodeId) || []
      current.push(item)
      byNode.set(item.nodeId, current)
    }

    for (const [nodeId, items] of byNode.entries()) {
      const hasNodeSubmitting = items.some((item) => item.status === 'SUBMITTING')
      const newestTask = [...items]
        .filter((item) => item.taskId)
        .sort((a, b) => b.createdAt - a.createdAt)[0]

      statuses[nodeId] = hasNodeSubmitting ? 'SUBMITTING' : 'IN_PROGRESS'
      taskIds[nodeId] = newestTask?.taskId || ''
      errors[nodeId] = ''
    }

    return { nodeStatuses: statuses, nodeTaskIds: taskIds, nodeErrorMessages: errors }
  }, [activeQueueItems, nodeTerminalStates])

  const folderNames = useMemo(() => {
    const names = new Set<string>()
    for (const item of queueItems) {
      if (item.collectionTitle) names.add(item.collectionTitle)
    }
    for (const item of history) {
      if (item.collectionTitle) names.add(item.collectionTitle)
    }
    if (names.size === 0) names.add('General')
    return Array.from(names)
  }, [queueItems, history])

  const hostedImageUrl = /^https?:\/\//i.test(referenceImageUrl.trim()) ? referenceImageUrl.trim() : ''
  const hostedVideoUrl = /^https?:\/\//i.test(referenceVideoUrl.trim()) ? referenceVideoUrl.trim() : ''
  const composedImageReferences = [
    ...(hostedImageUrl ? [hostedImageUrl] : []),
    ...referenceImageThumbs,
  ]

  const uploadReferenceImage = useCallback(async (file: File): Promise<string> => {
    const response = await fetch(buildApiUrl('/api/seedance/reference-image'), {
      method: 'POST',
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
        'x-file-name': encodeURIComponent(file.name || 'reference-image'),
      },
      body: file,
    })
    const payload = await readJsonSafely(response)
    if (!response.ok) throw new Error(pickError(payload) || 'Could not upload image reference.')
    const url = typeof (payload as { url?: unknown }).url === 'string' ? String((payload as { url?: unknown }).url) : ''
    if (!url) throw new Error('Reference upload completed without a valid URL.')
    return url
  }, [])

  const handleAddReferenceImages = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    try {
      const selected = Array.from(files)
      const uploaded = await Promise.allSettled(selected.map((file) => uploadReferenceImage(file)))

      const successfulUrls = uploaded
        .filter((result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled')
        .map((result) => result.value)

      const failedFiles: File[] = []
      uploaded.forEach((result, index) => {
        if (result.status === 'rejected') failedFiles.push(selected[index])
      })

      let fallbackDataUrls: string[] = []
      if (failedFiles.length > 0) {
        fallbackDataUrls = await Promise.all(failedFiles.map((file) => fileToDataUrl(file)))
      }

      setReferenceImageThumbs((current) => [...current, ...successfulUrls, ...fallbackDataUrls].slice(0, 8))
      if (failedFiles.length > 0) {
        setErrorMessage(`Uploaded ${successfulUrls.length} image(s) to server. ${failedFiles.length} image(s) were kept locally.`)
      } else {
        setErrorMessage('')
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Could not read selected image.'
      setErrorMessage(message)
    }
  }

  const handleRemoveReferenceImage = (index: number) => {
    setReferenceImageThumbs((current) => current.filter((_, idx) => idx !== index))
  }

  const handleSimpleGenerate = () => {
    const composerPrompt = prompt.trim()
    if (!composerPrompt) {
      setErrorMessage('Write a prompt before generating.')
      return
    }

    const promptWithOptions = `${composerPrompt}\n\nRender settings:\n- quality: ${qualityPreset}\n- audio: ${includeAudio ? 'on' : 'off'}`
    const autoMode: ToorGenGenerationMode = composedImageReferences.length > 0 ? 'image-to-video' : 'text-to-video'

    void handleGenerate({
      prompt: promptWithOptions,
      sourcePrompt: composerPrompt,
      images: composedImageReferences,
      videos: hostedVideoUrl ? [hostedVideoUrl] : [],
      localMediaCount: referenceImageThumbs.filter((value) => !isHostedUrl(value)).length + (referenceImageUrl.trim() && !hostedImageUrl ? 1 : 0) + (referenceVideoUrl.trim() && !hostedVideoUrl ? 1 : 0),
      duration,
      aspectRatio,
      mode: autoMode,
      graphJson: JSON.stringify({
        prompt: composerPrompt,
        references: {
          image: referenceImageUrl.trim(),
          imageUploads: referenceImageThumbs.length,
          video: referenceVideoUrl.trim(),
        },
        options: {
          qualityPreset,
          includeAudio,
        },
      }),
      hasPrompt: true,
      collectionId: 'simple',
      collectionTitle: 'Generations',
      generationNodeId: 'simple-composer',
      storyContext: undefined,
      model: seedanceModel,
    })
  }

  const handleLoadShotSetup = (entry: HistoryEntry) => {
    const refs = entry.referenceImages || []
    const hostedImage = refs.find((value) => /^https?:\/\//i.test(value)) || ''
    const uploadedRefs = refs.filter((value) => value !== hostedImage)

    setPrompt(entry.sourcePrompt || entry.prompt || '')
    setReferenceImageUrl(hostedImage)
    setReferenceImageThumbs(uploadedRefs)
    setReferenceVideoUrl(entry.referenceVideos?.[0] || '')

    const modelValue = (entry.model || entry.requestedModel || '') as ToorGenModel | ''
    if (modelValue === 'seedance-2.0' || modelValue === 'seedance-2.0-fast') {
      setSeedanceModel(modelValue)
    }

    if (typeof entry.duration === 'number' && Number.isFinite(entry.duration)) {
      setDuration(entry.duration)
    }

    const ratio = (entry.aspectRatio || '') as ToorGenAspectRatio | ''
    if (ratio === '16:9' || ratio === '9:16' || ratio === '4:3' || ratio === '3:4') {
      setAspectRatio(ratio)
    }

    if (entry.qualityPreset === '540p' || entry.qualityPreset === '720p' || entry.qualityPreset === '1080p') {
      setQualityPreset(entry.qualityPreset)
    }

    if (typeof entry.includeAudio === 'boolean') {
      setIncludeAudio(entry.includeAudio)
    }

    setErrorMessage('')
    setSetupLoadedToast('Shot setup loaded')
  }

  const filteredHistory = useMemo(() => {
    const query = galleryQuery.trim().toLowerCase()
    let next = history.filter((entry) => {
      if (galleryModelFilter !== 'all' && (entry.effectiveModel || entry.requestedModel || entry.model) !== galleryModelFilter) {
        return false
      }
      if (!query) return true
      const haystack = [
        entry.prompt,
        entry.taskId,
        entry.effectiveModel,
        entry.requestedModel,
        entry.model,
      ].filter(Boolean).join(' ').toLowerCase()
      return haystack.includes(query)
    })

    if (gallerySort === 'oldest') {
      next = [...next].sort((a, b) => a.createdAt - b.createdAt)
    } else if (gallerySort === 'duration') {
      next = [...next].sort((a, b) => (b.duration || 0) - (a.duration || 0))
    } else {
      next = [...next].sort((a, b) => b.createdAt - a.createdAt)
    }
    return next
  }, [history, galleryQuery, gallerySort, galleryModelFilter])

  return (
    <div className="tg-shell">
      <aside className="tg-sidebar">
        <div className="tg-sidebar-head">
          <div>
            <span className="tg-kicker">TOORGEN</span>
            <h1>Studio</h1>
          </div>
          <span className="tg-history-count">{history.length}</span>
        </div>

        <div className="tg-sidebar-tabs" aria-label="Generation views">
          <button
            type="button"
            className={activeSidebarView === 'generations' ? 'is-active' : ''}
            onClick={() => setActiveSidebarView('generations')}
          >
            Queue
          </button>
          <button
            type="button"
            className={activeSidebarView === 'folders' ? 'is-active' : ''}
            onClick={() => setActiveSidebarView('folders')}
          >
            Folders
          </button>
        </div>

        <div className="tg-sidebar-actions">
          <div className="tg-studio-mode-switch" role="group" aria-label="Studio mode">
            <button
              type="button"
              className={studioMode === 'simple' ? 'is-active' : ''}
              onClick={() => setStudioMode('simple')}
            >
              Simple
            </button>
            <button
              type="button"
              className={studioMode === 'flow' ? 'is-active' : ''}
              onClick={() => setStudioMode('flow')}
            >
              Flow
            </button>
          </div>
          <button type="button" className="tg-sidebar-refresh-btn" onClick={handleRefreshQueue} disabled={isRefreshingQueue}>
            {isRefreshingQueue ? 'Refreshing...' : 'Refresh queue'}
          </button>
          <button
            type="button"
            className="tg-sidebar-stop-btn"
            onClick={handleStopAllRunning}
            disabled={!isGenerating}
          >
            Stop running
          </button>
        </div>

        <div className="tg-sidebar-list">
          {activeSidebarView === 'folders' ? (
            <div className="tg-folder-list">
              {folderNames.map((name) => (
                <button
                  key={name}
                  type="button"
                  className="tg-folder-item"
                  onClick={() => setActiveSidebarView('generations')}
                  title={`Open ${name}`}
                >
                  <span className="tg-folder-icon">📁</span>
                  <span className="tg-folder-label">{name}</span>
                </button>
              ))}
            </div>
          ) : null}

          {activeSidebarView === 'generations' ? (
            <>
          {activeQueueItems.map((item) => {
            const modelProofBadge = buildModelProofBadge(item)
            return (
              <button
                key={item.id}
                type="button"
                className="tg-thumb tg-thumb--pending"
                onClick={() => {
                  if (item.taskId) {
                    setTaskId(item.taskId)
                    setResumeTaskId(item.taskId)
                  }
                }}
                title={item.prompt || item.taskId || item.id}
              >
                <div className={`tg-thumb-preview tg-thumb-preview--pending ${getAspectRatioClass(item.aspectRatio)}`}><div className="tg-thumb-spinner" /></div>
                <div className="tg-thumb-body">
                  <div className="tg-thumb-head">
                    <span className="tg-thumb-title">{item.prompt || 'Queued render'}</span>
                    <span className={`tg-model-proof-badge is-${modelProofBadge.tone}`}>{modelProofBadge.text}</span>
                  </div>
                  <span className="tg-thumb-meta">{item.duration}s output · {item.aspectRatio} · {item.status}{item.taskId ? ` · ${item.taskId.slice(0, 10)}...` : ''}</span>
                  <span className="tg-thumb-meta">Elapsed {formatElapsedTime(queueNowMs - item.createdAt)}</span>
                  {item.submittedAt ? <span className="tg-thumb-meta">Submit {formatElapsedTime(item.submittedAt - item.createdAt)}</span> : null}
                  {item.submittedAt && item.firstStatusAt ? <span className="tg-thumb-meta">Queue {formatElapsedTime(item.firstStatusAt - item.submittedAt)}</span> : null}
                  {(queueNowMs - (item.submittedAt || item.createdAt)) >= SLOW_API_WARNING_MS
                    ? <span className="tg-thumb-meta tg-thumb-meta--error">Upstream API is unusually slow</span>
                    : null}
                </div>
              </button>
            )
          })}

          {failedQueueItems.map((item) => {
            const modelProofBadge = buildModelProofBadge(item)
            return (
              <div key={item.id} className="tg-thumb tg-thumb--failed" title={item.errorMessage || item.prompt || item.taskId || item.id}>
                <button
                  type="button"
                  className="tg-thumb-main"
                  onClick={() => {
                    if (item.taskId) setResumeTaskId(item.taskId)
                    if (item.errorMessage) setErrorMessage(item.errorMessage)
                  }}
                >
                  <div className={`tg-thumb-preview tg-thumb-preview--pending ${getAspectRatioClass(item.aspectRatio)}`}>
                    <span className="tg-thumb-failed-label">Failed</span>
                  </div>
                  <div className="tg-thumb-body">
                    <div className="tg-thumb-head">
                      <span className="tg-thumb-title">{item.prompt || 'Failed render'}</span>
                      <span className={`tg-model-proof-badge is-${modelProofBadge.tone}`}>{modelProofBadge.text}</span>
                    </div>
                    <span className="tg-thumb-meta">{item.duration}s output · {item.aspectRatio}{item.taskId ? ` · ${item.taskId.slice(0, 10)}...` : ''}</span>
                    {item.errorMessage ? <span className="tg-thumb-meta tg-thumb-meta--error">{item.errorMessage}</span> : null}
                  </div>
                </button>
                <button
                  type="button"
                  className="tg-thumb-remove"
                  onClick={() => handleRetryFailedQueueItemWithFastModel(item)}
                >
                  Retry Fast
                </button>
                <button
                  type="button"
                  className="tg-thumb-remove"
                  onClick={() => handleRemoveFailedQueueItem(item)}
                >
                  Remove
                </button>
              </div>
            )
          })}

          {activeQueueItems.length === 0 && failedQueueItems.length === 0
            ? <div className="tg-sidebar-empty"><span>Queue status appears here.</span></div>
            : null}

          {studioMode === 'flow' ? history.map((entry) => {
            const modelProofBadge = buildModelProofBadge(entry)
            const durationLabel = `${entry.duration || 5}s`
            const aspectLabel = entry.aspectRatio || '16:9'
            return (
              <div key={`flow-history-${entry.taskId}`} className={`tg-thumb ${selectedVideoUrl === entry.videoUrl ? 'is-active' : ''}`}>
                <button
                  type="button"
                  className="tg-thumb-main"
                  onClick={() => {
                    setSelectedVideoUrl(entry.videoUrl)
                    setVideoPlayer({
                      url: entry.videoUrl,
                      title: entry.prompt || 'Rendered video',
                      meta: `${durationLabel} • ${aspectLabel} • ${modelProofBadge.text}`,
                    })
                  }}
                >
                  <div className={`tg-thumb-preview ${getAspectRatioClass(entry.aspectRatio)}`}>
                    <video src={entry.videoUrl} preload="metadata" muted playsInline className="tg-thumb-video" />
                  </div>
                  <div className="tg-thumb-body">
                    <div className="tg-thumb-head">
                      <span className="tg-thumb-title">{entry.prompt || 'Untitled render'}</span>
                      <span className={`tg-model-proof-badge is-${modelProofBadge.tone}`}>{modelProofBadge.text}</span>
                    </div>
                    <span className="tg-thumb-meta">{durationLabel} · {aspectLabel}</span>
                    {typeof entry.generationTimeMs === 'number' ? <span className="tg-thumb-meta">Total {formatElapsedTime(entry.generationTimeMs)}</span> : null}
                    {entry.submittedAt && entry.firstStatusAt ? <span className="tg-thumb-meta">Queue {formatElapsedTime(entry.firstStatusAt - entry.submittedAt)}</span> : null}
                  </div>
                </button>
              </div>
            )
          }) : null}
            </>
          ) : null}
        </div>
      </aside>

      {studioMode === 'flow' ? (
        <main className="tg-main tg-main--canvas-only">
          <ToorGenFlowCanvas
            prompt={prompt}
            onPromptChange={handlePromptChange}
            duration={duration}
            onDurationChange={handleDurationChange}
            aspectRatio={aspectRatio}
            onAspectRatioChange={handleAspectRatioChange}
            mode={mode}
            onModeChange={handleModeChange}
            model={seedanceModel}
            onModelChange={handleModelChange}
            status={status}
            isGenerating={isGenerating}
            consumedCredits={consumedCredits}
            selectedVideoUrl={selectedVideoUrl}
            errorMessage={errorMessage}
            nodeStatuses={nodeStatuses}
            nodeTaskIds={nodeTaskIds}
            nodeVideoUrls={nodeVideoUrls}
            nodeErrorMessages={nodeErrorMessages}
            taskId={taskId}
            resumeTaskId={resumeTaskId}
            onResumeTaskIdChange={setResumeTaskId}
            onResume={handleResume}
            onGenerate={(request) => { void handleGenerate(request) }}
          />
        </main>
      ) : (
      <main className="tg-main tg-main--simple">
        <div className="tg-topbar">
          <div>
            <span className="tg-kicker">TOORGEN</span>
            <h2>Simple Studio</h2>
          </div>
          <div className="tg-topbar-actions">
            <div className="tg-shot-view-group" role="group" aria-label="Shot view mode">
              <button
                type="button"
                className={shotViewMode === 'shot-list' ? 'is-active' : ''}
                onClick={() => setShotViewMode('shot-list')}
              >
                Shot list
              </button>
              <button
                type="button"
                className={shotViewMode === 'shot-grid' ? 'is-active' : ''}
                onClick={() => setShotViewMode('shot-grid')}
              >
                Similar
              </button>
              <button
                type="button"
                className={shotViewMode === 'shot-review' ? 'is-active' : ''}
                onClick={() => setShotViewMode('shot-review')}
              >
                Large review
              </button>
            </div>
            <span className="tg-model-tag">Queue {activeQueueItems.length}</span>
            {isGenerating ? <span className="tg-polling-badge">Running</span> : null}
            {consumedCredits !== null ? <span className="tg-taskid-badge">{consumedCredits} credits</span> : null}
          </div>
        </div>

        <section className="tg-simple-body">
          <div className="tg-gallery-toolbar" aria-label="Gallery controls">
            <input
              className="tg-gallery-search"
              value={galleryQuery}
              onChange={(event) => setGalleryQuery(event.target.value)}
              placeholder="Search prompt, task, or model"
              aria-label="Search generations"
            />

            <select
              className="tg-gallery-select"
              value={galleryModelFilter}
              onChange={(event) => setGalleryModelFilter(event.target.value as 'all' | 'seedance-2.0' | 'seedance-2.0-fast')}
              aria-label="Filter by model"
            >
              <option value="all">All models</option>
              <option value="seedance-2.0">Seedance 2.0</option>
              <option value="seedance-2.0-fast">Seedance 2.0 Fast</option>
            </select>

            <select
              className="tg-gallery-select"
              value={gallerySort}
              onChange={(event) => setGallerySort(event.target.value as 'newest' | 'oldest' | 'duration')}
              aria-label="Sort generations"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="duration">Longest duration</option>
            </select>

            <span className="tg-shortcuts-hint">Shortcuts: Ctrl/⌘+Enter generate · / focus prompt</span>
          </div>

          <div className={`tg-gallery-grid is-${shotViewMode}`}>
            {filteredHistory.map((entry) => {
              const modelProofBadge = buildModelProofBadge(entry)
              const durationLabel = `${entry.duration || 5}s`
              const aspectLabel = entry.aspectRatio || '16:9'
              return (
                <article
                  key={`grid-${entry.taskId}`}
                  className="tg-gallery-card"
                >
                  <div className="tg-gallery-open">
                    <div className={`tg-gallery-preview ${getAspectRatioClass(entry.aspectRatio)}`}>
                      <button
                        type="button"
                        className="tg-gallery-preview-trigger"
                        onClick={() => {
                          setSelectedVideoUrl(entry.videoUrl)
                          setVideoPlayer({
                            url: entry.videoUrl,
                            title: entry.prompt || 'Rendered video',
                            meta: `${durationLabel} • ${aspectLabel} • ${modelProofBadge.text}`,
                          })
                        }}
                        aria-label="Open video"
                      >
                        <video
                          src={entry.videoUrl}
                          preload="metadata"
                          playsInline
                          className="tg-thumb-video"
                          onMouseEnter={(event) => {
                            event.currentTarget.muted = false
                            event.currentTarget.volume = 1
                            event.currentTarget.currentTime = 0
                            void event.currentTarget.play().catch(() => {
                              event.currentTarget.muted = true
                              void event.currentTarget.play().catch(() => {})
                            })
                          }}
                          onMouseLeave={(event) => {
                            event.currentTarget.pause()
                            event.currentTarget.currentTime = 0
                            event.currentTarget.muted = true
                          }}
                        />
                      </button>
                    </div>
                    <div className="tg-gallery-meta">
                      <strong>{entry.prompt || 'Untitled render'}</strong>
                      <div className="tg-gallery-badges">
                        <span className="tg-gallery-pill">{durationLabel}</span>
                        <span className="tg-gallery-pill">{aspectLabel}</span>
                        <span className={`tg-model-proof-badge is-${modelProofBadge.tone}`}>{modelProofBadge.text}</span>
                        {typeof entry.generationTimeMs === 'number' ? <span className="tg-gallery-pill">Total {formatElapsedTime(entry.generationTimeMs)}</span> : null}
                      </div>
                    </div>
                  </div>

                  <div className="tg-gallery-actions" aria-label="Video actions">
                    <button
                      type="button"
                      className="tg-gallery-icon-btn"
                      onClick={() => handleLoadShotSetup(entry)}
                      aria-label="Load prompt and references"
                    >
                      ↺
                    </button>
                    <a
                      className="tg-gallery-icon-btn"
                      href={entry.videoUrl}
                      target="_blank"
                      rel="noreferrer"
                      download
                      aria-label="Download video"
                    >
                      ⬇
                    </a>
                    <button
                      type="button"
                      className="tg-gallery-icon-btn is-danger"
                      onClick={() => handleDeleteHistoryEntry(entry)}
                      aria-label="Delete video"
                    >
                      ✕
                    </button>
                  </div>
                </article>
              )
            })}

            {activeQueueItems.map((item) => (
              <div key={`grid-queue-${item.id}`} className="tg-gallery-card tg-gallery-card--pending">
                <div className={`tg-gallery-preview tg-thumb-preview--pending ${getAspectRatioClass(item.aspectRatio)}`}>
                  <div className="tg-thumb-spinner" />
                </div>
                <div className="tg-gallery-meta">
                  <strong>{item.prompt || 'Queued render'}</strong>
                  <span>{item.duration}s · {item.aspectRatio} · {item.status}</span>
                </div>
              </div>
            ))}

            {filteredHistory.length === 0 && activeQueueItems.length === 0 ? (
              <div className="tg-gallery-empty">Your generations will appear here.</div>
            ) : null}
          </div>
        </section>

        <section className="tg-simple-composer" aria-label="Prompt composer">
          <div className="tg-simple-composer-top">
            <div className="tg-simple-prompt-row">
              <div className="tg-upload-panel">
                <label className="tg-upload-image-btn">
                  Image refs
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(event) => {
                      void handleAddReferenceImages(event.target.files)
                      event.currentTarget.value = ''
                    }}
                  />
                </label>
                <div className="tg-upload-thumbs">
                  {referenceImageThumbs.map((src, index) => (
                    <button
                      key={`ref-img-${index}`}
                      type="button"
                      className="tg-upload-thumb"
                      onClick={() => handleRemoveReferenceImage(index)}
                      aria-label="Remove image reference"
                    >
                      <img src={src} alt="Reference" />
                    </button>
                  ))}
                </div>
              </div>

              <textarea
                className="tg-prompt-textarea"
                value={prompt}
                onChange={(event) => handlePromptChange(event.target.value)}
                placeholder="Write your prompt. Attach hosted image/video references if needed."
                maxLength={SEEDANCE_PROMPT_CHARACTER_LIMIT}
              />
            </div>
            <div className="tg-simple-refs">
              <input
                className="tg-input-sm"
                value={referenceImageUrl}
                onChange={(event) => setReferenceImageUrl(event.target.value)}
                placeholder="Reference image URL (https://...)"
              />
              <input
                className="tg-input-sm"
                value={referenceVideoUrl}
                onChange={(event) => setReferenceVideoUrl(event.target.value)}
                placeholder="Reference video URL (https://...)"
              />
            </div>
          </div>

          <div className="tg-simple-controls">
            <select
              className="tg-select"
              aria-label="Model"
              title="Model"
              value={seedanceModel}
              onChange={(event) => handleModelChange(event.target.value as ToorGenModel)}
            >
              <option value="seedance-2.0">Seedance 2.0</option>
              <option value="seedance-2.0-fast">Seedance 2.0 Fast</option>
            </select>

            <select
              className="tg-select"
              aria-label="Aspect ratio"
              title="Aspect ratio"
              value={aspectRatio}
              onChange={(event) => handleAspectRatioChange(event.target.value as ToorGenAspectRatio)}
            >
              <option value="16:9">16:9</option>
              <option value="9:16">9:16</option>
              <option value="4:3">4:3</option>
              <option value="3:4">3:4</option>
            </select>

            <select
              className="tg-select"
              aria-label="Quality"
              title="Quality"
              value={qualityPreset}
              onChange={(event) => setQualityPreset(event.target.value as '540p' | '720p' | '1080p')}
            >
              <option value="540p">540p</option>
              <option value="720p">720p</option>
              <option value="1080p">1080p</option>
            </select>

            <select
              className="tg-select"
              aria-label="Duration"
              title="Duration"
              value={duration}
              onChange={(event) => handleDurationChange(Number(event.target.value) || 5)}
            >
              <option value={5}>5s</option>
              <option value={10}>10s</option>
              <option value={15}>15s</option>
            </select>

            <label className="tg-simple-audio-toggle">
              <input type="checkbox" checked={includeAudio} onChange={(event) => setIncludeAudio(event.target.checked)} />
              Audio
            </label>

            <button
              type="button"
              className="tg-generate-btn"
              onClick={handleSimpleGenerate}
            >
              Generate
            </button>
          </div>

          {errorMessage ? <div className="tg-simple-error">{errorMessage}</div> : null}
        </section>
      </main>
      )}

      {setupLoadedToast ? <div className="tg-toast">{setupLoadedToast}</div> : null}

      {videoPlayer ? (
        <div
          className="tg-video-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Video player"
          onClick={() => setVideoPlayer(null)}
        >
          <div className="tg-video-modal" onClick={(event) => event.stopPropagation()}>
            <div className="tg-video-modal-head">
              <strong>{videoPlayer.title}</strong>
              <div className="tg-video-modal-actions">
                <a
                  className="tg-video-modal-download"
                  href={videoPlayer.url}
                  target="_blank"
                  rel="noreferrer"
                  download
                >
                  Download
                </a>
                <button type="button" onClick={() => setVideoPlayer(null)}>Close</button>
              </div>
            </div>
            <video key={videoPlayer.url} src={videoPlayer.url} controls playsInline autoPlay />
            {videoPlayer.meta ? <p>{videoPlayer.meta}</p> : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
