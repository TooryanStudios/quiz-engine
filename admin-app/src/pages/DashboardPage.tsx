import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { auth } from '../lib/firebase'
import { incrementShareCount, subscribeMyQuizzes, updateQuiz } from '../lib/quizRepo'
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

type QuizItem = QuizDoc & { id: string }

const IS_LOCAL_DEV = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)
const SERVER_BASE = IS_LOCAL_DEV
  ? (import.meta.env.VITE_LOCAL_GAME_URL || 'http://localhost:3001')
  : (import.meta.env.VITE_API_BASE_URL || 'https://play.qyan.app')

// ── helpers ───────────────────────────────────────────────────────────────────

/** Pick the first image URL found in any question's media field */
function getCoverImage(questions: QuizQuestion[]): string | null {
  for (const q of questions ?? []) {
    if (q.media?.type === 'image' && q.media.url) return q.media.url
  }
  return null
}

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

/** Returns true if the quiz was created within the last 14 days (industry standard) */
const NEW_QUIZ_MS = 14 * 24 * 60 * 60 * 1000
function isNewQuiz(createdAt: any): boolean {
  if (!createdAt) return false
  const ms: number = createdAt?.toMillis?.() ?? (createdAt?.seconds ? createdAt.seconds * 1000 : 0)
  return ms > 0 && Date.now() - ms < NEW_QUIZ_MS
}

// ── component ─────────────────────────────────────────────────────────────────

