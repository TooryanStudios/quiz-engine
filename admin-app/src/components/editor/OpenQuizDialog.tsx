import { useEffect, useMemo, useState } from 'react'
import type { QuizDoc } from '../../types/quiz'
import { subscribeMyQuizzes } from '../../lib/quizRepo'
import './OpenQuizDialog.css'

type QuizListItem = ({ id: string } & QuizDoc) & {
  updatedAt?: { seconds?: number; toMillis?: () => number }
}

type OpenQuizDialogProps = {
  ownerId: string
  onSelect: (quizId: string) => void
  onClose: () => void
}

export function OpenQuizDialog({ ownerId, onSelect, onClose }: OpenQuizDialogProps) {
  const [quizzes, setQuizzes] = useState<QuizListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!ownerId) {
      setLoading(false)
      return
    }
    const unsub = subscribeMyQuizzes(
      ownerId,
      (list) => {
        const sorted = [...list].sort((a, b) => {
          const toMs = (item?: QuizListItem) => item?.updatedAt?.toMillis?.() ?? (item?.updatedAt?.seconds ? item.updatedAt.seconds * 1000 : 0)
          return toMs(b) - toMs(a)
        })
        setQuizzes(sorted)
        setLoading(false)
      },
      () => setLoading(false),
    )

    return () => {
      if (typeof unsub === 'function') {
        unsub()
      }
    }
  }, [ownerId])

  const searchLower = search.trim().toLowerCase()
  const filtered = useMemo(() => {
    if (!searchLower) return quizzes
    return quizzes.filter((quiz) => {
      const title = quiz.title?.toLowerCase() ?? ''
      const slug = quiz.slug?.toLowerCase() ?? ''
      return title.includes(searchLower) || slug.includes(searchLower)
    })
  }, [quizzes, searchLower])

  return (
    <div className="open-quiz-backdrop" onClick={onClose}>
      <div className="open-quiz-dialog" onClick={(event) => event.stopPropagation()}>
        <header className="open-quiz-header">
          <div>
            <h2>📂 فتح اختبار</h2>
            <p>اختر من الاختبارات التي أنشأتها</p>
          </div>
          <button type="button" className="open-quiz-close" onClick={onClose}>
            ✕
          </button>
        </header>

        <div className="open-quiz-search">
          <input
            dir="auto"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="ابحث عن اسم الاختبار أو الرابط"
          />
        </div>

        <div className="open-quiz-body">
          {loading && <div className="open-quiz-empty">جارٍ تحميل الاختبارات…</div>}
          {!loading && filtered.length === 0 && (
            <div className="open-quiz-empty">
              {searchLower ? 'لا توجد نتائج مطابقة.' : 'لم يتم إنشاء أي اختبار بعد.'}
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="open-quiz-grid">
              {filtered.map((quiz) => (
                <button
                  key={quiz.id}
                  type="button"
                  className="open-quiz-card"
                  onClick={() => onSelect(quiz.id)}
                >
                  <div className="open-quiz-card-thumb">
                    {quiz.coverImage ? (
                      <img src={quiz.coverImage} alt={quiz.title} loading="lazy" />
                    ) : (
                      <span role="img" aria-label="placeholder">📘</span>
                    )}
                  </div>
                  <div className="open-quiz-card-content">
                    <h3>{quiz.title || 'اختبار بدون عنوان'}</h3>
                    <p>{quiz.slug || '—'}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
