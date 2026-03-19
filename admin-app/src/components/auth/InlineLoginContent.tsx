import { useState } from 'react'

type InlineLoginContentProps = {
  description: string
  onGoogleSignIn: () => Promise<void>
}

export function InlineLoginContent({ description, onGoogleSignIn }: InlineLoginContentProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSignIn = async () => {
    setError('')
    setLoading(true)
    try {
      await onGoogleSignIn()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'فشل تسجيل الدخول')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '1rem',
      padding: '0.5rem 0',
      direction: 'rtl',
    }}>
      <p style={{ 
        margin: 0, 
        color: 'var(--text-secondary, #666)',
        fontSize: '0.95rem',
        lineHeight: '1.5',
      }}>
        {description}
      </p>

      {error && (
        <div style={{
          padding: '0.75rem',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '8px',
          color: '#ef4444',
          fontSize: '0.875rem',
        }}>
          ⚠️ {error}
        </div>
      )}

      <button
        onClick={handleSignIn}
        disabled={loading}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.75rem',
          padding: '0.875rem 1.5rem',
          background: loading ? '#f3f4f6' : '#fff',
          border: '1px solid #e5e7eb',
          borderRadius: '10px',
          fontSize: '0.95rem',
          fontWeight: '500',
          color: loading ? '#9ca3af' : '#1f2937',
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
          boxShadow: loading ? 'none' : '0 1px 3px rgba(0,0,0,0.1)',
        }}
        onMouseEnter={(e) => {
          if (!loading) {
            e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.15)'
            e.currentTarget.style.transform = 'translateY(-1px)'
          }
        }}
        onMouseLeave={(e) => {
          if (!loading) {
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'
            e.currentTarget.style.transform = 'translateY(0)'
          }
        }}
      >
        {loading ? (
          <>
            <span style={{
              display: 'inline-flex',
              gap: '4px',
            }}>
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#9ca3af',
                animation: 'bounce 1.4s infinite ease-in-out both',
                animationDelay: '-0.32s',
              }} />
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#9ca3af',
                animation: 'bounce 1.4s infinite ease-in-out both',
                animationDelay: '-0.16s',
              }} />
              <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                background: '#9ca3af',
                animation: 'bounce 1.4s infinite ease-in-out both',
              }} />
            </span>
            <span>جاري تسجيل الدخول…</span>
          </>
        ) : (
          <>
            <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span>تسجيل الدخول بواسطة Google</span>
          </>
        )}
      </button>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: scale(0); }
          40% { transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
