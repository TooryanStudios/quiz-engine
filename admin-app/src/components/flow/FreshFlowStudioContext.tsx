import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type CSSProperties, type PropsWithChildren } from 'react'
import type { Edge, Node } from '@xyflow/react'

export type FreshFlowNodeKind = 'note' | 'decision' | 'group' | 'prompt' | 'image-reference' | 'video-reference' | 'audio-reference' | 'generation' | 'toorgen-generation'
export type FreshFlowTheme = 'slate' | 'ocean' | 'olive' | 'amber' | 'rose'
export type FreshFlowGenerationMode = 'normal' | 'extend'
export type FreshFlowVideoMode = 'text-to-video' | 'image-to-video'
export type FreshFlowModel = 'atlas-2.0' | 'seedance-2.0-fast' | 'seedance-2.0' | 'seedance-1.5'
export type FreshFlowAspectRatio = '16:9' | '9:16' | '4:3' | '3:4'
export type FreshFlowGenerationStatus = 'IDLE' | 'SUBMITTING' | 'IN_PROGRESS' | 'SUCCESS' | 'FAILED'
export type FreshFlowEdgeStyle = 'curved' | 'straight'

export type FlowViewport = {
  x: number
  y: number
  zoom: number
}

export type FreshFlowNodeData = {
  kind: FreshFlowNodeKind
  title: string
  body: string
  theme: FreshFlowTheme
  mediaUrl: string
  mediaUrls: string[]
  generationMode?: FreshFlowGenerationMode
  videoMode?: FreshFlowVideoMode
  model?: FreshFlowModel
  duration?: number
  aspectRatio?: FreshFlowAspectRatio
  previewVideoUrl?: string
  generationStatus?: FreshFlowGenerationStatus
  taskId?: string
  errorMessage?: string
}

export type FreshFlowNode = Node<FreshFlowNodeData, 'fresh-flow-block'>
export type FreshFlowEdge = Edge

export type FreshFlowDocument = {
  id: string
  name: string
  nodes: FreshFlowNode[]
  edges: FreshFlowEdge[]
  viewport: FlowViewport
  edgeStyleMode: FreshFlowEdgeStyle
  createdAt: number
  updatedAt: number
}

type FreshFlowStudioStoreEntry = {
  selectedFlowId: string | null
  flows: FreshFlowDocument[]
}

type FreshFlowStudioStore = {
  version: 1
  contexts: Record<string, FreshFlowStudioStoreEntry>
}

type FreshFlowStudioProviderProps = PropsWithChildren<{
  projectId: string | null
  folderId: string | null
  folderName: string
  sceneTitles?: string[]
}>

export type GenerationInputSocketRule = {
  label: string
  accepts: string
  acceptedKinds: FreshFlowNodeKind[]
}

export const FRESH_FLOW_STUDIO_STORAGE_KEY = 'lab_newlayout_flow_studio_v1'
export const DEFAULT_VIEWPORT: FlowViewport = { x: 0, y: 0, zoom: 1 }
export const DEFAULT_INPUT_HANDLE_ID = 'node-input'
export const DEFAULT_OUTPUT_HANDLE_ID = 'node-output'
export const GENERATION_OUTPUT_HANDLE_ID = 'generation-output'

const FLOW_STUDIO_PERSIST_DEBOUNCE_MS = 240

export const NODE_META_LABEL: Record<FreshFlowNodeKind, string> = {
  note: 'Note',
  decision: 'Decision',
  group: 'Group',
  prompt: 'Prompt',
  'image-reference': 'Image Ref',
  'video-reference': 'Video Ref',
  'audio-reference': 'Audio Ref',
  generation: 'Generation',
  'toorgen-generation': 'Generation',
}

export const NODE_TITLE_PREFIX: Record<FreshFlowNodeKind, string> = {
  note: 'Note',
  decision: 'Decision',
  group: 'Group',
  prompt: 'Prompt',
  'image-reference': 'Image Ref',
  'video-reference': 'Video Ref',
  'audio-reference': 'Audio Ref',
  generation: 'Generation',
  'toorgen-generation': 'Generation',
}

export const NODE_PLACEHOLDER: Record<FreshFlowNodeKind, string> = {
  note: 'Write notes, constraints, or scene context',
  decision: 'Describe the branch, routing logic, or rule',
  group: 'Use this block to frame a section, sequence, or cluster of work',
  prompt: 'Describe the subject, motion, framing, lighting, and camera intent',
  'image-reference': 'Add image references to anchor the look or composition',
  'video-reference': 'Add a video reference to guide motion or framing',
  'audio-reference': 'Add music or audio references to shape the output',
  generation: 'Add generation notes, constraints, or execution instructions',
  'toorgen-generation': 'Add generation notes, constraints, or execution instructions',
}

