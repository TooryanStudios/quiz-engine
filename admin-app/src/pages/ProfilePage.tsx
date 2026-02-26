import { auth } from '../lib/firebase'

export function ProfilePage() {
  const user = auth.currentUser

  return (
    <section className="panel" style={{ maxWidth: '760px', margin: '0 auto' }}>
      <h2 style={{ marginTop: 0, marginBottom: '1rem' }}>👤 Profile</h2>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', marginBottom: '1rem' }}>
        {user?.photoURL ? (
          <img
            src={user.photoURL}
            alt=""
            referrerPolicy="no-referrer"
            style={{ width: 56, height: 56, borderRadius: '50%', border: '1px solid var(--border-strong)' }}
          />
        ) : (
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
            }}
          >
            {(user?.displayName || user?.email || '?').slice(0, 2).toUpperCase()}
          </div>
        )}

        <div>
          <div style={{ color: 'var(--text-bright)', fontWeight: 700, fontSize: '1rem' }}>
            {user?.displayName || 'User'}
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            {user?.email || 'No email'}
          </div>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.9rem', color: 'var(--text-dim)', fontSize: '0.86rem' }}>
        This is your account profile page.
      </div>
    </section>
  )
}
