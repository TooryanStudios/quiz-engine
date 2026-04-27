import { createContext, memo, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  MiniMap,
  NodeResizer,
  Position,
  ReactFlow,
  ReactFlowProvider,
  reconnectEdge,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type FinalConnectionState,
  type Node,
  type NodeChange,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import './ToorGenFlowCanvas.css'

export type ToorGenAspectRatio = '16:9' | '9:16' | '4:3' | '3:4'
export type ToorGenGenerationMode = 'text-to-video' | 'image-to-video'
export type ToorGenStoryContext = Record<string, unknown>
export type ToorGenModel = 'seedance-2.0' | 'seedance-2.0-fast'
export type ToorGenGenerationStatus = 'IDLE' | 'SUBMITTING' | 'IN_PROGRESS' | 'SUCCESS' | 'FAILED'
export type ToorGenNodeKind = 'prompt' | 'image-reference' | 'video-reference' | 'generation'

export type ToorGenNodeData = {
  kind: ToorGenNodeKind
  title: string
  prompt?: string
  imageUrl?: string
  videoUrl?: string
  description?: string
  onPatch?: (nodeId: string, patch: Partial<ToorGenNodeData>) => void
  onGenerate?: (nodeId: string) => void
  isGenerating?: boolean
  generationStatus?: ToorGenGenerationStatus
  connectedSummary?: string
  previewVideoUrl?: string
}

export type ToorGenCanvasNode = Node<ToorGenNodeData>
export type ToorGenCanvasEdge = Edge

export type ToorGenCanvasState = {
  nodes: ToorGenCanvasNode[]
  edges: ToorGenCanvasEdge[]
  viewport?: { x: number; y: number; zoom: number }
}

export type ToorGenGenerationRequest = {
  prompt: string
  sourcePrompt?: string
  images: string[]
  videos: string[]
  model: ToorGenModel
  localMediaCount: number
  duration: number
  aspectRatio: ToorGenAspectRatio
  mode: ToorGenGenerationMode
  graphJson: string
  hasPrompt: boolean
  collectionId: string
  collectionTitle: string
  generationNodeId: string
  storyContext?: ToorGenStoryContext
}

type ToorGenCollection = ToorGenCanvasState & {
  id: string
  title: string
  createdAt: number
  updatedAt: number
}

type ToorGenConnectionCandidate = {
  source?: string | null
  target?: string | null
  targetHandle?: string | null
}

type ToorGenFlowCanvasProps = {
  prompt: string
  onPromptChange: (value: string) => void
  duration: number
  onDurationChange: (value: number) => void
  aspectRatio: ToorGenAspectRatio
  onAspectRatioChange: (value: ToorGenAspectRatio) => void
  mode: ToorGenGenerationMode
  onModeChange: (value: ToorGenGenerationMode) => void
  model: ToorGenModel
  onModelChange: (value: ToorGenModel) => void
  status: ToorGenGenerationStatus
  isGenerating: boolean
  consumedCredits?: number | null
  selectedVideoUrl: string
  errorMessage: string
  nodeStatuses?: Record<string, ToorGenGenerationStatus>
  nodeTaskIds?: Record<string, string>
  nodeVideoUrls?: Record<string, string>
  nodeErrorMessages?: Record<string, string>
  taskId: string
  resumeTaskId: string
  onResumeTaskIdChange: (value: string) => void
  onResume: () => void
  onGenerate: (request: ToorGenGenerationRequest) => void
  onStateChange?: (state: ToorGenCanvasState) => void
}

type ToorGenCanvasContextValue = {
  onPatch: (nodeId: string, patch: Partial<ToorGenNodeData>) => void
  onGenerate: (nodeId: string) => void
  onCopyJson: (nodeId: string) => void
  model: ToorGenModel
  onModelChange: (value: ToorGenModel) => void
  nodeStatuses: Readonly<Record<string, ToorGenGenerationStatus>>
  nodeTaskIds: Readonly<Record<string, string>>
  nodeVideoUrls: Readonly<Record<string, string>>
  nodeErrorMessages: Readonly<Record<string, string>>
  copyJsonStatus: string
  connectedCounts: ReadonlyMap<string, number>
}
const ToorGenCanvasContext = createContext<ToorGenCanvasContextValue>({
  onPatch: () => {},
  onGenerate: () => {},
  onCopyJson: () => {},
  model: 'seedance-2.0-fast',
  onModelChange: () => {},
  nodeStatuses: {},
  nodeTaskIds: {},
  nodeVideoUrls: {},
  nodeErrorMessages: {},
  copyJsonStatus: '',
  connectedCounts: new Map(),
})

const COLLECTIONS_KEY = 'toorgen_flow_collections_v1'
const ACTIVE_COLLECTION_KEY = 'toorgen_flow_active_collection_v1'
const SEEDANCE_PROMPT_CHARACTER_LIMIT = 2000
const LOCAL_MEDIA_PREFIX_PATTERN = /^(data:|blob:)/i

const GENERATION_INPUT_SOCKET_RULES: Record<string, { label: string; accepts: string; acceptedKinds: ToorGenNodeKind[] }> = {
  'input-1': { label: 'Prompt', accepts: 'Prompt nodes', acceptedKinds: ['prompt'] },
  'input-2': { label: 'Image', accepts: 'Image references', acceptedKinds: ['image-reference'] },
  'input-3': { label: 'Video ref', accepts: 'Video references', acceptedKinds: ['video-reference'] },
  'input-4': { label: 'Direction', accepts: 'Prompt notes', acceptedKinds: ['prompt'] },
}

function getDefaultGenerationSocketForKind(kind: ToorGenNodeKind): string {
  if (kind === 'image-reference') return 'input-2'
  if (kind === 'video-reference') return 'input-3'
  return 'input-1'
}

function createId(prefix: string): string {
  return `${prefix}-${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)}`
}

function createNode(kind: ToorGenNodeKind, position: { x: number; y: number }): ToorGenCanvasNode {
  const defaults: Record<ToorGenNodeKind, Pick<ToorGenNodeData, 'title' | 'prompt' | 'description'>> = {
    prompt: {
      title: 'Prompt note',
      prompt: 'Describe the scene, action, camera, lighting, and style.',
    },
    'image-reference': {
      title: 'Image reference',
      description: 'Paste an image URL or upload a still reference.',
    },
    'video-reference': {
      title: 'Video reference',
      description: 'Paste a video URL for motion, pacing, or composition reference.',
    },
    generation: {
      title: 'Generation',
      description: 'Connect prompt, image, and video references here, then generate.',
    },
  }

  const size: Record<ToorGenNodeKind, { width: number; height: number }> = {
    prompt: { width: 300, height: 205 },
    'image-reference': { width: 290, height: 285 },
    'video-reference': { width: 320, height: 285 },
    generation: { width: 360, height: 330 },
  }

  return {
    id: createId(kind),
    type: `${kind}Node`,
    position,
    data: { kind, ...defaults[kind] },
    style: size[kind],
    dragHandle: '.tgfc-node-dragbar',
  }
}

function createDefaultCollection(): ToorGenCollection {
  const promptNode: ToorGenCanvasNode = {
    ...createNode('prompt', { x: 40, y: 80 }),
    id: 'tg-seed-prompt',
    data: {
      kind: 'prompt',
      title: 'Opening shot',
      prompt: 'A cinematic establishing shot with clear subject, weather, motion, and atmosphere.',
    },
  }
  const imageNode: ToorGenCanvasNode = {
    ...createNode('image-reference', { x: 40, y: 330 }),
    id: 'tg-seed-image',
    data: {
      kind: 'image-reference',
      title: 'Visual reference',
      description: 'Optional look, character, product, or location reference.',
    },
  }
  const generationNode: ToorGenCanvasNode = {
    ...createNode('generation', { x: 500, y: 180 }),
    id: 'tg-seed-generation',
  }

  return {
    id: 'default',
    title: 'Collection 01',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    nodes: [promptNode, imageNode, generationNode],
    edges: [
      { id: 'tg-seed-edge-prompt', source: promptNode.id, target: generationNode.id, targetHandle: 'input-1', animated: false, reconnectable: 'target' },
      { id: 'tg-seed-edge-image', source: imageNode.id, target: generationNode.id, targetHandle: 'input-2', animated: false, reconnectable: 'target' },
    ],
    viewport: { x: 90, y: 70, zoom: 0.9 },
  }
}

function normalizeCanvasEdges(nodes: ToorGenCanvasNode[], edges: ToorGenCanvasEdge[]): ToorGenCanvasEdge[] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  return edges.map((edge) => {
    const sourceKind = nodeById.get(edge.source)?.data.kind
    const targetKind = nodeById.get(edge.target)?.data.kind
    const savedSocketRule = edge.targetHandle ? GENERATION_INPUT_SOCKET_RULES[edge.targetHandle] : null
    const savedSocketAcceptsSource = Boolean(sourceKind && savedSocketRule?.acceptedKinds.includes(sourceKind))
    const targetHandle = targetKind === 'generation'
      ? (savedSocketAcceptsSource ? edge.targetHandle : (sourceKind ? getDefaultGenerationSocketForKind(sourceKind) : 'input-1'))
      : edge.targetHandle
    return {
      ...edge,
      animated: false,
      reconnectable: 'target',
      ...(targetHandle ? { targetHandle } : {}),
    }
  })
}

