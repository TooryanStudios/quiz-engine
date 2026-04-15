import { type SyntheticEvent, useEffect, useMemo, useRef, useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import ReactCrop, { centerCrop, convertToPixelCrop, makeAspectCrop, type Crop, type PixelCrop } from 'react-image-crop'
import 'react-image-crop/dist/ReactCrop.css'
import { functions } from '../lib/firebase'
import './ImageCropDialog.css'

export type CropRatioPreset = {
  id: string
  label: string
  ratio: number
}

type ImageCropDialogProps = {
  isOpen: boolean
  imageSrc: string | null
  title?: string
  ratioPresets: CropRatioPreset[]
  onClose: () => void
  onConfirm: (blob: Blob) => Promise<void> | void
}

type CropImageForClientRequest = {
  imageUrl: string
  cropPixels: {
    x: number
    y: number
    width: number
    height: number
  }
  preferredMimeType?: string
}

type CropImageForClientResponse = {
  base64Image: string
  contentType: 'image/png' | 'image/jpeg'
}

const cropImageForClientCallable = httpsCallable<CropImageForClientRequest, CropImageForClientResponse>(
  functions,
  'cropImageForClient',
)

const DEFAULT_FREE_CROP: Crop = {
  unit: '%',
  x: 10,
  y: 10,
  width: 80,
  height: 80,
}

function getAspectRatio(ratio: number): number | undefined {
  return Number.isFinite(ratio) && ratio > 0 ? ratio : undefined
}

function inferExportMimeType(src: string): 'image/png' | 'image/jpeg' {
  const normalized = src.split('?')[0].toLowerCase()
  if (normalized.startsWith('data:image/png') || normalized.endsWith('.png')) {
    return 'image/png'
  }
  return 'image/jpeg'
}

function buildInitialCrop(mediaWidth: number, mediaHeight: number, aspectRatio: number | undefined): Crop {
  if (!aspectRatio) return DEFAULT_FREE_CROP
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 82,
      },
      aspectRatio,
      mediaWidth,
      mediaHeight,
    ),
    mediaWidth,
    mediaHeight,
  )
}

function normalizeCropError(error: unknown): string {
  if (error && typeof error === 'object') {
    const maybeCode = (error as { code?: unknown }).code
    if (typeof maybeCode === 'string') {
      if (maybeCode.includes('functions/not-found')) {
        return 'Crop fallback service is not deployed yet. Deploy Cloud Functions and retry.'
      }
      if (maybeCode.includes('functions/unauthenticated')) {
        return 'Sign in again and retry cropping.'
      }
    }
  }
  if (error instanceof DOMException && error.name === 'SecurityError') {
    return 'Image cropping is blocked by cross-origin security rules. Enable CORS for the storage host or re-upload via this app and retry.'
  }
  if (error instanceof Error && error.message) {
    return error.message
  }
  return 'Crop export failed.'
}

function toNaturalPixelCrop(image: HTMLImageElement, pixelCrop: PixelCrop): CropImageForClientRequest['cropPixels'] {
  const scaleX = image.naturalWidth / image.width
  const scaleY = image.naturalHeight / image.height
  return {
    x: Math.max(0, Math.round(pixelCrop.x * scaleX)),
    y: Math.max(0, Math.round(pixelCrop.y * scaleY)),
    width: Math.max(1, Math.round(pixelCrop.width * scaleX)),
    height: Math.max(1, Math.round(pixelCrop.height * scaleY)),
  }
}

function buildRenderedPixelCrop(image: HTMLImageElement, nextCrop: Crop): PixelCrop | null {
  if (image.width <= 0 || image.height <= 0) return null
  const pixelCrop = convertToPixelCrop(nextCrop, image.width, image.height)
  return pixelCrop.width > 0 && pixelCrop.height > 0 ? pixelCrop : null
}

function base64ToBlob(base64Data: string, mimeType: string): Blob {
  const binary = atob(base64Data)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new Blob([bytes], { type: mimeType })
}

async function cropViaCallableFallback(params: {
  imageUrl: string
  cropPixels: CropImageForClientRequest['cropPixels']
  preferredMimeType: 'image/png' | 'image/jpeg'
}): Promise<Blob> {
  const response = await cropImageForClientCallable({
    imageUrl: params.imageUrl,
    cropPixels: params.cropPixels,
    preferredMimeType: params.preferredMimeType,
  })
  const payload = response.data
  if (!payload?.base64Image || !payload?.contentType) {
    throw new Error('Server crop fallback returned invalid data.')
  }
  return base64ToBlob(payload.base64Image, payload.contentType)
}

