import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useGenerationRunner } from '../../hooks/useGenerationRunner'
import { firebaseConfig } from '../../lib/firebase'
import { playGenerationFailureSound, playGenerationSuccessSound } from './generationSounds'
import { buildToorGenRequest } from '../../lib/toorgen/generationRequestBuilder'
import type { StudioComposerPromptFontSize, StudioProjectComposerDraft } from '../../types/studio'
import { useLabNewLayoutData } from './useLabNewLayoutWorkspace'
import { useLabNewLayoutStore } from './useLabNewLayoutStore'

const CHATBOT_BASE = (import.meta.env.VITE_CHATBOT_API_URL as string | undefined) || ''
const COMPOSER_PROJECT_SCOPE_ID = '__project__'
const DRAFT_SAVE_DEBOUNCE_MS = 450

type ComposerRequestSettingsState = {
  provider: 'atlas'
  model: string
  ratio: string
  duration: number
  resolution: string
  generateAudio: boolean
}

const defaultComposerSettings: ComposerRequestSettingsState = {
  provider: 'atlas',
  model: 'bytedance/seedance-2.0-fast',
  ratio: '16:9',
  duration: 15,
  resolution: '480p',
  generateAudio: true,
}

const defaultPromptFontSize: StudioComposerPromptFontSize = 'medium'

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

