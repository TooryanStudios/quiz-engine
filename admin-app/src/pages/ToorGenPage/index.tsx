import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../../lib/firebase'
import {
  ToorGenFlowCanvas,
  buildSeedancePrompt,
  createCharacterCard,
  type VideoReference,
  type ToorGenAspectRatio,
  type ToorGenGenerationMode,
  type ToorGenGenerationStatus,
  type ToorGenGenerationRequest,
  type ToorGenModel,
  type ToorGenStoryContext,
  type BibleDraft,
  type CharacterCard,
  STORY_BIBLE_KEY,
  STYLE_PREFIX_KEY,
  CHARACTER_CARDS_KEY,
  CONTINUITY_BLOCK_KEY,
  DEFAULT_CONTINUITY_BLOCK,
} from '../../components/toorgen/ToorGenFlowCanvas'
import { ToorGenBibleDefaultsDialog } from '../../components/toorgen/ToorGenBibleDefaultsDialog'
import '../ToorGenPage.css'

type GenerationStatus = 'IDLE' | 'SUBMITTING' | 'IN_PROGRESS' | 'SUCCESS' | 'FAILED'

const SEEDANCE_PROMPT_CHARACTER_LIMIT = 2000

type StatusPayloadData = {
  id?: string
  task_id?: string
  status?: string
  video_url?: string
  response?: string[] | null
  outputs?: string[] | null
  provider_used?: string
  provider_label?: string
  error?: string
  error_message?: string | null
  consumed_credits?: number
}

type HistoryEntry = {
  taskId: string
  prompt: string
  sourcePrompt?: string
  videoUrl: string
  starred?: boolean
  createdAt: number
  collectionId?: string
  collectionTitle?: string
  generationNodeId?: string
  generationNodeTitle?: string
  storyContext?: ToorGenStoryContext
  mode?: ToorGenGenerationMode
  model?: ToorGenModel
  duration?: number
  aspectRatio?: string
  consumedCredits?: number
  generationTimeMs?: number
  requestedModel?: string
  effectiveModel?: string
  providerUsed?: string
  providerLabel?: string
  fallbackAttempted?: boolean
  fallbackReason?: string
  referenceImages?: string[]
  referenceNodes?: VideoReference[]
  referenceVideos?: string[]
  referenceAudios?: string[]
  qualityPreset?: '540p' | '720p' | '1080p'
  includeAudio?: boolean
  submittedAt?: number
  firstStatusAt?: number
  completedAt?: number
  apiPayload?: Record<string, unknown>
}

type ReferenceLibraryEntry = {
  id: string
  url: string
  mediaKind: 'image' | 'audio'
  createdAt: number
  lastUsedAt: number
  sourcePrompt?: string
  model?: string
  duration?: number
  aspectRatio?: string
  includeAudio?: boolean
  qualityPreset?: '540p' | '720p' | '1080p'
}

const inferReferenceMediaKind = (url: string): 'image' | 'audio' => (
  /\.(mp3|wav)(\?|#|$)/i.test(url) ? 'audio' : 'image'
)

type SimpleImageRole = 'reference' | 'start_frame' | 'end_frame'

type SimpleImageSlot = {
  url: string
  characterName?: string
  imageRole?: SimpleImageRole
}

type PromptMentionOption = {
  id: string
  kind: 'character' | 'reference-image'
  label: string
  tokenValue: string
  subtitle: string
  thumbnailUrl?: string
}

type ActivePromptMention = {
  query: string
  start: number
  end: number
}

const SIMPLE_CONTINUITY_BLOCK = 'Continuity lock: keep one consistent character identity across every shot. Do not drift visual style. Use image references throughout the full clip.'

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const buildCharacterMentionMarkup = (name: string) => `@{${name.trim()}}`

const buildReferenceMentionMarkup = (index: number) => `@{Ref${index + 1}}`

const replaceAllMentions = (source: string, mention: string, replacement: string) => source.replace(new RegExp(escapeRegExp(mention), 'g'), replacement)

const findActivePromptMention = (value: string, caretPosition: number): ActivePromptMention | null => {
  const safeCaret = Math.max(0, Math.min(caretPosition, value.length))
  const beforeCaret = value.slice(0, safeCaret)
  const match = beforeCaret.match(/(^|\s)@([^\s{}]*)$/)
  if (!match) return null
  const query = match[2] || ''
  return {
    query,
    start: safeCaret - query.length - 1,
    end: safeCaret,
  }
}

const loadSavedCharacterCardsFromStorage = (): CharacterCard[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(CHARACTER_CARDS_KEY) || '[]') as unknown[]
    return Array.isArray(parsed)
      ? (parsed as CharacterCard[]).filter((card) => card && typeof card === 'object' && typeof card.name === 'string' && card.name.trim())
      : []
  } catch {
    return []
  }
}

const normalizeSimpleContinuityBlock = (value: string) => {
  const normalized = value.replace(/\r\n/g, '\n').trim()
  const looksLikeLegacyDefault = normalized.includes('Continuity lock for the full clip: keep one consistent character identity')
    && normalized.includes('Do not drift visual style between shots.')
    && normalized.includes('Use image references throughout the full clip for consistency, not only the opening frame.')
  if (!normalized || looksLikeLegacyDefault || normalized === DEFAULT_CONTINUITY_BLOCK.trim()) {
    return SIMPLE_CONTINUITY_BLOCK
  }
  return normalized
}

type StatusPayload = {
  ok?: boolean
  code?: number
  message?: string
  id?: string
  status?: string
  taskId?: string
  task_id?: string
  videoUrl?: string
  video_url?: string
  outputs?: string[] | null
  error?: string
  consumed_credits?: number
  requested_model?: string
  effective_model?: string
  provider_used?: string
  provider_label?: string
  fallback_model?: string
  fallback_attempted?: boolean
  fallback_reason?: string
  model_proof?: {
    requested_model?: string
    effective_model?: string
    provider_used?: string
    provider_label?: string
    reported_model?: string
    fallback_attempted?: boolean
    fallback_reason?: string
  }
  data?: StatusPayloadData
}

type QueueItem = {
  id: string
  nodeId: string
  generationNodeTitle?: string
  taskId: string
  prompt: string
  sourcePrompt?: string
  collectionId?: string
  collectionTitle?: string
  storyContext?: ToorGenStoryContext
  studioMode?: 'simple' | 'flow'
  mode: ToorGenGenerationMode
  model?: ToorGenModel
  requestedModel?: string
  effectiveModel?: string
  providerUsed?: string
  providerLabel?: string
  fallbackAttempted?: boolean
  fallbackReason?: string
  duration: number
  aspectRatio: string
  status: GenerationStatus
  createdAt: number
  updatedAt: number
  errorMessage?: string
  referenceImages?: string[]
  referenceNodes?: VideoReference[]
  referenceVideos?: string[]
  referenceAudios?: string[]
  qualityPreset?: '540p' | '720p' | '1080p'
  includeAudio?: boolean
  submittedAt?: number
  firstStatusAt?: number
  originalCreatedAt?: number
  apiPayload?: Record<string, unknown>
  lastStatusPollAt?: number
  lastStatusResponseAt?: number
  lastStatusApiStatus?: string
  statusPollErrorCount?: number
  lastStatusErrorAt?: number
  lastStatusError?: string
  lastStatusPayloadJson?: string
  statusTimeline?: QueueStatusEvent[]
}

type QueueStatusEvent = {
  at: number
  kind: 'poll' | 'response' | 'error'
  status?: string
  message?: string
}

type NodeTerminalState = {
  status: GenerationStatus
  taskId: string
  errorMessage?: string
  requestedModel?: string
  effectiveModel?: string
  providerLabel?: string
}

type PinnedSimpleSettings = {
  model: ToorGenModel
  aspectRatio: ToorGenAspectRatio
  qualityPreset: '540p' | '720p' | '1080p'
  includeAudio: boolean
}

type PinnedSimpleSettingsStore = Record<string, PinnedSimpleSettings>

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
const REFERENCE_AUDIO_URL_KEY = 'toorgen_reference_audio_url_v1'
const EXTENSION_VIDEO_URL_KEY = 'toorgen_extension_video_url_v1'
const REFERENCE_LIBRARY_KEY = 'toorgen_reference_library_v1'
const FLOW_ACTIVE_COLLECTION_KEY = 'toorgen_flow_active_collection_v1'
const SIMPLE_PINNED_SETTINGS_STORE_KEY = 'toorgen_simple_pinned_settings_store_v1'
const MAX_GENERATION_REQUEST_SIZE = 8_000_000
const HISTORY_LIMIT = 500

const TOORGEN_MODELS: readonly ToorGenModel[] = [
  'seedance-2.0-fast',
  'atlas-2.0',
  'seedance-api-2.0-fast',
  'seedance-2.0',
  'seedance-1.5',
] as const

const isToorGenModel = (value: string): value is ToorGenModel => TOORGEN_MODELS.includes(value as ToorGenModel)


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
    starred: entry.starred === true,
    model: (entry.model || requestedModel || fallbackModel) as ToorGenModel,
    requestedModel,
    effectiveModel,
  }
}

const isHostedUrl = (value: string): boolean => /^https?:\/\//i.test(value) || value.startsWith('/api/seedance/reference-image/')

const loadSharedBibleDraft = (
  mode: ToorGenGenerationMode,
  model: ToorGenModel,
  duration: number,
  aspectRatio: ToorGenAspectRatio,
): BibleDraft => {
  const clampShotsPerSegment = (value: unknown): number => {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) return 3
    return Math.min(6, Math.max(1, Math.floor(parsed)))
  }
  const normalizeAudioUrls = (value: unknown): [string, string, string] => {
    if (Array.isArray(value) && value.length >= 3 && value.every((entry) => typeof entry === 'string')) {
      return [value[0], value[1], value[2]]
    }
    return ['', '', '']
  }
  const normalizeCharacterCards = (value: unknown): CharacterCard[] => {
    if (!Array.isArray(value)) return [createCharacterCard()]
    const cards = value
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return null
        const raw = entry as Partial<CharacterCard>
        return createCharacterCard({
          id: typeof raw.id === 'string' && raw.id.trim() ? raw.id : undefined,
          name: typeof raw.name === 'string' ? raw.name : '',
          role: typeof raw.role === 'string' ? raw.role : '',
          appearance: typeof raw.appearance === 'string' ? raw.appearance : '',
          notes: typeof raw.notes === 'string' ? raw.notes : '',
          photos: Array.isArray(raw.photos) ? raw.photos.filter((photo) => typeof photo === 'string' && photo.trim()) : [],
        })
      })
      .filter((card): card is CharacterCard => Boolean(card))
      .slice(0, 8)
    return cards.length > 0 ? cards : [createCharacterCard()]
  }

  try {
    const rawAudioUrls = JSON.parse(localStorage.getItem('toorgen_audio_refs_v1') || '["","",""]') as unknown
    const rawCharacterCards = JSON.parse(localStorage.getItem(CHARACTER_CARDS_KEY) || '[]') as unknown
    return {
      prompt: '',
      fallbackImageUrl: '',
      fallbackVideoUrl: '',
      fallbackVideoUrl2: '',
      fallbackVideoUrl3: '',
      fallbackAudioUrls: normalizeAudioUrls(rawAudioUrls),
      otherInstructions: '',
      storyBible: localStorage.getItem(STORY_BIBLE_KEY) || '',
      stylePrefix: localStorage.getItem(STYLE_PREFIX_KEY) || '',
      continuityBlock: localStorage.getItem(CONTINUITY_BLOCK_KEY) ?? DEFAULT_CONTINUITY_BLOCK,
      strictConsistencyPreset: localStorage.getItem('toorgen_strict_consistency_preset_v1') === '1',
      autoShotSplit: localStorage.getItem('toorgen_auto_shot_split_v1') !== '0',
      shotsPerSegment: clampShotsPerSegment(localStorage.getItem('toorgen_shots_per_segment_v1') || '3'),
      characterCards: normalizeCharacterCards(rawCharacterCards),
      duration,
      aspectRatio,
      mode,
      model,
    }
  } catch {
    return {
      prompt: '',
      fallbackImageUrl: '',
      fallbackVideoUrl: '',
      fallbackVideoUrl2: '',
      fallbackVideoUrl3: '',
      fallbackAudioUrls: ['', '', ''],
      otherInstructions: '',
      storyBible: '',
      stylePrefix: '',
      continuityBlock: DEFAULT_CONTINUITY_BLOCK,
      strictConsistencyPreset: false,
      autoShotSplit: true,
      shotsPerSegment: 3,
      characterCards: [createCharacterCard()],
      duration,
      aspectRatio,
      mode,
      model,
    }
  }
}

