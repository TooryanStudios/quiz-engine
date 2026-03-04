import React, { useState, useRef, useEffect } from 'react'
import { setUserStatus, type UserProfile, type GameSession } from '../../lib/adminRepo'
import { useDialog } from '../../lib/DialogContext'
import type { QuizDoc } from '../../types/quiz'
import { formatLastSeen, formatJoinDate } from './masterShared'

const MASTER_EMAIL = import.meta.env.VITE_MASTER_EMAIL as string | undefined

interface Props {
  users: UserProfile[]
  quizzes: (QuizDoc & { id: string })[]
  sessions: GameSession[]
  dark: boolean
  hasMore: boolean
  loadingMore: boolean
  onLoadMore: () => void
  error?: string | null
}

type StatusFilter = 'all' | 'active' | 'blocked' | 'deleted'

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

const menuItemStyle = (color: string): React.CSSProperties => ({
  display: 'block',
  width: '100%',
  padding: '0.55rem 1rem',
  border: 'none',
  background: 'transparent',
  color,
  fontSize: '0.82rem',
  fontWeight: 600,
  cursor: 'pointer',
  textAlign: 'start',
})

export function UsersTab({ users, quizzes, sessions, dark, hasMore, loadingMore, onLoadMore, error }: Props) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  // Per-user arrays — zero extra Firestore reads, all derived from already-loaded data
  const quizzesByOwner = quizzes.reduce<Record<string, (QuizDoc & { id: string })[]>>((acc, q) => {
    if (!acc[q.ownerId]) acc[q.ownerId] = []
    acc[q.ownerId].push(q)
    return acc
  }, {})

  const sessionsByHost = sessions.reduce<Record<string, GameSession[]>>((acc, s) => {
    if (!s.hostId) return acc
    if (!acc[s.hostId]) acc[s.hostId] = []
    acc[s.hostId].push(s)
    return acc
  }, {})

  const quizCountByOwner    = Object.fromEntries(Object.entries(quizzesByOwner).map(([k, v]) => [k, v.length]))
  const totalPlaysByOwner   = Object.fromEntries(Object.entries(quizzesByOwner).map(([k, v]) => [k, v.reduce((s, q) => s + (q.totalPlays || 0), 0)]))
  const totalPlayersByOwner = Object.fromEntries(Object.entries(quizzesByOwner).map(([k, v]) => [k, v.reduce((s, q) => s + (q.totalPlayers || 0), 0)]))
  const sessionsHostedByUser = Object.fromEntries(Object.entries(sessionsByHost).map(([k, v]) => [k, v.length]))

  // users is already sorted by lastSeen desc (done in useUsersData)
  const authOnlyCount = users.filter(u => u._authOnly).length

  const filtered = users.filter(u => {
    const matchSearch = !search
      || u.displayName?.toLowerCase().includes(search.toLowerCase())
      || u.email?.toLowerCase().includes(search.toLowerCase())
      || u.uid.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || u.status === statusFilter
    return matchSearch && matchStatus
  })

  const filterButtons: { key: StatusFilter; label: string; activeColor: string }[] = [
    { key: 'all',     label: 'All',          activeColor: '#2563eb' },
    { key: 'active',  label: '✅ Active',    activeColor: '#16a34a' },
    { key: 'blocked', label: '🚫 Blocked',   activeColor: '#dc2626' },
    { key: 'deleted', label: '🗑️ Deleted',  activeColor: '#64748b' },
  ]

  return (
    <div>
      {/* ── Search + filter bar ── */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search name, email or UID…"
          style={{
            flex: '1 1 180px',
            padding: '0.4rem 0.7rem',
            borderRadius: '7px',
            border: '1px solid var(--border)',
            background: 'var(--bg-surface)',
            color: 'var(--text)',
            fontSize: '0.8rem',
            outline: 'none',
          }}
        />
        {filterButtons.map(({ key, label, activeColor }) => (
          <button
            key={key}
            onClick={() => setStatusFilter(key)}
            style={{
              padding: '0.35rem 0.7rem',
              borderRadius: '5px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: '0.72rem',
              background: statusFilter === key ? activeColor : (dark ? '#1e293b' : '#e2e8f0'),
              color: statusFilter === key ? '#fff' : 'var(--text)',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
            {key !== 'all' && ` (${users.filter(u => u.status === key).length})`}
          </button>
        ))}
        <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginLeft: 'auto' }}>
          {filtered.length} / {users.length}{authOnlyCount > 0 ? ` (${authOnlyCount} no profile)` : ''}
        </span>
      </div>

      {/* ── Error banner ── */}
      {error && (
        <div style={{ background: '#dc262622', border: '1px solid #dc2626', color: '#dc2626', borderRadius: '8px', padding: '0.5rem 0.75rem', marginBottom: '0.75rem', fontSize: '0.78rem', fontWeight: 600 }}>
          ⚠️ Failed to load users: {error}
        </div>
      )}

      {/* ── User rows ── */}
      {filtered.length === 0 ? (
        <p style={{ color: 'var(--text-muted)' }}>No users found.</p>
      ) : filtered.map(u => (
        <UserRow
          key={u.uid}
          user={u}
          quizCount={quizCountByOwner[u.uid] || 0}
          totalPlays={totalPlaysByOwner[u.uid] || 0}
          totalPlayers={totalPlayersByOwner[u.uid] || 0}
          sessionsHosted={sessionsHostedByUser[u.uid] || 0}
          userQuizzes={quizzesByOwner[u.uid] || []}
          userSessions={sessionsByHost[u.uid] || []}
          dark={dark}
        />
      ))}

      {/* Load More — only show when not filtering */}
      {!search && statusFilter === 'all' && hasMore && (
        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <button onClick={onLoadMore} disabled={loadingMore} style={loadMoreBtnStyle}>
            {loadingMore ? 'Loading…' : 'Load More Users'}
          </button>
        </div>
      )}
      {!search && statusFilter === 'all' && !hasMore && users.length > 0 && (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: '0.75rem' }}>
          All {users.length} users loaded.
        </p>
      )}

      {/* Auth-only users are shown inline above with a badge — no separate ghost section needed */}
    </div>
  )
}

