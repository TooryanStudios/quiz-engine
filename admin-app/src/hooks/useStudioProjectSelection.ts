import { useCallback, useEffect, useRef, useState } from 'react'
import { loadUserPrefs, saveUserPrefs } from '../lib/adminRepo'
import { subscribeToProjectFolders, subscribeToUserProjects } from '../lib/studioService'
import type { FolderSummary, ProjectSummary } from '../types/studio'

export type PersistedStudioSelection = {
  projectId: string | null
  folderId: string | null
}

type LoadedUserPrefs = Awaited<ReturnType<typeof loadUserPrefs>>

type UseStudioProjectSelectionOptions = {
  authUid: string
  readLocalSelection: () => PersistedStudioSelection | null
  writeLocalSelection: (selection: PersistedStudioSelection) => void
  selectionPriority?: 'user-prefs' | 'local'
  initialProjectsLoading?: boolean
  persistUserPrefs?: boolean
  onUserPrefsLoaded?: (prefs: LoadedUserPrefs) => void
  onUserPrefsSettled?: () => void
  onProjectsError?: (error: unknown) => void
  onFoldersError?: (error: unknown) => void
}

export function useStudioProjectSelection({
  authUid,
  readLocalSelection,
  writeLocalSelection,
  selectionPriority = 'user-prefs',
  initialProjectsLoading = false,
  persistUserPrefs = true,
  onUserPrefsLoaded,
  onUserPrefsSettled,
  onProjectsError,
  onFoldersError,
}: UseStudioProjectSelectionOptions) {
  const initialSelectionRef = useRef<PersistedStudioSelection | null>(readLocalSelection())
  const preferredStudioProjectIdRef = useRef<string | null>(initialSelectionRef.current?.projectId ?? null)
  const preferredStudioFolderIdRef = useRef<string | null>(initialSelectionRef.current?.folderId ?? null)
  const onUserPrefsLoadedRef = useRef(onUserPrefsLoaded)
  const onUserPrefsSettledRef = useRef(onUserPrefsSettled)
  const onProjectsErrorRef = useRef(onProjectsError)
  const onFoldersErrorRef = useRef(onFoldersError)
  const writeLocalSelectionRef = useRef(writeLocalSelection)
  const [studioProjectId, setStudioProjectIdState] = useState<string | null>(initialSelectionRef.current?.projectId ?? null)
  const [studioActiveFolderId, setStudioActiveFolderIdState] = useState<string | null>(initialSelectionRef.current?.folderId ?? null)
  const [studioProjects, setStudioProjects] = useState<ProjectSummary[]>([])
  const [studioProjectsLoading, setStudioProjectsLoading] = useState<boolean>(initialProjectsLoading)
  const [studioFolders, setStudioFolders] = useState<FolderSummary[]>([])
  const [studioFoldersLoading, setStudioFoldersLoading] = useState<boolean>(false)
  const [hasLoadedStudioSelection, setHasLoadedStudioSelection] = useState<boolean>(false)

  useEffect(() => {
    onUserPrefsLoadedRef.current = onUserPrefsLoaded
  }, [onUserPrefsLoaded])

  useEffect(() => {
    onUserPrefsSettledRef.current = onUserPrefsSettled
  }, [onUserPrefsSettled])

  useEffect(() => {
    onProjectsErrorRef.current = onProjectsError
  }, [onProjectsError])

  useEffect(() => {
    onFoldersErrorRef.current = onFoldersError
  }, [onFoldersError])

  useEffect(() => {
    writeLocalSelectionRef.current = writeLocalSelection
  }, [writeLocalSelection])

  const setStudioProjectId = useCallback((projectId: string | null) => {
    preferredStudioProjectIdRef.current = projectId
    preferredStudioFolderIdRef.current = null
    setStudioProjectIdState(projectId)
    setStudioActiveFolderIdState(null)
  }, [])

  const setStudioActiveFolderId = useCallback((folderId: string | null) => {
    preferredStudioFolderIdRef.current = folderId
    setStudioActiveFolderIdState(folderId)
  }, [])

  useEffect(() => {
    setHasLoadedStudioSelection(false)

    if (!authUid) {
      setHasLoadedStudioSelection(true)
      onUserPrefsSettledRef.current?.()
      return
    }

    let cancelled = false
    void loadUserPrefs(authUid)
      .then((prefs) => {
        if (cancelled) return

        onUserPrefsLoadedRef.current?.(prefs)

        if (!prefs) {
          return
        }

        if (selectionPriority === 'local') {
          if (prefs.activeProjectId !== undefined) {
            preferredStudioProjectIdRef.current = preferredStudioProjectIdRef.current ?? prefs.activeProjectId ?? null
            setStudioProjectIdState((current) => current ?? prefs.activeProjectId ?? null)
          }
          if (prefs.activeFolderId !== undefined) {
            preferredStudioFolderIdRef.current = preferredStudioFolderIdRef.current ?? prefs.activeFolderId ?? null
            setStudioActiveFolderIdState((current) => current ?? prefs.activeFolderId ?? null)
          }
          return
        }

        if (prefs.activeProjectId !== undefined) {
          preferredStudioProjectIdRef.current = prefs.activeProjectId ?? null
          setStudioProjectIdState(prefs.activeProjectId ?? null)
        }
        if (prefs.activeFolderId !== undefined) {
          preferredStudioFolderIdRef.current = prefs.activeFolderId ?? null
          setStudioActiveFolderIdState(prefs.activeFolderId ?? null)
        }
      })
      .finally(() => {
        if (!cancelled) {
          setHasLoadedStudioSelection(true)
          onUserPrefsSettledRef.current?.()
        }
      })

    return () => {
      cancelled = true
    }
  }, [authUid, selectionPriority])

  useEffect(() => {
    if (!authUid) {
      setStudioProjects([])
      setStudioProjectsLoading(false)
      return
    }

    setStudioProjectsLoading(true)
    const unsub = subscribeToUserProjects(
      authUid,
      (next) => {
        setStudioProjects(next)
        setStudioProjectsLoading(false)
        setStudioProjectIdState((current) => {
          if (current && next.some((project) => project.id === current)) {
            return current
          }

          if (preferredStudioProjectIdRef.current && next.some((project) => project.id === preferredStudioProjectIdRef.current)) {
            return preferredStudioProjectIdRef.current
          }

          return null
        })
      },
      (error) => {
        setStudioProjects([])
        setStudioProjectsLoading(false)
        onProjectsErrorRef.current?.(error)
      },
    )

    return unsub
  }, [authUid])

  useEffect(() => {
    if (!studioProjectId) {
      setStudioFolders([])
      setStudioFoldersLoading(false)
      setStudioActiveFolderIdState(null)
      return
    }

    setStudioFoldersLoading(true)
    const projectRole = studioProjects.find((item) => item.id === studioProjectId)?.role || null
    const unsub = subscribeToProjectFolders(
      studioProjectId,
      { userId: authUid, role: projectRole },
      (folders) => {
        setStudioFolders(folders)
        setStudioFoldersLoading(false)
        setStudioActiveFolderIdState((current) => {
          if (current && folders.some((folder) => folder.id === current)) {
            return current
          }

          if (preferredStudioFolderIdRef.current && folders.some((folder) => folder.id === preferredStudioFolderIdRef.current)) {
            return preferredStudioFolderIdRef.current
          }

          return null
        })
      },
      (error) => {
        setStudioFolders([])
        setStudioFoldersLoading(false)
        onFoldersErrorRef.current?.(error)
      },
    )

    return () => {
      unsub()
    }
  }, [authUid, studioProjectId, studioProjects])

  useEffect(() => {
    preferredStudioProjectIdRef.current = studioProjectId
    preferredStudioFolderIdRef.current = studioActiveFolderId
    writeLocalSelectionRef.current({
      projectId: studioProjectId,
      folderId: studioActiveFolderId,
    })

    if (!persistUserPrefs || !authUid || !hasLoadedStudioSelection) {
      return
    }

    const timer = window.setTimeout(() => {
      void saveUserPrefs(authUid, {
        activeProjectId: studioProjectId,
        activeFolderId: studioActiveFolderId,
      })
    }, 300)

    return () => window.clearTimeout(timer)
  }, [authUid, hasLoadedStudioSelection, persistUserPrefs, studioActiveFolderId, studioProjectId])

  return {
    studioProjectId,
    setStudioProjectId,
    studioProjects,
    studioProjectsLoading,
    studioActiveFolderId,
    setStudioActiveFolderId,
    studioFolders,
    studioFoldersLoading,
    hasLoadedStudioSelection,
  }
}