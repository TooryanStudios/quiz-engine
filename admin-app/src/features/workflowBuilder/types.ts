import type { ReactNode } from 'react'
import type { Edge, Node, NodeProps } from '@xyflow/react'

export type WorkflowBuilderNoticeType = 'success' | 'error' | 'info' | 'warning'
export type WorkflowBuilderNodeKind = 
  | 'input' | 'output' | 'process' | 'conditional' | 'code' | 'generate' 
  | 'asset' | 'video_input' | 'prompt'
  | 'gen_text_to_video' | 'gen_image_to_video' | 'gen_video_to_video' | 'gen_images_to_video'
  | 'reroute' | 'json_viewer'
  | 'image_reference' | 'video_reference'
  | 'gen_image' | 'upscale' | 'video_extend' | 'video_connector'
export type WorkflowBuilderDataSource = 'manual' | 'api' | 'database' | 'file'
export type WorkflowBuilderOutputType = 'console' | 'api' | 'database' | 'file'
export type WorkflowBuilderOutputFormat = 'json' | 'csv' | 'xml' | 'text'
export type WorkflowBuilderProcessType = 'transform' | 'filter' | 'aggregate' | 'sort'
export type WorkflowBuilderCodeLanguage = 'javascript' | 'typescript'
export type WorkflowBuilderGenerateEngine = 'internal' | 'openai' | 'seedance'
export type WorkflowBuilderGenerateQuality = 'draft' | 'balanced' | 'high'
export type WorkflowBuilderGenerateTarget = 'image' | 'video' | 'document'
export type WorkflowBuilderNodeSocketSlot = number

export type WorkflowBuilderNodeData = {
  label: string
  description?: string
  required?: boolean
  dataSource?: WorkflowBuilderDataSource
  sampleData?: string
  outputType?: WorkflowBuilderOutputType
  outputFormat?: WorkflowBuilderOutputFormat
  processType?: WorkflowBuilderProcessType
  processConfig?: string
  condition?: string
  trueLabel?: string
  falseLabel?: string
  codeLanguage?: WorkflowBuilderCodeLanguage
  code?: string
  generateEngine?: WorkflowBuilderGenerateEngine
  generateQuality?: WorkflowBuilderGenerateQuality
  generateTarget?: WorkflowBuilderGenerateTarget
  generateLastRunAt?: string
  promptText?: string
  assetUrls?: string[]
  collapsed?: boolean
  generationStatus?: string
  generationTaskId?: string
  generatedVideoUrl?: string
  generatedFirebaseVideoUrl?: string
  generatedSourceVideoUrl?: string
  generationStorageError?: string
  generationLastPrompt?: string
  generationLastRequest?: string
  referenceItems?: Array<{ id: string; url: string; name: string }>
  videoUrl?: string
  videoSequenceUrls?: string[]
  videoConnectorLoop?: boolean
  videoConnectorResolvedUrls?: string[]
  extendMode?: 'before' | 'after'
  generatedImageUrl?: string
  upscaleMode?: '2x' | '4x'
  genModel?: string
  genRatio?: string
  genDuration?: number
  genResolution?: string
  genAudio?: boolean
  genInputMode?: 'reference' | 'image'
  isPromptSocketConnected?: boolean
  genQueue?: unknown[]
  genTopHeight?: number
  uploading?: boolean
}

export type WorkflowBuilderNode = Node<WorkflowBuilderNodeData, WorkflowBuilderNodeKind>
export type WorkflowBuilderNodeProps = NodeProps<WorkflowBuilderNode>
export type WorkflowBuilderEdge = Edge

export type WorkflowBuilderDefinition = {
  nodes: WorkflowBuilderNode[]
  edges: WorkflowBuilderEdge[]
  viewport?: {
    x: number
    y: number
    zoom: number
  }
}

export type WorkflowBuilderNotice = {
  message: string
  type?: WorkflowBuilderNoticeType
}

export type WorkflowBuilderCanvasProps = {
  initialWorkflow?: WorkflowBuilderDefinition | null
  storageKey?: string
  className?: string
  showPersistenceControls?: boolean
  hidePanels?: boolean
  readRemoteWorkflow?: () => Promise<WorkflowBuilderDefinition | null>
  saveRemoteWorkflow?: (workflow: WorkflowBuilderDefinition) => Promise<void>
  onWorkflowChange?: (workflow: WorkflowBuilderDefinition) => void
  onExecuteWorkflow?: (workflow: WorkflowBuilderDefinition) => void | Promise<void>
  onExecuteNode?: (node: WorkflowBuilderNode, workflow: WorkflowBuilderDefinition) => void | Promise<void>
  onNotify?: (notice: WorkflowBuilderNotice) => void
  topActionSlot?: ReactNode
  onRemoteLoadingChange?: (isLoading: boolean) => void
}

export type WorkflowBuilderLibraryItem = {
  kind: WorkflowBuilderNodeKind
  label: string
  description: string
}

export type WorkflowBuilderNodeSocket = {
  id: string
  label: string
  slot: WorkflowBuilderNodeSocketSlot
  topPercent?: number
}