import { useMemo, useState } from 'react'
import { setUserStatus, type UserProfile } from '../../lib/adminRepo'
import { formatJoinDate, formatLastSeen } from './masterShared'
import './LabAccessTab.css'

interface Props {
  users: UserProfile[]
  error?: string | null
}

type AccessFilter = 'pending' | 'rejected' | 'blocked' | 'active' | 'all'

export function LabAccessTab({ users, error }: Props) {
  const [filter, setFilter] = useState<AccessFilter>('pending')
  const [busyUid, setBusyUid] = useState<string | null>(null)

  const filtered = useMemo(() => {
    if (filter === 'all') return users
    return users.filter((user) => user.status === filter)
  }, [users, filter])

  async function updateStatus(uid: string, status: 'pending' | 'active' | 'blocked' | 'rejected' | 'deleted') {
    setBusyUid(uid)
    try {
      await setUserStatus(uid, status)
    } finally {
      setBusyUid(null)
    }
  }

  return (
    <div>
      <div className="lab-access-head">
        <h3>Lab Access Control</h3>
        <span
          className="lab-access-tooltip"
          title="Approving a user here grants access to Lab and Studio. Pending, rejected, and blocked users cannot access Lab features."
          aria-label="Lab access policy"
        >
          i
        </span>
      </div>
      <p className="lab-access-subtitle">
        Manage who can access Lab and Studio. This is the account activation gate.
      </p>

      <div className="lab-access-filters">
        {(['pending', 'rejected', 'blocked', 'active', 'all'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setFilter(tab)}
            className={`lab-access-filter-btn${filter === tab ? ' is-active' : ''}`}
          >
            {tab[0].toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {error && <div className="lab-access-error">{error}</div>}

      <div className="lab-access-table-wrap">
        <table className="lab-access-table">
          <thead>
            <tr>
              <th>User</th>
              <th>Email</th>
              <th>Status</th>
              <th>Joined</th>
              <th>Last Seen</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((user) => (
              <tr key={user.uid}>
                <td>{user.displayName || 'Unnamed'}</td>
                <td>{user.email || '-'}</td>
                <td>{user.status}</td>
                <td>{formatJoinDate(user.createdAt)}</td>
                <td>{formatLastSeen(user.lastSeen)}</td>
                <td>
                  <div className="lab-access-actions">
                    <button disabled={busyUid === user.uid} className="lab-access-btn is-green" onClick={() => updateStatus(user.uid, 'active')}>Approve</button>
                    <button disabled={busyUid === user.uid} className="lab-access-btn is-amber" onClick={() => updateStatus(user.uid, 'pending')}>Set Pending</button>
                    <button disabled={busyUid === user.uid} className="lab-access-btn is-red" onClick={() => updateStatus(user.uid, 'rejected')}>Reject</button>
                    <button disabled={busyUid === user.uid} className="lab-access-btn is-outline-red" onClick={() => updateStatus(user.uid, 'blocked')}>Block</button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="lab-access-empty">No users in this view.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
