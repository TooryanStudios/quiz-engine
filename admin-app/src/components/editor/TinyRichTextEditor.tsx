import { useRef } from 'react'
import { Editor } from '@tinymce/tinymce-react'
import type { Editor as TinyMCEEditor } from 'tinymce'
import { useTinyRichTextEditorConfig } from './useTinyRichTextEditorConfig'

interface TinyRichTextEditorProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  minHeight?: number
  placeholder?: string
  className?: string
  autoFocus?: boolean
  onReady?: (editor: TinyMCEEditor) => void
}

export function TinyRichTextEditor({
  value,
  onChange,
  disabled = false,
  minHeight = 520,
  placeholder = 'Start writing...',
  className,
  autoFocus = false,
  onReady,
}: TinyRichTextEditorProps) {
  const editorRef = useRef<TinyMCEEditor | null>(null)
  const { apiKey, scriptSrc, init } = useTinyRichTextEditorConfig({
    disabled,
    minHeight,
    placeholder,
  })

  return (
    <div className={className}>
      <Editor
        apiKey={apiKey}
        licenseKey="gpl"
        tinymceScriptSrc={scriptSrc}
        value={value}
        disabled={disabled}
        init={init}
        onInit={(_event, editor) => {
          editorRef.current = editor
          onReady?.(editor)
          if (!autoFocus || disabled) return
          window.setTimeout(() => {
            editor.focus()
          }, 0)
        }}
        onEditorChange={(content) => onChange(content)}
      />
    </div>
  )
}
