import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from './firebase'
import type { QuizDoc } from '../types/quiz'

const quizzesCol = collection(db, 'quizzes')

export async function listMyQuizzes(ownerId: string) {
  const q = query(quizzesCol, where('ownerId', '==', ownerId), limit(50))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...(d.data() as QuizDoc) }))
}

export async function getQuizById(id: string) {
  const snap = await getDoc(doc(db, 'quizzes', id))
  if (!snap.exists()) return null
  return { id: snap.id, ...(snap.data() as QuizDoc) }
}

export async function createQuiz(payload: QuizDoc) {
  const docRef = await addDoc(quizzesCol, {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return docRef.id
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
    questions: source.questions.map((q) => ({ ...q })),
  }
  const docRef = await addDoc(quizzesCol, {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return docRef.id
}
