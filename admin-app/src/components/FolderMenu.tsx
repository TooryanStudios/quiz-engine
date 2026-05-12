/**
 * FolderMenu — reusable project/folder selector dropdown.
 *
 * Layout per folder row:
 *   [▶ expand btn]  [📁 icon]  [folder name → click selects]  [✓ if selected]
 *
 * Files (e.g. video docs) passed via `filesByFolder` appear inside an
 * expanded folder with a video icon.  Clicking a file calls `onSelectFile`.
 */
import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { auth } from '../lib/firebase'
import { createFolder, createProject, subscribeToProjectFolders, subscribeToUserProjects } from '../lib/studioService'
import type { FolderSummary, ProjectRole, ProjectSummary } from '../types/studio'

// ─── types ─────────────────────────────────────────────────────────────────

export type FolderTarget = {
  projectId: string
  projectName: string
  folderId: string | null
  folderName: string | null
}

export interface FolderMenuFile {
  id: string
  name: string
  updatedAt: number
}

export interface FolderMenuProps {
  value: FolderTarget | null
  onChange: (target: FolderTarget | null) => void
  /** Map of folderId (or '__root__' for project root) → files to show inside that folder */
  filesByFolder?: Record<string, FolderMenuFile[]>
  /** Called when the user clicks a file inside an expanded folder */
  onSelectFile?: (
    file: FolderMenuFile,
    folderId: string | null,
    projectId: string,
    projectName: string,
    folderName: string | null,
  ) => void
  /** Optional controlled open state used when the page wants to prompt for a save location */
  open?: boolean
  /** Called whenever the dropdown open state changes */
  onOpenChange?: (open: boolean) => void
}

// ─── helpers ────────────────────────────────────────────────────────────────

const iStyle: React.CSSProperties = {
  background: 'hsl(0 0% 10%)',
  border: '1px solid hsl(0 0% 24%)',
  borderRadius: 4,
  color: 'hsl(0 0% 88%)',
  fontSize: 12,
  padding: '3px 7px',
  outline: 'none',
  width: '100%',
}

function InlineInput({
  placeholder,
  onCommit,
  onCancel,
}: {
  placeholder?: string
  onCommit: (v: string) => void
  onCancel: () => void
}) {
  const [val, setVal] = useState('')
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => { ref.current?.focus() }, [])
  return (
    <input
      ref={ref}
      style={iStyle}
      placeholder={placeholder ?? 'Name…'}
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && val.trim()) onCommit(val.trim())
        if (e.key === 'Escape') onCancel()
      }}
      onBlur={() => { if (!val.trim()) onCancel() }}
    />
  )
}

// ─── SVG icons ──────────────────────────────────────────────────────────────

const FolderIcon = ({ size = 12, opacity = 0.7 }: { size?: number; opacity?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, opacity }}>
    <path d="M1.5 3.5A1 1 0 0 1 2.5 2.5H6l1.5 2H13.5a1 1 0 0 1 1 1v7a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1V3.5Z" stroke="currentColor" strokeWidth="1.2" fill="none" />
  </svg>
)

const ProjectIcon = ({ size = 12 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, opacity: .7 }}>
    <rect x="1.5" y="4.5" width="13" height="9" rx="1" stroke="currentColor" strokeWidth="1.2" />
    <path d="M1.5 7.5h13M5 4.5V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1.5" stroke="currentColor" strokeWidth="1.2" />
  </svg>
)

