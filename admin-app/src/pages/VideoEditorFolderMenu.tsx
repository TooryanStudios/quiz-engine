import React, { useState } from 'react'
import { FolderMenu } from '../components/FolderMenu'
export type { FolderTarget } from '../components/FolderMenu'
import type { FolderTarget, FolderMenuFile } from '../components/FolderMenu'

export interface VideoEditorFolderMenuProps {
  value: FolderTarget | null
  onChange: (target: FolderTarget | null) => void
  filename: string
  onFilenameChange: (name: string) => void
  /** Video docs grouped by folderId (use '__root__' for null folderId) */
  filesByFolder?: Record<string, FolderMenuFile[]>
  onSelectFile?: (
    file: FolderMenuFile,
    folderId: string | null,
    projectId: string,
    projectName: string,
    folderName: string | null,
  ) => void
  /** 'saving' | 'saved' | 'error' | null */
  saveStatus?: 'saving' | 'saved' | 'error' | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

// ─── filename helpers ───────────────────────────────────────────────────────

const FILE_COUNTER_KEY = 'rve:file-counter'

function nextDefaultFilename(): string {
  const current = parseInt(localStorage.getItem(FILE_COUNTER_KEY) ?? '0', 10)
  const next = current + 1
  localStorage.setItem(FILE_COUNTER_KEY, String(next))
  return `video-${String(next).padStart(3, '0')}`
}

// ─── main component ────────────────────────────────────────────────────────

export function VideoEditorFolderMenu({
  value,
  onChange,
  filename,
  onFilenameChange,
  filesByFolder,
  onSelectFile,
  saveStatus,
  open,
  onOpenChange,
}: VideoEditorFolderMenuProps) {
  const statusColor = saveStatus === 'saving' ? 'hsl(45 80% 60%)'
    : saveStatus === 'saved' ? 'hsl(140 55% 55%)'
    : saveStatus === 'error' ? 'hsl(0 70% 60%)'
    : 'transparent'

  const statusLabel = saveStatus === 'saving' ? 'Saving…'
    : saveStatus === 'saved' ? 'Saved'
    : saveStatus === 'error' ? 'Save failed'
    : null

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <FolderMenu
        value={value}
        onChange={onChange}
        filesByFolder={filesByFolder}
        onSelectFile={onSelectFile}
        open={open}
        onOpenChange={onOpenChange}
      />
      <input
        type="text"
        value={filename}
        onChange={(e) => onFilenameChange(e.target.value)}
        placeholder="filename"
        style={{
          height: 28, padding: '0 8px',
          background: 'hsl(0 0% 13%)',
          border: '1px solid hsl(0 0% 22%)',
          borderRadius: 5,
          color: 'hsl(0 0% 88%)',
          fontSize: 12,
          width: 110,
          outline: 'none',
        }}
      />
      {statusLabel && (
        <span style={{ fontSize: 11, color: statusColor, whiteSpace: 'nowrap' }}>
          {statusLabel}
        </span>
      )}
    </div>
  )
}

// ─── standalone initializer hook (call once in VideoEditorPage) ────────────

export function useVideoEditorFilename(): [string, React.Dispatch<React.SetStateAction<string>>] {
  const [filename, setFilename] = useState(() => nextDefaultFilename())
  return [filename, setFilename]
}

