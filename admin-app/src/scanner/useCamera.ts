import { useRef, useState, useCallback, useEffect } from 'react'

export type CameraFacing = 'environment' | 'user'

export interface CaptureFrameOptions {
  normalizeUpright?: boolean
}

export interface CaptureFrameResult {
  dataUrl: string
  wasAutoRotated: boolean
  rotationApplied: number
}

export interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  isReady: boolean
  error: string | null
  facing: CameraFacing
  startCamera: (facing?: CameraFacing) => Promise<void>
  stopCamera: () => void
  flipCamera: () => void
  captureFrame: (maxWidth?: number, options?: CaptureFrameOptions) => CaptureFrameResult | null
}

function normalizeAngle(angle: number) {
  const normalized = ((angle % 360) + 360) % 360
  if (normalized === 270) return -90
  if (normalized === 180) return 180
  if (normalized === 90) return 90
  return 0
}

function getScreenRotationAngle() {
  if (typeof window === 'undefined') return 0

  const modernAngle = window.screen.orientation?.angle
  if (typeof modernAngle === 'number') return normalizeAngle(modernAngle)

  const legacyWindow = window as Window & { orientation?: number }
  if (typeof legacyWindow.orientation === 'number') return normalizeAngle(legacyWindow.orientation)

  return 0
}

export function useCamera(): UseCameraReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [facing, setFacing] = useState<CameraFacing>('environment')

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    setIsReady(false)
  }, [])

  const startCamera = useCallback(async (facingMode: CameraFacing = 'environment') => {
    stopCamera()
    setError(null)
    setIsReady(false)

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setIsReady(true)
        setFacing(facingMode)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Camera access failed'
      if (msg.includes('NotAllowedError') || msg.includes('Permission')) {
        setError('Camera permission denied. Please allow camera access and reload.')
      } else if (msg.includes('NotFoundError')) {
        setError('No camera found on this device.')
      } else {
        setError(`Camera error: ${msg}`)
      }
    }
  }, [stopCamera])

  const flipCamera = useCallback(() => {
    const next: CameraFacing = facing === 'environment' ? 'user' : 'environment'
    startCamera(next)
  }, [facing, startCamera])

  const captureFrame = useCallback((
    maxWidth = 1280,
    options: CaptureFrameOptions = {},
  ): CaptureFrameResult | null => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !isReady) return null

    const scale = maxWidth < video.videoWidth ? maxWidth / video.videoWidth : 1
    const drawWidth = Math.round(video.videoWidth * scale)
    const drawHeight = Math.round(video.videoHeight * scale)
    const screenAngle = getScreenRotationAngle()
    const shouldRotate = options.normalizeUpright === true && Math.abs(screenAngle) === 90

    canvas.width = shouldRotate ? drawHeight : drawWidth
    canvas.height = shouldRotate ? drawWidth : drawHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    if (shouldRotate) {
      const correctionAngle = -screenAngle
      ctx.save()
      ctx.translate(canvas.width / 2, canvas.height / 2)
      ctx.rotate((correctionAngle * Math.PI) / 180)
      ctx.drawImage(video, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight)
      ctx.restore()
      return {
        dataUrl: canvas.toDataURL('image/jpeg', 0.88),
        wasAutoRotated: true,
        rotationApplied: correctionAngle,
      }
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    return {
      dataUrl: canvas.toDataURL('image/jpeg', 0.88),
      wasAutoRotated: false,
      rotationApplied: 0,
    }
  }, [isReady])

  useEffect(() => {
    startCamera('environment')
    return () => stopCamera()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { videoRef, canvasRef, isReady, error, facing, startCamera, stopCamera, flipCamera, captureFrame }
}
