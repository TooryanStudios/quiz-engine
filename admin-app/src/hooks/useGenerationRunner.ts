import { useCallback } from 'react'

export type GenerationProvider = 'byteplus' | 'atlas' | 'grok'

export type GenerationRequestSettings = {
  provider: GenerationProvider
  model: string
  ratio: string
  duration: number
  resolution: string
  generateAudio: boolean
}

export type GenerationRequest = {
  endpoint: string
  body: Record<string, unknown>
  settings: GenerationRequestSettings
}

export type QueuedGeneration = {
  taskId: string
  submittedAt: number
  settings: GenerationRequestSettings
}

export type CompletedGeneration = {
  taskId: string
  resultUrl: string
  submittedAt: number
  receivedAt: number
  settings: GenerationRequestSettings
}

type UseGenerationRunnerOptions = {
  apiBaseUrl?: string
  healthEndpoint?: string
  onBackendAvailable?: () => void
  onBackendUnavailable?: (message?: string) => void
  pollIntervalMs?: number
}

type RunGenerationOptions = {
  onQueued?: (queued: QueuedGeneration) => void | Promise<void>
  onStatus?: (statusText: string) => void
  shouldCancel?: () => boolean
}

const DEFAULT_HEALTH_ENDPOINT = '/api/health'
const DEFAULT_POLL_INTERVAL_MS = 4000
const MAX_TRANSIENT_ERRORS = 5
const MAX_RESULTLESS_SUCCESS_POLLS = 5

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
)

const firstNonEmptyString = (...values: unknown[]): string => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }
  return ''
}

const toApiUrl = (apiBaseUrl: string, path: string) => `${apiBaseUrl.replace(/\/$/, '')}${path}`

const sleep = (ms: number) => new Promise<void>((resolve) => {
  window.setTimeout(resolve, ms)
})

const extractUrlLike = (value: unknown): string => {
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }
  if (!isRecord(value)) {
    return ''
  }
  return firstNonEmptyString(
    value.url,
    extractUrlLike(value.video),
    extractUrlLike(value.video_url),
    extractUrlLike(value.output),
    extractUrlLike(value.output_url),
  )
}

