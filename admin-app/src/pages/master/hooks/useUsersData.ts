import { useEffect, useMemo, useRef, useState } from 'react'
import { type DocumentSnapshot } from 'firebase/firestore'
import { collection, documentId, onSnapshot, query, where } from 'firebase/firestore'
import { subscribeAllUsers, fetchMoreUsers, fetchAuthUsers, type UserProfile, type AuthUserRecord } from '../../../lib/adminRepo'
import { db } from '../../../lib/firebase'

export interface UsersData {
  users: UserProfile[]
  authUsers: AuthUserRecord[]
  hasMore: boolean
  loadingMore: boolean
  loadMore: () => Promise<void>
  error: string | null
}

export function useUsersData(): UsersData {
  const [firestoreUsers, setFirestoreUsers] = useState<UserProfile[]>([])
  const [authUsers, setAuthUsers] = useState<AuthUserRecord[]>([])
  const [hasMore, setHasMore] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [creditsByUid, setCreditsByUid] = useState<Record<string, number | null>>({})
  const cursor = useRef<DocumentSnapshot | null>(null)

  const knownUids = useMemo(() => {
    const ids = new Set<string>()
    for (const u of firestoreUsers) ids.add(u.uid)
    for (const a of authUsers) ids.add(a.uid)
    return Array.from(ids)
  }, [firestoreUsers, authUsers])

  // Keep a real-time credits map keyed by uid from entitlements/{uid}.
  useEffect(() => {
    if (knownUids.length === 0) {
      setCreditsByUid({})
      return
    }

    const chunkSize = 30
    const chunks: string[][] = []
    for (let i = 0; i < knownUids.length; i += chunkSize) {
      chunks.push(knownUids.slice(i, i + chunkSize))
    }

    const unsubs = chunks.map((ids) => {
      const q = query(collection(db, 'entitlements'), where(documentId(), 'in', ids))
      return onSnapshot(q, (snap) => {
        setCreditsByUid((prev) => {
          const next = { ...prev }
          for (const uid of ids) next[uid] = null
          snap.forEach((d) => {
            const val = d.data()?.creditsRemaining
            next[d.id] = typeof val === 'number' ? val : null
          })
          return next
        })
      }, (err) => {
        console.warn('[useUsersData] Entitlements credits watch failed:', err.message)
      })
    })

    return () => {
      for (const unsub of unsubs) unsub()
    }
  }, [knownUids])

  // Real-time Firestore subscription
  useEffect(() => {
    return subscribeAllUsers(
      ({ items, cursor: c, hasMore: h }) => {
        setFirestoreUsers(items)
        cursor.current = c
        setHasMore(h)
        setError(null)
      },
      (err) => {
        console.error('[useUsersData]', err)
        setError(err.message)
      }
    )
  }, [])

  // One-time Auth fetch — gives us all accounts even without Firestore docs
  useEffect(() => {
    fetchAuthUsers()
      .then(setAuthUsers)
      .catch(err => console.warn('[useUsersData] Auth fetch failed (function not deployed yet?):', err.message))
  }, [])

  // Merge: Auth is the source of truth for who exists; Firestore adds rich profile data
  const users = useMemo<UserProfile[]>(() => {
    const profileByUid = new Map(firestoreUsers.map(u => [u.uid, u]))

    const merged: UserProfile[] = authUsers.map(a => {
      const profile = profileByUid.get(a.uid)
      if (profile) return profile
      // Synthesise a minimal profile from Auth data
      return {
        uid: a.uid,
        email: a.email || '',
        displayName: a.displayName || '',
        photoURL: a.photoURL || '',
        status: a.disabled ? 'blocked' : 'active',
        platform: 'unknown',
        signInCount: 0,
        createdAt: null,
        lastSeen: null,
        _authOnly: true,
      } satisfies UserProfile
    })

    // Fall back to pure Firestore list if Auth function isn't deployed yet
    const source = merged.length > 0 ? merged : firestoreUsers

    return source
      .map((u) => ({
        ...u,
        creditsRemaining: creditsByUid[u.uid] ?? null,
      }))
      .sort((a, b) => {
      const ta = a.lastSeen?.toMillis?.() ?? 0
      const tb = b.lastSeen?.toMillis?.() ?? 0
      return tb - ta
    })
  }, [firestoreUsers, authUsers, creditsByUid])

  const loadMore = async () => {
    if (!cursor.current || loadingMore) return
    setLoadingMore(true)
    try {
      const { items, cursor: c, hasMore: h } = await fetchMoreUsers(cursor.current)
      setFirestoreUsers(prev => [...prev, ...items])
      cursor.current = c
      setHasMore(h)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoadingMore(false)
    }
  }

  return { users, authUsers, hasMore, loadingMore, loadMore, error }
}

