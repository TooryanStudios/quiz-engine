import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { getQuizById } from '../lib/quizRepo'
import type { QuizDoc, QuizQuestion } from '../types/quiz'

// ── helpers ─────────────────────────────────────────────────────────────────

function typeLabel(type: QuizQuestion['type']): { label: string; color: string; icon: string } {
  switch (type) {
    case 'single': return { label: 'اختيار واحد', color: '#2563eb', icon: '🔘' }
    case 'multi':  return { label: 'اختيار متعدد', color: '#7c3aed', icon: '☑️' }
    case 'match':  return { label: 'مطابقة', color: '#0891b2', icon: '🔗' }
    case 'order':  return { label: 'ترتيب', color: '#d97706', icon: '🔢' }
    case 'type':   return { label: 'إجابة مكتوبة', color: '#059669', icon: '✍️' }
    case 'boss':   return { label: 'Boss Battle', color: '#dc2626', icon: '⚔️' }
    default:       return { label: type, color: '#475569', icon: '❓' }
  }
}

function presetLabel(p?: string) {
  if (p === 'easy') return { text: 'سهل', color: '#16a34a' }
  if (p === 'hard') return { text: 'صعب', color: '#dc2626' }
  return { text: 'عادي', color: '#2563eb' }
}

// ── Question card ────────────────────────────────────────────────────────────

