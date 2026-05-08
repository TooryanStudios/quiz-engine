import { memo } from 'react'
import { Database } from 'lucide-react'
import { WorkflowNodeFrame } from './WorkflowNodeFrame'
import type { WorkflowBuilderNodeProps } from '../types'

const OUTPUT_SOCKETS = [{ id: 'output', label: 'Output', slot: 2 }] as const

function useInputNode(data: WorkflowBuilderNodeProps['data']) {
  return {
    metaLine: data.dataSource ? `Source: ${data.dataSource}` : 'Source: manual',
    preview: data.sampleData?.trim() || 'Provide the payload or reference that starts the flow.',
  }
}

export const InputNode = memo(function InputNode({ id, data, isConnectable }: WorkflowBuilderNodeProps) {
  const state = useInputNode(data)

  return (
    <WorkflowNodeFrame
      nodeId={id}
      kind="input"
      title={data.label || 'Input'}
      description={data.description || 'Data input node'}
      icon={Database}
      metaLine={state.metaLine}
      required={data.required}
      isConnectable={isConnectable}
      outputSockets={OUTPUT_SOCKETS}
      initialCollapsed={data.collapsed}
    >
      <div className="workflow-builder-node__summary">{state.preview}</div>
    </WorkflowNodeFrame>
  )
})