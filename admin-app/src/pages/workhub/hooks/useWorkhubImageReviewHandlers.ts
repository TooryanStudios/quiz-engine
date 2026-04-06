import {
  useCallback,
  useRef,
  useState,
  type Dispatch,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type SetStateAction,
} from 'react'
import {
  createEmptyImageReview,
  type WorkhubImageMarkerType,
  type WorkhubImageReview,
} from '../imageReview'

interface UseWorkhubImageReviewHandlersParams {
  attachmentReviews: Record<string, WorkhubImageReview>
  setAttachmentReviews: Dispatch<SetStateAction<Record<string, WorkhubImageReview>>>
  markerAuthor: string
  showToast: (payload: { message: string; type?: 'success' | 'error' | 'info' | 'warning'; durationMs?: number }) => void
}

export function useWorkhubImageReviewHandlers({
  attachmentReviews,
  setAttachmentReviews,
  markerAuthor,
  showToast,
}: UseWorkhubImageReviewHandlersParams) {
  const [lightboxImageUrl, setLightboxImageUrl] = useState('')
  const [lightboxTool, setLightboxTool] = useState<WorkhubImageMarkerType>('point')
  const [lightboxImageFit, setLightboxImageFit] = useState<'contain' | 'cover' | 'scale-down'>('contain')
  const [lightboxImageAspect, setLightboxImageAspect] = useState<number | null>(null)
  const [lightboxLineStart, setLightboxLineStart] = useState<{ x: number; y: number } | null>(null)
  const [lightboxMarkerEditorId, setLightboxMarkerEditorId] = useState('')
  const [lightboxMarkerDraft, setLightboxMarkerDraft] = useState('')
  const [lightboxMarkerResolved, setLightboxMarkerResolved] = useState(false)
  const [lightboxMarkerEditorIsNew, setLightboxMarkerEditorIsNew] = useState(false)
  const lightboxStageRef = useRef<HTMLDivElement | null>(null)
  const lightboxDragRef = useRef<{ markerId: string; imageUrl: string } | null>(null)

  const updateImageReview = useCallback((url: string, updater: (current: WorkhubImageReview) => WorkhubImageReview) => {
    setAttachmentReviews((current) => {
      const base = current[url] || createEmptyImageReview()
      return {
        ...current,
        [url]: updater(base),
      }
    })
  }, [setAttachmentReviews])

  const openAttachmentLightbox = useCallback((url: string) => {
    setLightboxImageUrl(url)
    setLightboxTool('point')
    setLightboxImageFit('contain')
    setLightboxImageAspect(null)
    setLightboxLineStart(null)
    setLightboxMarkerEditorId('')
    setLightboxMarkerDraft('')
    setLightboxMarkerEditorIsNew(false)
  }, [])

  const getLightboxClickPosition = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = ((event.clientX - rect.left) / rect.width) * 100
    const y = ((event.clientY - rect.top) / rect.height) * 100
    return {
      x: Math.min(100, Math.max(0, x)),
      y: Math.min(100, Math.max(0, y)),
    }
  }, [])

  const handleLightboxMarkerRemove = useCallback((markerId: string) => {
    if (!lightboxImageUrl) return
    updateImageReview(lightboxImageUrl, (review) => ({
      ...review,
      markers: review.markers.filter((marker) => marker.id !== markerId),
    }))
    if (lightboxMarkerEditorId === markerId) {
      setLightboxMarkerEditorId('')
      setLightboxMarkerDraft('')
      setLightboxMarkerEditorIsNew(false)
    }
  }, [lightboxImageUrl, lightboxMarkerEditorId, updateImageReview])

  const handleLightboxStageClick = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    if (!lightboxImageUrl) return
    if (lightboxMarkerEditorIsNew && !lightboxMarkerDraft.trim() && lightboxMarkerEditorId) {
      handleLightboxMarkerRemove(lightboxMarkerEditorId)
      setLightboxMarkerEditorId('')
      setLightboxMarkerDraft('')
      setLightboxMarkerEditorIsNew(false)
    }

    const position = getLightboxClickPosition(event)
    if (lightboxTool === 'line') {
      if (!lightboxLineStart) {
        setLightboxLineStart(position)
        return
      }
      const markerId = `mk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
      updateImageReview(lightboxImageUrl, (review) => ({
        ...review,
        markers: [...review.markers, {
          id: markerId,
          type: 'line',
          x: lightboxLineStart.x,
          y: lightboxLineStart.y,
          x2: position.x,
          y2: position.y,
          text: '',
          createdBy: markerAuthor,
          createdAt: new Date().toISOString(),
        }],
      }))
      setLightboxLineStart(null)
      setLightboxMarkerEditorId(markerId)
      setLightboxMarkerDraft('')
      setLightboxMarkerEditorIsNew(true)
      return
    }

    const markerId = `mk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    updateImageReview(lightboxImageUrl, (review) => ({
      ...review,
      markers: [...review.markers, {
        id: markerId,
        type: lightboxTool,
        x: position.x,
        y: position.y,
        checked: lightboxTool === 'checkbox' ? false : undefined,
        text: '',
        createdBy: markerAuthor,
        createdAt: new Date().toISOString(),
      }],
    }))
    setLightboxMarkerEditorId(markerId)
    setLightboxMarkerDraft('')
    setLightboxMarkerEditorIsNew(true)
  }, [
    getLightboxClickPosition,
    handleLightboxMarkerRemove,
    lightboxImageUrl,
    lightboxLineStart,
    lightboxMarkerDraft,
    lightboxMarkerEditorId,
    lightboxMarkerEditorIsNew,
    lightboxTool,
    markerAuthor,
    updateImageReview,
  ])

  const openLightboxMarkerEditor = useCallback((markerId: string, isNew = false) => {
    if (!lightboxImageUrl) return
    const marker = (attachmentReviews[lightboxImageUrl] || createEmptyImageReview()).markers.find((item) => item.id === markerId)
    if (!marker) return
    setLightboxMarkerEditorId(markerId)
    setLightboxMarkerDraft(marker.text || '')
    setLightboxMarkerResolved(marker.resolved ?? false)
    setLightboxMarkerEditorIsNew(isNew)
  }, [attachmentReviews, lightboxImageUrl])

  const closeLightboxMarkerEditor = useCallback(() => {
    if (!lightboxImageUrl) return
    if (lightboxMarkerEditorIsNew && !lightboxMarkerDraft.trim() && lightboxMarkerEditorId) {
      handleLightboxMarkerRemove(lightboxMarkerEditorId)
    }
    setLightboxMarkerEditorId('')
    setLightboxMarkerDraft('')
    setLightboxMarkerResolved(false)
    setLightboxMarkerEditorIsNew(false)
  }, [
    handleLightboxMarkerRemove,
    lightboxImageUrl,
    lightboxMarkerDraft,
    lightboxMarkerEditorId,
    lightboxMarkerEditorIsNew,
  ])

  const handleLightboxMarkerEditorSave = useCallback(() => {
    if (!lightboxImageUrl || !lightboxMarkerEditorId) return
    const nextText = lightboxMarkerDraft.trim()
    if (!nextText) {
      showToast({ type: 'error', message: 'Annotation title is required.' })
      return
    }
    updateImageReview(lightboxImageUrl, (review) => ({
      ...review,
      markers: review.markers.map((marker) => marker.id === lightboxMarkerEditorId
        ? { ...marker, text: nextText, resolved: lightboxMarkerResolved }
        : marker),
    }))
    setLightboxMarkerEditorId('')
    setLightboxMarkerDraft('')
    setLightboxMarkerResolved(false)
    setLightboxMarkerEditorIsNew(false)
  }, [
    lightboxImageUrl,
    lightboxMarkerDraft,
    lightboxMarkerEditorId,
    lightboxMarkerResolved,
    showToast,
    updateImageReview,
  ])

  const handleMarkerPointerDown = useCallback((markerId: string, event: ReactPointerEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    const imageUrl = lightboxImageUrl
    if (!imageUrl) return
    const element = event.currentTarget
    element.setPointerCapture(event.pointerId)
    const startX = event.clientX
    const startY = event.clientY
    lightboxDragRef.current = null

    function onMove(e: PointerEvent) {
      if (!lightboxStageRef.current) return
      if (!lightboxDragRef.current && Math.hypot(e.clientX - startX, e.clientY - startY) < 5) return
      lightboxDragRef.current = { markerId, imageUrl }
      const rect = lightboxStageRef.current.getBoundingClientRect()
      const x = Math.max(1, Math.min(99, ((e.clientX - rect.left) / rect.width) * 100))
      const y = Math.max(1, Math.min(99, ((e.clientY - rect.top) / rect.height) * 100))
      setAttachmentReviews((prev) => {
        const review = prev[imageUrl] || createEmptyImageReview()
        return {
          ...prev,
          [imageUrl]: {
            ...review,
            markers: review.markers.map((marker) => marker.id === markerId ? { ...marker, x, y } : marker),
          },
        }
      })
    }

    function onUp() {
      element.removeEventListener('pointermove', onMove)
      element.removeEventListener('pointerup', onUp)
      element.removeEventListener('pointercancel', onUp)
      setTimeout(() => { lightboxDragRef.current = null }, 100)
    }

    element.addEventListener('pointermove', onMove)
    element.addEventListener('pointerup', onUp)
    element.addEventListener('pointercancel', onUp)
  }, [lightboxImageUrl, setAttachmentReviews])

  const handleLightboxFullscreenToggle = useCallback(async () => {
    const stage = lightboxStageRef.current
    if (!stage) return
    if (document.fullscreenElement) {
      await document.exitFullscreen()
      return
    }
    await stage.requestFullscreen()
  }, [])

  return {
    lightboxImageUrl,
    setLightboxImageUrl,
    lightboxTool,
    setLightboxTool,
    lightboxImageFit,
    setLightboxImageFit,
    lightboxImageAspect,
    setLightboxImageAspect,
    lightboxLineStart,
    setLightboxLineStart,
    lightboxMarkerEditorId,
    lightboxMarkerDraft,
    setLightboxMarkerDraft,
    lightboxMarkerResolved,
    setLightboxMarkerResolved,
    lightboxStageRef,
    lightboxDragRef,
    openAttachmentLightbox,
    handleLightboxStageClick,
    openLightboxMarkerEditor,
    closeLightboxMarkerEditor,
    handleLightboxMarkerEditorSave,
    handleMarkerPointerDown,
    handleLightboxFullscreenToggle,
  }
}
