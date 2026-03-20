import { useEffect, useMemo } from 'react'
import { type ThemePaletteTokens, themeTokensToCssVars } from '../../lib/adminRepo'

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

function guessBaseTheme(bgColor?: string): 'light' | 'dark' {
  if (!bgColor) return 'dark'
  const hex = bgColor.replace('#', '').trim()
  if (hex.length !== 6) return 'dark'
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  if (Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) return 'dark'
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? 'light' : 'dark'
}

function getRuntimeBaseUrl(): string {
  const isLocal = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)
  if (isLocal) return import.meta.env.VITE_LOCAL_GAME_URL || 'http://localhost:3001'
  return import.meta.env.VITE_API_BASE_URL || 'https://play.qyan.app'
}

function buildBgVars(t: ThemePaletteTokens): Record<string, string> {
  const pattern = t.bgPattern || 'none'
  const patternColor = t.bgPatternColor || t.surface2
  const opacity = t.bgPatternOpacity ?? 0.25
  const imageUrl = t.bgImageUrl || ''
  const hasImage = !!imageUrl
  const blurPx = Math.min(Math.max(t.bgBlur ?? 0, 0), 40)
  const overlayColor = t.bgOverlayColor || 'transparent'
  const overlayOpacity = Math.min(Math.max(t.bgOverlayOpacity ?? 0, 0), 1)

  let bgImage = 'none'
  let bgSize = 'cover'
  let bgRepeat = 'no-repeat'
  let bgPosition = 'center center'

  switch (pattern) {
    case 'dots': {
      const patGrad = `radial-gradient(circle, ${hexAlpha(patternColor, opacity)} 1.5px, transparent 1.5px)`
      if (hasImage) {
        // image on top, pattern behind
        bgImage = `url("${imageUrl}"), ${patGrad}`
        bgSize = `auto 100%, 22px 22px`
        bgRepeat = `no-repeat, repeat`
        bgPosition = 'center bottom, center center'
      } else {
        bgImage = patGrad
        bgSize = '22px 22px'
        bgRepeat = 'repeat'
      }
      break
    }
    case 'grid': {
      const patGrad = `linear-gradient(${hexAlpha(patternColor, opacity)} 1px, transparent 1px), linear-gradient(90deg, ${hexAlpha(patternColor, opacity)} 1px, transparent 1px)`
      if (hasImage) {
        bgImage = `url("${imageUrl}"), ${patGrad}`
        bgSize = `auto 100%, 24px 24px`
        bgRepeat = `no-repeat, repeat`
        bgPosition = 'center bottom, center center'
      } else {
        bgImage = patGrad
        bgSize = '24px 24px'
        bgRepeat = 'repeat'
      }
      break
    }
    case 'stripes': {
      const patGrad = `repeating-linear-gradient(45deg, transparent, transparent 10px, ${hexAlpha(patternColor, opacity)} 10px, ${hexAlpha(patternColor, opacity)} 11px)`
      if (hasImage) {
        bgImage = `url("${imageUrl}"), ${patGrad}`
        bgSize = `auto 100%, auto`
        bgRepeat = `no-repeat, repeat`
        bgPosition = 'center bottom, center center'
      } else {
        bgImage = patGrad
        bgRepeat = 'repeat'
      }
      break
    }
    case 'dunes': {
      const patGrad = `linear-gradient(180deg, transparent 0%, transparent 55%, ${hexAlpha(patternColor, opacity * 0.5)} 80%, ${hexAlpha(patternColor, opacity)} 100%)`
      if (hasImage) {
        bgImage = `url("${imageUrl}"), ${patGrad}`
        bgSize = `auto 100%, 100% 100%`
        bgRepeat = `no-repeat, no-repeat`
        bgPosition = 'center bottom, center center'
      } else {
        bgImage = patGrad
        bgSize = '100% 100%'
        bgRepeat = 'no-repeat'
      }
      break
    }
    case 'custom':
      // legacy: treat same as default (image only)
      if (imageUrl) {
        bgImage = `url("${imageUrl}")`
        bgSize = 'auto 100%'
        bgRepeat = 'no-repeat'
        bgPosition = 'center bottom'
      }
      break
    default:
      if (imageUrl) {
        bgImage = `url("${imageUrl}")`
        bgSize = 'auto 100%'
        bgRepeat = 'no-repeat'
        bgPosition = 'center bottom'
      }
      break
  }

  return {
    '--app-bg-image': bgImage,
    '--app-bg-size': bgSize,
    '--app-bg-repeat': bgRepeat,
    '--app-bg-position': bgPosition,
    '--app-bg-blur': `${blurPx}px`,
    '--app-overlay-color': overlayColor,
    '--app-overlay-opacity': String(overlayOpacity),
  }
}

