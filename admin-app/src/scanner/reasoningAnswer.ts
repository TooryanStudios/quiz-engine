function normalizeText(text: string): string {
  return text.replace(/\r\n/g, '\n').trim()
}

function buildScenarioFallback(rawText: string): string {
  const has48HourWindow = /\b48\s*hours?\b/i.test(rawText)

  return [
    `1. Stabilize communication immediately${has48HourWindow ? ' and issue one aligned message within 48 hours' : ''}.`,
    '2. Run a rapid joint fact check with stakeholders to confirm root causes and ownership.',
    '3. Publish a recovery plan with milestones, owners, and daily checkpoints.',
    '4. Brief leadership, partners, and media with transparent status and next actions.',
  ].join('\n')
}

export function resolveReasoningAnswer(answer: string, rawText: string): string {
  const cleanedAnswer = normalizeText(answer)
  if (cleanedAnswer) return cleanedAnswer

  const cleanedRawText = normalizeText(rawText)
  if (cleanedRawText) return buildScenarioFallback(cleanedRawText)

  return [
    '1. Clarify the issue and desired outcome.',
    '2. Align stakeholders on priorities and ownership.',
    '3. Execute a time-bound action plan with checkpoints.',
  ].join('\n')
}