function sanitizeCollection(value: unknown): ToorGenCollection | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Partial<ToorGenCollection>
  if (!candidate.id || !candidate.title || !Array.isArray(candidate.nodes) || !Array.isArray(candidate.edges)) return null
  return {
    id: candidate.id,
    title: candidate.title,
    createdAt: Number(candidate.createdAt) || Date.now(),
    updatedAt: Number(candidate.updatedAt) || Date.now(),
    nodes: (candidate.nodes as ToorGenCanvasNode[]).map((node) => ({ ...node, type: node.type || `${node.data.kind}Node`, dragHandle: '.tgfc-node-dragbar' })),
    edges: normalizeCanvasEdges(candidate.nodes as ToorGenCanvasNode[], candidate.edges as ToorGenCanvasEdge[]),
    viewport: candidate.viewport,
  }
}

function loadCollections(): ToorGenCollection[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(COLLECTIONS_KEY) || '[]') as unknown[]
    const collections = parsed.map(sanitizeCollection).filter((entry): entry is ToorGenCollection => Boolean(entry))
    return collections.length > 0 ? collections : [createDefaultCollection()]
  } catch {
    return [createDefaultCollection()]
  }
}

function stripLocalMediaFromNode(node: ToorGenCanvasNode): ToorGenCanvasNode {
  const imageUrl = node.data.imageUrl || ''
  const videoUrl = node.data.videoUrl || ''
  const shouldStripImage = LOCAL_MEDIA_PREFIX_PATTERN.test(imageUrl)
  const shouldStripVideo = LOCAL_MEDIA_PREFIX_PATTERN.test(videoUrl)
  if (!shouldStripImage && !shouldStripVideo) return node

  return {
    ...node,
    data: {
      ...node.data,
      ...(shouldStripImage ? { imageUrl: '' } : {}),
      ...(shouldStripVideo ? { videoUrl: '' } : {}),
      description: node.data.description || 'Local upload is available only in the current session. Paste a hosted URL to persist it.',
    },
  }
}

function prepareCollectionsForStorage(collections: ToorGenCollection[]): ToorGenCollection[] {
  return collections.map((collection) => ({
    ...collection,
    nodes: collection.nodes.map(stripLocalMediaFromNode),
  }))
}

function safeSetLocalStorage(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value)
    return true
  } catch (error) {
    console.warn(`Could not persist ${key} to localStorage:`, error)
    return false
  }
}

