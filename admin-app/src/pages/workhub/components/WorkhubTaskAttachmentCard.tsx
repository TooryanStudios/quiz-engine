import { useCallback, useEffect, useRef, useState } from 'react'
import type { WorkhubTask } from '../../../lib/workhubRepo'

export interface WorkhubTaskAttachmentCardProps {
  task: WorkhubTask
  embedded?: boolean
  collapsed: boolean
  onToggleCollapsed: () => void
  attachmentViewMode: 'list' | 'thumbnail' | 'card'
  onAttachmentViewModeChange: (mode: 'list' | 'thumbnail' | 'card') => void
  attachmentTitleDraft: string
  onAttachmentTitleDraftChange: (value: string) => void
  attachmentUrlDraft: string
  onAttachmentUrlDraftChange: (value: string) => void
  attachmentFilePathDraft: string
  attachmentFileDrafts: File[]
  onAttachmentFileDraftsChange: (files: File[]) => void
  onAttachmentFilePathDraftChange: (value: string) => void
  uploadingTaskAttachmentId: string
  onAddAttachment: () => void
  onUploadAttachmentFiles: () => void
  attachments: string[]
  getAttachmentTitle: (url: string) => string
  getAttachmentReviewCount: (url: string) => number
  isImageAttachmentUrl: (url: string) => boolean
  onOpenAttachmentLightbox: (url: string) => void
  onRemoveAttachment: (url: string) => void
}

