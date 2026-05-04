import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { FilePenLine } from 'lucide-react'
import { auth } from '../../lib/firebase'
import { findUserByEmail } from '../../lib/adminRepo'
import {
  addProjectMember,
  createFolder,
  createProject,
  deleteFolder,
  deleteStudioProject,
  removeProjectMember,
  setFolderMemberVisibility,
  setProjectMemberRole,
  subscribeToProjectFolders,
  subscribeToProjectMembers,
  updateFolder,
  updateStudioProject,
} from '../../lib/studioService'
import type { FolderSummary, ProjectMember, ProjectSummary } from '../../types/studio'

const STUDIO_ACTIVE_PROJECT_ID_KEY = 'studio:activeProjectId'
const STUDIO_ACTIVE_PROJECT_NAME_KEY = 'studio:activeProjectName'

// ── Access tab types ──────────────────────────────────────────────────────────

interface ProjectAccessDraft {
  enabled: boolean
  role: 'editor' | 'viewer'
  allowedFolderIds: Set<string>
}

type UserAccessDraft = Record<string, Record<string, ProjectAccessDraft>>

interface RosterEntry {
  userId: string
  displayName: string
  email: string
  projectIds: Set<string>
}

// ── Props ─────────────────────────────────────────────────────────────────────

interface StudioDialogProps {
  studioProjects: ProjectSummary[]
  studioProjectsLoading: boolean
  studioProjectId: string | null
  visibleStudioFolders: FolderSummary[]
  studioFolders: FolderSummary[]
  studioFoldersLoading: boolean
  studioMembers: ProjectMember[]
  currentMemberRole: 'owner' | 'editor' | 'viewer' | null
  studioActiveFolderId: string | null
  onClose: () => void
  onProjectSelect: (id: string | null) => void
  onProjectCreated: (projectId: string, projectName: string) => void
}

