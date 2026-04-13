import { initializeApp } from 'firebase/app'
import { browserLocalPersistence, getAuth, GoogleAuthProvider, setPersistence } from 'firebase/auth'
import { initializeFirestore, memoryLocalCache, persistentLocalCache, persistentSingleTabManager } from 'firebase/firestore'
import { getFunctions } from 'firebase/functions'
import { getStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  // Always use the env-configured auth domain (should be qyan-om.firebaseapp.com).
  // DO NOT override with window.location.hostname — this was found to cause an infinite
  // sign-in loop in PWA/standalone mode on iOS because the standalone WKWebView has
  // isolated localStorage from Safari, so redirect auth state set in Safari is never
  // visible to the PWA session. Popup-based auth uses postMessage and works correctly.
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const authReady = setPersistence(auth, browserLocalPersistence).catch(() => undefined)
const enablePersistentFirestore = import.meta.env.VITE_FIRESTORE_PERSISTENCE === '1'

export const db = initializeFirestore(app, {
  // Default to memory cache to avoid IndexedDB/tab-sync assertion loops in development.
  // Set VITE_FIRESTORE_PERSISTENCE=1 to opt into persistent cache.
  localCache: enablePersistentFirestore
    ? persistentLocalCache({ tabManager: persistentSingleTabManager(undefined) })
    : memoryLocalCache(),
})
export const storage = getStorage(app)
export const functions = getFunctions(app)
export const googleProvider = new GoogleAuthProvider()
