import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useStudioProjectSelection } from '../../hooks/useStudioProjectSelection'
import { saveProjectNewLayoutConfig, subscribeToProjectNewLayoutConfig, subscribeToProjectReferenceLibrary } from '../../lib/studioService'
import type { FolderSummary, ProjectSummary, StudioProjectComposerDraft, StudioProjectNewLayoutConfig, StudioReferenceAsset } from '../../types/studio'

type LabNewLayoutStudioSelectionState = {
  version: 1
  projectId: string | null
  folderId: string | null
}

export type StoryBibleChapter = {
  id: string
  title: string
  summary: string
  folderId: string
  episodeIds: string[]
}

export type StoryBibleEpisode = {
  id: string
  title: string
  section: string
  category: string
  discipline: string
  folderId: string
  story: string
  scenario: string
  scenarios: string[]
  dialogs: string[]
  characters: string[]
}

export type StoryBibleScene = {
  id: string
  folderId: string
  title: string
  durationSec: number
  category: string
  discipline: string
  script: string
  scenario: string
  visualThumbnailUrl: string
  visual: string
  action: string
  characterIds: string[]
}

export type StoryBibleCharacter = {
  id: string
  name: string
  bio: string
  imageUrl: string
}

export type StoryBibleData = {
  title: string
  summary: string
  folderSummaries: Record<string, string>
  chapters: StoryBibleChapter[]
  episodes: StoryBibleEpisode[]
  scenes: StoryBibleScene[]
  characters: StoryBibleCharacter[]
}

export type LabNewLayoutDataContextValue = {
  authUid: string
  authDisplayName: string
  authEmail: string
  authPhotoUrl: string
  studioProjects: ProjectSummary[]
  studioProjectsLoading: boolean
  studioProjectId: string | null
  studioFolders: FolderSummary[]
  studioFoldersLoading: boolean
  studioActiveFolderId: string | null
  storyBibleData: StoryBibleData
  updateStoryBibleData: (updater: (current: StoryBibleData) => StoryBibleData) => void
  setStudioProjectId: (projectId: string | null) => void
  setStudioActiveFolderId: (folderId: string | null) => void
  projectReferenceLibraryItems: StudioReferenceAsset[]
  projectReferenceLibraryLoading: boolean
  projectNewLayoutConfig: StudioProjectNewLayoutConfig
  projectNewLayoutConfigLoading: boolean
  updateProjectNewLayoutConfig: (updater: (current: StudioProjectNewLayoutConfig) => StudioProjectNewLayoutConfig) => void
}

const LAB_NEWLAYOUT_STUDIO_SELECTION_STORAGE_KEY = 'toorgen:lab-newlayout:studio-selection:v1'
const STORY_BIBLE_STORAGE_KEY = 'toorgen_story_bible_v1'

export const LabNewLayoutDataContext = createContext<LabNewLayoutDataContextValue | null>(null)

function sanitizeComposerDraft(input: StudioProjectComposerDraft | null | undefined): StudioProjectComposerDraft | null {
  if (!input) {
    return null
  }

  const references = Array.isArray(input.references)
    ? input.references.filter((reference): reference is StudioProjectComposerDraft['references'][number] => {
      return Boolean(
        reference
        && typeof reference.id === 'string'
        && typeof reference.url === 'string'
        && typeof reference.name === 'string'
        && (reference.kind === 'video' || reference.kind === 'image' || reference.kind === 'audio'),
      )
    })
    : []

  return {
    activeModeId: typeof input.activeModeId === 'string' && input.activeModeId.trim() ? input.activeModeId.trim() : 'video',
    promptText: typeof input.promptText === 'string' ? input.promptText : '',
    promptFontSize: input.promptFontSize === 'small'
      || input.promptFontSize === 'medium'
      || input.promptFontSize === 'large'
      || input.promptFontSize === 'xlarge'
      || input.promptFontSize === 'xxlarge'
      ? input.promptFontSize
      : 'medium',
    references,
    model: typeof input.model === 'string' && input.model.trim() ? input.model.trim() : 'bytedance/seedance-2.0-fast',
    provider: typeof input.provider === 'string' && input.provider.trim() ? input.provider.trim() : 'atlas',
    ratio: typeof input.ratio === 'string' && input.ratio.trim() ? input.ratio.trim() : '16:9',
    resolution: typeof input.resolution === 'string' && input.resolution.trim() ? input.resolution.trim() : '480p',
    duration: typeof input.duration === 'number' && Number.isFinite(input.duration) ? input.duration : 15,
    generateAudio: input.generateAudio !== false,
    updatedAt: typeof input.updatedAt === 'number' && Number.isFinite(input.updatedAt) ? input.updatedAt : Date.now(),
  }
}

