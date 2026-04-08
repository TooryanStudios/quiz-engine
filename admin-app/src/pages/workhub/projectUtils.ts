import type { WorkhubProject, WorkhubWorkspace } from '../../lib/workhubRepo'

export function isValidHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value)
}

export function normalizeMemberUids(uids: string[]): string[] {
  return Array.from(new Set(uids.filter(Boolean)))
}

export function normalizeInviteEmails(emails: string[]): string[] {
  return Array.from(new Set(emails.map((value) => value.trim().toLowerCase()).filter(Boolean)))
}

export function canAccessWorkspace(
  workspace: WorkhubWorkspace,
  uid: string,
  email: string,
  isPrivileged: boolean,
): boolean {
  if (isPrivileged) return true
  const accessMemberUids = normalizeMemberUids(workspace.accessMemberUids || [])
  const invitedEmails = normalizeInviteEmails(workspace.invitedEmails || [])
  const hasUidAccess = accessMemberUids.includes(uid)
  const hasEmailInvite = !!email && invitedEmails.includes(email.trim().toLowerCase())
  return hasUidAccess || hasEmailInvite
}

export function canViewProject(project: WorkhubProject, uid: string, canSeeAllProjects: boolean): boolean {
  if (canSeeAllProjects) return true
  if (project.visibility !== 'restricted') return true
  return project.createdBy === uid || project.memberUids.includes(uid)
}

export function getWorkspaceType(
  workspace: Pick<WorkhubWorkspace, 'type'> | null | undefined,
): 'technical' | 'hr' | 'finance' {
  return workspace?.type || 'technical'
}

function toDateOnlyTimestamp(year: number, month: number, day: number): number | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null
  if (month < 1 || month > 12) return null
  if (day < 1 || day > 31) return null
  const candidate = new Date(Date.UTC(year, month - 1, day))
  if (
    candidate.getUTCFullYear() !== year
    || candidate.getUTCMonth() !== month - 1
    || candidate.getUTCDate() !== day
  ) {
    return null
  }
  return candidate.getTime()
}

function parseDateInputCandidates(value: string): number[] {
  const trimmed = value.trim()
  if (!trimmed) return []

  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed)
  if (isoMatch) {
    const candidate = toDateOnlyTimestamp(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]))
    return candidate === null ? [] : [candidate]
  }

  const slashMatch = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(trimmed)
  if (slashMatch) {
    const first = Number(slashMatch[1])
    const second = Number(slashMatch[2])
    const year = Number(slashMatch[3])
    const candidates = new Set<number>()

    const monthFirst = toDateOnlyTimestamp(year, first, second)
    if (monthFirst !== null) candidates.add(monthFirst)

    const dayFirst = toDateOnlyTimestamp(year, second, first)
    if (dayFirst !== null) candidates.add(dayFirst)

    return Array.from(candidates)
  }

  const parsed = Date.parse(trimmed)
  if (!Number.isFinite(parsed)) return []
  const candidate = new Date(parsed)
  return [Date.UTC(candidate.getUTCFullYear(), candidate.getUTCMonth(), candidate.getUTCDate())]
}

export function isStartAfterEnd(startDate: string, endDate: string): boolean {
  const startCandidates = parseDateInputCandidates(startDate)
  const endCandidates = parseDateInputCandidates(endDate)
  if (startCandidates.length === 0 || endCandidates.length === 0) return false

  for (const startCandidate of startCandidates) {
    for (const endCandidate of endCandidates) {
      if (startCandidate <= endCandidate) {
        return false
      }
    }
  }

  return true
}

export function makeTaskStatusId(label: string): string {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || `status_${Date.now()}`
}

export type WorkhubProjectTreeNode = WorkhubProject & { children: WorkhubProjectTreeNode[] }

export function buildProjectTree(items: WorkhubProject[]): WorkhubProjectTreeNode[] {
  const sorted = [...items].sort((a, b) => a.name.localeCompare(b.name))
  const byParent = new Map<string, WorkhubProject[]>()
  sorted.forEach((item) => {
    const key = item.parentProjectId || ''
    const bucket = byParent.get(key) || []
    bucket.push(item)
    byParent.set(key, bucket)
  })
  const build = (parentId: string): WorkhubProjectTreeNode[] => {
    return (byParent.get(parentId) || []).map((item) => ({
      ...item,
      children: build(item.id),
    }))
  }
  return build('')
}

export function flattenProjectTree(
  nodes: WorkhubProjectTreeNode[],
  depth = 0,
): Array<{ id: string; name: string; depth: number }> {
  return nodes.flatMap((node) => [
    { id: node.id, name: node.name, depth },
    ...flattenProjectTree(node.children, depth + 1),
  ])
}

export function collectProjectBranchIds(
  projectId: string,
  byParent: Map<string, WorkhubProject[]>,
): Set<string> {
  const ids = new Set<string>()
  const visit = (id: string) => {
    ids.add(id)
    ;(byParent.get(id) || []).forEach((child) => visit(child.id))
  }
  if (projectId) visit(projectId)
  return ids
}

export function collectProjectLineage(projectId: string, byId: Record<string, WorkhubProject>): string[] {
  const lineage: string[] = []
  let pointer = byId[projectId]
  while (pointer?.parentProjectId) {
    lineage.unshift(pointer.parentProjectId)
    pointer = byId[pointer.parentProjectId]
  }
  return lineage
}
