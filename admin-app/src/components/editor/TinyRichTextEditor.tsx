import { useRef } from 'react'
import { Editor } from '@tinymce/tinymce-react'
import type { Editor as TinyMCEEditor } from 'tinymce'
import { useTinyRichTextEditorConfig } from './useTinyRichTextEditorConfig'

interface TinyRichTextEditorProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  minHeight?: number
  contentPaddingPx?: number
  placeholder?: string
  className?: string
  autoFocus?: boolean
  onReady?: (editor: TinyMCEEditor) => void
  toolbarContainerSelector?: string
}

export function TinyRichTextEditor({
  value,
  onChange,
  disabled = false,
  minHeight = 520,
  contentPaddingPx = 12,
  placeholder = 'Start writing...',
  className,
  autoFocus = false,
  onReady,
  toolbarContainerSelector,
}: TinyRichTextEditorProps) {
  const editorRef = useRef<TinyMCEEditor | null>(null)
  const { apiKey, scriptSrc, init } = useTinyRichTextEditorConfig({
    disabled,
    minHeight,
    contentPaddingPx,
    placeholder,
    toolbarContainerSelector,
  })

  return (
    <div className={className}>
      <Editor
        key={disabled ? 'readonly' : 'editable'}
        apiKey={apiKey}
        licenseKey="gpl"
        tinymceScriptSrc={scriptSrc}
        value={value}
        disabled={disabled}
        init={init}
        onInit={(_event, editor) => {
          editorRef.current = editor
          onReady?.(editor)
          if (autoFocus && !disabled) {
            window.setTimeout(() => {
              editor.focus()
            }, 0)
          }
        }}
        onEditorChange={(content) => onChange(content)}
      />
    </div>
  )
}
