import { useMemo, useState } from 'react'
import Cropper, { type Area } from 'react-easy-crop'
import 'react-easy-crop/react-easy-crop.css'

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

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Image load failed'))
    image.src = src
  })
}

async function getCroppedBlob(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = await loadImage(imageSrc)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(pixelCrop.width))
  canvas.height = Math.max(1, Math.round(pixelCrop.height))

  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas is not available')

  context.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    canvas.width,
    canvas.height,
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('Crop export failed'))
        return
      }
      resolve(blob)
    }, 'image/jpeg', 0.92)
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
  const safePresets = useMemo(() => (ratioPresets.length > 0 ? ratioPresets : [{ id: 'square', label: 'Square 1:1', ratio: 1 }]), [ratioPresets])
  const [presetId, setPresetId] = useState<string>(safePresets[0].id)
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!isOpen || !imageSrc) return null

  const selectedPreset = safePresets.find((preset) => preset.id === presetId) ?? safePresets[0]

  const handleCropConfirm = async () => {
    if (!croppedAreaPixels) return
    setSubmitting(true)
    try {
      const blob = await getCroppedBlob(imageSrc, croppedAreaPixels)
      await onConfirm(blob)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 12020,
        background: 'rgba(2, 6, 23, 0.78)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: 'min(860px, 96vw)',
          background: 'linear-gradient(180deg, var(--bg-deep) 0%, var(--bg-surface) 100%)',
          border: '1px solid var(--border)',
          borderRadius: '14px',
          overflow: 'hidden',
          boxShadow: '0 24px 80px rgba(2, 6, 23, 0.55)',
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={{ padding: '0.9rem 1rem', borderBottom: '1px solid var(--border-strong)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.65rem' }}>
          <h3 style={{ margin: 0, color: 'var(--text-bright)', fontSize: '1rem' }}>{title}</h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: '1px solid var(--border-strong)',
              borderRadius: '8px',
              background: 'var(--bg-surface)',
              color: 'var(--text)',
              padding: '0.35rem 0.55rem',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            ✕
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
                    border: selected ? '1px solid var(--text-bright)' : '1px solid var(--border-strong)',
                    borderRadius: '999px',
                    background: selected ? 'rgba(59,130,246,0.18)' : 'var(--bg-surface)',
                    color: selected ? 'var(--text-bright)' : 'var(--text)',
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

          <div style={{ position: 'relative', width: '100%', height: 'min(60vh, 420px)', borderRadius: '10px', overflow: 'hidden', background: '#0b1020' }}>
            <Cropper
              image={imageSrc}
              crop={crop}
              zoom={zoom}
              aspect={selectedPreset.ratio}
              onCropChange={setCrop}
              onZoomChange={setZoom}
              onCropComplete={(_, croppedPixels) => setCroppedAreaPixels(croppedPixels)}
              objectFit="horizontal-cover"
              showGrid
            />
          </div>

          <div style={{ display: 'grid', gap: '0.35rem' }}>
            <label style={{ color: 'var(--text-mid)', fontSize: '0.78rem', fontWeight: 700 }}>Zoom</label>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.55rem', padding: '0.85rem 1rem 1rem', borderTop: '1px solid var(--border-strong)' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            style={{
              border: '1px solid var(--border-strong)',
              borderRadius: '8px',
              background: 'var(--bg-surface)',
              color: 'var(--text)',
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
              border: '1px solid var(--text-bright)',
              borderRadius: '8px',
              background: 'var(--text-bright)',
              color: '#fff',
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
