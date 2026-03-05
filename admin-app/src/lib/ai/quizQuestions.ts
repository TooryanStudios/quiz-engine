import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase'

export type AiContextFile = { name: string; type: string; data: string }

export type GenerateQuizQuestionsRequest = {
  promptText: string
  questionCount: number
  contextFiles?: AiContextFile[]
}

export type GenerateQuizQuestionsResponse = {
  title?: string
  questions: unknown[]
  extractedText?: string
  creditsRemaining: number
}

export async function generateQuizQuestions(params: GenerateQuizQuestionsRequest): Promise<GenerateQuizQuestionsResponse> {
  const callable = httpsCallable<GenerateQuizQuestionsRequest, GenerateQuizQuestionsResponse>(functions, 'generateQuizQuestions')
  const result = await callable(params)
  const data = result.data
  if (!data || !Array.isArray(data.questions)) {
    throw new Error('AI returned an invalid response.')
  }
  return data
}
