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
  updateWorkhubMoodBoardUserPreference,
  type WorkhubMember,
  type WorkhubMoodBoard,
  type WorkhubMoodBoardImage,
  type WorkhubMoodBoardUserPreference,
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
const DEFAULT_MOODBOARD_TAB_ID = 'tab-main'
const CANVAS_MIN_WIDTH = 1400
const CANVAS_MIN_HEIGHT = 1200
const CANVAS_BOARD_PADDING = 96
const MOODBOARD_RAIL_WIDTH_STORAGE_KEY = 'workhub:moodboardRailWidth'
const MOODBOARD_RAIL_COLLAPSED_STORAGE_KEY = 'workhub:moodboardRailCollapsed'
const DEFAULT_MOODBOARD_USER_PREFERENCE = {
  imageLayout: 'large' as MoodBoardImageLayoutMode,
  showGridBackground: true,
  detailsCollapsed: true,
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

function resolveMoodBoardTabId(tabId?: string): string {
  const normalized = (tabId || '').trim()
  return normalized || DEFAULT_MOODBOARD_TAB_ID
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

async function loadImageDimensions(src: string): Promise<{ width: number; height: number }> {
  return await new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => resolve({
      width: image.naturalWidth || LARGE_DEFAULT_SIZE.width,
      height: image.naturalHeight || LARGE_DEFAULT_SIZE.height,
    })
    image.onerror = () => reject(new Error('Failed to load image dimensions'))
    image.src = src
  })
}

function scaleCanvasSizeToBounds(
  sourceWidth: number,
  sourceHeight: number,
  layout: MoodBoardImageLayoutMode,
): { width: number; height: number } {
  const bounds = defaultCanvasSize(layout)
  if (!(sourceWidth > 0) || !(sourceHeight > 0)) return bounds

  const scale = Math.min(bounds.width / sourceWidth, bounds.height / sourceHeight)
  const nextScale = Number.isFinite(scale) && scale > 0 ? scale : 1
  return {
    width: Math.max(1, Math.round(sourceWidth * nextScale)),
    height: Math.max(1, Math.round(sourceHeight * nextScale)),
  }
}

function getPointerInBoardSpace(
  event: { clientX: number; clientY: number },
  boardEl: HTMLElement,
  scrollEl: HTMLElement,
  zoom = 1,
): { x: number; y: number } {
  const rect = boardEl.getBoundingClientRect()
  return {
    x: (event.clientX - rect.left + scrollEl.scrollLeft) / zoom,
    y: (event.clientY - rect.top + scrollEl.scrollTop) / zoom,
  }
}

function normalizeMoodBoardUserPreference(pref: WorkhubMoodBoardUserPreference | null | undefined) {
  if (!pref || typeof pref !== 'object') return null
  return {
    imageLayout: pref.imageLayout === 'compact' ? 'compact' as const : 'large' as const,
    showGridBackground: typeof pref.showGridBackground === 'boolean'
      ? pref.showGridBackground
      : DEFAULT_MOODBOARD_USER_PREFERENCE.showGridBackground,
    detailsCollapsed: typeof pref.detailsCollapsed === 'boolean'
      ? pref.detailsCollapsed
      : DEFAULT_MOODBOARD_USER_PREFERENCE.detailsCollapsed,
  }
}

