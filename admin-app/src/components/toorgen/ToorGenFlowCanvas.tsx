import { createContext, memo, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { storage } from '../../lib/firebase'
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  BackgroundVariant,
  Controls,
  Handle,
  NodeResizer,
  Position,
  ReactFlow,
  ReactFlowProvider,
  reconnectEdge,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type FinalConnectionState,
  type Node,
  type NodeChange,
  type NodeProps,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import './ToorGenFlowCanvas.css'
import { ToorGenBibleDefaultsDialog } from './ToorGenBibleDefaultsDialog'

export type ToorGenAspectRatio = '16:9' | '9:16' | '4:3' | '3:4'
export type ToorGenGenerationMode = 'text-to-video' | 'image-to-video' | 'video-extension'
export type ToorGenStoryContext = Record<string, unknown>
export type ToorGenModel = 'seedance-2.0' | 'seedance-2.0-fast' | 'atlas-2.0' | 'seedance-api-2.0-fast' | 'seedance-1.5'
export type ToorGenGenerationStatus = 'IDLE' | 'SUBMITTING' | 'IN_PROGRESS' | 'SUCCESS' | 'FAILED'
export type ToorGenNodeKind = 'prompt' | 'image-reference' | 'video-reference' | 'audio-reference' | 'generation'

export type VideoReferenceRole = "source_frame" | "end_frame" | "character" | "location" | "style" | "moodboard" | "color" | "prop"
export type VideoReference = {
  id: string
  url: string
  role: VideoReferenceRole
  label: string
  priority: number
}

export type CharacterCard = {
  id: string
  name: string
  role: string
  appearance: string
  notes: string
  photos: string[]
}

export type BibleDraft = {
  prompt: string
  fallbackImageUrl: string
  fallbackVideoUrl: string
  fallbackVideoUrl2: string
  fallbackVideoUrl3: string
  fallbackAudioUrls: [string, string, string]
  otherInstructions: string
  storyBible: string
  stylePrefix: string
  continuityBlock: string
  strictConsistencyPreset: boolean
  autoShotSplit: boolean
  shotsPerSegment: number
  characterCards: CharacterCard[]
  duration: number
  aspectRatio: ToorGenAspectRatio
  mode: ToorGenGenerationMode
  model: ToorGenModel
}

export type ToorGenNodeData = {
  kind: ToorGenNodeKind
  title: string
  prompt?: string
  imageUrl?: string
  videoUrl?: string
  audioUrl?: string
  description?: string
  imageUrls?: string[]
  imageRole?: VideoReferenceRole
  imageLabel?: string
  onPatch?: (nodeId: string, patch: Partial<ToorGenNodeData>) => void
  onGenerate?: (nodeId: string) => void
  isGenerating?: boolean
  generationStatus?: ToorGenGenerationStatus
  connectedSummary?: string
  previewVideoUrl?: string
  nodeDuration?: number
  nodeAspectRatio?: ToorGenAspectRatio
  nodeModel?: ToorGenModel
  nodeGenerationMode?: 'normal' | 'extend'
  nodeVideoMode?: 'text-to-video' | 'image-to-video'
}

export type ToorGenCanvasNode = Node<ToorGenNodeData>
export type ToorGenCanvasEdge = Edge

export type ToorGenCanvasState = {
  nodes: ToorGenCanvasNode[]
  edges: ToorGenCanvasEdge[]
  viewport?: { x: number; y: number; zoom: number }
}

export type ToorGenGenerationRequest = {
  prompt: string
  sourcePrompt?: string
  generationNodeTitle?: string
  images: VideoReference[]
  videos: string[]
  audios: string[]
  model: ToorGenModel
  localMediaCount: number
  duration: number
  aspectRatio: ToorGenAspectRatio
  mode: ToorGenGenerationMode
  graphJson: string
  hasPrompt: boolean
  collectionId: string
  collectionTitle: string
  generationNodeId: string
  extensionVideoUrl?: string
  storyContext?: ToorGenStoryContext
  studioMode?: 'simple' | 'flow'
  apiPayloadJson: string
}

type ToorGenCollection = ToorGenCanvasState & {
  id: string
  title: string
  createdAt: number
  updatedAt: number
  scriptText?: string
}

type StoryboardShotSummary = {
  id: string
  title: string
  kind: ToorGenNodeKind
  snippet: string
}

type StoryboardSceneSummary = {
  id: string
  title: string
  subtitle: string
  scriptBeat: string
  node: ToorGenCanvasNode
  shots: StoryboardShotSummary[]
}

type ToorGenConnectionCandidate = {
  source?: string | null
  target?: string | null
  targetHandle?: string | null
}

export function createCharacterCard(partial: Partial<CharacterCard> = {}): CharacterCard {
  return {
    id: partial.id || `char-${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)}`,
    name: partial.name || '',
    role: partial.role || '',
    appearance: partial.appearance || '',
    notes: partial.notes || '',
    photos: Array.isArray(partial.photos) ? partial.photos.filter((p) => typeof p === 'string' && p.trim()) : [],
  }
}

type ToorGenFlowCanvasProps = {
  prompt: string
  onPromptChange: (value: string) => void
  duration: number
  onDurationChange: (value: number) => void
  aspectRatio: ToorGenAspectRatio
  onAspectRatioChange: (value: ToorGenAspectRatio) => void
  mode: ToorGenGenerationMode
  onModeChange: (value: ToorGenGenerationMode) => void
  model: ToorGenModel
  onModelChange: (value: ToorGenModel) => void
  status: ToorGenGenerationStatus
  isGenerating: boolean
  consumedCredits?: number | null
  selectedVideoUrl: string
  errorMessage: string
  nodeStatuses?: Record<string, ToorGenGenerationStatus>
  nodeTaskIds?: Record<string, string>
  nodeVideoUrls?: Record<string, string>
  nodeErrorMessages?: Record<string, string>
  nodeRequestedModels?: Record<string, string>
  nodeEffectiveModels?: Record<string, string>
  nodeProviderLabels?: Record<string, string>
  taskId: string
  resumeTaskId: string
  onResumeTaskIdChange: (value: string) => void
  onResume: () => void
  onGenerate: (request: ToorGenGenerationRequest) => void
  onSendRawJson?: (rawJson: string) => Promise<void>
  onStateChange?: (state: ToorGenCanvasState) => void
}

type ToorGenCanvasContextValue = {
  onPatch: (nodeId: string, patch: Partial<ToorGenNodeData>) => void
  onGenerate: (nodeId: string) => void
  onCopyJson: (nodeId: string) => void
  onDisconnectHandle: (nodeId: string, handleId: string | null, handleType: 'source' | 'target') => void
  onChainFromOutput: (nodeId: string) => void
  model: ToorGenModel
  mode: ToorGenGenerationMode
  duration: number
  aspectRatio: ToorGenAspectRatio
  nodeStatuses: Readonly<Record<string, ToorGenGenerationStatus>>
  nodeTaskIds: Readonly<Record<string, string>>
  nodeVideoUrls: Readonly<Record<string, string>>
  nodeErrorMessages: Readonly<Record<string, string>>
  nodeRequestedModels: Readonly<Record<string, string>>
  nodeEffectiveModels: Readonly<Record<string, string>>
  nodeProviderLabels: Readonly<Record<string, string>>
  promptLengthByNodeId: Readonly<Record<string, number>>
  copyJsonStatus: string
  connectedCounts: ReadonlyMap<string, number>
}
const ToorGenCanvasContext = createContext<ToorGenCanvasContextValue>({
  onPatch: () => {},
  onGenerate: () => {},
  onCopyJson: () => {},
  onDisconnectHandle: () => {},
  onChainFromOutput: () => {},
  model: 'atlas-2.0',
  mode: 'image-to-video',
  duration: 5,
  aspectRatio: '16:9',
  nodeStatuses: {},
  nodeTaskIds: {},
  nodeVideoUrls: {},
  nodeErrorMessages: {},
  nodeRequestedModels: {},
  nodeEffectiveModels: {},
  nodeProviderLabels: {},
  promptLengthByNodeId: {},
  copyJsonStatus: '',
  connectedCounts: new Map(),
})

const COLLECTIONS_KEY = 'toorgen_flow_collections_v1'
const ACTIVE_COLLECTION_KEY = 'toorgen_flow_active_collection_v1'
const SEEDANCE_PROMPT_CHARACTER_LIMIT = 2000
const LOCAL_MEDIA_PREFIX_PATTERN = /^(data:|blob:)/i
export const DEFAULT_TOORGEN_STORY_BIBLE = '{"rules":"Cinematic doc. Intentional camera, no random cuts. Secondary motion always present. Soft internal monologue.","env":{"id":"wisam-room","desc":"Bedroom lab. Walls: monster posters. Desk: gem drawings, booklet pages, pencils.","light":"Warm amber left, cool blue right.","no":"No tidy surfaces, overhead light, empty walls."}}'
export const STORY_BIBLE_KEY = 'toorgen_story_bible_v1'
export const STYLE_PREFIX_KEY = 'toorgen_style_prefix_v1'
export const CHARACTER_CARDS_KEY = 'toorgen_character_cards_v1'
export const CONTINUITY_BLOCK_KEY = 'toorgen_continuity_block_v1'
export const DEFAULT_CONTINUITY_BLOCK = 'Continuity lock for the full clip: keep one consistent character identity (face geometry, age, hair, outfit, key props) across every shot and camera change unless explicitly changed in the prompt.\nDo not drift visual style between shots. Keep one coherent style, palette, and world design for the entire clip.\nUse image references throughout the full clip for consistency, not only the opening frame.'
export const AUDIO_REFS_KEY = 'toorgen_audio_refs_v1'
export const STRICT_CONSISTENCY_PRESET_KEY = 'toorgen_strict_consistency_preset_v1'
export const AUTO_SHOT_SPLIT_KEY = 'toorgen_auto_shot_split_v1'
export const SHOTS_PER_SEGMENT_KEY = 'toorgen_shots_per_segment_v1'
const LEGACY_CHARACTER_MENTIONS_KEY = 'toorgen_character_mentions_v1'

const GENERATION_INPUT_SOCKET_RULES: Record<string, { label: string; accepts: string; acceptedKinds: ToorGenNodeKind[] }> = {
  'input-1': { label: 'Prompt', accepts: 'Prompt nodes', acceptedKinds: ['prompt'] },
  'input-2': { label: 'Image', accepts: 'Image references', acceptedKinds: ['image-reference'] },
  'input-3': { label: 'Video ref', accepts: 'Video references', acceptedKinds: ['video-reference'] },
  'input-4': { label: 'Direction', accepts: 'Prompt notes', acceptedKinds: ['prompt'] },
  'input-5': { label: 'Extend from', accepts: 'Generation nodes', acceptedKinds: ['generation'] },
  'input-6': { label: 'Audio ref', accepts: 'Audio references', acceptedKinds: ['audio-reference'] },
}

function getDefaultGenerationSocketForKind(kind: ToorGenNodeKind): string {
  if (kind === 'image-reference') return 'input-2'
  if (kind === 'video-reference') return 'input-3'
  if (kind === 'audio-reference') return 'input-6'
  if (kind === 'generation') return 'input-5'
  return 'input-1'
}

function getNodePreviewSize(node: ToorGenCanvasNode): { width: number; height: number } {
  const width = typeof node.width === 'number' ? node.width : typeof node.style?.width === 'number' ? node.style.width : 0
  const height = typeof node.height === 'number' ? node.height : typeof node.style?.height === 'number' ? node.style.height : 0
  if (width > 0 && height > 0) return { width, height }
  if (node.data.kind === 'prompt') return { width: 300, height: 205 }
  if (node.data.kind === 'image-reference') return { width: 320, height: 380 }
  if (node.data.kind === 'video-reference') return { width: 320, height: 285 }
  if (node.data.kind === 'audio-reference') return { width: 320, height: 240 }
  return { width: 360, height: 330 }
}

function getNodeSnippet(node: ToorGenCanvasNode): string {
  if (node.data.prompt?.trim()) return node.data.prompt.trim().slice(0, 96)
  if (node.data.description?.trim()) return node.data.description.trim().slice(0, 96)
  if (node.data.videoUrl?.trim()) return node.data.videoUrl.trim()
  if (node.data.audioUrl?.trim()) return node.data.audioUrl.trim()
  if (node.data.imageUrl?.trim()) return node.data.imageUrl.trim()
  if (node.data.imageUrls?.length) return node.data.imageUrls[0]
  return ''
}

function createId(prefix: string): string {
  return `${prefix}-${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)}`
}

function createNode(kind: ToorGenNodeKind, position: { x: number; y: number }): ToorGenCanvasNode {
  const defaults: Record<ToorGenNodeKind, Pick<ToorGenNodeData, 'title' | 'prompt' | 'description'>> = {
    prompt: {
      title: 'Prompt note',
      prompt: 'Describe the scene, action, camera, lighting, and style.',
    },
    'image-reference': {
      title: 'Image reference',
      description: 'Paste an image URL or upload a still reference.',
    },
    'video-reference': {
      title: 'Video reference',
      description: 'Paste a video URL for motion, pacing, or composition reference.',
    },
    'audio-reference': {
      title: 'Audio reference',
      description: 'Paste an audio URL or upload an MP3/WAV reference.',
    },
    generation: {
      title: 'Generation',
      description: 'Connect prompt, image, and video references here, then generate.',
    },
  }

  const size: Record<ToorGenNodeKind, { width: number; height: number }> = {
    prompt: { width: 300, height: 205 },
    'image-reference': { width: 320, height: 380 },
    'video-reference': { width: 320, height: 285 },
    'audio-reference': { width: 320, height: 240 },
    generation: { width: 360, height: 330 },
  }

  return {
    id: createId(kind),
    type: `${kind}Node`,
    position,
    data: { kind, ...defaults[kind] },
    style: size[kind],
    dragHandle: '.tgfc-node-dragbar',
  }
}

function createDefaultCollection(): ToorGenCollection {
  const promptNode: ToorGenCanvasNode = {
    ...createNode('prompt', { x: 40, y: 80 }),
    id: 'tg-seed-prompt',
    data: {
      kind: 'prompt',
      title: 'Opening shot',
      prompt: 'A cinematic establishing shot with clear subject, weather, motion, and atmosphere.',
    },
  }
  const imageNode: ToorGenCanvasNode = {
    ...createNode('image-reference', { x: 40, y: 330 }),
    id: 'tg-seed-image',
    data: {
      kind: 'image-reference',
      title: 'Visual reference',
      description: 'Optional look, character, product, or location reference.',
    },
  }
  const generationNode: ToorGenCanvasNode = {
    ...createNode('generation', { x: 500, y: 180 }),
    id: 'tg-seed-generation',
  }

  return {
    id: 'default',
    title: 'Collection 01',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    scriptText: '',
    nodes: [promptNode, imageNode, generationNode],
    edges: [
      { id: 'tg-seed-edge-prompt', source: promptNode.id, target: generationNode.id, targetHandle: 'input-1', animated: false, reconnectable: 'target' },
      { id: 'tg-seed-edge-image', source: imageNode.id, target: generationNode.id, targetHandle: 'input-2', animated: false, reconnectable: 'target' },
    ],
    viewport: { x: 90, y: 70, zoom: 0.9 },
  }
}

function normalizeCanvasEdges(nodes: ToorGenCanvasNode[], edges: ToorGenCanvasEdge[]): ToorGenCanvasEdge[] {
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  return edges.map((edge) => {
    const sourceKind = nodeById.get(edge.source)?.data.kind
    const targetKind = nodeById.get(edge.target)?.data.kind
    const savedSocketRule = edge.targetHandle ? GENERATION_INPUT_SOCKET_RULES[edge.targetHandle] : null
    const savedSocketAcceptsSource = Boolean(sourceKind && savedSocketRule?.acceptedKinds.includes(sourceKind))
    const targetHandle = targetKind === 'generation'
      ? (savedSocketAcceptsSource ? edge.targetHandle : (sourceKind ? getDefaultGenerationSocketForKind(sourceKind) : 'input-1'))
      : edge.targetHandle
    return {
      ...edge,
      animated: false,
      reconnectable: 'target',
      ...(targetHandle ? { targetHandle } : {}),
    }
  })
}

function sanitizeCollection(value: unknown): ToorGenCollection | null {
  if (!value || typeof value !== 'object') return null
  const candidate = value as Partial<ToorGenCollection>
  if (!candidate.id || !candidate.title || !Array.isArray(candidate.nodes) || !Array.isArray(candidate.edges)) return null
  return {
    id: candidate.id,
    title: candidate.title,
    createdAt: Number(candidate.createdAt) || Date.now(),
    updatedAt: Number(candidate.updatedAt) || Date.now(),
    scriptText: typeof candidate.scriptText === 'string' ? candidate.scriptText : '',
    nodes: (candidate.nodes as ToorGenCanvasNode[]).map((node) => ({ ...node, type: node.type || `${node.data.kind}Node`, dragHandle: '.tgfc-node-dragbar' })),
    edges: normalizeCanvasEdges(candidate.nodes as ToorGenCanvasNode[], candidate.edges as ToorGenCanvasEdge[]),
    viewport: candidate.viewport,
  }
}

function loadCollections(): ToorGenCollection[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(COLLECTIONS_KEY) || '[]') as unknown[]
    const collections = parsed.map(sanitizeCollection).filter((entry): entry is ToorGenCollection => Boolean(entry))
    return collections.length > 0 ? collections : [createDefaultCollection()]
  } catch {
    return [createDefaultCollection()]
  }
}

