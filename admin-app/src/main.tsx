import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { BrowserRouter } from 'react-router-dom'
import App from './App.tsx'

const CHUNK_RELOAD_KEY = 'quiz-admin:chunk-reload-once'

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

  // Hotfix: aggressively clear legacy service-worker caches to avoid
  // stale chunk/runtime mismatches on /play routes after deploys.
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations()
      .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
      .then(() => {
        if ('caches' in window) {
          return caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
        }
        return Promise.resolve([])
      })
      .then(() => {
        console.log('[SW] Legacy registrations and caches cleared')
      })
      .catch((error) => {
        console.warn('[SW] Cleanup failed:', error)
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
