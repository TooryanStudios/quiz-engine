type MetadataBasicInfoSectionProps = {
  title: string
  shareUrl: string
  onTitleChange: (value: string) => void
  onCopyShareUrl: () => void
  onShareUrl: () => void
}

export function MetadataBasicInfoSection({
  title,
  shareUrl,
  onTitleChange,
  onCopyShareUrl,
  onShareUrl,
}: MetadataBasicInfoSectionProps) {
  return (
    <>
      <div>
        <label style={{ fontSize: '0.9em', color: 'var(--text-mid)', display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>اسم الاختبار</label>
        <input
          type="text"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder="مثلاً: اختبار الحيوانات"
          style={{
            width: '100%',
            padding: '0.75rem',
            borderRadius: '8px',
            border: '1px solid var(--border-strong)',
            backgroundColor: 'var(--bg-surface)',
            color: 'var(--text)',
            boxSizing: 'border-box',
            fontSize: '1em',
          }}
        />
      </div>

      <div>
        <label style={{ fontSize: '0.9em', color: 'var(--text-mid)', display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>رابط المشاركة (URL)</label>
        <div style={{
          border: '1px solid var(--border-strong)',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: '8px',
          padding: '0.7rem 0.8rem',
          color: 'var(--text)',
          fontSize: '0.92em',
          wordBreak: 'break-all',
        }}>
          {shareUrl}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.55rem' }}>
          <button
            type="button"
            onClick={onCopyShareUrl}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              border: '1px solid var(--border-strong)',
              background: 'var(--bg-surface)',
              color: 'var(--text)',
              cursor: 'pointer',
              fontSize: '0.82em',
              fontWeight: 600,
            }}
          >
            📋 نسخ الرابط
          </button>
          <button
            type="button"
            onClick={onShareUrl}
            style={{
              padding: '0.45rem 0.85rem',
              borderRadius: '8px',
              border: 'none',
              background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '0.82em',
              fontWeight: 700,
            }}
          >
            🔗 مشاركة
          </button>
        </div>
        <p style={{ marginTop: '0.4rem', fontSize: '0.8em', color: 'var(--text-mid)' }}>
          يتم إنشاء الرابط تلقائيًا بواسطة النظام لضمان التفرد والثبات.
        </p>
      </div>
    </>
  )
}