import type { DragEvent } from 'react'
import type { QuizQuestion } from '../../types/quiz'

type MiniGameMeta = {
  id: string
  icon?: string
  englishName?: string
  arabicName?: string
  description?: string
}

type MiniGameBlockCardProps = {
  index: number
  question: QuizQuestion
  collapsed: boolean
  dragActive: boolean
  miniGameCards: MiniGameMeta[]
  uploadingMiniGameImage: boolean
  onDragStart: () => void
  onDragOver: (event: DragEvent<HTMLElement>) => void
  onDrop: () => void
  onDragEnd: () => void
  onToggleCollapse: () => void
  onRemove: () => void
  onUpdateQuestion: (patch: Partial<QuizQuestion>) => void
  onUpdateBlockConfig: (patch: Record<string, unknown>) => void
  onOpenPuzzleCropPicker: () => void
}

export function MiniGameBlockCard({
  index,
  question,
  collapsed,
  dragActive,
  miniGameCards,
  uploadingMiniGameImage,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onToggleCollapse,
  onRemove,
  onUpdateQuestion,
  onUpdateBlockConfig,
  onOpenPuzzleCropPicker,
}: MiniGameBlockCardProps) {
  const blockMeta = miniGameCards.find((g) => g.id === question.miniGameBlockId)
  const blockCfg = (question.miniGameBlockConfig || {}) as Record<string, unknown>

  return (
    <section
      className="panel"
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      style={{
        backgroundColor: 'var(--bg-deep)',
        border: '1px solid #4b5563',
        borderLeft: '6px solid #7c3aed',
        padding: '1.2rem',
        borderRadius: '14px',
        marginBottom: '0.75rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        opacity: dragActive ? 0.5 : 1,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-strong)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem' }}>
          <span style={{ fontSize: '1rem', color: 'var(--text-muted)', cursor: 'grab', background: 'var(--bg-surface)', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }} draggable={false}>⠿</span>
          <span style={{ fontSize: '1.4rem' }}>{blockMeta?.icon || '🎮'}</span>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-bright)' }}>{blockMeta?.arabicName || blockMeta?.englishName || question.miniGameBlockId}</div>
            <div style={{ fontSize: '0.75rem', color: '#a78bfa', fontWeight: 600 }}>🎮 Mini-Game Block #{index + 1}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button type="button" onClick={onToggleCollapse} style={{ background: 'var(--bg-deep)', border: '1px solid var(--border-strong)', color: 'var(--text-mid)', fontSize: '0.85rem', width: '28px', height: '28px', borderRadius: '6px', cursor: 'pointer' }}>
            {collapsed ? '▾' : '▴'}
          </button>
          <button type="button" onClick={onRemove} style={{ background: 'rgba(239,68,68,0.1)', color: '#ef4444', fontSize: '0.8rem', width: '28px', height: '28px', borderRadius: '6px', border: '1px solid rgba(239,68,68,0.2)', cursor: 'pointer' }}>✕</button>
        </div>
      </div>

      {!collapsed && (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem', alignItems: 'end' }}>
            <div>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-mid)', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>⏱ Game Duration (sec)</label>
              <input type="number" min={10} step={5} value={Number(question.duration || 60)} onChange={(e) => onUpdateQuestion({ duration: Number(e.target.value) })} style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-strong)', background: 'var(--bg-deep)', color: 'var(--text)' }} />
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>{blockMeta?.description || 'Configure this mini-game block'}</div>
          </div>

          {question.miniGameBlockId === 'match-plus-arena' && (
            <div style={{ display: 'grid', gap: '0.65rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-mid)', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>Match Mode</label>
                <select value={String(blockCfg.matchMode || 'image-puzzle')} onChange={(e) => onUpdateBlockConfig({ matchMode: e.target.value })} style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-strong)', background: 'var(--bg-surface)', color: 'var(--text)' }}>
                  <option value="emoji-emoji">Emoji → Emoji</option>
                  <option value="emoji-text">Emoji → Text</option>
                  <option value="image-text">Image → Text</option>
                  <option value="image-image">Image → Image</option>
                  <option value="image-puzzle">Image Puzzle</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-mid)', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>Puzzle Grid</label>
                <select value={String(blockCfg.gridSize || 3)} onChange={(e) => onUpdateBlockConfig({ gridSize: Number(e.target.value) })} style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-strong)', background: 'var(--bg-surface)', color: 'var(--text)' }}>
                  <option value="2">2 × 2</option>
                  <option value="3">3 × 3</option>
                  <option value="4">4 × 4</option>
                </select>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-mid)', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>Puzzle Image URL</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <input value={String(blockCfg.puzzleImage || '')} onChange={(e) => onUpdateBlockConfig({ puzzleImage: e.target.value })} placeholder="https://..." style={{ flex: 1, minWidth: '240px', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-strong)', background: 'var(--bg-surface)', color: 'var(--text)' }} />
                  <button
                    type="button"
                    onClick={onOpenPuzzleCropPicker}
                    disabled={uploadingMiniGameImage}
                    style={{
                      border: '1px solid var(--border-strong)',
                      borderRadius: '8px',
                      background: 'var(--bg-surface)',
                      color: 'var(--text)',
                      padding: '0.48rem 0.75rem',
                      cursor: uploadingMiniGameImage ? 'not-allowed' : 'pointer',
                      opacity: uploadingMiniGameImage ? 0.65 : 1,
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {uploadingMiniGameImage ? '⏳ Uploading...' : '🖼️ Upload & Crop'}
                  </button>
                </div>
                {String(blockCfg.puzzleImage || '').trim() && (
                  <div style={{ marginTop: '0.5rem', width: '90px', aspectRatio: '1/1', borderRadius: '8px', overflow: 'hidden', border: '1px solid var(--border-strong)' }}>
                    <img src={String(blockCfg.puzzleImage)} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                )}
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-mid)', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>Instruction</label>
                <input value={String(blockCfg.instruction || '')} onChange={(e) => onUpdateBlockConfig({ instruction: e.target.value })} placeholder="Arrange the pieces to complete the image" style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-strong)', background: 'var(--bg-surface)', color: 'var(--text)' }} />
              </div>
            </div>
          )}

          {question.miniGameBlockId === 'xo-duel' && (
            <div style={{ display: 'grid', gap: '0.65rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-mid)', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>Board Size</label>
                <input type="number" min={3} max={8} value={Number(blockCfg.boardSize || 3)} onChange={(e) => onUpdateBlockConfig({ boardSize: Number(e.target.value) })} style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-strong)', background: 'var(--bg-surface)', color: 'var(--text)' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-mid)', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>Win Length</label>
                <input type="number" min={3} max={5} value={Number(blockCfg.winLength || 3)} onChange={(e) => onUpdateBlockConfig({ winLength: Number(e.target.value) })} style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-strong)', background: 'var(--bg-surface)', color: 'var(--text)' }} />
              </div>
            </div>
          )}

          {question.miniGameBlockId === 'gear-machine' && (
            <div style={{ display: 'grid', gap: '0.65rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-mid)', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>Gears Count</label>
                <input type="number" min={3} max={12} value={Number(blockCfg.gearsCount || 5)} onChange={(e) => onUpdateBlockConfig({ gearsCount: Number(e.target.value) })} style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-strong)', background: 'var(--bg-surface)', color: 'var(--text)' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-mid)', fontWeight: 700, display: 'block', marginBottom: '0.35rem' }}>Max Turns</label>
                <input type="number" min={3} max={40} value={Number(blockCfg.maxTurns || 12)} onChange={(e) => onUpdateBlockConfig({ maxTurns: Number(e.target.value) })} style={{ width: '100%', padding: '0.55rem', borderRadius: '8px', border: '1px solid var(--border-strong)', background: 'var(--bg-surface)', color: 'var(--text)' }} />
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
