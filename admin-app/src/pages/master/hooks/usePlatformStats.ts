import { useEffect, useState } from 'react'
import { subscribePlatformStats, type PlatformStats } from '../../../lib/adminRepo'

const DEFAULT: PlatformStats = {
  upgradeClicks: 0,
  aiGenerateClicks: 0,
  aiRecheckClicks: 0,
  mobileVisits: 0,
  desktopVisits: 0,
  quizCreated: 0,
  sessionHosted: 0,
  checkoutStarted: 0,
  voiceLabTests: 0,
}

export function usePlatformStats(): PlatformStats {
  const [stats, setStats] = useState<PlatformStats>(DEFAULT)
  useEffect(() => subscribePlatformStats(setStats), [])
  return stats
}