export const NODE_DEFAULT_THEME: Record<FreshFlowNodeKind, FreshFlowTheme> = {
  note: 'slate',
  decision: 'amber',
  group: 'olive',
  prompt: 'slate',
  'image-reference': 'ocean',
  'video-reference': 'ocean',
  'audio-reference': 'ocean',
  generation: 'rose',
  'toorgen-generation': 'rose',
}

export const NODE_DEFAULT_SIZE: Record<FreshFlowNodeKind, { width: number; height: number }> = {
  note: { width: 300, height: 220 },
  decision: { width: 300, height: 210 },
  group: { width: 420, height: 300 },
  prompt: { width: 340, height: 250 },
  'image-reference': { width: 340, height: 270 },
  'video-reference': { width: 320, height: 280 },
  'audio-reference': { width: 320, height: 230 },
  generation: { width: 390, height: 360 },
  'toorgen-generation': { width: 390, height: 360 },
}

export const NODE_MIN_SIZE: Record<FreshFlowNodeKind, { width: number; height: number }> = {
  note: { width: 240, height: 170 },
  decision: { width: 250, height: 180 },
  group: { width: 320, height: 230 },
  prompt: { width: 280, height: 200 },
  'image-reference': { width: 300, height: 220 },
  'video-reference': { width: 280, height: 240 },
  'audio-reference': { width: 280, height: 190 },
  generation: { width: 340, height: 300 },
  'toorgen-generation': { width: 340, height: 300 },
}

export const THEME_LABEL: Record<FreshFlowTheme, string> = {
  slate: 'Slate',
  ocean: 'Ocean',
  olive: 'Olive',
  amber: 'Amber',
  rose: 'Rose',
}

export const THEME_RESIZER_COLOR: Record<FreshFlowTheme, string> = {
  slate: '#adc5eb',
  ocean: '#7ab8f7',
  olive: '#b7d08c',
  amber: '#f4b35f',
  rose: '#f0a8bb',
}

export const GENERATION_MODE_OPTIONS: { value: FreshFlowGenerationMode; label: string }[] = [
  { value: 'normal', label: 'Normal generation' },
  { value: 'extend', label: 'Extend clip' },
]

export const GENERATION_VIDEO_MODE_OPTIONS: { value: FreshFlowVideoMode; label: string }[] = [
  { value: 'text-to-video', label: 'Text to video' },
  { value: 'image-to-video', label: 'Image to video' },
]

export const GENERATION_MODEL_OPTIONS: { value: FreshFlowModel; label: string }[] = [
  { value: 'atlas-2.0', label: '2.0 (Atlas Cloud)' },
  { value: 'seedance-2.0-fast', label: '2.0 Fast (Atlas Cloud)' },
  { value: 'seedance-2.0', label: '2.0 (Seedance API)' },
  { value: 'seedance-1.5', label: '1.5 (Seedance API)' },
]

export const GENERATION_DURATION_OPTIONS = [5, 10, 15] as const
export const GENERATION_ASPECT_RATIO_OPTIONS: FreshFlowAspectRatio[] = ['16:9', '9:16', '4:3', '3:4']

export const GENERATION_INPUT_SOCKET_RULES: Record<string, GenerationInputSocketRule> = {
  'input-1': { label: 'Prompt', accepts: 'Prompt nodes', acceptedKinds: ['prompt', 'note'] },
  'input-2': { label: 'Image', accepts: 'Image references', acceptedKinds: ['image-reference'] },
  'input-3': { label: 'Video ref', accepts: 'Video references', acceptedKinds: ['video-reference'] },
  'input-4': { label: 'Direction', accepts: 'Direction notes', acceptedKinds: ['prompt', 'note', 'decision'] },
  'input-5': { label: 'Extend from', accepts: 'Generation nodes', acceptedKinds: ['generation'] },
  'input-6': { label: 'Audio ref', accepts: 'Audio references', acceptedKinds: ['audio-reference'] },
}

export const DECISION_OUTPUTS = [
  { id: 'decision-path-a', label: 'Path A', top: '40%' },
  { id: 'decision-path-b', label: 'Path B', top: '72%' },
] as const

