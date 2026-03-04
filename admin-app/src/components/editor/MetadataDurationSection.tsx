type MetadataDurationSectionProps = {
  tempAllDuration: number
  onDurationChange: (value: number) => void
  onApplyDuration: () => void
}

export function MetadataDurationSection({
  tempAllDuration,
  onDurationChange,
  onApplyDuration,
}: MetadataDurationSectionProps) {
  return (
    <div style={{ border: '1px solid var(--border-strong)', borderRadius: '10px', background: 'var(--bg-surface)', padding: '0.75rem 0.85rem' }}>
      <label style={{ fontSize: '0.9em', color: 'var(--text-mid)', display: 'block', marginBottom: '0.5rem', fontWeight: 700 }}>
        ⏱️ توحيد وقت جميع الأسئلة
      </label>
      <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
        <input
          type="number"
          min={5}
          max={300}
          value={tempAllDuration}
          onChange={(e) => onDurationChange(Number(e.target.value))}
          style={{
            width: '120px',
            padding: '0.6rem 0.7rem',
            borderRadius: '8px',
            border: '1px solid var(--border-strong)',
            backgroundColor: 'var(--bg-deep)',
            color: 'var(--text)',
            boxSizing: 'border-box',
            fontSize: '0.9em',
            textAlign: 'center',
          }}
        />
        <span style={{ color: 'var(--text-mid)', fontSize: '0.85rem', fontWeight: 600 }}>ثانية</span>
        <button
          type="button"
          onClick={onApplyDuration}
          style={{
            padding: '0.58rem 0.85rem',
            borderRadius: '8px',
            border: '1px solid var(--text-bright)',
            background: 'rgba(59,130,246,0.14)',
            color: 'var(--text-bright)',
            cursor: 'pointer',
            fontSize: '0.82rem',
            fontWeight: 700,
            whiteSpace: 'nowrap',
          }}
        >
          تطبيق على الكل
        </button>
      </div>
      <p style={{ marginTop: '0.45rem', marginBottom: 0, fontSize: '0.78rem', color: 'var(--text-mid)' }}>
        يطبق نفس الوقت على كل الأسئلة الحالية في هذا الاختبار.
      </p>
    </div>
  )
}
