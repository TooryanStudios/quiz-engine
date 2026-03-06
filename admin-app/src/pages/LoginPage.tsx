import { signInWithPopup, signInWithRedirect } from 'firebase/auth'
import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { auth, googleProvider } from '../lib/firebase'
import { useToast } from '../lib/ToastContext'

const TAGLINES = [
  'أنشئ اختباراتك في ثوانٍ ⚡',
  'شارك المعرفة مع الجميع 🌍',
  'تحدّى أصدقاءك الآن 🎯',
  'اجعل التعلم ممتعاً 🎓',
]

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { showToast, hideToast } = useToast()
  const isLocalDevHost = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [theme, setTheme] = useState<'dark'|'light'>('dark')
  const wasSignedOut = !!(location.state as { signedOut?: boolean } | null)?.signedOut
  const [showBanner, setShowBanner] = useState(wasSignedOut)
  const [tagIdx, setTagIdx] = useState(0)

  useEffect(() => {
    if (!wasSignedOut) return
    window.history.replaceState({}, '')
    const t = setTimeout(() => setShowBanner(false), 3000)
    return () => clearTimeout(t)
  }, [wasSignedOut])

  useEffect(() => {
    void import('./DashboardPage')
  }, [])

  useEffect(() => {
    const t = setInterval(() => setTagIdx(i => (i + 1) % TAGLINES.length), 3000)
    return () => clearInterval(t)
  }, [])

  const handleGoogleLogin = async () => {
    setError('')
    setLoading(true)

    // Mobile browsers almost always block popups because the async wrapper
    // breaks the direct user-gesture chain. Skip the popup attempt entirely
    // on mobile and go straight to redirect — saves 1-2 sec per login.
    const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    if (isMobile) {
      await signInWithRedirect(auth, googleProvider)
      return // page will reload after redirect; finally block still runs
    }

    const hintTimer = setTimeout(() => {
      showToast({ message: 'إذا لم تفتح نافذة جوجل، يرجى التأكد من السماح بالنوافذ المنبثقة (Pop-ups) للموقع أو الانتظار قليلاً.', type: 'info', durationMs: 10000 })
    }, 4000)

    try {
      await signInWithPopup(auth, googleProvider)
      clearTimeout(hintTimer)
      hideToast()
      navigate('/dashboard', { replace: true })
    } catch (err: unknown) {
      clearTimeout(hintTimer)
      hideToast()
      const code = typeof err === 'object' && err !== null && 'code' in err
        ? String((err as { code?: string }).code) : ''
      if (code === 'auth/popup-blocked' || code === 'auth/cancelled-popup-request') {
        showToast({ message: 'Popup was blocked. Redirecting…', type: 'info', durationMs: 3000 })
        await signInWithRedirect(auth, googleProvider)
        return
      }
      if (code === 'auth/unauthorized-domain') {
        setError(
          isLocalDevHost
            ? 'Localhost غير مضاف في Firebase Authorized Domains. أضف localhost و 127.0.0.1 من Firebase Console > Authentication > Settings > Authorized domains.'
            : 'هذا الدومين غير مصرح به في Firebase Authentication. أضفه إلى Authorized domains.'
        )
        return
      }
      if (code === 'auth/popup-closed-by-user') {
        setError('تم إغلاق نافذة تسجيل الدخول. حاول مجدداً.')
        return
      }
      if (err instanceof Error) setError(err.message)
      else setError('فشل تسجيل الدخول. حاول مرة أخرى.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={`lp-bg${theme === 'light' ? ' lp-bg--light' : ''}`}>
      {/* Ambient glow blobs */}
      <div className="lp-blob lp-blob-1" />
      <div className="lp-blob lp-blob-2" />

      <div className="lp-card-outer">
      <div className="lp-card">
        {/* Top shimmer bar */}
        <div className="lp-shimmer-bar" />

        {/* Orbit animation */}
        <div className="lp-orbit-wrap">
          <div className="lp-ring lp-ring-1" />
          <div className="lp-ring lp-ring-2" />
          <div className="lp-dot lp-dot-1" />
          <div className="lp-dot lp-dot-2" />
          <div className="lp-dot lp-dot-3" />
          <span className="lp-center-logo">🏆</span>
        </div>

        {/* Floating particles */}
        {['✨','⭐','💡','🎯','🌟'].map((em, i) => (
          <span key={i} className={`lp-particle lp-particle-${i + 1}`}>{em}</span>
        ))}

        {/* Title */}
        <div className="lp-title-wrap">
          <div className="lp-brand-name">Q<span>Yan</span> Gaming</div>
          <div key={tagIdx} className="lp-tagline">{TAGLINES[tagIdx]}</div>
        </div>

        <div className="lp-divider" />

        {/* Signed-out banner */}
        {showBanner && (
          <div className="lp-banner-ok">✓ تم تسجيل الخروج بنجاح</div>
        )}

        {isLocalDevHost && (
          <div className="lp-banner-warn">
            Local preview: if the Google dialog closes immediately, add localhost and 127.0.0.1 to Firebase Authorized Domains.
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="lp-error">⚠️ {error}</div>
        )}

        {/* Google button */}
        <button className={`lp-google-btn${loading ? ' lp-google-btn--loading' : ''}`} onClick={handleGoogleLogin} disabled={loading}>
          {loading ? (
            <>
              <span className="lp-btn-dots">
                <span /><span /><span />
              </span>
              <span>جاري تسجيل الدخول…</span>
            </>
          ) : (
            <>
              <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{flexShrink:0}}>
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335"/>
              </svg>
              <span>Continue with Google</span>
            </>
          )}
        </button>

        <div className="lp-footer">
          <span>© 2026 QYan · صُنع بشغف 💜</span>
          <div className="lp-theme-btns">
            <button className={`lp-theme-btn${theme === 'dark' ? ' active' : ''}`} onClick={() => setTheme('dark')}>🌙</button>
            <button className={`lp-theme-btn${theme === 'light' ? ' active' : ''}`} onClick={() => setTheme('light')}>☀️</button>
          </div>
        </div>
      </div>
      </div>

      <style>{`
        .lp-bg {
          min-height: 100vh; min-height: 100dvh;
          display: flex; align-items: center; justify-content: center;
          padding: 24px;
          background: #02060f;
          position: relative; overflow: hidden;
          transition: background 0.5s ease;
        }
        /* Ambient blobs */
        .lp-blob {
          position: absolute; border-radius: 50%; filter: blur(80px);
          pointer-events: none;
          transition: background 0.5s ease;
        }
        .lp-blob-1 {
          width: 420px; height: 420px;
          background: rgba(124,58,237,0.22);
          top: -100px; left: -80px;
          animation: lpBlob 8s ease-in-out infinite alternate;
        }
        .lp-blob-2 {
          width: 360px; height: 360px;
          background: rgba(219,39,119,0.18);
          bottom: -80px; right: -60px;
          animation: lpBlob 10s ease-in-out infinite alternate-reverse;
        }
        @keyframes lpBlob {
          from { transform: translate(0,0) scale(1); }
          to   { transform: translate(40px,30px) scale(1.1); }
        }

        /* Animated border outer wrapper */
        @property --lp-angle {
          syntax: '<angle>';
          initial-value: 0deg;
          inherits: false;
        }
        .lp-card-outer {
          position: relative; border-radius: 30px; padding: 2px;
          width: 100%; max-width: 400px;
          background: conic-gradient(from var(--lp-angle), #7c3aed, #db2777, #a78bfa, #f472b6, #38bdf8, #7c3aed);
          box-shadow: 0 0 60px rgba(124,58,237,0.25), 0 20px 60px rgba(0,0,0,0.7);
          animation: lpCardIn 0.5s cubic-bezier(0.16,1,0.3,1), lpBorderSpin 4s linear 0.5s infinite;
        }
        @keyframes lpBorderSpin { to { --lp-angle: 360deg; } }
        @keyframes lpCardIn {
          from { opacity: 0; transform: translateY(32px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        /* Card */
        .lp-card {
          position: relative; overflow: hidden;
          width: 100%;
          background: linear-gradient(145deg, rgba(18,10,40,0.97), rgba(30,10,35,0.97));
          border-radius: 28px;
          padding: 2.5rem 2rem 1.8rem;
          display: flex; flex-direction: column; align-items: center; gap: 1.4rem;
          transition: background 0.5s ease, color 0.5s ease;
        }

        /* Shimmer bar */
        .lp-shimmer-bar {
          position: absolute; top: 0; left: 0; right: 0; height: 3px;
          background: linear-gradient(90deg, transparent, #7c3aed, #db2777, #a78bfa, transparent);
          background-size: 200% auto;
          animation: lpShimmer 1.8s linear infinite;
        }
        @keyframes lpShimmer {
          0%   { background-position: -200% center; }
          100% { background-position:  200% center; }
        }

        /* Orbit */
        .lp-orbit-wrap {
          position: relative; width: 110px; height: 110px;
          display: flex; align-items: center; justify-content: center;
        }
        .lp-ring {
          position: absolute; inset: 0; border-radius: 50%;
        }
        .lp-ring-1 {
          border: 2px solid rgba(124,58,237,0.5);
          animation: lpPulse 1.8s ease-out infinite;
        }
        .lp-ring-2 {
          border: 2px solid rgba(219,39,119,0.4);
          animation: lpPulse 1.8s ease-out infinite 0.6s;
        }
        @keyframes lpPulse {
          0%   { transform: scale(0.85); opacity: 0.7; }
          70%  { transform: scale(1.3);  opacity: 0; }
          100% { transform: scale(1.3);  opacity: 0; }
        }
        .lp-dot {
          position: absolute; border-radius: 50%;
          top: 50%; left: 50%; transform-origin: -42px 0;
        }
        .lp-dot-1 {
          width: 10px; height: 10px; margin: -5px 0 0 -5px;
          background: #7c3aed; box-shadow: 0 0 10px #7c3aed;
          animation: lpOrbit1 3s linear infinite;
        }
        .lp-dot-2 {
          width: 8px; height: 8px; margin: -4px 0 0 -4px;
          background: #db2777; box-shadow: 0 0 8px #db2777;
          animation: lpOrbit2 3s linear infinite;
        }
        .lp-dot-3 {
          width: 7px; height: 7px; margin: -3.5px 0 0 -3.5px;
          background: #a78bfa; box-shadow: 0 0 7px #a78bfa;
          animation: lpOrbit3 3s linear infinite;
        }
        @keyframes lpOrbit1 { from { transform: rotate(0deg)   translateX(50px); } to { transform: rotate(360deg)  translateX(50px); } }
        @keyframes lpOrbit2 { from { transform: rotate(120deg) translateX(46px); } to { transform: rotate(480deg)  translateX(46px); } }
        @keyframes lpOrbit3 { from { transform: rotate(240deg) translateX(40px); } to { transform: rotate(600deg)  translateX(40px); } }

        .lp-center-logo {
          font-size: 3rem; line-height: 1; user-select: none; display: block;
          animation: lpBounce 2s ease-in-out infinite;
        }
        @keyframes lpBounce {
          0%,100% { transform: scale(1);    }
          50%      { transform: scale(1.12); }
        }

        /* Floating particles */
        .lp-particle {
          position: absolute; font-size: 1.1rem;
          pointer-events: none; user-select: none;
        }
        .lp-particle-1 { left:  8%; top: 30%; animation: lpFloat1 2.4s ease-in-out infinite; }
        .lp-particle-2 { left: 24%; top: 28%; animation: lpFloat2 2.8s ease-in-out infinite 0.4s; }
        .lp-particle-3 { left: 44%; top: 32%; animation: lpFloat1 3.0s ease-in-out infinite 0.8s; }
        .lp-particle-4 { left: 64%; top: 28%; animation: lpFloat2 2.5s ease-in-out infinite 1.2s; }
        .lp-particle-5 { left: 80%; top: 30%; animation: lpFloat3 2.7s ease-in-out infinite 0.5s; }
        @keyframes lpFloat1 { 0%,100%{transform:translateY(0);}  50%{transform:translateY(-10px);} }
        @keyframes lpFloat2 { 0%,100%{transform:translateY(0);}  50%{transform:translateY(-14px);} }
        @keyframes lpFloat3 { 0%,100%{transform:translateY(0);}  50%{transform:translateY(-8px);} }

        /* Titles */
        .lp-title-wrap { text-align: center; direction: rtl; }
        .lp-brand-name {
          font-size: 1.5rem; font-weight: 800; color: #fff;
          background: linear-gradient(135deg, #a78bfa, #f472b6);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          margin-bottom: 0.4rem;
        }
        .lp-brand-name span { color: #f472b6; -webkit-text-fill-color: #f472b6; }
        .lp-tagline {
          font-size: 0.88rem; color: rgba(255,255,255,0.7);
          animation: lpTagFade 3s ease-in-out forwards;
          transition: color 0.5s ease;
        }
        @keyframes lpTagFade {
          0%  { opacity: 0; transform: translateY(6px); }
          12% { opacity: 1; transform: translateY(0); }
          82% { opacity: 1; transform: translateY(0); }
          100%{ opacity: 0; transform: translateY(-6px); }
        }

        .lp-divider {
          width: 100%; height: 1px;
          background: linear-gradient(to right, transparent, rgba(124,58,237,0.5), rgba(219,39,119,0.3), transparent);
        }

        .lp-banner-ok {
          background: rgba(16,185,129,0.15); border: 1px solid rgba(16,185,129,0.3);
          color: #34d399; border-radius: 10px; padding: 0.5rem 1rem;
          font-size: 0.82rem; font-weight: 600; width: 100%; text-align: center;
        }
        .lp-banner-warn {
          background: rgba(245,158,11,0.12); border: 1px solid rgba(245,158,11,0.28);
          color: #fde68a; border-radius: 10px; padding: 0.55rem 0.9rem;
          font-size: 0.78rem; font-weight: 600; width: 100%; text-align: center;
          line-height: 1.45;
        }
        .lp-error {
          background: rgba(239,68,68,0.12); border: 1px solid rgba(239,68,68,0.3);
          color: #fca5a5; border-radius: 10px; padding: 0.5rem 1rem;
          font-size: 0.82rem; width: 100%; text-align: center;
        }

        /* Google button */
        .lp-google-btn {
          width: 100%; display: flex; align-items: center; justify-content: center;
          gap: 0.65rem; padding: 0.85rem 1.5rem;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 14px; color: #fff; font-size: 0.95rem; font-weight: 600;
          cursor: pointer;
          transition: background 0.4s ease, border-color 0.4s ease, color 0.4s ease, transform 0.15s;
        }
        .lp-google-btn:hover:not(:disabled) {
          background: rgba(255,255,255,0.12);
          border-color: rgba(124,58,237,0.6);
          transform: translateY(-1px);
        }
        .lp-google-btn:disabled { opacity: 0.7; cursor: not-allowed; }
        .lp-google-btn--loading { justify-content: center; gap: 0.75rem; }

        /* Bouncing dots */
        .lp-btn-dots { display: flex; gap: 4px; align-items: center; }
        .lp-btn-dots span {
          width: 8px; height: 8px; border-radius: 50%;
          background: #a78bfa; display: inline-block;
        }
        .lp-btn-dots span:nth-child(1) { animation: lpDot 1.2s ease-in-out infinite 0s; }
        .lp-btn-dots span:nth-child(2) { animation: lpDot 1.2s ease-in-out infinite 0.2s; }
        .lp-btn-dots span:nth-child(3) { animation: lpDot 1.2s ease-in-out infinite 0.4s; }
        @keyframes lpDot {
          0%,80%,100% { transform: scale(0.6); opacity: 0.4; }
          40%          { transform: scale(1.3); opacity: 1;   }
        }

        .lp-footer {
          font-size: 0.72rem; color: rgba(255,255,255,0.3); text-align: center;
          display: flex; flex-direction: column; align-items: center; gap: 0.5rem;
          transition: color 0.5s ease;
        }
        .lp-theme-btns { display: flex; gap: 0.4rem; }
        .lp-theme-btn {
          background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1);
          border-radius: 8px; padding: 0.2rem 0.55rem;
          font-size: 0.85rem; cursor: pointer; opacity: 0.45;
          transition: opacity 0.3s ease, border-color 0.3s ease, background 0.4s ease;
        }
        .lp-theme-btn.active { opacity: 1; border-color: rgba(167,139,250,0.7); }
        .lp-theme-btn:hover { opacity: 0.8; }

        /* Light mode */
        .lp-bg--light { background: #f0eeff; }
        .lp-bg--light .lp-blob-1 { background: rgba(124,58,237,0.12); }
        .lp-bg--light .lp-blob-2 { background: rgba(219,39,119,0.10); }
        .lp-bg--light .lp-card {
          background: linear-gradient(145deg, rgba(255,255,255,0.96), rgba(246,242,255,0.98));
        }
        .lp-bg--light .lp-brand-name { background: linear-gradient(135deg,#7c3aed,#db2777); -webkit-background-clip:text; -webkit-text-fill-color:transparent; }
        .lp-bg--light .lp-tagline { color: rgba(50,20,80,0.6); }
        .lp-bg--light .lp-divider { background: linear-gradient(to right,transparent,rgba(124,58,237,0.25),rgba(219,39,119,0.15),transparent); }
        .lp-bg--light .lp-google-btn { background: rgba(0,0,0,0.04); border-color: rgba(0,0,0,0.1); color: #1e1440; }
        .lp-bg--light .lp-google-btn:hover:not(:disabled) { background: rgba(0,0,0,0.08); border-color: rgba(124,58,237,0.4); }
        .lp-bg--light .lp-footer { color: rgba(50,20,80,0.4); }
        .lp-bg--light .lp-theme-btn { background: rgba(0,0,0,0.04); border-color: rgba(0,0,0,0.1); }
        .lp-bg--light .lp-theme-btn.active { border-color: rgba(124,58,237,0.5); }
        .lp-bg--light .lp-banner-ok { background: rgba(16,185,129,0.1); }
        .lp-bg--light .lp-banner-warn { background: rgba(245,158,11,0.08); color: #92400e; }
        .lp-bg--light .lp-error { background: rgba(239,68,68,0.08); }
      `}</style>
    </div>
  )
}


