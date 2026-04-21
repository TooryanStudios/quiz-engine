export const WORKHUB_ADHOC_PROJECT_ID = '__adhoc__'

export function isAdHocWorkhubTask(projectId: string | null | undefined): boolean {
  return (projectId || '').trim() === WORKHUB_ADHOC_PROJECT_ID
}
