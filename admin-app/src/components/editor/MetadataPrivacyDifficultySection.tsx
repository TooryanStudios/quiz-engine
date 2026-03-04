import type { ChallengePreset } from '../../types/quiz'

type MetadataPrivacyDifficultySectionProps = {
  tempVisibility: 'public' | 'private'
  approvalStatus?: string
  tempChallenge: ChallengePreset
  onVisibilityChange: (value: 'public' | 'private') => void
  onChallengeChange: (value: ChallengePreset) => void
}

export function MetadataPrivacyDifficultySection({
  tempVisibility,
  approvalStatus,
  tempChallenge,
  onVisibilityChange,
  onChallengeChange,
}: MetadataPrivacyDifficultySectionProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
      <div>
        <label style={{ fontSize: '0.9em', color: 'var(--text-mid)', display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>الخصوصية</label>
        <select
          value={tempVisibility}
          onChange={(e) => onVisibilityChange(e.target.value as 'public' | 'private')}
          style={{
            width: '100%',
            padding: '0.75rem',
            borderRadius: '8px',
            border: '1px solid var(--border-strong)',
            backgroundColor: 'var(--bg-surface)',
            color: 'var(--text)',
            boxSizing: 'border-box',
            fontSize: '1em',
          }}
        >
          <option value="public">طلب نشر للعموم 🕐</option>
          <option value="private">خاص 🔒</option>
        </select>
        {tempVisibility === 'public' && approvalStatus !== 'approved' && (
          <p style={{ margin: '0.4rem 0 0', fontSize: '0.75em', color: 'var(--text-muted)' }}>
            سيتم مراجعة الاختبار من المشرف قبل نشره للعموم.
          </p>
        )}
        {approvalStatus === 'rejected' && tempVisibility !== 'public' && (
          <p style={{ margin: '0.4rem 0 0', fontSize: '0.75em', color: '#ef4444' }}>
            ❌ تم رفض طلب النشر السابق.
          </p>
        )}
      </div>

      <div>
        <label style={{ fontSize: '0.9em', color: 'var(--text-mid)', display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>مستوى الصعوبة</label>
        <select
          value={tempChallenge}
          onChange={(e) => onChallengeChange(e.target.value as ChallengePreset)}
          style={{
            width: '100%',
            padding: '0.75rem',
            borderRadius: '8px',
            border: '1px solid var(--border-strong)',
            backgroundColor: 'var(--bg-surface)',
            color: 'var(--text)',
            boxSizing: 'border-box',
            fontSize: '1em',
          }}
        >
          <option value="easy">سهل</option>
          <option value="classic">عادي</option>
          <option value="hard">صعب</option>
        </select>
      </div>
    </div>
  )
}
