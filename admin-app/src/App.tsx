import { onAuthStateChanged, signOut } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { useEffect, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import './App.css'
import { auth } from './lib/firebase'
import { DialogProvider } from './lib/DialogContext'
import { ToastProvider } from './lib/ToastContext'
import { Dialog } from './components/Dialog'
import { BillingPage } from './pages/BillingPage'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { PacksPage } from './pages/PacksPage'
import { ProfilePage } from './pages/ProfilePage'
import { QuizEditorPage } from './pages/QuizEditorPage'
import { QuizPreviewPage } from './pages/QuizPreviewPage'

const NAV = [
  { to: '/dashboard', icon: '🏠', label: 'Dashboard', end: true },
  { to: '/editor',    icon: '✏️',  label: 'Quiz Editor' },
  { to: '/packs',     icon: '📦', label: 'Packs' },
  { to: '/billing',   icon: '💳', label: 'Billing' },
]

function RequireAuth({ user, children }: { user: User | null; children: ReactElement }) {
  if (!user) return <Navigate to="/login" replace />
  return children
}

function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [burgerOpen, setBurgerOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)
  const [theme, setTheme] = useState<'dark' | 'light'>(
    () => (localStorage.getItem('quizAdminTheme') as 'dark' | 'light') || 'dark'
  )

  // Apply theme to document body
  useEffect(() => {
    document.body.setAttribute('data-theme', theme)
    localStorage.setItem('quizAdminTheme', theme)
  }, [theme])

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      if (u && window.location.pathname === '/login') {
        navigate('/dashboard', { replace: true })
      }
    })
  }, [navigate])

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

  if (user === undefined) {
    return <div style={{ padding: '2rem' }}>Loading...</div>
  }

  return (
    <ToastProvider>
      <DialogProvider>
        <div className={`admin-shell${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
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
                      <div className="sidebar-user-avatar sidebar-user-initials" style={{ fontSize: '0.65rem' }}>
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
                        👤 Visit Profile
                      </button>
                      <button
                        className="header-profile-action danger"
                        onClick={() => signOut(auth)}
                        type="button"
                      >
                        🚪 Sign Out
                      </button>
                    </div>
                  )}
                </div>
              )}

              <h1 className="sidebar-brand">Quiz Engine Admin</h1>
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
                {NAV.map(({ to, icon, label, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                  >
                    <span className="nav-icon">{icon}</span>
                    <span className="nav-label">{label}</span>
                  </NavLink>
                ))}
              </nav>
            )}

            {/* Desktop user section */}
            {user && (
              <div className="sidebar-user">
                <div className="sidebar-user-chip">
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
                </div>
                <button onClick={() => signOut(auth)} className="sidebar-signout-btn">Sign Out</button>
                <div className="theme-toggle-row">
                  <span className="theme-toggle-label">Theme</span>
                  <div className="theme-pill">
                    <button
                      className={`theme-pill-btn${theme === 'dark' ? ' active' : ''}`}
                      onClick={() => setTheme('dark')}
                      title="Dark theme"
                    >🌙</button>
                    <button
                      className={`theme-pill-btn${theme === 'light' ? ' active' : ''}`}
                      onClick={() => setTheme('light')}
                      title="Light theme"
                    >☀️</button>
                  </div>
                </div>
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
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {NAV.map(({ to, icon, label, end }) => (
                    <NavLink
                      key={to}
                      to={to}
                      end={end}
                      className={({ isActive }) => isActive ? 'active' : ''}
                    >
                      <span style={{ marginRight: '0.6rem' }}>{icon}</span>
                      {label}
                    </NavLink>
                  ))}
                </div>

                {/* Divider */}
                <div style={{ height: '1px', background: 'var(--border)', margin: '0.5rem 0' }}></div>

                {/* Profile section in drawer */}
                <div style={{ padding: '12px 0' }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '12px 20px',
                    marginBottom: '0.5rem',
                  }}>
                    {user.photoURL ? (
                      <img src={user.photoURL} referrerPolicy="no-referrer" alt="" style={{ width: 32, height: 32, borderRadius: '50%' }} />
                    ) : (
                      <div className="sidebar-user-avatar sidebar-user-initials" style={{ width: 32, height: 32, fontSize: '0.7rem' }}>
                        {(user.displayName || user.email || '?').slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text)' }}>
                        {user.displayName || user.email?.split('@')[0]}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {user.email}
                      </div>
                    </div>
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 20px',
                    fontSize: '0.85rem',
                    color: 'var(--text-dim)',
                    marginBottom: '0.5rem',
                  }}>
                    <span>Theme</span>
                    <div className="theme-pill">
                      <button
                        className={`theme-pill-btn${theme === 'dark' ? ' active' : ''}`}
                        onClick={() => setTheme('dark')}
                        title="Dark theme"
                      >🌙</button>
                      <button
                        className={`theme-pill-btn${theme === 'light' ? ' active' : ''}`}
                        onClick={() => setTheme('light')}
                        title="Light theme"
                      >☀️</button>
                    </div>
                  </div>

                  <button
                    onClick={() => signOut(auth)}
                    style={{
                      width: 'calc(100% - 40px)',
                      margin: '0 20px',
                      background: 'transparent',
                      border: '1px solid var(--border-mid)',
                      color: '#f87171',
                      fontSize: '0.85rem',
                      fontWeight: 600,
                      padding: '10px 12px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      transition: 'background 0.15s, border-color 0.15s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = 'var(--bg-deep)';
                      e.currentTarget.style.borderColor = 'var(--border-strong)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.borderColor = 'var(--border-mid)';
                    }}
                  >
                    Sign Out
                  </button>
                </div>
              </nav>
            )}
          </aside>
          <main className="admin-main">
            <Routes>
              <Route path="/" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/dashboard" element={<RequireAuth user={user}><DashboardPage /></RequireAuth>} />
              <Route path="/editor" element={<RequireAuth user={user}><QuizEditorPage /></RequireAuth>} />
              <Route path="/editor/:id" element={<RequireAuth user={user}><QuizEditorPage /></RequireAuth>} />
              <Route path="/preview/:id" element={<RequireAuth user={user}><QuizPreviewPage /></RequireAuth>} />
              <Route path="/packs" element={<RequireAuth user={user}><PacksPage /></RequireAuth>} />
              <Route path="/billing" element={<RequireAuth user={user}><BillingPage /></RequireAuth>} />
              <Route path="/profile" element={<RequireAuth user={user}><ProfilePage /></RequireAuth>} />
            </Routes>
          </main>
          <div className="tooryan-attribution-admin" aria-label="Prototype attribution">
            <span>© Tooryan Studios — Prototype build</span>
          </div>
        </div>
        <Dialog />
      </DialogProvider>
    </ToastProvider>
  )
}

export default App
