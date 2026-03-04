type MixContentAddSectionProps = {
  isVisible: boolean
  onAddQuestion: () => void
  onAddMiniGame: () => void
}

export function MixContentAddSection({ isVisible, onAddQuestion, onAddMiniGame }: MixContentAddSectionProps) {
  if (!isVisible) return null

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '1rem', marginBottom: '3rem', animation: 'slideUp 0.4s ease-out' }}>
      <div onClick={onAddQuestion} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.9rem', padding: '2rem', borderRadius: '16px', border: '2px dashed #3b82f6', backgroundColor: 'rgba(59,130,246,0.05)', cursor: 'pointer', transition: 'all 0.25s' }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#60a5fa'; e.currentTarget.style.backgroundColor = 'rgba(59,130,246,0.1)'; e.currentTarget.style.transform = 'scale(1.01)' }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.backgroundColor = 'rgba(59,130,246,0.05)'; e.currentTarget.style.transform = 'scale(1)' }}>
        <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: '#3b82f6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>❓</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 800, color: 'var(--text-bright)', fontSize: '1rem' }}>إضافة سؤال</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-mid)', marginTop: '0.2rem' }}>اختيار، مطابقة، ترتيب، كتابة...</div>
        </div>
      </div>
      <div onClick={onAddMiniGame} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.9rem', padding: '2rem', borderRadius: '16px', border: '2px dashed #7c3aed', backgroundColor: 'rgba(124,58,237,0.05)', cursor: 'pointer', transition: 'all 0.25s' }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#a78bfa'; e.currentTarget.style.backgroundColor = 'rgba(124,58,237,0.1)'; e.currentTarget.style.transform = 'scale(1.01)' }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.backgroundColor = 'rgba(124,58,237,0.05)'; e.currentTarget.style.transform = 'scale(1)' }}>
        <div style={{ width: '46px', height: '46px', borderRadius: '50%', background: '#7c3aed', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem' }}>🎮</div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontWeight: 800, color: 'var(--text-bright)', fontSize: '1rem' }}>إضافة ميني جيم</div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-mid)', marginTop: '0.2rem' }}>بازل، XO، ترس، إبداعي...</div>
        </div>
      </div>
    </div>
  )
}