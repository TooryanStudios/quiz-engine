import { onAuthStateChanged, signOut } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { markSignOut } from './lib/signOutState'
import type { ComponentType, ReactElement, ReactNode } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import './App.css'
import { auth } from './lib/firebase'
import { reportError } from './lib/errorReporting'
import { ErrorBoundary } from './components/ErrorBoundary'
import { FeatureErrorBoundary } from './components/FeatureErrorBoundary'
import { incrementPlatformStat, loadUserPrefs, recordUserActivity, subscribeUserDoc, grantAdminClaim } from './lib/adminRepo'
import { UserPrefsContext } from './lib/UserPrefsContext'
import { DialogProvider } from './lib/DialogContext'
import { ToastProvider } from './lib/ToastContext'
import { Dialog } from './components/Dialog'
import { VFXContainer } from './components/VFXContainer'
import { LoginPage } from './pages/LoginPage'
import logoImg from './assets/QYan_logo_300x164.jpg'
import { communicationFeatureFlags } from './features/communication/config'
import { InAppNotificationCenter } from './features/communication/components/InAppNotificationCenter'
import { ChatDock } from './features/communication/components/ChatDock'
import { useChatDockState } from './features/communication/hooks/useChatDockState'
import { buildThreadId, THREAD_EVERYONE } from './features/communication/hooks/useGlobalTeamChat'
import { CHAT_DOCK_OPEN_EVENT, type ChatDockOpenDetail } from './features/communication/utils/chatDockEvents'

function RouteLoadFailure({ routeLabel }: { routeLabel: string }) {
  return (
    <div style={{ padding: '1rem', color: 'var(--text-mid)' }}>
      Could not load {routeLabel}. Please refresh the page.
    </div>
  )
}

function withRouteBoundary(routeName: string, node: ReactNode) {
  return (
    <FeatureErrorBoundary name={routeName} variant="route">
      {node}
    </FeatureErrorBoundary>
  )
}

// Dev pressure-test helper:
// add ?qyanEnableCrash=1&qyanCrash=<boundaryName> (or comma-separated names, or "all")
// Example: ?qyanEnableCrash=1&qyanCrash=workhub,ChatDock

function createLazyRoute(
  routeLabel: string,
  loader: () => Promise<Record<string, unknown>>,
  exportName?: string,
) {
  return lazy(async () => {
    try {
      const mod = await loader()
      const defaultExport = mod?.default
      const explicitNamedExport = exportName ? mod?.[exportName] : undefined
      const implicitNamedExport = mod?.[routeLabel]
      const resolved = explicitNamedExport || defaultExport || implicitNamedExport
      if (!resolved) {
        const availableKeys = Object.keys(mod || {}).join(', ')
        throw new Error(`Missing export for route: ${routeLabel}. Available exports: ${availableKeys || '(none)'}`)
      }
      return { default: resolved as ComponentType }
    } catch (error) {
      console.error(`Route lazy load failed: ${routeLabel}`, error)
      return { default: () => <RouteLoadFailure routeLabel={routeLabel} /> }
    }
  })
}

const BillingPage     = createLazyRoute('BillingPage', () => import('./pages/BillingPage'), 'BillingPage')
const DashboardPage   = createLazyRoute('DashboardPage', () => import('./pages/DashboardPage'), 'DashboardPage')
const PacksPage       = createLazyRoute('PacksPage', () => import('./pages/PacksPage'), 'PacksPage')
const MyQuizzesPage   = createLazyRoute('MyQuizzesPage', () => import('./pages/MyQuizzesPage'), 'MyQuizzesPage')
const WorkHubRoutePage = createLazyRoute('WorkHubPage', () => import('./pages/WorkHubPage'))
const MessagesPage    = createLazyRoute('MessagesPage', () => import('./features/communication/pages/MessagesPage'), 'MessagesPage')
const AdHocTasksPage  = createLazyRoute('AdHocTasksPage', () => import('./features/workhubAdhoc/pages/AdHocTasksPage'), 'AdHocTasksPage')
const ProfilePage     = createLazyRoute('ProfilePage', () => import('./pages/ProfilePage'), 'ProfilePage')
const QuizEditorPage  = createLazyRoute('QuizEditorPage', () => import('./pages/QuizEditorPage'), 'QuizEditorPage')
const QuizPreviewPage = createLazyRoute('QuizPreviewPage', () => import('./pages/QuizPreviewPage'), 'QuizPreviewPage')
const GameModesPage   = createLazyRoute('GameModesPage', () => import('./pages/GameModesPage'), 'GameModesPage')
const MasterAdminPage = createLazyRoute('MasterAdminPage', () => import('./pages/MasterAdminPage'), 'MasterAdminPage')
const VoiceLabPage    = createLazyRoute('VoiceLabPage', () => import('./pages/VoiceLabPage'), 'VoiceLabPage')
const AILabPage       = createLazyRoute('AILabPage', () => import('./pages/AILabPage'))
const CoverGenLabPage = createLazyRoute('CoverGenLabPage', () => import('./pages/CoverGenLabPage'))
const ToorGenPage = createLazyRoute('ToorGenPage', () => import('./pages/ToorGenPage'))
const PlayTestPage    = createLazyRoute('PlayTestPage', () => import('./pages/PlayTestPage'))
const GameEmbedPage   = createLazyRoute('GameEmbedPage', () => import('./pages/GameEmbedPage'))
const ScannerPage     = createLazyRoute('ScannerPage', () => import('./scanner/ScannerPage'), 'ScannerPage')
const ScannerDesktopPage = createLazyRoute('ScannerDesktopPage', () => import('./scanner/ScannerDesktopPage'), 'ScannerDesktopPage')

const MASTER_EMAIL = import.meta.env.VITE_MASTER_EMAIL as string | undefined
const MASTER_PATH  = import.meta.env.VITE_MASTER_PATH  as string | undefined

if (!MASTER_EMAIL || !MASTER_PATH) {
  console.error('[config] VITE_MASTER_EMAIL or VITE_MASTER_PATH is not set. Admin features will be disabled.')
}

type NavItem = {
  to: string
  icon: string
  label: string
  end?: boolean
}

function getNav(isAr: boolean) {
  const nav: NavItem[] = [
    { to: '/dashboard',        icon: '🏠', label: isAr ? 'الرئيسية' : 'Dashboard', end: true },
    { to: '/editor',           icon: '✏️',  label: isAr ? 'محرر الأسئلة' : 'Challenge Editor' },
    { to: '/mini-game-editor', icon: '🎮', label: isAr ? 'محرر الألعاب' : 'Game Editor' },
    { to: '/my-quizzes',       icon: '📚', label: isAr ? 'اختباراتي' : 'My Challenges' },
    { to: '/packs',            icon: '📦', label: isAr ? 'المكتبة' : 'Library' },
    { to: '/workhub',         icon: '🗂️', label: isAr ? 'وورك هَب' : 'WorkHub' },
    { to: '/toorgen',          icon: '🎬', label: isAr ? 'تورجن' : 'ToorGen' },
    ...(communicationFeatureFlags.messagesPage ? [{ to: '/messages', icon: '💬', label: isAr ? 'الرسائل' : 'Messages' }] : []),
    ...(communicationFeatureFlags.adHocTasksPage ? [{ to: '/ops-tasks', icon: '🧾', label: isAr ? 'مهام التشغيل' : 'Ops Tasks' }] : []),
    { to: '/billing',          icon: '💳', label: isAr ? 'الاشتراك' : 'Billing' },
    { to: '/profile',          icon: '👤', label: isAr ? 'الملف الشخصي' : 'Profile' },
  ]
  return nav
}

