type ToolbarPrimaryActionsProps = {
  isMiniGameContent: boolean
  isNarrowScreen: boolean
  isSaving: boolean
  hasUnsavedChanges: boolean
  onAddQuestion: () => void
  onGenerateAI: () => void
  onRecheckAI: () => void
  onSave: () => void
}

export function ToolbarPrimaryActions({
  isMiniGameContent,
  isNarrowScreen,
  isSaving,
  hasUnsavedChanges,
  onAddQuestion,
  onGenerateAI,
  onRecheckAI,
  onSave,
}: ToolbarPrimaryActionsProps) {
  const narrowClass = isNarrowScreen ? ' is-narrow' : ''

  return (
    <>
      {!isMiniGameContent && (
        <button
          type="button"
          onClick={onAddQuestion}
          className={`editor-toolbar-icon-btn editor-toolbar-primary${narrowClass}`}
          title="إضافة سؤال جديد"
        >
          <span className="editor-toolbar-icon">➕</span>
          <span className="editor-toolbar-label">إضافة</span>
        </button>
      )}

      <button
        type="button"
        onClick={onGenerateAI}
        className={`editor-toolbar-icon-btn${narrowClass}`}
        title="توليد ذكي"
      >
        <span className="editor-toolbar-icon">✨</span>
        <span className="editor-toolbar-label">توليد ذكي</span>
      </button>

      <button
        type="button"
        onClick={onRecheckAI}
        className={`editor-toolbar-icon-btn${narrowClass}`}
        title="تدقيق ذكي"
      >
        <span className="editor-toolbar-icon">🛡️</span>
        <span className="editor-toolbar-label">تدقيق</span>
      </button>

      <div className="editor-toolbar-spacer" />

      <button
        type="button"
        onClick={onSave}
        disabled={isSaving}
        className={`editor-toolbar-icon-btn editor-toolbar-save${hasUnsavedChanges ? ' is-dirty' : ''}${narrowClass}`}
        title={hasUnsavedChanges ? 'حفظ التغييرات' : 'لا توجد تغييرات'}
      >
        <span className="editor-toolbar-icon">
          {isSaving ? <span className="save-icon-spinning">🔄</span> : '💾'}
        </span>
        <span className="editor-toolbar-label">حفظ</span>
      </button>
    </>
  )
}
