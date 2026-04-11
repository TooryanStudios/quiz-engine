import { useRef, useState } from 'react'
import {
  addWorkhubMoodBoardImage,
  deleteWorkhubMoodBoard,
  removeWorkhubMoodBoardImage,
  updateWorkhubMoodBoardChecklist,
  updateWorkhubMoodBoardTitle,
  type WorkhubMember,
  type WorkhubMoodBoard,
  type WorkhubMoodBoardImage,
  type WorkhubProject,
  type WorkhubTaskChecklistItem,
  type WorkhubTaskComment,
} from '../../../lib/workhubRepo'
import { WorkhubChecklistCard } from './WorkhubChecklistCard'
import { WorkhubDiscussionCard } from './WorkhubDiscussionCard'
import { useWorkhubChecklistEditor } from '../hooks/useWorkhubChecklistEditor'

export interface MoodBoardPanelProps {
  board: WorkhubMoodBoard | null
  entityLabel: string
  workspaceProjectById: Record<string, WorkhubProject>
  currentUid: string
  canEdit: boolean
  memberByUid: Record<string, WorkhubMember>
  formatTime: (value: unknown) => string
  busyKey: string
  onCreateBoard: (title: string) => Promise<string | null>
  onUploadImage: (boardId: string, file: File) => Promise<string>
  onBoardDeleted: () => void
  // Discussion
  discussionComments: WorkhubTaskComment[]
  discussionText: string
  onDiscussionTextChange: (value: string) => void
  onDiscussionSend: () => Promise<void>
  discussionBusy: boolean
  discussionEditingId: string
  discussionEditingText: string
  onDiscussionEditStart: (comment: WorkhubTaskComment) => void
  onDiscussionEditChange: (value: string) => void
  onDiscussionEditCancel: () => void
  onDiscussionEditSave: (comment: WorkhubTaskComment) => Promise<void>
  discussionEditBusyKey: string
}

