import { describe, expect, it } from 'vitest'
import { buildWorkhubInvitations, WORKHUB_JOIN_URL } from '../src/pages/workhub/invitationModel'
import type { WorkhubMember, WorkhubWorkspace } from '../src/lib/workhubRepo'
const member = { uid: 'known', email: 'member@example.test', status: 'approved' } as WorkhubMember
const workspace = { id: 'one', name: 'Marketing', accessMemberUids: ['known'], invitedEmails: ['MEMBER@example.test'] } as WorkhubWorkspace
describe('invitation list reconciliation', () => {
  it('does not show an active member with a stale reserved email as awaiting sign-in', () => {
    expect(buildWorkhubInvitations([workspace], [member])[0].status).toBe('accepted')
  })
  it('retains an invitation to an existing member after its reserved email is removed', () => {
    const sent = { ...workspace, invitedEmails: [], invitationHistory: { key: { email: member.email, status: 'accepted' as const, delivery: 'sent' as const } } }
    expect(buildWorkhubInvitations([sent], [member])).toMatchObject([{ email: member.email, status: 'accepted', delivery: 'sent' }])
  })
  it('preserves pending invitations for new users and does not duplicate history', () => {
    const sent = { ...workspace, invitationHistory: { key: { email: member.email, status: 'pending' as const } } }
    expect(buildWorkhubInvitations([sent], [])).toHaveLength(1)
    expect(buildWorkhubInvitations([sent], [])[0].status).toBe('pending')
  })
  it('keeps revocation distinct from existing access', () => {
    const revoked = { ...workspace, invitationHistory: { key: { email: member.email, status: 'revoked' as const } } }
    expect(buildWorkhubInvitations([revoked], [member])[0].status).toBe('revoked')
  })
  it('does not treat a pending member as having accepted an invitation', () => {
    expect(buildWorkhubInvitations([workspace], [{ ...member, status: 'pending' }])[0].status).toBe('pending')
  })
  it('uses the dedicated public join route', () => {
    expect(new URL(WORKHUB_JOIN_URL).pathname).toBe('/workhub/join')
  })
})
