import { ToolbarDropdownMenu } from './ToolbarDropdownMenu'
import { ToolbarPrimaryActions } from './ToolbarPrimaryActions'

type ContentType = 'quiz' | 'mini-game' | 'mix'

type EditorStickyToolbarProps = {
  quizId: string | null
  isMiniGameContent: boolean
  isNarrowScreen: boolean
  contentType: ContentType
  showToolbarDropdown: boolean
  isSaving: boolean
  hasUnsavedChanges: boolean
  onToggleDropdown: () => void
  onCloseDropdown: () => void
  onOpenContentTypePicker: () => void
  onBack: () => void
  onOpenMetadata: () => void
  onPreviewQuiz: () => void
  onCopyLink: () => void
  onShareLink: () => void
  onDeleteQuiz: () => void
  onAddQuestion: () => void
  onGenerateAI: () => void
  onRecheckAI: () => void
  onSave: () => void
}

export function EditorStickyToolbar({
  quizId,
  isMiniGameContent,
  isNarrowScreen,
  contentType,
  showToolbarDropdown,
  isSaving,
  hasUnsavedChanges,
  onToggleDropdown,
  onCloseDropdown,
  onOpenContentTypePicker,
  onBack,
  onOpenMetadata,
  onPreviewQuiz,
  onCopyLink,
  onShareLink,
  onDeleteQuiz,
  onAddQuestion,
  onGenerateAI,
  onRecheckAI,
  onSave,
}: EditorStickyToolbarProps) {
  return (
    <>
      {showToolbarDropdown && (
        <div className="editor-toolbar-backdrop" onClick={onCloseDropdown} />
      )}

      <div className={`editor-sticky-toolbar${isNarrowScreen ? ' editor-sticky-toolbar--narrow' : ''}`}>
        <div className="editor-toolbar-row">
          {!quizId && (
            <button
              type="button"
              onClick={onOpenContentTypePicker}
              className={`editor-toolbar-icon-btn editor-toolbar-content-type editor-toolbar-content-type--${contentType}${isNarrowScreen ? ' is-narrow' : ''}`}
              title="تغيير نوع المحتوى"
            >
              <span className="editor-toolbar-icon">{contentType === 'mix' ? '🔀' : contentType === 'mini-game' ? '🎮' : '📋'}</span>
              <span className="editor-toolbar-label">{contentType === 'mix' ? 'مزيج' : contentType === 'mini-game' ? 'ميني' : 'اختبار'}</span>
            </button>
          )}

          {isNarrowScreen && (
            <button
              type="button"
              onClick={onBack}
              className="editor-toolbar-icon-btn is-narrow"
              title="رجوع"
            >
              <span className="editor-toolbar-icon">←</span>
              <span className="editor-toolbar-label">رجوع</span>
            </button>
          )}

          <div className="editor-toolbar-settings-wrap">
            <button
              type="button"
              onClick={onToggleDropdown}
              className={`editor-toolbar-icon-btn editor-toolbar-settings${showToolbarDropdown ? ' is-open' : ''}${isNarrowScreen ? ' is-narrow' : ''}`}
              title="المزيد من الخيارات"
            >
              <span className="editor-toolbar-icon">⚙️</span>
              <span className="editor-toolbar-label">الإعدادات {isNarrowScreen ? '' : showToolbarDropdown ? '▴' : '▾'}</span>
            </button>

            {showToolbarDropdown && (
              <ToolbarDropdownMenu
                quizId={quizId}
                onClose={onCloseDropdown}
                onOpenMetadata={onOpenMetadata}
                onPreviewQuiz={onPreviewQuiz}
                onCopyLink={onCopyLink}
                onShareLink={onShareLink}
                onDeleteQuiz={onDeleteQuiz}
              />
            )}
          </div>

          <ToolbarPrimaryActions
            isMiniGameContent={isMiniGameContent}
            isNarrowScreen={isNarrowScreen}
            isSaving={isSaving}
            hasUnsavedChanges={hasUnsavedChanges}
            onAddQuestion={onAddQuestion}
            onGenerateAI={onGenerateAI}
            onRecheckAI={onRecheckAI}
            onSave={onSave}
          />
        </div>
      </div>
    </>
  )
}
