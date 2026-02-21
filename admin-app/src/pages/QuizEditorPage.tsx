import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { auth } from '../lib/firebase'
import type { QuizDoc, QuizMedia, QuizQuestion } from '../types/quiz'
import { createQuiz, getQuizById, updateQuiz } from '../lib/quizRepo'

const SAMPLE_QUESTIONS: QuizQuestion[] = [
  {
    type: 'single', duration: 20,
    text: '🐋 ما هو أكبر حيوان في العالم؟',
    options: ['الفيل', 'الحوت الأزرق', 'القرش الأبيض', 'الزرافة'],
    correctIndex: 1,
    media: { type: 'image', url: 'https://upload.wikimedia.org/wikipedia/commons/b/bf/Humpback_Whale_underwater_shot.jpg' },
  },
  {
    type: 'single', duration: 15,
    text: '🕷️ كم عدد أرجل العنكبوت؟',
    options: ['٦', '٨', '١٠', '١٢'],
    correctIndex: 1,
    media: { type: 'gif', url: 'https://media.giphy.com/media/3o7btXIhPqBJQnf0Wk/giphy.gif' },
  },
  {
    type: 'single', duration: 15,
    text: '🐧 أيّ الطيور لا يستطيع الطيران؟',
    options: ['النسر', 'الببغاء', 'البطريق', 'العصفور'],
    correctIndex: 2,
    media: { type: 'image', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/3/33/Penguin_in_Antarctica_jumping_out_of_the_water.jpg/640px-Penguin_in_Antarctica_jumping_out_of_the_water.jpg' },
  },
  {
    type: 'single', duration: 15,
    text: '🐆 ما هو أسرع حيوان على اليابسة؟',
    options: ['الأسد', 'الحصان', 'الفهد', 'كلب الصيد'],
    correctIndex: 2,
    media: { type: 'gif', url: 'https://media.giphy.com/media/l0MYw6Cu1TfY3gsWk/giphy.gif' },
  },
  {
    type: 'single', duration: 20,
    text: '🐼 ماذا تأكل الباندا بشكل رئيسي؟',
    options: ['السمك', 'الخيزران', 'التوت', 'الحشرات'],
    correctIndex: 1,
    media: { type: 'gif', url: 'https://media.giphy.com/media/SvH6pPyHCE2xi/giphy.gif' },
  },
  {
    type: 'single', duration: 20,
    text: '🐙 كم قلبًا يمتلك الأخطبوط؟',
    options: ['١', '٢', '٣', '٤'],
    correctIndex: 2,
    media: { type: 'image', url: 'https://upload.wikimedia.org/wikipedia/commons/f/fe/Octopus3.jpg' },
  },
  {
    type: 'single', duration: 20,
    text: '🐻‍❄️ ما لون جلد الدب القطبي تحت فرائه الأبيض؟',
    options: ['أبيض', 'وردي', 'أسود', 'رمادي'],
    correctIndex: 2,
    media: { type: 'image', url: 'https://upload.wikimedia.org/wikipedia/commons/1/1e/Polar_bear_on_the_ice.jpg' },
  },
  {
    type: 'single', duration: 20,
    text: '🦇 ما الثديي الوحيد القادر على الطيران الحقيقي؟',
    options: ['السنجاب الطائر', 'الخفاش', 'الفلبيني الطائر', 'الليمور الطائر'],
    correctIndex: 1,
    media: { type: 'image', url: 'https://upload.wikimedia.org/wikipedia/commons/4/4b/Pipistrellus_pipistrellus_crop.jpg' },
  },
  {
    type: 'single', duration: 25,
    text: '🦒 كم يبلغ متوسط طول رقبة الزرافة؟',
    options: ['متر واحد', 'مترين', 'ثلاثة أمتار', 'ستة أمتار'],
    correctIndex: 1,
    media: { type: 'image', url: 'https://upload.wikimedia.org/wikipedia/commons/9/9e/Giraffe_Mikumi_National_Park.jpg' },
  },
  {
    type: 'single', duration: 20,
    text: '🦎 أيّ الحيوانات يستطيع تغيير لونه؟',
    options: ['الحرباء', 'السحلية', 'الضفدع', 'التمساح'],
    correctIndex: 0,
    media: { type: 'gif', url: 'https://media.giphy.com/media/3o7btT1T9qpQZWhNlK/giphy.gif' },
  },
  {
    type: 'single', duration: 20,
    text: '🐘 كم تستمر فترة حمل الفيلة؟',
    options: ['٦ أشهر', '١٢ شهرًا', '١٨ شهرًا', '٢٢ شهرًا'],
    correctIndex: 3,
    media: { type: 'image', url: 'https://upload.wikimedia.org/wikipedia/commons/3/37/African_Bush_Elephant.jpg' },
  },
  {
    type: 'single', duration: 20,
    text: '🐢 أيّ الحيوانات يعيش أطول؟',
    options: ['الفيل', 'السلحفاء', 'الحوت', 'الببغاء'],
    correctIndex: 1,
    media: { type: 'video', url: 'https://www.youtube.com/embed/WfGMYdalClU' },
  },
  {
    type: 'single', duration: 20,
    text: '🐺 ما اسم مجموعة الذئاب؟',
    options: ['قطيع', 'عصابة', 'حزمة', 'مستعمرة'],
    correctIndex: 1,
    media: { type: 'gif', url: 'https://media.giphy.com/media/mOq9MgEDWXxMI/giphy.gif' },
  },
  {
    type: 'single', duration: 20,
    text: '🐴 أيّ الحيوانات ينام وهو واقف؟',
    options: ['الفيل', 'الحصان', 'الزرافة', 'جميع ما سبق'],
    correctIndex: 3,
    media: { type: 'video', url: 'https://www.youtube.com/embed/g3G6pAQjRlM' },
  },
  {
    type: 'multi', duration: 25,
    text: '🦋 أيّ من هذه الحيوانات من الثدييات؟ (اختر كل ما ينطبق)',
    options: ['الدلفين', 'القرش', 'الخفاش', 'التمساح'],
    correctIndices: [0, 2],
  },
  {
    type: 'multi', duration: 25,
    text: '🦉 أيّ الحيوانات تنشط في الليل؟ (اختر كل ما ينطبق)',
    options: ['البومة', 'النسر', 'الخفاش', 'الصقر'],
    correctIndices: [0, 2],
    media: { type: 'image', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/10/Bubo_scandiacus_2_%28Bohuslav_Novy%29.jpg/640px-Bubo_scandiacus_2_%28Bohuslav_Novy%29.jpg' },
  },
  {
    type: 'multi', duration: 25,
    text: '🐻 أيّ الحيوانات تسبت في الشتاء؟ (اختر كل ما ينطبق)',
    options: ['الدب', 'الأسد', 'القنفذ', 'الزرافة'],
    correctIndices: [0, 2],
    media: { type: 'image', url: 'https://upload.wikimedia.org/wikipedia/commons/9/9e/Grizz.jpg' },
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
    type: 'match', duration: 35,
    text: '🏠 طابق كل حيوان بمسكنه',
    pairs: [
      { left: 'نحلة', right: 'خلية' },
      { left: 'طائر', right: 'عُش' },
      { left: 'ثعلب', right: 'وكر' },
      { left: 'أرنب', right: 'جُحر' },
    ],
  },
]

const starterQuestion: QuizQuestion = {
  type: 'single',
  text: 'سؤال جديد',
  options: ['A', 'B', 'C', 'D'],
  correctIndex: 0,
  duration: 20,
}

export function QuizEditorPage() {
  const { id: routeId } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [quizId, setQuizId] = useState<string | null>(routeId ?? null)
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'private'>('public')
  const [questions, setQuestions] = useState<QuizQuestion[]>([starterQuestion])
  type StatusState = { kind: 'idle' } | { kind: 'saving' } | { kind: 'success'; msg: string } | { kind: 'error'; msg: string } | { kind: 'info'; msg: string }
  const [status, setStatus] = useState<StatusState>({ kind: 'idle' })

  const showStatus = (s: StatusState, autoClear = false) => {
    setStatus(s)
    if (autoClear) setTimeout(() => setStatus({ kind: 'idle' }), 3000)
  }
  const [loading, setLoading] = useState(!!routeId)

  // Always use the real logged-in user's UID
  const ownerId = auth.currentUser?.uid ?? ''

  // Load existing quiz when editing
  useEffect(() => {
    if (!routeId) {
      setTitle('New Quiz')
      setSlug('new-quiz')
      return
    }
    getQuizById(routeId)
      .then((data) => {
        if (!data) { showStatus({ kind: 'error', msg: 'لم يُعثر على الاختبار.' }); return }
        setTitle(data.title)
        setSlug(data.slug)
        setVisibility(data.visibility)
        setQuestions(data.questions)
      })
      .catch((err) => showStatus({ kind: 'error', msg: `فشل التحميل: ${err.message}` }))
      .finally(() => setLoading(false))
  }, [routeId])

  // Must be declared before any early returns (Rules of Hooks)
  const shareUrl = useMemo(() => `https://quizengine.onrender.com/?quiz=${encodeURIComponent(slug)}`, [slug])

  if (loading) return <section className="panel"><p>Loading quiz...</p></section>

  const updateQuestion = (index: number, patch: Partial<QuizQuestion>) => {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)))
  }

  const addQuestion = () => {
    setQuestions((prev) => [...prev, { ...starterQuestion }])
  }

  const loadSamples = () => {
    setTitle('Animals Pack Quiz')
    setSlug('animals-pack-quiz')
    setQuestions(SAMPLE_QUESTIONS)
    showStatus({ kind: 'info', msg: 'تم تحميل 20 سؤالاً نموذجياً — اضغط حفظ للتخزين.' })
  }

  const removeQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index))
  }

  const saveQuiz = async () => {
    if (!ownerId) {
      showStatus({ kind: 'error', msg: 'خطأ: يجب تسجيل الدخول أولاً.' })
      return
    }
    const payload: QuizDoc = {
      ownerId,
      title,
      slug,
      visibility,
      tags: ['animals'],
      questions,
    }

    showStatus({ kind: 'saving' })
    try {
      if (quizId) {
        await updateQuiz(quizId, payload)
        showStatus({ kind: 'success', msg: 'تم تحديث الاختبار بنجاح ✓' }, true)
      } else {
        const id = await createQuiz(payload)
        setQuizId(id)
        showStatus({ kind: 'success', msg: 'تم حفظ الاختبار بنجاح ✓' }, true)
      }
    } catch (error) {
      showStatus({ kind: 'error', msg: `فشل الحفظ: ${(error as Error).message}` })
    }
  }

  return (
    <>
      <section className="panel">
        <h2>Quiz Editor</h2>
        <div className="grid">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Quiz title" />
          <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="Share slug" />
          <select value={visibility} onChange={(e) => setVisibility(e.target.value as 'public' | 'private')}>
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
          <input value={shareUrl} readOnly />
        </div>
      </section>

      {questions.map((q, index) => (
        <section key={index} className="panel">
          <h3 style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>سؤال {index + 1} — <span style={{ opacity: 0.5, fontSize: '0.8em' }}>{q.type}</span></span>
            <button type="button" onClick={() => removeQuestion(index)} style={{ background: '#711', fontSize: '0.8em', padding: '0.2rem 0.6rem' }}>✕ حذف</button>
          </h3>
          <div className="grid">
            <select value={q.type} onChange={(e) => updateQuestion(index, { type: e.target.value as QuizQuestion['type'] })}>
              <option value="single">اختيار واحد</option>
              <option value="multi">اختيار متعدد</option>
              <option value="match">مطابقة</option>
              <option value="order">ترتيب</option>
            </select>
            <textarea
              dir="auto"
              rows={3}
              value={q.text}
              onChange={(e) => updateQuestion(index, { text: e.target.value })}
              placeholder="نص السؤال"
            />
            <input
              type="number"
              value={q.duration || 20}
              onChange={(e) => updateQuestion(index, { duration: Number(e.target.value) })}
              placeholder="المدة (ثانية)"
            />
          </div>

          {/* Media section */}
          <div style={{ marginTop: '0.75rem', borderTop: '1px solid #333', paddingTop: '0.75rem' }}>
            <label style={{ fontSize: '0.85em', opacity: 0.7 }}>وسائط السؤال</label>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem', flexWrap: 'wrap' }}>
              <select
                value={q.media?.type ?? 'none'}
                onChange={(e) => {
                  const t = e.target.value
                  if (t === 'none') { const { media: _, ...rest } = q; updateQuestion(index, rest as Partial<QuizQuestion>) }
                  else updateQuestion(index, { media: { type: t as QuizMedia['type'], url: q.media?.url ?? '' } })
                }}
                style={{ width: 'auto' }}
              >
                <option value="none">— بلا وسائط —</option>
                <option value="image">🖼️ صورة</option>
                <option value="gif">🎞️ GIF متحرك</option>
                <option value="video">🎬 فيديو (YouTube embed)</option>
              </select>
              {q.media && (
                <input
                  style={{ flex: 1, minWidth: '200px' }}
                  value={q.media.url}
                  onChange={(e) => updateQuestion(index, { media: { ...q.media!, url: e.target.value } })}
                  placeholder={q.media.type === 'video' ? 'https://www.youtube.com/embed/VIDEO_ID' : 'https://...'}
                />
              )}
            </div>
            {q.media?.url && (
              <div style={{ marginTop: '0.5rem', maxWidth: 320 }}>
                {(q.media.type === 'image' || q.media.type === 'gif') && (
                  <img src={q.media.url} alt="preview" style={{ maxWidth: '100%', maxHeight: 180, borderRadius: 6, objectFit: 'cover' }} />
                )}
                {q.media.type === 'video' && (
                  <iframe
                    src={q.media.url}
                    title="video preview"
                    width="320" height="180"
                    style={{ border: 'none', borderRadius: 6 }}
                    allow="autoplay; encrypted-media"
                    allowFullScreen
                  />
                )}
              </div>
            )}
          </div>
        </section>
      ))}

      <section className="panel">
        <div className="grid grid-2">
          <button type="button" onClick={addQuestion}>+ إضافة سؤال</button>
          <button type="button" onClick={loadSamples} style={{ background: '#444' }}>تحميل 20 نموذجاً</button>
        </div>
        <div className="grid grid-2" style={{ marginTop: '0.75rem' }}>
          <button type="button" onClick={() => navigate('/dashboard')} style={{ background: '#555' }}>إلغاء</button>
          <button type="button" onClick={saveQuiz} disabled={status.kind === 'saving'} style={{ opacity: status.kind === 'saving' ? 0.6 : 1 }}>
            {status.kind === 'saving' ? '⏳ جارٍ الحفظ...' : 'حفظ الاختبار'}
          </button>
        </div>
        {status.kind !== 'idle' && (
          <p style={{
            marginTop: '0.75rem',
            padding: '0.5rem 0.75rem',
            borderRadius: '6px',
            fontSize: '0.9em',
            background:
              status.kind === 'saving' ? '#1a3a5c' :
              status.kind === 'success' ? '#1a4a2e' :
              status.kind === 'error' ? '#4a1a1a' : '#2a2a1a',
            color:
              status.kind === 'saving' ? '#7ac' :
              status.kind === 'success' ? '#6f6' :
              status.kind === 'error' ? '#f88' : '#fd6',
            border: `1px solid ${
              status.kind === 'saving' ? '#2a5a8c' :
              status.kind === 'success' ? '#2a6a3e' :
              status.kind === 'error' ? '#6a2a2a' : '#4a4a1a'
            }`,
          }}>
            {status.kind === 'saving' ? '⏳ جارٍ الحفظ...' : status.msg}
          </p>
        )}
      </section>
    </>
  )
}
