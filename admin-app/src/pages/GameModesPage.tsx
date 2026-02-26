import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  listGames,
  loadGame,
  setGameEnabled,
  unloadGame,
} from '../../modular-game-platform/src/core/game-loader'
import { createQuiz } from '../lib/quizRepo'
import { auth } from '../lib/firebase'
import { useToast } from '../lib/ToastContext'
import type {
  GameAction,
  GameModule,
  GameState,
  RegisteredGameSummary,
} from '../../modular-game-platform/src/core/types'
import type { QuizDoc, QuizQuestion } from '../types/quiz'

type LoadStatus = 'idle' | 'loading' | 'loaded' | 'error'

export function GameModesPage() {
  const navigate = useNavigate()
  const { showToast } = useToast()

  const [games, setGames] = useState<RegisteredGameSummary[]>([])
  const [activeId, setActiveId] = useState<string>('clue-chain')
  const [playerName, setPlayerName] = useState<string>('master-admin')
  const [loadedGame, setLoadedGame] = useState<GameModule | null>(null)
  const [sessionState, setSessionState] = useState<GameState | null>(null)
  const [timeLeftSec, setTimeLeftSec] = useState<number>(0)
  const [running, setRunning] = useState<boolean>(false)
  const [creatingTestQuiz, setCreatingTestQuiz] = useState<boolean>(false)
  const [status, setStatus] = useState<LoadStatus>('idle')
  const [error, setError] = useState<string>('')

  const TEST_QUESTIONS: QuizQuestion[] = [
    {
      type: 'single',
      text: 'Which strategy best helps your team solve multi-step puzzles?',
      options: ['Work silently', 'Assign roles and share clues', 'Guess quickly', 'Skip early rounds'],
      correctIndex: 1,
      duration: 25,
    },
    {
      type: 'multi',
      text: 'Select teamwork behaviors that increase success in collaborative game modes.',
      options: ['Split tasks', 'Confirm assumptions', 'Hide useful clues', 'Share progress updates'],
      correctIndices: [0, 1, 3],
      duration: 30,
    },
    {
      type: 'match',
      text: 'Match each game action with its purpose.',
      pairs: [
        { left: 'Hint', right: 'Reduce uncertainty' },
        { left: 'Collaborate', right: 'Boost team coordination' },
        { left: 'Submit', right: 'Lock your solution' },
        { left: 'Advance', right: 'Move to next objective' },
      ],
      duration: 35,
    },
    {
      type: 'order',
      text: 'Put this round flow in the correct order.',
      items: ['Analyze clue', 'Plan as team', 'Submit answer', 'Review outcome'],
      correctOrder: [0, 1, 2, 3],
      duration: 30,
    },
  ]

  const refresh = () => {
    const next = listGames()
    setGames(next)
    if (!next.some((g) => g.id === activeId) && next.length > 0) {
      setActiveId(next[0].id)
    }
  }

  useEffect(() => {
    refresh()
  }, [])

  useEffect(() => {
    return () => {
      if (loadedGame) unloadGame(loadedGame.id)
    }
  }, [loadedGame])

  useEffect(() => {
    if (!running || !loadedGame) return
    const timer = window.setInterval(() => {
      setTimeLeftSec((previous) => {
        if (previous <= 1) {
          window.clearInterval(timer)
          setRunning(false)
          return 0
        }
        return previous - 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [running, loadedGame])

  const activeSummary = useMemo(
    () => games.find((g) => g.id === activeId) ?? null,
    [games, activeId],
  )

  function setupSession(module: GameModule) {
    const initial = module.logic.createInitialState()
    setSessionState(initial)
    setTimeLeftSec(module.config.defaultTimeLimitSec)
    setRunning(false)
  }

  async function handleLoad(gameId: string) {
    setStatus('loading')
    setError('')
    try {
      const module = await loadGame(gameId)
      setLoadedGame(module)
      setupSession(module)
      setStatus('loaded')
      refresh()
    } catch (e) {
      setStatus('error')
      setLoadedGame(null)
      setSessionState(null)
      setRunning(false)
      setError(e instanceof Error ? e.message : 'Failed to load game module.')
    }
  }

  function handleToggle(gameId: string, enabled: boolean) {
    setGameEnabled(gameId, enabled)
    if (!enabled && loadedGame?.id === gameId) {
      unloadGame(gameId)
      setLoadedGame(null)
      setSessionState(null)
      setRunning(false)
      setTimeLeftSec(0)
      setStatus('idle')
    }
    refresh()
  }

  function applyAction(action: GameAction) {
    if (!loadedGame || !sessionState) return
    const next = loadedGame.logic.applyAction(sessionState, action)
    setSessionState(next)

    if (action.type === 'start') {
      setRunning(true)
    }

    if (action.type === 'reset') {
      setTimeLeftSec(loadedGame.config.defaultTimeLimitSec)
      setRunning(false)
    }

    if (next.completed) {
      setRunning(false)
    }
  }

  const progressPercent = sessionState
    ? Math.min(100, Math.round((sessionState.round / sessionState.totalRounds) * 100))
    : 0

  const canPlay = !!loadedGame && !!sessionState && timeLeftSec > 0

  const recentActivity = sessionState?.activityLog.slice(-8).reverse() ?? []

  async function createDedicatedTestQuiz() {
    if (!loadedGame) return

    const ownerId = auth.currentUser?.uid
    if (!ownerId) {
      showToast({ message: 'Please log in first.', type: 'error' })
      return
    }

    const slugPart = loadedGame.id.replace(/[^a-z0-9-]/gi, '-').toLowerCase()
    const slug = `u-${ownerId.slice(0, 6)}-gm-${slugPart}-${Date.now().toString(36)}`

    const payload: QuizDoc = {
      ownerId,
      title: `${loadedGame.name} Test Quiz`,
      slug,
      description: `Dedicated test quiz for ${loadedGame.name}`,
      visibility: 'public', // Must be public so play.qyan.app can read it via Firestore REST API
      challengePreset: 'classic',
      randomizeQuestions: false,
      enableScholarRole: false,
      gameModeId: loadedGame.id,
      tags: ['game-mode', loadedGame.id],
      questions: TEST_QUESTIONS,
    }

    setCreatingTestQuiz(true)
    try {
      const id = await createQuiz(payload)
      showToast({ message: `Created test quiz for ${loadedGame.name}`, type: 'success' })
      navigate(`/editor/${id}`)
    } catch (e) {
      showToast({
        message: e instanceof Error ? `Failed to create test quiz: ${e.message}` : 'Failed to create test quiz.',
        type: 'error',
      })
    } finally {
      setCreatingTestQuiz(false)
    }
  }

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gap: '1rem' }}>
      <div>
        <h2 style={{ marginBottom: '.35rem' }}>🎮 Game Modes</h2>
        <p style={{ margin: 0, color: 'var(--text-muted)' }}>
          12 modular modes are enabled as separate game units and lazy-loaded at play time only.
        </p>
      </div>

      <section style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '1rem' }}>
        <h3 style={{ marginTop: 0 }}>Registry</h3>
        <div style={{ display: 'grid', gap: '.6rem' }}>
          {games.map((game) => (
            <div
              key={game.id}
              style={{
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '.75rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '.75rem',
              }}
            >
              <div>
                <strong>{game.name}</strong>
                <div style={{ color: 'var(--text-muted)', fontSize: '.9rem' }}>{game.description}</div>
                <div style={{ color: 'var(--text-dim)', fontSize: '.8rem' }}>
                  id: {game.id} | loaded: {game.loaded ? 'yes' : 'no'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '.5rem', alignItems: 'center' }}>
                <label style={{ display: 'flex', gap: '.4rem', alignItems: 'center', fontSize: '.9rem' }}>
                  <input
                    type="checkbox"
                    checked={game.enabled}
                    onChange={(e) => handleToggle(game.id, e.target.checked)}
                  />
                  enabled
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setActiveId(game.id)
                    void handleLoad(game.id)
                  }}
                  style={{
                    padding: '.45rem .75rem',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    cursor: 'pointer',
                  }}
                >
                  Load
                </button>
                <button
                  type="button"
                  disabled={!game.enabled}
                  onClick={() => {
                    setActiveId(game.id)
                    void handleLoad(game.id)
                  }}
                  style={{
                    padding: '.45rem .75rem',
                    borderRadius: 8,
                    border: '1px solid var(--border)',
                    cursor: game.enabled ? 'pointer' : 'not-allowed',
                    opacity: game.enabled ? 1 : 0.6,
                  }}
                >
                  Play
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section style={{ border: '1px solid var(--border)', borderRadius: 12, padding: '1rem' }}>
        <h3 style={{ marginTop: 0 }}>Playable Session</h3>
        <p style={{ marginTop: 0, color: 'var(--text-muted)' }}>
          Status: {status}{activeSummary ? ` | selected: ${activeSummary.name}` : ''}
        </p>
        {error && <p style={{ color: '#ef4444' }}>{error}</p>}

        {!loadedGame && !error && (
          <p style={{ color: 'var(--text-muted)' }}>Select any mode and click Play to start a session.</p>
        )}

        {loadedGame && sessionState && (
          <div style={{ display: 'grid', gap: '.8rem' }}>
            <div style={{ display: 'grid', gap: '.35rem' }}>
              <div><strong>{loadedGame.name}</strong> (v{loadedGame.version})</div>
              <div>{loadedGame.description}</div>
              <div>Mode: {loadedGame.config.collaborationMode}</div>
              <div>Players: {loadedGame.config.minPlayers} - {loadedGame.config.maxPlayers}</div>
              <div>Controls: {loadedGame.controls.join(', ')}</div>
            </div>

            <div style={{ display: 'grid', gap: '.35rem' }}>
              <div style={{ color: 'var(--text-muted)', fontSize: '.9rem' }}>Session actor</div>
              <input
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value || 'master-admin')}
                placeholder="Actor name"
                style={{
                  maxWidth: 280,
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '.45rem .6rem',
                  background: 'var(--card)',
                  color: 'var(--text)',
                }}
              />
            </div>

            <div style={{
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '.75rem',
              display: 'grid',
              gap: '.45rem',
            }}>
              <div><strong>Objective</strong>: {loadedGame.logic.getObjective(sessionState)}</div>
              <div><strong>Round</strong>: {sessionState.round} / {sessionState.totalRounds}</div>
              <div><strong>Score</strong>: {sessionState.score}</div>
              <div><strong>Solved</strong>: {sessionState.solvedPuzzles}</div>
              <div><strong>Hints</strong>: {sessionState.hintsUsed} | <strong>Collaborations</strong>: {sessionState.collaborations}</div>
              <div><strong>Timer</strong>: {timeLeftSec}s {running ? '(running)' : '(stopped)'}</div>
              <div style={{
                height: 10,
                borderRadius: 999,
                background: 'var(--border)',
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${progressPercent}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #2563eb, #7c3aed)',
                }} />
              </div>
              {sessionState.completed && (
                <div style={{ color: '#16a34a', fontWeight: 600 }}>
                  Session complete. Use Reset to play again.
                </div>
              )}
              {!sessionState.completed && timeLeftSec === 0 && (
                <div style={{ color: '#ef4444', fontWeight: 600 }}>
                  Time is up. Reset to restart this mode.
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '.55rem' }}>
              <button type="button" onClick={() => applyAction({ type: 'start', actorId: playerName })}>Start</button>
              <button
                type="button"
                disabled={!canPlay}
                onClick={() => applyAction({ type: 'hint', actorId: playerName, note: 'requested hint' })}
              >
                Use Hint
              </button>
              <button
                type="button"
                disabled={!canPlay}
                onClick={() => applyAction({ type: 'collaborate', actorId: playerName, note: 'team collaboration' })}
              >
                Collaborate
              </button>
              <button
                type="button"
                disabled={!canPlay}
                onClick={() => applyAction({ type: 'submit', actorId: playerName, success: true, note: 'correct submission' })}
              >
                Submit Correct
              </button>
              <button
                type="button"
                disabled={!canPlay}
                onClick={() => applyAction({ type: 'submit', actorId: playerName, success: false, note: 'incorrect submission' })}
              >
                Submit Wrong
              </button>
              <button
                type="button"
                disabled={!canPlay || sessionState.completed}
                onClick={() => applyAction({ type: 'advance', actorId: playerName })}
              >
                Next Round
              </button>
              <button
                type="button"
                onClick={() => applyAction({ type: 'reset', actorId: playerName, note: 'manual reset' })}
              >
                Reset
              </button>
              <button
                type="button"
                disabled={creatingTestQuiz}
                onClick={() => { void createDedicatedTestQuiz() }}
              >
                {creatingTestQuiz ? 'Creating Test Quiz...' : 'Create Test Quiz in Editor'}
              </button>
            </div>

            <div style={{
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '.75rem',
            }}>
              <strong>Activity Log</strong>
              {recentActivity.length === 0 ? (
                <div style={{ marginTop: '.45rem', color: 'var(--text-muted)' }}>No actions yet.</div>
              ) : (
                <ul style={{ margin: '.55rem 0 0', paddingLeft: '1.1rem' }}>
                  {recentActivity.map((entry, index) => (
                    <li key={`${entry}-${index}`} style={{ marginBottom: '.25rem' }}>{entry}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </section>
    </div>
  )
}
