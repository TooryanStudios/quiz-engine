import { memo, useEffect, useMemo, useState, type DragEvent as ReactDragEvent } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { Settings } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../../lib/firebase'
import { WORKFLOW_LIBRARY_ITEMS, getNodeIcon } from './nodeLibrary'
import type { WorkflowBuilderNodeKind } from './types'

export const WorkflowBuilderLibrary = memo(function WorkflowBuilderLibrary() {
  const navigate = useNavigate()
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser)

  useEffect(() => {
    return onAuthStateChanged(auth, (nextUser) => {
      setCurrentUser(nextUser)
    })
  }, [])

  const onDragStart = (event: ReactDragEvent<HTMLButtonElement>, kind: WorkflowBuilderNodeKind) => {
    event.dataTransfer.setData('application/workflow-builder-node', kind)
    event.dataTransfer.effectAllowed = 'move'
  }

  const providerLabel = useMemo(() => {
    const providerId = currentUser?.providerData.find((entry) => entry.providerId)?.providerId || ''
    if (providerId === 'google.com') return 'Google'
    if (providerId === 'password') return 'Email'
    if (providerId) return providerId
    return currentUser ? 'Authenticated' : 'Guest'
  }, [currentUser])

  const userDisplayLabel = useMemo(() => {
    const candidate = currentUser?.displayName?.trim() || currentUser?.email?.trim() || ''
    return candidate || 'Guest user'
  }, [currentUser])

  const avatarFallback = useMemo(() => {
    const source = userDisplayLabel.trim()
    return source ? source.charAt(0).toUpperCase() : 'G'
  }, [userDisplayLabel])

  const openUserSettings = () => {
    if (!currentUser) {
      const returnTo = `${window.location.pathname}${window.location.search}`
      navigate(`/login?returnTo=${encodeURIComponent(returnTo)}`)
      return
    }
    navigate('/profile')
  }

  return (
    <div className="workflow-builder-canvas__library-content">
      <div className="workflow-builder-canvas__library-list">
        {WORKFLOW_LIBRARY_ITEMS.map((item) => {
          const Icon = getNodeIcon(item.kind)
          return (
            <button
              key={item.kind}
              type="button"
              className="workflow-builder-canvas__library-item"
              draggable
              onDragStart={(event) => onDragStart(event, item.kind)}
            >
              <span className="workflow-builder-canvas__library-icon"><Icon size={16} /></span>
              <span>
                <strong>{item.label}</strong>
              </span>
            </button>
          )
        })}
      </div>

      <div className="workflow-builder-canvas__library-user-footer">
        <div className="workflow-builder-canvas__library-user-main">
          {currentUser?.photoURL ? (
            <img
              className="workflow-builder-canvas__library-user-avatar"
              src={currentUser.photoURL}
              alt={userDisplayLabel}
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="workflow-builder-canvas__library-user-avatar workflow-builder-canvas__library-user-avatar--fallback">
              {avatarFallback}
            </span>
          )}

          <div className="workflow-builder-canvas__library-user-text">
            <strong>{userDisplayLabel}</strong>
            <span>{providerLabel}</span>
          </div>
        </div>

        <button
          type="button"
          className="workflow-builder-canvas__library-user-settings-btn"
          onClick={openUserSettings}
          title={currentUser ? 'Configure active user settings' : 'Sign in to configure user settings'}
        >
          <Settings size={14} />
          <span>Settings</span>
        </button>
      </div>
    </div>
  )
})