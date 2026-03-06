import { type CSSProperties, type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { storage } from '../../lib/firebase'
import { type ThemePackRecord, type ThemePaletteTokens, THEME_PRESETS } from '../../lib/adminRepo'
import { PREVIEW_TABS, type PreviewTabId, loadGoogleFont } from './ThemePreview'

// ── Google Fonts curated list ─────────────────────────────────────────────────
const GOOGLE_FONTS = [
  { value: '', label: '— System default —' },
  { value: 'Tajawal', label: 'Tajawal (عربي)' },
  { value: 'Cairo', label: 'Cairo (عربي)' },
  { value: 'Almarai', label: 'Almarai (عربي)' },
  { value: 'Reem Kufi', label: 'Reem Kufi (عربي)' },
  { value: 'Amiri', label: 'Amiri (عربي)' },
  { value: 'Nunito', label: 'Nunito' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Fredoka One', label: 'Fredoka One' },
  { value: 'Bangers', label: 'Bangers' },
  { value: 'Oswald', label: 'Oswald' },
  { value: 'Merriweather', label: 'Merriweather' },
  { value: 'Righteous', label: 'Righteous' },
  { value: 'Comfortaa', label: 'Comfortaa' },
  { value: 'Exo 2', label: 'Exo 2' },
]

const BG_PATTERNS = [
  { value: 'none', label: 'None (solid)' },
  { value: 'dots', label: '· Dots' },
  { value: 'grid', label: '# Grid lines' },
  { value: 'stripes', label: '/ Diagonal stripes' },
  { value: 'dunes', label: '〜 Desert dunes' },
  { value: 'custom', label: '🖼 Custom image URL' },
]

interface Props {
  themes: ThemePackRecord[]
  updatedAt?: { toDate(): Date }
  onSave: (themes: ThemePackRecord[]) => Promise<void>
}

const EMPTY_TOKENS: ThemePaletteTokens = {
  bg: '#1a1a2e', surface: '#16213e', surface2: '#0f3460',
  accent: '#e94560', text: '#eaeaea', textDim: '#8892a4', success: '#2dd4bf',
}

function formatUpdatedAt(v?: { toDate(): Date }) { return v ? v.toDate().toLocaleString() : 'Never' }
function slugify(v: string) { return v.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/, '') }

// ── Sub-components ─────────────────────────────────────────────────────────────
function ColorField({ label, value, onChange, optional }: { label: string; value?: string; onChange: (v: string) => void; optional?: boolean }) {
  const display = value ?? '#888888'
  const [raw, setRaw] = useState(display)
  useEffect(() => { setRaw(display) }, [display])
  const commit = () => /^#[0-9a-fA-F]{6}$/.test(raw) ? onChange(raw) : setRaw(display)
  const inp: CSSProperties = { border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', borderRadius: '6px', padding: '0.28rem 0.4rem', fontSize: '0.78rem', fontFamily: 'monospace', width: '76px' }
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'capitalize', display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
        {label}{optional && <span style={{ fontSize: '0.6rem', opacity: 0.6 }}>(opt)</span>}
      </span>
      <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
        <input type="color" value={display} onChange={e => onChange(e.target.value)}
          style={{ width: '34px', height: '34px', padding: '2px', border: '2px solid var(--border)', borderRadius: '7px', cursor: 'pointer', background: 'none', flexShrink: 0 }} />
        <input type="text" value={raw} onChange={e => setRaw(e.target.value)} onBlur={commit} onKeyDown={e => e.key === 'Enter' && commit()} maxLength={7} style={inp} />
      </div>
    </label>
  )
}

function ShapeInput({ label, value, placeholder, onChange }: { label: string; value?: string; placeholder: string; onChange: (v: string) => void }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
      <input type="text" value={value ?? ''} placeholder={placeholder} onChange={e => onChange(e.target.value)}
        style={{ border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', borderRadius: '6px', padding: '0.3rem 0.5rem', fontSize: '0.8rem', fontFamily: 'monospace' }} />
    </label>
  )
}

function FontSelector({ label, value, onChange }: { label: string; value?: string; onChange: (v: string) => void }) {
  useEffect(() => { if (value) loadGoogleFont(value) }, [value])
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }}>{label}</span>
      <select value={value ?? ''} onChange={e => { onChange(e.target.value); loadGoogleFont(e.target.value) }}
        style={{ border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', borderRadius: '6px', padding: '0.3rem 0.45rem', fontSize: '0.8rem', cursor: 'pointer' }}>
        {GOOGLE_FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
      </select>
      {value && <div style={{ fontSize: '0.8rem', fontFamily: `'${value}', sans-serif`, color: 'var(--text)', opacity: 0.7, paddingTop: '2px' }}>Preview: {value} — أبجد هوز ١٢٣</div>}
    </label>
  )
}

function EditorSection({ title, open, toggle, children }: { title: string; open: boolean; toggle: () => void; children: ReactNode }) {
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
      <button type="button" onClick={toggle}
        style={{ width: '100%', background: 'var(--bg-surface)', color: 'var(--text-bright)', border: 0, padding: '0.6rem 0.9rem', textAlign: 'left', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span>{title}</span>
        <span style={{ transition: 'transform 0.2s', display: 'inline-block', transform: open ? 'rotate(180deg)' : 'none' }}>▾</span>
      </button>
      {open && <div style={{ background: 'var(--bg)', padding: '0.8rem', borderTop: '1px solid var(--border)' }}>{children}</div>}
    </div>
  )
}

// ── Background image uploader (URL or file upload) ──────────────────────────
function BgImageUploader({ value, onChange, inputStyle, labelStyle }: {
  value?: string
  onChange: (url: string) => void
  inputStyle: CSSProperties
  labelStyle: CSSProperties
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setProgress(0)
    try {
      const path = `theme-bg/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`
      const sRef = storageRef(storage, path)
      const task = uploadBytesResumable(sRef, file)
      await new Promise<void>((resolve, reject) => {
        task.on('state_changed',
          snap => setProgress(Math.round(snap.bytesTransferred / snap.totalBytes * 100)),
          reject,
          () => resolve()
        )
      })
      const url = await getDownloadURL(task.snapshot.ref)
      onChange(url)
    } catch (err) {
      console.error('Upload failed', err)
    } finally {
      setUploading(false)
      setProgress(0)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <span style={labelStyle}>Background image</span>
      {/* URL input */}
      <input
        type="url"
        value={value ?? ''}
        placeholder="https://example.com/pattern.png"
        onChange={e => onChange(e.target.value)}
        style={inputStyle}
        disabled={uploading}
      />
      {/* Upload row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          style={{
            flex: '0 0 auto',
            background: 'var(--accent)',
            color: '#fff',
            border: 0,
            borderRadius: '6px',
            padding: '0.3rem 0.7rem',
            fontSize: '0.78rem',
            cursor: uploading ? 'not-allowed' : 'pointer',
            opacity: uploading ? 0.7 : 1,
            whiteSpace: 'nowrap',
          }}
        >
          {uploading ? `Uploading ${progress}%…` : '⬆ Upload image'}
        </button>
        {uploading && (
          <div style={{ flex: 1, height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: 'var(--accent)', transition: 'width 0.2s' }} />
          </div>
        )}
        {value && !uploading && (
          <button
            type="button"
            onClick={() => onChange('')}
            style={{ flex: '0 0 auto', background: 'none', border: 0, color: '#fda4af', cursor: 'pointer', fontSize: '0.78rem', padding: '0 4px' }}
          >✕ Clear</button>
        )}
      </div>
      {/* Preview thumbnail */}
      {value && (
        <div style={{ marginTop: '0.25rem', borderRadius: '6px', overflow: 'hidden', height: '60px', background: `url(${value}) center/cover no-repeat`, border: '1px solid var(--border)' }} />
      )}
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
    </div>
  )
}

export function ThemeEditorTab({ themes, updatedAt, onSave }: Props) {
  const [items, setItems] = useState<ThemePackRecord[]>(themes)
  const [selectedId, setSelectedId] = useState<string>(themes[0]?.id ?? '')
  const [previewTab, setPreviewTab] = useState<PreviewTabId>('mcq')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    colors: true, buttons: false, typography: false, background: false, shapes: false,
  })

  useEffect(() => { setItems(themes) }, [themes])
  useEffect(() => {
    if (!message) return
    const id = window.setTimeout(() => setMessage(''), 4000)
    return () => window.clearTimeout(id)
  }, [message])

  const hasChanges = useMemo(() => JSON.stringify(items) !== JSON.stringify(themes), [items, themes])
  const selected = items.find(i => i.id === selectedId) ?? items[0]

  function toggleSection(key: string) { setOpenSections(prev => ({ ...prev, [key]: !prev[key] })) }

  const patch = (tokens: Partial<ThemePaletteTokens>) => {
    setItems(prev => prev.map(item => item.id === selectedId ? { ...item, tokens: { ...item.tokens, ...tokens } } : item))
  }
  const patchItem = (fields: Partial<ThemePackRecord>) => {
    setItems(prev => prev.map(item => item.id === selectedId ? { ...item, ...fields } : item))
  }

  const addTheme = () => {
    const baseName = `Theme ${items.length + 1}`
    let id = slugify(baseName) || `theme-${items.length + 1}`
    let n = 2; const existing = new Set(items.map(i => i.id))
    while (existing.has(id)) { id = `${slugify(baseName)}-${n}`; n++ }
    const newTheme: ThemePackRecord = { id, name: baseName, enabled: true, tokens: { ...EMPTY_TOKENS } }
    setItems(prev => [...prev, newTheme]); setSelectedId(id)
  }

  const removeTheme = (id: string) => {
    if (items.length <= 1) return
    setItems(prev => {
      const next = prev.filter(i => i.id !== id)
      if (selectedId === id) setSelectedId(next[0]?.id ?? '')
      return next
    })
  }

  const loadPreset = (key: string) => {
    const preset = THEME_PRESETS.find(p => p.key === key)
    if (!preset) return
    setItems(prev => prev.map(item => item.id === selectedId ? { ...item, tokens: { ...preset.tokens } } : item))
  }

  const save = async () => {
    setSaving(true); setMessage('')
    try {
      await onSave(items.map(item => ({ ...item, id: slugify(item.id) || slugify(item.name) || 'theme', name: item.name.trim() || item.id })))
      setMessage('✅ Saved successfully')
    } catch (e) { setMessage(`❌ ${(e as Error).message}`) }
    finally { setSaving(false) }
  }

  const t = selected?.tokens ?? EMPTY_TOKENS
  const ActivePreview = PREVIEW_TABS.find(tab => tab.id === previewTab)?.component ?? PREVIEW_TABS[0].component
  const labelStyle: CSSProperties = { fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600 }
  const inputStyle: CSSProperties = { border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', borderRadius: '6px', padding: '0.3rem 0.5rem', fontSize: '0.82rem' }

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* Top bar */}
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: 0, color: 'var(--text-bright)', fontSize: '1rem' }}>🎨 Theme Editor</h3>
          <p style={{ margin: '0.2rem 0 0', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
            Deep customization — colors, buttons, fonts, background patterns, shapes. Live preview for all question types.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Last saved: {formatUpdatedAt(updatedAt)}</span>
          {message && <span style={{ fontSize: '0.78rem', color: message.startsWith('✅') ? '#86efac' : '#fda4af' }}>{message}</span>}
          <button type="button" onClick={save} disabled={saving || !hasChanges}
            style={{ border: '1px solid var(--text-bright)', background: hasChanges ? 'var(--text-bright)' : 'transparent', color: hasChanges ? '#fff' : 'var(--text-bright)', borderRadius: '8px', padding: '0.45rem 0.9rem', fontWeight: 700, cursor: saving || !hasChanges ? 'not-allowed' : 'pointer', opacity: saving ? 0.6 : 1, fontSize: '0.82rem' }}>
            {saving ? 'Saving…' : '💾 Save'}
          </button>
        </div>
      </div>

      {/* 3-column body */}
      <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr 360px', gap: '0.75rem', alignItems: 'start' }}>

        {/* ── Left: Theme list ─────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', paddingBottom: '0.25rem' }}>Themes ({items.length})</div>
          {items.map(item => (
            <div key={item.id} style={{ position: 'relative' }}>
              <button type="button" onClick={() => setSelectedId(item.id)}
                style={{ width: '100%', textAlign: 'left', border: `2px solid ${item.id === selectedId ? '#e94560' : 'var(--border)'}`, borderRadius: '9px', padding: '0.5rem 0.65rem', background: item.id === selectedId ? 'var(--bg-surface)' : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.45rem', color: 'var(--text-bright)', fontSize: '0.82rem', fontWeight: item.id === selectedId ? 700 : 500 }}>
                <span style={{ display: 'flex', gap: '2px', flexShrink: 0 }}>
                  {[item.tokens.bg, item.tokens.accent, item.tokens.success].map((c, i) => (
                    <span key={i} style={{ width: '9px', height: '9px', borderRadius: '50%', background: c, border: '1px solid rgba(0,0,0,0.2)', display: 'inline-block' }} />
                  ))}
                </span>
                <span style={{ flex: 1, overflow: 'hidden', minWidth: 0, display: 'flex', flexDirection: 'column', gap: '1px' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                  <span style={{ fontSize: '0.65rem', fontWeight: 400, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace', opacity: 0.8 }}>{item.id}</span>
                </span>
                {!item.enabled && <span style={{ fontSize: '0.58rem', opacity: 0.5 }}>off</span>}
              </button>
              {items.length > 1 && item.id === selectedId && (
                <button type="button" onClick={() => removeTheme(item.id)} title="Delete"
                  style={{ position: 'absolute', right: '6px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 0, color: '#fda4af', cursor: 'pointer', fontSize: '0.72rem', padding: '1px 4px', lineHeight: 1 }}>✕</button>
              )}
            </div>
          ))}
          <button type="button" onClick={addTheme}
            style={{ border: '1px dashed var(--border)', borderRadius: '9px', padding: '0.45rem', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, marginTop: '0.15rem' }}>
            ➕ Add theme
          </button>
        </div>

        {/* ── Center: Editor ───────────────────── */}
        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {/* Meta row */}
            <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '10px', padding: '0.65rem 0.85rem', display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 2, minWidth: '120px' }}>
                <span style={labelStyle}>Theme name</span>
                <input value={selected.name} onChange={e => patchItem({ name: e.target.value })} style={inputStyle} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1, minWidth: '80px' }}>
                <span style={labelStyle}>ID</span>
                <input value={selected.id} readOnly style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }} />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', color: 'var(--text-muted)', flexShrink: 0 }}>
                <input type="checkbox" checked={selected.enabled} onChange={() => patchItem({ enabled: !selected.enabled })} /> Enabled
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flexShrink: 0 }}>
                <span style={labelStyle}>Load preset</span>
                <select defaultValue="" onChange={e => { if (e.target.value) { loadPreset(e.target.value); e.currentTarget.value = '' } }} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="" disabled>🎨 Preset…</option>
                  {THEME_PRESETS.map(p => <option key={p.key} value={p.key}>{p.label}</option>)}
                </select>
              </label>
            </div>

            {/* 1. Core Colors */}
            <EditorSection title="🎨 Core Colors" open={openSections.colors} toggle={() => toggleSection('colors')}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.6rem' }}>
                <ColorField label="Background" value={t.bg} onChange={v => patch({ bg: v })} />
                <ColorField label="Surface (cards)" value={t.surface} onChange={v => patch({ surface: v })} />
                <ColorField label="Surface 2 (borders)" value={t.surface2} onChange={v => patch({ surface2: v })} />
                <ColorField label="Accent" value={t.accent} onChange={v => patch({ accent: v })} />
                <ColorField label="Text main" value={t.text} onChange={v => patch({ text: v })} />
                <ColorField label="Text dim" value={t.textDim} onChange={v => patch({ textDim: v })} />
                <ColorField label="Success (correct)" value={t.success} onChange={v => patch({ success: v })} />
                <ColorField label="Danger (wrong)" value={t.danger ?? '#c0392b'} onChange={v => patch({ danger: v })} optional />
                <ColorField label="Warning (timer)" value={t.warning ?? '#e67e22'} onChange={v => patch({ warning: v })} optional />
              </div>
            </EditorSection>

            {/* 2. Button Colors */}
            <EditorSection title="🎮 Button Colors" open={openSections.buttons} toggle={() => toggleSection('buttons')}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '0.6rem' }}>
                <ColorField label="Submit bg" value={t.submitBg ?? t.accent} onChange={v => patch({ submitBg: v })} optional />
                <ColorField label="Submit text" value={t.submitText ?? '#ffffff'} onChange={v => patch({ submitText: v })} optional />
                <ColorField label="Pause bg" value={t.pauseBg ?? t.success} onChange={v => patch({ pauseBg: v })} optional />
                <ColorField label="Pause text" value={t.pauseText ?? '#ffffff'} onChange={v => patch({ pauseText: v })} optional />
                <ColorField label="End Game bg" value={t.dangerBg ?? '#c0392b'} onChange={v => patch({ dangerBg: v })} optional />
                <ColorField label="End Game text" value={t.dangerText ?? '#ffffff'} onChange={v => patch({ dangerText: v })} optional />
              </div>
            </EditorSection>

            {/* 3. Typography */}
            <EditorSection title="🔤 Typography" open={openSections.typography} toggle={() => toggleSection('typography')}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <FontSelector label="Heading font" value={t.headingFont} onChange={v => patch({ headingFont: v || undefined })} />
                <FontSelector label="Body font" value={t.bodyFont} onChange={v => patch({ bodyFont: v || undefined })} />
              </div>
              <p style={{ margin: '0.45rem 0 0', fontSize: '0.72rem', color: 'var(--text-muted)' }}>Fonts load from Google Fonts. Arabic fonts (Tajawal, Cairo…) support RTL.</p>
            </EditorSection>

            {/* 4. Background */}
            <EditorSection title="🖼 Background & Pattern" open={openSections.background} toggle={() => toggleSection('background')}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <span style={labelStyle}>Pattern type</span>
                  <select value={t.bgPattern ?? 'none'} onChange={e => patch({ bgPattern: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
                    {BG_PATTERNS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                  </select>
                </label>
                {(t.bgPattern && t.bgPattern !== 'none' && t.bgPattern !== 'custom') && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', alignItems: 'end' }}>
                    <ColorField label="Pattern color" value={t.bgPatternColor ?? t.surface2} onChange={v => patch({ bgPatternColor: v })} optional />
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                      <span style={labelStyle}>Opacity ({Math.round((t.bgPatternOpacity ?? 0.25) * 100)}%)</span>
                      <input type="range" min={0} max={1} step={0.05} value={t.bgPatternOpacity ?? 0.25}
                        onChange={e => patch({ bgPatternOpacity: parseFloat(e.target.value) })}
                        style={{ width: '100%', accentColor: '#e94560' }} />
                    </label>
                  </div>
                )}
                {t.bgPattern === 'custom' && (
                  <BgImageUploader
                    value={t.bgImageUrl}
                    onChange={url => patch({ bgImageUrl: url || undefined })}
                    inputStyle={inputStyle}
                    labelStyle={labelStyle}
                  />
                )}
              </div>
            </EditorSection>

            {/* 5. Shapes */}
            <EditorSection title="📐 Shapes & Geometry" open={openSections.shapes} toggle={() => toggleSection('shapes')}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(155px, 1fr))', gap: '0.6rem' }}>
                <ShapeInput label="Card border-radius" value={t.cardRadius} placeholder="12px" onChange={v => patch({ cardRadius: v || undefined })} />
                <ShapeInput label="Button border-radius" value={t.btnRadius} placeholder="10px" onChange={v => patch({ btnRadius: v || undefined })} />
                <ShapeInput label="Submit btn radius" value={t.submitRadius} placeholder="14px" onChange={v => patch({ submitRadius: v || undefined })} />
                <ShapeInput label="Timer shape" value={t.timerRadius} placeholder="50%" onChange={v => patch({ timerRadius: v || undefined })} />
              </div>
              <p style={{ margin: '0.45rem 0 0', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Valid CSS: <code>50%</code> = circle · <code>8px</code> = rounded · <code>0</code> = square
              </p>
            </EditorSection>
          </div>
        )}

        {/* ── Right: Preview ───────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', paddingBottom: '0.25rem' }}>Live Preview</div>
          <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap' }}>
            {PREVIEW_TABS.map(tab => (
              <button key={tab.id} type="button" onClick={() => setPreviewTab(tab.id)}
                style={{ border: `1.5px solid ${previewTab === tab.id ? '#e94560' : 'var(--border)'}`, background: previewTab === tab.id ? '#e94560' : 'transparent', color: previewTab === tab.id ? '#fff' : 'var(--text-muted)', borderRadius: '6px', padding: '0.28rem 0.55rem', fontSize: '0.72rem', fontWeight: 600, cursor: 'pointer' }}>
                {tab.label}
              </button>
            ))}
          </div>
          <div style={{ borderRadius: '12px', overflow: 'hidden', border: '1px solid var(--border)' }}>
            {selected && <ActivePreview t={selected.tokens} />}
          </div>
          {selected && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem', paddingTop: '0.15rem' }}>
              {([['bg', t.bg], ['surface', t.surface], ['accent', t.accent], ['success', t.success], ['danger', t.danger ?? '#c0392b'], ['submit', t.submitBg ?? t.accent]] as [string, string][]).map(([label, c]) => (
                <span key={label} style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                  <span style={{ width: '9px', height: '9px', borderRadius: '2px', background: c, display: 'inline-block', border: '1px solid rgba(0,0,0,0.15)' }} />{label}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

