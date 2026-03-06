import { collection, doc, documentId, getCountFromServer, getDoc, getDocs, increment, limit, onSnapshot, orderBy, query, serverTimestamp, setDoc, startAfter, updateDoc, type DocumentSnapshot } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from './firebase'
import type { QuizDoc } from '../types/quiz'
import {
  DEFAULT_ENABLED_QUESTION_TYPE_IDS,
  normalizeEnabledQuestionTypeIds,
  normalizeQuestionTypeAccessByType,
  normalizeQuestionTypeTitles,
  QUESTION_TYPE_DEFAULT_ACCESS_BY_TYPE,
  QUESTION_TYPE_DEFAULT_TITLES,
  type QuestionTypeAccessTier,
  type QuestionTypeId,
} from '../config/questionTypes'
import {
  DEFAULT_ENABLED_MINI_GAME_IDS,
  normalizeEnabledMiniGameIds,
  normalizeMiniGameAccessById,
  normalizeMiniGameArabicNames,
  normalizeMiniGameEnglishNames,
  MINI_GAME_DEFAULT_ACCESS_BY_ID,
  MINI_GAME_DEFAULT_ARABIC_NAMES,
  MINI_GAME_DEFAULT_ENGLISH_NAMES,
  type MiniGameAccessTier,
  type MiniGameId,
} from '../config/miniGames'

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

export interface QuestionTypeSettings {
  enabledQuestionTypeIds: QuestionTypeId[]
  titlesByType: Record<QuestionTypeId, string>
  accessByType: Record<QuestionTypeId, QuestionTypeAccessTier>
  updatedAt?: any
  updatedBy?: string
}

export interface MiniGameSettings {
  enabledMiniGameIds: MiniGameId[]
  englishNamesById: Record<MiniGameId, string>
  arabicNamesById: Record<MiniGameId, string>
  accessById: Record<MiniGameId, MiniGameAccessTier>
  updatedAt?: any
  updatedBy?: string
}

export interface ThemePaletteTokens {
  // ── Core palette ─────────────────────────────────────
  bg: string
  surface: string
  surface2: string
  accent: string
  text: string
  textDim: string
  success: string
  // ── Extended state colors ─────────────────────────────
  danger?: string        // destructive / wrong-answer highlight
  warning?: string       // timer-low / warning state
  // ── Button overrides ─────────────────────────────────
  submitBg?: string      // Submit / confirm button background
  submitText?: string    // Submit button label color
  pauseBg?: string       // Pause button background
  pauseText?: string     // Pause button label color
  dangerBg?: string      // End-Game / cancel button background
  dangerText?: string    // End-Game button label color
  // ── Typography ───────────────────────────────────────
  headingFont?: string   // e.g. 'Tajawal', 'Fredoka One'
  bodyFont?: string
  // ── Background pattern ───────────────────────────────
  bgPattern?: string     // 'none'|'dots'|'grid'|'stripes'|'dunes'|'custom'
  bgPatternColor?: string
  bgPatternOpacity?: number  // 0–1
  bgImageUrl?: string
  // ── Shape / geometry (free-form CSS values) ──────────
  cardRadius?: string    // e.g. '12px'
  btnRadius?: string
  submitRadius?: string
  timerRadius?: string   // '50%' = circle
}

export interface ThemePackRecord {
  id: string
  name: string
  enabled: boolean
  tokens: ThemePaletteTokens
}

