import { useEffect, useState } from 'react'
import {
  DEFAULT_ENABLED_MINI_GAME_IDS,
  MINI_GAME_DEFAULT_ACCESS_BY_ID,
  MINI_GAME_DEFAULT_ARABIC_NAMES,
  MINI_GAME_DEFAULT_ENGLISH_NAMES,
  type MiniGameAccessTier,
  type MiniGameId,
} from '../../../config/miniGames'
import { subscribeMiniGameSettings, updateMiniGameSettings } from '../../../lib/adminRepo'

interface State {
  enabledMiniGameIds: MiniGameId[]
  englishNamesById: Record<MiniGameId, string>
  arabicNamesById: Record<MiniGameId, string>
  accessById: Record<MiniGameId, MiniGameAccessTier>
  updatedAt?: { toDate(): Date }
}

const DEFAULT_STATE: State = {
  enabledMiniGameIds: [...DEFAULT_ENABLED_MINI_GAME_IDS],
  englishNamesById: { ...MINI_GAME_DEFAULT_ENGLISH_NAMES },
  arabicNamesById: { ...MINI_GAME_DEFAULT_ARABIC_NAMES },
  accessById: { ...MINI_GAME_DEFAULT_ACCESS_BY_ID },
}

export function useMiniGameSettings() {
  const [state, setState] = useState<State>(DEFAULT_STATE)

  useEffect(() => {
    return subscribeMiniGameSettings((settings) => {
      setState({
        enabledMiniGameIds: settings.enabledMiniGameIds,
        englishNamesById: settings.englishNamesById,
        arabicNamesById: settings.arabicNamesById,
        accessById: settings.accessById,
        updatedAt: settings.updatedAt,
      })
    })
  }, [])

  const save = async (
    nextEnabled: MiniGameId[],
    nextEnglishNamesById: Record<MiniGameId, string>,
    nextArabicNamesById: Record<MiniGameId, string>,
    nextAccessById: Record<MiniGameId, MiniGameAccessTier>,
    uid?: string,
  ) => {
    await updateMiniGameSettings(nextEnabled, nextEnglishNamesById, nextArabicNamesById, nextAccessById, uid)
  }

  return { ...state, save }
}
