import { memo } from 'react'
import { FileOutput } from 'lucide-react'
import { WorkflowNodeFrame } from './WorkflowNodeFrame'
import type { WorkflowBuilderNodeProps } from '../types'

const INPUT_SOCKETS = [{ id: 'input', label: 'Input', slot: 2 }] as const

function useOutputNode(data: WorkflowBuilderNodeProps['data']) {
  return {
    metaLine: data.outputType ? `Output: ${data.outputType} (${data.outputFormat || 'json'})` : 'Output: console (json)',
    summary: 'Use this node as the terminal sink for the workflow result.',
  }
}

export const OutputNode = memo(function OutputNode({ id, data, isConnectable }: WorkflowBuilderNodeProps) {
  const state = useOutputNode(data)

  return (
    <WorkflowNodeFrame
      nodeId={id}
      kind="output"
      title={data.label || 'Output'}
      description={data.description || 'Data output node'}
      icon={FileOutput}
      metaLine={state.metaLine}
      required={data.required}
      isConnectable={isConnectable}
      inputSockets={INPUT_SOCKETS}
      initialCollapsed={data.collapsed}
    >
      <div className="workflow-builder-node__summary">{state.summary}</div>
    </WorkflowNodeFrame>
  )
})