import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase'
import { generateAndStoreAiImage } from './imageGen'
import type { QuizQuestion } from '../../types/quiz'

type CheckQuestionCorrectnessRequest = {
  questionText: string
  answerSummary?: string
}

type CheckQuestionCorrectnessResponse = {
  verdict: 'ok' | 'issues' | 'uncertain'
  summary: string
  issues: string[]
  suggestions: string[]
  creditsRemaining: number
}

function buildAnswerSummary(question: QuizQuestion): string {
  if (Array.isArray(question.options) && typeof question.correctIndex === 'number') {
    const correct = question.options[question.correctIndex] ?? ''
    return `Options: ${question.options.slice(0, 8).join(' | ')}; Correct: ${correct}`
  }

  if (Array.isArray(question.correctIndices) && Array.isArray(question.options)) {
    const correct = question.correctIndices
      .map((i) => question.options?.[i])
      .filter(Boolean)
      .slice(0, 6)
      .join(' | ')
    return `Options: ${question.options.slice(0, 10).join(' | ')}; Correct: ${correct}`
  }

  if (Array.isArray(question.acceptedAnswers) && question.acceptedAnswers.length > 0) {
    return `Accepted answers: ${question.acceptedAnswers.slice(0, 10).join(' | ')}`
  }

  if (Array.isArray(question.items) && Array.isArray(question.correctOrder) && question.correctOrder.length > 0) {
    const ordered = question.correctOrder
      .map((i) => question.items?.[i])
      .filter(Boolean)
      .slice(0, 10)
      .join(' → ')
    return `Items: ${question.items.slice(0, 12).join(' | ')}; Correct order: ${ordered}`
  }

  if (Array.isArray(question.pairs) && question.pairs.length > 0) {
    const sample = question.pairs
      .slice(0, 6)
      .map((p) => `${p.left} ↔ ${p.right}`)
      .join(' | ')
    return `Pairs: ${sample}`
  }

  return ''
}

export async function aiCheckQuestionCorrectness(question: QuizQuestion) {
  const callable = httpsCallable<CheckQuestionCorrectnessRequest, CheckQuestionCorrectnessResponse>(
    functions,
    'checkQuestionCorrectness'
  )

  const questionText = (question.text || '').trim()
  const answerSummary = buildAnswerSummary(question)

  const result = await callable({ questionText, answerSummary })
  const data = result.data

  if (!data || !data.verdict || typeof data.summary !== 'string') {
    throw new Error('AI check returned an invalid response.')
  }

  return data
}

export async function aiGenerateQuestionMediaImage(
  question: QuizQuestion,
  opts?: { quizId?: string; quizTitle?: string; quizDescription?: string; otherQuestions?: QuizQuestion[] },
): Promise<{ imageUrl: string; storagePath: string }> {
  const questionText = (question.text || '').trim()
  const answerSummary = buildAnswerSummary(question)

  if (!questionText) {
    throw new Error('Question text is required to generate an image.')
  }

  // Build rich context so the image model understands the full quiz topic
  const contextParts: string[] = []
  if (opts?.quizTitle) contextParts.push(`Quiz: ${opts.quizTitle.trim()}`)
  if (opts?.quizDescription) contextParts.push(`Description: ${opts.quizDescription.trim()}`)
  if (opts?.otherQuestions && opts.otherQuestions.length > 0) {
    const sample = opts.otherQuestions
      .filter((q) => q.text && q.text !== question.text)
      .slice(0, 5)
      .map((q) => q.text.trim())
      .join(' | ')
    if (sample) contextParts.push(`Other questions in quiz: ${sample}`)
  }
  const quizContext = contextParts.join('\n')

  return generateAndStoreAiImage({
    kind: 'question_media',
    questionText,
    answerSummary,
    quizContext: quizContext || undefined,
    quizId: opts?.quizId,
  })
}
