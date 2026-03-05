import { useEffect, useMemo, useRef, useState } from 'react'
import { generateQuizQuestions } from '../lib/ai/quizQuestions'
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
import type { ChallengePreset, QuizDoc, QuizQuestion, QuestionType } from '../types/quiz'
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
  sanitizeQuestionBySchema,
} from '../config/questionTypeSchemas'
import { createQuiz, deleteQuiz, findQuizByOwnerAndSlug, getQuizById, incrementQuizPlayCount, updateQuiz } from '../lib/quizRepo'
import { incrementPlatformStat, subscribeMiniGameSettings, subscribeQuestionTypeSettings } from '../lib/adminRepo'
import { ImageCropDialog } from '../components/ImageCropDialog'
import { AiGeneratingOverlay } from '../components/editor/AiGeneratingOverlay'
import { EditorUnifiedHeader } from '../components/editor/EditorUnifiedHeader'
import { MiniGameConfigurationPanel } from '../components/editor/MiniGameConfigurationPanel'
import { MixContentAddSection } from '../components/editor/MixContentAddSection'
import { AddBlockPickerOverlay } from '../components/editor/AddBlockPickerOverlay'
import { AiSelectionOverlay } from '../components/editor/AiSelectionOverlay'
import QuestionSection from '../components/editor/QuestionSection'
import { MetadataDialogContent } from '../components/editor/MetadataDialogContent'
import { MetadataDialogFooter } from '../components/editor/MetadataDialogFooter'
import { MetadataDialogShell } from '../components/editor/MetadataDialogShell'
import { AddContentDialogBody } from '../components/editor/AddContentDialogBody'
import { ContentTypePickerOverlay } from '../components/editor/ContentTypePickerOverlay'
import { AIFeaturesDialog } from '../components/editor/AIFeaturesDialog'
import { EditorAnimationKeyframes } from '../components/editor/EditorAnimationKeyframes'
import { generateAndStoreAiCoverImage } from '../lib/ai/coverImage'
import { CoverAssetsDialogBody } from '../components/editor/CoverAssetsDialogBody'
import { SlidePanel } from '../components/editor/SlidePanel'
import { useSlidePanel } from '../hooks/useSlidePanel'
import { useUserPrefs } from '../lib/UserPrefsContext'
import placeholderImg from '../assets/QYan_logo_300x164.jpg'

const IS_LOCAL_DEV = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)
const SERVER_BASE = IS_LOCAL_DEV
  ? (import.meta.env.VITE_LOCAL_GAME_URL || 'http://localhost:3001')
  : (import.meta.env.VITE_API_BASE_URL || 'https://play.qyan.app')
