type MiniGameCard = {
  id: string
  icon: string
  arabicName: string
  description: string
}

type AddBlockPickerOverlayProps = {
  isOpen: boolean
  miniGameCards: MiniGameCard[]
  onClose: () => void
  onSelect: (id: string) => void
}

export function AddBlockPickerOverlay({ isOpen, miniGameCards, onClose, onSelect }: AddBlockPickerOverlayProps) {
  if (!isOpen) return null

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 2000, background: 'rgba(2,6,23,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(10px)', padding: '1.5rem', animation: 'fadeIn 0.2s ease-out' }}>
      <div style={{ width: '100%', maxWidth: '680px', background: 'var(--bg-surface)', borderRadius: '20px', border: '1px solid var(--border-strong)', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
        <div style={{ padding: '1.25rem 1.5rem', background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#fff' }}>🎮 اختر ميني جيم</h2>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: 'rgba(255,255,255,0.75)' }}>سيتم إضافته كبلوك مستقل في نفس الاختبار</p>
          </div>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
        </div>
        <div style={{ padding: '1.25rem', maxHeight: '70vh', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
          {miniGameCards.map((game) => (
            <div
              key={game.id}
              onClick={() => onSelect(game.id)}
              style={{ padding: '1rem', borderRadius: '14px', border: '1.5px solid var(--border-strong)', background: 'var(--bg-deep)', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#7c3aed'; e.currentTarget.style.background = 'rgba(124,58,237,0.1)'; e.currentTarget.style.transform = 'translateY(-2px)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.background = 'var(--bg-deep)'; e.currentTarget.style.transform = 'translateY(0)' }}
            >
              <div style={{ fontSize: '1.6rem' }}>{game.icon}</div>
              <div style={{ fontWeight: 700, color: 'var(--text-bright)', fontSize: '0.85rem' }}>{game.arabicName}</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-mid)', lineHeight: 1.4 }}>{game.description}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}