function stripLocalMediaFromNode(node: ToorGenCanvasNode): ToorGenCanvasNode {
  const imageUrl = node.data.imageUrl || ''
  const videoUrl = node.data.videoUrl || ''
  const audioUrl = node.data.audioUrl || ''
  const shouldStripImage = LOCAL_MEDIA_PREFIX_PATTERN.test(imageUrl)
  const shouldStripVideo = LOCAL_MEDIA_PREFIX_PATTERN.test(videoUrl)
  const shouldStripAudio = LOCAL_MEDIA_PREFIX_PATTERN.test(audioUrl)
  if (!shouldStripImage && !shouldStripVideo && !shouldStripAudio) return node

  return {
    ...node,
    data: {
      ...node.data,
      ...(shouldStripImage ? { imageUrl: '' } : {}),
      ...(shouldStripVideo ? { videoUrl: '' } : {}),
      ...(shouldStripAudio ? { audioUrl: '' } : {}),
      description: node.data.description || 'Local upload is available only in the current session. Paste a hosted URL to persist it.',
    },
  }
}

function prepareCollectionsForStorage(collections: ToorGenCollection[]): ToorGenCollection[] {
  return collections.map((collection) => ({
    ...collection,
    nodes: collection.nodes.map(stripLocalMediaFromNode),
  }))
}

function safeSetLocalStorage(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value)
    return true
  } catch (error) {
    console.warn(`Could not persist ${key} to localStorage:`, error)
    return false
  }
}

function persistCollectionsToStorage(collections: ToorGenCollection[]): boolean {
  const storageCollections = prepareCollectionsForStorage(collections)
  return safeSetLocalStorage(COLLECTIONS_KEY, JSON.stringify(storageCollections))
}

function isLocalMediaUrl(value: string): boolean {
  return LOCAL_MEDIA_PREFIX_PATTERN.test(value.trim())
}

function isHostedMediaUrl(value: string): boolean {
  return /^https?:\/\//i.test(value.trim())
}

function cleanMediaUrlForGeneration(value: string): string {
  const normalized = value.trim()
  return isHostedMediaUrl(normalized) ? normalized : ''
}

const IS_LOCAL_DEV_CANVAS = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)
const CHATBOT_BASE_CANVAS = IS_LOCAL_DEV_CANVAS ? ((import.meta.env.VITE_CHATBOT_LOCAL_URL as string | undefined) || '') : ''
const buildCanvasApiUrl = (path: string) => {
  const base = (CHATBOT_BASE_CANVAS || '').trim().replace(/\/$/, '')
  return base ? `${base}${path}` : path
}

async function uploadReferenceImageToHost(file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'jpg'
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  try {
    const fileRef = storageRef(storage, `seedance-references/${uniqueName}`)
    await uploadBytes(fileRef, file, { contentType: file.type || 'image/jpeg' })
    return await getDownloadURL(fileRef)
  } catch {
    const response = await fetch(buildCanvasApiUrl('/api/seedance/reference-image'), {
      method: 'POST',
      headers: {
        'Content-Type': file.type || 'application/octet-stream',
        'x-file-name': encodeURIComponent(file.name || 'reference-image'),
      },
      body: file,
    })
    if (!response.ok) throw new Error('Reference image upload failed.')
    const payload = await response.json().catch(() => ({}))
    const url = typeof (payload as { url?: unknown }).url === 'string' ? String((payload as { url?: unknown }).url) : ''
    if (!url) throw new Error('Upload completed without a valid URL.')
    return url
  }
}

function summarizeMediaUrlForGraph(value: string): string {
  const normalized = value.trim()
  if (!normalized) return ''
  if (isLocalMediaUrl(normalized)) return '[local upload omitted; paste a hosted URL before generation]'
  return normalized
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('Unable to read file.'))
    }
    reader.onerror = () => reject(new Error('Unable to read file.'))
    reader.readAsDataURL(file)
  })
}

function getConnectedInputNodes(nodes: ToorGenCanvasNode[], edges: ToorGenCanvasEdge[], generationNodeId: string) {
  const incomingIds = new Set(edges.filter((edge) => edge.target === generationNodeId).map((edge) => edge.source))
  return nodes.filter((node) => incomingIds.has(node.id))
}

function isAllowedGenerationConnection(nodes: ToorGenCanvasNode[], connection: ToorGenConnectionCandidate): boolean {
  if (!connection.source || !connection.target || connection.source === connection.target) return false
  const nodeById = new Map(nodes.map((node) => [node.id, node]))
  const sourceKind = nodeById.get(connection.source)?.data.kind
  const targetKind = nodeById.get(connection.target)?.data.kind
  if (!sourceKind || !targetKind) return false
  if (targetKind !== 'generation') return true
  const socketRule = connection.targetHandle ? GENERATION_INPUT_SOCKET_RULES[connection.targetHandle] : null
  return Boolean(socketRule?.acceptedKinds.includes(sourceKind))
}

type PromptSection = {
  text: string
  required?: boolean
  priority: number
}

type ShotPromptBatch = {
  promptText: string
  batchIndex: number
  totalBatches: number
  startShot: number
  endShot: number
  shotCount: number
}

function normalizeReferenceGroupLabel(label: string, fallback: string): string {
  const cleaned = (label || '')
    .replace(/\s+identity$/i, '')
    .replace(/^primary\s+/i, '')
    .replace(/^additional\s+/i, '')
    .replace(/\s*reference$/i, '')
    .replace(/\s*references$/i, '')
    .replace(/\s*\/\s*scene anchor$/i, '')
    .trim()
  return cleaned || fallback
}

export function buildSeedancePrompt(userPrompt: string, imageRefs: Array<VideoReference & { apiName: string }>): string {
  const trimmedPrompt = userPrompt.trim()
  if (!imageRefs.length) return trimmedPrompt

  const sceneRefs = imageRefs.filter((ref) => ref.role === 'source_frame' || ref.role === 'location')
  const endFrameRefs = imageRefs.filter((ref) => ref.role === 'end_frame')
  const characterRefs = imageRefs.filter((ref) => ref.role === 'character')
  const styleRefs = imageRefs.filter((ref) => ref.role === 'style' || ref.role === 'moodboard' || ref.role === 'color')
  const propRefs = imageRefs.filter((ref) => ref.role === 'prop')
  const routingLines: string[] = []

  if (sceneRefs.length > 0) {
    routingLines.push(`- [${sceneRefs[0].apiName}] is the source-frame/scene anchor (first frame of the clip).`)
    if (sceneRefs.length > 1) {
      routingLines.push(`- Scene continuity: ${sceneRefs.slice(1).map((ref) => `[${ref.apiName}]`).join(', ')}`)
    }
  } else if (endFrameRefs.length === 0) {
    routingLines.push(`- [${imageRefs[0].apiName}] is the primary reference anchor.`)
  }

  const groupedCharacterRefs = new Map<string, string[]>()
  for (const ref of characterRefs) {
    const label = normalizeReferenceGroupLabel(ref.label, 'Character')
    const current = groupedCharacterRefs.get(label) || []
    current.push(`[${ref.apiName}]`)
    groupedCharacterRefs.set(label, current)
  }
  if (groupedCharacterRefs.size === 1 && sceneRefs.length > 0) {
    const [label, refs] = Array.from(groupedCharacterRefs.entries())[0]
    const sceneAnchorRef = `[${sceneRefs[0].apiName}]`
    if (!refs.includes(sceneAnchorRef)) {
      groupedCharacterRefs.set(label, [sceneAnchorRef, ...refs])
    }
  }
  for (const [label, refs] of groupedCharacterRefs.entries()) {
    routingLines.push(`- ${label}: ${refs.join(', ')}`)
  }

  if (styleRefs.length > 0) {
    routingLines.push(`- Style/mood/color references: ${styleRefs.map((ref) => `[${ref.apiName}]`).join(', ')}`)
  }
  if (propRefs.length > 0) {
    routingLines.push(`- Prop references: ${propRefs.map((ref) => `[${ref.apiName}]`).join(', ')}`)
  }
  if (endFrameRefs.length > 0) {
    routingLines.push(`- [${endFrameRefs[0].apiName}] is the ending-frame anchor (last frame of the clip).`)
  }

  const continuityBlock = [
    'Continuity lock for the full clip: keep one consistent character identity (face geometry, age, hair, outfit, key props) across every shot and camera change unless explicitly changed in the prompt.',
    'Do not drift visual style between shots. Keep one coherent style, palette, and world design for the entire clip.',
    'Use image references throughout the full clip for consistency, not only the opening frame.',
  ].join('\n')

  return [
    continuityBlock,
    '',
    'Reference routing:',
    ...routingLines,
    '',
    trimmedPrompt,
  ].filter(Boolean).join('\n')
}

function composePromptWithBudget(sections: PromptSection[], maxChars: number, autoTrim: boolean): string {
  const normalized = sections
    .map((section) => ({ ...section, text: section.text.trim() }))
    .filter((section) => section.text.length > 0)

  const joinSections = (list: PromptSection[]) => list.map((section) => section.text.trim()).filter(Boolean).join('\n\n').trim()

  let active = normalized
  let prompt = joinSections(active)
  if (!autoTrim || prompt.length <= maxChars) return prompt

  const optionalSections = active
    .filter((section) => !section.required)
    .slice()
    .sort((left, right) => left.priority - right.priority)

  for (const section of optionalSections) {
    active = active.filter((entry) => entry !== section)
    prompt = joinSections(active)
    if (prompt.length <= maxChars) return prompt
  }

  const requiredOnly = joinSections(active.filter((section) => section.required))
  if (requiredOnly.length > maxChars) {
    return `${requiredOnly.slice(0, Math.max(0, maxChars - 3)).trim()}...`
  }

  return `${prompt.slice(0, Math.max(0, maxChars - 3)).trim()}...`
}

function splitStoryboardScriptBeats(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*\d.\s]+/, '').trim())
    .filter(Boolean)
}

function splitPromptIntoShotBatches(promptText: string, shotsPerSegment: number, strictMode: boolean): ShotPromptBatch[] {
  const safeShotsPerSegment = Math.max(1, Math.floor(shotsPerSegment))
  const lines = promptText.split(/\r?\n/)
  const stripNonVisualLines = (text: string): string => text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !(
      /^Production constraints/i.test(line)
      || /^Continuity lock for the full clip/i.test(line)
      || /^Do not drift visual style/i.test(line)
      || /^Never render these instructions as on-screen text/i.test(line)
      || /^Strict continuity mode/i.test(line)
      || /^Style lock:/i.test(line)
      || /^Avoid style drift/i.test(line)
      || /^Use image references throughout the full clip/i.test(line)
      || /^Reference routing:/i.test(line)
      || /^- \[Image\d+\]/i.test(line)
      || /^-\s+[A-Za-z0-9 _-]+:\s+\[Image\d+\]/i.test(line)
    ))
    .join('\n')
    .trim()
  const shotStartIndices: Array<{ lineIndex: number; shotNumber: number }> = []

  lines.forEach((line, lineIndex) => {
    const match = line.match(/^\s*Shot\s+(\d+)\b/i)
    if (!match) return
    const shotNumber = Number(match[1])
    shotStartIndices.push({ lineIndex, shotNumber: Number.isFinite(shotNumber) ? shotNumber : shotStartIndices.length + 1 })
  })

  if (shotStartIndices.length <= safeShotsPerSegment) {
    return [{
      promptText,
      batchIndex: 1,
      totalBatches: 1,
      startShot: shotStartIndices[0]?.shotNumber ?? 1,
      endShot: shotStartIndices[shotStartIndices.length - 1]?.shotNumber ?? 1,
      shotCount: Math.max(1, shotStartIndices.length || 1),
    }]
  }

  const shotBlocks = shotStartIndices.map((entry, index) => {
    const next = shotStartIndices[index + 1]
    const startLine = entry.lineIndex
    const endLine = (next ? next.lineIndex : lines.length) - 1
    return {
      shotNumber: entry.shotNumber,
      text: lines.slice(startLine, endLine + 1).join('\n').trim(),
    }
  })

  const firstShotLine = shotStartIndices[0].lineIndex
  const lastShotLine = shotStartIndices[shotStartIndices.length - 1].lineIndex
  const lastBlockLength = shotBlocks[shotBlocks.length - 1].text.split(/\r?\n/).length
  const shotTailLineExclusive = Math.min(lines.length, lastShotLine + lastBlockLength)

  // Parse and sanitize context lines for future tuning/inspection. We do not
  // inject them into split prompts to avoid non-visual meta leakage.
  void stripNonVisualLines(lines.slice(0, firstShotLine).join('\n').trim())
  void stripNonVisualLines(lines.slice(shotTailLineExclusive).join('\n').trim())

  const chunks: typeof shotBlocks[] = []
  for (let index = 0; index < shotBlocks.length; index += safeShotsPerSegment) {
    chunks.push(shotBlocks.slice(index, index + safeShotsPerSegment))
  }

  return chunks.map((chunk, batchIndex) => {
    const totalBatches = chunks.length
    const startShot = chunk[0].shotNumber
    const endShot = chunk[chunk.length - 1].shotNumber
    const continuityInstruction = strictMode
      ? `Segment ${batchIndex + 1}/${totalBatches}: Generate only Shot ${startShot} through Shot ${endShot}; keep the same character identity, outfit, style, and environment; do not display any on-screen text unless explicitly requested in the scene.`
      : `Segment ${batchIndex + 1}/${totalBatches}: Generate only Shot ${startShot} through Shot ${endShot}; keep continuity with prior segments; do not display on-screen text unless explicitly requested in the scene.`
    const segmentPrompt = [
      chunk.map((block) => block.text).join('\n\n'),
      continuityInstruction,
    ].filter(Boolean).join('\n\n').trim()

    return {
      promptText: segmentPrompt,
      batchIndex: batchIndex + 1,
      totalBatches,
      startShot,
      endShot,
      shotCount: chunk.length,
    }
  })
}

