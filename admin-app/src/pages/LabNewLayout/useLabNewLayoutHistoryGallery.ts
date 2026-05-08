import { useCallback, useEffect, useMemo, useState } from 'react'
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useLabNewLayoutStore, type GenerationHistoryItem } from './useLabNewLayoutStore'

export type LabNewLayoutGalleryHistoryEntry = {
  id: string
  source: 'new-layout' | 'prompt-lab' | 'legacy-toorgen'
  sourceLabel: string
  timestamp: number
  prompt: string
  model: string
  provider: string
  status: 'queued' | 'running' | 'success' | 'failed'
  resultUrl: string
  posterUrl: string
  errorMessage: string
  taskId: string
  ratio: string
  resolution: string
  duration: number | null
  generateAudio: boolean | null
  requestEndpoint: string
  requestPayload: Record<string, unknown> | null
  mediaUrls: Record<string, string>
  outputDimensions: string
  projectId: string
  folderId: string
}

const PROMPT_LAB_LOCAL_HISTORY_KEY = 'toorgen-prompt-lab-history-v3'
const PROMPT_LAB_FIRESTORE_COLLECTION = 'toorgen_prompt_lab_generations'
const LEGACY_TOORGEN_HISTORY_KEY = 'toorgen_history'
const MAX_REMOTE_HISTORY_ITEMS = 80

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

const readNumber = (...values: unknown[]): number | null => {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value
    }
    if (typeof value === 'string' && value.trim()) {
      const numericValue = Number(value.replace(/[^\d.\-]/g, ''))
      if (Number.isFinite(numericValue)) {
        return numericValue
      }
    }
  }
  return null
}

const readBoolean = (...values: unknown[]): boolean | null => {
  for (const value of values) {
    if (typeof value === 'boolean') {
      return value
    }
  }
  return null
}

const normalizeStatus = (value: unknown, fallback: LabNewLayoutGalleryHistoryEntry['status']): LabNewLayoutGalleryHistoryEntry['status'] => {
  if (typeof value !== 'string') {
    return fallback
  }
  const normalized = value.trim().toLowerCase()
  if (normalized === 'queued') return 'queued'
  if (normalized === 'running') return 'running'
  if (normalized === 'success' || normalized === 'completed' || normalized === 'done' || normalized === 'succeeded') return 'success'
  if (normalized === 'failed' || normalized === 'error' || normalized === 'cancelled' || normalized === 'canceled') return 'failed'
  return fallback
}

const readMediaRecord = (value: unknown): Record<string, string> => {
  if (!isRecord(value)) {
    return {}
  }
  return Object.entries(value).reduce<Record<string, string>>((result, [key, entryValue]) => {
    if (typeof entryValue === 'string' && entryValue.trim()) {
      result[key] = entryValue.trim()
    }
    return result
  }, {})
}

const readStringArray = (value: unknown): string[] => (
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string' && entry.trim().length > 0).map((entry) => entry.trim())
    : []
)

const mergeArrayMedia = (target: Record<string, string>, prefix: string, values: string[]) => {
  values.forEach((value, index) => {
    target[`${prefix}-${index + 1}`] = value
  })
}

const readRequestPayload = (value: unknown): Record<string, unknown> | null => (
  isRecord(value) ? value : null
)

const readMediaUrlsFromPayload = (payload: Record<string, unknown> | null): Record<string, string> => {
  if (!payload) {
    return {}
  }

  const mediaUrls = readMediaRecord(payload.mediaUrls)
  if (Object.keys(mediaUrls).length > 0) {
    return mediaUrls
  }

  const next: Record<string, string> = {}
  mergeArrayMedia(next, 'image', readStringArray(payload.reference_images ?? payload.referenceImages ?? payload.images))
  mergeArrayMedia(next, 'video', readStringArray(payload.reference_videos ?? payload.referenceVideos ?? payload.videos))
  mergeArrayMedia(next, 'audio', readStringArray(payload.reference_audios ?? payload.referenceAudios ?? payload.audios))
  mergeArrayMedia(next, 'reference', readStringArray(payload.references))
  return next
}

