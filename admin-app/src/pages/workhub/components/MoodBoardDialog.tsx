import { useEffect, useMemo, useRef, useState } from 'react'
import { ImageCropDialog } from '../../../components/ImageCropDialog'
import { useImageCropWorkflow } from '../../../hooks/useImageCropWorkflow'
import {
  addWorkhubMoodBoardImage,
  deleteWorkhubMoodBoard,
  removeWorkhubMoodBoardImage,
  updateWorkhubMoodBoardChecklist,
  updateWorkhubMoodBoardImages,
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

type MoodBoardImageLayoutMode = 'compact' | 'large'

type CanvasImage = WorkhubMoodBoardImage & {
  id: string
  x: number
  y: number
  width: number
  height: number
  z: number
}

type BoxSelectionRect = {
  startX: number
  startY: number
  currentX: number
  currentY: number
}

type MoveInteraction = {
  kind: 'move'
  startX: number
  startY: number
  itemIds: string[]
  origins: Record<string, { x: number; y: number }>
}

type ResizeInteraction = {
  kind: 'resize'
  startX: number
  startY: number
  itemId: string
  origin: { x: number; y: number; width: number; height: number }
}

type MarqueeInteraction = {
  kind: 'marquee'
}

type PanInteraction = {
  kind: 'pan'
  startClientX: number
  startClientY: number
  startScrollLeft: number
  startScrollTop: number
}

type CanvasInteraction = MoveInteraction | ResizeInteraction | MarqueeInteraction | PanInteraction

const LARGE_DEFAULT_SIZE = { width: 340, height: 240 }
const LARGE_MIN_SIZE = { width: 220, height: 160 }

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function stableHash(text: string): string {
  let hash = 0
  for (let i = 0; i < text.length; i += 1) {
    hash = (hash * 31 + text.charCodeAt(i)) | 0
  }
  return Math.abs(hash).toString(36)
}

function fallbackMoodBoardImageId(image: WorkhubMoodBoardImage, index: number): string {
  if (image.id && image.id.trim()) return image.id
  const seed = `${image.url}|${image.caption}|${image.addedBy}|${String(image.addedAt ?? '')}`
  return `legacy-${stableHash(seed)}-${index}`
}

function createMoodBoardImageId(file: File): string {
  const seed = `${file.name}|${file.size}|${file.type}|${Date.now()}|${Math.random().toString(36).slice(2, 9)}`
  return `img-${stableHash(seed)}`
}

function createMoodBoardRemoteImageId(url: string): string {
  const seed = `${url}|${Date.now()}|${Math.random().toString(36).slice(2, 9)}`
  return `img-${stableHash(seed)}`
}

function normalizeImageUrlInput(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    return parsed.toString()
  } catch {
    return null
  }
}

function deriveImageCaptionFromUrl(url: string): string {
  try {
    const parsed = new URL(url)
    const lastSegment = parsed.pathname.split('/').filter(Boolean).pop()
    if (lastSegment) return decodeURIComponent(lastSegment)
    return parsed.hostname
  } catch {
    return 'Remote image'
  }
}

function firstValidImageUrl(candidates: string[]): string | null {
  for (const candidate of candidates) {
    const normalized = normalizeImageUrlInput(candidate)
    if (normalized) return normalized
  }
  return null
}

function extractImageUrlFromHtml(html: string): string | null {
  if (!html) return null
  const imageSrcMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i)
  if (imageSrcMatch?.[1]) {
    return normalizeImageUrlInput(imageSrcMatch[1])
  }
  const anchorHrefMatch = html.match(/<a[^>]+href=["']([^"']+)["']/i)
  if (anchorHrefMatch?.[1]) {
    return normalizeImageUrlInput(anchorHrefMatch[1])
  }
  return null
}

function defaultCanvasSize(_layout: MoodBoardImageLayoutMode) {
  return LARGE_DEFAULT_SIZE
}

function minCanvasSize(_layout: MoodBoardImageLayoutMode) {
  return LARGE_MIN_SIZE
}

function normalizeBoardImages(images: WorkhubMoodBoardImage[], layout: MoodBoardImageLayoutMode): CanvasImage[] {
  const defaults = defaultCanvasSize(layout)
  const gap = 28
  const perRow = 3
  return images.map((img, index) => {
    const row = Math.floor(index / perRow)
    const col = index % perRow
    return {
      ...img,
      id: fallbackMoodBoardImageId(img, index),
      x: typeof img.x === 'number' ? img.x : 18 + col * (defaults.width + gap),
      y: typeof img.y === 'number' ? img.y : 18 + row * (defaults.height + gap),
      width: typeof img.width === 'number' ? img.width : defaults.width,
      height: typeof img.height === 'number' ? img.height : defaults.height,
      z: typeof img.z === 'number' ? img.z : index + 1,
    }
  })
}

function serializeImages(images: WorkhubMoodBoardImage[]): string {
  return JSON.stringify(images.map((img) => ({
    id: img.id ?? null,
    url: img.url,
    caption: img.caption,
    addedBy: img.addedBy,
    addedAt: img.addedAt ?? null,
    x: typeof img.x === 'number' ? img.x : null,
    y: typeof img.y === 'number' ? img.y : null,
    width: typeof img.width === 'number' ? img.width : null,
    height: typeof img.height === 'number' ? img.height : null,
    z: typeof img.z === 'number' ? img.z : null,
  })))
}

function rectFromPoints(startX: number, startY: number, endX: number, endY: number) {
  return {
    left: Math.min(startX, endX),
    top: Math.min(startY, endY),
    right: Math.max(startX, endX),
    bottom: Math.max(startY, endY),
  }
}