function persistCollectionsToStorage(collections: ToorGenCollection[]): boolean {
  const storageCollections = prepareCollectionsForStorage(collections)
  return safeSetLocalStorage(COLLECTIONS_KEY, JSON.stringify(storageCollections))
}

function isLocalMediaUrl(value: string): boolean {
  return LOCAL_MEDIA_PREFIX_PATTERN.test(value.trim())
}

function isHostedMediaUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim())
}

function cleanMediaUrlForGeneration(value: string): string {
  const normalized = value.trim()
  return isHostedMediaUrl(normalized) ? normalized : ''
}

function summarizeMediaUrlForGraph(value: string): string {
  const normalized = value.trim()
  if (!normalized) return ''
  if (isLocalMediaUrl(normalized)) return '[local upload omitted; paste a hosted URL before generation]'
  return normalized
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('Unable to read file.'))
    }
    reader.onerror = () => reject(new Error('Unable to read file.'))
    reader.readAsDataURL(file)
  })
}

function getConnectedInputNodes(nodes: ToorGenCanvasNode[], edges: ToorGenCanvasEdge[], generationNodeId: string) {
  const incomingIds = new Set(edges.filter((edge) => edge.target === generationNodeId).map((edge) => edge.source))
  return nodes.filter((node) => incomingIds.has(node.id))
}

function isAllowedGenerationConnection(nodes: ToorGenCanvasNode[], connection: ToorGenConnectionCandidate): boolean {
  if (!connection.source || !connection.target || connection.source === connection.target) return false
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const sourceKind = nodeById.get(connection.source)?.data.kind
  const targetKind = nodeById.get(connection.target)?.data.kind
  if (!sourceKind || !targetKind) return false
  if (targetKind !== 'generation') return true
  const socketRule = connection.targetHandle ? GENERATION_INPUT_SOCKET_RULES[connection.targetHandle] : null
  return Boolean(socketRule?.acceptedKinds.includes(sourceKind))
}

function buildGenerationRequest(params: {
  nodes: ToorGenCanvasNode[]
  edges: ToorGenCanvasEdge[]
  generationNodeId: string
  collectionId: string
  collectionTitle: string
  fallbackPrompt: string
  fallbackImageUrl?: string
  fallbackVideoUrl?: string
  otherInstructions?: string
  duration: number
  aspectRatio: ToorGenAspectRatio
  mode: ToorGenGenerationMode
  model: ToorGenModel
}): ToorGenGenerationRequest {
  const connected = getConnectedInputNodes(params.nodes, params.edges, params.generationNodeId)
  const promptNodes = connected.filter((node) => node.data.kind === 'prompt')
  const imageNodes = connected.filter((node) => node.data.kind === 'image-reference')
  const videoNodes = connected.filter((node) => node.data.kind === 'video-reference')
  const prompts = promptNodes
    .map((node) => [node.data.title, node.data.prompt].filter(Boolean).join(': '))
    .filter(Boolean)
  const rawImages = [params.fallbackImageUrl || '', ...imageNodes.map((node) => node.data.imageUrl?.trim() || '')].filter(Boolean)
  const rawVideos = [params.fallbackVideoUrl || '', ...videoNodes.map((node) => node.data.videoUrl?.trim() || '')].filter(Boolean)
  const images = rawImages.map(cleanMediaUrlForGeneration).filter(Boolean)
  const videos = rawVideos.map(cleanMediaUrlForGeneration).filter(Boolean)
  const localMediaCount = [...rawImages, ...rawVideos].filter(isLocalMediaUrl).length
  const promptText = [params.fallbackPrompt.trim(), prompts.join('\n'), params.otherInstructions?.trim() || ''].filter(Boolean).join('\n\n')
  const graph = {
    collection: { id: params.collectionId, title: params.collectionTitle },
    generationNodeId: params.generationNodeId,
    inputs: connected.map((node) => ({
      id: node.id,
      kind: node.data.kind,
      title: node.data.title,
      prompt: node.data.prompt || '',
      imageUrl: summarizeMediaUrlForGraph(node.data.imageUrl || ''),
      videoUrl: summarizeMediaUrlForGraph(node.data.videoUrl || ''),
      description: node.data.description || '',
    })),
    edges: params.edges
      .filter((edge) => edge.target === params.generationNodeId || connected.some((node) => node.id === edge.source || node.id === edge.target))
      .map((edge) => ({ id: edge.id, source: edge.source, target: edge.target })),
    output: {
      model: params.model,
      duration: params.duration,
      aspectRatio: params.aspectRatio,
      mode: images.length > 0 ? 'image-to-video' : params.mode,
    },
  }
  const graphJson = JSON.stringify(graph, null, 2)

  return {
    prompt: promptText,
    images,
    videos,
    model: params.model,
    localMediaCount,
    duration: params.duration,
    aspectRatio: params.aspectRatio,
    mode: images.length > 0 ? 'image-to-video' : params.mode,
    graphJson,
    hasPrompt: promptText.trim().length > 0,
    collectionId: params.collectionId,
    collectionTitle: params.collectionTitle,
    generationNodeId: params.generationNodeId,
  }
}

async function copyTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const textArea = document.createElement('textarea')
  textArea.value = text
  textArea.setAttribute('readonly', 'true')
  textArea.style.position = 'fixed'
  textArea.style.left = '-9999px'
  document.body.appendChild(textArea)
  textArea.select()
  document.execCommand('copy')
  document.body.removeChild(textArea)
}

function EditableNodeTitle({
  ariaLabel,
  title,
  onChange,
}: {
  ariaLabel: string
  title: string
  onChange: (value: string) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  if (isEditing) {
    return (
      <input
        aria-label={ariaLabel}
        className="tgfc-node-title nodrag"
        value={title}
        autoFocus
        onBlur={() => setIsEditing(false)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === 'Escape') {
            event.currentTarget.blur()
          }
        }}
        onChange={(event) => onChange(event.target.value)}
      />
    )
  }
  return (
    <button type="button" className="tgfc-node-title-display" onDoubleClick={() => setIsEditing(true)} title="Double-click to rename">
      {title || 'Untitled'}
    </button>
  )
}

