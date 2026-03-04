type PairRowEditorProps = {
  isMatchPlus: boolean
  matchMode: string
  pairIndex: number
  leftValue: string
  rightValue: string
  leftUploading: boolean
  rightUploading: boolean
  onChangeLeft: (value: string) => void
  onChangeRight: (value: string) => void
  onUploadLeft: () => void
  onUploadRight: () => void
}

export function PairRowEditor({
  isMatchPlus,
  matchMode,
  pairIndex,
  leftValue,
  rightValue,
  leftUploading,
  rightUploading,
  onChangeLeft,
  onChangeRight,
  onUploadLeft,
  onUploadRight,
}: PairRowEditorProps) {
  const normalizedMode = matchMode || 'image-image'
  const isPuzzleMode = normalizedMode === 'image-puzzle'
  const leftIsImage = normalizedMode === 'image-text' || normalizedMode === 'image-image'
  const rightIsImage = normalizedMode === 'image-image'
  const looksLikeImageRef = (value: string) => (
    value.startsWith('/') ||
    value.startsWith('data:image/') ||
    value.startsWith('blob:') ||
    /^https?:\/\/.+/i.test(value)
  )
  const leftInvalid = leftIsImage && leftValue.length > 0 && !looksLikeImageRef(leftValue)
  const rightInvalid = rightIsImage && rightValue.length > 0 && !looksLikeImageRef(rightValue)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '0.8rem', alignItems: 'center', background: 'var(--bg-deep)', padding: '0.4rem 0.8rem', borderRadius: '12px', border: '1.5px solid var(--border-strong)' }}>
      {isMatchPlus ? (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            {leftIsImage && !isPuzzleMode && (
              <div style={{ height: '72px', borderRadius: '10px', border: '1px solid var(--border-strong)', overflow: 'hidden', background: 'var(--bg)' }}>
                {leftValue ? (
                  <img src={leftValue} alt={`left ${pairIndex + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                ) : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>🖼️ أضف صورة</div>}
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
              <input
                value={leftValue}
                onChange={(e) => onChangeLeft(e.target.value)}
                placeholder={isPuzzleMode ? 'رقم القطعة' : (leftIsImage ? 'رابط الصورة اليسرى' : (normalizedMode === 'emoji-emoji' || normalizedMode === 'emoji-text' ? 'Emoji يسار' : 'نص يسار'))}
                disabled={isPuzzleMode}
                style={{
                  flex: 1,
                  padding: '0.5rem 0.55rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-strong)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text)',
                  fontSize: '0.82rem',
                  outline: 'none',
                }}
              />
              {leftIsImage && !isPuzzleMode && (
                <button
                  type="button"
                  onClick={onUploadLeft}
                  disabled={leftUploading}
                  style={{
                    borderRadius: '8px',
                    border: '1px solid var(--border-strong)',
                    background: leftUploading ? 'rgba(59,130,246,0.16)' : 'var(--bg-surface)',
                    color: 'var(--text)',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    padding: '0 0.55rem',
                    cursor: leftUploading ? 'not-allowed' : 'pointer',
                    minWidth: '54px',
                  }}
                >
                  {leftUploading ? '⏳' : '📁 رفع'}
                </button>
              )}
            </div>
            {!isPuzzleMode && leftIsImage && !leftValue && (
              <span style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 600 }}>الصورة اليسرى مطلوبة</span>
            )}
            {leftInvalid && (
              <span style={{ fontSize: '0.72rem', color: '#f87171', fontWeight: 600 }}>الرابط غير صالح كصورة</span>
            )}
          </div>

          <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', color: 'var(--text-mid)', fontWeight: 'bold' }}>⇄</div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
            {rightIsImage && !isPuzzleMode && (
              <div style={{ height: '72px', borderRadius: '10px', border: '1px solid var(--border-strong)', overflow: 'hidden', background: 'var(--bg)' }}>
                {rightValue ? (
                  <img src={rightValue} alt={`right ${pairIndex + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                ) : <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 700 }}>🖼️ أضف صورة</div>}
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
              <input
                value={rightValue}
                onChange={(e) => onChangeRight(e.target.value)}
                placeholder={isPuzzleMode ? 'مكان القطعة' : (rightIsImage ? 'رابط الصورة اليمنى' : (normalizedMode === 'emoji-emoji' ? 'Emoji يمين' : 'نص يمين'))}
                disabled={isPuzzleMode}
                style={{
                  flex: 1,
                  padding: '0.5rem 0.55rem',
                  borderRadius: '8px',
                  border: '1px solid var(--border-strong)',
                  background: 'var(--bg-surface)',
                  color: 'var(--text)',
                  fontSize: '0.82rem',
                  outline: 'none',
                }}
              />
              {rightIsImage && !isPuzzleMode && (
                <button
                  type="button"
                  onClick={onUploadRight}
                  disabled={rightUploading}
                  style={{
                    borderRadius: '8px',
                    border: '1px solid var(--border-strong)',
                    background: rightUploading ? 'rgba(59,130,246,0.16)' : 'var(--bg-surface)',
                    color: 'var(--text)',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                    padding: '0 0.55rem',
                    cursor: rightUploading ? 'not-allowed' : 'pointer',
                    minWidth: '54px',
                  }}
                >
                  {rightUploading ? '⏳' : '📁 رفع'}
                </button>
              )}
            </div>
            {!isPuzzleMode && rightIsImage && !rightValue && (
              <span style={{ fontSize: '0.72rem', color: '#f59e0b', fontWeight: 600 }}>الصورة اليمنى مطلوبة</span>
            )}
            {rightInvalid && (
              <span style={{ fontSize: '0.72rem', color: '#f87171', fontWeight: 600 }}>الرابط غير صالح كصورة</span>
            )}
          </div>
        </>
      ) : (
        <>
          <input
            value={leftValue}
            onChange={(e) => onChangeLeft(e.target.value)}
            placeholder="العنصر الأيمن"
            style={{
              padding: '0.5rem 0.2rem',
              background: 'transparent',
              border: 'none',
              color: 'var(--text)',
              fontSize: '0.9rem',
              outline: 'none',
              textAlign: 'center',
            }}
          />
          <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--border-strong)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', color: 'var(--text-mid)', fontWeight: 'bold' }}>⇄</div>
          <input
            value={rightValue}
            onChange={(e) => onChangeRight(e.target.value)}
            placeholder="العنصر المقابل"
            style={{
              padding: '0.5rem 0.2rem',
              background: 'transparent',
              border: 'none',
              color: 'var(--text)',
              fontSize: '0.9rem',
              outline: 'none',
              textAlign: 'center',
            }}
          />
        </>
      )}
    </div>
  )
}
