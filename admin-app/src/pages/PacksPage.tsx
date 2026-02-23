import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { auth } from '../lib/firebase'
import { useTheme } from '../lib/useTheme'
import { useToast } from '../lib/ToastContext'
import { cloneQuiz, listPublicQuizzes } from '../lib/quizRepo'
import type { QuizDoc, QuizQuestion } from '../types/quiz'
import placeholderImg from '../assets/QYan_logo_300x164.jpg'

type QuizItem = QuizDoc & { id: string }

const IS_LOCAL_DEV = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)
const SERVER_BASE = IS_LOCAL_DEV
  ? (import.meta.env.VITE_LOCAL_GAME_URL || 'http://localhost:3001')
  : (import.meta.env.VITE_API_BASE_URL || 'https://quizengine.onrender.com')

// â”€â”€ helpers (mirror DashboardPage) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function getCoverImage(questions: QuizQuestion[]): string | null {
  for (const q of questions ?? []) {
    if (q.media?.type === 'image' && q.media.url) return q.media.url
  }
  return null
}

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

const GRADIENTS = [
  'linear-gradient(135deg, #1a1a6e 0%, #0f4c75 100%)',
  'linear-gradient(135deg, #0d2137 0%, #1b4332 100%)',
  'linear-gradient(135deg, #2d0036 0%, #6b21a8 100%)',
  'linear-gradient(135deg, #1c0b00 0%, #9a3412 100%)',
  'linear-gradient(135deg, #0a0a0a 0%, #1e3a5f 100%)',
  'linear-gradient(135deg, #0b3d0b 0%, #065f46 100%)',
]
function pickGradient(title: string): string {
  let hash = 0
  for (let i = 0; i < title.length; i++) hash = (hash * 31 + title.charCodeAt(i)) | 0
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length]
}