const isLikelyPollingUrl = (url: string): boolean => {
  const lower = url.trim().toLowerCase()
  if (!lower) return false
  if (/(^|\/)prediction(\/|\?|#|$)/.test(lower)) return true
  if (/(^|\/)status(\/|\?|#|$)/.test(lower)) return true
  if (lower.includes('task_id=') || lower.includes('taskid=')) return true
  return false
}

const isLikelyImageUrl = (url: string): boolean => {
  const trimmed = url.trim().toLowerCase()
  if (!trimmed) return false
  return /\.(jpg|jpeg|png|webp|gif|avif|svg)(\?|#|$)/.test(trimmed)
}

const isLikelyVideoUrl = (url: string): boolean => {
  const trimmed = url.trim()
  if (!trimmed) return false

  const lower = trimmed.toLowerCase()
  if (isLikelyPollingUrl(lower)) return false
  if (/\.(jpg|jpeg|png|webp|gif|avif|svg)(\?|#|$)/.test(lower)) return false
  if (/\.(mp4|webm|mov|m4v|mkv|avi|m3u8)(\?|#|$)/.test(lower)) return true
  return lower.includes('video') || lower.includes('mime=video') || lower.includes('content-type=video')
}

const pickFirstLikelyVideoUrl = (...candidates: unknown[]): string => {
  for (const candidate of candidates) {
    const url = extractUrlLike(candidate)
    if (url && isLikelyVideoUrl(url)) {
      return url
    }
  }
  return ''
}

const extractFirstHttpMediaUrl = (input: unknown, visited = new Set<object>()): string => {
  if (typeof input === 'string') {
    const trimmed = input.trim()
    if (!/^https?:\/\//i.test(trimmed)) return ''
    if (isLikelyImageUrl(trimmed) || isLikelyPollingUrl(trimmed)) return ''
    return isLikelyVideoUrl(trimmed) ? trimmed : ''
  }

  if (Array.isArray(input)) {
    for (const item of input) {
      const nested = extractFirstHttpMediaUrl(item, visited)
      if (nested) return nested
    }
    return ''
  }

  if (!isRecord(input)) return ''
  if (visited.has(input)) return ''
  visited.add(input)

  const preferredKeys = [
    'video_url',
    'videoUrl',
    'video',
    'output_url',
    'outputUrl',
    'output',
    'result_url',
    'resultUrl',
    'result',
    'media_url',
    'mediaUrl',
    'download_url',
    'downloadUrl',
    'file_url',
    'fileUrl',
    'url',
  ] as const

  for (const key of preferredKeys) {
    const candidate = extractFirstHttpMediaUrl(input[key], visited)
    if (candidate) return candidate
  }

  for (const value of Object.values(input)) {
    const candidate = extractFirstHttpMediaUrl(value, visited)
    if (candidate) return candidate
  }

  return ''
}

const pickFirstHttpMediaUrl = (...candidates: unknown[]): string => {
  for (const candidate of candidates) {
    const url = extractFirstHttpMediaUrl(candidate)
    if (url) return url
  }
  return ''
}

const parseJsonSafely = (rawText: string): unknown => {
  if (!rawText.trim()) {
    return {}
  }
  try {
    return JSON.parse(rawText)
  } catch {
    return { message: rawText.trim() }
  }
}

const extractTaskId = (payload: unknown): string => {
  if (!isRecord(payload)) {
    return ''
  }
  const nested = isRecord(payload.data) ? payload.data : null
  return firstNonEmptyString(payload.task_id, payload.id, nested?.task_id, nested?.id)
}

const normalizeProviderHint = (value: unknown): GenerationProvider | '' => {
  if (typeof value !== 'string') return ''
  const normalized = value.trim().toLowerCase()
  if (normalized === 'atlas') return 'atlas'
  if (normalized === 'grok') return 'grok'
  if (normalized === 'byteplus') return 'byteplus'
  return ''
}

const inferProviderForRequest = (
  endpoint: string,
  requestBody: Record<string, unknown>,
  fallback: GenerationProvider,
): GenerationProvider => {
  const explicitProvider = normalizeProviderHint(
    requestBody.providerHint ?? requestBody.provider ?? requestBody.provider_hint,
  )
  if (explicitProvider) {
    return explicitProvider
  }

  const model = typeof requestBody.model === 'string' ? requestBody.model.trim().toLowerCase() : ''
  if (model.includes('grok')) {
    return 'grok'
  }

  if (endpoint.includes('/seedance')) return 'atlas'
  if (endpoint.includes('/byteplus')) return 'byteplus'
  return fallback
}

const extractStatusValue = (payload: unknown): string => {
  if (!isRecord(payload)) {
    return ''
  }
  const nested = isRecord(payload.data) ? payload.data : null
  return firstNonEmptyString(nested?.status, payload.status).toLowerCase()
}

const extractResultUrl = (payload: unknown): string => {
  if (!isRecord(payload)) {
    return ''
  }

  const nested = isRecord(payload.data) ? payload.data : null
  const contentSources = [payload.content, nested?.content]

  for (const source of contentSources) {
    if (!Array.isArray(source)) {
      continue
    }
    for (const item of source) {
      if (!isRecord(item)) {
        continue
      }
      if (item.type === 'video_url') {
        const contentVideoUrl = pickFirstLikelyVideoUrl(item.video_url, item.url, item)
        if (contentVideoUrl) {
          return contentVideoUrl
        }
      }
      const fallbackUrl = pickFirstLikelyVideoUrl(item.video_url, item.output, item.output_url, item.url, item)
      if (fallbackUrl) {
        return fallbackUrl
      }
    }
  }

  const nestedOutputs = Array.isArray(nested?.outputs) ? nested.outputs : []
  const rootOutputs = Array.isArray(payload.outputs) ? payload.outputs : []

  for (const output of [...nestedOutputs, ...rootOutputs]) {
    const outputUrl = pickFirstLikelyVideoUrl(output)
    if (outputUrl) {
      return outputUrl
    }
  }

  return pickFirstLikelyVideoUrl(
    nested?.video,
    nested?.video_url,
    payload.video,
    payload.video_url,
    nested?.output,
    nested?.output_url,
    payload.output,
    payload.output_url,
    nested?.url,
    payload.url,
  ) || pickFirstHttpMediaUrl(
    nested?.prediction,
    nested?.result,
    nested?.output,
    nested,
    payload,
  )
}

const isSuccessStatus = (status: string) => (
  ['success', 'succeeded', 'complete', 'completed', 'done'].some((token) => status.includes(token))
)

const isFailureStatus = (status: string) => (
  ['fail', 'failed', 'error', 'cancel'].some((token) => status.includes(token))
)

export const resolveGenerationRequestSettings = (
  endpoint: string,
  body: Record<string, unknown>,
  settings: GenerationRequestSettings,
): GenerationRequestSettings => {
  const provider = inferProviderForRequest(endpoint, body, settings.provider)
  const model = typeof body.model === 'string' && body.model.trim()
    ? body.model.trim()
    : settings.model
  return {
    ...settings,
    provider,
    model,
  }
}

export function useGenerationRunner({
  apiBaseUrl = '',
  healthEndpoint = DEFAULT_HEALTH_ENDPOINT,
  onBackendAvailable,
  onBackendUnavailable,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
}: UseGenerationRunnerOptions = {}) {
  const markBackendAvailable = useCallback(() => {
    onBackendAvailable?.()
  }, [onBackendAvailable])

  const markBackendUnavailable = useCallback((message?: string) => {
    onBackendUnavailable?.(message)
  }, [onBackendUnavailable])

  const checkBackendHealth = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch(toApiUrl(apiBaseUrl, healthEndpoint))
      if (response.ok) {
        markBackendAvailable()
        return true
      }
      markBackendUnavailable(`Back end server check failed (${response.status}). Please run it.`)
      return false
    } catch {
      markBackendUnavailable('Back end server is not working. Please run it.')
      return false
    }
  }, [apiBaseUrl, healthEndpoint, markBackendAvailable, markBackendUnavailable])

  const pollUntilDone = useCallback(async (
    requestProvider: GenerationProvider,
    requestModel: string,
    taskId: string,
    onStatus: (statusText: string) => void,
    shouldCancel: () => boolean,
  ): Promise<string | null> => {
    let transientErrors = 0
    let successWithoutResultCount = 0

    while (true) {
      await sleep(pollIntervalMs)

      if (shouldCancel()) {
        return null
      }

      const statusUrl = requestProvider === 'atlas'
        ? `${toApiUrl(apiBaseUrl, '/api/seedance/status')}?task_id=${encodeURIComponent(taskId)}&model=${encodeURIComponent(requestModel)}&provider=atlas`
        : requestProvider === 'grok'
          ? `${toApiUrl(apiBaseUrl, '/api/seedance/status')}?task_id=${encodeURIComponent(taskId)}&model=${encodeURIComponent(requestModel)}&provider=grok`
          : `${toApiUrl(apiBaseUrl, '/api/byteplus/status')}?task_id=${encodeURIComponent(taskId)}`

      const response = await fetch(statusUrl)
      const rawBody = await response.text()
      const payload = parseJsonSafely(rawBody)

      if (!response.ok) {
        const errorMessage = firstNonEmptyString(
          isRecord(payload) ? payload.error : undefined,
          isRecord(payload) ? payload.message : undefined,
          isRecord(payload) ? payload.msg : undefined,
          rawBody.trim().slice(0, 200),
          `HTTP ${response.status}`,
        )

        if (response.status >= 500 || response.status === 429) {
          if (response.status >= 500) {
            markBackendUnavailable()
          }
          transientErrors += 1
          onStatus(`Status check error (${response.status}). Retry ${transientErrors}/5...`)
          if (transientErrors >= MAX_TRANSIENT_ERRORS) {
            throw new Error(errorMessage)
          }
          continue
        }

        throw new Error(errorMessage)
      }

      transientErrors = 0

      const status = extractStatusValue(payload)

      if (isSuccessStatus(status)) {
        const resultUrl = extractResultUrl(payload)
        if (!resultUrl) {
          successWithoutResultCount += 1
          if (successWithoutResultCount <= MAX_RESULTLESS_SUCCESS_POLLS) {
            onStatus(`Finalizing output... (${successWithoutResultCount}/5)`)
            continue
          }
          throw new Error('Generation completed but no playable video URL was returned.')
        }
        onStatus('Completed.')
        return resultUrl
      }

      successWithoutResultCount = 0

      if (isFailureStatus(status)) {
        const upstreamError = isRecord(payload) && isRecord(payload.data) && typeof (payload.data as Record<string, unknown>).error === 'string'
          ? (payload.data as Record<string, unknown>).error as string
          : ''
        throw new Error(
          upstreamError
          || firstNonEmptyString(
            isRecord(payload) ? payload.error : undefined,
            isRecord(payload) ? payload.message : undefined,
            isRecord(payload) ? payload.msg : undefined,
            'Generation failed on the provider side.',
          ),
        )
      }
    }
  }, [apiBaseUrl, markBackendUnavailable, pollIntervalMs])

  const runGeneration = useCallback(async (
    request: GenerationRequest,
    options: RunGenerationOptions = {},
  ): Promise<CompletedGeneration | null> => {
    const backendReady = await checkBackendHealth()
    if (!backendReady) {
      throw new Error('Back end server is not running. Start it before generating.')
    }

    const effectiveSettings = resolveGenerationRequestSettings(request.endpoint, request.body, request.settings)
    const submittedAt = Date.now()
    const response = await fetch(toApiUrl(apiBaseUrl, request.endpoint), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request.body),
    })

    const rawBody = await response.text()
    const payload = parseJsonSafely(rawBody)

    if (!response.ok) {
      if (response.status >= 500) {
        markBackendUnavailable()
      }
      throw new Error(
        firstNonEmptyString(
          isRecord(payload) ? payload.error : undefined,
          isRecord(payload) ? payload.message : undefined,
          isRecord(payload) ? payload.msg : undefined,
          rawBody.trim().slice(0, 240),
          `HTTP ${response.status}`,
        ),
      )
    }

    const taskId = extractTaskId(payload)
    const directResultUrl = extractResultUrl(payload)

    if (taskId) {
      await options.onQueued?.({
        taskId,
        submittedAt,
        settings: effectiveSettings,
      })
    }

    const finalResultUrl = directResultUrl || (taskId
      ? await pollUntilDone(
        effectiveSettings.provider,
        effectiveSettings.model,
        taskId,
        options.onStatus || (() => {}),
        options.shouldCancel || (() => false),
      )
      : '')

    if (finalResultUrl === null) {
      return null
    }

    if (!finalResultUrl) {
      throw new Error(taskId ? 'Task finished without a result URL.' : 'No task ID or result URL was returned by the API.')
    }

    return {
      taskId,
      resultUrl: finalResultUrl,
      submittedAt,
      receivedAt: Date.now(),
      settings: effectiveSettings,
    }
  }, [apiBaseUrl, checkBackendHealth, markBackendUnavailable, pollUntilDone])

  return {
    checkBackendHealth,
    runGeneration,
  }
}