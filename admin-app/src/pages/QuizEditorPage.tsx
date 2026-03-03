import { useEffect, useMemo, useRef, useState } from 'react'
import { GoogleGenerativeAI } from "@google/generative-ai"
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../lib/firebase'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
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
import { ImageCropDialog } from '../components/ImageCropDialog'
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

// ── AI Generating Overlay ──────────────────────────────────────────────────
const AI_MESSAGES = [
  'أفكّر في أسئلة رائعة لك… 🧠',
  'أبحث في قاعدة معرفتي… 📚',
  'أصنع تحدياً لا يُقاوَم… 🎯',
  'أختار أصعب الأسئلة… 😈',
  'أتأكد من الإجابات الصحيحة… ✅',
  'أرتّب الأسئلة بعناية… 🎲',
  'شارف على الانتهاء… ✨',
]

function AiGeneratingOverlay({ mode }: { mode: 'generate' | 'recheck' }) {
  const [msgIdx, setMsgIdx] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setMsgIdx(i => (i + 1) % AI_MESSAGES.length), 2800)
    return () => clearInterval(id)
  }, [])
  const isRecheck = mode === 'recheck'
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99000,
      background: 'rgba(2,6,23,0.82)',
      backdropFilter: 'blur(14px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn 0.3s ease-out',
    }}>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: '1.6rem', padding: '2.5rem 2rem',
        background: 'linear-gradient(145deg, rgba(124,58,237,0.18), rgba(219,39,119,0.12))',
        border: '1px solid rgba(124,58,237,0.35)',
        borderRadius: '28px',
        boxShadow: '0 0 60px rgba(124,58,237,0.25), 0 20px 50px rgba(0,0,0,0.5)',
        minWidth: '260px', maxWidth: '88vw',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* shimmer top bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
          background: 'linear-gradient(90deg, transparent, #7c3aed, #db2777, #a78bfa, transparent)',
          backgroundSize: '200% auto',
          animation: 'aiShimmer 1.8s linear infinite',
        }} />

        {/* Orbiting particles + brain */}
        <div style={{ position: 'relative', width: '110px', height: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {/* Pulse ring */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: '2px solid rgba(124,58,237,0.5)',
            animation: 'aiPulseRing 1.8s ease-out infinite',
          }} />
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: '2px solid rgba(219,39,119,0.4)',
            animation: 'aiPulseRing 1.8s ease-out infinite 0.6s',
          }} />

          {/* Orbit dots */}
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'spin 3s linear infinite' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#7c3aed', boxShadow: '0 0 10px #7c3aed', animation: 'aiOrbit 3s linear infinite' }} />
          </div>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'spin 3s linear infinite' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#db2777', boxShadow: '0 0 8px #db2777', animation: 'aiOrbit2 3s linear infinite' }} />
          </div>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'spin 3s linear infinite' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#a78bfa', boxShadow: '0 0 7px #a78bfa', animation: 'aiOrbit3 3s linear infinite' }} />
          </div>

          {/* Brain emoji */}
          <span style={{ fontSize: '3rem', animation: 'aiBrain 2s ease-in-out infinite', display: 'block', lineHeight: 1, userSelect: 'none' }}>
            {isRecheck ? '🔍' : '🧠'}
          </span>
        </div>

        {/* Floating emojis */}
        {['✨','⭐','💡','🎯','🌟'].map((em, i) => (
          <span key={i} style={{
            position: 'absolute',
            left: `${12 + i * 17}%`,
            bottom: '18%',
            fontSize: '1.1rem',
            animation: `aiFloat${(i % 3) + 1} ${2.2 + i * 0.4}s ease-in-out infinite ${i * 0.5}s`,
            pointerEvents: 'none', userSelect: 'none',
          }}>{em}</span>
        ))}

        {/* Title */}
        <div style={{ textAlign: 'center', direction: 'rtl' }}>
          <div style={{
            fontSize: '1.15rem', fontWeight: 800, color: '#fff',
            background: 'linear-gradient(135deg, #a78bfa, #f472b6)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            marginBottom: '0.35rem',
          }}>
            {isRecheck ? 'جاري التدقيق الذكي…' : 'جاري توليد الأسئلة…'}
          </div>

          {/* Cycling message */}
          <div key={msgIdx} style={{
            fontSize: '0.88rem', color: '#fff',
            animation: 'aiMsgFade 2.8s ease-in-out forwards',
            minHeight: '1.4em',
          }}>
            {isRecheck ? '🔎 أراجع كل سؤال بدقة…' : AI_MESSAGES[msgIdx]}
          </div>
        </div>

        {/* Bouncing dots */}
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {[0, 1, 2].map(i => (
            <span key={i} style={{
              width: '10px', height: '10px', borderRadius: '50%',
              background: i === 1 ? '#db2777' : '#7c3aed',
              display: 'inline-block',
              animation: `aiDot 1.2s ease-in-out infinite ${i * 0.2}s`,
            }} />
          ))}
        </div>

        {/* Progress bar */}
        <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            background: 'linear-gradient(90deg, #7c3aed, #db2777, #a78bfa)',
            backgroundSize: '200% auto',
            animation: 'aiShimmer 1.5s linear infinite',
            borderRadius: '2px',
            width: '60%',
          }} />
        </div>
      </div>
    </div>
  )
}

