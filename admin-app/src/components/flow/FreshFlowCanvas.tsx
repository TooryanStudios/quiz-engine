import { memo, useCallback, useContext, useEffect, useMemo, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from 'react'
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  ConnectionMode,
  ConnectionLineType,
  Handle,
  NodeResizer,
  Position,
  ReactFlow,
  ReactFlowProvider,
  reconnectEdge,
  useReactFlow,
  type Connection,
  type EdgeChange,
  type FinalConnectionState,
  type NodeChange,
  type NodeProps,
} from '@xyflow/react'
import {
  createId,
  DECISION_OUTPUTS,
  DEFAULT_INPUT_HANDLE_ID,
  DEFAULT_OUTPUT_HANDLE_ID,
  DEFAULT_VIEWPORT,
  GENERATION_ASPECT_RATIO_OPTIONS,
  GENERATION_DURATION_OPTIONS,
  GENERATION_INPUT_SOCKET_RULES,
  GENERATION_MODEL_OPTIONS,
  GENERATION_MODE_OPTIONS,
  GENERATION_OUTPUT_HANDLE_ID,
  GENERATION_VIDEO_MODE_OPTIONS,
  getDefaultGenerationSocketForKind,
  getGenerationInputSocketLayout,
  NODE_META_LABEL,
  NODE_MIN_SIZE,
  NODE_PLACEHOLDER,
  THEME_LABEL,
  THEME_RESIZER_COLOR,
  useFreshFlowStudio,
  type FlowViewport,
  type FreshFlowEdge,
  type FreshFlowNode,
  type FreshFlowNodeData,
  type FreshFlowNodeKind,
  type FreshFlowTheme,
} from './FreshFlowStudioContext';
import { FreshFlowCanvasContext, type FreshFlowCanvasContextValue } from './FreshFlowCanvasContext';
import { EditableNodeTitle } from './EditableNodeTitle';
import { ToorGenLegacyNode } from './ToorGenLegacyNode';
import '@xyflow/react/dist/style.css'
import './FreshFlowCanvas.css'

const CANVAS_STATE_COMMIT_DEBOUNCE_MS = 96

const snapCoordinate = (value: number) => Math.round(value)

const snapNodePosition = (node: FreshFlowNode): FreshFlowNode => {
  const snappedX = snapCoordinate(node.position.x)
  const snappedY = snapCoordinate(node.position.y)

  if (snappedX === node.position.x && snappedY === node.position.y) return node

  return {
    ...node,
    position: {
      ...node.position,
      x: snappedX,
      y: snappedY,
    },
  }
}


type DisconnectHandleProps = {
  nodeId: string
  id: string
  type: 'source' | 'target'
  position: Position
  className?: string
  style?: CSSProperties
}

const DisconnectHandle = memo(function DisconnectHandle({ nodeId, id, type, position, className, style }: DisconnectHandleProps) {
  const { onDisconnectHandle } = useContext(FreshFlowCanvasContext)

  const handleClick = (event: ReactMouseEvent) => {
    if (!event.altKey) return
    event.preventDefault()
    event.stopPropagation()
    onDisconnectHandle(nodeId, id, type)
  }

  return (
    <Handle
      id={id}
      type={type}
      position={position}
      className={className}
      style={style}
      onClick={handleClick}
      title="Alt+click to disconnect"
    />
  )
})

const GENERATION_SOCKET_LAYOUT = getGenerationInputSocketLayout()

