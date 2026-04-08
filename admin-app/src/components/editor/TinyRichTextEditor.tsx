import { Editor } from '@tinymce/tinymce-react'
import { useTinyRichTextEditorConfig } from './useTinyRichTextEditorConfig'

interface TinyRichTextEditorProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  minHeight?: number
  placeholder?: string
  className?: string
}

export function TinyRichTextEditor({
  value,
  onChange,
  disabled = false,
  minHeight = 520,
  placeholder = 'Start writing...',
  className,
}: TinyRichTextEditorProps) {
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
        onEditorChange={(content) => onChange(content)}
      />
    </div>
  )
}
