import 'img-comparison-slider'
import 'img-comparison-slider/dist/styles.css'
import { type PointerEventHandler, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { onAuthStateChanged } from 'firebase/auth'
import {
  type BuiltInContextMenuItem,
  DockviewApi,
  DockviewReact,
} from 'dockview-react'
import type {
  DockviewReadyEvent,
  EdgeGroupPosition,
  GetTabContextMenuItemsParams,
  IDockviewPanelHeaderProps,
  IDockviewPanelProps,
  ReactContextMenuItemConfig,
} from 'dockview-react'
import { loadUserPrefs, saveUserPrefs, saveDefaultLabNewLayout, loadDefaultLabNewLayout } from '../lib/adminRepo'
import {
  deleteProjectReferenceLibraryItem,
  loadProjectFlowCanvasState,
  moveProjectFlowCanvas,
  renameProjectFlowCanvas,
  saveProjectFlowCanvasState,
  saveProjectReferenceLibraryItem,
  subscribeToProjectReferenceLibrary,
  subscribeToProjectFlowCanvases,
  type StudioProjectFlowCanvasSummary,
} from '../lib/studioService'
import { LabNewLayoutComposerPanel } from './LabNewLayout/LabNewLayoutComposerPanel'
import { LabNewLayoutDirectApiPanel } from './LabNewLayout/LabNewLayoutDirectApiPanel'
import { LabNewLayoutExplorerEdgePanel } from './LabNewLayout/LabNewLayoutExplorerEdgePanel'
import { LabNewLayoutUiSettingsContext } from './LabNewLayout/LabNewLayoutUiSettingsContext'
import { LabNewLayoutUiSettingsEdgePanel } from './LabNewLayout/LabNewLayoutUiSettingsEdgePanel'
import { LabNewLayoutUserSettingsEdgePanel } from './LabNewLayout/LabNewLayoutUserSettingsEdgePanel'
import { normalizeComposerModelId } from './LabNewLayout/useLabNewLayoutComposer'
import { useGenerationRunner, type GenerationProvider, type GenerationRequestSettings } from '../hooks/useGenerationRunner'
import { useStaleGenerationRecovery } from '../hooks/useStaleGenerationRecovery'
import { useLabNewLayoutHistoryGallery, type LabNewLayoutGalleryHistoryEntry } from './LabNewLayout/useLabNewLayoutHistoryGallery'
import { useLabNewLayoutStore, type ComposerReuseSeed, type PendingGenerationAsset } from './LabNewLayout/useLabNewLayoutStore'
import { calculateUrlExpiry, calculateGenerationMetrics, getExpiryStatusLabel, getExpiryStatusClass, formatModelName } from './LabNewLayout/utils/urlExpiryUtils'
import { auth, firebaseConfig, storage } from '../lib/firebase'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { useLocation, useNavigate } from 'react-router-dom'
import { LabNewLayoutDataContext, useLabNewLayoutData, useLabNewLayoutWorkspace } from './LabNewLayout/useLabNewLayoutWorkspace'
import type { StoryBibleScene } from './LabNewLayout/useLabNewLayoutWorkspace'
import { useAssetsLibrary } from '../reactvideoeditor/pro/hooks/use-assets-library'
import {
  WorkflowBuilderCanvas,
  createWorkflowBuilderSampleWorkflow,
  type WorkflowBuilderDefinition,
  type WorkflowBuilderNotice,
} from '../features/workflowBuilder'
import { OpenAIImageLabPanel } from '../features/openaiImage/OpenAIImageLabPanel'
import type { FolderSummary, ProjectSummary, StudioReferenceAsset } from '../types/studio'
import { useToast } from '../lib/ToastContext'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../reactvideoeditor/pro/components/ui/dropdown-menu'
import { FolderMenu } from '../components/FolderMenu'
import type { FolderTarget } from '../components/FolderMenu'
import 'dockview-react/dist/styles/dockview.css'
import './LabNewLayoutPage.css'

type PanelSuggestionParams = {
  label?: string
  position?: string
  suggestedLabel: string
  summary: string
  source: string[]
  keep: string[]
  note?: string
  phase?: string
}

const FLOW_ROOT_FOLDER_VALUE = '__root__'
const CHATBOT_BASE = (import.meta.env.VITE_CHATBOT_API_URL as string | undefined) || ''

// Module-level poster cache so thumbnail frames survive panel remounts.
// Keyed by the original video URL; value is a JPEG data URL of the first frame.
const _referencePosterCache = new Map<string, string>()
// Keyed by gallery playback URL; value is a JPEG data URL thumbnail.
const _historyPosterCache = new Map<string, string>()

function _captureVideoFrame(video: HTMLVideoElement): string | null {
  try {
    const w = Math.min(video.videoWidth || 160, 320)
    const h = video.videoHeight ? Math.round(w * (video.videoHeight / video.videoWidth)) : 90
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(video, 0, 0, w, h)
    return canvas.toDataURL('image/jpeg', 0.75)
  } catch {
    return null
  }
}

function formatAssetPreviewCreatedAt(value: unknown): string {
  if (!value) return ''

  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value).toLocaleString()
  }

  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    return Number.isNaN(parsed) ? value : new Date(parsed).toLocaleString()
  }

  if (typeof value === 'object' && value) {
    const candidate = value as {
      toDate?: () => Date
      toMillis?: () => number
      seconds?: number
      _seconds?: number
    }
    if (typeof candidate.toDate === 'function') {
      return candidate.toDate().toLocaleString()
    }
    if (typeof candidate.toMillis === 'function') {
      return new Date(candidate.toMillis()).toLocaleString()
    }
    if (typeof candidate.seconds === 'number') {
      return new Date(candidate.seconds * 1000).toLocaleString()
    }
    if (typeof candidate._seconds === 'number') {
      return new Date(candidate._seconds * 1000).toLocaleString()
    }
  }

  return ''
}

const normalizeRecoveryProvider = (provider: string | undefined): GenerationProvider => (
  (() => {
    const normalized = (provider || '').trim().toLowerCase()
    if (!normalized) return 'atlas' as const
    if (normalized === 'atlas' || normalized.includes('atlas') || normalized.includes('seedance')) return 'atlas' as const
    if (normalized === 'grok' || normalized.includes('grok')) return 'grok' as const
    if (normalized === 'byteplus' || normalized.includes('byteplus') || normalized.includes('byte-plus')) return 'byteplus' as const
    return 'atlas' as const
  })()
)

const resolveRecoveryModel = (entry: LabNewLayoutGalleryHistoryEntry, provider: GenerationProvider): string => {
  const payloadModel = entry.requestPayload && typeof entry.requestPayload.model === 'string'
    ? entry.requestPayload.model.trim()
    : ''
  const sourceModel = (payloadModel || entry.model || '').trim()
  const lower = sourceModel.toLowerCase()

  if (provider === 'byteplus') {
    return sourceModel || 'byteplus'
  }

  if (!sourceModel) {
    return 'bytedance/seedance-2.0-fast'
  }
  if (sourceModel.includes('/')) {
    return sourceModel
  }
  if (lower.includes('seedance-2.0-fast') || lower.includes('atlas cloud 2.0 fast')) {
    return 'bytedance/seedance-2.0-fast'
  }
  if (lower.includes('seedance-2.0') || lower.includes('atlas cloud 2.0')) {
    return 'bytedance/seedance-2.0'
  }
  if (lower.includes('seedance-1.5')) {
    return 'bytedance/seedance-1.5-i2v'
  }
  if (lower.startsWith('seedance-')) {
    return `bytedance/${lower}`
  }
  return 'bytedance/seedance-2.0-fast'
}

const buildRecoverySettings = (entry: LabNewLayoutGalleryHistoryEntry): GenerationRequestSettings => ({
  provider: normalizeRecoveryProvider(entry.provider),
  model: resolveRecoveryModel(entry, normalizeRecoveryProvider(entry.provider)),
  ratio: entry.ratio || '16:9',
  duration: typeof entry.duration === 'number' ? entry.duration : 15,
  resolution: entry.resolution || '480p',
  generateAudio: entry.generateAudio !== false,
})

function resolveFolderPath(folderId: string | null, folders: FolderSummary[]) {
  if (!folderId) {
    return {
      ids: [] as string[],
      names: [] as string[],
    }
  }

  const folderById = new Map<string, FolderSummary>(folders.map((folder) => [folder.id, folder]))
  const ids: string[] = []
  const names: string[] = []
  let cursorId: string | null = folderId
  const guard = new Set<string>()

  while (cursorId) {
    if (guard.has(cursorId)) {
      break
    }

    guard.add(cursorId)
    const current = folderById.get(cursorId)
    if (!current) {
      break
    }

    ids.unshift(current.id)
    names.unshift(current.name)
    cursorId = current.parentId || null
  }

  return { ids, names }
}

const LAB_NEWLAYOUT_BASE_PATH = '/lab/newlayout'

function parseLabNewLayoutRoute(pathname: string): { projectId: string | null; folderPathIds: string[] } {
  const normalizedPath = pathname.split(/[?#]/)[0]
  const segments = normalizedPath.split('/').filter(Boolean)

  if (segments.length < 2 || segments[0] !== 'lab' || segments[1] !== 'newlayout') {
    return { projectId: null, folderPathIds: [] }
  }

  const projectMarkerIndex = segments.indexOf('p')
  if (projectMarkerIndex < 0 || !segments[projectMarkerIndex + 1]) {
    return { projectId: null, folderPathIds: [] }
  }

  const projectId = decodeURIComponent(segments[projectMarkerIndex + 1])
  const folderMarkerIndex = segments.indexOf('f')
  if (folderMarkerIndex < 0) {
    return { projectId, folderPathIds: [] }
  }

  const folderPathIds = segments.slice(folderMarkerIndex + 1)
    .map((segment) => decodeURIComponent(segment))
    .filter((segment) => segment.trim().length > 0)

  return { projectId, folderPathIds }
}

function buildLabNewLayoutRoute(projectId: string | null, folderPathIds: string[]): string {
  const normalizedProjectId = (projectId || '').trim()
  if (!normalizedProjectId) {
    return LAB_NEWLAYOUT_BASE_PATH
  }

  const base = `${LAB_NEWLAYOUT_BASE_PATH}/p/${encodeURIComponent(normalizedProjectId)}`
  const normalizedFolderPathIds = folderPathIds
    .map((id) => id.trim())
    .filter((id) => id.length > 0)

  if (normalizedFolderPathIds.length === 0) {
    return base
  }

  return `${base}/f/${normalizedFolderPathIds.map((id) => encodeURIComponent(id)).join('/')}`
}

function resolveHistoryFolderLabel(folderId: string | null, folders: FolderSummary[]) {
  if (!folderId) {
    return 'Project root'
  }

  const folderPath = resolveFolderPath(folderId, folders)
  if (folderPath.names.length > 0) {
    return folderPath.names.join(' / ')
  }

  return folders.find((folder) => folder.id === folderId)?.name || 'Unknown folder'
}

const panelSuggestions: Record<string, Omit<PanelSuggestionParams, 'label' | 'position'>> = {
  news: {
    suggestedLabel: 'Workspace Home',
    summary: 'Use this left-column tab for active Studio context, quick entry points, and a compact home view.',
    source: ['Lab toolbar context', 'active project and folder state', 'recent sessions summary'],
    keep: ['workspace overview', 'project switcher', 'folder context', 'quick status cards'],
    note: 'If the existing top toolbar stays outside Dockview in phase 1, keep only summary and quick-jump content here.',
    phase: 'Phase 2',
  },
  watchlist: {
    suggestedLabel: 'Assets Library',
    summary: 'Best fit for the reference library because it is a browse-first side tool and already behaves like a library tab.',
    source: ['Reference library dialog', 'asset upload and selection flow', 'project and personal asset browsing'],
    keep: ['image/video/audio assets', 'rename and delete', 'select for prompt references', 'project asset import'],
    note: 'Strong candidate right after the composer if you want a visible library instead of a modal.',
    phase: 'Phase 2',
  },
  pricealert: {
    suggestedLabel: 'Workflow Library',
    summary: 'Use the neighboring left-column tab for workflow switching, templates, and guided presets.',
    source: ['workflow picker', 'prompt templates', 'example prompts', 'custom modes'],
    keep: ['workflow selection', 'template browsing', 'preset actions', 'workflow guidance'],
    note: 'This keeps workflow changes near assets rather than mixing them into the main composer surface.',
    phase: 'Phase 2',
  },
  research: {
    suggestedLabel: 'Story Overview',
    summary: 'Good location for a light story snapshot while the full editor remains docked elsewhere or stays modal at first.',
    source: ['Story tab summary', 'chapter list', 'characters summary'],
    keep: ['episode overview', 'story summary', 'chapter shortcuts', 'story-level notes'],
    note: 'Start read-only here; keep the full Story & Bible editor in a modal until the docked version is proven.',
    phase: 'Phase 3',
  },
  flow: {
    suggestedLabel: 'Flow',
    summary: 'Use this main-area tab for a clean standalone canvas that stays separate from the older generation studio.',
    source: ['fresh canvas workspace', 'lightweight graph sketching', 'simple block connections'],
    keep: ['empty canvas', 'simple nodes', 'quick connections', 'clean editing surface'],
    note: 'This canvas is intentionally separate from ToorGen so the new layout stays fresh and self-contained.',
    phase: 'Phase 2',
  },
  orderbook: {
    suggestedLabel: 'Composer',
    summary: 'This should become the primary authoring panel because it is the largest and most central panel in the layout.',
    source: ['current composer rail'],
    keep: ['reference stage', 'prompt editor', 'refine actions', 'model and ratio controls', 'generate button'],
    note: 'Best first real migration. Keep the existing logic and only re-host the JSX here.',
    phase: 'Phase 1',
  },
  orders: {
    suggestedLabel: 'History Gallery',
    summary: 'Use this bottom-center tab as the main review surface for generated outputs and historical runs.',
    source: ['Main Panel history cards', 'list and rail modes', 'video result gallery'],
    keep: ['generated video cards', 'load more', 'thumb rail', 'open video details'],
    note: 'This preserves the current main-panel role without mixing output review into the composer.',
    phase: 'Phase 2',
  },
  vesselfinder: {
    suggestedLabel: 'Playlist / Sequencer',
    summary: 'Use the second tab beside history for playback-oriented tools and clip sequencing.',
    source: ['MiniVideoPlaylist dialog', 'Video Sequencer dialog', 'selected output preview'],
    keep: ['playlist browsing', 'library clips', 'generated clips', 'sequencer launch or embed'],
    note: 'Safe to start as a launcher surface, then gradually embed the full sequencer when ready.',
    phase: 'Phase 3',
  },
  positionsummary: {
    suggestedLabel: 'Direct API',
    summary: 'Good right-side placement for the operator-focused raw request workflow.',
    source: ['Direct submit panel', 'request preview', 'direct preset controls'],
    keep: ['raw JSON editor', 'preview body', 'save and load preset', 'submit JSON'],
    note: 'Keep this paired with Console / Feed so requests and operator output stay in one tabbed section.',
    phase: 'Phase 2',
  },
  console: {
    suggestedLabel: 'Console / Feed',
    summary: 'Use this as the second tab beside Direct API for append-only activity, operator notes, and system chatter.',
    source: ['Direct submit feed', 'status notices', 'background task messages'],
    keep: ['activity feed', 'copyable notices', 'operator log stream'],
    note: 'Keep this in the same tab strip as Direct API so the operator workflow stays together.',
    phase: 'Phase 2',
  },
  references: {
    suggestedLabel: 'References',
    summary: 'Use this operator tab for quick reference thumbnails beside the Direct API and Console workflow.',
    source: ['reference library selections', 'image thumbnails', 'video thumbnails'],
    keep: ['selected references', 'quick media scan', 'thumbnail placeholders'],
    note: 'This can later mount the real reference rail while staying in the same operator tab strip.',
    phase: 'Phase 2',
  },
  eventlog: {
    suggestedLabel: 'Generation Events',
    summary: 'Use this diagnostics tab for per-run lifecycle events and recoverable task tracking.',
    source: ['pending tasks', 'generation timestamps', 'recovery trail'],
    keep: ['task ids', 'job events', 'run timestamps', 'recovery breadcrumbs'],
    note: 'Pairs naturally with History Gallery but can stay technical and operator-facing.',
    phase: 'Phase 3',
  },
  layoutinspector: {
    suggestedLabel: 'Request / Layout JSON',
    summary: 'Use this tab for raw payload inspection now and Dockview layout persistence later.',
    source: ['request preview JSON', 'metadata inspection', 'future Dockview saved layout'],
    keep: ['copy raw JSON', 'inspect payload', 'layout export and import', 'raw request metadata'],
    note: 'This is where layout persistence and request inspection can live together without cluttering the main UI.',
    phase: 'Phase 3',
  },
  debuginfo: {
    suggestedLabel: 'Recovery / Diagnostics',
    summary: 'Use this tab for technical recovery tools and operational warnings.',
    source: ['recovery panel', 'thumbnail migration jobs', 'warning surfaces'],
    keep: ['failed upload warnings', 'missing reference warnings', 'migration jobs', 'developer diagnostics'],
    note: 'Ideal place for the advanced troubleshooting tools you do not want in the main flow.',
    phase: 'Phase 3',
  },
  'left-1': {
    suggestedLabel: 'Studio Explorer',
    summary: 'Best use for the left edge panel is Studio tree navigation and optional absorption of the utility sidebar.',
    source: ['utility sidebar', 'project and folder explorer', 'recent sessions jump list'],
    keep: ['project tree', 'folder tree', 'quick shortcuts', 'recent-session explorer'],
    note: 'If the slim icon rail remains global, keep this panel focused on tree navigation only.',
    phase: 'Phase 2',
  },
  'left-2': {
    suggestedLabel: 'UI Settings',
    summary: 'Use the neighboring left-edge tab for layout presets and workspace view controls rather than keeping them in the top bar.',
    source: ['layout reset control', 'saved UI presets', 'layout persistence actions'],
    keep: ['reset layout', 'save preset', 'apply preset', 'update selected preset'],
    note: 'Keeping these controls docked with the Explorer avoids top-level clutter as more workspace tools move in.',
    phase: 'Phase 2',
  },
  'left-3': {
    suggestedLabel: 'User Settings',
    summary: 'Use this left-edge tab for signed-in identity, active workspace context, and account settings access.',
    source: ['header profile chip', 'auth identity state', 'active project context'],
    keep: ['profile access', 'workspace summary', 'account settings entry point'],
    note: 'This keeps profile access off the header and anchored to the left rail.',
    phase: 'Phase 2',
  },
  'right-1': {
    suggestedLabel: 'Story Outline',
    summary: 'Best home for the folder tree, chapter tabs, and scene list from Story & Bible.',
    source: ['Story & Bible manager folder rail', 'chapter list', 'scene list'],
    keep: ['folder hierarchy', 'chapter switching', 'scene selection', 'outline browsing'],
    note: 'This is the cleanest way to convert the current Story dialog into a persistent side outline.',
    phase: 'Phase 3',
  },
  'right-2': {
    suggestedLabel: 'Inspector',
    summary: 'Use the second right edge panel for the currently selected scene, asset, or generated video details.',
    source: ['video details dialog', 'selected scene editor', 'selected character or asset metadata'],
    keep: ['scene properties', 'asset metadata', 'selected output details', 'quick edit controls'],
    note: 'This is a strong replacement for modal detail views once the layout settles.',
    phase: 'Phase 3',
  },
  'bottom-1': {
    suggestedLabel: 'Task Console',
    summary: 'Use this bottom panel for background job output and operator-facing logs.',
    source: ['direct feed', 'generation task messages', 'background system notices'],
    keep: ['log stream', 'task console', 'retry notes', 'copyable status output'],
    note: 'This matches the mental model of a terminal without forcing logs into the main workspace.',
    phase: 'Phase 2',
  },
  'bottom-2': {
    suggestedLabel: 'Latest Output',
    summary: 'Use this bottom tab for the currently selected video preview and quick output actions.',
    source: ['video details dialog', 'selected result preview', 'frame capture actions'],
    keep: ['active video preview', 'save to assets', 'grab frame', 'quick result metadata'],
    note: 'Good companion to the History Gallery so users can browse above and inspect below.',
    phase: 'Phase 3',
  },
  'bottom-3': {
    suggestedLabel: 'Warnings',
    summary: 'Reserve this bottom tab for things that need attention but should not block composing.',
    source: ['history warnings', 'unsupported reference combinations', 'failed uploads'],
    keep: ['validation warnings', 'error queue', 'unresolved issues', 'operational problems'],
    note: 'This keeps problem reporting visible but out of the main authoring path.',
    phase: 'Phase 2',
  },
}

type DockviewLayoutState = ReturnType<DockviewApi['toJSON']>

type LabNewLayoutPersistedState = {
  version: 6
  savedAt: number
  layout: DockviewLayoutState
}

type LayoutPresetRecord = {
  id: string
  name: string
  savedAt: number
  layout: DockviewLayoutState
}

type LabNewLayoutPresetStore = {
  version: 6
  presets: LayoutPresetRecord[]
}

type LabNewLayoutProjectTabPolicyState = {
  version: 1
  adminOnlyPanelIds: string[]
  masterAdminCanCloseTabs: boolean
}

// v6 drops saved layouts
const LAB_NEWLAYOUT_STORAGE_KEY = 'toorgen:lab-newlayout:dockview:v6'
const LAB_NEWLAYOUT_PRESETS_STORAGE_KEY = 'toorgen:lab-newlayout:dockview-presets:v6'
const LAB_NEWLAYOUT_PANEL_ACCESS_STORAGE_KEY = 'toorgen:lab-newlayout:panel-access:v1'
const LAB_NEWLAYOUT_PROJECT_TAB_POLICY_STORAGE_PREFIX = 'toorgen:lab-newlayout:project-tab-policy:v1:'
const LEFT_EDGE_WIDTH = 320
const LEFT_EDGE_MINIMUM_WIDTH = 248
const MASTER_EMAIL = import.meta.env.VITE_MASTER_EMAIL as string | undefined

function parsePersistedLayoutState(raw: string | null | undefined): LabNewLayoutPersistedState | null {
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as Partial<LabNewLayoutPersistedState> | null
    if (!parsed || typeof parsed !== 'object') {
      return null
    }

    if (parsed.version !== 6 || typeof parsed.savedAt !== 'number' || !parsed.layout || typeof parsed.layout !== 'object') {
      return null
    }

    return parsed as LabNewLayoutPersistedState
  } catch {
    return null
  }
}

function readLocalPersistedLayoutState(): LabNewLayoutPersistedState | null {
  if (typeof window === 'undefined') {
    return null
  }

  return parsePersistedLayoutState(window.localStorage.getItem(LAB_NEWLAYOUT_STORAGE_KEY))
}

function writeLocalPersistedLayoutState(state: LabNewLayoutPersistedState): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(LAB_NEWLAYOUT_STORAGE_KEY, JSON.stringify(state))
}

function createPersistedLayoutState(layout: DockviewLayoutState): LabNewLayoutPersistedState {
  return {
    version: 6,
    savedAt: Date.now(),
    layout,
  }
}

function parsePersistedPresetStore(raw: string | null | undefined): LabNewLayoutPresetStore {
  if (!raw) {
    return { version: 6, presets: [] }
  }

  try {
    const parsed = JSON.parse(raw) as Partial<LabNewLayoutPresetStore> | null
    if (!parsed || parsed.version !== 6 || !Array.isArray(parsed.presets)) {
      return { version: 6, presets: [] }
    }

    const presets = parsed.presets.filter((preset): preset is LayoutPresetRecord => {
      return Boolean(
        preset
        && typeof preset.id === 'string'
        && typeof preset.name === 'string'
        && typeof preset.savedAt === 'number'
        && preset.layout
        && typeof preset.layout === 'object',
      )
    })

    return {
      version: 6,
      presets,
    }
  } catch {
    return { version: 6, presets: [] }
  }
}

function readLocalPresetStore(): LabNewLayoutPresetStore {
  if (typeof window === 'undefined') {
    return { version: 6, presets: [] }
  }

  return parsePersistedPresetStore(window.localStorage.getItem(LAB_NEWLAYOUT_PRESETS_STORAGE_KEY))
}

function writeLocalPresetStore(store: LabNewLayoutPresetStore): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(LAB_NEWLAYOUT_PRESETS_STORAGE_KEY, JSON.stringify(store))
}

function createProjectTabPolicyState(
  nextState?: Partial<LabNewLayoutProjectTabPolicyState> | null,
): LabNewLayoutProjectTabPolicyState {
  return {
    version: 1,
    adminOnlyPanelIds: [...new Set((nextState?.adminOnlyPanelIds ?? []).filter((panelId) => typeof panelId === 'string' && panelId.trim().length > 0))].sort(),
    masterAdminCanCloseTabs: nextState?.masterAdminCanCloseTabs === true,
  }
}

function parsePersistedProjectTabPolicyState(raw: string | null | undefined): LabNewLayoutProjectTabPolicyState | null {
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as Partial<LabNewLayoutProjectTabPolicyState> | null
    if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.adminOnlyPanelIds)) {
      return null
    }

    return createProjectTabPolicyState(parsed)
  } catch {
    return null
  }
}

function getProjectTabPolicyStorageKey(projectId: string): string {
  return `${LAB_NEWLAYOUT_PROJECT_TAB_POLICY_STORAGE_PREFIX}${projectId}`
}

function readLegacyPanelAccessState(): LabNewLayoutProjectTabPolicyState {
  if (typeof window === 'undefined') {
    return createProjectTabPolicyState()
  }

  return parsePersistedProjectTabPolicyState(window.localStorage.getItem(LAB_NEWLAYOUT_PANEL_ACCESS_STORAGE_KEY)) ?? createProjectTabPolicyState()
}

function readLocalProjectTabPolicyState(projectId: string | null): LabNewLayoutProjectTabPolicyState | null {
  if (typeof window === 'undefined' || !projectId) {
    return null
  }

  return parsePersistedProjectTabPolicyState(window.localStorage.getItem(getProjectTabPolicyStorageKey(projectId)))
}

function writeLocalProjectTabPolicyState(projectId: string, state: LabNewLayoutProjectTabPolicyState): void {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(getProjectTabPolicyStorageKey(projectId), JSON.stringify(state))
}

function applyAdminOnlyPanelVisibility(api: DockviewApi, adminOnlyPanelIds: string[], canViewAdminOnlyPanels: boolean): void {
  if (canViewAdminOnlyPanels || adminOnlyPanelIds.length === 0) {
    return
  }

  for (const panelId of adminOnlyPanelIds) {
    const panel = api.panels.find((item) => item.id === panelId)
    if (panel) {
      api.removePanel(panel)
    }
  }
}

function getPanelSuggestion(id: string, label: string, position?: string): PanelSuggestionParams {
  const suggestion = panelSuggestions[id]

  if (!suggestion) {
    return {
      label,
      position,
      suggestedLabel: label,
      summary: 'Suggested content is not mapped yet.',
      source: [],
      keep: [],
    }
  }

  return {
    ...suggestion,
    label,
    position,
  }
}

function PlaceholderPanel(props: IDockviewPanelProps<PanelSuggestionParams>) {
  // PERF TEST: content stubbed
  const panelParams = props.params ?? {}
  return <div className="lab-newlayout-placeholder-panel">{panelParams.label ?? props.api.title}</div>
}

function WorkspaceHomeMetricCard({
  label,
  value,
  detail,
}: {
  label: string
  value: string | number
  detail: string
}) {
  return (
    <article className="lab-newlayout-workspace-home-metric">
      <div className="lab-newlayout-workspace-home-metric-label">{label}</div>
      <div className="lab-newlayout-workspace-home-metric-value">{value}</div>
      <p className="lab-newlayout-workspace-home-metric-detail">{detail}</p>
    </article>
  )
}

type DraftSceneItem = {
  id: string
  title: string
  text: string
  durationSec: number
  folderId: string
}

