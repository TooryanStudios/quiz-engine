export type OpenAIImageOutputFormat = 'png' | 'jpeg' | 'webp'
export type OpenAIImageQuality = 'auto' | 'low' | 'medium' | 'high'
export type OpenAIImageBackground = 'auto' | 'opaque' | 'transparent'
export type OpenAIImageModeration = 'auto' | 'low'

export type OpenAIImageGenerationRequest = {
  prompt: string
  model?: string
  size?: string
  quality?: OpenAIImageQuality
  background?: OpenAIImageBackground
  outputFormat?: OpenAIImageOutputFormat
  outputCompression?: number
  moderation?: OpenAIImageModeration
  n?: number
}

export type OpenAIImageGenerationAsset = {
  id: string
  base64: string
  url: string
  revisedPrompt: string
  mimeType: string
  dataUrl: string
}

export type OpenAIImageGenerationResponse = {
  createdAt: number
  requestedModel?: string
  model: string
  usedFallback?: boolean
  fallbackModel?: string
  fallbackReason?: string
  size: string
  quality: OpenAIImageQuality
  background: OpenAIImageBackground
  outputFormat: OpenAIImageOutputFormat
  moderation: OpenAIImageModeration
  data: OpenAIImageGenerationAsset[]
  usage: Record<string, unknown> | null
}

export type OpenAIImageHealth = {
  ok: boolean
  openaiConfigured: boolean
  openaiImageConfigured?: boolean
  openaiImageModel?: string
  openaiImageFallbackModel?: string
}

export type OpenAIImageFirebaseConfig = {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
}

export type OpenAIImageSavedAsset = {
  firebaseUrl: string
  objectPath: string
  contentType: string
  name: string
}

export type OpenAIImageGenerateAndSaveRequest = OpenAIImageGenerationRequest & {
  fallbackModel?: string
  title?: string
  assetIndex?: number
  storagePathPrefix?: string
  firebaseConfig?: OpenAIImageFirebaseConfig
}

export type OpenAIImageGenerateAndSaveResponse = {
  createdAt: number
  requestedModel?: string
  model: string
  usedFallback?: boolean
  fallbackModel?: string
  fallbackReason?: string
  size: string
  quality: OpenAIImageQuality
  background: OpenAIImageBackground
  outputFormat: OpenAIImageOutputFormat
  moderation: OpenAIImageModeration
  usage: Record<string, unknown> | null
  revisedPrompt: string
  saved: OpenAIImageSavedAsset
}

type GenerateOpenAIImagesOptions = {
  apiBaseUrl?: string
  endpoint?: string
}

const DEFAULT_ENDPOINT = '/api/openai/images/generate'
const DEFAULT_GENERATE_AND_SAVE_ENDPOINT = '/api/openai/images/generate-and-save'
const DEFAULT_HEALTH_ENDPOINT = '/api/health'

const toApiUrl = (apiBaseUrl: string, path: string) => `${apiBaseUrl.replace(/\/$/, '')}${path}`

const buildImageDataUrl = (mimeType: string, base64: string) => {
  const normalizedBase64 = base64.trim()
  if (!normalizedBase64) {
    return ''
  }
  return `data:${mimeType};base64,${normalizedBase64}`
}

export const base64ImageToBlob = (base64: string, mimeType: string): Blob => {
  const binaryString = window.atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let index = 0; index < binaryString.length; index += 1) {
    bytes[index] = binaryString.charCodeAt(index)
  }
  return new Blob([bytes], { type: mimeType })
}