export type PreviewTabId = 'mcq' | 'drag' | 'tf' | 'open' | 'order' | 'lobby' | 'leaderboard' | 'final'

function getQuestionBodyHtml(tab: PreviewTabId): string {
  if (tab === 'drag') {
    return `
      <div id="player-match-container" class="match-container" style="display:block">
        <div class="match-dnd-layout">
          <div class="match-dnd-slots">
            <div class="match-dnd-row"><div class="match-dnd-label">الهجرة النبوية</div><div class="match-dropzone match-dz-empty"><span class="match-drop-hint">drop here</span></div></div>
            <div class="match-dnd-row"><div class="match-dnd-label">فتح مكة</div><div class="match-dropzone match-dz-filled"><span class="match-chip in-slot opt-cyan">السنة الثامنة هجري</span></div></div>
            <div class="match-dnd-row"><div class="match-dnd-label">معركة بدر</div><div class="match-dropzone match-dz-empty"><span class="match-drop-hint">drop here</span></div></div>
          </div>
          <div class="match-dnd-pool">
            <span class="match-pool-label">Drag to match</span>
            <span class="match-chip in-pool opt-violet">السنة الثانية هجري</span>
            <span class="match-chip in-pool opt-amber">السنة الثالثة هجري</span>
          </div>
        </div>
      </div>
    `
  }

  if (tab === 'tf') {
    return `
      <div class="options-grid" id="player-options-grid">
        <button class="option-btn opt-emerald">✓ صحيح</button>
        <button class="option-btn opt-amber">✗ خطأ</button>
      </div>
    `
  }

  if (tab === 'open') {
    return `
      <div id="player-type-container" class="type-container" style="display:block">
        <input id="player-type-input" type="text" value="إبراهيم عليه السلام" readonly />
      </div>
    `
  }

  if (tab === 'order') {
    return `
      <div id="player-order-container" class="order-container" style="display:block">
        <ol class="order-list" id="order-list">
          <li class="order-item"><span class="order-num">1</span><span class="order-label">الهجرة النبوية</span><span class="order-drag-handle">⠿</span></li>
          <li class="order-item"><span class="order-num">2</span><span class="order-label">معركة بدر</span><span class="order-drag-handle">⠿</span></li>
          <li class="order-item"><span class="order-num">3</span><span class="order-label">غزوة أحد</span><span class="order-drag-handle">⠿</span></li>
        </ol>
      </div>
    `
  }

  return `
    <div class="options-grid" id="player-options-grid">
      <button class="option-btn opt-violet"><span class="opt-icon">A</span><span class="opt-text">كيلوغرام (kg)</span></button>
      <button class="option-btn opt-cyan"><span class="opt-icon">B</span><span class="opt-text">نيوتن (N)</span></button>
      <button class="option-btn opt-amber"><span class="opt-icon">C</span><span class="opt-text">جرام (g)</span></button>
      <button class="option-btn opt-emerald"><span class="opt-icon">D</span><span class="opt-text">لتر (L)</span></button>
    </div>
  `
}

