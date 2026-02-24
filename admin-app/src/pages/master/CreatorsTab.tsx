import type { QuizDoc } from '../../types/quiz'
import type { UserProfile } from '../../lib/adminRepo'

interface CreatorEntry {
  ownerId: string
  quizzes: (QuizDoc & { id: string })[]
  totalPlays: number
  totalPlayers: number
  totalShares: number
}

interface Props {
  creators: CreatorEntry[]
  users: UserProfile[]
}

export function CreatorsTab({ creators, users }: Props) {
  // Build a uid → display name/email map from the users collection
  const userMap = Object.fromEntries(users.map(u => [u.uid, u]))

  if (creators.length === 0) {
    return <p style={{ color: 'var(--text-muted)' }}>No quiz creators found yet.</p>
  }

  return (
    <div>
      {creators.map((creator, i) => {
        const topQuiz = [...creator.quizzes].sort((a, b) => (b.totalPlays || 0) - (a.totalPlays || 0))[0]
        const profile = userMap[creator.ownerId]
        const initials = profile?.displayName
          ? profile.displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
          : (profile?.email?.[0] ?? '?').toUpperCase()

        return (
          <div key={creator.ownerId} style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border)',
            borderRadius: '10px',
            padding: '0.75rem 1rem',
            marginBottom: '0.6rem',
          }}>
            {/* ── Creator header ── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                {/* Rank badge / avatar */}
                {profile?.photoURL ? (
                  <img src={profile.photoURL} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: `hsl(${(i * 67) % 360}, 60%, 50%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '0.7rem', flexShrink: 0 }}>
                    {profile ? initials : i + 1}
                  </div>
                )}
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-bright)' }}>
                    {profile?.displayName || profile?.email || 'Unknown Creator'}
                  </div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    {profile?.email || creator.ownerId}
                  </div>
                </div>
              </div>

              {/* Aggregate stats */}
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                {[
                  { label: 'Qzs', value: creator.quizzes.length, color: 'var(--text-bright)' },
                  { label: 'Plays', value: creator.totalPlays, color: '#2563eb' },
                  { label: 'Players', value: creator.totalPlayers, color: 'var(--text-bright)' },
                  { label: 'Shares', value: creator.totalShares, color: 'var(--text-bright)' },
                ].map(stat => (
                  <div key={stat.label} style={{ textAlign: 'center' }}>
                    <div style={{ fontWeight: 800, color: stat.color, fontSize: '0.9rem', lineHeight: 1.1 }}>{stat.value}</div>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Per-quiz breakdown ── */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              {[...creator.quizzes]
                .sort((a, b) => (b.totalPlays || 0) - (a.totalPlays || 0))
                .map(q => (
                  <div key={q.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', padding: '0.2rem 0' }}>
                    <span style={{ color: 'var(--text)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginRight: '0.75rem' }}>
                      {q.title}
                      {q.id === topQuiz?.id && creator.quizzes.length > 1 && (
                        <span style={{ marginLeft: '0.35rem', fontSize: '0.62rem', background: '#2563eb', color: '#fff', borderRadius: '3px', padding: '1px 4px' }}>top</span>
                      )}
                    </span>
                    <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0, color: 'var(--text-muted)' }}>
                      <span>🎮 {q.totalPlays   || 0}</span>
                      <span>👥 {q.totalPlayers || 0}</span>
                      <span>🔗 {q.shareCount   || 0}</span>
                      <span style={{ color: q.visibility === 'public' ? '#22c55e' : 'var(--text-muted)', fontWeight: 600 }}>{q.visibility}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
