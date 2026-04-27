import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
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
import { useImageBlobUrl } from '../../hooks/useImageBlobUrl'
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
  showImageLabels: boolean
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
  groupId?: string
  locked?: boolean
  collapsed?: boolean
  isAttachTarget?: boolean
  connectable?: boolean
  isUploading?: boolean
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
  showImageLabels: boolean
  selectedGroupLabel: string
  updateSelectedNodeData: (patch: Partial<FlowNodeData>) => void
  updateSelectedNodeStyle: (patch: Record<string, unknown>) => void
  updateCanvasAppearance: (patch: Partial<CanvasAppearance>) => void
  setShowNavigationPreview: (value: boolean) => void
  setShowImageLabels: (value: boolean) => void
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
  uploadImages: (
    files: File[],
    options?: {
      drafts?: Array<{
        id: string
        label: string
        position: { x: number; y: number }
        style?: Record<string, unknown>
      }>
    },
  ) => Promise<string[]>
  initialState?: {
    nodes?: unknown[]
    edges?: unknown[]
    viewport?: Partial<FlowViewport>
    canvasAppearance?: Partial<CanvasAppearance>
    showNavigationPreview?: boolean
    showImageLabels?: boolean
  }
  onOpenImageAnnotation?: (imageUrl: string) => void
  renderDetailsPanel?: (context: FlowBoardCanvasDetailsContext) => ReactNode
  onStateChange?: (state: FlowState) => void
}

