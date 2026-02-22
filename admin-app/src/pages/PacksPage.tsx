import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { auth } from '../lib/firebase'
import { cloneQuiz, listPublicQuizzes, updateQuiz } from '../lib/quizRepo'
import type { QuizDoc, QuizQuestion } from '../types/quiz'

type QuizItem = QuizDoc & { id: string }

// â”€â”€ helpers (mirror DashboardPage) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function getCoverImage(questions: QuizQuestion[]): string | null {
  for (const q of questions ?? []) {
    if (q.media?.type === 'image' && q.media.url) return q.media.url
  }
  return null
}

function pickEmoji(tags: string[], title: string): string {
  const text = [...tags, title].join(' ').toLowerCase()
  if (/(geo|Ø¬ØºØ±Ø§Ù|world|Ø¹Ø§Ù„Ù…|map|Ø®Ø±ÙŠØ·Ø©)/.test(text)) return 'ðŸ—ºï¸'
  if (/(sport|Ø±ÙŠØ§Ø¶|ÙƒØ±Ø©|ball|Ø£ÙˆÙ„Ù…Ø¨)/.test(text)) return 'âš½'
  if (/(science|Ø¹Ù„ÙˆÙ…|tech|ØªÙƒÙ†ÙˆÙ„|physics|chem)/.test(text)) return 'âš—ï¸'
  if (/(history|ØªØ§Ø±ÙŠØ®|islam|Ø¥Ø³Ù„Ø§Ù…|arab|Ø¹Ø±Ø¨)/.test(text)) return 'ðŸ“œ'
  if (/(nature|Ø·Ø¨ÙŠØ¹Ø©|animal|Ø­ÙŠÙˆØ§Ù†|plant|Ù†Ø¨Ø§Øª)/.test(text)) return 'ðŸŒ¿'
  if (/(culture|Ø«Ù‚Ø§ÙØ©|art|ÙÙ†|music|Ù…ÙˆØ³ÙŠÙ‚|general|Ø¹Ø§Ù…)/.test(text)) return 'ðŸŽ¨'
  if (/(math|Ø±ÙŠØ§Ø¶ÙŠØ§Øª|number|Ø¹Ø¯Ø¯)/.test(text)) return 'ðŸ”¢'
  if (/(food|Ø·Ø¹Ø§Ù…|cook|Ø·Ø¨Ø®)/.test(text)) return 'ðŸ•'
  if (/(movie|film|Ø³ÙŠÙ†Ù…Ø§|cinema)/.test(text)) return 'ðŸŽ¬'
  if (/(music|Ù…ÙˆØ³ÙŠÙ‚Ù‰|song|Ø£ØºÙ†ÙŠØ©)/.test(text)) return 'ðŸŽµ'
  return 'ðŸ§ '
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
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | 'mine' | 'others'>('all')
  const [search, setSearch] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listPublicQuizzes()
      .then(setQuizzes)
      .catch(() => setError('Failed to load public quizzes.'))
      .finally(() => setLoading(false))
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
        `Make "${quiz.title}" private?\n\nIt will be removed from the Public Library and no one else can see it.`
      )
      if (!ok) return
    }
    setUpdatingId(quiz.id)
    try {
      await updateQuiz(quiz.id, { visibility: newVis })
      // Quiz is now private → remove from the public list
      setQuizzes((prev) => prev.filter((q) => q.id !== quiz.id))
    } catch {
      alert('Failed to update visibility. Please try again.')
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleClone(quiz: QuizItem) {
    if (!currentUid) return
    setCloningId(quiz.id)
    try {
      const newId = await cloneQuiz(quiz, currentUid)
      navigate(`/editor/${newId}`)
    } catch {
      alert('Failed to clone quiz. Please try again.')
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

  return (
    <div style={{ padding: '0' }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '1.5rem', padding: '1.5rem 0 0', flexWrap: 'wrap', gap: '1rem',
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, color: '#f1f5f9' }}>Public Quiz Library</h2>
          <p style={{ margin: '0.3rem 0 0', fontSize: '0.9rem', color: '#64748b' }}>
            {loading ? 'â€¦' : `${visible.length} quiz${visible.length !== 1 ? 'zes' : ''} Â· Browse, preview or clone`}
          </p>
        </div>
        {/* Filter + Search */}
        <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            placeholder="Searchâ€¦"
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
                borderColor: filter === f ? '#2563eb' : '#334155',
                color: filter === f ? '#fff' : '#94a3b8',
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {[1,2,3,4,5,6].map((i) => (
            <div key={i} style={{
              height: '300px', borderRadius: '16px',
              background: 'linear-gradient(90deg, #1e293b 25%, #273549 50%, #1e293b 75%)',
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
          border: '2px dashed #1e293b', borderRadius: '20px', color: '#475569',
        }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>ðŸ“­</div>
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
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1.25rem',
        }}>
          {visible.map((q) => {
            const isOwner = q.ownerId === currentUid
            const coverImg = q.coverImage || getCoverImage(q.questions ?? [])
            const emoji = pickEmoji(q.tags ?? [], q.title)
            const gradient = pickGradient(q.title)
            const isHovered = hoveredId === q.id

            return (
              <div
                key={q.id}
                onMouseEnter={() => setHoveredId(q.id)}
                onMouseLeave={() => setHoveredId(null)}
                style={{
                  borderRadius: '16px',
                  overflow: 'hidden',
                  background: '#0f172a',
                  border: '1px solid #1e293b',
                  boxShadow: isHovered
                    ? '0 20px 50px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.4)'
                    : '0 4px 20px rgba(0,0,0,0.4)',
                  transform: isHovered ? 'translateY(-4px) scale(1.01)' : 'translateY(0) scale(1)',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'default',
                }}
              >
                {/* Cover hero */}
                <div style={{
                  height: '160px',
                  position: 'relative',
                  overflow: 'hidden',
                  background: coverImg ? '#000' : gradient,
                }}>
                  {coverImg ? (
                    <img
                      src={coverImg}
                      alt={q.title}
                      style={{
                        width: '100%', height: '100%', objectFit: 'cover',
                        opacity: 0.75,
                        transition: 'opacity 0.3s, transform 0.3s',
                        transform: isHovered ? 'scale(1.06)' : 'scale(1)',
                      }}
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                    />
                  ) : (
                    <div style={{
                      width: '100%', height: '100%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '4rem', opacity: 0.6,
                      transition: 'transform 0.3s',
                      transform: isHovered ? 'scale(1.15)' : 'scale(1)',
                    }}>
                      {emoji}
                    </div>
                  )}
                  {/* Dark gradient overlay */}
                  <div style={{
                    position: 'absolute', inset: 0,
                    background: 'linear-gradient(to top, rgba(15,23,42,1) 0%, rgba(15,23,42,0.3) 60%, transparent 100%)',
                  }} />
                  {/* Owner badge */}
                  {isOwner && (
                    <div style={{
                      position: 'absolute', top: '10px', right: '10px',
                      background: '#2563eb', color: '#fff',
                      fontSize: '0.68rem', fontWeight: 700,
                      padding: '3px 10px', borderRadius: '999px',
                    }}>
                      YOURS
                    </div>
                  )}
                  {/* Question count */}
                  <div style={{
                    position: 'absolute', bottom: '10px', left: '10px',
                    background: 'rgba(0,0,0,0.6)', color: '#e2e8f0',
                    fontSize: '0.72rem', fontWeight: 600,
                    padding: '3px 10px', borderRadius: '999px',
                    backdropFilter: 'blur(4px)',
                  }}>
                    ðŸ“ {q.questions?.length ?? 0} questions
                  </div>
                </div>

                {/* Card body */}
                <div style={{ padding: '1rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', flex: 1 }}>
                  {/* Title row */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
                    <div style={{
                      fontSize: '1rem', fontWeight: 700, color: '#f1f5f9', lineHeight: 1.35,
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      flex: 1,
                    }}>
                      {q.title}
                    </div>
                    {/* Three-dot menu — only for owned quizzes */}
                    {isOwner && (
                      <div style={{ position: 'relative', flexShrink: 0 }} ref={menuOpenId === q.id ? menuRef : undefined}>
                        <button
                          title="More options"
                          onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === q.id ? null : q.id) }}
                          disabled={updatingId === q.id}
                          style={{
                            background: 'transparent', border: 'none', color: '#64748b',
                            fontSize: '1.1rem', padding: '2px 6px', cursor: 'pointer',
                            borderRadius: '6px', lineHeight: 1, transition: 'background 0.15s, color 0.15s',
                            opacity: updatingId === q.id ? 0.4 : 1,
                          }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.color = '#e2e8f0' }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748b' }}
                        >
                          {updatingId === q.id ? '…' : '⋯'}
                        </button>
                        {menuOpenId === q.id && (
                          <div style={{
                            position: 'absolute', top: '100%', right: 0, zIndex: 50,
                            background: '#1e293b', border: '1px solid #334155',
                            borderRadius: '10px', minWidth: '170px',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                            overflow: 'hidden', marginTop: '4px',
                          }}>
                            <div style={{ padding: '6px 10px', fontSize: '0.65rem', color: '#64748b', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                              Visibility
                            </div>
                            {(['public', 'private'] as const).map((v) => (
                              <button
                                key={v}
                                onClick={(e) => { e.stopPropagation(); handleVisibilityChange(q, v) }}
                                style={{
                                  width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem',
                                  padding: '8px 14px', background: q.visibility === v ? '#0f172a' : 'transparent',
                                  border: 'none', color: q.visibility === v ? '#f1f5f9' : '#94a3b8',
                                  fontSize: '0.82rem', cursor: 'pointer', textAlign: 'left',
                                  transition: 'background 0.15s',
                                }}
                                onMouseEnter={(e) => { if (q.visibility !== v) e.currentTarget.style.background = '#273549' }}
                                onMouseLeave={(e) => { if (q.visibility !== v) e.currentTarget.style.background = 'transparent' }}
                              >
                                <span>{v === 'public' ? '🌐' : '🔒'}</span>
                                <span style={{ flex: 1 }}>{v === 'public' ? 'Public' : 'Private'}</span>
                                {q.visibility === v && <span style={{ fontSize: '0.7rem', color: '#2563eb' }}>✓</span>}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {q.description && (
                    <div style={{
                      fontSize: '0.78rem', color: '#94a3b8',
                      display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>
                      {q.description}
                    </div>
                  )}

                  {(q.tags ?? []).length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                      {(q.tags ?? []).slice(0, 3).map((tag) => (
                        <span key={tag} style={{
                          fontSize: '0.68rem', background: '#1e293b', color: '#94a3b8',
                          padding: '2px 8px', borderRadius: '999px', border: '1px solid #334155',
                        }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  <div style={{ flex: 1 }} />

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    {isOwner ? (
                      <>
                        <Link to={`/preview/${q.id}`} style={{ textDecoration: 'none', flex: 1 }}>
                          <button
                            style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', background: '#1e293b', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'background 0.2s, color 0.2s' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#0e7490'; e.currentTarget.style.color = '#fff' }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.color = '#94a3b8' }}
                          >
                            ðŸ‘ï¸ Preview
                          </button>
                        </Link>
                        <Link to={`/editor/${q.id}`} style={{ textDecoration: 'none', flex: 1 }}>
                          <button
                            style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', background: '#1e293b', color: '#fff', fontSize: '0.85rem', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'background 0.2s' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'linear-gradient(135deg, #2563eb, #7c3aed)' }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = '#1e293b' }}
                          >
                            âœï¸ Edit
                          </button>
                        </Link>
                        <button
                          title="Copy link"
                          onClick={() => navigator.clipboard?.writeText(`https://quizengine.onrender.com/?quiz=${encodeURIComponent(q.id)}`).then(() => alert('Link copied!'))}
                          style={{ padding: '0.6rem 0.8rem', borderRadius: '8px', background: '#1e293b', color: '#94a3b8', fontSize: '0.85rem', border: 'none', cursor: 'pointer', flexShrink: 0, transition: 'background 0.2s, color 0.2s' }}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#334155'; e.currentTarget.style.color = '#e2e8f0' }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.color = '#94a3b8' }}
                        >
                          ðŸ”—
                        </button>
                      </>
                    ) : (
                      <>
                        <Link to={`/preview/${q.id}`} style={{ textDecoration: 'none', flex: 1 }}>
                          <button
                            style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', background: '#1e293b', color: '#94a3b8', fontSize: '0.85rem', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'background 0.2s, color 0.2s' }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = '#0e7490'; e.currentTarget.style.color = '#fff' }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.color = '#94a3b8' }}
                          >
                            ðŸ‘ï¸ Preview
                          </button>
                        </Link>
                        <button
                          onClick={() => handleClone(q)}
                          disabled={cloningId === q.id}
                          style={{ flex: 1, padding: '0.6rem', borderRadius: '8px', background: '#1e293b', color: '#fff', fontSize: '0.85rem', fontWeight: 600, border: 'none', cursor: cloningId === q.id ? 'not-allowed' : 'pointer', transition: 'background 0.2s', opacity: cloningId === q.id ? 0.6 : 1 }}
                          onMouseEnter={(e) => { if (cloningId !== q.id) e.currentTarget.style.background = 'linear-gradient(135deg, #2563eb, #7c3aed)' }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = '#1e293b' }}
                        >
                          {cloningId === q.id ? 'Cloningâ€¦' : 'â‘‚ Clone'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
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
