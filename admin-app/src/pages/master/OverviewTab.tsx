import type { QuizDoc } from '../../types/quiz'
import { StatCard } from './masterShared'

interface Props {
  quizzes: (QuizDoc & { id: string })[]
  totalPlays: number
  totalPlayers: number
  totalShares: number
  newUsersLast24Hours: number
}

export function OverviewTab({ quizzes, totalPlays, totalPlayers, totalShares, newUsersLast24Hours }: Props) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
      <StatCard label="Total Quizzes"  value={quizzes.length} icon="📋" />
      <StatCard label="New Users (Last 24 Hours)" value={newUsersLast24Hours} icon="🆕" />
      <StatCard label="Total Plays"    value={totalPlays}     icon="🎮" />
      <StatCard label="Total Players"  value={totalPlayers}   icon="👥" />
      <StatCard label="Total Shares"   value={totalShares}    icon="🔗" />
    </div>
  )
}
