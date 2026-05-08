import { memo, useCallback } from 'react'
import { Maximize2 } from 'lucide-react'
import { useWorkflowBuilderNode } from '../WorkflowBuilderCanvasContext'
import { WorkflowNodeFrame } from './WorkflowNodeFrame'
import type { WorkflowBuilderNodeProps } from '../types'

const INPUT_SOCKETS = [
  { id: 'in-media', label: 'Media', slot: 2 },
] as const

const OUTPUT_SOCKETS = [{ id: 'out-media', label: 'Output', slot: 2 }] as const

export const UpscaleNode = memo(function UpscaleNode({ id, data, isConnectable }: WorkflowBuilderNodeProps) {
  const { patchNode, executeNode, isExecuting } = useWorkflowBuilderNode(id)
  const mode = data.upscaleMode ?? '2x'

  const handleProcess = useCallback(async () => {
    patchNode({ generateLastRunAt: new Date().toISOString() })
    await executeNode()
  }, [executeNode, patchNode])

  return (
    <WorkflowNodeFrame
      nodeId={id}
      kind="upscale"
      title={data.label || 'Upscale'}
      description=""
      icon={Maximize2}
      isConnectable={isConnectable}
      inputSockets={INPUT_SOCKETS}
      outputSockets={OUTPUT_SOCKETS}
      bodyClassName="workflow-builder-node__body--upscale"
      initialCollapsed={data.collapsed}
    >
      <div className="workflow-builder-node__upscale-controls nodrag">
        <label className="workflow-builder-node__field-label">Scale factor</label>
        <div className="workflow-builder-node__tab-group">
          {(['2x', '4x'] as const).map((opt) => (
            <button
              key={opt}
              type="button"
              className={`workflow-builder-node__tab-btn nodrag${mode === opt ? ' workflow-builder-node__tab-btn--active' : ''}`}
              onClick={() => patchNode({ upscaleMode: opt })}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div className="workflow-builder-node__actions">
        <button
          type="button"
          className="workflow-builder-node__primary-btn nodrag"
          onClick={() => { void handleProcess() }}
          disabled={isExecuting}
        >
          {isExecuting ? 'Processing...' : `Upscale ${mode}`}
        </button>
      </div>
    </WorkflowNodeFrame>
  )
})
