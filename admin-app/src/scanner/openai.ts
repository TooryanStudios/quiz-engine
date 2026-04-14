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

const REASONING_SYSTEM = `You are a problem-solving AI. The image contains a question, quiz, math problem, exam question, or any problem that needs to be solved.
1. Read the full question/problem from the image.
2. Solve it step by step.
3. Give the final answer clearly.

Respond ONLY with valid JSON in this exact format:
{
  "rawText": "the full question/problem text as written in the image",
  "answer": "the final answer — concise and direct",
  "explanation": "brief step-by-step reasoning (2-4 sentences max)"
}

If the image does not contain a solvable problem, set answer to "" and explanation to "No solvable problem detected."`

export async function scanImage(
  base64DataUrl: string,
  apiKey: string,
  mode: ScanMode = 'simplified',
): Promise<ScanResult> {
  const base64 = base64DataUrl.replace(/^data:image\/\w+;base64,/, '')

  const systemPrompt = mode === 'simplified' ? SIMPLIFIED_SYSTEM : REASONING_SYSTEM
  const maxTokens = mode === 'simplified' ? 400 : 900

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
                : 'Read and solve the problem in this image.',
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
    const parsed = JSON.parse(jsonMatch[0]) as Record<string, string>
    if (mode === 'simplified') {
      return { mode: 'simplified', rawText: parsed.rawText ?? '' }
    } else {
      return {
        mode: 'reasoning',
        rawText: parsed.rawText ?? '',
        answer: parsed.answer ?? '',
        explanation: parsed.explanation ?? '',
      }
    }
  } catch {
    throw new Error('AI returned an unexpected format. Try again.')
  }
}