const mergeMediaUrls = (...records: Array<Record<string, string>>): Record<string, string> => {
  const next: Record<string, string> = {}
  records.forEach((record) => {
    Object.entries(record).forEach(([key, value]) => {
      if (value) {
        next[key] = value
      }
    })
  })
  return next
}

const mergeHistoryEntries = (
  existing: LabNewLayoutGalleryHistoryEntry,
  incoming: LabNewLayoutGalleryHistoryEntry,
): LabNewLayoutGalleryHistoryEntry => ({
  ...existing,
  ...incoming,
  source: incoming.source || existing.source,
  sourceLabel: incoming.sourceLabel || existing.sourceLabel,
  timestamp: Math.max(existing.timestamp, incoming.timestamp),
  prompt: incoming.prompt || existing.prompt,
  model: incoming.model || existing.model,
  provider: incoming.provider || existing.provider,
  status: incoming.status === 'success'
    ? 'success'
    : incoming.status === 'failed' && existing.status !== 'success'
      ? 'failed'
      : incoming.status === 'running' && existing.status === 'queued'
        ? 'running'
        : existing.status,
  resultUrl: incoming.resultUrl || existing.resultUrl,
  posterUrl: incoming.posterUrl || existing.posterUrl,
  errorMessage: incoming.errorMessage || existing.errorMessage,
  taskId: incoming.taskId || existing.taskId,
  ratio: incoming.ratio || existing.ratio,
  resolution: incoming.resolution || existing.resolution,
  duration: incoming.duration ?? existing.duration,
  generateAudio: incoming.generateAudio ?? existing.generateAudio,
  requestEndpoint: incoming.requestEndpoint || existing.requestEndpoint,
  requestPayload: incoming.requestPayload || existing.requestPayload,
  mediaUrls: mergeMediaUrls(existing.mediaUrls, incoming.mediaUrls),
  outputDimensions: incoming.outputDimensions || existing.outputDimensions,
  projectId: incoming.projectId || existing.projectId,
  folderId: incoming.folderId || existing.folderId,
})

const mergeLists = (...lists: LabNewLayoutGalleryHistoryEntry[][]): LabNewLayoutGalleryHistoryEntry[] => {
  const merged = new Map<string, LabNewLayoutGalleryHistoryEntry>()
  lists.flat().forEach((entry) => {
    const dedupeKey = firstNonEmptyString(entry.taskId, entry.id, entry.resultUrl, `${entry.timestamp}-${entry.prompt.slice(0, 48)}`)
    const existing = merged.get(dedupeKey)
    if (!existing) {
      merged.set(dedupeKey, entry)
      return
    }
    merged.set(dedupeKey, mergeHistoryEntries(existing, entry))
  })
  return Array.from(merged.values()).sort((left, right) => right.timestamp - left.timestamp)
}

const normalizeLabStoreEntry = (entry: GenerationHistoryItem): LabNewLayoutGalleryHistoryEntry => ({
  id: entry.id,
  source: 'new-layout',
  sourceLabel: entry.sourceLabel || 'New Layout',
  timestamp: entry.completedAt ?? entry.receivedAt ?? entry.submittedAt ?? entry.timestamp,
  prompt: entry.prompt,
  model: entry.model,
  provider: entry.provider || '',
  status: entry.status,
  resultUrl: entry.resultUrl || '',
  posterUrl: entry.posterUrl || '',
  errorMessage: entry.errorMessage || '',
  taskId: entry.taskId || '',
  ratio: entry.ratio || '',
  resolution: entry.resolution || '',
  duration: entry.duration ?? null,
  generateAudio: entry.generateAudio ?? null,
  requestEndpoint: entry.requestEndpoint || '',
  requestPayload: readRequestPayload(entry.requestPayload),
  mediaUrls: mergeMediaUrls(entry.mediaUrls || {}, readMediaUrlsFromPayload(readRequestPayload(entry.requestPayload))),
  outputDimensions: entry.outputDimensions || '',
  projectId: entry.projectId || '',
  folderId: entry.folderId || '',
})

