import { useEffect, useMemo, useState } from 'react'
import type { ThemePackRecord, ThemePaletteTokens } from '../../lib/adminRepo'

interface Props {
  themes: ThemePackRecord[]
  updatedAt?: { toDate(): Date }
  onSave: (themes: ThemePackRecord[]) => Promise<void>
}

const EMPTY_TOKENS: ThemePaletteTokens = {
  bg: '#1a1a2e',
  surface: '#16213e',
  surface2: '#0f3460',
  accent: '#e94560',
  text: '#eaeaea',
  textDim: '#8892a4',
  success: '#2dd4bf',
}

function formatUpdatedAt(value?: { toDate(): Date }) {
  if (!value) return 'Never'
  return value.toDate().toLocaleString()
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function normalizeHex(value: string, fallback: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback
}

export function ThemeEditorTab({ themes, updatedAt, onSave }: Props) {
  const [items, setItems] = useState<ThemePackRecord[]>(themes)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    setItems(themes)
  }, [themes])

  useEffect(() => {
    if (!message) return
    const timeoutId = window.setTimeout(() => setMessage(''), 4000)
    return () => window.clearTimeout(timeoutId)
  }, [message])

  const hasChanges = useMemo(() => JSON.stringify(items) !== JSON.stringify(themes), [items, themes])

  const enabledCount = useMemo(() => items.filter((item) => item.enabled).length, [items])

  const setName = (id: string, nextName: string) => {
    setItems((prev) => prev.map((item) => item.id === id ? { ...item, name: nextName } : item))
  }

  const toggleEnabled = (id: string) => {
    setItems((prev) => {
      const current = prev.find((item) => item.id === id)
      if (!current) return prev
      if (current.enabled && prev.filter((item) => item.enabled).length <= 1) return prev
      return prev.map((item) => item.id === id ? { ...item, enabled: !item.enabled } : item)
    })
  }

  const setColor = (id: string, key: keyof ThemePaletteTokens, value: string) => {
    setItems((prev) => prev.map((item) => {
      if (item.id !== id) return item
      return {
        ...item,
        tokens: {
          ...item.tokens,
          [key]: normalizeHex(value, item.tokens[key]),
        },
      }
    }))
  }

  const removeTheme = (id: string) => {
    setItems((prev) => {
      if (prev.length <= 1) return prev
      const target = prev.find((item) => item.id === id)
      if (!target) return prev
      if (target.enabled && prev.filter((item) => item.enabled).length <= 1) return prev
      return prev.filter((item) => item.id !== id)
    })
  }

  const addTheme = () => {
    setItems((prev) => {
      const baseName = `Theme ${prev.length + 1}`
      let nextId = slugify(baseName) || `theme-${prev.length + 1}`
      let suffix = 2
      const existing = new Set(prev.map((item) => item.id))
      while (existing.has(nextId)) {
        nextId = `${slugify(baseName)}-${suffix}`
        suffix += 1
      }

      return [
        ...prev,
        {
          id: nextId,
          name: baseName,
          enabled: true,
          tokens: { ...EMPTY_TOKENS },
        },
      ]
    })
  }

  const save = async () => {
    setSaving(true)
    setMessage('')
    try {
      const normalized = items.map((item) => ({
        ...item,
        id: slugify(item.id) || slugify(item.name) || 'theme',
        name: item.name.trim() || item.id,
      }))
      await onSave(normalized)
      setMessage('✅ Saved')
    } catch (error) {
      setMessage(`❌ Failed: ${(error as Error).message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem' }}>
        <h3 style={{ margin: 0, color: 'var(--text-bright)' }}>Theme Editor</h3>
        <p style={{ margin: '0.45rem 0 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
          Create and manage theme packs. You can rename themes, enable/disable them, edit core colors, and preview the result live.
        </p>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={addTheme}
          style={{
            border: '1px solid var(--border)',
            background: 'var(--bg-surface)',
            color: 'var(--text-bright)',
            borderRadius: '8px',
            padding: '0.5rem 0.8rem',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          ➕ Add Theme
        </button>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          Enabled themes: {enabledCount}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '0.75rem' }}>
        {items.map((theme) => (
          <article key={theme.id} style={{ border: '1px solid var(--border)', borderRadius: '12px', background: 'var(--bg-surface)', padding: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <input
                value={theme.name}
                onChange={(event) => setName(theme.id, event.target.value)}
                aria-label={`Theme name for ${theme.id}`}
                style={{
                  flex: 1,
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--text)',
                  borderRadius: '8px',
                  padding: '0.45rem 0.6rem',
                  fontSize: '0.86rem',
                }}
              />
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                <input type="checkbox" checked={theme.enabled} onChange={() => toggleEnabled(theme.id)} />
                Enabled
              </label>
              <button
                type="button"
                onClick={() => removeTheme(theme.id)}
                style={{
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: '#fda4af',
                  borderRadius: '8px',
                  padding: '0.35rem 0.5rem',
                  fontWeight: 700,
                  cursor: items.length <= 1 ? 'not-allowed' : 'pointer',
                  opacity: items.length <= 1 ? 0.45 : 1,
                }}
                disabled={items.length <= 1}
              >
                ✕
              </button>
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {theme.id}</div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '0.5rem' }}>
              {(Object.keys(theme.tokens) as Array<keyof ThemePaletteTokens>).map((tokenKey) => (
                <label key={tokenKey} style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>{tokenKey}</span>
                  <input
                    type="color"
                    value={theme.tokens[tokenKey]}
                    onChange={(event) => setColor(theme.id, tokenKey, event.target.value)}
                    style={{ width: '100%', height: '32px', border: '1px solid var(--border)', borderRadius: '8px', background: 'var(--bg)' }}
                  />
                </label>
              ))}
            </div>

            <div style={{ borderRadius: '10px', border: `1px solid ${theme.tokens.surface2}`, overflow: 'hidden' }}>
              <div style={{ background: theme.tokens.bg, color: theme.tokens.text, padding: '0.75rem' }}>
                <div style={{ fontWeight: 800, marginBottom: '0.45rem' }}>Preview</div>
                <div style={{ background: theme.tokens.surface, borderRadius: '8px', border: `1px solid ${theme.tokens.surface2}`, padding: '0.6rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.45rem' }}>
                    <span style={{ color: theme.tokens.textDim, fontSize: '0.78rem' }}>Sample Card</span>
                    <span style={{ background: theme.tokens.accent, color: '#fff', borderRadius: '999px', padding: '0.12rem 0.5rem', fontSize: '0.72rem', fontWeight: 700 }}>Accent</span>
                  </div>
                  <button type="button" style={{ marginTop: '0.55rem', border: 0, borderRadius: '8px', padding: '0.4rem 0.65rem', background: theme.tokens.success, color: '#0b1020', fontWeight: 800 }}>
                    Success Button
                  </button>
                </div>
              </div>
            </div>
          </article>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={save}
          disabled={saving || !hasChanges}
          style={{
            border: '1px solid var(--text-bright)',
            background: hasChanges ? 'var(--text-bright)' : 'rgba(59,130,246,0.16)',
            color: hasChanges ? '#fff' : 'var(--text-bright)',
            borderRadius: '8px',
            padding: '0.55rem 0.9rem',
            fontWeight: 700,
            cursor: saving || !hasChanges ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? 'Saving...' : '💾 Save Themes'}
        </button>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Last updated: {formatUpdatedAt(updatedAt)}</span>
        {message && <span style={{ fontSize: '0.82rem', color: message.startsWith('✅') ? '#86efac' : '#fda4af' }}>{message}</span>}
      </div>
    </section>
  )
}
