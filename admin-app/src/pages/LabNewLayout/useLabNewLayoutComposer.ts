import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { isGenerationStillProcessingTimeoutError, useGenerationRunner } from '../../hooks/useGenerationRunner'
import { firebaseConfig } from '../../lib/firebase'
import { useToast } from '../../lib/ToastContext'
import { persistOpenAIImageToLibrary } from '../../lib/openai/openAIImageAssetService'
import { playGenerationFailureSound, playGenerationSuccessSound } from './generationSounds'
import { buildToorGenRequest } from '../../lib/toorgen/generationRequestBuilder'
import type { StudioComposerPromptFontSize, StudioProjectComposerDraft } from '../../types/studio'
import { useLabNewLayoutData } from './useLabNewLayoutWorkspace'
import { useLabNewLayoutStore } from './useLabNewLayoutStore'

const CHATBOT_BASE = (import.meta.env.VITE_CHATBOT_API_URL as string | undefined) || ''
const COMPOSER_PROJECT_SCOPE_ID = 'project'
const DRAFT_SAVE_DEBOUNCE_MS = 450

type ComposerProvider = 'atlas' | 'grok'

type ComposerRequestSettingsState = {
  provider: ComposerProvider
  model: string
  ratio: string
  duration: number
  resolution: string
  generateAudio: boolean
}

const defaultComposerSettings: ComposerRequestSettingsState = {
  provider: 'atlas',
  model: 'seedance-2.0-fast',
  ratio: '16:9',
  duration: 15,
  resolution: '480p',
  generateAudio: true,
}

const isComposerProvider = (value: unknown): value is ComposerProvider => (
  value === 'atlas' || value === 'grok'
)

const getDefaultComposerModelForProvider = (provider?: string): string => (
  provider === 'grok' ? 'grok-imagine-video' : defaultComposerSettings.model
)

const isGrokImageGenerationModel = (model: string): boolean => (
  model.trim().toLowerCase().startsWith('grok-imagine-image')
)

const getComposerModelsForMode = (modeId: string) => {
  if (modeId === 'image' || modeId === 'style-transfer') {
    return composerModelOptions.filter((option) => isGrokImageGenerationModel(option.id))
  }
  return composerModelOptions.filter((option) => !isGrokImageGenerationModel(option.id))
}

const defaultPromptFontSize: StudioComposerPromptFontSize = 'medium'

const captureFirstVideoFrame = (videoUrl: string): Promise<string> => (
  new Promise((resolve) => {
    let settled = false
    const done = (result: string) => {
      if (settled) return
      settled = true
      video.src = ''
      resolve(result)
    }
    const video = document.createElement('video')
    video.crossOrigin = 'anonymous'
    video.muted = true
    video.playsInline = true
    video.preload = 'metadata'
    video.addEventListener('error', () => done(''), { once: true })
    video.addEventListener('loadedmetadata', () => {
      video.currentTime = video.duration > 0 ? Math.min(1, video.duration * 0.05) : 0
    }, { once: true })
    video.addEventListener('seeked', () => {
      try {
        const scale = Math.min(1, 480 / Math.max(video.videoWidth || 480, video.videoHeight || 480))
        const w = Math.round((video.videoWidth || 480) * scale)
        const h = Math.round((video.videoHeight || 270) * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')
        if (!ctx) { done(''); return }
        ctx.drawImage(video, 0, 0, w, h)
        done(canvas.toDataURL('image/jpeg', 0.72))
      } catch {
        done('')
      }
    }, { once: true })
    setTimeout(() => done(''), 20_000)
    video.src = videoUrl
    video.load()
  })
)

const isFirebaseDownloadUrl = (value: string): boolean => {
  if (!value.trim()) {
    return false
  }

  try {
    const parsed = new URL(value)
    return parsed.hostname.toLowerCase() === 'firebasestorage.googleapis.com'
      && parsed.pathname.includes('/o/')
      && parsed.searchParams.get('alt') === 'media'
  } catch {
    return false
  }
}

const isLocalReferenceHostname = (value: string): boolean => {
  const hostname = value.trim().toLowerCase()
  if (!hostname) {
    return true
  }

  if (
    hostname === 'localhost'
    || hostname === '0.0.0.0'
    || hostname === '::1'
    || hostname.endsWith('.local')
  ) {
    return true
  }

  if (/^127(?:\.\d{1,3}){3}$/.test(hostname)) {
    return true
  }

  if (/^10(?:\.\d{1,3}){3}$/.test(hostname)) {
    return true
  }

  if (/^192\.168(?:\.\d{1,3}){2}$/.test(hostname)) {
    return true
  }

  const privateRangeMatch = hostname.match(/^172\.(\d{1,3})(?:\.\d{1,3}){2}$/)
  if (privateRangeMatch) {
    const secondOctet = Number(privateRangeMatch[1])
    if (Number.isFinite(secondOctet) && secondOctet >= 16 && secondOctet <= 31) {
      return true
    }
  }

  return false
}

const normalizeComposerReferenceUrl = (value: string): string => {
  const trimmed = value.trim()
  if (!trimmed) {
    return ''
  }

  if (/^(data|blob):/i.test(trimmed)) {
    return trimmed
  }

  try {
    const fallbackOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
    const parsed = new URL(trimmed, fallbackOrigin)
    if (parsed.pathname.endsWith('/api/video-proxy')) {
      const original = parsed.searchParams.get('url') || ''
      return original.trim() ? normalizeComposerReferenceUrl(original) : parsed.toString()
    }

    return parsed.toString()
  } catch {
    return trimmed
  }
}

const isPublicComposerReferenceUrl = (value: string): boolean => {
  const normalized = normalizeComposerReferenceUrl(value)
  if (!normalized) {
    return false
  }

  try {
    const parsed = new URL(normalized)
    if (!/^https?:$/i.test(parsed.protocol)) {
      return false
    }

    const browserOrigin = typeof window !== 'undefined' ? window.location.origin : ''
    if (browserOrigin && parsed.origin === browserOrigin && parsed.pathname.startsWith('/api/')) {
      return false
    }

    return !isLocalReferenceHostname(parsed.hostname)
  } catch {
    return false
  }
}

const canPublishComposerReferenceUrl = (value: string): boolean => {
  const normalized = normalizeComposerReferenceUrl(value)
  if (!normalized) {
    return false
  }

  try {
    const parsed = new URL(normalized)
    return /^https?:$/i.test(parsed.protocol)
  } catch {
    return false
  }
}

const areComposerReferencesEqual = (left: ComposerReference[], right: ComposerReference[]): boolean => {
  if (left.length !== right.length) {
    return false
  }

  return left.every((reference, index) => {
    const other = right[index]
    return Boolean(other)
      && reference.id === other.id
      && reference.url === other.url
      && reference.kind === other.kind
      && reference.name === other.name
  })
}

const dedupeComposerReferences = (references: ComposerReference[]): ComposerReference[] => {
  const seenUrls = new Set<string>()
  return references.filter((reference) => {
    const normalizedUrl = reference.url.trim()
    if (!normalizedUrl || seenUrls.has(normalizedUrl)) {
      return false
    }

    seenUrls.add(normalizedUrl)
    return true
  })
}

export type ComposerModeOption = {
  id: string
  label: string
  promptPlaceholder: string
}

export type ComposerFontSizeOption = {
  id: StudioComposerPromptFontSize
  label: string
  description: string
}

export type ComposerSettingsOption<T extends string | number = string> = {
  id: T
  label: string
  description: string
}

type ComposerModelOption = ComposerSettingsOption & {
  provider: ComposerProvider
}

export const composerModeOptions: ComposerModeOption[] = [
  {
    id: 'text',
    label: 'Text only - no references',
    promptPlaceholder: 'Describe the scene, camera, motion, and atmosphere...',
  },
  {
    id: 'image',
    label: 'Image references',
    promptPlaceholder: 'Describe how the selected image should move and evolve...',
  },
  {
    id: 'style-transfer',
    label: 'Style transfer',
    promptPlaceholder: 'Describe how to apply style from source image to destination image...',
  },
  {
    id: 'video',
    label: 'Video + image references',
    promptPlaceholder: 'Describe the final scene to generate...',
  },
  {
    id: 'audio',
    label: 'Audio references',
    promptPlaceholder: 'Describe the scene and how the audio should guide timing and motion...',
  },
]

export const composerFontSizeOptions: ComposerFontSizeOption[] = [
  { id: 'small', label: 'Small', description: 'Compact drafting size' },
  { id: 'medium', label: 'Medium', description: 'Default prompt size' },
  { id: 'large', label: 'Large', description: 'Easier long-form reading' },
  { id: 'xlarge', label: 'Extra Large', description: 'Roomier review size' },
  { id: 'xxlarge', label: 'XX Large', description: 'Maximum prompt readability' },
]

export const composerRatioOptions: ComposerSettingsOption[] = [
  { id: '16:9', label: '16:9', description: 'Landscape frame' },
  { id: '9:16', label: '9:16', description: 'Vertical frame' },
  { id: '1:1', label: '1:1', description: 'Square frame' },
]

export const composerResolutionOptions: ComposerSettingsOption[] = [
  { id: '480p', label: '480p', description: 'Fast preview output' },
  { id: '720p', label: '720p', description: 'Balanced quality' },
  { id: '1080p', label: '1080p', description: 'Higher detail output' },
]

export const composerDurationOptions: ComposerSettingsOption<number>[] = [
  { id: 5, label: '5s', description: 'Short motion beat' },
  { id: 10, label: '10s', description: 'Standard scene timing' },
  { id: 15, label: '15s', description: 'Longer sequence' },
]

export const composerModelOptions: ComposerModelOption[] = [
  { id: 'atlas-2.0', label: 'Atlas Cloud 2.0', description: 'Seedance 2.0 on Atlas Cloud', provider: 'atlas' },
  { id: 'seedance-2.0-fast', label: 'Atlas Cloud 2.0 Fast', description: 'Fast Atlas Cloud variant', provider: 'atlas' },
  { id: 'seedance-2.0', label: 'Seedance 2.0 API', description: 'Standard Seedance API route', provider: 'atlas' },
  { id: 'seedance-1.5', label: 'Seedance 1.5 API', description: 'Legacy Seedance route', provider: 'atlas' },
  { id: 'grok-imagine-video', label: 'Grok Imagine Video', description: 'xAI Grok video route', provider: 'grok' },
  { id: 'grok-imagine-image-quality', label: 'Grok Imagine Image Quality', description: 'xAI Grok image generation', provider: 'grok' },
]

const EXTEND_PROMPT_PREFIX_PATTERN = /^\s*generate the content (before|after) video 1\.?\s*/i

export type ComposerTemplate = {
  id: string
  label: string
  description: string
  prompt: string
}

export type ComposerRefineAction = {
  id: string
  label: string
  description: string
}

export const composerTemplates: ComposerTemplate[] = [
  {
    id: 'character-reveal',
    label: 'Character Reveal',
    description: 'A polished entrance shot with identity, mood, and camera language.',
    prompt: 'A slow cinematic character reveal in a dim corridor, beginning with silhouette and footfall details before easing into a confident medium shot. Controlled backlight, shallow depth of field, subtle atmosphere haze, and deliberate pacing that builds presence without rushing the moment.',
  },
  {
    id: 'product-beauty',
    label: 'Product Beauty',
    description: 'Clean premium commercial framing for a hero object or device.',
    prompt: 'A premium product beauty shot on a minimal stage with elegant camera drift, controlled reflections, crisp edge lighting, and refined material detail. Start wide, then move into close macro moments that highlight texture, finish, and craftsmanship.',
  },
  {
    id: 'dialogue-scene',
    label: 'Dialogue Scene',
    description: 'Balanced cinematic coverage for a two-person dramatic exchange.',
    prompt: 'An intimate two-person dialogue scene in a quiet interior with restrained camera coverage, subtle shot progression, motivated eyelines, and emotionally grounded pacing. Preserve conversational rhythm, natural body language, and a believable sense of shared space.',
  },
  {
    id: 'drone-arrival',
    label: 'Drone Arrival',
    description: 'A wide environmental reveal that lands on the destination cleanly.',
    prompt: 'A sweeping aerial arrival over a dramatic landscape at golden hour, starting with a broad establishing view and descending toward the final destination with stable, confident motion. Layered geography, atmospheric depth, and a strong sense of scale throughout the move.',
  },
]

export const composerRefineActions: ComposerRefineAction[] = [
  {
    id: 'cinematic',
    label: 'Make More Cinematic',
    description: 'Strengthen framing, lighting, depth, and camera intention.',
  },
  {
    id: 'english-structure',
    label: 'English, Keep Structure',
    description: 'Rewrite in English while preserving ordering and intent.',
  },
  {
    id: 'polish-structure',
    label: 'Correct Language, Keep Structure',
    description: 'Clean phrasing and readability without changing the layout.',
  },
  {
    id: 'refine-full',
    label: 'Refine Full Prompt',
    description: 'Tighten the entire prompt and reduce ambiguity.',
  },
]

function normalizePromptLines(prompt: string): string {
  const normalizedLines = prompt
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())

  const compacted: string[] = []
  let previousWasBlank = false

  normalizedLines.forEach((line) => {
    if (!line) {
      if (!previousWasBlank) {
        compacted.push('')
      }
      previousWasBlank = true
      return
    }

    compacted.push(line)
    previousWasBlank = false
  })

  return compacted.join('\n').trim()
}

