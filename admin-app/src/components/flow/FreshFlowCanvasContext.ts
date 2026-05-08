import { createContext } from 'react'
import type { FreshFlowNodeData } from './FreshFlowStudioContext'

export type FreshFlowCanvasContextValue = {
  onPatchNode: (nodeId: string, patch: Partial<FreshFlowNodeData>) => void
  onDisconnectHandle: (nodeId: string, handleId: string | null, handleType: 'source' | 'target') => void
  onDisconnectNode: (nodeId: string) => void
  hasNodeConnections: (nodeId: string) => boolean
  getHandleConnectionCount: (nodeId: string, handleId: string, handleType: 'source' | 'target') => number
}

export const FreshFlowCanvasContext = createContext<FreshFlowCanvasContextValue>({
  onPatchNode: () => {},
  onDisconnectHandle: () => {},
  onDisconnectNode: () => {},
  hasNodeConnections: () => false,
  getHandleConnectionCount: () => 0,
})