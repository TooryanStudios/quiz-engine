import { useEffect, useMemo, useRef, useState } from 'react'
import { ref as storageRef, uploadBytes, getDownloadURL, listAll } from 'firebase/storage'
import { auth } from '../../../lib/firebase'
import { storage } from '../../../lib/firebase'
import {
  updateWorkhubDocument,
  type WorkhubActivity,
  type WorkhubDocument,
  type WorkhubDocumentChecklistItem,
  type WorkhubDocumentEditEntry,
  type WorkhubDocumentMasterPageVariant,
  type WorkhubDocumentMasterPage,
  type WorkhubDocumentPrintBlock,
  type WorkhubDocumentTab,
  type WorkhubVisibility,
} from '../../../lib/workhubRepo'
import { normalizeDocumentBodyForStorage, toDocumentBodyEditorHtml } from '../docEditorBody'

function getDocumentTabMemoryKey(documentId: string) {
  return `workhub:documentActiveTab:${documentId}`
}

const DEFAULT_DOCUMENT_MASTER_PAGE: WorkhubDocumentMasterPage = {
  pageSize: 'A4',
  orientation: 'portrait',
  marginTopMm: 8,
  marginRightMm: 16,
  marginBottomMm: 8,
  marginLeftMm: 16,
  showCoverPage: false,
  coverDateMode: 'none',
  showWatermark: false,
  watermarkLogoUrl: '',
  watermarkScale: 50,
  watermarkOpacity: 8,
  watermarkLayout: 'center',
  watermarkCornerOpacity: 5,
  watermarkCornerScale: 30,
  firstPage: {
    showHeader: false,
    showFooter: false,
    showPageNumbers: false,
    header: {
      mode: 'structured',
      html: '',
      logoUrl: '',
      title: '',
      subtitle: '',
      address: '',
      signatureLabel: '',
      showDocumentTitle: false,
    },
    footer: {
      mode: 'structured',
      html: '',
      logoUrl: '',
      title: '',
      subtitle: '',
      address: '',
      signatureLabel: '',
      showDocumentTitle: false,
    },
  },
  laterPages: {
    showHeader: false,
    showFooter: false,
    showPageNumbers: false,
    header: {
      mode: 'structured',
      html: '',
      logoUrl: '',
      title: '',
      subtitle: '',
      address: '',
      signatureLabel: '',
      showDocumentTitle: false,
    },
    footer: {
      mode: 'structured',
      html: '',
      logoUrl: '',
      title: '',
      subtitle: '',
      address: '',
      signatureLabel: '',
      showDocumentTitle: false,
    },
  },
}

function normalizeDocumentPrintBlock(value: WorkhubDocumentPrintBlock | null | undefined, legacyHtml = ''): WorkhubDocumentPrintBlock {
  const next = value || {}
  return {
    mode: next.mode || ((next.html || legacyHtml).trim() ? 'html' : 'structured'),
    html: (next.html || legacyHtml || '').trim(),
    logoUrl: (next.logoUrl || '').trim(),
    title: (next.title || '').trim(),
    subtitle: (next.subtitle || '').trim(),
    address: (next.address || '').trim(),
    signatureLabel: (next.signatureLabel || '').trim(),
    showDocumentTitle: Boolean(next.showDocumentTitle),
  }
}

function normalizeDocumentMasterPageVariant(
  value: WorkhubDocumentMasterPageVariant | null | undefined,
  legacy: Pick<WorkhubDocumentMasterPage, 'showHeader' | 'showFooter' | 'showPageNumbers' | 'headerHtml' | 'footerHtml'>,
): WorkhubDocumentMasterPageVariant {
  const next = value || {}
  return {
    showHeader: typeof next.showHeader === 'boolean' ? next.showHeader : Boolean(legacy.showHeader),
    showFooter: typeof next.showFooter === 'boolean' ? next.showFooter : Boolean(legacy.showFooter),
    showPageNumbers: typeof next.showPageNumbers === 'boolean' ? next.showPageNumbers : Boolean(legacy.showPageNumbers),
    header: normalizeDocumentPrintBlock(next.header, legacy.headerHtml || ''),
    footer: normalizeDocumentPrintBlock(next.footer, legacy.footerHtml || ''),
  }
}

