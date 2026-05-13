import { saveUserReferenceLibraryItem } from '../studioService'
import {
  mergeMediaLibraryItems,
  readLocalMediaLibrary,
  writeLocalMediaLibrary,
  type MediaLibraryItem,
} from '../toorgen/referenceLibrary'
import { uploadBlobToFirebase } from '../toorgen/generationPersistence'
import {
  base64ImageToBlob,
  generateOpenAIImages,
  type OpenAIImageGenerationAsset,
  type OpenAIImageGenerationResponse,
  type OpenAIImageGenerateAndSaveRequest,
  type OpenAIImageGenerateAndSaveResponse,
} from './openAIImageClient'

const DEFAULT_STORAGE_PREFIX = 'toorgen-lab/openai-images'
const DEFAULT_MAX_LIBRARY_ITEMS = 200

type SaveOpenAIImageAssetToLibraryOptions = {
  asset: OpenAIImageGenerationAsset
  prompt: string
  title?: string
  studioProjectId?: string | null
  authUid?: string
  storagePathPrefix?: string
  maxItems?: number
  generationModel?: string
  generationProvider?: string
  generationAspectRatio?: string
  generationResolution?: string
  generationSource?: string
  generationRequestPayload?: Record<string, unknown>
}

type GenerateAndSaveOpenAIImageToLibraryOptions = {
  request: OpenAIImageGenerateAndSaveRequest
  apiBaseUrl?: string
  endpoint?: string
  studioProjectId?: string | null
  authUid?: string
  maxItems?: number
}

export type SavedOpenAIImageAsset = {
  firebaseUrl: string
  objectPath: string
  contentType: string
  item: MediaLibraryItem
  savedTo: 'user' | 'project' | 'local'
}

export type GenerateAndSaveOpenAIImageToLibraryResult = {
  generation: OpenAIImageGenerateAndSaveResponse
  library: SavedOpenAIImageAsset
}

const toSafeName = (value: string) => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return normalized || 'openai-image'
}

const buildDefaultAssetTitle = (prompt: string) => {
  const trimmedPrompt = prompt.trim().replace(/\s+/g, ' ')
  if (!trimmedPrompt) {
    return 'OpenAI image'
  }

  return trimmedPrompt.length <= 72
    ? trimmedPrompt
    : `${trimmedPrompt.slice(0, 69).trimEnd()}...`
}

const inferExtension = (mimeType: string) => {
  if (mimeType === 'image/jpeg') {
    return 'jpg'
  }
  if (mimeType === 'image/webp') {
    return 'webp'
  }
  return 'png'
}

const resolveAssetBlob = async (asset: OpenAIImageGenerationAsset): Promise<Blob> => {
  if (asset.base64.trim()) {
    return base64ImageToBlob(asset.base64, asset.mimeType || 'image/png')
  }

  const remoteUrl = asset.url.trim()
  if (!remoteUrl) {
    throw new Error('Generated image is missing image data.')
  }

  const response = await fetch(remoteUrl)
  if (!response.ok) {
    throw new Error(`Failed to download generated image: HTTP ${response.status}`)
  }

  return response.blob()
}

export async function saveOpenAIImageAssetToLibrary({
  asset,
  prompt,
  title,
  studioProjectId,
  authUid,
  storagePathPrefix = DEFAULT_STORAGE_PREFIX,
  maxItems = DEFAULT_MAX_LIBRARY_ITEMS,
  generationModel,
  generationProvider,
  generationAspectRatio,
  generationResolution,
  generationSource = 'openai-image',
  generationRequestPayload,
}: SaveOpenAIImageAssetToLibraryOptions): Promise<SavedOpenAIImageAsset> {
  const normalizedProjectId = studioProjectId?.trim() || ''
  const normalizedAuthUid = authUid?.trim() || ''

  if (normalizedProjectId && !normalizedAuthUid) {
    throw new Error('Authentication is required to save into a project assets library.')
  }

  const blob = await resolveAssetBlob(asset)
  const createdAt = Date.now()
  const resolvedTitle = title?.trim() || buildDefaultAssetTitle(prompt)
  const resolvedMimeType = asset.mimeType || blob.type || 'image/png'
  const storageBase = storagePathPrefix.trim().replace(/\/$/, '') || DEFAULT_STORAGE_PREFIX
  const storagePath = `${storageBase}/${createdAt}-${toSafeName(resolvedTitle)}.${inferExtension(resolvedMimeType)}`
  const firebaseUrl = await uploadBlobToFirebase(blob, storagePath, resolvedMimeType)

  return persistOpenAIImageToLibrary({
    firebaseUrl,
    prompt,
    title: resolvedTitle,
    studioProjectId,
    authUid,
    maxItems,
    generationModel,
    generationProvider,
    generationAspectRatio,
    generationResolution,
    generationSource,
    generationRequestPayload,
    objectPath: storagePath,
    contentType: resolvedMimeType,
  })
}

