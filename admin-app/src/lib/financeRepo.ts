import {
  collection,
  doc,
  onSnapshot,
  query,
  orderBy,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from './firebase'

export interface ProjectFinanceSummary {
  projectId: string
  budget: number
  currency: string
  updatedAt?: unknown
  updatedBy: string
}

export interface ProjectExpense {
  id: string
  projectId: string
  title: string
  amount: number
  category: string
  date: string
  notes?: string
  createdBy: string
  createdAt?: unknown
}

const FINANCES_COLLECTION = 'workhub_finances'

function projectFinanceRef(projectId: string) {
  return doc(db, FINANCES_COLLECTION, projectId)
}

function projectExpensesCol(projectId: string) {
  return collection(db, FINANCES_COLLECTION, projectId, 'expenses')
}

/**
 * Subscribe to the high-level budget/summary for a project.
 */
export function subscribeProjectFinanceSummary(projectId: string, onData: (summary: ProjectFinanceSummary | null) => void): Unsubscribe {
  return onSnapshot(projectFinanceRef(projectId), (snap) => {
    if (snap.exists()) {
      onData({ projectId, ...snap.data() } as ProjectFinanceSummary)
    } else {
      onData(null)
    }
  }, (err) => {
    console.error('Error fetching project finance summary:', err)
  })
}

/**
 * Ensure the summary document exists, or update the budget.
 */
export async function setProjectBudget(projectId: string, budget: number, currency: string, adminUid: string) {
  await setDoc(projectFinanceRef(projectId), {
    budget,
    currency,
    updatedBy: adminUid,
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

/**
 * Subscribe to line-item expenses for a project.
 */
export function subscribeProjectExpenses(projectId: string, onData: (expenses: ProjectExpense[]) => void): Unsubscribe {
  const q = query(projectExpensesCol(projectId), orderBy('createdAt', 'desc'))
  return onSnapshot(q, (snap) => {
    onData(snap.docs.map((docItem) => ({ id: docItem.id, projectId, ...docItem.data() } as ProjectExpense)))
  }, (err) => {
    console.error('Error fetching project expenses:', err)
  })
}

/**
 * Add an expense.
 */
export async function addProjectExpense(projectId: string, input: Omit<ProjectExpense, 'id' | 'projectId' | 'createdAt'>) {
  await addDoc(projectExpensesCol(projectId), {
    ...input,
    createdAt: serverTimestamp(),
  })
}

/**
 * Update an expense.
 */
export async function updateProjectExpense(projectId: string, expenseId: string, patch: Partial<Omit<ProjectExpense, 'id' | 'projectId' | 'createdAt' | 'createdBy'>>) {
  const ref = doc(db, FINANCES_COLLECTION, projectId, 'expenses', expenseId)
  await updateDoc(ref, patch as Record<string, unknown>)
}

/**
 * Delete an expense.
 */
export async function deleteProjectExpense(projectId: string, expenseId: string) {
  const ref = doc(db, FINANCES_COLLECTION, projectId, 'expenses', expenseId)
  await deleteDoc(ref)
}
