type EditorHeroTitleInputProps = {
  isNarrowScreen: boolean
  title: string
  onTitleChange: (value: string) => void
}

export function EditorHeroTitleInput({
  isNarrowScreen,
  title,
  onTitleChange,
}: EditorHeroTitleInputProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: isNarrowScreen ? 'center' : 'flex-end', gap: '0.5rem', marginBottom: '0.5rem' }}>
      <input
        dir="auto"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder="عنوان الاختبار..."
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-bright)',
          fontSize: isNarrowScreen ? '1.5rem' : '2.2rem',
          fontWeight: 900,
          width: '100%',
          textAlign: isNarrowScreen ? 'center' : 'right',
          outline: 'none',
          padding: 0,
        }}
      />
      <span
        style={{
          fontSize: isNarrowScreen ? '0.9rem' : '1.1rem',
          color: 'var(--text-muted)',
          opacity: 0.55,
          flexShrink: 0,
          pointerEvents: 'none',
          lineHeight: 1,
        }}
        title="قابل للتعديل"
      >✏️</span>
    </div>
  )
}
