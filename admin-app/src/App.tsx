import { Link, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import { BillingPage } from './pages/BillingPage'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { PacksPage } from './pages/PacksPage'
import { QuizEditorPage } from './pages/QuizEditorPage'

function App() {
  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <h1>Quiz Engine Admin</h1>
        <nav>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/editor">Quiz Editor</Link>
          <Link to="/packs">Packs</Link>
          <Link to="/billing">Billing</Link>
          <Link to="/login">Login</Link>
        </nav>
      </aside>
      <main className="admin-main">
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/editor" element={<QuizEditorPage />} />
          <Route path="/packs" element={<PacksPage />} />
          <Route path="/billing" element={<BillingPage />} />
        </Routes>
      </main>
    </div>
  )
}

export default App
