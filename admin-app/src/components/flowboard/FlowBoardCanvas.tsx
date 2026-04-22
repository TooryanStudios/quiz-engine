import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react'

type CanvasPattern = 'dots' | 'lines'
type CanvasPreset = 'bright' | 'dark' | 'reset'

type CanvasAppearance = {
  backgroundColor: string
  patternColor: string
  pattern: CanvasPattern
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
  [key: string]: unknown
}

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
}

type FlowBoardCanvasDetailsContext = {
  selectedNode: FlowNode | null
  selectedData: FlowNodeData
  canvasAppearance: CanvasAppearance
  updateSelectedNodeData: (patch: Partial<FlowNodeData>) => void
  updateSelectedNodeStyle: (patch: Record<string, unknown>) => void
  updateSelectedNodeSize: (dimension: 'width' | 'height', value: number) => void
  updateCanvasAppearance: (patch: Partial<CanvasAppearance>) => void
  applyCanvasPreset: (preset: CanvasPreset) => void
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
  }
  renderDetailsPanel?: (context: FlowBoardCanvasDetailsContext) => ReactNode
  onStateChange?: (state: FlowState) => void
}

const DEFAULT_VIEWPORT: FlowViewport = { x: 0, y: 0, zoom: 1 }

function normalizeNode(raw: unknown, index: number): FlowNode {
  if (!raw || typeof raw !== 'object') {
    return {
      id: `node-${index}`,
      type: 'noteNode',
      position: { x: 48 + (index % 4) * 240, y: 48 + Math.floor(index / 4) * 180 },
      data: { kind: 'note', label: `Note ${index + 1}`, noteColor: '#fff4bf' },
      style: { width: 220, height: 140, backgroundColor: '#fff4bf' },
    }
  }

  const candidate = raw as Record<string, unknown>
  const id = typeof candidate.id === 'string' && candidate.id ? candidate.id : `node-${index}`
  const type = typeof candidate.type === 'string' ? candidate.type : 'noteNode'
  const positionCandidate = candidate.position as { x?: unknown; y?: unknown } | undefined
  const dataCandidate = (candidate.data && typeof candidate.data === 'object') ? candidate.data as FlowNodeData : {}
  const styleCandidate = (candidate.style && typeof candidate.style === 'object') ? candidate.style as Record<string, unknown> : {}

  return {
    id,
    type,
    position: {
      x: typeof positionCandidate?.x === 'number' ? positionCandidate.x : 48 + (index % 4) * 240,
      y: typeof positionCandidate?.y === 'number' ? positionCandidate.y : 48 + Math.floor(index / 4) * 180,
    },
    data: dataCandidate,
    style: styleCandidate,
  }
}

