export function resolveWorkhubJoinStatus(existingStatus: unknown, isMaster: boolean, hasVerifiedInvite: boolean): 'pending' | 'approved' | 'suspended' {
  if (isMaster) return 'approved'
  if (existingStatus === 'suspended') return 'suspended'
  if (existingStatus === 'approved' || hasVerifiedInvite) return 'approved'
  return 'pending'
}

export function canInviteWorkhubMember(isMaster: boolean, status: unknown, role: unknown): boolean {
  return isMaster || (status === 'approved' && role === 'admin')
}
