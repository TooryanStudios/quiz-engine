type ContentTypePickerOverlayProps = {
  onClose: () => void
  onSelect: (type: 'quiz' | 'mini-game' | 'mix') => void
}

const CONTENT_TYPE_OPTIONS = [
  {
    type: 'quiz' as const,
    icon: '📋',
    title: 'اختبار',
    titleEn: 'Quiz',
    desc: 'أسئلة متعددة الأنواع: اختيار، ترتيب، تطابق، كتابة والمزيد',
    accent: '#2563eb',
    bg: 'rgba(37,99,235,0.12)',
  },
  {
    type: 'mini-game' as const,
    icon: '🎮',
    title: 'ميني جيم',
    titleEn: 'Mini Game',
    desc: 'لعبة تفاعلية مستقلة: بازل، XO، تروس، استوديو إبداعي',
    accent: '#7c3aed',
    bg: 'rgba(124,58,237,0.12)',
  },
  {
    type: 'mix' as const,
    icon: '🔀',
    title: 'مزيج',
    titleEn: 'Mixed',
    desc: 'ادمج أسئلة عادية مع بازل صور أو أنواع إبداعية في نفس الجلسة',
    accent: '#059669',
    bg: 'rgba(5,150,105,0.12)',
  },
]

export function ContentTypePickerOverlay({ onClose, onSelect }: ContentTypePickerOverlayProps) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(2, 6, 23, 0.92)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(12px)',
      animation: 'fadeIn 0.25s ease-out',
      padding: '1.5rem',
    }}>
      <div style={{ width: '100%', maxWidth: '720px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem', position: 'relative' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              position: 'absolute', top: '-0.5rem', left: 0,
              background: 'transparent', border: '1px solid var(--border-strong)',
              color: 'var(--text-mid)', borderRadius: '8px',
              padding: '0.3rem 0.6rem', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 700,
            }}
          >✕ إغلاق</button>
          <h1 style={{ margin: '0 0 0.5rem', fontSize: '1.75rem', fontWeight: 900, color: 'var(--text-bright)' }}>
            ماذا تريد أن تنشئ؟
          </h1>
          <p style={{ margin: 0, color: 'var(--text-mid)', fontSize: '0.95rem' }}>
            اختر نوع المحتوى ثم سنكمل الإعدادات معاً
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '1rem' }}>
          {CONTENT_TYPE_OPTIONS.map((option) => (
            <div
              key={option.type}
              onClick={() => onSelect(option.type)}
              style={{
                background: 'var(--bg-surface)',
                border: `2px solid ${option.accent}44`,
                borderRadius: '18px',
                padding: '1.75rem 1.5rem',
                cursor: 'pointer',
                transition: 'all 0.22s cubic-bezier(0.4,0,0.2,1)',
                display: 'flex', flexDirection: 'column', gap: '0.9rem',
                position: 'relative', overflow: 'hidden',
              }}
              onMouseEnter={(event) => {
                event.currentTarget.style.borderColor = option.accent
                event.currentTarget.style.background = option.bg
                event.currentTarget.style.transform = 'translateY(-4px)'
                event.currentTarget.style.boxShadow = `0 12px 32px ${option.accent}33`
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.borderColor = `${option.accent}44`
                event.currentTarget.style.background = 'var(--bg-surface)'
                event.currentTarget.style.transform = 'translateY(0)'
                event.currentTarget.style.boxShadow = 'none'
              }}
            >
              <div style={{
                width: '52px', height: '52px', borderRadius: '14px',
                background: option.bg, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '1.7rem',
                border: `1px solid ${option.accent}33`,
              }}>{option.icon}</div>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-bright)', marginBottom: '0.3rem' }}>
                  {option.title} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)', marginRight: '0.25rem' }}>{option.titleEn}</span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-mid)', lineHeight: 1.5 }}>{option.desc}</div>
              </div>
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px',
                background: `linear-gradient(90deg, ${option.accent}, transparent)`,
                opacity: 0.6,
              }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}