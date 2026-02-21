import { signInWithPopup } from 'firebase/auth'
import { auth, googleProvider } from '../lib/firebase'

export function LoginPage() {
  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider)
      alert('Signed in successfully')
    } catch (error) {
      alert(`Sign-in failed: ${(error as Error).message}`)
    }
  }

  return (
    <section className="panel">
      <h2>Admin Login</h2>
      <p>Use Google Sign-In to manage quizzes and packs.</p>
      <button onClick={handleGoogleLogin}>Continue with Google</button>
    </section>
  )
}
