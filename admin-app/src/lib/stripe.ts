import { loadStripe } from '@stripe/stripe-js'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''
const PAYMENTS_MODE = (import.meta.env.VITE_PAYMENTS_MODE || 'mock').toLowerCase()

export const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '',
)

export function getPaymentsMode() {
  return PAYMENTS_MODE === 'stripe' ? 'stripe' : 'mock'
}

export async function mockPurchase(uid: string, packId: string) {
  const response = await fetch(`${API_BASE}/api/payments/mock-purchase`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid, packId }),
  })

  if (!response.ok) throw new Error('Mock purchase failed')
  return response.json()
}

export async function goToCheckout(priceId: string, uid?: string, packId?: string) {
  const response = await fetch(`${API_BASE}/api/stripe/create-checkout-session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ priceId, uid, packId }),
  })

  if (!response.ok) throw new Error('Failed to create checkout session')

  const { url } = await response.json()
  if (!url) throw new Error('Missing checkout URL')
  window.location.assign(url)
}

export async function purchasePack(priceId: string, uid: string, packId: string) {
  if (getPaymentsMode() === 'mock') {
    return mockPurchase(uid, packId)
  }
  return goToCheckout(priceId, uid, packId)
}
