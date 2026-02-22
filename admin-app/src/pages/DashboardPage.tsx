import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { auth } from '../lib/firebase'
import { listMyQuizzes } from '../lib/quizRepo'
import type { QuizDoc, QuizQuestion } from '../types/quiz'

type QuizItem = QuizDoc & { id: string }

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

  useEffect(() => {
    const uid = auth.currentUser?.uid
    if (!uid) { setLoading(false); return }
    listMyQuizzes(uid)
      .then((list) => setQuizzes(list as QuizItem[]))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={{ padding: '0' }}>
      {/* ── Header bar ── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '2rem',
        padding: '1.5rem 0 0',
      }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 700, color: '#f1f5f9' }}>اختباراتي</h2>
          <p style={{ margin: '0.3rem 0 0', fontSize: '0.9rem', color: '#64748b' }}>
            {loading ? '...' : `${quizzes.length} اختبار`}
          </p>
        </div>
        <Link to="/editor" style={{ textDecoration: 'none' }}>
          <button style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.7rem 1.4rem',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
            border: 'none',
            color: '#fff',
            fontSize: '0.95rem',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(37,99,235,0.4)',
            transition: 'transform 0.15s, box-shadow 0.15s',
          }}>
            <span style={{ fontSize: '1.1rem' }}>＋</span> اختبار جديد
          </button>
        </Link>
      </div>

      {/* ── Loading skeleton ── */}
      {loading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
          {[1,2,3,4,5,6].map((i) => (
            <div key={i} style={{
              height: '280px',
              borderRadius: '16px',
              background: 'linear-gradient(90deg, #1e293b 25%, #273549 50%, #1e293b 75%)',
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
          border: '2px dashed #1e293b',
          borderRadius: '20px',
          color: '#475569',
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
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: '1.25rem',
        }}>
          {quizzes.map((q) => {
            const coverImg = getCoverImage(q.questions ?? [])
            const emoji = pickEmoji(q.tags ?? [], q.title)
            const gradient = pickGradient(q.title)
            const badge = presetBadge(q.challengePreset)
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
                  cursor: 'pointer',
                }}
              >
                {/* Cover image / gradient hero */}
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
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                        opacity: 0.75,
                        transition: 'opacity 0.3s, transform 0.3s',
                        transform: isHovered ? 'scale(1.06)' : 'scale(1)',
                      }}
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                    />
                  ) : (
                    <div style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '4rem',
                      opacity: 0.6,
                      transition: 'transform 0.3s',
                      transform: isHovered ? 'scale(1.15)' : 'scale(1)',
                    }}>
                      {emoji}
                    </div>
                  )}
                  {/* Dark gradient overlay */}
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(to top, rgba(15,23,42,1) 0%, rgba(15,23,42,0.3) 60%, transparent 100%)',
                  }} />
                  {/* Preset badge */}
                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    background: badge.color,
                    color: '#fff',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    padding: '3px 10px',
                    borderRadius: '999px',
                    letterSpacing: '0.03em',
                    backdropFilter: 'blur(4px)',
                  }}>
                    {badge.label}
                  </div>
                  {/* Visibility badge */}
                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    left: '10px',
                    background: 'rgba(0,0,0,0.55)',
                    color: q.visibility === 'public' ? '#86efac' : '#fca5a5',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    padding: '3px 10px',
                    borderRadius: '999px',
                    backdropFilter: 'blur(4px)',
                    border: `1px solid ${q.visibility === 'public' ? '#16a34a44' : '#dc262644'}`,
                  }}>
                    {q.visibility === 'public' ? '🌐 عام' : '🔒 خاص'}
                  </div>
                  {/* Question count bubble */}
                  <div style={{
                    position: 'absolute',
                    bottom: '10px',
                    left: '10px',
                    background: 'rgba(0,0,0,0.6)',
                    color: '#e2e8f0',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    padding: '3px 10px',
                    borderRadius: '999px',
                    backdropFilter: 'blur(4px)',
                  }}>
                    📝 {q.questions?.length ?? 0} سؤال
                  </div>
                </div>

                {/* Card body */}
                <div style={{ padding: '1rem 1.1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', flex: 1 }}>
                  <div style={{
                    fontSize: '1rem',
                    fontWeight: 700,
                    color: '#f1f5f9',
                    lineHeight: 1.35,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {q.title}
                  </div>

                  {/* Tags */}
                  {(q.tags ?? []).length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                      {(q.tags ?? []).slice(0, 3).map((tag) => (
                        <span key={tag} style={{
                          fontSize: '0.68rem',
                          background: '#1e293b',
                          color: '#94a3b8',
                          padding: '2px 8px',
                          borderRadius: '999px',
                          border: '1px solid #334155',
                        }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Spacer */}
                  <div style={{ flex: 1 }} />

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <Link to={`/editor/${q.id}`} style={{ textDecoration: 'none', flex: 1 }}>
                      <button style={{
                        width: '100%',
                        padding: '0.6rem',
                        borderRadius: '8px',
                        background: isHovered
                          ? 'linear-gradient(135deg, #2563eb, #7c3aed)'
                          : '#1e293b',
                        color: '#fff',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'background 0.2s',
                      }}>
                        ✏️ تعديل
                      </button>
                    </Link>
                    <button
                      title="نسخ رابط الاختبار"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigator.clipboard?.writeText(`https://quizengine.onrender.com/?quiz=${encodeURIComponent(q.id)}`)
                          .then(() => alert('تم نسخ الرابط!'))
                      }}
                      style={{
                        padding: '0.6rem 0.8rem',
                        borderRadius: '8px',
                        background: '#1e293b',
                        color: '#94a3b8',
                        fontSize: '0.85rem',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'background 0.2s, color 0.2s',
                        flexShrink: 0,
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = '#334155'; e.currentTarget.style.color = '#e2e8f0' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = '#1e293b'; e.currentTarget.style.color = '#94a3b8' }}
                    >
                      🔗
                    </button>
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