export function DashboardPage() {
  const [quizzes, setQuizzes] = useState<QuizItem[]>([])
  const [loading, setLoading] = useState(true)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(6)
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
    if (newVis === quiz.visibility) return
    if (newVis === 'private') {
      const ok = window.confirm(
        `Make "${quiz.title}" private?\n\nIt will no longer appear in the Public Library and no one else can see it.`
      )
      if (!ok) return
    }
    setUpdatingId(quiz.id)
    try {
      await updateQuiz(quiz.id, { visibility: newVis })
      setQuizzes((prev) =>
        prev.map((q) => q.id === quiz.id ? { ...q, visibility: newVis } : q)
      )
    } catch {
      alert('Failed to update visibility. Please try again.')
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
    <div style={{ padding: '0' }}>
      {/* ── Welcome banner ── */}
      <div style={{
        paddingTop: '1.5rem', paddingBottom: '1.25rem',
        marginBottom: '1.5rem',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem',
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-bright)' }}>
            {greeting}, {displayName} 👋
          </h2>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>{dateStr}</p>
        </div>
        <Link to="/editor" style={{ textDecoration: 'none' }}>
          <button style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.65rem 1.3rem', borderRadius: '10px',
            background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
            border: 'none', color: '#fff', fontSize: '0.9rem', fontWeight: 600,
            cursor: 'pointer', boxShadow: '0 4px 14px rgba(37,99,235,0.35)', whiteSpace: 'nowrap',
          }}>
            <span>＋</span> New Quiz
          </button>
        </Link>
      </div>

      {/* ── Stats row ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(145px, 1fr))',
        gap: '1rem', marginBottom: '1.5rem',
      }}>
        {([
          { icon: '📋', value: loading ? '—' : String(quizzes.length), label: 'Total Quizzes', accent: '#2563eb', bg: 'rgba(37,99,235,0.12)' },
          { icon: '❓', value: loading ? '—' : String(totalQuestions), label: 'Questions', accent: '#7c3aed', bg: 'rgba(124,58,237,0.12)' },
          { icon: '🌐', value: loading ? '—' : String(publicCount), label: 'Public', accent: '#059669', bg: 'rgba(5,150,105,0.12)' },
          { icon: '🔒', value: loading ? '—' : String(privateCount), label: 'Private', accent: '#d97706', bg: 'rgba(217,119,6,0.12)' },
        ] as const).map((sc) => (
          <div key={sc.label} style={{
            background: 'var(--bg-surface)', border: '1px solid var(--border)',
            borderRadius: '14px', padding: '1rem 1.1rem',
            display: 'flex', flexDirection: 'column', gap: '0.45rem',
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: '10px', background: sc.bg,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem',
            }}>
              {sc.icon}
            </div>
            <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-bright)', lineHeight: 1 }}>
              {sc.value}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 500 }}>
              {sc.label}
            </div>
            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', background: sc.accent, opacity: 0.6 }} />
          </div>
        ))}
      </div>

      {/* ── Quick Actions + Recently Updated ── */}
      <div className="dashboard-mid-grid" style={{ marginBottom: '2.5rem' }}>
        {/* Quick Actions */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1rem 1.1rem' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
            Quick Actions
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {([
              { icon: '＋', label: 'New Quiz', to: '/editor', primary: true },
              { icon: '✏️', label: 'Quiz Editor', to: '/editor', primary: false },
              { icon: '📦', label: 'Packs Library', to: '/packs', primary: false },
              { icon: '💳', label: 'Billing', to: '/billing', primary: false },
            ] as const).map((qa) => (
              <Link key={qa.label} to={qa.to} style={{ textDecoration: 'none' }}>
                <div
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.65rem',
                    padding: '0.6rem 0.8rem', borderRadius: '9px',
                    background: qa.primary ? 'linear-gradient(135deg, #2563eb, #7c3aed)' : 'var(--bg-deep)',
                    border: qa.primary ? 'none' : '1px solid var(--border)',
                    color: qa.primary ? '#fff' : 'var(--text)',
                    cursor: 'pointer', transition: 'opacity 0.15s, transform 0.15s',
                    fontSize: '0.85rem', fontWeight: qa.primary ? 700 : 500,
                  }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLElement).style.opacity = '0.85'
                    ;(e.currentTarget as HTMLElement).style.transform = 'translateX(3px)'
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLElement).style.opacity = '1'
                    ;(e.currentTarget as HTMLElement).style.transform = 'translateX(0)'
                  }}
                >
                  <span style={{ width: 20, textAlign: 'center', flexShrink: 0 }}>{qa.icon}</span>
                  <span style={{ flex: 1 }}>{qa.label}</span>
                  <span style={{ fontSize: '0.7rem', opacity: 0.4 }}>›</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Recently Updated */}
        <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '1rem 1.1rem' }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: '0.75rem' }}>
            Recently Updated
          </div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[1,2,3].map(i => (
                <div key={i} style={{ height: 50, borderRadius: 10, background: 'linear-gradient(90deg, var(--bg-deep) 25%, var(--border) 50%, var(--bg-deep) 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
              ))}
            </div>
          ) : recentQuizzes.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '2.5rem 1rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No quizzes yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {recentQuizzes.map((q) => {
                const emoji = pickEmoji(q.tags ?? [], q.title)
                const badge = presetBadge(q.challengePreset)
                return (
                  <div key={q.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '0.75rem',
                      padding: '0.6rem 0.75rem', borderRadius: '10px',
                      background: 'var(--bg-deep)', border: '1px solid var(--border)',
                      transition: 'border-color 0.15s',
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-strong)' }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)' }}
                  >
                    <span style={{ fontSize: '1.25rem', flexShrink: 0 }}>{emoji}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <div style={{ fontSize: '0.83rem', fontWeight: 600, color: 'var(--text-bright)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                          {q.title}
                        </div>
                        {isNewQuiz(q.createdAt) && (
                          <span style={{ flexShrink: 0, fontSize: '0.58rem', fontWeight: 800, letterSpacing: '0.06em', padding: '1px 5px', borderRadius: '4px', background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', textTransform: 'uppercase' }}>New</span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '1px' }}>
                        {q.questions?.length ?? 0} questions
                        &nbsp;&middot;&nbsp;<span style={{ color: badge.color }}>{badge.label}</span>
                        &nbsp;&middot;&nbsp;{q.visibility === 'public' ? '🌐 Public' : '🔒 Private'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.3rem', flexShrink: 0 }}>
                      <Link to={`/preview/${q.id}`} title="Preview" style={{ textDecoration: 'none' }}>
                        <button style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-dim)', padding: '4px 8px', borderRadius: '6px', fontSize: '0.7rem', cursor: 'pointer' }}>👁️</button>
                      </Link>
                      <Link to={`/editor/${q.id}`} title="Edit" style={{ textDecoration: 'none' }}>
                        <button style={{ background: '#2563eb', border: 'none', color: '#fff', padding: '4px 8px', borderRadius: '6px', fontSize: '0.7rem', cursor: 'pointer' }}>✏️</button>
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-bright)' }}>My Quizzes</h3>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {loading ? '...' : `${quizzes.length} quiz${quizzes.length !== 1 ? 'zes' : ''}`}
          </p>
        </div>
      </div>

      {/* ── Loading skeleton ── */}
      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
          {[1,2,3,4,5,6].map((i) => (
            <div key={i} style={{
              height: '190px',
              borderRadius: '12px',
              background: dark ? 'linear-gradient(90deg, #1e293b 25%, #273549 50%, #1e293b 75%)' : 'linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s infinite',
            }} />
          ))}
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && quizzes.length === 0 && (
        <div style={{
          textAlign: 'center',
          padding: '5rem 2rem',
          border: `2px dashed ${dark ? '#1e293b' : '#cbd5e1'}`,
          borderRadius: '20px',
          color: 'var(--text-mid)',
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>📋</div>
          <h3 style={{ color: '#94a3b8', margin: '0 0 0.5rem' }}>لا توجد اختبارات بعد</h3>
          <p style={{ margin: '0 0 1.5rem' }}>أنشئ أول اختبار لك الآن</p>
          <Link to="/editor" style={{ textDecoration: 'none' }}>
            <button style={{ padding: '0.75rem 2rem', borderRadius: '10px', background: 'linear-gradient(135deg, #2563eb, #7c3aed)' }}>
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
            const coverImg = q.coverImage || getCoverImage(q.questions ?? [])
            const badge = presetBadge(q.challengePreset)
            const isHovered = hoveredId === q.id

            const aBtnStyle: React.CSSProperties = {
              width: '100%', padding: '0.38rem 0.5rem', borderRadius: '7px',
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
                      padding: '0.4rem 1rem',
                      borderRadius: '10px',
                      whiteSpace: 'nowrap',
                      background: 'rgba(22,163,74,0.9)', backdropFilter: 'blur(4px)',
                      border: '2px solid rgba(255,255,255,0.5)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem',
                      color: '#fff', fontSize: '0.82rem', fontWeight: 700,
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
                  {isNewQuiz(q.createdAt) && (
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
                        {(['public', 'private'] as const).map((v) => (
                          <button
                            key={v}
                            onClick={(e) => { e.stopPropagation(); handleVisibilityChange(q, v) }}
                            style={{
                              width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem',
                              padding: '8px 12px', background: q.visibility === v ? (dark ? '#0f172a' : '#f1f5f9') : 'transparent',
                              border: 'none', color: q.visibility === v ? (dark ? '#f1f5f9' : '#0f172a') : (dark ? '#94a3b8' : '#64748b'),
                              fontSize: '0.8rem', cursor: 'pointer', textAlign: 'left',
                              transition: 'background 0.15s',
                            }}
                            onMouseEnter={(e) => { if (q.visibility !== v) e.currentTarget.style.background = dark ? '#273549' : '#f8fafc' }}
                            onMouseLeave={(e) => { if (q.visibility !== v) e.currentTarget.style.background = 'transparent' }}
                          >
                            <span>{v === 'public' ? '🌐' : '🔒'}</span>
                            <span style={{ flex: 1 }}>{v === 'public' ? 'عام' : 'خاص'}</span>
                            {q.visibility === v && <span style={{ fontSize: '0.7rem', color: '#2563eb' }}>✓</span>}
                          </button>
                        ))}
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
                  <Link to={`/editor/${q.id}`} style={{ textDecoration: 'none', flex: 1 }}>
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
              <button
                onClick={() => setVisibleCount((c) => c + 6)}
                style={{
                  padding: '0.65rem 2.25rem', borderRadius: '10px', fontSize: '0.875rem', fontWeight: 700,
                  background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer', transition: 'opacity 0.15s, transform 0.15s',
                  boxShadow: '0 4px 14px rgba(37,99,235,0.4)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.85'; e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)' }}
              >
                Load more · {Math.min(6, quizzes.length - visibleCount)} more
              </button>
            </div>
          )}
        </>
      )}

      <style>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  )
}