function buildRuntimePreviewDocument(t: ThemePaletteTokens, tab: PreviewTabId): string {
  const runtimeBase = getRuntimeBaseUrl()
  const baseTheme = guessBaseTheme(t.bg)

  const vars = {
    ...themeTokensToCssVars(t),
    ...buildBgVars(t),
  }
  if (!vars['--radius'] && t.cardRadius) vars['--radius'] = t.cardRadius

  const varCss = Object.entries(vars)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([name, value]) => `${name}:${String(value)};`)
    .join('')

  const promptByTab: Record<PreviewTabId, string> = {
    mcq: 'ما هي الوحدة المستخدمة لقياس الوزن؟',
    drag: 'طابق كل حدث بالتاريخ المناسب له',
    tf: 'الأرض هي الكوكب الأقرب للشمس',
    open: 'ما اسم النبي الذي بنى الكعبة مع ابنه؟',
    order: 'رتّب الأحداث زمنياً من الأقدم إلى الأحدث',
  }

  return `<!doctype html>
<html data-theme="${baseTheme}" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="${runtimeBase}/css/style.css" />
  <style>
    :root { ${varCss} }
    html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; }
    body {
      display: block !important;
      min-height: auto !important;
      background: var(--bg) !important;
      background-image: var(--app-bg-image, none) !important;
      background-size: var(--app-bg-size, cover) !important;
      background-repeat: var(--app-bg-repeat, no-repeat) !important;
      background-position: var(--app-bg-position, center center) !important;
    }
    #preview-wrap { height: 100%; padding: 10px; }
    #view-player-question { display: flex !important; min-height: 100% !important; padding: 0 6px 10px !important; justify-content: flex-start !important; align-items: center !important; }
    #view-player-question .solo-host-hud-bar { display: flex !important; }
    #player-question-layout { margin-top: 168px !important; width: var(--gameplay-shell-width) !important; max-width: var(--gameplay-shell-width) !important; }
    #player-question-layout .question-header { display: none !important; }
    #btn-submit-answer { display: inline-flex !important; }
  </style>
</head>
<body>
  <div id="preview-wrap">
    <div id="view-player-question" class="view active player-hud-mode solo-host-mode" data-allow-scroll="true">
      <div class="solo-host-hud-bar" id="solo-host-hud-bar">
        <div class="hud-main-row">
          <div class="hud-side hud-side-left hud-stack-controls">
            <button class="hud-icon-btn hud-btn-pause" data-paused="false" aria-label="Pause"><span class="hud-icon">II</span></button>
            <button class="hud-icon-btn hud-btn-end" aria-label="End"><span class="hud-icon">■</span></button>
          </div>
          <div class="hud-center-col">
            <span class="hud-pin-text">ROOM 712883</span>
            <div class="timer-ring hud-timer" id="solo-host-timer-ring" style="--timer-pct:0.65"><span class="timer-count">19</span></div>
            <span class="score-badge player-score-badge"><span class="score-count universal-score-count">0 pts</span></span>
          </div>
          <div class="hud-side hud-side-right hud-stack-utility">
            <span class="hud-conn-indicator" data-state="ok" role="status" aria-label="Connected"></span>
            <button class="hud-icon-btn hud-audio-btn" aria-label="Audio">🔊</button>
          </div>
        </div>
        <div class="hud-meta-row"><span class="hud-q-num">Q 4 / 10</span></div>
        <div class="hud-progress-track" id="player-progress-track">
          <div class="hud-progress-dot done"></div>
          <div class="hud-progress-dot done"></div>
          <div class="hud-progress-dot done"></div>
          <div class="hud-progress-dot current"></div>
          <div class="hud-progress-dot"></div>
          <div class="hud-progress-dot"></div>
          <div class="hud-progress-dot"></div>
          <div class="hud-progress-dot"></div>
          <div class="hud-progress-dot"></div>
          <div class="hud-progress-dot"></div>
        </div>
      </div>

      <div class="question-layout" id="player-question-layout">
        <div class="question-text-box">
          <p class="question-text" id="player-question-text">${promptByTab[tab]}</p>
        </div>
        ${getQuestionBodyHtml(tab)}
        <button id="btn-submit-answer" class="btn btn-success full-width">✔ تأكيد الإجابة</button>
      </div>
    </div>
  </div>
</body>
</html>`
}

function RuntimePreviewFrame({ t, tab }: { t: ThemePaletteTokens; tab: PreviewTabId }) {
  useEffect(() => {
    if (t.headingFont) loadGoogleFont(t.headingFont)
    if (t.bodyFont && t.bodyFont !== t.headingFont) loadGoogleFont(t.bodyFont)
  }, [t.headingFont, t.bodyFont])

  const srcDoc = useMemo(() => buildRuntimePreviewDocument(t, tab), [t, tab])

  return (
    <iframe
      title={`runtime-preview-${tab}`}
      srcDoc={srcDoc}
      style={{ width: '100%', height: '560px', border: 0, display: 'block' }}
    />
  )
}

export function PreviewMCQ({ t }: { t: ThemePaletteTokens }) {
  return <RuntimePreviewFrame t={t} tab="mcq" />
}

export function PreviewDragMatch({ t }: { t: ThemePaletteTokens }) {
  return <RuntimePreviewFrame t={t} tab="drag" />
}

export function PreviewTrueFalse({ t }: { t: ThemePaletteTokens }) {
  return <RuntimePreviewFrame t={t} tab="tf" />
}

export function PreviewOpenText({ t }: { t: ThemePaletteTokens }) {
  return <RuntimePreviewFrame t={t} tab="open" />
}

export function PreviewOrdering({ t }: { t: ThemePaletteTokens }) {
  return <RuntimePreviewFrame t={t} tab="order" />
}

