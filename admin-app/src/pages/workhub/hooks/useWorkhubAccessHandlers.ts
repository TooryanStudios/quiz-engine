import {
  useCallback,
  type Dispatch,
  type SetStateAction,
} from 'react'
import {
  createWorkhubNotifications,
  setWorkhubMemberStatus,
  updateWorkhubWorkspace,
  type WorkhubWorkspace,
} from '../../../lib/workhubRepo'
import type {
  WorkhubUserAccessDraft,
  WorkhubUserAccessMode,
} from '../accessTypes'
import { normalizeInviteEmails, normalizeMemberUids } from '../projectUtils'

interface UseWorkhubAccessHandlersParams {
  selectedWorkspaceSettings: WorkhubWorkspace | null
  workspaceAccessMemberUids: string[]
  setWorkspaceAccessMemberUids: Dispatch<SetStateAction<string[]>>
  workspaceInviteEmails: string[]
  setWorkspaceInviteEmails: Dispatch<SetStateAction<string[]>>
  workspaceInviteEmailDraft: string
  setWorkspaceInviteEmailDraft: Dispatch<SetStateAction<string>>
  workspaceMemberAccessLevels: Record<string, 'full' | 'custom'>
  setWorkspaceMemberAccessLevels: Dispatch<SetStateAction<Record<string, 'full' | 'custom'>>>
  workspaces: WorkhubWorkspace[]
  userAccessSourceByUid: Record<string, WorkhubUserAccessDraft>
  userAccessDraftByUid: Record<string, WorkhubUserAccessDraft>
  setUserAccessDraftByUid: Dispatch<SetStateAction<Record<string, WorkhubUserAccessDraft>>>
  userAccessDraftDirtyByUid: Record<string, boolean>
  currentUserUid: string
  setBusyKey: Dispatch<SetStateAction<string>>
  showToast: (payload: { message: string; type?: 'success' | 'error' | 'info' | 'warning'; durationMs?: number }) => void
}

