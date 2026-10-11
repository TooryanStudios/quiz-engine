import { useEffect, useState } from 'react'
import { signOut, type User } from 'firebase/auth'
import { useNavigate } from 'react-router-dom'
import { auth } from '../../lib/firebase'
import { requestWorkhubAccess, subscribeOwnWorkhubMember, type WorkhubMember } from '../../lib/workhubRepo'

export function WorkhubJoinPage({ user }: { user: User }) {
  const navigate = useNavigate()
  const [member, setMember] = useState<WorkhubMember | null>(null)
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  useEffect(() => {
    let active = true
    setReady(false); setError('')
    const unsubscribe = subscribeOwnWorkhubMember(user.uid, (next) => { if (active) setMember(next) })
    void requestWorkhubAccess().then((next) => {
      if (active) { setMember(next); setReady(true) }
    }).catch((failure) => {
      if (active) { setError(failure instanceof Error ? failure.message : 'Could not submit your request. Please retry.'); setReady(true) }
    })
    return () => { active = false; unsubscribe() }
  }, [user.uid, retry])
  useEffect(() => {
    if (ready && !error && member?.status === 'approved') navigate('/workhub', { replace: true })
  }, [ready, error, member?.status, navigate])
  return <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', background: '#f5f7fb', padding: 24 }}>
    <section style={{ width: 'min(460px, 100%)', padding: 32, borderRadius: 18, background: 'white', boxShadow: '0 12px 48px #1c304514', color: '#243650' }}>
      <p style={{ color: '#5264d9', fontWeight: 700 }}>WORKHUB</p>
      <h1>{error ? 'We could not complete your request' : !ready ? 'Checking your invitation…' : member?.status === 'suspended' ? 'WorkHub access is suspended' : member?.status === 'approved' ? 'Opening your workspace…' : 'Your join request has been sent'}</h1>
      <p>{error || (!ready ? 'We are checking your workspace invitation and registering your access request.' : member?.status === 'suspended' ? 'Contact your WorkHub administrator to reactivate your membership.' : member?.status === 'pending' ? 'Your administrator can now find you under User management → Join requests. This page updates when you are approved.' : 'Your workspace access is ready.')}</p>
      <p style={{ color: '#718096' }}>Signed in as {user.email}</p>
      {error && <button type="button" onClick={() => setRetry((value) => value + 1)}>Retry request</button>}
      <button type="button" style={{ marginTop: 16 }} onClick={() => { void signOut(auth) }}>Use another account</button>
    </section>
  </main>
}