function buildGenerationRequest(params: {
  nodes: ToorGenCanvasNode[]
  edges: ToorGenCanvasEdge[]
  generationNodeId: string
  collectionId: string
  collectionTitle: string
  fallbackPrompt: string
  fallbackImageUrl?: string
  fallbackVideoUrl?: string
  fallbackExtraVideoUrls?: string[]
  fallbackAudioUrls?: string[]
  otherInstructions?: string
  stylePrefix?: string
  storyBible?: string
  characterCards?: CharacterCard[]
  duration: number
  aspectRatio: ToorGenAspectRatio
  mode: ToorGenGenerationMode
  model: ToorGenModel
  strictConsistencyPreset?: boolean
  nodeVideoUrls?: Record<string, string>
}): ToorGenGenerationRequest {
  const compactText = (value: string, max = 220): string => {
    const compact = value.replace(/\s+/g, ' ').trim()
    if (compact.length <= max) return compact
    return `${compact.slice(0, Math.max(0, max - 3)).trim()}...`
  }
  const connected = getConnectedInputNodes(params.nodes, params.edges, params.generationNodeId)
  const promptNodes = connected.filter((node) => node.data.kind === 'prompt')
  const imageNodes = connected.filter((node) => node.data.kind === 'image-reference')
  const videoNodes = connected.filter((node) => node.data.kind === 'video-reference')
  const audioNodes = connected.filter((node) => node.data.kind === 'audio-reference')
  const prompts = promptNodes
    .map((node) => node.data.prompt?.trim() || '')
    .filter(Boolean)
  const rawImages = [
    params.fallbackImageUrl || '',
    ...imageNodes.flatMap((node) => {
      const urls = node.data.imageUrls?.length ? node.data.imageUrls : [node.data.imageUrl || ''].filter(Boolean)
      return urls.map((u) => u.trim())
    }),
  ].filter(Boolean)
  const rawVideos = [
    params.fallbackVideoUrl || '',
    ...(params.fallbackExtraVideoUrls || []),
    ...videoNodes.map((node) => node.data.videoUrl?.trim() || ''),
  ].filter(Boolean)
  const rawAudios = [
    ...(params.fallbackAudioUrls || []),
    ...audioNodes.map((node) => node.data.audioUrl?.trim() || ''),
  ].map((u) => u.trim()).filter(Boolean)
  const storyBible = params.storyBible?.trim() || DEFAULT_TOORGEN_STORY_BIBLE
  const characterCards = (params.characterCards || [])
    .map((card, index) => {
      const name = card.name.trim()
      const role = card.role.trim()
      const appearance = card.appearance.trim()
      const notes = card.notes.trim()
      const photos = (card.photos || []).map((p) => cleanMediaUrlForGeneration(p)).filter(Boolean)
      const hasPhotos = photos.length > 0
      return {
        ...card,
        name,
        role: role || (hasPhotos ? (index === 0 ? 'Main character' : 'Supporting character') : ''),
        appearance: appearance || (hasPhotos
          ? 'Keep the same face, hair, body proportions, clothing, and key accessories across all shots.'
          : ''),
        notes: notes || (hasPhotos
          ? 'Never change this character appearance between shots unless explicitly requested.'
          : ''),
        photos,
      }
    })
    .filter((card) => card.name || card.role || card.appearance || card.notes || card.photos.length > 0)
  // Scene/canvas images go FIRST so [Image1] can be treated as the primary reference.
  // Character photos follow as additional appearance references (Image2, Image3, ...).
  const generateUUID = () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)
  const sceneImages: VideoReference[] = rawImages.map(cleanMediaUrlForGeneration).filter(Boolean).map((url) => ({
    id: `ref_scene_${generateUUID()}`,
    url,
    role: "source_frame" as VideoReferenceRole,
    label: "source-frame / scene anchor",
    priority: 1
  }))

  const characterPhotos: VideoReference[] = characterCards.flatMap((card, i) => 
    card.photos.map((p) => ({
      id: `ref_char_${generateUUID()}`,
      url: cleanMediaUrlForGeneration(p),
      role: "character" as VideoReferenceRole,
      label: `${card.name || `Character ${i + 1}`} identity`,
      priority: 2
    }))
  ).filter(Boolean)

  const images: VideoReference[] = [...sceneImages, ...characterPhotos]
  
  const videos = rawVideos.map(cleanMediaUrlForGeneration).filter(Boolean)
  const audios = rawAudios.map(cleanMediaUrlForGeneration).filter(Boolean).slice(0, 3)
  const localMediaCount = [...rawImages, ...rawVideos, ...rawAudios].filter(isLocalMediaUrl).length
  const connectedAudioSources = audioNodes
    .map((node, index) => ({
      label: node.data.title?.trim() || `Audio reference ${index + 1}`,
      nodeId: node.id,
      url: cleanMediaUrlForGeneration(node.data.audioUrl || ''),
    }))
    .filter((entry) => Boolean(entry.url))
  const fallbackAudioSources = (params.fallbackAudioUrls || [])
    .map((value) => cleanMediaUrlForGeneration(value || ''))
    .filter(Boolean)
    .slice(0, 3)
    .map((url, index) => ({
      label: `Fallback audio ${index + 1}`,
      nodeId: 'fallback',
      url,
    }))
  const audioDiagnostics = [...connectedAudioSources, ...fallbackAudioSources]
  // Per-node overrides: if the generation node has its own duration/aspectRatio/model, use them.
  const generationNode = params.nodes.find((n) => n.id === params.generationNodeId)
  const effectiveDuration = generationNode?.data.nodeDuration ?? params.duration
  const effectiveAspectRatio = generationNode?.data.nodeAspectRatio ?? params.aspectRatio
  const effectiveModel = generationNode?.data.nodeModel ?? params.model
  const isExtendMode = generationNode?.data.nodeGenerationMode === 'extend'
  const extendSourceEdge = params.edges.find((e) => e.target === params.generationNodeId && e.targetHandle === 'input-5')
  const extendSourceNode = extendSourceEdge ? params.nodes.find((n) => n.id === extendSourceEdge.source) : null
  const extensionVideoUrl = isExtendMode && extendSourceNode ? (params.nodeVideoUrls?.[extendSourceNode.id] ?? '') : ''
  const effectiveMode: ToorGenGenerationMode = isExtendMode
    ? 'video-extension'
    : (generationNode?.data.nodeVideoMode ?? params.mode)
  const strictMode = Boolean(params.strictConsistencyPreset)

  const storyBiblePromptBlock = storyBible
    ? `Story bible constraints: ${compactText(storyBible, strictMode ? 140 : 220)}`
    : ''

  // Keep character appearance cues in prompt even when photos exist; this improves identity stability after shot transitions.
  const characterPromptBlock = characterCards.length > 0
    ? [
        'Characters:',
        ...characterCards.map((card, index) => {
          const parts = [
            card.name ? `${index + 1}. ${compactText(card.name, 48)}` : `${index + 1}. Character`,
            card.role ? `Role: ${compactText(card.role, 72)}` : '',
            card.appearance ? `Appearance: ${compactText(card.appearance, 150)}` : '',
            card.notes ? `Continuity notes: ${compactText(card.notes, 120)}` : '',
          ].filter(Boolean)
          return `- ${parts.join(' | ')}`
        }),
      ].join('\n')
    : ''
  const connectedPromptText = prompts.join('\n').trim()
  const fallbackPromptText = params.fallbackPrompt.trim()
  // Fallback prompt should apply only when the generation node has no connected prompt nodes.
  const narrativePrompt = [connectedPromptText || fallbackPromptText].filter(Boolean).join('\n\n')
  
  const promptSections: PromptSection[] = [
    { text: params.stylePrefix?.trim() || '', priority: 40 },
    { text: narrativePrompt, required: true, priority: 100 },
    { text: params.otherInstructions?.trim() || '', priority: 20 },
    { text: characterPromptBlock, required: characterCards.length > 0, priority: 90 },
    { text: storyBiblePromptBlock, priority: 10 },
  ]
  const promptTextBody = composePromptWithBudget(promptSections, SEEDANCE_PROMPT_CHARACTER_LIMIT, false)
  const promptText = buildSeedancePrompt(promptTextBody, images.map((ref, index) => ({ ...ref, apiName: `Image${index + 1}` })))
  // Only edges where BOTH endpoints are within the declared subgraph (connected inputs + the one generation node).
  const graphNodeIds = new Set([...connected.map((n) => n.id), params.generationNodeId])
  const graph = {
    collection: { id: params.collectionId, title: params.collectionTitle },
    generationNodeId: params.generationNodeId,
    inputs: connected.map((node) => {
      const nodeImageUrls = node.data.imageUrls?.length ? node.data.imageUrls : [node.data.imageUrl || ''].filter(Boolean)
      return {
        id: node.id,
        kind: node.data.kind,
        title: node.data.title,
        prompt: node.data.prompt || '',
        imageUrl: summarizeMediaUrlForGraph(nodeImageUrls[0] || ''),
        imageUrls: nodeImageUrls.map((u) => summarizeMediaUrlForGraph(u)).filter(Boolean),
        videoUrl: summarizeMediaUrlForGraph(node.data.videoUrl || ''),
        audioUrl: summarizeMediaUrlForGraph(node.data.audioUrl || ''),
        description: node.data.description || '',
      }
    }),
    edges: params.edges
      .filter((edge) => graphNodeIds.has(edge.source) && graphNodeIds.has(edge.target))
      .map((edge) => ({ id: edge.id, source: edge.source, target: edge.target })),
    story: {
      bible: storyBible,
      characters: characterCards,
    },
    output: {
      model: effectiveModel,
      duration: effectiveDuration,
      aspectRatio: effectiveAspectRatio,
      mode: effectiveMode,
    },
    diagnostics: {
      connectedInputCount: connected.length,
      connectedAudioRefCount: connectedAudioSources.length,
      audioSourceLabels: audioDiagnostics.map((entry) => entry.label),
    },
  }
  const graphJson = JSON.stringify(graph, null, 2)

  const isAtlasCloud = effectiveModel === 'seedance-2.0-fast' || effectiveModel === 'atlas-2.0'
  const apiPayload: Record<string, unknown> = {
    prompt: promptText,
    model: effectiveModel,
    duration: effectiveDuration,
    aspect_ratio: effectiveAspectRatio,
    public: false,
    mode: effectiveMode,
    ...(images.length > 0 ? { images: images.map((r) => r.url) } : {}),
    ...(videos.length > 0 ? { reference_videos: videos } : {}),
    ...(isAtlasCloud ? { generate_audio: true, resolution: '720p', watermark: false } : {}),
    _meta: {
      diagnostics: {
        connected_input_count: connected.length,
        connected_audio_ref_count: connectedAudioSources.length,
        audio_sources: audioDiagnostics,
      },
    },
  }
  const apiPayloadJson = JSON.stringify(apiPayload, null, 2)

  return {
    prompt: promptText,
    generationNodeTitle: generationNode?.data.title?.trim() || 'Generation',
    images,
    videos,
    audios,
    model: effectiveModel,
    localMediaCount,
    duration: effectiveDuration,
    aspectRatio: effectiveAspectRatio,
    mode: effectiveMode,
    extensionVideoUrl: extensionVideoUrl || undefined,
    graphJson,
    apiPayloadJson,
    hasPrompt: promptText.trim().length > 0,
    sourcePrompt: promptText,
    storyContext: {
      strictConsistencyPreset: strictMode,
    },
    collectionId: params.collectionId,
    collectionTitle: params.collectionTitle,
    generationNodeId: params.generationNodeId,
  }
}

async function copyTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }
  const textArea = document.createElement('textarea')
  textArea.value = text
  textArea.setAttribute('readonly', 'true')
  textArea.style.position = 'fixed'
  textArea.style.left = '-9999px'
  document.body.appendChild(textArea)
  textArea.select()
  document.execCommand('copy')
  document.body.removeChild(textArea)
}

// CtrlHandle: wraps ReactFlow's Handle so Ctrl/Cmd+click disconnects all edges on that handle.
function CtrlHandle({
  nodeId,
  type,
  position,
  id,
  className,
}: {
  nodeId: string
  type: 'source' | 'target'
  position: Position
  id?: string
  className?: string
}) {
  const { onDisconnectHandle } = useContext(ToorGenCanvasContext)
  const handleClick = (event: React.MouseEvent) => {
    if (!event.ctrlKey && !event.metaKey) return
    event.preventDefault()
    event.stopPropagation()
    onDisconnectHandle(nodeId, id ?? null, type)
  }
  return (
    <Handle
      type={type}
      position={position}
      id={id}
      className={className}
      onClick={handleClick}
    />
  )
}

function EditableNodeTitle({
  ariaLabel,
  title,
  onChange,
}: {
  ariaLabel: string
  title: string
  onChange: (value: string) => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  if (isEditing) {
    return (
      <input
        aria-label={ariaLabel}
        className="tgfc-node-title nodrag nowheel"
        value={title}
        autoFocus
        onBlur={() => setIsEditing(false)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === 'Escape') {
            event.currentTarget.blur()
          }
        }}
        onChange={(event) => onChange(event.target.value)}
      />
    )
  }
  return (
    <button type="button" className="tgfc-node-title-display" onDoubleClick={() => setIsEditing(true)} title="Double-click to rename">
      {title || 'Untitled'}
    </button>
  )
}

