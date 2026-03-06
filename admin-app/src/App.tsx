import { onAuthStateChanged, signOut } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { markSignOut, consumeSignOut } from './lib/signOutState'
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
const ProfilePage     = lazy(() => import('./pages/ProfilePage').then(m => ({ default: m.ProfilePage })))
const QuizEditorPage  = lazy(() => import('./pages/QuizEditorPage').then(m => ({ default: m.QuizEditorPage })))
const QuizPreviewPage = lazy(() => import('./pages/QuizPreviewPage').then(m => ({ default: m.QuizPreviewPage })))
const GameModesPage   = lazy(() => import('./pages/GameModesPage').then(m => ({ default: m.GameModesPage })))
const MasterAdminPage = lazy(() => import('./pages/MasterAdminPage').then(m => ({ default: m.MasterAdminPage })))
const VoiceLabPage    = lazy(() => import('./pages/VoiceLabPage').then(m => ({ default: m.VoiceLabPage })))
const AILabPage       = lazy(() => import('./pages/AILabPage'))
const CoverGenLabPage = lazy(() => import('./pages/CoverGenLabPage'))
const PlayTestPage    = lazy(() => import('./pages/PlayTestPage'))

const MASTER_EMAIL = import.meta.env.VITE_MASTER_EMAIL as string | undefined
const MASTER_PATH  = import.meta.env.VITE_MASTER_PATH  as string | undefined

if (!MASTER_EMAIL || !MASTER_PATH) {
  console.error('[config] VITE_MASTER_EMAIL or VITE_MASTER_PATH is not set. Admin features will be disabled.')
}

function getNav(isAr: boolean) {
  return [
    { to: '/dashboard',        icon: '🏠', label: isAr ? 'الرئيسية' : 'Dashboard', end: true },
    { to: '/editor',           icon: '✏️',  label: isAr ? 'محرر الأسئلة' : 'Quiz Editor' },
    { to: '/mini-game-editor', icon: '🎮', label: isAr ? 'محرر الألعاب' : 'Game Editor' },
    { to: '/my-quizzes',       icon: '📚', label: isAr ? 'اختباراتي' : 'My Quizzes' },
    { to: '/packs',            icon: '📦', label: isAr ? 'المكتبة' : 'Library' },
    { to: '/billing',          icon: '💳', label: isAr ? 'الاشتراك' : 'Billing' },
    { to: '/profile',          icon: '👤', label: isAr ? 'الملف الشخصي' : 'Profile' },
  ]
}

function RequireAuth({ user, children }: { user: User | null; children: ReactElement }) {
  if (!user) return <Navigate to="/login" replace />
  return children
}

function RequireAdmin({ user, children }: { user: User | null; children: ReactElement }) {
  if (!user) return <Navigate to="/login" replace />
  if (!MASTER_EMAIL || user.email !== MASTER_EMAIL) return <Navigate to="/dashboard" replace />
  return children
}

