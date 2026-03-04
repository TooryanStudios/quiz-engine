type AddQuestionCtaSectionProps = {
  isMiniGameContent: boolean
  contentType: 'quiz' | 'mini-game' | 'mix'
  quizId: string | null
  questionsCount: number
  gameModeId: string
  onShowAddDialog: () => void
  onLoadSamples: () => void
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

function LoadSamplesCard({ gameModeId, onClick }: { gameModeId: string; onClick: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: gameModeId === 'match-plus-arena' ? 'none' : 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '1rem',
        padding: '2.5rem',
        borderRadius: '16px',
        border: '2px dashed var(--border-strong)',
        backgroundColor: 'rgba(16, 185, 129, 0.06)',
        color: 'var(--text-mid)',
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        animation: 'slideUp 0.55s ease-out',
      }}
      onMouseEnter={(event) => {
        event.currentTarget.style.borderColor = '#10b981'
        event.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.12)'
        event.currentTarget.style.transform = 'scale(1.01)'
      }}
      onMouseLeave={(event) => {
        event.currentTarget.style.borderColor = 'var(--border-strong)'
        event.currentTarget.style.backgroundColor = 'rgba(16, 185, 129, 0.06)'
        event.currentTarget.style.transform = 'scale(1)'
      }}
    >
      <div style={{
        width: '48px',
        height: '48px',
        borderRadius: '50%',
        backgroundColor: '#10b981',
        color: '#fff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '1.45rem',
        boxShadow: '0 4px 15px rgba(16, 185, 129, 0.35)',
      }}>🧪</div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.3rem' }}>
        <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-bright)' }}>تحميل عينات جاهزة</span>
        <span style={{ fontSize: '0.82rem', opacity: 0.75 }}>ابدأ بسرعة بقالب أسئلة متكامل وجاهز للتعديل</span>
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
  onLoadSamples,
}: AddQuestionCtaSectionProps) {
  if (contentType === 'mix') return null

  const isFirstEmptyState = !isMiniGameContent && !quizId && questionsCount === 0

  if (isFirstEmptyState) {
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
        gap: '1rem',
        marginBottom: '3rem',
      }}>
        <AddQuestionCard gameModeId={gameModeId} onClick={onShowAddDialog} />
        <LoadSamplesCard gameModeId={gameModeId} onClick={onLoadSamples} />
      </div>
    )
  }

  return (
    <div style={{ marginBottom: '3rem' }}>
      <AddQuestionCard gameModeId={gameModeId} onClick={onShowAddDialog} />
    </div>
  )
}