const VideoFileIcon = ({ size = 11 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
    <path d="M3 2.5h6.8L13 5.7v7.8a1 1 0 0 1-1 1H3.9a1 1 0 0 1-1-1V3.5a1 1 0 0 1 1-1Z" stroke="currentColor" strokeWidth="1.2" opacity=".9" />
    <path d="M9.8 2.5v3.1h3.1" stroke="currentColor" strokeWidth="1.2" opacity=".9" />
    <path d="M6.4 6.1l3.2 1.9-3.2 1.9V6.1Z" fill="currentColor" opacity=".95" />
  </svg>
)

const CheckIcon = () => (
  <svg width="10" height="10" viewBox="0 0 12 12" fill="none" style={{ marginLeft: 'auto', flexShrink: 0 }}>
    <path d="M2 6L5 9L10 3" stroke="hsl(142 60% 50%)" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
)

const ChevronRight = ({ expanded, size = 9 }: { expanded: boolean; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0, transition: 'transform .15s', transform: expanded ? 'rotate(90deg)' : 'none' }}>
    <path d="M3.5 2L6.5 5L3.5 8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
)

// ─── FileRow sub-component ──────────────────────────────────────────────────

function FileRow({
  file,
  indentLeft,
  onSelect,
}: {
  file: FolderMenuFile
  indentLeft: number
  onSelect: () => void
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', width: '100%',
        border: 'none', textAlign: 'left', cursor: 'pointer',
        gap: 6, fontSize: 12,
        paddingTop: 4, paddingBottom: 4, paddingRight: 10,
        paddingLeft: indentLeft,
        background: hovered ? 'hsl(0 0% 16%)' : 'transparent',
        color: 'hsl(0 0% 70%)',
      }}
    >
      <VideoFileIcon size={11} />
      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {file.name}
      </span>
      {file.updatedAt > 0 && (
        <span style={{ fontSize: 10, color: 'hsl(0 0% 42%)', flexShrink: 0 }}>
          {new Date(file.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
        </span>
      )}
    </button>
  )
}

// ─── component ──────────────────────────────────────────────────────────────

