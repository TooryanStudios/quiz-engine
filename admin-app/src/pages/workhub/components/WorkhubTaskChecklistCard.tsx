import type { WorkhubTask, WorkhubTaskChecklistItem } from '../../../lib/workhubRepo'

export interface WorkhubTaskChecklistCardProps {
  task: WorkhubTask
  checklist: WorkhubTaskChecklistItem[]
  getChecklistDetailKey: (taskId: string, itemId: string) => string
  expandedChecklistDetailKeys: string[]
  onToggleChecklistItemDetails: (taskId: string, itemId: string) => void
  editingChecklistScope: 'inline' | 'details' | null
  editingChecklistTaskId: string | null
  editingChecklistItemId: string | null
  editingChecklistItemText: string
  onEditingChecklistItemTextChange: (value: string) => void
  onChecklistItemToggle: (itemId: string, checked: boolean) => void
  onChecklistItemEditStart: (taskId: string, itemId: string, text: string, scope: 'inline' | 'details') => void
  onChecklistItemEditSave: (itemId: string) => void
  onChecklistItemEditCancel: () => void
  onChecklistRemove: (itemId: string) => void
  checklistDetailsDrafts: Record<string, string>
  onChecklistDetailsDraftChange: (detailKey: string, value: string) => void
  onChecklistItemDetailsSave: (itemId: string) => void
  checklistAttachmentDrafts: Record<string, string>
  onChecklistAttachmentDraftChange: (detailKey: string, value: string) => void
  onChecklistAttachmentAdd: (itemId: string) => void
  onChecklistAttachmentFileUpload: (itemId: string, files: File[]) => void
  uploadingChecklistAttachmentKey: string
  attachmentViewMode: 'list' | 'thumbnail' | 'card'
  isImageAttachmentUrl: (url: string) => boolean
  onOpenAttachmentLightbox: (url: string) => void
  getAttachmentReviewCount: (url: string) => number
  onChecklistAttachmentRemove: (itemId: string, url: string) => void
  checklistLinkDrafts: Record<string, string>
  onChecklistLinkDraftChange: (detailKey: string, value: string) => void
  onChecklistLinkAdd: (itemId: string) => void
  onChecklistLinkRemove: (itemId: string, link: string) => void
  taskChecklistDraft: string
  onTaskChecklistDraftChange: (value: string) => void
  isFinanceLayout?: boolean
  taskChecklistValueDraft?: string
  onTaskChecklistValueDraftChange?: (value: string) => void
  financeCurrency?: string
  onChecklistAdd: (valueAmount?: number | null) => void
  checklistAddDisabled: boolean
}

