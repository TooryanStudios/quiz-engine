import type { QuizQuestion } from '../types/quiz'
import type { QuestionTypeId } from './questionTypes'

const DEFAULT_OPTIONS = ['A', 'B', 'C', 'D']
const DEFAULT_TIMER_OPTIONS = [10, 15, 20, 30, 45, 60, 90, 120]

type PreviewMeta = {
  label: string
  color: string
  icon: string
}

type TimerPolicy = {
  kind: 'fixed'
  defaultDuration: number
  allowedDurations: number[]
}

type EditorMeta = {
  answerMode: 'options' | 'pairs' | 'ordering' | 'text'
  selectionMode?: 'single' | 'multi'
  optionsMin?: number
  optionsMax?: number
  hasBossSettings?: boolean
  optionsSectionLabel?: string
  optionsModeSingleLabel?: string
  optionsModeMultiLabel?: string
  textSettingsLabel?: string
  bossSettingsLabel?: string
  pairsSectionLabel?: string
  orderingSectionLabel?: string
}

type QuestionTypeSchema = {
  preview: PreviewMeta
  timerPolicy: TimerPolicy
  editor: EditorMeta
  createDefaultQuestion: () => QuizQuestion
}

export const QUESTION_TYPE_SCHEMAS: Record<QuestionTypeId, QuestionTypeSchema> = {
  single: {
    preview: { label: 'اختيار واحد', color: '#2563eb', icon: '🔘' },
    timerPolicy: { kind: 'fixed', defaultDuration: 20, allowedDurations: [...DEFAULT_TIMER_OPTIONS] },
    editor: {
      answerMode: 'options',
      selectionMode: 'single',
      optionsMin: 2,
      optionsMax: 6,
      optionsSectionLabel: 'الخيارات والإجابات الصحيحة',
      optionsModeSingleLabel: '• اختيار واحد',
      optionsModeMultiLabel: '• اختيار متعدد',
    },
    createDefaultQuestion: () => ({ type: 'single', text: 'سؤال اختيار واحد', options: [...DEFAULT_OPTIONS], correctIndex: 0, duration: 20 }),
  },
  multi: {
    preview: { label: 'اختيار متعدد', color: '#7c3aed', icon: '☑️' },
    timerPolicy: { kind: 'fixed', defaultDuration: 25, allowedDurations: [...DEFAULT_TIMER_OPTIONS] },
    editor: {
      answerMode: 'options',
      selectionMode: 'multi',
      optionsMin: 2,
      optionsMax: 6,
      optionsSectionLabel: 'الخيارات والإجابات الصحيحة',
      optionsModeSingleLabel: '• اختيار واحد',
      optionsModeMultiLabel: '• اختيار متعدد',
    },
    createDefaultQuestion: () => ({ type: 'multi', text: 'سؤال اختيار متعدد', options: [...DEFAULT_OPTIONS], correctIndices: [0], duration: 25 }),
  },
  match: {
    preview: { label: 'مطابقة', color: '#0891b2', icon: '🔗' },
    timerPolicy: { kind: 'fixed', defaultDuration: 35, allowedDurations: [...DEFAULT_TIMER_OPTIONS] },
    editor: { answerMode: 'pairs', pairsSectionLabel: 'أزواج المطابقة' },
    createDefaultQuestion: () => ({
      type: 'match',
      text: 'سؤال مطابقة',
      pairs: [
        { left: 'A', right: '1' },
        { left: 'B', right: '2' },
        { left: 'C', right: '3' },
        { left: 'D', right: '4' },
      ],
      duration: 35,
    }),
  },
  match_plus: {
    preview: { label: 'مطابقة بلس', color: '#0e7490', icon: '🧠🔗' },
    timerPolicy: { kind: 'fixed', defaultDuration: 35, allowedDurations: [...DEFAULT_TIMER_OPTIONS] },
    editor: { answerMode: 'pairs', pairsSectionLabel: 'أزواج المطابقة (صور)' },
    createDefaultQuestion: () => ({
      type: 'match_plus',
      text: 'سؤال مطابقة بلس',
      pairs: [
        { left: '/images/QYan_logo_300x164.jpg', right: '/images/QYan_logo_300x164.jpg' },
        { left: '/images/QYan_logo_300x164.jpg', right: '/images/QYan_logo_300x164.jpg' },
        { left: '/images/QYan_logo_300x164.jpg', right: '/images/QYan_logo_300x164.jpg' },
        { left: '/images/QYan_logo_300x164.jpg', right: '/images/QYan_logo_300x164.jpg' },
      ],
      duration: 35,
    }),
  },
  order: {
    preview: { label: 'ترتيب', color: '#d97706', icon: '🔢' },
    timerPolicy: { kind: 'fixed', defaultDuration: 30, allowedDurations: [...DEFAULT_TIMER_OPTIONS] },
    editor: { answerMode: 'ordering', orderingSectionLabel: 'ترتيب العناصر' },
    createDefaultQuestion: () => ({ type: 'order', text: 'سؤال ترتيب', items: ['العنصر 1', 'العنصر 2', 'العنصر 3', 'العنصر 4'], correctOrder: [0, 1, 2, 3], duration: 30 }),
  },
  order_plus: {
    preview: { label: 'ترتيب بلس', color: '#b45309', icon: '🧠' },
    timerPolicy: { kind: 'fixed', defaultDuration: 30, allowedDurations: [...DEFAULT_TIMER_OPTIONS] },
    editor: { answerMode: 'ordering', orderingSectionLabel: 'ترتيب العناصر' },
    createDefaultQuestion: () => ({ type: 'order_plus', text: 'سؤال ترتيب بلس', items: ['العنصر 1', 'العنصر 2', 'العنصر 3', 'العنصر 4'], correctOrder: [0, 1, 2, 3], duration: 30 }),
  },
  type: {
    preview: { label: 'إجابة مكتوبة', color: '#059669', icon: '✍️' },
    timerPolicy: { kind: 'fixed', defaultDuration: 20, allowedDurations: [...DEFAULT_TIMER_OPTIONS] },
    editor: { answerMode: 'text', textSettingsLabel: 'إعدادات Type Sprint' },
    createDefaultQuestion: () => ({ type: 'type', text: 'Type Sprint', acceptedAnswers: [''], inputPlaceholder: 'Type your answer', duration: 20 }),
  },
  boss: {
    preview: { label: 'Boss Battle', color: '#dc2626', icon: '⚔️' },
    timerPolicy: { kind: 'fixed', defaultDuration: 25, allowedDurations: [...DEFAULT_TIMER_OPTIONS] },
    editor: {
      answerMode: 'options',
      selectionMode: 'single',
      optionsMin: 2,
      optionsMax: 6,
      hasBossSettings: true,
      optionsSectionLabel: 'الخيارات والإجابات الصحيحة',
      optionsModeSingleLabel: '• اختيار واحد',
      optionsModeMultiLabel: '• اختيار متعدد',
      bossSettingsLabel: 'إعدادات Boss Battle',
    },
    createDefaultQuestion: () => ({ type: 'boss', text: 'Boss Battle', options: [...DEFAULT_OPTIONS], correctIndex: 0, bossName: 'Tooryan Boss', bossHp: 100, duration: 25 }),
  },
}

