import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { ChangeEvent, PointerEvent as ReactPointerEvent } from 'react'
import type { Editor as TinyMCEEditor } from 'tinymce'
import {
  hasDocumentChatApiKey,
  readDocumentChatAttachment,
  runDocumentChat,
  type DocumentChatAttachment,
} from '../../../lib/ai/documentChat'

type ChatTargetScope = 'selection' | 'tab'
type ChatResponseMode = 'text' | 'html'
type ActionItemsDestination = 'editor' | 'details'
type AssistantMode = 'edit' | 'discuss'

const AI_PANEL_STORAGE_PREFIX = 'workhub-doc-ai-session:v1:'
const LEGACY_DEFAULT_PANEL_HEIGHT = 332
const DEFAULT_PANEL_HEIGHT = 276
const MIN_PANEL_HEIGHT = 220
const MAX_PANEL_HEIGHT = 620
const SIDEBAR_TEXTAREA_MIN_HEIGHT = 120
const SIDEBAR_TEXTAREA_MAX_HEIGHT = 420
const MAX_PERSISTED_ENTRIES = 12
const VOICE_INPUT_TIMEOUT_MS = 2 * 60 * 1000
const WORKHUB_AI_VOICE_QUICK_START_EVENT = 'workhub:ai-voice-quick-start'
const WORKHUB_AI_VOICE_STATUS_EVENT = 'workhub:ai-voice-status'

const CHAT_RESPONSE_MODES: ReadonlyArray<ChatResponseMode> = ['text', 'html']
const ACTION_ITEMS_DESTINATIONS: ReadonlyArray<ActionItemsDestination> = ['editor', 'details']
const CHAT_TARGET_SCOPES: ReadonlyArray<ChatTargetScope> = ['selection', 'tab']
const ASSISTANT_MODES: ReadonlyArray<AssistantMode> = ['edit', 'discuss']

type QuickActionKind =
  | 'rephrase'
  | 'shorten'
  | 'addDetails'
  | 'check'
  | 'translate'
  | 'table'
  | 'checklist'
  | 'actionItems'
  | 'bullets'
  | 'calculate'

const QUICK_ACTIONS: ReadonlyArray<{
  label: string
  kind: QuickActionKind
  responseMode: ChatResponseMode
}> = [
  { label: 'Rephrase', kind: 'rephrase', responseMode: 'text' },
  { label: 'Shorten', kind: 'shorten', responseMode: 'text' },
  { label: 'Add Details', kind: 'addDetails', responseMode: 'text' },
  { label: 'Check', kind: 'check', responseMode: 'text' },
  { label: 'Translate', kind: 'translate', responseMode: 'text' },
  { label: 'Table', kind: 'table', responseMode: 'html' },
  { label: 'Checklist', kind: 'checklist', responseMode: 'html' },
  { label: 'Action Items', kind: 'actionItems', responseMode: 'html' },
  { label: 'Bullets', kind: 'bullets', responseMode: 'html' },
  { label: 'Calculate', kind: 'calculate', responseMode: 'text' },
]

const ALLOWED_HTML_TAGS = new Set([
  'p',
  'br',
  'strong',
  'em',
  'b',
  'i',
  'u',
  'ul',
  'ol',
  'li',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
])

const ALLOWED_HTML_CLASSES = new Set([
  'tox-checklist',
  'tox-checklist--checked',
  'tox-checklist--hidden',
])

type ChatEntry = {
  id: string
  prompt: string
  response: string
  responseMode: ChatResponseMode
  assistantMode: AssistantMode
  actionKind: QuickActionKind | 'manual'
  preferredDestination: ActionItemsDestination | null
  selectedText: string
  targetScope: ChatTargetScope
  hadSelection: boolean
  replaceBookmark: unknown
  insertBookmark: unknown
  status: 'ready' | 'inserted' | 'replaced' | 'sent-to-details' | 'rejected'
}

type WorkhubDocumentAiPanelProps = {
  editor: TinyMCEEditor | null
  documentTitle: string
  documentBody: string
  activeTabTitle?: string
  readOnly: boolean
  layout?: 'default' | 'sidebar'
  persistenceKey?: string
  onSendChecklistItemsToDetails?: (items: string[]) => Promise<number> | number
}

type PersistedChatEntry = Pick<
  ChatEntry,
  'id' | 'prompt' | 'response' | 'responseMode' | 'assistantMode' | 'actionKind' | 'preferredDestination' | 'selectedText' | 'targetScope' | 'status'
>

type PersistedAiPanelState = {
  isOpen: boolean
  prompt: string
  entries: PersistedChatEntry[]
  assistantMode: AssistantMode
  quickActionsExpanded: boolean
  preferContextLanguage: boolean
  actionItemsDestination: ActionItemsDestination
  panelHeight: number
}

type SpeechRecognitionAlternativeLike = {
  transcript: string
}

type SpeechRecognitionResultLike = {
  isFinal: boolean
  length: number
  [index: number]: SpeechRecognitionAlternativeLike
}

type SpeechRecognitionEventLike = {
  resultIndex: number
  results: ArrayLike<SpeechRecognitionResultLike>
}

type SpeechRecognitionErrorEventLike = {
  error?: string
}

type BrowserSpeechRecognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  maxAlternatives: number
  onstart: (() => void) | null
  onend: (() => void) | null
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  start: () => void
  stop: () => void
  abort: () => void
}

type BrowserSpeechRecognitionCtor = new () => BrowserSpeechRecognition

type PromptSelectionRange = {
  start: number
  end: number
}

type PromptDictationPreviewRange = {
  start: number
  end: number
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function plainTextToHtml(value: string) {
  return escapeHtml(value.trim())
    .replace(/\n{2,}/g, '</p><p>')
    .replace(/\n/g, '<br>')
    .replace(/^/, '<p>')
    .replace(/$/, '</p>')
}

function makeEntryId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function stripCodeFences(value: string) {
  const trimmed = value.trim()
  const match = trimmed.match(/^```(?:html)?\s*([\s\S]*?)\s*```$/i)
  return match ? match[1].trim() : trimmed
}

function hasHtmlMarkup(value: string) {
  return /<\/?[a-z][\s\S]*>/i.test(value)
}

function toPlainText(value: string) {
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

function detectDominantLanguage(value: string) {
  const normalized = toPlainText(value)
  const arabicCount = countMatches(normalized, /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g)
  const latinCount = countMatches(normalized, /[A-Za-z]/g)

  if (arabicCount === 0 && latinCount === 0) return null
  if (arabicCount === 0) return 'en' as const
  if (latinCount === 0) return 'ar' as const

  return arabicCount >= latinCount ? 'ar' as const : 'en' as const
}

function resolveSpeechRecognitionLanguage(params: {
  prompt: string
  selectedText: string
  documentTitle: string
  documentBody: string
  activeTabTitle?: string
  preferContextLanguage: boolean
}) {
  const promptLanguage = detectDominantLanguage(params.prompt)
  if (promptLanguage === 'ar') return 'ar-OM'
  if (promptLanguage === 'en') return 'en-US'

  const contextSource = params.preferContextLanguage && params.selectedText.trim()
    ? params.selectedText
    : [params.documentTitle, params.activeTabTitle || '', params.documentBody].filter(Boolean).join('\n\n')

  const contextLanguage = detectDominantLanguage(contextSource)
  if (contextLanguage === 'ar') return 'ar-OM'
  if (contextLanguage === 'en') return 'en-US'

  if (typeof navigator !== 'undefined' && /^ar\b/i.test(navigator.language || '')) {
    return 'ar-OM'
  }

  return 'en-US'
}

function getSpeechRecognitionCtor() {
  if (typeof window === 'undefined') return null

  const speechWindow = window as Window & {
    SpeechRecognition?: BrowserSpeechRecognitionCtor
    webkitSpeechRecognition?: BrowserSpeechRecognitionCtor
  }

  return speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition || null
}

function getAudioContextCtor() {
  if (typeof window === 'undefined') return null

  const audioWindow = window as Window & {
    AudioContext?: typeof AudioContext
    webkitAudioContext?: typeof AudioContext
  }

  return audioWindow.AudioContext || audioWindow.webkitAudioContext || null
}

function getLastNonSpaceCharacter(value: string) {
  const trimmed = value.replace(/\s+$/g, '')
  return trimmed ? trimmed.slice(-1) : ''
}

function getFirstNonSpaceCharacter(value: string) {
  const trimmed = value.replace(/^\s+/g, '')
  return trimmed ? trimmed.charAt(0) : ''
}

function isWordLikeCharacter(value: string) {
  return /[A-Za-z0-9\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(value)
}

function isLeadingPunctuation(value: string) {
  return /^[,.;:!?%\])}،؛؟]/u.test(value)
}

