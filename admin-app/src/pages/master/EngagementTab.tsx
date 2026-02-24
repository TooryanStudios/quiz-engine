import type { PlatformStats } from '../../lib/adminRepo'
import { StatCard } from './masterShared'

interface Props {
  platformStats: PlatformStats
}

export function EngagementTab({ platformStats }: Props) {
  const total = platformStats.mobileVisits + platformStats.desktopVisits
  const mobilePct = total > 0 ? Math.round((platformStats.mobileVisits / total) * 100) : 0
  const desktopPct = 100 - mobilePct

  const checkoutConversionPct = platformStats.checkoutStarted > 0
    ? Math.round((platformStats.checkoutStarted / (platformStats.mobileVisits + platformStats.desktopVisits)) * 100)
    : 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

      {/* ── Core activity ── */}
      <section>
        <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', margin: '0 0 0.6rem' }}>Core Activity</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.6rem' }}>
          <StatCard label="Quizzes Created" value={platformStats.quizCreated}   icon="📝" />
          <StatCard label="Sessions Hosted" value={platformStats.sessionHosted}  icon="🎮" />
          <StatCard label="Voice Lab Tests" value={platformStats.voiceLabTests}  icon="🎙️" />
        </div>
      </section>

      {/* ── Monetisation ── */}
      <section>
        <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', margin: '0 0 0.6rem' }}>Monetisation</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.6rem', marginBottom: '0.6rem' }}>
          <StatCard label="Upgrade Clicks"    value={platformStats.upgradeClicks}   icon="💳" />
          <StatCard label="Checkout Started"  value={platformStats.checkoutStarted} icon="🛒" />
        </div>
        {total > 0 && platformStats.checkoutStarted > 0 && (
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.75rem 1rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            💡 <strong>{checkoutConversionPct}%</strong> of all visitors started a checkout
          </div>
        )}
      </section>

      {/* ── AI usage ── */}
      <section>
        <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', margin: '0 0 0.6rem' }}>AI Usage</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.6rem' }}>
          <StatCard label="AI Generate" value={platformStats.aiGenerateClicks} icon="✨" />
          <StatCard label="AI Recheck"  value={platformStats.aiRecheckClicks}  icon="🛡️" />
        </div>
      </section>

      {/* ── Device breakdown ── */}
      <section>
        <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', margin: '0 0 0.6rem' }}>Device Breakdown</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '0.6rem', marginBottom: '0.75rem' }}>
          <StatCard label="Mobile Visits"  value={platformStats.mobileVisits}  icon="📱" />
          <StatCard label="Desktop Visits" value={platformStats.desktopVisits} icon="🖥️" />
        </div>
        {total > 0 && (
          <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.9rem 1rem' }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              📱 Mobile {mobilePct}%&nbsp;·&nbsp;🖥️ Desktop {desktopPct}%
            </div>
            <div style={{ height: '10px', borderRadius: '6px', background: 'var(--bg-deep)', overflow: 'hidden', display: 'flex' }}>
              <div style={{ width: `${mobilePct}%`, background: '#2563eb', transition: 'width 0.4s ease' }} />
              <div style={{ flex: 1, background: '#7c3aed' }} />
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '0.4rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
              <span>🔵 Mobile</span><span>🟣 Desktop</span>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
