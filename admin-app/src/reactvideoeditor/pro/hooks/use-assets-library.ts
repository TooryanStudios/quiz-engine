import { useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore'
import { auth, db } from '../../../lib/firebase'
import {
  backfillProjectReferenceLibraryItemThumbnail,
  subscribeToUserReferenceLibrary,
} from '../../../lib/studioService'
import {
  mergeMediaLibraryItems,
  readLocalMediaLibrary,
  toMediaLibraryItem,
  type MediaLibraryItem,
} from '../../../lib/toorgen/referenceLibrary'

type AssetsLibraryState = {
  items: MediaLibraryItem[]
  user: User | null
  /** true while the initial auth check is in progress */
  isAuthLoading: boolean
  /** Any Firestore query error */
  error: string | null
}

const FIRESTORE_HISTORY_COLLECTION = 'toorgen_prompt_lab_generations'
const HISTORY_THUMB_SCAN_LIMIT = 300
const THUMBNAIL_BACKFILL_DONE_KEY_PREFIX = 'rve-assets-thumb-backfill-v1'

const normalizeMediaUrlForLookup = (rawUrl: string): string => {
  const trimmed = rawUrl.trim()
  if (!trimmed) {
    return ''
  }

  try {
    const parsed = new URL(trimmed)
    parsed.hash = ''
    parsed.search = ''
    return parsed.toString()
  } catch {
    const withoutHash = trimmed.split('#')[0] || ''
    const withoutQuery = withoutHash.split('?')[0] || ''
    return withoutQuery.trim()
  }
}

/**
 * Subscribes to the authenticated user's reference / assets library in Firestore
 * and returns items in the same `MediaLibraryItem` shape used throughout the app.
 * Returns an empty array when there is no logged-in user.
 */
export function useAssetsLibrary(): AssetsLibraryState {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const [remoteItems, setRemoteItems] = useState<MediaLibraryItem[]>([])
  const [localItems, setLocalItems] = useState<MediaLibraryItem[]>(() => readLocalMediaLibrary())
  const [historyThumbByUrl, setHistoryThumbByUrl] = useState<Record<string, string>>({})
  const [error, setError] = useState<string | null>(null)

  const getThumbnailBackfillDoneKey = (uid: string) => `${THUMBNAIL_BACKFILL_DONE_KEY_PREFIX}:${uid}`

  useEffect(() => {
    const refreshLocalItems = () => {
      setLocalItems(readLocalMediaLibrary())
    }

    // Refresh when another tab writes to storage and when this tab regains focus.
    window.addEventListener('storage', refreshLocalItems)
    window.addEventListener('focus', refreshLocalItems)

    return () => {
      window.removeEventListener('storage', refreshLocalItems)
      window.removeEventListener('focus', refreshLocalItems)
    }
  }, [])

  useEffect(() => {
    let unsubLib: (() => void) | null = null

    const unsubAuth = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser)
      setIsAuthLoading(false)
      unsubLib?.()
      if (!firebaseUser) {
        setRemoteItems([])
        setHistoryThumbByUrl({})
        setError(null)
        return
      }

      void (async () => {
        try {
          const historyRef = collection(db, 'users', firebaseUser.uid, FIRESTORE_HISTORY_COLLECTION)
          const historyQuery = query(historyRef, orderBy('completedAt', 'desc'), limit(HISTORY_THUMB_SCAN_LIMIT))
          const snap = await getDocs(historyQuery)
          const nextMap: Record<string, string> = {}
          const addHistoryThumb = (rawMediaUrl: string, thumbnailUrl: string) => {
            const mediaUrl = rawMediaUrl.trim()
            if (!mediaUrl || !thumbnailUrl) {
              return
            }

            if (!nextMap[mediaUrl]) {
              nextMap[mediaUrl] = thumbnailUrl
            }

            const normalizedUrl = normalizeMediaUrlForLookup(mediaUrl)
            if (normalizedUrl && !nextMap[normalizedUrl]) {
              nextMap[normalizedUrl] = thumbnailUrl
            }
          }

          snap.docs.forEach((docSnap) => {
            const payload = docSnap.data() as {
              firebaseVideoUrl?: string
              resultUrl?: string
              thumbnailPosterUrl?: string
            }
            const thumbnail = (payload.thumbnailPosterUrl || '').trim()
            if (!thumbnail) {
              return
            }

            const firebaseVideoUrl = (payload.firebaseVideoUrl || '').trim()
            const resultUrl = (payload.resultUrl || '').trim()

            addHistoryThumb(firebaseVideoUrl, thumbnail)
            addHistoryThumb(resultUrl, thumbnail)
          })

          if (auth.currentUser?.uid === firebaseUser.uid) {
            setHistoryThumbByUrl(nextMap)
          }
        } catch {
          if (auth.currentUser?.uid === firebaseUser.uid) {
            setHistoryThumbByUrl({})
          }
        }
      })()

      setError(null)
      unsubLib = subscribeToUserReferenceLibrary(
        firebaseUser.uid,
        (assets) => {
          setRemoteItems(assets.map(toMediaLibraryItem))
          setError(null)
        },
        (err) => {
          console.error('[useAssetsLibrary] Firestore error:', err)
          setRemoteItems([])
          // Surface an actionable message for common Firestore failures.
          const msg = (err as Error).message ?? String(err)
          const code = String((err as { code?: string } | undefined)?.code || '').toLowerCase()

          if (code.includes('permission-denied') || msg.toLowerCase().includes('permission-denied')) {
            setError('Failed to load library: Firestore permission denied. Check the user reference_library rules and auth state.')
            return
          }

          if (code.includes('unavailable') || msg.toLowerCase().includes('unavailable')) {
            setError('Failed to load library: Firestore is temporarily unavailable. Please retry in a moment.')
            return
          }

          setError(
            msg.toLowerCase().includes('index') || code.includes('failed-precondition')
              ? 'Firestore index missing — deploy indexes and retry.'
              : 'Failed to load library. Check console for details.',
          )
        },
      )
    })

    return () => {
      unsubAuth()
      unsubLib?.()
    }
  }, [])

  const mergedItems = useMemo(
    () => mergeMediaLibraryItems(remoteItems, localItems),
    [remoteItems, localItems],
  )

  const enrichedItems = useMemo(
    () => mergedItems.map((item) => {
      if (item.kind !== 'video') {
        return item
      }

      const historyThumbnail = historyThumbByUrl[item.url] || historyThumbByUrl[normalizeMediaUrlForLookup(item.url)]
      if (item.thumbnailUrl || !historyThumbnail) {
        return item
      }

      return {
        ...item,
        thumbnailUrl: historyThumbnail,
      }
    }),
    [historyThumbByUrl, mergedItems],
  )

  useEffect(() => {
    if (!user || remoteItems.length === 0) {
      return
    }

    const doneKey = getThumbnailBackfillDoneKey(user.uid)
    if (window.localStorage.getItem(doneKey) === 'done') {
      return
    }

    const candidates = remoteItems
      .filter((item) => item.kind === 'video' && !item.thumbnailUrl)
      .map((item) => ({
        ...item,
        candidateThumbnail: historyThumbByUrl[item.url] || historyThumbByUrl[normalizeMediaUrlForLookup(item.url)] || '',
      }))
      .filter((item) => Boolean(item.projectId && item.candidateThumbnail))

    if (candidates.length === 0) {
      window.localStorage.setItem(doneKey, 'done')
      return
    }

    let cancelled = false
    void (async () => {
      const results = await Promise.allSettled(
        candidates.map((item) => backfillProjectReferenceLibraryItemThumbnail(
          item.projectId || '',
          item.id,
          item.candidateThumbnail,
        )),
      )

      if (cancelled) {
        return
      }

      const hasFailures = results.some((result) => result.status === 'rejected')
      if (!hasFailures) {
        window.localStorage.setItem(doneKey, 'done')
      }
    })()

    return () => {
      cancelled = true
    }
  }, [historyThumbByUrl, remoteItems, user])

  return {
    items: enrichedItems,
    user,
    isAuthLoading,
    error,
  }
}

/**
 * Converts a `MediaLibraryItem` into the generic file-like shape expected by
 * `LocalMediaPanel.handleAddToTimeline` and `LocalMediaGallery.renderMediaItem`.
 */
export function assetLibraryItemToFile(item: MediaLibraryItem) {
  const normalizedThumbnail = (item.thumbnailUrl || '').trim()
  return {
    id: item.id,
    /** Use the Firebase Storage / external URL as the path */
    path: item.url,
    /** kind maps 1-to-1 with the gallery's type discriminator */
    type: item.kind as 'image' | 'video' | 'audio',
    name: item.name,
    /** Use poster/thumbnail URL for videos when available */
    thumbnail: normalizedThumbnail || (item.kind === 'image' ? item.url : undefined),
    thumbnailUrl: normalizedThumbnail || undefined,
    /** Size is unknown for remote assets */
    size: 0,
    _isAssetLibraryItem: true,
  }
}
