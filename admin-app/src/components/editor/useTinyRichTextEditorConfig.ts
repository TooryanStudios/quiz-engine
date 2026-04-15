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
    statusbar: true,
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
      'wordcount',
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
      'removeformat',
      'code',
    ].join(' | '),
    block_formats: 'Paragraph=p; Heading 1=h1; Heading 2=h2; Heading 3=h3; Heading 4=h4',
    font_size_formats: '12px 14px 16px 18px 20px 24px 28px 32px',
    font_family_formats: [
      "Tajawal=Tajawal, Arial, sans-serif",
      "Vazirmatn=Vazirmatn, Arial, sans-serif",
      "Segoe UI=Segoe UI, Arial, sans-serif",
      "Arial=Arial, Helvetica, sans-serif",
      "Times New Roman=Times New Roman, Times, serif",
      "Courier New=Courier New, Courier, monospace",
    ].join(';'),
    contextmenu: 'link image table',
    image_caption: true,
    directionality: 'rtl',
    placeholder,
    content_style: [
      "body {",
      "  font-family: 'Tajawal', 'Vazirmatn', 'Segoe UI', system-ui, sans-serif;",
      '  font-size: 14px;',
      '  line-height: 1.7;',
      '  color: #1f355f;',
      '  margin: 12px;',
      '  direction: rtl;',
      '  text-align: right;',
      '}',
    ].join(' '),
  }), [minHeight, placeholder])

  return { apiKey, scriptSrc, init }
}
