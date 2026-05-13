import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

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

export type PendingGenerationAsset = {
  id: string
  kind: 'image'
  name: string
  createdAt: number
  isPendingGeneration: true
  referenceImageUrl?: string
}

export type AssetPreviewItem = {
  id: string
  url: string
  kind: 'video' | 'image' | 'audio'
  name: string
  thumbnailUrl?: string
  projectId?: string
  folderId?: string | null
  createdAt?: unknown
  generationPrompt?: string
  generationModel?: string
  generationProvider?: string
  generationAspectRatio?: string
  generationResolution?: string
  generationSource?: string
  generationRequestPayload?: Record<string, unknown>
}

export type ComposerReuseSeed = {
  id: string
  prompt?: string
  promptPrefix?: string
  mergePrompt?: boolean
  references?: ComposerReferenceItem[]
  referenceMergeStrategy?: 'replace' | 'append' | 'prepend'
  modeId?: string
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

  assetPreviewItem: AssetPreviewItem | null
  setAssetPreviewItem: (item: AssetPreviewItem | null) => void

  composerReferences: ComposerReferenceItem[]
  setComposerReferences: (references: ComposerReferenceItem[]) => void
  addComposerReference: (item: ComposerReferenceItem) => void
  removeComposerReference: (id: string) => void
  replaceComposerReference: (id: string, newItem: ComposerReferenceItem) => void
  moveComposerReference: (fromIndex: number, toIndex: number) => void

  composerReuseSeed: ComposerReuseSeed | null
  setComposerReuseSeed: (seed: ComposerReuseSeed | null) => void

  history: GenerationHistoryItem[]
  addHistoryItem: (item: GenerationHistoryItem) => void
  updateHistoryItem: (id: string, updates: Partial<GenerationHistoryItem>) => void
  removeHistoryItem: (id: string) => void
  clearHistory: () => void

  pendingGenerationAssets: PendingGenerationAsset[]
  addPendingGenerationAsset: (item: PendingGenerationAsset) => void
  removePendingGenerationAsset: (id: string) => void
}

const LAB_NEWLAYOUT_STORE_KEY = 'lab-newlayout-store-v2'
const HISTORY_MAX_ITEMS = 120
const MAX_PERSISTED_STORE_BYTES = 2_000_000

const trimText = (value: string | undefined, maxLength: number): string | undefined => {
  if (typeof value !== 'string') return undefined
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength)}...`
}

const toPersistedHistoryItem = (item: GenerationHistoryItem): GenerationHistoryItem => ({
  ...item,
  prompt: trimText(item.prompt, 2000) || '',
  errorMessage: trimText(item.errorMessage, 600),
  // Strip canvas data URLs — they are large and only useful for the current session.
  // Firebase Storage URLs are preserved since they are stable and compact.
  posterUrl: item.posterUrl?.startsWith('data:') ? undefined : item.posterUrl,
})

const compactHistoryForPersist = (history: GenerationHistoryItem[]): GenerationHistoryItem[] => {
  return history.slice(0, HISTORY_MAX_ITEMS).map(toPersistedHistoryItem)
}

const selfHealPersistedStoreSnapshot = () => {
  if (typeof window === 'undefined') {
    return
  }

  const raw = window.localStorage.getItem(LAB_NEWLAYOUT_STORE_KEY)
  if (!raw) {
    return
  }

  try {
    const parsed = JSON.parse(raw) as {
      state?: Partial<LabNewLayoutStoreState>
      version?: number
    }
    const nextHistory = compactHistoryForPersist(parsed.state?.history ?? [])
    const mustCompact = raw.length > MAX_PERSISTED_STORE_BYTES
      || nextHistory.length !== (parsed.state?.history?.length ?? 0)

    if (!mustCompact) {
      return
    }

    const repaired = JSON.stringify({
      ...parsed,
      state: {
        ...parsed.state,
        history: nextHistory,
      },
    })

    window.localStorage.setItem(LAB_NEWLAYOUT_STORE_KEY, repaired)
  } catch {
    // If persisted data is malformed or non-recoverable, clear this store only.
    window.localStorage.removeItem(LAB_NEWLAYOUT_STORE_KEY)
  }
}

selfHealPersistedStoreSnapshot()

const quotaSafeLocalStorage: Storage = {
  getItem: (name) => {
    try {
      return window.localStorage.getItem(name)
    } catch {
      return null
    }
  },
  setItem: (name, value) => {
    try {
      window.localStorage.setItem(name, value)
      return
    } catch (error) {
      if (!(error instanceof DOMException) || error.name !== 'QuotaExceededError') {
        return
      }
    }

    try {
      const parsed = JSON.parse(value) as { state?: Partial<LabNewLayoutStoreState>; version?: number }
      const reducedHistory = compactHistoryForPersist(parsed.state?.history ?? []).slice(0, 30)
      const reducedPayload = JSON.stringify({
        ...parsed,
        state: {
          ...parsed.state,
          history: reducedHistory,
        },
      })
      window.localStorage.setItem(name, reducedPayload)
    } catch {
      // Swallow persistence failures to keep the UI responsive.
    }
  },
  removeItem: (name) => {
    try {
      window.localStorage.removeItem(name)
    } catch {
      // ignore storage failures
    }
  },
  clear: () => {
    window.localStorage.clear()
  },
  key: (index) => window.localStorage.key(index),
  get length() {
    return window.localStorage.length
  },
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

      assetPreviewItem: null,
      setAssetPreviewItem: (item) => set({ assetPreviewItem: item }),

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
      replaceComposerReference: (id, newItem) => set((state) => ({
        composerReferences: state.composerReferences.map((r) => r.id === id ? newItem : r),
      })),
      moveComposerReference: (fromIndex, toIndex) => set((state) => {
        if (fromIndex < 0 || fromIndex >= state.composerReferences.length) return { composerReferences: state.composerReferences }
        if (toIndex < 0 || toIndex >= state.composerReferences.length) return { composerReferences: state.composerReferences }
        const newRefs = [...state.composerReferences]
        const [removed] = newRefs.splice(fromIndex, 1)
        newRefs.splice(toIndex, 0, removed)
        return { composerReferences: newRefs }
      }),

      composerReuseSeed: null,
      setComposerReuseSeed: (seed) => set({ composerReuseSeed: seed }),

      history: [],
      addHistoryItem: (item) => set((state) => ({ history: [item, ...state.history].slice(0, HISTORY_MAX_ITEMS) })),
      updateHistoryItem: (id, updates) => set((state) => ({
        history: state.history.map((item) => item.id === id ? { ...item, ...updates } : item)
      })),
      removeHistoryItem: (id) => set((state) => ({
        history: state.history.filter((item) => item.id !== id)
      })),
      clearHistory: () => set({ history: [] }),

      pendingGenerationAssets: [],
      addPendingGenerationAsset: (item) => set((state) => ({
        pendingGenerationAssets: [item, ...state.pendingGenerationAssets],
      })),
      removePendingGenerationAsset: (id) => set((state) => ({
        pendingGenerationAssets: state.pendingGenerationAssets.filter((item) => item.id !== id),
      })),
    }),
    {
      name: LAB_NEWLAYOUT_STORE_KEY,
      storage: createJSONStorage(() => quotaSafeLocalStorage),
      partialize: (state) => ({ history: compactHistoryForPersist(state.history) }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        history: Array.isArray((persistedState as Partial<LabNewLayoutStoreState> | undefined)?.history)
          ? compactHistoryForPersist((persistedState as Partial<LabNewLayoutStoreState>).history ?? currentState.history)
          : currentState.history,
      }),
    }
  )
)
