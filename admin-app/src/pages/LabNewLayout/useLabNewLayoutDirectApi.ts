import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { resolveGenerationRequestSettings, useGenerationRunner, type GenerationProvider } from '../../hooks/useGenerationRunner'
import { firebaseConfig } from '../../lib/firebase'
import { playGenerationFailureSound, playGenerationSuccessSound } from './generationSounds'
import { useLabNewLayoutData } from './useLabNewLayoutWorkspace'
import { useLabNewLayoutStore } from './useLabNewLayoutStore'

const DEFAULT_COMPOSER_MODEL_ID = 'bytedance/seedance-2.0-fast'

const CHATBOT_BASE = (import.meta.env.VITE_CHATBOT_API_URL as string | undefined) || ''
const MASTER_EMAIL = import.meta.env.VITE_MASTER_EMAIL as string | undefined

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

export const directApiInitialJson = JSON.stringify({
  endpoint: '/api/seedance/generate',
  body: {
    prompt: 'Create a cinematic scene with a calm camera move and continuity-safe references.',
    ratio: '16:9',
    resolution: '480p',
    duration: 15,
    model: DEFAULT_COMPOSER_MODEL_ID,
    generate_audio: true,
  },
}, null, 2)

const directApiPreviewBody = {
  prompt: 'Create a cinematic scene with a calm camera move and continuity-safe references.',
  ratio: '16:9',
  resolution: '480p',
  duration: 15,
  model: DEFAULT_COMPOSER_MODEL_ID,
  generate_audio: true,
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

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
)

