export type ScanMode = 'simplified' | 'reasoning'

export interface SimplifiedResult {
  mode: 'simplified'
  rawText: string
}

export interface ReasoningResult {
  mode: 'reasoning'
  rawText: string
  answer: string
  explanation: string
}

export type ScanResult = SimplifiedResult | ReasoningResult

// ── Simplified: extract text only, minimal tokens, fast ──────────────────────

const SIMPLIFIED_SYSTEM = `Extract all visible text from the image exactly as written.
Respond ONLY with valid JSON: {"rawText": "all text here verbatim"}
If no text is visible respond with: {"rawText": ""}`

// ── Reasoning: solve the problem in the image ─────────────────────────────────

const REASONING_SYSTEM = `You are an expert management and leadership advisor. The image contains a workplace scenario, management quiz, situational question, or behavioural competency challenge — or simply a block of text describing a situation.

Your job:
1. Extract the full text from the image.
2. Identify what is being asked or described — it may be a direct question, a scenario, a dilemma, or a situation with no explicit question.
3. Provide the BEST recommended approach, answer, or course of action:
   - If it is a direct question: answer it directly and concisely.
   - If it is a scenario or situation (no explicit question): recommend the best way to handle it — what a skilled manager or leader should do.
4. If there are multiple key points or steps, list them on separate lines starting with a number and a period (e.g. "1. Do this").
5. Keep answers very short and clear:
  - Use 1 to 4 points only.
  - Each point must be action-focused and <= 12 words.
  - No long explanation, no background detail.

Respond ONLY with valid JSON in this exact format:
{
  "rawText": "the full text extracted from the image exactly as written",
  "answer": "very short, clear recommendation; numbered lines if multiple points"
}

Never set answer to "". Always provide a recommendation based on whatever text is visible.`

const ANSWER_KEYS = [
  'answer',
  'recommendation',
  'recommendedAction',
  'bestApproach',
  'bestAction',
  'finalAnswer',
  'response',
  'solution',
  'actionPlan',
  'nextSteps',
]

function normalizeText(input: string): string {
  return input.replace(/\r\n/g, '\n').trim()
}

function toText(value: unknown): string {
  if (typeof value === 'string') return normalizeText(value)
  if (Array.isArray(value)) {
    const lines = value
      .map((item) => (typeof item === 'string' ? normalizeText(item) : ''))
      .filter(Boolean)
    if (lines.length === 0) return ''
    return lines
      .map((line, i) => (line.match(/^\d+[.)]\s+/) ? line : `${i + 1}. ${line}`))
      .join('\n')
  }
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>
    for (const key of ['steps', 'points', 'actions']) {
      const text = toText(obj[key])
      if (text) return text
    }
  }
  return ''
}

function buildFallbackManagementAnswer(): string {
  return [
    '1. Acknowledge the issue and stop public blame with one aligned message.',
    '2. Run a rapid cross-party fact check to confirm root cause, dependencies, and timeline.',
    '3. Publish a 48-hour recovery plan with owners, deadlines, and escalation points.',
    '4. Brief stakeholders and media with clear next milestones and daily status updates.',
  ].join('\n')
}

function extractReasoningAnswer(parsed: Record<string, unknown>): string {
  for (const key of ANSWER_KEYS) {
    const text = toText(parsed[key])
    if (text) return text
  }
  return ''
}

function extractRawText(parsed: Record<string, unknown>): string {
  for (const key of ['rawText', 'text', 'question', 'scenario']) {
    const text = toText(parsed[key])
    if (text) return text
  }
  return ''
}

export async function scanImage(
  base64DataUrl: string,
  apiKey: string,
  mode: ScanMode = 'simplified',
): Promise<ScanResult> {
  const base64 = base64DataUrl.replace(/^data:image\/\w+;base64,/, '')

  const systemPrompt = mode === 'simplified' ? SIMPLIFIED_SYSTEM : REASONING_SYSTEM
  const maxTokens = mode === 'simplified' ? 400 : 800

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64}`,
                detail: mode === 'simplified' ? 'low' : 'high',
              },
            },
            {
              type: 'text',
              text: mode === 'simplified'
                ? 'Extract all text.'
                : 'Extract and solve this content. If it is a scenario with no direct question, provide the best management action plan.',
            },
          ],
        },
      ],
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    const msg = (err as { error?: { message?: string } }).error?.message ?? response.statusText
    if (response.status === 401) throw new Error('Invalid API key. Check the VITE_OPENAI_API_KEY environment variable.')
    if (response.status === 429) throw new Error('Rate limit reached. Please wait a moment and try again.')
    throw new Error(`OpenAI error: ${msg}`)
  }

  const data = await response.json() as {
    choices: Array<{ message: { content: string } }>
  }

  const content = data.choices[0]?.message?.content ?? ''
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Could not parse AI response. Try again.')

  try {
    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>
    if (mode === 'simplified') {
      return { mode: 'simplified', rawText: extractRawText(parsed) }
    } else {
      const rawText = extractRawText(parsed)
      const answer = extractReasoningAnswer(parsed) || buildFallbackManagementAnswer()
      return {
        mode: 'reasoning',
        rawText,
        answer,
        explanation: '',
      }
    }
  } catch {
    throw new Error('AI returned an unexpected format. Try again.')
  }
}

