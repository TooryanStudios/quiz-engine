import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent as ReactDragEvent, type MouseEvent as ReactMouseEvent } from 'react'
import {
  addEdge,
  applyEdgeChanges,
  Background,
  BackgroundVariant,
  ConnectionMode,
  MarkerType,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  reconnectEdge,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
  type EdgeChange,
  type HandleType,
} from '@xyflow/react'
import { Loader, Maximize2, Minus, Play, Plus, Save, Upload } from 'lucide-react'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, deleteDoc, doc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore'
import { WorkflowBuilderCanvasContext } from './WorkflowBuilderCanvasContext'
import { WorkflowBuilderInspector } from './WorkflowBuilderInspector'
import { WorkflowBuilderLibrary } from './WorkflowBuilderLibrary'
import { DEFAULT_STORAGE_KEY, createWorkflowNode, sanitizeWorkflow } from './nodeLibrary'
import { workflowNodeTypes } from './nodes'
import { useGenerationRunner, type GenerationProvider } from '../../hooks/useGenerationRunner'
import { useLabNewLayoutStore } from '../../pages/LabNewLayout/useLabNewLayoutStore'
import { buildToorGenRequest, type ToorGenMediaField, type ToorGenMentionReference } from '../../lib/toorgen/generationRequestBuilder'
import { finalizeGeneratedVideoPersistence, saveGeneratedVideoArtifactsToFirebase } from '../../lib/toorgen/generationPersistence'
import { auth, db, storage } from '../../lib/firebase'
import { getDownloadURL, ref as storageRef, uploadBytesResumable } from 'firebase/storage'
import type {
  WorkflowBuilderCanvasProps,
  WorkflowBuilderDefinition,
  WorkflowBuilderEdge,
  WorkflowBuilderNode,
  WorkflowBuilderNodeData,
  WorkflowBuilderNodeKind,
  WorkflowBuilderNoticeType,
} from './types'
import '@xyflow/react/dist/style.css'
import './workflowBuilderCanvas.css'

const CHATBOT_BASE = (import.meta.env.VITE_CHATBOT_API_URL as string | undefined) || ''
const WORKFLOW_PENDING_TASKS_KEY = 'workflow_builder_pending_tasks_v1'
const WORKFLOW_HISTORY_KEY = 'workflow_builder_generation_history_v1'
const FIRESTORE_PENDING_TASKS_COLLECTION = 'workflow_builder_pending_tasks'
const FIRESTORE_HISTORY_COLLECTION = 'workflow_builder_generation_history'
const DEFAULT_VIDEO_PROMPT = 'create a videos of a falling fantasy book'
const GENERATION_NODE_KINDS = new Set<WorkflowBuilderNodeKind>([
  'generate',
  'gen_text_to_video',
  'gen_image_to_video',
  'gen_video_to_video',
  'gen_images_to_video',
  'gen_image',
  'video_extend',
])

type WorkflowPendingTask = {
  requestId: string
  nodeId: string
  taskId: string
  provider: GenerationProvider
  model: string
  ratio: string
  duration: number
  resolution: string
  generateAudio: boolean
  createdAt: number
  prompt: string
  requestEndpoint: string
  requestPayload: Record<string, unknown>
}

type WorkflowGenerationHistoryEntry = {
  historyId: string
  nodeId: string
  taskId: string
  provider: GenerationProvider
  model: string
  ratio: string
  duration: number
  resolution: string
  generateAudio: boolean
  prompt: string
  requestEndpoint: string
  requestPayload: Record<string, unknown>
  resultUrl: string
  firebaseVideoUrl: string
  storageSaveError: string
  submittedAt: number
  receivedAt: number
  completedAt: number
}

type ReconnectContextMenuState = {
  edgeId: string
  handleType: HandleType
  clientX: number
  clientY: number
  previewAnchorNodeId: string
  originalEdge: WorkflowBuilderEdge
  originalConnection: {
    source: string
    sourceHandle: string | null
    target: string
    targetHandle: string | null
  }
}

const REROUTE_PREVIEW_NODE_SIZE = 28
const REROUTE_PREVIEW_TARGET_HANDLE_Y = REROUTE_PREVIEW_NODE_SIZE / 2

const extractPointerClient = (event: MouseEvent | TouchEvent): { clientX: number; clientY: number } => {
  if ('touches' in event) {
    const touch = event.touches[0] || event.changedTouches[0]
    if (touch) {
      return { clientX: touch.clientX, clientY: touch.clientY }
    }
  }
  return {
    clientX: (event as MouseEvent).clientX,
    clientY: (event as MouseEvent).clientY,
  }
}

const firstNonEmptyString = (...values: unknown[]): string => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return ''
}

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
)

const parseJsonSafely = (rawText: string): unknown => {
  if (!rawText.trim()) return {}
  try {
    return JSON.parse(rawText)
  } catch {
    return { message: rawText.trim() }
  }
}

const extractStatusValue = (payload: unknown): string => {
  if (!isRecord(payload)) return ''
  const nested = isRecord(payload.data) ? payload.data : null
  return firstNonEmptyString(nested?.status, payload.status).toLowerCase()
}

const extractResultUrl = (payload: unknown): string => {
  if (!isRecord(payload)) return ''
  const nested = isRecord(payload.data) ? payload.data : null
  const contentSources = [payload.content, nested?.content]

  for (const source of contentSources) {
    if (!Array.isArray(source)) continue
    for (const item of source) {
      if (!isRecord(item)) continue
      if (item.type === 'video_url') {
        const url = firstNonEmptyString(item.video_url, item.url)
        if (url) return url
      }
      const fallbackUrl = firstNonEmptyString(item.video_url, item.output, item.output_url, item.url)
      if (fallbackUrl) return fallbackUrl
    }
  }

  const nestedOutputs = Array.isArray(nested?.outputs) ? nested.outputs : []
  const rootOutputs = Array.isArray(payload.outputs) ? payload.outputs : []
  for (const output of [...nestedOutputs, ...rootOutputs]) {
    const outputUrl = firstNonEmptyString(
      isRecord(output) ? output.video_url : undefined,
      isRecord(output) ? output.output_url : undefined,
      isRecord(output) ? output.url : undefined,
      typeof output === 'string' ? output : undefined,
    )
    if (outputUrl) return outputUrl
  }

  return firstNonEmptyString(
    nested?.video,
    nested?.video_url,
    nested?.output,
    nested?.output_url,
    payload.video,
    payload.video_url,
    payload.output,
    payload.output_url,
    nested?.url,
    payload.url,
  )
}

const isSuccessStatus = (status: string) => (
  ['success', 'succeeded', 'complete', 'completed', 'done'].some((token) => status.includes(token))
)

const isFailureStatus = (status: string) => (
  ['fail', 'failed', 'error', 'cancel'].some((token) => status.includes(token))
)

const readPendingTasks = (): WorkflowPendingTask[] => {
  try {
    const raw = window.localStorage.getItem(WORKFLOW_PENDING_TASKS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as WorkflowPendingTask[]) : []
  } catch {
    return []
  }
}

const writeLocalPendingTask = (task: WorkflowPendingTask): void => {
  try {
    const existing = readPendingTasks().filter((entry) => entry.requestId !== task.requestId)
    window.localStorage.setItem(WORKFLOW_PENDING_TASKS_KEY, JSON.stringify([...existing, task]))
  } catch {
    // ignore
  }
}

const removeLocalPendingTask = (requestId: string): void => {
  try {
    const updated = readPendingTasks().filter((entry) => entry.requestId !== requestId)
    window.localStorage.setItem(WORKFLOW_PENDING_TASKS_KEY, JSON.stringify(updated))
  } catch {
    // ignore
  }
}

const readGenerationHistory = (): WorkflowGenerationHistoryEntry[] => {
  try {
    const raw = window.localStorage.getItem(WORKFLOW_HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as WorkflowGenerationHistoryEntry[]) : []
  } catch {
    return []
  }
}

const writeGenerationHistory = (entry: WorkflowGenerationHistoryEntry): void => {
  try {
    const existing = readGenerationHistory().filter((item) => item.historyId !== entry.historyId)
    window.localStorage.setItem(WORKFLOW_HISTORY_KEY, JSON.stringify([entry, ...existing].slice(0, 120)))
  } catch {
    // ignore
  }
}

