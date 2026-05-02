import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent, type SyntheticEvent } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, doc, getDocs, limit, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore'
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage'
import { auth, db, storage } from '../../lib/firebase'
import { ContentEditablePrompt } from '../../components/ContentEditablePrompt/ContentEditablePrompt'
import { getCaretOffset, setCaretOffset } from '../../components/ContentEditablePrompt/utils'
import type { ResolvedMentionReference } from '../../components/ContentEditablePrompt/types'
import { MiniVideoPlaylist } from './MiniVideoPlaylist'
import { Download, FilePenLine, Info, RotateCcw } from 'lucide-react'
import './workbench.css'

const CHATBOT_BASE = (import.meta.env.VITE_CHATBOT_API_URL as string | undefined) || ''
const apiUrl = (path: string) => `${CHATBOT_BASE.replace(/\/$/, '')}${path}`

const LOCAL_DRAFT_STORAGE_KEY = 'toorgen-prompt-lab-draft-v3'
const LOCAL_HISTORY_STORAGE_KEY = 'toorgen-prompt-lab-history-v3'
const SHARED_REFERENCE_LIBRARY_KEY = 'toorgen_reference_library_v1'
const CAPTURED_VIDEO_FRAMES_KEY = 'toorgen_video_frames_v1'
const DIRECT_REQUEST_PRESETS_KEY = 'toorgen_direct_request_presets_v1'
const DIRECT_JSON_DRAFT_KEY = 'toorgen_direct_json_draft_v1'
const PENDING_TASKS_KEY = 'toorgen_pending_tasks_v1'
const FIRESTORE_PENDING_TASKS_COLLECTION = 'toorgen_pending_tasks'
const FIRESTORE_HISTORY_COLLECTION = 'toorgen_prompt_lab_generations'
const MAX_HISTORY_ITEMS = 80

type ProviderId = 'byteplus' | 'atlas'
type MediaKind = 'image' | 'video' | 'audio'

type MediaField = {
  key: string
  label: string
  kind: MediaKind
  helpText: string
  placeholder: string
  required?: boolean
  role?: string
}

type PromptTab = {
  id: string
  group: string
  label: string
  summary: string
  requestMode: 'text-to-video' | 'image-to-video' | 'reference-to-video' | 'video-extension'
  promptTemplate: string
  examplePrompt: string
  documentPrompt: string
  promptPlaceholder: string
  fields: MediaField[]
  primaryVideoKey?: string
}

type ModeRuntimeState = {
  prompt: string
  mediaUrls: Record<string, string>
  uploadStates: Record<string, boolean>
  statusText: string
  resultUrl: string
  isGenerating: boolean
  strictReferences: boolean
  selectedVideoOptionIds: VideoWorkflowOptionId[]
  selectedImageReferenceKey: string
}

type VideoWorkflowOptionId =
  | 'multi-image-reference'
  | 'extend-forward'
  | 'extend-backward'
  | 'multi-element-composition'
  | 'motion-reference'
  | 'camera-motion-reference'
  | 'vfx-reference'
  | 'element-editing'
  | 'track-completion'

type VideoWorkflowOption = {
  id: VideoWorkflowOptionId
  label: string
  instruction: string
}

type VideoOptionAvailability = {
  enabled: boolean
  reason: string
  recommended: boolean
}

type VideoOptionPreset = {
  id: 'motion-pack' | 'extension-pack' | 'editing-pack' | 'track-pack'
  label: string
  optionIds: VideoWorkflowOptionId[]
}

type SharedSettings = {
  provider: ProviderId
  model: string
  ratio: string
  duration: number
  resolution: string
  generateAudio: boolean
}

type WorkflowSettingsState = {
  provider: ProviderId
  byteplusModel: string
  atlasModel: string
  ratio: string
  duration: number
  resolution: string
  generateAudio: boolean
}

type ContentItem =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string }; role: string }
  | { type: 'video_url'; video_url: { url: string }; role: string }
  | { type: 'audio_url'; audio_url: { url: string }; role: string }

type GenerationHistoryEntry = {
  historyId: string
  taskId: string
  tabId: string
  tabLabel: string
  provider: ProviderId
  model: string
  ratio: string
  duration: number
  resolution: string
  generateAudio: boolean
  prompt: string
  mediaUrls: Record<string, string>
  requestEndpoint: string
  requestPayload: Record<string, unknown>
  resultUrl: string
  firebaseVideoUrl: string
  storageSaveError: string
  submittedAt: number
  receivedAt: number
  generationMs: number
  outputDimensions: string
  completedAt: number
  ownerUid: string
}

type MediaLibraryItem = {
  id: string
  kind: MediaKind
  url: string
  name: string
  createdAt: number
}

type DirectRequestPreset = {
  id: string
  name: string
  json: string
  createdAt: number
}

type DraftModeState = {
  prompt: string
  mediaUrls: Record<string, string>
  resultUrl: string
  strictReferences?: boolean
  selectedVideoOptionIds?: VideoWorkflowOptionId[]
  selectedImageReferenceKey?: string
}

type StoredDraftState = {
  activeTabId: string
  workflowSettingsByTabId: Record<string, WorkflowSettingsState>
  modeStates: Record<string, DraftModeState>
}

type VideoDialogState = {
  playbackUrl: string
  title: string
  details?: {
    historyId?: string
    sourceUrl: string
    prompt: string
    model: string
    provider: ProviderId
    timestamp: number
    requestEndpoint: string
    requestPayload: Record<string, unknown>
    tabLabel?: string
    ratio?: string
    resolution?: string
    durationSec?: number
    outputDimensions?: string
    generateAudio?: boolean
    taskId?: string
    submittedAt?: number
    receivedAt?: number
    generationMs?: number
  }
}

type CapturedVideoFrame = {
  id: string
  sourceKey: string
  imageDataUrl: string
  capturedAt: number
  videoTimeSec: number
  width: number
  height: number
}

type PresetAssetThumb = {
  id: string
  kind: 'image' | 'video'
  url: string
}

type PendingGeneration = {
  id: string
  tabId: string
  provider: ProviderId
  model: string
  createdAt: number
  taskId?: string
}

type PersistedPendingTask = {
  requestId: string
  taskId: string
  tabId: string
  provider: ProviderId
  model: string
  ratio: string
  duration: number
  resolution: string
  createdAt: number
  generateAudio?: boolean
  prompt?: string
  mediaUrls?: Record<string, string>
  requestEndpoint?: string
  requestPayload?: Record<string, unknown>
}

type MentionableReference = {
  id: string
  url: string
  label: string
  mentionKey: string
  kind: 'image' | 'video'
}

// ResolvedMentionReference is defined in components/ContentEditablePrompt/types.ts

const VIDEO_WORKFLOW_OPTIONS: VideoWorkflowOption[] = [
  {
    id: 'multi-image-reference',
    label: 'Multiple Images to Video',
    instruction: 'Use all provided reference images together and preserve cross-image identity consistency.',
  },
  {
    id: 'extend-forward',
    label: 'Extend Video Forward',
    instruction: 'Extend the input video forward with seamless continuation and coherent transition frames.',
  },
  {
    id: 'extend-backward',
    label: 'Extend Video Backward',
    instruction: 'Extend the input video backward with seamless pre-roll continuity and coherent transition frames.',
  },
  {
    id: 'multi-element-composition',
    label: 'Combine Elements in One Video',
    instruction: 'Combine referenced elements into a single coherent scene while preserving each element identity.',
  },
  {
    id: 'motion-reference',
    label: 'Motion Reference',
    instruction: 'Follow the motion dynamics from referenced videos and keep timing and movement style consistent.',
  },
  {
    id: 'camera-motion-reference',
    label: 'Camera Motion Reference',
    instruction: 'Follow camera movement language from referenced videos, including pan, tilt, push, and tracking behavior.',
  },
  {
    id: 'vfx-reference',
    label: 'Visual Effects Reference',
    instruction: 'Match the visual effects style and trajectory from referenced videos while integrating naturally into the scene.',
  },
  {
    id: 'element-editing',
    label: 'Add/Remove/Modify Elements',
    instruction: 'Apply edit intent precisely: add requested elements, remove unwanted elements, and modify only specified targets.',
  },
  {
    id: 'track-completion',
    label: 'Complete Tracks',
    instruction: 'Concatenate up to three referenced clips into a seamless storyline with logical transitions and temporal continuity.',
  },
]

const VIDEO_OPTION_SET = new Set<VideoWorkflowOptionId>(VIDEO_WORKFLOW_OPTIONS.map((option) => option.id))

const VIDEO_OPTION_PRESETS: VideoOptionPreset[] = [
  {
    id: 'motion-pack',
    label: 'Motion Pack',
    optionIds: ['motion-reference', 'camera-motion-reference', 'vfx-reference'],
  },
  {
    id: 'extension-pack',
    label: 'Video Extension Pack',
    optionIds: ['extend-forward', 'extend-backward'],
  },
  {
    id: 'editing-pack',
    label: 'Element Editing Pack',
    optionIds: ['element-editing', 'multi-element-composition'],
  },
  {
    id: 'track-pack',
    label: 'Track Completion Pack',
    optionIds: ['track-completion', 'motion-reference'],
  },
]

const WORKFLOW_GROUP_ICONS: Record<string, string> = {
  'Core Workflows': '🎬',
  'Text Rendering': '📝',
  'Image Reference': '🖼️',
  'Video Reference': '🎥',
  'Video Editing': '✂️',
}

const WORKFLOW_FILTER_GROUPS: Record<'all' | 'text' | 'video' | 'image', string[] | null> = {
  all: null,
  text: ['Text Rendering'],
  video: ['Core Workflows', 'Video Reference', 'Video Editing'],
  image: ['Image Reference'],
}

type HistoryViewMode = 'cards' | 'rail'
type WorkflowFilterMode = 'all' | 'text' | 'video' | 'image'

const PROVIDER_MODELS = {
  byteplus: [
    'dreamina-seedance-2-0-260128',
    'dreamina-seedance-1-5-pro-250528',
    'dreamina-seedance-1-5-lite-250528',
  ],
  atlas: [
    'seedance-2.0-fast',
    'atlas-2.0',
  ],
} as const

const COMBINED_MODEL_OPTIONS: Array<{ value: string; label: string; provider: ProviderId; model: string }> = [
  {
    value: 'atlas:seedance-2.0-fast',
    label: 'Atlas Cloud 2.0 Fast',
    provider: 'atlas',
    model: 'seedance-2.0-fast',
  },
  {
    value: 'atlas:atlas-2.0',
    label: 'Atlas Cloud 2.0',
    provider: 'atlas',
    model: 'atlas-2.0',
  },
  {
    value: 'byteplus:dreamina-seedance-2-0-260128',
    label: 'BytePlus Seedance 2.0',
    provider: 'byteplus',
    model: 'dreamina-seedance-2-0-260128',
  },
  {
    value: 'byteplus:dreamina-seedance-1-5-pro-250528',
    label: 'BytePlus 1.5 Pro',
    provider: 'byteplus',
    model: 'dreamina-seedance-1-5-pro-250528',
  },
]

const RATIOS = ['16:9', '9:16', '4:3', '3:4', '1:1', '21:9', 'adaptive'] as const
const DURATION_OPTIONS = [5, 10, 15] as const
const RESOLUTIONS = ['480p', '720p', '1080p'] as const
const DEFAULT_VIDEO_URL = 'https://firebasestorage.googleapis.com/v0/b/qyan-om.firebasestorage.app/o/toorgen-extend%2Fvideo%2Fextend-1777474874393-rjq91asf9oq.mp4?alt=media&token=97442a31-5b22-4223-8e1d-c102d5a9f10a'
const DEFAULT_IMAGE_URL = 'https://firebasestorage.googleapis.com/v0/b/qyan-om.firebasestorage.app/o/toorgen-extend%2Fimage%2Fextend-1777474919140-22v7xf8jydw.jpg?alt=media&token=4b7bcc36-3fdb-4302-87d5-8f065185bb89'
const VIDEO_PLUS_IMAGE_MODE_ID = 'video-plus-image-references'
const IMAGE_SINGLE_REFERENCE_MODE_ID = 'image-to-video'

const TABS: PromptTab[] = [
  {
    id: VIDEO_PLUS_IMAGE_MODE_ID,
    group: 'Core Workflows',
    label: 'Video + Image Refs',
    summary: 'Reference-to-video with all image references included in one request.',
    requestMode: 'reference-to-video',
    promptTemplate: 'Generate a scene in the bedroom where the boy is playfully sparring with the magical book, demonstrating complex footwork and a happy smile.',
    examplePrompt: 'Generate a scene in the bedroom where the boy is playfully sparring with the magical book, demonstrating complex footwork and a happy smile.',
    documentPrompt: 'Generate a scene in the bedroom where the boy is playfully sparring with the magical book, demonstrating complex footwork and a happy smile.',
    promptPlaceholder: 'Describe the final scene to generate...',
    fields: [
      {
        key: 'image1',
        label: 'Image 1',
        kind: 'image',
        role: 'reference_image',
        placeholder: 'Paste reference image URL...',
        helpText: 'Reference image slot 1.',
      },
      {
        key: 'image2',
        label: 'Image 2',
        kind: 'image',
        role: 'reference_image',
        placeholder: 'Paste reference image URL...',
        helpText: 'Reference image slot 2.',
      },
      {
        key: 'image3',
        label: 'Image 3',
        kind: 'image',
        role: 'reference_image',
        placeholder: 'Paste reference image URL...',
        helpText: 'Reference image slot 3.',
      },
      {
        key: 'image4',
        label: 'Image 4',
        kind: 'image',
        role: 'reference_image',
        placeholder: 'Paste reference image URL...',
        helpText: 'Reference image slot 4.',
      },
      {
        key: 'image5',
        label: 'Image 5',
        kind: 'image',
        role: 'reference_image',
        placeholder: 'Paste reference image URL...',
        helpText: 'Reference image slot 5.',
      },
      {
        key: 'image6',
        label: 'Image 6',
        kind: 'image',
        role: 'reference_image',
        placeholder: 'Paste reference image URL...',
        helpText: 'Reference image slot 6.',
      },
    ],
  },
  {
    id: 'text-to-video',
    group: 'Core Workflows',
    label: 'Text to Video',
    summary: 'Generate a scene from prompt only.',
    requestMode: 'text-to-video',
    promptTemplate: 'Wisam + [action with the magical book] + [his room] + [animation style/emotion]',
    examplePrompt: 'Wisam stands inside his messy room, jumping backward into a complex backflip as the magical book flies toward him. He acts surprised and afraid, dodging its glowing pages as small germs crawl across his computer screen in the background.',
    documentPrompt: 'Create a dynamic indoor action scene focusing on Wisam in his room. He is locked in a fast-paced, high-energy fight with a flying, sentient magical book. The animation should showcase complex acrobatics like a backflip dodge, capturing his expression of sudden fear and surprise. On a desk in the background, a few tiny germs can be seen moving across a glowing computer screen.',
    promptPlaceholder: 'Describe the scene, camera, motion, and atmosphere...',
    fields: [],
  },
  {
    id: IMAGE_SINGLE_REFERENCE_MODE_ID,
    group: 'Core Workflows',
    label: 'Image to Video',
    summary: 'Select one image from references as the generation anchor.',
    requestMode: 'image-to-video',
    promptTemplate: 'A powerful off-road vehicle emerging from the distance and driving toward the camera across a vast rugged landscape, dust trails rising behind the tires, cinematic wide shot, low-angle camera perspective, dramatic sunlight, epic adventure movie atmosphere, ultra-realistic, 4K.',
    examplePrompt: 'A powerful off-road vehicle emerging from the distance and driving toward the camera across a vast rugged landscape, dust trails rising behind the tires, cinematic wide shot, low-angle camera perspective, dramatic sunlight, epic adventure movie atmosphere, ultra-realistic, 4K.',
    documentPrompt: 'A powerful off-road vehicle emerging from the distance and driving toward the camera across a vast rugged landscape, dust trails rising behind the tires, cinematic wide shot, low-angle camera perspective, dramatic sunlight, epic adventure movie atmosphere, ultra-realistic, 4K.',
    promptPlaceholder: 'Describe the single-image-to-video scene in final cinematic detail...',
    fields: [
      {
        key: 'image1',
        label: 'Image 1',
        kind: 'image',
        role: 'reference_image',
        placeholder: 'Paste reference image URL...',
        helpText: 'Reference image slot 1.',
      },
      {
        key: 'image2',
        label: 'Image 2',
        kind: 'image',
        role: 'reference_image',
        placeholder: 'Paste reference image URL...',
        helpText: 'Reference image slot 2.',
      },
      {
        key: 'image3',
        label: 'Image 3',
        kind: 'image',
        role: 'reference_image',
        placeholder: 'Paste reference image URL...',
        helpText: 'Reference image slot 3.',
      },
      {
        key: 'image4',
        label: 'Image 4',
        kind: 'image',
        role: 'reference_image',
        placeholder: 'Paste reference image URL...',
        helpText: 'Reference image slot 4.',
      },
      {
        key: 'image5',
        label: 'Image 5',
        kind: 'image',
        role: 'reference_image',
        placeholder: 'Paste reference image URL...',
        helpText: 'Reference image slot 5.',
      },
      {
        key: 'image6',
        label: 'Image 6',
        kind: 'image',
        role: 'reference_image',
        placeholder: 'Paste reference image URL...',
        helpText: 'Reference image slot 6.',
      },
    ],
  },
  {
    id: 'video-to-video',
    group: 'Core Workflows',
    label: 'Video to Video',
    summary: 'Transform or continue an existing clip.',
    requestMode: 'reference-to-video',
    promptTemplate: 'Use Video 1. Preserve [Wisam room layout] and change [book attack motion / acrobatics].',
    examplePrompt: 'Use Video 1 as the source. Keep Wisam\'s room and original lighting, but transform the action so he performs a complex backflip over the magical book. The germs on his desktop paper should react to the motion.',
    documentPrompt: 'Use Video 1 as the source clip. Preserve the framing and environmental details of Wisam\'s bedroom. Alter the core action to feature an exaggerated, highly animated fighting sequence where Wisam evades the magical book with a backward flip. Include tiny details like 2D germs drawn on piece of paper on his desk shivering from the impact.',
    promptPlaceholder: 'Describe what the source clip should keep and what should change...',
    primaryVideoKey: 'video1',
    fields: [
      {
        key: 'video1',
        label: 'Video 1',
        kind: 'video',
        required: true,
        role: 'reference_video',
        placeholder: 'Paste the source video URL...',
        helpText: 'Base clip for continuation or transformation.',
      },
    ],
  },
  {
    id: 'text-rendering-slogans',
    group: 'Text Rendering',
    label: 'Slogans',
    summary: 'Render short slogans with timing and style control.',
    requestMode: 'image-to-video',
    promptTemplate: '[Wisam room scene] + render the exact slogan + [reaction] + [style]',
    examplePrompt: 'Wisam mid-jump in his room dodging the book. Render the words "The Fight Begins" in the center, appearing with dynamic fast timing, comic book action style.',
    documentPrompt: 'Create an action-packed scene of Wisam inside his bedroom fighting a hovering magical book. He is frozen in a defensive stance, looking somewhat fearful. Render the exact slogan "The Fight Begins" forcefully appearing in the center of the frame, using a bold, dynamic comic-book font that matches the intense animation style.',
    promptPlaceholder: 'Describe the scene and exactly how the slogan should appear...',
    fields: [
      {
        key: 'image1',
        label: 'Image 1',
        kind: 'image',
        placeholder: 'Optional scene image URL...',
        helpText: 'Optional anchor for composition.',
      },
    ],
  },
  {
    id: 'text-rendering-subtitles',
    group: 'Text Rendering',
    label: 'Subtitles',
    summary: 'Match subtitles to voice or scene timing.',
    requestMode: 'reference-to-video',
    promptTemplate: '[Wisam room scene] + render subtitles at [position] + time to [action/speech].',
    examplePrompt: 'Wisam argues with the flying book in his room. Render the subtitle "Stop chasing me!" at the bottom center, timed with his panicked backward step.',
    documentPrompt: 'Set the scene inside Wisam\'s room where he is verbally arguing with the magical book hovering aggressively in front of him. He is panting and afraid. Render the exact subtitle "Stop chasing me!" at the bottom center. Ensure the subtitle timing corresponds exactly to his frantic movement and facial cadence.',
    promptPlaceholder: 'Describe the subtitle style, position, and timing...',
    fields: [
      {
        key: 'video1',
        label: 'Video 1',
        kind: 'video',
        role: 'reference_video',
        placeholder: 'Optional scene video URL...',
        helpText: 'Optional scene timing reference.',
      },
      {
        key: 'audio1',
        label: 'Audio 1',
        kind: 'audio',
        role: 'reference_audio',
        placeholder: 'Optional narration or speech URL...',
        helpText: 'Optional audio timing reference.',
      },
    ],
  },
  {
    id: 'text-rendering-speech-bubbles',
    group: 'Text Rendering',
    label: 'Speech Bubbles',
    summary: 'Place speech bubbles clearly within the frame.',
    requestMode: 'image-to-video',
    promptTemplate: '[Wisam room fight] + render a speech bubble + [placement] + [bubble style]',
    examplePrompt: 'Wisam looks confident and happy mid-backflip. Add a speech bubble near him that says "Missed me!" with a sharp, explosive comic aesthetic.',
    documentPrompt: 'Frame an intense acrobatic moment in Wisam\'s room where he successfully backflips away from the magical book. He has a triumphant, happy expression. Add an explosive-style comic speech bubble near his head containing the exact text "Missed me!". Ensure the bubble fits the dynamic, complex animation aesthetic.',
    promptPlaceholder: 'Describe the bubble, its text, and where it should appear...',
    fields: [
      {
        key: 'image1',
        label: 'Image 1',
        kind: 'image',
        placeholder: 'Optional frame image URL...',
        helpText: 'Optional bubble placement anchor.',
      },
    ],
  },
  {
    id: 'image-reference-subject',
    group: 'Image Reference',
    label: 'Subject Reference',
    summary: 'Use one or more reference images to lock subject identity.',
    requestMode: 'image-to-video',
    promptTemplate: 'Use Image 1 (and optionally Images 2-5) as Wisam references. Generate [new fight sequence in his room].',
    examplePrompt: 'Use Image 1 and Image 2 to maintain Wisam\'s design from two angles. Generate a scene in his bedroom where he is playfully sparring with the magical book, demonstrating complex footwork and a happy smile.',
    documentPrompt: 'Use Image 1 plus any additional subject references (Images 2-5) to preserve Wisam\'s identity from multiple viewpoints. Place him inside a cluttered bedroom environment. Animate a highly complex sequence showcasing his agility as he dodges and weaves around the flying magical book, maintaining a joyful, excited expression throughout the fast-paced motion.',
    promptPlaceholder: 'Describe how each referenced subject image should guide the output...',
    fields: [
      {
        key: 'image1',
        label: 'Image 1',
        kind: 'image',
        required: true,
        role: 'reference_image',
        placeholder: 'Paste the subject reference URL...',
        helpText: 'Primary identity reference.',
      },
      {
        key: 'image2',
        label: 'Image 2',
        kind: 'image',
        role: 'reference_image',
        placeholder: 'Optional second subject reference URL...',
        helpText: 'Optional secondary identity angle.',
      },
      {
        key: 'image3',
        label: 'Image 3',
        kind: 'image',
        role: 'reference_image',
        placeholder: 'Optional third subject reference URL...',
        helpText: 'Optional tertiary identity angle.',
      },
      {
        key: 'image4',
        label: 'Image 4',
        kind: 'image',
        role: 'reference_image',
        placeholder: 'Optional fourth subject reference URL...',
        helpText: 'Optional extra identity variation.',
      },
      {
        key: 'image5',
        label: 'Image 5',
        kind: 'image',
        role: 'reference_image',
        placeholder: 'Optional fifth subject reference URL...',
        helpText: 'Optional extra identity variation.',
      },
    ],
  },
  {
    id: 'image-reference-multi',
    group: 'Image Reference',
    label: 'Multi Image',
    summary: 'Combine multiple image references into one output.',
    requestMode: 'image-to-video',
    promptTemplate: 'Use Image 1 for Wisam and Image 2 for [the book]. Combine them in a [room fight scenario].',
    examplePrompt: 'Use Image 1 for Wisam and Image 2 for the magical book. Show the book aggressively flying at him inside his room while he frantically flips backward in fear.',
    documentPrompt: 'Blend Image 1 (Wisam) and Image 2 (the magical book). Establish the setting inside his bedroom. Create a high-intensity animation where the book launches a sudden attack, forcing Wisam to perform a desperate, complex backflip to avoid it. His expression should read as pure panic, capturing advanced acrobatic physics.',
    promptPlaceholder: 'Describe what each reference image should contribute...',
    fields: [
      {
        key: 'image1',
        label: 'Image 1',
        kind: 'image',
        required: true,
        role: 'reference_image',
        placeholder: 'Paste the first reference image URL...',
        helpText: 'Primary image reference.',
      },
      {
        key: 'image2',
        label: 'Image 2',
        kind: 'image',
        required: true,
        role: 'reference_image',
        placeholder: 'Paste the second reference image URL...',
        helpText: 'Secondary image reference.',
      },
      {
        key: 'image3',
        label: 'Image 3',
        kind: 'image',
        role: 'reference_image',
        placeholder: 'Optional third image URL...',
        helpText: 'Optional tertiary reference.',
      },
    ],
  },
  {
    id: 'image-reference-sequence',
    group: 'Image Reference',
    label: 'Image Sequence',
    summary: 'Use several images to describe a progression or transition.',
    requestMode: 'image-to-video',
    promptTemplate: 'Use Images 1-3 to guide the sequence of a [room fight and acrobatics].',
    examplePrompt: 'Use Images 1 to 3 to map the choreography. Wisam starts on the floor, jumps onto his desk, and backflips to dodge the book, looking terrified then relieved.',
    documentPrompt: 'Utilize the provided image sequence to direct a complex combat animation inside Wisam\'s room. He begins cornered on the floor, vaults onto his desk—disturbing a glowing computer screen showing small germs—and executes a dramatic backflip to evade the magical book. The character should transition dynamically from intense fear to breathless relief.',
    promptPlaceholder: 'Describe how the image sequence should shape the output...',
    fields: [
      {
        key: 'image1',
        label: 'Image 1',
        kind: 'image',
        required: true,
        role: 'reference_image',
        placeholder: 'Paste the first sequence image URL...',
        helpText: 'Start of the sequence.',
      },
      {
        key: 'image2',
        label: 'Image 2',
        kind: 'image',
        required: true,
        role: 'reference_image',
        placeholder: 'Paste the second sequence image URL...',
        helpText: 'Middle of the sequence.',
      },
      {
        key: 'image3',
        label: 'Image 3',
        kind: 'image',
        required: true,
        role: 'reference_image',
        placeholder: 'Paste the third sequence image URL...',
        helpText: 'End of the sequence.',
      },
    ],
  },
  {
    id: 'video-reference-motion',
    group: 'Video Reference',
    label: 'Motion Reference',
    summary: 'Borrow pacing or motion language from another clip.',
    requestMode: 'reference-to-video',
    promptTemplate: 'Extract motion from Video 1. Apply it to Wisam fighting the book in his room.',
    examplePrompt: 'Use Video 1 for the jumping choreography. Apply it to Wisam inside his bedroom as he performs a massive leaping dodge away from the magical book with a terrified face.',
    documentPrompt: 'Extract only the acrobatic motion data from Video 1. Map this complex jumping and flipping movement onto Wisam inside his bedroom environment. As he executes the motion, position the magical book as the aggressor he is dodging, and animate his face to express genuine fear of the flying object.',
    promptPlaceholder: 'Describe which motion qualities should transfer...',
    fields: [
      {
        key: 'video1',
        label: 'Video 1',
        kind: 'video',
        required: true,
        role: 'reference_video',
        placeholder: 'Paste the motion reference video URL...',
        helpText: 'Motion or pacing reference.',
      },
      {
        key: 'image1',
        label: 'Image 1',
        kind: 'image',
        role: 'reference_image',
        placeholder: 'Optional subject image URL...',
        helpText: 'Optional subject identity anchor.',
      },
    ],
  },
  {
    id: 'video-reference-camera',
    group: 'Video Reference',
    label: 'Camera Reference',
    summary: 'Reuse camera energy, framing, or lens feel.',
    requestMode: 'reference-to-video',
    promptTemplate: 'Use Video 1 for camera path. Frame [Wisam dodging the book in his room].',
    examplePrompt: 'Follow the energetic orbit of Video 1. Show Wisam in the center of his room performing a backflip over the charging magical book with a joyful expression.',
    documentPrompt: 'Replicate the aggressive, swirling camera move found in Video 1. The focus of the shot must be Wisam executing a highly skilled backflip directly over the attacking magical book. Keep the scene confined to his bedroom. His face should display happy, confident energy as he shows off his acrobatic abilities.',
    promptPlaceholder: 'Describe which camera behaviors should carry over...',
    fields: [
      {
        key: 'video1',
        label: 'Video 1',
        kind: 'video',
        required: true,
        role: 'reference_video',
        placeholder: 'Paste the camera reference video URL...',
        helpText: 'Reference for framing and camera movement.',
      },
      {
        key: 'image1',
        label: 'Image 1',
        kind: 'image',
        role: 'reference_image',
        placeholder: 'Optional subject or environment image URL...',
        helpText: 'Optional identity or scene anchor.',
      },
    ],
  },
  {
    id: 'video-reference-vfx',
    group: 'Video Reference',
    label: 'VFX Reference',
    summary: 'Reference visual effects timing or behavior from a clip.',
    requestMode: 'reference-to-video',
    promptTemplate: 'Use Video 1 for magical/lighting effects. Apply them to [the book attacking Wisam in his room].',
    examplePrompt: 'Take the particle glow from Video 1. Attach it to the magical book as it chases Wisam through his room, causing him to dive out of the way in panic.',
    documentPrompt: 'Isolate the magical VFX from Video 1 and apply them to the sentient book in Wisam\'s room. As the glowing, chaotic book swoops through the air, animate Wisam performing a complex, panicked diving maneuver to get out of the way, knocking over papers with little germ doodles on them.',
    promptPlaceholder: 'Describe the VFX behavior you want to borrow...',
    fields: [
      {
        key: 'video1',
        label: 'Video 1',
        kind: 'video',
        required: true,
        role: 'reference_video',
        placeholder: 'Paste the VFX reference video URL...',
        helpText: 'Reference for VFX rhythm or behavior.',
      },
      {
        key: 'image1',
        label: 'Image 1',
        kind: 'image',
        role: 'reference_image',
        placeholder: 'Optional target scene image URL...',
        helpText: 'Optional scene anchor for the effect.',
      },
    ],
  },
  {
    id: 'video-edit-elements',
    group: 'Video Editing',
    label: 'Edit Elements',
    summary: 'Edit a specific element while preserving the shot.',
    requestMode: 'reference-to-video',
    promptTemplate: 'Use Video 1. Replace or insert [an element] into [Wisam room fight].',
    examplePrompt: 'Use Video 1 as the base fight. Replace the background object with a computer monitor displaying crawling germs while Wisam happily flips away from the book.',
    documentPrompt: 'Edit the base footage of Wisam\'s acrobatic room fight. Insert a computer monitor clearly into the background of his bedroom, displaying active, squirming microscopic germs. Do not alter Wisam\'s joyful backflip or the flying magical book\'s trajectory.',
    promptPlaceholder: 'Describe the exact element edit and what must stay unchanged...',
    primaryVideoKey: 'video1',
    fields: [
      {
        key: 'video1',
        label: 'Video 1',
        kind: 'video',
        required: true,
        role: 'reference_video',
        placeholder: 'Paste the source video URL...',
        helpText: 'Source clip to edit.',
      },
      {
        key: 'image1',
        label: 'Image 1',
        kind: 'image',
        role: 'reference_image',
        placeholder: 'Optional replacement/style image URL...',
        helpText: 'Optional reference for the edited element.',
      },
    ],
  },
  {
    id: 'video-edit-extend',
    group: 'Video Editing',
    label: 'Extend',
    summary: 'Continue an existing video with seamless next-beat logic.',
    requestMode: 'video-extension',
    promptTemplate: 'Extend Video 1 by adding [next acrobatic move in the room fight].',
    examplePrompt: 'Continue Video 1. After Wisam lands, the book swings back around, forcing him to do a complex backward flip in fear.',
    documentPrompt: 'Take the ending of Video 1 and logically extend the animation inside the bedroom. As soon as Wisam lands his initial dodge, the magical book rebounds for a second attack. Wisam must immediately string together a complex backflip, his face shifting to genuine panic as the fight continues.',
    promptPlaceholder: 'Describe what happens next while keeping continuity...',
    primaryVideoKey: 'video1',
    fields: [
      {
        key: 'video1',
        label: 'Video 1',
        kind: 'video',
        required: true,
        role: 'reference_video',
        placeholder: 'Paste the video to extend...',
        helpText: 'Source clip for extension.',
      },
      {
        key: 'image1',
        label: 'Image 1',
        kind: 'image',
        role: 'reference_image',
        placeholder: 'Optional continuity image URL...',
        helpText: 'Optional continuity or identity reference.',
      },
    ],
  },
  {
    id: 'video-edit-track',
    group: 'Video Editing',
    label: 'Track',
    summary: 'Keep an element tracked while altering the surrounding scene or timing.',
    requestMode: 'reference-to-video',
    promptTemplate: 'Use Video 1 to track [text/germs] onto [a surface in Wisam room].',
    examplePrompt: 'Track Video 1\'s monitor. Overlay moving germs on the computer screen while Wisam fights the book in the foreground.',
    documentPrompt: 'Perform a precise surface track on the computer screen present in Wisam\'s bedroom from Video 1. Composite a layer of moving, animated germs onto the screen so they stay locked during the camera movement. The foreground action—Wisam\'s complex fight with the magical book—should remain untouched.',
    promptPlaceholder: 'Describe the tracked subject and the scene changes around it...',
    primaryVideoKey: 'video1',
    fields: [
      {
        key: 'video1',
        label: 'Video 1',
        kind: 'video',
        required: true,
        role: 'reference_video',
        placeholder: 'Paste the tracked video URL...',
        helpText: 'Video with the tracked subject or element.',
      },
      {
        key: 'audio1',
        label: 'Audio 1',
        kind: 'audio',
        role: 'reference_audio',
        placeholder: 'Optional audio track URL...',
        helpText: 'Optional sound reference or sync source.',
      },
      {
        key: 'image1',
        label: 'Image 1',
        kind: 'image',
        role: 'reference_image',
        placeholder: 'Optional visual reference URL...',
        helpText: 'Optional target style or scene reference.',
      },
    ],
  },
]