const coerceReferenceLibraryEntry = (value: unknown): ReferenceLibraryEntry | null => {
  if (!value || typeof value !== 'object') return null
  const raw = value as Partial<ReferenceLibraryEntry>
  const url = typeof raw.url === 'string' ? raw.url.trim() : ''
  if (!isHostedUrl(url)) return null
  const mediaKind = raw.mediaKind === 'audio' || raw.mediaKind === 'image'
    ? raw.mediaKind
    : inferReferenceMediaKind(url)
  const createdAt = typeof raw.createdAt === 'number' && Number.isFinite(raw.createdAt) ? raw.createdAt : Date.now()
  const lastUsedAt = typeof raw.lastUsedAt === 'number' && Number.isFinite(raw.lastUsedAt) ? raw.lastUsedAt : createdAt
  return {
    id: typeof raw.id === 'string' && raw.id.trim() ? raw.id : `ref-${createdAt.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    url,
    mediaKind,
    createdAt,
    lastUsedAt,
    ...(typeof raw.sourcePrompt === 'string' && raw.sourcePrompt.trim() ? { sourcePrompt: raw.sourcePrompt.trim().slice(0, 2000) } : {}),
    ...(typeof raw.model === 'string' && raw.model.trim() ? { model: raw.model.trim() } : {}),
    ...(typeof raw.duration === 'number' && Number.isFinite(raw.duration) ? { duration: raw.duration } : {}),
    ...(typeof raw.aspectRatio === 'string' && raw.aspectRatio.trim() ? { aspectRatio: raw.aspectRatio.trim() } : {}),
    ...(typeof raw.includeAudio === 'boolean' ? { includeAudio: raw.includeAudio } : {}),
    ...(raw.qualityPreset === '540p' || raw.qualityPreset === '720p' || raw.qualityPreset === '1080p' ? { qualityPreset: raw.qualityPreset } : {}),
  }
}

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
    return Array.isArray(parsed)
      ? parsed.filter((value) => typeof value === 'string' && isHostedUrl(value)).slice(0, 8)
      : []
  } catch {
    return []
  }
}

const loadReferenceLibrary = (): ReferenceLibraryEntry[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(REFERENCE_LIBRARY_KEY) || '[]') as unknown[]
    if (!Array.isArray(parsed)) return []
    return parsed
      .map(coerceReferenceLibraryEntry)
      .filter((value): value is ReferenceLibraryEntry => value !== null)
      .sort((a, b) => b.lastUsedAt - a.lastUsedAt)
      .slice(0, 120)
  } catch {
    return []
  }
}

const saveToHistory = (entry: HistoryEntry) => {
  const history = loadHistory()
  const previous = history.find((e) => e.taskId === entry.taskId)
  const normalizedEntry = normalizeHistoryModel({
    ...entry,
    starred: entry.starred === true || previous?.starred === true,
  })
  const existing = history.filter((e) => e.taskId !== entry.taskId)
  localStorage.setItem(HISTORY_KEY, JSON.stringify([normalizedEntry, ...existing].slice(0, HISTORY_LIMIT)))
}

const getSimpleSettingsProjectScope = (): string => {
  try {
    const flowCollectionId = (localStorage.getItem(FLOW_ACTIVE_COLLECTION_KEY) || '').trim()
    if (flowCollectionId) return `flow:${flowCollectionId}`
    const storyBible = (localStorage.getItem(STORY_BIBLE_KEY) || '').trim()
    if (storyBible) return `bible:${storyBible.slice(0, 64).toLowerCase()}`
  } catch {
    // Ignore storage lookup failures.
  }
  return 'simple:default'
}

const loadPinnedSimpleSettingsStore = (): PinnedSimpleSettingsStore => {
  try {
    const parsed = JSON.parse(localStorage.getItem(SIMPLE_PINNED_SETTINGS_STORE_KEY) || '{}') as unknown
    if (!parsed || typeof parsed !== 'object') return {}
    const candidate = parsed as Record<string, unknown>
    const next: PinnedSimpleSettingsStore = {}
    Object.entries(candidate).forEach(([scope, value]) => {
      if (!scope || !value || typeof value !== 'object') return
      const raw = value as Partial<PinnedSimpleSettings>
      if (!raw.model || !isToorGenModel(raw.model)) return
      if (raw.aspectRatio !== '4:3' && raw.aspectRatio !== '3:4' && raw.aspectRatio !== '16:9' && raw.aspectRatio !== '9:16') return
      if (raw.qualityPreset !== '540p' && raw.qualityPreset !== '720p' && raw.qualityPreset !== '1080p') return
      if (typeof raw.includeAudio !== 'boolean') return
      next[scope] = {
        model: raw.model,
        aspectRatio: raw.aspectRatio,
        qualityPreset: raw.qualityPreset,
        includeAudio: raw.includeAudio,
      }
    })
    return next
  } catch {
    return {}
  }
}

const savePinnedSimpleSettingsStore = (store: PinnedSimpleSettingsStore) => {
  try {
    localStorage.setItem(SIMPLE_PINNED_SETTINGS_STORE_KEY, JSON.stringify(store))
  } catch {
    // Ignore localStorage failures.
  }
}

const loadQueue = (): QueueItem[] => {
  try {
    const parsed = JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]') as QueueItem[]
    return Array.isArray(parsed)
      ? parsed
        .filter((item) => item && typeof item.id === 'string' && typeof item.status === 'string')
        // Back-fill originalCreatedAt so items saved before this field existed still stale-timeout correctly.
        .map((item) => ({ ...item, originalCreatedAt: item.originalCreatedAt ?? item.createdAt }))
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

const createGenerationName = (collectionTitle: string, sequence: number, generationNodeTitle?: string): string => {
  const baseTitle = collectionTitle.trim() || 'Generation'
  const nodeTitle = (generationNodeTitle || '').trim()
  const runToken = `Run ${sequence.toString().padStart(4, '0')}`
  if (nodeTitle && nodeTitle.toLowerCase() !== baseTitle.toLowerCase()) {
    return `${baseTitle} • ${nodeTitle} • ${runToken}`
  }
  return `${baseTitle} • ${runToken}`
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

const pickTaskId = (payload: StatusPayload): string =>
  payload?.data?.task_id || payload?.data?.id || payload?.taskId || payload?.task_id || payload?.id || ''

const pickVideoUrl = (payload: StatusPayload): string => {
  const data = payload?.data
  if (data) {
    if (Array.isArray(data.outputs) && data.outputs.length > 0) return data.outputs[0]
    if (Array.isArray(data.response) && data.response.length > 0) return data.response[0]
    if (data.video_url) return data.video_url
  }
  if (Array.isArray(payload?.outputs) && payload.outputs.length > 0) return payload.outputs[0]
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

const buildSeedanceRequestErrorMessage = (
  statusCode: number,
  payload: StatusPayload,
  fallbackMessage: string,
  context?: {
    requestedModel?: string
    effectiveModel?: string
    providerUsed?: string
    providerLabel?: string
  },
): string => {
  const upstreamMessage = pickError(payload).trim()
  if (statusCode === 402) {
    const providerUsed = pickProviderUsed(payload) || context?.providerUsed || ''
    const providerLabel = normalizeProviderLabel(providerUsed, pickProviderLabel(payload) || context?.providerLabel)
      || inferProviderLabelFromModel(
        pickEffectiveModel(payload)
        || context?.effectiveModel
        || pickRequestedModel(payload)
        || context?.requestedModel,
      )

    if (providerLabel === 'Atlas Cloud') {
      return 'Atlas credits exhausted. Please add credits in your Atlas Cloud account and try again.'
    }

    if (providerLabel === 'Seedance API') {
      return 'Seedance API credits exhausted. Please add credits for your Seedance API account and try again.'
    }

    return upstreamMessage || 'Generation credits exhausted for the selected provider. Please add credits and try again.'
  }
  return upstreamMessage || fallbackMessage
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

const pickProviderUsed = (payload: StatusPayload): string => {
  const value = payload?.data?.provider_used || payload?.provider_used || payload?.model_proof?.provider_used
  return typeof value === 'string' ? value.trim() : ''
}

const pickProviderLabel = (payload: StatusPayload): string => {
  const value = payload?.data?.provider_label || payload?.provider_label || payload?.model_proof?.provider_label
  return typeof value === 'string' ? value.trim() : ''
}

const normalizeProviderLabel = (providerUsed?: string, providerLabel?: string): string => {
  const explicitLabel = (providerLabel || '').trim()
  if (explicitLabel) return explicitLabel

  const id = (providerUsed || '').trim().toLowerCase()
  if (!id) return ''
  if (id === 'fast' || id === 'atlas' || id === 'atlas-cloud') return 'Atlas Cloud'
  if (id === 'pro' || id === 'seedance' || id === 'seedance-api') return 'Seedance API'
  return providerUsed || ''
}

const inferProviderLabelFromModel = (modelValue?: string): string => {
  const raw = (modelValue || '').trim().toLowerCase()
  if (!raw) return ''
  if (raw.startsWith('atlas-')) return 'Atlas Cloud'
  if (raw.startsWith('seedance-api-')) return 'Seedance API'
  if (raw === 'seedance-2.0-fast') return 'Atlas Cloud'
  if (raw.includes('seedance-2.0') || raw.includes('seedance-1.5')) return 'Seedance API'
  return ''
}

const formatElapsedTime = (milliseconds: number): string => {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  if (minutes > 0) return `${minutes}m ${seconds.toString().padStart(2, '0')}s`
  return `${seconds}s`
}

const toStatusPayloadJson = (payload: unknown): string => {
  try {
    const json = JSON.stringify(payload, null, 2)
    if (!json) return ''
    return json.length > 12000 ? `${json.slice(0, 12000)}\n...truncated` : json
  } catch {
    return String(payload || '')
  }
}

const getAspectRatioClass = (ratio?: string): string => {
  const value = String(ratio || '').trim().replace(/\s+/g, '')
  if (value === '9:16') return 'tg-thumb-ratio-9-16'
  if (value === '4:3') return 'tg-thumb-ratio-4-3'
  if (value === '3:4') return 'tg-thumb-ratio-3-4'
  return 'tg-thumb-ratio-16-9'
}

const getEntryTitle = (entry: Partial<HistoryEntry>): string => {
  const nodeTitle = (entry.generationNodeTitle || '').trim()
  if (nodeTitle) {
    const colTitle = (entry.collectionTitle || '').trim()
    return colTitle ? `${colTitle} - ${nodeTitle}` : nodeTitle
  }
  const prompt = (entry.prompt || '').trim()
  if (prompt && prompt.length <= 100) return prompt
  return 'Rendered video'
}

const getEntryPrompt = (entry: Pick<HistoryEntry, 'sourcePrompt' | 'prompt'>): string => {
  const source = (entry.sourcePrompt || '').trim()
  if (source) return source
  return (entry.prompt || '').trim()
}

const getEntryUsedPrompt = (entry: Pick<HistoryEntry, 'apiPayload' | 'sourcePrompt' | 'prompt'>): string => {
  const usedPrompt = typeof entry.apiPayload?.prompt === 'string' ? entry.apiPayload.prompt.trim() : ''
  if (usedPrompt) return usedPrompt
  return getEntryPrompt(entry)
}

const getShotBatchSummary = (storyContext?: ToorGenStoryContext): string => {
  if (!storyContext || typeof storyContext !== 'object') return ''
  const rawBatch = (storyContext as Record<string, unknown>).shotBatch
  if (!rawBatch || typeof rawBatch !== 'object') return ''
  const batch = rawBatch as Record<string, unknown>
  const index = typeof batch.index === 'number' && Number.isFinite(batch.index) ? Math.floor(batch.index) : 0
  const total = typeof batch.total === 'number' && Number.isFinite(batch.total) ? Math.floor(batch.total) : 0
  const startShot = typeof batch.startShot === 'number' && Number.isFinite(batch.startShot) ? Math.floor(batch.startShot) : 0
  const endShot = typeof batch.endShot === 'number' && Number.isFinite(batch.endShot) ? Math.floor(batch.endShot) : 0
  if (index <= 0 || total <= 0) return ''

  const summary = [`Segment ${index}/${total}`]
  if (startShot > 0 && endShot > 0) {
    summary.push(`Shots ${startShot}-${endShot}`)
  }
  return summary.join(' · ')
}

const getPayloadArrayLength = (payload: Record<string, unknown> | undefined, key: string): number => {
  const value = payload?.[key]
  return Array.isArray(value) ? value.length : 0
}

const getPayloadDuration = (payload: Record<string, unknown> | undefined): number => {
  const candidates = [payload?.video_duration, payload?.duration, payload?.videoDuration]
  for (const candidate of candidates) {
    const numeric = typeof candidate === 'number'
      ? candidate
      : typeof candidate === 'string'
        ? Number(candidate)
        : NaN
    if (Number.isFinite(numeric) && numeric > 0) return Math.max(1, Math.floor(numeric))
  }
  return 0
}

const getSentPayloadSummary = (item: {
  mode?: ToorGenGenerationMode
  duration?: number
  referenceImages?: string[]
  referenceVideos?: string[]
  referenceAudios?: string[]
  apiPayload?: Record<string, unknown>
  studioMode?: 'simple' | 'flow'
}): string => {
  const payload = item.apiPayload || {}
  const payloadMode = typeof payload.mode === 'string' ? payload.mode : ''
  const mode = payloadMode || item.mode || 'text-to-video'
  const duration = getPayloadDuration(payload) || Math.max(1, Math.floor(Number(item.duration) || 5))
  const imageCount = getPayloadArrayLength(payload, 'image_urls') || getPayloadArrayLength(payload, 'images') || (item.referenceImages?.length || 0)
  const videoCount = getPayloadArrayLength(payload, 'reference_videos') || getPayloadArrayLength(payload, 'videos') || (item.referenceVideos?.length || 0)
  const audioCount = getPayloadArrayLength(payload, 'reference_audios') || getPayloadArrayLength(payload, 'audios') || (item.referenceAudios?.length || 0)
  const videoPart = videoCount > 0 ? ` · ${videoCount} video ref${videoCount === 1 ? '' : 's'}` : ''
  const audioPart = audioCount > 0 ? ` · ${audioCount} audio ref${audioCount === 1 ? '' : 's'}` : ''
  const composerStamp = item.studioMode === 'flow' ? 'Flow Canvas' : (item.studioMode === 'simple' ? 'Simple Mode' : '')
  const stampPart = composerStamp ? ` · ${composerStamp}` : ''
  return `Sent: ${mode} · ${duration}s · ${imageCount} image ref${imageCount === 1 ? '' : 's'}${videoPart}${audioPart}${stampPart}`
}

const buildModelProofBadge = (item: {
  model?: ToorGenModel
  requestedModel?: string
  effectiveModel?: string
  providerUsed?: string
  providerLabel?: string
  fallbackAttempted?: boolean
}): { text: string; tone: 'verified' | 'requested' | 'fallback' | 'unknown' } => {
  const requested = item.requestedModel || item.model || ''
  const effective = item.effectiveModel || ''
  const provider = normalizeProviderLabel(item.providerUsed, item.providerLabel)
    || inferProviderLabelFromModel(effective || requested || item.model || '')
  const providerSuffix = provider ? ` · ${provider}` : ''

  if (effective && requested && effective !== requested) {
    if (item.fallbackAttempted) return { text: `Fallback ${effective}${providerSuffix}`, tone: 'fallback' }
    return { text: `Used ${effective}${providerSuffix}`, tone: 'verified' }
  }
  if (effective) return { text: `Used ${effective}${providerSuffix}`, tone: 'verified' }
  if (requested) return { text: `Requested ${requested}${providerSuffix}`, tone: 'requested' }
  return { text: 'Model unknown', tone: 'unknown' }
}

const normalizeStatus = (status?: string): GenerationStatus => {
  const normalized = (status || '').toUpperCase()
  if (!normalized) return 'IDLE'
  if (normalized.includes('SUCCESS') || normalized.includes('COMPLETE') || normalized.includes('DONE')) return 'SUCCESS'
  if (normalized.includes('FAIL')) return 'FAILED'
  if (normalized.includes('PROGRESS') || normalized.includes('PROCESS') || normalized.includes('PENDING') || normalized.includes('QUEUE')) return 'IN_PROGRESS'
  return 'IN_PROGRESS'
}

const isActiveQueueStatus = (status: GenerationStatus) => status === 'SUBMITTING' || status === 'IN_PROGRESS'

let globalAudioContext: AudioContext | null = null
const playNotificationAlert = () => {
  try {
    if (!globalAudioContext) {
      const audioContextWindow = window as Window & { webkitAudioContext?: typeof AudioContext }
      const AudioContextCtor = window.AudioContext || audioContextWindow.webkitAudioContext
      if (!AudioContextCtor) return
      globalAudioContext = new AudioContextCtor()
    }
    if (globalAudioContext.state === 'suspended') {
      globalAudioContext.resume()
    }
    const osc = globalAudioContext.createOscillator()
    const gain = globalAudioContext.createGain()
    osc.type = 'sine'
    // A pleasant soft double ping
    const now = globalAudioContext.currentTime
    osc.frequency.setValueAtTime(880, now) // A5
    osc.frequency.setValueAtTime(1108.73, now + 0.1) // C#6
    
    gain.gain.setValueAtTime(0, now)
    gain.gain.linearRampToValueAtTime(0.1, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1)
    gain.gain.linearRampToValueAtTime(0.1, now + 0.12)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3)

    osc.connect(gain)
    gain.connect(globalAudioContext.destination)
    osc.start(now)
    osc.stop(now + 0.3)
  } catch (err) {
    console.error('Audio alert failed', err)
  }
}

export default function ToorGenPage() {
  const navigate = useNavigate()
  const [prompt, setPrompt] = useState('')
  const [duration, setDuration] = useState<number>(5)
  const [aspectRatio, setAspectRatio] = useState<ToorGenAspectRatio>('16:9')
  const [mode, setMode] = useState<ToorGenGenerationMode>('image-to-video')
  const [seedanceModel, setSeedanceModel] = useState<ToorGenModel>(() => {
    try {
      const saved = localStorage.getItem(MODEL_KEY)
      if (saved && isToorGenModel(saved)) return saved
      return 'seedance-2.0-fast'
    } catch {
      return 'seedance-2.0-fast'
    }
  })

  const [taskId, setTaskId] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [selectedVideoUrl, setSelectedVideoUrl] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [simpleDefaultsOpen, setSimpleDefaultsOpen] = useState(false)
  const [simpleBibleDraft, setSimpleBibleDraft] = useState<BibleDraft | null>(null)
  const [simpleAvailableCredits, setSimpleAvailableCredits] = useState<number | null>(null)
  const [simpleCreditsLoading, setSimpleCreditsLoading] = useState(false)
  const [simpleRefFieldUploading, setSimpleRefFieldUploading] = useState<string | null>(null)
  const [simpleRefFieldUploadError, setSimpleRefFieldUploadError] = useState('')
  const [simpleCharPhotoUploading, setSimpleCharPhotoUploading] = useState<Record<string, boolean>>({})
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
  const [galleryModelFilter, setGalleryModelFilter] = useState<'all' | ToorGenModel>('all')
  const [simpleSettingsScope, setSimpleSettingsScope] = useState(() => getSimpleSettingsProjectScope())
  const [simpleSettingsPinned, setSimpleSettingsPinned] = useState<boolean>(() => {
    const store = loadPinnedSimpleSettingsStore()
    return Boolean(store[getSimpleSettingsProjectScope()])
  })
  const [referenceImageUrl, setReferenceImageUrl] = useState<string>(() => {
    try {
      return localStorage.getItem(REFERENCE_IMAGE_URL_KEY) || ''
    } catch {
      return ''
    }
  })
  const [referenceImageThumbs, setReferenceImageThumbs] = useState<string[]>(() => loadReferenceUploads())
  // Maps image URL → role tag for simple studio. Defaults to 'reference' (not an anchor frame).
  const [imageRoles, setImageRoles] = useState<Record<string, SimpleImageRole>>({})
  const [referenceLibrary, setReferenceLibrary] = useState<ReferenceLibraryEntry[]>(() => loadReferenceLibrary())
  const [referenceLibraryQuery, setReferenceLibraryQuery] = useState('')
  const [isReferenceLibraryDialogOpen, setIsReferenceLibraryDialogOpen] = useState(false)
  const [referenceLibraryTarget, setReferenceLibraryTarget] = useState<'image' | 'audio'>('image')
  const [selectedReferenceLibraryUrls, setSelectedReferenceLibraryUrls] = useState<string[]>([])
  const [pendingReferenceImageRemovalIndex, setPendingReferenceImageRemovalIndex] = useState<number | null>(null)
  const [pendingReferenceLibraryDelete, setPendingReferenceLibraryDelete] = useState<ReferenceLibraryEntry | null>(null)
  const [referenceVideoUrl, setReferenceVideoUrl] = useState<string>(() => {
    try {
      return localStorage.getItem(REFERENCE_VIDEO_URL_KEY) || ''
    } catch {
      return ''
    }
  })
  const [referenceAudioUrl, setReferenceAudioUrl] = useState<string>(() => {
    try {
      return localStorage.getItem(REFERENCE_AUDIO_URL_KEY) || ''
    } catch {
      return ''
    }
  })
  const [extensionVideoUrl, setExtensionVideoUrl] = useState<string>(() => {
    try { return localStorage.getItem(EXTENSION_VIDEO_URL_KEY) || '' } catch { return '' }
  })
  const [refImageUrlEditing, setRefImageUrlEditing] = useState(false)
  const [refVideoUrlEditing, setRefVideoUrlEditing] = useState(false)
  const [refAudioUrlEditing, setRefAudioUrlEditing] = useState(false)
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
  const [videoPlayer, setVideoPlayer] = useState<{ url: string; title: string; meta: string; entry?: HistoryEntry; queueItem?: QueueItem } | null>(null)
  const [videoDetailsOpen, setVideoDetailsOpen] = useState(false)
  const [nodeVideoUrls, setNodeVideoUrls] = useState<Record<string, string>>({})
  const [nodeTerminalStates, setNodeTerminalStates] = useState<Record<string, NodeTerminalState>>({})
  const [isRefreshingQueue, setIsRefreshingQueue] = useState(false)
  const [diagnosticsQueueId, setDiagnosticsQueueId] = useState('')
  const [isRefreshingDiagnostics, setIsRefreshingDiagnostics] = useState(false)
  const [setupLoadedToast, setSetupLoadedToast] = useState('')
  const [showJsonPreview, setShowJsonPreview] = useState(false)
  const [jsonPreviewDraft, setJsonPreviewDraft] = useState('')
  const [jsonPreviewError, setJsonPreviewError] = useState('')
  const [isSubmittingJsonPreview, setIsSubmittingJsonPreview] = useState(false)
  const [activePromptMention, setActivePromptMention] = useState<ActivePromptMention | null>(null)
  const [selectedPromptMentionIndex, setSelectedPromptMentionIndex] = useState(0)
  const [copyIndicatorKey, setCopyIndicatorKey] = useState('')
  const [isEnhancingPrompt, setIsEnhancingPrompt] = useState(false)
  const [enhancedPromptCandidate, setEnhancedPromptCandidate] = useState('')
  const [enhancementOriginalPrompt, setEnhancementOriginalPrompt] = useState('')

  const queueItemsRef = useRef(queueItems)
  const pollingTimersRef = useRef<Record<string, number>>({})
  const lastGenerationNodeIdRef = useRef('')
  const generationSequenceRef = useRef(loadGenerationSequence())
  const referenceUploadInputRef = useRef<HTMLInputElement | null>(null)
  const referenceAudioUploadInputRef = useRef<HTMLInputElement | null>(null)
  const videoModalPlayerRef = useRef<HTMLVideoElement | null>(null)
  const handleSimpleGenerateRef = useRef<() => void>(() => {})
  const promptTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const copyIndicatorTimerRef = useRef<number | null>(null)
  // promptRef always holds the live textarea value; prompt state is only for programmatic changes.
  const promptRef = useRef('')

  const diagnosticsQueueItem = useMemo(
    () => queueItems.find((item) => item.id === diagnosticsQueueId) || null,
    [diagnosticsQueueId, queueItems],
  )

  const nextGenerationName = useCallback((collectionTitle: string, generationNodeTitle?: string) => {
    const nextValue = generationSequenceRef.current + 1
    generationSequenceRef.current = nextValue
    saveGenerationSequence(nextValue)
    return createGenerationName(collectionTitle, nextValue, generationNodeTitle)
  }, [])

  // Sync programmatic prompt state changes into the textarea DOM and the live ref.
  useEffect(() => {
    promptRef.current = prompt
    if (promptTextareaRef.current && promptTextareaRef.current.value !== prompt) {
      promptTextareaRef.current.value = prompt
    }
  }, [prompt])

  useEffect(() => {
    queueItemsRef.current = queueItems
  }, [queueItems])

  useEffect(() => () => {
    if (copyIndicatorTimerRef.current !== null) {
      window.clearTimeout(copyIndicatorTimerRef.current)
      copyIndicatorTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    const nextScope = getSimpleSettingsProjectScope()
    if (nextScope !== simpleSettingsScope) setSimpleSettingsScope(nextScope)
  }, [simpleBibleDraft?.storyBible, simpleSettingsScope, studioMode])

  useEffect(() => {
    const store = loadPinnedSimpleSettingsStore()
    const pinned = store[simpleSettingsScope]
    setSimpleSettingsPinned(Boolean(pinned))
    if (!pinned) return
    setSeedanceModel(pinned.model)
    setAspectRatio(pinned.aspectRatio)
    setQualityPreset(pinned.qualityPreset)
    setIncludeAudio(pinned.includeAudio)
  }, [simpleSettingsScope])

  useEffect(() => {
    if (!simpleSettingsPinned) return
    const store = loadPinnedSimpleSettingsStore()
    store[simpleSettingsScope] = {
      model: seedanceModel,
      aspectRatio,
      qualityPreset,
      includeAudio,
    }
    savePinnedSimpleSettingsStore(store)
  }, [simpleSettingsPinned, simpleSettingsScope, seedanceModel, aspectRatio, qualityPreset, includeAudio])

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
    if (!diagnosticsQueueId) return
    if (!queueItems.some((item) => item.id === diagnosticsQueueId)) {
      setDiagnosticsQueueId('')
    }
  }, [diagnosticsQueueId, queueItems])

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
      localStorage.setItem(REFERENCE_AUDIO_URL_KEY, referenceAudioUrl)
      localStorage.setItem(EXTENSION_VIDEO_URL_KEY, extensionVideoUrl)
      localStorage.setItem(
        REFERENCE_IMAGE_UPLOADS_KEY,
        JSON.stringify(referenceImageThumbs.filter((value) => isHostedUrl(value)).slice(0, 8)),
      )
    } catch {
      // Ignore localStorage failures.
    }
  }, [shotViewMode, qualityPreset, includeAudio, studioMode, referenceImageUrl, referenceVideoUrl, referenceAudioUrl, referenceImageThumbs, extensionVideoUrl])

  useEffect(() => {
    try {
      localStorage.setItem(REFERENCE_LIBRARY_KEY, JSON.stringify(referenceLibrary.slice(0, 120)))
    } catch {
      // Ignore localStorage failures.
    }
  }, [referenceLibrary])

  useEffect(() => {
    if (!setupLoadedToast) return
    const timer = window.setTimeout(() => setSetupLoadedToast(''), 1700)
    return () => window.clearTimeout(timer)
  }, [setupLoadedToast])

  useEffect(() => {
    if (!videoPlayer) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setVideoPlayer(null)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [videoPlayer])

  useEffect(() => {
    setVideoDetailsOpen(false)
  }, [videoPlayer?.url])

  const playHoverPreviewVideo = useCallback((element: HTMLVideoElement) => {
    element.muted = false
    element.volume = 1
    element.currentTime = 0
    void element.play().catch(() => {
      // If the browser blocks unmuted autoplay on hover, fall back to muted preview.
      element.muted = true
      element.volume = 0
      void element.play().catch(() => {})
    })
  }, [])

  const stopHoverPreviewVideo = useCallback((element: HTMLVideoElement) => {
    element.pause()
    element.currentTime = 0
    element.muted = true
    element.volume = 0
  }, [])

  useEffect(() => {
    if (!isReferenceLibraryDialogOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsReferenceLibraryDialogOpen(false)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isReferenceLibraryDialogOpen])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault()
        handleSimpleGenerateRef.current()
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
  }, [])

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

  const appendQueueStatusEvent = useCallback((queueId: string, event: QueueStatusEvent) => {
    setQueueItems((current) => current.map((item) => (
      item.id === queueId
        ? {
            ...item,
            statusTimeline: [...(item.statusTimeline || []), event].slice(-40),
            updatedAt: Date.now(),
          }
        : item
    )))
  }, [])

  const setNodeTerminalState = useCallback((nodeId: string, nextState: NodeTerminalState) => {
    if (!nodeId || nodeId === '__external__') return
    setNodeTerminalStates((current) => ({ ...current, [nodeId]: nextState }))
  }, [])

  const failQueueItem = useCallback((queueItem: QueueItem, message: string) => {
    patchQueueItem(queueItem.id, { status: 'FAILED', errorMessage: message })
    appendQueueStatusEvent(queueItem.id, { at: Date.now(), kind: 'error', message })
    setNodeTerminalState(queueItem.nodeId, {
      status: 'FAILED',
      taskId: queueItem.taskId,
      errorMessage: message,
      requestedModel: queueItem.requestedModel || queueItem.model,
      effectiveModel: queueItem.effectiveModel || queueItem.requestedModel || queueItem.model,
      providerLabel: queueItem.providerLabel || inferProviderLabelFromModel(queueItem.effectiveModel || queueItem.requestedModel || queueItem.model),
    })
    setErrorMessage(message)
    clearPollingTimer(queueItem.id)
    playNotificationAlert()
  }, [appendQueueStatusEvent, patchQueueItem, setNodeTerminalState])

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
      requestedModel: queueItem.requestedModel || queueItem.model,
      effectiveModel: queueItem.effectiveModel || queueItem.requestedModel || queueItem.model,
      providerLabel: queueItem.providerLabel || inferProviderLabelFromModel(queueItem.effectiveModel || queueItem.requestedModel || queueItem.model),
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
        generationNodeTitle: queueItem.generationNodeTitle,
        storyContext: queueItem.storyContext,
        mode: queueItem.mode,
        model: queueItem.model,
        duration: queueItem.duration,
        aspectRatio: queueItem.aspectRatio,
        generationTimeMs,
        requestedModel: queueItem.requestedModel || queueItem.model,
        effectiveModel: queueItem.effectiveModel || queueItem.requestedModel || queueItem.model,
        providerUsed: queueItem.providerUsed,
        providerLabel: queueItem.providerLabel,
        fallbackAttempted: queueItem.fallbackAttempted,
        fallbackReason: queueItem.fallbackReason,
        referenceImages: queueItem.referenceImages,
        referenceVideos: queueItem.referenceVideos,
        referenceAudios: queueItem.referenceAudios,
        qualityPreset: queueItem.qualityPreset,
        includeAudio: queueItem.includeAudio,
        submittedAt: queueItem.submittedAt,
        firstStatusAt: queueItem.firstStatusAt,
        completedAt,
        apiPayload: queueItem.apiPayload,
        ...(nextConsumedCredits !== null ? { consumedCredits: nextConsumedCredits } : {}),
      })
      setHistory(loadHistory())
    }

    setQueueItems((current) => current.filter((item) => item.id !== queueItem.id))
    playNotificationAlert()
  }, [setNodeTerminalState])

  const fetchStatusForQueueItem = useCallback(async (queueItem: QueueItem): Promise<GenerationStatus> => {
    if (!queueItem.taskId) return queueItem.status

    const pollAt = Date.now()
    patchQueueItem(queueItem.id, { lastStatusPollAt: pollAt })
    appendQueueStatusEvent(queueItem.id, { at: pollAt, kind: 'poll', message: 'Polling /status' })

    const statusModel = (queueItem.requestedModel || queueItem.model || '').trim()
    const statusUrl = `${buildApiUrl('/api/seedance/status')}?task_id=${encodeURIComponent(queueItem.taskId)}${statusModel ? `&model=${encodeURIComponent(statusModel)}` : ''}`
    const response = await fetch(statusUrl)
    const payload = await readJsonSafely(response)
    const responseAt = Date.now()
    const payloadJson = toStatusPayloadJson(payload)
    const rawStatus = pickStatus(payload) || `HTTP ${response.status}`
    if (!response.ok) {
      patchQueueItem(queueItem.id, {
        lastStatusResponseAt: responseAt,
        lastStatusApiStatus: rawStatus,
        lastStatusPayloadJson: payloadJson,
      })
      appendQueueStatusEvent(queueItem.id, { at: responseAt, kind: 'response', status: rawStatus })
      throw new Error(buildSeedanceRequestErrorMessage(response.status, payload, 'Failed to fetch generation status.', {
        requestedModel: queueItem.requestedModel || queueItem.model,
        effectiveModel: queueItem.effectiveModel,
        providerUsed: queueItem.providerUsed,
        providerLabel: queueItem.providerLabel,
      }))
    }

    const nextStatus = normalizeStatus(pickStatus(payload))
    const nextConsumedCredits = pickConsumedCredits(payload)
    const nextRequestedModel = pickRequestedModel(payload) || queueItem.requestedModel || queueItem.model || ''
    const nextEffectiveModel = pickEffectiveModel(payload) || queueItem.effectiveModel || nextRequestedModel
    const nextProviderUsed = pickProviderUsed(payload) || queueItem.providerUsed || ''
    const nextProviderLabel = normalizeProviderLabel(nextProviderUsed, pickProviderLabel(payload))
      || queueItem.providerLabel
      || inferProviderLabelFromModel(nextEffectiveModel || nextRequestedModel || queueItem.model || '')
    const nextFallbackAttempted = pickFallbackAttempted(payload) || queueItem.fallbackAttempted === true
    const nextFallbackReason = pickFallbackReason(payload) || queueItem.fallbackReason || ''

    if (nextConsumedCredits !== null) setConsumedCredits(nextConsumedCredits)

    if (nextStatus === 'SUCCESS') {
      const nextVideoUrl = pickVideoUrl(payload)
      finalizeSuccessfulTask({
        ...queueItem,
        requestedModel: nextRequestedModel,
        effectiveModel: nextEffectiveModel,
        providerUsed: nextProviderUsed,
        providerLabel: nextProviderLabel,
        fallbackAttempted: nextFallbackAttempted,
        fallbackReason: nextFallbackReason,
      }, nextVideoUrl, nextConsumedCredits)
      return nextStatus
    }

    if (nextStatus === 'FAILED') {
      const message = pickError(payload) || 'Generation failed.'
      patchQueueItem(queueItem.id, {
        requestedModel: nextRequestedModel,
        effectiveModel: nextEffectiveModel,
        providerUsed: nextProviderUsed,
        providerLabel: nextProviderLabel,
        fallbackAttempted: nextFallbackAttempted,
        fallbackReason: nextFallbackReason,
      })
      failQueueItem({
        ...queueItem,
        requestedModel: nextRequestedModel,
        effectiveModel: nextEffectiveModel,
        providerUsed: nextProviderUsed,
        providerLabel: nextProviderLabel,
        fallbackAttempted: nextFallbackAttempted,
        fallbackReason: nextFallbackReason,
      }, message)
      return nextStatus
    }

    patchQueueItem(queueItem.id, {
      status: nextStatus,
      errorMessage: '',
      firstStatusAt: queueItem.firstStatusAt || Date.now(),
      requestedModel: nextRequestedModel,
      effectiveModel: nextEffectiveModel,
      providerUsed: nextProviderUsed,
      providerLabel: nextProviderLabel,
      fallbackAttempted: nextFallbackAttempted,
      fallbackReason: nextFallbackReason,
      lastStatusResponseAt: responseAt,
      lastStatusApiStatus: nextStatus,
      lastStatusPayloadJson: payloadJson,
      statusPollErrorCount: 0,
      lastStatusError: '',
      lastStatusErrorAt: undefined,
    })
    appendQueueStatusEvent(queueItem.id, { at: responseAt, kind: 'response', status: nextStatus })

    return nextStatus
  }, [appendQueueStatusEvent, failQueueItem, finalizeSuccessfulTask, patchQueueItem])

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
        const nextErrorCount = (latest.statusPollErrorCount || 0) + 1
        patchQueueItem(latest.id, {
          statusPollErrorCount: nextErrorCount,
          lastStatusError: message,
          lastStatusErrorAt: Date.now(),
        })
        appendQueueStatusEvent(latest.id, { at: Date.now(), kind: 'error', message })
      })
    }, 5000)
  }, [appendQueueStatusEvent, fetchStatusForQueueItem, patchQueueItem])

  // When the tab becomes visible again (user switches back), immediately poll
  // all active queue items and restart their intervals. Browsers throttle
  // setInterval in background tabs (sometimes to once per minute), so without
  // this a 20-min generation can finish without the UI ever noticing.
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState !== 'visible') return
      const activeItems = queueItemsRef.current.filter((item) => isActiveQueueStatus(item.status))
      if (activeItems.length === 0) return
      activeItems.forEach((item) => {
        void fetchStatusForQueueItem(item).catch(() => {})
        startPollingForQueueItem(item)
      })
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [fetchStatusForQueueItem, startPollingForQueueItem])

  const clearErrorForInputChange = () => {
    if (errorMessage) setErrorMessage('')
  }

  const showCopyIndicator = useCallback((key: string) => {
    setCopyIndicatorKey(key)
    if (copyIndicatorTimerRef.current !== null) {
      window.clearTimeout(copyIndicatorTimerRef.current)
    }
    copyIndicatorTimerRef.current = window.setTimeout(() => {
      setCopyIndicatorKey('')
      copyIndicatorTimerRef.current = null
    }, 1200)
  }, [])

  const copyTextWithIndicator = useCallback(async (text: string, key: string) => {
    const value = text.trim()
    if (!value) return false
    try {
      await navigator.clipboard.writeText(value)
      showCopyIndicator(key)
      setErrorMessage('')
      return true
    } catch {
      setErrorMessage('Clipboard copy failed.')
      return false
    }
  }, [showCopyIndicator])

  const handleCopyPrompt = async () => {
    void copyTextWithIndicator(promptRef.current, 'simple-prompt-copy')
  }

  const handlePastePrompt = async () => {
    try {
      const pasted = await navigator.clipboard.readText()
      if (!pasted.trim()) return
      setPrompt(pasted)
      setEnhancedPromptCandidate('')
      setEnhancementOriginalPrompt('')
      setErrorMessage('')
      setShowJsonPreview(false)
    } catch {
      setErrorMessage('Clipboard paste failed.')
    }
  }

  const handleEnhancePromptWithAi = async () => {
    const sourcePrompt = promptRef.current.trim()
    if (!sourcePrompt) {
      setErrorMessage('Write a prompt before enhancing it.')
      return
    }

    setIsEnhancingPrompt(true)
    setErrorMessage('')
    try {
      const response = await fetch(buildApiUrl('/api/prompt/enhance'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: sourcePrompt,
          locale: (navigator.language || 'en').toLowerCase().startsWith('ar') ? 'ar' : 'en',
        }),
      })

      const payload = await readJsonSafely(response) as { enhancedPrompt?: string; error?: string }
      if (!response.ok) {
        throw new Error(payload?.error || 'AI enhancement failed.')
      }

      const nextPrompt = (payload?.enhancedPrompt || '').trim()
      if (!nextPrompt) {
        throw new Error('AI returned an empty enhancement.')
      }

      setEnhancementOriginalPrompt(sourcePrompt)
      setEnhancedPromptCandidate(nextPrompt)
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : 'AI enhancement failed.')
    } finally {
      setIsEnhancingPrompt(false)
    }
  }

  const handleApplyEnhancedPrompt = () => {
    if (!enhancedPromptCandidate.trim()) return
    setPrompt(enhancedPromptCandidate)
    setEnhancedPromptCandidate('')
    setEnhancementOriginalPrompt('')
    setShowJsonPreview(false)
    setErrorMessage('')
  }

  const handleKeepOriginalPrompt = () => {
    if (enhancementOriginalPrompt.trim()) {
      setPrompt(enhancementOriginalPrompt)
    }
    setEnhancedPromptCandidate('')
    setEnhancementOriginalPrompt('')
    setShowJsonPreview(false)
    setErrorMessage('')
  }

  const syncActivePromptMention = (nextPrompt: string, caretPosition: number | null | undefined) => {
    if (typeof caretPosition !== 'number') {
      if (activePromptMention !== null) {
        setActivePromptMention(null)
        setSelectedPromptMentionIndex(0)
      }
      return
    }
    const nextMention = findActivePromptMention(nextPrompt, caretPosition)
    // Skip state update when mention stays absent — avoids re-render on most keystrokes.
    if (nextMention === null && activePromptMention === null) return
    setActivePromptMention(nextMention)
    setSelectedPromptMentionIndex(0)
  }

  const handlePromptChange = (nextPrompt: string, caretPosition?: number | null) => {
    promptRef.current = nextPrompt
    clearErrorForInputChange()
    syncActivePromptMention(nextPrompt, caretPosition)
  }

  const insertPromptMention = (option: PromptMentionOption) => {
    const target = promptTextareaRef.current
    const currentPrompt = promptRef.current
    const activeMention = activePromptMention || (target ? findActivePromptMention(currentPrompt, target.selectionStart ?? currentPrompt.length) : null)
    if (!activeMention) return
    const markup = option.kind === 'character'
      ? buildCharacterMentionMarkup(option.tokenValue)
      : buildReferenceMentionMarkup(Number(option.tokenValue.replace(/\D/g, '')) - 1)
    const nextPrompt = `${currentPrompt.slice(0, activeMention.start)}${markup} ${currentPrompt.slice(activeMention.end)}`
    const nextCaret = activeMention.start + markup.length + 1
    clearErrorForInputChange()
    promptRef.current = nextPrompt
    setPrompt(nextPrompt)
    setActivePromptMention(null)
    setSelectedPromptMentionIndex(0)
    requestAnimationFrame(() => {
      if (!promptTextareaRef.current) return
      promptTextareaRef.current.focus()
      promptTextareaRef.current.setSelectionRange(nextCaret, nextCaret)
    })
  }

  const handlePromptTextareaKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!activePromptMention || filteredPromptMentionOptions.length === 0) return
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setSelectedPromptMentionIndex((current) => (current + 1) % filteredPromptMentionOptions.length)
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setSelectedPromptMentionIndex((current) => (current - 1 + filteredPromptMentionOptions.length) % filteredPromptMentionOptions.length)
      return
    }
    if (event.key === 'Enter' || event.key === 'Tab') {
      event.preventDefault()
      insertPromptMention(filteredPromptMentionOptions[selectedPromptMentionIndex] || filteredPromptMentionOptions[0])
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      setActivePromptMention(null)
      setSelectedPromptMentionIndex(0)
    }
  }

  const handlePromptTextareaSelection = (event: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const textarea = event.currentTarget
    syncActivePromptMention(textarea.value, textarea.selectionStart)
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
    // Snap duration to nearest valid value when switching API version
    if (nextModel === 'seedance-1.5') {
      // v1 supports 4/8/12 — map current 5→4, 10→8, 15→12
      setDuration((d) => d <= 6 ? 4 : d <= 11 ? 8 : 12)
    } else if (seedanceModel === 'seedance-1.5') {
      // switching away from v1: map 4→5, 8→10, 12→15
      setDuration((d) => d <= 6 ? 5 : d <= 10 ? 10 : 15)
    }
  }

  const handleToggleSimpleSettingsPin = () => {
    const nextPinned = !simpleSettingsPinned
    setSimpleSettingsPinned(nextPinned)
    const store = loadPinnedSimpleSettingsStore()
    if (nextPinned) {
      store[simpleSettingsScope] = {
        model: seedanceModel,
        aspectRatio,
        qualityPreset,
        includeAudio,
      }
    } else {
      delete store[simpleSettingsScope]
    }
    savePinnedSimpleSettingsStore(store)
  }

  const downloadVideo = async (url: string) => {
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = URL.createObjectURL(blob)
      const ext = url.split('?')[0].split('.').pop()?.toLowerCase() || 'mp4'
      const filename = `toorgen-${Date.now()}.${ext}`
      const anchor = document.createElement('a')
      anchor.href = blobUrl
      anchor.download = filename
      anchor.click()
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000)
    } catch {
      window.open(url, '_blank', 'noopener,noreferrer')
    }
  }

  const handleGenerate = async (request: ToorGenGenerationRequest) => {
    const requestedModel = (request.model || seedanceModel || 'seedance-2.0-fast') as ToorGenModel
    const nodeId = request.generationNodeId
    lastGenerationNodeIdRef.current = nodeId
    setErrorMessage('')
    const generationName = nextGenerationName(request.collectionTitle, request.generationNodeTitle)
    const initialProviderLabel = inferProviderLabelFromModel(requestedModel)

    const queueId = createQueueId()
    const baseQueueItem: QueueItem = {
      id: queueId,
      nodeId,
      generationNodeTitle: request.generationNodeTitle,
      taskId: '',
      prompt: generationName,
      sourcePrompt: request.sourcePrompt,
      collectionId: request.collectionId,
      collectionTitle: request.collectionTitle,
      storyContext: request.storyContext,
      studioMode: request.studioMode || studioMode,
      mode: request.mode,
      model: requestedModel,
      duration: request.duration,
      aspectRatio: request.aspectRatio,
      status: 'SUBMITTING',
      requestedModel,
      effectiveModel: '',
      providerUsed: '',
      providerLabel: initialProviderLabel,
      fallbackAttempted: false,
      fallbackReason: '',
      referenceImages: request.images.map(r => r.url),
      referenceNodes: request.images,
      referenceVideos: request.videos,
      referenceAudios: request.audios,
      qualityPreset,
      includeAudio,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      originalCreatedAt: Date.now(),
      errorMessage: '',
    }

    const hasContinuityBlock = /continuity lock/i.test(request.prompt)
    const hasRoutingBlock = /reference routing:/i.test(request.prompt)
    // Check whether every image already has a routing token in the existing prompt
    const routedImageNums = new Set(
      (request.prompt.match(/\[Image(\d+)\]/gi) || []).map((m) => parseInt(m.replace(/\D/g, ''), 10))
    )
    const allImagesRouted = request.images.length === 0 || request.images.every((_, idx) => routedImageNums.has(idx + 1))
    const needsPromptWrap = request.images.length > 0 && (!hasContinuityBlock || !hasRoutingBlock || !allImagesRouted)
    // If rebuilding a prompt that already contains a routing block, strip the old block first to avoid duplication
    let basePrompt = request.prompt
    if (needsPromptWrap && (hasContinuityBlock || hasRoutingBlock)) {
      const routingIdx = request.prompt.indexOf('\nReference routing:')
      if (routingIdx !== -1) {
        const afterBlock = request.prompt.indexOf('\n\n', routingIdx + 1)
        basePrompt = afterBlock !== -1 ? request.prompt.slice(afterBlock + 2).trim() : request.prompt
      }
    }
    const finalPrompt = (needsPromptWrap ? buildSeedancePrompt(basePrompt, request.images.map((ref, idx) => ({ ...ref, apiName: `Image${idx + 1}` }))) : request.prompt).trim()
    const failValidation = (message: string) => {
      setNodeTerminalState(nodeId, {
        status: 'FAILED',
        taskId: '',
        errorMessage: message,
        requestedModel,
        effectiveModel: requestedModel,
        providerLabel: initialProviderLabel,
      })
      setErrorMessage(message)
    }

    if (!request.hasPrompt || !finalPrompt) {
      failValidation('Connect at least one prompt note or write a global prompt before generating.')
      return
    }

    if (finalPrompt.length > SEEDANCE_PROMPT_CHARACTER_LIMIT) {
      failValidation(`Seedance prompt is ${finalPrompt.length.toLocaleString()} characters. Shorten it to ${SEEDANCE_PROMPT_CHARACTER_LIMIT.toLocaleString()} characters or less.`)
      return
    }

    if (request.mode === 'image-to-video' && request.images.length === 0) {
      failValidation(request.localMediaCount > 0
        ? 'Some local references cannot be sent as generation inputs. Use a hosted http/https URL for unsupported items.'
        : 'Image-to-video needs at least one connected hosted image URL.')
      return
    }

    if (request.mode === 'video-extension' && !request.extensionVideoUrl) {
      failValidation('Extend mode needs a completed source clip. Connect a finished generation node to the “Extend from” socket.')
      return
    }

    if (request.mode === 'video-extension' && request.images.length === 0) {
      failValidation('Extend mode needs at least one image anchor to preserve character/style consistency.')
      return
    }

    const generationPayload: Record<string, unknown> = {
      prompt: finalPrompt,
      model: requestedModel,
      duration: request.duration,
      aspect_ratio: request.aspectRatio,
      public: false,
      ...(request.images.length > 0 ? { images: request.images.map((r) => r.url) } : {}),
      ...(request.videos.length > 0 ? { reference_videos: request.videos } : {}),
      ...(request.audios && request.audios.length > 0 ? { reference_audios: request.audios } : {}),
      ...(request.mode === 'video-extension'
        ? {
            mode: 'video-extension',
            videoUrl: request.extensionVideoUrl,
            video_url: request.extensionVideoUrl,
            source_video_url: request.extensionVideoUrl,
          }
        : {
            mode: request.mode,
          }
      ),
    }

    setQueueItems((current) => [{ ...baseQueueItem, apiPayload: generationPayload }, ...current])

    console.log("[Seedance Payload Debug]", {
      endpoint: '/api/seedance/generate',
      model: requestedModel,
      duration: request.duration,
      aspectRatio: request.aspectRatio,
      imageCount: request.images.length,
      referenceRouting: request.images.map((ref, idx) => ({
        apiName: `Image${idx + 1}`,
        role: ref.role,
        label: ref.label,
        url: ref.url,
      })),
      promptPreview: finalPrompt.slice(0, 1200),
    })

    try {
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
        if (!response.ok) throw new Error(buildSeedanceRequestErrorMessage(response.status, payload, 'Generation request failed.', {
          requestedModel,
          providerLabel: initialProviderLabel,
        }))

      const newTaskId = pickTaskId(payload)
      if (!newTaskId) throw new Error('No task id returned by the backend.')

      const requestedModelFromResponse = pickRequestedModel(payload) || requestedModel
      const effectiveModelFromResponse = pickEffectiveModel(payload) || requestedModelFromResponse
      const providerUsedFromResponse = pickProviderUsed(payload)
      const providerLabelFromResponse = normalizeProviderLabel(providerUsedFromResponse, pickProviderLabel(payload))
        || inferProviderLabelFromModel(effectiveModelFromResponse || requestedModelFromResponse)
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
        providerUsed: providerUsedFromResponse,
        providerLabel: providerLabelFromResponse,
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
        providerUsed: providerUsedFromResponse,
        providerLabel: providerLabelFromResponse,
        fallbackAttempted,
        fallbackReason,
        errorMessage: '',
        lastStatusPollAt: Date.now(),
        lastStatusResponseAt: Date.now(),
        lastStatusApiStatus: initialStatus,
        statusPollErrorCount: 0,
        lastStatusError: '',
        lastStatusPayloadJson: toStatusPayloadJson(payload),
      })
      appendQueueStatusEvent(queueId, { at: Date.now(), kind: 'response', status: initialStatus, message: 'Initial /generate accepted' })

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

  const handleRefreshDiagnostics = async () => {
    if (!diagnosticsQueueItem) return
    setIsRefreshingDiagnostics(true)
    try {
      await fetchStatusForQueueItem(diagnosticsQueueItem)
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Unable to refresh diagnostics.'
      const nextErrorCount = (diagnosticsQueueItem.statusPollErrorCount || 0) + 1
      patchQueueItem(diagnosticsQueueItem.id, {
        statusPollErrorCount: nextErrorCount,
        lastStatusError: message,
        lastStatusErrorAt: Date.now(),
      })
      appendQueueStatusEvent(diagnosticsQueueItem.id, { at: Date.now(), kind: 'error', message })
    } finally {
      setIsRefreshingDiagnostics(false)
    }
  }

  const handleStopQueueItem = (item: QueueItem) => {
    clearPollingTimer(item.id)
    setNodeTerminalState(item.nodeId, {
      status: 'FAILED',
      taskId: item.taskId,
      errorMessage: 'Stopped by user.',
      requestedModel: item.requestedModel || item.model,
      effectiveModel: item.effectiveModel || item.requestedModel || item.model,
      providerLabel: item.providerLabel || inferProviderLabelFromModel(item.effectiveModel || item.requestedModel || item.model),
    })
    setQueueItems((current) => current.map((entry) => (
      entry.id === item.id
        ? { ...entry, status: 'FAILED', errorMessage: 'Stopped by user.', updatedAt: Date.now() }
        : entry
    )))
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
        requestedModel: item.requestedModel || item.model,
        effectiveModel: item.effectiveModel || item.requestedModel || item.model,
        providerLabel: item.providerLabel || inferProviderLabelFromModel(item.effectiveModel || item.requestedModel || item.model),
      })
    }

    setQueueItems((current) => current.map((item) => (
      isActiveQueueStatus(item.status)
        ? { ...item, status: 'FAILED', errorMessage: 'Stopped by user.', updatedAt: Date.now() }
        : item
    )))
  }

  const handleDeleteHistoryEntry = (entry: HistoryEntry) => {
    const title = getEntryPrompt(entry) || entry.taskId || 'this video'
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

  const handleToggleHistoryStar = (entry: HistoryEntry) => {
    const nextHistory = history.map((item) => (
      item.taskId === entry.taskId
        ? { ...item, starred: !item.starred }
        : item
    ))
    setHistory(nextHistory)
    localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory.slice(0, HISTORY_LIMIT)))

    if (videoPlayer?.entry?.taskId === entry.taskId) {
      const nextEntry = nextHistory.find((item) => item.taskId === entry.taskId)
      if (nextEntry) {
        setVideoPlayer({
          ...videoPlayer,
          entry: nextEntry,
        })
      }
    }
  }

  const handleCopyHistoryPrompt = async (entry: HistoryEntry) => {
    const text = getEntryUsedPrompt(entry)
    if (!text) return
    void copyTextWithIndicator(text, `history-prompt-copy-${entry.taskId}`)
  }

  const handleLoadHistoryPrompt = (entry: HistoryEntry) => {
    const text = getEntryPrompt(entry)
    if (!text) return
    setStudioMode('simple')
    setPrompt(text)
    setShowJsonPreview(false)
    setErrorMessage('')
  }

  const handleLoadHistoryUsedPrompt = (entry: HistoryEntry) => {
    const text = getEntryUsedPrompt(entry)
    if (!text) return
    setStudioMode('simple')
    setPrompt(text)
    setShowJsonPreview(false)
    setErrorMessage('')
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
      images: item.referenceNodes || (item.referenceImages || []).map((url, i) => ({
        id: `ref_retry_${i}`,
        url,
        role: retryMode === 'image-to-video' && i === 0 ? 'source_frame' as const : 'style' as const,
        label: 'Reference image',
        priority: i + 1,
      })),
      videos: item.referenceVideos || [],
      audios: item.referenceAudios || [],
      generationNodeTitle: item.generationNodeTitle,
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
      apiPayloadJson: '{}',
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

  const { nodeStatuses, nodeTaskIds, nodeErrorMessages, nodeRequestedModels, nodeEffectiveModels, nodeProviderLabels } = useMemo(() => {
    const statuses: Record<string, ToorGenGenerationStatus> = {}
    const taskIds: Record<string, string> = {}
    const errors: Record<string, string> = {}
    const requestedModels: Record<string, string> = {}
    const effectiveModels: Record<string, string> = {}
    const providerLabels: Record<string, string> = {}

    for (const [nodeId, terminalState] of Object.entries(nodeTerminalStates)) {
      statuses[nodeId] = terminalState.status
      taskIds[nodeId] = terminalState.taskId
      errors[nodeId] = terminalState.errorMessage || ''
      requestedModels[nodeId] = terminalState.requestedModel || ''
      effectiveModels[nodeId] = terminalState.effectiveModel || terminalState.requestedModel || ''
      providerLabels[nodeId] = terminalState.providerLabel || inferProviderLabelFromModel(terminalState.effectiveModel || terminalState.requestedModel || '')
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
      requestedModels[nodeId] = newestTask?.requestedModel || newestTask?.model || requestedModels[nodeId] || ''
      effectiveModels[nodeId] = newestTask?.effectiveModel || newestTask?.requestedModel || newestTask?.model || effectiveModels[nodeId] || ''
      providerLabels[nodeId] = newestTask?.providerLabel
        || inferProviderLabelFromModel(newestTask?.effectiveModel || newestTask?.requestedModel || newestTask?.model || '')
        || providerLabels[nodeId]
        || ''
    }

    return {
      nodeStatuses: statuses,
      nodeTaskIds: taskIds,
      nodeErrorMessages: errors,
      nodeRequestedModels: requestedModels,
      nodeEffectiveModels: effectiveModels,
      nodeProviderLabels: providerLabels,
    }
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
  const hostedAudioUrl = /^https?:\/\//i.test(referenceAudioUrl.trim()) ? referenceAudioUrl.trim() : ''
  const composedImageReferences = useMemo(() => Array.from(new Set([
    ...(hostedImageUrl ? [hostedImageUrl] : []),
    ...referenceImageThumbs,
  ].filter((value) => isHostedUrl(value)))), [hostedImageUrl, referenceImageThumbs])

  const promptMentionOptions = useMemo<PromptMentionOption[]>(() => {
    const availableCharacterCards = (simpleBibleDraft?.characterCards || loadSavedCharacterCardsFromStorage())
      .filter((card) => card && typeof card.name === 'string' && card.name.trim())
    const characterOptions = availableCharacterCards.map((card) => ({
      id: `character:${card.id}`,
      kind: 'character' as const,
      label: card.name.trim(),
      tokenValue: card.name.trim(),
      subtitle: card.role ? `Character • ${card.role}` : 'Character',
      thumbnailUrl: card.photos.find((photo) => isHostedUrl(photo)),
    }))
    const referenceOptions = composedImageReferences.map((url, index) => ({
      id: `reference:${index}`,
      kind: 'reference-image' as const,
      label: `Ref ${index + 1}`,
      tokenValue: `Ref${index + 1}`,
      subtitle: `Reference image ${index + 1} • ${url.slice(0, 56)}${url.length > 56 ? '…' : ''}`,
      thumbnailUrl: url,
    }))
    return [...characterOptions, ...referenceOptions]
  }, [composedImageReferences, simpleBibleDraft])

  const filteredPromptMentionOptions = useMemo(() => {
    if (!activePromptMention) return []
    const query = activePromptMention.query.trim().toLocaleLowerCase()
    if (!query) return promptMentionOptions.slice(0, 8)
    return promptMentionOptions
      .filter((option) => option.label.toLocaleLowerCase().includes(query) || option.tokenValue.toLocaleLowerCase().includes(query))
      .slice(0, 8)
  }, [activePromptMention, promptMentionOptions])

  const upsertReferenceLibraryEntries = useCallback((
    urls: string[],
    overrides?: Partial<ReferenceLibraryEntry>,
  ) => {
    const cleanUrls = Array.from(new Set(urls.map((value) => value.trim()).filter((value) => isHostedUrl(value))))
    if (cleanUrls.length === 0) return

    const fallbackPrompt = promptRef.current.trim()
    const fallbackModel = seedanceModel
    const fallbackDuration = duration
    const fallbackAspectRatio = aspectRatio
    const fallbackAudio = includeAudio
    const fallbackQuality = qualityPreset
    const now = Date.now()

    setReferenceLibrary((current) => {
      const byUrl = new Map(current.map((entry) => [entry.url, entry]))
      for (const url of cleanUrls) {
        const existing = byUrl.get(url)
        const promptValue = (overrides?.sourcePrompt || fallbackPrompt || existing?.sourcePrompt || '').trim()
        const modelValue = (overrides?.model || fallbackModel || existing?.model || '').trim()
        const ratioValue = (overrides?.aspectRatio || fallbackAspectRatio || existing?.aspectRatio || '').trim()
        const durationValue = typeof overrides?.duration === 'number'
          ? overrides.duration
          : typeof existing?.duration === 'number'
            ? existing.duration
            : fallbackDuration
        const includeAudioValue = typeof overrides?.includeAudio === 'boolean'
          ? overrides.includeAudio
          : typeof existing?.includeAudio === 'boolean'
            ? existing.includeAudio
            : fallbackAudio
        const qualityValue = overrides?.qualityPreset || existing?.qualityPreset || fallbackQuality
        const mediaKindValue = overrides?.mediaKind || existing?.mediaKind || inferReferenceMediaKind(url)

        if (existing) {
          byUrl.set(url, {
            ...existing,
            mediaKind: mediaKindValue,
            lastUsedAt: now,
            sourcePrompt: promptValue || existing.sourcePrompt,
            model: modelValue || existing.model,
            duration: Number.isFinite(durationValue) ? durationValue : existing.duration,
            aspectRatio: ratioValue || existing.aspectRatio,
            includeAudio: includeAudioValue,
            qualityPreset: qualityValue,
          })
          continue
        }

        byUrl.set(url, {
          id: `ref-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
          url,
          mediaKind: mediaKindValue,
          createdAt: now,
          lastUsedAt: now,
          ...(promptValue ? { sourcePrompt: promptValue } : {}),
          ...(modelValue ? { model: modelValue } : {}),
          ...(Number.isFinite(durationValue) ? { duration: durationValue } : {}),
          ...(ratioValue ? { aspectRatio: ratioValue } : {}),
          ...(typeof includeAudioValue === 'boolean' ? { includeAudio: includeAudioValue } : {}),
          ...(qualityValue ? { qualityPreset: qualityValue } : {}),
        })
      }

      return Array.from(byUrl.values())
        .sort((a, b) => b.lastUsedAt - a.lastUsedAt)
        .slice(0, 120)
    })
  }, [aspectRatio, duration, includeAudio, qualityPreset, seedanceModel])

  useEffect(() => {
    if (history.length === 0) return
    setReferenceLibrary((current) => {
      const byUrl = new Map(current.map((entry) => [entry.url, entry]))
      let changed = false

      for (const entry of history) {
        const refs = (entry.referenceImages || []).filter((value) => isHostedUrl(value))
        if (refs.length === 0) continue
        const createdAt = typeof entry.createdAt === 'number' && Number.isFinite(entry.createdAt) ? entry.createdAt : Date.now()
        const sourcePrompt = getEntryPrompt(entry)
        const modelValue = (entry.effectiveModel || entry.requestedModel || entry.model || '').trim()
        const ratioValue = (entry.aspectRatio || '').trim()

        for (const url of refs) {
          if (byUrl.has(url)) continue
          changed = true
          byUrl.set(url, {
            id: `ref-${createdAt.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
            url,
            mediaKind: inferReferenceMediaKind(url),
            createdAt,
            lastUsedAt: createdAt,
            ...(sourcePrompt ? { sourcePrompt } : {}),
            ...(modelValue ? { model: modelValue } : {}),
            ...(typeof entry.duration === 'number' && Number.isFinite(entry.duration) ? { duration: entry.duration } : {}),
            ...(ratioValue ? { aspectRatio: ratioValue } : {}),
            ...(typeof entry.includeAudio === 'boolean' ? { includeAudio: entry.includeAudio } : {}),
            ...(entry.qualityPreset === '540p' || entry.qualityPreset === '720p' || entry.qualityPreset === '1080p'
              ? { qualityPreset: entry.qualityPreset }
              : {}),
          })
        }
      }

      if (!changed) return current
      return Array.from(byUrl.values())
        .sort((a, b) => b.lastUsedAt - a.lastUsedAt)
        .slice(0, 120)
    })
  }, [history])

  const uploadReferenceImage = useCallback(async (file: File): Promise<string> => {
    // Primary path: Firebase Storage public URL.
    const ext = file.name.split('.').pop() || 'jpg'
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    try {
      const fileRef = storageRef(storage, `seedance-references/${uniqueName}`)
      await uploadBytes(fileRef, file, { contentType: file.type || 'image/jpeg' })
      const url = await getDownloadURL(fileRef)
      return url
    } catch (firebaseError: unknown) {
      // Fallback path: backend-managed reference upload.
      const response = await fetch(buildApiUrl('/api/seedance/reference-image'), {
        method: 'POST',
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
          'x-file-name': encodeURIComponent(file.name || 'reference-image'),
        },
        body: file,
      })
      const payload = await readJsonSafely(response)
      if (!response.ok) {
        const firebaseMessage = firebaseError instanceof Error ? firebaseError.message : 'Firebase upload failed.'
        throw new Error(`${firebaseMessage} Fallback upload failed: ${pickError(payload) || 'Could not upload image reference.'}`)
      }
      const url = typeof (payload as { url?: unknown }).url === 'string' ? String((payload as { url?: unknown }).url) : ''
      if (!url) throw new Error('Reference upload completed without a valid URL.')
      return url
    }
  }, [])

  const uploadReferenceAudio = useCallback(async (file: File): Promise<string> => {
    const ext = file.name.split('.').pop() || 'mp3'
    const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const fileRef = storageRef(storage, `seedance-references/${uniqueName}`)
    await uploadBytes(fileRef, file, { contentType: file.type || 'audio/mpeg' })
    return getDownloadURL(fileRef)
  }, [])

  const handleAddReferenceImages = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    try {
      const selected = Array.from(files)
      const audioPattern = /\.(mp3|wav)$/i
      const audioFiles = selected.filter((file) => file.type.startsWith('audio/') || audioPattern.test(file.name))
      const imageFiles = selected.filter((file) => file.type.startsWith('image/'))
      const unsupportedFiles = selected.filter((file) => !imageFiles.includes(file) && !audioFiles.includes(file))

      const uploadedImages = await Promise.allSettled(imageFiles.map((file) => uploadReferenceImage(file)))
      const uploadedAudios = await Promise.allSettled(audioFiles.map((file) => uploadReferenceAudio(file)))

      const successfulImageUrls = uploadedImages
        .filter((result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled')
        .map((result) => result.value)
        .filter((value) => isHostedUrl(value))

      const successfulAudioUrls = uploadedAudios
        .filter((result): result is PromiseFulfilledResult<string> => result.status === 'fulfilled')
        .map((result) => result.value)
        .filter((value) => isHostedUrl(value))

      const failedFiles: string[] = []
      let firstFailureMessage = ''
      uploadedImages.forEach((result, index) => {
        if (result.status === 'rejected') {
          failedFiles.push(imageFiles[index]?.name || 'image file')
          if (!firstFailureMessage) {
            firstFailureMessage = result.reason instanceof Error
              ? result.reason.message
              : String(result.reason || 'Upload failed.')
          }
        }
      })
      uploadedAudios.forEach((result, index) => {
        if (result.status === 'rejected') {
          failedFiles.push(audioFiles[index]?.name || 'audio file')
          if (!firstFailureMessage) {
            firstFailureMessage = result.reason instanceof Error
              ? result.reason.message
              : String(result.reason || 'Upload failed.')
          }
        }
      })
      for (const file of unsupportedFiles) {
        failedFiles.push(file.name)
        if (!firstFailureMessage) firstFailureMessage = 'Only image files and MP3/WAV audio are supported.'
      }

      const uniqueSuccessfulImageUrls = Array.from(new Set(successfulImageUrls))
      if (uniqueSuccessfulImageUrls.length > 0) {
        setReferenceImageThumbs((current) => {
          const next = [...current]
          for (const url of uniqueSuccessfulImageUrls) {
            if (!next.includes(url)) next.unshift(url)
          }
          return next.filter((value) => isHostedUrl(value)).slice(0, 8)
        })
        upsertReferenceLibraryEntries(uniqueSuccessfulImageUrls, { mediaKind: 'image' })
      }

      const uniqueSuccessfulAudioUrls = Array.from(new Set(successfulAudioUrls))
      if (uniqueSuccessfulAudioUrls.length > 0) {
        setReferenceAudioUrl(uniqueSuccessfulAudioUrls[0])
        upsertReferenceLibraryEntries(uniqueSuccessfulAudioUrls, { mediaKind: 'audio' })
      }

      if (failedFiles.length > 0) {
        const reasonSuffix = firstFailureMessage ? ` First error: ${firstFailureMessage}` : ''
        setErrorMessage(`Uploaded ${uniqueSuccessfulImageUrls.length} image(s) and ${uniqueSuccessfulAudioUrls.length} audio file(s). ${failedFiles.length} file(s) failed.${reasonSuffix}`)
      } else {
        setErrorMessage('')
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Could not process selected files.'
      setErrorMessage(message)
    }
  }

  const handleReferenceUploadInputChange = (files: FileList | null) => {
    void handleAddReferenceImages(files)
  }

  const handleOpenReferenceUpload = () => {
    referenceUploadInputRef.current?.click()
  }
  
  const handleReferenceAudioUploadInputChange = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    const isMp3 = file.type === 'audio/mpeg' || /\.mp3$/i.test(file.name)
    const isWav = file.type === 'audio/wav' || file.type === 'audio/x-wav' || /\.wav$/i.test(file.name)
    if (!isMp3 && !isWav) {
      setErrorMessage('Audio reference must be MP3 or WAV.')
      return
    }
    try {
      const url = await uploadReferenceAudio(file)
      setReferenceAudioUrl(url)
      upsertReferenceLibraryEntries([url], { mediaKind: 'audio' })
      setErrorMessage('')
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Could not upload selected audio file.'
      setErrorMessage(message)
    }
  }

  const handleOpenReferenceAudioUpload = () => {
    referenceAudioUploadInputRef.current?.click()
  }

  const handleOpenReferenceLibraryDialog = (target: 'image' | 'audio' = 'image') => {
    setReferenceLibraryTarget(target)
    const libraryUrls = new Set(
      referenceLibrary
        .filter((entry) => entry.mediaKind === target)
        .map((entry) => entry.url),
    )
    if (target === 'audio') {
      setSelectedReferenceLibraryUrls(referenceAudioUrl && libraryUrls.has(referenceAudioUrl) ? [referenceAudioUrl] : [])
    } else {
      setSelectedReferenceLibraryUrls(referenceImageThumbs.filter((url) => libraryUrls.has(url)))
    }
    setIsReferenceLibraryDialogOpen(true)
  }

  const handleOpenBibleDefaultsFromSimpleMode = () => {
    setSimpleBibleDraft(loadSharedBibleDraft(mode, seedanceModel, duration, aspectRatio))
    setSimpleDefaultsOpen(true)
    void (async () => {
      setSimpleCreditsLoading(true)
      try {
        const response = await fetch(buildApiUrl('/api/seedance/account'))
        if (!response.ok) {
          setSimpleAvailableCredits(null)
          return
        }
        const payload = await readJsonSafely(response) as { balance?: unknown; credits?: unknown; available_credits?: unknown }
        const balance = payload.balance ?? payload.credits ?? payload.available_credits
        setSimpleAvailableCredits(typeof balance === 'number' ? balance : null)
      } catch {
        setSimpleAvailableCredits(null)
      } finally {
        setSimpleCreditsLoading(false)
      }
    })()
  }

  const handleCloseSimpleBibleDefaults = () => {
    setSimpleDefaultsOpen(false)
    setSimpleBibleDraft(null)
    setSimpleRefFieldUploadError('')
    setSimpleRefFieldUploading(null)
  }

  const handleSaveSimpleBibleDefaults = () => {
    if (!simpleBibleDraft) return
    const nextDraft = {
      ...simpleBibleDraft,
      shotsPerSegment: Math.min(6, Math.max(1, Math.floor(simpleBibleDraft.shotsPerSegment || 3))),
      characterCards: simpleBibleDraft.characterCards.slice(0, 8),
    }
    try {
      localStorage.setItem(STORY_BIBLE_KEY, nextDraft.storyBible)
      localStorage.setItem(STYLE_PREFIX_KEY, nextDraft.stylePrefix)
      localStorage.setItem(CONTINUITY_BLOCK_KEY, nextDraft.continuityBlock)
      localStorage.setItem(CHARACTER_CARDS_KEY, JSON.stringify(nextDraft.characterCards))
      localStorage.setItem('toorgen_audio_refs_v1', JSON.stringify(nextDraft.fallbackAudioUrls))
      localStorage.setItem('toorgen_strict_consistency_preset_v1', nextDraft.strictConsistencyPreset ? '1' : '0')
      localStorage.setItem('toorgen_auto_shot_split_v1', nextDraft.autoShotSplit ? '1' : '0')
      localStorage.setItem('toorgen_shots_per_segment_v1', String(nextDraft.shotsPerSegment))
    } catch {
      // Ignore localStorage failures.
    }
    setDuration(nextDraft.duration)
    setAspectRatio(nextDraft.aspectRatio)
    setMode(nextDraft.mode)
    setSeedanceModel(nextDraft.model)
    setSimpleBibleDraft(nextDraft)
    setSimpleDefaultsOpen(false)
  }

  const handleSimpleDialogRefUpload = useCallback(async (slot: string, kind: 'image' | 'video' | 'audio', file: File) => {
    setSimpleRefFieldUploading(slot)
    setSimpleRefFieldUploadError('')
    try {
      const url = kind === 'audio' ? await uploadReferenceAudio(file) : await uploadReferenceImage(file)
      setSimpleBibleDraft((current) => {
        if (!current) return current
        if (slot === 'image1') return { ...current, fallbackImageUrl: url }
        if (slot === 'video1') return { ...current, fallbackVideoUrl: url }
        if (slot === 'video2') return { ...current, fallbackVideoUrl2: url }
        if (slot === 'video3') return { ...current, fallbackVideoUrl3: url }
        if (slot === 'audio1') return { ...current, fallbackAudioUrls: [url, current.fallbackAudioUrls[1], current.fallbackAudioUrls[2]] }
        if (slot === 'audio2') return { ...current, fallbackAudioUrls: [current.fallbackAudioUrls[0], url, current.fallbackAudioUrls[2]] }
        if (slot === 'audio3') return { ...current, fallbackAudioUrls: [current.fallbackAudioUrls[0], current.fallbackAudioUrls[1], url] }
        return current
      })
    } catch (error) {
      setSimpleRefFieldUploadError(error instanceof Error ? error.message : 'Upload failed.')
    } finally {
      setSimpleRefFieldUploading(null)
    }
  }, [uploadReferenceAudio, uploadReferenceImage])

  const handleSimpleDialogCharacterPhotoUpload = useCallback(async (cardId: string, file: File) => {
    setSimpleCharPhotoUploading((current) => ({ ...current, [cardId]: true }))
    try {
      const url = await uploadReferenceImage(file)
      setSimpleBibleDraft((current) => current ? {
        ...current,
        characterCards: current.characterCards.map((card) =>
          card.id === cardId
            ? { ...card, photos: [...(card.photos || []), url].filter(Boolean).slice(0, 5) }
            : card,
        ),
      } : current)
    } finally {
      setSimpleCharPhotoUploading((current) => ({ ...current, [cardId]: false }))
    }
  }, [uploadReferenceImage])

  const cycleImageRole = (url: string) => {
    setImageRoles((current) => {
      const currentRole = current[url] || 'reference'
      const next: SimpleImageRole = currentRole === 'reference' ? 'start_frame' : currentRole === 'start_frame' ? 'end_frame' : 'reference'
      return { ...current, [url]: next }
    })
  }

  const handleRemoveReferenceImage = (index: number) => {
    setPendingReferenceImageRemovalIndex(index)
  }

  const applyReferenceLibrarySelection = (urls: string[]) => {
    setReferenceImageThumbs((current) => {
      const selectedSet = new Set(urls.filter((value) => isHostedUrl(value)))
      const nonLibraryCurrent = current.filter((value) => isHostedUrl(value) && !referenceLibrary.some((entry) => entry.url === value))
      const next = [...urls.filter((value) => isHostedUrl(value)), ...nonLibraryCurrent]
      const deduped = Array.from(new Set(next)).slice(0, 8)
      if (selectedSet.size + nonLibraryCurrent.length > 8) {
        setErrorMessage('Only 8 reference images can be active at once. Extra selections were ignored.')
      }
      return deduped
    })
    const selectedEntries = referenceLibrary.filter((entry) => urls.includes(entry.url))
    selectedEntries.forEach((entry) => {
      upsertReferenceLibraryEntries([entry.url], {
        sourcePrompt: entry.sourcePrompt,
        model: entry.model,
        duration: entry.duration,
        aspectRatio: entry.aspectRatio,
        includeAudio: entry.includeAudio,
        qualityPreset: entry.qualityPreset,
      })
    })
    setErrorMessage('')
  }

  const handleToggleReferenceLibraryEntry = (entry: ReferenceLibraryEntry) => {
    if (entry.mediaKind === 'audio') {
      setSelectedReferenceLibraryUrls((current) => current[0] === entry.url ? [] : [entry.url])
      return
    }
    setSelectedReferenceLibraryUrls((current) => (
      current.includes(entry.url)
        ? current.filter((value) => value !== entry.url)
        : [entry.url, ...current.filter((value) => value !== entry.url)]
    ))
  }

  const handleConfirmReferenceLibrarySelection = () => {
    if (referenceLibraryTarget === 'audio') {
      const selectedAudio = selectedReferenceLibraryUrls[0] || ''
      if (selectedAudio) setReferenceAudioUrl(selectedAudio)
    } else {
      applyReferenceLibrarySelection(selectedReferenceLibraryUrls)
    }
    setIsReferenceLibraryDialogOpen(false)
  }

  const handleUseReferenceLibraryEntryWithSetup = (entry: ReferenceLibraryEntry) => {
    if (entry.mediaKind === 'audio') {
      setReferenceAudioUrl(entry.url)
    } else {
      applyReferenceLibrarySelection([entry.url])
    }
    setSelectedReferenceLibraryUrls([entry.url])
    setIsReferenceLibraryDialogOpen(false)

    if (entry.sourcePrompt) {
      setPrompt(entry.sourcePrompt)
    }

    const modelValue = (entry.model || '').trim()
    if (isToorGenModel(modelValue)) {
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

    setSetupLoadedToast('Reference setup loaded')
  }

  const handleRequestRemoveReferenceLibraryEntry = (entry: ReferenceLibraryEntry) => {
    setPendingReferenceLibraryDelete(entry)
  }

  const handleRemoveReferenceLibraryEntry = (entryId: string) => {
    const removedUrl = referenceLibrary.find((entry) => entry.id === entryId)?.url || ''
    setReferenceLibrary((current) => current.filter((entry) => entry.id !== entryId))
    if (removedUrl) {
      setSelectedReferenceLibraryUrls((current) => current.filter((url) => url !== removedUrl))
    }
  }

  const buildSimplePayload = () => {
    const composerPrompt = promptRef.current.trim()

    // Load all bible fields from localStorage (saved via Bible & Defaults dialog)
    let continuityBlock = DEFAULT_CONTINUITY_BLOCK
    let globalStoryBible = ''
    let globalCharacterCards: CharacterCard[] = []
    try {
      const saved = localStorage.getItem(CONTINUITY_BLOCK_KEY)
      if (saved !== null) continuityBlock = saved
      globalStoryBible = localStorage.getItem(STORY_BIBLE_KEY) || ''
      const parsed = JSON.parse(localStorage.getItem(CHARACTER_CARDS_KEY) || '[]') as unknown[]
      globalCharacterCards = Array.isArray(parsed)
        ? (parsed as CharacterCard[]).filter((c) => c && typeof c === 'object' && c.name)
        : []
    } catch { /* ignore */ }

    const promptLower = composerPrompt.toLocaleLowerCase()
    const attachedReferenceUrls = new Set(composedImageReferences)
    const matchedCharacterCards = globalCharacterCards.filter((card) => {
      const normalizedName = card.name.trim().toLocaleLowerCase()
      const nameMatched = Boolean(normalizedName) && promptLower.includes(normalizedName)
      const mentionMatched = composerPrompt.includes(buildCharacterMentionMarkup(card.name))
      const photoMatched = Array.isArray(card.photos) && card.photos.some((photo) => attachedReferenceUrls.has(photo))
      return nameMatched || mentionMatched || photoMatched
    })
    const activeCharacterCards = matchedCharacterCards.length > 0
      ? matchedCharacterCards
      : globalCharacterCards.length === 1
        ? globalCharacterCards
        : []

    // ── Single source of truth for images + routing ──────────────────────────
    // Build `imageSlots` once. Both the images array and the routing block are
    // derived from this list, so they are always structurally identical.
    //
    // Priority order:
    //   1. Named character cards that have a hosted photo — one slot per card,
    //      in card-list order.  If two cards share the same URL it is counted
    //      only for the first card.
    //   2. Composer-attached images not already represented by a character slot.
    //
    // This means:
    //   • Every array slot has a known owner — no unassigned gaps.
    //   • Adding / removing a character card photo automatically adjusts both
    //     the array and the routing text without any manual sync.
    const seenUrls = new Set<string>()
    const imageSlots: SimpleImageSlot[] = []

    // Pass 1 — character cards (deterministic order)
    activeCharacterCards.forEach((card) => {
      if (!card.name || !card.photos) return
      const photo = card.photos.find((p) => isHostedUrl(p))
      if (!photo) return
      if (!seenUrls.has(photo)) {
        seenUrls.add(photo)
        imageSlots.push({ url: photo, characterName: card.name })
      }
    })

    // Pass 2 — extra composer images not already covered by a character slot
    composedImageReferences.forEach((url) => {
      if (!seenUrls.has(url)) {
        seenUrls.add(url)
        const imageRole = imageRoles[url] || 'reference'
        imageSlots.push({ url, imageRole })
      }
    })

    // Derive images array and routing block from the same `imageSlots` list
    const mergedImages = imageSlots.map((s) => s.url)
    const effectiveModel = seedanceModel
    const normalizedContinuityBlock = normalizeSimpleContinuityBlock(continuityBlock)
    const namedCharacterSlots = imageSlots
      .map((slot, index) => ({ ...slot, imageNumber: index + 1 }))
      .filter((slot): slot is SimpleImageSlot & { characterName: string; imageNumber: number } => Boolean(slot.characterName))
    const imageUrlToNumber = new Map(imageSlots.map((slot, index) => [slot.url, index + 1]))

    let normalizedComposerPrompt = composerPrompt
    activeCharacterCards.forEach((card) => {
      normalizedComposerPrompt = replaceAllMentions(normalizedComposerPrompt, buildCharacterMentionMarkup(card.name), card.name.trim())
    })
    composedImageReferences.forEach((url, index) => {
      const imageNumber = imageUrlToNumber.get(url)
      if (!imageNumber) return
      normalizedComposerPrompt = replaceAllMentions(normalizedComposerPrompt, buildReferenceMentionMarkup(index), `[Image${imageNumber}]`)
    })
    normalizedComposerPrompt = normalizedComposerPrompt.replace(/@\{([^}]+)\}/g, '$1')

    const refRoutingLines: string[] = []
    if (imageSlots.length > 0) {
      imageSlots.forEach((slot, i) => {
        const n = i + 1
        if (slot.characterName) {
          const otherNames = namedCharacterSlots
            .filter((other) => other.characterName !== slot.characterName)
            .map((other) => other.characterName)
          const neverUseClause = otherNames.length === 0
            ? ''
            : otherNames.length === 1
              ? ` Never use [Image${n}] for ${otherNames[0]}.`
              : ` Never use [Image${n}] for any other character.`
          refRoutingLines.push(`- [Image${n}] is ${slot.characterName} only. Use [Image${n}] whenever ${slot.characterName} appears. Match ${slot.characterName}'s face, age, hair, outfit, and identity to [Image${n}].${neverUseClause}`)
        } else if (slot.imageRole === 'start_frame') {
          refRoutingLines.push(`- [Image${n}] is the starting frame of the clip. The video must begin with this exact frame.`)
        } else if (slot.imageRole === 'end_frame') {
          refRoutingLines.push(`- [Image${n}] is the ending frame of the clip. The video must end with this exact frame.`)
        } else {
          refRoutingLines.push(`- [Image${n}] is a scene/style reference only. Use it for environment, wardrobe, palette, and mood.`)
        }
      })
      if (namedCharacterSlots.length > 1) {
        const imageRefs = namedCharacterSlots.map((slot) => `[Image${slot.imageNumber}]`).join(' and ')
        refRoutingLines.push(`- Never merge, swap, or blend the identities from ${imageRefs}. Do not invent a third character design.`)
      }
    }
    const refRoutingBlock = refRoutingLines.length > 0
      ? `Reference routing:\n${refRoutingLines.join('\n')}`
      : ''

    // Build character block
    const characterBlock = activeCharacterCards.length > 0
      ? [
          'Characters:',
          ...activeCharacterCards.map((card, index) => {
            const parts = [
              card.name ? `${index + 1}. ${card.name}` : `${index + 1}. Character`,
              card.role ? `Role: ${card.role}` : '',
              card.appearance ? `Appearance: ${card.appearance}` : '',
              card.notes ? `Continuity notes: ${card.notes}` : '',
            ].filter(Boolean)
            return `- ${parts.join(' | ')}`
          }),
        ].join('\n')
      : ''

    // Assemble full API prompt from 5 sections
    const composedPrompt = [
      normalizedContinuityBlock,
      refRoutingBlock,
      normalizedComposerPrompt || '(Write a prompt)',
      characterBlock,
      globalStoryBible ? `Story bible constraints: ${globalStoryBible}` : '',
    ].filter(Boolean).join('\n\n')

    return { composerPrompt, composedPrompt, globalStoryBible, activeCharacterCards, mergedImages, imageSlots, effectiveModel }
  }

  const buildSimplePreviewJson = () => {
    const { composedPrompt, mergedImages, imageSlots, effectiveModel } = buildSimplePayload()
    const modelNeedsI2vAnchor = effectiveModel === 'seedance-2.0-fast'
    const hasExplicitStartFrame = imageSlots.some((s) => s.imageRole === 'start_frame')
    const effectiveMode = mode === 'video-extension'
      ? mode
      : (hasExplicitStartFrame || (mergedImages.length > 0 && modelNeedsI2vAnchor))
        ? 'image-to-video'
        : mode
    return JSON.stringify(
      {
        prompt: composedPrompt,
        model: effectiveModel,
        mode: effectiveMode,
        duration,
        aspect_ratio: aspectRatio,
        public: false,
        ...(mergedImages.length > 0 ? { images: mergedImages } : {}),
        ...(hostedVideoUrl ? { reference_videos: [hostedVideoUrl] } : {}),
        ...(hostedAudioUrl ? { reference_audios: [hostedAudioUrl] } : {}),
        ...(mode === 'video-extension' && extensionVideoUrl
          ? {
              videoUrl: extensionVideoUrl,
              video_url: extensionVideoUrl,
              source_video_url: extensionVideoUrl,
            }
          : {}),
      },
      null,
      2,
    )
  }

  const parsePreviewImages = (value: unknown): VideoReference[] => {
    const { imageSlots } = buildSimplePayload()
    if (!Array.isArray(value)) return []
    return value
      .map((item, index) => {
        const slot = imageSlots[index]
        const fallbackRole = slot?.characterName
          ? 'character'
          : 'style'
        const fallbackLabel = slot?.characterName || `Reference image ${index + 1}`

        if (typeof item === 'string') {
          const url = item.trim()
          if (!url) return null
          return {
            id: `preview_image_${index}_${Date.now()}`,
            url,
            role: fallbackRole,
            label: fallbackLabel,
            priority: index + 1,
          }
        }

        if (!item || typeof item !== 'object') return null
        const candidate = item as Partial<VideoReference> & { url?: unknown }
        if (typeof candidate.url !== 'string' || !candidate.url.trim()) return null
        const role = candidate.role === 'source_frame' || candidate.role === 'character' || candidate.role === 'location' || candidate.role === 'style' || candidate.role === 'moodboard' || candidate.role === 'color' || candidate.role === 'prop'
          ? candidate.role
          : fallbackRole
        return {
          id: typeof candidate.id === 'string' && candidate.id.trim() ? candidate.id : `preview_image_${index}_${Date.now()}`,
          url: candidate.url.trim(),
          role,
          label: typeof candidate.label === 'string' && candidate.label.trim() ? candidate.label : fallbackLabel,
          priority: typeof candidate.priority === 'number' && Number.isFinite(candidate.priority) ? candidate.priority : index + 1,
        }
      })
      .filter((item): item is VideoReference => Boolean(item))
  }

  const submitEditedJsonPreview = async () => {
    setJsonPreviewError('')
    let payload: Record<string, unknown>
    try {
      payload = JSON.parse(jsonPreviewDraft) as Record<string, unknown>
    } catch {
      setJsonPreviewError('Payload preview is not valid JSON.')
      return
    }

    const promptText = typeof payload.prompt === 'string' ? payload.prompt.trim() : ''
    if (!promptText) {
      setJsonPreviewError('Payload needs a prompt before it can be submitted.')
      return
    }

    const { globalStoryBible, effectiveModel } = buildSimplePayload()
    const images = parsePreviewImages(payload.images)
    const videos = [
      ...(Array.isArray(payload.reference_videos) ? payload.reference_videos : []),
      ...(Array.isArray(payload.videos) ? payload.videos : []),
    ].filter((value): value is string => typeof value === 'string' && /^https?:\/\//i.test(value))
    const audios = [
      ...(Array.isArray(payload.reference_audios) ? payload.reference_audios : []),
      ...(Array.isArray(payload.audios) ? payload.audios : []),
    ].filter((value): value is string => typeof value === 'string' && /^https?:\/\//i.test(value))
    const requestedModel = typeof payload.model === 'string' && payload.model.trim() ? payload.model : effectiveModel
    const modelNeedsI2vAnchor = requestedModel === 'seedance-2.0-fast'
    const requestedMode = typeof payload.mode === 'string'
      ? payload.mode
      : mode === 'video-extension'
        ? mode
        : images.length > 0 && modelNeedsI2vAnchor
          ? 'image-to-video'
          : mode
    const requestedAspectRatio = typeof payload.aspect_ratio === 'string' ? payload.aspect_ratio : aspectRatio
    const requestedDuration = typeof payload.duration === 'number' && Number.isFinite(payload.duration) ? payload.duration : duration

    setIsSubmittingJsonPreview(true)
    try {
      await handleGenerate({
        prompt: promptText,
        sourcePrompt: typeof payload.sourcePrompt === 'string' && payload.sourcePrompt.trim() ? payload.sourcePrompt.trim() : promptRef.current.trim(),
        generationNodeTitle: 'Simple Composer',
        images,
        videos,
        audios,
        model: requestedModel as ToorGenModel,
        localMediaCount: images.filter((item) => !isHostedUrl(item.url)).length,
        duration: requestedDuration,
        aspectRatio: requestedAspectRatio as ToorGenAspectRatio,
        mode: requestedMode as ToorGenGenerationMode,
        graphJson: JSON.stringify(payload, null, 2),
        hasPrompt: true,
        collectionId: 'simple',
        collectionTitle: 'Generations',
        generationNodeId: 'simple-composer',
        storyContext: { projectRules: globalStoryBible, narrativeGoal: '' },
        studioMode: 'simple',
        apiPayloadJson: JSON.stringify(payload, null, 2),
      })
      setShowJsonPreview(false)
    } catch (error) {
      setJsonPreviewError(error instanceof Error ? error.message : 'Unable to submit payload preview.')
    } finally {
      setIsSubmittingJsonPreview(false)
    }
  }

  const handleSimpleGenerate = () => {
    const { composerPrompt, composedPrompt, globalStoryBible, mergedImages, imageSlots, effectiveModel } = buildSimplePayload()
    if (!composerPrompt) {
      setErrorMessage('Write a prompt before generating.')
      return
    }

    if (mode === 'video-extension' && !extensionVideoUrl.trim()) {
      setErrorMessage('Paste or select a source video to extend.')
      return
    }

    if (mode === 'video-extension' && mergedImages.length === 0) {
      setErrorMessage('Extend mode needs at least one image anchor to preserve character/style consistency.')
      return
    }

    const modelNeedsI2vAnchor = effectiveModel === 'seedance-2.0-fast'
    const hasExplicitStartFrame = imageSlots.some((s) => s.imageRole === 'start_frame')
    const effectiveMode = mode === 'video-extension'
      ? mode
      : (hasExplicitStartFrame || (mergedImages.length > 0 && modelNeedsI2vAnchor))
        ? 'image-to-video'
        : mode

    void handleGenerate({
      prompt: composedPrompt,
      sourcePrompt: composerPrompt,
      images: imageSlots.map((slot, i) => ({
        id: `ref_simple_${Date.now()}_${i}`,
        url: slot.url,
        role: slot.characterName ? 'character' : slot.imageRole === 'start_frame' ? 'source_frame' : slot.imageRole === 'end_frame' ? 'end_frame' : 'style',
        label: slot.characterName || `Reference image ${i + 1}`,
        priority: i + 1,
      })),
      videos: hostedVideoUrl ? [hostedVideoUrl] : [],
      audios: hostedAudioUrl ? [hostedAudioUrl] : [],
      generationNodeTitle: 'Simple Composer',
      storyContext: { projectRules: globalStoryBible, narrativeGoal: '' },
      localMediaCount: referenceImageThumbs.filter((value) => !isHostedUrl(value)).length + (referenceImageUrl.trim() && !hostedImageUrl ? 1 : 0) + (referenceVideoUrl.trim() && !hostedVideoUrl ? 1 : 0) + (referenceAudioUrl.trim() && !hostedAudioUrl ? 1 : 0),
      duration,
      aspectRatio,
      mode: effectiveMode,
      graphJson: JSON.stringify({
        prompt: composedPrompt,
        references: {
          image: referenceImageUrl.trim(),
          imageUploads: referenceImageThumbs.length,
          video: referenceVideoUrl.trim(),
          audio: referenceAudioUrl.trim(),
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
      model: effectiveModel,
      apiPayloadJson: '{}',
      extensionVideoUrl: mode === 'video-extension' ? extensionVideoUrl.trim() : undefined,
    })
  }

  handleSimpleGenerateRef.current = handleSimpleGenerate

  const handleLoadShotSetup = (entry: HistoryEntry) => {
    const refs = entry.referenceImages || []
    const hostedImage = refs.find((value) => /^https?:\/\//i.test(value)) || ''
    const uploadedRefs = refs.filter((value) => value !== hostedImage && isHostedUrl(value)).slice(0, 8)

    setPrompt(getEntryPrompt(entry))
    setReferenceImageUrl(hostedImage)
    setReferenceImageThumbs(uploadedRefs)
    setReferenceVideoUrl(entry.referenceVideos?.[0] || '')
    setReferenceAudioUrl(entry.referenceAudios?.[0] || '')

    upsertReferenceLibraryEntries(refs, {
      sourcePrompt: getEntryPrompt(entry),
      model: entry.effectiveModel || entry.requestedModel || entry.model,
      duration: entry.duration,
      aspectRatio: entry.aspectRatio,
      includeAudio: entry.includeAudio,
      qualityPreset: entry.qualityPreset,
    })

    const modelValue = (entry.model || entry.requestedModel || '').trim()
    if (isToorGenModel(modelValue)) {
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
        entry.sourcePrompt,
        entry.prompt,
        entry.taskId,
        entry.starred ? 'star starred favorite' : '',
        entry.effectiveModel,
        entry.requestedModel,
        entry.model,
        entry.aspectRatio,
        typeof entry.duration === 'number' ? `${entry.duration}` : '',
        entry.includeAudio === true ? 'audio on' : entry.includeAudio === false ? 'audio off' : '',
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

  const filteredReferenceLibrary = useMemo(() => {
    const query = referenceLibraryQuery.trim().toLowerCase()
    const next = referenceLibrary.filter((entry) => {
      if (entry.mediaKind !== referenceLibraryTarget) return false
      if (!query) return true
      const haystack = [
        entry.sourcePrompt,
        entry.model,
        entry.aspectRatio,
        typeof entry.duration === 'number' ? `${entry.duration}` : '',
        entry.includeAudio === true ? 'audio on' : entry.includeAudio === false ? 'audio off' : '',
      ].filter(Boolean).join(' ').toLowerCase()
      return haystack.includes(query)
    })
    return next.slice(0, 36)
  }, [referenceLibrary, referenceLibraryQuery, referenceLibraryTarget])

  const referenceLibrarySelectedCount = selectedReferenceLibraryUrls.length
  const pendingReferenceLibraryDeleteLabel = (pendingReferenceLibraryDelete?.sourcePrompt || `this reference ${pendingReferenceLibraryDelete?.mediaKind || 'item'}`).trim().slice(0, 120)

  return (
    <div className={`tg-shell${studioMode === 'simple' ? ' tg-shell--no-sidebar' : ''}`}>
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
          <button
            type="button"
            className="tg-sidebar-refresh-btn"
            onClick={() => navigate('/lab')}
          >
            Open lab
          </button>
          <button
            type="button"
            className="tg-sidebar-refresh-btn"
            onClick={() => navigate('/toorgen/extend')}
          >
            Open extend
          </button>
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
          {studioMode === 'flow' ? activeQueueItems.map((item) => {
            const modelProofBadge = buildModelProofBadge(item)
            const shotBatchSummary = getShotBatchSummary(item.storyContext)
            const lastApiResponseAgeMs = item.lastStatusResponseAt ? Math.max(0, queueNowMs - item.lastStatusResponseAt) : null
            const stalledAgeMs = item.firstStatusAt ? Math.max(0, queueNowMs - item.firstStatusAt) : Math.max(0, queueNowMs - item.createdAt)
            const isStalled = item.status === 'IN_PROGRESS' && (lastApiResponseAgeMs === null || lastApiResponseAgeMs > 2 * 60 * 1000)
            return (
              <div
                key={item.id}
                className="tg-thumb tg-thumb--pending"
                title={item.prompt || item.taskId || item.id}
              >
                <button
                  type="button"
                  className="tg-thumb-main"
                  onClick={() => {
                    if (item.taskId) {
                      setTaskId(item.taskId)
                      setResumeTaskId(item.taskId)
                    }
                  }}
                >
                  <div className={`tg-thumb-preview tg-thumb-preview--pending ${getAspectRatioClass(item.aspectRatio)}`}><div className="tg-thumb-spinner" /></div>
                  <div className="tg-thumb-body">
                    <div className="tg-thumb-head">
                      <span className="tg-thumb-title">{item.prompt || 'Queued render'}</span>
                      <span className={`tg-model-proof-badge is-${modelProofBadge.tone}`}>{modelProofBadge.text}</span>
                    </div>
                    {shotBatchSummary ? <span className="tg-thumb-meta">{shotBatchSummary}</span> : null}
                    <span className="tg-thumb-meta">{item.duration}s output · {item.aspectRatio} · {item.status}{item.taskId ? ` · ${item.taskId.slice(0, 10)}...` : ''}</span>
                    <span className="tg-thumb-meta">{getSentPayloadSummary(item)}</span>
                    <span className="tg-thumb-meta">Elapsed {formatElapsedTime(queueNowMs - item.createdAt)}</span>
                    {item.submittedAt ? <span className="tg-thumb-meta">Submit {formatElapsedTime(item.submittedAt - item.createdAt)}</span> : null}
                    {item.submittedAt && item.firstStatusAt ? <span className="tg-thumb-meta">Queue {formatElapsedTime(item.firstStatusAt - item.submittedAt)}</span> : null}
                    {item.lastStatusApiStatus ? <span className="tg-thumb-meta">API status {item.lastStatusApiStatus}{lastApiResponseAgeMs !== null ? ` · updated ${formatElapsedTime(lastApiResponseAgeMs)} ago` : ''}</span> : null}
                    {item.statusPollErrorCount && item.statusPollErrorCount > 0
                      ? <span className="tg-thumb-meta tg-thumb-meta--error">Status polling error x{item.statusPollErrorCount}: {item.lastStatusError || 'Unknown status polling error.'}</span>
                      : null}
                    {isStalled
                      ? <span className="tg-thumb-meta tg-thumb-meta--error">No status update for {formatElapsedTime(stalledAgeMs)}. Possible causes: Seedance task stalled, status endpoint unreachable, or local network/proxy interruption. Use Refresh queue to re-check now.</span>
                      : null}

                  </div>
                </button>
                <button
                  type="button"
                  className="tg-thumb-remove"
                  onClick={() => handleStopQueueItem(item)}
                >
                  Stop
                </button>
                <button
                  type="button"
                  className="tg-thumb-remove"
                  onClick={() => setDiagnosticsQueueId(item.id)}
                >
                  Diagnose
                </button>
              </div>
            )
          }) : null}

          {studioMode === 'flow' ? failedQueueItems.map((item) => {
            const modelProofBadge = buildModelProofBadge(item)
            const shotBatchSummary = getShotBatchSummary(item.storyContext)
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
                    {shotBatchSummary ? <span className="tg-thumb-meta">{shotBatchSummary}</span> : null}
                    <span className="tg-thumb-meta">{item.duration}s output · {item.aspectRatio}{item.taskId ? ` · ${item.taskId.slice(0, 10)}...` : ''}</span>
                    <span className="tg-thumb-meta">{getSentPayloadSummary(item)}</span>
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
          }) : null}

          {studioMode === 'flow' && activeQueueItems.length === 0 && failedQueueItems.length === 0
            ? <div className="tg-sidebar-empty"><span>Queue status appears here.</span></div>
            : null}

          {studioMode === 'flow' ? history.map((entry) => {
            const modelProofBadge = buildModelProofBadge(entry)
            const durationLabel = `${entry.duration || 5}s`
            const aspectLabel = entry.aspectRatio || '16:9'
            const shotPrompt = getEntryPrompt(entry) || 'Untitled render'
            const shotBatchSummary = getShotBatchSummary(entry.storyContext)
            return (
              <div key={`flow-history-${entry.taskId}`} className={`tg-thumb ${selectedVideoUrl === entry.videoUrl ? 'is-active' : ''}`}>
                <button
                  type="button"
                  className="tg-thumb-main"
                  onClick={() => {
                    setSelectedVideoUrl(entry.videoUrl)
                    setVideoPlayer({
                      url: entry.videoUrl,
                      title: shotPrompt || 'Rendered video',
                      meta: `${durationLabel} • ${aspectLabel} • ${modelProofBadge.text}`,
                      entry,
                    })
                  }}
                >
                  <div className={`tg-thumb-preview ${getAspectRatioClass(entry.aspectRatio)}`}>
                    <video
                      src={entry.videoUrl}
                      preload="metadata"
                      playsInline
                      className="tg-thumb-video"
                      onMouseEnter={(event) => playHoverPreviewVideo(event.currentTarget)}
                      onMouseLeave={(event) => stopHoverPreviewVideo(event.currentTarget)}
                    />
                  </div>
                  <div className="tg-thumb-body">
                    <div className="tg-thumb-head">
                      <span className="tg-thumb-title">{shotPrompt}</span>
                      <span className={`tg-model-proof-badge is-${modelProofBadge.tone}`}>{modelProofBadge.text}</span>
                    </div>
                    {entry.sourcePrompt && entry.prompt && entry.sourcePrompt !== entry.prompt
                      ? <span className="tg-thumb-meta">Run: {entry.prompt}</span>
                      : null}
                    {shotBatchSummary ? <span className="tg-thumb-meta">{shotBatchSummary}</span> : null}
                    <span className="tg-thumb-meta">{durationLabel} · {aspectLabel}</span>
                    <span className="tg-thumb-meta">{getSentPayloadSummary(entry)}</span>
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
            nodeRequestedModels={nodeRequestedModels}
            nodeEffectiveModels={nodeEffectiveModels}
            nodeProviderLabels={nodeProviderLabels}
            taskId={taskId}
            resumeTaskId={resumeTaskId}
            onResumeTaskIdChange={setResumeTaskId}
            onResume={handleResume}
            onGenerate={(request) => { void handleGenerate(request) }}
            onSendRawJson={async (rawJson: string) => {
              let parsed: unknown
              try { parsed = JSON.parse(rawJson) } catch { throw new Error('Invalid JSON') }
              const response = await fetch(buildApiUrl('/api/seedance/generate'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(parsed),
              })
              const payload = await response.json().catch(() => ({}))
              if (!response.ok) throw new Error((payload as Record<string, unknown>)?.error as string || `HTTP ${response.status}`)
            }}
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
            <div className="tg-topbar-mode-switch" role="group" aria-label="Studio mode">
              <button
                type="button"
                className={studioMode === 'simple' ? 'is-active' : ''}
                onClick={() => setStudioMode('simple')}
              >
                Simple
              </button>
              <button
                type="button"
                className={(studioMode as string) === 'flow' ? 'is-active' : ''}
                onClick={() => setStudioMode('flow')}
              >
                Flow
              </button>
            </div>
            <button
              type="button"
              className="tg-topbar-queue-btn"
              onClick={() => navigate('/lab')}
            >
              Lab
            </button>
            <button
              type="button"
              className="tg-topbar-queue-btn"
              onClick={() => navigate('/toorgen/extend')}
            >
              Extend
            </button>
            <button
              type="button"
              className="tg-simple-bible-btn"
              onClick={handleOpenBibleDefaultsFromSimpleMode}
            >
              Bible &amp; Defaults
            </button>
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
            <button
              type="button"
              className="tg-topbar-queue-btn"
              onClick={handleRefreshQueue}
              disabled={isRefreshingQueue}
            >
              {isRefreshingQueue ? 'Refreshing…' : 'Refresh'}
            </button>
            <button
              type="button"
              className="tg-topbar-queue-btn"
              onClick={handleStopAllRunning}
              disabled={!isGenerating}
            >
              Stop
            </button>
            {isGenerating ? <span className="tg-polling-badge">Running</span> : null}
            {consumedCredits !== null ? <span className="tg-taskid-badge">{consumedCredits} credits</span> : null}
          </div>
        </div>

        <ToorGenBibleDefaultsDialog
          open={simpleDefaultsOpen}
          title="Simple Studio"
          description="Shared references and defaults applied to simple-mode generations without switching to flow."
          status={status}
          availableCredits={simpleAvailableCredits}
          consumedCredits={consumedCredits}
          creditsLoading={simpleCreditsLoading}
          onRefreshCredits={handleOpenBibleDefaultsFromSimpleMode}
          draft={simpleBibleDraft}
          setDraft={setSimpleBibleDraft}
          selectedVideoUrl={selectedVideoUrl}
          isGenerating={isGenerating}
          model={seedanceModel}
          mode={mode}
          duration={duration}
          aspectRatio={aspectRatio}
          resumeTaskId={resumeTaskId}
          onResumeTaskIdChange={setResumeTaskId}
          onResume={handleResume}
          onClose={handleCloseSimpleBibleDefaults}
          onSave={handleSaveSimpleBibleDefaults}
          refFieldUploading={simpleRefFieldUploading}
          refFieldUploadError={simpleRefFieldUploadError}
          onUploadRefFile={handleSimpleDialogRefUpload}
          charPhotoUploading={simpleCharPhotoUploading}
          onUploadCharacterPhoto={handleSimpleDialogCharacterPhotoUpload}
        />

        <section className="tg-simple-body">
          <div className="tg-simple-preview-column">
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
                onChange={(event) => setGalleryModelFilter(event.target.value as 'all' | ToorGenModel)}
                aria-label="Filter by model"
              >
                <option value="all">All models</option>
                <option value="atlas-2.0">Seedance 2.0 (Atlas Cloud)</option>
                <option value="seedance-2.0">Seedance 2.0 (Seedance API)</option>
                <option value="seedance-2.0-fast">Seedance 2.0 Fast (Atlas Cloud)</option>
                <option value="seedance-api-2.0-fast">Seedance 2.0 Fast (Seedance API)</option>
                <option value="seedance-1.5">Seedance 1.5 (Seedance API)</option>
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
              {activeQueueItems.map((item) => {
                const shotBatchSummary = getShotBatchSummary(item.storyContext)
                const pendingTitle = item.prompt ? (item.prompt.length > 60 ? `${item.prompt.substring(0, 60)}…` : item.prompt) : 'Queued render'
                return (
                  <div key={`grid-queue-${item.id}`} className="tg-gallery-card tg-gallery-card--pending">
                    <button
                      type="button"
                      className={`tg-gallery-preview tg-thumb-preview--pending ${getAspectRatioClass(item.aspectRatio)}`}
                      onClick={() => {
                        setVideoPlayer({
                          url: '',
                          title: pendingTitle,
                          meta: `${item.duration}s · ${item.aspectRatio} · ${item.status}`,
                          queueItem: item,
                        })
                      }}
                      aria-label="View generation details"
                      title="View details"
                    >
                      <div className="tg-thumb-spinner" />
                    </button>
                    <div className="tg-gallery-meta">
                      <strong>{item.prompt || 'Queued render'}</strong>
                      {shotBatchSummary ? <span className="tg-gallery-secondary">{shotBatchSummary}</span> : null}
                      <span>{item.duration}s · {item.aspectRatio} · {item.status}</span>
                    </div>
                  </div>
                )
              })}

              {filteredHistory.map((entry) => {
                const modelProofBadge = buildModelProofBadge(entry)
                const isStarred = entry.starred === true
                const durationLabel = `${entry.duration || 5}s`
                const aspectLabel = entry.aspectRatio || '16:9'
                const shotTitle = getEntryTitle(entry)
                const shotPrompt = getEntryPrompt(entry)
                const shotBatchSummary = getShotBatchSummary(entry.storyContext)
                return (
                  <article key={`grid-${entry.taskId}`} className="tg-gallery-card">
                    <div className="tg-gallery-open">
                      <div className={`tg-gallery-preview ${getAspectRatioClass(entry.aspectRatio)}`}>
                        <button
                          type="button"
                          className="tg-gallery-preview-trigger"
                          onClick={() => {
                            setSelectedVideoUrl(entry.videoUrl)
                            setVideoPlayer({
                              url: entry.videoUrl,
                              title: shotTitle,
                              meta: `${durationLabel} • ${aspectLabel} • ${modelProofBadge.text}`,
                              entry,
                            })
                          }}
                          aria-label="Open video"
                        >
                          <video
                            src={entry.videoUrl}
                            preload="metadata"
                            playsInline
                            className="tg-thumb-video"
                            onMouseEnter={(event) => playHoverPreviewVideo(event.currentTarget)}
                            onMouseLeave={(event) => stopHoverPreviewVideo(event.currentTarget)}
                          />
                        </button>
                      </div>
                      <div className="tg-gallery-meta">
                        <strong>{shotTitle}</strong>
                        {shotPrompt ? <span className="tg-gallery-secondary">Prompt: {shotPrompt.substring(0, 150)}{shotPrompt.length > 150 ? '...' : ''}</span> : null}
                        {shotBatchSummary ? <span className="tg-gallery-secondary">{shotBatchSummary}</span> : null}
                        <div className="tg-gallery-badges">
                          <span className="tg-gallery-pill">{durationLabel}</span>
                          <span className="tg-gallery-pill">{aspectLabel}</span>
                          {isStarred ? <span className="tg-gallery-pill tg-gallery-pill--starred">Starred</span> : null}
                          <span className={`tg-model-proof-badge is-${modelProofBadge.tone}`}>{modelProofBadge.text}</span>
                          {typeof entry.generationTimeMs === 'number' ? <span className="tg-gallery-pill">Total {formatElapsedTime(entry.generationTimeMs)}</span> : null}
                        </div>
                      </div>
                    </div>

                    <div className="tg-gallery-actions" aria-label="Video actions">
                      <button
                        type="button"
                        className={`tg-gallery-icon-btn tg-gallery-icon-btn--icon${isStarred ? ' is-starred' : ''}`}
                        onClick={() => handleToggleHistoryStar(entry)}
                        aria-label={isStarred ? 'Remove star' : 'Star video'}
                        title={isStarred ? 'Remove star' : 'Star video'}
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill={isStarred ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="tg-gallery-icon-btn tg-gallery-icon-btn--icon"
                        onClick={() => handleLoadShotSetup(entry)}
                        aria-label="Load prompt and references"
                        title="Load prompt and settings"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <circle cx="12" cy="12" r="3"></circle>
                          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33h.01a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h.01a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v.01a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                        </svg>
                      </button>
                      <button
                        type="button"
                        className="tg-gallery-icon-btn tg-gallery-icon-btn--wide"
                        onClick={() => handleLoadHistoryPrompt(entry)}
                        aria-label="Load prompt"
                        title="Load prompt"
                      >
                        Prompt
                      </button>
                      <button
                        type="button"
                        className="tg-gallery-icon-btn tg-gallery-icon-btn--wide"
                        onClick={() => handleLoadHistoryUsedPrompt(entry)}
                        aria-label="Load used prompt"
                        title="Load used prompt"
                      >
                        Used Prompt
                      </button>
                      <button
                        type="button"
                        className="tg-gallery-icon-btn tg-gallery-icon-btn--wide"
                        onClick={() => {
                          setExtensionVideoUrl(entry.videoUrl)
                          handleModeChange('video-extension')
                        }}
                        aria-label="Extend this video"
                        title="Extend this video"
                      >
                        Extend
                      </button>
                      <button
                        type="button"
                        className="tg-gallery-icon-btn"
                        onClick={() => { void downloadVideo(entry.videoUrl) }}
                        aria-label="Download video"
                      >
                        ⬇
                      </button>
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

              {filteredHistory.length === 0 && activeQueueItems.length === 0 ? (
                <div className="tg-gallery-empty">Your generations will appear here.</div>
              ) : null}
            </div>
          </div>

          <section className="tg-simple-composer" aria-label="Prompt composer">

            {/* Prompt section */}
            <div className="tg-composer-section tg-composer-section--stretch">
              <div className="tg-prompt-head-row">
                <div>
                  <span className="tg-composer-label">Prompt</span>
                  <span className="tg-composer-hint">Type @ to mention a saved character or one of the current reference images.</span>
                </div>
                <div className="tg-prompt-tools">
                  <button
                    type="button"
                    className="tg-prompt-tool-btn"
                    onClick={() => { void handleEnhancePromptWithAi() }}
                    disabled={isEnhancingPrompt}
                    title="Correct and enhance with AI"
                  >
                    {isEnhancingPrompt ? 'AI…' : 'AI'}
                  </button>
                  <button
                    type="button"
                    className="tg-prompt-tool-btn"
                    onClick={() => { void handleCopyPrompt() }}
                    title="Copy prompt"
                  >
                    {copyIndicatorKey === 'simple-prompt-copy' ? 'Copied' : 'Copy'}
                  </button>
                  <button
                    type="button"
                    className="tg-prompt-tool-btn"
                    onClick={() => { void handlePastePrompt() }}
                    title="Paste prompt"
                  >
                    Paste
                  </button>
                </div>
              </div>
              <textarea
                ref={promptTextareaRef}
                className="tg-prompt-textarea tg-simple-primary-prompt"
                onChange={(event) => handlePromptChange(event.target.value, event.target.selectionStart)}
                onKeyDown={handlePromptTextareaKeyDown}
                onClick={handlePromptTextareaSelection}
                onKeyUp={handlePromptTextareaSelection}
                onSelect={handlePromptTextareaSelection}
                placeholder="Describe your scene — characters, action, camera, lighting..."
                maxLength={SEEDANCE_PROMPT_CHARACTER_LIMIT}
              />
              {enhancedPromptCandidate ? (
                <div className="tg-prompt-enhance-review" role="status" aria-live="polite">
                  <div className="tg-prompt-enhance-preview">{enhancedPromptCandidate}</div>
                  <div className="tg-prompt-enhance-actions">
                    <button type="button" className="tg-prompt-enhance-btn" onClick={handleKeepOriginalPrompt}>Keep Original</button>
                    <button type="button" className="tg-prompt-enhance-btn is-primary" onClick={handleApplyEnhancedPrompt}>Use Enhanced</button>
                  </div>
                </div>
              ) : null}
              {activePromptMention ? (
                <div className="tg-prompt-mentions" role="listbox" aria-label="Prompt mentions">
                  {filteredPromptMentionOptions.length > 0 ? filteredPromptMentionOptions.map((option, index) => (
                    <button
                      key={option.id}
                      type="button"
                      className={`tg-prompt-mention-item${index === selectedPromptMentionIndex ? ' is-active' : ''}`}
                      onMouseDown={(event) => {
                        event.preventDefault()
                        insertPromptMention(option)
                      }}
                    >
                      <span className="tg-prompt-mention-preview" aria-hidden="true">
                        {option.thumbnailUrl ? (
                          <img src={option.thumbnailUrl} alt="" loading="lazy" />
                        ) : (
                          <span className="tg-prompt-mention-preview-fallback">{option.kind === 'character' ? '@' : 'Img'}</span>
                        )}
                      </span>
                      <span className="tg-prompt-mention-body">
                        <span className="tg-prompt-mention-title">{option.label}</span>
                        <span className="tg-prompt-mention-subtitle">{option.subtitle}</span>
                      </span>
                    </button>
                  )) : (
                    <div className="tg-prompt-mention-empty">No matching mentions.</div>
                  )}
                </div>
              ) : null}
            </div>

            {/* References row */}
            <div className="tg-composer-refs-row">
              <div className="tg-upload-panel tg-upload-panel--inline">
                <div className="tg-upload-panel-head">
                  <span className="tg-upload-panel-title">Images</span>
                  <div className="tg-upload-actions">
                    <button
                      type="button"
                      className="tg-upload-plus-btn"
                      onClick={handleOpenReferenceUpload}
                      aria-label="Upload media"
                      title="Upload media"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      className="tg-upload-plus-btn"
                      onClick={() => handleOpenReferenceLibraryDialog()}
                      aria-label="Select from library"
                      title="Select from library"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                      </svg>
                    </button>
                  </div>
                </div>
                <input
                  ref={referenceUploadInputRef}
                  className="tg-hidden-file-input"
                  type="file"
                  accept="image/*,.mp3,.wav,audio/mpeg,audio/wav,audio/x-wav"
                  multiple
                  aria-label="Upload reference media"
                  title="Upload reference media"
                  onChange={(event) => {
                    handleReferenceUploadInputChange(event.target.files)
                    event.currentTarget.value = ''
                  }}
                />
                <input
                  ref={referenceAudioUploadInputRef}
                  className="tg-hidden-file-input"
                  type="file"
                  accept=".mp3,.wav,audio/mpeg,audio/wav,audio/x-wav"
                  aria-label="Upload reference audio"
                  title="Upload reference audio"
                  onChange={(event) => {
                    void handleReferenceAudioUploadInputChange(event.target.files)
                    event.currentTarget.value = ''
                  }}
                />
                <div className="tg-upload-thumbs">
                  {referenceImageThumbs.map((src, index) => {
                    const role = imageRoles[src] || 'reference'
                    const roleLabel = role === 'start_frame' ? 'Start' : role === 'end_frame' ? 'End' : 'Ref'
                    const roleMod = role === 'start_frame' ? ' tg-img-role--start' : role === 'end_frame' ? ' tg-img-role--end' : ''
                    return (
                      <div key={`ref-img-${index}`} className="tg-upload-thumb-wrap">
                        <button
                          type="button"
                          className="tg-upload-thumb"
                          onClick={() => handleRemoveReferenceImage(index)}
                          aria-label="Remove image reference"
                        >
                          <img src={src} alt="Reference" />
                        </button>
                        <button
                          type="button"
                          className={`tg-img-role-badge${roleMod}`}
                          title="Click to cycle: Reference → Start frame → End frame"
                          onClick={() => cycleImageRole(src)}
                        >
                          {roleLabel}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Hosted image URL thumbnail */}
              <div className="tg-ref-thumb-wrap">
                <button
                  type="button"
                  className={`tg-ref-thumb-btn${hostedImageUrl ? ' has-url' : ''}`}
                  onClick={() => setRefImageUrlEditing((v) => !v)}
                  title={hostedImageUrl ? 'Edit reference image URL' : 'Add hosted image URL'}
                >
                  {hostedImageUrl ? (
                    <img src={hostedImageUrl} alt="Ref" />
                  ) : (
                    <>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                      </svg>
                      <span>Img URL</span>
                    </>
                  )}
                </button>
                {hostedImageUrl ? (
                  <button type="button" className="tg-ref-thumb-clear" onClick={() => setReferenceImageUrl('')} title="Remove">✕</button>
                ) : null}
                {hostedImageUrl ? (() => {
                  const role = imageRoles[hostedImageUrl] || 'reference'
                  const roleLabel = role === 'start_frame' ? 'Start' : role === 'end_frame' ? 'End' : 'Ref'
                  const roleMod = role === 'start_frame' ? ' tg-img-role--start' : role === 'end_frame' ? ' tg-img-role--end' : ''
                  return (
                    <button
                      type="button"
                      className={`tg-img-role-badge${roleMod}`}
                      title="Click to cycle: Reference → Start frame → End frame"
                      onClick={() => cycleImageRole(hostedImageUrl)}
                    >
                      {roleLabel}
                    </button>
                  )
                })() : null}
                {refImageUrlEditing ? (
                  <div className="tg-ref-url-popover">
                    <input
                      autoFocus
                      className="tg-input-sm"
                      value={referenceImageUrl}
                      onChange={(event) => setReferenceImageUrl(event.target.value)}
                      placeholder="https://..."
                      onKeyDown={(event) => { if (event.key === 'Enter' || event.key === 'Escape') setRefImageUrlEditing(false) }}
                    />
                    <button
                      type="button"
                      className="tg-upload-plus-btn"
                      onClick={() => { handleOpenReferenceLibraryDialog(); setRefImageUrlEditing(false) }}
                      title="Select from library"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <circle cx="8.5" cy="8.5" r="1.5"></circle>
                        <polyline points="21 15 16 10 5 21"></polyline>
                      </svg>
                    </button>
                    <button type="button" className="tg-upload-plus-btn" onClick={() => setRefImageUrlEditing(false)} title="Done">✓</button>
                  </div>
                ) : null}
              </div>

              {/* Hosted video URL thumbnail */}
              <div className="tg-ref-thumb-wrap">
                <button
                  type="button"
                  className={`tg-ref-thumb-btn${hostedVideoUrl ? ' has-url' : ''}`}
                  onClick={() => setRefVideoUrlEditing((v) => !v)}
                  title={hostedVideoUrl ? 'Edit reference video URL' : 'Add reference video URL'}
                >
                  {hostedVideoUrl ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  ) : (
                    <>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="23 7 16 12 23 17 23 7"></polygon>
                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
                      </svg>
                      <span>Vid URL</span>
                    </>
                  )}
                </button>
                {hostedVideoUrl ? (
                  <button type="button" className="tg-ref-thumb-clear" onClick={() => setReferenceVideoUrl('')} title="Remove">✕</button>
                ) : null}
                {refVideoUrlEditing ? (
                  <div className="tg-ref-url-popover">
                    <input
                      autoFocus
                      className="tg-input-sm"
                      value={referenceVideoUrl}
                      onChange={(event) => setReferenceVideoUrl(event.target.value)}
                      placeholder="https://..."
                      onKeyDown={(event) => { if (event.key === 'Enter' || event.key === 'Escape') setRefVideoUrlEditing(false) }}
                    />
                    <button type="button" className="tg-upload-plus-btn" onClick={() => setRefVideoUrlEditing(false)} title="Done">✓</button>
                  </div>
                ) : null}
              </div>

              <div className="tg-ref-thumb-wrap">
                <button
                  type="button"
                  className={`tg-ref-thumb-btn${hostedAudioUrl ? ' has-url' : ''}`}
                  onClick={() => setRefAudioUrlEditing((v) => !v)}
                  title={hostedAudioUrl ? 'Edit reference audio URL' : 'Add reference audio URL'}
                >
                  <>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18V5l12-2v13"></path>
                      <circle cx="6" cy="18" r="3"></circle>
                      <circle cx="18" cy="16" r="3"></circle>
                    </svg>
                    <span>{hostedAudioUrl ? 'Aud URL' : 'Aud'}</span>
                  </>
                </button>
                {hostedAudioUrl ? (
                  <button type="button" className="tg-ref-thumb-clear" onClick={() => setReferenceAudioUrl('')} title="Remove">✕</button>
                ) : null}
                {refAudioUrlEditing ? (
                  <div className="tg-ref-url-popover">
                    <input
                      autoFocus
                      className="tg-input-sm"
                      value={referenceAudioUrl}
                      onChange={(event) => setReferenceAudioUrl(event.target.value)}
                      placeholder="https://...mp3 or ...wav"
                      onKeyDown={(event) => { if (event.key === 'Enter' || event.key === 'Escape') setRefAudioUrlEditing(false) }}
                    />
                    <button
                      type="button"
                      className="tg-upload-plus-btn"
                      onClick={() => { handleOpenReferenceLibraryDialog('audio'); setRefAudioUrlEditing(false) }}
                      title="Select from audio library"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <path d="M9 18V7l8-1v10"></path>
                        <circle cx="7" cy="18" r="2"></circle>
                        <circle cx="17" cy="16" r="2"></circle>
                      </svg>
                    </button>
                    <button type="button" className="tg-upload-plus-btn" onClick={handleOpenReferenceAudioUpload} title="Upload MP3/WAV">⇪</button>
                    <button type="button" className="tg-upload-plus-btn" onClick={() => setRefAudioUrlEditing(false)} title="Done">✓</button>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="tg-simple-controls">
              <select
                className="tg-select"
                aria-label="Mode"
                title="Generation Mode"
                value={mode}
                onChange={(event) => handleModeChange(event.target.value as ToorGenGenerationMode)}
              >
                <option value="text-to-video">Text → Video</option>
                <option value="image-to-video">Image → Video</option>
                <option value="video-extension">Extend Video</option>
              </select>

              <select
                className="tg-select"
                aria-label="Model"
                title="Model"
                value={seedanceModel}
                onChange={(event) => handleModelChange(event.target.value as ToorGenModel)}
              >
                <option value="atlas-2.0">Seedance 2.0 Atlas</option>
                <option value="seedance-2.0">Seedance 2.0</option>
                <option value="seedance-2.0-fast">Seedance 2.0 Fast (Atlas)</option>
                <option value="seedance-api-2.0-fast">Seedance 2.0 Fast</option>
                <option value="seedance-1.5">Seedance 1.5</option>
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

              <button
                type="button"
                className={`tg-pin-settings-btn${simpleSettingsPinned ? ' is-active' : ''}`}
                onClick={handleToggleSimpleSettingsPin}
                title={simpleSettingsPinned ? 'Unpin project defaults' : 'Pin settings for this project'}
                aria-label={simpleSettingsPinned ? 'Unpin project defaults' : 'Pin settings for this project'}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M8 3h8l-2 6 3 3v2H7v-2l3-3-2-6z"></path>
                  <path d="M12 14v7"></path>
                </svg>
              </button>

              <select
                className="tg-select"
                aria-label="Duration"
                title="Duration"
                value={duration}
                onChange={(event) => handleDurationChange(Number(event.target.value) || 5)}
              >
                {seedanceModel === 'seedance-1.5' ? (
                  <>
                    <option value={4}>4s</option>
                    <option value={8}>8s</option>
                    <option value={12}>12s</option>
                  </>
                ) : (
                  <>
                    <option value={5}>5s</option>
                    <option value={10}>10s</option>
                    <option value={15}>15s</option>
                  </>
                )}
              </select>

              <label className="tg-simple-audio-toggle">
                <input type="checkbox" checked={includeAudio} onChange={(event) => setIncludeAudio(event.target.checked)} />
                Audio
              </label>
            </div>

            {/* Extend-from picker — shown only in video-extension mode */}
            {mode === 'video-extension' ? (
              <div className="tg-extend-from-row">
                <span className="tg-composer-label">Extend from</span>
                <div className="tg-extend-source-wrap">
                  {extensionVideoUrl ? (
                    <div className="tg-extend-source-preview">
                      <video
                        src={extensionVideoUrl}
                        className="tg-extend-source-video"
                        preload="metadata"
                        playsInline
                        muted
                        onMouseEnter={(event) => { const v = event.currentTarget; void v.play().catch(() => {}) }}
                        onMouseLeave={(event) => { const v = event.currentTarget; v.pause(); v.currentTime = 0 }}
                      />
                      <button type="button" className="tg-ref-thumb-clear tg-extend-source-clear" onClick={() => setExtensionVideoUrl('')} title="Remove">✕</button>
                    </div>
                  ) : (
                    <span className="tg-extend-empty">No source video selected.</span>
                  )}
                  <input
                    className="tg-input-sm tg-extend-url-input"
                    value={extensionVideoUrl}
                    onChange={(event) => setExtensionVideoUrl(event.target.value)}
                    placeholder="Paste video URL or pick from history →"
                    aria-label="Extension source video URL"
                  />
                </div>
                {history.filter((e) => e.videoUrl).length > 0 ? (
                  <div className="tg-extend-history-strip">
                    {history.filter((e) => e.videoUrl).slice(0, 12).map((entry) => (
                      <button
                        key={entry.taskId}
                        type="button"
                        className={`tg-extend-history-thumb${extensionVideoUrl === entry.videoUrl ? ' is-selected' : ''}`}
                        title={`${getEntryTitle(entry)} — ${entry.duration || 5}s ${entry.aspectRatio || '16:9'}`}
                        onClick={() => setExtensionVideoUrl(entry.videoUrl)}
                      >
                        <video src={entry.videoUrl} preload="metadata" playsInline muted className="tg-extend-history-video" />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="tg-simple-generate-row">
              <button
                type="button"
                className="tg-generate-btn"
                onClick={handleSimpleGenerate}
              >
                Generate
              </button>
              <button
                type="button"
                className="tg-json-preview-btn"
                onClick={() => {
                  if (showJsonPreview) {
                    setShowJsonPreview(false)
                    return
                  }
                  setJsonPreviewError('')
                  setJsonPreviewDraft(buildSimplePreviewJson())
                  setShowJsonPreview(true)
                }}
                title={showJsonPreview ? 'Hide payload' : 'Preview payload'}
                aria-label={showJsonPreview ? 'Hide payload' : 'Preview payload'}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="16 18 22 12 16 6"></polyline>
                  <polyline points="8 6 2 12 8 18"></polyline>
                </svg>
              </button>
            </div>

            {errorMessage ? <div className="tg-simple-error">{errorMessage}</div> : null}

            {showJsonPreview ? (() => {
              const previewJson = jsonPreviewDraft || buildSimplePreviewJson()
              return (
                <div className="tg-simple-json-preview" style={{ padding: '0.75rem', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: '6px', fontSize: '12px', maxHeight: '420px', overflowY: 'auto', display: 'grid', gridTemplateRows: 'auto auto 1fr', gap: '0.5rem' }}>
                  <div className="tg-json-preview-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                    <strong style={{ color: '#aab1a3', fontSize: '11px' }}>Payload Preview</strong>
                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                      <button
                        type="button"
                        onClick={() => { void copyTextWithIndicator(previewJson, 'simple-preview-json-copy') }}
                        title="Copy JSON"
                        style={{ padding: '2px 8px', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                      >
                        {copyIndicatorKey === 'simple-preview-json-copy' ? 'Copied' : 'Copy'}
                      </button>
                      <button type="button" onClick={() => setJsonPreviewDraft(buildSimplePreviewJson())} title="Reload current payload" style={{ padding: '2px 8px', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Reset</button>
                      <button type="button" onClick={() => setShowJsonPreview(false)} style={{ padding: '2px 8px', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>✕</button>
                    </div>
                  </div>
                  <textarea
                    value={previewJson}
                    onChange={(event) => setJsonPreviewDraft(event.target.value)}
                    spellCheck={false}
                    wrap="off"
                    style={{
                      width: '100%',
                      minHeight: '260px',
                      margin: 0,
                      padding: '0.75rem',
                      borderRadius: '6px',
                      border: '1px solid #3f4639',
                      background: '#0f1110',
                      color: '#e3e8dd',
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                      fontSize: '11px',
                      lineHeight: 1.5,
                      resize: 'vertical',
                    }}
                  />
                  {jsonPreviewError ? <div style={{ color: '#ff8f8f', fontSize: '11px' }}>{jsonPreviewError}</div> : null}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                    <button type="button" onClick={() => setShowJsonPreview(false)} style={{ padding: '6px 10px', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}>Close</button>
                    <button type="button" onClick={() => void submitEditedJsonPreview()} disabled={isSubmittingJsonPreview} style={{ padding: '6px 10px', background: isSubmittingJsonPreview ? '#555' : '#4f6f42', color: '#fff', border: '1px solid #6e8f62', borderRadius: '4px', cursor: isSubmittingJsonPreview ? 'wait' : 'pointer', fontSize: '11px' }}>
                      {isSubmittingJsonPreview ? 'Submitting…' : 'Submit edited payload'}
                    </button>
                  </div>
                </div>
              )
            })() : null}
          </section>
        </section>
      </main>
      )}

      {isReferenceLibraryDialogOpen ? (
        <div
          className="tg-ref-dialog-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Reference library"
          onClick={() => setIsReferenceLibraryDialogOpen(false)}
        >
          <div className="tg-ref-dialog" onClick={(event) => event.stopPropagation()}>
            <div className="tg-ref-dialog-head">
              <strong>Reference Library</strong>
              <div className="tg-ref-dialog-head-actions">
                <span className="tg-ref-dialog-selection-count">{referenceLibraryTarget === 'audio' ? 'Audio mode' : 'Image mode'}</span>
                <span className="tg-ref-dialog-selection-count">{referenceLibrarySelectedCount} selected</span>
                <button type="button" className="tg-ref-dialog-close" onClick={() => setIsReferenceLibraryDialogOpen(false)}>Close</button>
              </div>
            </div>

            <input
              className="tg-ref-dialog-search"
              value={referenceLibraryQuery}
              onChange={(event) => setReferenceLibraryQuery(event.target.value)}
              placeholder={`Search ${referenceLibraryTarget} references`}
              aria-label="Search reference library"
            />

            <div className="tg-ref-dialog-grid">
              {filteredReferenceLibrary.map((entry) => (
                <article key={entry.id} className={`tg-ref-dialog-card${selectedReferenceLibraryUrls.includes(entry.url) ? ' is-selected' : ''}`}>
                  <button
                    type="button"
                    className="tg-ref-dialog-thumb"
                    onClick={() => handleToggleReferenceLibraryEntry(entry)}
                    title={selectedReferenceLibraryUrls.includes(entry.url) ? 'Remove from selection' : `Select this ${entry.mediaKind} reference`}
                  >
                    {entry.mediaKind === 'audio' ? (
                      <audio src={entry.url} controls preload="none" />
                    ) : (
                      <img src={entry.url} alt="Reference library item" />
                    )}
                    <span className="tg-ref-dialog-thumb-state">{selectedReferenceLibraryUrls.includes(entry.url) ? 'Selected' : 'Select'}</span>
                  </button>

                  <div className="tg-ref-dialog-meta">
                    <strong>{entry.sourcePrompt || 'No prompt saved yet'}</strong>
                    <span>
                      {(entry.model || 'Model n/a')}
                      {' · '}
                      {typeof entry.duration === 'number' ? `${entry.duration}s` : 'Duration n/a'}
                      {' · '}
                      {(entry.aspectRatio || 'Ratio n/a')}
                    </span>
                    <span>{entry.includeAudio === true ? 'Audio on' : entry.includeAudio === false ? 'Audio off' : 'Audio n/a'}</span>
                  </div>

                  <div className="tg-ref-dialog-actions">
                    <button type="button" className={`tg-ref-dialog-btn${selectedReferenceLibraryUrls.includes(entry.url) ? ' is-active' : ''}`} onClick={() => handleToggleReferenceLibraryEntry(entry)}>{selectedReferenceLibraryUrls.includes(entry.url) ? 'Selected' : 'Select'}</button>
                    <button type="button" className="tg-ref-dialog-btn" onClick={() => handleUseReferenceLibraryEntryWithSetup(entry)}>{entry.mediaKind === 'audio' ? 'Use Audio' : 'Use + Setup'}</button>
                    <button
                      type="button"
                      className="tg-ref-dialog-btn is-danger"
                      onClick={() => handleRequestRemoveReferenceLibraryEntry(entry)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}

              {filteredReferenceLibrary.length === 0 ? (
                <div className="tg-ref-dialog-empty">No saved {referenceLibraryTarget} references yet. Upload {referenceLibraryTarget === 'audio' ? 'MP3/WAV files' : 'images'} and they will appear here.</div>
              ) : null}
            </div>

            <div className="tg-ref-dialog-footer">
              <button type="button" className="tg-ref-dialog-close" onClick={() => setIsReferenceLibraryDialogOpen(false)}>Cancel</button>
              <button type="button" className="tg-ref-dialog-confirm" onClick={handleConfirmReferenceLibrarySelection}>Confirm {referenceLibrarySelectedCount > 0 ? `(${referenceLibrarySelectedCount})` : ''}</button>
            </div>
          </div>
        </div>
      ) : null}

      {pendingReferenceImageRemovalIndex !== null || pendingReferenceLibraryDelete ? (
        <div className="tg-ref-confirm-backdrop" role="dialog" aria-modal="true" aria-label="Confirm action" onClick={() => {
          setPendingReferenceImageRemovalIndex(null)
          setPendingReferenceLibraryDelete(null)
        }}>
          <div className="tg-ref-confirm" onClick={(event) => event.stopPropagation()}>
            <strong>{pendingReferenceLibraryDelete ? 'Delete reference library item?' : 'Remove reference image?'}</strong>
            <p>
              {pendingReferenceLibraryDelete
                ? `Delete "${pendingReferenceLibraryDeleteLabel}" from the reference library?`
                : 'Remove this reference image from the current selection?'}
            </p>
            <div className="tg-ref-confirm-actions">
              <button type="button" className="tg-ref-dialog-close" onClick={() => {
                setPendingReferenceImageRemovalIndex(null)
                setPendingReferenceLibraryDelete(null)
              }}>Cancel</button>
              <button
                type="button"
                className="tg-ref-dialog-btn is-danger"
                onClick={() => {
                  if (pendingReferenceLibraryDelete) {
                    handleRemoveReferenceLibraryEntry(pendingReferenceLibraryDelete.id)
                    setPendingReferenceLibraryDelete(null)
                  } else if (pendingReferenceImageRemovalIndex !== null) {
                    const removedUrl = referenceImageThumbs[pendingReferenceImageRemovalIndex]
                    setReferenceImageThumbs((current) => current.filter((_, idx) => idx !== pendingReferenceImageRemovalIndex))
                    if (removedUrl) setImageRoles((current) => { const next = { ...current }; delete next[removedUrl]; return next })
                    setPendingReferenceImageRemovalIndex(null)
                  }
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {setupLoadedToast ? <div className="tg-toast">{setupLoadedToast}</div> : null}

      {diagnosticsQueueItem ? (
        <div
          className="tg-diagnose-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Generation diagnostics"
          onClick={() => setDiagnosticsQueueId('')}
        >
          <div className="tg-diagnose-modal" onClick={(event) => event.stopPropagation()}>
            <div className="tg-diagnose-head">
              <strong>Generation diagnostics</strong>
              <div className="tg-diagnose-actions">
                <button type="button" onClick={() => { void handleRefreshDiagnostics() }} disabled={isRefreshingDiagnostics}>
                  {isRefreshingDiagnostics ? 'Refreshing...' : 'Refresh now'}
                </button>
                <button type="button" onClick={() => setDiagnosticsQueueId('')}>Close</button>
              </div>
            </div>
            <div className="tg-diagnose-body">
              <div className="tg-diagnose-grid">
                <span>Status</span><strong>{diagnosticsQueueItem.status}</strong>
                <span>Task</span><strong>{diagnosticsQueueItem.taskId || 'Not assigned yet'}</strong>
                <span>Last API status</span><strong>{diagnosticsQueueItem.lastStatusApiStatus || 'Unknown'}</strong>
                <span>Last status update</span><strong>{diagnosticsQueueItem.lastStatusResponseAt ? `${formatElapsedTime(queueNowMs - diagnosticsQueueItem.lastStatusResponseAt)} ago` : 'No status response yet'}</strong>
                <span>Poll errors</span><strong>{diagnosticsQueueItem.statusPollErrorCount || 0}</strong>
              </div>
              {diagnosticsQueueItem.lastStatusError ? (
                <div className="tg-diagnose-error">{diagnosticsQueueItem.lastStatusError}</div>
              ) : null}
              <section className="tg-diagnose-section">
                <h4>Last /status payload</h4>
                <pre className="tg-diagnose-json">{diagnosticsQueueItem.lastStatusPayloadJson || 'No payload captured yet.'}</pre>
              </section>
              <section className="tg-diagnose-section">
                <h4>Status poll timeline</h4>
                <div className="tg-diagnose-timeline">
                  {(diagnosticsQueueItem.statusTimeline || []).slice().reverse().map((event, index) => (
                    <div key={`${event.at}-${index}`} className={`tg-diagnose-timeline-item is-${event.kind}`}>
                      <span>{new Date(event.at).toLocaleTimeString()}</span>
                      <strong>{event.kind.toUpperCase()}</strong>
                      <em>{event.status || event.message || '—'}</em>
                    </div>
                  ))}
                  {(diagnosticsQueueItem.statusTimeline || []).length === 0 ? <div className="tg-diagnose-timeline-empty">No timeline events yet.</div> : null}
                </div>
              </section>
            </div>
          </div>
        </div>
      ) : null}

      {videoPlayer ? (
        <div
          className="tg-video-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={videoPlayer.queueItem ? 'Generation details' : 'Video player'}
          onClick={() => setVideoPlayer(null)}
        >
          <div className="tg-video-modal" onClick={(event) => event.stopPropagation()}>
            <div className="tg-video-modal-head">
              <strong title={videoPlayer.title}>
                {videoPlayer.title.length > 20 ? `${videoPlayer.title.substring(0, 20)}...` : videoPlayer.title}
              </strong>
              <div className="tg-video-modal-actions">
                {!videoPlayer.queueItem && videoPlayer.entry ? (
                  <button
                    type="button"
                    className={`tg-video-modal-icon-btn${videoPlayer.entry.starred ? ' is-active' : ''}`}
                    onClick={() => handleToggleHistoryStar(videoPlayer.entry!)}
                    title={videoPlayer.entry.starred ? 'Remove star' : 'Star video'}
                    aria-label={videoPlayer.entry.starred ? 'Remove star' : 'Star video'}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill={videoPlayer.entry.starred ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                  </button>
                ) : null}
                {!videoPlayer.queueItem ? (
                  <button
                    type="button"
                    className={`tg-video-modal-details-toggle${videoDetailsOpen ? ' is-active' : ''}`}
                    onClick={() => setVideoDetailsOpen((v) => !v)}
                  >
                    Details
                  </button>
                ) : null}
                {!videoPlayer.queueItem ? (
                  <button
                    type="button"
                    className="tg-video-modal-download"
                    onClick={() => { void downloadVideo(videoPlayer.url) }}
                  >
                    Download
                  </button>
                ) : null}
                <button type="button" onClick={() => setVideoPlayer(null)}>Close</button>
              </div>
            </div>
            <div className={`tg-video-modal-body${videoDetailsOpen ? ' is-details-open' : ''}`}>
              {videoPlayer.queueItem ? (
                <div className="tg-video-modal-pending-body">
                  <div className="tg-video-modal-pending-media">
                    <div className="tg-thumb-spinner tg-thumb-spinner--lg" />
                    <span className="tg-video-modal-pending-status">{videoPlayer.queueItem.status}</span>
                  </div>
                  <div className="tg-video-modal-details is-visible">
                    <section className="tg-vmd-section">
                      <h4 className="tg-vmd-section-title">Settings</h4>
                      <div className="tg-vmd-pills">
                        <span className="tg-vmd-pill">{videoPlayer.queueItem.duration}s</span>
                        <span className="tg-vmd-pill">{videoPlayer.queueItem.aspectRatio}</span>
                        <span className="tg-vmd-pill">{videoPlayer.queueItem.effectiveModel || videoPlayer.queueItem.requestedModel || videoPlayer.queueItem.model || '—'}</span>
                        {videoPlayer.queueItem.mode ? <span className="tg-vmd-pill">{videoPlayer.queueItem.mode}</span> : null}
                        {videoPlayer.queueItem.qualityPreset ? <span className="tg-vmd-pill">{videoPlayer.queueItem.qualityPreset}</span> : null}
                        {videoPlayer.queueItem.includeAudio ? <span className="tg-vmd-pill">Audio</span> : null}
                        {getShotBatchSummary(videoPlayer.queueItem.storyContext) ? <span className="tg-vmd-pill">{getShotBatchSummary(videoPlayer.queueItem.storyContext)}</span> : null}
                        {videoPlayer.queueItem.providerLabel ? <span className="tg-vmd-pill">{videoPlayer.queueItem.providerLabel}</span> : null}
                        <span className="tg-vmd-pill">Started {formatElapsedTime(queueNowMs - (videoPlayer.queueItem.submittedAt || videoPlayer.queueItem.createdAt))} ago</span>
                      </div>
                    </section>
                    <section className="tg-vmd-section">
                      <h4 className="tg-vmd-section-title">Prompt</h4>
                      <p className="tg-vmd-text">{videoPlayer.queueItem.sourcePrompt || videoPlayer.queueItem.prompt || '—'}</p>
                    </section>
                    {(videoPlayer.queueItem.referenceImages?.length ?? 0) > 0 ? (
                      <section className="tg-vmd-section">
                        <h4 className="tg-vmd-section-title">Reference images ({videoPlayer.queueItem.referenceImages!.length})</h4>
                        <div className="tg-vmd-ref-images">
                          {videoPlayer.queueItem.referenceImages!.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noreferrer" className="tg-vmd-ref-img-wrap">
                              <img src={url} alt={`Reference ${i + 1}`} />
                            </a>
                          ))}
                        </div>
                      </section>
                    ) : null}
                    {(videoPlayer.queueItem.referenceVideos?.length ?? 0) > 0 ? (
                      <section className="tg-vmd-section">
                        <h4 className="tg-vmd-section-title">Reference videos ({videoPlayer.queueItem.referenceVideos!.length})</h4>
                        <div className="tg-vmd-ref-videos">
                          {videoPlayer.queueItem.referenceVideos!.map((url, i) => (
                            <video key={i} src={url} muted preload="metadata" className="tg-vmd-ref-video" />
                          ))}
                        </div>
                      </section>
                    ) : null}
                    {videoPlayer.queueItem.errorMessage ? (
                      <section className="tg-vmd-section">
                        <h4 className="tg-vmd-section-title" style={{ color: '#ff8080' }}>Error</h4>
                        <p className="tg-vmd-text" style={{ color: '#ff9090' }}>{videoPlayer.queueItem.errorMessage}</p>
                      </section>
                    ) : null}
                    {videoPlayer.queueItem.apiPayload ? (
                      <section className="tg-vmd-section">
                        <h4 className="tg-vmd-section-title">API payload</h4>
                        <pre className="tg-vmd-json">{JSON.stringify(videoPlayer.queueItem.apiPayload, null, 2)}</pre>
                      </section>
                    ) : null}
                    <section className="tg-vmd-section">
                      <h4 className="tg-vmd-section-title">Task ID</h4>
                      <p className="tg-vmd-text tg-vmd-text--mono">{videoPlayer.queueItem.taskId || videoPlayer.queueItem.id}</p>
                    </section>
                  </div>
                </div>
              ) : (
              <div className="tg-video-modal-media">
                <video
                  ref={videoModalPlayerRef}
                  key={videoPlayer.url}
                  src={videoPlayer.url || undefined}
                  controls
                  playsInline
                  autoPlay
                />
              </div>
              )}
              {!videoPlayer.queueItem && videoDetailsOpen ? <div className="tg-video-modal-details">
              <section className="tg-vmd-section">
                <h4 className="tg-vmd-section-title">Settings</h4>
                <div className="tg-vmd-pills">
                  <span className="tg-vmd-pill">{(videoPlayer.entry?.duration ?? 5)}s</span>
                  <span className="tg-vmd-pill">{videoPlayer.entry?.aspectRatio || '16:9'}</span>
                  <span className="tg-vmd-pill">{videoPlayer.entry?.effectiveModel || videoPlayer.entry?.model || '—'}</span>
                  {videoPlayer.entry?.mode ? <span className="tg-vmd-pill">{videoPlayer.entry.mode}</span> : null}
                  {getShotBatchSummary(videoPlayer.entry?.storyContext) ? <span className="tg-vmd-pill">{getShotBatchSummary(videoPlayer.entry?.storyContext)}</span> : null}
                  {videoPlayer.entry?.qualityPreset ? <span className="tg-vmd-pill">{videoPlayer.entry.qualityPreset}</span> : null}
                  {videoPlayer.entry?.includeAudio ? <span className="tg-vmd-pill">Audio</span> : null}
                  {typeof videoPlayer.entry?.consumedCredits === 'number' ? <span className="tg-vmd-pill">{videoPlayer.entry.consumedCredits} credits</span> : null}
                  {typeof videoPlayer.entry?.generationTimeMs === 'number' ? <span className="tg-vmd-pill">{formatElapsedTime(videoPlayer.entry.generationTimeMs)}</span> : null}
                </div>
              </section>
              <section className="tg-vmd-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 className="tg-vmd-section-title" style={{ margin: 0 }}>Prompt</h4>
                  <button
                    type="button"
                    onClick={() => {
                      if (videoPlayer.entry) void handleCopyHistoryPrompt(videoPlayer.entry)
                    }}
                    style={{ padding: '2px 8px', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                    title="Copy prompt"
                  >
                    {videoPlayer.entry && copyIndicatorKey === `history-prompt-copy-${videoPlayer.entry.taskId}` ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <p className="tg-vmd-text" style={{ marginTop: '0.5rem' }}>{(videoPlayer.entry?.apiPayload?.prompt as string | undefined) || videoPlayer.entry?.sourcePrompt || '—'}</p>
              </section>
              {(videoPlayer.entry?.referenceImages?.length ?? 0) > 0 ? (
                <section className="tg-vmd-section">
                  <h4 className="tg-vmd-section-title">Reference images ({videoPlayer.entry!.referenceImages!.length})</h4>
                  <div className="tg-vmd-ref-images">
                    {videoPlayer.entry!.referenceImages!.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer" className="tg-vmd-ref-img-wrap">
                        <img src={url} alt={`Reference ${i + 1}`} />
                      </a>
                    ))}
                  </div>
                </section>
              ) : null}
              {(videoPlayer.entry?.referenceVideos?.length ?? 0) > 0 ? (
                <section className="tg-vmd-section">
                  <h4 className="tg-vmd-section-title">Reference videos ({videoPlayer.entry!.referenceVideos!.length})</h4>
                  <div className="tg-vmd-ref-videos">
                    {videoPlayer.entry!.referenceVideos!.map((url, i) => (
                      <video key={i} src={url} muted preload="metadata" className="tg-vmd-ref-video" />
                    ))}
                  </div>
                </section>
              ) : null}
              {videoPlayer.entry?.apiPayload ? (
                <section className="tg-vmd-section">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 className="tg-vmd-section-title" style={{ margin: 0 }}>API payload</h4>
                    <button
                      type="button"
                      onClick={() => {
                        if (!videoPlayer.entry) return
                        void copyTextWithIndicator(JSON.stringify(videoPlayer.entry.apiPayload || {}, null, 2), `history-payload-copy-${videoPlayer.entry.taskId}`)
                      }}
                      style={{ padding: '2px 8px', background: '#333', color: '#fff', border: '1px solid #555', borderRadius: '4px', cursor: 'pointer', fontSize: '11px' }}
                      title="Copy JSON payload"
                    >
                      {videoPlayer.entry && copyIndicatorKey === `history-payload-copy-${videoPlayer.entry.taskId}` ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <pre className="tg-vmd-json" style={{ marginTop: '0.5rem' }}>{JSON.stringify(videoPlayer.entry.apiPayload, null, 2)}</pre>
                </section>
              ) : null}
              {videoPlayer.entry?.taskId ? (
                <section className="tg-vmd-section">
                  <h4 className="tg-vmd-section-title">Task ID</h4>
                  <p className="tg-vmd-text tg-vmd-text--mono">{videoPlayer.entry.taskId}</p>
                </section>
              ) : null}
            </div> : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
