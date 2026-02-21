import { getPaymentsMode, purchasePack } from '../lib/stripe'
import { useState } from 'react'

const TEST_PRICE_ID = import.meta.env.VITE_STRIPE_TEST_PRICE_ID || 'price_test_placeholder'

export function BillingPage() {
  const [uid, setUid] = useState('')
  const [packId, setPackId] = useState('animals-pack')
  const mode = getPaymentsMode()

  const handleSubscribe = async () => {
    try {
      if (!uid || !packId) {
        alert('UID and Pack ID are required')
        return
      }
      await purchasePack(TEST_PRICE_ID, uid, packId)
      if (mode === 'mock') {
        alert('Mock purchase completed. Entitlement granted without charging money.')
      }
    } catch (error) {
      alert(`Purchase failed: ${(error as Error).message}`)
    }
  }

  return (
    <section className="panel">
      <h2>Billing</h2>
      <p>
        Mode: <strong>{mode.toUpperCase()}</strong>
        {mode === 'mock'
          ? ' (no real charge, PoC only)'
          : ' (real Stripe checkout)'}
      </p>
      <div className="grid" style={{ marginBottom: 12 }}>
        <input
          placeholder="Firebase UID (required for entitlement write)"
          value={uid}
          onChange={(e) => setUid(e.target.value)}
        />
        <input
          placeholder="Pack ID"
          value={packId}
          onChange={(e) => setPackId(e.target.value)}
        />
      </div>
      <button onClick={handleSubscribe}>
        {mode === 'mock' ? 'Simulate Purchase' : 'Start Test Subscription'}
      </button>
    </section>
  )
}