// â”€â”€ component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export function PacksPage() {
  const navigate = useNavigate()
  const currentUid = auth.currentUser?.uid ?? ''

  const [quizzes, setQuizzes] = useState<QuizItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cloningId, setCloningId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [visibleCount, setVisibleCount] = useState(6)
  const appTheme = useTheme()
  const dark = appTheme === 'dark'
  const { showToast } = useToast()
  const [filter, setFilter] = useState<'all' | 'mine' | 'others'>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    listPublicQuizzes()
      .then(setQuizzes)
      .catch(() => setError('Failed to load public quizzes.'))
      .finally(() => setLoading(false))
  }, [])

  async function handleClone(quiz: QuizItem) {
    if (!currentUid) return
    setCloningId(quiz.id)
    try {
      const newId = await cloneQuiz(quiz, currentUid)
      showToast({ message: 'Quiz cloned — you can now edit your copy.', type: 'success' })
      navigate(`/editor/${newId}`)
    } catch (err) {
      showToast({ message: `Clone failed: ${(err as Error).message}`, type: 'error' })
    } finally {
      setCloningId(null)
    }
  }

  const visible = quizzes
    .filter((q) =>
      filter === 'mine' ? q.ownerId === currentUid :
      filter === 'others' ? q.ownerId !== currentUid :
      true
    )
    .filter((q) => {
      if (!search.trim()) return true
      const s = search.toLowerCase()
      return (
        q.title.toLowerCase().includes(s) ||
        (q.description ?? '').toLowerCase().includes(s) ||
        (q.tags ?? []).some((t) => t.toLowerCase().includes(s))
      )
    })

  // Reset pagination when filter/search changes
  useEffect(() => { setVisibleCount(6) }, [filter, search])

  const shownQuizzes = visible.slice(0, visibleCount)

  const actionBtnStyle: React.CSSProperties = {
    width: '100%', padding: '0.38rem 0.5rem', borderRadius: '7px',
    background: dark ? '#1e293b' : '#f1f5f9',
    color: dark ? '#94a3b8' : '#475569',
    fontSize: '0.75rem', fontWeight: 600,
    border: `1px solid ${dark ? '#273549' : '#e2e8f0'}`,
    cursor: 'pointer', transition: 'background 0.15s, color 0.15s, border-color 0.15s',
  }
  const actionBtnHover: React.CSSProperties = {
    ...actionBtnStyle,
    background: dark ? '#273549' : '#e2e8f0',
    color: dark ? '#e2e8f0' : '#0f172a',
    border: `1px solid ${dark ? '#334155' : '#cbd5e1'}`,
  }
  const actionBtnPrimary: React.CSSProperties = {
    ...actionBtnStyle,
    background: dark ? '#1e3a5f' : '#dbeafe',
    color: dark ? '#93c5fd' : '#1d4ed8',
    border: `1px solid ${dark ? '#1e4a7a' : '#bfdbfe'}`,
  }
  const actionBtnPrimaryHover: React.CSSProperties = {
    ...actionBtnPrimary, background: '#1d4ed8', color: '#fff',
    border: '1px solid #2563eb',
  }

  return (
    <div style={{ padding: '0' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '1.5rem', padding: '1.5rem 0 0', flexWrap: 'wrap', gap: '1rem',
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, color: 'var(--text-bright)' }}>Public Quiz Library</h2>
          <p style={{ margin: '0.3rem 0 0', fontSize: '0.9rem', color: 'var(--text-dim)' }}>
            {loading ? '…' : `${visible.length} quiz${visible.length !== 1 ? 'zes' : ''} · Browse, preview or clone`}
          </p>
        </div>
        {/* Filter + Search */}
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            placeholder="Search…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '180px', padding: '8px 12px', fontSize: '0.85rem' }}
          />
          {(['all', 'mine', 'others'] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              style={{
                background: filter === f ? '#2563eb' : 'transparent',
                border: '1px solid',
                borderColor: filter === f ? '#2563eb' : 'var(--border-strong)',
                color: filter === f ? '#fff' : 'var(--text-dim)',
                padding: '7px 14px',
                fontSize: '0.8rem',
                cursor: 'pointer',
                borderRadius: '8px',
              }}
            >
              {f === 'all' ? 'All' : f === 'mine' ? 'Mine' : 'Community'}
            </button>
          ))}
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
          {[1,2,3,4,5,6].map((i) => (
            <div key={i} style={{
              height: '190px', borderRadius: '12px',
              background: dark ? 'linear-gradient(90deg, #1e293b 25%, #273549 50%, #1e293b 75%)' : 'linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%)',
              backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite',
            }} />
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && <p style={{ color: '#f87171' }}>{error}</p>}

      {/* Empty state */}
      {!loading && !error && visible.length === 0 && (
        <div style={{
          textAlign: 'center', padding: '5rem 2rem',
          border: '2px dashed var(--border-mid)', borderRadius: '20px', color: 'var(--text-mid)',
        }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🔭</div>
          <h3 style={{ color: '#94a3b8', margin: '0 0 0.5rem' }}>No quizzes found</h3>
          <p style={{ margin: 0 }}>
            {quizzes.length === 0
              ? 'Set a quiz to "Public" in the editor to share it here.'
              : 'Try a different search or filter.'}
          </p>
        </div>
      )}

      {/* Card grid */}
      {!loading && visible.length > 0 && (
        <>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '1rem',
          }}>
            {shownQuizzes.map((q) => {
            const isOwner = q.ownerId === currentUid
            const coverImg = q.coverImage || getCoverImage(q.questions ?? [])
            const emoji = pickEmoji(q.tags ?? [], q.title)
            const isHovered = hoveredId === q.id

            return (
              <div
                key={q.id}
                onMouseEnter={() => setHoveredId(q.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  borderRadius: '14px',
                  background: dark ? '#0f172a' : '#ffffff',
                  border: `1px solid ${isHovered ? (dark ? '#334155' : '#cbd5e1') : (dark ? '#1e293b' : '#e2e8f0')}`,
                  boxShadow: isHovered ? (dark ? '0 12px 32px rgba(0,0,0,0.5)' : '0 8px 24px rgba(0,0,0,0.1)') : (dark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 1px 4px rgba(0,0,0,0.06)'),
                  transform: isHovered ? 'translateY(-3px)' : 'translateY(0)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'default',
                  position: 'relative',
                }}
              >
                {/* Cover hero */}
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
                    onError={(e) => { (e.currentTarget as HTMLImageElement).onerror = null }}
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
                    href={`${SERVER_BASE}/?quiz=${encodeURIComponent(q.id)}&mode=host`}
                    target="_blank" rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
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
                    const photoURL = isOwner ? (auth.currentUser?.photoURL ?? null) : null
                    const initials = (q.ownerId ?? '??').slice(0, 2).toUpperCase()
                    const hue = q.ownerId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
                    const avBg = `hsl(${hue}, 55%, 40%)`
                    return photoURL ? (
                      <img src={photoURL} alt="owner" style={{
                        position: 'absolute', top: '6px', left: '6px',
                        width: '28px', height: '28px', borderRadius: '50%',
                        objectFit: 'cover', border: '2px solid rgba(255,255,255,0.4)',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
                      }} />
                    ) : (
                      <div style={{
                        position: 'absolute', top: '6px', left: '6px',
                        width: '28px', height: '28px', borderRadius: '50%',
                        background: avBg, display: 'flex', alignItems: 'center',
                        justifyContent: 'center', fontSize: '0.6rem', fontWeight: 700, color: '#fff',
                        border: '2px solid rgba(255,255,255,0.25)',
                        boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
                      }}>
                        {initials}
                      </div>
                    )
                  })()}
                </div>



                {/* Card body — title + count only */}
                <div style={{ padding: '0.65rem 0.8rem 0.5rem' }}>
                  <div style={{
                    fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-bright)', lineHeight: 1.4,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    marginBottom: '0.25rem',
                  }}>
                    {q.title}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 500 }}>
                    {q.questions?.length ?? 0} questions
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
                  {isOwner ? (
                    <>
                      <Link to={`/preview/${q.id}`} style={{ textDecoration: 'none', flex: 1 }}>
                        <button style={actionBtnStyle}
                          onMouseEnter={(e) => Object.assign(e.currentTarget.style, actionBtnHover)}
                          onMouseLeave={(e) => Object.assign(e.currentTarget.style, actionBtnStyle)}
                        >Preview</button>
                      </Link>
                      <Link to={`/editor/${q.id}`} style={{ textDecoration: 'none', flex: 1 }}>
                        <button style={actionBtnPrimary}
                          onMouseEnter={(e) => Object.assign(e.currentTarget.style, actionBtnPrimaryHover)}
                          onMouseLeave={(e) => Object.assign(e.currentTarget.style, actionBtnPrimary)}
                        >Edit</button>
                      </Link>
                      <button
                        title="Copy link"
                        onClick={() => navigator.clipboard?.writeText(`${SERVER_BASE}/?quiz=${encodeURIComponent(q.id)}`).then(() => alert('Link copied!'))}
                        style={{ ...actionBtnStyle, width: 'auto', flex: 'none', padding: '0.4rem 0.55rem' }}
                        onMouseEnter={(e) => Object.assign(e.currentTarget.style, { ...actionBtnHover, width: 'auto', flex: 'none', padding: '0.4rem 0.55rem' })}
                        onMouseLeave={(e) => Object.assign(e.currentTarget.style, { ...actionBtnStyle, width: 'auto', flex: 'none', padding: '0.4rem 0.55rem' })}
                      >🔗</button>
                    </>
                  ) : (
                    <>
                      <Link to={`/preview/${q.id}`} style={{ textDecoration: 'none', flex: 1 }}>
                        <button style={actionBtnStyle}
                          onMouseEnter={(e) => Object.assign(e.currentTarget.style, actionBtnHover)}
                          onMouseLeave={(e) => Object.assign(e.currentTarget.style, actionBtnStyle)}
                        >Preview</button>
                      </Link>
                      <button
                        onClick={() => handleClone(q)}
                        disabled={cloningId === q.id}
                        style={{ ...actionBtnPrimary, flex: 1, opacity: cloningId === q.id ? 0.6 : 1, cursor: cloningId === q.id ? 'not-allowed' : 'pointer' }}
                        onMouseEnter={(e) => { if (cloningId !== q.id) Object.assign(e.currentTarget.style, actionBtnPrimaryHover) }}
                        onMouseLeave={(e) => Object.assign(e.currentTarget.style, { ...actionBtnPrimary, flex: '1' })}
                      >{cloningId === q.id ? 'Cloning…' : 'Clone'}</button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
          </div>
          {visibleCount < visible.length && (
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
                Load more · {Math.min(6, visible.length - visibleCount)} more
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
