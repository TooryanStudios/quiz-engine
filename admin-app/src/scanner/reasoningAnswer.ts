function normalizeText(text: string): string {
  return text.replace(/\r\n/g, '\n').trim()
}

function stripListPrefix(line: string): string {
  return line.replace(/^\s*(?:\d+[.)]|[-*•])\s+/, '').trim()
}

function truncateWords(line: string, maxWords: number): string {
  const words = line.trim().split(/\s+/).filter(Boolean)
  if (words.length <= maxWords) return line.trim()
  return `${words.slice(0, maxWords).join(' ')}...`
}

function makeConciseLines(answer: string): string {
  const sourceLines = normalizeText(answer)
    .split('\n')
    .map(stripListPrefix)
    .filter(Boolean)

  const lines = (sourceLines.length > 0 ? sourceLines : [normalizeText(answer)])
    .map((line) => {
      const firstSentence = line.split(/[.!?]\s+/)[0]?.trim() || line
      return truncateWords(firstSentence, 12)
    })
    .filter(Boolean)
    .slice(0, 4)

  if (lines.length === 0) return ''
  if (lines.length === 1) return lines[0]

  return lines.map((line, idx) => `${idx + 1}. ${line}`).join('\n')
}

function buildScenarioFallback(rawText: string): string {
  const has48HourWindow = /\b48\s*hours?\b/i.test(rawText)

  return [
    `1. Align stakeholders now${has48HourWindow ? ' and issue one message within 48 hours' : ''}.`,
    '2. Confirm root cause and owners in one rapid fact-check.',
    '3. Publish a recovery plan with milestones and accountable owners.',
    '4. Give daily status updates to leadership, partners, and media.',
  ].join('\n')
}

export function resolveReasoningAnswer(answer: string, rawText: string): string {
  const cleanedAnswer = normalizeText(answer)
  if (cleanedAnswer) return makeConciseLines(cleanedAnswer)

  const cleanedRawText = normalizeText(rawText)
  if (cleanedRawText) return makeConciseLines(buildScenarioFallback(cleanedRawText))

  return makeConciseLines([
    '1. Clarify the issue and desired outcome.',
    '2. Align stakeholders on priorities and ownership.',
    '3. Execute a time-bound action plan with checkpoints.',
  ].join('\n'))
}
