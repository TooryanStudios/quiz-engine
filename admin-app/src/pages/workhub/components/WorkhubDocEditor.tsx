import { useEffect, useState } from 'react'
import type { UseWorkhubDocEditorHandlersOutput } from '../hooks/useWorkhubDocEditorHandlers'
import type { WorkhubDocument, WorkhubMember, WorkhubProject, WorkhubTaskComment } from '../../../lib/workhubRepo'
import { TinyRichTextEditor } from '../../../components/editor/TinyRichTextEditor'
import { WorkhubAttachmentCard } from './WorkhubAttachmentCard'
import { WorkhubChecklistCard } from './WorkhubChecklistCard'
import { WorkhubDiscussionCard } from './WorkhubDiscussionCard'

// ── Props ─────────────────────────────────────────────────────────────────────

interface WorkhubDocEditorProps extends UseWorkhubDocEditorHandlersOutput {
  selectedDocument: WorkhubDocument | undefined
  scopedWorkspaceDocuments: WorkhubDocument[]
  selectedProjectId: string
  taskContextTrail: Array<Pick<WorkhubProject, 'id' | 'name'>>
  taskContextIconByProjectId: Record<string, string>
  selectedProjectPeriodLabel: string
  selectedProjectSubmissionTimeLabel: string
  onSelectProject: (projectId: string) => void
  busyKey: string
  memberByUid: Record<string, WorkhubMember>
  workhubShareCandidates: WorkhubMember[]
  workspaceProjectById: Record<string, WorkhubProject>
  isImageAttachmentUrl: (url: string) => boolean
  openAttachmentLightbox: (url: string) => void
  formatTime: (value: unknown) => string
  openDocumentCreateDialog: (projectId: string) => void
  isMobileLayout: boolean
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
  currentUid: string
}

// ── Component ─────────────────────────────────────────────────────────────────