// ── Shared Built-in palettes ─────────────────────────────────────────────────
export const THEME_PRESETS: { key: string; label: string; tokens: ThemePaletteTokens }[] = [
  {
    key: 'default-dark',
    label: '🌑 Default Dark',
    tokens: { bg: '#1a1a2e', surface: '#16213e', surface2: '#0f3460', accent: '#e94560', text: '#eaeaea', textDim: '#8892a4', success: '#2dd4bf' },
  },
  {
    key: 'default-light',
    label: '☀️ Default Light',
    tokens: { bg: '#f1f5f9', surface: '#ffffff', surface2: '#e2e8f0', accent: '#e94560', text: '#0f172a', textDim: '#475569', success: '#0d9488' },
  },
  {
    key: 'warm-sand',
    label: '🏜️ Warm Sand',
    tokens: {
      bg: '#e8c98a', surface: '#fef6e4', surface2: '#c9a96e',
      accent: '#9b6ecf',
      text: '#2d1b0e', textDim: '#7a5230',
      success: '#2d6a4f',
      danger: '#c0392b', warning: '#e67e22',
      submitBg: '#c0392b', submitText: '#ffffff',
      pauseBg: '#2d6a4f', pauseText: '#ffffff',
      dangerBg: '#a83232', dangerText: '#ffffff',
      headingFont: 'Tajawal', bodyFont: 'Tajawal',
      bgPattern: 'dunes', bgPatternColor: '#c9a96e', bgPatternOpacity: 0.3,
      cardRadius: '12px', btnRadius: '10px', submitRadius: '14px', timerRadius: '50%',
    },
  },
  {
    key: 'ocean',
    label: '🌊 Ocean',
    tokens: { bg: '#0a2342', surface: '#123560', surface2: '#1a4a7a', accent: '#00b4d8', text: '#e0f4ff', textDim: '#7ec8e3', success: '#06d6a0' },
  },
  {
    key: 'forest',
    label: '🌿 Forest',
    tokens: { bg: '#0d2614', surface: '#132e1a', surface2: '#1e4a28', accent: '#52b788', text: '#d8f3dc', textDim: '#74c69d', success: '#f4a261' },
  },
]

export interface ThemeEditorSettings {
  themes: ThemePackRecord[]
  updatedAt?: any
  updatedBy?: string
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
  /** User preferences — persisted to Firestore */
  language?: 'ar' | 'en'
  theme?: 'dark' | 'light'
  /** Gameplay identity (shown in-game, independent of Firebase Auth display name) */
  gameDisplayName?: string
  gameAvatar?: string
  /** Editor slide panel layout preference */
  slidePanelLayout?: 'left' | 'bottom'
  /** Cumulative gameplay points earned */
  points?: number
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
const questionTypeSettingsDoc = doc(db, 'platform_settings', 'question_types')
const miniGameSettingsDoc = doc(db, 'platform_settings', 'mini_games')
const themeSettingsDoc = doc(db, 'platform_settings', 'themes')

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

/** Save user preference + gameplay identity fields to Firestore. */
export async function saveUserPrefs(
  uid: string,
  prefs: Partial<Pick<UserProfile, 'language' | 'theme' | 'gameDisplayName' | 'gameAvatar' | 'slidePanelLayout'>>
): Promise<void> {
  await setDoc(doc(db, 'users', uid), prefs, { merge: true })
}

/** One-shot load of user preference fields on login. Returns null when no doc exists yet. */
export async function loadUserPrefs(
  uid: string
): Promise<Pick<UserProfile, 'language' | 'theme' | 'gameDisplayName' | 'gameAvatar' | 'slidePanelLayout'> | null> {
  try {
    const snap = await getDoc(doc(db, 'users', uid))
    if (!snap.exists()) return null
    const d = snap.data()
    return {
      language: d.language ?? undefined,
      theme: d.theme ?? undefined,
      gameDisplayName: d.gameDisplayName ?? undefined,
      gameAvatar: d.gameAvatar ?? undefined,
      slidePanelLayout: d.slidePanelLayout ?? undefined,
    }
  } catch { return null }
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
    // setDoc with merge creates-or-updates in one round trip — no read needed.
    await setDoc(statsDoc, { [field]: increment(1) }, { merge: true })
  } catch { /* non-critical */ }
}

// ── Question type settings (master-admin controlled) ─────────────────────────