function toSentenceCase(line: string): string {
  if (!line) {
    return line
  }

  return line.charAt(0).toUpperCase() + line.slice(1)
}

function applyRefineActionToPrompt(prompt: string, actionId: string): string {
  const normalizedPrompt = normalizePromptLines(prompt)

  switch (actionId) {
    case 'cinematic':
      return normalizedPrompt
        ? `${normalizedPrompt}\n\nElevate it with cinematic framing, motivated camera movement, stronger depth, textured lighting, and a more atmospheric visual tone.`
        : 'Create a cinematic scene with deliberate framing, motivated camera movement, layered depth, expressive lighting, and a strong atmospheric tone.'
    case 'english-structure':
      return normalizedPrompt
        ? `Rewrite in English while preserving the same structure, sequence, and meaning:\n${normalizedPrompt}`
        : 'Rewrite the prompt in English while preserving the same structure and meaning.'
    case 'polish-structure': {
      if (!normalizedPrompt) {
        return ''
      }

      return normalizedPrompt
        .split('\n')
        .map((line) => (line ? toSentenceCase(line) : ''))
        .join('\n')
    }
    case 'refine-full':
      return normalizedPrompt
        ? `${normalizedPrompt}\n\nRefine the entire prompt for clarity, precision, and flow while preserving the original structure and intent.`
        : 'Refine the full prompt for clarity, precision, and flow while preserving the intended structure.'
    default:
      return prompt
  }
}

function createDraftSignature(draft: Omit<StudioProjectComposerDraft, 'updatedAt'>): string {
  return JSON.stringify({
    activeModeId: draft.activeModeId,
    promptText: draft.promptText,
    promptFontSize: draft.promptFontSize,
    references: draft.references.map((reference) => ({
      id: reference.id,
      url: reference.url,
      kind: reference.kind,
      name: reference.name,
    })),
    model: draft.model,
    provider: draft.provider,
    ratio: draft.ratio,
    resolution: draft.resolution,
    duration: draft.duration,
    generateAudio: draft.generateAudio,
  })
}

function buildDraftSnapshot(input: {
  activeModeId: string
  promptText: string
  promptFontSize: StudioComposerPromptFontSize
  references: ComposerReference[]
  settings: ComposerRequestSettingsState
}): StudioProjectComposerDraft {
  return {
    activeModeId: input.activeModeId,
    promptText: input.promptText,
    promptFontSize: input.promptFontSize,
    references: input.references.map((reference) => ({
      id: reference.id,
      url: reference.url,
      kind: reference.kind,
      name: reference.name,
    })),
    model: input.settings.model,
    provider: input.settings.provider,
    ratio: input.settings.ratio,
    resolution: input.settings.resolution,
    duration: input.settings.duration,
    generateAudio: input.settings.generateAudio,
    updatedAt: Date.now(),
  }
}

function resolveDraftSettings(draft: StudioProjectComposerDraft | null | undefined): ComposerRequestSettingsState {
  const provider = isComposerProvider(draft?.provider) ? draft.provider : defaultComposerSettings.provider
  return {
    provider,
    model: normalizeComposerModelId(draft?.model || '', provider),
    ratio: draft?.ratio || defaultComposerSettings.ratio,
    duration: typeof draft?.duration === 'number' ? draft.duration : defaultComposerSettings.duration,
    resolution: draft?.resolution || defaultComposerSettings.resolution,
    generateAudio: draft?.generateAudio !== false,
  }
}

