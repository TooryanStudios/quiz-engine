import { createContext, useContext } from 'react'
import type { WorkflowBuilderNodeData } from './types'

type WorkflowBuilderCanvasContextValue = {
  updateNodeData: (nodeId: string, patch: Partial<WorkflowBuilderNodeData>) => void
  executeNode: (nodeId: string) => Promise<void>
  isNodeExecuting: (nodeId: string) => boolean
}

export const WorkflowBuilderCanvasContext = createContext<WorkflowBuilderCanvasContextValue>({
  updateNodeData: () => {},
  executeNode: async () => undefined,
  isNodeExecuting: () => false,
})

export function useWorkflowBuilderCanvasContext() {
  return useContext(WorkflowBuilderCanvasContext)
}

export function useWorkflowBuilderNode(nodeId: string) {
  const context = useWorkflowBuilderCanvasContext()

  return {
    patchNode: (patch: Partial<WorkflowBuilderNodeData>) => context.updateNodeData(nodeId, patch),
    executeNode: () => context.executeNode(nodeId),
    isExecuting: context.isNodeExecuting(nodeId),
  }
}