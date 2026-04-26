const SCANNER_LOCAL_STORAGE_KEY = 'scanner_openai_key'
const MAX_IMAGE_FILE_BYTES = 8 * 1024 * 1024
const MAX_TEXT_FILE_BYTES = 2 * 1024 * 1024
const MAX_ATTACHMENT_TEXT_CHARS = 12000
const MAX_DOCUMENT_CONTEXT_CHARS = 20000

export type DocumentChatAttachment = {
  name: string
  mimeType: string
  kind: 'image' | 'text'
  content: string
}

export type RunDocumentChatParams = {
  prompt: string
  documentTitle: string
  documentBody: string
  activeTabTitle?: string
  selectedText?: string
  targetScope?: 'selection' | 'tab'
  responseMode?: 'text' | 'html'
  assistantMode?: 'edit' | 'discuss'
  preferContextLanguage?: boolean
  conversationHistory?: Array<{
    role: 'user' | 'assistant'
    content: string
  }>
  attachments?: DocumentChatAttachment[]
}

type PreferredReplyLanguage = {
  label: 'Arabic' | 'English'
  source: 'selected text' | 'current draft'
}

function readLocalStorageKey(key: string) {
  if (typeof window === 'undefined') return ''
  try {
    return window.localStorage.getItem(key)?.trim() ?? ''
  } catch {
    return ''
  }
}

