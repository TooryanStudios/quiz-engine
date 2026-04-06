// Finance Tab Component
export function FinanceTab() {
  return (
    <div className="master-tab-content">
      <div className="master-header">
        <h2 className="master-title">Financial Hub</h2>
        <div className="master-actions">
           <button className="master-btn is-primary">+ New Budget</button>
        </div>
      </div>
      <div style={{ marginTop: '24px', color: 'var(--text-secondary)' }}>
        <p>Finance dashboard layout is active here.</p>
        <p>Secure budgeting capabilities will be populated here.</p>
      </div>
    </div>
  )
}
