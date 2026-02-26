// ---------------------------------------------------------------------------
// Shared helpers & primitives used across all Master Admin tab components
// ---------------------------------------------------------------------------

export type MasterTab = 'overview' | 'sessions' | 'quizzes' | 'engagement' | 'creators' | 'users' | 'questionTypes' | 'miniGames'

// ── Styles ──────────────────────────────────────────────────────────────────

export function tabStyle(active: boolean, dark: boolean): React.CSSProperties {
  return {
    padding: '0.6rem 1.5rem',
    borderRadius: '8px',
    border: 'none',
    background: active ? '#2563eb' : (dark ? '#1e293b' : '#e2e8f0'),
    color: active ? '#fff' : 'var(--text)',
    cursor: 'pointer',
    fontWeight: 600,
    whiteSpace: 'nowrap',
  }
}

export function tableContainer(): React.CSSProperties {
  return {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border)',
    borderRadius: '12px',
    overflow: 'hidden',
  }
}

export const thStyle: React.CSSProperties = { padding: '0.55rem 0.75rem', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', whiteSpace: 'nowrap' }
export const tdStyle: React.CSSProperties = { padding: '0.55rem 0.75rem', fontSize: '0.8rem', color: 'var(--text-mid)', whiteSpace: 'nowrap' }

// ── Helpers ──────────────────────────────────────────────────────────────────

export function formatLastSeen(ts: { toDate(): Date } | undefined): string {
  if (!ts) return '🕐 never'
  const d = ts.toDate()
  const diff = Date.now() - d.getTime()
  if (diff < 60_000) return '🟢 just now'
  if (diff < 3_600_000) return `🕐 ${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `🕐 ${Math.floor(diff / 3_600_000)}h ago`
  return `🕐 ${Math.floor(diff / 86_400_000)}d ago`
}

// ── Components ───────────────────────────────────────────────────────────────

export function StatCard({ label, value, icon }: { label: string; value: number; icon: string }) {
  return (
    <div style={{
      background: 'var(--bg-surface)',
      border: '1px solid var(--border)',
      borderRadius: '10px',
      padding: '0.9rem 1rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
    }}>
      <span style={{ fontSize: '1.4rem', flexShrink: 0 }}>{icon}</span>
      <div>
        <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-bright)', lineHeight: 1.1 }}>{value.toLocaleString()}</div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>{label}</div>
      </div>
    </div>
  )
}
