type MetadataDialogFooterProps = {
  loading: boolean
  metadataChecking: boolean
  coverPreviewChecking: boolean
  onCancel: () => void
  onSave: () => void
}

export function MetadataDialogFooter({
  loading,
  metadataChecking,
  coverPreviewChecking,
  onCancel,
  onSave,
}: MetadataDialogFooterProps) {
  return (
    <div style={{
      display: 'flex',
      gap: '0.65rem',
      justifyContent: 'flex-end',
      padding: '0.9rem 1.2rem 1rem',
      borderTop: '1px solid var(--border)',
      background: 'linear-gradient(0deg, var(--bg-surface) 0%, var(--bg-deep) 100%)',
      position: 'sticky',
      bottom: 0,
      zIndex: 2,
    }}>
      {!loading && (
        <button
          onClick={onCancel}
          disabled={metadataChecking}
          style={{
            padding: '0.65rem 1.25rem',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: 'var(--bg-surface)',
            color: 'var(--text)',
            cursor: metadataChecking ? 'not-allowed' : 'pointer',
            opacity: metadataChecking ? 0.6 : 1,
            fontSize: '1em',
          }}
        >
          إلغاء
        </button>
      )}
      <button
        onClick={onSave}
        disabled={metadataChecking || coverPreviewChecking}
        style={{
          padding: '0.65rem 1.25rem',
          borderRadius: '8px',
          border: 'none',
          background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
          color: '#fff',
          cursor: metadataChecking || coverPreviewChecking ? 'not-allowed' : 'pointer',
          opacity: metadataChecking || coverPreviewChecking ? 0.6 : 1,
          fontSize: '1em',
        }}
      >
        {metadataChecking ? '⏳ جارٍ الحفظ...' : coverPreviewChecking ? '🖼️ جارٍ تجهيز الصورة...' : 'موافق'}
      </button>
    </div>
  )
}
