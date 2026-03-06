import { type CSSProperties, type ReactNode, useEffect } from 'react'
import { type ThemePaletteTokens } from '../../lib/adminRepo'

// ── Google Font loader ────────────────────────────────────────────────────────
export function loadGoogleFont(name: string) {
  if (!name) return
  const id = `gfont-${name.replace(/\s+/g, '-').toLowerCase()}`
  if (document.getElementById(id)) return
  const link = document.createElement('link')
  link.id = id
  link.rel = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name)}:wght@400;600;700&display=swap`
  document.head.appendChild(link)
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ]
}

function hexAlpha(hex: string, alpha: number): string {
  try {
    const [r, g, b] = hexToRgb(hex)
    return `rgba(${r},${g},${b},${alpha})`
  } catch {
    return hex
  }
}

export function getPatternStyle(t: ThemePaletteTokens): CSSProperties {
  const pc = t.bgPatternColor ?? t.surface2
  const op = t.bgPatternOpacity ?? 0.25
  switch (t.bgPattern) {
    case 'dots':
      return {
        background: t.bg,
        backgroundImage: `radial-gradient(circle, ${hexAlpha(pc, op)} 1.5px, transparent 1.5px)`,
        backgroundSize: '22px 22px',
      }
    case 'grid':
      return {
        background: t.bg,
        backgroundImage: `linear-gradient(${hexAlpha(pc, op)} 1px, transparent 1px), linear-gradient(90deg, ${hexAlpha(pc, op)} 1px, transparent 1px)`,
        backgroundSize: '24px 24px',
      }
    case 'stripes':
      return {
        background: t.bg,
        backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, ${hexAlpha(pc, op)} 10px, ${hexAlpha(pc, op)} 11px)`,
      }
    case 'dunes': {
      const c1 = hexAlpha(pc, op * 0.5)
      const c2 = hexAlpha(pc, op)
      return { background: `linear-gradient(180deg, ${t.bg} 0%, ${t.bg} 55%, ${c1} 80%, ${c2} 100%)` }
    }
    case 'custom':
      if (t.bgImageUrl) return { background: `${t.bg} url("${t.bgImageUrl}") center / cover no-repeat` }
      return { background: t.bg }
    default:
      return { background: t.bg }
  }
}

function fontStyle(t: ThemePaletteTokens, heading = false): CSSProperties {
  const font = heading ? t.headingFont : t.bodyFont
  return font ? { fontFamily: `'${font}', sans-serif` } : {}
}

