import { onAuthStateChanged, signOut } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { useEffect, useRef, useState } from 'react'
import type { ReactElement } from 'react'
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import './App.css'
import { auth } from './lib/firebase'
import { DialogProvider } from './lib/DialogContext'
import { ToastProvider } from './lib/ToastContext'
import { Dialog } from './components/Dialog'
import { BillingPage } from './pages/BillingPage'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { PacksPage } from './pages/PacksPage'
import { QuizEditorPage } from './pages/QuizEditorPage'
import { QuizPreviewPage } from './pages/QuizPreviewPage'

function RequireAuth({ user, children }: { user: User | null; children: ReactElement }) {
  if (!user) return <Navigate to="/login" replace />
  return children
}

function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const navigate = useNavigate()
  const location = useLocation()
  const [burgerOpen, setBurgerOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

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
        <div className="admin-shell">
          <aside className="admin-sidebar">
            {/* Brand */}
            <h1>Quiz Engine Admin</h1>

            {/* Desktop nav */}
            {user && (
              <nav className="sidebar-nav-desktop">
                <Link to="/dashboard">Dashboard</Link>
                <Link to="/editor">Quiz Editor</Link>
                <Link to="/packs">Packs</Link>
                <Link to="/billing">Billing</Link>
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
              </div>
            )}

            {/* ── Mobile top-bar controls ── */}
            {user && (
              <div className="mobile-bar-controls">
                {/* Profile avatar → dropdown */}
                <div className="mobile-profile-wrap" ref={profileRef}>
                  <button
                    className="mobile-avatar-btn"
                    onClick={() => { setProfileOpen((o) => !o); setBurgerOpen(false) }}
                    aria-label="Profile menu"
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
                    <div className="mobile-profile-dropdown">
                      <div className="mobile-profile-header">
                        {user.photoURL ? (
                          <img src={user.photoURL} referrerPolicy="no-referrer" alt="" style={{ width: 36, height: 36, borderRadius: '50%' }} />
                        ) : (
                          <div className="sidebar-user-avatar sidebar-user-initials" style={{ width: 36, height: 36, fontSize: '0.75rem' }}>
                            {(user.displayName || user.email || '?').slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#f1f5f9' }}>
                            {user.displayName || user.email?.split('@')[0]}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{user.email}</div>
                        </div>
                      </div>
                      <button
                        onClick={() => signOut(auth)}
                        className="mobile-profile-signout"
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>

                {/* Burger button */}
                <button
                  className="burger-btn"
                  onClick={() => { setBurgerOpen((o) => !o); setProfileOpen(false) }}
                  aria-label="Toggle menu"
                >
                  <span className={`burger-line ${burgerOpen ? 'open-top' : ''}`} />
                  <span className={`burger-line ${burgerOpen ? 'open-mid' : ''}`} />
                  <span className={`burger-line ${burgerOpen ? 'open-bot' : ''}`} />
                </button>
              </div>
            )}

            {/* Mobile nav drawer */}
            {user && (
              <nav className={`mobile-nav-drawer ${burgerOpen ? 'drawer-open' : ''}`}>
                <Link to="/dashboard">Dashboard</Link>
                <Link to="/editor">Quiz Editor</Link>
                <Link to="/packs">Packs</Link>
                <Link to="/billing">Billing</Link>
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
