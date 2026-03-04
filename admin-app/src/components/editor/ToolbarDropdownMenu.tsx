type ToolbarDropdownMenuProps = {
  quizId: string | null
  questionsCount: number
  onClose: () => void
  onOpenMetadata: () => void
  onCollapseAll: () => void
  onExpandAll: () => void
  onPreviewQuiz: () => void
  onCopyLink: () => void
  onShareLink: () => void
  onDeleteQuiz: () => void
}

export function ToolbarDropdownMenu({
  quizId,
  questionsCount,
  onClose,
  onOpenMetadata,
  onCollapseAll,
  onExpandAll,
  onPreviewQuiz,
  onCopyLink,
  onShareLink,
  onDeleteQuiz,
}: ToolbarDropdownMenuProps) {
  const hasQuestions = questionsCount > 0
  const hasQuiz = !!quizId

  return (
    <div style={{
      position: 'absolute',
      top: 'calc(100% + 6px)',
      left: 0,
      minWidth: '220px',
      maxWidth: '90vw',
      background: 'var(--bg-deep)',
      border: '1px solid var(--border-strong)',
      borderRadius: '12px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.45)',
      zIndex: 200,
      overflow: 'hidden',
      animation: 'slideUp 0.15s ease-out',
    }}>
      <button
        type="button"
        onClick={() => { onOpenMetadata(); onClose() }}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.75rem 1rem', background: 'transparent', border: 'none', color: 'var(--text)', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700, borderBottom: '1px solid var(--border-strong)' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-surface)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
      >⚙️ <span>إعدادات الاختبار</span></button>

      <div style={{ padding: '0.4rem 1rem 0.2rem', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>الأسئلة</div>

      <button
        type="button"
        onClick={() => { onCollapseAll(); onClose() }}
        disabled={!hasQuestions}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.65rem 1rem', background: 'transparent', border: 'none', color: hasQuestions ? 'var(--text)' : 'var(--text-muted)', cursor: hasQuestions ? 'pointer' : 'not-allowed', fontSize: '0.88rem', fontWeight: 600, opacity: hasQuestions ? 1 : 0.45 }}
        onMouseEnter={(e) => { if (hasQuestions) e.currentTarget.style.background = 'var(--bg-surface)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
      >▾ <span>طي جميع الأسئلة</span></button>

      <button
        type="button"
        onClick={() => { onExpandAll(); onClose() }}
        disabled={!hasQuestions}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.65rem 1rem', background: 'transparent', border: 'none', color: hasQuestions ? 'var(--text)' : 'var(--text-muted)', cursor: hasQuestions ? 'pointer' : 'not-allowed', fontSize: '0.88rem', fontWeight: 600, opacity: hasQuestions ? 1 : 0.45, borderBottom: '1px solid var(--border-strong)' }}
        onMouseEnter={(e) => { if (hasQuestions) e.currentTarget.style.background = 'var(--bg-surface)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
      >▴ <span>فتح جميع الأسئلة</span></button>

      <div style={{ padding: '0.4rem 1rem 0.2rem', fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.6px' }}>الرابط</div>

      {hasQuiz && (
        <button
          type="button"
          onClick={() => { onPreviewQuiz(); onClose() }}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.65rem 1rem', background: 'transparent', border: 'none', color: 'var(--text)', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 600 }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-surface)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
        >👁️ <span>معاينة الاختبار</span></button>
      )}

      <button
        type="button"
        onClick={() => { onCopyLink(); onClose() }}
        disabled={!hasQuiz}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.65rem 1rem', background: 'transparent', border: 'none', color: hasQuiz ? 'var(--text)' : 'var(--text-muted)', cursor: hasQuiz ? 'pointer' : 'not-allowed', fontSize: '0.88rem', fontWeight: 600, opacity: hasQuiz ? 1 : 0.45 }}
        onMouseEnter={(e) => { if (hasQuiz) e.currentTarget.style.background = 'var(--bg-surface)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
      >📋 <span>نسخ الرابط</span></button>

      <button
        type="button"
        onClick={() => { onShareLink(); onClose() }}
        disabled={!hasQuiz}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.65rem 1rem', background: 'transparent', border: 'none', color: hasQuiz ? 'var(--text)' : 'var(--text-muted)', cursor: hasQuiz ? 'pointer' : 'not-allowed', fontSize: '0.88rem', fontWeight: 600, opacity: hasQuiz ? 1 : 0.45 }}
        onMouseEnter={(e) => { if (hasQuiz) e.currentTarget.style.background = 'var(--bg-surface)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
      >🔗 <span>مشاركة الرابط</span></button>

      {hasQuiz && (
        <>
          <div style={{ height: '1px', background: 'var(--border-strong)', margin: '0.25rem 0' }} />
          <button
            type="button"
            onClick={() => { onClose(); onDeleteQuiz() }}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.65rem', padding: '0.75rem 1rem', background: 'transparent', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '0.88rem', fontWeight: 700 }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(248,113,113,0.1)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          >🗑️ <span>حذف الاختبار</span></button>
        </>
      )}
    </div>
  )
}
