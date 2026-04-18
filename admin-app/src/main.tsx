import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'

const CHUNK_RELOAD_KEY = 'quiz-admin:chunk-reload-once'
const DEV_SW_RESET_RELOAD_KEY = 'quiz-admin:dev-sw-reset-reload-once'

function shouldRecoverChunkError(reason: unknown): boolean {
  const text = typeof reason === 'string'
    ? reason
    : reason instanceof Error
      ? reason.message
      : ''
  return /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk/i.test(text)
}

function recoverFromChunkLoadError() {
  if (sessionStorage.getItem(CHUNK_RELOAD_KEY) === '1') return
  sessionStorage.setItem(CHUNK_RELOAD_KEY, '1')
  window.location.reload()
}

window.addEventListener('unhandledrejection', (event) => {
  if (shouldRecoverChunkError(event.reason)) recoverFromChunkLoadError()
})

window.addEventListener('load', () => {
  sessionStorage.removeItem(CHUNK_RELOAD_KEY)

  const isDev = import.meta.env.DEV
  const isLocalhost = window.location.hostname === 'localhost'
    || window.location.hostname === '127.0.0.1'
    || window.location.hostname === '[::1]'

  // Service workers in dev can cache stale modules and cause UI/runtime drift.
  if ((isDev || isLocalhost) && 'serviceWorker' in navigator) {
    void navigator.serviceWorker.getRegistrations().then((registrations) => {
      void Promise.all(registrations.map((registration) => registration.unregister())).then(async () => {
        if ('caches' in window) {
          const cacheNames = await caches.keys()
          await Promise.all(
            cacheNames
              .filter((name) => name.startsWith('qyan'))
              .map((name) => caches.delete(name))
          )
        }

        // If this page is currently controlled by a SW, reload once to fully detach.
        if (navigator.serviceWorker.controller && sessionStorage.getItem(DEV_SW_RESET_RELOAD_KEY) !== '1') {
          sessionStorage.setItem(DEV_SW_RESET_RELOAD_KEY, '1')
          window.location.reload()
        }
      })
    })
    return
  }

  sessionStorage.removeItem(DEV_SW_RESET_RELOAD_KEY)

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then((reg) => {
        console.log('[SW] Registered, scope:', reg.scope)
      })
      .catch((err) => {
        console.warn('[SW] Registration failed:', err)
      })
  }
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
