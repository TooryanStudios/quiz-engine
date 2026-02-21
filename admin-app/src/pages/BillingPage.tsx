import { goToCheckout } from '../lib/stripe'
import { useState } from 'react'

const TEST_PRICE_ID = import.meta.env.VITE_STRIPE_TEST_PRICE_ID || 'price_test_placeholder'

export function BillingPage() {
  const [uid, setUid] = useState('')
  const [packId, setPackId] = useState('animals-pack')

  const handleSubscribe = async () => {
    try {
      await goToCheckout(TEST_PRICE_ID, uid || undefined, packId || undefined)
    } catch (error) {
      alert(`Checkout failed: ${(error as Error).message}`)
    }
  }

  return (
    <section className="panel">
      <h2>Billing</h2>
      <p>Starts Stripe subscription checkout. Server endpoint should create the session.</p>
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
      <button onClick={handleSubscribe}>Start Test Subscription</button>
    </section>
  )
}
