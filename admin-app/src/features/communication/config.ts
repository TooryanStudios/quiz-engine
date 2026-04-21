function parseBooleanFlag(value: string | undefined, fallback: boolean): boolean {
  if (typeof value !== 'string') return fallback
  const normalized = value.trim().toLowerCase()
  if (!normalized) return fallback
  if (normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on') return true
  if (normalized === '0' || normalized === 'false' || normalized === 'no' || normalized === 'off') return false
  return fallback
}

function readLocalOverride(key: string, fallback: boolean): boolean {
  if (typeof window === 'undefined') return fallback
  const value = window.localStorage.getItem(key)
  if (value === null) return fallback
  return parseBooleanFlag(value, fallback)
}

function resolveFlag(options: {
  envValue: string | undefined
  localStorageKey: string
  fallback: boolean
}): boolean {
  const fromEnv = parseBooleanFlag(options.envValue, options.fallback)
  return readLocalOverride(options.localStorageKey, fromEnv)
}

export const communicationFeatureFlags = {
  notificationsInShell: resolveFlag({
    envValue: import.meta.env.VITE_FEATURE_NOTIFICATIONS_IN_SHELL,
    localStorageKey: 'qyan:feature:notificationsInShell',
    fallback: true,
  }),
  chatDock: resolveFlag({
    envValue: import.meta.env.VITE_FEATURE_CHAT_DOCK,
    localStorageKey: 'qyan:feature:chatDock',
    fallback: true,
  }),
  messagesPage: resolveFlag({
    envValue: import.meta.env.VITE_FEATURE_MESSAGES_PAGE,
    localStorageKey: 'qyan:feature:messagesPage',
    fallback: true,
  }),
  adHocTasksPage: resolveFlag({
    envValue: import.meta.env.VITE_FEATURE_ADHOC_TASKS_PAGE,
    localStorageKey: 'qyan:feature:adHocTasksPage',
    fallback: true,
  }),
}

export type CommunicationFeatureFlags = typeof communicationFeatureFlags