const ACTIVE_TABS: PromptTab[] = TABS.filter((tab) => tab.id === VIDEO_PLUS_IMAGE_MODE_ID || tab.id === IMAGE_SINGLE_REFERENCE_MODE_ID)

const FALLBACK_TAB: PromptTab = {
  id: 'workflow-empty',
  group: '',
  label: '',
  summary: '',
  requestMode: 'text-to-video',
  promptTemplate: '',
  examplePrompt: '',
  documentPrompt: '',
  promptPlaceholder: 'No workflows configured yet.',
  fields: [],
}

const NO_WORKFLOW_REFERENCE_FIELDS: MediaField[] = [
  {
    key: 'nowf-image1',
    label: 'Image 1',
    kind: 'image',
    helpText: 'General reference image slot.',
    placeholder: 'Paste image URL...',
  },
  {
    key: 'nowf-image2',
    label: 'Image 2',
    kind: 'image',
    helpText: 'General reference image slot.',
    placeholder: 'Paste image URL...',
  },
  {
    key: 'nowf-image3',
    label: 'Image 3',
    kind: 'image',
    helpText: 'General reference image slot.',
    placeholder: 'Paste image URL...',
  },
  {
    key: 'nowf-image4',
    label: 'Image 4',
    kind: 'image',
    helpText: 'General reference image slot.',
    placeholder: 'Paste image URL...',
  },
  {
    key: 'nowf-image5',
    label: 'Image 5',
    kind: 'image',
    helpText: 'General reference image slot.',
    placeholder: 'Paste image URL...',
  },
  {
    key: 'nowf-image6',
    label: 'Image 6',
    kind: 'image',
    helpText: 'General reference image slot.',
    placeholder: 'Paste image URL...',
  },
  {
    key: 'nowf-video1',
    label: 'Video 1',
    kind: 'video',
    helpText: 'General reference video slot.',
    placeholder: 'Paste video URL...',
  },
  {
    key: 'nowf-video2',
    label: 'Video 2',
    kind: 'video',
    helpText: 'General reference video slot.',
    placeholder: 'Paste video URL...',
  },
  {
    key: 'nowf-video3',
    label: 'Video 3',
    kind: 'video',
    helpText: 'General reference video slot.',
    placeholder: 'Paste video URL...',
  },
]

const createDefaultMediaUrls = (tab: PromptTab): Record<string, string> => {
  const next: Record<string, string> = {}
  tab.fields.forEach((field) => {
    if (field.kind === 'image') {
      next[field.key] = DEFAULT_IMAGE_URL
    }
    if (field.kind === 'video') {
      next[field.key] = DEFAULT_VIDEO_URL
    }
  })
  return next
}

const createDefaultModeState = (tab: PromptTab): ModeRuntimeState => ({
  prompt: '',
  mediaUrls: createDefaultMediaUrls(tab),
  uploadStates: {},
  statusText: '',
  resultUrl: '',
  isGenerating: false,
  strictReferences: false,
  selectedVideoOptionIds: [],
  selectedImageReferenceKey: '',
})

const createDefaultModeStates = (): Record<string, ModeRuntimeState> => (
  Object.fromEntries(ACTIVE_TABS.map((tab) => [tab.id, createDefaultModeState(tab)])) as Record<string, ModeRuntimeState>
)

const createDefaultWorkflowSettings = (): WorkflowSettingsState => ({
  provider: 'atlas',
  byteplusModel: PROVIDER_MODELS.byteplus[0],
  atlasModel: 'seedance-2.0-fast',
  ratio: '16:9',
  duration: 5,
  resolution: '720p',
  generateAudio: true,
})

const createDefaultWorkflowSettingsByTabId = (): Record<string, WorkflowSettingsState> => (
  Object.fromEntries(ACTIVE_TABS.map((tab) => [tab.id, createDefaultWorkflowSettings()])) as Record<string, WorkflowSettingsState>
)

const isRecord = (value: unknown): value is Record<string, unknown> => (
  typeof value === 'object' && value !== null && !Array.isArray(value)
)

const firstNonEmptyString = (...values: unknown[]): string => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }
  return ''
}

const filterMediaUrls = (input: Record<string, string>): Record<string, string> => {
  const next: Record<string, string> = {}
  Object.entries(input).forEach(([key, value]) => {
    if (typeof value === 'string' && value.trim()) {
      next[key] = value.trim()
    }
  })
  return next
}

const normalizeDuration = (value: unknown): number => {
  if (value === 5 || value === 10 || value === 15) {
    return value
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value >= 13) return 15
    if (value >= 8) return 10
  }
  return 5
}

const extractMentionQuery = (text: string, cursorIndex: number): string | null => {
  const left = text.slice(0, Math.max(0, cursorIndex))
  const match = left.match(/@([a-zA-Z0-9._-]{0,60})$/)
  if (!match) return null
  return match[1]
}

const insertMention = (text: string, cursorIndex: number, mentionKey: string): string => {
  const left = text.slice(0, Math.max(0, cursorIndex))
  const right = text.slice(Math.max(0, cursorIndex))
  const nextLeft = left.replace(/@([a-zA-Z0-9._-]{0,60})$/, `@${mentionKey} `)
  return `${nextLeft}${right}`
}

const createMentionKey = (label: string, fallback: string): string => {
  const normalized = label.trim().replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '')
  return normalized || fallback
}

const resolvePromptMentionReferences = (
  prompt: string,
  references: MentionableReference[],
): ResolvedMentionReference[] => {
  const mentionRegex = /@([a-zA-Z0-9._-]{2,60})/g
  const mentionOrder: string[] = []
  const seen = new Set<string>()

  for (const match of prompt.matchAll(mentionRegex)) {
    const key = (match[1] || '').trim().toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    mentionOrder.push(key)
  }

  const promptLower = prompt.toLowerCase()

  const byKey = new Map(
    references.map((item) => [item.mentionKey.trim().toLowerCase(), item]),
  )

  const addByKey = (key: string) => {
    const normalizedKey = key.trim().toLowerCase()
    if (!normalizedKey || seen.has(normalizedKey)) return
    const match = byKey.get(normalizedKey)
    if (!match) return
    seen.add(normalizedKey)
    mentionOrder.push(normalizedKey)
  }

  // Smart matching: allow plain-name references in prompt text (without @) to resolve.
  references.forEach((item) => {
    const label = item.label.trim().toLowerCase()
    const mentionKey = item.mentionKey.trim().toLowerCase()
    const mentionKeyAsText = mentionKey.replace(/_/g, ' ')
    if (label.length >= 3 && promptLower.includes(label)) {
      addByKey(mentionKey)
      return
    }
    if (mentionKeyAsText.length >= 3 && promptLower.includes(mentionKeyAsText)) {
      addByKey(mentionKey)
    }
  })

  return mentionOrder.reduce<ResolvedMentionReference[]>((acc, key) => {
    const match = byKey.get(key)
    if (!match) return acc
    acc.push({
      mention: `@${match.mentionKey}`,
      name: match.label,
      url: match.url,
      thumbUrl: match.kind === 'video' ? `/functions/play-proxy?url=${encodeURIComponent(match.url)}` : match.url,
      kind: match.kind,
      role: match.kind === 'video' ? 'reference_video' : 'reference_image',
    })
    return acc
  }, [])
}

const safeSetLocalStorage = (key: string, value: string) => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key, value)
  } catch {
    // Ignore local storage failures.
  }
}

const readLabDraft = (): StoredDraftState | null => {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(LOCAL_DRAFT_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    if (!isRecord(parsed)) return null

    const modeStates: Record<string, DraftModeState> = {}
    if (isRecord(parsed.modeStates)) {
      Object.entries(parsed.modeStates).forEach(([tabId, value]) => {
        if (!isRecord(value)) return
        modeStates[tabId] = {
          prompt: typeof value.prompt === 'string' ? value.prompt : '',
          mediaUrls: isRecord(value.mediaUrls)
            ? Object.fromEntries(
              Object.entries(value.mediaUrls).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
            )
            : {},
          resultUrl: typeof value.resultUrl === 'string' ? value.resultUrl : '',
          strictReferences: value.strictReferences === true,
          selectedVideoOptionIds: Array.isArray(value.selectedVideoOptionIds)
            ? value.selectedVideoOptionIds.filter((id): id is VideoWorkflowOptionId => typeof id === 'string' && VIDEO_OPTION_SET.has(id as VideoWorkflowOptionId))
            : [],
          selectedImageReferenceKey: typeof value.selectedImageReferenceKey === 'string' ? value.selectedImageReferenceKey : '',
        }
      })
    }

    const workflowSettingsByTabId = createDefaultWorkflowSettingsByTabId()

    if (isRecord(parsed.workflowSettingsByTabId)) {
      Object.entries(parsed.workflowSettingsByTabId).forEach(([tabId, value]) => {
        if (!isRecord(value) || !workflowSettingsByTabId[tabId]) return
        workflowSettingsByTabId[tabId] = {
          provider: value.provider === 'atlas' ? 'atlas' : 'byteplus',
          byteplusModel: typeof value.byteplusModel === 'string' ? value.byteplusModel : PROVIDER_MODELS.byteplus[0],
          atlasModel: typeof value.atlasModel === 'string' ? value.atlasModel : PROVIDER_MODELS.atlas[0],
          ratio: typeof value.ratio === 'string' ? value.ratio : '16:9',
          duration: normalizeDuration(value.duration),
          resolution: typeof value.resolution === 'string' ? value.resolution : '720p',
          generateAudio: value.generateAudio !== false,
        }
      })
    } else {
      const legacySettings: WorkflowSettingsState = {
        provider: parsed.provider === 'atlas' ? 'atlas' : 'byteplus',
        byteplusModel: typeof parsed.byteplusModel === 'string' ? parsed.byteplusModel : PROVIDER_MODELS.byteplus[0],
        atlasModel: typeof parsed.atlasModel === 'string' ? parsed.atlasModel : PROVIDER_MODELS.atlas[0],
        ratio: typeof parsed.ratio === 'string' ? parsed.ratio : '16:9',
        duration: normalizeDuration(parsed.duration),
        resolution: typeof parsed.resolution === 'string' ? parsed.resolution : '720p',
        generateAudio: parsed.generateAudio !== false,
      }
      Object.keys(workflowSettingsByTabId).forEach((tabId) => {
        workflowSettingsByTabId[tabId] = { ...legacySettings }
      })
    }

    return {
      activeTabId: typeof parsed.activeTabId === 'string' ? parsed.activeTabId : FALLBACK_TAB.id,
      workflowSettingsByTabId,
      modeStates,
    }
  } catch {
    return null
  }
}

const parseHistoryEntry = (value: unknown): GenerationHistoryEntry | null => {
  if (!isRecord(value)) {
    return null
  }

  const mediaUrls = isRecord(value.mediaUrls)
    ? Object.fromEntries(
      Object.entries(value.mediaUrls).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
    )
    : {}

  const requestPayload = isRecord(value.requestPayload) ? value.requestPayload : {}

  if (
    typeof value.historyId !== 'string'
    || typeof value.tabId !== 'string'
    || typeof value.tabLabel !== 'string'
    || (value.provider !== 'byteplus' && value.provider !== 'atlas')
    || typeof value.model !== 'string'
    || typeof value.ratio !== 'string'
    || typeof value.duration !== 'number'
    || typeof value.resolution !== 'string'
    || typeof value.generateAudio !== 'boolean'
    || typeof value.prompt !== 'string'
    || typeof value.requestEndpoint !== 'string'
    || typeof value.resultUrl !== 'string'
    || typeof value.completedAt !== 'number'
  ) {
    return null
  }

  return {
    historyId: value.historyId,
    taskId: typeof value.taskId === 'string' ? value.taskId : '',
    tabId: value.tabId,
    tabLabel: value.tabLabel,
    provider: value.provider,
    model: value.model,
    ratio: value.ratio,
    duration: value.duration,
    resolution: value.resolution,
    generateAudio: value.generateAudio,
    prompt: value.prompt,
    mediaUrls,
    requestEndpoint: value.requestEndpoint,
    requestPayload,
    resultUrl: value.resultUrl,
    firebaseVideoUrl: typeof value.firebaseVideoUrl === 'string' ? value.firebaseVideoUrl : '',
    storageSaveError: typeof value.storageSaveError === 'string' ? value.storageSaveError : '',
    submittedAt: typeof value.submittedAt === 'number' ? value.submittedAt : value.completedAt,
    receivedAt: typeof value.receivedAt === 'number' ? value.receivedAt : value.completedAt,
    generationMs: typeof value.generationMs === 'number' ? value.generationMs : 0,
    outputDimensions: typeof value.outputDimensions === 'string' ? value.outputDimensions : estimateDimensions(value.ratio, value.resolution),
    completedAt: value.completedAt,
    ownerUid: typeof value.ownerUid === 'string' ? value.ownerUid : '',
  }
}

const sortHistories = (entries: GenerationHistoryEntry[]): GenerationHistoryEntry[] => (
  [...entries].sort((left, right) => right.completedAt - left.completedAt).slice(0, MAX_HISTORY_ITEMS)
)

const mergeHistories = (...lists: GenerationHistoryEntry[][]): GenerationHistoryEntry[] => {
  const merged = new Map<string, GenerationHistoryEntry>()
  lists.flat().forEach((entry) => {
    merged.set(entry.historyId, entry)
  })
  return sortHistories(Array.from(merged.values()))
}

const readLocalHistory = (): GenerationHistoryEntry[] => {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(LOCAL_HISTORY_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return sortHistories(parsed.map(parseHistoryEntry).filter((entry): entry is GenerationHistoryEntry => Boolean(entry)))
  } catch {
    return []
  }
}

