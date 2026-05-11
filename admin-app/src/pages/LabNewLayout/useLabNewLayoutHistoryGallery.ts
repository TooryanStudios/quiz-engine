import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  type DocumentData,
  type QueryConstraint,
  type QueryDocumentSnapshot,
} from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useLabNewLayoutStore, type GenerationHistoryItem } from './useLabNewLayoutStore'

export type LabNewLayoutGalleryHistoryEntry = {
  id: string
  remoteDocId?: string
  source: 'new-layout' | 'prompt-lab' | 'legacy-toorgen'
  sourceLabel: string
  timestamp: number
  submittedAt: number | null
  receivedAt: number | null
  completedAt: number | null
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
const REMOTE_HISTORY_PAGE_SIZE = 30
const OPTIMISTIC_SUCCESS_WINDOW_MS = 2 * 60 * 1000

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
      const numericValue = Number(value.replace(/[^\d.-]/g, ''))
      if (Number.isFinite(numericValue)) {
        return numericValue
      }
    }
  }
  return null
}

const readTimestampValue = (...values: unknown[]): number | null => {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value
    }

    if (typeof value === 'string' && value.trim()) {
      const trimmed = value.trim()
      const numericValue = Number(trimmed)
      if (Number.isFinite(numericValue)) {
        return numericValue
      }

      const parsedDate = Date.parse(trimmed)
      if (Number.isFinite(parsedDate)) {
        return parsedDate
      }

      const sanitizedNumericValue = Number(trimmed.replace(/[^\d.-]/g, ''))
      if (Number.isFinite(sanitizedNumericValue)) {
        return sanitizedNumericValue
      }
    }

    if (value instanceof Date) {
      const dateValue = value.getTime()
      if (Number.isFinite(dateValue)) {
        return dateValue
      }
    }

    if (isRecord(value)) {
      const toMillis = value.toMillis
      if (typeof toMillis === 'function') {
        try {
          const millis = Number(toMillis.call(value))
          if (Number.isFinite(millis)) {
            return millis
          }
        } catch {
          // Ignore malformed timestamp-like objects.
        }
      }

      const seconds = typeof value.seconds === 'number'
        ? value.seconds
        : typeof value._seconds === 'number'
          ? value._seconds
          : null
      const nanoseconds = typeof value.nanoseconds === 'number'
        ? value.nanoseconds
        : typeof value._nanoseconds === 'number'
          ? value._nanoseconds
          : 0

      if (seconds !== null) {
        return (seconds * 1000) + Math.floor(nanoseconds / 1_000_000)
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

const coerceCompletedStatus = (
  status: LabNewLayoutGalleryHistoryEntry['status'],
  resultUrl: string,
): LabNewLayoutGalleryHistoryEntry['status'] => (
  resultUrl.trim() ? 'success' : status
)

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

const readUrlLike = (value: unknown): string => {
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }
  if (!isRecord(value)) {
    return ''
  }

  const imageUrl = isRecord(value.image_url) ? value.image_url : null
  const videoUrl = isRecord(value.video_url) ? value.video_url : null
  const audioUrl = isRecord(value.audio_url) ? value.audio_url : null

  return firstNonEmptyString(
    value.url,
    value.src,
    imageUrl?.url,
    videoUrl?.url,
    audioUrl?.url,
  )
}

const pushBucketUrl = (bucket: string[], value: unknown) => {
  const url = readUrlLike(value)
  if (url) {
    bucket.push(url)
  }
}

const mergeBucketsIntoMedia = (
  target: Record<string, string>,
  buckets: { image: string[]; video: string[]; audio: string[]; reference: string[] },
) => {
  mergeArrayMedia(target, 'image', buckets.image)
  mergeArrayMedia(target, 'video', buckets.video)
  mergeArrayMedia(target, 'audio', buckets.audio)
  mergeArrayMedia(target, 'reference', buckets.reference)
}

const readMediaUrlsFromHistoryFields = (value: Record<string, unknown>): Record<string, string> => {
  const next: Record<string, string> = {}
  const buckets = {
    image: readStringArray(value.referenceImages),
    video: readStringArray(value.referenceVideos),
    audio: readStringArray(value.referenceAudios),
    reference: [] as string[],
  }

  if (Array.isArray(value.referenceNodes)) {
    value.referenceNodes.forEach((entry) => {
      if (!isRecord(entry)) return
      const kind = firstNonEmptyString(entry.kind).toLowerCase()
      if (kind === 'video') {
        pushBucketUrl(buckets.video, entry)
        return
      }
      if (kind === 'audio') {
        pushBucketUrl(buckets.audio, entry)
        return
      }
      pushBucketUrl(buckets.image, entry)
    })
  }

  mergeBucketsIntoMedia(next, buckets)
  return next
}

const mergeArrayMedia = (target: Record<string, string>, prefix: string, values: string[]) => {
  values.forEach((value, index) => {
    target[`${prefix}-${index + 1}`] = value
  })
}

const readRequestPayload = (value: unknown): Record<string, unknown> | null => {
  if (isRecord(value)) {
    return value
  }

  if (typeof value !== 'string' || !value.trim()) {
    return null
  }

  try {
    const parsed = JSON.parse(value) as unknown
    return isRecord(parsed) ? parsed : null
  } catch {
    return null
  }
}

const readMediaUrlsFromPayload = (payload: Record<string, unknown> | null): Record<string, string> => {
  if (!payload) {
    return {}
  }

  const mediaUrls = readMediaRecord(payload.mediaUrls)
  if (Object.keys(mediaUrls).length > 0) {
    return mediaUrls
  }

  const next: Record<string, string> = {}
  const buckets = {
    image: [
      ...readStringArray(payload.reference_images ?? payload.referenceImages ?? payload.images ?? payload.image_urls ?? payload.imageUrls),
    ],
    video: [
      ...readStringArray(payload.reference_videos ?? payload.referenceVideos ?? payload.videos ?? payload.video_urls ?? payload.videoUrls),
    ],
    audio: [
      ...readStringArray(payload.reference_audios ?? payload.referenceAudios ?? payload.audios ?? payload.audio_urls ?? payload.audioUrls),
    ],
    reference: [] as string[],
  }

  pushBucketUrl(buckets.image, payload.image)
  pushBucketUrl(buckets.image, payload.image_url)
  pushBucketUrl(buckets.image, payload.imageUrl)

  pushBucketUrl(buckets.video, payload.video)
  pushBucketUrl(buckets.video, payload.video_url)
  pushBucketUrl(buckets.video, payload.videoUrl)
  pushBucketUrl(buckets.video, payload.source_video_url)
  pushBucketUrl(buckets.video, payload.sourceVideoUrl)
  pushBucketUrl(buckets.video, payload.extension_video_url)
  pushBucketUrl(buckets.video, payload.extensionVideoUrl)

  pushBucketUrl(buckets.audio, payload.audio)
  pushBucketUrl(buckets.audio, payload.audio_url)
  pushBucketUrl(buckets.audio, payload.audioUrl)

  if (Array.isArray(payload.references)) {
    payload.references.forEach((entry) => {
      if (typeof entry === 'string') {
        buckets.reference.push(entry.trim())
        return
      }
      if (!isRecord(entry)) return
      const kind = firstNonEmptyString(entry.kind).toLowerCase()
      if (kind === 'video') {
        pushBucketUrl(buckets.video, entry)
        return
      }
      if (kind === 'audio') {
        pushBucketUrl(buckets.audio, entry)
        return
      }
      if (kind === 'image') {
        pushBucketUrl(buckets.image, entry)
        return
      }
      pushBucketUrl(buckets.reference, entry)
    })
  }

  if (Array.isArray(payload.mention_references)) {
    payload.mention_references.forEach((entry) => {
      if (!isRecord(entry)) return
      const kind = firstNonEmptyString(entry.kind).toLowerCase()
      if (kind === 'video') {
        pushBucketUrl(buckets.video, entry)
        return
      }
      if (kind === 'audio') {
        pushBucketUrl(buckets.audio, entry)
        return
      }
      pushBucketUrl(kind === 'image' ? buckets.image : buckets.reference, entry)
    })
  }

  if (isRecord(payload.reference_aliases)) {
    Object.values(payload.reference_aliases).forEach((entry) => {
      if (!isRecord(entry)) return
      const kind = firstNonEmptyString(entry.kind).toLowerCase()
      if (kind === 'video') {
        pushBucketUrl(buckets.video, entry)
        return
      }
      if (kind === 'audio') {
        pushBucketUrl(buckets.audio, entry)
        return
      }
      pushBucketUrl(kind === 'image' ? buckets.image : buckets.reference, entry)
    })
  }

  if (Array.isArray(payload.content)) {
    payload.content.forEach((entry) => {
      if (!isRecord(entry)) return
      const type = firstNonEmptyString(entry.type).toLowerCase()
      if (type === 'image_url') {
        pushBucketUrl(buckets.image, entry)
        return
      }
      if (type === 'video_url') {
        pushBucketUrl(buckets.video, entry)
        return
      }
      if (type === 'audio_url') {
        pushBucketUrl(buckets.audio, entry)
      }
    })
  }

  mergeBucketsIntoMedia(next, buckets)
  return next
}

const mergeMediaUrls = (...records: Array<Record<string, string>>): Record<string, string> => {
  const next: Record<string, string> = {}
  const seenUrls = new Set<string>()
  records.forEach((record) => {
    Object.entries(record).forEach(([key, value]) => {
      if (!value) return
      const normalizedValue = value.trim()
      if (!normalizedValue || seenUrls.has(normalizedValue)) return
      seenUrls.add(normalizedValue)
      next[key] = normalizedValue
    })
  })
  return next
}

const mergeHistoryEntries = (
  existing: LabNewLayoutGalleryHistoryEntry,
  incoming: LabNewLayoutGalleryHistoryEntry,
): LabNewLayoutGalleryHistoryEntry => {
  const mergedResultUrl = incoming.resultUrl || existing.resultUrl
  const mergedStatus = incoming.status === 'success'
    ? 'success'
    : existing.status === 'success'
      ? 'success'
      : incoming.status === 'failed' && !mergedResultUrl
        ? 'failed'
        : existing.status === 'failed' && !mergedResultUrl
          ? 'failed'
          : incoming.status === 'running' && existing.status === 'queued'
            ? 'running'
            : existing.status

  return {
    ...existing,
    ...incoming,
    remoteDocId: incoming.remoteDocId || existing.remoteDocId,
    source: incoming.source || existing.source,
    sourceLabel: incoming.sourceLabel || existing.sourceLabel,
    timestamp: Math.max(existing.timestamp, incoming.timestamp),
    prompt: incoming.prompt || existing.prompt,
    model: incoming.model || existing.model,
    provider: incoming.provider || existing.provider,
    status: coerceCompletedStatus(mergedStatus, mergedResultUrl),
    resultUrl: mergedResultUrl,
    posterUrl: incoming.posterUrl || existing.posterUrl,
    errorMessage: incoming.errorMessage || existing.errorMessage,
    taskId: incoming.taskId || existing.taskId,
    ratio: incoming.ratio || existing.ratio,
    resolution: incoming.resolution || existing.resolution,
    duration: incoming.duration ?? existing.duration,
    generateAudio: incoming.generateAudio ?? existing.generateAudio,
    submittedAt: incoming.submittedAt ?? existing.submittedAt,
    receivedAt: incoming.receivedAt ?? existing.receivedAt,
    completedAt: incoming.completedAt ?? existing.completedAt,
    requestEndpoint: incoming.requestEndpoint || existing.requestEndpoint,
    requestPayload: incoming.requestPayload || existing.requestPayload,
    mediaUrls: mergeMediaUrls(existing.mediaUrls, incoming.mediaUrls),
    outputDimensions: incoming.outputDimensions || existing.outputDimensions,
    projectId: incoming.projectId || existing.projectId,
    folderId: incoming.folderId || existing.folderId,
  }
}

const mergeLists = (...lists: LabNewLayoutGalleryHistoryEntry[][]): LabNewLayoutGalleryHistoryEntry[] => {
  const merged = new Map<string, LabNewLayoutGalleryHistoryEntry>()
  lists.flat().forEach((entry) => {
    const dedupeKey = firstNonEmptyString(
      entry.id,
      entry.remoteDocId,
      entry.taskId,
      entry.resultUrl,
      `${entry.timestamp}-${entry.prompt.slice(0, 48)}`,
    )
    const existing = merged.get(dedupeKey)
    if (!existing) {
      merged.set(dedupeKey, entry)
      return
    }
    merged.set(dedupeKey, mergeHistoryEntries(existing, entry))
  })
  return Array.from(merged.values()).sort((left, right) => right.timestamp - left.timestamp)
}

const normalizeLabStoreEntry = (entry: GenerationHistoryItem): LabNewLayoutGalleryHistoryEntry => {
  const requestPayload = readRequestPayload(entry.requestPayload)
  const resultUrl = firstNonEmptyString(entry.resultUrl)

  return {
    id: entry.id,
    remoteDocId: entry.id,
    source: 'new-layout',
    sourceLabel: entry.sourceLabel || 'New Layout',
    timestamp: entry.completedAt ?? entry.receivedAt ?? entry.submittedAt ?? entry.timestamp,
    submittedAt: entry.submittedAt ?? null,
    receivedAt: entry.receivedAt ?? null,
    completedAt: entry.completedAt ?? null,
    prompt: entry.prompt,
    model: entry.model,
    provider: entry.provider || '',
    status: coerceCompletedStatus(entry.status, resultUrl),
    resultUrl,
    posterUrl: entry.posterUrl || '',
    errorMessage: entry.errorMessage || '',
    taskId: entry.taskId || '',
    ratio: entry.ratio || '',
    resolution: entry.resolution || '',
    duration: entry.duration ?? null,
    generateAudio: entry.generateAudio ?? null,
    requestEndpoint: entry.requestEndpoint || '',
    requestPayload,
    mediaUrls: mergeMediaUrls(entry.mediaUrls || {}, readMediaUrlsFromPayload(requestPayload)),
    outputDimensions: entry.outputDimensions || '',
    projectId: entry.projectId || '',
    folderId: entry.folderId || '',
  }
}

const normalizePromptLabEntry = (value: unknown, sourceLabel: string, remoteDocId?: string): LabNewLayoutGalleryHistoryEntry | null => {
  if (!isRecord(value)) {
    return null
  }

  const requestPayload = readRequestPayload(value.requestPayload)
    || readRequestPayload(value.requestPayloadJson)
    || readRequestPayload(value.apiPayload)
    || readRequestPayload(value.apiPayloadJson)
  const mediaUrls = mergeMediaUrls(
    readMediaRecord(value.mediaUrls),
    readMediaUrlsFromPayload(requestPayload),
    readMediaUrlsFromHistoryFields(value),
  )
  const submittedAt = readTimestampValue(value.submittedAt)
  const receivedAt = readTimestampValue(value.receivedAt)
  const completedAt = readTimestampValue(value.completedAt)
  const timestamp = readTimestampValue(
    value.completedAt,
    value.receivedAt,
    value.submittedAt,
    value.createdAt,
    value.updatedAt,
    value.timestamp,
  ) ?? 0
  const resultUrl = firstNonEmptyString(value.firebaseVideoUrl, value.resultUrl, value.videoUrl)
  const prompt = firstNonEmptyString(value.prompt, value.sourcePrompt)

  if (!resultUrl && !prompt && Object.keys(mediaUrls).length === 0) {
    return null
  }

  return {
    id: firstNonEmptyString(value.historyId, value.taskId, resultUrl, `${timestamp}`),
    remoteDocId,
    source: 'prompt-lab',
    sourceLabel,
    timestamp,
    submittedAt,
    receivedAt,
    completedAt,
    prompt,
    model: firstNonEmptyString(value.model),
    provider: firstNonEmptyString(value.provider, value.providerLabel),
    status: coerceCompletedStatus(normalizeStatus(value.status, resultUrl ? 'success' : 'failed'), resultUrl),
    resultUrl,
    posterUrl: firstNonEmptyString(value.thumbnailPosterUrl),
    errorMessage: firstNonEmptyString(value.storageSaveError, value.errorMessage, value.error, value.failureReason, value.failureMessage),
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
    || readRequestPayload(value.apiPayloadJson)
    || readRequestPayload(value.requestPayload)
    || readRequestPayload(value.requestPayloadJson)
  const mediaUrls = mergeMediaUrls(
    readMediaUrlsFromPayload(requestPayload),
    readMediaUrlsFromHistoryFields(value),
  )
  const resultUrl = firstNonEmptyString(value.firebaseVideoUrl, value.resultUrl, value.videoUrl)
  const prompt = firstNonEmptyString(value.prompt, value.sourcePrompt)

  if (!resultUrl && !prompt) {
    return null
  }

  const timestamp = readTimestampValue(
    value.completedAt,
    value.receivedAt,
    value.createdAt,
    value.submittedAt,
    value.updatedAt,
    value.timestamp,
  ) ?? 0
  const submittedAt = readTimestampValue(value.submittedAt)
  const receivedAt = readTimestampValue(value.receivedAt)
  const completedAt = readTimestampValue(value.completedAt)

  return {
    id: firstNonEmptyString(value.taskId, resultUrl, `${timestamp}`),
    remoteDocId: '',
    source: 'legacy-toorgen',
    sourceLabel: 'Legacy ToorGen',
    timestamp,
    submittedAt,
    receivedAt,
    completedAt,
    prompt,
    model: firstNonEmptyString(value.effectiveModel, value.requestedModel, value.model),
    provider: firstNonEmptyString(value.providerLabel, value.providerUsed),
    status: coerceCompletedStatus(normalizeStatus(value.status, resultUrl ? 'success' : 'failed'), resultUrl),
    resultUrl,
    posterUrl: '',
    errorMessage: firstNonEmptyString(value.errorMessage, value.error, value.failureReason, value.failureMessage, value.statusMessage),
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

const readPromptLabFirestoreHistoryPage = async (
  uid: string,
  cursor: QueryDocumentSnapshot<DocumentData> | null,
): Promise<{ entries: LabNewLayoutGalleryHistoryEntry[]; nextCursor: QueryDocumentSnapshot<DocumentData> | null; hasMore: boolean }> => {
  const historyRef = collection(db, 'users', uid, PROMPT_LAB_FIRESTORE_COLLECTION)
  const constraints: QueryConstraint[] = [
    orderBy('completedAt', 'desc'),
    limit(REMOTE_HISTORY_PAGE_SIZE + 1),
  ]

  if (cursor) {
    constraints.splice(1, 0, startAfter(cursor))
  }

  const historyQuery = query(historyRef, ...constraints)
  const snapshot = await getDocs(historyQuery)
  const hasMore = snapshot.docs.length > REMOTE_HISTORY_PAGE_SIZE
  const docs = hasMore ? snapshot.docs.slice(0, REMOTE_HISTORY_PAGE_SIZE) : snapshot.docs
  const nextCursor = docs.length > 0 ? docs[docs.length - 1] : cursor

  const entries = docs
    .map((docSnapshot) => normalizePromptLabEntry(docSnapshot.data(), 'Prompt Lab', docSnapshot.id))
    .filter((entry): entry is LabNewLayoutGalleryHistoryEntry => Boolean(entry))

  return { entries, nextCursor, hasMore }
}

const buildFirestoreSyncPayload = (entry: LabNewLayoutGalleryHistoryEntry, uid: string): Record<string, unknown> => {
  const completedAt = entry.completedAt ?? entry.receivedAt ?? entry.submittedAt ?? entry.timestamp

  return {
    historyId: entry.id,
    taskId: entry.taskId,
    provider: entry.provider,
    model: entry.model,
    ratio: entry.ratio,
    duration: entry.duration,
    resolution: entry.resolution,
    generateAudio: entry.generateAudio,
    prompt: entry.prompt,
    mediaUrls: entry.mediaUrls,
    requestEndpoint: entry.requestEndpoint,
    requestPayload: entry.requestPayload,
    resultUrl: entry.resultUrl,
    firebaseVideoUrl: entry.resultUrl,
    thumbnailPosterUrl: entry.posterUrl,
    storageSaveError: entry.errorMessage,
    submittedAt: entry.submittedAt,
    receivedAt: entry.receivedAt,
    completedAt,
    ownerUid: uid,
    sourceLabel: entry.sourceLabel,
    status: entry.status,
    outputDimensions: entry.outputDimensions,
    projectId: entry.projectId,
    folderId: entry.folderId,
    updatedAt: serverTimestamp(),
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
  const [remoteLoaded, setRemoteLoaded] = useState(false)
  const [remoteCursor, setRemoteCursor] = useState<QueryDocumentSnapshot<DocumentData> | null>(null)
  const [hasMoreRemote, setHasMoreRemote] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const lastSuccessfulSyncSignatureByIdRef = useRef<Record<string, string>>({})
  const inFlightSyncSignatureByIdRef = useRef<Record<string, string>>({})
  const syncRetryTimerRef = useRef<number | null>(null)
  const [syncRetryNonce, setSyncRetryNonce] = useState(0)

  const scheduleSyncRetry = useCallback(() => {
    if (typeof window === 'undefined' || syncRetryTimerRef.current !== null) {
      return
    }

    syncRetryTimerRef.current = window.setTimeout(() => {
      syncRetryTimerRef.current = null
      setSyncRetryNonce((current) => current + 1)
    }, 5000)
  }, [])

  const refresh = useCallback(async () => {
    setPromptLabHistory(readPromptLabLocalHistory())
    setLegacyHistory(readLegacyHistory())
    setRemoteLoaded(false)

    if (!authUid) {
      setRemoteHistory([])
      setRemoteCursor(null)
      setHasMoreRemote(false)
      setErrorMessage('')
      setRemoteLoaded(true)
      return
    }

    setIsLoading(true)
    setErrorMessage('')
    try {
      const firstPage = await readPromptLabFirestoreHistoryPage(authUid, null)
      setRemoteHistory(firstPage.entries)
      setRemoteCursor(firstPage.nextCursor)
      setHasMoreRemote(firstPage.hasMore)
    } catch {
      setRemoteHistory([])
      setRemoteCursor(null)
      setHasMoreRemote(false)
      setErrorMessage('Could not load synced history right now.')
    } finally {
      setIsLoading(false)
      setRemoteLoaded(true)
    }
  }, [authUid])

  const loadMoreRemote = useCallback(async () => {
    if (!authUid || isLoadingMore || !hasMoreRemote || !remoteCursor) {
      return
    }

    setIsLoadingMore(true)
    try {
      const nextPage = await readPromptLabFirestoreHistoryPage(authUid, remoteCursor)
      setRemoteHistory((current) => mergeLists(current, nextPage.entries))
      setRemoteCursor(nextPage.nextCursor)
      setHasMoreRemote(nextPage.hasMore)
    } catch {
      setErrorMessage('Could not load more synced history right now.')
    } finally {
      setIsLoadingMore(false)
    }
  }, [authUid, hasMoreRemote, isLoadingMore, remoteCursor])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined
    }

    const handleOnline = () => {
      setSyncRetryNonce((current) => current + 1)
      void refresh()
    }

    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('online', handleOnline)
      if (syncRetryTimerRef.current !== null) {
        window.clearTimeout(syncRetryTimerRef.current)
        syncRetryTimerRef.current = null
      }
    }
  }, [refresh])

  useEffect(() => {
    if (!authUid) {
      lastSuccessfulSyncSignatureByIdRef.current = {}
      inFlightSyncSignatureByIdRef.current = {}
      return
    }

    const normalizedEntries = liveLabHistory.map(normalizeLabStoreEntry)
    const syncCandidates = normalizedEntries.filter((entry) => Boolean(entry.id && entry.prompt.trim()))

    if (syncCandidates.length === 0) {
      return
    }

    syncCandidates.forEach((entry) => {
      const signature = JSON.stringify([
        entry.status,
        entry.resultUrl,
        entry.posterUrl,
        entry.errorMessage,
        entry.taskId,
        entry.submittedAt,
        entry.receivedAt,
        entry.completedAt,
        entry.requestEndpoint,
        entry.requestPayload,
        entry.mediaUrls,
        entry.projectId,
        entry.folderId,
      ])

      if (
        lastSuccessfulSyncSignatureByIdRef.current[entry.id] === signature
        || inFlightSyncSignatureByIdRef.current[entry.id] === signature
      ) {
        return
      }

      inFlightSyncSignatureByIdRef.current[entry.id] = signature
      const payload = buildFirestoreSyncPayload(entry, authUid)
      void setDoc(
        doc(db, 'users', authUid, PROMPT_LAB_FIRESTORE_COLLECTION, entry.id),
        payload,
        { merge: true },
      ).then(() => {
        if (inFlightSyncSignatureByIdRef.current[entry.id] === signature) {
          delete inFlightSyncSignatureByIdRef.current[entry.id]
        }
        lastSuccessfulSyncSignatureByIdRef.current[entry.id] = signature
        setRemoteHistory((current) => mergeLists(current, [{ ...entry, remoteDocId: entry.id }]))
        setErrorMessage((current) => (current === 'Could not load synced history right now.' ? '' : current))
      }).catch(() => {
        if (inFlightSyncSignatureByIdRef.current[entry.id] === signature) {
          delete inFlightSyncSignatureByIdRef.current[entry.id]
        }
        scheduleSyncRetry()
      })
    })
  }, [authUid, liveLabHistory, scheduleSyncRetry, syncRetryNonce])

  const deleteHistoryEntry = useCallback(async (entry: LabNewLayoutGalleryHistoryEntry) => {
    setRemoteHistory((current) => current.filter((currentEntry) => currentEntry.id !== entry.id))
    setPromptLabHistory((current) => current.filter((currentEntry) => currentEntry.id !== entry.id))
    setLegacyHistory((current) => current.filter((currentEntry) => currentEntry.id !== entry.id))
    delete lastSuccessfulSyncSignatureByIdRef.current[entry.id]
    delete inFlightSyncSignatureByIdRef.current[entry.id]

    if (!authUid || entry.source === 'legacy-toorgen') {
      return
    }

    const remoteDocId = firstNonEmptyString(entry.remoteDocId, entry.id)
    if (!remoteDocId) {
      return
    }

    await deleteDoc(doc(db, 'users', authUid, PROMPT_LAB_FIRESTORE_COLLECTION, remoteDocId))
  }, [authUid])

  const entries = useMemo(() => {
    const now = Date.now()
    const normalizedLiveLabHistory = liveLabHistory.map(normalizeLabStoreEntry)

    const optimisticLiveEntries = normalizedLiveLabHistory.filter((entry) => (
      entry.status === 'queued'
      || entry.status === 'running'
      || (
        (entry.status === 'success' || entry.status === 'failed')
        && (now - entry.timestamp) <= OPTIMISTIC_SUCCESS_WINDOW_MS
      )
    ))

    // While remote data is still loading, show only in-flight (queued/running/recent)
    // entries so stale local storage data never flashes before the remote sort arrives.
    if (!remoteLoaded) {
      return mergeLists(optimisticLiveEntries)
    }

    const shouldUseLocalFallback = !authUid || Boolean(errorMessage)
    if (shouldUseLocalFallback) {
      return mergeLists(optimisticLiveEntries, remoteHistory, promptLabHistory, legacyHistory)
    }

    return mergeLists(optimisticLiveEntries, remoteHistory)
  }, [authUid, errorMessage, legacyHistory, liveLabHistory, promptLabHistory, remoteHistory, remoteLoaded])

  return {
    entries,
    isLoading,
    isLoadingMore,
    hasMoreRemote,
    errorMessage,
    refresh,
    loadMoreRemote,
    deleteHistoryEntry,
  }
}
