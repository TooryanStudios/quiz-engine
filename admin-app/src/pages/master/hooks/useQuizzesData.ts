import { useEffect, useRef, useState } from 'react'
import { type DocumentSnapshot } from 'firebase/firestore'
import { subscribeAllQuizzes, fetchMoreQuizzes } from '../../../lib/adminRepo'
import type { QuizDoc } from '../../../types/quiz'

export type QuizItem = QuizDoc & { id: string }

export interface QuizzesData {
  quizzes: QuizItem[]
  hasMore: boolean
  loadingMore: boolean
  loadMore: () => Promise<void>
}

export function useQuizzesData(): QuizzesData {
  const [quizzes, setQuizzes] = useState<QuizItem[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const cursor = useRef<DocumentSnapshot | null>(null)

  useEffect(() => {
    return subscribeAllQuizzes(({ items, cursor: c, hasMore: h }) => {
      setQuizzes(items)
      cursor.current = c
      setHasMore(h)
    })
  }, [])

  const loadMore = async () => {
    if (!cursor.current || loadingMore) return
    setLoadingMore(true)
    try {
      const { items, cursor: c, hasMore: h } = await fetchMoreQuizzes(cursor.current)
      setQuizzes(prev => [...prev, ...items])
      cursor.current = c
      setHasMore(h)
    } finally {
      setLoadingMore(false)
    }
  }

  return { quizzes, hasMore, loadingMore, loadMore }
}
