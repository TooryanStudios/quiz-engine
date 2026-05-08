import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage'
import { storage } from '../firebase'

type SaveGeneratedVideoArtifactsOptions = {
  sourceUrl: string
  storageBasePath: string
  apiBaseUrl?: string
  captureThumbnail?: boolean
}

type FinalizeGeneratedVideoPersistenceOptions<TEntry> = {
  sourceUrl: string
  storageBasePath: string
  apiBaseUrl?: string
  captureThumbnail?: boolean
  completedAt?: number
  buildEntry: (context: {
    completedAt: number
    resultUrl: string
    firebaseVideoUrl: string
    thumbnailUrl: string
    storageSaveError: string
  }) => TEntry
  persistEntry: (entry: TEntry) => Promise<void>
}

const MAX_VIDEO_BYTES = 50 * 1024 * 1024

const toApiUrl = (apiBaseUrl: string, path: string) => {
  const base = (apiBaseUrl || '').trim().replace(/\/$/, '')
  return base ? `${base}${path}` : path
}

const resolveProxySourceUrl = (url: string): string => {
  const trimmed = url.trim()
  if (!trimmed) return ''
  try {
    const fallbackOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
    const parsed = new URL(trimmed, fallbackOrigin)
    if (!parsed.pathname.endsWith('/api/video-proxy')) {
      return trimmed
    }
    const original = parsed.searchParams.get('url') || ''
    return original.trim() || trimmed
  } catch {
    return trimmed
  }
}

export const uploadBlobToFirebase = async (blob: Blob, storagePath: string, contentType?: string): Promise<string> => {
  const reference = storageRef(storage, storagePath)
  if (contentType) {
    await uploadBytes(reference, blob, { contentType })
  } else {
    await uploadBytes(reference, blob)
  }
  return getDownloadURL(reference)
}

const downloadVideoBlob = async (
  sourceUrl: string,
  apiBaseUrl: string,
): Promise<Blob> => {
  const normalizedSourceUrl = resolveProxySourceUrl(sourceUrl)
  if (!normalizedSourceUrl) {
    throw new Error('No result URL was available for Firebase save.')
  }

  // Always use the backend proxy — direct browser fetches fail for cross-origin
  // provider CDN URLs (Volcengine TOS, etc.) due to missing CORS headers.
  const proxyUrl = `${toApiUrl(apiBaseUrl, '/api/video-proxy')}?url=${encodeURIComponent(normalizedSourceUrl)}`
  const proxyResponse = await fetch(proxyUrl)
  if (!proxyResponse.ok) {
    throw new Error(`Failed to download generated video: HTTP ${proxyResponse.status}`)
  }

  const videoBlob = await proxyResponse.blob()
  if (videoBlob.size > MAX_VIDEO_BYTES) {
    throw new Error('Generated video is larger than the Firebase Storage limit (50MB).')
  }
  return videoBlob
}

const createVideoThumbnailBlob = async (videoBlob: Blob): Promise<Blob> => {
  const videoObjectUrl = URL.createObjectURL(videoBlob)
  try {
    const video = document.createElement('video')
    video.preload = 'metadata'
    video.muted = true
    video.playsInline = true
    video.crossOrigin = 'anonymous'
    video.src = videoObjectUrl

    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve()
      video.onerror = () => reject(new Error('Thumbnail decoding failed.'))
    })

    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, video.videoWidth || 1280)
    canvas.height = Math.max(1, video.videoHeight || 720)
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Could not create thumbnail canvas.')
    context.drawImage(video, 0, 0, canvas.width, canvas.height)

    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Thumbnail export failed.'))
          return
        }
        resolve(blob)
      }, 'image/jpeg', 0.92)
    })
  } finally {
    URL.revokeObjectURL(videoObjectUrl)
  }
}

export const saveGeneratedVideoArtifactsToFirebase = async ({
  sourceUrl,
  storageBasePath,
  apiBaseUrl = '',
  captureThumbnail = false,
}: SaveGeneratedVideoArtifactsOptions): Promise<{ firebaseUrl: string; thumbnailUrl: string }> => {
  const videoBlob = await downloadVideoBlob(sourceUrl, apiBaseUrl)
  const firebaseUrl = await uploadBlobToFirebase(videoBlob, `${storageBasePath}.mp4`, videoBlob.type || 'video/mp4')

  let thumbnailUrl = ''
  if (captureThumbnail) {
    try {
      const thumbnailBlob = await createVideoThumbnailBlob(videoBlob)
      thumbnailUrl = await uploadBlobToFirebase(thumbnailBlob, `${storageBasePath}.jpg`, 'image/jpeg')
    } catch {
      // Thumbnail generation is best-effort; keep the Firebase video URL even if this fails.
    }
  }

  return { firebaseUrl, thumbnailUrl }
}

export const finalizeGeneratedVideoPersistence = async <TEntry>({
  sourceUrl,
  storageBasePath,
  apiBaseUrl = '',
  captureThumbnail = false,
  completedAt = Date.now(),
  buildEntry,
  persistEntry,
}: FinalizeGeneratedVideoPersistenceOptions<TEntry>): Promise<{
  entry: TEntry
  completedAt: number
  firebaseVideoUrl: string
  thumbnailUrl: string
  storageSaveError: string
  playbackUrl: string
}> => {
  let firebaseVideoUrl = ''
  let thumbnailUrl = ''
  let storageSaveError = ''

  try {
    const saved = await saveGeneratedVideoArtifactsToFirebase({
      sourceUrl,
      storageBasePath,
      apiBaseUrl,
      captureThumbnail,
    })
    firebaseVideoUrl = saved.firebaseUrl
    thumbnailUrl = saved.thumbnailUrl
  } catch (error) {
    storageSaveError = error instanceof Error ? error.message : String(error)
  }

  const entry = buildEntry({
    completedAt,
    resultUrl: sourceUrl,
    firebaseVideoUrl,
    thumbnailUrl,
    storageSaveError,
  })

  await persistEntry(entry)

  return {
    entry,
    completedAt,
    firebaseVideoUrl,
    thumbnailUrl,
    storageSaveError,
    playbackUrl: firebaseVideoUrl || sourceUrl,
  }
}