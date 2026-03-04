type MiniGameCard = {
  id: string
  icon: string
  englishName: string
  arabicName: string
  description: string
  howToPlay: string
  access: 'free' | 'premium'
  enabled: boolean
}

type MetadataMiniGameSectionProps = {
  selectedGameModeMeta?: {
    icon?: string
    englishName?: string
    arabicName?: string
    description?: string
    howToPlay?: string
    access?: 'free' | 'premium'
  }
  showMiniGamePicker: boolean
  miniGameCards: MiniGameCard[]
  tempGameModeId?: string
  isSubscribed: boolean
  onOpenPicker: () => void
  onClosePicker: () => void
  onSelectGameMode: (id: string) => void
  onPremiumLocked: () => void
}

export function MetadataMiniGameSection({
  selectedGameModeMeta,
  showMiniGamePicker,
  miniGameCards,
  tempGameModeId,
  isSubscribed,
  onOpenPicker,
  onClosePicker,
  onSelectGameMode,
  onPremiumLocked,
}: MetadataMiniGameSectionProps) {
  return (
    <div>
      <label style={{ fontSize: '0.9em', color: 'var(--text-mid)', display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>
        🎮 الميني جيم
      </label>
      <button
        type="button"
        onClick={onOpenPicker}
        style={{
          width: '100%',
          padding: '0.75rem',
          borderRadius: '8px',
          border: '1px solid var(--border-strong)',
          background: 'var(--bg-surface)',
          color: 'var(--text)',
          boxSizing: 'border-box',
          fontSize: '1em',
          textAlign: 'start',
          cursor: 'pointer',
        }}
      >
        {selectedGameModeMeta
          ? `${selectedGameModeMeta.icon} ${selectedGameModeMeta.englishName} / ${selectedGameModeMeta.arabicName}`
          : 'اختر ميني جيم'}
      </button>
      <p style={{ marginTop: '0.4rem', fontSize: '0.78em', color: 'var(--text-mid)' }}>
        يتم اختيار الميني جيم عبر بطاقات (اسم إنجليزي + اسم عربي + أيقونة + شرح).
      </p>
      <div style={{ marginTop: '0.55rem', padding: '0.65rem 0.75rem', borderRadius: '10px', border: '1px solid var(--border-strong)', background: 'var(--bg-deep)' }}>
        <p style={{ margin: 0, color: 'var(--text)', fontWeight: 700, fontSize: '0.83rem' }}>
          {selectedGameModeMeta?.icon || '🎮'} {selectedGameModeMeta?.englishName || 'Mini Game'} · {selectedGameModeMeta?.arabicName || 'لعبة مصغّرة'}
        </p>
        <p style={{ margin: '0.25rem 0 0', color: 'var(--text-mid)', fontSize: '0.78rem' }}>
          {selectedGameModeMeta?.description || 'اختر لعبة من القائمة المتاحة.'}
        </p>
        <p style={{ margin: '0.28rem 0 0', color: 'var(--text)', fontSize: '0.78rem' }}>
          <strong>طريقة اللعب:</strong> {selectedGameModeMeta?.howToPlay || 'ستظهر بعد اختيار اللعبة.'}
        </p>
        <p style={{ margin: '0.28rem 0 0', color: 'var(--text-mid)', fontSize: '0.75rem' }}>
          الوصول: {(selectedGameModeMeta?.access || 'free') === 'premium' ? '🔒 Premium' : '🆓 Free'}
        </p>
      </div>

      {showMiniGamePicker && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(2, 6, 23, 0.7)',
            backdropFilter: 'blur(5px)',
            zIndex: 12000,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '1rem',
          }}
          onClick={onClosePicker}
        >
          <div
            style={{
              width: 'min(860px, 94vw)',
              maxHeight: '78vh',
              overflowY: 'auto',
              background: 'linear-gradient(180deg, var(--bg-deep) 0%, var(--bg-surface) 100%)',
              border: '1px solid var(--border)',
              borderRadius: '14px',
              padding: '0.85rem',
              boxShadow: '0 24px 80px rgba(2, 6, 23, 0.55)',
            }}
            onClick={(event) => event.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
              <h3 style={{ margin: 0, color: 'var(--text-bright)', fontSize: '1rem' }}>🎮 اختيار الميني جيم</h3>
              <button
                type="button"
                onClick={onClosePicker}
                style={{ border: '1px solid var(--border-strong)', borderRadius: '8px', background: 'var(--bg-surface)', color: 'var(--text)', padding: '0.35rem 0.6rem', cursor: 'pointer' }}
              >
                إغلاق
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: '0.55rem' }}>
              {miniGameCards.filter((game) => game.enabled).map((game) => {
                const selected = tempGameModeId === game.id
                const premiumLocked = game.access === 'premium' && !isSubscribed
                return (
                  <button
                    key={game.id || 'classic'}
                    type="button"
                    onClick={() => {
                      if (premiumLocked) {
                        onPremiumLocked()
                        return
                      }
                      onSelectGameMode(game.id)
                    }}
                    style={{
                      textAlign: 'start',
                      border: selected ? '1px solid var(--text-bright)' : '1px solid var(--border-strong)',
                      borderRadius: '12px',
                      background: selected ? 'rgba(59,130,246,0.14)' : 'var(--bg-surface)',
                      padding: '0.6rem',
                      cursor: premiumLocked ? 'not-allowed' : 'pointer',
                      opacity: premiumLocked ? 0.68 : 1,
                    }}
                  >
                    <p style={{ margin: 0, color: 'var(--text)', fontWeight: 800, fontSize: '0.84rem' }}>
                      {game.icon} {game.englishName}
                    </p>
                    <p style={{ margin: '0.15rem 0 0', color: 'var(--text-muted)', fontSize: '0.74rem' }}>{game.arabicName}</p>
                    <p style={{ margin: '0.25rem 0 0', color: 'var(--text-mid)', fontSize: '0.72rem', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{game.description}</p>
                    <p style={{ margin: '0.25rem 0 0', color: 'var(--text)', fontSize: '0.71rem', lineHeight: 1.3, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      <strong>طريقة اللعب:</strong> {game.howToPlay}
                    </p>
                    <p style={{ margin: '0.25rem 0 0', color: premiumLocked ? '#fda4af' : 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 700 }}>
                      {game.access === 'premium' ? '🔒 Premium' : '🆓 Free'}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
