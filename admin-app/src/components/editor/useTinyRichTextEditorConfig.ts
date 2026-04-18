import { useMemo } from 'react'
import type { IAllProps } from '@tinymce/tinymce-react'

type TinyInitOptions = NonNullable<IAllProps['init']>

export interface UseTinyRichTextEditorConfigInput {
  disabled?: boolean
  minHeight?: number
  placeholder?: string
}

export interface UseTinyRichTextEditorConfigOutput {
  apiKey?: string
  scriptSrc?: string
  init: TinyInitOptions
}

export function useTinyRichTextEditorConfig({
  minHeight = 520,
  placeholder = 'Start writing...',
}: UseTinyRichTextEditorConfigInput): UseTinyRichTextEditorConfigOutput {
  const deploymentModeRaw = (import.meta.env.VITE_TINYMCE_DEPLOYMENT_MODE as string | undefined)?.trim().toLowerCase()
  const cloudApiKey = (import.meta.env.VITE_TINYMCE_API_KEY as string | undefined)?.trim()
  const scriptSrcOverride = (import.meta.env.VITE_TINYMCE_SCRIPT_SRC as string | undefined)?.trim()
  const useCloud = deploymentModeRaw === 'cloud' && !!cloudApiKey

  // Default is self-hosted TinyMCE (free under GPL) to avoid cloud key prompts.
  const apiKey = useCloud ? cloudApiKey : undefined
  const scriptSrc = scriptSrcOverride || (useCloud ? undefined : '/tinymce/tinymce.min.js')

  const init = useMemo<TinyInitOptions>(() => ({
    menubar: false,
    branding: false,
    promotion: false,
    statusbar: false,
    elementpath: false,
    resize: false,
    min_height: minHeight,
    // Use horizontal scroll on narrow screens instead of wrapping controls.
    toolbar_mode: 'scrolling',
    toolbar_sticky: true,
    browser_spellcheck: true,
    convert_urls: false,
    plugins: [
      'advlist',
      'autolink',
      'lists',
      'link',
      'image',
      'table',
      'charmap',
      'searchreplace',
      'visualblocks',
      'directionality',
      'code',
    ],
    toolbar: [
      'undo redo',
      'blocks fontfamily fontsize',
      'bold italic underline strikethrough forecolor backcolor',
      'alignleft aligncenter alignright alignjustify',
      'bullist numlist checklist outdent indent',
      'link image table charmap',
      'ltr rtl',
      'removeformat linespacing',
      'code',
    ].join(' | '),
    block_formats: 'Paragraph=p; Heading 1=h1; Heading 2=h2; Heading 3=h3; Heading 4=h4',
    font_size_formats: '12px 14px 16px 18px 20px 24px 28px 32px',
    font_family_formats: [
      'Inherit=inherit',
      // Arabic / RTL
      "Tajawal=Tajawal, Arial, sans-serif",
      "Cairo=Cairo, Arial, sans-serif",
      "Almarai=Almarai, Arial, sans-serif",
      "Vazirmatn=Vazirmatn, Arial, sans-serif",
      "Reem Kufi=Reem Kufi, Arial, sans-serif",
      "Amiri=Amiri, Georgia, serif",
      "Noto Sans Arabic=Noto Sans Arabic, Arial, sans-serif",
      "IBM Plex Sans Arabic=IBM Plex Sans Arabic, Arial, sans-serif",
      // Latin / general
      "Segoe UI=Segoe UI, Arial, sans-serif",
      "Arial=Arial, Helvetica, sans-serif",
      "Times New Roman=Times New Roman, Times, serif",
      "Courier New=Courier New, Courier, monospace",
    ].join(';'),
    contextmenu: 'link image table',
    image_caption: true,
    directionality: 'rtl',
    placeholder,
    setup: (editor) => {
      // Register line-spacing formatter names
      editor.on('init', () => {
        editor.formatter.register('linespacing_1', { selector: 'p,h1,h2,h3,h4,h5,h6,li,td,th,div', styles: { lineHeight: '1' }, remove_similar: true })
        editor.formatter.register('linespacing_1_2', { selector: 'p,h1,h2,h3,h4,h5,h6,li,td,th,div', styles: { lineHeight: '1.2' }, remove_similar: true })
        editor.formatter.register('linespacing_1_4', { selector: 'p,h1,h2,h3,h4,h5,h6,li,td,th,div', styles: { lineHeight: '1.4' }, remove_similar: true })
        editor.formatter.register('linespacing_1_6', { selector: 'p,h1,h2,h3,h4,h5,h6,li,td,th,div', styles: { lineHeight: '1.6' }, remove_similar: true })
        editor.formatter.register('linespacing_1_8', { selector: 'p,h1,h2,h3,h4,h5,h6,li,td,th,div', styles: { lineHeight: '1.8' }, remove_similar: true })
        editor.formatter.register('linespacing_2', { selector: 'p,h1,h2,h3,h4,h5,h6,li,td,th,div', styles: { lineHeight: '2' }, remove_similar: true })
        editor.formatter.register('linespacing_reset', { selector: 'p,h1,h2,h3,h4,h5,h6,li,td,th,div', styles: { lineHeight: '' }, remove_similar: true })
      })

      // Custom line-spacing split-button dropdown
      editor.ui.registry.addMenuButton('linespacing', {
        icon: 'line-height',
        tooltip: 'Line spacing',
        fetch: (callback) => {
          callback([
            { type: 'menuitem', text: 'Default (1.7)', onAction: () => editor.formatter.apply('linespacing_reset') },
            { type: 'menuitem', text: '1.0 — Tight', onAction: () => editor.formatter.apply('linespacing_1') },
            { type: 'menuitem', text: '1.2', onAction: () => editor.formatter.apply('linespacing_1_2') },
            { type: 'menuitem', text: '1.4', onAction: () => editor.formatter.apply('linespacing_1_4') },
            { type: 'menuitem', text: '1.6', onAction: () => editor.formatter.apply('linespacing_1_6') },
            { type: 'menuitem', text: '1.8', onAction: () => editor.formatter.apply('linespacing_1_8') },
            { type: 'menuitem', text: '2.0 — Double', onAction: () => editor.formatter.apply('linespacing_2') },
          ])
        },
      })
    },
    content_style: [
      "@import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@400;700&family=Cairo:wght@400;700&family=Almarai:wght@400;700&family=Vazirmatn:wght@400;700&family=Reem+Kufi:wght@400;700&family=Amiri:ital,wght@0,400;0,700;1,400&family=Noto+Sans+Arabic:wght@400;700&family=IBM+Plex+Sans+Arabic:wght@400;700&display=swap');",
      "body {",
      "  font-family: 'Tajawal', 'Vazirmatn', 'Segoe UI', system-ui, sans-serif;",
      '  font-size: 14px;',
      '  line-height: 1.7;',
      '  color: #1f355f;',
      '  margin: 0;',
      '  padding: 12px;',
      '  direction: rtl;',
      '  text-align: right;',
      '  scrollbar-width: thin;',
      '  scrollbar-color: #c2d0e8 transparent;',
      '}',
      'html {',
      '  overflow-y: scroll;',
      '  direction: rtl;',
      '  scrollbar-width: thin;',
      '  scrollbar-color: #c2d0e8 transparent;',
      '}',
      'body { direction: rtl; }',
      '::-webkit-scrollbar { width: 5px; }',
      '::-webkit-scrollbar-track { background: transparent; }',
      '::-webkit-scrollbar-thumb { background: #c2d0e8; border-radius: 99px; }',
      '::-webkit-scrollbar-thumb:hover { background: #a0b4d6; }',
    ].join(' '),
  }), [minHeight, placeholder])

  return { apiKey, scriptSrc, init }
}