function buildLobbyPreviewDocument(t: ThemePaletteTokens): string {
  const runtimeBase = getRuntimeBaseUrl()
  const baseTheme = guessBaseTheme(t.bg)

  const vars = {
    ...themeTokensToCssVars(t),
    ...buildBgVars(t),
  }
  if (!vars['--radius'] && t.cardRadius) vars['--radius'] = t.cardRadius

  const varCss = Object.entries(vars)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([name, value]) => `${name}:${String(value)};`)
    .join('')

  return `<!doctype html>
<html data-theme="${baseTheme}" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="${runtimeBase}/css/style.css" />
  <style>
    :root { ${varCss} }
    html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; }
    body {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      min-height: auto !important;
      background: var(--bg) !important;
      background-image: var(--app-bg-image, none) !important;
      background-size: var(--app-bg-size, cover) !important;
      background-repeat: var(--app-bg-repeat, no-repeat) !important;
      background-position: var(--app-bg-position, center center) !important;
    }
    .host-lobby-card { max-width: 480px !important; }
  </style>
</head>
<body>
  <div id="view-host-lobby" class="view active">
    <div class="card host-lobby-card">
      <div class="lobby-header">
        <div class="lobby-mode-corner">
          <span class="mode-indicator">🌐 الويب العالمي</span>
        </div>
        <div class="host-header-logo">
          <button type="button" class="host-help-text-btn">ساعدني</button>
        </div>
      </div>
      <div class="lobby-play-mode-switch" dir="rtl">
        <button class="lobby-mode-btn is-active" type="button">👥 اللعب مع فريق</button>
        <button class="lobby-mode-btn" type="button">⚡ اللعب الفردي</button>
      </div>
      <div class="host-pin-qr-row">
        <div class="pin-display">
          <div class="pin-label-row">
            <span class="pin-label">Room PIN</span>
          </div>
          <span class="pin-code">712883</span>
          <div class="host-room-health is-ok">
            <span class="host-room-health-label">✓ Connected</span>
            <span class="host-room-health-detail">Room ready</span>
          </div>
        </div>
      </div>
      <div class="player-list-section">
        <div class="player-list-header">تحدي معلومات عن الصوم <span class="player-count-badge">1</span></div>
        <div class="player-grid">
          <div class="player-card">
            <div class="player-avatar">🎮</div>
            <div class="player-name">Host</div>
          </div>
        </div>
      </div>
      <button class="btn btn-success full-width" style="margin-top: 1rem;">🚀 ابدأ اللعبة</button>
    </div>
  </div>
</body>
</html>`
}

function buildLeaderboardPreviewDocument(t: ThemePaletteTokens): string {
  const runtimeBase = getRuntimeBaseUrl()
  const baseTheme = guessBaseTheme(t.bg)

  const vars = {
    ...themeTokensToCssVars(t),
    ...buildBgVars(t),
  }
  if (!vars['--radius'] && t.cardRadius) vars['--radius'] = t.cardRadius

  const varCss = Object.entries(vars)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([name, value]) => `${name}:${String(value)};`)
    .join('')

  return `<!doctype html>
<html data-theme="${baseTheme}" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="${runtimeBase}/css/style.css" />
  <style>
    :root { ${varCss} }
    html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; }
    body {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      min-height: auto !important;
      background: var(--bg) !important;
      background-image: var(--app-bg-image, none) !important;
      background-size: var(--app-bg-size, cover) !important;
      background-repeat: var(--app-bg-repeat, no-repeat) !important;
      background-position: var(--app-bg-position, center center) !important;
    }
  </style>
</head>
<body>
  <div id="view-leaderboard" class="view active">
    <div class="leaderboard-card">
      <div class="leaderboard-header">
        <h2 class="leaderboard-title">🏆 لوحة المتصدرين</h2>
        <p class="leaderboard-subtitle">السؤال 4 من 10</p>
      </div>
      <div class="leaderboard-list">
        <div class="leaderboard-row rank-1">
          <span class="rank-badge">1</span>
          <span class="player-name">أحمد</span>
          <span class="player-score">850 pts</span>
        </div>
        <div class="leaderboard-row rank-2">
          <span class="rank-badge">2</span>
          <span class="player-name">فاطمة</span>
          <span class="player-score">720 pts</span>
        </div>
        <div class="leaderboard-row rank-3">
          <span class="rank-badge">3</span>
          <span class="player-name">محمد</span>
          <span class="player-score">680 pts</span>
        </div>
        <div class="leaderboard-row">
          <span class="rank-badge">4</span>
          <span class="player-name">سارة</span>
          <span class="player-score">540 pts</span>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`
}