export const getGenerationInputSocketLayout = () => {
  const socketEntries = Object.entries(GENERATION_INPUT_SOCKET_RULES)
  const start = 18
  const span = 64
  return socketEntries.map(([id, rule], index) => ({
    id,
    label: rule.label,
    accepts: rule.accepts,
    acceptedKinds: rule.acceptedKinds,
    top: `${start + ((span * index) / Math.max(1, socketEntries.length - 1))}%`,
  }))
}

export const getDefaultGenerationSocketForKind = (kind: FreshFlowNodeKind): string => {
  if (kind === 'image-reference') return 'input-2'
  if (kind === 'video-reference') return 'input-3'
  if (kind === 'audio-reference') return 'input-6'
  if (kind === 'generation' || kind === 'toorgen-generation') return 'input-5'
  if (kind === 'decision') return 'input-4'
  return 'input-1'
}

const isObjectRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object'

const toNumber = (value: unknown, fallback: number): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

export const createId = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

const normalizeFreshFlowKind = (value: unknown): FreshFlowNodeKind => {
  if (value === 'step') return 'note'
  if (value === 'render') return 'generation'
  if (value === 'note' || value === 'decision' || value === 'group' || value === 'prompt' || value === 'image-reference' || value === 'video-reference' || value === 'audio-reference' || value === 'generation') {
    return value
  }
  return 'note'
}

const normalizeFreshFlowTheme = (kind: FreshFlowNodeKind, value: unknown): FreshFlowTheme => {
  if (value === 'slate' || value === 'ocean' || value === 'olive' || value === 'amber' || value === 'rose') return value
  return NODE_DEFAULT_THEME[kind]
}

const normalizeGenerationMode = (value: unknown): FreshFlowGenerationMode => value === 'extend' ? 'extend' : 'normal'
const normalizeVideoMode = (value: unknown): FreshFlowVideoMode => value === 'image-to-video' ? 'image-to-video' : 'text-to-video'

const normalizeModel = (value: unknown): FreshFlowModel => {
  if (value === 'atlas-2.0' || value === 'seedance-2.0-fast' || value === 'seedance-2.0' || value === 'seedance-1.5') return value
  return 'atlas-2.0'
}

const normalizeAspectRatio = (value: unknown): FreshFlowAspectRatio => {
  if (value === '16:9' || value === '9:16' || value === '4:3' || value === '3:4') return value
  return '16:9'
}

const normalizeGenerationStatus = (value: unknown): FreshFlowGenerationStatus => {
  if (value === 'SUBMITTING' || value === 'IN_PROGRESS' || value === 'SUCCESS' || value === 'FAILED') return value
  return 'IDLE'
}

const isFreshFlowNode = (value: unknown): value is FreshFlowNode => {
  if (!isObjectRecord(value) || !isObjectRecord(value.position) || !isObjectRecord(value.data)) return false
  return typeof value.id === 'string'
    && typeof value.type === 'string'
    && typeof value.position.x === 'number'
    && typeof value.position.y === 'number'
    && typeof value.data.title === 'string'
    && typeof value.data.body === 'string'
}

const isFreshFlowEdge = (value: unknown): value is FreshFlowEdge => {
  if (!isObjectRecord(value)) return false
  return typeof value.id === 'string' && typeof value.source === 'string' && typeof value.target === 'string'
}

const normalizeFreshFlowEdge = (value: FreshFlowEdge): FreshFlowEdge => {
  const edge = { ...value }
  if (edge.sourceHandle === null || edge.sourceHandle === 'null') delete edge.sourceHandle
  if (edge.targetHandle === null || edge.targetHandle === 'null') delete edge.targetHandle
  return edge
}

export const normalizeFreshFlowNode = (value: FreshFlowNode): FreshFlowNode => {
  const kind = normalizeFreshFlowKind(value.data.kind)
  const rawStyle = (value.style ?? {}) as CSSProperties & Record<string, unknown>
  const defaultSize = NODE_DEFAULT_SIZE[kind]
  const rawMediaUrls = Array.isArray(value.data.mediaUrls)
    ? value.data.mediaUrls.map((entry) => String(entry || '').trim()).filter(Boolean)
    : []
  const mediaUrls = kind === 'image-reference'
    ? (rawMediaUrls.length > 0
        ? rawMediaUrls
        : (typeof value.data.mediaUrl === 'string' && value.data.mediaUrl.trim() ? [value.data.mediaUrl.trim()] : []))
    : []

  return {
    ...value,
    type: 'fresh-flow-block',
    dragHandle: '.fresh-flow-node__dragbar',
    style: {
      ...value.style,
      width: toNumber(rawStyle.width ?? value.width, defaultSize.width),
      height: toNumber(rawStyle.height ?? value.height, defaultSize.height),
    },
    data: {
      kind,
      title: typeof value.data.title === 'string' ? value.data.title : `${NODE_TITLE_PREFIX[kind]} 01`,
      body: typeof value.data.body === 'string' ? value.data.body : '',
      theme: normalizeFreshFlowTheme(kind, value.data.theme),
      mediaUrl: typeof value.data.mediaUrl === 'string' ? value.data.mediaUrl : '',
      mediaUrls,
      ...((kind === 'generation' || kind === 'toorgen-generation')
        ? {
            generationMode: normalizeGenerationMode(value.data.generationMode),
            videoMode: normalizeVideoMode(value.data.videoMode),
            model: normalizeModel(value.data.model),
            duration: [5, 10, 15].includes(Number(value.data.duration)) ? Number(value.data.duration) : 5,
            aspectRatio: normalizeAspectRatio(value.data.aspectRatio),
            previewVideoUrl: typeof value.data.previewVideoUrl === 'string' ? value.data.previewVideoUrl : '',
            generationStatus: normalizeGenerationStatus(value.data.generationStatus),
          }
        : {}),
    },
  }
}

