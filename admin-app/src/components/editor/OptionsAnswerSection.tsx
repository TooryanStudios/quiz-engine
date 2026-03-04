import type { QuizQuestion } from '../../types/quiz'

type OptionsAnswerSectionProps = {
  question: QuizQuestion
  optionMin: number
  isMultiSelectOptions: boolean
  sectionLabel: string
  modeLabel: string
  onUpdateQuestion: (patch: Partial<QuizQuestion>) => void
}

export function OptionsAnswerSection({
  question,
  optionMin,
  isMultiSelectOptions,
  sectionLabel,
  modeLabel,
  onUpdateQuestion,
}: OptionsAnswerSectionProps) {
  return (
    <div style={{ marginBottom: '1.2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.6rem' }}>
        <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>{sectionLabel}</label>
        <span style={{ fontSize: '0.65rem', color: 'var(--text-mid)', fontWeight: 500 }}>{modeLabel}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1rem' }}>
        {(question.options || []).map((opt, optIndex) => {
          const isCorrectSingle = question.correctIndex === optIndex
          const isCorrectMulti = (question.correctIndices || []).includes(optIndex)
          const isCorrect = isMultiSelectOptions ? isCorrectMulti : isCorrectSingle

          return (
            <div
              key={optIndex}
              className="option-card"
              style={{
                display: 'flex',
                gap: '0.8rem',
                alignItems: 'center',
                padding: '0.6rem 1rem',
                borderRadius: '12px',
                border: `2px solid ${isCorrect ? 'var(--accent)' : 'var(--border-strong)'}`,
                backgroundColor: isCorrect ? 'rgba(37, 99, 235, 0.08)' : 'var(--bg-deep)',
                boxShadow: isCorrect ? '0 0 15px rgba(37, 99, 235, 0.2)' : 'none',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                onClick={() => {
                  if (isMultiSelectOptions) {
                    const prev = new Set(question.correctIndices || [])
                    if (isCorrect) prev.delete(optIndex)
                    else prev.add(optIndex)
                    onUpdateQuestion({ correctIndices: [...prev].sort((a, b) => a - b) })
                  } else {
                    onUpdateQuestion({ correctIndex: optIndex })
                  }
                }}
                style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '50%',
                  border: `2px solid ${isCorrect ? 'var(--accent)' : 'var(--text-muted)'}`,
                  backgroundColor: isCorrect ? 'var(--accent)' : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#fff',
                  fontSize: '0.8rem',
                  boxShadow: isCorrect ? '0 2px 6px rgba(37, 99, 235, 0.4)' : 'none',
                  transition: 'all 0.2s',
                }}
              >
                {isCorrect && '✓'}
              </div>

              <input
                dir="auto"
                value={opt}
                onChange={(e) => {
                  const next = [...(question.options || [])]
                  next[optIndex] = e.target.value
                  onUpdateQuestion({ options: next })
                }}
                placeholder={`الخيار ${optIndex + 1}...`}
                style={{
                  flex: 1,
                  padding: '0.4rem 0',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text)',
                  fontSize: '1rem',
                  outline: 'none',
                  fontWeight: 500,
                }}
              />

              <button
                type="button"
                onClick={() => {
                  const next = [...(question.options || [])]
                  next.splice(optIndex, 1)
                  if (isMultiSelectOptions) {
                    const newIndices = (question.correctIndices || [])
                      .filter(i => i !== optIndex)
                      .map(i => i > optIndex ? i - 1 : i)
                    onUpdateQuestion({ options: next, correctIndices: newIndices })
                  } else {
                    const newIdx = question.correctIndex === optIndex ? 0 : (question.correctIndex! > optIndex ? question.correctIndex! - 1 : question.correctIndex)
                    onUpdateQuestion({ options: next, correctIndex: newIdx })
                  }
                }}
                style={{
                  padding: '0.2rem',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  opacity: (question.options || []).length > optionMin ? 0.6 : 0,
                }}
                disabled={(question.options || []).length <= optionMin}
                title="حذف الخيار"
              >
                ✕
              </button>
            </div>
          )
        })}

        <button
          type="button"
          onClick={() => {
            const next = [...(question.options || []), 'خيار جديد']
            onUpdateQuestion({ options: next })
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            padding: '0.6rem 1rem',
            borderRadius: '12px',
            border: '2px dashed var(--border-strong)',
            backgroundColor: 'rgba(59, 130, 246, 0.03)',
            color: 'var(--text-mid)',
            fontSize: '0.95rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--text-bright)'
            e.currentTarget.style.color = 'var(--text-bright)'
            e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.08)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-strong)'
            e.currentTarget.style.color = 'var(--text-mid)'
            e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.03)'
          }}
        >
          <span style={{ fontSize: '1.2rem' }}>+</span> إضافة خيار
        </button>
      </div>
    </div>
  )
}