function normalizeBoardImages(images: Array<{ image: WorkhubMoodBoardImage; sourceIndex: number }>, layout: MoodBoardImageLayoutMode): CanvasImage[] {
  const defaults = defaultCanvasSize(layout)
  const gap = 28
  const perRow = 3
  const normalized = images.map(({ image: img, sourceIndex }, index) => {
    const row = Math.floor(index / perRow)
    const col = index % perRow
    return {
      ...img,
      id: fallbackMoodBoardImageId(img, sourceIndex),
      x: typeof img.x === 'number' ? img.x : 18 + col * (defaults.width + gap),
      y: typeof img.y === 'number' ? img.y : 18 + row * (defaults.height + gap),
      width: typeof img.width === 'number' ? img.width : defaults.width,
      height: typeof img.height === 'number' ? img.height : defaults.height,
      z: typeof img.z === 'number' ? img.z : index + 1,
    }
  })

  const minLeft = normalized.reduce((min, image) => Math.min(min, image.x), Number.POSITIVE_INFINITY)
  const minTop = normalized.reduce((min, image) => Math.min(min, image.y), Number.POSITIVE_INFINITY)
  const shiftX = Number.isFinite(minLeft) && minLeft < 0 ? -minLeft : 0
  const shiftY = Number.isFinite(minTop) && minTop < 0 ? -minTop : 0

  if (!shiftX && !shiftY) return normalized

  return normalized.map((image) => ({
    ...image,
    x: image.x + shiftX,
    y: image.y + shiftY,
  }))
}

