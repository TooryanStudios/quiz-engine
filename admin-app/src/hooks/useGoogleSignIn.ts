import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { signInWithPopup, signInWithRedirect } from 'firebase/auth'
import { auth, authReady, googleProvider } from '../lib/firebase'
import { useToast } from '../lib/ToastContext'

export const AUTH_REDIRECT_PENDING_KEY = 'qyan:authRedirectPending'

type GoogleSignInOptions = {
  returnTo?: string
  skipNavigate?: boolean
  onStart?: () => void
  onEnd?: () => void
  onError?: (message: string) => void
  onSuccess?: () => void
}

export function useGoogleSignIn() {
  const { showToast, hideToast } = useToast()
  const navigate = useNavigate()
  const isLocalDevHost = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)

  return useCallback(async (options?: GoogleSignInOptions) => {
    const {
      returnTo = '/dashboard',
      skipNavigate = false,
      onStart,
      onEnd,
      onError,
      onSuccess,
    } = options ?? {}

    onStart?.()
    let hintTimer: ReturnType<typeof setTimeout> | undefined
    hintTimer = setTimeout(() => {
      showToast({
        message: 'إذا لم تفتح نافذة جوجل، يرجى السماح بالنوافذ المنبثقة أو الانتظار قليلاً.',
        type: 'info',
        durationMs: 10000,
      })
    }, 4000)

    try {
      await authReady
      await signInWithPopup(auth, googleProvider)

      if (hintTimer) {
        clearTimeout(hintTimer)
        hintTimer = undefined
      }
      hideToast()
      onSuccess?.()
      if (!skipNavigate) {
        navigate(returnTo, { replace: true })
      }
    } catch (err) {
      if (hintTimer) {
        clearTimeout(hintTimer)
        hintTimer = undefined
      }
      hideToast()
      const code = typeof err === 'object' && err !== null && 'code' in err
        ? String((err as { code?: string }).code)
        : ''

      if (code === 'auth/popup-blocked' || code === 'auth/cancelled-popup-request') {
        showToast({ message: 'تم حظر النافذة المنبثقة. سيتم إعادة التوجيه…', type: 'info', durationMs: 3000 })
        localStorage.setItem(AUTH_REDIRECT_PENDING_KEY, String(Date.now()))
        await signInWithRedirect(auth, googleProvider)
        return
      }

      let message = 'فشل تسجيل الدخول. حاول مرة أخرى.'
      if (code === 'auth/unauthorized-domain') {
        message = isLocalDevHost
          ? 'Localhost غير مضاف في Firebase Authorized Domains. أضف localhost و 127.0.0.1 من Firebase Console.'
          : 'هذا الدومين غير مصرح به في Firebase Authentication. أضفه إلى Authorized domains.'
      } else if (code === 'auth/popup-closed-by-user') {
        message = 'تم إغلاق نافذة تسجيل الدخول. حاول مجدداً.'
      } else if (err instanceof Error) {
        message = err.message
      }

      if (onError) onError(message)
      else showToast({ message, type: 'error' })
    } finally {
      if (hintTimer) {
        clearTimeout(hintTimer)
      }
      onEnd?.()
    }
  }, [hideToast, navigate, showToast, isLocalDevHost])
}
