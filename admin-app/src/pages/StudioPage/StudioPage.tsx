import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { User } from 'firebase/auth'
import {
  ArrowLeft,
  Building2,
  ExternalLink,
  Folder,
  FolderOpen,
  FolderPlus,
  Globe,
  Lock,
  Pencil,
  Plus,
  Settings,
  Trash2,
  Users,
} from 'lucide-react'
import type { FolderSummary, OrgPlan, ProjectMember, ProjectSummary, ProjectVisibility } from '../../types/studio'
import { StudioProvider, useStudio } from './StudioContext'
import './StudioPage.css'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function planBadge(plan: OrgPlan) {
  if (plan === 'pro') return <span className="studio-badge studio-badge--pro">Pro</span>
  if (plan === 'enterprise') return <span className="studio-badge studio-badge--ent">Enterprise</span>
  return <span className="studio-badge studio-badge--free">Free</span>
}

function visibilityIcon(v: ProjectVisibility) {
  if (v === 'org') return <Globe size={12} />
  if (v === 'shared') return <Users size={12} />
  return <Lock size={12} />
}

function visibilityLabel(v: ProjectVisibility) {
  if (v === 'org') return 'Org-wide'
  if (v === 'shared') return 'Shared'
  return 'Private'
}

// ─── Create Project Dialog ────────────────────────────────────────────────────

