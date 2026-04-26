export const CHAT_DOCK_OPEN_EVENT = 'qyan:chat-dock-open'

export interface ChatDockOpenDetail {
  threadId?: string
  actorUid?: string
  source?: 'toast' | 'notification' | 'ui'
  targetPath?: string
  targetTaskId?: string
  targetLabel?: string
  projectTargetPath?: string
  projectTargetLabel?: string
}

export function dispatchChatDockOpen(detail: ChatDockOpenDetail) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent<ChatDockOpenDetail>(CHAT_DOCK_OPEN_EVENT, { detail }))
}
