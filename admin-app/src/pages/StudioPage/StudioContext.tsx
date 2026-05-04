/**
 * StudioContext.tsx
 *
 * Provides the active organization + project selection state to the entire
 * Studio section. Persists the last-selected orgId / projectId to
 * localStorage so the user lands back where they left off.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { FolderSummary, OrgSummary, ProjectMember, ProjectSummary } from '../../types/studio'
import { loadUserPrefs, saveUserPrefs } from '../../lib/adminRepo'
import {
  createFolder,
  createOrg,
  createProject,
  deleteFolder,
  subscribeToOrgProjects,
  subscribeToProjectFolders,
  subscribeToProjectMembers,
  subscribeToUserOrgs,
  updateFolder,
  updateProject,
  
  type CreateOrgInput,
  type CreateProjectInput,
} from '../../lib/studioService'

const LS_ACTIVE_ORG = 'studio:activeOrgId'
const LS_ACTIVE_ORG_NAME = 'studio:activeOrgName'
const LS_ACTIVE_PROJECT = 'studio:activeProjectId'
const LS_ACTIVE_PROJECT_NAME = 'studio:activeProjectName'

// ─── Types ────────────────────────────────────────────────────────────────────

type UserIdentity = {
  uid: string
  displayName: string
  email: string
  photoUrl: string
}

type StudioContextValue = {
  // Org list
  orgs: OrgSummary[]
  orgsLoading: boolean
  // Active selections
  activeOrgId: string | null
  activeOrg: OrgSummary | null
  setActiveOrgId: (id: string | null) => void
  // Projects inside active org
  projects: ProjectSummary[]
  projectsLoading: boolean
  activeProjectId: string | null
  activeProject: ProjectSummary | null
  setActiveProjectId: (id: string | null) => void
  // Folders inside active project
  folders: FolderSummary[]
  foldersLoading: boolean
  handleCreateFolder: (name: string, parentId?: string | null) => Promise<FolderSummary | null>
  handleRenameFolder: (folderId: string, name: string) => Promise<void>
  handleDeleteFolder: (folderId: string) => Promise<void>
  // Members of active project
  projectMembers: ProjectMember[]
  projectMembersLoading: boolean
  // Actions
  handleCreateOrg: (input: CreateOrgInput) => Promise<OrgSummary | null>
  handleCreateProject: (input: Omit<CreateProjectInput, 'orgId'>) => Promise<ProjectSummary | null>
  handleUpdateProject: (patch: Parameters<typeof updateProject>[1]) => Promise<void>
  // Misc
  error: string | null
  clearError: () => void
}

// ─── Context ──────────────────────────────────────────────────────────────────

const StudioContext = createContext<StudioContextValue | null>(null)

export function useStudio(): StudioContextValue {
  const ctx = useContext(StudioContext)
  if (!ctx) throw new Error('useStudio must be used inside <StudioProvider>')
  return ctx
}

// ─── Provider ────────────────────────────────────────────────────────────────

export function StudioProvider({
  user,
  children,
}: {
  user: UserIdentity | null
  children: ReactNode
}) {
  const [orgs, setOrgs] = useState<OrgSummary[]>([])
  const [orgsLoading, setOrgsLoading] = useState(true)
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [folders, setFolders] = useState<FolderSummary[]>([])
  const [foldersLoading, setFoldersLoading] = useState(false)
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([])
  const [projectMembersLoading, setProjectMembersLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [activeOrgId, setActiveOrgIdState] = useState<string | null>(
    () => localStorage.getItem(LS_ACTIVE_ORG) ?? null,
  )
  const [activeProjectId, setActiveProjectIdState] = useState<string | null>(
    () => localStorage.getItem(LS_ACTIVE_PROJECT) ?? null,
  )

  const projectsUnsubRef = useRef<(() => void) | null>(null)
  const foldersUnsubRef = useRef<(() => void) | null>(null)
  const membersUnsubRef = useRef<(() => void) | null>(null)
  const [hasLoadedPersistedSelection, setHasLoadedPersistedSelection] = useState(false)

  useEffect(() => {
    setHasLoadedPersistedSelection(false)

    if (!user) {
      setActiveOrgIdState(localStorage.getItem(LS_ACTIVE_ORG) ?? null)
      setActiveProjectIdState(localStorage.getItem(LS_ACTIVE_PROJECT) ?? null)
      setHasLoadedPersistedSelection(true)
      return
    }

    let cancelled = false
    void loadUserPrefs(user.uid)
      .then((prefs) => {
        if (cancelled) return
        setActiveOrgIdState(prefs?.activeOrgId !== undefined ? prefs.activeOrgId : (localStorage.getItem(LS_ACTIVE_ORG) ?? null))
        setActiveProjectIdState(
          prefs?.activeProjectId !== undefined ? prefs.activeProjectId : (localStorage.getItem(LS_ACTIVE_PROJECT) ?? null),
        )
      })
      .catch(() => {
        if (cancelled) return
        setActiveOrgIdState(localStorage.getItem(LS_ACTIVE_ORG) ?? null)
        setActiveProjectIdState(localStorage.getItem(LS_ACTIVE_PROJECT) ?? null)
      })
      .finally(() => {
        if (!cancelled) setHasLoadedPersistedSelection(true)
      })

    return () => {
      cancelled = true
    }
  }, [user])

  useEffect(() => {
    if (!user || !hasLoadedPersistedSelection) return
    const timeout = window.setTimeout(() => {
      void saveUserPrefs(user.uid, {
        activeOrgId,
        activeProjectId,
      })
    }, 300)
    return () => window.clearTimeout(timeout)
  }, [user, activeOrgId, activeProjectId, hasLoadedPersistedSelection])

  // ── Subscribe to user's orgs ──────────────────────────────────────────────
  useEffect(() => {
    if (!user) {
      setOrgs([])
      setOrgsLoading(false)
      return
    }
    setOrgsLoading(true)
    const unsub = subscribeToUserOrgs(
      user.uid,
      (nextOrgs) => {
        setOrgs(nextOrgs)
        setOrgsLoading(false)
        // Auto-select first org if none stored
        setActiveOrgIdState((current) => {
          if (current && nextOrgs.some((o) => o.id === current)) return current
          const first = nextOrgs[0]?.id ?? null
          if (first) localStorage.setItem(LS_ACTIVE_ORG, first)
          return first
        })
      },
      (err) => {
        setError(err.message)
        setOrgsLoading(false)
      },
    )
    return unsub
  }, [user])

  // ── Subscribe to projects inside active org ───────────────────────────────
  useEffect(() => {
    projectsUnsubRef.current?.()
    projectsUnsubRef.current = null

    if (!user || !activeOrgId) {
      setProjects([])
      setProjectsLoading(false)
      return
    }

    setProjectsLoading(true)
    const unsub = subscribeToOrgProjects(
      activeOrgId,
      user.uid,
      (nextProjects) => {
        setProjects(nextProjects)
        setProjectsLoading(false)
        // Clear stale project selection if it no longer exists
        setActiveProjectIdState((current) => {
          if (current && nextProjects.some((p) => p.id === current)) return current
          localStorage.removeItem(LS_ACTIVE_PROJECT)
          return null
        })
      },
      (err) => {
        setError(err.message)
        setProjectsLoading(false)
      },
    )
    projectsUnsubRef.current = unsub
    return () => {
      unsub()
      projectsUnsubRef.current = null
    }
  }, [user, activeOrgId])

  // ── Subscribe to folders + members inside active project ─────────────────
  useEffect(() => {
    foldersUnsubRef.current?.()
    foldersUnsubRef.current = null
    membersUnsubRef.current?.()
    membersUnsubRef.current = null

    if (!activeProjectId || !user) {
      setFolders([])
      setFoldersLoading(false)
      setProjectMembers([])
      setProjectMembersLoading(false)
      return
    }

    setFoldersLoading(true)
    const activeProjectRole = projects.find((item) => item.id === activeProjectId)?.role || null
    foldersUnsubRef.current = subscribeToProjectFolders(
      activeProjectId,
      { userId: user.uid, role: activeProjectRole },
      (next) => { setFolders(next); setFoldersLoading(false) },
      (err) => { setError(err.message); setFoldersLoading(false) },
    )

    setProjectMembersLoading(true)
    membersUnsubRef.current = subscribeToProjectMembers(
      activeProjectId,
      (next) => { setProjectMembers(next); setProjectMembersLoading(false) },
      (err) => { setError(err.message); setProjectMembersLoading(false) },
    )

    return () => {
      foldersUnsubRef.current?.()
      foldersUnsubRef.current = null
      membersUnsubRef.current?.()
      membersUnsubRef.current = null
    }
  }, [activeProjectId, projects, user])

  // Derived selectors
  const activeOrg = useMemo(
    () => orgs.find((o) => o.id === activeOrgId) ?? null,
    [orgs, activeOrgId],
  )
  const activeProject = useMemo(
    () => projects.find((p) => p.id === activeProjectId) ?? null,
    [projects, activeProjectId],
  )

  // Persisted setters
  const setActiveOrgId = useCallback((id: string | null) => {
    setActiveOrgIdState(id)
    setActiveProjectIdState(null)
    localStorage.removeItem(LS_ACTIVE_PROJECT)
    localStorage.removeItem(LS_ACTIVE_PROJECT_NAME)
    if (id) {
      localStorage.setItem(LS_ACTIVE_ORG, id)
      const orgName = orgs.find((o) => o.id === id)?.name ?? ''
      if (orgName) localStorage.setItem(LS_ACTIVE_ORG_NAME, orgName)
    } else {
      localStorage.removeItem(LS_ACTIVE_ORG)
      localStorage.removeItem(LS_ACTIVE_ORG_NAME)
    }
  }, [orgs])

  const setActiveProjectId = useCallback((id: string | null) => {
    setActiveProjectIdState(id)
    if (id) {
      localStorage.setItem(LS_ACTIVE_PROJECT, id)
      const projectName = projects.find((p) => p.id === id)?.name ?? ''
      if (projectName) localStorage.setItem(LS_ACTIVE_PROJECT_NAME, projectName)
    } else {
      localStorage.removeItem(LS_ACTIVE_PROJECT)
      localStorage.removeItem(LS_ACTIVE_PROJECT_NAME)
    }
  }, [projects])

  // ── Org creation ─────────────────────────────────────────────────────────
  const handleCreateOrg = useCallback(
    async (input: CreateOrgInput): Promise<OrgSummary | null> => {
      if (!user) return null
      try {
        const org = await createOrg(input, user)
        localStorage.setItem(LS_ACTIVE_ORG_NAME, org.name)
        setActiveOrgId(org.id)
        return {
          id: org.id,
          name: org.name,
          slug: org.slug,
          logoUrl: org.logoUrl,
          plan: org.plan,
          role: 'owner',
        }
      } catch (err) {
        setError((err as Error).message || 'Could not create organization.')
        return null
      }
    },
    [user, setActiveOrgId],
  )

  // ── Project creation ──────────────────────────────────────────────────────
  const handleCreateProject = useCallback(
    async (input: Omit<CreateProjectInput, 'orgId'>): Promise<ProjectSummary | null> => {
      if (!user || !activeOrgId) return null
      try {
        const project = await createProject({ ...input, orgId: activeOrgId }, user)
        localStorage.setItem(LS_ACTIVE_PROJECT_NAME, project.name)
        setActiveProjectId(project.id)
        return {
          id: project.id,
          orgId: project.orgId,
          name: project.name,
          description: project.description,
          visibility: project.visibility,
          status: project.status,
          coverImageUrl: project.coverImageUrl,
          tags: project.tags,
          role: 'owner',
          updatedAt: Date.now(),
        }
      } catch (err) {
        setError((err as Error).message || 'Could not create project.')
        return null
      }
    },
    [user, activeOrgId, setActiveProjectId],
  )

  // ── Project update ────────────────────────────────────────────────────────
  const handleUpdateProject = useCallback(
    async (patch: Parameters<typeof updateProject>[1]): Promise<void> => {
      if (!activeProjectId) return
      try {
        await updateProject(activeProjectId, patch)
        if (patch.name) localStorage.setItem(LS_ACTIVE_PROJECT_NAME, patch.name)
      } catch (err) {
        setError((err as Error).message || 'Could not update project.')
      }
    },
    [activeProjectId],
  )

  // ── Folder actions ────────────────────────────────────────────────────────
  const handleCreateFolder = useCallback(
    async (name: string, parentId: string | null = null): Promise<FolderSummary | null> => {
      if (!user || !activeProjectId) return null
      try {
        return await createFolder({ projectId: activeProjectId, name, parentId }, user.uid)
      } catch (err) {
        setError((err as Error).message || 'Could not create folder.')
        return null
      }
    },
    [user, activeProjectId],
  )

  const handleRenameFolder = useCallback(
    async (folderId: string, name: string): Promise<void> => {
      if (!activeProjectId) return
      try {
        await updateFolder(activeProjectId, folderId, name)
      } catch (err) {
        setError((err as Error).message || 'Could not rename folder.')
      }
    },
    [activeProjectId],
  )

  const handleDeleteFolder = useCallback(
    async (folderId: string): Promise<void> => {
      if (!activeProjectId) return
      try {
        await deleteFolder(activeProjectId, folderId)
      } catch (err) {
        setError((err as Error).message || 'Could not delete folder.')
      }
    },
    [activeProjectId],
  )

  const clearError = useCallback(() => setError(null), [])

  const value: StudioContextValue = {
    orgs,
    orgsLoading,
    activeOrgId,
    activeOrg,
    setActiveOrgId,
    projects,
    projectsLoading,
    activeProjectId,
    activeProject,
    setActiveProjectId,
    folders,
    foldersLoading,
    handleCreateFolder,
    handleRenameFolder,
    handleDeleteFolder,
    projectMembers,
    projectMembersLoading,
    handleCreateOrg,
    handleCreateProject,
    handleUpdateProject,
    error,
    clearError,
  }

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>
}
