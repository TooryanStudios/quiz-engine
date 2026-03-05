import { useState } from 'react'
import type { MiniGameDefinition } from '../../config/miniGames'
import type { QuestionType } from '../../types/quiz'

type AddContentDialogBodyProps = {
  initialTab: 'questions' | 'minigames'
  questionTypeOptions: Array<{ label: string; value: string }>
  miniGames: MiniGameDefinition[]
  onSelectQuestion: (type: QuestionType) => void
  onSelectMiniGame: (id: string) => void
}

interface QuestionTypeVisual {
  icon: string
  name: string
  description: string
  accent: string
}

const QUESTION_TYPE_VISUALS: Record<string, QuestionTypeVisual> = {
  single: {
    icon: '🧩',
    name: 'اختيار واحد',
    description: 'اختر الجواب الصحيح الواحد من بين الخيارات',
    accent: '#3b82f6',
  },
  multi: {
    icon: '✅',
    name: 'اختيار متعدد',
    description: 'قد يكون أكثر من إجابة صحيحة واحدة',
    accent: '#8b5cf6',
  },
  match: {
    icon: '🔗',
    name: 'مطابقة',
    description: 'صِل كل عنصر بما يناسبه من العمود الآخر',
    accent: '#14b8a6',
  },
  match_plus: {
    icon: '🧠',
    name: 'مطابقة بلس',
    description: 'نسخة متقدمة من سؤال المطابقة',
    accent: '#ec4899',
  },
  order: {
    icon: '🔢',
    name: 'ترتيب',
    description: 'رتّب العناصر بالترتيب الصحيح',
    accent: '#f97316',
  },
  order_plus: {
    icon: '📊',
    name: 'ترتيب بلس',
    description: 'نسخة متقدمة من سؤال الترتيب',
    accent: '#f59e0b',
  },
  type: {
    icon: '⌨️',
    name: 'كتابة الإجابة',
    description: 'اكتب الجواب بنفسك بدون خيارات',
    accent: '#6366f1',
  },
  boss: {
    icon: '👑',
    name: 'سؤال زعيم',
    description: 'اختيار واحد بصيغة التحدي الكبير',
    accent: '#eab308',
  },
}

const MINIGAME_ACCENT_COLORS = [
  '#3b82f6', '#8b5cf6', '#14b8a6', '#ec4899',
  '#f97316', '#f59e0b', '#6366f1', '#eab308',
  '#22c55e', '#ef4444', '#06b6d4', '#a855f7',
  '#84cc16', '#f43f5e', '#0ea5e9', '#d946ef',
]

export function AddContentDialogBody({
  initialTab,
  questionTypeOptions,
  miniGames,
  onSelectQuestion,
  onSelectMiniGame,
}: AddContentDialogBodyProps) {
  const [activeTab, setActiveTab] = useState<'questions' | 'minigames'>(initialTab)

  return (
    <div className="add-content-dialog">
      {/* Tab switcher */}
      <div className="add-content-tabs">
        <button
          className={`add-content-tab${activeTab === 'questions' ? ' add-content-tab--active' : ''}`}
          onClick={() => setActiveTab('questions')}
        >
          ❓ أسئلة
        </button>
        <button
          className={`add-content-tab${activeTab === 'minigames' ? ' add-content-tab--active' : ''}`}
          onClick={() => setActiveTab('minigames')}
        >
          🎮 ميني جيم
        </button>
      </div>

      {/* Questions grid */}
      {activeTab === 'questions' && (
        <div className="add-content-grid">
          {questionTypeOptions.map((opt) => {
            const visual = QUESTION_TYPE_VISUALS[opt.value] ?? {
              icon: '❓',
              name: opt.label,
              description: '',
              accent: '#64748b',
            }
            return (
              <button
                key={opt.value}
                className="add-content-card"
                style={{ '--card-accent': visual.accent } as React.CSSProperties}
                onClick={() => onSelectQuestion(opt.value as QuestionType)}
              >
                <div className="add-content-card__icon">{visual.icon}</div>
                <div className="add-content-card__body">
                  <div className="add-content-card__name">{visual.name}</div>
                  <div className="add-content-card__desc">{visual.description}</div>
                </div>
              </button>
            )
          })}
        </div>
      )}

      {/* Mini-games grid */}
      {activeTab === 'minigames' && (
        <div className="add-content-grid add-content-grid--minigames">
          {miniGames.map((miniGame, idx) => (
            <button
              key={miniGame.id}
              className="add-content-card"
              style={{ '--card-accent': MINIGAME_ACCENT_COLORS[idx % MINIGAME_ACCENT_COLORS.length] } as React.CSSProperties}
              onClick={() => onSelectMiniGame(miniGame.id)}
            >
              <div className="add-content-card__icon">{miniGame.icon}</div>
              <div className="add-content-card__body">
                <div className="add-content-card__name">{miniGame.defaultArabicName}</div>
                <div className="add-content-card__desc">{miniGame.description}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}