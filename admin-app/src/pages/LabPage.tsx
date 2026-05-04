import type { User } from 'firebase/auth'
import { StudioProvider } from './StudioPage/StudioContext'
import ToorGenPromptWorkbench from './ToorGenLabPage/ToorGenPromptWorkbench'
import './LabPage.css'

type LabPageProps = {
  user: User
}

function LabPageInner() {
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
