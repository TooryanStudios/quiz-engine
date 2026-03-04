import { THEME_PRESETS } from '../../lib/adminRepo'

type MetadataThemeSectionProps = {
  selectedThemeId: string
  onThemeChange: (id: string) => void
}

export function MetadataThemeSection({
  selectedThemeId,
  onThemeChange,
}: MetadataThemeSectionProps) {
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
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', 
        gap: '0.75rem' 
      }}>
        {THEME_PRESETS.map((theme) => {
          const isActive = selectedThemeId === theme.key || (selectedThemeId === 'default' && theme.key === 'default-dark')
          
          return (
            <button
              key={theme.key}
              onClick={() => onThemeChange(theme.key)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'stretch',
                padding: '0',
                border: isActive ? '2px solid var(--accent)' : '1px solid var(--border-subtle)',
                borderRadius: '8px',
                background: 'var(--surface-2)',
                cursor: 'pointer',
                overflow: 'hidden',
                transition: 'all 0.2s ease',
                transform: isActive ? 'scale(1.02)' : 'scale(1)',
                opacity: isActive ? 1 : 0.85
              }}
            >
              {/* Preview Area */}
              <div style={{ 
                height: '60px', 
                background: theme.tokens.bg, 
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <div style={{ 
                  width: '70%', 
                  height: '24px', 
                  background: theme.tokens.surface, 
                  borderRadius: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 8px',
                  gap: '4px'
                }}>
                   <div style={{ width: '16px', height: '8px', borderRadius: '2px', background: theme.tokens.accent }}></div>
                   <div style={{ width: '30%', height: '4px', borderRadius: '2px', background: theme.tokens.textDim }}></div>
                </div>
              </div>
              
              {/* Label */}
              <div style={{ 
                padding: '0.5rem', 
                textAlign: 'center',
                fontSize: '0.85em',
                fontWeight: isActive ? 600 : 400,
                color: 'var(--text-main)',
                background: isActive ? 'var(--surface-hover)' : 'transparent',
                borderTop: '1px solid var(--border-subtle)'
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
