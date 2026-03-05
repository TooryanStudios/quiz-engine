import { createContext, useContext } from 'react'

export interface UserPrefsContextValue {
  language: 'ar' | 'en'
  setLanguage: (lang: 'ar' | 'en') => void
  theme: 'dark' | 'light'
  setTheme: (t: 'dark' | 'light') => void
  slidePanelLayout: 'left' | 'bottom'
  setSlidePanelLayout: (l: 'left' | 'bottom') => void
}

export const UserPrefsContext = createContext<UserPrefsContextValue>({
  language: 'ar',
  setLanguage: () => {},
  theme: 'light',
  setTheme: () => {},
  slidePanelLayout: 'left',
  setSlidePanelLayout: () => {},
})

export function useUserPrefs() {
  return useContext(UserPrefsContext)
}
