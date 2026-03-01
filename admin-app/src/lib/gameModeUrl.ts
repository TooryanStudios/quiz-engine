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

  if (params.miniGameConfig && typeof params.miniGameConfig === 'object' && Object.keys(params.miniGameConfig).length > 0) {
    try {
      query.set('cfg', JSON.stringify(params.miniGameConfig))
    } catch (_) { /* skip if not serializable */ }
  }

  return `${params.serverBase}/start?${query.toString()}`
}