function toNumber(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

function createNodeId(): string {
  const randomId = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  return `node-${randomId}`
}

function getDefaultAppearance(variant: 'project' | 'mood'): CanvasAppearance {
  if (variant === 'project') {
    return {
      backgroundColor: '#f7fafc',
      patternColor: '#dbe7f5',
      pattern: 'lines',
    }
  }
  return {
    backgroundColor: '#fefdf8',
    patternColor: '#ece2cb',
    pattern: 'dots',
  }
}

function getPresetAppearance(preset: CanvasPreset, fallback: CanvasAppearance): CanvasAppearance {
  if (preset === 'bright') {
    return {
      backgroundColor: '#f7fbff',
      patternColor: '#c7ddff',
      pattern: 'dots',
    }
  }
  if (preset === 'dark') {
    return {
      backgroundColor: '#1f2937',
      patternColor: '#374151',
      pattern: 'lines',
    }
  }
  return fallback
}

export function FlowBoardCanvas({
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
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const defaultAppearance = useMemo(() => getDefaultAppearance(variant), [variant])

  const [nodes, setNodes] = useState<FlowNode[]>(() => (initialState?.nodes || []).map(normalizeNode))
  const [edges, setEdges] = useState<FlowEdge[]>(() => (initialState?.edges || []).filter((item): item is FlowEdge => !!item && typeof item === 'object'))
  const [viewport, setViewport] = useState<FlowViewport>(() => ({
    x: toNumber(initialState?.viewport?.x, DEFAULT_VIEWPORT.x),
    y: toNumber(initialState?.viewport?.y, DEFAULT_VIEWPORT.y),
    zoom: toNumber(initialState?.viewport?.zoom, DEFAULT_VIEWPORT.zoom),
  }))
  const [canvasAppearance, setCanvasAppearance] = useState<CanvasAppearance>(defaultAppearance)
  const [selectedNodeId, setSelectedNodeId] = useState<string>('')
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    setNodes((initialState?.nodes || []).map(normalizeNode))
    setEdges((initialState?.edges || []).filter((item): item is FlowEdge => !!item && typeof item === 'object'))
    setViewport({
      x: toNumber(initialState?.viewport?.x, DEFAULT_VIEWPORT.x),
      y: toNumber(initialState?.viewport?.y, DEFAULT_VIEWPORT.y),
      zoom: toNumber(initialState?.viewport?.zoom, DEFAULT_VIEWPORT.zoom),
    })
    setCanvasAppearance(defaultAppearance)
    setSelectedNodeId('')
  }, [stateKey, initialState, defaultAppearance])

  useEffect(() => {
    if (!selectedNodeId) return
    if (nodes.some((node) => node.id === selectedNodeId)) return
    setSelectedNodeId('')
  }, [nodes, selectedNodeId])

  useEffect(() => {
    if (!onStateChange) return
    onStateChange({ nodes, edges, viewport })
  }, [nodes, edges, viewport, onStateChange])

  const selectedNode = useMemo(() => nodes.find((node) => node.id === selectedNodeId) || null, [nodes, selectedNodeId])
  const selectedData = (selectedNode?.data || {}) as FlowNodeData

  const updateSelectedNode = (updater: (node: FlowNode) => FlowNode) => {
    if (!selectedNodeId) return
    setNodes((prev) => prev.map((node) => (node.id === selectedNodeId ? updater(node) : node)))
  }

  const updateSelectedNodeData = (patch: Partial<FlowNodeData>) => {
    updateSelectedNode((node) => ({
      ...node,
      data: {
        ...(node.data || {}),
        ...patch,
      },
    }))
  }

  const updateSelectedNodeStyle = (patch: Record<string, unknown>) => {
    updateSelectedNode((node) => ({
      ...node,
      style: {
        ...(node.style || {}),
        ...patch,
      },
    }))
  }

  const updateSelectedNodeSize = (dimension: 'width' | 'height', value: number) => {
    const clamped = Math.max(dimension === 'width' ? 120 : 90, Math.round(value || 0))
    updateSelectedNodeStyle({ [dimension]: clamped })
  }

  const removeSelectedNode = () => {
    if (!selectedNodeId) return
    setNodes((prev) => prev.filter((node) => node.id !== selectedNodeId))
    setSelectedNodeId('')
  }

  const updateCanvasAppearance = (patch: Partial<CanvasAppearance>) => {
    setCanvasAppearance((prev) => ({ ...prev, ...patch }))
  }

  const applyCanvasPreset = (preset: CanvasPreset) => {
    setCanvasAppearance(getPresetAppearance(preset, defaultAppearance))
  }

  const appendNode = (node: FlowNode) => {
    setNodes((prev) => [...prev, node])
    setSelectedNodeId(node.id)
  }

  const addTextNode = () => {
    const nextIndex = nodes.length
    const id = createNodeId()
    appendNode({
      id,
      type: 'noteNode',
      position: { x: 64 + (nextIndex % 4) * 240, y: 64 + Math.floor(nextIndex / 4) * 180 },
      data: {
        kind: 'note',
        label: 'New note',
        noteColor: '#fff4bf',
      },
      style: {
        width: 220,
        height: 140,
        backgroundColor: '#fff4bf',
      },
    })
  }

  const triggerImageUpload = () => {
    if (isUploading) return
    fileInputRef.current?.click()
  }

  const handleImageFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = event.target.files
    if (!fileList || fileList.length === 0) return

    const files = Array.from(fileList)
    setIsUploading(true)
    try {
      const urls = await uploadImages(files)
      const startIndex = nodes.length
      const freshNodes: FlowNode[] = urls.map((url, index) => {
        const id = createNodeId()
        return {
          id,
          type: 'imageNode',
          position: {
            x: 64 + ((startIndex + index) % 3) * 260,
            y: 64 + Math.floor((startIndex + index) / 3) * 200,
          },
          data: {
            kind: 'image',
            label: `Image ${startIndex + index + 1}`,
            imageUrl: url,
            caption: '',
            tags: '',
          },
          style: {
            width: 260,
            height: 170,
            backgroundColor: '#ffffff',
          },
        }
      })
      if (freshNodes.length > 0) {
        setNodes((prev) => [...prev, ...freshNodes])
        setSelectedNodeId(freshNodes[freshNodes.length - 1].id)
      }
    } finally {
      setIsUploading(false)
      event.target.value = ''
    }
  }

  const nudgeSelectedNode = (dx: number, dy: number) => {
    if (!selectedNodeId) return
    updateSelectedNode((node) => {
      const position = node.position || { x: 0, y: 0 }
      return {
        ...node,
        position: {
          x: position.x + dx,
          y: position.y + dy,
        },
      }
    })
  }

  const canvasBackground = useMemo(() => {
    if (canvasAppearance.pattern === 'lines') {
      return {
        backgroundColor: canvasAppearance.backgroundColor,
        backgroundImage: `linear-gradient(${canvasAppearance.patternColor} 1px, transparent 1px), linear-gradient(90deg, ${canvasAppearance.patternColor} 1px, transparent 1px)`,
        backgroundSize: '24px 24px',
      } as CSSProperties
    }

    return {
      backgroundColor: canvasAppearance.backgroundColor,
      backgroundImage: `radial-gradient(${canvasAppearance.patternColor} 1.4px, transparent 1.4px)`,
      backgroundSize: '24px 24px',
    } as CSSProperties
  }, [canvasAppearance])

  const detailsContext: FlowBoardCanvasDetailsContext = {
    selectedNode,
    selectedData,
    canvasAppearance,
    updateSelectedNodeData,
    updateSelectedNodeStyle,
    updateSelectedNodeSize,
    updateCanvasAppearance,
    applyCanvasPreset,
    removeSelectedNode,
  }

  return (
    <section className={`flowboard-shell${variant === 'project' ? ' is-project' : ''}`}>
      <header className="flowboard-header">
        <div className="flowboard-title-wrap">
          <input
            className="flowboard-title-input"
            value={boardTitle}
            onChange={(event) => onBoardTitleChange(event.target.value)}
            placeholder={variant === 'project' ? 'Flow board title' : 'Mood board title'}
          />
        </div>
        <div className="flowboard-toolbar">
          <button type="button" className="flowboard-btn" onClick={addTextNode}>Add note</button>
          <button type="button" className="flowboard-btn" onClick={triggerImageUpload} disabled={isUploading}>
            {isUploading ? 'Uploading...' : 'Add image'}
          </button>
          <button type="button" className="flowboard-btn" onClick={onBoardShare}>Share</button>
          <button type="button" className="flowboard-btn flowboard-danger" onClick={onBoardDelete}>Delete</button>
        </div>
      </header>

      <div className="flowboard-content">
        <div className="flowboard-canvas-wrap">
          <div className="flowboard-canvas-controls">
            <span className="flowboard-canvas-hint">{selectedNode ? 'Node selected' : 'Canvas selected'}</span>
            <div className="flowboard-canvas-actions">
              <button type="button" className="flowboard-btn" onClick={() => nudgeSelectedNode(0, -20)} disabled={!selectedNode}>Up</button>
              <button type="button" className="flowboard-btn" onClick={() => nudgeSelectedNode(-20, 0)} disabled={!selectedNode}>Left</button>
              <button type="button" className="flowboard-btn" onClick={() => nudgeSelectedNode(20, 0)} disabled={!selectedNode}>Right</button>
              <button type="button" className="flowboard-btn" onClick={() => nudgeSelectedNode(0, 20)} disabled={!selectedNode}>Down</button>
              <button type="button" className="flowboard-btn" onClick={() => setViewport((prev) => ({ ...prev, zoom: Math.max(0.4, Number((prev.zoom - 0.1).toFixed(2))) }))}>-</button>
              <button type="button" className="flowboard-btn" onClick={() => setViewport((prev) => ({ ...prev, zoom: Math.min(2, Number((prev.zoom + 0.1).toFixed(2))) }))}>+</button>
            </div>
          </div>
          <div
            className="flowboard-canvas"
            style={{
              ...canvasBackground,
              transform: `scale(${viewport.zoom})`,
              transformOrigin: 'top left',
            }}
            onClick={() => setSelectedNodeId('')}
          >
            {nodes.map((node) => {
              const nodeStyle = node.style || {}
              const width = toNumber(nodeStyle.width, node.type === 'imageNode' ? 260 : 220)
              const height = toNumber(nodeStyle.height, node.type === 'imageNode' ? 170 : 140)
              const left = toNumber(node.position?.x, 48)
              const top = toNumber(node.position?.y, 48)
              const backgroundColor = String(nodeStyle.backgroundColor || node.data?.noteColor || '#ffffff')
              const isSelected = selectedNodeId === node.id
              const isImage = node.type === 'imageNode' || node.data?.kind === 'image'

              return (
                <button
                  key={node.id}
                  type="button"
                  className={`flowboard-node${isSelected ? ' is-selected' : ''}`}
                  style={{
                    left,
                    top,
                    width,
                    height,
                    background: isImage ? '#ffffff' : backgroundColor,
                  }}
                  onClick={(event) => {
                    event.stopPropagation()
                    setSelectedNodeId(node.id)
                  }}
                >
                  {isImage && node.data?.imageUrl ? (
                    <img src={String(node.data.imageUrl)} alt={String(node.data.label || 'Board image')} className="flowboard-node-image" />
                  ) : null}
                  <div className="flowboard-node-label">{String(node.data?.label || (isImage ? 'Image' : 'Note'))}</div>
                  {isImage && node.data?.caption ? (
                    <div className="flowboard-node-caption">{String(node.data.caption)}</div>
                  ) : null}
                </button>
              )
            })}
            {nodes.length === 0 ? (
              <div className="flowboard-empty">Use Add note or Add image to start your board.</div>
            ) : null}
          </div>
        </div>

        <aside className="flowboard-details">
          {renderDetailsPanel ? renderDetailsPanel(detailsContext) : null}
        </aside>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(event) => { void handleImageFileSelect(event) }}
      />
    </section>
  )
}
