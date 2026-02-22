import { useEffect, useState } from 'react'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../lib/firebase'
import { useNavigate, useParams } from 'react-router-dom'
import { auth } from '../lib/firebase'
import { useDialog } from '../lib/DialogContext'
import { useToast } from '../lib/ToastContext'
import type { ChallengePreset, QuizDoc, QuizMedia, QuizQuestion, QuestionType } from '../types/quiz'
import { createQuiz, findQuizByOwnerAndSlug, getQuizById, updateQuiz } from '../lib/quizRepo'

const SERVER_BASE = import.meta.env.VITE_API_BASE_URL ||
  (typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:3001'
    : 'https://quizengine.onrender.com')

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
  text: 'سؤال جديد',
  options: ['A', 'B', 'C', 'D'],
  correctIndex: 0,
  duration: 20,
}

const DEFAULT_OPTIONS = ['A', 'B', 'C', 'D']

function getQuestionDefaults(type: QuestionType): QuizQuestion {
  if (type === 'single') return { type, text: 'سؤال اختيار واحد', options: [...DEFAULT_OPTIONS], correctIndex: 0, duration: 20 }
  if (type === 'multi') return { type, text: 'سؤال اختيار متعدد', options: [...DEFAULT_OPTIONS], correctIndices: [0], duration: 25 }
  if (type === 'match') {
    return {
      type,
      text: 'سؤال مطابقة',
      pairs: [
        { left: 'A', right: '1' },
        { left: 'B', right: '2' },
        { left: 'C', right: '3' },
        { left: 'D', right: '4' },
      ],
      duration: 35,
    }
  }
  if (type === 'order') return { type, text: 'سؤال ترتيب', items: ['العنصر 1', 'العنصر 2', 'العنصر 3', 'العنصر 4'], correctOrder: [0, 1, 2, 3], duration: 30 }
  if (type === 'type') return { type, text: 'Type Sprint', acceptedAnswers: [''], inputPlaceholder: 'Type your answer', duration: 20 }
  return { type: 'boss', text: 'Boss Battle', options: [...DEFAULT_OPTIONS], correctIndex: 0, bossName: 'Tooryan Boss', bossHp: 100, duration: 25 }
}

