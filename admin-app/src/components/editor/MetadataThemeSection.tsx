import { useEffect, useState } from 'react'
import {
  THEME_PRESETS,
  subscribeThemeEditorSettings,
  type ThemePackRecord,
  type ThemePaletteTokens,
} from '../../lib/adminRepo'
import { useDialog } from '../../lib/DialogContext'

// ── Build a unified theme list: Firestore custom themes + built-in presets ──
type FlatTheme = {
  id: string
  label: string
  tokens: ThemePaletteTokens
  isCustom: boolean
}

function buildFlatThemes(custom: ThemePackRecord[]): FlatTheme[] {
  const enabled = custom.filter((t) => t.enabled !== false)
  const builtIn: FlatTheme[] = THEME_PRESETS.map((p) => ({
    id: p.key,
    label: p.label,
    tokens: p.tokens,
    isCustom: false,
  }))
  if (enabled.length === 0) return builtIn
  const customFlat: FlatTheme[] = enabled.map((t) => ({
    id: t.id,
    label: t.name,
    tokens: t.tokens,
    isCustom: true,
  }))
  return [...customFlat, ...builtIn]
}

// ── Compact color strip shown on each card ───────────────────────────────────
function ColorStrip({ tokens }: { tokens: ThemePaletteTokens }) {
  const swatches = [tokens.bg, tokens.surface, tokens.surface2, tokens.accent, tokens.success]
  return (
    <div style={{ display: 'flex', height: '26px', borderRadius: '6px 6px 0 0', overflow: 'hidden' }}>
      {swatches.map((color, i) => (
        <div key={i} style={{ flex: 1, background: color }} />
      ))}
    </div>
  )
}

function ThemePickerBody(props: {
  selectedThemeId: string
  onPick: (id: string) => void
}) {
  const { selectedThemeId, onPick } = props
  const { hide } = useDialog()

  const [themes, setThemes] = useState<FlatTheme[]>(() => buildFlatThemes([]))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = subscribeThemeEditorSettings((settings) => {
      setThemes(buildFlatThemes(settings.themes || []))
      setLoading(false)
    })
    return unsub
  }, [])

  const activeId = selectedThemeId === 'default' ? 'default-dark' : selectedThemeId

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {loading && (
        <div style={{ color: 'var(--text-mid)', fontSize: '0.82rem' }}>
          جاري تحميل الثيمات…
        </div>
      )}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(128px, 1fr))',
        gap: '0.5rem',
        maxHeight: '60vh',
        overflowY: 'auto',
        paddingRight: '2px',
      }}>
        {themes.map((theme) => {
          const isActive = theme.id === activeId
          return (
            <button
              key={theme.id}
              type="button"
              onClick={() => { onPick(theme.id); hide() }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                padding: 0,
                border: isActive ? '2px solid var(--accent)' : '1px solid var(--border-subtle, #3a3f52)',
                borderRadius: '8px',
                background: isActive
                  ? 'color-mix(in srgb, var(--accent) 8%, var(--surface))'
                  : 'var(--surface)',
                cursor: 'pointer',
                overflow: 'hidden',
                transition: 'border-color 0.13s, transform 0.12s',
                transform: isActive ? 'scale(1.03)' : 'scale(1)',
                boxShadow: isActive ? '0 0 0 3px color-mix(in srgb, var(--accent) 25%, transparent)' : 'none',
                textAlign: 'left',
              }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.borderColor = 'var(--accent)' }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.borderColor = 'var(--border-subtle, #3a3f52)' }}
            >
              <ColorStrip tokens={theme.tokens} />

              <div style={{ padding: '0.4rem 0.5rem' }}>
                <div style={{
                  fontSize: '0.8rem',
                  fontWeight: isActive ? 700 : 600,
                  color: isActive ? 'var(--accent)' : 'var(--text)',
                  lineHeight: 1.25,
                  marginBottom: '0.15rem',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}>
                  {theme.label}
                </div>
                <div style={{
                  fontSize: '0.65rem',
                  fontFamily: 'monospace',
                  color: 'var(--text-dim)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  direction: 'ltr',
                }}>
                  {theme.id}
                </div>
                {theme.isCustom && (
                  <div style={{
                    marginTop: '0.2rem',
                    display: 'inline-block',
                    fontSize: '0.58rem',
                    fontWeight: 700,
                    background: 'color-mix(in srgb, var(--accent) 15%, transparent)',
                    color: 'var(--accent)',
                    borderRadius: '3px',
                    padding: '1px 4px',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}>
                    مخصص
                  </div>
                )}
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

  const [themes, setThemes] = useState<FlatTheme[]>(() => buildFlatThemes([]))
  useEffect(() => {
    const unsub = subscribeThemeEditorSettings((s) => setThemes(buildFlatThemes(s.themes || [])))
    return unsub
  }, [])

  const activeId = selectedThemeId === 'default' ? 'default-dark' : selectedThemeId
  const current = themes.find((t) => t.id === activeId) ?? themes[0]

  return (
    <div style={{ marginTop: '1.5rem' }}>
      <label style={{
        fontSize: '0.9em',
        color: 'var(--text-mid)',
        display: 'block',
        marginBottom: '0.5rem',
        fontWeight: 600,
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
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.6rem 0.85rem',
          border: '1px solid var(--border-strong)',
          borderRadius: '10px',
          background: 'var(--bg-surface, var(--surface))',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'var(--accent)'
          e.currentTarget.style.transform = 'translateY(-1px)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'var(--border-strong)'
          e.currentTarget.style.transform = 'translateY(0)'
        }}
      >
        {current && (
          <div style={{
            display: 'flex',
            width: '52px',
            height: '30px',
            borderRadius: '5px',
            overflow: 'hidden',
            flexShrink: 0,
            border: '1px solid var(--border-subtle, #3a3f52)',
          }}>
            {[current.tokens.bg, current.tokens.surface2, current.tokens.accent, current.tokens.success].map((c, i) => (
              <div key={i} style={{ flex: 1, background: c }} />
            ))}
          </div>
        )}

        <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
          <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text)', lineHeight: 1.2 }}>
            {current?.label ?? activeId}
          </div>
          <div style={{
            fontSize: '0.7rem',
            fontFamily: 'monospace',
            color: 'var(--text-dim)',
            direction: 'ltr',
          }}>
            {activeId}
          </div>
        </div>

        <span style={{ color: 'var(--text-mid)', fontWeight: 700, flexShrink: 0 }}>
          تغيير ▸
        </span>
      </button>
    </div>
  )
}