function QuestionCard({ q, idx }: { q: QuizQuestion; idx: number }) {
  const { label, color, icon } = typeLabel(q.type)

  return (
    <div style={{
      background: '#0f172a',
      border: '1px solid #1e293b',
      borderRadius: '14px',
      overflow: 'hidden',
      transition: 'box-shadow 0.2s',
    }}
    onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.5)')}
    onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
    >
      {/* Media */}
      {q.media?.url && (q.media.type === 'image' || q.media.type === 'gif') && (
        <div style={{ width: '100%', maxHeight: '200px', overflow: 'hidden', background: '#000' }}>
          <img
            src={q.media.url}
            alt=""
            style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', opacity: 0.85 }}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
          />
        </div>
      )}
      {q.media?.url && q.media.type === 'video' && (
        <div style={{ background: '#000', padding: '0.5rem' }}>
          <video src={q.media.url} controls style={{ width: '100%', maxHeight: '200px', borderRadius: '8px' }} />
        </div>
      )}

      <div style={{ padding: '1rem 1.2rem' }}>
        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.6rem' }}>
          <span style={{
            minWidth: '28px', minHeight: '28px',
            background: '#1e293b',
            borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8',
          }}>
            {idx + 1}
          </span>
          <span style={{
            fontSize: '0.7rem', fontWeight: 700, padding: '3px 10px',
            borderRadius: '999px', background: color + '22', color, border: `1px solid ${color}44`,
          }}>
            {icon} {label}
          </span>
          {q.duration && (
            <span style={{
              fontSize: '0.7rem', color: '#64748b', marginRight: 'auto',
              background: '#1e293b', padding: '3px 10px', borderRadius: '999px',
            }}>
              ⏱ {q.duration}ث
            </span>
          )}
        </div>

        {/* Question text */}
        <p style={{ margin: '0 0 0.8rem', fontSize: '0.95rem', color: '#e2e8f0', fontWeight: 600, lineHeight: 1.5 }}>
          {q.text}
        </p>

        {/* Single / Boss options */}
        {(q.type === 'single' || q.type === 'boss') && q.options && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {q.options.map((opt, i) => (
              <div key={i} style={{
                padding: '0.5rem 0.8rem',
                borderRadius: '8px',
                fontSize: '0.85rem',
                border: i === q.correctIndex
                  ? '1.5px solid #16a34a'
                  : '1px solid #1e293b',
                background: i === q.correctIndex ? '#14532d44' : '#1e293b',
                color: i === q.correctIndex ? '#86efac' : '#94a3b8',
                display: 'flex', alignItems: 'center', gap: '0.4rem',
              }}>
                {i === q.correctIndex ? '✅' : <span style={{ opacity: 0.4 }}>○</span>}
                {opt}
              </div>
            ))}
          </div>
        )}

        {/* Multi options */}
        {q.type === 'multi' && q.options && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            {q.options.map((opt, i) => {
              const correct = (q.correctIndices ?? []).includes(i)
              return (
                <div key={i} style={{
                  padding: '0.5rem 0.8rem',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  border: correct ? '1.5px solid #2563eb' : '1px solid #1e293b',
                  background: correct ? '#1e3a8a44' : '#1e293b',
                  color: correct ? '#93c5fd' : '#94a3b8',
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                }}>
                  {correct ? '✅' : <span style={{ opacity: 0.4 }}>□</span>}
                  {opt}
                </div>
              )
            })}
          </div>
        )}

        {/* Match pairs */}
        {q.type === 'match' && q.pairs && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {q.pairs.map((p, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                background: '#1e293b', borderRadius: '8px', padding: '0.45rem 0.8rem',
                fontSize: '0.85rem',
              }}>
                <span style={{ color: '#93c5fd', fontWeight: 600, minWidth: '90px' }}>{p.left}</span>
                <span style={{ color: '#475569' }}>←→</span>
                <span style={{ color: '#86efac', fontWeight: 600 }}>{p.right}</span>
              </div>
            ))}
          </div>
        )}

        {/* Order items */}
        {q.type === 'order' && q.items && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {(q.correctOrder ?? q.items.map((_, i) => i)).map((ci, pos) => (
              <div key={pos} style={{
                display: 'flex', alignItems: 'center', gap: '0.6rem',
                background: '#1e293b', borderRadius: '8px', padding: '0.45rem 0.8rem',
                fontSize: '0.85rem',
              }}>
                <span style={{
                  minWidth: '24px', minHeight: '24px', borderRadius: '50%',
                  background: '#334155', color: '#94a3b8', fontSize: '0.7rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700,
                }}>
                  {pos + 1}
                </span>
                <span style={{ color: '#e2e8f0' }}>{q.items![ci]}</span>
              </div>
            ))}
          </div>
        )}

        {/* Type answers */}
        {q.type === 'type' && q.acceptedAnswers && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            <span style={{ fontSize: '0.78rem', color: '#64748b', alignSelf: 'center' }}>الإجابات المقبولة:</span>
            {q.acceptedAnswers.map((ans, i) => (
              <span key={i} style={{
                background: '#14532d44', color: '#86efac',
                border: '1px solid #16a34a44',
                padding: '3px 10px', borderRadius: '999px', fontSize: '0.82rem', fontWeight: 600,
              }}>
                {ans}
              </span>
            ))}
          </div>
        )}

        {/* Boss extra info */}
        {q.type === 'boss' && q.bossName && (
          <div style={{
            marginTop: '0.6rem', background: '#450a0a44',
            border: '1px solid #dc262644', borderRadius: '8px',
            padding: '0.4rem 0.8rem', fontSize: '0.8rem', color: '#fca5a5',
            display: 'flex', gap: '1rem',
          }}>
            <span>👹 {q.bossName}</span>
            {q.bossHp && <span>❤️ {q.bossHp} HP</span>}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export function QuizPreviewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [quiz, setQuiz] = useState<QuizDoc | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    if (!id) return
    getQuizById(id)
      .then((data) => setQuiz(data))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  const preset = presetLabel(quiz?.challengePreset)
  const questionTypes = quiz ? [...new Set(quiz.questions.map((q) => q.type))] : []
  const filtered = quiz
    ? (filter === 'all' ? quiz.questions : quiz.questions.filter((q) => q.type === filter))
    : []

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 0 3rem' }}>
      {loading && (
        <div style={{ textAlign: 'center', padding: '5rem', color: '#475569' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⏳</div>
          جارٍ التحميل...
        </div>
      )}

      {!loading && !quiz && (
        <div style={{ textAlign: 'center', padding: '5rem', color: '#ef4444' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚠️</div>
          لم يُعثر على الاختبار.
        </div>
      )}

      {!loading && quiz && (
        <>
          {/* ── Hero header ── */}
          <div style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
            border: '1px solid #1e293b',
            borderRadius: '16px',
            padding: '1.75rem 2rem',
            marginBottom: '1.5rem',
            position: 'relative',
            overflow: 'hidden',
          }}>
            {/* Decorative glow */}
            <div style={{
              position: 'absolute', top: '-40px', right: '-40px',
              width: '200px', height: '200px', borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)',
              pointerEvents: 'none',
            }} />

            {/* Back + Edit buttons */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
              <button
                onClick={() => navigate('/dashboard')}
                style={{
                  background: '#1e293b', border: 'none', color: '#94a3b8',
                  padding: '0.45rem 1rem', borderRadius: '8px', cursor: 'pointer',
                  fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.3rem',
                }}
              >
                ← العودة
              </button>
              <Link to={`/editor/${id}`} style={{ textDecoration: 'none' }}>
                <button style={{
                  background: 'linear-gradient(135deg,#2563eb,#7c3aed)', border: 'none', color: '#fff',
                  padding: '0.45rem 1rem', borderRadius: '8px', cursor: 'pointer',
                  fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '0.3rem',
                }}>
                  ✏️ تعديل
                </button>
              </Link>
            </div>

            <h1 style={{ margin: '0 0 0.6rem', fontSize: '1.6rem', fontWeight: 800, color: '#f1f5f9' }}>
              {quiz.title}
            </h1>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', alignItems: 'center' }}>
              <span style={{
                background: preset.color, color: '#fff',
                fontSize: '0.72rem', fontWeight: 700, padding: '3px 12px',
                borderRadius: '999px',
              }}>{preset.text}</span>
              <span style={{
                background: '#1e293b', color: quiz.visibility === 'public' ? '#86efac' : '#fca5a5',
                fontSize: '0.72rem', fontWeight: 600, padding: '3px 12px',
                borderRadius: '999px', border: `1px solid ${quiz.visibility === 'public' ? '#16a34a44' : '#dc262644'}`,
              }}>
                {quiz.visibility === 'public' ? '🌐 عام' : '🔒 خاص'}
              </span>
              <span style={{
                background: '#1e293b', color: '#94a3b8',
                fontSize: '0.72rem', padding: '3px 12px', borderRadius: '999px',
              }}>
                📝 {quiz.questions.length} سؤال
              </span>
              {(quiz.tags ?? []).map((tag) => (
                <span key={tag} style={{
                  background: '#334155', color: '#94a3b8',
                  fontSize: '0.7rem', padding: '3px 10px', borderRadius: '999px',
                }}>
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* ── Type filter bar ── */}
          {questionTypes.length > 1 && (
            <div style={{
              display: 'flex', gap: '0.4rem', flexWrap: 'wrap',
              marginBottom: '1.25rem',
            }}>
              {['all', ...questionTypes].map((t) => {
                const active = filter === t
                const info = t === 'all' ? { label: 'الكل', color: '#6366f1', icon: '📋' } : typeLabel(t as QuizQuestion['type'])
                return (
                  <button
                    key={t}
                    onClick={() => setFilter(t)}
                    style={{
                      padding: '0.4rem 1rem', borderRadius: '999px', border: 'none',
                      fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
                      background: active ? info.color : '#1e293b',
                      color: active ? '#fff' : '#94a3b8',
                      transition: 'all 0.15s',
                    }}
                  >
                    {info.icon} {info.label}
                    {t !== 'all' && (
                      <span style={{
                        marginRight: '0.3rem', fontSize: '0.7rem', opacity: 0.7,
                      }}>
                        ({quiz.questions.filter((q) => q.type === t).length})
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          )}

          {/* ── Question grid ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {filtered.map((q, i) => (
              <QuestionCard
                key={i}
                q={q}
                idx={quiz.questions.indexOf(q)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
