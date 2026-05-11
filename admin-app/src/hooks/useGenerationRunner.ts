import { useCallback, useRef } from 'react'

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

type GenerationStillProcessingTimeoutError = Error & {
  code: 'generation-still-processing-timeout'
  taskId: string
  elapsedMs: number
}

type UseGenerationRunnerOptions = {
  apiBaseUrl?: string
  healthEndpoint?: string
  onBackendAvailable?: () => void
  onBackendUnavailable?: (message?: string) => void
  onGenerateCooldownChange?: (remainingMs: number) => void
  pollIntervalMs?: number
  generateCooldownMs?: number
}

type RunGenerationOptions = {
  onQueued?: (queued: QueuedGeneration) => void | Promise<void>
  onStatus?: (statusText: string) => void
  shouldCancel?: () => boolean
}

type ResumeGenerationOptions = {
  onStatus?: (statusText: string) => void
  shouldCancel?: () => boolean
}

type ResumeGenerationInput = {
  taskId: string
  settings: GenerationRequestSettings
}

const DEFAULT_HEALTH_ENDPOINT = '/api/health'
const DEFAULT_POLL_INTERVAL_MS = 4000
const DEFAULT_MAX_POLL_DURATION_MS = 12 * 60 * 1000
const DEFAULT_HEALTH_TIMEOUT_MS = 3500
const DEFAULT_GENERATE_COOLDOWN_MS = 20000
const MAX_TRANSIENT_ERRORS = 5
const MAX_RESULTLESS_SUCCESS_POLLS = 5

const isNonRetryableProviderError = (message: string): boolean => {
  const normalized = (message || '').toLowerCase()
  if (!normalized) return false
  return normalized.includes('image format is not supported')
    || normalized.includes('insufficient balance')
    || normalized.includes('output audio may contain sensitive information')
    || normalized.includes('sensitive information')
}

const isMalformedBackendJsonError = (message: string): boolean => {
  const normalized = (message || '').toLowerCase()
  if (!normalized) return false
  return normalized.includes('unexpected end of json input')
    || normalized.includes('server returned a non-json response')
}

const malformedBackendJsonMessage =
  'Local API backend returned an invalid/empty JSON response. Restart backend on http://localhost:8787 and try again.'

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

const createStillProcessingTimeoutError = (taskId: string, elapsedMs: number): GenerationStillProcessingTimeoutError => {
  const elapsedMinutes = Math.max(1, Math.round(elapsedMs / 60000))
  const error = new Error(`Generation timed out after ${elapsedMinutes} minute(s). Provider is still processing.`) as GenerationStillProcessingTimeoutError
  error.name = 'GenerationStillProcessingTimeoutError'
  error.code = 'generation-still-processing-timeout'
  error.taskId = taskId
  error.elapsedMs = elapsedMs
  return error
}

export const isGenerationStillProcessingTimeoutError = (error: unknown): error is GenerationStillProcessingTimeoutError => (
  error instanceof Error
  && (error as Partial<GenerationStillProcessingTimeoutError>).code === 'generation-still-processing-timeout'
)

const normalizePollingFetchErrorMessage = (error: unknown): string => {
  if (error instanceof Error && error.message.trim()) {
    return error.message.trim()
  }
  return 'Failed to fetch'
}

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

