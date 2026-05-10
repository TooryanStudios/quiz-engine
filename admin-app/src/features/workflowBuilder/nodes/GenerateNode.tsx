import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Handle, Position, useEdges, useReactFlow } from '@xyflow/react'
import { CheckCircle, Clock, Copy, ExternalLink, Film, Loader, Sparkles, XCircle } from 'lucide-react'
import { useWorkflowBuilderNode } from '../WorkflowBuilderCanvasContext'
import { WorkflowNodeFrame } from './WorkflowNodeFrame'
import { PromptRefineButton } from './PromptRefineButton'
import type { WorkflowBuilderNodeProps } from '../types'

const INPUT_SOCKETS = [
  { id: 'prompt', label: 'Prompt', slot: 1 },
  { id: 'video', label: 'Video', slot: 2 },
  { id: 'reference', label: 'Reference', slot: 3 },
  { id: 'rules', label: 'Rules', slot: 4 },
] as const

const OUTPUT_SOCKETS = [{ id: 'result', label: 'Result', slot: 2 }] as const

type QueueItem = {
  id: string
  status: 'queued' | 'running' | 'done' | 'error'
  videoUrl?: string
  firebaseVideoUrl?: string
  sourceVideoUrl?: string
  statusText?: string
  prompt?: string
  errorMessage?: string
  timestamp?: number
  genModel?: string
  genDuration?: number
}

type ThumbItem = {
  id: string
  src: string
  status: QueueItem['status']
  title: string
}