export type ComposerReference = {
  id: string
  url: string
  kind: 'video' | 'image' | 'audio'
  name: string
}

type ComposerFooterMenuId = 'ratio' | 'resolution' | 'duration' | 'model'

function getComposerModelLabel(model: string): string {
  const raw = (model || '').trim().toLowerCase()

  if (!raw) {
    return 'Atlas Cloud 2.0 Fast'
  }

  if (raw === 'grok-imagine-image-quality') {
    return 'Grok Imagine Image Quality'
  }

  if (raw === 'grok-imagine-video' || raw.includes('grok')) {
    return 'Grok Imagine Video'
  }

  if (raw === 'atlas-2.0' || raw === 'bytedance/seedance-2.0') {
    return 'Atlas Cloud 2.0'
  }

  if (
    raw === 'seedance-2.0-fast'
    || raw === 'seedance-api-2.0-fast'
    || raw === 'bytedance/seedance-2.0-fast'
  ) {
    return 'Atlas Cloud 2.0 Fast'
  }

  if (raw === 'seedance-2.0') {
    return 'Seedance 2.0 API'
  }

  if (raw === 'seedance-1.5' || raw === 'seedance-1.5-i2v') {
    return 'Seedance 1.5 API'
  }

  return model
}

export function normalizeComposerModelId(model: string, provider?: string): string {
  const raw = (model || '').trim()
  const lower = raw.toLowerCase()
  const normalizedProvider = (provider || '').trim().toLowerCase()
  const fallbackModel = getDefaultComposerModelForProvider(provider)

  if (!raw) {
    return fallbackModel
  }

  if (composerModelOptions.some((option) => option.id === raw)) {
    return raw
  }

  if (normalizedProvider === 'grok') {
    if (lower.includes('grok-imagine-image') || lower.includes('image')) {
      return 'grok-imagine-image-quality'
    }
    return lower.includes('grok') ? 'grok-imagine-video' : fallbackModel
  }

  if (lower.includes('grok')) {
    if (lower.includes('image')) {
      return 'grok-imagine-image-quality'
    }
    return 'grok-imagine-video'
  }

  if (lower.includes('seedance-1.5') || lower.includes('atlas 1.5')) {
    return 'seedance-1.5'
  }

  if (
    lower.includes('seedance-2.0-fast')
    || lower.includes('atlas cloud 2.0 fast')
    || lower.includes('seedance api 2.0 fast')
  ) {
    return 'seedance-2.0-fast'
  }

  if (
    lower.includes('bytedance/seedance-2.0')
    || lower.includes('atlas cloud 2.0')
    || lower === 'atlas-2.0'
    || (lower === 'seedance-2.0' && normalizedProvider === 'atlas')
  ) {
    return 'atlas-2.0'
  }

  if (lower === 'seedance-2.0' || lower.includes('seedance 2.0 api')) {
    return 'seedance-2.0'
  }

  return fallbackModel
}

function mergePromptPrefix(currentPrompt: string, promptPrefix: string): string {
  const prefix = promptPrefix.trim()
  if (!prefix) {
    return currentPrompt
  }

  const strippedPrompt = currentPrompt.replace(EXTEND_PROMPT_PREFIX_PATTERN, '').trimStart()
  return strippedPrompt ? `${prefix}\n\n${strippedPrompt}` : prefix
}

