import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'
import {
  addEdge,
  applyNodeChanges,
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MiniMap,
  NodeResizer,
  Position,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Connection,
  type NodeChange,
  type Node,
  type Edge,
  type OnNodeDrag,
  type NodeProps,
} from '@xyflow/react'
import { useDetailRailMode } from '../../pages/workhub/hooks/useDetailRailMode'
import '@xyflow/react/dist/style.css'
import './FlowBoardCanvas.css'

// ── External / serialisation types (kept stable for callers) ──────────────────

type CanvasPattern = 'dots' | 'lines'
type CanvasPreset = 'bright' | 'dark' | 'reset'

type CanvasAppearance = {
  backgroundColor: string
  patternColor: string
  pattern: CanvasPattern
}

type FlowBoardSettings = {
  canvasAppearance: CanvasAppearance
  showNavigationPreview: boolean
}

type FlowViewport = {
  x: number
  y: number
  zoom: number
}

type FlowNodeData = {
  kind?: string
  label?: string
  noteColor?: string
  imageUrl?: string
  caption?: string
  tags?: string
  groupId?: string
  locked?: boolean
  collapsed?: boolean
  isAttachTarget?: boolean
  connectable?: boolean
  isUploading?: boolean
  imageWidth?: number
  imageHeight?: number
  [key: string]: unknown
}

// Internal React Flow generic types
type RFNode = Node<FlowNodeData>
type RFEdge = Edge

// Serialisation-compatible external node/edge shapes (used by onStateChange / initialState)
type FlowNode = {
  id: string
  type?: string
  position?: { x: number; y: number }
  data?: FlowNodeData
  style?: Record<string, unknown>
}

type FlowEdge = Record<string, unknown>

type FlowState = {
  nodes: FlowNode[]
  edges: FlowEdge[]
  viewport: FlowViewport
  settings: FlowBoardSettings
}

type FlowBoardCanvasDetailsContext = {
  selectedNode: FlowNode | null
  selectedData: FlowNodeData
  canvasAppearance: CanvasAppearance
  showNavigationPreview: boolean
  selectedGroupLabel: string
  updateSelectedNodeData: (patch: Partial<FlowNodeData>) => void
  updateSelectedNodeStyle: (patch: Record<string, unknown>) => void
  updateSelectedNodeSize: (dimension: 'width' | 'height', value: number) => void
  updateCanvasAppearance: (patch: Partial<CanvasAppearance>) => void
  setShowNavigationPreview: (value: boolean) => void
  applyCanvasPreset: (preset: CanvasPreset) => void
  sendSelectedNodeToBack: () => void
  bringSelectedNodeForward: () => void
  toggleSelectedGroupLock: () => void
  toggleSelectedGroupCollapse: () => void
  removeSelectedNode: () => void
}

type FlowBoardCanvasProps = {
  variant: 'project' | 'mood'
  stateKey: string
  boardTitle: string
  onBoardTitleChange: (nextTitle: string) => void
  onBoardShare: () => void
  onBoardDelete: () => void
  uploadImages: (files: File[]) => Promise<string[]>
  initialState?: {
    nodes?: unknown[]
    edges?: unknown[]
    viewport?: Partial<FlowViewport>
    canvasAppearance?: Partial<CanvasAppearance>
    showNavigationPreview?: boolean
  }
  renderDetailsPanel?: (context: FlowBoardCanvasDetailsContext) => ReactNode
  onStateChange?: (state: FlowState) => void
}

type ImageUploadDraft = {
  id: string
  file: File
  width: number
  height: number
  style: CSSProperties
  node: RFNode
}

const IMAGE_MIN_WIDTH = 160
const IMAGE_MAX_WIDTH = 420
const IMAGE_MIN_HEIGHT = 120
const IMAGE_MAX_HEIGHT = 320
const DEFAULT_NOTE_SIZE = { width: 220, height: 140 }
const DEFAULT_GROUP_SIZE = { width: 520, height: 360 }
const DEFAULT_Z_INDEX = {
  group: 0,
  note: 10,
  image: 20,
} as const

// ── Utilities ─────────────────────────────────────────────────────────────────

function toNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

function createNodeId(): string {
  return `node-${
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  }`
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'))
}

function sanitizeNodeData(data: FlowNodeData | undefined): FlowNodeData {
  if (!data) return {}
  const { connectable: _connectable, isUploading: _isUploading, isAttachTarget: _isAttachTarget, ...rest } = data
  return rest
}

function isGroupNode(node: RFNode): boolean {
  return node.type === 'groupNode' || node.data?.kind === 'group'
}

function isImageNode(node: RFNode): boolean {
  return node.type === 'imageNode' || node.data?.kind === 'image'
}

function getNodeSize(node: Pick<RFNode, 'style'>): { width: number; height: number } {
  const style = (node.style ?? {}) as Record<string, unknown>
  return {
    width: toNumber(style.width, DEFAULT_NOTE_SIZE.width),
    height: toNumber(style.height, DEFAULT_NOTE_SIZE.height),
  }
}

function getNodeZIndex(node: RFNode): number {
  const style = (node.style ?? {}) as Record<string, unknown>
  const fallback = isGroupNode(node)
    ? DEFAULT_Z_INDEX.group
    : (isImageNode(node) ? DEFAULT_Z_INDEX.image : DEFAULT_Z_INDEX.note)
  return toNumber(style.zIndex, fallback)
}

function getNodeRect(node: RFNode): { left: number; top: number; right: number; bottom: number; area: number } {
  const { width, height } = getNodeSize(node)
  return {
    left: node.position.x,
    top: node.position.y,
    right: node.position.x + width,
    bottom: node.position.y + height,
    area: width * height,
  }
}

