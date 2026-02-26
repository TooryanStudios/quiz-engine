import { useEffect, useMemo, useState } from 'react'
import {
  type MiniGameAccessTier,
  MINI_GAME_DEFINITIONS,
  MINI_GAME_DEFAULT_ACCESS_BY_ID,
  MINI_GAME_DEFAULT_ARABIC_NAMES,
  MINI_GAME_DEFAULT_ENGLISH_NAMES,
  MINI_GAME_IDS,
  type MiniGameId,
} from '../../config/miniGames'
import type { QuizDoc } from '../../types/quiz'

interface Props {
  enabledMiniGameIds: MiniGameId[]
  englishNamesById: Record<MiniGameId, string>
  arabicNamesById: Record<MiniGameId, string>
  accessById: Record<MiniGameId, MiniGameAccessTier>
  quizzes: Array<QuizDoc & { id: string }>
  updatedAt?: { toDate(): Date }
  onSave: (
    nextEnabled: MiniGameId[],
    nextEnglishNamesById: Record<MiniGameId, string>,
    nextArabicNamesById: Record<MiniGameId, string>,
    nextAccessById: Record<MiniGameId, MiniGameAccessTier>,
  ) => Promise<void>
}

function formatUpdatedAt(value?: { toDate(): Date }) {
  if (!value) return 'Never'
  return value.toDate().toLocaleString()
}

