import { useState } from 'react'
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
  onTitleChange: (value: string) => void
  onDescriptionChange: (value: string) => void

  tempThemeId: string
  onThemeIdChange: (value: string) => void

  onOpenAiDialog: () => void
  creditCostPerImage: number
  creditsRemaining?: number | null

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
  onUseDefaultCoverClick: () => void
}

export function MetadataDialogContent({
  title,
  description,
  onTitleChange,
  onDescriptionChange,
  tempThemeId,
  onThemeIdChange,
  onOpenAiDialog,
  creditCostPerImage,
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
  uploadingCover,
  isGeneratingCoverImage,
  onUploadCoverClick,
  onGenerateCoverClick,
  onUseDefaultCoverClick,
}: MetadataDialogContentProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  return (
    <>
      {/* Essential Settings - Always Visible */}
      <MetadataBasicInfoSection
        title={title}
        description={description}
        onTitleChange={onTitleChange}
        onDescriptionChange={onDescriptionChange}
      />

      <MetadataAiSection
        onOpenAiDialog={onOpenAiDialog}
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

      <CoverImageSection
        tempCoverImage={tempCoverImage}
        defaultCoverImage={defaultCoverImage}
        uploadingCover={uploadingCover}
        isGeneratingCoverImage={isGeneratingCoverImage}
        creditCostPerImage={creditCostPerImage}
        onUploadClick={onUploadCoverClick}
        onGenerateClick={onGenerateCoverClick}
        onUseDefaultClick={onUseDefaultCoverClick}
      />

      {/* Advanced Settings Toggle Button */}
      <div style={{ marginTop: '1.5rem' }}>
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          style={{
            width: '100%',
            padding: '0.75rem 1rem',
            borderRadius: '10px',
            border: '1px solid var(--border-strong)',
            background: showAdvanced ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-surface)',
            color: showAdvanced ? '#60a5fa' : 'var(--text-mid)',
            fontSize: '0.9em',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => { 
            if (!showAdvanced) e.currentTarget.style.background = 'var(--bg-hover)' 
          }}
          onMouseLeave={(e) => { 
            if (!showAdvanced) e.currentTarget.style.background = 'var(--bg-surface)' 
          }}
        >
          <span>{showAdvanced ? '▼' : '◀'}</span>
          <span>⚙️ إعدادات متقدمة</span>
        </button>
      </div>

      {/* Advanced Settings - Collapsible */}
      {showAdvanced && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem',
          borderRadius: '12px',
          border: '1px solid var(--border-strong)',
          background: 'var(--bg-deep)',
          animation: 'fadeIn 0.3s ease-out',
        }}>
          <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
          
          <MetadataThemeSection
            selectedThemeId={tempThemeId}
            onThemeChange={onThemeIdChange}
          />

          <div style={{ marginTop: '1rem' }}>
            <MetadataFlagsSection
              tempRandomizeQuestions={tempRandomizeQuestions}
              tempEnableScholarRole={tempEnableScholarRole}
              onRandomizeChange={onRandomizeChange}
              onScholarRoleChange={onScholarRoleChange}
            />
          </div>

          <div style={{ marginTop: '1rem' }}>
            <MetadataDurationSection
              tempAllDuration={tempAllDuration}
              onDurationChange={onDurationChange}
              onApplyDuration={onApplyDurationToAll}
            />
          </div>
        </div>
      )}
    </>
  )
}