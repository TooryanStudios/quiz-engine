import { describe, expect, it } from 'vitest'
import { canInviteWorkhubMember, resolveWorkhubJoinStatus } from '../functions/src/workhubAccessPolicy'

describe('WorkHub join and invitation permissions', () => {
  it('queues a first sign-in for approval when there is no verified invitation', () => {
    expect(resolveWorkhubJoinStatus(undefined, false, false)).toBe('pending')
  })
  it('allows a verified invitation to admit a new or pending member', () => {
    expect(resolveWorkhubJoinStatus(undefined, false, true)).toBe('approved')
    expect(resolveWorkhubJoinStatus('pending', false, true)).toBe('approved')
  })
  it('does not allow an invitation to bypass suspension', () => {
    expect(resolveWorkhubJoinStatus('suspended', false, true)).toBe('suspended')
  })
  it('preserves existing approval on later sign-ins', () => {
    expect(resolveWorkhubJoinStatus('approved', false, false)).toBe('approved')
  })
  it('allows master and approved WorkHub administrators to invite', () => {
    expect(canInviteWorkhubMember(true, undefined, undefined)).toBe(true)
    expect(canInviteWorkhubMember(false, 'approved', 'admin')).toBe(true)
  })
  it('rejects non-admins and inactive admins', () => {
    for (const role of ['member', 'manager', undefined]) expect(canInviteWorkhubMember(false, 'approved', role)).toBe(false)
    for (const status of ['pending', 'suspended', undefined]) expect(canInviteWorkhubMember(false, status, 'admin')).toBe(false)
  })
})
