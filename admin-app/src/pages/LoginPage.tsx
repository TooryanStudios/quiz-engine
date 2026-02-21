import { getRedirectResult, signInWithRedirect } from 'firebase/auth'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth, googleProvider } from '../lib/firebase'

export function LoginPage() {
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Handle redirect result when returning from Google
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          navigate('/dashboard', { replace: true })
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [navigate])

  const handleGoogleLogin = () => {
    setError('')
    signInWithRedirect(auth, googleProvider)
  }

  if (loading) return <section className="panel"><p>Checking authentication...</p></section>

  return (
    <section className="panel">
      <h2>Admin Login</h2>
      <p>Use Google Sign-In to manage quizzes and packs.</p>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <button onClick={handleGoogleLogin}>Continue with Google</button>
    </section>
  )
}
