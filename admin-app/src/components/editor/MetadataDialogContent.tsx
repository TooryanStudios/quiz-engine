import type { ChallengePreset } from '../../types/quiz'
import { CoverImageSection } from './CoverImageSection'
import { MetadataAiSection } from './MetadataAiSection'
import { MetadataBasicInfoSection } from './MetadataBasicInfoSection'
import { MetadataDurationSection } from './MetadataDurationSection'
import { MetadataFlagsSection } from './MetadataFlagsSection'
import { MetadataMiniGameSection } from './MetadataMiniGameSection'
import { MetadataPrivacyDifficultySection } from './MetadataPrivacyDifficultySection'
import { MetadataThemeSection } from './MetadataThemeSection'

type MiniGameCard = {
  id: string
  icon: string
  englishName: string
  arabicName: string
  description: string
  howToPlay: string
  access: 'free' | 'premium'
  enabled: boolean
}

type MetadataDialogContentProps = {
  title: string
  description: string
  shareUrl: string
  onTitleChange: (value: string) => void
  onDescriptionChange: (value: string) => void
  onCopyShareUrl: () => void
  onShareUrl: () => void

  tempThemeId: string
  onThemeIdChange: (value: string) => void

  aiQuestionCount: number
  aiPrompt: string
  isGeneratingAi: boolean
  aiAction: 'generate' | 'recheck' | null
  onQuestionCountChange: (value: number) => void
  onPromptChange: (value: string) => void
  onGenerateAi: () => void

  tempVisibility: 'public' | 'private'
  approvalStatus: string | undefined
  tempChallenge: ChallengePreset
  onVisibilityChange: (value: 'public' | 'private') => void
  onChallengeChange: (value: ChallengePreset) => void

  isMiniGameContent: boolean
  selectedGameModeMeta?: {
    icon?: string
    englishName?: string
    arabicName?: string
    description?: string
    howToPlay?: string
    access?: 'free' | 'premium'
  }
  showMiniGamePicker: boolean
  miniGameCards: MiniGameCard[]
  tempGameModeId?: string
  isSubscribed: boolean
  onOpenMiniGamePicker: () => void
  onCloseMiniGamePicker: () => void
  onSelectMiniGame: (id: string) => void
  onPremiumLocked: () => void

  tempRandomizeQuestions: boolean
  tempEnableScholarRole: boolean
  onRandomizeChange: (value: boolean) => void
  onScholarRoleChange: (value: boolean) => void

  tempAllDuration: number
  onDurationChange: (value: number) => void
  onApplyDurationToAll: () => void

  tempCoverImage: string
  defaultCoverImage: string
  coverPreviewChecking: boolean
  coverPreviewError: string
  uploadingCover: boolean
  isGeneratingCoverImage: boolean
  onCoverUrlChange: (value: string) => void
  onUploadCoverClick: () => void
  onGenerateCoverClick: () => void
  onOpenCoverLibraryClick: () => void
  onUseDefaultCoverClick: () => void
}

export function MetadataDialogContent({
  title,
  description,
  shareUrl,
  onTitleChange,
  onDescriptionChange,
  onCopyShareUrl,
  onShareUrl,
  tempThemeId,
  onThemeIdChange,
  aiQuestionCount,
  aiPrompt,
  isGeneratingAi,
  aiAction,
  onQuestionCountChange,
  onPromptChange,
  onGenerateAi,
  tempVisibility,
  approvalStatus,
  tempChallenge,
  onVisibilityChange,
  onChallengeChange,
  isMiniGameContent,
  selectedGameModeMeta,
  showMiniGamePicker,
  miniGameCards,
  tempGameModeId,
  isSubscribed,
  onOpenMiniGamePicker,
  onCloseMiniGamePicker,
  onSelectMiniGame,
  onPremiumLocked,
  tempRandomizeQuestions,
  tempEnableScholarRole,
  onRandomizeChange,
  onScholarRoleChange,
  tempAllDuration,
  onDurationChange,
  onApplyDurationToAll,
  tempCoverImage,
  defaultCoverImage,
  coverPreviewChecking,
  coverPreviewError,
  uploadingCover,
  isGeneratingCoverImage,
  onCoverUrlChange,
  onUploadCoverClick,
  onGenerateCoverClick,
  onOpenCoverLibraryClick,
  onUseDefaultCoverClick,
}: MetadataDialogContentProps) {
  return (
    <>
      <MetadataBasicInfoSection
        title={title}
        description={description}
        shareUrl={shareUrl}
        onTitleChange={onTitleChange}
        onDescriptionChange={onDescriptionChange}
        onCopyShareUrl={onCopyShareUrl}
        onShareUrl={onShareUrl}
      />

      <MetadataThemeSection
        selectedThemeId={tempThemeId}
        onThemeChange={onThemeIdChange}
      />

      <MetadataAiSection
        aiQuestionCount={aiQuestionCount}
        aiPrompt={aiPrompt}
        isGenerating={isGeneratingAi}
        generateActionActive={aiAction === 'generate'}
        onQuestionCountChange={onQuestionCountChange}
        onPromptChange={onPromptChange}
        onGenerate={onGenerateAi}
      />

      <MetadataPrivacyDifficultySection
        tempVisibility={tempVisibility}
        approvalStatus={approvalStatus}
        tempChallenge={tempChallenge}
        onVisibilityChange={onVisibilityChange}
        onChallengeChange={onChallengeChange}
      />

      {isMiniGameContent && (
        <MetadataMiniGameSection
          selectedGameModeMeta={selectedGameModeMeta}
          showMiniGamePicker={showMiniGamePicker}
          miniGameCards={miniGameCards}
          tempGameModeId={tempGameModeId}
          isSubscribed={isSubscribed}
          onOpenPicker={onOpenMiniGamePicker}
          onClosePicker={onCloseMiniGamePicker}
          onSelectGameMode={onSelectMiniGame}
          onPremiumLocked={onPremiumLocked}
        />
      )}

      <MetadataFlagsSection
        tempRandomizeQuestions={tempRandomizeQuestions}
        tempEnableScholarRole={tempEnableScholarRole}
        onRandomizeChange={onRandomizeChange}
        onScholarRoleChange={onScholarRoleChange}
      />

      <MetadataDurationSection
        tempAllDuration={tempAllDuration}
        onDurationChange={onDurationChange}
        onApplyDuration={onApplyDurationToAll}
      />

      <CoverImageSection
        tempCoverImage={tempCoverImage}
        defaultCoverImage={defaultCoverImage}
        coverPreviewChecking={coverPreviewChecking}
        coverPreviewError={coverPreviewError}
        uploadingCover={uploadingCover}
        isGeneratingCoverImage={isGeneratingCoverImage}
        onCoverUrlChange={onCoverUrlChange}
        onUploadClick={onUploadCoverClick}
        onOpenLibraryClick={onOpenCoverLibraryClick}
        onGenerateClick={onGenerateCoverClick}
        onUseDefaultClick={onUseDefaultCoverClick}
      />
    </>
  )
}