function sanitizeProjectNewLayoutConfig(input?: Partial<StudioProjectNewLayoutConfig> | null): StudioProjectNewLayoutConfig {
  const composerDraftEntries = Object.entries(input?.composerDrafts ?? {})
    .map(([scopeId, draft]) => {
      if (typeof scopeId !== 'string' || !scopeId.trim()) {
        return null
      }

      const sanitizedDraft = sanitizeComposerDraft(draft)
      if (!sanitizedDraft) {
        return null
      }

      return [scopeId, sanitizedDraft] as const
    })
    .filter((entry): entry is readonly [string, StudioProjectComposerDraft] => Boolean(entry))

  return {
    version: 1,
    adminOnlyPanelIds: [...new Set((input?.adminOnlyPanelIds ?? []).filter((panelId) => typeof panelId === 'string' && panelId.trim().length > 0))].sort(),
    masterAdminCanCloseTabs: input?.masterAdminCanCloseTabs === true,
    composerDrafts: Object.fromEntries(composerDraftEntries),
  }
}

export function useLabNewLayoutData() {
  const context = useContext(LabNewLayoutDataContext)
  if (!context) {
    throw new Error('LabNewLayoutDataContext is not available')
  }
  return context
}

function parsePersistedStudioSelection(raw: string | null | undefined): LabNewLayoutStudioSelectionState | null {
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as Partial<LabNewLayoutStudioSelectionState> | null
    if (!parsed || parsed.version !== 1) {
      return null
    }

    return {
      version: 1,
      projectId: typeof parsed.projectId === 'string' ? parsed.projectId : null,
      folderId: typeof parsed.folderId === 'string' ? parsed.folderId : null,
    }
  } catch {
    return null
  }
}

function readLocalPersistedStudioSelection(): LabNewLayoutStudioSelectionState | null {
  if (typeof window === 'undefined') {
    return null
  }

  return parsePersistedStudioSelection(window.localStorage.getItem(LAB_NEWLAYOUT_STUDIO_SELECTION_STORAGE_KEY))
}

function writeLocalPersistedStudioSelection(state: LabNewLayoutStudioSelectionState): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(LAB_NEWLAYOUT_STUDIO_SELECTION_STORAGE_KEY, JSON.stringify(state))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function firstNonEmptyString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }
  return ''
}

function sanitizeStoryBibleData(data: StoryBibleData): StoryBibleData {
  const folderSummaries = Object.fromEntries(
    Object.entries(data.folderSummaries || {}).flatMap(([folderId, summary]) => {
      const normalizedFolderId = String(folderId || '').trim()
      const normalizedSummary = String(summary || '').trim()
      if (!normalizedFolderId) return []
      return [[normalizedFolderId, normalizedSummary]]
    }),
  )

  return {
    title: String(data.title || '').trim(),
    summary: String(data.summary || '').trim(),
    folderSummaries,
    chapters: data.chapters,
    episodes: data.episodes,
    scenes: data.scenes,
    characters: data.characters,
  }
}

function writeStoryBibleData(projectId: string | null, data: StoryBibleData): void {
  if (typeof window === 'undefined') {
    return
  }

  const scopedKey = projectId ? `${STORY_BIBLE_STORAGE_KEY}:${projectId}` : STORY_BIBLE_STORAGE_KEY
  window.localStorage.setItem(scopedKey, JSON.stringify(sanitizeStoryBibleData(data)))
}

