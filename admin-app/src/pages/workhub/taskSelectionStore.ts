type TaskSelectionListener = () => void

let selectedTaskId = ''
const listeners = new Set<TaskSelectionListener>()

export function getTaskSelectionSnapshot() {
  return selectedTaskId
}

export function setTaskSelectionId(nextTaskId: string) {
  const normalizedTaskId = nextTaskId || ''
  if (normalizedTaskId === selectedTaskId) return

  selectedTaskId = normalizedTaskId
  listeners.forEach((listener) => listener())
}

export function subscribeTaskSelection(listener: TaskSelectionListener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