export function subscribeQuestionTypeSettings(onData: (settings: QuestionTypeSettings) => void) {
  return onSnapshot(questionTypeSettingsDoc, (snap) => {
    const data = snap.data() || {}
    const storedTitles = data.titlesByType ?? data.englishNamesByType
    onData({
      enabledQuestionTypeIds: normalizeEnabledQuestionTypeIds(data.enabledQuestionTypeIds),
      titlesByType: normalizeQuestionTypeTitles(storedTitles),
      accessByType: normalizeQuestionTypeAccessByType(data.accessByType),
      updatedAt: data.updatedAt,
      updatedBy: data.updatedBy,
    })
  }, () => {
    onData({
      enabledQuestionTypeIds: [...DEFAULT_ENABLED_QUESTION_TYPE_IDS],
      titlesByType: { ...QUESTION_TYPE_DEFAULT_TITLES },
      accessByType: { ...QUESTION_TYPE_DEFAULT_ACCESS_BY_TYPE },
    })
  })
}

export async function updateQuestionTypeSettings(
  enabledQuestionTypeIds: unknown,
  titlesByType: unknown,
  accessByType: unknown,
  updatedBy?: string,
) {
  const normalized = normalizeEnabledQuestionTypeIds(enabledQuestionTypeIds)
  const normalizedTitles = normalizeQuestionTypeTitles(titlesByType)
  const normalizedAccess = normalizeQuestionTypeAccessByType(accessByType)
  await setDoc(questionTypeSettingsDoc, {
    enabledQuestionTypeIds: normalized,
    titlesByType: normalizedTitles,
    accessByType: normalizedAccess,
    updatedAt: serverTimestamp(),
    ...(updatedBy ? { updatedBy } : {}),
  }, { merge: true })
}

// ── Mini game settings (master-admin controlled) ────────────────────────────

export function subscribeMiniGameSettings(onData: (settings: MiniGameSettings) => void) {
  return onSnapshot(miniGameSettingsDoc, (snap) => {
    const data = snap.data() || {}
    onData({
      enabledMiniGameIds: normalizeEnabledMiniGameIds(data.enabledMiniGameIds),
      englishNamesById: normalizeMiniGameEnglishNames(data.englishNamesById),
      arabicNamesById: normalizeMiniGameArabicNames(data.arabicNamesById),
      accessById: normalizeMiniGameAccessById(data.accessById),
      updatedAt: data.updatedAt,
      updatedBy: data.updatedBy,
    })
  }, () => {
    onData({
      enabledMiniGameIds: [...DEFAULT_ENABLED_MINI_GAME_IDS],
      englishNamesById: { ...MINI_GAME_DEFAULT_ENGLISH_NAMES },
      arabicNamesById: { ...MINI_GAME_DEFAULT_ARABIC_NAMES },
      accessById: { ...MINI_GAME_DEFAULT_ACCESS_BY_ID },
    })
  })
}

export async function updateMiniGameSettings(
  enabledMiniGameIds: unknown,
  englishNamesById: unknown,
  arabicNamesById: unknown,
  accessById: unknown,
  updatedBy?: string,
) {
  const normalizedEnabled = normalizeEnabledMiniGameIds(enabledMiniGameIds)
  const normalizedEnglish = normalizeMiniGameEnglishNames(englishNamesById)
  const normalizedArabic = normalizeMiniGameArabicNames(arabicNamesById)
  const normalizedAccess = normalizeMiniGameAccessById(accessById)

  await setDoc(miniGameSettingsDoc, {
    enabledMiniGameIds: normalizedEnabled,
    englishNamesById: normalizedEnglish,
    arabicNamesById: normalizedArabic,
    accessById: normalizedAccess,
    updatedAt: serverTimestamp(),
    ...(updatedBy ? { updatedBy } : {}),
  }, { merge: true })
}

// ── Theme editor settings (master-admin controlled) ────────────────────────

