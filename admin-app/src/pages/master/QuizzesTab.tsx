import React from 'react'
import type { QuizDoc } from '../../types/quiz'
import { thStyle, tdStyle } from './masterShared'

interface Props {
  quizzes: (QuizDoc & { id: string })[]
  hasMore: boolean
  loadingMore: boolean
  onLoadMore: () => void
}

const loadMoreBtnStyle: React.CSSProperties = {
  padding: '0.45rem 1.5rem',
  background: 'var(--bg-surface)',
  border: '1px solid var(--border)',
  borderRadius: '8px',
  color: 'var(--text)',
  fontSize: '0.8rem',
  fontWeight: 600,
  cursor: 'pointer',
}

export function QuizzesTab({ quizzes, hasMore, loadingMore, onLoadMore }: Props) {
  return (
    <div>
      <div className="master-scroll-table">
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)', background: 'var(--bg-deep)' }}>
              <th style={thStyle}>Title</th>
              <th style={thStyle}>Owner</th>
              <th style={thStyle}>Visibility</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Plays</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Players</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Shares</th>
            </tr>
          </thead>
          <tbody>
            {quizzes.length === 0 && (
              <tr>
                <td colSpan={6} style={{ ...tdStyle, color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem' }}>
                  No quizzes found.
                </td>
              </tr>
            )}
            {quizzes.map(q => (
              <tr key={q.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ ...tdStyle, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.title}</td>
                <td style={{ ...tdStyle, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}><small style={{ fontFamily: 'monospace', fontSize: '0.72rem' }}>{q.ownerId}</small></td>
                <td style={tdStyle}>
                  <span style={{ color: q.visibility === 'public' ? '#22c55e' : 'var(--text-muted)', fontWeight: 600, fontSize: '0.75rem' }}>{q.visibility}</span>
                </td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>{q.totalPlays   || 0}</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>{q.totalPlayers || 0}</td>
                <td style={{ ...tdStyle, textAlign: 'right' }}>{q.shareCount   || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hasMore && (
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <button onClick={onLoadMore} disabled={loadingMore} style={loadMoreBtnStyle}>
            {loadingMore ? 'Loading…' : 'Load More Quizzes'}
          </button>
        </div>
      )}
      {!hasMore && quizzes.length > 0 && (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: '0.75rem' }}>
          All {quizzes.length} quizzes loaded.
        </p>
      )}
    </div>
  )
}
