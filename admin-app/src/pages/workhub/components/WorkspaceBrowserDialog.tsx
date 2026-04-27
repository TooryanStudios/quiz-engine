import { useEffect, useMemo, useState } from 'react'

type WorkspaceSummary = { id: string; name: string }
type ProjectSummary = { id: string; name: string; workspaceId: string; parentProjectId?: string | null }

interface WorkspaceBrowserDialogProps {
  open: boolean
  title: string
  confirmLabel: string
  workspaces: WorkspaceSummary[]
  projects: ProjectSummary[]
  initialWorkspaceId?: string
  initialProjectId?: string
  allowWorkspaceChange?: boolean
  onConfirm: (workspaceId: string, projectId: string) => void
  onClose: () => void
}

export function WorkspaceBrowserDialog({
  open,
  title,
  confirmLabel,
  workspaces,
  projects,
  initialWorkspaceId = '',
  initialProjectId = '',
  allowWorkspaceChange = true,
  onConfirm,
  onClose,
}: WorkspaceBrowserDialogProps) {
  const [workspaceId, setWorkspaceId] = useState(initialWorkspaceId)
  const [projectId, setProjectId] = useState(initialProjectId)

  useEffect(() => {
    if (!open) return
    setWorkspaceId(initialWorkspaceId)
    setProjectId(initialProjectId)
  }, [initialProjectId, initialWorkspaceId, open])

  const availableWorkspaces = useMemo(() => {
    if (allowWorkspaceChange) return workspaces
    const selected = workspaces.find((item) => item.id === initialWorkspaceId)
    return selected ? [selected] : workspaces.slice(0, 1)
  }, [allowWorkspaceChange, initialWorkspaceId, workspaces])

  const scopedProjects = useMemo(
    () => projects.filter((item) => item.workspaceId === workspaceId),
    [projects, workspaceId],
  )

  const projectOptions = useMemo(() => {
    if (!workspaceId) return [] as Array<{ id: string; label: string }>
    const byParent = new Map<string, ProjectSummary[]>()
    scopedProjects.forEach((item) => {
      const key = item.parentProjectId || ''
      const bucket = byParent.get(key) || []
      bucket.push(item)
      byParent.set(key, bucket)
    })

    const collect = (parentId: string, depth: number): Array<{ id: string; label: string }> => {
      const children = byParent.get(parentId) || []
      if (children.length === 0) return []
      const sorted = [...children].sort((a, b) => a.name.localeCompare(b.name))
      return sorted.flatMap((item) => {
        const indent = ' '.repeat(depth * 2)
        const prefix = depth > 0 ? '- ' : ''
        return [
          { id: item.id, label: `${indent}${prefix}${item.name}` },
          ...collect(item.id, depth + 1),
        ]
      })
    }

    return collect('', 0)
  }, [scopedProjects, workspaceId])

  if (!open) return null

  return (
    <div className="workhub-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="workhub-modal workhub-workspace-browser-dialog" onMouseDown={(event) => event.stopPropagation()}>
        <div className="workhub-modal-head">
          <div>
            <h2>{title}</h2>
            <p>Select workspace and folder.</p>
          </div>
          <button type="button" className="workhub-ghost-btn" onClick={onClose}>✕</button>
        </div>

        <div className="workhub-workspace-browser-grid">
          <label className="workhub-share-doc-form-row">
            <span>Workspace</span>
            <select
              className="workhub-share-doc-select"
              value={workspaceId}
              disabled={!allowWorkspaceChange}
              onChange={(event) => {
                setWorkspaceId(event.target.value)
                setProjectId('')
              }}
            >
              <option value="">Select workspace...</option>
              {availableWorkspaces.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>

          <label className="workhub-share-doc-form-row">
            <span>Folder</span>
            <select
              className="workhub-share-doc-select"
              value={projectId}
              onChange={(event) => setProjectId(event.target.value)}
              disabled={!workspaceId}
            >
              <option value="">Select folder...</option>
              {projectOptions.map((item) => (
                <option key={item.id} value={item.id}>{item.label}</option>
              ))}
            </select>
          </label>
        </div>

        <div className="workhub-row" style={{ justifyContent: 'flex-end', gap: 8 }}>
          <button type="button" className="workhub-ghost-btn" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="workhub-primary-btn"
            disabled={!workspaceId || !projectId}
            onClick={() => onConfirm(workspaceId, projectId)}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