function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const navigate = useNavigate()
  const location = useLocation()
  const isLocalDevHost = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)
  const isLocalPlayTestPath = location.pathname === '/play-test' || location.pathname.startsWith('/play-test/')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [burgerOpen, setBurgerOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)
  const [theme, setTheme] = useState<'dark' | 'light'>(
    () => 'light'
  )
  const [language, setLanguage] = useState<'ar' | 'en'>(
    () => (localStorage.getItem('quizAdminLang') as 'ar' | 'en') || 'ar'
  )
  const isAr = language === 'ar'
  const [slidePanelLayout, setSlidePanelLayout] = useState<'left' | 'bottom'>(
    () => (localStorage.getItem('qyan:slidePanelLayout') as 'left' | 'bottom') || 'left'
  )
  const handleSignOut = useCallback(() => {
    markSignOut()
    localStorage.removeItem('qyan:session')
    void signOut(auth)
  }, [])

  const isLoginPage   = location.pathname === '/login'
  const isMasterPage  = MASTER_PATH ? location.pathname.startsWith(MASTER_PATH) : false
  const isEmbeddedPreview = location.pathname.startsWith('/preview/') && new URLSearchParams(location.search).get('embedded') === '1'
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
    // Safety timeout: if Firebase auth hasn't resolved in 4 s, treat as
    // unauthenticated so the user lands on /login instead of staring at a spinner.
    const authTimeout = setTimeout(() => {
      setUser((prev) => {
        if (prev === undefined) {
          if (!allowUnauthedLocalPlayTest) {
            navigate('/login', { replace: true, state: { signedOut: consumeSignOut() } })
            return null
          }
        }
        return prev
      })
    }, 4000)

    const unsub = onAuthStateChanged(auth, (u) => {
      clearTimeout(authTimeout)
      setUser(u)

      // Persist a cheap hint so future app loads know whether to show the
      // spinner (likely returning session) or skip straight to login.
      if (u) {
        localStorage.setItem('qyan:session', '1')
      } else {
        localStorage.removeItem('qyan:session')
      }

      // Keep initial navigation fast; never block UI on network calls.
      if (u && window.location.pathname === '/login') {
        navigate('/dashboard', { replace: true })
      } else if (!u && window.location.pathname !== '/login' && !(isLocalDevHost && (window.location.pathname === '/play-test' || window.location.pathname.startsWith('/play-test/')))) {
        navigate('/login', { replace: true, state: { signedOut: consumeSignOut() } })
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
        // Always create/update profile so all users appear in admin panel
        void recordUserActivity(u.uid, {
          email: u.email || '',
          displayName: u.displayName || '',
          photoURL: u.photoURL || '',
          platform: isMobile ? 'mobile' : 'desktop',
          createdAt: u.metadata.creationTime || '',
        })
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
  }, [location.pathname])

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

  // No session hint → skip spinner and go straight to login for first-time / logged-out visitors.
  const hasSessionHint = localStorage.getItem('qyan:session') === '1'

  if (user === undefined && !allowUnauthedLocalPlayTest) {
    if (isLoginPage || !hasSessionHint) {
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
      </div>
    )
  }

  // While Firebase has resolved but user is null and we're not yet on /login,
  // show the login page for that frame — prevents the authenticated sidebar flash.
  if (user === null && !isLoginPage && !allowUnauthedLocalPlayTest) {
    return (
      <div className="app-loading-screen">
        <img src={logoImg} alt="QYan" className="app-loading-logo" />
        <div className="app-loading-spinner" />
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

  // ── Embedded Preview — no sidebar, no shell chrome ──
  if (isEmbeddedPreview) {
    return (
      <UserPrefsContext.Provider value={{ language, setLanguage, theme, setTheme, slidePanelLayout, setSlidePanelLayout }}>
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
                    <Route path="/preview/:id" element={<RequireAuth user={user ?? null}><QuizPreviewPage /></RequireAuth>} />
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

  return (
    <UserPrefsContext.Provider value={{ language, setLanguage, theme, setTheme, slidePanelLayout, setSlidePanelLayout }}>
    <ToastProvider>
      <DialogProvider>
        <div className={isLoginPage ? 'login-shell' : `admin-shell${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
          {!isLoginPage && (
            <aside className="admin-sidebar">
              {/* Brand + collapse toggle */}
              <div className="sidebar-header">
                {user && (
                  <div className="header-profile-mobile" ref={profileRef}>
                    <button
                      className="mobile-avatar-btn"
                      onClick={() => { setProfileOpen((o) => !o); setBurgerOpen(false) }}
                      aria-label="Profile menu"
                      title="Profile"
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
                  </div>
                )}

                <h1 className="sidebar-brand">Q<span>Yan</span> Gaming</h1>
                <button
                  className="sidebar-collapse-btn"
                  onClick={() => setSidebarCollapsed((c) => !c)}
                  title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                  {sidebarCollapsed ? '›' : '‹'}
                </button>
              </div>

              {/* Desktop nav */}
              {user && (
                <nav className="sidebar-nav-desktop">
                  {getNav(isAr).map(({ to, icon, label, end }) => {
                    // For editor nav items, resolve to the last-used path (with quiz ID) so
                    // clicking the link returns to the quiz in progress instead of a blank editor.
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

              {/* Desktop user section */}
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

              {/* ── Mobile top-bar controls ── */}
              {user && (
                <div className="mobile-bar-controls">
                  {/* Burger button only */}
                  <button
                    className="burger-btn"
                    onClick={() => { setBurgerOpen((o) => !o); setProfileOpen(false) }}
                    aria-label="Toggle menu"
                    title="Menu"
                  >
                    <span className={`burger-line ${burgerOpen ? 'open-top' : ''}`} />
                    <span className={`burger-line ${burgerOpen ? 'open-mid' : ''}`} />
                    <span className={`burger-line ${burgerOpen ? 'open-bot' : ''}`} />
                  </button>

                  {/* Overlay to close drawer on tap */}
                  {burgerOpen && (
                    <div
                      className="mobile-drawer-overlay"
                      onClick={() => setBurgerOpen(false)}
                      aria-label="Close menu"
                    />
                  )}
                </div>
              )}

              {/* Mobile nav drawer */}
              {user && (
                <nav className={`mobile-nav-drawer ${burgerOpen ? 'drawer-open' : ''}`}>
                  {/* Navigation links */}
                  <div className="mobile-nav-content">
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
                            `mobile-nav-link${(end ? location.pathname === to : location.pathname.startsWith(to)) ? ' active' : ''}`
                          }
                        >
                          <span className="mobile-nav-link-icon">{icon}</span>
                          {label}
                        </NavLink>
                      )
                    })}

                    {user.email === MASTER_EMAIL && MASTER_PATH && (
                      <>
                        <NavLink
                          to="/game-modes"
                          className={({ isActive }) => `mobile-nav-link${isActive ? ' active' : ''}`}
                          style={{ borderTop: '1px solid var(--border)', marginTop: '0.5rem', paddingTop: '0.5rem' }}>
                          <span className="mobile-nav-link-icon">🧩</span>
                          {isAr ? 'أوضاع اللعب' : 'Game Modes'}
                        </NavLink>
                        <NavLink
                          to="/voice-lab"
                          className={({ isActive }) => `mobile-nav-link${isActive ? ' active' : ''}`}
                          style={{ marginTop: '0.5rem' }}>
                          <span className="mobile-nav-link-icon">🎙️</span>
                          {isAr ? 'مختبر الصوت' : 'Voice Lab'}
                        </NavLink>
                        <NavLink
                          to="/ai-lab"
                          className={({ isActive }) => `mobile-nav-link${isActive ? ' active' : ''}`}
                          style={{ marginTop: '0.5rem' }}>
                          <span className="mobile-nav-link-icon">🤖</span>
                          {isAr ? 'مختبر الذكاء' : 'AI Lab'}
                        </NavLink>
                        <NavLink
                          to="/cover-gen-lab"
                          className={({ isActive }) => `mobile-nav-link${isActive ? ' active' : ''}`}
                          style={{ marginTop: '0.5rem' }}>
                          <span className="mobile-nav-link-icon">🖼️</span>
                          {isAr ? 'مختبر الغلاف' : 'Cover Lab'}
                        </NavLink>
                        <NavLink
                          to={`${MASTER_PATH}/dashboard`}
                          className={({ isActive }) => `mobile-nav-link${isActive ? ' active' : ''}`}
                          target="_blank"
                          rel="noopener noreferrer">
                          <span className="mobile-nav-link-icon">👑</span>
                          {isAr ? 'الإدارة ↗' : 'Admin ↗'}
                        </NavLink>
                      </>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="mobile-nav-divider"></div>

                  {/* Profile section in drawer */}
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

                    <button
                      onClick={handleSignOut}
                      className="mobile-signout-btn"
                    >
                      {isAr ? 'تسجيل الخروج' : 'Sign Out'}
                    </button>
                  </div>
                </nav>
              )}
            </aside>
          )}
          <main className={isLoginPage ? 'login-main' : 'admin-main'} data-scrollable="true">
            <ErrorBoundary>
              <Suspense fallback={
                <div className="app-loading-screen">
                  <img src={logoImg} alt="QYan" className="app-loading-logo" />
                  <div className="app-loading-spinner" />
                </div>
              }>
              <Routes>
                <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/dashboard" element={<RequireAuth user={user ?? null}><DashboardPage /></RequireAuth>} />
                <Route path="/editor" element={<RequireAuth user={user ?? null}><QuizEditorPage /></RequireAuth>} />
                <Route path="/editor/:id" element={<RequireAuth user={user ?? null}><QuizEditorPage /></RequireAuth>} />
                <Route path="/mini-game-editor" element={<RequireAuth user={user ?? null}><QuizEditorPage /></RequireAuth>} />
                <Route path="/mini-game-editor/:id" element={<RequireAuth user={user ?? null}><QuizEditorPage /></RequireAuth>} />
                <Route path="/game-modes" element={<RequireAdmin user={user ?? null}><GameModesPage /></RequireAdmin>} />
                <Route path="/play-test" element={allowUnauthedLocalPlayTest ? <PlayTestPage /> : <RequireAdmin user={user ?? null}><PlayTestPage /></RequireAdmin>} />
                <Route path="/play-test/:gameId" element={allowUnauthedLocalPlayTest ? <PlayTestPage /> : <RequireAdmin user={user ?? null}><PlayTestPage /></RequireAdmin>} />
                <Route path="/preview/:id" element={<RequireAuth user={user ?? null}><QuizPreviewPage /></RequireAuth>} />
                <Route path="/packs" element={<RequireAuth user={user ?? null}><PacksPage /></RequireAuth>} />
                <Route path="/my-quizzes" element={<RequireAuth user={user ?? null}><MyQuizzesPage /></RequireAuth>} />
                <Route path="/voice-lab" element={<RequireAdmin user={user ?? null}><VoiceLabPage /></RequireAdmin>} />
                <Route path="/ai-lab" element={<RequireAdmin user={user ?? null}><AILabPage /></RequireAdmin>} />
                <Route path="/cover-gen-lab" element={<RequireAdmin user={user ?? null}><CoverGenLabPage /></RequireAdmin>} />
                <Route path="/billing" element={<RequireAuth user={user ?? null}><BillingPage /></RequireAuth>} />
                <Route path="/profile" element={<RequireAuth user={user ?? null}><ProfilePage /></RequireAuth>} />
              </Routes>
              </Suspense>
            </ErrorBoundary>

          </main>
        </div>{/* end admin-shell */}
        <Dialog />
        <VFXContainer />
      </DialogProvider>
    </ToastProvider>
    </UserPrefsContext.Provider>
  )
}

export default App
