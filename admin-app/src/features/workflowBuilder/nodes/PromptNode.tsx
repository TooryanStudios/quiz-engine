import { memo, useEffect, useState } from 'react'
import { NodeResizer } from '@xyflow/react'
import { Type } from 'lucide-react'
import { useWorkflowBuilderNode } from '../WorkflowBuilderCanvasContext'
import { WorkflowNodeFrame } from './WorkflowNodeFrame'
import type { WorkflowBuilderNodeProps } from '../types'

const INPUT_SOCKETS = [{ id: 'in-refs', label: 'Refs', slot: 2 }] as const
const OUTPUT_SOCKETS = [{ id: 'out-prompt', label: '', slot: 1 }] as const

export const PromptNode = memo(function PromptNode({ id, data, isConnectable, selected }: WorkflowBuilderNodeProps) {
  const { patchNode } = useWorkflowBuilderNode(id)
  const [localText, setLocalText] = useState(data.promptText || '')
  useEffect(() => { setLocalText(data.promptText || '') }, [data.promptText])

  return (
    <>
      <NodeResizer 
        color="#b45309" 
        isVisible={selected} 
        minWidth={220} 
        minHeight={120} 
      />
      <WorkflowNodeFrame
        nodeId={id}
        kind="prompt"
        title={data.label || 'Prompt'}
        description=""
        icon={Type}
        isConnectable={isConnectable}
        inputSockets={INPUT_SOCKETS}
        outputSockets={OUTPUT_SOCKETS}
        bodyClassName="workflow-builder-node__body--prompt"
        initialCollapsed={data.collapsed}
      >
        <textarea
          className="workflow-builder-node__prompt-textarea nodrag"
          value={localText}
          onChange={(e) => setLocalText(e.target.value)}
          onBlur={() => patchNode({ promptText: localText })}
          placeholder="Enter prompt..."
          style={{ width: '100%', height: '100%', minHeight: '60px', resize: 'none', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px', fontSize: '0.97rem', fontFamily: 'inherit', lineHeight: '1.55' }}
        />
      </WorkflowNodeFrame>
    </>
  )
})
