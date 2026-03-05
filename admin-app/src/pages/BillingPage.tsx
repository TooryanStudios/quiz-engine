import { Link } from 'react-router-dom'
import { useSubscription } from '../lib/useSubscription'

export function BillingPage() {
  const { creditsRemaining, plan, loading } = useSubscription()

  return (
    <section className="panel" style={{ maxWidth: 920, margin: '0 auto' }}>
      <h2 style={{ marginTop: 0, marginBottom: '0.5rem' }}>Billing & Credits</h2>
      <p style={{ marginTop: 0, color: 'var(--text-mid)' }}>
        This app uses AI credits for paid AI features. New users get a small free trial credit wallet.
      </p>

      <div style={{ display: 'grid', gap: '0.75rem', marginTop: '1rem' }}>
        <div style={{ display: 'grid', gap: 6, padding: '0.9rem', border: '1px solid var(--border)', borderRadius: 12, background: 'var(--bg-elevated)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontWeight: 800 }}>Current plan</div>
              <div style={{ color: 'var(--text-mid)' }}>{loading ? 'Loading…' : (plan || 'free')}</div>
            </div>
            <div>
              <div style={{ fontWeight: 800 }}>AI credits remaining</div>
              <div style={{ color: 'var(--text-mid)' }}>{loading ? 'Loading…' : (creditsRemaining ?? 0)}</div>
            </div>
          </div>
        </div>

        <div style={{ padding: '0.9rem', border: '1px solid var(--border)', borderRadius: 12, background: 'var(--bg-surface)' }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>How upgrades work (temporary)</div>
          <div style={{ color: 'var(--text-mid)', lineHeight: 1.6 }}>
            Payments are not automated yet. To upgrade after using your free credits, please contact support to receive bank transfer details.
            After you complete the transfer, we manually activate your subscription and/or add credits to your account.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link to="/" className="btn btn-secondary">Back to Dashboard</Link>
          <Link to="/packs" className="btn">Browse Packs</Link>
        </div>
      </div>
    </section>
  )
}
