type MatchPlusPairSettingsProps = {
  matchPlusMode: string
  matchPlusImage: string
  matchPlusGridSize: number
  onModeChange: (value: string) => void
  onImageChange: (value: string) => void
  onGridSizeChange: (value: number) => void
  onUploadImage: () => void
}

export function MatchPlusPairSettings({
  matchPlusMode,
  matchPlusImage,
  matchPlusGridSize,
  onModeChange,
  onImageChange,
  onGridSizeChange,
  onUploadImage,
}: MatchPlusPairSettingsProps) {
  const currentMode = matchPlusMode || 'image-image'

  return (
    <div style={{ marginBottom: '0.75rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.65rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700 }}>النمط</span>
        <select
          value={currentMode}
          onChange={(e) => onModeChange(e.target.value)}
          style={{
            padding: '0.5rem 0.6rem',
            borderRadius: '8px',
            border: '1px solid var(--border-strong)',
            background: 'var(--bg-surface)',
            color: 'var(--text)',
            fontSize: '0.82rem',
            outline: 'none',
          }}
        >
          <option value="emoji-emoji">Emoji → Emoji</option>
          <option value="emoji-text">Emoji → Text</option>
          <option value="image-text">Image → Text</option>
          <option value="image-image">Image → Image</option>
          <option value="image-puzzle">Image Puzzle</option>
        </select>
      </div>

      {currentMode === 'image-puzzle' && (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700 }}>صورة البازل</span>
            <div style={{ display: 'flex', gap: '0.35rem' }}>
              <input
                value={matchPlusImage}
                onChange={(e) => onImageChange(e.target.value)}
                placeholder="رابط الصورة الكاملة"
                style={{
                  flex: 1,
                  padding: '0.5rem 0.6rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-strong)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text)',
                  fontSize: '0.82rem',
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={onUploadImage}
                style={{
                  borderRadius: '8px',
                  border: '1px solid var(--border-strong)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text)',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  padding: '0 0.8rem',
                  cursor: 'pointer',
                }}
              >
                📁 رفع
              </button>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 700 }}>حجم الشبكة</span>
            <select
              value={String(matchPlusGridSize || 3)}
              onChange={(e) => onGridSizeChange(Number(e.target.value))}
              style={{
                padding: '0.5rem 0.6rem',
                borderRadius: '8px',
                border: '1px solid var(--border-strong)',
                background: 'var(--bg-surface)',
                color: 'var(--text)',
                fontSize: '0.82rem',
                outline: 'none',
              }}
            >
              <option value="2">2 × 2</option>
              <option value="3">3 × 3</option>
              <option value="4">4 × 4</option>
            </select>
          </div>
        </>
      )}
    </div>
  )
}