function PromptNodeInner({ id, data, selected }: NodeProps<ToorGenCanvasNode>) {
  const { onPatch } = useContext(ToorGenCanvasContext)
  const promptText = data.prompt || ''
  const [draftPromptText, setDraftPromptText] = useState(promptText)
  const [isEditing, setIsEditing] = useState(false)
  const commitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clearCommitTimer = useCallback(() => {
    if (!commitTimerRef.current) return
    window.clearTimeout(commitTimerRef.current)
    commitTimerRef.current = null
  }, [])

  const commitPrompt = useCallback((nextPrompt: string) => {
    const normalized = nextPrompt
    if (normalized === (data.prompt || '')) return
    onPatch(id, { prompt: normalized })
  }, [data.prompt, id, onPatch])

  useEffect(() => () => clearCommitTimer(), [clearCommitTimer])

  const scheduleCommit = useCallback((nextPrompt: string) => {
    clearCommitTimer()
    commitTimerRef.current = window.setTimeout(() => {
      commitTimerRef.current = null
      commitPrompt(nextPrompt)
    }, 140)
  }, [clearCommitTimer, commitPrompt])

  const displayPromptText = isEditing ? draftPromptText : promptText
  const promptCharacterCount = displayPromptText.length
  const isOverPromptLimit = promptCharacterCount > SEEDANCE_PROMPT_CHARACTER_LIMIT
  return (
    <section className={`tgfc-node tgfc-node--prompt${selected ? ' is-selected' : ''}`}>
      <NodeResizer minWidth={240} minHeight={170} isVisible={selected} lineStyle={{ borderColor: '#d9f02f' }} handleStyle={{ background: '#d9f02f', borderColor: '#07080b' }} />
      <CtrlHandle nodeId={id} type="target" position={Position.Left} className="tgfc-handle" />
      <CtrlHandle nodeId={id} type="source" position={Position.Right} className="tgfc-handle" />
      <div className="tgfc-node-dragbar"><EditableNodeTitle ariaLabel="Prompt node title" title={data.title} onChange={(value) => onPatch(id, { title: value })} /></div>
      <textarea
        className="tgfc-node-textarea nodrag nowheel"
        value={displayPromptText}
        onFocus={() => {
          setIsEditing(true)
          setDraftPromptText(promptText)
        }}
        onBlur={() => {
          setIsEditing(false)
          clearCommitTimer()
          commitPrompt(draftPromptText)
        }}
        onChange={(event) => {
          const nextPrompt = event.target.value
          setDraftPromptText(nextPrompt)
          scheduleCommit(nextPrompt)
        }}
        onKeyDownCapture={(event) => {
          // Keep native typing/edit-history behavior inside textarea unaffected by canvas shortcuts.
          event.stopPropagation()
        }}
        placeholder="Prompt direction..."
        rows={5}
      />
      <div className={`tgfc-node-count${isOverPromptLimit ? ' is-over-limit' : ''}`} aria-live="polite">
        {promptCharacterCount.toLocaleString()} / {SEEDANCE_PROMPT_CHARACTER_LIMIT.toLocaleString()} characters
      </div>
    </section>
  )
}
const PromptNode = memo(PromptNodeInner, (prev, next) => prev.selected === next.selected && prev.data === next.data)

function ImageReferenceNodeInner({ id, data, selected }: NodeProps<ToorGenCanvasNode>) {
  const { onPatch } = useContext(ToorGenCanvasContext)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [libraryQuery, setLibraryQuery] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [urlInput, setUrlInput] = useState('')

  // Supports multiple images — backward compat: if imageUrls not set, fall back to imageUrl
  const effectiveImageUrls: string[] = useMemo(() => {
    if (data.imageUrls && data.imageUrls.length > 0) return data.imageUrls
    if (data.imageUrl) return [data.imageUrl]
    return []
  }, [data.imageUrls, data.imageUrl])

  const addImage = (url: string) => {
    const next = [...effectiveImageUrls, url]
    onPatch(id, { imageUrls: next, imageUrl: next[0] })
  }

  const removeImage = (index: number) => {
    const next = effectiveImageUrls.filter((_, i) => i !== index)
    onPatch(id, { imageUrls: next, imageUrl: next[0] || '' })
  }

  const libraryEntries = useMemo(() => {
    if (!libraryOpen) return []
    try {
      const parsed = JSON.parse(localStorage.getItem('toorgen_reference_library_v1') || '[]') as unknown[]
      if (!Array.isArray(parsed)) return []
      return parsed
        .filter((e): e is { id: string; url: string; createdAt: number } =>
          !!e && typeof e === 'object' && typeof (e as { url?: unknown }).url === 'string' && /^https?:\/\//i.test((e as { url: string }).url)
        )
        .sort((a, b) => b.createdAt - a.createdAt)
    } catch {
      return []
    }
  }, [libraryOpen])

  const filteredEntries = useMemo(() => {
    if (!libraryQuery.trim()) return libraryEntries
    const q = libraryQuery.toLowerCase()
    return libraryEntries.filter((e) => e.url.toLowerCase().includes(q))
  }, [libraryEntries, libraryQuery])

  return (
    <section className={`tgfc-node tgfc-node--image${selected ? ' is-selected' : ''}`}>
      <NodeResizer minWidth={300} minHeight={230} isVisible={selected} lineStyle={{ borderColor: '#d9f02f' }} handleStyle={{ background: '#d9f02f', borderColor: '#07080b' }} />
      <CtrlHandle nodeId={id} type="target" position={Position.Left} className="tgfc-handle" />
      <CtrlHandle nodeId={id} type="source" position={Position.Right} className="tgfc-handle" />
      <div className="tgfc-node-dragbar"><EditableNodeTitle ariaLabel="Image reference node title" title={data.title} onChange={(value) => onPatch(id, { title: value })} /></div>
      <div className="tgfc-image-slots">
        {effectiveImageUrls.length === 0 ? (
          <span className="tgfc-image-slots-empty">No images added yet</span>
        ) : effectiveImageUrls.map((url, i) => (
          <div key={url + String(i)} className="tgfc-image-slot">
            <img src={url} alt={`Reference ${i + 1}`} />
            {effectiveImageUrls.length > 1 && (
              <span className="tgfc-image-slot-index">{i + 1}</span>
            )}
            <button type="button" className="tgfc-image-slot-remove nodrag" onClick={() => removeImage(i)} title="Remove">✕</button>
          </div>
        ))}
      </div>
      <input
        className="tgfc-node-input nodrag nowheel"
        value={urlInput}
        onChange={(e) => setUrlInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && urlInput.trim()) {
            addImage(urlInput.trim())
            setUrlInput('')
          }
        }}
        placeholder="Paste URL and press Enter…"
      />
      {uploadError ? <p className="tgfc-lib-upload-error">{uploadError}</p> : null}
      <div className="tgfc-node-actions">
        <button type="button" className="tgfc-node-action nodrag" disabled={uploading} onClick={() => { setUploadError(''); fileInputRef.current?.click() }}>{uploading ? 'Uploading…' : 'Upload'}</button>
        <button type="button" className="tgfc-node-action nodrag" onClick={() => { setLibraryQuery(''); setLibraryOpen(true) }}>Library</button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (!file) return
          event.currentTarget.value = ''
          setUploading(true)
          setUploadError('')
          void uploadReferenceImageToHost(file)
            .then((url) => addImage(url))
            .catch((err: unknown) => setUploadError(err instanceof Error ? err.message : 'Upload failed.'))
            .finally(() => setUploading(false))
        }}
      />
      {libraryOpen ? createPortal(
        <div className="tgfc-lib-backdrop" onClick={() => setLibraryOpen(false)}>
          <div className="tgfc-lib-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="tgfc-lib-header">
              <span>Reference Library</span>
              <button type="button" className="tgfc-lib-close" onClick={() => setLibraryOpen(false)}>✕</button>
            </div>
            <input
              className="tgfc-lib-search"
              value={libraryQuery}
              onChange={(e) => setLibraryQuery(e.target.value)}
              placeholder="Search…"
            />
            <div className="tgfc-lib-grid">
              {filteredEntries.length === 0 ? (
                <p className="tgfc-lib-empty">No library images yet.</p>
              ) : filteredEntries.map((entry) => (
                <button
                  key={entry.id}
                  type="button"
                  className="tgfc-lib-tile"
                  onClick={() => { addImage(entry.url); setLibraryOpen(false) }}
                  title={entry.url}
                >
                  <img src={entry.url} alt="Library entry" loading="lazy" />
                </button>
              ))}
            </div>
          </div>
        </div>,
        document.body
      ) : null}
    </section>
  )
}
const ImageReferenceNode = memo(ImageReferenceNodeInner, (prev, next) => prev.selected === next.selected && prev.data === next.data)

function VideoReferenceNodeInner({ id, data, selected }: NodeProps<ToorGenCanvasNode>) {
  const { onPatch } = useContext(ToorGenCanvasContext)
  return (
    <section className={`tgfc-node tgfc-node--video${selected ? ' is-selected' : ''}`}>
      <NodeResizer minWidth={260} minHeight={240} isVisible={selected} lineStyle={{ borderColor: '#d9f02f' }} handleStyle={{ background: '#d9f02f', borderColor: '#07080b' }} />
      <CtrlHandle nodeId={id} type="target" position={Position.Left} className="tgfc-handle" />
      <CtrlHandle nodeId={id} type="source" position={Position.Right} className="tgfc-handle" />
      <div className="tgfc-node-dragbar"><EditableNodeTitle ariaLabel="Video reference node title" title={data.title} onChange={(value) => onPatch(id, { title: value })} /></div>
      <div className="tgfc-media-frame">{data.videoUrl ? <video src={data.videoUrl} muted playsInline controls /> : <span>Video reference</span>}</div>
      <input className="tgfc-node-input nodrag nowheel" value={data.videoUrl || ''} onChange={(event) => onPatch(id, { videoUrl: event.target.value })} placeholder="https://video-reference.mp4" />
    </section>
  )
}
const VideoReferenceNode = memo(VideoReferenceNodeInner, (prev, next) => prev.selected === next.selected && prev.data === next.data)

function AudioReferenceNodeInner({ id, data, selected }: NodeProps<ToorGenCanvasNode>) {
  const { onPatch } = useContext(ToorGenCanvasContext)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  return (
    <section className={`tgfc-node tgfc-node--video${selected ? ' is-selected' : ''}`}>
      <NodeResizer minWidth={260} minHeight={220} isVisible={selected} lineStyle={{ borderColor: '#d9f02f' }} handleStyle={{ background: '#d9f02f', borderColor: '#07080b' }} />
      <CtrlHandle nodeId={id} type="target" position={Position.Left} className="tgfc-handle" />
      <CtrlHandle nodeId={id} type="source" position={Position.Right} className="tgfc-handle" />
      <div className="tgfc-node-dragbar"><EditableNodeTitle ariaLabel="Audio reference node title" title={data.title} onChange={(value) => onPatch(id, { title: value })} /></div>
      <div className="tgfc-media-frame">{data.audioUrl ? <audio src={data.audioUrl} controls /> : <span>Audio reference</span>}</div>
      <input className="tgfc-node-input nodrag nowheel" value={data.audioUrl || ''} onChange={(event) => onPatch(id, { audioUrl: event.target.value })} placeholder="https://voice-reference.mp3" />
      {uploadError ? <p className="tgfc-lib-upload-error">{uploadError}</p> : null}
      <div className="tgfc-node-actions">
        <button type="button" className="tgfc-node-action nodrag" disabled={uploading} onClick={() => { setUploadError(''); fileInputRef.current?.click() }}>{uploading ? 'Uploading...' : 'Upload MP3/WAV'}</button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".mp3,.wav,audio/mpeg,audio/wav,audio/x-wav"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (!file) return
          event.currentTarget.value = ''
          const isMp3 = file.type === 'audio/mpeg' || /\.mp3$/i.test(file.name)
          const isWav = file.type === 'audio/wav' || file.type === 'audio/x-wav' || /\.wav$/i.test(file.name)
          if (!isMp3 && !isWav) {
            setUploadError('Only MP3 or WAV files are allowed.')
            return
          }
          setUploading(true)
          setUploadError('')
          void uploadReferenceAudioToHost(file)
            .then((url) => onPatch(id, { audioUrl: url }))
            .catch((err: unknown) => setUploadError(err instanceof Error ? err.message : 'Upload failed.'))
            .finally(() => setUploading(false))
        }}
      />
    </section>
  )
}
const AudioReferenceNode = memo(AudioReferenceNodeInner, (prev, next) => prev.selected === next.selected && prev.data === next.data)

