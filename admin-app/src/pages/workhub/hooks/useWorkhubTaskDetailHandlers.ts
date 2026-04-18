import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import {
  useCallback,
  type Dispatch,
  type SetStateAction,
} from 'react'
import { storage } from '../../../lib/firebase'
import {
  deleteWorkhubAttachmentFromDrive,
  ensureWorkhubDriveProjectFolder,
  uploadWorkhubAttachmentToDrive,
  type WorkhubProject,
  type WorkhubTask,
  type WorkhubTaskChecklistItem,
} from '../../../lib/workhubRepo'
import { buildChecklist, deriveLinkTitle, getTaskAttachments, getTaskLinks } from '../taskDataUtils'
import { normalizeTaskTitle } from '../taskUtils'

type AttachmentDeletePrompt = {
  task: WorkhubTask
  attachment: string
  isDriveFile: boolean
} | null

interface UseWorkhubTaskDetailHandlersParams {
  visibleWorkspaceProjects: WorkhubProject[]
  taskChecklistDrafts: Record<string, string>
  setTaskChecklistDrafts: Dispatch<SetStateAction<Record<string, string>>>
  taskAttachmentDrafts: Record<string, string>
  setTaskAttachmentDrafts: Dispatch<SetStateAction<Record<string, string>>>
  taskAttachmentTitleDrafts: Record<string, string>
  setTaskAttachmentTitleDrafts: Dispatch<SetStateAction<Record<string, string>>>
  taskLinkDrafts: Record<string, string>
  setTaskLinkDrafts: Dispatch<SetStateAction<Record<string, string>>>
  taskLinkTitleDrafts: Record<string, string>
  setTaskLinkTitleDrafts: Dispatch<SetStateAction<Record<string, string>>>
  taskLinkEditingDrafts: Record<string, string>
  setTaskLinkEditingDrafts: Dispatch<SetStateAction<Record<string, string>>>
  checklistDetailsDrafts: Record<string, string>
  checklistAttachmentDrafts: Record<string, string>
  setChecklistAttachmentDrafts: Dispatch<SetStateAction<Record<string, string>>>
  checklistLinkDrafts: Record<string, string>
  setChecklistLinkDrafts: Dispatch<SetStateAction<Record<string, string>>>
  setExpandedChecklistDetailKeys: Dispatch<SetStateAction<string[]>>
  editingChecklistItemText: string
  setEditingChecklistTaskId: Dispatch<SetStateAction<string | null>>
  setEditingChecklistItemId: Dispatch<SetStateAction<string | null>>
  setEditingChecklistScope: Dispatch<SetStateAction<'inline' | 'details' | null>>
  setEditingChecklistItemText: Dispatch<SetStateAction<string>>
  setUploadingTaskAttachmentId: Dispatch<SetStateAction<string>>
  setUploadingChecklistAttachmentKey: Dispatch<SetStateAction<string>>
  attachmentDeletePrompt: AttachmentDeletePrompt
  setAttachmentDeletePrompt: Dispatch<SetStateAction<AttachmentDeletePrompt>>
  currentUserUid: string
  handleTaskUpdate: (task: WorkhubTask, updates: Partial<WorkhubTask>, options?: { silent?: boolean }) => Promise<void>
  showToast: (payload: { message: string; type?: 'success' | 'error' | 'info' | 'warning'; durationMs?: number }) => void
}

