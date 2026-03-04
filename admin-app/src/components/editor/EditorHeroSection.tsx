import { EditorHeroActions } from './EditorHeroActions'
import { EditorHeroCoverCard } from './EditorHeroCoverCard'
import { EditorHeroTitleInput } from './EditorHeroTitleInput'

type VisibilityState = 'public' | 'private'
type ApprovalState = 'pending' | 'approved' | 'rejected' | undefined

type EditorHeroSectionProps = {
  isNarrowScreen: boolean
  coverImage: string
  placeholderImage: string
  uploadingCover: boolean
  title: string
  pureQuestionsCount: number
  miniGameBlocksCount: number
  visibility: VisibilityState
  approvalStatus: ApprovalState
  quizId: string | null
  onOpenMetadata: () => void
  onTitleChange: (value: string) => void
  onPlayQuiz: (quizId: string) => void
}

export function EditorHeroSection({
  isNarrowScreen,
  coverImage,
  placeholderImage,
  uploadingCover,
  title,
  pureQuestionsCount,
  miniGameBlocksCount,
  visibility,
  approvalStatus,
  quizId,
  onOpenMetadata,
  onTitleChange,
  onPlayQuiz,
}: EditorHeroSectionProps) {
  return (
    <div style={{
      background: 'linear-gradient(180deg, var(--bg-surface) 0%, var(--bg-deep) 100%)',
      borderBottom: '1px solid var(--border-strong)',
      marginBottom: '1.5rem',
      borderRadius: isNarrowScreen ? '0 0 20px 20px' : '0 0 24px 24px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
      padding: isNarrowScreen ? '1rem 0.8rem' : '2rem 1.5rem',
      marginTop: isNarrowScreen ? '-1rem' : '0',
    }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', gap: isNarrowScreen ? '1rem' : '1.8rem', alignItems: 'center', flexDirection: isNarrowScreen ? 'column' : 'row' }}>
        <EditorHeroCoverCard
          isNarrowScreen={isNarrowScreen}
          coverImage={coverImage}
          placeholderImage={placeholderImage}
          uploadingCover={uploadingCover}
          onOpenMetadata={onOpenMetadata}
        />

        <div style={{ flex: 1, textAlign: isNarrowScreen ? 'center' : 'right', width: '100%' }}>
          <EditorHeroTitleInput
            isNarrowScreen={isNarrowScreen}
            title={title}
            onTitleChange={onTitleChange}
          />

          <EditorHeroActions
            isNarrowScreen={isNarrowScreen}
            pureQuestionsCount={pureQuestionsCount}
            miniGameBlocksCount={miniGameBlocksCount}
            visibility={visibility}
            approvalStatus={approvalStatus}
            quizId={quizId}
            onOpenMetadata={onOpenMetadata}
            onPlayQuiz={onPlayQuiz}
          />
        </div>
      </div>
    </div>
  )
}