export function WorkhubTaskAttachmentCard({
  task,
  embedded = false,
  collapsed,
  onToggleCollapsed,
  attachmentViewMode,
  onAttachmentViewModeChange,
  attachmentTitleDraft: _attachmentTitleDraft,
  onAttachmentTitleDraftChange: _onAttachmentTitleDraftChange,
  attachmentUrlDraft: _attachmentUrlDraft,
  onAttachmentUrlDraftChange: _onAttachmentUrlDraftChange,
  attachmentFileDrafts,
  onAttachmentFileDraftsChange,
  onAttachmentFilePathDraftChange,
  uploadingTaskAttachmentId,
  onAddAttachment: _onAddAttachment,
  onUploadAttachmentFiles,
  attachments,
  getAttachmentTitle,
  getAttachmentReviewCount,
  isImageAttachmentUrl,
  onOpenAttachmentLightbox,
  onRemoveAttachment,
}: WorkhubTaskAttachmentCardProps) {
  const [isDragOver, setIsDragOver] = useState(false)
  const dropInputRef = useRef<HTMLInputElement>(null)
  const [previewUrls, setPreviewUrls] = useState<{ name: string; preview: string | null }[]>([])

  const applyDroppedFiles = useCallback((files: File[]) => {
    if (files.length === 0) return
    onAttachmentFileDraftsChange(files)
    onAttachmentFilePathDraftChange(files.map((f) => f.name).join(', '))
    const previews = files.map((f) => ({
      name: f.name,
      preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
    }))
    setPreviewUrls(previews)
  }, [onAttachmentFileDraftsChange, onAttachmentFilePathDraftChange])

  useEffect(() => {
    if (attachmentFileDrafts.length === 0) setPreviewUrls([])
  }, [attachmentFileDrafts.length])

  useEffect(() => {
    return () => { previewUrls.forEach((p) => { if (p.preview) URL.revokeObjectURL(p.preview) }) }
  }, [previewUrls])

  useEffect(() => {
    if (collapsed) return
    function handlePaste(event: ClipboardEvent) {
      const items = Array.from(event.clipboardData?.items || [])
      const files = items
        .filter((item) => item.kind === 'file')
        .map((item) => item.getAsFile())
        .filter((f): f is File => f !== null)
      if (files.length > 0) applyDroppedFiles(files)
    }
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [collapsed, applyDroppedFiles])

  const isUploading = uploadingTaskAttachmentId === task.id

  return (
    <div className={embedded ? 'workhub-task-resource-card workhub-task-resource-card-embedded' : 'workhub-detail-card workhub-task-resource-card'}>
      <div className="workhub-task-attachments-head">
        <button
          type="button"
          className="workhub-task-attachments-toggle"
          onClick={onToggleCollapsed}
          aria-expanded={!collapsed}
        >
          <span>{`Files (${attachments.length})`}</span>
          <span aria-hidden="true" className="workhub-task-attachments-toggle-caret">{collapsed ? '▸' : '▾'}</span>
        </button>
        {!collapsed && attachments.length > 0 && (
          <div className="workhub-view-mode-toggle">
            <button type="button" className={attachmentViewMode === 'list' ? 'active' : ''} onClick={() => onAttachmentViewModeChange('list')} title="Minimal List">List</button>
            <button type="button" className={attachmentViewMode === 'thumbnail' ? 'active' : ''} onClick={() => onAttachmentViewModeChange('thumbnail')} title="Small Thumbnails">Thumbs</button>
            <button type="button" className={attachmentViewMode === 'card' ? 'active' : ''} onClick={() => onAttachmentViewModeChange('card')} title="Cards">Cards</button>
          </div>
        )}
      </div>
      {!collapsed && <div className="workhub-task-attachment-editor">
        {/* ── Drop zone ── */}
        <div
          className={`workhub-attachment-drop-zone${isDragOver ? ' is-drag-over' : ''}${attachmentFileDrafts.length > 0 ? ' has-files' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true) }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setIsDragOver(false)
            const files = Array.from(e.dataTransfer.files)
            if (files.length > 0) applyDroppedFiles(files)
          }}
          onClick={() => { if (attachmentFileDrafts.length === 0) dropInputRef.current?.click() }}
          role="button"
          tabIndex={0}
          aria-label="Drop files here, click to browse, or paste from clipboard"
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') dropInputRef.current?.click() }}
        >
          <input
            ref={dropInputRef}
            type="file"
            multiple
            style={{ display: 'none' }}
            onChange={(e) => {
              const files = Array.from(e.target.files || [])
              if (files.length > 0) applyDroppedFiles(files)
              e.target.value = ''
            }}
          />
          {attachmentFileDrafts.length === 0 ? (
            <>
              <span className="workhub-attachment-drop-icon">📂</span>
              <span className="workhub-attachment-drop-label">
                {isDragOver ? 'Release to attach' : 'Drop files · Click to browse · Paste image (Ctrl+V)'}
              </span>
            </>
          ) : (
            <div className="workhub-attachment-drop-preview">
              {previewUrls.map((p, i) => (
                <div key={i} className="workhub-attachment-drop-preview-item">
                  {p.preview
                    ? <img src={p.preview} alt={p.name} className="workhub-attachment-drop-thumb" />
                    : <span className="workhub-attachment-drop-file-icon">📄</span>}
                  <span className="workhub-attachment-drop-filename">{p.name}</span>
                </div>
              ))}
              <div className="workhub-attachment-drop-preview-actions">
                <button
                  type="button"
                  className="workhub-primary-mini"
                  disabled={isUploading}
                  onClick={(e) => { e.stopPropagation(); onUploadAttachmentFiles() }}
                >
                  {isUploading ? 'Uploading…' : `Upload ${attachmentFileDrafts.length} file${attachmentFileDrafts.length === 1 ? '' : 's'}`}
                </button>
                <button
                  type="button"
                  className="workhub-ghost-mini"
                  onClick={(e) => { e.stopPropagation(); dropInputRef.current?.click() }}
                >
                  Change
                </button>
                <button
                  type="button"
                  className="workhub-ghost-mini"
                  onClick={(e) => { e.stopPropagation(); onAttachmentFileDraftsChange([]); onAttachmentFilePathDraftChange('') }}
                >
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>

        {/* drop zone only – no URL-add section */}
      </div>}
      {!collapsed && attachments.length > 0 && (
        <div className={`workhub-checklist-url-list view-${attachmentViewMode}`}>
          {attachments.map((url) => {
            const attachmentTitle = getAttachmentTitle(url)
            const reviewCount = getAttachmentReviewCount(url)
            return (
              <div key={url} className="workhub-checklist-url-item workhub-task-image-item">
                {isImageAttachmentUrl(url) ? (
                  <button type="button" className="workhub-attachment-preview-btn" onClick={() => onOpenAttachmentLightbox(url)}>
                    <img src={url} alt="Attachment preview" className="workhub-task-image-thumb" loading="lazy" />
                    <span className="workhub-attachment-copy">
                      <strong>{attachmentTitle}</strong>
                      <small>{url}</small>
                    </span>
                  </button>
                ) : (
                  <a href={url} target="_blank" rel="noreferrer" className="workhub-task-image-link">
                    <span className="workhub-task-attachment-icon">📎</span>
                    <span className="workhub-attachment-copy">
                      <strong>{attachmentTitle}</strong>
                      <small>{url}</small>
                    </span>
                  </a>
                )}
                {reviewCount > 0 && (
                  <span className="workhub-attachment-review-indicator" title={`${reviewCount} note${reviewCount === 1 ? '' : 's'} / annotations`}>
                    📝 {reviewCount}
                  </span>
                )}
                <button type="button" onClick={() => onRemoveAttachment(url)}>Remove</button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