function normalizeDocumentMasterPage(value: WorkhubDocumentMasterPage | null | undefined): WorkhubDocumentMasterPage {
  const next = value || {}
  const toMargin = (margin: number | undefined, fallback: number) => {
    if (typeof margin !== 'number' || Number.isNaN(margin)) return fallback
    return Math.min(40, Math.max(8, Math.round(margin)))
  }
  const legacy = {
    showHeader: next.showHeader,
    showFooter: next.showFooter,
    showPageNumbers: next.showPageNumbers,
    headerHtml: next.headerHtml,
    footerHtml: next.footerHtml,
  }
  const normalizedFirstPage = normalizeDocumentMasterPageVariant(next.firstPage, legacy)
  const normalizedLaterPages = normalizeDocumentMasterPageVariant(next.laterPages, legacy)
  return {
    pageSize: next.pageSize || DEFAULT_DOCUMENT_MASTER_PAGE.pageSize,
    orientation: next.orientation || DEFAULT_DOCUMENT_MASTER_PAGE.orientation,
    marginTopMm: toMargin(next.marginTopMm, DEFAULT_DOCUMENT_MASTER_PAGE.marginTopMm || 8),
    marginRightMm: toMargin(next.marginRightMm, DEFAULT_DOCUMENT_MASTER_PAGE.marginRightMm || 16),
    marginBottomMm: toMargin(next.marginBottomMm, DEFAULT_DOCUMENT_MASTER_PAGE.marginBottomMm || 8),
    marginLeftMm: toMargin(next.marginLeftMm, DEFAULT_DOCUMENT_MASTER_PAGE.marginLeftMm || 16),
    firstPage: normalizedFirstPage,
    laterPages: normalizedLaterPages,
    showCoverPage: Boolean(next.showCoverPage),
    coverDateMode: next.coverDateMode || 'none',
    showWatermark: Boolean(next.showWatermark),
    watermarkLogoUrl: (next.watermarkLogoUrl || '').trim(),
    watermarkScale: typeof next.watermarkScale === 'number' ? Math.min(100, Math.max(10, next.watermarkScale)) : 50,
    watermarkOpacity: typeof next.watermarkOpacity === 'number' ? Math.min(30, Math.max(1, next.watermarkOpacity)) : 8,
    watermarkLayout: next.watermarkLayout || 'center',
    watermarkCornerOpacity: typeof next.watermarkCornerOpacity === 'number' ? Math.min(20, Math.max(1, next.watermarkCornerOpacity)) : 5,
    watermarkCornerScale: typeof next.watermarkCornerScale === 'number' ? Math.min(80, Math.max(10, next.watermarkCornerScale)) : 30,
  }
}

