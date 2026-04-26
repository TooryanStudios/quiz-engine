export type ProjectSelectionHydrationGuardInput = {
  selectedProjectId: string
  projectsFeedHydrated: boolean
  isSelectedProjectVisible: boolean
}

// Keep project deep links stable during initial refresh hydration.
export function shouldResetSelectedProjectAfterHydration({
  selectedProjectId,
  projectsFeedHydrated,
  isSelectedProjectVisible,
}: ProjectSelectionHydrationGuardInput): boolean {
  if (!selectedProjectId || selectedProjectId === 'all') return false
  if (!projectsFeedHydrated) return false
  return !isSelectedProjectVisible
}
