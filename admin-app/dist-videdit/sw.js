const CACHE_NAME = 'qyan-v11'
const RUNTIME_CACHE = 'qyan-runtime-v11'

// Assets to cache on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/images/QYan_logo_300x164.jpg',
]

// Install event - precache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting())
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
          .map((name) => caches.delete(name))
      )
    }).then(() => self.clients.claim())
  )
})

// Fetch event - cache strategy
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-GET requests
  if (request.method !== 'GET') return

  // Never proxy cross-origin requests through this SW.
  // This avoids cache-mode incompatibilities on media/CDN responses.
  if (url.origin !== self.location.origin) return

  // Browser-only cache probes should never be handled in SW.
  // Intercepting them can trigger ERR_CACHE_OPERATION_NOT_SUPPORTED.
  if (request.cache === 'only-if-cached') return

  // Never handle API traffic in SW cache logic.
  // API endpoints should always be network-driven.
  if (url.pathname.startsWith('/api/')) return

  // Never cache or proxy media requests through SW.
  // Range/chunk behavior varies by browser and can cause cache operation failures.
  if (request.destination === 'video' || request.destination === 'audio') return
  if (/\.(mp4|webm|mov|m4v|mp3|wav|ogg)$/i.test(url.pathname)) return
  if (url.pathname.includes('%2Fgenerated%2F')) return
  if (url.searchParams.has('token') || url.searchParams.get('alt') === 'media') return
  if (url.searchParams.has('X-Amz-Algorithm') || url.searchParams.has('X-Tos-Algorithm')) return

  // Skip Firebase Storage URLs - Firebase handles its own caching
  if (url.hostname.includes('firebasestorage.googleapis.com')) return
  if (url.hostname.endsWith('.cloudfront.net')) return

  // Do not proxy byte-range media requests through the SW cache layer.
  if (request.headers.has('range')) return

  // Firebase auth helper endpoints must never be cached by SW.
  if (url.pathname.startsWith('/__/auth/') || url.pathname.startsWith('/__/firebase/')) {
    return
  }

  // Full-page navigations: network-first with cached shell fallback.
  // This keeps online sessions fresh while still supporting fast offline restarts.
  if (request.mode === 'navigate' || request.destination === 'document') {
    if (url.origin !== self.location.origin) return

    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone()
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone)
            })
          }
          return response
        })
        .catch(() => {
          return caches.match(request).then((cachedRoute) => {
            if (cachedRoute) return cachedRoute
            return caches.match('/index.html').then((cachedShell) => {
              if (cachedShell) return cachedShell
              return caches.match('/').then((cachedRoot) =>
                cachedRoot || new Response('Offline - app shell not cached', {
                  status: 503,
                  headers: { 'Content-Type': 'text/plain' },
                })
              )
            })
          })
        })
    )
    return
  }

  // Source maps: never cache.
  if (/\.map$/i.test(url.pathname)) return

  // Vite-hashed JS/CSS bundles: cache-first.
  // Vite embeds a content hash in every asset filename (e.g. WorkHubPage-T1lsJYFT.js),
  // so a new deploy always produces new URLs — no stale-chunk risk.
  // Without this, an installed standalone PWA re-downloads the full bundle on every launch
  // because the standalone session does not share the regular browser HTTP cache.
  if (url.pathname.startsWith('/assets/') && /\.(js|css)$/i.test(url.pathname)) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) =>
        cache.match(request).then((cached) => {
          if (cached) return cached
          return fetch(request).then((response) => {
            if (response && response.status === 200) {
              cache.put(request, response.clone())
            }
            return response
          })
        })
      )
    )
    return
  }

  // Cache strategy for images
  if (request.destination === 'image' || /\.(png|jpg|jpeg|svg|gif|webp|ico)$/i.test(url.pathname)) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then((cache) => {
        return cache.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            // Return cached image immediately
            return cachedResponse
          }

          // Fetch and cache new image
          return fetch(request).then((networkResponse) => {
            // Only cache successful responses
            if (networkResponse && networkResponse.status === 200) {
              cache.put(request, networkResponse.clone())
            }
            return networkResponse
          }).catch(() => {
            // Return a fallback if offline and not cached
            return new Response('', { status: 404, statusText: 'Image not found' })
          })
        })
      })
    )
    return
  }

  // Network-first strategy for other assets
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Cache successful responses
        if (response && response.status === 200 && request.url.startsWith(self.location.origin)) {
          const responseClone = response.clone()
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseClone)
          })
        }
        return response
      })
      .catch(() => {
        // Fallback to cache if network fails; return 503 if nothing cached
        return caches.match(request).then((cached) =>
          cached || new Response('Offline – resource not cached', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' },
          })
        )
      })
  )
})
