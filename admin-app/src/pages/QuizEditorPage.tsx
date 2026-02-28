import { useEffect, useMemo, useRef, useState } from 'react'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../lib/firebase'
import { useNavigate, useParams } from 'react-router-dom'
import { auth } from '../lib/firebase'
import { useDialog } from '../lib/DialogContext'
import { useToast } from '../lib/ToastContext'
import { useSubscription } from '../lib/useSubscription'
import { guardedLaunchGame } from '../lib/gameLaunch'
import { buildHostGameUrl } from '../lib/gameModeUrl'
import { getHostLaunchAuthParams } from '../lib/hostLaunchAuth'
import type { ChallengePreset, QuizDoc, QuizMedia, QuizQuestion, QuestionType } from '../types/quiz'
import {
  DEFAULT_ENABLED_QUESTION_TYPE_IDS,
  QUESTION_TYPE_DEFAULT_ACCESS_BY_TYPE,
  QUESTION_TYPE_OPTIONS,
  normalizeEnabledQuestionTypeIds,
  toQuestionTypeOptions,
  type QuestionTypeAccessTier,
  type QuestionTypeId,
} from '../config/questionTypes'
import {
  DEFAULT_ENABLED_MINI_GAME_IDS,
  MINI_GAME_DEFINITIONS,
  MINI_GAME_DEFAULT_ACCESS_BY_ID,
  MINI_GAME_DEFAULT_ARABIC_NAMES,
  MINI_GAME_DEFAULT_ENGLISH_NAMES,
  MINI_GAME_IDS,
  type MiniGameAccessTier,
  type MiniGameId,
} from '../config/miniGames'
import {
  coerceQuestionToSchemaType,
  getQuestionTypeEditorMeta,
  getQuestionTypeTimerPolicy,
  sanitizeQuestionBySchema,
} from '../config/questionTypeSchemas'
import { createQuiz, deleteQuiz, findQuizByOwnerAndSlug, getQuizById, updateQuiz } from '../lib/quizRepo'
import { incrementPlatformStat, subscribeMiniGameSettings, subscribeQuestionTypeSettings } from '../lib/adminRepo'
import placeholderImg from '../assets/QYan_logo_300x164.jpg'

const IS_LOCAL_DEV = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)
const SERVER_BASE = IS_LOCAL_DEV
  ? (import.meta.env.VITE_LOCAL_GAME_URL || 'http://localhost:3001')
  : (import.meta.env.VITE_API_BASE_URL || 'https://play.qyan.app')

const SAMPLE_QUESTIONS: QuizQuestion[] = [
  {
    type: 'single', duration: 20,
    text: '🐋 ما هو أكبر حيوان في العالم؟',
    options: ['الفيل', 'الحوت الأزرق', 'القرش الأبيض', 'الزرافة'],
    correctIndex: 1,
  },
  {
    type: 'multi', duration: 25,
    text: '🦋 أيّ من هذه الحيوانات من الثدييات؟ (اختر كل ما ينطبق)',
    options: ['الدلفين', 'القرش', 'الخفاش', 'التمساح'],
    correctIndices: [0, 2],
  },
  {
    type: 'order', duration: 30,
    text: '📏 رتّب هذه الحيوانات من الأصغر إلى الأكبر',
    items: ['فأر', 'قطة', 'ذئب', 'حصان'],
    correctOrder: [0, 1, 2, 3],
  },
  {
    type: 'match', duration: 35,
    text: '🍼 طابق كل حيوان بصغيره',
    pairs: [
      { left: 'بقرة', right: 'عجل' },
      { left: 'خروف', right: 'حَمَل' },
      { left: 'كلب', right: 'جرو' },
      { left: 'قطة', right: 'هريرة' },
    ],
  },
  {
    type: 'type', duration: 20,
    text: '✍️ اكتب عاصمة عُمان',
    acceptedAnswers: ['مسقط', 'muscat'],
    inputPlaceholder: 'اكتب الإجابة هنا',
  },
  {
    type: 'boss', duration: 25,
    text: '⚔️ أي كوكب يُعرف بالكوكب الأحمر؟',
    options: ['الزهرة', 'المريخ', 'المشتري', 'نبتون'],
    correctIndex: 1,
    bossName: 'Tooryan Guardian',
    bossHp: 120,
  },
]

const CLASSIC_GAME_MODE = {
  id: '',
  icon: '📘',
  englishName: 'Classic Quiz',
  arabicName: 'اختبار كلاسيكي',
  description: 'وضع الاختبار التقليدي بدون ميني جيم.',
  howToPlay: 'يتم لعب الأسئلة بالشكل المعتاد.',
  access: 'free' as const,
  enabled: true,
}

const starterQuestion: QuizQuestion = {
  type: 'single',
  text: '',
  options: ['', '', '', ''],
  correctIndex: 0,
  duration: 20,
}

const creatorStudioStarterQuestion: QuizQuestion = {
  type: 'type',
  text: '',
  duration: 30,
  creatorTask: 'draw',
}

function normalizeQuestionType(value: unknown): QuestionType {
  if (typeof value !== 'string') return 'single'
  return normalizeEnabledQuestionTypeIds([value])[0] || 'single'
}

function coerceQuestionToType(existing: QuizQuestion, type: QuestionType): QuizQuestion {
  return coerceQuestionToSchemaType(existing, type)
}

function sanitizeQuestion(question: QuizQuestion): QuizQuestion {
  const normalizedType = normalizeQuestionType((question as { type?: unknown }).type)
  const normalizedQuestion = question.type === normalizedType
    ? question
    : coerceQuestionToType({ ...question, type: normalizedType }, normalizedType)
  return sanitizeQuestionBySchema(normalizedQuestion)
}

function sanitizeQuestions(questions: QuizQuestion[] | undefined | null): QuizQuestion[] {
  if (!Array.isArray(questions)) return []
  return questions.map((question) => sanitizeQuestion(question))
}

function coerceQuestionToCreatorStudioDraw(question: QuizQuestion): QuizQuestion {
  const { creatorElements: _creatorElements, ...rest } = question
  return {
    ...rest,
    creatorTask: 'draw',
  }
}

function parseNumberList(input: string, max: number) {
  return input
    .split(',')
    .map((v) => Number(v.trim()))
    .filter((v) => Number.isInteger(v) && v >= 0 && v < max)
}

function titleToSlug(t: string): string {
  return t
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50)
}

function getOwnerSlugPrefix(ownerId: string): string {
  if (!ownerId) return ''
  return `u-${ownerId.slice(0, 6)}`
}

function ensureScopedSlug(raw: string, ownerId: string): string {
  const base = raw.trim() || 'quiz'
  const prefix = getOwnerSlugPrefix(ownerId)
  if (!prefix) return base
  if (base.startsWith(`${prefix}-`)) return base
  return `${prefix}-${base}`
}

