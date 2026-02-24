import { useEffect, useRef, useState } from 'react'
import { type DocumentSnapshot } from 'firebase/firestore'
import { subscribeAllSessions, fetchMoreSessions, type GameSession } from '../../../lib/adminRepo'

export interface SessionsData {
  sessions: GameSession[]
  hasMore: boolean
  loadingMore: boolean
  loadMore: () => Promise<void>
}

export function useSessionsData(): SessionsData {
  const [sessions, setSessions] = useState<GameSession[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const cursor = useRef<DocumentSnapshot | null>(null)

  useEffect(() => {
    return subscribeAllSessions(({ items, cursor: c, hasMore: h }) => {
      setSessions(items)
      cursor.current = c
      setHasMore(h)
    })
  }, [])

  const loadMore = async () => {
    if (!cursor.current || loadingMore) return
    setLoadingMore(true)
    try {
      const { items, cursor: c, hasMore: h } = await fetchMoreSessions(cursor.current)
      setSessions(prev => [...prev, ...items])
      cursor.current = c
      setHasMore(h)
    } finally {
      setLoadingMore(false)
    }
  }

  return { sessions, hasMore, loadingMore, loadMore }
}
