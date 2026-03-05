import type { QuizQuestion } from '../../types/quiz'
import { generateAndStoreAiImage } from './imageGen'

function buildQuizSummary(questions: QuizQuestion[]): string {
  return questions
    .slice(0, 8)
    .map((question) => {
      const options = Array.isArray((question as { options?: string[] }).options)
        ? ((question as { options?: string[] }).options || []).slice(0, 4).join(' | ')
        : ''
      const acceptedAnswers = Array.isArray((question as { acceptedAnswers?: string[] }).acceptedAnswers)
        ? ((question as { acceptedAnswers?: string[] }).acceptedAnswers || []).slice(0, 3).join(' | ')
        : ''
      const items = Array.isArray((question as { items?: string[] }).items)
        ? ((question as { items?: string[] }).items || []).slice(0, 4).join(' | ')
        : ''
      const pairs = Array.isArray((question as { pairs?: Array<{ left?: string; right?: string }> }).pairs)
        ? ((question as { pairs?: Array<{ left?: string; right?: string }> }).pairs || [])
          .slice(0, 3)
          .map((pair) => `${pair.left || ''}-${pair.right || ''}`)
          .join(' | ')
        : ''
      return [question.text, options, acceptedAnswers, items, pairs].filter(Boolean).join(' • ')
    })
    .join('\n')
}

export async function aiGenerateQuizCoverImage(params: { 
  title: string
  questions?: QuizQuestion[]
  quizSummary?: string
}): Promise<{ imageUrl: string; storagePath: string }> {
  return generateAndStoreAiCoverImage(params)
}

export async function generateAndStoreAiCoverImage(params: {
  title: string
  description?: string
  questions?: QuizQuestion[]
  quizSummary?: string
  quizId?: string
}): Promise<{ imageUrl: string; storagePath: string }> {
  const title = (params.title || '').trim()
  const descPart = (params.description || '').trim()
  const questionsPart = params.questions ? buildQuizSummary(params.questions) : ''
  const quizSummary = (params.quizSummary || '').trim()
    || [descPart, questionsPart].filter(Boolean).join('\n---\n')

  if (!title) {
    throw new Error('Title is required to generate a cover image.')
  }

  return generateAndStoreAiImage({ kind: 'cover', title, quizSummary, quizId: params.quizId })
}
