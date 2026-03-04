import type { QuizQuestion } from '../../types/quiz'
import { MatchPlusPairSettings } from './MatchPlusPairSettings'
import { PairRowEditor } from './PairRowEditor'

type PairsAnswerSectionProps = {
  sectionLabel: string
  questionIndex: number
  question: QuizQuestion
  uploadingPairImageKey: string | null
  onUpdateQuestion: (patch: Partial<QuizQuestion>) => void
  onUploadPairImage: (questionIndex: number, pairIndex: number, side: 'left' | 'right') => void
  onUploadMatchPlusImage: () => void
}

export function PairsAnswerSection({
  sectionLabel,
  questionIndex,
  question,
  uploadingPairImageKey,
  onUpdateQuestion,
  onUploadPairImage,
  onUploadMatchPlusImage,
}: PairsAnswerSectionProps) {
  return (
    <div style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>{sectionLabel}</label>
      {question.type === 'match_plus' && (
        <MatchPlusPairSettings
          matchPlusMode={question.matchPlusMode || 'image-image'}
          matchPlusImage={question.matchPlusImage || ''}
          matchPlusGridSize={Number(question.matchPlusGridSize || 3)}
          onModeChange={(value) => onUpdateQuestion({ matchPlusMode: value as QuizQuestion['matchPlusMode'] })}
          onImageChange={(value) => onUpdateQuestion({ matchPlusImage: value })}
          onGridSizeChange={(value) => onUpdateQuestion({ matchPlusGridSize: value })}
          onUploadImage={onUploadMatchPlusImage}
        />
      )}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
        {(question.pairs || []).map((pair, pairIndex) => {
          return (
            <PairRowEditor
              key={pairIndex}
              isMatchPlus={question.type === 'match_plus'}
              matchMode={String(question.matchPlusMode || 'image-image')}
              pairIndex={pairIndex}
              leftValue={String(pair.left || '').trim()}
              rightValue={String(pair.right || '').trim()}
              leftUploading={uploadingPairImageKey === `${questionIndex}:${pairIndex}:left`}
              rightUploading={uploadingPairImageKey === `${questionIndex}:${pairIndex}:right`}
              onChangeLeft={(value) => {
                const next = [...(question.pairs || [])]
                next[pairIndex] = { ...next[pairIndex], left: value }
                onUpdateQuestion({ pairs: next })
              }}
              onChangeRight={(value) => {
                const next = [...(question.pairs || [])]
                next[pairIndex] = { ...next[pairIndex], right: value }
                onUpdateQuestion({ pairs: next })
              }}
              onUploadLeft={() => onUploadPairImage(questionIndex, pairIndex, 'left')}
              onUploadRight={() => onUploadPairImage(questionIndex, pairIndex, 'right')}
            />
          )
        })}
      </div>
    </div>
  )
}