export function FolderMenu({ value, onChange, filesByFolder, onSelectFile, open, onOpenChange }: FolderMenuProps) {
  const authUid = auth.currentUser?.uid ?? null

  const [internalOpen, setInternalOpen] = useState(false)
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 })
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [expandedProjectId, setExpandedProjectId] = useState<string | null>(null)
  // Set of folder IDs currently expanded to show their contents (subfolders + files)
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(new Set())
  const [foldersByProject, setFoldersByProject] = useState<Record<string, FolderSummary[]>>({})

  const [creatingProject, setCreatingProject] = useState(false)
  const [creatingFolderInProject, setCreatingFolderInProject] = useState<string | null>(null)
  const [creatingSubfolderIn, setCreatingSubfolderIn] = useState<{ projectId: string; parentId: string } | null>(null)

  const menuRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const isControlled = open !== undefined
  const isOpen = isControlled ? open : internalOpen

  const setMenuOpen = (nextOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(nextOpen)
    }
    onOpenChange?.(nextOpen)
  }

  useEffect(() => {
    if (!isOpen || !value?.projectId) return
    setExpandedProjectId(value.projectId)
    if (value.folderId) {
      setExpandedFolderIds((prev) => {
        const next = new Set(prev)
        next.add(value.folderId as string)
        return next
      })
    }
  }, [isOpen, value?.projectId, value?.folderId])

  // ── subscriptions ──────────────────────────────────────────────────────────

  useEffect(() => {
    if (!authUid) return
    return subscribeToUserProjects(authUid, setProjects)
  }, [authUid])

  useEffect(() => {
    if (!authUid || !expandedProjectId) return
    if (foldersByProject[expandedProjectId]) return
    const project = projects.find((p) => p.id === expandedProjectId)
    const role = (project?.role ?? null) as ProjectRole | null
    return subscribeToProjectFolders(
      expandedProjectId,
      { userId: authUid, role },
      (folders) => setFoldersByProject((prev) => ({ ...prev, [expandedProjectId]: folders })),
    )
  }, [authUid, expandedProjectId, projects, foldersByProject])

  useEffect(() => {
    if (!isOpen || !value?.projectId) return
    const folders = foldersByProject[value.projectId] ?? []
    if (folders.length === 0) return

    const foldersById = new Map(folders.map((folder) => [folder.id, folder]))
    const autoExpandedIds = new Set<string>()

    const expandWithAncestors = (folderId: string) => {
      let currentId: string | null = folderId
      while (currentId) {
        if (autoExpandedIds.has(currentId)) break
        autoExpandedIds.add(currentId)
        currentId = foldersById.get(currentId)?.parentId ?? null
      }
    }

    for (const folder of folders) {
      if ((filesByFolder?.[folder.id] ?? []).length > 0) {
        expandWithAncestors(folder.id)
      }
    }

    if (autoExpandedIds.size === 0) return
    setExpandedFolderIds((prev) => {
      const next = new Set(prev)
      for (const folderId of autoExpandedIds) next.add(folderId)
      return next
    })
  }, [isOpen, value?.projectId, foldersByProject, filesByFolder])

  // close on outside click
  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        menuRef.current && !menuRef.current.contains(target) &&
        triggerRef.current && !triggerRef.current.contains(target)
      ) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  // ── create helpers ─────────────────────────────────────────────────────────

  const handleCreateProject = async (name: string) => {
    if (!authUid || !auth.currentUser) return
    setCreatingProject(false)
    const u = auth.currentUser
    await createProject(
      { orgId: authUid, name },
      { uid: u.uid, displayName: u.displayName ?? '', email: u.email ?? '', photoUrl: u.photoURL ?? '' },
    )
  }

  const handleCreateFolder = async (projectId: string, name: string, parentId?: string) => {
    if (!authUid) return
    setCreatingFolderInProject(null)
    setCreatingSubfolderIn(null)
    const folder = await createFolder({ projectId, name, parentId: parentId ?? null }, authUid)
    setFoldersByProject((prev) => {
      const { [projectId]: _, ...rest } = prev
      return rest
    })
    const project = projects.find((p) => p.id === projectId)
    if (project) {
      onChange({ projectId, projectName: project.name, folderId: folder.id, folderName: folder.name })
    }
  }

  // ── selection helpers ──────────────────────────────────────────────────────

  const handleSelect = (project: ProjectSummary, folder: FolderSummary | null) => {
    onChange({
      projectId: project.id,
      projectName: project.name,
      folderId: folder?.id ?? null,
      folderName: folder?.name ?? null,
    })
    setMenuOpen(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null)
  }

  const toggleFolderExpand = (e: React.MouseEvent, folderId: string) => {
    e.stopPropagation()
    setExpandedFolderIds((prev) => {
      const next = new Set(prev)
      if (next.has(folderId)) { next.delete(folderId) } else { next.add(folderId) }
      return next
    })
  }

  // ── label ──────────────────────────────────────────────────────────────────

  const label = value
    ? value.folderName
      ? `${value.projectName} / ${value.folderName}`
      : value.projectName
    : 'Select folder'

  // ── shared style helper ────────────────────────────────────────────────────

  const rowBtn = (extra?: React.CSSProperties): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', width: '100%',
    border: 'none', background: 'transparent',
    color: 'hsl(0 0% 80%)', textAlign: 'left', cursor: 'pointer',
    fontSize: 12, gap: 6, padding: '5px 10px',
    ...extra,
  })

  // ── render folder row (top-level only; subfolder rows are inlined) ──────────

  const renderFolderRow = (
    project: ProjectSummary,
    folder: FolderSummary,
    depth: number,
    allFolders: FolderSummary[],
  ): React.ReactNode => {
    const isSelected = value?.folderId === folder.id && value?.projectId === project.id
    const isExpanded = expandedFolderIds.has(folder.id)
    const files = filesByFolder?.[folder.id] ?? []
    const subfolders = allFolders.filter((f) => f.parentId === folder.id)
    const hasChildren = subfolders.length > 0 || files.length > 0
    const indentLeft = 10 + depth * 16

    return (
      <div key={folder.id}>
        <div style={{ display: 'flex', alignItems: 'center', background: isSelected ? 'hsl(0 0% 18%)' : undefined }}>
          {/* ▶ expand toggle — always reserve space */}
          <button
            type="button"
            onClick={(e) => hasChildren ? toggleFolderExpand(e, folder.id) : undefined}
            style={{
              flexShrink: 0, width: 22 + indentLeft, height: 28,
              display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 4,
              border: 'none', background: 'transparent',
              cursor: hasChildren ? 'pointer' : 'default',
              color: 'hsl(0 0% 52%)',
            }}
          >
            {hasChildren ? <ChevronRight expanded={isExpanded} /> : null}
          </button>

          {/* folder icon + name → click to SELECT */}
          <button
            type="button"
            onClick={() => handleSelect(project, folder)}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: 6,
              border: 'none', background: 'transparent',
              color: isSelected ? 'hsl(0 0% 96%)' : 'hsl(0 0% 76%)',
              textAlign: 'left', cursor: 'pointer', fontSize: 12,
              padding: '5px 6px 5px 2px', overflow: 'hidden',
            }}
          >
            <FolderIcon size={12} opacity={isSelected ? 0.9 : 0.6} />
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {folder.name}
            </span>
            {isSelected && <CheckIcon />}
          </button>

          {/* + add subfolder */}
          <button
            type="button"
            title="Add subfolder"
            onClick={(e) => { e.stopPropagation(); setCreatingSubfolderIn({ projectId: project.id, parentId: folder.id }) }}
            style={{
              flexShrink: 0, width: 22, height: 28,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: 'none', background: 'transparent',
              color: 'hsl(0 0% 42%)', cursor: 'pointer', fontSize: 14, lineHeight: 1,
            }}
          >+</button>
        </div>

        {/* expanded contents */}
        {isExpanded && (
          <div>
            {subfolders.map((sub) => renderFolderRow(project, sub, depth + 1, allFolders))}

            {/* inline: create subfolder */}
            {creatingSubfolderIn?.projectId === project.id && creatingSubfolderIn?.parentId === folder.id && (
              <div style={{ padding: '4px 10px', paddingLeft: 26 + indentLeft }}>
                <InlineInput
                  placeholder="Subfolder name…"
                  onCommit={(name) => handleCreateFolder(project.id, name, folder.id)}
                  onCancel={() => setCreatingSubfolderIn(null)}
                />
              </div>
            )}

            {/* files inside this folder */}
            {files.map((file) => (
              <FileRow
                key={file.id}
                file={file}
                indentLeft={26 + indentLeft}
                onSelect={() => { onSelectFile?.(file, folder.id, project.id, project.name, folder.name); setMenuOpen(false) }}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Trigger button ──────────────────────────────────────────────── */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (!isOpen && triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect()
            setDropdownPos({ top: rect.bottom + 5, left: rect.left })
          }
          setMenuOpen(!isOpen)
        }}
        style={{
          display: 'flex', alignItems: 'center', gap: 5,
          padding: '3px 8px', height: 28,
          background: 'hsl(0 0% 13%)',
          border: '1px solid hsl(0 0% 22%)',
          borderRadius: 5,
          color: value ? 'hsl(0 0% 88%)' : 'hsl(0 0% 52%)',
          cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap',
          maxWidth: 220, overflow: 'hidden',
        }}
      >
        <FolderIcon size={12} opacity={0.7} />
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{label}</span>
        <svg width="9" height="9" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0, marginLeft: 1, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }}>
          <path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </button>

      {/* ── Dropdown (portalled to body) ─────────────────────────────────── */}
      {isOpen && createPortal(
        <div
          ref={menuRef}
          style={{
            position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, zIndex: 99999,
            minWidth: 300, maxWidth: 420, maxHeight: 480, overflowY: 'auto',
            background: 'hsl(0 0% 11%)',
            border: '1px solid hsl(0 0% 20%)',
            borderRadius: 8,
            boxShadow: '0 8px 28px rgba(0,0,0,.65)',
            padding: '5px 0',
            fontSize: 12,
            fontFamily: 'inherit',
          }}
        >
          {projects.length === 0 && !creatingProject && (
            <div style={{ padding: '8px 12px', color: 'hsl(0 0% 42%)' }}>No projects yet</div>
          )}

          {projects.map((project) => {
            const isExpanded = expandedProjectId === project.id
            const folders = foldersByProject[project.id] ?? []
            // Root files only shown when this project is the active one
            const rootFiles = (filesByFolder?.['__root__'] ?? []).filter(
              () => value?.projectId === project.id,
            )

            return (
              <div key={project.id}>
                {/* project row — click to expand/collapse */}
                <button
                  type="button"
                  onClick={() => setExpandedProjectId(isExpanded ? null : project.id)}
                  style={rowBtn({ fontWeight: 500, color: 'hsl(0 0% 90%)', background: isExpanded ? 'hsl(0 0% 15%)' : undefined, padding: '7px 10px' })}
                >
                  <ChevronRight expanded={isExpanded} />
                  <ProjectIcon />
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{project.name}</span>
                  <span
                    role="button" tabIndex={0} title="Use project root (no folder)"
                    onClick={(e) => { e.stopPropagation(); handleSelect(project, null) }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); handleSelect(project, null) } }}
                    style={{ fontSize: 10, color: 'hsl(0 0% 45%)', padding: '2px 6px', cursor: 'pointer', background: 'hsl(0 0% 18%)', borderRadius: 3, flexShrink: 0 }}
                  >root</span>
                </button>

                {/* folders + root files */}
                {isExpanded && (
                  <div style={{ borderTop: '1px solid hsl(0 0% 17%)', borderBottom: '1px solid hsl(0 0% 17%)' }}>
                    {folders.length === 0 && creatingFolderInProject !== project.id && (
                      <div style={{ padding: '5px 10px 5px 36px', color: 'hsl(0 0% 38%)' }}>No folders</div>
                    )}

                    {/* root-level files */}
                    {rootFiles.map((file) => (
                      <FileRow
                        key={file.id}
                        file={file}
                        indentLeft={30}
                        onSelect={() => { onSelectFile?.(file, null, project.id, project.name, null); setMenuOpen(false) }}
                      />
                    ))}

                    {/* top-level folders (parentId === null) */}
                    {folders
                      .filter((f) => f.parentId === null)
                      .map((folder) => renderFolderRow(project, folder, 0, folders))}

                    {/* inline: create folder */}
                    {creatingFolderInProject === project.id ? (
                      <div style={{ padding: '4px 10px 4px 36px' }}>
                        <InlineInput
                          placeholder="Folder name…"
                          onCommit={(name) => handleCreateFolder(project.id, name)}
                          onCancel={() => setCreatingFolderInProject(null)}
                        />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setCreatingFolderInProject(project.id)}
                        style={rowBtn({ paddingLeft: 36, color: 'hsl(0 0% 46%)', fontSize: 11 })}
                      >
                        <span style={{ fontSize: 14, lineHeight: 1 }}>+</span> New Folder
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {/* divider */}
          {projects.length > 0 && (
            <div style={{ height: 1, background: 'hsl(0 0% 17%)', margin: '4px 0' }} />
          )}

          {/* inline: create project */}
          {creatingProject ? (
            <div style={{ padding: '5px 10px' }}>
              <InlineInput
                placeholder="Project name…"
                onCommit={handleCreateProject}
                onCancel={() => setCreatingProject(false)}
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setCreatingProject(true)}
              style={rowBtn({ color: 'hsl(0 0% 52%)', fontSize: 11 })}
            >
              <span style={{ fontSize: 14, lineHeight: 1 }}>+</span> New Project
            </button>
          )}
        </div>,
        document.body,
      )}
    </>
  )
}