function findContainingGroup(node: RFNode, groups: RFNode[]): RFNode | null {
  const { width, height } = getNodeSize(node)
  const centerX = node.position.x + (width / 2)
  const centerY = node.position.y + (height / 2)

  return groups
    .filter((group) => {
      const rect = getNodeRect(group)
      return centerX >= rect.left && centerX <= rect.right && centerY >= rect.top && centerY <= rect.bottom
    })
    .sort((a, b) => getNodeRect(a).area - getNodeRect(b).area)[0] ?? null
}

function syncImageGroupMembership(nodes: RFNode[]): RFNode[] {
  const groups = nodes.filter(isGroupNode)
  let changed = false

  const nextNodes = nodes.map((node) => {
    const nextZIndex = getNodeZIndex(node)
    const nextStyle: CSSProperties = { ...(node.style ?? {}), zIndex: nextZIndex }

    if (!isImageNode(node)) {
      if ((node.style as Record<string, unknown> | undefined)?.zIndex !== nextZIndex) {
        changed = true
        return { ...node, style: nextStyle }
      }
      return node
    }

    const containingGroup = findContainingGroup(node, groups)
    const currentGroupId = typeof node.data?.groupId === 'string' ? node.data.groupId : ''
    const nextGroupId = containingGroup?.id ?? ''
    if (
      currentGroupId !== nextGroupId
      || (node.style as Record<string, unknown> | undefined)?.zIndex !== nextZIndex
      || node.hidden
    ) {
      changed = true
      return {
        ...node,
        data: {
          ...node.data,
          groupId: nextGroupId || undefined,
        },
        style: nextStyle,
        hidden: false,
      }
    }
    return node
  })

  return changed ? nextNodes : nodes
}

function serializeFlowNode(node: RFNode): FlowNode {
  return {
    id: node.id,
    type: node.type,
    position: node.position,
    data: sanitizeNodeData(node.data),
    style: (node.style ?? {}) as Record<string, unknown>,
  }
}

function normalizeCanvasAppearance(
  appearance: Partial<CanvasAppearance> | undefined,
  fallback: CanvasAppearance,
): CanvasAppearance {
  return {
    backgroundColor: typeof appearance?.backgroundColor === 'string' && appearance.backgroundColor
      ? appearance.backgroundColor
      : fallback.backgroundColor,
    patternColor: typeof appearance?.patternColor === 'string' && appearance.patternColor
      ? appearance.patternColor
      : fallback.patternColor,
    pattern: appearance?.pattern === 'dots' || appearance?.pattern === 'lines'
      ? appearance.pattern
      : fallback.pattern,
  }
}

function serializeFlowState(
  nodes: RFNode[],
  edges: RFEdge[],
  viewport: FlowViewport,
  settings: FlowBoardSettings,
): FlowState {
  return {
    nodes: nodes
      .filter((node) => !node.data?.isUploading)
      .map(serializeFlowNode),
    edges: edges.map((edge) => ({ ...edge })) as FlowEdge[],
    viewport,
    settings,
  }
}

function getImageNodeSize(width: number, height: number): { width: number; height: number } {
  const safeWidth = Math.max(1, Math.round(width || IMAGE_MIN_WIDTH))
  const safeHeight = Math.max(1, Math.round(height || IMAGE_MIN_HEIGHT))
  const aspectRatio = safeWidth / safeHeight

  let nextWidth = clamp(safeWidth, IMAGE_MIN_WIDTH, IMAGE_MAX_WIDTH)
  let nextHeight = Math.round(nextWidth / aspectRatio)

  if (nextHeight > IMAGE_MAX_HEIGHT) {
    nextHeight = IMAGE_MAX_HEIGHT
    nextWidth = Math.round(nextHeight * aspectRatio)
  }
  if (nextHeight < IMAGE_MIN_HEIGHT) {
    nextHeight = IMAGE_MIN_HEIGHT
    nextWidth = Math.round(nextHeight * aspectRatio)
  }

  nextWidth = clamp(nextWidth, IMAGE_MIN_WIDTH, IMAGE_MAX_WIDTH)
  nextHeight = clamp(nextHeight, IMAGE_MIN_HEIGHT, IMAGE_MAX_HEIGHT)
  return { width: nextWidth, height: nextHeight }
}

function getImageNodeStyle(rawStyle: Record<string, unknown>, imageWidth: number, imageHeight: number): CSSProperties {
  const fallbackSize = getImageNodeSize(imageWidth, imageHeight)
  const rawWidth = toNumber(rawStyle.width, 0)
  const rawHeight = toNumber(rawStyle.height, 0)

  if (rawWidth > 0 || rawHeight > 0) {
    const widthScale = rawWidth > 0 ? rawWidth / Math.max(1, imageWidth) : Number.POSITIVE_INFINITY
    const heightScale = rawHeight > 0 ? rawHeight / Math.max(1, imageHeight) : Number.POSITIVE_INFINITY
    const scale = Math.min(widthScale, heightScale)

    if (Number.isFinite(scale) && scale > 0) {
      return {
        width: Math.max(IMAGE_MIN_WIDTH, Math.round(imageWidth * scale)),
        height: Math.max(IMAGE_MIN_HEIGHT, Math.round(imageHeight * scale)),
      }
    }
  }

  return fallbackSize
}

