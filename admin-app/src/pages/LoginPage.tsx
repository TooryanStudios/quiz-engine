import { signInWithPopup, signInWithRedirect } from 'firebase/auth'
import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { auth, googleProvider } from '../lib/firebase'
import { useToast } from '../lib/ToastContext'
import logoImg from '../assets/QYan_logo_300x164.jpg'

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { showToast } = useToast()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const wasSignedOut = !!(location.state as { signedOut?: boolean } | null)?.signedOut
  const [showBanner, setShowBanner] = useState(wasSignedOut)

  useEffect(() => {
    if (!wasSignedOut) return
    // Clear the router state so a refresh won't re-show the banner
    window.history.replaceState({}, '')
    const t = setTimeout(() => setShowBanner(false), 3000)
    return () => clearTimeout(t)
  }, [wasSignedOut])

  useEffect(() => {
    // Warm dashboard chunk while the user is on login to speed post-sign-in navigation.
    void import('./DashboardPage')
  }, [])

  const handleGoogleLogin = async () => {
    setError('')
    setLoading(true)
    try {
      await signInWithPopup(auth, googleProvider)
      showToast({ 
        message: 'Sign in successful! Loading your data...', 
        type: 'info',
        durationMs: 4000 
      })
      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      const code = typeof err === 'object' && err !== null && 'code' in err
        ? String((err as { code?: string }).code)
        : ''

      if (code === 'auth/popup-blocked' || code === 'auth/cancelled-popup-request') {
        showToast({
          message: 'Popup was blocked. Redirecting to Google sign-in...',
          type: 'info',
          durationMs: 3000,
        })
        await signInWithRedirect(auth, googleProvider)
        return
      }

      if (code === 'auth/popup-closed-by-user') {
        setError('Sign-in popup was closed before completing login.')
        return
      }

      if (err instanceof Error) setError(err.message)
      else setError('Sign in failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <img src={logoImg} alt="QYan Logo" className="login-logo" />
          <h1 className="login-title">Q<span>Yan</span> Gaming</h1>
        </div>

        <div className="login-divider"></div>

        <div className="login-body">
          <h2>⚡ حان وقت التحدي</h2>
          <p>Please sign in with your Google account to manage your quizzes and content.</p>

          {showBanner && (
            <div className="login-signedout-banner">
              <span>✓</span> تم تسجيل الخروج بنجاح
            </div>
          )}

          {error && (
            <div className="login-error">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          <button 
            className="google-login-btn" 
            onClick={handleGoogleLogin} 
            disabled={loading}
          >
            {loading ? (
              <span className="save-icon-spinning" style={{ fontSize: '1.2rem' }}>⌛</span>
            ) : (
              <svg className="google-icon" width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335"/>
              </svg>
            )}
            <span>{loading ? 'Signing in...' : 'Continue with Google'}</span>
          </button>
        </div>

        <div className="login-footer">
          &copy; 2026 QYan - Development phase
        </div>
      </div>
    </main>
  )
}
