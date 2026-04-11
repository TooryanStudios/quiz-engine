import { useCallback, useState } from 'react'
import type { WorkhubTaskChecklistItem } from '../../../lib/workhubRepo'

interface UseWorkhubChecklistEditorParams {
  items: WorkhubTaskChecklistItem[]
  readOnly?: boolean
  onChange: (nextItems: WorkhubTaskChecklistItem[]) => Promise<void>
}

export function useWorkhubChecklistEditor({ items, readOnly = false, onChange }: UseWorkhubChecklistEditorParams) {
  const [draft, setDraft] = useState('')
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [editingItemText, setEditingItemText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const applyChanges = useCallback(async (nextItems: WorkhubTaskChecklistItem[]) => {
    setSaving(true)
    setError(null)
    try {
      await onChange(nextItems)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setSaving(false)
    }
  }, [onChange])

  const addItem = useCallback(async () => {
    if (readOnly) return
    const nextText = draft.trim()
    if (!nextText) return
    const nextItems = [
      ...items,
      {
        id: `chk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        text: nextText,
        completed: false,
      },
    ]
    setDraft('')
    await applyChanges(nextItems)
  }, [applyChanges, draft, items, readOnly])

  const toggleItem = useCallback(async (item: WorkhubTaskChecklistItem, checked: boolean) => {
    if (readOnly) return
    await applyChanges(items.map((value) => value.id === item.id ? { ...value, completed: checked } : value))
  }, [applyChanges, items, readOnly])

  const removeItem = useCallback(async (item: WorkhubTaskChecklistItem) => {
    if (readOnly) return
    await applyChanges(items.filter((value) => value.id !== item.id))
  }, [applyChanges, items, readOnly])

  const startEdit = useCallback((item: WorkhubTaskChecklistItem) => {
    if (readOnly) return
    setEditingItemId(item.id)
    setEditingItemText(item.text)
  }, [readOnly])

  const cancelEdit = useCallback(() => {
    setEditingItemId(null)
    setEditingItemText('')
  }, [])

  const saveEdit = useCallback(async (item: WorkhubTaskChecklistItem) => {
    if (readOnly) return
    const nextText = editingItemText.trim()
    if (!nextText) {
      cancelEdit()
      return
    }
    await applyChanges(items.map((value) => value.id === item.id ? { ...value, text: nextText } : value))
    cancelEdit()
  }, [applyChanges, cancelEdit, editingItemText, items, readOnly])

  return {
    draft,
    setDraft,
    editingItemId,
    editingItemText,
    setEditingItemText,
    saving,
    error,
    addItem,
    toggleItem,
    removeItem,
    startEdit,
    cancelEdit,
    saveEdit,
  }
}