export function QuizEditorPage() {
  const { id: routeId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { show: showDialog } = useDialog()
  const { showToast } = useToast()
  const { isSubscribed } = useSubscription()
  // Always points to the latest saveQuiz closure so setTimeout callbacks never use stale state
  const saveQuizRef = useRef<() => Promise<void>>(() => Promise.resolve())

  const [quizId, setQuizId] = useState<string | null>(routeId ?? null)
  const [contentType, setContentType] = useState<'quiz' | 'mini-game'>('quiz')
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'private'>('public')
  const [gameModeId, setGameModeId] = useState<string>('')
  const [miniGameConfig, setMiniGameConfig] = useState<Record<string, unknown>>({})
  const [challengePreset, setChallengePreset] = useState<ChallengePreset>('classic')
  const [enableScholarRole, setEnableScholarRole] = useState(false)
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [showMetadataDialog, setShowMetadataDialog] = useState(false)
  const [showContentTypeDialog, setShowContentTypeDialog] = useState(!routeId)
  const [tempContentType, setTempContentType] = useState<'quiz' | 'mini-game'>('quiz')
  const [tempTitle, setTempTitle] = useState('')
  const [tempSlug, setTempSlug] = useState('')
  const [tempVisibility, setTempVisibility] = useState<'public' | 'private'>('public')
  const [tempGameModeId, setTempGameModeId] = useState<string>('')
  const [tempChallenge, setTempChallenge] = useState<ChallengePreset>('classic')
  const [tempEnableScholarRole, setTempEnableScholarRole] = useState(false)
  const [metadataChecking, setMetadataChecking] = useState(false)
  const [randomizeQuestions, setRandomizeQuestions] = useState(false)
  const [tempRandomizeQuestions, setTempRandomizeQuestions] = useState(false)
  const [collapsedQuestions, setCollapsedQuestions] = useState<boolean[]>([])
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null)
  const [uploadingPairImageKey, setUploadingPairImageKey] = useState<string | null>(null)
  const [coverImage, setCoverImage] = useState<string>('')
  const [tempCoverImage, setTempCoverImage] = useState<string>('')
  const [coverPreviewChecking, setCoverPreviewChecking] = useState(false)
  const [coverPreviewError, setCoverPreviewError] = useState('')
  const [uploadingCover, setUploadingCover] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [tempAllDuration, setTempAllDuration] = useState(20)
  const [saveAfterMetadata, setSaveAfterMetadata] = useState(false)
  const [showMiniGamePicker, setShowMiniGamePicker] = useState(false)

  // AI Feature States
  const [aiAction, setAiAction] = useState<'generate' | 'recheck' | null>(null)

  const [aiPrompt, setAiPrompt] = useState('')
  const [isNarrowScreen, setIsNarrowScreen] = useState(window.innerWidth < 768)
  const [enabledQuestionTypeIds, setEnabledQuestionTypeIds] = useState<QuestionType[]>([...DEFAULT_ENABLED_QUESTION_TYPE_IDS])
  const [questionTypeAccessByType, setQuestionTypeAccessByType] = useState<Record<QuestionTypeId, QuestionTypeAccessTier>>({ ...QUESTION_TYPE_DEFAULT_ACCESS_BY_TYPE })
  const [enabledMiniGameIds, setEnabledMiniGameIds] = useState<MiniGameId[]>([...DEFAULT_ENABLED_MINI_GAME_IDS])
  const [miniGameEnglishNamesById, setMiniGameEnglishNamesById] = useState<Record<MiniGameId, string>>({ ...MINI_GAME_DEFAULT_ENGLISH_NAMES })
  const [miniGameArabicNamesById, setMiniGameArabicNamesById] = useState<Record<MiniGameId, string>>({ ...MINI_GAME_DEFAULT_ARABIC_NAMES })
  const [miniGameAccessById, setMiniGameAccessById] = useState<Record<MiniGameId, MiniGameAccessTier>>({ ...MINI_GAME_DEFAULT_ACCESS_BY_ID })
  
  type StatusState = { kind: 'idle' } | { kind: 'saving' } | { kind: 'success'; msg: string } | { kind: 'error'; msg: string } | { kind: 'info'; msg: string }
  const [status, setStatus] = useState<StatusState>({ kind: 'idle' })

  const showStatus = (s: StatusState, autoClear = false) => {
    setStatus(s)
    if (autoClear) setTimeout(() => setStatus({ kind: 'idle' }), 3000)

    if (s.kind === 'error') {
      showToast({ message: s.msg, type: 'error' })
    } else if (s.kind === 'info') {
      showToast({ message: s.msg, type: 'info' })
    }
  }

  const uploadMatchPairImage = async (questionIndex: number, pairIndex: number, side: 'left' | 'right') => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = async (event) => {
      const file = (event.target as HTMLInputElement).files?.[0]
      if (!file) return

      const key = `${questionIndex}:${pairIndex}:${side}`
      setUploadingPairImageKey(key)
      try {
        const ext = file.name.split('.').pop() || 'jpg'
        const path = `quiz-match-plus/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const storageRef = ref(storage, path)
        await uploadBytes(storageRef, file)
        const url = await getDownloadURL(storageRef)

        const targetQuestion = questions[questionIndex]
        if (!targetQuestion || !Array.isArray(targetQuestion.pairs)) return

        const nextPairs = [...targetQuestion.pairs]
        nextPairs[pairIndex] = {
          ...nextPairs[pairIndex],
          [side]: url,
        }
        updateQuestion(questionIndex, { pairs: nextPairs })
        showToast({ message: '✅ تم رفع الصورة بنجاح', type: 'success' })
      } catch (error) {
        console.error('Pair image upload failed', error)
        showToast({ message: '❌ فشل رفع الصورة', type: 'error' })
      } finally {
        setUploadingPairImageKey(null)
      }
    }
    input.click()
  }
  const [loading, setLoading] = useState(!!routeId)

  const ownerId = auth.currentUser?.uid ?? ''

  const fallbackQuestionType = enabledQuestionTypeIds[0] ?? 'single'
  const requiresSubscription = questions.some((question) => questionTypeAccessByType[question.type] === 'premium')
  const isPremiumQuestionType = (type: QuestionType) => questionTypeAccessByType[type] === 'premium'

  const openUpgradeDialog = (message?: string) => {
    showDialog({
      title: '🔒 Subscription Required',
      message: message || 'This feature is premium. Please upgrade your account to continue.',
      confirmText: 'Upgrade now',
      cancelText: 'Cancel',
      onConfirm: () => {
        window.location.assign('/billing')
      },
    })
  }

  useEffect(() => {
    return subscribeQuestionTypeSettings((settings) => {
      setEnabledQuestionTypeIds(settings.enabledQuestionTypeIds)
      setQuestionTypeAccessByType(settings.accessByType)
    })
  }, [])

  useEffect(() => {
    return subscribeMiniGameSettings((settings) => {
      setEnabledMiniGameIds(settings.enabledMiniGameIds)
      setMiniGameEnglishNamesById(settings.englishNamesById)
      setMiniGameArabicNamesById(settings.arabicNamesById)
      setMiniGameAccessById(settings.accessById)
    })
  }, [])

  useEffect(() => {
    if (!gameModeId) return
    if (enabledMiniGameIds.includes(gameModeId as MiniGameId)) return
    setGameModeId('')
    if (tempGameModeId === gameModeId) {
      setTempGameModeId('')
    }
    showToast({ message: 'تم تعطيل الميني جيم المختار من إعدادات المنصة، وتم الرجوع إلى الوضع الكلاسيكي.', type: 'info' })
  }, [enabledMiniGameIds, gameModeId, tempGameModeId, showToast])

  useEffect(() => {
    if (enabledQuestionTypeIds.length === 0) return
    const enabledSet = new Set<QuestionTypeId>(enabledQuestionTypeIds)

    setQuestions((prev) => {
      let convertedCount = 0
      const next = prev.map((question) => {
        if (enabledSet.has(question.type)) return question
        convertedCount += 1
        return coerceQuestionToType(question, fallbackQuestionType)
      })

      if (convertedCount > 0) {
        showToast({ message: `تم تحويل ${convertedCount} سؤال إلى نوع متاح (${fallbackQuestionType}) بعد تحديث إعدادات الأنواع.`, type: 'info' })
      }

      return next
    })
  }, [enabledQuestionTypeIds, fallbackQuestionType, showToast])

  useEffect(() => {
    if (gameModeId !== 'creator-studio') return
    setQuestions((prev) => prev.map((question) => coerceQuestionToCreatorStudioDraw(question)))
  }, [gameModeId])

  const moveQuestion = (from: number, to: number) => {
    if (from === to) return
    setHasUnsavedChanges(true)
    setQuestions((prev) => {
      const next = [...prev]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })
    setCollapsedQuestions((prev) => {
      const next = [...prev]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item ?? false)
      return next
    })
  }

  const openMetadataDialog = (forcedContentType?: 'quiz' | 'mini-game') => {
    const nextContentType = forcedContentType ?? contentType
    setTempContentType(nextContentType)
    setTempTitle(title)
    setTempSlug(ensureScopedSlug(slug, ownerId))
    setTempVisibility(visibility)
    setTempGameModeId(nextContentType === 'quiz' ? '' : gameModeId)
    setTempChallenge(challengePreset)
    setTempEnableScholarRole(enableScholarRole)
    setTempRandomizeQuestions(randomizeQuestions)
    setTempCoverImage(coverImage)
    setTempAllDuration(questions.find((q) => Number.isFinite(q.duration) && (q.duration ?? 0) > 0)?.duration ?? 20)
    setShowMiniGamePicker(false)
    setShowMetadataDialog(true)
  }

  const applyDurationToAllQuestions = () => {
    if (questions.length === 0) {
      showToast({ message: 'لا توجد أسئلة لتطبيق الوقت عليها.', type: 'info' })
      return
    }
    const normalizedDuration = Math.max(5, Math.min(300, Number(tempAllDuration) || 20))
    setTempAllDuration(normalizedDuration)
    setHasUnsavedChanges(true)
    setQuestions((prev) => prev.map((question) => ({ ...question, duration: normalizedDuration })))
    showToast({ message: `تم تطبيق ${normalizedDuration} ثانية على جميع الأسئلة`, type: 'success' })
  }

  const saveMetadata = async () => {
    if (metadataChecking) return
    if (coverPreviewChecking) {
      showStatus({ kind: 'info', msg: 'جارٍ تحميل صورة الغلاف. انتظر قليلًا ثم حاول مرة أخرى.' })
      return
    }
    const nextTitle = tempTitle.trim()
    const normalizedTitle = nextTitle.toLowerCase()
    const isDefaultTitle = normalizedTitle === 'new quiz' || nextTitle === 'اختبار جديد'
    if (!nextTitle || isDefaultTitle) {
      showStatus({ kind: 'error', msg: 'يرجى إدخال اسم مميز للاختبار قبل الحفظ.' })
      return
    }
    if (!ownerId) {
      showStatus({ kind: 'error', msg: 'يجب تسجيل الدخول أولاً.' })
      return
    }
    const generatedSlug = ensureScopedSlug(titleToSlug(nextTitle) || 'quiz', ownerId)
    const nextSlug = quizId ? (slug || generatedSlug) : generatedSlug
    setMetadataChecking(true)
    try {
      if (!quizId || nextSlug !== slug) {
        const existing = await findQuizByOwnerAndSlug(ownerId, nextSlug)
        if (existing && existing.id !== quizId) {
          showStatus({ kind: 'error', msg: 'تعذّر إنشاء رابط مميز لهذا العنوان. غيّر اسم الاختبار وحاول مرة أخرى.' })
          return
        }
      }
      setTitle(nextTitle)
      setSlug(nextSlug)
      setTempSlug(nextSlug)
      setContentType(tempContentType)
      setVisibility(tempVisibility)
      setGameModeId(tempContentType === 'mini-game' ? tempGameModeId : '')
      setChallengePreset(tempChallenge)
      setEnableScholarRole(tempEnableScholarRole)
      setRandomizeQuestions(tempRandomizeQuestions)
      setCoverImage(tempCoverImage)
      setShowMiniGamePicker(false)
      setShowMetadataDialog(false)
      if (saveAfterMetadata) {
        setSaveAfterMetadata(false)
        setTimeout(() => { void saveQuizRef.current() }, 0)
      }
    } catch (error) {
      showStatus({ kind: 'error', msg: `فشل التحقق: ${(error as Error).message}` })
    } finally {
      setMetadataChecking(false)
    }
  }

  useEffect(() => {
    if (!routeId) {
      setContentType('quiz')
      setTitle('New Quiz')
      setSlug(ensureScopedSlug('new-quiz', ownerId))
      setMiniGameConfig({})
      setTempTitle('New Quiz')
      setTempSlug(ensureScopedSlug('new-quiz', ownerId))
      setShowContentTypeDialog(true)
      setCollapsedQuestions([])
      return
    }
    setShowContentTypeDialog(false)
    getQuizById(routeId)
      .then((data) => {
        if (!data) { showStatus({ kind: 'error', msg: 'لم يُعثر على الاختبار.' }); return }
        const inferredContentType: 'quiz' | 'mini-game' = data.contentType
          ?? ((data.gameModeId && (!Array.isArray(data.questions) || data.questions.length === 0)) ? 'mini-game' : 'quiz')
        setContentType(inferredContentType)
        setTitle(data.title)
        setSlug(data.slug)
        setVisibility(data.visibility)
        setGameModeId(data.gameModeId ?? '')
        setMiniGameConfig((data.miniGameConfig && typeof data.miniGameConfig === 'object') ? data.miniGameConfig as Record<string, unknown> : {})
        setChallengePreset(data.challengePreset || 'classic')
        setEnableScholarRole(data.enableScholarRole ?? false)
        setRandomizeQuestions(data.randomizeQuestions ?? false)
        setCoverImage(data.coverImage ?? '')
        const rawQuestions = data.questions ?? []
        const normalizedQuestions = sanitizeQuestions(rawQuestions)
        const deprecatedCount = rawQuestions.filter((question) => normalizeQuestionType((question as { type?: unknown }).type) !== question.type).length
        setQuestions(normalizedQuestions)
        setCollapsedQuestions(Array(normalizedQuestions.length).fill(false))
        if (deprecatedCount > 0) {
          showToast({ message: `تم تحويل ${deprecatedCount} سؤال من نوع قديم إلى "اختيار واحد" تلقائيًا.`, type: 'info' })
        }
        setHasUnsavedChanges(false)
      })
      .catch((err) => showStatus({ kind: 'error', msg: `فشل التحميل: ${err.message}` }))
      .finally(() => setLoading(false))
  }, [routeId, ownerId])

  const shareSlug = tempSlug || ensureScopedSlug(titleToSlug(tempTitle) || 'quiz', ownerId)
  const shareUrl = `${SERVER_BASE}/player?quiz=${shareSlug}`
  const miniGameCards = useMemo(() => {
    return MINI_GAME_IDS.map((id) => {
      const definition = MINI_GAME_DEFINITIONS[id]
      return {
        id,
        icon: definition.icon,
        englishName: miniGameEnglishNamesById[id] ?? definition.defaultEnglishName,
        arabicName: miniGameArabicNamesById[id] ?? definition.defaultArabicName,
        description: definition.description,
        howToPlay: definition.howToPlay,
        access: miniGameAccessById[id] ?? 'free',
        enabled: enabledMiniGameIds.includes(id),
      }
    })
  }, [enabledMiniGameIds, miniGameAccessById, miniGameArabicNamesById, miniGameEnglishNamesById])

  const selectedGameModeMeta = tempGameModeId
    ? miniGameCards.find((mode) => mode.id === tempGameModeId)
    : CLASSIC_GAME_MODE

  const isMiniGameContent = contentType === 'mini-game'

  const updateMiniGameConfig = (patch: Record<string, unknown>) => {
    setHasUnsavedChanges(true)
    setMiniGameConfig((prev) => ({ ...prev, ...patch }))
  }

  useEffect(() => {
    if (!isMiniGameContent && gameModeId) {
      setGameModeId('')
    }
    if (isMiniGameContent && questions.length > 0) {
      setQuestions([])
      setCollapsedQuestions([])
    }
  }, [isMiniGameContent, gameModeId, questions.length])

  const replaceQuestion = (index: number, next: QuizQuestion) => {
    setHasUnsavedChanges(true)
    setQuestions((prev) => prev.map((q, i) => (i === index ? next : q)))
  }

  const updateQuestion = (index: number, patch: Partial<QuizQuestion>) => {
    setHasUnsavedChanges(true)
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)))
  }

  const addQuestion = () => {
    if (isMiniGameContent) {
      showToast({ message: 'هذا المحتوى ميني جيم. أضف إعدادات اللعبة بدل الأسئلة.', type: 'info' })
      return
    }
    setHasUnsavedChanges(true)
    const nextQuestion = gameModeId === 'creator-studio'
      ? { ...creatorStudioStarterQuestion }
      : { ...starterQuestion }
    setQuestions((prev) => [...prev, nextQuestion])
    setCollapsedQuestions((prev) => [...prev, false])
  }

  const loadSamples = () => {
    showDialog({
      title: 'تحميل عينات جاهزة؟',
      message: 'سيتم استبدال الأسئلة الحالية بعينة جاهزة. هل تريد المتابعة؟',
      confirmText: 'نعم، تحميل العينات',
      cancelText: 'إلغاء',
      onConfirm: () => {
        setHasUnsavedChanges(true)
        setTitle('Animals Pack Quiz')
        setSlug('animals-pack-quiz')
        setQuestions(SAMPLE_QUESTIONS)
        setCollapsedQuestions(Array(SAMPLE_QUESTIONS.length).fill(false))
        showStatus({ kind: 'info', msg: 'تم تحميل عينات تتضمن Type Sprint و Boss Battle — اضغط حفظ للتخزين.' })
      },
    })
  }

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  // Track screen width for responsive toolbar
  useEffect(() => {
    const handleResize = () => {
      setIsNarrowScreen(window.innerWidth < 768)
    }
    
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!showMetadataDialog) return

    const candidate = tempCoverImage.trim()
    if (!candidate) {
      setCoverPreviewChecking(false)
      setCoverPreviewError('')
      return
    }

    if (!/^https?:\/\//i.test(candidate)) {
      setCoverPreviewChecking(false)
      setCoverPreviewError('رابط الصورة يجب أن يبدأ بـ http:// أو https://')
      return
    }

    let cancelled = false
    setCoverPreviewChecking(true)
    setCoverPreviewError('')

    const probe = new Image()
    probe.referrerPolicy = 'no-referrer'
    const timeoutId = window.setTimeout(() => {
      if (cancelled) return
      setCoverPreviewChecking(false)
      setCoverPreviewError('تحميل الصورة يتأخر. تأكد من الرابط أو جرّب رابطًا آخر.')
    }, 12000)

    probe.onload = () => {
      if (cancelled) return
      window.clearTimeout(timeoutId)
      setCoverPreviewChecking(false)
      setCoverPreviewError('')
    }

    probe.onerror = () => {
      if (cancelled) return
      window.clearTimeout(timeoutId)
      setCoverPreviewChecking(false)
      setCoverPreviewError('تعذر تحميل صورة الغلاف من هذا الرابط.')
    }

    probe.src = candidate

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
    }
  }, [tempCoverImage, showMetadataDialog])

  if (loading) return <section className="panel"><p>Loading quiz...</p></section>

  const removeQuestion = (index: number) => {
    showDialog({
      title: 'حذف السؤال',
      message: `هل تريد حذف السؤال ${index + 1}؟ لا يمكن التراجع عن هذا الإجراء.`,
      confirmText: 'حذف',
      cancelText: 'إلغاء',
      isDangerous: true,
      onConfirm: () => {
        setHasUnsavedChanges(true)
        setQuestions((prev) => prev.filter((_, i) => i !== index))
        setCollapsedQuestions((prev) => prev.filter((_, i) => i !== index))
      },
    })
  }

  const handleDeleteQuiz = () => {
    if (!quizId) return
    showDialog({
      title: 'Delete Quiz?',
      message: 'This will permanently delete the quiz and all its questions. This cannot be undone.',
      confirmText: 'Yes, delete it',
      cancelText: 'Cancel',
      isDangerous: true,
      onConfirm: async () => {
        try {
          await deleteQuiz(quizId)
          showToast({ message: 'Quiz deleted', type: 'success' })
          navigate('/dashboard')
        } catch (err) {
          showToast({ message: `Failed to delete: ${(err as Error).message}`, type: 'error' })
        }
      },
    })
  }

  const saveQuiz = async () => {
    if (!ownerId) {
      showStatus({ kind: 'error', msg: 'خطأ: يجب تسجيل الدخول أولاً.' })
      return
    }

    if (!quizId) {
      const normalizedTitle = title.trim().toLowerCase()
      const missingOrDefaultTitle = !title.trim() || normalizedTitle === 'new quiz' || title.trim() === 'اختبار جديد'
      if (missingOrDefaultTitle) {
        setSaveAfterMetadata(true)
        openMetadataDialog()
        showToast({ message: 'قبل الحفظ، اختر اسمًا واضحًا للاختبار.', type: 'info' })
        return
      }
    }

    // If all questions deleted in quiz mode and quiz already exists → offer to delete the whole record
    if (questions.length === 0 && quizId && !isMiniGameContent) {
      showDialog({
        title: 'Delete Quiz?',
        message: 'There are no questions left. Do you want to permanently delete this quiz?',
        confirmText: 'Yes, delete it',
        cancelText: 'Keep it',
        isDangerous: true,
        onConfirm: async () => {
          try {
            await deleteQuiz(quizId)
            showToast({ message: 'Quiz deleted', type: 'success' })
            navigate('/dashboard')
          } catch (err) {
            showToast({ message: `Failed to delete: ${(err as Error).message}`, type: 'error' })
          }
        },
      })
      return
    }

    const hasCreatorStudioPrompt = questions.some((question) => {
      if (question.creatorTask !== 'draw') return false
      return typeof question.text === 'string' && question.text.trim().length > 0
    })

    if (!isMiniGameContent && gameModeId === 'creator-studio' && !hasCreatorStudioPrompt) {
      showToast({ message: 'Creator Studio يحتاج سؤال رسم واحد على الأقل بنص واضح قبل الحفظ.', type: 'info' })
      return
    }

    if (isMiniGameContent && !gameModeId) {
      showToast({ message: 'اختر ميني جيم قبل الحفظ.', type: 'info' })
      openMetadataDialog()
      return
    }

    if (questions.length === 0 && !isMiniGameContent) {
      showToast({ message: 'Add at least one question before saving classic mode, or choose a mini game.', type: 'info' })
      return
    }
    try {
      const existing = await findQuizByOwnerAndSlug(ownerId, slug)
      if (existing && existing.id !== quizId) {
        showStatus({ kind: 'error', msg: 'هذا الرابط مستخدم بالفعل في اختبار آخر. افتح الإعدادات وغير الرابط.' })
        openMetadataDialog()
        return
      }
    } catch (error) {
      showStatus({ kind: 'error', msg: `فشل التحقق من الرابط: ${(error as Error).message}` })
      return
    }
    const payload: QuizDoc = {
      ownerId,
      contentType,
      title,
      slug,
      visibility,
      priceTier: requiresSubscription ? 'starter' : 'free',
      gameModeId: isMiniGameContent ? (gameModeId || undefined) : undefined,
      miniGameConfig: isMiniGameContent ? miniGameConfig : undefined,
      challengePreset,
      enableScholarRole,
      randomizeQuestions,
      coverImage,
      tags: ['animals'],
      questions: isMiniGameContent
        ? []
        : sanitizeQuestions(
        gameModeId === 'creator-studio'
          ? questions.map((question) => coerceQuestionToCreatorStudioDraw(question))
          : questions,
      ),
    }

    showStatus({ kind: 'saving' })
    try {
      if (quizId) {
        await updateQuiz(quizId, payload)
        setHasUnsavedChanges(false)
        showStatus({ kind: 'idle' })
        showToast({ message: 'تم تحديث الاختبار بنجاح', type: 'success' })
      } else {
        const id = await createQuiz(payload)
        void incrementPlatformStat('quizCreated')
        setQuizId(id)
        setHasUnsavedChanges(false)
        showStatus({ kind: 'idle' })
        showToast({ message: 'تم حفظ الاختبار بنجاح', type: 'success' })
      }
    } catch (error) {
      showStatus({ kind: 'error', msg: `فشل الحفظ: ${(error as Error).message}` })
      showToast({ message: `فشل الحفظ: ${(error as Error).message}`, type: 'error' })
    }
  }

  const editorShareSlug = slug || quizId || ''
  const editorShareUrl = editorShareSlug ? `${SERVER_BASE}/player?quiz=${editorShareSlug}` : ''

  const copyEditorLink = async () => {
    if (!editorShareUrl) {
      showToast({ message: 'احفظ الاختبار أولاً للحصول على رابط المشاركة', type: 'info' })
      return
    }
    try {
      await navigator.clipboard.writeText(editorShareUrl)
      showToast({ message: 'تم نسخ رابط الاختبار', type: 'success' })
    } catch {
      showToast({ message: 'تعذر نسخ الرابط', type: 'error' })
    }
  }

  const shareEditorLink = async () => {
    if (!editorShareUrl) {
      showToast({ message: 'احفظ الاختبار أولاً للحصول على رابط المشاركة', type: 'info' })
      return
    }
    try {
      if (navigator.share) {
        await navigator.share({ title: title || 'Quiz', url: editorShareUrl })
      } else {
        await navigator.clipboard.writeText(editorShareUrl)
        showToast({ message: 'تم نسخ الرابط بدل المشاركة', type: 'success' })
      }
    } catch {
      showToast({ message: 'تعذر فتح المشاركة', type: 'error' })
    }
  }

  const launchGameFromEditor = async (quizIdToLaunch: string) => {
    if (requiresSubscription && !isSubscribed) {
      openUpgradeDialog('This quiz contains premium question types. Please upgrade your account to launch it.')
      return
    }

    const authParams = await getHostLaunchAuthParams({
      serverBase: SERVER_BASE,
      currentUser: auth.currentUser,
    })

    const gameUrl = buildHostGameUrl({
      serverBase: SERVER_BASE,
      quizId: quizIdToLaunch,
      gameModeId: gameModeId || undefined,
      ...authParams,
    })
    await guardedLaunchGame({
      serverBase: SERVER_BASE,
      gameUrl,
      onUnavailable: () => {
        showToast({
          message: 'Game server is temporarily unavailable. Please try again in a moment.',
          type: 'error',
        })
      },
      onPopupBlocked: () => {
        showToast({
          message: 'Popup was blocked. Please allow popups and try again.',
          type: 'info',
        })
      },
      onLaunch: () => { void incrementPlatformStat('sessionHosted') },
    })
  }

  const questionTypeOptions = enabledQuestionTypeIds.length > 0
    ? toQuestionTypeOptions(enabledQuestionTypeIds).map((option) => {
      const premium = questionTypeAccessByType[option.value] === 'premium'
      return premium
        ? { ...option, label: `${option.label} • 🔒 Premium` }
        : option
    })
    : QUESTION_TYPE_OPTIONS

  // Keep ref in sync with the latest closure so setTimeout in saveMetadata never uses stale state
  saveQuizRef.current = saveQuiz

  return (
    <>
      {showContentTypeDialog && !quizId && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(2, 6, 23, 0.72)',
            backdropFilter: 'blur(6px)',
            zIndex: 12050,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '1rem',
          }}
        >
          <div
            style={{
              width: 'min(760px, 94vw)',
              background: 'linear-gradient(180deg, var(--bg-deep) 0%, var(--bg-surface) 100%)',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              padding: '1rem',
              boxShadow: '0 24px 80px rgba(2, 6, 23, 0.55)',
            }}
          >
            <h3 style={{ margin: 0, color: 'var(--text-bright)', fontSize: '1.08rem' }}>What do you want to create?</h3>
            <p style={{ margin: '0.35rem 0 0.95rem', color: 'var(--text-mid)', fontSize: '0.85rem' }}>
              Quizzes use question editor. Mini-games use dedicated game configuration UI.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '0.65rem' }}>
              <button
                type="button"
                onClick={() => {
                  setContentType('quiz')
                  setTempContentType('quiz')
                  setGameModeId('')
                  setShowContentTypeDialog(false)
                  openMetadataDialog('quiz')
                }}
                style={{
                  textAlign: 'start',
                  border: '1px solid var(--border-strong)',
                  borderRadius: '12px',
                  background: 'var(--bg-surface)',
                  padding: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                <p style={{ margin: 0, color: 'var(--text)', fontWeight: 800, fontSize: '0.9rem' }}>🧠 Create Quiz</p>
                <p style={{ margin: '0.2rem 0 0', color: 'var(--text-mid)', fontSize: '0.78rem' }}>Normal editor with questions, options, answers, and order.</p>
              </button>

              <button
                type="button"
                onClick={() => {
                  setContentType('mini-game')
                  setTempContentType('mini-game')
                  setShowContentTypeDialog(false)
                  openMetadataDialog('mini-game')
                }}
                style={{
                  textAlign: 'start',
                  border: '1px solid var(--border-strong)',
                  borderRadius: '12px',
                  background: 'var(--bg-surface)',
                  padding: '0.8rem',
                  cursor: 'pointer',
                }}
              >
                <p style={{ margin: 0, color: 'var(--text)', fontWeight: 800, fontSize: '0.9rem' }}>🎮 Create Mini Game</p>
                <p style={{ margin: '0.2rem 0 0', color: 'var(--text-mid)', fontSize: '0.78rem' }}>Dedicated configuration per game, without quiz question list.</p>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Metadata Dialog */}
      {showMetadataDialog && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(2, 6, 23, 0.62)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            animation: 'fadeIn 0.2s ease-in-out',
          }}
          onClick={() => !loading && setShowMetadataDialog(false)}
        >
          <div
            style={{
              background: 'linear-gradient(180deg, var(--bg-deep) 0%, var(--bg-surface) 100%)',
              borderRadius: '18px',
              border: '1px solid var(--border)',
              boxShadow: '0 24px 80px rgba(2, 6, 23, 0.55)',
              minWidth: '360px',
              maxWidth: '600px',
              width: 'min(92vw, 600px)',
              maxHeight: '88vh',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              animation: 'slideUp 0.3s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              padding: '1rem 1.2rem 0.9rem',
              borderBottom: '1px solid var(--border)',
              background: 'linear-gradient(180deg, var(--bg-deep) 0%, var(--bg-surface) 100%)',
              position: 'sticky',
              top: 0,
              zIndex: 2,
            }}>
              <h2 style={{ marginTop: 0, marginBottom: 0, color: 'var(--text-bright)', fontSize: '1.22rem', fontWeight: 800 }}>⚙️ إعدادات الاختبار</h2>
            </div>

            <div style={{
              flex: 1,
              overflowY: 'auto',
              padding: '1rem 1.2rem 0.8rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.9rem',
            }}>
              <div>
                <label style={{ fontSize: '0.9em', color: 'var(--text-mid)', display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>اسم الاختبار</label>
                <input
                  type="text"
                  value={tempTitle}
                  onChange={(e) => {
                    setTempTitle(e.target.value)
                    if (!quizId) {
                      setTempSlug(ensureScopedSlug(titleToSlug(e.target.value) || 'quiz', ownerId))
                    }
                  }}
                  placeholder="مثلاً: اختبار الحيوانات"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-strong)',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text)',
                    boxSizing: 'border-box',
                    fontSize: '1em',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.9em', color: 'var(--text-mid)', display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>رابط المشاركة (URL)</label>
                <div style={{
                  border: '1px solid var(--border-strong)',
                  backgroundColor: 'var(--bg-surface)',
                  borderRadius: '8px',
                  padding: '0.7rem 0.8rem',
                  color: 'var(--text)',
                  fontSize: '0.92em',
                  wordBreak: 'break-all',
                }}>
                  {shareUrl}
                </div>
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.55rem' }}>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(shareUrl)
                        showToast({ message: 'تم نسخ رابط المشاركة', type: 'success' })
                      } catch {
                        showToast({ message: 'تعذر نسخ الرابط', type: 'error' })
                      }
                    }}
                    style={{
                      padding: '0.45rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-strong)',
                      background: 'var(--bg-surface)',
                      color: 'var(--text)',
                      cursor: 'pointer',
                      fontSize: '0.82em',
                      fontWeight: 600,
                    }}
                  >
                    📋 نسخ الرابط
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        if (navigator.share) {
                          await navigator.share({ title: tempTitle || 'Quiz', url: shareUrl })
                        } else {
                          await navigator.clipboard.writeText(shareUrl)
                          showToast({ message: 'تم نسخ الرابط بدل المشاركة', type: 'success' })
                        }
                      } catch {
                        showToast({ message: 'تعذر فتح المشاركة', type: 'error' })
                      }
                    }}
                    style={{
                      padding: '0.45rem 0.85rem',
                      borderRadius: '8px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                      color: '#fff',
                      cursor: 'pointer',
                      fontSize: '0.82em',
                      fontWeight: 700,
                    }}
                  >
                    🔗 مشاركة
                  </button>
                </div>
                <p style={{ marginTop: '0.4rem', fontSize: '0.8em', color: 'var(--text-mid)' }}>
                  يتم إنشاء الرابط تلقائيًا بواسطة النظام لضمان التفرد والثبات.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.9em', color: 'var(--text-mid)', display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>نوع المحتوى</label>
                  <select
                    value={tempContentType}
                    onChange={(e) => {
                      const nextType = e.target.value as 'quiz' | 'mini-game'
                      setTempContentType(nextType)
                      if (nextType === 'quiz') {
                        setTempGameModeId('')
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-strong)',
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text)',
                      boxSizing: 'border-box',
                      fontSize: '1em',
                    }}
                  >
                    <option value="quiz">🧠 Quiz (أسئلة)</option>
                    <option value="mini-game">🎮 Mini Game (إعدادات لعبة)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.9em', color: 'var(--text-mid)', display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>الخصوصية</label>
                  <select
                    value={tempVisibility}
                    onChange={(e) => setTempVisibility(e.target.value as 'public' | 'private')}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-strong)',
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text)',
                      boxSizing: 'border-box',
                      fontSize: '1em',
                    }}
                  >
                    <option value="public">عام</option>
                    <option value="private">خاص</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.9em', color: 'var(--text-mid)', display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>مستوى الصعوبة</label>
                  <select
                    value={tempChallenge}
                    onChange={(e) => setTempChallenge(e.target.value as ChallengePreset)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-strong)',
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text)',
                      boxSizing: 'border-box',
                      fontSize: '1em',
                    }}
                  >
                    <option value="easy">سهل</option>
                    <option value="classic">عادي</option>
                    <option value="hard">صعب</option>
                  </select>
                </div>
              </div>

              {tempContentType === 'mini-game' && (
              <div>
                <label style={{ fontSize: '0.9em', color: 'var(--text-mid)', display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
                  🎮 الميني جيم
                </label>
                <button
                  type="button"
                  onClick={() => setShowMiniGamePicker(true)}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid var(--border-strong)',
                    background: 'var(--bg-surface)',
                    color: 'var(--text)',
                    boxSizing: 'border-box',
                    fontSize: '1em',
                    textAlign: 'start',
                    cursor: 'pointer',
                  }}
                >
                  {selectedGameModeMeta
                    ? `${selectedGameModeMeta.icon} ${selectedGameModeMeta.englishName} / ${selectedGameModeMeta.arabicName}`
                    : '📘 Classic Quiz / اختبار كلاسيكي'}
                </button>
                <p style={{ marginTop: '0.4rem', fontSize: '0.78em', color: 'var(--text-mid)' }}>
                  يتم اختيار الميني جيم عبر بطاقات (اسم إنجليزي + اسم عربي + أيقونة + شرح).
                </p>
                <div style={{ marginTop: '0.55rem', padding: '0.65rem 0.75rem', borderRadius: '10px', border: '1px solid var(--border-strong)', background: 'var(--bg-deep)' }}>
                  <p style={{ margin: 0, color: 'var(--text)', fontWeight: 700, fontSize: '0.83rem' }}>
                    {selectedGameModeMeta?.icon || '📘'} {selectedGameModeMeta?.englishName || CLASSIC_GAME_MODE.englishName} · {selectedGameModeMeta?.arabicName || CLASSIC_GAME_MODE.arabicName}
                  </p>
                  <p style={{ margin: '0.25rem 0 0', color: 'var(--text-mid)', fontSize: '0.78rem' }}>
                    {selectedGameModeMeta?.description || CLASSIC_GAME_MODE.description}
                  </p>
                  <p style={{ margin: '0.28rem 0 0', color: 'var(--text)', fontSize: '0.78rem' }}>
                    <strong>طريقة اللعب:</strong> {selectedGameModeMeta?.howToPlay || CLASSIC_GAME_MODE.howToPlay}
                  </p>
                  <p style={{ margin: '0.28rem 0 0', color: 'var(--text-mid)', fontSize: '0.75rem' }}>
                    الوصول: {(selectedGameModeMeta?.access || 'free') === 'premium' ? '🔒 Premium' : '🆓 Free'}
                  </p>
                </div>

                {showMiniGamePicker && (
                  <div
                    style={{
                      position: 'fixed',
                      inset: 0,
                      background: 'rgba(2, 6, 23, 0.7)',
                      backdropFilter: 'blur(5px)',
                      zIndex: 12000,
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      padding: '1rem',
                    }}
                    onClick={() => setShowMiniGamePicker(false)}
                  >
                    <div
                      style={{
                        width: 'min(860px, 94vw)',
                        maxHeight: '78vh',
                        overflowY: 'auto',
                        background: 'linear-gradient(180deg, var(--bg-deep) 0%, var(--bg-surface) 100%)',
                        border: '1px solid var(--border)',
                        borderRadius: '14px',
                        padding: '0.85rem',
                        boxShadow: '0 24px 80px rgba(2, 6, 23, 0.55)',
                      }}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                        <h3 style={{ margin: 0, color: 'var(--text-bright)', fontSize: '1rem' }}>🎮 اختيار الميني جيم</h3>
                        <button
                          type="button"
                          onClick={() => setShowMiniGamePicker(false)}
                          style={{ border: '1px solid var(--border-strong)', borderRadius: '8px', background: 'var(--bg-surface)', color: 'var(--text)', padding: '0.35rem 0.6rem', cursor: 'pointer' }}
                        >
                          إغلاق
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '0.55rem' }}>
                        {[CLASSIC_GAME_MODE, ...miniGameCards.filter((game) => game.enabled)].map((game) => {
                          const selected = tempGameModeId === game.id
                          const premiumLocked = game.access === 'premium' && !isSubscribed
                          return (
                            <button
                              key={game.id || 'classic'}
                              type="button"
                              onClick={() => {
                                if (premiumLocked) {
                                  openUpgradeDialog('This mini game is premium. Please upgrade your account to select it.')
                                  return
                                }
                                setTempGameModeId(game.id)
                                setShowMiniGamePicker(false)
                              }}
                              style={{
                                textAlign: 'start',
                                border: selected ? '1px solid var(--text-bright)' : '1px solid var(--border-strong)',
                                borderRadius: '12px',
                                background: selected ? 'rgba(59,130,246,0.14)' : 'var(--bg-surface)',
                                padding: '0.6rem',
                                cursor: premiumLocked ? 'not-allowed' : 'pointer',
                                opacity: premiumLocked ? 0.68 : 1,
                              }}
                            >
                              <p style={{ margin: 0, color: 'var(--text)', fontWeight: 800, fontSize: '0.84rem' }}>
                                {game.icon} {game.englishName}
                              </p>
                              <p style={{ margin: '0.15rem 0 0', color: 'var(--text-muted)', fontSize: '0.74rem' }}>{game.arabicName}</p>
                              <p style={{ margin: '0.25rem 0 0', color: 'var(--text-mid)', fontSize: '0.72rem', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{game.description}</p>
                              <p style={{ margin: '0.25rem 0 0', color: 'var(--text)', fontSize: '0.71rem', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                <strong>طريقة اللعب:</strong> {game.howToPlay}
                              </p>
                              <p style={{ margin: '0.25rem 0 0', color: premiumLocked ? '#fda4af' : 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 700 }}>
                                {game.access === 'premium' ? '🔒 Premium' : '🆓 Free'}
                              </p>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              )}

              {tempContentType === 'quiz' && (
                <div style={{ marginTop: '-0.25rem', padding: '0.65rem 0.75rem', borderRadius: '10px', border: '1px solid var(--border-strong)', background: 'var(--bg-deep)' }}>
                  <p style={{ margin: 0, color: 'var(--text)', fontWeight: 700, fontSize: '0.83rem' }}>🧠 وضع Quiz مفعل</p>
                  <p style={{ margin: '0.25rem 0 0', color: 'var(--text-mid)', fontSize: '0.78rem' }}>
                    سيظهر محرر الأسئلة العادي. إعدادات الميني جيم غير مطلوبة في هذا الوضع.
                  </p>
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.7rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', userSelect: 'none', background: 'var(--bg-surface)', padding: '0.75rem 0.85rem', borderRadius: '10px', border: '1px solid var(--border-strong)' }}>
                  <input
                    type="checkbox"
                    checked={tempRandomizeQuestions}
                    onChange={(e) => setTempRandomizeQuestions(e.target.checked)}
                    style={{ width: '1.05rem', height: '1.05rem', accentColor: '#7c3aed', cursor: 'pointer' }}
                  />
                  <span style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                    <strong style={{ color: 'var(--text)', fontSize: '0.9rem' }}>🔀 ترتيب عشوائي</strong>
                    <span style={{ color: 'var(--text-mid)', fontSize: '0.78rem' }}>خلط مرة واحدة قبل البداية (نفس الترتيب للجميع)</span>
                  </span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', userSelect: 'none', background: 'var(--bg-surface)', padding: '0.75rem 0.85rem', borderRadius: '10px', border: '1px solid var(--border-strong)' }}>
                  <input
                    type="checkbox"
                    checked={tempEnableScholarRole}
                    onChange={(e) => setTempEnableScholarRole(e.target.checked)}
                    style={{ width: '1.05rem', height: '1.05rem', accentColor: 'var(--text-bright)', cursor: 'pointer' }}
                  />
                  <span style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
                    <strong style={{ color: 'var(--text)', fontSize: '0.9rem' }}>📘 وضع الباحث</strong>
                    <span style={{ color: 'var(--text-mid)', fontSize: '0.78rem' }}>إظهار الأسئلة مبكرًا للمشرف</span>
                  </span>
                </label>
              </div>

              <div style={{ border: '1px solid var(--border-strong)', borderRadius: '10px', background: 'var(--bg-surface)', padding: '0.75rem 0.85rem' }}>
                <label style={{ fontSize: '0.9em', color: 'var(--text-mid)', display: 'block', marginBottom: '0.5rem', fontWeight: 700 }}>
                  ⏱️ توحيد وقت جميع الأسئلة
                </label>
                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                  <input
                    type="number"
                    min={5}
                    max={300}
                    value={tempAllDuration}
                    onChange={(e) => setTempAllDuration(Number(e.target.value))}
                    style={{
                      width: '120px',
                      padding: '0.6rem 0.7rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-strong)',
                      backgroundColor: 'var(--bg-deep)',
                      color: 'var(--text)',
                      boxSizing: 'border-box',
                      fontSize: '0.9em',
                      textAlign: 'center',
                    }}
                  />
                  <span style={{ color: 'var(--text-mid)', fontSize: '0.85rem', fontWeight: 600 }}>ثانية</span>
                  <button
                    type="button"
                    onClick={applyDurationToAllQuestions}
                    style={{
                      padding: '0.58rem 0.85rem',
                      borderRadius: '8px',
                      border: '1px solid var(--text-bright)',
                      background: 'rgba(59,130,246,0.14)',
                      color: 'var(--text-bright)',
                      cursor: 'pointer',
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    تطبيق على الكل
                  </button>
                </div>
                <p style={{ marginTop: '0.45rem', marginBottom: 0, fontSize: '0.78rem', color: 'var(--text-mid)' }}>
                  يطبق نفس الوقت على كل الأسئلة الحالية في هذا الاختبار.
                </p>
              </div>

              {/* Cover image */}
              <div>
                <label style={{ fontSize: '0.9em', color: 'var(--text-mid)', display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>🖼️ صورة الغلاف</label>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <input
                    type="text"
                    value={tempCoverImage}
                    onChange={(e) => setTempCoverImage(e.target.value)}
                    placeholder="https://..."
                    style={{
                      flex: 1, padding: '0.75rem', borderRadius: '8px',
                      border: '1px solid var(--border-strong)', backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text)', boxSizing: 'border-box', fontSize: '0.9em',
                    }}
                  />
                  <button
                    type="button"
                    disabled={uploadingCover}
                    onClick={() => {
                      const inp = document.createElement('input')
                      inp.type = 'file'
                      inp.accept = 'image/*'
                      inp.onchange = async (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0]
                        if (!file) return
                        setUploadingCover(true)
                        try {
                          const ext = file.name.split('.').pop() || 'jpg'
                          const path = `quiz-covers/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
                          const storageRef = ref(storage, path)
                          await uploadBytes(storageRef, file)
                          const url = await getDownloadURL(storageRef)
                          setTempCoverImage(url)
                        } catch (err) {
                          console.error('Cover upload failed', err)
                        } finally {
                          setUploadingCover(false)
                        }
                      }
                      inp.click()
                    }}
                    style={{
                      padding: '0 1rem', borderRadius: '8px', border: 'none',
                      background: uploadingCover ? 'rgba(59, 130, 246, 0.15)' : 'var(--text-bright)',
                      color: uploadingCover ? '#7dd3fc' : '#fff',
                      cursor: uploadingCover ? 'not-allowed' : 'pointer',
                      whiteSpace: 'nowrap', fontSize: '0.85em', fontWeight: 600,
                    }}
                  >
                    {uploadingCover ? '⏳' : '📁 رفع'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setTempCoverImage('')}
                    title="استخدام الصورة الافتراضية"
                    style={{
                      padding: '0 0.75rem', borderRadius: '8px', border: '1px solid var(--border-strong)',
                      background: !tempCoverImage ? 'rgba(37,99,235,0.2)' : 'var(--bg-surface)',
                      color: !tempCoverImage ? '#7dd3fc' : 'var(--text-muted)',
                      cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '0.8em', fontWeight: 600,
                    }}
                  >
                    🖼️ افتراضي
                  </button>
                </div>
                {tempCoverImage && (
                  <p
                    style={{
                      marginTop: '0.45rem',
                      marginBottom: 0,
                      fontSize: '0.78rem',
                      color: coverPreviewError ? '#fda4af' : 'var(--text-mid)',
                    }}
                  >
                    {coverPreviewChecking
                      ? '⏳ جارٍ تحميل صورة الغلاف من الرابط...'
                      : coverPreviewError || '✅ تم التحقق من رابط صورة الغلاف'}
                  </p>
                )}
                {/* Always-visible image preview */}
                <div style={{ marginTop: '0.75rem', borderRadius: '10px', overflow: 'hidden', height: '110px', position: 'relative', background: 'var(--bg-deep)' }}>
                  <img
                    src={tempCoverImage || placeholderImg}
                    alt="cover preview"
                    style={{
                      width: '100%', height: '110px',
                      objectFit: tempCoverImage ? 'cover' : 'contain',
                      padding: tempCoverImage ? 0 : '10px',
                      display: 'block', boxSizing: 'border-box',
                    }}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = placeholderImg }}
                  />
                  {tempCoverImage && (
                    <button
                      type="button"
                      onClick={() => setTempCoverImage('')}
                      style={{
                        position: 'absolute', top: '6px', left: '6px',
                        background: 'var(--text-bright)', border: 'none', color: '#fff',
                        borderRadius: '50%', width: '24px', height: '24px',
                        cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >✕</button>
                  )}
                </div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              gap: '0.65rem',
              justifyContent: 'flex-end',
              padding: '0.9rem 1.2rem 1rem',
              borderTop: '1px solid var(--border)',
              background: 'linear-gradient(0deg, var(--bg-surface) 0%, var(--bg-deep) 100%)',
              position: 'sticky',
              bottom: 0,
              zIndex: 2,
            }}>
              {!loading && (
                <button
                  onClick={() => setShowMetadataDialog(false)}
                  disabled={metadataChecking}
                  style={{
                    padding: '0.65rem 1.25rem',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: 'var(--bg-surface)',
                    color: 'var(--text)',
                    cursor: metadataChecking ? 'not-allowed' : 'pointer',
                    opacity: metadataChecking ? 0.6 : 1,
                    fontSize: '1em',
                  }}
                >
                  إلغاء
                </button>
              )}
              <button
                onClick={saveMetadata}
                disabled={metadataChecking || coverPreviewChecking}
                style={{
                  padding: '0.65rem 1.25rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                  color: '#fff',
                  cursor: metadataChecking || coverPreviewChecking ? 'not-allowed' : 'pointer',
                  opacity: metadataChecking || coverPreviewChecking ? 0.6 : 1,
                  fontSize: '1em',
                }}
              >
                {metadataChecking ? '⏳ جارٍ الحفظ...' : coverPreviewChecking ? '🖼️ جارٍ تجهيز الصورة...' : 'موافق'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Hero header ── */}
      <div style={{
        background: 'linear-gradient(135deg, var(--bg-deep) 0%, #1e1b4b 100%)',
        border: '1px solid var(--border-mid)',
        borderRadius: '16px',
        marginBottom: '1.25rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Full-width cover background (dimmed) */}
        <div style={{ width: '100%', height: isNarrowScreen ? '120px' : '180px', overflow: 'hidden', position: 'relative' }}>
          <img
            src={coverImage || placeholderImg}
            alt=""
            style={{
              width: '100%', height: '100%',
              objectFit: 'cover',
              opacity: coverImage ? 0.55 : 0.2,
              padding: 0,
              boxSizing: 'border-box',
            }}
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = placeholderImg }}
          />
        </div>
        <div style={{ padding: isNarrowScreen ? '0 1rem 1rem' : '0 2rem 1.5rem', marginTop: isNarrowScreen ? '-40px' : '-60px', position: 'relative', display: 'flex', alignItems: 'flex-end', gap: isNarrowScreen ? '0.8rem' : '1.25rem' }}>
          {/* Profile image thumbnail */}
          <div style={{
            width: isNarrowScreen ? '56px' : '72px', height: isNarrowScreen ? '56px' : '72px', borderRadius: '12px', flexShrink: 0,
            border: '3px solid #1e1b4b', overflow: 'hidden',
            boxShadow: '0 4px 16px rgba(0,0,0,0.6)', background: 'var(--bg-deep)',
          }}>
            <img
              src={coverImage || placeholderImg}
              alt="quiz cover"
              style={{ width: '100%', height: '100%', objectFit: 'cover', padding: 0, boxSizing: 'border-box' }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = placeholderImg }}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.5rem' }}>
              <h1 style={{ margin: 0, fontSize: isNarrowScreen ? '1.1rem' : '1.5rem', fontWeight: 800, color: 'var(--text-bright)', fontFamily: 'Cairo, Segoe UI, Tahoma, system-ui, sans-serif' }}>
                {title || 'اختبار جديد'}
              </h1>
              <button
                type="button"
                onClick={() => openMetadataDialog()}
                title="تعديل اسم الاختبار"
                style={{
                  width: isNarrowScreen ? '26px' : '30px',
                  height: isNarrowScreen ? '26px' : '30px',
                  borderRadius: '7px',
                  border: '1px solid var(--border-strong)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text-mid)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  fontSize: isNarrowScreen ? '0.78rem' : '0.85rem',
                  flexShrink: 0,
                }}
              >
                ✏️
              </button>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: isNarrowScreen ? '0.35rem' : '0.5rem', alignItems: 'center' }}>
            <div style={{
              background: challengePreset === 'easy' ? '#16a34a' : challengePreset === 'hard' ? '#dc2626' : '#2563eb',
              color: '#fff', fontSize: isNarrowScreen ? '0.6rem' : '0.72rem', fontWeight: 700, padding: isNarrowScreen ? '2px 8px' : '1px 10px', borderRadius: '999px',
              display: 'flex', alignItems: 'center',
            }}>
              <select
                value={challengePreset}
                onChange={(e) => {
                  setChallengePreset(e.target.value as ChallengePreset)
                  setHasUnsavedChanges(true)
                }}
                style={{
                  background: 'transparent',
                  color: '#fff',
                  border: 'none',
                  fontSize: isNarrowScreen ? '0.6rem' : '0.74rem',
                  fontWeight: 700,
                  outline: 'none',
                  cursor: 'pointer',
                  padding: '2px 2px',
                }}
                title="مستوى الصعوبة"
              >
                <option value="easy" style={{ color: '#0f172a' }}>🟢 سهل</option>
                <option value="classic" style={{ color: '#0f172a' }}>🔵 عادي</option>
                <option value="hard" style={{ color: '#0f172a' }}>🔴 صعب</option>
              </select>
            </div>
            <div style={{
              background: 'var(--bg-surface)', color: visibility === 'public' ? '#86efac' : '#fca5a5',
              fontSize: isNarrowScreen ? '0.6rem' : '0.72rem', fontWeight: 600, padding: isNarrowScreen ? '2px 8px' : '1px 10px', borderRadius: '999px',
              border: `1px solid ${visibility === 'public' ? '#16a34a44' : '#dc262644'}`,
              display: 'flex', alignItems: 'center',
            }}>
              <select
                value={visibility}
                onChange={(e) => {
                  setVisibility(e.target.value as 'public' | 'private')
                  setHasUnsavedChanges(true)
                }}
                style={{
                  background: 'transparent',
                  color: visibility === 'public' ? '#86efac' : '#fca5a5',
                  border: 'none',
                  fontSize: isNarrowScreen ? '0.6rem' : '0.74rem',
                  fontWeight: 700,
                  outline: 'none',
                  cursor: 'pointer',
                  padding: '2px 2px',
                }}
                title="الخصوصية"
              >
                <option value="public" style={{ color: '#0f172a' }}>🌐 عام</option>
                <option value="private" style={{ color: '#0f172a' }}>🔒 خاص</option>
              </select>
            </div>
            <span style={{ background: 'var(--bg-surface)', color: 'var(--text-dim)', fontSize: isNarrowScreen ? '0.6rem' : '0.72rem', padding: isNarrowScreen ? '2px 8px' : '3px 12px', borderRadius: '999px' }}>
              {isMiniGameContent ? `🎮 ${miniGameCards.find((game) => game.id === gameModeId)?.englishName || 'Mini Game'}` : `📝 ${questions.length} سؤال`}
            </span>

            {!isNarrowScreen && (
              <>
                {randomizeQuestions && (
                  <span style={{ background: 'var(--bg-surface)', color: '#a78bfa', fontSize: '0.72rem', padding: '3px 12px', borderRadius: '999px', border: '1px solid #7c3aed44' }}>
                    🔀 ترتيب جلسة عشوائي
                  </span>
                )}
                {quizId && (
                  <a
                    href={buildHostGameUrl({ serverBase: SERVER_BASE, quizId, gameModeId: gameModeId || undefined })}
                    target="_blank" rel="noopener noreferrer"
                    onClick={(e) => {
                      e.preventDefault()
                      void launchGameFromEditor(quizId)
                    }}
                    style={{ background: 'var(--bg-surface)', color: '#60a5fa', fontSize: '0.72rem', padding: '3px 12px', borderRadius: '999px', textDecoration: 'none' }}
                  >
                    🔗 رابط اللعبة ↗
                  </a>
                )}
              </>
            )}
          </div>
          </div>{/* end inner text div */}
        </div>{/* end profile row */}
      </div>{/* end hero */}

      {/* ── Sticky toolbar ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'var(--bg-deep)',
        border: '1px solid var(--border-mid)',
        borderRadius: '12px',
        padding: isNarrowScreen ? '0.35rem 0.4rem' : '0.55rem 0.65rem',
        marginBottom: '1rem',
        boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
      }}>
        <div style={{ display: 'flex', gap: isNarrowScreen ? '0.25rem' : '0.45rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Group 1: Settings & Add Question */}
          <div className="quiz-toolbar-group" style={{ display: 'flex', gap: isNarrowScreen ? '0.2rem' : '0.35rem', flexWrap: 'wrap', alignItems: 'center', background: 'var(--bg-surface)', border: '1px solid var(--border-strong)', borderRadius: '10px', padding: isNarrowScreen ? '0.15rem' : '0.25rem' }}>
            <button
              type="button"
              onClick={() => openMetadataDialog()}
              style={{
                background: 'transparent', border: '1px solid transparent', color: 'var(--text)',
                padding: isNarrowScreen ? '0.32rem 0.5rem' : '0.42rem 0.72rem', borderRadius: '8px', fontSize: isNarrowScreen ? '0.7rem' : '0.8rem', fontWeight: 700,
                cursor: 'pointer', transition: 'all 0.16s ease', whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.background = 'var(--bg-deep)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'transparent' }}
              title="إعدادات الاختبار"
            >{isNarrowScreen ? '⚙️' : '⚙️ إعدادات'}</button>

            {!isMiniGameContent && (
              <button
                type="button"
                onClick={addQuestion}
                style={{
                  background: 'var(--text-bright)', border: '1px solid var(--text-bright)', color: '#fff',
                  padding: isNarrowScreen ? '0.32rem 0.55rem' : '0.42rem 0.78rem', borderRadius: '8px', fontSize: isNarrowScreen ? '0.7rem' : '0.8rem', fontWeight: 700,
                  cursor: 'pointer', transition: 'all 0.16s ease', whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)' }}
                title="إضافة سؤال جديد"
              >{isNarrowScreen ? '➕' : '➕ إضافة سؤال'}</button>
            )}
          </div>

          {/* Group 2: AI Functions */}
          <div className="quiz-toolbar-group" style={{ display: 'flex', gap: isNarrowScreen ? '0.2rem' : '0.35rem', flexWrap: 'wrap', alignItems: 'center', background: 'var(--bg-surface)', border: '1px solid var(--border-strong)', borderRadius: '10px', padding: isNarrowScreen ? '0.15rem' : '0.25rem' }}>
            <button
              type="button"
              onClick={() => { setAiAction('generate'); void incrementPlatformStat('aiGenerateClicks') }}
              style={{
                background: 'transparent', border: '1px solid transparent', color: 'var(--text)',
                padding: isNarrowScreen ? '0.32rem 0.5rem' : '0.42rem 0.72rem', borderRadius: '8px', fontSize: isNarrowScreen ? '0.7rem' : '0.8rem', fontWeight: 700,
                cursor: 'pointer', transition: 'all 0.16s ease', whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--text-bright)'; e.currentTarget.style.background = 'rgba(59,130,246,0.1)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'transparent' }}
              title="توليد ذكي"
            >{isNarrowScreen ? '✨' : '✨ توليد ذكي'}</button>

            <button
              type="button"
              onClick={() => { setAiAction('recheck'); void incrementPlatformStat('aiRecheckClicks') }}
              style={{
                background: 'transparent', border: '1px solid transparent', color: 'var(--text)',
                padding: isNarrowScreen ? '0.32rem 0.5rem' : '0.42rem 0.72rem', borderRadius: '8px', fontSize: isNarrowScreen ? '0.7rem' : '0.8rem', fontWeight: 700,
                cursor: 'pointer', transition: 'all 0.16s ease', whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--text-bright)'; e.currentTarget.style.background = 'rgba(59,130,246,0.1)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'transparent' }}
              title="تدقيق ذكي"
            >{isNarrowScreen ? '🛡️' : '🛡️ تدقيق ذكي'}</button>
          </div>

          {/* Group 3: Collapse/Expand/Preview/Copy/Share */}
          <div className="quiz-toolbar-group" style={{ display: 'flex', gap: isNarrowScreen ? '0.2rem' : '0.35rem', flexWrap: 'wrap', alignItems: 'center', background: 'var(--bg-surface)', border: '1px solid var(--border-strong)', borderRadius: '10px', padding: isNarrowScreen ? '0.15rem' : '0.25rem' }}>
            <button
              type="button"
              onClick={() => setCollapsedQuestions(Array(questions.length).fill(true))}
              disabled={!quizId || questions.length === 0}
              style={{
                background: 'transparent', border: '1px solid transparent', color: 'var(--text)',
                padding: isNarrowScreen ? '0.32rem 0.45rem' : '0.42rem 0.68rem', borderRadius: '8px', fontSize: isNarrowScreen ? '0.65rem' : '0.8rem', fontWeight: 700,
                cursor: !quizId || questions.length === 0 ? 'not-allowed' : 'pointer', opacity: !quizId || questions.length === 0 ? 0.5 : 1, whiteSpace: 'nowrap',
              }}
              title="طي جميع الأسئلة"
            >{isNarrowScreen ? '▾' : '▾ طي'}</button>

            <button
              type="button"
              onClick={() => setCollapsedQuestions(Array(questions.length).fill(false))}
              disabled={!quizId || questions.length === 0}
              style={{
                background: 'transparent', border: '1px solid transparent', color: 'var(--text)',
                padding: isNarrowScreen ? '0.32rem 0.45rem' : '0.42rem 0.68rem', borderRadius: '8px', fontSize: isNarrowScreen ? '0.65rem' : '0.8rem', fontWeight: 700,
                cursor: !quizId || questions.length === 0 ? 'not-allowed' : 'pointer', opacity: !quizId || questions.length === 0 ? 0.5 : 1, whiteSpace: 'nowrap',
              }}
              title="فتح جميع الأسئلة"
            >{isNarrowScreen ? '▴' : '▴ فتح'}</button>

            {quizId && (
              <button
                type="button"
                onClick={() => window.open(`/preview/${quizId}`, '_blank')}
                style={{
                  background: 'transparent', border: '1px solid transparent', color: 'var(--text)',
                  padding: isNarrowScreen ? '0.32rem 0.5rem' : '0.42rem 0.7rem', borderRadius: '8px', fontSize: isNarrowScreen ? '0.65rem' : '0.8rem', fontWeight: 700,
                  cursor: 'pointer', transition: 'all 0.16s ease', whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.background = 'var(--bg-deep)' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'transparent' }}
                title="معاينة الاختبار"
              >{isNarrowScreen ? '👁️' : '👁️ معاينة'}</button>
            )}

            <button
              type="button"
              onClick={copyEditorLink}
              disabled={!quizId}
              style={{
                background: 'transparent', border: '1px solid transparent', color: 'var(--text)',
                padding: isNarrowScreen ? '0.32rem 0.5rem' : '0.42rem 0.7rem', borderRadius: '8px', fontSize: isNarrowScreen ? '0.65rem' : '0.8rem', fontWeight: 700,
                cursor: !quizId ? 'not-allowed' : 'pointer', opacity: !quizId ? 0.5 : 1, transition: 'all 0.16s ease', whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => { if (quizId) { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.background = 'var(--bg-deep)' } }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'transparent' }}
              title="نسخ رابط المحرر"
            >{isNarrowScreen ? '📋' : '📋 نسخ الرابط'}</button>

            <button
              type="button"
              onClick={shareEditorLink}
              disabled={!quizId}
              style={{
                background: 'transparent', border: '1px solid transparent', color: 'var(--text)',
                padding: isNarrowScreen ? '0.32rem 0.5rem' : '0.42rem 0.7rem', borderRadius: '8px', fontSize: isNarrowScreen ? '0.65rem' : '0.8rem', fontWeight: 700,
                cursor: !quizId ? 'not-allowed' : 'pointer', opacity: !quizId ? 0.5 : 1, transition: 'all 0.16s ease', whiteSpace: 'nowrap',
              }}
              onMouseEnter={(e) => { if (quizId) { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.background = 'var(--bg-deep)' } }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'transparent' }}
              title="مشاركة رابط المحرر"
            >{isNarrowScreen ? '🔗' : '🔗 مشاركة'}</button>
          </div>

          {!isNarrowScreen && <div style={{ flex: 1, minWidth: '8px' }} />}

          {/* Group 4: Delete & Save */}
          <div className="quiz-toolbar-group" style={{ display: 'flex', gap: isNarrowScreen ? '0.2rem' : '0.35rem', flexWrap: isNarrowScreen ? 'nowrap' : 'wrap', alignItems: 'center', background: 'var(--bg-surface)', border: '1px solid var(--border-strong)', borderRadius: '10px', padding: isNarrowScreen ? '0.15rem' : '0.25rem', ...(isNarrowScreen && { marginLeft: 'auto' }) }}>
            {quizId && (
              <button
                type="button"
                onClick={handleDeleteQuiz}
                style={{
                  background: 'transparent', border: '1px solid rgba(248,113,113,0.45)', color: '#f87171',
                  padding: isNarrowScreen ? '0.32rem 0.5rem' : '0.42rem 0.7rem', borderRadius: '8px', fontSize: isNarrowScreen ? '0.65rem' : '0.8rem', fontWeight: 700,
                  cursor: 'pointer', transition: 'all 0.16s ease', whiteSpace: 'nowrap',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(248,113,113,0.12)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                title="حذف الاختبار"
              >{isNarrowScreen ? '🗑️' : '🗑️ حذف'}</button>
            )}

            <button
              type="button"
              onClick={saveQuiz}
              disabled={status.kind === 'saving'}
              onMouseEnter={(e) => {
                if (status.kind !== 'saving') {
                  (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'
                }
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'
              }}
              style={{
                background: hasUnsavedChanges ? 'var(--text-bright)' : 'rgba(59,130,246,0.16)',
                border: '1px solid var(--text-bright)',
                color: hasUnsavedChanges ? '#fff' : 'var(--text-bright)',
                padding: isNarrowScreen ? '0.32rem 0.55rem' : '0.42rem 0.8rem', borderRadius: '8px', fontSize: isNarrowScreen ? '0.7rem' : '0.8rem',
                fontWeight: 700, cursor: status.kind === 'saving' ? 'not-allowed' : 'pointer',
                opacity: status.kind === 'saving' ? 0.6 : 1,
                transition: 'all 0.16s ease', whiteSpace: 'nowrap',
              }}
              title={hasUnsavedChanges ? 'حفظ التغييرات' : 'لا توجد تغييرات'}
            >
              {status.kind === 'saving' ? <><span className="save-icon-spinning">🔄</span> {isNarrowScreen ? '' : 'حفظ'}</> : <>{isNarrowScreen ? '💾' : '💾 حفظ'}</>}
            </button>
          </div>
        </div>
      </div>

      {isMiniGameContent ? (
        <section
          className="panel"
          style={{
            backgroundColor: 'var(--bg-deep)',
            border: '1px solid #4b5563',
            borderLeft: '6px solid #7c3aed',
            padding: '1.2rem',
            borderRadius: '14px',
            marginBottom: '0.75rem',
            boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-strong)' }}>
            <h3 style={{ margin: 0, color: 'var(--text-bright)', fontSize: '1rem' }}>🎮 Mini Game Configuration</h3>
            <button
              type="button"
              onClick={() => openMetadataDialog('mini-game')}
              style={{
                border: '1px solid var(--border-strong)',
                borderRadius: '8px',
                background: 'var(--bg-surface)',
                color: 'var(--text)',
                padding: '0.35rem 0.6rem',
                cursor: 'pointer',
                fontWeight: 700,
              }}
            >
              ⚙️ Change Mini Game
            </button>
          </div>

          {!gameModeId ? (
            <div style={{ padding: '0.8rem', borderRadius: '10px', border: '1px solid var(--border-strong)', background: 'var(--bg-surface)' }}>
              <p style={{ margin: 0, color: 'var(--text)', fontWeight: 700 }}>No mini game selected yet.</p>
              <p style={{ margin: '0.3rem 0 0', color: 'var(--text-mid)', fontSize: '0.85rem' }}>Open settings and pick a mini game to enable dedicated configuration.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <div style={{ padding: '0.7rem 0.8rem', borderRadius: '10px', border: '1px solid var(--border-strong)', background: 'var(--bg-surface)' }}>
                <p style={{ margin: 0, color: 'var(--text)', fontWeight: 700 }}>
                  {(miniGameCards.find((game) => game.id === gameModeId)?.icon || '🎮')} {(miniGameCards.find((game) => game.id === gameModeId)?.englishName || gameModeId)}
                </p>
                <p style={{ margin: '0.25rem 0 0', color: 'var(--text-mid)', fontSize: '0.82rem' }}>
                  {(miniGameCards.find((game) => game.id === gameModeId)?.description) || 'Dedicated settings for this mini game.'}
                </p>
              </div>

              {gameModeId === 'match-plus-arena' && (
                <div style={{ display: 'grid', gap: '0.65rem', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-mid)', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>Default Mode</label>
                    <select
                      value={String(miniGameConfig.defaultMatchPlusMode || 'image-image')}
                      onChange={(e) => updateMiniGameConfig({ defaultMatchPlusMode: e.target.value })}
                      style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-strong)', background: 'var(--bg-surface)', color: 'var(--text)' }}
                    >
                      <option value="emoji-emoji">emoji-emoji</option>
                      <option value="emoji-text">emoji-text</option>
                      <option value="image-text">image-text</option>
                      <option value="image-image">image-image</option>
                      <option value="image-puzzle">image-puzzle</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-mid)', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>Default Puzzle Grid</label>
                    <select
                      value={String(miniGameConfig.defaultPuzzleGridSize || 3)}
                      onChange={(e) => updateMiniGameConfig({ defaultPuzzleGridSize: Number(e.target.value) })}
                      style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-strong)', background: 'var(--bg-surface)', color: 'var(--text)' }}
                    >
                      <option value="2">2 × 2</option>
                      <option value="3">3 × 3</option>
                      <option value="4">4 × 4</option>
                    </select>
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-mid)', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>Default Puzzle Image URL</label>
                    <input
                      value={String(miniGameConfig.defaultPuzzleImage || '')}
                      onChange={(e) => updateMiniGameConfig({ defaultPuzzleImage: e.target.value })}
                      placeholder="https://..."
                      style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-strong)', background: 'var(--bg-surface)', color: 'var(--text)' }}
                    />
                  </div>
                </div>
              )}

              {gameModeId === 'xo-duel' && (
                <div style={{ display: 'grid', gap: '0.65rem', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-mid)', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>Board Size</label>
                    <input type="number" min={3} max={8} value={Number(miniGameConfig.boardSize || 3)} onChange={(e) => updateMiniGameConfig({ boardSize: Number(e.target.value) })} style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-strong)', background: 'var(--bg-surface)', color: 'var(--text)' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-mid)', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>Win Length</label>
                    <input type="number" min={3} max={5} value={Number(miniGameConfig.winLength || 3)} onChange={(e) => updateMiniGameConfig({ winLength: Number(e.target.value) })} style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-strong)', background: 'var(--bg-surface)', color: 'var(--text)' }} />
                  </div>
                </div>
              )}

              {gameModeId === 'gear-machine' && (
                <div style={{ display: 'grid', gap: '0.65rem', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-mid)', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>Gears Count</label>
                    <input type="number" min={3} max={12} value={Number(miniGameConfig.gearsCount || 5)} onChange={(e) => updateMiniGameConfig({ gearsCount: Number(e.target.value) })} style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-strong)', background: 'var(--bg-surface)', color: 'var(--text)' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-mid)', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>Max Turns</label>
                    <input type="number" min={3} max={40} value={Number(miniGameConfig.maxTurns || 12)} onChange={(e) => updateMiniGameConfig({ maxTurns: Number(e.target.value) })} style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-strong)', background: 'var(--bg-surface)', color: 'var(--text)' }} />
                  </div>
                </div>
              )}

              {gameModeId !== 'match-plus-arena' && gameModeId !== 'xo-duel' && gameModeId !== 'gear-machine' && (
                <div style={{ padding: '0.7rem 0.8rem', borderRadius: '10px', border: '1px solid var(--border-strong)', background: 'var(--bg-surface)' }}>
                  <p style={{ margin: 0, color: 'var(--text)', fontWeight: 700 }}>Dedicated UI ready</p>
                  <p style={{ margin: '0.25rem 0 0', color: 'var(--text-mid)', fontSize: '0.82rem' }}>
                    This mini game has its own config surface. Add specific controls here as product rules evolve.
                  </p>
                </div>
              )}
            </div>
          )}
        </section>
      ) : questions.map((q, index) => (
        (() => {
          const editorMeta = getQuestionTypeEditorMeta(q.type)
          const isCreatorStudioMode = gameModeId === 'creator-studio'
          const isMultiSelectOptions = editorMeta.answerMode === 'options' && editorMeta.selectionMode === 'multi'
          const optionMin = editorMeta.optionsMin ?? 2
          return (
        <section
          key={index}
          className="panel"
          draggable
          onDragStart={() => setDragIndex(index)}
          onDragOver={(e) => { e.preventDefault(); setDragOverIndex(index) }}
          onDrop={() => { if (dragIndex !== null) moveQuestion(dragIndex, index); setDragIndex(null); setDragOverIndex(null) }}
          onDragEnd={() => { setDragIndex(null); setDragOverIndex(null) }}
          style={{
            backgroundColor: 'var(--bg-deep)',
            border: dragOverIndex === index && dragIndex !== index
              ? '1px solid #4b5563'
              : !collapsedQuestions[index]
              ? '1px solid #4b5563'
              : '1px solid #4b5563',
            borderLeft: dragOverIndex === index && dragIndex !== index
              ? '6px solid #7c3aed'
              : '6px solid #3b82f6',
            padding: '1.2rem',
            borderRadius: '14px',
            marginBottom: '0.75rem',
            boxShadow: dragIndex === index
              ? '0 0 0 2px #3b82f6, 0 4px 12px rgba(0,0,0,0.3)'
              : '0 2px 8px rgba(0,0,0,0.2)',
            opacity: dragIndex === index ? 0.5 : 1,
            cursor: 'default',
            transition: 'border-color 0.15s, box-shadow 0.15s, opacity 0.15s',
          }}
        >
          {/* Header with question number and type badge - Premium Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', paddingBottom: '0.8rem', borderBottom: '1px solid var(--border-strong)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flex: 1, minWidth: 0 }}>
              {collapsedQuestions[index] ? (
                <>
                  <span
                    draggable={false}
                    style={{
                      fontSize: '1rem',
                      color: 'var(--text-muted)',
                      cursor: 'grab',
                      background: 'var(--bg-surface)',
                      width: '28px',
                      height: '28px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '6px',
                      flexShrink: 0,
                    }}
                    title="اسحب لإعادة الترتيب"
                  >⠿</span>
                  <span
                    style={{
                      fontSize: '0.92rem',
                      color: 'var(--text-bright)',
                      fontWeight: 700,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '100%'
                    }}
                    title={q.text || 'بدون نص سؤال'}
                  >
                    {q.text || 'بدون نص سؤال'}
                  </span>
                </>
              ) : (
                <>
                  <span
                    draggable={false}
                    style={{ 
                      fontSize: '1rem', 
                      color: 'var(--text-muted)', 
                      cursor: 'grab', 
                      background: 'var(--bg-surface)', 
                      width: '28px', 
                      height: '28px', 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      borderRadius: '6px' 
                    }}
                    title="اسحب لإعادة الترتيب"
                  >⠿</span>
                  <h3 style={{ margin: '0', fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-bright)', letterSpacing: '0.5px' }}>
                    السؤال {index + 1}
                  </h3>
                </>
              )}
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              {!collapsedQuestions[index] && !isCreatorStudioMode && (
                <>
                  <select
                    value={q.type}
                    onChange={(e) => {
                      const nextType = e.target.value as QuestionType
                      if (isPremiumQuestionType(nextType) && !isSubscribed) {
                        openUpgradeDialog('This question type is premium. Please upgrade your account to use it.')
                        return
                      }
                      replaceQuestion(index, coerceQuestionToType(q, nextType))
                    }}
                    style={{
                      minWidth: '160px',
                      padding: '0.45rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-strong)',
                      backgroundColor: 'var(--bg-deep)',
                      color: 'var(--text)',
                      fontSize: '0.96rem',
                      fontWeight: 400,
                      cursor: 'pointer',
                      outline: 'none',
                    }}
                    title="نوع السؤال"
                  >
                    {questionTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', direction: 'rtl', background: 'var(--bg-deep)', border: '1px solid var(--border-strong)', borderRadius: '8px', padding: '0.25rem 0.45rem', height: '42px' }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 400 }}>⏱️</span>
                    <select
                      value={String(q.duration || 20)}
                      onChange={(e) => updateQuestion(index, { duration: Number(e.target.value) })}
                      style={{
                        minWidth: '55px',
                        height: '100%',
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--text)',
                        fontSize: '0.9rem',
                        fontWeight: 400,
                        outline: 'none',
                        cursor: 'pointer',
                        padding: '0 0.2rem',
                        direction: 'rtl',
                        textAlign: 'right',
                      }}
                      title="مدة السؤال"
                    >
                      {getQuestionTypeTimerPolicy(q.type).allowedDurations.map((seconds) => (
                        <option key={seconds} value={seconds} style={{ color: '#0f172a' }}>
                          {seconds} ث
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={{ width: '1px', height: '20px', background: 'var(--border-strong)', margin: '0 0.2rem' }} />
                </>
              )}

              <button
                type="button"
                onClick={() => setCollapsedQuestions((prev) => {
                  const next = [...prev]
                  next[index] = !next[index]
                  return next
                })}
                style={{
                  background: 'var(--bg-deep)', border: '1px solid var(--border-strong)', color: 'var(--text-mid)',
                  fontSize: '0.85rem', width: '28px', height: '28px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                {collapsedQuestions[index] ? '▾' : '▴'}
              </button>
              
              <button 
                type="button" 
                onClick={() => removeQuestion(index)} 
                style={{ 
                  background: 'rgba(239, 68, 68, 0.1)', 
                  color: '#ef4444', 
                  fontSize: '0.8rem', 
                  width: '28px', 
                  height: '28px', 
                  borderRadius: '6px', 
                  border: '1px solid rgba(239, 68, 68, 0.2)', 
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#ef4444'; e.currentTarget.style.color = '#fff' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; e.currentTarget.style.color = '#ef4444' }}
              >
                🗑️
              </button>
            </div>
          </div>

          {!collapsedQuestions[index] && (
            <>

          {/* Question text + meta (compact one line) */}
          <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.2rem', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>نص السؤال</label>
              <div style={{ display: 'flex', gap: '0', background: 'var(--bg-deep)', borderRadius: '8px', border: '1px solid var(--border-strong)', overflow: 'hidden', transition: 'border-color 0.2s' }}>
                <input
                  dir="auto"
                  value={q.text}
                  onChange={(e) => updateQuestion(index, { text: e.target.value })}
                  placeholder="اكتب السؤال هنا..."
                  style={{
                    flex: 1,
                    padding: '0.65rem 0.85rem',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text)',
                    fontSize: '1rem',
                    outline: 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const text = await navigator.clipboard.readText()
                      if (text) updateQuestion(index, { text })
                    } catch (err) {
                      console.error('Failed to read clipboard', err)
                    }
                  }}
                  style={{
                    padding: '0 0.85rem',
                    border: 'none',
                    borderLeft: '1px solid var(--border-strong)',
                    background: 'rgba(59, 130, 246, 0.05)',
                    color: 'var(--text-bright)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1rem'
                  }}
                  title="لصق النص"
                >
                  📋
                </button>
              </div>
            </div>
          </div>

          {gameModeId === 'creator-studio' && (
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>
                إعدادات Creator Studio
              </label>
              <div style={{
                padding: '0.75rem 0.9rem',
                borderRadius: '10px',
                border: '1px solid var(--border-strong)',
                backgroundColor: 'var(--bg-deep)',
                color: 'var(--text-mid)',
                fontSize: '0.88rem',
              }}>
                هذا الوضع يدعم جولات الرسم فقط. يتم تشغيل النص المكتوب في السؤال كـ prompt رسم مباشر.
              </div>
              <p style={{ marginTop: '0.45rem', marginBottom: 0, fontSize: '0.76rem', color: 'var(--text-mid)' }}>
                هذه الإعدادات خاصة بوضع Creator Studio وتُستخدم مباشرة في تشغيل الجولة.
              </p>
            </div>
          )}

          {/* Options section for single/multi/boss */}
          {!isCreatorStudioMode && editorMeta.answerMode === 'options' && (
            <div style={{ marginBottom: '1.2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.6rem' }}>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>{editorMeta.optionsSectionLabel}</label>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-mid)', fontWeight: 500 }}>
                  {isMultiSelectOptions ? editorMeta.optionsModeMultiLabel : editorMeta.optionsModeSingleLabel}
                </span>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
                {(q.options || []).map((opt, optIndex) => {
                  const isCorrectSingle = q.correctIndex === optIndex
                  const isCorrectMulti = (q.correctIndices || []).includes(optIndex)
                  const isCorrect = isMultiSelectOptions ? isCorrectMulti : isCorrectSingle

                  return (
                    <div
                      key={optIndex}
                      className="option-card"
                      style={{
                        display: 'flex',
                        gap: '0.8rem',
                        alignItems: 'center',
                        padding: '0.6rem 1rem',
                        borderRadius: '12px',
                        border: `2px solid ${isCorrect ? 'var(--text-bright)' : 'var(--border-strong)'}`,
                        backgroundColor: isCorrect ? 'rgba(59, 130, 246, 0.08)' : 'var(--bg-deep)',
                        boxShadow: isCorrect ? '0 0 15px rgba(59, 130, 246, 0.15)' : 'none',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      {/* Checkmark indicator for correct answers */}
                      <div
                        onClick={() => {
                          if (isMultiSelectOptions) {
                            const prev = new Set(q.correctIndices || [])
                            if (isCorrect) prev.delete(optIndex)
                            else prev.add(optIndex)
                            updateQuestion(index, { correctIndices: [...prev].sort((a, b) => a - b) })
                          } else {
                            updateQuestion(index, { correctIndex: optIndex })
                          }
                        }}
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          border: `2px solid ${isCorrect ? 'var(--text-bright)' : 'var(--text-muted)'}`,
                          backgroundColor: isCorrect ? 'var(--text-bright)' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          color: '#fff',
                          fontSize: '0.8rem',
                          boxShadow: isCorrect ? '0 2px 6px rgba(59, 130, 246, 0.4)' : 'none',
                          transition: 'all 0.2s',
                        }}
                      >
                        {isCorrect && '✓'}
                      </div>
                      
                      <input
                        dir="auto"
                        value={opt}
                        onChange={(e) => {
                          const next = [...(q.options || [])]
                          next[optIndex] = e.target.value
                          updateQuestion(index, { options: next })
                        }}
                        placeholder={`الخيار ${optIndex + 1}...`}
                        style={{
                          flex: 1,
                          padding: '0.4rem 0',
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text)',
                          fontSize: '1rem',
                          outline: 'none',
                          fontWeight: 500,
                        }}
                      />

                      <button
                        type="button"
                        onClick={() => {
                          const next = [...(q.options || [])]
                          next.splice(optIndex, 1)
                          // Also clean up correct indices
                          if (isMultiSelectOptions) {
                            const newIndices = (q.correctIndices || [])
                              .filter(i => i !== optIndex)
                              .map(i => i > optIndex ? i - 1 : i)
                            updateQuestion(index, { options: next, correctIndices: newIndices })
                          } else {
                            const newIdx = q.correctIndex === optIndex ? 0 : (q.correctIndex! > optIndex ? q.correctIndex! - 1 : q.correctIndex)
                            updateQuestion(index, { options: next, correctIndex: newIdx })
                          }
                        }}
                        style={{
                          padding: '0.2rem',
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          fontSize: '0.9rem',
                          opacity: (q.options || []).length > optionMin ? 0.6 : 0 // Show only if above minimum options
                        }}
                        disabled={(q.options || []).length <= optionMin}
                        title="حذف الخيار"
                      >
                        ✕
                      </button>
                    </div>
                  )
                })}
                
                {/* Add Option Button integrated into the grid */}
                <button
                  type="button"
                  onClick={() => {
                    const next = [...(q.options || []), 'خيار جديد']
                    updateQuestion(index, { options: next })
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    padding: '0.6rem 1rem',
                    borderRadius: '12px',
                    border: '2px dashed var(--border-strong)',
                    backgroundColor: 'rgba(59, 130, 246, 0.03)',
                    color: 'var(--text-mid)',
                    fontSize: '0.95rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--text-bright)'
                    e.currentTarget.style.color = 'var(--text-bright)'
                    e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.08)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-strong)'
                    e.currentTarget.style.color = 'var(--text-mid)'
                    e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.03)'
                  }}
                >
                  <span style={{ fontSize: '1.2rem' }}>+</span> إضافة خيار
                </button>
              </div>
            </div>
          )}

          {!isCreatorStudioMode && editorMeta.answerMode === 'text' && (
            <div style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>{editorMeta.textSettingsLabel}</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-mid)', fontWeight: 600 }}>نص التلميح</label>
                  <input
                    value={q.inputPlaceholder || ''}
                    onChange={(e) => updateQuestion(index, { inputPlaceholder: e.target.value })}
                    placeholder="مثال: أدخل العاصمة هنا..."
                    style={{
                      padding: '0.7rem 0.95rem',
                      borderRadius: '10px',
                      border: '1.5px solid var(--border-strong)',
                      backgroundColor: 'var(--bg-deep)',
                      color: 'var(--text)',
                      fontSize: '0.9rem',
                      outline: 'none',
                      transition: 'border-color 0.2s',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-mid)', fontWeight: 600 }}>الإجابات الصحيحة (فاصلة)</label>
                  <input
                    value={(q.acceptedAnswers || []).join(', ')}
                    onChange={(e) => {
                      const values = e.target.value.split(',').map((v) => v.trim()).filter(Boolean)
                      updateQuestion(index, { acceptedAnswers: values })
                    }}
                    placeholder="إجابة 1, إجابة 2"
                    style={{
                      padding: '0.7rem 0.95rem',
                      borderRadius: '10px',
                      border: '1.5px solid var(--border-strong)',
                      backgroundColor: 'var(--bg-deep)',
                      color: 'var(--text)',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {!isCreatorStudioMode && editorMeta.hasBossSettings && (
            <div style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>{editorMeta.bossSettingsLabel}</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-mid)', fontWeight: 600 }}>اسم الزعيم</label>
                  <input
                    value={q.bossName || ''}
                    onChange={(e) => updateQuestion(index, { bossName: e.target.value })}
                    placeholder="سيد التحدي"
                    style={{
                      padding: '0.7rem 0.95rem',
                      borderRadius: '10px',
                      border: '1.5px solid var(--border-strong)',
                      backgroundColor: 'var(--bg-deep)',
                      color: 'var(--text)',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-mid)', fontWeight: 600 }}>نقاط الحياة (HP)</label>
                  <input
                    type="number"
                    min={1}
                    value={q.bossHp || 100}
                    onChange={(e) => updateQuestion(index, { bossHp: Number(e.target.value) })}
                    style={{
                      padding: '0.7rem 0.95rem',
                      borderRadius: '10px',
                      border: '1.5px solid var(--border-strong)',
                      backgroundColor: 'var(--bg-deep)',
                      color: 'var(--text)',
                      fontSize: '0.9rem',
                      outline: 'none',
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {!isCreatorStudioMode && editorMeta.answerMode === 'pairs' && (
            <div style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>{editorMeta.pairsSectionLabel}</label>
              {q.type === 'match_plus' && (
                <div style={{ marginBottom: '0.75rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.65rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700 }}>النمط</span>
                    <select
                      value={q.matchPlusMode || 'image-image'}
                      onChange={(e) => updateQuestion(index, { matchPlusMode: e.target.value as QuizQuestion['matchPlusMode'] })}
                      style={{
                        padding: '0.5rem 0.6rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border-strong)',
                        background: 'var(--bg-surface)',
                        color: 'var(--text)',
                        fontSize: '0.82rem',
                        outline: 'none',
                      }}
                    >
                      <option value="emoji-emoji">Emoji → Emoji</option>
                      <option value="emoji-text">Emoji → Text</option>
                      <option value="image-text">Image → Text</option>
                      <option value="image-image">Image → Image</option>
                      <option value="image-puzzle">Image Puzzle</option>
                    </select>
                  </div>

                  {(q.matchPlusMode || 'image-image') === 'image-puzzle' && (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700 }}>صورة البازل</span>
                        <input
                          value={q.matchPlusImage || ''}
                          onChange={(e) => updateQuestion(index, { matchPlusImage: e.target.value })}
                          placeholder="رابط الصورة الكاملة"
                          style={{
                            padding: '0.5rem 0.6rem',
                            borderRadius: '8px',
                            border: '1px solid var(--border-strong)',
                            background: 'var(--bg-surface)',
                            color: 'var(--text)',
                            fontSize: '0.82rem',
                            outline: 'none',
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700 }}>حجم الشبكة</span>
                        <select
                          value={String(q.matchPlusGridSize || 3)}
                          onChange={(e) => updateQuestion(index, { matchPlusGridSize: Number(e.target.value) })}
                          style={{
                            padding: '0.5rem 0.6rem',
                            borderRadius: '8px',
                            border: '1px solid var(--border-strong)',
                            background: 'var(--bg-surface)',
                            color: 'var(--text)',
                            fontSize: '0.82rem',
                            outline: 'none',
                          }}
                        >
                          <option value="2">2 × 2</option>
                          <option value="3">3 × 3</option>
                          <option value="4">4 × 4</option>
                        </select>
                      </div>
                    </>
                  )}
                </div>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                {(q.pairs || []).map((pair, pairIndex) => {
                  const leftValue = String(pair.left || '').trim()
                  const rightValue = String(pair.right || '').trim()
                  const matchMode = (q.matchPlusMode || 'image-image') as string
                  const isPuzzleMode = matchMode === 'image-puzzle'
                  const leftIsImage = matchMode === 'image-text' || matchMode === 'image-image'
                  const rightIsImage = matchMode === 'image-image'
                  const looksLikeImageRef = (value: string) => (
                    value.startsWith('/') ||
                    value.startsWith('data:image/') ||
                    value.startsWith('blob:') ||
                    /^https?:\/\/.+/i.test(value)
                  )
                  const leftInvalid = leftIsImage && leftValue.length > 0 && !looksLikeImageRef(leftValue)
                  const rightInvalid = rightIsImage && rightValue.length > 0 && !looksLikeImageRef(rightValue)

                  return (
                  <div key={pairIndex} style={{ display: 'grid', gridTemplateColumns: q.type === 'match_plus' ? '1fr auto 1fr' : '1fr auto 1fr', gap: '0.8rem', alignItems: 'center', background: 'var(--bg-deep)', padding: '0.4rem 0.8rem', borderRadius: '12px', border: '1.5px solid var(--border-strong)' }}>
                    {q.type === 'match_plus' ? (
                      <>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                          {leftIsImage && !isPuzzleMode && (
                            <div style={{ height: '72px', borderRadius: '10px', border: '1px solid var(--border-strong)', overflow: 'hidden', background: 'var(--bg)' }}>
                              {leftValue ? (
                                <img src={pair.left} alt={`left ${pairIndex + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                              ) : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>🖼️ أضف صورة</div>}
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                            <input
                              value={pair.left}
                              onChange={(e) => {
                                const next = [...(q.pairs || [])]
                                next[pairIndex] = { ...next[pairIndex], left: e.target.value }
                                updateQuestion(index, { pairs: next })
                              }}
                              placeholder={isPuzzleMode ? 'رقم القطعة' : (leftIsImage ? 'رابط الصورة اليسرى' : (matchMode === 'emoji-emoji' || matchMode === 'emoji-text' ? 'Emoji يسار' : 'نص يسار'))}
                              disabled={isPuzzleMode}
                              style={{
                                flex: 1,
                                padding: '0.5rem 0.55rem',
                                borderRadius: '8px',
                                border: '1px solid var(--border-strong)',
                                background: 'var(--bg-surface)',
                                color: 'var(--text)',
                                fontSize: '0.82rem',
                                outline: 'none',
                              }}
                            />
                            {leftIsImage && !isPuzzleMode && (
                              <button
                                type="button"
                                onClick={() => uploadMatchPairImage(index, pairIndex, 'left')}
                                disabled={uploadingPairImageKey === `${index}:${pairIndex}:left`}
                                style={{
                                  borderRadius: '8px',
                                  border: '1px solid var(--border-strong)',
                                  background: uploadingPairImageKey === `${index}:${pairIndex}:left` ? 'rgba(59,130,246,0.16)' : 'var(--bg-surface)',
                                  color: 'var(--text)',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  padding: '0 0.55rem',
                                  cursor: uploadingPairImageKey === `${index}:${pairIndex}:left` ? 'not-allowed' : 'pointer',
                                  minWidth: '54px',
                                }}
                              >
                                {uploadingPairImageKey === `${index}:${pairIndex}:left` ? '⏳' : '📁 رفع'}
                              </button>
                            )}
                          </div>
                          {!isPuzzleMode && leftIsImage && !leftValue && (
                            <span style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 600 }}>الصورة اليسرى مطلوبة</span>
                          )}
                          {leftInvalid && (
                            <span style={{ fontSize: '0.72rem', color: '#f87171', fontWeight: 600 }}>الرابط غير صالح كصورة</span>
                          )}
                        </div>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', color: 'var(--text-mid)', fontWeight: 'bold' }}>⇄</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                          {rightIsImage && !isPuzzleMode && (
                            <div style={{ height: '72px', borderRadius: '10px', border: '1px solid var(--border-strong)', overflow: 'hidden', background: 'var(--bg)' }}>
                              {rightValue ? (
                                <img src={pair.right} alt={`right ${pairIndex + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                              ) : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>🖼️ أضف صورة</div>}
                            </div>
                          )}
                          <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                            <input
                              value={pair.right}
                              onChange={(e) => {
                                const next = [...(q.pairs || [])]
                                next[pairIndex] = { ...next[pairIndex], right: e.target.value }
                                updateQuestion(index, { pairs: next })
                              }}
                              placeholder={isPuzzleMode ? 'مكان القطعة' : (rightIsImage ? 'رابط الصورة اليمنى' : (matchMode === 'emoji-emoji' ? 'Emoji يمين' : 'نص يمين'))}
                              disabled={isPuzzleMode}
                              style={{
                                flex: 1,
                                padding: '0.5rem 0.55rem',
                                borderRadius: '8px',
                                border: '1px solid var(--border-strong)',
                                background: 'var(--bg-surface)',
                                color: 'var(--text)',
                                fontSize: '0.82rem',
                                outline: 'none',
                              }}
                            />
                            {rightIsImage && !isPuzzleMode && (
                              <button
                                type="button"
                                onClick={() => uploadMatchPairImage(index, pairIndex, 'right')}
                                disabled={uploadingPairImageKey === `${index}:${pairIndex}:right`}
                                style={{
                                  borderRadius: '8px',
                                  border: '1px solid var(--border-strong)',
                                  background: uploadingPairImageKey === `${index}:${pairIndex}:right` ? 'rgba(59,130,246,0.16)' : 'var(--bg-surface)',
                                  color: 'var(--text)',
                                  fontSize: '0.78rem',
                                  fontWeight: 700,
                                  padding: '0 0.55rem',
                                  cursor: uploadingPairImageKey === `${index}:${pairIndex}:right` ? 'not-allowed' : 'pointer',
                                  minWidth: '54px',
                                }}
                              >
                                {uploadingPairImageKey === `${index}:${pairIndex}:right` ? '⏳' : '📁 رفع'}
                              </button>
                            )}
                          </div>
                          {!isPuzzleMode && rightIsImage && !rightValue && (
                            <span style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 600 }}>الصورة اليمنى مطلوبة</span>
                          )}
                          {rightInvalid && (
                            <span style={{ fontSize: '0.72rem', color: '#f87171', fontWeight: 600 }}>الرابط غير صالح كصورة</span>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <input
                          value={pair.left}
                          onChange={(e) => {
                            const next = [...(q.pairs || [])]
                            next[pairIndex] = { ...next[pairIndex], left: e.target.value }
                            updateQuestion(index, { pairs: next })
                          }}
                          placeholder="العنصر الأيمن"
                          style={{
                            padding: '0.5rem 0.2rem',
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text)',
                            fontSize: '0.9rem',
                            outline: 'none',
                            textAlign: 'center'
                          }}
                        />
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', color: 'var(--text-mid)', fontWeight: 'bold' }}>⇄</div>
                        <input
                          value={pair.right}
                          onChange={(e) => {
                            const next = [...(q.pairs || [])]
                            next[pairIndex] = { ...next[pairIndex], right: e.target.value }
                            updateQuestion(index, { pairs: next })
                          }}
                          placeholder="العنصر المقابل"
                          style={{
                            padding: '0.5rem 0.2rem',
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text)',
                            fontSize: '0.9rem',
                            outline: 'none',
                            textAlign: 'center'
                          }}
                        />
                      </>
                    )}
                  </div>
                )})}
              </div>
            </div>
          )}

          {!isCreatorStudioMode && editorMeta.answerMode === 'ordering' && (
            <div style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
              <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>{editorMeta.orderingSectionLabel}</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.2rem' }}>
                {(q.items || []).map((item, itemIndex) => (
                  <div key={itemIndex} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', background: 'var(--bg-deep)', padding: '0.4rem 0.8rem', borderRadius: '12px', border: '1.5px solid var(--border-strong)' }}>
                    <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: 'var(--text-bright)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>{itemIndex + 1}</div>
                    <input
                      value={item}
                      onChange={(e) => {
                        const next = [...(q.items || [])]
                        next[itemIndex] = e.target.value
                        updateQuestion(index, { items: next })
                      }}
                      placeholder={`أدخل العنصر ${itemIndex + 1}...`}
                      style={{
                        flex: 1,
                        padding: '0.5rem 0',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text)',
                        fontSize: '0.9rem',
                        outline: 'none',
                      }}
                    />
                  </div>
                ))}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>الترتيب الصحيح (أرقام مفصولة بفاصلة)</label>
                <input
                  value={(q.correctOrder || []).join(', ')}
                  onChange={(e) => updateQuestion(index, { correctOrder: parseNumberList(e.target.value, (q.items || []).length) })}
                  placeholder="مثال: 1, 3, 2, 4"
                  style={{
                    padding: '0.7rem 0.95rem',
                    borderRadius: '10px',
                    border: '1.5px solid var(--border-strong)',
                    backgroundColor: 'var(--bg-deep)',
                    color: 'var(--text)',
                    fontSize: '0.9rem',
                    outline: 'none',
                  }}
                />
              </div>
            </div>
          )}

          {/* Media section with beautiful card design */}
          <div style={{ marginTop: '0.5rem' }}>
            <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>وسائط السؤال</label>
            
            {/* Media type selection - Segmented Control style */}
            <div style={{ display: 'inline-flex', background: 'var(--bg-deep)', padding: '3px', borderRadius: '10px', border: '1px solid var(--border-strong)', marginBottom: '1.2rem' }}>
              {[
                { value: 'none', label: '✕ بلا' },
                { value: 'image', label: '🖼️ صورة' },
                { value: 'gif', label: '🎞️ GIF' },
                { value: 'video', label: '🎬 فيديو' },
              ].map((option) => {
                const isSelected = (q.media?.type ?? 'none') === option.value
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      if (option.value === 'none') {
                        const { media: _media, ...rest } = q
                        replaceQuestion(index, rest as QuizQuestion)
                        return
                      }
                      updateQuestion(index, { media: { type: option.value as QuizMedia['type'], url: q.media?.url ?? '' } })
                    }}
                    style={{
                      padding: '0.4rem 1rem',
                      borderRadius: '8px',
                      border: 'none',
                      backgroundColor: isSelected ? 'var(--text-bright)' : 'transparent',
                      color: isSelected ? '#fff' : 'var(--text-mid)',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      transition: 'all 0.2s ease',
                      fontWeight: isSelected ? 600 : 500,
                      boxShadow: isSelected ? '0 2px 6px rgba(0,0,0,0.1)' : 'none',
                    }}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>

            {/* Media URL input and upload integration */}
            {q.media && (
              <div style={{ marginBottom: '1rem', animation: 'fadeIn 0.3s ease-out' }}>
                <div style={{ display: 'flex', gap: '0', background: 'var(--bg-deep)', borderRadius: '10px', border: '1px solid var(--border-strong)', overflow: 'hidden' }}>
                  <input
                    value={q.media.url}
                    onChange={(e) => updateQuestion(index, { media: { ...q.media!, url: e.target.value } })}
                    placeholder={q.media.type === 'video' ? 'رابط فيديو يوتيوب...' : 'أدخل رابط الوسائط هنا...'}
                    style={{
                      flex: 1,
                      padding: '0.7rem 0.95rem',
                      border: 'none',
                      background: 'transparent',
                      color: 'var(--text)',
                      fontSize: '0.9rem',
                      outline: 'none'
                    }}
                  />
                  
                  <button
                    type="button"
                    disabled={uploadingIndex === index}
                    onClick={() => {
                      const input = document.createElement('input')
                      input.type = 'file'
                      input.accept = q.media?.type === 'video' ? 'video/*' : q.media?.type === 'gif' ? 'image/gif' : 'image/*'
                      input.onchange = async (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0]
                        if (!file) return
                        setUploadingIndex(index)
                        try {
                          const ext = file.name.split('.').pop() || 'bin'
                          const path = `quiz-media/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
                          const storageRef = ref(storage, path)
                          await uploadBytes(storageRef, file)
                          const url = await getDownloadURL(storageRef)
                          updateQuestion(index, { media: { ...q.media!, url } })
                        } catch (err) {
                          console.error('Upload failed', err)
                          alert('Upload failed. Check Firebase Storage rules.')
                        } finally {
                          setUploadingIndex(null)
                        }
                      }
                      input.click()
                    }}
                    style={{
                      padding: '0 1rem',
                      border: 'none',
                      borderLeft: '1px solid var(--border-strong)',
                      backgroundColor: uploadingIndex === index ? 'rgba(59, 130, 246, 0.15)' : 'var(--text-bright)',
                      color: '#fff',
                      cursor: uploadingIndex === index ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1rem',
                      transition: 'all 0.2s'
                    }}
                    title={uploadingIndex === index ? 'جارٍ الرفع...' : 'رفع ملف'}
                  >
                    {uploadingIndex === index ? (
                      <span style={{
                        display: 'inline-block',
                        width: '16px',
                        height: '16px',
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTopColor: '#fff',
                        borderRadius: '50%',
                        animation: 'spin 0.7s linear infinite',
                      }} />
                    ) : '📁'}
                  </button>
                  
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const text = await navigator.clipboard.readText()
                        if (text) updateQuestion(index, { media: { ...q.media!, url: text } })
                      } catch (err) {
                        console.error('Failed to read clipboard', err)
                      }
                    }}
                    style={{
                      padding: '0 1rem',
                      border: 'none',
                      borderLeft: '1px solid var(--border-strong)',
                      backgroundColor: 'var(--text-bright)',
                      color: '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.1rem',
                      transition: 'all 0.2s'
                    }}
                    title="لصق الرابط"
                  >
                    📋
                  </button>
                </div>
              </div>
            )}

            {/* Media preview card */}
            {q.media?.url && (
              <div style={{
                marginTop: '0.8rem',
                padding: '0.6rem',
                borderRadius: '12px',
                border: '1px solid var(--border-strong)',
                backgroundColor: 'var(--bg-deep)',
                overflow: 'hidden',
                animation: 'fadeIn 0.4s ease-out'
              }}>
                {(q.media.type === 'image' || q.media.type === 'gif') && (
                  <img 
                    src={q.media.url} 
                    alt="preview" 
                    style={{ 
                      maxWidth: '100%', 
                      maxHeight: 150, 
                      borderRadius: 4, 
                      objectFit: 'cover',
                      display: 'block'
                    }} 
                    onError={(e) => {
                      const t = e.target as HTMLImageElement
                      t.onerror = null
                      t.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='160' viewBox='0 0 320 160'%3E%3Crect width='320' height='160' fill='%231e293b'/%3E%3Ctext x='50%25' y='44%25' font-family='sans-serif' font-size='28' fill='%2364748b' text-anchor='middle' dominant-baseline='middle'%3E%F0%9F%96%BC%EF%B8%8F%3C/text%3E%3Ctext x='50%25' y='68%25' font-family='sans-serif' font-size='12' fill='%2364748b' text-anchor='middle' dominant-baseline='middle'%3EImage unavailable%3C/text%3E%3C/svg%3E"
                      t.style.opacity = '0.5'
                    }}
                  />
                )}
                {q.media.type === 'video' && (
                  <iframe
                    src={q.media.url}
                    title="video preview"
                    width="100%"
                    height="150"
                    style={{ border: 'none', borderRadius: 4, display: 'block' }}
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                  />
                )}
              </div>
            )}
          </div>
          </>
          )}
        </section>
          )
        })()
      ))}

      {!isMiniGameContent && (!quizId && questions.length === 0) ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: '1rem',
          marginBottom: '3rem',
        }}>
          <div 
            onClick={addQuestion}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
              padding: '2.5rem',
              borderRadius: '16px',
              border: '2px dashed var(--border-strong)',
              backgroundColor: 'rgba(59, 130, 246, 0.05)',
              color: 'var(--text-mid)',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              animation: 'slideUp 0.6s ease-out'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = 'var(--text-bright)'
              e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'
              e.currentTarget.style.transform = 'scale(1.01)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-strong)'
              e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.05)'
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: 'var(--text-bright)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.8rem',
              boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)'
            }}>+</div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-bright)' }}>إضافة سؤال جديد</span>
              <span style={{ fontSize: '0.82rem', opacity: 0.7 }}>اختر من بين 6 أنواع مختلفة من الأسئلة</span>
            </div>
          </div>

          <div 
            onClick={loadSamples}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '1rem',
              padding: '2.5rem',
              borderRadius: '16px',
              border: '2px dashed var(--border-strong)',
              backgroundColor: 'rgba(16, 185, 129, 0.06)',
              color: 'var(--text-mid)',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              animation: 'slideUp 0.55s ease-out'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#10b981'
              e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.12)'
              e.currentTarget.style.transform = 'scale(1.01)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-strong)'
              e.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.06)'
              e.currentTarget.style.transform = 'scale(1)'
            }}
          >
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.45rem',
              boxShadow: '0 4px 15px rgba(16, 185, 129, 0.35)'
            }}>🧪</div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-bright)' }}>تحميل عينات جاهزة</span>
              <span style={{ fontSize: '0.82rem', opacity: 0.75 }}>ابدأ بسرعة بقالب أسئلة متكامل وجاهز للتعديل</span>
            </div>
          </div>
        </div>
      ) : (
        <div 
          onClick={addQuestion}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '1rem',
            padding: '2.5rem',
            borderRadius: '16px',
            border: '2px dashed var(--border-strong)',
            backgroundColor: 'rgba(59, 130, 246, 0.05)',
            color: 'var(--text-mid)',
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            marginBottom: '3rem',
            animation: 'slideUp 0.6s ease-out'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--text-bright)'
            e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'
            e.currentTarget.style.transform = 'scale(1.01)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-strong)'
            e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.05)'
            e.currentTarget.style.transform = 'scale(1)'
          }}
        >
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            backgroundColor: 'var(--text-bright)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.8rem',
            boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)'
          }}>+</div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-bright)' }}>إضافة سؤال جديد</span>
            <span style={{ fontSize: '0.82rem', opacity: 0.7 }}>اختر من بين 6 أنواع مختلفة من الأسئلة</span>
          </div>
        </div>
      )}

      {/* ── AI Features Dialog (Premium Placeholder) ── */}
      {aiAction && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(10px)',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border-strong)',
            borderRadius: '24px', width: '90%', maxWidth: '540px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)', overflow: 'hidden',
            position: 'relative'
          }}>
            {/* Header */}
            <div style={{ padding: '1.25rem 1.5rem', background: 'linear-gradient(135deg, #7c3aed, #db2777)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                {aiAction === 'generate' ? '✨ توليد أسئلة بالذكاء الاصطناعي' : '🛡️ تدقيق ذكي ومراجعة الأسئلة'}
              </h2>
              <button 
                onClick={() => setAiAction(null)}
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '1.1rem' }}
              >✕</button>
            </div>

            {/* Content */}
            <div style={{ padding: '2rem', position: 'relative' }}>
              {aiAction === 'generate' ? (
                <>
                  <p style={{ color: 'var(--text-mid)', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                    صِف موضوع الاختبار أو ارفع صوراً، وسيقوم الذكاء الاصطناعي بإنشاء أسئلة احترافية لك في ثوانٍ.
                  </p>
                  
                  <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.5rem', textTransform: 'uppercase' }}>موضوع أو وصف الأسئلة</label>
                    <textarea 
                      placeholder="امتحان في الفيزياء للفصل الأول، موضوع الخلية..."
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      style={{ width: '100%', height: '100px', padding: '1rem', borderRadius: '12px', border: '1.5px solid var(--border-strong)', background: 'var(--bg-deep)', color: 'var(--text)', fontSize: '0.9rem', outline: 'none', transition: 'border-color 0.2s', resize: 'none' }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '0.8rem', alignItems: 'center', marginBottom: '2rem' }}>
                    <label 
                      style={{ 
                        flex: 1, height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
                        borderRadius: '12px', border: '1.5px dashed var(--border-strong)', background: 'var(--bg-deep)',
                        cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.85rem'
                      }}
                    >
                      <input type="file" style={{ display: 'none' }} accept="image/*" />
                      📷 رفع صور
                    </label>
                    <div style={{ flex: 1, padding: '0 1rem', fontSize: '0.8rem', color: 'var(--text-dim)', textAlign: 'center' }}>
                      أو ارفع صفحات الكتاب
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <p style={{ color: 'var(--text-mid)', fontSize: '1rem', textAlign: 'center', marginBottom: '2rem', lineHeight: 1.6 }}>
                    سيقوم الذكاء الاصطناعي بمراجعة جميع الأسئلة الحالية ({questions.length}) للتحقق من:
                    <br />
                    ✅ صحة المعلومات
                    <br />
                    🛠️ سلامة الصياغة اللغوية
                    <br />
                    🎯 تدقيق الخيارات والإجابات
                  </p>
                  
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
                    <div style={{ height: '4px', width: '200px', background: 'var(--border-strong)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: '40%', background: '#db2777', borderRadius: '2px' }} />
                    </div>
                  </div>
                </>
              )}

              {/* Action Button */}
              <button 
                onClick={() => {
                   if (!isSubscribed) {
                     openUpgradeDialog('Smart Generation and Smart Checking are premium features. Please upgrade your account to use them.')
                   } else {
                     showToast({ message: 'جاري العمل... هذه الميزة تحت التطوير حالياً لمشتركي PRO!', type: 'info' })
                   }
                }}
                style={{
                  width: '100%', padding: '1rem', borderRadius: '12px', border: 'none',
                  background: 'linear-gradient(135deg, #7c3aed, #db2777)', color: '#fff',
                  fontSize: '1rem', fontWeight: 800, cursor: 'pointer', transition: 'all 0.2s',
                  boxShadow: '0 4px 15px rgba(124, 58, 237, 0.4)'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(124, 58, 237, 0.5)' }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(124, 58, 237, 0.4)' }}
              >
                {aiAction === 'generate' ? '🚀 ابدأ التوليد' : '🛡️ ابدأ التدقيق'}
              </button>

              {/* Subscription Lock Overlay (if not subscribed) */}
              {!isSubscribed && (
                <div style={{
                  position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                  background: 'rgba(23, 23, 23, 0.65)', backdropFilter: 'blur(3px)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  padding: '1.5rem', textAlign: 'center', zIndex: 10
                }}>
                  <div style={{ 
                    background: '#fbbf24', color: '#000', padding: '0.4rem 0.8rem', 
                    borderRadius: '20px', fontWeight: 900, fontSize: '0.75rem', 
                    marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.4rem'
                  }}>
                    <span>🔒 PREMIUM ONLY</span>
                  </div>
                  <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem', color: '#fff' }}>تتطلب ترقية الحساب</h3>
                  <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
                    استخدم قوة الذكاء الاصطناعي لتوفير ساعات من العمل. اشترك في الباقة الاحترافية للوصول.
                  </p>
                  <button 
                    onClick={() => navigate('/billing')}
                    style={{ background: '#fff', color: '#000', border: 'none', padding: '0.7rem 1.4rem', borderRadius: '10px', fontWeight: 700, cursor: 'pointer' }}
                  >
                    🚀 ترقية الآن
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </>
  )
}