function createClientUniqueId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function getUnsupportedImageReference(reference: ComposerReference): ComposerReference | null {
  if (reference.kind !== 'image') return null
  const url = (reference.url || '').trim()
  if (!url) return null

  const lower = url.toLowerCase()
  if (/(\.bmp|\.tif|\.tiff|\.heic|\.heif|\.avif|\.svg|\.ico)(\?|#|$)/.test(lower)) {
    return reference
  }

  return null
}

function buildReferenceMediaKey(reference: ComposerReference, index: number): string {
  return `${reference.kind}_${index + 1}`
}

function resolveArchiveFailureNotice(error: unknown): { signature: string; message: string } {
  const rawMessage = error instanceof Error ? error.message : 'Failed to archive video to Firebase.'
  const normalized = rawMessage.toLowerCase()

  if (normalized.includes('firebase admin credentials are not configured')) {
    return {
      signature: 'firebase-admin-credentials-missing',
      message: 'Automatic Firebase archiving is unavailable because backend Firebase admin credentials are not configured.',
    }
  }

  if (
    normalized.includes('service unavailable')
    || normalized.includes('failed to fetch')
    || normalized.includes('networkerror')
    || normalized.includes('cannot reach local api backend')
  ) {
    return {
      signature: 'archive-service-unavailable',
      message: 'Automatic Firebase archiving is temporarily unavailable. Generation output is still available in History.',
    }
  }

  return {
    signature: `archive-failure:${normalized.slice(0, 120)}`,
    message: 'Automatic Firebase archiving failed. Generation output is still available in History.',
  }
}

let lastComposerArchiveFailureSignature: string | null = null

const isTransientGenerationConnectivityError = (message: string): boolean => {
  const lowerError = (message || '').toLowerCase()
  return lowerError.includes('cannot reach local api backend')
    || lowerError.includes('back end server is not working')
    || lowerError.includes('networkerror')
    || lowerError.includes('failed to fetch')
}

export function useLabNewLayoutComposer() {
  const {
    authUid,
    studioProjectId,
    studioActiveFolderId,
    projectNewLayoutConfig,
    projectNewLayoutConfigLoading,
    updateProjectNewLayoutConfig,
  } = useLabNewLayoutData()
  const { showToast } = useToast()
  const [activeModeId, setActiveModeId] = useState('video')
  const [promptText, setPromptText] = useState('')
  const [isPromptFocused, setIsPromptFocused] = useState(false)
  const [promptFontSize, setPromptFontSize] = useState<StudioComposerPromptFontSize>(defaultPromptFontSize)
  const [composerSettings, setComposerSettings] = useState<ComposerRequestSettingsState>(defaultComposerSettings)
  const [isTemplatesMenuOpen, setTemplatesMenuOpen] = useState(false)
  const [isRefineMenuOpen, setRefineMenuOpen] = useState(false)
  const [isFontSizeMenuOpen, setFontSizeMenuOpen] = useState(false)
  const [activeFooterMenu, setActiveFooterMenu] = useState<ComposerFooterMenuId | null>(null)
  const [backendStatusMessage, setBackendStatusMessage] = useState('')
  const [backendCooldownRemainingMs, setBackendCooldownRemainingMs] = useState(0)
  const [isSubmittingGeneration, setIsSubmittingGeneration] = useState(false)
  const [generationSubmittedFlash, setGenerationSubmittedFlash] = useState(false)
  const generationSubmittedFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [referenceAccessMessage, setReferenceAccessMessage] = useState('')
  const [publicizingReferenceCount, setPublicizingReferenceCount] = useState(0)

  const selectedReferences = useLabNewLayoutStore((state) => state.composerReferences)
  const addComposerReference = useLabNewLayoutStore((state) => state.addComposerReference)
  const removeComposerReference = useLabNewLayoutStore((state) => state.removeComposerReference)
  const replaceComposerReference = useLabNewLayoutStore((state) => state.replaceComposerReference)
  const moveComposerReference = useLabNewLayoutStore((state) => state.moveComposerReference)
  const setCurrentComposerPreview = useLabNewLayoutStore((state) => state.setCurrentComposerPreview)
  const composerPreviewRefreshNonce = useLabNewLayoutStore((state) => state.composerPreviewRefreshNonce)
  const setComposerReferences = useLabNewLayoutStore((state) => state.setComposerReferences)
  const addHistoryItem = useLabNewLayoutStore((state) => state.addHistoryItem)
  const updateHistoryItem = useLabNewLayoutStore((state) => state.updateHistoryItem)
  const addPendingGenerationAsset = useLabNewLayoutStore((state) => state.addPendingGenerationAsset)
  const removePendingGenerationAsset = useLabNewLayoutStore((state) => state.removePendingGenerationAsset)
  const history = useLabNewLayoutStore((state) => state.history)
  const submittingGenerationRef = useRef(false)
  const locallyStartedHistoryIdsRef = useRef<Set<string>>(new Set())
  const referencePublicizePromiseByKeyRef = useRef<Map<string, Promise<string | null>>>(new Map())

  const runner = useGenerationRunner({
    apiBaseUrl: CHATBOT_BASE,
    onBackendAvailable: () => {
      setBackendStatusMessage('')
      setBackendCooldownRemainingMs(0)
    },
    onBackendUnavailable: (message) => {
      setBackendStatusMessage((message || 'Back end server is not working. Please run it.').trim())
    },
    onGenerateCooldownChange: (remainingMs) => {
      setBackendCooldownRemainingMs(Math.max(0, remainingMs))
    },
  })

  useEffect(() => {
    if (backendCooldownRemainingMs <= 0) {
      return undefined
    }

    const intervalId = window.setInterval(() => {
      const remaining = runner.getGenerateCooldownRemainingMs()
      setBackendCooldownRemainingMs(remaining)
    }, 250)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [backendCooldownRemainingMs, runner])

  const archiveVideoToFirebase = useCallback(async (
    sourceUrl: string,
    name: string,
    projectId: string,
    folderId: string | null,
  ): Promise<string | null> => {
    const normalizedSourceUrl = sourceUrl.trim()
    if (!normalizedSourceUrl || isFirebaseDownloadUrl(normalizedSourceUrl)) {
      return normalizedSourceUrl || null
    }

    if (!projectId.trim()) {
      return null
    }

    const folderPathSegment = folderId ? `folders/${folderId}` : 'project'
    const storagePathPrefix = `lab-generated-videos/projects/${projectId}/${folderPathSegment}`

    try {
      const response = await fetch('/api/lab/references/upload-by-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: normalizedSourceUrl,
          name,
          kind: 'video',
          storagePathPrefix,
          firebaseConfig,
          mimeType: 'video/mp4',
        }),
      })

      const payload = await response.json().catch(() => null) as { error?: string; saved?: { firebaseUrl?: string } } | null
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to archive video to Firebase.')
      }

      lastComposerArchiveFailureSignature = null

      return payload?.saved?.firebaseUrl || null
    } catch (error) {
      const failureNotice = resolveArchiveFailureNotice(error)
      if (lastComposerArchiveFailureSignature !== failureNotice.signature) {
        lastComposerArchiveFailureSignature = failureNotice.signature
        console.warn('Lab composer archive to Firebase failed:', error)
      }
      return null
    }
  }, [])

  const archiveImageToFirebase = useCallback(async (
    sourceUrl: string,
    name: string,
    projectId: string,
    folderId: string | null,
  ): Promise<string | null> => {
    const normalizedSourceUrl = sourceUrl.trim()
    if (!normalizedSourceUrl || isFirebaseDownloadUrl(normalizedSourceUrl)) {
      return normalizedSourceUrl || null
    }

    if (!projectId.trim()) {
      return null
    }

    const folderPathSegment = folderId ? `folders/${folderId}` : 'project'
    const storagePathPrefix = `lab-generated-images/projects/${projectId}/${folderPathSegment}`

    try {
      const response = await fetch('/api/lab/references/upload-by-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: normalizedSourceUrl,
          name,
          kind: 'image',
          storagePathPrefix,
          firebaseConfig,
          mimeType: 'image/jpeg',
        }),
      })

      const payload = await response.json().catch(() => null) as { error?: string; saved?: { firebaseUrl?: string } } | null
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to archive image to Firebase.')
      }

      return payload?.saved?.firebaseUrl || null
    } catch (error) {
      console.warn('Lab composer image archive to Firebase failed:', error)
      return null
    }
  }, [])

  const addGeneratedImageToAssetsLibrary = useCallback(async (
    imageUrl: string,
    prompt: string,
    requestPayload?: Record<string, unknown>,
  ): Promise<void> => {
    const normalizedUrl = imageUrl.trim()
    if (!normalizedUrl) {
      return
    }

    await persistOpenAIImageToLibrary({
      firebaseUrl: normalizedUrl,
      prompt,
      title: prompt.trim().slice(0, 72) || 'Grok Image',
      authUid,
      generationModel: composerSettings.model,
      generationProvider: composerSettings.provider,
      generationAspectRatio: composerSettings.ratio,
      generationResolution: composerSettings.resolution,
      generationSource: 'grok-image',
      generationRequestPayload: requestPayload,
    })
  }, [authUid, composerSettings.model, composerSettings.provider, composerSettings.ratio, composerSettings.resolution])

  const publicizeReferenceToFirebase = useCallback(async (
    reference: ComposerReference,
    projectId: string,
    folderId: string | null,
  ): Promise<string | null> => {
    const normalizedSourceUrl = normalizeComposerReferenceUrl(reference.url)
    if (!normalizedSourceUrl) {
      return null
    }

    if (isPublicComposerReferenceUrl(normalizedSourceUrl)) {
      return normalizedSourceUrl
    }

    if (!projectId.trim() || !canPublishComposerReferenceUrl(normalizedSourceUrl)) {
      return null
    }

    const folderPathSegment = folderId ? `folders/${folderId}` : 'project'
    const storagePathPrefix = `lab-references/projects/${projectId}/${folderPathSegment}`
    const cacheKey = JSON.stringify([reference.kind, normalizedSourceUrl, storagePathPrefix])
    const existingPromise = referencePublicizePromiseByKeyRef.current.get(cacheKey)
    if (existingPromise) {
      return existingPromise
    }

    setPublicizingReferenceCount((current) => current + 1)

    const uploadPromise = (async () => {
      try {
        const response = await fetch('/api/lab/references/upload-by-url', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            url: normalizedSourceUrl,
            name: reference.name,
            kind: reference.kind,
            storagePathPrefix,
            firebaseConfig,
          }),
        })

        const payload = await response.json().catch(() => null) as { error?: string; saved?: { firebaseUrl?: string } } | null
        if (!response.ok) {
          throw new Error(payload?.error || `Failed to publish ${reference.kind} reference.`)
        }

        return payload?.saved?.firebaseUrl || null
      } finally {
        referencePublicizePromiseByKeyRef.current.delete(cacheKey)
        setPublicizingReferenceCount((current) => Math.max(0, current - 1))
      }
    })()

    referencePublicizePromiseByKeyRef.current.set(cacheKey, uploadPromise)
    return uploadPromise
  }, [])

  const ensureComposerReferencesArePublic = useCallback(async (
    references: ComposerReference[],
    projectId: string,
    folderId: string | null,
  ): Promise<{ references: ComposerReference[]; blockingMessage: string }> => {
    const nextReferences: ComposerReference[] = []
    let blockingMessage = ''

    for (const reference of references) {
      const normalizedUrl = normalizeComposerReferenceUrl(reference.url)
      let nextReference = normalizedUrl && normalizedUrl !== reference.url
        ? { ...reference, url: normalizedUrl }
        : reference

      if (!normalizedUrl) {
        blockingMessage ||= `Reference "${reference.name || reference.id}" is missing a valid URL.`
        nextReferences.push(nextReference)
        continue
      }

      if (isPublicComposerReferenceUrl(normalizedUrl)) {
        nextReferences.push(nextReference)
        continue
      }

      if (!projectId.trim()) {
        blockingMessage ||= 'Select a project before Composer can publish reference assets to public URLs.'
        nextReferences.push(nextReference)
        continue
      }

      if (!canPublishComposerReferenceUrl(normalizedUrl)) {
        blockingMessage ||= `Reference "${reference.name || reference.id}" cannot be converted into a public URL automatically.`
        nextReferences.push(nextReference)
        continue
      }

      try {
        const publicUrl = await publicizeReferenceToFirebase(nextReference, projectId, folderId)
        if (publicUrl && publicUrl.trim()) {
          nextReference = { ...nextReference, url: publicUrl.trim() }
        } else {
          blockingMessage ||= `Reference "${reference.name || reference.id}" could not be published to a public URL.`
        }
      } catch (error) {
        blockingMessage ||= error instanceof Error
          ? error.message
          : `Reference "${reference.name || reference.id}" could not be published to a public URL.`
      }

      nextReferences.push(nextReference)
    }

    return {
      references: dedupeComposerReferences(nextReferences),
      blockingMessage,
    }
  }, [publicizeReferenceToFirebase])

  const activeMode = useMemo(
    () => composerModeOptions.find((mode) => mode.id === activeModeId) ?? composerModeOptions[0],
    [activeModeId],
  )
  const composerModelChip = useMemo(() => {
    return getComposerModelLabel(composerSettings.model)
  }, [composerSettings.model])
  const composerDraftScopeId = studioActiveFolderId || COMPOSER_PROJECT_SCOPE_ID
  const activeScopeDraft = useMemo(
    () => projectNewLayoutConfig.composerDrafts?.[composerDraftScopeId] ?? null,
    [composerDraftScopeId, projectNewLayoutConfig.composerDrafts],
  )
  const previousScopeIdRef = useRef(composerDraftScopeId)
  const hydratedScopeIdRef = useRef<string | null>(null)
  const latestScopeDraftRef = useRef<StudioProjectComposerDraft>(buildDraftSnapshot({
    activeModeId,
    promptText,
    promptFontSize,
    references: selectedReferences,
    settings: composerSettings,
  }))

  useEffect(() => {
    if (!selectedReferences.length) {
      setReferenceAccessMessage('')
      return
    }

    const activeProjectId = (studioProjectId || '').trim()
    const activeFolderId = ((studioActiveFolderId || '').trim() || null)
    let isCancelled = false

    void (async () => {
      const { references, blockingMessage } = await ensureComposerReferencesArePublic(
        selectedReferences,
        activeProjectId,
        activeFolderId,
      )

      if (isCancelled) {
        return
      }

      if (!areComposerReferencesEqual(selectedReferences, references)) {
        setComposerReferences(references)
      }

      const hasRemainingNonPublicReference = references.some((reference) => {
        const normalizedUrl = normalizeComposerReferenceUrl(reference.url)
        return !normalizedUrl || !isPublicComposerReferenceUrl(normalizedUrl)
      })

      if (blockingMessage) {
        setReferenceAccessMessage(blockingMessage)
        return
      }

      if (hasRemainingNonPublicReference) {
        setReferenceAccessMessage('Composer references must use public URLs before generation can start.')
        return
      }

      setReferenceAccessMessage('')
    })()

    return () => {
      isCancelled = true
    }
  }, [ensureComposerReferencesArePublic, selectedReferences, setComposerReferences, studioActiveFolderId, studioProjectId])

  const persistScopeDraft = useCallback((scopeId: string, draft: StudioProjectComposerDraft) => {
    if (!studioProjectId) {
      return
    }

    updateProjectNewLayoutConfig((current) => {
      const existingDraft = current.composerDrafts?.[scopeId]
      const nextDraftSignature = createDraftSignature(draft)
      const existingDraftSignature = existingDraft ? createDraftSignature(existingDraft) : ''

      if (existingDraftSignature === nextDraftSignature) {
        return current
      }

      return {
        ...current,
        composerDrafts: {
          ...(current.composerDrafts ?? {}),
          [scopeId]: draft,
        },
      }
    })
  }, [studioProjectId, updateProjectNewLayoutConfig])

  useEffect(() => {
    if (!studioProjectId || projectNewLayoutConfigLoading) {
      previousScopeIdRef.current = composerDraftScopeId
      return
    }

    if (previousScopeIdRef.current !== composerDraftScopeId) {
      persistScopeDraft(previousScopeIdRef.current, latestScopeDraftRef.current)
      previousScopeIdRef.current = composerDraftScopeId
    }
  }, [composerDraftScopeId, persistScopeDraft, projectNewLayoutConfigLoading, studioProjectId])

  useEffect(() => {
    latestScopeDraftRef.current = buildDraftSnapshot({
      activeModeId,
      promptText,
      promptFontSize,
      references: selectedReferences,
      settings: composerSettings,
    })
  }, [activeModeId, composerSettings, promptFontSize, promptText, selectedReferences])

  useEffect(() => {
    if (projectNewLayoutConfigLoading || isPromptFocused) {
      return
    }

    const isHydratingNewScope = hydratedScopeIdRef.current !== composerDraftScopeId

    if (!isHydratingNewScope) {
      return
    }

    setActiveModeId(activeScopeDraft?.activeModeId || 'video')
    setPromptText(activeScopeDraft?.promptText || '')
    setPromptFontSize(activeScopeDraft?.promptFontSize || defaultPromptFontSize)
    setComposerSettings(resolveDraftSettings(activeScopeDraft))
    setComposerReferences(activeScopeDraft?.references ?? [])
    hydratedScopeIdRef.current = composerDraftScopeId
  }, [activeScopeDraft, composerDraftScopeId, isPromptFocused, projectNewLayoutConfigLoading, setComposerReferences])

  useEffect(() => {
    if (!studioProjectId || projectNewLayoutConfigLoading || isPromptFocused) {
      return
    }

    const nextDraft = buildDraftSnapshot({
      activeModeId,
      promptText,
      promptFontSize,
      references: selectedReferences,
      settings: composerSettings,
    })
    const timeout = window.setTimeout(() => {
      persistScopeDraft(composerDraftScopeId, nextDraft)
    }, DRAFT_SAVE_DEBOUNCE_MS)

    return () => {
      window.clearTimeout(timeout)
    }
  }, [
    activeModeId,
    composerDraftScopeId,
    composerSettings,
    isPromptFocused,
    persistScopeDraft,
    projectNewLayoutConfigLoading,
    promptFontSize,
    promptText,
    selectedReferences,
    studioProjectId,
  ])

  const selectMode = useCallback((modeId: string) => {
    setActiveModeId(modeId)
  }, [])

  const updatePromptText = useCallback((value: string) => {
    setPromptText(value)
  }, [])

  const handlePromptFocus = useCallback(() => {
    setIsPromptFocused(true)
  }, [])

  const handlePromptBlur = useCallback(() => {
    const nextDraft = latestScopeDraftRef.current
    // Do not mark blur snapshots as pending sync acknowledgements.
    // Blur can occur immediately before a settings click, and that stale signature
    // can race with incoming snapshots and roll back the just-selected setting.
    persistScopeDraft(composerDraftScopeId, nextDraft)
    setIsPromptFocused(false)
  }, [composerDraftScopeId, persistScopeDraft])

  const addReference = useCallback((ref: ComposerReference) => {
    addComposerReference(ref)
  }, [addComposerReference])

  const removeReference = useCallback((id: string) => {
    removeComposerReference(id)
  }, [removeComposerReference])

  const replaceReference = useCallback((id: string, newRef: ComposerReference) => {
    replaceComposerReference(id, newRef)
  }, [replaceComposerReference])

  const moveReference = useCallback((fromIndex: number, toIndex: number) => {
    moveComposerReference(fromIndex, toIndex)
  }, [moveComposerReference])

  const toggleTemplatesMenu = useCallback(() => {
    setTemplatesMenuOpen((current) => {
      const next = !current
      if (next) {
        setRefineMenuOpen(false)
        setFontSizeMenuOpen(false)
      }
      return next
    })
  }, [])

  const toggleRefineMenu = useCallback(() => {
    setRefineMenuOpen((current) => {
      const next = !current
      if (next) {
        setTemplatesMenuOpen(false)
        setFontSizeMenuOpen(false)
      }
      return next
    })
  }, [])

  const toggleFontSizeMenu = useCallback(() => {
    setFontSizeMenuOpen((current) => {
      const next = !current
      if (next) {
        setTemplatesMenuOpen(false)
        setRefineMenuOpen(false)
        setActiveFooterMenu(null)
      }
      return next
    })
  }, [])

  const toggleFooterMenu = useCallback((menuId: ComposerFooterMenuId) => {
    setActiveFooterMenu((current) => {
      const next = current === menuId ? null : menuId
      if (next) {
        setTemplatesMenuOpen(false)
        setRefineMenuOpen(false)
        setFontSizeMenuOpen(false)
      }
      return next
    })
  }, [])

  const applyTemplate = useCallback((templateId: string) => {
    const selectedTemplate = composerTemplates.find((template) => template.id === templateId)
    if (!selectedTemplate) {
      return
    }

    setPromptText(selectedTemplate.prompt)
    setTemplatesMenuOpen(false)
  }, [])

  const applyRefineAction = useCallback((actionId: string) => {
    setPromptText((current) => applyRefineActionToPrompt(current, actionId))
    setRefineMenuOpen(false)
  }, [])

  const applyPromptFontSize = useCallback((fontSize: StudioComposerPromptFontSize) => {
    setPromptFontSize(fontSize)
    setFontSizeMenuOpen(false)
  }, [])

  const applyRatioSetting = useCallback((ratio: string) => {
    setComposerSettings((current) => ({ ...current, ratio }))
    setActiveFooterMenu(null)
  }, [])

  const applyResolutionSetting = useCallback((resolution: string) => {
    setComposerSettings((current) => ({ ...current, resolution }))
    setActiveFooterMenu(null)
  }, [])

  const applyDurationSetting = useCallback((duration: number) => {
    setComposerSettings((current) => ({ ...current, duration }))
    setActiveFooterMenu(null)
  }, [])

  const applyModelSetting = useCallback((model: string) => {
    const selectedOption = composerModelOptions.find((option) => option.id === model)
    setComposerSettings((current) => {
      const nextProvider = selectedOption?.provider || current.provider
      return {
        ...current,
        provider: nextProvider,
        model: normalizeComposerModelId(model, nextProvider),
      }
    })

    if (isGrokImageGenerationModel(model)) {
      if (activeModeId !== 'image' && activeModeId !== 'style-transfer') {
        setActiveModeId('image')
      }
    } else if (activeModeId === 'image' || activeModeId === 'style-transfer') {
      setActiveModeId('video')
    }

    setActiveFooterMenu(null)
  }, [activeModeId])

  useEffect(() => {
    const allowedModels = getComposerModelsForMode(activeModeId)
    const isCurrentAllowed = allowedModels.some((option) => option.id === composerSettings.model)
    if (isCurrentAllowed) {
      return
    }

    if (activeModeId === 'image' || activeModeId === 'style-transfer') {
      setComposerSettings((current) => ({
        ...current,
        provider: 'grok',
        model: 'grok-imagine-image-quality',
      }))
      return
    }

    setComposerSettings((current) => ({
      ...current,
      model: isComposerProvider(current.provider)
        ? normalizeComposerModelId(getDefaultComposerModelForProvider(current.provider), current.provider)
        : normalizeComposerModelId(defaultComposerSettings.model, 'atlas'),
    }))
  }, [activeModeId, composerSettings.model])

  const toggleComposerAudio = useCallback(() => {
    setComposerSettings((current) => ({ ...current, generateAudio: !current.generateAudio }))
  }, [])

  const closeMenus = useCallback(() => {
    setTemplatesMenuOpen(false)
    setRefineMenuOpen(false)
    setFontSizeMenuOpen(false)
    setActiveFooterMenu(null)
  }, [])

  const buildCurrentRequest = useCallback((references: ComposerReference[] = selectedReferences) => {
    const isImageModel = isGrokImageGenerationModel(composerSettings.model)
    if (isImageModel) {
      const imageRefUrls = references
        .filter((ref) => ref.kind === 'image')
        .map((ref) => ref.url)
      const uniqueImageRefUrls = Array.from(new Set(imageRefUrls.filter((url) => url.trim().length > 0)))
      const isStyleTransferMode = activeModeId === 'style-transfer'
      const normalizedImageResolution = composerSettings.resolution === '1k' || composerSettings.resolution === '2k'
        ? composerSettings.resolution
        : '1k'
      const imageBody: Record<string, unknown> = {
        prompt: promptText.trim(),
        model: composerSettings.model,
        providerHint: 'grok',
        aspect_ratio: composerSettings.ratio,
        resolution: normalizedImageResolution,
      }

      if (isStyleTransferMode) {
        const styleImageUrl = uniqueImageRefUrls[0] || ''
        const destinationImageUrl = uniqueImageRefUrls[1] || ''

        // Send both images using the standard edit endpoint — same pattern as the
        // working oil painting example. The first image is the style source,
        // the second is the destination. The operation flag is for backend
        // routing only and is stripped before the xAI request is sent.
        imageBody.operation = 'style-transfer'
        const bothImages = [styleImageUrl, destinationImageUrl].filter(Boolean)
        if (bothImages.length > 0) {
          imageBody.image_urls = bothImages
        }

        const basePrompt = promptText.trim()
        imageBody.prompt = basePrompt
          || 'Apply the visual style of the first image to the second image. Preserve the composition, subject, and structure of the second image while adopting the color palette, texture, lighting, and artistic aesthetic of the first image.'
      }

      if (!isStyleTransferMode && uniqueImageRefUrls.length === 1) {
        imageBody.image = { url: uniqueImageRefUrls[0] }
      } else if (!isStyleTransferMode && uniqueImageRefUrls.length > 1) {
        imageBody.images = uniqueImageRefUrls.map((url) => ({
          type: 'image_url',
          url,
        }))
      }
      
      return {
        endpoint: '/api/seedance/generate',
        body: imageBody,
        settings: composerSettings,
      }
    }

    const requestMode = activeModeId === 'video' ? 'reference-to-video' : 'text-to-video'
    const tab = {
      id: activeModeId,
      requestMode: requestMode as 'reference-to-video' | 'text-to-video',
      fields: references.map((ref, idx) => ({ kind: ref.kind, key: buildReferenceMediaKey(ref, idx), isRequired: false, label: '', helpText: '', placeholder: '' })),
    }

    const requestState = {
      prompt: promptText,
      mediaUrls: Object.fromEntries(references.map((ref, idx) => [buildReferenceMediaKey(ref, idx), ref.url])),
    }

    const request = buildToorGenRequest({
      tab,
      state: requestState,
      settings: composerSettings,
      mentionReferences: references.map(ref => ({ name: ref.name, mention: ref.name, kind: ref.kind, role: 'general', url: ref.url })),
      combinedReferenceTabId: activeModeId,
    })

    return {
      ...request,
      settings: composerSettings,
    }
  }, [activeModeId, composerSettings, promptText, selectedReferences])

  useEffect(() => {
    if (composerPreviewRefreshNonce < 1) {
      return
    }

    setCurrentComposerPreview(buildCurrentRequest())
  }, [buildCurrentRequest, composerPreviewRefreshNonce, setCurrentComposerPreview])

  const composerReuseSeed = useLabNewLayoutStore((state) => state.composerReuseSeed)
  const setComposerReuseSeed = useLabNewLayoutStore((state) => state.setComposerReuseSeed)
  const lastConsumedSeedIdRef = useRef<string | null>(null)
  const resumedHistoryIdsRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (!composerReuseSeed) return
    if (lastConsumedSeedIdRef.current === composerReuseSeed.id) return
    lastConsumedSeedIdRef.current = composerReuseSeed.id
    if (typeof composerReuseSeed.modeId === 'string' && composerReuseSeed.modeId.trim()) {
      setActiveModeId(composerReuseSeed.modeId.trim())
    }
    if (composerReuseSeed.mergePrompt && typeof composerReuseSeed.promptPrefix === 'string') {
      setPromptText((current) => mergePromptPrefix(current, composerReuseSeed.promptPrefix || ''))
    } else if (typeof composerReuseSeed.prompt === 'string') {
      setPromptText(composerReuseSeed.prompt)
    } else if (typeof composerReuseSeed.promptPrefix === 'string' && composerReuseSeed.promptPrefix.trim()) {
      setPromptText((current) => mergePromptPrefix(current, composerReuseSeed.promptPrefix || ''))
    }
    if (Array.isArray(composerReuseSeed.references)) {
      const incomingReferences = composerReuseSeed.references.map((ref) => ({
        id: ref.id,
        url: ref.url,
        kind: ref.kind,
        name: ref.name,
      }))

      if (composerReuseSeed.referenceMergeStrategy === 'append' || composerReuseSeed.referenceMergeStrategy === 'prepend') {
        const orderedReferences = composerReuseSeed.referenceMergeStrategy === 'prepend'
          ? [...incomingReferences, ...selectedReferences]
          : [...selectedReferences, ...incomingReferences]
        const seenUrls = new Set<string>()
        setComposerReferences(orderedReferences.filter((ref) => {
          const normalizedUrl = ref.url.trim()
          if (!normalizedUrl || seenUrls.has(normalizedUrl)) {
            return false
          }
          seenUrls.add(normalizedUrl)
          return true
        }))
      } else {
        setComposerReferences(incomingReferences)
      }
    }
    if (
      typeof composerReuseSeed.provider === 'string'
      || typeof composerReuseSeed.ratio === 'string'
      || typeof composerReuseSeed.resolution === 'string'
      || typeof composerReuseSeed.duration === 'number'
      || typeof composerReuseSeed.generateAudio === 'boolean'
      || typeof composerReuseSeed.model === 'string'
    ) {
      setComposerSettings((current) => {
        const nextProvider = isComposerProvider(composerReuseSeed.provider)
          ? composerReuseSeed.provider
          : current.provider
        const nextModelSource = typeof composerReuseSeed.model === 'string' && composerReuseSeed.model.trim()
          ? composerReuseSeed.model
          : current.model

        return {
          ...current,
          provider: nextProvider,
          ratio: typeof composerReuseSeed.ratio === 'string' && composerReuseSeed.ratio.trim()
            ? composerReuseSeed.ratio
            : current.ratio,
          resolution: typeof composerReuseSeed.resolution === 'string' && composerReuseSeed.resolution.trim()
            ? composerReuseSeed.resolution
            : current.resolution,
          duration: typeof composerReuseSeed.duration === 'number'
            ? composerReuseSeed.duration
            : current.duration,
          generateAudio: typeof composerReuseSeed.generateAudio === 'boolean'
            ? composerReuseSeed.generateAudio
            : current.generateAudio,
          model: normalizeComposerModelId(nextModelSource, nextProvider),
        }
      })
    }
    setComposerReuseSeed(null)
  }, [composerReuseSeed, selectedReferences, setComposerReferences, setComposerReuseSeed])

  useEffect(() => {
    const inFlightComposerEntries = history.filter((entry) => (
      entry.sourceLabel === 'Composer'
      && (entry.status === 'queued' || entry.status === 'running')
      && typeof entry.taskId === 'string'
      && entry.taskId.trim().length > 0
    ))

    if (!inFlightComposerEntries.length) {
      return
    }

    let isCancelled = false

    inFlightComposerEntries.forEach((entry) => {
      if (locallyStartedHistoryIdsRef.current.has(entry.id)) {
        return
      }

      if (resumedHistoryIdsRef.current.has(entry.id)) {
        return
      }

      resumedHistoryIdsRef.current.add(entry.id)

      void (async () => {
        try {
          updateHistoryItem(entry.id, {
            status: 'running',
            errorMessage: '',
          })

          const resumedResult = await runner.resumeGenerationTask({
            taskId: entry.taskId || '',
            settings: {
              provider: (entry.provider === 'atlas' || entry.provider === 'grok' || entry.provider === 'byteplus')
                ? entry.provider
                : 'atlas',
              model: normalizeComposerModelId(entry.model || '', entry.provider),
              ratio: entry.ratio || '16:9',
              duration: typeof entry.duration === 'number' ? entry.duration : 15,
              resolution: entry.resolution || '480p',
              generateAudio: entry.generateAudio !== false,
            },
          }, {
            shouldCancel: () => isCancelled,
          })

          if (!resumedResult || isCancelled) {
            return
          }

          updateHistoryItem(entry.id, {
            status: 'success',
            resultUrl: resumedResult.resultUrl,
            taskId: resumedResult.taskId,
            receivedAt: resumedResult.receivedAt,
            completedAt: resumedResult.receivedAt,
            provider: resumedResult.settings.provider,
            model: resumedResult.settings.model,
            ratio: resumedResult.settings.ratio,
            resolution: resumedResult.settings.resolution,
            duration: resumedResult.settings.duration,
            generateAudio: resumedResult.settings.generateAudio,
            errorMessage: '',
          })
          playGenerationSuccessSound()

          const archiveProjectId = (entry.projectId || studioProjectId || '').trim()
          const archiveFolderId = (entry.folderId || studioActiveFolderId || '').trim() || null
          void (async () => {
            const archivedUrl = await archiveVideoToFirebase(
              resumedResult.resultUrl,
              `composer-recovery-${entry.id}-${Date.now()}`,
              archiveProjectId,
              archiveFolderId,
            )

            if (archivedUrl && archivedUrl !== resumedResult.resultUrl) {
              updateHistoryItem(entry.id, { resultUrl: archivedUrl })
            }
          })()
        } catch (error) {
          if (isCancelled) {
            return
          }
          const errorMessage = error instanceof Error ? error.message : 'Recovery failed.'
          const timedOutStillProcessing = isGenerationStillProcessingTimeoutError(error)
          const lowerError = errorMessage.toLowerCase()
          const transientConnectivityError = lowerError.includes('cannot reach local api backend')
            || lowerError.includes('back end server is not working')
            || lowerError.includes('networkerror')
            || lowerError.includes('failed to fetch')

          if (timedOutStillProcessing || transientConnectivityError) {
            resumedHistoryIdsRef.current.delete(entry.id)
            updateHistoryItem(entry.id, {
              status: 'running',
              errorMessage: timedOutStillProcessing
                ? `Still processing: ${errorMessage}`
                : `Recovery paused: ${errorMessage}`,
            })
            return
          }

          updateHistoryItem(entry.id, {
            status: 'failed',
            errorMessage,
            completedAt: Date.now(),
          })
          playGenerationFailureSound()
        }
      })()
    })

    return () => {
      isCancelled = true
    }
  }, [history, runner, updateHistoryItem])

  const startGeneration = useCallback((override?: { projectId?: string; folderId?: string | null }) => {
    if (submittingGenerationRef.current) {
      return
    }

    if (activeModeId !== 'style-transfer' && !promptText.trim()) return

    const activeProjectId = (override?.projectId || studioProjectId || '').trim()
    const activeFolderId = ((override?.folderId ?? studioActiveFolderId) || '').trim()
    if (!activeProjectId || !activeFolderId) {
      return
    }

    submittingGenerationRef.current = true
    setIsSubmittingGeneration(true)

    void (async () => {
      let historyId: string | null = null
      let queuedTaskId = ''
      try {
        const { references: preparedReferences, blockingMessage } = await ensureComposerReferencesArePublic(
          selectedReferences,
          activeProjectId,
          activeFolderId || null,
        )
        if (blockingMessage) {
          throw new Error(blockingMessage)
        }

        if (!areComposerReferencesEqual(selectedReferences, preparedReferences)) {
          setComposerReferences(preparedReferences)
        }

        const unsupportedReference = preparedReferences.find((reference) => getUnsupportedImageReference(reference))
        if (unsupportedReference) {
          throw new Error(`Unsupported image format in reference: ${unsupportedReference.name || unsupportedReference.url}. Use JPG, JPEG, PNG, or WEBP.`)
        }

        if (activeModeId === 'style-transfer') {
          const imageReferenceCount = preparedReferences.filter((reference) => reference.kind === 'image').length
          if (imageReferenceCount < 2) {
            throw new Error('Style transfer needs 2 image references: source style first, destination image second.')
          }
        }

        const request = buildCurrentRequest(preparedReferences)
        const isImageGeneration = isGrokImageGenerationModel(request.settings.model)
        const requestSignature = JSON.stringify([request.endpoint, request.body, activeProjectId, activeFolderId])
        const hasMatchingInFlightRequest = !isImageGeneration && history.some((entry) => {
          if (entry.sourceLabel !== 'Composer') return false
          if (entry.status !== 'queued' && entry.status !== 'running') return false
          return JSON.stringify([
            entry.requestEndpoint || '',
            entry.requestPayload || null,
            entry.projectId || '',
            entry.folderId || '',
          ]) === requestSignature
        })
        if (hasMatchingInFlightRequest) {
          return
        }

        setCurrentComposerPreview(request)

        if (isImageGeneration) {
          // Add a pending card to the history panel so the user sees that
          // generation is in-flight. The button remains in "Starting..." state
          // until the result arrives.
          const nextHistoryId = createClientUniqueId('composer-image')
          const submittedAt = Date.now()
          historyId = nextHistoryId
          locallyStartedHistoryIdsRef.current.add(nextHistoryId)

          addHistoryItem({
            id: nextHistoryId,
            timestamp: submittedAt,
            submittedAt,
            prompt: promptText,
            model: request.settings.model,
            provider: request.settings.provider,
            ratio: request.settings.ratio,
            resolution: request.settings.resolution,
            duration: request.settings.duration,
            generateAudio: request.settings.generateAudio,
            requestEndpoint: request.endpoint,
            requestPayload: request.body,
            mediaUrls: Object.fromEntries(preparedReferences.map((ref, index) => [buildReferenceMediaKey(ref, index), ref.url])),
            sourceLabel: 'Composer',
            status: 'running',
            projectId: activeProjectId,
            folderId: activeFolderId,
          })

          // Release the Generate button as soon as the request is submitted.
          submittingGenerationRef.current = false
          setIsSubmittingGeneration(false)

          // Flash the generate button green to confirm the request was accepted.
          if (generationSubmittedFlashTimerRef.current) {
            clearTimeout(generationSubmittedFlashTimerRef.current)
          }
          setGenerationSubmittedFlash(true)
          generationSubmittedFlashTimerRef.current = setTimeout(() => {
            setGenerationSubmittedFlash(false)
            generationSubmittedFlashTimerRef.current = null
          }, 1200)

          // Show a placeholder card in the assets library while generation runs.
          const firstImageRef = preparedReferences.find((ref) => ref.kind === 'image')
          addPendingGenerationAsset({
            id: nextHistoryId,
            kind: 'image',
            name: promptText.trim().slice(0, 72) || 'Generating…',
            createdAt: submittedAt,
            isPendingGeneration: true,
            referenceImageUrl: firstImageRef?.url,
          })

          const result = await runner.runGeneration(request)

          if (!result) {
            updateHistoryItem(nextHistoryId, { status: 'failed', errorMessage: 'Image generation failed.' })
            return
          }

          const archivedImageUrl = await archiveImageToFirebase(
            result.resultUrl,
            `composer-image-${Date.now()}`,
            activeProjectId,
            activeFolderId || null,
          )
          const finalImageUrl = archivedImageUrl || result.resultUrl

          updateHistoryItem(nextHistoryId, {
            status: 'success',
            resultUrl: finalImageUrl,
            taskId: result.taskId,
            submittedAt: result.submittedAt,
            receivedAt: result.receivedAt,
            completedAt: result.receivedAt,
            provider: result.settings.provider,
            model: result.settings.model,
            ratio: result.settings.ratio,
            resolution: result.settings.resolution,
          })

          removePendingGenerationAsset(nextHistoryId)
          await addGeneratedImageToAssetsLibrary(
            finalImageUrl,
            promptText,
            request.body as Record<string, unknown>,
          )

          showToast({ message: 'Image added to Assets Library', type: 'success' })
          playGenerationSuccessSound()
          return
        }

        const nextHistoryId = createClientUniqueId('composer-history')
        const submittedAt = Date.now()
        historyId = nextHistoryId
        locallyStartedHistoryIdsRef.current.add(nextHistoryId)

        addHistoryItem({
          id: nextHistoryId,
          timestamp: submittedAt,
          submittedAt,
          prompt: promptText,
          model: request.settings.model,
          provider: request.settings.provider,
          ratio: request.settings.ratio,
          resolution: request.settings.resolution,
          duration: request.settings.duration,
          generateAudio: request.settings.generateAudio,
          requestEndpoint: request.endpoint,
          requestPayload: request.body,
          mediaUrls: Object.fromEntries(preparedReferences.map((ref, index) => [buildReferenceMediaKey(ref, index), ref.url])),
          sourceLabel: 'Composer',
          status: 'queued',
          projectId: activeProjectId,
          folderId: activeFolderId,
        })

        const result = await runner.runGeneration(request, {
          onQueued: ({ taskId, submittedAt, settings }) => {
            queuedTaskId = taskId
            submittingGenerationRef.current = false
            setIsSubmittingGeneration(false)
            updateHistoryItem(nextHistoryId, {
              status: 'running',
              taskId,
              submittedAt,
              provider: settings.provider,
              model: settings.model,
              ratio: settings.ratio,
              resolution: settings.resolution,
              duration: settings.duration,
              generateAudio: settings.generateAudio,
            })
          },
          onStatus: () => {
            // Progress is intentionally shown in History Gallery cards.
          },
        })

        if (result) {
          updateHistoryItem(nextHistoryId, {
            status: 'success',
            resultUrl: result.resultUrl,
            taskId: result.taskId,
            submittedAt: result.submittedAt,
            receivedAt: result.receivedAt,
            completedAt: result.receivedAt,
            provider: result.settings.provider,
            model: result.settings.model,
            ratio: result.settings.ratio,
            resolution: result.settings.resolution,
            duration: result.settings.duration,
            generateAudio: result.settings.generateAudio,
          })
          playGenerationSuccessSound()

          const archiveProjectId = activeProjectId
          const archiveFolderId = activeFolderId || null
          const archiveHistoryId = nextHistoryId
          void (async () => {
            const archivedUrl = await archiveVideoToFirebase(
              result.resultUrl,
              `composer-${archiveHistoryId}-${Date.now()}`,
              archiveProjectId,
              archiveFolderId,
            )

            if (archivedUrl && archivedUrl !== result.resultUrl) {
              updateHistoryItem(archiveHistoryId, { resultUrl: archivedUrl })
            }

            // Capture a thumbnail frame in the background. Use the Firebase URL
            // when available (stable CORS), otherwise fall back to the provider URL.
            const thumbSrc = archivedUrl || result.resultUrl
            if (thumbSrc) {
              try {
                const frameDataUrl = await captureFirstVideoFrame(thumbSrc)
                if (frameDataUrl) {
                  updateHistoryItem(archiveHistoryId, { posterUrl: frameDataUrl })
                }
              } catch {
                // Thumbnail capture is optional — ignore errors.
              }
            }
          })()
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Generation failed.'
        const timedOutStillProcessing = isGenerationStillProcessingTimeoutError(error)
          const transientConnectivityError = isTransientGenerationConnectivityError(errorMessage)
          if (historyId && (timedOutStillProcessing || (transientConnectivityError && queuedTaskId))) {
          updateHistoryItem(historyId, {
            status: 'running',
              taskId: queuedTaskId || undefined,
              errorMessage: timedOutStillProcessing
                ? `Still processing: ${errorMessage}`
                : `Recovery paused: ${errorMessage}`,
          })
          return
        }
        console.error(error)
        playGenerationFailureSound()
        if (historyId) {
          updateHistoryItem(historyId, { status: 'failed', errorMessage, completedAt: Date.now() })
        }
      } finally {
        submittingGenerationRef.current = false
        setIsSubmittingGeneration(false)
        if (historyId) {
          removePendingGenerationAsset(historyId)
          locallyStartedHistoryIdsRef.current.delete(historyId)
        }
      }
    })()
  }, [
    addHistoryItem,
    buildCurrentRequest,
    addGeneratedImageToAssetsLibrary,
    addPendingGenerationAsset,
    removePendingGenerationAsset,
    ensureComposerReferencesArePublic,
    history,
    promptText,
    runner,
    setComposerReferences,
    setCurrentComposerPreview,
    selectedReferences,
    activeModeId,
    archiveImageToFirebase,
    archiveVideoToFirebase,
    studioActiveFolderId,
    studioProjectId,
    updateHistoryItem,
  ])

  const hasActiveStudioProjectAndFolder = Boolean((studioProjectId || '').trim() && (studioActiveFolderId || '').trim())
  const isPreparingReferences = publicizingReferenceCount > 0
  const effectiveReferenceAccessMessage = isPreparingReferences
    ? `Preparing ${publicizingReferenceCount} reference asset${publicizingReferenceCount === 1 ? '' : 's'} for public access...`
    : referenceAccessMessage
  const generationBlockedReason = !hasActiveStudioProjectAndFolder
    ? 'Select or create an active project and folder in Explorer before generating.'
    : effectiveReferenceAccessMessage
      ? effectiveReferenceAccessMessage
    : backendCooldownRemainingMs > 0
      ? `Generation is cooling down after backend errors. Retry in ${Math.ceil(backendCooldownRemainingMs / 1000)}s.`
      : backendStatusMessage

  return {
    activeMode,
    activeModeId,
    activeFooterMenu,
    applyDurationSetting,
    applyModelSetting,
    applyPromptFontSize,
    applyRatioSetting,
    applyRefineAction,
    applyResolutionSetting,
    applyTemplate,
    closeMenus,
    composerDurationOptions,
    composerFontSizeOptions,
    composerModelChip,
    composerModelOptions: getComposerModelsForMode(activeModeId),
    composerModeOptions,
    composerRatioOptions,
    composerRefineActions,
    composerResolutionOptions,
    composerSettings,
    composerTemplates,
    isFontSizeMenuOpen,
    isRefineMenuOpen,
    isTemplatesMenuOpen,
    hasActiveStudioProjectAndFolder,
    backendStatusMessage,
    backendCooldownRemainingMs,
    generationBlockedReason,
    isSubmittingGeneration,
    generationSubmittedFlash,
    isPreparingReferences,
    promptFontSize,
    promptText,
    referenceAccessMessage: effectiveReferenceAccessMessage,
    selectMode,
    startGeneration,
    selectedReferences,
    addReference,
    removeReference,
    replaceReference,
    moveReference,
    toggleComposerAudio,
    toggleFooterMenu,
    toggleFontSizeMenu,
    handlePromptBlur,
    handlePromptFocus,
    toggleRefineMenu,
    toggleTemplatesMenu,
    updatePromptText,
    history,
    buildCurrentRequest,
  }
}