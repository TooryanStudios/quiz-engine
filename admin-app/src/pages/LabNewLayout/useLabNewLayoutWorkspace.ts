import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useStudioProjectSelection } from '../../hooks/useStudioProjectSelection'
import type { FolderSummary, ProjectSummary } from '../../types/studio'

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
  setStudioProjectId: (projectId: string | null) => void
  setStudioActiveFolderId: (folderId: string | null) => void
}

const LAB_NEWLAYOUT_STUDIO_SELECTION_STORAGE_KEY = 'toorgen:lab-newlayout:studio-selection:v1'
const STORY_BIBLE_STORAGE_KEY = 'toorgen_story_bible_v1'

export const LabNewLayoutDataContext = createContext<LabNewLayoutDataContextValue | null>(null)

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

function readStoryBibleData(projectId: string | null): StoryBibleData {
  const emptyStoryBibleData: StoryBibleData = {
    title: '',
    summary: '',
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
    setStudioProjectId,
    setStudioActiveFolderId,
  }), [
    authDisplayName,
    authEmail,
    authPhotoUrl,
    authUid,
    setStudioActiveFolderId,
    setStudioProjectId,
    storyBibleData,
    studioActiveFolderId,
    studioFolders,
    studioFoldersLoading,
    studioProjectId,
    studioProjects,
    studioProjectsLoading,
  ])

  return {
    studioProjects,
    studioProjectsLoading,
    studioProjectId,
    studioFolders,
    studioFoldersLoading,
    studioActiveFolderId,
    storyBibleData,
    setStudioProjectId,
    setStudioActiveFolderId,
    dataContextValue,
  }
}