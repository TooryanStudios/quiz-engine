import type { User } from 'firebase/auth'
import { loadUserPrefs } from './adminRepo'

type HostLaunchAuthParams = {
  serverBase: string
  currentUser: User | null
}

type HostLaunchAuthResult = {
  launchCode?: string
  hostUid?: string
  hostToken?: string
  hostName?: string
  hostAvatar?: string
}

export async function getHostLaunchAuthParams(params: HostLaunchAuthParams): Promise<HostLaunchAuthResult> {
  const { serverBase, currentUser } = params
  if (!currentUser) return {}

  const prefs = await loadUserPrefs(currentUser.uid).catch(() => null)
  const profileName = prefs?.gameDisplayName?.trim()
  const hostName = profileName && profileName.length > 0 ? profileName : undefined
  const hostAvatar = prefs?.gameAvatar?.trim() || undefined

  let hostToken: string | undefined
  try {
    hostToken = await currentUser.getIdToken()
  } catch {
    hostToken = undefined
  }

  if (!hostToken) {
    return { hostUid: currentUser.uid, hostName, hostAvatar }
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
        return { launchCode: data.launchCode, hostName, hostAvatar }
      }
    }
  } catch {
    // fall back to legacy token URL flow
  }

  return {
    hostUid: currentUser.uid,
    hostToken,
    hostName,
    hostAvatar,
  }
}
