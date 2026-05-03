import { useEffect, useState } from 'react'
import { MessagesPageView } from '../pages/MessagesPage'
import '../communication.css'

const CHAT_DOCK_KEEP_ALIVE_MS = 3 * 60 * 1000

interface ChatDockProps {
  open: boolean
  isAr: boolean
  onClose: () => void
  onOpenMessagesPage: () => void
  currentUser: { uid: string; displayName?: string; email?: string; photoURL?: string } | null
  showOpenPageButton?: boolean
  layout?: 'drawer' | 'floating'
  floatingSide?: 'left' | 'right'
  defaultTargetPath?: string
  defaultTargetTaskId?: string
  defaultTargetLabel?: string
  projectTargetPath?: string
  projectTargetLabel?: string
  requestedThreadId?: string
  requestKey?: number
}

export function ChatDock({
  open,
  onClose,
  layout = 'drawer',
  floatingSide = 'right',
}: ChatDockProps) {
  const isFloating = layout === 'floating'
  const [isWarm, setIsWarm] = useState(open)

  useEffect(() => {
    if (open) {
      setIsWarm(true)
      return
    }
    const timer = window.setTimeout(() => setIsWarm(false), CHAT_DOCK_KEEP_ALIVE_MS)
    return () => window.clearTimeout(timer)
  }, [open])

  const isLive = open || isWarm

  return (
    <>
      {open && !isFloating && (
        <button
          type="button"
          className="shell-chat-dock-overlay"
          aria-label="Close messages"
          onClick={onClose}
        />
      )}
      <aside
        className={`shell-chat-dock${isFloating ? ' is-floating' : ''}${isFloating && floatingSide === 'left' ? ' is-floating-left' : ''}${open ? ' is-open' : ' is-closed'}`}
        role="dialog"
        aria-label="Messages"
        data-open={open ? 'true' : 'false'}
      >
        <button
          type="button"
          className="shell-chat-dock-corner-close"
          aria-label="Close messages"
          onClick={onClose}
          tabIndex={open ? 0 : -1}
        >
          x
        </button>
        <MessagesPageView embedded live={isLive} />
      </aside>
    </>
  )
}