// ── Shared wrapper ─────────────────────────────────────────────────────────────
function PreviewShell({ t, children }: { t: ThemePaletteTokens; children: ReactNode }) {
  useEffect(() => {
    if (t.headingFont) loadGoogleFont(t.headingFont)
    if (t.bodyFont && t.bodyFont !== t.headingFont) loadGoogleFont(t.bodyFont)
  }, [t.headingFont, t.bodyFont])

  const cr = t.cardRadius ?? '12px'
  const br = t.btnRadius ?? '10px'

  return (
    <div style={{ ...getPatternStyle(t), color: t.text, padding: '0.9rem', borderRadius: cr, minHeight: '480px', display: 'flex', flexDirection: 'column', gap: '0.6rem', ...fontStyle(t), position: 'relative', overflow: 'hidden' }}>
      {/* Header bar */}
      <div style={{ background: hexAlpha(t.surface2, 0.85), borderRadius: br, padding: '0.4rem 0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
          <div style={{ background: hexAlpha(t.surface, 0.6), borderRadius: '6px', padding: '0.2rem 0.5rem', fontSize: '0.65rem', fontWeight: 700, color: t.textDim }}>Demo</div>
          <span style={{ fontSize: '0.65rem', color: t.textDim }}>Q 3 / 10 · CLASSIC</span>
        </div>
        <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
          <div style={{ background: t.accent, borderRadius: t.timerRadius ?? '50%', width: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, color: '#fff' }}>18</div>
          <span style={{ color: hexAlpha(t.accent, 0.7), fontSize: '0.65rem' }}>0 pts</span>
        </div>
      </div>
      {children}
      {/* Buttons row */}
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
          <button type="button" style={{ background: t.pauseBg ?? t.success, color: t.pauseText ?? '#fff', border: 0, borderRadius: br, padding: '0.55rem 0', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', ...fontStyle(t) }}>
            ⏸ Pause
          </button>
          <button type="button" style={{ background: t.dangerBg ?? '#c0392b', color: t.dangerText ?? '#fff', border: 0, borderRadius: br, padding: '0.55rem 0', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', ...fontStyle(t) }}>
            ■ End Game
          </button>
        </div>
        <button type="button" style={{ width: '100%', background: t.submitBg ?? t.accent, color: t.submitText ?? '#fff', border: 0, borderRadius: t.submitRadius ?? '14px', padding: '0.65rem', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', ...fontStyle(t, true) }}>
          ✓ تأكيد الإجابة
        </button>
      </div>
    </div>
  )
}

// ── MCQ Preview ────────────────────────────────────────────────────────────────
export function PreviewMCQ({ t }: { t: ThemePaletteTokens }) {
  const choices = ['مكة المكرمة', 'المدينة المنورة', 'القدس', 'دمشق']
  const correct = 1
  const cr = t.cardRadius ?? '12px'
  return (
    <PreviewShell t={t}>
      <div style={{ background: t.surface, borderRadius: cr, border: `1.5px solid ${t.surface2}`, padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 700, fontSize: '0.88rem', ...fontStyle(t, true) }}>
        ما هي عاصمة المملكة العربية السعودية؟
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
        {choices.map((c, i) => (
          <button key={c} type="button" style={{
            background: i === correct ? hexAlpha(t.success, 0.25) : t.surface,
            color: t.text,
            border: `2px solid ${i === correct ? t.success : t.surface2}`,
            borderRadius: cr,
            padding: '0.55rem 0.5rem',
            fontWeight: i === correct ? 700 : 500,
            fontSize: '0.78rem',
            cursor: 'pointer',
            textAlign: 'center',
            ...fontStyle(t),
          }}>
            {c}
          </button>
        ))}
      </div>
    </PreviewShell>
  )
}

// ── Drag-to-Match Preview ──────────────────────────────────────────────────────
export function PreviewDragMatch({ t }: { t: ThemePaletteTokens }) {
  const cr = t.cardRadius ?? '12px'
  const zones = ['الهجرة النبوية', 'فتح مكة', 'معركة بدر', 'غزوة أحد']
  const chips = ['السنة الثالثة هجري', 'السنة الثامنة هجري', 'السنة الثانية هجري']
  return (
    <PreviewShell t={t}>
      <div style={{ background: t.surface, borderRadius: cr, border: `1.5px solid ${t.surface2}`, padding: '0.65rem 1rem', textAlign: 'center', fontWeight: 700, fontSize: '0.85rem', ...fontStyle(t, true) }}>
        طابق كل حدث بتاريخه الهجري التقريبي
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', flex: 1 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {zones.map(z => (
            <div key={z}>
              <div style={{ fontSize: '0.6rem', color: t.textDim, marginBottom: '2px', textAlign: 'right', paddingRight: '2px', ...fontStyle(t) }}>{z}</div>
              <div style={{ border: `1.5px dashed ${t.surface2}`, borderRadius: '6px', minHeight: '28px', background: hexAlpha(t.surface, 0.6) }} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', paddingTop: '18px' }}>
          {chips.map(chip => (
            <div key={chip} style={{ background: t.accent, color: '#fff', borderRadius: '6px', padding: '0.35rem 0.5rem', textAlign: 'center', fontSize: '0.67rem', fontWeight: 600, cursor: 'grab', ...fontStyle(t) }}>{chip}</div>
          ))}
        </div>
      </div>
    </PreviewShell>
  )
}

// ── True/False Preview ─────────────────────────────────────────────────────────
export function PreviewTrueFalse({ t }: { t: ThemePaletteTokens }) {
  const cr = t.cardRadius ?? '12px'
  return (
    <PreviewShell t={t}>
      <div style={{ background: t.surface, borderRadius: cr, border: `1.5px solid ${t.surface2}`, padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 700, fontSize: '0.88rem', ...fontStyle(t, true) }}>
        الأرض هي الكوكب الأقرب إلى الشمس في المجموعة الشمسية
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', flex: 1 }}>
        <button type="button" style={{ background: hexAlpha(t.success, 0.2), border: `2px solid ${t.success}`, borderRadius: cr, padding: '1rem 0', fontWeight: 800, fontSize: '1.1rem', cursor: 'pointer', color: t.text, ...fontStyle(t, true) }}>
          ✓ صحيح
        </button>
        <button type="button" style={{ background: hexAlpha(t.danger ?? '#c0392b', 0.15), border: `2px solid ${t.danger ?? '#c0392b'}`, borderRadius: cr, padding: '1rem 0', fontWeight: 800, fontSize: '1.1rem', cursor: 'pointer', color: t.text, ...fontStyle(t, true) }}>
          ✗ خطأ
        </button>
      </div>
    </PreviewShell>
  )
}

// ── Open-text Preview ──────────────────────────────────────────────────────────
export function PreviewOpenText({ t }: { t: ThemePaletteTokens }) {
  const cr = t.cardRadius ?? '12px'
  return (
    <PreviewShell t={t}>
      <div style={{ background: t.surface, borderRadius: cr, border: `1.5px solid ${t.surface2}`, padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 700, fontSize: '0.88rem', ...fontStyle(t, true) }}>
        ما هو اسم النبي الذي بنى الكعبة مع ابنه؟
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        <textarea
          readOnly
          value="إبراهيم عليه السلام"
          rows={3}
          style={{ background: t.surface, border: `2px solid ${t.accent}`, borderRadius: cr, color: t.text, padding: '0.65rem', fontSize: '0.85rem', resize: 'none', outline: 'none', textAlign: 'right', ...fontStyle(t) }}
        />
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {['الأنبياء', 'القرآن', 'التاريخ'].map(hint => (
            <span key={hint} style={{ background: hexAlpha(t.accent, 0.18), color: t.accent, border: `1px solid ${hexAlpha(t.accent, 0.4)}`, borderRadius: '999px', padding: '0.2rem 0.55rem', fontSize: '0.68rem', fontWeight: 600, ...fontStyle(t) }}>{hint}</span>
          ))}
        </div>
      </div>
    </PreviewShell>
  )
}

// ── Ordering Preview ───────────────────────────────────────────────────────────
export function PreviewOrdering({ t }: { t: ThemePaletteTokens }) {
  const cr = t.cardRadius ?? '12px'
  const items = ['الهجرة النبوية', 'فتح مكة', 'معركة بدر', 'غزوة أحد']
  return (
    <PreviewShell t={t}>
      <div style={{ background: t.surface, borderRadius: cr, border: `1.5px solid ${t.surface2}`, padding: '0.65rem 1rem', textAlign: 'center', fontWeight: 700, fontSize: '0.85rem', ...fontStyle(t, true) }}>
        رتّب الأحداث التالية زمنياً من الأقدم إلى الأحدث
      </div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
        {items.map((item, i) => (
          <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: t.surface, border: `1.5px solid ${t.surface2}`, borderRadius: '8px', padding: '0.4rem 0.65rem' }}>
            <span style={{ background: hexAlpha(t.accent, 0.2), color: t.accent, borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, flexShrink: 0 }}>{i + 1}</span>
            <span style={{ flex: 1, textAlign: 'right', fontSize: '0.78rem', fontWeight: 600, ...fontStyle(t) }}>{item}</span>
            <span style={{ color: t.textDim, fontSize: '0.7rem', cursor: 'grab' }}>⠿</span>
          </div>
        ))}
      </div>
    </PreviewShell>
  )
}

// ── Export map ─────────────────────────────────────────────────────────────────
export const PREVIEW_TABS = [
  { id: 'mcq',   label: 'MCQ',      component: PreviewMCQ },
  { id: 'drag',  label: 'Drag',     component: PreviewDragMatch },
  { id: 'tf',    label: 'True/False', component: PreviewTrueFalse },
  { id: 'open',  label: 'Open Text', component: PreviewOpenText },
  { id: 'order', label: 'Ordering', component: PreviewOrdering },
] as const

export type PreviewTabId = typeof PREVIEW_TABS[number]['id']
