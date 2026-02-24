export async function guardedLaunchGame(options: {
  serverBase: string
  gameUrl: string
  onUnavailable: () => void
  onPopupBlocked?: () => void
  onLaunch?: () => void
}): Promise<void> {
  if (!navigator.onLine) {
    options.onUnavailable()
    return
  }

  const launchTab = window.open(options.gameUrl, '_blank', 'noopener,noreferrer')
  if (!launchTab) {
    options.onPopupBlocked?.()
    return
  }

  options.onLaunch?.()
}
