import { useCallback, useEffect, useRef, useState } from 'react'

export type PromptWorkbenchDraftState<TStoredModeState, TWorkflowSettings> = {
  activeTabId: string
  workflowSettingsByTabId: Record<string, TWorkflowSettings>
  modeStates: Record<string, TStoredModeState>
}

type UseToorGenPromptWorkbenchStateOptions<TModeState, TWorkflowSettings, TStoredModeState> = {
  fallbackTabId: string
  readStoredDraft: () => PromptWorkbenchDraftState<TStoredModeState, TWorkflowSettings> | null
  createDefaultModeStates: () => Record<string, TModeState>
  createDefaultWorkflowSettingsByTabId: () => Record<string, TWorkflowSettings>
  mergeStoredModeState: (base: TModeState, stored: TStoredModeState) => TModeState
  mergeStoredWorkflowSettings: (base: TWorkflowSettings, stored: TWorkflowSettings) => TWorkflowSettings
  createDefaultModeState: (tabId: string) => TModeState
  createDefaultWorkflowSettings: () => TWorkflowSettings
  buildStoredModeState: (state: TModeState) => TStoredModeState
  persistDraft: (draft: PromptWorkbenchDraftState<TStoredModeState, TWorkflowSettings>) => void
  persistDebounceMs?: number
}

const createInitialPromptWorkbenchState = <TModeState, TWorkflowSettings, TStoredModeState>({
  fallbackTabId,
  readStoredDraft,
  createDefaultModeStates,
  createDefaultWorkflowSettingsByTabId,
  mergeStoredModeState,
  mergeStoredWorkflowSettings,
}: Pick<
  UseToorGenPromptWorkbenchStateOptions<TModeState, TWorkflowSettings, TStoredModeState>,
  'fallbackTabId'
  | 'readStoredDraft'
  | 'createDefaultModeStates'
  | 'createDefaultWorkflowSettingsByTabId'
  | 'mergeStoredModeState'
  | 'mergeStoredWorkflowSettings'
>) => {
  const modeStates = createDefaultModeStates()
  const workflowSettingsByTabId = createDefaultWorkflowSettingsByTabId()
  const storedDraft = readStoredDraft()

  if (storedDraft?.modeStates) {
    Object.entries(storedDraft.modeStates).forEach(([tabId, storedState]) => {
      if (!modeStates[tabId]) {
        return
      }
      modeStates[tabId] = mergeStoredModeState(modeStates[tabId], storedState)
    })
  }

  if (storedDraft?.workflowSettingsByTabId) {
    Object.entries(storedDraft.workflowSettingsByTabId).forEach(([tabId, storedSettings]) => {
      if (!workflowSettingsByTabId[tabId]) {
        return
      }
      workflowSettingsByTabId[tabId] = mergeStoredWorkflowSettings(workflowSettingsByTabId[tabId], storedSettings)
    })
  }

  const activeTabId = storedDraft?.activeTabId && modeStates[storedDraft.activeTabId]
    ? storedDraft.activeTabId
    : fallbackTabId

  return {
    activeTabId,
    modeStates,
    workflowSettingsByTabId,
  }
}

export function useToorGenPromptWorkbenchState<TModeState, TWorkflowSettings, TStoredModeState>({
  fallbackTabId,
  readStoredDraft,
  createDefaultModeStates,
  createDefaultWorkflowSettingsByTabId,
  mergeStoredModeState,
  mergeStoredWorkflowSettings,
  createDefaultModeState,
  createDefaultWorkflowSettings,
  buildStoredModeState,
  persistDraft,
  persistDebounceMs = 1000,
}: UseToorGenPromptWorkbenchStateOptions<TModeState, TWorkflowSettings, TStoredModeState>) {
  const initialStateRef = useRef<{
    activeTabId: string
    modeStates: Record<string, TModeState>
    workflowSettingsByTabId: Record<string, TWorkflowSettings>
  } | null>(null)

  if (!initialStateRef.current) {
    initialStateRef.current = createInitialPromptWorkbenchState({
      fallbackTabId,
      readStoredDraft,
      createDefaultModeStates,
      createDefaultWorkflowSettingsByTabId,
      mergeStoredModeState,
      mergeStoredWorkflowSettings,
    })
  }

  const [activeTabId, setActiveTabId] = useState(initialStateRef.current.activeTabId)
  const [modeStates, setModeStates] = useState(initialStateRef.current.modeStates)
  const [workflowSettingsByTabId, setWorkflowSettingsByTabId] = useState(initialStateRef.current.workflowSettingsByTabId)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      persistDraft({
        activeTabId,
        workflowSettingsByTabId,
        modeStates: Object.fromEntries(
          Object.entries(modeStates).map(([tabId, state]) => [tabId, buildStoredModeState(state)]),
        ),
      })
    }, persistDebounceMs)

    return () => {
      window.clearTimeout(timer)
    }
  }, [activeTabId, buildStoredModeState, modeStates, persistDebounceMs, persistDraft, workflowSettingsByTabId])

  const updateModeState = useCallback((tabId: string, updater: (current: TModeState) => TModeState) => {
    setModeStates((current) => ({
      ...current,
      [tabId]: updater(current[tabId] ?? createDefaultModeState(tabId)),
    }))
  }, [createDefaultModeState])

  const updateWorkflowSettings = useCallback((tabId: string, updater: (current: TWorkflowSettings) => TWorkflowSettings) => {
    setWorkflowSettingsByTabId((current) => ({
      ...current,
      [tabId]: updater(current[tabId] ?? createDefaultWorkflowSettings()),
    }))
  }, [createDefaultWorkflowSettings])

  return {
    activeTabId,
    setActiveTabId,
    modeStates,
    setModeStates,
    workflowSettingsByTabId,
    updateModeState,
    updateWorkflowSettings,
  }
}