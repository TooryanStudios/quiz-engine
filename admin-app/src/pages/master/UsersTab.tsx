import React, { useState } from 'react'
import { setUserStatus, type UserProfile } from '../../lib/adminRepo'
import { useDialog } from '../../lib/DialogContext'
import type { QuizDoc } from '../../types/quiz'
import { formatLastSeen } from './masterShared'

const MASTER_EMAIL = import.meta.env.VITE_MASTER_EMAIL as string | undefined

interface Props {
  users: UserProfile[]
  quizzes: (QuizDoc & { id: string })[]
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

export function UsersTab({ users, quizzes, dark, hasMore, loadingMore, onLoadMore, error }: Props) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const quizCountByOwner = quizzes.reduce<Record<string, number>>((acc, q) => {
    acc[q.ownerId] = (acc[q.ownerId] || 0) + 1
    return acc
  }, {})

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
        <UserRow key={u.uid} user={u} quizCount={quizCountByOwner[u.uid] || 0} dark={dark} />
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

function UserRow({ user: u, quizCount, dark }: { user: UserProfile; quizCount: number; dark: boolean }) {
  const { show } = useDialog()
  const isAdmin = !!(MASTER_EMAIL && u.email === MASTER_EMAIL)

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

  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: `1px solid ${u.status !== 'active' ? statusColor + '55' : 'var(--border)'}`,
      borderRadius: '10px',
      padding: '0.55rem 0.85rem',
      marginBottom: '0.45rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.65rem',
      flexWrap: 'wrap',
    }}>
      {/* Avatar */}
      {u.photoURL ? (
        <img src={u.photoURL} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
      ) : (
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: isAdmin ? '#7c3aed' : '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '0.75rem', flexShrink: 0 }}>
          {initials}
        </div>
      )}

      {/* Name / email */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, color: 'var(--text-bright)', fontSize: '0.82rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {u.displayName || u.email || u.uid}
          {isAdmin && (
            <span style={{ marginLeft: '0.4rem', fontSize: '0.65rem', background: '#7c3aed22', color: '#7c3aed', border: '1px solid #7c3aed55', borderRadius: '4px', padding: '0.1rem 0.35rem', fontWeight: 700 }}>
              👑 Admin
            </span>
          )}
          {u._authOnly && (
            <span
              title="This user signed up via Google but has never opened the app since activity tracking was added. Their full profile (login count, device, last seen) will be created automatically the next time they sign in."
              style={{ marginLeft: '0.4rem', fontSize: '0.65rem', background: '#d9780622', color: '#d97806', border: '1px solid #d9780655', borderRadius: '4px', padding: '0.1rem 0.35rem', fontWeight: 700, cursor: 'help' }}>
              ⚠️ Never opened app
            </span>
          )}
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {u.email || u.uid}
        </div>
      </div>

      {/* Status badge */}
      <span
        title={u._authOnly ? 'Registered in Firebase Auth but has never opened the app — no activity data yet' : `Account status: ${u.status}`}
        style={{ padding: '0.2rem 0.5rem', borderRadius: '99px', background: statusColor + '22', color: statusColor, fontSize: '0.68rem', fontWeight: 700, flexShrink: 0, cursor: 'help' }}>
        {u._authOnly ? 'Never signed in to app' : u.status}
      </span>

      {/* Platform */}
      <span
        title={`Device type: ${u.platform === 'mobile' ? 'Mobile' : u.platform === 'desktop' ? 'Desktop' : 'Unknown — will be detected on next sign-in'}`}
        style={{ fontSize: '0.72rem', color: 'var(--text-muted)', flexShrink: 0, cursor: 'help' }}>
        {u.platform === 'mobile' ? '📱 Mobile' : u.platform === 'desktop' ? '🖥️ Desktop' : '❓ Unknown device'}
      </span>

      {/* Stats */}
      <div style={{ display: 'flex', gap: '0.75rem', flexShrink: 0, fontSize: '0.72rem', color: 'var(--text-muted)' }}>
        <span title="Total number of times this user has signed in to the app">
          🔑 {u.signInCount} {u.signInCount === 1 ? 'login' : 'logins'}
        </span>
        <span title="Number of quizzes this user has created">
          📋 {quizCount} {quizCount === 1 ? 'quiz' : 'quizzes'}
        </span>
        <span title="When the user last opened the app">
          🕐 {u._authOnly ? 'Never opened app' : formatLastSeen(u.lastSeen)}
        </span>
      </div>

      {/* Action buttons — hidden entirely for admin */}
      {!isAdmin && (
        <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
          {u.status === 'active' && (
            <button onClick={confirmBlock} style={{ padding: '0.25rem 0.6rem', borderRadius: '5px', border: 'none', background: '#dc2626', color: '#fff', fontWeight: 600, fontSize: '0.7rem', cursor: 'pointer' }}>
              Block
            </button>
          )}
          {u.status === 'blocked' && (
            <button onClick={() => void setUserStatus(u.uid, 'active')} style={{ padding: '0.25rem 0.6rem', borderRadius: '5px', border: 'none', background: '#16a34a', color: '#fff', fontWeight: 600, fontSize: '0.7rem', cursor: 'pointer' }}>
              Unblock
            </button>
          )}
          {u.status !== 'deleted' && (
            <button onClick={confirmDelete} style={{ padding: '0.25rem 0.6rem', borderRadius: '5px', border: 'none', background: dark ? '#334155' : '#cbd5e1', color: 'var(--text)', fontWeight: 600, fontSize: '0.7rem', cursor: 'pointer' }}>
              Delete
            </button>
          )}
          {u.status === 'deleted' && (
            <button onClick={() => void setUserStatus(u.uid, 'active')} style={{ padding: '0.25rem 0.6rem', borderRadius: '5px', border: 'none', background: '#2563eb', color: '#fff', fontWeight: 600, fontSize: '0.7rem', cursor: 'pointer' }}>
              Restore
            </button>
          )}
        </div>
      )}
    </div>
  )
}
