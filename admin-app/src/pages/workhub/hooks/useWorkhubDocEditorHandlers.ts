import { useEffect, useMemo, useRef, useState } from 'react'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { auth } from '../../../lib/firebase'
import { storage } from '../../../lib/firebase'
import {
  updateWorkhubDocument,
  type WorkhubActivity,
  type WorkhubDocument,
  type WorkhubDocumentChecklistItem,
  type WorkhubDocumentEditEntry,
  type WorkhubVisibility,
} from '../../../lib/workhubRepo'
import { normalizeDocumentBodyForStorage, toDocumentBodyEditorHtml } from '../docEditorBody'

export type WorkhubDocumentShareAccess = 'view' | 'edit'

export interface UseWorkhubDocEditorHandlersInput {
  selectedDocument: WorkhubDocument | undefined
  selectedWorkspaceId: string
  workspaceProjectById: Record<string, { visibility?: WorkhubVisibility; memberUids?: string[]; name?: string }>
  workhubShareCandidates: Array<{ uid: string }>
  showToast: (opts: { type: 'success' | 'error' | 'warning'; message: string }) => void
  setBusyKey: (key: string) => void
  setSelectedDocumentId: (id: string) => void
  createActivity: (params: {
    workspaceId: string
    actorUid: string
    entityType: WorkhubActivity['entityType']
    entityId: string
    action: string
    message: string
    visibility?: WorkhubVisibility
    memberUids?: string[]
  }) => Promise<void>
  createNotifications: (params: {
    workspaceId: string
    actorUid: string
    recipientUids: string[]
    entityType: WorkhubActivity['entityType']
    entityId: string
    action: string
    message: string
  }) => Promise<void>
  deleteDocument: (documentId: string) => Promise<void>
  normalizeMemberUids: (uids: string[]) => string[]
}

export interface UseWorkhubDocEditorHandlersOutput {
  selectedDocumentTitleDraft: string
  selectedDocumentBodyDraft: string
  selectedDocumentChanged: boolean
  selectedDocumentLocked: boolean
  selectedDocumentCanEdit: boolean
  selectedDocumentReadOnly: boolean

  setSelectedDocumentTitleDraft: React.Dispatch<React.SetStateAction<string>>
  setSelectedDocumentBodyDraft: React.Dispatch<React.SetStateAction<string>>

  closeSelectedDocument: () => void
  handleSaveSelectedDocument: () => Promise<void>
  handleToggleSelectedDocumentLock: () => Promise<void>
  handleDeleteSelectedDocument: () => Promise<void>

  shareDocDialogOpen: boolean
  shareDocSaving: boolean
  shareDocAccessDraftByUid: Record<string, WorkhubDocumentShareAccess>
  setShareDocDialogOpen: React.Dispatch<React.SetStateAction<boolean>>
  handleToggleShareDocMember: (uid: string) => void
  handleSetShareDocMemberAccess: (uid: string, access: WorkhubDocumentShareAccess) => void
  handleSaveDocInternalShare: () => Promise<void>

  docChecklistDraft: string
  editingDocChecklistItemId: string | null
  editingDocChecklistItemText: string
  setDocChecklistDraft: React.Dispatch<React.SetStateAction<string>>
  setEditingDocChecklistItemId: React.Dispatch<React.SetStateAction<string | null>>
  setEditingDocChecklistItemText: React.Dispatch<React.SetStateAction<string>>
  getDocChecklist: (doc: WorkhubDocument | undefined) => WorkhubDocumentChecklistItem[]
  handleDocChecklistAdd: () => void
  handleDocChecklistToggle: (itemId: string, checked: boolean) => void
  handleDocChecklistRemove: (itemId: string) => void
  handleDocChecklistEditSave: (itemId: string) => void

  docAttachmentDraft: string
  uploadingDocAttachment: boolean
  setDocAttachmentDraft: React.Dispatch<React.SetStateAction<string>>
  handleDocAttachmentAdd: () => void
  handleDocAttachmentRemove: (url: string) => void
  handleDocAttachmentFileUpload: (files: File[]) => Promise<void>

