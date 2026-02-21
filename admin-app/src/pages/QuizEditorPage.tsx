import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { auth } from '../lib/firebase'
import type { QuizDoc, QuizQuestion } from '../types/quiz'
import { createQuiz, getQuizById, updateQuiz } from '../lib/quizRepo'

const SAMPLE_QUESTIONS: QuizQuestion[] = [
  { type: 'single', text: 'What is the largest animal on Earth?', options: ['Elephant', 'Blue Whale', 'Giraffe', 'Great White Shark'], correctIndex: 1, duration: 20 },
  { type: 'single', text: 'How many legs does a spider have?', options: ['6', '8', '10', '12'], correctIndex: 1, duration: 15 },
  { type: 'single', text: 'Which animal is known as the King of the Jungle?', options: ['Tiger', 'Leopard', 'Lion', 'Cheetah'], correctIndex: 2, duration: 15 },
  { type: 'single', text: 'What do pandas primarily eat?', options: ['Fish', 'Bamboo', 'Berries', 'Insects'], correctIndex: 1, duration: 20 },
  { type: 'single', text: 'Which bird cannot fly?', options: ['Eagle', 'Parrot', 'Penguin', 'Sparrow'], correctIndex: 2, duration: 15 },
  { type: 'single', text: 'How long is an elephant pregnant before giving birth?', options: ['6 months', '12 months', '18 months', '22 months'], correctIndex: 3, duration: 25 },
  { type: 'single', text: 'What is a group of wolves called?', options: ['Herd', 'Pack', 'Flock', 'Colony'], correctIndex: 1, duration: 20 },
  { type: 'multi', text: 'Which of the following are mammals? (select all)', options: ['Dolphin', 'Shark', 'Bat', 'Crocodile'], correctIndices: [0, 2], duration: 25 },
  { type: 'multi', text: 'Which animals are nocturnal? (select all)', options: ['Owl', 'Eagle', 'Bat', 'Hawk'], correctIndices: [0, 2], duration: 25 },
  { type: 'multi', text: 'Which of these animals hibernate? (select all)', options: ['Bear', 'Lion', 'Hedgehog', 'Giraffe'], correctIndices: [0, 2], duration: 25 },
  { type: 'single', text: 'What is the fastest land animal?', options: ['Lion', 'Horse', 'Cheetah', 'Greyhound'], correctIndex: 2, duration: 15 },
  { type: 'single', text: 'Which animal has the longest lifespan?', options: ['Elephant', 'Tortoise', 'Whale', 'Parrot'], correctIndex: 1, duration: 20 },
  { type: 'single', text: 'How many hearts does an octopus have?', options: ['1', '2', '3', '4'], correctIndex: 2, duration: 20 },
  { type: 'single', text: 'What colour is a polar bear\'s skin?', options: ['White', 'Pink', 'Black', 'Grey'], correctIndex: 2, duration: 20 },
  { type: 'single', text: 'Which is the only mammal capable of true flight?', options: ['Flying squirrel', 'Bat', 'Sugar glider', 'Flying lemur'], correctIndex: 1, duration: 20 },
  { type: 'order', text: 'Order these animals from smallest to largest', items: ['Mouse', 'Cat', 'Wolf', 'Horse'], correctOrder: [0, 1, 2, 3], duration: 30 },
  { type: 'order', text: 'Order these animals by average lifespan (shortest first)', items: ['Mouse', 'Dog', 'Horse', 'Tortoise'], correctOrder: [0, 1, 2, 3], duration: 30 },
  { type: 'match', text: 'Match each animal to its young', pairs: [{ left: 'Cow', right: 'Calf' }, { left: 'Sheep', right: 'Lamb' }, { left: 'Dog', right: 'Puppy' }, { left: 'Cat', right: 'Kitten' }], duration: 35 },
  { type: 'match', text: 'Match each animal to its home', pairs: [{ left: 'Bee', right: 'Hive' }, { left: 'Bird', right: 'Nest' }, { left: 'Fox', right: 'Den' }, { left: 'Rabbit', right: 'Burrow' }], duration: 35 },
  { type: 'single', text: 'Which animal sleeps standing up?', options: ['Elephant', 'Horse', 'Giraffe', 'All of the above'], correctIndex: 3, duration: 20 },
]

const starterQuestion: QuizQuestion = {
  type: 'single',
  text: 'سؤال جديد',
  options: ['A', 'B', 'C', 'D'],
  correctIndex: 0,
  duration: 20,
}

export function QuizEditorPage() {
  const { id: routeId } = useParams<{ id: string }>()
  const navigate = useNavigate()
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

  // Must be declared before any early returns (Rules of Hooks)
  const shareUrl = useMemo(() => `https://quizengine.onrender.com/?quiz=${encodeURIComponent(slug)}`, [slug])

  if (loading) return <section className="panel"><p>Loading quiz...</p></section>

  const updateQuestion = (index: number, patch: Partial<QuizQuestion>) => {
    setQuestions((prev) => prev.map((q, i) => (i === index ? { ...q, ...patch } : q)))
  }

  const addQuestion = () => {
    setQuestions((prev) => [...prev, { ...starterQuestion }])
  }

  const loadSamples = () => {
    setTitle('Animals Pack Quiz')
    setSlug('animals-pack-quiz')
    setQuestions(SAMPLE_QUESTIONS)
    setStatus('20 sample questions loaded — click Save Quiz to persist.')
  }

  const removeQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index))
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
          <h3 style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Question {index + 1}</span>
            <button type="button" onClick={() => removeQuestion(index)} style={{ background: '#711', fontSize: '0.8em', padding: '0.2rem 0.6rem' }}>✕ Remove</button>
          </h3>
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
          <button type="button" onClick={loadSamples} style={{ background: '#444' }}>Load 20 Samples</button>
        </div>
        <div className="grid grid-2" style={{ marginTop: '0.75rem' }}>
          <button type="button" onClick={() => navigate('/dashboard')} style={{ background: '#555' }}>Cancel</button>
          <button type="button" onClick={saveQuiz}>Save Quiz</button>
        </div>
        {status && <p style={{ marginTop: '0.5rem' }}>{status}</p>}
      </section>
    </>
  )
}