export function MoodBoardPanel({
  board,
  entityLabel,
  currentUid,
  canEdit,
  memberByUid,
  formatTime,
  busyKey,
  onCreateBoard,
  onUploadImage,
  onBoardDeleted,
  discussionComments,
  discussionText,
  onDiscussionTextChange,
  onDiscussionSend,
  discussionBusy,
  discussionEditingId,
  discussionEditingText,
  onDiscussionEditStart,
  onDiscussionEditChange,
  onDiscussionEditCancel,
  onDiscussionEditSave,
  discussionEditBusyKey,
}: MoodBoardPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [titleDraft, setTitleDraft] = useState<string | null>(null)
  const [titleSaving, setTitleSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const displayTitle = titleDraft ?? board?.title ?? ''
  const titleChanged = titleDraft !== null && titleDraft.trim() !== (board?.title ?? '')

  async function handleSaveTitle() {
    if (!board || !titleDraft || !titleDraft.trim()) return
    setTitleSaving(true)
    try {
      await updateWorkhubMoodBoardTitle(board.id, titleDraft.trim())
      setTitleDraft(null)
    } finally {
      setTitleSaving(false)
    }
  }

  async function handleDelete() {
    if (!board) return
    if (!window.confirm('Delete this mood board and all its images?')) return
    setDeleting(true)
    try {
      await deleteWorkhubMoodBoard(board.id)
      onBoardDeleted()
    } finally {
      setDeleting(false)
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setError(null)
    setUploading(true)
    try {
      let boardId = board?.id ?? null
      if (!boardId) {
        const defaultTitle = 'Mood Board'
        boardId = await onCreateBoard(defaultTitle)
        if (!boardId) throw new Error('Could not create mood board')
      }
      const existingImages = board?.images ?? []
      let latestImages = existingImages
      for (const file of files) {
        const url = await onUploadImage(boardId, file)
        const newImage: WorkhubMoodBoardImage = {
          url,
          caption: file.name,
          addedBy: currentUid,
          addedAt: new Date().toISOString(),
        }
        await addWorkhubMoodBoardImage(boardId, latestImages, newImage)
        latestImages = [...latestImages, newImage]
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleRemoveImage(index: number) {
    if (!board) return
    await removeWorkhubMoodBoardImage(board.id, board.images, index)
  }

  const canRemove = (img: WorkhubMoodBoardImage) => canEdit || img.addedBy === currentUid
  const checklistItems = board?.checklist || []
  const checklistEditor = useWorkhubChecklistEditor({
    items: checklistItems,
    readOnly: !canEdit,
    onChange: async (nextItems: WorkhubTaskChecklistItem[]) => {
      const boardId = board?.id || await onCreateBoard('Mood Board')
      if (!boardId) throw new Error('Could not create mood board.')
      await updateWorkhubMoodBoardChecklist(boardId, nextItems)
    },
  })
  const activeError = error || checklistEditor.error

  return (
    <main className="workhub-section-stack workhub-moodboard-view">
      <div className="workhub-notes-layout">
        <section className="workhub-panel workhub-documents-panel">
          {/* Header — matches document editor header style */}
          <div className="workhub-panel-head">
            <div className="workhub-documents-head-main">
              {canEdit ? (
                <input
                  className="workhub-documents-title-input"
                  value={displayTitle}
                  placeholder="Mood board name…"
                  onChange={(e) => setTitleDraft(e.target.value)}
                />
              ) : (
                <h2 style={{ margin: 0 }}>{displayTitle || 'Mood Board'}</h2>
              )}
            </div>
            <div className="workhub-panel-tools">
              {/* Share */}
              <button
                className="workhub-ghost-btn workhub-doc-tool-btn"
                title="Share / copy link"
                aria-label="Share"
                disabled={!board}
                onClick={() => setShareOpen((o) => !o)}
              >🔗</button>
              {/* Delete */}
              {canEdit && board && (
                <button
                  className="workhub-danger-btn workhub-doc-tool-btn"
                  title="Delete mood board"
                  aria-label="Delete mood board"
                  disabled={deleting || busyKey === `moodboard:${board.id}`}
                  onClick={() => { void handleDelete() }}
                >
                  {deleting ? '⏳' : '🗑'}
                </button>
              )}
              {/* Save title */}
              <button
                className="workhub-primary-btn workhub-doc-tool-btn"
                title="Save name"
                aria-label="Save name"
                disabled={!titleChanged || titleSaving}
                onClick={() => { void handleSaveTitle() }}
              >
                {titleSaving ? '⏳' : '💾'}
              </button>
            </div>
          </div>

          {/* Share popover */}
          {shareOpen && board && (
            <div className="workhub-moodboard-share-bar">
              <span style={{ fontSize: '0.78rem', color: '#5c6c8d' }}>Board ID: <code>{board.id}</code></span>
              <button
                type="button"
                className="workhub-ghost-btn"
                style={{ fontSize: '0.72rem' }}
                onClick={() => { void navigator.clipboard.writeText(board.id); setShareOpen(false) }}
              >Copy ID</button>
            </div>
          )}

          {activeError && (
            <div className="workhub-moodboard-error">{activeError}</div>
          )}

          {/* Image grid body */}
          <div className="workhub-moodboard-body">
            {(!board || board.images.length === 0) && !uploading && (
              <div className="workhub-moodboard-empty">
                <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>🖼️</div>
                <div>No images yet.</div>
                {canEdit && <div style={{ marginTop: 4, fontSize: '0.78rem', color: '#aac0dc' }}>Use the upload zone below to add images.</div>}
              </div>
            )}

            {board && board.images.length > 0 && (
              <div className="workhub-moodboard-images">
                {board.images.map((img, i) => (
                  <div key={i} className="workhub-moodboard-image-card">
                    <img src={img.url} alt={img.caption} />
                    <div className="workhub-moodboard-image-overlay">
                      <span className="workhub-moodboard-image-caption">{img.caption}</span>
                      {canRemove(img) && (
                        <button
                          type="button"
                          className="workhub-moodboard-image-remove"
                          onClick={() => { void handleRemoveImage(i) }}
                        >Remove</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {uploading && (
              <div style={{ textAlign: 'center', color: '#6a88b8', fontSize: '0.82rem', padding: '12px 0' }}>
                Uploading…
              </div>
            )}

            {canEdit && (
              <label className="workhub-moodboard-upload-zone">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => { void handleFileChange(e) }}
                />
                <div style={{ fontSize: '1.5rem', marginBottom: 6 }}>+</div>
                <div>Click to upload images</div>
                <div style={{ fontSize: '0.7rem', marginTop: 4, color: '#aac0dc' }}>PNG, JPG, GIF, WebP — multiple allowed</div>
              </label>
            )}
          </div>
        </section>

        {/* Details rail — mirrors document detail rail */}
        <aside className="workhub-doc-detail-rail">
          <div className="workhub-detail-rail-head">
            <h3>Details</h3>
            {board && <span>Mood board</span>}
          </div>
          {board ? (
            <>
              <div className="workhub-detail-card">
                <div className="workhub-detail-meta">
                  <span>Entity: {entityLabel}</span>
                  <span>Images: {board.images.length}</span>
                  <span>Checklist items: {checklistItems.length}</span>
                  <span>Created by: {memberByUid[board.createdBy]?.displayName || memberByUid[board.createdBy]?.email || board.createdBy}</span>
                  <span>Created: {formatTime(board.createdAt)}</span>
                  <span>Updated: {formatTime(board.updatedAt)}</span>
                </div>
              </div>

              <WorkhubChecklistCard
                title="Checklist"
                items={checklistItems}
                readOnly={!canEdit}
                draftValue={checklistEditor.draft}
                onDraftChange={checklistEditor.setDraft}
                onAdd={() => { void checklistEditor.addItem() }}
                editingItemId={checklistEditor.editingItemId}
                editingItemText={checklistEditor.editingItemText}
                onEditingItemTextChange={checklistEditor.setEditingItemText}
                onEditStart={checklistEditor.startEdit}
                onEditSave={(item) => { void checklistEditor.saveEdit(item) }}
                onEditCancel={checklistEditor.cancelEdit}
                onToggle={(item, checked) => { void checklistEditor.toggleItem(item, checked) }}
                onRemove={(item) => { void checklistEditor.removeItem(item) }}
                emptyStateText="No checklist items yet for this mood board."
              />

              <WorkhubDiscussionCard
                comments={discussionComments}
                currentUid={currentUid}
                memberByUid={memberByUid}
                formatTime={formatTime}
                editingId={discussionEditingId}
                editingText={discussionEditingText}
                onEditStart={onDiscussionEditStart}
                onEditChange={onDiscussionEditChange}
                onEditCancel={onDiscussionEditCancel}
                onEditSave={onDiscussionEditSave}
                editBusyKey={discussionEditBusyKey}
                composerText={discussionText}
                onComposerTextChange={onDiscussionTextChange}
                onComposerSend={onDiscussionSend}
                composerBusy={discussionBusy}
                composerPlaceholder="Add a comment..."
                emptyStateText="No comments yet."
              />
            </>
          ) : (
            <div className="workhub-empty-state" style={{ fontSize: '0.78rem' }}>No board selected.</div>
          )}
        </aside>
      </div>
    </main>
  )
}

