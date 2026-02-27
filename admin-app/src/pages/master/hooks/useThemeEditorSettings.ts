import { useEffect, useState } from 'react'
import {
  type ThemePackRecord,
  subscribeThemeEditorSettings,
  updateThemeEditorSettings,
} from '../../../lib/adminRepo'

interface State {
  themes: ThemePackRecord[]
  updatedAt?: { toDate(): Date }
}

const DEFAULT_STATE: State = {
  themes: [],
}

export function useThemeEditorSettings() {
  const [state, setState] = useState<State>(DEFAULT_STATE)

  useEffect(() => {
    return subscribeThemeEditorSettings((settings) => {
      setState({
        themes: settings.themes,
        updatedAt: settings.updatedAt,
      })
    })
  }, [])

  const save = async (themes: ThemePackRecord[], uid?: string) => {
    await updateThemeEditorSettings(themes, uid)
  }

  return { ...state, save }
}
