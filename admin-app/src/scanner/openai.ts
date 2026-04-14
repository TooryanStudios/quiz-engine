export interface ScanResult {
  rawText: string
  structured: StructuredField[]
  summary: string
}

export interface StructuredField {
  label: string
  value: string
}

const SYSTEM_PROMPT = `You are a document scanner AI. The user will provide an image.
Your job is to:
1. Extract ALL visible text from the image accurately.
2. Identify and structure key fields (names, dates, amounts, addresses, IDs, totals, labels, etc.).
3. Write a one-sentence summary of what the document/image is.

Respond ONLY with valid JSON in this exact format:
{
  "rawText": "all extracted text here, verbatim",
  "structured": [
    { "label": "Field Name", "value": "extracted value" }
  ],
  "summary": "One sentence description of what this document/image is."
}

If no text is visible, set rawText to "" and structured to [].`

export async function scanImage(base64DataUrl: string, apiKey: string): Promise<ScanResult> {
  const base64 = base64DataUrl.replace(/^data:image\/\w+;base64,/, '')

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 1500,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64}`,
                detail: 'high',
              },
            },
            { type: 'text', text: 'Please extract and structure all text from this image.' },
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
  if (!jsonMatch) throw new Error('Could not parse response from AI. Try scanning again.')

  try {
    return JSON.parse(jsonMatch[0]) as ScanResult
  } catch {
    throw new Error('AI returned an unexpected format. Try scanning again.')
  }
}
