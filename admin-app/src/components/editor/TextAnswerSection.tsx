import type { QuizQuestion } from '../../types/quiz'

type TextAnswerSectionProps = {
  sectionLabel: string
  question: QuizQuestion
  onUpdateQuestion: (patch: Partial<QuizQuestion>) => void
}

export function TextAnswerSection({
  sectionLabel,
  question,
  onUpdateQuestion,
}: TextAnswerSectionProps) {
  return (
    <div style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>
        {sectionLabel}
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-mid)', fontWeight: 600 }}>نص التلميح</label>
          <input
            value={question.inputPlaceholder || ''}
            onChange={(e) => onUpdateQuestion({ inputPlaceholder: e.target.value })}
            placeholder="مثال: أدخل العاصمة هنا..."
            style={{
              padding: '0.7rem 0.95rem',
              borderRadius: '10px',
              border: '1.5px solid var(--border-strong)',
              backgroundColor: 'var(--bg-deep)',
              color: 'var(--text)',
              fontSize: '0.9rem',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-mid)', fontWeight: 600 }}>الإجابات الصحيحة (فاصلة)</label>
          <input
            value={(question.acceptedAnswers || []).join(', ')}
            onChange={(e) => {
              const values = e.target.value.split(',').map((v) => v.trim()).filter(Boolean)
              onUpdateQuestion({ acceptedAnswers: values })
            }}
            placeholder="إجابة 1, إجابة 2"
            style={{
              padding: '0.7rem 0.95rem',
              borderRadius: '10px',
              border: '1.5px solid var(--border-strong)',
              backgroundColor: 'var(--bg-deep)',
              color: 'var(--text)',
              fontSize: '0.9rem',
              outline: 'none',
            }}
          />
        </div>
      </div>
    </div>
  )
}
