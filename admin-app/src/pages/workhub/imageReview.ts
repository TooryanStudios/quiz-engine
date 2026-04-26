export type WorkhubImageMarkerType = 'point' | 'line' | 'checkbox' | 'freehand'

export interface WorkhubImagePathPoint {
  x: number
  y: number
}

export interface WorkhubImageComment {
  id: string
  author: string
  text: string
  createdAt: string
}

export interface WorkhubImageMarker {
  id: string
  type: WorkhubImageMarkerType
  x: number
  y: number
  x2?: number
  y2?: number
  path?: WorkhubImagePathPoint[]
  text?: string
  checked?: boolean
  resolved?: boolean
  createdBy?: string
  createdAt?: string
}

export interface WorkhubImageModificationCheck {
  id: string
  label: string
  done: boolean
  createdBy: string
  createdAt: string
}

export interface WorkhubImageReview {
  notes: string
  comments: WorkhubImageComment[]
  markers: WorkhubImageMarker[]
  modificationChecks: WorkhubImageModificationCheck[]
}

export const ATTACHMENT_REVIEW_STORAGE_KEY = 'workhub_attachment_reviews_v1'

export function createEmptyImageReview(): WorkhubImageReview {
  return {
    notes: '',
    comments: [],
    markers: [],
    modificationChecks: [],
  }
}
