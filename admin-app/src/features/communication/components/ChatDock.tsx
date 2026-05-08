import { useEffect, useRef, useState } from 'react'
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
  isAr,
  onClose,
  layout = 'drawer',
  floatingSide = 'right',
  defaultTargetPath,
  defaultTargetTaskId,
  defaultTargetLabel,
  projectTargetPath,
  projectTargetLabel,
  requestedThreadId,
  requestKey,
}: ChatDockProps) {
  const isFloating = layout === 'floating'
  const [isWarm, setIsWarm] = useState(open)
  const dockRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (open) {
      setIsWarm(true)
      return
    }
    const timer = window.setTimeout(() => setIsWarm(false), CHAT_DOCK_KEEP_ALIVE_MS)
    return () => window.clearTimeout(timer)
  }, [open])

  useEffect(() => {
    if (!open || !isFloating) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (!target) return
      if (dockRef.current?.contains(target)) return
      onClose()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [isFloating, onClose, open])

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
        ref={dockRef}
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
        <MessagesPageView
          embedded
          live={isLive}
          isAr={isAr}
          defaultTargetPath={defaultTargetPath}
          defaultTargetTaskId={defaultTargetTaskId}
          defaultTargetLabel={defaultTargetLabel}
          projectTargetPath={projectTargetPath}
          projectTargetLabel={projectTargetLabel}
          requestedThreadId={requestedThreadId}
          requestKey={requestKey}
        />
      </aside>
    </>
  )
}
