export const MINI_GAME_IDS = [
  'clue-chain',
  'mystery-room-quiz',
  'build-the-story',
  'map-quest-trivia',
  'debate-duel-quiz',
  'puzzle-relay',
  'xo-duel',
  'gear-machine',
  'creator-studio',
  'time-pressure-heist',
  'memory-grid-battle',
  'reverse-quiz',
  'fact-or-fiction-lab',
  'creative-constraint-quiz',
  'alliance-betrayal-mode',
] as const

export type MiniGameId = typeof MINI_GAME_IDS[number]
export type MiniGameAccessTier = 'free' | 'premium'

export interface MiniGameDefinition {
  id: MiniGameId
  icon: string
  defaultEnglishName: string
  defaultArabicName: string
  description: string
  howToPlay: string
}

export const MINI_GAME_DEFINITIONS: Record<MiniGameId, MiniGameDefinition> = {
  'clue-chain': {
    id: 'clue-chain',
    icon: '🧩',
    defaultEnglishName: 'Clue Chain',
    defaultArabicName: 'سلسلة الأدلة',
    description: 'تسلسل يعتمد على جمع الأدلة خطوة بخطوة.',
    howToPlay: 'كل إجابة صحيحة تقرب الفريق من فك السلسلة كاملة.',
  },
  'mystery-room-quiz': {
    id: 'mystery-room-quiz',
    icon: '🕵️',
    defaultEnglishName: 'Mystery Room Quiz',
    defaultArabicName: 'غرفة الغموض',
    description: 'تحدي لغز غرفة غامضة مع تقدم مرحلي.',
    howToPlay: 'جاوبوا الأسئلة بالترتيب لفتح عناصر الغرفة والوصول للحل النهائي.',
  },
  'build-the-story': {
    id: 'build-the-story',
    icon: '📚',
    defaultEnglishName: 'Build-the-Story Challenge',
    defaultArabicName: 'ابنِ القصة',
    description: 'تجميع قصة تدريجيا عبر المراحل.',
    howToPlay: 'كل مرحلة تضيف جزءا للقصة حتى يكتمل التسلسل.',
  },
  'map-quest-trivia': {
    id: 'map-quest-trivia',
    icon: '🗺️',
    defaultEnglishName: 'Map Quest Trivia',
    defaultArabicName: 'رحلة الخريطة',
    description: 'رحلة نقاط على خريطة مبنية على الدقة والسرعة.',
    howToPlay: 'الإجابات الصحيحة تحرك الفريق إلى نقاط متقدمة على المسار.',
  },
  'debate-duel-quiz': {
    id: 'debate-duel-quiz',
    icon: '⚖️',
    defaultEnglishName: 'Debate Duel Quiz',
    defaultArabicName: 'مبارزة المناظرة',
    description: 'مواجهة تعتمد على الاختيار ثم الدفاع عن الإجابة.',
    howToPlay: 'بعد الإجابة، قدم الحجة الأسرع والأقوى لكسب نقاط إضافية.',
  },
  'puzzle-relay': {
    id: 'puzzle-relay',
    icon: '🧠',
    defaultEnglishName: 'Puzzle Relay',
    defaultArabicName: 'تناوب الألغاز',
    description: 'تتابع أدوار: لاعب واحد يجيب في كل جولة.',
    howToPlay: 'انضموا بلاعبين على الأقل؛ في كل جولة يظهر اللاعب النشط فقط.',
  },
  'xo-duel': {
    id: 'xo-duel',
    icon: '⭕',
    defaultEnglishName: 'XO Duel',
    defaultArabicName: 'مبارزة XO',
    description: 'مبارزة X/O بين لاعبين داخل الجلسة.',
    howToPlay: 'اختاروا الخلايا بالتناوب حتى الفوز أو التعادل.',
  },
  'gear-machine': {
    id: 'gear-machine',
    icon: '⚙️',
    defaultEnglishName: 'Gear Machine',
    defaultArabicName: 'آلة التروس',
    description: 'لف التروس حتى تصبح الآلة جاهزة.',
    howToPlay: 'كل لاعب يضبط زوايا التروس ثم يشغل الآلة؛ أول تطابق يفوز.',
  },
  'creator-studio': {
    id: 'creator-studio',
    icon: '🎨',
    defaultEnglishName: 'Creator Studio',
    defaultArabicName: 'استوديو المبدع',
    description: 'اختيار صانع عشوائيا، ثم الجمهور يقيمه من 10.',
    howToPlay: 'الصانع يرسم أو يرتب العناصر ثم يصوت الجمهور من 1 إلى 10.',
  },
  'time-pressure-heist': {
    id: 'time-pressure-heist',
    icon: '⏱️',
    defaultEnglishName: 'Time-Pressure Heist',
    defaultArabicName: 'سطو ضغط الوقت',
    description: 'سباق ضد الوقت مع ضغط متزايد.',
    howToPlay: 'الإجابات السريعة والدقيقة ضرورية لتجاوز كل مرحلة قبل انتهاء الوقت.',
  },
  'memory-grid-battle': {
    id: 'memory-grid-battle',
    icon: '🟦',
    defaultEnglishName: 'Memory Grid Battle',
    defaultArabicName: 'معركة شبكة الذاكرة',
    description: 'تحدي ذاكرة بصري ضمن شبكة متغيرة.',
    howToPlay: 'احفظ نمط الشبكة ثم أجب بدقة لاستمرار التقدم.',
  },
  'reverse-quiz': {
    id: 'reverse-quiz',
    icon: '🔁',
    defaultEnglishName: 'Reverse Quiz',
    defaultArabicName: 'الاختبار المعكوس',
    description: 'قلب منطق السؤال والإجابة لرفع الصعوبة.',
    howToPlay: 'اقرأ المطلوب بدقة لأن منطق الاختيار يكون معكوسا.',
  },
  'fact-or-fiction-lab': {
    id: 'fact-or-fiction-lab',
    icon: '🧪',
    defaultEnglishName: 'Fact or Fiction Lab',
    defaultArabicName: 'مختبر حقيقة أم خيال',
    description: 'تمييز الحقائق من المعلومات المضللة.',
    howToPlay: 'حدد هل العبارة حقيقة أم خيال مع الانتباه للتفاصيل.',
  },
  'creative-constraint-quiz': {
    id: 'creative-constraint-quiz',
    icon: '🎭',
    defaultEnglishName: 'Creative Constraint Quiz',
    defaultArabicName: 'تحدي القيود الإبداعية',
    description: 'حلول ضمن قيود إبداعية محددة.',
    howToPlay: 'فكر خارج الصندوق لكن التزم بالقيد المطلوب في كل جولة.',
  },
  'alliance-betrayal-mode': {
    id: 'alliance-betrayal-mode',
    icon: '🤝',
    defaultEnglishName: 'Alliance & Betrayal Mode',
    defaultArabicName: 'وضع التحالف والخيانة',
    description: 'تحالفات مؤقتة ومفاجآت تنافسية.',
    howToPlay: 'نسق مع فريقك مؤقتا ثم اختر لحظة الحسم المناسبة.',
  },
}

