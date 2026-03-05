import React, { useRef, useState } from 'react'
import { ToolbarDropdownMenu } from './ToolbarDropdownMenu'
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

  const settingsBtnRef = useRef<HTMLButtonElement>(null)
  const [dropdownAnchor, setDropdownAnchor] = useState<{ top: number; right: number } | null>(null)

  const handleToggleDropdown = () => {
    if (!showToolbarDropdown && settingsBtnRef.current) {
      const rect = settingsBtnRef.current.getBoundingClientRect()
      setDropdownAnchor({ top: rect.bottom + 6, right: window.innerWidth - rect.right })
    }
    onToggleDropdown()
  }

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
            <span className="editor-header-pill" onClick={onOpenMetadata} style={{cursor: 'pointer'}}>
              {visibility === 'public' ? '🌐' : '🔒'} {visibility === 'public' ? 'عام' : 'خاص'}
            </span>
            {approvalStatus && (
              <span className={`editor-header-pill status-${approvalStatus}`}>
                {approvalStatus === 'approved' ? '✅ معتمد' :
                 approvalStatus === 'rejected' ? '❌ مرفوض' : '⏳ قيد المراجعة'}
              </span>
            )}
            <span className="editor-header-pill" onClick={onOpenContentTypePicker} style={{cursor: 'pointer'}}>
              {contentType === 'mix' ? '🧩 مزيج' : contentType === 'mini-game' ? '🎮 لعبة' : '📝 اختبار'}
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

          <div className="editor-header-dropdown-wrap">
            <button
              ref={settingsBtnRef}
              type="button"
              className="editor-header-settings-btn"
              onMouseDown={(e) => { e.stopPropagation(); handleToggleDropdown() }}
            >
              <span className="icon">⚙️</span> {isNarrowScreen ? '' : 'الإعدادات'} 
            </button>
            {showToolbarDropdown && dropdownAnchor && (
              <ToolbarDropdownMenu
                quizId={quizId}
                anchor={dropdownAnchor}
                onClose={onCloseDropdown}
                onOpenMetadata={onOpenMetadata}
                onPreviewQuiz={onPreviewQuiz}
                onCopyLink={onCopyLink}
                onShareLink={onShareLink}
                onDeleteQuiz={onDeleteQuiz}
              />
            )}
          </div>

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
    </header>
  )
}