export async function generateOpenAIImages(
  request: OpenAIImageGenerationRequest,
  options: GenerateOpenAIImagesOptions = {},
): Promise<OpenAIImageGenerationResponse> {
  const apiBaseUrl = options.apiBaseUrl || ''
  const endpoint = options.endpoint || DEFAULT_ENDPOINT
  const response = await fetch(toApiUrl(apiBaseUrl, endpoint), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  const payload = await response.json().catch(() => ({})) as {
    error?: string
    createdAt?: number
    requestedModel?: string
    model?: string
    usedFallback?: boolean
    fallbackModel?: string
    fallbackReason?: string
    size?: string
    quality?: OpenAIImageQuality
    background?: OpenAIImageBackground
    outputFormat?: OpenAIImageOutputFormat
    moderation?: OpenAIImageModeration
    data?: Array<{
      id?: string
      base64?: string
      url?: string
      revisedPrompt?: string
      mimeType?: string
    }>
    usage?: Record<string, unknown> | null
  }

  if (!response.ok) {
    throw new Error(payload.error || 'OpenAI image generation failed.')
  }

  const data = Array.isArray(payload.data)
    ? payload.data.map((item, index) => {
        const mimeType = item.mimeType?.trim() || 'image/png'
        const base64 = item.base64?.trim() || ''
        return {
          id: item.id?.trim() || `openai-image-${index + 1}`,
          base64,
          url: item.url?.trim() || '',
          revisedPrompt: item.revisedPrompt?.trim() || '',
          mimeType,
          dataUrl: buildImageDataUrl(mimeType, base64),
        }
      })
    : []

  return {
    createdAt: payload.createdAt || Date.now(),
    requestedModel: payload.requestedModel || request.model || 'gpt-image-2',
    model: payload.model || request.model || 'gpt-image-2',
    usedFallback: payload.usedFallback || false,
    fallbackModel: payload.fallbackModel || '',
    fallbackReason: payload.fallbackReason || '',
    size: payload.size || request.size || 'auto',
    quality: payload.quality || request.quality || 'auto',
    background: payload.background || request.background || 'auto',
    outputFormat: payload.outputFormat || request.outputFormat || 'png',
    moderation: payload.moderation || request.moderation || 'auto',
    data,
    usage: payload.usage || null,
  }
}

export async function generateAndSaveOpenAIImage(
  request: OpenAIImageGenerateAndSaveRequest,
  options: GenerateOpenAIImagesOptions = {},
): Promise<OpenAIImageGenerateAndSaveResponse> {
  const apiBaseUrl = options.apiBaseUrl || ''
  const endpoint = options.endpoint || DEFAULT_GENERATE_AND_SAVE_ENDPOINT
  const response = await fetch(toApiUrl(apiBaseUrl, endpoint), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  const payload = await response.json().catch(() => ({})) as {
    error?: string
    createdAt?: number
    requestedModel?: string
    model?: string
    usedFallback?: boolean
    fallbackModel?: string
    fallbackReason?: string
    size?: string
    quality?: OpenAIImageQuality
    background?: OpenAIImageBackground
    outputFormat?: OpenAIImageOutputFormat
    moderation?: OpenAIImageModeration
    usage?: Record<string, unknown> | null
    revisedPrompt?: string
    saved?: {
      firebaseUrl?: string
      objectPath?: string
      contentType?: string
      name?: string
    }
  }

  if (!response.ok) {
    throw new Error(payload.error || 'OpenAI image generation and save failed.')
  }

  return {
    createdAt: payload.createdAt || Date.now(),
    requestedModel: payload.requestedModel || request.model || 'gpt-image-2',
    model: payload.model || request.model || 'gpt-image-2',
    usedFallback: payload.usedFallback || false,
    fallbackModel: payload.fallbackModel || '',
    fallbackReason: payload.fallbackReason || '',
    size: payload.size || request.size || 'auto',
    quality: payload.quality || request.quality || 'auto',
    background: payload.background || request.background || 'auto',
    outputFormat: payload.outputFormat || request.outputFormat || 'png',
    moderation: payload.moderation || request.moderation || 'auto',
    usage: payload.usage || null,
    revisedPrompt: payload.revisedPrompt || '',
    saved: {
      firebaseUrl: payload.saved?.firebaseUrl?.trim() || '',
      objectPath: payload.saved?.objectPath?.trim() || '',
      contentType: payload.saved?.contentType?.trim() || 'image/png',
      name: payload.saved?.name?.trim() || request.title?.trim() || 'OpenAI image',
    },
  }
}

export async function fetchOpenAIImageHealth(apiBaseUrl = '', healthEndpoint = DEFAULT_HEALTH_ENDPOINT): Promise<OpenAIImageHealth> {
  const response = await fetch(toApiUrl(apiBaseUrl, healthEndpoint))
  const payload = await response.json().catch(() => ({})) as OpenAIImageHealth
  if (!response.ok) {
    throw new Error('Could not load OpenAI image health status.')
  }
  return payload
}