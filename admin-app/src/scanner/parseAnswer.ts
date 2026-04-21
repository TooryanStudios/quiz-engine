export interface ParsedItem { badge: string; text: string }

export function parseAnswerItems(answer: string): ParsedItem[] | null {
  const lines = answer.split('\n').map(l => l.trim()).filter(Boolean)
  if (lines.length < 2) return null
  const items: ParsedItem[] = []
  for (const line of lines) {
    const numbered = line.match(/^(\d+[.):]?)\s+(.+)/)
    const bulleted = line.match(/^[-•*►]\s+(.+)/)
    if (numbered) {
      items.push({ badge: numbered[1].replace(/[.):]/g, ''), text: numbered[2] })
    } else if (bulleted) {
      items.push({ badge: '•', text: bulleted[1] })
    } else {
      items.push({ badge: '•', text: line })
    }
  }
  return items.length >= 2 ? items : null
}
