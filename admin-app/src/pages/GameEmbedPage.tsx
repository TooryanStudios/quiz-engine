import { useParams } from 'react-router-dom'
import Play from '../../modular-game-platform/src/gameplay/play'

export default function GameEmbedPage() {
  const { gameId } = useParams();

  return (
    <div style={{ height: '100vh', width: '100vw', position: 'fixed', inset: 0, margin: 0, padding: 0, overflow: 'hidden' }}>
      <Play gameId={gameId || 'fish-fence-count'} isEmbed={true} />
    </div>
  );
}
