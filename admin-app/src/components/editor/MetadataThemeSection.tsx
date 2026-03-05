import { THEME_PRESETS } from '../../lib/adminRepo'
import { useDialog } from '../../lib/DialogContext'

function resolveSelectedTheme(selectedThemeId: string) {
  return (
    THEME_PRESETS.find((t) => t.key === selectedThemeId) ||
    (selectedThemeId === 'default'
      ? THEME_PRESETS.find((t) => t.key === 'default-dark')
      : undefined) ||
    THEME_PRESETS[0]
  )
}

function ThemePickerBody(props: {
  selectedThemeId: string
  onPick: (id: string) => void
}) {
  const { selectedThemeId, onPick } = props
  const { hide } = useDialog()

  return (
    <div style={{ display: 'grid', gap: '0.75rem' }}>
      <div style={{ color: 'var(--text-mid)', fontSize: '0.9rem', lineHeight: 1.5 }}>
        اختر ثيمًا من القائمة:
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
        gap: '0.75rem',
      }}>
        {THEME_PRESETS.map((theme) => {
          const isActive = selectedThemeId === theme.key || (selectedThemeId === 'default' && theme.key === 'default-dark')

          return (
            <button
              key={theme.key}
              type="button"
              onClick={() => { onPick(theme.key); hide() }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'stretch',
                padding: 0,
                border: isActive ? '2px solid var(--accent)' : '1px solid var(--border-subtle)',
                borderRadius: '10px',
                background: 'var(--surface-2)',
                cursor: 'pointer',
                overflow: 'hidden',
                transition: 'all 0.16s ease',
                transform: isActive ? 'scale(1.02)' : 'scale(1)',
                opacity: isActive ? 1 : 0.9,
              }}
            >
              <div style={{
                height: '60px',
                background: theme.tokens.bg,
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <div style={{
                  width: '70%',
                  height: '24px',
                  background: theme.tokens.surface,
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 8px',
                  gap: '4px',
                }}>
                  <div style={{ width: '16px', height: '8px', borderRadius: '2px', background: theme.tokens.accent }} />
                  <div style={{ width: '30%', height: '4px', borderRadius: '2px', background: theme.tokens.textDim }} />
                </div>
              </div>

              <div style={{
                padding: '0.5rem',
                textAlign: 'center',
                fontSize: '0.85em',
                fontWeight: isActive ? 700 : 500,
                color: 'var(--text-main)',
                background: isActive ? 'var(--surface-hover)' : 'transparent',
                borderTop: '1px solid var(--border-subtle)',
              }}>
                {theme.label}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

type MetadataThemeSectionProps = {
  selectedThemeId: string
  onThemeChange: (id: string) => void
}

export function MetadataThemeSection({
  selectedThemeId,
  onThemeChange,
}: MetadataThemeSectionProps) {
  const { show: showDialog } = useDialog()

  const selectedTheme = resolveSelectedTheme(selectedThemeId)

  return (
    <div style={{ marginTop: '1.5rem' }}>
      <label style={{ 
        fontSize: '0.9em', 
        color: 'var(--text-mid)', 
        display: 'block', 
        marginBottom: '0.5rem', 
        fontWeight: 600 
      }}>
        اختر الثيم (Theme)
      </label>

      <button
        type="button"
        onClick={() => {
          const previous = selectedThemeId
          showDialog({
            title: '🎨 اختيار الثيم',
            message: (
              <ThemePickerBody
                selectedThemeId={previous}
                onPick={(id) => onThemeChange(id)}
              />
            ),
            confirmText: 'تم',
            cancelText: 'إلغاء',
            onConfirm: () => {},
            onCancel: () => onThemeChange(previous),
          })
        }}
        style={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'stretch',
          padding: 0,
          border: '1px solid var(--border-strong)',
          borderRadius: '12px',
          background: 'var(--bg-surface)',
          cursor: 'pointer',
          overflow: 'hidden',
          transition: 'all 0.16s ease',
        }}
        onMouseEnter={(event) => {
          event.currentTarget.style.transform = 'translateY(-1px)'
          event.currentTarget.style.borderColor = 'var(--accent)'
        }}
        onMouseLeave={(event) => {
          event.currentTarget.style.transform = 'translateY(0)'
          event.currentTarget.style.borderColor = 'var(--border-strong)'
        }}
      >
        <div style={{
          height: '68px',
          background: selectedTheme.tokens.bg,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            width: '78%',
            height: '26px',
            background: selectedTheme.tokens.surface,
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            padding: '0 10px',
            gap: '6px',
          }}>
            <div style={{ width: '18px', height: '10px', borderRadius: '3px', background: selectedTheme.tokens.accent }} />
            <div style={{ width: '34%', height: '5px', borderRadius: '3px', background: selectedTheme.tokens.textDim }} />
          </div>
        </div>
        <div style={{
          padding: '0.75rem 0.85rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid var(--border)',
          color: 'var(--text)',
          fontWeight: 700,
        }}>
          <span>{selectedTheme.label}</span>
          <span style={{ color: 'var(--text-mid)', fontWeight: 700 }}>تغيير ▸</span>
        </div>
      </button>
    </div>
  )
}
