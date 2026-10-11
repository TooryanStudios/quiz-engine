// General chat uses a virtual workspace identifier, not a Firestore document.
export async function readEmailWorkspace<T>(
  workspaceId: string,
  read: (path: string) => Promise<T | null>,
): Promise<T | null> {
  if (!workspaceId || /^__.*__$/.test(workspaceId)) return null
  return read(`workhub_workspaces/${workspaceId}`)
}
