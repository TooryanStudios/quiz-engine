type QuestionMenuDialogContentProps = {
  collapsed: boolean
  onToggle: () => void
  onDelete: () => void
}

export function QuestionMenuDialogContent({
  collapsed,
  onToggle,
  onDelete,
}: QuestionMenuDialogContentProps) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '1rem' }}>
      <button
        onClick={onToggle}
        style={{
          padding: '1rem',
          background: 'var(--bg-deep)',
          color: 'var(--text)',
          border: '1px solid var(--border-strong)',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        <span>{collapsed ? 'توسيع السؤال' : 'طي السؤال'}</span>
        <span>{collapsed ? '▾' : '▴'}</span>
      </button>

      <button
        onClick={onDelete}
        style={{
          padding: '1rem',
          background: 'rgba(239, 68, 68, 0.1)',
          color: '#ef4444',
          border: '1px solid rgba(239, 68, 68, 0.2)',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        <span>حذف السؤال</span>
        <span>🗑️</span>
      </button>
    </div>
  )
}
