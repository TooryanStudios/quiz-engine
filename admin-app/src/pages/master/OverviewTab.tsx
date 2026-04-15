import { useEffect, useState } from 'react'
import { sendWorkhubTestEmail } from '../../lib/adminRepo'
import { auth } from '../../lib/firebase'
import type { QuizDoc } from '../../types/quiz'
import { StatCard } from './masterShared'

interface Props {
  quizzes: (QuizDoc & { id: string })[]
  totalPlays: number
  totalPlayers: number
  totalShares: number
  totalUsers: number
  newUsersLast24Hours: number
}

export function OverviewTab({ quizzes, totalPlays, totalPlayers, totalShares, totalUsers, newUsersLast24Hours }: Props) {
  const [testRecipient, setTestRecipient] = useState(() => auth.currentUser?.email || '')
  const [sendingTestEmail, setSendingTestEmail] = useState(false)
  const [testEmailFeedback, setTestEmailFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    if (testRecipient.trim()) return
    const nextEmail = auth.currentUser?.email || ''
    if (nextEmail) setTestRecipient(nextEmail)
  }, [testRecipient])

  async function handleSendTestEmail() {
    setSendingTestEmail(true)
    setTestEmailFeedback(null)
    try {
      const result = await sendWorkhubTestEmail(testRecipient.trim())
      setTestRecipient(result.toEmail)
      setTestEmailFeedback({
        type: 'success',
        text: `${result.message} Check inbox and spam.`,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not send test email.'
      setTestEmailFeedback({ type: 'error', text: message })
    } finally {
      setSendingTestEmail(false)
    }
  }

  return (
    <div style={{ display: 'grid', gap: '0.9rem' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.75rem' }}>
        <StatCard label="Total Quizzes"  value={quizzes.length} icon="📋" />
        <StatCard label="Total Users" value={totalUsers} icon="👥" />
        <StatCard label="New Users (Last 24 Hours)" value={newUsersLast24Hours} icon="🆕" />
        <StatCard label="Total Plays"    value={totalPlays}     icon="🎮" />
        <StatCard label="Total Players"  value={totalPlayers}   icon="👥" />
        <StatCard label="Total Shares"   value={totalShares}    icon="🔗" />
      </div>

      <section style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: '12px',
        padding: '1rem',
        display: 'grid',
        gap: '0.8rem',
      }}>
        <div style={{ display: 'grid', gap: '0.2rem' }}>
          <h2 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-bright)' }}>WorkHub Email Delivery</h2>
          <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
            Sends a real SMTP test email from Firebase Cloud Functions using the current WorkHub mail settings.
          </p>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem', alignItems: 'center' }}>
          <input
            type="email"
            value={testRecipient}
            onChange={(event) => setTestRecipient(event.target.value)}
            placeholder="admin@your-domain.com"
            style={{
              flex: '1 1 260px',
              minWidth: 0,
              padding: '0.72rem 0.8rem',
              borderRadius: '9px',
              border: '1px solid var(--border)',
              background: 'var(--bg-page)',
              color: 'var(--text)',
              font: 'inherit',
            }}
          />
          <button
            type="button"
            onClick={() => void handleSendTestEmail()}
            disabled={sendingTestEmail || !testRecipient.trim()}
            style={{
              padding: '0.72rem 1rem',
              borderRadius: '9px',
              border: '1px solid #295fe6',
              background: sendingTestEmail ? '#dbe7ff' : '#edf4ff',
              color: '#1f4db8',
              font: 'inherit',
              fontWeight: 700,
              cursor: sendingTestEmail ? 'progress' : 'pointer',
            }}
          >
            {sendingTestEmail ? 'Sending test email…' : 'Send test email'}
          </button>
        </div>

        {testEmailFeedback && (
          <div style={{
            borderRadius: '9px',
            padding: '0.75rem 0.85rem',
            fontSize: '0.84rem',
            lineHeight: 1.5,
            border: testEmailFeedback.type === 'success' ? '1px solid #b9d8c2' : '1px solid #efb1b1',
            background: testEmailFeedback.type === 'success' ? '#eef9f1' : '#fff3f3',
            color: testEmailFeedback.type === 'success' ? '#20623c' : '#9f2d2d',
          }}>
            {testEmailFeedback.text}
          </div>
        )}
      </section>
    </div>
  )
}
