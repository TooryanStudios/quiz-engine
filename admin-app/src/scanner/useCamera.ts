import { useRef, useState, useCallback, useEffect } from 'react'

export type CameraFacing = 'environment' | 'user'

export interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  isReady: boolean
  error: string | null
  facing: CameraFacing
  startCamera: (facing?: CameraFacing) => Promise<void>
  stopCamera: () => void
  flipCamera: () => void
  captureFrame: () => string | null
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

  const captureFrame = useCallback((): string | null => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || !isReady) return null

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    return canvas.toDataURL('image/jpeg', 0.92)
  }, [isReady])

  useEffect(() => {
    startCamera('environment')
    return () => stopCamera()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  return { videoRef, canvasRef, isReady, error, facing, startCamera, stopCamera, flipCamera, captureFrame }
}
