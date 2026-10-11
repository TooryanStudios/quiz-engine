/** Expose the locally queued item immediately, while still awaiting server success. */
export async function finishQueuedCreation(
  id: string,
  pendingWrite: Promise<void>,
  onQueued?: (id: string) => void,
): Promise<string> {
  onQueued?.(id)
  await pendingWrite
  return id
}
