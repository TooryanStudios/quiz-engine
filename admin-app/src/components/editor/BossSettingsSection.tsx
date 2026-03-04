import type { QuizQuestion } from '../../types/quiz'

type BossSettingsSectionProps = {
  sectionLabel: string
  question: QuizQuestion
  onUpdateQuestion: (patch: Partial<QuizQuestion>) => void
}

export function BossSettingsSection({
  sectionLabel,
  question,
  onUpdateQuestion,
}: BossSettingsSectionProps) {
  return (
    <div style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>
        {sectionLabel}
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-mid)', fontWeight: 600 }}>اسم الزعيم</label>
          <input
            value={question.bossName || ''}
            onChange={(e) => onUpdateQuestion({ bossName: e.target.value })}
            placeholder="سيد التحدي"
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <label style={{ fontSize: '0.8rem', color: 'var(--text-mid)', fontWeight: 600 }}>نقاط الحياة (HP)</label>
          <input
            type="number"
            min={1}
            value={question.bossHp || 100}
            onChange={(e) => onUpdateQuestion({ bossHp: Number(e.target.value) })}
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