function buildFinalResultPreviewDocument(t: ThemePaletteTokens): string {
  const runtimeBase = getRuntimeBaseUrl()
  const baseTheme = guessBaseTheme(t.bg)

  const vars = {
    ...themeTokensToCssVars(t),
    ...buildBgVars(t),
  }
  if (!vars['--radius'] && t.cardRadius) vars['--radius'] = t.cardRadius

  const varCss = Object.entries(vars)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([name, value]) => `${name}:${String(value)};`)
    .join('')

  return `<!doctype html>
<html data-theme="${baseTheme}" dir="rtl">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="stylesheet" href="${runtimeBase}/css/style.css" />
  <style>
    :root { ${varCss} }
    html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; }
    body {
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      min-height: auto !important;
      background: var(--bg) !important;
      background-image: var(--app-bg-image, none) !important;
      background-size: var(--app-bg-size, cover) !important;
      background-repeat: var(--app-bg-repeat, no-repeat) !important;
      background-position: var(--app-bg-position, center center) !important;
    }
  </style>
</head>
<body>
  <div id="view-final-results" class="view active">
    <div class="final-results-card">
      <div class="final-header">
        <h1 class="final-title">🎉 انتهت اللعبة!</h1>
        <p class="final-subtitle">تحدي معلومات عن الصوم</p>
      </div>
      <div class="final-podium">
        <div class="podium-spot rank-2">
          <div class="podium-player">
            <div class="podium-avatar">👤</div>
            <div class="podium-name">فاطمة</div>
            <div class="podium-score">720 pts</div>
          </div>
          <div class="podium-rank">2</div>
        </div>
        <div class="podium-spot rank-1">
          <div class="podium-player">
            <div class="podium-avatar">🏆</div>
            <div class="podium-name">أحمد</div>
            <div class="podium-score">850 pts</div>
          </div>
          <div class="podium-rank">1</div>
        </div>
        <div class="podium-spot rank-3">
          <div class="podium-player">
            <div class="podium-avatar">👤</div>
            <div class="podium-name">محمد</div>
            <div class="podium-score">680 pts</div>
          </div>
          <div class="podium-rank">3</div>
        </div>
      </div>
      <div class="final-stats">
        <div class="stat-item">
          <span class="stat-label">إجمالي الأسئلة</span>
          <span class="stat-value">10</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">اللاعبون</span>
          <span class="stat-value">4</span>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`
}

function PreviewLobby({ t }: { t: ThemePaletteTokens }) {
  useEffect(() => {
    if (t.headingFont) loadGoogleFont(t.headingFont)
    if (t.bodyFont && t.bodyFont !== t.headingFont) loadGoogleFont(t.bodyFont)
  }, [t.headingFont, t.bodyFont])

  const srcDoc = useMemo(() => buildLobbyPreviewDocument(t), [t])

  return (
    <iframe
      title="lobby-preview"
      srcDoc={srcDoc}
      style={{ width: '100%', height: '560px', border: 0, display: 'block' }}
    />
  )
}

function PreviewLeaderboard({ t }: { t: ThemePaletteTokens }) {
  useEffect(() => {
    if (t.headingFont) loadGoogleFont(t.headingFont)
    if (t.bodyFont && t.bodyFont !== t.headingFont) loadGoogleFont(t.bodyFont)
  }, [t.headingFont, t.bodyFont])

  const srcDoc = useMemo(() => buildLeaderboardPreviewDocument(t), [t])

  return (
    <iframe
      title="leaderboard-preview"
      srcDoc={srcDoc}
      style={{ width: '100%', height: '560px', border: 0, display: 'block' }}
    />
  )
}

function PreviewFinalResult({ t }: { t: ThemePaletteTokens }) {
  useEffect(() => {
    if (t.headingFont) loadGoogleFont(t.headingFont)
    if (t.bodyFont && t.bodyFont !== t.headingFont) loadGoogleFont(t.bodyFont)
  }, [t.headingFont, t.bodyFont])

  const srcDoc = useMemo(() => buildFinalResultPreviewDocument(t), [t])

  return (
    <iframe
      title="final-result-preview"
      srcDoc={srcDoc}
      style={{ width: '100%', height: '560px', border: 0, display: 'block' }}
    />
  )
}

export const PREVIEW_TABS = [
  { id: 'mcq', label: 'MCQ', component: PreviewMCQ },
  { id: 'drag', label: 'Drag', component: PreviewDragMatch },
  { id: 'tf', label: 'True/False', component: PreviewTrueFalse },
  { id: 'open', label: 'Open Text', component: PreviewOpenText },
  { id: 'order', label: 'Ordering', component: PreviewOrdering },
  { id: 'lobby', label: 'Lobby', component: PreviewLobby },
  { id: 'leaderboard', label: 'Leaderboard', component: PreviewLeaderboard },
  { id: 'final', label: 'Final Result', component: PreviewFinalResult },
] as const

