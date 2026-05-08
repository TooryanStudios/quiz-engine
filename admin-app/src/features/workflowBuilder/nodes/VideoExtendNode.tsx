import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { FileVideo } from 'lucide-react'
import { useWorkflowBuilderNode } from '../WorkflowBuilderCanvasContext'
import { WorkflowNodeFrame } from './WorkflowNodeFrame'
import type { WorkflowBuilderNodeProps } from '../types'

const INPUT_SOCKETS = [
  { id: 'prompt', label: 'Prompt', slot: 1 },
  { id: 'video', label: 'Video', slot: 2 },
  { id: 'reference', label: 'Reference', slot: 3 },
  { id: 'rules', label: 'Rules', slot: 4 },
] as const

const OUTPUT_SOCKETS = [{ id: 'result', label: 'Result', slot: 2 }] as const

export const VideoExtendNode = memo(function VideoExtendNode({ id, data, isConnectable }: WorkflowBuilderNodeProps) {
  const { patchNode, executeNode, isExecuting, isInViewport } = useWorkflowBuilderNode(id)
  const extendMode = data.extendMode ?? 'after'

  const videoSources = useMemo(
    () => [
      data.generatedVideoUrl?.trim() || '',
      data.generatedFirebaseVideoUrl?.trim() || '',
      data.generatedSourceVideoUrl?.trim() || '',
    ].filter(Boolean),
    [data.generatedFirebaseVideoUrl, data.generatedSourceVideoUrl, data.generatedVideoUrl],
  )
  const [activeVideoSrc, setActiveVideoSrc] = useState(videoSources[0] || '')

  useEffect(() => {
    setActiveVideoSrc(videoSources[0] || '')
  }, [videoSources])

  const handleGenerate = useCallback(async () => {
    patchNode({ generateLastRunAt: new Date().toISOString() })
    await executeNode()
  }, [executeNode, patchNode])

  const setEngine = (value: WorkflowBuilderNodeProps['data']['generateEngine']) => patchNode({ generateEngine: value })
  const setQuality = (value: WorkflowBuilderNodeProps['data']['generateQuality']) => patchNode({ generateQuality: value })
  const setTarget = (value: WorkflowBuilderNodeProps['data']['generateTarget']) => patchNode({ generateTarget: value })

  const lastRunLabel = data.generateLastRunAt ? new Date(data.generateLastRunAt).toLocaleTimeString() : 'Never'

  const hasGeneratedVideo = Boolean(activeVideoSrc)
  const showProviderFallbackBadge = Boolean(data.generationStorageError && data.generatedSourceVideoUrl?.trim())

  return (
    <WorkflowNodeFrame
      nodeId={id}
      kind="video_extend"
      title={data.label || 'Video Extend'}
      description=""
      icon={FileVideo}
      isConnectable={isConnectable}
      inputSockets={INPUT_SOCKETS}
      outputSockets={OUTPUT_SOCKETS}
      bodyClassName="workflow-builder-node__body--generate"
      initialCollapsed={data.collapsed}
    >
      <div className="workflow-builder-node__preview--video">
        {showProviderFallbackBadge ? (
          <div className="workflow-builder-node__status-badge">Provider Link Active</div>
        ) : null}
        {hasGeneratedVideo && isInViewport ? (
          <video
            src={activeVideoSrc}
            controls
            playsInline
            preload="metadata"
            onError={() => {
              const nextSource = videoSources.find((source) => source && source !== activeVideoSrc) || ''
              if (nextSource) {
                setActiveVideoSrc(nextSource)
              }
            }}
          />
        ) : hasGeneratedVideo ? (
          <div className="workflow-builder-node__preview--video-placeholder">Preview paused while offscreen</div>
        ) : (
           <div className="workflow-builder-node__preview--video-placeholder">No video generated yet</div>
        )}
      </div>

      <div className="workflow-builder-node__settings" style={{ flexDirection: 'row', display: 'flex', gap: '8px', padding: '12px' }}>
        {(['before', 'after'] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            className={`workflow-builder-node__tab-btn nodrag${extendMode === mode ? ' workflow-builder-node__tab-btn--active' : ''}`}
            onClick={() => patchNode({ extendMode: mode })}
            style={{
              flex: 1,
              padding: '6px',
              borderRadius: '6px',
              border: '1px solid #cbd5e1',
              background: extendMode === mode ? '#e2e8f0' : 'transparent',
              fontWeight: extendMode === mode ? 'bold' : 'normal',
              cursor: 'pointer',
            }}
          >
            Extend {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        ))}
      </div>

      <div className="workflow-builder-node__settings">
        <label className="workflow-builder-node__setting">
          <span>Engine</span>
          <select className="nodrag" value={data.generateEngine || 'internal'} onChange={(event) => setEngine(event.target.value as WorkflowBuilderNodeProps['data']['generateEngine'])}>
            <option value="internal">Internal</option>
            <option value="openai">OpenAI</option>
            <option value="seedance">Seedance</option>
          </select>
        </label>
        <label className="workflow-builder-node__setting">
          <span>Quality</span>
          <select className="nodrag" value={data.generateQuality || 'balanced'} onChange={(event) => setQuality(event.target.value as WorkflowBuilderNodeProps['data']['generateQuality'])}>
            <option value="draft">Draft</option>
            <option value="balanced">Balanced</option>
            <option value="high">High</option>
          </select>
        </label>
        <label className="workflow-builder-node__setting">
          <span>Target</span>
          <select className="nodrag" value={data.generateTarget || 'video'} onChange={(event) => setTarget(event.target.value as WorkflowBuilderNodeProps['data']['generateTarget'])}>
            <option value="image">Image</option>
            <option value="video">Video</option>
            <option value="document">Document</option>
          </select>
        </label>
      </div>

      <div className="workflow-builder-node__actions">
        <button type="button" className="workflow-builder-node__primary-btn nodrag" onClick={() => { void handleGenerate() }} disabled={isExecuting}>
          {isExecuting ? 'Generating...' : `Extend ${extendMode === 'before' ? 'Before' : 'After'}`}
        </button>
        <span className="workflow-builder-node__status workflow-builder-node__status--muted">
          {data.generationStatus?.trim() || `Last run: ${lastRunLabel}`}
        </span>
      </div>
    </WorkflowNodeFrame>
  )
})