function coerceQuestionToType(existing: QuizQuestion, type: QuestionType): QuizQuestion {
  const base = getQuestionDefaults(type)
  if (type === 'single' || type === 'boss') {
    return {
      ...base,
      text: existing.text || base.text,
      media: existing.media,
      duration: existing.duration ?? base.duration,
      options: (existing.options && existing.options.length > 0 ? existing.options : base.options)!.slice(0, 6),
      correctIndex: typeof existing.correctIndex === 'number' ? existing.correctIndex : base.correctIndex,
      bossName: type === 'boss' ? (existing.bossName || base.bossName) : undefined,
      bossHp: type === 'boss' ? (existing.bossHp || base.bossHp) : undefined,
    }
  }
  if (type === 'multi') {
    return {
      ...base,
      text: existing.text || base.text,
      media: existing.media,
      duration: existing.duration ?? base.duration,
      options: (existing.options && existing.options.length > 0 ? existing.options : base.options)!.slice(0, 6),
      correctIndices: (existing.correctIndices && existing.correctIndices.length > 0 ? existing.correctIndices : base.correctIndices) || [0],
    }
  }
  if (type === 'match') {
    return {
      ...base,
      text: existing.text || base.text,
      media: existing.media,
      duration: existing.duration ?? base.duration,
      pairs: existing.pairs && existing.pairs.length > 0 ? existing.pairs : base.pairs,
    }
  }
  if (type === 'order') {
    return {
      ...base,
      text: existing.text || base.text,
      media: existing.media,
      duration: existing.duration ?? base.duration,
      items: existing.items && existing.items.length > 0 ? existing.items : base.items,
      correctOrder: existing.correctOrder && existing.correctOrder.length > 0 ? existing.correctOrder : base.correctOrder,
    }
  }

  return {
    ...base,
    text: existing.text || base.text,
    media: existing.media,
    duration: existing.duration ?? base.duration,
    acceptedAnswers: existing.acceptedAnswers && existing.acceptedAnswers.length > 0 ? existing.acceptedAnswers : base.acceptedAnswers,
    inputPlaceholder: existing.inputPlaceholder || base.inputPlaceholder,
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

function normalizeSlugTail(t: string): string {
  return t
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50)
}

function getSlugTail(raw: string, ownerId: string): string {
  const prefix = getOwnerSlugPrefix(ownerId)
  if (!prefix) return raw
  if (raw.startsWith(`${prefix}-`)) return raw.slice(prefix.length + 1)
  return raw
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
  const [quizId, setQuizId] = useState<string | null>(routeId ?? null)
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'private'>('public')
  const [challengePreset, setChallengePreset] = useState<ChallengePreset>('classic')
  const [enableScholarRole, setEnableScholarRole] = useState(false)
  const [questions, setQuestions] = useState<QuizQuestion[]>([starterQuestion])
  const [showMetadataDialog, setShowMetadataDialog] = useState(false)
  const [tempTitle, setTempTitle] = useState('')
  const [tempSlug, setTempSlug] = useState('')
  const [tempVisibility, setTempVisibility] = useState<'public' | 'private'>('public')
  const [tempChallenge, setTempChallenge] = useState<ChallengePreset>('classic')
  const [tempEnableScholarRole, setTempEnableScholarRole] = useState(false)
  const [metadataChecking, setMetadataChecking] = useState(false)
  const [randomizeQuestions, setRandomizeQuestions] = useState(false)
  const [tempRandomizeQuestions, setTempRandomizeQuestions] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null)
  const [coverImage, setCoverImage] = useState<string>('')
  const [tempCoverImage, setTempCoverImage] = useState<string>('')
  const [uploadingCover, setUploadingCover] = useState(false)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
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
  const [loading, setLoading] = useState(!!routeId)

  const ownerId = auth.currentUser?.uid ?? ''

  const moveQuestion = (from: number, to: number) => {
    if (from === to) return
    setHasUnsavedChanges(true)
    setQuestions((prev) => {
      const next = [...prev]
      const [item] = next.splice(from, 1)
      next.splice(to, 0, item)
      return next
    })
  }

  const openMetadataDialog = () => {
    setTempTitle(title)
    setTempSlug(ensureScopedSlug(slug, ownerId))
    setTempVisibility(visibility)
    setTempChallenge(challengePreset)
    setTempEnableScholarRole(enableScholarRole)
    setTempRandomizeQuestions(randomizeQuestions)
    setTempCoverImage(coverImage)
    setShowMetadataDialog(true)
  }

  const saveMetadata = async () => {
    if (metadataChecking) return
    const nextTitle = tempTitle.trim()
    const nextTail = normalizeSlugTail(getSlugTail(tempSlug, ownerId))
    if (!nextTitle || !nextTail) {
      showStatus({ kind: 'error', msg: 'يجب إدخال اسم الاختبار ورابط صالح.' })
      return
    }
    if (!ownerId) {
      showStatus({ kind: 'error', msg: 'يجب تسجيل الدخول أولاً.' })
      return
    }
    const nextSlug = ensureScopedSlug(nextTail, ownerId)
    setMetadataChecking(true)
    try {
      const existing = await findQuizByOwnerAndSlug(ownerId, nextSlug)
      if (existing && existing.id !== quizId) {
        showStatus({ kind: 'error', msg: 'هذا الرابط مستخدم بالفعل في اختبار آخر. غيّر الرابط وحاول مرة أخرى.' })
        return
      }
      setTitle(nextTitle)
      setSlug(nextSlug)
      setVisibility(tempVisibility)
      setChallengePreset(tempChallenge)
      setEnableScholarRole(tempEnableScholarRole)
      setRandomizeQuestions(tempRandomizeQuestions)
      setCoverImage(tempCoverImage)
      setShowMetadataDialog(false)
    } catch (error) {
      showStatus({ kind: 'error', msg: `فشل التحقق: ${(error as Error).message}` })
    } finally {
      setMetadataChecking(false)
    }
  }

  useEffect(() => {
    if (!routeId) {
      setTitle('New Quiz')
      setSlug(ensureScopedSlug('new-quiz', ownerId))
      setTempTitle('New Quiz')
      setTempSlug(ensureScopedSlug('new-quiz', ownerId))
      setTimeout(() => setShowMetadataDialog(true), 500)
      return
    }
    getQuizById(routeId)
      .then((data) => {
        if (!data) { showStatus({ kind: 'error', msg: 'لم يُعثر على الاختبار.' }); return }
        setTitle(data.title)
        setSlug(data.slug)
        setVisibility(data.visibility)
        setChallengePreset(data.challengePreset || 'classic')
        setEnableScholarRole(data.enableScholarRole ?? false)
        setRandomizeQuestions(data.randomizeQuestions ?? false)
        setCoverImage(data.coverImage ?? '')
        setQuestions(data.questions)
        setHasUnsavedChanges(false)
      })
      .catch((err) => showStatus({ kind: 'error', msg: `فشل التحميل: ${err.message}` }))
      .finally(() => setLoading(false))
  }, [routeId, ownerId])

  if (loading) return <section className="panel"><p>Loading quiz...</p></section>

  const slugTailValue = getSlugTail(tempSlug, ownerId)
  const slugTailNormalized = normalizeSlugTail(slugTailValue)
  const slugTailInvalid = !slugTailNormalized

  const replaceQuestion = (index: number, next: QuizQuestion) => {
    setHasUnsavedChanges(true)
    setQuestions((prev) => prev.map((q, i) => (i === index ? next : q)))
  }

  const updateQuestion = (index: number, patch: Partial<QuizQuestion>) => {
    setHasUnsavedChanges(true)
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)))
  }

  const addQuestion = () => {
    setHasUnsavedChanges(true)
    setQuestions((prev) => [...prev, { ...starterQuestion }])
  }

  const loadSamples = () => {
    setHasUnsavedChanges(true)
    setTitle('Animals Pack Quiz')
    setSlug('animals-pack-quiz')
    setQuestions(SAMPLE_QUESTIONS)
    showStatus({ kind: 'info', msg: 'تم تحميل عينات تتضمن Type Sprint و Boss Battle — اضغط حفظ للتخزين.' })
  }

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
      },
    })
  }

  const saveQuiz = async () => {
    if (!ownerId) {
      showStatus({ kind: 'error', msg: 'خطأ: يجب تسجيل الدخول أولاً.' })
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
      title,
      slug,
      visibility,
      challengePreset,
      enableScholarRole,
      randomizeQuestions,
      ...(coverImage ? { coverImage } : {}),
      tags: ['animals'],
      questions,
    }

    showStatus({ kind: 'saving' })
    showToast({ message: '⏳ جارٍ الحفظ...', type: 'info', durationMs: 2000 })
    try {
      if (quizId) {
        await updateQuiz(quizId, payload)
        showStatus({ kind: 'idle' })
        setHasUnsavedChanges(false)
        showToast({ message: 'تم تحديث الاختبار بنجاح', type: 'success' })
      } else {
        const id = await createQuiz(payload)
        setQuizId(id)
        showStatus({ kind: 'idle' })
        setHasUnsavedChanges(false)
        showToast({ message: 'تم حفظ الاختبار بنجاح', type: 'success' })
      }
    } catch (error) {
      showStatus({ kind: 'error', msg: `فشل الحفظ: ${(error as Error).message}` })
    }
  }

  return (
    <>
      {/* Metadata Dialog */}
      {showMetadataDialog && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.7)',
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
              backgroundColor: '#0f172a',
              borderRadius: '16px',
              border: '1px solid #334155',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.9)',
              minWidth: '440px',
              maxWidth: '540px',
              padding: '2rem',
              animation: 'slideUp 0.3s ease-out',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#f1f5f9', fontSize: '1.3rem', fontWeight: 800 }}>⚙️ إعدادات الاختبار</h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.9em', opacity: 0.7, display: 'block', marginBottom: '0.5rem' }}>اسم الاختبار</label>
                <input
                  type="text"
                  value={tempTitle}
                  onChange={(e) => {
                    setTempTitle(e.target.value)
                    setTempSlug(ensureScopedSlug(titleToSlug(e.target.value) || 'quiz', ownerId))
                  }}
                  placeholder="مثلاً: اختبار الحيوانات"
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    borderRadius: '8px',
                    border: '1px solid #334155',
                    backgroundColor: '#1e293b',
                    color: '#fff',
                    boxSizing: 'border-box',
                    fontSize: '1em',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.9em', opacity: 0.7, display: 'block', marginBottom: '0.5rem' }}>رابط المشاركة (URL)</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <span style={{ padding: '0.75rem', color: '#888', whiteSpace: 'nowrap' }}>{SERVER_BASE}/?quiz=</span>
                  {getOwnerSlugPrefix(ownerId) && (
                    <span style={{ padding: '0.75rem', color: '#aaa', whiteSpace: 'nowrap' }}>{getOwnerSlugPrefix(ownerId)}-</span>
                  )}
                  <input
                    type="text"
                    value={slugTailValue}
                    onChange={(e) => {
                      const nextTail = normalizeSlugTail(e.target.value)
                      const prefix = getOwnerSlugPrefix(ownerId)
                      const nextSlug = nextTail ? ensureScopedSlug(nextTail, ownerId) : (prefix ? `${prefix}-` : '')
                      setTempSlug(nextSlug)
                    }}
                    placeholder="quiz-slug"
                    style={{
                      flex: 1,
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '1px solid #334155',
                      backgroundColor: '#1e293b',
                      color: '#fff',
                      boxSizing: 'border-box',
                      fontSize: '1em',
                    }}
                  />
                </div>
                {slugTailInvalid && (
                  <p style={{ marginTop: '0.4rem', fontSize: '0.8em', color: '#f88' }}>
                    الرجاء إدخال رابط صالح (أحرف وأرقام فقط).
                  </p>
                )}
                <p style={{ marginTop: '0.4rem', fontSize: '0.8em', opacity: 0.7 }}>
                  يتم تثبيت معرّف حسابك قبل الرابط لضمان التفرد بين المستخدمين.
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div>
                  <label style={{ fontSize: '0.9em', opacity: 0.7, display: 'block', marginBottom: '0.5rem' }}>الخصوصية</label>
                  <select
                    value={tempVisibility}
                    onChange={(e) => setTempVisibility(e.target.value as 'public' | 'private')}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '1px solid #334155',
                      backgroundColor: '#1e293b',
                      color: '#fff',
                      boxSizing: 'border-box',
                      fontSize: '1em',
                    }}
                  >
                    <option value="public">عام</option>
                    <option value="private">خاص</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '0.9em', opacity: 0.7, display: 'block', marginBottom: '0.5rem' }}>مستوى الصعوبة</label>
                  <select
                    value={tempChallenge}
                    onChange={(e) => setTempChallenge(e.target.value as ChallengePreset)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      border: '1px solid #334155',
                      backgroundColor: '#1e293b',
                      color: '#fff',
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

              {/* Randomize questions toggle */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', userSelect: 'none', background: '#1e293b', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #334155' }}>
                <input
                  type="checkbox"
                  checked={tempRandomizeQuestions}
                  onChange={(e) => setTempRandomizeQuestions(e.target.checked)}
                  style={{ width: '1.1rem', height: '1.1rem', accentColor: '#7c3aed', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.9em' }}>
                  <strong>🔀 ترتيب عشوائي للأسئلة</strong>
                  <span style={{ opacity: 0.6, marginRight: '0.4rem' }}>(تُخلط الأسئلة في كل جلسة)</span>
                </span>
              </label>

              {/* Scholar role toggle */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', userSelect: 'none', background: '#1e293b', padding: '0.75rem 1rem', borderRadius: '10px', border: '1px solid #334155' }}>
                <input
                  type="checkbox"
                  checked={tempEnableScholarRole}
                  onChange={(e) => setTempEnableScholarRole(e.target.checked)}
                  style={{ width: '1.1rem', height: '1.1rem', accentColor: '#1a5a8c', cursor: 'pointer' }}
                />
                <span style={{ fontSize: '0.9em' }}>
                  <strong>📘 تفعيل دور Scholar</strong>
                  <span style={{ opacity: 0.6, marginRight: '0.4rem' }}>(يرى أسئلة اللعبة مبكرًا)</span>
                </span>
              </label>

              {/* Cover image */}
              <div>
                <label style={{ fontSize: '0.9em', opacity: 0.7, display: 'block', marginBottom: '0.5rem' }}>🖼️ صورة الغلاف</label>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <input
                    type="text"
                    value={tempCoverImage}
                    onChange={(e) => setTempCoverImage(e.target.value)}
                    placeholder="https://..."
                    style={{
                      flex: 1, padding: '0.75rem', borderRadius: '8px',
                      border: '1px solid #334155', backgroundColor: '#1e293b',
                      color: '#fff', boxSizing: 'border-box', fontSize: '0.9em',
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
                      background: uploadingCover ? '#0f2a40' : '#1a5a8c',
                      color: uploadingCover ? '#7dd3fc' : '#fff',
                      cursor: uploadingCover ? 'not-allowed' : 'pointer',
                      whiteSpace: 'nowrap', fontSize: '0.85em', fontWeight: 600,
                    }}
                  >
                    {uploadingCover ? '⏳' : '📁 رفع'}
                  </button>
                </div>
                {tempCoverImage && (
                  <div style={{ marginTop: '0.5rem', borderRadius: '10px', overflow: 'hidden', height: '110px', position: 'relative' }}>
                    <img
                      src={tempCoverImage}
                      alt="cover preview"
                      style={{ width: '100%', height: '110px', objectFit: 'cover', display: 'block' }}
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                    />
                    <button
                      type="button"
                      onClick={() => setTempCoverImage('')}
                      style={{
                        position: 'absolute', top: '6px', left: '6px',
                        background: 'rgba(0,0,0,0.7)', border: 'none', color: '#fff',
                        borderRadius: '50%', width: '24px', height: '24px',
                        cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >✕</button>
                  </div>
                )}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '2rem' }}>
              {!loading && (
                <button
                  onClick={() => setShowMetadataDialog(false)}
                  disabled={metadataChecking}
                  style={{
                    padding: '0.75rem 1.5rem',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#1e293b',
                    color: '#94a3b8',
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
                disabled={metadataChecking}
                style={{
                  padding: '0.75rem 1.5rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                  color: '#fff',
                  cursor: metadataChecking ? 'not-allowed' : 'pointer',
                  opacity: metadataChecking ? 0.6 : 1,
                  fontSize: '1em',
                }}
              >
                {metadataChecking ? '⏳ جارٍ التحقق...' : 'موافق'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Hero header ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
        border: '1px solid #1e293b',
        borderRadius: '16px',
        marginBottom: '1.25rem',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Cover image */}
        {coverImage ? (
          <div style={{ width: '100%', height: '180px', overflow: 'hidden', position: 'relative' }}>
            <img src={coverImage} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.65 }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #0f172a 0%, transparent 60%)' }} />
          </div>
        ) : (
          <div style={{
            position: 'absolute', top: '-40px', right: '-40px',
            width: '200px', height: '200px', borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
            pointerEvents: 'none',
          }} />
        )}
        <div style={{ padding: '1.5rem 2rem' }}>
          <h1 style={{ margin: '0 0 0.75rem', fontSize: '1.5rem', fontWeight: 800, color: '#f1f5f9' }}>
            {title || 'اختبار جديد'}
          </h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
            <span style={{
              background: challengePreset === 'easy' ? '#16a34a' : challengePreset === 'hard' ? '#dc2626' : '#2563eb',
              color: '#fff', fontSize: '0.72rem', fontWeight: 700, padding: '3px 12px', borderRadius: '999px',
            }}>
              {challengePreset === 'easy' ? 'سهل' : challengePreset === 'hard' ? 'صعب' : 'عادي'}
            </span>
            <span style={{
              background: '#1e293b', color: visibility === 'public' ? '#86efac' : '#fca5a5',
              fontSize: '0.72rem', fontWeight: 600, padding: '3px 12px', borderRadius: '999px',
              border: `1px solid ${visibility === 'public' ? '#16a34a44' : '#dc262644'}`,
            }}>
              {visibility === 'public' ? '🌐 عام' : '🔒 خاص'}
            </span>
            <span style={{ background: '#1e293b', color: '#94a3b8', fontSize: '0.72rem', padding: '3px 12px', borderRadius: '999px' }}>
              📝 {questions.length} سؤال
            </span>
            {randomizeQuestions && (
              <span style={{ background: '#1e293b', color: '#a78bfa', fontSize: '0.72rem', padding: '3px 12px', borderRadius: '999px', border: '1px solid #7c3aed44' }}>
                🔀 عشوائي
              </span>
            )}
            {quizId && (
              <a
                href={`${SERVER_BASE}/?quiz=${quizId}`}
                target="_blank" rel="noopener noreferrer"
                style={{ background: '#1e293b', color: '#60a5fa', fontSize: '0.72rem', padding: '3px 12px', borderRadius: '999px', textDecoration: 'none' }}
              >
                🔗 رابط اللعبة ↗
              </a>
            )}
          </div>
        </div>
      </div>

      {/* ── Sticky toolbar ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: '#0f172a',
        border: '1px solid #1e293b',
        borderRadius: '14px',
        padding: '0.75rem 1.25rem',
        marginBottom: '1.25rem',
        boxShadow: '0 4px 20px rgba(0,0,0,0.7)',
      }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            onClick={openMetadataDialog}
            style={{
              background: '#1e293b', border: '1px solid #334155', color: '#94a3b8',
              padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.85rem',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#334155'; e.currentTarget.style.color = '#e2e8f0' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.color = '#94a3b8' }}
          >
            ⚙️ إعدادات
          </button>
          <button
            type="button"
            onClick={addQuestion}
            style={{
              background: '#1e293b', border: '1px solid #334155', color: '#94a3b8',
              padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.85rem',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#334155'; e.currentTarget.style.color = '#e2e8f0' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.color = '#94a3b8' }}
          >
            + إضافة سؤال
          </button>
          <button
            type="button"
            onClick={loadSamples}
            style={{
              background: '#1e293b', border: '1px solid #334155', color: '#64748b',
              padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.85rem',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#334155'; e.currentTarget.style.color = '#94a3b8' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.color = '#64748b' }}
          >
            تحميل عينات
          </button>
          {quizId && (
            <button
              type="button"
              onClick={() => window.open(`/preview/${quizId}`, '_blank')}
              style={{
                background: '#1e293b', border: '1px solid #0e7490', color: '#22d3ee',
                padding: '0.5rem 1rem', borderRadius: '8px', fontSize: '0.85rem',
                cursor: 'pointer', transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = '#0e7490'; e.currentTarget.style.color = '#fff' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.color = '#22d3ee' }}
            >
              👁️ معاينة
            </button>
          )}
          <div style={{ flex: 1 }} />

          {/* User profile chip */}
          {auth.currentUser && (() => {
            const user = auth.currentUser!
            const name = user.displayName || user.email?.split('@')[0] || 'مستخدم'
            const initials = name.slice(0, 2).toUpperCase()
            return (
              <div style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                background: '#1e293b', border: '1px solid #334155',
                borderRadius: '999px', padding: '0.3rem 0.75rem 0.3rem 0.35rem',
              }}>
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={name}
                    referrerPolicy="no-referrer"
                    style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                  />
                ) : (
                  <div style={{
                    width: '26px', height: '26px', borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.65rem', fontWeight: 700, color: '#fff',
                  }}>
                    {initials}
                  </div>
                )}
                <span style={{ fontSize: '0.78rem', color: '#cbd5e1', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {name}
                </span>
              </div>
            )
          })()}

          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            style={{
              background: 'transparent', border: 'none', color: '#64748b',
              padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.85rem', cursor: 'pointer',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#94a3b8' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#64748b' }}
          >
            ← لوحة التحكم
          </button>
          <button
            type="button"
            onClick={saveQuiz}
            disabled={status.kind === 'saving'}
            style={{
              background: hasUnsavedChanges
                ? 'linear-gradient(135deg, #d97706, #b45309)'
                : 'linear-gradient(135deg, #2563eb, #7c3aed)',
              border: 'none', color: '#fff',
              padding: '0.5rem 1.25rem', borderRadius: '8px', fontSize: '0.85rem',
              fontWeight: 700, cursor: status.kind === 'saving' ? 'not-allowed' : 'pointer',
              opacity: status.kind === 'saving' ? 0.6 : 1,
              boxShadow: hasUnsavedChanges ? '0 0 0 2px #fbbf2444' : undefined,
            }}
          >
            {status.kind === 'saving' ? '⏳ جارٍ الحفظ...' : hasUnsavedChanges ? '💾 حفظ ●' : '💾 حفظ'}
          </button>
        </div>
      </div>

      {questions.map((q, index) => (
        <section
          key={index}
          className="panel"
          draggable
          onDragStart={() => setDragIndex(index)}
          onDragOver={(e) => { e.preventDefault(); setDragOverIndex(index) }}
          onDrop={() => { if (dragIndex !== null) moveQuestion(dragIndex, index); setDragIndex(null); setDragOverIndex(null) }}
          onDragEnd={() => { setDragIndex(null); setDragOverIndex(null) }}
          style={{
            backgroundColor: '#0f172a',
            border: dragOverIndex === index && dragIndex !== index
              ? '1px solid #7c3aed'
              : '1px solid #1e293b',
            borderLeft: dragOverIndex === index && dragIndex !== index
              ? '6px solid #7c3aed'
              : '6px solid #3b82f6',
            padding: '1.2rem',
            borderRadius: '14px',
            marginBottom: '1.25rem',
            boxShadow: dragIndex === index
              ? '0 0 0 2px #3b82f6, 0 8px 30px rgba(0,0,0,0.8)'
              : '0 4px 20px rgba(0,0,0,0.5)',
            opacity: dragIndex === index ? 0.5 : 1,
            cursor: 'default',
            transition: 'border-color 0.15s, box-shadow 0.15s, opacity 0.15s',
          }}
        >
          {/* Header with question number and type badge */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span
                draggable={false}
                style={{ fontSize: '1.2rem', color: '#475569', cursor: 'grab', userSelect: 'none', lineHeight: 1, paddingTop: '2px' }}
                title="اسحب لإعادة الترتيب"
              >⠿</span>
              <h3 style={{ margin: '0', fontSize: '1.1em', color: '#fff' }}>
                سؤال {index + 1}
              </h3>
              <select
                value={q.type}
                onChange={(e) => {
                  const nextType = e.target.value as QuestionType
                  replaceQuestion(index, coerceQuestionToType(q, nextType))
                }}
                style={{
                  padding: '0.2rem 0.5rem',
                  borderRadius: '4px',
                  border: '1px solid #475569',
                  backgroundColor: '#0f172a',
                  color: '#cbd5e1',
                  fontSize: '0.85em',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                <option value="single">اختيار واحد</option>
                <option value="multi">اختيار متعدد</option>
                <option value="match">مطابقة</option>
                <option value="order">ترتيب</option>
                <option value="type">Type Sprint</option>
                <option value="boss">Boss Battle</option>
              </select>
            </div>
            <button type="button" onClick={() => removeQuestion(index)} style={{ background: '#711', fontSize: '0.75em', padding: '0.3rem 0.6rem', borderRadius: '4px', border: 'none', color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap' }}>✕ حذف</button>
          </div>

          {/* Question text + meta (compact one line) */}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 120px', gap: '0.5rem', marginBottom: '0.5rem', alignItems: 'end' }}>
            <div>
              <label style={{ fontSize: '0.85em', color: '#e2e8f0', fontWeight: 'bold', display: 'block', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.3px' }}>نص السؤال</label>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <input
                  dir="auto"
                  value={q.text}
                  onChange={(e) => updateQuestion(index, { text: e.target.value })}
                  placeholder="اكتب السؤال في سطر واحد"
                  style={{
                    flex: 1,
                    padding: '0.4rem',
                    borderRadius: '4px',
                    border: '1px solid #475569',
                    backgroundColor: '#0f172a',
                    color: '#fff',
                    fontSize: '0.9em',
                    boxSizing: 'border-box',
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
                    padding: '0 0.75rem',
                    borderRadius: '4px',
                    border: '1px solid #475569',
                    backgroundColor: '#1a5a8c',
                    color: '#fff',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title="لصق النص"
                >
                  📋
                </button>
              </div>
            </div>
            <div>
              <label style={{ fontSize: '0.85em', color: '#e2e8f0', fontWeight: 'bold', display: 'block', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.3px' }}>المدة (ثانية)</label>
              <div style={{ display: 'flex', gap: '0.25rem' }}>
                <input
                  type="number"
                  value={q.duration || 20}
                  onChange={(e) => updateQuestion(index, { duration: Number(e.target.value) })}
                  placeholder="20"
                  style={{
                    width: '100%',
                    padding: '0.4rem',
                    borderRadius: '4px',
                    border: '1px solid #475569',
                    backgroundColor: '#0f172a',
                    color: '#fff',
                    fontSize: '0.9em',
                    boxSizing: 'border-box',
                  }}
                />
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) updateQuestion(index, { duration: Number(e.target.value) })
                  }}
                  style={{
                    width: '2rem',
                    padding: '0',
                    borderRadius: '4px',
                    border: '1px solid #475569',
                    backgroundColor: '#1a5a8c',
                    color: '#fff',
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                  title="اختر مدة جاهزة"
                >
                  <option value="" disabled>⏱️</option>
                  <option value="10">10 ثوانٍ</option>
                  <option value="20">20 ثانية</option>
                  <option value="30">30 ثانية</option>
                  <option value="45">45 ثانية</option>
                  <option value="60">60 ثانية</option>
                </select>
              </div>
            </div>
          </div>

          {/* Options section for single/multi/boss */}
          {(q.type === 'single' || q.type === 'boss' || q.type === 'multi') && (
            <div style={{ marginBottom: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #475569' }}>
              <label style={{ fontSize: '0.85em', color: '#e2e8f0', fontWeight: 'bold', display: 'block', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.3px' }}>الخيارات والإجابات الصحيحة</label>
              <p style={{ margin: '0 0 0.35rem 0', fontSize: '0.72em', opacity: 0.65 }}>
                {q.type === 'multi' ? 'يمكن اختيار أكثر من إجابة صحيحة.' : 'اختر إجابة صحيحة واحدة.'}
              </p>
              
              {/* Option cards with integrated correct answer selection */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.45rem' }}>
                {(q.options || []).map((opt, optIndex) => {
                  const isCorrectSingle = q.correctIndex === optIndex
                  const isCorrectMulti = (q.correctIndices || []).includes(optIndex)
                  const isCorrect = q.type === 'multi' ? isCorrectMulti : isCorrectSingle

                  return (
                    <div
                      key={optIndex}
                      style={{
                        display: 'flex',
                        gap: '0.5rem',
                        alignItems: 'center',
                        padding: '0.4rem',
                        borderRadius: '4px',
                        border: `2px solid ${isCorrect ? '#3b82f6' : '#475569'}`,
                        backgroundColor: isCorrect ? 'rgba(59, 130, 246, 0.2)' : '#0f172a',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {/* Checkbox/radio button for correct answer */}
                      <input
                        type={q.type === 'multi' ? 'checkbox' : 'radio'}
                        checked={isCorrect}
                        onChange={(e) => {
                          if (q.type === 'multi') {
                            const prev = new Set(q.correctIndices || [])
                            if (e.target.checked) prev.add(optIndex)
                            else prev.delete(optIndex)
                            updateQuestion(index, { correctIndices: [...prev].sort((a, b) => a - b) })
                          } else {
                            updateQuestion(index, { correctIndex: e.target.checked ? optIndex : 0 })
                          }
                        }}
                        style={{ width: '16px', height: '16px', cursor: 'pointer', accentColor: '#1a5a8c', flexShrink: 0 }}
                      />
                      <span style={{ fontSize: '0.75em', opacity: 0.7, minWidth: '1.1rem' }}>{String.fromCharCode(65 + optIndex)}</span>
                      
                      {/* Option text input */}
                      <input
                        value={opt}
                        onChange={(e) => {
                          const next = [...(q.options || [])]
                          next[optIndex] = e.target.value
                          updateQuestion(index, { options: next })
                        }}
                        placeholder={`الخيار ${optIndex + 1}`}
                        style={{
                          flex: 1,
                          padding: '0.3rem',
                          borderRadius: '3px',
                          border: '1px solid rgba(255,255,255,0.1)',
                          backgroundColor: 'rgba(0,0,0,0.3)',
                          color: '#fff',
                          fontSize: '0.9em',
                        }}
                      />
                      
                      {/* Correct indicator badge */}
                      {isCorrect && (
                        <span style={{ fontSize: '0.75em', color: '#1a9f5d', fontWeight: 'bold', whiteSpace: 'nowrap', flexShrink: 0 }}>✓</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {q.type === 'type' && (
            <div style={{ marginBottom: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #475569' }}>
              <label style={{ fontSize: '0.85em', color: '#e2e8f0', fontWeight: 'bold', display: 'block', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.3px' }}>إعدادات Type Sprint</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.8em', color: '#cbd5e1', fontWeight: 'bold', display: 'block', marginBottom: '0.3rem' }}>عنصر نائب الإدخال</label>
                  <input
                    value={q.inputPlaceholder || ''}
                    onChange={(e) => updateQuestion(index, { inputPlaceholder: e.target.value })}
                    placeholder="أدخل الإجابة"
                    style={{
                      width: '100%',
                      padding: '0.4rem',
                      borderRadius: '4px',
                      border: '1px solid #475569',
                      backgroundColor: '#0f172a',
                      color: '#fff',
                      fontSize: '0.85em',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8em', color: '#cbd5e1', fontWeight: 'bold', display: 'block', marginBottom: '0.3rem' }}>الإجابات المقبولة</label>
                  <input
                    value={(q.acceptedAnswers || []).join(', ')}
                    onChange={(e) => {
                      const values = e.target.value
                        .split(',')
                        .map((v) => v.trim())
                        .filter(Boolean)
                      updateQuestion(index, { acceptedAnswers: values })
                    }}
                    placeholder="إجابة1, إجابة2"
                    style={{
                      width: '100%',
                      padding: '0.4rem',
                      borderRadius: '4px',
                      border: '1px solid #475569',
                      backgroundColor: '#0f172a',
                      color: '#fff',
                      fontSize: '0.85em',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {q.type === 'boss' && (
            <div style={{ marginBottom: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #475569' }}>
              <label style={{ fontSize: '0.85em', color: '#e2e8f0', fontWeight: 'bold', display: 'block', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.3px' }}>إعدادات Boss Battle</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <label style={{ fontSize: '0.8em', color: '#cbd5e1', fontWeight: 'bold', display: 'block', marginBottom: '0.3rem' }}>اسم الـ Boss</label>
                  <input
                    value={q.bossName || ''}
                    onChange={(e) => updateQuestion(index, { bossName: e.target.value })}
                    placeholder="التنين الحارس"
                    style={{
                      width: '100%',
                      padding: '0.4rem',
                      borderRadius: '4px',
                      border: '1px solid #475569',
                      backgroundColor: '#0f172a',
                      color: '#fff',
                      fontSize: '0.85em',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.8em', color: '#cbd5e1', fontWeight: 'bold', display: 'block', marginBottom: '0.3rem' }}>نقاط HP</label>
                  <input
                    type="number"
                    min={1}
                    value={q.bossHp || 100}
                    onChange={(e) => updateQuestion(index, { bossHp: Number(e.target.value) })}
                    placeholder="100"
                    style={{
                      width: '100%',
                      padding: '0.4rem',
                      borderRadius: '4px',
                      border: '1px solid #475569',
                      backgroundColor: '#0f172a',
                      color: '#fff',
                      fontSize: '0.85em',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>
            </div>
          )}

          {q.type === 'match' && (
            <div style={{ marginBottom: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #475569' }}>
              <label style={{ fontSize: '0.85em', color: '#e2e8f0', fontWeight: 'bold', display: 'block', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.3px' }}>أزواج المطابقة</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {(q.pairs || []).map((pair, pairIndex) => (
                  <div key={pairIndex} style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '0.4rem', alignItems: 'center' }}>
                    <input
                      value={pair.left}
                      onChange={(e) => {
                        const next = [...(q.pairs || [])]
                        next[pairIndex] = { ...next[pairIndex], left: e.target.value }
                        updateQuestion(index, { pairs: next })
                      }}
                      placeholder="اليسار"
                      style={{
                        padding: '0.4rem',
                        borderRadius: '4px',
                        border: '1px solid #475569',
                        backgroundColor: '#0f172a',
                        color: '#fff',
                        fontSize: '0.85em',
                        boxSizing: 'border-box',
                      }}
                    />
                    <span style={{ color: '#888', fontSize: '0.8em' }}>↔</span>
                    <input
                      value={pair.right}
                      onChange={(e) => {
                        const next = [...(q.pairs || [])]
                        next[pairIndex] = { ...next[pairIndex], right: e.target.value }
                        updateQuestion(index, { pairs: next })
                      }}
                      placeholder="اليمين"
                      style={{
                        padding: '0.4rem',
                        borderRadius: '4px',
                        border: '1px solid #475569',
                        backgroundColor: '#0f172a',
                        color: '#fff',
                        fontSize: '0.85em',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {q.type === 'order' && (
            <div style={{ marginBottom: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #475569' }}>
              <label style={{ fontSize: '0.85em', color: '#e2e8f0', fontWeight: 'bold', display: 'block', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.3px' }}>عناصر الترتيب</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', marginBottom: '0.4rem' }}>
                {(q.items || []).map((item, itemIndex) => (
                  <input
                    key={itemIndex}
                    value={item}
                    onChange={(e) => {
                      const next = [...(q.items || [])]
                      next[itemIndex] = e.target.value
                      updateQuestion(index, { items: next })
                    }}
                    placeholder={`العنصر ${itemIndex + 1}`}
                    style={{
                      padding: '0.3rem',
                      borderRadius: '4px',
                      border: '1px solid #475569',
                      backgroundColor: '#0f172a',
                      color: '#fff',
                      fontSize: '0.85em',
                      boxSizing: 'border-box',
                    }}
                  />
                ))}
              </div>
              <div>
                <label style={{ fontSize: '0.8em', color: '#cbd5e1', fontWeight: 'bold', display: 'block', marginBottom: '0.3rem' }}>ترتيب صحيح (فهارس)</label>
                <input
                  value={(q.correctOrder || []).join(',')}
                  onChange={(e) => updateQuestion(index, { correctOrder: parseNumberList(e.target.value, (q.items || []).length) })}
                  placeholder="0,1,2,3"
                  style={{
                    width: '100%',
                    padding: '0.4rem',
                    borderRadius: '4px',
                    border: '1px solid #475569',
                    backgroundColor: '#0f172a',
                    color: '#fff',
                    fontSize: '0.85em',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          )}

          {/* Media section with beautiful card design */}
          <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid #475569' }}>
            <label style={{ fontSize: '0.85em', color: '#e2e8f0', fontWeight: 'bold', display: 'block', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.3px' }}>وسائط السؤال</label>
            
            {/* Media type selection */}
            <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.4rem', flexWrap: 'wrap' }}>
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
                        const { media: _, ...rest } = q
                        updateQuestion(index, rest as Partial<QuizQuestion>)
                      } else {
                        updateQuestion(index, { media: { type: option.value as QuizMedia['type'], url: q.media?.url ?? '' } })
                      }
                    }}
                    style={{
                      padding: '0.35rem 0.7rem',
                      borderRadius: '4px',
                      border: `2px solid ${isSelected ? '#3b82f6' : '#475569'}`,
                      backgroundColor: isSelected ? 'rgba(59, 130, 246, 0.2)' : '#0f172a',
                      color: isSelected ? '#3b82f6' : '#cbd5e1',
                      cursor: 'pointer',
                      fontSize: '0.8em',
                      transition: 'all 0.2s ease',
                      fontWeight: isSelected ? 600 : 400,
                    }}
                  >
                    {option.label}
                  </button>
                )
              })}
            </div>

            {/* Media URL input */}
            {q.media && (
              <div style={{ marginBottom: '0.4rem' }}>
                <label style={{ fontSize: '0.8em', color: '#cbd5e1', fontWeight: 'bold', display: 'block', marginBottom: '0.3rem' }}>رابط الوسائط</label>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <input
                    value={q.media.url}
                    onChange={(e) => updateQuestion(index, { media: { ...q.media!, url: e.target.value } })}
                    placeholder={q.media.type === 'video' ? 'https://www.youtube.com/embed/...' : 'https://...'}
                    style={{
                      flex: 1,
                      padding: '0.4rem',
                      borderRadius: '4px',
                      border: '1px solid #475569',
                      backgroundColor: '#0f172a',
                      color: '#fff',
                      fontSize: '0.85em',
                      boxSizing: 'border-box',
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
                      padding: '0 0.75rem',
                      borderRadius: '4px',
                      border: '1px solid #475569',
                      backgroundColor: uploadingIndex === index ? '#0f2a40' : '#1a5a8c',
                      color: uploadingIndex === index ? '#7dd3fc' : '#fff',
                      cursor: uploadingIndex === index ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      minWidth: '2.5rem',
                      fontSize: '0.8em',
                    }}
                    title={uploadingIndex === index ? 'جارٍ الرفع...' : 'رفع ملف'}
                  >
                    {uploadingIndex === index ? (
                      <>
                        <span style={{
                          display: 'inline-block',
                          width: '12px',
                          height: '12px',
                          border: '2px solid #7dd3fc',
                          borderTopColor: 'transparent',
                          borderRadius: '50%',
                          animation: 'spin 0.7s linear infinite',
                        }} />
                        <span>رفع...</span>
                      </>
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
                      padding: '0 0.75rem',
                      borderRadius: '4px',
                      border: '1px solid #475569',
                      backgroundColor: '#1a5a8c',
                      color: '#fff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
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
                marginTop: '0.4rem',
                padding: '0.5rem',
                borderRadius: '6px',
                border: '1px solid #475569',
                backgroundColor: 'rgba(26, 90, 140, 0.05)',
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
        </section>
      ))}

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
