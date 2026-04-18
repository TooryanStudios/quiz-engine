export interface WorkhubEntityFinderEntry {
  projectId: string
  workspaceId: string
  name: string
  workspaceName: string
  subjectLabel: string
  clientName: string
  nameLower: string
  workspaceNameLower: string
  subjectLabelLower: string
  clientNameLower: string
  descriptionLower: string
  searchableText: string
  order: number
}

export function scoreWorkhubEntityFinderEntry(entry: WorkhubEntityFinderEntry, normalizedQuery: string): number {
  if (!normalizedQuery) return 1

  let score = 0

  if (entry.nameLower === normalizedQuery) score += 220
  if (entry.nameLower.startsWith(normalizedQuery)) score += 140

  const nameIndex = entry.nameLower.indexOf(normalizedQuery)
  if (nameIndex >= 0) score += 110 - Math.min(nameIndex, 80)

  const workspaceIndex = entry.workspaceNameLower.indexOf(normalizedQuery)
  if (workspaceIndex >= 0) score += 38 - Math.min(workspaceIndex, 30)

  if (entry.subjectLabelLower.includes(normalizedQuery)) score += 24
  if (entry.clientNameLower && entry.clientNameLower.includes(normalizedQuery)) score += 22
  if (entry.descriptionLower.includes(normalizedQuery)) score += 18

  const queryTokens = normalizedQuery.split(/\s+/).filter((token) => token.length > 0)
  if (queryTokens.length > 1) {
    const matchedTokenCount = queryTokens.reduce((count, token) => (
      entry.searchableText.includes(token) ? count + 1 : count
    ), 0)
    score += matchedTokenCount * 14
  }

  return score
}
