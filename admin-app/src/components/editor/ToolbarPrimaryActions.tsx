type ToolbarPrimaryActionsProps = {
  isMiniGameContent: boolean
  isNarrowScreen: boolean
  isSaving: boolean
  hasUnsavedChanges: boolean
  onAddQuestion: () => void
  onGenerateAI: () => void
  onRecheckAI: () => void
  onSave: () => void
}

export function ToolbarPrimaryActions({
  isMiniGameContent,
  isNarrowScreen,
  isSaving,
  hasUnsavedChanges,
  onAddQuestion,
  onGenerateAI,
  onRecheckAI,
  onSave,
}: ToolbarPrimaryActionsProps) {
  return (
    <>
      {!isMiniGameContent && (
        <button
          type="button"
          onClick={onAddQuestion}
          style={{
            background: 'var(--accent)', border: '1px solid var(--accent)', color: '#fff',
            padding: isNarrowScreen ? '0.4rem 0.5rem' : '0.42rem 0.78rem', borderRadius: '8px', fontWeight: 700,
            cursor: 'pointer', transition: 'all 0.16s ease',
            display: 'flex', flexDirection: isNarrowScreen ? 'column' : 'row',
            alignItems: 'center', gap: isNarrowScreen ? '0.15rem' : '0.3rem',
            minWidth: isNarrowScreen ? '48px' : 'auto', flexShrink: 0,
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)' }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)' }}
          title="إضافة سؤال جديد"
        >
          <span style={{ fontSize: isNarrowScreen ? '1.3rem' : '0.9rem' }}>➕</span>
          <span style={{ fontSize: isNarrowScreen ? '0.58rem' : '0.8rem', fontWeight: 700 }}>إضافة</span>
        </button>
      )}

      <button
        type="button"
        onClick={onGenerateAI}
        style={{
          background: 'transparent', border: '1px solid transparent', color: 'var(--text)',
          padding: isNarrowScreen ? '0.4rem 0.5rem' : '0.42rem 0.72rem', borderRadius: '8px', fontWeight: 700,
          cursor: 'pointer', transition: 'all 0.16s ease',
          display: 'flex', flexDirection: isNarrowScreen ? 'column' : 'row',
          alignItems: 'center', gap: isNarrowScreen ? '0.15rem' : '0.3rem',
          minWidth: isNarrowScreen ? '48px' : 'auto', flexShrink: 0,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--text-bright)'; e.currentTarget.style.background = 'rgba(59,130,246,0.1)' }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'transparent' }}
        title="توليد ذكي"
      >
        <span style={{ fontSize: isNarrowScreen ? '1.3rem' : '0.9rem' }}>✨</span>
        <span style={{ fontSize: isNarrowScreen ? '0.58rem' : '0.8rem', fontWeight: 700 }}>توليد ذكي</span>
      </button>

      <button
        type="button"
        onClick={onRecheckAI}
        style={{
          background: 'transparent', border: '1px solid transparent', color: 'var(--text)',
          padding: isNarrowScreen ? '0.4rem 0.5rem' : '0.42rem 0.72rem', borderRadius: '8px', fontWeight: 700,
          cursor: 'pointer', transition: 'all 0.16s ease',
          display: 'flex', flexDirection: isNarrowScreen ? 'column' : 'row',
          alignItems: 'center', gap: isNarrowScreen ? '0.15rem' : '0.3rem',
          minWidth: isNarrowScreen ? '48px' : 'auto', flexShrink: 0,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--text-bright)'; e.currentTarget.style.background = 'rgba(59,130,246,0.1)' }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'transparent' }}
        title="تدقيق ذكي"
      >
        <span style={{ fontSize: isNarrowScreen ? '1.3rem' : '0.9rem' }}>🛡️</span>
        <span style={{ fontSize: isNarrowScreen ? '0.58rem' : '0.8rem', fontWeight: 700 }}>تدقيق</span>
      </button>

      <div style={{ flex: 1 }} />

      <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <button
          type="button"
          onClick={onSave}
          disabled={isSaving}
          onMouseEnter={(e) => {
            if (!isSaving) {
              (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-1px)'
            }
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'
          }}
          style={{
            background: hasUnsavedChanges ? 'var(--text-bright)' : 'rgba(59,130,246,0.16)',
            border: '1px solid var(--text-bright)',
            color: hasUnsavedChanges ? '#fff' : 'var(--text-bright)',
            padding: isNarrowScreen ? '0.4rem 0.5rem' : '0.42rem 0.8rem',
            borderRadius: '8px', fontWeight: 700,
            cursor: isSaving ? 'not-allowed' : 'pointer',
            opacity: isSaving ? 0.6 : 1,
            transition: 'all 0.16s ease',
            display: 'flex', flexDirection: isNarrowScreen ? 'column' : 'row',
            alignItems: 'center', gap: isNarrowScreen ? '0.15rem' : '0.3rem',
            minWidth: isNarrowScreen ? '48px' : 'auto',
          }}
          title={hasUnsavedChanges ? 'حفظ التغييرات' : 'لا توجد تغييرات'}
        >
          <span style={{ fontSize: isNarrowScreen ? '1.3rem' : '0.9rem' }}>
            {isSaving ? <span className="save-icon-spinning">🔄</span> : '💾'}
          </span>
          <span style={{ fontSize: isNarrowScreen ? '0.58rem' : '0.8rem', fontWeight: 700 }}>حفظ</span>
        </button>
      </div>
    </>
  )
}
