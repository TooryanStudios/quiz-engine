import { GoogleGenerativeAI } from '@google/generative-ai'
import type { QuizQuestion } from '../../types/quiz'

export async function generateAiCoverImageUrl(params: {
  apiKey: string
  title: string
  questions: QuizQuestion[]
}): Promise<string> {
  const { apiKey, title, questions } = params

  const titleContext = title.trim()
  const questionContext = questions
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

  const fallbackKeywords = titleContext || 'quiz cover education'

  const prompt = `You generate concise image-search keywords for a quiz cover.
Use the quiz title first; if title is weak/empty, infer the theme from questions/options/answers.
Return ONLY JSON: {"keywords":"..."}
Rules:
- 2 to 6 English words for keywords.
- No punctuation other than spaces.
- Must match the quiz theme exactly.

Quiz title: ${titleContext || '(empty)'}
Quiz content:
${questionContext || '(no questions yet)'}
`

  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
  const result = await model.generateContent(prompt)
  let text = result.response.text().trim()
  text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  let keywords = fallbackKeywords
  try {
    const parsed = JSON.parse(text) as { keywords?: string }
    if (parsed.keywords && parsed.keywords.trim()) keywords = parsed.keywords.trim()
  } catch {
    if (text) keywords = text.replace(/[{}"\n]/g, ' ').trim() || fallbackKeywords
  }

  const query = encodeURIComponent(keywords)
  return `https://source.unsplash.com/800x450/?${query}`
}
