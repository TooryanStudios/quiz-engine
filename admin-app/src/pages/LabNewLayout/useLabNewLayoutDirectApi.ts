import { useCallback, useMemo, useState } from 'react'
import { composerModelChip } from './useLabNewLayoutComposer'
import { useLabNewLayoutStore } from './useLabNewLayoutStore'
import { useGenerationRunner } from '../../hooks/useGenerationRunner'

const CHATBOT_BASE = (import.meta.env.VITE_CHATBOT_API_URL as string | undefined) || ''

export const directApiInitialJson = JSON.stringify({
  endpoint: '/api/generate-video',
  body: {
    prompt: 'Create a cinematic scene with a calm camera move and continuity-safe references.',
    ratio: '16:9',
    resolution: '480p',
    duration: '15s',
    model: composerModelChip,
  },
}, null, 2)

const directApiPreviewBody = {
  prompt: 'Create a cinematic scene with a calm camera move and continuity-safe references.',
  ratio: '16:9',
  resolution: '480p',
  duration: '15s',
  model: composerModelChip,
  references: ['character-ref', 'lighting-ref'],
}

const readDurationValue = (value: unknown, fallback: number) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value
  }
  if (typeof value === 'string' && value.trim()) {
    const numericValue = Number(value.replace(/[^\d.\-]/g, ''))
    if (Number.isFinite(numericValue)) {
      return numericValue
    }
  }
  return fallback
}

const readBooleanValue = (value: unknown, fallback: boolean) => (
  typeof value === 'boolean' ? value : fallback
)

export function useLabNewLayoutDirectApi() {
  const currentComposerPreview = useLabNewLayoutStore((state) => state.currentComposerPreview)
  const addHistoryItem = useLabNewLayoutStore((state) => state.addHistoryItem)
  const updateHistoryItem = useLabNewLayoutStore((state) => state.updateHistoryItem)

  const [isGenerating, setIsGenerating] = useState(false)
  const [generationStatus, setGenerationStatus] = useState<string>('')

  const runner = useGenerationRunner({
    apiBaseUrl: CHATBOT_BASE,
  })

  const defaultPreviewStr = useMemo(() => {
    return currentComposerPreview 
      ? JSON.stringify(currentComposerPreview, null, 2)
      : directApiInitialJson
  }, [currentComposerPreview])

  const [directRequestJson, setDirectRequestJson] = useState(defaultPreviewStr)

  const finalRequestBodyPreview = useMemo(() => {
    if (currentComposerPreview) {
      return JSON.stringify(currentComposerPreview.body ?? currentComposerPreview, null, 2)
    }

    try {
      const parsed = JSON.parse(directRequestJson)
      return JSON.stringify(parsed?.body ?? parsed, null, 2)
    } catch {
      return JSON.stringify(directApiPreviewBody, null, 2)
    }
  }, [currentComposerPreview, directRequestJson])

  const resetDirectRequestJson = () => {
    setDirectRequestJson(defaultPreviewStr)
  }

  const loadFullRequestJson = () => {
    setDirectRequestJson(
      currentComposerPreview 
        ? JSON.stringify(currentComposerPreview, null, 2)
        : defaultPreviewStr
    )
  }

  const submitDirectJson = useCallback(async () => {
    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(directRequestJson)
    } catch {
      setGenerationStatus('Invalid JSON format')
      return
    }

    setIsGenerating(true)
    setGenerationStatus('Preparing request...')

    const endpoint = typeof parsed.endpoint === 'string' ? parsed.endpoint : '/api/v1/model/generateVideo'
    const body = typeof parsed.body === 'object' && parsed.body ? parsed.body as Record<string, unknown> : parsed
    const prompt = typeof body.prompt === 'string'
      ? body.prompt
      : typeof parsed.prompt === 'string'
        ? parsed.prompt
        : '(Direct API request)'
    const model = typeof body.model === 'string'
      ? body.model
      : typeof parsed.model === 'string'
        ? parsed.model
        : 'unknown'
    const request = {
      endpoint,
      body,
      settings: {
        provider: 'atlas' as const,
        model,
        ratio: typeof body.ratio === 'string' ? body.ratio : '16:9',
        duration: readDurationValue(body.duration, 15),
        resolution: typeof body.resolution === 'string' ? body.resolution : '480p',
        generateAudio: readBooleanValue(body.generate_audio ?? body.generateAudio, false),
      }
    }
    const historyId = Date.now().toString()

    addHistoryItem({
      id: historyId,
      timestamp: Date.now(),
      prompt,
      model,
      provider: request.settings.provider,
      ratio: request.settings.ratio,
      resolution: request.settings.resolution,
      duration: request.settings.duration,
      generateAudio: request.settings.generateAudio,
      requestEndpoint: request.endpoint,
      requestPayload: request.body,
      sourceLabel: 'Direct API',
      status: 'queued',
    })

    try {
      const result = await runner.runGeneration(request, {
        onQueued: ({ taskId, submittedAt, settings }) => {
          setGenerationStatus('Queued...')
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
        onStatus: (statusText) => {
          setGenerationStatus(statusText)
        }
      })

      if (result) {
        setGenerationStatus('Completed!')
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
      }
    } catch (error) {
      console.error(error)
      const errorMessage = error instanceof Error ? error.message : 'Generation failed.'
      setGenerationStatus(errorMessage)
      updateHistoryItem(historyId, { status: 'failed', errorMessage, completedAt: Date.now() })
    } finally {
      setIsGenerating(false)
    }
  }, [addHistoryItem, directRequestJson, runner, updateHistoryItem])

  return {
    directRequestJson,
    finalRequestBodyPreview,
    resetDirectRequestJson,
    loadFullRequestJson,
    setDirectRequestJson,
    submitDirectJson,
    isGenerating,
    generationStatus,
  }
}