const DEFAULT_THEME_TOKENS: ThemePaletteTokens = {
  bg: '#1a1a2e',
  surface: '#16213e',
  surface2: '#0f3460',
  accent: '#e94560',
  text: '#eaeaea',
  textDim: '#8892a4',
  success: '#2dd4bf',
}

const DEFAULT_THEME_SETTINGS: ThemeEditorSettings = {
  themes: [
    {
      id: 'dark',
      name: 'Default Dark',
      enabled: true,
      tokens: { ...DEFAULT_THEME_TOKENS },
    },
    {
      id: 'light',
      name: 'Default Light',
      enabled: true,
      tokens: {
        bg: '#f1f5f9',
        surface: '#ffffff',
        surface2: '#e2e8f0',
        accent: '#e94560',
        text: '#0f172a',
        textDim: '#475569',
        success: '#0d9488',
      },
    },
    {
      id: 'warm-sand',
      name: 'Warm Sand',
      enabled: true,
      tokens: {
        bg: '#e8c98a', surface: '#fef6e4', surface2: '#c9a96e',
        accent: '#9b6ecf',
        text: '#2d1b0e', textDim: '#7a5230',
        success: '#2d6a4f',
        danger: '#c0392b', warning: '#e67e22',
        submitBg: '#c0392b', submitText: '#ffffff',
        pauseBg: '#2d6a4f', pauseText: '#ffffff',
        dangerBg: '#a83232', dangerText: '#ffffff',
        headingFont: 'Tajawal', bodyFont: 'Tajawal',
        bgPattern: 'dunes', bgPatternColor: '#c9a96e', bgPatternOpacity: 0.3,
        cardRadius: '12px', btnRadius: '10px', submitRadius: '14px', timerRadius: '50%',
      },
    },
  ],
}

function normalizeHex(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback
  const trimmed = value.trim()
  return /^#[0-9a-fA-F]{6}$/.test(trimmed) ? trimmed : fallback
}

