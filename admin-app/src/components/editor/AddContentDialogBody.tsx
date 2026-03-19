import type { QuestionType } from '../../types/quiz'

type AddContentDialogBodyProps = {
  questionTypeOptions: Array<{ label: string; value: string }>
  onSelectQuestion: (type: QuestionType) => void
  onSelectAi: () => void
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

export function AddContentDialogBody({
  questionTypeOptions,
  onSelectQuestion,
  onSelectAi,
}: AddContentDialogBodyProps) {
  return (
    <div className="add-content-dialog">
      <div className="add-content-tabs">
        <button className="add-content-tab add-content-tab--active" style={{ cursor: 'default' }}>
          ❓ أسئلة
        </button>
        <button
          className="add-content-tab"
          onClick={onSelectAi}
        >
          ✨ توليد ذكي
        </button>
      </div>

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
    </div>
  )
}