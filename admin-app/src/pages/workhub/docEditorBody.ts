function escapeDocumentBodyHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function documentBodyLooksLikeHtml(value: string): boolean {
  return /<\/?[a-z][\s\S]*>/i.test(value)
}

export function toDocumentBodyEditorHtml(value: string): string {
  const source = value || ''
  if (!source.trim()) return ''
  if (documentBodyLooksLikeHtml(source)) return source
  return escapeDocumentBodyHtml(source).replace(/\n/g, '<br>')
}

export function normalizeDocumentBodyForStorage(value: string): string {
  const trimmed = (value || '').trim()
  if (!trimmed) return ''
  if (trimmed === '<br>' || trimmed === '<div><br></div>' || trimmed === '<p><br></p>') return ''
  return value
}
