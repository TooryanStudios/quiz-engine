import { memo } from 'react'
import { Code } from 'lucide-react'
import { WorkflowNodeFrame } from './WorkflowNodeFrame'
import type { WorkflowBuilderNodeProps } from '../types'

const INPUT_SOCKETS = [
  { id: 'input', label: 'Input', slot: 2 },
  { id: 'context', label: 'Context', slot: 3 },
] as const

const OUTPUT_SOCKETS = [{ id: 'result', label: 'Result', slot: 2 }] as const

function useCodeNode(data: WorkflowBuilderNodeProps['data']) {
  const snippet = data.code?.split('\n').slice(0, 2).join(' ') || 'Write a transform or utility function.'

  return {
    metaLine: data.codeLanguage ? `Language: ${data.codeLanguage}` : 'Language: javascript',
    snippet,
  }
}

export const CodeNode = memo(function CodeNode({ id, data, isConnectable }: WorkflowBuilderNodeProps) {
  const state = useCodeNode(data)

  return (
    <WorkflowNodeFrame
      nodeId={id}
      kind="code"
      title={data.label || 'Code'}
      description={data.description || 'Code execution node'}
      icon={Code}
      metaLine={state.metaLine}
      required={data.required}
      isConnectable={isConnectable}
      inputSockets={INPUT_SOCKETS}
      outputSockets={OUTPUT_SOCKETS}
      initialCollapsed={data.collapsed}
    >
      <div className="workflow-builder-node__summary">{state.snippet}</div>
    </WorkflowNodeFrame>
  )
})