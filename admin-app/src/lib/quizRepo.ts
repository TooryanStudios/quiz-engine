import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from './firebase'
import type { QuizDoc } from '../types/quiz'

const quizzesCol = collection(db, 'quizzes')

export async function incrementShareCount(id: string) {
  await updateDoc(doc(db, 'quizzes', id), {
    shareCount: increment(1)
  })
}

export async function listMyQuizzes(ownerId: string) {
  const q = query(quizzesCol, where('ownerId', '==', ownerId), limit(50))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as QuizDoc) }))
}

export function subscribeMyQuizzes(
  ownerId: string,
  onData: (quizzes: ({ id: string } & QuizDoc)[]) => void,
  onError?: (e: Error) => void
) {
  const q = query(quizzesCol, where('ownerId', '==', ownerId), limit(50))
  return onSnapshot(q, (snap) => {
    onData(snap.docs.map((d) => ({ id: d.id, ...(d.data() as QuizDoc) })))
  }, onError)
}

export async function getQuizById(id: string) {
  const snap = await getDoc(doc(db, 'quizzes', id))
  if (!snap.exists()) return null
  return { id: snap.id, ...(snap.data() as QuizDoc) }
}

export async function createQuiz(payload: QuizDoc) {
  const docRef = await addDoc(quizzesCol, {
    ...payload,
    originalOwnerId: payload.ownerId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    totalPlays: 0,
    totalSessions: 0,
    totalPlayers: 0,
    shareCount: 0,
  })
  return docRef.id
}

export async function deleteQuiz(id: string) {
  await deleteDoc(doc(db, 'quizzes', id))
}

export async function updateQuiz(id: string, payload: Partial<QuizDoc>) {
  // Firestore rejects `undefined` values — strip them before sending
  const clean = Object.fromEntries(
    Object.entries(payload).filter(([, v]) => v !== undefined)
  )
  await updateDoc(doc(db, 'quizzes', id), {
    ...clean,
    updatedAt: serverTimestamp(),
  })
}

export async function findQuizByOwnerAndSlug(ownerId: string, slug: string) {
  const q = query(quizzesCol, where('ownerId', '==', ownerId), where('slug', '==', slug), limit(1))
  const snap = await getDocs(q)
  if (snap.empty) return null
  const docSnap = snap.docs[0]
  return { id: docSnap.id, ...(docSnap.data() as QuizDoc) }
}

export async function listPublicQuizzes() {
  const q = query(quizzesCol, where('visibility', '==', 'public'), orderBy('updatedAt', 'desc'), limit(100))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as QuizDoc) }))
}

export async function listPublicQuizzesByOwner(ownerId: string) {
  const q = query(
    quizzesCol,
    where('ownerId', '==', ownerId),
    where('visibility', '==', 'public'),
    orderBy('updatedAt', 'desc'),
    limit(20),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as QuizDoc) }))
}

export async function listFeaturedQuizzes() {
  try {
    const q = query(
      quizzesCol,
      where('visibility', '==', 'public'),
      where('featured', '==', true),
      orderBy('updatedAt', 'desc'),
      limit(20),
    )
    const snap = await getDocs(q)
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as QuizDoc) }))
  } catch {
    const q = query(
      quizzesCol,
      where('visibility', '==', 'public'),
      orderBy('updatedAt', 'desc'),
      limit(100),
    )
    const snap = await getDocs(q)
    return snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as QuizDoc) }))
      .filter((quiz) => quiz.featured)
      .slice(0, 20)
  }
}

export async function listFeaturedQuizzesByOwner(ownerId: string) {
  const q = query(
    quizzesCol,
    where('ownerId', '==', ownerId),
    where('featured', '==', true),
    orderBy('updatedAt', 'desc'),
    limit(20),
  )
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as QuizDoc) }))
}

export async function cloneQuiz(source: QuizDoc & { id: string }, newOwnerId: string): Promise<string> {
  const baseSlug = source.slug.replace(/-copy(-\d+)?$/, '')
  const suffix = `-copy-${Date.now().toString(36)}`
  const payload: QuizDoc = {
    ownerId: newOwnerId,
    title: `${source.title} (copy)`,
    slug: `${baseSlug}${suffix}`,
    description: source.description,
    visibility: 'private',
    priceTier: source.priceTier,
    challengePreset: source.challengePreset,
    challengeSettings: source.challengeSettings,
    coverImage: source.coverImage,
    tags: [...(source.tags ?? [])],
    questions: [...(source.questions ?? [])],
    randomizeQuestions: source.randomizeQuestions,
    enableScholarRole: source.enableScholarRole,
  }
  // Strip undefined fields — Firestore rejects them
  const clean = Object.fromEntries(
    Object.entries(payload).filter(([, v]) => v !== undefined)
  )
  const docRef = await addDoc(quizzesCol, {
    ...clean,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return docRef.id
}