export const DEFAULT_ENABLED_MINI_GAME_IDS: MiniGameId[] = [...MINI_GAME_IDS]

export const MINI_GAME_DEFAULT_ENGLISH_NAMES: Record<MiniGameId, string> = MINI_GAME_IDS.reduce((acc, id) => {
  acc[id] = MINI_GAME_DEFINITIONS[id].defaultEnglishName
  return acc
}, {} as Record<MiniGameId, string>)

export const MINI_GAME_DEFAULT_ARABIC_NAMES: Record<MiniGameId, string> = MINI_GAME_IDS.reduce((acc, id) => {
  acc[id] = MINI_GAME_DEFINITIONS[id].defaultArabicName
  return acc
}, {} as Record<MiniGameId, string>)

export const MINI_GAME_DEFAULT_ACCESS_BY_ID: Record<MiniGameId, MiniGameAccessTier> = MINI_GAME_IDS.reduce((acc, id) => {
  acc[id] = 'free'
  return acc
}, {} as Record<MiniGameId, MiniGameAccessTier>)

export function normalizeEnabledMiniGameIds(value: unknown): MiniGameId[] {
  const allowed = new Set<MiniGameId>(MINI_GAME_IDS)
  if (!Array.isArray(value)) return [...DEFAULT_ENABLED_MINI_GAME_IDS]

  const cleaned = value
    .filter((item): item is MiniGameId => typeof item === 'string' && allowed.has(item as MiniGameId))
    .filter((item, index, arr) => arr.indexOf(item) === index)

  return cleaned.length > 0 ? cleaned : [...DEFAULT_ENABLED_MINI_GAME_IDS]
}

export function normalizeMiniGameEnglishNames(value: unknown): Record<MiniGameId, string> {
  const base: Record<MiniGameId, string> = { ...MINI_GAME_DEFAULT_ENGLISH_NAMES }
  if (!value || typeof value !== 'object') return base

  const source = value as Partial<Record<MiniGameId, unknown>>
  for (const id of MINI_GAME_IDS) {
    const candidate = source[id]
    if (typeof candidate !== 'string') continue
    const trimmed = candidate.trim()
    if (trimmed) base[id] = trimmed
  }
  return base
}

export function normalizeMiniGameArabicNames(value: unknown): Record<MiniGameId, string> {
  const base: Record<MiniGameId, string> = { ...MINI_GAME_DEFAULT_ARABIC_NAMES }
  if (!value || typeof value !== 'object') return base

  const source = value as Partial<Record<MiniGameId, unknown>>
  for (const id of MINI_GAME_IDS) {
    const candidate = source[id]
    if (typeof candidate !== 'string') continue
    const trimmed = candidate.trim()
    if (trimmed) base[id] = trimmed
  }
  return base
}

export function normalizeMiniGameAccessById(value: unknown): Record<MiniGameId, MiniGameAccessTier> {
  const base: Record<MiniGameId, MiniGameAccessTier> = { ...MINI_GAME_DEFAULT_ACCESS_BY_ID }
  if (!value || typeof value !== 'object') return base

  const source = value as Partial<Record<MiniGameId, unknown>>
  for (const id of MINI_GAME_IDS) {
    const candidate = source[id]
    if (candidate === 'free' || candidate === 'premium') {
      base[id] = candidate
    }
  }
  return base
}
