import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { ChevronRight, Folders, Link2, Loader } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  WorkflowBuilderCanvas,
  createWorkflowBuilderSampleWorkflow,
  type WorkflowBuilderDefinition,
  type WorkflowBuilderNotice,
} from '../features/workflowBuilder'
import { useStudioProjectSelection, type PersistedStudioSelection } from '../hooks/useStudioProjectSelection'
import {
  listProjectFlowCanvases,
  listProjectFolders,
  loadProjectFlowCanvasState,
  moveProjectFlowCanvas,
  renameProjectFlowCanvas,
  saveProjectFlowCanvasState,
  type StudioProjectFlowCanvasSummary,
} from '../lib/studioService'
import { useToast } from '../lib/ToastContext'
import { auth, db } from '../lib/firebase'
import type { FolderSummary } from '../types/studio'
import './WorkflowBuilderTestPage.css'

const WORKFLOW_TEST_SELECTION_STORAGE_KEY = 'workflow-builder-test:studio-selection:v1'
const FLOW_ROOT_FOLDER_VALUE = '__root__'
const LEGACY_WORKFLOW_FIELDS = [
  'workflowBuilderTestCanvasState',
  'workflowBuilderCanvasState',
  'workflowBuilderCanvas',
  'workflowCanvasState',
]

type UnknownRecord = Record<string, unknown>
type FlowManagerMode = 'create' | 'open' | 'sample'
type QuickNavProjectData = {
  folders: FolderSummary[]
  flows: StudioProjectFlowCanvasSummary[]
}

type OpenFlowOptions = {
  closeOverlays?: boolean
  replaceHistory?: boolean
}

const readPersistedSelection = (): PersistedStudioSelection | null => {
  if (typeof window === 'undefined') return null
  const raw = window.localStorage.getItem(WORKFLOW_TEST_SELECTION_STORAGE_KEY)
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw) as Partial<PersistedStudioSelection> | null
    return {
      projectId: typeof parsed?.projectId === 'string' ? parsed.projectId : null,
      folderId: typeof parsed?.folderId === 'string' ? parsed.folderId : null,
    }
  } catch {
    return null
  }
}

const writePersistedSelection = (selection: PersistedStudioSelection) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(WORKFLOW_TEST_SELECTION_STORAGE_KEY, JSON.stringify(selection))
}

function resolveFolderPath(folderId: string | null, folders: FolderSummary[]) {
  if (!folderId) {
    return {
      ids: [] as string[],
      names: [] as string[],
    }
  }

  const folderById = new Map<string, FolderSummary>(folders.map((folder) => [folder.id, folder]))
  const ids: string[] = []
  const names: string[] = []
  let cursorId: string | null = folderId
  const guard = new Set<string>()

  while (cursorId) {
    if (guard.has(cursorId)) break
    guard.add(cursorId)
    const current = folderById.get(cursorId)
    if (!current) break
    ids.unshift(current.id)
    names.unshift(current.name)
    cursorId = current.parentId || null
  }

  return { ids, names }
}

function normalizeLegacyWorkflow(value: unknown): WorkflowBuilderDefinition | null {
  if (typeof value === 'string') {
    try {
      return normalizeLegacyWorkflow(JSON.parse(value))
    } catch {
      return null
    }
  }

  if (!value || typeof value !== 'object') {
    return null
  }

  const record = value as UnknownRecord
  const maybeNodes = record.nodes
  const maybeEdges = record.edges
  if (Array.isArray(maybeNodes) && Array.isArray(maybeEdges)) {
    const maybeViewport = record.viewport as { x?: unknown; y?: unknown; zoom?: unknown } | undefined
    const normalizedViewport = (
      maybeViewport
      && Number.isFinite(maybeViewport.x)
      && Number.isFinite(maybeViewport.y)
      && Number.isFinite(maybeViewport.zoom)
    )
      ? {
          x: Number(maybeViewport.x),
          y: Number(maybeViewport.y),
          zoom: Number(maybeViewport.zoom),
        }
      : undefined

    return {
      nodes: maybeNodes as WorkflowBuilderDefinition['nodes'],
      edges: maybeEdges as WorkflowBuilderDefinition['edges'],
      viewport: normalizedViewport,
    }
  }

  return normalizeLegacyWorkflow(record.workflow)
}

function extractLegacyWorkflow(userDocData: UnknownRecord): WorkflowBuilderDefinition | null {
  for (const fieldName of LEGACY_WORKFLOW_FIELDS) {
    const candidate = normalizeLegacyWorkflow(userDocData[fieldName])
    if (candidate) {
      return candidate
    }
  }

  for (const value of Object.values(userDocData)) {
    const candidate = normalizeLegacyWorkflow(value)
    if (candidate) {
      return candidate
    }
  }

  return null
}

function formatFlowLocation(flow: StudioProjectFlowCanvasSummary | null): string {
  if (!flow) return 'Project root'
  return flow.folderPathNames.length > 0 ? flow.folderPathNames.join(' / ') : 'Project root'
}

function isPermissionDeniedError(error: unknown): boolean {
  const code = typeof (error as { code?: unknown })?.code === 'string' ? String((error as { code?: string }).code) : ''
  const message = typeof (error as { message?: unknown })?.message === 'string'
    ? String((error as { message?: string }).message).toLowerCase()
    : ''
  return code.includes('permission-denied') || message.includes('insufficient permissions')
}

