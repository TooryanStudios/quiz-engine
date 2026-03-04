import { useEffect, useState } from 'react'

const AI_MESSAGES = [
  'أفكّر في أسئلة رائعة لك… 🧠',
  'أبحث في قاعدة معرفتي… 📚',
  'أصنع تحدياً لا يُقاوَم… 🎯',
  'أختار أصعب الأسئلة… 😈',
  'أتأكد من الإجابات الصحيحة… ✅',
  'أرتّب الأسئلة بعناية… 🎲',
  'شارف على الانتهاء… ✨',
]

export function AiGeneratingOverlay({ mode }: { mode: 'generate' | 'recheck' }) {
  const [msgIdx, setMsgIdx] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setMsgIdx(i => (i + 1) % AI_MESSAGES.length), 2800)
    return () => clearInterval(id)
  }, [])

  const isRecheck = mode === 'recheck'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 99000,
      background: 'rgba(2,6,23,0.82)',
      backdropFilter: 'blur(14px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      animation: 'fadeIn 0.3s ease-out',
    }}>
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        gap: '1.6rem', padding: '2.5rem 2rem',
        background: 'linear-gradient(145deg, rgba(124,58,237,0.18), rgba(219,39,119,0.12))',
        border: '1px solid rgba(124,58,237,0.35)',
        borderRadius: '28px',
        boxShadow: '0 0 60px rgba(124,58,237,0.25), 0 20px 50px rgba(0,0,0,0.5)',
        minWidth: '260px', maxWidth: '88vw',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '3px',
          background: 'linear-gradient(90deg, transparent, #7c3aed, #db2777, #a78bfa, transparent)',
          backgroundSize: '200% auto',
          animation: 'aiShimmer 1.8s linear infinite',
        }} />

        <div style={{ position: 'relative', width: '110px', height: '110px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: '2px solid rgba(124,58,237,0.5)',
            animation: 'aiPulseRing 1.8s ease-out infinite',
          }} />
          <div style={{
            position: 'absolute', inset: 0, borderRadius: '50%',
            border: '2px solid rgba(219,39,119,0.4)',
            animation: 'aiPulseRing 1.8s ease-out infinite 0.6s',
          }} />

          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'spin 3s linear infinite' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#7c3aed', boxShadow: '0 0 10px #7c3aed', animation: 'aiOrbit 3s linear infinite' }} />
          </div>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'spin 3s linear infinite' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#db2777', boxShadow: '0 0 8px #db2777', animation: 'aiOrbit2 3s linear infinite' }} />
          </div>
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'spin 3s linear infinite' }}>
            <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#a78bfa', boxShadow: '0 0 7px #a78bfa', animation: 'aiOrbit3 3s linear infinite' }} />
          </div>

          <span style={{ fontSize: '3rem', animation: 'aiBrain 2s ease-in-out infinite', display: 'block', lineHeight: 1, userSelect: 'none' }}>
            {isRecheck ? '🔍' : '🧠'}
          </span>
        </div>

        {['✨', '⭐', '💡', '🎯', '🌟'].map((emoji, i) => (
          <span key={i} style={{
            position: 'absolute',
            left: `${12 + i * 17}%`,
            bottom: '18%',
            fontSize: '1.1rem',
            animation: `aiFloat${(i % 3) + 1} ${2.2 + i * 0.4}s ease-in-out infinite ${i * 0.5}s`,
            pointerEvents: 'none', userSelect: 'none',
          }}>{emoji}</span>
        ))}

        <div style={{ textAlign: 'center', direction: 'rtl' }}>
          <div style={{
            fontSize: '1.15rem', fontWeight: 800, color: '#fff',
            background: 'linear-gradient(135deg, #a78bfa, #f472b6)',
            WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            marginBottom: '0.35rem',
          }}>
            {isRecheck ? 'جاري التدقيق الذكي…' : 'جاري توليد الأسئلة…'}
          </div>

          <div key={msgIdx} style={{
            fontSize: '0.88rem', color: '#fff',
            animation: 'aiMsgFade 2.8s ease-in-out forwards',
            minHeight: '1.4em',
          }}>
            {isRecheck ? '🔎 أراجع كل سؤال بدقة…' : AI_MESSAGES[msgIdx]}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {[0, 1, 2].map(i => (
            <span key={i} style={{
              width: '10px', height: '10px', borderRadius: '50%',
              background: i === 1 ? '#db2777' : '#7c3aed',
              display: 'inline-block',
              animation: `aiDot 1.2s ease-in-out infinite ${i * 0.2}s`,
            }} />
          ))}
        </div>

        <div style={{ width: '100%', height: '4px', background: 'rgba(255,255,255,0.08)', borderRadius: '2px', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            background: 'linear-gradient(90deg, #7c3aed, #db2777, #a78bfa)',
            backgroundSize: '200% auto',
            animation: 'aiShimmer 1.5s linear infinite',
            borderRadius: '2px',
            width: '60%',
          }} />
        </div>
      </div>
    </div>
  )
}
