import { onAuthStateChanged, signOut } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { markSignOut } from './lib/signOutState'
import type { ReactElement } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import './App.css'
import { auth } from './lib/firebase'
import { ErrorBoundary } from './components/ErrorBoundary'
import { incrementPlatformStat, loadUserPrefs, recordUserActivity, subscribeUserDoc, grantAdminClaim } from './lib/adminRepo'
import { UserPrefsContext } from './lib/UserPrefsContext'
import { DialogProvider } from './lib/DialogContext'
import { ToastProvider } from './lib/ToastContext'
import { Dialog } from './components/Dialog'
import { VFXContainer } from './components/VFXContainer'
import { LoginPage } from './pages/LoginPage'
import logoImg from './assets/QYan_logo_300x164.jpg'
const BillingPage     = lazy(() => import('./pages/BillingPage').then(m => ({ default: m.BillingPage })))
const DashboardPage   = lazy(() => import('./pages/DashboardPage').then(m => ({ default: m.DashboardPage })))
const PacksPage       = lazy(() => import('./pages/PacksPage').then(m => ({ default: m.PacksPage })))
const MyQuizzesPage   = lazy(() => import('./pages/MyQuizzesPage').then(m => ({ default: m.MyQuizzesPage })))
const WorkHubPage     = lazy(() => import('./pages/WorkHubPage'))
const ProfilePage     = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })))
const QuizEditorPage  = lazy(() => import('./pages/QuizEditorPage').then(m => ({ default: m.QuizEditorPage })))
const QuizPreviewPage = lazy(() => import('./pages/QuizPreviewPage').then(m => ({ default: m.QuizPreviewPage })))
const GameModesPage   = lazy(() => import('./pages/GameModesPage').then(m => ({ default: m.GameModesPage })))
const MasterAdminPage = lazy(() => import('./pages/MasterAdminPage').then(m => ({ default: m.MasterAdminPage })))
const VoiceLabPage    = lazy(() => import('./pages/VoiceLabPage').then(m => ({ default: m.VoiceLabPage })))
const AILabPage       = lazy(() => import('./pages/AILabPage'))
const CoverGenLabPage = lazy(() => import('./pages/CoverGenLabPage'))
const PlayTestPage    = lazy(() => import('./pages/PlayTestPage'))
const GameEmbedPage   = lazy(() => import('./pages/GameEmbedPage'))

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
  return [
    { to: '/dashboard',        icon: '🏠', label: isAr ? 'الرئيسية' : 'Dashboard', end: true },
    { to: '/editor',           icon: '✏️',  label: isAr ? 'محرر الأسئلة' : 'Challenge Editor' },
    { to: '/mini-game-editor', icon: '🎮', label: isAr ? 'محرر الألعاب' : 'Game Editor' },
    { to: '/my-quizzes',       icon: '📚', label: isAr ? 'اختباراتي' : 'My Challenges' },
    { to: '/packs',            icon: '📦', label: isAr ? 'المكتبة' : 'Library' },
    { to: '/workhub',         icon: '🗂️', label: isAr ? 'وورك هَب' : 'WorkHub' },
    { to: '/billing',          icon: '💳', label: isAr ? 'الاشتراك' : 'Billing' },
    { to: '/profile',          icon: '👤', label: isAr ? 'الملف الشخصي' : 'Profile' },
  ] satisfies NavItem[]
}

function resolveNavTarget(to: string) {
  if (typeof window === 'undefined') return to
  if (to === '/editor') return sessionStorage.getItem('lastEditorPath') || to
  if (to === '/mini-game-editor') return sessionStorage.getItem('lastMiniGameEditorPath') || to
  return to
}

function RequireAuth({ user, children }: { user: User | null; children: ReactElement }) {
  if (!user) return <Navigate to="/dashboard" replace />
  return children
}

function RequireAdmin({ user, children }: { user: User | null; children: ReactElement }) {
  if (!user) return <Navigate to="/login" replace />
  if (!MASTER_EMAIL || user.email !== MASTER_EMAIL) return <Navigate to="/dashboard" replace />
  return children
}