function PromptNodeInner({ id, data, selected }: NodeProps<ToorGenCanvasNode>) {
  const { onPatch } = useContext(ToorGenCanvasContext)
  const promptText = data.prompt || ''
  const promptCharacterCount = promptText.length
  const isOverPromptLimit = promptCharacterCount > SEEDANCE_PROMPT_CHARACTER_LIMIT
  return (
    <section className={`tgfc-node tgfc-node--prompt${selected ? ' is-selected' : ''}`}>
      <NodeResizer minWidth={240} minHeight={170} isVisible={selected} lineStyle={{ borderColor: '#d9f02f' }} handleStyle={{ background: '#d9f02f', borderColor: '#07080b' }} />
      <Handle type="target" position={Position.Left} className="tgfc-handle" />
      <Handle type="source" position={Position.Right} className="tgfc-handle" />
      <div className="tgfc-node-dragbar"><EditableNodeTitle ariaLabel="Prompt node title" title={data.title} onChange={(value) => onPatch(id, { title: value })} /></div>
      <textarea className="tgfc-node-textarea nodrag" value={promptText} onChange={(event) => onPatch(id, { prompt: event.target.value })} placeholder="Prompt direction..." rows={5} />
      <div className={`tgfc-node-count${isOverPromptLimit ? ' is-over-limit' : ''}`} aria-live="polite">
        {promptCharacterCount.toLocaleString()} / {SEEDANCE_PROMPT_CHARACTER_LIMIT.toLocaleString()} characters
      </div>
    </section>
  )
}
const PromptNode = memo(PromptNodeInner, (prev, next) => prev.selected === next.selected && prev.data === next.data)

function ImageReferenceNodeInner({ id, data, selected }: NodeProps<ToorGenCanvasNode>) {
  const { onPatch } = useContext(ToorGenCanvasContext)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  return (
    <section className={`tgfc-node tgfc-node--image${selected ? ' is-selected' : ''}`}>
      <NodeResizer minWidth={240} minHeight={230} isVisible={selected} lineStyle={{ borderColor: '#d9f02f' }} handleStyle={{ background: '#d9f02f', borderColor: '#07080b' }} />
      <Handle type="target" position={Position.Left} className="tgfc-handle" />
      <Handle type="source" position={Position.Right} className="tgfc-handle" />
      <div className="tgfc-node-dragbar"><EditableNodeTitle ariaLabel="Image reference node title" title={data.title} onChange={(value) => onPatch(id, { title: value })} /></div>
      <div className="tgfc-media-frame">{data.imageUrl ? <img src={data.imageUrl} alt="Reference" /> : <span>Image reference</span>}</div>
      <input className="tgfc-node-input nodrag" value={data.imageUrl || ''} onChange={(event) => onPatch(id, { imageUrl: event.target.value })} placeholder="https://image-reference.jpg" />
      <button type="button" className="tgfc-node-action nodrag" onClick={() => fileInputRef.current?.click()}>Upload image</button>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (!file) return
          void fileToDataUrl(file).then((imageUrl) => onPatch(id, { imageUrl }))
        }}
      />
    </section>
  )
}
const ImageReferenceNode = memo(ImageReferenceNodeInner, (prev, next) => prev.selected === next.selected && prev.data === next.data)

function VideoReferenceNodeInner({ id, data, selected }: NodeProps<ToorGenCanvasNode>) {
  const { onPatch } = useContext(ToorGenCanvasContext)
  return (
    <section className={`tgfc-node tgfc-node--video${selected ? ' is-selected' : ''}`}>
      <NodeResizer minWidth={260} minHeight={240} isVisible={selected} lineStyle={{ borderColor: '#d9f02f' }} handleStyle={{ background: '#d9f02f', borderColor: '#07080b' }} />
      <Handle type="target" position={Position.Left} className="tgfc-handle" />
      <Handle type="source" position={Position.Right} className="tgfc-handle" />
      <div className="tgfc-node-dragbar"><EditableNodeTitle ariaLabel="Video reference node title" title={data.title} onChange={(value) => onPatch(id, { title: value })} /></div>
      <div className="tgfc-media-frame">{data.videoUrl ? <video src={data.videoUrl} muted playsInline controls /> : <span>Video reference</span>}</div>
      <input className="tgfc-node-input nodrag" value={data.videoUrl || ''} onChange={(event) => onPatch(id, { videoUrl: event.target.value })} placeholder="https://video-reference.mp4" />
    </section>
  )
}
const VideoReferenceNode = memo(VideoReferenceNodeInner, (prev, next) => prev.selected === next.selected && prev.data === next.data)

