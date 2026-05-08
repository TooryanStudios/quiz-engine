import { memo } from 'react'
import { GitBranch } from 'lucide-react'
import { WorkflowNodeFrame } from './WorkflowNodeFrame'
import type { WorkflowBuilderNodeProps } from '../types'

const INPUT_SOCKETS = [{ id: 'input', label: 'Input', slot: 2 }] as const

function useConditionalNode(data: WorkflowBuilderNodeProps['data']) {
  return {
    metaLine: data.condition ? `If ${data.condition}` : 'If data.value > 0',
    outputSockets: [
      { id: 'true', label: data.trueLabel || 'Pass', slot: 2 },
      { id: 'false', label: data.falseLabel || 'Hold', slot: 3 },
    ] as const,
  }
}

export const ConditionalNode = memo(function ConditionalNode({ id, data, isConnectable }: WorkflowBuilderNodeProps) {
  const state = useConditionalNode(data)

  return (
    <WorkflowNodeFrame
      nodeId={id}
      kind="conditional"
      title={data.label || 'Conditional'}
      description={data.description || 'Decision node'}
      icon={GitBranch}
      metaLine={state.metaLine}
      required={data.required}
      isConnectable={isConnectable}
      inputSockets={INPUT_SOCKETS}
      outputSockets={state.outputSockets}
      initialCollapsed={data.collapsed}
    >
      <div className="workflow-builder-node__tag-row">
        <span className="workflow-builder-node__tag">Pass: {data.trueLabel || 'Pass'}</span>
        <span className="workflow-builder-node__tag">Hold: {data.falseLabel || 'Hold'}</span>
      </div>
    </WorkflowNodeFrame>
  )
})