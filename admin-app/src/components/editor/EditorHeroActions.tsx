type VisibilityState = 'public' | 'private'
type ApprovalState = 'pending' | 'approved' | 'rejected' | undefined

type EditorHeroActionsProps = {
  isNarrowScreen: boolean
  pureQuestionsCount: number
  miniGameBlocksCount: number
  visibility: VisibilityState
  approvalStatus: ApprovalState
  quizId: string | null
  onOpenMetadata: () => void
  onPlayQuiz: (quizId: string) => void
}

export function EditorHeroActions({
  isNarrowScreen,
  pureQuestionsCount,
  miniGameBlocksCount,
  visibility,
  approvalStatus,
  quizId,
  onOpenMetadata,
  onPlayQuiz,
}: EditorHeroActionsProps) {
  const visibilityLabel =
    visibility === 'public'
      ? '🌐 عام'
      : approvalStatus === 'pending'
        ? '🕐 في انتظار الموافقة'
        : approvalStatus === 'rejected'
          ? '❌ مرفوض'
          : '🔒 خاص'

  return (
    <>
      <div
        dir="auto"
        className="editor-hero-meta"
        onClick={onOpenMetadata}
      >
        📊 {pureQuestionsCount} سؤال {miniGameBlocksCount > 0 ? `• 🎮 ${miniGameBlocksCount} ميني جيم` : ''} • {visibilityLabel}
      </div>

      <div className={`editor-hero-actions${isNarrowScreen ? ' editor-hero-actions--narrow' : ''}`}>
        {quizId && (
          <button
            type="button"
            onClick={() => onPlayQuiz(quizId)}
            className="editor-hero-btn editor-hero-btn--play"
          >
            <span>▶</span> {isNarrowScreen ? 'تشغيل اللعبة' : 'لعب الاختبار الآن'}
          </button>
        )}

        <button
          type="button"
          onClick={onOpenMetadata}
          className="editor-hero-btn editor-hero-btn--settings"
        >
          ⚙️ الإعدادات
        </button>
      </div>
    </>
  )
}
