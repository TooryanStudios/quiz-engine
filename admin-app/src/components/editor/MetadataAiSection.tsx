type MetadataAiSectionProps = {
  onOpenAiDialog: () => void
}

export function MetadataAiSection({
  onOpenAiDialog,
}: MetadataAiSectionProps) {
  return (
    <div style={{
      marginTop: '1rem',
    }}>
      <button
        type="button"
        onClick={onOpenAiDialog}
        style={{
          width: '100%',
          padding: '1rem 1.5rem',
          borderRadius: '12px',
          border: '1px solid rgba(124, 58, 237, 0.3)',
          background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
          color: 'var(--text-bright)',
          fontSize: '1rem',
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.6rem',
          transition: 'all 0.2s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(124, 58, 237, 0.15) 0%, rgba(59, 130, 246, 0.15) 100%)'
          e.currentTarget.style.transform = 'translateY(-1px)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)'
          e.currentTarget.style.transform = 'translateY(0)'
        }}
      >
        <span style={{ fontSize: '1.2em' }}>✨</span>
        <span>إنشاء الأسئلة بالذكاء الاصطناعي</span>
      </button>
    </div>
  )
}
