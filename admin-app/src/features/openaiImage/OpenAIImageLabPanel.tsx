import { onAuthStateChanged } from 'firebase/auth'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { auth } from '../../lib/firebase'
import { useToast } from '../../lib/ToastContext'
import { useOpenAIImageAssetGeneration } from '../../hooks/useOpenAIImageAssetGeneration'
import {
  fetchOpenAIImageTask,
  submitOpenAIImageTask,
  type OpenAIImageGenerationRequest,
  type OpenAIImageQuality,
  type OpenAIImageTaskResponse,
} from '../../lib/openai/openAIImageClient'
import { saveOpenAIImageAssetToLibrary } from '../../lib/openai/openAIImageAssetService'
import { useLabNewLayoutHistoryGallery, type LabNewLayoutGalleryHistoryEntry } from '../../pages/LabNewLayout/useLabNewLayoutHistoryGallery'
import { useLabNewLayoutStore, type GenerationHistoryItem } from '../../pages/LabNewLayout/useLabNewLayoutStore'
import { useLabNewLayoutData } from '../../pages/LabNewLayout/useLabNewLayoutWorkspace'

const CHATBOT_BASE = (import.meta.env.VITE_CHATBOT_API_URL as string | undefined) || ''
const REFERENCE_SLOT_COUNT = 6
const OPENAI_STORYBOARD_SOURCE_LABEL = 'OpenAI Storyboard'
const OPENAI_SUBMIT_ENDPOINT = '/api/openai/images/submit'
const OPENAI_TASKS_ENDPOINT = '/api/openai/images/tasks'
const TASK_POLL_INTERVAL_MS = 4000

type StoryboardRowsMode = 'auto' | '1' | '2' | '3' | '4'

type PanelReference = {
  url: string
  name: string
}

type StoryboardExampleDef = {
  readonly id: string
  readonly groupId: string
  readonly subgroupId: string
  readonly label: string
  readonly description: string
  readonly referenceCount: number
  readonly prompt: string
  readonly defaultShotCount: number
  readonly defaultColumns: number
  readonly defaultRows: StoryboardRowsMode
  readonly defaultSize: string
  readonly useCases: readonly string[]
  readonly badge?: string
}

type StoryboardNavSubgroup = {
  readonly id: string
  readonly title: string
  readonly exampleIds: readonly string[]
}

type StoryboardNavGroup = {
  readonly id: string
  readonly title: string
  readonly summary: string
  readonly subgroups: readonly StoryboardNavSubgroup[]
}

const SIZE_OPTIONS = [
  { label: 'Auto', value: 'auto' },
  { label: '1024 x 1024', value: '1024x1024' },
  { label: '1536 x 1024', value: '1536x1024' },
  { label: '1024 x 1536', value: '1024x1536' },
  { label: '2048 x 2048', value: '2048x2048' },
  { label: '2048 x 1152', value: '2048x1152' },
  { label: '3840 x 2160 (4K)', value: '3840x2160' },
  { label: '2160 x 3840 (4K portrait)', value: '2160x3840' },
]

const QUALITY_OPTIONS: Array<{ label: string; value: OpenAIImageQuality }> = [
  { label: 'Auto', value: 'auto' },
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
]

const SHOT_COUNT_OPTIONS = Array.from({ length: 12 }, (_value, index) => index + 1)
const COLUMN_OPTIONS = [1, 2, 3, 4]
const GENERATION_COUNT_OPTIONS = [1, 2, 3, 4]
const ROW_OPTIONS: Array<{ label: string; value: StoryboardRowsMode }> = [
  { label: 'Auto', value: 'auto' },
  { label: '1 row', value: '1' },
  { label: '2 rows', value: '2' },
  { label: '3 rows', value: '3' },
  { label: '4 rows', value: '4' },
]

const BASE_STORYBOARD_EXAMPLES: readonly StoryboardExampleDef[] = [
  {
    id: 'beats-opening-board',
    groupId: 'story-beats',
    subgroupId: 'beats-scene-start',
    label: 'Opening Beat Board',
    description: 'Establish the world, hero presence, and scene geography in a compact storyboard sheet.',
    referenceCount: 3,
    prompt: 'Build a storyboard that starts with a controlled establishing shot, then steps into medium and close storytelling beats that introduce the hero and the playable space clearly.',
    defaultShotCount: 4,
    defaultColumns: 2,
    defaultRows: 'auto',
    defaultSize: '2048x1152',
    useCases: ['Episode opening boards', 'Scene launch previews', 'Environment and hero introduction'],
  },
  {
    id: 'beats-dialogue-board',
    groupId: 'story-beats',
    subgroupId: 'beats-performance',
    label: 'Dialogue Exchange',
    description: 'Lock facial acting, eyelines, and staging for a conversation without drifting off-model.',
    referenceCount: 4,
    prompt: 'Create a dialogue storyboard where the conversation escalates shot by shot. Preserve exact eyelines, character height relationships, wardrobe continuity, and screen direction.',
    defaultShotCount: 6,
    defaultColumns: 3,
    defaultRows: 'auto',
    defaultSize: '2048x1152',
    useCases: ['Dialogue staging', 'Performance continuity', 'Blocking approval'],
  },
  {
    id: 'beats-action-board',
    groupId: 'story-beats',
    subgroupId: 'beats-escalation',
    label: 'Action Escalation Board',
    description: 'Map a short action beat while preserving environment geography and character readability.',
    referenceCount: 4,
    prompt: 'Create a storyboard for a short action escalation. Track spatial geography clearly from panel to panel and keep every character readable, on-model, and anatomically intact.',
    defaultShotCount: 8,
    defaultColumns: 4,
    defaultRows: 'auto',
    defaultSize: '3840x2160',
    useCases: ['Action previs', 'Chase beat planning', 'Combat readability passes'],
  },
  {
    id: 'coverage-two-by-two',
    groupId: 'coverage-layouts',
    subgroupId: 'coverage-grids',
    label: '2 x 2 Coverage Sheet',
    description: 'Generate a clean four-panel storyboard board for fast approvals and revisions.',
    referenceCount: 3,
    prompt: 'Create a concise four-panel coverage board with one establishing shot, two performance-driven mid shots, and one detail beat, all sharing the same visual canon.',
    defaultShotCount: 4,
    defaultColumns: 2,
    defaultRows: '2',
    defaultSize: '2048x2048',
    useCases: ['Director approvals', 'Pitch decks', 'Shot order discussion'],
  },
  {
    id: 'coverage-single-row',
    groupId: 'coverage-layouts',
    subgroupId: 'coverage-strips',
    label: 'Single Row Strip',
    description: 'Lay out shots in one horizontal row when the storyboard needs to read left to right like a film strip.',
    referenceCount: 3,
    prompt: 'Compose a single-row storyboard strip that reads left to right as a continuous visual sentence, keeping character silhouettes, costume, props, and lighting locked.',
    defaultShotCount: 4,
    defaultColumns: 4,
    defaultRows: '1',
    defaultSize: '3840x2160',
    useCases: ['Film-strip style boards', 'Quick editorial review', 'Trailer beat strips'],
  },
  {
    id: 'coverage-twelve-panel',
    groupId: 'coverage-layouts',
    subgroupId: 'coverage-dense',
    label: 'Dense 12-Shot Board',
    description: 'Pack up to twelve beats into a single storyboard contact sheet without losing continuity.',
    referenceCount: 5,
    prompt: 'Create a dense storyboard contact sheet with many shots but keep every panel controlled, legible, and visually consistent. The board should still feel curated, not noisy.',
    defaultShotCount: 12,
    defaultColumns: 4,
    defaultRows: '3',
    defaultSize: '3840x2160',
    useCases: ['Full scene board drafts', 'Sequence planning', 'Shot density exploration'],
  },
  {
    id: 'continuity-character-lock',
    groupId: 'continuity-lock',
    subgroupId: 'continuity-characters',
    label: 'Character Lock Pass',
    description: 'Stress-test character consistency across multiple storyboard panels and camera distances.',
    referenceCount: 4,
    prompt: 'Create a storyboard that deliberately changes shot scale while keeping every character face, body proportion, costume detail, and emotional performance consistent in every panel.',
    defaultShotCount: 6,
    defaultColumns: 3,
    defaultRows: 'auto',
    defaultSize: '2048x1152',
    useCases: ['Character continuity QA', 'Facial consistency checks', 'Costume lock verification'],
  },
  {
    id: 'continuity-environment-lock',
    groupId: 'continuity-lock',
    subgroupId: 'continuity-environment',
    label: 'Environment Lock Pass',
    description: 'Verify that architecture, set dressing, and geography stay stable across storyboard shots.',
    referenceCount: 4,
    prompt: 'Generate a storyboard where the environment must remain canonically identical across panels except for camera position and action. Preserve layout, landmarks, props, lighting logic, and depth cues.',
    defaultShotCount: 6,
    defaultColumns: 3,
    defaultRows: 'auto',
    defaultSize: '2048x1152',
    useCases: ['Location continuity', 'Background lock', 'Production design reviews'],
  },
  {
    id: 'continuity-ensemble-board',
    groupId: 'continuity-lock',
    subgroupId: 'continuity-ensemble',
    label: 'Ensemble Blocking',
    description: 'Keep multiple characters stable together while the board changes composition and staging.',
    referenceCount: 5,
    prompt: 'Create an ensemble storyboard sheet. Each panel should preserve the identity and body language of all core characters while adjusting staging, camera angle, and beat emphasis without deformation.',
    defaultShotCount: 8,
    defaultColumns: 4,
    defaultRows: 'auto',
    defaultSize: '3840x2160',
    useCases: ['Team scenes', 'Crowd-with-hero staging', 'Group composition continuity'],
  },
]

const BASE_STORYBOARD_GROUPS: readonly StoryboardNavGroup[] = [
  {
    id: 'story-beats',
    title: 'Story Beats',
    summary: 'Narrative boards that emphasize scene progression, performance, and emotional timing.',
    subgroups: [
      { id: 'beats-scene-start', title: 'Scene Start', exampleIds: ['beats-opening-board'] },
      { id: 'beats-performance', title: 'Performance', exampleIds: ['beats-dialogue-board'] },
      { id: 'beats-escalation', title: 'Escalation', exampleIds: ['beats-action-board'] },
    ],
  },
  {
    id: 'coverage-layouts',
    title: 'Coverage Layouts',
    summary: 'Board layouts optimized for approvals, horizontal strips, and dense multi-shot planning.',
    subgroups: [
      { id: 'coverage-grids', title: 'Grid Boards', exampleIds: ['coverage-two-by-two'] },
      { id: 'coverage-strips', title: 'Single-Row Strips', exampleIds: ['coverage-single-row'] },
      { id: 'coverage-dense', title: 'Dense Boards', exampleIds: ['coverage-twelve-panel'] },
    ],
  },
  {
    id: 'continuity-lock',
    title: 'Continuity Lock',
    summary: 'Stress-test identity, environment, and ensemble continuity across multi-panel storyboard boards.',
    subgroups: [
      { id: 'continuity-characters', title: 'Characters', exampleIds: ['continuity-character-lock'] },
      { id: 'continuity-environment', title: 'Environment', exampleIds: ['continuity-environment-lock'] },
      { id: 'continuity-ensemble', title: 'Ensemble', exampleIds: ['continuity-ensemble-board'] },
    ],
  },
]

