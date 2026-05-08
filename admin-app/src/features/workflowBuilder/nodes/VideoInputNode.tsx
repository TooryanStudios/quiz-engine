import { memo, useState, useEffect } from 'react'
import { Video } from 'lucide-react'
import { WorkflowNodeFrame } from './WorkflowNodeFrame'
import { useWorkflowBuilderNode } from '../WorkflowBuilderCanvasContext'
import type { WorkflowBuilderNodeProps } from '../types'

const OUTPUT_SOCKETS = [{ id: 'out-video', label: 'Video', slot: 1 }] as const

export const VideoInputNode = memo(function VideoInputNode({ id, data, isConnectable }: WorkflowBuilderNodeProps) {
  const { patchNode } = useWorkflowBuilderNode(id)
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
      <div className="workflow-builder-node__video-input-body">
        <input
          type="text"
          placeholder="Paste video URL..."
          value={localUrl}
          onChange={(e) => setLocalUrl(e.target.value)}
          onBlur={() => patchNode({ videoUrl: localUrl.trim() })}
          className="workflow-builder-node__video-input-field"
        />
        {localUrl ? (
          <video
            src={localUrl}
            controls
            playsInline
            preload="metadata"
            className="workflow-builder-node__video-input-preview"
          />
        ) : (
          <div className="workflow-builder-node__preview--video-placeholder">No video linked yet</div>
        )}
      </div>
    </WorkflowNodeFrame>
  )
})
