import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../lib/firebase'
import { cloneQuiz, listPublicQuizzes } from '../lib/quizRepo'
import type { QuizDoc } from '../types/quiz'

type QuizItem = QuizDoc & { id: string }

function pickEmoji(tags: string[], title: string): string {
  const text = [...tags, title].join(' ').toLowerCase()
  if (/(geo|world|map)/.test(text)) return '🗺️'
  if (/(sport|ball|olympic)/.test(text)) return '⚽'
  if (/(science|tech|physics|chem)/.test(text)) return '⚗️'
  if (/(history|islam|arab)/.test(text)) return '📜'
  if (/(nature|animal|plant)/.test(text)) return '🌿'
  if (/(culture|art|music|general)/.test(text)) return '🎨'
  if (/(math|number)/.test(text)) return '🔢'
  if (/(food|cook)/.test(text)) return '🍕'
  if (/(movie|film|cinema)/.test(text)) return '🎬'
  return '🎯'
}

export function PacksPage() {
  const navigate = useNavigate()
  const currentUid = auth.currentUser?.uid ?? ''

  const [quizzes, setQuizzes] = useState<QuizItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cloningId, setCloningId] = useState<string | null>(null)
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
        q.tags.some((t) => t.toLowerCase().includes(s))
      )
    })

  return (
    <section style={{ maxWidth: '960px' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2 style={{ margin: '0 0 0.4rem', fontSize: '1.4rem' }}>Public Quiz Library</h2>
        <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.875rem' }}>
          Browse quizzes shared by the community. Clone any quiz to your account and edit it freely.
        </p>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          placeholder="Search by title, description or tag…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ flex: '1', minWidth: '180px' }}
        />
        <div style={{ display: 'flex', gap: '4px' }}>
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
              }}
            >
              {f === 'all' ? 'All' : f === 'mine' ? 'My Quizzes' : 'Community'}
            </button>
          ))}
        </div>
      </div>

      {/* States */}
      {loading && (
        <p style={{ color: '#94a3b8', padding: '2rem 0' }}>Loading public quizzes…</p>
      )}
      {!loading && error && (
        <p style={{ color: '#f87171' }}>{error}</p>
      )}
      {!loading && !error && visible.length === 0 && (
        <div style={{
          padding: '3rem 2rem', textAlign: 'center', background: '#111827',
          border: '1px solid #1f2937', borderRadius: '12px', color: '#64748b',
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📭</div>
          {quizzes.length === 0
            ? 'No public quizzes yet. Set a quiz to "Public" in the editor to share it here.'
            : 'No quizzes match your search.'}
        </div>
      )}

      {/* Grid */}
      {!loading && visible.length > 0 && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))',
          gap: '1rem',
        }}>
          {visible.map((quiz) => {
            const isOwner = quiz.ownerId === currentUid
            const emoji = pickEmoji(quiz.tags ?? [], quiz.title)
            return (
              <div
                key={quiz.id}
                style={{
                  background: '#111827',
                  border: '1px solid #1f2937',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                {/* Cover area */}
                <div style={{
                  height: '90px',
                  background: quiz.coverImage
                    ? `url(${quiz.coverImage}) center/cover no-repeat`
                    : 'linear-gradient(135deg, #1e293b, #0f172a)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2.8rem',
                  position: 'relative',
                }}>
                  {!quiz.coverImage && emoji}
                  {isOwner && (
                    <span style={{
                      position: 'absolute', top: '8px', right: '8px',
                      background: '#2563eb', color: '#fff',
                      fontSize: '0.65rem', fontWeight: 700,
                      padding: '2px 7px', borderRadius: '999px',
                    }}>
                      YOURS
                    </span>
                  )}
                </div>

                {/* Body */}
                <div style={{ padding: '0.875rem 1rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f1f5f9', lineHeight: 1.3 }}>
                    {quiz.title}
                  </div>
                  {quiz.description && (
                    <div style={{
                      fontSize: '0.78rem', color: '#94a3b8',
                      overflow: 'hidden', display: '-webkit-box',
                      WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    }}>
                      {quiz.description}
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginTop: '0.25rem' }}>
                    <span style={{
                      fontSize: '0.7rem', color: '#64748b',
                      background: '#0f172a', border: '1px solid #1e293b',
                      borderRadius: '6px', padding: '2px 8px',
                    }}>
                      {quiz.questions?.length ?? 0} questions
                    </span>
                    {(quiz.tags ?? []).slice(0, 3).map((t) => (
                      <span key={t} style={{
                        fontSize: '0.7rem', color: '#64748b',
                        background: '#0f172a', border: '1px solid #1e293b',
                        borderRadius: '6px', padding: '2px 8px',
                      }}>
                        {t}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div style={{
                  display: 'flex', gap: '8px',
                  padding: '0.75rem 1rem',
                  borderTop: '1px solid #1f2937',
                }}>
                  {isOwner ? (
                    <>
                      <button
                        type="button"
                        onClick={() => navigate(`/editor/${quiz.id}`)}
                        style={{ flex: 1, fontSize: '0.8rem', padding: '7px 0' }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/preview/${quiz.id}`)}
                        style={{
                          flex: 1, fontSize: '0.8rem', padding: '7px 0',
                          background: 'transparent',
                          border: '1px solid #334155',
                          color: '#cbd5e1',
                        }}
                      >
                        Preview
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleClone(quiz)}
                        disabled={cloningId === quiz.id}
                        style={{ flex: 1, fontSize: '0.8rem', padding: '7px 0' }}
                      >
                        {cloningId === quiz.id ? 'Cloning…' : '⑂ Clone'}
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/preview/${quiz.id}`)}
                        style={{
                          flex: 1, fontSize: '0.8rem', padding: '7px 0',
                          background: 'transparent',
                          border: '1px solid #334155',
                          color: '#cbd5e1',
                        }}
                      >
                        Preview
                      </button>
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
