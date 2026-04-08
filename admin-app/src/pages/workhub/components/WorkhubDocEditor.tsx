import { useState } from 'react'
import type { UseWorkhubDocEditorHandlersOutput } from '../hooks/useWorkhubDocEditorHandlers'
import type { WorkhubDocument, WorkhubMember, WorkhubProject } from '../../../lib/workhubRepo'
import { TinyRichTextEditor } from '../../../components/editor/TinyRichTextEditor'

// ── Props ─────────────────────────────────────────────────────────────────────

interface WorkhubDocEditorProps extends UseWorkhubDocEditorHandlersOutput {
  selectedDocument: WorkhubDocument | undefined
  scopedWorkspaceDocuments: WorkhubDocument[]
  selectedProjectId: string
  busyKey: string
  memberByUid: Record<string, WorkhubMember>
  workhubShareCandidates: WorkhubMember[]
  workspaceProjectById: Record<string, WorkhubProject>
  isImageAttachmentUrl: (url: string) => boolean
  openAttachmentLightbox: (url: string) => void
  formatTime: (value: unknown) => string
  openDocumentCreateDialog: (projectId: string) => void
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
  // Extra page-level props
  selectedDocument,
  scopedWorkspaceDocuments,
  selectedProjectId,
  busyKey,
  memberByUid,
  workhubShareCandidates,
  workspaceProjectById,
  isImageAttachmentUrl,
  openAttachmentLightbox,
  formatTime,
  openDocumentCreateDialog,
}: WorkhubDocEditorProps) {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const shareSelectedCount = Object.keys(shareDocAccessDraftByUid).length
  return (
    <>
      <main className="workhub-section-stack workhub-notes-content-area">
        <div className="workhub-notes-layout">
          <section className="workhub-panel workhub-documents-panel">
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
                <button className="workhub-ghost-btn" onClick={() => openDocumentCreateDialog(selectedProjectId !== 'all' ? selectedProjectId : '')}>
                  📝 New document
                </button>
                {selectedDocument ? (
                  <button
                    className="workhub-ghost-btn"
                    onClick={() => { setShareDocDialogOpen(true) }}
                    title="Share document"
                    disabled={!selectedDocumentCanEdit}
                  >
                    🔗 Share
                  </button>
                ) : null}
                {selectedDocument && selectedDocumentCanEdit ? (
                  <button
                    className="workhub-ghost-btn"
                    disabled={busyKey === `document-lock:${selectedDocument.id}`}
                    onClick={() => { void handleToggleSelectedDocumentLock() }}
                  >
                    {busyKey === `document-lock:${selectedDocument.id}`
                      ? (selectedDocumentLocked ? 'Unlocking...' : 'Locking...')
                      : (selectedDocumentLocked ? '🔓 Unlock' : '🔒 Lock')}
                  </button>
                ) : null}
                {selectedDocument && selectedDocumentCanEdit && !selectedDocumentLocked ? (
                  deleteConfirmId === selectedDocument.id ? (
                    <span className="workhub-doc-delete-confirm">
                      <span>Delete this document?</span>
                      <button
                        className="workhub-danger-btn"
                        disabled={busyKey === `document-delete:${selectedDocument.id}`}
                        onClick={() => { void handleDeleteSelectedDocument(); setDeleteConfirmId(null) }}
                      >
                        {busyKey === `document-delete:${selectedDocument.id}` ? 'Deleting...' : 'Yes, delete'}
                      </button>
                      <button
                        className="workhub-ghost-btn"
                        onClick={() => setDeleteConfirmId(null)}
                      >
                        Cancel
                      </button>
                    </span>
                  ) : (
                    <button
                      className="workhub-danger-btn"
                      onClick={() => setDeleteConfirmId(selectedDocument.id)}
                    >
                      Delete
                    </button>
                  )
                ) : null}
                <button
                  className="workhub-primary-btn"
                  disabled={!selectedDocument || selectedDocumentReadOnly || !selectedDocumentChanged || busyKey === `document:${selectedDocument?.id || ''}`}
                  onClick={() => { void handleSaveSelectedDocument() }}
                >
                  {busyKey === `document:${selectedDocument?.id || ''}` ? 'Saving...' : 'Save document'}
                </button>
              </div>
            </div>

            {selectedDocument ? (
              <>
                <div className="workhub-document-body-head">
                  <span>{selectedDocumentReadOnly ? 'Document body (View only)' : 'Document body'}</span>
                </div>
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
          <aside className="workhub-doc-detail-rail">
            <div className="workhub-detail-rail-head">
              <h3>Details</h3>
              {selectedDocument && <span>Document selected</span>}
            </div>

            {selectedDocument ? (
              <>
                {/* Meta */}
                <div className="workhub-detail-card">
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
                </div>

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
                <div className="workhub-detail-card">
                  <h3>Checklist</h3>
                  {(() => {
                    const docChecklist = getDocChecklist(selectedDocument)
                    const doneCount = docChecklist.filter((item) => item.completed).length
                    return (
                      <>
                        {docChecklist.length > 0 && (
                          <div className="workhub-doc-checklist-progress">
                            <div className="workhub-doc-checklist-bar">
                              <div
                                className="workhub-doc-checklist-bar-fill"
                                style={{ width: `${Math.round((doneCount / docChecklist.length) * 100)}%` }}
                              />
                            </div>
                            <span>{doneCount}/{docChecklist.length}</span>
                          </div>
                        )}
                        <div className="workhub-checklist-items">
                          {docChecklist.length === 0 ? (
                            <div className="workhub-empty-state">No checklist items yet.</div>
                          ) : (
                            docChecklist.map((item) => (
                              <div key={item.id} className="workhub-checklist-item even">
                                <div className="workhub-checklist-left">
                                  <div className="workhub-checklist-item-main">
                                    <input
                                      type="checkbox"
                                      checked={item.completed}
                                      disabled={selectedDocumentReadOnly}
                                      onChange={(e) => handleDocChecklistToggle(item.id, e.target.checked)}
                                    />
                                    {editingDocChecklistItemId === item.id ? (
                                      <input
                                        type="text"
                                        className="workhub-checklist-edit-input"
                                        autoFocus
                                        value={editingDocChecklistItemText}
                                        onChange={(e) => setEditingDocChecklistItemText(e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') { e.preventDefault(); handleDocChecklistEditSave(item.id) }
                                          if (e.key === 'Escape') { setEditingDocChecklistItemId(null); setEditingDocChecklistItemText('') }
                                        }}
                                        onBlur={() => handleDocChecklistEditSave(item.id)}
                                      />
                                    ) : (
                                      <span
                                        className={`workhub-checklist-item-text${item.completed ? ' is-checked' : ''}`}
                                        onDoubleClick={() => { if (!selectedDocumentReadOnly) { setEditingDocChecklistItemId(item.id); setEditingDocChecklistItemText(item.text) } }}
                                      >
                                        {item.text}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="workhub-checklist-actions">
                                  <button
                                    type="button"
                                    className="workhub-checklist-edit"
                                    onClick={() => { setEditingDocChecklistItemId(item.id); setEditingDocChecklistItemText(item.text) }}
                                    title="Edit item"
                                    disabled={selectedDocumentReadOnly}
                                  >✏️</button>
                                  <button
                                    type="button"
                                    className="workhub-checklist-remove"
                                    onClick={() => handleDocChecklistRemove(item.id)}
                                    title="Remove item"
                                    disabled={selectedDocumentReadOnly}
                                  >🗑️</button>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                        {!selectedDocumentReadOnly && (
                          <div className="workhub-checklist-url-row compact-row">
                            <input
                              type="text"
                              value={docChecklistDraft}
                              onChange={(e) => setDocChecklistDraft(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleDocChecklistAdd() } }}
                              placeholder="Add checklist item"
                            />
                            <button type="button" onClick={handleDocChecklistAdd}>➕</button>
                          </div>
                        )}
                      </>
                    )
                  })()}
                </div>

                {/* Attachments */}
                <div className="workhub-detail-card">
                  <h3>Attachments</h3>
                  {!selectedDocumentReadOnly && (
                    <div className="workhub-checklist-url-row compact-row">
                      <input
                        type="url"
                        value={docAttachmentDraft}
                        onChange={(e) => setDocAttachmentDraft(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleDocAttachmentAdd() } }}
                        placeholder="Attachment URL"
                      />
                      <button type="button" onClick={handleDocAttachmentAdd}>➕ Add URL</button>
                      <label className="workhub-file-upload-btn">
                        <input
                          type="file"
                          multiple
                          disabled={uploadingDocAttachment}
                          onChange={(e) => {
                            const files = Array.from(e.target.files || [])
                            if (files.length === 0) return
                            void handleDocAttachmentFileUpload(files)
                            e.target.value = ''
                          }}
                        />
                        {uploadingDocAttachment ? 'Uploading…' : 'Upload'}
                      </label>
                    </div>
                  )}
                  {(selectedDocument.attachments || []).length > 0 && (
                    <div className="workhub-checklist-url-list view-list">
                      {(selectedDocument.attachments || []).map((url) => (
                        <div key={url} className="workhub-checklist-url-item workhub-task-image-item">
                          {isImageAttachmentUrl(url) ? (
                            <button type="button" className="workhub-attachment-preview-btn" onClick={() => openAttachmentLightbox(url)}>
                              <img src={url} alt="Attachment" className="workhub-task-image-thumb" loading="lazy" />
                              <span>{url}</span>
                            </button>
                          ) : (
                            <a href={url} target="_blank" rel="noreferrer" className="workhub-task-image-link">
                              <span className="workhub-task-attachment-icon">📎</span>
                              <span>{url}</span>
                            </a>
                          )}
                          {!selectedDocumentReadOnly && (
                            <button type="button" onClick={() => handleDocAttachmentRemove(url)}>✕</button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

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
                            <button type="button" onClick={() => handleDocLinkRemove(url)}>✕</button>
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