export function MiniGamesTab({ enabledMiniGameIds, englishNamesById, arabicNamesById, accessById, quizzes, updatedAt, onSave }: Props) {
  const [selected, setSelected] = useState<MiniGameId[]>(enabledMiniGameIds)
  const [englishNames, setEnglishNames] = useState<Record<MiniGameId, string>>(englishNamesById)
  const [arabicNames, setArabicNames] = useState<Record<MiniGameId, string>>(arabicNamesById)
  const [accessTiers, setAccessTiers] = useState<Record<MiniGameId, MiniGameAccessTier>>(accessById)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string>('')

  useEffect(() => { setSelected(enabledMiniGameIds) }, [enabledMiniGameIds])
  useEffect(() => { setEnglishNames(englishNamesById) }, [englishNamesById])
  useEffect(() => { setArabicNames(arabicNamesById) }, [arabicNamesById])
  useEffect(() => { setAccessTiers(accessById) }, [accessById])

  useEffect(() => {
    if (!message) return
    const timeoutId = window.setTimeout(() => setMessage(''), 4000)
    return () => window.clearTimeout(timeoutId)
  }, [message])

  const selectedSet = useMemo(() => new Set(selected), [selected])
  const hasSelectionChanges = selected.length !== enabledMiniGameIds.length
    || selected.some((id, index) => enabledMiniGameIds[index] !== id)

  const hasEnglishChanges = MINI_GAME_IDS.some((id) => (englishNames[id] ?? '').trim() !== (englishNamesById[id] ?? '').trim())
  const hasArabicChanges = MINI_GAME_IDS.some((id) => (arabicNames[id] ?? '').trim() !== (arabicNamesById[id] ?? '').trim())
  const hasAccessChanges = MINI_GAME_IDS.some((id) => (accessTiers[id] ?? 'free') !== (accessById[id] ?? 'free'))

  const hasChanges = hasSelectionChanges || hasEnglishChanges || hasArabicChanges || hasAccessChanges

  const analyticsRows = useMemo(() => {
    const byGame = MINI_GAME_IDS.map((id) => {
      const related = quizzes.filter((quiz) => (quiz.gameModeId ?? '') === id)
      const quizCount = related.length
      const totalPlays = related.reduce((sum, quiz) => sum + (quiz.totalPlays || 0), 0)
      const totalPlayers = related.reduce((sum, quiz) => sum + (quiz.totalPlayers || 0), 0)
      return {
        id,
        quizCount,
        totalPlays,
        totalPlayers,
      }
    })

    const totalMiniGameQuizzes = byGame.reduce((sum, item) => sum + item.quizCount, 0)
    const totalMiniGamePlays = byGame.reduce((sum, item) => sum + item.totalPlays, 0)
    const totalMiniGamePlayers = byGame.reduce((sum, item) => sum + item.totalPlayers, 0)

    return {
      byGame,
      totalMiniGameQuizzes,
      totalMiniGamePlays,
      totalMiniGamePlayers,
    }
  }, [quizzes])

  const toggle = (id: MiniGameId) => {
    setSelected((prev) => {
      const has = prev.includes(id)
      if (has) {
        const next = prev.filter((item) => item !== id)
        return next.length > 0 ? next : prev
      }
      return [...prev, id]
    })
  }

  const updateEnglishName = (id: MiniGameId, value: string) => setEnglishNames((prev) => ({ ...prev, [id]: value }))
  const updateArabicName = (id: MiniGameId, value: string) => setArabicNames((prev) => ({ ...prev, [id]: value }))
  const updateAccessTier = (id: MiniGameId, value: MiniGameAccessTier) => setAccessTiers((prev) => ({ ...prev, [id]: value }))

  const buildPayloadEnglish = () => {
    const next: Record<MiniGameId, string> = { ...MINI_GAME_DEFAULT_ENGLISH_NAMES }
    for (const id of MINI_GAME_IDS) {
      const trimmed = (englishNames[id] ?? '').trim()
      if (trimmed) next[id] = trimmed
    }
    return next
  }

  const buildPayloadArabic = () => {
    const next: Record<MiniGameId, string> = { ...MINI_GAME_DEFAULT_ARABIC_NAMES }
    for (const id of MINI_GAME_IDS) {
      const trimmed = (arabicNames[id] ?? '').trim()
      if (trimmed) next[id] = trimmed
    }
    return next
  }

  const buildPayloadAccess = () => {
    const next: Record<MiniGameId, MiniGameAccessTier> = { ...MINI_GAME_DEFAULT_ACCESS_BY_ID }
    for (const id of MINI_GAME_IDS) {
      const value = accessTiers[id]
      next[id] = value === 'premium' ? 'premium' : 'free'
    }
    return next
  }

  const save = async () => {
    setSaving(true)
    setMessage('')
    try {
      await onSave(selected, buildPayloadEnglish(), buildPayloadArabic(), buildPayloadAccess())
      setMessage('✅ Saved')
    } catch (error) {
      setMessage(`❌ Failed: ${(error as Error).message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem' }}>
        <h3 style={{ margin: 0, color: 'var(--text-bright)' }}>Mini Game Analytics</h3>
        <p style={{ margin: '0.45rem 0 0.7rem', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
          Usage summary across all quizzes linked to mini games.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '0.55rem' }}>
          <div style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '0.65rem', background: 'var(--bg)' }}>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.72rem' }}>Mini-game quizzes</p>
            <p style={{ margin: '0.2rem 0 0', color: 'var(--text-bright)', fontWeight: 800, fontSize: '1.05rem' }}>{analyticsRows.totalMiniGameQuizzes.toLocaleString()}</p>
          </div>
          <div style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '0.65rem', background: 'var(--bg)' }}>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.72rem' }}>Total plays</p>
            <p style={{ margin: '0.2rem 0 0', color: 'var(--text-bright)', fontWeight: 800, fontSize: '1.05rem' }}>{analyticsRows.totalMiniGamePlays.toLocaleString()}</p>
          </div>
          <div style={{ border: '1px solid var(--border)', borderRadius: '10px', padding: '0.65rem', background: 'var(--bg)' }}>
            <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.72rem' }}>Total players</p>
            <p style={{ margin: '0.2rem 0 0', color: 'var(--text-bright)', fontWeight: 800, fontSize: '1.05rem' }}>{analyticsRows.totalMiniGamePlayers.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '1rem' }}>
        <h3 style={{ margin: 0, color: 'var(--text-bright)' }}>Mini Games Controls</h3>
        <p style={{ margin: '0.45rem 0 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
          Manage mini games globally: enable/disable, rename in English and Arabic, and set free/premium access.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '0.65rem' }}>
        {MINI_GAME_IDS.map((id) => {
          const definition = MINI_GAME_DEFINITIONS[id]
          return (
            <div
              key={id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0.7rem',
                padding: '0.75rem 0.9rem',
                border: '1px solid var(--border)',
                borderRadius: '10px',
                background: selectedSet.has(id) ? 'rgba(59,130,246,0.12)' : 'var(--bg-surface)',
                opacity: selectedSet.has(id) || selected.length > 1 ? 1 : 0.65,
              }}
            >
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', width: '100%', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={selectedSet.has(id)}
                  onChange={() => toggle(id)}
                  disabled={selectedSet.has(id) && selected.length === 1}
                  style={{ width: '1rem', height: '1rem', cursor: 'pointer' }}
                />
                <span style={{ color: 'var(--text-bright)', fontSize: '0.94rem', fontWeight: 700 }}>{definition.icon} {englishNames[id] ?? definition.defaultEnglishName}</span>
              </label>

              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.78rem' }}>{definition.description}</p>

              {(() => {
                const analytics = analyticsRows.byGame.find((item) => item.id === id)
                return (
                  <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: '999px', padding: '0.15rem 0.5rem' }}>
                      🧾 Quizzes: {(analytics?.quizCount ?? 0).toLocaleString()}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: '999px', padding: '0.15rem 0.5rem' }}>
                      ▶️ Plays: {(analytics?.totalPlays ?? 0).toLocaleString()}
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', border: '1px solid var(--border)', borderRadius: '999px', padding: '0.15rem 0.5rem' }}>
                      👥 Players: {(analytics?.totalPlayers ?? 0).toLocaleString()}
                    </span>
                  </div>
                )
              })()}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', width: '100%' }}>
                <input
                  type="text"
                  value={englishNames[id] ?? ''}
                  onChange={(event) => updateEnglishName(id, event.target.value)}
                  placeholder={MINI_GAME_DEFAULT_ENGLISH_NAMES[id]}
                  style={{
                    width: '100%',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text)',
                    borderRadius: '8px',
                    padding: '0.45rem 0.6rem',
                    fontSize: '0.86rem',
                  }}
                />
                <input
                  type="text"
                  value={arabicNames[id] ?? ''}
                  onChange={(event) => updateArabicName(id, event.target.value)}
                  placeholder={MINI_GAME_DEFAULT_ARABIC_NAMES[id]}
                  dir="rtl"
                  style={{
                    width: '100%',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text)',
                    borderRadius: '8px',
                    padding: '0.45rem 0.6rem',
                    fontSize: '0.86rem',
                  }}
                />
                <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>Identifier: {id}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', minWidth: '70px' }}>Access</span>
                  <select
                    value={accessTiers[id] ?? 'free'}
                    onChange={(event) => updateAccessTier(id, event.target.value as MiniGameAccessTier)}
                    style={{
                      width: '100%',
                      border: '1px solid var(--border)',
                      background: 'var(--bg)',
                      color: 'var(--text)',
                      borderRadius: '8px',
                      padding: '0.45rem 0.6rem',
                      fontSize: '0.84rem',
                    }}
                  >
                    <option value="free">Free</option>
                    <option value="premium">Premium</option>
                  </select>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={save}
          disabled={saving || !hasChanges}
          style={{
            border: '1px solid var(--text-bright)',
            background: hasChanges ? 'var(--text-bright)' : 'rgba(59,130,246,0.16)',
            color: hasChanges ? '#fff' : 'var(--text-bright)',
            borderRadius: '8px',
            padding: '0.55rem 0.9rem',
            fontWeight: 700,
            cursor: saving || !hasChanges ? 'not-allowed' : 'pointer',
            opacity: saving ? 0.6 : 1,
          }}
        >
          {saving ? 'Saving...' : '💾 Save Mini Games'}
        </button>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Last updated: {formatUpdatedAt(updatedAt)}</span>
        {message && <span style={{ fontSize: '0.82rem', color: message.startsWith('✅') ? '#86efac' : '#fda4af' }}>{message}</span>}
      </div>
    </section>
  )
}
