import { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { auth } from '../lib/firebase'
import { cancelPublishRequest, incrementShareCount, subscribeMyQuizzes, updateQuiz } from '../lib/quizRepo'
import { getCoverFromQuestions, isNewContent } from '../lib/utils'
import { buildHostGameUrl } from '../lib/gameModeUrl'
import type { QuizDoc } from '../types/quiz'
import { useTheme } from '../lib/useTheme'
import placeholderImg from '../assets/QYan_logo_300x164.jpg'
import { useToast } from '../lib/ToastContext'
import { vfx } from '../lib/vfx'
import './MyQuizzesPage.css'

type QuizItem = QuizDoc & { id: string }
type ContentFilter = 'all' | 'quiz' | 'mini-game'

const SERVER_BASE = 'https://play.qyan.app'

function presetBadge(preset?: string) {
  if (preset === 'easy') return { label: 'سهل', color: '#16a34a' }
  if (preset === 'hard') return { label: 'صعب', color: '#dc2626' }
  return { label: 'عادي', color: '#2563eb' }
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
  const { showToast } = useToast()
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
        ? window.confirm('إلغاء طلب النشر؟')
        : window.confirm('جعل الاختبار خاصاً؟ لن يظهر في المكتبة بعد الآن.')
      if (!ok) return
      setUpdatingId(quiz.id)
      try {
        await cancelPublishRequest(quiz.id)
        showToast({ message: 'تم إلغاء النشر', type: 'success' })
      } catch {
        showToast({ message: 'فشل العملية', type: 'error' })
      } finally {
        setUpdatingId(null)
      }
    } else {
      setUpdatingId(quiz.id)
      try {
        await updateQuiz(quiz.id, { visibility: 'public' })
        showToast({ message: 'تم النشر بنجاح! سيتم مراجعته قريباً.', type: 'success' })
      } catch {
        showToast({ message: 'فشل النشر', type: 'error' })
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
          <button onClick={() => navigate('/dashboard')} className="back-button">⬅️ Back</button>
          <div>
            <h2 className="page-title">My Quizzes</h2>
            <p className="page-subtitle">
              {loading ? '...' : `${filtered.length} results • ${quizzes.length} total`}
            </p>
          </div>
        </div>
        <Link to="/editor" className="no-underline">
          <button className="new-quiz-button">+ New Quiz</button>
        </Link>
      </div>

      {!loading && quizzes.length > 0 && (
        <div className="stats-bar">
          {[
            { label: 'Quizzes', value: quizCount, icon: '📝' },
            { label: 'Mini Games', value: miniGameCount, icon: '🎮' },
            { label: 'Public', value: publicCount, icon: '🌐' },
            { label: 'Questions', value: totalQuestions, icon: '❓' },
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
          placeholder="Search quizzes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
          aria-label="Search quizzes"
        />
        <div className="filter-group">
          {(['all', 'quiz', 'mini-game'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setContentFilter(f)}
              className={`filter-button ${contentFilter === f ? 'active' : ''}`}
            >
              {f === 'all' ? 'All' : f === 'quiz' ? '📝 Quizzes' : '🎮 Mini Games'}
            </button>
          ))}
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as 'newest' | 'oldest' | 'title')}
          className="sort-select"
          title="Sort by"
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="title">A → Z</option>
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
          <h3 className="empty-title">{quizzes.length === 0 ? 'No quizzes yet' : 'No results found'}</h3>
          <p className="empty-description">Try a different search or filter.</p>
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
                    onClick={(e) => { e.preventDefault(); vfx.floatText('Play!', e.clientX, e.clientY); window.open(e.currentTarget.href, '_blank') }}
                    className="play-overlay"
                  >
                    ▶️ Play
                  </a>
                  <div className="hero-gradient" />
                  <div className={`type-badge ${isMini ? 'mini' : 'quiz'}`}>
                    {isMini ? '🎮 Mini' : '📝 Quiz'}
                  </div>
                  {isNewContent(q.createdAt) && <div className="new-badge">New</div>}
                  <div className="visibility-pill-top">{q.visibility === 'public' ? '🌐' : '🔒'}</div>
                </div>

                <div className="card-body">
                  <div className="card-title">{q.title}</div>
                  <div className="card-stats">
                    {q.questions?.length ?? 0} سؤال
                    {q.challengePreset && <> • <span style={{ color: badge.color }}>{badge.label}</span></>}
                  </div>
                </div>

                <div className="action-bar-hover">
                  <Link to={`/preview/${q.id}`} className="flex-1 no-underline">
                    <button className="action-btn">👁️ معاينة</button>
                  </Link>
                  <Link to={isMini ? `/mini-game-editor/${q.id}` : `/editor/${q.id}`} className="flex-1 no-underline">
                    <button className="action-btn-primary">✏️ تعديل</button>
                  </Link>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${SERVER_BASE}/player?quiz=${q.id}`)
                      showToast({ message: 'تم نسخ الرابط!', type: 'success' })
                      incrementShareCount(q.id).catch(console.error)
                    }}
                    className="action-btn icon-only"
                    title="Copy Link"
                  >
                    🔗
                  </button>
                  <button
                    onClick={() => handleVisibilityChange(q, q.visibility === 'public' ? 'private' : 'public')}
                    className="action-btn icon-only"
                    disabled={updatingId === q.id}
                    title="Toggle Visibility"
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
            Load more
          </button>
        </div>
      )}
    </div>
  )
}
