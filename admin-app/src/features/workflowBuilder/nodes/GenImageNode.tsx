import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { Camera } from 'lucide-react'
import { useWorkflowBuilderNode } from '../WorkflowBuilderCanvasContext'
import { WorkflowNodeFrame } from './WorkflowNodeFrame'
import type { WorkflowBuilderNodeProps } from '../types'

const INPUT_SOCKETS = [
  { id: 'prompt', label: 'Prompt', slot: 1 },
  { id: 'references', label: 'Refs', slot: 2 },
] as const

const OUTPUT_SOCKETS = [{ id: 'out-image', label: 'Image', slot: 2 }] as const

export const GenImageNode = memo(function GenImageNode({ id, data, isConnectable }: WorkflowBuilderNodeProps) {
  const { patchNode, executeNode, isExecuting } = useWorkflowBuilderNode(id)
  const imageSources = useMemo(
    () => [data.generatedImageUrl?.trim() || ''].filter(Boolean),
    [data.generatedImageUrl],
  )
  const [activeImageSrc, setActiveImageSrc] = useState(imageSources[0] || '')

  useEffect(() => {
    setActiveImageSrc(imageSources[0] || '')
  }, [imageSources])

  const handleGenerate = useCallback(async () => {
    patchNode({ generateLastRunAt: new Date().toISOString() })
    await executeNode()
  }, [executeNode, patchNode])

  const lastRunLabel = data.generateLastRunAt ? new Date(data.generateLastRunAt).toLocaleTimeString() : 'Never'

  return (
    <WorkflowNodeFrame
      nodeId={id}
      kind="gen_image"
      title={data.label || 'Image Generation'}
      description=""
      icon={Camera}
      metaLine={`Engine: ${data.generateEngine || 'seedance'}`}
      required={data.required}
      isConnectable={isConnectable}
      inputSockets={INPUT_SOCKETS}
      outputSockets={OUTPUT_SOCKETS}
      bodyClassName="workflow-builder-node__body--generate"
      initialCollapsed={data.collapsed}
    >
      <div className="workflow-builder-node__preview--image">
        {activeImageSrc ? (
          <img
            src={activeImageSrc}
            alt="Generated"
            onError={() => setActiveImageSrc('')}
          />
        ) : (
          <div className="workflow-builder-node__preview--image-placeholder">No image generated yet</div>
        )}
      </div>

      <div className="workflow-builder-node__actions">
        <button
          type="button"
          className="workflow-builder-node__primary-btn nodrag"
          onClick={() => { void handleGenerate() }}
          disabled={isExecuting}
        >
          {isExecuting ? 'Generating...' : 'Generate Image'}
        </button>
        <span className="workflow-builder-node__status workflow-builder-node__status--muted">
          Last run: {lastRunLabel}
        </span>
      </div>
    </WorkflowNodeFrame>
  )
})
