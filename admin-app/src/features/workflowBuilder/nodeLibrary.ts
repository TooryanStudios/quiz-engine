import {
  Code,
  Database,
  FileOutput,
  GitBranch,
  Settings,
  Sparkles,
  Image as ImageIcon,
  Video,
  Type,
  FileVideo,
  Images,
  Braces,
  Camera,
  Film,
  Clapperboard,
  Maximize2,
  FilePlus2,
  type LucideIcon,
} from 'lucide-react'
import type {
  WorkflowBuilderDefinition,
  WorkflowBuilderLibraryItem,
  WorkflowBuilderNode,
  WorkflowBuilderNodeData,
  WorkflowBuilderNodeKind,
} from './types'

export const DEFAULT_STORAGE_KEY = 'workflow-builder-canvas-v1'

export const WORKFLOW_LIBRARY_ITEMS: WorkflowBuilderLibraryItem[] = [
  { kind: 'prompt', label: 'Prompt', description: 'Text prompt' },
  { kind: 'image_reference', label: 'Image Reference', description: 'Named image assets' },
  { kind: 'video_reference', label: 'Video Reference', description: 'Named video assets' },
  { kind: 'video_input', label: 'Video Input', description: 'Video payload' },
  { kind: 'video_connector', label: 'Video Connector', description: 'Sequence and play connected videos' },
  { kind: 'gen_text_to_video', label: 'Text to Video', description: 'Generate video from text' },
  { kind: 'gen_image_to_video', label: 'Image to Video', description: 'Generate from start/end frames' },
  { kind: 'gen_video_to_video', label: 'Video to Video', description: 'Style transfer and translation' },
  { kind: 'gen_images_to_video', label: 'Images to Video', description: 'Generate from multiple refs' },
  { kind: 'gen_image', label: 'Image Generation', description: 'Generate a still image' },
  { kind: 'video_extend', label: 'Video Extend', description: 'Extend video before or after' },
  { kind: 'upscale', label: 'Upscale', description: 'Upscale video or image resolution' },
  { kind: 'reroute', label: 'Reroute', description: 'Pass-through junction for tidy wires' },
  { kind: 'json_viewer', label: 'JSON Viewer', description: 'Inspect full request & result JSON' },
  { kind: 'generate', label: 'Generic Generate', description: 'Four-input generation node' },
  { kind: 'asset', label: 'Reference Asset', description: 'Image references (legacy)' },
  { kind: 'input', label: 'Input', description: 'Source payload or incoming asset' },
  { kind: 'process', label: 'Process', description: 'Multi-input transformation step' },
  { kind: 'conditional', label: 'Conditional', description: 'Route decisions through side outputs' },
  { kind: 'code', label: 'Code', description: 'Code execution with side inputs' },
  { kind: 'output', label: 'Output', description: 'Terminal delivery node' },
]

export const sanitizeWorkflow = (value?: WorkflowBuilderDefinition | null): WorkflowBuilderDefinition => ({
  nodes: Array.isArray(value?.nodes) ? value.nodes : [],
  edges: normalizeWorkflowEdges(Array.isArray(value?.edges) ? value.edges : [], Array.isArray(value?.nodes) ? value.nodes : []),
})

function normalizeWorkflowEdges(edges: WorkflowBuilderDefinition['edges'], nodes: WorkflowBuilderDefinition['nodes']) {
  if (edges.length === 0 || nodes.length === 0) {
    return edges
  }

  const nodeById = new Map(nodes.map((node) => [node.id, node]))

  return edges.map((edge) => {
    const targetNode = nodeById.get(edge.target)
    if (!targetNode || targetNode.type !== 'generate') {
      return edge
    }

    const isExtendGenerate = Boolean(targetNode.data?.extendMode)
    if (isExtendGenerate && edge.targetHandle === 'style') {
      return { ...edge, targetHandle: 'video' }
    }

    if (!isExtendGenerate && edge.targetHandle === 'video') {
      return { ...edge, targetHandle: 'style' }
    }

    return edge
  })
}

