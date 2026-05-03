import { isVideoAttachmentUrl } from '../taskUtils'
import { WorkhubInlineVideoPlayer } from './WorkhubInlineVideoPlayer'

export interface WorkhubAttachmentCardProps {
  title?: string
  attachments: string[]
  readOnly?: boolean
  draftValue: string
  onDraftChange: (value: string) => void
  onAddUrl: () => void
  uploading?: boolean
  onUploadFiles: (files: File[]) => void
  isImageUrl: (url: string) => boolean
  onOpenImage: (url: string) => void
  onRemove: (url: string) => void
}

export function WorkhubAttachmentCard({
  title = 'Attachments',
  attachments,
  readOnly = false,
  draftValue,
  onDraftChange,
  onAddUrl,
  uploading = false,
  onUploadFiles,
  isImageUrl,
  onOpenImage,
  onRemove,
}: WorkhubAttachmentCardProps) {
  return (
    <div className="workhub-detail-card">
      <h3>{title}</h3>
      {!readOnly && (
        <div className="workhub-checklist-url-row compact-row">
          <input
            type="url"
            value={draftValue}
            onChange={(event) => onDraftChange(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                onAddUrl()
              }
            }}
            placeholder="Attachment URL"
          />
          <button type="button" onClick={onAddUrl}>➕ Add URL</button>
          <label className="workhub-file-upload-btn">
            <input
              type="file"
              multiple
              disabled={uploading}
              onChange={(event) => {
                const files = Array.from(event.target.files || [])
                if (files.length === 0) return
                onUploadFiles(files)
                event.target.value = ''
              }}
            />
            {uploading ? 'Uploading...' : 'Upload'}
          </label>
        </div>
      )}
      {attachments.length > 0 && (
        <div className="workhub-checklist-url-list view-list">
          {attachments.map((url) => (
            <div key={url} className="workhub-checklist-url-item workhub-task-image-item">
              {isImageUrl(url) ? (
                <button type="button" className="workhub-attachment-preview-btn" onClick={() => onOpenImage(url)}>
                  <img src={url} alt="Attachment" className="workhub-task-image-thumb" loading="lazy" />
                  <span>{url}</span>
                </button>
              ) : isVideoAttachmentUrl(url) ? (
                <WorkhubInlineVideoPlayer url={url} title="Document video" />
              ) : (
                <a href={url} target="_blank" rel="noreferrer" className="workhub-task-image-link">
                  <span className="workhub-task-attachment-icon">📎</span>
                  <span>{url}</span>
                </a>
              )}
              {!readOnly && (
                <button type="button" onClick={() => onRemove(url)}>✕</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