export function useWorkhubTaskDetailHandlers({
  visibleWorkspaceProjects,
  taskChecklistDrafts,
  setTaskChecklistDrafts,
  taskAttachmentDrafts,
  setTaskAttachmentDrafts,
  taskAttachmentTitleDrafts,
  setTaskAttachmentTitleDrafts,
  taskLinkDrafts,
  setTaskLinkDrafts,
  taskLinkTitleDrafts,
  setTaskLinkTitleDrafts,
  taskLinkEditingDrafts,
  setTaskLinkEditingDrafts,
  checklistDetailsDrafts,
  checklistAttachmentDrafts,
  setChecklistAttachmentDrafts,
  checklistLinkDrafts,
  setChecklistLinkDrafts,
  setExpandedChecklistDetailKeys,
  editingChecklistItemText,
  setEditingChecklistTaskId,
  setEditingChecklistItemId,
  setEditingChecklistScope,
  setEditingChecklistItemText,
  setUploadingTaskAttachmentId,
  setUploadingChecklistAttachmentKey,
  attachmentDeletePrompt,
  setAttachmentDeletePrompt,
  currentUserUid,
  handleTaskUpdate,
  showToast,
}: UseWorkhubTaskDetailHandlersParams) {
  const getChecklistDetailKey = useCallback((taskId: string, itemId: string) => `${taskId}:${itemId}`, [])

  const toggleChecklistItemDetails = useCallback((taskId: string, itemId: string) => {
    const detailKey = getChecklistDetailKey(taskId, itemId)
    setExpandedChecklistDetailKeys((current) => current.includes(detailKey)
      ? current.filter((item) => item !== detailKey)
      : [...current, detailKey])
  }, [getChecklistDetailKey, setExpandedChecklistDetailKeys])

  const updateChecklistItem = useCallback((
    task: WorkhubTask,
    itemId: string,
    updateFn: (item: WorkhubTaskChecklistItem) => WorkhubTaskChecklistItem,
  ) => {
    const nextChecklist = buildChecklist(task).map((item) => item.id === itemId ? updateFn(item) : item)
    void handleTaskUpdate(task, { checklist: nextChecklist }, { silent: true })
  }, [handleTaskUpdate])

  const handleChecklistItemToggle = useCallback((task: WorkhubTask, itemId: string, checked: boolean) => {
    updateChecklistItem(task, itemId, (item) => ({ ...item, completed: checked }))
  }, [updateChecklistItem])

  const handleChecklistRemove = useCallback((task: WorkhubTask, itemId: string) => {
    const nextChecklist = buildChecklist(task).filter((item) => item.id !== itemId)
    void handleTaskUpdate(task, { checklist: nextChecklist }, { silent: true })
  }, [handleTaskUpdate])

  const handleChecklistAdd = useCallback((task: WorkhubTask) => {
    const draft = (taskChecklistDrafts[task.id] || '').trim()
    if (!draft) return
    const nextChecklist: WorkhubTaskChecklistItem[] = [
      ...buildChecklist(task),
      {
        id: `chk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        text: draft,
        completed: false,
      },
    ]
    setTaskChecklistDrafts((current) => ({ ...current, [task.id]: '' }))
    void handleTaskUpdate(task, { checklist: nextChecklist }, { silent: true })
  }, [handleTaskUpdate, setTaskChecklistDrafts, taskChecklistDrafts])

  const handleChecklistItemEditStart = useCallback((
    taskId: string,
    itemId: string,
    currentText: string,
    scope: 'inline' | 'details',
  ) => {
    setEditingChecklistTaskId(taskId)
    setEditingChecklistItemId(itemId)
    setEditingChecklistScope(scope)
    setEditingChecklistItemText(currentText)
  }, [setEditingChecklistItemId, setEditingChecklistItemText, setEditingChecklistScope, setEditingChecklistTaskId])

  const handleChecklistItemEditSave = useCallback((task: WorkhubTask, itemId: string) => {
    const newText = editingChecklistItemText.trim()
    if (!newText) {
      setEditingChecklistTaskId(null)
      setEditingChecklistItemId(null)
      setEditingChecklistScope(null)
      setEditingChecklistItemText('')
      return
    }
    const nextChecklist = buildChecklist(task).map((item) => item.id === itemId ? { ...item, text: newText } : item)
    setEditingChecklistTaskId(null)
    setEditingChecklistItemId(null)
    setEditingChecklistScope(null)
    setEditingChecklistItemText('')
    void handleTaskUpdate(task, { checklist: nextChecklist }, { silent: true })
  }, [editingChecklistItemText, handleTaskUpdate, setEditingChecklistItemId, setEditingChecklistItemText, setEditingChecklistScope, setEditingChecklistTaskId])

  const handleChecklistItemDetailsSave = useCallback((task: WorkhubTask, itemId: string) => {
    const detailKey = getChecklistDetailKey(task.id, itemId)
    const details = (checklistDetailsDrafts[detailKey] || '').trim()
    updateChecklistItem(task, itemId, (item) => ({ ...item, details }))
  }, [checklistDetailsDrafts, getChecklistDetailKey, updateChecklistItem])

  const handleChecklistAttachmentAdd = useCallback((task: WorkhubTask, itemId: string) => {
    const detailKey = getChecklistDetailKey(task.id, itemId)
    const nextUrl = (checklistAttachmentDrafts[detailKey] || '').trim()
    if (!nextUrl) return
    updateChecklistItem(task, itemId, (item) => ({ ...item, attachments: [...(item.attachments || []), nextUrl] }))
    setChecklistAttachmentDrafts((current) => ({ ...current, [detailKey]: '' }))
  }, [checklistAttachmentDrafts, getChecklistDetailKey, setChecklistAttachmentDrafts, updateChecklistItem])

  const handleChecklistAttachmentRemove = useCallback((task: WorkhubTask, itemId: string, attachment: string) => {
    updateChecklistItem(task, itemId, (item) => ({ ...item, attachments: (item.attachments || []).filter((url) => url !== attachment) }))
  }, [updateChecklistItem])

  const fileToBase64 = useCallback(async (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => {
        const result = typeof reader.result === 'string' ? reader.result : ''
        const base64 = result.includes(',') ? result.split(',')[1] : result
        if (!base64) {
          reject(new Error('Could not read file data.'))
          return
        }
        resolve(base64)
      }
      reader.onerror = () => reject(new Error('Could not read file data.'))
      reader.readAsDataURL(file)
    })
  }, [])

  const resolveProjectDriveFolderId = useCallback(async (project: WorkhubProject): Promise<string | undefined> => {
    try {
      const result = await ensureWorkhubDriveProjectFolder({ projectId: project.id, projectName: project.name })
      return result.folderId
    } catch {
      return undefined
    }
  }, [])

  const uploadWorkhubAttachment = useCallback(async (file: File, project: WorkhubProject) => {
    const isDrive = project.storageMethod === 'drive'

    if (isDrive) {
      const MAX_BYTES = 7 * 1024 * 1024
      if (file.size > MAX_BYTES) {
        throw new Error(`File ${file.name} exceeds 7 MB limit for Drive upload.`)
      }
      const dataBase64 = await fileToBase64(file)
      const parentFolderId = await resolveProjectDriveFolderId(project)
      const result = await uploadWorkhubAttachmentToDrive({
        fileName: file.name,
        contentType: file.type || 'application/octet-stream',
        dataBase64,
        parentFolderId,
      })
      return result.url
    }

    const extension = file.name.split('.').pop() || 'bin'
    const isImage = file.type.startsWith('image/')
    const isVideo = file.type.startsWith('video/')
    const subfolder = isImage ? 'images' : (isVideo ? 'videos' : 'docs')

    const storagePath = `workhub-attachments/${project.workspaceId}/${project.id}/${subfolder}/${crypto.randomUUID()}.${extension}`
    const storageRef = ref(storage, storagePath)

    await uploadBytes(storageRef, file, { contentType: file.type || 'application/octet-stream' })
    return await getDownloadURL(storageRef)
  }, [fileToBase64, resolveProjectDriveFolderId])

  const handleTaskAttachmentFileUpload = useCallback(async (task: WorkhubTask, files: File[]) => {
    if (files.length === 0) return
    const project = visibleWorkspaceProjects.find((item) => item.id === task.projectId)
    if (!project) return
    setUploadingTaskAttachmentId(task.id)
    try {
      const uploadedUrls = await Promise.all(files.map((file) => uploadWorkhubAttachment(file, project)))
      const nextAttachments = [...getTaskAttachments(task), ...uploadedUrls]
      const nextAttachmentTitles: Record<string, string> = {
        ...(task.attachmentTitles || {}),
      }
      uploadedUrls.forEach((url, index) => {
        const fileName = files[index]?.name?.trim()
        if (fileName) {
          nextAttachmentTitles[url] = fileName
        }
      })
      await handleTaskUpdate(task, {
        attachments: nextAttachments,
        attachmentTitles: nextAttachmentTitles,
      }, { silent: true })
      showToast({ type: 'success', message: uploadedUrls.length > 1 ? `${uploadedUrls.length} attachments uploaded.` : 'Attachment uploaded.' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not upload attachment.'
      showToast({ type: 'error', message })
    } finally {
      setUploadingTaskAttachmentId('')
    }
  }, [handleTaskUpdate, setUploadingTaskAttachmentId, showToast, uploadWorkhubAttachment, visibleWorkspaceProjects])

  const handleChecklistAttachmentFileUpload = useCallback(async (task: WorkhubTask, itemId: string, files: File[]) => {
    if (files.length === 0) return
    const project = visibleWorkspaceProjects.find((item) => item.id === task.projectId)
    if (!project) return
    const key = getChecklistDetailKey(task.id, itemId)
    setUploadingChecklistAttachmentKey(key)
    try {
      const uploadedUrls = await Promise.all(files.map((file) => uploadWorkhubAttachment(file, project)))
      const nextChecklist = buildChecklist(task).map((item) => item.id === itemId
        ? { ...item, attachments: [...(item.attachments || []), ...uploadedUrls] }
        : item)
      await handleTaskUpdate(task, { checklist: nextChecklist }, { silent: true })
      showToast({ type: 'success', message: uploadedUrls.length > 1 ? `${uploadedUrls.length} checklist attachments uploaded.` : 'Checklist attachment uploaded.' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not upload checklist attachment.'
      showToast({ type: 'error', message })
    } finally {
      setUploadingChecklistAttachmentKey('')
    }
  }, [getChecklistDetailKey, handleTaskUpdate, setUploadingChecklistAttachmentKey, showToast, uploadWorkhubAttachment, visibleWorkspaceProjects])

  const handleChecklistLinkAdd = useCallback((task: WorkhubTask, itemId: string) => {
    const detailKey = getChecklistDetailKey(task.id, itemId)
    const nextLink = (checklistLinkDrafts[detailKey] || '').trim()
    if (!nextLink) return
    updateChecklistItem(task, itemId, (item) => ({ ...item, links: [...(item.links || []), nextLink] }))
    setChecklistLinkDrafts((current) => ({ ...current, [detailKey]: '' }))
  }, [checklistLinkDrafts, getChecklistDetailKey, setChecklistLinkDrafts, updateChecklistItem])

  const handleChecklistLinkRemove = useCallback((task: WorkhubTask, itemId: string, link: string) => {
    updateChecklistItem(task, itemId, (item) => ({ ...item, links: (item.links || []).filter((value) => value !== link) }))
  }, [updateChecklistItem])

  const handleTaskAttachmentAdd = useCallback((task: WorkhubTask) => {
    const nextUrl = (taskAttachmentDrafts[task.id] || '').trim()
    if (!nextUrl) return
    const nextTitle = (taskAttachmentTitleDrafts[task.id] || '').trim()
    const nextAttachments = [...getTaskAttachments(task), nextUrl]
    const nextAttachmentTitles: Record<string, string> = {
      ...(task.attachmentTitles || {}),
      [nextUrl]: nextTitle || 'Attachment',
    }
    setTaskAttachmentTitleDrafts((current) => ({ ...current, [task.id]: '' }))
    setTaskAttachmentDrafts((current) => ({ ...current, [task.id]: '' }))
    void handleTaskUpdate(task, {
      attachments: nextAttachments,
      attachmentTitles: nextAttachmentTitles,
    }, { silent: true })
  }, [handleTaskUpdate, setTaskAttachmentDrafts, setTaskAttachmentTitleDrafts, taskAttachmentDrafts, taskAttachmentTitleDrafts])

  const handleTaskAttachmentRemove = useCallback((task: WorkhubTask, attachment: string) => {
    const isDriveFile = attachment.includes('drive.google.com/thumbnail?id=')
    setAttachmentDeletePrompt({ task, attachment, isDriveFile })
  }, [setAttachmentDeletePrompt])

  const confirmAttachmentRemoval = useCallback((mode: 'delete_permanently' | 'remove_only' | 'cancel') => {
    if (!attachmentDeletePrompt) return
    const { task, attachment } = attachmentDeletePrompt

    if (mode === 'cancel') {
      setAttachmentDeletePrompt(null)
      return
    }

    if (mode === 'delete_permanently') {
      const match = attachment.match(/id=([^&]+)/)
      if (match && match[1]) {
        deleteWorkhubAttachmentFromDrive(match[1]).catch((error) => {
          console.error('Failed to delete permanently from Drive:', error)
          showToast({ type: 'error', message: 'Failed to permanently delete from Drive.' })
        })
      }
    }

    const nextAttachments = getTaskAttachments(task).filter((url) => url !== attachment)
    const nextAttachmentTitles = { ...(task.attachmentTitles || {}) }
    delete nextAttachmentTitles[attachment]
    void handleTaskUpdate(task, {
      attachments: nextAttachments,
      attachmentTitles: Object.keys(nextAttachmentTitles).length > 0 ? nextAttachmentTitles : {},
    }, { silent: true })
    setAttachmentDeletePrompt(null)
  }, [attachmentDeletePrompt, handleTaskUpdate, setAttachmentDeletePrompt, showToast])

  const handleSelectedTaskDescriptionSave = useCallback((task: WorkhubTask, descriptionDraft: string) => {
    const nextDescription = descriptionDraft.trim()
    if (nextDescription === (task.description || '')) return
    void handleTaskUpdate(task, { description: nextDescription }, { silent: true })
  }, [handleTaskUpdate])

  const handleSelectedTaskTitleSave = useCallback((task: WorkhubTask, titleDraft: string) => {
    const nextTitle = normalizeTaskTitle(titleDraft.replace(/\r\n/g, '\n'))
    if (!nextTitle) return
    if (nextTitle === normalizeTaskTitle((task.title || '').replace(/\r\n/g, '\n'))) return
    void handleTaskUpdate(task, { title: nextTitle }, { silent: true })
  }, [handleTaskUpdate])

  const handleTaskLinkEditStart = useCallback((task: WorkhubTask, link: string) => {
    setTaskLinkDrafts((current) => ({ ...current, [task.id]: link }))
    setTaskLinkTitleDrafts((current) => ({
      ...current,
      [task.id]: task.linkTitles?.[link] || '',
    }))
    setTaskLinkEditingDrafts((current) => ({ ...current, [task.id]: link }))
  }, [setTaskLinkDrafts, setTaskLinkEditingDrafts, setTaskLinkTitleDrafts])

  const handleTaskLinkEditCancel = useCallback((taskId: string) => {
    setTaskLinkDrafts((current) => ({ ...current, [taskId]: '' }))
    setTaskLinkTitleDrafts((current) => ({ ...current, [taskId]: '' }))
    setTaskLinkEditingDrafts((current) => ({ ...current, [taskId]: '' }))
  }, [setTaskLinkDrafts, setTaskLinkEditingDrafts, setTaskLinkTitleDrafts])

  const handleTaskLinkAdd = useCallback((task: WorkhubTask) => {
    const nextLink = (taskLinkDrafts[task.id] || '').trim()
    if (!nextLink) return

    const editingLink = (taskLinkEditingDrafts[task.id] || '').trim()
    const nextTitle = (taskLinkTitleDrafts[task.id] || '').trim() || deriveLinkTitle(nextLink)
    const existingLinks = getTaskLinks(task)
    const nextLinks = Array.from(new Set(
      (editingLink
        ? existingLinks.map((value) => value === editingLink ? nextLink : value)
        : [...existingLinks, nextLink])
        .filter(Boolean),
    ))
    const nextLinkTitles: Record<string, string> = {
      ...(task.linkTitles || {}),
      [nextLink]: nextTitle,
    }
    const nextLinkCreatedBy: Record<string, string> = {
      ...(task.linkCreatedBy || {}),
    }

    if (editingLink && editingLink !== nextLink) {
      const previousCreatorUid = nextLinkCreatedBy[editingLink]
      delete nextLinkTitles[editingLink]
      delete nextLinkCreatedBy[editingLink]
      if (previousCreatorUid && !nextLinkCreatedBy[nextLink]) {
        nextLinkCreatedBy[nextLink] = previousCreatorUid
      }
    }

    if (!nextLinkCreatedBy[nextLink]) {
      nextLinkCreatedBy[nextLink] = currentUserUid || task.createdBy
    }

    setTaskLinkDrafts((current) => ({ ...current, [task.id]: '' }))
    setTaskLinkTitleDrafts((current) => ({ ...current, [task.id]: '' }))
    setTaskLinkEditingDrafts((current) => ({ ...current, [task.id]: '' }))
    void handleTaskUpdate(task, {
      links: nextLinks,
      linkTitles: Object.keys(nextLinkTitles).length > 0 ? nextLinkTitles : {},
      linkCreatedBy: Object.keys(nextLinkCreatedBy).length > 0 ? nextLinkCreatedBy : {},
    }, { silent: true })
  }, [currentUserUid, handleTaskUpdate, setTaskLinkDrafts, setTaskLinkEditingDrafts, setTaskLinkTitleDrafts, taskLinkDrafts, taskLinkEditingDrafts, taskLinkTitleDrafts])

  const handleTaskLinkRemove = useCallback((task: WorkhubTask, link: string) => {
    const nextLinks = getTaskLinks(task).filter((value) => value !== link)
    const nextLinkTitles = { ...(task.linkTitles || {}) }
    const nextLinkCreatedBy = { ...(task.linkCreatedBy || {}) }
    delete nextLinkTitles[link]
    delete nextLinkCreatedBy[link]

    if ((taskLinkEditingDrafts[task.id] || '') === link) {
      handleTaskLinkEditCancel(task.id)
    }

    void handleTaskUpdate(task, {
      links: nextLinks,
      linkTitles: Object.keys(nextLinkTitles).length > 0 ? nextLinkTitles : {},
      linkCreatedBy: Object.keys(nextLinkCreatedBy).length > 0 ? nextLinkCreatedBy : {},
    }, { silent: true })
  }, [handleTaskLinkEditCancel, handleTaskUpdate, taskLinkEditingDrafts])

  const handleChecklistItemEditCancel = useCallback(() => {
    setEditingChecklistTaskId(null)
    setEditingChecklistItemId(null)
    setEditingChecklistScope(null)
    setEditingChecklistItemText('')
  }, [setEditingChecklistItemId, setEditingChecklistItemText, setEditingChecklistScope, setEditingChecklistTaskId])

  return {
    getChecklistDetailKey,
    toggleChecklistItemDetails,
    handleChecklistItemToggle,
    handleChecklistRemove,
    handleChecklistAdd,
    handleChecklistItemEditStart,
    handleChecklistItemEditSave,
    handleChecklistItemDetailsSave,
    handleChecklistAttachmentAdd,
    handleChecklistAttachmentRemove,
    handleTaskAttachmentFileUpload,
    handleChecklistAttachmentFileUpload,
    handleChecklistLinkAdd,
    handleChecklistLinkRemove,
    handleTaskAttachmentAdd,
    handleTaskAttachmentRemove,
    confirmAttachmentRemoval,
    handleSelectedTaskDescriptionSave,
    handleSelectedTaskTitleSave,
    handleTaskLinkEditStart,
    handleTaskLinkEditCancel,
    handleTaskLinkAdd,
    handleTaskLinkRemove,
    handleChecklistItemEditCancel,
  }
}
