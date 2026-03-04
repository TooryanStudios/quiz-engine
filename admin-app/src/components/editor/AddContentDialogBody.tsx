import { useState } from 'react'
import type { MiniGameDefinition } from '../../config/miniGames'
import type { QuestionType } from '../../types/quiz'

type AddContentDialogBodyProps = {
  initialTab: 'questions' | 'minigames'
  questionTypeOptions: Array<{ label: string; value: string }>
  miniGames: MiniGameDefinition[]
  onSelectQuestion: (type: QuestionType) => void
  onSelectMiniGame: (id: string) => void
}

export function AddContentDialogBody({
  initialTab,
  questionTypeOptions,
  miniGames,
  onSelectQuestion,
  onSelectMiniGame,
}: AddContentDialogBodyProps) {
  const [activeTab, setActiveTab] = useState<'questions' | 'minigames'>(initialTab)

  return (
    <div style={{ marginTop: '1rem' }}>
      <div style={{
        display: 'flex',
        background: 'var(--bg-deep)',
        borderRadius: '12px',
        padding: '4px',
        marginBottom: '1.2rem',
        border: '1px solid var(--border-strong)',
      }}>
        <button
          onClick={() => setActiveTab('questions')}
          style={{
            flex: 1,
            padding: '0.6rem',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'questions' ? 'var(--accent)' : 'transparent',
            color: activeTab === 'questions' ? '#fff' : 'var(--text-mid)',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          ❓ أسئلة
        </button>
        <button
          onClick={() => setActiveTab('minigames')}
          style={{
            flex: 1,
            padding: '0.6rem',
            borderRadius: '8px',
            border: 'none',
            background: activeTab === 'minigames' ? 'var(--accent)' : 'transparent',
            color: activeTab === 'minigames' ? '#fff' : 'var(--text-mid)',
            fontWeight: 700,
            fontSize: '0.9rem',
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          🎮 ميني جيم
        </button>
      </div>

      {activeTab === 'questions' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '0.6rem',
          maxHeight: '50vh',
          overflowY: 'auto',
          padding: '0.2rem',
        }}>
          {questionTypeOptions.map((opt, index) => (
            <button
              key={index}
              onClick={() => onSelectQuestion(opt.value as QuestionType)}
              style={{
                padding: '1rem',
                background: 'var(--bg-deep)',
                color: 'var(--text)',
                border: '1px solid var(--border-strong)',
                borderRadius: '12px',
                textAlign: 'right',
                fontWeight: 600,
                fontSize: '0.95rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
              }}
            >
              <span>{opt.label}</span>
              <span style={{ fontSize: '1.2rem' }}>➕</span>
            </button>
          ))}
        </div>
      )}

      {activeTab === 'minigames' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: '0.6rem',
          maxHeight: '50vh',
          overflowY: 'auto',
          padding: '0.2rem',
        }}>
          {miniGames.map((miniGame) => (
            <button
              key={miniGame.id}
              onClick={() => onSelectMiniGame(miniGame.id)}
              style={{
                padding: '1rem',
                background: 'var(--bg-deep)',
                color: 'var(--text)',
                border: '1px solid var(--border-strong)',
                borderRadius: '12px',
                textAlign: 'right',
                fontWeight: 600,
                fontSize: '0.95rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                <span style={{ fontSize: '1.4rem' }}>{miniGame.icon}</span>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 700 }}>{miniGame.defaultArabicName}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>{miniGame.description}</div>
                </div>
              </div>
              <span style={{ fontSize: '1.2rem' }}>➕</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}