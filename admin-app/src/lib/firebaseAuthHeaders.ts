import { auth } from './firebase'

/** Authorization headers for authenticated application API requests. */
export async function getFirebaseAuthHeader(): Promise<Record<string, string>> {
  await auth.authStateReady()
  const user = auth.currentUser
  if (!user) throw new Error('Please sign in to continue.')
  return { Authorization: `Bearer ${await user.getIdToken()}` }
}
