import { createContext, useContext } from 'react'
import type { WorkflowBuilderNodeData } from './types'

export type ExecuteQueueItemPayload = {
  id: string
  prompt: string
  genModel?: string
  genRatio?: string
  genDuration?: number
  genResolution?: string
  genAudio?: boolean
}

type WorkflowBuilderCanvasContextValue = {
  updateNodeData: (nodeId: string, patch: Partial<WorkflowBuilderNodeData>) => void
  executeNode: (nodeId: string) => Promise<void>
  executeQueueItem: (nodeId: string, item: ExecuteQueueItemPayload) => Promise<void>
  isNodeExecuting: (nodeId: string) => boolean
  isNodeInViewport: (nodeId: string) => boolean
}

export const WorkflowBuilderCanvasContext = createContext<WorkflowBuilderCanvasContextValue>({
  updateNodeData: () => {},
  executeNode: async () => undefined,
  executeQueueItem: async () => undefined,
  isNodeExecuting: () => false,
  isNodeInViewport: () => true,
})

export function useWorkflowBuilderCanvasContext() {
  return useContext(WorkflowBuilderCanvasContext)
}

export function useWorkflowBuilderNode(nodeId: string) {
  const context = useWorkflowBuilderCanvasContext()

  return {
    patchNode: (patch: Partial<WorkflowBuilderNodeData>) => context.updateNodeData(nodeId, patch),
    executeNode: () => context.executeNode(nodeId),
    executeQueueItem: (item: ExecuteQueueItemPayload) => context.executeQueueItem(nodeId, item),
    isExecuting: context.isNodeExecuting(nodeId),
    isInViewport: context.isNodeInViewport(nodeId),
  }
}