export const filterFreshFlowEdges = (nodes: FreshFlowNode[], edges: FreshFlowEdge[]): FreshFlowEdge[] => {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]))

  return edges.filter((edge) => {
    const sourceNode = nodeMap.get(edge.source)
    const targetNode = nodeMap.get(edge.target)
    if (!sourceNode || !targetNode) return false
    if (sourceNode.id === targetNode.id) return false
    if (sourceNode.data.kind === 'group' || targetNode.data.kind === 'group') return false

    if (targetNode.data.kind === 'generation' || targetNode.data.kind === 'toorgen-generation') {
      const socketRule = edge.targetHandle ? GENERATION_INPUT_SOCKET_RULES[edge.targetHandle] : null
      if (!socketRule) return false
      if (!socketRule.acceptedKinds.includes(sourceNode.data.kind)) return false
    } else if (targetNode.data.kind === 'note' || targetNode.data.kind === 'prompt' || targetNode.data.kind === 'decision') {
      if (edge.targetHandle !== DEFAULT_INPUT_HANDLE_ID) return false
    } else {
      return false
    }

    if (sourceNode.data.kind === 'decision') {
      return DECISION_OUTPUTS.some((entry) => entry.id === edge.sourceHandle)
    }

    if (sourceNode.data.kind === 'generation' || sourceNode.data.kind === 'toorgen-generation') {
      return edge.sourceHandle === GENERATION_OUTPUT_HANDLE_ID
    }

    if (
      sourceNode.data.kind === 'note'
      || sourceNode.data.kind === 'prompt'
      || sourceNode.data.kind === 'image-reference'
      || sourceNode.data.kind === 'video-reference'
      || sourceNode.data.kind === 'audio-reference'
    ) {
      return edge.sourceHandle === DEFAULT_OUTPUT_HANDLE_ID
    }

    return false
  })
}

const preserveEdgeArrayReference = (currentEdges: FreshFlowEdge[], nextEdges: FreshFlowEdge[]) => {
  if (currentEdges.length !== nextEdges.length) return nextEdges

  for (let index = 0; index < currentEdges.length; index += 1) {
    if (currentEdges[index] !== nextEdges[index]) return nextEdges
  }

  return currentEdges
}

export const createFreshFlowNode = (
  kind: FreshFlowNodeKind,
  position: { x: number; y: number },
  ordinal: number,
): FreshFlowNode => ({
  id: createId('fresh-node'),
  type: 'fresh-flow-block',
  position,
  dragHandle: '.fresh-flow-node__dragbar',
  style: {
    width: NODE_DEFAULT_SIZE[kind].width,
    height: NODE_DEFAULT_SIZE[kind].height,
  },
  data: {
    kind,
    title: `${NODE_TITLE_PREFIX[kind]} ${String(ordinal).padStart(2, '0')}`,
    body: '',
    theme: NODE_DEFAULT_THEME[kind],
    mediaUrl: '',
    mediaUrls: [],
    ...((kind === 'generation' || kind === 'toorgen-generation')
      ? {
          generationMode: 'normal' as FreshFlowGenerationMode,
          videoMode: 'text-to-video' as FreshFlowVideoMode,
          model: 'atlas-2.0' as FreshFlowModel,
          duration: 5,
          aspectRatio: '16:9' as FreshFlowAspectRatio,
          previewVideoUrl: '',
          generationStatus: 'IDLE' as FreshFlowGenerationStatus,
        }
      : {}),
  },
})