  docLinkDraft: string
  setDocLinkDraft: React.Dispatch<React.SetStateAction<string>>
  handleDocLinkAdd: () => void
  handleDocLinkRemove: (url: string) => void

  noteAutoSaveStatus: 'idle' | 'saving' | 'saved'
}

export function useWorkhubDocEditorHandlers({
  selectedDocument,
  selectedWorkspaceId,
  workspaceProjectById,
  workhubShareCandidates,
  showToast,
  setBusyKey,
  setSelectedDocumentId,
  createActivity,
  createNotifications,
  deleteDocument,
  normalizeMemberUids,
}: UseWorkhubDocEditorHandlersInput): UseWorkhubDocEditorHandlersOutput {
  const [selectedDocumentTitleDraft, setSelectedDocumentTitleDraft] = useState('')
  const [selectedDocumentBodyDraft, setSelectedDocumentBodyDraft] = useState('')
  const [docChecklistDraft, setDocChecklistDraft] = useState('')
  const [docAttachmentDraft, setDocAttachmentDraft] = useState('')
  const [docLinkDraft, setDocLinkDraft] = useState('')
  const [uploadingDocAttachment, setUploadingDocAttachment] = useState(false)
  const [editingDocChecklistItemId, setEditingDocChecklistItemId] = useState<string | null>(null)
  const [editingDocChecklistItemText, setEditingDocChecklistItemText] = useState('')
  const [shareDocDialogOpen, setShareDocDialogOpen] = useState(false)
  const [shareDocSaving, setShareDocSaving] = useState(false)
  const [shareDocAccessDraftByUid, setShareDocAccessDraftByUid] = useState<Record<string, WorkhubDocumentShareAccess>>({})

  const selectedDocumentLocked = !!selectedDocument?.isLocked
  const currentUid = auth.currentUser?.uid || ''

  const selectedDocumentCanEdit = useMemo(() => {
    if (!selectedDocument || !currentUid) return false
    if (selectedDocument.createdBy === currentUid) return true
    if (selectedDocument.visibility !== 'restricted') return true

    const editMemberUids = normalizeMemberUids(Array.isArray(selectedDocument.editMemberUids) ? selectedDocument.editMemberUids : [])
    if (editMemberUids.length > 0) {
      return editMemberUids.includes(currentUid)
    }

    const viewMemberUids = normalizeMemberUids(Array.isArray(selectedDocument.memberUids) ? selectedDocument.memberUids : [])
    return viewMemberUids.includes(currentUid)
  }, [currentUid, normalizeMemberUids, selectedDocument])

  const selectedDocumentReadOnly = selectedDocumentLocked || !selectedDocumentCanEdit

  const selectedDocumentChanged = (() => {
    if (!selectedDocument) return false
    const savedBody = normalizeDocumentBodyForStorage(toDocumentBodyEditorHtml(selectedDocument.body || ''))
    const draftBody = normalizeDocumentBodyForStorage(selectedDocumentBodyDraft)
    return draftBody !== savedBody || selectedDocumentTitleDraft.trim() !== selectedDocument.title
  })()

  useEffect(() => {
    if (!selectedDocument) {
      setSelectedDocumentTitleDraft('')
      setSelectedDocumentBodyDraft('')
      return
    }
    const bodyHtml = toDocumentBodyEditorHtml(selectedDocument.body || '')
    setSelectedDocumentTitleDraft(selectedDocument.title)
    setSelectedDocumentBodyDraft(bodyHtml)
  }, [selectedDocument?.body, selectedDocument?.id, selectedDocument?.title])

  // Auto-save for all document types: debounced 800ms after typing stops, no toast
  const [noteAutoSaveStatus, setNoteAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!selectedDocument) return
    if (selectedDocumentReadOnly) return
    if (!selectedDocumentChanged) return
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    setNoteAutoSaveStatus('idle')
    autoSaveTimerRef.current = setTimeout(async () => {
      const nextTitle = selectedDocumentTitleDraft.trim() || selectedDocument.title
      const nextBody = normalizeDocumentBodyForStorage(selectedDocumentBodyDraft)
      try {
        setNoteAutoSaveStatus('saving')
        await updateWorkhubDocument(selectedDocument.id, { title: nextTitle, body: nextBody })
        setNoteAutoSaveStatus('saved')
      } catch {
        setNoteAutoSaveStatus('idle')
      }
    }, 800)
    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDocumentBodyDraft, selectedDocumentTitleDraft])

  useEffect(() => {
    if (!shareDocDialogOpen || !selectedDocument) return
    const viewMemberUids = selectedDocument.visibility === 'restricted'
      ? normalizeMemberUids(Array.isArray(selectedDocument.memberUids) ? selectedDocument.memberUids : [])
      : []
    const editMemberUids = normalizeMemberUids(
      Array.isArray(selectedDocument.editMemberUids) && selectedDocument.editMemberUids.length > 0
        ? selectedDocument.editMemberUids
        : viewMemberUids,
    )
    const candidateUidSet = new Set(workhubShareCandidates.map((item) => item.uid))
    const editSet = new Set(editMemberUids)
    const nextDraft: Record<string, WorkhubDocumentShareAccess> = {}
    viewMemberUids.forEach((uid) => {
      if (!candidateUidSet.has(uid)) return
      nextDraft[uid] = editSet.has(uid) ? 'edit' : 'view'
    })
    setShareDocAccessDraftByUid(nextDraft)
  }, [
    normalizeMemberUids,
    selectedDocument,
    shareDocDialogOpen,
    workhubShareCandidates,
  ])

  function closeSelectedDocument() {
    setShareDocDialogOpen(false)
    setSelectedDocumentId('')
  }

  async function handleSaveSelectedDocument() {
    if (!auth.currentUser || !selectedWorkspaceId || !selectedDocument) return
    if (selectedDocumentReadOnly) {
      showToast({ type: 'warning', message: 'You only have view access to this document.' })
      return
    }

    const nextTitle = selectedDocumentTitleDraft.trim()
    const nextBody = normalizeDocumentBodyForStorage(selectedDocumentBodyDraft)
    if (!nextTitle) {
      showToast({ type: 'error', message: 'Document title is required.' })
      return
    }

    const targetProject = selectedDocument.projectId ? workspaceProjectById[selectedDocument.projectId] : null
    const visibility = (selectedDocument.visibility || targetProject?.visibility || 'workspace') as WorkhubVisibility
    const memberUids = visibility === 'restricted'
      ? normalizeMemberUids(
        Array.isArray(selectedDocument.memberUids) && selectedDocument.memberUids.length > 0
          ? selectedDocument.memberUids
          : [auth.currentUser.uid],
      )
      : []

    setBusyKey(`document:${selectedDocument.id}`)
    try {
      await updateWorkhubDocument(selectedDocument.id, { title: nextTitle, body: nextBody, visibility, memberUids })
      await createActivity({
        workspaceId: selectedWorkspaceId,
        actorUid: auth.currentUser.uid,
        entityType: 'document',
        entityId: selectedDocument.id,
        action: 'update',
        message: `Updated document ${nextTitle}`,
        visibility,
        memberUids,
      })
      showToast({ type: 'success', message: 'Document saved.' })
    } catch (error) {
      showToast({ type: 'error', message: error instanceof Error ? error.message : 'Could not save document.' })
    } finally {
      setBusyKey('')
    }
  }

  async function handleToggleSelectedDocumentLock() {
    if (!auth.currentUser || !selectedWorkspaceId || !selectedDocument) return
    if (!selectedDocumentCanEdit) {
      showToast({ type: 'warning', message: 'You only have view access to this document.' })
      return
    }

    const nextLocked = !selectedDocument.isLocked
    if (nextLocked && selectedDocumentChanged) {
      showToast({ type: 'warning', message: 'Save document changes before locking.' })
      return
    }

    const targetProject = selectedDocument.projectId ? workspaceProjectById[selectedDocument.projectId] : null
    const visibility = (selectedDocument.visibility || targetProject?.visibility || 'workspace') as WorkhubVisibility
    const memberUids = visibility === 'restricted'
      ? normalizeMemberUids(
        Array.isArray(selectedDocument.memberUids) && selectedDocument.memberUids.length > 0
          ? selectedDocument.memberUids
          : [auth.currentUser.uid],
      )
      : []

    setBusyKey(`document-lock:${selectedDocument.id}`)
    try {
      await updateWorkhubDocument(selectedDocument.id, {
        isLocked: nextLocked,
        lockedBy: nextLocked ? auth.currentUser.uid : null,
        lockedAt: nextLocked ? new Date().toISOString() : null,
      })
      await createActivity({
        workspaceId: selectedWorkspaceId,
        actorUid: auth.currentUser.uid,
        entityType: 'document',
        entityId: selectedDocument.id,
        action: nextLocked ? 'lock' : 'unlock',
        message: `${nextLocked ? 'Locked' : 'Unlocked'} document ${selectedDocument.title}`,
        visibility,
        memberUids,
      })
      showToast({ type: 'success', message: nextLocked ? 'Document locked.' : 'Document unlocked.' })
    } catch (error) {
      showToast({ type: 'error', message: error instanceof Error ? error.message : `Could not ${nextLocked ? 'lock' : 'unlock'} document.` })
    } finally {
      setBusyKey('')
    }
  }

  async function handleDeleteSelectedDocument() {
    if (!auth.currentUser || !selectedWorkspaceId || !selectedDocument) return
    if (!selectedDocumentCanEdit) {
      showToast({ type: 'warning', message: 'You only have view access to this document.' })
      return
    }

    setBusyKey(`document-delete:${selectedDocument.id}`)
    try {
      await deleteDocument(selectedDocument.id)
      await createActivity({
        workspaceId: selectedWorkspaceId,
        actorUid: auth.currentUser.uid,
        entityType: 'document',
        entityId: selectedDocument.id,
        action: 'delete',
        message: `Deleted document ${selectedDocument.title}`,
      })
      setSelectedDocumentId('')
      showToast({ type: 'success', message: 'Document deleted.' })
    } catch (error) {
      showToast({ type: 'error', message: error instanceof Error ? error.message : 'Could not delete document.' })
    } finally {
      setBusyKey('')
    }
  }

  function handleToggleShareDocMember(uid: string) {
    if (!selectedDocumentCanEdit) return
    setShareDocAccessDraftByUid((current) => {
      if (current[uid]) {
        const next = { ...current }
        delete next[uid]
        return next
      }
      return {
        ...current,
        [uid]: 'edit',
      }
    })
  }

  function handleSetShareDocMemberAccess(uid: string, access: WorkhubDocumentShareAccess) {
    if (!selectedDocumentCanEdit) return
    setShareDocAccessDraftByUid((current) => ({
      ...current,
      [uid]: access,
    }))
  }

  async function handleSaveDocInternalShare() {
    if (!auth.currentUser || !selectedWorkspaceId || !selectedDocument) return
    if (!selectedDocumentCanEdit) {
      showToast({ type: 'warning', message: 'You only have view access to this document.' })
      return
    }

    const allowedUidSet = new Set(workhubShareCandidates.map((item) => item.uid))
    const selectedEntries = Object.entries(shareDocAccessDraftByUid)
      .filter(([uid, access]) => allowedUidSet.has(uid) && (access === 'view' || access === 'edit'))

    const actorUid = auth.currentUser.uid
    const sharedMemberUids = selectedEntries.map(([uid]) => uid)
    const editRecipientUids = selectedEntries.filter(([, access]) => access === 'edit').map(([uid]) => uid)
    const viewRecipientUids = selectedEntries.filter(([, access]) => access === 'view').map(([uid]) => uid)
    const hasSelectedRecipients = selectedEntries.length > 0

    const memberUids = normalizeMemberUids([...sharedMemberUids, selectedDocument.createdBy, actorUid])
    const editMemberUids = normalizeMemberUids([...editRecipientUids, selectedDocument.createdBy, actorUid])

    setBusyKey(`document-share:${selectedDocument.id}`)
    setShareDocSaving(true)
    try {
      await updateWorkhubDocument(selectedDocument.id, {
        visibility: hasSelectedRecipients ? 'restricted' : 'workspace',
        memberUids: hasSelectedRecipients ? memberUids : [],
        editMemberUids: hasSelectedRecipients ? editMemberUids : [],
        shareEnabled: false,
        shareToken: null,
      })

      await createActivity({
        workspaceId: selectedWorkspaceId,
        actorUid,
        entityType: 'document',
        entityId: selectedDocument.id,
        action: 'share_update',
        message: hasSelectedRecipients
          ? `Updated in-app sharing for document ${selectedDocument.title}`
          : `Cleared in-app sharing for document ${selectedDocument.title}`,
        visibility: hasSelectedRecipients ? 'restricted' : 'workspace',
        memberUids: hasSelectedRecipients ? memberUids : [],
      })

      if (hasSelectedRecipients && editRecipientUids.length > 0) {
        await createNotifications({
          workspaceId: selectedWorkspaceId,
          actorUid,
          recipientUids: editRecipientUids,
          entityType: 'document',
          entityId: selectedDocument.id,
          action: 'share',
          message: `granted edit access to document "${selectedDocument.title}"`,
        })
      }

      if (hasSelectedRecipients && viewRecipientUids.length > 0) {
        await createNotifications({
          workspaceId: selectedWorkspaceId,
          actorUid,
          recipientUids: viewRecipientUids,
          entityType: 'document',
          entityId: selectedDocument.id,
          action: 'share',
          message: `granted view access to document "${selectedDocument.title}"`,
        })
      }

      setShareDocDialogOpen(false)
      showToast({
        type: 'success',
        message: hasSelectedRecipients
          ? 'Document shared inside WorkHub.'
          : 'Internal sharing cleared. The document is now available to the workspace.',
      })
    } catch (error) {
      showToast({ type: 'error', message: error instanceof Error ? error.message : 'Could not save document sharing.' })
    } finally {
      setShareDocSaving(false)
      setBusyKey('')
    }
  }

  function getDocChecklist(doc: WorkhubDocument | undefined): WorkhubDocumentChecklistItem[] {
    if (!doc) return []
    return Array.isArray(doc.checklist) ? doc.checklist : []
  }

  async function updateDocumentDetail(patch: Parameters<typeof updateWorkhubDocument>[1]) {
    if (!auth.currentUser || !selectedDocument) return
    if (selectedDocumentReadOnly) {
      showToast({ type: 'warning', message: 'You only have view access to this document.' })
      return
    }

    const uid = auth.currentUser.uid
    const now = new Date().toISOString()
    const existingEdits: WorkhubDocumentEditEntry[] = Array.isArray(selectedDocument.editedBy) ? selectedDocument.editedBy : []
    const alreadyLogged = existingEdits.some((entry) => entry.uid === uid)
    const nextEditedBy: WorkhubDocumentEditEntry[] = alreadyLogged
      ? existingEdits.map((entry) => (entry.uid === uid ? { uid, at: now } : entry))
      : [...existingEdits, { uid, at: now }]

    await updateWorkhubDocument(selectedDocument.id, { ...patch, editedBy: nextEditedBy })
  }

  function handleDocChecklistAdd() {
    if (!selectedDocument || selectedDocumentReadOnly) return
    const text = docChecklistDraft.trim()
    if (!text) return

    const nextChecklist: WorkhubDocumentChecklistItem[] = [
      ...getDocChecklist(selectedDocument),
      { id: `dc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`, text, completed: false },
    ]

    setDocChecklistDraft('')
    void updateDocumentDetail({ checklist: nextChecklist })
  }

  function handleDocChecklistToggle(itemId: string, checked: boolean) {
    if (!selectedDocument || selectedDocumentReadOnly) return
    const nextChecklist = getDocChecklist(selectedDocument).map((item) => (
      item.id === itemId ? { ...item, completed: checked } : item
    ))
    void updateDocumentDetail({ checklist: nextChecklist })
  }

  function handleDocChecklistRemove(itemId: string) {
    if (!selectedDocument || selectedDocumentReadOnly) return
    const nextChecklist = getDocChecklist(selectedDocument).filter((item) => item.id !== itemId)
    void updateDocumentDetail({ checklist: nextChecklist })
  }

  function handleDocChecklistEditSave(itemId: string) {
    if (!selectedDocument || selectedDocumentReadOnly) return
    const text = editingDocChecklistItemText.trim()
    setEditingDocChecklistItemId(null)
    setEditingDocChecklistItemText('')
    if (!text) return

    const nextChecklist = getDocChecklist(selectedDocument).map((item) => (
      item.id === itemId ? { ...item, text } : item
    ))
    void updateDocumentDetail({ checklist: nextChecklist })
  }

  function handleDocAttachmentAdd() {
    if (!selectedDocument || selectedDocumentReadOnly) return
    const url = docAttachmentDraft.trim()
    if (!url) return

    const nextAttachments = [...(selectedDocument.attachments || []), url]
    setDocAttachmentDraft('')
    void updateDocumentDetail({ attachments: nextAttachments })
  }

  function handleDocAttachmentRemove(url: string) {
    if (!selectedDocument || selectedDocumentReadOnly) return
    const nextAttachments = (selectedDocument.attachments || []).filter((item) => item !== url)
    void updateDocumentDetail({ attachments: nextAttachments })
  }

  async function handleDocAttachmentFileUpload(files: File[]) {
    if (!selectedDocument || selectedDocumentReadOnly || files.length === 0) return

    const workspaceId = selectedDocument.workspaceId
    setUploadingDocAttachment(true)
    try {
      const uploadedUrls = await Promise.all(files.map(async (file) => {
        const ext = file.name.split('.').pop() || 'bin'
        const subdir = file.type.startsWith('image/') ? 'images' : file.type.startsWith('video/') ? 'videos' : 'docs'
        const path = `workhub-documents/${workspaceId}/${selectedDocument.id}/${subdir}/${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
        const fileRef = storageRef(storage, path)
        await uploadBytes(fileRef, file, { contentType: file.type })
        return getDownloadURL(fileRef)
      }))

      const nextAttachments = [...(selectedDocument.attachments || []), ...uploadedUrls]
      await updateDocumentDetail({ attachments: nextAttachments })
      showToast({ type: 'success', message: uploadedUrls.length > 1 ? `${uploadedUrls.length} files uploaded.` : 'File uploaded.' })
    } catch (error) {
      showToast({ type: 'error', message: error instanceof Error ? error.message : 'Upload failed.' })
    } finally {
      setUploadingDocAttachment(false)
    }
  }

  function handleDocLinkAdd() {
    if (!selectedDocument || selectedDocumentReadOnly) return
    const url = docLinkDraft.trim()
    if (!url) return

    const nextLinks = [...(selectedDocument.links || []), url]
    setDocLinkDraft('')
    void updateDocumentDetail({ links: nextLinks })
  }

  function handleDocLinkRemove(url: string) {
    if (!selectedDocument || selectedDocumentReadOnly) return
    const nextLinks = (selectedDocument.links || []).filter((item) => item !== url)
    void updateDocumentDetail({ links: nextLinks })
  }

  return {
    selectedDocumentTitleDraft,
    selectedDocumentBodyDraft,
    selectedDocumentChanged,
    selectedDocumentLocked,
    selectedDocumentCanEdit,
    selectedDocumentReadOnly,

    setSelectedDocumentTitleDraft,
    setSelectedDocumentBodyDraft,

    closeSelectedDocument,
    handleSaveSelectedDocument,
    handleToggleSelectedDocumentLock,
    handleDeleteSelectedDocument,

    shareDocDialogOpen,
    shareDocSaving,
    shareDocAccessDraftByUid,
    setShareDocDialogOpen,
    handleToggleShareDocMember,
    handleSetShareDocMemberAccess,
    handleSaveDocInternalShare,

    docChecklistDraft,
    editingDocChecklistItemId,
    editingDocChecklistItemText,
    setDocChecklistDraft,
    setEditingDocChecklistItemId,
    setEditingDocChecklistItemText,
    getDocChecklist,
    handleDocChecklistAdd,
    handleDocChecklistToggle,
    handleDocChecklistRemove,
    handleDocChecklistEditSave,

    docAttachmentDraft,
    uploadingDocAttachment,
    setDocAttachmentDraft,
    handleDocAttachmentAdd,
    handleDocAttachmentRemove,
    handleDocAttachmentFileUpload,

    docLinkDraft,
    setDocLinkDraft,
    handleDocLinkAdd,
    handleDocLinkRemove,

    noteAutoSaveStatus,
  }
}
