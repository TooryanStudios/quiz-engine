import React, { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { auth } from '../lib/firebase'
import { cancelPublishRequest, incrementQuizPlayCount, incrementShareCount, requestPublicVisibility, subscribeMyQuizzes, updateQuiz } from '../lib/quizRepo'
import { incrementPlatformStat } from '../lib/adminRepo'
import { guardedLaunchGame } from '../lib/gameLaunch'
import { buildHostGameUrl } from '../lib/gameModeUrl'
import { getHostLaunchAuthParams } from '../lib/hostLaunchAuth'
import type { QuizDoc, QuizQuestion } from '../types/quiz'
import { useTheme } from '../lib/useTheme'
import placeholderImg from '../assets/QYan_logo_300x164.jpg'
import { useToast } from '../lib/ToastContext'
import { useSubscription } from '../lib/useSubscription'
import { useDialog } from '../lib/DialogContext'
import { vfx } from '../lib/vfx'

type QuizItem = QuizDoc & { id: string }
type ContentFilter = 'all' | 'quiz' | 'mini-game'

function getEditorPath(item: QuizItem): string {
  const isMiniGame = item.contentType === 'mini-game' || !!item.gameModeId
  return isMiniGame ? `/mini-game-editor/${item.id}` : `/editor/${item.id}`
}

const IS_LOCAL_DEV = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)
const SERVER_BASE = IS_LOCAL_DEV
  ? (import.meta.env.VITE_LOCAL_GAME_URL || 'http://localhost:3001')
  : (import.meta.env.VITE_API_BASE_URL || 'https://play.qyan.app')

function getCoverImage(questions: QuizQuestion[]): string | null {
  for (const q of questions ?? []) {
    if (q.media?.type === 'image' && q.media.url) return q.media.url
  }
  return null
}

function presetBadge(preset?: string) {
  if (preset === 'easy') return { label: 'سهل', color: '#16a34a' }
  if (preset === 'hard') return { label: 'صعب', color: '#dc2626' }
  return { label: 'عادي', color: '#2563eb' }
}

const NEW_QUIZ_MS = 14 * 24 * 60 * 60 * 1000
function isNewQuiz(createdAt: any): boolean {
  if (!createdAt) return false
  const ms: number = createdAt?.toMillis?.() ?? (createdAt?.seconds ? createdAt.seconds * 1000 : 0)
  return ms > 0 && Date.now() - ms < NEW_QUIZ_MS
}

