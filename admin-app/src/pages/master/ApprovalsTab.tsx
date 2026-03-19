import React, { useState, useMemo } from 'react'
import type { QuizDoc } from '../../types/quiz'
import { thStyle, tdStyle } from './masterShared'
import { approveQuiz, rejectQuiz } from '../../lib/adminRepo'

interface Props {
  quizzes: (QuizDoc & { id: string })[]
  hasMore: boolean
  loadingMore: boolean
  onLoadMore: () => void
}

type FilterKey = 'all-pending' | 'quiz-pending' | 'mini-game-pending' | 'rejected'
type SortKey = 'created' | 'title'
type SortDir = 'desc' | 'asc'

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

const filterBtnBase: React.CSSProperties = {
  padding: '0.4rem 0.9rem',
  borderRadius: '8px',
  border: '1px solid var(--border)',
  background: 'var(--bg-surface)',
  color: 'var(--text-dim)',
  fontSize: '0.8rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'background 0.15s, color 0.15s, border-color 0.15s',
}

const filterBtnActive: React.CSSProperties = {
  background: 'var(--accent, #7c3aed)',
  color: '#fff',
  borderColor: 'transparent',
}

const actionBtnBase: React.CSSProperties = {
  padding: '0.3rem 0.7rem',
  borderRadius: '6px',
  border: 'none',
  fontSize: '0.75rem',
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'opacity 0.15s',
}

