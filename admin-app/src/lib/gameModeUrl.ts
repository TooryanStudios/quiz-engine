export function buildHostGameUrl(params: {
  serverBase: string
  quizId: string
  gameModeId?: string
  launchCode?: string
  hostUid?: string
  hostToken?: string
  hostName?: string
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

  return `${params.serverBase}/start?${query.toString()}`
}