const extractErrorMessage = (payload: unknown, rawBody: string, fallback: string): string => {
  const nested = isRecord(payload) && isRecord(payload.data)
    ? payload.data as Record<string, unknown>
    : null
  const nestedErrorText = nested && typeof nested.error === 'string'
    ? nested.error
    : undefined
  const nestedError = nested && isRecord(nested.error)
    ? nested.error as Record<string, unknown>
    : null
  const rootErrorText = isRecord(payload) && typeof payload.error === 'string'
    ? payload.error
    : undefined
  const rootError = isRecord(payload) && isRecord(payload.error)
    ? payload.error as Record<string, unknown>
    : null

  const baseMessage = firstNonEmptyString(
    nestedError?.message,
    nestedError?.msg,
    nestedError?.detail,
    nestedError?.reason,
    nested?.reason,
    nested?.detail,
    nested?.error,
    nested?.error_message,
    nested?.errorMessage,
    nested?.status_message,
    nested?.statusMessage,
    nested?.message,
    nested?.msg,
    nestedErrorText,
    rootError?.message,
    rootError?.msg,
    rootError?.detail,
    rootError?.reason,
    rootErrorText,
    isRecord(payload) ? payload.message : undefined,
    isRecord(payload) ? payload.msg : undefined,
    isRecord(payload) ? payload.reason : undefined,
    isRecord(payload) ? payload.detail : undefined,
    isRecord(payload) ? payload.error_message : undefined,
    isRecord(payload) ? payload.errorMessage : undefined,
    isRecord(payload) ? payload.status_message : undefined,
    isRecord(payload) ? payload.statusMessage : undefined,
    // Only use raw body if it's not HTML or very short
    (!isLikelyHtmlPayload(rawBody) && rawBody.trim().length > 10) ? rawBody.trim().slice(0, 320) : undefined,
    fallback,
  )

  const upstreamStatus = isRecord(payload) && typeof payload.upstreamStatus === 'number'
    ? payload.upstreamStatus
    : undefined
  if (upstreamStatus && !baseMessage.includes('upstream HTTP')) {
    return `${baseMessage} (upstream HTTP ${upstreamStatus})`
  }

  return baseMessage
}

const isLikelyHtmlPayload = (rawText: string): boolean => {
  const trimmed = rawText.trim()
  if (!trimmed) return false
  return /^<!doctype\s+html/i.test(trimmed) || /^<html[\s>]/i.test(trimmed)
}