function readStoryBibleData(projectId: string | null): StoryBibleData {
  const emptyStoryBibleData: StoryBibleData = {
    title: '',
    summary: '',
    folderSummaries: {},
    chapters: [],
    episodes: [],
    scenes: [],
    characters: [],
  }

  if (typeof window === 'undefined') {
    return emptyStoryBibleData
  }

  const scopedKey = projectId ? `${STORY_BIBLE_STORAGE_KEY}:${projectId}` : STORY_BIBLE_STORAGE_KEY
  const scopedRaw = window.localStorage.getItem(scopedKey)
  const globalRaw = window.localStorage.getItem(STORY_BIBLE_STORAGE_KEY)
  const raw = scopedRaw || globalRaw

  if (!raw) {
    return emptyStoryBibleData
  }

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!isRecord(parsed)) {
      return emptyStoryBibleData
    }

    const folderSummaries = isRecord(parsed.folderSummaries)
      ? Object.fromEntries(
        Object.entries(parsed.folderSummaries).flatMap(([folderId, summary]) => {
          const normalizedFolderId = String(folderId || '').trim()
          const normalizedSummary = String(summary || '').trim()
          if (!normalizedFolderId) return []
          return [[normalizedFolderId, normalizedSummary]]
        }),
      )
      : {}

    const chapters = Array.isArray(parsed.chapters)
      ? parsed.chapters.flatMap((entry, index) => {
        if (!isRecord(entry)) {
          return [] as StoryBibleChapter[]
        }

        return [{
          id: firstNonEmptyString(entry.id, `chapter-${index + 1}`),
          title: firstNonEmptyString(entry.title, `Chapter ${index + 1}`),
          summary: firstNonEmptyString(entry.summary, ''),
          folderId: firstNonEmptyString(entry.folderId, entry.linkedFolderId, entry.chapterFolderId, entry.folder, ''),
          episodeIds: Array.isArray(entry.episodeIds)
            ? entry.episodeIds.map((item) => String(item || '').trim()).filter(Boolean)
            : [],
        }]
      })
      : []

    const toList = (input: unknown): string[] => (Array.isArray(input) ? input.map((item) => String(item || '').trim()).filter(Boolean) : [])

    const episodes = Array.isArray(parsed.episodes)
      ? parsed.episodes.flatMap((entry, index) => {
        if (!isRecord(entry)) {
          return [] as StoryBibleEpisode[]
        }

        return [{
          id: firstNonEmptyString(entry.id, `episode-${index + 1}`),
          title: firstNonEmptyString(entry.title, `Episode ${index + 1}`),
          section: firstNonEmptyString(entry.section, entry.storySection, ''),
          category: firstNonEmptyString(entry.category, Array.isArray(entry.categories) ? entry.categories[0] : '', ''),
          discipline: firstNonEmptyString(entry.discipline, Array.isArray(entry.disciplines) ? entry.disciplines[0] : '', ''),
          folderId: firstNonEmptyString(entry.folderId, entry.linkedFolderId, entry.chapterFolderId, entry.folder, ''),
          story: firstNonEmptyString(entry.story, entry.summary, ''),
          scenario: firstNonEmptyString(entry.scenario, entry.promptScenario, ''),
          scenarios: toList(entry.scenarios),
          dialogs: toList(entry.dialogs),
          characters: toList(entry.characters),
        }]
      })
      : []

    const scenes = Array.isArray(parsed.scenes)
      ? parsed.scenes.flatMap((entry, index) => {
        if (!isRecord(entry)) {
          return [] as StoryBibleScene[]
        }

        const rawDuration = Number(entry.durationSec ?? entry.duration ?? 8)

        return [{
          id: firstNonEmptyString(entry.id, `scene-${index + 1}`),
          folderId: firstNonEmptyString(entry.folderId, entry.chapterFolderId, entry.linkedFolderId, ''),
          title: firstNonEmptyString(entry.title, `Scene ${index + 1}`),
          durationSec: Number.isFinite(rawDuration) ? Math.max(1, Math.min(180, Math.round(rawDuration))) : 8,
          category: firstNonEmptyString(entry.category, Array.isArray(entry.categories) ? entry.categories[0] : '', ''),
          discipline: firstNonEmptyString(entry.discipline, Array.isArray(entry.disciplines) ? entry.disciplines[0] : '', ''),
          script: firstNonEmptyString(entry.script, ''),
          scenario: firstNonEmptyString(entry.scenario, ''),
          visualThumbnailUrl: firstNonEmptyString(entry.visualThumbnailUrl, entry.visualThumbUrl, entry.thumbnailUrl, ''),
          visual: firstNonEmptyString(entry.visual, entry.visuals, ''),
          action: firstNonEmptyString(entry.action, ''),
          characterIds: toList(entry.characterIds),
        }]
      })
      : []

    const characters = Array.isArray(parsed.characters)
      ? parsed.characters.flatMap((entry, index) => {
        if (!isRecord(entry)) {
          return [] as StoryBibleCharacter[]
        }

        return [{
          id: firstNonEmptyString(entry.id, `character-${index + 1}`),
          name: firstNonEmptyString(entry.name, `Character ${index + 1}`),
          bio: firstNonEmptyString(entry.bio, entry.summary, ''),
          imageUrl: firstNonEmptyString(entry.imageUrl, ''),
        }]
      })
      : []

    return {
      title: firstNonEmptyString(parsed.title, ''),
      summary: firstNonEmptyString(parsed.summary, ''),
      folderSummaries,
      chapters,
      episodes,
      scenes,
      characters,
    }
  } catch {
    return emptyStoryBibleData
  }
}

