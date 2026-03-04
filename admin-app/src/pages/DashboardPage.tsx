import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import './DashboardPage.css'
import { auth } from '../lib/firebase'
import { cancelPublishRequest, incrementQuizPlayCount, incrementShareCount, listPublicQuizzes, requestPublicVisibility, subscribeMyQuizzes, updateQuiz } from '../lib/quizRepo'
import { getCoverFromQuestions, isNewContent } from '../lib/utils'
import { incrementPlatformStat } from '../lib/adminRepo'
import { guardedLaunchGame } from '../lib/gameLaunch'
import { buildHostGameUrl } from '../lib/gameModeUrl'
import { getHostLaunchAuthParams } from '../lib/hostLaunchAuth'
import type { QuizDoc } from '../types/quiz'
import { useTheme } from '../lib/useTheme'
import placeholderImg from '../assets/QYan_logo_300x164.jpg'
import { useToast } from '../lib/ToastContext'
import { useSubscription } from '../lib/useSubscription'
import { useDialog } from '../lib/DialogContext'

type QuizItem = QuizDoc & { id: string }

function getEditorPath(item: QuizItem): string {
  const isMiniGame = item.contentType === 'mini-game' || !!item.gameModeId
  return isMiniGame ? `/mini-game-editor/${item.id}` : `/editor/${item.id}`
}

const IS_LOCAL_DEV = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)
const SERVER_BASE = IS_LOCAL_DEV
  ? (import.meta.env.VITE_LOCAL_GAME_URL || 'http://localhost:3001')
  : (import.meta.env.VITE_API_BASE_URL || 'https://play.qyan.app')

// ── helpers ───────────────────────────────────────────────────────────────────

/** Map tag/title keywords to an emoji icon */
function pickEmoji(tags: string[], title: string): string {
  const text = [...tags, title].join(' ').toLowerCase()
  if (/(geo|جغراف|world|عالم|map|خريطة)/.test(text)) return '🗺️'
  if (/(sport|رياض|كرة|ball|أولمب)/.test(text)) return '⚽'
  if (/(science|علوم|tech|تكنول|physics|chem)/.test(text)) return '⚗️'
  if (/(history|تاريخ|islam|إسلام|arab|عرب)/.test(text)) return '📜'
  if (/(nature|طبيعة|animal|حيوان|plant|نبات)/.test(text)) return '🌿'
  if (/(culture|ثقافة|art|فن|music|موسيق|general|عام)/.test(text)) return '🎨'
  if (/(math|رياضيات|number|عدد)/.test(text)) return '🔢'
  if (/(food|طعام|cook|طبخ)/.test(text)) return '🍕'
  if (/(movie|film|سينما|cinema)/.test(text)) return '🎬'
  if (/(music|موسيقى|song|أغنية)/.test(text)) return '🎵'
  return '🧠'
}

/** Pick a gradient by hashing the quiz title */
/** Preset → label + colour */
function presetBadge(preset?: string) {
  if (preset === 'easy') return { label: 'سهل', color: '#16a34a' }
  if (preset === 'hard') return { label: 'صعب', color: '#dc2626' }
  return { label: 'عادي', color: '#2563eb' }
}

