import { useState } from 'react'
import { EditorSettingsDialog } from './EditorSettingsDialog'
import './EditorModern.css'

type ContentType = 'quiz' | 'mini-game' | 'mix'
type VisibilityState = 'public' | 'private'
type ApprovalState = 'pending' | 'approved' | 'rejected' | undefined

type EditorUnifiedHeaderProps = {
  quizId: string | null
  isMiniGameContent: boolean
  isNarrowScreen: boolean
  contentType: ContentType

  // Hero Props
  coverImage: string
  placeholderImage: string
  uploadingCover: boolean
  title: string
  visibility: VisibilityState
  approvalStatus: ApprovalState
  onTitleChange: (value: string) => void
  onPlayQuiz: (quizId: string) => void

  // Toolbar Props
  isSaving: boolean
  hasUnsavedChanges: boolean
  onOpenContentTypePicker: () => void
  onBack: () => void
  onOpenExisting: () => void
  onCreateNew: () => void
  onOpenMetadata: () => void
  onPreviewQuiz: () => void
  onCopyLink: () => void
  onShareLink: () => void
  onDeleteQuiz: () => void
  onAddQuestion: () => void
  onGenerateAI: () => void
  onRecheckAI: () => void
  onSave: () => void
  isGeneratingAI?: boolean
  isRecheckingAI?: boolean
}

export function EditorUnifiedHeader({
  quizId,
  isMiniGameContent,
  isNarrowScreen,
  contentType,

  coverImage,
  placeholderImage,
  uploadingCover,
  title,
  visibility,
  approvalStatus,
  onTitleChange,
  onPlayQuiz,

  isSaving,
  hasUnsavedChanges,
  onOpenContentTypePicker,
  onBack,
  onOpenExisting,
  onCreateNew,
  onOpenMetadata,
  onPreviewQuiz,
  onCopyLink,
  onShareLink,
  onDeleteQuiz,
  onAddQuestion,
  onGenerateAI,
  onRecheckAI,
  onSave,
  isGeneratingAI,
  isRecheckingAI,
}: EditorUnifiedHeaderProps) {
  // Determine save label based on state and viewport
  const getSaveLabel = () => {
    if (isSaving) return isNarrowScreen ? 'يتم الحفظ...' : 'جاري الحفظ...'
    if (hasUnsavedChanges) return isNarrowScreen ? 'حفظ' : 'حفظ التعديلات'
    return 'محفوظ'
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onTitleChange(e.target.value)
  }

  const [showSettingsDialog, setShowSettingsDialog] = useState(false)

  return (
    <header className="editor-unified-header">
      <div className="editor-header-left">
        <button type="button" className="editor-back-btn" onClick={onBack} title="رجوع">
          ‹
        </button>

        <button 
          title="تغيير الغلاف"
          className="editor-header-cover" 
          onClick={onOpenMetadata}
        >
          {uploadingCover ? (
            <div className="editor-header-cover-spinner" />
          ) : (
            <img 
              src={coverImage || placeholderImage} 
              alt="Cover thumbnail" 
              className="editor-header-cover-img"
            />
          )}
        </button>

        <div className="editor-header-info">
          <input 
            type="text" 
            className="editor-header-title-input" 
            value={title} 
            onChange={handleTitleChange}
            placeholder={isMiniGameContent ? "عنوان اللعبة بدون اسم..." : "عنوان الاختبار بدون اسم..."}
            dir="auto"
          />
          <div className="editor-header-meta">
            <span
              className="editor-header-pill icon-only"
              onClick={onOpenMetadata}
              style={{ cursor: 'pointer' }}
              title={visibility === 'public' ? 'عام' : 'خاص'}
              aria-label={visibility === 'public' ? 'عام' : 'خاص'}
            >
              {visibility === 'public' ? '🌐' : '🔒'}
            </span>
            {approvalStatus && (
              <span className={`editor-header-pill status-${approvalStatus}`}>
                {approvalStatus === 'approved' ? '✅ معتمد' :
                 approvalStatus === 'rejected' ? '❌ مرفوض' : '⏳ قيد المراجعة'}
              </span>
            )}
            <span
              className="editor-header-pill icon-only"
              onClick={onOpenContentTypePicker}
              style={{ cursor: 'pointer' }}
              title={contentType === 'mix' ? 'مزيج' : contentType === 'mini-game' ? 'لعبة' : 'اختبار'}
              aria-label={contentType === 'mix' ? 'مزيج' : contentType === 'mini-game' ? 'لعبة' : 'اختبار'}
            >
              {contentType === 'mix' ? '🧩' : contentType === 'mini-game' ? '🎮' : '📝'}
            </span>
          </div>
        </div>
      </div>

      <div className="editor-header-center">
        {/* Placeholder for middle area, e.g. question count indicator if needed */}
      </div>

      <div className="editor-header-right">
        <div className="editor-header-actions">
          {!isNarrowScreen && !isMiniGameContent && (
             <>
               <button type="button" className={`editor-header-btn ai-btn${isGeneratingAI ? ' loading' : ''}`} onClick={isGeneratingAI ? undefined : onGenerateAI}>
                 {isGeneratingAI ? <><span className="ai-spinner" />{' '}جار التوليد...</> : '✨ توليد ذكي'}
               </button>
               <button type="button" className={`editor-header-btn proof-btn${isRecheckingAI ? ' loading' : ''}`} onClick={isRecheckingAI ? undefined : onRecheckAI}>
                 {isRecheckingAI ? <><span className="ai-spinner" />{' '}جار التدقيق...</> : '🛡️ تدقيق'}
               </button>
             </>
          )}

          {!isMiniGameContent && (
            <button type="button" className="editor-header-add-btn" onClick={onAddQuestion}>
              إضافة +
            </button>
          )}

          <button
            type="button"
            className="editor-header-settings-btn"
            onClick={() => setShowSettingsDialog(true)}
          >
            <span className="icon">⚙️</span> الإعدادات
          </button>

          {/* Main Saving Status / Button */}
          <button
            type="button"
            className={`editor-header-save-btn ${hasUnsavedChanges ? 'unsaved' : ''}`}
            onClick={hasUnsavedChanges ? onSave : undefined}
            disabled={isSaving || !hasUnsavedChanges}
          >
            {hasUnsavedChanges ? <span className="icon">💾</span> : <span className="icon">✔️</span>}
            <span className="label">{getSaveLabel()}</span>
          </button>

          {!isMiniGameContent && quizId && (
             <button type="button" className="editor-header-play-btn" onClick={() => onPlayQuiz(quizId)}>
               ▶ لعب الآن
             </button>
          )}
        </div>
      </div>

      {showSettingsDialog && (
        <EditorSettingsDialog
          quizId={quizId}
          onClose={() => setShowSettingsDialog(false)}
          onOpenMetadata={onOpenMetadata}
          onPreviewQuiz={onPreviewQuiz}
          onCopyLink={onCopyLink}
          onShareLink={onShareLink}
          onDeleteQuiz={onDeleteQuiz}
          onCreateNew={onCreateNew}
          onOpenExisting={onOpenExisting}
          onRecheckAI={onRecheckAI}
          onGenerateAI={onGenerateAI}
          isGeneratingAI={isGeneratingAI}
          isRecheckingAI={isRecheckingAI}
        />
      )}
    </header>
  )
}
