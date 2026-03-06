import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { auth } from '../lib/firebase'
import { cancelPublishRequest, incrementShareCount, subscribeMyQuizzes, updateQuiz } from '../lib/quizRepo'
import { getCoverFromQuestions, isNewContent } from '../lib/utils'
import { buildHostGameUrl, buildPlayerGameUrl } from '../lib/gameModeUrl'
import type { QuizDoc } from '../types/quiz'
import { useTheme } from '../lib/useTheme'
import placeholderImg from '../assets/QYan_logo_300x164.jpg'
import { useToast } from '../lib/ToastContext'
import { vfx } from '../lib/vfx'
import './MyQuizzesPage.css'

import { useUserPrefs } from '../lib/UserPrefsContext'

type QuizItem = QuizDoc & { id: string }
type ContentFilter = 'all' | 'quiz' | 'mini-game'

const SERVER_BASE = 'https://play.qyan.app'

function presetBadge(preset?: string, isAr?: boolean) {
  if (preset === 'easy') return { label: isAr ? 'سهل' : 'Easy', color: '#16a34a' }
  if (preset === 'hard') return { label: isAr ? 'صعب' : 'Hard', color: '#dc2626' }
  return { label: isAr ? 'عادي' : 'Normal', color: '#2563eb' }
}