function useGenerateNode(nodeId: string, data: WorkflowBuilderNodeProps['data']) {
  const { patchNode, executeQueueItem, isExecuting } = useWorkflowBuilderNode(nodeId)

  const handleGenerate = useCallback(async () => {
    patchNode({ generateLastRunAt: new Date().toISOString() })
    const newId = `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    
    // Build the new queue item from current node data
    const newItem = {
      id: newId,
      status: 'queued',
      prompt: (data.promptText as string) || '',
      genModel: (data.genModel as string) || 'seedance-2.0-fast',
      genRatio: (data.genRatio as string) || '16:9',
      genDuration: (data.genDuration as number) || 5,
      genResolution: (data.genResolution as string) || '720p',
      genAudio: data.genAudio !== false,
      timestamp: Date.now()
    }
    
    const currentQueue = Array.isArray(data.genQueue) ? data.genQueue : []
    patchNode({ genQueue: [...currentQueue, newItem] })
    
    // Pass item data directly — don't rely on React state having flushed yet
    await executeQueueItem(newItem)
  }, [executeQueueItem, patchNode, data])

  return {
    isExecuting,
    lastRunLabel: data.generateLastRunAt ? new Date(data.generateLastRunAt).toLocaleTimeString() : 'Never',
    handleGenerate,
    setPrompt: (value: string) => patchNode({ promptText: value }),
    setModel: (value: string) => patchNode({ genModel: value }),
    setRatio: (value: string) => patchNode({ genRatio: value }),
    setDuration: (value: number) => patchNode({ genDuration: value }),
    setResolution: (value: string) => patchNode({ genResolution: value }),
    setAudio: (value: boolean) => patchNode({ genAudio: value }),
    setInputMode: (value: 'reference' | 'image') => patchNode({ genInputMode: value }),
    setExtendMode: (value: 'before' | 'after') => patchNode({ extendMode: value }),
    setTopHeight: (value: number) => patchNode({ genTopHeight: value }),
  }
}

function QueueThumbStatus({ status }: { status: QueueItem['status'] }) {
  if (status === 'running') {
    return <span className="workflow-builder-node__queue-thumb-status workflow-builder-node__queue-thumb-status--running"><Loader className="wf-spin" size={10} /></span>
  }
  if (status === 'done') {
    return <span className="workflow-builder-node__queue-thumb-status workflow-builder-node__queue-thumb-status--done"><CheckCircle size={10} /></span>
  }
  if (status === 'error') {
    return <span className="workflow-builder-node__queue-thumb-status workflow-builder-node__queue-thumb-status--error"><XCircle size={10} /></span>
  }
  return <span className="workflow-builder-node__queue-thumb-status workflow-builder-node__queue-thumb-status--queued"><Clock className="wf-pulse" size={10} /></span>
}

function GenerationListItem({ item, isActive, onClick, isConnectable }: { item: QueueItem; isActive: boolean; onClick: () => void; isConnectable: boolean }) {
  const time = item.timestamp ? new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'
  const rawVideoSrc = item.videoUrl || item.firebaseVideoUrl || item.sourceVideoUrl || ''
  // Append a media fragment so browsers paint the first frame as a thumbnail
  // even when only metadata is preloaded (Firebase Storage URLs already include a query string).
  const videoSrc = rawVideoSrc
    ? `${rawVideoSrc}${rawVideoSrc.includes('#') ? '' : '#t=0.1'}`
    : ''
  const label = item.prompt ? (item.prompt.length > 60 ? item.prompt.slice(0, 60) + '…' : item.prompt) : `Run at ${time}`
  const meta = [item.genModel, item.genDuration ? `${item.genDuration}s` : null].filter(Boolean).join(' · ')

  // Prefer permanent Firebase URL, fall back to provider URL
  const displayUrl = item.firebaseVideoUrl || item.videoUrl || item.sourceVideoUrl || ''
  const shortUrl = displayUrl ? (() => {
    try { const u = new URL(displayUrl); return u.hostname + u.pathname.slice(u.pathname.lastIndexOf('/')) } catch { return displayUrl.slice(-48) }
  })() : ''

  const handleCopy = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    if (displayUrl) navigator.clipboard.writeText(displayUrl).catch(() => {})
  }, [displayUrl])

  return (
    <div
      className={`wf-gen-list-item nodrag${isActive ? ' wf-gen-list-item--active' : ''}`}
      onClick={onClick}
    >
      <div className="wf-gen-list-item__thumb">
        {videoSrc ? (
          <video src={videoSrc} muted playsInline preload="metadata" className="wf-gen-list-item__thumb-video" />
        ) : item.status === 'error' ? (
          <div className="wf-gen-list-item__thumb-placeholder wf-gen-list-item__thumb-placeholder--error"><XCircle size={18} /></div>
        ) : (
          <div className="wf-gen-list-item__thumb-placeholder">
            {item.status === 'running' ? <Loader className="wf-spin" size={18} /> : <Clock className="wf-pulse" size={18} />}
          </div>
        )}
      </div>
      <div className="wf-gen-list-item__info">
        <span className="wf-gen-list-item__label">{label}</span>
        <span className="wf-gen-list-item__meta">{time}{meta ? ` · ${meta}` : ''}</span>
        {displayUrl ? (
          <span className="wf-gen-list-item__url" title={displayUrl}>{shortUrl}</span>
        ) : (item.status === 'running' || item.status === 'queued') ? (
          <span className="wf-gen-list-item__progress">{item.statusText || (item.status === 'running' ? 'Generating…' : 'Queued')}</span>
        ) : null}
        {item.status === 'error' && <span className="wf-gen-list-item__error">{item.errorMessage || 'Failed'}</span>}
      </div>
      <div className="wf-gen-list-item__actions">
        {displayUrl && (
          <>
            <span role="button" tabIndex={0} className="wf-gen-list-item__action-btn nodrag" onClick={handleCopy} title="Copy URL"><Copy size={11} /></span>
            <a href={displayUrl} target="_blank" rel="noopener noreferrer" className="wf-gen-list-item__action-btn nodrag" onClick={(e) => e.stopPropagation()} title="Open in new tab"><ExternalLink size={11} /></a>
          </>
        )}
        <div className="wf-gen-list-item__badge">
          {item.status === 'done' && <CheckCircle size={14} className="wf-gen-list-item__badge--done" />}
          {item.status === 'error' && <XCircle size={14} className="wf-gen-list-item__badge--error" />}
          {item.status === 'running' && !displayUrl && <Loader size={14} className="wf-spin wf-gen-list-item__badge--running" />}
          {item.status === 'queued' && !displayUrl && <Clock size={14} className="wf-pulse wf-gen-list-item__badge--queued" />}
        </div>
      </div>
      {displayUrl ? (
        <Handle
          id={`video-history-${item.id}`}
          type="source"
          position={Position.Right}
          isConnectable={isConnectable}
          className="workflow-builder-node__handle workflow-builder-node__handle--output wf-gen-list-item__handle"
        >
          <Film size={30} />
        </Handle>
      ) : (
        <Handle
          id={`video-history-${item.id}`}
          type="source"
          position={Position.Right}
          isConnectable={false}
          className="workflow-builder-node__handle workflow-builder-node__handle--output wf-gen-list-item__handle wf-gen-list-item__handle--inactive"
        >
          <Film size={30} />
        </Handle>
      )}
    </div>
  )
}

export const GenerateNode = memo(function GenerateNode({ id, data, isConnectable }: WorkflowBuilderNodeProps) {
  const state = useGenerateNode(id, data)
  const extendMode = data.extendMode as 'before' | 'after' | undefined
  const isExtendNode = extendMode !== undefined
  const edges = useEdges()
  const { deleteElements, setEdges } = useReactFlow()
  const promptConnections = useMemo(
    () => edges.filter((edge) => edge.target === id && edge.targetHandle === 'prompt'),
    [edges, id],
  )
  const isPromptSocketConnected = promptConnections.length > 0
  const isPromptConnectionFlagSet = Boolean(data.isPromptSocketConnected)

  const [localPrompt, setLocalPrompt] = useState((data.promptText as string | undefined) || '')

  useEffect(() => {
    setLocalPrompt((data.promptText as string | undefined) || '')
  }, [data.promptText])

  const genQueue = useMemo(
    () => (Array.isArray(data.genQueue) ? (data.genQueue as unknown[]).map((q) => q as QueueItem) : []),
    [data.genQueue],
  )

  const legacyVideoSources = useMemo(() => {
    const unique = new Set<string>()
    ;[
      data.generatedVideoUrl?.trim() || '',
      data.generatedFirebaseVideoUrl?.trim() || '',
      data.generatedSourceVideoUrl?.trim() || '',
    ].filter(Boolean).forEach((url) => unique.add(url))
    return Array.from(unique)
  }, [data.generatedFirebaseVideoUrl, data.generatedSourceVideoUrl, data.generatedVideoUrl])

  const latestDoneItem = useMemo(() => {
    const done = genQueue.filter((q) => q.status === 'done' && (q.videoUrl || q.firebaseVideoUrl || q.sourceVideoUrl))
    return done[done.length - 1] ?? null
  }, [genQueue])

  const defaultVideoSrc = useMemo(() => {
    // If the latest item in the queue has a source, use it
    const lastItem = genQueue[genQueue.length - 1]
    if (lastItem && (lastItem.videoUrl || lastItem.firebaseVideoUrl || lastItem.sourceVideoUrl)) {
      return lastItem.videoUrl || lastItem.firebaseVideoUrl || lastItem.sourceVideoUrl || ''
    }
    if (latestDoneItem) {
      return latestDoneItem.videoUrl || latestDoneItem.firebaseVideoUrl || latestDoneItem.sourceVideoUrl || ''
    }
    return legacyVideoSources[0] || ''
  }, [genQueue, latestDoneItem, legacyVideoSources])

  const thumbnailItems = useMemo<ThumbItem[]>(() => {
    const fromQueue: ThumbItem[] = genQueue
      .map((item) => {
        const src = item.videoUrl || item.firebaseVideoUrl || item.sourceVideoUrl || ''
        return {
          id: item.id,
          src,
          status: item.status,
          title: item.statusText || item.prompt || item.status,
        }
      })
      .filter((item) => {
        if (item.status === 'queued' || item.status === 'running' || item.status === 'error') return true
        if (!item.src) return false
        return true
      })

    if (fromQueue.length > 0) {
      return fromQueue
    }

    return defaultVideoSrc
      ? [{
          id: 'legacy-current',
          src: defaultVideoSrc,
          status: 'done' as const,
          title: 'Generated video',
        }]
      : []
  }, [defaultVideoSrc, genQueue])

  const latestQueueItem = useMemo(() => {
    return genQueue[genQueue.length - 1] ?? null
  }, [genQueue])

  const defaultActiveQueueId = useMemo(() => {
    if (latestQueueItem?.id) {
      return latestQueueItem.id
    }
    return thumbnailItems[0]?.id ?? null
  }, [latestQueueItem, thumbnailItems])

  const [activeQueueId, setActiveQueueId] = useState<string | null>(defaultActiveQueueId)

  const activeThumbStatus = useMemo(() => {
    return thumbnailItems.find((t) => t.id === activeQueueId)?.status
  }, [thumbnailItems, activeQueueId])

  const activeThumbError = useMemo(() => {
    const qItem = genQueue.find((q) => q.id === activeQueueId)
    return qItem?.errorMessage || qItem?.statusText || null
  }, [genQueue, activeQueueId])

  const isActivelyGenerating = useMemo(() => {
    return genQueue.some(q => q.status === 'queued' || q.status === 'running')
  }, [genQueue])

  // Derive the active video source — check thumbnailItems first, then fall back to direct genQueue lookup
  // (handles items stuck as 'queued'/'running' after a page reload that still have a stored videoUrl)
  const activeVideoSrc = useMemo(() => {
    const activeItem = thumbnailItems.find((t) => t.id === activeQueueId)
    if (activeItem?.src) return activeItem.src
    const queueItem = genQueue.find((q) => q.id === activeQueueId)
    if (queueItem) {
      const src = queueItem.videoUrl || queueItem.firebaseVideoUrl || queueItem.sourceVideoUrl
      if (src) return src
    }
    return defaultVideoSrc
  }, [thumbnailItems, activeQueueId, defaultVideoSrc, genQueue])

  useEffect(() => {
    setActiveQueueId(defaultActiveQueueId)
  }, [defaultActiveQueueId])

  const handleThumbClick = useCallback((item: ThumbItem) => {
    setActiveQueueId(item.id)
  }, [])

  const hasGeneratedVideo = Boolean(activeVideoSrc)
  const showProviderFallbackBadge = Boolean(data.generationStorageError && data.generatedSourceVideoUrl?.trim())

  const genModel = (data.genModel as string | undefined) || 'seedance-2.0-fast'
  const genRatio = (data.genRatio as string | undefined) || '16:9'
  const genDuration = (data.genDuration as number | undefined) ?? 5
  const genResolution = (data.genResolution as string | undefined) || '720p'
  const genAudio = data.genAudio !== false
  const genInputMode = (data.genInputMode as 'reference' | 'image' | undefined) || 'reference'

  // Resizable top section (prompt + video preview). Drag the divider to adjust.
  const persistedTopHeight = (data.genTopHeight as number | undefined)
  const [topHeight, setTopHeight] = useState<number>(persistedTopHeight ?? 360)
  useEffect(() => {
    if (typeof persistedTopHeight === 'number') setTopHeight(persistedTopHeight)
  }, [persistedTopHeight])
  const dragRef = useRef<{ startY: number; startHeight: number } | null>(null)
  const handleDividerPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.stopPropagation()
    e.preventDefault()
    const target = e.currentTarget
    target.setPointerCapture(e.pointerId)
    dragRef.current = { startY: e.clientY, startHeight: topHeight }
  }, [topHeight])
  const handleDividerPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return
    const next = Math.max(180, Math.min(900, dragRef.current.startHeight + (e.clientY - dragRef.current.startY)))
    setTopHeight(next)
  }, [])
  const handleDividerPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return
    e.currentTarget.releasePointerCapture(e.pointerId)
    dragRef.current = null
    state.setTopHeight(topHeight)
  }, [state, topHeight])

  return (
    <WorkflowNodeFrame
      nodeId={id}
      kind="generate"
      title={data.label || 'Generate Visuals'}
      description=""
      icon={Sparkles}
      metaLine={`${genModel} · ${genInputMode === 'reference' ? 'Ref→Video' : 'Img→Video'}`}
      required={data.required}
      isConnectable={isConnectable}
      inputSockets={INPUT_SOCKETS}
      outputSockets={OUTPUT_SOCKETS}
      bodyClassName="workflow-builder-node__body--generate"
      className={isActivelyGenerating ? 'workflow-builder-node--generating' : ''}
      initialCollapsed={data.collapsed}
    >
      {isExtendNode && (
        <div className="workflow-builder-node__extend-mode-row nodrag">
          {(['before', 'after'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              className={`workflow-builder-node__extend-mode-btn nodrag${extendMode === mode ? ' workflow-builder-node__extend-mode-btn--active' : ''}`}
              onClick={() => state.setExtendMode(mode)}
            >
              Extend {mode === 'before' ? 'Before' : 'After'}
            </button>
          ))}
        </div>
      )}

      <div
        className="workflow-builder-node__gen-cols"
        style={{ height: `${topHeight}px`, minHeight: `${topHeight}px` }}
      >
        <div className="workflow-builder-node__gen-col">
          <div className="workflow-builder-node__prompt-status-container" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <div 
              className="nodrag"
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: isPromptSocketConnected ? '#4ade80' : '#f87171',
                boxShadow: isPromptSocketConnected ? '0 0 4px #4ade80' : '0 0 4px #f87171'
              }}
              title={isPromptSocketConnected ? `Connected to: ${promptConnections.map(e => e.source).join(', ')}` : 'Not connected'}
            />
            {promptConnections.length > 0 && (
              <button
                type="button"
                className="nodrag"
                style={{ fontSize: '9px', padding: '1px 4px', cursor: 'pointer', borderRadius: '3px', border: '1px solid #770000', background: '#220000', color: '#ffaaaa' }}
                onClick={() => {
                  deleteElements({ edges: promptConnections })
                  setEdges((eds) => eds.filter(e => !(e.target === id && e.targetHandle === 'prompt')))
                }}
              >
                Clear
              </button>
            )}
            <div style={{ marginLeft: 'auto' }}>
              <PromptRefineButton
                prompt={localPrompt}
                disabled={isPromptSocketConnected}
                onApply={(refined) => {
                  setLocalPrompt(refined)
                  state.setPrompt(refined)
                }}
              />
            </div>
          </div>
          <textarea
            className="workflow-builder-node__prompt-input nodrag"
            placeholder={isPromptSocketConnected ? "Prompt is driven by connected node." : "Describe your scene, movement, camera, and style..."}
            value={localPrompt}
            onChange={(event) => setLocalPrompt(event.target.value)}
            onBlur={() => state.setPrompt(localPrompt)}
            disabled={isPromptSocketConnected}
          />
        </div>

        <div className="workflow-builder-node__gen-col workflow-builder-node__gen-col--video">
          <div className="workflow-builder-node__preview--video">
            {showProviderFallbackBadge ? (
              <div className="workflow-builder-node__status-badge">Provider Link Active</div>
            ) : null}
            {activeThumbStatus === 'error' ? (
              <div className="workflow-builder-node__preview--video-placeholder" style={{ color: '#f87171' }}>
                <XCircle size={48} style={{ marginBottom: '16px', opacity: 0.8 }} />
                <span style={{ fontSize: '1.1rem', textAlign: 'center', padding: '0 1rem' }}>{activeThumbError || 'Generation failed'}</span>
              </div>
            ) : activeThumbStatus === 'running' || activeThumbStatus === 'queued' ? (
              <div className="workflow-builder-node__preview--video-placeholder" style={{ color: '#10b981' }}>
                <Loader className="wf-spin" size={64} style={{ marginBottom: '16px' }} />
                <span style={{ fontSize: '1.4rem', fontWeight: 600 }}>{activeThumbStatus === 'running' ? 'Generating Video...' : 'Queued...'}</span>
              </div>
            ) : hasGeneratedVideo ? (
              <video
                key={activeVideoSrc}
                src={activeVideoSrc}
                controls
                playsInline
                preload="metadata"
              />
            ) : (
              <div className="workflow-builder-node__preview--video-placeholder">No video generated yet</div>
            )}
          </div>
        </div>
      </div>

      <div
        className="workflow-builder-node__gen-divider nodrag"
        onPointerDown={handleDividerPointerDown}
        onPointerMove={handleDividerPointerMove}
        onPointerUp={handleDividerPointerUp}
        onPointerCancel={handleDividerPointerUp}
        title="Drag to resize the top section"
        role="separator"
        aria-orientation="horizontal"
      >
        <span className="workflow-builder-node__gen-divider-grip" />
      </div>

      {genQueue.length > 0 && (
        <div className="wf-gen-list nodrag">
          <div className="wf-gen-list__header">
            <span>Generation History</span>
            <span className="wf-gen-list__count">{genQueue.length}</span>
          </div>
          <div className="wf-gen-list__items">
            {[...genQueue].reverse().map((item) => (
              <GenerationListItem
                key={item.id}
                item={item}
                isActive={item.id === activeQueueId}
                isConnectable={isConnectable}
                onClick={() => handleThumbClick({ id: item.id, src: item.videoUrl || item.firebaseVideoUrl || item.sourceVideoUrl || '', status: item.status, title: item.statusText || item.prompt || item.status })}
              />
            ))}
          </div>
        </div>
      )}

      <div className="workflow-builder-node__settings">
        <label className="workflow-builder-node__setting">
          <span>Model</span>
          <div className="workflow-builder-node__setting-model-row">
            <select className="nodrag" value={genModel} onChange={(e) => state.setModel(e.target.value)}>
              <option value="seedance-2.0-fast">Seedance 2.0 Fast</option>
              <option value="seedance-2.0">Seedance 2.0</option>
              <option value="seedance-1.5-i2v">Seedance 1.5</option>
            </select>
            <select className="nodrag workflow-builder-node__setting-input-mode" value={genInputMode} onChange={(e) => state.setInputMode(e.target.value as 'reference' | 'image')}>
              <option value="reference">Ref - Video</option>
              <option value="image">Img - Video</option>
            </select>
          </div>
        </label>

        <label className="workflow-builder-node__setting">
          <span>Ratio</span>
          <select className="nodrag" value={genRatio} onChange={(e) => state.setRatio(e.target.value)}>
            <option value="16:9">16:9</option>
            <option value="9:16">9:16</option>
            <option value="1:1">1:1</option>
            <option value="4:3">4:3</option>
            <option value="3:4">3:4</option>
          </select>
        </label>

        <label className="workflow-builder-node__setting">
          <span>Duration</span>
          <select className="nodrag" value={genDuration} onChange={(e) => state.setDuration(Number(e.target.value))}>
            <option value={5}>5s</option>
            <option value={10}>10s</option>
            <option value={15}>15s</option>
          </select>
        </label>

        <label className="workflow-builder-node__setting">
          <span>Resolution</span>
          <select className="nodrag" value={genResolution} onChange={(e) => state.setResolution(e.target.value)}>
            <option value="480p">480p</option>
            <option value="720p">720p</option>
            <option value="1080p">1080p</option>
          </select>
        </label>

        <label className="workflow-builder-node__setting workflow-builder-node__setting--inline">
          <span>Audio</span>
          <input type="checkbox" className="nodrag" checked={genAudio} onChange={(e) => state.setAudio(e.target.checked)} />
        </label>
      </div>

      <div className="workflow-builder-node__actions">
        <button
          type="button"
          className="workflow-builder-node__primary-btn nodrag"
          onClick={() => { void state.handleGenerate() }}
        >
          {isExtendNode ? `Extend ${extendMode === 'before' ? 'Before' : 'After'}` : 'Generate'}
        </button>
        <span className="workflow-builder-node__status workflow-builder-node__status--muted">
          {data.generationStatus?.trim() || `Last run: ${state.lastRunLabel}`}
        </span>
      </div>
    </WorkflowNodeFrame>
  )
})