export const StudioDialog = memo(function StudioDialog({
  studioProjects,
  studioProjectsLoading,
  studioProjectId,
  visibleStudioFolders,
  studioFolders,
  studioFoldersLoading,
  studioMembers,
  onClose,
  onProjectSelect,
  onProjectCreated,
}: StudioDialogProps) {
  const [tab, setTab] = useState<'project' | 'folders' | 'access'>('project')
  const [newProjectName, setNewProjectName] = useState('')
  const [newFolderName, setNewFolderName] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  // ── Access tab state ──────────────────────────────────────────────────────
  const [allProjectMembers, setAllProjectMembers] = useState<Record<string, ProjectMember[]>>({})
  const [allProjectFolders, setAllProjectFolders] = useState<Record<string, FolderSummary[]>>({})
  const [accessDataLoading, setAccessDataLoading] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [expandedDraftProjects, setExpandedDraftProjects] = useState<Set<string>>(new Set())
  const [userAccessDraft, setUserAccessDraft] = useState<UserAccessDraft>({})
  const [userAccessDirty, setUserAccessDirty] = useState<Record<string, boolean>>({})
  const [userAccessBusy, setUserAccessBusy] = useState<Record<string, boolean>>({})
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor')

  const accessSubsRef = useRef<Map<string, () => void>>(new Map())
  const projectsKeyRef = useRef('')

  // ── Subscribe to all project data when access tab is active ───────────────
  useEffect(() => {
    if (tab !== 'access') return
    const projectsKey = studioProjects.map((p) => p.id).join(',')
    if (projectsKey === projectsKeyRef.current) return
    projectsKeyRef.current = projectsKey

    // Unsubscribe from removed projects
    for (const key of Array.from(accessSubsRef.current.keys())) {
      const projectId = key.slice(2)
      if (!studioProjects.find((p) => p.id === projectId)) {
        accessSubsRef.current.get(key)?.()
        accessSubsRef.current.delete(key)
      }
    }

    if (studioProjects.length === 0) return
    const currentUid = auth.currentUser?.uid ?? ''
    let loaded = 0
    const newProjects = studioProjects.filter((p) => !accessSubsRef.current.has(`f:${p.id}`))
    const total = newProjects.length * 2
    if (total > 0) setAccessDataLoading(true)

    function onLoaded() {
      loaded++
      if (loaded >= total) setAccessDataLoading(false)
    }

    for (const project of newProjects) {
      const unsubFolders = subscribeToProjectFolders(
        project.id,
        { userId: currentUid, role: 'owner' },
        (folders) => {
          setAllProjectFolders((prev) => ({ ...prev, [project.id]: folders }))
          onLoaded()
        },
      )
      const unsubMembers = subscribeToProjectMembers(project.id, (members) => {
        setAllProjectMembers((prev) => ({ ...prev, [project.id]: members }))
        onLoaded()
      })
      accessSubsRef.current.set(`f:${project.id}`, unsubFolders)
      accessSubsRef.current.set(`m:${project.id}`, unsubMembers)
    }
  }, [tab, studioProjects])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      for (const unsub of accessSubsRef.current.values()) unsub()
    }
  }, [])

  // ── Derived: unified roster ────────────────────────────────────────────────
  const roster = useMemo<RosterEntry[]>(() => {
    const map = new Map<string, RosterEntry>()
    for (const [projectId, members] of Object.entries(allProjectMembers)) {
      for (const m of members) {
        if (m.role === 'owner') continue
        if (!map.has(m.userId)) {
          map.set(m.userId, { userId: m.userId, displayName: m.displayName, email: m.email, projectIds: new Set([projectId]) })
        } else {
          map.get(m.userId)!.projectIds.add(projectId)
        }
      }
    }
    return Array.from(map.values()).sort((a, b) => (a.displayName || a.email).localeCompare(b.displayName || b.email))
  }, [allProjectMembers])

  // ── Build draft from current data ─────────────────────────────────────────
  function buildUserDraft(userId: string): Record<string, ProjectAccessDraft> {
    const draft: Record<string, ProjectAccessDraft> = {}
    for (const project of studioProjects) {
      const members = allProjectMembers[project.id] ?? []
      const folders = allProjectFolders[project.id] ?? []
      const member = members.find((m) => m.userId === userId)
      draft[project.id] = {
        enabled: !!member,
        role: (member?.role === 'editor' || member?.role === 'viewer') ? member.role : 'viewer',
        allowedFolderIds: new Set(folders.filter((f) => !f.hiddenMemberUids?.includes(userId)).map((f) => f.id)),
      }
    }
    return draft
  }

  function handleSelectUser(userId: string) {
    if (selectedUserId === userId) { setSelectedUserId(null); return }
    setSelectedUserId(userId)
    setExpandedDraftProjects(new Set())
    if (!userAccessDirty[userId]) {
      setUserAccessDraft((prev) => ({ ...prev, [userId]: buildUserDraft(userId) }))
    }
  }

  function handleToggleProject(userId: string, projectId: string, enabled: boolean) {
    setUserAccessDraft((prev) => {
      const userDraft = { ...(prev[userId] ?? buildUserDraft(userId)) }
      const existing = userDraft[projectId] ?? { enabled: false, role: 'viewer' as const, allowedFolderIds: new Set<string>() }
      const folders = allProjectFolders[projectId] ?? []
      userDraft[projectId] = { ...existing, enabled, allowedFolderIds: enabled ? new Set(folders.map((f) => f.id)) : existing.allowedFolderIds }
      return { ...prev, [userId]: userDraft }
    })
    setUserAccessDirty((prev) => ({ ...prev, [userId]: true }))
  }

  function handleSetProjectRole(userId: string, projectId: string, role: 'editor' | 'viewer') {
    setUserAccessDraft((prev) => {
      const userDraft = { ...(prev[userId] ?? buildUserDraft(userId)) }
      userDraft[projectId] = { ...(userDraft[projectId] ?? { enabled: true, allowedFolderIds: new Set<string>() }), role }
      return { ...prev, [userId]: userDraft }
    })
    setUserAccessDirty((prev) => ({ ...prev, [userId]: true }))
  }

  function handleToggleFolder(userId: string, projectId: string, folderId: string, checked: boolean) {
    setUserAccessDraft((prev) => {
      const userDraft = { ...(prev[userId] ?? buildUserDraft(userId)) }
      const existing = userDraft[projectId] ?? { enabled: true, role: 'viewer' as const, allowedFolderIds: new Set<string>() }
      const next = new Set(existing.allowedFolderIds)
      if (checked) next.add(folderId); else next.delete(folderId)
      userDraft[projectId] = { ...existing, allowedFolderIds: next }
      return { ...prev, [userId]: userDraft }
    })
    setUserAccessDirty((prev) => ({ ...prev, [userId]: true }))
  }

  function handleDiscardUserDraft(userId: string) {
    setUserAccessDraft((prev) => ({ ...prev, [userId]: buildUserDraft(userId) }))
    setUserAccessDirty((prev) => ({ ...prev, [userId]: false }))
  }

  async function handleSaveUserAccess(userId: string) {
    if (!auth.currentUser) return
    const draft = userAccessDraft[userId]
    if (!draft) return
    setUserAccessBusy((prev) => ({ ...prev, [userId]: true }))
    try {
      await Promise.all(studioProjects.map(async (project) => {
        const projectDraft = draft[project.id]
        if (!projectDraft) return
        const existingMember = (allProjectMembers[project.id] ?? []).find((m) => m.userId === userId)
        const folders = allProjectFolders[project.id] ?? []
        if (projectDraft.enabled) {
          if (!existingMember) {
            const rosterEntry = roster.find((r) => r.userId === userId)
            await addProjectMember(project.id, { uid: userId, displayName: rosterEntry?.displayName ?? '', email: rosterEntry?.email ?? '', photoUrl: '' }, projectDraft.role, auth.currentUser!.uid, { folderScope: 'all' })
          } else if (existingMember.role !== projectDraft.role) {
            await setProjectMemberRole(project.id, userId, projectDraft.role)
          }
          await Promise.all(folders.map((folder) => setFolderMemberVisibility(project.id, folder.id, userId, projectDraft.allowedFolderIds.has(folder.id) ? 'allowed' : 'hidden')))
        } else if (existingMember) {
          await removeProjectMember(project.id, userId)
        }
      }))
      setUserAccessDirty((prev) => ({ ...prev, [userId]: false }))
      setMessage('Access saved.')
    } catch (err: unknown) {
      setMessage(`Failed to save: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setUserAccessBusy((prev) => ({ ...prev, [userId]: false }))
    }
  }

  async function handleRemoveFromAllProjects(userId: string) {
    if (!window.confirm('Remove this user from all projects?')) return
    setUserAccessBusy((prev) => ({ ...prev, [userId]: true }))
    try {
      await Promise.all(studioProjects.map(async (project) => {
        if ((allProjectMembers[project.id] ?? []).some((m) => m.userId === userId)) {
          await removeProjectMember(project.id, userId)
        }
      }))
      setSelectedUserId(null)
      setMessage('User removed from all projects.')
    } catch {
      setMessage('Could not remove user.')
    } finally {
      setUserAccessBusy((prev) => ({ ...prev, [userId]: false }))
    }
  }

  async function handleInviteNew() {
    if (!auth.currentUser || studioProjects.length === 0) return
    const email = inviteEmail.trim().toLowerCase()
    if (!email || !email.includes('@')) { setMessage('Enter a valid email address.'); return }
    setBusy(true)
    try {
      const recipient = await findUserByEmail(email)
      if (!recipient?.uid) { setMessage(`No account found for ${email}.`); return }
      const targetProjectId = studioProjectId ?? studioProjects[0].id
      const folders = allProjectFolders[targetProjectId] ?? []
      await addProjectMember(targetProjectId, { uid: recipient.uid, displayName: recipient.displayName || recipient.email || email, email: recipient.email || email, photoUrl: recipient.photoURL || '' }, inviteRole, auth.currentUser.uid, { folderScope: 'all' })
      await Promise.all(folders.map((folder) => setFolderMemberVisibility(targetProjectId, folder.id, recipient.uid, 'allowed')))
      setInviteEmail('')
      setMessage(`${email} added. Adjust their project access below.`)
    } catch (err: unknown) {
      setMessage(`Could not invite: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setBusy(false)
    }
  }

  // ── Project/Folder handlers ───────────────────────────────────────────────

  async function handleCreateProject() {
    if (!auth.currentUser) return
    const name = newProjectName.trim()
    if (!name) { setMessage('Project name is required.'); return }
    setBusy(true)
    try {
      const project = await createProject(
        { orgId: auth.currentUser.uid, name, visibility: 'private' },
        { uid: auth.currentUser.uid, displayName: auth.currentUser.displayName || '', email: auth.currentUser.email || '', photoUrl: auth.currentUser.photoURL || '' },
      )
      setNewProjectName('')
      localStorage.setItem(STUDIO_ACTIVE_PROJECT_ID_KEY, project.id)
      localStorage.setItem(STUDIO_ACTIVE_PROJECT_NAME_KEY, project.name)
      onProjectCreated(project.id, project.name)
      setMessage('Project created.')
    } catch {
      setMessage('Could not create project.')
    } finally {
      setBusy(false)
    }
  }

  async function handleRenameProject(projectId: string, oldName: string) {
    const next = window.prompt('Rename project:', oldName)
    if (!next?.trim() || next.trim() === oldName) return
    setBusy(true)
    try { await updateStudioProject(projectId, next.trim()); setMessage('Project renamed.') }
    catch { setMessage('Failed to rename project.') }
    finally { setBusy(false) }
  }

  async function handleDeleteProject(projectId: string) {
    if (!window.confirm('Delete this project? This cannot be undone.')) return
    setBusy(true)
    try {
      await deleteStudioProject(projectId)
      if (studioProjectId === projectId) onProjectSelect(null)
      setMessage('Project deleted.')
    } catch { setMessage('Failed to delete project.') }
    finally { setBusy(false) }
  }

  async function handleCreateFolder() {
    if (!studioProjectId || !auth.currentUser) return
    const name = newFolderName.trim()
    if (!name) { setMessage('Folder name is required.'); return }
    setBusy(true)
    try {
      await createFolder({ projectId: studioProjectId, name, parentId: null }, auth.currentUser.uid)
      setNewFolderName('')
      setMessage('Folder created.')
    } catch { setMessage('Could not create folder.') }
    finally { setBusy(false) }
  }

  async function handleRenameFolder(projectId: string, folderId: string, oldName: string) {
    const next = window.prompt('Rename folder:', oldName)
    if (!next?.trim() || next.trim() === oldName) return
    setBusy(true)
    try { await updateFolder(projectId, folderId, next.trim()); setMessage('Folder renamed.') }
    catch { setMessage('Failed to rename folder.') }
    finally { setBusy(false) }
  }

  async function handleDeleteFolder(projectId: string, folderId: string) {
    if (!window.confirm('Delete this folder?')) return
    setBusy(true)
    try { await deleteFolder(projectId, folderId); setMessage('Folder deleted.') }
    catch { setMessage('Failed to delete folder.') }
    finally { setBusy(false) }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const currentUser = auth.currentUser
  const totalAccessMembers = roster.length

  return (
    <div className="lab-studio-dialog" onClick={(e) => e.stopPropagation()}>
      <div className="lab-video-dialog-head">
        <strong className="lab-studio-dialog-title">Studio</strong>
        <button type="button" className="lab-icon-btn" onClick={onClose} title="Close">✕</button>
      </div>

      <nav className="lab-studio-tabs" aria-label="Studio sections">
        {(['project', 'folders', 'access'] as const).map((t) => (
          <button key={t} type="button" className={`lab-studio-tab${tab === t ? ' is-active' : ''}`} onClick={() => setTab(t)}>
            {t === 'project' ? 'Project' : t === 'folders' ? 'Folders' : 'Access'}
            {t === 'folders' && studioProjectId ? <span className="lab-studio-tab-badge">{visibleStudioFolders.length}</span> : null}
            {t === 'access' && totalAccessMembers > 0 ? <span className="lab-studio-tab-badge">{totalAccessMembers}</span> : null}
          </button>
        ))}
      </nav>

      {/* ── Project tab ── */}
      {tab === 'project' && (
        <div className="lab-studio-tab-panel">
          <div className="lab-studio-account-card">
            <div className="lab-studio-account-avatar">{(currentUser?.displayName || currentUser?.email || '?')[0].toUpperCase()}</div>
            <div className="lab-studio-account-info">
              <span className="lab-studio-account-name">{currentUser?.displayName || 'Unknown'}</span>
              <span className="lab-studio-account-email">{currentUser?.email || ''}</span>
            </div>
            <div className="lab-studio-account-stats">
              <div className="lab-studio-stat"><strong>{studioProjects.length}</strong><span>Projects</span></div>
              <div className="lab-studio-stat"><strong>{visibleStudioFolders.length}</strong><span>Folders</span></div>
              <div className="lab-studio-stat"><strong>{studioMembers.length}</strong><span>People</span></div>
            </div>
          </div>
          <div className="lab-studio-panel-section">
            <div className="lab-studio-panel-section-title">Active project</div>
            <div className="lab-studio-row-group">
              <select className="lab-select lab-select--full" value={studioProjectId || ''} onChange={(e) => onProjectSelect(e.target.value || null)} title="Active project">
                <option value="">— No project —</option>
                {studioProjectsLoading ? <option value="" disabled>Loading…</option> : studioProjects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              {studioProjectId && (
                <>
                  <button type="button" className="lab-studio-icon-action" disabled={busy} onClick={() => handleRenameProject(studioProjectId, studioProjects.find((p) => p.id === studioProjectId)?.name || '')} title="Rename"><FilePenLine size={15} /></button>
                  <button type="button" className="lab-studio-icon-action lab-studio-icon-action--danger" disabled={busy} onClick={() => handleDeleteProject(studioProjectId)} title="Delete project">✕</button>
                </>
              )}
            </div>
            {studioProjectId && <p className="lab-studio-project-hint">This project is active — folders, collaborators, and references are tied to it.</p>}
          </div>
          <div className="lab-studio-panel-section">
            <div className="lab-studio-panel-section-title">New project</div>
            <div className="lab-studio-row-group">
              <input className="lab-input lab-input--full" value={newProjectName} onChange={(e) => setNewProjectName(e.target.value)} placeholder="Project name" onKeyDown={(e) => { if (e.key === 'Enter' && newProjectName.trim()) void handleCreateProject() }} />
              <button type="button" className="lab-primary-btn" disabled={busy || !newProjectName.trim()} onClick={() => void handleCreateProject()}>Create</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Folders tab ── */}
      {tab === 'folders' && (
        <div className="lab-studio-tab-panel">
          {!studioProjectId ? (
            <div className="lab-studio-gate-hint">Select a project on the <button type="button" className="lab-studio-inline-link" onClick={() => setTab('project')}>Project tab</button> first.</div>
          ) : (
            <>
              <div className="lab-studio-folder-list">
                {studioFoldersLoading ? <div className="lab-studio-empty-hint">Loading…</div> : visibleStudioFolders.length === 0 ? <div className="lab-studio-empty-hint">No folders yet — create one below.</div> : (
                  visibleStudioFolders.map((folder) => (
                    <div key={folder.id} className="lab-studio-folder-row">
                      <svg className="lab-studio-folder-icon" width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M1.5 3A1.5 1.5 0 0 0 0 4.5v8A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-7A1.5 1.5 0 0 0 14.5 4H7.621a1.5 1.5 0 0 1-1.06-.44L5.207 2.207A1.5 1.5 0 0 0 4.146 2H1.5Z" /></svg>
                      <span className="lab-studio-folder-name">{folder.name}</span>
                      <div className="lab-studio-folder-row-actions">
                        <button type="button" className="lab-studio-icon-action" disabled={busy} onClick={() => handleRenameFolder(studioProjectId, folder.id, folder.name)} title="Rename"><FilePenLine size={13} /></button>
                        <button type="button" className="lab-studio-icon-action lab-studio-icon-action--danger" disabled={busy} onClick={() => handleDeleteFolder(studioProjectId, folder.id)} title="Delete">✕</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="lab-studio-panel-section">
                <div className="lab-studio-panel-section-title">New folder</div>
                <div className="lab-studio-row-group">
                  <input className="lab-input lab-input--full" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} placeholder="Folder name" onKeyDown={(e) => { if (e.key === 'Enter' && newFolderName.trim()) void handleCreateFolder() }} />
                  <button type="button" className="lab-primary-btn" disabled={busy || !newFolderName.trim()} onClick={() => void handleCreateFolder()}>Create</button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Access tab ── */}
      {tab === 'access' && (
        <div className="lab-studio-tab-panel lab-access-tab-panel">
          {studioProjects.length === 0 ? (
            <div className="lab-studio-gate-hint">Create a project first on the <button type="button" className="lab-studio-inline-link" onClick={() => setTab('project')}>Project tab</button>.</div>
          ) : (
            <>
              {/* Invite bar */}
              <div className="lab-access-invite-bar">
                <input className="lab-input lab-input--full" type="email" placeholder="Invite by email…" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && inviteEmail.trim()) void handleInviteNew() }} />
                <select className="lab-select" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as 'editor' | 'viewer')}>
                  <option value="editor">Editor</option>
                  <option value="viewer">Viewer</option>
                </select>
                <button type="button" className="lab-primary-btn" disabled={busy || !inviteEmail.trim()} onClick={() => void handleInviteNew()}>Invite</button>
              </div>

              {/* User roster */}
              <div className="lab-access-roster">
                {accessDataLoading && roster.length === 0 && <div className="lab-studio-empty-hint">Loading members…</div>}
                {!accessDataLoading && roster.length === 0 && <div className="lab-studio-empty-hint">No collaborators yet. Invite someone above.</div>}

                {roster.map((user) => {
                  const isOpen = selectedUserId === user.userId
                  const isBusy = !!userAccessBusy[user.userId]
                  const isDirty = !!userAccessDirty[user.userId]
                  const draft = userAccessDraft[user.userId]
                  const projectCount = user.projectIds.size
                  const initials = (user.displayName || user.email || '?').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()

                  return (
                    <div key={user.userId} className="lab-access-user-wrap">
                      <div className={`lab-access-user-row${isOpen ? ' is-open' : ''}`}>
                        <div className="lab-access-user-avatar">{initials}</div>
                        <div className="lab-access-user-identity">
                          <span className="lab-access-user-name">{user.displayName || user.email}</span>
                          <span className="lab-access-user-email">{user.email}</span>
                        </div>
                        <span className="lab-access-user-summary">
                          {projectCount === 0 ? <span className="lab-access-muted">No projects</span> : `${projectCount} project${projectCount === 1 ? '' : 's'}`}
                        </span>
                        <button type="button" className={`lab-access-manage-btn${isOpen ? ' is-open' : ''}`} onClick={() => handleSelectUser(user.userId)}>
                          Manage access <span className="lab-access-chevron">{isOpen ? '▲' : '▼'}</span>
                        </button>
                      </div>

                      {isOpen && draft && (
                        <div className="lab-access-user-picker">
                          <div className="lab-access-picker-title">
                            Project access for <strong>{user.displayName || user.email}</strong>
                          </div>

                          <div className="lab-access-project-list">
                            {studioProjects.map((project) => {
                              const projectDraft = draft[project.id] ?? { enabled: false, role: 'viewer' as const, allowedFolderIds: new Set<string>() }
                              const isEnabled = projectDraft.enabled
                              const folders = allProjectFolders[project.id] ?? []
                              const isFolderExpanded = expandedDraftProjects.has(project.id)

                              return (
                                <div key={project.id} className={`lab-access-project-item${isEnabled ? ' is-enabled' : ''}`}>
                                  <div className="lab-access-project-item-head">
                                    <input type="checkbox" className="lab-access-checkbox" checked={isEnabled} disabled={isBusy} onChange={(e) => handleToggleProject(user.userId, project.id, e.target.checked)} />
                                    <span className="lab-access-project-item-name">{project.name}</span>
                                    {isEnabled && (
                                      <>
                                        <div className="lab-access-role-toggle">
                                          <button type="button" className={`lab-access-role-btn${projectDraft.role === 'editor' ? ' is-active' : ''}`} disabled={isBusy} onClick={() => handleSetProjectRole(user.userId, project.id, 'editor')}>Editor</button>
                                          <button type="button" className={`lab-access-role-btn${projectDraft.role === 'viewer' ? ' is-active' : ''}`} disabled={isBusy} onClick={() => handleSetProjectRole(user.userId, project.id, 'viewer')}>Viewer</button>
                                        </div>
                                        {folders.length > 0 && (
                                          <button type="button" className="lab-access-folder-toggle" onClick={() => setExpandedDraftProjects((prev) => { const next = new Set(prev); if (next.has(project.id)) next.delete(project.id); else next.add(project.id); return next })}>
                                            {isFolderExpanded ? '▲' : '▾'} Folders ({folders.length})
                                          </button>
                                        )}
                                      </>
                                    )}
                                  </div>
                                  {isEnabled && isFolderExpanded && (
                                    <div className="lab-access-folder-list">
                                      {folders.map((folder) => (
                                        <label key={folder.id} className="lab-access-folder-row">
                                          <input type="checkbox" className="lab-access-checkbox" checked={projectDraft.allowedFolderIds.has(folder.id)} disabled={isBusy} onChange={(e) => handleToggleFolder(user.userId, project.id, folder.id, e.target.checked)} />
                                          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" style={{ flexShrink: 0, opacity: 0.6 }}><path d="M1.5 3A1.5 1.5 0 0 0 0 4.5v8A1.5 1.5 0 0 0 1.5 14h13a1.5 1.5 0 0 0 1.5-1.5v-7A1.5 1.5 0 0 0 14.5 4H7.621a1.5 1.5 0 0 1-1.06-.44L5.207 2.207A1.5 1.5 0 0 0 4.146 2H1.5Z" /></svg>
                                          <span>{folder.name}</span>
                                        </label>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )
                            })}
                          </div>

                          <div className="lab-access-picker-actions">
                            <button type="button" className="lab-ghost-btn" disabled={!isDirty || isBusy} onClick={() => handleDiscardUserDraft(user.userId)}>Discard</button>
                            <button type="button" className="lab-primary-btn" disabled={!isDirty || isBusy} onClick={() => void handleSaveUserAccess(user.userId)}>{isBusy ? 'Saving…' : 'Save'}</button>
                            <button type="button" className="lab-danger-btn" disabled={isBusy} onClick={() => void handleRemoveFromAllProjects(user.userId)}>Remove</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}

      {message && (
        <div className="lab-studio-dialog-status">
          {message}
          <button type="button" className="lab-studio-status-dismiss" onClick={() => setMessage('')}>✕</button>
        </div>
      )}
    </div>
  )
})