const normalizePromptLabEntry = (value: unknown, sourceLabel: string): LabNewLayoutGalleryHistoryEntry | null => {
  if (!isRecord(value)) {
    return null
  }

  const requestPayload = readRequestPayload(value.requestPayload)
  const mediaUrls = mergeMediaUrls(readMediaRecord(value.mediaUrls), readMediaUrlsFromPayload(requestPayload))
  const timestamp = readNumber(value.completedAt, value.receivedAt, value.submittedAt, value.createdAt) ?? Date.now()
  const resultUrl = firstNonEmptyString(value.firebaseVideoUrl, value.resultUrl)
  const prompt = firstNonEmptyString(value.prompt, value.sourcePrompt)

  if (!resultUrl && !prompt && Object.keys(mediaUrls).length === 0) {
    return null
  }

  return {
    id: firstNonEmptyString(value.historyId, value.taskId, resultUrl, `${timestamp}`),
    source: 'prompt-lab',
    sourceLabel,
    timestamp,
    prompt,
    model: firstNonEmptyString(value.model),
    provider: firstNonEmptyString(value.provider, value.providerLabel),
    status: normalizeStatus(value.status, resultUrl ? 'success' : 'failed'),
    resultUrl,
    posterUrl: firstNonEmptyString(value.thumbnailPosterUrl),
    errorMessage: firstNonEmptyString(value.storageSaveError),
    taskId: firstNonEmptyString(value.taskId),
    ratio: firstNonEmptyString(value.ratio),
    resolution: firstNonEmptyString(value.resolution),
    duration: readNumber(value.duration),
    generateAudio: readBoolean(value.generateAudio),
    requestEndpoint: firstNonEmptyString(value.requestEndpoint),
    requestPayload,
    mediaUrls,
    outputDimensions: firstNonEmptyString(value.outputDimensions),
    projectId: firstNonEmptyString(value.projectId),
    folderId: firstNonEmptyString(value.folderId),
  }
}

const normalizeLegacyHistoryEntry = (value: unknown): LabNewLayoutGalleryHistoryEntry | null => {
  if (!isRecord(value)) {
    return null
  }

  const requestPayload = readRequestPayload(value.apiPayload)
  const mediaUrls = mergeMediaUrls(
    readMediaUrlsFromPayload(requestPayload),
    (() => {
      const next: Record<string, string> = {}
      mergeArrayMedia(next, 'image', readStringArray(value.referenceImages))
      mergeArrayMedia(next, 'video', readStringArray(value.referenceVideos))
      mergeArrayMedia(next, 'audio', readStringArray(value.referenceAudios))
      return next
    })(),
  )
  const resultUrl = firstNonEmptyString(value.videoUrl)
  const prompt = firstNonEmptyString(value.prompt, value.sourcePrompt)

  if (!resultUrl && !prompt) {
    return null
  }

  const timestamp = readNumber(value.completedAt, value.createdAt, value.submittedAt) ?? Date.now()

  return {
    id: firstNonEmptyString(value.taskId, resultUrl, `${timestamp}`),
    source: 'legacy-toorgen',
    sourceLabel: 'Legacy ToorGen',
    timestamp,
    prompt,
    model: firstNonEmptyString(value.effectiveModel, value.requestedModel, value.model),
    provider: firstNonEmptyString(value.providerLabel, value.providerUsed),
    status: normalizeStatus(value.status, resultUrl ? 'success' : 'failed'),
    resultUrl,
    posterUrl: '',
    errorMessage: '',
    taskId: firstNonEmptyString(value.taskId),
    ratio: firstNonEmptyString(value.aspectRatio),
    resolution: firstNonEmptyString(value.qualityPreset),
    duration: readNumber(value.duration),
    generateAudio: readBoolean(value.includeAudio),
    requestEndpoint: '',
    requestPayload,
    mediaUrls,
    outputDimensions: '',
    projectId: firstNonEmptyString(value.collectionId),
    folderId: '',
  }
}