export function getQuestionTypeDefaultQuestion(type: QuestionTypeId): QuizQuestion {
  return QUESTION_TYPE_SCHEMAS[type].createDefaultQuestion()
}

export function getQuestionTypePreviewMeta(type: QuestionTypeId): PreviewMeta {
  return QUESTION_TYPE_SCHEMAS[type]?.preview || { label: type, color: '#475569', icon: '❓' }
}

export function getQuestionTypeTimerPolicy(type: QuestionTypeId): TimerPolicy {
  return QUESTION_TYPE_SCHEMAS[type]?.timerPolicy || { kind: 'fixed', defaultDuration: 20, allowedDurations: [...DEFAULT_TIMER_OPTIONS] }
}

export function getQuestionTypeEditorMeta(type: QuestionTypeId): EditorMeta {
  const editor = QUESTION_TYPE_SCHEMAS[type]?.editor || { answerMode: 'options', selectionMode: 'single', optionsMin: 2, optionsMax: 6 }
  return {
    optionsSectionLabel: 'الخيارات والإجابات الصحيحة',
    optionsModeSingleLabel: '• اختيار واحد',
    optionsModeMultiLabel: '• اختيار متعدد',
    textSettingsLabel: 'إعدادات Type Sprint',
    bossSettingsLabel: 'إعدادات Boss Battle',
    pairsSectionLabel: 'أزواج المطابقة',
    orderingSectionLabel: 'ترتيب العناصر',
    ...editor,
  }
}

