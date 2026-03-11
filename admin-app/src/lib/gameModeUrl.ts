function isLocalGameHost(serverBase: string): boolean {
  try {
    const { hostname } = new URL(serverBase)
    return hostname === 'localhost' || hostname === '127.0.0.1'
  } catch {
    return /localhost|127\.0\.0\.1/.test(serverBase)
  }
}

function buildLocalHtml5TestUrl(params: { quizId: string; gameModeId?: string }): string | null {
  if (params.gameModeId !== 'html5-target-rush') {
    return null
  }

  if (typeof window === 'undefined') {
    return null
  }

  const query = new URLSearchParams({ quiz: params.quizId })
  return `${window.location.origin}/play-test/html5-target-rush?${query.toString()}`
}

export function buildHostGameUrl(params: {
  serverBase: string
  quizId: string
  gameModeId?: string
  launchCode?: string
  hostUid?: string
  hostToken?: string
  hostName?: string
  miniGameConfig?: Record<string, unknown>
}): string {
  const localHtml5Url = buildLocalHtml5TestUrl({
    quizId: params.quizId,
    gameModeId: params.gameModeId,
  })
  if (localHtml5Url) {
    return localHtml5Url
  }

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

  // NOTE: Theme is resolved server-side from quiz data (quizData.themeId).
  // Hosts receive tokens via socket (room:theme), players via room:joined payload.

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
}): string {
  const query = new URLSearchParams({
    quiz: params.quizId,
  })

  // NOTE: Theme is resolved server-side from quiz data (quizData.themeId).
  // Players receive tokens via room:joined payload.

  const path = isLocalGameHost(params.serverBase) ? '/' : '/player'
  return `${params.serverBase}${path}?${query.toString()}`
}
