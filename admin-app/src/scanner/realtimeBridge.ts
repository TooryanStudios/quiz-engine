import { onAuthStateChanged, type User } from 'firebase/auth'
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import type { ScanMode } from './openai'

const SCANNER_BRIDGE_SCHEMA_VERSION = 1

export interface ScannerBridgePayload {
  schemaVersion: number
  source: 'mobile-scanner'
  eventId: string
  mode: ScanMode
  rawText: string
  answer: string
  explanation: string
  scanMs: number
  totalMs: number
  captureMs: number
  autoRotated: boolean
  ok: boolean
  error: string
  publishedAtMs: number
}

interface ScannerBridgeDocShape {
  scannerBridge?: unknown
}

function randomId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function toErrorMessage(value: unknown) {
  if (value instanceof Error) return value.message
  return typeof value === 'string' && value.trim() ? value : 'Unknown scanner sync error'
}

function toPayload(value: unknown): ScannerBridgePayload | null {
  if (!value || typeof value !== 'object') return null

  const candidate = value as Partial<ScannerBridgePayload>
  if (candidate.source !== 'mobile-scanner') return null
  if (candidate.mode !== 'simplified' && candidate.mode !== 'reasoning') return null
  if (typeof candidate.eventId !== 'string' || !candidate.eventId) return null

  return {
    schemaVersion:
      typeof candidate.schemaVersion === 'number'
        ? candidate.schemaVersion
        : SCANNER_BRIDGE_SCHEMA_VERSION,
    source: 'mobile-scanner',
    eventId: candidate.eventId,
    mode: candidate.mode,
    rawText: typeof candidate.rawText === 'string' ? candidate.rawText : '',
    answer: typeof candidate.answer === 'string' ? candidate.answer : '',
    explanation: typeof candidate.explanation === 'string' ? candidate.explanation : '',
    scanMs: typeof candidate.scanMs === 'number' ? candidate.scanMs : 0,
    totalMs: typeof candidate.totalMs === 'number' ? candidate.totalMs : 0,
    captureMs: typeof candidate.captureMs === 'number' ? candidate.captureMs : 0,
    autoRotated: candidate.autoRotated === true,
    ok: candidate.ok === true,
    error: typeof candidate.error === 'string' ? candidate.error : '',
    publishedAtMs: typeof candidate.publishedAtMs === 'number' ? candidate.publishedAtMs : 0,
  }
}

export async function publishMobileScannerResult(input: {
  mode: ScanMode
  rawText: string
  answer?: string
  explanation?: string
  captureMs: number
  scanMs: number
  totalMs: number
  autoRotated: boolean
  ok: boolean
  error?: string
}): Promise<boolean> {
  const user = auth.currentUser
  if (!user) return false

  const payload: ScannerBridgePayload = {
    schemaVersion: SCANNER_BRIDGE_SCHEMA_VERSION,
    source: 'mobile-scanner',
    eventId: randomId(),
    mode: input.mode,
    rawText: input.rawText,
    answer: input.answer ?? '',
    explanation: input.explanation ?? '',
    captureMs: input.captureMs,
    scanMs: input.scanMs,
    totalMs: input.totalMs,
    autoRotated: input.autoRotated,
    ok: input.ok,
    error: input.error ?? '',
    publishedAtMs: Date.now(),
  }

  await setDoc(
    doc(db, 'users', user.uid),
    {
      scannerBridge: payload,
      scannerBridgeUpdatedAt: serverTimestamp(),
    },
    { merge: true },
  )

  return true
}

function subscribeUserScannerBridge(
  user: User,
  onPayload: (payload: ScannerBridgePayload | null) => void,
  onError?: (error: string) => void,
) {
  return onSnapshot(
    doc(db, 'users', user.uid),
    snapshot => {
      if (!snapshot.exists()) {
        onPayload(null)
        return
      }

      const data = snapshot.data() as ScannerBridgeDocShape
      onPayload(toPayload(data.scannerBridge))
    },
    error => onError?.(toErrorMessage(error)),
  )
}

export function subscribeMobileScannerResults(
  onPayload: (payload: ScannerBridgePayload | null) => void,
  onAuthMissing?: () => void,
  onError?: (error: string) => void,
) {
  let unsubscribeDoc: (() => void) | null = null

  const unsubscribeAuth = onAuthStateChanged(
    auth,
    user => {
      if (unsubscribeDoc) {
        unsubscribeDoc()
        unsubscribeDoc = null
      }

      if (!user) {
        onPayload(null)
        onAuthMissing?.()
        return
      }

      unsubscribeDoc = subscribeUserScannerBridge(user, onPayload, onError)
    },
    error => onError?.(toErrorMessage(error)),
  )

  return () => {
    if (unsubscribeDoc) {
      unsubscribeDoc()
      unsubscribeDoc = null
    }
    unsubscribeAuth()
  }
}