export function ApprovalsTab({ quizzes, hasMore, loadingMore, onLoadMore }: Props) {
  const [filter, setFilter] = useState<FilterKey>('all-pending')
  const [sortKey, setSortKey] = useState<SortKey>('created')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  async function handleApprove(id: string) {
    setActionLoading(id + ':approve')
    try { 
      await approveQuiz(id)
    } finally { 
      setActionLoading(null) 
    }
  }

  async function handleReject(id: string) {
    setActionLoading(id + ':reject')
    try { 
      await rejectQuiz(id)
    } finally { 
      setActionLoading(null) 
    }
  }

  const pendingQuizzes = useMemo(
    () => quizzes.filter(q => q.approvalStatus === 'pending'),
    [quizzes]
  )

  const pendingRegularQuizzes = useMemo(
    () => pendingQuizzes.filter(q => !q.gameModeId || q.contentType === 'quiz'),
    [pendingQuizzes]
  )

  const pendingMiniGames = useMemo(
    () => pendingQuizzes.filter(q => q.gameModeId && q.contentType === 'mini-game'),
    [pendingQuizzes]
  )

  const rejectedQuizzes = useMemo(
    () => quizzes.filter(q => q.approvalStatus === 'rejected'),
    [quizzes]
  )

  const filtered = useMemo(() => {
    switch (filter) {
      case 'all-pending':
        return pendingQuizzes
      case 'quiz-pending':
        return pendingRegularQuizzes
      case 'mini-game-pending':
        return pendingMiniGames
      case 'rejected':
        return rejectedQuizzes
      default:
        return pendingQuizzes
    }
  }, [filter, pendingQuizzes, pendingRegularQuizzes, pendingMiniGames, rejectedQuizzes])

  const sorted = useMemo(() => {
    const arr = [...filtered]
    const mul = sortDir === 'desc' ? -1 : 1
    arr.sort((a, b) => {
      switch (sortKey) {
        case 'title':
          return mul * (a.title || '').localeCompare(b.title || '')
        case 'created': {
          const ta = (a.createdAt as { seconds: number } | null)?.seconds ?? 0
          const tb = (b.createdAt as { seconds: number } | null)?.seconds ?? 0
          return mul * (ta - tb)
        }
        default:
          return 0
      }
    })
    return arr
  }, [filtered, sortKey, sortDir])

  const arrow = (k: SortKey) => sortKey === k ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''

  function getContentTypeBadge(q: QuizDoc & { id: string }) {
    if (q.gameModeId && q.contentType === 'mini-game') {
      return <span style={{ color: '#8b5cf6', fontWeight: 700, fontSize: '0.7rem' }}>🎮 Mini Game</span>
    }
    return <span style={{ color: '#3b82f6', fontWeight: 700, fontSize: '0.7rem' }}>📝 Quiz</span>
  }

  function getStatusBadge(q: QuizDoc & { id: string }) {
    if (q.approvalStatus === 'pending') {
      return <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.7rem' }}>🕐 Pending</span>
    }
    if (q.approvalStatus === 'rejected') {
      return <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '0.7rem' }}>❌ Rejected</span>
    }
    return null
  }

  return (
    <div>
      {/* Header Info */}
      <div style={{
        marginBottom: '1rem',
        border: '1px solid var(--border)',
        borderRadius: '10px',
        padding: '1rem',
        background: 'var(--bg-deep)',
      }}>
        <h2 style={{ margin: '0 0 0.5rem', fontSize: '1.1rem', color: 'var(--text-bright)', fontWeight: 700 }}>
          📋 Public Sharing Approval Requests
        </h2>
        <p style={{ margin: 0, color: 'var(--text-mid)', fontSize: '0.85rem', lineHeight: '1.5' }}>
          Review and approve/reject requests from users who want to publish their quizzes or mini games publicly.
          Pending items are kept private until you approve them.
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
        <div style={{
          padding: '0.75rem',
          borderRadius: '8px',
          border: '1px solid var(--border)',
          background: 'var(--bg-surface)',
        }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.25rem' }}>
            ALL PENDING
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b' }}>
            {pendingQuizzes.length}
          </div>
        </div>
        <div style={{
          padding: '0.75rem',
          borderRadius: '8px',
          border: '1px solid var(--border)',
          background: 'var(--bg-surface)',
        }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.25rem' }}>
            QUIZZES
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#3b82f6' }}>
            {pendingRegularQuizzes.length}
          </div>
        </div>
        <div style={{
          padding: '0.75rem',
          borderRadius: '8px',
          border: '1px solid var(--border)',
          background: 'var(--bg-surface)',
        }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.25rem' }}>
            MINI GAMES
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#8b5cf6' }}>
            {pendingMiniGames.length}
          </div>
        </div>
        <div style={{
          padding: '0.75rem',
          borderRadius: '8px',
          border: '1px solid var(--border)',
          background: 'var(--bg-surface)',
        }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.25rem' }}>
            REJECTED
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#ef4444' }}>
            {rejectedQuizzes.length}
          </div>
        </div>
      </div>

      {/* Filters and Sort */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem', alignItems: 'center' }}>
        <button
          onClick={() => setFilter('all-pending')}
          style={{ ...filterBtnBase, ...(filter === 'all-pending' ? filterBtnActive : {}) }}
        >
          🕐 All Pending ({pendingQuizzes.length})
        </button>
        <button
          onClick={() => setFilter('quiz-pending')}
          style={{ ...filterBtnBase, ...(filter === 'quiz-pending' ? filterBtnActive : {}) }}
        >
          📝 Quizzes ({pendingRegularQuizzes.length})
        </button>
        <button
          onClick={() => setFilter('mini-game-pending')}
          style={{ ...filterBtnBase, ...(filter === 'mini-game-pending' ? filterBtnActive : {}) }}
        >
          🎮 Mini Games ({pendingMiniGames.length})
        </button>
        <button
          onClick={() => setFilter('rejected')}
          style={{ ...filterBtnBase, ...(filter === 'rejected' ? filterBtnActive : {}) }}
        >
          ❌ Rejected ({rejectedQuizzes.length})
        </button>
        <div style={{ width: 1, height: '1.5rem', background: 'var(--border)', margin: '0 0.25rem' }} />
        <button
          onClick={() => handleSort('created')}
          style={{ ...filterBtnBase, ...(sortKey === 'created' ? filterBtnActive : {}) }}
        >
          🕐 Newest{arrow('created')}
        </button>
        <button
          onClick={() => handleSort('title')}
          style={{ ...filterBtnBase, ...(sortKey === 'title' ? filterBtnActive : {}) }}
        >
          🔤 Title{arrow('title')}
        </button>
      </div>

      {/* Table */}
      <div className="master-scroll-table">
        <table style={{ width: 'max-content', borderCollapse: 'collapse', minWidth: 800 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)', background: 'var(--bg-deep)' }}>
              <th style={thStyle}>#</th>
              <th style={{ ...thStyle, cursor: 'pointer' }} onClick={() => handleSort('title')}>
                Title{arrow('title')}
              </th>
              <th style={thStyle}>Type</th>
              <th style={thStyle}>Owner</th>
              <th style={thStyle}>Status</th>
              <th style={{ ...thStyle, cursor: 'pointer' }} onClick={() => handleSort('created')}>
                Created{arrow('created')}
              </th>
              <th style={{ ...thStyle, textAlign: 'center' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={7} style={{ ...tdStyle, color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
                  {filter === 'all-pending' && 'No pending approval requests.'}
                  {filter === 'quiz-pending' && 'No pending quiz approval requests.'}
                  {filter === 'mini-game-pending' && 'No pending mini game approval requests.'}
                  {filter === 'rejected' && 'No rejected items.'}
                </td>
              </tr>
            )}
            {sorted.map((q, i) => {
              const isPending = q.approvalStatus === 'pending'
              const isRejected = q.approvalStatus === 'rejected'
              const createdDate = (q.createdAt as { seconds: number } | null)?.seconds
                ? new Date((q.createdAt as { seconds: number }).seconds * 1000).toLocaleDateString()
                : '—'

              return (
                <tr 
                  key={q.id} 
                  style={{ 
                    borderBottom: '1px solid var(--border)', 
                    background: isPending ? 'rgba(245,158,11,0.05)' : isRejected ? 'rgba(239,68,68,0.03)' : undefined 
                  }}
                >
                  <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: '0.75rem', width: 40 }}>
                    {i + 1}
                  </td>
                  <td style={{ ...tdStyle, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>
                    {q.title || 'Untitled'}
                  </td>
                  <td style={tdStyle}>
                    {getContentTypeBadge(q)}
                  </td>
                  <td style={{ ...tdStyle, maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <small style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {q.ownerId}
                    </small>
                  </td>
                  <td style={tdStyle}>
                    {getStatusBadge(q)}
                  </td>
                  <td style={{ ...tdStyle, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {createdDate}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'center', whiteSpace: 'nowrap' }}>
                    {isPending && (
                      <span style={{ display: 'inline-flex', gap: '0.4rem' }}>
                        <button
                          disabled={actionLoading !== null}
                          onClick={() => void handleApprove(q.id)}
                          style={{ 
                            ...actionBtnBase, 
                            background: '#22c55e', 
                            color: '#fff', 
                            opacity: actionLoading === q.id + ':approve' ? 0.6 : 1 
                          }}
                        >
                          {actionLoading === q.id + ':approve' ? '⏳' : '✓ Approve'}
                        </button>
                        <button
                          disabled={actionLoading !== null}
                          onClick={() => void handleReject(q.id)}
                          style={{ 
                            ...actionBtnBase, 
                            background: '#ef4444', 
                            color: '#fff', 
                            opacity: actionLoading === q.id + ':reject' ? 0.6 : 1 
                          }}
                        >
                          {actionLoading === q.id + ':reject' ? '⏳' : '✕ Reject'}
                        </button>
                      </span>
                    )}
                    {isRejected && (
                      <button
                        disabled={actionLoading !== null}
                        onClick={() => void handleApprove(q.id)}
                        style={{ 
                          ...actionBtnBase, 
                          background: 'transparent', 
                          color: '#22c55e', 
                          border: '1px solid #22c55e', 
                          opacity: actionLoading === q.id + ':approve' ? 0.6 : 1 
                        }}
                      >
                        {actionLoading === q.id + ':approve' ? '⏳' : 'Re-approve'}
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {hasMore && (
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <button onClick={onLoadMore} disabled={loadingMore} style={loadMoreBtnStyle}>
            {loadingMore ? 'Loading…' : 'Load More'}
          </button>
        </div>
      )}
      {!hasMore && sorted.length > 0 && (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: '0.75rem' }}>
          All {sorted.length} items loaded.
        </p>
      )}
    </div>
  )
}