export function WorkhubTaskChecklistCard({
  task,
  checklist,
  getChecklistDetailKey,
  expandedChecklistDetailKeys,
  onToggleChecklistItemDetails,
  editingChecklistScope,
  editingChecklistTaskId,
  editingChecklistItemId,
  editingChecklistItemText,
  onEditingChecklistItemTextChange,
  onChecklistItemToggle,
  onChecklistItemEditStart,
  onChecklistItemEditSave,
  onChecklistItemEditCancel,
  onChecklistRemove,
  checklistDetailsDrafts,
  onChecklistDetailsDraftChange,
  onChecklistItemDetailsSave,
  checklistAttachmentDrafts,
  onChecklistAttachmentDraftChange,
  onChecklistAttachmentAdd,
  onChecklistAttachmentFileUpload,
  uploadingChecklistAttachmentKey,
  attachmentViewMode,
  isImageAttachmentUrl,
  onOpenAttachmentLightbox,
  getAttachmentReviewCount,
  onChecklistAttachmentRemove,
  checklistLinkDrafts,
  onChecklistLinkDraftChange,
  onChecklistLinkAdd,
  onChecklistLinkRemove,
  taskChecklistDraft,
  onTaskChecklistDraftChange,
  isFinanceLayout = false,
  taskChecklistValueDraft = '',
  onTaskChecklistValueDraftChange,
  financeCurrency = 'OMR',
  onChecklistAdd,
  checklistAddDisabled,
}: WorkhubTaskChecklistCardProps) {
  const checklistDoneCount = checklist.filter((item) => item.completed).length
  const checklistCompletion = checklist.length > 0 ? Math.round((checklistDoneCount / checklist.length) * 100) : 0

  return (
    <div className="workhub-detail-card workhub-task-checklist-card">
      <div className="workhub-task-attachments-head">
        <span>{`Checklist (${checklistDoneCount}/${checklist.length})`}</span>
        <span>{`${checklistCompletion}%`}</span>
      </div>
      <div className="workhub-checklist-progress">
        <div className="workhub-checklist-progress-bar">
          <span className="workhub-checklist-progress-fill" style={{ width: `${checklistCompletion}%` }} />
        </div>
      </div>
      <div className="workhub-checklist-items">
        {checklist.length === 0 ? (
          <div className="workhub-empty-state">No checklist items yet.</div>
        ) : (
          checklist.map((item, index) => {
            const detailKey = getChecklistDetailKey(task.id, item.id)
            const detailsExpanded = expandedChecklistDetailKeys.includes(detailKey)
            return (
              <div key={item.id} className="workhub-checklist-item-wrap">
                <div className={`workhub-checklist-item ${index % 2 === 0 ? 'even' : 'odd'}`}>
                  <div className="workhub-checklist-left">
                    <div className="workhub-checklist-item-main">
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={(event) => onChecklistItemToggle(item.id, event.target.checked)}
                        onClick={(event) => event.stopPropagation()}
                      />
                      {editingChecklistScope === 'details' && editingChecklistTaskId === task.id && editingChecklistItemId === item.id ? (
                        <input
                          type="text"
                          value={editingChecklistItemText}
                          onChange={(event) => onEditingChecklistItemTextChange(event.target.value)}
                          onKeyDown={(event) => {
                            event.stopPropagation()
                            if (event.key === 'Enter') {
                              event.preventDefault()
                              onChecklistItemEditSave(item.id)
                            } else if (event.key === 'Escape') {
                              event.preventDefault()
                              onChecklistItemEditCancel()
                            }
                          }}
                          onBlur={() => onChecklistItemEditSave(item.id)}
                          className="workhub-checklist-edit-input"
                          autoFocus
                        />
                      ) : (
                        <span
                          className={`workhub-checklist-item-text${item.completed ? ' is-checked' : ''}`}
                          onDoubleClick={() => onChecklistItemEditStart(task.id, item.id, item.text, 'details')}
                        >
                          {item.text}
                        </span>
                      )}
                      {isFinanceLayout && typeof item.valueAmount === 'number' && Number.isFinite(item.valueAmount) && (
                        <span className="workhub-checklist-item-value" title="Checklist value">
                          {financeCurrency} {item.valueAmount.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="workhub-checklist-actions">
                    <button
                      type="button"
                      className="workhub-checklist-expand"
                      onClick={() => onToggleChecklistItemDetails(task.id, item.id)}
                      title="Checklist item details"
                    >
                      {detailsExpanded ? '▾' : '▸'}
                    </button>
                    <button
                      type="button"
                      className="workhub-checklist-edit"
                      onClick={(event) => {
                        event.stopPropagation()
                        onChecklistItemEditStart(task.id, item.id, item.text, 'details')
                      }}
                      title="Edit checklist item"
                    >
                      ✏
                    </button>
                    <button
                      type="button"
                      className="workhub-checklist-remove"
                      onClick={(event) => {
                        event.stopPropagation()
                        onChecklistRemove(item.id)
                      }}
                      title="Delete checklist item"
                    >
                      🗑
                    </button>
                  </div>
                </div>
                {detailsExpanded && (
                  <div className="workhub-checklist-item-details">
                    <label className="workhub-checklist-detail-field">
                      <span>Details</span>
                      <textarea
                        value={checklistDetailsDrafts[detailKey] ?? (item.details || '')}
                        onChange={(event) => onChecklistDetailsDraftChange(detailKey, event.target.value)}
                        onBlur={() => onChecklistItemDetailsSave(item.id)}
                        placeholder="Add item details"
                      />
                    </label>

                    <div className="workhub-checklist-url-row">
                      <input
                        type="url"
                        value={checklistAttachmentDrafts[detailKey] || ''}
                        onChange={(event) => onChecklistAttachmentDraftChange(detailKey, event.target.value)}
                        placeholder="Attachment URL"
                      />
                      <button type="button" onClick={() => onChecklistAttachmentAdd(item.id)}>Add file URL</button>
                      <label className="workhub-file-upload-btn">
                        <input
                          type="file"
                          multiple
                          onChange={(event) => {
                            const files = Array.from(event.target.files || [])
                            if (files.length === 0) return
                            onChecklistAttachmentFileUpload(item.id, files)
                            event.target.value = ''
                          }}
                          disabled={uploadingChecklistAttachmentKey === detailKey}
                        />
                        {uploadingChecklistAttachmentKey === detailKey ? 'Uploading…' : 'Upload'}
                      </label>
                    </div>
                    {(item.attachments || []).length > 0 && (
                      <div className={`workhub-checklist-url-list view-${attachmentViewMode}`}>
                        {(item.attachments || []).map((url) => {
                          const reviewCount = getAttachmentReviewCount(url)
                          return (
                            <div key={url} className="workhub-checklist-url-item workhub-task-image-item">
                              {isImageAttachmentUrl(url) ? (
                                <button type="button" className="workhub-attachment-preview-btn" onClick={() => onOpenAttachmentLightbox(url)}>
                                  <img src={url} alt="Checklist attachment preview" className="workhub-task-image-thumb" loading="lazy" />
                                  <span>{url}</span>
                                </button>
                              ) : (
                                <a href={url} target="_blank" rel="noreferrer" className="workhub-task-image-link">
                                  <span className="workhub-task-attachment-icon">📎</span>
                                  <span>{url}</span>
                                </a>
                              )}
                              {reviewCount > 0 && (
                                <span className="workhub-attachment-review-indicator" title={`${reviewCount} note${reviewCount === 1 ? '' : 's'} / annotations`}>
                                  📝 {reviewCount}
                                </span>
                              )}
                              <button type="button" onClick={() => onChecklistAttachmentRemove(item.id, url)}>✕</button>
                            </div>
                          )
                        })}
                      </div>
                    )}

                    <div className="workhub-checklist-url-row">
                      <input
                        type="url"
                        value={checklistLinkDrafts[detailKey] || ''}
                        onChange={(event) => onChecklistLinkDraftChange(detailKey, event.target.value)}
                        placeholder="Link URL"
                      />
                      <button type="button" onClick={() => onChecklistLinkAdd(item.id)}>Add link</button>
                    </div>
                    {(item.links || []).length > 0 && (
                      <div className="workhub-checklist-url-list">
                        {(item.links || []).map((link) => (
                          <div key={link} className="workhub-checklist-url-item">
                            <a href={link} target="_blank" rel="noreferrer">{link}</a>
                            <button type="button" onClick={() => onChecklistLinkRemove(item.id, link)}>✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>
      <div className={`workhub-checklist-add${isFinanceLayout ? ' is-finance-add' : ''}`}>
        <input
          type="text"
          value={taskChecklistDraft}
          placeholder="Add checklist item"
          onChange={(event) => onTaskChecklistDraftChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              const raw = (taskChecklistValueDraft || '').trim()
              const parsed = raw === '' ? null : Number(raw)
              onChecklistAdd(parsed !== null && Number.isFinite(parsed) && parsed >= 0 ? parsed : null)
            }
          }}
        />
        {isFinanceLayout && (
          <div className="workhub-checklist-value-input-wrap">
            <span className="workhub-checklist-value-prefix">{financeCurrency}</span>
            <input
              type="number"
              min={0}
              step={0.01}
              className="workhub-checklist-value-input"
              value={taskChecklistValueDraft}
              placeholder="0.00"
              onChange={(event) => onTaskChecklistValueDraftChange?.(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault()
                  const raw = (taskChecklistValueDraft || '').trim()
                  const parsed = raw === '' ? null : Number(raw)
                  onChecklistAdd(parsed !== null && Number.isFinite(parsed) && parsed >= 0 ? parsed : null)
                }
              }}
            />
          </div>
        )}
        <button
          type="button"
          onClick={() => {
            const raw = (taskChecklistValueDraft || '').trim()
            const parsed = raw === '' ? null : Number(raw)
            onChecklistAdd(parsed !== null && Number.isFinite(parsed) && parsed >= 0 ? parsed : null)
          }}
          disabled={checklistAddDisabled}
        >
          Add item
        </button>
      </div>
    </div>
  )
}