function App() {
  const redirectPendingKey = 'qyan:authRedirectPending'
  const [user, setUser] = useState<User | null | undefined>(undefined)
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

  const isLoginPage   = location.pathname === '/login'
  const isMasterPage  = MASTER_PATH ? location.pathname.startsWith(MASTER_PATH) : false
  const isWorkHubPage = location.pathname === '/workhub' || location.pathname.startsWith('/workhub/')
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
    else if (path.startsWith('/profile')) nextTitle = 'Profile'
    else if (path.startsWith('/voice-lab')) nextTitle = 'Voice Lab'
    else if (path.startsWith('/ai-lab')) nextTitle = 'AI Lab'
    else if (path.startsWith('/cover-gen-lab')) nextTitle = 'Cover Generator'
    else if (path.startsWith('/game-modes')) nextTitle = 'Game Modes'
    else if (path.startsWith('/play-test')) nextTitle = 'Play Test'
    else if (path.startsWith('/preview')) nextTitle = 'Preview'
    else if (path.startsWith('/play') || path.startsWith('/embed')) nextTitle = 'Game'
    else if (isMasterPage) nextTitle = 'Master Admin'

    document.title = nextTitle
  }, [isMasterPage, isWorkHubPage, location.pathname])

  useEffect(() => {
    localStorage.setItem('qyan:slidePanelEnabled', slidePanelEnabled ? 'true' : 'false')
  }, [slidePanelEnabled])

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
      if (profile?.status === 'blocked' || profile?.status === 'deleted') {
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

  if (user === undefined && !allowUnauthedLocalPlayTest) {
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
      <div className="app-loading-screen">
        <img src={logoImg} alt="QYan" className="app-loading-logo" />
        <div className="app-loading-spinner" />
        <p className="app-loading-note">
          {isAr
            ? 'نقوم بتحميل ألعاب واختبارات مجانية لك الآن. يمكنك اللعب بدون تسجيل، وتسجيل الدخول يمنحك تجربة أفضل.'
            : 'We are loading free challenges and games for you. No registration is required to play, and signing in gives you a better experience.'}
        </p>
      </div>
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
                <div className="app-loading-screen">
                  <img src={logoImg} alt="QYan" className="app-loading-logo" />
                  <div className="app-loading-spinner" />
                </div>
              }>
                <Routes>
                  <Route path="/workhub/*" element={<WorkHubPage />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
            <Dialog />
          </div>
        </DialogProvider>
      </ToastProvider>
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
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/editor" element={<QuizEditorPage />} />
      <Route path="/editor/:id" element={<QuizEditorPage />} />
      <Route path="/mini-game-editor" element={<QuizEditorPage />} />
      <Route path="/mini-game-editor/:id" element={<QuizEditorPage />} />
      <Route path="/game-modes" element={<RequireAdmin user={user ?? null}><GameModesPage /></RequireAdmin>} />
      <Route path="/play-test" element={allowUnauthedLocalPlayTest ? <PlayTestPage /> : <RequireAdmin user={user ?? null}><PlayTestPage /></RequireAdmin>} />
      <Route path="/play-test/:gameId" element={allowUnauthedLocalPlayTest ? <PlayTestPage /> : <RequireAdmin user={user ?? null}><PlayTestPage /></RequireAdmin>} />
      <Route path="/play" element={<GameEmbedPage />} />
      <Route path="/play/:gameId" element={<GameEmbedPage />} />
      <Route path="/preview" element={<QuizPreviewPage />} />
      <Route path="/preview/:id" element={<QuizPreviewPage />} />
      <Route path="/packs" element={<RequireAuth user={user ?? null}><PacksPage /></RequireAuth>} />
      <Route path="/my-quizzes" element={<RequireAuth user={user ?? null}><MyQuizzesPage /></RequireAuth>} />
      <Route path="/workhub/*" element={<RequireAuth user={user ?? null}><WorkHubPage /></RequireAuth>} />
      <Route path="/voice-lab" element={<RequireAdmin user={user ?? null}><VoiceLabPage /></RequireAdmin>} />
      <Route path="/ai-lab" element={<RequireAdmin user={user ?? null}><AILabPage /></RequireAdmin>} />
      <Route path="/cover-gen-lab" element={<RequireAdmin user={user ?? null}><CoverGenLabPage /></RequireAdmin>} />
      <Route path="/billing" element={<RequireAuth user={user ?? null}><BillingPage /></RequireAuth>} />
      <Route path="/profile" element={<RequireAuth user={user ?? null}><ProfilePage /></RequireAuth>} />
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
        : location.pathname.startsWith('/packs')
          ? 'library'
          : location.pathname.startsWith('/my-quizzes')
            ? 'my-quizzes'
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
        : mobileRouteKey === 'library'
          ? (isAr ? 'المكتبة' : 'Library')
          : mobileRouteKey === 'my-quizzes'
            ? (isAr ? 'تحدياتي' : 'My Challenges')
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
        : mobileRouteKey === 'dashboard'
            ? (isAr ? 'تابع النشاط وانتقل لخطوتك التالية' : 'Review activity and continue your next task')
          : ''

  const mobileTabPriorityByRoute: Record<string, string[]> = {
      dashboard: ['/dashboard', '/workhub', '/editor', '/my-quizzes', '/packs'],
      editor: ['/editor', '/mini-game-editor', '/workhub', '/my-quizzes', '/dashboard'],
      workhub: ['/workhub', '/dashboard', '/editor', '/my-quizzes', '/packs'],
    library: ['/packs', '/my-quizzes', '/dashboard', '/editor', '/profile'],
    'my-quizzes': ['/my-quizzes', '/editor', '/dashboard', '/packs', '/profile'],
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
      links: pickNavItems(['/dashboard', '/my-quizzes', '/packs', '/profile', '/billing']),
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
        <Dialog />
        <VFXContainer />
      </DialogProvider>
    </ToastProvider>
    </UserPrefsContext.Provider>
  )
}

export default App