export function useWorkhubAccessHandlers({
  selectedWorkspaceSettings,
  workspaceAccessMemberUids,
  setWorkspaceAccessMemberUids,
  workspaceInviteEmails,
  setWorkspaceInviteEmails,
  workspaceInviteEmailDraft,
  setWorkspaceInviteEmailDraft,
  workspaceMemberAccessLevels,
  setWorkspaceMemberAccessLevels,
  workspaces,
  userAccessSourceByUid,
  userAccessDraftByUid,
  setUserAccessDraftByUid,
  userAccessDraftDirtyByUid,
  currentUserUid,
  setBusyKey,
  showToast,
}: UseWorkhubAccessHandlersParams) {
  const updateUserAccessDraft = useCallback((uid: string, updater: (draft: WorkhubUserAccessDraft) => WorkhubUserAccessDraft) => {
    setUserAccessDraftByUid((current) => {
      const source = userAccessSourceByUid[uid] || { mode: 'workspace_based' as WorkhubUserAccessMode, workspaceById: {} }
      const base = current[uid] || source
      const next = updater({
        mode: base.mode,
        workspaceById: Object.fromEntries(Object.entries(base.workspaceById).map(([workspaceId, entry]) => [workspaceId, { ...entry }])),
      })
      return { ...current, [uid]: next }
    })
  }, [setUserAccessDraftByUid, userAccessSourceByUid])

  const handleSetUserAccessModeDraft = useCallback((uid: string, mode: WorkhubUserAccessMode) => {
    updateUserAccessDraft(uid, (draft) => {
      const nextWorkspaceById = Object.fromEntries(Object.entries(draft.workspaceById).map(([workspaceId, entry]) => [workspaceId, { ...entry }]))
      if (mode === 'full') {
        Object.keys(nextWorkspaceById).forEach((workspaceId) => {
          nextWorkspaceById[workspaceId] = { enabled: true, level: 'full' }
        })
      } else {
        Object.keys(nextWorkspaceById).forEach((workspaceId) => {
          nextWorkspaceById[workspaceId] = { enabled: false, level: 'custom' }
        })
      }
      return {
        mode,
        workspaceById: nextWorkspaceById,
      }
    })
  }, [updateUserAccessDraft])

  const handleToggleUserWorkspaceDraft = useCallback((uid: string, workspaceId: string, checked: boolean) => {
    updateUserAccessDraft(uid, (draft) => {
      const currentEntry = draft.workspaceById[workspaceId] || { enabled: false, level: 'custom' as const }
      return {
        ...draft,
        workspaceById: {
          ...draft.workspaceById,
          [workspaceId]: {
            enabled: checked,
            level: checked ? currentEntry.level : 'custom',
          },
        },
      }
    })
  }, [updateUserAccessDraft])

  const handleSetUserWorkspaceLevelDraft = useCallback((uid: string, workspaceId: string, level: 'full' | 'custom') => {
    updateUserAccessDraft(uid, (draft) => {
      return {
        ...draft,
        workspaceById: {
          ...draft.workspaceById,
          [workspaceId]: {
            enabled: true,
            level,
          },
        },
      }
    })
  }, [updateUserAccessDraft])

  const handleDiscardUserAccessDraft = useCallback((uid: string) => {
    setUserAccessDraftByUid((current) => {
      if (!current[uid]) return current
      const next = { ...current }
      delete next[uid]
      return next
    })
  }, [setUserAccessDraftByUid])

  const handleSaveUserAccessDraft = useCallback(async (uid: string) => {
    const draft = userAccessDraftByUid[uid]
    if (!draft || !userAccessDraftDirtyByUid[uid]) return
    setBusyKey(`user-access-save:${uid}`)
    try {
      await Promise.all(workspaces.map(async (workspace) => {
        const currentUids = normalizeMemberUids(workspace.accessMemberUids || [])
        const currentLevels = { ...(workspace.memberAccessLevels || {}) } as Record<string, 'full' | 'custom'>
        const hasCurrentAccess = currentUids.includes(uid)
        const workspaceDraft = draft.workspaceById[workspace.id] || { enabled: false, level: 'custom' as const }

        let shouldHaveAccess = workspaceDraft.enabled
        let level: 'full' | 'custom' = workspaceDraft.level
        if (draft.mode === 'full') {
          shouldHaveAccess = true
          level = 'full'
        }

        const nextUids = shouldHaveAccess
          ? (hasCurrentAccess ? currentUids : normalizeMemberUids([...currentUids, uid]))
          : currentUids.filter((itemUid) => itemUid !== uid)
        const nextLevels = { ...currentLevels }
        if (shouldHaveAccess) {
          nextLevels[uid] = level
        } else {
          delete nextLevels[uid]
        }

        const accessChanged = nextUids.length !== currentUids.length || nextUids.some((itemUid, index) => itemUid !== currentUids[index])
        const levelChanged = (currentLevels[uid] || null) !== (nextLevels[uid] || null)
        if (!accessChanged && !levelChanged) return

        await updateWorkhubWorkspace(workspace.id, {
          accessMemberUids: nextUids,
          memberAccessLevels: nextLevels,
        })
      }))

      setUserAccessDraftByUid((current) => {
        const next = { ...current }
        delete next[uid]
        return next
      })
      showToast({ type: 'success', message: 'User access settings saved.' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not save user access settings.'
      showToast({ type: 'error', message })
    } finally {
      setBusyKey('')
    }
  }, [
    setBusyKey,
    setUserAccessDraftByUid,
    showToast,
    userAccessDraftByUid,
    userAccessDraftDirtyByUid,
    workspaces,
  ])

  const handleWorkspaceAccessToggle = useCallback(async (uid: string, checked: boolean) => {
    if (!selectedWorkspaceSettings) return
    const previousUids = workspaceAccessMemberUids
    const nextUids = checked
      ? normalizeMemberUids([...workspaceAccessMemberUids, uid])
      : workspaceAccessMemberUids.filter((item) => item !== uid)
    setWorkspaceAccessMemberUids(nextUids)
    setBusyKey(`workspace-access:${selectedWorkspaceSettings.id}:${uid}`)
    try {
      await updateWorkhubWorkspace(selectedWorkspaceSettings.id, {
        accessMemberUids: nextUids,
        invitedEmails: normalizeInviteEmails(workspaceInviteEmails),
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not update access.'
      showToast({ type: 'error', message })
      setWorkspaceAccessMemberUids(previousUids)
    } finally {
      setBusyKey('')
    }
  }, [
    selectedWorkspaceSettings,
    setBusyKey,
    setWorkspaceAccessMemberUids,
    showToast,
    workspaceAccessMemberUids,
    workspaceInviteEmails,
  ])

  const handleToggleUserWorkspace = useCallback(async (uid: string, workspaceId: string, checked: boolean) => {
    const targetWorkspace = workspaces.find((workspace) => workspace.id === workspaceId)
    if (!targetWorkspace) return
    const current = normalizeMemberUids(targetWorkspace.accessMemberUids || [])
    const currentAccessLevels = { ...(targetWorkspace.memberAccessLevels || {}) } as Record<string, 'full' | 'custom'>
    const next = checked
      ? normalizeMemberUids([...current, uid])
      : current.filter((item) => item !== uid)
    const nextAccessLevels = { ...currentAccessLevels }
    if (!checked) {
      delete nextAccessLevels[uid]
    } else if (!nextAccessLevels[uid]) {
      nextAccessLevels[uid] = 'custom'
    }
    setBusyKey(`user-workspace:${workspaceId}:${uid}`)
    try {
      await updateWorkhubWorkspace(workspaceId, {
        accessMemberUids: next,
        memberAccessLevels: nextAccessLevels,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not update workspace access.'
      showToast({ type: 'error', message })
    } finally {
      setBusyKey('')
    }
  }, [setBusyKey, showToast, workspaces])

  const handleWorkspaceInviteAdd = useCallback(() => {
    const next = workspaceInviteEmailDraft.trim().toLowerCase()
    if (!next || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next)) {
      showToast({ type: 'error', message: 'Enter a valid invite email.' })
      return
    }
    setWorkspaceInviteEmails((current) => normalizeInviteEmails([...current, next]))
    setWorkspaceInviteEmailDraft('')
  }, [setWorkspaceInviteEmailDraft, setWorkspaceInviteEmails, showToast, workspaceInviteEmailDraft])

  const handleWorkspaceInviteRemove = useCallback((email: string) => {
    setWorkspaceInviteEmails((current) => current.filter((item) => item !== email))
  }, [setWorkspaceInviteEmails])

  const handleApproveRequestGlobal = useCallback(async (targetUid: string) => {
    setBusyKey(`member-request:${targetUid}`)
    try {
      await setWorkhubMemberStatus({ uid: targetUid, status: 'approved', role: 'member' })
      showToast({ type: 'success', message: 'User approved. Assign workspace access from Manage access.' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not approve request.'
      showToast({ type: 'error', message })
    } finally {
      setBusyKey('')
    }
  }, [setBusyKey, showToast])

  const handleRejectRequestGlobal = useCallback(async (targetUid: string) => {
    setBusyKey(`member-request:${targetUid}`)
    try {
      await setWorkhubMemberStatus({ uid: targetUid, status: 'suspended', role: 'member' })
      showToast({ type: 'success', message: 'Access request declined.' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not decline request.'
      showToast({ type: 'error', message })
    } finally {
      setBusyKey('')
    }
  }, [setBusyKey, showToast])

  const handleApproveRequestForWorkspace = useCallback(async (targetUid: string) => {
    if (!currentUserUid || !selectedWorkspaceSettings) return
    setBusyKey(`workspace-request:${selectedWorkspaceSettings.id}:${targetUid}`)
    try {
      await setWorkhubMemberStatus({ uid: targetUid, status: 'approved', role: 'member' })
      const nextAccessUids = normalizeMemberUids([...workspaceAccessMemberUids, targetUid])
      setWorkspaceAccessMemberUids(nextAccessUids)
      await updateWorkhubWorkspace(selectedWorkspaceSettings.id, {
        accessMemberUids: nextAccessUids,
        invitedEmails: normalizeInviteEmails(workspaceInviteEmails),
      })
      await createWorkhubNotifications({
        workspaceId: selectedWorkspaceSettings.id,
        actorUid: currentUserUid,
        recipientUids: [targetUid],
        entityType: 'workspace',
        entityId: selectedWorkspaceSettings.id,
        action: 'approved',
        message: `you were granted access to workspace "${selectedWorkspaceSettings.name}"`,
      })
      showToast({ type: 'success', message: 'Request approved and workspace access granted.' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not approve request for this workspace.'
      showToast({ type: 'error', message })
    } finally {
      setBusyKey('')
    }
  }, [
    currentUserUid,
    selectedWorkspaceSettings,
    setBusyKey,
    setWorkspaceAccessMemberUids,
    showToast,
    workspaceAccessMemberUids,
    workspaceInviteEmails,
  ])

  const handleRejectRequestForWorkspace = useCallback(async (targetUid: string) => {
    if (!currentUserUid || !selectedWorkspaceSettings) return
    setBusyKey(`workspace-request:${selectedWorkspaceSettings.id}:${targetUid}`)
    try {
      await setWorkhubMemberStatus({ uid: targetUid, status: 'suspended', role: 'member' })
      showToast({ type: 'success', message: 'Access request declined.' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not decline request.'
      showToast({ type: 'error', message })
    } finally {
      setBusyKey('')
    }
  }, [currentUserUid, selectedWorkspaceSettings, setBusyKey, showToast])

  const handleMemberAccessLevelChange = useCallback(async (uid: string, level: 'full' | 'custom') => {
    if (!selectedWorkspaceSettings) return
    const previousLevels = workspaceMemberAccessLevels
    const next = { ...workspaceMemberAccessLevels, [uid]: level }
    setWorkspaceMemberAccessLevels(next)
    try {
      await updateWorkhubWorkspace(selectedWorkspaceSettings.id, { memberAccessLevels: next })
    } catch (error) {
      setWorkspaceMemberAccessLevels(previousLevels)
      const message = error instanceof Error ? error.message : 'Could not update access level.'
      showToast({ type: 'error', message })
    }
  }, [
    selectedWorkspaceSettings,
    setWorkspaceMemberAccessLevels,
    showToast,
    workspaceMemberAccessLevels,
  ])

  return {
    handleWorkspaceAccessToggle,
    handleToggleUserWorkspace,
    handleSetUserAccessModeDraft,
    handleToggleUserWorkspaceDraft,
    handleSetUserWorkspaceLevelDraft,
    handleDiscardUserAccessDraft,
    handleSaveUserAccessDraft,
    handleWorkspaceInviteAdd,
    handleWorkspaceInviteRemove,
    handleApproveRequestGlobal,
    handleRejectRequestGlobal,
    handleApproveRequestForWorkspace,
    handleRejectRequestForWorkspace,
    handleMemberAccessLevelChange,
  }
}
