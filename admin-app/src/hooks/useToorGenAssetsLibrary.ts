import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  deleteProjectReferenceLibraryItem,
  renameProjectReferenceLibraryItem,
  saveProjectReferenceLibraryItem,
  subscribeToProjectReferenceLibrary,
  subscribeToUserReferenceLibrary,
} from '../lib/studioService'
import {
  buildSelectedLibrarySnapshotItems,
  createPinnedSelectedLibraryItems,
  filterMediaLibraryItems,
  mergeMediaLibraryItems,
  readLocalMediaLibrary,
  REFERENCE_LIBRARY_PAGE_SIZE,
  toMediaLibraryItem,
  trimUniqueUrls,
  writeLocalMediaLibrary,
  type MediaKind,
  type MediaLibraryItem,
  type ReferenceLibraryFilter,
} from '../lib/toorgen/referenceLibrary'

type UseToorGenAssetsLibraryOptions = {
  authUid: string
  studioProjectId: string | null
  uploadFile: (file: File, kind: MediaKind) => Promise<string>
  maxItems?: number
}

type PrepareReferenceLibrarySessionOptions = {
  selectedUrls: string[]
  filter: ReferenceLibraryFilter
}

export function useToorGenAssetsLibrary({
  authUid,
  studioProjectId,
  uploadFile,
  maxItems = 200,
}: UseToorGenAssetsLibraryOptions) {
  const [mediaLibrary, setMediaLibrary] = useState<MediaLibraryItem[]>(() => readLocalMediaLibrary())
  const [userReferenceLibrary, setUserReferenceLibrary] = useState<MediaLibraryItem[]>([])
  const [localReferenceLibrarySnapshot, setLocalReferenceLibrarySnapshot] = useState<MediaLibraryItem[]>(() => readLocalMediaLibrary())
  const [referenceLibraryFilterState, setReferenceLibraryFilterState] = useState<ReferenceLibraryFilter>('all')
  const [referenceLibraryQueryState, setReferenceLibraryQueryState] = useState('')
  const [referenceLibraryPage, setReferenceLibraryPage] = useState(1)
  const [selectedReferenceLibraryUrls, setSelectedReferenceLibraryUrls] = useState<string[]>([])
  const [isReferenceLibraryUploading, setIsReferenceLibraryUploading] = useState(false)

  useEffect(() => {
    if (!studioProjectId) {
      setMediaLibrary(readLocalMediaLibrary())
      return
    }

    const unsub = subscribeToProjectReferenceLibrary(
      studioProjectId,
      (items) => setMediaLibrary(items.map(toMediaLibraryItem)),
      () => setMediaLibrary([]),
    )

    return () => {
      unsub()
    }
  }, [studioProjectId])

  useEffect(() => {
    if (!authUid) {
      setUserReferenceLibrary([])
      return
    }

    const unsub = subscribeToUserReferenceLibrary(
      authUid,
      (items) => setUserReferenceLibrary(items.map(toMediaLibraryItem)),
      () => setUserReferenceLibrary([]),
    )

    return () => {
      unsub()
    }
  }, [authUid])

  const referenceLibraryMetadataItems = useMemo(
    () => mergeMediaLibraryItems(mediaLibrary, userReferenceLibrary, localReferenceLibrarySnapshot),
    [localReferenceLibrarySnapshot, mediaLibrary, userReferenceLibrary],
  )

  const mediaLibraryNameByUrl = useMemo(() => (
    new Map(referenceLibraryMetadataItems.map((item) => [item.url, item.name.trim() || `Reference ${item.kind}`]))
  ), [referenceLibraryMetadataItems])

  const mediaLibraryKindByUrl = useMemo(() => (
    new Map(referenceLibraryMetadataItems.map((item) => [item.url, item.kind]))
  ), [referenceLibraryMetadataItems])

  const filteredReferenceLibrary = useMemo(
    () => filterMediaLibraryItems(mediaLibrary, referenceLibraryFilterState, referenceLibraryQueryState),
    [mediaLibrary, referenceLibraryFilterState, referenceLibraryQueryState],
  )

  const personalReferenceLibraryItems = useMemo(
    () => mergeMediaLibraryItems(userReferenceLibrary, localReferenceLibrarySnapshot),
    [localReferenceLibrarySnapshot, userReferenceLibrary],
  )

  const filteredPersonalReferenceLibrary = useMemo(
    () => filterMediaLibraryItems(personalReferenceLibraryItems, referenceLibraryFilterState, referenceLibraryQueryState),
    [personalReferenceLibraryItems, referenceLibraryFilterState, referenceLibraryQueryState],
  )

  const hasSharedReferenceItems = filteredReferenceLibrary.length > 0
  const hasPersonalReferenceItems = filteredPersonalReferenceLibrary.length > 0

  const allVisibleReferenceLibraryItems = useMemo(() => {
    if (!studioProjectId) {
      return filteredPersonalReferenceLibrary
    }
    return mergeMediaLibraryItems(filteredReferenceLibrary, filteredPersonalReferenceLibrary)
  }, [filteredPersonalReferenceLibrary, filteredReferenceLibrary, studioProjectId])

  const sharedReferenceUrlSet = useMemo(
    () => new Set(mediaLibrary.map((item) => item.url)),
    [mediaLibrary],
  )

  const selectedReferencesMissingFromVisibleList = useMemo(
    () => createPinnedSelectedLibraryItems(
      selectedReferenceLibraryUrls,
      allVisibleReferenceLibraryItems,
      mediaLibraryKindByUrl,
      mediaLibraryNameByUrl,
    ),
    [allVisibleReferenceLibraryItems, mediaLibraryKindByUrl, mediaLibraryNameByUrl, selectedReferenceLibraryUrls],
  )

  const combinedReferenceLibraryItems = useMemo(
    () => [...selectedReferencesMissingFromVisibleList, ...allVisibleReferenceLibraryItems],
    [allVisibleReferenceLibraryItems, selectedReferencesMissingFromVisibleList],
  )

  const visibleReferenceLibraryItems = useMemo(
    () => combinedReferenceLibraryItems.slice(0, referenceLibraryPage * REFERENCE_LIBRARY_PAGE_SIZE),
    [combinedReferenceLibraryItems, referenceLibraryPage],
  )

  const hasMoreLibraryItems = visibleReferenceLibraryItems.length < combinedReferenceLibraryItems.length
  const remainingReferenceLibraryItemsCount = Math.max(0, combinedReferenceLibraryItems.length - visibleReferenceLibraryItems.length)

  const importableLocalReferenceLibrary = useMemo(() => {
    if (!studioProjectId) {
      return [] as MediaLibraryItem[]
    }
    const existingUrls = new Set(mediaLibrary.map((item) => item.url))
    return localReferenceLibrarySnapshot.filter((item) => !existingUrls.has(item.url))
  }, [localReferenceLibrarySnapshot, mediaLibrary, studioProjectId])

  const setReferenceLibraryFilter = useCallback((filter: ReferenceLibraryFilter) => {
    setReferenceLibraryFilterState(filter)
    setReferenceLibraryPage(1)
  }, [])

  const setReferenceLibraryQuery = useCallback((query: string) => {
    setReferenceLibraryQueryState(query)
    setReferenceLibraryPage(1)
  }, [])

  const loadMoreReferenceLibraryItems = useCallback(() => {
    setReferenceLibraryPage((current) => current + 1)
  }, [])

  const resetReferenceLibrarySession = useCallback(() => {
    setReferenceLibraryPage(1)
    setReferenceLibraryQueryState('')
  }, [])

  const toggleReferenceLibrarySelection = useCallback((url: string) => {
    const normalizedUrl = url.trim()
    if (!normalizedUrl) {
      return
    }

    setSelectedReferenceLibraryUrls((current) => {
      const normalizedCurrent = trimUniqueUrls(current)
      return normalizedCurrent.includes(normalizedUrl)
        ? normalizedCurrent.filter((value) => value !== normalizedUrl)
        : [normalizedUrl, ...normalizedCurrent]
    })
  }, [])

  const prepareReferenceLibrarySession = useCallback(({ selectedUrls, filter }: PrepareReferenceLibrarySessionOptions) => {
    const persistedLocalReferences = readLocalMediaLibrary()
    const selectedSnapshotItems = buildSelectedLibrarySnapshotItems(selectedUrls, mediaLibraryKindByUrl, mediaLibraryNameByUrl)

    setLocalReferenceLibrarySnapshot((current) => (
      studioProjectId
        ? mergeMediaLibraryItems(selectedSnapshotItems, current, persistedLocalReferences)
        : mergeMediaLibraryItems(selectedSnapshotItems, persistedLocalReferences)
    ))
    setReferenceLibraryFilterState(filter)
    setReferenceLibraryPage(1)
    setReferenceLibraryQueryState('')
    setSelectedReferenceLibraryUrls(trimUniqueUrls(selectedUrls))
  }, [mediaLibraryKindByUrl, mediaLibraryNameByUrl, studioProjectId])

  const appendToMediaLibrary = useCallback(async (kind: MediaKind, url: string, name: string) => {
    const normalizedUrl = url.trim()
    if (!normalizedUrl) {
      return
    }

    const nextEntry: MediaLibraryItem = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      kind,
      url: normalizedUrl,
      name: name.trim() || `${kind} upload`,
      createdAt: Date.now(),
      projectId: studioProjectId || undefined,
    }

    if (studioProjectId && authUid) {
      setLocalReferenceLibrarySnapshot((current) => mergeMediaLibraryItems([nextEntry], current).slice(0, maxItems))
      setUserReferenceLibrary((current) => mergeMediaLibraryItems([nextEntry], current).slice(0, maxItems))
      await saveProjectReferenceLibraryItem(studioProjectId, nextEntry, authUid)
      return
    }

    setMediaLibrary((current) => {
      const next = mergeMediaLibraryItems([nextEntry], current).slice(0, maxItems)
      writeLocalMediaLibrary(next)
      setLocalReferenceLibrarySnapshot(next)
      return next
    })
  }, [authUid, maxItems, studioProjectId])

  const uploadReferenceLibraryFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) {
      return
    }

    setIsReferenceLibraryUploading(true)
    const selectedFiles = Array.from(files)
    const uploadedUrls: string[] = []

    try {
      for (const file of selectedFiles) {
        const kind: MediaKind = file.type.startsWith('video/')
          ? 'video'
          : file.type.startsWith('audio/') || /\.(mp3|wav)$/i.test(file.name)
            ? 'audio'
            : 'image'
        const url = await uploadFile(file, kind)
        await appendToMediaLibrary(kind, url, file.name)
        uploadedUrls.push(url)
      }

      if (uploadedUrls.length > 0) {
        setSelectedReferenceLibraryUrls((current) => trimUniqueUrls([...uploadedUrls, ...current]))
      }
    } finally {
      setIsReferenceLibraryUploading(false)
    }
  }, [appendToMediaLibrary, uploadFile])

  const importLocalReferencesToProject = useCallback(async () => {
    if (!studioProjectId || !authUid || importableLocalReferenceLibrary.length === 0) {
      return 0
    }

    for (const item of importableLocalReferenceLibrary) {
      await saveProjectReferenceLibraryItem(
        studioProjectId,
        {
          id: item.id,
          kind: item.kind,
          url: item.url,
          name: item.name,
          createdAt: item.createdAt,
        },
        authUid,
      )
    }

    return importableLocalReferenceLibrary.length
  }, [authUid, importableLocalReferenceLibrary, studioProjectId])

  const renameMediaLibraryItem = useCallback((id: string, name: string) => {
    const nextName = name.trim() || 'Reference asset'

    setMediaLibrary((current) => {
      const next = current.map((item) => (
        item.id === id
          ? { ...item, name: name.trim() || `Reference ${item.kind}` }
          : item
      ))

      if (!studioProjectId) {
        writeLocalMediaLibrary(next)
        setLocalReferenceLibrarySnapshot(next)
      }

      return next
    })

    if (studioProjectId) {
      void renameProjectReferenceLibraryItem(studioProjectId, id, nextName)
    }
  }, [studioProjectId])

  const removeMediaLibraryItem = useCallback((item: MediaLibraryItem) => {
    setMediaLibrary((current) => {
      const next = current.filter((entry) => entry.id !== item.id)

      if (!studioProjectId) {
        writeLocalMediaLibrary(next)
        setLocalReferenceLibrarySnapshot(next)
      }

      return next
    })

    if (studioProjectId) {
      void deleteProjectReferenceLibraryItem(studioProjectId, item.id)
    }

    setSelectedReferenceLibraryUrls((current) => current.filter((url) => url !== item.url))
  }, [studioProjectId])

  return {
    mediaLibrary,
    referenceLibraryMetadataItems,
    mediaLibraryNameByUrl,
    mediaLibraryKindByUrl,
    referenceLibraryFilter: referenceLibraryFilterState,
    setReferenceLibraryFilter,
    referenceLibraryQuery: referenceLibraryQueryState,
    setReferenceLibraryQuery,
    referenceLibraryPage,
    selectedReferenceLibraryUrls,
    setSelectedReferenceLibraryUrls,
    isReferenceLibraryUploading,
    filteredReferenceLibrary,
    personalReferenceLibraryItems,
    filteredPersonalReferenceLibrary,
    hasSharedReferenceItems,
    hasPersonalReferenceItems,
    allVisibleReferenceLibraryItems,
    sharedReferenceUrlSet,
    combinedReferenceLibraryItems,
    visibleReferenceLibraryItems,
    hasMoreLibraryItems,
    remainingReferenceLibraryItemsCount,
    importableLocalReferenceLibrary,
    appendToMediaLibrary,
    uploadReferenceLibraryFiles,
    importLocalReferencesToProject,
    renameMediaLibraryItem,
    removeMediaLibraryItem,
    toggleReferenceLibrarySelection,
    prepareReferenceLibrarySession,
    resetReferenceLibrarySession,
    loadMoreReferenceLibraryItems,
  }
}