function isTrailingConnector(value: string) {
  return /^[A-Za-z0-9\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF(\[{"'“‘]/.test(value)
}

function buildSmartInsertionText(beforeText: string, rawInsertText: string, afterText: string) {
  const trimmedInsert = rawInsertText.replace(/\s+/g, ' ').trim()
  if (!trimmedInsert) return ''

  const beforeChar = getLastNonSpaceCharacter(beforeText)
  const afterChar = getFirstNonSpaceCharacter(afterText)
  const firstInsertChar = trimmedInsert.charAt(0)
  const lastInsertChar = trimmedInsert.slice(-1)

  const needsLeadingSpace = Boolean(
    beforeChar
    && isWordLikeCharacter(beforeChar)
    && isTrailingConnector(firstInsertChar)
  )

  const needsTrailingSpace = Boolean(
    afterChar
    && isWordLikeCharacter(afterChar)
    && isWordLikeCharacter(lastInsertChar)
    && !isLeadingPunctuation(afterChar)
  )

  return `${needsLeadingSpace ? ' ' : ''}${trimmedInsert}${needsTrailingSpace ? ' ' : ''}`
}

function playRecordingCue(kind: 'start' | 'stop') {
  const AudioCtor = getAudioContextCtor()
  if (!AudioCtor) return

  try {
    const context = new AudioCtor()
    const durations = kind === 'start' ? [0, 0.09] : [0, 0.11]
    const frequencies = kind === 'start' ? [880, 1174] : [932, 622]

    frequencies.forEach((frequency, index) => {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      const startAt = context.currentTime + durations[index]
      const endAt = startAt + 0.08

      oscillator.type = 'sine'
      oscillator.frequency.value = frequency
      gain.gain.setValueAtTime(0.0001, startAt)
      gain.gain.exponentialRampToValueAtTime(0.05, startAt + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, endAt)

      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.start(startAt)
      oscillator.stop(endAt)
    })

    window.setTimeout(() => {
      try {
        const closeResult = context.close?.()
        if (closeResult && typeof (closeResult as Promise<void>).catch === 'function') {
          void closeResult.catch(() => undefined)
        }
      } catch {
        // Ignore cleanup failures.
      }
    }, 260)
  } catch {
    // Ignore audio feedback failures and continue dictation.
  }
}

function getQuickActionTargetLabel(targetScope: ChatTargetScope, activeTabTitle?: string) {
  if (targetScope === 'selection') return 'selected text'
  const tabTitle = activeTabTitle?.trim()
  return tabTitle ? `full ${tabTitle} tab` : 'full current tab'
}

function buildTranslationPrompt(sourceText: string, targetScope: ChatTargetScope, activeTabTitle?: string) {
  const normalizedText = toPlainText(sourceText)
  const arabicCount = countMatches(normalizedText, /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g)
  const latinCount = countMatches(normalizedText, /[A-Za-z]/g)
  const targetLabel = getQuickActionTargetLabel(targetScope, activeTabTitle)

  if (arabicCount > 0 && latinCount === 0) {
    return `Translate the ${targetLabel} into clear, natural English. Preserve names, numbers, URLs, and product names where appropriate. Return only the translated text.`
  }

  if (latinCount > 0 && arabicCount === 0) {
    return `Translate the ${targetLabel} into clear, natural Arabic. Preserve names, numbers, URLs, and product names where appropriate. Return only the translated text.`
  }

  if (arabicCount >= latinCount * 1.35) {
    return `The ${targetLabel} is mostly Arabic with some mixed content. Translate it into fluent English, but preserve names, numbers, brand terms, and URLs where needed. Return only the translated text.`
  }

  if (latinCount >= arabicCount * 1.35) {
    return `The ${targetLabel} is mostly English with some mixed content. Translate it into fluent Arabic, but preserve names, numbers, brand terms, and URLs where needed. Return only the translated text.`
  }

  return `Detect the dominant language in the ${targetLabel}. If Arabic is dominant, translate the full result into natural English. If English is dominant, translate the full result into natural Arabic. If the content is genuinely mixed, choose the single target language that produces the clearest and most coherent final text, while preserving names, numbers, brand terms, and URLs when appropriate. Return only the translated text.`
}

function buildQuickActionPrompt(kind: QuickActionKind, sourceText: string, targetScope: ChatTargetScope, activeTabTitle?: string) {
  const targetLabel = getQuickActionTargetLabel(targetScope, activeTabTitle)

  switch (kind) {
    case 'rephrase':
      return `Rephrase the ${targetLabel} to improve clarity, flow, and professionalism. Return only the revised text.`
    case 'shorten':
      return `Shorten the ${targetLabel} while preserving its key meaning, intent, and important details. Return only the revised text.`
    case 'addDetails':
      return `Expand the ${targetLabel} with more useful detail, specificity, and clarity, while keeping the same meaning and tone. Return only the revised text.`
    case 'check':
      return `Review the ${targetLabel} for grammar, clarity, consistency, wording, and factual or structural issues. Fix the issues directly and return only the corrected text.`
    case 'translate':
      return buildTranslationPrompt(sourceText, targetScope, activeTabTitle)
    case 'table':
      return `Convert the ${targetLabel} into a clean HTML table only. Return only a valid HTML fragment using <table>, <thead>, <tbody>, <tr>, <th>, and <td>. Infer practical column headers when helpful, but preserve the original facts and meaning. Do not use markdown or explanatory text.`
    case 'checklist':
      return `Convert the ${targetLabel} into an HTML checklist only. Return only a valid HTML fragment in this exact outer structure: <ul class="tox-checklist">...</ul>. Use one <li> per checklist item. Do not include markdown, commentary, or wrapper text.`
    case 'actionItems':
      return `Extract the concrete action items from the ${targetLabel}. Return only a valid HTML checklist fragment in this exact outer structure: <ul class="tox-checklist">...</ul>. Each <li> must be a clear actionable task. If no clear action items exist, return a single <li>No clear action items identified.</li>.`
    case 'bullets':
      return `Summarize the ${targetLabel} into concise bullet points. Return only a valid HTML fragment using <ul> and <li>. Do not use markdown fences, commentary, or wrapper text.`
    case 'calculate':
      return `Read the ${targetLabel} carefully and perform any calculations that are directly supported by the information provided, such as totals, quantities, durations, percentages, differences, rates, dates, or counts. If multiple relevant calculations are possible, present the most useful ones. If the information is insufficient, state what is missing. Return only concise paste-ready result text with no conversational preface.`
    default:
      return ''
  }
}

function sanitizeDocumentAiHtml(value: string) {
  const normalized = stripCodeFences(value)
  if (!normalized) return ''

  if (typeof DOMParser === 'undefined' || typeof document === 'undefined') {
    return hasHtmlMarkup(normalized) ? normalized : plainTextToHtml(normalized)
  }

  const parser = new DOMParser()
  const parsedDocument = parser.parseFromString(`<body>${normalized}</body>`, 'text/html')
  const outputDocument = document.implementation.createHTMLDocument('')
  const container = outputDocument.createElement('div')

  const copySpanValue = (element: HTMLElement, attributeName: 'colspan' | 'rowspan', target: HTMLElement) => {
    const rawValue = element.getAttribute(attributeName)
    if (!rawValue) return
    const parsedValue = Number.parseInt(rawValue, 10)
    if (Number.isFinite(parsedValue) && parsedValue > 1) {
      target.setAttribute(attributeName, String(parsedValue))
    }
  }

  const appendCleanNode = (node: Node, parent: HTMLElement | DocumentFragment) => {
    if (node.nodeType === Node.TEXT_NODE) {
      parent.appendChild(outputDocument.createTextNode(node.textContent ?? ''))
      return
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return
    }

    const element = node as HTMLElement
    const tagName = element.tagName.toLowerCase()

    if (!ALLOWED_HTML_TAGS.has(tagName)) {
      Array.from(element.childNodes).forEach((childNode) => appendCleanNode(childNode, parent))
      return
    }

    const cleanElement = outputDocument.createElement(tagName)

    if ((tagName === 'ul' || tagName === 'li') && element.className) {
      const className = element.className
        .split(/\s+/)
        .filter((token) => ALLOWED_HTML_CLASSES.has(token))
        .join(' ')

      if (className) {
        cleanElement.setAttribute('class', className)
      }
    }

    if (tagName === 'td' || tagName === 'th') {
      copySpanValue(element, 'colspan', cleanElement)
      copySpanValue(element, 'rowspan', cleanElement)
    }

    if (tagName === 'th') {
      const scope = element.getAttribute('scope')
      if (scope === 'row' || scope === 'col') {
        cleanElement.setAttribute('scope', scope)
      }
    }

    Array.from(element.childNodes).forEach((childNode) => appendCleanNode(childNode, cleanElement))
    parent.appendChild(cleanElement)
  }

  Array.from(parsedDocument.body.childNodes).forEach((childNode) => appendCleanNode(childNode, container))

  const sanitizedHtml = container.innerHTML.trim()
  if (!sanitizedHtml) {
    return plainTextToHtml(normalized)
  }

  return sanitizedHtml
}

function normalizeAiResponse(response: string, responseMode: ChatResponseMode) {
  if (responseMode === 'html') {
    return sanitizeDocumentAiHtml(response)
  }

  return stripCodeFences(response)
}

function extractChecklistItemsFromAiResponse(response: string, responseMode: ChatResponseMode) {
  if (responseMode === 'html' && typeof DOMParser !== 'undefined') {
    const parser = new DOMParser()
    const parsedDocument = parser.parseFromString(`<body>${response}</body>`, 'text/html')
    return Array.from(parsedDocument.body.querySelectorAll('li'))
      .map((item) => item.textContent?.replace(/\s+/g, ' ').trim() ?? '')
      .filter(Boolean)
  }

  return response
    .split(/\r?\n+/)
    .map((line) => line.replace(/^[-*•\d.)\s]+/, '').trim())
    .filter(Boolean)
}

function getEntryStatusLabel(entry: ChatEntry) {
  if (entry.assistantMode === 'discuss' && entry.status === 'ready') {
    return 'Discussion reply'
  }

  const { status } = entry
  switch (status) {
    case 'inserted':
      return 'Added to document'
    case 'replaced':
      return 'Replaced selection'
    case 'sent-to-details':
      return 'Sent to details panel'
    case 'rejected':
      return 'Dismissed'
    default:
      return 'Ready to apply'
  }
}

function getEditorSelection(editor: TinyMCEEditor | null) {
  if (!editor) return null

  try {
    return editor.selection ?? null
  } catch {
    return null
  }
}

function getSelectedTextFromEditor(editor: TinyMCEEditor | null) {
  const selection = getEditorSelection(editor)
  if (!selection) return ''

  try {
    return selection.getContent({ format: 'text' }).trim()
  } catch {
    return ''
  }
}

function getSelectionBookmark(editor: TinyMCEEditor | null) {
  const selection = getEditorSelection(editor)
  if (!selection) return null

  try {
    return selection.getBookmark(2, true)
  } catch {
    return null
  }
}

function captureInsertBookmark(editor: TinyMCEEditor | null, hadSelection: boolean, replaceBookmark: unknown) {
  if (!editor) return null
  if (!hadSelection) return replaceBookmark

  const selection = getEditorSelection(editor)
  if (!selection) return replaceBookmark

  try {
    const originalRange = selection.getRng()
    const insertRange = originalRange.cloneRange()
    insertRange.collapse(false)

    selection.setRng(insertRange)
    const insertBookmark = selection.getBookmark(2, true)
    if (replaceBookmark) {
      selection.moveToBookmark(replaceBookmark as never)
    } else {
      selection.setRng(originalRange)
    }

    return insertBookmark
  } catch {
    return replaceBookmark
  }
}

function isValidResponseMode(value: unknown): value is ChatResponseMode {
  return typeof value === 'string' && CHAT_RESPONSE_MODES.includes(value as ChatResponseMode)
}

function isValidTargetScope(value: unknown): value is ChatTargetScope {
  return typeof value === 'string' && CHAT_TARGET_SCOPES.includes(value as ChatTargetScope)
}

function isValidActionItemsDestination(value: unknown): value is ActionItemsDestination {
  return typeof value === 'string' && ACTION_ITEMS_DESTINATIONS.includes(value as ActionItemsDestination)
}

function isValidAssistantMode(value: unknown): value is AssistantMode {
  return typeof value === 'string' && ASSISTANT_MODES.includes(value as AssistantMode)
}

function isValidEntryStatus(value: unknown): value is ChatEntry['status'] {
  return value === 'ready'
    || value === 'inserted'
    || value === 'replaced'
    || value === 'sent-to-details'
    || value === 'rejected'
}

function getAiPanelStorageKey(persistenceKey?: string) {
  const normalizedKey = persistenceKey?.trim()
  if (!normalizedKey) return ''
  return `${AI_PANEL_STORAGE_PREFIX}${encodeURIComponent(normalizedKey)}`
}

async function copyTextToClipboard(value: string) {
  const nextValue = value.trim()
  if (!nextValue) {
    throw new Error('There is no reply text to copy.')
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(nextValue)
    return
  }

  if (typeof document === 'undefined') {
    throw new Error('Clipboard is not available in this environment.')
  }

  const textarea = document.createElement('textarea')
  textarea.value = nextValue
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  textarea.style.pointerEvents = 'none'
  document.body.appendChild(textarea)
  textarea.select()
  textarea.setSelectionRange(0, textarea.value.length)

  const copied = document.execCommand('copy')
  document.body.removeChild(textarea)
  if (!copied) {
    throw new Error('Could not copy the reply to the clipboard.')
  }
}

function serializeEntriesForStorage(entries: ChatEntry[]): PersistedChatEntry[] {
  return entries.slice(0, MAX_PERSISTED_ENTRIES).map((entry) => ({
    id: entry.id,
    prompt: entry.prompt,
    response: entry.response,
    responseMode: entry.responseMode,
    assistantMode: entry.assistantMode,
    actionKind: entry.actionKind,
    preferredDestination: entry.preferredDestination,
    selectedText: entry.selectedText,
    targetScope: entry.targetScope,
    status: entry.status,
  }))
}

function deserializeEntriesFromStorage(value: unknown): ChatEntry[] {
  if (!Array.isArray(value)) return []

  return value.slice(0, MAX_PERSISTED_ENTRIES).flatMap((entry): ChatEntry[] => {
    if (!entry || typeof entry !== 'object') return []

    const candidate = entry as Partial<PersistedChatEntry>
    const prompt = typeof candidate.prompt === 'string' ? candidate.prompt.trim() : ''
    const response = typeof candidate.response === 'string' ? candidate.response.trim() : ''

    if (!prompt || !response || !isValidResponseMode(candidate.responseMode) || !isValidTargetScope(candidate.targetScope) || !isValidEntryStatus(candidate.status)) {
      return []
    }

    return [{
      id: typeof candidate.id === 'string' && candidate.id.trim() ? candidate.id : makeEntryId(),
      prompt,
      response,
      responseMode: candidate.responseMode,
      assistantMode: isValidAssistantMode(candidate.assistantMode) ? candidate.assistantMode : 'edit',
      actionKind: candidate.actionKind ?? 'manual',
      preferredDestination: isValidActionItemsDestination(candidate.preferredDestination) ? candidate.preferredDestination : null,
      selectedText: typeof candidate.selectedText === 'string' ? candidate.selectedText : '',
      targetScope: candidate.targetScope,
      hadSelection: false,
      replaceBookmark: null,
      insertBookmark: null,
      status: candidate.status,
    }]
  })
}

function readPersistedAiPanelState(storageKey: string): PersistedAiPanelState | null {
  if (!storageKey || typeof window === 'undefined') return null

  try {
    const rawValue = window.localStorage.getItem(storageKey)
    if (!rawValue) return null

    const parsedValue = JSON.parse(rawValue) as Partial<PersistedAiPanelState>
    return {
      isOpen: Boolean(parsedValue.isOpen),
      prompt: typeof parsedValue.prompt === 'string' ? parsedValue.prompt : '',
      entries: serializeEntriesForStorage(deserializeEntriesFromStorage(parsedValue.entries)),
      assistantMode: isValidAssistantMode(parsedValue.assistantMode) ? parsedValue.assistantMode : 'edit',
      quickActionsExpanded: Boolean(parsedValue.quickActionsExpanded),
      preferContextLanguage: parsedValue.preferContextLanguage !== false,
      actionItemsDestination: isValidActionItemsDestination(parsedValue.actionItemsDestination)
        ? parsedValue.actionItemsDestination
        : 'editor',
      panelHeight: typeof parsedValue.panelHeight === 'number'
        ? Math.min(
          MAX_PANEL_HEIGHT,
          Math.max(
            MIN_PANEL_HEIGHT,
            parsedValue.panelHeight === LEGACY_DEFAULT_PANEL_HEIGHT ? DEFAULT_PANEL_HEIGHT : parsedValue.panelHeight,
          ),
        )
        : DEFAULT_PANEL_HEIGHT,
    }
  } catch {
    return null
  }
}

export function WorkhubDocumentAiPanel({
  editor,
  documentTitle,
  documentBody,
  activeTabTitle,
  readOnly,
  layout = 'default',
  persistenceKey,
  onSendChecklistItemsToDetails,
}: WorkhubDocumentAiPanelProps) {
  const fileInputId = useId()
  const resizeStateRef = useRef<{ startY: number; startHeight: number } | null>(null)
  const panelBodyRef = useRef<HTMLDivElement | null>(null)
  const responsePaneRef = useRef<HTMLDivElement | null>(null)
  const promptTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const promptSelectionRef = useRef<PromptSelectionRange>({ start: 0, end: 0 })
  const promptDictationPreviewRef = useRef<PromptDictationPreviewRange | null>(null)
  const copyResetTimeoutRef = useRef<number | null>(null)
  const dictationRestartTimeoutRef = useRef<number | null>(null)
  const voiceInputTimeoutRef = useRef<number | null>(null)
  const voiceInputDeadlineRef = useRef<number | null>(null)
  const speechRecognitionRef = useRef<BrowserSpeechRecognition | null>(null)
  const keepListeningRef = useRef(false)
  const lastDictationTargetRef = useRef<'prompt' | 'editor' | null>(null)
  const pendingDictationChunksRef = useRef<string[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [attachments, setAttachments] = useState<DocumentChatAttachment[]>([])
  const [entries, setEntries] = useState<ChatEntry[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState('')
  const [copiedEntryId, setCopiedEntryId] = useState<string | null>(null)
  const [hasActiveSelection, setHasActiveSelection] = useState(false)
  const [assistantMode, setAssistantMode] = useState<AssistantMode>('edit')
  const [quickActionsExpanded, setQuickActionsExpanded] = useState(false)
  const [preferContextLanguage, setPreferContextLanguage] = useState(true)
  const [actionItemsDestination, setActionItemsDestination] = useState<ActionItemsDestination>('editor')
  const [panelHeight, setPanelHeight] = useState(DEFAULT_PANEL_HEIGHT)
  const [isListening, setIsListening] = useState(false)
  const [interimTranscript, setInterimTranscript] = useState('')

  const isSidebarLayout = layout === 'sidebar'
  const apiKeyReady = hasDocumentChatApiKey()
  const latestEntry = entries[0] ?? null
  const displayedEntries = isSidebarLayout ? [...entries].reverse() : entries
  const panelExpanded = isSidebarLayout ? true : isOpen
  const storageKey = useMemo(() => getAiPanelStorageKey(persistenceKey), [persistenceKey])
  const speechRecognitionSupported = useMemo(() => Boolean(getSpeechRecognitionCtor()), [])

  const promptPlaceholder = assistantMode === 'discuss'
    ? 'Talk with the AI about ideas, tradeoffs, solutions, story improvements, or planning. It will answer conversationally instead of rewriting by default...'
    : 'Ask the AI to rewrite, shorten, expand, summarize, or explain the current document or selection...'
  const contextLanguageLabel = hasActiveSelection ? 'selected text' : 'current draft'

  function resizePromptTextareaToContent(target?: HTMLTextAreaElement | null) {
    const textarea = target ?? promptTextareaRef.current
    if (!textarea) return

    if (!isSidebarLayout) {
      textarea.style.height = ''
      textarea.style.overflowY = ''
      return
    }

    textarea.style.height = 'auto'
    const nextHeight = Math.min(SIDEBAR_TEXTAREA_MAX_HEIGHT, Math.max(SIDEBAR_TEXTAREA_MIN_HEIGHT, textarea.scrollHeight))
    textarea.style.height = `${nextHeight}px`
    textarea.style.overflowY = textarea.scrollHeight > SIDEBAR_TEXTAREA_MAX_HEIGHT ? 'auto' : 'hidden'
  }

  function handlePromptChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setPrompt(event.target.value)
    updatePromptSelectionRange()
    clearPromptDictationPreview()
    resizePromptTextareaToContent(event.target)
  }

  function updatePromptSelectionRange() {
    const textarea = promptTextareaRef.current
    if (!textarea) return

    promptSelectionRef.current = {
      start: textarea.selectionStart ?? 0,
      end: textarea.selectionEnd ?? textarea.selectionStart ?? 0,
    }
  }

  function applyPromptDictationText(transcriptText: string, isPreview: boolean) {
    const textarea = promptTextareaRef.current
    const selection = promptDictationPreviewRef.current
      ? {
        start: promptDictationPreviewRef.current.start,
        end: promptDictationPreviewRef.current.end,
      }
      : textarea
        ? {
          start: textarea.selectionStart ?? promptSelectionRef.current.start,
          end: textarea.selectionEnd ?? promptSelectionRef.current.end,
        }
        : promptSelectionRef.current

    setPrompt((current) => {
      const safeStart = Math.max(0, Math.min(current.length, selection.start))
      const safeEnd = Math.max(safeStart, Math.min(current.length, selection.end))
      const beforeText = current.slice(0, safeStart)
      const afterText = current.slice(safeEnd)
      const smartInsert = buildSmartInsertionText(beforeText, transcriptText, afterText)
      const nextValue = `${beforeText}${smartInsert}${afterText}`
      const nextCaret = safeStart + smartInsert.length

      promptSelectionRef.current = { start: nextCaret, end: nextCaret }
      promptDictationPreviewRef.current = isPreview
        ? { start: safeStart, end: nextCaret }
        : null

      if (textarea) {
        window.requestAnimationFrame(() => {
          textarea.focus()
          textarea.setSelectionRange(nextCaret, nextCaret)
        })
      }

      return nextValue
    })
  }

  function clearPromptDictationPreview() {
    promptDictationPreviewRef.current = null
    setInterimTranscript('')
  }

  function insertDictationIntoPrompt(transcriptText: string) {
    applyPromptDictationText(transcriptText, false)
  }

  function getEditorInsertionContext() {
    const selection = getEditorSelection(editor)
    if (!editor || !selection) {
      return { beforeText: '', afterText: '' }
    }

    try {
      const range = selection.getRng()
      const body = editor.getBody()
      const beforeRange = range.cloneRange()
      beforeRange.selectNodeContents(body)
      beforeRange.setEnd(range.startContainer, range.startOffset)

      const afterRange = range.cloneRange()
      afterRange.selectNodeContents(body)
      afterRange.setStart(range.endContainer, range.endOffset)

      return {
        beforeText: beforeRange.toString(),
        afterText: afterRange.toString(),
      }
    } catch {
      return { beforeText: '', afterText: '' }
    }
  }

  function insertDictationIntoEditor(transcriptText: string) {
    if (!editor || readOnly) return false

    try {
      if (!editor.hasFocus()) return false

      const { beforeText, afterText } = getEditorInsertionContext()
      const smartInsert = buildSmartInsertionText(beforeText, transcriptText, afterText)
      if (!smartInsert) return false

      editor.undoManager.transact(() => {
        editor.focus()
        editor.insertContent(escapeHtml(smartInsert).replace(/\n/g, '<br>'))
      })

      return true
    } catch {
      return false
    }
  }

  function flushPendingDictation() {
    if (pendingDictationChunksRef.current.length === 0) return

    const textareaFocused = typeof document !== 'undefined' && document.activeElement === promptTextareaRef.current
    const editorFocused = Boolean(editor && !readOnly && (() => {
      try {
        return editor.hasFocus()
      } catch {
        return false
      }
    })())

    const target = textareaFocused
      ? 'prompt'
      : editorFocused
        ? 'editor'
        : lastDictationTargetRef.current

    if (!target) return

    while (pendingDictationChunksRef.current.length > 0) {
      const nextChunk = pendingDictationChunksRef.current[0]
      const inserted = target === 'prompt'
        ? (insertDictationIntoPrompt(nextChunk), true)
        : insertDictationIntoEditor(nextChunk)

      if (!inserted) return
      pendingDictationChunksRef.current.shift()
    }

    setError('')
  }

  function queueDictationTranscript(transcriptText: string) {
    const normalizedText = transcriptText.replace(/\s+/g, ' ').trim()
    if (!normalizedText) return
    setInterimTranscript('')
    pendingDictationChunksRef.current.push(normalizedText)
    flushPendingDictation()
  }

  function handleInterimDictation(transcriptText: string) {
    const normalizedText = transcriptText.replace(/\s+/g, ' ').trim()
    if (!normalizedText) {
      clearPromptDictationPreview()
      return
    }

    setInterimTranscript(normalizedText)
  }

  function clearDictationRestartTimeout() {
    if (dictationRestartTimeoutRef.current !== null && typeof window !== 'undefined') {
      window.clearTimeout(dictationRestartTimeoutRef.current)
      dictationRestartTimeoutRef.current = null
    }
  }

  function clearVoiceInputTimeout() {
    if (voiceInputTimeoutRef.current !== null && typeof window !== 'undefined') {
      window.clearTimeout(voiceInputTimeoutRef.current)
      voiceInputTimeoutRef.current = null
    }
    voiceInputDeadlineRef.current = null
  }

  function handleVoiceInputTimeout() {
    stopVoiceInput()
    setError('Voice recording stopped automatically after 2 minutes of silence.')
  }

  function scheduleVoiceInputTimeout() {
    if (typeof window === 'undefined') return

    if (voiceInputTimeoutRef.current !== null) {
      window.clearTimeout(voiceInputTimeoutRef.current)
      voiceInputTimeoutRef.current = null
    }

    // Reset deadline on every call so the timer is silence-based, not wall-clock
    const deadline = Date.now() + VOICE_INPUT_TIMEOUT_MS
    voiceInputDeadlineRef.current = deadline

    voiceInputTimeoutRef.current = window.setTimeout(() => {
      voiceInputTimeoutRef.current = null
      handleVoiceInputTimeout()
    }, VOICE_INPUT_TIMEOUT_MS)
  }

  function stopVoiceInput() {
    keepListeningRef.current = false
    clearDictationRestartTimeout()
    clearVoiceInputTimeout()
    clearPromptDictationPreview()
    speechRecognitionRef.current?.stop()
  }

  function startVoiceInputSession() {
    const RecognitionCtor = getSpeechRecognitionCtor()
    if (!RecognitionCtor) {
      clearVoiceInputTimeout()
      setIsListening(false)
      setError('Built-in speech recognition is not available in this browser.')
      return
    }

    const recognition = new RecognitionCtor()
    speechRecognitionRef.current = recognition
    recognition.lang = resolveSpeechRecognitionLanguage({
      prompt,
      selectedText: getSelectionText(),
      documentTitle,
      documentBody,
      activeTabTitle,
      preferContextLanguage,
    })
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 1
    recognition.onstart = () => {
      scheduleVoiceInputTimeout()
      playRecordingCue('start')
      setError('')
      setIsListening(true)
    }
    recognition.onresult = (event) => {
      let interimTranscript = ''

      // Reset silence timeout on any speech activity
      scheduleVoiceInputTimeout()

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index]
        const transcript = result?.[0]?.transcript?.trim() ?? ''
        if (result?.isFinal && transcript) {
          queueDictationTranscript(transcript)
          continue
        }
        if (transcript) {
          interimTranscript = transcript
        }
      }

      handleInterimDictation(interimTranscript)
    }
    recognition.onerror = (event) => {
      if (event.error === 'aborted' || event.error === 'no-speech') return

      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        keepListeningRef.current = false
        setIsListening(false)
        setError('Microphone access was blocked. Allow microphone access in the browser and try again.')
        return
      }

      setError('Voice transcription paused. The recorder will try to continue automatically.')
    }
    recognition.onend = () => {
      speechRecognitionRef.current = null

      if (!keepListeningRef.current) {
        playRecordingCue('stop')
        setIsListening(false)
        clearPromptDictationPreview()
        clearDictationRestartTimeout()
        return
      }

      clearDictationRestartTimeout()
      dictationRestartTimeoutRef.current = window.setTimeout(() => {
        dictationRestartTimeoutRef.current = null
        startVoiceInputSession()
      }, 120)
    }

    try {
      recognition.start()
    } catch {
      clearVoiceInputTimeout()
      speechRecognitionRef.current = null
      setIsListening(false)
      keepListeningRef.current = false
      setError('Voice transcription could not start in this browser session.')
    }
  }

  useEffect(() => {
    if (!editor) {
      setHasActiveSelection(false)
      return
    }

    const syncSelectionState = () => {
      const nextSelectedText = getSelectedTextFromEditor(editor)
      setHasActiveSelection(!!nextSelectedText)
    }

    syncSelectionState()
    editor.on('SelectionChange', syncSelectionState)
    editor.on('NodeChange', syncSelectionState)
    editor.on('KeyUp', syncSelectionState)
    editor.on('SetContent', syncSelectionState)

    return () => {
      editor.off('SelectionChange', syncSelectionState)
      editor.off('NodeChange', syncSelectionState)
      editor.off('KeyUp', syncSelectionState)
      editor.off('SetContent', syncSelectionState)
    }
  }, [editor])

  useEffect(() => {
    resizePromptTextareaToContent()
  }, [isSidebarLayout, panelExpanded, prompt])

  useEffect(() => {
    return () => {
      if (copyResetTimeoutRef.current !== null && typeof window !== 'undefined') {
        window.clearTimeout(copyResetTimeoutRef.current)
      }

      clearDictationRestartTimeout()
      clearVoiceInputTimeout()

      if (speechRecognitionRef.current) {
        speechRecognitionRef.current.abort()
        speechRecognitionRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!isSidebarLayout || !responsePaneRef.current) return

    const pane = responsePaneRef.current
    window.requestAnimationFrame(() => {
      pane.scrollTop = pane.scrollHeight
    })
  }, [displayedEntries.length, isSidebarLayout, isSending])

  useEffect(() => {
    setAttachments([])
    setError('')

    if (!storageKey) {
      setIsOpen(false)
      setPrompt('')
      setEntries([])
      setAssistantMode('edit')
      setQuickActionsExpanded(false)
      setPreferContextLanguage(true)
      setActionItemsDestination('editor')
      setPanelHeight(DEFAULT_PANEL_HEIGHT)
      return
    }

    const persistedState = readPersistedAiPanelState(storageKey)
    if (!persistedState) {
      setIsOpen(false)
      setPrompt('')
      setEntries([])
      setAssistantMode('edit')
      setQuickActionsExpanded(false)
      setPreferContextLanguage(true)
      setActionItemsDestination('editor')
      setPanelHeight(DEFAULT_PANEL_HEIGHT)
      return
    }

    setIsOpen(persistedState.isOpen)
    setPrompt(persistedState.prompt)
    setEntries(deserializeEntriesFromStorage(persistedState.entries))
    setAssistantMode(persistedState.assistantMode)
    setQuickActionsExpanded(persistedState.quickActionsExpanded)
    setPreferContextLanguage(persistedState.preferContextLanguage)
    setActionItemsDestination(persistedState.actionItemsDestination)
    setPanelHeight(persistedState.panelHeight)
  }, [storageKey])

  useEffect(() => {
    if (!storageKey || typeof window === 'undefined') return

    try {
      const nextState: PersistedAiPanelState = {
        isOpen,
        prompt,
        entries: serializeEntriesForStorage(entries),
        assistantMode,
        quickActionsExpanded,
        preferContextLanguage,
        actionItemsDestination,
        panelHeight,
      }
      window.localStorage.setItem(storageKey, JSON.stringify(nextState))
    } catch {
      // Ignore local storage failures so the panel keeps working.
    }
  }, [actionItemsDestination, assistantMode, entries, isOpen, panelHeight, preferContextLanguage, prompt, quickActionsExpanded, storageKey])

  useEffect(() => {
    const handleFocusChange = () => {
      const textareaFocused = typeof document !== 'undefined' && document.activeElement === promptTextareaRef.current
      if (textareaFocused) {
        lastDictationTargetRef.current = 'prompt'
      } else if (editor) {
        try {
          if (editor.hasFocus()) {
            lastDictationTargetRef.current = 'editor'
          }
        } catch {
          // Ignore transient TinyMCE focus errors.
        }
      }

      updatePromptSelectionRange()
      flushPendingDictation()
    }

    if (typeof document !== 'undefined') {
      document.addEventListener('focusin', handleFocusChange)
      document.addEventListener('selectionchange', handleFocusChange)
    }

    if (editor) {
      editor.on('focus', handleFocusChange)
      editor.on('click', handleFocusChange)
      editor.on('SelectionChange', handleFocusChange)
      editor.on('KeyUp', handleFocusChange)
    }

    return () => {
      if (typeof document !== 'undefined') {
        document.removeEventListener('focusin', handleFocusChange)
        document.removeEventListener('selectionchange', handleFocusChange)
      }

      if (editor) {
        editor.off('focus', handleFocusChange)
        editor.off('click', handleFocusChange)
        editor.off('SelectionChange', handleFocusChange)
        editor.off('KeyUp', handleFocusChange)
      }
    }
  }, [editor, readOnly])

  function getDiscussionHistory() {
    return entries
      .filter((entry) => entry.assistantMode === 'discuss' && entry.status !== 'rejected')
      .slice(0, 6)
      .reverse()
      .flatMap((entry) => [
        { role: 'user' as const, content: entry.prompt },
        {
          role: 'assistant' as const,
          content: entry.responseMode === 'html' ? toPlainText(entry.response) : entry.response,
        },
      ])
  }

  function getTargetScope(selectedText: string): ChatTargetScope {
    return selectedText.trim() ? 'selection' : 'tab'
  }

  function getSelectionText() {
    return getSelectedTextFromEditor(editor)
  }

  function handleVoiceInput() {
    if (isListening) {
      stopVoiceInput()
      return
    }

    if (!speechRecognitionSupported) {
      setError('Built-in speech recognition is not available in this browser.')
      return
    }

    keepListeningRef.current = true
    setIsListening(true)
    setError('Recording started. Click in the document or chat box to choose where dictated text should go.')
    startVoiceInputSession()
  }

  async function handleQuickAction(action: { kind: QuickActionKind; label: string; responseMode: ChatResponseMode }) {
    const selectedText = getSelectionText()
    const targetScope = getTargetScope(selectedText)
    const targetText = targetScope === 'selection' ? selectedText : documentBody
    const nextPrompt = buildQuickActionPrompt(action.kind, targetText, targetScope, activeTabTitle)

    setIsOpen(true)
    await handleSend({
      prompt: nextPrompt,
      displayPrompt: action.label,
      responseMode: action.responseMode,
      actionKind: action.kind,
      assistantMode: 'edit',
    })
  }

  async function handleAttachmentChange(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files
    event.target.value = ''
    if (!files || files.length === 0) return

    setIsUploading(true)
    setError('')
    try {
      const nextAttachments = [...attachments]
      for (const file of Array.from(files)) {
        const duplicate = nextAttachments.some((attachment) => attachment.name === file.name)
        if (duplicate) continue
        nextAttachments.push(await readDocumentChatAttachment(file))
      }
      setAttachments(nextAttachments)
    } catch (attachmentError) {
      setError(attachmentError instanceof Error ? attachmentError.message : 'Could not attach files.')
    } finally {
      setIsUploading(false)
    }
  }

  async function handleSend(options?: {
    prompt?: string
    displayPrompt?: string
    responseMode?: ChatResponseMode
    actionKind?: QuickActionKind | 'manual'
    assistantMode?: AssistantMode
  }) {
    if (isSending || isUploading) return
    flushPendingDictation()
    if (isListening) {
      stopVoiceInput()
    }
    if (!apiKeyReady) {
      setError('OpenAI API key is not configured for this app.')
      return
    }
    const nextAssistantMode = options?.assistantMode ?? assistantMode
    const responseMode = nextAssistantMode === 'discuss' ? 'text' : (options?.responseMode ?? 'text')
    const actionKind = nextAssistantMode === 'discuss' ? 'manual' : (options?.actionKind ?? 'manual')
    const effectivePrompt = (options?.prompt ?? prompt).trim()
    if (!effectivePrompt && attachments.length === 0) {
      setError('Write a prompt or attach at least one file.')
      return
    }

    const selectedText = getSelectionText()
    const hadSelection = !!selectedText
    const replaceBookmark = getSelectionBookmark(editor)
    const insertBookmark = captureInsertBookmark(editor, hadSelection, replaceBookmark)
    const targetScope = getTargetScope(selectedText)
    const entryId = makeEntryId()

    setIsSending(true)
    setError('')
    try {
      const response = await runDocumentChat({
        prompt: effectivePrompt,
        documentTitle,
        documentBody,
        activeTabTitle,
        selectedText,
        targetScope,
        responseMode,
        assistantMode: nextAssistantMode,
        preferContextLanguage,
        conversationHistory: nextAssistantMode === 'discuss' ? getDiscussionHistory() : [],
        attachments,
      })

      const normalizedResponse = normalizeAiResponse(response, responseMode)

      setEntries((current) => [{
        id: entryId,
        prompt: options?.displayPrompt?.trim() || effectivePrompt,
        response: normalizedResponse,
        responseMode,
        assistantMode: nextAssistantMode,
        actionKind,
        preferredDestination: actionKind === 'actionItems' ? actionItemsDestination : null,
        selectedText,
        targetScope,
        hadSelection,
        replaceBookmark,
        insertBookmark,
        status: 'ready' as const,
      }, ...current].slice(0, MAX_PERSISTED_ENTRIES))
      if (!options?.prompt) {
        setPrompt('')
      }
      setAttachments([])
      setIsOpen(true)
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'AI request failed.')
    } finally {
      setIsSending(false)
    }
  }

  function handleDismiss(entryId: string) {
    setEntries((current) => current.map((entry) => (
      entry.id === entryId ? { ...entry, status: 'rejected' as const } : entry
    )))
  }

  function handleClearHistory() {
    if (entries.length > 0 && !window.confirm('Clear the AI assistant history for this document tab?')) {
      return
    }
    setEntries([])
    setCopiedEntryId(null)
    setError('')
  }

  function applyEntry(entry: ChatEntry, mode: 'replace' | 'insert') {
    if (!editor) return

    const html = entry.responseMode === 'html'
      ? entry.response
      : plainTextToHtml(entry.response)

    try {
      editor.undoManager.transact(() => {
        editor.focus()
        const selection = getEditorSelection(editor)
        if (selection && mode === 'replace' && entry.hadSelection && entry.replaceBookmark) {
          selection.moveToBookmark(entry.replaceBookmark as never)
        }
        if (selection && mode === 'insert' && entry.insertBookmark) {
          selection.moveToBookmark(entry.insertBookmark as never)
        }

        if (selection && mode === 'replace' && entry.hadSelection) {
          selection.setContent(html)
        } else {
          editor.insertContent(html)
        }
      })
    } catch (applyError) {
      setError(applyError instanceof Error ? applyError.message : 'Could not apply this AI reply to the document right now.')
      return
    }

    setEntries((current) => current.map((item) => (
      item.id === entry.id ? { ...item, status: mode === 'replace' ? 'replaced' : 'inserted' } : item
    )))
  }

  function handleReplace(entry: ChatEntry) {
    applyEntry(entry, 'replace')
  }

  function handleAdd(entry: ChatEntry) {
    applyEntry(entry, 'insert')
  }

  async function handleCopyReply(entry: ChatEntry) {
    try {
      setError('')
      await copyTextToClipboard(entry.responseMode === 'html' ? toPlainText(entry.response) : entry.response)
      setCopiedEntryId(entry.id)
      if (copyResetTimeoutRef.current !== null && typeof window !== 'undefined') {
        window.clearTimeout(copyResetTimeoutRef.current)
      }
      if (typeof window !== 'undefined') {
        copyResetTimeoutRef.current = window.setTimeout(() => {
          setCopiedEntryId((current) => (current === entry.id ? null : current))
          copyResetTimeoutRef.current = null
        }, 1600)
      }
    } catch (copyError) {
      setError(copyError instanceof Error ? copyError.message : 'Could not copy the reply.')
    }
  }

  async function handleSendToDetails(entry: ChatEntry) {
    if (!onSendChecklistItemsToDetails) return
    const checklistItems = extractChecklistItemsFromAiResponse(entry.response, entry.responseMode)
    if (checklistItems.length === 0) {
      setError('This response does not contain any checklist items to send to the details panel.')
      return
    }

    try {
      const addedCount = await onSendChecklistItemsToDetails(checklistItems)
      if (addedCount === 0) {
        setError('These action items are already in the details panel checklist.')
        return
      }
      setError('')
      setEntries((current) => current.map((item) => (
        item.id === entry.id ? { ...item, status: 'sent-to-details' } : item
      )))
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'Could not send action items to the details panel.')
    }
  }

  function handleResizePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    e.preventDefault()
    resizeStateRef.current = { startY: e.clientY, startHeight: panelHeight }
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function handleResizePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!resizeStateRef.current || !panelBodyRef.current) return
    // Panel is at the bottom of the page; dragging UP (smaller clientY) increases height
    const dy = resizeStateRef.current.startY - e.clientY
    const next = Math.min(680, Math.max(240, resizeStateRef.current.startHeight + dy))
    panelBodyRef.current.style.height = `${next}px`
  }

  function handleResizePointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    if (!resizeStateRef.current) return
    const dy = resizeStateRef.current.startY - e.clientY
    const next = Math.min(680, Math.max(240, resizeStateRef.current.startHeight + dy))
    setPanelHeight(next)
    resizeStateRef.current = null
  }

  function renderVoiceButton(extraClassName?: string) {
    return (
      <button
        type="button"
        className={`workhub-doc-ai-btn workhub-doc-ai-btn-secondary workhub-doc-ai-voice-btn${isListening ? ' is-listening' : ''}${extraClassName ? ` ${extraClassName}` : ''}`}
        onClick={handleVoiceInput}
        disabled={!apiKeyReady || isSending || isUploading || !speechRecognitionSupported}
        title={isListening ? 'Stop voice recording' : 'Start voice recording'}
        aria-label={isListening ? 'Stop voice recording' : 'Start voice recording'}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 4a3 3 0 0 1 3 3v4a3 3 0 1 1-6 0V7a3 3 0 0 1 3-3Z" stroke="currentColor" strokeWidth="1.8" />
          <path d="M6 11a6 6 0 0 0 12 0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M12 17v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M9 20h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        <span className="workhub-doc-ai-voice-pulse" aria-hidden="true" />
      </button>
    )
  }

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleQuickStart = (event: Event) => {
      const customEvent = event as CustomEvent<{ persistenceKey?: string }>
      const targetKey = customEvent.detail?.persistenceKey
      if (!targetKey || targetKey !== storageKey) return
      handleVoiceInput()
    }

    window.addEventListener(WORKHUB_AI_VOICE_QUICK_START_EVENT, handleQuickStart as EventListener)
    return () => {
      window.removeEventListener(WORKHUB_AI_VOICE_QUICK_START_EVENT, handleQuickStart as EventListener)
    }
  }, [storageKey, handleVoiceInput])

  useEffect(() => {
    if (typeof window === 'undefined' || !storageKey) return

    window.dispatchEvent(new CustomEvent(WORKHUB_AI_VOICE_STATUS_EVENT, {
      detail: {
        persistenceKey: storageKey,
        isListening,
      },
    }))
  }, [isListening, storageKey])

  return (
    <section className={`workhub-doc-ai-panel${panelExpanded ? ' is-open' : ''}${isSidebarLayout ? ' is-sidebar' : ''}`} aria-label="Document AI assistant">
      {!isSidebarLayout && panelExpanded && (
        <div
          className="workhub-doc-ai-resize-handle"
          onPointerDown={handleResizePointerDown}
          onPointerMove={handleResizePointerMove}
          onPointerUp={handleResizePointerUp}
          title="Drag to resize AI assistant"
          aria-hidden="true"
        />
      )}
      {!isSidebarLayout && (
        <div className="workhub-doc-ai-toggle-row">
          <button
            type="button"
            className="workhub-doc-ai-toggle"
            onClick={() => setIsOpen((current) => !current)}
            aria-expanded={isOpen}
          >
            <span className="workhub-doc-ai-toggle-copy">
              <strong>AI assistant</strong>
              {!apiKeyReady ? <span>AI unavailable</span> : null}
            </span>
            <span className="workhub-doc-ai-toggle-state" aria-hidden="true">{isOpen ? '−' : '+'}</span>
          </button>
          {renderVoiceButton('workhub-doc-ai-voice-btn-top')}
        </div>
      )}

      {panelExpanded && (
        <>
          <div ref={panelBodyRef} className="workhub-doc-ai-body" style={isSidebarLayout ? undefined : { height: `${panelHeight}px` }}>
          <div className="workhub-doc-ai-column workhub-doc-ai-column-input">
            {isSidebarLayout ? (
              <div className="workhub-doc-ai-prompt-row">
                <textarea
                  ref={promptTextareaRef}
                  className="workhub-doc-ai-textarea"
                  value={prompt}
                  onChange={handlePromptChange}
                  onFocus={updatePromptSelectionRange}
                  onClick={updatePromptSelectionRange}
                  onKeyUp={updatePromptSelectionRange}
                  onSelect={updatePromptSelectionRange}
                  placeholder={promptPlaceholder}
                  disabled={!apiKeyReady || isSending}
                />
                <div className="workhub-doc-ai-actions workhub-doc-ai-actions-inline">
                  <button
                    type="button"
                    className="workhub-primary-btn workhub-doc-ai-btn workhub-doc-ai-btn-primary workhub-doc-ai-send-btn"
                    onClick={() => { void handleSend() }}
                    disabled={!apiKeyReady || isSending || isUploading || (!prompt.trim() && attachments.length === 0)}
                    title={assistantMode === 'discuss' ? 'Send discussion message' : 'Send to AI'}
                    aria-label={assistantMode === 'discuss' ? 'Send discussion message' : 'Send to AI'}
                  >
                    {isSending ? (
                      <span aria-hidden="true">…</span>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                        <path d="M5 12h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                        <path d="M12 5l7 7-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                  {renderVoiceButton()}
                </div>
              </div>
            ) : (
              <textarea
                ref={promptTextareaRef}
                className="workhub-doc-ai-textarea"
                value={prompt}
                onChange={handlePromptChange}
                onFocus={updatePromptSelectionRange}
                onClick={updatePromptSelectionRange}
                onKeyUp={updatePromptSelectionRange}
                onSelect={updatePromptSelectionRange}
                placeholder={promptPlaceholder}
                disabled={!apiKeyReady || isSending}
              />
            )}
            {isListening && interimTranscript && (
              <div className="workhub-doc-ai-live-transcript" aria-live="polite">
                <strong>Listening</strong>
                <span>{interimTranscript}</span>
              </div>
            )}
            {isSidebarLayout ? (
              <details className="workhub-doc-ai-options">
                <summary>Options</summary>
                <div className="workhub-doc-ai-options-body">
                  <div className="workhub-doc-ai-attachments">
                    <div className="workhub-doc-ai-meta-row">
                      <label className="workhub-doc-ai-language-option">
                        <input
                          type="checkbox"
                          checked={preferContextLanguage}
                          onChange={(event) => setPreferContextLanguage(event.target.checked)}
                          disabled={!apiKeyReady || isSending}
                        />
                        <span>Reply in the same language as the {contextLanguageLabel}</span>
                      </label>
                      <label className={`workhub-doc-ai-attach-btn${(!apiKeyReady || isSending || isUploading) ? ' is-disabled' : ''}`} htmlFor={fileInputId}>
                        {isUploading ? 'Attaching…' : 'Attach files'}
                      </label>
                    </div>
                    <input
                      id={fileInputId}
                      type="file"
                      accept="image/*,.txt,.md,.csv,.json,.html,.xml,.js"
                      multiple
                      style={{ display: 'none' }}
                      disabled={!apiKeyReady || isSending || isUploading}
                      onChange={handleAttachmentChange}
                    />
                    {attachments.length > 0 && (
                      <div className="workhub-doc-ai-attachment-list">
                        {attachments.map((attachment) => (
                          <div key={`${attachment.name}:${attachment.kind}`} className="workhub-doc-ai-attachment-chip">
                            <span>{attachment.kind === 'image' ? 'Image' : 'Text'}: {attachment.name}</span>
                            <button
                              type="button"
                              onClick={() => setAttachments((current) => current.filter((item) => item !== attachment))}
                              disabled={isSending}
                              aria-label={`Remove ${attachment.name}`}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="workhub-doc-ai-mode-switch" aria-label="AI assistant mode">
                    <button
                      type="button"
                      className={`workhub-doc-ai-mode-btn${assistantMode === 'edit' ? ' is-active' : ''}`}
                      onClick={() => setAssistantMode('edit')}
                      disabled={isSending || isUploading}
                    >
                      Edit draft
                    </button>
                    <button
                      type="button"
                      className={`workhub-doc-ai-mode-btn${assistantMode === 'discuss' ? ' is-active' : ''}`}
                      onClick={() => setAssistantMode('discuss')}
                      disabled={isSending || isUploading}
                    >
                      Discuss ideas
                    </button>
                  </div>
                  {assistantMode === 'edit' ? (
                    <div className="workhub-doc-ai-tools-panel">
                      <button
                        type="button"
                        className={`workhub-doc-ai-tools-toggle${quickActionsExpanded ? ' is-open' : ''}`}
                        onClick={() => setQuickActionsExpanded((current) => !current)}
                        aria-expanded={quickActionsExpanded}
                      >
                        <span>Quick actions</span>
                        <span className="workhub-doc-ai-tools-toggle-state" aria-hidden="true">{quickActionsExpanded ? '−' : '+'}</span>
                      </button>
                      {quickActionsExpanded && (
                        <div className="workhub-doc-ai-tools-content">
                          <div className="workhub-doc-ai-quick-actions">
                            {QUICK_ACTIONS.map((action) => (
                              <button
                                key={action.label}
                                type="button"
                                className="workhub-doc-ai-quick-action"
                                onClick={() => { void handleQuickAction(action) }}
                                disabled={!apiKeyReady || isSending || isUploading}
                              >
                                {action.label}
                              </button>
                            ))}
                          </div>
                          {onSendChecklistItemsToDetails && (
                            <div className="workhub-doc-ai-destination-control" aria-label="Action items destination">
                              <span>Action items destination</span>
                              <div className="workhub-doc-ai-destination-options">
                                <button
                                  type="button"
                                  className={`workhub-doc-ai-destination-option${actionItemsDestination === 'editor' ? ' is-active' : ''}`}
                                  onClick={() => setActionItemsDestination('editor')}
                                  disabled={isSending || isUploading}
                                >
                                  Insert into editor
                                </button>
                                <button
                                  type="button"
                                  className={`workhub-doc-ai-destination-option${actionItemsDestination === 'details' ? ' is-active' : ''}`}
                                  onClick={() => setActionItemsDestination('details')}
                                  disabled={isSending || isUploading}
                                >
                                  Send to details panel
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </details>
            ) : (
              <>
                <div className="workhub-doc-ai-attachments">
                  <div className="workhub-doc-ai-meta-row">
                    <label className="workhub-doc-ai-language-option">
                      <input
                        type="checkbox"
                        checked={preferContextLanguage}
                        onChange={(event) => setPreferContextLanguage(event.target.checked)}
                        disabled={!apiKeyReady || isSending}
                      />
                      <span>Reply in the same language as the {contextLanguageLabel}</span>
                    </label>
                    <label className={`workhub-doc-ai-attach-btn${(!apiKeyReady || isSending || isUploading) ? ' is-disabled' : ''}`} htmlFor={fileInputId}>
                      {isUploading ? 'Attaching…' : 'Attach files'}
                    </label>
                  </div>
                  <input
                    id={fileInputId}
                    type="file"
                    accept="image/*,.txt,.md,.csv,.json,.html,.xml,.js"
                    multiple
                    style={{ display: 'none' }}
                    disabled={!apiKeyReady || isSending || isUploading}
                    onChange={handleAttachmentChange}
                  />
                  {attachments.length > 0 && (
                    <div className="workhub-doc-ai-attachment-list">
                      {attachments.map((attachment) => (
                        <div key={`${attachment.name}:${attachment.kind}`} className="workhub-doc-ai-attachment-chip">
                          <span>{attachment.kind === 'image' ? 'Image' : 'Text'}: {attachment.name}</span>
                          <button
                            type="button"
                            onClick={() => setAttachments((current) => current.filter((item) => item !== attachment))}
                            disabled={isSending}
                            aria-label={`Remove ${attachment.name}`}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="workhub-doc-ai-mode-switch" aria-label="AI assistant mode">
                  <button
                    type="button"
                    className={`workhub-doc-ai-mode-btn${assistantMode === 'edit' ? ' is-active' : ''}`}
                    onClick={() => setAssistantMode('edit')}
                    disabled={isSending || isUploading}
                  >
                    Edit draft
                  </button>
                  <button
                    type="button"
                    className={`workhub-doc-ai-mode-btn${assistantMode === 'discuss' ? ' is-active' : ''}`}
                    onClick={() => setAssistantMode('discuss')}
                    disabled={isSending || isUploading}
                  >
                    Discuss ideas
                  </button>
                </div>
                {assistantMode === 'edit' ? (
                  <div className="workhub-doc-ai-tools-panel">
                    <button
                      type="button"
                      className={`workhub-doc-ai-tools-toggle${quickActionsExpanded ? ' is-open' : ''}`}
                      onClick={() => setQuickActionsExpanded((current) => !current)}
                      aria-expanded={quickActionsExpanded}
                    >
                      <span>Quick actions</span>
                      <span className="workhub-doc-ai-tools-toggle-state" aria-hidden="true">{quickActionsExpanded ? '−' : '+'}</span>
                    </button>
                    {quickActionsExpanded && (
                      <div className="workhub-doc-ai-tools-content">
                        <div className="workhub-doc-ai-quick-actions">
                          {QUICK_ACTIONS.map((action) => (
                            <button
                              key={action.label}
                              type="button"
                              className="workhub-doc-ai-quick-action"
                              onClick={() => { void handleQuickAction(action) }}
                              disabled={!apiKeyReady || isSending || isUploading}
                            >
                              {action.label}
                            </button>
                          ))}
                        </div>
                        {onSendChecklistItemsToDetails && (
                          <div className="workhub-doc-ai-destination-control" aria-label="Action items destination">
                            <span>Action items destination</span>
                            <div className="workhub-doc-ai-destination-options">
                              <button
                                type="button"
                                className={`workhub-doc-ai-destination-option${actionItemsDestination === 'editor' ? ' is-active' : ''}`}
                                onClick={() => setActionItemsDestination('editor')}
                                disabled={isSending || isUploading}
                              >
                                Insert into editor
                              </button>
                              <button
                                type="button"
                                className={`workhub-doc-ai-destination-option${actionItemsDestination === 'details' ? ' is-active' : ''}`}
                                onClick={() => setActionItemsDestination('details')}
                                disabled={isSending || isUploading}
                              >
                                Send to details panel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : null}
              </>
            )}
          </div>

          {!isSidebarLayout && (
          <div className="workhub-doc-ai-actions">
            <button
              type="button"
              className="workhub-primary-btn workhub-doc-ai-btn workhub-doc-ai-btn-primary workhub-doc-ai-send-btn"
              onClick={() => { void handleSend() }}
              disabled={!apiKeyReady || isSending || isUploading || (!prompt.trim() && attachments.length === 0)}
              title={assistantMode === 'discuss' ? 'Send discussion message' : 'Send to AI'}
              aria-label={assistantMode === 'discuss' ? 'Send discussion message' : 'Send to AI'}
            >
              {isSending ? (
                <span aria-hidden="true">…</span>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path d="M5 12h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  <path d="M12 5l7 7-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
            {renderVoiceButton()}
          </div>
          )}

          <div className="workhub-doc-ai-column workhub-doc-ai-column-response">
            <div className="workhub-doc-ai-column-head">
              <div className="workhub-doc-ai-column-head-main">
                <h3>{`${latestEntry?.assistantMode === 'discuss' ? 'Discussion' : 'Response'} (${entries.length})`}</h3>
                {entries.length > 0 && (
                  <button
                    type="button"
                    className="workhub-doc-ai-head-action"
                    onClick={handleClearHistory}
                    title="Clear history"
                    aria-label="Clear history"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M4 7h16" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                      <path d="M10 3h4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                      <path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                      <path d="M10 11v5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                      <path d="M14 11v5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
            <div ref={responsePaneRef} className="workhub-doc-ai-response-pane">
              {entries.length === 0 ? (
                <div className="workhub-doc-ai-empty-state">
                  The latest AI reply will appear here. In discuss mode, follow-up questions keep recent replies in context. In edit mode, you can still add the result to the document.
                </div>
              ) : (
                displayedEntries.map((entry) => (
                  <article key={entry.id} className="workhub-doc-ai-entry">
                    <div className="workhub-doc-ai-entry-label">You</div>
                    <p className="workhub-doc-ai-entry-prompt">{entry.prompt}</p>
                    {entry.selectedText && (
                      <div className="workhub-doc-ai-selection-preview">
                        <strong>Selected text</strong>
                        <p>{entry.selectedText}</p>
                      </div>
                    )}
                    {!entry.selectedText && (
                      <div className="workhub-doc-ai-selection-preview">
                        <strong>Target</strong>
                        <p>Full current tab</p>
                      </div>
                    )}
                    <div className="workhub-doc-ai-entry-label is-response">AI</div>
                    {entry.responseMode === 'html' ? (
                      <div
                        className="workhub-doc-ai-entry-response-preview"
                        dangerouslySetInnerHTML={{ __html: entry.response }}
                      />
                    ) : (
                      <pre className="workhub-doc-ai-entry-response">{entry.response}</pre>
                    )}
                    <div className="workhub-doc-ai-entry-status">{getEntryStatusLabel(entry)}</div>
                    {!readOnly && (
                      <div className="workhub-doc-ai-entry-actions">
                        <button type="button" className="workhub-ghost-btn workhub-doc-ai-btn workhub-doc-ai-btn-secondary" onClick={() => handleDismiss(entry.id)}>Reject</button>
                        {entry.assistantMode === 'discuss' && (
                          <button
                            type="button"
                            className="workhub-ghost-btn workhub-doc-ai-btn workhub-doc-ai-btn-secondary"
                            onClick={() => { void handleCopyReply(entry) }}
                          >
                            {copiedEntryId === entry.id ? 'Copied' : 'Copy reply'}
                          </button>
                        )}
                        <button type="button" className="workhub-ghost-btn workhub-doc-ai-btn workhub-doc-ai-btn-secondary" onClick={() => handleAdd(entry)}>
                          Add to document
                        </button>
                        {entry.assistantMode === 'edit' && entry.actionKind === 'actionItems' && onSendChecklistItemsToDetails && (
                          <button
                            type="button"
                            className={`workhub-doc-ai-btn ${entry.preferredDestination === 'details' ? 'workhub-doc-ai-btn-primary' : 'workhub-doc-ai-btn-secondary'} ${entry.preferredDestination === 'details' ? 'workhub-primary-btn' : 'workhub-ghost-btn'}`}
                            onClick={() => { void handleSendToDetails(entry) }}
                          >
                            Send to details panel
                          </button>
                        )}
                        {entry.assistantMode === 'edit' && entry.hadSelection && (
                          <button type="button" className="workhub-primary-btn workhub-doc-ai-btn workhub-doc-ai-btn-primary" onClick={() => handleReplace(entry)}>
                            Replace selection
                          </button>
                        )}
                      </div>
                    )}
                  </article>
                ))
              )}
            </div>
            {(error || !apiKeyReady) && (
              <div className="workhub-doc-ai-footer">
                {error ? <div className="workhub-doc-ai-error">{error}</div> : null}
                {!apiKeyReady ? <div className="workhub-doc-ai-error">OpenAI API key is missing, so document chat is disabled.</div> : null}
              </div>
            )}
          </div>
          </div>
        </>
      )}
    </section>
  )
}