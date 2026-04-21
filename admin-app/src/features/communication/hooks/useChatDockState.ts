import { useCallback, useEffect, useState } from 'react'

interface UseChatDockStateParams {
  enabled: boolean
  storageKey?: string
  defaultOpen?: boolean
}

export function useChatDockState({
  enabled,
  storageKey = 'qyan:chatDockOpen',
  defaultOpen = false,
}: UseChatDockStateParams) {
  const [open, setOpen] = useState<boolean>(() => {
    if (typeof window === 'undefined') return defaultOpen
    const stored = window.localStorage.getItem(storageKey)
    if (stored === null) return defaultOpen
    return stored === 'true'
  })

  useEffect(() => {
    if (!enabled && open) {
      setOpen(false)
    }
  }, [enabled, open])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(storageKey, open ? 'true' : 'false')
  }, [open, storageKey])

  const toggle = useCallback(() => {
    if (!enabled) return
    setOpen((prev) => !prev)
  }, [enabled])

  const close = useCallback(() => setOpen(false), [])
  const openDock = useCallback(() => {
    if (!enabled) return
    setOpen(true)
  }, [enabled])

  return {
    open,
    setOpen,
    toggle,
    close,
    openDock,
  }
}
