import * as admin from 'firebase-admin'
import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { defineString } from 'firebase-functions/params'

admin.initializeApp()

// Reads from functions/.env (gitignored) — never hardcoded in source.
const masterEmailParam = defineString('MASTER_EMAIL')

export interface AuthUserRecord {
  uid: string
  email: string | null
  displayName: string | null
  photoURL: string | null
  disabled: boolean
  creationTime: string | null
  lastSignInTime: string | null
}

/**
 * Callable function — lists all Firebase Auth users.
 * Only callable by the master admin.
 */
export const listAuthUsers = onCall({ region: 'us-central1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be signed in.')
  }
  if (request.auth.token.email !== masterEmailParam.value()) {
    throw new HttpsError('permission-denied', 'Not authorized.')
  }

  const users: AuthUserRecord[] = []
  let pageToken: string | undefined

  do {
    const result = await admin.auth().listUsers(1000, pageToken)
    for (const u of result.users) {
      users.push({
        uid: u.uid,
        email: u.email ?? null,
        displayName: u.displayName ?? null,
        photoURL: u.photoURL ?? null,
        disabled: u.disabled,
        creationTime: u.metadata.creationTime ?? null,
        lastSignInTime: u.metadata.lastSignInTime ?? null,
      })
    }
    pageToken = result.pageToken
  } while (pageToken)

  return { users }
})

/**
 * Sets the `admin: true` custom claim on the calling user if their email
 * matches MASTER_EMAIL. Call this once from the admin panel to migrate
 * away from email-based Firestore rule checks to claim-based checks.
 * After calling this, sign out and back in to get a refreshed token.
 */
export const grantAdminClaim = onCall({ region: 'us-central1' }, async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Must be signed in.')
  }
  if (request.auth.token.email !== masterEmailParam.value()) {
    throw new HttpsError('permission-denied', 'Not authorized.')
  }
  if (request.auth.token['admin'] === true) {
    return { message: 'Admin claim already set.' }
  }
  await admin.auth().setCustomUserClaims(request.auth.uid, { admin: true })
  return { message: 'Admin claim granted. Sign out and back in to apply.' }
})
