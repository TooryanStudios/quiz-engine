import type { StudioReferenceAsset } from '../../types/studio'

export const SHARED_REFERENCE_LIBRARY_KEY = 'toorgen_reference_library_v1'
export const REFERENCE_LIBRARY_PAGE_SIZE = 10

export type MediaKind = 'image' | 'video' | 'audio'
export type ReferenceLibraryFilter = 'all' | MediaKind

export type MediaLibraryItem = {
  id: string
  kind: MediaKind
  url: string
  thumbnailUrl?: string
  name: string
  createdAt: number
  projectId?: string
  folderId?: string | null
  generationPrompt?: string
  generationModel?: string
  generationProvider?: string
  generationAspectRatio?: string
  generationResolution?: string
  generationSource?: string
  generationRequestPayload?: Record<string, unknown>
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  Boolean(value) && typeof value === 'object' && !Array.isArray(value)
)

export const trimUniqueUrls = (urls: string[]): string[] => (
  Array.from(new Set(urls.map((value) => value.trim()).filter(Boolean)))
)

export const inferMediaKindFromUrl = (url: string): MediaKind => {
  const trimmed = (url || '').trim().toLowerCase()
  if (/\.(mp3|wav|ogg|m4a|aac|flac)(\?|#|$)/i.test(trimmed) || trimmed.includes('/audio/')) {
    return 'audio'
  }
  if (/\.(mp4|webm|mov|m4v|mkv|avi|m3u8)(\?|#|$)/i.test(trimmed) || trimmed.includes('/video/')) {
    return 'video'
  }
  return 'image'
}

export const parseMediaLibraryItem = (value: unknown): MediaLibraryItem | null => {
  if (!isRecord(value) || typeof value.url !== 'string') {
    return null
  }

  const url = value.url.trim()
  if (!url) {
    return null
  }

  const inferredKind = inferMediaKindFromUrl(url)
  const kind: MediaKind = value.kind === 'image' || value.kind === 'video' || value.kind === 'audio'
    ? value.kind
    : inferredKind
  const createdAt = typeof value.createdAt === 'number'
    ? value.createdAt
    : typeof value.lastUsedAt === 'number'
      ? value.lastUsedAt
      : Date.now()

  return {
    id: typeof value.id === 'string' && value.id.trim() ? value.id : `ref-${createdAt.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    kind,
    url,
    thumbnailUrl: typeof value.thumbnailUrl === 'string' && value.thumbnailUrl.trim() ? value.thumbnailUrl.trim() : undefined,
    name: typeof value.name === 'string' && value.name.trim() ? value.name : `Reference ${kind}`,
    createdAt,
    projectId: typeof value.projectId === 'string' && value.projectId.trim() ? value.projectId.trim() : undefined,
    folderId: typeof value.folderId === 'string' && value.folderId.trim() ? value.folderId.trim() : null,
    generationPrompt: typeof value.generationPrompt === 'string' && value.generationPrompt.trim() ? value.generationPrompt : undefined,
    generationModel: typeof value.generationModel === 'string' && value.generationModel.trim() ? value.generationModel : undefined,
    generationProvider: typeof value.generationProvider === 'string' && value.generationProvider.trim() ? value.generationProvider : undefined,
    generationAspectRatio: typeof value.generationAspectRatio === 'string' && value.generationAspectRatio.trim() ? value.generationAspectRatio : undefined,
    generationResolution: typeof value.generationResolution === 'string' && value.generationResolution.trim() ? value.generationResolution : undefined,
    generationSource: typeof value.generationSource === 'string' && value.generationSource.trim() ? value.generationSource : undefined,
    generationRequestPayload: isRecord(value.generationRequestPayload) ? value.generationRequestPayload : undefined,
  }
}

export const readLocalMediaLibrary = (): MediaLibraryItem[] => {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const raw = window.localStorage.getItem(SHARED_REFERENCE_LIBRARY_KEY)
    if (!raw) {
      return []
    }
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) {
      return []
    }
    return parsed
      .map(parseMediaLibraryItem)
      .filter((entry): entry is MediaLibraryItem => Boolean(entry))
      .sort((left, right) => right.createdAt - left.createdAt)
  } catch {
    return []
  }
}

export const writeLocalMediaLibrary = (items: MediaLibraryItem[]) => {
  if (typeof window === 'undefined') {
    return
  }
  try {
    window.localStorage.setItem(SHARED_REFERENCE_LIBRARY_KEY, JSON.stringify(items))
  } catch {
    // ignore storage write failures
  }
}

export const mergeMediaLibraryItems = (...lists: MediaLibraryItem[][]): MediaLibraryItem[] => {
  const byUrl = new Map<string, MediaLibraryItem>()

  lists.forEach((items) => {
    items.forEach((item) => {
      const existing = byUrl.get(item.url)
      if (!existing) {
        byUrl.set(item.url, item)
        return
      }

      const pickIncoming = item.createdAt >= existing.createdAt
      const preferred = pickIncoming ? item : existing
      const fallback = pickIncoming ? existing : item

      byUrl.set(item.url, {
        ...preferred,
        thumbnailUrl: preferred.thumbnailUrl || fallback.thumbnailUrl,
        projectId: preferred.projectId || fallback.projectId,
        folderId: preferred.folderId ?? fallback.folderId,
        generationPrompt: preferred.generationPrompt || fallback.generationPrompt,
        generationModel: preferred.generationModel || fallback.generationModel,
        generationProvider: preferred.generationProvider || fallback.generationProvider,
        generationAspectRatio: preferred.generationAspectRatio || fallback.generationAspectRatio,
        generationResolution: preferred.generationResolution || fallback.generationResolution,
        generationSource: preferred.generationSource || fallback.generationSource,
        generationRequestPayload: preferred.generationRequestPayload || fallback.generationRequestPayload,
      })
    })
  })

  return Array.from(byUrl.values()).sort((left, right) => right.createdAt - left.createdAt)
}

export const filterMediaLibraryItems = (
  items: MediaLibraryItem[],
  filter: ReferenceLibraryFilter,
  query: string,
): MediaLibraryItem[] => {
  const normalizedQuery = query.trim().toLowerCase()

  return items
    .filter((item) => filter === 'all' || item.kind === filter)
    .filter((item) => {
      if (!normalizedQuery) {
        return true
      }
      return `${item.name} ${item.url}`.toLowerCase().includes(normalizedQuery)
    })
}

export const toMediaLibraryItem = (item: StudioReferenceAsset): MediaLibraryItem => ({
  id: item.id,
  kind: item.kind,
  url: item.url,
  thumbnailUrl: typeof item.thumbnailUrl === 'string' && item.thumbnailUrl.trim() ? item.thumbnailUrl.trim() : undefined,
  name: item.name,
  createdAt: typeof (item.createdAt as { toMillis?: () => number } | undefined)?.toMillis === 'function'
    ? (item.createdAt as { toMillis: () => number }).toMillis()
    : Date.now(),
  projectId: item.projectId,
  folderId: item.folderId ?? null,
  generationPrompt: item.generationPrompt,
  generationModel: item.generationModel,
  generationProvider: item.generationProvider,
  generationAspectRatio: item.generationAspectRatio,
  generationResolution: item.generationResolution,
  generationSource: item.generationSource,
  generationRequestPayload: item.generationRequestPayload,
})

export const buildSelectedLibrarySnapshotItems = (
  selectedUrls: string[],
  kindByUrl: Map<string, MediaKind>,
  nameByUrl: Map<string, string>,
): MediaLibraryItem[] => {
  const normalizedUrls = trimUniqueUrls(selectedUrls)
  const baseTime = Date.now()

  return normalizedUrls.map((url, index) => {
    const kind = kindByUrl.get(url) || inferMediaKindFromUrl(url)
    return {
      id: `selected-open-${kind}-${index}`,
      kind,
      url,
      name: nameByUrl.get(url) || `Attached ${kind} ${index + 1}`,
      createdAt: baseTime + (normalizedUrls.length - index),
    }
  })
}

export const createPinnedSelectedLibraryItems = (
  selectedUrls: string[],
  visibleItems: MediaLibraryItem[],
  kindByUrl: Map<string, MediaKind>,
  nameByUrl: Map<string, string>,
): MediaLibraryItem[] => {
  const visibleByUrl = new Set(visibleItems.map((item) => item.url))
  const normalizedUrls = trimUniqueUrls(selectedUrls)
  const baseTime = Date.now()

  return normalizedUrls.flatMap((url, index) => {
    if (visibleByUrl.has(url)) {
      return []
    }

    const kind = kindByUrl.get(url) || inferMediaKindFromUrl(url)
    return [{
      id: `selected-missing-${index}`,
      kind,
      url,
      name: nameByUrl.get(url) || `Attached ${kind} ${index + 1}`,
      createdAt: baseTime + (normalizedUrls.length - index),
    }]
  })
}

export const pickPrimaryLibraryImageUrl = (
  selectedUrls: string[],
  kindByUrl: Map<string, MediaKind>,
): string => {
  const normalizedUrls = trimUniqueUrls(selectedUrls)
  return normalizedUrls.find((url) => (kindByUrl.get(url) || inferMediaKindFromUrl(url)) === 'image') || normalizedUrls[0] || ''
}

export const resolveSelectedLibraryUrlsByKind = (
  selectedUrls: string[],
  kindByUrl: Map<string, MediaKind>,
): Record<MediaKind, string[]> => {
  const byKind: Record<MediaKind, string[]> = {
    image: [],
    video: [],
    audio: [],
  }

  trimUniqueUrls(selectedUrls).forEach((url) => {
    const kind = kindByUrl.get(url) || inferMediaKindFromUrl(url)
    byKind[kind].push(url)
  })

  return byKind
}