const createEmptyFlowDocument = (name: string): FreshFlowDocument => {
  const now = Date.now()
  return {
    id: createId('fresh-flow-doc'),
    name,
    nodes: [],
    edges: [],
    viewport: DEFAULT_VIEWPORT,
    edgeStyleMode: 'curved',
    createdAt: now,
    updatedAt: now,
  }
}

const normalizeEdgeStyleMode = (value: unknown): FreshFlowEdgeStyle => value === 'straight' ? 'straight' : 'curved'

const normalizeFreshFlowDocument = (value: unknown): FreshFlowDocument | null => {
  if (!isObjectRecord(value) || !Array.isArray(value.nodes) || !Array.isArray(value.edges)) return null
  const name = typeof value.name === 'string' && value.name.trim() ? value.name.trim() : 'Flow'
  const nodes = value.nodes.filter(isFreshFlowNode).map(normalizeFreshFlowNode)
  const edges = value.edges.filter(isFreshFlowEdge).map(normalizeFreshFlowEdge)

  return {
    id: typeof value.id === 'string' ? value.id : createId('fresh-flow-doc'),
    name,
    nodes,
    edges: filterFreshFlowEdges(nodes, edges),
    viewport: {
      x: toNumber(value.viewport && isObjectRecord(value.viewport) ? value.viewport.x : undefined, DEFAULT_VIEWPORT.x),
      y: toNumber(value.viewport && isObjectRecord(value.viewport) ? value.viewport.y : undefined, DEFAULT_VIEWPORT.y),
      zoom: toNumber(value.viewport && isObjectRecord(value.viewport) ? value.viewport.zoom : undefined, DEFAULT_VIEWPORT.zoom),
    },
    edgeStyleMode: normalizeEdgeStyleMode(value.edgeStyleMode),
    createdAt: toNumber(value.createdAt, Date.now()),
    updatedAt: toNumber(value.updatedAt, Date.now()),
  }
}

const loadFreshFlowStudioStore = (): FreshFlowStudioStore => {
  try {
    const raw = localStorage.getItem(FRESH_FLOW_STUDIO_STORAGE_KEY)
    if (!raw) return { version: 1, contexts: {} }
    const parsed = JSON.parse(raw) as Partial<FreshFlowStudioStore>
    if (parsed.version !== 1 || !isObjectRecord(parsed.contexts)) return { version: 1, contexts: {} }

    const contexts = Object.entries(parsed.contexts).reduce<Record<string, FreshFlowStudioStoreEntry>>((accumulator, [key, value]) => {
      if (!isObjectRecord(value) || !Array.isArray(value.flows)) return accumulator
      const flows = value.flows.map(normalizeFreshFlowDocument).filter((item): item is FreshFlowDocument => Boolean(item))
      if (flows.length === 0) return accumulator
      const selectedFlowId = typeof value.selectedFlowId === 'string' && flows.some((flow) => flow.id === value.selectedFlowId)
        ? value.selectedFlowId
        : flows[0].id
      accumulator[key] = { selectedFlowId, flows }
      return accumulator
    }, {})

    return { version: 1, contexts }
  } catch {
    return { version: 1, contexts: {} }
  }
}

const persistFreshFlowStudioStore = (store: FreshFlowStudioStore) => {
  try {
    localStorage.setItem(FRESH_FLOW_STUDIO_STORAGE_KEY, JSON.stringify(store))
  } catch {
    // Ignore storage failures.
  }
}

const buildContextKey = (projectId: string | null, folderId: string | null) => (
  projectId && folderId ? `${projectId}::${folderId}` : null
)

const buildDefaultFlowName = (existingFlows: FreshFlowDocument[], folderName: string, sceneTitles: string[]) => {
  const usedNames = new Set(existingFlows.map((flow) => flow.name.trim().toLowerCase()))
  const suggestedSceneTitle = sceneTitles.find((title) => title.trim() && !usedNames.has(title.trim().toLowerCase()))
  if (suggestedSceneTitle) return suggestedSceneTitle.trim()

  const baseLabel = folderName.trim() || 'Flow'
  let ordinal = existingFlows.length + 1
  let candidate = `${baseLabel} Flow ${ordinal}`
  while (usedNames.has(candidate.toLowerCase())) {
    ordinal += 1
    candidate = `${baseLabel} Flow ${ordinal}`
  }
  return candidate
}

