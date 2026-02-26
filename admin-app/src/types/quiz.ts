import type { QuestionTypeId } from '../config/questionTypes'

export type QuestionType = QuestionTypeId
export type ChallengePreset = 'easy' | 'classic' | 'hard'

export interface ChallengeSettings {
  rolePreviewMs?: number
  roleFreezeMs?: number
  wrongPenalty?: number
  bossTeamBonus?: number
  bossDamageMin?: number
  bossDamageMax?: number
  bossDamageDecay?: number
}

export interface QuizMedia {
  type: 'image' | 'gif' | 'video'
  url: string
}

export interface QuizQuestion {
  type: QuestionType
  text: string
  creatorTask?: 'draw' | 'arrange'
  creatorElements?: string[]
  media?: QuizMedia
  options?: string[]
  correctIndex?: number
  correctIndices?: number[]
  pairs?: Array<{ left: string; right: string }>
  items?: string[]
  correctOrder?: number[]
  acceptedAnswers?: string[]
  inputPlaceholder?: string
  bossName?: string
  bossHp?: number
  duration?: number
}

export interface QuizDoc {
  id?: string
  ownerId: string
  originalOwnerId?: string // Link to the original creator if cloned
  title: string
  slug: string
  description?: string
  visibility: 'public' | 'private'
  gameModeId?: string
  priceTier?: 'free' | 'starter' | 'pro'
  challengePreset?: ChallengePreset
  challengeSettings?: ChallengeSettings
  enableScholarRole?: boolean
  randomizeQuestions?: boolean
  coverImage?: string
  tags: string[]
  questions: QuizQuestion[]

  // Dashboard
  featured?: boolean   // admin-pinned to the welcome strip

  // Rating (future)
  rating?: { total: number; count: number }

  // Metadata/Stats
  createdAt?: any
  updatedAt?: any
  totalPlays?: number
  totalSessions?: number
  totalPlayers?: number
  shareCount?: number
}
