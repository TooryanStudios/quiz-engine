import { memo } from 'react'
import { Settings } from 'lucide-react'
import { WorkflowNodeFrame } from './WorkflowNodeFrame'
import type { WorkflowBuilderNodeProps } from '../types'

const INPUT_SOCKETS = [
  { id: 'primary', label: 'Data', slot: 2 },
  { id: 'context', label: 'Context', slot: 3 },
] as const

const OUTPUT_SOCKETS = [{ id: 'result', label: 'Result', slot: 2 }] as const

function useProcessNode(data: WorkflowBuilderNodeProps['data']) {
  return {
    metaLine: data.processType ? `Process: ${data.processType}` : 'Process: transform',
    summary: data.processConfig?.trim() || 'Shape, filter, sort, or aggregate the incoming data before handing it off.',
  }
}

export const ProcessNode = memo(function ProcessNode({ id, data, isConnectable }: WorkflowBuilderNodeProps) {
  const state = useProcessNode(data)

  return (
    <WorkflowNodeFrame
      nodeId={id}
      kind="process"
      title={data.label || 'Process'}
      description={data.description || 'Multi-input processing node'}
      icon={Settings}
      metaLine={state.metaLine}
      required={data.required}
      isConnectable={isConnectable}
      inputSockets={INPUT_SOCKETS}
      outputSockets={OUTPUT_SOCKETS}
      initialCollapsed={data.collapsed}
    >
      <div className="workflow-builder-node__summary">{state.summary}</div>
    </WorkflowNodeFrame>
  )
})