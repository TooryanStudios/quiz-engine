# iOS Safari Authentication Issue & Solution

## The Issue
Users logging into the app via Google Sign-In on iOS Safari were experiencing extremely long delays or infinite loading loops. After selecting their Google account, the app would hang, causing most users to abandon the page.

## The Root Cause
There were two interacting problems causing this behavior on iOS Safari:

1. **Intelligent Tracking Prevention (ITP)**: Safari has aggressive privacy features (ITP) that heavily penalize and block third-party cross-site cookies and storage. 
   - Previously, the app detected mobile devices and explicitly forced `signInWithRedirect` to bypass mobile popup blockers.
   - However, because Firebase Authentication relies on cross-domain cookies to restore the session after the redirect, ITP frequently blocked this, preventing the app from seeing the user as logged in.
2. **Slow Redirect Resolution**: The app's login flow was explicitly awaiting `getRedirectResult()` to resolve before navigating the user to the dashboard. On Safari, this method is notoriously slow or hangs entirely if the redirect state is trapped by ITP.

## The Solution

To fix this, the login flow was refactored with the following principles:

1. **Use `signInWithPopup` as the Primary Default**:
   - Removed the mobile device user-agent detection that forced `signInWithRedirect`.
   - `signInWithPopup` handles authentication entirely within a separate tab/popup window, which generally avoids the strict cross-site cookie blocking of ITP when returning to the main tab.
2. **Fallback to Redirect Only on Error**:
   - `signInWithRedirect` is now kept strictly as a fallback. It only triggers if Firebase throws an `auth/popup-blocked` or `auth/cancelled-popup-request` error.
3. **Optimized Navigation via `onAuthStateChanged`**:
   - Instead of awaiting the slow `getRedirectResult()`, the app now listens to `onAuthStateChanged`.
   - As soon as Firebase detects the authenticated user via `onAuthStateChanged`, the app immediately navigates to the `/dashboard`. This acts as a "fast path" that skips the unnecessary waiting time.

## Guidelines for Future Auth Changes

If you encounter similar auth issues in the future, adhere to these rules:
- **Avoid forced redirects**: Never force `signInWithRedirect` based on user-agent. Always try `signInWithPopup` first.
- **Do not block UI on `getRedirectResult`**: Treat `getRedirectResult` as a secondary check, not the primary gatekeeper for navigation. Rely on `onAuthStateChanged` to react to successful logins as fast as possible.
- **Keep the Auth Domain Clean**: Ensure `[project-id].firebaseapp.com` remains the standard auth domain, as custom domains without proper DNS masking can trigger even tighter ITP restrictions.
