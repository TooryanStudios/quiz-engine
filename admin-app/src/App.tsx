import { onAuthStateChanged, signOut } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { useEffect, useState } from 'react'
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import './App.css'
import { auth } from './lib/firebase'
import { BillingPage } from './pages/BillingPage'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { PacksPage } from './pages/PacksPage'
import { QuizEditorPage } from './pages/QuizEditorPage'

function RequireAuth({ user, children }: { user: User | null; children: JSX.Element }) {
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
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <h1>Quiz Engine Admin</h1>
        {user && (
          <nav>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/editor">Quiz Editor</Link>
            <Link to="/packs">Packs</Link>
            <Link to="/billing">Billing</Link>
            <button onClick={() => signOut(auth)} style={{ marginTop: '1rem', cursor: 'pointer' }}>Sign Out</button>
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
          <Route path="/packs" element={<RequireAuth user={user}><PacksPage /></RequireAuth>} />
          <Route path="/billing" element={<RequireAuth user={user}><BillingPage /></RequireAuth>} />
        </Routes>
      </main>
      <div className="tooryan-attribution-admin" aria-label="Prototype attribution">
        <img src="/images/TooryanLogo.png" alt="Tooryan Studios logo" />
        <span>© Tooryan Studios — Prototype build</span>
      </div>
    </div>
  )
}

export default App
