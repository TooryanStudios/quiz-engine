import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Upload, Library, X, Check, Trash2, Loader2, Image as ImageIcon, Film } from 'lucide-react'
import { onAuthStateChanged } from 'firebase/auth'
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage'
import { useToorGenAssetsLibrary } from '../../../hooks/useToorGenAssetsLibrary'
import { auth, storage } from '../../../lib/firebase'
import type { MediaLibraryItem, MediaLibraryItemType } from './types'

type UploadingFile = {
  id: string
  name: string
  progress: number
  done: boolean
  error?: string
}

type Props = {
  accept: MediaLibraryItemType
  multiSelect?: boolean
  onConfirm: (items: MediaLibraryItem[]) => void
  onClose: () => void
}

const STUDIO_ACTIVE_PROJECT_ID_KEY = 'studio:activeProjectId'

function generateId() {
  return `upid-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function WorkflowMediaPickerDialog({ accept, multiSelect = true, onConfirm, onClose }: Props) {
  const [authUid, setAuthUid] = useState<string>(auth.currentUser?.uid || '')
  const [studioProjectId, setStudioProjectId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    return window.localStorage.getItem(STUDIO_ACTIVE_PROJECT_ID_KEY)
  })

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthUid(user?.uid || '')
    })
    return () => unsub()
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleStorage = (event: StorageEvent) => {
      if (event.key === STUDIO_ACTIVE_PROJECT_ID_KEY) {
        setStudioProjectId(event.newValue)
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [])

  const uploadFile = useCallback(async (file: File, kind: 'image' | 'video' | 'audio') => {
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-')
    const objectPath = `toorgen-lab/${kind}/${Date.now()}-${safeName}`
    const reference = storageRef(storage, objectPath)
    await uploadBytes(reference, file)
    return getDownloadURL(reference)
  }, [])

  const {
    combinedReferenceLibraryItems,
    visibleReferenceLibraryItems,
    hasMoreLibraryItems,
    remainingReferenceLibraryItemsCount,
    selectedReferenceLibraryUrls,
    isReferenceLibraryUploading,
    uploadReferenceLibraryFiles,
    removeMediaLibraryItem,
    toggleReferenceLibrarySelection,
    prepareReferenceLibrarySession,
    resetReferenceLibrarySession,
    loadMoreReferenceLibraryItems,
  } = useToorGenAssetsLibrary({
    authUid,
    studioProjectId,
    uploadFile,
  })

  // Initialize one picker session per dialog open/type. Avoid depending on callback
  // identities from useToorGenAssetsLibrary to prevent effect thrash/reset loops.
  useEffect(() => {
    prepareReferenceLibrarySession({ selectedUrls: [], filter: accept })
    return () => {
      resetReferenceLibrarySession()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accept, authUid, studioProjectId])

  const items = useMemo(() => (
    visibleReferenceLibraryItems.filter((item) => item.kind === accept)
  ), [accept, visibleReferenceLibraryItems])

  const selectedSet = useMemo(() => new Set(selectedReferenceLibraryUrls), [selectedReferenceLibraryUrls])
  const isLoading = isReferenceLibraryUploading
  const [tab, setTab] = useState<'library' | 'upload'>('library')
  const [uploading, setUploading] = useState<UploadingFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [pendingLibraryDeleteId, setPendingLibraryDeleteId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const toggleSelect = useCallback((itemUrl: string) => {
    if (!multiSelect && !selectedSet.has(itemUrl)) {
      selectedReferenceLibraryUrls
        .filter((url) => url !== itemUrl)
        .forEach((url) => toggleReferenceLibrarySelection(url))
    }
    toggleReferenceLibrarySelection(itemUrl)
  }, [multiSelect, selectedReferenceLibraryUrls, selectedSet, toggleReferenceLibrarySelection])

  const handleConfirm = useCallback(() => {
    const selectedItems = combinedReferenceLibraryItems
      .filter((item) => selectedSet.has(item.url) && item.kind === accept)
      .map((item) => ({
        id: item.id,
        url: item.url,
        name: item.name,
        type: item.kind === 'video' ? 'video' : 'image',
        kind: item.kind,
        createdAt: item.createdAt,
      } satisfies MediaLibraryItem))
    const allItems = selectedItems
    onConfirm(allItems)
  }, [accept, combinedReferenceLibraryItems, onConfirm, selectedSet])

  const handleDeleteLibraryItem = useCallback(async (item: typeof items[number]) => {
    if (pendingLibraryDeleteId !== item.id) {
      setPendingLibraryDeleteId(item.id)
      return
    }
    await removeMediaLibraryItem(item)
    setPendingLibraryDeleteId(null)
  }, [pendingLibraryDeleteId, removeMediaLibraryItem, items])

  const processFiles = useCallback(async (files: FileList | File[]) => {
    const fileArr = Array.from(files)
    const acceptedFiles = fileArr.filter((f) => {
      if (accept === 'image') return f.type.startsWith('image/')
      if (accept === 'video') return f.type.startsWith('video/')
      return true
    })
    if (!acceptedFiles.length) return

    const entries: UploadingFile[] = acceptedFiles.map((f) => ({
      id: generateId(),
      name: f.name,
      progress: 0,
      done: false,
    }))
    setUploading((prev) => [...prev, ...entries])

    try {
      // Keep UI responsive with a single batched upload call used by the Lab flow.
      setUploading((prev) => prev.map((u) => ({ ...u, progress: 35 })))
      const dt = new DataTransfer()
      acceptedFiles.forEach((file) => dt.items.add(file))
      await uploadReferenceLibraryFiles(dt.files)
      setUploading((prev) => prev.map((u) => ({ ...u, progress: 100, done: true })))
      setTab('library')
    } catch (err) {
      setUploading((prev) =>
        prev.map((u) => ({
          ...u,
          done: true,
          error: err instanceof Error ? err.message : 'Upload failed',
        })),
      )
    }
  }, [accept, uploadReferenceLibraryFiles])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.length) {
      void processFiles(e.target.files)
      e.target.value = ''
    }
  }, [processFiles])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files?.length) {
      void processFiles(e.dataTransfer.files)
    }
  }, [processFiles])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => setIsDragging(false), [])

  const acceptAttr = accept === 'image' ? 'image/*' : accept === 'video' ? 'video/*' : 'image/*,video/*'
  const typeLabel = accept === 'image' ? 'images' : accept === 'video' ? 'videos' : 'media'
  const TypeIcon = accept === 'video' ? Film : ImageIcon

  const dialog = (
    <div
      className="wfml-overlay"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="wfml-dialog">
        {/* Header */}
        <div className="wfml-header">
          <div className="wfml-header-title">
            <TypeIcon size={16} />
            <span>Select {typeLabel}</span>
          </div>
          <button type="button" className="wfml-close-btn" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="wfml-tabs">
          <button
            type="button"
            className={`wfml-tab${tab === 'library' ? ' wfml-tab--active' : ''}`}
            onClick={() => setTab('library')}
          >
            <Library size={13} />
            Library
          </button>
          <button
            type="button"
            className={`wfml-tab${tab === 'upload' ? ' wfml-tab--active' : ''}`}
            onClick={() => setTab('upload')}
          >
            <Upload size={13} />
            Upload
          </button>
        </div>

        {/* Content */}
        <div className="wfml-body">
          {tab === 'library' && (
            <>
              {isLoading ? (
                <div className="wfml-empty">
                  <Loader2 size={22} className="wfml-spinner" />
                  <span>Loading library…</span>
                </div>
              ) : items.length === 0 ? (
                <div className="wfml-empty">
                  <TypeIcon size={28} />
                  <span>No {typeLabel} in library yet</span>
                  <button
                    type="button"
                    className="wfml-upload-link"
                    onClick={() => setTab('upload')}
                  >
                    Upload some {typeLabel}
                  </button>
                </div>
              ) : (
                <div className="wfml-grid">
                  {items.map((item) => {
                    const isSelected = selectedSet.has(item.url)
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className={`wfml-grid-cell${isSelected ? ' wfml-grid-cell--selected' : ''}`}
                        onClick={() => toggleSelect(item.url)}
                        title={item.name}
                      >
                        <div className="wfml-grid-thumb">
                          {item.kind === 'video' ? (
                            <video src={item.url} preload="metadata" muted />
                          ) : (
                            <img src={item.url} alt={item.name} loading="lazy" />
                          )}
                          {isSelected && (
                            <div className="wfml-grid-check">
                              <Check size={12} />
                            </div>
                          )}
                        </div>
                        <div className="wfml-grid-label">
                          <span className="wfml-grid-name">{item.name}</span>
                          <span className="wfml-grid-size">{formatBytes((item as { size?: number }).size || 0)}</span>
                        </div>
                        <button
                          type="button"
                          className={`wfml-grid-delete${pendingLibraryDeleteId === item.id ? ' wfml-grid-delete--confirm' : ''}`}
                          title={pendingLibraryDeleteId === item.id ? 'Click again to confirm delete' : 'Remove from library'}
                          onClick={(e) => {
                            e.stopPropagation()
                            void handleDeleteLibraryItem(item)
                          }}
                        >
                          <Trash2 size={10} />
                        </button>
                      </button>
                    )
                  })}
                </div>
              )}
              {pendingLibraryDeleteId ? (
                <div className="wfml-inline-confirm">Click delete again on the same item to confirm removal.</div>
              ) : null}
              {hasMoreLibraryItems && (
                <button
                  type="button"
                  className="wfml-upload-link"
                  onClick={() => loadMoreReferenceLibraryItems()}
                >
                  Load more ({remainingReferenceLibraryItemsCount} remaining)
                </button>
              )}
            </>
          )}

          {tab === 'upload' && (
            <div className="wfml-upload-area">
              <input
                ref={fileInputRef}
                type="file"
                accept={acceptAttr}
                multiple={multiSelect}
                style={{ display: 'none' }}
                onChange={handleFileInput}
              />
              <div
                className={`wfml-dropzone${isDragging ? ' wfml-dropzone--dragging' : ''}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <Upload size={28} />
                <p>Drag & drop {typeLabel} here</p>
                <button
                  type="button"
                  className="wfml-browse-btn"
                  onClick={() => fileInputRef.current?.click()}
                >
                  Browse files
                </button>
              </div>

              {uploading.length > 0 && (
                <div className="wfml-upload-list">
                  {uploading.map((u) => (
                    <div key={u.id} className="wfml-upload-row">
                      <span className="wfml-upload-name">{u.name}</span>
                      {u.error ? (
                        <span className="wfml-upload-error">{u.error}</span>
                      ) : u.done ? (
                        <span className="wfml-upload-done"><Check size={12} /> Uploaded</span>
                      ) : (
                        <div className="wfml-upload-progress">
                          <div
                            className="wfml-upload-bar"
                            style={{ width: `${u.progress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="wfml-footer">
          <span className="wfml-selection-count">
            {selectedReferenceLibraryUrls.length > 0 ? `${selectedReferenceLibraryUrls.length} selected` : `Select ${typeLabel} to add`}
          </span>
          <div className="wfml-footer-actions">
            <button type="button" className="wfml-btn wfml-btn--secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="wfml-btn wfml-btn--primary"
              disabled={selectedReferenceLibraryUrls.length === 0}
              onClick={handleConfirm}
            >
              Add {selectedReferenceLibraryUrls.length > 0 ? `(${selectedReferenceLibraryUrls.length})` : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(dialog, document.body)
}
