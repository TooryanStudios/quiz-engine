type OrderingAnswerSectionProps = {
  sectionLabel: string
  items: string[]
  correctOrder: number[]
  onChangeItem: (index: number, value: string) => void
  onChangeCorrectOrder: (value: string) => void
}

export function OrderingAnswerSection({
  sectionLabel,
  items,
  correctOrder,
  onChangeItem,
  onChangeCorrectOrder,
}: OrderingAnswerSectionProps) {
  return (
    <div style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>{sectionLabel}</label>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1.2rem' }}>
        {items.map((item, itemIndex) => (
          <div key={itemIndex} style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', background: 'var(--bg-deep)', padding: '0.4rem 0.8rem', borderRadius: '12px', border: '1.5px solid var(--border-strong)' }}>
            <div style={{ width: '22px', height: '22px', borderRadius: '6px', background: 'var(--text-bright)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>{itemIndex + 1}</div>
            <input
              value={item}
              onChange={(e) => onChangeItem(itemIndex, e.target.value)}
              placeholder={`أدخل العنصر ${itemIndex + 1}...`}
              style={{
                flex: 1,
                padding: '0.5rem 0',
                background: 'transparent',
                border: 'none',
                color: 'var(--text)',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase' }}>الترتيب الصحيح (أرقام مفصولة بفاصلة)</label>
        <input
          value={correctOrder.join(', ')}
          onChange={(e) => onChangeCorrectOrder(e.target.value)}
          placeholder="مثال: 1, 3, 2, 4"
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
  )
}