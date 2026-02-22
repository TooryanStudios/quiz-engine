import { onAuthStateChanged, signOut } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { useEffect, useState } from 'react'
import type { ReactElement } from 'react'
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
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

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => {
      setUser(u)
      if (u && window.location.pathname === '/login') {
        navigate('/dashboard', { replace: true })
      }
    })
  }, [navigate])

  if (user === undefined) {
    return <div style={{ padding: '2rem' }}>Loading...</div>
  }

  return (
    <ToastProvider>
      <DialogProvider>
        <div className="admin-shell">
          <aside className="admin-sidebar">
            <h1>Quiz Engine Admin</h1>
            {user && (
              <nav>
                <Link to="/dashboard">Dashboard</Link>
                <Link to="/editor">Quiz Editor</Link>
                <Link to="/packs">Packs</Link>
                <Link to="/billing">Billing</Link>
              </nav>
            )}
            {user && (
              <div className="sidebar-user">
                <div className="sidebar-user-chip">
                  {user.photoURL ? (
                    <img
                      src={user.photoURL}
                      referrerPolicy="no-referrer"
                      alt=""
                      className="sidebar-user-avatar"
                    />
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