const DEFAULT_GROUP_ID = BASE_STORYBOARD_GROUPS[0]?.id || 'story-beats'
const DEFAULT_EXAMPLE_ID = BASE_STORYBOARD_GROUPS[0]?.subgroups[0]?.exampleIds[0] || BASE_STORYBOARD_EXAMPLES[0]?.id || ''

const emptySlots = (): Array<PanelReference | null> => Array.from({ length: REFERENCE_SLOT_COUNT }, () => null)

const createClientUniqueId = (prefix: string) => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

const parseDraggedReference = (dataTransfer: DataTransfer): PanelReference | null => {
  const rawJson = dataTransfer.getData('application/json')
  if (rawJson) {
    try {
      const parsed = JSON.parse(rawJson) as Partial<{ url: string; name: string }>
      if (typeof parsed.url === 'string' && parsed.url.trim()) {
        return {
          url: parsed.url.trim(),
          name: typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.trim() : 'Reference image',
        }
      }
    } catch {
      // Fall through to URI/plain-text parsing.
    }
  }

  const rawUri = dataTransfer.getData('text/uri-list') || dataTransfer.getData('text/plain')
  if (!rawUri || !rawUri.trim()) {
    return null
  }

  return {
    url: rawUri.trim(),
    name: 'Reference image',
  }
}

const resolveEffectiveRowCount = (shotCount: number, columns: number, rows: StoryboardRowsMode): number => {
  const safeColumns = Math.max(1, columns)
  if (rows === 'auto') {
    return Math.max(1, Math.ceil(shotCount / safeColumns))
  }
  return Math.max(1, Number(rows))
}

const buildLayoutSummary = (shotCount: number, columns: number, rows: StoryboardRowsMode): string => {
  const effectiveRows = resolveEffectiveRowCount(shotCount, columns, rows)
  return `${shotCount} shots · ${columns} column${columns === 1 ? '' : 's'} · ${effectiveRows} row${effectiveRows === 1 ? '' : 's'}`
}

const buildStoryboardPrompt = ({
  example,
  customPrompt,
  shotCount,
  columns,
  rows,
  referenceCount,
}: {
  example: StoryboardExampleDef
  customPrompt: string
  shotCount: number
  columns: number
  rows: StoryboardRowsMode
  referenceCount: number
}) => {
  const effectiveRows = resolveEffectiveRowCount(shotCount, columns, rows)
  const userPrompt = customPrompt.trim()

  return [
    `Create one polished storyboard contact sheet made of exactly ${shotCount} storyboard panels in a ${columns}-column by ${effectiveRows}-row layout.`,
    'Use the provided reference images as hard canon for every recurring character, costume, hairstyle, face shape, body proportion, prop, and environment detail.',
    'Keep all characters consistent across every panel. Keep the same art style, rendering quality, lighting logic, color palette, and world design across the entire board.',
    'Do not redesign faces. Do not deform anatomy. Do not add extra fingers, duplicate limbs, melted features, swapped costumes, or off-model expressions.',
    'Keep the environment consistent from shot to shot unless the prompt explicitly requests a location change. Preserve geography, screen direction, scale, and set dressing continuity.',
    'Every panel must feel like the same production, the same cast, and the same scene continuity memory.',
    'Number each panel subtly and clearly. Use storyboard readability over decorative layout. Avoid large captions unless requested.',
    `Reference handling: ${referenceCount > 0 ? `you have ${referenceCount} attached reference image${referenceCount === 1 ? '' : 's'}; preserve them strictly.` : 'no reference images are attached, so keep continuity by the written instructions alone.'}`,
    `Storyboard example focus: ${example.prompt}`,
    userPrompt ? `Scene-specific instructions: ${userPrompt}` : 'Scene-specific instructions: stay aligned with the selected storyboard example and preserve continuity rigorously.',
  ].join(' ')
}

const deriveHistoryTitle = (example: StoryboardExampleDef, customTitle: string) => {
  const trimmed = customTitle.trim()
  return trimmed || `${example.label} storyboard`
}

const buildGeneratedAssetTitle = (baseTitle: string, assetIndex: number, totalCount: number) => (
  totalCount > 1 ? `${baseTitle} ${assetIndex + 1}` : baseTitle
)

const isOpenAIStoryboardHistoryItem = (item: Pick<GenerationHistoryItem, 'sourceLabel'> | Pick<LabNewLayoutGalleryHistoryEntry, 'sourceLabel'>) => (
  (item.sourceLabel || '').trim() === OPENAI_STORYBOARD_SOURCE_LABEL
)

const buildReferenceMediaUrls = (urls: string[]) => Object.fromEntries(
  urls.map((url, index) => [`image${index + 1}`, url]),
)