export function WorkhubDocEditor({
  // From hook output
  selectedDocumentTitleDraft,
  selectedDocumentBodyDraft,
  selectedDocumentChanged,
  selectedDocumentLocked,
  selectedDocumentCanEdit,
  selectedDocumentReadOnly,
  setSelectedDocumentTitleDraft,
  setSelectedDocumentBodyDraft,
  closeSelectedDocument,
  handleSaveSelectedDocument,
  handleToggleSelectedDocumentLock,
  handleDeleteSelectedDocument,
  shareDocDialogOpen,
  shareDocSaving,
  shareDocAccessDraftByUid,
  setShareDocDialogOpen,
  handleToggleShareDocMember,
  handleSetShareDocMemberAccess,
  handleSaveDocInternalShare,
  docChecklistDraft,
  editingDocChecklistItemId,
  editingDocChecklistItemText,
  setDocChecklistDraft,
  setEditingDocChecklistItemId,
  setEditingDocChecklistItemText,
  getDocChecklist,
  handleDocChecklistAdd,
  handleDocChecklistToggle,
  handleDocChecklistRemove,
  handleDocChecklistEditSave,
  docAttachmentDraft,
  uploadingDocAttachment,
  setDocAttachmentDraft,
  handleDocAttachmentAdd,
  handleDocAttachmentRemove,
  handleDocAttachmentFileUpload,
  docLinkDraft,
  setDocLinkDraft,
  handleDocLinkAdd,
  handleDocLinkRemove,
  noteAutoSaveStatus,
  // Extra page-level props
  selectedDocument,
  scopedWorkspaceDocuments,
  selectedProjectId,
  taskContextTrail,
  taskContextIconByProjectId,
  selectedProjectPeriodLabel,
  selectedProjectSubmissionTimeLabel,
  onSelectProject,
  busyKey,
  memberByUid,
  workhubShareCandidates,
  workspaceProjectById,
  isImageAttachmentUrl,
  openAttachmentLightbox,
  formatTime,
  openDocumentCreateDialog,
  isMobileLayout,
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
  currentUid,
}: WorkhubDocEditorProps) {
  const [mobileDocDetailsOpen, setMobileDocDetailsOpen] = useState(false)
  const shareSelectedCount = Object.keys(shareDocAccessDraftByUid).length
  const isQuickNote = selectedDocument?.type === 'note'

  useEffect(() => {
    setMobileDocDetailsOpen(false)
  }, [selectedDocument?.id])

  if (isQuickNote && selectedDocument) {
    const projectName = selectedDocument.projectId ? (workspaceProjectById[selectedDocument.projectId]?.name || 'project') : null
    return (
      <div className="workhub-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeSelectedDocument() }}>
        <div className="workhub-modal workhub-quick-note-modal" onMouseDown={(event) => event.stopPropagation()}>
          <div className="workhub-quick-note-head">
            <div className="workhub-quick-note-head-left">
              <h2>Quick note</h2>
              {projectName && (
                <span className="workhub-quick-note-location">{projectName}</span>
              )}
            </div>
            <button
              type="button"
              className="workhub-ghost-btn workhub-quick-note-close"
              onClick={closeSelectedDocument}
              aria-label="Close quick note"
            >
              ✕
            </button>
          </div>

          <TinyRichTextEditor
            className={`workhub-document-body-editor workhub-quick-note-editor${selectedDocumentReadOnly ? ' is-locked' : ''}`}
            value={selectedDocumentBodyDraft}
            onChange={setSelectedDocumentBodyDraft}
            disabled={selectedDocumentReadOnly}
            minHeight={420}
            placeholder="Write a quick idea, reminder, or short note..."
            autoFocus={!selectedDocumentReadOnly}
          />

          <div className="workhub-quick-note-foot">
            <div className="workhub-quick-note-foot-left">
              {!selectedDocumentReadOnly && (
                <button
                  type="button"
                  className="workhub-ghost-btn workhub-quick-note-share-btn"
                  onClick={() => setShareDocDialogOpen(true)}
                  title="Share with colleague"
                  aria-label="Share note with a colleague"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <circle cx="12" cy="3" r="1.75" stroke="currentColor" strokeWidth="1.5"/>
                    <circle cx="12" cy="13" r="1.75" stroke="currentColor" strokeWidth="1.5"/>
                    <circle cx="4" cy="8" r="1.75" stroke="currentColor" strokeWidth="1.5"/>
                    <line x1="10.3" y1="3.9" x2="5.7" y2="7.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    <line x1="5.7" y1="8.9" x2="10.3" y2="12.1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  {shareSelectedCount > 0 && (
                    <span className="workhub-quick-note-share-count">{shareSelectedCount}</span>
                  )}
                </button>
              )}
            </div>
            <div className="workhub-quick-note-actions">
              {selectedDocumentCanEdit && !selectedDocumentLocked ? (
                <button
                  type="button"
                  className="workhub-danger-btn"
                  disabled={busyKey === `document-delete:${selectedDocument.id}`}
                  onClick={() => {
                    if (!window.confirm('Delete this note?')) return
                    void handleDeleteSelectedDocument()
                  }}
                >
                  {busyKey === `document-delete:${selectedDocument.id}` ? 'Deleting…' : 'Delete'}
                </button>
              ) : null}
              <button type="button" className="workhub-primary-btn" onClick={closeSelectedDocument}>Done</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <main className="workhub-section-stack workhub-notes-content-area">
        <div className="workhub-notes-layout">
          <section className="workhub-panel workhub-documents-panel">
            {taskContextTrail.length > 0 && (
              <div className="workhub-task-context-strip" role="navigation" aria-label="Current item path">
                <div className="workhub-task-context-path">
                  {taskContextTrail.map((project, index) => {
                    const isCurrent = index === taskContextTrail.length - 1
                    const icon = taskContextIconByProjectId[project.id] || '📁'
                    const iconKind = icon === '🚀' ? 'project' : 'folder'
                    return (
                      <div key={project.id} className="workhub-task-context-node-wrap">
                        <button
                          type="button"
                          className={`workhub-task-context-node${isCurrent ? ' is-current' : ''}`}
                          onClick={() => onSelectProject(project.id)}
                          title={project.name}
                          aria-current={isCurrent ? 'page' : undefined}
                        >
                          <span className={`workhub-task-context-node-icon is-${iconKind}-kind`} aria-hidden="true">{icon}</span>
                          <span className="workhub-task-context-node-text">
                            <span className="workhub-task-context-node-title">{project.name}</span>
                          </span>
                        </button>
                        {!isCurrent && <span className="workhub-task-context-sep" aria-hidden="true">›</span>}
                      </div>
                    )
                  })}
                </div>
                {(selectedProjectPeriodLabel || selectedProjectSubmissionTimeLabel) && (
                  <div className="workhub-task-context-period" title="Proposal period">
                    {selectedProjectPeriodLabel && <span><strong>Period:</strong> {selectedProjectPeriodLabel}</span>}
                    {selectedProjectSubmissionTimeLabel && <span className="workhub-ltr-token">{selectedProjectSubmissionTimeLabel}</span>}
                  </div>
                )}
              </div>
            )}
            <div className="workhub-panel-head">
              <div className="workhub-documents-head-main">
                {selectedDocument ? (
                  <input
                    className="workhub-documents-title-input"
                    value={selectedDocumentTitleDraft}
                    onChange={(event) => setSelectedDocumentTitleDraft(event.target.value)}
                    placeholder="Document name"
                    disabled={selectedDocumentReadOnly}
                  />
                ) : (
                  <h2>Documents</h2>
                )}
              </div>
              <div className="workhub-panel-tools">
                <button
                  className="workhub-ghost-btn workhub-doc-tool-btn"
                  title="New document"
                  aria-label="New document"
                  onClick={() => openDocumentCreateDialog(selectedProjectId !== 'all' ? selectedProjectId : '')}
                >
                  📝
                </button>
                {selectedDocument ? (
                  <button
                    className="workhub-ghost-btn workhub-doc-tool-btn"
                    onClick={() => { setShareDocDialogOpen(true) }}
                    title="Share document"
                    aria-label="Share document"
                    disabled={!selectedDocumentCanEdit}
                  >
                    🔗
                  </button>
                ) : null}
                {selectedDocument && selectedDocumentCanEdit ? (
                  <button
                    className="workhub-ghost-btn workhub-doc-tool-btn"
                    disabled={busyKey === `document-lock:${selectedDocument.id}`}
                    onClick={() => { void handleToggleSelectedDocumentLock() }}
                    title={selectedDocumentLocked ? 'Unlock document' : 'Lock document'}
                    aria-label={selectedDocumentLocked ? 'Unlock document' : 'Lock document'}
                  >
                    {busyKey === `document-lock:${selectedDocument.id}` ? '⏳' : (selectedDocumentLocked ? '🔓' : '🔒')}
                  </button>
                ) : null}
                {selectedDocument && selectedDocumentCanEdit && !selectedDocumentLocked ? (
                  <button
                    className="workhub-danger-btn workhub-doc-tool-btn"
                    title="Delete document"
                    aria-label="Delete document"
                    disabled={busyKey === `document-delete:${selectedDocument.id}`}
                    onClick={() => {
                      if (!window.confirm('Delete this document?')) return
                      void handleDeleteSelectedDocument()
                    }}
                  >
                    {busyKey === `document-delete:${selectedDocument.id}` ? '⏳' : '🗑'}
                  </button>
                ) : null}
                <button
                  className="workhub-primary-btn workhub-doc-tool-btn"
                  title="Save document"
                  aria-label="Save document"
                  disabled={!selectedDocument || selectedDocumentReadOnly || !selectedDocumentChanged || busyKey === `document:${selectedDocument?.id || ''}`}
                  onClick={() => { void handleSaveSelectedDocument() }}
                  style={selectedDocument?.type === 'note' ? { display: 'none' } : undefined}
                >
                  {busyKey === `document:${selectedDocument?.id || ''}` ? '⏳' : '💾'}
                </button>
                {selectedDocument?.type === 'note' && (
                  <span className="workhub-note-autosave-status" aria-live="polite">
                    {noteAutoSaveStatus === 'saving' ? 'Saving…' : noteAutoSaveStatus === 'saved' ? '✓ Saved' : ''}
                  </span>
                )}
                {isMobileLayout && selectedDocument && (
                  <button
                    className="workhub-ghost-btn workhub-doc-tool-btn"
                    onClick={() => setMobileDocDetailsOpen(true)}
                    title="Details"
                    aria-label="Details"
                  >
                    ⚙️
                  </button>
                )}
              </div>
            </div>

            {selectedDocument ? (
              <>
                <TinyRichTextEditor
                  className={`workhub-document-body-editor${selectedDocumentReadOnly ? ' is-locked' : ''}`}
                  value={selectedDocumentBodyDraft}
                  onChange={setSelectedDocumentBodyDraft}
                  disabled={selectedDocumentReadOnly}
                  minHeight={460}
                  placeholder="Write scope of work, requirements, assumptions, or any project details..."
                />
              </>
            ) : scopedWorkspaceDocuments.length === 0 ? (
              <div className="workhub-empty-state workhub-documents-empty-state">No documents yet. Use New document to add your first one.</div>
            ) : (
              <div className="workhub-empty-state workhub-documents-empty-state">Select a document from the sidebar tree to edit.</div>
            )}
          </section>

          {/* Document detail rail */}
          <aside
            className={`workhub-doc-detail-rail${isMobileLayout ? ' is-mobile-drawer' : ''}${isMobileLayout && mobileDocDetailsOpen ? ' is-open' : ''}`}
            aria-hidden={isMobileLayout && !mobileDocDetailsOpen}
          >
            {isMobileLayout && (
              <div className="workhub-mobile-detail-drawer-head">
                <button
                  type="button"
                  className="workhub-mobile-detail-drawer-handle"
                  aria-label="Close document details"
                  onClick={() => setMobileDocDetailsOpen(false)}
                />
                <div className="workhub-mobile-detail-drawer-title-row">
                  <strong>Details</strong>
                  <button type="button" className="workhub-ghost-mini" onClick={() => setMobileDocDetailsOpen(false)}>✕</button>
                </div>
              </div>
            )}
            <div className="workhub-detail-rail-head">
              <h3>Details</h3>
              {selectedDocument && <span>Document selected</span>}
            </div>

            {selectedDocument ? (
              <>
                {/* Meta */}
                <details className="workhub-detail-collapsible-info">
                  <summary>{selectedDocument.type === 'note' ? 'Note information' : 'Document information'}</summary>
                  <div className="workhub-detail-meta">
                    <span>Created by: {memberByUid[selectedDocument.createdBy]?.displayName || memberByUid[selectedDocument.createdBy]?.email || selectedDocument.createdBy}</span>
                    <span>Created: {formatTime(selectedDocument.createdAt)}</span>
                    <span>Updated: {formatTime(selectedDocument.updatedAt)}</span>
                    {selectedDocument.isLocked && (
                      <span>Locked by: {memberByUid[selectedDocument.lockedBy as string]?.displayName || selectedDocument.lockedBy}</span>
                    )}
                    {selectedDocument.projectId && (
                      <span>Project: {workspaceProjectById[selectedDocument.projectId]?.name || selectedDocument.projectId}</span>
                    )}
                  </div>
                </details>

                {/* Edit history */}
                {Array.isArray(selectedDocument.editedBy) && selectedDocument.editedBy.length > 0 && (
                  <div className="workhub-detail-card">
                    <h3>Edit history</h3>
                    <div className="workhub-doc-edit-history">
                      {[...selectedDocument.editedBy].reverse().map((entry) => (
                        <div key={entry.uid + entry.at} className="workhub-doc-edit-entry">
                          <span className="workhub-doc-edit-name">{memberByUid[entry.uid]?.displayName || memberByUid[entry.uid]?.email || entry.uid}</span>
                          <span className="workhub-doc-edit-time">{entry.at ? new Date(entry.at).toLocaleString() : ''}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Checklist */}
                <WorkhubChecklistCard
                  title="Checklist"
                  items={getDocChecklist(selectedDocument)}
                  readOnly={selectedDocumentReadOnly}
                  draftValue={docChecklistDraft}
                  onDraftChange={setDocChecklistDraft}
                  onAdd={handleDocChecklistAdd}
                  editingItemId={editingDocChecklistItemId}
                  editingItemText={editingDocChecklistItemText}
                  onEditingItemTextChange={setEditingDocChecklistItemText}
                  onEditStart={(item) => {
                    setEditingDocChecklistItemId(item.id)
                    setEditingDocChecklistItemText(item.text)
                  }}
                  onEditSave={(item) => {
                    handleDocChecklistEditSave(item.id)
                  }}
                  onEditCancel={() => {
                    setEditingDocChecklistItemId(null)
                    setEditingDocChecklistItemText('')
                  }}
                  onToggle={(item, checked) => {
                    handleDocChecklistToggle(item.id, checked)
                  }}
                  onRemove={(item) => {
                    handleDocChecklistRemove(item.id)
                  }}
                />

                {/* Discussion */}
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
                />

                {/* Attachments */}
                <WorkhubAttachmentCard
                  title="Attachments"
                  attachments={selectedDocument.attachments || []}
                  readOnly={selectedDocumentReadOnly}
                  draftValue={docAttachmentDraft}
                  onDraftChange={setDocAttachmentDraft}
                  onAddUrl={handleDocAttachmentAdd}
                  uploading={uploadingDocAttachment}
                  onUploadFiles={(files) => {
                    void handleDocAttachmentFileUpload(files)
                  }}
                  isImageUrl={isImageAttachmentUrl}
                  onOpenImage={openAttachmentLightbox}
                  onRemove={handleDocAttachmentRemove}
                />

                {/* Links */}
                <div className="workhub-detail-card">
                  <h3>Links</h3>
                  {!selectedDocumentReadOnly && (
                    <div className="workhub-checklist-url-row compact-row">
                      <input
                        type="url"
                        value={docLinkDraft}
                        onChange={(e) => setDocLinkDraft(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleDocLinkAdd() } }}
                        placeholder="Link URL"
                      />
                      <button type="button" onClick={handleDocLinkAdd}>➕ Add link</button>
                    </div>
                  )}
                  {(selectedDocument.links || []).length > 0 && (
                    <div className="workhub-checklist-url-list">
                      {(selectedDocument.links || []).map((url) => (
                        <div key={url} className="workhub-checklist-url-item">
                          <a href={url} target="_blank" rel="noreferrer">{url}</a>
                          {!selectedDocumentReadOnly && (
                            <button
                              type="button"
                              title="Remove link"
                              aria-label="Remove link"
                              onClick={() => {
                                if (!window.confirm('Remove this link?')) return
                                handleDocLinkRemove(url)
                              }}
                            >
                              🗑
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="workhub-empty-state" style={{ margin: '12px 0' }}>Select a document to view its details.</div>
            )}
          </aside>

          {isMobileLayout && mobileDocDetailsOpen && (
            <button
              type="button"
              className="workhub-task-detail-drawer-backdrop"
              aria-label="Close document details"
              onClick={() => setMobileDocDetailsOpen(false)}
            />
          )}
        </div>
      </main>

      {/* Share document dialog */}
      {shareDocDialogOpen && selectedDocument && (
        <div className="workhub-share-doc-overlay" onClick={() => setShareDocDialogOpen(false)}>
          <div className="workhub-share-doc-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="workhub-share-doc-head">
              <span>Share inside WorkHub</span>
              <button type="button" className="workhub-share-doc-close" onClick={() => setShareDocDialogOpen(false)}>✕</button>
            </div>
            <p className="workhub-share-doc-title">"{selectedDocument.title}"</p>
            <p className="workhub-share-doc-desc">
              Choose any WorkHub members and set whether they can view or edit. Leave the list empty to remove internal sharing and keep the document available to the workspace.
            </p>
            <p className="workhub-share-doc-desc">Selected members: {shareSelectedCount}</p>

            <div className="workhub-share-doc-members">
              {workhubShareCandidates.length === 0 ? (
                <div className="workhub-empty-state">No WorkHub members are available for sharing.</div>
              ) : (
                workhubShareCandidates.map((member) => {
                  const access = shareDocAccessDraftByUid[member.uid]
                  const isSelected = access === 'view' || access === 'edit'
                  const memberLabel = member.displayName || member.email || member.uid
                  return (
                    <div key={member.uid} className="workhub-share-doc-member-row">
                      <label className="workhub-share-doc-member-main">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={!selectedDocumentCanEdit}
                          onChange={() => handleToggleShareDocMember(member.uid)}
                        />
                        <span className="workhub-share-doc-member-copy">
                          <strong>{memberLabel}</strong>
                          {member.email && <small>{member.email}</small>}
                        </span>
                      </label>

                      {isSelected && (
                        <div className="workhub-share-doc-member-access">
                          <button
                            type="button"
                            className={`workhub-ghost-btn${access === 'view' ? ' is-active' : ''}`}
                            disabled={!selectedDocumentCanEdit}
                            onClick={() => handleSetShareDocMemberAccess(member.uid, 'view')}
                          >
                            View
                          </button>
                          <button
                            type="button"
                            className={`workhub-ghost-btn${access === 'edit' ? ' is-active' : ''}`}
                            disabled={!selectedDocumentCanEdit}
                            onClick={() => handleSetShareDocMemberAccess(member.uid, 'edit')}
                          >
                            Edit
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>

            <div className="workhub-share-doc-actions">
              <button
                type="button"
                className="workhub-ghost-btn"
                onClick={() => setShareDocDialogOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="workhub-primary-btn"
                disabled={!selectedDocumentCanEdit || shareDocSaving}
                onClick={() => { void handleSaveDocInternalShare() }}
              >
                {shareDocSaving ? 'Saving…' : 'Save sharing'}
              </button>
            </div>

            {!selectedDocumentCanEdit && (
              <p className="workhub-share-doc-desc">You currently have view-only access and cannot change sharing.</p>
            )}
          </div>
        </div>
      )}
    </>
  )
}