export default function WorkflowBuilderTestPage() {
  const { showToast } = useToast()
  const showToastRef = useRef(showToast)
  const lastErrorToastRef = useRef<{ key: string; at: number }>({ key: '', at: 0 })
  const navigate = useNavigate()
  const { flowId: routeFlowIdParam } = useParams<{ flowId?: string }>()
  const routeFlowId = routeFlowIdParam || ''
  const sampleWorkflow = useMemo(() => createWorkflowBuilderSampleWorkflow(), [])
  const [, setWorkflow] = useState<WorkflowBuilderDefinition>(sampleWorkflow)
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser)
  const [flowItems, setFlowItems] = useState<StudioProjectFlowCanvasSummary[]>([])
  const [isFlowHydrating, setIsFlowHydrating] = useState(false)
  const [flowsLoading, setFlowsLoading] = useState(false)
  const [activeFlowScopeId, setActiveFlowScopeId] = useState<string | null>(null)
  const [draftFlowName, setDraftFlowName] = useState('')
  const [moveTargetFolderId, setMoveTargetFolderId] = useState<string | null>(null)
  const [isRenamingFlow, setIsRenamingFlow] = useState(false)
  const [isMovingFlow, setIsMovingFlow] = useState(false)
  const [isFlowManagerOpen, setIsFlowManagerOpen] = useState(false)
  const [managerMode, setManagerMode] = useState<FlowManagerMode>('create')
  const [managerFlowName, setManagerFlowName] = useState('Untitled Flow')
  const [managerOpenScopeId, setManagerOpenScopeId] = useState<string | null>(null)
  const [isCreatingFlow, setIsCreatingFlow] = useState(false)
  const [legacyRecoveryAttemptKey, setLegacyRecoveryAttemptKey] = useState('')
  const [cloudWriteBlocked, setCloudWriteBlocked] = useState(false)
  const [isQuickNavOpen, setIsQuickNavOpen] = useState(false)
  const [quickNavLoading, setQuickNavLoading] = useState(false)
  const [quickNavData, setQuickNavData] = useState<Record<string, QuickNavProjectData>>({})
  const [quickNavLoadedAt, setQuickNavLoadedAt] = useState(0)
  const quickNavRef = useRef<HTMLDivElement | null>(null)
  const routeResolveKeyRef = useRef('')
  const authUid = currentUser?.uid || ''

  useEffect(() => {
    showToastRef.current = showToast
  }, [showToast])

  const buildFlowPath = useCallback((scopeId: string) => `/canvas/f/${scopeId}`, [])

  const buildFlowAbsoluteUrl = useCallback((scopeId: string) => {
    if (typeof window === 'undefined') return buildFlowPath(scopeId)
    return `${window.location.origin}${buildFlowPath(scopeId)}`
  }, [buildFlowPath])

  const showErrorToastDeduped = useCallback((message: string, dedupeKey: string) => {
    const now = Date.now()
    const previous = lastErrorToastRef.current
    if (previous.key === dedupeKey && now - previous.at < 5000) {
      return
    }
    lastErrorToastRef.current = { key: dedupeKey, at: now }
    showToastRef.current({ message, type: 'error' })
  }, [])

  const handleProjectsError = useCallback((error: unknown) => {
    const message = (error as Error)?.message || 'Could not load projects.'
    showErrorToastDeduped(message, `projects:${message}`)
  }, [showErrorToastDeduped])

  const handleFoldersError = useCallback((error: unknown) => {
    const message = (error as Error)?.message || 'Could not load folders.'
    showErrorToastDeduped(message, `folders:${message}`)
  }, [showErrorToastDeduped])

  const {
    studioProjectId,
    setStudioProjectId,
    studioProjects,
    studioProjectsLoading,
    studioActiveFolderId,
    setStudioActiveFolderId,
    studioFolders,
    studioFoldersLoading,
  } = useStudioProjectSelection({
    authUid,
    readLocalSelection: readPersistedSelection,
    writeLocalSelection: writePersistedSelection,
    selectionPriority: 'user-prefs',
    initialProjectsLoading: Boolean(authUid),
    persistUserPrefs: Boolean(authUid),
    onProjectsError: handleProjectsError,
    onFoldersError: handleFoldersError,
  })

  useEffect(() => {
    return onAuthStateChanged(auth, (nextUser) => {
      setCurrentUser(nextUser)
    })
  }, [])

  useEffect(() => {
    if (!isQuickNavOpen) return

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (quickNavRef.current && target && !quickNavRef.current.contains(target)) {
        setIsQuickNavOpen(false)
      }
    }

    window.addEventListener('pointerdown', onPointerDown)
    return () => {
      window.removeEventListener('pointerdown', onPointerDown)
    }
  }, [isQuickNavOpen])

  const selectedProjectName = useMemo(
    () => studioProjects.find((project) => project.id === studioProjectId)?.name || '',
    [studioProjectId, studioProjects],
  )

  const selectedFlow = useMemo(
    () => flowItems.find((item) => item.scopeId === activeFlowScopeId) || null,
    [activeFlowScopeId, flowItems],
  )

  const groupedFlowOptions = useMemo(() => {
    const groups = new Map<string, { label: string; flows: StudioProjectFlowCanvasSummary[] }>()
    flowItems.forEach((flow) => {
      const groupLabel = flow.folderPathNames.length > 0 ? flow.folderPathNames.join(' / ') : 'Project root'
      const groupKey = flow.folderPathIds.length > 0 ? flow.folderPathIds.join('/') : FLOW_ROOT_FOLDER_VALUE
      const existing = groups.get(groupKey)
      if (existing) {
        existing.flows.push(flow)
        return
      }
      groups.set(groupKey, {
        label: groupLabel,
        flows: [flow],
      })
    })

    return Array.from(groups.values())
      .map((group) => ({
        ...group,
        flows: [...group.flows].sort((a, b) => a.flowName.localeCompare(b.flowName)),
      }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [flowItems])

  const managerOpenFlow = useMemo(
    () => flowItems.find((item) => item.scopeId === managerOpenScopeId) || null,
    [flowItems, managerOpenScopeId],
  )

  const effectiveFlowFolderId = selectedFlow?.folderId ?? studioActiveFolderId
  const effectiveFlowFolderPath = useMemo(
    () => resolveFolderPath(effectiveFlowFolderId, studioFolders),
    [effectiveFlowFolderId, studioFolders],
  )

  const flowScope = useMemo(() => activeFlowScopeId || '', [activeFlowScopeId])

  const flowStorageKey = useMemo(
    () => `workflow-builder-canvas-page-v3:${studioProjectId || 'no-project'}:${flowScope || 'no-flow'}`,
    [flowScope, studioProjectId],
  )

  const loadProjectFlows = useCallback(async (
    projectId: string,
    preferredScopeId?: string | null,
  ) => {
    setFlowsLoading(true)
    try {
      const items = await listProjectFlowCanvases(projectId)
      setFlowItems(items)
      setActiveFlowScopeId((current) => {
        if (preferredScopeId && items.some((item: StudioProjectFlowCanvasSummary) => item.scopeId === preferredScopeId)) {
          return preferredScopeId
        }
        if (current && items.some((item: StudioProjectFlowCanvasSummary) => item.scopeId === current)) {
          return current
        }
        return items[0]?.scopeId || null
      })
      setManagerOpenScopeId((current) => {
        if (current && items.some((item: StudioProjectFlowCanvasSummary) => item.scopeId === current)) {
          return current
        }
        return items[0]?.scopeId || null
      })
    } catch (error) {
      const message = (error as Error)?.message || 'Could not load flows.'
      showErrorToastDeduped(message, `flows:${projectId}:${message}`)
      setFlowItems([])
      setActiveFlowScopeId(null)
      setManagerOpenScopeId(null)
    } finally {
      setFlowsLoading(false)
    }
  }, [showErrorToastDeduped])

  const loadQuickNavData = useCallback(async () => {
    if (!authUid || studioProjects.length === 0) {
      setQuickNavData({})
      return
    }

    setQuickNavLoading(true)
    try {
      const results = await Promise.all(
        studioProjects.map(async (project) => {
          try {
            const [folders, flows] = await Promise.all([
              listProjectFolders(project.id, { userId: authUid, role: project.role || null }),
              listProjectFlowCanvases(project.id),
            ])
            return [project.id, { folders, flows }] as const
          } catch (error) {
            const message = (error as Error)?.message || 'Could not load quick navigator data.'
            showErrorToastDeduped(message, `quick-nav:${project.id}:${message}`)
            return [project.id, { folders: [], flows: [] }] as const
          }
        }),
      )

      setQuickNavData(Object.fromEntries(results))
      setQuickNavLoadedAt(Date.now())
    } finally {
      setQuickNavLoading(false)
    }
  }, [authUid, showErrorToastDeduped, studioProjects])

  useEffect(() => {
    if (!studioProjectId) {
      setFlowItems([])
      setActiveFlowScopeId(null)
      setManagerOpenScopeId(null)
      setFlowsLoading(false)
      setCloudWriteBlocked(false)
      return
    }

    void loadProjectFlows(studioProjectId, routeFlowId || undefined)
  }, [loadProjectFlows, routeFlowId, studioProjectId])

  useEffect(() => {
    if (!routeFlowId || !authUid || studioProjectsLoading || studioProjects.length === 0) {
      return
    }

    const signature = `${authUid}:${routeFlowId}:${studioProjects.map((project) => project.id).join(',')}`
    if (routeResolveKeyRef.current === signature) {
      return
    }
    routeResolveKeyRef.current = signature

    void (async () => {
      if (studioProjectId) {
        const existing = flowItems.find((item) => item.scopeId === routeFlowId)
        if (existing) {
          setActiveFlowScopeId(existing.scopeId)
          setStudioActiveFolderId(existing.folderId || null)
          return
        }
      }

      for (const project of studioProjects) {
        try {
          const items = await listProjectFlowCanvases(project.id)
          const match = items.find((item: StudioProjectFlowCanvasSummary) => item.scopeId === routeFlowId)
          if (!match) continue

          setStudioProjectId(project.id)
          setStudioActiveFolderId(match.folderId || null)
          await loadProjectFlows(project.id, match.scopeId)
          setActiveFlowScopeId(match.scopeId)
          setManagerOpenScopeId(match.scopeId)
          return
        } catch {
          // continue probing other projects
        }
      }

      showErrorToastDeduped('Flow URL was not found or you do not have access.', `flow-url-missing:${routeFlowId}`)
    })()
  }, [
    authUid,
    flowItems,
    loadProjectFlows,
    routeFlowId,
    setStudioActiveFolderId,
    setStudioProjectId,
    showErrorToastDeduped,
    studioProjectId,
    studioProjects,
    studioProjectsLoading,
  ])

  useEffect(() => {
    setDraftFlowName(selectedFlow?.flowName || '')
    setMoveTargetFolderId(selectedFlow?.folderId || studioActiveFolderId || null)
  }, [selectedFlow?.flowName, selectedFlow?.folderId, studioActiveFolderId])

  useEffect(() => {
    if (!managerOpenFlow) {
      return
    }
    setDraftFlowName(managerOpenFlow.flowName)
    setMoveTargetFolderId(managerOpenFlow.folderId)
  }, [managerOpenFlow])

  const openFlow = useCallback(async (
    projectId: string,
    flow: StudioProjectFlowCanvasSummary,
    options?: OpenFlowOptions,
  ) => {
    setIsFlowHydrating(true)
    setStudioProjectId(projectId)
    setStudioActiveFolderId(flow.folderId || null)
    await loadProjectFlows(projectId, flow.scopeId)
    setActiveFlowScopeId(flow.scopeId)
    setManagerOpenScopeId(flow.scopeId)

    navigate(buildFlowPath(flow.scopeId), { replace: Boolean(options?.replaceHistory) })

    if (options?.closeOverlays !== false) {
      setIsFlowManagerOpen(false)
      setIsQuickNavOpen(false)
    }
  }, [buildFlowPath, loadProjectFlows, navigate, setStudioActiveFolderId, setStudioProjectId])

  useEffect(() => {
    if (!selectedFlow) {
      setIsFlowHydrating(false)
    }
  }, [selectedFlow])

  const createFlowDocument = useCallback(async (
    options: {
      flowName: string
      workflow: WorkflowBuilderDefinition
      folderId: string | null
    },
  ) => {
    if (!studioProjectId || !authUid) {
      return null
    }

    const scopeId = `flow-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const folderPath = resolveFolderPath(options.folderId, studioFolders)

    await saveProjectFlowCanvasState({
      projectId: studioProjectId,
      scopeId,
      flowName: options.flowName.trim() || 'Untitled Flow',
      folderId: options.folderId,
      folderPathIds: folderPath.ids,
      folderPathNames: folderPath.names,
      updatedBy: authUid,
      workflow: {
        nodes: options.workflow.nodes as unknown[],
        edges: options.workflow.edges as unknown[],
        viewport: options.workflow.viewport,
      },
    })

    return scopeId
  }, [authUid, studioFolders, studioProjectId])

  useEffect(() => {
    if (!authUid || !studioProjectId || flowsLoading || flowItems.length > 0) {
      return
    }

    const attemptKey = `${authUid}:${studioProjectId}`
    if (attemptKey === legacyRecoveryAttemptKey) {
      return
    }
    setLegacyRecoveryAttemptKey(attemptKey)

    void (async () => {
      try {
        const legacySnapshot = await getDoc(doc(db, 'users', authUid))
        if (!legacySnapshot.exists()) {
          return
        }

        const recoveredWorkflow = extractLegacyWorkflow(legacySnapshot.data() as UnknownRecord)
        if (!recoveredWorkflow) {
          return
        }

        const recoveredScopeId = await createFlowDocument({
          flowName: 'Recovered Canvas',
          folderId: null,
          workflow: recoveredWorkflow,
        })
        if (!recoveredScopeId || !studioProjectId) {
          return
        }

        const refreshed = await listProjectFlowCanvases(studioProjectId)
        const recoveredFlow = refreshed.find((item: StudioProjectFlowCanvasSummary) => item.scopeId === recoveredScopeId) || null
        if (!recoveredFlow) {
          return
        }

        setCloudWriteBlocked(false)
        await openFlow(studioProjectId, recoveredFlow, { closeOverlays: false })
        setIsFlowManagerOpen(true)
        setManagerMode('open')
        showToastRef.current({
          message: 'Recovered your previously saved canvas from Firebase. You can now open and move it.',
          type: 'success',
        })
      } catch (error) {
        if (isPermissionDeniedError(error)) {
          setCloudWriteBlocked(true)
        }
        const message = (error as Error)?.message || 'Could not recover the previously saved canvas.'
        showErrorToastDeduped(message, `recover:${studioProjectId}:${message}`)
      }
    })()
  }, [
    authUid,
    createFlowDocument,
    flowItems.length,
    flowsLoading,
    legacyRecoveryAttemptKey,
    openFlow,
    showErrorToastDeduped,
    studioProjectId,
  ])

  const openManager = useCallback((mode: FlowManagerMode) => {
    setManagerMode(mode)
    setIsFlowManagerOpen(true)

    if (mode === 'create') {
      setManagerFlowName(`Untitled Flow ${flowItems.length + 1}`)
    } else if (mode === 'sample') {
      setManagerFlowName('Sample Starter Flow')
    } else {
      setManagerOpenScopeId(activeFlowScopeId || flowItems[0]?.scopeId || null)
    }
  }, [activeFlowScopeId, flowItems])

  const closeManager = useCallback(() => {
    setIsFlowManagerOpen(false)
  }, [])

  const toggleQuickNav = useCallback(() => {
    const nextOpen = !isQuickNavOpen
    setIsQuickNavOpen(nextOpen)

    if (nextOpen && Date.now() - quickNavLoadedAt > 15000) {
      void loadQuickNavData()
    }
  }, [isQuickNavOpen, loadQuickNavData, quickNavLoadedAt])

  const handleTopProjectSelect = useCallback((nextProjectId: string | null) => {
    if (!nextProjectId || nextProjectId === studioProjectId) {
      return
    }

    setStudioProjectId(nextProjectId)
    setStudioActiveFolderId(null)
    setActiveFlowScopeId(null)
    setManagerOpenScopeId(null)
    setQuickNavLoadedAt(0)
    navigate('/canvas', { replace: true })
  }, [navigate, setStudioActiveFolderId, setStudioProjectId, studioProjectId])

  const handleTopFolderSelect = useCallback((nextFolderRaw: string) => {
    if (!studioProjectId) {
      return
    }

    const nextFolderId = nextFolderRaw === FLOW_ROOT_FOLDER_VALUE ? null : nextFolderRaw
    setStudioActiveFolderId(nextFolderId)

    const candidate = flowItems.find((item) => (item.folderId || null) === (nextFolderId || null)) || null
    if (candidate) {
      void openFlow(studioProjectId, candidate, { closeOverlays: false, replaceHistory: true })
      return
    }

    setActiveFlowScopeId(null)
    setManagerOpenScopeId(null)
    navigate('/canvas', { replace: true })
  }, [flowItems, navigate, openFlow, setStudioActiveFolderId, studioProjectId])

  const handleTopFlowSelect = useCallback((scopeId: string | null) => {
    if (!studioProjectId || !scopeId) {
      return
    }

    const target = flowItems.find((item) => item.scopeId === scopeId) || null
    if (!target) {
      return
    }

    void openFlow(studioProjectId, target, { closeOverlays: false, replaceHistory: true })
  }, [flowItems, openFlow, studioProjectId])

  const handleCreateOrSampleFlow = useCallback(async (useSample: boolean) => {
    if (!studioProjectId || !authUid) {
      showToastRef.current({ message: 'Select a project and sign in first.', type: 'warning' })
      return
    }

    const normalizedName = managerFlowName.trim() || (useSample ? 'Sample Starter Flow' : 'Untitled Flow')
    setIsCreatingFlow(true)
    try {
      const scopeId = await createFlowDocument({
        flowName: normalizedName,
        folderId: studioActiveFolderId,
        workflow: useSample ? sampleWorkflow : { nodes: [], edges: [] },
      })
      if (!scopeId) {
        return
      }

      const items = await listProjectFlowCanvases(studioProjectId)
      const createdFlow = items.find((item: StudioProjectFlowCanvasSummary) => item.scopeId === scopeId) || null
      if (!createdFlow) {
        return
      }

      setCloudWriteBlocked(false)
      await openFlow(studioProjectId, createdFlow)
      setQuickNavLoadedAt(0)
      showToastRef.current({
        message: useSample ? 'Sample flow created.' : 'New flow created.',
        type: 'success',
      })
    } catch (error) {
      if (isPermissionDeniedError(error)) {
        setCloudWriteBlocked(true)
      }
      const message = (error as Error)?.message || 'Could not create flow.'
      showErrorToastDeduped(message, `create-flow:${studioProjectId}:${message}`)
    } finally {
      setIsCreatingFlow(false)
    }
  }, [
    authUid,
    createFlowDocument,
    managerFlowName,
    openFlow,
    sampleWorkflow,
    showErrorToastDeduped,
    studioActiveFolderId,
    studioProjectId,
  ])

  const handleOpenExistingFlow = useCallback(async () => {
    if (!managerOpenScopeId || !studioProjectId) {
      showToastRef.current({ message: 'Select a flow to open.', type: 'warning' })
      return
    }

    const targetFlow = flowItems.find((item) => item.scopeId === managerOpenScopeId) || null
    if (!targetFlow) {
      showToastRef.current({ message: 'Selected flow is no longer available.', type: 'warning' })
      return
    }

    await openFlow(studioProjectId, targetFlow)
  }, [flowItems, managerOpenScopeId, openFlow, studioProjectId])

  const renameFlow = useCallback(async () => {
    if (!studioProjectId || !activeFlowScopeId) return
    const normalized = draftFlowName.trim() || 'Untitled Flow'

    setIsRenamingFlow(true)
    try {
      await renameProjectFlowCanvas(studioProjectId, activeFlowScopeId, normalized)
      setCloudWriteBlocked(false)
      setDraftFlowName(normalized)
      await loadProjectFlows(studioProjectId, activeFlowScopeId)
      setQuickNavLoadedAt(0)
      showToastRef.current({ message: 'Flow renamed.', type: 'success' })
    } catch (error) {
      if (isPermissionDeniedError(error)) {
        setCloudWriteBlocked(true)
      }
      const message = (error as Error)?.message || 'Could not rename flow.'
      showErrorToastDeduped(message, `rename-flow:${activeFlowScopeId}:${message}`)
    } finally {
      setIsRenamingFlow(false)
    }
  }, [activeFlowScopeId, draftFlowName, loadProjectFlows, showErrorToastDeduped, studioProjectId])

  const moveFlow = useCallback(async () => {
    if (!studioProjectId || !activeFlowScopeId) return

    setIsMovingFlow(true)
    try {
      const folderPath = resolveFolderPath(moveTargetFolderId, studioFolders)
      await moveProjectFlowCanvas({
        projectId: studioProjectId,
        scopeId: activeFlowScopeId,
        folderId: moveTargetFolderId,
        folderPathIds: folderPath.ids,
        folderPathNames: folderPath.names,
      })
      setCloudWriteBlocked(false)
      setStudioActiveFolderId(moveTargetFolderId)
      await loadProjectFlows(studioProjectId, activeFlowScopeId)
      setQuickNavLoadedAt(0)
      showToastRef.current({ message: 'Flow moved.', type: 'success' })
    } catch (error) {
      if (isPermissionDeniedError(error)) {
        setCloudWriteBlocked(true)
      }
      const message = (error as Error)?.message || 'Could not move flow.'
      showErrorToastDeduped(message, `move-flow:${activeFlowScopeId}:${message}`)
    } finally {
      setIsMovingFlow(false)
    }
  }, [activeFlowScopeId, loadProjectFlows, moveTargetFolderId, setStudioActiveFolderId, showErrorToastDeduped, studioFolders, studioProjectId])

  const readRemoteWorkflow = useCallback(async (): Promise<WorkflowBuilderDefinition | null> => {
    if (!studioProjectId || !flowScope) return null
    const remote = await loadProjectFlowCanvasState(studioProjectId, flowScope)
    if (!remote) return null

    return {
      nodes: remote.nodes as WorkflowBuilderDefinition['nodes'],
      edges: remote.edges as WorkflowBuilderDefinition['edges'],
      viewport: remote.viewport,
    }
  }, [flowScope, studioProjectId])

  const saveRemoteWorkflow = useCallback(async (workflow: WorkflowBuilderDefinition): Promise<void> => {
    if (!studioProjectId || !flowScope || cloudWriteBlocked) return

    try {
      await saveProjectFlowCanvasState({
        projectId: studioProjectId,
        scopeId: flowScope,
        flowName: (selectedFlow?.flowName || draftFlowName || '').trim() || 'Untitled Flow',
        folderId: effectiveFlowFolderId || null,
        folderPathIds: effectiveFlowFolderPath.ids,
        folderPathNames: effectiveFlowFolderPath.names,
        updatedBy: authUid || 'anonymous',
        workflow: {
          nodes: workflow.nodes as unknown[],
          edges: workflow.edges as unknown[],
          viewport: workflow.viewport,
        },
      })
    } catch (error) {
      if (isPermissionDeniedError(error)) {
        setCloudWriteBlocked(true)
        showErrorToastDeduped(
          'You have read-only access to this project flow. Ask for editor access to save, rename, or move.',
          `flow-read-only:${studioProjectId}`,
        )
        return
      }
      throw error
    }
  }, [
    authUid,
    cloudWriteBlocked,
    draftFlowName,
    effectiveFlowFolderId,
    effectiveFlowFolderPath.ids,
    effectiveFlowFolderPath.names,
    flowScope,
    selectedFlow?.flowName,
    showErrorToastDeduped,
    studioProjectId,
  ])

  const handleNotify = useCallback((notice: WorkflowBuilderNotice) => {
    showToastRef.current({
      message: notice.message,
      type: notice.type || 'info',
    })
  }, [])

  const topActionSlot = useMemo(() => (
    <div className="workflow-builder-test-page__top-context-wrap">
      <div className="workflow-builder-test-page__top-context">
        <label className="workflow-builder-test-page__top-context-item">
          <span>Project</span>
          <select
            value={studioProjectId || ''}
            onChange={(event) => handleTopProjectSelect(event.target.value || null)}
            disabled={isFlowHydrating || studioProjectsLoading || studioProjects.length === 0}
          >
            <option value="">Select project</option>
            {studioProjects.map((project) => (
              <option key={project.id} value={project.id}>{project.name}</option>
            ))}
          </select>
        </label>

        <label className="workflow-builder-test-page__top-context-item">
          <span>Folder</span>
          <select
            value={studioActiveFolderId || FLOW_ROOT_FOLDER_VALUE}
            onChange={(event) => handleTopFolderSelect(event.target.value)}
            disabled={isFlowHydrating || !studioProjectId || studioFoldersLoading}
          >
            <option value={FLOW_ROOT_FOLDER_VALUE}>Project root</option>
            {studioFolders.map((folder) => (
              <option key={folder.id} value={folder.id}>{folder.name}</option>
            ))}
          </select>
        </label>

        <label className="workflow-builder-test-page__top-context-item">
          <span>File</span>
          <select
            value={selectedFlow?.scopeId || ''}
            onChange={(event) => handleTopFlowSelect(event.target.value || null)}
            disabled={isFlowHydrating || !studioProjectId || flowItems.length === 0}
          >
            <option value="">Select flow</option>
            {groupedFlowOptions.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.flows.map((flow) => (
                  <option key={flow.scopeId} value={flow.scopeId}>{flow.flowName}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </label>

        {isFlowHydrating ? (
          <div className="workflow-builder-test-page__top-context-loading" role="status" aria-live="polite">
            <Loader className="wf-spin" size={11} /> Loading flow...
          </div>
        ) : null}
      </div>

      <div className="workflow-builder-test-page__quick-nav" ref={quickNavRef}>
        <button
          type="button"
          className="workflow-builder-test-page__quick-nav-trigger"
          onClick={toggleQuickNav}
          title="Open project/folder/flow navigator"
          aria-label="Open project, folder, and flow navigator"
        >
          <Folders size={14} />
        </button>

        {isQuickNavOpen ? (
          <div className="workflow-builder-test-page__quick-nav-menu" onClick={(event) => event.stopPropagation()}>
            <div className="workflow-builder-test-page__quick-nav-head">
              <strong>Flow navigator</strong>
              <button type="button" onClick={() => { void loadQuickNavData() }} disabled={quickNavLoading}>
                {quickNavLoading ? 'Refreshing...' : 'Refresh'}
              </button>
            </div>

            <div className="workflow-builder-test-page__quick-nav-body">
              {studioProjects.map((project) => {
                const bundle = quickNavData[project.id] || { folders: [], flows: [] }
                const flowsByFolderId = new Map<string | null, StudioProjectFlowCanvasSummary[]>()
                bundle.flows.forEach((flow) => {
                  const key = flow.folderId || null
                  const list = flowsByFolderId.get(key) || []
                  list.push(flow)
                  flowsByFolderId.set(key, list)
                })

                const foldersByParent = new Map<string | null, FolderSummary[]>()
                bundle.folders.forEach((folder) => {
                  const key = folder.parentId || null
                  const list = foldersByParent.get(key) || []
                  list.push(folder)
                  foldersByParent.set(key, list)
                })

                const renderFlowEntry = (flow: StudioProjectFlowCanvasSummary) => (
                  <div key={flow.scopeId} className="workflow-builder-test-page__quick-nav-flow">
                    <button
                      type="button"
                      onClick={() => { void openFlow(project.id, flow) }}
                      title={flow.flowName}
                    >
                      <ChevronRight size={12} />
                      <span>{flow.flowName}</span>
                    </button>
                    <a
                      href={buildFlowPath(flow.scopeId)}
                      onClick={(event) => {
                        event.preventDefault()
                        void openFlow(project.id, flow)
                      }}
                      title="Open flow URL"
                    >
                      <Link2 size={11} /> {buildFlowAbsoluteUrl(flow.scopeId)}
                    </a>
                  </div>
                )

                const renderFolderBranch = (parentId: string | null) => {
                  const children = foldersByParent.get(parentId) || []
                  return children.map((folder) => {
                    const folderFlows = flowsByFolderId.get(folder.id) || []
                    return (
                      <div key={`folder-${folder.id}`} className="workflow-builder-test-page__quick-nav-folder-node">
                        <strong className="workflow-builder-test-page__quick-nav-folder-title">{folder.name}</strong>
                        <div className="workflow-builder-test-page__quick-nav-sublist">
                          {folderFlows.map((flow) => renderFlowEntry(flow))}
                          {renderFolderBranch(folder.id)}
                        </div>
                      </div>
                    )
                  })
                }

                const rootFlows = flowsByFolderId.get(null) || []

                return (
                  <section key={project.id} className="workflow-builder-test-page__quick-nav-project">
                    <header>
                      <button
                        type="button"
                        onClick={() => {
                          setStudioProjectId(project.id)
                          setStudioActiveFolderId(null)
                        }}
                      >
                        {project.name}
                      </button>
                    </header>
                    <div className="workflow-builder-test-page__quick-nav-tree">
                      <div className="workflow-builder-test-page__quick-nav-folder-node">
                        <strong className="workflow-builder-test-page__quick-nav-folder-title">Project root</strong>
                        <div className="workflow-builder-test-page__quick-nav-sublist">
                          {rootFlows.map((flow) => renderFlowEntry(flow))}
                          {renderFolderBranch(null)}
                        </div>
                      </div>
                    </div>
                  </section>
                )
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  ), [
    buildFlowAbsoluteUrl,
    buildFlowPath,
    flowItems,
    groupedFlowOptions,
    handleTopFlowSelect,
    handleTopFolderSelect,
    handleTopProjectSelect,
    isFlowHydrating,
    isQuickNavOpen,
    loadQuickNavData,
    openFlow,
    quickNavData,
    quickNavLoading,
    selectedFlow?.scopeId,
    studioActiveFolderId,
    studioFolders,
    studioFoldersLoading,
    studioProjectId,
    setStudioActiveFolderId,
    setStudioProjectId,
    studioProjects,
    studioProjectsLoading,
    toggleQuickNav,
  ])

  return (
    <div className="workflow-builder-test-page">
      {selectedFlow ? (
        <button
          type="button"
          className="workflow-builder-test-page__manager-launch"
          onClick={() => openManager('open')}
        >
          Flow manager
        </button>
      ) : null}

      {isFlowManagerOpen ? (
        <div
          className="workflow-builder-test-page__dialog-backdrop"
          onClick={closeManager}
          role="presentation"
        >
          <section
            className="workflow-builder-test-page__dialog"
            role="dialog"
            aria-modal="true"
            aria-label="Flow manager"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="workflow-builder-test-page__dialog-header">
              <h2>
                {managerMode === 'create' ? 'Create new flow' : managerMode === 'sample' ? 'Load sample flow' : 'Open existing flow'}
              </h2>
              <button
                type="button"
                className="workflow-builder-test-page__dialog-close"
                onClick={closeManager}
              >
                Close
              </button>
            </header>

            <div className="workflow-builder-test-page__dialog-grid">
              <label className="workflow-builder-test-page__field">
                <span>Project</span>
                <select
                  value={studioProjectId || ''}
                  onChange={(event) => {
                    const nextProjectId = event.target.value || null
                    setStudioProjectId(nextProjectId)
                    setStudioActiveFolderId(null)
                    setActiveFlowScopeId(null)
                    setManagerOpenScopeId(null)
                  }}
                  disabled={!authUid || studioProjectsLoading}
                >
                  <option value="">{studioProjectsLoading ? 'Loading projects...' : 'Select project'}</option>
                  {studioProjects.map((project) => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </label>

              {managerMode === 'open' ? (
                <>
                  <label className="workflow-builder-test-page__field workflow-builder-test-page__field--full">
                    <span>Flow</span>
                    <select
                      value={managerOpenScopeId || ''}
                      onChange={(event) => setManagerOpenScopeId(event.target.value || null)}
                      disabled={!studioProjectId || flowsLoading || flowItems.length === 0}
                    >
                      <option value="">{flowsLoading ? 'Loading flows...' : 'Select flow'}</option>
                      {flowItems.map((flow) => (
                        <option key={flow.scopeId} value={flow.scopeId}>
                          {flow.flowName} - {formatFlowLocation(flow)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <button
                    type="button"
                    className="workflow-builder-test-page__action"
                    onClick={() => { void handleOpenExistingFlow() }}
                    disabled={!managerOpenScopeId}
                  >
                    Open flow
                  </button>
                </>
              ) : (
                <>
                  <label className="workflow-builder-test-page__field">
                    <span>Folder</span>
                    <select
                      value={studioActiveFolderId || FLOW_ROOT_FOLDER_VALUE}
                      onChange={(event) => {
                        const nextFolderId = event.target.value === FLOW_ROOT_FOLDER_VALUE ? null : event.target.value
                        setStudioActiveFolderId(nextFolderId)
                      }}
                      disabled={!studioProjectId || studioFoldersLoading}
                    >
                      <option value={FLOW_ROOT_FOLDER_VALUE}>{studioFoldersLoading ? 'Loading folders...' : 'Project root'}</option>
                      {studioFolders.map((folder) => (
                        <option key={folder.id} value={folder.id}>{folder.name}</option>
                      ))}
                    </select>
                  </label>

                  <label className="workflow-builder-test-page__field workflow-builder-test-page__field--full">
                    <span>Flow name</span>
                    <input
                      type="text"
                      value={managerFlowName}
                      onChange={(event) => setManagerFlowName(event.target.value)}
                      placeholder="Flow name"
                      disabled={!studioProjectId}
                    />
                  </label>

                  <button
                    type="button"
                    className="workflow-builder-test-page__action"
                    onClick={() => { void handleCreateOrSampleFlow(managerMode === 'sample') }}
                    disabled={!studioProjectId || !authUid || isCreatingFlow}
                  >
                    {isCreatingFlow ? 'Creating...' : managerMode === 'sample' ? 'Create sample flow' : 'Create and open'}
                  </button>
                </>
              )}
            </div>

            {selectedFlow ? (
              <div className="workflow-builder-test-page__manage-panel">
                <label className="workflow-builder-test-page__field workflow-builder-test-page__field--full">
                  <span>Rename current flow</span>
                  <div className="workflow-builder-test-page__inline-row">
                    <input
                      type="text"
                      value={draftFlowName}
                      onChange={(event) => setDraftFlowName(event.target.value)}
                      placeholder="Flow name"
                      disabled={isRenamingFlow}
                    />
                    <button
                      type="button"
                      className="workflow-builder-test-page__action"
                      onClick={() => { void renameFlow() }}
                      disabled={isRenamingFlow}
                    >
                      {isRenamingFlow ? 'Renaming...' : 'Rename'}
                    </button>
                  </div>
                </label>

                <label className="workflow-builder-test-page__field workflow-builder-test-page__field--full">
                  <span>Move current flow</span>
                  <div className="workflow-builder-test-page__inline-row">
                    <select
                      value={moveTargetFolderId || FLOW_ROOT_FOLDER_VALUE}
                      onChange={(event) => setMoveTargetFolderId(event.target.value === FLOW_ROOT_FOLDER_VALUE ? null : event.target.value)}
                      disabled={isMovingFlow}
                    >
                      <option value={FLOW_ROOT_FOLDER_VALUE}>Project root</option>
                      {studioFolders.map((folder) => (
                        <option key={folder.id} value={folder.id}>{folder.name}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="workflow-builder-test-page__action"
                      onClick={() => { void moveFlow() }}
                      disabled={isMovingFlow}
                    >
                      {isMovingFlow ? 'Moving...' : 'Move'}
                    </button>
                  </div>
                </label>
              </div>
            ) : null}

            <div className="workflow-builder-test-page__scope">
              <div>
                {selectedProjectName || 'No project'} / {formatFlowLocation(selectedFlow)} / {selectedFlow?.flowName || 'No flow selected'}
              </div>
              {selectedFlow ? (
                <a href={buildFlowPath(selectedFlow.scopeId)}>
                  {buildFlowAbsoluteUrl(selectedFlow.scopeId)}
                </a>
              ) : null}
            </div>
          </section>
        </div>
      ) : null}

      <div className="workflow-builder-test-page__canvas">
        {!authUid ? (
          <div className="workflow-builder-test-page__placeholder">Sign in to access Studio projects and folders.</div>
        ) : !selectedFlow ? (
          <div className="workflow-builder-test-page__landing">
            <div className="workflow-builder-test-page__landing-head">
              <h1>Flow Canvas</h1>
              <p>Create from scratch, open existing flows, or load a sample starter.</p>
            </div>

            <div className="workflow-builder-test-page__landing-cards">
              <button
                type="button"
                className="workflow-builder-test-page__landing-card"
                onClick={() => openManager('create')}
                disabled={!authUid}
              >
                <strong>Create New</strong>
                <span>Pick project, folder, and flow name, then open immediately.</span>
              </button>

              <button
                type="button"
                className="workflow-builder-test-page__landing-card"
                onClick={() => openManager('open')}
                disabled={!authUid}
              >
                <strong>Open Existing Flow</strong>
                <span>Browse flows across projects and folders, then continue editing.</span>
              </button>

              <button
                type="button"
                className="workflow-builder-test-page__landing-card"
                onClick={() => openManager('sample')}
                disabled={!authUid}
              >
                <strong>Load Sample</strong>
                <span>Create a sample starter flow with basic nodes for learning the canvas.</span>
              </button>
            </div>

            {cloudWriteBlocked ? (
              <p className="workflow-builder-test-page__warning">
                This project currently allows read-only access. You can open flows, but cloud save and move actions require editor access.
              </p>
            ) : null}
          </div>
        ) : (
          <WorkflowBuilderCanvas
            key={flowStorageKey}
            className="workflow-builder-canvas--fullscreen"
            initialWorkflow={sampleWorkflow}
            storageKey={flowStorageKey}
            readRemoteWorkflow={readRemoteWorkflow}
            saveRemoteWorkflow={cloudWriteBlocked ? undefined : saveRemoteWorkflow}
            onWorkflowChange={setWorkflow}
            onNotify={handleNotify}
            topActionSlot={topActionSlot}
            onRemoteLoadingChange={setIsFlowHydrating}
            onExecuteWorkflow={async () => {
              // handle execution
            }}
          />
        )}
      </div>
    </div>
  )
}
