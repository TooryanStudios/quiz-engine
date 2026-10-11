import type { WorkhubMember, WorkhubWorkspace } from '../../lib/workhubRepo'

export const WORKHUB_JOIN_PATH = '/workhub/join'
export const WORKHUB_JOIN_URL = `https://qyan-om.web.app${WORKHUB_JOIN_PATH}`

export function buildWorkhubInvitations(workspaces: WorkhubWorkspace[], members: WorkhubMember[]) {
  const membersByEmail = new Map(members.map((member) => [member.email.trim().toLowerCase(), member]))
  return workspaces.flatMap((workspace) => {
    const entries = new Map(Object.values(workspace.invitationHistory || {}).map((entry) => [entry.email.trim().toLowerCase(), entry]))
    for (const rawEmail of workspace.invitedEmails || []) {
      const email = rawEmail.trim().toLowerCase()
      if (!entries.has(email)) entries.set(email, { email, status: 'pending' })
    }
    return [...entries].map(([email, entry]) => {
      const member = membersByEmail.get(email)
      const granted = member?.status === 'approved' && (
        workspace.accessMemberUids?.includes(member.uid)
        || workspace.invitedEmails?.some((value) => value.trim().toLowerCase() === email)
      )
      return { ...entry, email, workspaceId: workspace.id, workspaceName: workspace.name,
        status: entry.status !== 'revoked' && granted ? 'accepted' as const : entry.status }
    })
  }).sort((a, b) => (a.status === 'pending' ? 0 : 1) - (b.status === 'pending' ? 0 : 1) || a.email.localeCompare(b.email))
}