const isLikelyBackendProxyFailure = (rawText: string): boolean => {
  const normalized = rawText.trim().toLowerCase()
  if (!normalized) return true
  if (isLikelyHtmlPayload(rawText)) return true
  return (
    normalized.includes('failed to proxy')
    || normalized.includes('econnrefused')
    || normalized.includes('cannot connect')
    || normalized.includes('socket hang up')
  )
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

  // Direct extraction for provider outputs arrays (e.g. Atlas Cloud: data.outputs[0].url).
  // Accept any HTTPS URL here without requiring video extension/keyword — outputs from
  // the provider are always result media, not polling status endpoints.
  if (nested) {
    const rawOutputs = nested.outputs
    if (Array.isArray(rawOutputs)) {
      for (const output of rawOutputs) {
        if (typeof output === 'string') {
          const trimmed = output.trim()
          if (/^https?:\/\//i.test(trimmed)) return trimmed
        } else if (isRecord(output)) {
          for (const key of ['url', 'video_url', 'videoUrl', 'output_url', 'download_url'] as const) {
            const raw = typeof output[key] === 'string' ? (output[key] as string).trim() : ''
            if (raw && /^https?:\/\//i.test(raw)) return raw
          }
        }
      }
    }
  }

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
  onGenerateCooldownChange,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
  generateCooldownMs = DEFAULT_GENERATE_COOLDOWN_MS,
}: UseGenerationRunnerOptions = {}) {
  const generateCooldownUntilRef = useRef(0)
  const lastBackendErrorMessageRef = useRef('')

  const getGenerateCooldownRemainingMs = useCallback(() => {
    const remaining = generateCooldownUntilRef.current - Date.now()
    return remaining > 0 ? remaining : 0
  }, [])

  const emitGenerateCooldown = useCallback((remainingMs: number) => {
    onGenerateCooldownChange?.(Math.max(0, remainingMs))
  }, [onGenerateCooldownChange])

  const clearGenerateCooldown = useCallback(() => {
    generateCooldownUntilRef.current = 0
    emitGenerateCooldown(0)
  }, [emitGenerateCooldown])

  const applyGenerateCooldown = useCallback((baseMessage: string): string => {
    const cooldownMs = Math.max(0, generateCooldownMs)
    if (!cooldownMs) {
      emitGenerateCooldown(0)
      return baseMessage
    }

    generateCooldownUntilRef.current = Date.now() + cooldownMs
    emitGenerateCooldown(cooldownMs)
    const retrySeconds = Math.ceil(cooldownMs / 1000)
    return `${baseMessage} Retry in ${retrySeconds}s.`
  }, [emitGenerateCooldown, generateCooldownMs])

  const markBackendAvailable = useCallback(() => {
    lastBackendErrorMessageRef.current = ''
    onBackendAvailable?.()
  }, [onBackendAvailable])

  const markBackendUnavailable = useCallback((message?: string) => {
    const normalizedMessage = (message || 'Back end server is not working. Start it before generating.').trim()
    lastBackendErrorMessageRef.current = normalizedMessage
    onBackendUnavailable?.(normalizedMessage)
  }, [onBackendUnavailable])

  const checkBackendHealth = useCallback(async (): Promise<boolean> => {
    const controller = new AbortController()
    const timeout = window.setTimeout(() => {
      controller.abort()
    }, DEFAULT_HEALTH_TIMEOUT_MS)

    try {
      const response = await fetch(toApiUrl(apiBaseUrl, healthEndpoint), { signal: controller.signal })
      if (response.ok) {
        clearGenerateCooldown()
        markBackendAvailable()
        window.clearTimeout(timeout)
        return true
      }
      markBackendUnavailable(applyGenerateCooldown(`Back end server check failed (${response.status}). Please run it.`))
      window.clearTimeout(timeout)
      return false
    } catch {
      markBackendUnavailable(applyGenerateCooldown('Back end server is not working. Please run it.'))
      window.clearTimeout(timeout)
      return false
    }
  }, [apiBaseUrl, applyGenerateCooldown, clearGenerateCooldown, healthEndpoint, markBackendAvailable, markBackendUnavailable])

  const checkGenerationReadiness = useCallback(async (endpoint: string): Promise<boolean> => {
    const cooldownRemaining = getGenerateCooldownRemainingMs()
    if (cooldownRemaining > 0) {
      emitGenerateCooldown(cooldownRemaining)
      markBackendUnavailable(`Generation is cooling down after a recent backend failure. Retry in ${Math.ceil(cooldownRemaining / 1000)}s.`)
      return false
    }

    const backendReady = await checkBackendHealth()
    if (!backendReady) {
      return false
    }

    const normalizedEndpoint = endpoint.trim().toLowerCase()
    if (!normalizedEndpoint.startsWith('/api/seedance/')) {
      return true
    }

    const controller = new AbortController()
    const timeout = window.setTimeout(() => {
      controller.abort()
    }, DEFAULT_HEALTH_TIMEOUT_MS)

    try {
      const probeResponse = await fetch(toApiUrl(apiBaseUrl, '/api/seedance/readiness'), {
        signal: controller.signal,
      })
      const probeRawBody = await probeResponse.text()
      const probePayload = parseJsonSafely(probeRawBody)

      if (!probeResponse.ok) {
        const message = extractErrorMessage(
          probePayload,
          probeRawBody,
          'Seedance backend route is unavailable. Start/recover backend on http://localhost:8787 and try again.',
        )
        markBackendUnavailable(applyGenerateCooldown(message))
        window.clearTimeout(timeout)
        return false
      }

      clearGenerateCooldown()
      markBackendAvailable()
      window.clearTimeout(timeout)
      return true
    } catch {
      markBackendUnavailable(applyGenerateCooldown('Cannot reach Seedance backend route. Start backend on http://localhost:8787 and try again.'))
      window.clearTimeout(timeout)
      return false
    }
  }, [apiBaseUrl, applyGenerateCooldown, checkBackendHealth, clearGenerateCooldown, emitGenerateCooldown, getGenerateCooldownRemainingMs, markBackendAvailable, markBackendUnavailable])

  const pollUntilDone = useCallback(async (
    requestProvider: GenerationProvider,
    requestModel: string,
    taskId: string,
    onStatus: (statusText: string) => void,
    shouldCancel: () => boolean,
  ): Promise<string | null> => {
    let transientErrors = 0
    let successWithoutResultCount = 0
    const startTime = Date.now()
    const maxPollDurationMs = Number(import.meta.env.VITE_GENERATION_MAX_POLL_MS) || DEFAULT_MAX_POLL_DURATION_MS

    while (true) {
      await sleep(pollIntervalMs)

      if (shouldCancel()) {
        return null
      }

      const elapsedMs = Date.now() - startTime
      if (elapsedMs > maxPollDurationMs) {
        throw createStillProcessingTimeoutError(taskId, elapsedMs)
      }

      const statusUrl = requestProvider === 'atlas'
        ? `${toApiUrl(apiBaseUrl, '/api/seedance/status')}?task_id=${encodeURIComponent(taskId)}&model=${encodeURIComponent(requestModel)}&provider=atlas`
        : requestProvider === 'grok'
          ? `${toApiUrl(apiBaseUrl, '/api/seedance/status')}?task_id=${encodeURIComponent(taskId)}&model=${encodeURIComponent(requestModel)}&provider=grok`
          : `${toApiUrl(apiBaseUrl, '/api/byteplus/status')}?task_id=${encodeURIComponent(taskId)}`

      let response: Response
      try {
        response = await fetch(statusUrl)
      } catch (error) {
        markBackendUnavailable()
        transientErrors += 1
        const errorMessage = normalizePollingFetchErrorMessage(error)
        onStatus(`Status check connection error. Retry ${transientErrors}/5...`)
        if (transientErrors >= MAX_TRANSIENT_ERRORS) {
          throw new Error(errorMessage)
        }
        continue
      }

      const rawBody = await response.text()
      const payload = parseJsonSafely(rawBody)

      if (!response.ok) {
        const errorMessage = extractErrorMessage(payload, rawBody, `HTTP ${response.status}`)

        if (response.status >= 500 || response.status === 429) {
          if (isNonRetryableProviderError(errorMessage)) {
            throw new Error(errorMessage)
          }
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
        const upstreamError = extractErrorMessage(payload, rawBody, '')
        throw new Error(
          upstreamError
          || `Generation failed with status: ${status}. Please check the provider API logs for more details.`,
        )
      }

      if (status.includes('processing') || status.includes('pending') || status.includes('running') || status.includes('queue')) {
        const elapsedSeconds = Math.floor(elapsedMs / 1000)
        onStatus(`Still processing... ${elapsedSeconds}s`)
      }
    }
  }, [apiBaseUrl, markBackendUnavailable, pollIntervalMs])

  const runGeneration = useCallback(async (
    request: GenerationRequest,
    options: RunGenerationOptions = {},
  ): Promise<CompletedGeneration | null> => {
    const backendReady = await checkGenerationReadiness(request.endpoint)
    if (!backendReady) {
      throw new Error(lastBackendErrorMessageRef.current || 'Back end server is not working. Start it before generating.')
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
      const looksLikeBackendProxyFailure = response.status >= 500 && isLikelyBackendProxyFailure(rawBody)
      const errorMessage = extractErrorMessage(payload, rawBody, `HTTP ${response.status}`)

      if (isMalformedBackendJsonError(errorMessage)) {
        const cooldownMessage = applyGenerateCooldown(malformedBackendJsonMessage)
        markBackendUnavailable(cooldownMessage)
        throw new Error(cooldownMessage)
      }

      if (response.status >= 500) {
        const backendDownMessage = looksLikeBackendProxyFailure
          ? 'Cannot reach local API backend (expected on http://localhost:8787). Start it and try again.'
          : undefined
        const cooldownMessage = applyGenerateCooldown(backendDownMessage || 'Back end server is not working. Start it before generating.')
        markBackendUnavailable(cooldownMessage)
        throw new Error(
          (errorMessage && !/^HTTP 5\d\d$/i.test(errorMessage) && !looksLikeBackendProxyFailure)
            ? applyGenerateCooldown(errorMessage)
            : cooldownMessage,
        )
      }

      throw new Error(errorMessage)
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
  }, [apiBaseUrl, applyGenerateCooldown, checkGenerationReadiness, markBackendUnavailable, pollUntilDone])

  const resumeGenerationTask = async (
    input: ResumeGenerationInput,
    options: ResumeGenerationOptions = {},
  ): Promise<CompletedGeneration | null> => {
    const resumedResultUrl = await pollUntilDone(
      input.settings.provider,
      input.settings.model,
      input.taskId,
      options.onStatus || (() => {}),
      options.shouldCancel || (() => false),
    )

    if (!resumedResultUrl) {
      return null
    }

    return {
      taskId: input.taskId,
      resultUrl: resumedResultUrl,
      submittedAt: Date.now(),
      receivedAt: Date.now(),
      settings: input.settings,
    }
  }

  return {
    checkBackendHealth,
    checkGenerationReadiness,
    getGenerateCooldownRemainingMs,
    runGeneration,
    resumeGenerationTask,
  }
}