import { memo, useState, useEffect } from 'react'
import { Video } from 'lucide-react'
import { WorkflowNodeFrame } from './WorkflowNodeFrame'
import { useWorkflowBuilderNode } from '../WorkflowBuilderCanvasContext'
import type { WorkflowBuilderNodeProps } from '../types'

const OUTPUT_SOCKETS = [{ id: 'out-video', label: 'Video', slot: 1 }] as const

export const VideoInputNode = memo(function VideoInputNode({ id, data, isConnectable }: WorkflowBuilderNodeProps) {
  const { patchNode, isInViewport } = useWorkflowBuilderNode(id)
  const [localUrl, setLocalUrl] = useState((data.videoUrl as string | undefined) || '')

  useEffect(() => {
    setLocalUrl((data.videoUrl as string | undefined) || '')
  }, [data.videoUrl])

  return (
    <WorkflowNodeFrame
      nodeId={id}
      kind="video_input"
      title={data.label || 'Video Input'}
      description=""
      icon={Video}
      isConnectable={isConnectable}
      outputSockets={OUTPUT_SOCKETS}
      initialCollapsed={data.collapsed}
    >
      <div style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <input
          className="nodrag"
          type="text"
          placeholder="Paste video URL..."
          value={localUrl}
          onChange={(e) => setLocalUrl(e.target.value)}
          onBlur={() => patchNode({ videoUrl: localUrl.trim() })}
          style={{ width: '100%', padding: '5px 8px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '6px', boxSizing: 'border-box' }}
        />
        {localUrl && isInViewport ? (
          <video
            src={localUrl}
            controls
            playsInline
            preload="metadata"
            style={{ width: '100%', borderRadius: '6px', maxHeight: '140px', objectFit: 'contain', background: '#000' }}
          />
        ) : localUrl ? (
          <div className="workflow-builder-node__preview--video-placeholder">Preview paused while offscreen</div>
        ) : (
          <div className="workflow-builder-node__preview--video-placeholder">No video linked yet</div>
        )}
      </div>
    </WorkflowNodeFrame>
  )
})
