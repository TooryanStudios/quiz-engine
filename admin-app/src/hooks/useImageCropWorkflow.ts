import { useMemo, useState } from 'react'
import type { CropRatioPreset } from '../components/ImageCropDialog'

export type ImageCropTarget = {
  imageId: string
  imageUrl: string
}

export type ApplyImageCropInput = {
  blob: Blob
  imageId: string
  imageUrl: string
}

type UseImageCropWorkflowOptions = {
  ratioPresets?: CropRatioPreset[]
  onApplyCrop: (input: ApplyImageCropInput) => Promise<void> | void
  onError?: (error: unknown) => void
}

const DEFAULT_RATIO_PRESETS: CropRatioPreset[] = [
  { id: 'free', label: 'Free', ratio: Number.NaN },
  { id: '1:1', label: 'Square 1:1', ratio: 1 },
  { id: '4:3', label: '4:3', ratio: 4 / 3 },
  { id: '16:9', label: '16:9', ratio: 16 / 9 },
  { id: '3:4', label: '3:4 Portrait', ratio: 3 / 4 },
  { id: '9:16', label: '9:16 Portrait', ratio: 9 / 16 },
]

export function useImageCropWorkflow({
  ratioPresets,
  onApplyCrop,
  onError,
}: UseImageCropWorkflowOptions) {
  const [target, setTarget] = useState<ImageCropTarget | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const activeRatioPresets = useMemo(
    () => (ratioPresets && ratioPresets.length > 0 ? ratioPresets : DEFAULT_RATIO_PRESETS),
    [ratioPresets],
  )

  async function confirmCrop(blob: Blob) {
    if (!target || submitting) return
    setSubmitting(true)
    try {
      await onApplyCrop({
        blob,
        imageId: target.imageId,
        imageUrl: target.imageUrl,
      })
      setTarget(null)
    } catch (error) {
      onError?.(error)
    } finally {
      setSubmitting(false)
    }
  }

  function openCrop(imageId: string, imageUrl: string) {
    setTarget({ imageId, imageUrl })
  }

  function closeCrop() {
    setTarget(null)
  }

  return {
    isOpen: !!target,
    imageSrc: target?.imageUrl ?? null,
    ratioPresets: activeRatioPresets,
    submitting,
    openCrop,
    closeCrop,
    confirmCrop,
  }
}
