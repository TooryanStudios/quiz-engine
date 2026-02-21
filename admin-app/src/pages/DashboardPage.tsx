import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { auth } from '../lib/firebase'
import { listMyQuizzes } from '../lib/quizRepo'

type QuizItem = { id: string; title: string; slug: string; visibility: string }

export function DashboardPage() {
  const [quizzes, setQuizzes] = useState<QuizItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const uid = auth.currentUser?.uid
    if (!uid) { setLoading(false); return }
    listMyQuizzes(uid)
      .then((list) => setQuizzes(list as QuizItem[]))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <section className="panel">
        <h2>Dashboard</h2>
        <Link to="/editor">
          <button>+ New Quiz</button>
        </Link>
      </section>
      <section className="panel">
        <h3>My Quizzes</h3>
        {loading && <p>Loading...</p>}
        {!loading && quizzes.length === 0 && <p>No quizzes yet. Create one above.</p>}
        {quizzes.map((q) => (
          <div key={q.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #333' }}>
            <div>
              <strong>{q.title}</strong>
              <span style={{ marginLeft: '0.75rem', opacity: 0.6, fontSize: '0.85em' }}>{q.slug}</span>
              <span style={{ marginLeft: '0.5rem', opacity: 0.5, fontSize: '0.75em' }}>[{q.visibility}]</span>
            </div>
            <Link to={`/editor/${q.id}`}>
              <button>Edit</button>
            </Link>
          </div>
        ))}
      </section>
    </>
  )
}