export function coerceQuestionToSchemaType(existing: QuizQuestion, type: QuestionTypeId): QuizQuestion {
  const base = getQuestionTypeDefaultQuestion(type)
  const duration = Number.isFinite(existing.duration) ? existing.duration : base.duration
  const editor = getQuestionTypeEditorMeta(type)

  if (editor.answerMode === 'options' && editor.selectionMode !== 'multi') {
    const maxOptions = editor.optionsMax ?? 6
    return applyCreatorStudioFields({
      ...base,
      text: existing.text || base.text,
      media: existing.media,
      duration,
      options: (existing.options && existing.options.length > 0 ? existing.options : base.options)!.slice(0, maxOptions),
      correctIndex: typeof existing.correctIndex === 'number' ? existing.correctIndex : base.correctIndex,
      bossName: editor.hasBossSettings ? (existing.bossName || base.bossName) : undefined,
      bossHp: editor.hasBossSettings ? (existing.bossHp || base.bossHp) : undefined,
    }, existing)
  }

  if (editor.answerMode === 'options' && editor.selectionMode === 'multi') {
    const maxOptions = editor.optionsMax ?? 6
    return applyCreatorStudioFields({
      ...base,
      text: existing.text || base.text,
      media: existing.media,
      duration,
      options: (existing.options && existing.options.length > 0 ? existing.options : base.options)!.slice(0, maxOptions),
      correctIndices: (existing.correctIndices && existing.correctIndices.length > 0 ? existing.correctIndices : base.correctIndices) || [0],
    }, existing)
  }

  if (editor.answerMode === 'pairs') {
    return applyCreatorStudioFields({
      ...base,
      text: existing.text || base.text,
      media: existing.media,
      duration,
      pairs: existing.pairs && existing.pairs.length > 0 ? existing.pairs : base.pairs,
    }, existing)
  }

  if (editor.answerMode === 'ordering') {
    return applyCreatorStudioFields({
      ...base,
      text: existing.text || base.text,
      media: existing.media,
      duration,
      items: existing.items && existing.items.length > 0 ? existing.items : base.items,
      correctOrder: existing.correctOrder && existing.correctOrder.length > 0 ? existing.correctOrder : base.correctOrder,
    }, existing)
  }

  return applyCreatorStudioFields({
    ...base,
    text: existing.text || base.text,
    media: existing.media,
    duration,
    acceptedAnswers: existing.acceptedAnswers && existing.acceptedAnswers.length > 0 ? existing.acceptedAnswers : base.acceptedAnswers,
    inputPlaceholder: existing.inputPlaceholder || base.inputPlaceholder,
  }, existing)
}

function normalizeDurationByPolicy(value: number | undefined, policy: TimerPolicy): number {
  const next = Number(value)
  if (!Number.isFinite(next)) return policy.defaultDuration
  return policy.allowedDurations.includes(next) ? next : policy.defaultDuration
}

function clampIndex(value: number | undefined, maxExclusive: number, fallback: number): number {
  if (!Number.isInteger(value)) return fallback
  return Math.max(0, Math.min(maxExclusive - 1, value as number))
}