function CreateProjectDialog({ onClose }: { onClose: () => void }) {
  const { handleCreateProject, activeOrg } = useStudio()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [visibility, setVisibility] = useState<ProjectVisibility>('private')
  const [saving, setSaving] = useState(false)
  const [fieldError, setFieldError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) { setFieldError('Project name is required.'); return }
    if (trimmed.length > 120) { setFieldError('Name must be 120 characters or fewer.'); return }
    setSaving(true)
    const result = await handleCreateProject({ name: trimmed, description: description.trim(), visibility })
    setSaving(false)
    if (result) onClose()
  }

  return (
    <div className="studio-dialog-overlay" onClick={onClose}>
      <div className="studio-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="studio-dialog-head">
          <FolderPlus size={18} />
          <span>New Project</span>
          {activeOrg && <span className="studio-dialog-head-sub">in {activeOrg.name}</span>}
        </div>
        <form className="studio-dialog-body" onSubmit={handleSubmit}>
          <label className="studio-field-label">Project Name</label>
          <input
            ref={inputRef}
            className="studio-input"
            value={name}
            onChange={(e) => { setName(e.target.value); setFieldError('') }}
            placeholder="e.g. Brand Campaign Q3"
            maxLength={120}
            disabled={saving}
          />
          <label className="studio-field-label">Description (optional)</label>
          <textarea
            className="studio-input studio-textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this project about?"
            rows={3}
            maxLength={400}
            disabled={saving}
          />
          <label className="studio-field-label">Access</label>
          <div className="studio-visibility-group">
            {(['private', 'org', 'shared'] as ProjectVisibility[]).map((v) => (
              <button
                key={v}
                type="button"
                className={`studio-visibility-btn${visibility === v ? ' is-active' : ''}`}
                onClick={() => setVisibility(v)}
                disabled={saving}
              >
                {visibilityIcon(v)}
                <span>{visibilityLabel(v)}</span>
              </button>
            ))}
          </div>
          <p className="studio-visibility-hint">
            {visibility === 'private' && 'Only explicitly added members can access this project.'}
            {visibility === 'org' && 'All members of the organization can access this project.'}
            {visibility === 'shared' && 'Invited collaborators can access this project even without org membership.'}
          </p>
          {fieldError && <p className="studio-field-error">{fieldError}</p>}
          <div className="studio-dialog-actions">
            <button type="button" className="studio-btn studio-btn--ghost" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="studio-btn studio-btn--primary" disabled={saving}>
              {saving ? 'Creating…' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Org Switcher Panel ───────────────────────────────────────────────────────

function OrgSwitcher() {
  const { orgs, orgsLoading, activeOrgId, setActiveOrgId } = useStudio()

  if (orgsLoading) {
    return (
      <aside className="studio-org-panel">
        <div className="studio-panel-head">Organizations</div>
        <div className="studio-empty-note">Loading…</div>
      </aside>
    )
  }

  return (
    <>
      <aside className="studio-org-panel">
        <div className="studio-panel-head">
          <span>Organizations</span>
        </div>

        {orgs.length === 0 ? (
          <div className="studio-empty-note">
            <p>No organizations found.</p>
            <p>Create your organization from Profile Settings.</p>
          </div>
        ) : (
          <ul className="studio-org-list">
            {orgs.map((org) => (
              <li key={org.id}>
                <button
                  type="button"
                  className={`studio-org-item${activeOrgId === org.id ? ' is-active' : ''}`}
                  onClick={() => setActiveOrgId(org.id)}
                >
                  <span className="studio-org-avatar">
                    {org.logoUrl
                      ? <img src={org.logoUrl} alt="" />
                      : org.name.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="studio-org-info">
                    <span className="studio-org-name">{org.name}</span>
                    <span className="studio-org-meta">{planBadge(org.plan)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </>
  )
}

// ─── Project Card ─────────────────────────────────────────────────────────────

function ProjectCard({ project }: { project: ProjectSummary }) {
  const { activeProjectId, setActiveProjectId } = useStudio()
  const navigate = useNavigate()
  const isActive = activeProjectId === project.id

  const openDetail = () => setActiveProjectId(project.id)

  const openInLab = (e: React.MouseEvent) => {
    e.stopPropagation()
    setActiveProjectId(project.id)
    navigate('/lab')
  }

  return (
    <article
      className={`studio-project-card${isActive ? ' is-active' : ''}`}
      onClick={openDetail}
    >
      {project.coverImageUrl ? (
        <div className="studio-project-cover">
          <img src={project.coverImageUrl} alt="" className="studio-project-cover-img" />
        </div>
      ) : (
        <div className="studio-project-cover is-placeholder">
          <FolderOpen size={28} />
        </div>
      )}
      <div className="studio-project-body">
        <div className="studio-project-name">{project.name}</div>
        {project.description && (
          <div className="studio-project-desc">{project.description}</div>
        )}
        <div className="studio-project-meta">
          <span className="studio-project-visibility">
            {visibilityIcon(project.visibility)}
            {visibilityLabel(project.visibility)}
          </span>
          <span className={`studio-project-status is-${project.status}`}>
            {project.status}
          </span>
        </div>
        {project.tags.length > 0 && (
          <div className="studio-project-tags">
            {project.tags.slice(0, 4).map((tag) => (
              <span key={tag} className="studio-tag">{tag}</span>
            ))}
          </div>
        )}
        <div className="studio-project-actions">
          <button
            type="button"
            className="studio-btn studio-btn--ghost studio-btn--sm"
            onClick={openDetail}
          >
            <Settings size={12} /> Open
          </button>
          <button
            type="button"
            className="studio-btn studio-btn--primary studio-btn--sm"
            onClick={openInLab}
          >
            <ExternalLink size={12} /> Open in Lab
          </button>
        </div>
      </div>
    </article>
  )
}

// ─── Project Grid ─────────────────────────────────────────────────────────────

function ProjectGrid() {
  const { activeOrg, activeOrgId, projects, projectsLoading } = useStudio()
  const [showCreate, setShowCreate] = useState(false)

  if (!activeOrgId) {
    return (
      <main className="studio-main">
        <div className="studio-main-empty">
          <Building2 size={40} className="studio-empty-icon" />
          <p>Select or create an organization to get started.</p>
        </div>
      </main>
    )
  }

  return (
    <>
      <main className="studio-main">
        <div className="studio-main-head">
          <div className="studio-main-title">
            <FolderOpen size={18} />
            <span>{activeOrg?.name ?? 'Projects'}</span>
          </div>
          <button
            type="button"
            className="studio-btn studio-btn--primary studio-btn--sm"
            onClick={() => setShowCreate(true)}
          >
            <Plus size={13} /> New Project
          </button>
        </div>

        {projectsLoading ? (
          <div className="studio-empty-note">Loading projects…</div>
        ) : projects.length === 0 ? (
          <div className="studio-main-empty">
            <FolderPlus size={36} className="studio-empty-icon" />
            <p>No projects yet in this organization.</p>
            <button
              type="button"
              className="studio-btn studio-btn--primary"
              onClick={() => setShowCreate(true)}
            >
              <Plus size={14} /> Create First Project
            </button>
          </div>
        ) : (
          <div className="studio-project-grid">
            {projects.map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        )}
      </main>

      {showCreate && <CreateProjectDialog onClose={() => setShowCreate(false)} />}
    </>
  )
}

// ─── Folder Tab ───────────────────────────────────────────────────────────────

function FolderTab() {
  const { folders, foldersLoading, handleCreateFolder, handleRenameFolder, handleDeleteFolder } = useStudio()
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const submitCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = newName.trim()
    if (!name) return
    setCreating(true)
    await handleCreateFolder(name)
    setNewName('')
    setCreating(false)
  }

  const startRename = (folder: FolderSummary) => {
    setRenamingId(folder.id)
    setRenameValue(folder.name)
    setTimeout(() => inputRef.current?.focus(), 30)
  }

  const submitRename = async (folderId: string) => {
    const name = renameValue.trim()
    if (name) await handleRenameFolder(folderId, name)
    setRenamingId(null)
  }

  const confirmDelete = async (folderId: string, name: string) => {
    if (!window.confirm(`Delete folder "${name}"? This does not delete its contents.`)) return
    await handleDeleteFolder(folderId)
  }

  return (
    <div className="studio-tab-content">
      <form className="studio-folder-create" onSubmit={submitCreate}>
        <input
          className="studio-input"
          placeholder="New folder name…"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          maxLength={120}
          disabled={creating}
        />
        <button type="submit" className="studio-btn studio-btn--primary studio-btn--sm" disabled={creating || !newName.trim()}>
          <Plus size={13} /> Add
        </button>
      </form>

      {foldersLoading ? (
        <p className="studio-tab-note">Loading…</p>
      ) : folders.length === 0 ? (
        <div className="studio-main-empty studio-main-empty--tab">
          <Folder size={32} className="studio-empty-icon" />
          <p>No folders yet. Add one above.</p>
        </div>
      ) : (
        <ul className="studio-folder-list">
          {folders.map((folder) => (
            <li key={folder.id} className="studio-folder-row">
              <Folder size={15} className="studio-folder-icon" />
              {renamingId === folder.id ? (
                <input
                  ref={inputRef}
                  className="studio-input studio-folder-rename-input"
                  title="Rename folder"
                  placeholder="Folder name"
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => submitRename(folder.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); void submitRename(folder.id) }
                    if (e.key === 'Escape') setRenamingId(null)
                  }}
                  maxLength={120}
                />
              ) : (
                <span className="studio-folder-name">{folder.name}</span>
              )}
              <div className="studio-folder-row-actions">
                <button
                  type="button"
                  className="studio-icon-btn"
                  title="Rename"
                  onClick={() => startRename(folder)}
                >
                  <Pencil size={13} />
                </button>
                <button
                  type="button"
                  className="studio-icon-btn studio-icon-btn--danger"
                  title="Delete"
                  onClick={() => void confirmDelete(folder.id, folder.name)}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── Members Tab ─────────────────────────────────────────────────────────────

function MembersTab() {
  const { projectMembers, projectMembersLoading } = useStudio()

  const roleLabel = (member: ProjectMember) => {
    if (member.role === 'owner') return 'Owner'
    if (member.role === 'editor') return 'Editor'
    return 'Viewer'
  }

  return (
    <div className="studio-tab-content">
      {projectMembersLoading ? (
        <p className="studio-tab-note">Loading…</p>
      ) : projectMembers.length === 0 ? (
        <p className="studio-tab-note">No members found.</p>
      ) : (
        <ul className="studio-members-list">
          {projectMembers.map((m) => (
            <li key={m.userId} className="studio-member-row">
              <div className="studio-member-avatar">
                {m.photoUrl
                  ? <img src={m.photoUrl} alt="" />
                  : (m.displayName || m.email || '?').slice(0, 2).toUpperCase()}
              </div>
              <div className="studio-member-info">
                <span className="studio-member-name">{m.displayName || m.email}</span>
                {m.displayName && <span className="studio-member-email">{m.email}</span>}
              </div>
              <span className="studio-member-role">{roleLabel(m)}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="studio-tab-note studio-tab-note--muted">
        Member invitations coming soon.
      </p>
    </div>
  )
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────

function SettingsTab() {
  const { activeProject, handleUpdateProject } = useStudio()
  const [name, setName] = useState(activeProject?.name ?? '')
  const [description, setDescription] = useState(activeProject?.description ?? '')
  const [visibility, setVisibility] = useState<ProjectVisibility>(activeProject?.visibility ?? 'private')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  // Sync if active project changes
  useEffect(() => {
    setName(activeProject?.name ?? '')
    setDescription(activeProject?.description ?? '')
    setVisibility(activeProject?.visibility ?? 'private')
  }, [activeProject?.id, activeProject?.name, activeProject?.description, activeProject?.visibility])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setSaving(true)
    await handleUpdateProject({ name: trimmed, description: description.trim(), visibility })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <form className="studio-tab-content" onSubmit={handleSave}>
      <label className="studio-field-label">Project Name</label>
      <input
        className="studio-input"
        placeholder="Project name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        maxLength={120}
        disabled={saving}
      />
      <label className="studio-field-label">Description</label>
      <textarea
        className="studio-input studio-textarea"
        placeholder="Project description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows={3}
        maxLength={400}
        disabled={saving}
      />
      <label className="studio-field-label">Access</label>
      <div className="studio-visibility-group">
        {(['private', 'org', 'shared'] as ProjectVisibility[]).map((v) => (
          <button
            key={v}
            type="button"
            className={`studio-visibility-btn${visibility === v ? ' is-active' : ''}`}
            onClick={() => setVisibility(v)}
            disabled={saving}
          >
            {visibilityIcon(v)}
            <span>{visibilityLabel(v)}</span>
          </button>
        ))}
      </div>
      <div className="studio-dialog-actions">
        <button type="submit" className="studio-btn studio-btn--primary" disabled={saving || !name.trim()}>
          {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save Changes'}
        </button>
      </div>
    </form>
  )
}

// ─── Project Detail Panel ─────────────────────────────────────────────────────

type DetailTab = 'folders' | 'members' | 'settings'

function ProjectDetailPanel() {
  const { activeProject, setActiveProjectId } = useStudio()
  const navigate = useNavigate()
  const [tab, setTab] = useState<DetailTab>('folders')

  if (!activeProject) return null

  const openInLab = () => navigate('/lab')

  return (
    <main className="studio-main studio-detail-panel">
      <div className="studio-detail-head">
        <button
          type="button"
          className="studio-btn studio-btn--ghost studio-btn--sm"
          onClick={() => setActiveProjectId(null)}
        >
          <ArrowLeft size={14} /> All Projects
        </button>
        <div className="studio-detail-title">
          <FolderOpen size={17} />
          <span>{activeProject.name}</span>
          <span className={`studio-project-status is-${activeProject.status}`}>{activeProject.status}</span>
          <span className="studio-project-visibility">
            {visibilityIcon(activeProject.visibility)}
            {visibilityLabel(activeProject.visibility)}
          </span>
        </div>
        <button
          type="button"
          className="studio-btn studio-btn--primary studio-btn--sm"
          onClick={openInLab}
        >
          <ExternalLink size={13} /> Open in Lab
        </button>
      </div>

      <div className="studio-detail-tabs">
        <button
          type="button"
          className={`studio-tab-btn${tab === 'folders' ? ' is-active' : ''}`}
          onClick={() => setTab('folders')}
        >
          <Folder size={14} /> Folders
        </button>
        <button
          type="button"
          className={`studio-tab-btn${tab === 'members' ? ' is-active' : ''}`}
          onClick={() => setTab('members')}
        >
          <Users size={14} /> Members
        </button>
        <button
          type="button"
          className={`studio-tab-btn${tab === 'settings' ? ' is-active' : ''}`}
          onClick={() => setTab('settings')}
        >
          <Settings size={14} /> Settings
        </button>
      </div>

      {tab === 'folders' && <FolderTab />}
      {tab === 'members' && <MembersTab />}
      {tab === 'settings' && <SettingsTab />}
    </main>
  )
}

// ─── Main content area (grid or detail) ──────────────────────────────────────

function StudioMainArea() {
  const { activeProjectId } = useStudio()
  if (activeProjectId) return <ProjectDetailPanel />
  return <ProjectGrid />
}

// ─── Error Banner ─────────────────────────────────────────────────────────────

function ErrorBanner() {
  const { error, clearError } = useStudio()
  if (!error) return null
  return (
    <div className="studio-error-banner" role="alert">
      <span>{error}</span>
      <button type="button" onClick={clearError} className="studio-error-dismiss">✕</button>
    </div>
  )
}

// ─── Inner shell (consumes context) ──────────────────────────────────────────

function StudioShell() {
  return (
    <div className="studio-shell">
      <ErrorBanner />
      <div className="studio-layout">
        <OrgSwitcher />
        <StudioMainArea />
      </div>
    </div>
  )
}

// ─── Exported page ────────────────────────────────────────────────────────────

export function StudioPage({ user }: { user: User | null }) {
  const identity = user
    ? {
        uid: user.uid,
        displayName: user.displayName ?? '',
        email: user.email ?? '',
        photoUrl: user.photoURL ?? '',
      }
    : null

  return (
    <StudioProvider user={identity}>
      <StudioShell />
    </StudioProvider>
  )
}

export default StudioPage