function rectsIntersect(a: { left: number; top: number; right: number; bottom: number }, b: { left: number; top: number; right: number; bottom: number }) {
  return a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top
}

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
  onOpenAttachmentLightbox: (url: string) => void
  getAttachmentReviewCount: (url: string) => number
  // Discussion
  discussionComments: WorkhubTaskComment[]
  onDiscussionSend: (text: string) => Promise<void>
  discussionBusy: boolean
  discussionNotifyMode?: 'all' | 'selected' | 'none'
  discussionNotifyUids?: string[]
  discussionNotifyCandidates?: Array<{ uid: string; label: string }>
  onDiscussionNotifyModeChange?: (mode: 'all' | 'selected' | 'none') => void
  onDiscussionNotifyUidsChange?: (uids: string[]) => void
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
  onOpenAttachmentLightbox,
  getAttachmentReviewCount,
  discussionComments,
  onDiscussionSend,
  discussionBusy,
  discussionNotifyMode,
  discussionNotifyUids,
  discussionNotifyCandidates,
  onDiscussionNotifyModeChange,
  onDiscussionNotifyUidsChange,
  discussionEditingId,
  discussionEditingText,
  onDiscussionEditStart,
  onDiscussionEditChange,
  onDiscussionEditCancel,
  onDiscussionEditSave,
  discussionEditBusyKey,
}: MoodBoardPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const moodBoardBodyRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const dropDragDepthRef = useRef(0)
  const interactionRef = useRef<CanvasInteraction | null>(null)
  const selectedIdsRef = useRef<string[]>([])
  const marqueeBaseSelectionRef = useRef<string[]>([])
  const persistTimerRef = useRef<number | null>(null)
  const titlePersistTimerRef = useRef<number | null>(null)
  const titleSavedIndicatorTimerRef = useRef<number | null>(null)
  const titleDraftRef = useRef('')
  const titleSavedValueRef = useRef((board?.title ?? '').trim())
  const [imageLayout, setImageLayout] = useState<MoodBoardImageLayoutMode>(() => {
    if (typeof window === 'undefined') return 'compact'
    const saved = window.localStorage.getItem('workhub:moodboard:imageLayout')
    if (saved === 'large' || saved === 'xlarge') return 'large'
    return 'compact'
  })
  const [showGridBackground, setShowGridBackground] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem('workhub:moodboard:gridBackground') === '1'
  })
  const [canvasImages, setCanvasImages] = useState<CanvasImage[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null)
  const [selectedImageCaptionDraft, setSelectedImageCaptionDraft] = useState('')
  const [selectedImageCaptionSaving, setSelectedImageCaptionSaving] = useState(false)
  const [imageBgMap, setImageBgMap] = useState<Record<string, boolean>>(() => {
    if (typeof window === 'undefined' || !board?.id) return {}
    try {
      const key = `workhub:moodboard:image-bg:${board.id}`
      const saved = window.localStorage.getItem(key)
      if (!saved) return {}
      const parsed = JSON.parse(saved)
      if (!parsed || typeof parsed !== 'object') return {}
      return parsed as Record<string, boolean>
    } catch {
      return {}
    }
  })
  const [marqueeRect, setMarqueeRect] = useState<BoxSelectionRect | null>(null)
  const [dragging, setDragging] = useState(false)
  const [isMiddleMousePanning, setIsMiddleMousePanning] = useState(false)
  const [isDropTargetActive, setIsDropTargetActive] = useState(false)
  const [titleDraft, setTitleDraft] = useState(board?.title ?? '')
  const [titleSaving, setTitleSaving] = useState(false)
  const [titleSaveError, setTitleSaveError] = useState<string | null>(null)
  const [showTitleSavedIndicator, setShowTitleSavedIndicator] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [urlDraft, setUrlDraft] = useState('')
  const [addingUrl, setAddingUrl] = useState(false)
  const [urlDialogOpen, setUrlDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shareOpen, setShareOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [selectedImageUrlDraft, setSelectedImageUrlDraft] = useState('')
  const [selectedImageUrlSaving, setSelectedImageUrlSaving] = useState(false)
  const moodBoardScrollStorageKey = board?.id ? `workhub:moodboard:scroll:${board.id}:${imageLayout}` : ''

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('workhub:moodboard:imageLayout', imageLayout)
  }, [imageLayout])

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('workhub:moodboard:gridBackground', showGridBackground ? '1' : '0')
  }, [showGridBackground])

  useEffect(() => {
    selectedIdsRef.current = selectedIds
  }, [selectedIds])

  useEffect(() => {
    titleDraftRef.current = titleDraft
  }, [titleDraft])

  useEffect(() => {
    titleSavedValueRef.current = (board?.title ?? '').trim()
    setTitleDraft(board?.title ?? '')
    setTitleSaveError(null)
    setTitleSaving(false)
    setShowTitleSavedIndicator(false)
    if (titlePersistTimerRef.current) {
      window.clearTimeout(titlePersistTimerRef.current)
      titlePersistTimerRef.current = null
    }
    if (titleSavedIndicatorTimerRef.current) {
      window.clearTimeout(titleSavedIndicatorTimerRef.current)
      titleSavedIndicatorTimerRef.current = null
    }
  }, [board?.id])

  useEffect(() => {
    const normalized = normalizeBoardImages(board?.images ?? [], imageLayout)
    setCanvasImages(normalized)
  }, [board?.id, board?.images, imageLayout])

  useEffect(() => {
    if (!canvasImages.length) {
      setSelectedIds([])
      setSelectedImageId(null)
      return
    }
    const available = new Set(canvasImages.map((image) => image.id))
    setSelectedIds((prev) => prev.filter((id) => available.has(id)))
    setSelectedImageId((prev) => {
      if (prev && available.has(prev)) return prev
      return null
    })
  }, [canvasImages])

  useEffect(() => {
    if (!board || !canEdit) return
    if (persistTimerRef.current) {
      window.clearTimeout(persistTimerRef.current)
      persistTimerRef.current = null
    }

    const nextImages: WorkhubMoodBoardImage[] = canvasImages.map((image) => ({
      id: image.id,
      url: image.url,
      caption: image.caption,
      addedBy: image.addedBy,
      addedAt: image.addedAt,
      x: Math.round(image.x),
      y: Math.round(image.y),
      width: Math.round(image.width),
      height: Math.round(image.height),
      z: Math.round(image.z),
    }))

    if (serializeImages(nextImages) === serializeImages(board.images ?? [])) return

    persistTimerRef.current = window.setTimeout(() => {
      void updateWorkhubMoodBoardImages(board.id, nextImages).catch((err) => {
        setError(String(err))
      })
    }, 220)

    return () => {
      if (persistTimerRef.current) {
        window.clearTimeout(persistTimerRef.current)
        persistTimerRef.current = null
      }
    }
  }, [board, canEdit, canvasImages])

  useEffect(() => {
    const bodyEl = moodBoardBodyRef.current
    if (!bodyEl || !moodBoardScrollStorageKey || typeof window === 'undefined') return

    const persistScrollPosition = () => {
      try {
        window.localStorage.setItem(moodBoardScrollStorageKey, JSON.stringify({
          left: bodyEl.scrollLeft,
          top: bodyEl.scrollTop,
        }))
      } catch {
        // Ignore storage write errors.
      }
    }

    bodyEl.addEventListener('scroll', persistScrollPosition, { passive: true })
    return () => {
      bodyEl.removeEventListener('scroll', persistScrollPosition)
    }
  }, [moodBoardScrollStorageKey])

  useEffect(() => {
    const bodyEl = moodBoardBodyRef.current
    if (!bodyEl || !moodBoardScrollStorageKey || typeof window === 'undefined') return

    function applyScrollRestore() {
      try {
        const saved = window.localStorage.getItem(moodBoardScrollStorageKey)
        if (!saved) {
          bodyEl!.scrollLeft = 0
          bodyEl!.scrollTop = 0
          return
        }
        const parsed = JSON.parse(saved) as { left?: unknown; top?: unknown }
        const targetLeft = typeof parsed.left === 'number' ? parsed.left : 0
        const targetTop = typeof parsed.top === 'number' ? parsed.top : 0
        bodyEl!.scrollLeft = targetLeft
        bodyEl!.scrollTop = targetTop
      } catch {
        bodyEl!.scrollLeft = 0
        bodyEl!.scrollTop = 0
      }
    }

    // Double rAF ensures the browser has committed layout (canvas height applied)
    // before we attempt to restore scroll position. Timeout fallback handles
    // cases where image content loads slightly after the initial paint.
    let frameId = 0
    let timerId = 0
    frameId = window.requestAnimationFrame(() => {
      frameId = window.requestAnimationFrame(() => {
        applyScrollRestore()
        // Re-apply after 200ms in case canvas is still sizing itself
        timerId = window.setTimeout(applyScrollRestore, 200)
      })
    })

    return () => {
      if (frameId) window.cancelAnimationFrame(frameId)
      if (timerId) window.clearTimeout(timerId)
    }
  }, [moodBoardScrollStorageKey, board?.images.length, imageLayout])

  const isCanvasMode = imageLayout === 'large'

  const sortedCanvasImages = useMemo(() => {
    return [...canvasImages].sort((a, b) => a.z - b.z)
  }, [canvasImages])

  const selectedCanvasImage = useMemo(() => {
    if (!canvasImages.length) return null
    if (!selectedImageId) return null
    return canvasImages.find((img) => img.id === selectedImageId) ?? null
  }, [canvasImages, selectedImageId])

  const imageBgStorageKey = board?.id ? `workhub:moodboard:image-bg:${board.id}` : ''

  function saveBgMap(nextMap: Record<string, boolean>) {
    if (!imageBgStorageKey) return
    try {
      window.localStorage.setItem(imageBgStorageKey, JSON.stringify(nextMap))
    } catch {
      // Ignore storage write errors.
    }
  }

  const cropWorkflow = useImageCropWorkflow({
    onApplyCrop: async ({ blob, imageId, imageUrl }) => {
      if (!board) return
      const ext = blob.type === 'image/png' ? 'png' : 'jpg'
      const file = new File([blob], `cropped.${ext}`, { type: blob.type })
      const newUrl = await onUploadImage(board.id, file)
      const nextImages = board.images.map((img, i) => {
        if (fallbackMoodBoardImageId(img, i) !== imageId) return img
        return { ...img, url: newUrl }
      })
      await updateWorkhubMoodBoardImages(board.id, nextImages)

      setImageBgMap((prev) => {
        if (!(imageUrl in prev)) return prev
        const next = { ...prev, [newUrl]: prev[imageUrl] }
        delete next[imageUrl]
        saveBgMap(next)
        return next
      })
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : String(err))
    },
  })

  useEffect(() => {
    setSelectedImageCaptionDraft(selectedCanvasImage?.caption || '')
  }, [selectedCanvasImage?.id, selectedCanvasImage?.caption])

  useEffect(() => {
    setSelectedImageUrlDraft(selectedCanvasImage?.url || '')
  }, [selectedCanvasImage?.id, selectedCanvasImage?.url])

  // When the user switches to a different board, reload from localStorage.
  useEffect(() => {
    if (typeof window === 'undefined' || !imageBgStorageKey) {
      setImageBgMap({})
      return
    }
    try {
      const saved = window.localStorage.getItem(imageBgStorageKey)
      if (!saved) { setImageBgMap({}); return }
      const parsed = JSON.parse(saved)
      if (!parsed || typeof parsed !== 'object') { setImageBgMap({}); return }
      setImageBgMap(parsed as Record<string, boolean>)
    } catch {
      setImageBgMap({})
    }
  // Only re-run when the board ID changes, not on every images update.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageBgStorageKey])

  useEffect(() => {
    if (!selectedImageId || !canEdit) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== 'Delete' && event.key !== 'Backspace') return
      const active = document.activeElement as HTMLElement | null
      if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) return
      event.preventDefault()
      const imageIndex = canvasImages.findIndex((img) => img.id === selectedImageId)
      if (imageIndex === -1) return
      if (!window.confirm('Delete this image from the mood board?')) return
      void handleRemoveImage(imageIndex, selectedImageId ?? undefined)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => { window.removeEventListener('keydown', handleKeyDown) }
  }, [selectedImageId, canEdit, canvasImages])

  const canvasHeight = useMemo(() => {
    const minHeight = 680
    const bottom = canvasImages.reduce((max, image) => Math.max(max, image.y + image.height), 0)
    return Math.max(minHeight, bottom + 40)
  }, [canvasImages, imageLayout])

  function pointToCanvas(clientX: number, clientY: number): { x: number; y: number } | null {
    if (!canvasRef.current) return null
    const rect = canvasRef.current.getBoundingClientRect()
    return {
      x: clientX - rect.left + canvasRef.current.scrollLeft,
      y: clientY - rect.top + canvasRef.current.scrollTop,
    }
  }

  function bringImagesToFront(targetIds: string[]) {
    if (!targetIds.length) return
    setCanvasImages((prev) => {
      const baseMaxZ = prev.reduce((max, image) => Math.max(max, image.z), 0)
      let step = 1
      const idSet = new Set(targetIds)
      return prev.map((image) => (
        idSet.has(image.id)
          ? { ...image, z: baseMaxZ + step++ }
          : image
      ))
    })
  }

  function updateSelectionFromMarquee(nextRect: BoxSelectionRect, additive: boolean) {
    const selectRect = rectFromPoints(nextRect.startX, nextRect.startY, nextRect.currentX, nextRect.currentY)
    const hitIds = canvasImages
      .filter((image) => rectsIntersect(selectRect, {
        left: image.x,
        top: image.y,
        right: image.x + image.width,
        bottom: image.y + image.height,
      }))
      .map((image) => image.id)
    if (additive) {
      const merged = new Set(marqueeBaseSelectionRef.current)
      hitIds.forEach((id) => merged.add(id))
      setSelectedIds(Array.from(merged))
      if (hitIds.length > 0) setSelectedImageId(hitIds[hitIds.length - 1])
      return
    }
    setSelectedIds(hitIds)
    setSelectedImageId(hitIds.length > 0 ? hitIds[hitIds.length - 1] : null)
  }

  useEffect(() => {
    if (!dragging) return
    function handlePointerMove(event: PointerEvent) {
      const interaction = interactionRef.current
      if (!interaction) return

      if (interaction.kind === 'pan') {
        const bodyEl = moodBoardBodyRef.current
        if (!bodyEl) return
        bodyEl.scrollLeft = interaction.startScrollLeft - (event.clientX - interaction.startClientX)
        bodyEl.scrollTop = interaction.startScrollTop - (event.clientY - interaction.startClientY)
        return
      }

      const point = pointToCanvas(event.clientX, event.clientY)
      if (!point) return

      if (interaction.kind === 'move') {
        const dx = point.x - interaction.startX
        const dy = point.y - interaction.startY
        setCanvasImages((prev) => {
          const canvasWidth = canvasRef.current?.clientWidth ?? 0
          const itemIdSet = new Set(interaction.itemIds)
          return prev.map((image) => {
            if (!itemIdSet.has(image.id)) return image
            const origin = interaction.origins[image.id]
            if (!origin) return image
            const maxX = Math.max(0, canvasWidth - image.width)
            const maxY = Math.max(0, canvasHeight - image.height)
            return {
              ...image,
              x: clamp(origin.x + dx, 0, maxX),
              y: clamp(origin.y + dy, 0, maxY),
            }
          })
        })
        return
      }

      if (interaction.kind === 'resize') {
        const dx = point.x - interaction.startX
        const dy = point.y - interaction.startY
        const minSize = minCanvasSize(imageLayout)
        setCanvasImages((prev) => {
          const canvasWidth = canvasRef.current?.clientWidth ?? 0
          return prev.map((image) => {
            if (image.id !== interaction.itemId) return image
            const maxWidth = Math.max(minSize.width, canvasWidth - interaction.origin.x)
            const maxHeight = Math.max(minSize.height, canvasHeight - interaction.origin.y)
            return {
              ...image,
              width: clamp(interaction.origin.width + dx, minSize.width, maxWidth),
              height: clamp(interaction.origin.height + dy, minSize.height, maxHeight),
            }
          })
        })
        return
      }

      if (interaction.kind === 'marquee' && marqueeRect) {
        const nextRect: BoxSelectionRect = {
          ...marqueeRect,
          currentX: point.x,
          currentY: point.y,
        }
        setMarqueeRect(nextRect)
        updateSelectionFromMarquee(nextRect, event.shiftKey)
      }
    }

    function handlePointerUp() {
      interactionRef.current = null
      setDragging(false)
      setIsMiddleMousePanning(false)
      setMarqueeRect(null)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [dragging, marqueeRect, canvasHeight, imageLayout, canvasImages])

  function handleMiddleMousePanStart(event: React.PointerEvent<HTMLElement>) {
    if (event.button !== 1) return false
    const bodyEl = moodBoardBodyRef.current
    if (!bodyEl) return false
    interactionRef.current = {
      kind: 'pan',
      startClientX: event.clientX,
      startClientY: event.clientY,
      startScrollLeft: bodyEl.scrollLeft,
      startScrollTop: bodyEl.scrollTop,
    }
    setDragging(true)
    setIsMiddleMousePanning(true)
    event.preventDefault()
    return true
  }

  const displayTitle = titleDraft
  const normalizedTitleDraft = titleDraft.trim()
  const titleChanged = normalizedTitleDraft !== titleSavedValueRef.current
  const titleCanSave = !!board && !!normalizedTitleDraft && titleChanged
  const isTransientSavedStatus = !titleSaveError && !titleSaving && !titleChanged && showTitleSavedIndicator
  const titleStatusText = titleSaveError
    ? 'Save failed'
    : titleSaving
      ? 'Saving...'
      : titleChanged
        ? 'Unsaved'
        : 'Saved'
  const showTitleStatus = !!titleSaveError || titleSaving || titleChanged || showTitleSavedIndicator

  function clearTitlePersistTimer() {
    if (titlePersistTimerRef.current) {
      window.clearTimeout(titlePersistTimerRef.current)
      titlePersistTimerRef.current = null
    }
  }

  function revertTitleDraft() {
    clearTitlePersistTimer()
    if (titleSavedIndicatorTimerRef.current) {
      window.clearTimeout(titleSavedIndicatorTimerRef.current)
      titleSavedIndicatorTimerRef.current = null
    }
    setShowTitleSavedIndicator(false)
    setTitleSaveError(null)
    setTitleDraft(board?.title ?? '')
  }

  async function handleSaveTitle(nextValue = titleDraftRef.current) {
    clearTitlePersistTimer()
    if (!board || !canEdit) return
    const trimmedTitle = nextValue.trim()
    if (!trimmedTitle) {
      revertTitleDraft()
      return
    }
    if (trimmedTitle === titleSavedValueRef.current) {
      if (titleDraftRef.current !== trimmedTitle) {
        setTitleDraft(trimmedTitle)
      }
      setTitleSaveError(null)
      return
    }
    setTitleSaving(true)
    setTitleSaveError(null)
    try {
      await updateWorkhubMoodBoardTitle(board.id, trimmedTitle)
      titleSavedValueRef.current = trimmedTitle
      setTitleDraft(trimmedTitle)
      setTitleSaveError(null)
      setShowTitleSavedIndicator(true)
      if (titleSavedIndicatorTimerRef.current) {
        window.clearTimeout(titleSavedIndicatorTimerRef.current)
      }
      titleSavedIndicatorTimerRef.current = window.setTimeout(() => {
        setShowTitleSavedIndicator(false)
        titleSavedIndicatorTimerRef.current = null
      }, 1400)
    } catch (err) {
      if (titleSavedIndicatorTimerRef.current) {
        window.clearTimeout(titleSavedIndicatorTimerRef.current)
        titleSavedIndicatorTimerRef.current = null
      }
      setShowTitleSavedIndicator(false)
      setTitleSaveError(err instanceof Error ? err.message : 'Autosave failed')
    } finally {
      setTitleSaving(false)
    }
  }

  useEffect(() => {
    if (!board || !canEdit || titleSaving) return
    clearTitlePersistTimer()
    if (!titleCanSave) return
    titlePersistTimerRef.current = window.setTimeout(() => {
      void handleSaveTitle(titleDraftRef.current)
    }, 520)
    return () => {
      clearTitlePersistTimer()
    }
  }, [board, canEdit, titleCanSave, titleSaving, normalizedTitleDraft])

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

  function hasFilesPayload(event: React.DragEvent<HTMLElement>): boolean {
    const types = Array.from(event.dataTransfer?.types ?? [])
    return types.includes('Files')
  }

  function resolveDraggedImageUrl(event: React.DragEvent<HTMLElement>): string | null {
    const uriList = event.dataTransfer.getData('text/uri-list')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
    const plainText = event.dataTransfer.getData('text/plain').trim()
    const html = event.dataTransfer.getData('text/html')
    return firstValidImageUrl([
      ...uriList,
      plainText,
      extractImageUrlFromHtml(html) || '',
    ])
  }

  function hasUrlPayload(event: React.DragEvent<HTMLElement>): boolean {
    return !!resolveDraggedImageUrl(event)
  }

  function hasSupportedDropPayload(event: React.DragEvent<HTMLElement>): boolean {
    return hasFilesPayload(event) || hasUrlPayload(event)
  }

  function isImageFile(file: File): boolean {
    if (file.type?.startsWith('image/')) return true
    return /\.(png|jpe?g|gif|webp|bmp|svg|avif|heic|heif)$/i.test(file.name)
  }

  async function uploadMoodBoardFiles(files: File[]) {
    const imageFiles = files.filter(isImageFile)
    if (!imageFiles.length) {
      setError('Only image files can be added to the mood board.')
      return
    }

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
      for (const file of imageFiles) {
        const url = await onUploadImage(boardId, file)
        const defaults = defaultCanvasSize(imageLayout)
        const index = latestImages.length
        const row = Math.floor(index / 3)
        const col = index % 3
        const newImage: WorkhubMoodBoardImage = {
          id: createMoodBoardImageId(file),
          url,
          caption: file.name,
          addedBy: currentUid,
          addedAt: new Date().toISOString(),
          x: 18 + col * (defaults.width + 28),
          y: 18 + row * (defaults.height + 28),
          width: defaults.width,
          height: defaults.height,
          z: index + 1,
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

  async function addMoodBoardImageFromUrl(rawUrl: string) {
    const normalizedUrl = normalizeImageUrlInput(rawUrl)
    if (!normalizedUrl) {
      setError('Enter a valid image URL starting with http:// or https://')
      return
    }

    setError(null)
    setAddingUrl(true)
    try {
      let boardId = board?.id ?? null
      if (!boardId) {
        const defaultTitle = 'Mood Board'
        boardId = await onCreateBoard(defaultTitle)
        if (!boardId) throw new Error('Could not create mood board')
      }

      const existingImages = board?.images ?? []
      const defaults = defaultCanvasSize(imageLayout)
      const index = existingImages.length
      const row = Math.floor(index / 3)
      const col = index % 3
      const newImageId = createMoodBoardRemoteImageId(normalizedUrl)
      const newImage: WorkhubMoodBoardImage = {
        id: newImageId,
        url: normalizedUrl,
        caption: deriveImageCaptionFromUrl(normalizedUrl),
        addedBy: currentUid,
        addedAt: new Date().toISOString(),
        x: 18 + col * (defaults.width + 28),
        y: 18 + row * (defaults.height + 28),
        width: defaults.width,
        height: defaults.height,
        z: index + 1,
      }
      await addWorkhubMoodBoardImage(boardId, existingImages, newImage)
      setSelectedIds([newImageId])
      setSelectedImageId(newImageId)
      setUrlDraft('')
      setUrlDialogOpen(false)
    } catch (err) {
      setError(String(err))
    } finally {
      setAddingUrl(false)
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    await uploadMoodBoardFiles(files)
  }

  function handleMoodBoardPaste(event: React.ClipboardEvent<HTMLDivElement>) {
    if (!canEdit) return
    const target = event.target as HTMLElement | null
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
    const text = event.clipboardData.getData('text/plain').trim()
    const normalizedUrl = normalizeImageUrlInput(text)
    if (!normalizedUrl) return
    event.preventDefault()
    void addMoodBoardImageFromUrl(normalizedUrl)
  }

  function handleGridDragEnter(event: React.DragEvent<HTMLDivElement>) {
    if (!canEdit || !hasSupportedDropPayload(event)) return
    event.preventDefault()
    dropDragDepthRef.current += 1
    setIsDropTargetActive(true)
  }

  function handleGridDragOver(event: React.DragEvent<HTMLDivElement>) {
    if (!canEdit || !hasSupportedDropPayload(event)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    if (!isDropTargetActive) setIsDropTargetActive(true)
  }

  function handleGridDragLeave(event: React.DragEvent<HTMLDivElement>) {
    if (!canEdit || !hasSupportedDropPayload(event)) return
    event.preventDefault()
    dropDragDepthRef.current = Math.max(0, dropDragDepthRef.current - 1)
    if (dropDragDepthRef.current === 0) {
      setIsDropTargetActive(false)
    }
  }

  function handleGridDrop(event: React.DragEvent<HTMLDivElement>) {
    if (!canEdit || !hasSupportedDropPayload(event)) return
    event.preventDefault()
    event.stopPropagation()
    dropDragDepthRef.current = 0
    setIsDropTargetActive(false)
    const files = Array.from(event.dataTransfer.files ?? [])
    if (files.length > 0) {
      void uploadMoodBoardFiles(files)
      return
    }
    const draggedUrl = resolveDraggedImageUrl(event)
    if (!draggedUrl) return
    void addMoodBoardImageFromUrl(draggedUrl)
  }

  async function handleRemoveImage(index: number, imageId?: string) {
    if (!board) return
    if (imageId) {
      const nextImages = board.images.filter((img, i) => fallbackMoodBoardImageId(img, i) !== imageId)
      await updateWorkhubMoodBoardImages(board.id, nextImages)
      if (selectedImageId === imageId) {
        const nextSelected = nextImages.length > 0
          ? fallbackMoodBoardImageId(nextImages[Math.max(0, index - 1)] || nextImages[0], Math.max(0, index - 1))
          : null
        setSelectedImageId(nextSelected)
      }
      return
    }
    await removeWorkhubMoodBoardImage(board.id, board.images, index)
  }

  async function handleSaveSelectedImageCaption() {
    if (!board || !selectedCanvasImage || !canEdit || selectedImageCaptionSaving) return
    const trimmed = selectedImageCaptionDraft.trim()
    if (!trimmed) return
    setSelectedImageCaptionSaving(true)
    try {
      const nextImages = board.images.map((img, i) => {
        const imageId = fallbackMoodBoardImageId(img, i)
        if (imageId !== selectedCanvasImage.id) return img
        return {
          ...img,
          id: img.id || selectedCanvasImage.id,
          caption: trimmed,
        }
      })
      await updateWorkhubMoodBoardImages(board.id, nextImages)
    } catch (err) {
      setError(String(err))
    } finally {
      setSelectedImageCaptionSaving(false)
    }
  }

  async function handleSaveSelectedImageUrl() {
    if (!board || !selectedCanvasImage || !canEdit || selectedImageUrlSaving) return
    const normalizedUrl = normalizeImageUrlInput(selectedImageUrlDraft)
    if (!normalizedUrl) {
      setError('Enter a valid image URL starting with http:// or https://')
      return
    }
    if (normalizedUrl === selectedCanvasImage.url) return
    setError(null)
    setSelectedImageUrlSaving(true)
    try {
      const nextImages = board.images.map((img, i) => {
        const imageId = fallbackMoodBoardImageId(img, i)
        if (imageId !== selectedCanvasImage.id) return img
        return {
          ...img,
          id: img.id || selectedCanvasImage.id,
          url: normalizedUrl,
        }
      })
      await updateWorkhubMoodBoardImages(board.id, nextImages)

      setImageBgMap((prev) => {
        if (!(selectedCanvasImage.url in prev)) return prev
        const next = { ...prev, [normalizedUrl]: prev[selectedCanvasImage.url] }
        delete next[selectedCanvasImage.url]
        saveBgMap(next)
        return next
      })
    } catch (err) {
      setError(String(err))
    } finally {
      setSelectedImageUrlSaving(false)
    }
  }

  function handleCanvasPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (handleMiddleMousePanStart(event)) return
    if (event.button !== 0) return
    if (event.target !== event.currentTarget) return

    setSelectedIds([])
    setSelectedImageId(null)

    if (!isCanvasMode || !canEdit) return

    const point = pointToCanvas(event.clientX, event.clientY)
    if (!point) return
    marqueeBaseSelectionRef.current = event.shiftKey ? selectedIdsRef.current : []
    if (!event.shiftKey) setSelectedIds([])
    const nextRect: BoxSelectionRect = {
      startX: point.x,
      startY: point.y,
      currentX: point.x,
      currentY: point.y,
    }
    setMarqueeRect(nextRect)
    interactionRef.current = { kind: 'marquee' }
    setDragging(true)
    event.preventDefault()
  }

  function handleCompactGridPointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (handleMiddleMousePanStart(event)) return
    if (event.button !== 0) return
    if (event.target !== event.currentTarget) return
    setSelectedIds([])
    setSelectedImageId(null)
  }

  function handleCanvasItemPointerDown(event: React.PointerEvent<HTMLDivElement>, imageId: string) {
    if (handleMiddleMousePanStart(event)) return
    if (!isCanvasMode || !canEdit) return
    if (event.button !== 0) return
    if ((event.target as HTMLElement).closest('.workhub-moodboard-image-remove, .workhub-moodboard-resize-handle')) return
    const point = pointToCanvas(event.clientX, event.clientY)
    if (!point) return

    const selectedSet = new Set(selectedIdsRef.current)
    if (event.shiftKey) {
      if (selectedSet.has(imageId)) selectedSet.delete(imageId)
      else selectedSet.add(imageId)
      setSelectedIds(Array.from(selectedSet))
      setSelectedImageId(imageId)
      return
    }

    const nextSelection = selectedSet.has(imageId) ? selectedIdsRef.current : [imageId]
    setSelectedIds(nextSelection)
    setSelectedImageId(imageId)

    bringImagesToFront(nextSelection)

    setCanvasImages((prev) => {
      const moved = new Set(nextSelection)
      const origins: Record<string, { x: number; y: number }> = {}
      prev.forEach((image) => {
        if (moved.has(image.id)) {
          origins[image.id] = { x: image.x, y: image.y }
        }
      })
      interactionRef.current = {
        kind: 'move',
        startX: point.x,
        startY: point.y,
        itemIds: nextSelection,
        origins,
      }
      return prev
    })
    setDragging(true)
    event.preventDefault()
  }

  function handleResizePointerDown(event: React.PointerEvent<HTMLButtonElement>, imageId: string) {
    if (handleMiddleMousePanStart(event)) return
    if (!isCanvasMode || !canEdit) return
    if (event.button !== 0) return
    const point = pointToCanvas(event.clientX, event.clientY)
    if (!point) return
    const image = canvasImages.find((item) => item.id === imageId)
    if (!image) return
    setSelectedIds([imageId])
    setSelectedImageId(imageId)
    bringImagesToFront([imageId])
    interactionRef.current = {
      kind: 'resize',
      startX: point.x,
      startY: point.y,
      itemId: imageId,
      origin: {
        x: image.x,
        y: image.y,
        width: image.width,
        height: image.height,
      },
    }
    setDragging(true)
    event.preventDefault()
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
                <>
                  <input
                    className="workhub-documents-title-input"
                    value={displayTitle}
                    placeholder="Mood board name…"
                    onChange={(e) => {
                      setTitleSaveError(null)
                      setShowTitleSavedIndicator(false)
                      setTitleDraft(e.target.value)
                    }}
                    onBlur={() => { void handleSaveTitle() }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        event.preventDefault()
                        void handleSaveTitle()
                        event.currentTarget.blur()
                      }
                      if (event.key === 'Escape') {
                        event.preventDefault()
                        revertTitleDraft()
                        event.currentTarget.blur()
                      }
                    }}
                  />
                  {showTitleStatus && (
                    <span
                      className={`workhub-note-autosave-status${titleSaveError ? ' is-error' : ''}${isTransientSavedStatus ? ' is-transient' : ''}`}
                      aria-live="polite"
                    >
                      {titleStatusText}
                    </span>
                  )}
                </>
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
            </div>
          </div>

          {canEdit && (
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="workhub-moodboard-hidden-file-input"
              onChange={(e) => { void handleFileChange(e) }}
            />
          )}

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

          {urlDialogOpen && canEdit && (
            <div className="workhub-moodboard-url-dialog-backdrop" onClick={() => setUrlDialogOpen(false)}>
              <div className="workhub-moodboard-url-dialog" onClick={(event) => event.stopPropagation()}>
                <div className="workhub-moodboard-url-dialog-head">
                  <strong>Add image URL</strong>
                  <button
                    type="button"
                    className="workhub-share-doc-close"
                    onClick={() => setUrlDialogOpen(false)}
                    aria-label="Close add URL dialog"
                  >✕</button>
                </div>
                <div className="workhub-moodboard-url-dialog-body">
                  <input
                    type="url"
                    className="workhub-input"
                    value={urlDraft}
                    onChange={(event) => setUrlDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key !== 'Enter') return
                      event.preventDefault()
                      void addMoodBoardImageFromUrl(urlDraft)
                    }}
                    placeholder="Paste image URL here"
                    autoFocus
                  />
                  <div className="workhub-moodboard-url-hint">Paste any direct image URL. You can still paste a URL directly into the mood board area too.</div>
                </div>
                <div className="workhub-moodboard-url-dialog-actions">
                  <button
                    type="button"
                    className="workhub-ghost-btn"
                    onClick={() => setUrlDialogOpen(false)}
                  >Cancel</button>
                  <button
                    type="button"
                    className="workhub-primary-btn"
                    onClick={() => { void addMoodBoardImageFromUrl(urlDraft) }}
                    disabled={addingUrl || !urlDraft.trim()}
                  >
                    {addingUrl ? 'Adding…' : 'Add URL'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeError && (
            <div className="workhub-moodboard-error">{activeError}</div>
          )}

          <div className="workhub-moodboard-view-options" role="group" aria-label="Mood board view options">
            <div className="workhub-moodboard-view-group workhub-moodboard-view-group-main" role="group" aria-label="Image size options">
              <button
                type="button"
                className={`workhub-moodboard-view-chip${imageLayout === 'compact' ? ' is-active' : ''}`}
                onClick={() => setImageLayout('compact')}
                aria-pressed={imageLayout === 'compact'}
                aria-label="Grid layout"
                title="Grid layout"
              >Grid</button>
              <button
                type="button"
                className={`workhub-moodboard-view-chip${imageLayout === 'large' ? ' is-active' : ''}`}
                onClick={() => setImageLayout('large')}
                aria-pressed={imageLayout === 'large'}
                aria-label="Canvas layout"
                title="Canvas layout"
              >Canvas</button>
              {canEdit && (
                <div className="workhub-moodboard-inline-actions" role="group" aria-label="Mood board image actions">
                  <button
                    type="button"
                    className="workhub-ghost-btn workhub-doc-tool-btn workhub-moodboard-head-action"
                    title="Upload images"
                    aria-label="Upload images"
                    onClick={() => fileInputRef.current?.click()}
                  >📤 Upload</button>
                  <button
                    type="button"
                    className="workhub-ghost-btn workhub-doc-tool-btn workhub-moodboard-head-action"
                    title="Add image by URL"
                    aria-label="Add image by URL"
                    onClick={() => setUrlDialogOpen(true)}
                  >🌐 Add URL</button>
                </div>
              )}
            </div>

            <label className="workhub-moodboard-grid-toggle">
              <input
                type="checkbox"
                checked={showGridBackground}
                onChange={(e) => setShowGridBackground(e.target.checked)}
              />
              <span className="workhub-moodboard-grid-toggle-label">Show Grid</span>
            </label>
          </div>

          {/* Image grid body */}
          <div
            ref={moodBoardBodyRef}
            className={`workhub-moodboard-body${showGridBackground ? ' has-grid-background' : ''}${isCanvasMode ? ' is-canvas-mode' : ''}${isDropTargetActive ? ' is-drop-target' : ''}${isMiddleMousePanning ? ' is-middle-mouse-panning' : ''}`}
            onDragEnter={handleGridDragEnter}
            onDragOver={handleGridDragOver}
            onDragLeave={handleGridDragLeave}
            onDrop={handleGridDrop}
            onPaste={handleMoodBoardPaste}
            onPointerDown={(event) => { void handleMiddleMousePanStart(event) }}
            onAuxClick={(event) => {
              if (event.button === 1) event.preventDefault()
            }}
          >
            {(!board || board.images.length === 0) && !uploading && (
              <div className="workhub-moodboard-empty">
                <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>🖼️</div>
                <div>No images yet.</div>
                {canEdit && <div style={{ marginTop: 4, fontSize: '0.78rem', color: '#aac0dc' }}>Use the header buttons to upload an image or add one by URL.</div>}
              </div>
            )}

            {board && board.images.length > 0 && !isCanvasMode && (
              <div className="workhub-moodboard-images" onPointerDown={handleCompactGridPointerDown}>
                {board.images.map((img, i) => {
                  const imgId = fallbackMoodBoardImageId(img, i)
                  const bgKey = img.url
                  const imgShowBg = imageBgMap[bgKey] !== false
                  const imgHideBg = /\.png(\?|$)/i.test(img.url) && !imgShowBg
                  return (
                  <div
                    key={imgId}
                    className={`workhub-moodboard-image-card${selectedCanvasImage?.id === imgId ? ' is-selected' : ''}${imgHideBg ? ' is-transparent-bg' : ''}`}
                    onClick={() => setSelectedImageId(imgId)}
                    onDoubleClick={(event) => {
                      event.stopPropagation()
                      onOpenAttachmentLightbox(img.url)
                    }}
                  >
                    <img src={img.url} alt={img.caption} />
                    {canRemove(img) && (
                      <button
                        type="button"
                        className="workhub-moodboard-image-remove"
                        title="Remove image"
                        aria-label="Remove image"
                        onClick={(event) => {
                          event.stopPropagation()
                          void handleRemoveImage(i)
                        }}
                      >🗑</button>
                    )}
                  </div>
                  )
                })}              </div>
            )}

            {board && board.images.length > 0 && isCanvasMode && (
              <>
                <div className="workhub-moodboard-canvas-help">
                  {canEdit
                    ? 'Drag to move. Use corner handles to resize. Drag on empty space to box-select. Use the middle mouse button to pan around the canvas.'
                    : 'Canvas mode shows full images without cropping.'}
                </div>
                <div
                  ref={canvasRef}
                  className={`workhub-moodboard-canvas${dragging ? ' is-dragging' : ''}`}
                  style={{ height: `${canvasHeight}px` }}
                  onPointerDown={handleCanvasPointerDown}
                >
                  {sortedCanvasImages.map((img, i) => {
                    const selected = selectedIds.includes(img.id)
                    const bgKey = img.url
                    const showBg = imageBgMap[bgKey] !== false
                    const hideBg = /\.png(\?|$)/i.test(img.url) && !showBg
                    return (
                      <div
                        key={img.id}
                        className={`workhub-moodboard-canvas-item${selected ? ' is-selected' : ''}${selectedCanvasImage?.id === img.id ? ' is-detail-selected' : ''}${hideBg ? ' is-transparent-bg' : ''}`}
                        style={{
                          left: `${img.x}px`,
                          top: `${img.y}px`,
                          width: `${img.width}px`,
                          height: `${img.height}px`,
                          zIndex: img.z,
                        }}
                        onPointerDown={(event) => handleCanvasItemPointerDown(event, img.id)}
                        onDoubleClick={(event) => {
                          event.stopPropagation()
                          onOpenAttachmentLightbox(img.url)
                        }}
                      >
                        <img src={img.url} alt={img.caption} />
                        {canRemove(img) && (
                          <button
                            type="button"
                            className="workhub-moodboard-image-remove"
                            title="Remove image"
                            aria-label="Remove image"
                            onClick={(event) => {
                              event.stopPropagation()
                              void handleRemoveImage(i, img.id)
                            }}
                          >🗑</button>
                        )}
                        {canEdit && (
                          <button
                            type="button"
                            className="workhub-moodboard-resize-handle"
                            onPointerDown={(event) => handleResizePointerDown(event, img.id)}
                            aria-label="Resize image"
                          />
                        )}
                      </div>
                    )
                  })}
                  {marqueeRect && (
                    <div
                      className="workhub-moodboard-marquee"
                      style={{
                        left: `${Math.min(marqueeRect.startX, marqueeRect.currentX)}px`,
                        top: `${Math.min(marqueeRect.startY, marqueeRect.currentY)}px`,
                        width: `${Math.abs(marqueeRect.currentX - marqueeRect.startX)}px`,
                        height: `${Math.abs(marqueeRect.currentY - marqueeRect.startY)}px`,
                      }}
                    />
                  )}
                </div>
              </>
            )}

            {uploading && (
              <div style={{ textAlign: 'center', color: '#6a88b8', fontSize: '0.82rem', padding: '12px 0' }}>
                Uploading…
              </div>
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

              <div className="workhub-detail-card">
                <strong style={{ fontSize: '0.74rem', color: '#1e3e74', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Selected image
                </strong>
                {selectedCanvasImage ? (
                  <div className="workhub-moodboard-selected-image-detail">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                      <button
                        type="button"
                        className="workhub-ghost-btn"
                        onClick={() => onOpenAttachmentLightbox(selectedCanvasImage.url)}
                        title="Open annotation"
                      >
                        Annotate image
                      </button>
                      {canEdit && (
                        <button
                          type="button"
                          className="workhub-ghost-btn"
                          onClick={() => {
                            cropWorkflow.openCrop(selectedCanvasImage.id, selectedCanvasImage.url)
                          }}
                          title="Crop image"
                        >
                          ✂ Crop
                        </button>
                      )}
                      {getAttachmentReviewCount(selectedCanvasImage.url) > 0 && (
                        <span className="workhub-attachment-review-indicator" title="Notes / annotations">
                          📝 {getAttachmentReviewCount(selectedCanvasImage.url)}
                        </span>
                      )}
                    </div>
                    {/\.png(\?|$)/i.test(selectedCanvasImage.url) && (() => {
                      const bgKey = selectedCanvasImage.url
                      const showBg = imageBgMap[bgKey] !== false
                      const bgHidden = !showBg
                      return (
                        <button
                          type="button"
                          className="workhub-moodboard-bg-toggle-btn"
                          onClick={() => {
                            const nextMap = { ...imageBgMap, [bgKey]: !showBg }
                            setImageBgMap(nextMap)
                            saveBgMap(nextMap)
                          }}
                          title={bgHidden ? 'Show solid background' : 'Show transparent background'}
                        >
                          {bgHidden ? '▩ Show background' : '⬜ Hide background'}
                        </button>
                      )
                    })()}
                    <div className={`workhub-moodboard-image-preview-wrap${imageBgMap[selectedCanvasImage.url] !== false ? '' : ' is-transparent-bg'}`}>
                      <img src={selectedCanvasImage.url} alt={selectedCanvasImage.caption} />
                    </div>
                    {canEdit ? (
                      <div className="workhub-moodboard-caption-editor">
                        <input
                          type="text"
                          className="workhub-input"
                          value={selectedImageCaptionDraft}
                          onChange={(event) => setSelectedImageCaptionDraft(event.target.value)}
                          onBlur={() => { void handleSaveSelectedImageCaption() }}
                          onKeyDown={(event) => {
                            if (event.key !== 'Enter') return
                            event.preventDefault()
                            void handleSaveSelectedImageCaption()
                          }}
                          placeholder="Image name"
                        />
                        <input
                          type="url"
                          className="workhub-input"
                          value={selectedImageUrlDraft}
                          onChange={(event) => setSelectedImageUrlDraft(event.target.value)}
                          onBlur={() => { void handleSaveSelectedImageUrl() }}
                          onKeyDown={(event) => {
                            if (event.key !== 'Enter') return
                            event.preventDefault()
                            void handleSaveSelectedImageUrl()
                          }}
                          placeholder="Image URL"
                        />
                        {selectedImageUrlSaving && <span className="workhub-moodboard-inline-status">Saving URL…</span>}
                      </div>
                    ) : (
                      <div className="workhub-detail-meta">
                        <span>Name: {selectedCanvasImage.caption || 'Untitled image'}</span>
                        <span className="workhub-moodboard-url-token">URL: {selectedCanvasImage.url}</span>
                      </div>
                    )}
                    <div className="workhub-detail-meta">
                      <span>Added by: {memberByUid[selectedCanvasImage.addedBy]?.displayName || memberByUid[selectedCanvasImage.addedBy]?.email || selectedCanvasImage.addedBy}</span>
                      <span>Added: {formatTime(selectedCanvasImage.addedAt)}</span>
                      {isCanvasMode && (
                        <span>Frame: {Math.round(selectedCanvasImage.width)} x {Math.round(selectedCanvasImage.height)} at ({Math.round(selectedCanvasImage.x)}, {Math.round(selectedCanvasImage.y)})</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="workhub-empty-state" style={{ fontSize: '0.78rem' }}>
                    Click an image to view details.
                  </div>
                )}
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
                showAuthorAvatar
                formatTime={formatTime}
                editingId={discussionEditingId}
                editingText={discussionEditingText}
                onEditStart={onDiscussionEditStart}
                onEditChange={onDiscussionEditChange}
                onEditCancel={onDiscussionEditCancel}
                onEditSave={onDiscussionEditSave}
                editBusyKey={discussionEditBusyKey}
                onComposerSend={onDiscussionSend}
                composerBusy={discussionBusy}
                notifyMode={discussionNotifyMode}
                notifyUids={discussionNotifyUids}
                notifyCandidates={discussionNotifyCandidates}
                onNotifyModeChange={onDiscussionNotifyModeChange}
                onNotifyUidsChange={onDiscussionNotifyUidsChange}
                composerPlaceholder="Add a comment..."
                emptyStateText="No comments yet."
              />
            </>
          ) : (
            <div className="workhub-empty-state" style={{ fontSize: '0.78rem' }}>No board selected.</div>
          )}
        </aside>
      </div>

      <ImageCropDialog
        isOpen={cropWorkflow.isOpen}
        imageSrc={cropWorkflow.imageSrc}
        title="Crop Image"
        ratioPresets={cropWorkflow.ratioPresets}
        onClose={cropWorkflow.closeCrop}
        onConfirm={cropWorkflow.confirmCrop}
      />
    </main>
  )
}

