import React from 'react'
import type { GameSession } from '../../lib/adminRepo'
import { thStyle, tdStyle } from './masterShared'

interface Props {
  sessions: GameSession[]
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

export function SessionsTab({ sessions, hasMore, loadingMore, onLoadMore }: Props) {
  return (
    <div>
      <div className="master-scroll-table">
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 480 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)', background: 'var(--bg-deep)' }}>
              <th style={thStyle}>Date</th>
              <th style={thStyle}>Quiz ID</th>
              <th style={thStyle}>PIN</th>
              <th style={thStyle}>Players</th>
              <th style={thStyle}>Questions</th>
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 && (
              <tr>
                <td colSpan={5} style={{ ...tdStyle, color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem' }}>
                  No sessions recorded yet.
                </td>
              </tr>
            )}
            {sessions.map(s => (
              <tr key={s.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={tdStyle}>{s.startedAt?.toDate().toLocaleString() || 'Just now'}</td>
                <td style={{ ...tdStyle, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.quizId}</td>
                <td style={tdStyle}><code style={{ fontSize: '0.78rem' }}>{s.pin}</code></td>
                <td style={tdStyle}>{s.playerCount}</td>
                <td style={tdStyle}>{s.questionsCount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {hasMore && (
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <button onClick={onLoadMore} disabled={loadingMore} style={loadMoreBtnStyle}>
            {loadingMore ? 'Loading…' : 'Load More Sessions'}
          </button>
        </div>
      )}
      {!hasMore && sessions.length > 0 && (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: '0.75rem' }}>
          All {sessions.length} sessions loaded.
        </p>
      )}
    </div>
  )
}