const FreshFlowBlockNode = memo(function FreshFlowBlockNode({ id, data, selected }: NodeProps<FreshFlowNode>) {
  const { onPatchNode, onDisconnectHandle, onDisconnectNode, hasNodeConnections, getHandleConnectionCount } = useContext(FreshFlowCanvasContext)
  const minSize = NODE_MIN_SIZE[data.kind]
  const resizerColor = THEME_RESIZER_COLOR[data.theme]
  const hasConnections = hasNodeConnections(id)
  const showThemeSelect = selected && (data.kind === 'note' || data.kind === 'decision' || data.kind === 'group' || data.kind === 'prompt' || (data.kind === 'generation' || data.kind === 'toorgen-generation'))
  const allowInput = data.kind === 'note' || data.kind === 'decision' || data.kind === 'prompt' || (data.kind === 'generation' || data.kind === 'toorgen-generation')
  const allowOutput = data.kind !== 'group'
  const generationSockets = (data.kind === 'generation' || data.kind === 'toorgen-generation') ? GENERATION_SOCKET_LAYOUT : []
  const imageUrls = data.mediaUrls.filter(Boolean)
  const generationMode = data.generationMode || 'normal'
  const videoMode = data.videoMode || 'text-to-video'
  const model = data.model || 'atlas-2.0'
  const duration = String(data.duration || 5)
  const aspectRatio = data.aspectRatio || '16:9'
  const bodyText = data.body.trim() || NODE_PLACEHOLDER[data.kind]

  return (
    <div className={`fresh-flow-node fresh-flow-node--${data.kind} fresh-flow-node--theme-${data.theme}${selected ? ' is-selected' : ''}`}>
      <NodeResizer
        isVisible={selected}
        minWidth={minSize.width}
        minHeight={minSize.height}
        lineStyle={{ borderColor: resizerColor, borderWidth: 1 }}
        handleStyle={{ width: 10, height: 10, borderRadius: 999, border: `1px solid ${resizerColor}`, background: '#ffffff' }}
      />

      {(data.kind === 'generation' || data.kind === 'toorgen-generation')
        ? generationSockets.map((socket) => {
            const count = getHandleConnectionCount(id, socket.id, 'target')
            return (
              <DisconnectHandle
                key={socket.id}
                nodeId={id}
                id={socket.id}
                type="target"
                position={Position.Left}
                className={`fresh-flow-handle fresh-flow-handle--socket${count > 0 ? ' is-connected' : ''}`}
                style={{ top: socket.top }}
              />
            )
          })
        : allowInput
          ? (
              <DisconnectHandle
                nodeId={id}
                id={DEFAULT_INPUT_HANDLE_ID}
                type="target"
                position={Position.Left}
                className={`fresh-flow-handle${getHandleConnectionCount(id, DEFAULT_INPUT_HANDLE_ID, 'target') > 0 ? ' is-connected' : ''}`}
              />
            )
          : null}

      {data.kind === 'decision'
        ? DECISION_OUTPUTS.map((output) => (
            <DisconnectHandle
              key={output.id}
              nodeId={id}
              id={output.id}
              type="source"
              position={Position.Right}
              className={`fresh-flow-handle fresh-flow-handle--decision${getHandleConnectionCount(id, output.id, 'source') > 0 ? ' is-connected' : ''}`}
              style={{ top: output.top }}
            />
          ))
        : allowOutput
          ? (
              <DisconnectHandle
                nodeId={id}
                id={(data.kind === 'generation' || data.kind === 'toorgen-generation') ? GENERATION_OUTPUT_HANDLE_ID : DEFAULT_OUTPUT_HANDLE_ID}
                type="source"
                position={Position.Right}
                className={`fresh-flow-handle${getHandleConnectionCount(id, (data.kind === 'generation' || data.kind === 'toorgen-generation') ? GENERATION_OUTPUT_HANDLE_ID : DEFAULT_OUTPUT_HANDLE_ID, 'source') > 0 ? ' is-connected' : ''}`}
              />
            )
          : null}

      <div className="fresh-flow-node__header fresh-flow-node__dragbar">
        <div className="fresh-flow-node__meta">{NODE_META_LABEL[data.kind]}</div>
        <div className="fresh-flow-node__actions">
          {showThemeSelect ? (
            <select
              className="fresh-flow-node__theme-select nodrag"
              value={data.theme}
              onChange={(event) => onPatchNode(id, { theme: event.target.value as FreshFlowTheme })}
              aria-label="Block theme"
            >
              {Object.entries(THEME_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
          ) : (
            <span className="fresh-flow-node__theme-chip">{THEME_LABEL[data.theme]}</span>
          )}
          {selected && hasConnections ? (
            <button type="button" className="fresh-flow-node__disconnect-btn nodrag" onClick={() => onDisconnectNode(id)}>
              Disconnect
            </button>
          ) : null}
        </div>
      </div>

      <EditableNodeTitle nodeId={id} kind={data.kind} title={data.title} />

      {data.kind === 'image-reference' ? (
        <>
          <div className="fresh-flow-node__image-grid">
            {imageUrls.length > 0 ? imageUrls.slice(0, 4).map((url, index) => (
              <div key={`${id}-image-${index}`} className="fresh-flow-node__image-tile">
                <img src={url} alt={`${data.title || 'Image reference'} ${index + 1}`} loading="lazy" />
              </div>
            )) : (
              <div className="fresh-flow-node__image-tile is-placeholder">Image slots</div>
            )}
            {imageUrls.length > 4 ? <div className="fresh-flow-node__image-tile is-counter">+{imageUrls.length - 4}</div> : null}
          </div>
          <div className="fresh-flow-node__caption">
            {imageUrls.length > 0 ? `${imageUrls.length} reference image${imageUrls.length === 1 ? '' : 's'}` : 'Add one or more image references from Properties.'}
          </div>
          <div className={`fresh-flow-node__body-copy${data.body.trim() ? '' : ' is-placeholder'}`}>
            {bodyText}
          </div>
        </>
      ) : data.kind === 'video-reference' ? (
        <>
          <div className="fresh-flow-node__preview">
            {data.mediaUrl.trim()
              ? <video src={data.mediaUrl} controls playsInline preload="metadata" />
              : <span>Video reference preview</span>}
          </div>
          <div className="fresh-flow-node__caption">
            {data.mediaUrl.trim() ? 'Feeds motion or framing into generation nodes.' : 'Add a video URL in Properties.'}
          </div>
          <div className={`fresh-flow-node__body-copy${data.body.trim() ? '' : ' is-placeholder'}`}>
            {bodyText}
          </div>
        </>
      ) : data.kind === 'audio-reference' ? (
        <>
          <div className="fresh-flow-node__preview fresh-flow-node__preview--audio">
            {data.mediaUrl.trim()
              ? <audio src={data.mediaUrl} controls preload="metadata" />
              : <span>Audio reference preview</span>}
          </div>
          <div className="fresh-flow-node__caption">
            {data.mediaUrl.trim() ? 'Use this to guide music, rhythm, or sound direction.' : 'Add an audio URL in Properties.'}
          </div>
          <div className={`fresh-flow-node__body-copy${data.body.trim() ? '' : ' is-placeholder'}`}>
            {bodyText}
          </div>
        </>
      ) : (data.kind === 'generation' || data.kind === 'toorgen-generation') ? (
        <>
          <div className="fresh-flow-generation-input-points">
            {generationSockets.map((socket) => {
              const count = getHandleConnectionCount(id, socket.id, 'target')
              return (
                <div key={`${socket.id}-point`} className={`fresh-flow-generation-input-point${count > 0 ? ' is-connected' : ''}`}>
                  <span className="fresh-flow-generation-input-point__dot" aria-hidden="true" />
                  <span className="fresh-flow-generation-input-point__label">{socket.label}</span>
                  <small>{count > 0 ? `${count} linked` : 'open'}</small>
                </div>
              )
            })}
          </div>

          <div className="fresh-flow-generation-preview">
            {data.previewVideoUrl?.trim()
              ? <video src={data.previewVideoUrl} controls playsInline preload="metadata" />
              : <span>Generation output preview</span>}
          </div>

          <div className="fresh-flow-generation-controls">
            <label className="fresh-flow-generation-control">
              <span>Mode</span>
              <select value={generationMode} onChange={(event) => onPatchNode(id, { generationMode: event.target.value as 'normal' | 'extend' })} className="nodrag">
                {GENERATION_MODE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="fresh-flow-generation-control">
              <span>Video</span>
              <select value={videoMode} onChange={(event) => onPatchNode(id, { videoMode: event.target.value as 'text-to-video' | 'image-to-video' })} className="nodrag">
                {GENERATION_VIDEO_MODE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="fresh-flow-generation-control">
              <span>Model</span>
              <select value={model} onChange={(event) => onPatchNode(id, { model: event.target.value as FreshFlowNodeData['model'] })} className="nodrag">
                {GENERATION_MODEL_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
            <label className="fresh-flow-generation-control">
              <span>Duration</span>
              <select value={duration} onChange={(event) => onPatchNode(id, { duration: Number(event.target.value) })} className="nodrag">
                {GENERATION_DURATION_OPTIONS.map((value) => <option key={value} value={value}>{value}s</option>)}
              </select>
            </label>
            <label className="fresh-flow-generation-control">
              <span>Ratio</span>
              <select value={aspectRatio} onChange={(event) => onPatchNode(id, { aspectRatio: event.target.value as FreshFlowNodeData['aspectRatio'] })} className="nodrag">
                {GENERATION_ASPECT_RATIO_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
          </div>

          <div className="fresh-flow-generation-socket-list">
            {generationSockets.map((socket) => {
              const count = getHandleConnectionCount(id, socket.id, 'target')
              return (
                <div key={socket.id} className={`fresh-flow-generation-socket-row${count > 0 ? ' is-connected' : ''}`}>
                  <span>{socket.label}</span>
                  <small>{count > 0 ? `${count} linked` : 'open'}</small>
                  {count > 0 ? (
                    <button type="button" className="fresh-flow-node__mini-action nodrag" onClick={() => onDisconnectHandle(id, socket.id, 'target')}>
                      Clear
                    </button>
                  ) : null}
                </div>
              )
            })}
          </div>

          <div className={`fresh-flow-node__body-copy fresh-flow-node__body-copy--compact${data.body.trim() ? '' : ' is-placeholder'}`}>
            {bodyText}
          </div>
        </>
      ) : (
        <>
          <div className={`fresh-flow-node__body-copy${data.body.trim() ? '' : ' is-placeholder'}`}>
            {bodyText}
          </div>
          {data.kind === 'decision' ? (
            <div className="fresh-flow-decision-branches">
              <span>Path A</span>
              <span>Path B</span>
            </div>
          ) : null}
          {data.kind === 'prompt' ? <div className="fresh-flow-node__caption">Prompt nodes can feed both Prompt and Direction inputs on generation blocks.</div> : null}
        </>
      )}
    </div>
  )
})

const NODE_TYPES = {
  'fresh-flow-block': FreshFlowBlockNode,
  'toorgen-generation': ToorGenLegacyNode,
}

function FreshFlowCanvasInner() {
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const {
    isReady,
    currentFlowDocument,
    edgeStyleMode,
    setSelectedNodeId,
    setNodes,
    setEdges,
    setViewport,
    setEdgeStyleMode,
    patchNode,
    createNode,
    disconnectHandle,
    disconnectNode,
  } = useFreshFlowStudio()
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([])
  const { getViewport, screenToFlowPosition, setViewport: setCanvasViewport, zoomIn, zoomOut } = useReactFlow<FreshFlowNode, FreshFlowEdge>()

  const flowNodes = currentFlowDocument?.nodes ?? []
  const flowEdges = currentFlowDocument?.edges ?? []
  const [canvasNodes, setCanvasNodesState] = useState(flowNodes)
  const [canvasEdges, setCanvasEdgesState] = useState(flowEdges)
  const nodesRef = useRef(canvasNodes)
  const edgesRef = useRef(canvasEdges)
  const pendingCommitRef = useRef<{ nodes: FreshFlowNode[]; edges: FreshFlowEdge[] } | null>(null)
  const commitTimerRef = useRef<number | null>(null)

  const flushCanvasCommit = useCallback(() => {
    if (commitTimerRef.current !== null) {
      window.clearTimeout(commitTimerRef.current)
      commitTimerRef.current = null
    }

    const pendingCommit = pendingCommitRef.current
    if (!pendingCommit) return

    pendingCommitRef.current = null

    if (pendingCommit.nodes !== flowNodes) {
      setNodes(pendingCommit.nodes)
    }

    if (pendingCommit.edges !== flowEdges) {
      setEdges(pendingCommit.edges)
    }
  }, [flowEdges, flowNodes, setEdges, setNodes])

  const scheduleCanvasCommit = useCallback((nextNodes: FreshFlowNode[], nextEdges: FreshFlowEdge[], immediate = false) => {
    pendingCommitRef.current = { nodes: nextNodes, edges: nextEdges }

    if (commitTimerRef.current !== null) {
      window.clearTimeout(commitTimerRef.current)
      commitTimerRef.current = null
    }

    if (immediate) {
      flushCanvasCommit()
      return
    }

    commitTimerRef.current = window.setTimeout(() => {
      flushCanvasCommit()
    }, CANVAS_STATE_COMMIT_DEBOUNCE_MS)
  }, [flushCanvasCommit])

  useEffect(() => {
    setCanvasNodesState(flowNodes.map(snapNodePosition))
  }, [flowNodes])

  useEffect(() => {
    setCanvasEdgesState(flowEdges)
  }, [flowEdges])

  useEffect(() => {
    nodesRef.current = canvasNodes
  }, [canvasNodes])

  useEffect(() => {
    edgesRef.current = canvasEdges
  }, [canvasEdges])

  useEffect(() => {
    flushCanvasCommit()
    setSelectedNodeIds([])
  }, [currentFlowDocument?.id, flushCanvasCommit])

  useEffect(() => () => {
    flushCanvasCommit()
  }, [flushCanvasCommit])

  const nodes = canvasNodes
  const edges = canvasEdges

  const edgeType = edgeStyleMode === 'straight' ? 'straight' : 'default'
  const renderedEdges = useMemo(
    () => edges.map((edge) => edge.type === edgeType ? edge : { ...edge, type: edgeType }),
    [edgeType, edges],
  )

  const syncViewport = useCallback(() => {
    setViewport(getViewport())
  }, [getViewport, setViewport])

  const createNodeAtCenter = useCallback((kind: FreshFlowNodeKind) => {
    if (!currentFlowDocument) return
    const rect = canvasRef.current?.getBoundingClientRect()
    const center = rect
      ? screenToFlowPosition({ x: rect.left + (rect.width / 2), y: rect.top + (rect.height / 2) })
      : { x: 180, y: 140 }
    const offset = nodesRef.current.length * 22
    createNode(kind, {
      x: snapCoordinate(center.x + offset),
      y: snapCoordinate(center.y + offset),
    })
  }, [createNode, currentFlowDocument, screenToFlowPosition])

  const deleteSelectedNodes = useCallback(() => {
    if (selectedNodeIds.length === 0) return
    const deleteSet = new Set(selectedNodeIds)
    const nextNodes = nodesRef.current.filter((node) => !deleteSet.has(node.id))
    const nextEdges = edgesRef.current.filter((edge) => !deleteSet.has(edge.source) && !deleteSet.has(edge.target))
    nodesRef.current = nextNodes
    edgesRef.current = nextEdges
    setCanvasNodesState(nextNodes)
    setCanvasEdgesState(nextEdges)
    scheduleCanvasCommit(nextNodes, nextEdges, true)
    setSelectedNodeIds([])
    setSelectedNodeId(null)
  }, [scheduleCanvasCommit, selectedNodeIds, setSelectedNodeId])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const tagName = target?.tagName.toLowerCase()
      const isEditing = tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target?.isContentEditable
      if (isEditing) return
      if (event.key !== 'Delete' && event.key !== 'Backspace') return
      if (selectedNodeIds.length === 0) return
      event.preventDefault()
      deleteSelectedNodes()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [deleteSelectedNodes, selectedNodeIds.length])

  const resolveConnectionHandles = useCallback((connection: Connection | FreshFlowEdge): Connection | null => {
    if (!connection.source || !connection.target) return null

    const sourceNode = nodesRef.current.find((node) => node.id === connection.source)
    const targetNode = nodesRef.current.find((node) => node.id === connection.target)
    if (!sourceNode || !targetNode) return null

    let sourceHandle = connection.sourceHandle ?? null
    let targetHandle = connection.targetHandle ?? null

    if (!sourceHandle) {
      if (sourceNode.data.kind === 'generation' || sourceNode.data.kind === 'toorgen-generation') {
        sourceHandle = GENERATION_OUTPUT_HANDLE_ID
      } else if (
        sourceNode.data.kind === 'note'
        || sourceNode.data.kind === 'prompt'
        || sourceNode.data.kind === 'image-reference'
        || sourceNode.data.kind === 'video-reference'
        || sourceNode.data.kind === 'audio-reference'
      ) {
        sourceHandle = DEFAULT_OUTPUT_HANDLE_ID
      }
    }

    if (!targetHandle) {
      if (targetNode.data.kind === 'generation' || targetNode.data.kind === 'toorgen-generation') {
        targetHandle = getDefaultGenerationSocketForKind(sourceNode.data.kind)
      } else if (targetNode.data.kind === 'note' || targetNode.data.kind === 'prompt' || targetNode.data.kind === 'decision') {
        targetHandle = DEFAULT_INPUT_HANDLE_ID
      }
    }

    return {
      source: connection.source,
      sourceHandle,
      target: connection.target,
      targetHandle,
    }
  }, [])

  const canConnect = useCallback((connection: Connection) => {
    const resolvedConnection = resolveConnectionHandles(connection)
    if (!resolvedConnection) return false
    if (resolvedConnection.source === resolvedConnection.target) return false

    const sourceNode = nodesRef.current.find((node) => node.id === resolvedConnection.source)
    const targetNode = nodesRef.current.find((node) => node.id === resolvedConnection.target)
    if (!sourceNode || !targetNode) return false
    if (sourceNode.data.kind === 'group' || targetNode.data.kind === 'group') return false

    if (targetNode.data.kind === 'generation' || targetNode.data.kind === 'toorgen-generation') {
      const socketRule = resolvedConnection.targetHandle ? GENERATION_INPUT_SOCKET_RULES[resolvedConnection.targetHandle] : null
      if (!socketRule) return false
      if (!socketRule.acceptedKinds.includes(sourceNode.data.kind)) return false
    } else if (targetNode.data.kind === 'note' || targetNode.data.kind === 'prompt' || targetNode.data.kind === 'decision') {
      if (resolvedConnection.targetHandle !== DEFAULT_INPUT_HANDLE_ID) return false
    } else {
      return false
    }

    if (sourceNode.data.kind === 'decision') {
      return DECISION_OUTPUTS.some((entry) => entry.id === resolvedConnection.sourceHandle)
    }

    if (sourceNode.data.kind === 'generation' || sourceNode.data.kind === 'toorgen-generation') {
      return resolvedConnection.sourceHandle === GENERATION_OUTPUT_HANDLE_ID
    }

    if (
      sourceNode.data.kind === 'note'
      || sourceNode.data.kind === 'prompt'
      || sourceNode.data.kind === 'image-reference'
      || sourceNode.data.kind === 'video-reference'
      || sourceNode.data.kind === 'audio-reference'
    ) {
      return resolvedConnection.sourceHandle === DEFAULT_OUTPUT_HANDLE_ID
    }

    return false
  }, [resolveConnectionHandles])

  const handleNodesChange = useCallback((changes: NodeChange<FreshFlowNode>[]) => {
    const dimensionMap = new Map<string, { width: number; height: number }>()
    for (const change of changes) {
      if (change.type !== 'dimensions' || !change.dimensions) continue
      dimensionMap.set(change.id, change.dimensions)
    }

    const nextNodes = applyNodeChanges(changes, nodesRef.current).map((node) => {
      const dimensions = dimensionMap.get(node.id)
      const sizedNode = !dimensions ? node : {
        ...node,
        style: {
          ...node.style,
          width: dimensions.width,
          height: dimensions.height,
        },
      }

      return snapNodePosition(sizedNode)
    })

    nodesRef.current = nextNodes
    setCanvasNodesState(nextNodes)

    if (changes.every((change) => change.type === 'select')) return
    scheduleCanvasCommit(nextNodes, edgesRef.current)
  }, [scheduleCanvasCommit])

  const handleEdgesChange = useCallback((changes: EdgeChange<FreshFlowEdge>[]) => {
    const nextEdges = applyEdgeChanges(changes, edgesRef.current)
    edgesRef.current = nextEdges
    setCanvasEdgesState(nextEdges)

    if (changes.every((change) => change.type === 'select')) return
    scheduleCanvasCommit(nodesRef.current, nextEdges)
  }, [scheduleCanvasCommit])

  const handleConnect = useCallback((connection: Connection) => {
    const resolvedConnection = resolveConnectionHandles(connection)
    if (!resolvedConnection || !canConnect(resolvedConnection)) return
    const nextEdges = addEdge({ ...resolvedConnection, id: createId('fresh-edge'), type: edgeType, reconnectable: 'target' }, edgesRef.current)
    edgesRef.current = nextEdges
    setCanvasEdgesState(nextEdges)
    scheduleCanvasCommit(nodesRef.current, nextEdges, true)
  }, [canConnect, edgeType, resolveConnectionHandles, scheduleCanvasCommit])

  const handleReconnect = useCallback((oldEdge: FreshFlowEdge, newConnection: Connection) => {
    const resolvedConnection = resolveConnectionHandles(newConnection)
    if (!resolvedConnection || !canConnect(resolvedConnection)) return
    const nextEdges = reconnectEdge(oldEdge, resolvedConnection, edgesRef.current, { shouldReplaceId: false })
    edgesRef.current = nextEdges
    setCanvasEdgesState(nextEdges)
    scheduleCanvasCommit(nodesRef.current, nextEdges, true)
  }, [canConnect, resolveConnectionHandles, scheduleCanvasCommit])

  const handleReconnectEnd = useCallback((_event: MouseEvent | TouchEvent, edge: FreshFlowEdge, _handleType: string, connectionState: FinalConnectionState) => {
    if (connectionState.isValid === true) return
    const nextEdges = edgesRef.current.filter((item) => item.id !== edge.id)
    edgesRef.current = nextEdges
    setCanvasEdgesState(nextEdges)
    scheduleCanvasCommit(nodesRef.current, nextEdges, true)
  }, [scheduleCanvasCommit])

  const handleIsValidConnection = useCallback((connection: Connection | FreshFlowEdge) => canConnect({
    source: connection.source,
    sourceHandle: connection.sourceHandle ?? null,
    target: connection.target,
    targetHandle: connection.targetHandle ?? null,
  }), [canConnect])

  const handleSelectionChange = useCallback(({ nodes: nextSelectedNodes }: { nodes: FreshFlowNode[] }) => {
    const nextSelectedNodeIds = nextSelectedNodes.map((node) => node.id)
    setSelectedNodeIds((current) => {
      if (current.length === nextSelectedNodeIds.length && current.every((id, index) => id === nextSelectedNodeIds[index])) {
        return current
      }
      return nextSelectedNodeIds
    })
    setSelectedNodeId(nextSelectedNodes[0]?.id ?? null)
  }, [setSelectedNodeId])

  const handleMoveEnd = useCallback((_event: unknown, nextViewport: FlowViewport) => {
    setViewport(nextViewport)
    flushCanvasCommit()
  }, [flushCanvasCommit, setViewport])

  const handleNodeDragStop = useCallback(() => {
    flushCanvasCommit()
  }, [flushCanvasCommit])

  const handleZoomIn = useCallback(() => {
    void zoomIn({ duration: 140 })
    setTimeout(syncViewport, 150)
  }, [syncViewport, zoomIn])

  const handleZoomOut = useCallback(() => {
    void zoomOut({ duration: 140 })
    setTimeout(syncViewport, 150)
  }, [syncViewport, zoomOut])

  const handleResetView = useCallback(() => {
    void setCanvasViewport(DEFAULT_VIEWPORT, { duration: 180 })
    setViewport(DEFAULT_VIEWPORT)
  }, [setCanvasViewport, setViewport])

  const connectedNodeIds = useMemo(() => {
    const ids = new Set<string>()
    for (const edge of edges) {
      ids.add(edge.source)
      ids.add(edge.target)
    }
    return ids
  }, [edges])

  const handleConnectionCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const edge of edges) {
      if (edge.sourceHandle) {
        const key = `${edge.source}:source:${edge.sourceHandle}`
        counts.set(key, (counts.get(key) || 0) + 1)
      }
      if (edge.targetHandle) {
        const key = `${edge.target}:target:${edge.targetHandle}`
        counts.set(key, (counts.get(key) || 0) + 1)
      }
    }
    return counts
  }, [edges])

  const canvasContextValue = useMemo<FreshFlowCanvasContextValue>(() => ({
    onPatchNode: patchNode,
    onDisconnectHandle: disconnectHandle,
    onDisconnectNode: disconnectNode,
    hasNodeConnections: (nodeId: string) => connectedNodeIds.has(nodeId),
    getHandleConnectionCount: (nodeId: string, handleId: string, handleType: 'source' | 'target') => handleConnectionCounts.get(`${nodeId}:${handleType}:${handleId}`) || 0,
  }), [connectedNodeIds, disconnectHandle, disconnectNode, handleConnectionCounts, patchNode])

  return (
    <div ref={canvasRef} className="fresh-flow-shell">
      <div className="fresh-flow-toolbar" role="toolbar" aria-label="Flow canvas tools">
        <span className="fresh-flow-toolbar__label">{currentFlowDocument?.name || 'Select a folder'}</span>
        <button type="button" onClick={() => createNodeAtCenter('prompt')} disabled={!isReady}>Prompt</button>
        <button type="button" onClick={() => createNodeAtCenter('note')} disabled={!isReady}>Note</button>
        <button type="button" onClick={() => createNodeAtCenter('decision')} disabled={!isReady}>Decision</button>
        <button type="button" onClick={() => createNodeAtCenter('image-reference')} disabled={!isReady}>Image Ref</button>
        <button type="button" onClick={() => createNodeAtCenter('video-reference')} disabled={!isReady}>Video Ref</button>
        <button type="button" onClick={() => createNodeAtCenter('audio-reference')} disabled={!isReady}>Audio Ref</button>
        <button type="button" onClick={() => createNodeAtCenter('generation')} disabled={!isReady}>Generation</button>
        <button type="button" onClick={() => createNodeAtCenter('toorgen-generation')} disabled={!isReady}>Legacy Gen</button>
        <button type="button" onClick={() => createNodeAtCenter('group')} disabled={!isReady}>Group</button>
        <span className="fresh-flow-toolbar__divider" />
        <label className="fresh-flow-toolbar__inline-field">
          <span>Lines</span>
          <select value={edgeStyleMode} onChange={(event) => setEdgeStyleMode(event.target.value as 'curved' | 'straight')} disabled={!isReady}>
            <option value="curved">Curved</option>
            <option value="straight">Straight</option>
          </select>
        </label>
        <button type="button" onClick={handleZoomOut} disabled={!isReady}>-</button>
        <button type="button" onClick={handleZoomIn} disabled={!isReady}>+</button>
        <button type="button" onClick={handleResetView} disabled={!isReady}>Reset</button>
        <button type="button" onClick={deleteSelectedNodes} disabled={selectedNodeIds.length === 0}>Delete</button>
      </div>

      {!currentFlowDocument ? (
        <div className="fresh-flow-empty-state">
          <span className="fresh-flow-empty-state__kicker">FLOW</span>
          <h2>Select a folder to load Flow Studio</h2>
          <p>Flow documents are organized per project and folder. Pick a folder in Explorer, then create or select a flow from the Properties rail.</p>
        </div>
      ) : nodes.length === 0 ? (
        <div className="fresh-flow-empty-state">
          <span className="fresh-flow-empty-state__kicker">{currentFlowDocument.name.toUpperCase()}</span>
          <h2>Start with prompt, references, and a generation node</h2>
          <p>Use the toolbar to add nodes. Mouse wheel zooms. Hold the middle mouse button to pan. Double-click node titles to rename them.</p>
        </div>
      ) : null}

      {currentFlowDocument ? (
        <FreshFlowCanvasContext.Provider value={canvasContextValue}>
          <ReactFlow<FreshFlowNode, FreshFlowEdge>
            key={currentFlowDocument.id}
            nodes={nodes}
            edges={renderedEdges}
            nodeTypes={NODE_TYPES}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={handleConnect}
            onReconnect={handleReconnect}
            onReconnectEnd={handleReconnectEnd}
            isValidConnection={handleIsValidConnection}
            onSelectionChange={handleSelectionChange}
            onMoveEnd={handleMoveEnd}
            onNodeDragStop={handleNodeDragStop}
            edgesReconnectable
            nodesConnectable
            edgesFocusable={false}
            minZoom={0.25}
            maxZoom={2.1}
            connectionMode={ConnectionMode.Loose}
            zoomOnScroll
            panOnScroll={false}
            panOnDrag={[1]}
            selectionOnDrag={false}
            zoomOnDoubleClick={false}
            deleteKeyCode={null}
            fitView={false}
            defaultViewport={currentFlowDocument.viewport}
            connectionLineType={edgeStyleMode === 'straight' ? ConnectionLineType.Straight : ConnectionLineType.Bezier}
            onlyRenderVisibleElements
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Lines} gap={28} size={1} color="rgba(126, 154, 211, 0.12)" />
          </ReactFlow>
        </FreshFlowCanvasContext.Provider>
      ) : null}

      <div className="fresh-flow-hint">Mouse wheel zooms. Middle-button drag pans. Alt+click a handle disconnects it. Double-click a title to edit it.</div>
    </div>
  )
}

export function FreshFlowCanvas() {
  return <ReactFlowProvider><FreshFlowCanvasInner /></ReactFlowProvider>
}

export default FreshFlowCanvas
