type AddQuestionCtaSectionProps = {
  isMiniGameContent: boolean
  contentType: 'quiz' | 'mini-game' | 'mix'
  quizId: string | null
  questionsCount: number
  gameModeId: string
  onShowAddDialog: () => void
  onShowAiDialog: () => void
  isGeneratingAi?: boolean
}

function AddQuestionCard({ gameModeId, onClick }: { gameModeId: string; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        padding: '2.5rem',
        borderRadius: '16px',
        border: '2px dashed var(--border-strong)',
        backgroundColor: 'rgba(59, 130, 246, 0.05)',
        color: 'var(--text-mid)',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        animation: 'slideUp 0.6s ease-out',
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.borderColor = 'var(--text-bright)'
        event.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'
        event.currentTarget.style.transform = 'scale(1.01)'
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.borderColor = 'var(--border-strong)'
        event.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.05)'
        event.currentTarget.style.transform = 'scale(1)'
      }}
    >
      <div style={{
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        backgroundColor: 'var(--text-bright)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.8rem',
        boxShadow: '0 4px 15px rgba(59, 130, 246, 0.4)',
      }}>+</div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
        <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-bright)' }}>
          {gameModeId === 'match-plus-arena' ? 'إضافة بازل جديد' : 'إضافة سؤال جديد'}
        </span>
        <span style={{ fontSize: '0.82rem', opacity: 0.7 }}>
          {gameModeId === 'match-plus-arena' ? 'أضف صورة جديدة ليقوم اللاعب بحلها' : 'اختر من بين 6 أنواع مختلفة من الأسئلة'}
        </span>
      </div>
    </div>
  )
}

function AiQuestionCard({ onClick, isGenerating }: { onClick: () => void; isGenerating?: boolean }) {
  return (
    <div
      onClick={isGenerating ? undefined : onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        padding: '2.5rem',
        borderRadius: '16px',
        border: '2px dashed rgba(124, 58, 237, 0.45)',
        background: 'linear-gradient(135deg, rgba(124,58,237,0.12), rgba(219,39,119,0.15))',
        color: 'var(--text-bright)',
        cursor: isGenerating ? 'not-allowed' : 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        animation: 'slideUp 0.6s ease-out',
        opacity: isGenerating ? 0.8 : 1,
      }}
      onMouseEnter={(event) => {
        if (isGenerating) return
        event.currentTarget.style.borderColor = 'rgba(219,39,119,0.8)'
        event.currentTarget.style.transform = 'scale(1.01)'
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.borderColor = 'rgba(124, 58, 237, 0.45)'
        event.currentTarget.style.transform = 'scale(1)'
      }}
    >
      <div style={{
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        background: 'linear-gradient(135deg, #7c3aed, #db2777)',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.8rem',
        boxShadow: '0 6px 18px rgba(124, 58, 237, 0.45)',
      }}>✨</div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem', textAlign: 'center' }}>
        <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>
          {isGenerating ? '⏳ يتم التوليد...' : 'إنشاء سؤال بالذكاء الاصطناعي'}
        </span>
        <span style={{ fontSize: '0.82rem', opacity: 0.8, color: 'var(--text-mid)' }}>
          حرّر وصفًا قصيرًا ودع الذكاء الاصطناعي يقترح الأسئلة والإجابات
        </span>
      </div>
    </div>
  )
}

export function AddQuestionCtaSection({
  isMiniGameContent,
  contentType,
  quizId,
  questionsCount,
  gameModeId,
  onShowAddDialog,
  onShowAiDialog,
  isGeneratingAi,
}: AddQuestionCtaSectionProps) {
  if (contentType === 'mix') return null

  const isFirstEmptyState = !isMiniGameContent && !quizId && questionsCount === 0

  if (isFirstEmptyState) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '3rem',
      }}>
        <div style={{
          width: '100%',
          maxWidth: 780,
          display: 'grid',
          gap: '1.25rem',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        }}>
          <AddQuestionCard gameModeId={gameModeId} onClick={onShowAddDialog} />
          <AiQuestionCard onClick={onShowAiDialog} isGenerating={isGeneratingAi} />
        </div>
      </div>
    )
  }

  return (
    <div style={{ marginBottom: '3rem' }}>
      <AddQuestionCard gameModeId={gameModeId} onClick={onShowAddDialog} />
    </div>
  )
}