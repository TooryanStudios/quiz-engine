import { useCallback, useState } from 'react'

export type AddItemType = 'task' | 'document' | 'note' | 'moodboard'

export interface AddItemDialogProps {
  isOpen: boolean
  onClose: () => void
  onCreate: (type: AddItemType, projectId: string) => void
}

export function useWorkhubAddItemDialog({
  selectedProjectId,
  workspaceProjectById,
}: {
  selectedProjectId: string
  workspaceProjectById: Record<string, unknown>
}) {
  const [addItemDialogOpen, setAddItemDialogOpen] = useState(false)
  const [addItemProjectId, setAddItemProjectId] = useState('')

  const openAddItemDialog = useCallback((projectId = '') => {
    const preferredProjectId = projectId || (selectedProjectId !== 'all' ? selectedProjectId : '')
    const targetProjectId = workspaceProjectById[preferredProjectId] ? preferredProjectId : ''
    setAddItemProjectId(targetProjectId)
    setAddItemDialogOpen(true)
  }, [selectedProjectId, workspaceProjectById])

  const closeAddItemDialog = useCallback(() => {
    setAddItemDialogOpen(false)
  }, [])

  const handleCreateItem = useCallback(async (type: AddItemType) => {
    void type
    setAddItemDialogOpen(false)
  }, [])

  return {
    addItemDialogOpen,
    addItemProjectId,
    openAddItemDialog,
    closeAddItemDialog,
    handleCreateItem,
  }
}