function WorkspaceHomePanel(props: IDockviewPanelProps<PanelSuggestionParams>) {
  const panelParams = props.params ?? {}
  const setComposerReuseSeed = useLabNewLayoutStore((state) => state.setComposerReuseSeed)
  const { showToast } = useToast()
  const {
    studioProjectId,
    studioProjects,
    studioProjectsLoading,
    studioFolders,
    studioFoldersLoading,
    studioActiveFolderId,
    storyBibleData,
    updateStoryBibleData,
  } = useLabNewLayoutData()
  const [isConfigDialogOpen, setConfigDialogOpen] = useState(false)
  const [draftStoryText, setDraftStoryText] = useState('')
  const [draftScenes, setDraftScenes] = useState<DraftSceneItem[]>([])
  const [selectedDraftSceneId, setSelectedDraftSceneId] = useState<string | null>(null)
  const [renamingSceneId, setRenamingSceneId] = useState<string | null>(null)

  const selectedProject = useMemo(
    () => studioProjects.find((project) => project.id === studioProjectId) || null,
    [studioProjectId, studioProjects],
  )
  const selectedFolder = useMemo(
    () => studioFolders.find((folder) => folder.id === studioActiveFolderId) || null,
    [studioActiveFolderId, studioFolders],
  )
  const selectedFolderPath = useMemo(
    () => resolveFolderPath(studioActiveFolderId, studioFolders),
    [studioActiveFolderId, studioFolders],
  )
  const scenesInFolder = useMemo(() => {
    if (!studioActiveFolderId) {
      return storyBibleData.scenes.length
    }

    return storyBibleData.scenes.filter((scene) => scene.folderId === studioActiveFolderId).length
  }, [storyBibleData.scenes, studioActiveFolderId])
  const episodesInFolder = useMemo(() => {
    if (!studioActiveFolderId) {
      return storyBibleData.episodes.length
    }

    return storyBibleData.episodes.filter((episode) => episode.folderId === studioActiveFolderId).length
  }, [storyBibleData.episodes, studioActiveFolderId])
  const recentChapters = useMemo(() => {
    if (!studioActiveFolderId) {
      return storyBibleData.chapters.slice(0, 5)
    }

    return storyBibleData.chapters.filter((chapter) => chapter.folderId === studioActiveFolderId).slice(0, 5)
  }, [storyBibleData.chapters, studioActiveFolderId])
  const scopedScenes = useMemo(() => {
    if (!studioActiveFolderId) {
      return storyBibleData.scenes
    }

    return storyBibleData.scenes.filter((scene) => scene.folderId === studioActiveFolderId)
  }, [storyBibleData.scenes, studioActiveFolderId])
  const scopedStorySummary = useMemo(() => {
    if (!studioActiveFolderId) {
      return storyBibleData.summary
    }

    return storyBibleData.folderSummaries[studioActiveFolderId] || ''
  }, [storyBibleData.folderSummaries, storyBibleData.summary, studioActiveFolderId])
  const homeTitle = panelParams.label ?? props.api.title
  const selectedDraftScene = useMemo(
    () => draftScenes.find((scene) => scene.id === selectedDraftSceneId) || null,
    [draftScenes, selectedDraftSceneId],
  )

  const openConfigDialog = useCallback(() => {
    setDraftStoryText(scopedStorySummary)
    const nextDraftScenes = scopedScenes.map((scene) => ({
      id: scene.id,
      title: scene.title || scene.id,
      text: scene.scenario || scene.visual || scene.action || scene.script || '',
      durationSec: scene.durationSec,
      folderId: scene.folderId,
    }))
    setDraftScenes(nextDraftScenes)
    setSelectedDraftSceneId(nextDraftScenes[0]?.id || null)
    setRenamingSceneId(null)
    setConfigDialogOpen(true)
  }, [scopedScenes, scopedStorySummary])

  const updateDraftSceneText = useCallback((sceneId: string, text: string) => {
    setDraftScenes((current) => current.map((scene) => (
      scene.id === sceneId
        ? { ...scene, text }
        : scene
    )))
  }, [])

  const updateDraftSceneTitle = useCallback((sceneId: string, title: string) => {
    setDraftScenes((current) => current.map((scene) => (
      scene.id === sceneId
        ? { ...scene, title }
        : scene
    )))
  }, [])

  const handleAddScene = useCallback(() => {
    const nextId = `scene-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const nextScene: DraftSceneItem = {
      id: nextId,
      title: `Scene ${draftScenes.length + 1}`,
      text: '',
      durationSec: 8,
      folderId: studioActiveFolderId || '',
    }
    setDraftScenes((current) => [...current, nextScene])
    setSelectedDraftSceneId(nextId)
    setRenamingSceneId(nextId)
  }, [draftScenes.length, studioActiveFolderId])

  const handleRemoveSelectedScene = useCallback(() => {
    if (!selectedDraftScene) return
    const approved = typeof window === 'undefined'
      ? true
      : window.confirm(`Remove "${selectedDraftScene.title || selectedDraftScene.id}"?`)
    if (!approved) return

    setDraftScenes((current) => {
      const nextScenes = current.filter((scene) => scene.id !== selectedDraftScene.id)
      setSelectedDraftSceneId((currentSelectedId) => {
        if (currentSelectedId !== selectedDraftScene.id) {
          return currentSelectedId
        }
        return nextScenes[0]?.id || null
      })
      return nextScenes
    })
    setRenamingSceneId(null)
  }, [selectedDraftScene])

  const handleSaveConfig = useCallback(() => {
    updateStoryBibleData((current) => {
      const normalizedStory = draftStoryText.trim()
      const normalizedDraftScenes: StoryBibleScene[] = draftScenes.map((scene, index) => {
        const nextText = scene.text.trim()
        const safeTitle = scene.title.trim() || `Scene ${index + 1}`
        return {
          id: scene.id,
          folderId: studioActiveFolderId || scene.folderId || '',
          title: safeTitle,
          durationSec: scene.durationSec || 8,
          category: '',
          discipline: '',
          script: '',
          scenario: nextText,
          visualThumbnailUrl: '',
          visual: nextText,
          action: '',
          characterIds: [],
        }
      })

      const nextScenes = current.scenes.filter((scene) => {
        if (!studioActiveFolderId) {
          return false
        }
        return scene.folderId !== studioActiveFolderId
      }).concat(normalizedDraftScenes)

      if (!studioActiveFolderId) {
        return {
          ...current,
          summary: normalizedStory,
          scenes: nextScenes,
        }
      }

      return {
        ...current,
        folderSummaries: {
          ...current.folderSummaries,
          [studioActiveFolderId]: normalizedStory,
        },
        scenes: nextScenes,
      }
    })
    setConfigDialogOpen(false)
  }, [draftScenes, draftStoryText, studioActiveFolderId, updateStoryBibleData])

  const resolveSceneText = useCallback((scene: StoryBibleScene) => {
    return (scene.scenario || scene.visual || scene.action || scene.script || '').trim()
  }, [])

  const handleCopySceneText = useCallback(async (scene: StoryBibleScene) => {
    const text = resolveSceneText(scene)
    if (!text) {
      showToast({ message: 'Scene has no text to copy', type: 'info' })
      return
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text)
        showToast({ message: 'Scene text copied', type: 'success' })
        return
      }
      throw new Error('Clipboard API unavailable')
    } catch {
      showToast({ message: 'Could not copy scene text', type: 'error' })
    }
  }, [resolveSceneText, showToast])

  const handleSendSceneToComposer = useCallback((scene: StoryBibleScene) => {
    const text = resolveSceneText(scene)
    if (!text) {
      showToast({ message: 'Scene has no text to send', type: 'info' })
      return
    }

    setComposerReuseSeed({
      id: `scene-prompt-${scene.id}-${Date.now()}`,
      prompt: text,
    })
    showToast({ message: 'Scene text sent to Composer prompt', type: 'success' })
  }, [resolveSceneText, setComposerReuseSeed, showToast])

  const handlePasteSceneText = useCallback(async (scene: StoryBibleScene) => {
    try {
      if (typeof navigator === 'undefined' || !navigator.clipboard || !navigator.clipboard.readText) {
        throw new Error('Clipboard API unavailable')
      }

      const pastedText = await navigator.clipboard.readText()
      if (!pastedText.trim()) {
        showToast({ message: 'Clipboard is empty', type: 'info' })
        return
      }

      updateStoryBibleData((current) => ({
        ...current,
        scenes: current.scenes.map((candidate) => (
          candidate.id === scene.id
            ? {
                ...candidate,
                scenario: pastedText,
                visual: pastedText,
              }
            : candidate
        )),
      }))

      showToast({ message: 'Scene text replaced from clipboard', type: 'success' })
    } catch {
      showToast({ message: 'Could not read clipboard text', type: 'error' })
    }
  }, [showToast, updateStoryBibleData])

  const configDialog = isConfigDialogOpen && typeof document !== 'undefined'
    ? createPortal(
      <div className="lab-newlayout-workspace-home-config-backdrop" onClick={() => setConfigDialogOpen(false)}>
        <div
          className="lab-newlayout-workspace-home-config-dialog"
          role="dialog"
          aria-modal="true"
          aria-label="Configure story and scenes"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="lab-newlayout-workspace-home-config-head">
            <div>
              <div className="lab-newlayout-history-pane-title">Configure Story + Scenes</div>
              <p className="lab-newlayout-workspace-home-copy lab-newlayout-workspace-home-copy--muted">
                Scope: {selectedFolderPath.names.join(' / ') || selectedFolder?.name || 'Project root'}
              </p>
            </div>
          </div>

          <div className="lab-newlayout-workspace-home-config-body">
            <label className="lab-newlayout-workspace-home-config-field">
              <span>Story Summary</span>
              <textarea
                value={draftStoryText}
                onChange={(event) => setDraftStoryText(event.target.value)}
                placeholder="Paste story summary text for this scope"
              />
            </label>

            <div className="lab-newlayout-workspace-home-config-scene-shell">
              <aside className="lab-newlayout-workspace-home-config-scene-nav" aria-label="Scene list">
                <div className="lab-newlayout-workspace-home-config-scene-nav-head">
                  <span>Scenes</span>
                  <div className="lab-newlayout-workspace-home-config-scene-nav-actions">
                    <button type="button" className="lab-newlayout-history-toolbar-btn" onClick={handleAddScene}>Add</button>
                    <button
                      type="button"
                      className="lab-newlayout-history-toolbar-btn"
                      onClick={handleRemoveSelectedScene}
                      disabled={!selectedDraftScene}
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <div className="lab-newlayout-workspace-home-config-scene-nav-list">
                  {draftScenes.length > 0 ? draftScenes.map((scene) => (
                    renamingSceneId === scene.id ? (
                      <div
                        key={scene.id}
                        className={`lab-newlayout-workspace-home-config-scene-item${scene.id === selectedDraftSceneId ? ' is-active' : ''}`}
                      >
                        <input
                          type="text"
                          value={scene.title}
                          autoFocus
                          aria-label="Rename scene"
                          onChange={(event) => updateDraftSceneTitle(scene.id, event.target.value)}
                          onBlur={() => setRenamingSceneId(null)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault()
                              setRenamingSceneId(null)
                            }
                            if (event.key === 'Escape') {
                              event.preventDefault()
                              setRenamingSceneId(null)
                            }
                          }}
                        />
                      </div>
                    ) : (
                      <button
                        key={scene.id}
                        type="button"
                        className={`lab-newlayout-workspace-home-config-scene-item${scene.id === selectedDraftSceneId ? ' is-active' : ''}`}
                        onClick={() => {
                          setSelectedDraftSceneId(scene.id)
                          setRenamingSceneId(null)
                        }}
                        onDoubleClick={() => {
                          setSelectedDraftSceneId(scene.id)
                          setRenamingSceneId(scene.id)
                        }}
                      >
                        <span>{scene.title || scene.id}</span>
                      </button>
                    )
                  )) : (
                    <p className="lab-newlayout-workspace-home-copy lab-newlayout-workspace-home-copy--muted">
                      No scenes yet.
                    </p>
                  )}
                </div>
              </aside>

              <div className="lab-newlayout-workspace-home-config-scene-editor">
                {selectedDraftScene ? (
                  <label className="lab-newlayout-workspace-home-config-field">
                    <span>{selectedDraftScene.title || selectedDraftScene.id}</span>
                    <textarea
                      value={selectedDraftScene.text}
                      onChange={(event) => updateDraftSceneText(selectedDraftScene.id, event.target.value)}
                      placeholder="Paste scene text"
                    />
                  </label>
                ) : (
                  <p className="lab-newlayout-workspace-home-copy lab-newlayout-workspace-home-copy--muted">
                    Select a scene from the left list.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="lab-newlayout-workspace-home-config-actions">
            <button type="button" className="lab-newlayout-history-toolbar-btn" onClick={() => setConfigDialogOpen(false)}>
              Cancel
            </button>
            <button type="button" className="lab-newlayout-history-toolbar-btn" onClick={handleSaveConfig}>
              Save
            </button>
          </div>
        </div>
      </div>,
      document.body,
    )
    : null

  return (
    <div className="lab-newlayout-panel lab-newlayout-panel--workspace-home">
      <div className="lab-newlayout-workspace-home-shell">
        <div className="lab-newlayout-history-top-fixed">
          <div className="lab-newlayout-history-toolbar">
            <div className="lab-newlayout-history-toolbar-stats">
              <span className="lab-newlayout-history-stat">{homeTitle}</span>
              <span className="lab-newlayout-history-toolbar-note">
                {selectedProject ? selectedProject.name : (studioProjectsLoading ? 'Loading projects…' : 'No project selected')}
              </span>
              {selectedFolder || selectedFolderPath.names.length > 0 ? (
                <span className="lab-newlayout-history-toolbar-note">
                  {selectedFolderPath.names.join(' / ') || selectedFolder?.name || 'Project root'}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <div className="lab-newlayout-workspace-home-layout">
          <section className="lab-newlayout-history-section lab-newlayout-workspace-home-section">
            <div className="lab-newlayout-history-pane-kicker">Current Context</div>
            <div className="lab-newlayout-workspace-home-hero">
              <div>
                <div className="lab-newlayout-history-pane-title">
                  {selectedProject?.name || 'Select a project to restore the workspace view'}
                </div>
                <p className="lab-newlayout-workspace-home-copy">
                  {selectedProject?.description || 'Workspace Home keeps the main project context, story summary, and quick counts visible when you leave Flow focus mode.'}
                </p>
              </div>
              <div className="lab-newlayout-workspace-home-pill">
                {selectedFolderPath.names.join(' / ') || selectedFolder?.name || 'Project root'}
              </div>
            </div>
            <div className="lab-newlayout-workspace-home-metrics">
              <WorkspaceHomeMetricCard
                label="Folders"
                value={studioFolders.length}
                detail={studioFoldersLoading ? 'Loading folder tree…' : 'Accessible folders in the current project.'}
              />
              <WorkspaceHomeMetricCard
                label="Chapters"
                value={recentChapters.length > 0 ? recentChapters.length : storyBibleData.chapters.length}
                detail={studioActiveFolderId ? 'Visible in the selected folder.' : 'Available in the project story bible.'}
              />
              <WorkspaceHomeMetricCard
                label="Episodes"
                value={episodesInFolder}
                detail={studioActiveFolderId ? 'Episodes scoped to this folder.' : 'Episodes available across the project.'}
              />
              <WorkspaceHomeMetricCard
                label="Scenes"
                value={scenesInFolder}
                detail={studioActiveFolderId ? 'Scenes scoped to this folder.' : 'Scenes available across the project.'}
              />
            </div>
          </section>

          <section className="lab-newlayout-history-section lab-newlayout-workspace-home-section">
            <div className="lab-newlayout-workspace-home-section-head">
              <div className="lab-newlayout-history-pane-kicker">Story Snapshot</div>
              <button type="button" className="lab-newlayout-history-toolbar-btn" onClick={openConfigDialog}>
                Configure Story + Scenes
              </button>
            </div>
            <div className="lab-newlayout-workspace-home-columns">
              <div className="lab-newlayout-workspace-home-card">
                <div className="lab-newlayout-history-pane-title">Story</div>
                <p className="lab-newlayout-workspace-home-copy">
                  {storyBibleData.title || 'No story title yet.'}
                </p>
                <p className="lab-newlayout-workspace-home-copy lab-newlayout-workspace-home-copy--muted">
                  {scopedStorySummary || 'Use Configure Story + Scenes to paste summary text for this scope.'}
                </p>
              </div>

              <div className="lab-newlayout-workspace-home-card">
                <div className="lab-newlayout-history-pane-title">Recent Chapters</div>
                {recentChapters.length > 0 ? (
                  <div className="lab-newlayout-workspace-home-list">
                    {recentChapters.map((chapter) => (
                      <div key={chapter.id} className="lab-newlayout-workspace-home-list-item">
                        <strong>{chapter.title || chapter.id}</strong>
                        <span>{chapter.summary || 'No chapter summary yet.'}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="lab-newlayout-workspace-home-copy lab-newlayout-workspace-home-copy--muted">
                    No chapters in the current scope.
                  </p>
                )}
              </div>
            </div>
          </section>

          <section className="lab-newlayout-history-section lab-newlayout-workspace-home-section">
            <div className="lab-newlayout-history-pane-kicker">Scene Queue</div>
            {scopedScenes.length > 0 ? (
              <div className="lab-newlayout-workspace-home-scene-grid">
                {scopedScenes.map((scene) => (
                  <article key={scene.id} className="lab-newlayout-workspace-home-scene-card">
                    <div className="lab-newlayout-workspace-home-scene-head">
                      <strong>{scene.title || scene.id}</strong>
                      <span>{scene.durationSec}s</span>
                    </div>
                    <p>{scene.visual || scene.action || scene.scenario || 'No scene detail yet.'}</p>
                    <div className="lab-newlayout-workspace-home-scene-actions">
                      <button
                        type="button"
                        className="lab-newlayout-history-toolbar-btn"
                        onClick={() => { void handleCopySceneText(scene) }}
                      >
                        Copy Text
                      </button>
                      <button
                        type="button"
                        className="lab-newlayout-history-toolbar-btn"
                        onClick={() => { void handlePasteSceneText(scene) }}
                      >
                        Paste Text
                      </button>
                      <button
                        type="button"
                        className="lab-newlayout-history-toolbar-btn"
                        onClick={() => handleSendSceneToComposer(scene)}
                      >
                        Send to Composer
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="lab-newlayout-workspace-home-copy lab-newlayout-workspace-home-copy--muted">
                No scenes available in the current scope.
              </p>
            )}
          </section>
        </div>
      </div>
      {configDialog}
    </div>
  )
}

function StoryOverviewPanel(_props: IDockviewPanelProps<PanelSuggestionParams>) {
  const { storyBibleData } = useLabNewLayoutData()
  const { title: storyTitle, summary, chapters, characters } = storyBibleData

  return (
    <div className="lab-newlayout-panel lab-newlayout-panel--story-overview">
      <div className="lab-newlayout-history-top-fixed">
        <div className="lab-newlayout-history-toolbar">
          <div className="lab-newlayout-history-toolbar-stats">
            <span className="lab-newlayout-history-stat">Story Overview</span>
          </div>
        </div>
      </div>
      <div className="lab-newlayout-history-layout lab-newlayout-story-overview-layout">
        {storyTitle ? (
          <div className="lab-newlayout-history-section">
            <div className="lab-newlayout-history-pane-kicker">Title</div>
            <div className="lab-newlayout-history-pane-title">{storyTitle}</div>
          </div>
        ) : null}
        {summary ? (
          <div className="lab-newlayout-history-section">
            <div className="lab-newlayout-history-pane-kicker">Synopsis</div>
            <div className="lab-newlayout-story-overview-summary">{summary}</div>
          </div>
        ) : null}
        {chapters.length > 0 ? (
          <div className="lab-newlayout-history-section">
            <div className="lab-newlayout-history-pane-kicker">Chapters ({chapters.length})</div>
            {chapters.slice(0, 8).map((chapter) => (
              <div key={chapter.id} className="lab-newlayout-story-overview-list-item">
                {chapter.title || chapter.id}
              </div>
            ))}
          </div>
        ) : null}
        {characters.length > 0 ? (
          <div className="lab-newlayout-history-section">
            <div className="lab-newlayout-history-pane-kicker">Characters ({characters.length})</div>
            {characters.slice(0, 6).map((character) => (
              <div key={character.id} className="lab-newlayout-story-overview-list-item">
                {character.name || character.id}
              </div>
            ))}
          </div>
        ) : null}
        {!storyTitle && chapters.length === 0 && characters.length === 0 ? (
          <div className="lab-newlayout-story-overview-empty">
            No story data. Use the Story &amp; Bible editor to add content.
          </div>
        ) : null}
      </div>
    </div>
  )
}

function FlowPanel(props: IDockviewPanelProps<PanelSuggestionParams>) {
  const { showToast } = useToast()
  const {
    authUid,
    studioProjectId,
    studioProjects,
    studioFolders,
    studioActiveFolderId,
    setStudioProjectId,
    setStudioActiveFolderId,
  } = useLabNewLayoutData()
  const sampleWorkflow = useMemo(() => createWorkflowBuilderSampleWorkflow(), [])
  const [isPanelActive, setIsPanelActive] = useState<boolean>(props.api.isActive)
  const [flowsLoading, setFlowsLoading] = useState(false)
  const [flowItems, setFlowItems] = useState<StudioProjectFlowCanvasSummary[]>([])
  const [activeFlowScopeId, setActiveFlowScopeId] = useState<string | null>(null)
  const [draftFlowName, setDraftFlowName] = useState('')
  const [moveTargetFolderId, setMoveTargetFolderId] = useState<string | null>(null)
  const [isRenamingFlow, setIsRenamingFlow] = useState(false)
  const [isMovingFlow, setIsMovingFlow] = useState(false)

  useEffect(() => {
    const disposable = props.api.onDidActiveChange(() => {
      setIsPanelActive(props.api.isActive)
    })

    setIsPanelActive(props.api.isActive)
    return () => {
      disposable.dispose()
    }
  }, [props.api])

  const selectedFolderPath = useMemo(
    () => resolveFolderPath(studioActiveFolderId, studioFolders),
    [studioActiveFolderId, studioFolders],
  )

  useEffect(() => {
    if (!studioProjectId) {
      setFlowItems([])
      setActiveFlowScopeId(null)
      setFlowsLoading(false)
      return
    }

    setFlowsLoading(true)
    const unsubscribe = subscribeToProjectFlowCanvases(
      studioProjectId,
      (items) => {
        setFlowItems(items)
        setFlowsLoading(false)
      },
      (error) => {
        setFlowsLoading(false)
        showToast({
          message: error.message || 'Could not load project flows.',
          type: 'error',
        })
      },
    )

    return () => unsubscribe()
  }, [showToast, studioProjectId])

  const folderScopedFlows = useMemo(() => {
    const normalizedFolderId = studioActiveFolderId || null
    return flowItems.filter((item) => (item.folderId || null) === normalizedFolderId)
  }, [flowItems, studioActiveFolderId])

  useEffect(() => {
    if (folderScopedFlows.length === 0) {
      setActiveFlowScopeId(null)
      return
    }

    if (!activeFlowScopeId || !folderScopedFlows.some((item) => item.scopeId === activeFlowScopeId)) {
      setActiveFlowScopeId(folderScopedFlows[0].scopeId)
    }
  }, [activeFlowScopeId, folderScopedFlows])

  const selectedFlow = useMemo(
    () => flowItems.find((item) => item.scopeId === activeFlowScopeId) || null,
    [activeFlowScopeId, flowItems],
  )

  useEffect(() => {
    setDraftFlowName(selectedFlow?.flowName || '')
    setMoveTargetFolderId(selectedFlow?.folderId || studioActiveFolderId || null)
  }, [selectedFlow?.flowName, selectedFlow?.folderId, studioActiveFolderId])

  const selectedProjectName = useMemo(
    () => studioProjects.find((project) => project.id === studioProjectId)?.name || '',
    [studioProjectId, studioProjects],
  )
  const selectedFolderName = useMemo(
    () => studioFolders.find((folder) => folder.id === studioActiveFolderId)?.name || '',
    [studioActiveFolderId, studioFolders],
  )

  const flowScope = useMemo(() => activeFlowScopeId || '', [activeFlowScopeId])

  const effectiveFlowFolderId = selectedFlow?.folderId ?? studioActiveFolderId
  const effectiveFlowFolderPath = useMemo(
    () => resolveFolderPath(effectiveFlowFolderId, studioFolders),
    [effectiveFlowFolderId, studioFolders],
  )

  const flowStorageKey = useMemo(() => (
    `lab-newlayout-flow-canvas-v3:${studioProjectId || 'no-project'}:${flowScope || 'no-flow'}`
  ), [flowScope, studioProjectId])

  const createFlow = useCallback(async () => {
    if (!studioProjectId) {
      showToast({ message: 'Select a project before creating a flow.', type: 'warning' })
      return
    }

    const scopeId = `flow-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const folderPath = resolveFolderPath(studioActiveFolderId, studioFolders)
    const flowName = `Untitled Flow ${folderScopedFlows.length + 1}`

    await saveProjectFlowCanvasState({
      projectId: studioProjectId,
      scopeId,
      flowName,
      folderId: studioActiveFolderId,
      folderPathIds: folderPath.ids,
      folderPathNames: folderPath.names,
      updatedBy: authUid || 'anonymous',
      workflow: {
        nodes: sampleWorkflow.nodes as unknown[],
        edges: sampleWorkflow.edges as unknown[],
      },
    })

    setActiveFlowScopeId(scopeId)
    setDraftFlowName(flowName)
    showToast({ message: 'Flow created.', type: 'success' })
  }, [authUid, folderScopedFlows.length, sampleWorkflow.edges, sampleWorkflow.nodes, showToast, studioActiveFolderId, studioFolders, studioProjectId])

  const renameFlow = useCallback(async () => {
    if (!studioProjectId || !activeFlowScopeId) return
    const normalizedName = draftFlowName.trim() || 'Untitled Flow'

    setIsRenamingFlow(true)
    try {
      await renameProjectFlowCanvas(studioProjectId, activeFlowScopeId, normalizedName)
      setDraftFlowName(normalizedName)
      showToast({ message: 'Flow renamed.', type: 'success' })
    } finally {
      setIsRenamingFlow(false)
    }
  }, [activeFlowScopeId, draftFlowName, showToast, studioProjectId])

  const moveFlow = useCallback(async () => {
    if (!studioProjectId || !activeFlowScopeId) return

    setIsMovingFlow(true)
    try {
      const folderPath = resolveFolderPath(moveTargetFolderId, studioFolders)
      await moveProjectFlowCanvas({
        projectId: studioProjectId,
        scopeId: activeFlowScopeId,
        folderId: moveTargetFolderId,
        folderPathIds: folderPath.ids,
        folderPathNames: folderPath.names,
      })
      setStudioActiveFolderId(moveTargetFolderId)
      showToast({ message: 'Flow moved.', type: 'success' })
    } finally {
      setIsMovingFlow(false)
    }
  }, [activeFlowScopeId, moveTargetFolderId, setStudioActiveFolderId, showToast, studioFolders, studioProjectId])

  const readRemoteWorkflow = useCallback(async (): Promise<WorkflowBuilderDefinition | null> => {
    if (!studioProjectId || !flowScope) {
      return null
    }

    const remote = await loadProjectFlowCanvasState(studioProjectId, flowScope)
    if (!remote) {
      return null
    }

    return {
      nodes: remote.nodes as WorkflowBuilderDefinition['nodes'],
      edges: remote.edges as WorkflowBuilderDefinition['edges'],
    }
  }, [flowScope, studioProjectId])

  const saveRemoteWorkflow = useCallback(async (workflow: WorkflowBuilderDefinition) => {
    if (!studioProjectId || !flowScope) {
      return
    }

    await saveProjectFlowCanvasState({
      projectId: studioProjectId,
      scopeId: flowScope,
      flowName: (selectedFlow?.flowName || draftFlowName || '').trim() || 'Untitled Flow',
      folderId: effectiveFlowFolderId || null,
      folderPathIds: effectiveFlowFolderPath.ids,
      folderPathNames: effectiveFlowFolderPath.names,
      updatedBy: authUid || 'anonymous',
      workflow: {
        nodes: workflow.nodes as unknown[],
        edges: workflow.edges as unknown[],
      },
    })
  }, [authUid, draftFlowName, effectiveFlowFolderId, effectiveFlowFolderPath.ids, effectiveFlowFolderPath.names, flowScope, selectedFlow?.flowName, studioProjectId])

  const handleNotify = useCallback((notice: WorkflowBuilderNotice) => {
    showToast({ message: notice.message, type: notice.type || 'info' })
  }, [showToast])

  return (
    <div className="lab-newlayout-panel lab-newlayout-panel--flow">
      <div className="lab-newlayout-flow-manager">
        <div className="lab-newlayout-flow-manager-row">
          <label className="lab-newlayout-flow-manager-field">
            <span>Project</span>
            <select
              value={studioProjectId || ''}
              onChange={(event) => {
                const nextProjectId = event.target.value || null
                setStudioProjectId(nextProjectId)
                setStudioActiveFolderId(null)
                setActiveFlowScopeId(null)
              }}
            >
              <option value="">Select project</option>
              {studioProjects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
          </label>

          <label className="lab-newlayout-flow-manager-field">
            <span>Folder</span>
            <select
              value={studioActiveFolderId || FLOW_ROOT_FOLDER_VALUE}
              onChange={(event) => {
                const nextFolderId = event.target.value === FLOW_ROOT_FOLDER_VALUE ? null : event.target.value
                setStudioActiveFolderId(nextFolderId)
                setActiveFlowScopeId(null)
              }}
              disabled={!studioProjectId}
            >
              <option value={FLOW_ROOT_FOLDER_VALUE}>Project root</option>
              {studioFolders.map((folder) => (
                <option key={folder.id} value={folder.id}>{folder.name}</option>
              ))}
            </select>
          </label>

          <label className="lab-newlayout-flow-manager-field">
            <span>Flow</span>
            <select
              value={activeFlowScopeId || ''}
              onChange={(event) => setActiveFlowScopeId(event.target.value || null)}
              disabled={!studioProjectId || folderScopedFlows.length === 0}
            >
              <option value="">{flowsLoading ? 'Loading flows…' : 'Select flow'}</option>
              {folderScopedFlows.map((flow) => (
                <option key={flow.scopeId} value={flow.scopeId}>{flow.flowName}</option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="lab-newlayout-flow-manager-btn"
            disabled={!studioProjectId}
            onClick={() => { void createFlow() }}
          >
            New Flow
          </button>
        </div>

        <div className="lab-newlayout-flow-manager-row lab-newlayout-flow-manager-row--secondary">
          <label className="lab-newlayout-flow-manager-field lab-newlayout-flow-manager-field--wide">
            <span>Rename flow</span>
            <input
              type="text"
              value={draftFlowName}
              onChange={(event) => setDraftFlowName(event.target.value)}
              placeholder="Flow name"
              disabled={!selectedFlow}
            />
          </label>

          <button
            type="button"
            className="lab-newlayout-flow-manager-btn"
            disabled={!selectedFlow || isRenamingFlow}
            onClick={() => { void renameFlow() }}
          >
            {isRenamingFlow ? 'Renaming…' : 'Rename'}
          </button>

          <label className="lab-newlayout-flow-manager-field">
            <span>Move to folder</span>
            <select
              value={moveTargetFolderId || FLOW_ROOT_FOLDER_VALUE}
              onChange={(event) => setMoveTargetFolderId(event.target.value === FLOW_ROOT_FOLDER_VALUE ? null : event.target.value)}
              disabled={!selectedFlow}
            >
              <option value={FLOW_ROOT_FOLDER_VALUE}>Project root</option>
              {studioFolders.map((folder) => (
                <option key={folder.id} value={folder.id}>{folder.name}</option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="lab-newlayout-flow-manager-btn"
            disabled={!selectedFlow || isMovingFlow}
            onClick={() => { void moveFlow() }}
          >
            {isMovingFlow ? 'Moving…' : 'Move'}
          </button>
        </div>

        <div className="lab-newlayout-flow-scope-banner">
          <strong>Location:</strong>{' '}
          {selectedProjectName || 'No project'} / {(selectedFolderPath.names.join(' / ') || selectedFolderName || 'Project root')}
          <span>·</span>
          <strong>Flow:</strong> {selectedFlow?.flowName || 'None selected'}
        </div>
      </div>

      {!studioProjectId ? (
        <div className="lab-newlayout-flow-inactive-placeholder">
          Select a project to access workflow flows.
        </div>
      ) : !selectedFlow ? (
        <div className="lab-newlayout-flow-inactive-placeholder">
          No flow found in this folder. Create one from the top bar.
        </div>
      ) : isPanelActive ? (
        <WorkflowBuilderCanvas
          key={flowStorageKey}
          className="workflow-builder-canvas--fullscreen"
          initialWorkflow={sampleWorkflow}
          storageKey={flowStorageKey}
          readRemoteWorkflow={flowScope ? readRemoteWorkflow : undefined}
          saveRemoteWorkflow={flowScope ? saveRemoteWorkflow : undefined}
          onNotify={handleNotify}
          onExecuteWorkflow={async () => { /* handled by canvas */ }}
        />
      ) : (
        <div className="lab-newlayout-flow-inactive-placeholder">
          Flow canvas is paused while this tab is inactive.
        </div>
      )}
    </div>
  )
}

const GALLERY_PAGE_SIZE = 30

const LIKED_HISTORY_LOCAL_KEY = 'lab-newlayout-liked-history-ids-v1'
const LIKED_REFERENCES_LOCAL_KEY = 'lab-newlayout-liked-reference-urls-v1'
const DOWNLOADED_HISTORY_LOCAL_KEY = 'lab-newlayout-downloaded-video-urls-v1'
const DOWNLOADED_HISTORY_COUNTER_LOCAL_KEY = 'lab-newlayout-downloaded-video-counter-v1'
const LAB_NEWLAYOUT_HISTORY_REF_MIME = 'application/x-lab-newlayout-reference'

type DragReferencePayload = {
  url: string
  kind: 'image' | 'video' | 'audio'
  name: string
  fromHistory?: boolean
}

type ReferenceLibraryFilterMode = 'all' | 'liked' | 'image' | 'video' | 'audio'

type PendingReferenceUpload = {
  id: string
  kind: StudioReferenceAsset['kind']
  name: string
  createdAt: number
  isPending: true
}

type VisibleReferenceItem = StudioReferenceAsset | PendingReferenceUpload | PendingGenerationAsset

const isPendingReferenceUpload = (item: VisibleReferenceItem): item is PendingReferenceUpload => (
  (item as PendingReferenceUpload).isPending === true
)

const isPendingGenerationAsset = (item: VisibleReferenceItem): item is PendingGenerationAsset => (
  (item as PendingGenerationAsset).isPendingGeneration === true
)

function inferReferenceMediaKindFromUrl(url: string): 'image' | 'video' | 'audio' {
  const normalizedInput = url.trim().toLowerCase()
  let normalized = normalizedInput
  try {
    normalized = decodeURIComponent(normalizedInput)
  } catch {
    // use raw URL when decoding fails
  }
  if (/(\.mp4|\.webm|\.mov|\.m4v|\.avi|\.mkv)(\?|#|$)/.test(normalized)) {
    return 'video'
  }
  if (/(\.mp3|\.wav|\.ogg|\.m4a|\.aac|\.flac)(\?|#|$)/.test(normalized)) {
    return 'audio'
  }
  return 'image'
}

function inferReferenceKindFromUrl(url: string): 'image' | 'video' {
  return inferReferenceMediaKindFromUrl(url) === 'video' ? 'video' : 'image'
}

const buildExtendPromptPrefix = (tabMode: 'before' | 'after'): string => (
  tabMode === 'before'
    ? 'Generate the content before video 1.'
    : 'Generate the content after video 1.'
)

const isFirebaseHistoryUrl = (url: string): boolean => url.toLowerCase().includes('firebasestorage')

const readPayloadString = (payload: Record<string, unknown> | null, ...keys: string[]): string => {
  if (!payload) return ''
  for (const key of keys) {
    const value = payload[key]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }
  return ''
}

const readPayloadBoolean = (payload: Record<string, unknown> | null, ...keys: string[]): boolean | undefined => {
  if (!payload) return undefined
  for (const key of keys) {
    const value = payload[key]
    if (typeof value === 'boolean') {
      return value
    }
  }
  return undefined
}

const buildComposerSeedSettingsFromEntry = (entry: LabNewLayoutGalleryHistoryEntry): Pick<ComposerReuseSeed, 'ratio' | 'resolution' | 'duration' | 'generateAudio' | 'model' | 'provider'> => {
  const payload = entry.requestPayload
  const provider = readPayloadString(payload, 'providerHint', 'provider', 'provider_hint') || entry.provider || 'atlas'
  const rawModel = readPayloadString(payload, 'model') || entry.model || ''

  return {
    ratio: entry.ratio || readPayloadString(payload, 'ratio', 'aspect_ratio') || undefined,
    resolution: entry.resolution || readPayloadString(payload, 'resolution') || undefined,
    duration: entry.duration ?? (typeof payload?.duration === 'number' ? payload.duration : undefined),
    generateAudio: entry.generateAudio ?? readPayloadBoolean(payload, 'generate_audio', 'generateAudio'),
    model: normalizeComposerModelId(rawModel, provider),
    provider,
  }
}

function buildRequestPayloadFallback(entry: LabNewLayoutGalleryHistoryEntry): Record<string, unknown> {
  const referenceImages: string[] = []
  const referenceVideos: string[] = []
  const referenceAudios: string[] = []

  Object.entries(entry.mediaUrls)
    .filter(([, url]) => Boolean(url) && url !== entry.resultUrl)
    .forEach(([key, url]) => {
      const kind: 'image' | 'video' | 'audio' = key.startsWith('video')
        ? 'video'
        : key.startsWith('audio')
          ? 'audio'
          : key.startsWith('image')
            ? 'image'
            : inferReferenceMediaKindFromUrl(url)

      if (kind === 'video') {
        referenceVideos.push(url)
        return
      }
      if (kind === 'audio') {
        referenceAudios.push(url)
        return
      }
      referenceImages.push(url)
    })

  return {
    model: entry.model,
    provider: entry.provider,
    prompt: entry.prompt,
    ratio: entry.ratio,
    resolution: entry.resolution,
    duration: entry.duration,
    generateAudio: entry.generateAudio,
    ...(referenceImages.length > 0 ? { reference_images: referenceImages } : {}),
    ...(referenceVideos.length > 0 ? { reference_videos: referenceVideos } : {}),
    ...(referenceAudios.length > 0 ? { reference_audios: referenceAudios } : {}),
  }
}

const toApiUrl = (apiBaseUrl: string, path: string): string => {
  const base = (apiBaseUrl || '').trim().replace(/\/$/, '')
  return base ? `${base}${path}` : path
}

const resolveProxySourceUrl = (url: string): string => {
  const trimmed = url.trim()
  if (!trimmed) return ''
  try {
    const fallbackOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
    const parsed = new URL(trimmed, fallbackOrigin)
    if (!parsed.pathname.endsWith('/api/video-proxy')) {
      return trimmed
    }
    const original = parsed.searchParams.get('url') || ''
    return original.trim() || trimmed
  } catch {
    return trimmed
  }
}

const shouldBypassVideoProxy = (sourceUrl: string): boolean => {
  try {
    const fallbackOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost'
    const parsed = new URL(sourceUrl, fallbackOrigin)
    if (parsed.origin === fallbackOrigin) {
      return false
    }
    const isFirebaseStorageHost = parsed.hostname.toLowerCase() === 'firebasestorage.googleapis.com'
      || parsed.hostname.toLowerCase().endsWith('.firebasestorage.app')
    if (isFirebaseStorageHost) {
      return false
    }
    return parsed.searchParams.has('token')
      || parsed.searchParams.has('X-Amz-Algorithm')
      || parsed.searchParams.has('X-Amz-Signature')
      || parsed.searchParams.has('X-Tos-Algorithm')
      || parsed.searchParams.has('X-Tos-Signature')
      || parsed.searchParams.has('signature')
      || parsed.searchParams.has('expires')
  } catch {
    return false
  }
}

const buildVideoProxyUrl = (sourceUrl: string): string => {
  const normalizedSourceUrl = resolveProxySourceUrl(sourceUrl)
  if (!normalizedSourceUrl) return ''
  if (shouldBypassVideoProxy(normalizedSourceUrl)) return ''
  return `${toApiUrl(CHATBOT_BASE, '/api/video-proxy')}?url=${encodeURIComponent(normalizedSourceUrl)}`
}

const shouldPreferProxyForPreview = (resolution: string | null | undefined): boolean => {
  const normalized = (resolution || '').trim().toLowerCase()
  return normalized.includes('1080') || normalized.includes('full')
}

const isImageResultUrl = (url: string): boolean => {
  const lower = url.trim().toLowerCase()
  if (!lower) return false
  return /\.(jpg|jpeg|png|webp|gif|avif|svg)(\?|#|$)/.test(lower)
}

// Resolves a numeric sort key for a reference library item (newest = highest).
// Tries createdAt (Timestamp or plain number), then falls back to the ms
// timestamp embedded in the item ID (format: ref-{ms}-{random}).
const resolveReferenceItemSortKey = (item: { createdAt?: unknown; id?: string; name?: string }): number => {
  const ca = item.createdAt
  let result = 0
  if (typeof ca === 'number' && ca > 0) result = ca
  else if (ca && typeof (ca as { toMillis?: unknown }).toMillis === 'function') {
    result = (ca as { toMillis: () => number }).toMillis()
  }
  else if (ca && typeof (ca as { seconds?: unknown }).seconds === 'number') {
    result = (ca as { seconds: number }).seconds * 1000
  }
  else if (ca && typeof (ca as { _seconds?: unknown })._seconds === 'number') {
    result = (ca as { _seconds: number })._seconds * 1000
  }
  else if (typeof ca === 'string') {
    const parsed = Date.parse(ca)
    if (!isNaN(parsed) && parsed > 0) result = parsed
  }
  else if (typeof item.id === 'string') {
    const m = item.id.match(/(?:^|-)([1-9]\d{11,12})(?:-|$)/)
    if (m) result = Number(m[1])
  }
  
  if (result === 0) {
    console.warn(`[LabNewLayout] Reference item missing sort key:`, item.name || item.id, ca)
  }
  return result
}

const sanitizeFileNameSegment = (value: string, fallback: string): string => {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/["'`]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')

  return normalized || fallback
}

// Unicode-safe variant — keeps Arabic, CJK, and other non-ASCII letters/digits.
// Only strips characters that are illegal or problematic in filenames.
const sanitizeUnicodeFileNameSegment = (value: string, fallback: string): string => {
  const normalized = value
    .trim()
    .replace(/[\/\\:*?"<>|\x00-\x1F]/g, '-')
    .replace(/ +/g, '_')
    .replace(/-+/g, '-')
    .replace(/^[-_]|[-_]$/g, '')

  return normalized || fallback
}

const summarizePromptForFileName = (prompt: string): string => {
  const words = prompt
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 7)
    .join('-')
  return sanitizeFileNameSegment(words, 'prompt')
}

const extractSceneNameFromPayload = (payload: Record<string, unknown> | null): string => {
  if (!payload) return ''
  const keys = ['sceneName', 'sceneTitle', 'scene', 'activeSceneName', 'activeSceneTitle'] as const
  for (const key of keys) {
    const value = payload[key]
    if (typeof value === 'string' && value.trim()) {
      return value.trim()
    }
  }
  return ''
}

const readAndIncrementDownloadCounter = (): number => {
  if (typeof window === 'undefined') return 1
  try {
    const raw = window.localStorage.getItem(DOWNLOADED_HISTORY_COUNTER_LOCAL_KEY)
    const previous = raw ? Number(raw) : 0
    const safePrevious = Number.isFinite(previous) && previous > 0 ? Math.floor(previous) : 0
    const next = safePrevious + 1
    window.localStorage.setItem(DOWNLOADED_HISTORY_COUNTER_LOCAL_KEY, String(next))
    return next
  } catch {
    return Math.floor(Date.now() / 1000)
  }
}

const detectDownloadExtension = (sourceUrl: string): string => {
  try {
    const parsed = new URL(sourceUrl, window.location.origin)
    const pathParts = decodeURIComponent(parsed.pathname).split('/').filter(Boolean)
    const lastPathPart = pathParts[pathParts.length - 1] || ''
    const extension = (lastPathPart.match(/\.([a-z0-9]{2,5})$/i)?.[1] || '').toLowerCase()
    if (extension) {
      return extension
    }
  } catch {
    // ignore URL parse errors
  }
  return 'mp4'
}

const buildDownloadFileName = (
  _entry: LabNewLayoutGalleryHistoryEntry,
  sourceUrl: string,
  context: {
    projectName: string
    folderName: string
    sceneName: string
    prefix: string
  },
): string => {
  const projectSegment = sanitizeUnicodeFileNameSegment(context.projectName, 'project')
  const folderSegment = sanitizeUnicodeFileNameSegment(context.folderName, 'folder')
  const sceneSegment = sanitizeFileNameSegment(context.sceneName, '')
  const counter = String(readAndIncrementDownloadCounter()).padStart(4, '0')
  const extension = detectDownloadExtension(sourceUrl)

  const parts = [projectSegment, folderSegment, sceneSegment, counter].filter(Boolean)
  return `${parts.join('-')}.${extension}`
}

const triggerDownload = (href: string, fileName: string) => {
  const anchor = document.createElement('a')
  anchor.href = href
  anchor.download = fileName
  anchor.rel = 'noreferrer'
  anchor.target = '_self'
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
}

const downloadVideoToFile = async (sourceUrl: string, fileName: string): Promise<void> => {
  const normalizedSourceUrl = resolveProxySourceUrl(sourceUrl)
  if (!normalizedSourceUrl) {
    throw new Error('No video URL was available to download.')
  }

  const proxyUrl = buildVideoProxyUrl(normalizedSourceUrl) || normalizedSourceUrl
  const response = await fetch(proxyUrl)
  if (!response.ok) {
    throw new Error(`Failed to download video (HTTP ${response.status}).`)
  }

  const blob = await response.blob()
  const objectUrl = URL.createObjectURL(blob)
  triggerDownload(objectUrl, fileName)
  // Revoke after a generous delay — revoking immediately after click() truncates
  // the file because the browser hasn't finished reading the blob yet.
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
}

function buildHistoryReferencePayload(entry: LabNewLayoutGalleryHistoryEntry): DragReferencePayload | null {
  const mediaUrl = (entry.resultUrl || Object.values(entry.mediaUrls)[0] || '').trim()
  if (!mediaUrl) return null

  const matchedMediaKey = Object.entries(entry.mediaUrls).find(([, url]) => url === mediaUrl)?.[0] || ''
  const kind: 'image' | 'video' = entry.resultUrl && mediaUrl === entry.resultUrl
    ? 'video'
    : matchedMediaKey.startsWith('video')
      ? 'video'
      : matchedMediaKey.startsWith('image')
        ? 'image'
        : inferReferenceKindFromUrl(mediaUrl)

  return {
    url: mediaUrl,
    kind,
    name: entry.model || `History ${kind}`,
    fromHistory: true,
  }
}

function readHistoryReferencePayload(dataTransfer: DataTransfer): DragReferencePayload | null {
  const raw = dataTransfer.getData(LAB_NEWLAYOUT_HISTORY_REF_MIME)
  if (!raw) return null

  try {
    const parsed = JSON.parse(raw) as Partial<DragReferencePayload>
    if (!parsed || typeof parsed.url !== 'string') return null
    const url = parsed.url.trim()
    if (!url) return null
    const kind: 'image' | 'video' = parsed.kind === 'video' ? 'video' : 'image'
    const name = typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.trim() : `History ${kind}`
    const fromHistory = parsed.fromHistory === true
    return { url, kind, name, fromHistory }
  } catch {
    return null
  }
}

const readLikedHistoryIds = (): Set<string> => {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(LIKED_HISTORY_LOCAL_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return new Set(parsed.filter((value): value is string => typeof value === 'string'))
    }
  } catch {
    // ignore parse errors
  }
  return new Set()
}

const writeLikedHistoryIds = (ids: Set<string>): void => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LIKED_HISTORY_LOCAL_KEY, JSON.stringify(Array.from(ids)))
  } catch {
    // ignore quota errors
  }
}

function useLikedHistoryIds() {
  const [likedIds, setLikedIds] = useState<Set<string>>(() => readLikedHistoryIds())

  const toggle = useCallback((id: string) => {
    setLikedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      writeLikedHistoryIds(next)
      return next
    })
  }, [])

  return { likedIds, toggle }
}

const readDownloadedHistoryUrls = (): Set<string> => {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(DOWNLOADED_HISTORY_LOCAL_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return new Set(parsed.filter((value): value is string => typeof value === 'string' && value.trim().length > 0))
    }
  } catch {
    // ignore parse errors
  }
  return new Set()
}

const writeDownloadedHistoryUrls = (urls: Set<string>): void => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(DOWNLOADED_HISTORY_LOCAL_KEY, JSON.stringify(Array.from(urls)))
  } catch {
    // ignore quota errors
  }
}

function useDownloadedHistoryUrls() {
  const [downloadedUrls, setDownloadedUrls] = useState<Set<string>>(() => readDownloadedHistoryUrls())

  const markDownloaded = useCallback((url: string) => {
    const normalized = url.trim()
    if (!normalized) return
    setDownloadedUrls((current) => {
      if (current.has(normalized)) return current
      const next = new Set(current)
      next.add(normalized)
      writeDownloadedHistoryUrls(next)
      return next
    })
  }, [])

  const isDownloaded = useCallback((url: string) => downloadedUrls.has(url.trim()), [downloadedUrls])

  return { markDownloaded, isDownloaded }
}

type HistoryGalleryFilterMode = 'all' | 'liked' | 'failed'

type GalleryCardProps = {
  entry: LabNewLayoutGalleryHistoryEntry
  onClick: () => void
  isLiked: boolean
  onToggleLike: (id: string) => void
  isDownloaded: boolean
  onDownloadVideo?: (entry: LabNewLayoutGalleryHistoryEntry, sourceUrl: string) => void
  onReuse?: (entry: LabNewLayoutGalleryHistoryEntry) => void
  onMoveToFirebase?: (entry: LabNewLayoutGalleryHistoryEntry) => void
  isMovingToFirebase?: boolean
  onExtendBefore?: (entry: LabNewLayoutGalleryHistoryEntry) => void
  onExtendAfter?: (entry: LabNewLayoutGalleryHistoryEntry) => void
  onSetCompareBefore?: (url: string) => void
  onSetCompareAfter?: (url: string) => void
  onDelete?: (id: string) => void
  onCapturePoster?: (id: string, dataUrl: string) => void
}

function ExpiryBadgeForCard({ entry }: { entry: LabNewLayoutGalleryHistoryEntry }) {
  if (!entry.submittedAt) return null
  const expiryInfo = calculateUrlExpiry(entry.submittedAt)
  return (
    <span className={`lab-newlayout-history-gallery-expiry-badge-label ${getExpiryStatusClass(expiryInfo)}`}>
      {getExpiryStatusLabel(expiryInfo)}
    </span>
  )
}

function GalleryCard({
  entry,
  onClick,
  isLiked,
  onToggleLike,
  isDownloaded,
  onDownloadVideo,
  onReuse,
  onMoveToFirebase,
  isMovingToFirebase,
  onExtendBefore,
  onExtendAfter,
  onSetCompareBefore,
  onSetCompareAfter,
  onDelete,
  onCapturePoster,
}: GalleryCardProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const idleTimerRef = useRef<number | null>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [isOverlayIdleHidden, setIsOverlayIdleHidden] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [failedPlaybackSource, setFailedPlaybackSource] = useState('')
  const mediaUrl = entry.resultUrl || Object.values(entry.mediaUrls)[0] || ''
  const isImageResult = isImageResultUrl(mediaUrl)
  const normalizedMediaUrl = useMemo(() => resolveProxySourceUrl(mediaUrl), [mediaUrl])
  const proxyMediaUrl = useMemo(() => buildVideoProxyUrl(normalizedMediaUrl), [normalizedMediaUrl])
  const playbackUrl = useMemo(() => {
    if (!normalizedMediaUrl) return ''
    const prefersProxy = shouldPreferProxyForPreview(entry.resolution)
    const primaryUrl = prefersProxy ? (proxyMediaUrl || normalizedMediaUrl) : normalizedMediaUrl
    const secondaryUrl = prefersProxy ? normalizedMediaUrl : (proxyMediaUrl || normalizedMediaUrl)
    if (failedPlaybackSource === normalizedMediaUrl) {
      return secondaryUrl
    }
    return primaryUrl
  }, [entry.resolution, failedPlaybackSource, normalizedMediaUrl, proxyMediaUrl])
  const isInProgress = entry.status === 'queued' || entry.status === 'running'
  const galleryErrorInfo = useMemo(() => {
    if (entry.status !== 'failed') return null
    const msg = (entry.errorMessage ?? '').toLowerCase()
    if (msg.includes('sensitive') || msg.includes('inappropriate audio') || msg.includes('audio content') || msg.includes('output audio')) {
      return { kind: 'sensitive-audio' as const, label: 'Sensitive audio', icon: '\u{1F507}' }
    }
    if (msg.includes('credit') || msg.includes('quota') || msg.includes('balance') || msg.includes('insufficient') || msg.includes('limit exceeded') || msg.includes('no credit')) {
      return { kind: 'no-credit' as const, label: 'No credits', icon: '\u26A0\uFE0F' }
    }
    return { kind: 'generic' as const, label: 'Generation failed', icon: '\u26A0\uFE0F' }
  }, [entry.status, entry.errorMessage])
  const isReferenceUploading = Boolean(isMovingToFirebase)
  const isReferenceUploaded = entry.status === 'success' && Boolean(entry.resultUrl) && entry.resultUrl.includes('firebasestorage')
  const isReferenceMissing = entry.status === 'success' && !isReferenceUploading && !isReferenceUploaded
  const dragPayload = useMemo(() => buildHistoryReferencePayload(entry), [entry])
  const cachedPosterUrl = useMemo(() => {
    const normalized = normalizedMediaUrl.trim()
    const raw = mediaUrl.trim()

    if (entry.posterUrl) {
      if (normalized) {
        _historyPosterCache.set(normalized, entry.posterUrl)
      }
      if (raw) {
        _historyPosterCache.set(raw, entry.posterUrl)
      }
      return entry.posterUrl
    }

    if (normalized && _historyPosterCache.has(normalized)) {
      return _historyPosterCache.get(normalized) || ''
    }

    if (raw && _historyPosterCache.has(raw)) {
      return _historyPosterCache.get(raw) || ''
    }

    return ''
  }, [entry.posterUrl, mediaUrl, normalizedMediaUrl])

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current !== null) {
      window.clearTimeout(idleTimerRef.current)
      idleTimerRef.current = null
    }
  }, [])

  const scheduleIdleOverlayHide = useCallback(() => {
    clearIdleTimer()
    setIsOverlayIdleHidden(false)
    if (typeof window === 'undefined') return
    idleTimerRef.current = window.setTimeout(() => {
      setIsOverlayIdleHidden(true)
    }, 2200)
  }, [clearIdleTimer])

  useEffect(() => () => clearIdleTimer(), [clearIdleTimer])

  const showActionOverlays = isHovered && !isOverlayIdleHidden

  const hoverHandlers = {
    onMouseEnter: () => {
      setIsHovered(true)
      scheduleIdleOverlayHide()
      if (videoRef.current && mediaUrl) {
        videoRef.current.muted = false
        videoRef.current.play().catch(() => { /* silent */ })
      }
    },
    onMouseMove: () => {
      if (isHovered) {
        scheduleIdleOverlayHide()
      }
    },
    onMouseLeave: () => {
      clearIdleTimer()
      setIsHovered(false)
      setIsOverlayIdleHidden(false)
      setConfirmingDelete(false)
      if (videoRef.current) {
        videoRef.current.pause()
        videoRef.current.currentTime = 0
        videoRef.current.muted = true
      }
    },
  }

  const handleDragStart = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (!dragPayload) return
    event.dataTransfer.effectAllowed = 'copy'
    event.dataTransfer.setData(LAB_NEWLAYOUT_HISTORY_REF_MIME, JSON.stringify(dragPayload))
    event.dataTransfer.setData('text/uri-list', dragPayload.url)
    event.dataTransfer.setData('text/plain', dragPayload.url)
  }, [dragPayload])

  return (
    <div
      className={`lab-newlayout-history-gallery-card${mediaUrl ? ' is-clickable' : ''}${dragPayload ? ' is-draggable' : ''}${isInProgress ? ' is-in-progress' : ''}${galleryErrorInfo ? ' is-failed' : ''}${isHovered && isOverlayIdleHidden ? ' is-overlay-idle-hidden' : ''}`}
      draggable={Boolean(dragPayload)}
      onDragStart={handleDragStart}
      {...hoverHandlers}
    >
      <div className="lab-newlayout-history-gallery-media">
        {!isImageResult && cachedPosterUrl ? (
          <img
            className={`lab-newlayout-history-gallery-poster${isHovered ? ' is-hidden' : ''}`}
            src={cachedPosterUrl}
            alt=""
          />
        ) : null}
        {mediaUrl ? (
          isImageResult ? (
            <img
              className="lab-newlayout-history-gallery-preview"
              src={mediaUrl}
              alt=""
              loading="lazy"
            />
          ) : (
            <video
              ref={videoRef}
              className="lab-newlayout-history-gallery-preview"
              src={playbackUrl ? (buildVideoProxyUrl(playbackUrl) || playbackUrl) : ''}
              poster={cachedPosterUrl || undefined}
              crossOrigin={(buildVideoProxyUrl(playbackUrl) || playbackUrl).includes('/api/video-proxy') ? undefined : 'anonymous'}
              playsInline
              preload={cachedPosterUrl ? 'none' : 'auto'}
              onLoadedData={(event) => {
                if (cachedPosterUrl || !onCapturePoster) return
                const dataUrl = _captureVideoFrame(event.currentTarget)
                if (dataUrl) {
                  const normalized = normalizedMediaUrl.trim()
                  const raw = mediaUrl.trim()
                  if (normalized) {
                    _historyPosterCache.set(normalized, dataUrl)
                  }
                  if (raw) {
                    _historyPosterCache.set(raw, dataUrl)
                  }
                  event.currentTarget.poster = dataUrl
                  onCapturePoster(entry.id, dataUrl)
                }
              }}
              onError={() => {
                if (!normalizedMediaUrl || !proxyMediaUrl || failedPlaybackSource === normalizedMediaUrl) return
                setFailedPlaybackSource(normalizedMediaUrl)
              }}
              onContextMenu={(event) => {
                if (!onDownloadVideo || entry.status !== 'success') return
                event.preventDefault()
                event.stopPropagation()
                onDownloadVideo(entry, playbackUrl || mediaUrl)
              }}
            />
          )
        ) : (
          <div className="lab-newlayout-history-gallery-preview" />
        )}
        {isImageResult && entry.status === 'success' ? (
          <div className="lab-newlayout-history-gallery-image-badge" aria-label="Image generation">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            IMG
          </div>
        ) : null}
        {galleryErrorInfo ? (
          <div className={`lab-newlayout-history-gallery-error-overlay lab-newlayout-history-gallery-error-overlay--${galleryErrorInfo.kind}`}>
            <div
              className="lab-newlayout-history-gallery-error-chip"
              title={entry.errorMessage || galleryErrorInfo.label}
              aria-label={entry.errorMessage || galleryErrorInfo.label}
            >
              <span className="lab-newlayout-history-gallery-error-icon" aria-hidden="true">{galleryErrorInfo.icon}</span>
            </div>
          </div>
        ) : null}
        {isInProgress ? (
          <div className="lab-newlayout-history-gallery-running-overlay" role="status" aria-live="polite">
            <div className="lab-newlayout-history-gallery-running-indicator">
              <span className="lab-newlayout-history-gallery-running-spinner" aria-hidden="true" />
              Running
            </div>
          </div>
        ) : null}
        {isInProgress ? (
          <div className="lab-newlayout-history-gallery-progress" aria-hidden="true">
            <div className="lab-newlayout-history-gallery-progress-bar" />
          </div>
        ) : null}
      </div>
      {entry.status === 'success' && entry.resultUrl && entry.submittedAt && !entry.resultUrl.includes('firebasestorage') && !showActionOverlays ? (
        <div className="lab-newlayout-history-gallery-expiry-badge">
          <ExpiryBadgeForCard entry={entry} />
        </div>
      ) : null}
      {isReferenceMissing && !showActionOverlays ? (
        <div
          className="lab-newlayout-history-gallery-reference-warning"
          aria-label="Not referenced yet"
          title="Not referenced yet. Save to project references from the player."
        >
          <span aria-hidden="true">!</span>
        </div>
      ) : null}
      {onDownloadVideo && showActionOverlays && entry.status === 'success' && mediaUrl && !confirmingDelete ? (
        <button
          type="button"
          className={`lab-newlayout-history-gallery-download-btn${isDownloaded ? ' is-downloaded' : ''}`}
          onClick={(event) => {
            event.stopPropagation()
            onDownloadVideo(entry, playbackUrl || mediaUrl)
          }}
          aria-label={isDownloaded ? 'Downloaded (click to download again)' : 'Download video'}
          title={isDownloaded ? 'Downloaded (click to download again)' : 'Download video'}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
        </button>
      ) : null}
      {showActionOverlays || isLiked ? (
        <button
          type="button"
          className={`lab-newlayout-history-gallery-like-mini${isLiked ? ' is-liked' : ''}${!showActionOverlays && isLiked ? ' is-persistent' : ''}`}
          onClick={(event) => {
            event.stopPropagation()
            onToggleLike(entry.id)
          }}
          aria-label={isLiked ? 'Unlike' : 'Like'}
          title={isLiked ? 'Unlike' : 'Like'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
      ) : null}
      {onDelete && (showActionOverlays || confirmingDelete) ? (
        confirmingDelete ? (
          <div className="lab-newlayout-history-gallery-delete-confirm">
            <span>Delete?</span>
            <button
              type="button"
              className="lab-newlayout-history-gallery-delete-yes"
              onClick={(event) => { event.stopPropagation(); onDelete(entry.id) }}
            >
              Yes
            </button>
            <button
              type="button"
              className="lab-newlayout-history-gallery-delete-no"
              onClick={(event) => { event.stopPropagation(); setConfirmingDelete(false) }}
            >
              No
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="lab-newlayout-history-gallery-delete-btn"
            onClick={(event) => { event.stopPropagation(); setConfirmingDelete(true) }}
            aria-label="Delete generation"
            title="Delete"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </button>
        )
      ) : null}
      {onReuse && showActionOverlays && !confirmingDelete ? (
        <button
          type="button"
          className="lab-newlayout-history-gallery-reuse-btn"
          onClick={(event) => { event.stopPropagation(); onReuse(entry) }}
          aria-label="Reuse generation settings"
          title="Reuse"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M8 3H5a2 2 0 0 0-2 2v3" />
            <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
            <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
            <path d="M3 16v3a2 2 0 0 0 2 2h3" />
            <path d="M8 12h8" />
            <path d="M12 8l4 4-4 4" />
          </svg>
        </button>
      ) : null}
      {onMoveToFirebase
        && showActionOverlays
        && !confirmingDelete
        && entry.status === 'success'
        && !!entry.resultUrl ? (
          <button
            type="button"
            className="lab-newlayout-history-gallery-move-btn"
            onClick={(event) => { event.stopPropagation(); onMoveToFirebase(entry) }}
            aria-label="Save to project references"
            title="Save to project references"
            disabled={Boolean(isMovingToFirebase)}
          >
            {isMovingToFirebase ? '...' : 'Ref'}
          </button>
        ) : null}
      {((onSetCompareBefore || onSetCompareAfter || onExtendBefore || onExtendAfter) && showActionOverlays && !confirmingDelete) ? (
        <div className="lab-newlayout-history-gallery-extend-actions">
          {(onSetCompareBefore || onSetCompareAfter) && entry.status === 'success' && mediaUrl ? (
            <>
              <button
                type="button"
                className="lab-newlayout-history-gallery-compare-set-btn"
                onClick={(event) => { event.stopPropagation(); onSetCompareBefore?.(mediaUrl) }}
                aria-label="Set as Before in comparison"
                title="Set as Before"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="3" width="20" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/></svg>
                <span>B</span>
              </button>
              <button
                type="button"
                className="lab-newlayout-history-gallery-compare-set-btn"
                onClick={(event) => { event.stopPropagation(); onSetCompareAfter?.(mediaUrl) }}
                aria-label="Set as After in comparison"
                title="Set as After"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="3" width="20" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/></svg>
                <span>A</span>
              </button>
            </>
          ) : null}
          {(onExtendBefore || onExtendAfter) ? (
            <>
              <button
                type="button"
                className="lab-newlayout-history-gallery-extend-btn"
                onClick={(event) => { event.stopPropagation(); onExtendBefore?.(entry) }}
                aria-label="Extend before"
                title="Extend Before"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M19 12H9" />
                  <path d="m12 15-3-3 3-3" />
                  <path d="M5 5v14" />
                </svg>
              </button>
              <button
                type="button"
                className="lab-newlayout-history-gallery-extend-btn"
                onClick={(event) => { event.stopPropagation(); onExtendAfter?.(entry) }}
                aria-label="Extend after"
                title="Extend After"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12h10" />
                  <path d="m12 9 3 3-3 3" />
                  <path d="M19 5v14" />
                </svg>
              </button>
            </>
          ) : null}
        </div>
      ) : null}
      {mediaUrl ? (
        <button
          type="button"
          className="lab-newlayout-history-gallery-hitbox"
          onClick={onClick}
          aria-label="Open generation details"
        />
      ) : null}
    </div>
  )
}

