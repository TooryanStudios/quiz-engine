/**
 * Tiny module-level flag so any part of the app can mark a sign-out as
 * user-initiated. App.tsx reads and clears it inside onAuthStateChanged.
 */
let _pending = false

export function markSignOut(): void {
  _pending = true
}

export function consumeSignOut(): boolean {
  const v = _pending
  _pending = false
  return v
}