async function getCroppedBlob(image: HTMLImageElement, pixelCrop: PixelCrop, mimeType: 'image/png' | 'image/jpeg'): Promise<Blob> {
  const canvas = document.createElement('canvas')
  const scaleX = image.naturalWidth / image.width
  const scaleY = image.naturalHeight / image.height
  const cropWidth = Math.max(1, Math.round(pixelCrop.width * scaleX))
  const cropHeight = Math.max(1, Math.round(pixelCrop.height * scaleY))

  canvas.width = cropWidth
  canvas.height = cropHeight

  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas is not available')

  context.imageSmoothingEnabled = true
  context.imageSmoothingQuality = 'high'

  context.drawImage(
    image,
    Math.round(pixelCrop.x * scaleX),
    Math.round(pixelCrop.y * scaleY),
    cropWidth,
    cropHeight,
    0,
    0,
    cropWidth,
    cropHeight,
  )

  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Crop export failed'))
          return
        }
        resolve(blob)
      }, mimeType, mimeType === 'image/jpeg' ? 0.92 : undefined)
    } catch (error) {
      reject(error)
    }
  })
}

export function ImageCropDialog({
  isOpen,
  imageSrc,
  title = 'Crop Image',
  ratioPresets,
  onClose,
  onConfirm,
}: ImageCropDialogProps) {
  const safePresets = useMemo(
    () => (ratioPresets.length > 0 ? ratioPresets : [{ id: 'free', label: 'Free', ratio: Number.NaN }]),
    [ratioPresets],
  )
  const defaultPresetId = useMemo(() => {
    const freePreset = safePresets.find((preset) => getAspectRatio(preset.ratio) == null)
    return freePreset?.id ?? safePresets[0].id
  }, [safePresets])

  const [presetId, setPresetId] = useState<string>(defaultPresetId)
  const [crop, setCrop] = useState<Crop>(DEFAULT_FREE_CROP)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<PixelCrop | null>(null)
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [cropError, setCropError] = useState<string | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const activeImageSrc = imageSrc ?? ''

  useEffect(() => {
    setPresetId(defaultPresetId)
    setCrop(DEFAULT_FREE_CROP)
    setCroppedAreaPixels(null)
    setImageDimensions(null)
    setCropError(null)
  }, [defaultPresetId, imageSrc])

  const selectedPreset = safePresets.find((preset) => preset.id === presetId) ?? safePresets[0]
  const selectedAspectRatio = getAspectRatio(selectedPreset.ratio)

  useEffect(() => {
    if (!imageDimensions || !imageRef.current) return
    const initialCrop = buildInitialCrop(imageDimensions.width, imageDimensions.height, selectedAspectRatio)
    setCrop(initialCrop)
    setCroppedAreaPixels(buildRenderedPixelCrop(imageRef.current, initialCrop))
  }, [imageDimensions, selectedAspectRatio])

  const handleImageLoad = (event: SyntheticEvent<HTMLImageElement>) => {
    imageRef.current = event.currentTarget
    setImageDimensions({
      width: event.currentTarget.naturalWidth,
      height: event.currentTarget.naturalHeight,
    })
  }

  const handleCropConfirm = async () => {
    if (!croppedAreaPixels || !imageRef.current || !activeImageSrc) return
    setSubmitting(true)
    setCropError(null)
    try {
      let blob: Blob
      try {
        blob = await getCroppedBlob(imageRef.current, croppedAreaPixels, inferExportMimeType(activeImageSrc))
      } catch (localCropError) {
        if (!(localCropError instanceof DOMException && localCropError.name === 'SecurityError')) {
          throw localCropError
        }
        blob = await cropViaCallableFallback({
          imageUrl: activeImageSrc,
          cropPixels: toNaturalPixelCrop(imageRef.current, croppedAreaPixels),
          preferredMimeType: inferExportMimeType(activeImageSrc),
        })
      }
      await onConfirm(blob)
    } catch (error) {
      setCropError(normalizeCropError(error))
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen || !activeImageSrc) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 12020,
        background: 'rgba(237, 242, 248, 0.88)',
        backdropFilter: 'blur(2px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 'min(900px, 97vw)',
          background: 'linear-gradient(180deg, #ffffff 0%, #f6f9fd 100%)',
          border: '1px solid #d5deea',
          borderRadius: '14px',
          overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(56, 74, 102, 0.22)',
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={{ padding: '0.9rem 1rem', borderBottom: '1px solid #d7e0eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.65rem' }}>
          <h3 style={{ margin: 0, color: '#1b365d', fontSize: '1rem' }}>{title}</h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: '1px solid #c9d6e6',
              borderRadius: '8px',
              background: '#ffffff',
              color: '#334155',
              padding: '0.35rem 0.55rem',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            X
          </button>
        </div>

        <div style={{ padding: '0.9rem 1rem 0.8rem', display: 'grid', gap: '0.75rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
            {safePresets.map((preset) => {
              const selected = preset.id === selectedPreset.id
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setPresetId(preset.id)}
                  style={{
                    border: selected ? '1px solid #0b5fff' : '1px solid #c9d6e6',
                    borderRadius: '999px',
                    background: selected ? 'rgba(11,95,255,0.12)' : '#ffffff',
                    color: selected ? '#0b5fff' : '#334155',
                    padding: '0.35rem 0.7rem',
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                  }}
                >
                  {preset.label}
                </button>
              )
            })}
          </div>

          <span style={{ color: '#516377', fontSize: '0.78rem', fontWeight: 700 }}>
            Drag corners or edges to resize. Drag inside the frame to position the crop exactly.
          </span>

          <div className="image-crop-dialog-cropper">
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={(pixelCrop) => setCroppedAreaPixels(pixelCrop.width > 0 && pixelCrop.height > 0 ? pixelCrop : null)}
              aspect={selectedAspectRatio}
              minWidth={40}
              minHeight={40}
              keepSelection
              ruleOfThirds
            >
              <img
                ref={imageRef}
                alt="Crop source"
                src={activeImageSrc}
                crossOrigin="anonymous"
                onLoad={handleImageLoad}
                onError={() => {
                  setCropError('Unable to load image for cropping.')
                  setCroppedAreaPixels(null)
                }}
                style={{
                  display: 'block',
                  width: 'auto',
                  height: 'auto',
                  maxWidth: '100%',
                  maxHeight: 'min(60vh, 460px)',
                  background: '#f5f8fc',
                }}
              />
            </ReactCrop>
          </div>

          {cropError && (
            <div
              role="alert"
              style={{
                border: '1px solid #efb3b3',
                background: '#fff3f3',
                color: '#9b1c1c',
                borderRadius: '8px',
                padding: '0.55rem 0.7rem',
                fontSize: '0.78rem',
                fontWeight: 600,
              }}
            >
              {cropError}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => {
                const nextCrop = buildInitialCrop(imageDimensions?.width ?? 1000, imageDimensions?.height ?? 1000, selectedAspectRatio)
                setCrop(nextCrop)
                setCroppedAreaPixels(imageRef.current ? buildRenderedPixelCrop(imageRef.current, nextCrop) : null)
              }}
              disabled={submitting}
              style={{
                border: '1px solid #c9d6e6',
                borderRadius: '8px',
                background: '#ffffff',
                color: '#334155',
                padding: '0.45rem 0.85rem',
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.6 : 1,
                fontWeight: 700,
              }}
            >
              Reset Frame
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.55rem', padding: '0.85rem 1rem 1rem', borderTop: '1px solid #d7e0eb' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{
              border: '1px solid #c9d6e6',
              borderRadius: '8px',
              background: '#ffffff',
              color: '#334155',
              padding: '0.45rem 0.85rem',
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.6 : 1,
              fontWeight: 700,
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => { void handleCropConfirm() }}
            disabled={submitting || !croppedAreaPixels}
            style={{
              border: '1px solid #0b5fff',
              borderRadius: '8px',
              background: '#0b5fff',
              color: '#ffffff',
              padding: '0.45rem 0.85rem',
              cursor: submitting ? 'not-allowed' : 'pointer',
              opacity: submitting ? 0.6 : 1,
              fontWeight: 700,
            }}
          >
            {submitting ? 'Processing...' : 'Use Cropped Image'}
          </button>
        </div>
      </div>
    </div>
  )
}