export const composerModelOptions: ComposerSettingsOption[] = [
  { id: 'atlas-2.0', label: 'Atlas Cloud 2.0', description: 'Seedance 2.0 on Atlas Cloud' },
  { id: 'seedance-2.0-fast', label: 'Atlas Cloud 2.0 Fast', description: 'Fast Atlas Cloud variant' },
  { id: 'seedance-2.0', label: 'Seedance 2.0 API', description: 'Standard Seedance API route' },
  { id: 'seedance-1.5', label: 'Seedance 1.5 API', description: 'Legacy Seedance route' },
]

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
  return {
    provider: draft?.provider === 'atlas' ? 'atlas' : defaultComposerSettings.provider,
    model: draft?.model || defaultComposerSettings.model,
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

export function useLabNewLayoutComposer() {
  const {
    studioProjectId,
    studioActiveFolderId,
    projectNewLayoutConfig,
    projectNewLayoutConfigLoading,
    updateProjectNewLayoutConfig,
  } = useLabNewLayoutData()
  const [activeModeId, setActiveModeId] = useState('video')
  const [promptText, setPromptText] = useState('')
  const [isPromptFocused, setIsPromptFocused] = useState(false)
  const [promptFontSize, setPromptFontSize] = useState<StudioComposerPromptFontSize>(defaultPromptFontSize)
  const [composerSettings, setComposerSettings] = useState<ComposerRequestSettingsState>(defaultComposerSettings)
  const [isTemplatesMenuOpen, setTemplatesMenuOpen] = useState(false)
  const [isRefineMenuOpen, setRefineMenuOpen] = useState(false)
  const [isFontSizeMenuOpen, setFontSizeMenuOpen] = useState(false)
  const [activeFooterMenu, setActiveFooterMenu] = useState<ComposerFooterMenuId | null>(null)

  const selectedReferences = useLabNewLayoutStore((state) => state.composerReferences)
  const addComposerReference = useLabNewLayoutStore((state) => state.addComposerReference)
  const removeComposerReference = useLabNewLayoutStore((state) => state.removeComposerReference)
  const setCurrentComposerPreview = useLabNewLayoutStore((state) => state.setCurrentComposerPreview)
  const composerPreviewRefreshNonce = useLabNewLayoutStore((state) => state.composerPreviewRefreshNonce)
  const setComposerReferences = useLabNewLayoutStore((state) => state.setComposerReferences)
  const addHistoryItem = useLabNewLayoutStore((state) => state.addHistoryItem)
  const updateHistoryItem = useLabNewLayoutStore((state) => state.updateHistoryItem)
  const history = useLabNewLayoutStore((state) => state.history)

  const runner = useGenerationRunner({
    apiBaseUrl: CHATBOT_BASE,
  })

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
  const pendingPersistSignatureRef = useRef<string | null>(null)

  useEffect(() => {
    pendingPersistSignatureRef.current = null
  }, [composerDraftScopeId])

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

    const incomingDraftSignature = activeScopeDraft ? createDraftSignature(activeScopeDraft) : ''
    const isHydratingNewScope = hydratedScopeIdRef.current !== composerDraftScopeId

    if (!isHydratingNewScope && !pendingPersistSignatureRef.current) {
      return
    }

    if (pendingPersistSignatureRef.current) {
      if (incomingDraftSignature !== pendingPersistSignatureRef.current) {
        return
      }
      pendingPersistSignatureRef.current = null
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
    pendingPersistSignatureRef.current = createDraftSignature(nextDraft)
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
    setComposerSettings((current) => ({ ...current, model }))
    setActiveFooterMenu(null)
  }, [])

  const toggleComposerAudio = useCallback(() => {
    setComposerSettings((current) => ({ ...current, generateAudio: !current.generateAudio }))
  }, [])

  const closeMenus = useCallback(() => {
    setTemplatesMenuOpen(false)
    setRefineMenuOpen(false)
    setFontSizeMenuOpen(false)
    setActiveFooterMenu(null)
  }, [])

  const buildCurrentRequest = useCallback(() => {
    const tab = {
      id: activeModeId,
      requestMode: (activeModeId === 'video' ? 'reference-to-video' : 'text-to-video') as 'reference-to-video' | 'text-to-video',
      fields: selectedReferences.map((ref, idx) => ({ kind: ref.kind, key: `ref_${idx}` as string, isRequired: false, label: '', helpText: '', placeholder: '' })),
    }

    const requestState = {
      prompt: promptText,
      mediaUrls: Object.fromEntries(selectedReferences.map((ref, idx) => [`ref_${idx}`, ref.url])),
    }

    const request = buildToorGenRequest({
      tab,
      state: requestState,
      settings: composerSettings,
      mentionReferences: selectedReferences.map(ref => ({ name: ref.name, mention: ref.name, kind: ref.kind, role: 'general', url: ref.url })),
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
    if (typeof composerReuseSeed.prompt === 'string') {
      setPromptText(composerReuseSeed.prompt)
    }
    if (Array.isArray(composerReuseSeed.references)) {
      setComposerReferences(composerReuseSeed.references.map((ref) => ({
        id: ref.id,
        url: ref.url,
        kind: ref.kind,
        name: ref.name,
      })))
    }
    setComposerReuseSeed(null)
  }, [composerReuseSeed, setComposerReferences, setComposerReuseSeed])

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
              model: entry.model || 'bytedance/seedance-2.0-fast',
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
          const lowerError = errorMessage.toLowerCase()
          const transientConnectivityError = lowerError.includes('cannot reach local api backend')
            || lowerError.includes('back end server is not working')
            || lowerError.includes('networkerror')
            || lowerError.includes('failed to fetch')

          if (transientConnectivityError) {
            updateHistoryItem(entry.id, {
              status: 'running',
              errorMessage: `Recovery paused: ${errorMessage}`,
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

  const startGeneration = useCallback(() => {
    if (!promptText.trim()) return

    const request = buildCurrentRequest()
    setCurrentComposerPreview(request)
    const historyId = createClientUniqueId('composer-history')

    addHistoryItem({
      id: historyId,
      timestamp: Date.now(),
      prompt: promptText,
      model: request.settings.model,
      provider: request.settings.provider,
      ratio: request.settings.ratio,
      resolution: request.settings.resolution,
      duration: request.settings.duration,
      generateAudio: request.settings.generateAudio,
      requestEndpoint: request.endpoint,
      requestPayload: request.body,
      mediaUrls: Object.fromEntries(selectedReferences.map((ref, index) => [`ref_${index + 1}`, ref.url])),
      sourceLabel: 'Composer',
      status: 'queued',
      projectId: studioProjectId || undefined,
      folderId: studioActiveFolderId || undefined,
    })

    void (async () => {
      try {
        const unsupportedReference = selectedReferences.find((reference) => getUnsupportedImageReference(reference))
        if (unsupportedReference) {
          throw new Error(`Unsupported image format in reference: ${unsupportedReference.name || unsupportedReference.url}. Use JPG, JPEG, PNG, or WEBP.`)
        }

        const result = await runner.runGeneration(request, {
          onQueued: ({ taskId, submittedAt, settings }) => {
            updateHistoryItem(historyId, {
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
          updateHistoryItem(historyId, {
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

          const archiveProjectId = (studioProjectId || '').trim()
          const archiveFolderId = (studioActiveFolderId || '').trim() || null
          void (async () => {
            const archivedUrl = await archiveVideoToFirebase(
              result.resultUrl,
              `composer-${historyId}-${Date.now()}`,
              archiveProjectId,
              archiveFolderId,
            )

            if (archivedUrl && archivedUrl !== result.resultUrl) {
              updateHistoryItem(historyId, { resultUrl: archivedUrl })
            }
          })()
        }
      } catch (error) {
        console.error(error)
        const errorMessage = error instanceof Error ? error.message : 'Generation failed.'
        playGenerationFailureSound()
        updateHistoryItem(historyId, { status: 'failed', errorMessage, completedAt: Date.now() })
      }
    })()
  }, [
    addHistoryItem,
    buildCurrentRequest,
    promptText,
    runner,
    setCurrentComposerPreview,
    selectedReferences,
    archiveVideoToFirebase,
    studioActiveFolderId,
    studioProjectId,
    updateHistoryItem,
  ])

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
    composerModelOptions,
    composerModeOptions,
    composerRatioOptions,
    composerRefineActions,
    composerResolutionOptions,
    composerSettings,
    composerTemplates,
    isFontSizeMenuOpen,
    isRefineMenuOpen,
    isTemplatesMenuOpen,
    promptFontSize,
    promptText,
    selectMode,
    startGeneration,
    selectedReferences,
    addReference,
    removeReference,
    toggleComposerAudio,
    toggleFooterMenu,
    toggleFontSizeMenu,
    handlePromptBlur,
    handlePromptFocus,
    toggleRefineMenu,
    toggleTemplatesMenu,
    updatePromptText,
    history,
  }
}