export function QuizEditorPage() {
  const { id: routeId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { show: showDialog, hide: hideDialog } = useDialog()
  const { showToast } = useToast()
  const { isSubscribed } = useSubscription()
  // Always points to the latest saveQuiz closure so setTimeout callbacks never use stale state
  const saveQuizRef = useRef<() => Promise<void>>(() => Promise.resolve())

  const [quizId, setQuizId] = useState<string | null>(routeId ?? null)
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'private'>('public')
  const [gameModeId, setGameModeId] = useState<string>('')
  const [miniGameConfig, setMiniGameConfig] = useState<Record<string, unknown>>({})
  const [challengePreset, setChallengePreset] = useState<ChallengePreset>('classic')
  const [enableScholarRole, setEnableScholarRole] = useState(false)
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [showMetadataDialog, setShowMetadataDialog] = useState(false)
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
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
  const [showCropDialog, setShowCropDialog] = useState(false)
  const [uploadingMiniGameImage, setUploadingMiniGameImage] = useState(false)
  const [puzzleCropTarget, setPuzzleCropTarget] = useState<{ kind: 'default' } | { kind: 'block'; questionIndex: number }>({ kind: 'default' })
  const [showContentTypePicker, setShowContentTypePicker] = useState(false)
  const [contentType, setContentType] = useState<'quiz' | 'mini-game' | 'mix'>('quiz')
  const [showAddBlockPicker, setShowAddBlockPicker] = useState(false)

  // AI Feature States
  const [aiAction, setAiAction] = useState<'generate' | 'recheck' | null>(null)
  const [aiConflictData, setAiConflictData] = useState<{ questions: QuizQuestion[]; count: number } | null>(null)
  const [selectedAiIndices, setSelectedAiIndices] = useState<number[]>([])
  const [aiSuggestedTitle, setAiSuggestedTitle] = useState<string>('')
  const [aiQuestionCount, setAiQuestionCount] = useState(10)
  const [showAiSelectionOverlay, setShowAiSelectionOverlay] = useState(false)
  const [showToolbarDropdown, setShowToolbarDropdown] = useState(false)

  const [aiPrompt, setAiPrompt] = useState('')
  const [aiContextFiles, setAiContextFiles] = useState<{ name: string; type: string; data: string }[]>([])
  const [isUploadingAiFile, setIsUploadingAiFile] = useState(false)
  const [isGeneratingAi, setIsGeneratingAi] = useState(false)
  const [aiGeneratingMode, setAiGeneratingMode] = useState<'generate' | 'recheck'>('generate')
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

  const openMiniGamePuzzleCropPicker = (target: { kind: 'default' } | { kind: 'block'; questionIndex: number }) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = (event) => {
      const file = (event.target as HTMLInputElement).files?.[0]
      if (!file) return

      setPuzzleCropTarget(target)
      const localUrl = URL.createObjectURL(file)
      setCropImageSrc(localUrl)
      setShowCropDialog(true)
    }
    input.click()
  }

  const closeCropDialog = () => {
    if (cropImageSrc?.startsWith('blob:')) {
      URL.revokeObjectURL(cropImageSrc)
    }
    setCropImageSrc(null)
    setShowCropDialog(false)
  }

  const pickMiniGamePuzzleImage = () => {
    openMiniGamePuzzleCropPicker({ kind: 'default' })
  }

  const handleMiniGamePuzzleCropConfirm = async (blob: Blob) => {
    setUploadingMiniGameImage(true)
    try {
      showToast({ message: '⏳ جاري رفع صورة البازل...', type: 'info' })
      const path = puzzleCropTarget.kind === 'block'
        ? `mini-games/match-plus-arena/blocks/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
        : `mini-games/match-plus-arena/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
      const storageRef = ref(storage, path)
      await uploadBytes(storageRef, blob, { contentType: 'image/jpeg' })
      const url = await getDownloadURL(storageRef)

      if (puzzleCropTarget.kind === 'block') {
        const targetQuestion = questions[puzzleCropTarget.questionIndex]
        if (targetQuestion) {
          const currentCfg = (targetQuestion.miniGameBlockConfig || {}) as Record<string, unknown>
          updateQuestion(puzzleCropTarget.questionIndex, {
            miniGameBlockConfig: {
              ...currentCfg,
              puzzleImage: url,
            },
          })
        }
      } else {
        updateMiniGameConfig({ defaultPuzzleImage: url })
      }

      showToast({ message: '✅ تم رفع صورة البازل المربعة بنجاح', type: 'success' })
      closeCropDialog()
    } catch (error) {
      console.error('Mini game puzzle image upload failed', error)
      showToast({ message: '❌ فشل رفع صورة البازل', type: 'error' })
    } finally {
      setUploadingMiniGameImage(false)
    }
  }

  const [loading, setLoading] = useState(!!routeId)
  const isMiniGameContent = location.pathname.startsWith('/mini-game-editor')

  const ownerId = auth.currentUser?.uid ?? ''

  const fallbackQuestionType = enabledQuestionTypeIds[0] ?? 'single'
  const requiresSubscription = questions.some((question) => questionTypeAccessByType[question.type] === 'premium')
  const miniGameBlocksCount = useMemo(
    () => questions.filter((question) => Boolean((question as { miniGameBlockId?: string }).miniGameBlockId)).length,
    [questions],
  )
  const totalQuizItemsCount = questions.length
  const pureQuestionsCount = Math.max(0, totalQuizItemsCount - miniGameBlocksCount)
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

  const openMetadataDialog = () => {
    setTempTitle(title)
    setTempSlug(ensureScopedSlug(slug, ownerId))
    setTempVisibility(visibility)
    setTempGameModeId(isMiniGameContent ? gameModeId : '')
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

  const handleConflictResolve = (mode: 'append' | 'replace' | 'new') => {
    if (mode === 'replace') {
      showDialog({
        title: 'تأكيد الاستبدال',
        message: 'سيتم حذف جميع الأسئلة الحالية واستبدالها بالأسئلة المُحددة من الذكاء الاصطناعي. هل تريد المتابعة؟',
        confirmText: 'نعم، استبدال',
        cancelText: 'إلغاء',
        onConfirm: () => {
          handleAiExecute(mode)
          setShowAiSelectionOverlay(false)
        },
      })
      return
    }

    handleAiExecute(mode);
    setShowAiSelectionOverlay(false);
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
      setVisibility(tempVisibility)
      setGameModeId(isMiniGameContent ? tempGameModeId : '')
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
      const defaultTitle = isMiniGameContent ? 'New Mini Game' : 'New Quiz'
      const defaultSlug = ensureScopedSlug(isMiniGameContent ? 'new-mini-game' : 'new-quiz', ownerId)
      setTitle(defaultTitle)
      setSlug(defaultSlug)
      setGameModeId('')
      setMiniGameConfig({})
      setTempTitle(defaultTitle)
      setTempSlug(defaultSlug)
      setTempGameModeId('')
      setCollapsedQuestions([])
      // If navigated here with skipPicker flag (e.g. after picker redirected to /mini-game-editor)
      const navState = location.state as Record<string, unknown> | null
      if (navState?.skipPicker) {
        if (navState.contentType) setContentType(navState.contentType as 'quiz' | 'mini-game' | 'mix')
      }
      return
    }
    getQuizById(routeId)
      .then((data) => {
        if (!data) { showStatus({ kind: 'error', msg: 'لم يُعثر على الاختبار.' }); return }
        // Auto-redirect: if this quiz has a gameModeId but we're on /editor/:id, switch to /mini-game-editor/:id
        if (!isMiniGameContent && data.gameModeId) {
          navigate(`/mini-game-editor/${routeId}`, { replace: true })
          return
        }
        setTitle(data.title)
        setSlug(data.slug)
        setVisibility(data.visibility)
        setGameModeId(isMiniGameContent ? (data.gameModeId ?? '') : '')
        setMiniGameConfig((data.miniGameConfig && typeof data.miniGameConfig === 'object') ? data.miniGameConfig as Record<string, unknown> : {})
        setChallengePreset(data.challengePreset || 'classic')
        setEnableScholarRole(data.enableScholarRole ?? false)
        setRandomizeQuestions(data.randomizeQuestions ?? false)
        setCoverImage(data.coverImage ?? '')
        const rawQuestions = data.questions ?? []
        const normalizedQuestions = sanitizeQuestions(rawQuestions)
        const deprecatedCount = rawQuestions.filter((question) => normalizeQuestionType((question as { type?: unknown }).type) !== question.type).length
        setContentType((data.contentType as 'quiz' | 'mini-game' | 'mix') || (isMiniGameContent ? 'mini-game' : 'quiz'))
        setQuestions(isMiniGameContent ? [] : normalizedQuestions)
        setCollapsedQuestions(Array(isMiniGameContent ? 0 : normalizedQuestions.length).fill(false))
        if (deprecatedCount > 0) {
          showToast({ message: `تم تحويل ${deprecatedCount} سؤال من نوع قديم إلى "اختيار واحد" تلقائيًا.`, type: 'info' })
        }
        setHasUnsavedChanges(false)
      })
      .catch((err) => showStatus({ kind: 'error', msg: `فشل التحميل: ${err.message}` }))
      .finally(() => setLoading(false))
  }, [routeId, ownerId, isMiniGameContent])

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
    : undefined

  const updateMiniGameConfig = (patch: Record<string, unknown>) => {
    setHasUnsavedChanges(true)
    setMiniGameConfig((prev) => ({ ...prev, ...patch }))
  }

  useEffect(() => {
    if (!isMiniGameContent && gameModeId) {
      setGameModeId('')
    }
  }, [isMiniGameContent, gameModeId])

  const replaceQuestion = (index: number, next: QuizQuestion) => {
    setHasUnsavedChanges(true)
    setQuestions((prev) => prev.map((q, i) => (i === index ? next : q)))
  }

  const updateQuestion = (index: number, patch: Partial<QuizQuestion>) => {
    setHasUnsavedChanges(true)
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)))
  }

  const handleContentTypeSelect = (type: 'quiz' | 'mini-game' | 'mix') => {
    setShowContentTypePicker(false)
    if (type === 'mini-game' && !isMiniGameContent) {
      navigate('/mini-game-editor', { state: { skipPicker: true } })
      return
    }
    if (type === 'quiz' && isMiniGameContent) {
      navigate('/editor', { state: { skipPicker: true } })
      return
    }
    setContentType(type)
    // Metadata dialog already shows on initial load; don't re-open it when
    // the user switches type from the toolbar picker button.
  }

  const addMiniGameBlock = (gameId: string) => {
    setHasUnsavedChanges(true)
    setQuestions((prev) => [...prev, {
      type: 'single',
      text: '',
      duration: 60,
      miniGameBlockId: gameId,
      miniGameBlockConfig: {},
    }])
    setCollapsedQuestions((prev) => [...prev, false])
    setShowAddBlockPicker(false)
  }

  const addQuestion = (type?: QuestionType) => {
    setHasUnsavedChanges(true)
    const baseQuestion = gameModeId === 'creator-studio'
      ? { ...creatorStudioStarterQuestion }
      : (gameModeId === 'match-plus-arena' 
        ? { ...starterQuestion, type: 'match_plus' as QuestionType, matchPlusMode: 'image-puzzle' as const } 
        : { ...starterQuestion })
    
    const nextQuestion = type ? { ...baseQuestion, type } : baseQuestion
    
    setQuestions((prev) => [...prev, nextQuestion])
    setCollapsedQuestions((prev) => [...prev, false])
  }

  const showAddQuestionDialog = (initialTab: 'questions' | 'minigames' = 'questions') => {
    const miniGames = Object.values(MINI_GAME_DEFINITIONS)
    
    showDialog({
      title: 'إضافة محتوى جديد',
      message: (
        <div style={{ marginTop: '1rem' }}>
          {/* Tabs Header */}
          <div style={{ 
            display: 'flex', 
            background: 'var(--bg-deep)', 
            borderRadius: '12px', 
            padding: '4px', 
            marginBottom: '1.2rem',
            border: '1px solid var(--border-strong)'
          }}>
            <button
              id="tab-btn-questions"
              onClick={(e) => {
                document.getElementById('content-questions')!.style.display = 'grid'
                document.getElementById('content-minigames')!.style.display = 'none'
                e.currentTarget.style.background = 'var(--accent)'
                e.currentTarget.style.color = '#fff'
                document.getElementById('tab-btn-minigames')!.style.background = 'transparent'
                document.getElementById('tab-btn-minigames')!.style.color = 'var(--text-mid)'
              }}
              style={{
                flex: 1,
                padding: '0.6rem',
                borderRadius: '8px',
                border: 'none',
                background: initialTab === 'questions' ? 'var(--accent)' : 'transparent',
                color: initialTab === 'questions' ? '#fff' : 'var(--text-mid)',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              ❓ أسئلة
            </button>
            <button
              id="tab-btn-minigames"
              onClick={(e) => {
                document.getElementById('content-questions')!.style.display = 'none'
                document.getElementById('content-minigames')!.style.display = 'grid'
                e.currentTarget.style.background = 'var(--accent)'
                e.currentTarget.style.color = '#fff'
                document.getElementById('tab-btn-questions')!.style.background = 'transparent'
                document.getElementById('tab-btn-questions')!.style.color = 'var(--text-mid)'
              }}
              style={{
                flex: 1,
                padding: '0.6rem',
                borderRadius: '8px',
                border: 'none',
                background: initialTab === 'minigames' ? 'var(--accent)' : 'transparent',
                color: initialTab === 'minigames' ? '#fff' : 'var(--text-mid)',
                fontWeight: 700,
                fontSize: '0.9rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              🎮 ميني جيم
            </button>
          </div>

          {/* Questions Tab Content */}
          <div id="content-questions" style={{ 
            display: initialTab === 'questions' ? 'grid' : 'none', 
            gridTemplateColumns: '1fr', 
            gap: '0.6rem', 
            maxHeight: '50vh', 
            overflowY: 'auto', 
            padding: '0.2rem' 
          }}>
            {questionTypeOptions.map((opt, i) => (
              <button
                key={i}
                onClick={() => {
                  const nextType = opt.value as QuestionType
                  if (isPremiumQuestionType(nextType) && !isSubscribed) {
                    openUpgradeDialog('This question type is premium. Please upgrade your account to use it.')
                    return
                  }
                  addQuestion(nextType)
                  hideDialog()
                }}
                style={{
                  padding: '1rem',
                  background: 'var(--bg-deep)',
                  color: 'var(--text)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: '12px',
                  textAlign: 'right',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer'
                }}
              >
                <span>{opt.label}</span>
                <span style={{ fontSize: '1.2rem' }}>➕</span>
              </button>
            ))}
          </div>

          {/* Mini-Games Tab Content */}
          <div id="content-minigames" style={{ 
            display: initialTab === 'minigames' ? 'grid' : 'none', 
            gridTemplateColumns: '1fr', 
            gap: '0.6rem', 
            maxHeight: '50vh', 
            overflowY: 'auto', 
            padding: '0.2rem' 
          }}>
            {miniGames.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  addMiniGameBlock(m.id)
                  hideDialog()
                }}
                style={{
                  padding: '1rem',
                  background: 'var(--bg-deep)',
                  color: 'var(--text)',
                  border: '1px solid var(--border-strong)',
                  borderRadius: '12px',
                  textAlign: 'right',
                  fontWeight: 600,
                  fontSize: '0.95rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                  <span style={{ fontSize: '1.4rem' }}>{m.icon}</span>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700 }}>{m.defaultArabicName}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>{m.description}</div>
                  </div>
                </div>
                <span style={{ fontSize: '1.2rem' }}>➕</span>
              </button>
            ))}
          </div>
        </div>
      ),
      confirmText: 'إغلاق',
      onConfirm: () => hideDialog()
    })
  }

  const handleAiExecute = async (mode: 'append' | 'replace' | 'new') => {
    if (!aiConflictData) return;
    const selectedQuestions = aiConflictData.questions.filter((_, i) => selectedAiIndices.includes(i));
    if (selectedQuestions.length === 0) {
      showToast({ message: '⚠️ يرجى اختيار سؤال واحد على الأقل', type: 'error' });
      return;
    }

    const titleToApply = aiSuggestedTitle.trim();

    if (mode === 'new') {
      setQuestions(selectedQuestions);
      setQuizId(null);
      const newTitle = titleToApply || `${tempTitle} (Generated)`;
      setTitle(newTitle);
      setSlug(ensureScopedSlug(titleToSlug(newTitle) || 'quiz', ownerId || ''));
      setCollapsedQuestions(Array(selectedQuestions.length).fill(false));
      setAiConflictData(null);
      setShowMetadataDialog(true);
    } else if (mode === 'replace') {
      setQuestions(selectedQuestions);
      setCollapsedQuestions(Array(selectedQuestions.length).fill(false));
      if (titleToApply) setTitle(titleToApply);
      setAiConflictData(null);
      setShowMetadataDialog(false);
    } else {
      setQuestions(prev => [...prev, ...selectedQuestions]);
      setCollapsedQuestions(prev => [...prev, ...Array(selectedQuestions.length).fill(false)]);
      if (titleToApply) setTitle(titleToApply);
      setAiConflictData(null);
      setShowMetadataDialog(false);
    }
    setAiSuggestedTitle('');
    setHasUnsavedChanges(true);
    showToast({ message: `✅ تم إضافة ${selectedQuestions.length} سؤال بنجاح`, type: 'success' });
  }

  const handleGenerateAI = async () => {
    if (!aiPrompt.trim() && aiContextFiles.length === 0) {
      showToast({ message: '⚠️ يرجى كتابة وصف للاختبار أو تحميل ملف', type: 'error' });
      return;
    }
    setAiSuggestedTitle('');
    setAiGeneratingMode(aiAction ?? 'generate');
    setIsGeneratingAi(true);

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error('Gemini API Key is missing');

      const genAI = new GoogleGenerativeAI(apiKey);
      const modelCandidates = ['gemini-2.5-flash', 'gemini-flash-latest', 'gemini-2.0-flash'];

      const MAX_QUESTION_TEXT_LENGTH = 120;
      const MAX_OPTION_TEXT_LENGTH = 48;

      const clampText = (value: unknown, maxLength: number) => {
        const normalized = String(value ?? '').replace(/\s+/g, ' ').trim();
        if (normalized.length <= maxLength) return normalized;
        return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
      };

      const normalizeAiQuestions = (items: unknown[]): QuizQuestion[] => {
        return items.map((raw): QuizQuestion => {
          const source = (raw ?? {}) as Record<string, unknown>;
          const rawType = String(source.type ?? 'single').toLowerCase();
          const normalizedType: QuizQuestion['type'] = rawType === 'multiple' || rawType === 'multi' ? 'multi' : 'single';

          let options = Array.isArray(source.options)
            ? source.options.map((option) => clampText(option, MAX_OPTION_TEXT_LENGTH)).filter(Boolean)
            : [];

          if (rawType === 'boolean') {
            options = ['صح', 'خطأ'];
          }

          if (options.length < 2) {
            options = ['الخيار الأول', 'الخيار الثاني'];
          }

          if (options.length > 4) {
            options = options.slice(0, 4);
          }

          const rawCorrectAnswer = clampText(source.correctAnswer, MAX_OPTION_TEXT_LENGTH);
          let correctIndex = options.findIndex((option) => option === rawCorrectAnswer);
          if (correctIndex < 0) correctIndex = 0;

          return {
            type: normalizedType,
            text: clampText(source.text, MAX_QUESTION_TEXT_LENGTH),
            options,
            correctIndex,
            duration: Number(source.duration) > 0 ? Number(source.duration) : 20,
          };
        });
      };

      const promptText = `Generate a quiz with ${aiQuestionCount} questions based on the provided content. 
      Topic/Context: "${aiPrompt}".
      Return ONLY a JSON object (no markdown tags, no backticks, just raw JSON) with this structure:
      {
        "title": "a concise quiz title in Arabic (max 50 characters)",
        "questions": [
          {
            "type": "single" | "multiple" | "boolean",
            "text": "question text in Arabic",
            "options": ["option1", "option2", "option3", "option4"],
            "correctAnswer": "the exact string of the correct option",
            "duration": 20
          }
        ]
      }
      Important: Use Arabic for all text including the title. For boolean questions, options must be ["صح", "خطأ"].
      Keep content concise for mobile gameplay UI:
      - Max question text length: ${MAX_QUESTION_TEXT_LENGTH} characters
      - Max option text length: ${MAX_OPTION_TEXT_LENGTH} characters`;

      const userMessage: any = {
        role: "user",
        parts: [{ text: promptText }]
      };

      // Add files to the prompt
      for (const file of aiContextFiles) {
        userMessage.parts.push({
          inlineData: {
            data: file.data,
            mimeType: file.type
          }
        });
      }

      let generatedQuestions: any[] | null = null;
      let lastError: unknown = null;

      for (const modelName of modelCandidates) {
        try {
          const model = genAI.getGenerativeModel({ model: modelName });
          const result = await model.generateContent({
            contents: [userMessage],
            generationConfig: {
              responseMimeType: "application/json"
            }
          });

          const response = await result.response;
          let text = response.text();
          text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

          let parsed: any = null;
          try {
            parsed = JSON.parse(text);
          } catch {
            const firstBracket = text.indexOf('[');
            const lastBracket = text.lastIndexOf(']');
            if (firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket) {
              parsed = JSON.parse(text.slice(firstBracket, lastBracket + 1));
            }
          }

          if (Array.isArray(parsed)) {
            generatedQuestions = parsed;
            break;
          }
          if (parsed && Array.isArray(parsed.questions)) {
            generatedQuestions = parsed.questions;
            if (parsed.title && typeof parsed.title === 'string') {
              setAiSuggestedTitle(parsed.title.trim().slice(0, 60));
            }
            break;
          }

          throw new Error('AI response is not a valid questions array');
        } catch (err) {
          lastError = err;
        }
      }

      if (!generatedQuestions || generatedQuestions.length === 0) {
        throw lastError || new Error('No questions generated');
      }

      const normalizedGeneratedQuestions = normalizeAiQuestions(generatedQuestions);
      setAiConflictData({ questions: normalizedGeneratedQuestions, count: normalizedGeneratedQuestions.length });
      setSelectedAiIndices(normalizedGeneratedQuestions.map((_, i) => i));
      setAiAction(null);
      setShowAiSelectionOverlay(true);
      showToast({ message: `✅ تم توليد ${normalizedGeneratedQuestions.length} سؤال`, type: 'success' });
    } catch (error) {
      console.error('AI Generation failed:', error);
      const message = error instanceof Error ? error.message : 'فشل إنشاء الأسئلة بالذكاء الاصطناعي';
      showToast({ message: `❌ ${message}`, type: 'error' });
    } finally {
      setIsGeneratingAi(false);
    }
  }

  const handleAiFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isGeneratingAi) {
      showToast({ message: '⏳ لا يمكن تعديل الملفات أثناء التوليد', type: 'info' });
      return;
    }
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploadingAiFile(true);
    try {
      const currentFiles = [...aiContextFiles];
      const newlyProcessedFiles: { name: string; type: string; data: string }[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Check if file already exists in either the current list OR the ones we just processed in this batch
        const isDuplicate = currentFiles.some(f => f.name === file.name) || 
                           newlyProcessedFiles.some(f => f.name === file.name);

        if (isDuplicate) {
          showToast({ message: `الملف "${file.name}" موجود بالفعل`, type: 'info' });
          continue;
        }

        if (file.size > 10 * 1024 * 1024) {
          showToast({ message: `الملف ${file.name} كبير جداً (>10MB)`, type: 'error' });
          continue;
        }

        const base64Data = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            resolve(base64);
          };
          reader.readAsDataURL(file);
        });

        newlyProcessedFiles.push({
          name: file.name,
          type: file.type,
          data: base64Data
        });
      }

      setAiContextFiles([...currentFiles, ...newlyProcessedFiles]);
      if (newlyProcessedFiles.length > 0) {
        showToast({ message: '✅ تم تحميل الملفات بنجاح', type: 'info' });
      }
    } catch (err) {
      console.error('File upload failed:', err);
      showToast({ message: '❌ فشل تحميل الملفات', type: 'error' });
    } finally {
      setIsUploadingAiFile(false);
    }
  };

  const removeAiFile = (index: number) => {
    if (isGeneratingAi) {
      showToast({ message: '⏳ لا يمكن حذف الملفات أثناء التوليد', type: 'info' });
      return;
    }
    setAiContextFiles(prev => prev.filter((_, i) => i !== index));
  };

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
      showToast({ message: 'Add at least one question before saving.', type: 'info' })
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
    // DEBUG: trace miniGameConfig save
    console.log('[SAVE DEBUG]', {
      isMiniGameContent,
      gameModeId,
      miniGameConfig,
      willIncludeGameMode: (isMiniGameContent || !!gameModeId),
      quizId,
    })
    const payload: QuizDoc = {
      ownerId,
      title,
      slug,
      visibility,
      contentType: isMiniGameContent ? 'mini-game' : contentType,
      priceTier: requiresSubscription ? 'starter' : 'free',
      gameModeId: (isMiniGameContent || !!gameModeId) ? (gameModeId || undefined) : undefined,
      miniGameConfig: (isMiniGameContent || !!gameModeId) ? miniGameConfig : undefined,
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
        if (payload.gameModeId && payload.miniGameConfig) {
          const dur = (payload.miniGameConfig as Record<string, unknown>).gameDurationSec
          showToast({ message: `✅ Saved: ${payload.gameModeId} | duration=${dur}s`, type: 'success' })
          // Post-save verification: read back from Firestore
          try {
            const readBack = await getQuizById(quizId)
            const savedCfg = readBack?.miniGameConfig as Record<string, unknown> | undefined
            console.log('[POST-SAVE VERIFY]', {
              docId: quizId,
              gameModeIdInFirestore: readBack?.gameModeId,
              miniGameConfigInFirestore: savedCfg,
              gameDurationSecInFirestore: savedCfg?.gameDurationSec,
            })
            if (!savedCfg || !savedCfg.gameDurationSec) {
              showToast({ message: '⚠️ WARNING: miniGameConfig NOT found in Firestore after save!', type: 'error' })
            }
          } catch { /* ignore read-back errors */ }
        } else {
          showToast({ message: 'تم تحديث الاختبار بنجاح', type: 'success' })
        }
      } else {
        const id = await createQuiz(payload)
        void incrementPlatformStat('quizCreated')
        setQuizId(id)
        setHasUnsavedChanges(false)
        showStatus({ kind: 'idle' })
        if (payload.gameModeId && payload.miniGameConfig) {
          const dur = (payload.miniGameConfig as Record<string, unknown>).gameDurationSec
          showToast({ message: `✅ Created: ${payload.gameModeId} | duration=${dur}s`, type: 'success' })
        } else {
          showToast({ message: 'تم حفظ الاختبار بنجاح', type: 'success' })
        }
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
      gameModeId: isMiniGameContent ? (gameModeId || undefined) : undefined,
      miniGameConfig: (isMiniGameContent && miniGameConfig && Object.keys(miniGameConfig).length > 0)
        ? miniGameConfig as Record<string, unknown>
        : undefined,
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
      {/* Content Type Picker */}
      {showContentTypePicker && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 2000,
          background: 'rgba(2, 6, 23, 0.92)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(12px)',
          animation: 'fadeIn 0.25s ease-out',
          padding: '1.5rem',
        }}>
          <div style={{ width: '100%', maxWidth: '720px' }}>
            <div style={{ textAlign: 'center', marginBottom: '2rem', position: 'relative' }}>
              <button
                type="button"
                onClick={() => setShowContentTypePicker(false)}
                style={{
                  position: 'absolute', top: '-0.5rem', left: 0,
                  background: 'transparent', border: '1px solid var(--border-strong)',
                  color: 'var(--text-mid)', borderRadius: '8px',
                  padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700,
                }}
              >✕ إغلاق</button>
              <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-bright)' }}>
                ماذا تريد أن تنشئ؟
              </h1>
              <p style={{ margin: 0, color: 'var(--text-mid)', fontSize: '0.95rem' }}>
                اختر نوع المحتوى ثم سنكمل الإعدادات معاً
              </p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem' }}>
              {[
                {
                  type: 'quiz' as const,
                  icon: '📋',
                  title: 'اختبار',
                  titleEn: 'Quiz',
                  desc: 'أسئلة متعددة الأنواع: اختيار، ترتيب، تطابق، كتابة والمزيد',
                  accent: '#2563eb',
                  bg: 'rgba(37,99,235,0.12)',
                },
                {
                  type: 'mini-game' as const,
                  icon: '🎮',
                  title: 'ميني جيم',
                  titleEn: 'Mini Game',
                  desc: 'لعبة تفاعلية مستقلة: بازل، XO، تروس، استوديو إبداعي',
                  accent: '#7c3aed',
                  bg: 'rgba(124,58,237,0.12)',
                },
                {
                  type: 'mix' as const,
                  icon: '🔀',
                  title: 'مزيج',
                  titleEn: 'Mixed',
                  desc: 'ادمج أسئلة عادية مع بازل صور أو أنواع إبداعية في نفس الجلسة',
                  accent: '#059669',
                  bg: 'rgba(5,150,105,0.12)',
                },
              ].map((opt) => (
                <div
                  key={opt.type}
                  onClick={() => handleContentTypeSelect(opt.type)}
                  style={{
                    background: 'var(--bg-surface)',
                    border: `2px solid ${opt.accent}44`,
                    borderRadius: '18px',
                    padding: '1.75rem 1.5rem',
                    cursor: 'pointer',
                    transition: 'all 0.22s cubic-bezier(0.4,0,0.2,1)',
                    display: 'flex', flexDirection: 'column', gap: '0.9rem',
                    position: 'relative', overflow: 'hidden',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = opt.accent
                    e.currentTarget.style.background = opt.bg
                    e.currentTarget.style.transform = 'translateY(-4px)'
                    e.currentTarget.style.boxShadow = `0 12px 32px ${opt.accent}33`
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = `${opt.accent}44`
                    e.currentTarget.style.background = 'var(--bg-surface)'
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                >
                  <div style={{
                    width: '52px', height: '52px', borderRadius: '14px',
                    background: opt.bg, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '1.7rem',
                    border: `1px solid ${opt.accent}33`,
                  }}>{opt.icon}</div>
                  <div>
                    <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-bright)', marginBottom: '0.3rem' }}>
                      {opt.title} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)', marginRight: '0.25rem' }}>{opt.titleEn}</span>
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-mid)', lineHeight: 1.5 }}>{opt.desc}</div>
                  </div>
                  <div style={{
                    position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px',
                    background: `linear-gradient(90deg, ${opt.accent}, transparent)`,
                    opacity: 0.6,
                  }} />
                </div>
              ))}
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
              <h2 style={{ marginTop: 0, marginBottom: 0, color: 'var(--text-bright)', fontSize: '1.22rem', fontWeight: 800 }}>
                {isMiniGameContent ? '⚙️ إعدادات اللعبة' : '⚙️ إعدادات الاختبار'}
              </h2>
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

              {/* AI Generation Tools Section */}
              <div style={{
                marginTop: '1rem',
                padding: '1rem',
                background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
                borderRadius: '12px',
                border: '1px solid rgba(124, 58, 237, 0.3)',
              }}>
                <label style={{ fontSize: '0.9em', color: 'var(--text-bright)', display: 'block', marginBottom: '0.8rem', fontWeight: 800 }}>
                  ✨ إنشاء الأسئلة بالذكاء الاصطناعي (Gemini 1.5 Flash)
                </label>
                
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                  {[3, 5, 8, 10, 15].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setAiQuestionCount(num)}
                      style={{
                        padding: '0.4rem 0.8rem',
                        borderRadius: '20px',
                        border: '1px solid ' + (aiQuestionCount === num ? 'var(--text-bright)' : 'var(--border-strong)'),
                        background: aiQuestionCount === num ? 'var(--text-bright)' : 'var(--bg-deep)',
                        color: aiQuestionCount === num ? 'var(--bg-deep)' : 'var(--text-mid)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                      }}
                    >
                      {num} أسئلة
                    </button>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: '0.6rem' }}>
                  <textarea
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    placeholder="اكتب موضوع الاختبار أو معلومات عنه ليقوم الذكاء الاصطناعي بإنشاء الأسئلة..."
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-strong)',
                      background: 'var(--bg-surface)',
                      color: 'var(--text)',
                      fontSize: '0.9rem',
                      minHeight: '80px',
                      resize: 'vertical',
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleGenerateAI}
                    disabled={aiAction === 'generate' || !aiPrompt.trim()}
                    style={{
                      padding: '0 1.2rem',
                      borderRadius: '8px',
                      background: 'var(--text-bright)',
                      color: 'var(--bg-deep)',
                      fontWeight: 800,
                      cursor: aiAction === 'generate' ? 'not-allowed' : 'pointer',
                      opacity: (aiAction === 'generate' || !aiPrompt.trim()) ? 0.6 : 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.4rem',
                    }}
                  >
                    {aiAction === 'generate' ? '⏳ جاري الإنشاء...' : '🚀 إنشاء'}
                  </button>
                </div>
                <p style={{ marginTop: '0.5rem', fontSize: '0.75em', color: 'var(--text-mid)' }}>
                  سيتم تحليل النص المكتوب وتوليد أسئلة اختيار من متعدد في ثوانٍ.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
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

              {isMiniGameContent && (
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
                    : 'اختر ميني جيم'}
                </button>
                <p style={{ marginTop: '0.4rem', fontSize: '0.78em', color: 'var(--text-mid)' }}>
                  يتم اختيار الميني جيم عبر بطاقات (اسم إنجليزي + اسم عربي + أيقونة + شرح).
                </p>
                <div style={{ marginTop: '0.55rem', padding: '0.65rem 0.75rem', borderRadius: '10px', border: '1px solid var(--border-strong)', background: 'var(--bg-deep)' }}>
                  <p style={{ margin: 0, color: 'var(--text)', fontWeight: 700, fontSize: '0.83rem' }}>
                    {selectedGameModeMeta?.icon || '🎮'} {selectedGameModeMeta?.englishName || 'Mini Game'} · {selectedGameModeMeta?.arabicName || 'لعبة مصغّرة'}
                  </p>
                  <p style={{ margin: '0.25rem 0 0', color: 'var(--text-mid)', fontSize: '0.78rem' }}>
                    {selectedGameModeMeta?.description || 'اختر لعبة من القائمة المتاحة.'}
                  </p>
                  <p style={{ margin: '0.28rem 0 0', color: 'var(--text)', fontSize: '0.78rem' }}>
                    <strong>طريقة اللعب:</strong> {selectedGameModeMeta?.howToPlay || 'ستظهر بعد اختيار اللعبة.'}
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
                        {miniGameCards.filter((game) => game.enabled).map((game) => {
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
        background: 'linear-gradient(180deg, var(--bg-surface) 0%, var(--bg-deep) 100%)',
        borderBottom: '1px solid var(--border-strong)',
        marginBottom: isNarrowScreen ? '0' : '1.5rem',
        borderRadius: isNarrowScreen ? '0 0 20px 20px' : '0 0 24px 24px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
        padding: isNarrowScreen ? '1rem 0.8rem' : '2rem 1.5rem',
        marginTop: isNarrowScreen ? '-1rem' : '0',
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', gap: isNarrowScreen ? '1rem' : '1.8rem', alignItems: 'center', flexDirection: isNarrowScreen ? 'column' : 'row' }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
              width: isNarrowScreen ? '100px' : '130px',
              height: isNarrowScreen ? '100px' : '130px',
              borderRadius: '20px',
              overflow: 'hidden',
              border: '3px solid var(--accent)',
              background: 'var(--bg-deep)',
              cursor: 'pointer',
              boxShadow: '0 8px 16px rgba(124,58,237,0.2)',
              transition: 'transform 0.2s',
            }}
            onClick={() => openMetadataDialog()}
            onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)' }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
            >
              <img src={coverImage || placeholderImg} alt="Thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '0.65rem', padding: '4px', textAlign: 'center', fontWeight: 700 }}>
                تغيير الصورة
              </div>
            </div>
            {uploadingCover && (
              <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '20px' }}>
                <span className="save-icon-spinning">🔄</span>
              </div>
            )}
          </div>

          <div style={{ flex: 1, textAlign: isNarrowScreen ? 'center' : 'right', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: isNarrowScreen ? 'center' : 'flex-end', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <input
                dir="auto"
                value={title}
                onChange={(e) => { setTitle(e.target.value); setHasUnsavedChanges(true) }}
                placeholder="عنوان الاختبار..."
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-bright)',
                  fontSize: isNarrowScreen ? '1.5rem' : '2.2rem',
                  fontWeight: 900,
                  width: '100%',
                  textAlign: isNarrowScreen ? 'center' : 'right',
                  outline: 'none',
                  padding: 0,
                }}
              />
              <span
                style={{
                  fontSize: isNarrowScreen ? '0.9rem' : '1.1rem',
                  color: 'var(--text-muted)',
                  opacity: 0.55,
                  flexShrink: 0,
                  pointerEvents: 'none',
                  lineHeight: 1,
                }}
                title="قابل للتعديل"
              >✏️</span>
            </div>
            
            <div
              dir="auto"
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-mid)',
                fontSize: '0.95rem',
                width: '100%',
                textAlign: isNarrowScreen ? 'center' : 'right',
                marginBottom: '1rem',
                minHeight: '1.2em',
                lineHeight: 1.5,
                cursor: 'pointer'
              }}
              onClick={() => openMetadataDialog()}
            >
              📊 {pureQuestionsCount} سؤال {miniGameBlocksCount > 0 ? `• 🎮 ${miniGameBlocksCount} ميني جيم` : ''} • {visibility === 'public' ? '🌐 عام' : '🔒 خاص'}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap', justifyContent: isNarrowScreen ? 'center' : 'flex-end' }}>
              {quizId && (
                <button
                  type="button"
                  onClick={() => void launchGameFromEditor(quizId)}
                  style={{
                    background: 'var(--accent)',
                    color: '#fff',
                    fontSize: isNarrowScreen ? '0.85rem' : '1rem',
                    padding: isNarrowScreen ? '8px 20px' : '10px 24px',
                    borderRadius: '12px',
                    border: 'none',
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(124,58,237,0.3)',
                    transition: 'transform 0.2s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)' }}
                >
                  <span style={{ fontSize: '1.1rem' }}>▶</span> {isNarrowScreen ? 'تشغيل اللعبة' : 'لعب الاختبار الآن'}
                </button>
              )}

              <button
                type="button"
                onClick={() => openMetadataDialog()}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  color: 'var(--text-bright)',
                  fontSize: isNarrowScreen ? '0.8rem' : '0.9rem',
                  padding: isNarrowScreen ? '8px 16px' : '10px 20px',
                  borderRadius: '12px',
                  border: '1px solid var(--border-strong)',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              >
                ⚙️ الإعدادات
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Sticky toolbar ── */}
      {showToolbarDropdown && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 99 }}
          onClick={() => setShowToolbarDropdown(false)}
        />
      )}
      <div style={{
        position: 'sticky', top: isNarrowScreen ? '0' : '0.5rem', zIndex: 100,
        background: 'var(--bg-deep)',
        border: '1px solid var(--border-mid)',
        borderRadius: isNarrowScreen ? '0' : '12px',
        padding: isNarrowScreen ? '0.5rem 0.6rem' : '0.55rem 0.65rem',
        marginBottom: '1rem',
        boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
        margin: isNarrowScreen ? '-0.25rem -1rem 1rem -1rem' : '0 0 1rem 0',
      }}>
        <div style={{ display: 'flex', gap: isNarrowScreen ? '0.3rem' : '0.45rem', alignItems: 'center', flexWrap: 'nowrap' }}>

          {/* Content type badge */}
          {!quizId && (
            <button
              type="button"
              onClick={() => setShowContentTypePicker(true)}
              style={{
                background: 'transparent', border: '1px solid transparent',
                color: contentType === 'mix' ? '#059669' : contentType === 'mini-game' ? '#7c3aed' : 'var(--text-bright)',
                padding: isNarrowScreen ? '0.4rem 0.5rem' : '0.42rem 0.72rem',
                borderRadius: '8px', cursor: 'pointer', transition: 'all 0.16s ease',
                display: 'flex', flexDirection: isNarrowScreen ? 'column' : 'row',
                alignItems: 'center', gap: isNarrowScreen ? '0.15rem' : '0.3rem',
                minWidth: isNarrowScreen ? '48px' : 'auto', flexShrink: 0,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.background = 'var(--bg-surface)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'transparent' }}
              title="تغيير نوع المحتوى"
            >
              <span style={{ fontSize: isNarrowScreen ? '1.3rem' : '0.9rem' }}>{contentType === 'mix' ? '🔀' : contentType === 'mini-game' ? '🎮' : '📋'}</span>
              <span style={{ fontSize: isNarrowScreen ? '0.58rem' : '0.8rem', fontWeight: 700 }}>{contentType === 'mix' ? 'مزيج' : contentType === 'mini-game' ? 'ميني' : 'اختبار'}</span>
            </button>
          )}

          {/* ── Gear dropdown ── */}
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => setShowToolbarDropdown((v) => !v)}
              style={{
                background: showToolbarDropdown ? 'var(--bg-surface)' : 'transparent',
                border: '1px solid ' + (showToolbarDropdown ? 'var(--border-strong)' : 'transparent'),
                color: 'var(--text)',
                padding: isNarrowScreen ? '0.4rem 0.5rem' : '0.42rem 0.72rem',
                borderRadius: '8px', fontWeight: 700,
                cursor: 'pointer', transition: 'all 0.16s ease',
                display: 'flex', flexDirection: isNarrowScreen ? 'column' : 'row',
                alignItems: 'center', gap: isNarrowScreen ? '0.15rem' : '0.3rem',
                minWidth: isNarrowScreen ? '48px' : 'auto',
              }}
              title="المزيد من الخيارات"
            >
              <span style={{ fontSize: isNarrowScreen ? '1.3rem' : '1rem' }}>⚙️</span>
              <span style={{ fontSize: isNarrowScreen ? '0.58rem' : '0.8rem', fontWeight: 700 }}>الإعدادات {isNarrowScreen ? '' : showToolbarDropdown ? '▴' : '▾'}</span>
            </button>

            {/* Dropdown panel */}
            {showToolbarDropdown && (
              <div style={{
                position: 'absolute',
                top: 'calc(100% + 6px)',
                left: 0,
                minWidth: '220px',
                maxWidth: '90vw',
                background: 'var(--bg-deep)',
                border: '1px solid var(--border-strong)',
                borderRadius: '12px',
                boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
                zIndex: 200,
                overflow: 'hidden',
                animation: 'slideUp 0.15s ease-out',
              }}>
                {/* Settings modal item */}
                <button type="button" onClick={() => { openMetadataDialog(); setShowToolbarDropdown(false) }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.75rem 1rem', background: 'transparent', border: 'none', color: 'var(--text)', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700, borderBottom: '1px solid var(--border-strong)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-surface)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >⚙️ <span>إعدادات الاختبار</span></button>

                {/* Divider label */}
                <div style={{ padding: '0.4rem 1rem 0.2rem', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>الأسئلة</div>

                <button type="button"
                  onClick={() => { setCollapsedQuestions(Array(questions.length).fill(true)); setShowToolbarDropdown(false) }}
                  disabled={questions.length === 0}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.65rem 1rem', background: 'transparent', border: 'none', color: questions.length === 0 ? 'var(--text-muted)' : 'var(--text)', cursor: questions.length === 0 ? 'not-allowed' : 'pointer', fontSize: '0.88rem', fontWeight: 600, opacity: questions.length === 0 ? 0.45 : 1 }}
                  onMouseEnter={(e) => { if (questions.length > 0) e.currentTarget.style.background = 'var(--bg-surface)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >▾ <span>طي جميع الأسئلة</span></button>

                <button type="button"
                  onClick={() => { setCollapsedQuestions(Array(questions.length).fill(false)); setShowToolbarDropdown(false) }}
                  disabled={questions.length === 0}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.65rem 1rem', background: 'transparent', border: 'none', color: questions.length === 0 ? 'var(--text-muted)' : 'var(--text)', cursor: questions.length === 0 ? 'not-allowed' : 'pointer', fontSize: '0.88rem', fontWeight: 600, opacity: questions.length === 0 ? 0.45 : 1, borderBottom: '1px solid var(--border-strong)' }}
                  onMouseEnter={(e) => { if (questions.length > 0) e.currentTarget.style.background = 'var(--bg-surface)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >▴ <span>فتح جميع الأسئلة</span></button>

                {/* Divider label */}
                <div style={{ padding: '0.4rem 1rem 0.2rem', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>الرابط</div>

                {quizId && (
                  <button type="button" onClick={() => { void (async () => { await (async () => window.open(`/preview/${quizId}`, '_blank'))(); })(); setShowToolbarDropdown(false) }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.65rem 1rem', background: 'transparent', border: 'none', color: 'var(--text)', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600 }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-surface)' }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                  >👁️ <span>معاينة الاختبار</span></button>
                )}

                <button type="button"
                  onClick={() => { void copyEditorLink(); setShowToolbarDropdown(false) }}
                  disabled={!quizId}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.65rem 1rem', background: 'transparent', border: 'none', color: !quizId ? 'var(--text-muted)' : 'var(--text)', cursor: !quizId ? 'not-allowed' : 'pointer', fontSize: '0.88rem', fontWeight: 600, opacity: !quizId ? 0.45 : 1 }}
                  onMouseEnter={(e) => { if (quizId) e.currentTarget.style.background = 'var(--bg-surface)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >📋 <span>نسخ الرابط</span></button>

                <button type="button"
                  onClick={() => { void shareEditorLink(); setShowToolbarDropdown(false) }}
                  disabled={!quizId}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.65rem 1rem', background: 'transparent', border: 'none', color: !quizId ? 'var(--text-muted)' : 'var(--text)', cursor: !quizId ? 'not-allowed' : 'pointer', fontSize: '0.88rem', fontWeight: 600, opacity: !quizId ? 0.45 : 1 }}
                  onMouseEnter={(e) => { if (quizId) e.currentTarget.style.background = 'var(--bg-surface)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >🔗 <span>مشاركة الرابط</span></button>

                {/* Delete quiz — danger zone */}
                {quizId && (
                  <>
                    <div style={{ height: '1px', background: 'var(--border-strong)', margin: '0.25rem 0' }} />
                    <button type="button"
                      onClick={() => { setShowToolbarDropdown(false); handleDeleteQuiz() }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.75rem 1rem', background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 700 }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(248,113,113,0.1)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                    >🗑️ <span>حذف الاختبار</span></button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Add question */}
          {!isMiniGameContent && (
            <button
              type="button"
              onClick={() => showAddQuestionDialog()}
              style={{
                background: 'var(--text-bright)', border: '1px solid var(--text-bright)', color: '#fff',
                padding: isNarrowScreen ? '0.4rem 0.5rem' : '0.42rem 0.78rem', borderRadius: '8px', fontWeight: 700,
                cursor: 'pointer', transition: 'all 0.16s ease',
                display: 'flex', flexDirection: isNarrowScreen ? 'column' : 'row',
                alignItems: 'center', gap: isNarrowScreen ? '0.15rem' : '0.3rem',
                minWidth: isNarrowScreen ? '48px' : 'auto', flexShrink: 0,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)' }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)' }}
              title="إضافة سؤال جديد"
            >
              <span style={{ fontSize: isNarrowScreen ? '1.3rem' : '0.9rem' }}>➕</span>
              <span style={{ fontSize: isNarrowScreen ? '0.58rem' : '0.8rem', fontWeight: 700 }}>إضافة</span>
            </button>
          )}

          {/* AI Generate */}
          <button
            type="button"
            onClick={() => { setAiAction('generate'); void incrementPlatformStat('aiGenerateClicks') }}
            style={{
              background: 'transparent', border: '1px solid transparent', color: 'var(--text)',
              padding: isNarrowScreen ? '0.4rem 0.5rem' : '0.42rem 0.72rem', borderRadius: '8px', fontWeight: 700,
              cursor: 'pointer', transition: 'all 0.16s ease',
              display: 'flex', flexDirection: isNarrowScreen ? 'column' : 'row',
              alignItems: 'center', gap: isNarrowScreen ? '0.15rem' : '0.3rem',
              minWidth: isNarrowScreen ? '48px' : 'auto', flexShrink: 0,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--text-bright)'; e.currentTarget.style.background = 'rgba(59,130,246,0.1)' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'transparent' }}
            title="توليد ذكي"
          >
            <span style={{ fontSize: isNarrowScreen ? '1.3rem' : '0.9rem' }}>✨</span>
            <span style={{ fontSize: isNarrowScreen ? '0.58rem' : '0.8rem', fontWeight: 700 }}>توليد</span>
          </button>

          {/* AI Recheck */}
          <button
            type="button"
            onClick={() => { setAiAction('recheck'); void incrementPlatformStat('aiRecheckClicks') }}
            style={{
              background: 'transparent', border: '1px solid transparent', color: 'var(--text)',
              padding: isNarrowScreen ? '0.4rem 0.5rem' : '0.42rem 0.72rem', borderRadius: '8px', fontWeight: 700,
              cursor: 'pointer', transition: 'all 0.16s ease',
              display: 'flex', flexDirection: isNarrowScreen ? 'column' : 'row',
              alignItems: 'center', gap: isNarrowScreen ? '0.15rem' : '0.3rem',
              minWidth: isNarrowScreen ? '48px' : 'auto', flexShrink: 0,
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--text-bright)'; e.currentTarget.style.background = 'rgba(59,130,246,0.1)' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'transparent' }}
            title="تدقيق ذكي"
          >
            <span style={{ fontSize: isNarrowScreen ? '1.3rem' : '0.9rem' }}>🛡️</span>
            <span style={{ fontSize: isNarrowScreen ? '0.58rem' : '0.8rem', fontWeight: 700 }}>تدقيق</span>
          </button>

          {/* Spacer */}
          <div style={{ flex: 1 }} />

          {/* Save — pushed to the end */}
          <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
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
                padding: isNarrowScreen ? '0.4rem 0.5rem' : '0.42rem 0.8rem',
                borderRadius: '8px', fontWeight: 700,
                cursor: status.kind === 'saving' ? 'not-allowed' : 'pointer',
                opacity: status.kind === 'saving' ? 0.6 : 1,
                transition: 'all 0.16s ease',
                display: 'flex', flexDirection: isNarrowScreen ? 'column' : 'row',
                alignItems: 'center', gap: isNarrowScreen ? '0.15rem' : '0.3rem',
                minWidth: isNarrowScreen ? '48px' : 'auto',
              }}
              title={hasUnsavedChanges ? 'حفظ التغييرات' : 'لا توجد تغييرات'}
            >
              <span style={{ fontSize: isNarrowScreen ? '1.3rem' : '0.9rem' }}>
                {status.kind === 'saving' ? <span className="save-icon-spinning">🔄</span> : '💾'}
              </span>
              <span style={{ fontSize: isNarrowScreen ? '0.58rem' : '0.8rem', fontWeight: 700 }}>حفظ</span>
            </button>
          </div>{/* end delete+save group */}

        </div>{/* end flex row */}
      </div>{/* end sticky toolbar */}

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
              onClick={() => openMetadataDialog()}
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

              {/* ─── Universal Game Duration Config ─── */}
              {(() => {
                const POLICY_LABELS: Record<string, { type: string; label: string }> = {
                  'match-plus-arena': { type: 'admin', label: 'Total game duration — how long the player has to complete the puzzle' },
                  'puzzle-relay':     { type: 'per-round', label: 'Per-round duration' },
                  'xo-duel':          { type: 'self', label: 'Game session time (game manages its own rounds)' },
                  'gear-machine':     { type: 'self', label: 'Game session time' },
                  'creator-studio':   { type: 'self', label: 'Creation phase duration' },
                }
                const policy = POLICY_LABELS[gameModeId] || { type: 'per-round', label: 'Duration per round (seconds)' }
                const selfManaged = policy.type === 'self'
                return (
                  <div style={{ padding: '0.75rem 0.85rem', borderRadius: '10px', border: '1px solid var(--border-strong)', background: 'var(--bg-surface)', marginBottom: '0.5rem' }}>
                    <div style={{ display: 'grid', gap: '0.65rem', gridTemplateColumns: '1fr 1fr', alignItems: 'end' }}>
                      <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-mid)', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>
                          ⏱ Game Duration (sec)
                        </label>
                        <input
                          type="number"
                          min={1}
                          step={5}
                          value={Number(miniGameConfig.gameDurationSec) || ''}
                          onChange={(e) => updateMiniGameConfig({ gameDurationSec: Number(e.target.value), defaultDuration: Number(e.target.value) })}
                          placeholder="Enter duration in seconds"
                          style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-strong)', background: 'var(--bg-deep)', color: 'var(--text)' }}
                        />
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4, paddingBottom: '0.3rem' }}>
                        <strong>{policy.label}</strong><br />
                        {selfManaged
                          ? 'This game manages its own timer internally.'
                          : 'The exact value you enter here will be used as the game timer. No limits.'
                        }
                      </div>
                    </div>
                  </div>
                )
              })()}

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
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-mid)', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>Game Instruction</label>
                    <input
                      value={String(miniGameConfig.gameInstruction || '')}
                      onChange={(e) => updateMiniGameConfig({ gameInstruction: e.target.value })}
                      placeholder="Arrange the pieces to complete the image"
                      style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-strong)', background: 'var(--bg-surface)', color: 'var(--text)' }}
                    />
                  </div>

                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-mid)', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>Default Puzzle Image URL</label>
                    <input
                      value={String(miniGameConfig.defaultPuzzleImage || '')}
                      onChange={(e) => updateMiniGameConfig({ defaultPuzzleImage: e.target.value })}
                      placeholder="https://..."
                      style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-strong)', background: 'var(--bg-surface)', color: 'var(--text)' }}
                    />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.55rem', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={pickMiniGamePuzzleImage}
                        disabled={uploadingMiniGameImage}
                        style={{
                          border: '1px solid var(--border-strong)',
                          borderRadius: '8px',
                          background: 'var(--bg-surface)',
                          color: 'var(--text)',
                          padding: '0.42rem 0.7rem',
                          cursor: uploadingMiniGameImage ? 'not-allowed' : 'pointer',
                          opacity: uploadingMiniGameImage ? 0.65 : 1,
                          fontWeight: 700,
                          fontSize: '0.78rem',
                        }}
                      >
                        {uploadingMiniGameImage ? '⏳ Uploading...' : '🖼️ Upload & Crop'}
                      </button>
                      <span style={{ color: 'var(--text-mid)', fontSize: '0.76rem' }}>
                        مربع فقط 1:1 — بقية النِسَب غير مسموحة لهذا الجيم.
                      </span>
                    </div>
                    {String(miniGameConfig.defaultPuzzleImage || '').trim() && (
                      <div style={{ marginTop: '0.55rem', width: '120px', aspectRatio: '1 / 1', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border-strong)', background: 'var(--bg-deep)' }}>
                        <img
                          src={String(miniGameConfig.defaultPuzzleImage || '')}
                          alt="Puzzle preview"
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                      </div>
                    )}
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
          // ── Mini-game block card ──
          if (q.miniGameBlockId) {
            const blockMeta = miniGameCards.find((g) => g.id === q.miniGameBlockId)
            const blockCfg = (q.miniGameBlockConfig || {}) as Record<string, unknown>
            const updateBlockCfg = (patch: Record<string, unknown>) =>
              updateQuestion(index, { miniGameBlockConfig: { ...blockCfg, ...patch } })
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
                  border: '1px solid #4b5563',
                  borderLeft: '6px solid #7c3aed',
                  padding: '1.2rem',
                  borderRadius: '14px',
                  marginBottom: '0.75rem',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                  opacity: dragIndex === index ? 0.5 : 1,
                }}
              >
                {/* Block card header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-strong)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
                    <span style={{ fontSize: '1rem', color: 'var(--text-muted)', cursor: 'grab', background: 'var(--bg-surface)', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }} draggable={false}>⠿</span>
                    <span style={{ fontSize: '1.4rem' }}>{blockMeta?.icon || '🎮'}</span>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-bright)' }}>{blockMeta?.arabicName || blockMeta?.englishName || q.miniGameBlockId}</div>
                      <div style={{ fontSize: '0.75rem', color: '#a78bfa', fontWeight: 600 }}>🎮 Mini-Game Block #{index + 1}</div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <button type="button" onClick={() => setCollapsedQuestions((prev) => { const n = [...prev]; n[index] = !n[index]; return n })} style={{ background: 'var(--bg-deep)', border: '1px solid var(--border-strong)', color: 'var(--text-mid)', fontSize: '0.85rem', width: '28px', height: '28px', borderRadius: '6px', cursor: 'pointer' }}>
                      {collapsedQuestions[index] ? '▾' : '▴'}
                    </button>
                    <button type="button" onClick={() => removeQuestion(index)} style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '0.8rem', width: '28px', height: '28px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer' }}>✕</button>
                  </div>
                </div>
                {!collapsedQuestions[index] && (
                  <div style={{ display: 'grid', gap: '0.75rem' }}>
                    {/* Duration */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', alignItems: 'end' }}>
                      <div>
                        <label style={{ fontSize: '0.8rem', color: 'var(--text-mid)', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>⏱ Game Duration (sec)</label>
                        <input type="number" min={10} step={5} value={Number(q.duration || 60)} onChange={(e) => updateQuestion(index, { duration: Number(e.target.value) })} style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-strong)', background: 'var(--bg-deep)', color: 'var(--text)' }} />
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{blockMeta?.description || 'Configure this mini-game block'}</div>
                    </div>
                    {/* match-plus-arena specific config */}
                    {q.miniGameBlockId === 'match-plus-arena' && (
                      <div style={{ display: 'grid', gap: '0.65rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                        <div>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-mid)', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>Match Mode</label>
                          <select value={String(blockCfg.matchMode || 'image-puzzle')} onChange={(e) => updateBlockCfg({ matchMode: e.target.value })} style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-strong)', background: 'var(--bg-surface)', color: 'var(--text)' }}>
                            <option value="emoji-emoji">Emoji → Emoji</option>
                            <option value="emoji-text">Emoji → Text</option>
                            <option value="image-text">Image → Text</option>
                            <option value="image-image">Image → Image</option>
                            <option value="image-puzzle">Image Puzzle</option>
                          </select>
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-mid)', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>Puzzle Grid</label>
                          <select value={String(blockCfg.gridSize || 3)} onChange={(e) => updateBlockCfg({ gridSize: Number(e.target.value) })} style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-strong)', background: 'var(--bg-surface)', color: 'var(--text)' }}>
                            <option value="2">2 × 2</option>
                            <option value="3">3 × 3</option>
                            <option value="4">4 × 4</option>
                          </select>
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-mid)', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>Puzzle Image URL</label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                            <input value={String(blockCfg.puzzleImage || '')} onChange={(e) => updateBlockCfg({ puzzleImage: e.target.value })} placeholder="https://..." style={{ flex: 1, minWidth: '240px', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-strong)', background: 'var(--bg-surface)', color: 'var(--text)' }} />
                            <button
                              type="button"
                              onClick={() => openMiniGamePuzzleCropPicker({ kind: 'block', questionIndex: index })}
                              disabled={uploadingMiniGameImage}
                              style={{
                                border: '1px solid var(--border-strong)',
                                borderRadius: '8px',
                                background: 'var(--bg-surface)',
                                color: 'var(--text)',
                                padding: '0.48rem 0.75rem',
                                cursor: uploadingMiniGameImage ? 'not-allowed' : 'pointer',
                                opacity: uploadingMiniGameImage ? 0.65 : 1,
                                fontWeight: 700,
                                fontSize: '0.78rem',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {uploadingMiniGameImage ? '⏳ Uploading...' : '🖼️ Upload & Crop'}
                            </button>
                          </div>
                          {String(blockCfg.puzzleImage || '').trim() && (
                            <div style={{ marginTop: '0.5rem', width: '90px', aspectRatio: '1/1', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-strong)' }}>
                              <img src={String(blockCfg.puzzleImage)} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                          )}
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-mid)', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>Instruction</label>
                          <input value={String(blockCfg.instruction || '')} onChange={(e) => updateBlockCfg({ instruction: e.target.value })} placeholder="Arrange the pieces to complete the image" style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-strong)', background: 'var(--bg-surface)', color: 'var(--text)' }} />
                        </div>
                      </div>
                    )}
                    {/* xo-duel specific config */}
                    {q.miniGameBlockId === 'xo-duel' && (
                      <div style={{ display: 'grid', gap: '0.65rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                        <div>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-mid)', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>Board Size</label>
                          <input type="number" min={3} max={8} value={Number(blockCfg.boardSize || 3)} onChange={(e) => updateBlockCfg({ boardSize: Number(e.target.value) })} style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-strong)', background: 'var(--bg-surface)', color: 'var(--text)' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-mid)', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>Win Length</label>
                          <input type="number" min={3} max={5} value={Number(blockCfg.winLength || 3)} onChange={(e) => updateBlockCfg({ winLength: Number(e.target.value) })} style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-strong)', background: 'var(--bg-surface)', color: 'var(--text)' }} />
                        </div>
                      </div>
                    )}
                    {/* gear-machine specific config */}
                    {q.miniGameBlockId === 'gear-machine' && (
                      <div style={{ display: 'grid', gap: '0.65rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                        <div>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-mid)', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>Gears Count</label>
                          <input type="number" min={3} max={12} value={Number(blockCfg.gearsCount || 5)} onChange={(e) => updateBlockCfg({ gearsCount: Number(e.target.value) })} style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-strong)', background: 'var(--bg-surface)', color: 'var(--text)' }} />
                        </div>
                        <div>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-mid)', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>Max Turns</label>
                          <input type="number" min={3} max={40} value={Number(blockCfg.maxTurns || 12)} onChange={(e) => updateBlockCfg({ maxTurns: Number(e.target.value) })} style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-strong)', background: 'var(--bg-surface)', color: 'var(--text)' }} />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </section>
            )
          }

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
                    {q.type === 'match_plus' && q.matchPlusMode === 'image-puzzle' ? `البازل ${index + 1}` : `السؤال ${index + 1}`}
                  </h3>
                </>
              )}
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
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
                      display: isNarrowScreen ? 'none' : 'block',
                      minWidth: '160px',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '8px',
                      border: '1px solid var(--border-strong)',
                      backgroundColor: 'var(--bg-deep)',
                      color: 'var(--text)',
                      fontSize: '0.92rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      outline: 'none',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title="نوع السؤال"
                  >
                    {questionTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>

                  {isNarrowScreen && (
                    <button
                      type="button"
                      onClick={() => {
                        showDialog({
                          title: 'اختر نوع السؤال',
                          message: (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem', marginTop: '1rem' }}>
                              {questionTypeOptions.map((opt, i) => (
                                <button
                                  key={i}
                                  onClick={() => {
                                    const nextType = opt.value as QuestionType
                                    if (isPremiumQuestionType(nextType) && !isSubscribed) {
                                      openUpgradeDialog('This question type is premium. Please upgrade your account to use it.')
                                      return
                                    }
                                    replaceQuestion(index, coerceQuestionToType(q, nextType))
                                    hideDialog()
                                  }}
                                  style={{
                                    padding: '1rem',
                                    background: q.type === opt.value ? 'var(--accent)' : 'var(--bg-deep)',
                                    color: q.type === opt.value ? '#fff' : 'var(--text)',
                                    border: '1px solid var(--border-strong)',
                                    borderRadius: '12px',
                                    textAlign: 'right',
                                    fontWeight: 600,
                                    fontSize: '0.95rem'
                                  }}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          ),
                          confirmText: 'إغلاق',
                          onConfirm: () => hideDialog()
                        })
                      }}
                      style={{
                        padding: '0.5rem 0.75rem',
                        borderRadius: '8px',
                        border: '1px solid var(--border-strong)',
                        backgroundColor: 'var(--bg-deep)',
                        color: 'var(--text)',
                        fontSize: '0.84rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        width: '140px',
                        textAlign: 'right',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {questionTypeOptions.find(o => o.value === q.type)?.label || 'نوع السؤال'}
                    </button>
                  )}

                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.45rem', 
                    direction: 'rtl', 
                    background: 'var(--bg-deep)', 
                    border: '1px solid var(--border-strong)', 
                    borderRadius: '8px', 
                    padding: '0 0.6rem', 
                    height: '42px',
                    minWidth: isNarrowScreen ? '70px' : '85px'
                  }}>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 400 }}>⏱️</span>
                    <select
                      value={String(q.duration || 20)}
                      onChange={(e) => updateQuestion(index, { duration: Number(e.target.value) })}
                      style={{
                        display: isNarrowScreen ? 'none' : 'block',
                        minWidth: '45px',
                        height: '100%',
                        border: 'none',
                        background: 'transparent',
                        color: 'var(--text)',
                        fontSize: '0.92rem',
                        fontWeight: 700,
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
                    {isNarrowScreen && (
                      <div 
                        onClick={() => {
                          const policy = getQuestionTypeTimerPolicy(q.type)
                          showDialog({
                            title: 'مدة السؤال (ثواني)',
                            message: (
                              <div style={{ 
                                display: 'grid', 
                                gridTemplateColumns: 'repeat(3, 1fr)', 
                                gap: '0.6rem', 
                                marginTop: '1rem' 
                              }}>
                                {policy.allowedDurations.map((seconds) => (
                                  <button
                                    key={seconds}
                                    onClick={() => {
                                      updateQuestion(index, { duration: seconds })
                                      hideDialog()
                                    }}
                                    style={{
                                      padding: '0.8rem',
                                      background: q.duration === seconds ? 'var(--accent)' : 'var(--bg-deep)',
                                      color: q.duration === seconds ? '#fff' : 'var(--text)',
                                      border: '1px solid var(--border-strong)',
                                      borderRadius: '10px',
                                      fontWeight: 800,
                                      fontSize: '1rem'
                                    }}
                                  >
                                    {seconds}
                                  </button>
                                ))}
                              </div>
                            ),
                            confirmText: 'تم',
                            onConfirm: () => hideDialog()
                          })
                        }}
                        style={{
                          color: 'var(--text)',
                          fontSize: '0.92rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        {q.duration || 20}
                      </div>
                    )}
                  </div>

                  {!isNarrowScreen && <div style={{ width: '1px', height: '24px', background: 'var(--border-strong)', margin: '0 0.2rem' }} />}
                </>
              )}

              <button
                type="button"
                onClick={() => {
                  showDialog({
                    title: 'خيارات السؤال',
                    message: (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '1rem' }}>
                        <button
                          onClick={() => {
                            setCollapsedQuestions((prev) => {
                              const next = [...prev]
                              next[index] = !next[index]
                              return next
                            })
                            hideDialog()
                          }}
                          style={{
                            padding: '1rem',
                            background: 'var(--bg-deep)',
                            color: 'var(--text)',
                            border: '1px solid var(--border-strong)',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          <span>{collapsedQuestions[index] ? 'توسيع السؤال' : 'طي السؤال'}</span>
                          <span>{collapsedQuestions[index] ? '▾' : '▴'}</span>
                        </button>

                        <button
                          onClick={() => {
                            hideDialog()
                            showDialog({
                              title: 'حذف السؤال',
                              message: 'هل أنت متأكد من رغبتك في حذف هذا السؤال؟ لا يمكن التراجع عن هذه الخطوة.',
                              confirmText: 'حذف',
                              cancelText: 'إلغاء',
                              isDangerous: true,
                              onConfirm: () => {
                                removeQuestion(index)
                                hideDialog()
                              }
                            })
                          }}
                          style={{
                            padding: '1rem',
                            background: 'rgba(239, 68, 68, 0.1)',
                            color: '#ef4444',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          <span>حذف السؤال</span>
                          <span>🗑️</span>
                        </button>
                      </div>
                    ),
                    confirmText: 'إغلاق',
                    onConfirm: () => hideDialog()
                  })
                }}
                style={{
                  background: 'var(--bg-deep)',
                  border: '1px solid var(--border-strong)',
                  color: 'var(--text-mid)',
                  fontSize: '1.2rem',
                  width: '32px',
                  height: '32px',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  lineHeight: 1
                }}
              >
                ⋮
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
                    <div style={{ display: 'flex', gap: '0.35rem' }}>
                      <input
                        value={q.matchPlusImage || ''}
                        onChange={(e) => updateQuestion(index, { matchPlusImage: e.target.value })}
                        placeholder="رابط الصورة الكاملة"
                        style={{
                          flex: 1,
                          padding: '0.5rem 0.6rem',
                          borderRadius: '8px',
                          border: '1px solid var(--border-strong)',
                          background: 'var(--bg-surface)',
                          color: 'var(--text)',
                          fontSize: '0.82rem',
                          outline: 'none',
                        }}
                      />
                      <button
                        type="button"
                        onClick={async () => {
                          const input = document.createElement('input')
                          input.type = 'file'
                          input.accept = 'image/*'
                          input.onchange = async (event) => {
                            const file = (event.target as HTMLInputElement).files?.[0]
                            if (!file) return
                            try {
                              showToast({ message: '⏳ جاري رفع الصورة...', type: 'info' })
                              const ext = file.name.split('.').pop() || 'jpg'
                              const storagePath = `match-plus-puzzle/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
                              const storageRef = ref(storage, storagePath)
                              await uploadBytes(storageRef, file)
                              const url = await getDownloadURL(storageRef)
                              updateQuestion(index, { matchPlusImage: url })
                              showToast({ message: '✅ تم رفع الصورة بنجاح', type: 'success' })
                            } catch (err) {
                              console.error('Puzzle image upload failed', err)
                              showToast({ message: '❌ فشل رفع الصورة', type: 'error' })
                            }
                          }
                          input.click()
                        }}
                        style={{
                          borderRadius: '8px',
                          border: '1px solid var(--border-strong)',
                          background: 'var(--bg-surface)',
                          color: 'var(--text)',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          padding: '0 0.8rem',
                          cursor: 'pointer',
                        }}
                      >
                        📁 رفع
                      </button>
                    </div>
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

      {!isMiniGameContent && contentType === 'mix' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1rem', marginBottom: '3rem', animation: 'slideUp 0.4s ease-out' }}>
          <div onClick={() => showAddQuestionDialog()} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.9rem', padding: '2rem', borderRadius: '16px', border: '2px dashed #3b82f6', backgroundColor: 'rgba(59,130,246,0.05)', cursor: 'pointer', transition: 'all 0.25s' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#60a5fa'; e.currentTarget.style.backgroundColor = 'rgba(59,130,246,0.1)'; e.currentTarget.style.transform = 'scale(1.01)' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.backgroundColor = 'rgba(59,130,246,0.05)'; e.currentTarget.style.transform = 'scale(1)' }}>
            <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>❓</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 800, color: 'var(--text-bright)', fontSize: '1rem' }}>إضافة سؤال</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-mid)', marginTop: '0.2rem' }}>اختيار، مطابقة، ترتيب، كتابة...</div>
            </div>
          </div>
          <div onClick={() => showAddQuestionDialog('minigames')} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.9rem', padding: '2rem', borderRadius: '16px', border: '2px dashed #7c3aed', backgroundColor: 'rgba(124,58,237,0.05)', cursor: 'pointer', transition: 'all 0.25s' }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#a78bfa'; e.currentTarget.style.backgroundColor = 'rgba(124,58,237,0.1)'; e.currentTarget.style.transform = 'scale(1.01)' }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.backgroundColor = 'rgba(124,58,237,0.05)'; e.currentTarget.style.transform = 'scale(1)' }}>
            <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: '#7c3aed', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>🎮</div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontWeight: 800, color: 'var(--text-bright)', fontSize: '1rem' }}>إضافة ميني جيم</div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-mid)', marginTop: '0.2rem' }}>بازل، XO، ترس، إبداعي...</div>
            </div>
          </div>
        </div>
      )}

      {/* AI Generating Overlay */}
      {isGeneratingAi && <AiGeneratingOverlay mode={aiGeneratingMode} />}

      {/* Global AI Selection Overlay */}
      {showAiSelectionOverlay && aiConflictData && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(2, 6, 23, 0.85)',
          backdropFilter: 'blur(10px)',
          zIndex: 25000,
          display: 'flex',
          justifyContent: 'center',
          alignItems: isNarrowScreen ? 'flex-start' : 'center',
          padding: isNarrowScreen ? '0.5rem' : '1.5rem',
          paddingTop: isNarrowScreen ? '62px' : '1.5rem',
          paddingBottom: isNarrowScreen ? '0.75rem' : '1.5rem',
          boxSizing: 'border-box',
        }}>
          <div style={{
            width: 'min(760px, 98vw)',
            maxHeight: isNarrowScreen ? 'calc(100dvh - 68px)' : 'calc(100dvh - 3rem)',
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-strong)',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            overflow: 'hidden',
          }}>
            <div style={{ padding: '1.2rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ direction: 'rtl' }}>
                <h3 style={{ margin: 0, color: 'var(--text-bright)', fontSize: '1.2rem' }}>✨ اختر الأسئلة التي تريد إضافتها</h3>
                {aiSuggestedTitle && (
                  <div style={{ marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>اسم مقترح:</span>
                    <span style={{ fontSize: '0.82rem', color: '#a78bfa', fontWeight: 700, background: 'rgba(124,58,237,0.12)', padding: '0.15rem 0.6rem', borderRadius: '20px', border: '1px solid rgba(124,58,237,0.3)' }}>
                      {aiSuggestedTitle}
                    </span>
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', gap: '0.8rem' }}>
                <button
                  onClick={() => {
                    if (selectedAiIndices.length === aiConflictData.questions.length) setSelectedAiIndices([])
                    else setSelectedAiIndices(aiConflictData.questions.map((_, i) => i))
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-bright)', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700 }}
                >
                  {selectedAiIndices.length === aiConflictData.questions.length ? 'إلغاء الكل' : 'تحديد الكل'}
                </button>
                <button
                  onClick={() => setShowAiSelectionOverlay(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}
                >✕</button>
              </div>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '0.8rem' }}>
              <div style={{ display: 'grid', gap: '0.8rem' }}>
                {aiConflictData.questions.map((q, idx) => (
                  <div
                    key={idx}
                    onClick={() => {
                      setSelectedAiIndices(prev =>
                        prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
                      )
                    }}
                    style={{
                      padding: '1rem',
                      borderRadius: '10px',
                      border: '1px solid ' + (selectedAiIndices.includes(idx) ? 'var(--text-bright)' : 'var(--border-strong)'),
                      background: selectedAiIndices.includes(idx) ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-deep)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      position: 'relative',
                    }}
                  >
                    <div style={{ position: 'absolute', right: '1rem', top: '1rem' }}>
                      <input
                        type="checkbox"
                        checked={selectedAiIndices.includes(idx)}
                        readOnly
                        style={{ width: '1.2rem', height: '1.2rem', accentColor: 'var(--text-bright)' }}
                      />
                    </div>
                    <div style={{ marginLeft: '1.5rem', marginRight: '2rem' }}>
                      <p style={{ margin: '0 0 0.5rem', color: 'var(--text)', fontWeight: 700, fontSize: '1rem', textAlign: 'right' }}>{q.text}</p>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                        {q.options?.map((opt, i) => (
                          <div key={i} style={{
                            fontSize: '0.85rem',
                            color: (q.correctIndex ?? 0) === i ? '#10b981' : 'var(--text-muted)',
                            fontWeight: (q.correctIndex ?? 0) === i ? 700 : 400,
                            textAlign: 'right'
                          }}>
                            • {opt}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: isNarrowScreen ? '0.75rem' : '1rem', borderTop: '1px solid var(--border)', background: 'var(--bg-deep)', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px', flexShrink: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                <span style={{ color: 'var(--text-mid)', fontWeight: 700, fontSize: isNarrowScreen ? '0.82rem' : '1rem' }}>تم اختيار {selectedAiIndices.length} من {aiConflictData.questions.length}</span>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {questions.length > 0 ? (
                    <>
                      <button
                        onClick={() => handleConflictResolve('append')}
                        style={{ padding: isNarrowScreen ? '0.55rem 0.75rem' : '0.7rem 1.2rem', borderRadius: '8px', background: 'var(--text-bright)', color: 'var(--bg-deep)', border: 'none', fontWeight: 800, cursor: 'pointer', fontSize: isNarrowScreen ? '0.78rem' : '0.9rem' }}
                      >➕ إضافة</button>
                      <button
                        onClick={() => handleConflictResolve('replace')}
                        style={{ padding: isNarrowScreen ? '0.55rem 0.75rem' : '0.7rem 1.2rem', borderRadius: '8px', background: '#ef4444', color: 'white', border: 'none', fontWeight: 800, cursor: 'pointer', fontSize: isNarrowScreen ? '0.78rem' : '0.9rem' }}
                      >🔄 استبدال</button>
                      <button
                        onClick={() => handleConflictResolve('new')}
                        style={{ padding: isNarrowScreen ? '0.55rem 0.75rem' : '0.7rem 1.2rem', borderRadius: '8px', background: '#7c3aed', color: 'white', border: 'none', fontWeight: 800, cursor: 'pointer', fontSize: isNarrowScreen ? '0.78rem' : '0.9rem' }}
                      >✨ اختبار جديد</button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleConflictResolve('append')}
                      style={{ padding: isNarrowScreen ? '0.55rem 1.25rem' : '0.7rem 2rem', borderRadius: '8px', background: 'var(--text-bright)', color: 'var(--bg-deep)', border: 'none', fontWeight: 800, cursor: 'pointer' }}
                    >تأكيد الإضافة ✨</button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Block Picker Overlay */}
      {showAddBlockPicker && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(2,6,23,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)', padding: '1.5rem', animation: 'fadeIn 0.2s ease-out' }}>
          <div style={{ width: '100%', maxWidth: '680px', background: 'var(--bg-surface)', borderRadius: '20px', border: '1px solid var(--border-strong)', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
            <div style={{ padding: '1.25rem 1.5rem', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>🎮 اختر ميني جيم</h2>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.75)' }}>سيتم إضافته كبلوك مستقل في نفس الاختبار</p>
              </div>
              <button onClick={() => setShowAddBlockPicker(false)} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
            </div>
            <div style={{ padding: '1.25rem', maxHeight: '70vh', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
              {miniGameCards.map((game) => (
                <div
                  key={game.id}
                  onClick={() => addMiniGameBlock(game.id)}
                  style={{ padding: '1rem', borderRadius: '14px', border: '1.5px solid var(--border-strong)', background: 'var(--bg-deep)', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.background = 'rgba(124,58,237,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.background = 'var(--bg-deep)'; e.currentTarget.style.transform = 'translateY(0)' }}
                >
                  <div style={{ fontSize: '1.6rem' }}>{game.icon}</div>
                  <div style={{ fontWeight: 700, color: 'var(--text-bright)', fontSize: '0.85rem' }}>{game.arabicName}</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-mid)', lineHeight: 1.4 }}>{game.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {!isMiniGameContent && contentType !== 'mix' && (!quizId && questions.length === 0) ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
          gap: '1rem',
          marginBottom: '3rem',
        }}>
          <div 
            onClick={() => showAddQuestionDialog()}
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
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-bright)' }}>
                {gameModeId === 'match-plus-arena' ? 'إضافة بازل جديد' : 'إضافة سؤال جديد'}
              </span>
              <span style={{ fontSize: '0.82rem', opacity: 0.7 }}>
                {gameModeId === 'match-plus-arena' ? 'أضف صورة جديدة ليقوم اللاعب بحلها' : 'اختر من بين 6 أنواع مختلفة من الأسئلة'}
              </span>
            </div>
          </div>

          <div 
            onClick={loadSamples}
            style={{
              display: gameModeId === 'match-plus-arena' ? 'none' : 'flex',
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
      ) : contentType === 'mix' ? null : (
        <div 
          onClick={() => showAddQuestionDialog()}
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
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-bright)' }}>
              {gameModeId === 'match-plus-arena' ? 'إضافة بازل جديد' : 'إضافة سؤال جديد'}
            </span>
            <span style={{ fontSize: '0.82rem', opacity: 0.7 }}>
              {gameModeId === 'match-plus-arena' ? 'أضف صورة جديدة ليقوم اللاعب بحلها' : 'اختر من بين 6 أنواع مختلفة من الأسئلة'}
            </span>
          </div>
        </div>
      )}

      <ImageCropDialog
        isOpen={showCropDialog}
        imageSrc={cropImageSrc}
        title="Crop Puzzle Image"
        ratioPresets={[{ id: 'square', label: 'Square 1:1', ratio: 1 }]}
        onClose={closeCropDialog}
        onConfirm={handleMiniGamePuzzleCropConfirm}
      />

      {/* ── AI Features Dialog (Premium Placeholder) ── */}
      {aiAction && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.8)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backdropFilter: 'blur(10px)',
          animation: 'fadeIn 0.2s ease-out',
          padding: isNarrowScreen ? '0.5rem' : '1.5rem',
        }}>
          <div style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border-strong)',
            borderRadius: '24px', width: '90%', maxWidth: '540px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)', overflow: 'hidden',
            position: 'relative',
            display: 'flex', flexDirection: 'column',
            maxHeight: 'calc(100dvh - 2rem)',
          }}>
            {/* Header */}
            <div style={{ padding: '1.25rem 1.5rem', background: 'linear-gradient(135deg, #7c3aed, #db2777)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', direction: 'rtl', flexShrink: 0 }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
                {aiAction === 'generate' ? '✨ توليد أسئلة بالذكاء الاصطناعي' : '🛡️ تدقيق ذكي ومراجعة الأسئلة'}
              </h2>
              <button 
                onClick={() => setAiAction(null)}
                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '1.1rem' }}
              >✕</button>
            </div>

            {/* Scrollable Content */}
            <div style={{ flex: 1, overflowY: 'auto', padding: isNarrowScreen ? '1.25rem' : '2rem', position: 'relative', direction: 'rtl', textAlign: 'right' }}>
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
                      style={{ width: '100%', height: '100px', padding: '1rem', borderRadius: '12px', border: '1.5px solid var(--border-strong)', background: 'var(--bg-deep)', color: 'var(--text)', fontSize: '0.9rem', outline: 'none', transition: 'border-color 0.2s', resize: 'none', textAlign: 'right', direction: 'rtl' }}
                    />
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                      عدد الأسئلة
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {[3, 5, 8, 10, 15].map((count) => (
                        <button
                          key={count}
                          type="button"
                          onClick={() => setAiQuestionCount(count)}
                          disabled={isGeneratingAi}
                          style={{
                            padding: '0.4rem 0.8rem',
                            borderRadius: '20px',
                            border: '1px solid ' + (aiQuestionCount === count ? 'var(--text-bright)' : 'var(--border-strong)'),
                            background: aiQuestionCount === count ? 'var(--text-bright)' : 'var(--bg-deep)',
                            color: aiQuestionCount === count ? 'var(--bg-deep)' : 'var(--text-mid)',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            cursor: isGeneratingAi ? 'not-allowed' : 'pointer',
                            opacity: isGeneratingAi ? 0.6 : 1,
                          }}
                        >
                          {count} أسئلة
                        </button>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem', alignItems: 'center', marginBottom: '2rem' }}>
                    <label 
                      style={{ 
                        flex: 1, minWidth: '150px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
                        borderRadius: '12px', border: '1.5px dashed var(--border-strong)', background: 'var(--bg-deep)',
                        cursor: (isUploadingAiFile || isGeneratingAi) ? 'not-allowed' : 'pointer', color: 'var(--text-muted)', fontSize: '0.85rem',
                        opacity: isGeneratingAi ? 0.6 : 1
                      }}
                    >
                      <input 
                        type="file" 
                        style={{ display: 'none' }} 
                        accept="image/*,application/pdf" 
                        multiple 
                        onChange={handleAiFileUpload}
                        disabled={isUploadingAiFile || isGeneratingAi}
                      />
                      {isGeneratingAi ? '⛔ الإضافة متوقفة أثناء التوليد' : (isUploadingAiFile ? '⏳ جاري التحميل...' : '📷 رفع صور أو PDF')}
                    </label>
                  </div>

                  {aiContextFiles.length > 0 && (
                    <div style={{ marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', direction: 'rtl' }}>
                      {aiContextFiles.map((file, idx) => (
                        <div key={idx} style={{ 
                          background: 'var(--bg-deep)', padding: '0.3rem 0.6rem', borderRadius: '8px', 
                          display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--border-strong)',
                          fontSize: '0.8rem', color: 'var(--text-mid)', flexDirection: 'row-reverse'
                        }}>
                          <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {file.type.includes('pdf') ? '📄' : '🖼️'} {file.name}
                          </span>
                          <button 
                            onClick={() => removeAiFile(idx)}
                            disabled={isGeneratingAi}
                            style={{ background: 'none', border: 'none', color: '#db2777', cursor: isGeneratingAi ? 'not-allowed' : 'pointer', fontWeight: 'bold', opacity: isGeneratingAi ? 0.5 : 1 }}
                          >✕</button>
                        </div>
                      ))}
                    </div>
                  )}
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

              {/* Removed Subscription Lock Overlay */}
            </div>{/* end scrollable content */}

            {/* Sticky footer — keeps button visible above keyboard on mobile */}
            <div style={{ padding: isNarrowScreen ? '0.75rem 1.25rem' : '1rem 2rem', borderTop: '1px solid var(--border-strong)', background: 'var(--bg-surface)', flexShrink: 0, borderBottomLeftRadius: '24px', borderBottomRightRadius: '24px', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <button 
                onClick={handleGenerateAI}
                disabled={isGeneratingAi || (aiAction === 'generate' && !aiPrompt.trim() && aiContextFiles.length === 0)}
                style={{
                  width: '100%', padding: '1.1rem 1rem', borderRadius: '14px', border: 'none',
                  background: (aiAction === 'generate' && !aiPrompt.trim() && aiContextFiles.length === 0) ? 'var(--bg-deep)' : 'linear-gradient(135deg, #7c3aed, #db2777)', 
                  color: (aiAction === 'generate' && !aiPrompt.trim() && aiContextFiles.length === 0) ? 'var(--text-muted)' : '#fff',
                  fontSize: '1.1rem', fontWeight: 800, cursor: isGeneratingAi ? 'wait' : ((aiAction === 'generate' && !aiPrompt.trim() && aiContextFiles.length === 0) ? 'not-allowed' : 'pointer'), transition: 'all 0.2s',
                  boxShadow: (aiAction === 'generate' && !aiPrompt.trim() && aiContextFiles.length === 0) ? 'none' : '0 4px 15px rgba(124, 58, 237, 0.4)',
                  opacity: isGeneratingAi ? 0.7 : 1,
                  letterSpacing: '0.3px',
                }}
                onMouseEnter={(e) => { 
                  if (!isGeneratingAi && !(aiAction === 'generate' && !aiPrompt.trim() && aiContextFiles.length === 0)) {
                    e.currentTarget.style.transform = 'translateY(-2px)'; 
                    e.currentTarget.style.boxShadow = '0 6px 20px rgba(124, 58, 237, 0.5)';
                  }
                }}
                onMouseLeave={(e) => { 
                  e.currentTarget.style.transform = 'translateY(0)'; 
                  if (!(aiAction === 'generate' && !aiPrompt.trim() && aiContextFiles.length === 0)) {
                    e.currentTarget.style.boxShadow = '0 4px 15px rgba(124, 58, 237, 0.4)';
                  }
                }}
              >
                {isGeneratingAi ? '⏳ جاري التوليد...' : (aiAction === 'generate' ? '🚀 ابدأ التوليد' : '🛡️ ابدأ التدقيق')}
              </button>
              <button
                onClick={() => setAiAction(null)}
                disabled={isGeneratingAi}
                style={{
                  width: '100%', padding: '0.75rem 1rem', borderRadius: '12px',
                  border: '1px solid var(--border-strong)',
                  background: 'transparent',
                  color: 'var(--text-mid)',
                  fontSize: '0.95rem', fontWeight: 600,
                  cursor: isGeneratingAi ? 'not-allowed' : 'pointer',
                  opacity: isGeneratingAi ? 0.4 : 1,
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => { if (!isGeneratingAi) e.currentTarget.style.background = 'var(--bg-deep)' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
              >
                ✕ إلغاء
              </button>
            </div>{/* end sticky footer */}
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
        @keyframes aiOrbit {
          0%   { transform: rotate(0deg)   translateX(52px) rotate(0deg); }
          100% { transform: rotate(360deg) translateX(52px) rotate(-360deg); }
        }
        @keyframes aiOrbit2 {
          0%   { transform: rotate(120deg)  translateX(52px) rotate(-120deg); }
          100% { transform: rotate(480deg)  translateX(52px) rotate(-480deg); }
        }
        @keyframes aiOrbit3 {
          0%   { transform: rotate(240deg)  translateX(52px) rotate(-240deg); }
          100% { transform: rotate(600deg)  translateX(52px) rotate(-600deg); }
        }
        @keyframes aiBrain {
          0%, 100% { transform: scale(1) rotate(-4deg); }
          50%       { transform: scale(1.18) rotate(4deg); }
        }
        @keyframes aiFloat1 {
          0%   { transform: translateY(0px)   translateX(0px)  scale(1);   opacity: 0.7; }
          50%  { transform: translateY(-28px) translateX(10px) scale(1.2); opacity: 1; }
          100% { transform: translateY(-58px) translateX(-5px) scale(0.8); opacity: 0; }
        }
        @keyframes aiFloat2 {
          0%   { transform: translateY(0px)   translateX(0px)   scale(0.9); opacity: 0.6; }
          50%  { transform: translateY(-22px) translateX(-12px) scale(1.1); opacity: 1; }
          100% { transform: translateY(-50px) translateX(8px)   scale(0.7); opacity: 0; }
        }
        @keyframes aiFloat3 {
          0%   { transform: translateY(0px)   translateX(0px)  scale(1);   opacity: 0.5; }
          60%  { transform: translateY(-35px) translateX(16px) scale(1.3); opacity: 0.9; }
          100% { transform: translateY(-65px) translateX(-8px) scale(0.6); opacity: 0; }
        }
        @keyframes aiPulseRing {
          0%   { transform: scale(0.85); opacity: 0.6; }
          70%  { transform: scale(1.25); opacity: 0; }
          100% { transform: scale(1.25); opacity: 0; }
        }
        @keyframes aiShimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }
        @keyframes aiDot {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40%            { transform: scale(1.2); opacity: 1; }
        }
        @keyframes aiMsgFade {
          0%   { opacity: 0; transform: translateY(8px); }
          15%  { opacity: 1; transform: translateY(0); }
          80%  { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-8px); }
        }
      `}</style>
    </>
  )
}
