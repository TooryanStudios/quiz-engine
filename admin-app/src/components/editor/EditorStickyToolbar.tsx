import { ToolbarDropdownMenu } from './ToolbarDropdownMenu'
import { ToolbarPrimaryActions } from './ToolbarPrimaryActions'

type ContentType = 'quiz' | 'mini-game' | 'mix'

type EditorStickyToolbarProps = {
  quizId: string | null
  isMiniGameContent: boolean
  isNarrowScreen: boolean
  contentType: ContentType
  showToolbarDropdown: boolean
  questionsCount: number
  isSaving: boolean
  hasUnsavedChanges: boolean
  onToggleDropdown: () => void
  onCloseDropdown: () => void
  onOpenContentTypePicker: () => void
  onBack: () => void
  onOpenMetadata: () => void
  onCollapseAll: () => void
  onExpandAll: () => void
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
  questionsCount,
  isSaving,
  hasUnsavedChanges,
  onToggleDropdown,
  onCloseDropdown,
  onOpenContentTypePicker,
  onBack,
  onOpenMetadata,
  onCollapseAll,
  onExpandAll,
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
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 99 }}
          onClick={onCloseDropdown}
        />
      )}

      <div
        style={{
          position: 'sticky', top: isNarrowScreen ? '-12px' : '0.5rem', zIndex: 100,
          background: 'var(--bg-deep)',
          border: '1px solid var(--border-mid)',
          borderRadius: isNarrowScreen ? '0' : '12px',
          padding: isNarrowScreen ? '0.5rem 0.6rem' : '0.55rem 0.65rem',
          marginBottom: '1rem',
          boxShadow: '0 4px 14px rgba(0,0,0,0.35)',
          margin: isNarrowScreen ? '0 -1rem 1rem -1rem' : '0 0 1rem 0',
        }}
      >
        <div style={{ display: 'flex', gap: isNarrowScreen ? '0.3rem' : '0.45rem', alignItems: 'center', flexWrap: 'nowrap' }}>
          {!quizId && (
            <button
              type="button"
              onClick={onOpenContentTypePicker}
              style={{
                background: 'transparent', border: '1px solid transparent',
                color: contentType === 'mix' ? '#059669' : contentType === 'mini-game' ? '#7c3aed' : 'var(--text-bright)',
                padding: isNarrowScreen ? '0.4rem 0.5rem' : '0.42rem 0.72rem',
                borderRadius: '8px', cursor: 'pointer', transition: 'all 0.16s ease',
                display: 'flex', flexDirection: isNarrowScreen ? 'column' : 'row',
                alignItems: 'center', gap: isNarrowScreen ? '0.15rem' : '0.3rem',
                minWidth: isNarrowScreen ? '48px' : 'auto', flexShrink: 0,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.background = 'var(--bg-surface)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'transparent' }}
              title="تغيير نوع المحتوى"
            >
              <span style={{ fontSize: isNarrowScreen ? '1.3rem' : '0.9rem' }}>{contentType === 'mix' ? '🔀' : contentType === 'mini-game' ? '🎮' : '📋'}</span>
              <span style={{ fontSize: isNarrowScreen ? '0.58rem' : '0.8rem', fontWeight: 700 }}>{contentType === 'mix' ? 'مزيج' : contentType === 'mini-game' ? 'ميني' : 'اختبار'}</span>
            </button>
          )}

          {isNarrowScreen && (
            <button
              type="button"
              onClick={onBack}
              style={{
                background: 'transparent',
                border: '1px solid transparent',
                color: 'var(--text)',
                padding: '0.4rem 0.5rem',
                borderRadius: '8px',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.16s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.15rem',
                minWidth: '48px',
                flexShrink: 0,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-strong)'; e.currentTarget.style.background = 'var(--bg-surface)' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.background = 'transparent' }}
              title="رجوع"
            >
              <span style={{ fontSize: '1.3rem' }}>←</span>
              <span style={{ fontSize: '0.58rem', fontWeight: 700 }}>رجوع</span>
            </button>
          )}

          <div style={{ position: 'relative', flexShrink: 0 }}>
            <button
              type="button"
              onClick={onToggleDropdown}
              style={{
                background: showToolbarDropdown ? 'var(--bg-surface)' : 'transparent',
                border: '1px solid ' + (showToolbarDropdown ? 'var(--border-strong)' : 'transparent'),
                color: 'var(--text)',
                padding: isNarrowScreen ? '0.4rem 0.5rem' : '0.42rem 0.72rem',
                borderRadius: '8px', fontWeight: 700,
                cursor: 'pointer', transition: 'all 0.16s ease',
                display: 'flex', flexDirection: isNarrowScreen ? 'column' : 'row',
                alignItems: 'center', gap: isNarrowScreen ? '0.15rem' : '0.3rem',
                minWidth: isNarrowScreen ? '48px' : 'auto',
              }}
              title="المزيد من الخيارات"
            >
              <span style={{ fontSize: isNarrowScreen ? '1.3rem' : '1rem' }}>⚙️</span>
              <span style={{ fontSize: isNarrowScreen ? '0.58rem' : '0.8rem', fontWeight: 700 }}>الإعدادات {isNarrowScreen ? '' : showToolbarDropdown ? '▴' : '▾'}</span>
            </button>

            {showToolbarDropdown && (
              <ToolbarDropdownMenu
                quizId={quizId}
                questionsCount={questionsCount}
                onClose={onCloseDropdown}
                onOpenMetadata={onOpenMetadata}
                onCollapseAll={onCollapseAll}
                onExpandAll={onExpandAll}
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
