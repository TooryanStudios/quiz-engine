import { useEffect, useMemo, useState } from 'react'

export type ToorGenDetailRailMode = 'expanded' | 'compact' | 'hidden'

const DEFAULT_DETAIL_RAIL_MODE: ToorGenDetailRailMode = 'expanded'

function readPersistedDetailRailMode(storageKey: string, fallbackMode: ToorGenDetailRailMode): ToorGenDetailRailMode {
  if (typeof window === 'undefined') return fallbackMode
  try {
    const persisted = window.localStorage.getItem(storageKey)
    if (persisted === 'expanded' || persisted === 'compact' || persisted === 'hidden') {
      return persisted
    }
  } catch {
    // Use the requested fallback when localStorage is unavailable.
  }
  return fallbackMode
}

export function useToorGenDetailRailMode(
  storageKey: string,
  enabled: boolean,
  defaultMode: ToorGenDetailRailMode = DEFAULT_DETAIL_RAIL_MODE,
) {
  const [mode, setMode] = useState<ToorGenDetailRailMode>(() => readPersistedDetailRailMode(storageKey, defaultMode))

  useEffect(() => {
    if (!enabled && mode !== defaultMode) {
      setMode(defaultMode)
    }
  }, [defaultMode, enabled, mode])

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return
    try {
      window.localStorage.setItem(storageKey, mode)
    } catch {
      // Ignore localStorage failures.
    }
  }, [enabled, mode, storageKey])

  const controls = useMemo(() => ({
    setExpanded: () => setMode('expanded' as const),
    setCompact: () => setMode('compact' as const),
    setHidden: () => setMode('hidden' as const),
    toggleCompact: () => setMode((current) => (current === 'compact' ? 'expanded' : 'compact')),
  }), [])

  return {
    mode,
    setMode,
    ...controls,
  }
}