function normalizeCreatorTask(value: unknown): 'draw' | 'arrange' | undefined {
  if (value === 'draw' || value === 'arrange') return value
  return undefined
}

function normalizeCreatorElements(values: unknown): string[] | undefined {
  if (!Array.isArray(values)) return undefined
  const cleaned = Array.from(new Set(values
    .map((value) => String(value ?? '').trim())
    .filter(Boolean)
    .slice(0, 10)))
  return cleaned.length > 0 ? cleaned : undefined
}

function applyCreatorStudioFields(question: QuizQuestion, source: Partial<QuizQuestion> = question): QuizQuestion {
  const creatorTask = normalizeCreatorTask(source.creatorTask)
  const creatorElements = normalizeCreatorElements(source.creatorElements)
  return {
    ...question,
    creatorTask,
    creatorElements,
  }
}

export function sanitizeQuestionBySchema(question: QuizQuestion): QuizQuestion {
  const normalized = coerceQuestionToSchemaType(question, question.type)
  const editor = getQuestionTypeEditorMeta(question.type)
  const timerPolicy = getQuestionTypeTimerPolicy(question.type)
  const duration = normalizeDurationByPolicy(normalized.duration, timerPolicy)

  if (editor.answerMode === 'options') {
    const minOptions = editor.optionsMin ?? 2
    const maxOptions = editor.optionsMax ?? 6
    const fallbackOptions = (getQuestionTypeDefaultQuestion(question.type).options || [...DEFAULT_OPTIONS]).slice(0, maxOptions)
    const options = (normalized.options || fallbackOptions).slice(0, maxOptions)
    while (options.length < minOptions) {
      options.push(fallbackOptions[options.length] || '')
    }

    if (editor.selectionMode === 'multi') {
      const correctSet = new Set(
        (normalized.correctIndices || [])
          .filter((value) => Number.isInteger(value) && value >= 0 && value < options.length),
      )
      if (correctSet.size === 0) correctSet.add(0)
      return applyCreatorStudioFields({
        ...normalized,
        duration,
        options,
        correctIndices: [...correctSet].sort((a, b) => a - b),
      })
    }

    const correctIndex = clampIndex(normalized.correctIndex, options.length, 0)
    return applyCreatorStudioFields({
      ...normalized,
      duration,
      options,
      correctIndex,
    })
  }

  if (editor.answerMode === 'pairs') {
    const fallbackPairs = getQuestionTypeDefaultQuestion(question.type).pairs || []
    const pairs = (normalized.pairs || fallbackPairs)
      .filter((pair) => pair && (pair.left?.trim() || pair.right?.trim()))
    return applyCreatorStudioFields({
      ...normalized,
      duration,
      pairs: pairs.length > 0 ? pairs : fallbackPairs,
    })
  }

  if (editor.answerMode === 'ordering') {
    const fallback = getQuestionTypeDefaultQuestion(question.type)
    const items = (normalized.items && normalized.items.length > 0 ? normalized.items : fallback.items || []).slice(0, 8)
    const max = items.length
    const unique = Array.from(new Set((normalized.correctOrder || []).filter((value) => Number.isInteger(value) && value >= 0 && value < max)))
    const missing = Array.from({ length: max }, (_, idx) => idx).filter((idx) => !unique.includes(idx))
    return applyCreatorStudioFields({
      ...normalized,
      duration,
      items,
      correctOrder: [...unique, ...missing],
    })
  }

  const fallbackAnswers = getQuestionTypeDefaultQuestion(question.type).acceptedAnswers || ['']
  const acceptedAnswers = Array.from(new Set((normalized.acceptedAnswers || [])
    .map((value) => value.trim())
    .filter(Boolean)))

  return applyCreatorStudioFields({
    ...normalized,
    duration,
    acceptedAnswers: acceptedAnswers.length > 0 ? acceptedAnswers : fallbackAnswers,
    inputPlaceholder: normalized.inputPlaceholder?.trim() || (getQuestionTypeDefaultQuestion(question.type).inputPlaceholder || ''),
  })
}
