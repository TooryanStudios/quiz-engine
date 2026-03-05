import { EditorHeroActions } from './EditorHeroActions'
import { EditorHeroCoverCard } from './EditorHeroCoverCard'
import { EditorHeroTitleInput } from './EditorHeroTitleInput'
import './EditorModern.css'

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
    <div className={`editor-hero${isNarrowScreen ? ' editor-hero--narrow' : ''}`}>
      <div className={`editor-hero-inner${isNarrowScreen ? ' editor-hero-inner--narrow' : ''}`}>
        <EditorHeroCoverCard
          isNarrowScreen={isNarrowScreen}
          coverImage={coverImage}
          placeholderImage={placeholderImage}
          uploadingCover={uploadingCover}
          onOpenMetadata={onOpenMetadata}
        />

        <div className={`editor-hero-content${isNarrowScreen ? ' editor-hero-content--narrow' : ''}`}>
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