function serializeImages(images: WorkhubMoodBoardImage[]): string {
  return JSON.stringify(images.map((img) => ({
    id: img.id ?? null,
    tabId: resolveMoodBoardTabId(img.tabId),
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
  onDiscussionDelete?: (comment: WorkhubTaskComment) => Promise<void>
  discussionDeleteBusyKey?: string
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
  onDiscussionDelete,
  discussionDeleteBusyKey,
}: MoodBoardPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const moodBoardBodyRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const detailRailRef = useRef<HTMLDivElement>(null)
  const dropDragDepthRef = useRef(0)
  const interactionRef = useRef<CanvasInteraction | null>(null)
  const canvasImagesRef = useRef<CanvasImage[]>([])
  const selectedIdsRef = useRef<string[]>([])
  const marqueeBaseSelectionRef = useRef<string[]>([])
  const marqueeRectRef = useRef<BoxSelectionRect | null>(null)
  const dragFrameRef = useRef<number | null>(null)
  const pendingDragPointRef = useRef<{ x: number; y: number } | null>(null)
  const activePointerCaptureRef = useRef<{ element: Element; pointerId: number } | null>(null)
  const canvasItemElsRef = useRef<Map<string, HTMLDivElement>>(new Map())
  const detailRailResizeDragRef = useRef<{ startX: number; startWidth: number } | null>(null)
  const persistTimerRef = useRef<number | null>(null)
  const preferencePersistTimerRef = useRef<number | null>(null)
  const titlePersistTimerRef = useRef<number | null>(null)
  const titleSavedIndicatorTimerRef = useRef<number | null>(null)
  const titleDraftRef = useRef('')
  const titleSavedValueRef = useRef((board?.title ?? '').trim())
  const [hasPendingMutations, setHasPendingMutations] = useState(false)
  const [imageLayout, setImageLayout] = useState<MoodBoardImageLayoutMode>(DEFAULT_MOODBOARD_USER_PREFERENCE.imageLayout)
  const [showGridBackground, setShowGridBackground] = useState<boolean>(DEFAULT_MOODBOARD_USER_PREFERENCE.showGridBackground)
  const [detailsCollapsed, setDetailsCollapsed] = useState<boolean>(DEFAULT_MOODBOARD_USER_PREFERENCE.detailsCollapsed)
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
  const [detailRailWidth, setDetailRailWidth] = useState<number>(() => {
    if (typeof window === 'undefined') return 248
    const saved = window.localStorage.getItem(MOODBOARD_RAIL_WIDTH_STORAGE_KEY)
    const parsed = saved ? Number.parseInt(saved, 10) : Number.NaN
    return Number.isFinite(parsed) && parsed >= 160 && parsed <= 500 ? parsed : 248
  })
  const [detailRailCollapsed, setDetailRailCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem(MOODBOARD_RAIL_COLLAPSED_STORAGE_KEY) === '1'
  })
  const canAddImages = !!currentUid

  const boardUserPreference = useMemo(() => {
    return normalizeMoodBoardUserPreference(board?.userPreferences?.[currentUid])
  }, [board?.id, board?.userPreferences, currentUid])

  const moodBoardScrollStorageKey = board?.id ? `workhub:moodboard:scroll:v3:${board.id}:${imageLayout}` : ''

  const activeTabImageEntries = useMemo(() => {
    return (board?.images ?? []).map((image, index) => ({ image, sourceIndex: index }))
  }, [board?.images])

  useEffect(() => {
    canvasImagesRef.current = canvasImages
  }, [canvasImages])

  useEffect(() => {
    selectedIdsRef.current = selectedIds
  }, [selectedIds])

  useEffect(() => {
    marqueeRectRef.current = marqueeRect
  }, [marqueeRect])

  useEffect(() => {
    const nextPreference = boardUserPreference ?? DEFAULT_MOODBOARD_USER_PREFERENCE
    setImageLayout(nextPreference.imageLayout)
    setShowGridBackground(nextPreference.showGridBackground)
    setDetailsCollapsed(nextPreference.detailsCollapsed)
  }, [
    board?.id,
    boardUserPreference?.imageLayout,
    boardUserPreference?.showGridBackground,
    boardUserPreference?.detailsCollapsed,
  ])

  useEffect(() => {
    if (!board || !currentUid) return
    if (preferencePersistTimerRef.current) {
      window.clearTimeout(preferencePersistTimerRef.current)
      preferencePersistTimerRef.current = null
    }

    const needsSave = !boardUserPreference
      || boardUserPreference.imageLayout !== imageLayout
      || boardUserPreference.showGridBackground !== showGridBackground
      || boardUserPreference.detailsCollapsed !== detailsCollapsed

    if (!needsSave) return

    preferencePersistTimerRef.current = window.setTimeout(() => {
      void updateWorkhubMoodBoardUserPreference(board.id, currentUid, {
        imageLayout,
        showGridBackground,
        detailsCollapsed,
      }).catch((err) => {
        setError(String(err))
      })
    }, 220)

    return () => {
      if (preferencePersistTimerRef.current) {
        window.clearTimeout(preferencePersistTimerRef.current)
        preferencePersistTimerRef.current = null
      }
    }
  }, [
    board,
    boardUserPreference,
    currentUid,
    imageLayout,
    showGridBackground,
    detailsCollapsed,
  ])

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
    if (dragging || hasPendingMutations) return
    const normalized = normalizeBoardImages(activeTabImageEntries, imageLayout)
    setCanvasImages(normalized)
  }, [activeTabImageEntries, board?.id, imageLayout, dragging, hasPendingMutations])

  useEffect(() => {
    if (!canvasImages.length) {
      setSelectedIds((prev) => prev.length === 0 ? prev : [])
      setSelectedImageId((prev) => prev === null ? prev : null)
      return
    }
    const available = new Set(canvasImages.map((image) => image.id))
    setSelectedIds((prev) => {
      const next = prev.filter((id) => available.has(id))
      return next.length === prev.length ? prev : next
    })
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

    if (dragging) return

    const nextImages: WorkhubMoodBoardImage[] = canvasImages.map((image) => ({
      id: image.id,
      tabId: DEFAULT_MOODBOARD_TAB_ID,
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

    if (serializeImages(nextImages) === serializeImages(board.images ?? [])) {
      setHasPendingMutations(false)
      return
    }

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
  }, [board, canEdit, canvasImages, dragging])

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
        const targetLeft = typeof parsed.left === 'number' ? Math.max(0, parsed.left) : 0
        const targetTop = typeof parsed.top === 'number' ? Math.max(0, parsed.top) : 0
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
    const minHeight = CANVAS_MIN_HEIGHT
    const bottom = canvasImages.reduce((max, image) => Math.max(max, image.y + image.height), 0)
    return Math.max(minHeight, bottom + CANVAS_BOARD_PADDING)
  }, [canvasImages])

  const canvasWidth = useMemo(() => {
    const minWidth = CANVAS_MIN_WIDTH
    const right = canvasImages.reduce((max, image) => Math.max(max, image.x + image.width), 0)
    return Math.max(minWidth, right + CANVAS_BOARD_PADDING)
  }, [canvasImages])

  function pointToCanvas(clientX: number, clientY: number): { x: number; y: number } | null {
    const canvasEl = canvasRef.current
    const bodyEl = moodBoardBodyRef.current
    if (!canvasEl || !bodyEl) return null
    return getPointerInBoardSpace({ clientX, clientY }, canvasEl, bodyEl)
  }

  function setPointerCapture(event: React.PointerEvent<Element>) {
    try {
      event.currentTarget.setPointerCapture(event.pointerId)
      activePointerCaptureRef.current = {
        element: event.currentTarget,
        pointerId: event.pointerId,
      }
    } catch {
      activePointerCaptureRef.current = null
    }
  }

  function releasePointerCapture() {
    const activeCapture = activePointerCaptureRef.current
    if (!activeCapture) return
    try {
      if ('hasPointerCapture' in activeCapture.element
        && typeof activeCapture.element.hasPointerCapture === 'function'
        && activeCapture.element.hasPointerCapture(activeCapture.pointerId)
        && 'releasePointerCapture' in activeCapture.element
        && typeof activeCapture.element.releasePointerCapture === 'function') {
        activeCapture.element.releasePointerCapture(activeCapture.pointerId)
      }
    } catch {
      // Ignore release failures.
    }
    activePointerCaptureRef.current = null
  }

  function computeMoveDelta(interaction: MoveInteraction, point: { x: number; y: number }) {
    const dx0 = point.x - interaction.startX
    const dy0 = point.y - interaction.startY
    const tentativeMinLeft = interaction.itemIds.reduce((min, id) => {
      const origin = interaction.origins[id]
      return origin ? Math.min(min, origin.x + dx0) : min
    }, Number.POSITIVE_INFINITY)
    const tentativeMinTop = interaction.itemIds.reduce((min, id) => {
      const origin = interaction.origins[id]
      return origin ? Math.min(min, origin.y + dy0) : min
    }, Number.POSITIVE_INFINITY)
    return {
      dx: tentativeMinLeft < 0 ? dx0 - tentativeMinLeft : dx0,
      dy: tentativeMinTop < 0 ? dy0 - tentativeMinTop : dy0,
    }
  }

  function computeResizeScale(interaction: ResizeInteraction, point: { x: number; y: number }) {
    const dx = point.x - interaction.startX
    const dy = point.y - interaction.startY
    const minSize = minCanvasSize(imageLayout)
    const widthScale = (interaction.origin.width + dx) / interaction.origin.width
    const heightScale = (interaction.origin.height + dy) / interaction.origin.height
    const minScale = Math.max(
      minSize.width / interaction.origin.width,
      minSize.height / interaction.origin.height,
    )
    return Math.max(minScale, widthScale, heightScale)
  }

  // DOM-only: called every RAF during drag — no React state updates.
  function applyMoveInteraction(interaction: MoveInteraction, point: { x: number; y: number }) {
    const { dx, dy } = computeMoveDelta(interaction, point)
    for (const id of interaction.itemIds) {
      const el = canvasItemElsRef.current.get(id)
      if (el) el.style.transform = `translate(${dx}px, ${dy}px)`
    }
  }

  // DOM-only: called every RAF during drag — no React state updates.
  function applyResizeInteraction(interaction: ResizeInteraction, point: { x: number; y: number }) {
    const nextScale = computeResizeScale(interaction, point)
    const el = canvasItemElsRef.current.get(interaction.itemId)
    if (el) {
      el.style.transformOrigin = '0% 0%'
      el.style.transform = `scale(${nextScale})`
    }
  }

  // Commits final move position to DOM + React state. Called once at drag end.
  function commitMoveInteraction(interaction: MoveInteraction, point: { x: number; y: number }) {
    const { dx, dy } = computeMoveDelta(interaction, point)
    const itemIdSet = new Set(interaction.itemIds)
    for (const id of interaction.itemIds) {
      const el = canvasItemElsRef.current.get(id)
      const origin = interaction.origins[id]
      if (!el || !origin) continue
      el.style.transform = ''
      el.style.left = `${origin.x + dx}px`
      el.style.top = `${origin.y + dy}px`
    }
    setCanvasImages((prev) => prev.map((image) => {
      if (!itemIdSet.has(image.id)) return image
      const origin = interaction.origins[image.id]
      if (!origin) return image
      return { ...image, x: origin.x + dx, y: origin.y + dy }
    }))
  }

  // Commits final resize dimensions to DOM + React state. Called once at drag end.
  function commitResizeInteraction(interaction: ResizeInteraction, point: { x: number; y: number }) {
    const nextScale = computeResizeScale(interaction, point)
    const finalW = Math.round(interaction.origin.width * nextScale)
    const finalH = Math.round(interaction.origin.height * nextScale)
    const el = canvasItemElsRef.current.get(interaction.itemId)
    if (el) {
      el.style.transform = ''
      el.style.transformOrigin = ''
      el.style.width = `${finalW}px`
      el.style.height = `${finalH}px`
    }
    setCanvasImages((prev) => prev.map((image) => {
      if (image.id !== interaction.itemId) return image
      return { ...image, width: finalW, height: finalH }
    }))
  }

  function flushPendingDragFrame() {
    if (dragFrameRef.current !== null) {
      window.cancelAnimationFrame(dragFrameRef.current)
      dragFrameRef.current = null
    }
    const point = pendingDragPointRef.current
    const interaction = interactionRef.current
    pendingDragPointRef.current = null
    if (!point || !interaction) return
    if (interaction.kind === 'move') {
      commitMoveInteraction(interaction, point)
      return
    }
    if (interaction.kind === 'resize') {
      commitResizeInteraction(interaction, point)
    }
  }

  function scheduleDragFrame(point: { x: number; y: number }) {
    pendingDragPointRef.current = point
    if (dragFrameRef.current !== null) return
    dragFrameRef.current = window.requestAnimationFrame(() => {
      dragFrameRef.current = null
      const nextPoint = pendingDragPointRef.current
      const interaction = interactionRef.current
      pendingDragPointRef.current = null
      if (!nextPoint || !interaction) return
      if (interaction.kind === 'move') {
        applyMoveInteraction(interaction, nextPoint)
        return
      }
      if (interaction.kind === 'resize') {
        applyResizeInteraction(interaction, nextPoint)
      }
    })
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
    const hitIds = canvasImagesRef.current
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
        scheduleDragFrame(point)
        return
      }

      if (interaction.kind === 'resize') {
        scheduleDragFrame(point)
        return
      }

      if (interaction.kind === 'marquee' && marqueeRectRef.current) {
        const nextRect: BoxSelectionRect = {
          ...marqueeRectRef.current,
          currentX: point.x,
          currentY: point.y,
        }
        setMarqueeRect(nextRect)
        updateSelectionFromMarquee(nextRect, event.shiftKey)
      }
    }

    function handlePointerUp() {
      flushPendingDragFrame()
      interactionRef.current = null
      releasePointerCapture()
      setDragging(false)
      setIsMiddleMousePanning(false)
      setMarqueeRect(null)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)
    return () => {
      flushPendingDragFrame()
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [dragging, imageLayout])

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
    setPointerCapture(event)
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

  function extractClipboardImageFiles(clipboardData: DataTransfer | null | undefined): File[] {
    if (!clipboardData) return []
    return Array.from(clipboardData.items || [])
      .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
      .map((item) => item.getAsFile())
      .filter((file): file is File => !!file)
  }

  function handleRailResizePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (detailRailCollapsed) return
    event.preventDefault()
    detailRailResizeDragRef.current = { startX: event.clientX, startWidth: detailRailWidth }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handleRailResizePointerMove(event: React.PointerEvent<HTMLDivElement>) {
    if (!detailRailResizeDragRef.current || !detailRailRef.current) return
    const dx = detailRailResizeDragRef.current.startX - event.clientX
    const nextWidth = Math.min(500, Math.max(160, detailRailResizeDragRef.current.startWidth + dx))
    detailRailRef.current.style.flexBasis = `${nextWidth}px`
    detailRailRef.current.style.width = `${nextWidth}px`
  }

  function handleRailResizePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    if (!detailRailResizeDragRef.current) return
    const dx = detailRailResizeDragRef.current.startX - event.clientX
    const nextWidth = Math.min(500, Math.max(160, detailRailResizeDragRef.current.startWidth + dx))
    setDetailRailWidth(nextWidth)
    window.localStorage.setItem(MOODBOARD_RAIL_WIDTH_STORAGE_KEY, String(nextWidth))
    detailRailResizeDragRef.current = null
  }

  function handleToggleRailCollapse() {
    const nextValue = !detailRailCollapsed
    setDetailRailCollapsed(nextValue)
    window.localStorage.setItem(MOODBOARD_RAIL_COLLAPSED_STORAGE_KEY, nextValue ? '1' : '0')
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
    if (!canAddImages) return
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
      let nextIndex = existingImages.length
      let nextZ = existingImages.reduce((max, image) => Math.max(max, typeof image.z === 'number' ? image.z : 0), 0)
      for (const file of imageFiles) {
        const url = await onUploadImage(boardId, file)
        let defaults = defaultCanvasSize(imageLayout)
        const previewUrl = URL.createObjectURL(file)
        try {
          const dimensions = await loadImageDimensions(previewUrl)
          defaults = scaleCanvasSizeToBounds(dimensions.width, dimensions.height, imageLayout)
        } catch {
          defaults = defaultCanvasSize(imageLayout)
        } finally {
          URL.revokeObjectURL(previewUrl)
        }
        const index = nextIndex
        const row = Math.floor(index / 3)
        const col = index % 3
        const newImage: WorkhubMoodBoardImage = {
          id: createMoodBoardImageId(file),
          tabId: DEFAULT_MOODBOARD_TAB_ID,
          url,
          caption: file.name,
          addedBy: currentUid,
          addedAt: new Date().toISOString(),
          x: 18 + col * (defaults.width + 28),
          y: 18 + row * (defaults.height + 28),
          width: defaults.width,
          height: defaults.height,
          z: ++nextZ,
        }
        await addWorkhubMoodBoardImage(boardId, latestImages, newImage)
        latestImages = [...latestImages, newImage]
        nextIndex += 1
      }
    } catch (err) {
      setError(String(err))
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function addMoodBoardImageFromUrl(rawUrl: string) {
    if (!canAddImages) return
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
      let defaults = defaultCanvasSize(imageLayout)
      try {
        const dimensions = await loadImageDimensions(normalizedUrl)
        defaults = scaleCanvasSizeToBounds(dimensions.width, dimensions.height, imageLayout)
      } catch {
        defaults = defaultCanvasSize(imageLayout)
      }
      const index = existingImages.length
      const row = Math.floor(index / 3)
      const col = index % 3
      const maxZ = existingImages.reduce((max, image) => Math.max(max, typeof image.z === 'number' ? image.z : 0), 0)
      const newImageId = createMoodBoardRemoteImageId(normalizedUrl)
      const newImage: WorkhubMoodBoardImage = {
        id: newImageId,
        tabId: DEFAULT_MOODBOARD_TAB_ID,
        url: normalizedUrl,
        caption: deriveImageCaptionFromUrl(normalizedUrl),
        addedBy: currentUid,
        addedAt: new Date().toISOString(),
        x: 18 + col * (defaults.width + 28),
        y: 18 + row * (defaults.height + 28),
        width: defaults.width,
        height: defaults.height,
        z: maxZ + 1,
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
    if (!canAddImages) return
    const target = event.target as HTMLElement | null
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return

    const pastedImageFiles = extractClipboardImageFiles(event.clipboardData)
    if (pastedImageFiles.length > 0) {
      event.preventDefault()
      void uploadMoodBoardFiles(pastedImageFiles)
      return
    }

    const text = event.clipboardData.getData('text/plain').trim()
    const normalizedUrl = normalizeImageUrlInput(text)
    if (!normalizedUrl) return
    event.preventDefault()
    void addMoodBoardImageFromUrl(normalizedUrl)
  }

  useEffect(() => {
    if (!canAddImages || typeof window === 'undefined') return
    function handleWindowPaste(event: ClipboardEvent) {
      if (event.defaultPrevented) return
      const target = event.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return

      const pastedImageFiles = extractClipboardImageFiles(event.clipboardData)
      if (pastedImageFiles.length > 0) {
        event.preventDefault()
        void uploadMoodBoardFiles(pastedImageFiles)
        return
      }

      const text = event.clipboardData?.getData('text/plain').trim() || ''
      const normalizedUrl = normalizeImageUrlInput(text)
      if (!normalizedUrl) return
      event.preventDefault()
      void addMoodBoardImageFromUrl(normalizedUrl)
    }

    window.addEventListener('paste', handleWindowPaste)
    return () => {
      window.removeEventListener('paste', handleWindowPaste)
    }
  }, [canAddImages, board?.id, imageLayout])

  function handleGridDragEnter(event: React.DragEvent<HTMLDivElement>) {
    if (!canAddImages || !hasSupportedDropPayload(event)) return
    event.preventDefault()
    dropDragDepthRef.current += 1
    setIsDropTargetActive(true)
  }

  function handleGridDragOver(event: React.DragEvent<HTMLDivElement>) {
    if (!canAddImages || !hasSupportedDropPayload(event)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    if (!isDropTargetActive) setIsDropTargetActive(true)
  }

  function handleGridDragLeave(event: React.DragEvent<HTMLDivElement>) {
    if (!canAddImages || !hasSupportedDropPayload(event)) return
    event.preventDefault()
    dropDragDepthRef.current = Math.max(0, dropDragDepthRef.current - 1)
    if (dropDragDepthRef.current === 0) {
      setIsDropTargetActive(false)
    }
  }

  function handleGridDrop(event: React.DragEvent<HTMLDivElement>) {
    if (!canAddImages || !hasSupportedDropPayload(event)) return
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
        setSelectedImageId(null)
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
    setPointerCapture(event)
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

    const moved = new Set(nextSelection)
    const origins: Record<string, { x: number; y: number }> = {}
    canvasImagesRef.current.forEach((image) => {
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
    setPointerCapture(event)
    setHasPendingMutations(true)
    setDragging(true)
    event.preventDefault()
  }

  function handleResizePointerDown(event: React.PointerEvent<HTMLButtonElement>, imageId: string) {
    if (handleMiddleMousePanStart(event)) return
    if (!isCanvasMode || !canEdit) return
    if (event.button !== 0) return
    const point = pointToCanvas(event.clientX, event.clientY)
    if (!point) return
    const image = canvasImagesRef.current.find((item) => item.id === imageId)
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
    setPointerCapture(event)
    setHasPendingMutations(true)
    setDragging(true)
    event.preventDefault()
  }

  const canRemove = (img: WorkhubMoodBoardImage) => canEdit || img.addedBy === currentUid
  const activeTabImageCount = activeTabImageEntries.length
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

          {canAddImages && (
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

          {urlDialogOpen && canAddImages && (
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
              {canAddImages && (
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
            {(!board || activeTabImageCount === 0) && !uploading && (
              <div className="workhub-moodboard-empty">
                <div style={{ fontSize: '2.5rem', marginBottom: 10 }}>🖼️</div>
                <div>No images yet in this tab.</div>
                {canAddImages && <div style={{ marginTop: 4, fontSize: '0.78rem', color: '#aac0dc' }}>Use the header buttons to upload an image or add one by URL.</div>}
              </div>
            )}

            {board && activeTabImageCount > 0 && !isCanvasMode && (
              <div className="workhub-moodboard-images" onPointerDown={handleCompactGridPointerDown}>
                {activeTabImageEntries.map(({ image: img, sourceIndex }) => {
                  const imgId = fallbackMoodBoardImageId(img, sourceIndex)
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
                          void handleRemoveImage(sourceIndex, imgId)
                        }}
                      >🗑</button>
                    )}
                  </div>
                  )
                })}              </div>
            )}

            {board && activeTabImageCount > 0 && isCanvasMode && (
              <>
                <div className="workhub-moodboard-canvas-help">
                  {canEdit
                    ? 'Drag to move. Use corner handles to resize. Drag on empty space to box-select. Use the middle mouse button to pan around the canvas.'
                    : 'Canvas mode shows full images without cropping.'}
                </div>
                <div
                  ref={canvasRef}
                  className={`workhub-moodboard-canvas${dragging ? ' is-dragging' : ''}`}
                  style={{
                    height: `${canvasHeight}px`,
                    width: `${canvasWidth}px`,
                  }}
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
                        ref={(el) => {
                          if (el) canvasItemElsRef.current.set(img.id, el)
                          else canvasItemElsRef.current.delete(img.id)
                        }}
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

        <div
          className={`workhub-rail-resize-handle${detailRailCollapsed ? ' is-collapsed' : ''}`}
          onPointerDown={handleRailResizePointerDown}
          onPointerMove={handleRailResizePointerMove}
          onPointerUp={handleRailResizePointerUp}
          title={detailRailCollapsed ? 'Expand details panel' : 'Drag to resize details panel'}
        >
          {detailRailCollapsed && (
            <button
              type="button"
              className="workhub-rail-toggle-btn"
              onClick={handleToggleRailCollapse}
              title="Expand details"
              aria-label="Expand details"
            >
              ›
            </button>
          )}
        </div>

        {/* Details rail — mirrors document detail rail */}
        <aside
          ref={detailRailRef}
          className={`workhub-doc-detail-rail${detailRailCollapsed ? ' is-hidden' : ''}`}
          style={{ flexBasis: detailRailWidth, width: detailRailWidth }}
        >
          <div className="workhub-detail-rail-head">
            <h3>Details</h3>
            <div className="workhub-detail-rail-head-actions">
              {board && <span>Mood board</span>}
              <button
                type="button"
                className="workhub-ghost-mini"
                onClick={handleToggleRailCollapse}
                title="Collapse details"
                aria-label="Collapse details"
              >
                ‹
              </button>
            </div>
          </div>
          <div className="workhub-detail-rail-body is-details">
            {board ? (
              <>

                <div className="workhub-detail-card">
                  <details
                    className="workhub-detail-collapsible-info"
                    open={!detailsCollapsed}
                    onToggle={(event) => {
                      setDetailsCollapsed(!event.currentTarget.open)
                    }}
                  >
                    <summary>Board details</summary>
                    <div className="workhub-detail-meta">
                      <span>Entity: {entityLabel}</span>
                      <span>Images: {board.images.length} total</span>
                      <span>Checklist items: {checklistItems.length}</span>
                      <span>Created by: {memberByUid[board.createdBy]?.displayName || memberByUid[board.createdBy]?.email || board.createdBy}</span>
                      <span>Created: {formatTime(board.createdAt)}</span>
                      <span>Updated: {formatTime(board.updatedAt)}</span>
                    </div>
                  </details>
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
                  onDelete={onDiscussionDelete}
                  editBusyKey={discussionEditBusyKey}
                  deleteBusyKey={discussionDeleteBusyKey}
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
          </div>
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