function GenerationNodeInner({ id, data, selected }: NodeProps<ToorGenCanvasNode>) {
  const {
    onPatch,
    onGenerate,
    onCopyJson,
    onChainFromOutput,
    model: globalModel,
    mode: globalMode,
    duration: globalDuration,
    aspectRatio: globalAspectRatio,
    nodeStatuses,
    nodeTaskIds,
    nodeVideoUrls,
    nodeErrorMessages,
    nodeRequestedModels,
    nodeEffectiveModels,
    nodeProviderLabels,
    promptLengthByNodeId,
    copyJsonStatus,
    connectedCounts,
  } = useContext(ToorGenCanvasContext)
  const nodeStatus = nodeStatuses[id] || 'IDLE'
  const nodeTaskId = nodeTaskIds[id] || ''
  const nodeVideoUrl = nodeVideoUrls[id] || ''
  const nodeErrorMessage = nodeErrorMessages[id] || ''
  const nodeRequestedModel = nodeRequestedModels[id] || ''
  const nodeEffectiveModel = nodeEffectiveModels[id] || nodeRequestedModel
  const nodeProviderLabel = nodeProviderLabels[id] || ''
  const isLegacyPromptLimitError = /^Seedance prompt is\s+[\d,]+\s+characters\.\s+Shorten it to\s+[\d,]+\s+characters\s+or\s+less\.?$/i.test(nodeErrorMessage.trim())
  const visibleNodeErrorMessage = isLegacyPromptLimitError ? '' : nodeErrorMessage
  const nodeIsGenerating = nodeStatus === 'SUBMITTING' || nodeStatus === 'IN_PROGRESS'
  const promptLength = promptLengthByNodeId[id] || 0
  const isPromptOverLimit = promptLength > SEEDANCE_PROMPT_CHARACTER_LIMIT
  const count = connectedCounts.get(id) || 0
  const connectedSummary = count > 0 ? `${count} input${count === 1 ? '' : 's'} connected` : 'Connect prompt, image, or video nodes'
  const inputSockets = Object.entries(GENERATION_INPUT_SOCKET_RULES).map(([socketId, rule]) => ({ id: socketId, ...rule }))

  const effectiveModel = data.nodeModel ?? globalModel
  const effectiveDuration = data.nodeDuration ?? globalDuration
  const effectiveAspectRatio = data.nodeAspectRatio ?? globalAspectRatio
  const nodeGenerationMode = data.nodeGenerationMode ?? 'normal'
  const effectiveVideoMode = data.nodeVideoMode ?? globalMode

  return (
    <section className={`tgfc-node tgfc-node--generation${selected ? ' is-selected' : ''}`}>
      <NodeResizer minWidth={330} minHeight={300} isVisible={selected} lineStyle={{ borderColor: '#d9f02f' }} handleStyle={{ background: '#d9f02f', borderColor: '#07080b' }} />
      {inputSockets.map((socket) => (
        <CtrlHandle
          key={socket.id}
          nodeId={id}
          id={socket.id}
          type="target"
          position={Position.Left}
          className={`tgfc-handle tgfc-handle--generation-input is-${socket.id}`}
        />
      ))}
      <CtrlHandle nodeId={id} type="source" position={Position.Right} className="tgfc-handle" />
      <div className="tgfc-generation-sockets" aria-hidden="true">
        {inputSockets.map((socket) => (
          <div key={socket.id} className={`tgfc-generation-socket-label is-${socket.id}`}>
            <strong>{socket.label}</strong>
            <span>{socket.accepts}</span>
          </div>
        ))}
      </div>
      <div className="tgfc-node-dragbar"><EditableNodeTitle ariaLabel="Generation node title" title={data.title} onChange={(value) => onPatch(id, { title: value })} /></div>
      <p>{data.description || 'Connect inputs, then render.'}</p>
      <div className="tgfc-generation-node-preview">
        {nodeVideoUrl ? <video key={nodeVideoUrl} src={nodeVideoUrl} controls playsInline /> : nodeIsGenerating ? <span>Rendering...</span> : <span>Video preview</span>}
      </div>
      {nodeTaskId ? <div className="tgfc-node-task-id">Task: {nodeTaskId}</div> : null}
      {(nodeProviderLabel || nodeEffectiveModel) ? (
        <div className="tgfc-node-runtime-meta">
          {nodeProviderLabel ? `Backend: ${nodeProviderLabel}` : ''}
          {nodeProviderLabel && nodeEffectiveModel ? ' · ' : ''}
          {nodeEffectiveModel ? `Model: ${nodeEffectiveModel}` : ''}
        </div>
      ) : null}
      {visibleNodeErrorMessage ? <div className="tgfc-error tgfc-node-error">{visibleNodeErrorMessage}</div> : null}
      {isPromptOverLimit ? (
        <div className="tgfc-error tgfc-node-error tgfc-node-prompt-limit-alert" role="alert" aria-live="assertive">
          Prompt too long: {promptLength.toLocaleString()} / {SEEDANCE_PROMPT_CHARACTER_LIMIT.toLocaleString()} characters.
        </div>
      ) : null}
      <div className={`tgfc-node-count${isPromptOverLimit ? ' is-over-limit' : ''}`}>
        Prompt: {promptLength.toLocaleString()} / {SEEDANCE_PROMPT_CHARACTER_LIMIT.toLocaleString()} characters
      </div>
      <span className="tgfc-connected-summary">{connectedSummary}</span>
      <div className="tgfc-node-mode-row">
        <select
          className="tgfc-node-input nodrag nowheel"
          value={nodeGenerationMode}
          onChange={(event) => onPatch(id, { nodeGenerationMode: event.target.value as 'normal' | 'extend' })}
          aria-label="Generation mode"
        >
          <option value="normal">Normal generation</option>
          <option value="extend">Extend clip</option>
        </select>
        <select
          className="tgfc-node-input nodrag nowheel"
          value={effectiveVideoMode}
          onChange={(event) => onPatch(id, { nodeVideoMode: event.target.value as 'text-to-video' | 'image-to-video' })}
          aria-label="Video mode"
        >
          <option value="text-to-video">Text to video</option>
          <option value="image-to-video">Image to video</option>
        </select>
      </div>
      <div className="tgfc-node-settings-row">
        <select
          className="tgfc-node-input nodrag nowheel"
          value={effectiveModel}
          onChange={(event) => onPatch(id, { nodeModel: event.target.value as ToorGenModel })}
          aria-label="Model"
        >
          <option value="atlas-2.0">2.0 (Atlas Cloud)</option>
          <option value="seedance-2.0-fast">2.0 Fast (Atlas Cloud)</option>
          <option value="seedance-2.0">2.0 (Seedance API)</option>
          <option value="seedance-1.5">1.5 (Seedance API)</option>
        </select>
        <select
          className="tgfc-node-input nodrag nowheel"
          value={String(effectiveDuration)}
          onChange={(event) => onPatch(id, { nodeDuration: Number(event.target.value) })}
          aria-label="Duration"
        >
          <option value="5">5s</option>
          <option value="10">10s</option>
          <option value="15">15s</option>
        </select>
        <select
          className="tgfc-node-input nodrag nowheel"
          value={effectiveAspectRatio}
          onChange={(event) => onPatch(id, { nodeAspectRatio: event.target.value as ToorGenAspectRatio })}
          aria-label="Aspect ratio"
        >
          <option value="16:9">16:9</option>
          <option value="9:16">9:16</option>
          <option value="4:3">4:3</option>
          <option value="3:4">3:4</option>
        </select>
      </div>
      <div className="tgfc-node-actions">
        <button type="button" className="tgfc-node-action nodrag" onClick={() => onCopyJson(id)}>
          {copyJsonStatus || 'Copy JSON'}
        </button>
        <button type="button" className="tgfc-generate-node-btn nodrag" disabled={isPromptOverLimit} onClick={() => onGenerate(id)}>
          {nodeIsGenerating ? 'Rendering...' : isPromptOverLimit ? 'Prompt too long' : 'Generate from inputs'}
        </button>
        {nodeStatus === 'SUCCESS' && (
          <button type="button" className="tgfc-chain-btn nodrag" title="Create an Extend node chained from this output" onClick={() => onChainFromOutput(id)}>
            Chain shot →
          </button>
        )}
      </div>
    </section>
  )
}
const GenerationNode = memo(GenerationNodeInner, (prev, next) => prev.selected === next.selected && prev.data === next.data)

const NODE_TYPES = {
  promptNode: PromptNode,
  'image-referenceNode': ImageReferenceNode,
  'video-referenceNode': VideoReferenceNode,
  'audio-referenceNode': AudioReferenceNode,
  generationNode: GenerationNode,
} as const