type LabNewLayoutWorkspaceAuthState = {
  uid: string
  displayName: string
  email: string
  photoUrl: string
}

export function useLabNewLayoutWorkspace(authState: LabNewLayoutWorkspaceAuthState) {
  const { uid: authUid, displayName: authDisplayName, email: authEmail, photoUrl: authPhotoUrl } = authState
  const initialLocalStudioSelectionRef = useRef<LabNewLayoutStudioSelectionState | null>(readLocalPersistedStudioSelection())
  const [storyBibleData, setStoryBibleData] = useState<StoryBibleData>(() => readStoryBibleData(initialLocalStudioSelectionRef.current?.projectId ?? null))
  const [projectReferenceLibraryItems, setProjectReferenceLibraryItems] = useState<StudioReferenceAsset[]>([])
  const [projectReferenceLibraryLoading, setProjectReferenceLibraryLoading] = useState(false)
  const [projectNewLayoutConfig, setProjectNewLayoutConfig] = useState<StudioProjectNewLayoutConfig>(sanitizeProjectNewLayoutConfig())
  const [projectNewLayoutConfigLoading, setProjectNewLayoutConfigLoading] = useState(false)
  const {
    studioProjectId,
    setStudioProjectId,
    studioProjects,
    studioProjectsLoading,
    studioFolders,
    studioFoldersLoading,
    studioActiveFolderId,
    setStudioActiveFolderId,
    hasLoadedStudioSelection: isStudioSelectionBootstrapComplete,
  } = useStudioProjectSelection({
    authUid,
    readLocalSelection: readLocalPersistedStudioSelection,
    writeLocalSelection: ({ projectId, folderId }) => {
      writeLocalPersistedStudioSelection({
        version: 1,
        projectId,
        folderId,
      })
    },
    selectionPriority: 'local',
  })

  useEffect(() => {
    if (!isStudioSelectionBootstrapComplete) {
      return
    }

    setStoryBibleData(readStoryBibleData(studioProjectId))
  }, [isStudioSelectionBootstrapComplete, studioProjectId])

  useEffect(() => {
    if (!studioProjectId) {
      setProjectReferenceLibraryItems([])
      setProjectReferenceLibraryLoading(false)
      return
    }

    setProjectReferenceLibraryLoading(true)
    const unsubscribe = subscribeToProjectReferenceLibrary(studioProjectId, (items) => {
      setProjectReferenceLibraryItems((previousItems) => {
        // Defensively clone incoming snapshots so React always sees immutable state updates.
        const nextItems = [...items]
        if (previousItems.length === nextItems.length) {
          const isSame = previousItems.every((entry, index) => {
            const nextEntry = nextItems[index]
            return Boolean(nextEntry)
              && entry.id === nextEntry.id
              && entry.url === nextEntry.url
              && entry.kind === nextEntry.kind
              && entry.name === nextEntry.name
              && (entry.folderId || null) === (nextEntry.folderId || null)
              && entry.createdAt === nextEntry.createdAt
          })
          if (isSame) {
            return previousItems
          }
        }
        return nextItems
      })
      setProjectReferenceLibraryLoading(false)
    }, (error) => {
      console.error('Failed to load project references:', error)
      setProjectReferenceLibraryLoading(false)
    })

    return unsubscribe
  }, [studioProjectId, isStudioSelectionBootstrapComplete])

  useEffect(() => {
    if (!isStudioSelectionBootstrapComplete) {
      return
    }

    if (!studioProjectId) {
      setProjectNewLayoutConfig(sanitizeProjectNewLayoutConfig())
      setProjectNewLayoutConfigLoading(false)
      return
    }

    setProjectNewLayoutConfigLoading(true)
    const unsubscribe = subscribeToProjectNewLayoutConfig(studioProjectId, (config) => {
      setProjectNewLayoutConfig(sanitizeProjectNewLayoutConfig(config))
      setProjectNewLayoutConfigLoading(false)
    }, (error) => {
      console.error('Failed to load new layout config:', error)
      setProjectNewLayoutConfigLoading(false)
    })

    return unsubscribe
  }, [isStudioSelectionBootstrapComplete, studioProjectId])

  const updateStoryBibleData = useCallback((updater: (current: StoryBibleData) => StoryBibleData) => {
    setStoryBibleData((current) => {
      const next = sanitizeStoryBibleData(updater(current))
      writeStoryBibleData(studioProjectId, next)
      return next
    })
  }, [studioProjectId])

  const updateProjectNewLayoutConfig = useCallback((updater: (current: StudioProjectNewLayoutConfig) => StudioProjectNewLayoutConfig) => {
    setProjectNewLayoutConfig((current) => {
      const next = sanitizeProjectNewLayoutConfig(updater(current))
      if (studioProjectId) {
        void saveProjectNewLayoutConfig(studioProjectId, next).catch((error) => {
          console.error('Failed to save new layout config:', error)
        })
      }
      return next
    })
  }, [studioProjectId])

  const dataContextValue = useMemo<LabNewLayoutDataContextValue>(() => ({
    authUid,
    authDisplayName,
    authEmail,
    authPhotoUrl,
    studioProjects,
    studioProjectsLoading,
    studioProjectId,
    studioFolders,
    studioFoldersLoading,
    studioActiveFolderId,
    storyBibleData,
    updateStoryBibleData,
    setStudioProjectId,
    setStudioActiveFolderId,
    projectReferenceLibraryItems,
    projectReferenceLibraryLoading,
    projectNewLayoutConfig,
    projectNewLayoutConfigLoading,
    updateProjectNewLayoutConfig,
  }), [
    authDisplayName,
    authEmail,
    authPhotoUrl,
    authUid,
    setStudioActiveFolderId,
    setStudioProjectId,
    storyBibleData,
    updateStoryBibleData,
    studioActiveFolderId,
    studioFolders,
    studioFoldersLoading,
    studioProjectId,
    studioProjects,
    studioProjectsLoading,
    projectReferenceLibraryItems,
    projectReferenceLibraryLoading,
    projectNewLayoutConfig,
    projectNewLayoutConfigLoading,
    updateProjectNewLayoutConfig,
  ])

  return {
    studioProjects,
    studioProjectsLoading,
    studioProjectId,
    studioFolders,
    studioFoldersLoading,
    studioActiveFolderId,
    storyBibleData,
    updateStoryBibleData,
    setStudioProjectId,
    setStudioActiveFolderId,
    dataContextValue,
    projectNewLayoutConfig,
    projectNewLayoutConfigLoading,
    updateProjectNewLayoutConfig,
  }
}