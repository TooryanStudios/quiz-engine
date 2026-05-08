import { createContext, useContext } from 'react'

export type LabNewLayoutUiSettingsContextValue = {
  canApplyPreset: boolean
  canManageTabClosing: boolean
  canSavePreset: boolean
  canUpdatePreset: boolean
  isTabClosingEnabled: boolean
  presetDraftName: string
  presets: Array<{ id: string; name: string }>
  selectedPresetId: string
  onApplyPreset: () => void
  onPresetDraftNameChange: (value: string) => void
  onResetLayout: () => void
  onSavePreset: () => void
  onSelectedPresetIdChange: (value: string) => void
  onSetTabClosingEnabled: (value: boolean) => void
  onUpdatePreset: () => void
}

export const LabNewLayoutUiSettingsContext = createContext<LabNewLayoutUiSettingsContextValue | null>(null)

export function useLabNewLayoutUiSettings() {
  const context = useContext(LabNewLayoutUiSettingsContext)
  if (!context) {
    throw new Error('LabNewLayoutUiSettingsContext is not available')
  }
  return context
}