type VisibilityState = 'public' | 'private'
type ApprovalState = 'pending' | 'approved' | 'rejected' | undefined

type EditorHeroActionsProps = {
  isNarrowScreen: boolean
  pureQuestionsCount: number
  miniGameBlocksCount: number
  visibility: VisibilityState
  approvalStatus: ApprovalState
  quizId: string | null
  onOpenMetadata: () => void
  onPlayQuiz: (quizId: string) => void
}

export function EditorHeroActions({
  isNarrowScreen,
  pureQuestionsCount,
  miniGameBlocksCount,
  visibility,
  approvalStatus,
  quizId,
  onOpenMetadata,
  onPlayQuiz,
}: EditorHeroActionsProps) {
  const visibilityLabel =
    visibility === 'public'
      ? '🌐 عام'
      : approvalStatus === 'pending'
        ? '🕐 في انتظار الموافقة'
        : approvalStatus === 'rejected'
          ? '❌ مرفوض'
          : '🔒 خاص'

  return (
    <>
      <div
        dir="auto"
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-mid)',
          fontSize: '0.95rem',
          width: '100%',
          textAlign: isNarrowScreen ? 'center' : 'right',
          marginBottom: '1rem',
          minHeight: '1.2em',
          lineHeight: 1.5,
          cursor: 'pointer',
        }}
        onClick={onOpenMetadata}
      >
        📊 {pureQuestionsCount} سؤال {miniGameBlocksCount > 0 ? `• 🎮 ${miniGameBlocksCount} ميني جيم` : ''} • {visibilityLabel}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flexWrap: 'wrap', justifyContent: isNarrowScreen ? 'center' : 'flex-end' }}>
        {quizId && (
          <button
            type="button"
            onClick={() => onPlayQuiz(quizId)}
            style={{
              background: 'linear-gradient(135deg, #16a34a, #22c55e)',
              color: '#fff',
              fontSize: isNarrowScreen ? '0.85rem' : '1rem',
              padding: isNarrowScreen ? '0 20px' : '0 24px',
              height: isNarrowScreen ? '42px' : '44px',
              borderRadius: '12px',
              border: '1px solid #15803d',
              fontWeight: 800,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              boxShadow: '0 10px 22px rgba(34,197,94,0.35)',
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)'
              e.currentTarget.style.boxShadow = '0 14px 26px rgba(34,197,94,0.42)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 10px 22px rgba(34,197,94,0.35)'
            }}
          >
            <span style={{ fontSize: '1.1rem' }}>▶</span> {isNarrowScreen ? 'تشغيل اللعبة' : 'لعب الاختبار الآن'}
          </button>
        )}

        <button
          type="button"
          onClick={onOpenMetadata}
          style={{
            background: 'rgba(255,255,255,0.05)',
            color: 'var(--text-bright)',
            fontSize: isNarrowScreen ? '0.85rem' : '0.9rem',
            padding: isNarrowScreen ? '0 20px' : '0 20px',
            height: isNarrowScreen ? '42px' : '44px',
            borderRadius: '12px',
            border: '1px solid var(--border-strong)',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)' }}
        >
          ⚙️ الإعدادات
        </button>
      </div>
    </>
  )
}