export function MyQuizzesPage() {
  const navigate = useNavigate()
  const [quizzes, setQuizzes] = useState<QuizItem[]>([])
  const [loading, setLoading] = useState(true)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [contentFilter, setContentFilter] = useState<ContentFilter>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title'>('newest')
  const [visibleCount, setVisibleCount] = useState(12)
  const [previewQuiz, setPreviewQuiz] = useState<QuizItem | null>(null)
  const { showToast } = useToast()
  const { language } = useUserPrefs()
  
  const isAr = language === 'ar'
  const t = {
    back: isAr ? 'رجوع ⬅️' : '⬅️ Back',
    title: isAr ? 'اختباراتي' : 'My Quizzes',
    newQuiz: isAr ? '+ اختبار جديد' : '+ New Quiz',
    quizzesLabel: isAr ? 'الاختبارات' : 'Quizzes',
    miniGamesLabel: isAr ? 'الألعاب المصغرة' : 'Mini Games',
    publicLabel: isAr ? 'عام' : 'Public',
    questionsLabel: isAr ? 'الأسئلة' : 'Questions',
    searchPlaceholder: isAr ? 'البحث في الاختبارات...' : 'Search quizzes...',
    all: isAr ? 'الكل' : 'All',
    newestFirst: isAr ? 'الأحدث أولاً' : 'Newest first',
    oldestFirst: isAr ? 'الأقدم أولاً' : 'Oldest first',
    titleSort: isAr ? 'الاسم' : 'Title',
    questionsWord: isAr ? 'سؤال' : 'questions',
    newBadge: isAr ? 'جديد' : 'NEW',
    preview: isAr ? 'معاينة' : 'Preview',
    edit: isAr ? 'تعديل' : 'Edit',
    copyLinkTitle: isAr ? 'نسخ رابط الاختبار' : 'Copy link',
    linkCopied: isAr ? 'تم نسخ الرابط!' : 'Link copied!',
    visibilityPriv: isAr ? 'خاص' : 'Private',
    visibilityPub: isAr ? 'عام' : 'Public',
    pending: isAr ? 'في الانتظار' : 'Pending',
    cancelConfirm: isAr ? 'إلغاء طلب النشر؟' : 'Cancel publish request?',
    makePrivateConfirm: isAr ? 'جعل الاختبار خاصاً؟ لن يظهر في المكتبة بعد الآن.' : 'Make quiz private? It will no longer appear in the library.',
    cancelSuccess: isAr ? 'تم إلغاء النشر' : 'Publish cancelled',
    failOperation: isAr ? 'فشل العملية' : 'Operation failed',
    publishSuccess: isAr ? 'تم النشر بنجاح! سيتم مراجعته قريباً.' : 'Published successfully! Will be reviewed soon.',
    publishFail: isAr ? 'فشل النشر' : 'Publish failed',
    resultsTotal: (filtered: number, total: number) => isAr ? `${filtered} نتيجة • ${total} الإجمالي` : `${filtered} results • ${total} total`,
    loadMore: (count: number) => isAr ? `تحميل المزيد • ${count} إضافية` : `Load more • ${count} more`,
    noQuizzesYet: isAr ? 'لا توجد اختبارات بحسابك حتى الآن' : 'No quizzes yet',
    noResultsFound: isAr ? 'لم يتم العثور على نتائج' : 'No results found',
    tryDifferentSearch: isAr ? 'جرب كلمات مفتاحية مختلفة.' : 'Try a different search or filter.',
    playLabel: isAr ? '▶️ تشغيل' : '▶️ Play',
    questionsCountDisplay: (count: number) => isAr ? `${count} سؤال` : `${count} questions`,
    previewStr: isAr ? '🔍 معاينة' : '🔍 Preview',
    editStr: isAr ? '✏️ تعديل' : '✏️ Edit',
    copyLinkHint: isAr ? 'نسخ الرابط' : 'Copy Link',
    visibilityHint: isAr ? 'إعدادات الخصوصية' : 'Toggle Visibility',
    loadMoreSimple: isAr ? 'تحميل المزيد' : 'Load more',
  }

  useTheme() // Keep for context if needed, but not used directly

  useEffect(() => {
    const uid = auth.currentUser?.uid
    if (!uid) { setLoading(false); return }
    const unsub = subscribeMyQuizzes(
      uid,
      (list) => {
        setQuizzes(list as QuizItem[])
        setLoading(false)
      },
      (err) => { console.error(err); setLoading(false) }
    )
    return unsub
  }, [])

  useEffect(() => { setVisibleCount(12) }, [search, contentFilter, sortBy])

  async function handleVisibilityChange(quiz: QuizItem, newVis: 'public' | 'private') {
    if (newVis === 'private') {
      const ok = quiz.approvalStatus === 'pending'
        ? window.confirm(t.cancelConfirm)
        : window.confirm(t.makePrivateConfirm)
      if (!ok) return
      setUpdatingId(quiz.id)
      try {
        await cancelPublishRequest(quiz.id)
        showToast({ message: t.cancelSuccess, type: 'success' })
      } catch {
        showToast({ message: t.failOperation, type: 'error' })
      } finally {
        setUpdatingId(null)
      }
    } else {
      setUpdatingId(quiz.id)
      try {
        await updateQuiz(quiz.id, { visibility: 'public' })
        showToast({ message: t.publishSuccess, type: 'success' })
      } catch {
        showToast({ message: t.publishFail, type: 'error' })
      } finally {
        setUpdatingId(null)
      }
    }
  }

  const filtered = useMemo(() => {
    return quizzes
      .filter((q) => {
        const matchesSearch = q.title?.toLowerCase().includes(search.toLowerCase()) || q.id.toLowerCase().includes(search.toLowerCase())
        const isMini = q.contentType === 'mini-game' || !!q.gameModeId
        if (contentFilter === 'quiz') return matchesSearch && !isMini
        if (contentFilter === 'mini-game') return matchesSearch && isMini
        return matchesSearch
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return (b.createdAt || 0) - (a.createdAt || 0)
        if (sortBy === 'oldest') return (a.createdAt || 0) - (b.createdAt || 0)
        if (sortBy === 'title') return (a.title || '').localeCompare(b.title || '')
        return 0
      })
  }, [quizzes, search, contentFilter, sortBy])

  const shown = filtered.slice(0, visibleCount)

  const quizCount = quizzes.filter((q) => q.contentType !== 'mini-game' && !q.gameModeId).length
  const miniGameCount = quizzes.filter((q) => q.contentType === 'mini-game' || !!q.gameModeId).length
  const publicCount = quizzes.filter((q) => q.visibility === 'public').length
  const totalQuestions = quizzes.reduce((sum, q) => sum + (q.questions?.length ?? 0), 0)

  return (
    <div className="my-quizzes-page">
      <div className="page-header">
        <div className="header-left">
          <button onClick={() => navigate('/dashboard')} className="back-button">{t.back}</button>
          <div>
            <h2 className="page-title">{t.title}</h2>
            <p className="page-subtitle">
              {loading ? '...' : t.resultsTotal(filtered.length, quizzes.length)}
            </p>
          </div>
        </div>
        <Link to="/editor" className="no-underline">
          <button className="new-quiz-button">{t.newQuiz}</button>
        </Link>
      </div>

      {!loading && quizzes.length > 0 && (
        <div className="stats-bar">
          {[
            { label: t.quizzesLabel, value: quizCount, icon: '📝' },
            { label: t.miniGamesLabel, value: miniGameCount, icon: '🎮' },
            { label: t.publicLabel, value: publicCount, icon: '🌐' },
            { label: t.questionsLabel, value: totalQuestions, icon: '❓' },
          ].map(({ label, value, icon }) => (
            <div key={label} className="stat-pill">
              <span className="stat-icon">{icon}</span>
              <div className="stat-content">
                <div className="stat-value">{value}</div>
                <div className="stat-label">{label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="filter-bar">
        <input
          placeholder={t.searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
          aria-label={t.searchPlaceholder}
        />
        <div className="filter-group">
          {(['all', 'quiz', 'mini-game'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setContentFilter(f)}
              className={`filter-button ${contentFilter === f ? 'active' : ''}`}
            >
              {f === 'all' ? t.all : f === 'quiz' ? `📝 ${t.quizzesLabel}` : `🎮 ${t.miniGamesLabel}`}
            </button>
          ))}
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'title')}
          className="sort-select"
          title="Sort by"
        >
          <option value="newest">{t.newestFirst}</option>
          <option value="oldest">{t.oldestFirst}</option>
          <option value="title">{t.titleSort}</option>
        </select>
      </div>

      {loading && (
        <div className="card-grid">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => <div key={i} className="skeleton-card" />)}
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="empty-state">
          <div className="empty-icon">{quizzes.length === 0 ? '📭' : '🔍'}</div>
          <h3 className="empty-title">{quizzes.length === 0 ? t.noQuizzesYet : t.noResultsFound}</h3>
          <p className="empty-description">{t.tryDifferentSearch}</p>
        </div>
      )}

      {!loading && shown.length > 0 && (
        <div className="card-grid">
          {shown.map((q) => {
            const coverImg = q.coverImage || getCoverFromQuestions(q.questions ?? [])
            const isHovered = hoveredId === q.id
            const badge = presetBadge(q.challengePreset)
            const isMini = q.contentType === 'mini-game' || !!q.gameModeId

            return (
              <div
                key={q.id}
                onMouseEnter={() => setHoveredId(q.id)}
                onMouseLeave={() => setHoveredId(null)}
                className={`quiz-card-full ${isHovered ? 'hovered' : ''}`}
              >
                <div className={`card-hero ${!coverImg ? 'placeholder' : ''}`}>
                  <img
                    src={coverImg || placeholderImg}
                    alt={q.title}
                    className="hero-img"
                  />
                  <a
                    href={buildHostGameUrl({ serverBase: SERVER_BASE, quizId: q.id, gameModeId: q.gameModeId, themeId: q.themeId })}
                    target="_blank" rel="noopener noreferrer"
                    onClick={(e) => { e.preventDefault(); vfx.floatText(t.playLabel, e.clientX, e.clientY); window.open(e.currentTarget.href, '_blank') }}
                    className="play-overlay"
                  >
                    {t.playLabel}
                  </a>
                  <div className="hero-gradient" />
                  <div className={`type-badge ${isMini ? 'mini' : 'quiz'}`}>
                    {isMini ? `🎮 ${t.miniGamesLabel}` : `📝 ${t.quizzesLabel}`}
                  </div>
                  {isNewContent(q.createdAt) && <div className="new-badge">{t.newBadge}</div>}
                  <div className="visibility-pill-top">{q.visibility === 'public' ? '🌐' : '🔒'}</div>
                </div>

                <div className="card-body">
                  <div className="card-title">{q.title}</div>
                  <div className="card-stats">
                    {t.questionsCountDisplay(q.questions?.length ?? 0)}
                    {q.challengePreset && <> • <span style={{ color: badge.color }}>{badge.label}</span></>}
                  </div>
                </div>

                <div className="action-bar-hover">
                  <button className="action-btn flex-1" onClick={() => setPreviewQuiz(q)}>{t.previewStr}</button>
                  <Link to={isMini ? `/mini-game-editor/${q.id}` : `/editor/${q.id}`} className="flex-1 no-underline">
                    <button className="action-btn">{t.editStr}</button>
                  </Link>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(buildPlayerGameUrl({
                        serverBase: SERVER_BASE,
                        quizId: q.id,
                        themeId: q.themeId,
                      }))
                      showToast({ message: t.linkCopied, type: 'success' })
                      incrementShareCount(q.id).catch(console.error)
                    }}
                    className="action-btn icon-only"
                    title={t.copyLinkHint}
                  >
                    🔗
                  </button>
                  <button
                    onClick={() => handleVisibilityChange(q, q.visibility === 'public' ? 'private' : 'public')}
                    className="action-btn icon-only"
                    disabled={updatingId === q.id}
                    title={t.visibilityHint}
                  >
                    {q.visibility === 'public' ? '🔒' : q.approvalStatus === 'pending' ? '🕒' : '🌐'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {visibleCount < filtered.length && (
        <div className="load-more-container">
          <button onClick={() => setVisibleCount(c => c + 12)} className="load-more-btn">
            {t.loadMoreSimple}
          </button>
        </div>
      )}

      {/* ── Preview Dialog ── */}
      {previewQuiz && (
        <QuizPreviewDialog
          quiz={previewQuiz}
          isAr={isAr}
          onClose={() => setPreviewQuiz(null)}
        />
      )}
    </div>
  )
}

function QuizPreviewDialog({ quiz, isAr, onClose }: { quiz: QuizItem; isAr: boolean; onClose: () => void }) {
  const isMini = quiz.contentType === 'mini-game' || !!quiz.gameModeId
  const previewTitle = isMini
    ? (isAr ? 'معاينة اللعبة' : 'Game Preview')
    : (isAr ? 'معاينة الاختبار' : 'Quiz Preview')

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div className="preview-dialog-backdrop" onClick={onClose}>
      <div className="preview-dialog" onClick={e => e.stopPropagation()}>
        <div className="preview-dialog-header">
          <div className="preview-dialog-title-row">
            <h2 className="preview-dialog-title">{previewTitle}</h2>
            <button className="preview-dialog-close" onClick={onClose} aria-label={isAr ? 'إغلاق المعاينة' : 'Close preview'}>✕</button>
          </div>
        </div>
        <div className="preview-dialog-body">
          <iframe
            key={quiz.id}
            src={`/preview/${quiz.id}?embedded=1`}
            title={`${quiz.title} preview`}
            className="preview-dialog-frame"
          />
        </div>
      </div>
    </div>
  )
}
