type GenerationProvider = 'byteplus' | 'atlas' | 'grok'
type RequestMode = 'text-to-video' | 'image-to-video' | 'reference-to-video' | 'video-extension'
type MediaKind = 'image' | 'video' | 'audio'

type ContentItem =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string }; role?: string }
  | { type: 'video_url'; video_url: { url: string }; role?: string }
  | { type: 'audio_url'; audio_url: { url: string }; role?: string }

export type ToorGenMediaField = {
  key: string
  label: string
  kind: MediaKind
  helpText: string
  placeholder: string
  required?: boolean
  role?: string
}

export type ToorGenRequestTab = {
  id: string
  requestMode: RequestMode
  fields: ToorGenMediaField[]
  primaryVideoKey?: string
}

export type ToorGenRequestState = {
  prompt: string
  mediaUrls: Record<string, string>
  strictReferences?: boolean
  selectedVideoOptionIds?: string[]
  selectedImageReferenceKey?: string
}

export type ToorGenRequestSettings = {
  provider: GenerationProvider
  model: string
  ratio: string
  duration: number
  resolution: string
  generateAudio: boolean
}

export type ToorGenMentionReference = {
  mention: string
  name: string
  url: string
  kind: MediaKind
  role?: string
}

export type ToorGenVideoWorkflowOption = {
  id: string
  instruction: string
}

type BuildToorGenRequestOptions = {
  tab: ToorGenRequestTab
  state: ToorGenRequestState
  settings: ToorGenRequestSettings
  mentionReferences: ToorGenMentionReference[]
  getEffectiveReferenceFields?: (fields: ToorGenMediaField[]) => ToorGenMediaField[]
  combinedReferenceTabId?: string
  singleImageTabId?: string
  videoWorkflowOptions?: ToorGenVideoWorkflowOption[]
}

const identityFields = (fields: ToorGenMediaField[]) => fields

const buildReferenceAliases = (mentionReferences: ToorGenMentionReference[]) => Object.fromEntries(
  mentionReferences.map((entry) => [entry.mention, {
    name: entry.name,
    url: entry.url,
    kind: entry.kind,
    role: entry.role,
  }]),
)

const buildByteplusContent = (
  tab: ToorGenRequestTab,
  state: ToorGenRequestState,
  mentionReferences: ToorGenMentionReference[],
): ContentItem[] => {
  const content: ContentItem[] = []
  const mentionedImageRefs = mentionReferences.filter((entry) => entry.kind === 'image')
  const mentionedVideoRefs = mentionReferences.filter((entry) => entry.kind === 'video')

  if (state.prompt.trim()) {
    content.push({ type: 'text', text: state.prompt.trim() })
  }

  if (mentionReferences.length > 0) {
    const summary = mentionReferences
      .map((entry) => `${entry.mention} => ${entry.name} (${entry.url})`)
      .join('\n')
    content.push({ type: 'text', text: `Reference aliases:\n${summary}` })
  }

  mentionedImageRefs.forEach((entry) => {
    content.push({
      type: 'image_url',
      image_url: { url: entry.url },
      role: entry.role,
    })
  })

  mentionedVideoRefs.forEach((entry) => {
    content.push({
      type: 'video_url',
      video_url: { url: entry.url },
      role: entry.role,
    })
  })

  for (const field of tab.fields) {
    if (field.kind === 'audio') {
      const url = state.mediaUrls[field.key]?.trim()
      if (!url) continue
      content.push({
        type: 'audio_url',
        audio_url: { url },
        role: field.role || 'reference_audio',
      })
    }
  }

  return content
}

const resolveAtlasModelForMode = (
  selectedModel: string,
  requestMode: RequestMode,
): string => {
  const raw = (selectedModel || '').trim()
  if (!raw) return 'bytedance/seedance-2.0-fast/text-to-video'
  if (raw.includes('/')) return raw

  const lower = raw.toLowerCase()
  const baseModel = lower.includes('fast')
    ? 'bytedance/seedance-2.0-fast'
    : 'bytedance/seedance-2.0'

  const modeSuffix = requestMode === 'image-to-video'
    ? 'image-to-video'
    : (requestMode === 'reference-to-video' || requestMode === 'video-extension')
      ? 'reference-to-video'
      : 'text-to-video'

  return `${baseModel}/${modeSuffix}`
}