function HistoryGallerySuggestionPanel(props: IDockviewPanelProps<PanelSuggestionParams>) {
  const panelParams = props.params ?? {}
  const {
    authUid,
    studioProjectId,
    studioActiveFolderId,
    studioProjects,
    studioFolders,
    storyBibleData,
    projectReferenceLibraryItems,
    setCompareBeforeUrl,
    setCompareAfterUrl,
    setCompareOverlayOpen,
  } = useLabNewLayoutData()
  const {
    entries,
    isLoading,
    isLoadingMore,
    hasMoreRemote,
    errorMessage,
    refresh,
    loadMoreRemote,
    deleteHistoryEntry,
  } = useLabNewLayoutHistoryGallery({ authUid })
  const [firebaseMovedUrls, setFirebaseMovedUrls] = useState<Record<string, string>>({})
  const [movingToFirebaseIds, setMovingToFirebaseIds] = useState<Record<string, boolean>>({})
  const [visibleEntryCount, setVisibleEntryCount] = useState(GALLERY_PAGE_SIZE)
  const [selectedEntry, setSelectedEntry] = useState<LabNewLayoutGalleryHistoryEntry | null>(null)
  const [isJsonExpanded, setIsJsonExpanded] = useState(false)
  const [historyFilterMode, setHistoryFilterMode] = useState<HistoryGalleryFilterMode>('all')
  const [showFailedGenerations, setShowFailedGenerations] = useState(false)
  const [activeExtendTab, setActiveExtendTab] = useState<'before' | 'after'>('after')
  const [isSubmittingExtendReference, setIsSubmittingExtendReference] = useState(false)
  const [isRecoveringTask, setIsRecoveringTask] = useState(false)
  const [resubmittingIds, setResubmittingIds] = useState<Record<string, boolean>>({})
  const lightboxVideoRef = useRef<HTMLVideoElement | null>(null)
  const [failedLightboxSource, setFailedLightboxSource] = useState('')
  const autoReferenceSignatureByIdRef = useRef<Record<string, string>>({})
  const runner = useGenerationRunner({ apiBaseUrl: CHATBOT_BASE })
  const { likedIds, toggle: toggleLiked } = useLikedHistoryIds()
  const { markDownloaded, isDownloaded } = useDownloadedHistoryUrls()
  const effectiveEntries = useMemo(() => (
    entries.map((entry) => {
      const movedUrl = firebaseMovedUrls[entry.id]
      return movedUrl
        ? { ...entry, resultUrl: movedUrl }
        : entry
    })
  ), [entries, firebaseMovedUrls])
  const projectScopedEntries = useMemo(() => {
    const byProject = studioProjectId
      ? effectiveEntries.filter((entry) => entry.projectId === studioProjectId)
      : effectiveEntries

    if (!studioActiveFolderId) {
      return byProject
    }

    return byProject.filter((entry) => (entry.folderId || '').trim() === studioActiveFolderId)
  }, [effectiveEntries, studioActiveFolderId, studioProjectId])
  const filteredProjectEntries = useMemo(() => {
    return projectScopedEntries.filter((entry) => {
      const isFailed = entry.status === 'failed'

      if (historyFilterMode === 'failed') {
        return isFailed
      }

      if (historyFilterMode === 'liked' && !likedIds.has(entry.id)) {
        return false
      }

      if (!showFailedGenerations && isFailed) {
        return false
      }

      return true
    })
  }, [historyFilterMode, likedIds, projectScopedEntries, showFailedGenerations])
  const hiddenFailedCount = useMemo(() => {
    if (historyFilterMode === 'failed' || showFailedGenerations) {
      return 0
    }
    return projectScopedEntries.filter((entry) => entry.status === 'failed').length
  }, [historyFilterMode, projectScopedEntries, showFailedGenerations])
  const historyFilterSummaryLabel = useMemo(() => {
    if (historyFilterMode === 'failed') {
      return 'Failed only'
    }
    if (historyFilterMode === 'liked') {
      return showFailedGenerations ? 'Liked + failed' : 'Liked only'
    }
    return showFailedGenerations ? 'All + failed' : 'All'
  }, [historyFilterMode, showFailedGenerations])
  const visibleEntries = useMemo(
    () => filteredProjectEntries.slice(0, visibleEntryCount),
    [filteredProjectEntries, visibleEntryCount],
  )
  const hasMoreEntries = filteredProjectEntries.length > visibleEntryCount || hasMoreRemote
  const title = panelParams.label ?? props.api.title
  const selectedEntryFolderLabel = useMemo(
    () => (selectedEntry ? resolveHistoryFolderLabel(selectedEntry.folderId || null, studioFolders) : ''),
    [selectedEntry, studioFolders],
  )
  const selectedEntryProjectLabel = useMemo(
    () => (selectedEntry ? (studioProjects.find((p) => p.id === selectedEntry.projectId)?.name || '') : ''),
    [selectedEntry, studioProjects],
  )

  useEffect(() => {
    setVisibleEntryCount(GALLERY_PAGE_SIZE)
  }, [historyFilterMode, showFailedGenerations, studioActiveFolderId, studioProjectId])
  const downloadNamingContext = useMemo(() => {
    const projectName = studioProjects.find((project) => project.id === studioProjectId)?.name || 'project'
    const folderPath = resolveFolderPath(studioActiveFolderId || null, studioFolders)
    const folderName = folderPath.names.length > 0 ? folderPath.names.join('-') : 'folder'
    const firstScopedScene = studioActiveFolderId
      ? storyBibleData.scenes.find((scene) => scene.folderId === studioActiveFolderId)
      : storyBibleData.scenes[0]
    const sceneName = firstScopedScene?.title || firstScopedScene?.id || 'scene'
    return {
      projectName,
      folderName,
      sceneName,
      prefix: 'video',
    }
  }, [storyBibleData.scenes, studioActiveFolderId, studioFolders, studioProjectId, studioProjects])

  const resolveEntryDownloadNamingContext = useCallback((entry: LabNewLayoutGalleryHistoryEntry) => {
    const entryProjectId = entry.projectId || studioProjectId || ''
    const entryFolderId = entry.folderId || studioActiveFolderId || null
    const projectName = studioProjects.find((p) => p.id === entryProjectId)?.name || downloadNamingContext.projectName
    const folderPath = resolveFolderPath(entryFolderId, studioFolders)
    const folderName = folderPath.names.length > 0 ? folderPath.names.join('-') : (studioFolders.find((f) => f.id === entryFolderId)?.name || downloadNamingContext.folderName)
    const firstScopedScene = entryFolderId
      ? storyBibleData.scenes.find((scene) => scene.folderId === entryFolderId)
      : storyBibleData.scenes[0]
    const sceneName = firstScopedScene?.title || firstScopedScene?.id || downloadNamingContext.sceneName
    return { projectName, folderName, sceneName, prefix: 'video' }
  }, [downloadNamingContext, storyBibleData.scenes, studioActiveFolderId, studioFolders, studioProjectId, studioProjects])

  const lightboxSourceUrl = useMemo(() => {
    if (!selectedEntry) return ''
    return resolveProxySourceUrl(selectedEntry.resultUrl || Object.values(selectedEntry.mediaUrls)[0] || '')
  }, [selectedEntry])

  const lightboxProxyUrl = useMemo(() => buildVideoProxyUrl(lightboxSourceUrl), [lightboxSourceUrl])

  const lightboxVideoSrc = useMemo(() => {
    if (!selectedEntry || !lightboxSourceUrl) return ''
    const prefersProxy = shouldPreferProxyForPreview(selectedEntry.resolution)
    const primaryUrl = prefersProxy ? (lightboxProxyUrl || lightboxSourceUrl) : lightboxSourceUrl
    const secondaryUrl = prefersProxy ? lightboxSourceUrl : (lightboxProxyUrl || lightboxSourceUrl)
    if (failedLightboxSource === lightboxSourceUrl) {
      return secondaryUrl
    }
    return primaryUrl
  }, [failedLightboxSource, lightboxProxyUrl, lightboxSourceUrl, selectedEntry])

  const lightboxStorageLabel = useMemo(() => {
    if (!selectedEntry?.resultUrl) return 'Provider link'
    if (selectedEntry.resultUrl.includes('firebasestorage.googleapis.com')) {
      return 'Firebase Storage (History)'
    }
    return 'Provider temporary link'
  }, [selectedEntry])

  const lightboxIsReferenced = useMemo(() => {
    if (!selectedEntry?.resultUrl) return false
    return projectReferenceLibraryItems.some((item) => item.url === selectedEntry.resultUrl)
  }, [projectReferenceLibraryItems, selectedEntry?.resultUrl])
  const lightboxIsReferencing = Boolean(selectedEntry && movingToFirebaseIds[selectedEntry.id])
  const lightboxIsImage = isImageResultUrl(lightboxSourceUrl)

  const handleOpenLightboxVideoLink = useCallback(() => {
    if (!lightboxSourceUrl || typeof window === 'undefined') return
    window.open(lightboxSourceUrl, '_blank', 'noopener,noreferrer')
  }, [lightboxSourceUrl])

  const handleClose = useCallback(() => {
    setSelectedEntry(null)
    setIsJsonExpanded(false)
    setActiveExtendTab('after')
    setIsSubmittingExtendReference(false)
  }, [])

  const lightboxIsLiked = selectedEntry ? likedIds.has(selectedEntry.id) : false

  const referenceMedia = useMemo(() => {
    if (!selectedEntry) return [] as Array<{ key: string; url: string; kind: 'image' | 'video' | 'audio' }>
    const primary = selectedEntry.resultUrl
    const seenUrls = new Set<string>()
    return Object.entries(selectedEntry.mediaUrls)
      .filter(([, url]) => url && url !== primary)
      .filter(([, url]) => {
        const normalized = url.trim()
        if (!normalized || seenUrls.has(normalized)) return false
        seenUrls.add(normalized)
        return true
      })
      .map(([key, url]) => {
        const kind: 'image' | 'video' | 'audio' = key.startsWith('image')
          ? 'image'
          : key.startsWith('video')
            ? 'video'
            : key.startsWith('audio')
              ? 'audio'
              : inferReferenceMediaKindFromUrl(url)
        return { key, url, kind }
      })
  }, [selectedEntry])

  const requestJsonText = useMemo(() => {
    if (!selectedEntry) return ''
    const payload = selectedEntry.requestPayload && Object.keys(selectedEntry.requestPayload).length > 0
      ? selectedEntry.requestPayload
      : buildRequestPayloadFallback(selectedEntry)
    try {
      return JSON.stringify(payload, null, 2)
    } catch {
      return ''
    }
  }, [selectedEntry])

  const handleCopyJson = useCallback(() => {
    if (!requestJsonText) return
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(requestJsonText).catch(() => undefined)
    }
  }, [requestJsonText])

  const setComposerReuseSeed = useLabNewLayoutStore((state) => state.setComposerReuseSeed)
  const addComposerReference = useLabNewLayoutStore((state) => state.addComposerReference)
  const composerReferences = useLabNewLayoutStore((state) => state.composerReferences)
  const addHistoryItem = useLabNewLayoutStore((state) => state.addHistoryItem)
  const removeHistoryItem = useLabNewLayoutStore((state) => state.removeHistoryItem)
  const updateHistoryItem = useLabNewLayoutStore((state) => state.updateHistoryItem)
  const { showToast: showReuseToast } = useToast()

  // When in-progress entries finish they stay visible because they were already in the first page.
  // Do NOT auto-expand visible count here — that would load all videos on mount.

  const handleLoadMoreEntries = useCallback(async () => {
    if (projectScopedEntries.length > visibleEntryCount) {
      setVisibleEntryCount((current) => current + GALLERY_PAGE_SIZE)
      return
    }

    if (hasMoreRemote) {
      await loadMoreRemote()
      setVisibleEntryCount((current) => current + GALLERY_PAGE_SIZE)
    }
  }, [hasMoreRemote, loadMoreRemote, projectScopedEntries.length, visibleEntryCount])

  const handleDeleteHistoryEntry = useCallback(async (entry: LabNewLayoutGalleryHistoryEntry) => {
    removeHistoryItem(entry.id)
    try {
      await deleteHistoryEntry(entry)
    } catch {
      showReuseToast({ message: 'Failed to delete synced history entry', type: 'error' })
    }
  }, [deleteHistoryEntry, removeHistoryItem, showReuseToast])

  useEffect(() => {
    if (!selectedEntry) {
      return
    }
    if (projectScopedEntries.some((entry) => entry.id === selectedEntry.id)) {
      return
    }
    setSelectedEntry(null)
    setIsJsonExpanded(false)
  }, [projectScopedEntries, selectedEntry])

  const seedReferences = useMemo(() => {
    if (!selectedEntry) return [] as { id: string; url: string; kind: 'image' | 'video' | 'audio'; name: string }[]
    const seenUrls = new Set<string>()
    return Object.entries(selectedEntry.mediaUrls)
      .filter(([, url]) => Boolean(url) && url !== selectedEntry.resultUrl)
      .filter(([, url]) => {
        const normalized = url.trim()
        if (!normalized || seenUrls.has(normalized)) return false
        seenUrls.add(normalized)
        return true
      })
      .map(([key, url]) => {
        const kind: 'image' | 'video' | 'audio' = key.startsWith('video')
          ? 'video'
          : key.startsWith('audio')
            ? 'audio'
            : key.startsWith('image')
              ? 'image'
              : inferReferenceMediaKindFromUrl(url)
        return { id: `${selectedEntry.id}-${key}`, url, kind, name: key }
      })
  }, [selectedEntry])

  const handleCopyPrompt = useCallback(() => {
    if (!selectedEntry?.prompt) return
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(selectedEntry.prompt).then(
        () => showReuseToast({ message: 'Prompt copied to clipboard', type: 'success' }),
        () => showReuseToast({ message: 'Failed to copy prompt', type: 'error' }),
      )
    }
  }, [selectedEntry, showReuseToast])

  const buildSeed = useCallback((mode: 'all' | 'prompt' | 'references') => {
    if (!selectedEntry) return null
    const seedId = `${selectedEntry.id}-${mode}-${Date.now()}`
    const settingsSeed = buildComposerSeedSettingsFromEntry(selectedEntry)
    if (mode === 'prompt') {
      return { id: seedId, prompt: selectedEntry.prompt }
    }
    if (mode === 'references') {
      return { id: seedId, references: seedReferences }
    }
    return {
      id: seedId,
      prompt: selectedEntry.prompt,
      references: seedReferences,
      ...settingsSeed,
    }
  }, [selectedEntry, seedReferences])

  const archiveHistoryVideoToFirebase = useCallback(async (
    entry: LabNewLayoutGalleryHistoryEntry,
    options: { silent?: boolean; showAlreadyArchivedMessage?: boolean } = {},
  ): Promise<string | null> => {
    const silent = options.silent === true
    const showAlreadyArchivedMessage = options.showAlreadyArchivedMessage !== false
    const sourceUrl = (entry.resultUrl || '').trim()
    if (!sourceUrl) {
      if (!silent) {
        showReuseToast({ message: 'No generated video URL found for this card.', type: 'warning' })
      }
      return null
    }

    if (sourceUrl.includes('firebasestorage')) {
      if (!silent && showAlreadyArchivedMessage) {
        showReuseToast({ message: 'This video is already in Firebase.', type: 'info' })
      }
      return sourceUrl
    }

    const targetProjectId = (entry.projectId || studioProjectId || '').trim()
    if (!targetProjectId) {
      if (!silent) {
        showReuseToast({ message: 'Select a Studio project first.', type: 'warning' })
      }
      return null
    }

    const targetFolderId = (entry.folderId || studioActiveFolderId || '').trim() || null
    const folderPathSegment = targetFolderId ? `folders/${targetFolderId}` : 'project'
    const storagePathPrefix = `lab-generated-videos/projects/${targetProjectId}/${folderPathSegment}`

    setMovingToFirebaseIds((current) => ({ ...current, [entry.id]: true }))

    try {
      const response = await fetch('/api/lab/references/upload-by-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: sourceUrl,
          name: `history-${entry.id}-${Date.now()}`,
          kind: 'video',
          storagePathPrefix,
          firebaseConfig,
          mimeType: 'video/mp4',
        }),
      })

      const payload = await response.json().catch(() => null) as { error?: string; saved?: { firebaseUrl?: string } } | null
      if (!response.ok) {
        throw new Error(payload?.error || 'Failed to archive video to Firebase.')
      }

      const firebaseUrl = payload?.saved?.firebaseUrl || ''
      if (!firebaseUrl) {
        throw new Error('Upload completed but no Firebase URL was returned.')
      }

      const successUpdates = {
        status: 'success' as const,
        resultUrl: firebaseUrl,
        completedAt: entry.completedAt ?? entry.receivedAt ?? Date.now(),
        errorMessage: '',
      }

      setFirebaseMovedUrls((current) => ({
        ...current,
        [entry.id]: firebaseUrl,
      }))

      updateHistoryItem(entry.id, successUpdates)

      setSelectedEntry((current) => (
        current && current.id === entry.id
          ? { ...current, ...successUpdates }
          : current
      ))

      if (!silent) {
        showReuseToast({ message: 'Video archived to Firebase history.', type: 'success' })
      }
      return firebaseUrl
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to archive video to Firebase.'
      if (!silent) {
        showReuseToast({ message, type: 'error' })
      }
      return null
    } finally {
      setMovingToFirebaseIds((current) => {
        const next = { ...current }
        delete next[entry.id]
        return next
      })
    }
  }, [showReuseToast, studioActiveFolderId, studioProjectId, updateHistoryItem])

  const moveHistoryVideoToFirebase = useCallback(async (
    entry: LabNewLayoutGalleryHistoryEntry,
    options: { silent?: boolean } = {},
  ): Promise<boolean> => {
    const silent = options.silent === true
    const archivedUrl = await archiveHistoryVideoToFirebase(entry, {
      silent,
      showAlreadyArchivedMessage: false,
    })
    if (!archivedUrl) {
      return false
    }

    const targetProjectId = (entry.projectId || studioProjectId || '').trim()
    if (!targetProjectId) {
      if (!silent) {
        showReuseToast({ message: 'Select a Studio project first.', type: 'warning' })
      }
      return false
    }

    const referenceFolderId = (entry.folderId || studioActiveFolderId || '').trim() || null
    const referenceExists = projectReferenceLibraryItems.some(
      (item) => item.url === archivedUrl && (item.folderId || null) === referenceFolderId,
    )
    if (referenceExists) {
      if (!silent) {
        showReuseToast({ message: 'This video is already in project references.', type: 'info' })
      }
      return true
    }

    try {
      await saveProjectReferenceLibraryItem(targetProjectId, {
        id: `ref-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        url: archivedUrl,
        kind: 'video',
        name: entry.model || `history-${entry.id}`,
        createdAt: Date.now(),
        folderId: referenceFolderId,
      }, authUid || 'anon')

      if (!silent) {
        showReuseToast({ message: 'Saved to project references.', type: 'success' })
      }
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to save video to references.'
      if (!silent) {
        showReuseToast({ message, type: 'error' })
      }
      return false
    }
  }, [archiveHistoryVideoToFirebase, authUid, projectReferenceLibraryItems, showReuseToast, studioActiveFolderId, studioProjectId])

  // Auto-archive: find the first completed generation not yet stored in Firebase.
  // We intentionally do NOT auto-add to the references library here — the user
  // adds references to the panel manually.
  const autoReferenceCandidate = useMemo(() => {
    if (Object.keys(movingToFirebaseIds).length > 0) {
      return null
    }

    return projectScopedEntries.find((entry) => {
      const sourceUrl = (entry.resultUrl || '').trim()
      if (!sourceUrl || entry.status === 'failed') {
        return false
      }
      // Only needs archiving if not already in Firebase storage
      return !sourceUrl.includes('firebasestorage')
    }) ?? null
  }, [movingToFirebaseIds, projectScopedEntries])

  useEffect(() => {
    if (!autoReferenceCandidate) {
      return
    }

    const signature = JSON.stringify([
      autoReferenceCandidate.resultUrl,
      autoReferenceCandidate.projectId || studioProjectId || '',
      autoReferenceCandidate.folderId || studioActiveFolderId || '',
      autoReferenceCandidate.status,
    ])

    if (autoReferenceSignatureByIdRef.current[autoReferenceCandidate.id] === signature) {
      return
    }

    autoReferenceSignatureByIdRef.current[autoReferenceCandidate.id] = signature
    // Archive to Firebase only — do not add to references library
    void archiveHistoryVideoToFirebase(autoReferenceCandidate, { silent: true, showAlreadyArchivedMessage: false })
  }, [autoReferenceCandidate, archiveHistoryVideoToFirebase, studioActiveFolderId, studioProjectId])

  const selectedEntryFailureReason = useMemo(() => {
    const raw = (selectedEntry?.errorMessage || '').trim()
    if (!raw) return ''
    if (/^http\s*500$/i.test(raw) || /^http\s*5\d\d$/i.test(raw)) {
      return 'Backend/provider returned an internal server error. Use Diagnose to auto-archive eligible videos, then retry this generation.'
    }
    return raw
  }, [selectedEntry?.errorMessage])

  const handleHistoryDiagnose = useCallback(async () => {
    const successCount = effectiveEntries.filter((entry) => entry.status === 'success').length
    const runningCount = effectiveEntries.filter((entry) => entry.status === 'running').length
    const failedCount = effectiveEntries.filter((entry) => entry.status === 'failed').length
    const referencedCount = effectiveEntries.filter((entry) => (entry.resultUrl || '').includes('firebasestorage')).length
    const visibleCount = Math.min(visibleEntries.length, effectiveEntries.length)

    const candidates = effectiveEntries.filter((entry) => {
      const sourceUrl = (entry.resultUrl || '').trim()
      if (!sourceUrl) return false
      if (entry.status !== 'success') return false
      if (sourceUrl.includes('firebasestorage')) return false
      if (movingToFirebaseIds[entry.id]) return false
      return true
    })

    showReuseToast({
      type: 'info',
      message: `Diag started: checking ${candidates.length} non-archived videos...`,
    })

    let autoArchived = 0
    let autoFailed = 0
    for (const entry of candidates) {
      const archivedUrl = await archiveHistoryVideoToFirebase(entry, { silent: true, showAlreadyArchivedMessage: false })
      if (archivedUrl) {
        autoArchived += 1
      } else {
        autoFailed += 1
      }
    }

    showReuseToast({
      type: autoFailed > 0 ? 'warning' : 'success',
      message: `Diag: total ${effectiveEntries.length}, visible ${visibleCount}, success ${successCount}, running ${runningCount}, failed ${failedCount}, archived ${referencedCount}. Auto-archive: ${autoArchived} done, ${autoFailed} failed.`,
    })

    if (typeof console !== 'undefined') {
      console.info('[history-gallery-diagnose]', {
        total: effectiveEntries.length,
        visible: visibleCount,
        success: successCount,
        running: runningCount,
        failed: failedCount,
        referenced: referencedCount,
        candidates: candidates.length,
        autoArchived,
        autoFailed,
      })
    }
  }, [archiveHistoryVideoToFirebase, effectiveEntries, movingToFirebaseIds, showReuseToast, visibleEntries.length])

  const handleDownloadVideo = useCallback(async (entry: LabNewLayoutGalleryHistoryEntry, sourceUrl: string) => {
    const normalizedUrl = resolveProxySourceUrl(sourceUrl)
    if (!normalizedUrl) {
      showReuseToast({ message: 'No video URL available for download.', type: 'warning' })
      return
    }

    try {
      const payloadSceneName = extractSceneNameFromPayload(entry.requestPayload)
      const entryNamingContext = resolveEntryDownloadNamingContext(entry)
      const fileName = buildDownloadFileName(entry, normalizedUrl, {
        ...entryNamingContext,
        sceneName: payloadSceneName || entryNamingContext.sceneName,
      })
      await downloadVideoToFile(normalizedUrl, fileName)
      markDownloaded(normalizedUrl)
      showReuseToast({ message: 'Video download started.', type: 'success' })

      if (!normalizedUrl.includes('firebasestorage')) {
        void archiveHistoryVideoToFirebase(entry, { silent: true, showAlreadyArchivedMessage: false })
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to download video.'
      showReuseToast({ message, type: 'error' })
    }
  }, [archiveHistoryVideoToFirebase, resolveEntryDownloadNamingContext, markDownloaded, showReuseToast])

  const handleExtendFromEntry = useCallback(async (tabMode: 'before' | 'after', entryOverride?: LabNewLayoutGalleryHistoryEntry) => {
    setActiveExtendTab(tabMode)
    const targetEntry = entryOverride || selectedEntry
    if (!targetEntry) return

    const selectedVideoUrl = resolveProxySourceUrl(entryOverride
      ? (targetEntry.resultUrl || Object.values(targetEntry.mediaUrls)[0] || '')
      : (lightboxVideoRef.current?.currentSrc || lightboxVideoSrc || targetEntry.resultUrl || Object.values(targetEntry.mediaUrls)[0] || ''))

    if (!selectedVideoUrl) {
      showReuseToast({ message: 'No video source found to add as reference', type: 'warning' })
      return
    }

    setIsSubmittingExtendReference(true)
    try {
      let referenceUrl = ''

      if (isFirebaseHistoryUrl(selectedVideoUrl)) {
        referenceUrl = selectedVideoUrl
      } else if (isFirebaseHistoryUrl(targetEntry.resultUrl || '')) {
        referenceUrl = (targetEntry.resultUrl || '').trim()
      } else {
        const archivedUrl = await archiveHistoryVideoToFirebase(targetEntry, {
          silent: true,
          showAlreadyArchivedMessage: false,
        })

        if (!archivedUrl) {
          showReuseToast({
            message: 'This video must be archived to Firebase before it can be used for extend.',
            type: 'error',
          })
          return
        }

        referenceUrl = archivedUrl
      }

      if (!referenceUrl) {
        showReuseToast({
          message: 'No stable video URL was available for extend.',
          type: 'error',
        })
        return
      }

      const settingsSeed = buildComposerSeedSettingsFromEntry(targetEntry)
      setComposerReuseSeed({
        id: `extend-seed-${tabMode}-${targetEntry.id}-${Date.now()}`,
        modeId: 'video',
        promptPrefix: buildExtendPromptPrefix(tabMode),
        mergePrompt: true,
        references: [{
          id: `extend-${tabMode}-${targetEntry.id}`,
          url: referenceUrl,
          kind: 'video',
          name: 'video 1',
        }],
        referenceMergeStrategy: 'prepend',
        ...settingsSeed,
      })
      showReuseToast({
        message: `${tabMode === 'before' ? 'Extend Before' : 'Extend After'} prepared in Composer`,
        type: 'success',
      })
      handleClose()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to prepare extend reference'
      showReuseToast({ message, type: 'error' })
    } finally {
      setIsSubmittingExtendReference(false)
    }
  }, [archiveHistoryVideoToFirebase, handleClose, lightboxVideoSrc, selectedEntry, setComposerReuseSeed, showReuseToast])

  const handleExtendTabClick = useCallback(async (tabMode: 'before' | 'after') => {
    await handleExtendFromEntry(tabMode)
  }, [handleExtendFromEntry])

  const handleReuseAll = useCallback(() => {
    const seed = buildSeed('all')
    if (!seed) return
    setComposerReuseSeed(seed)
    showReuseToast({ message: 'Loaded prompt & references into Composer', type: 'success' })
    handleClose()
  }, [buildSeed, handleClose, setComposerReuseSeed, showReuseToast])

  const handleReusePrompt = useCallback(() => {
    const seed = buildSeed('prompt')
    if (!seed) return
    setComposerReuseSeed(seed)
    showReuseToast({ message: 'Prompt loaded into Composer', type: 'success' })
    handleClose()
  }, [buildSeed, handleClose, setComposerReuseSeed, showReuseToast])

  const handleReuseReferences = useCallback(() => {
    const seed = buildSeed('references')
    if (!seed) return
    setComposerReuseSeed(seed)
    showReuseToast({ message: 'References loaded into Composer', type: 'success' })
    handleClose()
  }, [buildSeed, handleClose, setComposerReuseSeed, showReuseToast])

  const buildSeedFromEntry = useCallback((entry: LabNewLayoutGalleryHistoryEntry, mode: 'all' | 'prompt' | 'references') => {
    const entryReferences = Object.entries(entry.mediaUrls)
      .filter(([, url]) => Boolean(url) && url !== entry.resultUrl)
      .map(([key, url]) => {
        const kind: 'image' | 'video' | 'audio' = key.startsWith('video')
          ? 'video'
          : key.startsWith('audio')
            ? 'audio'
            : key.startsWith('image')
              ? 'image'
              : inferReferenceMediaKindFromUrl(url)
        return { id: `${entry.id}-${key}`, url, kind, name: key }
      })

    const seedId = `${entry.id}-${mode}-${Date.now()}`
    const settingsSeed = buildComposerSeedSettingsFromEntry(entry)
    if (mode === 'prompt') {
      return { id: seedId, prompt: entry.prompt }
    }
    if (mode === 'references') {
      return { id: seedId, references: entryReferences }
    }

    return {
      id: seedId,
      prompt: entry.prompt,
      references: entryReferences,
      ...settingsSeed,
    }
  }, [])

  const handleReuseFromEntry = useCallback((entry: LabNewLayoutGalleryHistoryEntry) => {
    const seed = buildSeedFromEntry(entry, 'all')
    setComposerReuseSeed(seed)
    showReuseToast({ message: 'Loaded this generation into Composer', type: 'success' })
  }, [buildSeedFromEntry, setComposerReuseSeed, showReuseToast])

  const handleResubmitGeneration = useCallback((entry: LabNewLayoutGalleryHistoryEntry) => {
    if (resubmittingIds[entry.id]) return
    if (!entry.requestEndpoint || !entry.requestPayload) {
      showReuseToast({ message: 'Cannot resubmit: generation request data is missing.', type: 'warning' })
      return
    }

    const entryId = entry.id
    const settings: GenerationRequestSettings = {
      provider: (entry.provider as GenerationProvider) || 'atlas',
      model: entry.model || 'bytedance/seedance-2.0-fast',
      ratio: entry.ratio || '16:9',
      duration: entry.duration ?? 15,
      resolution: entry.resolution || '480p',
      generateAudio: entry.generateAudio ?? true,
    }

    const request = {
      endpoint: entry.requestEndpoint,
      body: entry.requestPayload,
      settings,
    }

    const shouldReplaceExisting = entry.status === 'failed'
    const historyId = shouldReplaceExisting
      ? entry.id
      : `regen-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

    if (!shouldReplaceExisting) {
      addHistoryItem({
        id: historyId,
        timestamp: Date.now(),
        prompt: entry.prompt,
        model: settings.model,
        provider: settings.provider,
        ratio: settings.ratio,
        resolution: settings.resolution,
        duration: settings.duration,
        generateAudio: settings.generateAudio,
        requestEndpoint: request.endpoint,
        requestPayload: request.body,
        mediaUrls: entry.mediaUrls,
        sourceLabel: entry.sourceLabel || 'History regenerate',
        status: 'queued',
        projectId: entry.projectId || studioProjectId || undefined,
        folderId: entry.folderId || studioActiveFolderId || undefined,
      })
    }

    setResubmittingIds((prev) => {
      const next: Record<string, boolean> = { ...prev, [entry.id]: true }
      if (historyId !== entry.id) {
        next[historyId] = true
      }
      return next
    })
    updateHistoryItem(historyId, {
      status: 'running',
      errorMessage: '',
    })
    if (shouldReplaceExisting) {
      setSelectedEntry((current) => (
        current && current.id === entryId
          ? { ...current, status: 'running', errorMessage: '' }
          : current
      ))
    }

    showReuseToast({ message: shouldReplaceExisting ? 'Retrying failed generation...' : 'Starting regenerated variation...', type: 'info' })

    void (async () => {
      try {
        const result = await runner.runGeneration(request, {
          onQueued: ({ taskId, submittedAt, settings: queuedSettings }) => {
            updateHistoryItem(historyId, {
              status: 'running',
              taskId,
              submittedAt,
              provider: queuedSettings.provider,
              model: queuedSettings.model,
              ratio: queuedSettings.ratio,
              resolution: queuedSettings.resolution,
              duration: queuedSettings.duration,
              generateAudio: queuedSettings.generateAudio,
            })
          },
        })

        if (result) {
          const archivedResultUrl = await archiveHistoryVideoToFirebase({
            ...entry,
            id: historyId,
            resultUrl: result.resultUrl,
            projectId: entry.projectId || studioProjectId || '',
            folderId: entry.folderId || studioActiveFolderId || '',
          }, { silent: true, showAlreadyArchivedMessage: false })

          updateHistoryItem(historyId, {
            status: 'success',
            resultUrl: archivedResultUrl || result.resultUrl,
            taskId: result.taskId,
            submittedAt: result.submittedAt,
            receivedAt: result.receivedAt,
            completedAt: result.receivedAt,
            provider: result.settings.provider,
            model: result.settings.model,
            ratio: result.settings.ratio,
            resolution: result.settings.resolution,
            duration: result.settings.duration,
            generateAudio: result.settings.generateAudio,
            errorMessage: '',
          })
          if (shouldReplaceExisting) {
            setSelectedEntry((current) => (
              current && current.id === entryId
                ? {
                    ...current,
                    status: 'success',
                    resultUrl: archivedResultUrl || result.resultUrl,
                    taskId: result.taskId,
                    submittedAt: result.submittedAt,
                    receivedAt: result.receivedAt,
                    completedAt: result.receivedAt,
                    provider: result.settings.provider,
                    model: result.settings.model,
                    ratio: result.settings.ratio,
                    resolution: result.settings.resolution,
                    duration: result.settings.duration,
                    generateAudio: result.settings.generateAudio,
                    errorMessage: '',
                  }
                : current
            ))
          }
          showReuseToast({ message: 'Generation succeeded!', type: 'success' })
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Resubmission failed.'
        updateHistoryItem(historyId, {
          status: 'failed',
          errorMessage,
          completedAt: Date.now(),
        })
        if (shouldReplaceExisting) {
          setSelectedEntry((current) => (
            current && current.id === entryId
              ? { ...current, status: 'failed', errorMessage, completedAt: Date.now() }
              : current
          ))
        }
        showReuseToast({ message: `Resubmission failed: ${errorMessage}`, type: 'error' })
      } finally {
        setResubmittingIds((prev) => {
          const next = { ...prev }
          delete next[entry.id]
          delete next[historyId]
          return next
        })
      }
    })()
  }, [addHistoryItem, archiveHistoryVideoToFirebase, resubmittingIds, runner, showReuseToast, studioActiveFolderId, studioProjectId, updateHistoryItem])

  const handleRecoverFromTaskId = useCallback((entryOverride?: LabNewLayoutGalleryHistoryEntry) => {
    const targetEntry = entryOverride || selectedEntry
    if (!targetEntry || isRecoveringTask) return
    const taskId = (targetEntry.taskId || '').trim()
    if (!taskId) {
      showReuseToast({ message: 'This item has no task ID to recover.', type: 'warning' })
      return
    }

    const entryId = targetEntry.id
    const settings = buildRecoverySettings(targetEntry)

    setIsRecoveringTask(true)
    updateHistoryItem(entryId, {
      status: 'running',
      errorMessage: '',
      taskId,
      provider: settings.provider,
      model: settings.model,
      ratio: settings.ratio,
      resolution: settings.resolution,
      duration: settings.duration,
      generateAudio: settings.generateAudio,
    })
    setSelectedEntry((current) => (
      current && current.id === entryId
        ? {
            ...current,
            status: 'running',
            errorMessage: '',
            taskId,
            provider: settings.provider,
            model: settings.model,
            ratio: settings.ratio,
            resolution: settings.resolution,
            duration: settings.duration,
            generateAudio: settings.generateAudio,
          }
        : current
    ))

    showReuseToast({ message: `Recovering task ${taskId}...`, type: 'info' })

    void (async () => {
      try {
        const resumedResult = await runner.resumeGenerationTask({ taskId, settings })
        if (!resumedResult) {
          showReuseToast({ message: 'Recovery was cancelled.', type: 'info' })
          return
        }

        const successUpdates = {
          status: 'success' as const,
          resultUrl: resumedResult.resultUrl,
          taskId: resumedResult.taskId,
          receivedAt: resumedResult.receivedAt,
          completedAt: resumedResult.receivedAt,
          provider: resumedResult.settings.provider,
          model: resumedResult.settings.model,
          ratio: resumedResult.settings.ratio,
          resolution: resumedResult.settings.resolution,
          duration: resumedResult.settings.duration,
          generateAudio: resumedResult.settings.generateAudio,
          errorMessage: '',
        }

        const archivedRecoveredUrl = await archiveHistoryVideoToFirebase({
          ...targetEntry,
          id: entryId,
          resultUrl: resumedResult.resultUrl,
        }, { silent: true, showAlreadyArchivedMessage: false })
        if (archivedRecoveredUrl) {
          successUpdates.resultUrl = archivedRecoveredUrl
        }

        updateHistoryItem(entryId, successUpdates)
        setSelectedEntry((current) => (
          current && current.id === entryId
            ? { ...current, ...successUpdates }
            : current
        ))
        showReuseToast({ message: 'Recovered. Video loaded from task result.', type: 'success' })
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Recovery failed.'
        const lowerError = errorMessage.toLowerCase()
        const transientConnectivityError = lowerError.includes('cannot reach local api backend')
          || lowerError.includes('back end server is not working')
          || lowerError.includes('networkerror')
          || lowerError.includes('failed to fetch')

        if (transientConnectivityError) {
          const pausedMessage = `Recovery paused: ${errorMessage}`
          updateHistoryItem(entryId, {
            status: 'running',
            errorMessage: pausedMessage,
          })
          setSelectedEntry((current) => (
            current && current.id === entryId
              ? { ...current, status: 'running', errorMessage: pausedMessage }
              : current
          ))
          showReuseToast({ message: pausedMessage, type: 'warning' })
          return
        }

        updateHistoryItem(entryId, {
          status: 'failed',
          errorMessage,
          completedAt: Date.now(),
        })
        setSelectedEntry((current) => (
          current && current.id === entryId
            ? { ...current, status: 'failed', errorMessage, completedAt: Date.now() }
            : current
        ))
        showReuseToast({ message: `Recovery failed: ${errorMessage}`, type: 'error' })
      } finally {
        setIsRecoveringTask(false)
      }
    })()
  }, [archiveHistoryVideoToFirebase, isRecoveringTask, runner, selectedEntry, showReuseToast, updateHistoryItem])

  const lightbox = selectedEntry ? createPortal(
    <div
      className="lab-newlayout-history-lightbox-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Generation detail"
      onClick={handleClose}
    >
      <div
        className="lab-newlayout-history-lightbox"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="lab-newlayout-history-lightbox-head">
          <div>
            <div className="lab-newlayout-history-lightbox-kicker">{selectedEntry.sourceLabel || 'Generation'}</div>
            <div className="lab-newlayout-history-lightbox-title">{selectedEntry.model || 'Unknown model'}</div>
          </div>
          <div className="lab-newlayout-history-lightbox-head-actions">
            <button
              type="button"
              className="lab-newlayout-history-lightbox-action"
              onClick={handleReuseAll}
              title="Load prompt and references into Composer"
            >
              Reuse
            </button>
            <button
              type="button"
              className="lab-newlayout-history-lightbox-action"
              onClick={handleReusePrompt}
              disabled={!selectedEntry.prompt}
              title="Load only the prompt into Composer"
            >
              Reuse prompt
            </button>
            <button
              type="button"
              className="lab-newlayout-history-lightbox-action"
              onClick={handleReuseReferences}
              disabled={seedReferences.length === 0}
              title="Load only the references into Composer"
            >
              Reuse refs
            </button>
            <button
              type="button"
              className="lab-newlayout-history-lightbox-action"
              onClick={handleCopyPrompt}
              disabled={!selectedEntry.prompt}
              title="Copy prompt to clipboard"
            >
              Copy prompt
            </button>
            <button
              type="button"
              className={`lab-newlayout-history-lightbox-like${lightboxIsLiked ? ' is-liked' : ''}`}
              onClick={() => toggleLiked(selectedEntry.id)}
              aria-label={lightboxIsLiked ? 'Unlike generation' : 'Like generation'}
              title={lightboxIsLiked ? 'Unlike' : 'Like'}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill={lightboxIsLiked ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              <span>{lightboxIsLiked ? 'Liked' : 'Like'}</span>
            </button>
            <button
              type="button"
              className="lab-newlayout-history-lightbox-close"
              onClick={handleClose}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="lab-newlayout-history-lightbox-body">
          <div className="lab-newlayout-history-lightbox-left">
            {(selectedEntry.resultUrl || Object.values(selectedEntry.mediaUrls)[0]) ? (
              <div className="lab-newlayout-history-lightbox-media">
                {lightboxIsImage ? (
                  <img
                    className="lab-newlayout-history-lightbox-image"
                    src={lightboxSourceUrl}
                    alt=""
                  />
                ) : (
                  <video
                    ref={lightboxVideoRef}
                    className="lab-newlayout-history-lightbox-video"
                    src={lightboxVideoSrc}
                    controls
                    autoPlay
                    playsInline
                    poster={selectedEntry.posterUrl || undefined}
                    onError={() => {
                      if (!lightboxSourceUrl || !lightboxProxyUrl || failedLightboxSource === lightboxSourceUrl) return
                      setFailedLightboxSource(lightboxSourceUrl)
                    }}
                    onContextMenu={(event) => {
                      event.preventDefault()
                      void handleDownloadVideo(
                        selectedEntry,
                        resolveProxySourceUrl(lightboxVideoRef.current?.currentSrc || lightboxVideoSrc || selectedEntry.resultUrl || Object.values(selectedEntry.mediaUrls)[0] || ''),
                      )
                    }}
                  />
                )}
                <div className="lab-newlayout-history-lightbox-media-actions">
                  <button
                    type="button"
                    className="lab-newlayout-history-lightbox-action"
                    onClick={() => {
                      void handleDownloadVideo(
                        selectedEntry,
                        resolveProxySourceUrl(lightboxIsImage ? lightboxSourceUrl : (lightboxVideoRef.current?.currentSrc || lightboxVideoSrc || selectedEntry.resultUrl || Object.values(selectedEntry.mediaUrls)[0] || '')),
                      )
                    }}
                  >
                    {lightboxIsImage ? 'Download image' : 'Download video'}
                  </button>
                  <button
                    type="button"
                    className="lab-newlayout-history-lightbox-action"
                    onClick={() => {
                      void moveHistoryVideoToFirebase(selectedEntry)
                    }}
                    disabled={lightboxIsReferencing || lightboxIsReferenced || !selectedEntry.resultUrl}
                  >
                    {lightboxIsReferencing ? 'Referencing...' : lightboxIsReferenced ? 'Referenced' : lightboxIsImage ? 'Reference image' : 'Reference video'}
                  </button>
                  <button
                    type="button"
                    className="lab-newlayout-history-lightbox-action"
                    onClick={handleOpenLightboxVideoLink}
                    disabled={!lightboxSourceUrl}
                  >
                    {lightboxIsImage ? 'Open image link' : 'Open video link'}
                  </button>
                  <button
                    type="button"
                    className="lab-newlayout-history-lightbox-action"
                    onClick={() => {
                      void handleResubmitGeneration(selectedEntry)
                    }}
                    disabled={Boolean(resubmittingIds[selectedEntry.id])}
                  >
                    {resubmittingIds[selectedEntry.id] ? 'Regenerating...' : 'Regenerate'}
                  </button>
                  {!lightboxIsImage ? (
                    <>
                      <button
                        type="button"
                        className="lab-newlayout-history-lightbox-action"
                        onClick={() => { void handleExtendTabClick('before') }}
                        disabled={isSubmittingExtendReference}
                      >
                        {isSubmittingExtendReference && activeExtendTab === 'before' ? 'Preparing...' : 'Extend Before'}
                      </button>
                      <button
                        type="button"
                        className="lab-newlayout-history-lightbox-action"
                        onClick={() => { void handleExtendTabClick('after') }}
                        disabled={isSubmittingExtendReference}
                      >
                        {isSubmittingExtendReference && activeExtendTab === 'after' ? 'Preparing...' : 'Extend After'}
                      </button>
                    </>
                  ) : null}
                </div>
                {lightboxSourceUrl ? (
                  <div className="lab-newlayout-history-lightbox-media-link-row">
                    <a
                      className="lab-newlayout-history-lightbox-video-link"
                      href={lightboxSourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      title={lightboxSourceUrl}
                    >
                      {lightboxSourceUrl}
                    </a>
                  </div>
                ) : null}
              </div>
            ) : null}
            {selectedEntry.prompt ? (
              <div className="lab-newlayout-history-lightbox-prompt">{selectedEntry.prompt}</div>
            ) : null}
          </div>
          <div className="lab-newlayout-history-lightbox-meta">
            <div className="lab-newlayout-history-lightbox-meta-summary">
              {selectedEntry.ratio ? (
                <div className="lab-newlayout-history-lightbox-meta-row lab-newlayout-history-lightbox-meta-row--summary">
                  <span>Ratio</span>
                  <strong>{selectedEntry.ratio}</strong>
                </div>
              ) : null}
              {!lightboxIsImage && selectedEntry.duration != null ? (
                <div className="lab-newlayout-history-lightbox-meta-row lab-newlayout-history-lightbox-meta-row--summary">
                  <span>Duration</span>
                  <strong>{selectedEntry.duration}s</strong>
                </div>
              ) : null}
              {selectedEntry.resolution ? (
                <div className="lab-newlayout-history-lightbox-meta-row lab-newlayout-history-lightbox-meta-row--summary">
                  <span>Resolution</span>
                  <strong>{selectedEntry.resolution}</strong>
                </div>
              ) : null}
              {selectedEntry.provider ? (
                <div className="lab-newlayout-history-lightbox-meta-row lab-newlayout-history-lightbox-meta-row--summary">
                  <span>Provider</span>
                  <strong>{selectedEntry.provider}</strong>
                </div>
              ) : null}
            </div>
            {selectedEntry.model || selectedEntry.status ? (
              <div className="lab-newlayout-history-lightbox-meta-pair-row">
                {selectedEntry.model ? (
                  <div className="lab-newlayout-history-lightbox-meta-pair-cell">
                    <span>Model</span>
                    <strong className="lab-newlayout-history-lightbox-meta-mono">{formatModelName(selectedEntry.model)}</strong>
                  </div>
                ) : null}
                {selectedEntry.status ? (
                  <div className="lab-newlayout-history-lightbox-meta-pair-cell">
                    <span>Status</span>
                    <strong>{selectedEntry.status}</strong>
                  </div>
                ) : null}
              </div>
            ) : null}
            <div className="lab-newlayout-history-lightbox-meta-pair-row">
              <div className="lab-newlayout-history-lightbox-meta-pair-cell">
                <span>Folder</span>
                <strong>{[selectedEntryProjectLabel, selectedEntryFolderLabel || 'Project root'].filter(Boolean).join(' / ')}</strong>
              </div>
              <div className="lab-newlayout-history-lightbox-meta-pair-cell">
                <span>Reference</span>
                <strong>{lightboxIsReferencing ? 'Referencing…' : lightboxIsReferenced ? 'Referenced' : 'Not referenced yet'}</strong>
              </div>
            </div>
            {selectedEntry.status === 'failed' ? (
              <div className="lab-newlayout-history-lightbox-meta-row">
                <span>Failure</span>
                <strong title={selectedEntry.errorMessage || 'Generation failed'}>{selectedEntry.errorMessage || 'Generation failed'}</strong>
              </div>
            ) : null}
            {referenceMedia.length > 0 ? (
              <div className="lab-newlayout-history-lightbox-meta-refs">
                <div className="lab-newlayout-history-lightbox-meta-refs-label">
                  References ({referenceMedia.length})
                </div>
                <div className="lab-newlayout-history-lightbox-meta-refs-grid">
                  {referenceMedia.map((ref) => (
                    ref.kind === 'video' ? (
                      <button
                        key={ref.key}
                        type="button"
                        className="lab-newlayout-history-lightbox-meta-ref lab-newlayout-history-lightbox-meta-ref--action"
                        title={`video: ${ref.url}`}
                        onClick={() => { void handleDownloadVideo(selectedEntry, ref.url) }}
                        onContextMenu={(event) => {
                          event.preventDefault()
                          void handleDownloadVideo(selectedEntry, ref.url)
                        }}
                      >
                        <video src={buildVideoProxyUrl(ref.url) || ref.url} muted playsInline preload="metadata" />
                      </button>
                    ) : (
                      <a
                        key={ref.key}
                        className="lab-newlayout-history-lightbox-meta-ref"
                        href={ref.url}
                        target="_blank"
                        rel="noreferrer"
                        title={`${ref.kind}: ${ref.url}`}
                      >
                        {ref.kind === 'audio' ? (
                          <div className="lab-newlayout-history-lightbox-meta-ref-audio">♪</div>
                        ) : (
                          <img src={ref.url} alt="" loading="lazy" />
                        )}
                      </a>
                    )
                  ))}
                </div>
              </div>
            ) : null}
            {selectedEntry.timestamp || lightboxSourceUrl ? (
              <div className="lab-newlayout-history-lightbox-meta-pair-row">
                {selectedEntry.timestamp ? (
                  <div className="lab-newlayout-history-lightbox-meta-pair-cell">
                    <span>Completed</span>
                    <strong>{new Date(selectedEntry.timestamp).toLocaleString()}</strong>
                  </div>
                ) : null}
                {lightboxSourceUrl ? (
                  <div className="lab-newlayout-history-lightbox-meta-pair-cell">
                    <span>Saved In</span>
                    <strong>{lightboxStorageLabel}</strong>
                  </div>
                ) : null}
              </div>
            ) : null}
            {selectedEntry.taskId ? (
              <div className="lab-newlayout-history-lightbox-meta-row">
                <span>Task ID</span>
                <strong className="lab-newlayout-history-lightbox-meta-mono">{selectedEntry.taskId}</strong>
                <button
                  type="button"
                  className="lab-newlayout-history-lightbox-action lab-newlayout-history-lightbox-task-recovery-btn"
                  onClick={() => handleRecoverFromTaskId()}
                  disabled={isRecoveringTask}
                >
                  {isRecoveringTask ? 'Recovering...' : 'Use For Recovery'}
                </button>
              </div>
            ) : null}
            {selectedEntry.submittedAt && selectedEntry.completedAt ? (
              <div className="lab-newlayout-history-lightbox-meta-row">
                <span>Time to Generate</span>
                <strong>{calculateGenerationMetrics(selectedEntry.submittedAt, selectedEntry.completedAt).durationFormatted}</strong>
              </div>
            ) : null}
            {selectedEntry.resultUrl && selectedEntry.submittedAt && !selectedEntry.resultUrl.includes('firebasestorage') ? (
              <div className={`lab-newlayout-history-lightbox-meta-row ${getExpiryStatusClass(calculateUrlExpiry(selectedEntry.submittedAt))}`}>
                <span>Link Expires</span>
                <strong className="lab-newlayout-history-lightbox-expiry-status">
                  {getExpiryStatusLabel(calculateUrlExpiry(selectedEntry.submittedAt))}
                </strong>
              </div>
            ) : null}
            {selectedEntryFailureReason ? (
              <div className="lab-newlayout-history-lightbox-meta-row lab-newlayout-history-lightbox-meta-row--error">
                <span>⚠ Failure reason</span>
                <strong>{selectedEntryFailureReason}</strong>
              </div>
            ) : null}
            <div className="lab-newlayout-history-lightbox-meta-json">
              <button
                type="button"
                className="lab-newlayout-history-lightbox-json-toggle"
                onClick={() => setIsJsonExpanded((current) => !current)}
              >
                <span className={`lab-newlayout-history-lightbox-json-chevron${isJsonExpanded ? ' is-open' : ''}`}>▸</span>
                <span>Request JSON</span>
                <span className="lab-newlayout-history-lightbox-json-model">{selectedEntry.model || 'unknown'}</span>
              </button>
              {isJsonExpanded ? (
                <div className="lab-newlayout-history-lightbox-json-body">
                  <div className="lab-newlayout-history-lightbox-json-meta">
                    {selectedEntry.requestEndpoint ? (
                      <span><strong>Endpoint:</strong> {selectedEntry.requestEndpoint}</span>
                    ) : null}
                    <button
                      type="button"
                      className="lab-newlayout-history-lightbox-json-copy"
                      onClick={handleCopyJson}
                    >
                      Copy
                    </button>
                  </div>
                  <pre className="lab-newlayout-history-lightbox-json-pre">{requestJsonText}</pre>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  ) : null

  return (
    <div className="lab-newlayout-panel lab-newlayout-panel--history-gallery">
      <div className="lab-newlayout-history-top-fixed">
        <div className="lab-newlayout-history-toolbar">
          <div className="lab-newlayout-history-toolbar-stats">
            <span className="lab-newlayout-history-stat">{title}</span>
            {!isLoading ? (
              <span className="lab-newlayout-history-toolbar-note">
                  {visibleEntries.length} shown{filteredProjectEntries.length > visibleEntries.length ? ` of ${filteredProjectEntries.length}` : projectScopedEntries.length !== filteredProjectEntries.length ? ` of ${filteredProjectEntries.length}` : ''}
                {hiddenFailedCount > 0 ? ` · ${hiddenFailedCount} failed hidden` : ''}
                {Object.keys(movingToFirebaseIds).length > 0 ? ` · uploading ${Object.keys(movingToFirebaseIds).length}` : ''}
              </span>
            ) : null}
          </div>
          <div className="lab-newlayout-history-toolbar-actions">
            <button
              type="button"
              className="lab-newlayout-history-toolbar-btn"
              onClick={handleHistoryDiagnose}
            >
              Run Diagnostics
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="lab-newlayout-history-toolbar-btn"
                >
                  Filter: {historyFilterSummaryLabel}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-55">
                <DropdownMenuLabel>History Gallery</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                  value={historyFilterMode}
                  onValueChange={(value) => {
                    if (value === 'all' || value === 'liked' || value === 'failed') {
                      setHistoryFilterMode(value)
                    }
                  }}
                >
                  <DropdownMenuRadioItem value="all">Show all generations</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="liked">Only liked generations</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="failed">Show failed generations</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={historyFilterMode === 'failed' ? true : showFailedGenerations}
                  disabled={historyFilterMode === 'failed'}
                  onCheckedChange={(checked) => {
                    if (historyFilterMode === 'failed') {
                      return
                    }
                    setShowFailedGenerations(Boolean(checked))
                  }}
                >
                  Include failed in normal views
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              type="button"
              className="lab-newlayout-history-toolbar-btn"
              onClick={() => { void refresh() }}
            >
              Refresh
            </button>
          </div>
        </div>
      </div>
      {isLoading ? (
        <div className="lab-newlayout-history-loading">Loading…</div>
      ) : entries.length === 0 ? (
        <div className="lab-newlayout-history-loading">No generations yet.</div>
      ) : filteredProjectEntries.length === 0 ? (
        <div className="lab-newlayout-history-loading">
          {projectScopedEntries.length === 0
            ? 'No generations in this scope yet.'
            : historyFilterMode === 'failed'
              ? 'No failed generations in this scope.'
              : historyFilterMode === 'liked'
                ? 'No liked generations match this filter.'
                : hiddenFailedCount > 0
                  ? 'Only failed generations are in this scope. Use Filter to show them.'
                  : 'No generations match this filter.'}
        </div>
      ) : (
        <>
          {errorMessage ? (
            <div className="lab-newlayout-history-loading">{errorMessage}</div>
          ) : null}
          <div className="lab-newlayout-history-gallery-grid">
            {visibleEntries.map((entry) => (
              <GalleryCard
                key={`${entry.id}-${entry.timestamp}`}
                entry={entry}
                onClick={() => setSelectedEntry(entry)}
                isLiked={likedIds.has(entry.id)}
                onToggleLike={toggleLiked}
                isDownloaded={isDownloaded(entry.resultUrl || Object.values(entry.mediaUrls)[0] || '')}
                onDownloadVideo={handleDownloadVideo}
                onReuse={handleReuseFromEntry}
                onMoveToFirebase={moveHistoryVideoToFirebase}
                isMovingToFirebase={Boolean(movingToFirebaseIds[entry.id])}
                onExtendBefore={(target) => { void handleExtendFromEntry('before', target) }}
                onExtendAfter={(target) => { void handleExtendFromEntry('after', target) }}
                onSetCompareBefore={(url) => { setCompareBeforeUrl(url) }}
                onSetCompareAfter={(url) => { setCompareAfterUrl(url) }}
                onCapturePoster={(id, dataUrl) => updateHistoryItem(id, { posterUrl: dataUrl })}
                onDelete={(entryId) => {
                  const targetEntry = projectScopedEntries.find((entry) => entry.id === entryId)
                  if (!targetEntry) {
                    removeHistoryItem(entryId)
                    return
                  }
                  void handleDeleteHistoryEntry(targetEntry)
                }}
              />
            ))}
          </div>
          {hasMoreEntries ? (
            <div className="lab-newlayout-history-pagination">
              <button
                type="button"
                className="lab-newlayout-ui-settings-action"
                onClick={() => { void handleLoadMoreEntries() }}
                disabled={isLoadingMore}
              >
                {isLoadingMore ? 'Loading…' : 'Load more'}
              </button>
              <span className="lab-newlayout-history-pagination-copy">
                Showing {visibleEntries.length} / {hasMoreRemote ? `${projectScopedEntries.length}+` : projectScopedEntries.length}
              </span>
            </div>
          ) : null}
        </>
      )}
      {lightbox}
    </div>
  )
}

function ReferencesPanel(props: IDockviewPanelProps<PanelSuggestionParams>) {
  const REFERENCE_PAGE_SIZE = 36
  const REFERENCE_SKELETON_COUNT = 10
  const addComposerReference = useLabNewLayoutStore((state) => state.addComposerReference)
  const composerReferences = useLabNewLayoutStore((state) => state.composerReferences)
  const pendingGenerationAssets = useLabNewLayoutStore((state) => state.pendingGenerationAssets)
  const { authUid, studioProjectId, studioActiveFolderId, projectReferenceLibraryItems, projectReferenceLibraryLoading, compareBeforeUrl, compareAfterUrl, setCompareBeforeUrl, setCompareAfterUrl } = useLabNewLayoutData()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoPreviewRefs = useRef<Record<string, HTMLVideoElement | null>>({})
  const hoveredVideoIdRef = useRef<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadingCount, setUploadingCount] = useState(0)
  const [visibleReferenceCount, setVisibleReferenceCount] = useState(REFERENCE_PAGE_SIZE)
  const [referenceFilterMode, setReferenceFilterMode] = useState<ReferenceLibraryFilterMode>('all')
  const [pendingReferenceUploads, setPendingReferenceUploads] = useState<PendingReferenceUpload[]>([])
  const [selectedReferenceItem, setSelectedReferenceItem] = useState<StudioReferenceAsset | null>(null)
  const [liveReferenceLibraryItems, setLiveReferenceLibraryItems] = useState<StudioReferenceAsset[] | null>(null)
  const [liveReferenceLibraryLoading, setLiveReferenceLibraryLoading] = useState(() => Boolean(studioProjectId))
  // subscriptionKey increments when the panel becomes active so the subscription is
  // guaranteed to (re)start even if studioProjectId hasn't changed since mount.
  // This handles the case where Dockview mounts the panel as inactive (another panel
  // receives setActive during layout construction) and only later restores References
  // as the active tab via api.fromJSON.
  const [subscriptionKey, setSubscriptionKey] = useState(0)
  const [uploadScope, setUploadScope] = useState<'project' | 'folder'>(() => (studioActiveFolderId ? 'folder' : 'project'))
  const { showToast: showRefToast } = useToast()
  const { has: isReferenceLiked, toggle: toggleReferenceLiked } = useLikedReferenceUrls()

  // Bump subscriptionKey when the panel first becomes active (handles fromJSON restore).
  useEffect(() => {
    const disposable = props.api.onDidActiveChange(() => {
      if (props.api.isActive) {
        setSubscriptionKey((k) => k + 1)
      }
    })
    // Also trigger immediately if the panel is already active at mount time.
    if (props.api.isActive) {
      setSubscriptionKey((k) => k + 1)
    }
    return () => disposable.dispose()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const removePendingReferenceUpload = useCallback((pendingId: string) => {
    setPendingReferenceUploads((current) => {
      const next = current.filter((item) => item.id !== pendingId)
      return next.length === current.length ? current : next
    })
  }, [])

  const canMirrorReferenceUrlInBrowser = useCallback((value: string) => {
    try {
      const parsed = new URL(value, window.location.href)
      return parsed.origin === window.location.origin
        || parsed.hostname.includes('firebasestorage.googleapis.com')
        || parsed.hostname.includes('firebasestorage.app')
    } catch {
      return false
    }
  }, [])

  useEffect(() => {
    if (uploadScope === 'folder' && !studioActiveFolderId) {
      setUploadScope('project')
    }
  }, [studioActiveFolderId, uploadScope])

  useEffect(() => {
    if (!studioProjectId) {
      setLiveReferenceLibraryItems(null)
      setLiveReferenceLibraryLoading(false)
      return
    }

    setLiveReferenceLibraryLoading(true)
    const unsubscribe = subscribeToProjectReferenceLibrary(
      studioProjectId,
      (items) => {
        setLiveReferenceLibraryItems(items)
        setLiveReferenceLibraryLoading(false)
      },
      () => {
        setLiveReferenceLibraryLoading(false)
      },
    )

    return unsubscribe
  }, [studioProjectId, subscriptionKey])

  const effectiveReferenceLibraryItems = liveReferenceLibraryItems ?? projectReferenceLibraryItems

  useEffect(() => {
    const savedReferenceIds = new Set(effectiveReferenceLibraryItems.map((item) => item.id))
    setPendingReferenceUploads((current) => {
      const next = current.filter((item) => !savedReferenceIds.has(item.id))
      return next.length === current.length ? current : next
    })
  }, [effectiveReferenceLibraryItems])

  useEffect(() => {
    if (!selectedReferenceItem) {
      return
    }

    if (!effectiveReferenceLibraryItems.some((item) => item.id === selectedReferenceItem.id)) {
      setSelectedReferenceItem(null)
    }
  }, [effectiveReferenceLibraryItems, selectedReferenceItem])

  const scopedLibraryItems = useMemo(() => {
    const filtered = !studioActiveFolderId
      ? effectiveReferenceLibraryItems.filter((item) => !item.folderId)
      : effectiveReferenceLibraryItems.filter((item) => !item.folderId || item.folderId === studioActiveFolderId)
    return [...filtered].sort((a, b) => resolveReferenceItemSortKey(b) - resolveReferenceItemSortKey(a))
  }, [effectiveReferenceLibraryItems, studioActiveFolderId])

  const filteredLibraryItems = useMemo(() => {
    return scopedLibraryItems.filter((item) => {
      if (referenceFilterMode === 'liked') {
        return isReferenceLiked(item.url)
      }

      if (referenceFilterMode === 'all') {
        return true
      }

      return item.kind === referenceFilterMode
    })
  }, [isReferenceLiked, referenceFilterMode, scopedLibraryItems])

  const filteredPendingReferenceUploads = useMemo(() => {
    return pendingReferenceUploads.filter((item) => {
      if (referenceFilterMode === 'liked' || referenceFilterMode === 'all') {
        return true
      }

      return item.kind === referenceFilterMode
    })
  }, [pendingReferenceUploads, referenceFilterMode])

  const filteredPendingGenerationAssets = useMemo(() => {
    if (referenceFilterMode === 'liked' || referenceFilterMode === 'all' || referenceFilterMode === 'image') {
      return pendingGenerationAssets
    }
    return []
  }, [pendingGenerationAssets, referenceFilterMode])

  const visibleLibraryItems = useMemo<VisibleReferenceItem[]>(() => {
    const sortedItems = [...filteredPendingGenerationAssets, ...filteredPendingReferenceUploads, ...filteredLibraryItems].sort(
      (a, b) => resolveReferenceItemSortKey(b) - resolveReferenceItemSortKey(a),
    )
    const uniqueItems = new Map<string, VisibleReferenceItem>()

    for (const item of sortedItems) {
      if (!uniqueItems.has(item.id)) {
        uniqueItems.set(item.id, item)
      }
    }

    return Array.from(uniqueItems.values())
  }, [filteredLibraryItems, filteredPendingReferenceUploads, filteredPendingGenerationAssets])

  const referenceFilterSummaryLabel = useMemo(() => {
    switch (referenceFilterMode) {
      case 'liked':
        return 'Liked only'
      case 'image':
        return 'Images only'
      case 'video':
        return 'Videos only'
      case 'audio':
        return 'Audio only'
      default:
        return 'All'
    }
  }, [referenceFilterMode])

  const isReferenceListSyncing = liveReferenceLibraryLoading || (liveReferenceLibraryItems === null && projectReferenceLibraryLoading)
  const showReferenceSkeletons = Boolean(
    studioProjectId
    && scopedLibraryItems.length === 0
    && pendingReferenceUploads.length === 0
    && pendingGenerationAssets.length === 0
    && isReferenceListSyncing,
  )

  const pagedLibraryItems = useMemo(() => (
    visibleLibraryItems.slice(0, visibleReferenceCount)
  ), [visibleLibraryItems, visibleReferenceCount])

  const hasMoreLibraryItems = visibleLibraryItems.length > visibleReferenceCount

  useEffect(() => {
    setVisibleReferenceCount(REFERENCE_PAGE_SIZE)
  }, [referenceFilterMode, studioProjectId, studioActiveFolderId])

  useEffect(() => {
    setVisibleReferenceCount((current) => Math.min(Math.max(current, REFERENCE_PAGE_SIZE), Math.max(visibleLibraryItems.length, REFERENCE_PAGE_SIZE)))
  }, [visibleLibraryItems.length])

  const handleLoadMoreReferences = useCallback(() => {
    setVisibleReferenceCount((current) => current + REFERENCE_PAGE_SIZE)
  }, [])

  const uploadUrlToFirebase = useCallback(async (url: string, kind: 'image' | 'video' | 'audio', name: string): Promise<string | null> => {
    try {
      const targetFolderId = uploadScope === 'folder' ? studioActiveFolderId : null
      const folderPathSegment = targetFolderId ? `folders/${targetFolderId}` : 'project'
      const storagePathPrefix = `lab-references/projects/${studioProjectId}/${folderPathSegment}`
      const response = await fetch('/api/lab/references/upload-by-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url,
          name,
          kind,
          storagePathPrefix,
          firebaseConfig,
          mimeType: kind === 'video' ? 'video/mp4' : kind === 'audio' ? 'audio/mpeg' : 'image/jpeg',
        }),
      })
      const payload = await response.json().catch(() => null) as { error?: string; saved?: { firebaseUrl?: string } } | null
      if (!response.ok) {
        throw new Error(payload?.error || 'Reference upload failed')
      }
      return payload?.saved?.firebaseUrl || null
    } catch {
      return null
    }
  }, [studioActiveFolderId, studioProjectId, uploadScope])

  const appendLibraryReference = useCallback(async (reference: DragReferencePayload, options?: { itemId?: string }): Promise<boolean> => {
    if (!studioProjectId) {
      showRefToast({ message: 'Select a Studio project first', type: 'warning' })
      return false
    }

    const targetFolderId = uploadScope === 'folder' ? studioActiveFolderId : null
    const normalizedUrl = reference.url.trim()
    if (!normalizedUrl) return false

    const isHistoryReference = reference.fromHistory === true
    let finalUrl = normalizedUrl
    if (isHistoryReference) {
      if (canMirrorReferenceUrlInBrowser(normalizedUrl)) {
        showRefToast({ message: `Uploading ${reference.kind} to Firebase...`, type: 'info' })
        setUploadingCount((n) => n + 1)
        const firebaseUrl = await uploadUrlToFirebase(normalizedUrl, reference.kind, reference.name)
        setUploadingCount((n) => Math.max(0, n - 1))

        if (!firebaseUrl) {
          showRefToast({ message: `Failed to upload ${reference.kind} to Firebase`, type: 'error' })
          return false
        }

        finalUrl = firebaseUrl
        showRefToast({ message: `${reference.kind} uploaded to Firebase successfully`, type: 'success' })
      } else {
        showRefToast({
          message: 'Source blocks client-side copying, so this reference was saved by URL instead of mirrored to Firebase.',
          type: 'info',
        })
      }
    }

    const exists = projectReferenceLibraryItems.some(
      (item) => item.url === finalUrl && (item.folderId || null) === (targetFolderId || null),
    )
    if (exists) return false

    const itemId = options?.itemId || `ref-${Date.now()}-${Math.random().toString(36).slice(2)}`
    await saveProjectReferenceLibraryItem(studioProjectId, {
      id: itemId,
      url: finalUrl,
      kind: reference.kind,
      name: reference.name,
      createdAt: Date.now(),
      folderId: targetFolderId,
    }, authUid || 'anon')

    return true
  }, [authUid, canMirrorReferenceUrlInBrowser, projectReferenceLibraryItems, setUploadingCount, showRefToast, studioActiveFolderId, studioProjectId, uploadScope, uploadUrlToFirebase])

  const uploadFiles = useCallback(async (files: File[]) => {
    if (!studioProjectId) {
      showRefToast({ message: 'Select a Studio project first', type: 'warning' })
      return
    }

    if (!files.length) return
    const validFiles = files.filter((f) => f.type.startsWith('image/') || f.type.startsWith('video/') || f.type.startsWith('audio/'))
    if (!validFiles.length) {
      showRefToast({ message: 'Only image, video, and audio files are supported', type: 'warning' })
      return
    }

    const targetFolderId = uploadScope === 'folder' ? studioActiveFolderId : null
    const folderPathSegment = targetFolderId ? `folders/${targetFolderId}` : 'project'
    const pendingItems: PendingReferenceUpload[] = validFiles.map((file, index) => ({
      id: `ref-${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`,
      kind: file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'image',
      name: file.name,
      createdAt: Date.now() + index,
      isPending: true as const,
    }))
    setPendingReferenceUploads((current) => [...pendingItems, ...current])
    setUploadingCount((n) => n + validFiles.length)
    await Promise.all(validFiles.map(async (file, index) => {
      const pendingItem = pendingItems[index]
      try {
        const ext = file.name.split('.').pop() ?? ''
        const uniqueName = `lab-references/projects/${studioProjectId}/${folderPathSegment}/${authUid || 'anon'}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
        const ref = storageRef(storage, uniqueName)
        await uploadBytes(ref, file, { contentType: file.type })
        const url = await getDownloadURL(ref)
        const kind: 'image' | 'video' | 'audio' = file.type.startsWith('video/')
          ? 'video'
          : file.type.startsWith('audio/')
            ? 'audio'
            : 'image'

        const added = await appendLibraryReference({ url, kind, name: file.name }, { itemId: pendingItem.id })
        if (!added) {
          removePendingReferenceUpload(pendingItem.id)
        }
      } catch {
        removePendingReferenceUpload(pendingItem.id)
        showRefToast({ message: `Failed to upload ${file.name}`, type: 'error' })
      } finally {
        setUploadingCount((n) => Math.max(0, n - 1))
      }
    }))
  }, [appendLibraryReference, authUid, removePendingReferenceUpload, showRefToast, studioActiveFolderId, studioProjectId, uploadScope])

  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    setIsDragOver(false)

    const droppedHistoryReference = readHistoryReferencePayload(event.dataTransfer)
    if (droppedHistoryReference) {
      void appendLibraryReference(droppedHistoryReference).then((added) => {
        showRefToast({
          message: added
            ? `Saved ${droppedHistoryReference.kind} to project references`
            : 'Reference already exists in this scope',
          type: added ? 'success' : 'info',
        })
      }).catch(() => {
        showRefToast({ message: 'Failed to save reference', type: 'error' })
      })
      return
    }

    const files = Array.from(event.dataTransfer.files)
    void uploadFiles(files)
  }, [appendLibraryReference, showRefToast, uploadFiles])

  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node)) {
      setIsDragOver(false)
    }
  }, [])

  const handleFileInput = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    event.target.value = ''
    void uploadFiles(files)
  }, [uploadFiles])

  const handlePlusClick = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleOpenReferenceItem = useCallback((item: StudioReferenceAsset) => {
    setSelectedReferenceItem(item)
  }, [])

  const handleCloseReferenceItem = useCallback(() => {
    setSelectedReferenceItem(null)
  }, [])

  const handleVideoHoverStart = useCallback((itemId: string) => {
    hoveredVideoIdRef.current = itemId
    for (const [currentId, media] of Object.entries(videoPreviewRefs.current)) {
      if (!media || currentId === itemId) continue
      media.pause()
      media.currentTime = 0
    }

    const media = videoPreviewRefs.current[itemId]
    if (!media) return
    media.muted = true
    void media.play().catch(() => {
      void media.play().catch(() => undefined)
    })
  }, [])

  const handleVideoHoverEnd = useCallback((itemId: string) => {
    if (hoveredVideoIdRef.current === itemId) {
      hoveredVideoIdRef.current = null
    }
    const media = videoPreviewRefs.current[itemId]
    if (!media) return
    media.pause()
    media.currentTime = 0
    media.muted = true
  }, [])

  useEffect(() => () => {
    for (const media of Object.values(videoPreviewRefs.current)) {
      if (!media) continue
      media.pause()
      media.currentTime = 0
    }
  }, [])

  const handleAddToComposer = useCallback((item: StudioReferenceAsset) => {
    if (composerReferences.some((ref) => ref.url === item.url)) {
      showRefToast({ message: 'Already in composer references', type: 'info' })
      return
    }

    addComposerReference({
      id: `composer-ref-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      url: item.url,
      kind: item.kind,
      name: item.name,
    })
    showRefToast({ message: 'Added to composer references', type: 'success' })
  }, [addComposerReference, composerReferences, showRefToast])

  const handleReferenceDragStart = useCallback((event: React.DragEvent<HTMLDivElement>, item: StudioReferenceAsset) => {
    const payload = {
      id: `composer-ref-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      url: item.url,
      kind: item.kind,
      name: item.name,
    }
    event.dataTransfer.effectAllowed = 'copy'
    event.dataTransfer.setData('application/json', JSON.stringify(payload))
    event.dataTransfer.setData(LAB_NEWLAYOUT_HISTORY_REF_MIME, JSON.stringify(payload))
    event.dataTransfer.setData('text/uri-list', item.url)
    event.dataTransfer.setData('text/plain', item.url)
  }, [])

  const handleDeleteLibraryItem = useCallback(async (item: StudioReferenceAsset) => {
    if (!studioProjectId) return

    const approved = typeof window === 'undefined'
      ? true
      : window.confirm(`Remove "${item.name}" from project references? This will not remove it from composer.`)

    if (!approved) return

    try {
      await deleteProjectReferenceLibraryItem(studioProjectId, item.id)
      setSelectedReferenceItem((current) => (current?.id === item.id ? null : current))
      showRefToast({ message: 'Removed from project references', type: 'success' })
    } catch {
      showRefToast({ message: 'Failed to remove reference', type: 'error' })
    }
  }, [showRefToast, studioProjectId])

  const importComposerReferences = useCallback(async () => {
    if (!studioProjectId) {
      showRefToast({ message: 'Select a Studio project first', type: 'warning' })
      return
    }

    const targetFolderId = uploadScope === 'folder' ? studioActiveFolderId : null
    const existing = new Set(
      projectReferenceLibraryItems
        .filter((item) => (item.folderId || null) === (targetFolderId || null))
        .map((item) => item.url),
    )

    const candidates = composerReferences.filter((item) => !existing.has(item.url))
    if (!candidates.length) {
      showRefToast({ message: 'All composer references are already in project library', type: 'info' })
      return
    }

    try {
      await Promise.all(candidates.map((item) => saveProjectReferenceLibraryItem(studioProjectId, {
        id: `ref-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        url: item.url,
        kind: item.kind,
        name: item.name,
        createdAt: Date.now(),
        folderId: targetFolderId,
      }, authUid || 'anon')))
      showRefToast({ message: `Imported ${candidates.length} composer reference${candidates.length === 1 ? '' : 's'}`, type: 'success' })
    } catch {
      showRefToast({ message: 'Failed to import composer references', type: 'error' })
    }
  }, [authUid, composerReferences, projectReferenceLibraryItems, showRefToast, studioActiveFolderId, studioProjectId, uploadScope])

  const hasFolderScope = Boolean(studioActiveFolderId)
  const { projectCount, folderCount } = useMemo(() => {
    let nextProjectCount = 0
    let nextFolderCount = 0
    for (const item of projectReferenceLibraryItems) {
      if (!item.folderId) {
        nextProjectCount += 1
      }
      if (studioActiveFolderId && item.folderId === studioActiveFolderId) {
        nextFolderCount += 1
      }
    }
    return {
      projectCount: nextProjectCount,
      folderCount: nextFolderCount,
    }
  }, [projectReferenceLibraryItems, studioActiveFolderId])
  const activeScopeLabel = uploadScope === 'folder' && studioActiveFolderId ? 'Folder' : 'Project'
  const hasAnyScopedReferences = scopedLibraryItems.length > 0 || pendingReferenceUploads.length > 0
  const selectedReferenceSourceUrl = useMemo(
    () => (selectedReferenceItem ? resolveProxySourceUrl(selectedReferenceItem.url) : ''),
    [selectedReferenceItem],
  )
  const selectedReferenceVideoUrl = useMemo(() => {
    if (!selectedReferenceItem || selectedReferenceItem.kind !== 'video') {
      return ''
    }

    return buildVideoProxyUrl(selectedReferenceSourceUrl) || selectedReferenceSourceUrl
  }, [selectedReferenceItem, selectedReferenceSourceUrl])
  const selectedReferenceIsLiked = selectedReferenceItem ? isReferenceLiked(selectedReferenceItem.url) : false
  const referenceLightbox = selectedReferenceItem ? createPortal(
    <div
      className="lab-newlayout-history-lightbox-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Reference preview"
      onClick={handleCloseReferenceItem}
    >
      <div
        className="lab-newlayout-history-lightbox lab-newlayout-reference-lightbox"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="lab-newlayout-history-lightbox-head">
          <div>
            <div className="lab-newlayout-history-lightbox-kicker">Reference · {selectedReferenceItem.kind}</div>
            <div className="lab-newlayout-history-lightbox-title">{selectedReferenceItem.name || 'Reference asset'}</div>
          </div>
          <div className="lab-newlayout-history-lightbox-head-actions">
            <button
              type="button"
              className={`lab-newlayout-history-lightbox-like${selectedReferenceIsLiked ? ' is-liked' : ''}`}
              onClick={() => toggleReferenceLiked(selectedReferenceItem.url)}
              aria-label={selectedReferenceIsLiked ? 'Unlike reference' : 'Like reference'}
              title={selectedReferenceIsLiked ? 'Unlike reference' : 'Like reference'}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill={selectedReferenceIsLiked ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              <span>{selectedReferenceIsLiked ? 'Liked' : 'Like'}</span>
            </button>
            <button
              type="button"
              className="lab-newlayout-history-lightbox-action"
              onClick={() => handleAddToComposer(selectedReferenceItem)}
            >
              Add to composer
            </button>
            <button
              type="button"
              className="lab-newlayout-history-lightbox-action"
              onClick={() => {
                if (!selectedReferenceSourceUrl) return
                window.open(selectedReferenceSourceUrl, '_blank', 'noopener,noreferrer')
              }}
              disabled={!selectedReferenceSourceUrl}
            >
              Open link
            </button>
            {(selectedReferenceItem.kind === 'image' || selectedReferenceItem.kind === 'video') && (
              <button
                type="button"
                className="lab-newlayout-history-lightbox-action"
                onClick={() => {
                  setCompareBeforeUrl(selectedReferenceSourceUrl)
                }}
              >
                Compare
              </button>
            )}
            <button
              type="button"
              className="lab-newlayout-history-lightbox-close"
              onClick={handleCloseReferenceItem}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="lab-newlayout-reference-lightbox-body">
          <div className="lab-newlayout-reference-lightbox-media">
            {selectedReferenceItem.kind === 'video' ? (
              <video
                className="lab-newlayout-reference-lightbox-media-element"
                src={selectedReferenceVideoUrl}
                controls
                autoPlay
                playsInline
              />
            ) : selectedReferenceItem.kind === 'audio' ? (
              <div className="lab-newlayout-reference-lightbox-audio-shell">
                <div className="lab-newlayout-reference-lightbox-audio-icon">♪</div>
                <audio className="lab-newlayout-reference-lightbox-audio" src={selectedReferenceSourceUrl} controls autoPlay />
              </div>
            ) : (
              <img
                className="lab-newlayout-reference-lightbox-media-element lab-newlayout-reference-lightbox-image"
                src={selectedReferenceSourceUrl}
                alt={selectedReferenceItem.name}
              />
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body,
  ) : null

  return (
    <div
      className={`lab-newlayout-panel lab-newlayout-panel--references${isDragOver ? ' is-drag-over' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*,audio/*"
        multiple
        className="lab-newlayout-references-file-input"
        aria-label="Upload reference images, videos, or audio"
        onChange={handleFileInput}
      />
      <div className="lab-newlayout-history-top-fixed">
        <div className="lab-newlayout-history-toolbar">
          <div className="lab-newlayout-history-toolbar-stats">
            <span className="lab-newlayout-history-stat">References</span>
            <span className="lab-newlayout-history-toolbar-note">
              {visibleLibraryItems.length} visible · {projectCount} project{hasFolderScope ? ` · ${folderCount} folder` : ''}
              {uploadingCount > 0 ? ` · uploading ${uploadingCount}…` : ''}
              {uploadingCount === 0 && isReferenceListSyncing ? ' · loading references…' : ''}
            </span>
          </div>
          <div className="lab-newlayout-references-toolbar-actions">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="lab-newlayout-history-toolbar-btn"
                >
                  Filter: {referenceFilterSummaryLabel}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-55">
                <DropdownMenuLabel>References</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                  value={referenceFilterMode}
                  onValueChange={(value) => {
                    if (value === 'all' || value === 'liked' || value === 'image' || value === 'video' || value === 'audio') {
                      setReferenceFilterMode(value)
                    }
                  }}
                >
                  <DropdownMenuRadioItem value="all">Show all references</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="liked">Only liked references</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="image">Only images</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="video">Only videos</DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="audio">Only audio</DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="lab-newlayout-references-scope-toggle" aria-label="Upload scope">
              <button
                type="button"
                className={`lab-newlayout-references-scope-btn${uploadScope === 'project' ? ' is-active' : ''}`}
                onClick={() => setUploadScope('project')}
              >
                Project
              </button>
              <button
                type="button"
                className={`lab-newlayout-references-scope-btn${uploadScope === 'folder' ? ' is-active' : ''}`}
                onClick={() => setUploadScope('folder')}
                disabled={!hasFolderScope}
                title={hasFolderScope ? 'Upload into current folder scope' : 'Select a folder to enable folder upload'}
              >
                Folder
              </button>
            </div>
            <button type="button" className="lab-newlayout-references-add-btn" onClick={handlePlusClick} title={`Add files to ${activeScopeLabel}`}>
              <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 3a.75.75 0 0 1 .75.75V7.25h3.5a.75.75 0 0 1 0 1.5h-3.5v3.5a.75.75 0 0 1-1.5 0v-3.5H3.75a.75.75 0 0 1 0-1.5h3.5V3.75A.75.75 0 0 1 8 3Z"/></svg>
              Add
            </button>
          </div>
        </div>
      </div>

      <div className="lab-newlayout-references-drop-zone">
        {isDragOver && (
          <div className="lab-newlayout-references-drop-hint">
            Drop files or history items here
          </div>
        )}
        {!studioProjectId && !isDragOver ? (
          <div className="lab-newlayout-references-empty">
            <div className="lab-newlayout-references-plus-card lab-newlayout-references-plus-card--static">
              <span>Select a Studio project to manage shared references.</span>
              <span className="lab-newlayout-references-plus-card-sub">Project references are independent from composer references.</span>
            </div>
          </div>
        ) : visibleLibraryItems.length === 0 && !showReferenceSkeletons && !isDragOver ? (
          <div className="lab-newlayout-references-empty">
            {hasAnyScopedReferences ? (
              <div className="lab-newlayout-references-plus-card lab-newlayout-references-plus-card--static">
                <span>No references match this filter.</span>
                <span className="lab-newlayout-references-plus-card-sub">Change Filter to see other image, video, or audio assets.</span>
              </div>
            ) : (
              <div className="lab-newlayout-references-empty-actions">
                <button type="button" className="lab-newlayout-references-plus-card" onClick={handlePlusClick}>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5a.75.75 0 0 1 .75.75V11.25H18.25a.75.75 0 0 1 0 1.5H12.75v5.5a.75.75 0 0 1-1.5 0v-5.5H5.75a.75.75 0 0 1 0-1.5h5.5V5.75A.75.75 0 0 1 12 5Z"/></svg>
                  <span>Add images, videos, or audio</span>
                  <span className="lab-newlayout-references-plus-card-sub">Saved as {activeScopeLabel.toLowerCase()} reference · drag from desktop or History Gallery</span>
                </button>
                {composerReferences.length > 0 ? (
                  <button type="button" className="lab-newlayout-references-import-btn" onClick={() => { void importComposerReferences() }}>
                    Import current composer refs
                  </button>
                ) : null}
              </div>
            )}
          </div>
        ) : (
          <div className="lab-newlayout-references-grid lab-newlayout-references-grid--active">
            <button type="button" className="lab-newlayout-reference-plus-tile" onClick={handlePlusClick} title="Add more">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5a.75.75 0 0 1 .75.75V11.25H18.25a.75.75 0 0 1 0 1.5H12.75v5.5a.75.75 0 0 1-1.5 0v-5.5H5.75a.75.75 0 0 1 0-1.5h5.5V5.75A.75.75 0 0 1 12 5Z"/></svg>
            </button>
            {showReferenceSkeletons
              ? Array.from({ length: REFERENCE_SKELETON_COUNT }).map((_, index) => (
                <div key={`ref-skeleton-${index}`} className="lab-newlayout-reference-item lab-newlayout-reference-item--skeleton" aria-hidden="true">
                  <div className="lab-newlayout-reference-thumb lab-newlayout-reference-thumb--image lab-newlayout-reference-thumb--skeleton" />
                </div>
              ))
              : null}
            {pagedLibraryItems.map((item) => {
              if (isPendingGenerationAsset(item)) {
                return (
                  <div
                    key={item.id}
                    className="lab-newlayout-reference-item lab-newlayout-reference-item--generating"
                    aria-label="Generating image…"
                    aria-live="polite"
                  >
                    <div
                      className="lab-newlayout-reference-thumb lab-newlayout-reference-thumb--image lab-newlayout-reference-thumb--generating"
                      style={item.referenceImageUrl ? { backgroundImage: `url(${item.referenceImageUrl})` } : undefined}
                    >
                      <div className="lab-newlayout-reference-generating-overlay">
                        <span className="lab-newlayout-reference-generating-spinner" aria-hidden="true" />
                        <span className="lab-newlayout-reference-generating-copy">Generating…</span>
                      </div>
                    </div>
                  </div>
                )
              }

              if (isPendingReferenceUpload(item)) {
                return (
                  <div
                    key={item.id}
                    className="lab-newlayout-reference-item lab-newlayout-reference-item--pending"
                    aria-hidden="true"
                  >
                    <div className={`lab-newlayout-reference-thumb lab-newlayout-reference-thumb--${item.kind} lab-newlayout-reference-thumb--pending`}>
                      <span className="lab-newlayout-reference-upload-kind">{item.kind}</span>
                      <span className="lab-newlayout-reference-upload-copy">Uploading…</span>
                    </div>
                  </div>
                )
              }

              const isLiked = isReferenceLiked(item.url)

              return (
                <div
                  key={item.id}
                  className="lab-newlayout-reference-item lab-newlayout-reference-item--openable is-draggable"
                  draggable
                  onClick={() => handleOpenReferenceItem(item)}
                  onDragStart={(event) => handleReferenceDragStart(event, item)}
                  onMouseEnter={() => {
                    if (item.kind === 'video') handleVideoHoverStart(item.id)
                  }}
                  onMouseLeave={() => {
                    if (item.kind === 'video') handleVideoHoverEnd(item.id)
                  }}
                >
                  {item.kind === 'video' ? (
                    <>
                      <video
                        ref={(element) => {
                          videoPreviewRefs.current[item.id] = element
                        }}
                        src={buildVideoProxyUrl(item.url) || item.url}
                        poster={_referencePosterCache.get(item.url)}
                        crossOrigin={(buildVideoProxyUrl(item.url) || item.url).includes('/api/video-proxy') ? undefined : 'anonymous'}
                        muted
                        playsInline
                        preload={_referencePosterCache.has(item.url) ? 'none' : 'metadata'}
                        onLoadedData={(event) => {
                          const el = event.currentTarget
                          if (!_referencePosterCache.has(item.url)) {
                            const dataUrl = _captureVideoFrame(el)
                            if (dataUrl) {
                              _referencePosterCache.set(item.url, dataUrl)
                              el.poster = dataUrl
                            }
                          }
                        }}
                        onPlay={(event) => {
                          if (hoveredVideoIdRef.current === item.id) return
                          event.currentTarget.pause()
                          event.currentTarget.currentTime = 0
                        }}
                        className="lab-newlayout-reference-thumb lab-newlayout-reference-thumb--video"
                      />
                      <span className="lab-newlayout-reference-video-indicator" aria-hidden="true">▶</span>
                    </>
                  ) : item.kind === 'audio' ? (
                    <div className="lab-newlayout-reference-thumb lab-newlayout-reference-thumb--audio">♪</div>
                  ) : (
                    <img
                      src={item.url}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      className="lab-newlayout-reference-thumb lab-newlayout-reference-thumb--image"
                    />
                  )}
                  <button
                    type="button"
                    className={`lab-newlayout-reference-heart${isLiked ? ' is-liked' : ''}`}
                    onClick={(event) => {
                      event.stopPropagation()
                      toggleReferenceLiked(item.url)
                    }}
                    aria-label={isLiked ? 'Unlike reference' : 'Like reference'}
                    title={isLiked ? 'Unlike reference' : 'Like reference'}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill={isLiked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className="lab-newlayout-reference-add-composer"
                    onClick={(event) => {
                      event.stopPropagation()
                      handleAddToComposer(item)
                    }}
                    title="Add to composer"
                  >
                    + Composer
                  </button>
                  {item.kind !== 'audio' ? (
                    <>
                      <button
                        type="button"
                        className="lab-newlayout-reference-compare-set-btn lab-newlayout-reference-compare-set-btn--before"
                        onClick={(event) => { event.stopPropagation(); setCompareBeforeUrl(item.url) }}
                        aria-label="Set as Before in comparison"
                        title="Set as Before"
                      >B</button>
                      <button
                        type="button"
                        className="lab-newlayout-reference-compare-set-btn lab-newlayout-reference-compare-set-btn--after"
                        onClick={(event) => { event.stopPropagation(); setCompareAfterUrl(item.url) }}
                        aria-label="Set as After in comparison"
                        title="Set as After"
                      >A</button>
                    </>
                  ) : null}
                  <button
                    type="button"
                    className="lab-newlayout-reference-remove"
                    onClick={(event) => {
                      event.stopPropagation()
                      void handleDeleteLibraryItem(item)
                    }}
                    title="Remove from project references"
                  >
                    <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4.22 4.22a.75.75 0 0 1 1.06 0L8 6.94l2.72-2.72a.75.75 0 1 1 1.06 1.06L9.06 8l2.72 2.72a.75.75 0 1 1-1.06 1.06L8 9.06l-2.72 2.72a.75.75 0 0 1-1.06-1.06L6.94 8 4.22 5.28a.75.75 0 0 1 0-1.06Z"/></svg>
                  </button>
                </div>
              )
            })}
            {hasMoreLibraryItems ? (
              <button
                type="button"
                className="lab-newlayout-reference-plus-tile lab-newlayout-reference-plus-tile--load-more"
                onClick={handleLoadMoreReferences}
                title="Load more references"
              >
                <span>Load more</span>
              </button>
            ) : null}
          </div>
        )}
      </div>
      {referenceLightbox}
    </div>
  )
}

type GrokExampleDef = {
  readonly id: string
  readonly label: string
  readonly description: string
  readonly refKind: 'none' | 'image' | 'video' | 'multi-image'
  readonly refCount: number
  readonly prompt: string
  readonly model: string
  readonly provider: string
  readonly modeId: string
  readonly capabilityGroup?: 'generation' | 'style-transfer' | 'multi-image' | 'understanding'
}

type GrokNavSubgroup = {
  readonly id: string
  readonly title: string
  readonly exampleIds: readonly string[]
}

type GrokNavGroup = {
  readonly id: string
  readonly title: string
  readonly subgroups: readonly GrokNavSubgroup[]
}

const GROK_EXAMPLES: readonly GrokExampleDef[] = [
  {
    id: 'text-video',
    label: 'Text → Video',
    description: 'Generate a cinematic shot from a text description only — no reference image needed.',
    refKind: 'none',
    refCount: 0,
    prompt: 'A silver-haired runner moves through a rain-soaked market alley at blue hour, neon reflections sliding across wet stone, handheld camera trailing close behind, subtle steam vents and passing umbrellas creating layered depth, cinematic contrast, realistic motion blur, ending on a brief look over the shoulder.',
    model: 'grok-imagine-video',
    provider: 'grok',
    modeId: 'video',
  },
  {
    id: 'img-video',
    label: 'Image → Video',
    description: 'Animate a still image while preserving its composition. Describe the motion only — not the frame itself.',
    refKind: 'image',
    refCount: 1,
    prompt: 'Preserve the framing and wardrobe from the source image. Add a slow push-in, soft wind through fabric and hair, drifting dust in the light shaft, and a restrained shift in expression that turns the still portrait into a living moment.',
    model: 'grok-imagine-video',
    provider: 'grok',
    modeId: 'video',
  },
  {
    id: 'ref-video',
    label: 'Reference → Video',
    description: 'Use 2–3 references to lock character, environment, or style while generating new motion.',
    refKind: 'multi-image',
    refCount: 3,
    prompt: 'Preserve the character identity and environment from the reference images. Generate a new motion sequence: the subject crosses the space, camera holds at mid-range, consistent lighting and color grade throughout.',
    model: 'grok-imagine-video',
    provider: 'grok',
    modeId: 'video',
  },
  {
    id: 'extend-video',
    label: 'Extend Video',
    description: 'Continue an existing video clip without breaking its motion or style continuity.',
    refKind: 'video',
    refCount: 1,
    prompt: 'Continue the same camera move and color grade. After the previous action, the vehicle clears the intersection, taillights stretch across the wet street, and the shot settles into a wider reveal of the avenue without changing lens language or subject scale.',
    model: 'grok-imagine-video',
    provider: 'grok',
    modeId: 'video',
  },
  {
    id: 'first-last',
    label: 'First & Last Frame',
    description: 'Lock the opening and closing frames, then let Grok solve the motion between them.',
    refKind: 'multi-image',
    refCount: 2,
    prompt: 'Use the first frame and the last frame as anchors. Preserve character identity, environment, and camera language while Grok solves the in-between motion. Camera arcs smoothly left as the subject steps forward, and the lighting shifts from cool dawn to warm sunrise by the final beat.',
    model: 'grok-imagine-video',
    provider: 'grok',
    modeId: 'video',
  },
  {
    id: 'image-gen',
    label: 'Image Generation',
    description: 'Generate a still image from text only. No reference image is required.',
    refKind: 'none',
    refCount: 0,
    prompt: 'Create a solitary lighthouse on a rocky coastal cliff at dusk, with dramatic storm clouds rolling in from the ocean, golden-pink light breaking through on the horizon, rough surf below, highly detailed environment, cinematic composition, and a moody atmosphere.',
    model: 'grok-imagine-image-quality',
    provider: 'grok',
    modeId: 'image',
  },
  {
    id: 'image-frame',
    label: 'Image From Frame',
    description: 'Use one provided frame and refine it into a polished still.',
    refKind: 'image',
    refCount: 1,
    prompt: 'Preserve the framing, subject identity, and overall composition from the provided frame. Refine the lighting, textures, and background into a cinematic still with crisp detail and balanced contrast.',
    model: 'grok-imagine-image-quality',
    provider: 'grok',
    modeId: 'image',
  },
  {
    id: 'image-multi',
    label: 'Image With Multiple Refs',
    description: 'Blend several image references and stress-test multi-reference consistency.',
    refKind: 'multi-image',
    refCount: 3,
    prompt: 'Use image 1 as the primary character reference. Preserve the exact face, outfit, body proportions, and character styling from image 1. Use image 2 as the environment reference. Preserve the architecture, layout, scale, and spatial structure from image 2. Use image 3 as the lighting and finish reference only. Preserve its color mood, shading softness, and rendering polish without copying extra subjects. Create one clean 16:9 still image. Do not merge identities across images. Do not add extra characters or random objects. Keep the result cohesive, sharp, and suitable for kids animation.',
    model: 'grok-imagine-image-quality',
    provider: 'grok',
    modeId: 'image',
    capabilityGroup: 'multi-image',
  },
  {
    id: 'image-edit-style-transfer',
    label: 'Oil Painting',
    description: 'Apply an oil painting look to the provided image while preserving the original subject and framing.',
    refKind: 'image',
    refCount: 1,
    prompt: 'Apply an oil painting look to the provided image. Keep the subject identity, pose, and composition intact. Render warm brushstrokes, visible paint texture, rich shadows, and an old-master fine art finish.',
    model: 'grok-imagine-image-quality',
    provider: 'grok',
    modeId: 'image',
    capabilityGroup: 'style-transfer',
  },
  {
    id: 'image-edit-sketch',
    label: 'Sketch',
    description: 'Turn the provided image into a pencil sketch with linework, shading, and a hand-drawn finish.',
    refKind: 'image',
    refCount: 1,
    prompt: 'Turn the provided image into a detailed pencil sketch. Keep the composition readable, and use expressive line weight, cross-hatching, grayscale shading, and a hand-drawn feel.',
    model: 'grok-imagine-image-quality',
    provider: 'grok',
    modeId: 'image',
    capabilityGroup: 'style-transfer',
  },
  {
    id: 'image-edit-pop-art',
    label: 'Pop Art',
    description: 'Convert the provided image into a bold pop-art print with vivid color and graphic contrast.',
    refKind: 'image',
    refCount: 1,
    prompt: 'Convert the provided image into pop art. Keep the subject identity and composition intact while using high-contrast shapes, flat color blocks, vivid saturation, and a poster-print look.',
    model: 'grok-imagine-image-quality',
    provider: 'grok',
    modeId: 'image',
    capabilityGroup: 'style-transfer',
  },
  {
    id: 'image-edit-enhancement',
    label: 'Image Enhancement',
    description: 'Edit a specific part of the provided image while preserving subject identity and composition.',
    refKind: 'image',
    refCount: 1,
    prompt: 'Edit the provided image with a targeted enhancement. Preserve subject identity, framing, and overall composition. Apply this change only: [DESCRIBE THE EXACT OBJECT/AREA TO EDIT]. Keep all other regions unchanged. Improve local detail, lighting consistency, and clean edges for a natural final result.',
    model: 'grok-imagine-image-quality',
    provider: 'grok',
    modeId: 'image',
    capabilityGroup: 'style-transfer',
  },
  {
    id: 'image-sharpen-enhance',
    label: 'Sharpen & Crisp',
    description: 'Enhance image sharpness, clarity, and crispness while preserving natural appearance.',
    refKind: 'image',
    refCount: 1,
    prompt: 'Enhance the sharpness and crispness of the provided image. Increase detail resolution, improve edge definition, and boost overall clarity without introducing artifacts or unnatural sharpening effects. Preserve the original colors, lighting, and composition while making the image appear more focused and professional.',
    model: 'grok-imagine-image-quality',
    provider: 'grok',
    modeId: 'image',
    capabilityGroup: 'style-transfer',
  },
  {
    id: 'multi-combine-subjects',
    label: 'Combine Subjects',
    description: 'Use multiple references to compose a new scene with all subjects present.',
    refKind: 'multi-image',
    refCount: 3,
    prompt: 'Use image 1, image 2, and image 3 as separate subject references. Preserve the exact identity, silhouette, outfit, and distinctive features of each subject from its own source image. Place all subjects together in one shared scene with consistent scale, perspective, and lighting. Do not fuse subjects together. Do not swap faces, outfits, or proportions between them. Create a balanced group composition with clean spacing, readable poses, and one unified background.',
    model: 'grok-imagine-image-quality',
    provider: 'grok',
    modeId: 'image',
    capabilityGroup: 'multi-image',
  },
  {
    id: 'multi-merge-environments',
    label: 'Merge Environments',
    description: 'Blend scene, lighting, and background cues from multiple references.',
    refKind: 'multi-image',
    refCount: 3,
    prompt: 'Use image 1 as the base environment layout. Use image 2 to borrow secondary architectural or landscape elements. Use image 3 only for atmosphere, lighting direction, and color mood. Build one believable location that feels intentionally designed, not like a collage. Keep the horizon, perspective, scale, and material language consistent across the whole scene. Do not duplicate structures unnecessarily, and do not introduce unrelated objects or characters.',
    model: 'grok-imagine-image-quality',
    provider: 'grok',
    modeId: 'image',
    capabilityGroup: 'multi-image',
  },
  {
    id: 'multi-apply-art-style',
    label: 'Apply Art Style',
    description: 'Use image 1 as the art style reference and image 2 as the target — redraw the target in the style of the first image.',
    refKind: 'multi-image',
    refCount: 2,
    prompt: 'Image 1 is the art style reference only — extract its visual style, color palette, brushwork, texture, line quality, rendering technique, and overall aesthetic. Image 2 is the target content — preserve every subject, object, pose, composition, and spatial layout from image 2 exactly. Redraw the full content of image 2 in the artistic style taken from image 1. Do not copy any subjects, objects, or scenes from image 1 into the output. Do not alter the subjects or composition from image 2.',
    model: 'grok-imagine-image-quality',
    provider: 'grok',
    modeId: 'image',
    capabilityGroup: 'multi-image',
  },
  {
    id: 'image-understanding',
    label: 'Image Understanding',
    description: 'Use a reference image and ask the model to analyze what it contains.',
    refKind: 'image',
    refCount: 1,
    prompt: 'Analyze this image in detail. Describe the scene, the main subjects, notable objects, visible text, and the overall mood. Call out any important visual relationships or inconsistencies you can observe.',
    model: 'grok-imagine-image-quality',
    provider: 'grok',
    modeId: 'image',
    capabilityGroup: 'understanding',
  },
]

const GROK_EXAMPLE_BY_ID = new Map(GROK_EXAMPLES.map((example) => [example.id, example]))

const GROK_NAV_GROUPS: readonly GrokNavGroup[] = [
  {
    id: 'image-creation',
    title: 'Image Creation',
    subgroups: [
      {
        id: 'style-transfer',
        title: 'Style Transfer',
        exampleIds: ['image-edit-style-transfer', 'image-edit-sketch', 'image-edit-pop-art'],
      },
      {
        id: 'image-enhancement',
        title: 'Image Enhancement',
        exampleIds: ['image-edit-enhancement', 'image-sharpen-enhance'],
      },
      {
        id: 'image-generation',
        title: 'Image Generation',
        exampleIds: ['image-gen'],
      },
      {
        id: 'image-from-frame',
        title: 'Image From Frame',
        exampleIds: ['image-frame'],
      },
      {
        id: 'multi-image-image',
        title: 'Multi-Image Composition',
        exampleIds: ['image-multi', 'multi-combine-subjects', 'multi-merge-environments', 'multi-apply-art-style'],
      },
      {
        id: 'image-understanding',
        title: 'Image Understanding',
        exampleIds: ['image-understanding'],
      },
    ],
  },
  {
    id: 'generation-motion',
    title: 'Generation & Motion',
    subgroups: [
      {
        id: 'motion-workflows',
        title: 'Motion Workflows',
        exampleIds: ['text-video', 'img-video', 'ref-video', 'extend-video', 'first-last'],
      },
    ],
  },
]

function GrokTestingPanel(_props: IDockviewPanelProps<PanelSuggestionParams>) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [applied, setApplied] = useState(false)
  const [overrideRefs, setOverrideRefs] = useState<Array<{ url: string; kind: 'image' | 'video'; name: string } | null>>([])
  const [dragOverSlot, setDragOverSlot] = useState<number | null>(null)
  const [isSending, setIsSending] = useState(false)
  const [sendDone, setSendDone] = useState(false)
  const [sendStatus, setSendStatus] = useState('')
  const [sendError, setSendError] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    'image-creation': true,
    'generation-motion': true,
  })
  const [expandedSubgroups, setExpandedSubgroups] = useState<Record<string, boolean>>({
    'style-transfer': true,
    'image-enhancement': true,
    'image-generation': true,
    'image-from-frame': true,
    'multi-image-image': true,
    'image-understanding': true,
    'motion-workflows': true,
  })

  const { projectReferenceLibraryItems } = useLabNewLayoutData()
  const setComposerReuseSeed = useLabNewLayoutStore((state) => state.setComposerReuseSeed)
  const addHistoryItem = useLabNewLayoutStore((state) => state.addHistoryItem)
  const updateHistoryItem = useLabNewLayoutStore((state) => state.updateHistoryItem)
  const runner = useGenerationRunner({ apiBaseUrl: CHATBOT_BASE })

  const example = activeId ? GROK_EXAMPLE_BY_ID.get(activeId) ?? null : null

  const pickedRefs = useMemo(() => {
    if (!example) return []
    if (example.refKind === 'none') return []
    const matchKind = example.refKind === 'video' ? 'video' : 'image'
    return projectReferenceLibraryItems
      .filter((item) => item.kind === matchKind)
      .slice(0, example.refCount)
  }, [example, projectReferenceLibraryItems])

  // Per-slot effective refs: override slots take priority over auto-picked refs
  const effectiveRefs = useMemo(() => {
    if (!example || example.refKind === 'none') return []
    const count = example.refCount
    const result: Array<{ url: string; kind: 'image' | 'video'; name: string } | null> = []
    for (let i = 0; i < count; i++) {
      const override = overrideRefs[i]
      if (override !== undefined) {
        result.push(override)
        continue
      }
      const picked = pickedRefs[i]
      if (picked) {
        result.push({ url: picked.url, kind: picked.kind === 'video' ? 'video' : 'image', name: picked.name })
      } else {
        result.push(null)
      }
    }
    return result
  }, [example, overrideRefs, pickedRefs])

  // Reset overrides when example changes
  useEffect(() => {
    setOverrideRefs([])
    setSendDone(false)
    setSendStatus('')
    setSendError('')
  }, [activeId])

  const parseDragRef = useCallback((dataTransfer: DataTransfer): { url: string; kind: 'image' | 'video'; name: string } | null => {
    const raw = dataTransfer.getData(LAB_NEWLAYOUT_HISTORY_REF_MIME) || dataTransfer.getData('application/json')
    if (!raw) return null
    try {
      const parsed = JSON.parse(raw) as Partial<{ url: string; kind: string; name: string }>
      if (!parsed || typeof parsed.url !== 'string' || !parsed.url.trim()) return null
      const kind: 'image' | 'video' = parsed.kind === 'video' ? 'video' : 'image'
      const name = typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.trim() : kind
      return { url: parsed.url.trim(), kind, name }
    } catch {
      return null
    }
  }, [])

  const handleSlotDragOver = useCallback((e: React.DragEvent<HTMLDivElement>, slotIndex: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setDragOverSlot(slotIndex)
  }, [])

  const handleSlotDragLeave = useCallback(() => {
    setDragOverSlot(null)
  }, [])

  const handleSlotDrop = useCallback((e: React.DragEvent<HTMLDivElement>, slotIndex: number) => {
    e.preventDefault()
    setDragOverSlot(null)
    const ref = parseDragRef(e.dataTransfer)
    if (!ref) return
    setOverrideRefs((prev) => {
      const next = [...prev]
      next[slotIndex] = ref
      return next
    })
  }, [parseDragRef])

  const handleCopy = useCallback(() => {
    if (!example) return
    void navigator.clipboard.writeText(example.prompt)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }, [example])

  const handleApply = useCallback(() => {
    if (!example) return
    const isGrokImageExample = example.provider === 'grok' && example.modeId === 'image'
    const refsForSeed = effectiveRefs.filter((r): r is NonNullable<typeof r> => r !== null)
    const seed: ComposerReuseSeed = {
      id: `grok-example-${Date.now()}`,
      prompt: example.prompt,
      references: refsForSeed.map((ref, i) => ({
        id: `grok-ref-${i}-${Date.now()}`,
        url: ref.url,
        kind: ref.kind as 'image' | 'video' | 'audio',
        name: ref.name,
      })),
      model: example.model,
      provider: example.provider,
      modeId: example.modeId,
      ratio: '16:9',
      ...(isGrokImageExample ? {
        resolution: '1k',
        duration: 0,
        generateAudio: false,
      } : {}),
    }
    setComposerReuseSeed(seed)
    setApplied(true)
    setTimeout(() => setApplied(false), 2000)
  }, [example, effectiveRefs, setComposerReuseSeed])

  const handleSendToGrok = useCallback(() => {
    if (!example || isSending) return
    const isImage = example.modeId === 'image'
    const refsForSend = effectiveRefs.filter((r): r is NonNullable<typeof r> => r !== null)
    const imageUrls = refsForSend.map((r) => r.url)

    const body: Record<string, unknown> = {
      prompt: example.prompt,
      model: example.model,
      providerHint: 'grok',
    }

    if (imageUrls.length === 1) {
      body.image = { url: imageUrls[0] }
    } else if (imageUrls.length > 1) {
      body.image_urls = imageUrls
    }

    const settings: GenerationRequestSettings = {
      provider: 'grok',
      model: example.model,
      ratio: '16:9',
      duration: isImage ? 0 : 15,
      resolution: isImage ? '1k' : '480p',
      generateAudio: false,
    }

    const request = { endpoint: '/api/seedance/generate', body, settings }
    const historyId = `grok-direct-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    addHistoryItem({
      id: historyId,
      timestamp: Date.now(),
      prompt: example.prompt,
      model: example.model,
      provider: 'grok',
      ratio: '16:9',
      resolution: settings.resolution,
      duration: settings.duration,
      generateAudio: false,
      requestEndpoint: request.endpoint,
      requestPayload: request.body,
      status: 'queued',
      sourceLabel: `Grok Testing — ${example.label}`,
    })

    setIsSending(true)
    setSendDone(false)
    setSendStatus('Sending...')
    setSendError('')

    void (async () => {
      try {
        const result = await runner.runGeneration(request, {
          onQueued: () => {
            updateHistoryItem(historyId, { status: 'running' })
            setSendStatus('Queued — waiting for result...')
          },
          onStatus: (text) => { setSendStatus(text) },
        })

        if (result) {
          updateHistoryItem(historyId, {
            status: 'success',
            resultUrl: result.resultUrl,
            taskId: result.taskId,
            submittedAt: result.submittedAt,
            receivedAt: result.receivedAt,
            completedAt: result.receivedAt,
          })
          setSendStatus('Done ✓')
          setSendDone(true)
        } else {
          updateHistoryItem(historyId, { status: 'failed', errorMessage: 'Generation cancelled or returned no result.' })
          setSendError('Generation returned no result.')
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        updateHistoryItem(historyId, { status: 'failed', errorMessage: msg })
        setSendError(msg)
      } finally {
        setIsSending(false)
      }
    })()
  }, [example, effectiveRefs, isSending, addHistoryItem, updateHistoryItem, runner])

  const needsRefs = example ? example.refKind !== 'none' : false
  const hasRefs = effectiveRefs.some((r) => r !== null)
  const refCount = example?.refCount ?? 0
  const capabilityLabel = example?.capabilityGroup === 'style-transfer'
    ? 'Style Transfer'
    : example?.capabilityGroup === 'multi-image'
      ? 'Multi-Image'
      : example?.capabilityGroup === 'understanding'
        ? 'Understanding'
        : 'Generation'

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((current) => ({ ...current, [groupId]: !current[groupId] }))
  }, [])

  const toggleSubgroup = useCallback((subgroupId: string) => {
    setExpandedSubgroups((current) => ({ ...current, [subgroupId]: !current[subgroupId] }))
  }, [])

  const hasActiveExample = Boolean(example)

  return (
    <div className="lab-newlayout-panel lab-newlayout-panel--grok-testing">
      <div className="lab-newlayout-history-top-fixed">
        <div className="lab-newlayout-history-toolbar">
          <div className="lab-newlayout-history-toolbar-stats">
            <span className="lab-newlayout-history-stat">Grok Examples</span>
          </div>
        </div>
      </div>

      <div className="lab-newlayout-grok-shell">
        <div className="lab-newlayout-grok-body">
          <div className="lab-newlayout-grok-content">
            <aside className="lab-newlayout-grok-leftpane" aria-label="Grok example groups">
              {GROK_NAV_GROUPS.map((group) => (
                <section key={group.id} className="lab-newlayout-grok-tree-group">
                  <button
                    type="button"
                    className="lab-newlayout-grok-tree-groupbtn"
                    onClick={() => toggleGroup(group.id)}
                  >
                    <span className="lab-newlayout-grok-tree-caret">{expandedGroups[group.id] ? '▾' : '▸'}</span>
                    <span>{group.title}</span>
                  </button>

                  {expandedGroups[group.id] && (
                    <div className="lab-newlayout-grok-tree-subgroups">
                      {group.subgroups.map((subgroup) => (
                        <div key={subgroup.id} className="lab-newlayout-grok-tree-subgroup">
                          <button
                            type="button"
                            className="lab-newlayout-grok-tree-subgroupbtn"
                            onClick={() => toggleSubgroup(subgroup.id)}
                          >
                            <span className="lab-newlayout-grok-tree-caret">{expandedSubgroups[subgroup.id] ? '▾' : '▸'}</span>
                            <span>{subgroup.title}</span>
                          </button>

                          {expandedSubgroups[subgroup.id] && (
                            <div className="lab-newlayout-grok-tree-examples">
                              {subgroup.exampleIds.map((exampleId) => {
                                const item = GROK_EXAMPLE_BY_ID.get(exampleId)
                                if (!item) return null
                                return (
                                  <button
                                    key={item.id}
                                    type="button"
                                    className={`lab-newlayout-grok-tree-examplebtn${activeId === item.id ? ' is-active' : ''}`}
                                    onClick={() => {
                                      setActiveId(item.id)
                                      setCopied(false)
                                      setApplied(false)
                                    }}
                                  >
                                    {item.label}
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              ))}
            </aside>

            <section className="lab-newlayout-grok-rightpane" aria-label="Grok example details">
              {example ? (
                <>
                  <div className="lab-newlayout-grok-hero">
                    <div className="lab-newlayout-grok-hero-copywrap">
                      <div className="lab-newlayout-grok-hero-title">{example.label}</div>
                      <p className="lab-newlayout-grok-hero-copy">{example.description}</p>
                    </div>
                    <div className="lab-newlayout-grok-hero-meta">
                      <span className="lab-newlayout-grok-chip">{example.provider === 'grok' ? 'Grok' : example.provider}</span>
                      <span className="lab-newlayout-grok-chip">{example.model === 'grok-imagine-video' ? 'Grok Imagine Video' : 'Grok Imagine Image'}</span>
                      <span className={`lab-newlayout-grok-chip lab-newlayout-grok-chip--capability lab-newlayout-grok-chip--${example.capabilityGroup || 'generation'}`}>
                        {capabilityLabel}
                      </span>
                    </div>
                  </div>

                  <div className="lab-newlayout-grok-stage">
                    <div className="lab-newlayout-grok-stage-main">
                      <div className="lab-newlayout-grok-promptblock">
                        <div className="lab-newlayout-grok-promptbar">
                          <span className="lab-newlayout-grok-promptlabel">Grok prompt</span>
                          <button
                            type="button"
                            className="lab-newlayout-grok-copybtn"
                            onClick={handleCopy}
                          >
                            {copied ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                        <pre className="lab-newlayout-grok-prompttext">{example.prompt}</pre>
                      </div>
                      <div className="lab-newlayout-grok-footer-summary">
                        <span className="lab-newlayout-grok-footer-summary-label">How this example works</span>
                        <p>
                          {needsRefs
                            ? `${hasRefs ? `${effectiveRefs.filter((r) => r !== null).length} reference${effectiveRefs.filter((r) => r !== null).length !== 1 ? 's are' : ' is'} ready` : 'This example expects image references. Drop items from the References or Assets panel onto the slots below.'}`
                            : 'This example is text-only and can be applied without references.'}
                        </p>
                      </div>
                    </div>

                    <aside className="lab-newlayout-grok-stage-side">
                      {needsRefs ? (
                        <div className="lab-newlayout-grok-mediagrid">
                          {effectiveRefs.map((ref, slotIndex) => (
                            <div
                              key={slotIndex}
                              className={`lab-newlayout-grok-mediaitem${dragOverSlot === slotIndex ? ' lab-newlayout-grok-mediaitem--dropover' : ''}${ref === null ? ' lab-newlayout-grok-mediaitem--empty' : ''}`}
                              onDragOver={(e) => { handleSlotDragOver(e, slotIndex) }}
                              onDragLeave={handleSlotDragLeave}
                              onDrop={(e) => { handleSlotDrop(e, slotIndex) }}
                            >
                              {ref !== null ? (
                                <>
                                  {ref.kind === 'video' ? (
                                    <video
                                      src={ref.url}
                                      className="lab-newlayout-grok-mediapreview"
                                      muted
                                      preload="metadata"
                                    />
                                  ) : (
                                    <img
                                      src={ref.url}
                                      alt={ref.name}
                                      className="lab-newlayout-grok-mediapreview"
                                    />
                                  )}
                                  <span className="lab-newlayout-grok-medianame">{ref.name}</span>
                                </>
                              ) : (
                                <span>Drop ref {slotIndex + 1}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="lab-newlayout-grok-mediaplaceholder lab-newlayout-grok-mediaplaceholder--textonly">
                          No reference image is required for this example.
                        </div>
                      )}
                    </aside>
                  </div>
                </>
              ) : (
                <div className="lab-newlayout-grok-empty">
                  <div className="lab-newlayout-grok-empty-title">Select an example</div>
                  <p className="lab-newlayout-grok-empty-copy">
                    Choose a subgroup item on the left. Prompt, references, and details will appear here.
                  </p>
                </div>
              )}
            </section>
          </div>

          <div className="lab-newlayout-grok-footer-fixed">
            <div className="lab-newlayout-grok-chips">
              {needsRefs && hasActiveExample && (
                <span className={`lab-newlayout-grok-chip${hasRefs ? ' lab-newlayout-grok-chip--ok' : ' lab-newlayout-grok-chip--warn'}`}>
                  {hasRefs
                    ? `${effectiveRefs.filter((r) => r !== null).length} ref${effectiveRefs.filter((r) => r !== null).length !== 1 ? 's' : ''} ready`
                    : `${refCount} ref${refCount !== 1 ? 's' : ''} needed`}
                </span>
              )}
              {sendStatus && !sendError && (
                <span className="lab-newlayout-grok-sendstatus">{sendStatus}</span>
              )}
              {sendError && (
                <span className="lab-newlayout-grok-sendstatus lab-newlayout-grok-sendstatus--error">{sendError}</span>
              )}
            </div>

            <div className="lab-newlayout-grok-footer-actions">
              <button
                type="button"
                className={`lab-newlayout-grok-sendbtn${isSending ? ' is-sending' : ''}${sendDone ? ' is-done' : ''}`}
                onClick={handleSendToGrok}
                disabled={!hasActiveExample || isSending}
              >
                {isSending ? 'Sending…' : sendDone ? 'Sent ✓' : 'Send to Grok'}
              </button>
              <button
                type="button"
                className={`lab-newlayout-grok-applybtn${applied ? ' is-applied' : ''}`}
                onClick={handleApply}
                disabled={!hasActiveExample}
              >
                {!hasActiveExample
                  ? 'Select an Example'
                  : applied
                    ? 'Applied ✓'
                    : 'Apply to Composer'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function AssetsLibraryPanel() {
  const { items, user, isAuthLoading, error } = useAssetsLibrary()
  const setAssetPreviewItem = useLabNewLayoutStore((state) => state.setAssetPreviewItem)
  const addComposerReference = useLabNewLayoutStore((state) => state.addComposerReference)
  const composerReferences = useLabNewLayoutStore((state) => state.composerReferences)
  const { setCompareBeforeUrl, setCompareAfterUrl } = useLabNewLayoutData()
  const { showToast } = useToast()

  const handleAddToComposer = useCallback((item: (typeof items)[number]) => {
    if (composerReferences.some((ref) => ref.url === item.url)) {
      showToast({ message: 'Already in composer references', type: 'info' })
      return
    }
    addComposerReference({
      id: `composer-ref-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      url: item.url,
      kind: item.kind,
      name: item.name,
    })
    showToast({ message: 'Added to composer references', type: 'success' })
  }, [addComposerReference, composerReferences, showToast])

  const handleDragStart = useCallback((event: React.DragEvent<HTMLDivElement>, item: (typeof items)[number]) => {
    const payload = {
      id: `composer-ref-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      url: item.url,
      kind: item.kind,
      name: item.name,
    }
    event.dataTransfer.effectAllowed = 'copy'
    event.dataTransfer.setData('application/json', JSON.stringify(payload))
    event.dataTransfer.setData(LAB_NEWLAYOUT_HISTORY_REF_MIME, JSON.stringify(payload))
    event.dataTransfer.setData('text/uri-list', item.url)
    event.dataTransfer.setData('text/plain', item.url)
  }, [])

  return (
    <div className="lab-newlayout-panel lab-newlayout-panel--assets-library">
      <div className="lab-newlayout-history-top-fixed">
        <div className="lab-newlayout-history-toolbar">
          <div className="lab-newlayout-history-toolbar-stats">
            <span className="lab-newlayout-history-stat">Assets Library</span>
            <span className="lab-newlayout-history-stat">{isAuthLoading ? 'Loading...' : user ? `${items.length} item${items.length === 1 ? '' : 's'}` : `${items.length} local item${items.length === 1 ? '' : 's'}`}</span>
          </div>
        </div>
      </div>

      <div className="lab-newlayout-references-drop-zone">
        {error ? (
          <div className="lab-newlayout-references-empty">
            <div className="lab-newlayout-references-plus-card lab-newlayout-references-plus-card--static">
              <span>{error}</span>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="lab-newlayout-references-empty">
            <div className="lab-newlayout-references-plus-card lab-newlayout-references-plus-card--static">
              <span>No generated assets yet.</span>
              <span className="lab-newlayout-references-plus-card-sub">Generated images will appear here and can be dragged back into the composer.</span>
            </div>
          </div>
        ) : (
          <div className="lab-newlayout-references-grid lab-newlayout-references-grid--active">
            {items.map((item) => {
              const enrichedItem = item as typeof item & {
                folderId?: string | null
                generationPrompt?: string
                generationModel?: string
                generationProvider?: string
                generationAspectRatio?: string
                generationResolution?: string
                generationSource?: string
                generationRequestPayload?: Record<string, unknown>
              }

              return (
                <div
                  key={item.id}
                  className="lab-newlayout-reference-item lab-newlayout-reference-item--openable is-draggable"
                  draggable
                  onDragStart={(event) => handleDragStart(event, item)}
                  onClick={() => setAssetPreviewItem({
                    id: item.id,
                    url: item.url,
                    kind: item.kind,
                    name: item.name,
                    thumbnailUrl: item.thumbnailUrl,
                    projectId: item.projectId,
                    folderId: enrichedItem.folderId,
                    createdAt: item.createdAt,
                    generationPrompt: enrichedItem.generationPrompt,
                    generationModel: enrichedItem.generationModel,
                    generationProvider: enrichedItem.generationProvider,
                    generationAspectRatio: enrichedItem.generationAspectRatio,
                    generationResolution: enrichedItem.generationResolution,
                    generationSource: enrichedItem.generationSource,
                    generationRequestPayload: enrichedItem.generationRequestPayload,
                  })}
                >
                  {item.kind === 'video' ? (
                    <video className="lab-newlayout-reference-thumb lab-newlayout-reference-thumb--video" src={buildVideoProxyUrl(item.url) || item.url} muted playsInline preload="metadata" />
                  ) : (
                    <img className="lab-newlayout-reference-thumb lab-newlayout-reference-thumb--image" src={item.url} alt={item.name} />
                  )}
                  <button
                    type="button"
                    className="lab-newlayout-reference-add-composer"
                  onClick={(event) => { event.stopPropagation(); handleAddToComposer(item) }}
                  title="Add to composer"
                >
                  + Composer
                </button>
                {item.kind !== 'audio' ? (
                  <>
                    <button
                      type="button"
                      className="lab-newlayout-reference-compare-set-btn lab-newlayout-reference-compare-set-btn--before"
                      onClick={(event) => { event.stopPropagation(); setCompareBeforeUrl(item.url) }}
                      aria-label="Set as Before in comparison"
                      title="Set as Before"
                    >B</button>
                    <button
                      type="button"
                      className="lab-newlayout-reference-compare-set-btn lab-newlayout-reference-compare-set-btn--after"
                      onClick={(event) => { event.stopPropagation(); setCompareAfterUrl(item.url) }}
                      aria-label="Set as After in comparison"
                      title="Set as After"
                    >A</button>
                  </>
                ) : null}
                <div className="lab-newlayout-reference-meta">
                  <div className="lab-newlayout-reference-title" title={item.name}>{item.name}</div>
                  <div className="lab-newlayout-reference-subtitle" title={item.url}>{item.kind}</div>
                </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function GlobalCompareOverlay() {
  const {
    compareBeforeUrl,
    compareAfterUrl,
    compareOverlayOpen,
    setCompareBeforeUrl,
    setCompareAfterUrl,
    setCompareOverlayOpen,
  } = useLabNewLayoutData()

  // Auto-open when both slots are filled
  useEffect(() => {
    if (compareBeforeUrl && compareAfterUrl) {
      setCompareOverlayOpen(true)
    }
  }, [compareBeforeUrl, compareAfterUrl, setCompareOverlayOpen])

  if (!compareOverlayOpen) return null

  const isBeforeVideo = /\.(mp4|webm|mov|ogg)(\?|$)/i.test(compareBeforeUrl)
  const isAfterVideo = /\.(mp4|webm|mov|ogg)(\?|$)/i.test(compareAfterUrl)
  const hasBoth = Boolean(compareBeforeUrl && compareAfterUrl)

  return createPortal(
    <div
      className="lab-compare-overlay-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Compare"
      onClick={() => setCompareOverlayOpen(false)}
    >
      <div
        className="lab-compare-overlay"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="lab-compare-overlay-head">
          <div className="lab-compare-overlay-title">Compare</div>
          <div className="lab-compare-overlay-head-actions">
            <button
              type="button"
              className={`lab-compare-slot-btn${compareBeforeUrl ? ' is-set' : ''}`}
              onClick={() => setCompareBeforeUrl('')}
              title={compareBeforeUrl ? 'Clear Before (B)' : 'Before (B) not set'}
            >
              <span className="lab-compare-slot-label">B</span>
              {compareBeforeUrl ? (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              ) : (
                <span className="lab-compare-slot-empty">—</span>
              )}
            </button>
            <button
              type="button"
              className={`lab-compare-slot-btn${compareAfterUrl ? ' is-set' : ''}`}
              onClick={() => setCompareAfterUrl('')}
              title={compareAfterUrl ? 'Clear After (A)' : 'After (A) not set'}
            >
              <span className="lab-compare-slot-label">A</span>
              {compareAfterUrl ? (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              ) : (
                <span className="lab-compare-slot-empty">—</span>
              )}
            </button>
            <button
              type="button"
              className="lab-compare-clear-all-btn"
              onClick={() => { setCompareBeforeUrl(''); setCompareAfterUrl('') }}
              title="Clear both"
            >
              Clear all
            </button>
            <button
              type="button"
              className="lab-newlayout-history-lightbox-close"
              onClick={() => setCompareOverlayOpen(false)}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="lab-compare-overlay-body">
          {hasBoth ? (
            <img-comparison-slider value={50} className="lab-compare-overlay-slider">
              {isBeforeVideo ? (
                <video slot="first" src={compareBeforeUrl} muted playsInline loop autoPlay className="lab-compare-overlay-media" />
              ) : (
                <img slot="first" src={compareBeforeUrl} alt="Before" className="lab-compare-overlay-media" />
              )}
              {isAfterVideo ? (
                <video slot="second" src={compareAfterUrl} muted playsInline loop autoPlay className="lab-compare-overlay-media" />
              ) : (
                <img slot="second" src={compareAfterUrl} alt="After" className="lab-compare-overlay-media" />
              )}
            </img-comparison-slider>
          ) : (
            <div className="lab-compare-overlay-waiting">
              <div className={`lab-compare-overlay-slot-status${compareBeforeUrl ? ' is-filled' : ''}`}>
                <span className="lab-compare-overlay-slot-badge">B</span>
                {compareBeforeUrl ? 'Before is set' : 'Before not set — hover a card and click B'}
              </div>
              <div className={`lab-compare-overlay-slot-status${compareAfterUrl ? ' is-filled' : ''}`}>
                <span className="lab-compare-overlay-slot-badge">A</span>
                {compareAfterUrl ? 'After is set' : 'After not set — hover a card and click A'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

function GlobalAssetPreviewOverlay() {
  const previewItem = useLabNewLayoutStore((state) => state.assetPreviewItem)
  const setAssetPreviewItem = useLabNewLayoutStore((state) => state.setAssetPreviewItem)
  const addComposerReference = useLabNewLayoutStore((state) => state.addComposerReference)
  const { showToast: showRefToast } = useToast()
  const { has: isAssetLiked, toggle: toggleAssetLiked } = useLikedReferenceUrls()
  const [detailsState, setDetailsState] = useState<{ assetId: string | null; open: boolean }>({ assetId: null, open: false })

  const handleAddToComposer = useCallback(() => {
    if (!previewItem) return

    if (useLabNewLayoutStore.getState().composerReferences.some((ref) => ref.url === previewItem.url)) {
      showRefToast({ message: 'Already in composer references', type: 'info' })
      return
    }

    addComposerReference({
      id: `composer-ref-${Date.now()}-${Math.random().toString(36).slice(2)}`,
      url: previewItem.url,
      kind: previewItem.kind,
      name: previewItem.name,
    })
    showRefToast({ message: 'Added to composer references', type: 'success' })
    setAssetPreviewItem(null)
  }, [addComposerReference, previewItem, setAssetPreviewItem, showRefToast])

  if (!previewItem) return null

  const sourceUrl = resolveProxySourceUrl(previewItem.url)
  const videoUrl = previewItem.kind === 'video'
    ? (buildVideoProxyUrl(sourceUrl) || sourceUrl)
    : ''
  const isLiked = isAssetLiked(previewItem.url)
  const createdAtLabel = formatAssetPreviewCreatedAt(previewItem.createdAt)
  const showDetails = detailsState.assetId === previewItem.id && detailsState.open

  return createPortal(
    <div
      className="lab-newlayout-history-lightbox-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Asset preview"
      onClick={() => setAssetPreviewItem(null)}
    >
      <div
        className="lab-newlayout-history-lightbox lab-newlayout-reference-lightbox"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="lab-newlayout-history-lightbox-head">
          <div>
            <div className="lab-newlayout-history-lightbox-kicker">Asset · {previewItem.kind}</div>
            <div className="lab-newlayout-history-lightbox-title">{previewItem.name || 'Asset'}</div>
          </div>
          <div className="lab-newlayout-history-lightbox-head-actions">
            <button
              type="button"
              className={`lab-newlayout-history-lightbox-like${isLiked ? ' is-liked' : ''}`}
              onClick={() => toggleAssetLiked(previewItem.url)}
              aria-label={isLiked ? 'Unlike asset' : 'Like asset'}
              title={isLiked ? 'Unlike asset' : 'Like asset'}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill={isLiked ? 'currentColor' : 'none'}
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
              </svg>
              <span>{isLiked ? 'Liked' : 'Like'}</span>
            </button>
            <button
              type="button"
              className="lab-newlayout-history-lightbox-action"
              onClick={() => setDetailsState((current) => (
                current.assetId === previewItem.id
                  ? { assetId: previewItem.id, open: !current.open }
                  : { assetId: previewItem.id, open: true }
              ))}
            >
              {showDetails ? 'Hide details' : 'Details'}
            </button>
            <button
              type="button"
              className="lab-newlayout-history-lightbox-action"
              onClick={handleAddToComposer}
            >
              Add to composer
            </button>
            <button
              type="button"
              className="lab-newlayout-history-lightbox-action"
              onClick={() => {
                if (!sourceUrl) return
                window.open(sourceUrl, '_blank', 'noopener,noreferrer')
              }}
              disabled={!sourceUrl}
            >
              Open link
            </button>
            <button
              type="button"
              className="lab-newlayout-history-lightbox-close"
              onClick={() => setAssetPreviewItem(null)}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>
        <div className="lab-newlayout-reference-lightbox-body">
          <div className="lab-newlayout-reference-lightbox-media">
            {previewItem.kind === 'video' ? (
              <video
                className="lab-newlayout-reference-lightbox-media-element"
                src={videoUrl}
                controls
                autoPlay
                playsInline
              />
            ) : previewItem.kind === 'audio' ? (
              <div className="lab-newlayout-reference-lightbox-audio-shell">
                <div className="lab-newlayout-reference-lightbox-audio-icon">♪</div>
                <audio className="lab-newlayout-reference-lightbox-audio" src={sourceUrl} controls autoPlay />
              </div>
            ) : (
              <img
                className="lab-newlayout-reference-lightbox-media-element lab-newlayout-reference-lightbox-image"
                src={sourceUrl}
                alt={previewItem.name}
              />
            )}
          </div>
          {showDetails ? (
            <div className="lab-newlayout-history-lightbox-meta lab-newlayout-history-lightbox-meta--sidebar">
              <div className="lab-newlayout-history-lightbox-meta-summary">
                <div className="lab-newlayout-history-lightbox-meta-row lab-newlayout-history-lightbox-meta-row--summary">
                  <span>Kind</span>
                  <strong>{previewItem.kind}</strong>
                </div>
                {previewItem.generationProvider ? (
                  <div className="lab-newlayout-history-lightbox-meta-row lab-newlayout-history-lightbox-meta-row--summary">
                    <span>Provider</span>
                    <strong>{previewItem.generationProvider}</strong>
                  </div>
                ) : null}
                {previewItem.generationResolution ? (
                  <div className="lab-newlayout-history-lightbox-meta-row lab-newlayout-history-lightbox-meta-row--summary">
                    <span>Resolution</span>
                    <strong>{previewItem.generationResolution}</strong>
                  </div>
                ) : null}
                {previewItem.generationAspectRatio ? (
                  <div className="lab-newlayout-history-lightbox-meta-row lab-newlayout-history-lightbox-meta-row--summary">
                    <span>Ratio</span>
                    <strong>{previewItem.generationAspectRatio}</strong>
                  </div>
                ) : null}
              </div>
              {(previewItem.generationModel || createdAtLabel) ? (
                <div className="lab-newlayout-history-lightbox-meta-pair-row">
                  {previewItem.generationModel ? (
                    <div className="lab-newlayout-history-lightbox-meta-pair-cell">
                      <span>Model</span>
                      <strong className="lab-newlayout-history-lightbox-meta-mono">{previewItem.generationModel}</strong>
                    </div>
                  ) : null}
                  {createdAtLabel ? (
                    <div className="lab-newlayout-history-lightbox-meta-pair-cell">
                      <span>Created</span>
                      <strong>{createdAtLabel}</strong>
                    </div>
                  ) : null}
                </div>
              ) : null}
              {(previewItem.projectId || previewItem.folderId) ? (
                <div className="lab-newlayout-history-lightbox-meta-pair-row">
                  {previewItem.projectId ? (
                    <div className="lab-newlayout-history-lightbox-meta-pair-cell">
                      <span>Project</span>
                      <strong className="lab-newlayout-history-lightbox-meta-mono">{previewItem.projectId}</strong>
                    </div>
                  ) : null}
                  {previewItem.folderId ? (
                    <div className="lab-newlayout-history-lightbox-meta-pair-cell">
                      <span>Folder</span>
                      <strong className="lab-newlayout-history-lightbox-meta-mono">{previewItem.folderId}</strong>
                    </div>
                  ) : null}
                </div>
              ) : null}
              {previewItem.generationSource ? (
                <div className="lab-newlayout-history-lightbox-meta-row">
                  <span>Source</span>
                  <strong>{previewItem.generationSource}</strong>
                </div>
              ) : null}
              <div className="lab-newlayout-history-lightbox-meta-row">
                <span>Asset URL</span>
                <strong className="lab-newlayout-history-lightbox-meta-mono" title={previewItem.url}>{previewItem.url}</strong>
              </div>
              {previewItem.generationPrompt ? (
                <div className="lab-newlayout-history-lightbox-meta-row">
                  <span>Prompt</span>
                  <strong title={previewItem.generationPrompt}>{previewItem.generationPrompt}</strong>
                </div>
              ) : null}
              {previewItem.generationRequestPayload ? (
                <div className="lab-newlayout-history-lightbox-meta-row">
                  <span>JSON</span>
                  <pre className="lab-newlayout-history-lightbox-meta-json">{JSON.stringify(previewItem.generationRequestPayload, null, 2)}</pre>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  )
}

function OpenAIImageTestingPanel() {
  return (
    <div className="lab-newlayout-panel lab-newlayout-panel--openai-image-testing">
      <OpenAIImageLabPanel />
    </div>
  )
}

// Placeholder — kept for legacy grid/card patterns referenced below
const dockviewComponents = {
  default: PlaceholderPanel,
  workspaceHome: WorkspaceHomePanel,
  watchlist: AssetsLibraryPanel,
  pricealert: PlaceholderPanel,
  research: StoryOverviewPanel,
  flow: FlowPanel,
  orderbook: LabNewLayoutComposerPanel,
  orders: HistoryGallerySuggestionPanel,
  vesselfinder: PlaceholderPanel,
  positionsummary: LabNewLayoutDirectApiPanel,
  references: ReferencesPanel,
  grokTesting: GrokTestingPanel,
  openaiImageTesting: OpenAIImageTestingPanel,
  eventlog: PlaceholderPanel,
  layoutinspector: PlaceholderPanel,
  debuginfo: PlaceholderPanel,
  explorerEdge: LabNewLayoutExplorerEdgePanel,
  uiSettingsEdge: LabNewLayoutUiSettingsEdgePanel,
  userSettingsEdge: LabNewLayoutUserSettingsEdgePanel,
  fixedPlaceholder: PlaceholderPanel,
}

function buildDockviewDemoLayout(api: DockviewApi) {
  const news = api.addPanel({
    id: 'news',
    component: 'workspaceHome',
    title: 'Workspace Home',
    params: getPanelSuggestion('news', 'Workspace Home'),
  })

  const watchlist = api.addPanel({
    id: 'watchlist',
    component: 'watchlist',
    title: 'Assets Library',
    renderer: 'always',
    position: { referencePanel: news },
    params: getPanelSuggestion('watchlist', 'Assets Library'),
  })

  const priceAlert = api.addPanel({
    id: 'pricealert',
    component: 'pricealert',
    title: 'Workflow Library',
    renderer: 'always',
    position: { referencePanel: watchlist },
    params: getPanelSuggestion('pricealert', 'Workflow Library'),
  })

  const grokTesting = api.addPanel({
    id: 'grokTesting',
    component: 'grokTesting',
    title: 'Grok Testing',
    renderer: 'always',
    position: { referencePanel: priceAlert },
    params: getPanelSuggestion('grokTesting', 'Grok Testing'),
  })

  api.addPanel({
    id: 'openaiImageTesting',
    component: 'openaiImageTesting',
    title: 'OpenAI Image',
    renderer: 'always',
    position: { referencePanel: grokTesting },
    params: getPanelSuggestion('openaiImageTesting', 'OpenAI Image'),
  })

  api.addPanel({
    id: 'research',
    component: 'research',
    title: 'Story Overview',
    position: { referencePanel: priceAlert },
    params: getPanelSuggestion('research', 'Story Overview'),
  })

  api.addPanel({
    id: 'flow',
    component: 'flow',
    title: 'Flow',
    position: { referencePanel: priceAlert },
    params: getPanelSuggestion('flow', 'Flow'),
  })

  const orders = api.addPanel({
    id: 'orders',
    component: 'orders',
    title: 'History Gallery',
    renderer: 'always',
    position: { referencePanel: watchlist, direction: 'right' },
    params: getPanelSuggestion('orders', 'History Gallery'),
  })

  api.addPanel({
    id: 'vesselfinder',
    component: 'vesselfinder',
    title: 'Playlist / Sequencer',
    position: { referencePanel: orders },
    params: getPanelSuggestion('vesselfinder', 'Playlist / Sequencer'),
  })

  const composerGroup = api.addGroup({
    referencePanel: orders,
    direction: 'below',
    hideHeader: true,
  })

  const orderBook = api.addPanel({
    id: 'orderbook',
    component: 'orderbook',
    title: 'Composer',
    renderer: 'always',
    position: { referenceGroup: composerGroup },
    params: getPanelSuggestion('orderbook', 'Composer'),
  })

  const positionSummary = api.addPanel({
    id: 'positionsummary',
    component: 'positionsummary',
    title: 'Direct API',
    renderer: 'always',
    position: { referencePanel: orderBook, direction: 'right' },
    params: getPanelSuggestion('positionsummary', 'Direct API'),
  })

  api.addPanel({
    id: 'console',
    component: 'default',
    title: 'Console / Feed',
    position: { referencePanel: positionSummary },
    params: getPanelSuggestion('console', 'Console / Feed'),
  })

  const referencesPanel = api.addPanel({
    id: 'references',
    component: 'references',
    title: 'References',
    renderer: 'always',
    position: { referencePanel: positionSummary },
    params: getPanelSuggestion('references', 'References'),
  })

  const watchlistGroupId = watchlist.api.group.id
  const marketData = api.createTabGroup({
    groupId: watchlistGroupId,
    label: 'Library',
    color: '#6b7280',
  })
  api.addPanelToTabGroup({
    groupId: watchlistGroupId,
    tabGroupId: marketData.id,
    panelId: 'watchlist',
  })
  api.addPanelToTabGroup({
    groupId: watchlistGroupId,
    tabGroupId: marketData.id,
    panelId: 'pricealert',
  })
  api.addPanelToTabGroup({
    groupId: watchlistGroupId,
    tabGroupId: marketData.id,
    panelId: 'grokTesting',
  })
  api.addPanelToTabGroup({
    groupId: watchlistGroupId,
    tabGroupId: marketData.id,
    panelId: 'openaiImageTesting',
  })

  const ordersGroupId = orders.api.group.id
  const shipping = api.createTabGroup({
    groupId: ordersGroupId,
    label: 'Outputs',
    color: '#6b7280',
  })
  api.addPanelToTabGroup({
    groupId: ordersGroupId,
    tabGroupId: shipping.id,
    panelId: 'orders',
  })
  api.addPanelToTabGroup({
    groupId: ordersGroupId,
    tabGroupId: shipping.id,
    panelId: 'vesselfinder',
  })

  watchlist.api.setActive()
  orderBook.api.setActive()
  orders.api.setActive()
  referencesPanel.api.setActive()
}

const FLOW_FOCUS_CLOSE_PANEL_IDS = [
  'orderbook',
  'orders',
  'vesselfinder',
  'positionsummary',
  'console',
  'references',
  'right-1',
  'right-2',
]

function closePanelsForFlowFocus(api: DockviewApi) {
  const closedPanelIds: string[] = []

  for (const panelId of FLOW_FOCUS_CLOSE_PANEL_IDS) {
    const panel = api.panels.find((item) => item.id === panelId)
    if (panel) {
      panel.api.close()
      closedPanelIds.push(panelId)
    }
  }

  return closedPanelIds
}

function restorePanelsAfterFlowFocus(api: DockviewApi, panelIds: string[]) {
  const shouldRestore = new Set(panelIds)

  const watchlistPanel = api.panels.find((panel) => panel.id === 'watchlist')
  const ordersPanel = api.panels.find((panel) => panel.id === 'orders')
  const orderbookPanel = api.panels.find((panel) => panel.id === 'orderbook')
  const positionSummaryPanel = api.panels.find((panel) => panel.id === 'positionsummary')

  let ensuredOrdersPanel = ordersPanel
  if (shouldRestore.has('orders') && !ensuredOrdersPanel && watchlistPanel) {
    ensuredOrdersPanel = api.addPanel({
      id: 'orders',
      component: 'orders',
      title: 'History Gallery',
      renderer: 'always',
      position: { referencePanel: watchlistPanel, direction: 'right' },
      params: getPanelSuggestion('orders', 'History Gallery'),
    })
  }

  if (shouldRestore.has('vesselfinder') && !api.panels.find((panel) => panel.id === 'vesselfinder') && ensuredOrdersPanel) {
    api.addPanel({
      id: 'vesselfinder',
      component: 'vesselfinder',
      title: 'Playlist / Sequencer',
      position: { referencePanel: ensuredOrdersPanel },
      params: getPanelSuggestion('vesselfinder', 'Playlist / Sequencer'),
    })
  }

  let ensuredOrderbookPanel = orderbookPanel
  if (shouldRestore.has('orderbook') && !ensuredOrderbookPanel && ensuredOrdersPanel) {
    ensuredOrderbookPanel = api.addPanel({
      id: 'orderbook',
      component: 'orderbook',
      title: 'Composer',
      renderer: 'always',
      position: { referencePanel: ensuredOrdersPanel, direction: 'below' },
      params: getPanelSuggestion('orderbook', 'Composer'),
    })
    ensuredOrderbookPanel.api.group.model.header.hidden = false
  }

  let ensuredPositionSummaryPanel = positionSummaryPanel
  if (shouldRestore.has('positionsummary') && !ensuredPositionSummaryPanel && ensuredOrderbookPanel) {
    ensuredPositionSummaryPanel = api.addPanel({
      id: 'positionsummary',
      component: 'positionsummary',
      title: 'Direct API',
      renderer: 'always',
      position: { referencePanel: ensuredOrderbookPanel, direction: 'right' },
      params: getPanelSuggestion('positionsummary', 'Direct API'),
    })
  }

  if (shouldRestore.has('console') && !api.panels.find((panel) => panel.id === 'console') && ensuredPositionSummaryPanel) {
    api.addPanel({
      id: 'console',
      component: 'default',
      title: 'Console / Feed',
      position: { referencePanel: ensuredPositionSummaryPanel },
      params: getPanelSuggestion('console', 'Console / Feed'),
    })
  }

  if (shouldRestore.has('references') && !api.panels.find((panel) => panel.id === 'references') && ensuredPositionSummaryPanel) {
    api.addPanel({
      id: 'references',
      component: 'references',
      title: 'References',
      renderer: 'always',
      position: { referencePanel: ensuredPositionSummaryPanel },
      params: getPanelSuggestion('references', 'References'),
    })
  }

  const rightEdge = api.getEdgeGroup('right')
  if (rightEdge && shouldRestore.has('right-1') && !api.panels.find((panel) => panel.id === 'right-1')) {
    api.addPanel({
      id: 'right-1',
      component: 'fixedPlaceholder',
      title: 'Outline',
      position: { referenceGroup: rightEdge.id },
      params: getPanelSuggestion('right-1', 'Outline', 'right'),
    })
  }

  if (rightEdge && shouldRestore.has('right-2') && !api.panels.find((panel) => panel.id === 'right-2')) {
    api.addPanel({
      id: 'right-2',
      component: 'fixedPlaceholder',
      title: 'Properties',
      position: { referenceGroup: rightEdge.id },
      params: getPanelSuggestion('right-2', 'Properties', 'right'),
    })
  }
}

const edgeGroupDefinitions: {
  pos: 'bottom' | 'left' | 'right'
  options: { id: string; initialSize: number; minimumSize: number }
}[] = [
  {
    pos: 'bottom',
    options: { id: 'bottom', initialSize: 200, minimumSize: 100 },
  },
  {
    pos: 'left',
    options: { id: 'left', initialSize: LEFT_EDGE_WIDTH, minimumSize: LEFT_EDGE_MINIMUM_WIDTH },
  },
  {
    pos: 'right',
    options: { id: 'right', initialSize: 220, minimumSize: 150 },
  },
]

const edgeGroupPanels: {
  pos: 'bottom' | 'left' | 'right'
  id: string
  title: string
}[] = [
  { pos: 'left', id: 'left-1', title: 'Explorer' },
  { pos: 'left', id: 'left-2', title: 'UI Settings' },
  { pos: 'left', id: 'left-3', title: 'User Settings' },
  { pos: 'right', id: 'right-1', title: 'Outline' },
  { pos: 'right', id: 'right-2', title: 'Properties' },
  { pos: 'bottom', id: 'bottom-1', title: 'Terminal' },
  { pos: 'bottom', id: 'bottom-2', title: 'Output' },
  { pos: 'bottom', id: 'bottom-3', title: 'Problems' },
]

const FIXED_EDGE_PANEL_IDS = new Set(edgeGroupPanels.map((panel) => panel.id))

function applyEdgeGroupPolicies(api: DockviewApi) {
  const leftEdge = api.getEdgeGroup('left')
  if (leftEdge) {
    const leftGroup = api.groups.find((group) => group.id === leftEdge.id)
    if (leftGroup) {
      leftGroup.locked = true
    }
    if (leftEdge.width < LEFT_EDGE_WIDTH) {
      leftEdge.setSize({ width: LEFT_EDGE_WIDTH })
    }
  }

  const rightEdge = api.getEdgeGroup('right')
  if (rightEdge) {
    const rightGroup = api.groups.find((group) => group.id === rightEdge.id)
    if (rightGroup) {
      rightGroup.locked = true
    }
  }
}

function setupEdgeGroups(api: DockviewApi) {
  for (const position of ['top', 'bottom', 'left', 'right'] as EdgeGroupPosition[]) {
    if (api.getEdgeGroup(position)) {
      api.removeEdgeGroup(position)
    }
  }

  for (const { pos, options } of edgeGroupDefinitions) {
    const edgeGroup = api.addEdgeGroup(pos, { ...options, collapsed: false })
    if (pos === 'left' || pos === 'right') {
      const group = api.groups.find((item) => item.id === edgeGroup.id)
      if (group) {
        group.locked = true
      }
    }
  }
}

function populateEdgeGroups(api: DockviewApi) {
  for (const { pos, id, title } of edgeGroupPanels) {
    const groupApi = api.getEdgeGroup(pos)
    if (groupApi && !api.panels.find((panel) => panel.id === id)) {
      const componentId = id === 'left-1'
        ? 'explorerEdge'
        : id === 'left-2'
          ? 'uiSettingsEdge'
          : id === 'left-3'
            ? 'userSettingsEdge'
            : 'fixedPlaceholder'

      api.addPanel({
        id,
        component: componentId,
        title,
        position: { referenceGroup: groupApi.id },
        params: getPanelSuggestion(id, title, pos),
      })
    }
  }

}

function normalizeDockviewPreviewLayout(api: DockviewApi) {
  const composerPanel = api.panels.find((panel) => panel.id === 'orderbook')
  if (composerPanel) {
    composerPanel.api.group.model.header.hidden = false
  }

  const leftEdge = api.getEdgeGroup('left')
  if (leftEdge && !api.panels.find((panel) => panel.id === 'left-1')) {
    api.addPanel({
      id: 'left-1',
      component: 'explorerEdge',
      title: 'Explorer',
      position: { referenceGroup: leftEdge.id },
      params: getPanelSuggestion('left-1', 'Explorer', 'left'),
    })
  }

  if (leftEdge && !api.panels.find((panel) => panel.id === 'left-2')) {
    api.addPanel({
      id: 'left-2',
      component: 'uiSettingsEdge',
      title: 'UI Settings',
      position: { referenceGroup: leftEdge.id },
      params: getPanelSuggestion('left-2', 'UI Settings', 'left'),
    })
  }

  if (leftEdge && !api.panels.find((panel) => panel.id === 'left-3')) {
    api.addPanel({
      id: 'left-3',
      component: 'userSettingsEdge',
      title: 'User Settings',
      position: { referenceGroup: leftEdge.id },
      params: getPanelSuggestion('left-3', 'User Settings', 'left'),
    })
  }

  const operatorPanel = api.panels.find((panel) => panel.id === 'positionsummary')
  if (operatorPanel) {
    const groupId = operatorPanel.api.group.id
    for (const tabGroup of [...api.getTabGroups({ groupId })]) {
      api.dissolveTabGroup({ groupId, tabGroupId: tabGroup.id })
    }
  }

  const positionSummary = api.panels.find((panel) => panel.id === 'positionsummary')
  if (positionSummary && !api.panels.find((panel) => panel.id === 'references')) {
    api.addPanel({
      id: 'references',
      component: 'references',
      title: 'References',
      renderer: 'always',
      position: { referencePanel: positionSummary },
      params: getPanelSuggestion('references', 'References'),
    })
  }

  const assetsLibraryPanel = api.panels.find((panel) => panel.id === 'watchlist')
  const workflowLibraryPanel = api.panels.find((panel) => panel.id === 'pricealert')
  if (workflowLibraryPanel && !api.panels.find((panel) => panel.id === 'grokTesting')) {
    api.addPanel({
      id: 'grokTesting',
      component: 'grokTesting',
      title: 'Grok Testing',
      renderer: 'always',
      position: { referencePanel: workflowLibraryPanel },
      params: getPanelSuggestion('grokTesting', 'Grok Testing'),
    })
  }

  const grokTestingPanel = api.panels.find((panel) => panel.id === 'grokTesting')
  if (grokTestingPanel && !api.panels.find((panel) => panel.id === 'openaiImageTesting')) {
    api.addPanel({
      id: 'openaiImageTesting',
      component: 'openaiImageTesting',
      title: 'OpenAI Image',
      renderer: 'always',
      position: { referencePanel: grokTestingPanel },
      params: getPanelSuggestion('openaiImageTesting', 'OpenAI Image'),
    })
  }

  const openAIImageTestingPanel = api.panels.find((panel) => panel.id === 'openaiImageTesting')
  if (assetsLibraryPanel && grokTestingPanel) {
    const groupId = assetsLibraryPanel.api.group.id
    const libraryTabGroup = [...api.getTabGroups({ groupId })][0] ?? api.createTabGroup({
      groupId,
      label: 'Library',
      color: '#6b7280',
    })

    api.addPanelToTabGroup({
      groupId,
      tabGroupId: libraryTabGroup.id,
      panelId: 'watchlist',
    })

    if (workflowLibraryPanel?.api.group.id === groupId) {
      api.addPanelToTabGroup({
        groupId,
        tabGroupId: libraryTabGroup.id,
        panelId: 'pricealert',
      })
    }

    if (grokTestingPanel.api.group.id === groupId) {
      api.addPanelToTabGroup({
        groupId,
        tabGroupId: libraryTabGroup.id,
        panelId: 'grokTesting',
      })
    }

    if (openAIImageTestingPanel?.api.group.id === groupId) {
      api.addPanelToTabGroup({
        groupId,
        tabGroupId: libraryTabGroup.id,
        panelId: 'openaiImageTesting',
      })
    }
  }

  if (workflowLibraryPanel && !api.panels.find((panel) => panel.id === 'flow')) {
    api.addPanel({
      id: 'flow',
      component: 'flow',
      title: 'Flow',
      position: { referencePanel: workflowLibraryPanel },
      params: getPanelSuggestion('flow', 'Flow'),
    })
  }

  applyEdgeGroupPolicies(api)
}

function buildDefaultDockviewLayout(api: DockviewApi) {
  api.clear()
  setupEdgeGroups(api)
  buildDockviewDemoLayout(api)
  populateEdgeGroups(api)
  normalizeDockviewPreviewLayout(api)
}

function restoreDockviewLayout(api: DockviewApi, persistedState: LabNewLayoutPersistedState | null): boolean {
  buildDefaultDockviewLayout(api)

  if (!persistedState) {
    return false
  }

  try {
    api.fromJSON(persistedState.layout, { reuseExistingPanels: true })
    normalizeDockviewPreviewLayout(api)
    return true
  } catch {
    buildDefaultDockviewLayout(api)
    return false
  }
}

function LabNewLayoutFolderToolbar({
  studioProjectId,
  studioActiveFolderId,
  studioProjects,
  studioFolders,
  setStudioProjectId,
  setStudioActiveFolderId,
}: {
  studioProjectId: string | null
  studioActiveFolderId: string | null
  studioProjects: ProjectSummary[]
  studioFolders: FolderSummary[]
  setStudioProjectId: (id: string | null) => void
  setStudioActiveFolderId: (id: string | null) => void
}) {
  const folderTarget: FolderTarget | null = studioProjectId
    ? {
        projectId: studioProjectId,
        projectName: studioProjects.find((p) => p.id === studioProjectId)?.name ?? studioProjectId,
        folderId: studioActiveFolderId,
        folderName: studioActiveFolderId
          ? (studioFolders.find((f) => f.id === studioActiveFolderId)?.name ?? studioActiveFolderId)
          : null,
      }
    : null

  const handleChange = (target: FolderTarget | null) => {
    setStudioProjectId(target?.projectId ?? null)
    setStudioActiveFolderId(target?.folderId ?? null)
  }

  return (
    <div className="lab-newlayout-toolbar">
      <FolderMenu value={folderTarget} onChange={handleChange} />
    </div>
  )
}

export default function LabNewLayoutPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const initialLocalLayoutRef = useRef<LabNewLayoutPersistedState | null>(readLocalPersistedLayoutState())
  const initialLocalPresetStoreRef = useRef<LabNewLayoutPresetStore>(readLocalPresetStore())
  const initialLegacyPanelAccessRef = useRef<LabNewLayoutProjectTabPolicyState>(readLegacyPanelAccessState())
  const defaultLayoutStateRef = useRef<LabNewLayoutPersistedState | null>(null)
  const hasAppliedUrlSelectionRef = useRef(false)
  const hasBootstrappedCanonicalUrlRef = useRef(false)
  const [authUid, setAuthUid] = useState('')
  const [authDisplayName, setAuthDisplayName] = useState('')
  const [authEmail, setAuthEmail] = useState('')
  const [authPhotoUrl, setAuthPhotoUrl] = useState('')
  const [hasAdminClaim, setHasAdminClaim] = useState(Boolean(import.meta.env.DEV))
  const [initialLayoutState, setInitialLayoutState] = useState<LabNewLayoutPersistedState | null>(initialLocalLayoutRef.current)
  const [isLayoutBootstrapComplete, setIsLayoutBootstrapComplete] = useState<boolean>(Boolean(initialLocalLayoutRef.current))
  const [isPrivilegeBootstrapComplete, setIsPrivilegeBootstrapComplete] = useState<boolean>(Boolean(import.meta.env.DEV))
  const [layoutPresets, setLayoutPresets] = useState<LayoutPresetRecord[]>(initialLocalPresetStoreRef.current.presets)
  const [projectTabPolicy, setProjectTabPolicy] = useState<LabNewLayoutProjectTabPolicyState>(initialLegacyPanelAccessRef.current)
  const [presetDraftName, setPresetDraftName] = useState('')
  const [selectedPresetId, setSelectedPresetId] = useState(initialLocalPresetStoreRef.current.presets[0]?.id || '')
  const {
    dataContextValue,
    studioProjectId,
    studioProjects,
    studioFolders,
    studioActiveFolderId,
    setStudioProjectId,
    setStudioActiveFolderId,
    projectNewLayoutConfig,
    updateProjectNewLayoutConfig,
  } = useLabNewLayoutWorkspace({
    uid: authUid,
    displayName: authDisplayName,
    email: authEmail,
    photoUrl: authPhotoUrl,
  })
  const apiRef = useRef<DockviewApi | null>(null)
  const authUidRef = useRef('')
  const { showToast } = useToast()
  const layoutChangeDisposableRef = useRef<{ dispose: () => void } | null>(null)
  const activePanelChangeDisposableRef = useRef<{ dispose: () => void } | null>(null)
  const isFlowFocusModeRef = useRef(false)
  const flowFocusClosedPanelIdsRef = useRef<string[]>([])
  const layoutSaveTimerRef = useRef<number | null>(null)
  const isApplyingLayoutRef = useRef(false)
  const isSashDraggingRef = useRef(false)
  const pendingRemoteLayoutPersistRef = useRef(false)
  const layoutDirtyRef = useRef(false)
  const lastSavedLayoutJsonRef = useRef(initialLocalLayoutRef.current ? JSON.stringify(initialLocalLayoutRef.current.layout) : '')
  const lastSavedPresetStoreJsonRef = useRef(JSON.stringify(initialLocalPresetStoreRef.current))
  const normalizedMasterEmail = (MASTER_EMAIL || '').trim().toLowerCase()
  const normalizedAuthEmail = authEmail.trim().toLowerCase()
  const isMasterAdminUser = Boolean(import.meta.env.DEV || (normalizedMasterEmail.length > 0 && normalizedAuthEmail === normalizedMasterEmail))
  const isPrivilegedUser = isMasterAdminUser || hasAdminClaim
  const adminOnlyPanelIds = projectTabPolicy.adminOnlyPanelIds
  const canCurrentUserCloseMainTabs = isMasterAdminUser && projectTabPolicy.masterAdminCanCloseTabs

  useStaleGenerationRecovery(CHATBOT_BASE)
  const parsedRouteSelection = useMemo(
    () => parseLabNewLayoutRoute(location.pathname),
    [location.pathname],
  )
  const selectedFolderPath = useMemo(
    () => resolveFolderPath(studioActiveFolderId || null, studioFolders),
    [studioActiveFolderId, studioFolders],
  )
  const canonicalSelectionPath = useMemo(
    () => buildLabNewLayoutRoute(studioProjectId || null, selectedFolderPath.ids),
    [selectedFolderPath.ids, studioProjectId],
  )
  const routeSelectionKey = useMemo(
    () => `${parsedRouteSelection.projectId || ''}|${parsedRouteSelection.folderPathIds.join('/')}`,
    [parsedRouteSelection.folderPathIds, parsedRouteSelection.projectId],
  )

  const persistLayoutState = (api: DockviewApi, options?: { forceRemote?: boolean }) => {
    pendingRemoteLayoutPersistRef.current = pendingRemoteLayoutPersistRef.current || Boolean(options?.forceRemote)

    if (layoutSaveTimerRef.current !== null) {
      window.clearTimeout(layoutSaveTimerRef.current)
    }

    layoutSaveTimerRef.current = window.setTimeout(() => {
      layoutSaveTimerRef.current = null

      const currentLayout = api.toJSON()
      const currentLayoutJson = JSON.stringify(currentLayout)
      const hasLayoutChanged = currentLayoutJson !== lastSavedLayoutJsonRef.current
      const shouldForceRemote = pendingRemoteLayoutPersistRef.current
      pendingRemoteLayoutPersistRef.current = false

      if (!hasLayoutChanged && !shouldForceRemote) {
        layoutDirtyRef.current = false
        return
      }

      const nextState = createPersistedLayoutState(currentLayout)

      if (hasLayoutChanged) {
        lastSavedLayoutJsonRef.current = currentLayoutJson
        writeLocalPersistedLayoutState(nextState)
      }

      const currentUid = authUidRef.current
      if (!currentUid) {
        return
      }

      void saveUserPrefs(currentUid, {
        toorGenDockviewLayoutState: JSON.stringify(nextState),
      })

      layoutDirtyRef.current = false
    }, isSashDraggingRef.current ? 260 : 120)
  }

  const persistPresetStore = (presets: LayoutPresetRecord[], options?: { forceRemote?: boolean }) => {
    const nextStore: LabNewLayoutPresetStore = {
      version: 6,
      presets,
    }
    const nextStoreJson = JSON.stringify(nextStore)
    const hasPresetStoreChanged = nextStoreJson !== lastSavedPresetStoreJsonRef.current

    if (hasPresetStoreChanged) {
      lastSavedPresetStoreJsonRef.current = nextStoreJson
      writeLocalPresetStore(nextStore)
    }

    if (!authUidRef.current || (!hasPresetStoreChanged && !options?.forceRemote)) {
      return
    }

    void saveUserPrefs(authUidRef.current, {
      toorGenDockviewLayoutPresets: nextStoreJson,
    })
  }

  const applyPanelAccessState = (api: DockviewApi) => {
    applyAdminOnlyPanelVisibility(api, adminOnlyPanelIds, isPrivilegedUser)
    applyEdgeGroupPolicies(api)
  }

  const handleOpenStudioExplorer = useCallback(() => {
    const api = apiRef.current
    if (!api) {
      return
    }

    if (!api.isEdgeGroupVisible('left')) {
      api.setEdgeGroupVisible('left', true)
    }

    const leftEdge = api.getEdgeGroup('left')
    if (leftEdge) {
      if (leftEdge.isCollapsed()) {
        leftEdge.expand()
      } else if (leftEdge.width < LEFT_EDGE_WIDTH) {
        leftEdge.setSize({ width: LEFT_EDGE_WIDTH })
      }
    }

    let explorerPanel = api.panels.find((panel) => panel.id === 'left-1')
    if (!explorerPanel && leftEdge) {
      api.addPanel({
        id: 'left-1',
        component: 'explorerEdge',
        title: 'Explorer',
        position: { referenceGroup: leftEdge.id },
        params: getPanelSuggestion('left-1', 'Explorer', 'left'),
      })
      explorerPanel = api.panels.find((panel) => panel.id === 'left-1')
    }

    explorerPanel?.api.setActive()
  }, [])

  const handleOpenHistoryGallery = useCallback(() => {
    const api = apiRef.current
    if (!api) {
      return
    }

    const historyPanel = api.panels.find((panel) => panel.id === 'orders')
    historyPanel?.api.setActive()
  }, [])

  const commitAppliedLayout = (api: DockviewApi, options?: { captureAsDefault?: boolean }) => {
    const nextAppliedState = createPersistedLayoutState(api.toJSON())

    if (options?.captureAsDefault || !defaultLayoutStateRef.current) {
      defaultLayoutStateRef.current = nextAppliedState
    }

    initialLocalLayoutRef.current = nextAppliedState
    setInitialLayoutState(nextAppliedState)
    lastSavedLayoutJsonRef.current = JSON.stringify(nextAppliedState.layout)
    writeLocalPersistedLayoutState(nextAppliedState)
    persistLayoutState(api, { forceRemote: Boolean(authUidRef.current) })
  }

  const applyDefaultLayout = (api: DockviewApi) => {
    isApplyingLayoutRef.current = true
    buildDefaultDockviewLayout(api)
    applyPanelAccessState(api)
    isApplyingLayoutRef.current = false
    commitAppliedLayout(api, { captureAsDefault: true })
  }

  const applyLayoutState = (nextState: LabNewLayoutPersistedState | null) => {
    const api = apiRef.current
    if (!api) {
      return
    }

    if (!nextState) {
      applyDefaultLayout(api)
      return
    }

    isApplyingLayoutRef.current = true
    restoreDockviewLayout(api, nextState)
    applyPanelAccessState(api)
    isApplyingLayoutRef.current = false
    commitAppliedLayout(api)
  }

  const handleResetLayout = () => {
    const api = apiRef.current
    if (!api) {
      return
    }

    applyDefaultLayout(api)
  }

  const handleSaveAsDefault = useCallback(() => {
    const api = apiRef.current
    const currentUid = authUidRef.current
    if (!api || !currentUid) {
      return
    }
    if (typeof window !== 'undefined') {
      const ok = window.confirm('Save the current UI as the default layout for all users?')
      if (!ok) return
    }
    const persisted = createPersistedLayoutState(api.toJSON())
    const payload = JSON.stringify(persisted)
    void saveDefaultLabNewLayout(payload, currentUid)
      .then(() => {
        defaultLayoutStateRef.current = persisted
        showToast({ message: 'Default UI saved for all users', type: 'success' })
      })
      .catch(() => {
        showToast({ message: 'Failed to save default UI', type: 'error' })
      })
  }, [showToast])

  const handleSavePreset = () => {
    const api = apiRef.current
    const trimmedName = presetDraftName.trim()
    if (!api || !trimmedName) {
      return
    }

    const presetLayout = api.toJSON()
    const existingPreset = layoutPresets.find((preset) => preset.name.trim().toLowerCase() === trimmedName.toLowerCase())
    const nextPreset: LayoutPresetRecord = {
      id: existingPreset?.id || `preset-${Date.now()}`,
      name: trimmedName,
      savedAt: Date.now(),
      layout: presetLayout,
    }
    const nextPresets = [...layoutPresets.filter((preset) => preset.id !== nextPreset.id), nextPreset]
      .sort((left, right) => right.savedAt - left.savedAt)

    setLayoutPresets(nextPresets)
    setSelectedPresetId(nextPreset.id)
    setPresetDraftName('')
    persistPresetStore(nextPresets)
  }

  const handleUpdatePreset = () => {
    const api = apiRef.current
    const selectedPreset = layoutPresets.find((item) => item.id === selectedPresetId)
    if (!api || !selectedPreset) {
      return
    }

    const trimmedName = presetDraftName.trim()
    const nextPreset: LayoutPresetRecord = {
      ...selectedPreset,
      name: trimmedName || selectedPreset.name,
      savedAt: Date.now(),
      layout: api.toJSON(),
    }
    const nextPresets = [...layoutPresets.filter((preset) => preset.id !== nextPreset.id), nextPreset]
      .sort((left, right) => right.savedAt - left.savedAt)

    setLayoutPresets(nextPresets)
    setSelectedPresetId(nextPreset.id)
    setPresetDraftName(nextPreset.name)
    persistPresetStore(nextPresets)
  }

  const handleApplyPreset = () => {
    const preset = layoutPresets.find((item) => item.id === selectedPresetId)
    if (!preset) {
      return
    }

    applyLayoutState(createPersistedLayoutState(preset.layout))
  }

  const commitProjectTabPolicy = (nextPolicy: LabNewLayoutProjectTabPolicyState) => {
    setProjectTabPolicy(nextPolicy)

    if (!studioProjectId) {
      return
    }

    writeLocalProjectTabPolicyState(studioProjectId, nextPolicy)
    updateProjectNewLayoutConfig((current) => ({
      ...current,
      adminOnlyPanelIds: nextPolicy.adminOnlyPanelIds,
      masterAdminCanCloseTabs: nextPolicy.masterAdminCanCloseTabs,
    }))
  }

  const handleToggleAdminOnlyTab = (panelId: string) => {
    const nextIds = adminOnlyPanelIds.includes(panelId)
      ? adminOnlyPanelIds.filter((id) => id !== panelId)
      : [...adminOnlyPanelIds, panelId]

    commitProjectTabPolicy(createProjectTabPolicyState({
      ...projectTabPolicy,
      adminOnlyPanelIds: nextIds,
    }))
  }

  const handleSetTabClosingEnabled = (value: boolean) => {
    if (!isMasterAdminUser) {
      return
    }

    commitProjectTabPolicy(createProjectTabPolicyState({
      ...projectTabPolicy,
      masterAdminCanCloseTabs: value,
    }))
  }

  useEffect(() => {
    authUidRef.current = authUid
  }, [authUid])

  useEffect(() => {
    if (selectedPresetId && layoutPresets.some((preset) => preset.id === selectedPresetId)) {
      return
    }

    if (!selectedPresetId && layoutPresets.length === 0) {
      return
    }

    setSelectedPresetId(layoutPresets[0]?.id || '')
  }, [layoutPresets, selectedPresetId])

  useEffect(() => {
    let cancelled = false

    const unsub = onAuthStateChanged(auth, (user) => {
      const nextUid = user?.uid || ''
      const nextEmail = user?.email || ''
      const nextNormalizedEmail = nextEmail.trim().toLowerCase()
      const isDeveloperSession = Boolean(import.meta.env.DEV)
      const isMasterUser = normalizedMasterEmail.length > 0 && nextNormalizedEmail === normalizedMasterEmail

      setAuthUid(nextUid)
      setAuthDisplayName(user?.displayName || nextEmail || 'Signed-out user')
      setAuthEmail(nextEmail)
      setAuthPhotoUrl(user?.photoURL || '')

      if (!nextUid) {
        setHasAdminClaim(isDeveloperSession)
        setIsPrivilegeBootstrapComplete(true)
        setIsLayoutBootstrapComplete(true)
        return
      }

      if (isDeveloperSession || isMasterUser) {
        setHasAdminClaim(true)
        setIsPrivilegeBootstrapComplete(true)
      } else {
        setHasAdminClaim(false)
        setIsPrivilegeBootstrapComplete(false)
        void user?.getIdTokenResult()
          .then((tokenResult) => {
            if (cancelled) {
              return
            }

            setHasAdminClaim(tokenResult.claims.admin === true)
          })
          .catch(() => {
            if (!cancelled) {
              setHasAdminClaim(false)
            }
          })
          .finally(() => {
            if (!cancelled) {
              setIsPrivilegeBootstrapComplete(true)
            }
          })
      }

      void loadUserPrefs(nextUid)
        .then(async (prefs) => {
          if (cancelled) {
            return
          }

          if (!initialLocalLayoutRef.current) {
            const remoteLayoutState = parsePersistedLayoutState(prefs?.toorGenDockviewLayoutState)
            if (remoteLayoutState) {
              initialLocalLayoutRef.current = remoteLayoutState
              lastSavedLayoutJsonRef.current = JSON.stringify(remoteLayoutState.layout)
              setInitialLayoutState(remoteLayoutState)
              writeLocalPersistedLayoutState(remoteLayoutState)
            } else {
              const globalDefaultPayload = await loadDefaultLabNewLayout()
              if (!cancelled && globalDefaultPayload) {
                const globalDefaultState = parsePersistedLayoutState(globalDefaultPayload)
                if (globalDefaultState) {
                  initialLocalLayoutRef.current = globalDefaultState
                  defaultLayoutStateRef.current = globalDefaultState
                  setInitialLayoutState(globalDefaultState)
                }
              }
            }
          }

          if (initialLocalPresetStoreRef.current.presets.length === 0) {
            const remotePresetStore = parsePersistedPresetStore(prefs?.toorGenDockviewLayoutPresets)
            if (remotePresetStore.presets.length > 0) {
              initialLocalPresetStoreRef.current = remotePresetStore
              lastSavedPresetStoreJsonRef.current = JSON.stringify(remotePresetStore)
              setLayoutPresets(remotePresetStore.presets)
              setSelectedPresetId((current) => current || remotePresetStore.presets[0]?.id || '')
              writeLocalPresetStore(remotePresetStore)
            }
          }
        })
        .finally(() => {
          if (!cancelled) {
            setIsLayoutBootstrapComplete(true)
          }
        })
    })

    return () => {
      cancelled = true
      unsub()
    }
  }, [])

  useEffect(() => {
    if (!authUid || !apiRef.current || !isLayoutBootstrapComplete) {
      return
    }

    persistLayoutState(apiRef.current, { forceRemote: true })
  }, [authUid, isLayoutBootstrapComplete])

  useEffect(() => {
    if (!authUid || layoutPresets.length === 0) {
      return
    }

    persistPresetStore(layoutPresets, { forceRemote: true })
  }, [authUid, layoutPresets])

  useEffect(() => {
    const api = apiRef.current
    if (!api || isPrivilegedUser || adminOnlyPanelIds.length === 0) {
      return
    }

    isApplyingLayoutRef.current = true
    applyPanelAccessState(api)
    isApplyingLayoutRef.current = false
  }, [adminOnlyPanelIds, isPrivilegedUser])

  useEffect(() => {
    const fallbackPolicy = readLocalProjectTabPolicyState(studioProjectId) ?? initialLegacyPanelAccessRef.current
    const nextPolicy = studioProjectId
      ? createProjectTabPolicyState(projectNewLayoutConfig ?? fallbackPolicy)
      : fallbackPolicy

    if (studioProjectId) {
      writeLocalProjectTabPolicyState(studioProjectId, nextPolicy)
    }

    setProjectTabPolicy(nextPolicy)
  }, [projectNewLayoutConfig, studioProjectId])

  useEffect(() => {
    hasAppliedUrlSelectionRef.current = false
  }, [routeSelectionKey])

  useEffect(() => {
    const routeProjectId = (parsedRouteSelection.projectId || '').trim()
    const routeFolderIds = parsedRouteSelection.folderPathIds
    const routeTargetFolderId = routeFolderIds.length > 0 ? routeFolderIds[routeFolderIds.length - 1] : null

    if (!routeProjectId) {
      hasAppliedUrlSelectionRef.current = true
      return
    }

    if (studioProjects.length > 0 && !studioProjects.some((project) => project.id === routeProjectId)) {
      hasAppliedUrlSelectionRef.current = true
      return
    }

    if (studioProjectId !== routeProjectId) {
      setStudioProjectId(routeProjectId)
      if (studioActiveFolderId) {
        setStudioActiveFolderId(null)
      }
      return
    }

    if (!routeTargetFolderId) {
      hasAppliedUrlSelectionRef.current = true
      if (studioActiveFolderId) {
        setStudioActiveFolderId(null)
      }
      return
    }

    if (studioFolders.length > 0 && !studioFolders.some((folder) => folder.id === routeTargetFolderId)) {
      hasAppliedUrlSelectionRef.current = true
      return
    }

    if (studioActiveFolderId !== routeTargetFolderId) {
      setStudioActiveFolderId(routeTargetFolderId)
      return
    }

    hasAppliedUrlSelectionRef.current = true
  }, [
    parsedRouteSelection.folderPathIds,
    parsedRouteSelection.projectId,
    setStudioActiveFolderId,
    setStudioProjectId,
    studioActiveFolderId,
    studioFolders,
    studioProjectId,
    studioProjects,
  ])

  // DISABLED FOR DIAGNOSTICS: URL Hydration Effect - syncs URL params to selection state
  // useEffect(() => {
  //   const routeProjectId = (parsedRouteSelection.projectId || '').trim()
  //   const routeFolderIds = parsedRouteSelection.folderPathIds
  //   const routeTargetFolderId = routeFolderIds.length > 0 ? routeFolderIds[routeFolderIds.length - 1] : null

  //   if (!routeProjectId) {
  //     hasAppliedUrlSelectionRef.current = true
  //     return
  //   }

  //   if (studioProjects.length > 0 && !studioProjects.some((project) => project.id === routeProjectId)) {
  //     hasAppliedUrlSelectionRef.current = true
  //     return
  //   }

  //   if (studioProjectId !== routeProjectId) {
  //     setStudioProjectId(routeProjectId)
  //     if (studioActiveFolderId) {
  //       setStudioActiveFolderId(null)
  //     }
  //     return
  //   }

  //   if (!routeTargetFolderId) {
  //     hasAppliedUrlSelectionRef.current = true
  //     if (studioActiveFolderId) {
  //       setStudioActiveFolderId(null)
  //     }
  //     return
  //   }

  //   const routeFolderExists = studioFolders.some((folder) => folder.id === routeTargetFolderId)
  //   if (!routeFolderExists) {
  //     if (studioFolders.length > 0) {
  //       hasAppliedUrlSelectionRef.current = true
  //     }
  //     return
  //   }

  //   if (studioActiveFolderId !== routeTargetFolderId) {
  //     setStudioActiveFolderId(routeTargetFolderId)
  //     return
  //   }

  //   hasAppliedUrlSelectionRef.current = true
  // }, [
  //   parsedRouteSelection.folderPathIds,
  //   parsedRouteSelection.projectId,
  //   setStudioActiveFolderId,
  //   setStudioProjectId,
  //   studioActiveFolderId,
  //   studioFolders,
  //   studioProjectId,
  //   studioProjects,
  // ])

  // DISABLED FOR DIAGNOSTICS: URL Canonical Sync Effect - syncs selection state to URL
  // useEffect(() => {
  //   if (!hasAppliedUrlSelectionRef.current) {
  //     const routeProjectId = (parsedRouteSelection.projectId || '').trim()
  //     if (routeProjectId) {
  //       return
  //     }
  //   }

  //   if (!hasBootstrappedCanonicalUrlRef.current) {
  //     hasBootstrappedCanonicalUrlRef.current = true
  //   }

  //   if (location.pathname !== canonicalSelectionPath) {
  //     navigate(canonicalSelectionPath, { replace: true })
  //   }
  // }, [canonicalSelectionPath, location.pathname, navigate, parsedRouteSelection.projectId])

  useEffect(() => {
    return () => {
      layoutChangeDisposableRef.current?.dispose()
      activePanelChangeDisposableRef.current?.dispose()
      if (layoutSaveTimerRef.current !== null) {
        window.clearTimeout(layoutSaveTimerRef.current)
      }
      if (typeof document !== 'undefined') {
        document.body.classList.remove('lab-newlayout-resizing')
      }
    }
  }, [])

  useEffect(() => {
    const flushLayoutIfDirty = () => {
      const api = apiRef.current
      if (!api || !layoutDirtyRef.current || isSashDraggingRef.current) {
        return
      }

      persistLayoutState(api, { forceRemote: Boolean(authUidRef.current) })
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        flushLayoutIfDirty()
      }
    }

    const handlePageHide = () => {
      flushLayoutIfDirty()
    }

    const handleBeforeUnload = () => {
      flushLayoutIfDirty()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pagehide', handlePageHide)
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pagehide', handlePageHide)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [])

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Element)) {
        return
      }

      const sashHandle = target.closest('.lab-newlayout-dockview .dv-sash')
      if (!sashHandle) {
        return
      }

      isSashDraggingRef.current = true
      if (typeof document !== 'undefined') {
        document.body.classList.add('lab-newlayout-resizing')
      }
    }

    const handlePointerEnd = () => {
      if (!isSashDraggingRef.current) {
        return
      }

      isSashDraggingRef.current = false
      if (typeof document !== 'undefined') {
        document.body.classList.remove('lab-newlayout-resizing')
      }

      if (apiRef.current) {
        layoutDirtyRef.current = true
        persistLayoutState(apiRef.current, { forceRemote: Boolean(authUidRef.current) })
      }
    }

    window.addEventListener('pointerdown', handlePointerDown, true)
    window.addEventListener('pointerup', handlePointerEnd, true)
    window.addEventListener('pointercancel', handlePointerEnd, true)

    return () => {
      window.removeEventListener('pointerdown', handlePointerDown, true)
      window.removeEventListener('pointerup', handlePointerEnd, true)
      window.removeEventListener('pointercancel', handlePointerEnd, true)
    }
  }, [])

  const handleReady = (event: DockviewReadyEvent) => {
    apiRef.current = event.api
    layoutChangeDisposableRef.current?.dispose()
    activePanelChangeDisposableRef.current?.dispose()

    if (!defaultLayoutStateRef.current) {
      buildDefaultDockviewLayout(event.api)
      defaultLayoutStateRef.current = createPersistedLayoutState(event.api.toJSON())
    }

    isApplyingLayoutRef.current = true
    if (initialLayoutState) {
      restoreDockviewLayout(event.api, initialLayoutState)
    } else {
      buildDefaultDockviewLayout(event.api)
    }
    applyPanelAccessState(event.api)
    isApplyingLayoutRef.current = false
    commitAppliedLayout(event.api)

    layoutChangeDisposableRef.current = event.api.onDidLayoutChange(() => {
      if (isApplyingLayoutRef.current) {
        return
      }

      if (isSashDraggingRef.current) {
        return
      }
      layoutDirtyRef.current = true
      persistLayoutState(event.api, { forceRemote: Boolean(authUidRef.current) })
    })

    activePanelChangeDisposableRef.current = event.api.onDidActivePanelChange((activePanel) => {
      if (isSashDraggingRef.current) {
        return
      }

      if (!activePanel) {
        return
      }

      if (activePanel.id === 'flow') {
        if (isFlowFocusModeRef.current) {
          return
        }

        isFlowFocusModeRef.current = true
        flowFocusClosedPanelIdsRef.current = closePanelsForFlowFocus(event.api)
        const flowPanel = event.api.panels.find((panel) => panel.id === 'flow')
        flowPanel?.api.setActive()
        return
      }

      if (!isFlowFocusModeRef.current) {
        return
      }

      const closedPanelIds = [...flowFocusClosedPanelIdsRef.current]
      const activePanelId = activePanel.id
      isFlowFocusModeRef.current = false
      flowFocusClosedPanelIdsRef.current = []
      restorePanelsAfterFlowFocus(event.api, closedPanelIds)
      event.api.panels.find((panel) => panel.id === activePanelId)?.api.setActive()
    })

    persistLayoutState(event.api, { forceRemote: Boolean(authUidRef.current) })
  }

  const defaultTabComponent = useMemo(() => {
    const adminOnlyPanelIdSet = new Set(adminOnlyPanelIds)
    const profileInitial = (authDisplayName || authEmail || 'U').trim().charAt(0).toUpperCase()

    return function LabNewLayoutDockviewTab(props: IDockviewPanelHeaderProps) {
      const dockviewTabProps = props as IDockviewPanelHeaderProps & {
        onPointerDown?: PointerEventHandler<HTMLDivElement>
        onPointerUp?: PointerEventHandler<HTMLDivElement>
        onPointerLeave?: PointerEventHandler<HTMLDivElement>
      }
      const isEdgeTab = FIXED_EDGE_PANEL_IDS.has(props.api.id)
      const isUserSettingsEdgeTab = props.api.id === 'left-3'
      const isAdminOnly = adminOnlyPanelIdSet.has(props.api.id)
      const canClosePanel = canCurrentUserCloseMainTabs && !FIXED_EDGE_PANEL_IDS.has(props.api.id)

      const stopPointerPropagation = (event: { preventDefault(): void; stopPropagation(): void }) => {
        event.preventDefault()
        event.stopPropagation()
      }

      if (isUserSettingsEdgeTab) {
        return (
          <div
            className="lab-newlayout-dockview-tab lab-newlayout-dockview-tab--edge-user-settings"
            onPointerDown={dockviewTabProps.onPointerDown}
            onPointerUp={dockviewTabProps.onPointerUp}
            onPointerLeave={dockviewTabProps.onPointerLeave}
            aria-label="User settings"
            title="User settings"
          >
            {authPhotoUrl ? (
              <img className="lab-newlayout-dockview-tab-avatar" src={authPhotoUrl} alt="" />
            ) : (
              <span className="lab-newlayout-dockview-tab-avatar lab-newlayout-dockview-tab-avatar--fallback" aria-hidden="true">
                {profileInitial}
              </span>
            )}
          </div>
        )
      }

      return (
        <div
          className={`lab-newlayout-dockview-tab${isEdgeTab ? ' lab-newlayout-dockview-tab--edge' : ''}${isAdminOnly ? ' is-admin-only' : ''}`}
          onPointerDown={dockviewTabProps.onPointerDown}
          onPointerUp={dockviewTabProps.onPointerUp}
          onPointerLeave={dockviewTabProps.onPointerLeave}
        >
          <span className="lab-newlayout-dockview-tab-title">{props.api.title}</span>
          {isAdminOnly ? (
            <span className="lab-newlayout-dockview-tab-lock" aria-hidden="true">
              <svg viewBox="0 0 16 16" focusable="false">
                <path d="M5.5 6V4.8a2.5 2.5 0 1 1 5 0V6h.7c.7 0 1.3.6 1.3 1.3v5.4c0 .7-.6 1.3-1.3 1.3H4.8c-.7 0-1.3-.6-1.3-1.3V7.3c0-.7.6-1.3 1.3-1.3h.7Zm1.2 0h2.6V4.8a1.3 1.3 0 1 0-2.6 0V6Z" />
              </svg>
            </span>
          ) : null}
          {canClosePanel ? (
            <button
              type="button"
              className="lab-newlayout-dockview-tab-close"
              aria-label={`Close ${props.api.title}`}
              onPointerDown={stopPointerPropagation}
              onClick={(event) => {
                stopPointerPropagation(event)
                props.api.close()
              }}
            >
              <svg viewBox="0 0 16 16" focusable="false">
                <path d="M4.3 4.3a.9.9 0 0 1 1.3 0L8 6.73l2.4-2.43a.9.9 0 0 1 1.3 1.25L9.28 8l2.43 2.4a.9.9 0 0 1-1.26 1.3L8 9.28l-2.4 2.43a.9.9 0 0 1-1.3-1.26L6.72 8 4.3 5.6a.9.9 0 0 1 0-1.3Z" />
              </svg>
            </button>
          ) : null}
        </div>
      )
    }
  }, [adminOnlyPanelIds, authDisplayName, authEmail, authPhotoUrl, canCurrentUserCloseMainTabs, handleOpenHistoryGallery, handleOpenStudioExplorer])

  const uiSettingsContextValue = useMemo(() => ({
    canApplyPreset: Boolean(selectedPresetId && apiRef.current),
    canManageTabClosing: isMasterAdminUser,
    canSavePreset: Boolean(presetDraftName.trim() && apiRef.current),
    canSaveAsDefault: isMasterAdminUser,
    canUpdatePreset: Boolean(selectedPresetId && apiRef.current),
    isTabClosingEnabled: projectTabPolicy.masterAdminCanCloseTabs,
    presetDraftName,
    presets: layoutPresets.map((preset) => ({ id: preset.id, name: preset.name })),
    selectedPresetId,
    onApplyPreset: handleApplyPreset,
    onPresetDraftNameChange: setPresetDraftName,
    onResetLayout: handleResetLayout,
    onSavePreset: handleSavePreset,
    onSaveAsDefault: handleSaveAsDefault,
    onSelectedPresetIdChange: setSelectedPresetId,
    onSetTabClosingEnabled: handleSetTabClosingEnabled,
    onUpdatePreset: handleUpdatePreset,
  }), [handleSaveAsDefault, isMasterAdminUser, layoutPresets, presetDraftName, projectTabPolicy.masterAdminCanCloseTabs, selectedPresetId])

  const dataContextValueWithActions = useMemo(() => ({
    ...dataContextValue,
    openStudioExplorer: handleOpenStudioExplorer,
    openHistoryGallery: handleOpenHistoryGallery,
  }), [dataContextValue, handleOpenHistoryGallery, handleOpenStudioExplorer])

  const getTabContextMenuItems = (params: GetTabContextMenuItemsParams) => {
    const items: (BuiltInContextMenuItem | ReactContextMenuItemConfig)[] = []

    if (canCurrentUserCloseMainTabs && !FIXED_EDGE_PANEL_IDS.has(params.panel.id)) {
      items.push('close', 'closeOthers', 'closeAll')
    }

    if (!isPrivilegedUser) {
      return items
    }

    const isAdminOnly = adminOnlyPanelIds.includes(params.panel.id)

    if (items.length > 0) {
      items.push('separator')
    }
    items.push({
      label: isAdminOnly ? 'Make Tab Visible To Everyone' : 'Mark Tab As Admin Only',
      action: () => handleToggleAdminOnlyTab(params.panel.id),
    })

    return items
  }

  return (
    <LabNewLayoutDataContext.Provider value={dataContextValueWithActions}>
      <LabNewLayoutUiSettingsContext.Provider value={uiSettingsContextValue}>
          <div className="lab-newlayout-page">
            <GlobalCompareOverlay />
            <GlobalAssetPreviewOverlay />
            <div className="lab-newlayout-frame">
              {isLayoutBootstrapComplete && isPrivilegeBootstrapComplete ? (
                <DockviewReact
                  components={dockviewComponents}
                  defaultTabComponent={defaultTabComponent}
                  getTabContextMenuItems={getTabContextMenuItems}
                  onReady={handleReady}
                  className="dockview-theme-abyss lab-newlayout-dockview"
                />
              ) : null}
            </div>
          </div>
        </LabNewLayoutUiSettingsContext.Provider>
    </LabNewLayoutDataContext.Provider>
  )
}

const readLikedReferenceUrls = (): Set<string> => {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(LIKED_REFERENCES_LOCAL_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return new Set(parsed.filter((value): value is string => typeof value === 'string' && value.trim().length > 0))
    }
  } catch {
    // ignore parse errors
  }
  return new Set()
}

const writeLikedReferenceUrls = (urls: Set<string>): void => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(LIKED_REFERENCES_LOCAL_KEY, JSON.stringify(Array.from(urls)))
  } catch {
    // ignore quota errors
  }
}

function useLikedReferenceUrls() {
  const [likedUrls, setLikedUrls] = useState<Set<string>>(() => readLikedReferenceUrls())

  const toggle = useCallback((url: string) => {
    const normalized = url.trim()
    if (!normalized) return
    setLikedUrls((current) => {
      const next = new Set(current)
      if (next.has(normalized)) {
        next.delete(normalized)
      } else {
        next.add(normalized)
      }
      writeLikedReferenceUrls(next)
      return next
    })
  }, [])

  const has = useCallback((url: string) => likedUrls.has(url.trim()), [likedUrls])

  return { likedUrls, has, toggle }
}
