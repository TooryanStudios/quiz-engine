import { collection, doc, documentId, getDoc, getDocs, increment, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, startAfter, updateDoc, type DocumentSnapshot } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from './firebase'
import type { QuizDoc } from '../types/quiz'

export interface GameSession {
  id: string
  quizId: string
  pin: string
  playerCount: number
  startedAt: any
  hostId: string
  questionsCount: number
}

export interface PlatformStats {
  upgradeClicks: number
  aiGenerateClicks: number
  aiRecheckClicks: number
  mobileVisits: number
  desktopVisits: number
  quizCreated: number
  sessionHosted: number
  checkoutStarted: number
  voiceLabTests: number
}

export interface AuthUserRecord {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  disabled: boolean
  creationTime: string | null
  lastSignInTime: string | null
}

export interface UserProfile {
  uid: string
  email: string
  displayName: string
  photoURL: string
  status: 'active' | 'blocked' | 'deleted'
  platform: 'mobile' | 'desktop' | 'unknown'
  signInCount: number
  createdAt: any
  lastSeen: any
  statusUpdatedAt?: any
  /** True when profile was synthesised from Auth — no Firestore doc exists yet */
  _authOnly?: boolean
}

export interface PageResult<T> {
  items: T[]
  cursor: DocumentSnapshot | null
  hasMore: boolean
}

const PAGE = 25

const sessionsCol = collection(db, 'game_sessions')
const quizzesCol  = collection(db, 'quizzes')
const usersCol    = collection(db, 'users')
const statsDoc    = doc(db, 'platform_stats', 'global')

// ── Sessions ─────────────────────────────────────────────────────────────────

export function subscribeAllSessions(onData: (result: PageResult<GameSession>) => void) {
  const q = query(sessionsCol, orderBy('startedAt', 'desc'), limit(PAGE + 1))
  return onSnapshot(q, (snap) => {
    const hasMore = snap.docs.length > PAGE
    const docs = hasMore ? snap.docs.slice(0, PAGE) : snap.docs
    onData({ items: docs.map(d => ({ id: d.id, ...d.data() } as GameSession)), cursor: docs.at(-1) ?? null, hasMore })
  })
}

export async function fetchMoreSessions(cursor: DocumentSnapshot): Promise<PageResult<GameSession>> {
  const snap = await getDocs(query(sessionsCol, orderBy('startedAt', 'desc'), startAfter(cursor), limit(PAGE + 1)))
  const hasMore = snap.docs.length > PAGE
  const docs = hasMore ? snap.docs.slice(0, PAGE) : snap.docs
  return { items: docs.map(d => ({ id: d.id, ...d.data() } as GameSession)), cursor: docs.at(-1) ?? null, hasMore }
}

// ── Quizzes ───────────────────────────────────────────────────────────────────

export function subscribeAllQuizzes(onData: (result: PageResult<QuizDoc & { id: string }>) => void) {
  const q = query(quizzesCol, orderBy('createdAt', 'desc'), limit(PAGE + 1))
  return onSnapshot(q, (snap) => {
    const hasMore = snap.docs.length > PAGE
    const docs = hasMore ? snap.docs.slice(0, PAGE) : snap.docs
    onData({ items: docs.map(d => ({ id: d.id, ...d.data() } as QuizDoc & { id: string })), cursor: docs.at(-1) ?? null, hasMore })
  })
}

export async function fetchMoreQuizzes(cursor: DocumentSnapshot): Promise<PageResult<QuizDoc & { id: string }>> {
  const snap = await getDocs(query(quizzesCol, orderBy('createdAt', 'desc'), startAfter(cursor), limit(PAGE + 1)))
  const hasMore = snap.docs.length > PAGE
  const docs = hasMore ? snap.docs.slice(0, PAGE) : snap.docs
  return { items: docs.map(d => ({ id: d.id, ...d.data() } as QuizDoc & { id: string })), cursor: docs.at(-1) ?? null, hasMore }
}

// ── Users ─────────────────────────────────────────────────────────────────────
// IMPORTANT: orderBy(documentId()) is used deliberately so that users who were
// created before the `lastSeen` field existed are NOT silently excluded.
// Firestore drops documents from results when orderBy references a missing field.
// Client-side sorting by lastSeen is applied in UsersTab instead.