// ── User row ──────────────────────────────────────────────────────────────────

function UserRow({ user: u, quizCount, totalPlays, totalPlayers, sessionsHosted, userQuizzes, userSessions }: {
  user: UserProfile
  quizCount: number
  totalPlays: number
  totalPlayers: number
  sessionsHosted: number
  userQuizzes: (QuizDoc & { id: string })[]
  userSessions: GameSession[]
  dark: boolean
}) {
  const { show } = useDialog()
  const [imgErr, setImgErr] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const isAdmin = !!(MASTER_EMAIL && u.email === MASTER_EMAIL)

  useEffect(() => {
    if (!menuOpen) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [menuOpen])

  const initials = u.displayName
    ? u.displayName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : (u.email?.[0] ?? '?').toUpperCase()

  const statusColor = u._authOnly ? '#d97706' : u.status === 'blocked' ? '#dc2626' : u.status === 'deleted' ? '#64748b' : '#16a34a'

  const confirmBlock = () => show({
    title: 'Block User',
    message: `Block ${u.displayName || u.email}? They will lose access immediately.`,
    confirmText: 'Block',
    cancelText: 'Cancel',
    isDangerous: true,
    onConfirm: () => setUserStatus(u.uid, 'blocked'),
  })

  const confirmDelete = () => show({
    title: 'Delete User',
    message: `Soft-delete ${u.displayName || u.email}? They will be signed out immediately.`,
    confirmText: 'Delete',
    cancelText: 'Cancel',
    isDangerous: true,
    onConfirm: () => setUserStatus(u.uid, 'deleted'),
  })

  // Build per-quiz stats from already-loaded sessions
  const sessionsByQuizId = userSessions.reduce<Record<string, GameSession[]>>((acc, s) => {
    if (!acc[s.quizId]) acc[s.quizId] = []
    acc[s.quizId].push(s)
    return acc
  }, {})

  const allQuizIds = Array.from(new Set([
    ...userQuizzes.map(q => q.id),
    ...Object.keys(sessionsByQuizId),
  ]))

  const quizLookup = Object.fromEntries(userQuizzes.map(q => [q.id, q]))

  const quizRows = allQuizIds
    .map(qid => {
      const quiz = quizLookup[qid]
      const sArr = sessionsByQuizId[qid] || []
      const sorted = [...sArr].sort((a, b) => (b.startedAt?.toMillis?.() ?? 0) - (a.startedAt?.toMillis?.() ?? 0))
      return {
        id: qid,
        title: quiz?.title ?? '[Deleted quiz]',
        sessions: sArr.length,
        totalPlays: quiz?.totalPlays || 0,
        totalPlayers: quiz?.totalPlayers || 0,
        lastPlayed: sorted[0]?.startedAt,
        isDeleted: !quiz,
      }
    })
    .sort((a, b) => b.sessions - a.sessions || b.totalPlays - a.totalPlays)

  const hasActivity = quizRows.length > 0

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: `1px solid ${u.status !== 'active' ? statusColor + '55' : 'var(--border)'}`,
      borderRadius: '10px',
      marginBottom: '0.45rem',
      overflow: 'hidden',
    }}>
    <div style={{ padding: '0.55rem 0.85rem' }}>
      {/* ── Row 1: avatar + name + menu ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
        {/* Avatar */}
        {u.photoURL && !imgErr ? (
          <img
            src={u.photoURL}
            alt=""
            referrerPolicy="no-referrer"
            onError={() => setImgErr(true)}
            style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
          />
        ) : (
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: isAdmin ? '#7c3aed' : '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '0.8rem', flexShrink: 0 }}>
            {initials}
          </div>
        )}

        {/* Name / email */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, color: 'var(--text-bright)', fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {u.displayName || u.email || u.uid}
            {isAdmin && (
              <span style={{ marginLeft: '0.4rem', fontSize: '0.65rem', background: '#7c3aed22', color: '#7c3aed', border: '1px solid #7c3aed55', borderRadius: '4px', padding: '0.1rem 0.35rem', fontWeight: 700 }}>
                👑 Admin
              </span>
            )}
            {u._authOnly && (
              <span
                title="This user signed up via Google but has never opened the app since activity tracking was added."
                style={{ marginLeft: '0.4rem', fontSize: '0.65rem', background: '#d9780622', color: '#d97806', border: '1px solid #d9780655', borderRadius: '4px', padding: '0.1rem 0.35rem', fontWeight: 700, cursor: 'help' }}>
                ⚠️ Never opened app
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {u.email || u.uid}
          </div>
        </div>

        {/* Expand button — only when user has quizzes or sessions */}
        {hasActivity && (
          <button
            onClick={() => setExpanded(o => !o)}
            title={expanded ? 'Hide activity breakdown' : 'Show quiz & session breakdown'}
            style={{
              width: 28, height: 28, borderRadius: '6px', border: '1px solid var(--border)',
              background: expanded ? '#2563eb' : 'transparent',
              color: expanded ? '#fff' : 'var(--text-muted)',
              fontSize: '0.75rem', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >
            {expanded ? '▲' : '▼'}
          </button>
        )}

        {/* ⋮ dropdown menu — hidden for admin */}
        {!isAdmin && (
          <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={() => setMenuOpen(o => !o)}
              style={{
                width: 30, height: 30, borderRadius: '6px', border: '1px solid var(--border)',
                background: 'transparent', color: 'var(--text-muted)', fontSize: '1.1rem',
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                lineHeight: 1,
              }}
              title="Actions"
            >
              ⋮
            </button>
            {menuOpen && (
              <div style={{
                position: 'absolute', right: 0, top: '110%', zIndex: 100,
                background: 'var(--bg-surface)', border: '1px solid var(--border)',
                borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.18)',
                minWidth: 140, overflow: 'hidden',
              }}>
                {u.status === 'active' && (
                  <button onClick={() => { setMenuOpen(false); confirmBlock() }} style={menuItemStyle('#dc2626')}>
                    🚫 Block
                  </button>
                )}
                {u.status === 'blocked' && (
                  <button onClick={() => { setMenuOpen(false); void setUserStatus(u.uid, 'active') }} style={menuItemStyle('#16a34a')}>
                    ✅ Unblock
                  </button>
                )}
                {u.status === 'deleted' && (
                  <button onClick={() => { setMenuOpen(false); void setUserStatus(u.uid, 'active') }} style={menuItemStyle('#2563eb')}>
                    ♻️ Restore
                  </button>
                )}
                {u.status !== 'deleted' && (
                  <button onClick={() => { setMenuOpen(false); confirmDelete() }} style={menuItemStyle('#dc2626')}>
                    🗑️ Delete
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Row 2: status + platform + stats ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem 0.75rem', marginTop: '0.45rem', alignItems: 'center', paddingLeft: '0.2rem' }}>
        {/* Status badge */}
        <span
          title={u._authOnly ? 'Registered in Firebase Auth but has never opened the app — no activity data yet' : `Account status: ${u.status}`}
          style={{ padding: '0.15rem 0.45rem', borderRadius: '99px', background: statusColor + '22', color: statusColor, fontSize: '0.68rem', fontWeight: 700, cursor: 'help', flexShrink: 0 }}>
          {u._authOnly ? 'Never signed in' : u.status}
        </span>

        {/* Platform */}
        <span
          title={`Device type: ${u.platform === 'mobile' ? 'Mobile' : u.platform === 'desktop' ? 'Desktop' : 'Unknown'}`}
          style={{ fontSize: '0.72rem', color: 'var(--text-muted)', flexShrink: 0, cursor: 'help' }}>
          {u.platform === 'mobile' ? '📱 Mobile' : u.platform === 'desktop' ? '🖥️ Desktop' : '❓ Unknown'}
        </span>

        {/* Stats */}
        <span title="Account join date" style={{ fontSize: '0.72rem', color: 'var(--text-muted)', flexShrink: 0 }}>
          🗓️ {formatJoinDate(u.createdAt)}
        </span>
        <span title="Total sign-ins" style={{ fontSize: '0.72rem', color: 'var(--text-muted)', flexShrink: 0 }}>
          🔑 {u.signInCount ?? 0} logins
        </span>
        <span title="Game sessions hosted" style={{ fontSize: '0.72rem', color: 'var(--text-muted)', flexShrink: 0 }}>
          🎮 {sessionsHosted} sessions
        </span>
        <span title="Quizzes created" style={{ fontSize: '0.72rem', color: 'var(--text-muted)', flexShrink: 0 }}>
          📋 {quizCount} {quizCount === 1 ? 'quiz' : 'quizzes'}
        </span>
        {totalPlays > 0 && (
          <span title="Total times any of this user's quizzes were played" style={{ fontSize: '0.72rem', color: 'var(--text-muted)', flexShrink: 0 }}>
            ▶️ {totalPlays} plays · 👥 {totalPlayers} players
          </span>
        )}
        <span title="Last login" style={{ fontSize: '0.72rem', color: 'var(--text-muted)', flexShrink: 0 }}>
          🕐 {u._authOnly ? 'Never opened app' : formatLastSeen(u.lastSeen)}
        </span>
      </div>
    </div>

      {/* ── Expandable: per-quiz activity breakdown ── */}
      {expanded && hasActivity && (
        <div style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-deep)', padding: '0.6rem 0.85rem' }}>
          <p style={{ margin: '0 0 0.5rem', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
            Quiz Activity Breakdown
          </p>
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', touchAction: 'pan-x' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', minWidth: 360 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th style={{ textAlign: 'left',   padding: '0.28rem 0.5rem', color: 'var(--text-muted)', fontWeight: 700, whiteSpace: 'nowrap' }}>Quiz</th>
                  <th style={{ textAlign: 'center', padding: '0.28rem 0.5rem', color: 'var(--text-muted)', fontWeight: 700, whiteSpace: 'nowrap' }}>Sessions</th>
                  <th style={{ textAlign: 'center', padding: '0.28rem 0.5rem', color: 'var(--text-muted)', fontWeight: 700, whiteSpace: 'nowrap' }}>Plays</th>
                  <th style={{ textAlign: 'center', padding: '0.28rem 0.5rem', color: 'var(--text-muted)', fontWeight: 700, whiteSpace: 'nowrap' }}>Players</th>
                  <th style={{ textAlign: 'right',  padding: '0.28rem 0.5rem', color: 'var(--text-muted)', fontWeight: 700, whiteSpace: 'nowrap' }}>Last Hosted</th>
                </tr>
              </thead>
              <tbody>
                {quizRows.map(row => (
                  <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '0.32rem 0.5rem', color: row.isDeleted ? 'var(--text-muted)' : 'var(--text-bright)', fontWeight: 600, maxWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.isDeleted ? <em style={{ opacity: 0.55 }}>{row.title}</em> : row.title}
                    </td>
                    <td style={{ padding: '0.32rem 0.5rem', textAlign: 'center', color: row.sessions > 0 ? '#2563eb' : 'var(--text-muted)', fontWeight: 700 }}>
                      {row.sessions}
                    </td>
                    <td style={{ padding: '0.32rem 0.5rem', textAlign: 'center', color: 'var(--text-mid)' }}>
                      {row.totalPlays}
                    </td>
                    <td style={{ padding: '0.32rem 0.5rem', textAlign: 'center', color: 'var(--text-mid)' }}>
                      {row.totalPlayers}
                    </td>
                    <td style={{ padding: '0.32rem 0.5rem', textAlign: 'right', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {row.lastPlayed ? formatLastSeen(row.lastPlayed) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
