export type OpenAIImageOutputFormat = 'png' | 'jpeg' | 'webp'
export type OpenAIImageQuality = 'auto' | 'low' | 'medium' | 'high'
export type OpenAIImageBackground = 'auto' | 'opaque' | 'transparent'
export type OpenAIImageModeration = 'auto' | 'low'

export type OpenAIImageGenerationRequest = {
  prompt: string
  model?: string
  fallbackModel?: string
  size?: string
  quality?: OpenAIImageQuality
  background?: OpenAIImageBackground
  outputFormat?: OpenAIImageOutputFormat
  outputCompression?: number
  moderation?: OpenAIImageModeration
  n?: number
  referenceImages?: string[]
  clientRequestId?: string
  sourceLabel?: string
}

export type OpenAIImageTaskStatus = 'queued' | 'running' | 'completed' | 'failed'

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

export type OpenAIImageTaskResponse = {
  taskId: string
  status: OpenAIImageTaskStatus
  createdAt: number
  updatedAt: number
  submittedAt: number | null
  completedAt: number | null
  requestedModel?: string
  fallbackModel?: string
  model?: string
  size: string
  quality: OpenAIImageQuality
  background: OpenAIImageBackground
  outputFormat: OpenAIImageOutputFormat
  moderation: OpenAIImageModeration
  n: number
  prompt: string
  referenceImages: string[]
  sourceLabel?: string
  clientRequestId?: string
  error?: string
  usedFallback?: boolean
  fallbackReason?: string
  usage: Record<string, unknown> | null
  data: OpenAIImageGenerationAsset[]
  expiresAt: number
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
const DEFAULT_SUBMIT_ENDPOINT = '/api/openai/images/submit'
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

const toTaskResponse = (
  payload: {
    error?: string
    taskId?: string
    status?: OpenAIImageTaskStatus
    createdAt?: number
    updatedAt?: number
    submittedAt?: number | null
    completedAt?: number | null
    requestedModel?: string
    fallbackModel?: string
    model?: string
    size?: string
    quality?: OpenAIImageQuality
    background?: OpenAIImageBackground
    outputFormat?: OpenAIImageOutputFormat
    moderation?: OpenAIImageModeration
    n?: number
    prompt?: string
    referenceImages?: string[]
    sourceLabel?: string
    clientRequestId?: string
    errorMessage?: string
    errorText?: string
    errorDetail?: string
    error_reason?: string
    errorReason?: string
    errorDescription?: string
    error_description?: string
    error_code?: string
    errorCode?: string
    errorMessageText?: string
    error_message?: string
    error_message_text?: string
    errorInfo?: string
    error_info?: string
    errorDetails?: string
    error_details?: string
    errorPayload?: string
    error_payload?: string
    errorData?: string
    error_data?: string
    errorMeta?: string
    error_meta?: string
    errorValue?: string
    error_value?: string
    errorStatus?: string
    error_status?: string
    errorType?: string
    error_type?: string
    errorSource?: string
    error_source?: string
    errorContext?: string
    error_context?: string
    errorHint?: string
    error_hint?: string
    errorSummary?: string
    error_summary?: string
    errorTitle?: string
    error_title?: string
    errorLabel?: string
    error_label?: string
    errorNote?: string
    error_note?: string
    errorMessageRaw?: string
    usedFallback?: boolean
    fallbackReason?: string
    usage?: Record<string, unknown> | null
    expiresAt?: number
    data?: Array<{
      id?: string
      base64?: string
      url?: string
      revisedPrompt?: string
      mimeType?: string
    }>
  },
  request: OpenAIImageGenerationRequest,
): OpenAIImageTaskResponse => {
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
    taskId: payload.taskId?.trim() || '',
    status: payload.status || 'queued',
    createdAt: payload.createdAt || Date.now(),
    updatedAt: payload.updatedAt || payload.createdAt || Date.now(),
    submittedAt: typeof payload.submittedAt === 'number' ? payload.submittedAt : (payload.createdAt || Date.now()),
    completedAt: typeof payload.completedAt === 'number' ? payload.completedAt : null,
    requestedModel: payload.requestedModel || request.model || 'gpt-image-2',
    fallbackModel: payload.fallbackModel || request.fallbackModel || '',
    model: payload.model || request.model || '',
    size: payload.size || request.size || 'auto',
    quality: payload.quality || request.quality || 'auto',
    background: payload.background || request.background || 'auto',
    outputFormat: payload.outputFormat || request.outputFormat || 'png',
    moderation: payload.moderation || request.moderation || 'auto',
    n: payload.n || request.n || 1,
    prompt: payload.prompt || request.prompt || '',
    referenceImages: Array.isArray(payload.referenceImages) ? payload.referenceImages.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : (request.referenceImages || []),
    sourceLabel: payload.sourceLabel || request.sourceLabel || 'OpenAI Storyboard',
    clientRequestId: payload.clientRequestId || request.clientRequestId || '',
    error: payload.error || '',
    usedFallback: payload.usedFallback || false,
    fallbackReason: payload.fallbackReason || '',
    usage: payload.usage || null,
    data,
    expiresAt: payload.expiresAt || Date.now(),
  }
}

export async function submitOpenAIImageTask(
  request: OpenAIImageGenerationRequest,
  options: GenerateOpenAIImagesOptions = {},
): Promise<OpenAIImageTaskResponse> {
  const apiBaseUrl = options.apiBaseUrl || ''
  const endpoint = options.endpoint || DEFAULT_SUBMIT_ENDPOINT
  const response = await fetch(toApiUrl(apiBaseUrl, endpoint), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error((payload as { error?: string }).error || 'OpenAI image submission failed.')
  }

  return toTaskResponse(payload as Parameters<typeof toTaskResponse>[0], request)
}

export async function fetchOpenAIImageTask(
  taskId: string,
  request: OpenAIImageGenerationRequest,
  options: GenerateOpenAIImagesOptions = {},
): Promise<OpenAIImageTaskResponse> {
  const apiBaseUrl = options.apiBaseUrl || ''
  const endpointPath = `${options.endpoint || '/api/openai/images/tasks'}/${encodeURIComponent(taskId)}`
  const response = await fetch(toApiUrl(apiBaseUrl, endpointPath))
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error((payload as { error?: string }).error || 'OpenAI image task lookup failed.')
  }

  return toTaskResponse(payload as Parameters<typeof toTaskResponse>[0], request)
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