function GenerationNodeInner({ id, data, selected }: NodeProps<ToorGenCanvasNode>) {
  const {
    onPatch,
    onGenerate,
    onCopyJson,
    model,
    onModelChange,
    nodeStatuses,
    nodeTaskIds,
    nodeVideoUrls,
    nodeErrorMessages,
    copyJsonStatus,
    connectedCounts,
  } = useContext(ToorGenCanvasContext)
  const nodeStatus = nodeStatuses[id] || 'IDLE'
  const nodeTaskId = nodeTaskIds[id] || ''
  const nodeVideoUrl = nodeVideoUrls[id] || ''
  const nodeErrorMessage = nodeErrorMessages[id] || ''
  const nodeIsGenerating = nodeStatus === 'SUBMITTING' || nodeStatus === 'IN_PROGRESS'
  const count = connectedCounts.get(id) || 0
  const connectedSummary = count > 0 ? `${count} input${count === 1 ? '' : 's'} connected` : 'Connect prompt, image, or video nodes'
  const inputSockets = Object.entries(GENERATION_INPUT_SOCKET_RULES).map(([socketId, rule]) => ({ id: socketId, ...rule }))
  return (
    <section className={`tgfc-node tgfc-node--generation${selected ? ' is-selected' : ''}`}>
      <NodeResizer minWidth={330} minHeight={300} isVisible={selected} lineStyle={{ borderColor: '#d9f02f' }} handleStyle={{ background: '#d9f02f', borderColor: '#07080b' }} />
      {inputSockets.map((socket) => (
        <Handle
          key={socket.id}
          id={socket.id}
          type="target"
          position={Position.Left}
          className={`tgfc-handle tgfc-handle--generation-input is-${socket.id}`}
        />
      ))}
      <Handle type="source" position={Position.Right} className="tgfc-handle" />
      <div className="tgfc-generation-sockets" aria-hidden="true">
        {inputSockets.map((socket) => (
          <div key={socket.id} className={`tgfc-generation-socket-label is-${socket.id}`}>
            <strong>{socket.label}</strong>
            <span>{socket.accepts}</span>
          </div>
        ))}
      </div>
      <div className="tgfc-node-dragbar"><EditableNodeTitle ariaLabel="Generation node title" title={data.title} onChange={(value) => onPatch(id, { title: value })} /></div>
      <p>{data.description || 'Connect inputs, then render.'}</p>
      <div className="tgfc-generation-node-preview">
        {nodeVideoUrl ? <video key={nodeVideoUrl} src={nodeVideoUrl} controls playsInline /> : nodeIsGenerating ? <span>Rendering...</span> : <span>Video preview</span>}
      </div>
      {nodeTaskId ? <div className="tgfc-node-task-id">Task: {nodeTaskId}</div> : null}
      {nodeErrorMessage ? <div className="tgfc-error tgfc-node-error">{nodeErrorMessage}</div> : null}
      <span className="tgfc-connected-summary">{connectedSummary}</span>
      <select
        className="tgfc-node-input nodrag"
        value={model}
        onChange={(event) => onModelChange(event.target.value as ToorGenModel)}
        aria-label="Generation model"
      >
        <option value="seedance-2.0-fast">Seedance 2.0 Fast</option>
        <option value="seedance-2.0">Seedance 2.0</option>
      </select>
      <div className="tgfc-node-actions">
        <button type="button" className="tgfc-node-action nodrag" onClick={() => onCopyJson(id)}>
          {copyJsonStatus || 'Copy JSON'}
        </button>
        <button type="button" className="tgfc-generate-node-btn nodrag" disabled={nodeIsGenerating} onClick={() => onGenerate(id)}>
          {nodeIsGenerating ? 'Rendering...' : 'Generate from inputs'}
        </button>
      </div>
    </section>
  )
}
const GenerationNode = memo(GenerationNodeInner, (prev, next) => prev.selected === next.selected && prev.data === next.data)

const NODE_TYPES = {
  promptNode: PromptNode,
  'image-referenceNode': ImageReferenceNode,
  'video-referenceNode': VideoReferenceNode,
  generationNode: GenerationNode,
} as const