function resolveNavTarget(to: string) {
  if (typeof window === 'undefined') return to
  if (to === '/editor') return sessionStorage.getItem('lastEditorPath') || to
  if (to === '/mini-game-editor') return sessionStorage.getItem('lastMiniGameEditorPath') || to
  return to
}

function RequireAuth({
  user,
  children,
  loadingFallback,
}: {
  user: User | null | undefined
  children: ReactElement
  loadingFallback?: ReactElement
}) {
  if (user === undefined) {
    return loadingFallback || (
      <div className="app-loading-screen">
        <div className="app-loading-spinner" />
      </div>
    )
  }
  if (!user) return <Navigate to="/dashboard" replace />
  return children
}

function RequireAdmin({ user, children }: { user: User | null; children: ReactElement }) {
  if (!user) return <Navigate to="/login" replace />
  if (!MASTER_EMAIL || user.email !== MASTER_EMAIL) return <Navigate to="/dashboard" replace />
  return children
}

function AppLoadingScreen({
  variant = 'default',
  note,
}: {
  variant?: 'default' | 'workhub'
  note?: string
}) {
  if (variant === 'workhub') {
    return (
      <div className="app-loading-screen is-workhub">
        <div className="app-loading-workhub-badge" aria-hidden="true">W</div>
        <div className="app-loading-workhub-copy">
          <strong>WorkHub</strong>
          {note && <span>{note}</span>}
        </div>
        <div className="app-loading-spinner app-loading-spinner-workhub" />
      </div>
    )
  }

  return (
    <div className="app-loading-screen">
      <img src={logoImg} alt="QYan" className="app-loading-logo" />
      <div className="app-loading-spinner" />
      {note ? <p className="app-loading-note">{note}</p> : null}
    </div>
  )
}

