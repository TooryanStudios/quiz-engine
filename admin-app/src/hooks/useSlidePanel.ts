import { useCallback, useState } from 'react'

export type SlidePanelOrientation = 'left' | 'bottom'

export interface SlidePanelAPI {
  visible: boolean
  orientation: SlidePanelOrientation
  toggle: () => void
  setVisible: (v: boolean) => void
  setOrientation: (o: SlidePanelOrientation) => void
  cycleOrientation: () => void
}

export function useSlidePanel(defaults?: {
  visible?: boolean
  orientation?: SlidePanelOrientation
}): SlidePanelAPI {
  const [visible, setVisible] = useState(defaults?.visible ?? true)
  const [orientation, setOrientation] = useState<SlidePanelOrientation>(
    defaults?.orientation ?? 'left',
  )

  const toggle = useCallback(() => setVisible((v) => !v), [])
  const cycleOrientation = useCallback(
    () => setOrientation((o) => (o === 'left' ? 'bottom' : 'left')),
    [],
  )

  return { visible, orientation, toggle, setVisible, setOrientation, cycleOrientation }
}
