type EditorHeroTitleInputProps = {
  isNarrowScreen: boolean
  title: string
  onTitleChange: (value: string) => void
}

export function EditorHeroTitleInput({
  isNarrowScreen,
  title,
  onTitleChange,
}: EditorHeroTitleInputProps) {
  return (
    <div className={`editor-hero-title-row${isNarrowScreen ? ' editor-hero-title-row--narrow' : ''}`}>
      <input
        dir="auto"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder="عنوان الاختبار..."
        className="editor-hero-title-input"
      />
      <span className="editor-hero-title-icon" title="قابل للتعديل">✏️</span>
    </div>
  )
}