type ImageUploadDraft = {
  id: string
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

function hasDraggedImageFiles(dataTransfer: DataTransfer | null): boolean {
  if (!dataTransfer) return false
  if (!Array.from(dataTransfer.types || []).includes('Files')) return false
  if (!dataTransfer.items || dataTransfer.items.length === 0) return true
  return Array.from(dataTransfer.items).some((item) => item.kind === 'file' && item.type.startsWith('image/'))
}

function sanitizeNodeData(data: FlowNodeData | undefined): FlowNodeData {
  if (!data) return {}
  const {
    connectable: _connectable,
    isUploading: _isUploading,
    isAttachTarget: _isAttachTarget,
    caption: _caption,
    tags: _tags,
    imageWidth: _imageWidth,
    imageHeight: _imageHeight,
    ...rest
  } = data as FlowNodeData & {
    caption?: unknown
    tags?: unknown
    imageWidth?: unknown
    imageHeight?: unknown
  }
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

function getImageNodeStyle(rawStyle: Record<string, unknown>, fallbackWidth: number, fallbackHeight: number): CSSProperties {
  const rawWidth = Math.round(toNumber(rawStyle.width, 0))
  const rawHeight = Math.round(toNumber(rawStyle.height, 0))

  if (rawWidth > 0 && rawHeight > 0) {
    return {
      width: Math.max(IMAGE_MIN_WIDTH, rawWidth),
      height: Math.max(IMAGE_MIN_HEIGHT, rawHeight),
    }
  }

  const safeFallbackWidth = Math.max(1, Math.round(fallbackWidth || IMAGE_MIN_WIDTH))
  const safeFallbackHeight = Math.max(1, Math.round(fallbackHeight || IMAGE_MIN_HEIGHT))
  const fallbackRatio = safeFallbackWidth / safeFallbackHeight

  if (rawWidth > 0) {
    return {
      width: Math.max(IMAGE_MIN_WIDTH, rawWidth),
      height: Math.max(IMAGE_MIN_HEIGHT, Math.round(rawWidth / fallbackRatio)),
    }
  }

  if (rawHeight > 0) {
    return {
      width: Math.max(IMAGE_MIN_WIDTH, Math.round(rawHeight * fallbackRatio)),
      height: Math.max(IMAGE_MIN_HEIGHT, rawHeight),
    }
  }

  return getImageNodeSize(safeFallbackWidth, safeFallbackHeight)
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

function normalizeRemoteImageUrl(value: string): string | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  try {
    const parsed = new URL(trimmed)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return null
    return parsed.toString()
  } catch {
    return null
  }
}

function extractUrlCandidatesFromText(value: string): string[] {
  const matches = value.match(/https?:\/\/[^\s"'<>]+/gi)
  const rawCandidates = matches && matches.length > 0
    ? matches
    : value.split(/\r?\n/).map((entry) => entry.trim()).filter(Boolean)

  const seen = new Set<string>()
  return rawCandidates
    .map((entry) => entry.trim().replace(/[),.;!?]+$/, ''))
    .filter(Boolean)
    .filter((entry) => {
      const key = entry.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

function extractImageLabelFromUrl(url: string, fallbackIndex: number): string {
  try {
    const parsed = new URL(url)
    const rawSegment = parsed.pathname.split('/').filter(Boolean).pop() || ''
    const decoded = decodeURIComponent(rawSegment)
    const withoutExtension = decoded.replace(/\.[^.]+$/, '').trim()
    if (withoutExtension) return withoutExtension
    if (parsed.hostname) return parsed.hostname
  } catch {
    // No-op; fallback below.
  }
  return `Image ${fallbackIndex + 1}`
}

async function readImageDimensionsFromUrl(url: string): Promise<{ width: number; height: number }> {
  return await new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      resolve({ width: image.naturalWidth || IMAGE_MIN_WIDTH, height: image.naturalHeight || IMAGE_MIN_HEIGHT })
    }
    image.onerror = () => reject(new Error('Could not load image URL.'))
    image.src = url
  })
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
  const legacyImageWidth = toNumber(rawData.imageWidth, IMAGE_MIN_WIDTH)
  const legacyImageHeight = toNumber(rawData.imageHeight, IMAGE_MIN_HEIGHT)
  const normalizedImageStyle = getImageNodeStyle(rawStyle, legacyImageWidth, legacyImageHeight)
  const legacyCaption = typeof rawData.caption === 'string' ? rawData.caption.trim() : ''
  const explicitLabel = typeof rawData.label === 'string' ? rawData.label.trim() : ''
  const normalizedLabel = explicitLabel || legacyCaption
  const normalizedData: FlowNodeData = {
    ...rawData,
    ...(normalizedLabel ? { label: normalizedLabel } : {}),
    connectable: variant === 'project',
  }
  delete normalizedData.caption
  delete normalizedData.tags
  delete normalizedData.imageWidth
  delete normalizedData.imageHeight
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
    data: normalizedData,
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
  const hasMeta = Boolean(data.label)
  const rawImageUrl = typeof data.imageUrl === 'string' ? data.imageUrl : undefined
  const cachedImageUrl = useImageBlobUrl(rawImageUrl)
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
        {cachedImageUrl ? (
          <img
            src={cachedImageUrl}
            alt={String(data.label || 'Board image')}
            className="flowboard-node-image"
          />
        ) : (
          <div className="flowboard-image-skeleton" aria-hidden="true" />
        )}
        {hasMeta ? (
          <div className="flowboard-image-meta">
            {data.label ? <div className="flowboard-image-meta-label">{String(data.label)}</div> : null}
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
  onOpenImageAnnotation,
  renderDetailsPanel,
  onStateChange,
}: FlowBoardCanvasProps) {
  const { setViewport, setCenter, screenToFlowPosition, getViewport } = useReactFlow<RFNode, RFEdge>()
  const canvasWrapRef = useRef<HTMLDivElement | null>(null)
  const detailPanelRef = useRef<HTMLElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const imageUrlInputRef = useRef<HTMLTextAreaElement | null>(null)
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
  } = useDetailRailMode(
    variant === 'mood' ? 'flowboard:detail-rail-mode:mood:v2' : `flowboard:detail-rail-mode:${variant}`,
    true,
    variant === 'mood' ? 'compact' : 'expanded',
  )

  // Keep latest initialState accessible in the stateKey-reset effect without
  // re-triggering the effect when Firestore pushes real-time updates.
  const initialStateRef = useRef(initialState)
  initialStateRef.current = initialState

  const defaultAppearance = useMemo(() => getDefaultAppearance(variant), [variant])
  const defaultShowImageLabels = variant === 'project'
  const [canvasAppearance, setCanvasAppearance] = useState<CanvasAppearance>(defaultAppearance)
  const [showNavigationPreview, setShowNavigationPreview] = useState(
    typeof initialState?.showNavigationPreview === 'boolean' ? initialState.showNavigationPreview : true,
  )
  const [showImageLabels, setShowImageLabels] = useState(
    typeof initialState?.showImageLabels === 'boolean' ? initialState.showImageLabels : defaultShowImageLabels,
  )
  const [isUploading, setIsUploading] = useState(false)
  const [isFileDragOver, setIsFileDragOver] = useState(false)
  const [attachPreviewGroupId, setAttachPreviewGroupId] = useState('')
  const [isImageUrlEntryOpen, setIsImageUrlEntryOpen] = useState(false)
  const [imageUrlDraftText, setImageUrlDraftText] = useState('')
  const [imageUrlEntryError, setImageUrlEntryError] = useState('')

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
    const nextShowImageLabels = typeof init?.showImageLabels === 'boolean'
      ? init.showImageLabels
      : defaultShowImageLabels
    setNodes(nextNodes)
    setEdges(nextEdges)
    viewportRef.current = nextViewport
    lastPersistedStateRef.current = JSON.stringify(serializeFlowState(nextNodes, nextEdges, nextViewport, {
      canvasAppearance: nextAppearance,
      showNavigationPreview: nextShowNavigationPreview,
      showImageLabels: nextShowImageLabels,
    }))
    setViewport(nextViewport)
    setCanvasAppearance(nextAppearance)
    setShowNavigationPreview(nextShowNavigationPreview)
    setShowImageLabels(nextShowImageLabels)
    setIsImageUrlEntryOpen(false)
    setImageUrlDraftText('')
    setImageUrlEntryError('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultShowImageLabels, normalizeIncomingEdges, normalizeIncomingNodes, stateKey, variant])

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
      showImageLabels,
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
  }, [canvasAppearance, edges, nodes, showImageLabels, showNavigationPreview])

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

  const clearFileDragState = useCallback(() => {
    setIsFileDragOver(false)
  }, [])

  const handleCanvasFileDragLeave = useCallback((event: DragEvent<HTMLDivElement>) => {
    const nextTarget = event.relatedTarget
    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return
    clearFileDragState()
  }, [clearFileDragState])

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
          connectable: variant === 'project',
          isUploading: true,
        },
        style: { width: size.width, height: size.height } as CSSProperties,
        selected: false,
      }
      return { id, style: node.style as CSSProperties, node }
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
      const urls = await uploadImages(files, {
        drafts: drafts.map((draft) => ({
          id: draft.id,
          label: String(draft.node.data?.label || ''),
          position: {
            x: Number(draft.node.position?.x || 0),
            y: Number(draft.node.position?.y || 0),
          },
          style: { ...(draft.style as Record<string, unknown>) },
        })),
      })
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

  const handleCanvasFileDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (variant !== 'mood') return
    if (!hasDraggedImageFiles(event.dataTransfer)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    if (!isFileDragOver) setIsFileDragOver(true)
  }, [isFileDragOver, variant])

  const handleCanvasFileDrop = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (variant !== 'mood') return
    if (!hasDraggedImageFiles(event.dataTransfer)) return
    event.preventDefault()
    clearFileDragState()

    const files = Array.from(event.dataTransfer.files || []).filter((file) => file.type.startsWith('image/'))
    if (!files.length) return
    void addImageFiles(files).catch(() => {})
  }, [addImageFiles, clearFileDragState, variant])

  const addImageUrls = useCallback(async (urls: string[]) => {
    if (!urls.length) return

    const normalizedUrls = urls
      .map((url) => normalizeRemoteImageUrl(url))
      .filter((url): url is string => !!url)

    if (!normalizedUrls.length) return

    const drafts = await Promise.all(normalizedUrls.map(async (imageUrl, index) => {
      let dimensions: { width: number; height: number } = { width: IMAGE_MIN_WIDTH, height: IMAGE_MIN_HEIGHT }
      try {
        dimensions = await readImageDimensionsFromUrl(imageUrl)
      } catch {
        // Keep fallback dimensions when the remote image can't be preloaded.
      }

      const size = getImageNodeSize(dimensions.width, dimensions.height)
      const node: RFNode = {
        id: createNodeId(),
        type: 'imageNode',
        position: getInsertPosition(size.width, size.height, index),
        data: {
          kind: 'image',
          label: extractImageLabelFromUrl(imageUrl, index),
          imageUrl,
          connectable: variant === 'project',
          isUploading: false,
        },
        style: { width: size.width, height: size.height } as CSSProperties,
        selected: false,
      }
      return node
    }))

    setNodes((prev) => {
      const lastDraftId = drafts[drafts.length - 1]?.id
      return syncImageGroupMembership([
        ...prev.map((node) => ({ ...node, selected: false })),
        ...drafts.map((draft) => ({
          ...draft,
          selected: draft.id === lastDraftId,
        })),
      ])
    })

    const focusedDraft = drafts[drafts.length - 1]
    if (focusedDraft) {
      requestAnimationFrame(() => {
        focusNodeInView(focusedDraft)
      })
    }
  }, [focusNodeInView, getInsertPosition, setNodes, variant])

  const openImageUrlEntry = useCallback(() => {
    setIsImageUrlEntryOpen(true)
    setImageUrlEntryError('')
    requestAnimationFrame(() => {
      imageUrlInputRef.current?.focus()
    })
  }, [])

  const closeImageUrlEntry = useCallback(() => {
    setIsImageUrlEntryOpen(false)
    setImageUrlDraftText('')
    setImageUrlEntryError('')
  }, [])

  const handleImageUrlSubmit = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const candidates = extractUrlCandidatesFromText(imageUrlDraftText)
    const normalizedUrls = candidates
      .map((url) => normalizeRemoteImageUrl(url))
      .filter((url): url is string => !!url)

    if (!normalizedUrls.length) {
      setImageUrlEntryError('Paste at least one valid http/https image URL.')
      return
    }

    setImageUrlEntryError('')
    await addImageUrls(normalizedUrls)
    setImageUrlDraftText('')
    setIsImageUrlEntryOpen(false)
  }, [addImageUrls, imageUrlDraftText])

  const handleImageUrlInputKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      closeImageUrlEntry()
      return
    }
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault()
      event.currentTarget.form?.requestSubmit()
    }
  }, [closeImageUrlEntry])

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
      const clipboardData = event.clipboardData
      if (!clipboardData) return

      const pastedFiles = Array.from(clipboardData.items ?? [])
        .filter((item) => item.type.startsWith('image/'))
        .map((item, index) => {
          const file = item.getAsFile()
          if (!file) return null
          if (file.name) return file
          return new File([file], `pasted-image-${Date.now()}-${index}.png`, { type: file.type || 'image/png' })
        })
        .filter((file): file is File => file !== null)

      if (pastedFiles.length) {
        event.preventDefault()
        void addImageFiles(pastedFiles)
        return
      }

      const pastedText = clipboardData.getData('text/plain')
      if (!pastedText) return
      const normalizedUrls = extractUrlCandidatesFromText(pastedText)
        .map((url) => normalizeRemoteImageUrl(url))
        .filter((url): url is string => !!url)
      if (!normalizedUrls.length) return

      event.preventDefault()
      void addImageUrls(normalizedUrls)
    }

    window.addEventListener('paste', handlePaste)
    return () => {
      window.removeEventListener('paste', handlePaste)
    }
  }, [addImageFiles, addImageUrls])

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
    showImageLabels,
    selectedGroupLabel,
    updateSelectedNodeData,
    updateSelectedNodeStyle,
    updateCanvasAppearance,
    setShowNavigationPreview,
    setShowImageLabels,
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
    <section className={`flowboard-shell${variant === 'project' ? ' is-project' : ''}${showImageLabels ? '' : ' is-image-labels-hidden'}`}>
      <header className="flowboard-header">
        <div className="flowboard-header-main">
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
            <button
              type="button"
              className={`flowboard-btn${isImageUrlEntryOpen ? ' is-active' : ''}`}
              onClick={isImageUrlEntryOpen ? closeImageUrlEntry : openImageUrlEntry}
            >
              {isImageUrlEntryOpen ? 'Close image URL' : 'Add image URL'}
            </button>
            <button type="button" className="flowboard-btn" onClick={onBoardShare}>Share</button>
            <button type="button" className="flowboard-btn flowboard-danger" onClick={onBoardDelete}>Delete</button>
          </div>
        </div>
        {isImageUrlEntryOpen ? (
          <form className="flowboard-url-entry" onSubmit={(event) => { void handleImageUrlSubmit(event) }}>
            <label className="flowboard-url-entry-label">
              Image URL
              <textarea
                ref={imageUrlInputRef}
                className="flowboard-url-entry-input"
                value={imageUrlDraftText}
                onChange={(event) => {
                  setImageUrlDraftText(event.target.value)
                  if (imageUrlEntryError) setImageUrlEntryError('')
                }}
                onKeyDown={handleImageUrlInputKeyDown}
                placeholder="https://example.com/image.jpg"
                rows={2}
              />
            </label>
            <div className="flowboard-url-entry-actions">
              <button type="submit" className="flowboard-btn">Add URL image</button>
              <button type="button" className="flowboard-btn" onClick={closeImageUrlEntry}>Cancel</button>
              <span className="flowboard-url-entry-hint">Tip: press Ctrl+V to paste an image file or image URL from your clipboard.</span>
            </div>
            {imageUrlEntryError ? <div className="flowboard-url-entry-error">{imageUrlEntryError}</div> : null}
          </form>
        ) : null}
      </header>

      <div className="flowboard-content">
        <div
          ref={canvasWrapRef}
          className={`flowboard-canvas-wrap${isFileDragOver ? ' is-file-drag-over' : ''}`}
          onDragOver={handleCanvasFileDragOver}
          onDragEnter={handleCanvasFileDragOver}
          onDragLeave={handleCanvasFileDragLeave}
          onDrop={handleCanvasFileDrop}
        >
          <ReactFlow<RFNode, RFEdge>
            nodes={displayNodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeDragStart={handleNodeDragStart}
            onNodeDrag={handleNodeDrag}
            onNodeDragStop={handleNodeDragStop}
            onNodeDoubleClick={(event, node) => {
              if (!onOpenImageAnnotation || !isImageNode(node)) return
              const imageUrl = typeof node.data?.imageUrl === 'string' ? node.data.imageUrl.trim() : ''
              if (!imageUrl) return
              event.preventDefault()
              event.stopPropagation()
              onOpenImageAnnotation(imageUrl)
            }}
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
                showImageLabels,
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
          {detailRailMode === 'hidden' ? (
            <button
              type="button"
              className="flowboard-detail-show-btn"
              onClick={setDetailRailExpanded}
              aria-label="Show details panel"
              title="Show details panel"
            >
              {'<'}
            </button>
          ) : null}
          {variant === 'mood' && isFileDragOver ? (
            <div className="flowboard-file-drop-hint" aria-hidden="true">
              Drop images to add them to this mood board
            </div>
          ) : null}
        </div>
        {detailRailMode !== 'hidden' && (
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