const collectAttachedReferenceUrls = (
  fields: ToorGenMediaField[],
  mediaUrls: Record<string, string>,
): { imageUrls: string[]; videoUrls: string[] } => {
  const imageUrls: string[] = []
  const videoUrls: string[] = []
  const seenImages = new Set<string>()
  const seenVideos = new Set<string>()

  fields.forEach((field) => {
    const url = (mediaUrls[field.key] || '').trim()
    if (!url) return
    if (field.kind === 'image') {
      if (!seenImages.has(url)) {
        seenImages.add(url)
        imageUrls.push(url)
      }
      return
    }
    if (field.kind === 'video') {
      if (!seenVideos.has(url)) {
        seenVideos.add(url)
        videoUrls.push(url)
      }
    }
  })

  return { imageUrls, videoUrls }
}

const buildAtlasPayload = ({
  tab,
  state,
  settings,
  mentionReferences,
  getEffectiveReferenceFields,
  combinedReferenceTabId,
  singleImageTabId,
  videoWorkflowOptions,
}: BuildToorGenRequestOptions): Record<string, unknown> => {
  const atlasModel = resolveAtlasModelForMode(settings.model, tab.requestMode)
  const effectiveReferenceFields = (getEffectiveReferenceFields || identityFields)(tab.fields)

  if (singleImageTabId && tab.id === singleImageTabId) {
    const selectedImageFieldKey = state.selectedImageReferenceKey || ''
    const selectedImageUrl = selectedImageFieldKey
      ? (state.mediaUrls[selectedImageFieldKey] || '').trim()
      : ''
    const fallbackImageUrl = effectiveReferenceFields
      .filter((field) => field.kind === 'image')
      .map((field) => (state.mediaUrls[field.key] || '').trim())
      .find(Boolean) || ''
    return {
      model: atlasModel,
      duration: settings.duration,
      resolution: settings.resolution,
      ratio: settings.ratio,
      generate_audio: settings.generateAudio,
      watermark: false,
      return_last_frame: false,
      image: selectedImageUrl || fallbackImageUrl,
      prompt: state.prompt.trim(),
    }
  }

  if (combinedReferenceTabId && tab.id === combinedReferenceTabId) {
    const mentionedReferenceImages = mentionReferences
      .filter((ref) => ref.kind === 'image')
      .map((ref) => ref.url)
    const mentionedReferenceVideos = mentionReferences
      .filter((ref) => ref.kind === 'video')
      .map((ref) => ref.url)
    const attachedReferences = collectAttachedReferenceUrls(effectiveReferenceFields, state.mediaUrls)
    const referenceImages = mentionedReferenceImages.length > 0 ? mentionedReferenceImages : attachedReferences.imageUrls
    const referenceVideos = mentionedReferenceVideos.length > 0 ? mentionedReferenceVideos : attachedReferences.videoUrls
    const effectiveMode: RequestMode = tab.requestMode === 'reference-to-video' || tab.requestMode === 'image-to-video'
      ? tab.requestMode
      : referenceVideos.length > 0
        ? 'reference-to-video'
        : referenceImages.length > 0
          ? 'image-to-video'
          : 'text-to-video'
    const atlasModelForReferenceSet = resolveAtlasModelForMode(settings.model, effectiveMode)

    const validVideoOptions = (videoWorkflowOptions || []).filter((option) => (state.selectedVideoOptionIds || []).includes(option.id))
    const optionInstructions = validVideoOptions.map((option) => option.instruction)
    const strictReferenceInstruction = state.strictReferences
      ? 'Strict reference lock: keep the exact same art style, look, mood, color logic, and identity traits from references with minimal deviation.'
      : ''

    const basePrompt = referenceImages.length === 1
      ? state.prompt.trim().replace(/\breference images\b/gi, 'reference image')
      : state.prompt.trim()

    const promptControlLines = [
      ...optionInstructions,
      strictReferenceInstruction,
    ].filter(Boolean)

    const enrichedPrompt = promptControlLines.length > 0
      ? `${basePrompt}\n\nReference controls:\n- ${promptControlLines.join('\n- ')}`
      : basePrompt

    return {
      model: atlasModelForReferenceSet,
      duration: settings.duration,
      resolution: settings.resolution,
      ratio: settings.ratio,
      generate_audio: settings.generateAudio,
      watermark: false,
      return_last_frame: false,
      reference_images: referenceImages,
      reference_videos: referenceVideos,
      reference_images_label: referenceImages.length === 1 ? 'reference image' : 'reference images',
      prompt: enrichedPrompt,
      providerHint: 'atlas',
    }
  }

  const mentionedImageUrls = mentionReferences
    .filter((entry) => entry.kind === 'image')
    .map((entry) => entry.url)

  const mentionedVideoUrls = mentionReferences
    .filter((entry) => entry.kind === 'video')
    .map((entry) => entry.url)

  const attachedReferences = collectAttachedReferenceUrls(effectiveReferenceFields, state.mediaUrls)
  const imageUrls = mentionedImageUrls.length > 0 ? mentionedImageUrls : attachedReferences.imageUrls
  const videoUrls = mentionedVideoUrls.length > 0 ? mentionedVideoUrls : attachedReferences.videoUrls

  const audioUrls = effectiveReferenceFields
    .filter((field) => field.kind === 'audio')
    .map((field) => state.mediaUrls[field.key]?.trim() || '')
    .filter(Boolean)

  const body: Record<string, unknown> = {
    prompt: state.prompt.trim(),
    model: atlasModel,
    providerHint: 'fast',
    duration: settings.duration,
    aspect_ratio: settings.ratio,
    resolution: settings.resolution,
    generate_audio: settings.generateAudio,
    public: false,
    mode: tab.requestMode,
  }

  if (imageUrls.length > 0) {
    body.images = imageUrls
  }

  if (videoUrls.length > 0) {
    body.reference_videos = videoUrls
  }

  if (audioUrls.length > 0) {
    body.reference_audios = audioUrls
  }

  if (tab.primaryVideoKey) {
    const primaryVideo = state.mediaUrls[tab.primaryVideoKey]?.trim() || ''
    const sourceVideo = primaryVideo && videoUrls.includes(primaryVideo)
      ? primaryVideo
      : (videoUrls[0] || '')
    if (sourceVideo && (tab.requestMode === 'reference-to-video' || tab.requestMode === 'video-extension')) {
      body.videoUrl = sourceVideo
      body.video_url = sourceVideo
      body.source_video_url = sourceVideo
      if (tab.requestMode === 'video-extension') {
        body.extension_video_url = sourceVideo
      }
    }
  }

  if (tab.requestMode === 'image-to-video' && imageUrls[0]) {
    body.image = imageUrls[0]
    body.image_url = imageUrls[0]
  }

  if (mentionReferences.length > 0) {
    body.mention_references = mentionReferences
    body.reference_aliases = buildReferenceAliases(mentionReferences)
  }

  return body
}