function normalizeOptStr(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function normalizeOpacity(value: unknown): number | undefined {
  if (typeof value === 'number' && value >= 0 && value <= 1) return value
  if (typeof value === 'string') {
    const n = parseFloat(value)
    if (!isNaN(n) && n >= 0 && n <= 1) return n
  }
  return undefined
}

function normalizeThemeTokens(raw: unknown): ThemePaletteTokens {
  const source = raw && typeof raw === 'object' ? raw as Partial<ThemePaletteTokens> : {}
  const base: ThemePaletteTokens = {
    bg: normalizeHex(source.bg, DEFAULT_THEME_TOKENS.bg),
    surface: normalizeHex(source.surface, DEFAULT_THEME_TOKENS.surface),
    surface2: normalizeHex(source.surface2, DEFAULT_THEME_TOKENS.surface2),
    accent: normalizeHex(source.accent, DEFAULT_THEME_TOKENS.accent),
    text: normalizeHex(source.text, DEFAULT_THEME_TOKENS.text),
    textDim: normalizeHex(source.textDim, DEFAULT_THEME_TOKENS.textDim),
    success: normalizeHex(source.success, DEFAULT_THEME_TOKENS.success),
  }
  // Extended optional fields
  const optHex = (v: unknown) => { const h = normalizeHex(v, ''); return h || undefined }
  if (source.danger !== undefined)        base.danger        = optHex(source.danger)
  if (source.warning !== undefined)       base.warning       = optHex(source.warning)
  if (source.submitBg !== undefined)      base.submitBg      = optHex(source.submitBg)
  if (source.submitText !== undefined)    base.submitText    = optHex(source.submitText)
  if (source.pauseBg !== undefined)       base.pauseBg       = optHex(source.pauseBg)
  if (source.pauseText !== undefined)     base.pauseText     = optHex(source.pauseText)
  if (source.dangerBg !== undefined)      base.dangerBg      = optHex(source.dangerBg)
  if (source.dangerText !== undefined)    base.dangerText    = optHex(source.dangerText)
  if (source.headingFont !== undefined)   base.headingFont   = normalizeOptStr(source.headingFont)
  if (source.bodyFont !== undefined)      base.bodyFont      = normalizeOptStr(source.bodyFont)
  if (source.bgPattern !== undefined)     base.bgPattern     = normalizeOptStr(source.bgPattern)
  if (source.bgPatternColor !== undefined) base.bgPatternColor = optHex(source.bgPatternColor)
  if (source.bgPatternOpacity !== undefined) base.bgPatternOpacity = normalizeOpacity(source.bgPatternOpacity)
  if (source.bgImageUrl !== undefined)    base.bgImageUrl    = normalizeOptStr(source.bgImageUrl)
  if (source.cardRadius !== undefined)    base.cardRadius    = normalizeOptStr(source.cardRadius)
  if (source.btnRadius !== undefined)     base.btnRadius     = normalizeOptStr(source.btnRadius)
  if (source.submitRadius !== undefined)  base.submitRadius  = normalizeOptStr(source.submitRadius)
  if (source.timerRadius !== undefined)   base.timerRadius   = normalizeOptStr(source.timerRadius)
  return base
}

function sanitizeThemeId(value: unknown, fallback: string): string {
  if (typeof value !== 'string') return fallback
  const id = value.trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-')
  return id || fallback
}

function normalizeThemePacks(raw: unknown): ThemePackRecord[] {
  const input = Array.isArray(raw) ? raw : DEFAULT_THEME_SETTINGS.themes
  const seen = new Set<string>()
  const normalized: ThemePackRecord[] = []

  input.forEach((item, index) => {
    if (!item || typeof item !== 'object') return
    const source = item as Partial<ThemePackRecord>
    const id = sanitizeThemeId(source.id, `theme-${index + 1}`)
    if (!id || seen.has(id)) return
    seen.add(id)

    normalized.push({
      id,
      name: typeof source.name === 'string' && source.name.trim() ? source.name.trim() : id,
      enabled: source.enabled !== false,
      tokens: normalizeThemeTokens(source.tokens),
    })
  })

  if (!normalized.length) return [...DEFAULT_THEME_SETTINGS.themes]
  if (!normalized.some((t) => t.enabled)) normalized[0] = { ...normalized[0], enabled: true }
  return normalized
}

export function subscribeThemeEditorSettings(onData: (settings: ThemeEditorSettings) => void) {
  return onSnapshot(themeSettingsDoc, (snap) => {
    const data = snap.data() || {}
    onData({
      themes: normalizeThemePacks(data.themes),
      updatedAt: data.updatedAt,
      updatedBy: data.updatedBy,
    })
  }, () => {
    onData({ ...DEFAULT_THEME_SETTINGS })
  })
}

export async function updateThemeEditorSettings(themes: unknown, updatedBy?: string) {
  const normalizedThemes = normalizeThemePacks(themes)
  await setDoc(themeSettingsDoc, {
    themes: normalizedThemes,
    updatedAt: serverTimestamp(),
    ...(updatedBy ? { updatedBy } : {}),
  }, { merge: true })
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

// ── Total users count ─────────────────────────────────────────────────────────

export async function getTotalUsersCount(): Promise<number> {
  try {
    const snap = await getCountFromServer(query(usersCol))
    return snap.data().count
  } catch {
    // Fallback: getDocs count (less efficient but works with older rules)
    const snap = await getDocs(query(usersCol, limit(10000)))
    return snap.size
  }
}

// ── Quiz approval workflow ─────────────────────────────────────────────────────

export async function approveQuiz(id: string): Promise<void> {
  await updateDoc(doc(db, 'quizzes', id), {
    visibility: 'public',
    approvalStatus: 'approved',
  })
}

export async function rejectQuiz(id: string): Promise<void> {
  await updateDoc(doc(db, 'quizzes', id), {
    visibility: 'private',
    approvalStatus: 'rejected',
  })
}
