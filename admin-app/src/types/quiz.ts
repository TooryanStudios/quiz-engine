export type QuestionType = 'single' | 'multi' | 'match' | 'order'

export interface QuizMedia {
  type: 'image' | 'gif' | 'video'
  url: string
}

export interface QuizQuestion {
  type: QuestionType
  text: string
  media?: QuizMedia
  options?: string[]
  correctIndex?: number
  correctIndices?: number[]
  pairs?: Array<{ left: string; right: string }>
  items?: string[]
  correctOrder?: number[]
  duration?: number
}

export interface QuizDoc {
  id?: string
  ownerId: string
  title: string
  slug: string
  description?: string
  visibility: 'public' | 'private'
  priceTier?: 'free' | 'starter' | 'pro'
  tags: string[]
  questions: QuizQuestion[]
  createdAt?: unknown
  updatedAt?: unknown
}
