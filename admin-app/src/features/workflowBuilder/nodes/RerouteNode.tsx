import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { WorkflowBuilderNodeProps } from '../types'

export const RerouteNode = memo(function RerouteNode({ isConnectable }: WorkflowBuilderNodeProps) {
  return (
    <div className="workflow-builder-reroute">
      <Handle
        id="in"
        type="target"
        position={Position.Left}
        isConnectable={isConnectable}
        className="workflow-builder-reroute__handle"
      />
      <div className="workflow-builder-reroute__dot" />
      <Handle
        id="out"
        type="source"
        position={Position.Right}
        isConnectable={isConnectable}
        className="workflow-builder-reroute__handle"
      />
    </div>
  )
})
