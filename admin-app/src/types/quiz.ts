export type QuestionType = 'single' | 'multi' | 'match' | 'order' | 'type' | 'boss'
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
  title: string
  slug: string
  description?: string
  visibility: 'public' | 'private'
  priceTier?: 'free' | 'starter' | 'pro'
  challengePreset?: ChallengePreset
  challengeSettings?: ChallengeSettings
  tags: string[]
  questions: QuizQuestion[]
  createdAt?: unknown
  updatedAt?: unknown
}
