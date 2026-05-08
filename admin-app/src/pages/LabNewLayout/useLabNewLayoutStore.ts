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

export type LabNewLayoutStoreState = {
  currentComposerPreview: Record<string, unknown> | null
  setCurrentComposerPreview: (preview: Record<string, unknown> | null) => void

  composerReferences: ComposerReferenceItem[]
  setComposerReferences: (references: ComposerReferenceItem[]) => void
  
  history: GenerationHistoryItem[]
  addHistoryItem: (item: GenerationHistoryItem) => void
  updateHistoryItem: (id: string, updates: Partial<GenerationHistoryItem>) => void
  clearHistory: () => void
}

export const useLabNewLayoutStore = create<LabNewLayoutStoreState>()(
  persist(
    (set) => ({
      currentComposerPreview: null,
      setCurrentComposerPreview: (preview) => set({ currentComposerPreview: preview }),

      composerReferences: [],
      setComposerReferences: (references) => set({ composerReferences: references }),

      history: [],
      addHistoryItem: (item) => set((state) => ({ history: [item, ...state.history] })),
      updateHistoryItem: (id, updates) => set((state) => ({
        history: state.history.map((item) => item.id === id ? { ...item, ...updates } : item)
      })),
      clearHistory: () => set({ history: [] }),
    }),
    {
      name: 'lab-newlayout-store-v2', // persistent storage key
      partialize: (state) => ({ history: state.history }), // only save history to localStorage
    }
  )
)