const readNumberFromPayload = (payload: Record<string, unknown> | null | undefined, key: string, fallback: number) => {
  const value = payload?.[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

const readStringFromPayload = (payload: Record<string, unknown> | null | undefined, key: string, fallback = '') => {
  const value = payload?.[key]
  return typeof value === 'string' ? value : fallback
}

const readRowsFromPayload = (payload: Record<string, unknown> | null | undefined): StoryboardRowsMode => {
  const value = payload?.openAIRows
  return value === '1' || value === '2' || value === '3' || value === '4' || value === 'auto' ? value : 'auto'
}

const readReferenceImagesFromPayload = (payload: Record<string, unknown> | null | undefined): string[] => {
  const value = payload?.referenceImages ?? payload?.openAIReferenceImages
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : []
}

const toOpenAIRequestFromPayload = (payload: Record<string, unknown> | null | undefined): OpenAIImageGenerationRequest | null => {
  const prompt = readStringFromPayload(payload, 'prompt')
  if (!prompt) {
    return null
  }

  return {
    prompt,
    model: readStringFromPayload(payload, 'model'),
    fallbackModel: readStringFromPayload(payload, 'fallbackModel'),
    size: readStringFromPayload(payload, 'size', 'auto'),
    quality: (readStringFromPayload(payload, 'quality', 'auto') as OpenAIImageQuality),
    outputFormat: 'png',
    n: readNumberFromPayload(payload, 'n', 1),
    referenceImages: readReferenceImagesFromPayload(payload),
    clientRequestId: readStringFromPayload(payload, 'clientRequestId'),
    sourceLabel: readStringFromPayload(payload, 'sourceLabel', OPENAI_STORYBOARD_SOURCE_LABEL),
  }
}

const toStoreHistoryItem = (entry: LabNewLayoutGalleryHistoryEntry): GenerationHistoryItem => ({
  id: entry.id,
  timestamp: entry.timestamp,
  submittedAt: entry.submittedAt || undefined,
  receivedAt: entry.receivedAt || undefined,
  completedAt: entry.completedAt || undefined,
  prompt: entry.prompt,
  model: entry.model,
  provider: entry.provider,
  ratio: entry.ratio,
  resolution: entry.resolution,
  duration: entry.duration || undefined,
  generateAudio: entry.generateAudio ?? undefined,
  status: entry.status,
  resultUrl: entry.resultUrl || undefined,
  posterUrl: entry.posterUrl || undefined,
  errorMessage: entry.errorMessage || undefined,
  taskId: entry.taskId || undefined,
  requestEndpoint: entry.requestEndpoint || undefined,
  requestPayload: entry.requestPayload || undefined,
  mediaUrls: entry.mediaUrls || undefined,
  outputDimensions: entry.outputDimensions || undefined,
  projectId: entry.projectId || undefined,
  folderId: entry.folderId || undefined,
  sourceLabel: entry.sourceLabel || undefined,
})

const buildProjectWorkflowExamples = (storyBibleData: ReturnType<typeof useLabNewLayoutData>['storyBibleData']): StoryboardExampleDef[] => {
  const examples: StoryboardExampleDef[] = []
  const characterNameById = new Map(storyBibleData.characters.map((character) => [character.id, character.name]))

  storyBibleData.scenes.slice(0, 3).forEach((scene, index) => {
    const characterNames = scene.characterIds.map((id) => characterNameById.get(id)).filter(Boolean).join(', ')
    examples.push({
      id: `project-scene-${scene.id}`,
      groupId: 'story-beats',
      subgroupId: 'project-scenes',
      label: scene.title || `Project Scene ${index + 1}`,
      description: `Project scene board built from the story bible scene brief${characterNames ? ` with ${characterNames}` : ''}.`,
      referenceCount: 4,
      prompt: `Storyboard the project scene "${scene.title || `Scene ${index + 1}`}". Scenario: ${scene.scenario || scene.script || scene.visual || scene.action || 'Preserve the authored scene intent.'} ${characterNames ? `Keep ${characterNames} perfectly on-model in every panel.` : 'Keep the recurring cast perfectly on-model in every panel.'}`,
      defaultShotCount: 6,
      defaultColumns: 3,
      defaultRows: 'auto',
      defaultSize: '2048x1152',
      useCases: ['Story bible scene boards', 'Director handoff', 'Scene continuity planning'],
      badge: 'Project scene',
    })
  })

  storyBibleData.episodes.slice(0, 2).forEach((episode, index) => {
    examples.push({
      id: `project-episode-${episode.id}`,
      groupId: 'coverage-layouts',
      subgroupId: 'project-episodes',
      label: episode.title || `Episode ${index + 1}`,
      description: `Episode coverage board based on the current project episode outline and scenario.`,
      referenceCount: 4,
      prompt: `Create a production-ready coverage board for episode "${episode.title || `Episode ${index + 1}`}". Story: ${episode.story || episode.scenario || 'Preserve the episode progression from the story bible.'} Highlight the strongest story beats and keep cast, props, and environment continuity locked.`,
      defaultShotCount: 8,
      defaultColumns: 4,
      defaultRows: 'auto',
      defaultSize: '3840x2160',
      useCases: ['Episode boards', 'Coverage planning', 'Editorial beat review'],
      badge: 'Project episode',
    })
  })

  storyBibleData.characters.slice(0, 3).forEach((character, index) => {
    examples.push({
      id: `project-character-${character.id}`,
      groupId: 'continuity-lock',
      subgroupId: 'project-characters',
      label: character.name || `Character ${index + 1}`,
      description: `Continuity stress test centered on ${character.name || 'the selected character'} from the project story bible.`,
      referenceCount: 4,
      prompt: `Create a continuity lock board for ${character.name || `Character ${index + 1}`}. Bio: ${character.bio || 'Preserve the character identity from the project materials.'} Keep facial structure, costume language, posture, and emotional readability consistent across every panel.`,
      defaultShotCount: 6,
      defaultColumns: 3,
      defaultRows: 'auto',
      defaultSize: '2048x1152',
      useCases: ['Character lock sheets', 'Casting continuity review', 'Performance consistency checks'],
      badge: 'Project character',
    })
  })

  return examples
}

const mergeStoryboardGroups = (examples: readonly StoryboardExampleDef[]): StoryboardNavGroup[] => {
  const groupedIds = {
    projectScenes: examples.filter((example) => example.subgroupId === 'project-scenes').map((example) => example.id),
    projectEpisodes: examples.filter((example) => example.subgroupId === 'project-episodes').map((example) => example.id),
    projectCharacters: examples.filter((example) => example.subgroupId === 'project-characters').map((example) => example.id),
  }

  return BASE_STORYBOARD_GROUPS.map((group) => {
    if (group.id === 'story-beats' && groupedIds.projectScenes.length > 0) {
      return {
        ...group,
        subgroups: [...group.subgroups, { id: 'project-scenes', title: 'Project Scenes', exampleIds: groupedIds.projectScenes }],
      }
    }
    if (group.id === 'coverage-layouts' && groupedIds.projectEpisodes.length > 0) {
      return {
        ...group,
        subgroups: [...group.subgroups, { id: 'project-episodes', title: 'Project Episodes', exampleIds: groupedIds.projectEpisodes }],
      }
    }
    if (group.id === 'continuity-lock' && groupedIds.projectCharacters.length > 0) {
      return {
        ...group,
        subgroups: [...group.subgroups, { id: 'project-characters', title: 'Project Characters', exampleIds: groupedIds.projectCharacters }],
      }
    }
    return group
  })
}

const playTone = (frequency: number, duration: number, type: OscillatorType = 'sine', gainValue = 0.14) => {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.type = type
    osc.frequency.setValueAtTime(frequency, ctx.currentTime)
    gain.gain.setValueAtTime(gainValue, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    osc.start(ctx.currentTime)
    osc.stop(ctx.currentTime + duration)
    osc.onended = () => { void ctx.close() }
  } catch {
    // Audio unavailable — silent fallback.
  }
}

const playSuccessSound = () => {
  playTone(880, 0.1)
  window.setTimeout(() => playTone(1108, 0.18), 90)
  window.setTimeout(() => playTone(1320, 0.22), 190)
}

const playFailureSound = () => {
  playTone(260, 0.14, 'sawtooth', 0.1)
  window.setTimeout(() => playTone(200, 0.28, 'sawtooth', 0.08), 130)
}

export function OpenAIImageLabPanel() {
  const { showToast } = useToast()
  const {
    projectReferenceLibraryItems,
    storyBibleData,
    studioProjectId,
    studioActiveFolderId,
    projectNewLayoutConfig,
    projectNewLayoutConfigLoading,
    updateProjectNewLayoutConfig,
  } = useLabNewLayoutData()

  const [authUid, setAuthUid] = useState(auth.currentUser?.uid || '')
  const [activeGroupId, setActiveGroupId] = useState(DEFAULT_GROUP_ID)
  const [activeExampleId, setActiveExampleId] = useState(DEFAULT_EXAMPLE_ID)
  const [customPrompt, setCustomPrompt] = useState('')
  const [size, setSize] = useState('3840x2160')
  const [quality, setQuality] = useState<OpenAIImageQuality>('high')
  const [assetTitle, setAssetTitle] = useState('')
  const [shotCount, setShotCount] = useState(4)
  const [columns, setColumns] = useState(2)
  const [rows, setRows] = useState<StoryboardRowsMode>('auto')
  const [generationCount, setGenerationCount] = useState(1)
  const [referenceSlots, setReferenceSlots] = useState<Array<PanelReference | null>>(() => emptySlots())
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null)
  const [expandedSubgroups, setExpandedSubgroups] = useState<Record<string, boolean>>({})
  const [selectedHistoryId, setSelectedHistoryId] = useState('')
  const [copiedPrompt, setCopiedPrompt] = useState(false)
  const [showPromptPreview, setShowPromptPreview] = useState(false)
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false)
  const [submissionFlash, setSubmissionFlash] = useState(false)

  const draftScopeId = (studioActiveFolderId || 'project').trim() || 'project'
  const lastPersistedDraftSignatureRef = useRef('')
  const applyDraftRef = useRef(false)
  const previousScopeIdRef = useRef(draftScopeId)
  const previousExampleIdRef = useRef('')
  const submissionFlashTimerRef = useRef<number | null>(null)
  const pollingTaskIdsRef = useRef<Set<string>>(new Set())
  const finalizingHistoryIdsRef = useRef<Set<string>>(new Set())
  const completedTaskToastIdsRef = useRef<Set<string>>(new Set())

  const storeHistory = useLabNewLayoutStore((state) => state.history)
  const addHistoryItem = useLabNewLayoutStore((state) => state.addHistoryItem)
  const updateHistoryItem = useLabNewLayoutStore((state) => state.updateHistoryItem)
  const pendingGenerationAssets = useLabNewLayoutStore((state) => state.pendingGenerationAssets)
  const addPendingGenerationAsset = useLabNewLayoutStore((state) => state.addPendingGenerationAsset)
  const removePendingGenerationAsset = useLabNewLayoutStore((state) => state.removePendingGenerationAsset)
  const setAssetPreviewItem = useLabNewLayoutStore((state) => state.setAssetPreviewItem)

  const {
    entries: syncedHistoryEntries,
  } = useLabNewLayoutHistoryGallery({ authUid })

  const {
    health,
    isCheckingHealth,
    checkHealth,
  } = useOpenAIImageAssetGeneration({
    apiBaseUrl: CHATBOT_BASE,
    onError: (message) => showToast({ message, type: 'error', durationMs: 8000 }),
  })

  const projectExamples = useMemo(() => buildProjectWorkflowExamples(storyBibleData), [storyBibleData])
  const storyboardExamples = useMemo(() => [...BASE_STORYBOARD_EXAMPLES, ...projectExamples], [projectExamples])
  const storyboardExampleById = useMemo(() => new Map(storyboardExamples.map((example) => [example.id, example])), [storyboardExamples])
  const storyboardGroups = useMemo(() => mergeStoryboardGroups(projectExamples), [projectExamples])
  const persistedDraft = projectNewLayoutConfig.openAIStoryboardDrafts?.[draftScopeId] || null

  const activeGroup = useMemo(
    () => storyboardGroups.find((group) => group.id === activeGroupId) || storyboardGroups[0],
    [activeGroupId, storyboardGroups],
  )

  const activeExample = useMemo(
    () => storyboardExampleById.get(activeExampleId) || storyboardExampleById.get(DEFAULT_EXAMPLE_ID) || storyboardExamples[0],
    [activeExampleId, storyboardExampleById, storyboardExamples],
  )

  const syncedStoryboardHistory = useMemo(() => {
    return syncedHistoryEntries
      .filter((entry) => isOpenAIStoryboardHistoryItem(entry))
      .filter((entry) => {
        if (studioProjectId && entry.projectId !== studioProjectId) {
          return false
        }
        if (studioActiveFolderId && (entry.folderId || '') !== studioActiveFolderId) {
          return false
        }
        return true
      })
      .sort((left, right) => (right.timestamp || 0) - (left.timestamp || 0))
  }, [studioActiveFolderId, studioProjectId, syncedHistoryEntries])

  const selectedHistoryItem = useMemo(
    () => syncedStoryboardHistory.find((item) => item.id === selectedHistoryId) || syncedStoryboardHistory[0] || null,
    [selectedHistoryId, syncedStoryboardHistory],
  )

  const activeReferenceImages = useMemo(() => {
    return referenceSlots
      .filter((item): item is PanelReference => Boolean(item?.url))
      .map((item) => item.url)
  }, [referenceSlots])

  const composedPrompt = useMemo(() => {
    if (!activeExample) {
      return ''
    }

    return buildStoryboardPrompt({
      example: activeExample,
      customPrompt,
      shotCount,
      columns,
      rows,
      referenceCount: activeReferenceImages.length,
    })
  }, [activeExample, activeReferenceImages.length, columns, customPrompt, rows, shotCount])

  const suggestedReferences = useMemo(() => {
    return projectReferenceLibraryItems
      .filter((item) => item.kind === 'image')
      .slice(0, 12)
      .map((item) => ({ url: item.url, name: item.name }))
  }, [projectReferenceLibraryItems])

  const selectedHistorySettings = selectedHistoryItem?.requestPayload || null
  const previewImageUrl = selectedHistoryItem?.resultUrl || ''
  const historyCounts = useMemo(() => {
    const queued = syncedStoryboardHistory.filter((item) => item.status === 'queued' || item.status === 'running').length
    const success = syncedStoryboardHistory.filter((item) => item.status === 'success').length
    const failed = syncedStoryboardHistory.filter((item) => item.status === 'failed').length
    return { queued, success, failed }
  }, [syncedStoryboardHistory])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUid(user?.uid || '')
    })

    return () => {
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    void checkHealth().catch(() => undefined)
  }, [checkHealth])

  useEffect(() => {
    if (!activeGroup) {
      return
    }

    const visibleExampleIds = activeGroup.subgroups.flatMap((subgroup) => subgroup.exampleIds)
    if (visibleExampleIds.includes(activeExampleId)) {
      return
    }

    setActiveExampleId(visibleExampleIds[0] || DEFAULT_EXAMPLE_ID)
  }, [activeExampleId, activeGroup])

  useEffect(() => {
    setExpandedSubgroups((current) => {
      const next: Record<string, boolean> = {}
      storyboardGroups.forEach((group) => {
        group.subgroups.forEach((subgroup, index) => {
          next[subgroup.id] = current[subgroup.id] ?? index === 0
        })
      })
      return next
    })
  }, [storyboardGroups])

  useEffect(() => {
    if (!activeExample) {
      return
    }
    if (applyDraftRef.current) {
      previousExampleIdRef.current = activeExample.id
      return
    }
    if (previousExampleIdRef.current === activeExample.id) {
      return
    }

    previousExampleIdRef.current = activeExample.id
    setCustomPrompt(activeExample.prompt)
    setShotCount(activeExample.defaultShotCount)
    setColumns(activeExample.defaultColumns)
    setRows(activeExample.defaultRows)
    setSize(activeExample.defaultSize)
    setAssetTitle(`${activeExample.label} storyboard`)
    setCopiedPrompt(false)
  }, [activeExample])

  useEffect(() => {
    if (projectNewLayoutConfigLoading) {
      return
    }

    applyDraftRef.current = true
    previousScopeIdRef.current = draftScopeId

    if (persistedDraft) {
      setActiveGroupId(persistedDraft.activeGroupId || DEFAULT_GROUP_ID)
      setActiveExampleId(persistedDraft.activeExampleId || DEFAULT_EXAMPLE_ID)
      setCustomPrompt(persistedDraft.customPrompt)
      setSize(persistedDraft.size)
      setQuality(persistedDraft.quality)
      setAssetTitle(persistedDraft.assetTitle)
      setShotCount(persistedDraft.shotCount)
      setColumns(persistedDraft.columns)
      setRows(persistedDraft.rows)
      setGenerationCount(persistedDraft.generationCount)
      lastPersistedDraftSignatureRef.current = JSON.stringify(persistedDraft)
    } else if (previousScopeIdRef.current !== draftScopeId) {
      setActiveGroupId(DEFAULT_GROUP_ID)
      setActiveExampleId(DEFAULT_EXAMPLE_ID)
      setGenerationCount(1)
    }

    const timer = window.setTimeout(() => {
      applyDraftRef.current = false
    }, 0)

    return () => {
      window.clearTimeout(timer)
    }
  }, [draftScopeId, persistedDraft, projectNewLayoutConfigLoading])

  useEffect(() => {
    if (!studioProjectId || projectNewLayoutConfigLoading || applyDraftRef.current) {
      return
    }

    const nextDraft = {
      activeGroupId,
      activeExampleId,
      customPrompt,
      size,
      quality,
      assetTitle,
      shotCount,
      columns,
      rows,
      generationCount,
      updatedAt: Date.now(),
    }
    const nextSignature = JSON.stringify({ ...nextDraft, updatedAt: 0 })
    if (lastPersistedDraftSignatureRef.current === nextSignature) {
      return
    }

    lastPersistedDraftSignatureRef.current = nextSignature
    updateProjectNewLayoutConfig((current) => {
      const existing = current.openAIStoryboardDrafts?.[draftScopeId]
      const existingSignature = JSON.stringify({ ...(existing || {}), updatedAt: 0 })
      if (existingSignature === nextSignature) {
        return current
      }

      return {
        ...current,
        openAIStoryboardDrafts: {
          ...(current.openAIStoryboardDrafts ?? {}),
          [draftScopeId]: nextDraft,
        },
      }
    })
  }, [activeExampleId, activeGroupId, assetTitle, columns, customPrompt, draftScopeId, generationCount, projectNewLayoutConfigLoading, quality, rows, shotCount, size, studioProjectId, updateProjectNewLayoutConfig])

  useEffect(() => {
    const localIds = new Set(storeHistory.map((item) => item.id))
    syncedStoryboardHistory.forEach((entry) => {
      if ((entry.status === 'queued' || entry.status === 'running') && !localIds.has(entry.id)) {
        addHistoryItem(toStoreHistoryItem(entry))
      }
    })
  }, [addHistoryItem, storeHistory, syncedStoryboardHistory])

  useEffect(() => {
    const pendingIds = new Set(pendingGenerationAssets.map((item) => item.id))
    const activePendingEntries = storeHistory.filter((item) => isOpenAIStoryboardHistoryItem(item) && (item.status === 'queued' || item.status === 'running'))

    activePendingEntries.forEach((item) => {
      if (pendingIds.has(item.id)) {
        return
      }

      const payload = item.requestPayload || {}
      const assetCount = readNumberFromPayload(payload, 'openAIAssetCount', 1)
      const assetIndex = readNumberFromPayload(payload, 'openAIAssetIndex', 0)
      const baseTitle = readStringFromPayload(payload, 'openAIAssetTitleBase', item.prompt.slice(0, 72) || 'Generating storyboard')
      addPendingGenerationAsset({
        id: item.id,
        kind: 'image',
        name: buildGeneratedAssetTitle(baseTitle, assetIndex, assetCount),
        createdAt: item.submittedAt || item.timestamp,
        isPendingGeneration: true,
        referenceImageUrl: readReferenceImagesFromPayload(payload)[0],
      })
    })

    pendingGenerationAssets.forEach((item) => {
      const matchingHistory = storeHistory.find((historyItem) => historyItem.id === item.id)
      if (!matchingHistory || matchingHistory.status === 'success' || matchingHistory.status === 'failed') {
        removePendingGenerationAsset(item.id)
      }
    })
  }, [addPendingGenerationAsset, pendingGenerationAssets, removePendingGenerationAsset, storeHistory])

  const assignReferenceToNextSlot = useCallback((reference: PanelReference) => {
    setReferenceSlots((current) => {
      if (current.some((slot) => slot?.url === reference.url)) {
        return current
      }
      const next = [...current]
      const emptyIndex = next.findIndex((slot) => slot === null)
      next[emptyIndex >= 0 ? emptyIndex : next.length - 1] = reference
      return next
    })
  }, [])

  const clearSlot = useCallback((slotIndex: number) => {
    setReferenceSlots((current) => current.map((item, index) => (index === slotIndex ? null : item)))
  }, [])

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>, slotIndex: number) => {
    event.preventDefault()
    setDragOverSlot(null)
    const reference = parseDraggedReference(event.dataTransfer)
    if (!reference) {
      return
    }
    setReferenceSlots((current) => current.map((item, index) => (index === slotIndex ? reference : item)))
  }, [])

  const toggleSubgroup = useCallback((subgroupId: string) => {
    setExpandedSubgroups((current) => ({ ...current, [subgroupId]: !current[subgroupId] }))
  }, [])

  const handleCopyPrompt = useCallback(() => {
    if (!composedPrompt.trim()) {
      return
    }

    void navigator.clipboard.writeText(composedPrompt)
    setCopiedPrompt(true)
    window.setTimeout(() => setCopiedPrompt(false), 1800)
  }, [composedPrompt])

  const finalizeTaskItem = useCallback(async (task: OpenAIImageTaskResponse, item: GenerationHistoryItem) => {
    if (finalizingHistoryIdsRef.current.has(item.id)) {
      return
    }

    finalizingHistoryIdsRef.current.add(item.id)
    try {
      const payload = item.requestPayload || null
      const assetIndex = readNumberFromPayload(payload, 'openAIAssetIndex', 0)
      const assetCount = readNumberFromPayload(payload, 'openAIAssetCount', 1)
      const asset = task.data[assetIndex]

      if (!asset) {
        updateHistoryItem(item.id, {
          status: 'failed',
          errorMessage: `OpenAI returned ${task.data.length} image${task.data.length === 1 ? '' : 's'}, but slot ${assetIndex + 1} was expected.`,
          completedAt: task.completedAt || Date.now(),
        })
        removePendingGenerationAsset(item.id)
        return
      }

      const baseTitle = readStringFromPayload(payload, 'openAIAssetTitleBase', item.prompt.slice(0, 72) || 'Storyboard')
      const savedAsset = await saveOpenAIImageAssetToLibrary({
        asset,
        prompt: item.prompt,
        title: buildGeneratedAssetTitle(baseTitle, assetIndex, assetCount),
        studioProjectId: item.projectId || studioProjectId,
        authUid,
        generationModel: task.model || item.model,
        generationProvider: 'openai',
        generationResolution: task.size,
        generationSource: 'openai-storyboard',
        generationRequestPayload: payload || undefined,
      })

      updateHistoryItem(item.id, {
        status: 'success',
        resultUrl: savedAsset.firebaseUrl,
        submittedAt: task.submittedAt || item.submittedAt,
        receivedAt: task.completedAt || Date.now(),
        completedAt: task.completedAt || Date.now(),
        model: task.model || item.model,
        provider: 'openai',
        resolution: task.size,
        errorMessage: '',
      })
      removePendingGenerationAsset(item.id)
    } catch (error) {
      updateHistoryItem(item.id, {
        status: 'failed',
        errorMessage: error instanceof Error ? error.message : 'Failed to save generated storyboard image.',
        completedAt: Date.now(),
      })
      removePendingGenerationAsset(item.id)
    } finally {
      finalizingHistoryIdsRef.current.delete(item.id)
    }
  }, [authUid, removePendingGenerationAsset, studioProjectId, updateHistoryItem])

  useEffect(() => {
    const activeTaskGroups = new Map<string, GenerationHistoryItem[]>()
    storeHistory
      .filter((item) => isOpenAIStoryboardHistoryItem(item) && (item.status === 'queued' || item.status === 'running') && typeof item.taskId === 'string' && item.taskId.trim())
      .forEach((item) => {
        const taskId = item.taskId!.trim()
        const existing = activeTaskGroups.get(taskId) || []
        existing.push(item)
        activeTaskGroups.set(taskId, existing)
      })

    if (activeTaskGroups.size === 0) {
      return undefined
    }

    let cancelled = false
    let timerId: number | null = null

    const poll = async () => {
      const groups = Array.from(activeTaskGroups.entries())
      await Promise.all(groups.map(async ([taskId, items]) => {
        if (pollingTaskIdsRef.current.has(taskId)) {
          return
        }

        const request = toOpenAIRequestFromPayload(items[0]?.requestPayload)
        if (!request) {
          return
        }

        pollingTaskIdsRef.current.add(taskId)
        try {
          const task = await fetchOpenAIImageTask(taskId, request, {
            apiBaseUrl: CHATBOT_BASE,
            endpoint: OPENAI_TASKS_ENDPOINT,
          })

          items.forEach((item) => {
            if (task.status === 'queued' || task.status === 'running') {
              updateHistoryItem(item.id, {
                status: 'running',
                submittedAt: task.submittedAt || item.submittedAt,
                taskId: task.taskId,
                model: task.model || item.model,
                provider: 'openai',
                resolution: task.size,
                errorMessage: '',
              })
            }
          })

          if (task.status === 'failed') {
            playFailureSound()
            items.forEach((item) => {
              updateHistoryItem(item.id, {
                status: 'failed',
                errorMessage: task.error || 'OpenAI storyboard generation failed.',
                completedAt: task.completedAt || Date.now(),
              })
              removePendingGenerationAsset(item.id)
            })
            return
          }

          if (task.status === 'completed') {
            await Promise.all(items.map(async (item) => finalizeTaskItem(task, item)))
            if (!completedTaskToastIdsRef.current.has(task.taskId)) {
              completedTaskToastIdsRef.current.add(task.taskId)
              playSuccessSound()
              showToast({
                message: `Storyboard task complete: ${items.length} asset${items.length === 1 ? '' : 's'} saved to the assets library.`,
                type: 'success',
              })
            }
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Could not refresh OpenAI storyboard task.'
          items.forEach((item) => {
            if (message.toLowerCase().includes('not found') || message.toLowerCase().includes('expired')) {
              updateHistoryItem(item.id, {
                status: 'failed',
                errorMessage: 'OpenAI storyboard task expired before it could be recovered.',
                completedAt: Date.now(),
              })
              removePendingGenerationAsset(item.id)
            }
          })
        } finally {
          pollingTaskIdsRef.current.delete(taskId)
        }
      }))

      if (!cancelled) {
        timerId = window.setTimeout(poll, TASK_POLL_INTERVAL_MS)
      }
    }

    void poll()

    return () => {
      cancelled = true
      if (timerId !== null) {
        window.clearTimeout(timerId)
      }
    }
  }, [finalizeTaskItem, removePendingGenerationAsset, showToast, storeHistory, updateHistoryItem])

  const handleGenerate = useCallback(async () => {
    if (!activeExample) {
      return
    }

    if (!customPrompt.trim()) {
      showToast({ message: 'Storyboard instructions are required.', type: 'error' })
      return
    }

    setIsSubmittingRequest(true)
    try {
      const clientRequestId = createClientUniqueId('openai-storyboard-request')
      const requestPayload: OpenAIImageGenerationRequest = {
        prompt: composedPrompt,
        size,
        quality,
        outputFormat: 'png',
        n: generationCount,
        referenceImages: activeReferenceImages,
        clientRequestId,
        sourceLabel: OPENAI_STORYBOARD_SOURCE_LABEL,
      }

      const task = await submitOpenAIImageTask(requestPayload, {
        apiBaseUrl: CHATBOT_BASE,
        endpoint: OPENAI_SUBMIT_ENDPOINT,
      })

      const submittedAt = task.submittedAt || Date.now()
      const baseTitle = deriveHistoryTitle(activeExample, assetTitle)

      for (let assetIndex = 0; assetIndex < generationCount; assetIndex += 1) {
        const historyId = `${task.taskId}-asset-${assetIndex + 1}`
        addHistoryItem({
          id: historyId,
          timestamp: submittedAt,
          submittedAt,
          prompt: composedPrompt,
          model: task.requestedModel || health?.openaiImageModel || 'gpt-image-2',
          provider: 'openai',
          resolution: size,
          status: task.status === 'failed' ? 'failed' : 'queued',
          taskId: task.taskId,
          requestEndpoint: OPENAI_SUBMIT_ENDPOINT,
          requestPayload: {
            ...requestPayload,
            openAIAssetIndex: assetIndex,
            openAIAssetCount: generationCount,
            openAIAssetTitleBase: baseTitle,
            openAIGroupId: activeGroupId,
            openAIExampleId: activeExample.id,
            openAIExampleLabel: activeExample.label,
            openAIShotCount: shotCount,
            openAIColumns: columns,
            openAIRows: rows,
            openAIReferenceImages: activeReferenceImages,
          },
          mediaUrls: buildReferenceMediaUrls(activeReferenceImages),
          sourceLabel: OPENAI_STORYBOARD_SOURCE_LABEL,
          projectId: studioProjectId || undefined,
          folderId: studioActiveFolderId || undefined,
          errorMessage: task.status === 'failed' ? task.error : undefined,
        })
        addPendingGenerationAsset({
          id: historyId,
          kind: 'image',
          name: buildGeneratedAssetTitle(baseTitle, assetIndex, generationCount),
          createdAt: submittedAt,
          isPendingGeneration: true,
          referenceImageUrl: activeReferenceImages[0],
        })
      }

      setSelectedHistoryId(`${task.taskId}-asset-1`)

      if (submissionFlashTimerRef.current !== null) {
        window.clearTimeout(submissionFlashTimerRef.current)
      }
      setSubmissionFlash(true)
      submissionFlashTimerRef.current = window.setTimeout(() => {
        setSubmissionFlash(false)
        submissionFlashTimerRef.current = null
      }, 1200)

      showToast({
        message: `Submitted ${generationCount} storyboard generation${generationCount === 1 ? '' : 's'}. You can keep submitting while these run.`,
        type: 'success',
      })
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : 'OpenAI storyboard submission failed.',
        type: 'error',
      })
    } finally {
      setIsSubmittingRequest(false)
    }
  }, [activeExample, activeGroupId, activeReferenceImages, addHistoryItem, addPendingGenerationAsset, assetTitle, columns, composedPrompt, customPrompt, generationCount, health?.openaiImageModel, quality, rows, shotCount, showToast, size, studioActiveFolderId, studioProjectId])

  const handleRestoreFromHistory = useCallback((item: LabNewLayoutGalleryHistoryEntry) => {
    const payload = item.requestPayload || null
    applyDraftRef.current = true
    setActiveGroupId(readStringFromPayload(payload, 'openAIGroupId', DEFAULT_GROUP_ID))
    setActiveExampleId(readStringFromPayload(payload, 'openAIExampleId', DEFAULT_EXAMPLE_ID))
    setCustomPrompt(item.prompt)
    setShotCount(readNumberFromPayload(payload, 'openAIShotCount', 4))
    setColumns(readNumberFromPayload(payload, 'openAIColumns', 2))
    setRows(readRowsFromPayload(payload))
    setSize(readStringFromPayload(payload, 'size', '3840x2160'))
    setQuality((readStringFromPayload(payload, 'quality', 'high') as OpenAIImageQuality))
    setGenerationCount(readNumberFromPayload(payload, 'openAIAssetCount', 1))
    setAssetTitle(readStringFromPayload(payload, 'openAIAssetTitleBase', item.prompt.slice(0, 72)))
    setSelectedHistoryId(item.id)
    setReferenceSlots(() => {
      const next = emptySlots()
      readReferenceImagesFromPayload(payload).slice(0, next.length).forEach((url, index) => {
        next[index] = { url, name: `History ref ${index + 1}` }
      })
      return next
    })

    window.setTimeout(() => {
      applyDraftRef.current = false
    }, 0)
  }, [])

  const handleOpenHistoryPreview = useCallback((item: LabNewLayoutGalleryHistoryEntry) => {
    if (!item.resultUrl) {
      return
    }

    const payload = item.requestPayload || null
    setAssetPreviewItem({
      id: item.id,
      url: item.resultUrl,
      kind: 'image',
      name: readStringFromPayload(payload, 'openAIAssetTitleBase', item.prompt.slice(0, 72) || 'Storyboard'),
      projectId: item.projectId || undefined,
      folderId: item.folderId || undefined,
      createdAt: item.completedAt || item.timestamp,
      generationPrompt: item.prompt,
      generationModel: item.model,
      generationProvider: item.provider,
      generationResolution: item.resolution,
      generationSource: OPENAI_STORYBOARD_SOURCE_LABEL,
      generationRequestPayload: payload || undefined,
    })
  }, [setAssetPreviewItem])

  if (!activeGroup || !activeExample) {
    return null
  }

  return (
    <section className="openai-storyboard-panel">
      <header className="openai-storyboard-panel__header">
        <div className="openai-storyboard-panel__titlewrap">
          <p className="openai-storyboard-panel__eyebrow">OpenAI Storyboards</p>
          <h2>Reference-Locked Storyboard Builder</h2>
          <p className="openai-storyboard-panel__copy">
            Submit storyboard batches without blocking the panel, keep tracking them after refresh, and reuse the shared history and asset preview flow instead of a private side channel.
          </p>
          {projectExamples.length > 0 ? (
            <p className="openai-storyboard-panel__project-note">
              Project-specific example sets are active from your current story bible: {projectExamples.length} workflow preset{projectExamples.length === 1 ? '' : 's'} were generated from scenes, episodes, and characters.
            </p>
          ) : null}
        </div>

        <div className="openai-storyboard-panel__header-meta">
          <div className="openai-storyboard-panel__health" data-state={health?.openaiImageConfigured ? 'ok' : 'warn'}>
            {isCheckingHealth
              ? 'Checking service...'
              : health?.openaiImageConfigured
                ? `Ready: ${health.openaiImageModel || 'gpt-image-2'}${health.openaiImageFallbackModel ? ` -> ${health.openaiImageFallbackModel}` : ''}`
                : 'OpenAI image service not configured'}
          </div>
          <div className="openai-storyboard-panel__layout-chip">{buildLayoutSummary(shotCount, columns, rows)}</div>
          <div className="openai-storyboard-panel__layout-chip">{historyCounts.queued} running · {historyCounts.success} complete · {historyCounts.failed} failed</div>
        </div>
      </header>

      <div className="openai-storyboard-panel__group-tabs" aria-label="Storyboard groups">
        {storyboardGroups.map((group) => (
          <button
            key={group.id}
            type="button"
            className={`openai-storyboard-panel__group-tab${group.id === activeGroupId ? ' is-active' : ''}`}
            onClick={() => setActiveGroupId(group.id)}
          >
            <span>{group.title}</span>
            <small>{group.summary}</small>
          </button>
        ))}
      </div>

      <div className="openai-storyboard-panel__body">
        <aside className="openai-storyboard-panel__nav" aria-label="Storyboard example tree">
          {activeGroup.subgroups.map((subgroup) => (
            <section key={subgroup.id} className="openai-storyboard-panel__nav-group">
              <button
                type="button"
                className="openai-storyboard-panel__nav-groupbtn"
                onClick={() => toggleSubgroup(subgroup.id)}
              >
                <span>{expandedSubgroups[subgroup.id] ? '▾' : '▸'}</span>
                <span>{subgroup.title}</span>
              </button>

              {expandedSubgroups[subgroup.id] && (
                <div className="openai-storyboard-panel__nav-list">
                  {subgroup.exampleIds.map((exampleId) => {
                    const example = storyboardExampleById.get(exampleId)
                    if (!example) {
                      return null
                    }

                    return (
                      <button
                        key={example.id}
                        type="button"
                        className={`openai-storyboard-panel__nav-item${example.id === activeExampleId ? ' is-active' : ''}`}
                        onClick={() => setActiveExampleId(example.id)}
                      >
                        <strong>{example.label}</strong>
                        <span>{example.description}</span>
                        {example.badge ? <em>{example.badge}</em> : null}
                      </button>
                    )
                  })}
                </div>
              )}
            </section>
          ))}
        </aside>

        <main className="openai-storyboard-panel__editor">
          <section className="openai-storyboard-panel__form card">
            <div className="openai-storyboard-panel__form-example">
              <div>
                {activeExample.badge ? <em className="openai-storyboard-panel__example-badge">{activeExample.badge}</em> : null}
                <strong>{activeExample.label}</strong>
                <span>{activeExample.description}</span>
              </div>
              <div className="openai-storyboard-panel__hero-chips">
                {activeExample.useCases.map((useCase) => <span key={useCase}>{useCase}</span>)}
              </div>
            </div>

            <div className="openai-storyboard-panel__form-grid">
              <label className="openai-storyboard-panel__field openai-storyboard-panel__field--full">
                <span>Storyboard Direction</span>
                <textarea
                  value={customPrompt}
                  onChange={(event) => setCustomPrompt(event.target.value)}
                  rows={12}
                  placeholder="Describe the scene, beats, camera progression, and continuity requirements for this storyboard."
                />
              </label>

              <label className="openai-storyboard-panel__field">
                <span>Shots</span>
                <select value={shotCount} onChange={(event) => setShotCount(Number(event.target.value))}>
                  {SHOT_COUNT_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>

              <label className="openai-storyboard-panel__field">
                <span>Columns</span>
                <select value={columns} onChange={(event) => setColumns(Number(event.target.value))}>
                  {COLUMN_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>

              <label className="openai-storyboard-panel__field">
                <span>Rows</span>
                <select value={rows} onChange={(event) => setRows(event.target.value as StoryboardRowsMode)}>
                  {ROW_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>

              <label className="openai-storyboard-panel__field">
                <span>Resolution</span>
                <select value={size} onChange={(event) => setSize(event.target.value)}>
                  {SIZE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>

              <label className="openai-storyboard-panel__field">
                <span>Quality</span>
                <select value={quality} onChange={(event) => setQuality(event.target.value as OpenAIImageQuality)}>
                  {QUALITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>

              <label className="openai-storyboard-panel__field">
                <span>Generations</span>
                <select value={generationCount} onChange={(event) => setGenerationCount(Number(event.target.value))}>
                  {GENERATION_COUNT_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}
                </select>
              </label>

              <label className="openai-storyboard-panel__field openai-storyboard-panel__field--wide">
                <span>Saved Asset Title</span>
                <input
                  value={assetTitle}
                  onChange={(event) => setAssetTitle(event.target.value)}
                  placeholder="Name used in the assets library and storyboard history"
                />
              </label>
            </div>

            <div className="openai-storyboard-panel__actions">
              <button
                type="button"
                className={`openai-storyboard-panel__generate-btn${submissionFlash ? ' is-submitted' : ''}`}
                onClick={handleGenerate}
                disabled={isSubmittingRequest || !customPrompt.trim()}
              >
                {isSubmittingRequest ? 'Submitting...' : `Generate ${generationCount > 1 ? `${generationCount} Storyboards` : 'Storyboard'}`}
              </button>
              <button type="button" className="secondary" onClick={handleCopyPrompt}>
                {copiedPrompt ? 'Copied' : 'Copy Prompt'}
              </button>
              <button type="button" className="secondary" onClick={() => setShowPromptPreview((v) => !v)}>
                {showPromptPreview ? 'Hide Prompt' : 'View Prompt'}
              </button>
              <button type="button" className="secondary" onClick={() => setReferenceSlots(emptySlots())} disabled={isSubmittingRequest}>
                Clear Refs
              </button>
            </div>

            {showPromptPreview && (
              <div className="openai-storyboard-panel__prompt-preview">
                <div className="openai-storyboard-panel__section-head">
                  <div>
                    <strong>Built Storyboard Prompt</strong>
                    <p>Exact instruction set sent to OpenAI Image &mdash; {activeReferenceImages.length} ref{activeReferenceImages.length === 1 ? '' : 's'} attached.</p>
                  </div>
                </div>
                <pre>{composedPrompt}</pre>
              </div>
            )}
          </section>
        </main>

        <aside className="openai-storyboard-panel__side">
          <section className="openai-storyboard-panel__references card">
            <div className="openai-storyboard-panel__section-head">
              <div>
                <strong>Reference Slots</strong>
                <p>Drop canon images from References or Assets Library. OpenAI uses them as image inputs for storyboard consistency.</p>
              </div>
              <span>{activeReferenceImages.length}/{REFERENCE_SLOT_COUNT}</span>
            </div>

            <div className="openai-storyboard-panel__slots">
              {referenceSlots.map((reference, index) => (
                <div
                  key={index}
                  className={`openai-storyboard-panel__slot${dragOverSlot === index ? ' is-dragover' : ''}${reference ? '' : ' is-empty'}`}
                  onDragOver={(event) => {
                    event.preventDefault()
                    setDragOverSlot(index)
                    event.dataTransfer.dropEffect = 'copy'
                  }}
                  onDragLeave={() => setDragOverSlot(null)}
                  onDrop={(event) => handleDrop(event, index)}
                >
                  {reference ? (
                    <>
                      <img src={reference.url} alt={reference.name} />
                      <div className="openai-storyboard-panel__slot-meta">
                        <span>{reference.name}</span>
                        <button type="button" onClick={() => clearSlot(index)}>Remove</button>
                      </div>
                    </>
                  ) : (
                    <span>Drop ref {index + 1}</span>
                  )}
                </div>
              ))}
            </div>

            {suggestedReferences.length > 0 && (
              <div className="openai-storyboard-panel__suggested">
                <span>Project images</span>
                <div className="openai-storyboard-panel__suggested-grid">
                  {suggestedReferences.map((reference) => (
                    <button key={reference.url} type="button" onClick={() => assignReferenceToNextSlot(reference)}>
                      <img src={reference.url} alt={reference.name} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

          <section className="openai-storyboard-panel__preview card">
            <div className="openai-storyboard-panel__section-head">
              <div>
                <strong>Preview</strong>
                <p>{selectedHistoryItem ? 'Showing the selected storyboard asset.' : 'Select a completed history item to preview it here.'}</p>
              </div>
              <span>{selectedHistorySettings ? buildLayoutSummary(readNumberFromPayload(selectedHistorySettings, 'openAIShotCount', shotCount), readNumberFromPayload(selectedHistorySettings, 'openAIColumns', columns), readRowsFromPayload(selectedHistorySettings)) : buildLayoutSummary(shotCount, columns, rows)}</span>
            </div>

            {previewImageUrl ? (
              <img src={previewImageUrl} alt="Storyboard preview" className="openai-storyboard-panel__preview-image" />
            ) : (
              <div className="openai-storyboard-panel__preview-empty">Completed storyboard previews appear here.</div>
            )}

            <div className="openai-storyboard-panel__preview-meta">
              <div>
                <strong>Model</strong>
                <span>{selectedHistoryItem?.model || health?.openaiImageModel || 'gpt-image-2'}</span>
              </div>
              <div>
                <strong>Resolution</strong>
                <span>{selectedHistoryItem?.resolution || size}</span>
              </div>
              <div>
                <strong>Status</strong>
                <span>{selectedHistoryItem?.status || 'idle'}</span>
              </div>
              <div>
                <strong>Request</strong>
                <span>{selectedHistoryItem?.taskId || 'No task selected'}</span>
              </div>
            </div>
          </section>

          <section className="openai-storyboard-panel__history card">
            <div className="openai-storyboard-panel__section-head">
              <div>
                <strong>Storyboard History</strong>
                <p>Shared history survives refresh and follows your account to another machine.</p>
              </div>
            </div>

            {syncedStoryboardHistory.length === 0 ? (
              <div className="openai-storyboard-panel__history-empty">No storyboard history yet.</div>
            ) : (
              <div className="openai-storyboard-panel__history-list">
                {syncedStoryboardHistory.map((item) => {
                  const payload = item.requestPayload || null
                  const historyTitle = buildGeneratedAssetTitle(
                    readStringFromPayload(payload, 'openAIAssetTitleBase', item.prompt.slice(0, 72) || 'Storyboard'),
                    readNumberFromPayload(payload, 'openAIAssetIndex', 0),
                    readNumberFromPayload(payload, 'openAIAssetCount', 1),
                  )

                  return (
                    <div
                      key={item.id}
                      className={`openai-storyboard-panel__history-item${item.id === selectedHistoryId ? ' is-active' : ''}${item.status !== 'success' ? ' is-muted' : ''}`}
                    >
                      <button
                        type="button"
                        className="openai-storyboard-panel__history-preview"
                        onClick={() => {
                          setSelectedHistoryId(item.id)
                          handleOpenHistoryPreview(item)
                        }}
                        disabled={!item.resultUrl}
                      >
                        {item.resultUrl ? (
                          <img src={item.resultUrl} alt={historyTitle} />
                        ) : (
                          <div className="openai-storyboard-panel__history-placeholder">{item.status === 'failed' ? 'Failed' : 'Generating'}</div>
                        )}
                      </button>
                      <div>
                        <strong>{historyTitle}</strong>
                        <span>{new Date(item.timestamp).toLocaleString()}</span>
                        <span>{buildLayoutSummary(readNumberFromPayload(payload, 'openAIShotCount', 4), readNumberFromPayload(payload, 'openAIColumns', 2), readRowsFromPayload(payload))}</span>
                        <span className={`openai-storyboard-panel__history-status is-${item.status}`}>{item.status}</span>
                        <div className="openai-storyboard-panel__history-actions">
                          <button type="button" onClick={() => handleRestoreFromHistory(item)}>Load settings</button>
                          <button type="button" onClick={() => { setSelectedHistoryId(item.id); handleOpenHistoryPreview(item) }} disabled={!item.resultUrl}>Open viewer</button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        </aside>
      </div>

      <style>{`
        .openai-storyboard-panel {
          height: 100%;
          min-height: 0;
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
          padding: 0.65rem 0.75rem;
          overflow: hidden;
          background: rgba(13, 13, 13, 0.98);
          color: rgba(229, 231, 235, 0.92);
          font-size: 0.76rem;
        }

        .openai-storyboard-panel__header {
          display: flex;
          justify-content: space-between;
          gap: 0.55rem;
          align-items: center;
          flex-wrap: wrap;
          flex: 0 0 auto;
        }

        .openai-storyboard-panel__titlewrap {
          display: flex;
          align-items: center;
          gap: 0.55rem;
          min-width: 0;
        }

        .openai-storyboard-panel__eyebrow {
          margin: 0;
          font-size: 0.64rem;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: rgba(165, 165, 165, 0.65);
          font-weight: 700;
          white-space: nowrap;
        }

        .openai-storyboard-panel__header h2 {
          margin: 0;
          font-size: 0.82rem;
          font-weight: 700;
          color: rgba(244, 244, 244, 0.95);
          white-space: nowrap;
        }

        .openai-storyboard-panel__copy,
        .openai-storyboard-panel__project-note {
          display: none;
        }

        .openai-storyboard-panel__header-meta {
          display: flex;
          gap: 0.4rem;
          flex-wrap: wrap;
          align-items: center;
        }

        .openai-storyboard-panel__health,
        .openai-storyboard-panel__layout-chip {
          padding: 0.26rem 0.58rem;
          border-radius: 999px;
          border: 1px solid rgba(165, 165, 165, 0.2);
          background: rgba(30, 30, 30, 0.88);
          color: rgba(165, 165, 165, 0.72);
          font-size: 0.67rem;
          white-space: nowrap;
        }

        .openai-storyboard-panel__health[data-state='ok'] {
          border-color: rgba(100, 170, 80, 0.28);
          color: rgba(130, 195, 96, 0.9);
        }

        .openai-storyboard-panel__health[data-state='warn'] {
          border-color: rgba(200, 120, 40, 0.28);
          color: rgba(220, 150, 70, 0.9);
        }

        .openai-storyboard-panel__group-tabs {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
          flex: 0 0 auto;
        }

        .openai-storyboard-panel__group-tab {
          display: flex;
          flex-direction: column;
          gap: 0.12rem;
          align-items: flex-start;
          padding: 0.35rem 0.68rem;
          border-radius: 999px;
          border: 1px solid rgba(165, 165, 165, 0.18);
          background: rgba(25, 25, 25, 0.9);
          color: rgba(165, 165, 165, 0.72);
          cursor: pointer;
          text-align: left;
        }

        .openai-storyboard-panel__group-tab span {
          font-size: 0.71rem;
          font-weight: 700;
          color: rgba(210, 212, 218, 0.86);
        }

        .openai-storyboard-panel__group-tab small {
          font-size: 0.62rem;
          line-height: 1.3;
          color: rgba(165, 165, 165, 0.52);
        }

        .openai-storyboard-panel__group-tab.is-active {
          border-color: rgba(132, 156, 105, 0.35);
          background: rgba(19, 30, 25, 0.9);
        }

        .openai-storyboard-panel__group-tab.is-active span {
          color: rgba(244, 248, 236, 0.95);
        }

        .openai-storyboard-panel__group-tab.is-active small {
          color: rgba(194, 205, 188, 0.62);
        }

        .openai-storyboard-panel__body {
          min-height: 0;
          flex: 1;
          display: grid;
          grid-template-columns: minmax(180px, 210px) minmax(0, 1fr) minmax(270px, 320px);
          gap: 0.6rem;
          overflow: hidden;
        }

        .openai-storyboard-panel .card {
          border: 1px solid rgba(165, 165, 165, 0.13);
          border-radius: 0.72rem;
          background: rgba(19, 19, 19, 0.9);
        }

        .openai-storyboard-panel__nav,
        .openai-storyboard-panel__editor,
        .openai-storyboard-panel__side {
          min-height: 0;
          overflow: auto;
        }

        .openai-storyboard-panel__nav {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          padding-right: 0.2rem;
        }

        .openai-storyboard-panel__nav-group {
          border: 1px solid rgba(165, 165, 165, 0.13);
          border-radius: 0.62rem;
          background: rgba(19, 19, 19, 0.9);
          overflow: hidden;
        }

        .openai-storyboard-panel__nav-groupbtn {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 0.4rem;
          padding: 0.5rem 0.62rem;
          border: 0;
          background: transparent;
          font: inherit;
          font-size: 0.71rem;
          font-weight: 700;
          color: rgba(210, 212, 218, 0.84);
          cursor: pointer;
          text-align: left;
        }

        .openai-storyboard-panel__nav-list {
          display: flex;
          flex-direction: column;
          gap: 0.18rem;
          padding: 0 0.32rem 0.38rem;
        }

        .openai-storyboard-panel__nav-item {
          display: flex;
          flex-direction: column;
          gap: 0.16rem;
          padding: 0.46rem 0.52rem;
          border: 1px solid transparent;
          border-radius: 0.5rem;
          background: rgba(28, 28, 28, 0.9);
          color: rgba(165, 165, 165, 0.72);
          cursor: pointer;
          text-align: left;
        }

        .openai-storyboard-panel__nav-item strong {
          font-size: 0.71rem;
          color: rgba(229, 231, 235, 0.88);
        }

        .openai-storyboard-panel__nav-item span {
          font-size: 0.65rem;
          line-height: 1.35;
          color: rgba(165, 165, 165, 0.62);
        }

        .openai-storyboard-panel__nav-item em {
          font-style: normal;
          font-size: 0.62rem;
          color: rgba(220, 160, 90, 0.8);
        }

        .openai-storyboard-panel__nav-item.is-active {
          background: rgba(19, 30, 25, 0.92);
          border-color: rgba(132, 156, 105, 0.3);
        }

        .openai-storyboard-panel__nav-item.is-active strong,
        .openai-storyboard-panel__nav-item.is-active span {
          color: rgba(244, 248, 236, 0.9);
        }

        .openai-storyboard-panel__editor,
        .openai-storyboard-panel__side {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding-right: 0.2rem;
        }

        .openai-storyboard-panel__hero,
        .openai-storyboard-panel__form,
        .openai-storyboard-panel__prompt-preview,
        .openai-storyboard-panel__use-cases,
        .openai-storyboard-panel__references,
        .openai-storyboard-panel__preview,
        .openai-storyboard-panel__history {
          padding: 0.62rem 0.72rem;
        }

        .openai-storyboard-panel__example-eyebrow {
          margin: 0 0 0.22rem;
          font-size: 0.62rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(165, 165, 165, 0.58);
          font-weight: 700;
        }

        .openai-storyboard-panel__hero-chips,
        .openai-storyboard-panel__use-case-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.3rem;
          margin-top: 0.45rem;
        }

        .openai-storyboard-panel__hero-chips span,
        .openai-storyboard-panel__use-case-list span {
          padding: 0.2rem 0.44rem;
          border-radius: 999px;
          background: rgba(38, 38, 38, 0.9);
          border: 1px solid rgba(165, 165, 165, 0.14);
          color: rgba(165, 165, 165, 0.7);
          font-size: 0.67rem;
        }

        .openai-storyboard-panel__form-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 0.5rem;
        }

        .openai-storyboard-panel__field {
          display: flex;
          flex-direction: column;
          gap: 0.2rem;
        }

        .openai-storyboard-panel__field--full,
        .openai-storyboard-panel__field--wide {
          grid-column: 1 / -1;
        }

        .openai-storyboard-panel__field > span,
        .openai-storyboard-panel__section-head p,
        .openai-storyboard-panel__preview-meta span,
        .openai-storyboard-panel__history-item span {
          font-size: 0.67rem;
          color: rgba(165, 165, 165, 0.65);
        }

        .openai-storyboard-panel__slot-meta span {
          font-size: 0.67rem;
        }

        .openai-storyboard-panel__field textarea,
        .openai-storyboard-panel__field input,
        .openai-storyboard-panel__field select {
          width: 100%;
          min-width: 0;
          border: 1px solid rgba(165, 165, 165, 0.2);
          border-radius: 0.55rem;
          background: rgba(21, 21, 21, 0.9);
          color: rgba(229, 231, 235, 0.9);
          padding: 0.38rem 0.58rem;
          font: inherit;
          font-size: 0.73rem;
        }

        .openai-storyboard-panel__field textarea::placeholder,
        .openai-storyboard-panel__field input::placeholder {
          color: rgba(165, 165, 165, 0.42);
        }

        .openai-storyboard-panel__field textarea:focus,
        .openai-storyboard-panel__field input:focus,
        .openai-storyboard-panel__field select:focus {
          outline: none;
          border-color: rgba(165, 165, 165, 0.48);
        }

        .openai-storyboard-panel__field select option {
          background: rgba(25, 25, 25, 1);
          color: rgba(229, 231, 235, 0.9);
        }

        .openai-storyboard-panel__field textarea {
          min-height: 10rem;
          max-height: none;
          resize: vertical;
        }

        .openai-storyboard-panel__form-example {
          margin-bottom: 0.65rem;
          padding-bottom: 0.6rem;
          border-bottom: 1px solid rgba(165, 165, 165, 0.1);
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }

        .openai-storyboard-panel__form-example > div:first-child strong {
          font-size: 0.76rem;
          color: rgba(229, 231, 235, 0.9);
          display: block;
        }

        .openai-storyboard-panel__form-example > div:first-child span {
          font-size: 0.7rem;
          color: rgba(165, 165, 165, 0.62);
          line-height: 1.4;
          display: block;
          margin-top: 0.12rem;
        }

        .openai-storyboard-panel__example-badge {
          display: inline-block;
          font-style: normal;
          font-size: 0.6rem;
          font-weight: 700;
          letter-spacing: 0.09em;
          text-transform: uppercase;
          color: rgba(220, 160, 90, 0.82);
          margin-bottom: 0.08rem;
        }

        .openai-storyboard-panel__actions {
          display: flex;
          gap: 0.42rem;
          margin-top: 0.6rem;
          flex-wrap: wrap;
          align-items: center;
        }

        .openai-storyboard-panel__actions button,
        .openai-storyboard-panel__textbtn,
        .openai-storyboard-panel__slot-meta button,
        .openai-storyboard-panel__suggested button,
        .openai-storyboard-panel__history-item {
          cursor: pointer;
        }

        .openai-storyboard-panel__actions button {
          padding: 0.36rem 0.72rem;
          border-radius: 999px;
          background: rgba(35, 35, 35, 0.92);
          border: 1px solid rgba(165, 165, 165, 0.2);
          color: rgba(210, 212, 218, 0.88);
          font: inherit;
          font-size: 0.71rem;
          font-weight: 600;
        }

        .openai-storyboard-panel__generate-btn {
          padding: 0.4rem 0.9rem !important;
          font-size: 0.73rem !important;
          background: rgba(22, 48, 34, 0.94) !important;
          border-color: rgba(100, 156, 80, 0.3) !important;
          color: rgba(130, 195, 96, 0.95) !important;
        }

        .openai-storyboard-panel__generate-btn.is-submitted {
          background: rgba(22, 90, 50, 0.92) !important;
          border-color: rgba(100, 170, 80, 0.42) !important;
        }

        .openai-storyboard-panel__actions button.secondary,
        .openai-storyboard-panel__textbtn {
          background: rgba(28, 28, 28, 0.9);
          border: 1px solid rgba(165, 165, 165, 0.16);
          color: rgba(165, 165, 165, 0.74);
        }

        .openai-storyboard-panel__actions button:disabled {
          opacity: 0.48;
          cursor: not-allowed;
        }

        .openai-storyboard-panel__status-block {
          display: flex;
          flex-direction: column;
          gap: 0.28rem;
          margin-top: 0.5rem;
        }

        .openai-storyboard-panel__status {
          margin: 0;
          padding: 0.5rem 0.6rem;
          border-radius: 0.55rem;
          background: rgba(165, 165, 165, 0.06);
          font-size: 0.71rem;
          color: rgba(165, 165, 165, 0.78);
        }

        .openai-storyboard-panel__status.is-error {
          background: rgba(220, 38, 38, 0.1);
          color: rgba(250, 100, 100, 0.9);
        }

        .openai-storyboard-panel__status.is-success {
          background: rgba(22, 163, 74, 0.1);
          color: rgba(100, 200, 120, 0.9);
        }

        .openai-storyboard-panel__status a {
          color: inherit;
          font-weight: 700;
        }

        .openai-storyboard-panel__section-head {
          display: flex;
          justify-content: space-between;
          gap: 0.5rem;
          align-items: flex-start;
          margin-bottom: 0.5rem;
        }

        .openai-storyboard-panel__section-head strong {
          font-size: 0.73rem;
          color: rgba(210, 212, 218, 0.88);
        }

        .openai-storyboard-panel__section-head > span {
          font-size: 0.65rem;
          color: rgba(165, 165, 165, 0.62);
          white-space: nowrap;
        }

        .openai-storyboard-panel__section-head p {
          margin: 0.1rem 0 0;
          line-height: 1.4;
        }

        .openai-storyboard-panel__prompt-preview {
          margin-top: 0.6rem;
          padding-top: 0.6rem;
          border-top: 1px solid rgba(165, 165, 165, 0.1);
        }

        .openai-storyboard-panel__prompt-preview pre {
          margin: 0;
          padding: 0.6rem 0.7rem;
          border-radius: 0.55rem;
          background: rgba(8, 8, 8, 0.72);
          color: rgba(229, 231, 235, 0.82);
          white-space: pre-wrap;
          word-break: break-word;
          font-size: 0.7rem;
          line-height: 1.5;
          overflow: auto;
          max-height: 16rem;
        }

        .openai-storyboard-panel__slots {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.45rem;
        }

        .openai-storyboard-panel__slot {
          position: relative;
          min-height: 6.5rem;
          border-radius: 0.6rem;
          border: 1px dashed rgba(165, 165, 165, 0.18);
          background: rgba(22, 22, 22, 0.9);
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          text-align: center;
          color: rgba(165, 165, 165, 0.42);
          font-size: 0.67rem;
        }

        .openai-storyboard-panel__slot.is-dragover {
          border-color: rgba(132, 156, 105, 0.52);
          background: rgba(19, 30, 25, 0.7);
        }

        .openai-storyboard-panel__slot img,
        .openai-storyboard-panel__suggested button img,
        .openai-storyboard-panel__preview-image,
        .openai-storyboard-panel__history-item img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .openai-storyboard-panel__slot-meta {
          position: absolute;
          inset: auto 0 0 0;
          padding: 0.42rem 0.48rem;
          display: flex;
          justify-content: space-between;
          gap: 0.32rem;
          align-items: center;
          background: linear-gradient(180deg, rgba(0, 0, 0, 0), rgba(0, 0, 0, 0.88));
        }

        .openai-storyboard-panel__slot-meta span {
          color: rgba(244, 244, 244, 0.92) !important;
          font-weight: 600;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .openai-storyboard-panel__slot-meta button {
          padding: 0.2rem 0.4rem;
          border-radius: 999px;
          background: rgba(40, 40, 40, 0.92);
          border: 1px solid rgba(165, 165, 165, 0.22);
          color: rgba(210, 212, 218, 0.88);
          font-size: 0.63rem;
          cursor: pointer;
        }

        .openai-storyboard-panel__suggested {
          display: flex;
          flex-direction: column;
          gap: 0.32rem;
          margin-top: 0.5rem;
        }

        .openai-storyboard-panel__suggested > span {
          font-size: 0.67rem;
          color: rgba(165, 165, 165, 0.62);
        }

        .openai-storyboard-panel__suggested-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 0.36rem;
        }

        .openai-storyboard-panel__suggested button {
          aspect-ratio: 1;
          border-radius: 0.52rem;
          overflow: hidden;
          background: rgba(30, 30, 30, 0.9);
          border: 1px solid rgba(165, 165, 165, 0.14);
        }

        .openai-storyboard-panel__preview-image,
        .openai-storyboard-panel__preview-empty {
          min-height: 10rem;
          border-radius: 0.6rem;
          background: rgba(20, 20, 20, 0.9);
        }

        .openai-storyboard-panel__preview-empty,
        .openai-storyboard-panel__history-empty {
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(165, 165, 165, 0.48);
          text-align: center;
          padding: 0.7rem;
          font-size: 0.7rem;
        }

        .openai-storyboard-panel__preview-meta {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 0.45rem;
          margin-top: 0.5rem;
        }

        .openai-storyboard-panel__preview-meta > div {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
          min-width: 0;
        }

        .openai-storyboard-panel__preview-meta strong {
          font-size: 0.65rem;
          color: rgba(165, 165, 165, 0.62);
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .openai-storyboard-panel__history {
          min-height: 10rem;
          display: flex;
          flex-direction: column;
        }

        .openai-storyboard-panel__history-list {
          display: flex;
          flex-direction: column;
          gap: 0.36rem;
          overflow: auto;
          min-height: 0;
        }

        .openai-storyboard-panel__history-item {
          display: grid;
          grid-template-columns: 56px minmax(0, 1fr);
          gap: 0.45rem;
          align-items: stretch;
          padding: 0.36rem;
          border-radius: 0.55rem;
          background: rgba(22, 22, 22, 0.9);
          border: 1px solid rgba(165, 165, 165, 0.11);
          text-align: left;
          cursor: default;
        }

        .openai-storyboard-panel__history-item.is-muted {
          opacity: 0.72;
        }

        .openai-storyboard-panel__history-preview {
          border: 0;
          padding: 0;
          border-radius: 0.45rem;
          overflow: hidden;
          background: rgba(30, 30, 30, 0.9);
          min-height: 56px;
          cursor: pointer;
        }

        .openai-storyboard-panel__history-preview:disabled {
          cursor: default;
        }

        .openai-storyboard-panel__history-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: rgba(165, 165, 165, 0.48);
          font-size: 0.63rem;
          padding: 0.32rem;
          text-align: center;
        }

        .openai-storyboard-panel__history-item img {
          aspect-ratio: 1;
          border-radius: 0.45rem;
        }

        .openai-storyboard-panel__history-item div {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 0.12rem;
          justify-content: center;
        }

        .openai-storyboard-panel__history-item strong {
          font-size: 0.71rem;
          color: rgba(210, 212, 218, 0.88);
        }

        .openai-storyboard-panel__history-status {
          display: inline-flex;
          align-items: center;
          width: fit-content;
          padding: 0.1rem 0.36rem;
          border-radius: 999px;
          font-size: 0.61rem;
          text-transform: capitalize;
          background: rgba(38, 38, 38, 0.9);
          color: rgba(165, 165, 165, 0.68);
        }

        .openai-storyboard-panel__history-status.is-running,
        .openai-storyboard-panel__history-status.is-queued {
          background: rgba(200, 120, 40, 0.12);
          color: rgba(220, 150, 70, 0.9);
        }

        .openai-storyboard-panel__history-status.is-success {
          background: rgba(22, 163, 74, 0.12);
          color: rgba(100, 200, 120, 0.9);
        }

        .openai-storyboard-panel__history-status.is-failed {
          background: rgba(220, 38, 38, 0.12);
          color: rgba(250, 100, 100, 0.9);
        }

        .openai-storyboard-panel__history-actions {
          display: flex;
          gap: 0.28rem;
          margin-top: 0.08rem;
          flex-wrap: wrap;
        }

        .openai-storyboard-panel__history-actions button {
          border: 1px solid rgba(165, 165, 165, 0.16);
          padding: 0.2rem 0.42rem;
          border-radius: 999px;
          background: rgba(30, 30, 30, 0.9);
          color: rgba(165, 165, 165, 0.72);
          font: inherit;
          font-size: 0.63rem;
          cursor: pointer;
        }

        .openai-storyboard-panel__history-actions button:disabled {
          opacity: 0.42;
          cursor: default;
        }

        .openai-storyboard-panel__history-item.is-active {
          background: rgba(19, 30, 25, 0.94);
          border-color: rgba(132, 156, 105, 0.3);
        }

        .openai-storyboard-panel__history-item.is-active strong,
        .openai-storyboard-panel__history-item.is-active span {
          color: rgba(244, 248, 236, 0.9);
        }

        @media (max-width: 1360px) {
          .openai-storyboard-panel__body {
            grid-template-columns: 180px minmax(0, 1fr);
          }

          .openai-storyboard-panel__side {
            grid-column: 1 / -1;
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            overflow: hidden;
          }
        }

        @media (max-width: 1040px) {
          .openai-storyboard-panel__group-tabs,
          .openai-storyboard-panel__body,
          .openai-storyboard-panel__form-grid,
          .openai-storyboard-panel__preview-meta,
          .openai-storyboard-panel__side,
          .openai-storyboard-panel__suggested-grid {
            grid-template-columns: 1fr;
          }

          .openai-storyboard-panel__body {
            overflow: auto;
          }

          .openai-storyboard-panel__nav,
          .openai-storyboard-panel__editor,
          .openai-storyboard-panel__side {
            overflow: visible;
          }

          .openai-storyboard-panel__slots {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 720px) {
          .openai-storyboard-panel {
            padding: 0.45rem;
          }

          .openai-storyboard-panel__actions,
          .openai-storyboard-panel__header-meta,
          .openai-storyboard-panel__hero-chips,
          .openai-storyboard-panel__use-case-list {
            flex-direction: column;
          }

          .openai-storyboard-panel__slots,
          .openai-storyboard-panel__history-item {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </section>
  )
}