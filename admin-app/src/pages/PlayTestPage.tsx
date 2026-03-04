import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import Play from '../../modular-game-platform/src/gameplay/play'
import { THEME_PRESETS } from '../lib/adminRepo'
import { getQuizById } from '../lib/quizRepo'

export default function PlayTestPage() {
  const { gameId } = useParams();
  const [searchParams] = useSearchParams();
  const quizId = searchParams.get('quiz');

  const [selectedPresetKey, setSelectedPresetKey] = useState<string>('default-dark');

  useEffect(() => {
    if (!quizId) return
    getQuizById(quizId)
      .then((data) => {
        if (data?.themeId) {
          // Map "default" to "default-dark" if needed, though UI handles it
          const key = data.themeId === 'default' ? 'default-dark' : data.themeId
          setSelectedPresetKey(key)
        }
      })
      .catch((err) => console.error('Failed to load quiz theme:', err))
  }, [quizId])

  const activeTheme = THEME_PRESETS.find(p => p.key === selectedPresetKey)?.tokens;

  // Transform to the shape Play needs (removing 'textDim' if not present, though Play expects it now)
  // THEME_PRESETS has textDim.

  return (
    <div style={{ height: '100vh', width: '100vw', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ padding: '0.5rem', background: '#333', color: 'white', display: 'flex', gap: '1rem', alignItems: 'center', zIndex: 1000, position: 'relative' }}>
         <strong>Theme Tester</strong>
         <select 
            value={selectedPresetKey} 
            onChange={e => setSelectedPresetKey(e.target.value)}
            style={{ padding: '4px', borderRadius: '4px' }}
         >
           {THEME_PRESETS.map(p => (
             <option key={p.key} value={p.key}>{p.label}</option>
           ))}
         </select>
      </div>
      <div style={{ flex: 1, position: 'relative' }}>
          <Play key={gameId + selectedPresetKey} gameId={gameId || 'clue-chain'} theme={activeTheme as any} />
      </div>
    </div>
  );
}
