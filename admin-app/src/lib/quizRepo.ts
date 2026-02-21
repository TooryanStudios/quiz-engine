import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
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
  await updateDoc(doc(db, 'quizzes', id), {
    ...payload,
    updatedAt: serverTimestamp(),
  })
}