function ToorGenFlowCanvasInner(props: ToorGenFlowCanvasProps) {
  const {
    prompt,
    onPromptChange,
    duration,
    onDurationChange,
    aspectRatio,
    onAspectRatioChange,
    mode,
    onModeChange,
    model,
    onModelChange,
    status,
    isGenerating,
    consumedCredits,
    selectedVideoUrl,
    errorMessage,
    nodeStatuses = {},
    nodeTaskIds = {},
    nodeVideoUrls = {},
    nodeErrorMessages = {},
    nodeRequestedModels = {},
    nodeEffectiveModels = {},
    nodeProviderLabels = {},
    taskId,
    resumeTaskId,
    onResumeTaskIdChange,
    onResume,
    onGenerate,
    onSendRawJson,
    onStateChange,
  } = props
  const { getViewport, setViewport, screenToFlowPosition } = useReactFlow<ToorGenCanvasNode, ToorGenCanvasEdge>()
  const [collections, setCollections] = useState<ToorGenCollection[]>(() => loadCollections())
  const [activeCollectionId, setActiveCollectionId] = useState(() => {
    try {
      return localStorage.getItem(ACTIVE_COLLECTION_KEY) || loadCollections()[0]?.id || 'default'
    } catch {
      return loadCollections()[0]?.id || 'default'
    }
  })
  const [lastGraphJson, setLastGraphJson] = useState('')
  const [fallbackImageUrl, setFallbackImageUrl] = useState('')
  const [fallbackVideoUrl, setFallbackVideoUrl] = useState('')
  const [fallbackVideoUrl2, setFallbackVideoUrl2] = useState('')
  const [fallbackVideoUrl3, setFallbackVideoUrl3] = useState('')
  const [fallbackAudioUrls, setFallbackAudioUrls] = useState<[string, string, string]>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(AUDIO_REFS_KEY) || '["","",""]') as unknown
      if (Array.isArray(parsed) && parsed.length >= 3 && parsed.every((v) => typeof v === 'string')) {
        return [parsed[0], parsed[1], parsed[2]] as [string, string, string]
      }
    } catch {
      // ignore
    }
    return ['', '', '']
  })
  const [otherInstructions, setOtherInstructions] = useState('')
  const [storyBible, setStoryBible] = useState(() => {
    try {
      return localStorage.getItem(STORY_BIBLE_KEY) || DEFAULT_TOORGEN_STORY_BIBLE
    } catch {
      return DEFAULT_TOORGEN_STORY_BIBLE
    }
  })
  const [stylePrefix, setStylePrefix] = useState(() => {
    try {
      return localStorage.getItem(STYLE_PREFIX_KEY) || ''
    } catch {
      return ''
    }
  })
  const [strictConsistencyPreset, setStrictConsistencyPreset] = useState(() => {
    try {
      return localStorage.getItem(STRICT_CONSISTENCY_PRESET_KEY) === '1'
    } catch {
      return false
    }
  })
  const [autoShotSplit, setAutoShotSplit] = useState(() => {
    try {
      const saved = localStorage.getItem(AUTO_SHOT_SPLIT_KEY)
      return saved === null ? true : saved === '1'
    } catch {
      return true
    }
  })
  const [shotsPerSegment, setShotsPerSegment] = useState(() => {
    try {
      const parsed = Number(localStorage.getItem(SHOTS_PER_SEGMENT_KEY) || '3')
      if (!Number.isFinite(parsed)) return 3
      return Math.min(6, Math.max(1, Math.floor(parsed)))
    } catch {
      return 3
    }
  })
  const [charPhotoUploading, setCharPhotoUploading] = useState<Record<string, boolean>>({})
  const [refPickerOpen, setRefPickerOpen] = useState<{ kind: 'image' | 'video'; slot: string } | null>(null)
  const [refPickerQuery, setRefPickerQuery] = useState('')
  const [refFieldUploading, setRefFieldUploading] = useState<string | null>(null)
  const [refFieldUploadError, setRefFieldUploadError] = useState('')
  const [characterCards, setCharacterCards] = useState<CharacterCard[]>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(CHARACTER_CARDS_KEY) || '[]') as unknown[]
      if (Array.isArray(parsed)) {
        const cards = parsed
          .map((value) => {
            if (!value || typeof value !== 'object') return null
            const raw = value as Partial<CharacterCard>
            return createCharacterCard({
              id: typeof raw.id === 'string' && raw.id.trim() ? raw.id : undefined,
              name: typeof raw.name === 'string' ? raw.name : '',
              role: typeof raw.role === 'string' ? raw.role : '',
              appearance: typeof raw.appearance === 'string' ? raw.appearance : '',
              notes: typeof raw.notes === 'string' ? raw.notes : '',
              photos: Array.isArray(raw.photos) ? raw.photos.filter((p) => typeof p === 'string' && p.trim()) : [],
            })
          })
          .filter((card): card is CharacterCard => Boolean(card))
        if (cards.length > 0) return cards.slice(0, 8)
      }

      const legacyMentions = (localStorage.getItem(LEGACY_CHARACTER_MENTIONS_KEY) || '').trim()
      if (legacyMentions) {
        return [createCharacterCard({ name: 'Character 1', notes: legacyMentions })]
      }
    } catch {
      // Ignore parse failures and fall through to a blank card.
    }

    return [createCharacterCard()]
  })
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([])
  const [jsonTargetGenerationNodeId, setJsonTargetGenerationNodeId] = useState<string>('')
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([])
  const collectionsRef = useRef(collections)
  collectionsRef.current = collections
  const activeCollection = collections.find((collection) => collection.id === activeCollectionId) || collections[0] || createDefaultCollection()
  const [nodes, setNodes] = useState<ToorGenCanvasNode[]>(activeCollection.nodes)
  const [edges, setEdges] = useState<ToorGenCanvasEdge[]>(activeCollection.edges)
  const nodesRef = useRef(nodes)
  const edgesRef = useRef(edges)
  nodesRef.current = nodes
  edgesRef.current = edges
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const persistCollections = useCallback((nextCollections: ToorGenCollection[]) => {
    collectionsRef.current = nextCollections
    setCollections(nextCollections)
    persistCollectionsToStorage(nextCollections)
  }, [])

  const schedulePersist = useCallback(() => {
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current)
    persistTimerRef.current = setTimeout(() => {
      const latestNodes = nodesRef.current
      const latestEdges = edgesRef.current
      const viewport = getViewport()
      const updated = collectionsRef.current.map((c) =>
        c.id === activeCollectionId
          ? { ...c, nodes: latestNodes, edges: latestEdges, viewport, updatedAt: Date.now() }
          : c
      )
      collectionsRef.current = updated
      setCollections(updated)
      persistCollectionsToStorage(updated)
      onStateChange?.({ nodes: latestNodes, edges: latestEdges, viewport })
    }, 300)
  }, [activeCollectionId, getViewport, onStateChange])

  useEffect(() => {
    safeSetLocalStorage(ACTIVE_COLLECTION_KEY, activeCollectionId)
  }, [activeCollectionId])

  useEffect(() => {
    safeSetLocalStorage(STORY_BIBLE_KEY, storyBible)
    safeSetLocalStorage(STYLE_PREFIX_KEY, stylePrefix)
    safeSetLocalStorage(CHARACTER_CARDS_KEY, JSON.stringify(characterCards.slice(0, 8)))
    safeSetLocalStorage(AUDIO_REFS_KEY, JSON.stringify(fallbackAudioUrls))
    safeSetLocalStorage(STRICT_CONSISTENCY_PRESET_KEY, strictConsistencyPreset ? '1' : '0')
    safeSetLocalStorage(AUTO_SHOT_SPLIT_KEY, autoShotSplit ? '1' : '0')
    safeSetLocalStorage(SHOTS_PER_SEGMENT_KEY, String(shotsPerSegment))
  }, [autoShotSplit, characterCards, fallbackAudioUrls, shotsPerSegment, storyBible, strictConsistencyPreset, stylePrefix])

  // Restore the saved viewport after ReactFlow has mounted
  useEffect(() => {
    const savedViewport = activeCollection.viewport
    if (savedViewport) {
      requestAnimationFrame(() => setViewport(savedViewport))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally only on mount

  const activateCollection = useCallback((collectionId: string) => {
    const nextCollection = collections.find((collection) => collection.id === collectionId) || collections[0]
    if (!nextCollection) return
    setActiveCollectionId(nextCollection.id)
    setNodes(nextCollection.nodes)
    setEdges(nextCollection.edges)
    requestAnimationFrame(() => {
      if (nextCollection.viewport) setViewport(nextCollection.viewport)
    })
    onStateChange?.({ nodes: nextCollection.nodes, edges: nextCollection.edges, viewport: nextCollection.viewport })
  }, [collections, onStateChange, setViewport])

  const patchNode = useCallback((nodeId: string, patch: Partial<ToorGenNodeData>) => {
    setNodes((current) => current.map((node) => node.id === nodeId ? { ...node, data: { ...node.data, ...patch } } : node))
    schedulePersist()
  }, [schedulePersist])

  useEffect(() => {
    const generationNodes = nodes.filter((node) => node.data.kind === 'generation')
    if (generationNodes.length === 0) {
      if (jsonTargetGenerationNodeId) setJsonTargetGenerationNodeId('')
      return
    }
    if (!jsonTargetGenerationNodeId || !generationNodes.some((node) => node.id === jsonTargetGenerationNodeId)) {
      setJsonTargetGenerationNodeId(generationNodes[0].id)
    }
  }, [jsonTargetGenerationNodeId, nodes])

  const generateFromNode = useCallback((generationNodeId: string) => {
    const request = buildGenerationRequest({
      nodes: nodesRef.current,
      edges: edgesRef.current,
      generationNodeId,
      collectionId: activeCollection.id,
      collectionTitle: activeCollection.title,
      fallbackPrompt: prompt,
      fallbackImageUrl,
      fallbackVideoUrl,
      fallbackExtraVideoUrls: [fallbackVideoUrl2, fallbackVideoUrl3].filter(Boolean),
      fallbackAudioUrls,
      otherInstructions,
      stylePrefix,
      storyBible,
      characterCards,
      duration,
      aspectRatio,
      mode,
      model,
      strictConsistencyPreset,
      nodeVideoUrls,
    })
    setLastGraphJson(request.apiPayloadJson)
    const batches = autoShotSplit ? splitPromptIntoShotBatches(request.prompt, shotsPerSegment, strictConsistencyPreset) : []
    if (batches.length > 1) {
      batches.forEach((batch) => {
        onGenerate({
          ...request,
          prompt: batch.promptText,
          sourcePrompt: batch.promptText,
          storyContext: {
            ...(request.storyContext || {}),
            shotBatch: {
              index: batch.batchIndex,
              total: batch.totalBatches,
              startShot: batch.startShot,
              endShot: batch.endShot,
              shotCount: batch.shotCount,
            },
            autoShotSplit: true,
            shotsPerSegment,
          },
        })
      })
      return
    }
    onGenerate(request)
  }, [activeCollection.id, activeCollection.title, aspectRatio, autoShotSplit, characterCards, duration, fallbackAudioUrls, fallbackImageUrl, fallbackVideoUrl, fallbackVideoUrl2, fallbackVideoUrl3, mode, model, nodeVideoUrls, onGenerate, otherInstructions, prompt, shotsPerSegment, storyBible, strictConsistencyPreset, stylePrefix])

  const setRefUrl = useCallback((slot: string, url: string) => {
    const appendCharacterPhoto = (photos: string[] | undefined, nextUrl: string): string[] => {
      const current = (photos || []).filter((value) => typeof value === 'string' && value.trim())
      if (current.includes(nextUrl)) return current.slice(0, 5)
      return [...current, nextUrl].slice(0, 5)
    }
    // Try updating the draft first. If the draft is null the setter returns null
    // and we fall through to update live state instead.
    let appliedToDraft = false
    setBibleDraft((d) => {
      if (!d) return d
      appliedToDraft = true
      if (slot === 'image1') return { ...d, fallbackImageUrl: url }
      if (slot === 'video1') return { ...d, fallbackVideoUrl: url }
      if (slot === 'video2') return { ...d, fallbackVideoUrl2: url }
      if (slot === 'video3') return { ...d, fallbackVideoUrl3: url }
      if (slot === 'audio1') return { ...d, fallbackAudioUrls: [url, d.fallbackAudioUrls[1], d.fallbackAudioUrls[2]] }
      if (slot === 'audio2') return { ...d, fallbackAudioUrls: [d.fallbackAudioUrls[0], url, d.fallbackAudioUrls[2]] }
      if (slot === 'audio3') return { ...d, fallbackAudioUrls: [d.fallbackAudioUrls[0], d.fallbackAudioUrls[1], url] }
      if (slot.startsWith('char-photo:')) {
        const cardId = slot.slice('char-photo:'.length)
        if (!cardId) return d
        return {
          ...d,
          characterCards: d.characterCards.map((card) =>
            card.id === cardId
              ? { ...card, photos: appendCharacterPhoto(card.photos, url) }
              : card,
          ),
        }
      }
      return d
    })
    // setBibleDraft is synchronous in terms of the closure above running immediately,
    // but because React state batches the flag may not be reliable in concurrent mode.
    // To be safe we also check via the captured flag.
    if (!appliedToDraft) {
      if (slot === 'image1') setFallbackImageUrl(url)
      else if (slot === 'video1') setFallbackVideoUrl(url)
      else if (slot === 'video2') setFallbackVideoUrl2(url)
      else if (slot === 'video3') setFallbackVideoUrl3(url)
      else if (slot === 'audio1') setFallbackAudioUrls((current) => [url, current[1], current[2]])
      else if (slot === 'audio2') setFallbackAudioUrls((current) => [current[0], url, current[2]])
      else if (slot === 'audio3') setFallbackAudioUrls((current) => [current[0], current[1], url])
      else if (slot.startsWith('char-photo:')) {
        const cardId = slot.slice('char-photo:'.length)
        if (!cardId) return
        setCharacterCards((current) =>
          current.map((card) =>
            card.id === cardId
              ? { ...card, photos: appendCharacterPhoto(card.photos, url) }
              : card,
          ),
        )
      }
    }
  }, [])

  const uploadCharacterPhoto = useCallback(async (cardId: string, file: File, isDraftActive: boolean) => {
    setCharPhotoUploading((current) => ({ ...current, [cardId]: true }))
    try {
      const url = await uploadReferenceImageToHost(file)
      if (isDraftActive) {
        setBibleDraft((d) => d ? {
          ...d,
          characterCards: d.characterCards.map((card) =>
            card.id === cardId
              ? { ...card, photos: [...(card.photos || []), url].slice(0, 5) }
              : card
          )
        } : d)
      } else {
        setCharacterCards((current) => current.map((card) =>
          card.id === cardId
            ? { ...card, photos: [...(card.photos || []), url].slice(0, 5) }
            : card
        ))
      }
    } catch (err) {
      console.error('Character photo upload failed:', err)
    } finally {
      setCharPhotoUploading((current) => ({ ...current, [cardId]: false }))
    }
  }, [])

  const fetchAvailableCredits = useCallback(async () => {
    setCreditsLoading(true)
    try {
      const resp = await fetch(buildCanvasApiUrl('/api/seedance/account'))
      if (!resp.ok) { setAvailableCredits(null); return }
      const data = await resp.json() as { balance?: number; credits?: number; available_credits?: number }
      const balance = data.balance ?? data.credits ?? data.available_credits ?? null
      setAvailableCredits(typeof balance === 'number' ? balance : null)
    } catch {
      setAvailableCredits(null)
    } finally {
      setCreditsLoading(false)
    }
  }, [])

  const openBibleDialog = useCallback(() => {
    setBibleDraft({
      prompt,
      fallbackImageUrl,
      fallbackVideoUrl,
      fallbackVideoUrl2,
      fallbackVideoUrl3,
      fallbackAudioUrls: [...fallbackAudioUrls] as [string, string, string],
      otherInstructions,
      continuityBlock: '',
      storyBible,
      stylePrefix,
      strictConsistencyPreset,
      autoShotSplit,
      shotsPerSegment,
      characterCards: characterCards.map((c) => ({ ...c, photos: [...(c.photos || [])] })),
      duration,
      aspectRatio,
      mode,
      model,
    })
    setGenerationDefaultsOpen(true)
    void fetchAvailableCredits()
  }, [prompt, fallbackImageUrl, fallbackVideoUrl, fallbackVideoUrl2, fallbackVideoUrl3, fallbackAudioUrls, otherInstructions, storyBible, stylePrefix, strictConsistencyPreset, autoShotSplit, shotsPerSegment, characterCards, duration, aspectRatio, mode, model, fetchAvailableCredits])

  const saveBibleDialog = useCallback(() => {
    setBibleDraft((currentDraft) => {
      if (!currentDraft) return null
      onPromptChange(currentDraft.prompt)
      setFallbackImageUrl(currentDraft.fallbackImageUrl)
      setFallbackVideoUrl(currentDraft.fallbackVideoUrl)
      setFallbackVideoUrl2(currentDraft.fallbackVideoUrl2)
      setFallbackVideoUrl3(currentDraft.fallbackVideoUrl3)
      setFallbackAudioUrls(currentDraft.fallbackAudioUrls)
      setOtherInstructions(currentDraft.otherInstructions)
      setStoryBible(currentDraft.storyBible)
      setStylePrefix(currentDraft.stylePrefix)
      setStrictConsistencyPreset(currentDraft.strictConsistencyPreset)
      setAutoShotSplit(currentDraft.autoShotSplit)
      setShotsPerSegment(Math.min(6, Math.max(1, Math.floor(currentDraft.shotsPerSegment || 3))))
      setCharacterCards(currentDraft.characterCards)
      onDurationChange(currentDraft.duration)
      onAspectRatioChange(currentDraft.aspectRatio)
      onModeChange(currentDraft.mode)
      onModelChange(currentDraft.model)
      // Clear per-node aspect ratio overrides so the new global value takes effect on all nodes.
      setNodes((current) =>
        current.map((node) =>
          node.data.kind === 'generation'
            ? { ...node, data: { ...node.data, nodeAspectRatio: undefined } }
            : node,
        ),
      )
      return null
    })
    setGenerationDefaultsOpen(false)
  }, [onPromptChange, onDurationChange, onAspectRatioChange, onModeChange, onModelChange, setNodes])

  const cancelBibleDialog = useCallback(() => {
    setBibleDraft(null)
    setGenerationDefaultsOpen(false)
  }, [])

  const chainFromOutput = useCallback((sourceNodeId: string) => {
    const sourceNode = nodesRef.current.find((n) => n.id === sourceNodeId)
    if (!sourceNode) return
    const newNode: ToorGenCanvasNode = {
      ...createNode('generation', { x: sourceNode.position.x + 500, y: sourceNode.position.y }),
      data: {
        kind: 'generation',
        title: 'Extension',
        description: 'Extended from previous output.',
        nodeGenerationMode: 'extend',
      },
    }
    const newEdge: ToorGenCanvasEdge = {
      id: `tg-chain-${Date.now()}`,
      source: sourceNodeId,
      target: newNode.id,
      targetHandle: 'input-5',
      animated: false,
      reconnectable: 'target',
    }
    setNodes((current) => [...current, newNode])
    setEdges((current) => [...current, newEdge])
    schedulePersist()
  }, [schedulePersist])

  const connectedCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const edge of edges) {
      if (edge.target) {
        counts.set(edge.target, (counts.get(edge.target) || 0) + 1)
      }
    }
    return counts
  }, [edges])

  const refPickerImageEntries = useMemo(() => {
    if (refPickerOpen?.kind !== 'image') return []
    try {
      const parsed = JSON.parse(localStorage.getItem('toorgen_reference_library_v1') || '[]') as unknown[]
      if (!Array.isArray(parsed)) return []
      const q = refPickerQuery.trim().toLowerCase()
      return parsed
        .filter((e): e is { id: string; url: string; createdAt: number } =>
          !!e && typeof e === 'object' &&
          typeof (e as { url?: unknown }).url === 'string' &&
          /^https?:\/\//i.test((e as { url: string }).url)
        )
        .filter((e) => !q || e.url.toLowerCase().includes(q))
        .sort((a, b) => b.createdAt - a.createdAt)
    } catch { return [] }
  }, [refPickerOpen?.kind, refPickerQuery])

  const refPickerVideoEntries = useMemo(() => {
    if (refPickerOpen?.kind !== 'video') return []
    const seen = new Set<string>()
    const results: { url: string; prompt: string }[] = []
    try {
      const parsed = JSON.parse(localStorage.getItem('toorgen_history') || '[]') as unknown[]
      if (Array.isArray(parsed)) {
        for (const entry of parsed) {
          if (!entry || typeof entry !== 'object') continue
          const raw = entry as { videoUrl?: unknown; prompt?: unknown }
          if (typeof raw.videoUrl === 'string' && /^https?:\/\//i.test(raw.videoUrl) && !seen.has(raw.videoUrl)) {
            seen.add(raw.videoUrl)
            results.push({ url: raw.videoUrl, prompt: typeof raw.prompt === 'string' ? raw.prompt.slice(0, 80) : '' })
          }
        }
      }
    } catch { /* ignore */ }
    for (const url of Object.values(nodeVideoUrls)) {
      if (url && /^https?:\/\//i.test(url) && !seen.has(url)) {
        seen.add(url)
        results.push({ url, prompt: '' })
      }
    }
    const q = refPickerQuery.trim().toLowerCase()
    const filtered = q ? results.filter((e) => e.url.toLowerCase().includes(q) || e.prompt.toLowerCase().includes(q)) : results
    return filtered.slice(0, 60)
  }, [refPickerOpen?.kind, nodeVideoUrls, refPickerQuery])

  const displayNodes = nodes

  const displayEdges = edges

  const handleNodesChange = useCallback((changes: NodeChange<ToorGenCanvasNode>[]) => {
    setNodes((current) => applyNodeChanges(changes, current))
    schedulePersist()
  }, [schedulePersist])

  const handleEdgesChange = useCallback((changes: EdgeChange<ToorGenCanvasEdge>[]) => {
    setEdges((current) => applyEdgeChanges(changes, current))
    schedulePersist()
  }, [schedulePersist])

  const handleConnect = useCallback((connection: Connection) => {
    if (!isAllowedGenerationConnection(nodesRef.current, connection)) return
    setEdges((current) => addEdge({ ...connection, id: createId('edge'), animated: false, reconnectable: 'target' }, current))
    schedulePersist()
  }, [schedulePersist])

  const handleReconnect = useCallback((oldEdge: ToorGenCanvasEdge, newConnection: Connection) => {
    if (!isAllowedGenerationConnection(nodesRef.current, newConnection)) return
    setEdges((current) => normalizeCanvasEdges(nodesRef.current, reconnectEdge(oldEdge, newConnection, current, { shouldReplaceId: false })))
    schedulePersist()
  }, [schedulePersist])

  const handleReconnectEnd = useCallback((_event: MouseEvent | TouchEvent, edge: ToorGenCanvasEdge, _handleType: string, connectionState: FinalConnectionState) => {
    if (connectionState.isValid === true) return
    setEdges((current) => current.filter((item) => item.id !== edge.id))
    schedulePersist()
  }, [schedulePersist])

  const validateConnection = useCallback((connection: ToorGenConnectionCandidate) => isAllowedGenerationConnection(nodesRef.current, connection), [])

  const addNode = (kind: ToorGenNodeKind) => {
    // Place the new node at the center of the currently visible canvas area
    const canvasCenter = screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
    const nodeSize = { width: 300, height: 220 }
    const nextNode = createNode(kind, {
      x: canvasCenter.x - nodeSize.width / 2,
      y: canvasCenter.y - nodeSize.height / 2,
    })
    setNodes((current) => [...current, nextNode])
    schedulePersist()
  }

  const addCollection = () => {
    const nextCollection = { ...createDefaultCollection(), id: createId('collection'), title: `Collection ${String(collections.length + 1).padStart(2, '0')}` }
    persistCollections([...collections, nextCollection])
    setActiveCollectionId(nextCollection.id)
    setNodes(nextCollection.nodes)
    setEdges(nextCollection.edges)
    requestAnimationFrame(() => {
      if (nextCollection.viewport) setViewport(nextCollection.viewport)
    })
    onStateChange?.({ nodes: nextCollection.nodes, edges: nextCollection.edges, viewport: nextCollection.viewport })
  }

  const renameCollection = (title: string) => {
    persistCollections(collections.map((collection) => collection.id === activeCollection.id ? { ...collection, title, updatedAt: Date.now() } : collection))
  }

  const deleteCollection = () => {
    if (collections.length <= 1) return
    const nextCollections = collections.filter((collection) => collection.id !== activeCollection.id)
    persistCollections(nextCollections)
    activateCollection(nextCollections[0].id)
  }

  const setCollectionScriptText = useCallback((nextScriptText: string) => {
    const next = collectionsRef.current.map((collection) =>
      collection.id === activeCollection.id
        ? { ...collection, scriptText: nextScriptText, updatedAt: Date.now() }
        : collection,
    )
    persistCollections(next)
  }, [activeCollection.id, persistCollections])

  const [jsonPanelOpen, setJsonPanelOpen] = useState(false)
  const [generationDefaultsOpen, setGenerationDefaultsOpen] = useState(false)
  const [copyJsonStatus, setCopyJsonStatus] = useState('')
  const [storyboardDialogOpen, setStoryboardDialogOpen] = useState(false)
  const [storyboardSceneId, setStoryboardSceneId] = useState('')
  const [bibleDraft, setBibleDraft] = useState<BibleDraft | null>(null)
  const [availableCredits, setAvailableCredits] = useState<number | null>(null)
  const [creditsLoading, setCreditsLoading] = useState(false)
  const storyboardScriptText = activeCollection.scriptText || ''
  const storyboardScriptBeats = useMemo(() => splitStoryboardScriptBeats(storyboardScriptText), [storyboardScriptText])

  const storyboardScenes = useMemo<StoryboardSceneSummary[]>(() => {
    const generationNodes = nodes
      .filter((node) => node.data.kind === 'generation')
      .slice()
      .sort((left, right) => (left.position.y - right.position.y) || (left.position.x - right.position.x))

    const sceneNodes = generationNodes.length > 0
      ? generationNodes
      : nodes
        .filter((node) => node.data.kind === 'prompt')
        .slice()
        .sort((left, right) => (left.position.y - right.position.y) || (left.position.x - right.position.x))

    return sceneNodes.map((sceneNode, index) => {
      const shotNodes = getConnectedInputNodes(nodes, edges, sceneNode.id)
        .slice()
        .sort((left, right) => (left.position.y - right.position.y) || (left.position.x - right.position.x))
      const scriptBeat = storyboardScriptBeats[index] || ''
      return {
        id: sceneNode.id,
        title: sceneNode.data.title || `Scene ${index + 1}`,
        subtitle: scriptBeat || sceneNode.data.description || sceneNode.data.prompt || `${shotNodes.length} shot${shotNodes.length === 1 ? '' : 's'}`,
        scriptBeat,
        node: sceneNode,
        shots: shotNodes.map((shotNode) => ({
          id: shotNode.id,
          title: shotNode.data.title || shotNode.data.kind,
          kind: shotNode.data.kind,
          snippet: getNodeSnippet(shotNode),
        })),
      }
    })
  }, [edges, nodes, storyboardScriptBeats])

  const storyboardSelectedScene = useMemo(
    () => storyboardScenes.find((scene) => scene.id === storyboardSceneId) || storyboardScenes[0] || null,
    [storyboardSceneId, storyboardScenes],
  )
  const storyboardSelectedSceneIndex = useMemo(
    () => storyboardSelectedScene ? storyboardScenes.findIndex((scene) => scene.id === storyboardSelectedScene.id) : -1,
    [storyboardScenes, storyboardSelectedScene],
  )
  const storyboardSelectedBeat = storyboardSelectedSceneIndex >= 0 ? (storyboardScriptBeats[storyboardSelectedSceneIndex] || '') : ''

  useEffect(() => {
    if (!storyboardDialogOpen) return
    setStoryboardSceneId((current) => {
      if (current && storyboardScenes.some((scene) => scene.id === current)) return current
      return storyboardScenes[0]?.id || ''
    })
  }, [storyboardDialogOpen, storyboardScenes])

  useEffect(() => {
    if (!storyboardDialogOpen) return

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setStoryboardDialogOpen(false)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [storyboardDialogOpen])

  const focusNodeInViewport = useCallback((nodeId: string) => {
    const node = nodesRef.current.find((entry) => entry.id === nodeId)
    if (!node) return
    const zoom = getViewport().zoom || 1
    const { width, height } = getNodePreviewSize(node)
    const viewport = {
      x: Math.round((window.innerWidth / 2) - ((node.position.x + (width / 2)) * zoom)),
      y: Math.round((window.innerHeight / 2) - ((node.position.y + (height / 2)) * zoom)),
      zoom,
    }
    setViewport(viewport)
    setSelectedNodeIds([nodeId])
    window.requestAnimationFrame(() => schedulePersist())
  }, [getViewport, schedulePersist, setViewport])

  const upsertScenePromptInGraph = useCallback((params: {
    sourceNodes: ToorGenCanvasNode[]
    sourceEdges: ToorGenCanvasEdge[]
    generationNodeId: string
    promptText: string
    sceneLabel: string
  }) => {
    const text = params.promptText.trim()
    if (!text) return { nodes: params.sourceNodes, edges: params.sourceEdges, applied: false }

    const sceneNode = params.sourceNodes.find((node) => node.id === params.generationNodeId && node.data.kind === 'generation')
    if (!sceneNode) return { nodes: params.sourceNodes, edges: params.sourceEdges, applied: false }

    const promptEdge = params.sourceEdges.find((edge) => {
      if (edge.target !== params.generationNodeId) return false
      const sourceNode = params.sourceNodes.find((node) => node.id === edge.source)
      return sourceNode?.data.kind === 'prompt'
    })

    if (promptEdge) {
      const nextNodes = params.sourceNodes.map((node) =>
        node.id === promptEdge.source
          ? {
              ...node,
              data: {
                ...node.data,
                title: node.data.title || `${params.sceneLabel} script`,
                prompt: text,
              },
            }
          : node,
      )
      return { nodes: nextNodes, edges: params.sourceEdges, applied: true }
    }

    const connectedCount = params.sourceEdges.filter((edge) => edge.target === params.generationNodeId).length
    const newPromptNode: ToorGenCanvasNode = {
      ...createNode('prompt', {
        x: sceneNode.position.x - 360,
        y: sceneNode.position.y + connectedCount * 26,
      }),
      data: {
        kind: 'prompt',
        title: `${params.sceneLabel} script`,
        prompt: text,
      },
    }
    const newEdge: ToorGenCanvasEdge = {
      id: createId('edge'),
      source: newPromptNode.id,
      target: params.generationNodeId,
      targetHandle: 'input-1',
      animated: false,
      reconnectable: 'target',
    }

    const nextNodes = [...params.sourceNodes, newPromptNode]
    const nextEdges = normalizeCanvasEdges(nextNodes, [...params.sourceEdges, newEdge])
    return { nodes: nextNodes, edges: nextEdges, applied: true }
  }, [])

  const applyStoryboardBeatToSelectedScene = useCallback(() => {
    if (!storyboardSelectedScene || !storyboardSelectedBeat.trim()) return
    const sceneNumber = storyboardSelectedSceneIndex >= 0 ? storyboardSelectedSceneIndex + 1 : 1
    const result = upsertScenePromptInGraph({
      sourceNodes: nodesRef.current,
      sourceEdges: edgesRef.current,
      generationNodeId: storyboardSelectedScene.id,
      promptText: storyboardSelectedBeat,
      sceneLabel: `Scene ${sceneNumber}`,
    })
    if (!result.applied) return
    setNodes(result.nodes)
    setEdges(result.edges)
    schedulePersist()
  }, [schedulePersist, storyboardSelectedBeat, storyboardSelectedScene, storyboardSelectedSceneIndex, upsertScenePromptInGraph])

  const applyStoryboardScriptToAllScenes = useCallback(() => {
    if (storyboardScenes.length === 0 || storyboardScriptBeats.length === 0) return

    let nextNodes = nodesRef.current
    let nextEdges = edgesRef.current
    let changed = false

    storyboardScenes.forEach((scene, index) => {
      const beat = storyboardScriptBeats[index]
      if (!beat) return
      const result = upsertScenePromptInGraph({
        sourceNodes: nextNodes,
        sourceEdges: nextEdges,
        generationNodeId: scene.id,
        promptText: beat,
        sceneLabel: `Scene ${index + 1}`,
      })
      if (!result.applied) return
      changed = true
      nextNodes = result.nodes
      nextEdges = result.edges
    })

    if (!changed) return
    setNodes(nextNodes)
    setEdges(nextEdges)
    schedulePersist()
  }, [schedulePersist, storyboardScenes, storyboardScriptBeats, upsertScenePromptInGraph])

  const buildRequestForGenerationNode = useCallback((generationNodeId: string, sourceNodes = nodesRef.current, sourceEdges = edgesRef.current) => buildGenerationRequest({
    nodes: sourceNodes,
    edges: sourceEdges,
    generationNodeId,
    collectionId: activeCollection.id,
    collectionTitle: activeCollection.title,
    fallbackPrompt: prompt,
    fallbackImageUrl,
    fallbackVideoUrl,
    fallbackExtraVideoUrls: [fallbackVideoUrl2, fallbackVideoUrl3].filter(Boolean),
    fallbackAudioUrls,
    otherInstructions,
    stylePrefix,
    storyBible,
    characterCards,
    duration,
    aspectRatio,
    mode,
    model,
    strictConsistencyPreset,
    nodeVideoUrls,
  }), [activeCollection.id, activeCollection.title, aspectRatio, characterCards, duration, fallbackAudioUrls, fallbackImageUrl, fallbackVideoUrl, fallbackVideoUrl2, fallbackVideoUrl3, mode, model, nodeVideoUrls, otherInstructions, prompt, storyBible, strictConsistencyPreset, stylePrefix])

  const promptLengthByNodeId = useMemo(() => {
    const lengths: Record<string, number> = {}
    for (const node of nodes) {
      if (node.data.kind !== 'generation') continue
      try {
        const request = buildRequestForGenerationNode(node.id, nodes, edges)
        lengths[node.id] = request.prompt.trim().length
      } catch {
        lengths[node.id] = 0
      }
    }
    return lengths
  }, [buildRequestForGenerationNode, edges, nodes])

  const previewJson = useMemo(() => {
    if (!jsonPanelOpen) return ''
    const generationNode = (jsonTargetGenerationNodeId
      ? nodes.find((node) => node.id === jsonTargetGenerationNodeId && node.data.kind === 'generation')
      : null) || nodes.find((node) => node.data.kind === 'generation')
    if (!generationNode) return ''
    return buildRequestForGenerationNode(generationNode.id, nodes, edges).apiPayloadJson
  }, [jsonPanelOpen, buildRequestForGenerationNode, edges, jsonTargetGenerationNodeId, nodes])

  const currentGraphJson = previewJson || lastGraphJson

  const [jsonEditorValue, setJsonEditorValue] = useState('')
  const [sendJsonStatus, setSendJsonStatus] = useState('')

  useEffect(() => {
    if (currentGraphJson) setJsonEditorValue(currentGraphJson)
  }, [currentGraphJson])

  const jsonTargetGenerationNode = useMemo(
    () => nodes.find((node) => node.id === jsonTargetGenerationNodeId && node.data.kind === 'generation') || null,
    [jsonTargetGenerationNodeId, nodes],
  )

  const copyGraphJson = useCallback((generationNodeId?: string) => {
    const targetNodeId = generationNodeId
      || jsonTargetGenerationNodeId
      || nodesRef.current.find((node) => node.data.kind === 'generation')?.id
    if (!targetNodeId) return
    const request = buildRequestForGenerationNode(targetNodeId)
    setLastGraphJson(request.apiPayloadJson)
    setJsonTargetGenerationNodeId(targetNodeId)
    setCopyJsonStatus('Copying...')
    void copyTextToClipboard(request.apiPayloadJson)
      .then(() => {
        setCopyJsonStatus('Copied')
        window.setTimeout(() => setCopyJsonStatus(''), 1400)
      })
      .catch(() => {
        setCopyJsonStatus('Copy failed')
        window.setTimeout(() => setCopyJsonStatus(''), 1800)
      })
  }, [buildRequestForGenerationNode, jsonTargetGenerationNodeId])

  const requestDeleteSelected = useCallback(() => {
    if (selectedNodeIds.length === 0) return
    setPendingDeleteIds(selectedNodeIds)
  }, [selectedNodeIds])

  const confirmDeleteNodes = () => {
    if (pendingDeleteIds.length === 0) return
    const deleteSet = new Set(pendingDeleteIds)
    setNodes((current) => current.filter((node) => !deleteSet.has(node.id)))
    setEdges((current) => current.filter((edge) => !deleteSet.has(edge.source) && !deleteSet.has(edge.target)))
    setSelectedNodeIds([])
    setPendingDeleteIds([])
    schedulePersist()
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const tagName = target?.tagName.toLowerCase()
      const isEditing = tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target?.isContentEditable
      if (isEditing) return
      if (event.key !== 'Delete' && event.key !== 'Backspace') return
      if (selectedNodeIds.length === 0) return
      event.preventDefault()
      setPendingDeleteIds(selectedNodeIds)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedNodeIds])

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const target = event.target as HTMLElement | null
      const tagName = target?.tagName.toLowerCase()
      const isEditing = tagName === 'input' || tagName === 'textarea' || tagName === 'select' || target?.isContentEditable
      if (isEditing) return

      const imageItem = Array.from(event.clipboardData?.items || []).find((item) => item.type.startsWith('image/'))
      if (imageItem) {
        const file = imageItem.getAsFile()
        if (!file) return
        event.preventDefault()
        void fileToDataUrl(file).then((imageUrl) => {
          const nextNode = createNode('image-reference', screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 }))
          nextNode.data = { ...nextNode.data, title: 'Pasted image', imageUrl }
          setNodes((current) => [...current, nextNode])
          schedulePersist()
        })
        return
      }

      const text = event.clipboardData?.getData('text/plain')?.trim() || ''
      if (/^https?:\/\//i.test(text) && /\.(png|jpe?g|gif|webp|avif)(\?|#|$)/i.test(text)) {
        event.preventDefault()
        const nextNode = createNode('image-reference', screenToFlowPosition({ x: window.innerWidth / 2, y: window.innerHeight / 2 }))
        nextNode.data = { ...nextNode.data, title: 'Image URL', imageUrl: text }
        setNodes((current) => [...current, nextNode])
        schedulePersist()
      }
    }
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [schedulePersist, screenToFlowPosition])

  const handleSelectionChange = useCallback(({ nodes: selectedNodes }: { nodes: ToorGenCanvasNode[] }) => {
    const nextIds = selectedNodes.map((node) => node.id)
    const selectedGenerationNode = selectedNodes.find((node) => node.data.kind === 'generation')
    if (selectedGenerationNode) setJsonTargetGenerationNodeId(selectedGenerationNode.id)
    setSelectedNodeIds((currentIds) => {
      if (currentIds.length === nextIds.length && currentIds.every((id, index) => id === nextIds[index])) return currentIds
      return nextIds
    })
  }, [])

  const handleMoveEnd = useCallback((_event: MouseEvent | TouchEvent | null, viewport: { x: number; y: number; zoom: number }) => {
    const updated = collectionsRef.current.map((c) => c.id === activeCollectionId ? { ...c, viewport, updatedAt: Date.now() } : c)
    collectionsRef.current = updated
    setCollections(updated)
    persistCollectionsToStorage(updated)
  }, [activeCollectionId])

  const disconnectHandle = useCallback((nodeId: string, handleId: string | null, handleType: 'source' | 'target') => {
    setEdges((current) => current.filter((edge) => {
      if (handleType === 'source') {
        if (edge.source !== nodeId) return true
        if (handleId !== null) return edge.sourceHandle !== handleId
        return false
      } else {
        if (edge.target !== nodeId) return true
        if (handleId !== null) return edge.targetHandle !== handleId
        return false
      }
    }))
    schedulePersist()
  }, [schedulePersist])

  const canvasContextValue = useMemo<ToorGenCanvasContextValue>(() => ({
    onPatch: patchNode,
    onGenerate: generateFromNode,
    onCopyJson: copyGraphJson,
    onDisconnectHandle: disconnectHandle,
    onChainFromOutput: chainFromOutput,
    model,
    mode,
    duration,
    aspectRatio,
    nodeStatuses,
    nodeTaskIds,
    nodeVideoUrls,
    nodeErrorMessages,
    nodeRequestedModels,
    nodeEffectiveModels,
    nodeProviderLabels,
    promptLengthByNodeId,
    copyJsonStatus,
    connectedCounts,
  }), [patchNode, generateFromNode, copyGraphJson, disconnectHandle, chainFromOutput, model, mode, duration, aspectRatio, nodeStatuses, nodeTaskIds, nodeVideoUrls, nodeErrorMessages, nodeRequestedModels, nodeEffectiveModels, nodeProviderLabels, promptLengthByNodeId, copyJsonStatus, connectedCounts])

  const storyboardDialog = storyboardDialogOpen && typeof document !== 'undefined' ? createPortal(
    <div
      className="tgfc-storyboard-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) setStoryboardDialogOpen(false)
      }}
    >
      <section className="tgfc-storyboard-dialog" role="dialog" aria-modal="true" aria-label="Storyboard and script map">
        <header className="tgfc-storyboard-header">
          <div>
            <span className="tgfc-storyboard-kicker">SCRIPT MAP</span>
            <h3>{activeCollection.title || 'Episode'}</h3>
            <p>Write your script beats here, map them by scene order, and push them into prompt nodes with one click.</p>
          </div>
          <div className="tgfc-storyboard-header-actions">
            <span className="tgfc-storyboard-count">{storyboardScenes.length} scenes · {storyboardScriptBeats.length} beats</span>
            <button type="button" onClick={() => setStoryboardDialogOpen(false)}>Close</button>
          </div>
        </header>
        <div className="tgfc-storyboard-episode-row" aria-label="Episodes">
          {collections.map((collection) => (
            <button
              key={collection.id}
              type="button"
              className={collection.id === activeCollection.id ? 'is-active' : ''}
              onClick={() => {
                activateCollection(collection.id)
                setStoryboardSceneId('')
              }}
            >
              {collection.title}
            </button>
          ))}
        </div>
        <div className="tgfc-storyboard-body">
          <aside className="tgfc-storyboard-scenes">
            {storyboardScenes.map((scene, index) => {
              const isActive = scene.id === storyboardSelectedScene?.id
              return (
                <button
                  key={scene.id}
                  type="button"
                  className={`tgfc-storyboard-scene-card${isActive ? ' is-active' : ''}`}
                  onClick={() => {
                    setStoryboardSceneId(scene.id)
                    focusNodeInViewport(scene.node.id)
                  }}
                >
                  <span className="tgfc-storyboard-scene-index">Scene {index + 1}</span>
                  <strong>{scene.title}</strong>
                  <span>{scene.subtitle}</span>
                  <em>{scene.shots.length} shot{scene.shots.length === 1 ? '' : 's'}</em>
                </button>
              )
            })}
          </aside>
          <section className="tgfc-storyboard-detail">
            <div className="tgfc-storyboard-script-panel">
              <div className="tgfc-storyboard-script-head">
                <div>
                  <span className="tgfc-storyboard-detail-kicker">Script</span>
                  <h4>Episode script beats</h4>
                  <p>Use one line per beat. Line 1 maps to Scene 1, line 2 to Scene 2, and so on.</p>
                </div>
                <button
                  type="button"
                  onClick={applyStoryboardScriptToAllScenes}
                  disabled={storyboardScenes.length === 0 || storyboardScriptBeats.length === 0}
                >
                  Apply all beats to prompts
                </button>
              </div>
              <textarea
                className="tgfc-storyboard-script-input"
                value={storyboardScriptText}
                onChange={(event) => setCollectionScriptText(event.target.value)}
                placeholder={[
                  'The rules have to be clear.',
                  "The gems cannot just be rewards.",
                  'They need a real role.',
                  'And the city has to stay broken at the beginning.',
                ].join('\n')}
              />
            </div>

            {storyboardSelectedScene ? (
              <>
                <div className="tgfc-storyboard-detail-head">
                  <div>
                    <span className="tgfc-storyboard-detail-kicker">Selected scene</span>
                    <h4>{storyboardSelectedScene.title}</h4>
                    <p>{storyboardSelectedBeat || storyboardSelectedScene.subtitle}</p>
                  </div>
                  <div className="tgfc-storyboard-detail-actions">
                    <button
                      type="button"
                      onClick={applyStoryboardBeatToSelectedScene}
                      disabled={!storyboardSelectedBeat.trim()}
                    >
                      Apply selected beat
                    </button>
                    <button type="button" onClick={() => focusNodeInViewport(storyboardSelectedScene.node.id)}>Focus scene</button>
                  </div>
                </div>
                {storyboardSelectedBeat ? (
                  <div className="tgfc-storyboard-beat-preview">{storyboardSelectedBeat}</div>
                ) : (
                  <div className="tgfc-storyboard-empty">No script beat mapped to this scene yet. Add a line in the script editor above.</div>
                )}
                <div className="tgfc-storyboard-shot-grid">
                  {storyboardSelectedScene.shots.length > 0 ? storyboardSelectedScene.shots.map((shot) => (
                    <button
                      key={shot.id}
                      type="button"
                      className={`tgfc-storyboard-shot-card is-${shot.kind}`}
                      onClick={() => focusNodeInViewport(shot.id)}
                    >
                      <span className="tgfc-storyboard-shot-kind">{shot.kind.replace('-', ' ')}</span>
                      <strong>{shot.title}</strong>
                      <span>{shot.snippet || 'No short description yet.'}</span>
                    </button>
                  )) : (
                    <div className="tgfc-storyboard-empty">No connected shots yet. Add prompt, image, or video notes to this scene.</div>
                  )}
                </div>
              </>
            ) : (
              <div className="tgfc-storyboard-empty">No scenes found yet. Add generation nodes to build the storyboard.</div>
            )}
          </section>
        </div>
      </section>
    </div>, document.body) : null

  return (
    <section className="tgfc-shell">
      <div className="tgfc-toolbar">
        <select value={activeCollection.id} onChange={(event) => activateCollection(event.target.value)} aria-label="Collection">
          {collections.map((collection) => <option key={collection.id} value={collection.id}>{collection.title}</option>)}
        </select>
        <input value={activeCollection.title} onChange={(event) => renameCollection(event.target.value)} aria-label="Collection title" />
        <button type="button" onClick={addCollection}>New collection</button>
        <button type="button" onClick={deleteCollection} disabled={collections.length <= 1}>Delete</button>
        <span className="tgfc-toolbar-divider" />
        <button type="button" onClick={() => addNode('prompt')}>Prompt</button>
        <button type="button" onClick={() => addNode('image-reference')}>Image ref</button>
        <button type="button" onClick={() => addNode('video-reference')}>Video ref</button>
        <button type="button" onClick={() => addNode('audio-reference')}>Audio ref</button>
        <button type="button" onClick={() => addNode('generation')}>Generation</button>
        <button type="button" onClick={() => setStoryboardDialogOpen(true)}>Storyboard</button>
        <span className="tgfc-toolbar-divider" />
        <button type="button" className="tgfc-toolbar-bible-btn" onClick={openBibleDialog}>
          Bible &amp; Defaults
        </button>
        <button type="button" className="tgfc-delete-selected-toolbar" onClick={requestDeleteSelected} disabled={selectedNodeIds.length === 0}>Delete selected</button>
      </div>

      <ToorGenCanvasContext.Provider value={canvasContextValue}>
      <ReactFlow<ToorGenCanvasNode, ToorGenCanvasEdge>
        nodes={displayNodes}
        edges={displayEdges}
        nodeTypes={NODE_TYPES}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        isValidConnection={validateConnection}
        edgesReconnectable
        onReconnect={handleReconnect}
        onReconnectEnd={handleReconnectEnd}
        minZoom={0.18}
        maxZoom={2.2}
        fitView={false}
        zoomOnScroll
        panOnScroll={false}
        selectionOnDrag
        deleteKeyCode={null}
        onSelectionChange={handleSelectionChange}
        onNodeClick={(_event, node) => {
          if (node.data.kind === 'generation') setJsonTargetGenerationNodeId(node.id)
        }}
        onMoveEnd={handleMoveEnd}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1.2} color="#2a2e38" />
        <Controls position="top-right" className="tgfc-controls" />
      </ReactFlow>
      </ToorGenCanvasContext.Provider>

      {storyboardDialog}

      <ToorGenBibleDefaultsDialog
        open={generationDefaultsOpen}
        title={activeCollection.title || 'Collection'}
        description="Shared references and defaults applied to every generation in this collection."
        status={status}
        availableCredits={availableCredits}
        consumedCredits={consumedCredits}
        creditsLoading={creditsLoading}
        onRefreshCredits={() => void fetchAvailableCredits()}
        draft={bibleDraft}
        setDraft={setBibleDraft}
        selectedVideoUrl={selectedVideoUrl}
        isGenerating={isGenerating}
        model={model}
        mode={mode}
        duration={duration}
        aspectRatio={aspectRatio}
        resumeTaskId={resumeTaskId}
        onResumeTaskIdChange={onResumeTaskIdChange}
        onResume={onResume}
        onClose={cancelBibleDialog}
        onSave={saveBibleDialog}
        refFieldUploading={refFieldUploading}
        refFieldUploadError={refFieldUploadError}
        onUploadRefFile={async (slot, kind, file) => {
          setRefFieldUploading(slot)
          setRefFieldUploadError('')
          try {
            const url = kind === 'audio'
              ? await uploadReferenceAudioToHost(file)
              : await uploadReferenceImageToHost(file)
            setRefUrl(slot, url)
          } catch (err) {
            setRefFieldUploadError(err instanceof Error ? err.message : 'Upload failed.')
          } finally {
            setRefFieldUploading(null)
          }
        }}
        onRequestPick={(kind, slot) => {
          setRefPickerQuery('')
          setRefPickerOpen({ kind, slot })
        }}
        charPhotoUploading={charPhotoUploading}
        onUploadCharacterPhoto={(cardId, file) => uploadCharacterPhoto(cardId, file, true)}
        onRequestPickCharacterPhoto={(cardId) => {
          setRefPickerQuery('')
          setRefPickerOpen({ kind: 'image', slot: `char-photo:${cardId}` })
        }}
      />

      <aside className={`tgfc-floating-panel tgfc-preview-panel${jsonPanelOpen ? ' is-open' : ''}`}>
        <button type="button" className="tgfc-panel-head tgfc-panel-head--toggle" onClick={() => setJsonPanelOpen((v) => !v)}>
          <span>{jsonTargetGenerationNode ? `JSON • ${jsonTargetGenerationNode.data.title || 'Generation node'}` : 'Structured JSON'}</span>
          <span className="tgfc-panel-toggle-icon">{jsonPanelOpen ? '▲' : '▼'}</span>
          {taskId ? <strong title={taskId}>{taskId.slice(0, 10)}...</strong> : null}
        </button>
        {jsonPanelOpen ? (
          <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, gap: 6 }}>
            {errorMessage ? <div className="tgfc-error">{errorMessage}</div> : null}
            <div className="tgfc-json-actions">
              <button type="button" className="tgfc-copy-json-btn" onClick={() => copyGraphJson()}>
                {copyJsonStatus || 'Copy JSON'}
              </button>
              {onSendRawJson ? (
                <button
                  type="button"
                  className="tgfc-send-json-btn"
                  disabled={sendJsonStatus === 'Sending...'}
                  onClick={() => {
                    setSendJsonStatus('Sending...')
                    void onSendRawJson(jsonEditorValue)
                      .then(() => {
                        setSendJsonStatus('Sent!')
                        window.setTimeout(() => setSendJsonStatus(''), 2000)
                      })
                      .catch((err: Error) => {
                        setSendJsonStatus(`Error: ${err.message.slice(0, 40)}`)
                        window.setTimeout(() => setSendJsonStatus(''), 3000)
                      })
                  }}
                >
                  {sendJsonStatus || 'Send JSON'}
                </button>
              ) : null}
            </div>
            <textarea
              className="tgfc-json-textarea nodrag nowheel"
              value={jsonEditorValue}
              onChange={(e) => setJsonEditorValue(e.target.value)}
              spellCheck={false}
            />
          </div>
        ) : null}
      </aside>

      {pendingDeleteIds.length > 0 ? (
        <div className="tgfc-confirm-layer" role="dialog" aria-modal="true" aria-label="Delete selected nodes">
          <div className="tgfc-confirm-card">
            <strong>Delete {pendingDeleteIds.length} selected node{pendingDeleteIds.length === 1 ? '' : 's'}?</strong>
            <p>Connected lines will be removed too.</p>
            <div>
              <button type="button" onClick={() => setPendingDeleteIds([])}>Cancel</button>
              <button type="button" className="is-danger" onClick={confirmDeleteNodes}>Delete</button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Reference picker portal */}
      {refPickerOpen && typeof document !== 'undefined' ? createPortal(
        <div
          className="tgfc-refpicker-backdrop"
          role="presentation"
          onMouseDown={(e) => { if (e.target === e.currentTarget) setRefPickerOpen(null) }}
        >
          <div className="tgfc-refpicker-dialog" role="dialog" aria-modal="true">
            <div className="tgfc-lib-header">
              <span>{refPickerOpen.kind === 'image' ? 'Image library' : 'Generated clips'}</span>
              <button type="button" className="tgfc-lib-close" onClick={() => setRefPickerOpen(null)}>✕</button>
            </div>
            <input
              className="tgfc-lib-search"
              value={refPickerQuery}
              onChange={(e) => setRefPickerQuery(e.target.value)}
              placeholder="Search…"
              autoFocus
            />
            <div className={`tgfc-refpicker-grid${refPickerOpen.kind === 'video' ? ' is-video' : ''}`}>
              {refPickerOpen.kind === 'image' ? (
                refPickerImageEntries.length === 0 ? (
                  <p className="tgfc-lib-empty">No images in library yet. Upload images via an Image Reference node first.</p>
                ) : refPickerImageEntries.map((entry) => (
                  <button
                    key={entry.id}
                    type="button"
                    className="tgfc-lib-tile"
                    onClick={() => { setRefUrl(refPickerOpen.slot, entry.url); setRefPickerOpen(null) }}
                    title={entry.url}
                  >
                    <img src={entry.url} alt="Library image" loading="lazy" />
                  </button>
                ))
              ) : (
                refPickerVideoEntries.length === 0 ? (
                  <p className="tgfc-lib-empty">No generated clips yet. Generate videos first, then pick them as references here.</p>
                ) : refPickerVideoEntries.map((entry, i) => (
                  <button
                    key={entry.url + String(i)}
                    type="button"
                    className="tgfc-refpicker-video-tile"
                    onClick={() => { setRefUrl(refPickerOpen.slot, entry.url); setRefPickerOpen(null) }}
                    title={entry.url}
                  >
                    <video src={entry.url} muted playsInline preload="metadata" />
                    {entry.prompt ? <span className="tgfc-refpicker-video-label">{entry.prompt}</span> : null}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>,
        document.body
      ) : null}
    </section>
  )
}

export function ToorGenFlowCanvas(props: ToorGenFlowCanvasProps) {
  return <ReactFlowProvider><ToorGenFlowCanvasInner {...props} /></ReactFlowProvider>
}

async function uploadReferenceAudioToHost(file: File): Promise<string> {
  const ext = file.name.split('.').pop() || 'mp3'
  const uniqueName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const fileRef = storageRef(storage, `seedance-references/${uniqueName}`)
  await uploadBytes(fileRef, file, { contentType: file.type || 'audio/mpeg' })
  return getDownloadURL(fileRef)
}