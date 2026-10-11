import { onAuthStateChanged } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import type { ReactElement } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import './App.css'
import { ChatDock } from './features/communication/components/ChatDock'
import { CHAT_DOCK_OPEN_EVENT } from './features/communication/utils/chatDockEvents'
import { Dialog } from './components/Dialog'
import { ErrorBoundary } from './components/ErrorBoundary'
import { DialogProvider } from './lib/DialogContext'
import { auth } from './lib/firebase'
import { ToastProvider } from './lib/ToastContext'
import { LoginPage } from './pages/LoginPage'
import { WorkhubJoinPage } from './pages/workhub/WorkhubJoinPage'

const WorkHubRoutePage = lazy(() => import('./pages/WorkHubPage'))

function WorkhubLoadingScreen({ note }: { note: string }) {
  return (
    <div className="app-loading-screen is-workhub">
      <div className="app-loading-workhub-badge" aria-hidden="true">W</div>
      <div className="app-loading-workhub-copy">
        <strong>WorkHub</strong>
        <span>{note}</span>
      </div>
      <div className="app-loading-spinner app-loading-spinner-workhub" />
    </div>
  )
}

function RequireAuth({ user, children }: { user: User | null | undefined; children: ReactElement }) {
  const location = useLocation()

  if (user === undefined) {
    return <WorkhubLoadingScreen note="Checking your session..." />
  }

  if (!user) {
    const returnTo = `${location.pathname}${location.search}`
    return <Navigate to={`/workhub/login?returnTo=${encodeURIComponent(returnTo)}`} replace state={{ returnTo }} />
  }

  return children
}

export default function WorkhubStandaloneApp() {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const [chatOpen,setChatOpen]=useState(false)
  useEffect(()=>{const open=()=>setChatOpen(true);window.addEventListener(CHAT_DOCK_OPEN_EVENT,open);return()=>window.removeEventListener(CHAT_DOCK_OPEN_EVENT,open)},[])
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser)
    })
    return unsub
  }, [])

  useEffect(() => {
    if (!user) return
    if (!['/login', '/workhub/login'].includes(location.pathname)) return
    const params = new URLSearchParams(location.search)
    const returnTo = params.get('returnTo') || '/workhub'
    const safeReturnTo = returnTo.startsWith('/workhub') && !returnTo.startsWith('/workhub/login') ? returnTo : '/workhub'
    navigate(safeReturnTo, { replace: true })
  }, [location.pathname, location.search, navigate, user])

  useEffect(() => {
    const path = location.pathname
    if (path === '/login' || path === '/workhub/login') {
      document.title = 'WorkHub Login'
      return
    }
    document.title = 'WorkHub'
  }, [location.pathname])

  const appRoutes = useMemo(
    () => (
      <Routes>
        <Route path="/" element={<Navigate to="/workhub" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/workhub/login" element={<LoginPage />} />
        <Route path="/workhub/join" element={<RequireAuth user={user}><WorkhubJoinPage user={user as User} /></RequireAuth>} />
        <Route
          path="/workhub/*"
          element={
            <RequireAuth user={user}>
              <WorkHubRoutePage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/workhub" replace />} />
      </Routes>
    ),
    [user],
  )

  return (
    <ToastProvider>
      <DialogProvider>
        <div className="master-admin-standalone">
          <ErrorBoundary>
            <Suspense fallback={<WorkhubLoadingScreen note="Loading WorkHub..." />}>
              {appRoutes}
            </Suspense>
          </ErrorBoundary>
          {user&&<ChatDock open={chatOpen} isAr={document.documentElement.lang.startsWith('ar')} onClose={()=>setChatOpen(false)} onOpenMessagesPage={()=>setChatOpen(true)} currentUser={{uid:user.uid,displayName:user.displayName||undefined,email:user.email||undefined,photoURL:user.photoURL||undefined}} layout="floating"/>}
          <Dialog />
        </div>
      </DialogProvider>
    </ToastProvider>
  )
}