function ToorGenFlowCanvasInner(props: ToorGenFlowCanvasProps) {
  const {
    prompt,
    onPromptChange,
    duration,
    onDurationChange,
    aspectRatio,
    onAspectRatioChange,
    mode,
    onModeChange,
    model,
    onModelChange,
    status,
    isGenerating,
    consumedCredits,
    selectedVideoUrl,
    errorMessage,
    nodeStatuses = {},
    nodeTaskIds = {},
    nodeVideoUrls = {},
    nodeErrorMessages = {},
    taskId,
    resumeTaskId,
    onResumeTaskIdChange,
    onResume,
    onGenerate,
    onStateChange,
  } = props
  const { getViewport, setViewport, screenToFlowPosition } = useReactFlow<ToorGenCanvasNode, ToorGenCanvasEdge>()
  const [collections, setCollections] = useState<ToorGenCollection[]>(() => loadCollections())
  const [activeCollectionId, setActiveCollectionId] = useState(() => {
    try {
      return localStorage.getItem(ACTIVE_COLLECTION_KEY) || loadCollections()[0]?.id || 'default'
    } catch {
      return loadCollections()[0]?.id || 'default'
    }
  })
  const [lastGraphJson, setLastGraphJson] = useState('')
  const [fallbackImageUrl, setFallbackImageUrl] = useState('')
  const [fallbackVideoUrl, setFallbackVideoUrl] = useState('')
  const [otherInstructions, setOtherInstructions] = useState('')
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([])
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([])
  const collectionsRef = useRef(collections)
  collectionsRef.current = collections
  const activeCollection = collections.find((collection) => collection.id === activeCollectionId) || collections[0] || createDefaultCollection()
  const [nodes, setNodes] = useState<ToorGenCanvasNode[]>(activeCollection.nodes)
  const [edges, setEdges] = useState<ToorGenCanvasEdge[]>(activeCollection.edges)
  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)
  nodesRef.current = nodes
  edgesRef.current = edges
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const persistCollections = useCallback((nextCollections: ToorGenCollection[]) => {
    collectionsRef.current = nextCollections
    setCollections(nextCollections)
    persistCollectionsToStorage(nextCollections)
  }, [])

  const schedulePersist = useCallback(() => {
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current)
    persistTimerRef.current = setTimeout(() => {
      const latestNodes = nodesRef.current
      const latestEdges = edgesRef.current
      const viewport = getViewport()
      const updated = collectionsRef.current.map((c) =>
        c.id === activeCollectionId
          ? { ...c, nodes: latestNodes, edges: latestEdges, viewport, updatedAt: Date.now() }
          : c
      )
      collectionsRef.current = updated
      setCollections(updated)
      persistCollectionsToStorage(updated)
      onStateChange?.({ nodes: latestNodes, edges: latestEdges, viewport })
    }, 300)
  }, [activeCollectionId, getViewport, onStateChange])

  useEffect(() => {
    safeSetLocalStorage(ACTIVE_COLLECTION_KEY, activeCollectionId)
  }, [activeCollectionId])

  const activateCollection = useCallback((collectionId: string) => {
    const nextCollection = collections.find((collection) => collection.id === collectionId) || collections[0]
    if (!nextCollection) return
    setActiveCollectionId(nextCollection.id)
    setNodes(nextCollection.nodes)
    setEdges(nextCollection.edges)
    requestAnimationFrame(() => {
      if (nextCollection.viewport) setViewport(nextCollection.viewport)
    })
    onStateChange?.({ nodes: nextCollection.nodes, edges: nextCollection.edges, viewport: nextCollection.viewport })
  }, [collections, onStateChange, setViewport])

  const patchNode = useCallback((nodeId: string, patch: Partial<ToorGenNodeData>) => {
    setNodes((current) => current.map((node) => node.id === nodeId ? { ...node, data: { ...node.data, ...patch } } : node))
    schedulePersist()
  }, [schedulePersist])

  const generateFromNode = useCallback((generationNodeId: string) => {
    const request = buildGenerationRequest({
      nodes: nodesRef.current,
      edges: edgesRef.current,
      generationNodeId,
      collectionId: activeCollection.id,
      collectionTitle: activeCollection.title,
      fallbackPrompt: prompt,
      fallbackImageUrl,
      fallbackVideoUrl,
      otherInstructions,
      duration,
      aspectRatio,
      mode,
      model,
    })
    setLastGraphJson(request.graphJson)
    onGenerate(request)
  }, [activeCollection.id, activeCollection.title, aspectRatio, duration, fallbackImageUrl, fallbackVideoUrl, mode, model, onGenerate, otherInstructions, prompt])

  const connectedCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const edge of edges) {
      if (edge.target) {
        counts.set(edge.target, (counts.get(edge.target) || 0) + 1)
      }
    }
    return counts
  }, [edges])

  const displayNodes = nodes

  const displayEdges = edges

  const handleNodesChange = useCallback((changes: NodeChange<ToorGenCanvasNode>[]) => {
    setNodes((current) => applyNodeChanges(changes, current))
    schedulePersist()
  }, [schedulePersist])

  const handleEdgesChange = useCallback((changes: EdgeChange<ToorGenCanvasEdge>[]) => {
    setEdges((current) => applyEdgeChanges(changes, current))
    schedulePersist()
  }, [schedulePersist])

  const handleConnect = useCallback((connection: Connection) => {
    if (!isAllowedGenerationConnection(nodesRef.current, connection)) return
    setEdges((current) => addEdge({ ...connection, id: createId('edge'), animated: false, reconnectable: 'target' }, current))
    schedulePersist()
  }, [schedulePersist])

  const handleReconnect = useCallback((oldEdge: ToorGenCanvasEdge, newConnection: Connection) => {
    if (!isAllowedGenerationConnection(nodesRef.current, newConnection)) return
    setEdges((current) => normalizeCanvasEdges(nodesRef.current, reconnectEdge(oldEdge, newConnection, current, { shouldReplaceId: false })))
    schedulePersist()
  }, [schedulePersist])

  const handleReconnectEnd = useCallback((_event: MouseEvent | TouchEvent, edge: ToorGenCanvasEdge, _handleType: string, connectionState: FinalConnectionState) => {
    if (connectionState.isValid === true) return
    setEdges((current) => current.filter((item) => item.id !== edge.id))
    schedulePersist()
  }, [schedulePersist])

  const validateConnection = useCallback((connection: ToorGenConnectionCandidate) => isAllowedGenerationConnection(nodesRef.current, connection), [])

  const addNode = (kind: ToorGenNodeKind) => {
    const nextNode = createNode(kind, { x: 120 + nodesRef.current.length * 28, y: 120 + nodesRef.current.length * 24 })
    setNodes((current) => [...current, nextNode])
    schedulePersist()
  }

  const addCollection = () => {
    const nextCollection = { ...createDefaultCollection(), id: createId('collection'), title: `Collection ${String(collections.length + 1).padStart(2, '0')}` }
    persistCollections([...collections, nextCollection])
    setActiveCollectionId(nextCollection.id)
    setNodes(nextCollection.nodes)
    setEdges(nextCollection.edges)
    requestAnimationFrame(() => {
      if (nextCollection.viewport) setViewport(nextCollection.viewport)
    })
    onStateChange?.({ nodes: nextCollection.nodes, edges: nextCollection.edges, viewport: nextCollection.viewport })
  }

  const renameCollection = (title: string) => {
    persistCollections(collections.map((collection) => collection.id === activeCollection.id ? { ...collection, title, updatedAt: Date.now() } : collection))
  }

  const deleteCollection = () => {
    if (collections.length <= 1) return
    const nextCollections = collections.filter((collection) => collection.id !== activeCollection.id)
    persistCollections(nextCollections)
    activateCollection(nextCollections[0].id)
  }

  const [jsonPanelOpen, setJsonPanelOpen] = useState(false)
  const [generationDefaultsOpen, setGenerationDefaultsOpen] = useState(false)
  const [copyJsonStatus, setCopyJsonStatus] = useState('')

  const buildRequestForGenerationNode = useCallback((generationNodeId: string, sourceNodes = nodesRef.current, sourceEdges = edgesRef.current) => buildGenerationRequest({
    nodes: sourceNodes,
    edges: sourceEdges,
    generationNodeId,
    collectionId: activeCollection.id,
    collectionTitle: activeCollection.title,
    fallbackPrompt: prompt,
    fallbackImageUrl,
    fallbackVideoUrl,
    otherInstructions,
    duration,
    aspectRatio,
    mode,
    model,
  }), [activeCollection.id, activeCollection.title, aspectRatio, duration, fallbackImageUrl, fallbackVideoUrl, mode, model, otherInstructions, prompt])

  const previewJson = useMemo(() => {
    if (!jsonPanelOpen) return ''
    const generationNode = nodes.find((node) => node.data.kind === 'generation')
    if (!generationNode) return ''
    return buildRequestForGenerationNode(generationNode.id, nodes, edges).graphJson
  }, [jsonPanelOpen, buildRequestForGenerationNode, edges, nodes])

  const currentGraphJson = lastGraphJson || previewJson

  const copyGraphJson = useCallback((generationNodeId?: string) => {
    const targetNodeId = generationNodeId || nodesRef.current.find((node) => node.data.kind === 'generation')?.id
    if (!targetNodeId) return
    const request = buildRequestForGenerationNode(targetNodeId)
    setLastGraphJson(request.graphJson)
    setCopyJsonStatus('Copying...')
    void copyTextToClipboard(request.graphJson)
      .then(() => {
        setCopyJsonStatus('Copied')
        window.setTimeout(() => setCopyJsonStatus(''), 1400)
      })
      .catch(() => {
        setCopyJsonStatus('Copy failed')
        window.setTimeout(() => setCopyJsonStatus(''), 1800)
      })
  }, [buildRequestForGenerationNode])

  const requestDeleteSelected = useCallback(() => {
    if (selectedNodeIds.length === 0) return
    setPendingDeleteIds(selectedNodeIds)
  }, [selectedNodeIds])

  const confirmDeleteNodes = () => {
    if (pendingDeleteIds.length === 0) return
    const deleteSet = new Set(pendingDeleteIds)
    setNodes((current) => current.filter((node) => !deleteSet.has(node.id)))
    setEdges((current) => current.filter((edge) => !deleteSet.has(edge.source) && !deleteSet.has(edge.target)))
    setSelectedNodeIds([])
    setPendingDeleteIds([])
    schedulePersist()
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const tagName = target?.tagName.toLowerCase()
      const isEditing = tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target?.isContentEditable
      if (isEditing) return
      if (event.key !== 'Delete' && event.key !== 'Backspace') return
      if (selectedNodeIds.length === 0) return
      event.preventDefault()
      setPendingDeleteIds(selectedNodeIds)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedNodeIds])

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null
      const tagName = target?.tagName.toLowerCase()
      const isEditing = tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target?.isContentEditable
      if (isEditing) return

      const imageItem = Array.from(event.clipboardData?.items || []).find((item) => item.type.startsWith('image/'))
      if (imageItem) {
        const file = imageItem.getAsFile()
        if (!file) return
        event.preventDefault()
        void fileToDataUrl(file).then((imageUrl) => {
          const nextNode = createNode('image-reference', screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 }))
          nextNode.data = { ...nextNode.data, title: 'Pasted image', imageUrl }
          setNodes((current) => [...current, nextNode])
          schedulePersist()
        })
        return
      }

      const text = event.clipboardData?.getData('text/plain')?.trim() || ''
      if (/^https?:\/\//i.test(text) && /\.(png|jpe?g|gif|webp|avif)(\?|#|$)/i.test(text)) {
        event.preventDefault()
        const nextNode = createNode('image-reference', screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 }))
        nextNode.data = { ...nextNode.data, title: 'Image URL', imageUrl: text }
        setNodes((current) => [...current, nextNode])
        schedulePersist()
      }
    }
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [schedulePersist, screenToFlowPosition])

  const handleSelectionChange = useCallback(({ nodes: selectedNodes }: { nodes: ToorGenCanvasNode[] }) => {
    const nextIds = selectedNodes.map((node) => node.id)
    setSelectedNodeIds((currentIds) => {
      if (currentIds.length === nextIds.length && currentIds.every((id, index) => id === nextIds[index])) return currentIds
      return nextIds
    })
  }, [])

  const handleMoveEnd = useCallback((_event: MouseEvent | TouchEvent | null, viewport: { x: number; y: number; zoom: number }) => {
    const updated = collectionsRef.current.map((c) => c.id === activeCollectionId ? { ...c, viewport, updatedAt: Date.now() } : c)
    collectionsRef.current = updated
    setCollections(updated)
    persistCollectionsToStorage(updated)
  }, [activeCollectionId])

  const canvasContextValue = useMemo<ToorGenCanvasContextValue>(() => ({
    onPatch: patchNode,
    onGenerate: generateFromNode,
    onCopyJson: copyGraphJson,
    model,
    onModelChange,
    nodeStatuses,
    nodeTaskIds,
    nodeVideoUrls,
    nodeErrorMessages,
    copyJsonStatus,
    connectedCounts,
  }), [patchNode, generateFromNode, copyGraphJson, model, onModelChange, nodeStatuses, nodeTaskIds, nodeVideoUrls, nodeErrorMessages, copyJsonStatus, connectedCounts])

  return (
    <section className="tgfc-shell">
      <div className="tgfc-toolbar">
        <select value={activeCollection.id} onChange={(event) => activateCollection(event.target.value)} aria-label="Collection">
          {collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.title}</option>)}
        </select>
        <input value={activeCollection.title} onChange={(event) => renameCollection(event.target.value)} aria-label="Collection title" />
        <button type="button" onClick={addCollection}>New collection</button>
        <button type="button" onClick={deleteCollection} disabled={collections.length <= 1}>Delete</button>
        <span className="tgfc-toolbar-divider" />
        <button type="button" onClick={() => addNode('prompt')}>Prompt</button>
        <button type="button" onClick={() => addNode('image-reference')}>Image ref</button>
        <button type="button" onClick={() => addNode('video-reference')}>Video ref</button>
        <button type="button" onClick={() => addNode('generation')}>Generation</button>
      </div>

      <ToorGenCanvasContext.Provider value={canvasContextValue}>
      <ReactFlow<ToorGenCanvasNode, ToorGenCanvasEdge>
        nodes={displayNodes}
        edges={displayEdges}
        nodeTypes={NODE_TYPES}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        isValidConnection={validateConnection}
        edgesReconnectable
        onReconnect={handleReconnect}
        onReconnectEnd={handleReconnectEnd}
        minZoom={0.18}
        maxZoom={2.2}
        fitView={false}
        zoomOnScroll
        panOnScroll={false}
        selectionOnDrag
        deleteKeyCode={null}
        onSelectionChange={handleSelectionChange}
        onMoveEnd={handleMoveEnd}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1.2} color="#2a2e38" />
        <MiniMap pannable zoomable position="bottom-left" className="tgfc-minimap" />
        <Controls position="top-right" className="tgfc-controls" />
      </ReactFlow>
      </ToorGenCanvasContext.Provider>

      <aside className={`tgfc-floating-panel tgfc-generation-panel${generationDefaultsOpen ? ' is-open' : ''}`}>
        <button type="button" className="tgfc-panel-head tgfc-panel-head--toggle" onClick={() => setGenerationDefaultsOpen((value) => !value)}>
          <span>Generation defaults</span>
          <span className="tgfc-panel-status-group">
            {typeof consumedCredits === 'number' ? <span className="tgfc-credit-badge">{consumedCredits} credits</span> : null}
            <strong>{status}</strong>
            <span className="tgfc-panel-toggle-icon">{generationDefaultsOpen ? '▲' : '▼'}</span>
          </span>
        </button>
        {generationDefaultsOpen && (
          <>
            <div className="tgfc-inline-preview">
              {selectedVideoUrl ? <video key={selectedVideoUrl} controls playsInline src={selectedVideoUrl} /> : isGenerating ? <div>Rendering...</div> : <div>Video preview</div>}
            </div>
            <label className="tgfc-field">
              <span>Prompt</span>
              <textarea value={prompt} onChange={(event) => onPromptChange(event.target.value)} rows={3} placeholder="Required prompt fallback..." />
            </label>
            <label className="tgfc-field">
              <span>Image reference URL</span>
              <input value={fallbackImageUrl} onChange={(event) => setFallbackImageUrl(event.target.value)} placeholder="https://image-reference.jpg" />
            </label>
            <label className="tgfc-field">
              <span>Video reference URL</span>
              <input value={fallbackVideoUrl} onChange={(event) => setFallbackVideoUrl(event.target.value)} placeholder="https://video-reference.mp4" />
            </label>
            <label className="tgfc-field">
              <span>Other instructions</span>
              <input value={otherInstructions} onChange={(event) => setOtherInstructions(event.target.value)} placeholder="Weather, mood, constraints..." />
            </label>
            <div className="tgfc-control-grid">
              <select value={model} onChange={(event) => onModelChange(event.target.value as ToorGenModel)} aria-label="Model">
                <option value="seedance-2.0-fast">Seedance 2.0 Fast</option>
                <option value="seedance-2.0">Seedance 2.0</option>
              </select>
              <select value={mode} onChange={(event) => onModeChange(event.target.value as ToorGenGenerationMode)} aria-label="Generation mode">
                <option value="text-to-video">Text to video</option>
                <option value="image-to-video">Image to video</option>
              </select>
              <select value={duration} onChange={(event) => onDurationChange(Number(event.target.value))} aria-label="Duration">
                <option value={5}>5s</option>
                <option value={10}>10s</option>
                <option value={15}>15s</option>
              </select>
              <select value={aspectRatio} onChange={(event) => onAspectRatioChange(event.target.value as ToorGenAspectRatio)} aria-label="Aspect ratio">
                <option value="16:9">16:9</option>
                <option value="9:16">9:16</option>
                <option value="4:3">4:3</option>
                <option value="3:4">3:4</option>
              </select>
            </div>
            <div className="tgfc-resume-row">
              <input value={resumeTaskId} onChange={(event) => onResumeTaskIdChange(event.target.value)} placeholder="Fetch task ID" />
              <button type="button" onClick={onResume} disabled={!resumeTaskId.trim()}>Fetch</button>
            </div>
            <button type="button" className="tgfc-delete-selected" onClick={requestDeleteSelected} disabled={selectedNodeIds.length === 0}>Delete selected</button>
          </>
        )}
      </aside>

      <aside className={`tgfc-floating-panel tgfc-preview-panel${jsonPanelOpen ? ' is-open' : ''}`}>
        <button type="button" className="tgfc-panel-head tgfc-panel-head--toggle" onClick={() => setJsonPanelOpen((v) => !v)}>
          <span>Structured JSON</span>
          <span className="tgfc-panel-toggle-icon">{jsonPanelOpen ? '▲' : '▼'}</span>
          {taskId ? <strong title={taskId}>{taskId.slice(0, 10)}...</strong> : null}
        </button>
        {jsonPanelOpen ? (
          <>
            {errorMessage ? <div className="tgfc-error">{errorMessage}</div> : null}
            <button type="button" className="tgfc-copy-json-btn" onClick={() => copyGraphJson()}>
              {copyJsonStatus || 'Copy JSON'}
            </button>
            <pre className="tgfc-json-pre">{currentGraphJson}</pre>
          </>
        ) : null}
      </aside>

      {pendingDeleteIds.length > 0 ? (
        <div className="tgfc-confirm-layer" role="dialog" aria-modal="true" aria-label="Delete selected nodes">
          <div className="tgfc-confirm-card">
            <strong>Delete {pendingDeleteIds.length} selected node{pendingDeleteIds.length === 1 ? '' : 's'}?</strong>
            <p>Connected lines will be removed too.</p>
            <div>
              <button type="button" onClick={() => setPendingDeleteIds([])}>Cancel</button>
              <button type="button" className="is-danger" onClick={confirmDeleteNodes}>Delete</button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}

export function ToorGenFlowCanvas(props: ToorGenFlowCanvasProps) {
  return <ReactFlowProvider><ToorGenFlowCanvasInner {...props} /></ReactFlowProvider>
}