const DEFAULT_COVER_IMAGE = placeholderImg

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
  const { ...rest } = question
  return {
    ...rest,
    creatorTask: 'draw',
  }
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
  const location = useLocation()
  const { show: showDialog, hide: hideDialog } = useDialog()
  const { showToast } = useToast()
  const { isSubscribed } = useSubscription()
  // Always points to the latest saveQuiz closure so setTimeout callbacks never use stale state
  const saveQuizRef = useRef<() => Promise<void>>(() => Promise.resolve())
  // Tracks whether the no-ID (new quiz) initialization has already run so that navigating
  // between /editor and /mini-game-editor (which flips isMiniGameContent) doesn't wipe the title.
  const newEditorInitializedRef = useRef(false)

  const [quizId, setQuizId] = useState<string | null>(routeId ?? null)
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'private'>('private')
  const [approvalStatus, setApprovalStatus] = useState<'pending' | 'approved' | 'rejected' | undefined>(undefined)
  const [gameModeId, setGameModeId] = useState<string>('')
  const [miniGameConfig, setMiniGameConfig] = useState<Record<string, unknown>>({})
  const [challengePreset, setChallengePreset] = useState<ChallengePreset>('classic')
  const [enableScholarRole, setEnableScholarRole] = useState(false)
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [showMetadataDialog, setShowMetadataDialog] = useState(false)
  const [tempTitle, setTempTitle] = useState('')
  const [tempSlug, setTempSlug] = useState('')
  const [description, setDescription] = useState('')
  const [tempDescription, setTempDescription] = useState('')
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0)
  const { slidePanelLayout } = useUserPrefs()
  const slidePanel = useSlidePanel({ visible: true, orientation: window.innerWidth < 768 ? 'bottom' : slidePanelLayout })
  const [tempVisibility, setTempVisibility] = useState<'public' | 'private'>('private')
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
  const [coverImage, setCoverImage] = useState<string>(DEFAULT_COVER_IMAGE)
  const [tempCoverImage, setTempCoverImage] = useState<string>(DEFAULT_COVER_IMAGE)
  const [coverPreviewChecking, setCoverPreviewChecking] = useState(false)
  const [coverPreviewError, setCoverPreviewError] = useState('')
  const [uploadingCover, setUploadingCover] = useState(false)
  const [isGeneratingCoverImage, setIsGeneratingCoverImage] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [tempAllDuration, setTempAllDuration] = useState(20)
  const [, setSaveAfterMetadata] = useState(false)
  const [showMiniGamePicker, setShowMiniGamePicker] = useState(false)
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
  const [showCropDialog, setShowCropDialog] = useState(false)
  const [uploadingMiniGameImage, setUploadingMiniGameImage] = useState(false)
  const [puzzleCropTarget, setPuzzleCropTarget] = useState<{ kind: 'default' } | { kind: 'block'; questionIndex: number } | { kind: 'pair'; questionIndex: number; pairIndex?: number }>({ kind: 'default' })
  const [showContentTypePicker, setShowContentTypePicker] = useState(false)
  const [contentType, setContentType] = useState<'quiz' | 'mini-game' | 'mix'>('quiz')
  const [showAddBlockPicker, setShowAddBlockPicker] = useState(false)
  const [themeId, setThemeId] = useState<string>('default')
  const [tempThemeId, setTempThemeId] = useState<string>('default')

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
  
  // Sticky Bar Diagnostic Ref

  type StatusState = { kind: 'idle' } | { kind: 'saving' } | { kind: 'success'; msg: string } | { kind: 'error'; msg: string } | { kind: 'info'; msg: string }
  const [status, setStatus] = useState<StatusState>({ kind: 'idle' })

  // Persist the last editor path with its ID so the sidebar nav link always returns to
  // the quiz in progress rather than stripping the ID and creating a blank editor.
  // Derive isMiniGame from location.pathname directly to avoid a temporal dead zone —
  // the `isMiniGameContent` const is declared further down in the component body.
  useEffect(() => {
    if (!quizId) return
    const isMiniGame = location.pathname.startsWith('/mini-game-editor')
    const path = isMiniGame ? `/mini-game-editor/${quizId}` : `/editor/${quizId}`
    sessionStorage.setItem(isMiniGame ? 'lastMiniGameEditorPath' : 'lastEditorPath', path)
  }, [quizId, location.pathname])

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

  const openMiniGamePuzzleCropPicker = (target: { kind: 'default' } | { kind: 'block'; questionIndex: number } | { kind: 'pair'; questionIndex: number; pairIndex?: number }) => {
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
    setTempThemeId(themeId ?? 'default')
    setTempVisibility(visibility)
    setTempGameModeId(isMiniGameContent ? gameModeId : '')
    setTempChallenge(challengePreset)
    setTempEnableScholarRole(enableScholarRole)
    setTempRandomizeQuestions(randomizeQuestions)
    setTempDescription(description)
    setTempCoverImage(coverImage || DEFAULT_COVER_IMAGE)
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
      setThemeId(tempThemeId)
      setSlug(nextSlug)
      setTempSlug(nextSlug)
      setVisibility(tempVisibility)
      setGameModeId(isMiniGameContent ? tempGameModeId : '')
      setChallengePreset(tempChallenge)
      setEnableScholarRole(tempEnableScholarRole)
      setRandomizeQuestions(tempRandomizeQuestions)
      const normalizedCoverImage = tempCoverImage.trim() || DEFAULT_COVER_IMAGE
      setCoverImage(normalizedCoverImage)
      setTempCoverImage(normalizedCoverImage)
      setDescription(tempDescription.trim())
      setShowMiniGamePicker(false)
      setShowMetadataDialog(false)
      setSaveAfterMetadata(false)
      // Always persist settings immediately when the user clicks موافق
      setTimeout(() => { void saveQuizRef.current() }, 0)
    } catch (error) {
      showStatus({ kind: 'error', msg: `فشل التحقق: ${(error as Error).message}` })
    } finally {
      setMetadataChecking(false)
    }
  }

  useEffect(() => {
    if (!routeId) {
      // Only fully reset when this is the first time landing on a new (no-ID) editor.
      // Subsequent re-runs caused by isMiniGameContent flipping (user navigating between
      // /editor and /mini-game-editor) must NOT overwrite a title the user already typed.
      if (!newEditorInitializedRef.current) {
        newEditorInitializedRef.current = true
        const defaultTitle = isMiniGameContent ? 'New Mini Game' : 'New Quiz'
        const defaultSlug = ensureScopedSlug(isMiniGameContent ? 'new-mini-game' : 'new-quiz', ownerId)
        setTitle(defaultTitle)
        setSlug(defaultSlug)
        setThemeId('default')
        setGameModeId('')
        setMiniGameConfig({})
        setTempTitle(defaultTitle)
        setTempSlug(defaultSlug)
        setTempThemeId('default')
        setTempGameModeId('')
        setCoverImage(DEFAULT_COVER_IMAGE)
        setTempCoverImage(DEFAULT_COVER_IMAGE)
        setCollapsedQuestions([])
        // If navigated here with skipPicker flag (e.g. after picker redirected to /mini-game-editor)
        const navState = location.state as Record<string, unknown> | null
        if (navState?.skipPicker) {
          if (navState.contentType) setContentType(navState.contentType as 'quiz' | 'mini-game' | 'mix')
        }
      }
      return
    }
    // Opening a real quiz by ID — allow re-initialization next time a new editor is opened
    newEditorInitializedRef.current = false
    getQuizById(routeId)
      .then((data) => {
        if (!data) { showStatus({ kind: 'error', msg: 'لم يُعثر على الاختبار.' }); return }
        // Auto-redirect: if this quiz has a gameModeId but we're on /editor/:id, switch to /mini-game-editor/:id
        if (!isMiniGameContent && data.gameModeId) {
          navigate(`/mini-game-editor/${routeId}`, { replace: true })
          return
        }
        setTitle(data.title)
        setThemeId(data.themeId ?? 'default')
        setSlug(data.slug)
        setVisibility(data.visibility)
        setApprovalStatus(data.approvalStatus)
        setGameModeId(isMiniGameContent ? (data.gameModeId ?? '') : '')
        setMiniGameConfig((data.miniGameConfig && typeof data.miniGameConfig === 'object') ? data.miniGameConfig as Record<string, unknown> : {})
        setChallengePreset(data.challengePreset || 'classic')
        setEnableScholarRole(data.enableScholarRole ?? false)
        setRandomizeQuestions(data.randomizeQuestions ?? false)
        // Vite-hashed asset paths (e.g. /assets/QYan_logo_300x164-D746paDg.jpg) are
        // build-specific and break after every rebuild. Treat them as "no cover" and
        // fall back to the current placeholder instead.
        const rawCover = (data.coverImage || '').trim()
        const isViteAsset = rawCover.startsWith('/assets/') && !rawCover.startsWith('http')
        setCoverImage(rawCover && !isViteAsset ? rawCover : DEFAULT_COVER_IMAGE)
        setDescription(data.description || '')
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
    setQuestions((prev) => prev.map((q, i) => (i === index ? sanitizeQuestion(next) : q)))
  }

  const updateQuestion = (index: number, patch: Partial<QuizQuestion>) => {
    setHasUnsavedChanges(true)
    setQuestions((prev) => prev.map((q, i) => (i === index ? sanitizeQuestion({ ...q, ...patch } as QuizQuestion) : q)))
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
    setActiveQuestionIndex(questions.length)
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
    setActiveQuestionIndex(questions.length)
  }

  const showAddQuestionDialog = (initialTab: 'questions' | 'minigames' = 'questions') => {
    const miniGames = Object.values(MINI_GAME_DEFINITIONS)
    
    showDialog({
      title: 'إضافة محتوى جديد',
      message: (
        <AddContentDialogBody
          initialTab={initialTab}
          questionTypeOptions={questionTypeOptions}
          miniGames={miniGames}
          onSelectQuestion={(nextType) => {
            if (isPremiumQuestionType(nextType) && !isSubscribed) {
              openUpgradeDialog('This question type is premium. Please upgrade your account to use it.')
              return
            }
            addQuestion(nextType)
            hideDialog()
          }}
          onSelectMiniGame={(miniGameId) => {
            addMiniGameBlock(miniGameId)
            hideDialog()
          }}
        />
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
      setActiveQuestionIndex(0);
      setAiConflictData(null);
      setShowMetadataDialog(true);
    } else if (mode === 'replace') {
      setQuestions(selectedQuestions);
      setCollapsedQuestions(Array(selectedQuestions.length).fill(false));
      setActiveQuestionIndex(0);
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

          if (options.length > 6) {
            options = options.slice(0, 6);
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
      - Max option text length: ${MAX_OPTION_TEXT_LENGTH} characters
      - Max number of options: 6`;

      const { questions: generatedQuestions, title: generatedTitle } = await generateQuizQuestions({
        promptText,
        questionCount: aiQuestionCount,
        contextFiles: aiContextFiles,
      })

      if (generatedTitle && typeof generatedTitle === 'string') {
        setAiSuggestedTitle(generatedTitle.trim().slice(0, 60))
      }

      // Auto-fill description if empty
      if (!description.trim() && aiPrompt.trim()) {
        setDescription(aiPrompt.trim().slice(0, 300))
        setTempDescription(aiPrompt.trim().slice(0, 300))
      }

      const normalizedGeneratedQuestions = normalizeAiQuestions(generatedQuestions);
      setAiConflictData({ questions: normalizedGeneratedQuestions, count: normalizedGeneratedQuestions.length });
      setSelectedAiIndices(normalizedGeneratedQuestions.map((_, i) => i));
      setAiAction(null);
      setShowAiSelectionOverlay(true);
      showToast({ message: `✅ تم توليد ${normalizedGeneratedQuestions.length} سؤال`, type: 'success' });
    } catch (error) {
      console.error('AI Generation failed:', error);
      const code = (error as any)?.code as string | undefined
      const message = error instanceof Error ? error.message : 'فشل إنشاء الأسئلة بالذكاء الاصطناعي'
      if (typeof code === 'string' && code.includes('resource-exhausted')) {
        openUpgradeDialog('You have used all your free AI credits. Please upgrade via bank transfer (manual activation) to continue.')
      }
      showToast({ message: `❌ ${message}`, type: 'error' });
    } finally {
      setIsGeneratingAi(false);
    }
  }

  const handleGenerateCoverImage = async () => {
    if (isGeneratingCoverImage || uploadingCover) return

    setIsGeneratingCoverImage(true)
    try {
      const { imageUrl } = await generateAndStoreAiCoverImage({
        title: tempTitle || title || '',
        description: tempDescription || description || '',
        questions,
        quizId: quizId || undefined,
      })

      setTempCoverImage(imageUrl)
      setCoverPreviewError('')
      showToast({ message: '✨ تم توليد صورة غلاف وحفظها في Firebase', type: 'success' })
    } catch (error) {
      console.error('Cover AI generation failed:', error)
      const code = (error as any)?.code as string | undefined
      const message = error instanceof Error ? error.message : 'فشل إنشاء صورة الغلاف بالذكاء الاصطناعي'
      if (typeof code === 'string' && code.includes('resource-exhausted')) {
        openUpgradeDialog('You have used all your free AI credits. Please upgrade via bank transfer (manual activation) to continue.')
      }
      showToast({ message: `❌ ${message}`, type: 'error' })
    } finally {
      setIsGeneratingCoverImage(false)
    }
  }

  const handleUploadCoverImage = () => {
    if (uploadingCover) return

    const inp = document.createElement('input')
    inp.type = 'file'
    inp.accept = 'image/*'
    inp.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      setUploadingCover(true)
      try {
        const uid = auth.currentUser?.uid
        const ext = file.name.split('.').pop() || 'jpg'
        const path = uid
          ? `quiz-covers/uploads/${uid}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
          : `quiz-covers/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const storageRef = ref(storage, path)
        await uploadBytes(storageRef, file)
        const url = await getDownloadURL(storageRef)
        setTempCoverImage(url)
      } catch (err) {
        console.error('Cover upload failed', err)
        showToast({ message: '❌ فشل رفع صورة الغلاف', type: 'error' })
      } finally {
        setUploadingCover(false)
      }
    }

    inp.click()
  }

  const openCoverAssetsLibrary = () => {
    if (!auth.currentUser?.uid) {
      showToast({ message: 'يرجى تسجيل الدخول أولاً', type: 'error' })
      return
    }

    const previous = tempCoverImage
    showDialog({
      title: '🗂️ مكتبة الأصول',
      message: (
        <CoverAssetsDialogBody
          initialSelectedUrl={previous}
          onSelect={(url) => {
            setTempCoverImage(url)
            setCoverPreviewError('')
          }}
        />
      ),
      confirmText: 'تم',
      cancelText: 'إلغاء',
      onConfirm: () => {},
      onCancel: () => {
        setTempCoverImage(previous)
        setCoverPreviewError('')
      },
    })
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

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return
      event.preventDefault()
      event.returnValue = ''
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  // Track screen width for responsive toolbar; also auto-switch slide panel orientation
  useEffect(() => {
    const handleResize = () => {
      const narrow = window.innerWidth < 768
      setIsNarrowScreen(narrow)
      slidePanel.setOrientation(narrow ? 'bottom' : slidePanelLayout)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slidePanelLayout])

  useEffect(() => {
    if (!showMetadataDialog) return

    const candidate = tempCoverImage.trim()
    if (!candidate) {
      setCoverPreviewChecking(false)
      setCoverPreviewError('')
      return
    }

    if (candidate === DEFAULT_COVER_IMAGE) {
      setCoverPreviewChecking(false)
      setCoverPreviewError('')
      return
    }

    if (!/^(https?:\/\/|blob:|data:|\/)/i.test(candidate)) {
      setCoverPreviewChecking(false)
      setCoverPreviewError('رابط الصورة غير صالح. استخدم رابطًا مباشرًا أو صورة مرفوعة.')
      return
    }

    // Unsplash search result pages are not direct image links
    if (candidate.startsWith('https://unsplash.com/s/photos/')) {
        setCoverPreviewChecking(false)
        setCoverPreviewError('هذا ليس رابط صورة مباشر. الرجاء نسخ عنوان الصورة الفعلي.')
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
        setActiveQuestionIndex((prev) => {
          if (index < prev) return prev - 1
          if (index === prev) return Math.max(0, prev - 1)
          return prev
        })
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
    const masterEmail = import.meta.env.VITE_MASTER_EMAIL as string | undefined
    const isMasterAdmin = !!masterEmail && auth.currentUser?.email === masterEmail
    // Non-admins requesting public → set pending approval; master admin can approve directly
    const effectiveVisibility = (!isMasterAdmin && visibility === 'public') ? 'private' : visibility
    const effectiveApprovalStatus: 'pending' | 'approved' | 'rejected' | undefined =
      !isMasterAdmin && visibility === 'public' ? 'pending'
      : isMasterAdmin && visibility === 'public' ? 'approved'
      : visibility === 'private' && approvalStatus !== 'rejected' ? undefined
      : approvalStatus
    const payload: QuizDoc = {
      ownerId,
      title,
      slug,
      visibility: effectiveVisibility,
      approvalStatus: effectiveApprovalStatus,
      themeId: themeId === 'default' ? 'default-dark' : themeId,
      contentType: isMiniGameContent ? 'mini-game' : contentType,
      priceTier: requiresSubscription ? 'starter' : 'free',
      gameModeId: (isMiniGameContent || !!gameModeId) ? (gameModeId || undefined) : undefined,
      miniGameConfig: (isMiniGameContent || !!gameModeId) ? miniGameConfig : undefined,
      challengePreset,
      enableScholarRole,
      randomizeQuestions,
      description: description.trim() || undefined,
      // Never persist Vite-hashed asset paths — they are build-specific and
      // will 404 after the next deploy. Save empty string instead so the UI
      // falls back to the current placeholder on every load.
      coverImage: (() => { const c = (coverImage || '').trim(); return (c && !c.startsWith('/assets/')) ? c : '' })(),
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

    const preOpenedTab = window.open('', '_blank')
    const authParams = await getHostLaunchAuthParams({
      serverBase: SERVER_BASE,
      currentUser: auth.currentUser,
    })

    const gameUrl = buildHostGameUrl({
      serverBase: SERVER_BASE,
      quizId: quizIdToLaunch,
      gameModeId: isMiniGameContent ? (gameModeId || undefined) : undefined,
      themeId: themeId === 'default' ? 'default-dark' : themeId,
      miniGameConfig: (isMiniGameContent && miniGameConfig && Object.keys(miniGameConfig).length > 0)
        ? miniGameConfig as Record<string, unknown>
        : undefined,
      ...authParams,
    })
    await guardedLaunchGame({
      serverBase: SERVER_BASE,
      gameUrl,
      preOpenedTab,
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
      onLaunch: () => {
        void incrementPlatformStat('sessionHosted')
        void incrementQuizPlayCount(quizIdToLaunch)
      },
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
    <div className="quiz-editor-root">
      {/* Content Type Picker */}
      {showContentTypePicker && (
        <ContentTypePickerOverlay
          onClose={() => setShowContentTypePicker(false)}
          onSelect={handleContentTypeSelect}
        />
      )}

      {/* Metadata Dialog */}
      <MetadataDialogShell
        isOpen={showMetadataDialog}
        loading={loading}
        title={isMiniGameContent ? '⚙️ إعدادات اللعبة' : '⚙️ إعدادات الاختبار'}
        onClose={() => setShowMetadataDialog(false)}
        footer={(
          <MetadataDialogFooter
            loading={loading}
            metadataChecking={metadataChecking}
            coverPreviewChecking={coverPreviewChecking}
            onCancel={() => setShowMetadataDialog(false)}
            onSave={saveMetadata}
          />
        )}
      >
        <MetadataDialogContent
          title={tempTitle}
          description={tempDescription}
          tempThemeId={tempThemeId}
          onThemeIdChange={setTempThemeId}
          shareUrl={shareUrl}
          onTitleChange={(value) => {
            setTempTitle(value)
            if (!quizId) {
              setTempSlug(ensureScopedSlug(titleToSlug(value) || 'quiz', ownerId))
            }
          }}
          onDescriptionChange={setTempDescription}
          onCopyShareUrl={() => { void copyEditorLink() }}
          onShareUrl={() => { void shareEditorLink() }}
          aiQuestionCount={aiQuestionCount}
          aiPrompt={aiPrompt}
          isGeneratingAi={isGeneratingAi}
          aiAction={aiAction}
          onQuestionCountChange={setAiQuestionCount}
          onPromptChange={setAiPrompt}
          onGenerateAi={handleGenerateAI}
          tempVisibility={tempVisibility}
          approvalStatus={approvalStatus}
          tempChallenge={tempChallenge}
          onVisibilityChange={setTempVisibility}
          onChallengeChange={setTempChallenge}
          isMiniGameContent={isMiniGameContent}
          selectedGameModeMeta={selectedGameModeMeta}
          showMiniGamePicker={showMiniGamePicker}
          miniGameCards={miniGameCards}
          tempGameModeId={tempGameModeId}
          isSubscribed={isSubscribed}
          onOpenMiniGamePicker={() => setShowMiniGamePicker(true)}
          onCloseMiniGamePicker={() => setShowMiniGamePicker(false)}
          onSelectMiniGame={(id) => {
            setTempGameModeId(id)
            setShowMiniGamePicker(false)
          }}
          onPremiumLocked={() => openUpgradeDialog('This mini game is premium. Please upgrade your account to select it.')}
          tempRandomizeQuestions={tempRandomizeQuestions}
          tempEnableScholarRole={tempEnableScholarRole}
          onRandomizeChange={setTempRandomizeQuestions}
          onScholarRoleChange={setTempEnableScholarRole}
          tempAllDuration={tempAllDuration}
          onDurationChange={setTempAllDuration}
          onApplyDurationToAll={applyDurationToAllQuestions}
          tempCoverImage={tempCoverImage}
          defaultCoverImage={DEFAULT_COVER_IMAGE}
          coverPreviewChecking={coverPreviewChecking}
          coverPreviewError={coverPreviewError}
          uploadingCover={uploadingCover}
          isGeneratingCoverImage={isGeneratingCoverImage}
          onCoverUrlChange={setTempCoverImage}
          onUploadCoverClick={handleUploadCoverImage}
          onGenerateCoverClick={() => { void handleGenerateCoverImage() }}
          onOpenCoverLibraryClick={openCoverAssetsLibrary}
          onUseDefaultCoverClick={() => setTempCoverImage(DEFAULT_COVER_IMAGE)}
        />
      </MetadataDialogShell>

      {/* ── Unified Workspace Header ── */}
      <EditorUnifiedHeader
        quizId={quizId}
        isMiniGameContent={isMiniGameContent}
        isNarrowScreen={isNarrowScreen}
        contentType={contentType}
        
        // Hero Props
        coverImage={coverImage}
        placeholderImage={placeholderImg}
        uploadingCover={uploadingCover}
        title={title}
        visibility={visibility}
        approvalStatus={approvalStatus}
        onTitleChange={(value) => {
          setTitle(value)
          setHasUnsavedChanges(true)
        }}
        onPlayQuiz={(id) => { void launchGameFromEditor(id) }}

        // Toolbar Props
        showToolbarDropdown={showToolbarDropdown}
        isSaving={status.kind === 'saving'}
        hasUnsavedChanges={hasUnsavedChanges}
        onToggleDropdown={() => setShowToolbarDropdown((v) => !v)}
        onCloseDropdown={() => setShowToolbarDropdown(false)}
        onOpenContentTypePicker={() => setShowContentTypePicker(true)}
        onBack={() => navigate(-1)}
        onOpenMetadata={openMetadataDialog}
        onPreviewQuiz={() => { if (quizId) window.open(`/preview/${quizId}`, '_blank') }}
        onCopyLink={() => { void copyEditorLink() }}
        onShareLink={() => { void shareEditorLink() }}
        onDeleteQuiz={handleDeleteQuiz}
        onAddQuestion={() => showAddQuestionDialog()}
        onGenerateAI={() => { setAiAction('generate'); void incrementPlatformStat('aiGenerateClicks') }}
        onRecheckAI={() => { setAiAction('recheck'); void incrementPlatformStat('aiRecheckClicks') }}
        isGeneratingAI={isGeneratingAi && aiGeneratingMode === 'generate'}
        isRecheckingAI={isGeneratingAi && aiGeneratingMode === 'recheck'}
        onSave={() => { void saveQuiz() }}
      />

      {isMiniGameContent ? (
        <MiniGameConfigurationPanel
          gameModeId={gameModeId}
          miniGameCards={miniGameCards}
          miniGameConfig={miniGameConfig}
          uploadingMiniGameImage={uploadingMiniGameImage}
          onOpenMetadata={openMetadataDialog}
          onUpdateMiniGameConfig={updateMiniGameConfig}
          onPickMiniGamePuzzleImage={pickMiniGamePuzzleImage}
        />
      ) : (
        <>
          {/* ── Slideshow shell ── */}
          <div className={`slide-editor-shell${slidePanel.orientation === 'bottom' ? ' slide-editor-shell--bottom' : ''}`}>

            {/* Left thumbnail panel */}
            {slidePanel.visible && slidePanel.orientation === 'left' && questions.length > 0 && (
              <SlidePanel
                questions={questions}
                activeIndex={activeQuestionIndex}
                orientation="left"
                onSelect={setActiveQuestionIndex}
                onAdd={() => showAddQuestionDialog()}
                onReorder={moveQuestion}
              />
            )}

            {/* Main editor area */}
            <div className="slide-editor-main">

              <QuestionSection
                quizId={quizId}
                questions={questions}
                collapsedQuestions={collapsedQuestions}
                dragIndex={dragIndex}
                dragOverIndex={dragOverIndex}
                isNarrowScreen={isNarrowScreen}
                isSubscribed={isSubscribed}
                gameModeId={gameModeId}
                miniGameCards={miniGameCards}
                uploadingMiniGameImage={uploadingMiniGameImage}
                uploadingPairImageKey={uploadingPairImageKey}
                uploadingIndex={uploadingIndex}
                questionTypeOptions={questionTypeOptions}
                onSetDragIndex={setDragIndex}
                onSetDragOverIndex={setDragOverIndex}
                onMoveQuestion={moveQuestion}
                onToggleCollapse={(index) => setCollapsedQuestions((prev) => { const n = [...prev]; n[index] = !n[index]; return n })}
                onRemoveQuestion={removeQuestion}
                onUpdateQuestion={updateQuestion}
                onReplaceQuestion={replaceQuestion}
                onShowDialog={showDialog}
                onHideDialog={hideDialog}
                onShowToast={showToast}
                onOpenUpgradeDialog={openUpgradeDialog}
                onOpenMiniGamePuzzleCropPicker={openMiniGamePuzzleCropPicker}
                onUploadPairImage={uploadMatchPairImage}
                onSetUploadingIndex={setUploadingIndex}
                isPremiumQuestionType={isPremiumQuestionType}
                quizTitle={title}
                quizDescription={description}
                activeIndex={activeQuestionIndex}
              />

              <MixContentAddSection
                isVisible={contentType === 'mix'}
                onAddQuestion={() => showAddQuestionDialog()}
                onAddMiniGame={() => showAddQuestionDialog('minigames')}
              />

            </div>{/* /slide-editor-main */}

            {/* Bottom thumbnail panel */}
            {slidePanel.visible && slidePanel.orientation === 'bottom' && questions.length > 0 && (
              <SlidePanel
                questions={questions}
                activeIndex={activeQuestionIndex}
                orientation="bottom"
                onSelect={setActiveQuestionIndex}
                onAdd={() => showAddQuestionDialog()}
                onReorder={moveQuestion}
              />
            )}
          </div>{/* /slide-editor-shell */}
        </>
      )}

      {/* AI Generating Overlay */}
      {isGeneratingAi && <AiGeneratingOverlay mode={aiGeneratingMode} />}

      <AiSelectionOverlay
        isOpen={showAiSelectionOverlay}
        isNarrowScreen={isNarrowScreen}
        aiConflictData={aiConflictData}
        aiSuggestedTitle={aiSuggestedTitle}
        selectedAiIndices={selectedAiIndices}
        existingQuestionsCount={questions.length}
        onToggleAll={() => {
          if (!aiConflictData) return
          if (selectedAiIndices.length === aiConflictData.questions.length) setSelectedAiIndices([])
          else setSelectedAiIndices(aiConflictData.questions.map((_, i) => i))
        }}
        onClose={() => setShowAiSelectionOverlay(false)}
        onToggleIndex={(idx) => {
          setSelectedAiIndices(prev =>
            prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx]
          )
        }}
        onResolve={handleConflictResolve}
      />

      <AddBlockPickerOverlay
        isOpen={showAddBlockPicker}
        miniGameCards={miniGameCards}
        onClose={() => setShowAddBlockPicker(false)}
        onSelect={(id) => addMiniGameBlock(id)}
      />

      <ImageCropDialog
        isOpen={showCropDialog}
        imageSrc={cropImageSrc}
        title="Crop Puzzle Image"
        ratioPresets={[{ id: 'square', label: 'Square 1:1', ratio: 1 }]}
        onClose={closeCropDialog}
        onConfirm={handleMiniGamePuzzleCropConfirm}
      />

      <AIFeaturesDialog
        aiAction={aiAction}
        isNarrowScreen={isNarrowScreen}
        aiPrompt={aiPrompt}
        aiQuestionCount={aiQuestionCount}
        isGeneratingAi={isGeneratingAi}
        isUploadingAiFile={isUploadingAiFile}
        aiContextFiles={aiContextFiles}
        questionsCount={questions.length}
        onClose={() => setAiAction(null)}
        onPromptChange={setAiPrompt}
        onQuestionCountChange={setAiQuestionCount}
        onAiFileUpload={handleAiFileUpload}
        onRemoveAiFile={removeAiFile}
        onGenerate={handleGenerateAI}
      />

      <EditorAnimationKeyframes />
    </div>
  )
}
