// Suppress console noise from third-party libraries in dev mode.
// Must be imported BEFORE react-dom so it runs first.
if (import.meta.env.DEV) {
  const SUPPRESS = [
    'Download the React DevTools',
    '[CE.SDK]',
    '[CreativeEngine]',
    'Engine disposed',
    '╔',
    '[Autosave]',
    '[ThumbnailGenerator]',
    '[ThumbnailCache]',
    '[useProjectStateFromUrl]',
  ]
  const _log = console.log.bind(console)
  const _info = console.info.bind(console)
  const match = (...a: unknown[]) => SUPPRESS.some(s => String(a[0] ?? '').includes(s))
  console.log = (...a) => { if (!match(...a)) _log(...a) }
  console.info = (...a) => { if (!match(...a)) _info(...a) }
}