const readJsonArray = (storageKey: string): unknown[] => {
  if (typeof window === 'undefined') {
    return []
  }
  try {
    const raw = window.localStorage.getItem(storageKey)
    if (!raw) {
      return []
    }
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

const readPromptLabLocalHistory = (): LabNewLayoutGalleryHistoryEntry[] => (
  readJsonArray(PROMPT_LAB_LOCAL_HISTORY_KEY)
    .map((entry) => normalizePromptLabEntry(entry, 'Prompt Lab'))
    .filter((entry): entry is LabNewLayoutGalleryHistoryEntry => Boolean(entry))
)

const readLegacyHistory = (): LabNewLayoutGalleryHistoryEntry[] => (
  readJsonArray(LEGACY_TOORGEN_HISTORY_KEY)
    .map(normalizeLegacyHistoryEntry)
    .filter((entry): entry is LabNewLayoutGalleryHistoryEntry => Boolean(entry))
)

const readPromptLabFirestoreHistory = async (uid: string): Promise<LabNewLayoutGalleryHistoryEntry[]> => {
  try {
    const historyRef = collection(db, 'users', uid, PROMPT_LAB_FIRESTORE_COLLECTION)
    const historyQuery = query(historyRef, orderBy('completedAt', 'desc'), limit(MAX_REMOTE_HISTORY_ITEMS))
    const snapshot = await getDocs(historyQuery)
    return snapshot.docs
      .map((docSnapshot) => normalizePromptLabEntry(docSnapshot.data(), 'Prompt Lab'))
      .filter((entry): entry is LabNewLayoutGalleryHistoryEntry => Boolean(entry))
  } catch {
    return []
  }
}

type UseLabNewLayoutHistoryGalleryParams = {
  authUid: string
}

export function useLabNewLayoutHistoryGallery({ authUid }: UseLabNewLayoutHistoryGalleryParams) {
  const liveLabHistory = useLabNewLayoutStore((state) => state.history)
  const [promptLabHistory, setPromptLabHistory] = useState<LabNewLayoutGalleryHistoryEntry[]>(() => readPromptLabLocalHistory())
  const [legacyHistory, setLegacyHistory] = useState<LabNewLayoutGalleryHistoryEntry[]>(() => readLegacyHistory())
  const [remoteHistory, setRemoteHistory] = useState<LabNewLayoutGalleryHistoryEntry[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  const refresh = useCallback(async () => {
    setPromptLabHistory(readPromptLabLocalHistory())
    setLegacyHistory(readLegacyHistory())

    if (!authUid) {
      setRemoteHistory([])
      setErrorMessage('')
      return
    }

    setIsLoading(true)
    setErrorMessage('')
    try {
      const nextRemoteHistory = await readPromptLabFirestoreHistory(authUid)
      setRemoteHistory(nextRemoteHistory)
    } catch {
      setRemoteHistory([])
      setErrorMessage('Could not load synced history right now.')
    } finally {
      setIsLoading(false)
    }
  }, [authUid])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const entries = useMemo(() => {
    const normalizedLabHistory = liveLabHistory.map(normalizeLabStoreEntry)
    return mergeLists(normalizedLabHistory, promptLabHistory, remoteHistory, legacyHistory)
  }, [legacyHistory, liveLabHistory, promptLabHistory, remoteHistory])

  return {
    entries,
    isLoading,
    errorMessage,
    refresh,
  }
}