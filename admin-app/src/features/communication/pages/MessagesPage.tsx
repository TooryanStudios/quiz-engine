export function MessagesPage() {
  return (
    <section className="panel" style={{ maxWidth: 980, margin: '0 auto' }}>
      <header style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 14 }}>
        <h1 style={{ margin: 0, fontSize: '1.1rem' }}>Messages</h1>
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.82rem', lineHeight: 1.5 }}>
          This page is the dedicated workspace for channels and direct messages.
          The floating-widget model is intentionally avoided in favor of a compact, enterprise-friendly layout.
        </p>
      </header>

      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'minmax(200px, 260px) minmax(0, 1fr)' }}>
        <aside style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12, background: 'var(--bg-page)' }}>
          <strong style={{ display: 'block', marginBottom: 8, fontSize: '0.8rem' }}>Channels</strong>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 6 }}>
            <li style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}># operations</li>
            <li style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}># finance</li>
            <li style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}># hr</li>
          </ul>
        </aside>

        <div style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 12, background: 'var(--bg-page)' }}>
          <strong style={{ display: 'block', marginBottom: 8, fontSize: '0.8rem' }}>Conversation</strong>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.78rem', lineHeight: 1.6 }}>
            Chat persistence and live message streaming will be connected in the next increment using
            dedicated Firestore collections.
          </p>
        </div>
      </div>
    </section>
  )
}