const ensureContextEntry = (currentStore: FreshFlowStudioStore, contextKey: string, folderName: string, sceneTitles: string[]) => {
  const existingEntry = currentStore.contexts[contextKey]
  if (existingEntry && existingEntry.flows.length > 0) return currentStore

  const initialFlow = createEmptyFlowDocument(buildDefaultFlowName(existingEntry?.flows || [], folderName, sceneTitles))
  return {
    ...currentStore,
    contexts: {
      ...currentStore.contexts,
      [contextKey]: {
        selectedFlowId: initialFlow.id,
        flows: [initialFlow],
      },
    },
  }
}

type FreshFlowStudioContextValue = {
  isReady: boolean
  folderName: string
  flowDocuments: FreshFlowDocument[]
  selectedFlowId: string | null
  currentFlowDocument: FreshFlowDocument | null
  selectedNodeId: string | null
  selectedNode: FreshFlowNode | null
  edgeStyleMode: FreshFlowEdgeStyle
  setSelectedNodeId: (nodeId: string | null) => void
  selectFlow: (flowId: string) => void
  createFlow: () => void
  renameFlow: (flowId: string, name: string) => void
  deleteFlow: (flowId: string) => void
  setNodes: (nodes: FreshFlowNode[]) => void
  setEdges: (edges: FreshFlowEdge[]) => void
  setViewport: (viewport: FlowViewport) => void
  setEdgeStyleMode: (mode: FreshFlowEdgeStyle) => void
  patchNode: (nodeId: string, patch: Partial<FreshFlowNodeData>) => void
  createNode: (kind: FreshFlowNodeKind, position: { x: number; y: number }) => void
  disconnectHandle: (nodeId: string, handleId: string | null, handleType: 'source' | 'target') => void
  disconnectNode: (nodeId: string) => void
  updateImageReferenceUrls: (nodeId: string, urls: string[]) => void
  addImageReferenceSlot: (nodeId: string) => void
  removeImageReferenceSlot: (nodeId: string, index: number) => void
}

const FreshFlowStudioContext = createContext<FreshFlowStudioContextValue | null>(null)

export function useFreshFlowStudio() {
  const context = useContext(FreshFlowStudioContext)
  if (!context) throw new Error('FreshFlowStudioContext is not available')
  return context
}

