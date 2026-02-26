export const QUESTION_TYPE_IDS = ['single', 'multi', 'match', 'match_plus', 'order', 'order_plus', 'type', 'boss'] as const

export type QuestionTypeId = typeof QUESTION_TYPE_IDS[number]
export type QuestionTypeAccessTier = 'free' | 'premium'

export const DEFAULT_ENABLED_QUESTION_TYPE_IDS: QuestionTypeId[] = [
  'single',
  'multi',
  'match',
  'match_plus',
  'order',
  'order_plus',
  'type',
  'boss',
]

export const ENABLED_QUESTION_TYPE_IDS: QuestionTypeId[] = [...DEFAULT_ENABLED_QUESTION_TYPE_IDS]

export const QUESTION_TYPE_ARABIC_TITLES: Record<QuestionTypeId, string> = {
  single: 'اختيار واحد',
  multi: 'اختيار متعدد',
  match: 'مطابقة',
  match_plus: 'مطابقة بلس',
  order: 'ترتيب',
  order_plus: 'ترتيب بلس',
  type: 'كتابة الإجابة',
  boss: 'سؤال زعيم',
}

export const QUESTION_TYPE_DEFAULT_TITLES: Record<QuestionTypeId, string> = { ...QUESTION_TYPE_ARABIC_TITLES }

export const QUESTION_TYPE_DEFAULT_ACCESS_BY_TYPE: Record<QuestionTypeId, QuestionTypeAccessTier> = {
  single: 'free',
  multi: 'free',
  match: 'free',
  match_plus: 'free',
  order: 'free',
  order_plus: 'free',
  type: 'free',
  boss: 'free',
}

export const QUESTION_TYPE_LABELS: Record<QuestionTypeId, string> = {
  single: '🧩 اختيار واحد (اختر جوابًا واحدًا صحيحًا)',
  multi: '✅ اختيار متعدد (قد يكون أكثر من جواب صحيح)',
  match: '🔗 مطابقة (صِل كل عنصر بما يناسبه)',
  match_plus: '🧠🔗 مطابقة بلس (نسخة إضافية من المطابقة)',
  order: '🔢 ترتيب (رتّب العناصر بالترتيب الصحيح)',
  order_plus: '🧠 ترتيب بلس (نسخة إضافية من الترتيب)',
  type: '⌨️ كتابة الإجابة (اكتب الجواب بنفسك)',
  boss: '👑 سؤال زعيم (اختيار واحد بصيغة تحدي)',
}

export function normalizeEnabledQuestionTypeIds(value: unknown): QuestionTypeId[] {
  const allowed = new Set<QuestionTypeId>(QUESTION_TYPE_IDS)
  if (!Array.isArray(value)) return [...DEFAULT_ENABLED_QUESTION_TYPE_IDS]

  const cleaned = value
    .filter((item): item is QuestionTypeId => typeof item === 'string' && allowed.has(item as QuestionTypeId))
    .filter((item, index, arr) => arr.indexOf(item) === index)

  return cleaned.length > 0 ? cleaned : [...DEFAULT_ENABLED_QUESTION_TYPE_IDS]
}

export function normalizeQuestionTypeTitles(
  value: unknown,
): Record<QuestionTypeId, string> {
  const base: Record<QuestionTypeId, string> = { ...QUESTION_TYPE_DEFAULT_TITLES }
  if (!value || typeof value !== 'object') return base

  const source = value as Partial<Record<QuestionTypeId, unknown>>
  for (const id of QUESTION_TYPE_IDS) {
    const candidate = source[id]
    if (typeof candidate !== 'string') continue
    const trimmed = candidate.trim()
    if (!trimmed) continue
    base[id] = trimmed
  }

  return base
}

export function normalizeQuestionTypeAccessByType(
  value: unknown,
): Record<QuestionTypeId, QuestionTypeAccessTier> {
  const base: Record<QuestionTypeId, QuestionTypeAccessTier> = { ...QUESTION_TYPE_DEFAULT_ACCESS_BY_TYPE }
  if (!value || typeof value !== 'object') return base

  const source = value as Partial<Record<QuestionTypeId, unknown>>
  for (const id of QUESTION_TYPE_IDS) {
    const candidate = source[id]
    if (candidate === 'free' || candidate === 'premium') {
      base[id] = candidate
    }
  }

  return base
}

export function toQuestionTypeOptions(enabledQuestionTypeIds: QuestionTypeId[]): Array<{ value: QuestionTypeId; label: string }> {
  return enabledQuestionTypeIds.map((value) => ({
    value,
    label: QUESTION_TYPE_LABELS[value],
  }))
}

export const QUESTION_TYPE_OPTIONS: Array<{ value: QuestionTypeId; label: string }> = toQuestionTypeOptions(ENABLED_QUESTION_TYPE_IDS)

export function isEnabledQuestionType(value: unknown): value is QuestionTypeId {
  return typeof value === 'string' && ENABLED_QUESTION_TYPE_IDS.includes(value as QuestionTypeId)
}

function validateQuestionTypeConfig() {
  const baseSet = new Set<string>(QUESTION_TYPE_IDS)
  const enabledSet = new Set<string>(ENABLED_QUESTION_TYPE_IDS)
  const labeledSet = new Set<string>(Object.keys(QUESTION_TYPE_LABELS))

  const missingEnabled = QUESTION_TYPE_IDS.filter((id) => !enabledSet.has(id))
  const invalidEnabled = ENABLED_QUESTION_TYPE_IDS.filter((id) => !baseSet.has(id))
  const missingLabels = QUESTION_TYPE_IDS.filter((id) => !labeledSet.has(id))
  const extraLabels = [...labeledSet].filter((id) => !baseSet.has(id))
  const duplicateEnabled = ENABLED_QUESTION_TYPE_IDS.filter((id, index, arr) => arr.indexOf(id) !== index)

  const hasDrift = missingEnabled.length > 0
    || invalidEnabled.length > 0
    || missingLabels.length > 0
    || extraLabels.length > 0
    || duplicateEnabled.length > 0

  if (!hasDrift) return

  console.warn('[questionTypes] Configuration drift detected', {
    missingEnabled,
    invalidEnabled,
    missingLabels,
    extraLabels,
    duplicateEnabled,
  })
}

if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
  validateQuestionTypeConfig()
}
