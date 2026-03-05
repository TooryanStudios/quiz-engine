import React, { useState } from 'react'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../../lib/firebase'
import type { QuizQuestion, QuestionType, QuizMedia } from '../../types/quiz'
import { aiCheckQuestionCorrectness, aiGenerateQuestionMediaImage } from '../../lib/ai/questionTools'
import {
  getQuestionTypeEditorMeta,
  getQuestionTypeTimerPolicy,
  coerceQuestionToSchemaType as coerceQuestionToType,
} from '../../config/questionTypeSchemas'
import { MiniGameBlockCard } from './MiniGameBlockCard'
import { QuestionCardShell, QuestionCardHeader } from './QuestionCardShell'
import { QuestionHeaderControls } from './QuestionHeaderControls'

import { QuestionTypePickerDialogContent } from './QuestionTypePickerDialogContent'
import { QuestionDurationPickerDialogContent } from './QuestionDurationPickerDialogContent'
import { QuestionTextRow } from './QuestionTextRow'
import { CreatorStudioNotice } from './CreatorStudioNotice'
import { OptionsAnswerSection } from './OptionsAnswerSection'
import { TextAnswerSection } from './TextAnswerSection'
import { BossSettingsSection } from './BossSettingsSection'
import { PairsAnswerSection } from './PairsAnswerSection'
import { OrderingAnswerSection } from './OrderingAnswerSection'
import { QuestionMediaSection } from './QuestionMediaSection'

interface QuestionSectionProps {
  quizId?: string | null
  questions: QuizQuestion[]
  collapsedQuestions: boolean[]
  dragIndex: number | null
  dragOverIndex: number | null
  isNarrowScreen: boolean
  isSubscribed: boolean
  gameModeId: string
  miniGameCards: any[]
  uploadingMiniGameImage: boolean
  uploadingPairImageKey: string | null
  uploadingIndex: number | null
  questionTypeOptions: { label: string; value: string }[]
  onSetDragIndex: (index: number | null) => void
  onSetDragOverIndex: (index: number | null) => void
  onMoveQuestion: (from: number, to: number) => void
  onToggleCollapse: (index: number) => void
  onRemoveQuestion: (index: number) => void
  onUpdateQuestion: (index: number, patch: Partial<QuizQuestion>) => void
  onReplaceQuestion: (index: number, question: QuizQuestion) => void
  onShowDialog: (config: any) => void
  onHideDialog: () => void
  onShowToast: (config: { message: string; type: 'success' | 'error' | 'info' }) => void
  onOpenUpgradeDialog: (message: string) => void
  onOpenMiniGamePuzzleCropPicker: (config: { kind: 'block' | 'pair'; questionIndex: number; pairIndex?: number }) => void
  onUploadPairImage: (index: number, pairIndex: number, side: 'left' | 'right') => void
  onSetUploadingIndex: (index: number | null) => void
  isPremiumQuestionType: (type: QuestionType) => boolean
  quizTitle?: string
  quizDescription?: string
  /** When set, only the question at this index is rendered (slideshow mode). */
  activeIndex?: number
}