export function subscribeAllUsers(
  onData: (result: PageResult<UserProfile>) => void,
  onError?: (err: Error) => void
) {
  const q = query(usersCol, orderBy(documentId()), limit(PAGE + 1))
  return onSnapshot(q, (snap) => {
    const hasMore = snap.docs.length > PAGE
    const docs = hasMore ? snap.docs.slice(0, PAGE) : snap.docs
    onData({ items: docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)), cursor: docs.at(-1) ?? null, hasMore })
  }, onError)
}

export async function fetchMoreUsers(cursor: DocumentSnapshot): Promise<PageResult<UserProfile>> {
  const snap = await getDocs(query(usersCol, orderBy(documentId()), startAfter(cursor), limit(PAGE + 1)))
  const hasMore = snap.docs.length > PAGE
  const docs = hasMore ? snap.docs.slice(0, PAGE) : snap.docs
  return { items: docs.map(d => ({ uid: d.id, ...d.data() } as UserProfile)), cursor: docs.at(-1) ?? null, hasMore }
}

// ── Single user doc ───────────────────────────────────────────────────────────

export function subscribeUserDoc(uid: string, onData: (profile: UserProfile | null) => void) {
  return onSnapshot(doc(db, 'users', uid), (snap) => {
    onData(snap.exists() ? ({ uid: snap.id, ...snap.data() } as UserProfile) : null)
  })
}

export async function setUserStatus(uid: string, status: 'active' | 'blocked' | 'deleted') {
  await updateDoc(doc(db, 'users', uid), { status, statusUpdatedAt: serverTimestamp() })
}

// ── User activity recording ───────────────────────────────────────────────────

export async function recordUserActivity(uid: string, profile: {
  email: string; displayName: string; photoURL: string
  platform: 'mobile' | 'desktop'; createdAt: string
}) {
  try {
    const ref = doc(db, 'users', uid)
    const snap = await getDoc(ref)
    if (!snap.exists()) {
      await setDoc(ref, { ...profile, status: 'active', signInCount: 1, lastSeen: serverTimestamp(), createdAt: serverTimestamp() })
    } else {
      await updateDoc(ref, { email: profile.email, displayName: profile.displayName, photoURL: profile.photoURL, platform: profile.platform, signInCount: increment(1), lastSeen: serverTimestamp() })
    }
  } catch { /* non-critical */ }
}

// ── Platform stats ────────────────────────────────────────────────────────────

export function subscribePlatformStats(onData: (stats: PlatformStats) => void) {
  return onSnapshot(statsDoc, (snap) => {
    const data = snap.data() || {}
    onData({
      upgradeClicks:    data.upgradeClicks    || 0,
      aiGenerateClicks: data.aiGenerateClicks || 0,
      aiRecheckClicks:  data.aiRecheckClicks  || 0,
      mobileVisits:     data.mobileVisits     || 0,
      desktopVisits:    data.desktopVisits    || 0,
      quizCreated:      data.quizCreated      || 0,
      sessionHosted:    data.sessionHosted    || 0,
      checkoutStarted:  data.checkoutStarted  || 0,
      voiceLabTests:    data.voiceLabTests    || 0,
    })
  })
}

export async function incrementPlatformStat(field: keyof PlatformStats) {
  try {
    const snap = await getDoc(statsDoc)
    if (snap.exists()) { await updateDoc(statsDoc, { [field]: increment(1) }) }
    else { await setDoc(statsDoc, { [field]: 1 }, { merge: true }) }
  } catch { /* non-critical */ }
}

// ── Auth user listing (via Cloud Function) ────────────────────────────────────

export async function fetchAuthUsers(): Promise<AuthUserRecord[]> {
  const fn = httpsCallable<undefined, { users: AuthUserRecord[] }>(functions, 'listAuthUsers')
  const result = await fn()
  return result.data.users
}

/**
 * Grants the admin custom claim to the currently signed-in user (server verifies
 * the email). Call on sign-in, then force a token refresh with user.getIdToken(true)
 * so Firestore rules see the new claim.
 */
export async function grantAdminClaim(): Promise<void> {
  const fn = httpsCallable<undefined, { message: string }>(functions, 'grantAdminClaim')
  await fn()
}