function WorkflowBuilderCanvasInner({
  initialWorkflow,
  storageKey = DEFAULT_STORAGE_KEY,
  className,
  showPersistenceControls = true,
  hidePanels = false,
  readRemoteWorkflow,
  saveRemoteWorkflow,
  onWorkflowChange,
  onExecuteWorkflow,
  onExecuteNode,
  onNotify,
  topActionSlot,
  onRemoteLoadingChange,
}: WorkflowBuilderCanvasProps) {
  const reactFlow = useReactFlow<WorkflowBuilderNode, WorkflowBuilderEdge>()
  const serializedInitialWorkflow = useMemo(
    () => JSON.stringify(sanitizeWorkflow(initialWorkflow)),
    [initialWorkflow],
  )
  const parsedInitialWorkflow = useMemo(
    () => sanitizeWorkflow(JSON.parse(serializedInitialWorkflow) as WorkflowBuilderDefinition),
    [serializedInitialWorkflow],
  )
  const hasCloudRead = Boolean(readRemoteWorkflow)
  const hasCloudWrite = Boolean(saveRemoteWorkflow)
  const reactFlowWrapperRef = useRef<HTMLDivElement | null>(null)
  const reconnectMenuRef = useRef<HTMLDivElement | null>(null)
  const suppressNextPaneClickRef = useRef(false)

  // Read from localStorage once synchronously at component initialization.
  // Using a ref with undefined sentinel so this runs only on the very first render
  // (safe in React strict mode — refs survive the double-mount).
  const storedWorkflowRef = useRef<WorkflowBuilderDefinition | null | undefined>(undefined)
  if (storedWorkflowRef.current === undefined) {
    if (hasCloudRead) {
      storedWorkflowRef.current = null
    } else {
      try {
        const raw = window.localStorage.getItem(storageKey)
        if (raw) {
          const saved = sanitizeWorkflow(JSON.parse(raw) as WorkflowBuilderDefinition)
          if (saved.nodes.length > 0 || saved.edges.length > 0) {
            storedWorkflowRef.current = saved
          } else {
            storedWorkflowRef.current = null
          }
        } else {
          storedWorkflowRef.current = null
        }
      } catch {
        storedWorkflowRef.current = null
      }
    }
  }
  const loadedFromStorage = storedWorkflowRef.current !== null
  const effectiveInitialWorkflow: WorkflowBuilderDefinition = hasCloudRead
    ? { nodes: [], edges: [], viewport: undefined }
    : (storedWorkflowRef.current ?? parsedInitialWorkflow)

  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowBuilderNode>(effectiveInitialWorkflow.nodes)
  const [edges, setEdges] = useEdgesState<WorkflowBuilderEdge>(effectiveInitialWorkflow.edges)

  // Refs so callbacks that read nodes/edges can be stable (never recreated on drag events)
  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)
  nodesRef.current = nodes
  edgesRef.current = edges

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [reconnectContextMenu, setReconnectContextMenu] = useState<ReconnectContextMenuState | null>(null)
  const [isCreateNodeSubmenuOpen, setIsCreateNodeSubmenuOpen] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)
  const [isRemoteLoading, setIsRemoteLoading] = useState(Boolean(readRemoteWorkflow))
  const [executingNodeIds, setExecutingNodeIds] = useState<Set<string>>(() => new Set())
  const [visibleNodeIds, setVisibleNodeIds] = useState<Set<string>>(() => new Set(effectiveInitialWorkflow.nodes.map((node) => node.id)))
  const [, setUploadingImageNodeIds] = useState<Set<string>>(() => new Set())
  const resumedTaskIdsRef = useRef(new Set<string>())
  const repairAttemptedNodeIdsRef = useRef(new Set<string>())
  const reconnectInteractionRef = useRef<{ edgeId: string; handleType: 'source' | 'target'; didReconnect: boolean } | null>(null)
  const lastViewportRef = useRef(
    effectiveInitialWorkflow.viewport
      ? {
          x: effectiveInitialWorkflow.viewport.x,
          y: effectiveInitialWorkflow.viewport.y,
          zoom: effectiveInitialWorkflow.viewport.zoom,
        }
      : { x: 0, y: 0, zoom: 1 },
  )
  const hasRemoteHydratedRef = useRef<boolean>(!readRemoteWorkflow)
  const remoteSaveTimerRef = useRef<number | null>(null)
  const localSaveTimerRef = useRef<number | null>(null)
  const hasShownRemoteLoadErrorRef = useRef(false)
  const hasShownRemoteSaveErrorRef = useRef(false)

  const notify = useCallback((message: string, type: WorkflowBuilderNoticeType = 'info') => {
    onNotify?.({ message, type })
  }, [onNotify])
  const notifyRef = useRef(notify)

  useEffect(() => {
    notifyRef.current = notify
  }, [notify])

  useEffect(() => {
    onRemoteLoadingChange?.(isRemoteLoading)
  }, [isRemoteLoading, onRemoteLoadingChange])

  const updateNodeData = useCallback((nodeId: string, data: Partial<WorkflowBuilderNodeData>) => {
    setNodes((current) => current.map((node) => (
      node.id === nodeId
        ? {
            ...node,
            data: {
              ...node.data,
              ...data,
            },
          }
        : node
    )))
  }, [setNodes])

  const { runGeneration } = useGenerationRunner({
    apiBaseUrl: CHATBOT_BASE,
    onBackendUnavailable: (message) => {
      notify(message || 'Back end server is not working. Please run it.', 'warning')
    },
  })

  const addLabHistoryItem = useLabNewLayoutStore((state) => state.addHistoryItem)
  const updateLabHistoryItem = useLabNewLayoutStore((state) => state.updateHistoryItem)

  const savePendingTaskToFirestore = useCallback(async (task: WorkflowPendingTask) => {
    const uid = auth.currentUser?.uid
    if (!uid) return
    try {
      await setDoc(
        doc(db, 'users', uid, FIRESTORE_PENDING_TASKS_COLLECTION, task.requestId),
        { ...task, uid, updatedAt: serverTimestamp() },
      )
    } catch {
      // localStorage remains the primary source
    }
  }, [])

  const deletePendingTaskFromFirestore = useCallback(async (requestId: string) => {
    const uid = auth.currentUser?.uid
    if (!uid) return
    try {
      await deleteDoc(doc(db, 'users', uid, FIRESTORE_PENDING_TASKS_COLLECTION, requestId))
    } catch {
      // non-critical
    }
  }, [])

  const writePendingTask = useCallback((task: WorkflowPendingTask) => {
    writeLocalPendingTask(task)
    void savePendingTaskToFirestore(task)
  }, [savePendingTaskToFirestore])

  const removePendingTask = useCallback((requestId: string) => {
    removeLocalPendingTask(requestId)
    void deletePendingTaskFromFirestore(requestId)
  }, [deletePendingTaskFromFirestore])

  const saveGenerationHistoryEntry = useCallback(async (entry: WorkflowGenerationHistoryEntry) => {
    writeGenerationHistory(entry)
    const uid = auth.currentUser?.uid
    if (!uid) return
    try {
      await setDoc(
        doc(db, 'users', uid, FIRESTORE_HISTORY_COLLECTION, entry.historyId),
        { ...entry, uid, updatedAt: serverTimestamp() },
      )
    } catch {
      // keep local history even when remote sync fails
    }
  }, [])

  const repairGeneratedVideoPersistence = useCallback(async (nodeId: string, sourceUrl: string) => {
    const repairedAt = Date.now()
    const storageBasePath = `workflow-builder/generated/${nodeId}-repair-${repairedAt}`

    try {
      const saved = await saveGeneratedVideoArtifactsToFirebase({
        sourceUrl,
        storageBasePath,
        apiBaseUrl: CHATBOT_BASE,
      })

      updateNodeData(nodeId, {
        generatedVideoUrl: saved.firebaseUrl || sourceUrl,
        generatedFirebaseVideoUrl: saved.firebaseUrl,
        generatedSourceVideoUrl: sourceUrl,
        generationStorageError: '',
        generationStatus: saved.firebaseUrl
          ? 'Recovered. Firebase copy is now available.'
          : 'Recovered. Using provider URL.',
      })
      notify('Recovered an older generated video and re-saved it to Firebase.', 'success')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      updateNodeData(nodeId, {
        generationStorageError: message,
        generationStatus: `Video URL unavailable for recovery: ${message}`,
      })
    }
  }, [notify, updateNodeData])

  const pollTaskToResultUrl = useCallback(async (
    provider: GenerationProvider,
    model: string,
    taskId: string,
    onStatus: (statusText: string) => void,
  ): Promise<string> => {
    let transientErrors = 0
    let successWithoutResultCount = 0

    while (true) {
      await new Promise((resolve) => window.setTimeout(resolve, 4000))

      const statusUrl = provider === 'atlas'
        ? `${CHATBOT_BASE.replace(/\/$/, '')}/api/seedance/status?task_id=${encodeURIComponent(taskId)}&model=${encodeURIComponent(model)}&provider=atlas`
        : provider === 'grok'
          ? `${CHATBOT_BASE.replace(/\/$/, '')}/api/seedance/status?task_id=${encodeURIComponent(taskId)}&model=${encodeURIComponent(model)}&provider=grok`
          : `${CHATBOT_BASE.replace(/\/$/, '')}/api/byteplus/status?task_id=${encodeURIComponent(taskId)}`

      const response = await fetch(statusUrl)
      const rawBody = await response.text()
      const payload = parseJsonSafely(rawBody)

      if (!response.ok) {
        const errorMessage = firstNonEmptyString(
          isRecord(payload) ? payload.error : undefined,
          isRecord(payload) ? payload.message : undefined,
          rawBody.trim().slice(0, 200),
          `HTTP ${response.status}`,
        )

        if (response.status >= 500 || response.status === 429) {
          transientErrors += 1
          onStatus(`Status check error (${response.status}). Retry ${transientErrors}/5...`)
          if (transientErrors >= 5) {
            throw new Error(errorMessage)
          }
          continue
        }

        throw new Error(errorMessage)
      }

      transientErrors = 0
      const status = extractStatusValue(payload)

      if (isSuccessStatus(status)) {
        const resultUrl = extractResultUrl(payload)
        if (!resultUrl) {
          successWithoutResultCount += 1
          if (successWithoutResultCount < 6) {
            onStatus(`Finalizing output... (${successWithoutResultCount}/5)`)
            continue
          }
          throw new Error('Generation completed but no playable video URL was returned.')
        }
        onStatus('Completed.')
        return resultUrl
      }

      successWithoutResultCount = 0

      if (isFailureStatus(status)) {
        const upstreamError = isRecord(payload) && isRecord(payload.data) && typeof payload.data.error === 'string'
          ? payload.data.error
          : ''
        throw new Error(upstreamError || 'Generation failed on the provider side.')
      }
    }
  }, [])

  // Sync when initialWorkflow prop changes, but only if we loaded from storage initially
  useEffect(() => {
    if (loadedFromStorage) return
    setNodes(parsedInitialWorkflow.nodes)
    setEdges(parsedInitialWorkflow.edges)
    if (parsedInitialWorkflow.viewport) {
      const nextViewport = {
        x: parsedInitialWorkflow.viewport.x,
        y: parsedInitialWorkflow.viewport.y,
        zoom: parsedInitialWorkflow.viewport.zoom,
      }
      lastViewportRef.current = nextViewport
      window.setTimeout(() => {
        void reactFlow.setViewport(nextViewport, { duration: 0 })
      }, 0)
    }
    setSelectedNodeId((current) => (
      current && parsedInitialWorkflow.nodes.some((node) => node.id === current) ? current : null
    ))
  }, [loadedFromStorage, parsedInitialWorkflow, reactFlow, setEdges, setNodes])

  const recomputeVisibleNodes = useCallback((viewportArg?: { x: number; y: number; zoom: number }) => {
    const frame = reactFlowWrapperRef.current
    if (!frame || nodesRef.current.length === 0) {
      setVisibleNodeIds(new Set())
      return
    }

    const viewport = viewportArg ?? reactFlow.getViewport()
    const frameWidth = frame.clientWidth
    const frameHeight = frame.clientHeight
    if (frameWidth <= 0 || frameHeight <= 0) {
      return
    }

    const margin = 220
    const worldLeft = (-viewport.x) / viewport.zoom - margin
    const worldTop = (-viewport.y) / viewport.zoom - margin
    const worldRight = (frameWidth - viewport.x) / viewport.zoom + margin
    const worldBottom = (frameHeight - viewport.y) / viewport.zoom + margin

    const nextVisibleIds = new Set<string>()
    for (const node of nodesRef.current) {
      const nodeWidth = Number(node.width ?? node.measured?.width ?? 280)
      const nodeHeight = Number(node.height ?? node.measured?.height ?? 220)
      const left = node.position.x
      const top = node.position.y
      const right = left + nodeWidth
      const bottom = top + nodeHeight
      const intersects = right >= worldLeft && left <= worldRight && bottom >= worldTop && top <= worldBottom
      if (intersects) {
        nextVisibleIds.add(node.id)
      }
    }

    setVisibleNodeIds((current) => {
      if (current.size === nextVisibleIds.size) {
        let identical = true
        for (const id of current) {
          if (!nextVisibleIds.has(id)) {
            identical = false
            break
          }
        }
        if (identical) {
          return current
        }
      }
      return nextVisibleIds
    })
  }, [reactFlow])

  useEffect(() => {
    recomputeVisibleNodes(lastViewportRef.current)
  }, [nodes, recomputeVisibleNodes])

  useEffect(() => {
    const handleResize = () => {
      recomputeVisibleNodes(lastViewportRef.current)
    }
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [recomputeVisibleNodes])

  // Autosave to localStorage whenever the canvas changes (local-only mode).
  // Debounced to keep node dragging responsive in heavy layouts.
  useEffect(() => {
    if (hasCloudWrite) return
    if (nodes.length === 0 && edges.length === 0) return

    if (localSaveTimerRef.current !== null) {
      window.clearTimeout(localSaveTimerRef.current)
    }

    localSaveTimerRef.current = window.setTimeout(() => {
      try {
        const currentViewport = reactFlow.getViewport()
        lastViewportRef.current = currentViewport
        window.localStorage.setItem(storageKey, JSON.stringify({ nodes, edges, viewport: currentViewport }))
      } catch {
        // storage unavailable — ignore
      }
    }, 250)

    return () => {
      if (localSaveTimerRef.current !== null) {
        window.clearTimeout(localSaveTimerRef.current)
        localSaveTimerRef.current = null
      }
    }
  }, [edges, hasCloudWrite, nodes, reactFlow, storageKey])

  useEffect(() => {
    const currentViewport = reactFlow.getViewport()
    lastViewportRef.current = currentViewport
    onWorkflowChange?.({ nodes, edges, viewport: currentViewport })
  }, [edges, nodes, onWorkflowChange, reactFlow])

  useEffect(() => {
    let cancelled = false

    if (!readRemoteWorkflow) {
      hasRemoteHydratedRef.current = true
      setIsRemoteLoading(false)
      return
    }

    hasRemoteHydratedRef.current = false
    setIsRemoteLoading(true)

    void readRemoteWorkflow()
      .then((remoteWorkflow) => {
        if (cancelled) {
          return
        }

        if (!remoteWorkflow) {
          // One-time migration path: if cloud is empty but legacy local state exists,
          // hydrate from local and push it to cloud.
          if (!saveRemoteWorkflow) return
          try {
            const rawLocal = window.localStorage.getItem(storageKey)
            if (!rawLocal) return
            const localWorkflow = sanitizeWorkflow(JSON.parse(rawLocal) as WorkflowBuilderDefinition)
            if (localWorkflow.nodes.length === 0 && localWorkflow.edges.length === 0) return

            setNodes(localWorkflow.nodes)
            setEdges(localWorkflow.edges)
            if (localWorkflow.viewport) {
              const nextViewport = {
                x: localWorkflow.viewport.x,
                y: localWorkflow.viewport.y,
                zoom: localWorkflow.viewport.zoom,
              }
              lastViewportRef.current = nextViewport
              window.setTimeout(() => {
                void reactFlow.setViewport(nextViewport, { duration: 0 })
                recomputeVisibleNodes(nextViewport)
              }, 0)
            } else {
              window.setTimeout(() => {
                void reactFlow.fitView({ padding: 0.18, duration: 0 })
                const fittedViewport = reactFlow.getViewport()
                lastViewportRef.current = fittedViewport
                recomputeVisibleNodes(fittedViewport)
              }, 0)
            }
            setSelectedNodeId(null)
            setSelectedEdgeId(null)

            void saveRemoteWorkflow(localWorkflow)
              .then(() => {
                try {
                  window.localStorage.removeItem(storageKey)
                } catch {
                  // non-critical
                }
              })
              .catch(() => {
                // keep local copy if cloud migration fails
              })
          } catch {
            // ignore malformed local payloads
          }
          return
        }

        const nextWorkflow = sanitizeWorkflow(remoteWorkflow)
        if (nextWorkflow.nodes.length === 0 && nextWorkflow.edges.length === 0) {
          return
        }

        setNodes(nextWorkflow.nodes)
        setEdges(nextWorkflow.edges)
        if (nextWorkflow.viewport) {
          const nextViewport = {
            x: nextWorkflow.viewport.x,
            y: nextWorkflow.viewport.y,
            zoom: nextWorkflow.viewport.zoom,
          }
          lastViewportRef.current = nextViewport
          window.setTimeout(() => {
            void reactFlow.setViewport(nextViewport, { duration: 0 })
            recomputeVisibleNodes(nextViewport)
          }, 0)
        } else {
          window.setTimeout(() => {
            void reactFlow.fitView({ padding: 0.18, duration: 0 })
            const fittedViewport = reactFlow.getViewport()
            lastViewportRef.current = fittedViewport
            recomputeVisibleNodes(fittedViewport)
          }, 0)
        }
        setSelectedNodeId(null)
        setSelectedEdgeId(null)
      })
      .catch(() => {
        if (cancelled || hasShownRemoteLoadErrorRef.current) {
          return
        }

        hasShownRemoteLoadErrorRef.current = true
        // Keep cloud read failures silent during automatic hydration.
      })
      .finally(() => {
        if (!cancelled) {
          hasRemoteHydratedRef.current = true
          setIsRemoteLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [readRemoteWorkflow, recomputeVisibleNodes, reactFlow, saveRemoteWorkflow, setEdges, setNodes, storageKey])

  useEffect(() => {
    if (!saveRemoteWorkflow || !hasRemoteHydratedRef.current) {
      return
    }

    if (nodes.length === 0 && edges.length === 0) {
      return
    }

    if (remoteSaveTimerRef.current !== null) {
      window.clearTimeout(remoteSaveTimerRef.current)
    }

    remoteSaveTimerRef.current = window.setTimeout(() => {
      const currentViewport = reactFlow.getViewport()
      lastViewportRef.current = currentViewport
      void saveRemoteWorkflow({ nodes, edges, viewport: currentViewport })
        .then(() => {
          hasShownRemoteSaveErrorRef.current = false
        })
        .catch(() => {
          if (hasShownRemoteSaveErrorRef.current) {
            return
          }

          hasShownRemoteSaveErrorRef.current = true
          notifyRef.current('Could not sync flow state to cloud. Changes will retry automatically.', 'warning')
        })
    }, 700)

    return () => {
      if (remoteSaveTimerRef.current !== null) {
        window.clearTimeout(remoteSaveTimerRef.current)
        remoteSaveTimerRef.current = null
      }
    }
  }, [edges, nodes, reactFlow, saveRemoteWorkflow])

  useEffect(() => {
    return () => {
      if (localSaveTimerRef.current !== null) {
        window.clearTimeout(localSaveTimerRef.current)
        localSaveTimerRef.current = null
      }

      if (remoteSaveTimerRef.current !== null) {
        window.clearTimeout(remoteSaveTimerRef.current)
        remoteSaveTimerRef.current = null
      }
    }
  }, [])

  const selectedNode = useMemo(
    () => nodes.find((node) => node.id === selectedNodeId) || null,
    [nodes, selectedNodeId],
  )

  const selectedEdge = useMemo(
    () => edges.find((edge) => edge.id === selectedEdgeId) || null,
    [edges, selectedEdgeId],
  )

  const syncPromptSocketConnectionFromEdges = useCallback((nextEdges: WorkflowBuilderEdge[]) => {
    const nodeById = new Map(nodesRef.current.map((node) => [node.id, node]))
    const promptConnectedTargets = new Set<string>()

    nextEdges.forEach((edge) => {
      const targetNode = nodeById.get(edge.target)
      if (!targetNode || !GENERATION_NODE_KINDS.has(targetNode.type as WorkflowBuilderNodeKind)) return

      const sourceNode = nodeById.get(edge.source)
      const sourceLooksPromptOutput = sourceNode?.type === 'prompt' && (!edge.sourceHandle || edge.sourceHandle === 'out-prompt')
      const targetsPromptHandle = edge.targetHandle === 'prompt'
      const implicitPromptLink = !edge.targetHandle && sourceLooksPromptOutput

      if (targetsPromptHandle || implicitPromptLink) {
        promptConnectedTargets.add(edge.target)
      }
    })

    setNodes((current) => {
      let changed = false
      const next = current.map((node) => {
        if (!GENERATION_NODE_KINDS.has(node.type as WorkflowBuilderNodeKind)) return node
        const isPromptSocketConnected = promptConnectedTargets.has(node.id)
        if (Boolean(node.data.isPromptSocketConnected) === isPromptSocketConnected) return node
        changed = true
        return {
          ...node,
          data: {
            ...node.data,
            isPromptSocketConnected,
          },
        }
      })
      return changed ? next : current
    })
  }, [setNodes])

  useEffect(() => {
    syncPromptSocketConnectionFromEdges(edges)
  }, [edges, syncPromptSocketConnectionFromEdges])

  const onEdgesChange = useCallback((changes: EdgeChange<WorkflowBuilderEdge>[]) => {
    setEdges((current) => {
      const next = applyEdgeChanges(changes, current)
      syncPromptSocketConnectionFromEdges(next)
      return next
    })
  }, [setEdges, syncPromptSocketConnectionFromEdges])

  // Resolve source/target node labels for the selected edge
  const selectedEdgeInfo = useMemo(() => {
    if (!selectedEdge) return null
    // We omit `nodes` from deps so we don't recreate this object on every drag pixel
    const currentNodes = nodesRef.current
    const sourceNode = currentNodes.find((n) => n.id === selectedEdge.source)
    const targetNode = currentNodes.find((n) => n.id === selectedEdge.target)
    return {
      edge: selectedEdge,
      sourceLabel: sourceNode?.data.label || selectedEdge.source,
      targetLabel: targetNode?.data.label || selectedEdge.target,
    }
  }, [selectedEdge])

  const resolvePromptForGenerateNode = useCallback((nodeId: string): string => {
    const currentNodes = nodesRef.current
    const currentEdges = edgesRef.current
    const nodeById = new Map(currentNodes.map((node) => [node.id, node]))
    const targetNode = currentNodes.find((node) => node.id === nodeId)
    const isExtend = Boolean(targetNode?.data.extendMode) || targetNode?.type === 'video_extend'

    const incomingByTarget = new Map<string, WorkflowBuilderEdge[]>()
    currentEdges.forEach((edge) => {
      const incoming = incomingByTarget.get(edge.target) || []
      incoming.push(edge)
      incomingByTarget.set(edge.target, incoming)
    })

    const linkedPromptSet = new Set<string>()
    const rerouteQueue: string[] = []

    const isPromptFeedEdgeToGenerate = (edge: WorkflowBuilderEdge): boolean => {
      if (edge.target !== nodeId) return false
      if (edge.targetHandle === 'prompt') return true
      const sourceNode = nodeById.get(edge.source)
      const sourceLooksPromptOutput = sourceNode?.type === 'prompt' && (!edge.sourceHandle || edge.sourceHandle === 'out-prompt')
      return !edge.targetHandle && sourceLooksPromptOutput
    }

    currentEdges
      .filter((edge) => isPromptFeedEdgeToGenerate(edge))
      .forEach((edge) => {
        const sourceNode = nodeById.get(edge.source)
        if (!sourceNode) return
        if (sourceNode.type === 'prompt') {
          const prompt = (sourceNode.data.promptText || '').trim()
          if (prompt) linkedPromptSet.add(prompt)
          return
        }
        if (sourceNode.type === 'reroute') {
          rerouteQueue.push(sourceNode.id)
        }
      })

    const visitedReroutes = new Set<string>()
    while (rerouteQueue.length > 0) {
      const rerouteId = rerouteQueue.pop() || ''
      if (!rerouteId || visitedReroutes.has(rerouteId)) continue
      visitedReroutes.add(rerouteId)

      const incoming = incomingByTarget.get(rerouteId) || []
      incoming.forEach((edge) => {
        const sourceNode = nodeById.get(edge.source)
        if (!sourceNode) return

        if (sourceNode.type === 'prompt') {
          const prompt = (sourceNode.data.promptText || '').trim()
          if (prompt) linkedPromptSet.add(prompt)
          return
        }

        if (sourceNode.type === 'reroute') {
          rerouteQueue.push(sourceNode.id)
        }
      })
    }

    const linkedPrompts = Array.from(linkedPromptSet)

    const inlinePrompt = (targetNode?.data.promptText as string | undefined)?.trim() || ''
    const linkedPrompt = linkedPrompts.join('\n')
    const resolved = linkedPrompt || inlinePrompt

    return resolved || (isExtend ? '' : DEFAULT_VIDEO_PROMPT)
  }, [])

  const resolveReferencesForGenerateNode = useCallback((nodeId: string) => {
    const currentNodes = nodesRef.current
    const currentEdges = edgesRef.current
    const nodeById = new Map(currentNodes.map((node) => [node.id, node]))
    const incomingByTarget = new Map<string, WorkflowBuilderEdge[]>()
    currentEdges.forEach((edge) => {
      const incoming = incomingByTarget.get(edge.target) || []
      incoming.push(edge)
      incomingByTarget.set(edge.target, incoming)
    })

    const visited = new Set<string>()
    const generationSourceHandle = new Map<string, string>()
    const stack = [nodeId]
    while (stack.length > 0) {
      const current = stack.pop() || ''
      const incoming = incomingByTarget.get(current) || []
      incoming.forEach((edge) => {
        const sourceId = edge.source
        if (visited.has(sourceId)) return
        visited.add(sourceId)

        const sourceNode = nodeById.get(sourceId)
        if (!sourceNode) return

        // Stop traversal at nodes that already produce final media references.
        // This prevents generated-video links from pulling image ancestry from
        // the upstream generate chain.
        const isTerminalReferenceNode =
          GENERATION_NODE_KINDS.has(sourceNode.type as WorkflowBuilderNodeKind)
          || sourceNode.type === 'video_input'
          || sourceNode.type === 'video_connector'
          || sourceNode.type === 'video_reference'
          || sourceNode.type === 'image_reference'
          || sourceNode.type === 'asset'
        if (isTerminalReferenceNode) {
          if (
            GENERATION_NODE_KINDS.has(sourceNode.type as WorkflowBuilderNodeKind)
            && typeof edge.sourceHandle === 'string'
            && edge.sourceHandle.startsWith('video-history-')
          ) {
            generationSourceHandle.set(sourceId, edge.sourceHandle)
          }
          return
        }

        if (sourceNode.type === 'reroute') {
          stack.push(sourceId)
        }
      })
    }

    type RefItem = { kind: 'image' | 'video'; url: string; name: string }
    const refs: RefItem[] = []
    const seen = new Set<string>()

    const pushRef = (kind: 'image' | 'video', rawUrl: string, rawName: string) => {
      const url = rawUrl.trim()
      if (!url || seen.has(url)) return
      seen.add(url)
      refs.push({ kind, url, name: (rawName || '').trim() || `${kind} reference` })
    }

    visited.forEach((upstreamId) => {
      const upstreamNode = nodeById.get(upstreamId)
      if (!upstreamNode) return

      if (upstreamNode.type === 'image_reference' || upstreamNode.type === 'video_reference') {
        const expectedKind = upstreamNode.type === 'image_reference' ? 'image' : 'video'
        ;(upstreamNode.data.referenceItems || []).forEach((item) => {
          pushRef(expectedKind, item.url || '', item.name || '')
        })
        return
      }

      if (upstreamNode.type === 'asset') {
        ;(upstreamNode.data.assetUrls || []).forEach((url, index) => {
          pushRef('image', url || '', `Image ${index + 1}`)
        })
        return
      }

      if (upstreamNode.type === 'video_input') {
        const videoUrl = (upstreamNode.data.videoUrl as string | undefined)?.trim()
        if (videoUrl) {
          pushRef('video', videoUrl, upstreamNode.data.label || 'Video Input')
        }
        return
      }

      if (upstreamNode.type === 'video_connector') {
        const sequenceUrls = ((upstreamNode.data.videoConnectorResolvedUrls || upstreamNode.data.videoSequenceUrls || []) as string[])
          .map((url) => url.trim())
          .filter(Boolean)
        sequenceUrls.forEach((url, index) => {
          pushRef('video', url, `${upstreamNode.data.label || 'Video Connector'} ${index + 1}`)
        })
        return
      }

      if (GENERATION_NODE_KINDS.has(upstreamNode.type as WorkflowBuilderNodeKind)) {
        const handleId = generationSourceHandle.get(upstreamId)
        if (handleId && handleId.startsWith('video-history-')) {
          const itemId = handleId.slice('video-history-'.length)
          const queue = Array.isArray(upstreamNode.data.genQueue)
            ? (upstreamNode.data.genQueue as Array<{ id?: string; videoUrl?: string; firebaseVideoUrl?: string; sourceVideoUrl?: string }>)
            : []
          const match = queue.find((q) => q?.id === itemId)
          const historyUrl = match?.firebaseVideoUrl || match?.videoUrl || match?.sourceVideoUrl
          if (historyUrl) {
            pushRef('video', historyUrl, 'Generated Video')
            return
          }
        }
        const videoUrl = upstreamNode.data.generatedSourceVideoUrl || upstreamNode.data.generatedVideoUrl
        if (videoUrl) {
          pushRef('video', videoUrl, 'Generated Video')
        }
      }
    })

    const imageRefs = refs.filter((item) => item.kind === 'image')
    const videoRefs = refs.filter((item) => item.kind === 'video')
    const fields: ToorGenMediaField[] = []
    const mediaUrls: Record<string, string> = {}

    imageRefs.forEach((item, index) => {
      const key = `ref_image_${index + 1}`
      fields.push({
        key,
        label: item.name,
        kind: 'image',
        helpText: 'Connected image reference',
        placeholder: '',
      })
      mediaUrls[key] = item.url
    })

    videoRefs.forEach((item, index) => {
      const key = `ref_video_${index + 1}`
      fields.push({
        key,
        label: item.name,
        kind: 'video',
        helpText: 'Connected video reference',
        placeholder: '',
      })
      mediaUrls[key] = item.url
    })

    const mentionReferences: ToorGenMentionReference[] = refs.map((item) => {
      const normalizedName = (item.name || item.kind)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '') || item.kind
      return {
        mention: `@${normalizedName}`,
        name: item.name,
        url: item.url,
        kind: item.kind,
        role: item.kind === 'video' ? 'reference_video' : 'reference_image',
      }
    })

    return {
      fields,
      mediaUrls,
      mentionReferences,
      hasReferences: refs.length > 0,
    }
  }, [])

  const buildWorkflowGenerateRequest = useCallback((nodeId: string, prompt: string, baseSettings: {
    provider: 'atlas'
    model: string
    ratio: string
    duration: number
    resolution: string
    generateAudio: boolean
  }) => {
    const targetNode = nodesRef.current.find((node) => node.id === nodeId)
    const isImagesToVideoNode = targetNode?.type === 'gen_images_to_video'
    // video_extend is now a generate node with extendMode set; support legacy video_extend type too
    const isVideoExtendNode = targetNode?.type === 'video_extend' || Boolean(targetNode?.data.extendMode)

    const refs = resolveReferencesForGenerateNode(nodeId)
    const selectedInputMode = (targetNode?.data.genInputMode as 'reference' | 'image' | undefined) || 'reference'
    const requestMode = isVideoExtendNode
      ? 'reference-to-video'
      : selectedInputMode === 'image'
        ? 'image-to-video'
        : 'reference-to-video'
    const imageOnlyFields = refs.fields.filter((field) => field.kind === 'image')
    const imageOnlyMediaUrls = Object.fromEntries(
      Object.entries(refs.mediaUrls).filter(([key]) => key.startsWith('ref_image_')),
    )
    const imageOnlyMentions = refs.mentionReferences.filter((entry) => entry.kind === 'image')

    const effectiveFields = isImagesToVideoNode ? imageOnlyFields : refs.fields
    const effectiveMediaUrls = isImagesToVideoNode ? imageOnlyMediaUrls : refs.mediaUrls
    const effectiveMentions = isImagesToVideoNode ? imageOnlyMentions : refs.mentionReferences

    const hasReferences = refs.hasReferences
    const tabId = isImagesToVideoNode
      ? 'workflow-images-to-video'
      : selectedInputMode === 'image'
        ? 'workflow-image-to-video'
        : 'workflow-reference-to-video'

    const request = buildToorGenRequest({
      tab: {
        id: tabId,
        requestMode,
        fields: effectiveFields,
      },
      state: {
        prompt,
        mediaUrls: effectiveMediaUrls,
      },
      settings: baseSettings,
      mentionReferences: effectiveMentions,
      combinedReferenceTabId: hasReferences || isImagesToVideoNode ? tabId : undefined,
    })

    const body = request.body as Record<string, unknown>

    if (isImagesToVideoNode) {
      body.model = 'bytedance/seedance-2.0-fast/reference-to-video'
      body.reference_images = Object.values(imageOnlyMediaUrls)
      body.reference_images_label = 'reference images'
      body.providerHint = 'atlas'
      delete body.reference_videos
    } else if (isVideoExtendNode) {
      const extendMode = targetNode?.data.extendMode === 'before' ? 'before' : 'after'
      body.model = 'bytedance/seedance-2.0-fast/reference-to-video'
      body.providerHint = 'atlas'

      const referenceVideos = Object.keys(effectiveMediaUrls)
        .filter((key) => key.startsWith('ref_video_'))
        .map((key) => effectiveMediaUrls[key])
        
      if (referenceVideos.length > 0) {
        body.reference_videos = [referenceVideos[0]]
      }

      const referenceImages = Object.keys(effectiveMediaUrls)
        .filter((key) => key.startsWith('ref_image_'))
        .map((key) => effectiveMediaUrls[key])

      if (referenceImages.length > 0) {
        body.reference_images = referenceImages
      }

      body.prompt = `Generate the content ${extendMode} Video 1: ${prompt.trim()}`
    }

    return request
  }, [resolveReferencesForGenerateNode])

  const selectedNodeResolvedPrompt = useMemo(() => {
    if (!selectedNode || !GENERATION_NODE_KINDS.has(selectedNode.type as WorkflowBuilderNodeKind)) return undefined
    return resolvePromptForGenerateNode(selectedNode.id)
  }, [selectedNode, resolvePromptForGenerateNode])

  const selectedNodeLiveRequest = useMemo(() => {
    if (!selectedNode || !GENERATION_NODE_KINDS.has(selectedNode.type as WorkflowBuilderNodeKind)) return undefined
    const prompt = resolvePromptForGenerateNode(selectedNode.id)
    const baseSettings = {
      provider: 'atlas' as const,
      model: (selectedNode.data.genModel as string | undefined) || 'seedance-2.0-fast',
      ratio: (selectedNode.data.genRatio as string | undefined) || '16:9',
      duration: (selectedNode.data.genDuration as number | undefined) || 5,
      resolution: (selectedNode.data.genResolution as string | undefined) || '720p',
      generateAudio: selectedNode.data.genAudio !== false,
    }
    try {
      const req = buildWorkflowGenerateRequest(selectedNode.id, prompt, baseSettings)
      return JSON.stringify({ endpoint: req.endpoint, body: req.body, settings: baseSettings }, null, 2)
    } catch {
      return undefined
    }
  }, [buildWorkflowGenerateRequest, selectedNode, resolvePromptForGenerateNode])

  const finalizeGenerationForNode = useCallback(async (
    nodeId: string,
    prompt: string,
    request: { endpoint: string; body: Record<string, unknown> },
    completed: {
      taskId: string
      resultUrl: string
      submittedAt: number
      receivedAt: number
      settings: {
        provider: GenerationProvider
        model: string
        ratio: string
        duration: number
        resolution: string
        generateAudio: boolean
      }
    },
  ) => {
    const completedAt = Date.now()
    const historyId = `${nodeId}-${completed.taskId || completedAt}`

    const finalized = await finalizeGeneratedVideoPersistence<WorkflowGenerationHistoryEntry>({
      sourceUrl: completed.resultUrl,
      storageBasePath: `workflow-builder/generated/${historyId}`,
      apiBaseUrl: CHATBOT_BASE,
      completedAt,
      buildEntry: ({ completedAt: finalizedAt, firebaseVideoUrl, storageSaveError }) => ({
        historyId,
        nodeId,
        taskId: completed.taskId,
        provider: completed.settings.provider,
        model: completed.settings.model,
        ratio: completed.settings.ratio,
        duration: completed.settings.duration,
        resolution: completed.settings.resolution,
        generateAudio: completed.settings.generateAudio,
        prompt,
        requestEndpoint: request.endpoint,
        requestPayload: request.body,
        resultUrl: completed.resultUrl,
        firebaseVideoUrl,
        storageSaveError,
        submittedAt: completed.submittedAt,
        receivedAt: completed.receivedAt,
        completedAt: finalizedAt,
      }),
      persistEntry: saveGenerationHistoryEntry,
    })

    updateNodeData(nodeId, {
      generateLastRunAt: new Date().toISOString(),
      generationTaskId: completed.taskId,
      generatedVideoUrl: finalized.playbackUrl,
      generatedFirebaseVideoUrl: finalized.firebaseVideoUrl,
      generatedSourceVideoUrl: completed.resultUrl,
      generationStorageError: finalized.storageSaveError,
      generationStatus: finalized.storageSaveError
        ? `Completed. Firebase copy failed: ${finalized.storageSaveError}`
        : 'Completed. Video saved.',
    })

    // Also reconcile any genQueue item that was tracking this task so the
    // history list stops showing "Queued/Submitting" after a page reload
    // resumed an in-flight generation.
    if (completed.taskId) {
      setNodes((current) => current.map((n) => {
        if (n.id !== nodeId) return n
        const queue: unknown[] = Array.isArray(n.data.genQueue) ? (n.data.genQueue as unknown[]) : []
        let matched = false
        const nextQueue = queue.map((entry) => {
          const qi = entry as Record<string, unknown>
          if (matched) return qi
          if (qi.taskId === completed.taskId || qi.id === completed.taskId) {
            matched = true
            return {
              ...qi,
              status: 'done',
              videoUrl: finalized.playbackUrl,
              firebaseVideoUrl: finalized.firebaseVideoUrl,
              sourceVideoUrl: completed.resultUrl,
              statusText: finalized.storageSaveError ? 'Done (provider link)' : 'Done',
              completedAt: new Date().toISOString(),
            }
          }
          return qi
        })
        if (!matched) return n
        return { ...n, data: { ...n.data, genQueue: nextQueue } }
      }))
    }
  }, [saveGenerationHistoryEntry, setNodes, updateNodeData])

  const handleResumeTask = useCallback(async (task: WorkflowPendingTask) => {
    if (resumedTaskIdsRef.current.has(task.requestId)) return
    resumedTaskIdsRef.current.add(task.requestId)

    let shouldRemovePending = false

    updateNodeData(task.nodeId, {
      generationTaskId: task.taskId,
      generationStatus: `Resuming generation... (${task.taskId})`,
    })

    try {
      const finalResultUrl = await pollTaskToResultUrl(task.provider, task.model, task.taskId, (statusText) => {
        updateNodeData(task.nodeId, { generationStatus: `Resumed: ${statusText}` })
      })

      await finalizeGenerationForNode(task.nodeId, task.prompt, {
        endpoint: task.requestEndpoint,
        body: task.requestPayload,
      }, {
        taskId: task.taskId,
        resultUrl: finalResultUrl,
        submittedAt: task.createdAt,
        receivedAt: Date.now(),
        settings: {
          provider: task.provider,
          model: task.model,
          ratio: task.ratio,
          duration: task.duration,
          resolution: task.resolution,
          generateAudio: task.generateAudio,
        },
      })

      shouldRemovePending = true
      notify('Recovered a pending generation task.', 'success')
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const lowerMessage = message.toLowerCase()
      const isTerminalFailure = isFailureStatus(lowerMessage)
        || lowerMessage.includes('provider side')
        || lowerMessage.includes('generation failed')
        || lowerMessage.includes('expired')

      if (isTerminalFailure) {
        shouldRemovePending = true
        updateNodeData(task.nodeId, { generationStatus: `Error: ${message}` })
      } else {
        updateNodeData(task.nodeId, { generationStatus: `Recovery paused: ${message}. Task kept for retry.` })
      }
    } finally {
      if (shouldRemovePending) {
        removePendingTask(task.requestId)
      }
    }
  }, [finalizeGenerationForNode, notify, pollTaskToResultUrl, removePendingTask, updateNodeData])

  useEffect(() => {
    const localTasks = readPendingTasks()
    if (localTasks.length > 0) {
      const timeout = window.setTimeout(() => {
        localTasks.forEach((task) => {
          void handleResumeTask(task)
        })
      }, 800)
      return () => window.clearTimeout(timeout)
    }
    return undefined
  }, [handleResumeTask])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const uid = user?.uid
      if (!uid) return

      void (async () => {
        try {
          const ref = collection(db, 'users', uid, FIRESTORE_PENDING_TASKS_COLLECTION)
          const snap = await getDocs(ref)
          const firestoreTasks = snap.docs.map((entry) => entry.data() as WorkflowPendingTask)
          const localIds = new Set(readPendingTasks().map((entry) => entry.requestId))
          const newTasks = firestoreTasks.filter((entry) => !localIds.has(entry.requestId))
          newTasks.forEach((task) => {
            writePendingTask(task)
            void handleResumeTask(task)
          })
        } catch {
          // non-critical
        }
      })()
    })

    return () => {
      unsubscribe()
    }
  }, [handleResumeTask, writePendingTask])

  useEffect(() => {
    nodes.forEach((node) => {
      if (!GENERATION_NODE_KINDS.has(node.type as WorkflowBuilderNodeKind)) return
      if (repairAttemptedNodeIdsRef.current.has(node.id)) return

      const sourceUrl = (node.data.generatedSourceVideoUrl || '').trim()
      const firebaseUrl = (node.data.generatedFirebaseVideoUrl || '').trim()
      const storageError = (node.data.generationStorageError || '').trim().toLowerCase()

      const needsRepair = Boolean(sourceUrl)
        && !firebaseUrl
        && (storageError.includes('storage/unauthorized') || storageError.includes('permission'))

      if (!needsRepair) return

      repairAttemptedNodeIdsRef.current.add(node.id)
      void repairGeneratedVideoPersistence(node.id, sourceUrl)
    })
  }, [nodes, repairGeneratedVideoPersistence])

  const onConnect = useCallback((connection: Connection) => {
    setEdges((current) => {
      const next = addEdge({
        ...connection,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 18,
          height: 18,
          color: '#64748b',
        },
        style: {
          stroke: '#64748b',
          strokeWidth: 1.8,
        },
      }, current)
      syncPromptSocketConnectionFromEdges(next)
      return next
    })
  }, [setEdges, syncPromptSocketConnectionFromEdges])

  const isValidConnection = useCallback((connection: Connection | WorkflowBuilderEdge) => {
    if (!connection.source || !connection.target) return false
    if (connection.source === connection.target) return false

    const sourceNode = nodesRef.current.find((node) => node.id === connection.source)
    const targetNode = nodesRef.current.find((node) => node.id === connection.target)
    if (!sourceNode || !targetNode) return false

    const sourceHandle = connection.sourceHandle || ''
    const looksLikeVideoHandle = sourceHandle.toLowerCase().includes('video') || sourceHandle === 'result'

    if (targetNode.type === 'video_connector' && (connection.targetHandle || '').startsWith('video-')) {
      if (
        sourceNode.type === 'video_input'
        || sourceNode.type === 'video_reference'
        || sourceNode.type === 'video_connector'
        || sourceNode.type === 'reroute'
        || GENERATION_NODE_KINDS.has(sourceNode.type as WorkflowBuilderNodeKind)
      ) {
        return true
      }

      return looksLikeVideoHandle
    }

    // Video input on generate/extend nodes must accept generated video outputs,
    // dedicated video input/reference nodes, and reroute nodes carrying video.
    if (connection.targetHandle === 'video') {
      if (
        sourceNode.type === 'video_input'
        || sourceNode.type === 'video_reference'
        || sourceNode.type === 'video_connector'
        || sourceNode.type === 'reroute'
      ) {
        return true
      }

      if (GENERATION_NODE_KINDS.has(sourceNode.type as WorkflowBuilderNodeKind)) {
        return true
      }

      if (looksLikeVideoHandle) {
        return true
      }

      return false
    }

    return true
  }, [])

  const onReconnect = useCallback((oldEdge: WorkflowBuilderEdge, connection: Connection) => {
    if (!isValidConnection(connection)) return
    if (reconnectInteractionRef.current && reconnectInteractionRef.current.edgeId === oldEdge.id) {
      reconnectInteractionRef.current.didReconnect = true
    }
    setEdges((current) => {
      const next = reconnectEdge(oldEdge, connection, current)
      syncPromptSocketConnectionFromEdges(next)
      return next
    })
    setSelectedEdgeId(oldEdge.id)
    setSelectedNodeId(null)
  }, [isValidConnection, setEdges, syncPromptSocketConnectionFromEdges])

  const onReconnectStart = useCallback((
    _event: unknown,
    edge: WorkflowBuilderEdge,
    handleType: HandleType,
  ) => {
    reconnectInteractionRef.current = {
      edgeId: edge.id,
      handleType,
      didReconnect: false,
    }
    setReconnectContextMenu(null)
    setIsCreateNodeSubmenuOpen(false)
  }, [])

  const handleReconnectContextDisconnect = useCallback((edgeId: string) => {
    const menu = reconnectContextMenu
    if (!menu || menu.edgeId !== edgeId) {
      setEdges((current) => {
        const next = current.filter((entry) => entry.id !== edgeId)
        syncPromptSocketConnectionFromEdges(next)
        return next
      })
      setSelectedEdgeId((current) => (current === edgeId ? null : current))
      notify('Connection removed.', 'info')
      return
    }

    setEdges((current) => {
      const next = current.filter((entry) => entry.id !== edgeId)
      syncPromptSocketConnectionFromEdges(next)
      return next
    })
    setNodes((current) => current.filter((node) => node.id !== menu.previewAnchorNodeId))
    setSelectedEdgeId((current) => (current === edgeId ? null : current))
    setReconnectContextMenu(null)
    setIsCreateNodeSubmenuOpen(false)
    notify('Connection removed.', 'info')
  }, [notify, reconnectContextMenu, setEdges, setNodes, syncPromptSocketConnectionFromEdges])

  const closeReconnectContextMenu = useCallback(() => {
    const menu = reconnectContextMenu
    if (!menu) return

    setEdges((current) => {
      const hasEdge = current.some((entry) => entry.id === menu.edgeId)
      let next: WorkflowBuilderEdge[]
      if (hasEdge) {
        next = current.map((entry) => (
          entry.id === menu.edgeId
            ? {
                ...entry,
                source: menu.originalConnection.source,
                sourceHandle: menu.originalConnection.sourceHandle,
                target: menu.originalConnection.target,
                targetHandle: menu.originalConnection.targetHandle,
              }
            : entry
        ))
      } else {
        next = current.concat({
          ...menu.originalEdge,
          source: menu.originalConnection.source,
          sourceHandle: menu.originalConnection.sourceHandle,
          target: menu.originalConnection.target,
          targetHandle: menu.originalConnection.targetHandle,
        })
      }
      syncPromptSocketConnectionFromEdges(next)
      return next
    })

    setNodes((current) => current.filter((node) => node.id !== menu.previewAnchorNodeId))
    setReconnectContextMenu(null)
    setIsCreateNodeSubmenuOpen(false)
  }, [reconnectContextMenu, setEdges, setNodes, syncPromptSocketConnectionFromEdges])

  const handleReconnectContextCreateNode = useCallback((kind: WorkflowBuilderNodeKind) => {
    const menu = reconnectContextMenu
    if (!menu) return

    const position = reactFlow.screenToFlowPosition({ x: menu.clientX, y: menu.clientY })
    const newNode = createWorkflowNode(kind, position)

    setEdges((current) => {
      const hasEdge = current.some((entry) => entry.id === menu.edgeId)
      let next: WorkflowBuilderEdge[]
      if (hasEdge) {
        next = current.map((entry) => (
          entry.id === menu.edgeId
            ? {
                ...entry,
                source: menu.originalConnection.source,
                sourceHandle: menu.originalConnection.sourceHandle,
                target: newNode.id,
                targetHandle: 'prompt',
              }
            : entry
        ))
      } else {
        next = current.concat({
          ...menu.originalEdge,
          source: menu.originalConnection.source,
          sourceHandle: menu.originalConnection.sourceHandle,
          target: newNode.id,
          targetHandle: 'prompt',
        })
      }
      syncPromptSocketConnectionFromEdges(next)
      return next
    })

    setNodes((current) => current.filter((node) => node.id !== menu.previewAnchorNodeId).concat(newNode))
    setSelectedNodeId(newNode.id)
    setSelectedEdgeId(menu.edgeId)
    setReconnectContextMenu(null)
    setIsCreateNodeSubmenuOpen(false)
    notify('Node created and connected.', 'success')
  }, [notify, reactFlow, reconnectContextMenu, setEdges, setNodes, syncPromptSocketConnectionFromEdges])

  const onReconnectEnd = useCallback((
    event: MouseEvent | TouchEvent,
    edge: WorkflowBuilderEdge,
    handleType: HandleType,
  ) => {
    const interaction = reconnectInteractionRef.current
    reconnectInteractionRef.current = null

    if (!interaction || interaction.edgeId !== edge.id || interaction.didReconnect) return

    if (handleType === 'target') {
      setEdges((current) => {
        const next = current.filter((entry) => entry.id !== edge.id)
        syncPromptSocketConnectionFromEdges(next)
        return next
      })
      setSelectedEdgeId((current) => (current === edge.id ? null : current))
      return
    }

    const pointer = extractPointerClient(event)
    const frameRect = reactFlowWrapperRef.current?.getBoundingClientRect()
    const clientX = frameRect ? pointer.clientX - frameRect.left : pointer.clientX
    const clientY = frameRect ? pointer.clientY - frameRect.top : pointer.clientY
    const previewPositionRaw = reactFlow.screenToFlowPosition({ x: pointer.clientX, y: pointer.clientY })
    const previewPosition = {
      x: previewPositionRaw.x,
      y: previewPositionRaw.y - REROUTE_PREVIEW_TARGET_HANDLE_Y,
    }
    const previewAnchorNodeId = `reconnect-preview-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const previewAnchorBase = createWorkflowNode('reroute', previewPosition)
    const previewAnchorNode: WorkflowBuilderNode = {
      ...previewAnchorBase,
      id: previewAnchorNodeId,
      style: {
        ...(previewAnchorBase.style ?? {}),
        opacity: 0,
        pointerEvents: 'none',
      },
      draggable: false,
      selectable: false,
      connectable: false,
    }

    setNodes((current) => current.concat(previewAnchorNode))
    setEdges((current) => {
      const next = reconnectEdge(edge, {
        source: edge.source,
        sourceHandle: edge.sourceHandle ?? null,
        target: previewAnchorNodeId,
        targetHandle: 'in',
      }, current)
      syncPromptSocketConnectionFromEdges(next)
      return next
    })

    suppressNextPaneClickRef.current = true

    setReconnectContextMenu({
      edgeId: edge.id,
      handleType,
      clientX,
      clientY,
      previewAnchorNodeId,
      originalEdge: edge,
      originalConnection: {
        source: edge.source,
        sourceHandle: edge.sourceHandle ?? null,
        target: edge.target,
        targetHandle: edge.targetHandle ?? null,
      },
    })
    setIsCreateNodeSubmenuOpen(false)
  }, [reactFlow, setEdges, setNodes, syncPromptSocketConnectionFromEdges])

  useEffect(() => {
    if (!reconnectContextMenu) return

    if (reconnectMenuRef.current) {
      reconnectMenuRef.current.style.left = `${reconnectContextMenu.clientX}px`
      reconnectMenuRef.current.style.top = `${reconnectContextMenu.clientY}px`
    }

    const close = () => closeReconnectContextMenu()
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close()
    }

    window.addEventListener('pointerdown', close)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('pointerdown', close)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [closeReconnectContextMenu, reconnectContextMenu])

  useEffect(() => {
    if (!reconnectContextMenu) {
      setIsCreateNodeSubmenuOpen(false)
    }
  }, [reconnectContextMenu])

  const stableNodeTypes = useMemo(() => workflowNodeTypes, [])

  const onDragOver = useCallback((event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const hasFiles = Array.from(event.dataTransfer.items).some(
      (item) => item.kind === 'file' && item.type.startsWith('image/')
    )
    event.dataTransfer.dropEffect = hasFiles ? 'copy' : 'move'
  }, [])

  const uploadImageToFirebase = useCallback(async (file: File, nodeId: string, itemId: string): Promise<string> => {
    const uid = auth.currentUser?.uid || 'anon'
    const ext = file.name.split('.').pop() || 'jpg'
    const path = `workflow-builder/image-refs/${uid}/${nodeId}/${itemId}.${ext}`
    const ref = storageRef(storage, path)
    await new Promise<void>((resolve, reject) => {
      const task = uploadBytesResumable(ref, file, { contentType: file.type })
      task.on('state_changed', null, reject, () => resolve())
    })
    return getDownloadURL(ref)
  }, [])

  const onDrop = useCallback((event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault()

    // Handle node-library palette drops
    const kind = event.dataTransfer.getData('application/workflow-builder-node') as WorkflowBuilderNodeKind
    if (kind) {
      const position = reactFlow.screenToFlowPosition({ x: event.clientX, y: event.clientY })
      setNodes((current) => current.concat(createWorkflowNode(kind, position)))
      return
    }

    // Handle image file drops from the OS / browser
    const imageFiles = Array.from(event.dataTransfer.files).filter((f) => f.type.startsWith('image/'))
    if (imageFiles.length === 0) return

    const position = reactFlow.screenToFlowPosition({ x: event.clientX, y: event.clientY })
    const nodeId = `image_reference-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

    // Build placeholder items so the node appears immediately
    const placeholderItems = imageFiles.map((f, i) => ({
      id: `${nodeId}-img-${i}`,
      url: '',
      name: f.name.replace(/\.[^.]+$/, ''),
    }))

    const newNode: WorkflowBuilderNode = {
      id: nodeId,
      type: 'image_reference',
      position,
      data: {
        label: imageFiles.length === 1 ? imageFiles[0].name.replace(/\.[^.]+$/, '') : 'Image Reference',
        description: 'Dropped image assets',
        referenceItems: placeholderItems,
        uploading: true,
      },
    }

    setNodes((current) => current.concat(newNode))
    setUploadingImageNodeIds((prev) => { const next = new Set(prev); next.add(nodeId); return next })

    // Upload all images then patch the node with real URLs
    void Promise.all(
      imageFiles.map(async (file, i) => {
        const itemId = `${nodeId}-img-${i}`
        try {
          const url = await uploadImageToFirebase(file, nodeId, itemId)
          return { id: itemId, url, name: file.name.replace(/\.[^.]+$/, '') }
        } catch {
          return { id: itemId, url: '', name: file.name.replace(/\.[^.]+$/, '') }
        }
      }),
    ).then((items) => {
      setNodes((current) => current.map((n) =>
        n.id === nodeId
          ? { ...n, data: { ...n.data, referenceItems: items, uploading: false } }
          : n,
      ))
      setUploadingImageNodeIds((prev) => { const next = new Set(prev); next.delete(nodeId); return next })
      notifyRef.current(`${items.length} image${items.length > 1 ? 's' : ''} uploaded.`, 'success')
    })
  }, [reactFlow, setNodes, uploadImageToFirebase])

  const executeNode = useCallback(async (nodeId: string) => {
    const node = nodesRef.current.find((entry) => entry.id === nodeId)
    if (!node) return

    const isGenerationNode = GENERATION_NODE_KINDS.has(node.type as WorkflowBuilderNodeKind)
    let activeRequestId = ''
    let labHistoryId = ''

    setExecutingNodeIds((current) => {
      const next = new Set(current)
      next.add(nodeId)
      return next
    })
    try {
      const workflow = { nodes: nodesRef.current, edges: edgesRef.current }
      if (onExecuteNode) {
        await onExecuteNode(node, workflow)
      } else if (isGenerationNode) {
        const prompt = resolvePromptForGenerateNode(nodeId)
        const baseSettings = {
          provider: 'atlas' as const,
          model: (node.data.genModel as string | undefined) || 'seedance-2.0-fast',
          ratio: (node.data.genRatio as string | undefined) || '16:9',
          duration: (node.data.genDuration as number | undefined) || 5,
          resolution: (node.data.genResolution as string | undefined) || '720p',
          generateAudio: node.data.genAudio !== false,
        }
        const request = buildWorkflowGenerateRequest(nodeId, prompt, baseSettings)

        const requestId = `${nodeId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        activeRequestId = requestId

        // Link with Lab: push initial queued state
        labHistoryId = requestId
        addLabHistoryItem({
          id: labHistoryId,
          timestamp: Date.now(),
          prompt: prompt,
          model: baseSettings.model,
          provider: baseSettings.provider,
          ratio: baseSettings.ratio,
          resolution: baseSettings.resolution,
          duration: baseSettings.duration,
          generateAudio: baseSettings.generateAudio,
          requestEndpoint: request.endpoint,
          requestPayload: request.body,
          sourceLabel: 'Workflow Builder',
          status: 'queued',
        })

        updateNodeData(nodeId, {
          generationStatus: 'Submitting generation request...',
          generationTaskId: '',
          generationLastPrompt: prompt,
          generationLastRequest: JSON.stringify({ endpoint: request.endpoint, body: request.body, settings: baseSettings }, null, 2),
        })

        const completedGeneration = await runGeneration({
          endpoint: request.endpoint,
          body: request.body,
          settings: baseSettings,
        }, {
          onQueued: ({ taskId, submittedAt, settings }) => {
            updateLabHistoryItem(labHistoryId, {
              status: 'running',
              taskId,
              submittedAt,
              provider: settings.provider,
              model: settings.model,
              ratio: settings.ratio,
              resolution: settings.resolution,
              duration: settings.duration,
              generateAudio: settings.generateAudio,
            })
            writePendingTask({
              requestId,
              nodeId,
              taskId,
              provider: settings.provider,
              model: settings.model,
              ratio: settings.ratio,
              duration: settings.duration,
              resolution: settings.resolution,
              generateAudio: settings.generateAudio,
              createdAt: submittedAt,
              prompt,
              requestEndpoint: request.endpoint,
              requestPayload: request.body,
            })
            updateNodeData(nodeId, {
              generationTaskId: taskId,
              generationStatus: `Queued: ${taskId}`,
            })
          },
          onStatus: (statusText) => {
            updateNodeData(nodeId, { generationStatus: statusText })
          },
        })

        if (!completedGeneration) {
          updateLabHistoryItem(labHistoryId, {
            status: 'failed',
            errorMessage: 'Generation cancelled or failed.',
            completedAt: Date.now(),
          })
          removePendingTask(requestId)
          return
        }
        
        updateLabHistoryItem(labHistoryId, {
          status: 'success',
          resultUrl: completedGeneration.resultUrl,
          taskId: completedGeneration.taskId,
          submittedAt: completedGeneration.submittedAt,
          receivedAt: completedGeneration.receivedAt,
          completedAt: completedGeneration.receivedAt,
          provider: completedGeneration.settings.provider,
          model: completedGeneration.settings.model,
          ratio: completedGeneration.settings.ratio,
          resolution: completedGeneration.settings.resolution,
          duration: completedGeneration.settings.duration,
          generateAudio: completedGeneration.settings.generateAudio,
        })

        await finalizeGenerationForNode(nodeId, prompt, request, {
          taskId: completedGeneration.taskId,
          resultUrl: completedGeneration.resultUrl,
          submittedAt: completedGeneration.submittedAt,
          receivedAt: completedGeneration.receivedAt,
          settings: {
            provider: completedGeneration.settings.provider,
            model: completedGeneration.settings.model,
            ratio: completedGeneration.settings.ratio,
            duration: completedGeneration.settings.duration,
            resolution: completedGeneration.settings.resolution,
            generateAudio: completedGeneration.settings.generateAudio,
          },
        })

        removePendingTask(requestId)

        notify('Video generation completed.', 'success')
      } else {
        await new Promise<void>((resolve) => {
          window.setTimeout(() => resolve(), 450)
        })
        updateNodeData(nodeId, { generateLastRunAt: new Date().toISOString() })
        notify(`${node.data.label || 'Node'} executed.`, 'success')
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Node execution failed.'
      const lowerMessage = message.toLowerCase()
      const isTerminalFailure = isFailureStatus(lowerMessage)
        || lowerMessage.includes('provider side')
        || lowerMessage.includes('generation failed')
        || lowerMessage.includes('task finished without a result')
      if (isTerminalFailure && activeRequestId) {
        removePendingTask(activeRequestId)
      }
      
      if (labHistoryId) {
        updateLabHistoryItem(labHistoryId, {
          status: isTerminalFailure ? 'failed' : 'failed',
          errorMessage: message,
          completedAt: Date.now(),
        })
      }

      updateNodeData(nodeId, {
        generationStatus: isTerminalFailure
          ? `Error: ${message}`
          : `Connection issue while polling. Task kept and will resume after refresh.`,
      })
      notify(message, 'error')
    } finally {
      setExecutingNodeIds((current) => {
        if (!current.has(nodeId)) return current
        const next = new Set(current)
        next.delete(nodeId)
        return next
      })
    }
  }, [
    finalizeGenerationForNode,
    notify,
    onExecuteNode,
    removePendingTask,
    buildWorkflowGenerateRequest,
    resolvePromptForGenerateNode,
    runGeneration,
    updateNodeData,
    writePendingTask,
    addLabHistoryItem,
    updateLabHistoryItem,
  ])

  // Patch a single queue item inside a node's genQueue array
  const patchQueueItem = useCallback((nodeId: string, queueItemId: string, patch: Record<string, unknown>) => {
    setNodes((current) => current.map((n) => {
      if (n.id !== nodeId) return n
      const queue: unknown[] = Array.isArray(n.data.genQueue) ? (n.data.genQueue as unknown[]) : []
      return {
        ...n,
        data: {
          ...n.data,
          genQueue: queue.map((item) => {
            const qi = item as Record<string, unknown>
            return qi.id === queueItemId ? { ...qi, ...patch } : qi
          }),
        },
      }
    }))
  }, [setNodes])

  const executeQueueItem = useCallback(async (nodeId: string, item: { id: string; prompt: string; genModel?: string; genRatio?: string; genDuration?: number; genResolution?: string; genAudio?: boolean }) => {
    const queueItemId = item.id

    // Resolve prompt from connected upstream prompt nodes; only fall back to the
    // inline queue-item prompt when nothing is wired in. This keeps the actual
    // request consistent with the "Request to be sent (live)" preview in the
    // inspector, which uses the same resolver.
    const linkedPrompt = resolvePromptForGenerateNode(nodeId)
    const prompt = linkedPrompt || item.prompt || ''
    const baseSettings = {
      provider: 'atlas' as const,
      model: item.genModel || 'seedance-2.0-fast',
      ratio: item.genRatio || '16:9',
      duration: item.genDuration || 5,
      resolution: item.genResolution || '720p',
      generateAudio: item.genAudio !== false,
    }

    const request = buildWorkflowGenerateRequest(nodeId, prompt, baseSettings)
    const requestId = `${nodeId}-${queueItemId}-${Date.now()}`

    patchQueueItem(nodeId, queueItemId, { status: 'running', statusText: 'Submitting…' })

    const labHistoryId = requestId
    addLabHistoryItem({
      id: labHistoryId,
      timestamp: Date.now(),
      prompt,
      model: baseSettings.model,
      provider: baseSettings.provider,
      ratio: baseSettings.ratio,
      resolution: baseSettings.resolution,
      duration: baseSettings.duration,
      generateAudio: baseSettings.generateAudio,
      requestEndpoint: request.endpoint,
      requestPayload: request.body,
      sourceLabel: 'Workflow Builder Queue',
      status: 'queued',
    })

    try {
      const completedGeneration = await runGeneration({
        endpoint: request.endpoint,
        body: request.body,
        settings: baseSettings,
      }, {
        onQueued: ({ taskId, submittedAt, settings }) => {
          updateLabHistoryItem(labHistoryId, { status: 'running', taskId, submittedAt, provider: settings.provider, model: settings.model, ratio: settings.ratio, resolution: settings.resolution, duration: settings.duration, generateAudio: settings.generateAudio })
          writePendingTask({ requestId, nodeId, taskId, provider: settings.provider, model: settings.model, ratio: settings.ratio, duration: settings.duration, resolution: settings.resolution, generateAudio: settings.generateAudio, createdAt: submittedAt, prompt, requestEndpoint: request.endpoint, requestPayload: request.body })
          patchQueueItem(nodeId, queueItemId, { taskId, statusText: `Queued: ${taskId}` })
        },
        onStatus: (statusText) => {
          patchQueueItem(nodeId, queueItemId, { statusText })
        },
      })

      if (!completedGeneration) {
        updateLabHistoryItem(labHistoryId, { status: 'failed', errorMessage: 'Generation cancelled or failed.', completedAt: Date.now() })
        removePendingTask(requestId)
        patchQueueItem(nodeId, queueItemId, { status: 'error', errorMessage: 'Cancelled or failed.', completedAt: new Date().toISOString() })
        return
      }

      updateLabHistoryItem(labHistoryId, { status: 'success', resultUrl: completedGeneration.resultUrl, taskId: completedGeneration.taskId, submittedAt: completedGeneration.submittedAt, receivedAt: completedGeneration.receivedAt, completedAt: completedGeneration.receivedAt, provider: completedGeneration.settings.provider, model: completedGeneration.settings.model, ratio: completedGeneration.settings.ratio, resolution: completedGeneration.settings.resolution, duration: completedGeneration.settings.duration, generateAudio: completedGeneration.settings.generateAudio })

      // Persist to Firebase
      const completedAt = Date.now()
      const historyId = `${nodeId}-${completedGeneration.taskId || completedAt}`
      const finalized = await finalizeGeneratedVideoPersistence<WorkflowGenerationHistoryEntry>({
        sourceUrl: completedGeneration.resultUrl,
        storageBasePath: `workflow-builder/generated/${historyId}`,
        apiBaseUrl: CHATBOT_BASE,
        completedAt,
        buildEntry: ({ completedAt: finalizedAt, firebaseVideoUrl, storageSaveError }) => ({
          historyId,
          nodeId,
          taskId: completedGeneration.taskId,
          provider: completedGeneration.settings.provider,
          model: completedGeneration.settings.model,
          ratio: completedGeneration.settings.ratio,
          duration: completedGeneration.settings.duration,
          resolution: completedGeneration.settings.resolution,
          generateAudio: completedGeneration.settings.generateAudio,
          prompt,
          requestEndpoint: request.endpoint,
          requestPayload: request.body,
          resultUrl: completedGeneration.resultUrl,
          firebaseVideoUrl,
          storageSaveError,
          submittedAt: completedGeneration.submittedAt,
          receivedAt: completedGeneration.receivedAt,
          completedAt: finalizedAt,
        }),
        persistEntry: saveGenerationHistoryEntry,
      })

      removePendingTask(requestId)
      patchQueueItem(nodeId, queueItemId, {
        status: 'done',
        videoUrl: finalized.playbackUrl,
        firebaseVideoUrl: finalized.firebaseVideoUrl,
        sourceVideoUrl: completedGeneration.resultUrl,
        statusText: finalized.storageSaveError ? 'Done (provider link)' : 'Done',
        completedAt: new Date().toISOString(),
      })
      notify('Video generation completed.', 'success')
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Generation failed.'
      const isTerminal = isFailureStatus(message.toLowerCase()) || message.toLowerCase().includes('generation failed')
      if (isTerminal) removePendingTask(requestId)
      updateLabHistoryItem(labHistoryId, { status: 'failed', errorMessage: message, completedAt: Date.now() })
      patchQueueItem(nodeId, queueItemId, { status: 'error', errorMessage: message, completedAt: new Date().toISOString() })
      notify(message, 'error')
    }
  }, [
    addLabHistoryItem,
    buildWorkflowGenerateRequest,
    notify,
    patchQueueItem,
    removePendingTask,
    resolvePromptForGenerateNode,
    runGeneration,
    saveGenerationHistoryEntry,
    updateLabHistoryItem,
    writePendingTask,
  ])

  const removeNode = useCallback((nodeId: string) => {
    setNodes((current) => current.filter((node) => node.id !== nodeId))
    setEdges((current) => {
      const next = current.filter((edge) => edge.source !== nodeId && edge.target !== nodeId)
      syncPromptSocketConnectionFromEdges(next)
      return next
    })
    setSelectedNodeId((current) => (current === nodeId ? null : current))
  }, [setEdges, setNodes, syncPromptSocketConnectionFromEdges])

  const removeEdge = useCallback((edgeId: string) => {
    setEdges((current) => {
      const next = current.filter((edge) => edge.id !== edgeId)
      syncPromptSocketConnectionFromEdges(next)
      return next
    })
    setSelectedEdgeId((current) => (current === edgeId ? null : current))
  }, [setEdges, syncPromptSocketConnectionFromEdges])

  const retryFirebaseSaveForNode = useCallback(async (nodeId: string) => {
    const node = nodes.find((entry) => entry.id === nodeId)
    if (!node) return

    const sourceUrl = (node.data.generatedSourceVideoUrl || node.data.generatedVideoUrl || '').trim()
    if (!sourceUrl) {
      notify('No provider URL available to retry Firebase save.', 'warning')
      return
    }

    updateNodeData(nodeId, { generationStatus: 'Retrying Firebase save from provider URL...' })
    await repairGeneratedVideoPersistence(nodeId, sourceUrl)
  }, [nodes, notify, repairGeneratedVideoPersistence, updateNodeData])

  const saveWorkflow = useCallback(async () => {
    if (nodes.length === 0) {
      notify('Add some nodes before saving this workflow.', 'warning')
      return
    }

    const currentViewport = reactFlow.getViewport()
    lastViewportRef.current = currentViewport

    if (saveRemoteWorkflow) {
      try {
        await saveRemoteWorkflow({ nodes, edges, viewport: currentViewport })
        notify('Workflow saved to cloud storage.', 'success')
      } catch {
        notify('Could not save the workflow to cloud storage.', 'error')
      }
      return
    }

    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ nodes, edges, viewport: currentViewport }))
      notify('Workflow saved to browser storage.', 'success')
    } catch {
      notify('Could not save the workflow to browser storage.', 'error')
    }
  }, [edges, nodes, notify, reactFlow, saveRemoteWorkflow, storageKey])

  const loadWorkflow = useCallback(async () => {
    if (readRemoteWorkflow) {
      setIsRemoteLoading(true)
      try {
        const remoteWorkflow = await readRemoteWorkflow()
        if (remoteWorkflow) {
          const nextWorkflow = sanitizeWorkflow(remoteWorkflow)
          setNodes(nextWorkflow.nodes)
          setEdges(nextWorkflow.edges)
          if (nextWorkflow.viewport) {
            const nextViewport = {
              x: nextWorkflow.viewport.x,
              y: nextWorkflow.viewport.y,
              zoom: nextWorkflow.viewport.zoom,
            }
            lastViewportRef.current = nextViewport
            window.setTimeout(() => {
              void reactFlow.setViewport(nextViewport, { duration: 0 })
              recomputeVisibleNodes(nextViewport)
            }, 0)
          }
          setSelectedNodeId(null)
          setSelectedEdgeId(null)
          notify('Workflow loaded from cloud storage.', 'success')
          return
        }
        notify('No saved cloud workflow was found for this scope.', 'warning')
        return
      } catch {
        notify('Cloud load failed.', 'error')
        return
      } finally {
        setIsRemoteLoading(false)
      }
    }

    try {
      const raw = window.localStorage.getItem(storageKey)
      if (!raw) {
        notify('No saved workflow was found for this test page.', 'warning')
        return
      }

      const nextWorkflow = sanitizeWorkflow(JSON.parse(raw) as WorkflowBuilderDefinition)
      setNodes(nextWorkflow.nodes)
      setEdges(nextWorkflow.edges)
      if (nextWorkflow.viewport) {
        const nextViewport = {
          x: nextWorkflow.viewport.x,
          y: nextWorkflow.viewport.y,
          zoom: nextWorkflow.viewport.zoom,
        }
        lastViewportRef.current = nextViewport
        window.setTimeout(() => {
          void reactFlow.setViewport(nextViewport, { duration: 0 })
          recomputeVisibleNodes(nextViewport)
        }, 0)
      }
      setSelectedNodeId(null)
      notify('Workflow loaded from browser storage.', 'success')
    } catch {
      notify('There was an error loading the saved workflow.', 'error')
    }
  }, [notify, readRemoteWorkflow, reactFlow, recomputeVisibleNodes, setEdges, setNodes, storageKey])

  const executeWorkflow = useCallback(async () => {
    if (nodes.length === 0) {
      notify('Add some nodes before executing this workflow.', 'warning')
      return
    }

    setIsExecuting(true)
    try {
      const workflow = { nodes, edges }
      if (onExecuteWorkflow) {
        await onExecuteWorkflow(workflow)
      } else {
        await new Promise<void>((resolve) => {
          window.setTimeout(() => resolve(), 450)
        })
      }
      notify('Workflow execution completed.', 'success')
    } catch (error) {
      notify(error instanceof Error ? error.message : 'Workflow execution failed.', 'error')
    } finally {
      setIsExecuting(false)
    }
  }, [edges, nodes, notify, onExecuteWorkflow])

  // Keyboard delete for selected edge
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedEdgeId) {
        // Only delete edge if focus is not inside an input/textarea
        const tag = (document.activeElement?.tagName || '').toLowerCase()
        if (tag === 'input' || tag === 'textarea' || tag === 'select') return
        removeEdge(selectedEdgeId)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedEdgeId, removeEdge])

  const canvasContextValue = useMemo(() => ({
    updateNodeData,
    executeNode,
    executeQueueItem,
    isNodeExecuting: (nodeId: string) => executingNodeIds.has(nodeId),
    isNodeInViewport: (nodeId: string) => visibleNodeIds.has(nodeId),
  }), [executeNode, executeQueueItem, executingNodeIds, updateNodeData, visibleNodeIds])

  const canvasClassName = [
    'workflow-builder-canvas', 
    hidePanels ? 'workflow-builder-canvas--hidden-panels' : '',
    className
  ].filter(Boolean).join(' ')

  return (
    <div className={canvasClassName}>
      {!hidePanels && (
        <aside className="workflow-builder-canvas__library">
          <div className="workflow-builder-canvas__panel-header">
            <p>Imported Builder</p>
            <h2>Node Library</h2>
          </div>
          <WorkflowBuilderLibrary />
        </aside>
      )}

      <div className="workflow-builder-canvas__stage">
        <div className="workflow-builder-canvas__stage-frame" ref={reactFlowWrapperRef}>
          <WorkflowBuilderCanvasContext.Provider value={canvasContextValue}>
            <ReactFlow<WorkflowBuilderNode, WorkflowBuilderEdge>
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              isValidConnection={isValidConnection}
              onDrop={onDrop}
              onDragOver={onDragOver}
              connectionMode={ConnectionMode.Loose}
              onNodeClick={(_event: ReactMouseEvent, node) => { setSelectedNodeId(node.id); setSelectedEdgeId(null) }}
              onNodeDoubleClick={(event: ReactMouseEvent, node) => {
                const target = event.target as HTMLElement | null
                const isInteractive = Boolean(target?.closest('input, textarea, select, button, [contenteditable="true"], .nodrag'))
                if (isInteractive) return
                updateNodeData(node.id, { collapsed: !node.data.collapsed })
              }}
              onEdgeClick={(event: ReactMouseEvent, edge) => {
                if (event.altKey) {
                  removeEdge(edge.id)
                  return
                }
                setSelectedEdgeId(edge.id)
                setSelectedNodeId(null)
              }}
              onEdgeDoubleClick={(_event: ReactMouseEvent, edge) => {
                removeEdge(edge.id)
              }}
              onReconnect={onReconnect}
              onReconnectStart={onReconnectStart}
              onReconnectEnd={onReconnectEnd}
              onMoveEnd={(_event, viewport) => {
                lastViewportRef.current = viewport
                recomputeVisibleNodes(viewport)
              }}
              onPaneClick={() => {
                if (suppressNextPaneClickRef.current) {
                  suppressNextPaneClickRef.current = false
                  return
                }
                setSelectedNodeId(null)
                setSelectedEdgeId(null)
                closeReconnectContextMenu()
              }}
              nodeTypes={stableNodeTypes}
              fitView={!hasCloudRead && !effectiveInitialWorkflow.viewport}
              fitViewOptions={{ padding: 0.18 }}
              snapToGrid
              snapGrid={[16, 16]}
              minZoom={0.08}
              maxZoom={5.0}
              defaultEdgeOptions={{
                markerEnd: {
                  type: MarkerType.ArrowClosed,
                  width: 18,
                  height: 18,
                  color: '#c4cdd8',
                },
                style: {
                  stroke: '#c4cdd8',
                  strokeWidth: 1.8,
                },
              }}
              edgesFocusable
              edgesReconnectable
              proOptions={{ hideAttribution: true }}
            >
              <Background variant={BackgroundVariant.Dots} gap={20} size={1.2} color="#2a2a2a" />
              <Panel position="bottom-right">
                <div className="workflow-builder-canvas__zoom-bar">
                  <button type="button" className="workflow-builder-canvas__zoom-btn" onClick={() => reactFlow.zoomIn({ duration: 150 })} title="Zoom in"><Plus size={14} /></button>
                  <button type="button" className="workflow-builder-canvas__zoom-btn" onClick={() => reactFlow.zoomOut({ duration: 150 })} title="Zoom out"><Minus size={14} /></button>
                  <button type="button" className="workflow-builder-canvas__zoom-btn" onClick={() => reactFlow.fitView({ padding: 0.18, duration: 250 })} title="Fit view"><Maximize2 size={14} /></button>
                  <button type="button" className="workflow-builder-canvas__zoom-btn workflow-builder-canvas__zoom-btn--label" onClick={() => reactFlow.zoomTo(1, { duration: 200 })} title="Reset zoom to 100%">1:1</button>
                </div>
              </Panel>
              <Panel position="top-right">
                <div className="workflow-builder-canvas__action-row">
                  {topActionSlot ? <div className="workflow-builder-canvas__action-slot">{topActionSlot}</div> : null}
                  {showPersistenceControls ? (
                    <>
                      <button type="button" className="workflow-builder-canvas__action-btn workflow-builder-canvas__action-btn--secondary" onClick={() => { void saveWorkflow() }}>
                        <Save size={14} />
                        Save
                      </button>
                      <button type="button" className="workflow-builder-canvas__action-btn workflow-builder-canvas__action-btn--secondary" onClick={() => { void loadWorkflow() }}>
                        <Upload size={14} />
                        Load
                      </button>
                    </>
                  ) : null}
                  <button type="button" className="workflow-builder-canvas__action-btn" onClick={() => { void executeWorkflow() }} disabled={isExecuting}>
                    <Play size={14} />
                    {isExecuting ? 'Executing...' : 'Execute'}
                  </button>
                </div>
              </Panel>
            </ReactFlow>
            {isRemoteLoading ? (
              <div className="workflow-builder-canvas__remote-loading" role="status" aria-live="polite">
                <div className="workflow-builder-canvas__remote-loading-card">
                  <Loader className="wf-spin" size={18} />
                  <span>Loading flow...</span>
                </div>
              </div>
            ) : null}
            {reconnectContextMenu ? (
              <div
                ref={reconnectMenuRef}
                className="workflow-builder-canvas__reconnect-menu"
                onPointerDown={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  className="workflow-builder-canvas__reconnect-menu-item"
                  onClick={() => handleReconnectContextDisconnect(reconnectContextMenu.edgeId)}
                >
                  Disconnect
                </button>
                <div
                  className="workflow-builder-canvas__reconnect-menu-submenu-wrap"
                  onPointerEnter={() => setIsCreateNodeSubmenuOpen(true)}
                  onPointerLeave={() => setIsCreateNodeSubmenuOpen(false)}
                >
                  <button
                    type="button"
                    className="workflow-builder-canvas__reconnect-menu-item workflow-builder-canvas__reconnect-menu-item--submenu"
                    onClick={() => setIsCreateNodeSubmenuOpen((current) => !current)}
                  >
                    Create node
                  </button>
                  {isCreateNodeSubmenuOpen ? (
                    <div className="workflow-builder-canvas__reconnect-submenu">
                      <button
                        type="button"
                        className="workflow-builder-canvas__reconnect-menu-item"
                        onClick={() => handleReconnectContextCreateNode('generate')}
                      >
                        Generate
                      </button>
                      <button
                        type="button"
                        className="workflow-builder-canvas__reconnect-menu-item"
                        onClick={() => handleReconnectContextCreateNode('gen_text_to_video')}
                      >
                        Text to Video
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </WorkflowBuilderCanvasContext.Provider>
        </div>
      </div>

      {!hidePanels && (
        <aside className="workflow-builder-canvas__inspector">
          <WorkflowBuilderInspector
            node={selectedNode}
            selectedEdgeInfo={selectedEdgeInfo}
            onChange={updateNodeData}
            onDelete={removeNode}
            onDeleteEdge={removeEdge}
            onRetryFirebaseSave={retryFirebaseSaveForNode}
            resolvedPrompt={selectedNodeResolvedPrompt}
            liveRequest={selectedNodeLiveRequest}
          />
        </aside>
      )}
    </div>
  )
}

export function WorkflowBuilderCanvas(props: WorkflowBuilderCanvasProps) {
  return (
    <ReactFlowProvider>
      <WorkflowBuilderCanvasInner {...props} />
    </ReactFlowProvider>
  )
}

export default WorkflowBuilderCanvas