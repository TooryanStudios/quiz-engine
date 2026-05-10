import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type GenerationHistoryItem = {
  id: string
  timestamp: number
  prompt: string
  model: string
  provider?: string
  ratio?: string
  resolution?: string
  duration?: number
  generateAudio?: boolean
  status: 'queued' | 'running' | 'success' | 'failed'
  resultUrl?: string
  posterUrl?: string
  errorMessage?: string
  taskId?: string
  submittedAt?: number
  receivedAt?: number
  completedAt?: number
  requestEndpoint?: string
  requestPayload?: Record<string, unknown>
  mediaUrls?: Record<string, string>
  outputDimensions?: string
  projectId?: string
  folderId?: string
  sourceLabel?: string
}

export type ComposerReferenceItem = {
  id: string
  url: string
  kind: 'video' | 'image' | 'audio'
  name: string
}

export type ComposerReuseSeed = {
  id: string
  prompt?: string
  references?: ComposerReferenceItem[]
  ratio?: string
  resolution?: string
  duration?: number
  generateAudio?: boolean
  model?: string
  provider?: string
}

export type LabNewLayoutStoreState = {
  currentComposerPreview: Record<string, unknown> | null
  setCurrentComposerPreview: (preview: Record<string, unknown> | null) => void
  composerPreviewRefreshNonce: number
  requestComposerPreviewRefresh: () => void

  composerReferences: ComposerReferenceItem[]
  setComposerReferences: (references: ComposerReferenceItem[]) => void
  addComposerReference: (item: ComposerReferenceItem) => void
  removeComposerReference: (id: string) => void

  composerReuseSeed: ComposerReuseSeed | null
  setComposerReuseSeed: (seed: ComposerReuseSeed | null) => void

  history: GenerationHistoryItem[]
  addHistoryItem: (item: GenerationHistoryItem) => void
  updateHistoryItem: (id: string, updates: Partial<GenerationHistoryItem>) => void
  removeHistoryItem: (id: string) => void
  clearHistory: () => void
}

export const useLabNewLayoutStore = create<LabNewLayoutStoreState>()(
  persist(
    (set) => ({
      currentComposerPreview: null,
      setCurrentComposerPreview: (preview) => set({ currentComposerPreview: preview }),
      composerPreviewRefreshNonce: 0,
      requestComposerPreviewRefresh: () => set((state) => ({
        composerPreviewRefreshNonce: state.composerPreviewRefreshNonce + 1,
      })),

      composerReferences: [],
      setComposerReferences: (references) => set({ composerReferences: references }),
      addComposerReference: (item) => set((state) => ({
        composerReferences: state.composerReferences.some((r) => r.id === item.id)
          ? state.composerReferences
          : [...state.composerReferences, item],
      })),
      removeComposerReference: (id) => set((state) => ({
        composerReferences: state.composerReferences.filter((r) => r.id !== id),
      })),

      composerReuseSeed: null,
      setComposerReuseSeed: (seed) => set({ composerReuseSeed: seed }),

      history: [],
      addHistoryItem: (item) => set((state) => ({ history: [item, ...state.history] })),
      updateHistoryItem: (id, updates) => set((state) => ({
        history: state.history.map((item) => item.id === id ? { ...item, ...updates } : item)
      })),
      removeHistoryItem: (id) => set((state) => ({
        history: state.history.filter((item) => item.id !== id)
      })),
      clearHistory: () => set({ history: [] }),
    }),
    {
      name: 'lab-newlayout-store-v2', // persistent storage key
      partialize: (state) => ({ history: state.history }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        history: Array.isArray((persistedState as Partial<LabNewLayoutStoreState> | undefined)?.history)
          ? (persistedState as Partial<LabNewLayoutStoreState>).history ?? currentState.history
          : currentState.history,
      }),
    }
  )
)
