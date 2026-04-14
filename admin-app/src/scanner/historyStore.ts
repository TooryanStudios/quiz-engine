import type { ScanMode } from './openai'

export interface ScannerHistoryItem {
  id: string
  createdAt: number
  mode: ScanMode
  imageDataUrl: string
  rawText: string
  answer: string
  explanation: string
  captureMs: number
  scanMs: number
  totalMs: number
  autoRotated: boolean
}

const DB_NAME = 'scanner_history_db'
const STORE_NAME = 'scanner_history_entries'
const FALLBACK_KEY = 'scanner_history_fallback'
const MAX_ITEMS = 24

function hasIndexedDb() {
  return typeof indexedDB !== 'undefined'
}

function readFallback(): ScannerHistoryItem[] {
  try {
    const raw = localStorage.getItem(FALLBACK_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as ScannerHistoryItem[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeFallback(items: ScannerHistoryItem[]) {
  localStorage.setItem(FALLBACK_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)))
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('createdAt', 'createdAt', { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Failed to open scanner history database.'))
  })
}

function getAllFromDb(db: IDBDatabase): Promise<ScannerHistoryItem[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)
    const request = store.getAll()

    request.onsuccess = () => resolve(request.result as ScannerHistoryItem[])
    request.onerror = () => reject(request.error ?? new Error('Failed to read scanner history.'))
  })
}

function pruneAndSort(items: ScannerHistoryItem[]): ScannerHistoryItem[] {
  return items
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, MAX_ITEMS)
}

async function pruneDb(db: IDBDatabase) {
  const all = await getAllFromDb(db)
  const keepIds = new Set(pruneAndSort(all).map(item => item.id))
  const staleIds = all.filter(item => !keepIds.has(item.id)).map(item => item.id)
  if (staleIds.length === 0) return

  await new Promise<void>((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)
    staleIds.forEach(id => store.delete(id))
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('Failed to prune scanner history.'))
  })
}

export async function listHistoryItems(limit = MAX_ITEMS): Promise<ScannerHistoryItem[]> {
  if (!hasIndexedDb()) {
    return pruneAndSort(readFallback()).slice(0, limit)
  }

  const db = await openDb()
  try {
    const items = await getAllFromDb(db)
    return pruneAndSort(items).slice(0, limit)
  } finally {
    db.close()
  }
}

export async function addHistoryItem(item: ScannerHistoryItem): Promise<void> {
  if (!hasIndexedDb()) {
    const next = pruneAndSort([item, ...readFallback()])
    writeFallback(next)
    return
  }

  const db = await openDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      store.put(item)
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error ?? new Error('Failed to save scanner history.'))
    })
    await pruneDb(db)
  } finally {
    db.close()
  }
}

export async function clearHistoryItems(): Promise<void> {
  if (!hasIndexedDb()) {
    localStorage.removeItem(FALLBACK_KEY)
    return
  }

  const db = await openDb()
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      store.clear()
      transaction.oncomplete = () => resolve()
      transaction.onerror = () => reject(transaction.error ?? new Error('Failed to clear scanner history.'))
    })
  } finally {
    db.close()
  }
}