export function FreshFlowStudioProvider({ children, projectId, folderId, folderName, sceneTitles = [] }: FreshFlowStudioProviderProps) {
  const contextKey = useMemo(() => buildContextKey(projectId, folderId), [folderId, projectId])
  const normalizedSceneTitles = useMemo(() => sceneTitles.map((title) => title.trim()).filter(Boolean), [sceneTitles])
  const [store, setStore] = useState<FreshFlowStudioStore>(() => loadFreshFlowStudioStore())
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const persistTimerRef = useRef<number | null>(null)

  useEffect(() => {
    if (!contextKey) return
    setStore((current) => ensureContextEntry(current, contextKey, folderName, normalizedSceneTitles))
  }, [contextKey, folderName, normalizedSceneTitles])

  useEffect(() => {
    if (persistTimerRef.current !== null) {
      window.clearTimeout(persistTimerRef.current)
    }

    persistTimerRef.current = window.setTimeout(() => {
      persistFreshFlowStudioStore(store)
      persistTimerRef.current = null
    }, FLOW_STUDIO_PERSIST_DEBOUNCE_MS)

    return () => {
      if (persistTimerRef.current !== null) {
        window.clearTimeout(persistTimerRef.current)
        persistTimerRef.current = null
      }
    }
  }, [store])

  useEffect(() => () => {
    if (persistTimerRef.current === null) return
    window.clearTimeout(persistTimerRef.current)
    persistFreshFlowStudioStore(store)
    persistTimerRef.current = null
  }, [store])

  const contextEntry = useMemo(() => {
    if (!contextKey) return null
    return store.contexts[contextKey] ?? null
  }, [contextKey, store.contexts])

  const flowDocuments = contextEntry?.flows ?? []
  const selectedFlowId = contextEntry?.selectedFlowId ?? flowDocuments[0]?.id ?? null
  const currentFlowDocument = selectedFlowId
    ? flowDocuments.find((flow) => flow.id === selectedFlowId) ?? flowDocuments[0] ?? null
    : flowDocuments[0] ?? null
  const selectedNode = selectedNodeId && currentFlowDocument
    ? currentFlowDocument.nodes.find((node) => node.id === selectedNodeId) ?? null
    : null

  useEffect(() => {
    setSelectedNodeId(null)
  }, [contextKey, selectedFlowId])

  useEffect(() => {
    if (!selectedNodeId || !currentFlowDocument) return
    if (!currentFlowDocument.nodes.some((node) => node.id === selectedNodeId)) setSelectedNodeId(null)
  }, [currentFlowDocument, selectedNodeId])

  const updateContextEntry = useCallback((updater: (entry: FreshFlowStudioStoreEntry) => FreshFlowStudioStoreEntry) => {
    if (!contextKey) return
    setStore((current) => {
      const ensuredStore = ensureContextEntry(current, contextKey, folderName, normalizedSceneTitles)
      const entry = ensuredStore.contexts[contextKey]
      const nextEntry = updater(entry)
      if (nextEntry === entry) return ensuredStore
      return {
        ...ensuredStore,
        contexts: {
          ...ensuredStore.contexts,
          [contextKey]: nextEntry,
        },
      }
    })
  }, [contextKey, folderName, normalizedSceneTitles])

  const updateCurrentFlow = useCallback((updater: (flow: FreshFlowDocument) => FreshFlowDocument) => {
    updateContextEntry((entry) => {
      const activeFlowId = entry.selectedFlowId ?? entry.flows[0]?.id ?? null
      if (!activeFlowId) return entry
      let didChange = false
      const nextFlows = entry.flows.map((flow) => {
        if (flow.id !== activeFlowId) return flow
        const nextFlow = updater(flow)
        didChange = didChange || nextFlow !== flow
        return nextFlow
      })
      if (!didChange) return entry
      return { ...entry, flows: nextFlows }
    })
  }, [updateContextEntry])

  const selectFlow = useCallback((flowId: string) => {
    updateContextEntry((entry) => {
      if (entry.selectedFlowId === flowId || !entry.flows.some((flow) => flow.id === flowId)) return entry
      return { ...entry, selectedFlowId: flowId }
    })
  }, [updateContextEntry])

  const createFlow = useCallback(() => {
    updateContextEntry((entry) => {
      const nextFlow = createEmptyFlowDocument(buildDefaultFlowName(entry.flows, folderName, normalizedSceneTitles))
      return { selectedFlowId: nextFlow.id, flows: [...entry.flows, nextFlow] }
    })
  }, [folderName, normalizedSceneTitles, updateContextEntry])

  const renameFlow = useCallback((flowId: string, name: string) => {
    const nextName = name.trim()
    if (!nextName) return
    updateContextEntry((entry) => ({
      ...entry,
      flows: entry.flows.map((flow) => flow.id === flowId ? { ...flow, name: nextName, updatedAt: Date.now() } : flow),
    }))
  }, [updateContextEntry])

  const deleteFlow = useCallback((flowId: string) => {
    updateContextEntry((entry) => {
      const remainingFlows = entry.flows.filter((flow) => flow.id !== flowId)
      if (remainingFlows.length === 0) {
        const replacementFlow = createEmptyFlowDocument(buildDefaultFlowName([], folderName, normalizedSceneTitles))
        return { selectedFlowId: replacementFlow.id, flows: [replacementFlow] }
      }
      return {
        selectedFlowId: entry.selectedFlowId === flowId ? remainingFlows[0].id : (entry.selectedFlowId ?? remainingFlows[0].id),
        flows: remainingFlows,
      }
    })
  }, [folderName, normalizedSceneTitles, updateContextEntry])

  const setNodes = useCallback((nodes: FreshFlowNode[]) => {
    updateCurrentFlow((flow) => {
      const nextEdges = preserveEdgeArrayReference(flow.edges, filterFreshFlowEdges(nodes, flow.edges))
      return { ...flow, nodes, edges: nextEdges, updatedAt: Date.now() }
    })
  }, [updateCurrentFlow])

  const setEdges = useCallback((edges: FreshFlowEdge[]) => {
    updateCurrentFlow((flow) => {
      const nextEdges = preserveEdgeArrayReference(flow.edges, filterFreshFlowEdges(flow.nodes, edges))
      return { ...flow, edges: nextEdges, updatedAt: Date.now() }
    })
  }, [updateCurrentFlow])

  const setViewport = useCallback((viewport: FlowViewport) => {
    updateCurrentFlow((flow) => {
      if (flow.viewport.x === viewport.x && flow.viewport.y === viewport.y && flow.viewport.zoom === viewport.zoom) return flow
      return { ...flow, viewport, updatedAt: Date.now() }
    })
  }, [updateCurrentFlow])

  const setEdgeStyleMode = useCallback((mode: FreshFlowEdgeStyle) => {
    updateCurrentFlow((flow) => flow.edgeStyleMode === mode ? flow : { ...flow, edgeStyleMode: mode, updatedAt: Date.now() })
  }, [updateCurrentFlow])

  const patchNode = useCallback((nodeId: string, patch: Partial<FreshFlowNodeData>) => {
    updateCurrentFlow((flow) => {
      let didChange = false
      const nextNodes = flow.nodes.map((node) => {
        if (node.id !== nodeId) return node
        didChange = true
        return {
          ...node,
          data: {
            ...node.data,
            ...patch,
            ...(patch.mediaUrls ? { mediaUrl: patch.mediaUrls[0] || '' } : {}),
          },
        }
      })
      if (!didChange) return flow
      const nextEdges = preserveEdgeArrayReference(flow.edges, filterFreshFlowEdges(nextNodes, flow.edges))
      return { ...flow, nodes: nextNodes, edges: nextEdges, updatedAt: Date.now() }
    })
  }, [updateCurrentFlow])

  const createNode = useCallback((kind: FreshFlowNodeKind, position: { x: number; y: number }) => {
    updateCurrentFlow((flow) => {
      const ordinal = flow.nodes.filter((node) => node.data.kind === kind).length + 1
      return { ...flow, nodes: [...flow.nodes, createFreshFlowNode(kind, position, ordinal)], updatedAt: Date.now() }
    })
  }, [updateCurrentFlow])

  const disconnectHandle = useCallback((nodeId: string, handleId: string | null, handleType: 'source' | 'target') => {
    updateCurrentFlow((flow) => ({
      ...flow,
      edges: flow.edges.filter((edge) => {
        if (handleType === 'source') {
          if (edge.source !== nodeId) return true
          if (handleId !== null) return edge.sourceHandle !== handleId
          return false
        }
        if (edge.target !== nodeId) return true
        if (handleId !== null) return edge.targetHandle !== handleId
        return false
      }),
      updatedAt: Date.now(),
    }))
  }, [updateCurrentFlow])

  const disconnectNode = useCallback((nodeId: string) => {
    updateCurrentFlow((flow) => ({ ...flow, edges: flow.edges.filter((edge) => edge.source !== nodeId && edge.target !== nodeId), updatedAt: Date.now() }))
  }, [updateCurrentFlow])

  const updateImageReferenceUrls = useCallback((nodeId: string, urls: string[]) => {
    const nextUrls = urls.map((value) => String(value ?? ''))
    const firstPopulatedUrl = nextUrls.find((value) => value.trim()) || ''
    patchNode(nodeId, { mediaUrls: nextUrls, mediaUrl: firstPopulatedUrl })
  }, [patchNode])

  const addImageReferenceSlot = useCallback((nodeId: string) => {
    if (!currentFlowDocument) return
    const node = currentFlowDocument.nodes.find((entry) => entry.id === nodeId)
    if (!node || node.data.kind !== 'image-reference') return
    patchNode(nodeId, { mediaUrls: [...node.data.mediaUrls, ''] })
  }, [currentFlowDocument, patchNode])

  const removeImageReferenceSlot = useCallback((nodeId: string, index: number) => {
    if (!currentFlowDocument) return
    const node = currentFlowDocument.nodes.find((entry) => entry.id === nodeId)
    if (!node || node.data.kind !== 'image-reference') return
    patchNode(nodeId, { mediaUrls: node.data.mediaUrls.filter((_, itemIndex) => itemIndex !== index) })
  }, [currentFlowDocument, patchNode])

  const value = useMemo<FreshFlowStudioContextValue>(() => ({
    isReady: Boolean(contextKey && currentFlowDocument),
    folderName,
    flowDocuments,
    selectedFlowId,
    currentFlowDocument,
    selectedNodeId,
    selectedNode,
    edgeStyleMode: currentFlowDocument?.edgeStyleMode ?? 'curved',
    setSelectedNodeId,
    selectFlow,
    createFlow,
    renameFlow,
    deleteFlow,
    setNodes,
    setEdges,
    setViewport,
    setEdgeStyleMode,
    patchNode,
    createNode,
    disconnectHandle,
    disconnectNode,
    updateImageReferenceUrls,
    addImageReferenceSlot,
    removeImageReferenceSlot,
  }), [addImageReferenceSlot, contextKey, createFlow, createNode, currentFlowDocument, deleteFlow, disconnectHandle, disconnectNode, flowDocuments, folderName, patchNode, removeImageReferenceSlot, renameFlow, selectFlow, selectedFlowId, selectedNode, selectedNodeId, setEdgeStyleMode, setEdges, setNodes, setViewport, updateImageReferenceUrls])

  return <FreshFlowStudioContext.Provider value={value}>{children}</FreshFlowStudioContext.Provider>
}