export const buildToorGenRequest = ({
  tab,
  state,
  settings,
  mentionReferences,
  getEffectiveReferenceFields,
  combinedReferenceTabId,
  singleImageTabId,
  videoWorkflowOptions,
}: BuildToorGenRequestOptions): { endpoint: string; body: Record<string, unknown> } => {
  const atlasBuilderOptions: BuildToorGenRequestOptions = {
    tab,
    state,
    settings,
    mentionReferences,
    getEffectiveReferenceFields,
    combinedReferenceTabId,
    singleImageTabId,
    videoWorkflowOptions,
  }

  const requiresAtlasPayload = tab.id === combinedReferenceTabId || tab.id === singleImageTabId


  if (settings.provider === 'grok') {
    const atlasPayload = buildAtlasPayload(atlasBuilderOptions)
    const normalizedModel = settings.model.trim().toLowerCase().includes('grok')
      ? settings.model.trim()
      : 'grok-imagine-video'
    const grokPayload: Record<string, unknown> = {
      ...atlasPayload,
      model: normalizedModel,
      providerHint: 'grok',
    }

    // Patch: For Grok image edits, use image: { url } if exactly one image, else image_urls
    let imageUrls: string[] = []
    if (Array.isArray(grokPayload.reference_images)) {
      imageUrls = grokPayload.reference_images as string[]
    } else if (Array.isArray(grokPayload.images)) {
      imageUrls = grokPayload.images as string[]
    } else if (typeof grokPayload.image === 'string' && grokPayload.image.trim()) {
      imageUrls = [grokPayload.image.trim()]
    }

    // Remove all image fields to avoid duplicates
    delete grokPayload.reference_images
    delete grokPayload.images
    delete grokPayload.image
    delete grokPayload.image_url

    if (imageUrls.length === 1) {
      grokPayload.image = { url: imageUrls[0] }
    } else if (imageUrls.length > 1) {
      grokPayload.image_urls = imageUrls
    }

    return {
      endpoint: '/api/seedance/generate',
      body: grokPayload,
    }
  }

  if (requiresAtlasPayload) {
    return {
      endpoint: '/api/seedance/generate',
      body: buildAtlasPayload(atlasBuilderOptions),
    }
  }

  if (settings.provider === 'atlas') {
    return {
      endpoint: '/api/seedance/generate',
      body: buildAtlasPayload(atlasBuilderOptions),
    }
  }

  return {
    endpoint: '/api/byteplus/generate',
    body: {
      model: settings.model,
      ratio: settings.ratio,
      duration: settings.duration,
      resolution: settings.resolution,
      generate_audio: settings.generateAudio,
      mention_references: mentionReferences,
      reference_aliases: buildReferenceAliases(mentionReferences),
      content: buildByteplusContent(tab, state, mentionReferences),
    },
  }
}