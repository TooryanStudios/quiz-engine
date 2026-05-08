import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent as ReactDragEvent, type MouseEvent as ReactMouseEvent } from 'react'
import {
  addEdge,
  Background,
  BackgroundVariant,
  ConnectionMode,
  MarkerType,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
} from '@xyflow/react'
import { Maximize2, Minus, Play, Plus, Save, Upload } from 'lucide-react'
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
import { auth, db } from '../../lib/firebase'
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
  const reactFlowWrapperRef = useRef<HTMLDivElement | null>(null)

  // Read from localStorage once synchronously at component initialization.
  // Using a ref with undefined sentinel so this runs only on the very first render
  // (safe in React strict mode — refs survive the double-mount).
  const storedWorkflowRef = useRef<WorkflowBuilderDefinition | null | undefined>(undefined)
  if (storedWorkflowRef.current === undefined) {
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
  const loadedFromStorage = storedWorkflowRef.current !== null
  const effectiveInitialWorkflow = storedWorkflowRef.current ?? parsedInitialWorkflow

  const [nodes, setNodes, onNodesChange] = useNodesState<WorkflowBuilderNode>(effectiveInitialWorkflow.nodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState<WorkflowBuilderEdge>(effectiveInitialWorkflow.edges)

  // Refs so callbacks that read nodes/edges can be stable (never recreated on drag events)
  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)
  nodesRef.current = nodes
  edgesRef.current = edges

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [executingNodeIds, setExecutingNodeIds] = useState<Set<string>>(() => new Set())
  const resumedTaskIdsRef = useRef(new Set<string>())
  const repairAttemptedNodeIdsRef = useRef(new Set<string>())
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
    setSelectedNodeId((current) => (
      current && parsedInitialWorkflow.nodes.some((node) => node.id === current) ? current : null
    ))
  }, [loadedFromStorage, parsedInitialWorkflow, setEdges, setNodes])

  // Autosave to localStorage whenever the canvas changes.
  // Debounced to keep node dragging responsive in heavy layouts.
  useEffect(() => {
    if (nodes.length === 0 && edges.length === 0) return

    if (localSaveTimerRef.current !== null) {
      window.clearTimeout(localSaveTimerRef.current)
    }

    localSaveTimerRef.current = window.setTimeout(() => {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify({ nodes, edges }))
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
  }, [nodes, edges, storageKey])

  useEffect(() => {
    onWorkflowChange?.({ nodes, edges })
  }, [edges, nodes, onWorkflowChange])

  useEffect(() => {
    let cancelled = false

    if (!readRemoteWorkflow) {
      hasRemoteHydratedRef.current = true
      return
    }

    hasRemoteHydratedRef.current = false

    void readRemoteWorkflow()
      .then((remoteWorkflow) => {
        if (cancelled || !remoteWorkflow) {
          return
        }

        const nextWorkflow = sanitizeWorkflow(remoteWorkflow)
        if (nextWorkflow.nodes.length === 0 && nextWorkflow.edges.length === 0) {
          return
        }

        setNodes(nextWorkflow.nodes)
        setEdges(nextWorkflow.edges)
        setSelectedNodeId(null)
        setSelectedEdgeId(null)
      })
      .catch(() => {
        if (cancelled || hasShownRemoteLoadErrorRef.current) {
          return
        }

        hasShownRemoteLoadErrorRef.current = true
        // Keep cloud read failures silent during automatic hydration.
        // Local storage fallback still loads the canvas state.
      })
      .finally(() => {
        if (!cancelled) {
          hasRemoteHydratedRef.current = true
        }
      })

    return () => {
      cancelled = true
    }
  }, [readRemoteWorkflow, setEdges, setNodes])

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
      void saveRemoteWorkflow({ nodes, edges })
        .then(() => {
          hasShownRemoteSaveErrorRef.current = false
        })
        .catch(() => {
          if (hasShownRemoteSaveErrorRef.current) {
            return
          }

          hasShownRemoteSaveErrorRef.current = true
          notifyRef.current('Could not sync flow state to cloud. Local save is still active.', 'warning')
        })
    }, 700)

    return () => {
      if (remoteSaveTimerRef.current !== null) {
        window.clearTimeout(remoteSaveTimerRef.current)
        remoteSaveTimerRef.current = null
      }
    }
  }, [edges, nodes, saveRemoteWorkflow])

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
    const targetNode = currentNodes.find((node) => node.id === nodeId)
    const isExtend = Boolean(targetNode?.data.extendMode) || targetNode?.type === 'video_extend'

    const linkedPrompts = currentEdges
      .filter((edge) => edge.target === nodeId)
      .map((edge) => currentNodes.find((node) => node.id === edge.source))
      .filter((node) => node?.type === 'prompt')
      .map((node) => node?.data.promptText?.trim() || '')
      .filter(Boolean)

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
        if (isTerminalReferenceNode) return

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
      : hasReferences
        ? 'workflow-generate-reference'
        : 'workflow-generate'

    const request = buildToorGenRequest({
      tab: {
        id: tabId,
        requestMode: (isImagesToVideoNode || isVideoExtendNode || hasReferences) ? 'reference-to-video' : 'text-to-video',
        fields: effectiveFields,
      },
      state: {
        prompt,
        mediaUrls: effectiveMediaUrls,
      },
      settings: baseSettings,
      mentionReferences: effectiveMentions,
      combinedReferenceTabId: (hasReferences || isImagesToVideoNode) ? tabId : undefined,
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
      model: 'seedance-2.0-fast',
      ratio: '16:9',
      duration: 5,
      resolution: '720p',
      generateAudio: true,
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
  }, [saveGenerationHistoryEntry, updateNodeData])

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
    setEdges((current) => addEdge({
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
    }, current))
  }, [setEdges])

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

  const onDragOver = useCallback((event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback((event: ReactDragEvent<HTMLDivElement>) => {
    event.preventDefault()

    const kind = event.dataTransfer.getData('application/workflow-builder-node') as WorkflowBuilderNodeKind
    if (!kind) {
      return
    }

    const bounds = reactFlowWrapperRef.current?.getBoundingClientRect()
    if (!bounds) {
      return
    }

    const position = reactFlow.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    })

    setNodes((current) => current.concat(createWorkflowNode(kind, position)))
  }, [reactFlow, setNodes])

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
          model: 'seedance-2.0-fast',
          ratio: '16:9',
          duration: 5,
          resolution: '720p',
          generateAudio: true,
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
  ])

  const removeNode = useCallback((nodeId: string) => {
    setNodes((current) => current.filter((node) => node.id !== nodeId))
    setEdges((current) => current.filter((edge) => edge.source !== nodeId && edge.target !== nodeId))
    setSelectedNodeId((current) => (current === nodeId ? null : current))
  }, [setEdges, setNodes])

  const removeEdge = useCallback((edgeId: string) => {
    setEdges((current) => current.filter((edge) => edge.id !== edgeId))
    setSelectedEdgeId((current) => (current === edgeId ? null : current))
  }, [setEdges])

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

    try {
      window.localStorage.setItem(storageKey, JSON.stringify({ nodes, edges }))
      notify('Workflow saved to browser storage.', 'success')
    } catch {
      notify('Could not save the workflow to browser storage.', 'error')
    }

    if (!saveRemoteWorkflow) {
      return
    }

    try {
      await saveRemoteWorkflow({ nodes, edges })
    } catch {
      notify('Cloud save failed. Local save still succeeded.', 'warning')
    }
  }, [edges, nodes, notify, saveRemoteWorkflow, storageKey])

  const loadWorkflow = useCallback(async () => {
    if (readRemoteWorkflow) {
      try {
        const remoteWorkflow = await readRemoteWorkflow()
        if (remoteWorkflow) {
          const nextWorkflow = sanitizeWorkflow(remoteWorkflow)
          setNodes(nextWorkflow.nodes)
          setEdges(nextWorkflow.edges)
          setSelectedNodeId(null)
          setSelectedEdgeId(null)
          notify('Workflow loaded from cloud storage.', 'success')
          return
        }
      } catch {
        notify('Cloud load failed. Attempting local load.', 'warning')
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
      setSelectedNodeId(null)
      notify('Workflow loaded from browser storage.', 'success')
    } catch {
      notify('There was an error loading the saved workflow.', 'error')
    }
  }, [notify, readRemoteWorkflow, setEdges, setNodes, storageKey])

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
    isNodeExecuting: (nodeId: string) => executingNodeIds.has(nodeId),
  }), [executeNode, executingNodeIds, updateNodeData])

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
              onEdgeClick={(_event: ReactMouseEvent, edge) => { setSelectedEdgeId(edge.id); setSelectedNodeId(null) }}
              onPaneClick={() => { setSelectedNodeId(null); setSelectedEdgeId(null) }}
              nodeTypes={workflowNodeTypes}
              fitView
              fitViewOptions={{ padding: 0.18 }}
              snapToGrid
              snapGrid={[16, 16]}
              minZoom={0.08}
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
              edgesReconnectable={false}
            >
              <Background variant={BackgroundVariant.Dots} gap={20} size={1.2} color="#d8e0ea" />
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