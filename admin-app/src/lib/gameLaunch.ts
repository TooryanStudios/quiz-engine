export async function guardedLaunchGame(options: {
  serverBase: string
  gameUrl: string
  /** Window opened synchronously before any async work to avoid popup-blocker on mobile. */
  preOpenedTab?: Window | null
  onUnavailable: () => void
  onPopupBlocked?: () => void
  onLaunch?: () => void
}): Promise<void> {
  if (!navigator.onLine) {
    options.preOpenedTab?.close()
    options.onUnavailable()
    return
  }

  let launchTab: Window | null
  if (options.preOpenedTab) {
    // Tab was already opened synchronously inside the user gesture — just navigate it.
    launchTab = options.preOpenedTab
    launchTab.location.href = options.gameUrl
  } else {
    launchTab = window.open(options.gameUrl, '_blank', 'noopener,noreferrer')
  }

  if (!launchTab) {
    options.onPopupBlocked?.()
    return
  }

  options.onLaunch?.()
}