const QuestionSection: React.FC<QuestionSectionProps> = ({
  quizId,
  questions,
  collapsedQuestions,
  dragIndex,
  dragOverIndex,
  isNarrowScreen,
  isSubscribed,
  gameModeId,
  miniGameCards,
  uploadingMiniGameImage,
  uploadingPairImageKey,
  uploadingIndex,
  questionTypeOptions,
  onSetDragIndex,
  onSetDragOverIndex,
  onMoveQuestion,
  onToggleCollapse,
  onRemoveQuestion,
  onUpdateQuestion,
  onReplaceQuestion,
  onShowDialog,
  onHideDialog,
  onShowToast,
  onOpenUpgradeDialog,
  onOpenMiniGamePuzzleCropPicker,
  onUploadPairImage,
  onSetUploadingIndex,
  isPremiumQuestionType,
  quizTitle,
  quizDescription,
  activeIndex,
}) => {
  type AiCheckResult = {
    verdict: 'ok' | 'issues' | 'uncertain'
    summary: string
    issues?: string[]
    suggestions?: string[]
    creditsRemaining?: number
  }

  const [aiCheckLoadingIndex, setAiCheckLoadingIndex] = useState<number | null>(null)
  const [aiImageLoadingIndex, setAiImageLoadingIndex] = useState<number | null>(null)
  const [aiCheckResultByIndex, setAiCheckResultByIndex] = useState<Record<number, AiCheckResult>>({})

  const parseNumberList = (input: string, max: number) => {
    return input
      .split(',')
      .map((v) => Number(v.trim()))
      .filter((v) => Number.isInteger(v) && v >= 0 && v < max)
  }

  // In slideshow mode only render the active slide; otherwise render all
  const questionPairs: Array<[number, QuizQuestion]> =
    activeIndex !== undefined
      ? activeIndex >= 0 && activeIndex < questions.length
        ? [[activeIndex, questions[activeIndex]] as [number, QuizQuestion]]
        : []
      : questions.map((q, i): [number, QuizQuestion] => [i, q])

  return (
    <>
      {questionPairs.map(([index, q]) => {
        // ── Mini-game block card ──
        if (q.miniGameBlockId) {
          return (
            <MiniGameBlockCard
              key={index}
              index={index}
              question={q}
              collapsed={collapsedQuestions[index]}
              dragActive={dragIndex === index}
              miniGameCards={miniGameCards}
              uploadingMiniGameImage={uploadingMiniGameImage}
              onDragStart={() => onSetDragIndex(index)}
              onDragOver={(e) => {
                e.preventDefault()
                onSetDragOverIndex(index)
              }}
              onDrop={() => {
                if (dragIndex !== null) onMoveQuestion(dragIndex, index)
                onSetDragIndex(null)
                onSetDragOverIndex(null)
              }}
              onDragEnd={() => {
                onSetDragIndex(null)
                onSetDragOverIndex(null)
              }}
              onToggleCollapse={() => onToggleCollapse(index)}
              onRemove={() => onRemoveQuestion(index)}
              onUpdateQuestion={(patch) => onUpdateQuestion(index, patch)}
              onUpdateBlockConfig={(patch) => {
                const blockCfg = (q.miniGameBlockConfig || {}) as Record<string, unknown>
                onUpdateQuestion(index, { miniGameBlockConfig: { ...blockCfg, ...patch } })
              }}
              onOpenPuzzleCropPicker={() => onOpenMiniGamePuzzleCropPicker({ kind: 'block', questionIndex: index })}
            />
          )
        }

        const editorMeta = getQuestionTypeEditorMeta(q.type)
        const isCreatorStudioMode = gameModeId === 'creator-studio'
        const isMultiSelectOptions = editorMeta.answerMode === 'options' && editorMeta.selectionMode === 'multi'
        const optionMin = editorMeta.optionsMin ?? 2
        const optionMax = editorMeta.optionsMax ?? 6

        return (
          <QuestionCardShell
            key={index}
            index={index}
            isDragOver={dragOverIndex === index && dragIndex !== index}
            isDragging={dragIndex === index}
            onDragStart={() => onSetDragIndex(index)}
            onDragOver={(e) => {
              e.preventDefault()
              onSetDragOverIndex(index)
            }}
            onDrop={() => {
              if (dragIndex !== null) onMoveQuestion(dragIndex, index)
              onSetDragIndex(null)
              onSetDragOverIndex(null)
            }}
            onDragEnd={() => {
              onSetDragIndex(null)
              onSetDragOverIndex(null)
            }}
          >
            <QuestionCardHeader
              collapsed={collapsedQuestions[index]}
              questionText={q.text || ''}
              index={index}
              isPuzzleQuestion={q.type === 'match_plus' && q.matchPlusMode === 'image-puzzle'}
              actions={(
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  {!collapsedQuestions[index] && !isCreatorStudioMode && (
                    <QuestionHeaderControls
                      isNarrowScreen={isNarrowScreen}
                      currentType={q.type}
                      currentDuration={q.duration || 20}
                      selectedTypeLabel={questionTypeOptions.find((o) => o.value === q.type)?.label || 'نوع السؤال'}
                      allowedDurations={getQuestionTypeTimerPolicy(q.type).allowedDurations}
                      questionTypeOptions={questionTypeOptions}
                      onTypeChange={(value) => {
                        const nextType = value as QuestionType
                        if (isPremiumQuestionType(nextType) && !isSubscribed) {
                          onOpenUpgradeDialog('This question type is premium. Please upgrade your account to use it.')
                          return
                        }
                        onReplaceQuestion(index, coerceQuestionToType(q, nextType))
                      }}
                      onOpenTypePicker={() => {
                        onShowDialog({
                          title: 'اختر نوع السؤال',
                          message: (
                            <QuestionTypePickerDialogContent
                              options={questionTypeOptions}
                              selectedType={q.type}
                              onSelect={(value) => {
                                const nextType = value as QuestionType
                                if (isPremiumQuestionType(nextType) && !isSubscribed) {
                                  onOpenUpgradeDialog('This question type is premium. Please upgrade your account to use it.')
                                  return
                                }
                                onReplaceQuestion(index, coerceQuestionToType(q, nextType))
                                onHideDialog()
                              }}
                            />
                          ),
                          confirmText: 'إغلاق',
                          onConfirm: () => onHideDialog(),
                        })
                      }}
                      onDurationChange={(seconds) => onUpdateQuestion(index, { duration: seconds })}
                      onOpenDurationPicker={() => {
                        const policy = getQuestionTypeTimerPolicy(q.type)
                        onShowDialog({
                          title: 'مدة السؤال (ثواني)',
                          message: (
                            <QuestionDurationPickerDialogContent
                              allowedDurations={policy.allowedDurations}
                              selectedDuration={q.duration || 20}
                              onSelect={(seconds) => {
                                onUpdateQuestion(index, { duration: seconds })
                                onHideDialog()
                              }}
                            />
                          ),
                          confirmText: 'تم',
                          onConfirm: () => onHideDialog(),
                        })
                      }}
                    />
                  )}

                  <button
                    type="button"
                    title="حذف السؤال"
                    onClick={() => {
                      onShowDialog({
                        title: 'حذف السؤال',
                        message: 'هل أنت متأكد من رغبتك في حذف هذا السؤال؟ لا يمكن التراجع عن هذه الخطوة.',
                        confirmText: 'حذف',
                        cancelText: 'إلغاء',
                        isDangerous: true,
                        onConfirm: () => {
                          onRemoveQuestion(index)
                          onHideDialog()
                        },
                      })
                    }}
                    style={{
                      background: 'var(--bg-deep)',
                      border: '1px solid var(--border-strong)',
                      color: 'var(--text-muted)',
                      fontSize: '1rem',
                      width: '32px',
                      height: '32px',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: 0,
                      lineHeight: 1,
                    }}
                  >
                    🗑️
                  </button>
                </div>
              )}
            />

            {!collapsedQuestions[index] && (
              <>
                <QuestionTextRow text={q.text} onTextChange={(value) => onUpdateQuestion(index, { text: value })} />

                {isCreatorStudioMode && <CreatorStudioNotice />}

                {!isCreatorStudioMode && editorMeta.answerMode === 'options' && (
                  <OptionsAnswerSection
                    question={q}
                    optionMin={optionMin}
                    optionMax={optionMax}
                    isMultiSelectOptions={isMultiSelectOptions}
                    sectionLabel={editorMeta.optionsSectionLabel || 'الخيارات'}
                    modeLabel={(isMultiSelectOptions ? editorMeta.optionsModeMultiLabel : editorMeta.optionsModeSingleLabel) || ''}
                    onUpdateQuestion={(patch) => onUpdateQuestion(index, patch)}
                  />
                )}

                {!isCreatorStudioMode && editorMeta.answerMode === 'text' && (
                  <TextAnswerSection
                    sectionLabel={editorMeta.textSettingsLabel || 'إعدادات الإجابة النصية'}
                    question={q}
                    onUpdateQuestion={(patch) => onUpdateQuestion(index, patch)}
                  />
                )}

                {!isCreatorStudioMode && editorMeta.hasBossSettings && (
                  <BossSettingsSection
                    sectionLabel={editorMeta.bossSettingsLabel || 'إعدادات الزعيم'}
                    question={q}
                    onUpdateQuestion={(patch) => onUpdateQuestion(index, patch)}
                  />
                )}

                {!isCreatorStudioMode && editorMeta.answerMode === 'pairs' && (
                  <PairsAnswerSection
                    sectionLabel={editorMeta.pairsSectionLabel || 'المطابقة'}
                    questionIndex={index}
                    question={q}
                    uploadingPairImageKey={uploadingPairImageKey}
                    onUpdateQuestion={(patch) => onUpdateQuestion(index, patch)}
                    onUploadPairImage={onUploadPairImage}
                    onUploadMatchPlusImage={() => {
                      const input = document.createElement('input')
                      input.type = 'file'
                      input.accept = 'image/*'
                      input.onchange = async (event) => {
                        const file = (event.target as HTMLInputElement).files?.[0]
                        if (!file) return
                        try {
                          onShowToast({ message: '⏳ جاري رفع الصورة...', type: 'info' })
                          const ext = file.name.split('.').pop() || 'jpg'
                          const storagePath = `match-plus-puzzle/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
                          const storageRef = ref(storage, storagePath)
                          await uploadBytes(storageRef, file)
                          const url = await getDownloadURL(storageRef)
                          onUpdateQuestion(index, { matchPlusImage: url })
                          onShowToast({ message: '✅ تم رفع الصورة بنجاح', type: 'success' })
                        } catch (err) {
                          console.error('Puzzle image upload failed', err)
                          onShowToast({ message: '❌ فشل رفع الصورة', type: 'error' })
                        }
                      }
                      input.click()
                    }}
                  />
                )}

                {!isCreatorStudioMode && editorMeta.answerMode === 'ordering' && (
                  <OrderingAnswerSection
                    sectionLabel={editorMeta.orderingSectionLabel || 'الترتيب'}
                    items={q.items || []}
                    correctOrder={q.correctOrder || []}
                    onChangeItem={(itemIndex, value) => {
                      const next = [...(q.items || [])]
                      next[itemIndex] = value
                      onUpdateQuestion(index, { items: next })
                    }}
                    onChangeCorrectOrder={(value) => {
                      onUpdateQuestion(index, { correctOrder: parseNumberList(value, (q.items || []).length) })
                    }}
                  />
                )}

                <QuestionMediaSection
                  question={q}
                  uploading={uploadingIndex === index}
                  aiCheckLoading={aiCheckLoadingIndex === index}
                  aiCheckResult={aiCheckResultByIndex[index] || null}
                  onAiCheckClick={async () => {
                    if (aiCheckLoadingIndex !== null) return
                    setAiCheckLoadingIndex(index)
                    try {
                      const result = await aiCheckQuestionCorrectness(q)
                      setAiCheckResultByIndex((prev) => ({ ...prev, [index]: result }))
                      onShowToast({ message: '✅ تم التحقق بالذكاء الاصطناعي', type: 'success' })
                    } catch (error) {
                      console.error('AI check failed', error)
                      const maybeCode = (error as { code?: unknown } | null | undefined)?.code
                      const code = typeof maybeCode === 'string' ? maybeCode : undefined
                      const message = error instanceof Error ? error.message : 'فشل التحقق بالذكاء الاصطناعي'
                      if (typeof code === 'string' && code.includes('resource-exhausted')) {
                        onOpenUpgradeDialog('You have used all your free AI credits. Please upgrade via bank transfer (manual activation) to continue.')
                      }
                      onShowToast({ message: `❌ ${message}`, type: 'error' })
                    } finally {
                      setAiCheckLoadingIndex(null)
                    }
                  }}
                  aiImageLoading={aiImageLoadingIndex === index}
                  onAiImageClick={async () => {
                    if (aiImageLoadingIndex !== null) return
                    setAiImageLoadingIndex(index)
                    try {
                      const { imageUrl } = await aiGenerateQuestionMediaImage(q, {
                        quizId: quizId || undefined,
                        quizTitle: quizTitle || undefined,
                        quizDescription: quizDescription || undefined,
                        otherQuestions: questions,
                      })
                      onUpdateQuestion(index, { media: { type: 'image', url: imageUrl } })
                      onShowToast({ message: '✨ تم توليد صورة للسؤال', type: 'success' })
                    } catch (error) {
                      console.error('AI question image failed', error)
                      const maybeCode = (error as { code?: unknown } | null | undefined)?.code
                      const code = typeof maybeCode === 'string' ? maybeCode : undefined
                      const message = error instanceof Error ? error.message : 'فشل توليد صورة السؤال'
                      if (typeof code === 'string' && code.includes('resource-exhausted')) {
                        onOpenUpgradeDialog('You have used all your free AI credits. Please upgrade via bank transfer (manual activation) to continue.')
                      }
                      onShowToast({ message: `❌ ${message}`, type: 'error' })
                    } finally {
                      setAiImageLoadingIndex(null)
                    }
                  }}
                  onSelectMediaType={(value) => {
                    if (value === 'none') {
                      const { media: removedMedia, ...rest } = q
                      void removedMedia
                      onReplaceQuestion(index, rest as QuizQuestion)
                      return
                    }
                    onUpdateQuestion(index, { media: { type: value as QuizMedia['type'], url: q.media?.url ?? '' } })
                  }}
                  onChangeMediaUrl={(value) => {
                    onUpdateQuestion(index, { media: { ...q.media!, url: value } })
                  }}
                  onUploadMedia={() => {
                    const input = document.createElement('input')
                    input.type = 'file'
                    input.accept = q.media?.type === 'video' ? 'video/*' : q.media?.type === 'gif' ? 'image/gif' : 'image/*'
                    input.onchange = async (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0]
                      if (!file) return
                      onSetUploadingIndex(index)
                      try {
                        const ext = file.name.split('.').pop() || 'bin'
                        const path = `quiz-media/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
                        const storageRef = ref(storage, path)
                        await uploadBytes(storageRef, file)
                        const url = await getDownloadURL(storageRef)
                        onUpdateQuestion(index, { media: { ...q.media!, url } })
                      } catch (err) {
                        console.error('Upload failed', err)
                        alert('Upload failed. Check Firebase Storage rules.')
                      } finally {
                        onSetUploadingIndex(null)
                      }
                    }
                    input.click()
                  }}
                  onPasteMediaUrl={async () => {
                    try {
                      const text = await navigator.clipboard.readText()
                      if (text) onUpdateQuestion(index, { media: { ...q.media!, url: text } })
                    } catch (err) {
                      console.error('Failed to read clipboard', err)
                    }
                  }}
                />
              </>
            )}
          </QuestionCardShell>
        )
      })}
    </>
  )
}

export default QuestionSection
