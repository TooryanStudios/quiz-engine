type QuestionTextRowProps = {
  text: string
  onTextChange: (value: string) => void
}

export function QuestionTextRow({
  text,
  onTextChange,
}: QuestionTextRowProps) {
  return (
    <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.2rem', alignItems: 'flex-start' }}>
      <div style={{ flex: 1 }}>
        <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.4rem', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>نص السؤال</label>
        <div style={{ display: 'flex', gap: '0', background: 'var(--bg-deep)', borderRadius: '8px', border: '1px solid var(--border-strong)', overflow: 'hidden', transition: 'border-color 0.2s' }}>
          <input
            dir="auto"
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            placeholder="اكتب السؤال هنا..."
            style={{
              flex: 1,
              padding: '0.65rem 0.85rem',
              border: 'none',
              background: 'transparent',
              color: 'var(--text)',
              fontSize: '1rem',
              outline: 'none',
            }}
          />
          <button
            type="button"
            onClick={async () => {
              try {
                const clipboardText = await navigator.clipboard.readText()
                if (clipboardText) onTextChange(clipboardText)
              } catch (error) {
                console.error('Failed to read clipboard', error)
              }
            }}
            style={{
              padding: '0 0.85rem',
              border: 'none',
              borderLeft: '1px solid var(--border-strong)',
              background: 'rgba(59, 130, 246, 0.05)',
              color: 'var(--text-bright)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1rem',
            }}
            title="لصق النص"
          >
            📋
          </button>
        </div>
      </div>
    </div>
  )
}
