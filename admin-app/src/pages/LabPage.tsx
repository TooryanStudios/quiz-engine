import type { User } from 'firebase/auth'
import { useLocation } from 'react-router-dom'
import LabNewLayoutPage from './LabNewLayoutPage'
import { StudioProvider } from './StudioPage/StudioContext'
import ToorGenPromptWorkbench from './ToorGenLabPage/ToorGenPromptWorkbench'
import './LabPage.css'

type LabPageProps = {
  user: User
}

function LabPageInner() {
  const location = useLocation()
  const isNewLayoutPage = location.pathname === '/lab/newlayout' || location.pathname.startsWith('/lab/newlayout/')

  if (isNewLayoutPage) {
    return <LabNewLayoutPage />
  }

  return (
    <div className="lab-standalone-shell">
      <ToorGenPromptWorkbench />
    </div>
  )
}

export function LabPage({ user }: LabPageProps) {
  const identity = {
    uid: user.uid,
    displayName: user.displayName ?? '',
    email: user.email ?? '',
    photoUrl: user.photoURL ?? '',
  }

  return (
    <StudioProvider user={identity}>
      <LabPageInner />
    </StudioProvider>
  )
}

export default LabPage