const parseMediaLibraryItem = (value: unknown): MediaLibraryItem | null => {
  if (!isRecord(value)) {
    return null
  }
  if (typeof value.url !== 'string') {
    return null
  }

  const url = value.url.trim()
  if (!url) {
    return null
  }

  const inferredKind: MediaKind = /\.(mp4|webm|mov|m4v|mkv|avi|m3u8)(\?|#|$)/i.test(url) || /video/i.test(url)
    ? 'video'
    : 'image'
  const kind: MediaKind = value.kind === 'image' || value.kind === 'video' || value.kind === 'audio'
    ? value.kind
    : inferredKind
  const createdAt = typeof value.createdAt === 'number'
    ? value.createdAt
    : typeof value.lastUsedAt === 'number'
      ? value.lastUsedAt
      : Date.now()

  return {
    id: typeof value.id === 'string' && value.id.trim() ? value.id : `ref-${createdAt.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    kind,
    url,
    name: typeof value.name === 'string' && value.name.trim() ? value.name : `Reference ${kind}`,
    createdAt,
  }
}

const readLocalMediaLibrary = (): MediaLibraryItem[] => {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(SHARED_REFERENCE_LIBRARY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .map(parseMediaLibraryItem)
      .filter((entry): entry is MediaLibraryItem => Boolean(entry))
      .sort((left, right) => right.createdAt - left.createdAt)
  } catch {
    return []
  }
}

const parseCapturedVideoFrame = (value: unknown): CapturedVideoFrame | null => {
  if (!isRecord(value)) return null
  if (
    typeof value.id !== 'string'
    || typeof value.sourceKey !== 'string'
    || typeof value.imageDataUrl !== 'string'
    || typeof value.capturedAt !== 'number'
    || typeof value.videoTimeSec !== 'number'
    || typeof value.width !== 'number'
    || typeof value.height !== 'number'
  ) {
    return null
  }
  if (!value.imageDataUrl.startsWith('data:image/')) {
    return null
  }
  return {
    id: value.id,
    sourceKey: value.sourceKey,
    imageDataUrl: value.imageDataUrl,
    capturedAt: value.capturedAt,
    videoTimeSec: value.videoTimeSec,
    width: value.width,
    height: value.height,
  }
}

const readCapturedVideoFrames = (): CapturedVideoFrame[] => {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(CAPTURED_VIDEO_FRAMES_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .map(parseCapturedVideoFrame)
      .filter((entry): entry is CapturedVideoFrame => Boolean(entry))
      .sort((left, right) => right.capturedAt - left.capturedAt)
      .slice(0, 240)
  } catch {
    return []
  }
}

const writeCapturedVideoFrames = (frames: CapturedVideoFrame[]) => {
  safeSetLocalStorage(CAPTURED_VIDEO_FRAMES_KEY, JSON.stringify(frames.slice(0, 240)))
}

const formatVideoTime = (value: number): string => {
  if (!Number.isFinite(value) || value < 0) return '0:00'
  const totalSeconds = Math.floor(value)
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

const buildVideoFileName = (title: string): string => {
  const normalized = createSafeId(title || 'video').replace(/^-+|-+$/g, '').slice(0, 28) || 'video'
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  return `${normalized}-${stamp}.mp4`
}

const buildFrameFileName = (timeSec: number): string => {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const timeCode = Math.max(0, Math.floor(timeSec)).toString().padStart(4, '0')
  return `frame-${timeCode}-${stamp}.jpg`
}

const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
  const response = await fetch(dataUrl)
  if (!response.ok) {
    throw new Error('Could not process frame image.')
  }
  return response.blob()
}

const asHttpUrl = (value: unknown): string => {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  return /^https?:\/\//i.test(trimmed) ? trimmed : ''
}

const collectHttpUrls = (input: unknown): string[] => {
  if (!Array.isArray(input)) return []
  return input
    .map(asHttpUrl)
    .filter(Boolean)
}

const extractPresetAssetThumbs = (presetJson: string): PresetAssetThumb[] => {
  let parsed: unknown
  try {
    parsed = JSON.parse(presetJson)
  } catch {
    return []
  }

  if (!isRecord(parsed)) return []
  const body = isRecord(parsed.body) ? parsed.body : parsed
  const thumbs: PresetAssetThumb[] = []
  const seen = new Set<string>()

  const addThumb = (kind: 'image' | 'video', urlValue: unknown) => {
    const url = asHttpUrl(urlValue)
    if (!url) return
    const key = `${kind}:${url}`
    if (seen.has(key)) return
    seen.add(key)
    thumbs.push({
      id: `${kind}-${thumbs.length + 1}`,
      kind,
      url,
    })
  }

  collectHttpUrls(body.reference_images).forEach((url) => addThumb('image', url))
  collectHttpUrls(body.image_urls).forEach((url) => addThumb('image', url))
  collectHttpUrls(body.images).forEach((url) => addThumb('image', url))
  addThumb('image', body.image)
  addThumb('image', body.image_url)

  collectHttpUrls(body.reference_videos).forEach((url) => addThumb('video', url))
  collectHttpUrls(body.video_urls).forEach((url) => addThumb('video', url))
  collectHttpUrls(body.videos).forEach((url) => addThumb('video', url))
  addThumb('video', body.video)
  addThumb('video', body.video_url)
  addThumb('video', body.videoUrl)
  addThumb('video', body.source_video_url)
  addThumb('video', body.extension_video_url)

  if (Array.isArray(body.content)) {
    body.content.forEach((entry) => {
      if (!isRecord(entry)) return
      const imageUrl = isRecord(entry.image_url) ? entry.image_url.url : undefined
      const videoUrl = isRecord(entry.video_url) ? entry.video_url.url : undefined
      addThumb('image', imageUrl)
      addThumb('video', videoUrl)
    })
  }

  return thumbs
}

const parseDirectRequestPreset = (value: unknown): DirectRequestPreset | null => {
  if (!isRecord(value)) {
    return null
  }
  if (typeof value.json !== 'string' || !value.json.trim()) {
    return null
  }

  const createdAt = typeof value.createdAt === 'number' ? value.createdAt : Date.now()
  return {
    id: typeof value.id === 'string' && value.id.trim()
      ? value.id
      : `preset-${createdAt.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    name: typeof value.name === 'string' && value.name.trim() ? value.name : 'Unnamed model',
    json: value.json,
    createdAt,
  }
}

const readLocalDirectJsonDraft = (): string => {
  try {
    return window.localStorage.getItem(DIRECT_JSON_DRAFT_KEY) || ''
  } catch {
    return ''
  }
}

const readLocalDirectRequestPresets = (): DirectRequestPreset[] => {
  if (typeof window === 'undefined') return []
  try {
    const raw = window.localStorage.getItem(DIRECT_REQUEST_PRESETS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .map(parseDirectRequestPreset)
      .filter((entry): entry is DirectRequestPreset => Boolean(entry))
      .sort((left, right) => right.createdAt - left.createdAt)
  } catch {
    return []
  }
}

const getDirectPresetNameFromJson = (parsedRequest: unknown): string => {
  if (!isRecord(parsedRequest)) {
    return 'Unnamed model'
  }

  let modelSource: Record<string, unknown> = parsedRequest
  if ('body' in parsedRequest && isRecord(parsedRequest.body)) {
    modelSource = parsedRequest.body
  }

  const model = firstNonEmptyString(modelSource.model)
  if (!model) {
    return 'Unnamed model'
  }
  return `"model": "${model}",`
}

const initialDraft = readLabDraft()

const initialModeStates = (() => {
  const base = createDefaultModeStates()
  if (!initialDraft?.modeStates) {
    return base
  }
  Object.entries(initialDraft.modeStates).forEach(([tabId, value]) => {
    if (!base[tabId]) return
    base[tabId] = {
      ...base[tabId],
      prompt: value.prompt,
      mediaUrls: filterMediaUrls(value.mediaUrls),
      resultUrl: value.resultUrl,
      strictReferences: value.strictReferences === true,
      selectedVideoOptionIds: Array.isArray(value.selectedVideoOptionIds) ? value.selectedVideoOptionIds : [],
      selectedImageReferenceKey: typeof value.selectedImageReferenceKey === 'string' ? value.selectedImageReferenceKey : '',
    }
  })
  return base
})()

const initialWorkflowSettingsByTabId = (() => {
  const base = createDefaultWorkflowSettingsByTabId()
  if (!initialDraft?.workflowSettingsByTabId) {
    return base
  }
  Object.entries(initialDraft.workflowSettingsByTabId).forEach(([tabId, value]) => {
    if (!base[tabId]) return
    base[tabId] = {
      ...base[tabId],
      provider: value.provider,
      byteplusModel: value.byteplusModel,
      atlasModel: value.atlasModel,
      ratio: value.ratio,
      duration: normalizeDuration(value.duration),
      resolution: value.resolution,
      generateAudio: value.generateAudio,
    }
  })
  return base
})()

const extractUrlLike = (value: unknown): string => {
  if (typeof value === 'string' && value.trim()) {
    return value.trim()
  }
  if (!isRecord(value)) {
    return ''
  }
  return firstNonEmptyString(
    value.url,
    extractUrlLike(value.video),
    extractUrlLike(value.video_url),
    extractUrlLike(value.output),
    extractUrlLike(value.output_url),
  )
}

const isLikelyVideoUrl = (url: string): boolean => {
  const trimmed = url.trim()
  if (!trimmed) return false

  const lower = trimmed.toLowerCase()
  if (isLikelyPollingUrl(lower)) {
    return false
  }
  if (/\.(jpg|jpeg|png|webp|gif|avif|svg)(\?|#|$)/.test(lower)) {
    return false
  }
  if (/\.(mp4|webm|mov|m4v|mkv|avi|m3u8)(\?|#|$)/.test(lower)) {
    return true
  }
  if (lower.includes('video') || lower.includes('mime=video') || lower.includes('content-type=video')) {
    return true
  }
  return false
}

const isLikelyPollingUrl = (url: string): boolean => {
  const lower = url.trim().toLowerCase()
  if (!lower) return false

  if (/(^|\/)prediction(\/|\?|#|$)/.test(lower)) {
    return true
  }
  if (/(^|\/)status(\/|\?|#|$)/.test(lower)) {
    return true
  }
  if (lower.includes('task_id=') || lower.includes('taskid=')) {
    return true
  }

  return false
}

const isLikelyImageUrl = (url: string): boolean => {
  const trimmed = url.trim().toLowerCase()
  if (!trimmed) return false
  return /\.(jpg|jpeg|png|webp|gif|avif|svg)(\?|#|$)/.test(trimmed)
}

const toPlayableVideoSourceUrl = (url: string): string => {
  const trimmed = url.trim()
  if (!trimmed) return ''
  if (isLikelyPollingUrl(trimmed) || isLikelyImageUrl(trimmed)) {
    return ''
  }
  return trimmed
}

const resolvePrimaryAndFallbackVideoSources = (preferredUrl: string, alternateUrl: string): { primary: string; fallback: string } => {
  const preferred = toPlayableVideoSourceUrl(preferredUrl)
  const alternate = toPlayableVideoSourceUrl(alternateUrl)

  if (preferred) {
    return {
      primary: preferred,
      fallback: alternate && alternate !== preferred ? alternate : '',
    }
  }

  if (alternate) {
    return {
      primary: alternate,
      fallback: '',
    }
  }

  return {
    primary: '',
    fallback: '',
  }
}

const pickFirstLikelyVideoUrl = (...candidates: unknown[]): string => {
  for (const candidate of candidates) {
    const url = extractUrlLike(candidate)
    if (url && isLikelyVideoUrl(url)) {
      return url
    }
  }
  return ''
}

const extractFirstHttpMediaUrl = (input: unknown, visited = new Set<object>()): string => {
  if (typeof input === 'string') {
    const trimmed = input.trim()
    if (!/^https?:\/\//i.test(trimmed)) {
      return ''
    }
    if (isLikelyImageUrl(trimmed) || isLikelyPollingUrl(trimmed)) {
      return ''
    }
    return isLikelyVideoUrl(trimmed) ? trimmed : ''
  }

  if (Array.isArray(input)) {
    for (const item of input) {
      const nested = extractFirstHttpMediaUrl(item, visited)
      if (nested) return nested
    }
    return ''
  }

  if (!isRecord(input)) {
    return ''
  }

  if (visited.has(input)) {
    return ''
  }
  visited.add(input)

  const preferredKeys = [
    'video_url',
    'videoUrl',
    'video',
    'output_url',
    'outputUrl',
    'output',
    'result_url',
    'resultUrl',
    'result',
    'media_url',
    'mediaUrl',
    'download_url',
    'downloadUrl',
    'file_url',
    'fileUrl',
    'url',
  ] as const

  for (const key of preferredKeys) {
    const candidate = extractFirstHttpMediaUrl(input[key], visited)
    if (candidate) return candidate
  }

  for (const value of Object.values(input)) {
    const candidate = extractFirstHttpMediaUrl(value, visited)
    if (candidate) return candidate
  }

  return ''
}

const pickFirstHttpMediaUrl = (...candidates: unknown[]): string => {
  for (const candidate of candidates) {
    const url = extractFirstHttpMediaUrl(candidate)
    if (url) return url
  }
  return ''
}

const parseJsonSafely = (rawText: string): unknown => {
  if (!rawText.trim()) {
    return {}
  }
  try {
    return JSON.parse(rawText)
  } catch {
    return { message: rawText.trim() }
  }
}

const extractTaskId = (payload: unknown): string => {
  if (!isRecord(payload)) {
    return ''
  }
  const nested = isRecord(payload.data) ? payload.data : null
  return firstNonEmptyString(payload.task_id, payload.id, nested?.task_id, nested?.id)
}

const extractStatusValue = (payload: unknown): string => {
  if (!isRecord(payload)) {
    return ''
  }
  const nested = isRecord(payload.data) ? payload.data : null
  return firstNonEmptyString(nested?.status, payload.status).toLowerCase()
}

const extractResultUrl = (payload: unknown): string => {
  if (!isRecord(payload)) {
    return ''
  }

  const nested = isRecord(payload.data) ? payload.data : null
  const contentSources = [payload.content, nested?.content]

  for (const source of contentSources) {
    if (!Array.isArray(source)) {
      continue
    }
    for (const item of source) {
      if (!isRecord(item)) {
        continue
      }
      if (item.type === 'video_url') {
        const contentVideoUrl = pickFirstLikelyVideoUrl(item.video_url, item.url, item)
        if (contentVideoUrl) {
          return contentVideoUrl
        }
      }
      const fallbackUrl = pickFirstLikelyVideoUrl(item.video_url, item.output, item.output_url, item.url, item)
      if (fallbackUrl) {
        return fallbackUrl
      }
    }
  }

  const nestedOutputs = Array.isArray(nested?.outputs) ? nested.outputs : []
  const rootOutputs = Array.isArray(payload.outputs) ? payload.outputs : []

  for (const output of [...nestedOutputs, ...rootOutputs]) {
    const outputUrl = pickFirstLikelyVideoUrl(output)
    if (outputUrl) {
      return outputUrl
    }
  }

  return pickFirstLikelyVideoUrl(
    nested?.video,
    nested?.video_url,
    payload.video,
    payload.video_url,
    nested?.output,
    nested?.output_url,
    payload.output,
    payload.output_url,
    nested?.url,
    payload.url,
  ) || pickFirstHttpMediaUrl(
    nested?.prediction,
    nested?.result,
    nested?.output,
    nested,
    payload,
  )
}

const isSuccessStatus = (status: string) => (
  ['success', 'succeeded', 'complete', 'completed', 'done'].some((token) => status.includes(token))
)

const isFailureStatus = (status: string) => (
  ['fail', 'failed', 'error', 'cancel'].some((token) => status.includes(token))
)

const getPlaybackUrl = (url: string): string => {
  const sourceUrl = toPlayableVideoSourceUrl(url)
  if (!sourceUrl) return ''
  if (sourceUrl.includes('firebasestorage.googleapis.com')) return sourceUrl
  return `${apiUrl('/api/video-proxy')}?url=${encodeURIComponent(sourceUrl)}`
}

const estimateDimensions = (ratio: string, resolution: string): string => {
  const table: Record<string, Record<string, string>> = {
    '480p': {
      '16:9': '854x480',
      '9:16': '480x854',
      '4:3': '640x480',
      '3:4': '480x640',
      '1:1': '480x480',
      '21:9': '1120x480',
      adaptive: 'adaptive',
    },
    '720p': {
      '16:9': '1280x720',
      '9:16': '720x1280',
      '4:3': '960x720',
      '3:4': '720x960',
      '1:1': '720x720',
      '21:9': '1680x720',
      adaptive: 'adaptive',
    },
    '1080p': {
      '16:9': '1920x1080',
      '9:16': '1080x1920',
      '4:3': '1440x1080',
      '3:4': '1080x1440',
      '1:1': '1080x1080',
      '21:9': '2520x1080',
      adaptive: 'adaptive',
    },
  }

  const normalizedResolution = resolution.trim() || '720p'
  const normalizedRatio = ratio.trim() || '16:9'
  return table[normalizedResolution]?.[normalizedRatio] || `${normalizedResolution} (${normalizedRatio})`
}

const formatTimestamp = (value: number) => {
  try {
    return new Date(value).toLocaleString()
  } catch {
    return String(value)
  }
}

const createSafeId = (value: string) => value.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/-+/g, '-').slice(0, 140)

const buildHistoryId = (tabId: string, taskId: string, completedAt: number) => createSafeId(`${tabId}-${taskId || completedAt}`)

const readPendingTasks = (): PersistedPendingTask[] => {
  try {
    const raw = window.localStorage.getItem(PENDING_TASKS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    return Array.isArray(parsed) ? (parsed as PersistedPendingTask[]) : []
  } catch {
    return []
  }
}

const writePendingTask = (task: PersistedPendingTask): void => {
  try {
    const existing = readPendingTasks().filter((t) => t.requestId !== task.requestId)
    window.localStorage.setItem(PENDING_TASKS_KEY, JSON.stringify([...existing, task]))
  } catch {
    // ignore
  }
  void saveTaskToFirestore(task)
}

const removePendingTask = (requestId: string): void => {
  try {
    const updated = readPendingTasks().filter((t) => t.requestId !== requestId)
    window.localStorage.setItem(PENDING_TASKS_KEY, JSON.stringify(updated))
  } catch {
    // ignore
  }
  void deleteTaskFromFirestore(requestId)
}

const saveTaskToFirestore = async (task: PersistedPendingTask): Promise<void> => {
  const uid = auth.currentUser?.uid
  if (!uid) return
  try {
    await setDoc(
      doc(db, 'users', uid, FIRESTORE_PENDING_TASKS_COLLECTION, task.requestId),
      { ...task, uid, updatedAt: serverTimestamp() },
    )
  } catch {
    // non-critical — localStorage is the primary store
  }
}

const deleteTaskFromFirestore = async (requestId: string): Promise<void> => {
  const uid = auth.currentUser?.uid
  if (!uid) return
  try {
    const { deleteDoc } = await import('firebase/firestore')
    await deleteDoc(doc(db, 'users', uid, FIRESTORE_PENDING_TASKS_COLLECTION, requestId))
  } catch {
    // non-critical
  }
}

const loadPendingTasksFromFirestore = async (uid: string): Promise<PersistedPendingTask[]> => {
  try {
    const ref = collection(db, 'users', uid, FIRESTORE_PENDING_TASKS_COLLECTION)
    const snap = await getDocs(ref)
    return snap.docs.map((d) => d.data() as PersistedPendingTask)
  } catch {
    return []
  }
}

const buildByteplusContent = (
  tab: PromptTab,
  state: ModeRuntimeState,
  mentionReferences: ResolvedMentionReference[],
): ContentItem[] => {
  const content: ContentItem[] = []
  const mentionedImageRefs = mentionReferences.filter((entry) => entry.kind === 'image')
  const mentionedVideoRefs = mentionReferences.filter((entry) => entry.kind === 'video')

  if (state.prompt.trim()) {
    content.push({ type: 'text', text: state.prompt.trim() })
  }

  if (mentionReferences.length > 0) {
    const summary = mentionReferences
      .map((entry) => `${entry.mention} => ${entry.name} (${entry.url})`)
      .join('\n')
    content.push({ type: 'text', text: `Reference aliases:\n${summary}` })
  }

  mentionedImageRefs.forEach((entry) => {
    content.push({
      type: 'image_url',
      image_url: { url: entry.url },
      role: entry.role,
    })
  })

  mentionedVideoRefs.forEach((entry) => {
    content.push({
      type: 'video_url',
      video_url: { url: entry.url },
      role: entry.role,
    })
  })

  for (const field of tab.fields) {
    if (field.kind === 'audio') {
      const url = state.mediaUrls[field.key]?.trim()
      if (!url) continue
      content.push({
        type: 'audio_url',
        audio_url: { url },
        role: field.role || 'reference_audio',
      })
    }
  }

  return content
}

const buildAtlasPayload = (
  tab: PromptTab,
  state: ModeRuntimeState,
  settings: SharedSettings,
  mentionReferences: ResolvedMentionReference[],
): Record<string, unknown> => {
  if (tab.id === IMAGE_SINGLE_REFERENCE_MODE_ID) {
    const selectedImageFieldKey = state.selectedImageReferenceKey
    const selectedImageUrl = selectedImageFieldKey
      ? (state.mediaUrls[selectedImageFieldKey] || '').trim()
      : ''
    const fallbackImageUrl = tab.fields
      .filter((field) => field.kind === 'image')
      .map((field) => (state.mediaUrls[field.key] || '').trim())
      .find(Boolean) || ''
    return {
      model: 'bytedance/seedance-2.0-fast/image-to-video',
      duration: settings.duration,
      resolution: settings.resolution,
      ratio: settings.ratio,
      generate_audio: settings.generateAudio,
      watermark: false,
      return_last_frame: false,
      image: selectedImageUrl || fallbackImageUrl,
      prompt: state.prompt.trim(),
    }
  }

  if (tab.id === VIDEO_PLUS_IMAGE_MODE_ID) {
    const referenceImages = tab.fields
      .filter((field) => field.kind === 'image')
      .map((field) => (state.mediaUrls[field.key] || '').trim())
      .filter(Boolean)
    const referenceVideos = tab.fields
      .filter((field) => field.kind === 'video')
      .map((field) => (state.mediaUrls[field.key] || '').trim())
      .filter(Boolean)

    const validVideoOptions = VIDEO_WORKFLOW_OPTIONS.filter((option) => state.selectedVideoOptionIds.includes(option.id))
    const optionInstructions = validVideoOptions.map((option) => option.instruction)
    const strictReferenceInstruction = state.strictReferences
      ? 'Strict reference lock: keep the exact same art style, look, mood, color logic, and identity traits from references with minimal deviation.'
      : ''

    const basePrompt = referenceImages.length === 1
      ? state.prompt.trim().replace(/\breference images\b/gi, 'reference image')
      : state.prompt.trim()

    const promptControlLines = [
      ...optionInstructions,
      strictReferenceInstruction,
    ].filter(Boolean)

    const enrichedPrompt = promptControlLines.length > 0
      ? `${basePrompt}\n\nReference controls:\n- ${promptControlLines.join('\n- ')}`
      : basePrompt

    return {
      model: 'bytedance/seedance-2.0-fast/reference-to-video',
      duration: settings.duration,
      resolution: settings.resolution,
      ratio: settings.ratio,
      generate_audio: settings.generateAudio,
      watermark: false,
      return_last_frame: false,
      reference_images: referenceImages,
      reference_videos: referenceVideos,
      reference_images_label: referenceImages.length === 1 ? 'reference image' : 'reference images',
      prompt: enrichedPrompt,
      providerHint: 'atlas',
    }
  }

  const imageUrls = mentionReferences
    .filter((entry) => entry.kind === 'image')
    .map((entry) => entry.url)

  const videoUrls = mentionReferences
    .filter((entry) => entry.kind === 'video')
    .map((entry) => entry.url)

  const audioUrls = tab.fields
    .filter((field) => field.kind === 'audio')
    .map((field) => state.mediaUrls[field.key]?.trim() || '')
    .filter(Boolean)

  const body: Record<string, unknown> = {
    prompt: state.prompt.trim(),
    model: settings.model,
    providerHint: 'fast',
    duration: settings.duration,
    aspect_ratio: settings.ratio,
    resolution: settings.resolution,
    generate_audio: settings.generateAudio,
    public: false,
    mode: tab.requestMode,
  }

  if (imageUrls.length > 0) {
    body.images = imageUrls
  }

  if (videoUrls.length > 0) {
    body.reference_videos = videoUrls
  }

  if (audioUrls.length > 0) {
    body.reference_audios = audioUrls
  }

  if (tab.primaryVideoKey) {
    const primaryVideo = state.mediaUrls[tab.primaryVideoKey]?.trim() || ''
    const sourceVideo = primaryVideo && videoUrls.includes(primaryVideo)
      ? primaryVideo
      : (videoUrls[0] || '')
    if (sourceVideo && (tab.requestMode === 'reference-to-video' || tab.requestMode === 'video-extension')) {
      body.videoUrl = sourceVideo
      body.video_url = sourceVideo
      body.source_video_url = sourceVideo
      if (tab.requestMode === 'video-extension') {
        body.extension_video_url = sourceVideo
      }
    }
  }

  if (tab.requestMode === 'image-to-video' && imageUrls[0]) {
    body.image = imageUrls[0]
    body.image_url = imageUrls[0]
  }

  if (mentionReferences.length > 0) {
    body.mention_references = mentionReferences
    body.reference_aliases = Object.fromEntries(
      mentionReferences.map((entry) => [entry.mention, {
        name: entry.name,
        url: entry.url,
        kind: entry.kind,
        role: entry.role,
      }]),
    )
  }

  return body
}

const buildRequest = (
  tab: PromptTab,
  state: ModeRuntimeState,
  settings: SharedSettings,
  mentionReferences: ResolvedMentionReference[],
): { endpoint: string; body: Record<string, unknown> } => {
  if (tab.id === VIDEO_PLUS_IMAGE_MODE_ID || tab.id === IMAGE_SINGLE_REFERENCE_MODE_ID) {
    return {
      endpoint: '/api/seedance/generate',
      body: buildAtlasPayload(tab, state, settings, mentionReferences),
    }
  }

  if (settings.provider === 'atlas') {
    return {
      endpoint: '/api/seedance/generate',
      body: buildAtlasPayload(tab, state, settings, mentionReferences),
    }
  }

  return {
    endpoint: '/api/byteplus/generate',
    body: {
      model: settings.model,
      ratio: settings.ratio,
      duration: settings.duration,
      resolution: settings.resolution,
      generate_audio: settings.generateAudio,
      mention_references: mentionReferences,
      reference_aliases: Object.fromEntries(
        mentionReferences.map((entry) => [entry.mention, {
          name: entry.name,
          url: entry.url,
          kind: entry.kind,
          role: entry.role,
        }]),
      ),
      content: buildByteplusContent(tab, state, mentionReferences),
    },
  }
}

const uploadFile = async (file: File, kind: MediaKind): Promise<string> => {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, '-')
  const objectPath = `toorgen-lab/${kind}/${Date.now()}-${safeName}`
  const reference = storageRef(storage, objectPath)
  await uploadBytes(reference, file)
  return getDownloadURL(reference)
}

const uploadBlobToFirebase = async (blob: Blob, storagePath: string, contentType?: string): Promise<string> => {
  const reference = storageRef(storage, storagePath)
  if (contentType) {
    await uploadBytes(reference, blob, { contentType })
  } else {
    await uploadBytes(reference, blob)
  }
  return getDownloadURL(reference)
}

const saveGeneratedVideoToFirebase = async (sourceUrl: string, historyId: string): Promise<{ firebaseUrl: string }> => {
  const normalizedSourceUrl = toPlayableVideoSourceUrl(sourceUrl)
  if (!normalizedSourceUrl) {
    throw new Error('No result URL was available for Firebase save.')
  }
  if (normalizedSourceUrl.includes('firebasestorage.googleapis.com')) {
    return { firebaseUrl: normalizedSourceUrl }
  }

  const proxyUrl = `${apiUrl('/api/video-proxy')}?url=${encodeURIComponent(normalizedSourceUrl)}`
  const response = await fetch(proxyUrl)
  if (!response.ok) {
    throw new Error(`Failed to download generated video: HTTP ${response.status}`)
  }

  const videoBlob = await response.blob()
  if (videoBlob.size > 50 * 1024 * 1024) {
    throw new Error('Generated video is larger than the Firebase Storage limit (50MB).')
  }

  const basePath = `toorgen-lab/generated/${historyId}`
  const firebaseUrl = await uploadBlobToFirebase(videoBlob, `${basePath}.mp4`, videoBlob.type || 'video/mp4')

  return { firebaseUrl }
}

const readFirestoreHistory = async (uid: string): Promise<GenerationHistoryEntry[]> => {
  try {
    const historyRef = collection(db, 'users', uid, FIRESTORE_HISTORY_COLLECTION)
    const historyQuery = query(historyRef, orderBy('completedAt', 'desc'), limit(MAX_HISTORY_ITEMS))
    const snap = await getDocs(historyQuery)
    return sortHistories(snap.docs.map((item) => parseHistoryEntry(item.data())).filter((entry): entry is GenerationHistoryEntry => Boolean(entry)))
  } catch {
    return []
  }
}

const saveHistoryToFirestore = async (entry: GenerationHistoryEntry) => {
  const uid = auth.currentUser?.uid
  if (!uid) return

  const payload: Record<string, unknown> = {
    historyId: entry.historyId,
    taskId: entry.taskId,
    tabId: entry.tabId,
    tabLabel: entry.tabLabel,
    provider: entry.provider,
    model: entry.model,
    ratio: entry.ratio,
    duration: entry.duration,
    resolution: entry.resolution,
    generateAudio: entry.generateAudio,
    prompt: entry.prompt,
    mediaUrls: entry.mediaUrls,
    requestEndpoint: entry.requestEndpoint,
    requestPayload: entry.requestPayload,
    resultUrl: entry.resultUrl,
    firebaseVideoUrl: entry.firebaseVideoUrl,
    storageSaveError: entry.storageSaveError,
    submittedAt: entry.submittedAt,
    receivedAt: entry.receivedAt,
    generationMs: entry.generationMs,
    outputDimensions: entry.outputDimensions,
    completedAt: entry.completedAt,
    ownerUid: uid,
    updatedAt: serverTimestamp(),
  }

  await setDoc(doc(db, 'users', uid, FIRESTORE_HISTORY_COLLECTION, entry.historyId), payload, { merge: true })
}

export default function ToorGenPromptWorkbench() {
  const [activeTabId, setActiveTabId] = useState<string>(initialDraft?.activeTabId ?? FALLBACK_TAB.id)
  const [modeStates, setModeStates] = useState<Record<string, ModeRuntimeState>>(initialModeStates)
  const [workflowSettingsByTabId, setWorkflowSettingsByTabId] = useState<Record<string, WorkflowSettingsState>>(initialWorkflowSettingsByTabId)
  const [history, setHistory] = useState<GenerationHistoryEntry[]>(() => readLocalHistory())
  const [mediaLibrary, setMediaLibrary] = useState<MediaLibraryItem[]>(() => readLocalMediaLibrary())
  const [authUid, setAuthUid] = useState<string>('')
  const [isBackendAvailable, setIsBackendAvailable] = useState<boolean>(true)
  const [backendNotice, setBackendNotice] = useState<string>('')
  const [isBackendDialogOpen, setIsBackendDialogOpen] = useState<boolean>(false)
  const [videoDialogState, setVideoDialogState] = useState<VideoDialogState | null>(null)
  const [pendingGenerations, setPendingGenerations] = useState<PendingGeneration[]>([])
  const [railWidth, setRailWidth] = useState<number>(500)
  const [directPanelWidth, setDirectPanelWidth] = useState<number>(360)
  const [historyViewMode, setHistoryViewMode] = useState<HistoryViewMode>('cards')
  const [workflowSearch, setWorkflowSearch] = useState<string>('')
  const [workflowFilterMode, setWorkflowFilterMode] = useState<WorkflowFilterMode>('all')
  const [workflowPickerPosition, setWorkflowPickerPosition] = useState<{ top: number; left: number } | null>(null)
  const [isWorkflowPickerOpen, setIsWorkflowPickerOpen] = useState<boolean>(false)
  const [railPreviewSelectionId, setRailPreviewSelectionId] = useState<string>('')
  const [isPromptTemplateDialogOpen, setIsPromptTemplateDialogOpen] = useState<boolean>(false)
  const [isRequestPreviewExpanded, setIsRequestPreviewExpanded] = useState<boolean>(false)
  const [isRefiningPrompt, setIsRefiningPrompt] = useState<boolean>(false)
  const [pendingRefinedPrompt, setPendingRefinedPrompt] = useState<{ original: string; refined: string } | null>(null)
  const [refHoverPreview, setRefHoverPreview] = useState<{ url: string; kind: 'image' | 'video' } | null>(null)
  const refHoverFixedRef = useRef<HTMLDivElement | null>(null)
  const [isReferenceLibraryDialogOpen, setIsReferenceLibraryDialogOpen] = useState<boolean>(false)
  const [pendingRemoveRefKey, setPendingRemoveRefKey] = useState<string | null>(null)
  const [referenceLibraryFilter, setReferenceLibraryFilter] = useState<'all' | 'image' | 'video'>('all')
  const [referenceLibraryQuery, setReferenceLibraryQuery] = useState<string>('')
  const [selectedReferenceLibraryUrls, setSelectedReferenceLibraryUrls] = useState<string[]>([])
  const [isReferenceLibraryUploading, setIsReferenceLibraryUploading] = useState<boolean>(false)
  const [promptMentionQuery, setPromptMentionQuery] = useState<string | null>(null)
  const [activePromptMentionIndex, setActivePromptMentionIndex] = useState<number>(0)
  const [directRequestJson, setDirectRequestJson] = useState<string>(() => readLocalDirectJsonDraft())
  const [directSubmitFeed, setDirectSubmitFeed] = useState<Array<{ id: string; text: string }>>([])
  const [isDirectSubmitBusy, setIsDirectSubmitBusy] = useState<boolean>(false)
  const [directRequestPresets, setDirectRequestPresets] = useState<DirectRequestPreset[]>(() => readLocalDirectRequestPresets())
  const [isDirectPresetDialogOpen, setIsDirectPresetDialogOpen] = useState<boolean>(false)
  const [selectedPresetId, setSelectedPresetId] = useState<string>('')
  const [isRefreshingRuns, setIsRefreshingRuns] = useState<boolean>(false)
  const [isVideoRequestCopied, setIsVideoRequestCopied] = useState<boolean>(false)
  const [isVideoDetailsCollapsed, setIsVideoDetailsCollapsed] = useState<boolean>(true)
  const [isVideoMetadataEditing, setIsVideoMetadataEditing] = useState<boolean>(false)
  const [isVideoMetadataSaving, setIsVideoMetadataSaving] = useState<boolean>(false)
  const [videoMetadataPromptDraft, setVideoMetadataPromptDraft] = useState<string>('')
  const [videoMetadataRequestJsonDraft, setVideoMetadataRequestJsonDraft] = useState<string>('{}')
  const [capturedFrames, setCapturedFrames] = useState<CapturedVideoFrame[]>(() => readCapturedVideoFrames())
  const [isCapturedFramesVisible, setIsCapturedFramesVisible] = useState<boolean>(false)
  const [videoDialogNotice, setVideoDialogNotice] = useState<string>('')
  const [isVideoDownloading, setIsVideoDownloading] = useState<boolean>(false)
  const [savingFrameId, setSavingFrameId] = useState<string>('')
  const [historyDisplayLimit, setHistoryDisplayLimit] = useState<number>(10)
  const [isPlaylistOpen, setIsPlaylistOpen] = useState<boolean>(false)
  const [composerRefMode, setComposerRefMode] = useState<'text' | 'image' | 'video'>('video')
  const [isDirectSubmitPanelVisible, setIsDirectSubmitPanelVisible] = useState<boolean>(true)
  const [isRecoveryOpen, setIsRecoveryOpen] = useState<boolean>(false)
  const [recoveryTaskId, setRecoveryTaskId] = useState<string>('')
  const [recoveryProvider, setRecoveryProvider] = useState<ProviderId>('atlas')
  const [recoveryModel, setRecoveryModel] = useState<string>('')

  const cancelFlags = useRef<Record<string, boolean>>({})
  const labLayoutRef = useRef<HTMLDivElement | null>(null)
  const isResizingRailRef = useRef<boolean>(false)
  const isResizingDirectPanelRef = useRef<boolean>(false)
  const lastDirectResizeClientXRef = useRef<number>(0)
  const referenceLibraryUploadInputRef = useRef<HTMLInputElement | null>(null)
  const videoDialogPlayerRef = useRef<HTMLVideoElement | null>(null)
  const videoDialogNoticeTimeoutRef = useRef<number | null>(null)
  const workflowPickerRef = useRef<HTMLDivElement | null>(null)
  const promptTextareaRef = useRef<HTMLDivElement | null>(null)

  const handleRefinePrompt = async () => {
    const currentPrompt = activeState.prompt.trim()
    if (!currentPrompt || isRefiningPrompt) return
    setIsRefiningPrompt(true)
    setPendingRefinedPrompt(null)
    try {
      const response = await fetch(apiUrl('/api/refine-prompt'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: currentPrompt }),
      })
      const data = await response.json()
      if (!response.ok || !data.refined) {
        updateModeState(activeTab.id, (current) => ({
          ...current,
          statusText: `Refinement failed: ${data.error || 'Unknown error'}`,
        }))
        return
      }
      setPendingRefinedPrompt({ original: currentPrompt, refined: data.refined })
    } catch (error) {
      updateModeState(activeTab.id, (current) => ({
        ...current,
        statusText: `Refinement error: ${(error as Error).message}`,
      }))
    } finally {
      setIsRefiningPrompt(false)
    }
  }
  const lastDirectJsonTabIdRef = useRef<string>('')

  const activeTab = ACTIVE_TABS.find((tab) => tab.id === activeTabId) || FALLBACK_TAB
  const hasConfiguredWorkflows = ACTIVE_TABS.length > 0
  const activeState = modeStates[activeTab.id] || createDefaultModeState(activeTab)
  const activeWorkflowSettings = workflowSettingsByTabId[activeTab.id] || createDefaultWorkflowSettings()
  const selectedModel = activeWorkflowSettings.provider === 'atlas'
    ? activeWorkflowSettings.atlasModel
    : activeWorkflowSettings.byteplusModel
  const switchComposerWorkflow = (nextTabId: string, nextRefMode?: 'text' | 'image' | 'video') => {
    const currentPrompt = activeState.prompt
    updateModeState(nextTabId, (current) => ({
      ...current,
      prompt: currentPrompt,
    }))
    setActiveTabId(nextTabId)
    if (nextRefMode) {
      setComposerRefMode(nextRefMode)
    }
  }
  const selectedCombinedModelValue = `${activeWorkflowSettings.provider}:${selectedModel}`
  const combinedModelOptions = COMBINED_MODEL_OPTIONS.some((option) => option.value === selectedCombinedModelValue)
    ? COMBINED_MODEL_OPTIONS
    : [
        {
          value: selectedCombinedModelValue,
          label: `${activeWorkflowSettings.provider === 'atlas' ? 'Atlas Cloud' : 'BytePlus'} (${selectedModel})`,
          provider: activeWorkflowSettings.provider,
          model: selectedModel,
        },
        ...COMBINED_MODEL_OPTIONS,
      ]

  const sharedSettings: SharedSettings = {
    provider: activeWorkflowSettings.provider,
    model: selectedModel,
    ratio: activeWorkflowSettings.ratio,
    duration: activeWorkflowSettings.duration,
    resolution: activeWorkflowSettings.resolution,
    generateAudio: activeWorkflowSettings.generateAudio,
  }

  useEffect(() => {
    const storedModeStates = Object.fromEntries(
      Object.entries(modeStates).map(([tabId, state]) => [
        tabId,
        {
          prompt: state.prompt,
          mediaUrls: filterMediaUrls(state.mediaUrls),
          resultUrl: state.resultUrl,
          strictReferences: state.strictReferences,
          selectedVideoOptionIds: state.selectedVideoOptionIds,
          selectedImageReferenceKey: state.selectedImageReferenceKey,
        },
      ]),
    )

    const nextDraft: StoredDraftState = {
      activeTabId,
      workflowSettingsByTabId,
      modeStates: storedModeStates,
    }

    safeSetLocalStorage(LOCAL_DRAFT_STORAGE_KEY, JSON.stringify(nextDraft))
  }, [activeTabId, modeStates, workflowSettingsByTabId])

  useEffect(() => {
    safeSetLocalStorage(DIRECT_JSON_DRAFT_KEY, directRequestJson)
  }, [directRequestJson])

  // On mount: resume any tasks from localStorage. Also merge from Firestore once auth is ready.
  useEffect(() => {
    const localTasks = readPendingTasks()
    if (localTasks.length > 0) {
      const timeout = window.setTimeout(() => {
        localTasks.forEach((task) => { void handleResumeTask(task) })
      }, 800)
      return () => clearTimeout(timeout)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!authUid) return
    loadPendingTasksFromFirestore(authUid).then((firestoreTasks) => {
      const localIds = new Set(readPendingTasks().map((t) => t.requestId))
      const newTasks = firestoreTasks.filter((t) => !localIds.has(t.requestId))
      if (newTasks.length > 0) {
        newTasks.forEach((task) => {
          writePendingTask(task)
          void handleResumeTask(task)
        })
      }
    }).catch(() => { /* ignore */ })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUid])

  useEffect(() => {
    let cancelled = false

    const unsub = onAuthStateChanged(auth, (user) => {
      const uid = user?.uid || ''
      setAuthUid(uid)

      if (!uid) {
        setHistory(readLocalHistory())
        return
      }

      void (async () => {
        try {
          const firestoreHistory = await readFirestoreHistory(uid)
          if (cancelled) return
          setHistory(mergeHistories(readLocalHistory(), firestoreHistory))
          setHistoryDisplayLimit(10)
        } catch {
          if (!cancelled) {
            setHistory(readLocalHistory())
          }
        }
      })()
    })

    return () => {
      cancelled = true
      unsub()
    }
  }, [])

  const updateModeState = (
    tabId: string,
    updater: (current: ModeRuntimeState) => ModeRuntimeState,
  ) => {
    setModeStates((current) => {
      const tab = ACTIVE_TABS.find((item) => item.id === tabId) || FALLBACK_TAB
      return {
        ...current,
        [tabId]: updater(current[tabId] || createDefaultModeState(tab)),
      }
    })
  }

  const updateWorkflowSettings = (
    tabId: string,
    updater: (current: WorkflowSettingsState) => WorkflowSettingsState,
  ) => {
    setWorkflowSettingsByTabId((current) => ({
      ...current,
      [tabId]: updater(current[tabId] || createDefaultWorkflowSettings()),
    }))
  }

  const saveHistoryEntry = async (entry: GenerationHistoryEntry) => {
    let nextHistory: GenerationHistoryEntry[] = []
    setHistory((current) => {
      nextHistory = mergeHistories(current, [entry])
      safeSetLocalStorage(LOCAL_HISTORY_STORAGE_KEY, JSON.stringify(nextHistory))
      return nextHistory
    })

    try {
      await saveHistoryToFirestore(entry)
    } catch {
      // Keep local history even if Firestore sync fails.
    }
  }

  const pushDirectSubmitFeed = (text: string) => {
    if (!text.trim()) return
    const stamp = new Date().toLocaleTimeString()
    setDirectSubmitFeed((current) => ([
      ...current.slice(-5),
      {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        text: `[${stamp}] ${text}`,
      },
    ]))
  }

  const refreshGeneratedRuns = useCallback(async (showNotice: boolean) => {
    const localHistory = readLocalHistory()
    if (authUid) {
      const firestoreHistory = await readFirestoreHistory(authUid)
      setHistory(mergeHistories(localHistory, firestoreHistory))
    } else {
      setHistory(localHistory)
    }

    if (showNotice) {
      updateModeState(activeTab.id, (current) => ({
        ...current,
        statusText: 'Generated runs refreshed.',
      }))
    }
  }, [activeTab.id, authUid])

  const handleRefreshGenerations = async () => {
    setIsRefreshingRuns(true)
    try {
      await refreshGeneratedRuns(true)
    } catch {
      updateModeState(activeTab.id, (current) => ({
        ...current,
        statusText: 'Could not refresh generated runs right now.',
      }))
    } finally {
      setIsRefreshingRuns(false)
    }
  }

  const markBackendDown = (message?: string) => {
    setIsBackendAvailable(false)
    setBackendNotice(message || 'Back end server is not working. Please run it.')
    setIsBackendDialogOpen(true)
  }

  const openVideoDialog = (url: string, details?: VideoDialogState['details']) => {
    const trimmed = url.trim()
    if (!trimmed) return
    const playbackUrl = getPlaybackUrl(trimmed)
    if (!playbackUrl) {
      updateModeState(activeTab.id, (current) => ({
        ...current,
        statusText: 'This run is still finalizing and does not have a playable video URL yet.',
      }))
      return
    }
    setVideoDialogState({
      playbackUrl,
      title: details ? 'Saved Run Preview' : 'Video Preview',
      details,
    })
  }

  const openRunDetailsDialog = (details: NonNullable<VideoDialogState['details']>, title = 'Run Details') => {
    const playbackUrl = getPlaybackUrl(details.sourceUrl || '')
    setVideoDialogState({
      playbackUrl,
      title,
      details,
    })
  }

  const checkBackendHealth = async (): Promise<boolean> => {
    try {
      const response = await fetch(apiUrl('/api/health'))
      if (response.ok) {
        setIsBackendAvailable(true)
        setBackendNotice('')
        setIsBackendDialogOpen(false)
        return true
      }
      markBackendDown(`Back end server check failed (${response.status}). Please run it.`)
      return false
    } catch {
      markBackendDown('Back end server is not working. Please run it.')
      return false
    }
  }

  const appendToMediaLibrary = (kind: MediaKind, url: string, name: string) => {
    if (!url.trim()) return
    setMediaLibrary((current) => {
      const nextEntry: MediaLibraryItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
        kind,
        url: url.trim(),
        name: name.trim() || `${kind} upload`,
        createdAt: Date.now(),
      }
      const deduped = [nextEntry, ...current.filter((item) => item.url !== nextEntry.url)]
      const next = deduped.slice(0, 200)
      safeSetLocalStorage(SHARED_REFERENCE_LIBRARY_KEY, JSON.stringify(next))
      return next
    })
  }

  const pollUntilDone = async (
    requestProvider: ProviderId,
    requestModel: string,
    taskId: string,
    onStatus: (statusText: string) => void,
    shouldCancel: () => boolean,
  ): Promise<string | null> => {
    let transientErrors = 0
    let successWithoutResultCount = 0

    while (true) {
      await new Promise((resolve) => window.setTimeout(resolve, 4000))

      if (shouldCancel()) {
        return null
      }

      const statusUrl = requestProvider === 'atlas'
        ? `${apiUrl('/api/seedance/status')}?task_id=${encodeURIComponent(taskId)}&model=${encodeURIComponent(requestModel)}&provider=atlas`
        : `${apiUrl('/api/byteplus/status')}?task_id=${encodeURIComponent(taskId)}`

      const response = await fetch(statusUrl)
      const rawBody = await response.text()
      const payload = parseJsonSafely(rawBody)

      if (!response.ok) {
        const errorMessage = firstNonEmptyString(
          isRecord(payload) ? payload.error : undefined,
          isRecord(payload) ? payload.message : undefined,
          rawBody.trim().slice(0, 200),
          `HTTP ${response.status}`,
        )

        if (response.status >= 500 || response.status === 429) {
          if (response.status >= 500) {
            markBackendDown()
          }
          transientErrors += 1
          onStatus(`Status check error (${response.status}). Retry ${transientErrors}/5...`)
          if (transientErrors >= 5) {
            throw new Error(errorMessage)
          }
          continue
        }

        throw new Error(errorMessage)
      }

      transientErrors = 0

      const status = extractStatusValue(payload)

      if (isSuccessStatus(status)) {
        const resultUrl = extractResultUrl(payload)
        if (!resultUrl) {
          successWithoutResultCount += 1
          if (successWithoutResultCount < 6) {
            onStatus(`Finalizing output... (${successWithoutResultCount}/5)`)
            continue
          }
          throw new Error('Generation completed but no playable video URL was returned.')
        }
        onStatus('Completed.')
        return resultUrl
      }

      successWithoutResultCount = 0

      if (isFailureStatus(status)) {
        throw new Error(status || 'Generation failed.')
      }
    }
  }

  const finalizeCompletedRun = async (
    tab: PromptTab,
    state: ModeRuntimeState,
    request: { endpoint: string; body: Record<string, unknown> },
    requestSettings: SharedSettings,
    taskId: string,
    resultUrl: string,
    timings: { submittedAt: number; receivedAt: number },
  ) => {
    const completedAt = Date.now()
    const historyId = buildHistoryId(tab.id, taskId, completedAt)

    let firebaseVideoUrl = ''
    let storageSaveError = ''

    try {
      const saved = await saveGeneratedVideoToFirebase(resultUrl, historyId)
      firebaseVideoUrl = saved.firebaseUrl
    } catch (error) {
      storageSaveError = (error as Error).message
    }

    const entry: GenerationHistoryEntry = {
      historyId,
      taskId,
      tabId: tab.id,
      tabLabel: tab.label,
      provider: requestSettings.provider,
      model: requestSettings.model,
      ratio: requestSettings.ratio,
      duration: requestSettings.duration,
      resolution: requestSettings.resolution,
      generateAudio: requestSettings.generateAudio,
      prompt: state.prompt.trim(),
      mediaUrls: filterMediaUrls(state.mediaUrls),
      requestEndpoint: request.endpoint,
      requestPayload: request.body,
      resultUrl,
      firebaseVideoUrl,
      storageSaveError,
      submittedAt: timings.submittedAt,
      receivedAt: timings.receivedAt,
      generationMs: Math.max(0, timings.receivedAt - timings.submittedAt),
      outputDimensions: estimateDimensions(requestSettings.ratio, requestSettings.resolution),
      completedAt,
      ownerUid: auth.currentUser?.uid || '',
    }

    await saveHistoryEntry(entry)

    const savedStatus = storageSaveError
      ? `Completed. History saved; Firebase copy failed: ${storageSaveError}. Using temporary source URL, which may expire.`
      : auth.currentUser?.uid
        ? 'Completed. Saved locally and synced to Firebase.'
        : 'Completed. Saved locally; Firebase sync will start after sign-in.'

    updateModeState(tab.id, (current) => ({
      ...current,
      resultUrl: firebaseVideoUrl || resultUrl,
      statusText: savedStatus,
    }))
  }

  const finalizeRecoveredRun = async (task: PersistedPendingTask, resultUrl: string) => {
    const completedAt = Date.now()
    const historyId = buildHistoryId(task.tabId, task.taskId, completedAt)
    const receivedAt = Date.now()

    let firebaseVideoUrl = ''
    let storageSaveError = ''
    try {
      const saved = await saveGeneratedVideoToFirebase(resultUrl, historyId)
      firebaseVideoUrl = saved.firebaseUrl
    } catch (error) {
      storageSaveError = (error as Error).message
    }

    const tab = ACTIVE_TABS.find((t) => t.id === task.tabId) || FALLBACK_TAB
    const tabState = modeStates[task.tabId] || createDefaultModeState(tab)
    const fallbackSettings: SharedSettings = {
      provider: task.provider,
      model: task.model,
      ratio: task.ratio,
      duration: task.duration,
      resolution: task.resolution,
      generateAudio: typeof task.generateAudio === 'boolean'
        ? task.generateAudio
        : (workflowSettingsByTabId[task.tabId]?.generateAudio ?? false),
    }
    const fallbackRequest = buildRequest(tab, tabState, fallbackSettings, [])
    const recoveredPrompt = firstNonEmptyString(
      typeof task.prompt === 'string' ? task.prompt : undefined,
      tabState.prompt,
      '[Recovered — page was refreshed during generation]',
    )
    const recoveredMediaUrls = isRecord(task.mediaUrls)
      ? filterMediaUrls(task.mediaUrls as Record<string, string>)
      : filterMediaUrls(tabState.mediaUrls)
    const recoveredRequestEndpoint = firstNonEmptyString(
      typeof task.requestEndpoint === 'string' ? task.requestEndpoint : undefined,
      fallbackRequest.endpoint,
      task.provider === 'atlas' ? '/api/seedance/generate' : '/api/byteplus/generate',
    )
    const recoveredRequestPayload = isRecord(task.requestPayload)
      ? task.requestPayload
      : fallbackRequest.body

    const entry: GenerationHistoryEntry = {
      historyId,
      taskId: task.taskId,
      tabId: task.tabId,
      tabLabel: tab.label,
      provider: task.provider,
      model: task.model,
      ratio: task.ratio,
      duration: task.duration,
      resolution: task.resolution,
      generateAudio: fallbackSettings.generateAudio,
      prompt: recoveredPrompt,
      mediaUrls: recoveredMediaUrls,
      requestEndpoint: recoveredRequestEndpoint,
      requestPayload: recoveredRequestPayload,
      resultUrl,
      firebaseVideoUrl,
      storageSaveError,
      submittedAt: task.createdAt,
      receivedAt,
      generationMs: Math.max(0, receivedAt - task.createdAt),
      outputDimensions: estimateDimensions(task.ratio, task.resolution),
      completedAt,
      ownerUid: auth.currentUser?.uid || '',
    }

    await saveHistoryEntry(entry)

    updateModeState(task.tabId, (current) => ({
      ...current,
      resultUrl: firebaseVideoUrl || resultUrl,
      statusText: storageSaveError
        ? `Recovered. History saved; Firebase copy failed: ${storageSaveError}`
        : 'Recovered. Generation completed and saved to history.',
    }))
  }

  const handleResumeTask = async (task: PersistedPendingTask) => {
    setPendingGenerations((current) => {
      if (current.some((p) => p.id === task.requestId)) return current
      return [
        { id: task.requestId, tabId: task.tabId, provider: task.provider, model: task.model, createdAt: task.createdAt, taskId: task.taskId },
        ...current,
      ]
    })
    updateModeState(task.tabId, (current) => ({
      ...current,
      statusText: `Resuming generation… (task ${task.taskId})`,
    }))
    try {
      const finalResultUrl = await pollUntilDone(
        task.provider,
        task.model,
        task.taskId,
        (statusText) => {
          updateModeState(task.tabId, (current) => ({ ...current, statusText: `Resumed: ${statusText}` }))
        },
        () => false,
      )
      if (finalResultUrl) {
        await finalizeRecoveredRun(task, finalResultUrl)
      }
    } catch (error) {
      updateModeState(task.tabId, (current) => ({
        ...current,
        statusText: `Recovery failed: ${(error as Error).message}`,
      }))
    } finally {
      removePendingTask(task.requestId)
      setPendingGenerations((current) => current.filter((p) => p.id !== task.requestId))
    }
  }

  const handleGenerate = async (tab: PromptTab) => {
    if (!hasConfiguredWorkflows) {
      updateModeState(activeTab.id, (current) => ({
        ...current,
        statusText: 'No workflows configured. Add one to generate.',
      }))
      return
    }

    const state = modeStates[tab.id] || createDefaultModeState(tab)
    let effectiveState = state

    if (!state.prompt.trim()) {
      updateModeState(tab.id, (current) => ({
        ...current,
        statusText: 'Prompt is required.',
      }))
      return
    }

    const missingField = tab.fields.find((field) => field.required && !(state.mediaUrls[field.key] || '').trim())
    if (missingField) {
      updateModeState(tab.id, (current) => ({
        ...current,
        statusText: `${missingField.label} is required.`,
      }))
      return
    }

    if (tab.id === VIDEO_PLUS_IMAGE_MODE_ID) {
      const hasReferenceMedia = tab.fields
        .filter((field) => field.kind === 'image' || field.kind === 'video')
        .some((field) => Boolean((state.mediaUrls[field.key] || '').trim()))
      if (!hasReferenceMedia) {
        updateModeState(tab.id, (current) => ({
          ...current,
          statusText: 'At least one reference image or video is required.',
        }))
        return
      }
      // Warn when image-to-video model receives video files instead of images
      const modelId = (selectedModel || '').toLowerCase()
      if (modelId.includes('reference-to-video') || modelId.includes('image-to-video')) {
        const videoExtRe = /\.(mp4|webm|mov|avi|mkv)(\?|$)/i
        const imageFields = tab.fields.filter((field) => field.kind === 'image')
        const hasVideoAsImage = imageFields.some((field) => videoExtRe.test((state.mediaUrls[field.key] || '')))
        if (hasVideoAsImage) {
          updateModeState(tab.id, (current) => ({
            ...current,
            statusText: '⚠ Warning: This model expects images, but one or more reference images appear to be video files. Provide an image to avoid wasting credits.',
          }))
          // non-blocking: let generation proceed after warning
        }
      }
    }

    if (tab.id === IMAGE_SINGLE_REFERENCE_MODE_ID) {
      const imageFields = tab.fields.filter((field) => field.kind === 'image')
      const selectedKey = state.selectedImageReferenceKey
      const selectedImageUrl = selectedKey ? (state.mediaUrls[selectedKey] || '').trim() : ''
      if (!selectedImageUrl) {
        const firstFilled = imageFields.find((field) => (state.mediaUrls[field.key] || '').trim())
        if (!firstFilled) {
          updateModeState(tab.id, (current) => ({
            ...current,
            statusText: 'Select one image reference for image-to-video generation.',
          }))
          return
        }
        updateModeState(tab.id, (current) => ({
          ...current,
          selectedImageReferenceKey: firstFilled.key,
        }))
        effectiveState = {
          ...state,
          selectedImageReferenceKey: firstFilled.key,
        }
      }
    }

    const requestId = `${tab.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    cancelFlags.current[requestId] = false
    let submittedAt = 0

    const backendReady = await checkBackendHealth()
    if (!backendReady) {
      updateModeState(tab.id, (current) => ({
        ...current,
        statusText: 'Back end server is not running. Start it before generating.',
      }))
      return
    }

    const requestSettings: SharedSettings = {
      provider: activeWorkflowSettings.provider,
      model: selectedModel,
      ratio: activeWorkflowSettings.ratio,
      duration: activeWorkflowSettings.duration,
      resolution: activeWorkflowSettings.resolution,
      generateAudio: activeWorkflowSettings.generateAudio,
    }
    if (tab.id === VIDEO_PLUS_IMAGE_MODE_ID) {
      requestSettings.provider = 'atlas'
      requestSettings.model = 'bytedance/seedance-2.0-fast/reference-to-video'
    }
    if (tab.id === IMAGE_SINGLE_REFERENCE_MODE_ID) {
      requestSettings.provider = 'atlas'
      requestSettings.model = 'bytedance/seedance-2.0-fast/image-to-video'
    }
    const request = buildRequest(tab, effectiveState, requestSettings, resolvedMentionReferences)

    setPendingGenerations((current) => ([
      {
        id: requestId,
        tabId: tab.id,
        provider: requestSettings.provider,
        model: requestSettings.model,
        createdAt: Date.now(),
      },
      ...current,
    ]))

    try {
      submittedAt = Date.now()
      const response = await fetch(apiUrl(request.endpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request.body),
      })

      const rawBody = await response.text()
      const payload = parseJsonSafely(rawBody)

      if (!response.ok) {
        if (response.status >= 500) {
          markBackendDown()
        }
        throw new Error(
          firstNonEmptyString(
            isRecord(payload) ? payload.error : undefined,
            isRecord(payload) ? payload.message : undefined,
            rawBody.trim().slice(0, 240),
            `HTTP ${response.status}`,
          ),
        )
      }

      const taskId = extractTaskId(payload)
      const directResultUrl = extractResultUrl(payload)

      if (taskId) {
        writePendingTask({
          requestId,
          taskId,
          tabId: tab.id,
          provider: requestSettings.provider,
          model: requestSettings.model,
          ratio: requestSettings.ratio,
          duration: requestSettings.duration,
          resolution: requestSettings.resolution,
          createdAt: submittedAt,
          generateAudio: requestSettings.generateAudio,
          prompt: state.prompt.trim(),
          mediaUrls: filterMediaUrls(state.mediaUrls),
          requestEndpoint: request.endpoint,
          requestPayload: request.body,
        })
        setPendingGenerations((current) => current.map((p) => p.id === requestId ? { ...p, taskId } : p))
      }

      const finalResultUrl = directResultUrl || (taskId
        ? await pollUntilDone(
          requestSettings.provider,
          requestSettings.model,
          taskId,
          (statusText) => {
            updateModeState(tab.id, (current) => ({
              ...current,
              statusText,
            }))
          },
          () => Boolean(cancelFlags.current[requestId]),
        )
        : '')

      if (finalResultUrl === null) {
        return
      }

      if (!finalResultUrl) {
        throw new Error(taskId ? 'Task finished without a result URL.' : 'No task ID or result URL was returned by the API.')
      }

      const receivedAt = Date.now()
      await finalizeCompletedRun(tab, state, request, requestSettings, taskId, finalResultUrl, {
        submittedAt,
        receivedAt,
      })
    } catch (error) {
      const message = (error as Error).message || ''
      if (/failed to fetch|networkerror|load failed/i.test(message)) {
        markBackendDown()
      }
      updateModeState(tab.id, (current) => ({
        ...current,
        statusText: `Error: ${(error as Error).message}`,
      }))
    } finally {
      removePendingTask(requestId)
      setPendingGenerations((current) => current.filter((entry) => entry.id !== requestId))
      delete cancelFlags.current[requestId]
    }
  }

  const restoreHistoryEntry = (entry: GenerationHistoryEntry) => {
    const mediaUrls = Object.fromEntries(
      Object.entries(entry.mediaUrls).filter(([, value]) => Boolean(value.trim())),
    )
    const imageEntries = Object.entries(mediaUrls).filter(([, value]) => !/\.(mp4|webm|mov|avi|mkv)(\?|#|$)/i.test(value))
    const videoEntries = Object.entries(mediaUrls).filter(([, value]) => /\.(mp4|webm|mov|avi|mkv)(\?|#|$)/i.test(value))
    const payloadImage = typeof entry.requestPayload.image === 'string' ? entry.requestPayload.image.trim() : ''
    const hasPayloadReferenceImages = Array.isArray(entry.requestPayload.reference_images) && entry.requestPayload.reference_images.length > 0
    const hasPayloadReferenceVideos = Array.isArray(entry.requestPayload.reference_videos) && entry.requestPayload.reference_videos.length > 0
    const requestedMode = typeof entry.requestPayload.mode === 'string' ? entry.requestPayload.mode : ''

    let targetTabId = VIDEO_PLUS_IMAGE_MODE_ID
    let targetRefMode: 'text' | 'image' | 'video' = 'video'

    if (entry.tabId === IMAGE_SINGLE_REFERENCE_MODE_ID || requestedMode === 'image-to-video' || (payloadImage && !hasPayloadReferenceImages && !hasPayloadReferenceVideos && videoEntries.length === 0)) {
      targetTabId = IMAGE_SINGLE_REFERENCE_MODE_ID
      targetRefMode = 'image'
    } else if (entry.tabId === VIDEO_PLUS_IMAGE_MODE_ID || hasPayloadReferenceImages || hasPayloadReferenceVideos || imageEntries.length > 0 || videoEntries.length > 0) {
      targetTabId = VIDEO_PLUS_IMAGE_MODE_ID
      targetRefMode = 'video'
    }

    if (imageEntries.length === 0 && videoEntries.length === 0 && !payloadImage) {
      targetRefMode = 'text'
    }

    const selectedImageReferenceKey = targetTabId === IMAGE_SINGLE_REFERENCE_MODE_ID
      ? (imageEntries.find(([, value]) => value === payloadImage)?.[0] || imageEntries[0]?.[0] || '')
      : ''

    setActiveTabId(targetTabId)
    setComposerRefMode(targetRefMode)
    updateWorkflowSettings(targetTabId, (current) => ({
      ...current,
      provider: entry.provider,
      atlasModel: entry.provider === 'atlas' ? entry.model : current.atlasModel,
      byteplusModel: entry.provider === 'byteplus' ? entry.model : current.byteplusModel,
      ratio: entry.ratio,
      duration: entry.duration,
      resolution: entry.resolution,
      generateAudio: entry.generateAudio,
    }))

    updateModeState(targetTabId, (current) => ({
      ...current,
      prompt: entry.prompt,
      mediaUrls: { ...entry.mediaUrls },
      resultUrl: entry.firebaseVideoUrl || entry.resultUrl,
      selectedImageReferenceKey,
      statusText: `Loaded saved run from ${formatTimestamp(entry.completedAt)}.`,
      uploadStates: {},
      isGenerating: false,
    }))
  }

  const loadHistoryPromptOnly = (entry: GenerationHistoryEntry) => {
    updateModeState(activeTab.id, (current) => ({
      ...current,
      prompt: entry.prompt,
      statusText: `Loaded prompt only from ${formatTimestamp(entry.completedAt)}.`,
    }))
  }

  const activeTabHistory = history
  const activePendingGenerations = pendingGenerations.filter((entry) => entry.tabId === activeTab.id)
  const referenceFields = (hasConfiguredWorkflows
    ? activeTab.fields
    : NO_WORKFLOW_REFERENCE_FIELDS
  ).filter((field) => field.kind === 'image' || field.kind === 'video')

  const mediaLibraryNameByUrl = useMemo(() => (
    new Map(mediaLibrary.map((item) => [item.url, item.name.trim() || `Reference ${item.kind}`]))
  ), [mediaLibrary])

  const mediaLibraryKindByUrl = useMemo(() => (
    new Map(mediaLibrary.map((item) => [item.url, item.kind]))
  ), [mediaLibrary])

  const cachedReferenceImageUrls = useMemo(() => {
    const urls = new Set<string>()

    Object.values(modeStates).forEach((state) => {
      Object.values(state.mediaUrls).forEach((url) => {
        const trimmed = url.trim()
        if (!trimmed) return
        if (/\.(mp4|webm|mov|avi|mkv)(\?|#|$)/i.test(trimmed)) return
        urls.add(trimmed)
      })
    })

    mediaLibrary.forEach((item) => {
      if (item.kind !== 'image') return
      const trimmed = item.url.trim()
      if (!trimmed) return
      urls.add(trimmed)
    })

    return Array.from(urls)
  }, [mediaLibrary, modeStates])

  const mentionableReferences = useMemo<MentionableReference[]>(() => {
    const usedKeys = new Set<string>()
    return referenceFields
      .filter((field) => field.kind === 'image' || field.kind === 'video')
      .map((field, index) => {
        const url = (activeState.mediaUrls[field.key] || '').trim()
        if (!url) return null
        const baseName = mediaLibraryNameByUrl.get(url) || field.label
        const baseKey = createMentionKey(baseName, `ref_${index + 1}`)
        let mentionKey = baseKey
        let suffix = 2
        while (usedKeys.has(mentionKey.toLowerCase())) {
          mentionKey = `${baseKey}_${suffix}`
          suffix += 1
        }
        usedKeys.add(mentionKey.toLowerCase())
        return {
          id: field.key,
          url,
          label: baseName,
          mentionKey,
          kind: field.kind === 'video' ? 'video' : 'image',
        }
      })
      .filter((item): item is MentionableReference => Boolean(item))
  }, [activeState.mediaUrls, mediaLibraryNameByUrl, referenceFields])

  const resolvedMentionReferences = useMemo(
    () => resolvePromptMentionReferences(activeState.prompt, mentionableReferences),
    [activeState.prompt, mentionableReferences],
  )

  const mentionedReferenceUrls = useMemo(
    () => new Set(resolvedMentionReferences.map((entry) => entry.url)),
    [resolvedMentionReferences],
  )

  const referenceImageCount = useMemo(
    () => referenceFields.filter((field) => field.kind === 'image' && (activeState.mediaUrls[field.key] || '').trim()).length,
    [referenceFields, activeState.mediaUrls],
  )

  const referenceVideoCount = useMemo(
    () => referenceFields.filter((field) => field.kind === 'video' && (activeState.mediaUrls[field.key] || '').trim()).length,
    [referenceFields, activeState.mediaUrls],
  )

  useEffect(() => {
    if (activeTab.id !== IMAGE_SINGLE_REFERENCE_MODE_ID) return
    const imageFields = referenceFields.filter((field) => field.kind === 'image')
    const selectedKey = activeState.selectedImageReferenceKey
    const selectedUrl = selectedKey ? (activeState.mediaUrls[selectedKey] || '').trim() : ''
    if (selectedUrl) return
    const firstFilled = imageFields.find((field) => (activeState.mediaUrls[field.key] || '').trim())
    if (!firstFilled) return
    updateModeState(activeTab.id, (current) => ({
      ...current,
      selectedImageReferenceKey: firstFilled.key,
    }))
  }, [activeTab.id, activeState.mediaUrls, activeState.selectedImageReferenceKey, referenceFields])

  const videoOptionAvailability = useMemo<Record<VideoWorkflowOptionId, VideoOptionAvailability>>(() => {
    const totalRefs = referenceImageCount + referenceVideoCount
    return {
      'multi-image-reference': {
        enabled: referenceImageCount >= 2,
        reason: referenceImageCount >= 2 ? 'Uses multiple images as references.' : 'Attach at least 2 images to use this option.',
        recommended: referenceImageCount >= 2,
      },
      'extend-forward': {
        enabled: referenceVideoCount >= 1,
        reason: referenceVideoCount >= 1 ? 'Extends content after a reference video.' : 'Attach at least 1 video to extend forward.',
        recommended: referenceVideoCount >= 1,
      },
      'extend-backward': {
        enabled: referenceVideoCount >= 1,
        reason: referenceVideoCount >= 1 ? 'Extends content before a reference video.' : 'Attach at least 1 video to extend backward.',
        recommended: referenceVideoCount >= 1,
      },
      'multi-element-composition': {
        enabled: totalRefs >= 2,
        reason: totalRefs >= 2 ? 'Combines multiple references in one output.' : 'Attach at least 2 references to combine elements.',
        recommended: totalRefs >= 2,
      },
      'motion-reference': {
        enabled: referenceVideoCount >= 1,
        reason: referenceVideoCount >= 1 ? 'Follows motion from a reference video.' : 'Attach at least 1 video for motion reference.',
        recommended: referenceVideoCount >= 1,
      },
      'camera-motion-reference': {
        enabled: referenceVideoCount >= 1,
        reason: referenceVideoCount >= 1 ? 'Follows camera language from a reference video.' : 'Attach at least 1 video for camera motion reference.',
        recommended: referenceVideoCount >= 1,
      },
      'vfx-reference': {
        enabled: referenceVideoCount >= 1,
        reason: referenceVideoCount >= 1 ? 'Follows visual effects behavior from a reference video.' : 'Attach at least 1 video for VFX reference.',
        recommended: referenceVideoCount >= 1,
      },
      'element-editing': {
        enabled: referenceVideoCount >= 1,
        reason: referenceVideoCount >= 1 ? 'Edit elements while preserving base video continuity.' : 'Attach at least 1 video for add/remove/modify editing.',
        recommended: referenceVideoCount >= 1,
      },
      'track-completion': {
        enabled: referenceVideoCount >= 2,
        reason: referenceVideoCount >= 2 ? 'Completes tracks by stitching referenced clips.' : 'Attach at least 2 videos to complete tracks.',
        recommended: referenceVideoCount >= 2,
      },
    }
  }, [referenceImageCount, referenceVideoCount])

  useEffect(() => {
    if (!(activeTab.requestMode === 'reference-to-video' || activeTab.requestMode === 'video-extension' || activeTab.requestMode === 'image-to-video')) {
      return
    }
    const hasInvalidSelections = activeState.selectedVideoOptionIds.some((id) => !videoOptionAvailability[id]?.enabled)
    if (!hasInvalidSelections) {
      return
    }
    updateModeState(activeTab.id, (current) => ({
      ...current,
      selectedVideoOptionIds: current.selectedVideoOptionIds.filter((id) => videoOptionAvailability[id]?.enabled),
    }))
  }, [activeTab.id, activeTab.requestMode, activeState.selectedVideoOptionIds, videoOptionAvailability])

  const previewRequest = buildRequest(activeTab, activeState, sharedSettings, resolvedMentionReferences)
  const outputPlaybackUrl = getPlaybackUrl(activeState.resultUrl)
  const workflowSearchValue = workflowSearch.trim().toLowerCase()
  const workflowAllowedGroups = WORKFLOW_FILTER_GROUPS[workflowFilterMode]
  const filteredTabs = ACTIVE_TABS.filter((tab) => {
    if (workflowAllowedGroups && !workflowAllowedGroups.includes(tab.group)) {
      return false
    }
    if (!workflowSearchValue) {
      return true
    }
    return `${tab.label} ${tab.group} ${tab.summary}`.toLowerCase().includes(workflowSearchValue)
  })
  const latestTabHistory = activeTabHistory[0]
  const activeOutputUrl = activeState.resultUrl.trim()
  const hasActiveOutputPreview = Boolean(outputPlaybackUrl)
  const activeOutputAlreadySaved = activeOutputUrl
    ? activeTabHistory.some((entry) => (entry.firebaseVideoUrl || entry.resultUrl) === activeOutputUrl)
    : false

  useEffect(() => {
    if (activePendingGenerations.length === 0) {
      return
    }

    const timer = window.setInterval(() => {
      void refreshGeneratedRuns(false)
    }, 5000)

    return () => {
      window.clearInterval(timer)
    }
  }, [activePendingGenerations.length, refreshGeneratedRuns])

  useEffect(() => {
    if (lastDirectJsonTabIdRef.current === activeTab.id) {
      return
    }
    lastDirectJsonTabIdRef.current = activeTab.id
    setDirectRequestJson(JSON.stringify(previewRequest.body, null, 2))
    setDirectSubmitFeed([])
  }, [activeTab.id, previewRequest])

  const historyRailItems = useMemo(() => [
    ...activePendingGenerations.map((entry) => ({
      id: entry.id,
      url: '',
      title: 'Order submitted',
      provider: entry.provider,
      model: entry.model,
      timestamp: entry.createdAt,
      details: undefined,
      isPending: true,
    })),
    ...(activeOutputUrl && !activeOutputAlreadySaved
      ? (() => {
          const sources = resolvePrimaryAndFallbackVideoSources(activeOutputUrl, '')
          if (!sources.primary) {
            return []
          }
          return [{
          id: 'latest-output',
          url: sources.primary,
          title: 'Latest output',
          provider: sharedSettings.provider,
          model: sharedSettings.model,
          timestamp: latestTabHistory?.completedAt || Date.now(),
          details: {
            sourceUrl: sources.primary,
            prompt: activeState.prompt,
            model: sharedSettings.model,
            provider: sharedSettings.provider,
            timestamp: latestTabHistory?.completedAt || Date.now(),
            requestEndpoint: previewRequest.endpoint,
            requestPayload: previewRequest.body,
            ratio: sharedSettings.ratio,
            resolution: sharedSettings.resolution,
            durationSec: sharedSettings.duration,
            outputDimensions: estimateDimensions(sharedSettings.ratio, sharedSettings.resolution),
            generateAudio: sharedSettings.generateAudio,
          },
          isPending: false,
        }]
        })()
      : []),
    ...activeTabHistory.map((entry) => {
      const sources = resolvePrimaryAndFallbackVideoSources(entry.firebaseVideoUrl || '', entry.resultUrl || '')
      return {
        id: entry.historyId,
        url: sources.primary,
        title: formatTimestamp(entry.completedAt),
        provider: entry.provider,
        model: entry.model,
        timestamp: entry.completedAt,
        details: {
          historyId: entry.historyId,
          sourceUrl: sources.primary,
          prompt: entry.prompt,
          model: entry.model,
          provider: entry.provider,
          timestamp: entry.completedAt,
          requestEndpoint: entry.requestEndpoint,
          requestPayload: entry.requestPayload,
          ratio: entry.ratio,
          resolution: entry.resolution,
          durationSec: entry.duration,
          outputDimensions: entry.outputDimensions,
          generateAudio: entry.generateAudio,
          taskId: entry.taskId,
          submittedAt: entry.submittedAt,
          receivedAt: entry.receivedAt,
          generationMs: entry.generationMs,
        },
        isPending: false,
      }
    }).filter((entry) => Boolean(entry.url)),
  ], [
    activePendingGenerations,
    activeOutputAlreadySaved,
    activeOutputUrl,
    activeState.prompt,
    activeTabHistory,
    latestTabHistory?.completedAt,
    previewRequest.body,
    previewRequest.endpoint,
    sharedSettings.duration,
    sharedSettings.generateAudio,
    sharedSettings.model,
    sharedSettings.provider,
    sharedSettings.ratio,
    sharedSettings.resolution,
  ])
  const selectedRailItem = useMemo(
    () => historyRailItems.find((item) => item.id === railPreviewSelectionId) || historyRailItems[0] || null,
    [historyRailItems, railPreviewSelectionId],
  )
  const filteredReferenceLibrary = mediaLibrary
    .filter((item) => referenceLibraryFilter === 'all' || item.kind === referenceLibraryFilter)
    .filter((item) => {
      const query = referenceLibraryQuery.trim().toLowerCase()
      if (!query) return true
      return `${item.name} ${item.url}`.toLowerCase().includes(query)
    })

  const promptMentionOptions = useMemo(() => {
    if (promptMentionQuery === null) return []
    const query = promptMentionQuery.trim().toLowerCase()
    if (!query) return mentionableReferences
    return mentionableReferences.filter((item) => (
      item.label.toLowerCase().includes(query) || item.mentionKey.toLowerCase().includes(query)
    ))
  }, [mentionableReferences, promptMentionQuery])

  useEffect(() => {
    if (promptMentionOptions.length === 0) {
      setActivePromptMentionIndex(0)
      return
    }
    setActivePromptMentionIndex((current) => Math.min(current, promptMentionOptions.length - 1))
  }, [promptMentionOptions])

  const toggleReferenceLibrarySelection = (url: string) => {
    setSelectedReferenceLibraryUrls((current) => (
      current.includes(url)
        ? current.filter((value) => value !== url)
        : [url, ...current]
    ))
  }

  const openReferenceLibraryDialog = () => {
    const selectedByKind = referenceFields
      .map((field) => activeState.mediaUrls[field.key] || '')
      .filter(Boolean)
    setReferenceLibraryFilter('all')
    setReferenceLibraryQuery('')
    setSelectedReferenceLibraryUrls(selectedByKind)
    setIsReferenceLibraryDialogOpen(true)
  }

  const renameMediaLibraryItem = (id: string, name: string) => {
    setMediaLibrary((current) => {
      const next = current.map((item) => (
        item.id === id
          ? { ...item, name: name.trim() || `Reference ${item.kind}` }
          : item
      ))
      safeSetLocalStorage(SHARED_REFERENCE_LIBRARY_KEY, JSON.stringify(next))
      return next
    })
  }

  const openWorkflowPicker = (mode: WorkflowFilterMode, anchorElement: HTMLElement) => {
    const rect = anchorElement.getBoundingClientRect()
    const pickerWidth = 420
    const desiredLeft = Math.max(8, Math.min(rect.left, window.innerWidth - pickerWidth - 8))
    setWorkflowFilterMode(mode)
    setWorkflowSearch('')
    setWorkflowPickerPosition({
      top: rect.bottom + 6,
      left: desiredLeft,
    })
    setIsWorkflowPickerOpen(true)
  }

  const applyReferenceLibrarySelection = () => {
    const availableByKind: Record<'image' | 'video', string[]> = {
      image: [],
      video: [],
    }
    selectedReferenceLibraryUrls.forEach((url) => {
      const kind = mediaLibraryKindByUrl.get(url)
      if (kind === 'image' || kind === 'video') {
        availableByKind[kind].push(url)
      }
    })

    let overflowCount = 0
    updateModeState(activeTab.id, (current) => {
      const nextMediaUrls = { ...current.mediaUrls }
      referenceFields.forEach((field) => {
        if (field.kind !== 'image' && field.kind !== 'video') {
          return
        }
        const nextValue = availableByKind[field.kind].shift() || ''
        nextMediaUrls[field.key] = nextValue
      })
      overflowCount = availableByKind.image.length + availableByKind.video.length
      return {
        ...current,
        mediaUrls: nextMediaUrls,
        statusText: overflowCount > 0
          ? `Selected ${selectedReferenceLibraryUrls.length} references, but only ${referenceFields.length} fit this workflow.`
          : 'References updated from library.',
      }
    })
    setIsReferenceLibraryDialogOpen(false)
  }

  const handleReferenceLibraryUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    setIsReferenceLibraryUploading(true)
    const selectedFiles = Array.from(files)
    const uploadedUrls: string[] = []
    try {
      for (const file of selectedFiles) {
        const kind: MediaKind = file.type.startsWith('video/') ? 'video' : 'image'
        const url = await uploadFile(file, kind)
        appendToMediaLibrary(kind, url, file.name)
        uploadedUrls.push(url)
      }
      if (uploadedUrls.length > 0) {
        setSelectedReferenceLibraryUrls((current) => Array.from(new Set([...uploadedUrls, ...current])))
      }
    } finally {
      setIsReferenceLibraryUploading(false)
    }
  }

  const handleDirectRequestSubmit = async () => {
    const rawRequest = directRequestJson.trim()
    if (!rawRequest) {
      pushDirectSubmitFeed('Request JSON is required.')
      return
    }

    const backendReady = await checkBackendHealth()
    if (!backendReady) {
      pushDirectSubmitFeed('Back end server is not running. Start it before submitting raw JSON.')
      return
    }

    let parsedRequest: unknown
    try {
      parsedRequest = JSON.parse(rawRequest)
    } catch {
      pushDirectSubmitFeed('Invalid JSON. Paste a valid JSON object.')
      return
    }

    let endpoint = previewRequest.endpoint
    let body: unknown = parsedRequest

    if (isRecord(parsedRequest) && typeof parsedRequest.endpoint === 'string' && 'body' in parsedRequest) {
      endpoint = parsedRequest.endpoint.trim()
      body = parsedRequest.body
    }

    if (!endpoint || !endpoint.startsWith('/api/')) {
      pushDirectSubmitFeed('Endpoint must start with /api/.')
      return
    }

    if (!isRecord(body)) {
      pushDirectSubmitFeed('Request body must be a JSON object.')
      return
    }

    const requestBody = { ...(body as Record<string, unknown>) }
    const requestProvider: ProviderId = endpoint.includes('/seedance') ? 'atlas' : 'byteplus'
    if (endpoint.startsWith('/api/seedance') && typeof requestBody.providerHint !== 'string') {
      requestBody.providerHint = requestProvider === 'atlas' ? 'atlas' : 'pro'
    }
    const requestModel = firstNonEmptyString(requestBody.model, selectedModel)
    const requestSettings: SharedSettings = {
      provider: requestProvider,
      model: requestModel,
      ratio: firstNonEmptyString(requestBody.aspect_ratio, requestBody.ratio, activeWorkflowSettings.ratio),
      duration: typeof requestBody.duration === 'number'
        ? normalizeDuration(requestBody.duration)
        : activeWorkflowSettings.duration,
      resolution: firstNonEmptyString(requestBody.resolution, activeWorkflowSettings.resolution),
      generateAudio: typeof requestBody.generate_audio === 'boolean'
        ? requestBody.generate_audio
        : activeWorkflowSettings.generateAudio,
    }

    const requestId = `manual-${activeTab.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    cancelFlags.current[requestId] = false
    let submittedAt = 0
    setPendingGenerations((current) => ([
      {
        id: requestId,
        tabId: activeTab.id,
        provider: requestProvider,
        model: requestModel,
        createdAt: Date.now(),
      },
      ...current,
    ]))

    setIsDirectSubmitBusy(true)
    pushDirectSubmitFeed(`Submitting raw request to ${endpoint}...`)

    try {
      submittedAt = Date.now()
      const response = await fetch(apiUrl(endpoint), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      })

      const rawBody = await response.text()
      const payload = parseJsonSafely(rawBody)

      if (!response.ok) {
        if (response.status >= 500) {
          markBackendDown()
        }
        throw new Error(
          firstNonEmptyString(
            isRecord(payload) ? payload.error : undefined,
            isRecord(payload) ? payload.message : undefined,
            rawBody.trim().slice(0, 240),
            `HTTP ${response.status}`,
          ),
        )
      }

      setIsDirectSubmitBusy(false)

      const taskId = extractTaskId(payload)
      if (taskId) {
        pushDirectSubmitFeed(`Order submitted successfully. Task ${taskId}.`)
        writePendingTask({
          requestId,
          taskId,
          tabId: activeTab.id,
          provider: requestSettings.provider,
          model: requestSettings.model,
          ratio: requestSettings.ratio,
          duration: requestSettings.duration,
          resolution: requestSettings.resolution,
          createdAt: submittedAt,
          generateAudio: requestSettings.generateAudio,
          prompt: typeof requestBody.prompt === 'string' ? requestBody.prompt : activeState.prompt,
          mediaUrls: filterMediaUrls(activeState.mediaUrls),
          requestEndpoint: endpoint,
          requestPayload: requestBody,
        })
        setPendingGenerations((current) => current.map((p) => p.id === requestId ? { ...p, taskId } : p))
      }
      const directResultUrl = extractResultUrl(payload)
      const finalResultUrl = directResultUrl || (taskId
        ? await pollUntilDone(
          requestProvider,
          requestModel,
          taskId,
          (statusText) => {
            pushDirectSubmitFeed(`Raw request status: ${statusText}`)
          },
          () => Boolean(cancelFlags.current[requestId]),
        )
        : '')

      if (finalResultUrl === null) {
        pushDirectSubmitFeed('Raw request stopped.')
        return
      }

      if (!finalResultUrl) {
        throw new Error(taskId ? 'Task finished without a result URL.' : 'No task ID or result URL was returned by the API.')
      }

      const receivedAt = Date.now()
      const promptFromRequest = typeof requestBody.prompt === 'string' ? requestBody.prompt : activeState.prompt
      await finalizeCompletedRun(
        activeTab,
        { ...activeState, prompt: promptFromRequest },
        { endpoint, body: requestBody },
        requestSettings,
        taskId,
        finalResultUrl,
        {
          submittedAt,
          receivedAt,
        },
      )
      pushDirectSubmitFeed(`Raw request completed via ${endpoint}.`)
    } catch (error) {
      const message = (error as Error).message || ''
      if (/failed to fetch|networkerror|load failed/i.test(message)) {
        markBackendDown()
      }
      pushDirectSubmitFeed(`Error: ${(error as Error).message}`)
    } finally {
      setIsDirectSubmitBusy(false)
      removePendingTask(requestId)
      setPendingGenerations((current) => current.filter((entry) => entry.id !== requestId))
      delete cancelFlags.current[requestId]
    }
  }

  const handleSaveDirectPreset = () => {
    const rawRequest = directRequestJson.trim()
    if (!rawRequest) {
      pushDirectSubmitFeed('Request JSON is required before saving a preset.')
      return
    }

    let parsedRequest: unknown
    try {
      parsedRequest = JSON.parse(rawRequest)
    } catch {
      pushDirectSubmitFeed('Invalid JSON. Fix JSON before saving preset.')
      return
    }

    const normalizedJson = JSON.stringify(parsedRequest, null, 2)
    const suggestedName = getDirectPresetNameFromJson(parsedRequest)
    const chosenName = window.prompt('Name this preset:', suggestedName)
    if (chosenName === null) return // user cancelled
    const presetName = chosenName.trim() || suggestedName
    const now = Date.now()
    const nextPreset: DirectRequestPreset = {
      id: `preset-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      name: presetName,
      json: normalizedJson,
      createdAt: now,
    }

    setDirectRequestPresets((current) => {
      const next = [nextPreset, ...current]
      safeSetLocalStorage(DIRECT_REQUEST_PRESETS_KEY, JSON.stringify(next))
      return next
    })

    setDirectRequestJson(normalizedJson)
    pushDirectSubmitFeed(`Preset saved as ${presetName}`)
  }

  const handleLoadDirectPreset = (preset: DirectRequestPreset) => {
    setDirectRequestJson(preset.json)
    setIsDirectPresetDialogOpen(false)
    pushDirectSubmitFeed(`Loaded preset ${preset.name}`)
  }

  const handleDeleteDirectPreset = (preset: DirectRequestPreset) => {
    const shouldDelete = window.confirm(`Clear saved preset ${preset.name}?`)
    if (!shouldDelete) {
      return
    }
    setDirectRequestPresets((current) => {
      const next = current.filter((item) => item.id !== preset.id)
      safeSetLocalStorage(DIRECT_REQUEST_PRESETS_KEY, JSON.stringify(next))
      return next
    })
    pushDirectSubmitFeed(`Cleared preset ${preset.name}`)
  }

  const handleRenameDirectPreset = (preset: DirectRequestPreset) => {
    const newName = window.prompt('Rename preset:', preset.name)
    if (newName === null) return
    const trimmed = newName.trim()
    if (!trimmed || trimmed === preset.name) return
    setDirectRequestPresets((current) => {
      const next = current.map((item) => item.id === preset.id ? { ...item, name: trimmed } : item)
      safeSetLocalStorage(DIRECT_REQUEST_PRESETS_KEY, JSON.stringify(next))
      return next
    })
    pushDirectSubmitFeed(`Renamed preset to ${trimmed}`)
  }

  const clampRailWidth = useCallback((nextWidth: number, containerWidth: number): number => {
    const min = 236
    const max = Math.max(360, containerWidth - directPanelWidth - 420)
    return Math.min(max, Math.max(min, nextWidth))
  }, [directPanelWidth])

  const clampDirectPanelWidth = useCallback((nextWidth: number, containerWidth: number): number => {
    const min = 280
    const max = Math.max(380, containerWidth - railWidth - 420)
    return Math.min(max, Math.max(min, nextWidth))
  }, [railWidth])

  const handleRailMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (window.innerWidth <= 760) {
      return
    }
    event.preventDefault()
    isResizingRailRef.current = true
  }

  const adjustRailByStep = (delta: number) => {
    const container = labLayoutRef.current
    if (!container) {
      setRailWidth((current) => Math.max(236, current + delta))
      return
    }
    setRailWidth((current) => clampRailWidth(current + delta, container.getBoundingClientRect().width))
  }

  const handleRailHandleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      adjustRailByStep(-16)
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      adjustRailByStep(16)
    }
  }

  const handleDirectPanelMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    if (window.innerWidth <= 760) {
      return
    }
    event.preventDefault()
    isResizingDirectPanelRef.current = true
    lastDirectResizeClientXRef.current = event.clientX
  }

  const adjustDirectPanelByStep = (delta: number) => {
    const container = labLayoutRef.current
    if (!container) {
      setDirectPanelWidth((current) => Math.max(280, current + delta))
      return
    }
    setDirectPanelWidth((current) => clampDirectPanelWidth(current + delta, container.getBoundingClientRect().width))
  }

  const handleDirectPanelHandleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      adjustDirectPanelByStep(-16)
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      adjustDirectPanelByStep(16)
    }
  }

  useEffect(() => {
    const handleMouseMove = (event: globalThis.MouseEvent) => {
      const container = labLayoutRef.current
      if (!container) {
        return
      }

      if (!isResizingRailRef.current) {
        if (!isResizingDirectPanelRef.current) {
          return
        }
        const deltaX = event.clientX - lastDirectResizeClientXRef.current
        if (!deltaX) {
          return
        }
        lastDirectResizeClientXRef.current = event.clientX
        setDirectPanelWidth((current) => clampDirectPanelWidth(current + deltaX, container.getBoundingClientRect().width))
        return
      }

      const rect = container.getBoundingClientRect()
      const nextWidth = event.clientX - rect.left
      setRailWidth(clampRailWidth(nextWidth, rect.width))
    }

    const stopResizing = () => {
      isResizingRailRef.current = false
      isResizingDirectPanelRef.current = false
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', stopResizing)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', stopResizing)
    }
  }, [clampDirectPanelWidth, clampRailWidth])

  useEffect(() => {
    const container = labLayoutRef.current
    if (!container) return
    container.style.setProperty('--lab-rail-width', `${railWidth}px`)
    container.style.setProperty('--lab-direct-width', `${directPanelWidth}px`)
  }, [directPanelWidth, railWidth])

  useEffect(() => {
    if (!isWorkflowPickerOpen) {
      return
    }
    const handlePointerDown = (event: globalThis.MouseEvent) => {
      const target = event.target
      if (!(target instanceof Element)) {
        return
      }
      if (workflowPickerRef.current?.contains(target) || target.closest('[data-workflow-picker-trigger="true"]')) {
        return
      }
      setIsWorkflowPickerOpen(false)
    }
    window.addEventListener('mousedown', handlePointerDown)
    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
    }
  }, [isWorkflowPickerOpen])

  useEffect(() => {
    setPromptMentionQuery(null)
  }, [activeTab.id])

  useEffect(() => {
    if (!isWorkflowPickerOpen) {
      return
    }
    const closePopover = () => setIsWorkflowPickerOpen(false)
    window.addEventListener('resize', closePopover)
    return () => {
      window.removeEventListener('resize', closePopover)
    }
  }, [isWorkflowPickerOpen])

  useEffect(() => {
    if (historyViewMode !== 'rail') {
      return
    }
    if (!selectedRailItem) {
      setRailPreviewSelectionId('')
      return
    }
    if (!historyRailItems.some((item) => item.id === railPreviewSelectionId)) {
      setRailPreviewSelectionId(selectedRailItem.id)
    }
  }, [historyViewMode, railPreviewSelectionId, selectedRailItem, historyRailItems])

  const stopHistoryThumbPlayback = (element: HTMLVideoElement) => {
    element.pause()
    element.muted = true
    element.dataset.hoverActive = '0'
  }

  const handleVideoCardHoverStart = (event: MouseEvent<HTMLVideoElement>) => {
    const element = event.currentTarget
    element.dataset.hoverActive = '1'
    element.muted = false
    element.volume = 1
    const playAttempt = element.play()
    if (playAttempt) {
      playAttempt.catch(() => {
        if (element.dataset.hoverActive !== '1') {
          return
        }
        element.muted = true
        void element.play().catch(() => {})
      })
    }
  }

  const handleVideoCardHoverEnd = (event: MouseEvent<HTMLVideoElement>) => {
    stopHistoryThumbPlayback(event.currentTarget)
  }

  const handleHistoryCardPointerLeave = (event: MouseEvent<HTMLDivElement>) => {
    const element = event.currentTarget.querySelector('video')
    if (!element) return
    stopHistoryThumbPlayback(element)
  }

  useEffect(() => {
    const stopAllHistoryPreviews = () => {
      document.querySelectorAll('.lab-history-thumb').forEach((node) => {
        if (node instanceof HTMLVideoElement) {
          stopHistoryThumbPlayback(node)
        }
      })
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopAllHistoryPreviews()
      }
    }

    window.addEventListener('blur', stopAllHistoryPreviews)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('blur', stopAllHistoryPreviews)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  const handleVideoThumbReady = (event: SyntheticEvent<HTMLVideoElement>) => {
    const element = event.currentTarget
    if (Number.isFinite(element.duration) && element.duration > 0.15 && element.currentTime < 0.08) {
      try {
        element.currentTime = 0.08
      } catch {
        // Ignore seek failures for remote media with restricted ranges.
      }
    }
  }

  const handleTemplateVideoHoverStart = (event: MouseEvent<HTMLVideoElement>) => {
    const element = event.currentTarget
    element.muted = false
    element.volume = 1
    const playAttempt = element.play()
    if (playAttempt) {
      playAttempt.catch(() => {
        // Some browsers may block audio autoplay on hover until user interaction.
      })
    }
  }

  const handleTemplateVideoHoverEnd = (event: MouseEvent<HTMLVideoElement>) => {
    const element = event.currentTarget
    element.pause()
    try {
      element.currentTime = 0
    } catch {
      // Ignore reset failures on remote media.
    }
  }

  const handleCopyVideoRequestJson = async () => {
    const requestPayload = videoDialogState?.details?.requestPayload
    if (!requestPayload) {
      return
    }

    const payloadText = JSON.stringify(requestPayload, null, 2)
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(payloadText)
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = payloadText
        textArea.setAttribute('readonly', 'true')
        textArea.style.position = 'fixed'
        textArea.style.left = '-9999px'
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }
      setIsVideoRequestCopied(true)
    } catch {
      setIsVideoRequestCopied(false)
    }
  }

  useEffect(() => {
    setIsVideoRequestCopied(false)
  }, [videoDialogState?.details?.requestPayload, videoDialogState?.title])

  useEffect(() => {
    const details = videoDialogState?.details
    setIsVideoMetadataEditing(false)
    setIsVideoMetadataSaving(false)
    setVideoMetadataPromptDraft(details?.prompt || '')
    setVideoMetadataRequestJsonDraft(JSON.stringify(details?.requestPayload || {}, null, 2))
  }, [videoDialogState?.details?.historyId, videoDialogState?.title])

  const videoDialogSourceKey = useMemo(() => {
    if (!videoDialogState) return ''
    return videoDialogState.details?.sourceUrl?.trim() || videoDialogState.playbackUrl.trim()
  }, [videoDialogState])

  const visibleCapturedFrames = useMemo(
    () => capturedFrames.filter((frame) => frame.sourceKey === videoDialogSourceKey),
    [capturedFrames, videoDialogSourceKey],
  )

  const pushVideoDialogNotice = useCallback((message: string) => {
    setVideoDialogNotice(message)
    if (videoDialogNoticeTimeoutRef.current) {
      window.clearTimeout(videoDialogNoticeTimeoutRef.current)
    }
    videoDialogNoticeTimeoutRef.current = window.setTimeout(() => {
      setVideoDialogNotice('')
      videoDialogNoticeTimeoutRef.current = null
    }, 2800)
  }, [])

  useEffect(() => {
    setIsVideoDetailsCollapsed(Boolean(videoDialogState?.playbackUrl))
    setIsCapturedFramesVisible(false)
    setVideoDialogNotice('')
    setIsVideoDownloading(false)
    setSavingFrameId('')
  }, [videoDialogState?.playbackUrl, videoDialogState?.title])

  const useTaskForRecovery = useCallback((details?: VideoDialogState['details']) => {
    if (!details?.taskId) return
    setRecoveryTaskId(details.taskId)
    setRecoveryProvider(details.provider)
    setRecoveryModel(details.model)
    setIsRecoveryOpen(true)
    setVideoDialogState(null)
    updateModeState(activeTab.id, (current) => ({
      ...current,
      statusText: `Task ${details.taskId} is ready in Recovery. Click Resume to poll it.`,
    }))
  }, [activeTab.id])

  const saveVideoDialogMetadata = useCallback(async () => {
    const details = videoDialogState?.details
    if (!details?.historyId) {
      pushVideoDialogNotice('This run is not persisted yet, so metadata cannot be saved.')
      return
    }

    let parsedPayload: Record<string, unknown>
    try {
      const parsed = JSON.parse(videoMetadataRequestJsonDraft)
      if (!isRecord(parsed)) {
        pushVideoDialogNotice('Request JSON must be a JSON object.')
        return
      }
      parsedPayload = parsed
    } catch {
      pushVideoDialogNotice('Request JSON is invalid.')
      return
    }

    const nextPrompt = videoMetadataPromptDraft.trim()
    setIsVideoMetadataSaving(true)

    let updatedEntry: GenerationHistoryEntry | null = null
    setHistory((current) => {
      const next = current.map((entry) => {
        if (entry.historyId !== details.historyId) {
          return entry
        }
        const updated: GenerationHistoryEntry = {
          ...entry,
          prompt: nextPrompt,
          requestPayload: parsedPayload,
        }
        updatedEntry = updated
        return updated
      })
      safeSetLocalStorage(LOCAL_HISTORY_STORAGE_KEY, JSON.stringify(next))
      return next
    })

    if (!updatedEntry) {
      setIsVideoMetadataSaving(false)
      pushVideoDialogNotice('Could not find this run in history.')
      return
    }

    try {
      await saveHistoryToFirestore(updatedEntry)
    } catch {
      // Keep local metadata update even if Firestore sync fails.
    }

    setVideoDialogState((current) => {
      if (!current?.details) return current
      return {
        ...current,
        details: {
          ...current.details,
          prompt: nextPrompt,
          requestPayload: parsedPayload,
        },
      }
    })

    setIsVideoMetadataEditing(false)
    setIsVideoMetadataSaving(false)
    pushVideoDialogNotice('Run metadata updated.')
  }, [pushVideoDialogNotice, videoDialogState?.details, videoMetadataPromptDraft, videoMetadataRequestJsonDraft])

  useEffect(() => {
    return () => {
      if (videoDialogNoticeTimeoutRef.current) {
        window.clearTimeout(videoDialogNoticeTimeoutRef.current)
      }
    }
  }, [])

  const triggerBlobDownload = useCallback((blob: Blob, fileName: string) => {
    const objectUrl = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = objectUrl
    anchor.download = fileName
    anchor.rel = 'noopener'
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    window.setTimeout(() => {
      URL.revokeObjectURL(objectUrl)
    }, 1000)
  }, [])

  const triggerUrlDownload = useCallback((url: string, fileName: string) => {
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = fileName
    anchor.rel = 'noopener'
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
  }, [])

  const handleDownloadVideo = useCallback(async () => {
    if (!videoDialogState) return
    setIsVideoDownloading(true)
    try {
      const response = await fetch(videoDialogState.playbackUrl)
      if (!response.ok) {
        throw new Error(`Download failed (${response.status}).`)
      }
      const blob = await response.blob()
      const fileName = buildVideoFileName(videoDialogState.title)
      triggerBlobDownload(blob, fileName)
      pushVideoDialogNotice('Video saved to downloads.')
    } catch (error) {
      pushVideoDialogNotice((error as Error).message || 'Could not save this video.')
    } finally {
      setIsVideoDownloading(false)
    }
  }, [pushVideoDialogNotice, triggerBlobDownload, videoDialogState])

  const handleHistoryCardDownload = useCallback((sourceUrl: string, title: string) => {
    const playbackUrl = getPlaybackUrl(sourceUrl)
    if (!playbackUrl) return
    triggerUrlDownload(playbackUrl, buildVideoFileName(title || 'video'))
  }, [triggerUrlDownload])

  const handleHistoryVideoLoadError = (event: SyntheticEvent<HTMLVideoElement>) => {
    const element = event.currentTarget
    const fallbackPlaybackUrl = element.dataset.fallbackPlaybackUrl || ''
    const currentPlaybackUrl = element.currentSrc || element.src || ''

    if (fallbackPlaybackUrl && currentPlaybackUrl !== fallbackPlaybackUrl) {
      element.src = fallbackPlaybackUrl
      element.load()
      return
    }

    stopHistoryThumbPlayback(element)
  }

  const captureCurrentFrame = useCallback(() => {
    if (!videoDialogState || !videoDialogSourceKey) return
    const video = videoDialogPlayerRef.current
    if (!video || !video.videoWidth || !video.videoHeight) {
      pushVideoDialogNotice('Frame capture is ready after video metadata loads.')
      return
    }

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const context = canvas.getContext('2d')
    if (!context) {
      pushVideoDialogNotice('Could not capture frame.')
      return
    }

    try {
      context.drawImage(video, 0, 0, canvas.width, canvas.height)
      const imageDataUrl = canvas.toDataURL('image/jpeg', 0.92)
      const nextFrame: CapturedVideoFrame = {
        id: `frame-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        sourceKey: videoDialogSourceKey,
        imageDataUrl,
        capturedAt: Date.now(),
        videoTimeSec: video.currentTime || 0,
        width: canvas.width,
        height: canvas.height,
      }
      setCapturedFrames((current) => {
        const next = [nextFrame, ...current].slice(0, 240)
        writeCapturedVideoFrames(next)
        return next
      })
      setIsCapturedFramesVisible(true)
      pushVideoDialogNotice(`Captured frame at ${formatVideoTime(nextFrame.videoTimeSec)}.`)
    } catch {
      pushVideoDialogNotice('Capture failed. Try using the proxied playback URL.')
    }
  }, [pushVideoDialogNotice, videoDialogSourceKey, videoDialogState])

  const handleDownloadFrame = useCallback(async (frame: CapturedVideoFrame) => {
    try {
      const blob = await dataUrlToBlob(frame.imageDataUrl)
      triggerBlobDownload(blob, buildFrameFileName(frame.videoTimeSec))
      pushVideoDialogNotice('Frame saved to downloads.')
    } catch {
      pushVideoDialogNotice('Could not download frame.')
    }
  }, [pushVideoDialogNotice, triggerBlobDownload])

  const handleSaveFrameToLibrary = useCallback(async (frame: CapturedVideoFrame) => {
    setSavingFrameId(frame.id)
    try {
      const blob = await dataUrlToBlob(frame.imageDataUrl)
      const storagePath = `toorgen-lab/frames/${Date.now()}-${frame.id}.jpg`
      const firebaseUrl = await uploadBlobToFirebase(blob, storagePath, 'image/jpeg')
      appendToMediaLibrary('image', firebaseUrl, `frame ${formatVideoTime(frame.videoTimeSec)}`)
      pushVideoDialogNotice('Frame added to library.')
    } catch {
      pushVideoDialogNotice('Could not save frame to library.')
    } finally {
      setSavingFrameId('')
    }
  }, [pushVideoDialogNotice])

  const updatePromptMentionState = (nextText: string, cursor: number | null) => {
    if (cursor === null || cursor < 0) {
      setPromptMentionQuery(null)
      return
    }
    setPromptMentionQuery(extractMentionQuery(nextText, cursor))
  }

  const handlePromptChange = (nextPrompt: string, cursor: number | null) => {
    updateModeState(activeTab.id, (current) => ({
      ...current,
      prompt: nextPrompt,
    }))
    updatePromptMentionState(nextPrompt, cursor)
  }

  const handleSelectPromptMention = (mentionKey: string) => {
    const target = promptTextareaRef.current
    if (!target) return
    const cursor = getCaretOffset(target)
    const nextPrompt = insertMention(activeState.prompt, cursor, mentionKey)
    updateModeState(activeTab.id, (current) => ({
      ...current,
      prompt: nextPrompt,
    }))
    setPromptMentionQuery(null)
    
    // We delay slightly to let ContentEditable re-render new prompt HTML before setting cursor
    requestAnimationFrame(() => {
      if (!promptTextareaRef.current) return
      const nextCursor = cursor + mentionKey.length + 1
      promptTextareaRef.current.focus()
      setCaretOffset(promptTextareaRef.current, nextCursor)
    })
  }

  const handlePromptMentionKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (promptMentionOptions.length === 0) return

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActivePromptMentionIndex((current) => (current + 1) % promptMentionOptions.length)
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActivePromptMentionIndex((current) => (current - 1 + promptMentionOptions.length) % promptMentionOptions.length)
      return
    }

    if (event.key === 'Enter') {
      event.preventDefault()
      const activeOption = promptMentionOptions[activePromptMentionIndex] || promptMentionOptions[0]
      if (activeOption) {
        handleSelectPromptMention(activeOption.mentionKey)
      }
      return
    }

    if (event.key === 'Escape') {
      event.preventDefault()
      setPromptMentionQuery(null)
    }
  }

  return (
    <div className="lab-page">
      {/* Hidden preloader keeps reference images in browser cache regardless of composerRefMode */}
      <div className="lab-ref-preloader" aria-hidden="true">
        {cachedReferenceImageUrls.map((url) => (
          <img key={url} src={url} alt="" loading="eager" decoding="async" />
        ))}
      </div>
      <div
        ref={refHoverFixedRef}
        className={`lab-ref-hover-fixed${refHoverPreview ? ' is-visible' : ''}`}
        aria-hidden="true"
      >
        {refHoverPreview?.kind === 'video' ? (
          <video
            src={getPlaybackUrl(refHoverPreview.url)}
            className="lab-ref-hover-fixed-media"
            muted
            playsInline
            preload="metadata"
            loop
            autoPlay
          />
        ) : refHoverPreview ? (
          <img src={refHoverPreview.url} alt="" className="lab-ref-hover-fixed-media" />
        ) : null}
      </div>
      {videoDialogState && (
        <div className="lab-video-dialog-backdrop" onClick={() => setVideoDialogState(null)}>
          <div className="lab-video-dialog" onClick={(event) => event.stopPropagation()}>
            <div className="lab-video-dialog-head">
              <div className="lab-card-title">{videoDialogState.title}</div>
              <div className="lab-inline-actions lab-inline-actions--compact">
                <button
                  type="button"
                  className="lab-secondary-btn"
                  onClick={() => setIsVideoDetailsCollapsed((current) => !current)}
                >
                  {isVideoDetailsCollapsed ? 'Show Details' : 'Hide Details'}
                </button>
                <button
                  type="button"
                  className="lab-secondary-btn"
                  onClick={() => { void handleDownloadVideo() }}
                  disabled={!videoDialogState.playbackUrl || isVideoDownloading}
                >
                  {isVideoDownloading ? 'Saving...' : 'Save Video'}
                </button>
                <button
                  type="button"
                  className="lab-secondary-btn"
                  onClick={captureCurrentFrame}
                  disabled={!videoDialogState.playbackUrl}
                >
                  Grab Frame
                </button>
                <button
                  type="button"
                  className="lab-secondary-btn"
                  onClick={() => setIsCapturedFramesVisible((current) => !current)}
                  disabled={!videoDialogState.playbackUrl}
                >
                  {isCapturedFramesVisible ? 'Hide Frames' : `Show Frames (${visibleCapturedFrames.length})`}
                </button>
                <button
                  type="button"
                  className="lab-secondary-btn"
                  onClick={() => setVideoDialogState(null)}
                >
                  Close
                </button>
              </div>
            </div>
            {videoDialogNotice && (
              <div className="lab-video-action-notice" role="status">{videoDialogNotice}</div>
            )}
            <div className={`lab-video-dialog-body${isVideoDetailsCollapsed || !videoDialogState.details ? ' is-details-hidden' : ''}`}>
              <div className="lab-video-preview-column">
                {videoDialogState.playbackUrl ? (
                  <video
                    ref={videoDialogPlayerRef}
                    className="lab-video-dialog-player"
                    src={videoDialogState.playbackUrl}
                    controls
                    autoPlay
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <div className="lab-video-dialog-player lab-video-dialog-player--empty">
                    No playable preview yet. Open details and use Task ID recovery.
                  </div>
                )}
                {isCapturedFramesVisible && (
                  <div className="lab-captured-frames-panel">
                    <div className="lab-captured-frames-head">
                      <strong>Captured Frames</strong>
                      <span className="lab-inline-note">{visibleCapturedFrames.length} saved</span>
                    </div>
                    <div className="lab-captured-frames-grid">
                      {visibleCapturedFrames.length === 0 && (
                        <div className="lab-captured-frames-empty">No frames captured for this video yet.</div>
                      )}
                      {visibleCapturedFrames.map((frame) => (
                        <div key={frame.id} className="lab-captured-frame-card">
                          <img
                            src={frame.imageDataUrl}
                            alt={`Frame at ${formatVideoTime(frame.videoTimeSec)}`}
                            className="lab-captured-frame-image"
                          />
                          <div className="lab-captured-frame-meta">{formatVideoTime(frame.videoTimeSec)}</div>
                          <div className="lab-captured-frame-actions">
                            <button
                              type="button"
                              className="lab-secondary-btn"
                              onClick={() => { void handleDownloadFrame(frame) }}
                            >
                              Download
                            </button>
                            <button
                              type="button"
                              className="lab-primary-btn"
                              onClick={() => { void handleSaveFrameToLibrary(frame) }}
                              disabled={savingFrameId === frame.id}
                            >
                              {savingFrameId === frame.id ? 'Saving...' : 'To Library'}
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {videoDialogState.details && !isVideoDetailsCollapsed && (
                <div className="lab-video-details-panel">
                  <div><strong>Provider:</strong> {videoDialogState.details.provider}</div>
                  <div><strong>Model:</strong> {videoDialogState.details.model}</div>
                  <div><strong>Time:</strong> {formatTimestamp(videoDialogState.details.timestamp)}</div>
                  <div><strong>Submitted:</strong> {videoDialogState.details.submittedAt ? formatTimestamp(videoDialogState.details.submittedAt) : 'N/A'}</div>
                  <div><strong>Received:</strong> {videoDialogState.details.receivedAt ? formatTimestamp(videoDialogState.details.receivedAt) : 'N/A'}</div>
                  <div><strong>Generation Took:</strong> {typeof videoDialogState.details.generationMs === 'number' && videoDialogState.details.generationMs > 0 ? `${(videoDialogState.details.generationMs / 1000).toFixed(1)}s` : 'N/A'}</div>
                  <div><strong>Dimensions:</strong> {videoDialogState.details.outputDimensions || 'N/A'}</div>
                  <div><strong>Resolution:</strong> {videoDialogState.details.resolution || 'N/A'}</div>
                  <div><strong>Aspect Ratio:</strong> {videoDialogState.details.ratio || 'N/A'}</div>
                  <div><strong>Duration:</strong> {typeof videoDialogState.details.durationSec === 'number' ? `${videoDialogState.details.durationSec}s` : 'N/A'}</div>
                  <div><strong>Audio:</strong> {typeof videoDialogState.details.generateAudio === 'boolean' ? (videoDialogState.details.generateAudio ? 'Enabled' : 'Disabled') : 'N/A'}</div>
                  <div>
                    <strong>Task ID:</strong> {videoDialogState.details.taskId || 'N/A'}
                    {videoDialogState.details.taskId && (
                      <button
                        type="button"
                        className="lab-secondary-btn lab-taskid-recovery-btn"
                        onClick={() => useTaskForRecovery(videoDialogState.details)}
                      >
                        Use For Recovery
                      </button>
                    )}
                  </div>
                  <div><strong>Source URL:</strong> {videoDialogState.details.sourceUrl}</div>
                  <div className="lab-video-meta-editor-row">
                    <div className="lab-video-meta-editor-head">
                      <strong>Prompt</strong>
                      {videoDialogState.details.historyId && !isVideoMetadataEditing && (
                        <button
                          type="button"
                          className="lab-secondary-btn"
                          onClick={() => setIsVideoMetadataEditing(true)}
                        >
                          Edit
                        </button>
                      )}
                    </div>
                    {isVideoMetadataEditing ? (
                      <textarea
                        className="lab-textarea lab-video-meta-prompt-editor"
                        value={videoMetadataPromptDraft}
                        onChange={(event) => setVideoMetadataPromptDraft(event.target.value)}
                        placeholder="Prompt used for this run"
                      />
                    ) : (
                      <div className="lab-video-meta-prompt-copy">{videoDialogState.details.prompt || 'N/A'}</div>
                    )}
                  </div>
                  <div><strong>Workflow:</strong> {videoDialogState.details.tabLabel || 'N/A'}</div>
                  <div><strong>Endpoint:</strong> {videoDialogState.details.requestEndpoint || 'N/A'}</div>
                  {(() => {
                    const payload = videoDialogState.details.requestPayload
                    const refImages: string[] = Array.isArray(payload?.reference_images) ? (payload.reference_images as unknown[]).filter((u): u is string => typeof u === 'string' && u.startsWith('http')) : []
                    const refVideos: string[] = Array.isArray(payload?.reference_videos) ? (payload.reference_videos as unknown[]).filter((u): u is string => typeof u === 'string' && u.startsWith('http')) : []
                    const imageUrl: string | undefined = typeof payload?.image === 'string' && payload.image.startsWith('http') ? payload.image as string : undefined
                    const videoUrl: string | undefined = typeof payload?.video === 'string' && payload.video.startsWith('http') ? payload.video as string : undefined
                    if (imageUrl) refImages.push(imageUrl)
                    if (videoUrl) refVideos.push(videoUrl)
                    const modelStr = (videoDialogState.details.model || '').toLowerCase()
                    const isImageToVideo = modelStr.includes('image-to-video') || modelStr.includes('reference-to-video')
                    const wrongAssets = isImageToVideo && refVideos.length > 0 && refImages.length === 0
                    if (refImages.length === 0 && refVideos.length === 0) return null
                    return (
                      <div className="lab-video-ref-rail-section">
                        <div className="lab-video-ref-rail-head">
                          <strong>Reference Assets</strong>
                          {wrongAssets && (
                            <span className="lab-video-ref-rail-warn">⚠ This model expects images, not videos — check your references to avoid wasting credits.</span>
                          )}
                        </div>
                        <div className="lab-video-ref-rail">
                          {refImages.map((url) => (
                            <div key={url} className="lab-video-ref-rail-item">
                              <img src={url} alt="Reference" className="lab-video-ref-rail-thumb" />
                              <span className="lab-video-ref-rail-kind">image</span>
                            </div>
                          ))}
                          {refVideos.map((url) => (
                            <div key={url} className="lab-video-ref-rail-item">
                              <video src={getPlaybackUrl(url)} className="lab-video-ref-rail-thumb" muted playsInline preload="metadata" />
                              <span className="lab-video-ref-rail-kind">video</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })()}
                  <details className="lab-details lab-details--full" open>
                    <summary className="lab-details-summary-row">
                      <span>Request JSON</span>
                    </summary>
                    <div className="lab-inline-actions lab-inline-actions--compact">
                      <button
                        type="button"
                        className="lab-secondary-btn"
                        onClick={handleCopyVideoRequestJson}
                      >
                        {isVideoRequestCopied ? 'Copied' : 'Copy'}
                      </button>
                      {videoDialogState.details.historyId && !isVideoMetadataEditing && (
                        <button
                          type="button"
                          className="lab-secondary-btn"
                          onClick={() => setIsVideoMetadataEditing(true)}
                        >
                          Edit JSON
                        </button>
                      )}
                      {isVideoMetadataEditing && (
                        <>
                          <button
                            type="button"
                            className="lab-secondary-btn"
                            onClick={() => {
                              setIsVideoMetadataEditing(false)
                              setVideoMetadataPromptDraft(videoDialogState.details?.prompt || '')
                              setVideoMetadataRequestJsonDraft(JSON.stringify(videoDialogState.details?.requestPayload || {}, null, 2))
                            }}
                            disabled={isVideoMetadataSaving}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="lab-primary-btn"
                            onClick={() => { void saveVideoDialogMetadata() }}
                            disabled={isVideoMetadataSaving}
                          >
                            {isVideoMetadataSaving ? 'Saving...' : 'Save Metadata'}
                          </button>
                        </>
                      )}
                    </div>
                    {isVideoMetadataEditing ? (
                      <textarea
                        className="lab-textarea lab-video-json-editor"
                        value={videoMetadataRequestJsonDraft}
                        onChange={(event) => setVideoMetadataRequestJsonDraft(event.target.value)}
                        aria-label="Editable request JSON"
                        placeholder="Edit request JSON metadata"
                        spellCheck={false}
                      />
                    ) : (
                      <pre className="lab-preview">{JSON.stringify(videoDialogState.details.requestPayload, null, 2)}</pre>
                    )}
                  </details>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {isBackendDialogOpen && (
        <div className="lab-backend-dialog" role="alertdialog" aria-live="assertive" aria-label="Backend server warning">
          <div className="lab-backend-dialog-title">Back end server is not working</div>
          <div className="lab-backend-dialog-copy">Please run the back end server proxy, then try again.</div>
          <div className="lab-inline-actions lab-inline-actions--compact">
            <button
              type="button"
              className="lab-secondary-btn"
              onClick={() => setIsBackendDialogOpen(false)}
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {isReferenceLibraryDialogOpen && (
        <div className="lab-library-dialog-backdrop" role="dialog" aria-modal="true" aria-label="Reference library" onClick={() => setIsReferenceLibraryDialogOpen(false)}>
          <div className="lab-library-dialog" onClick={(event) => event.stopPropagation()}>
            <div className="lab-library-dialog-head">
              <strong>Reference Library</strong>
              <div className="lab-inline-actions">
                <span className="lab-inline-note">{selectedReferenceLibraryUrls.length} selected</span>
                <button type="button" className="lab-secondary-btn" onClick={() => referenceLibraryUploadInputRef.current?.click()}>
                  {isReferenceLibraryUploading ? 'Uploading...' : 'Upload'}
                </button>
                <button type="button" className="lab-secondary-btn" onClick={() => setIsReferenceLibraryDialogOpen(false)}>
                  Close
                </button>
              </div>
            </div>

            <div className="lab-inline-actions">
              <button type="button" className={`lab-secondary-btn${referenceLibraryFilter === 'all' ? ' lab-view-mode-btn--active' : ''}`} onClick={() => setReferenceLibraryFilter('all')}>
                All
              </button>
              <button type="button" className={`lab-secondary-btn${referenceLibraryFilter === 'image' ? ' lab-view-mode-btn--active' : ''}`} onClick={() => setReferenceLibraryFilter('image')}>
                Images
              </button>
              <button type="button" className={`lab-secondary-btn${referenceLibraryFilter === 'video' ? ' lab-view-mode-btn--active' : ''}`} onClick={() => setReferenceLibraryFilter('video')}>
                Videos
              </button>
            </div>

            <input
              className="lab-input"
              value={referenceLibraryQuery}
              placeholder="Search reference library"
              onChange={(event) => setReferenceLibraryQuery(event.target.value)}
              aria-label="Search reference library"
            />

            <div className="lab-library-grid">
              <button type="button" className="lab-library-plus-card" onClick={() => referenceLibraryUploadInputRef.current?.click()}>
                +
              </button>
              {filteredReferenceLibrary.map((item) => {
                const isSelected = selectedReferenceLibraryUrls.includes(item.url)
                const isVideo = item.kind === 'video'
                return (
                  <div
                    key={item.id}
                    className={`lab-library-item${isSelected ? ' is-selected' : ''}${isVideo ? ' is-video' : ''}`}
                  >
                    <button
                      type="button"
                      className="lab-library-item-select"
                      onClick={() => toggleReferenceLibrarySelection(item.url)}
                    >
                      {isVideo ? (
                        <>
                          <video
                            src={getPlaybackUrl(item.url)}
                            className="lab-library-thumb"
                            muted
                            playsInline
                            preload="metadata"
                            onLoadedMetadata={handleVideoThumbReady}
                            onMouseEnter={handleVideoCardHoverStart}
                            onMouseLeave={handleVideoCardHoverEnd}
                          />
                          <span className="lab-library-play-badge" aria-hidden="true">▶</span>
                        </>
                      ) : (
                        <img src={item.url} alt={item.name} className="lab-library-thumb" />
                      )}
                    </button>
                    <input
                      className="lab-library-item-name"
                      value={item.name}
                      onChange={(event) => renameMediaLibraryItem(item.id, event.target.value)}
                      aria-label="Asset name"
                    />
                  </div>
                )
              })}
            </div>

            <input
              ref={referenceLibraryUploadInputRef}
              className="lab-hidden-file-input"
              type="file"
              multiple
              aria-label="Upload references"
              title="Upload references"
              accept="image/*,video/*"
              onChange={(event) => {
                void handleReferenceLibraryUpload(event.target.files)
                event.target.value = ''
              }}
            />

            <div className="lab-library-dialog-footer">
              <button type="button" className="lab-secondary-btn" onClick={() => setIsReferenceLibraryDialogOpen(false)}>
                Cancel
              </button>
              <button type="button" className="lab-primary-btn" onClick={applyReferenceLibrarySelection}>
                Confirm {selectedReferenceLibraryUrls.length > 0 ? `(${selectedReferenceLibraryUrls.length})` : ''}
              </button>
            </div>
          </div>
        </div>
      )}

      {isPromptTemplateDialogOpen && (
        <div className="lab-video-dialog-backdrop" role="dialog" aria-modal="true" aria-label="Prompt template" onClick={() => setIsPromptTemplateDialogOpen(false)}>
          <div className="lab-quick-dialog" onClick={(event) => event.stopPropagation()}>
            <div className="lab-quick-dialog-head">
              <strong>Prompt Template</strong>
              <button type="button" className="lab-secondary-btn" onClick={() => setIsPromptTemplateDialogOpen(false)}>
                Close
              </button>
            </div>
            <div className="lab-details-copy">{activeTab.promptTemplate}</div>
          </div>
        </div>
      )}

      {isPlaylistOpen && (
        <MiniVideoPlaylist
          onClose={() => setIsPlaylistOpen(false)}
          libraryVideos={mediaLibrary
            .filter((item) => item.kind === 'video')
            .map((item) => ({ id: item.id, url: item.url, label: item.name || 'Library video', source: 'library' as const }))}
          generatedVideos={history
            .filter((entry) => entry.firebaseVideoUrl || entry.resultUrl)
            .slice(0, 40)
            .map((entry) => ({
              id: entry.historyId,
              url: entry.firebaseVideoUrl || entry.resultUrl,
              label: entry.prompt ? entry.prompt.slice(0, 48) : entry.tabLabel || 'Generated video',
              source: 'generated' as const,
            }))}
        />
      )}

      {isDirectPresetDialogOpen && (() => {
        const selectedPreset = directRequestPresets.find((p) => p.id === selectedPresetId) || directRequestPresets[0] || null
        const presetAssets = selectedPreset ? extractPresetAssetThumbs(selectedPreset.json) : []
        return (
          <div className="lab-video-dialog-backdrop" role="dialog" aria-modal="true" aria-label="Load template" onClick={() => setIsDirectPresetDialogOpen(false)}>
            <div className="lab-preset-dialog" onClick={(event) => event.stopPropagation()}>
              <div className="lab-quick-dialog-head">
                <strong>Load Template</strong>
                <button type="button" className="lab-secondary-btn" onClick={() => setIsDirectPresetDialogOpen(false)}>
                  Close
                </button>
              </div>
              {directRequestPresets.length === 0 ? (
                <div className="lab-inline-note">No saved templates yet.</div>
              ) : (
                <div className="lab-preset-dialog-body">
                  <div className="lab-preset-dialog-list">
                    {directRequestPresets.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        className={`lab-preset-list-item${(selectedPreset?.id === preset.id) ? ' lab-preset-list-item--active' : ''}`}
                        onClick={() => setSelectedPresetId(preset.id)}
                      >
                        <span className="lab-direct-preset-name">{preset.name}</span>
                        <span className="lab-direct-preset-meta">{new Date(preset.createdAt).toLocaleDateString()}</span>
                      </button>
                    ))}
                  </div>
                  <div className="lab-preset-dialog-preview">
                    {selectedPreset ? (
                      <>
                        <pre className="lab-preset-preview-code">{selectedPreset.json}</pre>
                        <div className="lab-preset-assets-rail" role="region" aria-label="Template assets">
                          {presetAssets.length === 0 ? (
                            <div className="lab-preset-assets-empty">No reference assets found in this template.</div>
                          ) : (
                            presetAssets.map((asset) => (
                              <div key={asset.id} className={`lab-preset-asset-thumb${asset.kind === 'video' ? ' is-video' : ''}`}>
                                {asset.kind === 'video' ? (
                                  <>
                                    <video
                                      src={getPlaybackUrl(asset.url)}
                                      className="lab-preset-asset-media"
                                      preload="metadata"
                                      playsInline
                                      onLoadedMetadata={handleVideoThumbReady}
                                      onMouseEnter={handleTemplateVideoHoverStart}
                                      onMouseLeave={handleTemplateVideoHoverEnd}
                                    />
                                    <span className="lab-preset-asset-badge" aria-hidden="true">VIDEO</span>
                                  </>
                                ) : (
                                  <img src={asset.url} alt="Template reference" className="lab-preset-asset-media" />
                                )}
                              </div>
                            ))
                          )}
                        </div>
                        <div className="lab-preset-dialog-actions">
                          <button
                            type="button"
                            className="lab-primary-btn"
                            onClick={() => handleLoadDirectPreset(selectedPreset)}
                          >
                            Load
                          </button>
                          <button
                            type="button"
                            className="lab-secondary-btn"
                            onClick={() => handleRenameDirectPreset(selectedPreset)}
                          >
                            Rename
                          </button>
                          <button
                            type="button"
                            className="lab-secondary-btn"
                            onClick={() => handleDeleteDirectPreset(selectedPreset)}
                          >
                            Clear
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="lab-inline-note">Select a template to preview.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {isWorkflowPickerOpen && workflowPickerPosition && (
        <div
          className="lab-workflow-picker-popover"
          ref={workflowPickerRef}
          role="dialog"
          aria-modal="false"
          aria-label="Workflow picker"
          style={{ top: `${workflowPickerPosition.top}px`, left: `${workflowPickerPosition.left}px` }}
        >
          <div className="lab-workflow-picker-popover-head">
            <strong>Select Workflow</strong>
            <button type="button" className="lab-secondary-btn" onClick={() => setIsWorkflowPickerOpen(false)}>
              Close
            </button>
          </div>
          <input
            className="lab-input"
            value={workflowSearch}
            placeholder="Search by name or group"
            onChange={(event) => setWorkflowSearch(event.target.value)}
            aria-label="Search workflows"
          />
          <div className="lab-workflow-picker-grid">
            {filteredTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={`lab-workflow-card lab-workflow-card--tile${tab.id === activeTab.id ? ' lab-workflow-card--active' : ''}`}
                onClick={() => {
                  switchComposerWorkflow(tab.id)
                  setIsWorkflowPickerOpen(false)
                }}
              >
                <span className="lab-workflow-icon" aria-hidden="true">{WORKFLOW_GROUP_ICONS[tab.group] || '🧩'}</span>
                <span className="lab-workflow-label">{tab.label}</span>
                <span className="lab-history-meta">{tab.group}</span>
              </button>
            ))}
          </div>
          <div className="lab-workflow-picker-options">
            <div className="lab-workflow-picker-options-head">
              <strong>Workflow Options</strong>
              <label className="lab-reference-strict-toggle">
                <input
                  type="checkbox"
                  checked={activeState.strictReferences}
                  onChange={(event) => {
                    const isStrict = event.target.checked
                    updateModeState(activeTab.id, (current) => ({
                      ...current,
                      strictReferences: isStrict,
                      statusText: isStrict
                        ? 'Strict references enabled: API prompt will enforce exact style/mood matching.'
                        : '',
                    }))
                  }}
                />
                <span>Strict refs</span>
              </label>
            </div>
            {(activeTab.requestMode === 'reference-to-video' || activeTab.requestMode === 'video-extension' || activeTab.requestMode === 'image-to-video') ? (
              <>
                <div className="lab-video-options-panel" role="group" aria-label="Video workflow options">
                  {VIDEO_WORKFLOW_OPTIONS.map((option) => {
                    const isChecked = activeState.selectedVideoOptionIds.includes(option.id)
                    const availability = videoOptionAvailability[option.id]
                    const isDisabled = !availability.enabled
                    return (
                      <label
                        key={option.id}
                        className={`lab-video-option-chip${isDisabled ? ' is-disabled' : ''}`}
                        title={availability.reason}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          disabled={isDisabled}
                          onChange={(event) => {
                            const checked = event.target.checked
                            updateModeState(activeTab.id, (current) => {
                              const existing = current.selectedVideoOptionIds || []
                              const nextIds = checked
                                ? Array.from(new Set([...existing, option.id]))
                                : existing.filter((id) => id !== option.id)
                              return {
                                ...current,
                                selectedVideoOptionIds: nextIds,
                              }
                            })
                          }}
                        />
                        <span>{option.label}</span>
                        {availability.recommended && !isChecked && !isDisabled && (
                          <span className="lab-video-option-reco">Suggested</span>
                        )}
                      </label>
                    )
                  })}
                </div>
                <div className="lab-video-option-presets" role="group" aria-label="Video option presets">
                  {VIDEO_OPTION_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      className="lab-video-option-preset-btn"
                      onClick={() => {
                        const enabledIds = preset.optionIds.filter((id) => videoOptionAvailability[id].enabled)
                        updateModeState(activeTab.id, (current) => ({
                          ...current,
                          selectedVideoOptionIds: Array.from(new Set([...current.selectedVideoOptionIds, ...enabledIds])),
                          statusText: enabledIds.length > 0
                            ? `${preset.label} applied (${enabledIds.length} option${enabledIds.length === 1 ? '' : 's'}).`
                            : `${preset.label} requires additional references to enable its options.`,
                        }))
                      }}
                    >
                      {preset.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    className="lab-video-option-preset-btn"
                    onClick={() => {
                      updateModeState(activeTab.id, (current) => ({
                        ...current,
                        selectedVideoOptionIds: [],
                        statusText: 'Video workflow options cleared.',
                      }))
                    }}
                  >
                    Clear Options
                  </button>
                </div>
              </>
            ) : (
              <div className="lab-inline-note">These options apply to video/reference workflows.</div>
            )}
          </div>
        </div>
      )}

      <div className="lab-toolbar">
        <div className="lab-toolbar-head">
          <div>
            <div className="lab-title-row">
              <h1 className="lab-title">ToorGen Prompt Lab</h1>
              <div className="lab-toolbar-filters">
                <button
                  type="button"
                  className="lab-secondary-btn"
                  data-workflow-picker-trigger="true"
                  disabled={!hasConfiguredWorkflows}
                  onClick={(event) => openWorkflowPicker('text', event.currentTarget)}
                >
                  Text
                </button>
                <button
                  type="button"
                  className="lab-secondary-btn"
                  data-workflow-picker-trigger="true"
                  disabled={!hasConfiguredWorkflows}
                  onClick={(event) => openWorkflowPicker('video', event.currentTarget)}
                >
                  Video
                </button>
                <button
                  type="button"
                  className="lab-secondary-btn"
                  data-workflow-picker-trigger="true"
                  disabled={!hasConfiguredWorkflows}
                  onClick={(event) => openWorkflowPicker('image', event.currentTarget)}
                >
                  Image
                </button>
                <button
                  type="button"
                  className={`lab-secondary-btn${isDirectSubmitPanelVisible ? ' lab-view-mode-btn--active' : ''}`}
                  title="Toggle Direct API submit panel"
                  aria-label="Toggle Direct API submit panel"
                  onClick={() => setIsDirectSubmitPanelVisible((current) => !current)}
                >
                  Direct submit to API
                </button>
              </div>
            </div>
            <p className="lab-subtitle">
              {hasConfiguredWorkflows
                ? 'Pick a workflow and build each run from the bottom workflow bar.'
                : 'No workflows configured yet. We will add them one by one.'}
            </p>
          </div>
        </div>

        {!isBackendAvailable && (
          <div className="lab-backend-notice" role="status" aria-live="polite">
            <span className="lab-backend-notice-dot" aria-hidden="true">●</span>
            <span>{backendNotice || 'Back end server is not working. Please run it.'}</span>
          </div>
        )}

      </div>

      <div
        className={`lab-layout${isDirectSubmitPanelVisible ? '' : ' lab-layout--direct-hidden'}`}
        ref={labLayoutRef}
      >
        <main className="lab-main">
          <section className="lab-card">
            <div className="lab-card-head">
              <div>
                <h3 className="lab-card-title">Generated Runs</h3>
                <div className="lab-inline-note">{activeTab.label || 'No workflows configured.'}</div>
              </div>
              <div className="lab-inline-actions">
                <button
                  type="button"
                  className={`lab-secondary-btn${historyViewMode === 'cards' ? ' lab-view-mode-btn--active' : ''}`}
                  onClick={() => setHistoryViewMode('cards')}
                >
                  Large Cards
                </button>
                <button
                  type="button"
                  className={`lab-secondary-btn${historyViewMode === 'rail' ? ' lab-view-mode-btn--active' : ''}`}
                  onClick={() => setHistoryViewMode('rail')}
                >
                  Bottom Rail
                </button>
                <button
                  type="button"
                  className="lab-secondary-btn"
                  onClick={() => void handleRefreshGenerations()}
                  disabled={isRefreshingRuns}
                >
                  {isRefreshingRuns ? 'Refreshing...' : 'Refresh'}
                </button>
                <div className="lab-sync-badge">{authUid ? 'Firebase on' : 'Local only'}</div>
                <button
                  type="button"
                  className="lab-secondary-btn"
                  onClick={() => setIsPlaylistOpen(true)}
                >
                  Playlist
                </button>
                <button
                  type="button"
                  className="lab-secondary-btn"
                  onClick={() => setIsRecoveryOpen((v) => !v)}
                >
                  {isRecoveryOpen ? 'Hide Recovery' : 'Recover Video'}
                </button>
              </div>
            </div>

            {isRecoveryOpen && (
              <div className="lab-recovery-panel">
                <div className="lab-recovery-row">
                  <input
                    className="lab-input lab-recovery-input"
                    type="text"
                    placeholder="Task ID (e.g. 7496346…)"
                    value={recoveryTaskId}
                    onChange={(e) => setRecoveryTaskId(e.target.value)}
                  />
                  <select
                    className="lab-select"
                    value={recoveryProvider}
                    onChange={(e) => setRecoveryProvider(e.target.value as ProviderId)}
                    aria-label="Provider"
                  >
                    <option value="atlas">Atlas / Seedance</option>
                    <option value="byteplus">BytePlus</option>
                  </select>
                  <input
                    className="lab-input lab-recovery-input"
                    type="text"
                    placeholder="Model (leave blank for default)"
                    value={recoveryModel}
                    onChange={(e) => setRecoveryModel(e.target.value)}
                  />
                  <button
                    type="button"
                    className="lab-primary-btn"
                    disabled={!recoveryTaskId.trim()}
                    onClick={() => {
                      const tid = recoveryTaskId.trim()
                      if (!tid) return
                      const defaultModel = recoveryProvider === 'atlas'
                        ? 'bytedance/seedance-2.0/text-to-video'
                        : selectedModel
                      const task: PersistedPendingTask = {
                        requestId: `manual-recovery-${Date.now()}`,
                        taskId: tid,
                        tabId: activeTab.id,
                        provider: recoveryProvider,
                        model: recoveryModel.trim() || defaultModel,
                        ratio: activeWorkflowSettings.ratio,
                        duration: activeWorkflowSettings.duration,
                        resolution: activeWorkflowSettings.resolution,
                        createdAt: Date.now(),
                      }
                      writePendingTask(task)
                      void handleResumeTask(task)
                      setRecoveryTaskId('')
                      setIsRecoveryOpen(false)
                    }}
                  >
                    Resume
                  </button>
                </div>
                <div className="lab-recovery-hint">
                  Enter the task ID from a generation that was in progress when the page refreshed. The result will appear here when polling completes.
                </div>
              </div>
            )}

            {activeState.statusText && !/^Submitting generation request|^Generating.../i.test(activeState.statusText) && (
              <div className="lab-status">{activeState.statusText}</div>
            )}

            {historyViewMode === 'cards' && activeTabHistory.length === 0 && !hasActiveOutputPreview && activePendingGenerations.length === 0 && (
              <div className="lab-empty-state">
                No saved runs for this workflow yet.
              </div>
            )}

            {historyViewMode === 'cards' && (
              <div className="lab-history-card-grid">
                {activePendingGenerations.map((pending) => (
                  <article key={pending.id} className="lab-history-video-card lab-history-video-card--pending">
                    <div className="lab-history-video-stage" onMouseLeave={handleHistoryCardPointerLeave}>
                      <div className="lab-history-video-visual lab-history-video-visual--pending">
                        <div className="lab-history-thumb lab-history-thumb--pending">
                          <span className="lab-pending-spinner" aria-hidden="true" />
                        </div>
                        <button
                          type="button"
                          className="lab-pending-stop"
                          onClick={() => {
                            if (!window.confirm('Stop this generation request?')) return
                            cancelFlags.current[pending.id] = true
                            setPendingGenerations((current) => current.filter((entry) => entry.id !== pending.id))
                          }}
                        >
                          Stop
                        </button>
                      </div>
                      <div className="lab-history-overlay-actions" role="group" aria-label="Pending run actions">
                        <button
                          type="button"
                          className="lab-history-overlay-btn"
                          aria-label="Open details"
                          title="Details"
                          onClick={(event) => {
                            event.stopPropagation()
                            openRunDetailsDialog({
                              sourceUrl: '',
                              prompt: activeState.prompt,
                              model: pending.model,
                              provider: pending.provider,
                              timestamp: pending.createdAt,
                              requestEndpoint: pending.provider === 'atlas' ? '/api/seedance/generate' : '/api/byteplus/generate',
                              requestPayload: {},
                              taskId: pending.taskId,
                              tabLabel: activeTab.label,
                              ratio: activeWorkflowSettings.ratio,
                              resolution: activeWorkflowSettings.resolution,
                              durationSec: activeWorkflowSettings.duration,
                              outputDimensions: estimateDimensions(activeWorkflowSettings.ratio, activeWorkflowSettings.resolution),
                              generateAudio: activeWorkflowSettings.generateAudio,
                            }, 'Pending Run Details')
                          }}
                        >
                          <Info size={13} strokeWidth={1.8} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </article>
                ))}

                {hasActiveOutputPreview && !activeOutputAlreadySaved && (
                  <article className="lab-history-video-card lab-history-video-card--output">
                    <div className="lab-history-video-stage" onMouseLeave={handleHistoryCardPointerLeave}>
                      <button type="button" className="lab-history-video-visual" aria-label="Open latest output details" onClick={() => openVideoDialog(activeOutputUrl, {
                        sourceUrl: activeOutputUrl,
                        prompt: activeState.prompt,
                        model: sharedSettings.model,
                        provider: sharedSettings.provider,
                        timestamp: latestTabHistory?.completedAt || Date.now(),
                        requestEndpoint: previewRequest.endpoint,
                        requestPayload: previewRequest.body,
                        ratio: sharedSettings.ratio,
                        resolution: sharedSettings.resolution,
                        durationSec: sharedSettings.duration,
                        outputDimensions: estimateDimensions(sharedSettings.ratio, sharedSettings.resolution),
                        generateAudio: sharedSettings.generateAudio,
                      })}>
                        <video
                          src={outputPlaybackUrl}
                          data-fallback-playback-url=""
                          className="lab-history-thumb"
                          muted
                          playsInline
                          preload="metadata"
                          onMouseEnter={handleVideoCardHoverStart}
                          onMouseLeave={handleVideoCardHoverEnd}
                          onError={handleHistoryVideoLoadError}
                        />
                      </button>
                      <div className="lab-history-overlay-actions" role="group" aria-label="Latest output actions">
                        <button
                          type="button"
                          className="lab-history-overlay-btn"
                          aria-label="Open details"
                          title="Details"
                          onClick={(event) => {
                            event.stopPropagation()
                            openVideoDialog(activeOutputUrl, {
                              sourceUrl: activeOutputUrl,
                              prompt: activeState.prompt,
                              model: sharedSettings.model,
                              provider: sharedSettings.provider,
                              timestamp: latestTabHistory?.completedAt || Date.now(),
                              requestEndpoint: previewRequest.endpoint,
                              requestPayload: previewRequest.body,
                              ratio: sharedSettings.ratio,
                              resolution: sharedSettings.resolution,
                              durationSec: sharedSettings.duration,
                              outputDimensions: estimateDimensions(sharedSettings.ratio, sharedSettings.resolution),
                              generateAudio: sharedSettings.generateAudio,
                            })
                          }}
                        >
                          <Info size={13} strokeWidth={1.8} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          className="lab-history-overlay-btn"
                          aria-label="Download video"
                          title="Download"
                          onClick={(event) => {
                            event.stopPropagation()
                            handleHistoryCardDownload(activeOutputUrl, 'latest-output')
                          }}
                        >
                          <Download size={13} strokeWidth={1.8} aria-hidden="true" />
                        </button>
                      </div>
                    </div>
                  </article>
                )}

                {activeTabHistory.slice(0, historyDisplayLimit).map((entry) => {
                  const sources = resolvePrimaryAndFallbackVideoSources(entry.firebaseVideoUrl || '', entry.resultUrl || '')
                  const displayUrl = sources.primary
                  const hasPlayablePreview = Boolean(displayUrl)
                  const playbackUrl = getPlaybackUrl(displayUrl)
                  const fallbackPlaybackUrl = getPlaybackUrl(sources.fallback)
                  const dialogDetails: NonNullable<VideoDialogState['details']> = {
                    historyId: entry.historyId,
                    sourceUrl: displayUrl,
                    prompt: entry.prompt,
                    model: entry.model,
                    provider: entry.provider,
                    timestamp: entry.completedAt,
                    requestEndpoint: entry.requestEndpoint,
                    requestPayload: entry.requestPayload,
                    tabLabel: entry.tabLabel,
                    ratio: entry.ratio,
                    resolution: entry.resolution,
                    durationSec: entry.duration,
                    outputDimensions: entry.outputDimensions,
                    generateAudio: entry.generateAudio,
                    taskId: entry.taskId,
                    submittedAt: entry.submittedAt,
                    receivedAt: entry.receivedAt,
                    generationMs: entry.generationMs,
                  }
                  return (
                    <article key={entry.historyId} className="lab-history-video-card">
                      <div className="lab-history-video-stage" onMouseLeave={handleHistoryCardPointerLeave}>
                        {hasPlayablePreview ? (
                          <button type="button" className="lab-history-video-visual" aria-label={`Open details for ${formatTimestamp(entry.completedAt)}`} onClick={() => openVideoDialog(displayUrl, dialogDetails)}>
                            <video
                              src={playbackUrl}
                              data-fallback-playback-url={fallbackPlaybackUrl}
                              className="lab-history-thumb"
                              muted
                              playsInline
                              preload="metadata"
                              onMouseEnter={handleVideoCardHoverStart}
                              onMouseLeave={handleVideoCardHoverEnd}
                              onError={handleHistoryVideoLoadError}
                            />
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="lab-history-video-visual"
                            aria-label={`Open run details for ${formatTimestamp(entry.completedAt)}`}
                            onClick={() => openRunDetailsDialog(dialogDetails, 'Run Details')}
                          >
                            <div className="lab-history-thumb lab-history-thumb--pending">
                              <span className="lab-inline-note">No preview</span>
                            </div>
                          </button>
                        )}
                        <div className="lab-history-overlay-actions" role="group" aria-label="Run actions">
                          <button
                            type="button"
                            className="lab-history-overlay-btn"
                            aria-label="Open details"
                            title="Details"
                            onClick={(event) => {
                              event.stopPropagation()
                              if (hasPlayablePreview) {
                                openVideoDialog(displayUrl, dialogDetails)
                                return
                              }
                              openRunDetailsDialog(dialogDetails, 'Run Details')
                            }}
                          >
                            <Info size={13} strokeWidth={1.8} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="lab-history-overlay-btn"
                            aria-label="Load run settings"
                            title="Load"
                            onClick={(event) => {
                              event.stopPropagation()
                              restoreHistoryEntry(entry)
                            }}
                          >
                            <RotateCcw size={13} strokeWidth={1.8} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="lab-history-overlay-btn"
                            aria-label="Load prompt only"
                            title="Prompt only"
                            onClick={(event) => {
                              event.stopPropagation()
                              loadHistoryPromptOnly(entry)
                            }}
                          >
                            <FilePenLine size={13} strokeWidth={1.8} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="lab-history-overlay-btn"
                            aria-label="Download video"
                            title="Download"
                            disabled={!hasPlayablePreview}
                            onClick={(event) => {
                              event.stopPropagation()
                              handleHistoryCardDownload(displayUrl, formatTimestamp(entry.completedAt))
                            }}
                          >
                            <Download size={13} strokeWidth={1.8} aria-hidden="true" />
                          </button>
                        </div>
                        {entry.storageSaveError && (
                          <span className="lab-history-overlay-note" title="Only available remotely">Remote only</span>
                        )}
                      </div>
                    </article>
                  )
                })}
                {activeTabHistory.length > historyDisplayLimit && (
                  <div className="lab-history-load-more">
                    <button
                      type="button"
                      className="lab-secondary-btn"
                      onClick={() => setHistoryDisplayLimit((n) => n + 10)}
                    >
                      Load more ({activeTabHistory.length - historyDisplayLimit} remaining)
                    </button>
                  </div>
                )}
              </div>
            )}

            {historyViewMode === 'rail' && (
              <div className="lab-history-rail-view">
                {selectedRailItem ? (
                  <div className="lab-history-rail-preview">
                    {selectedRailItem.isPending ? (
                      <div className="lab-history-rail-preview-pending">
                        <span className="lab-pending-spinner" aria-hidden="true" />
                      </div>
                    ) : (
                      <video
                        src={getPlaybackUrl(selectedRailItem.url)}
                        className="lab-video"
                        controls
                        playsInline
                        preload="metadata"
                      />
                    )}
                    <div className="lab-history-video-meta">
                      <span className="lab-history-title">{selectedRailItem.title}</span>
                      <span className="lab-history-meta">{selectedRailItem.provider} • {selectedRailItem.model}</span>
                    </div>
                  </div>
                ) : (
                  <div className="lab-empty-state">No runs available for inline preview.</div>
                )}

                <div className="lab-history-thumb-rail">
                  {historyRailItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`lab-history-rail-thumb-btn${selectedRailItem?.id === item.id ? ' is-active' : ''}`}
                      aria-label={item.isPending ? 'Pending generation, click to stop' : `Preview ${item.title}`}
                      onClick={() => {
                        if (item.isPending && window.confirm('Stop this generation request?')) {
                          cancelFlags.current[item.id] = true
                          setPendingGenerations((current) => current.filter((entry) => entry.id !== item.id))
                          return
                        }
                        setRailPreviewSelectionId(item.id)
                      }}
                    >
                      {item.isPending ? (
                        <div className="lab-history-rail-thumb lab-history-rail-thumb--pending">
                          <span className="lab-pending-spinner" aria-hidden="true" />
                        </div>
                      ) : (
                        <video
                          src={getPlaybackUrl(item.url)}
                          className="lab-history-rail-thumb"
                          muted
                          playsInline
                          preload="metadata"
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </section>

        </main>

        {isDirectSubmitPanelVisible && (
          <section className="lab-card lab-direct-panel">
            <div
              className="lab-direct-resizer"
              role="separator"
              aria-label="Resize direct JSON panel"
              aria-orientation="vertical"
              tabIndex={0}
              onMouseDown={handleDirectPanelMouseDown}
              onKeyDown={handleDirectPanelHandleKeyDown}
            >
              <span className="lab-direct-resizer-grip" aria-hidden="true">||</span>
            </div>

            <div className="lab-card-head">
              <div>
                <h3 className="lab-card-title">Direct submit to API</h3>
                <div className="lab-inline-note">Paste raw JSON and submit without composer-driven updates.</div>
              </div>
              <button
                type="button"
                className="lab-secondary-btn"
                onClick={() => {
                  setDirectRequestJson(JSON.stringify(previewRequest.body, null, 2))
                  pushDirectSubmitFeed('Loaded current Request Preview JSON.')
                }}
              >
                Load Current Preview
              </button>
            </div>

            <textarea
              className="lab-textarea lab-direct-json-input"
              value={directRequestJson}
              placeholder="Paste JSON here. Supports either { endpoint, body } or a body object for the current endpoint."
              onChange={(event) => setDirectRequestJson(event.target.value)}
              spellCheck={false}
            />

            {directSubmitFeed.length > 0 && (
              <div className="lab-direct-feed">
                <div className="lab-direct-feed-head">
                  <strong>Activity</strong>
                  <button
                    type="button"
                    className="lab-secondary-btn"
                    onClick={() => setDirectSubmitFeed([])}
                  >
                    Clear
                  </button>
                </div>
                <div className="lab-direct-feed-list">
                  {directSubmitFeed.map((item) => (
                    <div key={item.id} className="lab-direct-feed-item">{item.text}</div>
                  ))}
                </div>
              </div>
            )}

            <div className="lab-direct-panel-footer">
              <div className="lab-direct-panel-actions">
                <button
                  type="button"
                  className="lab-secondary-btn"
                  onClick={handleSaveDirectPreset}
                >
                  Save Preset
                </button>
                <button
                  type="button"
                  className="lab-secondary-btn"
                  onClick={() => setIsDirectPresetDialogOpen(true)}
                >
                  Load Template
                </button>
              </div>
              <button
                type="button"
                className="lab-primary-btn"
                disabled={isDirectSubmitBusy}
                onClick={() => void handleDirectRequestSubmit()}
              >
                {isDirectSubmitBusy ? 'Submitting...' : 'Submit JSON'}
              </button>
            </div>
          </section>
        )}

        <aside className="lab-rail">
          <div
            className="lab-rail-resizer"
            role="separator"
            aria-label="Resize side panel"
            aria-orientation="vertical"
            tabIndex={0}
            onMouseDown={handleRailMouseDown}
            onKeyDown={handleRailHandleKeyDown}
          >
            <span className="lab-rail-resizer-grip" aria-hidden="true">||</span>
          </div>

          <section className={`lab-rail-card lab-rail-card--composer${isRequestPreviewExpanded ? ' is-scrollable' : ''}`}>
            <div className="lab-rail-head">
              <div className="lab-rail-title">
                Composer
                <span className={`lab-backend-state-dot${isBackendAvailable ? '' : ' lab-backend-state-dot--down'}`} aria-label={isBackendAvailable ? 'Backend online' : 'Backend offline'}>
                  ●
                </span>
                {activeTab.label ? <span className="lab-active-workflow">({activeTab.label})</span> : null}
              </div>
              <div className="lab-composer-head-actions">
                <div className="lab-ref-mode-toggle" role="group" aria-label="Reference mode">
                  <button
                    type="button"
                    className={`lab-ref-mode-btn${composerRefMode === 'text' ? ' is-active' : ''}`}
                    title="Text only – no references"
                    onClick={() => setComposerRefMode('text')}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
                  </button>
                  <button
                    type="button"
                    className={`lab-ref-mode-btn${composerRefMode === 'image' ? ' is-active' : ''}`}
                    title="Image references"
                    onClick={() => {
                      switchComposerWorkflow(IMAGE_SINGLE_REFERENCE_MODE_ID, 'image')
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  </button>
                  <button
                    type="button"
                    className={`lab-ref-mode-btn${composerRefMode === 'video' ? ' is-active' : ''}`}
                    title="Video + image references"
                    onClick={() => {
                      switchComposerWorkflow(VIDEO_PLUS_IMAGE_MODE_ID, 'video')
                    }}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                  </button>
                </div>
                <button
                  type="button"
                  className="lab-secondary-btn lab-select-workflow-btn"
                  data-workflow-picker-trigger="true"
                  disabled={!hasConfiguredWorkflows}
                  onClick={(event) => openWorkflowPicker('all', event.currentTarget)}
                >
                  Select Workflow
                </button>
              </div>
            </div>
            <section className="lab-composer-bar lab-composer-bar--rail">
            <div className="lab-composer-prompt">
              <div className="lab-composer-prompt-head">
                <div className="lab-composer-title">Prompt</div>
                <div className="lab-refine-prompt-controls">
                  {pendingRefinedPrompt ? (
                    <>
                      <button
                        type="button"
                        className="lab-refine-prompt-btn lab-refine-prompt-btn--keep"
                        title="Keep previous prompt"
                        onClick={() => {
                          updateModeState(activeTab.id, (current) => ({ ...current, prompt: pendingRefinedPrompt.original }))
                          setPendingRefinedPrompt(null)
                        }}
                      >Keep original</button>
                      <button
                        type="button"
                        className="lab-refine-prompt-btn lab-refine-prompt-btn--apply"
                        title="Apply refined prompt"
                        onClick={() => {
                          updateModeState(activeTab.id, (current) => ({ ...current, prompt: pendingRefinedPrompt.refined }))
                          setPendingRefinedPrompt(null)
                        }}
                      >✦ Apply refined</button>
                    </>
                  ) : (
                    <button
                      type="button"
                      className="lab-refine-prompt-btn"
                      title="Refine prompt with AI"
                      disabled={isRefiningPrompt || !activeState.prompt.trim()}
                      onClick={handleRefinePrompt}
                    >
                      {isRefiningPrompt ? 'Refining…' : '✦ Refine'}
                    </button>
                  )}
                </div>
              </div>
              {pendingRefinedPrompt && (
                <div className="lab-refine-preview">{pendingRefinedPrompt.refined}</div>
              )}
              <ContentEditablePrompt
                ref={promptTextareaRef}
                className="lab-textarea lab-textarea--composer"
                value={activeState.prompt}
                placeholder={activeTab.promptPlaceholder}
                resolvedReferences={resolvedMentionReferences}
                onChange={(value, offset) => {
                  handlePromptChange(value, offset)
                  updatePromptMentionState(value, offset)
                }}
                onClick={(event) => updatePromptMentionState(activeState.prompt, getCaretOffset(event.currentTarget))}
                onKeyUp={(event) => updatePromptMentionState(activeState.prompt, getCaretOffset(event.currentTarget))}
                onKeyDown={handlePromptMentionKeyDown}
                onBlur={() => {
                  window.setTimeout(() => setPromptMentionQuery(null), 120)
                }}
              />
              {promptMentionOptions.length > 0 && (
                <div className="lab-prompt-mention-list" aria-label="Reference mentions">
                  {promptMentionOptions.map((item, index) => (
                    <button
                      key={`${item.id}:${item.url}`}
                      type="button"
                      className={`lab-prompt-mention-item${index === activePromptMentionIndex ? ' is-active' : ''}`}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleSelectPromptMention(item.mentionKey)}
                    >
                      {item.kind === 'video' ? (
                        <video src={getPlaybackUrl(item.url)} className="lab-prompt-mention-thumb" muted playsInline preload="metadata" />
                      ) : (
                        <img src={item.url} alt={item.label} className="lab-prompt-mention-thumb" />
                      )}
                      <span className="lab-prompt-mention-copy">
                        <span className="lab-prompt-mention-key">@{item.mentionKey}</span>
                        <span className="lab-prompt-mention-name">{item.label}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div
              className={`lab-composer-refs${composerRefMode === 'text' ? ' is-collapsed' : ''}`}
            >
              <div className="lab-composer-title">References</div>
              {referenceFields.length === 0 ? (
                <div className="lab-inline-note">No media references for this workflow.</div>
              ) : (
                <div className="lab-composer-ref-list">
                  <div className="lab-composer-ref-item">
                    <div className="lab-reference-thumb-strip">
                      <button
                        type="button"
                        className="lab-reference-thumb-card lab-reference-add-card"
                        onClick={() => openReferenceLibraryDialog()}
                        aria-label="Add references"
                      >
                        <span className="lab-reference-add-label">+ Add</span>
                      </button>
                      {(() => {
                        let imageIndex = 0
                        let videoIndex = 0
                        const visibleFields = composerRefMode === 'image'
                          ? referenceFields.filter((f) => f.kind === 'image')
                          : referenceFields
                        return visibleFields.map((field) => {
                          const value = (activeState.mediaUrls[field.key] || '').trim()
                          const isVideo = field.kind === 'video'
                          const isMentioned = Boolean(value) && mentionedReferenceUrls.has(value)
                          const isSelectableImage = (
                            activeTab.id === IMAGE_SINGLE_REFERENCE_MODE_ID
                            && field.kind === 'image'
                            && Boolean(value)
                          )
                          const isSelectedImage = (
                            activeTab.id === IMAGE_SINGLE_REFERENCE_MODE_ID
                            && field.kind === 'image'
                            && Boolean(value)
                            && activeState.selectedImageReferenceKey === field.key
                          )
                          if (isVideo) {
                            videoIndex += 1
                          } else {
                            imageIndex += 1
                          }
                          const orderLabel = isVideo ? `Video ${videoIndex}` : `Image ${imageIndex}`
                          return (
                            <div
                              key={field.key}
                              className={`lab-reference-thumb-card${isMentioned ? ' is-mentioned' : ''}${isSelectedImage ? ' is-selected' : ''}${isSelectableImage ? ' is-selectable' : ''}`}
                              onMouseEnter={(e) => {
                                if (!value) return
                                const rect = e.currentTarget.getBoundingClientRect()
                                const top = rect.top - 160
                                const left = rect.left + rect.width / 2 - 74
                                if (refHoverFixedRef.current) {
                                  refHoverFixedRef.current.style.top = `${top}px`
                                  refHoverFixedRef.current.style.left = `${left}px`
                                }
                                setRefHoverPreview({ url: value, kind: isVideo ? 'video' : 'image' })
                              }}
                              onMouseLeave={() => setRefHoverPreview(null)}
                              onClick={() => {
                                if (activeTab.id !== IMAGE_SINGLE_REFERENCE_MODE_ID) return
                                if (field.kind !== 'image') return
                                if (!value) return
                                updateModeState(activeTab.id, (current) => ({
                                  ...current,
                                  selectedImageReferenceKey: field.key,
                                }))
                              }}
                            >
                              {value ? (
                                isVideo ? (
                                  <>
                                    <video
                                      src={getPlaybackUrl(value)}
                                      className="lab-reference-thumb"
                                      muted
                                      playsInline
                                      preload="metadata"
                                      onMouseEnter={handleVideoCardHoverStart}
                                      onMouseLeave={handleVideoCardHoverEnd}
                                    />
                                    <span className="lab-reference-play-badge" aria-hidden="true">▶</span>
                                  </>
                                ) : (
                                  <img src={value} alt={field.label} className="lab-reference-thumb" />
                                )
                              ) : (
                                <div className="lab-reference-thumb lab-reference-thumb--empty">Empty</div>
                              )}
                              <span className="lab-reference-order-badge">{orderLabel}</span>
                              {isSelectedImage && (
                                <span className="lab-reference-selected-badge">Selected</span>
                              )}
                              {isSelectableImage && !isSelectedImage && (
                                <span className="lab-reference-selectable-badge">Choose</span>
                              )}
                              {isMentioned && (
                                <span className="lab-reference-mentioned-badge" aria-label="Referenced in prompt">@</span>
                              )}
                              {pendingRemoveRefKey === field.key ? (
                                <div className="lab-ref-remove-confirm">
                                  <span>Remove?</span>
                                  <button
                                    type="button"
                                    className="lab-ref-remove-confirm-yes"
                                    onClick={() => {
                                      updateModeState(activeTab.id, (current) => ({
                                        ...current,
                                        mediaUrls: { ...current.mediaUrls, [field.key]: '' },
                                        selectedImageReferenceKey: current.selectedImageReferenceKey === field.key
                                          ? ''
                                          : current.selectedImageReferenceKey,
                                      }))
                                      setPendingRemoveRefKey(null)
                                    }}
                                  >Yes</button>
                                  <button
                                    type="button"
                                    className="lab-ref-remove-confirm-no"
                                    onClick={() => setPendingRemoveRefKey(null)}
                                  >No</button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  className="lab-reference-thumb-remove"
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    setPendingRemoveRefKey(field.key)
                                  }}
                                  aria-label={`Remove ${field.label}`}
                                >
                                  ×
                                </button>
                              )}
                            </div>
                          )
                        })
                      })()}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="lab-composer-actions">
              <div className="lab-composer-settings-grid">
                <div className="lab-composer-run-row">
                  <select
                    id="lab-provider-model"
                    className="lab-select lab-select--chip lab-select--wide"
                    aria-label="API and model"
                    value={selectedCombinedModelValue}
                    onChange={(event) => {
                      const selectedOption = combinedModelOptions.find((option) => option.value === event.target.value)
                      if (!selectedOption) return
                      updateWorkflowSettings(activeTab.id, (current) => ({
                        ...current,
                        provider: selectedOption.provider,
                        atlasModel: selectedOption.provider === 'atlas' ? selectedOption.model : current.atlasModel,
                        byteplusModel: selectedOption.provider === 'byteplus' ? selectedOption.model : current.byteplusModel,
                      }))
                    }}
                  >
                    {combinedModelOptions.map((entry) => (
                      <option key={entry.value} value={entry.value}>{entry.label}</option>
                    ))}
                  </select>
                  <select
                    id="lab-ratio"
                    className="lab-select lab-select--chip"
                    aria-label="Aspect ratio"
                    value={activeWorkflowSettings.ratio}
                    onChange={(event) => updateWorkflowSettings(activeTab.id, (current) => ({ ...current, ratio: event.target.value }))}
                  >
                    {RATIOS.map((entry) => (
                      <option key={entry} value={entry}>{entry}</option>
                    ))}
                  </select>
                  <select
                    id="lab-resolution"
                    className="lab-select lab-select--chip"
                    aria-label="Resolution"
                    value={activeWorkflowSettings.resolution}
                    onChange={(event) => updateWorkflowSettings(activeTab.id, (current) => ({ ...current, resolution: event.target.value }))}
                  >
                    {RESOLUTIONS.map((entry) => (
                      <option key={entry} value={entry}>{entry}</option>
                    ))}
                  </select>
                  <select
                    id="lab-duration"
                    className="lab-select lab-select--chip"
                    aria-label="Duration"
                    value={activeWorkflowSettings.duration}
                    onChange={(event) => updateWorkflowSettings(activeTab.id, (current) => ({
                      ...current,
                      duration: normalizeDuration(Number(event.target.value)),
                    }))}
                  >
                    {DURATION_OPTIONS.map((entry) => (
                      <option key={entry} value={entry}>{entry}s</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className={`lab-audio-toggle${activeWorkflowSettings.generateAudio ? ' is-active' : ''}`}
                    title={activeWorkflowSettings.generateAudio ? 'Audio on' : 'Audio off'}
                    aria-label={activeWorkflowSettings.generateAudio ? 'Turn audio off' : 'Turn audio on'}
                    onClick={() => updateWorkflowSettings(activeTab.id, (current) => ({
                      ...current,
                      generateAudio: !current.generateAudio,
                    }))}
                  >
                    <span aria-hidden="true">🔊</span>
                  </button>
                </div>
              </div>
              <button
                type="button"
                className="lab-primary-btn lab-primary-btn--composer"
                disabled={!hasConfiguredWorkflows}
                onClick={() => void handleGenerate(activeTab)}
              >
                Generate
              </button>
              <div className="lab-composer-secondary-actions">
                <button
                  type="button"
                  className="lab-secondary-btn"
                  onClick={() => {
                    const exampleMediaUrls = createDefaultMediaUrls(activeTab)
                    updateModeState(activeTab.id, (current) => ({
                      ...current,
                      prompt: activeTab.examplePrompt,
                      mediaUrls: {
                        ...current.mediaUrls,
                        ...exampleMediaUrls,
                      },
                      statusText: 'Example prompt loaded.',
                    }))
                  }}
                >
                  Example
                </button>
                <button
                  type="button"
                  className="lab-secondary-btn"
                  onClick={() => {
                    const sourceMediaUrls = createDefaultMediaUrls(activeTab)
                    updateModeState(activeTab.id, (current) => ({
                      ...current,
                      prompt: activeTab.documentPrompt,
                      mediaUrls: {
                        ...current.mediaUrls,
                        ...sourceMediaUrls,
                      },
                      statusText: 'Document source prompt loaded.',
                    }))
                  }}
                >
                  Source
                </button>
                <button
                  type="button"
                  className="lab-secondary-btn"
                  onClick={() => setIsPromptTemplateDialogOpen(true)}
                >
                  Template
                </button>
                <button
                  type="button"
                  className="lab-secondary-btn"
                  onClick={() => setIsRequestPreviewExpanded((current) => !current)}
                >
                  {isRequestPreviewExpanded ? 'Hide Request Review' : 'Request Review'}
                </button>
              </div>
            </div>
            {isRequestPreviewExpanded && (
              <div className="lab-composer-request-preview" role="region" aria-label="Request preview">
                <div className="lab-composer-request-preview-head">
                  <strong>Final Request Body</strong>
                  <span className="lab-inline-note">This exact JSON body is submitted to the API.</span>
                </div>
                <pre className="lab-preview lab-composer-request-preview-code">{JSON.stringify(previewRequest.body, null, 2)}</pre>
              </div>
            )}
            </section>
          </section>
        </aside>
      </div>
    </div>
  )
}