// ── component ─────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const [quizzes, setQuizzes] = useState<QuizItem[]>([])
  const [loading, setLoading] = useState(true)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const visibleCount = 6
  const menuRef = useRef<HTMLDivElement>(null)
  const [publicLibrary, setPublicLibrary] = useState<(QuizDoc & { id: string })[]>([])
  const [publicLoading, setPublicLoading] = useState(true)
  const { showToast } = useToast()
  const { show: showDialog } = useDialog()
  const { isSubscribed } = useSubscription()
  const appTheme = useTheme()
  const dark = appTheme === 'dark'

  useEffect(() => {
    listPublicQuizzes()
      .then((list) => {
        const toMs = (ts: any) => ts?.toMillis?.() ?? (ts?.seconds ? ts.seconds * 1000 : 0)
        setPublicLibrary([...list].sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt)).slice(0, 6))
      })
      .catch(() => {})
      .finally(() => setPublicLoading(false))
  }, [])

  useEffect(() => {
    const uid = auth.currentUser?.uid
    if (!uid) { setLoading(false); return }
    const unsub = subscribeMyQuizzes(
      uid,
      (list) => {
        const sorted = [...list].sort((a, b) => {
          const toMs = (ts: any) => ts?.toMillis?.() ?? (ts?.seconds ? ts.seconds * 1000 : 0)
          return toMs(b.createdAt) - toMs(a.createdAt) // newest first
        })
        setQuizzes(sorted as QuizItem[])
        setLoading(false)
      },
      (err) => { console.error(err); setLoading(false) }
    )
    return unsub
  }, [])

  // Close menu when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function handleVisibilityChange(quiz: QuizItem, newVis: 'public' | 'private') {
    setMenuOpenId(null)
    const masterEmail = import.meta.env.VITE_MASTER_EMAIL as string | undefined
    const isMasterAdmin = !!masterEmail && auth.currentUser?.email === masterEmail

    if (newVis === 'private') {
      // If already private with no pending request, nothing to do
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

    // Requesting public
    if (quiz.approvalStatus === 'pending') return // already pending, ignore
    if (quiz.visibility === 'public') return // already public

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
        onConfirm: () => {
          window.location.assign('/billing')
        },
      })
      return
    }

    // Open the window NOW — synchronously inside the user-gesture — before any
    // async work.  Mobile browsers (iOS Safari) will block window.open() if it
    // happens after an await.
    const preOpenedTab = window.open('', '_blank')

    const authParams = await getHostLaunchAuthParams({
      serverBase: SERVER_BASE,
      currentUser: auth.currentUser,
    })

    const gameUrl = buildHostGameUrl({
      serverBase: SERVER_BASE,
      quizId: quiz.id,
      gameModeId: quiz.gameModeId,
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
        void incrementQuizPlayCount(quiz.id)
      },
    })
  }

  // ── Dashboard derived data ─────────────────────────────────────────────────
  const authUser = auth.currentUser
  const displayName = authUser?.displayName || authUser?.email?.split('@')[0] || 'there'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
  const totalQuestions = quizzes.reduce((sum, q) => sum + (q.questions?.length ?? 0), 0)
  const publicCount = quizzes.filter(q => q.visibility === 'public').length
  const privateCount = quizzes.filter(q => q.visibility === 'private').length
  const recentQuizzes = [...quizzes]
    .sort((a, b) => {
      const ta = (a.updatedAt as { seconds: number } | null)?.seconds ?? 0
      const tb = (b.updatedAt as { seconds: number } | null)?.seconds ?? 0
      return tb - ta
    })
    .slice(0, 4)

  return (
    <div className="dashboard-container">
      {/* ── Welcome banner ── */}
      <div className="dashboard-header">
        <div>
          <h2 className="dashboard-header-title">
            {greeting}, {displayName} 👋
          </h2>
          <p className="dashboard-header-date">{dateStr}</p>
        </div>
        <div className="dashboard-header-actions">
        <Link to="/editor" style={{ textDecoration: 'none' }}>
          <button className="dashboard-btn dashboard-btn-primary">
            <span>＋</span> New Quiz
          </button>
        </Link>
        <Link to="/mini-game-editor" style={{ textDecoration: 'none' }}>
          <button className="dashboard-btn dashboard-btn-secondary">
            <span>🎮</span> New Mini Game
          </button>
        </Link>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="dashboard-stats-grid">
        {([
          { icon: '📋', value: loading ? '—' : String(quizzes.length), label: 'Total Quizzes', accent: '#2563eb', bg: 'rgba(37,99,235,0.12)' },
          { icon: '❓', value: loading ? '—' : String(totalQuestions), label: 'Questions', accent: '#7c3aed', bg: 'rgba(124,58,237,0.12)' },
          { icon: '🌐', value: loading ? '—' : String(publicCount), label: 'Public', accent: '#059669', bg: 'rgba(5,150,105,0.12)' },
          { icon: '🔒', value: loading ? '—' : String(privateCount), label: 'Private', accent: '#d97706', bg: 'rgba(217,119,6,0.12)' },
        ] as const).map((sc) => (
          <div key={sc.label} className="stat-card">
            <div className="stat-icon-bg" style={{ background: sc.bg }}>{sc.icon}</div>
            <div className="stat-value">{sc.value}</div>
            <div className="stat-label">{sc.label}</div>
            <div className="stat-accent-bar" style={{ background: sc.accent }} />
          </div>
        ))}
      </div>

      {/* ── Public Library Preview ── */}
      <div className="dashboard-section">
        <div className="dashboard-section-header">
          <div>
            <h3 className="dashboard-section-title">📚 مكتبة الاختبارات</h3>
            <p className="dashboard-section-desc">اختبارات عامة منشورة للجميع</p>
          </div>
          <Link to="/packs" style={{ textDecoration: 'none' }}>
            <button className="dashboard-link-btn">استعراض الكل ›</button>
          </Link>
        </div>

        {publicLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem' }}>
            {[1,2,3,4,5,6].map(i => (
              <div key={i} style={{ height: 120, borderRadius: 12, background: 'linear-gradient(90deg, var(--bg-deep) 25%, var(--border) 50%, var(--bg-deep) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
            ))}
          </div>
        ) : publicLibrary.length === 0 ? null : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '0.75rem' }}>
            {publicLibrary.map((q) => {
              const cover = (q as any).coverImage || getCoverFromQuestions((q as any).questions ?? [])
              const emoji = pickEmoji((q as any).tags ?? [], q.title)
              return (
                <div key={(q as any).id} className="pub-card" onClick={() => handleLaunchGame(q as QuizItem)}>
                  {/* Thumbnail with play button */}
                  <div className="pub-cover" style={{ background: cover ? `url(${cover}) center/cover no-repeat` : 'linear-gradient(135deg, #1e40af33, #7c3aed33)', fontSize: '2rem' }}>
                    {!cover && emoji}
                    {/* Play button overlay */}
                    <div className="pub-play-overlay">
                      <div className="pub-play-btn">▶</div>
                    </div>
                  </div>
                  {/* Info — clicking navigates to packs */}
                  <Link to="/packs" style={{ textDecoration: 'none' }} onClick={(e) => e.stopPropagation()}>
                    <div className="pub-info">
                      <div className="pub-title">{q.title}</div>
                      <div className="pub-meta">
                        {(q as any).questions?.length ?? 0} أسئلة
                      </div>
                    </div>
                  </Link>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Quick Actions + Recently Updated ── */}
      <div className="dashboard-mid-grid">
        {/* Quick Actions */}
        <div className="activity-list-container">
          <div className="activity-list-title">Quick Actions</div>
          <div className="activity-list">
            {([
              { icon: '＋', label: 'New Quiz', to: '/editor', primary: true },
              { icon: '🎮', label: 'New Mini Game', to: '/mini-game-editor', primary: false },
              { icon: '✏️', label: 'Quiz Editor', to: '/editor', primary: false },
              { icon: '📦', label: 'Packs Library', to: '/packs', primary: false },
              { icon: '💳', label: 'Billing', to: '/billing', primary: false },
            ] as const).map((qa) => (
              <Link key={qa.label} to={qa.to} style={{ textDecoration: 'none' }}>
                <div className={`activity-item ${qa.primary ? 'primary' : ''}`}>
                  <span style={{ width: 20, textAlign: 'center', flexShrink: 0 }}>{qa.icon}</span>
                  <span style={{ flex: 1 }}>{qa.label}</span>
                  <span style={{ fontSize: '0.7rem', opacity: 0.4 }}>›</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recently Updated */}
        <div className="activity-list-container">
          <div className="activity-list-title">Recently Updated</div>
          {loading ? (
            <div className="activity-list">
              {[1,2,3].map(i => (
                <div key={i} className="shimmer-card" style={{ height: 50 }} />
              ))}
            </div>
          ) : recentQuizzes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No quizzes yet</div>
          ) : (
            <div className="activity-list">
              {recentQuizzes.map((q) => {
                const emoji = pickEmoji(q.tags ?? [], q.title)
                const badge = presetBadge(q.challengePreset)
                return (
                  <div key={q.id} className="activity-item compact">
                    <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>{emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <div className="activity-item-title">
                          {q.title}
                        </div>
                        {isNewContent(q.createdAt) && (
                          <span className="badge-new">New</span>
                        )}
                      </div>
                      <div className="activity-item-meta">
                        {q.questions?.length ?? 0} questions
                        &nbsp;&middot;&nbsp;<span style={{ color: badge.color }}>{badge.label}</span>
                        &nbsp;&middot;&nbsp;{q.visibility === 'public' ? '🌐 Public' : '🔒 Private'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
                      <Link to={`/preview/${q.id}`} title="Preview" style={{ textDecoration: 'none' }}>
                        <button className="icon-btn-small">👁️</button>
                      </Link>
                      <Link to={getEditorPath(q)} title="Edit" style={{ textDecoration: 'none' }}>
                        <button className="icon-btn-small primary">✏️</button>
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── My Quizzes ── */}
      <div className="dashboard-section-header" style={{ marginTop: '2.5rem' }}>
        <div>
          <h3 className="dashboard-section-title">My Quizzes</h3>
          <p className="dashboard-section-desc">
            {loading ? '...' : `${quizzes.length} quiz${quizzes.length !== 1 ? 'zes' : ''}`}
          </p>
        </div>
        {quizzes.length > 0 && (
          <Link to="/my-quizzes" style={{ textDecoration: 'none' }}>
            <button className="dashboard-link-btn outlined">
              View all →
            </button>
          </Link>
        )}
      </div>

      {/* ── Loading skeleton ── */}
      {loading && (
        <div className="dashboard-grid">
          {[1,2,3,4,5,6].map((i) => (
            <div key={i} className="shimmer-card quiz-card-shimmer" />
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && quizzes.length === 0 && (
        <div className="empty-state-container">
          <div className="empty-state-icon">📋</div>
          <h3 className="empty-state-title">لا توجد اختبارات بعد</h3>
          <p className="empty-state-desc">أنشئ أول اختبار لك الآن</p>
          <Link to="/editor" style={{ textDecoration: 'none' }}>
            <button className="dashboard-btn dashboard-btn-primary" style={{ padding: '0.75rem 2rem' }}>
              ＋ إنشاء اختبار
            </button>
          </Link>
        </div>
      )}

      {/* ── Card grid ── */}
      {!loading && quizzes.length > 0 && (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '1rem',
          }}>
            {quizzes.slice(0, visibleCount).map((q) => {
            const coverImg = q.coverImage || getCoverFromQuestions(q.questions ?? [])
            const badge = presetBadge(q.challengePreset)
            const isHovered = hoveredId === q.id

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
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  position: 'relative',
                }}
              >
                {/* Cover image / gradient hero */}
                <div style={{
                  height: '120px',
                  position: 'relative',
                  overflow: 'hidden',
                  background: coverImg ? '#000' : '#0f172a',
                  flexShrink: 0,
                  borderRadius: '13px 13px 0 0',
                }}>
                  <img
                    src={coverImg || placeholderImg}
                    alt={q.title}
                    onError={(e) => { 
                      ;(e.currentTarget as HTMLImageElement).src = placeholderImg
                    }}
                    style={{
                      width: '100%', height: '100%',
                      objectFit: coverImg ? 'cover' : 'contain',
                      opacity: isHovered ? 0.95 : coverImg ? 0.75 : 0.85,
                      transition: 'opacity 0.3s, transform 0.4s',
                      transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                      padding: coverImg ? 0 : '16px',
                    }}
                  />
                  {/* Centered play button overlay */}
                  <a
                    href={buildHostGameUrl({ serverBase: SERVER_BASE, quizId: q.id, gameModeId: q.gameModeId })}
                    target="_blank" rel="noopener noreferrer"
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      void handleLaunchGame(q)
                    }}
                    style={{
                      position: 'absolute',
                      top: '50%', left: '50%',
                      transform: isHovered ? 'translate(-50%, -50%) scale(1)' : 'translate(-50%, -50%) scale(0.8)',
                      opacity: isHovered ? 1 : 0,
                      transition: 'opacity 0.2s, transform 0.2s',
                      padding: '0.55rem 1.3rem',
                      borderRadius: '10px',
                      whiteSpace: 'nowrap',
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
                  {/* Subtle bottom fade */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: dark
                      ? 'linear-gradient(to top, rgba(15,23,42,0.9) 0%, transparent 60%)'
                      : 'linear-gradient(to top, rgba(255,255,255,0.85) 0%, transparent 55%)',
                    pointerEvents: 'none',
                  }} />
                  {/* Owner avatar */}
                  {(() => {
                    const photoURL = auth.currentUser?.photoURL ?? null
                    const dName = auth.currentUser?.displayName || auth.currentUser?.email || q.ownerId
                    const initials = dName.slice(0, 2).toUpperCase()
                    const hue = q.ownerId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
                    const avBg = `hsl(${hue}, 55%, 40%)`
                    return (
                      <div style={{
                        position: 'absolute', top: '6px', left: '6px',
                        width: '28px', height: '28px', borderRadius: '50%',
                        background: avBg, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.6rem', fontWeight: 700, color: '#fff',
                        border: '2px solid rgba(255,255,255,0.25)',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
                        overflow: 'hidden',
                        zIndex: 6,
                      }}>
                        {initials}
                        {photoURL && (
                          <img 
                            src={photoURL} 
                            alt="" 
                            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                            style={{
                              position: 'absolute', inset: 0,
                              width: '100%', height: '100%',
                              objectFit: 'cover',
                            }} 
                          />
                        )}
                      </div>
                    )
                  })()}
                  {/* Preset badge — shown on hover only */}
                  {badge.label !== 'Custom' && (
                    <div style={{
                      position: 'absolute', top: '6px', right: '6px',
                      background: badge.color, color: '#fff',
                      fontSize: '0.62rem', fontWeight: 700,
                      padding: '2px 7px', borderRadius: '999px',
                      opacity: isHovered ? 1 : 0.6,
                      transition: 'opacity 0.2s',
                    }}>
                      {badge.label}
                    </div>
                  )}
                  {/* NEW badge — bottom-right of cover */}
                  {isNewContent(q.createdAt) && (
                    <div style={{
                      position: 'absolute', bottom: '6px', right: '6px',
                      background: 'linear-gradient(135deg,#10b981,#059669)',
                      color: '#fff', fontSize: '0.58rem', fontWeight: 800,
                      padding: '2px 6px', borderRadius: '4px',
                      textTransform: 'uppercase', letterSpacing: '0.06em',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.4)', zIndex: 7,
                    }}>New</div>
                  )}
                </div>

                {/* Three-dot menu — card-level to avoid hero clip */}
                <div
                  style={{ position: 'absolute', top: '6px', right: '6px', zIndex: 10 }}
                  ref={menuOpenId === q.id ? menuRef : undefined}
                >
                    <div style={{ opacity: isHovered ? 1 : 0, transition: 'opacity 0.15s' }}>
                      <button
                        title="More options"
                        onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === q.id ? null : q.id) }}
                        disabled={updatingId === q.id}
                        style={{
                          background: dark ? 'rgba(15,23,42,0.8)' : 'rgba(255,255,255,0.88)', backdropFilter: 'blur(6px)',
                          border: `1px solid ${dark ? '#334155' : '#cbd5e1'}`, color: dark ? '#94a3b8' : '#475569',
                          fontSize: '0.85rem', padding: '3px 7px', cursor: 'pointer',
                          borderRadius: '6px', lineHeight: 1,
                          opacity: updatingId === q.id ? 0.4 : 1,
                        }}
                      >
                        {updatingId === q.id ? '…' : '⋯'}
                      </button>
                  </div>
                  {menuOpenId === q.id && (
                      <div style={{
                        position: 'absolute', top: '100%', right: 0, zIndex: 50,
                        background: dark ? '#1e293b' : '#ffffff',
                        border: `1px solid ${dark ? '#334155' : '#e2e8f0'}`,
                        borderRadius: '10px', minWidth: '160px',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                        overflow: 'hidden', marginTop: '4px',
                      }}>
                        <div style={{ padding: '6px 10px', fontSize: '0.62rem', color: dark ? '#64748b' : '#94a3b8', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                          Visibility
                        </div>
                        {(['public', 'private'] as const).map((v) => {
                          const isActive = v === 'public'
                            ? (q.visibility === 'public' || q.approvalStatus === 'pending')
                            : (q.visibility === 'private' && !q.approvalStatus)
                          const label = v === 'public'
                            ? (q.approvalStatus === 'pending' ? 'في الانتظار 🕐' : q.visibility === 'public' ? 'عام' : 'طلب نشر 🌐')
                            : 'خاص 🔒'
                          return (
                            <button
                              key={v}
                              onClick={(e) => { e.stopPropagation(); handleVisibilityChange(q, v) }}
                              style={{
                                width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem',
                                padding: '8px 12px', background: isActive ? (dark ? '#0f172a' : '#f1f5f9') : 'transparent',
                                border: 'none', color: isActive ? (dark ? '#f1f5f9' : '#0f172a') : (dark ? '#94a3b8' : '#64748b'),
                                fontSize: '0.8rem', cursor: 'pointer', textAlign: 'left',
                                transition: 'background 0.15s',
                              }}
                              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = dark ? '#273549' : '#f8fafc' }}
                              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent' }}
                            >
                              <span style={{ flex: 1 }}>{label}</span>
                              {isActive && <span style={{ fontSize: '0.7rem', color: '#2563eb' }}>✓</span>}
                            </button>
                          )
                        })}
                      </div>
                    )}
                </div>

                {/* Card body — title + count only */}
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
                  </div>
                </div>

                {/* Hover action bar */}
                <div style={{
                  display: 'flex', gap: '0.4rem',
                  padding: '0 0.7rem 0.7rem',
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
                </div>
              </div>
            )
          })}
          </div>
          {visibleCount < quizzes.length && (
            <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
              <Link to="/my-quizzes" style={{ textDecoration: 'none' }}>
                <button
                  style={{
                    padding: '0.65rem 2.25rem', borderRadius: '10px', fontSize: '0.875rem', fontWeight: 700,
                    background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                    color: '#fff', border: 'none',
                    cursor: 'pointer', transition: 'opacity 0.15s, transform 0.15s',
                    boxShadow: '0 4px 14px rgba(37,99,235,0.4)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)' }}
                >
                  View all {quizzes.length} quizzes →
                </button>
              </Link>
            </div>
          )}
        </>
      )}

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        .pub-card:hover .pub-play-btn { transform: scale(1.18); }

      `}</style>
    </div>
  )
}
