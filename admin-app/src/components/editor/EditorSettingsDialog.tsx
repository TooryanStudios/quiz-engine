import './EditorSettingsDialog.css'

type EditorSettingsDialogProps = {
  quizId: string | null
  onClose: () => void
  onOpenMetadata: () => void
  onPreviewQuiz: () => void
  onCopyLink: () => void
  onShareLink: () => void
  onDeleteQuiz: () => void
  onCreateNew: () => void
  onOpenExisting: () => void
  onRecheckAI?: () => void
  onGenerateAI?: () => void
  isGeneratingAI?: boolean
  isRecheckingAI?: boolean
}

export function EditorSettingsDialog({
  quizId,
  onClose,
  onOpenMetadata,
  onPreviewQuiz,
  onCopyLink,
  onShareLink,
  onDeleteQuiz,
  onCreateNew,
  onOpenExisting,
  onRecheckAI,
  onGenerateAI,
  isGeneratingAI,
  isRecheckingAI,
}: EditorSettingsDialogProps) {
  const hasQuiz = !!quizId

  return (
    <div className="editor-settings-backdrop" onClick={onClose}>
      <div className="editor-settings-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="editor-settings-header">
          <h2 className="editor-settings-title">⚙️ إعدادات المحرر</h2>
          <button className="editor-settings-close" onClick={onClose} aria-label="إغلاق">
            ✕
          </button>
        </div>

        <div className="editor-settings-body">
          {/* File Actions */}
          <div className="editor-settings-section">
            <div className="editor-settings-section-title">الملف</div>
            <div className="editor-settings-section-grid">
              {hasQuiz && (
                <button
                  type="button"
                  onClick={() => { onOpenMetadata(); onClose() }}
                  className="editor-settings-item"
                >
                  <span className="item-icon">⚙️</span>
                  <span className="item-label">الإعدادات</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => { onCreateNew(); onClose() }}
                className="editor-settings-item"
              >
                <span className="item-icon">📄</span>
                <span className="item-label">اختبار جديد</span>
              </button>
              <button
                type="button"
                onClick={() => { onOpenExisting(); onClose() }}
                className="editor-settings-item"
              >
                <span className="item-icon">📂</span>
                <span className="item-label">فتح اختبار</span>
              </button>
              {hasQuiz && (
                <button
                  type="button"
                  onClick={() => { onPreviewQuiz(); onClose() }}
                  className="editor-settings-item"
                >
                  <span className="item-icon">👁️</span>
                  <span className="item-label">معاينة الاختبار</span>
                </button>
              )}
            </div>
          </div>

          {/* AI Actions */}
          {(onGenerateAI || onRecheckAI) && (
            <div className="editor-settings-section">
              <div className="editor-settings-section-title">الذكاء الاصطناعي</div>
              <div className="editor-settings-section-grid">
                {onGenerateAI && (
                  <button
                    type="button"
                    onClick={() => { onGenerateAI(); onClose() }}
                    disabled={!!isGeneratingAI}
                    className="editor-settings-item"
                  >
                    <span className="item-icon">✨</span>
                    <span className="item-label">{isGeneratingAI ? 'جارٍ التوليد...' : 'توليد ذكي'}</span>
                  </button>
                )}
                {onRecheckAI && (
                  <button
                    type="button"
                    onClick={() => { onRecheckAI(); onClose() }}
                    disabled={!!isRecheckingAI}
                    className="editor-settings-item"
                  >
                    <span className="item-icon">🛡️</span>
                    <span className="item-label">{isRecheckingAI ? 'جارٍ التدقيق...' : 'تدقيق الأسئلة'}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Share Actions */}
          {hasQuiz && (
            <div className="editor-settings-section">
              <div className="editor-settings-section-title">المشاركة</div>
              <div className="editor-settings-section-grid">
                <button
                  type="button"
                  onClick={() => { onCopyLink(); onClose() }}
                  className="editor-settings-item"
                >
                  <span className="item-icon">🔗</span>
                  <span className="item-label">نسخ الرابط</span>
                </button>
                <button
                  type="button"
                  onClick={() => { onShareLink(); onClose() }}
                  className="editor-settings-item"
                >
                  <span className="item-icon">📤</span>
                  <span className="item-label">مشاركة</span>
                </button>
              </div>
            </div>
          )}

          {/* Danger Zone */}
          {hasQuiz && (
            <div className="editor-settings-section">
              <div className="editor-settings-section-title danger">منطقة الخطر</div>
              <div className="editor-settings-section-grid">
                <button
                  type="button"
                  onClick={() => { onDeleteQuiz(); onClose() }}
                  className="editor-settings-item danger"
                >
                  <span className="item-icon">🗑️</span>
                  <span className="item-label">حذف الاختبار</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
