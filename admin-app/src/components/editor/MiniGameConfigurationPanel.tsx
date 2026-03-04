type MiniGameCard = {
  id: string
  icon: string
  englishName: string
  description: string
}

type MiniGameConfigurationPanelProps = {
  gameModeId: string
  miniGameCards: MiniGameCard[]
  miniGameConfig: Record<string, unknown>
  uploadingMiniGameImage: boolean
  onOpenMetadata: () => void
  onUpdateMiniGameConfig: (patch: Record<string, unknown>) => void
  onPickMiniGamePuzzleImage: () => void
}

export function MiniGameConfigurationPanel({
  gameModeId,
  miniGameCards,
  miniGameConfig,
  uploadingMiniGameImage,
  onOpenMetadata,
  onUpdateMiniGameConfig,
  onPickMiniGamePuzzleImage,
}: MiniGameConfigurationPanelProps) {
  const selectedMiniGame = miniGameCards.find((game) => game.id === gameModeId)

  return (
    <section
      className="panel"
      style={{
        backgroundColor: 'var(--bg-deep)',
        border: '1px solid #4b5563',
        borderLeft: '6px solid #7c3aed',
        padding: '1.2rem',
        borderRadius: '14px',
        marginBottom: '0.75rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-strong)' }}>
        <h3 style={{ margin: 0, color: 'var(--text-bright)', fontSize: '1rem' }}>🎮 Mini Game Configuration</h3>
        <button
          type="button"
          onClick={onOpenMetadata}
          style={{
            border: '1px solid var(--border-strong)',
            borderRadius: '8px',
            background: 'var(--bg-surface)',
            color: 'var(--text)',
            padding: '0.35rem 0.6rem',
            cursor: 'pointer',
            fontWeight: 700,
          }}
        >
          ⚙️ Change Mini Game
        </button>
      </div>

      {!gameModeId ? (
        <div style={{ padding: '0.8rem', borderRadius: '10px', border: '1px solid var(--border-strong)', background: 'var(--bg-surface)' }}>
          <p style={{ margin: 0, color: 'var(--text)', fontWeight: 700 }}>No mini game selected yet.</p>
          <p style={{ margin: '0.3rem 0 0', color: 'var(--text-mid)', fontSize: '0.85rem' }}>Open settings and pick a mini game to enable dedicated configuration.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <div style={{ padding: '0.7rem 0.8rem', borderRadius: '10px', border: '1px solid var(--border-strong)', background: 'var(--bg-surface)' }}>
            <p style={{ margin: 0, color: 'var(--text)', fontWeight: 700 }}>
              {(selectedMiniGame?.icon || '🎮')} {(selectedMiniGame?.englishName || gameModeId)}
            </p>
            <p style={{ margin: '0.25rem 0 0', color: 'var(--text-mid)', fontSize: '0.82rem' }}>
              {selectedMiniGame?.description || 'Dedicated settings for this mini game.'}
            </p>
          </div>

          {(() => {
            const POLICY_LABELS: Record<string, { type: string; label: string }> = {
              'match-plus-arena': { type: 'admin', label: 'Total game duration — how long the player has to complete the puzzle' },
              'puzzle-relay': { type: 'per-round', label: 'Per-round duration' },
              'xo-duel': { type: 'self', label: 'Game session time (game manages its own rounds)' },
              'gear-machine': { type: 'self', label: 'Game session time' },
              'creator-studio': { type: 'self', label: 'Creation phase duration' },
            }
            const policy = POLICY_LABELS[gameModeId] || { type: 'per-round', label: 'Duration per round (seconds)' }
            const selfManaged = policy.type === 'self'
            return (
              <div style={{ padding: '0.75rem 0.85rem', borderRadius: '10px', border: '1px solid var(--border-strong)', background: 'var(--bg-surface)', marginBottom: '0.5rem' }}>
                <div style={{ display: 'grid', gap: '0.65rem', gridTemplateColumns: '1fr 1fr', alignItems: 'end' }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-mid)', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>
                      ⏱ Game Duration (sec)
                    </label>
                    <input
                      type="number"
                      min={1}
                      step={5}
                      value={Number(miniGameConfig.gameDurationSec) || ''}
                      onChange={(e) => onUpdateMiniGameConfig({ gameDurationSec: Number(e.target.value), defaultDuration: Number(e.target.value) })}
                      placeholder="Enter duration in seconds"
                      style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-strong)', background: 'var(--bg-deep)', color: 'var(--text)' }}
                    />
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4, paddingBottom: '0.3rem' }}>
                    <strong>{policy.label}</strong><br />
                    {selfManaged
                      ? 'This game manages its own timer internally.'
                      : 'The exact value you enter here will be used as the game timer. No limits.'}
                  </div>
                </div>
              </div>
            )
          })()}

          {gameModeId === 'match-plus-arena' && (
            <div style={{ display: 'grid', gap: '0.65rem', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-mid)', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>Default Mode</label>
                <select
                  value={String(miniGameConfig.defaultMatchPlusMode || 'image-image')}
                  onChange={(e) => onUpdateMiniGameConfig({ defaultMatchPlusMode: e.target.value })}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-strong)', background: 'var(--bg-surface)', color: 'var(--text)' }}
                >
                  <option value="emoji-emoji">emoji-emoji</option>
                  <option value="emoji-text">emoji-text</option>
                  <option value="image-text">image-text</option>
                  <option value="image-image">image-image</option>
                  <option value="image-puzzle">image-puzzle</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-mid)', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>Default Puzzle Grid</label>
                <select
                  value={String(miniGameConfig.defaultPuzzleGridSize || 3)}
                  onChange={(e) => onUpdateMiniGameConfig({ defaultPuzzleGridSize: Number(e.target.value) })}
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-strong)', background: 'var(--bg-surface)', color: 'var(--text)' }}
                >
                  <option value="2">2 × 2</option>
                  <option value="3">3 × 3</option>
                  <option value="4">4 × 4</option>
                </select>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-mid)', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>Game Instruction</label>
                <input
                  value={String(miniGameConfig.gameInstruction || '')}
                  onChange={(e) => onUpdateMiniGameConfig({ gameInstruction: e.target.value })}
                  placeholder="Arrange the pieces to complete the image"
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-strong)', background: 'var(--bg-surface)', color: 'var(--text)' }}
                />
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-mid)', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>Default Puzzle Image URL</label>
                <input
                  value={String(miniGameConfig.defaultPuzzleImage || '')}
                  onChange={(e) => onUpdateMiniGameConfig({ defaultPuzzleImage: e.target.value })}
                  placeholder="https://..."
                  style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-strong)', background: 'var(--bg-surface)', color: 'var(--text)' }}
                />
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.55rem', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    onClick={onPickMiniGamePuzzleImage}
                    disabled={uploadingMiniGameImage}
                    style={{
                      border: '1px solid var(--border-strong)',
                      borderRadius: '8px',
                      background: 'var(--bg-surface)',
                      color: 'var(--text)',
                      padding: '0.42rem 0.7rem',
                      cursor: uploadingMiniGameImage ? 'not-allowed' : 'pointer',
                      opacity: uploadingMiniGameImage ? 0.65 : 1,
                      fontWeight: 700,
                      fontSize: '0.78rem',
                    }}
                  >
                    {uploadingMiniGameImage ? '⏳ Uploading...' : '🖼️ Upload & Crop'}
                  </button>
                  <span style={{ color: 'var(--text-mid)', fontSize: '0.76rem' }}>
                    مربع فقط 1:1 — بقية النِسَب غير مسموحة لهذا الجيم.
                  </span>
                </div>
                {String(miniGameConfig.defaultPuzzleImage || '').trim() && (
                  <div style={{ marginTop: '0.55rem', width: '120px', aspectRatio: '1 / 1', borderRadius: '10px', overflow: 'hidden', border: '1px solid var(--border-strong)', background: 'var(--bg-deep)' }}>
                    <img
                      src={String(miniGameConfig.defaultPuzzleImage || '')}
                      alt="Puzzle preview"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {gameModeId === 'xo-duel' && (
            <div style={{ display: 'grid', gap: '0.65rem', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-mid)', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>Board Size</label>
                <input type="number" min={3} max={8} value={Number(miniGameConfig.boardSize || 3)} onChange={(e) => onUpdateMiniGameConfig({ boardSize: Number(e.target.value) })} style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-strong)', background: 'var(--bg-surface)', color: 'var(--text)' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-mid)', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>Win Length</label>
                <input type="number" min={3} max={5} value={Number(miniGameConfig.winLength || 3)} onChange={(e) => onUpdateMiniGameConfig({ winLength: Number(e.target.value) })} style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-strong)', background: 'var(--bg-surface)', color: 'var(--text)' }} />
              </div>
            </div>
          )}

          {gameModeId === 'gear-machine' && (
            <div style={{ display: 'grid', gap: '0.65rem', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-mid)', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>Gears Count</label>
                <input type="number" min={3} max={12} value={Number(miniGameConfig.gearsCount || 5)} onChange={(e) => onUpdateMiniGameConfig({ gearsCount: Number(e.target.value) })} style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-strong)', background: 'var(--bg-surface)', color: 'var(--text)' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-mid)', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>Max Turns</label>
                <input type="number" min={3} max={40} value={Number(miniGameConfig.maxTurns || 12)} onChange={(e) => onUpdateMiniGameConfig({ maxTurns: Number(e.target.value) })} style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-strong)', background: 'var(--bg-surface)', color: 'var(--text)' }} />
              </div>
            </div>
          )}

          {gameModeId !== 'match-plus-arena' && gameModeId !== 'xo-duel' && gameModeId !== 'gear-machine' && (
            <div style={{ padding: '0.7rem 0.8rem', borderRadius: '10px', border: '1px solid var(--border-strong)', background: 'var(--bg-surface)' }}>
              <p style={{ margin: 0, color: 'var(--text)', fontWeight: 700 }}>Dedicated UI ready</p>
              <p style={{ margin: '0.25rem 0 0', color: 'var(--text-mid)', fontSize: '0.82rem' }}>
                This mini game has its own config surface. Add specific controls here as product rules evolve.
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
