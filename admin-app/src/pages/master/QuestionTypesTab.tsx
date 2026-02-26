import { useEffect, useMemo, useState } from 'react'
import {
  type QuestionTypeAccessTier,
  QUESTION_TYPE_ARABIC_TITLES,
  QUESTION_TYPE_DEFAULT_ACCESS_BY_TYPE,
  QUESTION_TYPE_DEFAULT_TITLES,
  QUESTION_TYPE_IDS,
  type QuestionTypeId,
} from '../../config/questionTypes'

interface Props {
  enabledQuestionTypeIds: QuestionTypeId[]
  titlesByType: Record<QuestionTypeId, string>
  accessByType: Record<QuestionTypeId, QuestionTypeAccessTier>
  updatedAt?: { toDate(): Date }
  onSave: (
    nextEnabled: QuestionTypeId[],
    nextTitlesByType: Record<QuestionTypeId, string>,
    nextAccessByType: Record<QuestionTypeId, QuestionTypeAccessTier>,
  ) => Promise<void>
}

function formatUpdatedAt(value?: { toDate(): Date }) {
  if (!value) return 'Never'
  return value.toDate().toLocaleString()
}

export function QuestionTypesTab({ enabledQuestionTypeIds, titlesByType, accessByType, updatedAt, onSave }: Props) {
  const [selected, setSelected] = useState<QuestionTypeId[]>(enabledQuestionTypeIds)
  const [titles, setTitles] = useState<Record<QuestionTypeId, string>>(titlesByType)
  const [accessTiers, setAccessTiers] = useState<Record<QuestionTypeId, QuestionTypeAccessTier>>(accessByType)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string>('')

  useEffect(() => {
    setSelected(enabledQuestionTypeIds)
  }, [enabledQuestionTypeIds])

  useEffect(() => {
    setTitles(titlesByType)
  }, [titlesByType])

  useEffect(() => {
    setAccessTiers(accessByType)
  }, [accessByType])

  useEffect(() => {
    if (!message) return
    const timeoutId = window.setTimeout(() => setMessage(''), 4000)
    return () => window.clearTimeout(timeoutId)
  }, [message])

  const selectedSet = useMemo(() => new Set(selected), [selected])
  const hasSelectionChanges = selected.length !== enabledQuestionTypeIds.length
    || selected.some((id, index) => enabledQuestionTypeIds[index] !== id)

  const hasTitleChanges = QUESTION_TYPE_IDS.some((id) => {
    const current = (titles[id] ?? '').trim()
    const saved = (titlesByType[id] ?? '').trim()
    return current !== saved
  })

  const hasAccessChanges = QUESTION_TYPE_IDS.some((id) => (accessTiers[id] ?? 'free') !== (accessByType[id] ?? 'free'))

  const hasChanges = hasSelectionChanges || hasTitleChanges || hasAccessChanges

  const toggle = (id: QuestionTypeId) => {
    setSelected((prev) => {
      const has = prev.includes(id)
      if (has) {
        const next = prev.filter((item) => item !== id)
        return next.length > 0 ? next : prev
      }
      return [...prev, id]
    })
  }

  const updateTitle = (id: QuestionTypeId, value: string) => {
    setTitles((prev) => ({ ...prev, [id]: value }))
  }

  const updateAccessTier = (id: QuestionTypeId, value: QuestionTypeAccessTier) => {
    setAccessTiers((prev) => ({ ...prev, [id]: value }))
  }

  const buildPayloadTitles = () => {
    const next: Record<QuestionTypeId, string> = { ...QUESTION_TYPE_DEFAULT_TITLES }
    for (const id of QUESTION_TYPE_IDS) {
      const trimmed = (titles[id] ?? '').trim()
      if (trimmed) {
        next[id] = trimmed
      }
    }
    return next
  }

  const buildPayloadAccess = () => {
    const next: Record<QuestionTypeId, QuestionTypeAccessTier> = { ...QUESTION_TYPE_DEFAULT_ACCESS_BY_TYPE }
    for (const id of QUESTION_TYPE_IDS) {
      const value = accessTiers[id]
      next[id] = value === 'premium' ? 'premium' : 'free'
    }
    return next
  }

  const save = async () => {
    setSaving(true)
    setMessage('')
    try {
      await onSave(selected, buildPayloadTitles(), buildPayloadAccess())
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
        <h3 style={{ margin: 0, color: 'var(--text-bright)' }}>Question Type Controls</h3>
        <p style={{ margin: '0.45rem 0 0', color: 'var(--text-muted)', fontSize: '0.82rem' }}>
          Enable or disable question types globally for creators. At least one type must stay enabled. You can edit the displayed title, while the technical identifier stays fixed.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))', gap: '0.65rem' }}>
        {QUESTION_TYPE_IDS.map((id) => (
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
              <span style={{ color: 'var(--text-bright)', fontSize: '0.94rem', fontWeight: 700 }}>{QUESTION_TYPE_ARABIC_TITLES[id]}</span>
            </label>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', width: '100%' }}>
              <input
                type="text"
                value={titles[id] ?? ''}
                onChange={(event) => updateTitle(id, event.target.value)}
                placeholder={QUESTION_TYPE_DEFAULT_TITLES[id]}
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
                  onChange={(event) => updateAccessTier(id, event.target.value as QuestionTypeAccessTier)}
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
        ))}
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
          {saving ? 'Saving...' : '💾 Save Question Types'}
        </button>
        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Last updated: {formatUpdatedAt(updatedAt)}</span>
        {message && <span style={{ fontSize: '0.82rem', color: message.startsWith('✅') ? '#86efac' : '#fda4af' }}>{message}</span>}
      </div>
    </section>
  )
}
