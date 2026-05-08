import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { Image as ImageIcon } from 'lucide-react'
import { useWorkflowBuilderNode } from '../WorkflowBuilderCanvasContext'
import { WorkflowNodeFrame } from './WorkflowNodeFrame'
import type { WorkflowBuilderNodeProps } from '../types'

const INPUT_SOCKETS = [
  { id: 'first_frame', label: 'First Frame', slot: 1 },
  { id: 'last_frame', label: 'Last Frame', slot: 2 },
  { id: 'prompt', label: 'Prompt', slot: 3 },
] as const

const OUTPUT_SOCKETS = [{ id: 'out-video', label: 'Video', slot: 2 }] as const

export const GenImageToVideoNode = memo(function GenImageToVideoNode({ id, data, isConnectable }: WorkflowBuilderNodeProps) {
  const { patchNode, executeNode, isExecuting } = useWorkflowBuilderNode(id)
  const showProviderFallbackBadge = Boolean(data.generationStorageError && data.generatedSourceVideoUrl?.trim())
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

  const lastRunLabel = data.generateLastRunAt ? new Date(data.generateLastRunAt).toLocaleTimeString() : 'Never'

  return (
    <WorkflowNodeFrame
      nodeId={id}
      kind="gen_image_to_video"
      title={data.label || 'Image to Video'}
      description=""
      icon={ImageIcon}
      metaLine={`Engine: ${data.generateEngine || 'seedance'}`}
      required={data.required}
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
        {activeVideoSrc ? (
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
        ) : (
          <div className="workflow-builder-node__preview--video-placeholder">No video generated yet</div>
        )}
      </div>

      <div className="workflow-builder-node__actions">
        <button type="button" className="workflow-builder-node__primary-btn nodrag" onClick={() => { void handleGenerate() }} disabled={isExecuting}>
          {isExecuting ? 'Generating...' : 'Generate Video'}
        </button>
        <span className="workflow-builder-node__status workflow-builder-node__status--muted">Last run: {lastRunLabel}</span>
      </div>
    </WorkflowNodeFrame>
  )
})
