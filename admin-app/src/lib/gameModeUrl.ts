function isLocalGameHost(serverBase: string): boolean {
  try {
    const { hostname } = new URL(serverBase)
    return hostname === 'localhost' || hostname === '127.0.0.1'
  } catch {
    return /localhost|127\.0\.0\.1/.test(serverBase)
  }
}

export function buildHostGameUrl(params: {
  serverBase: string
  quizId: string
  gameModeId?: string
  themeId?: string
  launchCode?: string
  hostUid?: string
  hostToken?: string
  hostName?: string
  miniGameConfig?: Record<string, unknown>
}): string {
  const query = new URLSearchParams({
    quiz: params.quizId,
    mode: 'host',
  })

  if (params.gameModeId) {
    query.set('gameMode', params.gameModeId)
  }

  if (params.launchCode) {
    query.set('hostLaunchCode', params.launchCode)
  }

  if (params.hostUid) {
    query.set('hostUid', params.hostUid)
  }

  if (params.hostToken) {
    query.set('hostToken', params.hostToken)
  }

  if (params.hostName) {
    query.set('hostName', params.hostName)
  }

  if (params.themeId) {
    query.set('theme', params.themeId)
  }

  if (params.miniGameConfig && typeof params.miniGameConfig === 'object' && Object.keys(params.miniGameConfig).length > 0) {
    try {
      query.set('cfg', JSON.stringify(params.miniGameConfig))
    } catch (_) { /* skip if not serializable */ }
  }

  const path = isLocalGameHost(params.serverBase) ? '/' : '/start'
  return `${params.serverBase}${path}?${query.toString()}`
}

export function buildPlayerGameUrl(params: {
  serverBase: string
  quizId: string
  themeId?: string
}): string {
  const query = new URLSearchParams({
    quiz: params.quizId,
  })

  if (params.themeId) {
    query.set('theme', params.themeId)
  }

  const path = isLocalGameHost(params.serverBase) ? '/' : '/player'
  return `${params.serverBase}${path}?${query.toString()}`
}