function escapeForPrompt(value: string) {
  return value.replace(/```/g, "'''")
}

function clampText(value: string, maxChars: number) {
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (normalized.length <= maxChars) return normalized
  return `${normalized.slice(0, maxChars).trimEnd()}…`
}

function stripHtml(value: string) {
  if (!value.trim()) return ''

  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser()
    const doc = parser.parseFromString(value, 'text/html')
    return doc.body.textContent?.replace(/\s+/g, ' ').trim() ?? ''
  }

  return value
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function countMatches(value: string, pattern: RegExp) {
  return value.match(pattern)?.length ?? 0
}

function detectPreferredReplyLanguage(params: RunDocumentChatParams): PreferredReplyLanguage | null {
  if (!params.preferContextLanguage) return null

  const selectedText = params.selectedText?.trim() || ''
  const targetScope = params.targetScope ?? (selectedText ? 'selection' : 'tab')
  const source: PreferredReplyLanguage['source'] = targetScope === 'selection' && selectedText
    ? 'selected text'
    : 'current draft'

  const candidateText = source === 'selected text'
    ? stripHtml(selectedText)
    : stripHtml([params.documentTitle, params.activeTabTitle, params.documentBody].filter(Boolean).join('\n\n'))

  const normalizedText = clampText(candidateText, MAX_DOCUMENT_CONTEXT_CHARS)
  if (!normalizedText) return null

  const arabicCount = countMatches(normalizedText, /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g)
  const latinCount = countMatches(normalizedText, /[A-Za-z]/g)

  if (arabicCount === 0 && latinCount === 0) return null
  if (arabicCount === 0) return { label: 'English', source }
  if (latinCount === 0) return { label: 'Arabic', source }

  return arabicCount >= latinCount
    ? { label: 'Arabic', source }
    : { label: 'English', source }
}

function buildPrompt(params: RunDocumentChatParams) {
  const documentTitle = params.documentTitle.trim() || 'Untitled document'
  const activeTabTitle = params.activeTabTitle?.trim() || ''
  const selectedText = params.selectedText?.trim() || ''
  const targetScope = params.targetScope ?? (selectedText ? 'selection' : 'tab')
  const responseMode = params.responseMode ?? 'text'
  const assistantMode = params.assistantMode ?? 'edit'
  const preferContextLanguage = Boolean(params.preferContextLanguage)
  const preferredReplyLanguage = detectPreferredReplyLanguage(params)
  const documentBody = clampText(stripHtml(params.documentBody), MAX_DOCUMENT_CONTEXT_CHARS)
  const textAttachments = (params.attachments || [])
    .filter((attachment) => attachment.kind === 'text')
    .map((attachment) => {
      const attachmentText = clampText(attachment.content, MAX_ATTACHMENT_TEXT_CHARS)
      return [
        `Attachment: ${attachment.name}`,
        `Type: ${attachment.mimeType}`,
        attachmentText,
      ].join('\n')
    })

  return [
    assistantMode === 'discuss'
      ? 'You are collaborating with a user inside a work document editor. The user wants discussion, ideation, problem-solving, and feedback, not automatic rewriting unless they explicitly ask for it.'
      : 'You are assisting with editing a work document inside an admin application.',
    preferContextLanguage
      ? preferredReplyLanguage
        ? `Use the current document context carefully. Required output language: ${preferredReplyLanguage.label}. Match the language used in the ${preferredReplyLanguage.source}, not the instruction language. Only switch output languages if the user explicitly asks for translation or another output language.`
        : 'Use the current document context carefully. Follow the language already used in the relevant document context instead of the instruction language unless the user explicitly asks for a different output language.'
      : 'Use the current document context carefully and answer in the same language as the user unless the user explicitly asks otherwise.',
    assistantMode === 'discuss'
      ? 'Treat the document and any selected text as context for reasoning. Give useful ideas, options, tradeoffs, structure, critique, or recommendations. Do not default to returning a paste-ready rewrite unless the user specifically asks for one.'
      : responseMode === 'html'
        ? targetScope === 'selection'
          ? 'The selected text is the only editing target. Use the rest of the document only as background context and return only a valid HTML fragment for the replacement with no markdown fences, commentary, script tags, style tags, or full html/body wrappers.'
          : 'The full current tab content is the editing target. Return only a valid HTML fragment for the revised tab with no markdown fences, commentary, script tags, style tags, or full html/body wrappers.'
        : targetScope === 'selection'
          ? 'The selected text is the only editing target. Use the rest of the document only as background context and return only the replacement text with no preface, bullets, quotes, or markdown fences.'
          : 'The full current tab content is the editing target. Return only the full revised replacement text for the tab with no preface, bullets, quotes, or markdown fences.',
    responseMode === 'html'
      ? 'Allowed HTML tags are: p, br, strong, em, b, i, u, ul, ol, li, table, thead, tbody, tr, th, td. For TinyMCE checklists, use <ul class="tox-checklist"> with <li> items when explicitly requested.'
      : '',
    assistantMode === 'discuss'
      ? 'The user may be brainstorming or working through a problem. Be direct, practical, and collaborative. When useful, present options with implications.'
      : 'If the user asks a general question, answer directly and keep the response useful for pasting back into the document when relevant.',
    preferContextLanguage
      ? preferredReplyLanguage
        ? `Language preference override: always answer in ${preferredReplyLanguage.label} because that is the language of the ${preferredReplyLanguage.source}. Do not switch to the instruction language unless the user explicitly requests that change.`
        : 'Language preference override: follow the language already used in the selected text or current draft. Do not switch to the instruction language unless the user explicitly requests that change.'
      : '',
    '',
    `Document title: ${escapeForPrompt(documentTitle)}`,
    activeTabTitle ? `Active tab: ${escapeForPrompt(activeTabTitle)}` : '',
    documentBody ? `Document context:\n${escapeForPrompt(documentBody)}` : 'Document context: (empty)',
    selectedText ? `Selected text:\n${escapeForPrompt(selectedText)}` : 'Selected text: (none)',
    preferContextLanguage
      ? preferredReplyLanguage
        ? `Preferred reply language: ${preferredReplyLanguage.label} (from ${preferredReplyLanguage.source})`
        : `Preferred reply language source: ${targetScope === 'selection' ? 'Selected text' : 'Current draft/document context'}`
      : '',
    assistantMode === 'discuss'
      ? `Primary context focus: ${targetScope === 'selection' ? 'Selected text plus document context' : 'Entire current tab plus document context'}`
      : `Editing target: ${targetScope === 'selection' ? 'Selected text only' : 'Entire current tab'}`,
    textAttachments.length > 0 ? `Attached text context:\n${textAttachments.map(escapeForPrompt).join('\n\n---\n\n')}` : 'Attached text context: (none)',
    '',
    `User request:\n${escapeForPrompt(params.prompt.trim())}`,
  ].filter(Boolean).join('\n')
}

export function getDocumentChatApiKey() {
  return readLocalStorageKey(SCANNER_LOCAL_STORAGE_KEY)
}

export function hasDocumentChatApiKey() {
  return !!getDocumentChatApiKey()
}

export async function readDocumentChatAttachment(file: File): Promise<DocumentChatAttachment> {
  const mimeType = file.type || 'application/octet-stream'

  if (mimeType.startsWith('image/')) {
    if (file.size > MAX_IMAGE_FILE_BYTES) {
      throw new Error(`${file.name} is too large. Image attachments must be 8 MB or smaller.`)
    }

    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result || ''))
      reader.onerror = () => reject(new Error(`Could not read ${file.name}.`))
      reader.readAsDataURL(file)
    })

    return {
      name: file.name,
      mimeType,
      kind: 'image',
      content: dataUrl,
    }
  }

  const isTextLike = mimeType.startsWith('text/')
    || mimeType === 'application/json'
    || mimeType === 'application/xml'
    || mimeType === 'text/csv'
    || mimeType === 'application/javascript'

  if (!isTextLike) {
    throw new Error(`${file.name} is not supported yet. Use images or text-based files for now.`)
  }

  if (file.size > MAX_TEXT_FILE_BYTES) {
    throw new Error(`${file.name} is too large. Text attachments must be 2 MB or smaller.`)
  }

  const text = await file.text()

  return {
    name: file.name,
    mimeType,
    kind: 'text',
    content: text,
  }
}

export async function runDocumentChat(params: RunDocumentChatParams): Promise<string> {
  const apiKey = getDocumentChatApiKey()
  if (!apiKey) {
    throw new Error('OpenAI API key is not configured.')
  }

  const promptText = buildPrompt(params)
  const preferredReplyLanguage = detectPreferredReplyLanguage(params)
  const attachments = params.attachments || []
  const userContent: Array<Record<string, unknown>> = [{
    type: 'text',
    text: promptText,
  }]

  attachments.forEach((attachment) => {
    if (attachment.kind !== 'image') return
    userContent.push({
      type: 'image_url',
      image_url: {
        url: attachment.content,
        detail: 'high',
      },
    })
  })

  const baseSystemInstruction = params.assistantMode === 'discuss'
    ? 'You are a collaborative thinking partner inside a document editor. Help the user explore ideas, compare options, identify tradeoffs, and solve problems. Stay grounded in the provided document context. Do not turn every reply into a rewrite unless the user explicitly asks for rewritten text.'
    : params.responseMode === 'html'
      ? 'You help users edit documents precisely and safely. When HTML is requested, return only a safe HTML fragment with no scripts, styles, markdown fences, or full html/body wrappers. Prefer simple semantic tags and preserve the user\'s meaning.'
      : 'You help users edit documents precisely and safely. Prefer concise, production-ready wording. Never include markdown fences unless the user explicitly asks for code formatting.'

  const languageSystemInstruction = preferredReplyLanguage
    ? `Required output language: ${preferredReplyLanguage.label}. Match the language used in the ${preferredReplyLanguage.source}, not the language of the instruction. Ignore cross-language prompting unless the user explicitly asks for translation or another output language.`
    : ''

  const systemInstruction = [baseSystemInstruction, languageSystemInstruction]
    .filter(Boolean)
    .join(' ')

  const historyMessages = (params.conversationHistory || [])
    .filter((message) => message.content.trim())
    .map((message) => ({
      role: message.role,
      content: message.content,
    }))

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      temperature: params.assistantMode === 'discuss' ? 0.7 : 0.3,
      messages: [
        {
          role: 'system',
          content: systemInstruction,
        },
        ...historyMessages,
        {
          role: 'user',
          content: userContent,
        },
      ],
    }),
  })

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: { message: response.statusText } }))
    const message = (err as { error?: { message?: string } }).error?.message ?? response.statusText
    if (response.status === 401) throw new Error('Invalid API key. Check the OpenAI key configured for this app.')
    if (response.status === 429) throw new Error('OpenAI rate limit reached. Please try again in a moment.')
    throw new Error(`OpenAI error: ${message}`)
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>
  }

  const content = data.choices?.[0]?.message?.content?.trim() ?? ''
  if (!content) {
    throw new Error('OpenAI returned an empty response.')
  }

  return content
}