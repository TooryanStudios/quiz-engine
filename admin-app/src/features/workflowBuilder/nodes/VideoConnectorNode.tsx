import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { useEdges, useNodes } from '@xyflow/react'
import { Clapperboard } from 'lucide-react'
import { useWorkflowBuilderNode } from '../WorkflowBuilderCanvasContext'
import { WorkflowNodeFrame } from './WorkflowNodeFrame'
import type { WorkflowBuilderNode, WorkflowBuilderNodeProps, WorkflowBuilderNodeSocket } from '../types'

const MIN_VIDEO_INPUTS = 2
const OUTPUT_SOCKETS = [{ id: 'out-video', label: '', slot: 2, topPercent: 36 }] as const
const GENERATION_NODE_KINDS = new Set([
  'generate',
  'gen_text_to_video',
  'gen_image_to_video',
  'gen_video_to_video',
  'gen_images_to_video',
  'gen_image',
  'video_extend',
])

const normalizeUrl = (value: string | undefined) => (value || '').trim()

function arraysEqual(a: string[], b: string[]) {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false
  }
  return true
}

export const VideoConnectorNode = memo(function VideoConnectorNode({ id, data, isConnectable }: WorkflowBuilderNodeProps) {
  const edges = useEdges()
  const nodes = useNodes() as WorkflowBuilderNode[]
  const { patchNode } = useWorkflowBuilderNode(id)
  const [manualUrls, setManualUrls] = useState<string[]>(() => data.videoSequenceUrls || ['', ''])
  const [loopSequence, setLoopSequence] = useState(Boolean(data.videoConnectorLoop))
  const [activeIndex, setActiveIndex] = useState(0)
  const [activePlayer, setActivePlayer] = useState<0 | 1>(0)
  const videoRef0 = useRef<HTMLVideoElement | null>(null)
  const videoRef1 = useRef<HTMLVideoElement | null>(null)
  const pendingAutoPlayRef = useRef(false)

  useEffect(() => {
    const next = data.videoSequenceUrls || ['', '']
    setManualUrls(next.length >= MIN_VIDEO_INPUTS ? next : next.concat(Array.from({ length: MIN_VIDEO_INPUTS - next.length }, () => '')))
  }, [data.videoSequenceUrls])

  useEffect(() => {
    setLoopSequence(Boolean(data.videoConnectorLoop))
  }, [data.videoConnectorLoop])

  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes])
  const incomingByTarget = useMemo(() => {
    const map = new Map<string, Array<{ source: string; targetHandle: string | null | undefined }>>()
    edges.forEach((edge) => {
      const list = map.get(edge.target) || []
      list.push({ source: edge.source, targetHandle: edge.targetHandle })
      map.set(edge.target, list)
    })
    return map
  }, [edges])

  const resolveUrlsFromNode = useMemo(() => {
    const visit = (nodeId: string, seen: Set<string>): string[] => {
      if (seen.has(nodeId)) return []
      seen.add(nodeId)

      const sourceNode = nodeById.get(nodeId)
      if (!sourceNode) return []

      if (sourceNode.type === 'video_input') {
        const url = normalizeUrl(sourceNode.data.videoUrl)
        return url ? [url] : []
      }

      if (sourceNode.type === 'video_reference') {
        return (sourceNode.data.referenceItems || []).map((item) => normalizeUrl(item.url)).filter(Boolean)
      }

      if (sourceNode.type === 'video_connector') {
        return (sourceNode.data.videoConnectorResolvedUrls || sourceNode.data.videoSequenceUrls || [])
          .map((item) => normalizeUrl(item))
          .filter(Boolean)
      }

      if (GENERATION_NODE_KINDS.has(sourceNode.type || '')) {
        const url = normalizeUrl(sourceNode.data.generatedSourceVideoUrl || sourceNode.data.generatedVideoUrl)
        return url ? [url] : []
      }

      if (sourceNode.type === 'reroute') {
        const incoming = incomingByTarget.get(nodeId) || []
        return incoming.flatMap((edge) => visit(edge.source, seen)).filter(Boolean)
      }

      return []
    }

    return (nodeId: string) => visit(nodeId, new Set<string>())
  }, [incomingByTarget, nodeById])

  const incomingToThisNode = useMemo(() => incomingByTarget.get(id) || [], [id, incomingByTarget])

  const slotUrls = useMemo(() => {
    const connectedByHandle = new Map<string, string[]>()
    incomingToThisNode.forEach((edge) => {
      const handleId = edge.targetHandle || ''
      if (!handleId.startsWith('video-')) return
      const resolved = resolveUrlsFromNode(edge.source)
      if (!resolved.length) return
      const list = connectedByHandle.get(handleId) || []
      connectedByHandle.set(handleId, list.concat(resolved))
    })

    const maxHandleIndex = incomingToThisNode
      .map((edge) => edge.targetHandle || '')
      .filter((handleId) => handleId.startsWith('video-'))
      .map((handleId) => Number.parseInt(handleId.replace('video-', ''), 10))
      .filter((n) => Number.isFinite(n) && n > 0)
      .reduce((max, n) => Math.max(max, n), 0)

    const baseLength = Math.max(MIN_VIDEO_INPUTS, manualUrls.length, maxHandleIndex)
    const slots = Array.from({ length: baseLength }, (_, index) => {
      const slotNumber = index + 1
      const handleId = `video-${slotNumber}`
      const connectedUrls = (connectedByHandle.get(handleId) || []).map((item) => normalizeUrl(item)).filter(Boolean)
      const manualUrl = normalizeUrl(manualUrls[index])
      return {
        slotNumber,
        handleId,
        connectedUrls,
        effectiveUrl: connectedUrls[0] || manualUrl,
      }
    })

    if (slots.length > 0 && slots[slots.length - 1].effectiveUrl) {
      const slotNumber = slots.length + 1
      slots.push({
        slotNumber,
        handleId: `video-${slotNumber}`,
        connectedUrls: [],
        effectiveUrl: '',
      })
    }

    return slots
  }, [incomingToThisNode, manualUrls, resolveUrlsFromNode])

  const sequencedUrls = useMemo(() => slotUrls.map((slot) => slot.effectiveUrl).filter(Boolean), [slotUrls])
  const hasSequence = sequencedUrls.length > 0

  const getNextGlobalIndex = (current: number) => {
    if (sequencedUrls.length <= 1) return loopSequence ? 0 : -1;
    const next = current + 1;
    if (next < sequencedUrls.length) return next;
    return loopSequence ? 0 : -1;
  }

  const nextGlobalIndex = getNextGlobalIndex(activeIndex);

  const url0 = sequencedUrls.length > 0 
    ? (activePlayer === 0 ? sequencedUrls[activeIndex] : (nextGlobalIndex !== -1 ? sequencedUrls[nextGlobalIndex] : '')) 
    : ''

  const url1 = sequencedUrls.length > 0 
    ? (activePlayer === 1 ? sequencedUrls[activeIndex] : (nextGlobalIndex !== -1 ? sequencedUrls[nextGlobalIndex] : '')) 
    : ''

  useEffect(() => {
    const currentResolved = (data.videoConnectorResolvedUrls || []).map((item) => normalizeUrl(item)).filter(Boolean)
    if (!arraysEqual(sequencedUrls, currentResolved)) {
      patchNode({ videoConnectorResolvedUrls: sequencedUrls })
    }
  }, [data.videoConnectorResolvedUrls, patchNode, sequencedUrls])

  useEffect(() => {
    if (activeIndex <= Math.max(0, sequencedUrls.length - 1)) return
    setActiveIndex(0)
  }, [activeIndex, sequencedUrls.length])

  useEffect(() => {
    const player = activePlayer === 0 ? videoRef0.current : videoRef1.current
    if (!player || !pendingAutoPlayRef.current || !sequencedUrls[activeIndex]) return

    const tryPlay = () => {
      void player.play().catch(() => {})
      pendingAutoPlayRef.current = false
    }

    if (player.readyState >= 3) {
      tryPlay()
      return
    }

    const handleCanPlay = () => tryPlay()
    player.addEventListener('canplay', handleCanPlay, { once: true })
    return () => {
      player.removeEventListener('canplay', handleCanPlay)
    }
  }, [activePlayer, activeIndex, sequencedUrls])

  const inputSockets: WorkflowBuilderNodeSocket[] = useMemo(() => {
    const total = Math.max(1, slotUrls.length)
    return slotUrls.map((slot, index) => ({
      id: slot.handleId,
      label: '',
      slot: index + 1,
      topPercent: 16 + ((index + 1) * 72) / (total + 1),
    }))
  }, [slotUrls])

  const onPlaySequence = () => {
    if (!sequencedUrls.length) return
    pendingAutoPlayRef.current = true
    setActiveIndex(0)
    setActivePlayer(0)
    const player = videoRef0.current
    if (player) {
      player.currentTime = 0
      void player.play().catch(() => {})
    }
  }

  const onVideoEnded = (playerIndex: 0 | 1) => {
    if (playerIndex !== activePlayer) return
    
    if (sequencedUrls.length <= 1) {
      if (loopSequence && sequencedUrls.length === 1) {
        pendingAutoPlayRef.current = true
        const player = activePlayer === 0 ? videoRef0.current : videoRef1.current
        if (player) {
          player.currentTime = 0
          void player.play().catch(() => {})
        }
      }
      return
    }

    const nextIndex = getNextGlobalIndex(activeIndex);
    if (nextIndex !== -1) {
      const nextPlayer = activePlayer === 0 ? 1 : 0
      const nextRef = nextPlayer === 0 ? videoRef0.current : videoRef1.current
      
      if (nextRef) {
        nextRef.currentTime = 0
        void nextRef.play().catch(() => {})
      }
      
      setActiveIndex(nextIndex)
      setActivePlayer(nextPlayer)
    }
  }

  return (
    <WorkflowNodeFrame
      nodeId={id}
      kind="video_connector"
      title={hasSequence ? '' : (data.label || 'Video Connector')}
      description=""
      icon={Clapperboard}
      metaLine={hasSequence ? undefined : 'Connect videos to build sequence'}
      isConnectable={isConnectable}
      inputSockets={inputSockets}
      outputSockets={OUTPUT_SOCKETS}
      initialCollapsed={data.collapsed}
      hideHeader={hasSequence}
      hideSocketLabels
      fullBleed={hasSequence}
    >
      <div className={`workflow-builder-video-connector__body${hasSequence ? ' is-sequence' : ''}`}>
        {hasSequence ? (
          <div className="workflow-builder-video-connector__viewport">
            <video
              ref={videoRef0}
              src={url0}
              controls={activePlayer === 0}
              playsInline
              preload="auto"
              muted={activePlayer !== 0}
              onEnded={() => onVideoEnded(0)}
              className={`workflow-builder-video-connector__video ${activePlayer === 0 ? 'is-active' : 'is-inactive'}`}
            />
            <video
              ref={videoRef1}
              src={url1}
              controls={activePlayer === 1}
              playsInline
              preload="auto"
              muted={activePlayer !== 1}
              onEnded={() => onVideoEnded(1)}
              className={`workflow-builder-video-connector__video ${activePlayer === 1 ? 'is-active' : 'is-inactive'}`}
            />
            <div className="workflow-builder-video-connector__controls">
              <button
                type="button"
                className="nodrag workflow-builder-video-connector__play-btn"
                onClick={onPlaySequence}
              >
                Play Sequence
              </button>
              <label className="workflow-builder-video-connector__loop-toggle">
                <input
                  className="nodrag"
                  type="checkbox"
                  checked={loopSequence}
                  onChange={(event) => {
                    const checked = event.target.checked
                    setLoopSequence(checked)
                    patchNode({ videoConnectorLoop: checked })
                  }}
                />
                Loop
              </label>
            </div>
          </div>
        ) : (
          <>
            <div className="workflow-builder-video-connector__toolbar">
              <button
                type="button"
                className="nodrag workflow-builder-video-connector__play-btn workflow-builder-video-connector__play-btn--inline"
                onClick={onPlaySequence}
                disabled={!sequencedUrls.length}
              >
                Play Sequence
              </button>

              <label className="workflow-builder-video-connector__loop-toggle workflow-builder-video-connector__loop-toggle--inline">
                <input
                  className="nodrag"
                  type="checkbox"
                  checked={loopSequence}
                  onChange={(event) => {
                    const checked = event.target.checked
                    setLoopSequence(checked)
                    patchNode({ videoConnectorLoop: checked })
                  }}
                />
                Loop
              </label>
            </div>

            <div className="workflow-builder-node__preview--video workflow-builder-video-connector__preview">
              <div className="workflow-builder-node__preview--video-placeholder">No videos in sequence</div>
            </div>

            <div className="workflow-builder-video-connector__manual-list">
              {slotUrls.map((slot, index) => {
                const isConnected = slot.connectedUrls.length > 0
                return (
                  <div key={slot.handleId} className="workflow-builder-video-connector__manual-row">
                    <input
                      type="text"
                      placeholder={`Video ${slot.slotNumber} URL`}
                      value={isConnected ? slot.connectedUrls[0] : (manualUrls[index] || '')}
                      onChange={(event) => {
                        if (isConnected) return
                        const next = manualUrls.slice()
                        next[index] = event.target.value
                        setManualUrls(next)
                        patchNode({ videoSequenceUrls: next })
                      }}
                      disabled={isConnected}
                      className={`nodrag workflow-builder-video-connector__manual-input${isConnected ? ' is-connected' : ''}`}
                    />
                    <span className={`workflow-builder-video-connector__manual-state${isConnected ? ' is-connected' : ''}`}>
                      {isConnected ? 'LINK' : 'URL'}
                    </span>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
    </WorkflowNodeFrame>
  )
})
