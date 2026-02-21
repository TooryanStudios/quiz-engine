import { loadStripe } from '@stripe/stripe-js'

const API_BASE = import.meta.env.VITE_API_BASE_URL || ''

export const stripePromise = loadStripe(
  import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '',
)

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
