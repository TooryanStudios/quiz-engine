import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { auth } from '../lib/firebase'
import type { QuizDoc, QuizQuestion } from '../types/quiz'
import { createQuiz, getQuizById, updateQuiz } from '../lib/quizRepo'

const starterQuestion: QuizQuestion = {
  type: 'single',
  text: 'سؤال جديد',
  options: ['A', 'B', 'C', 'D'],
  correctIndex: 0,
  duration: 20,
}

export function QuizEditorPage() {
  const { id: routeId } = useParams<{ id: string }>()
  const [quizId, setQuizId] = useState<string | null>(routeId ?? null)
  const [title, setTitle] = useState('')
  const [slug, setSlug] = useState('')
  const [visibility, setVisibility] = useState<'public' | 'private'>('public')
  const [questions, setQuestions] = useState<QuizQuestion[]>([starterQuestion])
  const [status, setStatus] = useState('')
  const [loading, setLoading] = useState(!!routeId)

  // Always use the real logged-in user's UID
  const ownerId = auth.currentUser?.uid ?? ''

  // Load existing quiz when editing
  useEffect(() => {
    if (!routeId) {
      setTitle('New Quiz')
      setSlug('new-quiz')
      return
    }
    getQuizById(routeId)
      .then((data) => {
        if (!data) { setStatus('Quiz not found.'); return }
        setTitle(data.title)
        setSlug(data.slug)
        setVisibility(data.visibility)
        setQuestions(data.questions)
      })
      .catch((err) => setStatus(`Load failed: ${err.message}`))
      .finally(() => setLoading(false))
  }, [routeId])

  if (loading) return <section className="panel"><p>Loading quiz...</p></section>

  const shareUrl = useMemo(() => `https://quizengine.onrender.com/?quiz=${encodeURIComponent(slug)}`, [slug])

  const updateQuestion = (index: number, patch: Partial<QuizQuestion>) => {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)))
  }

  const addQuestion = () => {
    setQuestions((prev) => [...prev, { ...starterQuestion }])
  }

  const saveQuiz = async () => {
    if (!ownerId) {
      setStatus('Error: not signed in.')
      return
    }
    const payload: QuizDoc = {
      ownerId,
      title,
      slug,
      visibility,
      tags: ['animals'],
      questions,
    }

    try {
      if (quizId) {
        await updateQuiz(quizId, payload)
        setStatus(`Updated ✓ (${quizId})`)
      } else {
        const id = await createQuiz(payload)
        setQuizId(id)
        setStatus(`Saved ✓ (${id})`)
      }
    } catch (error) {
      setStatus(`Save failed: ${(error as Error).message}`)
    }
  }

  return (
    <>
      <section className="panel">
        <h2>Quiz Editor</h2>
        <div className="grid">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Quiz title" />
          <input value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="Share slug" />
          <select value={visibility} onChange={(e) => setVisibility(e.target.value as 'public' | 'private')}>
            <option value="public">Public</option>
            <option value="private">Private</option>
          </select>
          <input value={shareUrl} readOnly />
        </div>
      </section>

      {questions.map((q, index) => (
        <section key={index} className="panel">
          <h3>Question {index + 1}</h3>
          <div className="grid">
            <select value={q.type} onChange={(e) => updateQuestion(index, { type: e.target.value as QuizQuestion['type'] })}>
              <option value="single">Single</option>
              <option value="multi">Multi</option>
              <option value="match">Match</option>
              <option value="order">Order</option>
            </select>
            <textarea
              rows={3}
              value={q.text}
              onChange={(e) => updateQuestion(index, { text: e.target.value })}
              placeholder="Question text"
            />
            <input
              type="number"
              value={q.duration || 20}
              onChange={(e) => updateQuestion(index, { duration: Number(e.target.value) })}
              placeholder="Duration seconds"
            />
          </div>
        </section>
      ))}

      <section className="panel">
        <div className="grid grid-2">
          <button type="button" onClick={addQuestion}>+ Add Question</button>
          <button type="button" onClick={saveQuiz}>Save Quiz</button>
        </div>
        {status && <p style={{ marginTop: '0.5rem' }}>{status}</p>}
      </section>
    </>
  )
}
