import type { WorkhubMember } from '../../../lib/workhubRepo'

function initialsOf(name: string) {
  return name
    .split(' ')
    .map((part) => part.trim().slice(0, 1))
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'WM'
}

export function TeamDialog(props: {
  isOpen: boolean
  onClose: () => void
  members: WorkhubMember[]
  isMasterAdmin: boolean
  currentUserUid: string
  pendingCount: number
  busyKey: string
  onModerate: (uid: string, status: 'approved' | 'suspended', role?: 'member' | 'manager' | 'admin') => void
}) {
  if (!props.isOpen) return null

  return (
    <div className="workhub-modal-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget) props.onClose() }}>
      <div className="workhub-modal large" onMouseDown={(event) => event.stopPropagation()}>
        <div className="workhub-modal-head">
          <div>
            <h2>Team</h2>
            <p>Team management is available on demand instead of on the landing page.</p>
          </div>
          <button className="workhub-ghost-btn" onClick={props.onClose}>Close</button>
        </div>
        <div className="workhub-member-list compact-list">
          {props.members.map((item) => (
            <div key={item.uid} className="workhub-member-row compact-row">
              <div className="workhub-member-main">
                {item.photoURL ? <img src={item.photoURL} alt="" /> : <div className="workhub-member-avatar-fallback">{initialsOf(item.displayName || item.email || item.uid)}</div>}
                <div>
                  <strong>{item.displayName || item.email}</strong>
                  <span>{item.email}</span>
                </div>
              </div>
              <div className="workhub-member-meta">
                <span className={`workhub-status-chip status-${item.status}`}>{item.status}</span>
                <span className="workhub-role-chip">{item.role}</span>
              </div>
              {props.isMasterAdmin && item.uid !== props.currentUserUid && (
                <div className="workhub-member-actions">
                  {item.status !== 'approved' && <button className="workhub-primary-mini" disabled={props.busyKey === `member:${item.uid}:approved`} onClick={() => props.onModerate(item.uid, 'approved', item.role === 'admin' ? 'admin' : 'member')}>Approve</button>}
                  {item.status !== 'suspended' && <button className="workhub-ghost-mini" disabled={props.busyKey === `member:${item.uid}:suspended`} onClick={() => props.onModerate(item.uid, 'suspended', item.role)}>Suspend</button>}
                </div>
              )}
            </div>
          ))}
          {props.members.length === 0 && <div className="workhub-empty-state">No members yet.</div>}
        </div>
        {props.isMasterAdmin && props.pendingCount > 0 && (
          <div className="workhub-admin-note">You have {props.pendingCount} pending membership request{props.pendingCount > 1 ? 's' : ''} to review.</div>
        )}
      </div>
    </div>
  )
}