async function readImageDimensions(file: Blob): Promise<{ width: number; height: number }> {
  const objectUrl = URL.createObjectURL(file)
  try {
    return await new Promise((resolve, reject) => {
      const image = new Image()
      image.onload = () => {
        resolve({ width: image.naturalWidth || IMAGE_MIN_WIDTH, height: image.naturalHeight || IMAGE_MIN_HEIGHT })
      }
      image.onerror = () => reject(new Error('Could not read image dimensions.'))
      image.src = objectUrl
    })
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

function normalizeViewport(viewport?: Partial<FlowViewport>): FlowViewport {
  return {
    x: toNumber(viewport?.x, 0),
    y: toNumber(viewport?.y, 0),
    zoom: toNumber(viewport?.zoom, 1),
  }
}

function getDefaultAppearance(variant: 'project' | 'mood'): CanvasAppearance {
  return variant === 'project'
    ? { backgroundColor: '#f7fafc', patternColor: '#dbe7f5', pattern: 'lines' }
    : { backgroundColor: '#fefdf8', patternColor: '#ece2cb', pattern: 'dots' }
}

function getPresetAppearance(preset: CanvasPreset, fallback: CanvasAppearance): CanvasAppearance {
  if (preset === 'bright') return { backgroundColor: '#f7fbff', patternColor: '#c7ddff', pattern: 'dots' }
  if (preset === 'dark') return { backgroundColor: '#1f2937', patternColor: '#374151', pattern: 'lines' }
  return fallback
}

function normalizeRFEdge(raw: unknown): RFEdge | null {
  if (!raw || typeof raw !== 'object') return null
  const e = { ...(raw as Record<string, unknown>) }
  // React Flow v12 rejects edges with null handle ids — strip them
  if (e.sourceHandle === null || e.sourceHandle === 'null') delete e.sourceHandle
  if (e.targetHandle === null || e.targetHandle === 'null') delete e.targetHandle
  return e as RFEdge
}

function normalizeRFNode(raw: unknown, index: number, variant: 'project' | 'mood'): RFNode {
  const fallbackPos = { x: 48 + (index % 4) * 240, y: 48 + Math.floor(index / 4) * 180 }
  if (!raw || typeof raw !== 'object') {
    return {
      id: `node-${index}`,
      type: 'noteNode',
      position: fallbackPos,
      data: { kind: 'note', label: `Note ${index + 1}`, noteColor: '#fff4bf', connectable: variant === 'project' },
      style: { width: 220, height: 140 },
    }
  }
  const c = raw as Record<string, unknown>
  const id = typeof c.id === 'string' && c.id ? c.id : `node-${index}`
  const pos = c.position as { x?: unknown; y?: unknown } | undefined
  const rawData = (c.data && typeof c.data === 'object') ? (c.data as FlowNodeData) : {}
  const kind = typeof rawData.kind === 'string' ? rawData.kind : 'note'
  const type = typeof c.type === 'string'
    ? c.type
    : (kind === 'image'
      ? 'imageNode'
      : (kind === 'group' ? 'groupNode' : 'noteNode'))
  const rawStyle = (c.style && typeof c.style === 'object') ? (c.style as Record<string, unknown>) : {}
  const imageWidth = toNumber(rawData.imageWidth, IMAGE_MIN_WIDTH)
  const imageHeight = toNumber(rawData.imageHeight, IMAGE_MIN_HEIGHT)
  const normalizedImageStyle = getImageNodeStyle(rawStyle, imageWidth, imageHeight)
  const normalizedGroupStyle: CSSProperties = {
    width: toNumber(rawStyle.width, DEFAULT_GROUP_SIZE.width),
    height: toNumber(rawStyle.height, DEFAULT_GROUP_SIZE.height),
    zIndex: -1,
  }
  return {
    id,
    type,
    position: {
      x: typeof pos?.x === 'number' ? pos.x : fallbackPos.x,
      y: typeof pos?.y === 'number' ? pos.y : fallbackPos.y,
    },
    data: { ...rawData, connectable: variant === 'project' },
    dragHandle: kind === 'group' ? '.flowboard-group-header' : undefined,
    draggable: kind === 'group' ? !(rawData.locked ?? false) : undefined,
    style: {
      ...(kind === 'image'
        ? normalizedImageStyle
        : (kind === 'group' ? normalizedGroupStyle : {})),
      ...rawStyle,
    } as CSSProperties,
  }
}

// ── Custom node components ────────────────────────────────────────────────────
// Defined outside the main component so React Flow doesn't remount them every
// render when the nodeTypes map is recreated.

function NoteNodeComponent({ data, selected, dragging }: NodeProps<RFNode>) {
  const showHandles = Boolean(data.connectable)
  return (
    <div
      className={`flowboard-node${selected ? ' is-selected' : ''}${dragging ? ' is-dragging' : ''}`}
      style={{ background: String(data.noteColor || '#fff4bf') }}
    >
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={showHandles}
        className={`flowboard-node-handle${showHandles ? ' is-visible' : ''}`}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={showHandles}
        className={`flowboard-node-handle${showHandles ? ' is-visible' : ''}`}
      />
      <div className="flowboard-node-label">{String(data.label || 'Note')}</div>
    </div>
  )
}

function ImageNodeComponent({ data, selected, dragging }: NodeProps<RFNode>) {
  const showHandles = Boolean(data.connectable)
  const hasMeta = Boolean(data.label || data.caption)
  return (
    <div
      className={`flowboard-node is-image-node${selected ? ' is-selected' : ''}${dragging ? ' is-dragging' : ''}`}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={IMAGE_MIN_WIDTH}
        minHeight={IMAGE_MIN_HEIGHT}
        keepAspectRatio
        lineStyle={{ borderColor: '#4f8cff', borderWidth: 1 }}
        handleStyle={{ width: 10, height: 10, borderRadius: 999, border: '1px solid #4f8cff', background: '#ffffff' }}
      />
      <Handle
        type="target"
        position={Position.Top}
        isConnectable={showHandles}
        className={`flowboard-node-handle${showHandles ? ' is-visible' : ''}`}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        isConnectable={showHandles}
        className={`flowboard-node-handle${showHandles ? ' is-visible' : ''}`}
      />
      <div className={`flowboard-image-stage${data.isUploading ? ' is-uploading' : ''}`}>
        {data.imageUrl ? (
          <img
            src={String(data.imageUrl)}
            alt={String(data.label || 'Board image')}
            className="flowboard-node-image"
          />
        ) : (
          <div className="flowboard-image-skeleton" aria-hidden="true" />
        )}
        {hasMeta ? (
          <div className="flowboard-image-meta">
            {data.label ? <div className="flowboard-image-meta-label">{String(data.label)}</div> : null}
            {data.caption ? <div className="flowboard-image-meta-caption">{String(data.caption)}</div> : null}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function GroupNodeComponent({ data, selected, dragging }: NodeProps<RFNode>) {
  return (
    <div
      className={`flowboard-node is-group-node${selected ? ' is-selected' : ''}${dragging ? ' is-dragging' : ''}${data.isAttachTarget ? ' is-attach-target' : ''}${data.collapsed ? ' is-collapsed' : ''}`}
      style={{ background: String(data.noteColor || 'rgba(199, 214, 255, 0.16)') }}
    >
      <NodeResizer
        isVisible={selected && !data.locked}
        minWidth={240}
        minHeight={180}
        lineStyle={{ borderColor: '#7f9bdb', borderWidth: 1 }}
        handleStyle={{ width: 10, height: 10, borderRadius: 999, border: '1px solid #7f9bdb', background: '#ffffff' }}
      />
      <div className="flowboard-group-header">
        <span className="flowboard-group-title">
          {String(data.label || 'Group')}
          {data.locked === false ? ' · unlocked' : ' · locked'}
          {data.collapsed ? ' · collapsed' : ''}
        </span>
      </div>
      <div className="flowboard-group-body" />
    </div>
  )
}

// Stable reference outside the component — React Flow requires this to avoid
// remounting custom nodes on every render.
const NODE_TYPES = {
  noteNode: NoteNodeComponent,
  imageNode: ImageNodeComponent,
  groupNode: GroupNodeComponent,
} as const

// ── Inner canvas component (lives inside ReactFlowProvider) ───────────────────

function FlowBoardCanvasInner({
  variant,
  stateKey,
  boardTitle,
  onBoardTitleChange,
  onBoardShare,
  onBoardDelete,
  uploadImages,
  initialState,
  renderDetailsPanel,
  onStateChange,
}: FlowBoardCanvasProps) {
  const { setViewport, setCenter, screenToFlowPosition, getViewport } = useReactFlow<RFNode, RFEdge>()
  const canvasWrapRef = useRef<HTMLDivElement | null>(null)
  const detailPanelRef = useRef<HTMLElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const detailResizeDragRef = useRef<{ startX: number; startWidth: number } | null>(null)
  const groupDragRef = useRef<{
    groupId: string
    startPosition: { x: number; y: number }
    childPositions: Map<string, { x: number; y: number }>
  } | null>(null)
  // Stable ref so onStateChange never appears in useEffect dep arrays
  const onStateChangeRef = useRef(onStateChange)
  onStateChangeRef.current = onStateChange
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const viewportRef = useRef<FlowViewport>(normalizeViewport(initialState?.viewport))
  const lastPersistedStateRef = useRef('')
  const pendingPersistStateRef = useRef<FlowState | null>(null)
  const [detailPanelWidth, setDetailPanelWidth] = useState(() => {
    if (typeof window === 'undefined') return 320
    const stored = Number(window.localStorage.getItem(`flowboard:detail-panel-width:${variant}`) || 320)
    return Number.isFinite(stored) ? Math.min(520, Math.max(260, stored)) : 320
  })
  const {
    mode: detailRailMode,
    setExpanded: setDetailRailExpanded,
    setHidden: setDetailRailHidden,
    toggleCompact: toggleDetailRailCompact,
  } = useDetailRailMode(`flowboard:detail-rail-mode:${variant}`, true)

  // Keep latest initialState accessible in the stateKey-reset effect without
  // re-triggering the effect when Firestore pushes real-time updates.
  const initialStateRef = useRef(initialState)
  initialStateRef.current = initialState

  const defaultAppearance = useMemo(() => getDefaultAppearance(variant), [variant])
  const [canvasAppearance, setCanvasAppearance] = useState<CanvasAppearance>(defaultAppearance)
  const [showNavigationPreview, setShowNavigationPreview] = useState(
    typeof initialState?.showNavigationPreview === 'boolean' ? initialState.showNavigationPreview : true,
  )
  const [isUploading, setIsUploading] = useState(false)
  const [attachPreviewGroupId, setAttachPreviewGroupId] = useState('')

  const flushPendingPersist = useCallback(() => {
    if (!persistTimerRef.current || !pendingPersistStateRef.current) return
    clearTimeout(persistTimerRef.current)
    persistTimerRef.current = null
    const nextState = pendingPersistStateRef.current
    pendingPersistStateRef.current = null
    const serializedState = JSON.stringify(nextState)
    lastPersistedStateRef.current = serializedState
    onStateChangeRef.current?.(nextState)
  }, [])

  const normalizeIncomingNodes = useCallback((rawNodes?: unknown[]) => (
    (rawNodes ?? []).map((node, index) => normalizeRFNode(node, index, variant))
  ), [variant])

  const normalizeIncomingEdges = useCallback((rawEdges?: unknown[]) => (
    (rawEdges ?? []).map(normalizeRFEdge).filter((edge): edge is RFEdge => edge !== null)
  ), [])

  const [nodes, setNodes] = useNodesState<RFNode>(
    normalizeIncomingNodes(initialState?.nodes),
  )
  const [edges, setEdges, onEdgesChange] = useEdgesState<RFEdge>(
    normalizeIncomingEdges(initialState?.edges),
  )

  const handleNodesChange = useCallback((changes: NodeChange<RFNode>[]) => {
    setNodes((prev) => syncImageGroupMembership(applyNodeChanges(changes, prev)))
  }, [setNodes])

  const displayNodes = useMemo(() => nodes.map((node) => {
    if (!isGroupNode(node)) return node
    return {
      ...node,
      data: {
        ...node.data,
        isAttachTarget: node.id === attachPreviewGroupId,
      },
    }
  }), [attachPreviewGroupId, nodes])

  const getInsertPosition = useCallback((width: number, height: number, index = 0) => {
    if (!canvasWrapRef.current) {
      return { x: 64 + index * 28, y: 64 + index * 24 }
    }
    const rect = canvasWrapRef.current.getBoundingClientRect()
    const center = screenToFlowPosition({
      x: rect.left + (rect.width * 0.45),
      y: rect.top + (rect.height * 0.42),
    })
    return {
      x: center.x - (width / 2) + ((index % 3) * 28),
      y: center.y - (height / 2) + (Math.floor(index / 3) * 24),
    }
  }, [screenToFlowPosition])

  const focusNodeInView = useCallback((node: Pick<RFNode, 'position' | 'style'>) => {
    const style = (node.style ?? {}) as Record<string, unknown>
    const width = toNumber(style.width, DEFAULT_NOTE_SIZE.width)
    const height = toNumber(style.height, DEFAULT_NOTE_SIZE.height)
    const viewport = getViewport()
    void setCenter(node.position.x + (width / 2), node.position.y + (height / 2), {
      zoom: Math.max(viewport.zoom, 1),
      duration: 240,
    })
  }, [getViewport, setCenter])

  // Reset the entire board when the stateKey changes (board switch)
  useEffect(() => {
    const init = initialStateRef.current
    const nextViewport = normalizeViewport(init?.viewport)
    const nextNodes = normalizeIncomingNodes(init?.nodes)
    const nextEdges = normalizeIncomingEdges(init?.edges)
    const nextAppearance = normalizeCanvasAppearance(init?.canvasAppearance, getDefaultAppearance(variant))
    const nextShowNavigationPreview = typeof init?.showNavigationPreview === 'boolean'
      ? init.showNavigationPreview
      : true
    setNodes(nextNodes)
    setEdges(nextEdges)
    viewportRef.current = nextViewport
    lastPersistedStateRef.current = JSON.stringify(serializeFlowState(nextNodes, nextEdges, nextViewport, {
      canvasAppearance: nextAppearance,
      showNavigationPreview: nextShowNavigationPreview,
    }))
    setViewport(nextViewport)
    setCanvasAppearance(nextAppearance)
    setShowNavigationPreview(nextShowNavigationPreview)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizeIncomingEdges, normalizeIncomingNodes, stateKey])

  useEffect(() => () => {
    flushPendingPersist()
  }, [flushPendingPersist, stateKey])

  // Persist node/edge changes to Firestore via onStateChange.
  // Debounced so rapid drag micro-updates don't flood Firestore.
  // onStateChange is accessed via ref so it never enters the dep array,
  // which breaks the Firestore-write → snapshot → re-render → effect infinite cycle.
  useEffect(() => {
    if (!onStateChangeRef.current) return
    const nextState = serializeFlowState(nodes, edges, viewportRef.current, {
      canvasAppearance,
      showNavigationPreview,
    })
    const serializedState = JSON.stringify(nextState)
    if (serializedState === lastPersistedStateRef.current) return
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current)
    pendingPersistStateRef.current = nextState
    persistTimerRef.current = setTimeout(() => {
      pendingPersistStateRef.current = null
      lastPersistedStateRef.current = serializedState
      onStateChangeRef.current?.(nextState)
      persistTimerRef.current = null
    }, 800)
    return () => {
      if (persistTimerRef.current) clearTimeout(persistTimerRef.current)
    }
  }, [canvasAppearance, edges, nodes, showNavigationPreview])

  // ── Selected node ────────────────────────────────────────────────────────
  const selectedNode = useMemo(() => nodes.find((n) => n.selected) ?? null, [nodes])
  const selectedData = (selectedNode?.data ?? {}) as FlowNodeData

  // ── Node mutation helpers ────────────────────────────────────────────────
  const updateSelectedNode = useCallback((updater: (n: RFNode) => RFNode) => {
    setNodes((prev) => syncImageGroupMembership(prev.map((n) => (n.selected ? updater(n) : n))))
  }, [setNodes])

  const updateSelectedNodeData = useCallback((patch: Partial<FlowNodeData>) => {
    updateSelectedNode((n) => ({ ...n, data: { ...n.data, ...patch } }))
  }, [updateSelectedNode])

  const updateSelectedNodeStyle = useCallback((patch: Record<string, unknown>) => {
    updateSelectedNode((n) => ({
      ...n,
      style: { ...(n.style ?? {}), ...(patch as CSSProperties) },
    }))
  }, [updateSelectedNode])

  const updateSelectedNodeSize = useCallback((dimension: 'width' | 'height', value: number) => {
    updateSelectedNode((node) => {
      const clamped = Math.max(dimension === 'width' ? 120 : 90, Math.round(value || 0))
      const ratio = toNumber(node.data?.imageWidth, 0) > 0 && toNumber(node.data?.imageHeight, 0) > 0
        ? (toNumber(node.data?.imageWidth, 1) / toNumber(node.data?.imageHeight, 1))
        : null

      if ((node.type === 'imageNode' || node.data?.kind === 'image') && ratio) {
        if (dimension === 'width') {
          return {
            ...node,
            style: {
              ...(node.style ?? {}),
              width: clamped,
              height: Math.max(IMAGE_MIN_HEIGHT, Math.round(clamped / ratio)),
            },
          }
        }
        return {
          ...node,
          style: {
            ...(node.style ?? {}),
            height: clamped,
            width: Math.max(IMAGE_MIN_WIDTH, Math.round(clamped * ratio)),
          },
        }
      }

      return {
        ...node,
        style: { ...(node.style ?? {}), [dimension]: clamped },
      }
    })
  }, [updateSelectedNode])

  const removeSelectedNode = useCallback(() => {
    setNodes((prev) => {
      const selectedIds = new Set(prev.filter((node) => node.selected).map((node) => node.id))
      return syncImageGroupMembership(prev.filter((node) => !selectedIds.has(node.id)))
    })
  }, [setNodes])

  const updateCanvasAppearance = useCallback((patch: Partial<CanvasAppearance>) => {
    setCanvasAppearance((prev) => ({ ...prev, ...patch }))
  }, [])

  const applyCanvasPreset = useCallback((preset: CanvasPreset) => {
    setCanvasAppearance(getPresetAppearance(preset, defaultAppearance))
  }, [defaultAppearance])

  const sendSelectedNodeToBack = useCallback(() => {
    setNodes((prev) => {
      const minZ = prev.reduce((lowest, node) => Math.min(lowest, getNodeZIndex(node)), getNodeZIndex(prev[0] ?? {
        id: '', position: { x: 0, y: 0 }, data: {}, style: {}, type: 'noteNode', width: 0, height: 0,
      } as RFNode))
      return syncImageGroupMembership(prev.map((node) => (node.selected
        ? { ...node, style: { ...(node.style ?? {}), zIndex: minZ - 1 } }
        : node)))
    })
  }, [setNodes])

  const bringSelectedNodeForward = useCallback(() => {
    setNodes((prev) => {
      const maxZ = prev.reduce((highest, node) => Math.max(highest, getNodeZIndex(node)), 0)
      return syncImageGroupMembership(prev.map((node) => (node.selected
        ? { ...node, style: { ...(node.style ?? {}), zIndex: maxZ + 1 } }
        : node)))
    })
  }, [setNodes])

  const toggleSelectedGroupLock = useCallback(() => {
    updateSelectedNode((node) => {
      if (!isGroupNode(node)) return node
      return {
        ...node,
        draggable: Boolean(node.data?.locked),
        data: {
          ...node.data,
          locked: !(node.data?.locked ?? true),
        },
      }
    })
  }, [updateSelectedNode])

  const toggleSelectedGroupCollapse = useCallback(() => {
    updateSelectedNode((node) => {
      if (!isGroupNode(node)) return node
      return {
        ...node,
        data: {
          ...node.data,
          collapsed: !Boolean(node.data?.collapsed),
        },
      }
    })
  }, [updateSelectedNode])

  const handleConnect = useCallback((connection: Connection) => {
    if (variant !== 'project' || !connection.source || !connection.target) return
    setEdges((current) => addEdge({
      ...connection,
      id: `xy-edge__${connection.source}-${connection.target}-${Date.now()}`,
    }, current))
  }, [setEdges, variant])

  const addGroupNode = useCallback(() => {
    if (variant !== 'mood') return
    const node: RFNode = {
      id: createNodeId(),
      type: 'groupNode',
      position: getInsertPosition(DEFAULT_GROUP_SIZE.width, DEFAULT_GROUP_SIZE.height),
      data: {
        kind: 'group',
        label: 'Image group',
        noteColor: 'rgba(199, 214, 255, 0.16)',
        locked: false,
        collapsed: false,
        connectable: false,
      },
      style: { ...DEFAULT_GROUP_SIZE, zIndex: -1 } as CSSProperties,
      dragHandle: '.flowboard-group-header',
      draggable: true,
      selected: true,
    }
    setNodes((prev) => syncImageGroupMembership([
      node,
      ...prev.map((entry) => ({ ...entry, selected: false })),
    ]))
    requestAnimationFrame(() => {
      focusNodeInView(node)
    })
  }, [focusNodeInView, getInsertPosition, setNodes, variant])

  // ── Add nodes ────────────────────────────────────────────────────────────
  const addTextNode = useCallback(() => {
    const node: RFNode = {
      id: createNodeId(),
      type: 'noteNode',
      position: getInsertPosition(DEFAULT_NOTE_SIZE.width, DEFAULT_NOTE_SIZE.height),
      data: { kind: 'note', label: 'New note', noteColor: '#fff4bf', connectable: variant === 'project' },
      style: { ...DEFAULT_NOTE_SIZE } as CSSProperties,
      selected: true,
    }
    setNodes((prev) => syncImageGroupMembership([
        ...prev.map((n) => ({ ...n, selected: false })),
        node,
      ]))
    requestAnimationFrame(() => {
      focusNodeInView(node)
    })
  }, [focusNodeInView, getInsertPosition, setNodes, variant])

  const triggerImageUpload = useCallback(() => {
    if (!isUploading) fileInputRef.current?.click()
  }, [isUploading])

  const addImageFiles = useCallback(async (files: File[]) => {
    if (!files.length) return
    setIsUploading(true)

    const drafts: ImageUploadDraft[] = await Promise.all(files.map(async (file, index) => {
      const id = createNodeId()
      const dimensions = await readImageDimensions(file)
      const size = getImageNodeSize(dimensions.width, dimensions.height)
      const node: RFNode = {
        id,
        type: 'imageNode',
        position: getInsertPosition(size.width, size.height, index),
        data: {
          kind: 'image',
          label: file.name.replace(/\.[^.]+$/, '') || `Image ${index + 1}`,
          caption: '',
          tags: '',
          connectable: variant === 'project',
          isUploading: true,
          imageWidth: dimensions.width,
          imageHeight: dimensions.height,
        },
        style: { width: size.width, height: size.height } as CSSProperties,
        selected: false,
      }
      return { id, file, width: dimensions.width, height: dimensions.height, style: node.style as CSSProperties, node }
    }))

    setNodes((prev) => {
      const lastDraftId = drafts[drafts.length - 1]?.id
      return syncImageGroupMembership([
      ...prev.map((node) => ({ ...node, selected: false })),
      ...drafts.map((draft) => ({
        ...draft.node,
        selected: draft.id === lastDraftId,
      })),
      ])
    })

    const focusedDraft = drafts[drafts.length - 1]?.node
    if (focusedDraft) {
      requestAnimationFrame(() => {
        focusNodeInView(focusedDraft)
      })
    }

    try {
      const urls = await uploadImages(files)
      setNodes((prev) => syncImageGroupMembership(prev.flatMap((node) => {
        const draftIndex = drafts.findIndex((draft) => draft.id === node.id)
        if (draftIndex === -1) return [node]
        const draft = drafts[draftIndex]
        const imageUrl = urls[draftIndex]
        if (!imageUrl) return []
        return [{
          ...node,
          data: {
            ...node.data,
            imageUrl,
            isUploading: false,
            connectable: variant === 'project',
            imageWidth: draft.width,
            imageHeight: draft.height,
          },
          style: draft.style,
        }]
      })))
    } catch (error) {
      setNodes((prev) => syncImageGroupMembership(prev.filter((node) => !drafts.some((draft) => draft.id === node.id))))
      throw error
    } finally {
      setIsUploading(false)
    }
  }, [focusNodeInView, getInsertPosition, setNodes, uploadImages, variant])

  const handleImageFileSelect = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files
    if (!fileList || fileList.length === 0) return
    try {
      await addImageFiles(Array.from(fileList))
    } finally {
      event.target.value = ''
    }
  }, [addImageFiles])

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      if (isEditableTarget(event.target)) return
      const pastedFiles = Array.from(event.clipboardData?.items ?? [])
        .filter((item) => item.type.startsWith('image/'))
        .map((item, index) => {
          const file = item.getAsFile()
          if (!file) return null
          if (file.name) return file
          return new File([file], `pasted-image-${Date.now()}-${index}.png`, { type: file.type || 'image/png' })
        })
        .filter((file): file is File => file !== null)

      if (!pastedFiles.length) return
      event.preventDefault()
      void addImageFiles(pastedFiles)
    }

    window.addEventListener('paste', handlePaste)
    return () => {
      window.removeEventListener('paste', handlePaste)
    }
  }, [addImageFiles])

  const selectedGroupLabel = useMemo(() => {
    const groupId = typeof selectedData.groupId === 'string' ? selectedData.groupId : ''
    if (!groupId) return ''
    const parentGroup = nodes.find((node) => node.id === groupId)
    return parentGroup?.data?.label ? String(parentGroup.data.label) : ''
  }, [nodes, selectedData.groupId])

  const handleNodeDragStart = useCallback<OnNodeDrag<RFNode>>((_event, node) => {
    if (isImageNode(node)) {
      const containingGroup = findContainingGroup(node, nodes.filter(isGroupNode))
      setAttachPreviewGroupId(containingGroup?.id ?? '')
    }
    if (!isGroupNode(node)) {
      groupDragRef.current = null
      return
    }
    const attachedImages = nodes.filter((entry) => isImageNode(entry) && entry.data?.groupId === node.id)
    groupDragRef.current = {
      groupId: node.id,
      startPosition: { ...node.position },
      childPositions: new Map(attachedImages.map((entry) => [entry.id, { ...entry.position }])),
    }
  }, [nodes])

  const handleNodeDrag = useCallback<OnNodeDrag<RFNode>>((_event, node) => {
    if (isImageNode(node)) {
      const containingGroup = findContainingGroup(node, nodes.filter(isGroupNode))
      setAttachPreviewGroupId(containingGroup?.id ?? '')
    }
    const dragState = groupDragRef.current
    if (!dragState || dragState.groupId !== node.id) return
    const dx = node.position.x - dragState.startPosition.x
    const dy = node.position.y - dragState.startPosition.y
    setNodes((prev) => prev.map((entry) => {
      const childStart = dragState.childPositions.get(entry.id)
      if (!childStart) return entry
      return {
        ...entry,
        position: {
          x: childStart.x + dx,
          y: childStart.y + dy,
        },
      }
    }))
  }, [setNodes])

  const handleNodeDragStop = useCallback<OnNodeDrag<RFNode>>((_event, node) => {
    groupDragRef.current = null
    setAttachPreviewGroupId('')
    if (!isGroupNode(node) && !isImageNode(node)) return
    setNodes((prev) => syncImageGroupMembership(prev))
  }, [setNodes])

  const handleDetailResizePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (detailRailMode === 'hidden') return
    event.preventDefault()
    detailResizeDragRef.current = { startX: event.clientX, startWidth: detailPanelWidth }
    event.currentTarget.setPointerCapture(event.pointerId)
  }, [detailPanelWidth, detailRailMode])

  const handleDetailResizePointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!detailResizeDragRef.current || !detailPanelRef.current) return
    const dx = detailResizeDragRef.current.startX - event.clientX
    const nextWidth = Math.min(520, Math.max(260, detailResizeDragRef.current.startWidth + dx))
    detailPanelRef.current.style.width = `${nextWidth}px`
  }, [])

  const handleDetailResizePointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!detailResizeDragRef.current) return
    const dx = detailResizeDragRef.current.startX - event.clientX
    const nextWidth = Math.min(520, Math.max(260, detailResizeDragRef.current.startWidth + dx))
    setDetailPanelWidth(nextWidth)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(`flowboard:detail-panel-width:${variant}`, String(nextWidth))
    }
    detailResizeDragRef.current = null
  }, [variant])

  // ── Details context ──────────────────────────────────────────────────────
  const detailsContext: FlowBoardCanvasDetailsContext = {
    selectedNode: selectedNode ? serializeFlowNode(selectedNode) : null,
    selectedData,
    canvasAppearance,
    showNavigationPreview,
    selectedGroupLabel,
    updateSelectedNodeData,
    updateSelectedNodeStyle,
    updateSelectedNodeSize,
    updateCanvasAppearance,
    setShowNavigationPreview,
    applyCanvasPreset,
    sendSelectedNodeToBack,
    bringSelectedNodeForward,
    toggleSelectedGroupLock,
    toggleSelectedGroupCollapse,
    removeSelectedNode,
  }

  const rfStyle: CSSProperties = {
    flex: 1,
    minHeight: 0,
    backgroundColor: canvasAppearance.backgroundColor,
  }

  return (
    <section className={`flowboard-shell${variant === 'project' ? ' is-project' : ''}`}>
      <header className="flowboard-header">
        <div className="flowboard-title-wrap">
          <input
            className="flowboard-title-input"
            value={boardTitle}
            onChange={(e) => onBoardTitleChange(e.target.value)}
            placeholder={variant === 'project' ? 'Flow board title' : 'Mood board title'}
          />
        </div>
        <div className="flowboard-toolbar">
          <button type="button" className="flowboard-btn" onClick={addTextNode}>Add note</button>
          {variant === 'mood' ? (
            <button type="button" className="flowboard-btn" onClick={addGroupNode}>Add group</button>
          ) : null}
          <button
            type="button"
            className="flowboard-btn"
            onClick={triggerImageUpload}
            disabled={isUploading}
          >
            {isUploading ? 'Uploading...' : 'Add image'}
          </button>
          <button type="button" className="flowboard-btn" onClick={onBoardShare}>Share</button>
          <button type="button" className="flowboard-btn flowboard-danger" onClick={onBoardDelete}>Delete</button>
        </div>
      </header>

      <div className="flowboard-content">
        <div ref={canvasWrapRef} className="flowboard-canvas-wrap">
          <ReactFlow<RFNode, RFEdge>
            nodes={displayNodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeDragStart={handleNodeDragStart}
            onNodeDrag={handleNodeDrag}
            onNodeDragStop={handleNodeDragStop}
            onConnect={variant === 'project' ? handleConnect : undefined}
            nodeTypes={NODE_TYPES}
            style={rfStyle}
            deleteKeyCode={null}
            fitView={false}
            minZoom={0.2}
            maxZoom={2.4}
            panOnScroll
            selectionOnDrag
            onMoveEnd={(_event, viewport) => {
              viewportRef.current = {
                x: viewport.x,
                y: viewport.y,
                zoom: viewport.zoom,
              }
              const nextState = serializeFlowState(nodes, edges, viewportRef.current, {
                canvasAppearance,
                showNavigationPreview,
              })
              const serializedState = JSON.stringify(nextState)
              if (serializedState === lastPersistedStateRef.current) return
              if (persistTimerRef.current) clearTimeout(persistTimerRef.current)
              persistTimerRef.current = setTimeout(() => {
                lastPersistedStateRef.current = serializedState
                onStateChangeRef.current?.(nextState)
              }, 250)
            }}
          >
            <Background
              variant={
                canvasAppearance.pattern === 'lines'
                  ? BackgroundVariant.Lines
                  : BackgroundVariant.Dots
              }
              color={canvasAppearance.patternColor}
              gap={24}
              size={canvasAppearance.pattern === 'dots' ? 1.4 : 1}
            />
            {showNavigationPreview ? (
              <MiniMap
                pannable
                zoomable
                position="bottom-left"
                className="flowboard-minimap"
                nodeColor={(node) => node.type === 'imageNode' ? '#cfd9ea' : String(node.data?.noteColor || '#d0def8')}
              />
            ) : null}
            <Controls showInteractive position="bottom-right" />
          </ReactFlow>
        </div>
        {detailRailMode !== 'hidden' ? (
          <>
            <div
              className="flowboard-detail-resizer"
              onPointerDown={handleDetailResizePointerDown}
              onPointerMove={handleDetailResizePointerMove}
              onPointerUp={handleDetailResizePointerUp}
            />
            <aside
              ref={detailPanelRef}
              className={`flowboard-details is-${detailRailMode}`}
              style={detailRailMode === 'expanded' ? { width: `${detailPanelWidth}px` } : undefined}
            >
              <div className="flowboard-detail-toolbar">
                <button type="button" className={`flowboard-btn${detailRailMode === 'compact' ? ' is-active' : ''}`} onClick={toggleDetailRailCompact}>
                  {detailRailMode === 'compact' ? 'Expand' : 'Compact'}
                </button>
                <button type="button" className="flowboard-btn" onClick={setDetailRailHidden}>Hide</button>
              </div>
              <div className="flowboard-details-scroll">
                {renderDetailsPanel ? renderDetailsPanel(detailsContext) : null}
              </div>
            </aside>
          </>
        ) : (
          <button type="button" className="flowboard-detail-show-btn" onClick={setDetailRailExpanded}>Show details</button>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => { void handleImageFileSelect(e) }}
      />
    </section>
  )
}

// ── Public export — wraps inner component with the required ReactFlowProvider ──

export function FlowBoardCanvas(props: FlowBoardCanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowBoardCanvasInner {...props} />
    </ReactFlowProvider>
  )
}
