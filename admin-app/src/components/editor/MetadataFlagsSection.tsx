type MetadataFlagsSectionProps = {
  tempRandomizeQuestions: boolean
  tempEnableScholarRole: boolean
  onRandomizeChange: (value: boolean) => void
  onScholarRoleChange: (value: boolean) => void
}

export function MetadataFlagsSection({
  tempRandomizeQuestions,
  tempEnableScholarRole,
  onRandomizeChange,
  onScholarRoleChange,
}: MetadataFlagsSectionProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.7rem' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', userSelect: 'none', background: 'var(--bg-surface)', padding: '0.75rem 0.85rem', borderRadius: '10px', border: '1px solid var(--border-strong)' }}>
        <input
          type="checkbox"
          checked={tempRandomizeQuestions}
          onChange={(e) => onRandomizeChange(e.target.checked)}
          style={{ width: '1.05rem', height: '1.05rem', accentColor: '#7c3aed', cursor: 'pointer' }}
        />
        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
          <strong style={{ color: 'var(--text)', fontSize: '0.9rem' }}>🔀 ترتيب عشوائي</strong>
          <span style={{ color: 'var(--text-mid)', fontSize: '0.78rem' }}>خلط مرة واحدة قبل البداية (نفس الترتيب للجميع)</span>
        </span>
      </label>

      <label style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', cursor: 'pointer', userSelect: 'none', background: 'var(--bg-surface)', padding: '0.75rem 0.85rem', borderRadius: '10px', border: '1px solid var(--border-strong)' }}>
        <input
          type="checkbox"
          checked={tempEnableScholarRole}
          onChange={(e) => onScholarRoleChange(e.target.checked)}
          style={{ width: '1.05rem', height: '1.05rem', accentColor: 'var(--text-bright)', cursor: 'pointer' }}
        />
        <span style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem' }}>
          <strong style={{ color: 'var(--text)', fontSize: '0.9rem' }}>📘 وضع الباحث</strong>
          <span style={{ color: 'var(--text-mid)', fontSize: '0.78rem' }}>إظهار الأسئلة مبكرًا للمشرف</span>
        </span>
      </label>
    </div>
  )
}
