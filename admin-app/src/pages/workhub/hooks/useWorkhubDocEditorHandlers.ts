import { useEffect, useMemo, useRef, useState } from 'react'
import { ref as storageRef, uploadBytes, getDownloadURL, listAll } from 'firebase/storage'
import { auth } from '../../../lib/firebase'
import { storage } from '../../../lib/firebase'
import {
  createWorkhubDocument,
  deleteWorkhubDocumentDraft,
  getWorkhubDocumentDraft,
  getWorkhubDocumentReferencesBySource,
  saveWorkhubDocumentDraft,
  subscribeWorkhubProjects,
  WorkhubDocumentConflictError,
  updateWorkhubDocument,
  updateWorkhubDocumentWithOptimisticConcurrency,
  type WorkhubActivity,
  type WorkhubDocument,
  type WorkhubDocumentDraft,
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

function getDocumentDraftMemoryKey(documentId: string) {
  return `workhub:documentDraft:${documentId}`
}

interface LocalDocumentDraftSnapshot {
  docId: string
  updatedAt: number
  title: string
  body: string
  tabs: WorkhubDocumentTab[]
  activeTabId: string
  masterPage: WorkhubDocumentMasterPage
}

interface RemoteDocumentSnapshot {
  docId: string
  revisionMs: number
  title: string
  body: string
  tabs: WorkhubDocumentTab[]
  masterPage: WorkhubDocumentMasterPage
  latestExternalEditorUid: string
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

export interface CopyToFolderProject {
  id: string
  name: string
  workspaceId: string
  parentProjectId?: string | null
}

export interface UseWorkhubDocEditorHandlersInput {
  selectedDocument: WorkhubDocument | undefined
  selectedWorkspaceId: string
  workspaceProjectById: Record<string, { visibility?: WorkhubVisibility; memberUids?: string[]; name?: string }>
  workhubShareCandidates: Array<{ uid: string }>
  allWorkspaceProjects: CopyToFolderProject[]
  allWorkspaceIds: Array<{ id: string; name: string }>
  isPrivilegedMember: boolean
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
  collaborationConflictBlocked: boolean
  collaborationConflictUpdatedAtMs: number | null
  collaborationConflictEditorUid: string
  selectedDocumentHasOutgoingReferences: boolean
  sourceReferencedTabIds: string[]
  publicReferenceAutoSaveBlocked: boolean
  recoverableDraftAvailable: boolean
  recoverableDraftUpdatedAt: number | null
  handleApplyCollaborationRemoteUpdate: () => void
  handleKeepLocalEditsAfterConflict: () => void
  handleRestoreRecoverableDraft: () => void
  handleDiscardRecoverableDraft: () => void

  canUnlockDocument: boolean

  copyToFolderDialogOpen: boolean
  copyToFolderSaving: boolean
  copyToFolderWorkspaceId: string
  copyToFolderProjectId: string
  copyTabMode: 'all' | 'active' | 'select'
  copyTabSelection: string[]
  highlightedRefDocId: string | null
  setHighlightedRefDocId: React.Dispatch<React.SetStateAction<string | null>>
  sourceReferenceDocuments: WorkhubDocument[]
  copyToFolderAvailableProjects: CopyToFolderProject[]
  setCopyToFolderDialogOpen: React.Dispatch<React.SetStateAction<boolean>>
  setCopyToFolderWorkspaceId: React.Dispatch<React.SetStateAction<string>>
  setCopyToFolderProjectId: React.Dispatch<React.SetStateAction<string>>
  setCopyTabMode: React.Dispatch<React.SetStateAction<'all' | 'active' | 'select'>>
  setCopyTabSelection: React.Dispatch<React.SetStateAction<string[]>>
  handleResolveAllTabsSharingForNewTab: (existingTabIds: string[]) => Promise<boolean>
  handleCopyDocumentToFolder: () => Promise<void>
  handleUpdateDocumentReference: (referenceDocumentId: string) => Promise<void>
  handleRemoveDocumentReference: (referenceDocumentId: string) => Promise<void>
  handleOpenReferenceSourceDocument: () => void
}

export function useWorkhubDocEditorHandlers({
  selectedDocument,
  selectedWorkspaceId,
  workspaceProjectById,
  workhubShareCandidates,
  allWorkspaceProjects,
  isPrivilegedMember,
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
  const [copyToFolderDialogOpen, setCopyToFolderDialogOpen] = useState(false)
  const [copyToFolderSaving, setCopyToFolderSaving] = useState(false)
  const [copyToFolderWorkspaceId, setCopyToFolderWorkspaceId] = useState('')
  const [copyToFolderProjectId, setCopyToFolderProjectId] = useState('')
  const [copyTabMode, setCopyTabMode] = useState<'all' | 'active' | 'select'>('select')
  const [copyTabSelection, setCopyTabSelection] = useState<string[]>([])
  const [highlightedRefDocId, setHighlightedRefDocId] = useState<string | null>(null)
  const [sourceReferenceDocuments, setSourceReferenceDocuments] = useState<WorkhubDocument[]>([])
  const [sourceReferencedTabIds, setSourceReferencedTabIds] = useState<string[]>([])
  const [copyToFolderTargetProjects, setCopyToFolderTargetProjects] = useState<CopyToFolderProject[]>([])
  const [recoverableDraft, setRecoverableDraft] = useState<LocalDocumentDraftSnapshot | null>(null)
  const [collaborationConflictSnapshot, setCollaborationConflictSnapshot] = useState<RemoteDocumentSnapshot | null>(null)
  const [latestRemoteRevisionMs, setLatestRemoteRevisionMs] = useState<number | null>(null)
  const appliedRemoteSnapshotRef = useRef<RemoteDocumentSnapshot | null>(null)

  const selectedDocumentLocked = !!selectedDocument?.isLocked
  const selectedDocumentIsReference = !!selectedDocument?.referenceSourceDocumentId
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
  const copyToFolderAvailableProjects = useMemo(() => {
    const byId = new Map<string, CopyToFolderProject>()
    allWorkspaceProjects.forEach((project) => byId.set(project.id, project))
    copyToFolderTargetProjects.forEach((project) => byId.set(project.id, project))
    return Array.from(byId.values())
  }, [allWorkspaceProjects, copyToFolderTargetProjects])
  const selectedDocumentHasOutgoingReferences = !selectedDocumentIsReference
    && (!!selectedDocument?.hasOutgoingReferences || sourceReferenceDocuments.length > 0)
  const publicReferenceAutoSaveBlocked = selectedDocumentHasOutgoingReferences
    && (documentTabsDraft.length === 0 || sourceReferencedTabIds.includes(activeTabId))
  const canUnlockDocument = !selectedDocumentIsReference && selectedDocumentLocked && (currentUid === selectedDocument?.createdBy || isPrivilegedMember)
  const collaborationConflictBlocked = Boolean(
    collaborationConflictSnapshot
    && selectedDocument
    && collaborationConflictSnapshot.docId === selectedDocument.id,
  )
  const collaborationConflictUpdatedAtMs = collaborationConflictSnapshot?.revisionMs
    || latestRemoteRevisionMs
    || null
  const collaborationConflictEditorUid = collaborationConflictSnapshot?.latestExternalEditorUid || ''

  async function refreshSourceReferenceDocuments() {
    if (!selectedDocument?.id || selectedDocument.referenceSourceDocumentId) {
      setSourceReferenceDocuments([])
      setSourceReferencedTabIds([])
      return
    }
    try {
      const refs = await getWorkhubDocumentReferencesBySource(selectedDocument.id)
      setSourceReferenceDocuments(refs)
      const sourceTabs = Array.isArray(selectedDocument.tabs) ? selectedDocument.tabs : []
      const allSourceTabIds = sourceTabs.map((tab) => tab.id)
      const referencedTabIdSet = new Set<string>()
      for (const refDoc of refs) {
        const selectedTabIds = Array.isArray(refDoc.referenceTabIds) ? refDoc.referenceTabIds : []
        if (selectedTabIds.length > 0) {
          selectedTabIds.forEach((tabId) => referencedTabIdSet.add(tabId))
        } else {
          allSourceTabIds.forEach((tabId) => referencedTabIdSet.add(tabId))
        }
      }
      setSourceReferencedTabIds(Array.from(referencedTabIdSet))

      const hasOutgoingReferences = refs.length > 0
      if (Boolean(selectedDocument.hasOutgoingReferences) !== hasOutgoingReferences) {
        await updateWorkhubDocument(selectedDocument.id, { hasOutgoingReferences })
      }
    } catch {
      setSourceReferenceDocuments([])
      setSourceReferencedTabIds([])
    }
  }

  useEffect(() => {
    if (!selectedDocument?.id || selectedDocumentIsReference) {
      setSourceReferenceDocuments([])
      setSourceReferencedTabIds([])
      return
    }
    void refreshSourceReferenceDocuments()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDocument?.id, selectedDocumentIsReference])

  useEffect(() => {
    if (!copyToFolderDialogOpen || !selectedDocument?.id || selectedDocumentIsReference) return
    void refreshSourceReferenceDocuments()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [copyToFolderDialogOpen, selectedDocument?.id, selectedDocumentIsReference])

  useEffect(() => {
    if (!copyToFolderDialogOpen || !copyToFolderWorkspaceId) {
      setCopyToFolderTargetProjects([])
      return
    }

    const localUid = auth.currentUser?.uid || ''
    return subscribeWorkhubProjects(copyToFolderWorkspaceId, localUid, isPrivilegedMember, (items) => {
      setCopyToFolderTargetProjects(items.map((project) => ({
        id: project.id,
        name: project.name,
        workspaceId: project.workspaceId,
        parentProjectId: project.parentProjectId || null,
      })))
    })
  }, [copyToFolderDialogOpen, copyToFolderWorkspaceId, isPrivilegedMember])

  useEffect(() => {
    if (!copyToFolderDialogOpen) {
      setHighlightedRefDocId(null)
    }
  }, [copyToFolderDialogOpen])

  function buildNotificationPreview(value: string) {
    return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 320)
  }

  function resolveRecipientsByNotifyMode(doc: WorkhubDocument, fallbackAllUids: string[]) {
    const mode = doc.notifyMode || 'all'
    if (mode === 'none') return [] as string[]
    if (mode === 'selected') {
      return normalizeMemberUids(Array.isArray(doc.notifyUids) ? doc.notifyUids : [])
    }
    return normalizeMemberUids(fallbackAllUids)
  }

  function resolveReferenceRecipientsForAllMode(refDoc: WorkhubDocument) {
    return normalizeMemberUids([
      ...(Array.isArray(refDoc.memberUids) ? refDoc.memberUids : []),
      ...(Array.isArray(refDoc.editMemberUids) ? refDoc.editMemberUids : []),
      refDoc.createdBy,
    ])
  }

  async function notifySourceUpdateRecipients(params: {
    sourceDocument: WorkhubDocument
    references: WorkhubDocument[]
    actorUid: string
    updatedTabTitle?: string
    updatedBody: string
  }) {
    const sourceAllCandidates = workhubShareCandidates.map((candidate) => candidate.uid)
    const sourceRecipients = resolveRecipientsByNotifyMode(params.sourceDocument, sourceAllCandidates)
      .filter((uid) => uid !== params.actorUid)
    const scopeLabel = params.updatedTabTitle ? `tab "${params.updatedTabTitle}"` : 'document'
    const sourcePreview = buildNotificationPreview(params.updatedBody)
    if (sourceRecipients.length > 0) {
      await createNotifications({
        workspaceId: params.sourceDocument.workspaceId,
        actorUid: params.actorUid,
        recipientUids: sourceRecipients,
        entityType: 'document',
        entityId: params.sourceDocument.id,
        action: 'reference_publish',
        message: `published updates to ${scopeLabel} in "${params.sourceDocument.title}".`,
        ...(sourcePreview ? { commentPreview: sourcePreview } : {}),
      })
    }

    for (const refDoc of params.references) {
      const fallbackRecipients = resolveReferenceRecipientsForAllMode(refDoc)
      const recipients = resolveRecipientsByNotifyMode(refDoc, fallbackRecipients)
        .filter((uid) => uid !== params.actorUid)
      if (recipients.length === 0) continue
      await createNotifications({
        workspaceId: refDoc.workspaceId,
        actorUid: params.actorUid,
        recipientUids: recipients,
        entityType: 'document',
        entityId: refDoc.id,
        action: 'reference_sync',
        message: `published source updates to referenced document "${refDoc.title || params.sourceDocument.title}".`,
        ...(sourcePreview ? { commentPreview: sourcePreview } : {}),
      })
    }
  }

  async function syncReferencesFromSource(params: {
    sourceDocumentId: string
    sourceWorkspaceId: string
    sourceProjectId?: string | null
    title: string
    body: string
    tabs: WorkhubDocumentTab[] | null
    masterPage: WorkhubDocumentMasterPage
    icon?: string
    actorUid: string
  }): Promise<WorkhubDocument[]> {
    const refs = await getWorkhubDocumentReferencesBySource(params.sourceDocumentId)
    if (refs.length === 0) {
      if (selectedDocument?.id === params.sourceDocumentId && selectedDocument.hasOutgoingReferences) {
        await updateWorkhubDocument(params.sourceDocumentId, { hasOutgoingReferences: false })
      }
      return []
    }

    if (selectedDocument?.id === params.sourceDocumentId && !selectedDocument.hasOutgoingReferences) {
      await updateWorkhubDocument(params.sourceDocumentId, { hasOutgoingReferences: true })
    }

    for (const refDoc of refs) {
      const selectedTabIds = Array.isArray(refDoc.referenceTabIds) ? refDoc.referenceTabIds : []
      const sourceTabs = Array.isArray(params.tabs) ? params.tabs : []
      const sourceHasTabs = sourceTabs.length > 0
      const tabsForReference = sourceTabs.length > 0
        ? (selectedTabIds.length > 0
          ? sourceTabs.filter((tab) => selectedTabIds.includes(tab.id))
          : sourceTabs)
        : []

      const nextPatch: Parameters<typeof updateWorkhubDocument>[1] = {
        title: params.title,
        icon: params.icon || '',
        masterPage: params.masterPage,
        body: sourceHasTabs ? '' : params.body,
        tabs: sourceHasTabs ? tabsForReference : [],
        isLocked: true,
        lockedBy: params.actorUid,
        lockedAt: new Date().toISOString() as unknown as undefined,
        referenceSourceDocumentId: params.sourceDocumentId,
        referenceSourceWorkspaceId: params.sourceWorkspaceId,
        referenceSourceProjectId: params.sourceProjectId || null,
      }

      await updateWorkhubDocument(refDoc.id, nextPatch)
      await createActivity({
        workspaceId: refDoc.workspaceId,
        actorUid: params.actorUid,
        entityType: 'document',
        entityId: refDoc.id,
        action: 'reference_sync',
        message: `Updated referenced document ${params.title}`,
      })
    }

    return refs
  }

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

  function getTabsWithActiveBodySnapshot() {
    if (documentTabsDraftRef.current.length === 0) return [] as WorkhubDocumentTab[]
    return documentTabsDraftRef.current.map((tab) => (
      tab.id === activeTabIdRef.current
        ? { ...tab, body: normalizeDocumentBodyForStorage(selectedDocumentBodyDraft) }
        : { ...tab, body: normalizeDocumentBodyForStorage(tab.body || '') }
    ))
  }

  function getLocalDraftSnapshot(document: WorkhubDocument): LocalDocumentDraftSnapshot {
    return {
      docId: document.id,
      updatedAt: Date.now(),
      title: selectedDocumentTitleDraft.trim() || document.title,
      body: normalizeDocumentBodyForStorage(selectedDocumentBodyDraft),
      tabs: getTabsWithActiveBodySnapshot(),
      activeTabId: activeTabIdRef.current,
      masterPage: normalizeDocumentMasterPage(selectedDocumentMasterPageDraft),
    }
  }

  function getUnknownTimeValue(value: unknown): number {
    if (!value) return 0
    if (typeof value === 'object' && value !== null && 'toMillis' in value && typeof (value as { toMillis?: unknown }).toMillis === 'function') {
      return (value as { toMillis: () => number }).toMillis()
    }
    if (typeof value === 'object' && value !== null && 'seconds' in value) {
      const seconds = Number((value as { seconds?: unknown }).seconds || 0)
      const nanoseconds = Number((value as { nanoseconds?: unknown }).nanoseconds || 0)
      return (seconds * 1000) + Math.floor(nanoseconds / 1_000_000)
    }
    if (typeof value === 'string') {
      const parsed = Date.parse(value)
      return Number.isFinite(parsed) ? parsed : 0
    }
    return 0
  }

  function buildEditedByWithActor(existingEntries: WorkhubDocumentEditEntry[] | undefined, actorUid: string) {
    if (!actorUid) return Array.isArray(existingEntries) ? existingEntries : []
    const nowIso = new Date().toISOString()
    const baseEntries = Array.isArray(existingEntries) ? existingEntries : []
    const alreadyLogged = baseEntries.some((entry) => entry.uid === actorUid)
    return alreadyLogged
      ? baseEntries.map((entry) => (entry.uid === actorUid ? { uid: actorUid, at: nowIso } : entry))
      : [...baseEntries, { uid: actorUid, at: nowIso }]
  }

  function resolveLatestExternalEditorUid(document: WorkhubDocument, actorUid: string) {
    const edits = Array.isArray(document.editedBy) ? document.editedBy : []
    let latestUid = ''
    let latestAt = 0
    edits.forEach((entry) => {
      if (!entry || !entry.uid || entry.uid === actorUid) return
      const atMs = getUnknownTimeValue(entry.at)
      if (atMs >= latestAt) {
        latestAt = atMs
        latestUid = entry.uid
      }
    })
    return latestUid
  }

  function buildRemoteDocumentSnapshot(document: WorkhubDocument): RemoteDocumentSnapshot {
    const sourceTabs = Array.isArray(document.tabs) ? document.tabs : []
    const revisionMs = getUnknownTimeValue(document.updatedAt || document.createdAt)
    return {
      docId: document.id,
      revisionMs,
      title: document.title,
      body: toDocumentBodyEditorHtml(document.body || ''),
      tabs: sourceTabs.map((tab) => ({
        id: tab.id,
        title: tab.title,
        ...(tab.icon ? { icon: tab.icon } : {}),
        body: tab.body || '',
      })),
      masterPage: normalizeDocumentMasterPage(document.masterPage),
      latestExternalEditorUid: resolveLatestExternalEditorUid(document, currentUid),
    }
  }

  function doesCurrentDraftDifferFromSnapshot(snapshot: RemoteDocumentSnapshot) {
    if ((selectedDocumentTitleDraft.trim() || snapshot.title) !== snapshot.title) return true
    if (!areDocumentMasterPagesEqual(selectedDocumentMasterPageDraft, snapshot.masterPage)) return true

    const draftTabs = documentTabsDraftRef.current
    const snapshotTabs = Array.isArray(snapshot.tabs) ? snapshot.tabs : []
    if (snapshotTabs.length !== draftTabs.length) return true
    if (snapshotTabs.length > 0) {
      for (let i = 0; i < snapshotTabs.length; i += 1) {
        const draft = draftTabs[i]
        const source = snapshotTabs[i]
        if (!draft || !source) return true
        if (draft.id !== source.id) return true
        if (draft.title !== source.title) return true
        if ((draft.icon || '') !== (source.icon || '')) return true
        const draftBody = normalizeDocumentBodyForStorage(
          draft.id === activeTabIdRef.current ? selectedDocumentBodyDraft : (draft.body || ''),
        )
        const sourceBody = normalizeDocumentBodyForStorage(source.body || '')
        if (draftBody !== sourceBody) return true
      }
      return false
    }

    return normalizeDocumentBodyForStorage(selectedDocumentBodyDraft) !== normalizeDocumentBodyForStorage(snapshot.body || '')
  }

  function applyRemoteDocumentSnapshot(snapshot: RemoteDocumentSnapshot) {
    setSelectedDocumentTitleDraft(snapshot.title)
    setSelectedDocumentMasterPageDraft(normalizeDocumentMasterPage(snapshot.masterPage))
    const nextTabs = Array.isArray(snapshot.tabs) ? snapshot.tabs.map((tab) => ({ ...tab })) : []
    if (nextTabs.length > 0) {
      const nextActiveTabId = nextTabs.find((tab) => tab.id === activeTabIdRef.current)?.id || nextTabs[0].id
      const nextActiveTab = nextTabs.find((tab) => tab.id === nextActiveTabId)
      setDocumentTabsDraft(nextTabs)
      setActiveTabId(nextActiveTabId)
      setSelectedDocumentBodyDraft(nextActiveTab?.body || '')
    } else {
      setDocumentTabsDraft([])
      setActiveTabId('')
      setSelectedDocumentBodyDraft(snapshot.body || '')
    }
  }

  function handleApplyCollaborationRemoteUpdate() {
    if (!selectedDocument || !collaborationConflictSnapshot || collaborationConflictSnapshot.docId !== selectedDocument.id) return
    applyRemoteDocumentSnapshot(collaborationConflictSnapshot)
    appliedRemoteSnapshotRef.current = collaborationConflictSnapshot
    setCollaborationConflictSnapshot(null)
  }

  function handleKeepLocalEditsAfterConflict() {
    if (!selectedDocument || !collaborationConflictSnapshot || collaborationConflictSnapshot.docId !== selectedDocument.id) return
    const confirmed = window.confirm('Keep your local edits and allow saving over the latest remote version?')
    if (!confirmed) return
    appliedRemoteSnapshotRef.current = collaborationConflictSnapshot
    setCollaborationConflictSnapshot(null)
  }

  function writeLocalDraftFallback(document: WorkhubDocument) {
    const snapshot = getLocalDraftSnapshot(document)
    try {
      localStorage.setItem(getDocumentDraftMemoryKey(document.id), JSON.stringify(snapshot))
    } catch {
      // Ignore storage quota and serialization errors.
    }
  }

  function clearLocalDraftFallback(documentId: string) {
    try {
      localStorage.removeItem(getDocumentDraftMemoryKey(documentId))
    } catch {
      // Ignore storage errors.
    }
  }

  function normalizeLocalDraft(raw: Partial<LocalDocumentDraftSnapshot> | null | undefined, source: WorkhubDocument): LocalDocumentDraftSnapshot | null {
    if (!raw || raw.docId !== source.id) return null
    return {
      docId: source.id,
      updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.now(),
      title: typeof raw.title === 'string' ? raw.title : source.title,
      body: typeof raw.body === 'string' ? raw.body : normalizeDocumentBodyForStorage(toDocumentBodyEditorHtml(source.body || '')),
      tabs: Array.isArray(raw.tabs)
        ? raw.tabs
            .filter((tab) => tab && typeof tab.id === 'string' && typeof tab.title === 'string')
            .map((tab) => ({
              id: tab.id,
              title: tab.title,
              ...(tab.icon ? { icon: tab.icon } : {}),
              body: normalizeDocumentBodyForStorage(tab.body || ''),
            }))
        : [],
      activeTabId: typeof raw.activeTabId === 'string' ? raw.activeTabId : '',
      masterPage: normalizeDocumentMasterPage(raw.masterPage),
    }
  }

  function normalizeServerDraft(raw: WorkhubDocumentDraft | null, source: WorkhubDocument): LocalDocumentDraftSnapshot | null {
    if (!raw || raw.documentId !== source.id) return null
    return {
      docId: source.id,
      updatedAt: getUnknownTimeValue(raw.updatedAt) || Date.now(),
      title: (raw.title || '').trim() || source.title,
      body: normalizeDocumentBodyForStorage(raw.body || ''),
      tabs: Array.isArray(raw.tabs)
        ? raw.tabs
            .filter((tab) => tab && typeof tab.id === 'string' && typeof tab.title === 'string')
            .map((tab) => ({
              id: tab.id,
              title: tab.title,
              ...(tab.icon ? { icon: tab.icon } : {}),
              body: normalizeDocumentBodyForStorage(tab.body || ''),
            }))
        : [],
      activeTabId: typeof raw.activeTabId === 'string' ? raw.activeTabId : '',
      masterPage: normalizeDocumentMasterPage(raw.masterPage),
    }
  }

  async function saveRecoverableDraft(document: WorkhubDocument) {
    const snapshot = getLocalDraftSnapshot(document)
    const uid = auth.currentUser?.uid || ''
    if (!uid) {
      writeLocalDraftFallback(document)
      return
    }
    try {
      await saveWorkhubDocumentDraft({
        workspaceId: document.workspaceId,
        documentId: document.id,
        userUid: uid,
        title: snapshot.title,
        body: snapshot.body,
        tabs: snapshot.tabs,
        activeTabId: snapshot.activeTabId,
        masterPage: snapshot.masterPage,
      })
      clearLocalDraftFallback(document.id)
    } catch {
      writeLocalDraftFallback(document)
    }
  }

  async function clearRecoverableDraft(documentId: string) {
    clearLocalDraftFallback(documentId)
    const uid = auth.currentUser?.uid || ''
    if (!uid) return
    try {
      await deleteWorkhubDocumentDraft(documentId, uid)
    } catch {
      // Ignore transient network failures.
    }
  }

  function doesLocalDraftDifferFromSource(document: WorkhubDocument, draft: LocalDocumentDraftSnapshot) {
    const sourceTitle = document.title
    const sourceBody = normalizeDocumentBodyForStorage(toDocumentBodyEditorHtml(document.body || ''))
    const sourceTabs = Array.isArray(document.tabs) ? document.tabs : []
    const sourceMasterPage = normalizeDocumentMasterPage(document.masterPage)

    if (draft.title !== sourceTitle) return true
    if (!areDocumentMasterPagesEqual(draft.masterPage, sourceMasterPage)) return true

    if (sourceTabs.length !== draft.tabs.length) return true
    if (sourceTabs.length > 0) {
      for (let i = 0; i < sourceTabs.length; i += 1) {
        const sourceTab = sourceTabs[i]
        const draftTab = draft.tabs[i]
        if (!draftTab) return true
        if (sourceTab.id !== draftTab.id) return true
        if (sourceTab.title !== draftTab.title) return true
        if ((sourceTab.icon || '') !== (draftTab.icon || '')) return true
        if (normalizeDocumentBodyForStorage(sourceTab.body || '') !== normalizeDocumentBodyForStorage(draftTab.body || '')) return true
      }
      return false
    }

    return draft.body !== sourceBody
  }

  function handleRestoreRecoverableDraft() {
    if (!selectedDocument || !recoverableDraft || recoverableDraft.docId !== selectedDocument.id) return
    setSelectedDocumentTitleDraft(recoverableDraft.title)
    setSelectedDocumentMasterPageDraft(normalizeDocumentMasterPage(recoverableDraft.masterPage))
    if (recoverableDraft.tabs.length > 0) {
      const nextTabs = recoverableDraft.tabs.map((tab) => ({ ...tab }))
      const nextActiveTabId = nextTabs.find((tab) => tab.id === recoverableDraft.activeTabId)?.id || nextTabs[0].id
      const nextActiveTab = nextTabs.find((tab) => tab.id === nextActiveTabId)
      setDocumentTabsDraft(nextTabs)
      setActiveTabId(nextActiveTabId)
      setSelectedDocumentBodyDraft(nextActiveTab?.body || '')
    } else {
      setDocumentTabsDraft([])
      setActiveTabId('')
      setSelectedDocumentBodyDraft(recoverableDraft.body || '')
    }
    setRecoverableDraft(null)
  }

  function handleDiscardRecoverableDraft() {
    if (!selectedDocument) return
    void clearRecoverableDraft(selectedDocument.id)
    setRecoverableDraft(null)
  }

  useEffect(() => {
    if (!selectedDocument) {
      setSelectedDocumentTitleDraft('')
      setSelectedDocumentBodyDraft('')
      setSelectedDocumentMasterPageDraft(DEFAULT_DOCUMENT_MASTER_PAGE)
      setDocumentTabsDraft([])
      setActiveTabId('')
      setRecoverableDraft(null)
      setCollaborationConflictSnapshot(null)
      setLatestRemoteRevisionMs(null)
      appliedRemoteSnapshotRef.current = null
      return
    }
    const remoteSnapshot = buildRemoteDocumentSnapshot(selectedDocument)
    appliedRemoteSnapshotRef.current = remoteSnapshot
    setLatestRemoteRevisionMs(remoteSnapshot.revisionMs || null)
    setCollaborationConflictSnapshot(null)
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
      const bodyHtml = toDocumentBodyEditorHtml(selectedDocument.body || '')
      const shouldSeedDefaultTab = !selectedDocument.referenceSourceDocumentId && (selectedDocument.type || 'document') === 'document'
      if (shouldSeedDefaultTab) {
        const defaultTabId = `tab_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
        const defaultTab: WorkhubDocumentTab = { id: defaultTabId, title: 'Main', body: bodyHtml }
        setDocumentTabsDraft([defaultTab])
        setActiveTabId(defaultTabId)
        setSelectedDocumentBodyDraft(bodyHtml)
      } else {
        setDocumentTabsDraft([])
        setActiveTabId('')
        setSelectedDocumentBodyDraft(bodyHtml)
      }
    }

    let cancelled = false
    const doc = selectedDocument
    async function loadRecoverableDraft() {
      const uid = auth.currentUser?.uid || ''
      let normalizedDraft: LocalDocumentDraftSnapshot | null = null

      if (uid) {
        try {
          const serverDraft = await getWorkhubDocumentDraft(doc.id, uid)
          normalizedDraft = normalizeServerDraft(serverDraft, doc)
        } catch {
          normalizedDraft = null
        }
      }

      if (!normalizedDraft) {
        try {
          const rawFallback = localStorage.getItem(getDocumentDraftMemoryKey(doc.id))
          normalizedDraft = normalizeLocalDraft(rawFallback ? (JSON.parse(rawFallback) as Partial<LocalDocumentDraftSnapshot>) : null, doc)
        } catch {
          normalizedDraft = null
        }
      }

      if (cancelled) return

      if (!normalizedDraft) {
        setRecoverableDraft(null)
      } else if (doesLocalDraftDifferFromSource(doc, normalizedDraft)) {
        setRecoverableDraft(normalizedDraft)
      } else {
        void clearRecoverableDraft(doc.id)
        setRecoverableDraft(null)
      }
    }

    void loadRecoverableDraft()
  // Re-init only when switching documents.
  // eslint-disable-next-line react-hooks/exhaustive-deps
    return () => {
      cancelled = true
    }
  }, [selectedDocument?.id])

  useEffect(() => {
    if (!selectedDocument) return

    const incomingSnapshot = buildRemoteDocumentSnapshot(selectedDocument)
    setLatestRemoteRevisionMs(incomingSnapshot.revisionMs || null)

    const appliedSnapshot = appliedRemoteSnapshotRef.current
    if (!appliedSnapshot || appliedSnapshot.docId !== selectedDocument.id) {
      appliedRemoteSnapshotRef.current = incomingSnapshot
      setCollaborationConflictSnapshot(null)
      return
    }

    if (incomingSnapshot.revisionMs <= appliedSnapshot.revisionMs) return

    const hasLocalUnsavedEdits = doesCurrentDraftDifferFromSnapshot(appliedSnapshot)
    if (!hasLocalUnsavedEdits) {
      applyRemoteDocumentSnapshot(incomingSnapshot)
      appliedRemoteSnapshotRef.current = incomingSnapshot
      setCollaborationConflictSnapshot(null)
      return
    }

    setCollaborationConflictSnapshot(incomingSnapshot)
  }, [
    selectedDocument?.id,
    selectedDocument?.updatedAt,
    selectedDocument?.createdAt,
    selectedDocument?.title,
    selectedDocument?.body,
    selectedDocument?.tabs,
    selectedDocument?.masterPage,
    selectedDocument?.editedBy,
  ])

  const localDraftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (!selectedDocument) return
    if (selectedDocumentReadOnly) return

    if (localDraftTimerRef.current) {
      clearTimeout(localDraftTimerRef.current)
      localDraftTimerRef.current = null
    }

    if (!selectedDocumentChanged) {
      void clearRecoverableDraft(selectedDocument.id)
      return
    }

    localDraftTimerRef.current = setTimeout(() => {
      void saveRecoverableDraft(selectedDocument)
    }, 650)

    return () => {
      if (localDraftTimerRef.current) {
        clearTimeout(localDraftTimerRef.current)
        localDraftTimerRef.current = null
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    selectedDocument?.id,
    selectedDocumentReadOnly,
    selectedDocumentChanged,
    selectedDocumentTitleDraft,
    selectedDocumentBodyDraft,
    selectedDocumentMasterPageDraft,
    documentTabsDraft,
    activeTabId,
  ])

  useEffect(() => {
    if (!selectedDocument?.id) return
    if (!activeTabId) return
    if (documentTabsDraft.length === 0) return
    localStorage.setItem(getDocumentTabMemoryKey(selectedDocument.id), activeTabId)
  }, [activeTabId, documentTabsDraft.length, selectedDocument?.id])

  useEffect(() => {
    if (!selectedDocument) return
    if (selectedDocumentReadOnly) return
    if (!selectedDocumentChanged) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
    }
  }, [selectedDocument, selectedDocumentChanged, selectedDocumentReadOnly])

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
    if (collaborationConflictBlocked) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
        autoSaveTimerRef.current = null
      }
      pendingSaveRef.current = null
      setNoteAutoSaveStatus('idle')
      return
    }
    const hasTabs = documentTabsDraftRef.current.length > 0
    const currentTabId = activeTabIdRef.current
    const isPublicReferenceScope = selectedDocumentHasOutgoingReferences
      && (!hasTabs || (currentTabId ? sourceReferencedTabIds.includes(currentTabId) : false))
    if (isPublicReferenceScope) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current)
        autoSaveTimerRef.current = null
      }
      pendingSaveRef.current = null
      setNoteAutoSaveStatus('idle')
      return
    }
    const nextTitle = selectedDocumentTitleDraft.trim() || selectedDocument.title
    const nextBody = normalizeDocumentBodyForStorage(selectedDocumentBodyDraft)
    const nextMasterPage = normalizeDocumentMasterPage(selectedDocumentMasterPageDraft)
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
        const actorUid = auth.currentUser?.uid || ''
        const nextEditedBy = buildEditedByWithActor(selectedDocument.editedBy, actorUid)
        const expectedRevisionMs = appliedRemoteSnapshotRef.current?.docId === save.docId
          ? appliedRemoteSnapshotRef.current.revisionMs
          : null
        if (save.tabs && save.tabs.length > 0) {
          await updateWorkhubDocumentWithOptimisticConcurrency(save.docId, {
            title: save.title,
            tabs: save.tabs,
            masterPage: save.masterPage,
            editedBy: nextEditedBy,
          }, expectedRevisionMs)
        } else {
          await updateWorkhubDocumentWithOptimisticConcurrency(save.docId, {
            title: save.title,
            body: save.body,
            masterPage: save.masterPage,
            editedBy: nextEditedBy,
          }, expectedRevisionMs)
        }
        appliedRemoteSnapshotRef.current = {
          docId: save.docId,
          revisionMs: expectedRevisionMs || getUnknownTimeValue(selectedDocument.updatedAt || selectedDocument.createdAt),
          title: save.title,
          body: save.body,
          tabs: Array.isArray(save.tabs) ? save.tabs.map((tab) => ({ ...tab })) : [],
          masterPage: normalizeDocumentMasterPage(save.masterPage),
          latestExternalEditorUid: '',
        }
        setCollaborationConflictSnapshot(null)
        await clearRecoverableDraft(save.docId)
        if (selectedDocument && !selectedDocument.referenceSourceDocumentId && auth.currentUser?.uid) {
          await syncReferencesFromSource({
            sourceDocumentId: selectedDocument.id,
            sourceWorkspaceId: selectedDocument.workspaceId,
            sourceProjectId: selectedDocument.projectId || null,
            title: save.title,
            body: save.body,
            tabs: save.tabs,
            masterPage: save.masterPage,
            icon: selectedDocument.icon,
            actorUid: auth.currentUser.uid,
          })
        }
        setNoteAutoSaveStatus('saved')
      } catch (error) {
        if (error instanceof WorkhubDocumentConflictError && selectedDocument) {
          const remoteSnapshot = buildRemoteDocumentSnapshot(selectedDocument)
          if (remoteSnapshot.docId === save.docId) {
            setCollaborationConflictSnapshot(remoteSnapshot)
            setLatestRemoteRevisionMs(Math.max(remoteSnapshot.revisionMs, error.currentUpdatedAtMs || 0))
          }
          showToast({ type: 'warning', message: 'Another teammate updated this document. Review latest changes before saving.' })
        }
        setNoteAutoSaveStatus('idle')
      }
    }, 800)
    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDocumentBodyDraft, selectedDocumentTitleDraft, selectedDocumentMasterPageDraft, documentTabsDraft, selectedDocumentHasOutgoingReferences, sourceReferencedTabIds, collaborationConflictBlocked])

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
    if (selectedDocument && selectedDocumentChanged && !selectedDocumentReadOnly) {
      void saveRecoverableDraft(selectedDocument)
    }
    // Flush any pending debounced save immediately before closing
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current)
      autoSaveTimerRef.current = null
    }
    if (pendingSaveRef.current) {
      const { docId, title, body, tabs, masterPage } = pendingSaveRef.current
      pendingSaveRef.current = null
      if (!publicReferenceAutoSaveBlocked && !collaborationConflictBlocked) {
        const expectedRevisionMs = appliedRemoteSnapshotRef.current?.docId === docId
          ? appliedRemoteSnapshotRef.current.revisionMs
          : getUnknownTimeValue(selectedDocument?.updatedAt || selectedDocument?.createdAt)
        const nextEditedBy = buildEditedByWithActor(selectedDocument?.editedBy, auth.currentUser?.uid || '')
        if (tabs && tabs.length > 0) {
          void updateWorkhubDocumentWithOptimisticConcurrency(docId, { title, tabs, masterPage, editedBy: nextEditedBy }, expectedRevisionMs)
        } else {
          void updateWorkhubDocumentWithOptimisticConcurrency(docId, { title, body, masterPage, editedBy: nextEditedBy }, expectedRevisionMs)
        }
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
    if (collaborationConflictBlocked) {
      showToast({ type: 'warning', message: 'A collaborator has newer changes. Load latest or choose to keep your edits before saving.' })
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
    const hasTabs = documentTabsDraftRef.current.length > 0
    const currentTabId = activeTabIdRef.current
    const activeTabDraft = hasTabs ? documentTabsDraftRef.current.find((tab) => tab.id === currentTabId) || null : null
    const isPublicReferenceScope = selectedDocumentHasOutgoingReferences
      && (!hasTabs || (currentTabId ? sourceReferencedTabIds.includes(currentTabId) : false))

    if (isPublicReferenceScope) {
      const confirmationMessage = hasTabs && activeTabDraft
        ? `This tab (${activeTabDraft.title}) is public and referenced in other folders. Publishing will sync changes and notify recipients. Continue?`
        : 'This document is public and referenced in other folders. Publishing will sync changes and notify recipients. Continue?'
      if (!window.confirm(confirmationMessage)) {
        showToast({ type: 'warning', message: 'Publish cancelled. Open "Reference in folder" to stop sharing if needed.' })
        return
      }
    }

    setBusyKey(`document:${selectedDocument.id}`)
    try {
      const nextBody = normalizeDocumentBodyForStorage(selectedDocumentBodyDraft)
      const nextMasterPage = normalizeDocumentMasterPage(selectedDocumentMasterPageDraft)
      const nextEditedBy = buildEditedByWithActor(selectedDocument.editedBy, auth.currentUser.uid)
      const expectedRevisionMs = appliedRemoteSnapshotRef.current?.docId === selectedDocument.id
        ? appliedRemoteSnapshotRef.current.revisionMs
        : getUnknownTimeValue(selectedDocument.updatedAt || selectedDocument.createdAt)
      let syncedReferences: WorkhubDocument[] = []
      if (hasTabs) {
        const savedTabs = documentTabsDraftRef.current.map((t) =>
          t.id === activeTabIdRef.current ? { ...t, body: nextBody } : t,
        )
        await updateWorkhubDocumentWithOptimisticConcurrency(selectedDocument.id, {
          title: nextTitle,
          tabs: savedTabs,
          masterPage: nextMasterPage,
          editedBy: nextEditedBy,
          visibility,
          memberUids,
        }, expectedRevisionMs)
        if (!selectedDocument.referenceSourceDocumentId) {
          syncedReferences = await syncReferencesFromSource({
            sourceDocumentId: selectedDocument.id,
            sourceWorkspaceId: selectedDocument.workspaceId,
            sourceProjectId: selectedDocument.projectId || null,
            title: nextTitle,
            body: nextBody,
            tabs: savedTabs,
            masterPage: nextMasterPage,
            icon: selectedDocument.icon,
            actorUid: auth.currentUser.uid,
          })
        }
        appliedRemoteSnapshotRef.current = {
          docId: selectedDocument.id,
          revisionMs: expectedRevisionMs,
          title: nextTitle,
          body: nextBody,
          tabs: savedTabs.map((tab) => ({ ...tab })),
          masterPage: normalizeDocumentMasterPage(nextMasterPage),
          latestExternalEditorUid: '',
        }
      } else {
        await updateWorkhubDocumentWithOptimisticConcurrency(selectedDocument.id, {
          title: nextTitle,
          body: nextBody,
          masterPage: nextMasterPage,
          editedBy: nextEditedBy,
          visibility,
          memberUids,
        }, expectedRevisionMs)
        if (!selectedDocument.referenceSourceDocumentId) {
          syncedReferences = await syncReferencesFromSource({
            sourceDocumentId: selectedDocument.id,
            sourceWorkspaceId: selectedDocument.workspaceId,
            sourceProjectId: selectedDocument.projectId || null,
            title: nextTitle,
            body: nextBody,
            tabs: null,
            masterPage: nextMasterPage,
            icon: selectedDocument.icon,
            actorUid: auth.currentUser.uid,
          })
        }
        appliedRemoteSnapshotRef.current = {
          docId: selectedDocument.id,
          revisionMs: expectedRevisionMs,
          title: nextTitle,
          body: nextBody,
          tabs: [],
          masterPage: normalizeDocumentMasterPage(nextMasterPage),
          latestExternalEditorUid: '',
        }
      }
      setCollaborationConflictSnapshot(null)
      if (!selectedDocument.referenceSourceDocumentId && syncedReferences.length > 0) {
        await notifySourceUpdateRecipients({
          sourceDocument: selectedDocument,
          references: syncedReferences,
          actorUid: auth.currentUser.uid,
          updatedTabTitle: activeTabDraft?.title,
          updatedBody: nextBody,
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
      await clearRecoverableDraft(selectedDocument.id)
      setRecoverableDraft(null)
      showToast({
        type: 'success',
        message: isPublicReferenceScope ? 'Document published and references were notified.' : 'Document saved.',
      })
    } catch (error) {
      if (error instanceof WorkhubDocumentConflictError) {
        const remoteSnapshot = buildRemoteDocumentSnapshot(selectedDocument)
        setCollaborationConflictSnapshot(remoteSnapshot)
        setLatestRemoteRevisionMs(Math.max(remoteSnapshot.revisionMs, error.currentUpdatedAtMs || 0))
        showToast({ type: 'warning', message: 'This document was updated by another teammate. Review latest changes before saving.' })
        return
      }
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
    if (selectedDocument.referenceSourceDocumentId) {
      showToast({ type: 'warning', message: 'Referenced documents are always read-only. Edit the original document instead.' })
      return
    }
    // Unlocking is restricted to the creator or privileged members
    if (selectedDocument.isLocked && selectedDocument.createdBy !== currentUid && !isPrivilegedMember) {
      showToast({ type: 'warning', message: 'Only the document creator or an admin can unlock this.' })
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

  async function handleCopyDocumentToFolder() {
    if (!selectedDocument || !auth.currentUser) return
    if (selectedDocument.referenceSourceDocumentId) {
      showToast({ type: 'warning', message: 'Cannot create a reference from an already referenced document.' })
      return
    }
    if (!copyToFolderWorkspaceId) {
      showToast({ type: 'warning', message: 'Select a workspace first.' })
      return
    }
    const targetProject = copyToFolderAvailableProjects.find((p) => p.id === copyToFolderProjectId && p.workspaceId === copyToFolderWorkspaceId)
    if (!targetProject) {
      showToast({ type: 'warning', message: 'Select a folder for the reference.' })
      return
    }
    setCopyToFolderSaving(true)
    try {
      const allTabs: WorkhubDocumentTab[] = Array.isArray(selectedDocument.tabs) ? selectedDocument.tabs : []
      if (allTabs.length > 0 && copyTabMode === 'select' && copyTabSelection.length === 0) {
        showToast({ type: 'warning', message: 'Choose at least one tab to reference.' })
        return
      }
      // Determine which tabs to reference based on mode
      let sourceTabs: WorkhubDocumentTab[] = []
      if (allTabs.length > 0) {
        if (copyTabMode === 'active') {
          sourceTabs = allTabs.filter((t) => t.id === activeTabId)
        } else if (copyTabMode === 'select') {
          sourceTabs = allTabs.filter((t) => copyTabSelection.includes(t.id))
        } else {
          sourceTabs = allTabs
        }
      }
      const sourceHasTabs = allTabs.length > 0
      const tabsToReference: WorkhubDocumentTab[] = sourceTabs.map((t) => ({
        id: t.id,
        title: t.title,
        ...(t.icon ? { icon: t.icon } : {}),
        body: t.body ?? '',
      }))
      const newDocId = await createWorkhubDocument({
        workspaceId: copyToFolderWorkspaceId,
        projectId: targetProject.id,
        type: (selectedDocument.type === 'note' ? 'note' : 'document') as 'document' | 'note',
        icon: selectedDocument.icon || '🔗',
        title: selectedDocument.title,
        body: sourceHasTabs ? '' : (selectedDocument.body || ''),
        masterPage: selectedDocument.masterPage ?? undefined,
        visibility: 'workspace',
        memberUids: [],
        createdBy: auth.currentUser.uid,
      })
      const referencePatch: Parameters<typeof updateWorkhubDocument>[1] = {
        isLocked: true,
        lockedBy: auth.currentUser.uid,
        lockedAt: new Date().toISOString() as unknown as undefined,
        referenceSourceDocumentId: selectedDocument.id,
        referenceSourceWorkspaceId: selectedDocument.workspaceId,
        referenceSourceProjectId: selectedDocument.projectId || null,
        referenceTabIds: sourceHasTabs ? tabsToReference.map((tab) => tab.id) : [],
        body: sourceHasTabs ? '' : (selectedDocument.body || ''),
        tabs: sourceHasTabs ? tabsToReference : [],
      }
      await updateWorkhubDocument(newDocId, referencePatch)

      await createActivity({
        workspaceId: copyToFolderWorkspaceId,
        actorUid: auth.currentUser.uid,
        entityType: 'document',
        entityId: newDocId,
        action: 'reference_create',
        message: `Referenced document ${selectedDocument.title}`,
      })

      await updateWorkhubDocument(selectedDocument.id, { hasOutgoingReferences: true })
      await refreshSourceReferenceDocuments()
      setCopyToFolderDialogOpen(false)
      showToast({ type: 'success', message: `Referenced in "${targetProject.name}" (read-only).` })
    } catch (err) {
      console.error('[copyToFolder]', err)
      showToast({ type: 'error', message: 'Could not create reference.' })
    } finally {
      setCopyToFolderSaving(false)
    }
  }

  async function handleResolveAllTabsSharingForNewTab(existingTabIds: string[]): Promise<boolean> {
    if (!selectedDocument || selectedDocument.referenceSourceDocumentId) return true
    const normalizedTabIds = Array.from(new Set(existingTabIds.filter(Boolean)))
    if (normalizedTabIds.length === 0) return true

    const allTabReferences = sourceReferenceDocuments.filter((refDoc) => {
      const selectedTabIds = Array.isArray(refDoc.referenceTabIds) ? refDoc.referenceTabIds : []
      return selectedTabIds.length === 0
    })
    if (allTabReferences.length === 0) return true

    try {
      await Promise.all(
        allTabReferences.map((refDoc) => updateWorkhubDocument(refDoc.id, { referenceTabIds: normalizedTabIds })),
      )
      await refreshSourceReferenceDocuments()
      showToast({ type: 'success', message: 'New tab remains unshared. Existing references now use selected tabs.' })
      return true
    } catch (error) {
      showToast({ type: 'error', message: error instanceof Error ? error.message : 'Could not update all-tab sharing mode.' })
      return false
    }
  }

  async function handleUpdateDocumentReference(referenceDocumentId: string) {
    if (!selectedDocument || !auth.currentUser) return
    if (selectedDocument.referenceSourceDocumentId) {
      showToast({ type: 'warning', message: 'Open the source document to update references.' })
      return
    }
    if (!selectedDocumentCanEdit) {
      showToast({ type: 'warning', message: 'You only have view access to this document.' })
      return
    }
    const referenceDoc = sourceReferenceDocuments.find((doc) => doc.id === referenceDocumentId)
    if (!referenceDoc) {
      showToast({ type: 'error', message: 'Reference not found.' })
      return
    }

    const allTabs: WorkhubDocumentTab[] = Array.isArray(selectedDocument.tabs) ? selectedDocument.tabs : []
    if (allTabs.length > 0 && copyTabSelection.length === 0) {
      showToast({ type: 'warning', message: 'Choose at least one tab to reference.' })
      return
    }

    setBusyKey(`document-reference-update:${referenceDocumentId}`)
    try {
      const tabsToReference: WorkhubDocumentTab[] = allTabs
        .filter((tab) => copyTabSelection.includes(tab.id))
        .map((tab) => ({
          id: tab.id,
          title: tab.title,
          ...(tab.icon ? { icon: tab.icon } : {}),
          body: tab.body ?? '',
        }))

      const patch: Parameters<typeof updateWorkhubDocument>[1] = {
        title: selectedDocument.title,
        icon: selectedDocument.icon,
        masterPage: selectedDocument.masterPage ?? undefined,
        body: allTabs.length > 0 ? '' : (selectedDocument.body || ''),
        tabs: allTabs.length > 0 ? tabsToReference : [],
        referenceTabIds: allTabs.length > 0 ? tabsToReference.map((tab) => tab.id) : [],
        referenceSourceDocumentId: selectedDocument.id,
        referenceSourceWorkspaceId: selectedDocument.workspaceId,
        referenceSourceProjectId: selectedDocument.projectId || null,
      }

      await updateWorkhubDocument(referenceDocumentId, patch)
      await createActivity({
        workspaceId: referenceDoc.workspaceId,
        actorUid: auth.currentUser.uid,
        entityType: 'document',
        entityId: referenceDocumentId,
        action: 'reference_update',
        message: `Updated reference for document ${selectedDocument.title}`,
      })

      await refreshSourceReferenceDocuments()
      showToast({ type: 'success', message: 'Reference updated.' })
    } catch (error) {
      showToast({ type: 'error', message: error instanceof Error ? error.message : 'Could not update reference.' })
    } finally {
      setBusyKey('')
    }
  }

  async function handleRemoveDocumentReference(referenceDocumentId: string) {
    if (!selectedDocument || !auth.currentUser) return
    if (!selectedDocumentCanEdit) {
      showToast({ type: 'warning', message: 'You only have view access to this document.' })
      return
    }
    setBusyKey(`document-reference-remove:${referenceDocumentId}`)
    try {
      await deleteDocument(referenceDocumentId)
      await createActivity({
        workspaceId: selectedDocument.workspaceId,
        actorUid: auth.currentUser.uid,
        entityType: 'document',
        entityId: selectedDocument.id,
        action: 'reference_remove',
        message: `Stopped a reference for document ${selectedDocument.title}`,
      })
      await refreshSourceReferenceDocuments()
      showToast({ type: 'success', message: 'Reference removed.' })
    } catch (error) {
      showToast({ type: 'error', message: error instanceof Error ? error.message : 'Could not remove reference.' })
    } finally {
      setBusyKey('')
    }
  }

  function handleOpenReferenceSourceDocument() {
    const sourceDocumentId = selectedDocument?.referenceSourceDocumentId
    const sourceWorkspaceId = selectedDocument?.referenceSourceWorkspaceId
    if (!sourceDocumentId) return
    if (sourceWorkspaceId && sourceWorkspaceId !== selectedWorkspaceId) {
      showToast({ type: 'warning', message: 'Source document is in another workspace. Switch workspaces to open it.' })
      return
    }
    setSelectedDocumentId(sourceDocumentId)
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
    collaborationConflictBlocked,
    collaborationConflictUpdatedAtMs,
    collaborationConflictEditorUid,
    selectedDocumentHasOutgoingReferences,
    sourceReferencedTabIds,
    publicReferenceAutoSaveBlocked,
    recoverableDraftAvailable: !!recoverableDraft,
    recoverableDraftUpdatedAt: recoverableDraft?.updatedAt ?? null,
    handleApplyCollaborationRemoteUpdate,
    handleKeepLocalEditsAfterConflict,
    handleRestoreRecoverableDraft,
    handleDiscardRecoverableDraft,

    canUnlockDocument,

    copyToFolderDialogOpen,
    copyToFolderSaving,
    copyToFolderWorkspaceId,
    copyToFolderProjectId,
    copyTabMode,
    copyTabSelection,
    highlightedRefDocId,
    setHighlightedRefDocId,
    sourceReferenceDocuments,
    copyToFolderAvailableProjects,
    setCopyToFolderDialogOpen,
    setCopyToFolderWorkspaceId,
    setCopyToFolderProjectId,
    setCopyTabMode,
    setCopyTabSelection,
    handleResolveAllTabsSharingForNewTab,
    handleCopyDocumentToFolder,
    handleUpdateDocumentReference,
    handleRemoveDocumentReference,
    handleOpenReferenceSourceDocument,
  }
}
