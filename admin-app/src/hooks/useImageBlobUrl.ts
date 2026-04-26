import { useEffect, useState } from 'react'

const IMAGE_CACHE_NAME = 'flowboard-images-v1'

// In-memory map: normalized URL -> object URL (lives for the page session)
const _memCache = new Map<string, string>()
// Track in-flight fetches to avoid duplicate requests for the same URL
const _pending = new Map<string, Promise<string>>()

/**
 * Strip the Firebase Storage `token` param so the cache key stays stable
 * even when a new signed URL is issued for the same file.
 */
function normalizeUrl(url: string): string {
  try {
    const u = new URL(url)
    u.searchParams.delete('token')
    return u.toString()
  } catch {
    return url
  }
}

async function fetchAndCache(originalUrl: string): Promise<string> {
  const key = normalizeUrl(originalUrl)

  // 1. In-memory hit
  const mem = _memCache.get(key)
  if (mem) return mem

  // 2. Deduplicate concurrent requests
  const inflight = _pending.get(key)
  if (inflight) return inflight

  const promise = (async () => {
    try {
      // 3. Persistent Cache API hit
      if ('caches' in window) {
        const cache = await caches.open(IMAGE_CACHE_NAME)
        const cached = await cache.match(key)
        if (cached) {
          const blob = await cached.blob()
          if (blob.size > 0) {
            const objUrl = URL.createObjectURL(blob)
            _memCache.set(key, objUrl)
            return objUrl
          }
        }
      }

      // 4. Network fetch — use original URL (has valid token), store under normalized key
      const resp = await fetch(originalUrl)
      if (resp.ok) {
        const clone = resp.clone()
        const blob = await resp.blob()
        const objUrl = URL.createObjectURL(blob)
        _memCache.set(key, objUrl)
        if ('caches' in window) {
          const cache = await caches.open(IMAGE_CACHE_NAME)
          // Store response under the normalized key so future lookups hit it
          await cache.put(key, clone)
        }
        return objUrl
      }
    } catch {
      // Network or cache error — fall through to original URL
    }
    return originalUrl
  })().finally(() => {
    _pending.delete(key)
  })

  _pending.set(key, promise)
  return promise
}

/**
 * Returns a blob: object URL for `imageUrl`, loading from an in-memory cache
 * or the browser Cache API first.  Falls back to the original URL on error.
 */
export function useImageBlobUrl(imageUrl: string | undefined): string | undefined {
  const [blobUrl, setBlobUrl] = useState<string | undefined>(() => {
    if (!imageUrl) return undefined
    // Serve from in-memory cache synchronously if already loaded
    return _memCache.get(normalizeUrl(imageUrl)) ?? imageUrl
  })

  useEffect(() => {
    if (!imageUrl) return
    const key = normalizeUrl(imageUrl)
    const cached = _memCache.get(key)
    if (cached) {
      setBlobUrl(cached)
      return
    }

    let cancelled = false
    fetchAndCache(imageUrl).then((url) => {
      if (!cancelled) setBlobUrl(url)
    })
    return () => {
      cancelled = true
    }
  }, [imageUrl])

  return blobUrl
}
