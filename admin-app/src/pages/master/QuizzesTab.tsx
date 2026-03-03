import React, { useState, useMemo } from 'react'
import type { QuizDoc } from '../../types/quiz'
import { thStyle, tdStyle } from './masterShared'

interface Props {
  quizzes: (QuizDoc & { id: string })[]
  hasMore: boolean
  loadingMore: boolean
  onLoadMore: () => void
}

type SortKey = 'plays' | 'players' | 'shares' | 'title' | 'created'
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

const sortBtnBase: React.CSSProperties = {
  padding: '0.3rem 0.7rem',
  borderRadius: '8px',
  border: '1px solid var(--border)',
  background: 'var(--bg-surface)',
  color: 'var(--text-dim)',
  fontSize: '0.75rem',
  fontWeight: 600,
  cursor: 'pointer',
  transition: 'background 0.15s, color 0.15s, border-color 0.15s',
}

const sortBtnActive: React.CSSProperties = {
  background: 'var(--accent, #7c3aed)',
  color: '#fff',
  borderColor: 'transparent',
}

export function QuizzesTab({ quizzes, hasMore, loadingMore, onLoadMore }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('plays')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sorted = useMemo(() => {
    const arr = [...quizzes]
    const mul = sortDir === 'desc' ? -1 : 1
    arr.sort((a, b) => {
      switch (sortKey) {
        case 'plays':   return mul * ((a.totalPlays   || 0) - (b.totalPlays   || 0))
        case 'players': return mul * ((a.totalPlayers || 0) - (b.totalPlayers || 0))
        case 'shares':  return mul * ((a.shareCount   || 0) - (b.shareCount   || 0))
        case 'title':   return mul * (a.title || '').localeCompare(b.title || '')
        case 'created': {
          const ta = (a.createdAt as { seconds: number } | null)?.seconds ?? 0
          const tb = (b.createdAt as { seconds: number } | null)?.seconds ?? 0
          return mul * (ta - tb)
        }
        default: return 0
      }
    })
    return arr
  }, [quizzes, sortKey, sortDir])

  const arrow = (k: SortKey) => sortKey === k ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''

  const SORT_BTNS: { key: SortKey; label: string }[] = [
    { key: 'plays',   label: '🎮 Most Played' },
    { key: 'players', label: '👥 Most Players' },
    { key: 'shares',  label: '🔗 Most Shared' },
    { key: 'title',   label: '🔤 Title' },
    { key: 'created', label: '🕐 Newest' },
  ]

  return (
    <div>
      {/* Sort controls */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {SORT_BTNS.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => handleSort(key)}
            style={{ ...sortBtnBase, ...(sortKey === key ? sortBtnActive : {}) }}
          >
            {label}{arrow(key)}
          </button>
        ))}
      </div>

      <div className="master-scroll-table">
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 560 }}>
          <thead>
            <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border)', background: 'var(--bg-deep)' }}>
              <th style={thStyle}>#</th>
              <th style={{ ...thStyle, cursor: 'pointer' }} onClick={() => handleSort('title')}>
                Title{arrow('title')}
              </th>
              <th style={thStyle}>Owner</th>
              <th style={thStyle}>Visibility</th>
              <th style={{ ...thStyle, textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('plays')}>
                Plays{arrow('plays')}
              </th>
              <th style={{ ...thStyle, textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('players')}>
                Players{arrow('players')}
              </th>
              <th style={{ ...thStyle, textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('shares')}>
                Shares{arrow('shares')}
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 && (
              <tr>
                <td colSpan={7} style={{ ...tdStyle, color: 'var(--text-muted)', textAlign: 'center', padding: '1.5rem' }}>
                  No quizzes found.
                </td>
              </tr>
            )}
            {sorted.map((q, i) => {
              const plays = q.totalPlays || 0
              const isTopPlayed = i === 0 && sortKey === 'plays' && plays > 0
              return (
                <tr key={q.id} style={{ borderBottom: '1px solid var(--border)', background: isTopPlayed ? 'rgba(124,58,237,0.06)' : undefined }}>
                  <td style={{ ...tdStyle, color: 'var(--text-muted)', fontSize: '0.72rem', width: 32 }}>
                    {i === 0 && sortKey === 'plays' && plays > 0 ? '🥇' : i === 1 && sortKey === 'plays' && plays > 0 ? '🥈' : i === 2 && sortKey === 'plays' && plays > 0 ? '🥉' : i + 1}
                  </td>
                  <td style={{ ...tdStyle, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.title}</td>
                  <td style={{ ...tdStyle, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <small style={{ fontFamily: 'monospace', fontSize: '0.72rem' }}>{q.ownerId}</small>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ color: q.visibility === 'public' ? '#22c55e' : 'var(--text-muted)', fontWeight: 600, fontSize: '0.75rem' }}>
                      {q.visibility}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontWeight: plays > 0 ? 700 : 400, color: plays > 0 ? 'var(--accent, #7c3aed)' : 'var(--text-muted)' }}>
                    {plays > 0 ? plays.toLocaleString() : '—'}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{q.totalPlayers ? q.totalPlayers.toLocaleString() : '—'}</td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>{q.shareCount ? q.shareCount.toLocaleString() : '—'}</td>
                </tr>
              )
            })}
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
      {!hasMore && sorted.length > 0 && (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: '0.75rem' }}>
          All {sorted.length} quizzes loaded.
        </p>
      )}
    </div>
  )
}

