import type { User } from 'firebase/auth'

type HostLaunchAuthParams = {
  serverBase: string
  currentUser: User | null
}

type HostLaunchAuthResult = {
  launchCode?: string
  hostUid?: string
  hostToken?: string
}

export async function getHostLaunchAuthParams(params: HostLaunchAuthParams): Promise<HostLaunchAuthResult> {
  const { serverBase, currentUser } = params
  if (!currentUser) return {}

  let hostToken: string | undefined
  try {
    hostToken = await currentUser.getIdToken()
  } catch {
    hostToken = undefined
  }

  if (!hostToken) {
    return { hostUid: currentUser.uid }
  }

  try {
    const response = await fetch(`${serverBase}/api/host-launch-code`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${hostToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    })

    if (response.ok) {
      const data = await response.json() as { launchCode?: string }
      if (data?.launchCode && typeof data.launchCode === 'string') {
        return { launchCode: data.launchCode }
      }
    }
  } catch {
    // fall back to legacy token URL flow
  }

  return {
    hostUid: currentUser.uid,
    hostToken,
  }
}