function App() {
  const redirectPendingKey = 'qyan:authRedirectPending'
  const [user, setUser] = useState<User | null | undefined>(() => {
    if (typeof window === 'undefined') return undefined

    const hasSessionHint = localStorage.getItem('qyan:session') === '1'
    const redirectStartedAt = Number(localStorage.getItem(redirectPendingKey) || '0')
    const redirectStillPending = redirectStartedAt > 0 && Date.now() - redirectStartedAt < 60000

    return (hasSessionHint || redirectStillPending) ? undefined : null
  })
  const navigate = useNavigate()
  const location = useLocation()
  const isLocalDevHost = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)
  const isLocalPlayTestPath = location.pathname === '/play-test' || location.pathname.startsWith('/play-test/')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [burgerOpen, setBurgerOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)
  const [mobileHeaderCompact, setMobileHeaderCompact] = useState(false)
  const [isMobileLayout, setIsMobileLayout] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(max-width: 768px)').matches
  })
  const [theme, setTheme] = useState<'dark' | 'light'>(
    () => 'light'
  )
  const [language, setLanguage] = useState<'ar' | 'en'>(
    () => 'ar'
  )
  const isAr = language === 'ar'
  const [slidePanelLayout, setSlidePanelLayout] = useState<'left' | 'bottom'>(
    () => (localStorage.getItem('qyan:slidePanelLayout') as 'left' | 'bottom') || 'bottom'
  )
  const [slidePanelEnabled, setSlidePanelEnabled] = useState<boolean>(() => {
    const stored = localStorage.getItem('qyan:slidePanelEnabled')
    if (stored === null) return false
    return stored !== 'false'
  })
  const {
    open: chatDockOpen,
    toggle: toggleChatDock,
    close: closeChatDock,
    openDock: openChatDock,
  } = useChatDockState({
    enabled: communicationFeatureFlags.chatDock,
  })
  const [chatThreadIntent, setChatThreadIntent] = useState<{
    threadId: string
    key: number
    targetPath?: string
    targetTaskId?: string
    targetLabel?: string
    projectTargetPath?: string
    projectTargetLabel?: string
  } | null>(null)

  useEffect(() => {
    if (!communicationFeatureFlags.chatDock) return

    const handleDockOpenRequest = (event: Event) => {
      const customEvent = event as CustomEvent<ChatDockOpenDetail>
      const detail = customEvent.detail || {}
      const currentUid = auth.currentUser?.uid || ''
      const resolvedThreadId = (detail.threadId || '').trim()
        || (currentUid && detail.actorUid ? buildThreadId([currentUid, detail.actorUid]) : THREAD_EVERYONE)
      const resolvedTargetPath = (detail.targetPath || '').trim()
      const resolvedTargetTaskId = (detail.targetTaskId || '').trim()
      const resolvedTargetLabel = (detail.targetLabel || '').trim()
      const resolvedProjectTargetPath = (detail.projectTargetPath || '').trim()
      const resolvedProjectTargetLabel = (detail.projectTargetLabel || '').trim()
      setChatThreadIntent({
        threadId: resolvedThreadId,
        key: Date.now(),
        ...(resolvedTargetPath ? { targetPath: resolvedTargetPath } : {}),
        ...(resolvedTargetTaskId ? { targetTaskId: resolvedTargetTaskId } : {}),
        ...(resolvedTargetLabel ? { targetLabel: resolvedTargetLabel } : {}),
        ...(resolvedProjectTargetPath ? { projectTargetPath: resolvedProjectTargetPath } : {}),
        ...(resolvedProjectTargetLabel ? { projectTargetLabel: resolvedProjectTargetLabel } : {}),
      })
      openChatDock()
    }

    window.addEventListener(CHAT_DOCK_OPEN_EVENT, handleDockOpenRequest as EventListener)
    return () => window.removeEventListener(CHAT_DOCK_OPEN_EVENT, handleDockOpenRequest as EventListener)
  }, [openChatDock])
  const handleSignOut = useCallback(() => {
    // Check if user is in editor with unsaved changes
    const isInEditor = location.pathname === '/editor' || location.pathname === '/mini-game-editor'
    const editorState = sessionStorage.getItem('qyan:editorState')
    
    if (isInEditor && editorState) {
      try {
        const state = JSON.parse(editorState)
        if (state.hasUnsavedChanges) {
          // Show warning dialog
          const confirmed = window.confirm(
            'لديك تغييرات غير محفوظة في المحرر. هل تريد تسجيل الخروج بدون حفظ؟\n\nسيتم حذف جميع البيانات غير المحفوظة.'
          )
          if (!confirmed) {
            return
          }
          // Clear editor state
          sessionStorage.removeItem('qyan:editorState')
          sessionStorage.removeItem('qyan:editorQuizId')
        }
      } catch (e) {
        console.error('Failed to parse editor state:', e)
      }
    }
    
    markSignOut()
    localStorage.removeItem('qyan:session')
    void signOut(auth).then(() => {
      navigate('/dashboard')
    })
  }, [location.pathname, navigate])
  const handleGuestSignIn = useCallback(() => {
    const returnTo = `${location.pathname}${location.search}`
    navigate('/login', { state: { returnTo } })
  }, [location.pathname, location.search, navigate])
  const handleOpenMessagesPage = useCallback(() => {
    navigate('/messages')
  }, [navigate])

  const isLoginPage   = location.pathname === '/login'
  const isMasterPage  = MASTER_PATH ? location.pathname.startsWith(MASTER_PATH) : false
  const isWorkHubPage = location.pathname === '/workhub' || location.pathname.startsWith('/workhub/')
  const isToorGenPage = location.pathname === '/toorgen' || location.pathname.startsWith('/toorgen/')
  const isScannerPage = location.pathname === '/scanner' || location.pathname.startsWith('/scanner/')
  const isScannerDesktopPage = location.pathname === '/scanner/desktop' || location.pathname.startsWith('/scanner/desktop/')
  const isEmbeddedPreview = location.pathname.startsWith('/preview/') && new URLSearchParams(location.search).get('embedded') === '1'
  const isGameEmbed = location.pathname.startsWith('/embed') || location.pathname.startsWith('/play')
  const allowUnauthedLocalPlayTest = isLocalDevHost && isLocalPlayTestPath

  // Apply theme to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('quizAdminTheme', theme)
  }, [theme])

  // Apply language direction
  useEffect(() => {
    document.documentElement.setAttribute('dir', language === 'ar' ? 'rtl' : 'ltr')
    document.documentElement.setAttribute('lang', language)
    localStorage.setItem('quizAdminLang', language)
  }, [language])

  useEffect(() => {
    const path = location.pathname
    let nextTitle = 'Admin'

    if (isWorkHubPage) nextTitle = 'WorkHub'
    else if (path === '/login') nextTitle = 'Login'
    else if (path.startsWith('/dashboard') || path === '/') nextTitle = 'Dashboard'
    else if (path.startsWith('/editor')) nextTitle = 'Challenge Editor'
    else if (path.startsWith('/mini-game-editor')) nextTitle = 'Game Editor'
    else if (path.startsWith('/my-quizzes')) nextTitle = 'My Challenges'
    else if (path.startsWith('/packs')) nextTitle = 'Library'
    else if (path.startsWith('/billing')) nextTitle = 'Billing'
    else if (path.startsWith('/messages')) nextTitle = 'Messages'
    else if (path.startsWith('/ops-tasks')) nextTitle = 'Ops Tasks'
    else if (path.startsWith('/profile')) nextTitle = 'Profile'
    else if (path.startsWith('/voice-lab')) nextTitle = 'Voice Lab'
    else if (path.startsWith('/ai-lab')) nextTitle = 'AI Lab'
    else if (path.startsWith('/cover-gen-lab')) nextTitle = 'Cover Generator'
    else if (path.startsWith('/game-modes')) nextTitle = 'Game Modes'
    else if (path.startsWith('/play-test')) nextTitle = 'Play Test'
    else if (path.startsWith('/scanner')) nextTitle = 'Scanner'
    else if (path.startsWith('/preview')) nextTitle = 'Preview'
    else if (path.startsWith('/play') || path.startsWith('/embed')) nextTitle = 'Game'
    else if (isMasterPage) nextTitle = 'Master Admin'

    document.title = nextTitle
  }, [isMasterPage, isWorkHubPage, location.pathname])

  useEffect(() => {
    localStorage.setItem('qyan:slidePanelEnabled', slidePanelEnabled ? 'true' : 'false')
  }, [slidePanelEnabled])

  useEffect(() => {
    if (user) return
    closeChatDock()
  }, [closeChatDock, user])

  useEffect(() => {
    const redirectStartedAt = Number(localStorage.getItem(redirectPendingKey) || '0')
    const redirectStillPending = redirectStartedAt > 0 && Date.now() - redirectStartedAt < 60000
    const authTimeoutMs = redirectStillPending ? 30000 : 12000

    // Safety timeout: if Firebase auth is unusually slow (common on first Safari visit),
    // stop waiting state but do not force navigation from here to avoid auth race loops.
    const authTimeout = window.setTimeout(() => {
      setUser((prev) => (prev === undefined ? null : prev))
    }, authTimeoutMs)

    const unsub = onAuthStateChanged(auth, (u) => {
      clearTimeout(authTimeout)
      setUser(u)

      // Persist a cheap hint so future app loads know whether to show the
      // spinner (likely returning session) or skip straight to login.
      if (u) {
        localStorage.removeItem(redirectPendingKey)
        localStorage.setItem('qyan:session', '1')
      } else {
        if (!redirectStillPending) {
          localStorage.removeItem(redirectPendingKey)
        }
        localStorage.removeItem('qyan:session')
      }

      // Keep initial navigation fast; never block UI on network calls.
      if (u && window.location.pathname === '/login') {
        navigate('/dashboard', { replace: true })
      }

      // Ensure admin claim in background (master only), without delaying render.
      if (u && MASTER_EMAIL && u.email === MASTER_EMAIL) {
        const claimKey = `_adminClaimChecked:${u.uid}`
        if (!sessionStorage.getItem(claimKey)) {
          sessionStorage.setItem(claimKey, '1')
          void (async () => {
            try {
              const tokenResult = await u.getIdTokenResult()
              if (!tokenResult.claims['admin']) {
                await grantAdminClaim()
                await u.getIdToken(true)
              }
            } catch (e) {
              console.warn('[admin] Could not set admin claim:', e)
              sessionStorage.removeItem(claimKey)
            }
          })()
        }
      }

      // Track device type + always update user profile on sign-in
      if (u) {
        const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
        // Avoid duplicate writes caused by effect replays in development StrictMode.
        const activityKey = `_activityTracked:${u.uid}`
        if (!sessionStorage.getItem(activityKey)) {
          sessionStorage.setItem(activityKey, '1')
          void recordUserActivity(u.uid, {
            email: u.email || '',
            displayName: u.displayName || '',
            photoURL: u.photoURL || '',
            platform: isMobile ? 'mobile' : 'desktop',
            createdAt: u.metadata.creationTime || '',
          })
        }
        // Count device visits only once per browser session (not on every re-render)
        if (!sessionStorage.getItem('_deviceTracked')) {
          sessionStorage.setItem('_deviceTracked', '1')
          void incrementPlatformStat(isMobile ? 'mobileVisits' : 'desktopVisits')
        }
        // Load saved preferences (language, theme) from Firestore and apply them
        void loadUserPrefs(u.uid).then(prefs => {
          if (prefs?.language) setLanguage(prefs.language)
          if (prefs?.theme) setTheme(prefs.theme)
          if (prefs?.slidePanelLayout) setSlidePanelLayout(prefs.slidePanelLayout)
          if (typeof prefs?.slidePanelEnabled === 'boolean') setSlidePanelEnabled(prefs.slidePanelEnabled)
        })
      }
    })
    return () => { clearTimeout(authTimeout); unsub() }
  }, [allowUnauthedLocalPlayTest, isLocalDevHost, navigate])

  // Real-time blocked-user enforcement: sign out immediately if status becomes 'blocked'
  useEffect(() => {
    if (!user) return
    const unsub = subscribeUserDoc(user.uid, (profile) => {
      const runtimeStatus = ((profile as { status?: string } | null)?.status || '').toLowerCase()
      if (runtimeStatus === 'blocked' || runtimeStatus === 'deleted' || runtimeStatus === 'suspended') {
        void signOut(auth)
      }
    })
    return unsub
  }, [user])

  // Close burger + profile when route changes
  useEffect(() => {
    setBurgerOpen(false)
    setProfileOpen(false)
    setMobileHeaderCompact(false)
  }, [location.pathname])

  // Keep layout shell in sync with viewport width so mobile and desktop can use
  // completely different structures without changing page logic.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const query = window.matchMedia('(max-width: 768px)')
    const apply = (matches: boolean) => setIsMobileLayout(matches)
    apply(query.matches)

    const onChange = (event: MediaQueryListEvent) => apply(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      reportError('async', 'unhandledrejection', event.reason)
    }

    const onWindowError = (event: ErrorEvent) => {
      reportError('async', 'window.onerror', event.error || event.message)
    }

    window.addEventListener('unhandledrejection', onUnhandledRejection)
    window.addEventListener('error', onWindowError)

    return () => {
      window.removeEventListener('unhandledrejection', onUnhandledRejection)
      window.removeEventListener('error', onWindowError)
    }
  }, [])

  // Close profile dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  if (user === undefined && !allowUnauthedLocalPlayTest && (isLoginPage || isWorkHubPage || isMasterPage)) {
    if (isLoginPage) {
      return (
        <ToastProvider>
          <DialogProvider>
            <div className="login-shell">
              <main className="login-main">
                <LoginPage />
              </main>
            </div>
            <Dialog />
          </DialogProvider>
        </ToastProvider>
      )
    }

    return (
      <AppLoadingScreen
        variant={isWorkHubPage ? 'workhub' : 'default'}
        note={isWorkHubPage
          ? (isAr ? 'جارٍ تجهيز مساحة العمل…' : 'Preparing your workspace…')
          : (isAr ? 'جارٍ التحقق من جلسة الدخول…' : 'Checking your session…')}
      />
    )
  }

  // ── Standalone Master Admin — no sidebar, no shell chrome ──
  if (isMasterPage) {
    return (
      <ToastProvider>
        <DialogProvider>
          <div className="master-admin-standalone">
            <Suspense fallback={
              <div className="app-loading-screen">
                <img src={logoImg} alt="QYan" className="app-loading-logo" />
                <div className="app-loading-spinner" />
              </div>
            }>
              <Routes>
                <Route path={MASTER_PATH ? `${MASTER_PATH}/*` : '__disabled__'} element={<RequireAdmin user={user ?? null}><MasterAdminPage /></RequireAdmin>} />
              </Routes>
            </Suspense>
          </div>
          <Dialog />
        </DialogProvider>
      </ToastProvider>
    )
  }

  // ── Standalone WorkHub (desktop only) — keep no sidebar chrome on desktop,
  // while mobile routes through the dedicated mobile shell below.
  if (isWorkHubPage) {
    return (
      <ToastProvider>
        <DialogProvider>
          <div className="master-admin-standalone">
            <ErrorBoundary>
              <Suspense fallback={
                <AppLoadingScreen
                  variant="workhub"
                  note={isAr ? 'جارٍ تحميل WorkHub…' : 'Loading WorkHub…'}
                />
              }>
                <RequireAuth
                  user={user}
                  loadingFallback={
                    <AppLoadingScreen
                      variant="workhub"
                      note={isAr ? 'جارٍ تحميل WorkHub…' : 'Loading WorkHub…'}
                    />
                  }
                >
                  <WorkHubRoutePage />
                </RequireAuth>
              </Suspense>
            </ErrorBoundary>
            <Dialog />
            {user && communicationFeatureFlags.chatDock && (
              <>
                <FeatureErrorBoundary
                  name="ChatDock"
                  resetKey={`${chatDockOpen ? 'open' : 'closed'}:${chatThreadIntent?.key || ''}`}
                >
                  <ChatDock
                    open={chatDockOpen}
                    isAr={isAr}
                    onClose={closeChatDock}
                    onOpenMessagesPage={handleOpenMessagesPage}
                    layout="floating"
                    floatingSide="left"
                    defaultTargetPath={chatThreadIntent?.targetPath}
                    defaultTargetTaskId={chatThreadIntent?.targetTaskId}
                    defaultTargetLabel={chatThreadIntent?.targetLabel}
                    projectTargetPath={chatThreadIntent?.projectTargetPath}
                    projectTargetLabel={chatThreadIntent?.projectTargetLabel}
                    currentUser={{
                      uid: user.uid,
                      displayName: user.displayName || undefined,
                      email: user.email || undefined,
                      photoURL: user.photoURL || undefined,
                    }}
                    requestedThreadId={chatThreadIntent?.threadId}
                    requestKey={chatThreadIntent?.key}
                    showOpenPageButton={communicationFeatureFlags.messagesPage}
                  />
                </FeatureErrorBoundary>
              </>
            )}
          </div>
        </DialogProvider>
      </ToastProvider>
    )
  }

  // ── Standalone ToorGen — dedicated AI generation shell ──
  if (isToorGenPage) {
    return (
      <ToastProvider>
        <DialogProvider>
          <div className="master-admin-standalone">
            <ErrorBoundary>
              <Suspense fallback={
                <AppLoadingScreen
                  variant="default"
                  note={isAr ? 'جارٍ تحميل ToorGen…' : 'Loading ToorGen…'}
                />
              }>
                <RequireAuth
                  user={user}
                  loadingFallback={
                    <AppLoadingScreen
                      variant="default"
                      note={isAr ? 'جارٍ تحميل ToorGen…' : 'Loading ToorGen…'}
                    />
                  }
                >
                  <Routes>
                    <Route path="/toorgen" element={<ToorGenPage />} />
                    <Route path="/toorgen/*" element={<ToorGenPage />} />
                  </Routes>
                </RequireAuth>
              </Suspense>
            </ErrorBoundary>
            <Dialog />
          </div>
        </DialogProvider>
      </ToastProvider>
    )
  }

  // ── Standalone Scanner — no sidebar, no app chrome ──
  if (isScannerPage) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<div style={{ background: '#0a0a0a', height: '100vh' }} />}>
          {isScannerDesktopPage ? <ScannerDesktopPage /> : <ScannerPage />}
        </Suspense>
      </ErrorBoundary>
    )
  }

  // ── Embedded Preview — no sidebar, no shell chrome ──
  const userPrefsValue = {
    language,
    setLanguage,
    theme,
    setTheme,
    slidePanelLayout,
    setSlidePanelLayout,
    slidePanelEnabled,
    setSlidePanelEnabled,
  }

  if (isEmbeddedPreview) {
    return (
      <UserPrefsContext.Provider value={userPrefsValue}>
        <ToastProvider>
          <DialogProvider>
            <div className="master-admin-standalone embedded-preview-shell">
              <ErrorBoundary>
                <Suspense fallback={
                  <div className="app-loading-screen">
                    <img src={logoImg} alt="QYan" className="app-loading-logo" />
                    <div className="app-loading-spinner" />
                  </div>
                }>
                  <Routes>
                    <Route path="/preview" element={<QuizPreviewPage />} />
                    <Route path="/preview/:id" element={<QuizPreviewPage />} />
                  </Routes>
                </Suspense>
              </ErrorBoundary>
              <Dialog />
              <VFXContainer />
            </div>
          </DialogProvider>
        </ToastProvider>
      </UserPrefsContext.Provider>
    )
  }

  // ── Embedded Game — no sidebar, no shell chrome ──
  if (isGameEmbed) {
    return (
      <UserPrefsContext.Provider value={userPrefsValue}>
        <ToastProvider>
          <DialogProvider>
            <div className="master-admin-standalone embedded-preview-shell">
              <ErrorBoundary>
                <Suspense fallback={
                  <div className="app-loading-screen">
                    <img src={logoImg} alt="QYan" className="app-loading-logo" />
                    <div className="app-loading-spinner" />
                  </div>
                }>
                  <Routes>
                    <Route path="/embed/:gameId" element={<GameEmbedPage />} />
                    <Route path="/play" element={<GameEmbedPage />} />
                    <Route path="/play/:gameId" element={<GameEmbedPage />} />
                  </Routes>
                </Suspense>
              </ErrorBoundary>
              <Dialog />
            </div>
          </DialogProvider>
        </ToastProvider>
      </UserPrefsContext.Provider>
    )
  }

  const appRoutes = (
    <Routes>
      <Route path="/" element={withRouteBoundary('home', <Navigate to="/dashboard" replace />)} />
      <Route path="/login" element={withRouteBoundary('login', <LoginPage />)} />
      <Route path="/dashboard" element={withRouteBoundary('dashboard', <DashboardPage />)} />
      <Route path="/editor" element={withRouteBoundary('editor', <QuizEditorPage />)} />
      <Route path="/editor/:id" element={withRouteBoundary('editor-id', <QuizEditorPage />)} />
      <Route path="/mini-game-editor" element={withRouteBoundary('mini-game-editor', <QuizEditorPage />)} />
      <Route path="/mini-game-editor/:id" element={withRouteBoundary('mini-game-editor-id', <QuizEditorPage />)} />
      <Route path="/game-modes" element={withRouteBoundary('game-modes', <RequireAdmin user={user ?? null}><GameModesPage /></RequireAdmin>)} />
      <Route path="/play-test" element={withRouteBoundary('play-test', allowUnauthedLocalPlayTest ? <PlayTestPage /> : <RequireAdmin user={user ?? null}><PlayTestPage /></RequireAdmin>)} />
      <Route path="/play-test/:gameId" element={withRouteBoundary('play-test-game', allowUnauthedLocalPlayTest ? <PlayTestPage /> : <RequireAdmin user={user ?? null}><PlayTestPage /></RequireAdmin>)} />
      <Route path="/play" element={withRouteBoundary('play', <GameEmbedPage />)} />
      <Route path="/play/:gameId" element={withRouteBoundary('play-game', <GameEmbedPage />)} />
      <Route path="/preview" element={withRouteBoundary('preview', <QuizPreviewPage />)} />
      <Route path="/preview/:id" element={withRouteBoundary('preview-id', <QuizPreviewPage />)} />
      <Route path="/packs" element={withRouteBoundary('packs', <RequireAuth user={user}><PacksPage /></RequireAuth>)} />
      <Route path="/my-quizzes" element={withRouteBoundary('my-quizzes', <RequireAuth user={user}><MyQuizzesPage /></RequireAuth>)} />
      <Route path="/workhub/*" element={withRouteBoundary('workhub', <RequireAuth user={user} loadingFallback={<AppLoadingScreen variant="workhub" note={isAr ? 'جارٍ تحميل WorkHub…' : 'Loading WorkHub…'} />}><WorkHubRoutePage /></RequireAuth>)} />
      <Route path="/toorgen/*" element={withRouteBoundary('toorgen', <RequireAuth user={user}><ToorGenPage /></RequireAuth>)} />
      {communicationFeatureFlags.messagesPage ? (
        <Route path="/messages" element={withRouteBoundary('messages', <RequireAuth user={user}><MessagesPage /></RequireAuth>)} />
      ) : null}
      {communicationFeatureFlags.adHocTasksPage ? (
        <Route path="/ops-tasks" element={withRouteBoundary('ops-tasks', <RequireAuth user={user}><AdHocTasksPage /></RequireAuth>)} />
      ) : null}
      <Route path="/voice-lab" element={withRouteBoundary('voice-lab', <RequireAdmin user={user ?? null}><VoiceLabPage /></RequireAdmin>)} />
      <Route path="/ai-lab" element={withRouteBoundary('ai-lab', <RequireAdmin user={user ?? null}><AILabPage /></RequireAdmin>)} />
      <Route path="/cover-gen-lab" element={withRouteBoundary('cover-gen-lab', <RequireAdmin user={user ?? null}><CoverGenLabPage /></RequireAdmin>)} />
      <Route path="/billing" element={withRouteBoundary('billing', <RequireAuth user={user}><BillingPage /></RequireAuth>)} />
      <Route path="/profile" element={withRouteBoundary('profile', <RequireAuth user={user}><ProfilePage /></RequireAuth>)} />
    </Routes>
  )

  const navItems = getNav(isAr)
  const navLookup = new Map(navItems.map((item) => [item.to, item]))
  const pickNavItems = (targets: string[]): NavItem[] => {
    const selected: NavItem[] = []
    for (const to of targets) {
      const item = navLookup.get(to)
      if (item) selected.push(item)
    }
    return selected
  }

  const mobileRouteKey =
    location.pathname.startsWith('/editor') || location.pathname.startsWith('/mini-game-editor')
      ? 'editor'
      : location.pathname.startsWith('/workhub')
        ? 'workhub'
        : location.pathname.startsWith('/toorgen')
          ? 'toorgen'
        : location.pathname.startsWith('/packs')
          ? 'library'
          : location.pathname.startsWith('/my-quizzes')
            ? 'my-quizzes'
            : location.pathname.startsWith('/messages')
              ? 'messages'
              : location.pathname.startsWith('/ops-tasks')
                ? 'ops-tasks'
            : location.pathname.startsWith('/billing')
              ? 'billing'
              : location.pathname.startsWith('/profile')
                ? 'profile'
                : location.pathname.startsWith('/game-modes')
                  ? 'game-modes'
                  : location.pathname.startsWith('/voice-lab') || location.pathname.startsWith('/ai-lab') || location.pathname.startsWith('/cover-gen-lab')
                    ? 'labs'
                    : 'dashboard'

  const mobileHeaderTitle =
    mobileRouteKey === 'editor'
      ? (isAr ? 'استوديو التحديات' : 'Challenge Studio')
      : mobileRouteKey === 'workhub'
        ? (isAr ? 'وورك هَب التشغيلي' : 'WorkHub Operations')
      : mobileRouteKey === 'toorgen'
        ? (isAr ? 'تورجن' : 'ToorGen')
        : mobileRouteKey === 'library'
          ? (isAr ? 'المكتبة' : 'Library')
          : mobileRouteKey === 'my-quizzes'
            ? (isAr ? 'تحدياتي' : 'My Challenges')
            : mobileRouteKey === 'messages'
              ? (isAr ? 'الرسائل' : 'Messages')
              : mobileRouteKey === 'ops-tasks'
                ? (isAr ? 'مهام التشغيل' : 'Ops Tasks')
            : mobileRouteKey === 'billing'
              ? (isAr ? 'الفوترة' : 'Billing')
              : mobileRouteKey === 'profile'
                ? (isAr ? 'الملف الشخصي' : 'Profile')
                : mobileRouteKey === 'game-modes'
                  ? (isAr ? 'أوضاع اللعب' : 'Game Modes')
                  : mobileRouteKey === 'labs'
                    ? (isAr ? 'المختبر' : 'Labs')
                      : (isAr ? 'مركز التحكم' : 'Control Center')

  const mobileHeaderHint =
    mobileRouteKey === 'editor'
        ? (isAr ? 'صياغة وتحرير ثم نشر' : 'Draft, refine, publish')
      : mobileRouteKey === 'workhub'
          ? (isAr ? 'المشاريع والمهام والمراجعات' : 'Projects, tasks, approvals')
      : mobileRouteKey === 'toorgen'
        ? (isAr ? 'توليد فيديوهات الذكاء الاصطناعي' : 'AI video generation workspace')
        : mobileRouteKey === 'messages'
          ? (isAr ? 'محادثات الفريق الموحدة' : 'Unified team communication')
          : mobileRouteKey === 'ops-tasks'
            ? (isAr ? 'مهام تشغيل بدون مشروع' : 'Non-project operational tasks')
        : mobileRouteKey === 'dashboard'
            ? (isAr ? 'تابع النشاط وانتقل لخطوتك التالية' : 'Review activity and continue your next task')
          : ''

  const mobileTabPriorityByRoute: Record<string, string[]> = {
      dashboard: ['/dashboard', '/workhub', '/editor', '/my-quizzes', '/packs'],
      editor: ['/editor', '/mini-game-editor', '/workhub', '/my-quizzes', '/dashboard'],
      workhub: ['/workhub', '/dashboard', '/editor', '/my-quizzes', '/packs'],
    toorgen: ['/toorgen', '/workhub', '/dashboard', '/editor', '/my-quizzes'],
    library: ['/packs', '/my-quizzes', '/dashboard', '/editor', '/profile'],
    'my-quizzes': ['/my-quizzes', '/editor', '/dashboard', '/packs', '/profile'],
    messages: ['/messages', '/dashboard', '/workhub', '/editor', '/profile'],
    'ops-tasks': ['/ops-tasks', '/workhub', '/dashboard', '/messages', '/profile'],
    billing: ['/billing', '/dashboard', '/packs', '/profile', '/workhub'],
    profile: ['/profile', '/dashboard', '/my-quizzes', '/packs', '/workhub'],
    'game-modes': ['/dashboard', '/editor', '/workhub', '/my-quizzes', '/profile'],
    labs: ['/dashboard', '/editor', '/workhub', '/my-quizzes', '/profile'],
  }

  const mobileTabs = (mobileTabPriorityByRoute[mobileRouteKey] || mobileTabPriorityByRoute.dashboard)
    .reduce<NavItem[]>((acc, to) => {
      const item = navLookup.get(to)
      if (item) acc.push(item)
      return acc
    }, [])
    .slice(0, 5)

  const mobileDrawerSections = [
    {
      key: 'primary',
      title: isAr ? 'التنقل الأساسي' : 'Primary',
      links: pickNavItems(['/dashboard', '/my-quizzes', '/packs', '/messages', '/ops-tasks', '/profile', '/billing']),
    },
    {
      key: 'creation',
      title: isAr ? 'التحرير والإنشاء' : 'Creation',
      links: pickNavItems(['/editor', '/mini-game-editor', '/workhub']),
    },
  ]

  const mobileAdminLinks = user?.email === MASTER_EMAIL && MASTER_PATH
    ? [
        { to: '/game-modes', icon: '🧩', label: isAr ? 'أوضاع اللعب' : 'Game Modes' },
        { to: '/voice-lab', icon: '🎙️', label: isAr ? 'مختبر الصوت' : 'Voice Lab' },
        { to: '/ai-lab', icon: '🤖', label: isAr ? 'مختبر الذكاء' : 'AI Lab' },
        { to: '/cover-gen-lab', icon: '🖼️', label: isAr ? 'مختبر الغلاف' : 'Cover Lab' },
        { to: `${MASTER_PATH}/dashboard`, icon: '👑', label: isAr ? 'الإدارة ↗' : 'Admin ↗', end: true },
      ]
    : []

  const handleMobileMainScroll = (event: { currentTarget: HTMLElement }) => {
    const nextCompact = event.currentTarget.scrollTop > 12
    setMobileHeaderCompact((prev) => (prev !== nextCompact ? nextCompact : prev))
  }

  return (
    <UserPrefsContext.Provider value={userPrefsValue}>
    <ToastProvider>
      <DialogProvider>
        {isLoginPage ? (
          <div className="login-shell">
            <main className="login-main">
              <ErrorBoundary>
                <Suspense fallback={
                  <div className="app-loading-screen">
                    <img src={logoImg} alt="QYan" className="app-loading-logo" />
                    <div className="app-loading-spinner" />
                  </div>
                }>
                  {appRoutes}
                </Suspense>
              </ErrorBoundary>
            </main>
          </div>
        ) : isMobileLayout ? (
          <div className="mobile-shell">
            <header className={`mobile-shell-header${mobileHeaderCompact ? ' is-compact' : ''}`}>
              <div className="mobile-shell-header-main">
                <button className="mobile-shell-brand" onClick={() => navigate('/dashboard')} type="button">
                  Q<span>Yan</span> Gaming
                </button>
                <div className="mobile-shell-heading">
                  <strong className="mobile-shell-page-title">{mobileHeaderTitle}</strong>
                  {mobileHeaderHint && <span className="mobile-shell-page-hint">{mobileHeaderHint}</span>}
                </div>
              </div>

              <div className="mobile-shell-actions" ref={profileRef}>
                {user ? (
                  <>
                    {communicationFeatureFlags.notificationsInShell && (
                      <FeatureErrorBoundary name="InAppNotificationCenter">
                        <InAppNotificationCenter userUid={user.uid} isAr={isAr} />
                      </FeatureErrorBoundary>
                    )}
                    {communicationFeatureFlags.chatDock && (
                      <button
                        type="button"
                        className={`shell-comm-btn${chatDockOpen ? ' is-active' : ''}`}
                        onClick={toggleChatDock}
                        aria-label={isAr ? 'لوحة الرسائل' : 'Messages panel'}
                        title={isAr ? 'الرسائل' : 'Messages'}
                      >
                        <span aria-hidden="true">💬</span>
                      </button>
                    )}
                    <button
                      className="mobile-avatar-btn"
                      onClick={() => { setProfileOpen((o) => !o); setBurgerOpen(false) }}
                      aria-label="Profile menu"
                      title="Profile"
                      type="button"
                    >
                      {user.photoURL ? (
                        <img src={user.photoURL} referrerPolicy="no-referrer" alt="" className="sidebar-user-avatar" />
                      ) : (
                        <div className="sidebar-user-avatar sidebar-user-initials small">
                          {(user.displayName || user.email || '?').slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </button>

                    {profileOpen && (
                      <div className="header-profile-dropdown">
                        <button
                          className="header-profile-action"
                          onClick={() => {
                            setProfileOpen(false)
                            navigate('/profile')
                          }}
                          type="button"
                        >
                          {isAr ? '👤 الملف الشخصي' : '👤 Visit Profile'}
                        </button>
                        <button
                          className="header-profile-action danger"
                          onClick={handleSignOut}
                          type="button"
                        >
                          {isAr ? '🚪 تسجيل الخروج' : '🚪 Sign Out'}
                        </button>
                      </div>
                    )}

                    <button
                      className="burger-btn"
                      onClick={() => { setBurgerOpen((o) => !o); setProfileOpen(false) }}
                      aria-label="Toggle menu"
                      title="Menu"
                      type="button"
                    >
                      <span className={`burger-line ${burgerOpen ? 'open-top' : ''}`} />
                      <span className={`burger-line ${burgerOpen ? 'open-mid' : ''}`} />
                      <span className={`burger-line ${burgerOpen ? 'open-bot' : ''}`} />
                    </button>
                  </>
                ) : (
                  <button className="sidebar-auth-btn" onClick={handleGuestSignIn} type="button">
                    {isAr ? 'تسجيل الدخول / إنشاء حساب' : 'Sign In / Sign Up'}
                  </button>
                )}
              </div>
            </header>

            {user && burgerOpen && (
              <div
                className="mobile-drawer-overlay"
                onClick={() => setBurgerOpen(false)}
                aria-label="Close menu"
              />
            )}

            {user && (
              <nav className={`mobile-nav-drawer ${burgerOpen ? ' drawer-open' : ''}`}>
                <div className="mobile-nav-content">
                  {mobileDrawerSections.map((section) => (
                    <section className="mobile-nav-section" key={section.key}>
                      <p className="mobile-nav-section-title">{section.title}</p>
                      {section.links.map(({ to, icon, label, end }) => (
                        <NavLink
                          key={`${section.key}-${to}`}
                          to={resolveNavTarget(to)}
                          end={end}
                          onClick={() => setBurgerOpen(false)}
                          className={() =>
                            `mobile-nav-link${(end ? location.pathname === to : location.pathname.startsWith(to)) ? ' active' : ''}`
                          }
                        >
                          <span className="mobile-nav-link-row" style={{ justifyContent: 'flex-start' }}>
                            <span className="mobile-nav-link-icon">{icon}</span>
                            <span className="mobile-nav-link-label">{label}</span>
                          </span>
                        </NavLink>
                      ))}
                    </section>
                  ))}

                  {mobileAdminLinks.length > 0 && (
                    <section className="mobile-nav-section mobile-nav-section-admin">
                      <p className="mobile-nav-section-title">{isAr ? 'أدوات الإدارة' : 'Admin Tools'}</p>
                      {mobileAdminLinks.map(({ to, icon, label, end }) => (
                        <NavLink
                          key={`admin-${to}`}
                          to={to}
                          end={end}
                          onClick={() => setBurgerOpen(false)}
                          target={to.startsWith(MASTER_PATH || '/__missing__') ? '_blank' : undefined}
                          rel={to.startsWith(MASTER_PATH || '/__missing__') ? 'noopener noreferrer' : undefined}
                          className={() =>
                            `mobile-nav-link${(end ? location.pathname === to : location.pathname.startsWith(to)) ? ' active' : ''}`
                          }
                        >
                          <span className="mobile-nav-link-row" style={{ justifyContent: 'flex-start' }}>
                            <span className="mobile-nav-link-icon">{icon}</span>
                            <span className="mobile-nav-link-label">{label}</span>
                          </span>
                        </NavLink>
                      ))}
                    </section>
                  )}
                </div>

                <div className="mobile-nav-divider"></div>

                <div className="mobile-profile-section">
                  <div className="mobile-profile-info">
                    {user.photoURL ? (
                      <img src={user.photoURL} referrerPolicy="no-referrer" alt="" className="mobile-profile-avatar" />
                    ) : (
                      <div className="sidebar-user-avatar sidebar-user-initials mobile-profile-initials">
                        {(user.displayName || user.email || '?').slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="mobile-profile-text">
                      <div className="mobile-profile-name">
                        {user.displayName || user.email?.split('@')[0]}
                      </div>
                      <div className="mobile-profile-email">
                        {user.email}
                      </div>
                    </div>
                  </div>

                  <button onClick={handleSignOut} className="mobile-signout-btn">
                    {isAr ? 'تسجيل الخروج' : 'Sign Out'}
                  </button>
                </div>
              </nav>
            )}

            <main className={`mobile-shell-main mobile-route-${mobileRouteKey}`} data-scrollable="true" onScroll={handleMobileMainScroll}>
              <ErrorBoundary>
                <Suspense fallback={
                  <div className="app-loading-screen">
                    <img src={logoImg} alt="QYan" className="app-loading-logo" />
                    <div className="app-loading-spinner" />
                  </div>
                }>
                  {appRoutes}
                </Suspense>
              </ErrorBoundary>
            </main>

            {user && (
              <nav className="mobile-shell-tabbar">
                {mobileTabs.map(({ to, icon, label, end }) => {
                  const resolvedTo = resolveNavTarget(to)
                  const isActive = end ? location.pathname === to : location.pathname.startsWith(to)
                  return (
                    <NavLink key={to} to={resolvedTo} end={end} className={`mobile-tab-link${isActive ? ' active' : ''}`}>
                      <span className="mobile-tab-icon">{icon}</span>
                      <span className="mobile-tab-label">{label}</span>
                    </NavLink>
                  )
                })}
              </nav>
            )}
          </div>
        ) : (
          <div className={`admin-shell${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
            <aside className="admin-sidebar">
              <div className="sidebar-header">
                <h1 className="sidebar-brand" onClick={() => navigate('/dashboard')} style={{ cursor: 'pointer' }}>Q<span>Yan</span> Gaming</h1>
                {user ? (
                  <button
                    className="sidebar-collapse-btn"
                    onClick={() => setSidebarCollapsed((c) => !c)}
                    title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                  >
                    {sidebarCollapsed ? '›' : '‹'}
                  </button>
                ) : (
                  <button
                    className="sidebar-auth-btn"
                    onClick={handleGuestSignIn}
                    type="button"
                  >
                    {isAr ? 'تسجيل الدخول / إنشاء حساب' : 'Sign In / Sign Up'}
                  </button>
                )}
              </div>

              {user && (
                <nav className="sidebar-nav-desktop">
                  {getNav(isAr).map(({ to, icon, label, end }) => {
                    const resolvedTo =
                      to === '/editor'
                        ? (sessionStorage.getItem('lastEditorPath') || to)
                        : to === '/mini-game-editor'
                          ? (sessionStorage.getItem('lastMiniGameEditorPath') || to)
                          : to
                    return (
                      <NavLink
                        key={to}
                        to={resolvedTo}
                        end={end}
                        className={() =>
                          `nav-link${(end ? location.pathname === to : location.pathname.startsWith(to)) ? ' active' : ''}`
                        }
                      >
                        <span className="nav-icon">{icon}</span>
                        <span className="nav-label">{label}</span>
                      </NavLink>
                    )
                  })}

                  {user.email === MASTER_EMAIL && MASTER_PATH && (
                    <>
                      <NavLink
                        to="/game-modes"
                        className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                      >
                        <span className="nav-icon">🧩</span>
                        <span className="nav-label">{isAr ? 'أوضاع اللعب' : 'Game Modes'}</span>
                      </NavLink>
                      <NavLink
                        to="/voice-lab"
                        className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                        style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}
                      >
                        <span className="nav-icon">🎙️</span>
                        <span className="nav-label">{isAr ? 'مختبر الصوت' : 'Voice Lab'}</span>
                      </NavLink>
                      <NavLink
                        to="/ai-lab"
                        className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                      >
                        <span className="nav-icon">🤖</span>
                        <span className="nav-label">{isAr ? 'مختبر الذكاء' : 'AI Lab'}</span>
                      </NavLink>
                      <NavLink
                        to="/cover-gen-lab"
                        className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                      >
                        <span className="nav-icon">🖼️</span>
                        <span className="nav-label">{isAr ? 'مختبر الغلاف' : 'Cover Lab'}</span>
                      </NavLink>
                      <NavLink
                        to={`${MASTER_PATH}/dashboard`}
                        className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span className="nav-icon">👑</span>
                        <span className="nav-label">{isAr ? 'الإدارة ↗' : 'Admin ↗'}</span>
                      </NavLink>
                    </>
                  )}
                </nav>
              )}

              {user && (
                <div className="sidebar-user">
                  <div className="sidebar-comm-row">
                    {communicationFeatureFlags.notificationsInShell && (
                      <FeatureErrorBoundary name="InAppNotificationCenterMobile">
                        <InAppNotificationCenter userUid={user.uid} isAr={isAr} />
                      </FeatureErrorBoundary>
                    )}
                    {communicationFeatureFlags.chatDock && (
                      <button
                        type="button"
                        className={`shell-comm-btn${chatDockOpen ? ' is-active' : ''}`}
                        onClick={toggleChatDock}
                        aria-label={isAr ? 'لوحة الرسائل' : 'Messages panel'}
                        title={isAr ? 'الرسائل' : 'Messages'}
                      >
                        <span aria-hidden="true">💬</span>
                      </button>
                    )}
                  </div>
                  <NavLink to="/profile" className={({ isActive }) => `sidebar-user-chip${isActive ? ' active' : ''}`}>
                    {user.photoURL ? (
                      <img src={user.photoURL} referrerPolicy="no-referrer" alt="" className="sidebar-user-avatar" />
                    ) : (
                      <div className="sidebar-user-avatar sidebar-user-initials">
                        {(user.displayName || user.email || '?').slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <span className="sidebar-user-name">
                      {user.displayName || user.email?.split('@')[0]}
                    </span>
                  </NavLink>
                  <button onClick={handleSignOut} className="sidebar-signout-btn">{isAr ? 'تسجيل الخروج' : 'Sign Out'}</button>
                </div>
              )}
            </aside>

            <main className="admin-main" data-scrollable="true">
              <ErrorBoundary>
                <Suspense fallback={
                  <div className="app-loading-screen">
                    <img src={logoImg} alt="QYan" className="app-loading-logo" />
                    <div className="app-loading-spinner" />
                  </div>
                }>
                  {appRoutes}
                </Suspense>
              </ErrorBoundary>
            </main>
          </div>
        )}
        {user && communicationFeatureFlags.chatDock && (
          <FeatureErrorBoundary
            name="ChatDock"
            resetKey={`${chatDockOpen ? 'open' : 'closed'}:${chatThreadIntent?.key || ''}`}
          >
            <ChatDock
              open={chatDockOpen}
              isAr={isAr}
              onClose={closeChatDock}
              onOpenMessagesPage={handleOpenMessagesPage}
              defaultTargetPath={chatThreadIntent?.targetPath}
              defaultTargetTaskId={chatThreadIntent?.targetTaskId}
              defaultTargetLabel={chatThreadIntent?.targetLabel}
              projectTargetPath={chatThreadIntent?.projectTargetPath}
              projectTargetLabel={chatThreadIntent?.projectTargetLabel}
              currentUser={{
                uid: user.uid,
                displayName: user.displayName || undefined,
                email: user.email || undefined,
                photoURL: user.photoURL || undefined,
              }}
              requestedThreadId={chatThreadIntent?.threadId}
              requestKey={chatThreadIntent?.key}
              showOpenPageButton={communicationFeatureFlags.messagesPage}
            />
          </FeatureErrorBoundary>
        )}
        <Dialog />
        <VFXContainer />
      </DialogProvider>
    </ToastProvider>
    </UserPrefsContext.Provider>
  )
}

export default App