export const buildDefaultNodeData = (kind: WorkflowBuilderNodeKind): WorkflowBuilderNodeData => {
  switch (kind) {
    case 'input':
      return {
        label: 'Input',
        description: 'Data input node',
        dataSource: 'manual',
        sampleData: '{"example": "data"}',
      }
    case 'output':
      return {
        label: 'Output',
        description: 'Data output node',
        outputType: 'console',
        outputFormat: 'json',
      }
    case 'process':
      return {
        label: 'Process',
        description: 'Data processing node',
        processType: 'transform',
        processConfig: '{"operation": "map"}',
      }
    case 'conditional':
      return {
        label: 'Conditional',
        description: 'Conditional branching',
        condition: 'data.value > 0',
        trueLabel: 'Pass',
        falseLabel: 'Hold',
      }
    case 'code':
      return {
        label: 'Code',
        description: 'Custom code execution',
        codeLanguage: 'javascript',
        code: '// Write your code here\nfunction process(data) {\n  return data\n}',
      }
    case 'generate':
      return {
        label: 'Generate',
        description: 'Combine prompt, style, references, and constraints into one result',
        generateEngine: 'internal',
        generateQuality: 'balanced',
        generateTarget: 'image',
      }
    case 'gen_text_to_video':
      return {
        label: 'Text to Video',
        description: 'Generate video from text prompt',
        generateEngine: 'seedance',
        generateQuality: 'high',
        generateTarget: 'video',
      }
    case 'gen_image_to_video':
      return {
        label: 'Image to Video',
        description: 'Generate video with first and last frame anchors',
        generateEngine: 'seedance',
        generateQuality: 'high',
        generateTarget: 'video',
      }
    case 'gen_video_to_video':
      return {
        label: 'Video to Video',
        description: 'Transform an existing video with new style/prompt',
        generateEngine: 'seedance',
        generateQuality: 'high',
        generateTarget: 'video',
      }
    case 'gen_images_to_video':
      return {
        label: 'Images to Video',
        description: 'Generate video sequence from multiple image references',
        generateEngine: 'seedance',
        generateQuality: 'high',
        generateTarget: 'video',
      }
    case 'prompt':
      return {
        label: 'Prompt',
        description: 'Text Prompt',
        promptText: 'A majestic cinematic shot of a glowing orb...',
      }
    case 'asset':
      return {
        label: 'Asset',
        description: 'Image Reference',
        assetUrls: [],
      }
    case 'video_input':
      return {
        label: 'Video Input',
        description: 'Video source',
      }
    case 'video_connector':
      return {
        label: 'Video Connector',
        description: 'Connect and sequence videos',
        videoSequenceUrls: ['', ''],
        videoConnectorLoop: false,
        videoConnectorResolvedUrls: [],
      }
    case 'image_reference':
      return {
        label: 'Image Reference',
        description: 'Named image assets for generation',
        referenceItems: [],
      }
    case 'video_reference':
      return {
        label: 'Video Reference',
        description: 'Named video assets for generation',
        referenceItems: [],
      }
    case 'gen_image':
      return {
        label: 'Image Generation',
        description: 'Generate a still image from prompt',
        generateEngine: 'seedance',
        generateQuality: 'high',
        generateTarget: 'image',
      }
    case 'upscale':
      return {
        label: 'Upscale',
        description: 'Upscale resolution of video or image',
        upscaleMode: '2x',
      }
    case 'video_extend':
      return {
        label: 'Video Extend',
        description: 'Extend a video clip before or after',
        generateEngine: 'seedance',
        generateQuality: 'high',
        generateTarget: 'video',
        extendMode: 'after',
        promptText: '',
      }
    case 'reroute':
      return { label: 'Reroute', description: '' }
    case 'json_viewer':
      return { label: 'JSON Viewer', description: 'Connect to a generation node to inspect its full request and result JSON' }
  }
}

const createNodeId = (kind: WorkflowBuilderNodeKind) => (
  `${kind}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
)

export const createWorkflowNode = (
  kind: WorkflowBuilderNodeKind,
  position: { x: number; y: number },
): WorkflowBuilderNode => ({
  id: createNodeId(kind),
  // video_extend is not a separate component — it's a generate node with extendMode set
  type: kind === 'video_extend' ? 'generate' : kind,
  position,
  data: buildDefaultNodeData(kind),
})

export const getNodeAccent = (kind: WorkflowBuilderNodeKind) => {
  switch (kind) {
    case 'input':
      return '#2563eb'
    case 'output':
      return '#059669'
    case 'process':
      return '#7c3aed'
    case 'conditional':
      return '#d97706'
    case 'code':
      return '#475569'
    case 'generate':
    case 'gen_text_to_video':
    case 'gen_image_to_video':
    case 'gen_video_to_video':
    case 'gen_images_to_video':
      return '#0f766e'
    case 'reroute':
      return '#94a3b8'
    case 'prompt':
      return '#b45309'
    case 'asset':
      return '#be185d'
    case 'video_input':
      return '#1d4ed8'
    case 'video_connector':
      return '#0f766e'
    case 'json_viewer':
      return '#0369a1'
    case 'image_reference':
      return '#7c3aed'
    case 'video_reference':
      return '#0e7490'
    case 'gen_image':
      return '#1d6f42'
    case 'upscale':
      return '#92400e'
    case 'video_extend':
      return '#0f5c6b'
  }
}

export const getNodeIcon = (kind: WorkflowBuilderNodeKind): LucideIcon => {
  switch (kind) {
    case 'input':
      return Database
    case 'output':
      return FileOutput
    case 'process':
      return Settings
    case 'conditional':
      return GitBranch
    case 'code':
      return Code
    case 'generate':
      return Sparkles
    case 'gen_text_to_video':
      return Type
    case 'gen_image_to_video':
      return ImageIcon
    case 'gen_video_to_video':
      return FileVideo
    case 'gen_images_to_video':
      return Images
    case 'reroute':
      return GitBranch
    case 'prompt':
      return Type
    case 'asset':
      return ImageIcon
    case 'video_input':
      return Video
    case 'video_connector':
      return Clapperboard
    case 'json_viewer':
      return Braces
    case 'image_reference':
      return Images
    case 'video_reference':
      return Film
    case 'gen_image':
      return Camera
    case 'upscale':
      return Maximize2
    case 'video_extend':
      return FilePlus2
  }
}