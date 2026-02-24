import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db, auth } from './firebase'

export interface SubscriptionState {
  isSubscribed: boolean
  plan: string | null
  loading: boolean
}

/**
 * Reads entitlements/{uid} from Firestore and returns whether the current user
 * has an active subscription (plan != null or activePackIds is non-empty).
 */
export function useSubscription(): SubscriptionState {
  const [state, setState] = useState<SubscriptionState>({ isSubscribed: false, plan: null, loading: true })

  useEffect(() => {
    const uid = auth.currentUser?.uid
    if (!uid) {
      setState({ isSubscribed: false, plan: null, loading: false })
      return
    }

    getDoc(doc(db, 'entitlements', uid))
      .then((snap) => {
        if (!snap.exists()) {
          setState({ isSubscribed: false, plan: null, loading: false })
          return
        }
        const data = snap.data() as { plan?: string; activePackIds?: string[] }
        const hasPlan = !!data.plan && data.plan !== ''
        const hasPacks = Array.isArray(data.activePackIds) && data.activePackIds.length > 0
        setState({ isSubscribed: hasPlan || hasPacks, plan: data.plan ?? null, loading: false })
      })
      .catch(() => setState({ isSubscribed: false, plan: null, loading: false }))
  }, [])

  return state
}
