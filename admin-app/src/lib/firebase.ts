import { initializeApp } from 'firebase/app'
import {
  browserLocalPersistence,
  browserSessionPersistence,
  getAuth,
  GoogleAuthProvider,
  inMemoryPersistence,
  setPersistence,
} from 'firebase/auth'
import { initializeFirestore, memoryLocalCache, persistentLocalCache, persistentSingleTabManager } from 'firebase/firestore'
import { getFunctions } from 'firebase/functions'
import { getStorage } from 'firebase/storage'

function normalizeAuthDomain(value: unknown): string {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (!trimmed) return ''
  return trimmed.replace(/^https?:\/\//i, '').replace(/\/$/, '')
}

const projectId = String(import.meta.env.VITE_FIREBASE_PROJECT_ID || '').trim()
const configuredAuthDomain = normalizeAuthDomain(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN)
const fallbackAuthDomain = projectId ? `${projectId}.firebaseapp.com` : ''
const resolvedAuthDomain = configuredAuthDomain || fallbackAuthDomain

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  // Always use the env-configured auth domain (should be qyan-om.firebaseapp.com).
  // DO NOT override with window.location.hostname — this was found to cause an infinite
  // sign-in loop in PWA/standalone mode on iOS because the standalone WKWebView has
  // isolated localStorage from Safari, so redirect auth state set in Safari is never
  // visible to the PWA session. Popup-based auth uses postMessage and works correctly.
  authDomain: resolvedAuthDomain,
  projectId,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export type AuthPersistenceMode = 'local' | 'session' | 'memory'
let authPersistenceMode: AuthPersistenceMode = 'memory'

export function getAuthPersistenceMode(): AuthPersistenceMode {
  return authPersistenceMode
}

export const authReady = (async () => {
  try {
    await setPersistence(auth, browserLocalPersistence)
    authPersistenceMode = 'local'
    return
  } catch {
    // Fall through to session persistence.
  }

  try {
    await setPersistence(auth, browserSessionPersistence)
    authPersistenceMode = 'session'
    return
  } catch {
    // Fall through to in-memory persistence.
  }

  await setPersistence(auth, inMemoryPersistence)
  authPersistenceMode = 'memory'
})().catch(() => undefined)
const firestorePersistenceSetting = import.meta.env.VITE_FIRESTORE_PERSISTENCE
const isLocalhost = typeof window !== 'undefined' && ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname)
const enablePersistentFirestore = firestorePersistenceSetting === '1'
  ? true
  : firestorePersistenceSetting === '0'
    ? false
    : !import.meta.env.DEV && !isLocalhost

export const db = initializeFirestore(app, {
  // Production defaults to persistent cache for faster startup and better revisit performance.
  // In local/dev, default to memory cache to avoid IndexedDB/tab-sync assertion loops.
  // Optional override: VITE_FIRESTORE_PERSISTENCE=1 (force on) or =0 (force off).
  localCache: enablePersistentFirestore
    ? persistentLocalCache({ tabManager: persistentSingleTabManager(undefined) })
    : memoryLocalCache(),
})
export const storage = getStorage(app)
export const functions = getFunctions(app)
export const googleProvider = new GoogleAuthProvider()
googleProvider.setCustomParameters({
  prompt: 'select_account',
})