const readProviderValue = (value: unknown): GenerationProvider | null => {
  if (value === 'atlas' || value === 'grok' || value === 'byteplus') {
    return value
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

let lastDirectApiArchiveFailureSignature: string | null = null

function createClientUniqueId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function useLabNewLayoutDirectApi() {
  const { authEmail, studioProjectId, studioActiveFolderId } = useLabNewLayoutData()
  const currentComposerPreview = useLabNewLayoutStore((state) => state.currentComposerPreview)
  const requestComposerPreviewRefresh = useLabNewLayoutStore((state) => state.requestComposerPreviewRefresh)
  const addHistoryItem = useLabNewLayoutStore((state) => state.addHistoryItem)
  const updateHistoryItem = useLabNewLayoutStore((state) => state.updateHistoryItem)
  const history = useLabNewLayoutStore((state) => state.history)
  const resumedHistoryIdsRef = useRef<Set<string>>(new Set())

  const [generationStatus, setGenerationStatus] = useState<string>('')
  const normalizedMasterEmail = (MASTER_EMAIL || '').trim().toLowerCase()
  const normalizedAuthEmail = authEmail.trim().toLowerCase()
  const isMasterAdminUser = normalizedMasterEmail.length > 0 && normalizedAuthEmail === normalizedMasterEmail

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

      lastDirectApiArchiveFailureSignature = null

      return payload?.saved?.firebaseUrl || null
    } catch (error) {
      const failureNotice = resolveArchiveFailureNotice(error)
      if (lastDirectApiArchiveFailureSignature !== failureNotice.signature) {
        lastDirectApiArchiveFailureSignature = failureNotice.signature
        setGenerationStatus(failureNotice.message)
        console.warn('Lab direct API archive to Firebase failed:', error)
      }
      return null
    }
  }, [])

  const defaultPreviewStr = useMemo(() => {
    return currentComposerPreview 
      ? JSON.stringify(currentComposerPreview, null, 2)
      : directApiInitialJson
  }, [currentComposerPreview])

  const [directRequestJson, setDirectRequestJson] = useState(defaultPreviewStr)

  useEffect(() => {
    const inFlightDirectApiEntries = history.filter((entry) => (
      entry.sourceLabel === 'Direct API'
      && (entry.status === 'queued' || entry.status === 'running')
      && typeof entry.taskId === 'string'
      && entry.taskId.trim().length > 0
    ))

    if (!inFlightDirectApiEntries.length) {
      return
    }

    let isCancelled = false

    inFlightDirectApiEntries.forEach((entry) => {
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
              model: entry.model || DEFAULT_COMPOSER_MODEL_ID,
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
              `direct-api-recovery-${entry.id}-${Date.now()}`,
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
  }, [archiveVideoToFirebase, history, runner, studioActiveFolderId, studioProjectId, updateHistoryItem])

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

  const reloadComposerPreview = useCallback(() => {
    requestComposerPreviewRefresh()
  }, [requestComposerPreviewRefresh])

  const submitDirectJson = useCallback(() => {
    if (!isMasterAdminUser) {
      setGenerationStatus('Only the master admin can generate.')
      return
    }

    const activeProjectId = (studioProjectId || '').trim()
    const activeFolderId = (studioActiveFolderId || '').trim()
    if (!activeProjectId || !activeFolderId) {
      setGenerationStatus('Select or create an active project and folder in Explorer before generating.')
      return
    }

    let parsed: Record<string, unknown>
    try {
      parsed = JSON.parse(directRequestJson)
    } catch {
      setGenerationStatus('Invalid JSON format')
      return
    }

    setGenerationStatus('')

    const endpoint = typeof parsed.endpoint === 'string' ? parsed.endpoint : '/api/v1/model/generateVideo'
    const body = typeof parsed.body === 'object' && parsed.body ? parsed.body as Record<string, unknown> : parsed
    const prompt = typeof body.prompt === 'string'
      ? body.prompt
      : typeof parsed.prompt === 'string'
        ? parsed.prompt
        : '(Direct API request)'
    const parsedSettings = isRecord(parsed.settings) ? parsed.settings : null
    const model = typeof body.model === 'string'
      ? body.model
      : typeof parsed.model === 'string'
        ? parsed.model
        : typeof parsedSettings?.model === 'string'
          ? parsedSettings.model
        : 'unknown'
    const requestSettings = resolveGenerationRequestSettings(endpoint, body, {
      provider: readProviderValue(parsedSettings?.provider ?? parsed.provider) || 'atlas',
      model,
      ratio: typeof body.ratio === 'string'
        ? body.ratio
        : typeof body.aspect_ratio === 'string'
          ? body.aspect_ratio
          : typeof parsedSettings?.ratio === 'string'
            ? parsedSettings.ratio
            : '16:9',
      duration: readDurationValue(body.duration ?? parsedSettings?.duration, 15),
      resolution: typeof body.resolution === 'string'
        ? body.resolution
        : typeof parsedSettings?.resolution === 'string'
          ? parsedSettings.resolution
          : '480p',
      generateAudio: readBooleanValue(
        body.generate_audio ?? body.generateAudio ?? parsedSettings?.generateAudio,
        true,
      ),
    })
    const request = {
      endpoint,
      body,
      settings: requestSettings,
    }
    const historyId = createClientUniqueId('direct-api-history')

    addHistoryItem({
      id: historyId,
      timestamp: Date.now(),
      prompt,
      model: request.settings.model,
      provider: request.settings.provider,
      ratio: request.settings.ratio,
      resolution: request.settings.resolution,
      duration: request.settings.duration,
      generateAudio: request.settings.generateAudio,
      requestEndpoint: request.endpoint,
      requestPayload: request.body,
      sourceLabel: 'Direct API',
      status: 'queued',
      projectId: activeProjectId,
      folderId: activeFolderId,
    })

    void (async () => {
      try {
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

          const archiveProjectId = activeProjectId
          const archiveFolderId = activeFolderId || null
          void (async () => {
            const archivedUrl = await archiveVideoToFirebase(
              result.resultUrl,
              `direct-api-${historyId}-${Date.now()}`,
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
        setGenerationStatus(errorMessage)
        playGenerationFailureSound()
        updateHistoryItem(historyId, { status: 'failed', errorMessage, completedAt: Date.now() })
      }
    })()
  }, [addHistoryItem, archiveVideoToFirebase, directRequestJson, isMasterAdminUser, runner, studioActiveFolderId, studioProjectId, updateHistoryItem])

  return {
    directRequestJson,
    finalRequestBodyPreview,
    resetDirectRequestJson,
    reloadComposerPreview,
    loadFullRequestJson,
    setDirectRequestJson,
    submitDirectJson,
    generationStatus,
    isMasterAdminUser,
  }
}