export async function persistOpenAIImageToLibrary({
  firebaseUrl,
  prompt,
  title,
  studioProjectId,
  authUid,
  maxItems = DEFAULT_MAX_LIBRARY_ITEMS,
  generationModel,
  generationProvider,
  generationAspectRatio,
  generationResolution,
  generationSource = 'openai-image',
  generationRequestPayload,
  objectPath,
  contentType,
}: {
  firebaseUrl: string
  prompt: string
  title?: string
  studioProjectId?: string | null
  authUid?: string
  maxItems?: number
  generationModel?: string
  generationProvider?: string
  generationAspectRatio?: string
  generationResolution?: string
  generationSource?: string
  generationRequestPayload?: Record<string, unknown>
  objectPath?: string
  contentType?: string
}): Promise<SavedOpenAIImageAsset> {
  const normalizedFirebaseUrl = firebaseUrl.trim()
  if (!normalizedFirebaseUrl) {
    throw new Error('firebaseUrl is required to persist an OpenAI image.')
  }

  const item: MediaLibraryItem = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    kind: 'image',
    url: normalizedFirebaseUrl,
    name: title?.trim() || buildDefaultAssetTitle(prompt),
    createdAt: Date.now(),
    projectId: (studioProjectId?.trim() || '') || undefined,
    generationPrompt: prompt,
    generationModel,
    generationProvider,
    generationAspectRatio,
    generationResolution,
    generationSource,
    generationRequestPayload,
  }

  const normalizedProjectId = studioProjectId?.trim() || ''
  const normalizedAuthUid = authUid?.trim() || ''

  if (normalizedAuthUid) {
    await saveUserReferenceLibraryItem(normalizedAuthUid, {
      ...item,
      projectId: normalizedProjectId || undefined,
      generationPrompt: prompt,
      generationModel,
      generationProvider,
      generationAspectRatio,
      generationResolution,
      generationSource,
      generationRequestPayload,
    })

    return {
      firebaseUrl: normalizedFirebaseUrl,
      objectPath: objectPath?.trim() || '',
      contentType: contentType?.trim() || 'image/png',
      item,
      savedTo: 'user',
    }
  }

  const nextItems = mergeMediaLibraryItems([item], readLocalMediaLibrary()).slice(0, maxItems)
  writeLocalMediaLibrary(nextItems)

  return {
    firebaseUrl: normalizedFirebaseUrl,
    objectPath: objectPath?.trim() || '',
    contentType: contentType?.trim() || 'image/png',
    item,
    savedTo: 'local',
  }
}

const buildGenerateAndSaveResult = ({
  generation,
  asset,
  library,
}: {
  generation: OpenAIImageGenerationResponse
  asset: OpenAIImageGenerationAsset
  library: SavedOpenAIImageAsset
}): OpenAIImageGenerateAndSaveResponse => ({
  createdAt: generation.createdAt,
  requestedModel: generation.requestedModel,
  model: generation.model,
  usedFallback: generation.usedFallback,
  fallbackModel: generation.fallbackModel,
  fallbackReason: generation.fallbackReason,
  size: generation.size,
  quality: generation.quality,
  background: generation.background,
  outputFormat: generation.outputFormat,
  moderation: generation.moderation,
  usage: generation.usage,
  revisedPrompt: asset.revisedPrompt || generation.data[0]?.revisedPrompt || '',
  saved: {
    firebaseUrl: library.firebaseUrl,
    objectPath: library.objectPath,
    contentType: library.contentType,
    name: library.item.name,
  },
})

export async function generateAndSaveOpenAIImageToLibrary({
  request,
  apiBaseUrl,
  endpoint,
  studioProjectId,
  authUid,
  maxItems,
}: GenerateAndSaveOpenAIImageToLibraryOptions): Promise<GenerateAndSaveOpenAIImageToLibraryResult> {
  const generation = await generateOpenAIImages(request, {
    apiBaseUrl,
    endpoint,
  })

  const normalizedAssetIndex = Number.isFinite(request.assetIndex)
    ? Math.max(0, Math.min(generation.data.length - 1, Number(request.assetIndex)))
    : 0
  const targetAsset = generation.data[normalizedAssetIndex]

  if (!targetAsset) {
    throw new Error('OpenAI image generation returned no image data.')
  }

  const library = await saveOpenAIImageAssetToLibrary({
    asset: targetAsset,
    prompt: request.prompt,
    title: request.title,
    studioProjectId,
    authUid,
    maxItems,
    storagePathPrefix: request.storagePathPrefix,
    generationModel: generation.model,
    generationProvider: 'openai',
    generationResolution: generation.size,
    generationSource: 'openai-image',
  })

  return {
    generation: buildGenerateAndSaveResult({ generation, asset: targetAsset, library }),
    library,
  }
}