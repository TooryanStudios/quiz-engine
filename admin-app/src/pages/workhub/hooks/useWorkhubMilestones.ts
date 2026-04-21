import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  subscribeWorkhubMilestones,
  createWorkhubMilestone,
  updateWorkhubMilestone,
  deleteWorkhubMilestone,
  updateWorkhubTask,
  type WorkhubMilestone,
  type WorkhubMilestoneStatus,
  type WorkhubTask,
} from '../../../lib/workhubRepo'

export interface MilestoneFormData {
  name: string
  description: string
  dueDate: string
  status: WorkhubMilestoneStatus
  color: string
}

export interface MilestoneProgress {
  total: number
  completed: number
  pct: number
}

interface UseWorkhubMilestonesParams {
  projectId: string | null
  workspaceId: string
  tasks: WorkhubTask[]
  currentUserUid: string
  showToast: (payload: { message: string; type?: 'success' | 'error' | 'info' | 'warning' }) => void
}

export function useWorkhubMilestones({
  projectId,
  workspaceId,
  tasks,
  currentUserUid,
  showToast,
}: UseWorkhubMilestonesParams) {
  const [milestones, setMilestones] = useState<WorkhubMilestone[]>([])
  const [milestoneDialogOpen, setMilestoneDialogOpen] = useState(false)
  const [editingMilestone, setEditingMilestone] = useState<WorkhubMilestone | null>(null)

  useEffect(() => {
    if (!projectId) {
      setMilestones([])
      return
    }
    const unsub = subscribeWorkhubMilestones(projectId, setMilestones)
    return unsub
  }, [projectId])

  // ── Derived ───────────────────────────────────────────────────────────────

  const milestoneProgress = useMemo<Record<string, MilestoneProgress>>(() => {
    const map: Record<string, MilestoneProgress> = {}
    milestones.forEach((ms) => {
      map[ms.id] = { total: 0, completed: 0, pct: 0 }
    })
    tasks.forEach((task) => {
      if (!task.milestoneId || !map[task.milestoneId]) return
      map[task.milestoneId].total += 1
      const statusLower = (task.status || '').toLowerCase()
      if (statusLower === 'completed' || statusLower === 'complete' || statusLower === 'done' || statusLower === 'closed') {
        map[task.milestoneId].completed += 1
      }
    })
    Object.keys(map).forEach((id) => {
      const entry = map[id]
      entry.pct = entry.total === 0 ? 0 : Math.round((entry.completed / entry.total) * 100)
    })
    return map
  }, [milestones, tasks])

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const upcomingMilestones = useMemo(() => {
    const sevenDaysFromNow = new Date(today)
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7)
    return milestones.filter((ms) => {
      if (ms.status === 'completed') return false
      if (!ms.dueDate) return false
      const due = new Date(ms.dueDate)
      return due >= today && due <= sevenDaysFromNow
    })
  }, [milestones]) // eslint-disable-line react-hooks/exhaustive-deps

  const atRiskMilestones = useMemo(() => {
    const threeDaysFromNow = new Date(today)
    threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)
    return milestones.filter((ms) => {
      if (ms.status === 'completed') return false
      if (!ms.dueDate) return false
      const due = new Date(ms.dueDate)
      const progress = milestoneProgress[ms.id]
      const isDueSoon = due <= threeDaysFromNow
      const isLowProgress = !progress || progress.pct < 50
      return isDueSoon && isLowProgress
    })
  }, [milestones, milestoneProgress]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleOpenCreateMilestone = useCallback(() => {
    setEditingMilestone(null)
    setMilestoneDialogOpen(true)
  }, [])

  const handleOpenEditMilestone = useCallback((milestone: WorkhubMilestone) => {
    setEditingMilestone(milestone)
    setMilestoneDialogOpen(true)
  }, [])

  const handleCloseMilestoneDialog = useCallback(() => {
    setMilestoneDialogOpen(false)
    setEditingMilestone(null)
  }, [])

  const handleSaveMilestone = useCallback(async (formData: MilestoneFormData) => {
    if (!projectId || !currentUserUid) return
    try {
      if (editingMilestone) {
        await updateWorkhubMilestone(editingMilestone.id, {
          name: formData.name.trim(),
          description: formData.description.trim(),
          dueDate: formData.dueDate,
          status: formData.status,
          color: formData.color,
        })
        showToast({ message: 'Milestone updated', type: 'success' })
      } else {
        const nextSortOrder = milestones.length > 0
          ? Math.max(...milestones.map((ms) => ms.sortOrder ?? 0)) + 1
          : 0
        await createWorkhubMilestone({
          workspaceId,
          projectId,
          name: formData.name.trim(),
          description: formData.description.trim(),
          dueDate: formData.dueDate,
          status: formData.status,
          color: formData.color,
          sortOrder: nextSortOrder,
          createdBy: currentUserUid,
        })
        showToast({ message: 'Milestone created', type: 'success' })
      }
      setMilestoneDialogOpen(false)
      setEditingMilestone(null)
    } catch {
      showToast({ message: 'Failed to save milestone', type: 'error' })
    }
  }, [projectId, workspaceId, currentUserUid, editingMilestone, milestones, showToast])

  const handleDeleteMilestone = useCallback(async (milestoneId: string) => {
    try {
      await deleteWorkhubMilestone(milestoneId)
      // Clear milestoneId from any tasks linked to this milestone
      const linkedTasks = tasks.filter((t) => t.milestoneId === milestoneId)
      await Promise.all(linkedTasks.map((t) => updateWorkhubTask(t.id, { milestoneId: null })))
      showToast({ message: 'Milestone deleted', type: 'success' })
    } catch {
      showToast({ message: 'Failed to delete milestone', type: 'error' })
    }
  }, [tasks, showToast])

  const handleLinkTaskToMilestone = useCallback(async (taskId: string, milestoneId: string | null) => {
    try {
      await updateWorkhubTask(taskId, { milestoneId })
    } catch {
      showToast({ message: 'Failed to update task milestone', type: 'error' })
    }
  }, [showToast])

  const handleStatusChange = useCallback(async (milestoneId: string, newStatus: WorkhubMilestoneStatus) => {
    try {
      await updateWorkhubMilestone(milestoneId, { status: newStatus })
    } catch {
      showToast({ message: 'Failed to update milestone status', type: 'error' })
    }
  }, [showToast])

  return {
    milestones,
    milestoneDialogOpen,
    editingMilestone,
    milestoneProgress,
    upcomingMilestones,
    atRiskMilestones,
    handleOpenCreateMilestone,
    handleOpenEditMilestone,
    handleCloseMilestoneDialog,
    handleSaveMilestone,
    handleDeleteMilestone,
    handleLinkTaskToMilestone,
    handleStatusChange,
  }
}