function areDocumentMasterPagesEqual(
  left: WorkhubDocumentMasterPage | null | undefined,
  right: WorkhubDocumentMasterPage | null | undefined,
) {
  return JSON.stringify(normalizeDocumentMasterPage(left)) === JSON.stringify(normalizeDocumentMasterPage(right))
}

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
    commentPreview?: string
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
  selectedDocumentMasterPageDraft: WorkhubDocumentMasterPage
  setSelectedDocumentMasterPageDraft: React.Dispatch<React.SetStateAction<WorkhubDocumentMasterPage>>

  documentTabsDraft: WorkhubDocumentTab[]
  activeTabId: string
  setDocumentTabsDraft: React.Dispatch<React.SetStateAction<WorkhubDocumentTab[]>>
  setActiveTabId: React.Dispatch<React.SetStateAction<string>>

  closeSelectedDocument: () => void
  handleSaveSelectedDocument: () => Promise<void>
  handleToggleSelectedDocumentLock: () => Promise<void>
  handleDeleteSelectedDocument: () => Promise<void>

  shareDocDialogOpen: boolean
  shareDocSaving: boolean
  shareDocAccessDraftByUid: Record<string, WorkhubDocumentShareAccess>
  setShareDocDialogOpen: React.Dispatch<React.SetStateAction<boolean>>
  handleToggleShareDocMember: (uid: string) => void
  handleSelectShareDocMember: (uid: string) => void
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
  handleDocChecklistBulkAdd: (items: string[]) => Promise<number>
  handleDocChecklistToggle: (itemId: string, checked: boolean) => void
  handleDocChecklistRemove: (itemId: string) => void
  handleDocChecklistEditSave: (itemId: string) => void

  docAttachmentDraft: string
  uploadingDocAttachment: boolean
  uploadingDocumentAssetImage: boolean
  workspaceAssetLibraryUrls: string[]
  workspaceAssetLibraryLoading: boolean
  uploadingWorkspaceAssetLibraryImage: boolean
  setDocAttachmentDraft: React.Dispatch<React.SetStateAction<string>>
  handleDocAttachmentAdd: () => void
  handleDocAttachmentRemove: (url: string) => void
  handleDocAttachmentFileUpload: (files: File[]) => Promise<void>
  handleDocumentAssetImageUpload: (file: File) => Promise<string | null>
  handleWorkspaceAssetLibraryImageUpload: (file: File) => Promise<string | null>

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
  const [selectedDocumentMasterPageDraft, setSelectedDocumentMasterPageDraft] = useState<WorkhubDocumentMasterPage>(DEFAULT_DOCUMENT_MASTER_PAGE)
  const [documentTabsDraft, setDocumentTabsDraft] = useState<WorkhubDocumentTab[]>([])
  const [activeTabId, setActiveTabId] = useState<string>('')
  // Stable refs so async callbacks always read latest values
  const documentTabsDraftRef = useRef<WorkhubDocumentTab[]>([])
  const activeTabIdRef = useRef<string>('')
  useEffect(() => { documentTabsDraftRef.current = documentTabsDraft }, [documentTabsDraft])
  useEffect(() => { activeTabIdRef.current = activeTabId }, [activeTabId])
  const [docChecklistDraft, setDocChecklistDraft] = useState('')
  const [docAttachmentDraft, setDocAttachmentDraft] = useState('')
  const [docLinkDraft, setDocLinkDraft] = useState('')
  const [uploadingDocAttachment, setUploadingDocAttachment] = useState(false)
  const [uploadingDocumentAssetImage, setUploadingDocumentAssetImage] = useState(false)
  const [workspaceAssetLibraryUrls, setWorkspaceAssetLibraryUrls] = useState<string[]>([])
  const [workspaceAssetLibraryLoading, setWorkspaceAssetLibraryLoading] = useState(false)
  const [uploadingWorkspaceAssetLibraryImage, setUploadingWorkspaceAssetLibraryImage] = useState(false)
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
    if (documentTabsDraft.length > 0) {
      if (selectedDocumentTitleDraft.trim() !== selectedDocument.title) return true
      const savedTabs = Array.isArray(selectedDocument.tabs) ? selectedDocument.tabs : []
      if (savedTabs.length !== documentTabsDraft.length) return true
      for (let i = 0; i < documentTabsDraft.length; i++) {
        const draft = documentTabsDraft[i]
        const saved = savedTabs[i]
        if (!saved || draft.id !== saved.id) return true
        if (draft.title !== saved.title) return true
        if ((draft.icon || '') !== (saved.icon || '')) return true
        const draftBody = normalizeDocumentBodyForStorage(
          draft.id === activeTabId ? selectedDocumentBodyDraft : draft.body,
        )
        if (draftBody !== normalizeDocumentBodyForStorage(saved.body || '')) return true
      }
      return false
    }
    const savedBody = normalizeDocumentBodyForStorage(toDocumentBodyEditorHtml(selectedDocument.body || ''))
    const draftBody = normalizeDocumentBodyForStorage(selectedDocumentBodyDraft)
    return (
      draftBody !== savedBody
      || selectedDocumentTitleDraft.trim() !== selectedDocument.title
      || !areDocumentMasterPagesEqual(selectedDocumentMasterPageDraft, selectedDocument.masterPage)
    )
  })()

  useEffect(() => {
    if (!selectedDocument) {
      setSelectedDocumentTitleDraft('')
      setSelectedDocumentBodyDraft('')
      setSelectedDocumentMasterPageDraft(DEFAULT_DOCUMENT_MASTER_PAGE)
      setDocumentTabsDraft([])
      setActiveTabId('')
      return
    }
    setSelectedDocumentTitleDraft(selectedDocument.title)
    setSelectedDocumentMasterPageDraft(normalizeDocumentMasterPage(selectedDocument.masterPage))
    const hasTabs = Array.isArray(selectedDocument.tabs) && selectedDocument.tabs.length > 0
    if (hasTabs) {
      const tabs = selectedDocument.tabs!
      setDocumentTabsDraft(tabs)
      const rememberedTabId = localStorage.getItem(getDocumentTabMemoryKey(selectedDocument.id)) || ''
      const rememberedTab = tabs.find((tab) => tab.id === rememberedTabId) || tabs[0]
      setActiveTabId(rememberedTab.id)
      setSelectedDocumentBodyDraft(rememberedTab.body || '')
    } else {
      setDocumentTabsDraft([])
      setActiveTabId('')
      setSelectedDocumentBodyDraft(toDocumentBodyEditorHtml(selectedDocument.body || ''))
    }
  // Re-init when switching documents; title re-syncs too
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDocument?.id, selectedDocument?.title])

  useEffect(() => {
    if (!selectedDocument?.id) return
    if (!activeTabId) return
    if (documentTabsDraft.length === 0) return
    localStorage.setItem(getDocumentTabMemoryKey(selectedDocument.id), activeTabId)
  }, [activeTabId, documentTabsDraft.length, selectedDocument?.id])

  useEffect(() => {
    if (!selectedWorkspaceId) {
      setWorkspaceAssetLibraryUrls([])
      return
    }
    let cancelled = false
    async function loadWorkspaceAssetLibrary() {
      setWorkspaceAssetLibraryLoading(true)
      try {
        const libraryRef = storageRef(storage, `workhub-assets/${selectedWorkspaceId}/library`)
        const listing = await listAll(libraryRef)
        const urls = await Promise.all(listing.items.map((item) => getDownloadURL(item)))
        if (!cancelled) {
          setWorkspaceAssetLibraryUrls(Array.from(new Set(urls)))
        }
      } catch {
        if (!cancelled) setWorkspaceAssetLibraryUrls([])
      } finally {
        if (!cancelled) setWorkspaceAssetLibraryLoading(false)
      }
    }
    void loadWorkspaceAssetLibrary()
    return () => {
      cancelled = true
    }
  }, [selectedWorkspaceId])

  // Auto-save for all document types: debounced 800ms after typing stops, no toast
  const [noteAutoSaveStatus, setNoteAutoSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle')
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingSaveRef = useRef<{
    docId: string
    title: string
    body: string
    tabs: WorkhubDocumentTab[] | null
    masterPage: WorkhubDocumentMasterPage
  } | null>(null)
  useEffect(() => {
    if (!selectedDocument) return
    if (selectedDocumentReadOnly) return
    if (!selectedDocumentChanged) return
    const nextTitle = selectedDocumentTitleDraft.trim() || selectedDocument.title
    const nextBody = normalizeDocumentBodyForStorage(selectedDocumentBodyDraft)
    const nextMasterPage = normalizeDocumentMasterPage(selectedDocumentMasterPageDraft)
    const hasTabs = documentTabsDraftRef.current.length > 0
    const tabsForSave = hasTabs
      ? documentTabsDraftRef.current.map((t) =>
          t.id === activeTabIdRef.current ? { ...t, body: nextBody } : t,
        )
      : null
    pendingSaveRef.current = {
      docId: selectedDocument.id,
      title: nextTitle,
      body: nextBody,
      tabs: tabsForSave,
      masterPage: nextMasterPage,
    }
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    setNoteAutoSaveStatus('idle')
    autoSaveTimerRef.current = setTimeout(async () => {
      const save = pendingSaveRef.current
      pendingSaveRef.current = null
      if (!save) return
      try {
        setNoteAutoSaveStatus('saving')
        if (save.tabs && save.tabs.length > 0) {
          await updateWorkhubDocument(save.docId, { title: save.title, tabs: save.tabs, masterPage: save.masterPage })
        } else {
          await updateWorkhubDocument(save.docId, { title: save.title, body: save.body, masterPage: save.masterPage })
        }
        setNoteAutoSaveStatus('saved')
      } catch {
        setNoteAutoSaveStatus('idle')
      }
    }, 800)
    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDocumentBodyDraft, selectedDocumentTitleDraft, selectedDocumentMasterPageDraft, documentTabsDraft])

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
    const initialUid = viewMemberUids.find((uid) => candidateUidSet.has(uid)) || ''
    if (initialUid) {
      nextDraft[initialUid] = editSet.has(initialUid) ? 'edit' : 'view'
    }
    setShareDocAccessDraftByUid(nextDraft)
  }, [
    normalizeMemberUids,
    selectedDocument,
    shareDocDialogOpen,
    workhubShareCandidates,
  ])

  function closeSelectedDocument() {
    // Flush any pending debounced save immediately before closing
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
      autoSaveTimerRef.current = null
    }
    if (pendingSaveRef.current) {
      const { docId, title, body, tabs, masterPage } = pendingSaveRef.current
      pendingSaveRef.current = null
      if (tabs && tabs.length > 0) {
        void updateWorkhubDocument(docId, { title, tabs, masterPage })
      } else {
        void updateWorkhubDocument(docId, { title, body, masterPage })
      }
    }
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
      const hasTabs = documentTabsDraftRef.current.length > 0
      const nextBody = normalizeDocumentBodyForStorage(selectedDocumentBodyDraft)
      const nextMasterPage = normalizeDocumentMasterPage(selectedDocumentMasterPageDraft)
      if (hasTabs) {
        const savedTabs = documentTabsDraftRef.current.map((t) =>
          t.id === activeTabIdRef.current ? { ...t, body: nextBody } : t,
        )
        await updateWorkhubDocument(selectedDocument.id, {
          title: nextTitle,
          tabs: savedTabs,
          masterPage: nextMasterPage,
          visibility,
          memberUids,
        })
      } else {
        await updateWorkhubDocument(selectedDocument.id, {
          title: nextTitle,
          body: nextBody,
          masterPage: nextMasterPage,
          visibility,
          memberUids,
        })
      }
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
        return {}
      }
      return {
        [uid]: 'edit',
      }
    })
  }

  function handleSelectShareDocMember(uid: string) {
    if (!selectedDocumentCanEdit) return
    const nextUid = uid.trim()
    setShareDocAccessDraftByUid((current) => {
      if (!nextUid) return {}
      return {
        [nextUid]: current[nextUid] || Object.values(current)[0] || 'edit',
      }
    })
  }

  function handleSetShareDocMemberAccess(uid: string, access: WorkhubDocumentShareAccess) {
    if (!selectedDocumentCanEdit) return
    setShareDocAccessDraftByUid({
      [uid]: access,
    })
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
        notifyMode: hasSelectedRecipients ? 'selected' : 'all',
        notifyUids: hasSelectedRecipients ? sharedMemberUids : [],
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
        const bodyPreview = selectedDocument.body
          ? selectedDocument.body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
          : undefined
        await createNotifications({
          workspaceId: selectedWorkspaceId,
          actorUid,
          recipientUids: editRecipientUids,
          entityType: 'document',
          entityId: selectedDocument.id,
          action: 'share',
          message: `shared "${selectedDocument.title}" with you. Please check the document. (edit access)`,
          ...(bodyPreview ? { commentPreview: bodyPreview } : {}),
        })
      }

      if (hasSelectedRecipients && viewRecipientUids.length > 0) {
        const bodyPreview = selectedDocument.body
          ? selectedDocument.body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
          : undefined
        await createNotifications({
          workspaceId: selectedWorkspaceId,
          actorUid,
          recipientUids: viewRecipientUids,
          entityType: 'document',
          entityId: selectedDocument.id,
          action: 'share',
          message: `shared "${selectedDocument.title}" with you. Please check the document. (view access)`,
          ...(bodyPreview ? { commentPreview: bodyPreview } : {}),
        })
      }

      setShareDocDialogOpen(false)
      showToast({
        type: 'success',
        message: hasSelectedRecipients
          ? 'Document shared. The recipient will receive email and in-app notification.'
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

  async function handleDocChecklistBulkAdd(items: string[]) {
    if (!selectedDocument || selectedDocumentReadOnly) return 0

    const normalizedItems = items
      .map((item) => item.trim())
      .filter(Boolean)

    if (normalizedItems.length === 0) return 0

    const existingChecklist = getDocChecklist(selectedDocument)
    const existingTextSet = new Set(existingChecklist.map((item) => item.text.trim().toLowerCase()))
    const seenNewText = new Set<string>()
    const nextItems: WorkhubDocumentChecklistItem[] = []

    normalizedItems.forEach((text) => {
      const normalizedText = text.toLowerCase()
      if (existingTextSet.has(normalizedText) || seenNewText.has(normalizedText)) return
      seenNewText.add(normalizedText)
      nextItems.push({
        id: `dc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        text,
        completed: false,
      })
    })

    if (nextItems.length === 0) return 0

    await updateDocumentDetail({ checklist: [...existingChecklist, ...nextItems] })
    return nextItems.length
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

  async function handleDocumentAssetImageUpload(file: File): Promise<string | null> {
    if (!selectedDocument || selectedDocumentReadOnly) return null
    if (!file.type.startsWith('image/')) {
      showToast({ type: 'error', message: 'Only image files can be used as logos.' })
      return null
    }
    const maxBytes = 4 * 1024 * 1024
    if (file.size > maxBytes) {
      showToast({ type: 'error', message: 'Logo size must be 4 MB or smaller.' })
      return null
    }

    setUploadingDocumentAssetImage(true)
    try {
      const extension = file.name.split('.').pop() || 'png'
      const path = `workhub-documents/${selectedWorkspaceId}/${selectedDocument.id}/assets/${crypto.randomUUID()}.${extension}`
      const fileRef = storageRef(storage, path)
      await uploadBytes(fileRef, file, { contentType: file.type || 'image/png' })
      const url = await getDownloadURL(fileRef)
      const nextAttachments = Array.from(new Set([...(selectedDocument.attachments || []), url]))
      await updateDocumentDetail({ attachments: nextAttachments })
      showToast({ type: 'success', message: 'Logo asset uploaded.' })
      return url
    } catch (error) {
      showToast({ type: 'error', message: error instanceof Error ? error.message : 'Could not upload logo asset.' })
      return null
    } finally {
      setUploadingDocumentAssetImage(false)
    }
  }

  async function handleWorkspaceAssetLibraryImageUpload(file: File): Promise<string | null> {
    if (selectedDocumentReadOnly) return null
    if (!selectedWorkspaceId) return null
    if (!file.type.startsWith('image/')) {
      showToast({ type: 'error', message: 'Only image files can be added to the workspace asset library.' })
      return null
    }
    const maxBytes = 6 * 1024 * 1024
    if (file.size > maxBytes) {
      showToast({ type: 'error', message: 'Workspace asset size must be 6 MB or smaller.' })
      return null
    }

    setUploadingWorkspaceAssetLibraryImage(true)
    try {
      const extension = file.name.split('.').pop() || 'png'
      const path = `workhub-assets/${selectedWorkspaceId}/library/${crypto.randomUUID()}.${extension}`
      const fileRef = storageRef(storage, path)
      await uploadBytes(fileRef, file, { contentType: file.type || 'image/png' })
      const url = await getDownloadURL(fileRef)
      setWorkspaceAssetLibraryUrls((current) => Array.from(new Set([url, ...current])))
      showToast({ type: 'success', message: 'Workspace asset uploaded.' })
      return url
    } catch (error) {
      showToast({ type: 'error', message: error instanceof Error ? error.message : 'Could not upload workspace asset.' })
      return null
    } finally {
      setUploadingWorkspaceAssetLibraryImage(false)
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
  selectedDocumentMasterPageDraft,
  setSelectedDocumentMasterPageDraft,

    documentTabsDraft,
    activeTabId,
    setDocumentTabsDraft,
    setActiveTabId,

    closeSelectedDocument,
    handleSaveSelectedDocument,
    handleToggleSelectedDocumentLock,
    handleDeleteSelectedDocument,

    shareDocDialogOpen,
    shareDocSaving,
    shareDocAccessDraftByUid,
    setShareDocDialogOpen,
    handleToggleShareDocMember,
    handleSelectShareDocMember,
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
    handleDocChecklistBulkAdd,
    handleDocChecklistToggle,
    handleDocChecklistRemove,
    handleDocChecklistEditSave,

    docAttachmentDraft,
    uploadingDocAttachment,
    uploadingDocumentAssetImage,
    workspaceAssetLibraryUrls,
    workspaceAssetLibraryLoading,
    uploadingWorkspaceAssetLibraryImage,
    setDocAttachmentDraft,
    handleDocAttachmentAdd,
    handleDocAttachmentRemove,
    handleDocAttachmentFileUpload,
    handleDocumentAssetImageUpload,
    handleWorkspaceAssetLibraryImageUpload,

    docLinkDraft,
    setDocLinkDraft,
    handleDocLinkAdd,
    handleDocLinkRemove,

    noteAutoSaveStatus,
  }
}