export function MyQuizzesPage() {
  const navigate = useNavigate()
  const [quizzes, setQuizzes] = useState<QuizItem[]>([])
  const [loading, setLoading] = useState(true)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [contentFilter, setContentFilter] = useState<ContentFilter>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title'>('newest')
  const [visibleCount, setVisibleCount] = useState(12)
  const menuRef = useRef<HTMLDivElement>(null)
  const { showToast } = useToast()
  const { show: showDialog } = useDialog()
  const { isSubscribed } = useSubscription()
  const appTheme = useTheme()
  const dark = appTheme === 'dark'

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

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Reset pagination when filter/search/sort changes
  useEffect(() => { setVisibleCount(12) }, [search, contentFilter, sortBy])

  async function handleVisibilityChange(quiz: QuizItem, newVis: 'public' | 'private') {
    setMenuOpenId(null)
    const masterEmail = import.meta.env.VITE_MASTER_EMAIL as string | undefined
    const isMasterAdmin = !!masterEmail && auth.currentUser?.email === masterEmail

    if (newVis === 'private') {
      if (quiz.visibility === 'private' && !quiz.approvalStatus) return
      const ok = quiz.approvalStatus === 'pending'
        ? window.confirm(`إلغاء طلب النشر لـ "${quiz.title}"؟`)
        : window.confirm(`Make "${quiz.title}" private?\n\nIt will no longer appear in the Public Library.`)
      if (!ok) return
      setUpdatingId(quiz.id)
      try {
        await cancelPublishRequest(quiz.id)
        setQuizzes((prev) => prev.map((q) => q.id === quiz.id ? { ...q, visibility: 'private', approvalStatus: undefined } : q))
      } catch {
        alert('Failed to update. Please try again.')
      } finally {
        setUpdatingId(null)
      }
      return
    }

    if (quiz.approvalStatus === 'pending') return
    if (quiz.visibility === 'public') return

    setUpdatingId(quiz.id)
    try {
      if (isMasterAdmin) {
        await updateQuiz(quiz.id, { visibility: 'public', approvalStatus: 'approved' })
        setQuizzes((prev) => prev.map((q) => q.id === quiz.id ? { ...q, visibility: 'public', approvalStatus: 'approved' } : q))
      } else {
        await requestPublicVisibility(quiz.id)
        setQuizzes((prev) => prev.map((q) => q.id === quiz.id ? { ...q, approvalStatus: 'pending' } : q))
        showToast({ message: '🕐 تم إرسال طلب النشر، سينظر المشرف فيه قريباً.', type: 'info' })
      }
    } catch {
      alert('Failed to submit request. Please try again.')
    } finally {
      setUpdatingId(null)
    }
  }

  function requiresSubscription(quiz: QuizItem) {
    return quiz.priceTier === 'starter' || quiz.priceTier === 'pro'
  }

  async function handleLaunchGame(quiz: QuizItem) {
    if (requiresSubscription(quiz) && !isSubscribed) {
      showDialog({
        title: '🔒 Subscription Required',
        message: 'This quiz is a premium quiz. Please upgrade your account to launch it.',
        confirmText: 'Upgrade now',
        cancelText: 'Cancel',
        onConfirm: () => { window.location.assign('/billing') },
      })
      return
    }
    const preOpenedTab = window.open('', '_blank')
    const authParams = await getHostLaunchAuthParams({ serverBase: SERVER_BASE, currentUser: auth.currentUser })
    const gameUrl = buildHostGameUrl({ serverBase: SERVER_BASE, quizId: quiz.id, gameModeId: quiz.gameModeId, ...authParams })
    await guardedLaunchGame({
      serverBase: SERVER_BASE,
      gameUrl,
      preOpenedTab,
      onUnavailable: () => showToast({ message: 'Game server is temporarily unavailable.', type: 'error' }),
      onPopupBlocked: () => showToast({ message: 'Popup was blocked. Please allow popups and try again.', type: 'info' }),
      onLaunch: () => {
        void incrementPlatformStat('sessionHosted')
        void incrementQuizPlayCount(quiz.id)
      },
    })
  }

  // ── Filtering & sorting ──────────────────────────────────────────────────
  const filtered = quizzes
    .filter((q) => {
      if (contentFilter === 'quiz') return q.contentType !== 'mini-game' && !q.gameModeId
      if (contentFilter === 'mini-game') return q.contentType === 'mini-game' || !!q.gameModeId
      return true
    })
    .filter((q) => {
      if (!search.trim()) return true
      const s = search.toLowerCase()
      return (
        q.title?.toLowerCase().includes(s) ||
        (q.description ?? '').toLowerCase().includes(s) ||
        (q.tags ?? []).some((t) => t.toLowerCase().includes(s))
      )
    })
    .sort((a, b) => {
      const toMs = (ts: any) => ts?.toMillis?.() ?? (ts?.seconds ? ts.seconds * 1000 : 0)
      if (sortBy === 'newest') return toMs(b.createdAt) - toMs(a.createdAt)
      if (sortBy === 'oldest') return toMs(a.createdAt) - toMs(b.createdAt)
      return (a.title ?? '').localeCompare(b.title ?? '')
    })

  const shown = filtered.slice(0, visibleCount)

  // ── Shared button styles ─────────────────────────────────────────────────
  const aBtnStyle: React.CSSProperties = {
    width: '100%', padding: '0.78rem 0.5rem', borderRadius: '7px',
    background: dark ? '#1e293b' : '#f1f5f9',
    color: dark ? '#94a3b8' : '#475569',
    fontSize: '0.75rem', fontWeight: 600,
    border: `1px solid ${dark ? '#273549' : '#e2e8f0'}`,
    cursor: 'pointer', transition: 'background 0.15s, color 0.15s',
  }
  const aBtnPrimary: React.CSSProperties = {
    ...aBtnStyle,
    background: dark ? '#1e3a5f' : '#dbeafe',
    color: dark ? '#93c5fd' : '#1d4ed8',
    border: `1px solid ${dark ? '#1e4a7a' : '#bfdbfe'}`,
  }

  // ── Stats ────────────────────────────────────────────────────────────────
  const quizCount = quizzes.filter((q) => q.contentType !== 'mini-game' && !q.gameModeId).length
  const miniGameCount = quizzes.filter((q) => q.contentType === 'mini-game' || !!q.gameModeId).length
  const publicCount = quizzes.filter((q) => q.visibility === 'public').length
  const totalQuestions = quizzes.reduce((sum, q) => sum + (q.questions?.length ?? 0), 0)

  return (
    <div style={{ padding: '0' }}>
      {/* ── Page header ── */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem', padding: '1.5rem 0 0', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button
            onClick={() => navigate('/dashboard')}
            style={{ background: 'transparent', border: '1px solid var(--border-mid)', color: 'var(--text-dim)', padding: '6px 12px', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' }}
          >
            ← Back
          </button>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-bright)' }}>My Quizzes</h2>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.82rem', color: 'var(--text-dim)' }}>
              {loading ? '…' : `${filtered.length} result${filtered.length !== 1 ? 's' : ''} · ${quizzes.length} total`}
            </p>
          </div>
        </div>

        {/* New quiz button */}
        <Link to="/editor" style={{ textDecoration: 'none' }}>
          <button style={{
            background: 'var(--accent)', color: '#fff', border: 'none',
            padding: '0.6rem 1.4rem', borderRadius: '10px', fontSize: '0.88rem', fontWeight: 700,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
            boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
          }}>
            ＋ New Quiz
          </button>
        </Link>
      </div>

      {/* ── Stats bar ── */}
      {!loading && quizzes.length > 0 && (
        <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          {[
            { label: 'Quizzes', value: quizCount, icon: '📋' },
            { label: 'Mini Games', value: miniGameCount, icon: '🎮' },
            { label: 'Public', value: publicCount, icon: '🌐' },
            { label: 'Questions', value: totalQuestions, icon: '❓' },
          ].map(({ label, value, icon }) => (
            <div key={label} style={{
              padding: '0.6rem 1rem', borderRadius: '10px',
              background: dark ? '#111827' : '#f8fafc',
              border: `1px solid ${dark ? '#1e293b' : '#e2e8f0'}`,
              display: 'flex', alignItems: 'center', gap: '0.5rem',
            }}>
              <span style={{ fontSize: '1rem' }}>{icon}</span>
              <div>
                <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-bright)', lineHeight: 1 }}>{value}</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '1px' }}>{label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Search + Filter bar ── */}
      <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          placeholder="Search quizzes…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            padding: '8px 14px', borderRadius: '8px', fontSize: '0.85rem',
            background: dark ? '#111827' : '#fff',
            border: `1px solid ${dark ? '#334155' : '#cbd5e1'}`,
            color: 'var(--text)', outline: 'none', width: '200px',
          }}
        />

        {/* Content type filter */}
        <div style={{ display: 'flex', gap: '0.3rem' }}>
          {(['all', 'quiz', 'mini-game'] as ContentFilter[]).map((f) => (
            <button key={f} type="button" onClick={() => setContentFilter(f)} style={{
              background: contentFilter === f ? 'var(--accent)' : 'transparent',
              border: `1px solid ${contentFilter === f ? 'var(--accent)' : 'var(--border-strong)'}`,
              color: contentFilter === f ? '#fff' : 'var(--text-dim)',
              padding: '7px 14px', fontSize: '0.8rem', cursor: 'pointer', borderRadius: '8px',
              fontWeight: contentFilter === f ? 700 : 500,
            }}>
              {f === 'all' ? 'All' : f === 'quiz' ? '📋 Quizzes' : '🎮 Mini Games'}
            </button>
          ))}
        </div>

        {/* Sort */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
          style={{
            padding: '7px 12px', borderRadius: '8px', fontSize: '0.8rem',
            background: dark ? '#111827' : '#fff',
            border: `1px solid ${dark ? '#334155' : '#cbd5e1'}`,
            color: 'var(--text)', cursor: 'pointer', outline: 'none',
          }}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="title">A → Z</option>
        </select>
      </div>

      {/* ── Loading skeleton ── */}
      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
          {[1,2,3,4,5,6,7,8].map((i) => (
            <div key={i} style={{
              height: '190px', borderRadius: '12px',
              background: dark ? 'linear-gradient(90deg, #1e293b 25%, #273549 50%, #1e293b 75%)' : 'linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)',
              backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite',
            }} />
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && filtered.length === 0 && (
        <div style={{ textAlign: 'center', padding: '5rem 2rem', border: `2px dashed ${dark ? '#1e293b' : '#cbd5e1'}`, borderRadius: '20px', color: 'var(--text-mid)' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>
            {quizzes.length === 0 ? '📋' : '🔍'}
          </div>
          <h3 style={{ color: '#94a3b8', margin: '0 0 0.5rem' }}>
            {quizzes.length === 0 ? 'No quizzes yet' : 'No results found'}
          </h3>
          <p style={{ margin: '0 0 1.5rem' }}>
            {quizzes.length === 0 ? 'Create your first quiz to get started.' : 'Try a different search or filter.'}
          </p>
          {quizzes.length === 0 && (
            <Link to="/editor" style={{ textDecoration: 'none' }}>
              <button style={{ padding: '0.75rem 2rem', borderRadius: '10px', background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}>
                ＋ Create Quiz
              </button>
            </Link>
          )}
        </div>
      )}

      {/* ── Card grid ── */}
      {!loading && shown.length > 0 && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
            {shown.map((q) => {
              const coverImg = q.coverImage || getCoverImage(q.questions ?? [])
              const isHovered = hoveredId === q.id
              const badge = presetBadge(q.challengePreset)
              const isMiniGame = q.contentType === 'mini-game' || !!q.gameModeId

              return (
                <div
                  key={q.id}
                  onMouseEnter={() => setHoveredId(q.id)}
                  onMouseLeave={() => { setHoveredId(null); if (menuOpenId !== q.id) setMenuOpenId(null) }}
                  style={{
                    borderRadius: '14px',
                    background: dark ? '#0f172a' : '#ffffff',
                    border: `1px solid ${isHovered ? (dark ? '#334155' : '#cbd5e1') : (dark ? '#1e293b' : '#e2e8f0')}`,
                    boxShadow: isHovered ? (dark ? '0 12px 32px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.1)') : (dark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 1px 4px rgba(0,0,0,0.06)'),
                    transform: isHovered ? 'translateY(-3px)' : 'translateY(0)',
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
                    display: 'flex', flexDirection: 'column', position: 'relative',
                  }}
                >
                  {/* Cover hero */}
                  <div style={{ height: '120px', position: 'relative', overflow: 'hidden', background: coverImg ? '#000' : '#0f172a', flexShrink: 0, borderRadius: '13px 13px 0 0' }}>
                    <img
                      src={coverImg || placeholderImg}
                      alt={q.title}
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = placeholderImg }}
                      style={{
                        width: '100%', height: '100%',
                        objectFit: coverImg ? 'cover' : 'contain',
                        opacity: isHovered ? 0.95 : coverImg ? 0.75 : 0.85,
                        transition: 'opacity 0.3s, transform 0.4s',
                        transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                        padding: coverImg ? 0 : '16px',
                      }}
                    />

                    {/* Play overlay */}
                    <a
                      href={buildHostGameUrl({ serverBase: SERVER_BASE, quizId: q.id, gameModeId: q.gameModeId })}
                      target="_blank" rel="noopener noreferrer"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); void handleLaunchGame(q) }}
                      style={{
                        position: 'absolute', top: '50%', left: '50%',
                        transform: isHovered ? 'translate(-50%, -50%) scale(1)' : 'translate(-50%, -50%) scale(0.8)',
                        opacity: isHovered ? 1 : 0,
                        transition: 'opacity 0.2s, transform 0.2s',
                        padding: '0.55rem 1.3rem', borderRadius: '10px', whiteSpace: 'nowrap',
                        background: 'rgba(22,163,74,0.9)', backdropFilter: 'blur(4px)',
                        border: '2px solid rgba(255,255,255,0.5)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
                        color: '#fff', fontSize: '0.92rem', fontWeight: 700,
                        textDecoration: 'none', zIndex: 5,
                        boxShadow: '0 4px 14px rgba(0,0,0,0.5)',
                      }}
                    >
                      &#9654; Play
                    </a>

                    {/* Gradient overlay */}
                    <div style={{ position: 'absolute', inset: 0, background: dark ? 'linear-gradient(to top, rgba(15,23,42,0.9) 0%, transparent 60%)' : 'linear-gradient(to top, rgba(255,255,255,0.85) 0%, transparent 55%)', pointerEvents: 'none' }} />

                    {/* Content type badge */}
                    <div style={{
                      position: 'absolute', top: '6px', left: '6px',
                      background: isMiniGame ? 'rgba(124,58,237,0.85)' : 'rgba(37,99,235,0.85)',
                      color: '#fff', fontSize: '0.58rem', fontWeight: 800,
                      padding: '2px 6px', borderRadius: '4px', backdropFilter: 'blur(4px)',
                      letterSpacing: '0.04em', zIndex: 6,
                    }}>
                      {isMiniGame ? '🎮 Mini' : '📋 Quiz'}
                    </div>

                    {/* NEW badge */}
                    {isNewQuiz(q.createdAt) && (
                      <div style={{
                        position: 'absolute', bottom: '6px', right: '6px',
                        background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff',
                        fontSize: '0.58rem', fontWeight: 800, padding: '2px 6px', borderRadius: '4px',
                        textTransform: 'uppercase', letterSpacing: '0.06em',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.4)', zIndex: 7,
                      }}>New</div>
                    )}

                    {/* Visibility dot */}
                    <div style={{
                      position: 'absolute', top: '6px', right: '6px',
                      background: q.visibility === 'public' ? 'rgba(22,163,74,0.85)' : 'rgba(100,116,139,0.85)',
                      color: '#fff', fontSize: '0.58rem', fontWeight: 700,
                      padding: '2px 6px', borderRadius: '4px', backdropFilter: 'blur(4px)', zIndex: 6,
                    }}>
                      {q.visibility === 'public' ? '🌐' : '🔒'}
                    </div>
                  </div>

                  {/* Card body */}
                  <div style={{ padding: '0.65rem 0.8rem 0.5rem', textAlign: 'center' }}>
                    <div style={{
                      fontSize: '0.875rem', fontWeight: 400, color: 'var(--text-bright)', lineHeight: 1.4,
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      marginBottom: '0.25rem',
                    }}>
                      {q.title}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-mid)', fontWeight: 500 }}>
                      {q.questions?.length ?? 0} سؤال
                      {q.challengePreset && <> · <span style={{ color: badge.color }}>{badge.label}</span></>}
                    </div>
                  </div>

                  {/* Hover action bar */}
                  <div style={{
                    display: 'flex', gap: '0.4rem', padding: '0 0.7rem 0.7rem',
                    opacity: isHovered ? 1 : 0,
                    transform: isHovered ? 'translateY(0)' : 'translateY(4px)',
                    transition: 'opacity 0.18s ease, transform 0.18s ease',
                    pointerEvents: isHovered ? 'auto' : 'none',
                  }}>
                    <Link to={`/preview/${q.id}`} style={{ textDecoration: 'none', flex: 1 }}>
                      <button style={aBtnStyle}
                        onMouseEnter={(e) => Object.assign(e.currentTarget.style, { background: dark ? '#273549' : '#e2e8f0', color: dark ? '#e2e8f0' : '#0f172a' })}
                        onMouseLeave={(e) => Object.assign(e.currentTarget.style, { background: dark ? '#1e293b' : '#f1f5f9', color: dark ? '#94a3b8' : '#475569' })}
                      >معاينة</button>
                    </Link>
                    <Link to={getEditorPath(q)} style={{ textDecoration: 'none', flex: 1 }}>
                      <button style={aBtnPrimary}
                        onMouseEnter={(e) => Object.assign(e.currentTarget.style, { background: '#1d4ed8', color: '#fff', borderColor: '#2563eb' })}
                        onMouseLeave={(e) => Object.assign(e.currentTarget.style, { background: dark ? '#1e3a5f' : '#dbeafe', color: dark ? '#93c5fd' : '#1d4ed8', borderColor: dark ? '#1e4a7a' : '#bfdbfe' })}
                      >تعديل</button>
                    </Link>
                    <button
                      title="نسخ رابط الاختبار"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigator.clipboard?.writeText(`${SERVER_BASE}/player?quiz=${encodeURIComponent(q.id)}`)
                          .then(() => {
                            showToast({ message: 'تم نسخ الرابط!', type: 'success' })
                            incrementShareCount(q.id).catch(console.error)
                          })
                      }}
                      style={{ ...aBtnStyle, width: 'auto', flex: 'none', padding: '0.38rem 0.55rem' }}
                      onMouseEnter={(e) => Object.assign(e.currentTarget.style, { background: dark ? '#273549' : '#e2e8f0', color: dark ? '#e2e8f0' : '#0f172a' })}
                      onMouseLeave={(e) => Object.assign(e.currentTarget.style, { background: dark ? '#1e293b' : '#f1f5f9', color: dark ? '#94a3b8' : '#475569' })}
                    >🔗</button>

                    {/* Visibility toggle */}
                    <button
                      title={
                        q.visibility === 'public' ? 'Make Private'
                        : q.approvalStatus === 'pending' ? 'في انتظار الموافقة - اضغط للإلغاء'
                        : 'Request to Publish'
                      }
                      disabled={updatingId === q.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        void handleVisibilityChange(q, q.visibility === 'public' ? 'private' : q.approvalStatus === 'pending' ? 'private' : 'public')
                      }}
                      style={{ ...aBtnStyle, width: 'auto', flex: 'none', padding: '0.38rem 0.55rem', opacity: updatingId === q.id ? 0.5 : 1 }}
                      onMouseEnter={(e) => Object.assign(e.currentTarget.style, { background: dark ? '#273549' : '#e2e8f0', color: dark ? '#e2e8f0' : '#0f172a' })}
                      onMouseLeave={(e) => Object.assign(e.currentTarget.style, { background: dark ? '#1e293b' : '#f1f5f9', color: dark ? '#94a3b8' : '#475569' })}
                    >
                      {q.visibility === 'public' ? '🔒' : q.approvalStatus === 'pending' ? '🕐' : '🌐'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Load more */}
          {visibleCount < filtered.length && (
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <button
                onClick={(e) => {
                  vfx.floatText(`+${Math.min(12, filtered.length - visibleCount)}`, e.clientX, e.clientY, '#2563eb')
                  setVisibleCount((c) => c + 12)
                }}
                style={{
                  padding: '0.7rem 2.5rem', borderRadius: '10px', fontSize: '0.875rem', fontWeight: 700,
                  background: 'linear-gradient(135deg, #2563eb, #7c3aed)', color: '#fff', border: 'none',
                  cursor: 'pointer', transition: 'opacity 0.15s, transform 0.15s',
                  boxShadow: '0 4px 14px rgba(37,99,235,0.4)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)' }}
              >
                Load more · {Math.min(12, filtered.length - visibleCount)} more
              </button>
            </div>
          )}
        </>
      )}

      <style>{`
        @keyframes shimmer {
          0%  { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  )
}
