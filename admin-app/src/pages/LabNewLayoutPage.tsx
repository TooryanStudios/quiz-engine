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
import { loadUserPrefs, saveUserPrefs } from '../lib/adminRepo'
import {
  loadProjectFlowCanvasState,
  moveProjectFlowCanvas,
  renameProjectFlowCanvas,
  saveProjectFlowCanvasState,
  saveProjectNewLayoutConfig,
  subscribeToProjectFlowCanvases,
  subscribeToProjectNewLayoutConfig,
  type StudioProjectFlowCanvasSummary,
} from '../lib/studioService'
import { LabNewLayoutComposerPanel } from './LabNewLayout/LabNewLayoutComposerPanel'
import { LabNewLayoutDirectApiPanel } from './LabNewLayout/LabNewLayoutDirectApiPanel'
import { LabNewLayoutExplorerEdgePanel } from './LabNewLayout/LabNewLayoutExplorerEdgePanel'
import { LabNewLayoutUiSettingsContext } from './LabNewLayout/LabNewLayoutUiSettingsContext'
import { LabNewLayoutUiSettingsEdgePanel } from './LabNewLayout/LabNewLayoutUiSettingsEdgePanel'
import { LabNewLayoutUserSettingsEdgePanel } from './LabNewLayout/LabNewLayoutUserSettingsEdgePanel'
import { useLabNewLayoutHistoryGallery, type LabNewLayoutGalleryHistoryEntry } from './LabNewLayout/useLabNewLayoutHistoryGallery'
import { useLabNewLayoutStore } from './LabNewLayout/useLabNewLayoutStore'
import { auth } from '../lib/firebase'
import { LabNewLayoutDataContext, useLabNewLayoutData, useLabNewLayoutWorkspace } from './LabNewLayout/useLabNewLayoutWorkspace'
import {
  WorkflowBuilderCanvas,
  createWorkflowBuilderSampleWorkflow,
  type WorkflowBuilderDefinition,
  type WorkflowBuilderNotice,
} from '../features/workflowBuilder'
import type { FolderSummary } from '../types/studio'
import { useToast } from '../lib/ToastContext'
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

type WorkspaceHomeInnerParams = {
  copy: string
}

const FLOW_ROOT_FOLDER_VALUE = '__root__'

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
  return <div className="lab-newlayout-placeholder-panel">{props.params.label ?? props.api.title}</div>
}

function WorkspaceHomeInnerPanel(props: IDockviewPanelProps<WorkspaceHomeInnerParams>) {
  // PERF TEST: content stubbed
  return <div className="lab-newlayout-placeholder-panel">{props.params.copy}</div>
}

const workspaceHomeInnerComponents = {
  workspaceHomeInner: WorkspaceHomeInnerPanel,
}

function WorkspaceHomePanel(props: IDockviewPanelProps<PanelSuggestionParams>) {
  const initializedRef = useRef(false)

  const handleReady = (event: DockviewReadyEvent) => {
    if (initializedRef.current) {
      return
    }

    initializedRef.current = true

    const tabOne = event.api.addPanel({
      id: `${props.api.id}-tab-1`,
      component: 'workspaceHomeInner',
      title: 'Tab 1',
      params: {
        copy: 'Workspace Home subdivision panel 1.',
      },
    })

    event.api.addPanel({
      id: `${props.api.id}-tab-2`,
      component: 'workspaceHomeInner',
      title: 'Tab 2',
      position: {
        referencePanel: tabOne,
        direction: 'below',
      },
      params: {
        copy: 'Workspace Home subdivision panel 2.',
      },
    })
  }

  return (
    <div className="lab-newlayout-panel lab-newlayout-panel--workspace-home">
      <DockviewReact
        components={workspaceHomeInnerComponents}
        onReady={handleReady}
        className="dockview-theme-abyss lab-newlayout-workspace-home-dockview"
      />
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

const GALLERY_PAGE_SIZE = 6

type GalleryCardProps = {
  entry: LabNewLayoutGalleryHistoryEntry
  onClick: () => void
}

function GalleryCard({ entry, onClick }: GalleryCardProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const [isHovered, setIsHovered] = useState(false)
  const [posterHidden, setPosterHidden] = useState(false)
  const mediaUrl = entry.resultUrl || Object.values(entry.mediaUrls)[0] || ''

  const hoverHandlers = {
    onMouseEnter: () => {
      setIsHovered(true)
      if (videoRef.current && mediaUrl) {
        videoRef.current.play().catch(() => { /* silent */ })
      }
    },
    onMouseLeave: () => {
      setIsHovered(false)
      if (videoRef.current) {
        videoRef.current.pause()
        videoRef.current.currentTime = 0
        setPosterHidden(false)
      }
    },
  }

  return (
    <div
      className={`lab-newlayout-history-gallery-card${mediaUrl ? ' is-clickable' : ''}`}
      {...hoverHandlers}
    >
      <div className="lab-newlayout-history-gallery-media">
        {entry.posterUrl ? (
          <img
            className={`lab-newlayout-history-gallery-poster${posterHidden ? ' is-hidden' : ''}`}
            src={entry.posterUrl}
            alt=""
          />
        ) : null}
        {mediaUrl ? (
          <video
            ref={videoRef}
            className="lab-newlayout-history-gallery-preview"
            src={mediaUrl}
            muted
            playsInline
            preload="metadata"
            onPlay={() => setPosterHidden(true)}
            onPause={() => setPosterHidden(false)}
          />
        ) : (
          <div className="lab-newlayout-history-gallery-preview" />
        )}
      </div>
      <div className="lab-newlayout-history-gallery-badges">
        <span className={`lab-newlayout-history-gallery-badge lab-newlayout-history-gallery-badge--${entry.status}`}>
          {entry.status}
        </span>
      </div>
      <div className={`lab-newlayout-history-gallery-hover-info${isHovered ? ' is-visible' : ''}`}>
        <div className="lab-newlayout-history-gallery-hover-copy">
          <strong>{entry.model || 'Unknown model'}</strong>
          <span>{entry.prompt.length > 80 ? `${entry.prompt.slice(0, 80)}…` : entry.prompt}</span>
        </div>
        <div className="lab-newlayout-history-gallery-hover-chips">
          {entry.ratio ? <span>{entry.ratio}</span> : null}
          {entry.duration != null ? <span>{entry.duration}s</span> : null}
          {entry.sourceLabel ? <span>{entry.sourceLabel}</span> : null}
        </div>
        {mediaUrl ? <div className="lab-newlayout-history-gallery-clickhint">Click to open</div> : null}
      </div>
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
  const { authUid } = useLabNewLayoutData()
  const { entries, isLoading, refresh } = useLabNewLayoutHistoryGallery({ authUid })
  const [page, setPage] = useState(1)
  const [selectedEntry, setSelectedEntry] = useState<LabNewLayoutGalleryHistoryEntry | null>(null)
  const totalPages = Math.max(1, Math.ceil(entries.length / GALLERY_PAGE_SIZE))
  const pageEntries = entries.slice((page - 1) * GALLERY_PAGE_SIZE, page * GALLERY_PAGE_SIZE)
  const title = props.params.label ?? props.api.title

  const handleClose = useCallback(() => setSelectedEntry(null), [])

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
          <button
            type="button"
            className="lab-newlayout-history-lightbox-close"
            onClick={handleClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="lab-newlayout-history-lightbox-body">
          {(selectedEntry.resultUrl || Object.values(selectedEntry.mediaUrls)[0]) ? (
            <div className="lab-newlayout-history-lightbox-media">
              <video
                className="lab-newlayout-history-lightbox-video"
                src={selectedEntry.resultUrl || Object.values(selectedEntry.mediaUrls)[0]}
                controls
                autoPlay
                playsInline
                muted
                poster={selectedEntry.posterUrl || undefined}
              />
            </div>
          ) : null}
          <div className="lab-newlayout-history-lightbox-meta">
            {selectedEntry.ratio ? (
              <div className="lab-newlayout-history-lightbox-meta-row">
                <span>Ratio</span>
                <strong>{selectedEntry.ratio}</strong>
              </div>
            ) : null}
            {selectedEntry.duration != null ? (
              <div className="lab-newlayout-history-lightbox-meta-row">
                <span>Duration</span>
                <strong>{selectedEntry.duration}s</strong>
              </div>
            ) : null}
            {selectedEntry.resolution ? (
              <div className="lab-newlayout-history-lightbox-meta-row">
                <span>Resolution</span>
                <strong>{selectedEntry.resolution}</strong>
              </div>
            ) : null}
            {selectedEntry.provider ? (
              <div className="lab-newlayout-history-lightbox-meta-row">
                <span>Provider</span>
                <strong>{selectedEntry.provider}</strong>
              </div>
            ) : null}
          </div>
          {selectedEntry.prompt ? (
            <div className="lab-newlayout-history-lightbox-prompt">{selectedEntry.prompt}</div>
          ) : null}
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
            {!isLoading ? <span className="lab-newlayout-history-toolbar-note">{entries.length} items</span> : null}
          </div>
          <div className="lab-newlayout-history-toolbar-actions">
            <button
              type="button"
              className="lab-newlayout-ui-settings-action"
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
      ) : (
        <>
          <div className="lab-newlayout-history-gallery-grid">
            {pageEntries.map((entry) => (
              <GalleryCard
                key={entry.id}
                entry={entry}
                onClick={() => setSelectedEntry(entry)}
              />
            ))}
          </div>
          {totalPages > 1 ? (
            <div className="lab-newlayout-history-pagination">
              <button
                type="button"
                className="lab-newlayout-ui-settings-action"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ←
              </button>
              <span className="lab-newlayout-history-pagination-copy">{page} / {totalPages}</span>
              <button
                type="button"
                className="lab-newlayout-ui-settings-action"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                →
              </button>
            </div>
          ) : null}
        </>
      )}
      {lightbox}
    </div>
  )
}

function ReferencesPanel(_props: IDockviewPanelProps<PanelSuggestionParams>) {
  const composerReferences = useLabNewLayoutStore((state) => state.composerReferences)
  const composerPreview = useLabNewLayoutStore((state) => state.currentComposerPreview)
  const storeImages = composerReferences.filter((reference) => reference.kind === 'image').map((reference) => reference.url)
  const storeVideos = composerReferences.filter((reference) => reference.kind === 'video').map((reference) => reference.url)

  const previewImages: string[] = (composerPreview && Array.isArray(composerPreview.reference_images))
    ? (composerPreview.reference_images as unknown[]).filter((url): url is string => typeof url === 'string' && url.length > 0)
    : []
  const previewVideos: string[] = (composerPreview && Array.isArray(composerPreview.reference_videos))
    ? (composerPreview.reference_videos as unknown[]).filter((url): url is string => typeof url === 'string' && url.length > 0)
    : []

  const referenceImages = storeImages.length > 0 ? storeImages : previewImages
  const referenceVideos = storeVideos.length > 0 ? storeVideos : previewVideos
  const allRefs = [...referenceImages, ...referenceVideos]

  return (
    <div className="lab-newlayout-panel lab-newlayout-panel--references">
      <div className="lab-newlayout-history-top-fixed">
        <div className="lab-newlayout-history-toolbar">
          <div className="lab-newlayout-history-toolbar-stats">
            <span className="lab-newlayout-history-stat">References</span>
            <span className="lab-newlayout-history-toolbar-note">{allRefs.length} active</span>
          </div>
        </div>
      </div>
      {allRefs.length === 0 ? (
        <div className="lab-newlayout-references-empty">
          No references staged. Add references in the Composer.
        </div>
      ) : (
        <div className="lab-newlayout-references-grid lab-newlayout-references-grid--active">
          {referenceImages.map((url, index) => (
            <img
              key={`img-${index}`}
              src={url}
              alt=""
              className="lab-newlayout-reference-thumb lab-newlayout-reference-thumb--image"
            />
          ))}
          {referenceVideos.map((url, index) => (
            <video
              key={`vid-${index}`}
              src={url}
              muted
              playsInline
              preload="metadata"
              className="lab-newlayout-reference-thumb lab-newlayout-reference-thumb--video"
            />
          ))}
        </div>
      )}
    </div>
  )
}

const dockviewComponents = {
  default: PlaceholderPanel,
  workspaceHome: WorkspaceHomePanel,
  watchlist: PlaceholderPanel,
  pricealert: PlaceholderPanel,
  research: StoryOverviewPanel,
  flow: FlowPanel,
  orderbook: LabNewLayoutComposerPanel,
  orders: HistoryGallerySuggestionPanel,
  vesselfinder: PlaceholderPanel,
  positionsummary: LabNewLayoutDirectApiPanel,
  references: ReferencesPanel,
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
    ensuredOrderbookPanel.api.group.model.header.hidden = true
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
    composerPanel.api.group.model.header.hidden = true
  }

  const leftEdge = api.getEdgeGroup('left')
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
      position: { referencePanel: positionSummary },
      params: getPanelSuggestion('references', 'References'),
    })
  }

  const workflowLibraryPanel = api.panels.find((panel) => panel.id === 'pricealert')
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

export default function LabNewLayoutPage() {
  const initialLocalLayoutRef = useRef<LabNewLayoutPersistedState | null>(readLocalPersistedLayoutState())
  const initialLocalPresetStoreRef = useRef<LabNewLayoutPresetStore>(readLocalPresetStore())
  const initialLegacyPanelAccessRef = useRef<LabNewLayoutProjectTabPolicyState>(readLegacyPanelAccessState())
  const defaultLayoutStateRef = useRef<LabNewLayoutPersistedState | null>(null)
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
  } = useLabNewLayoutWorkspace({
    uid: authUid,
    displayName: authDisplayName,
    email: authEmail,
    photoUrl: authPhotoUrl,
  })
  const apiRef = useRef<DockviewApi | null>(null)
  const authUidRef = useRef('')
  const layoutChangeDisposableRef = useRef<{ dispose: () => void } | null>(null)
  const activePanelChangeDisposableRef = useRef<{ dispose: () => void } | null>(null)
  const isFlowFocusModeRef = useRef(false)
  const flowFocusClosedPanelIdsRef = useRef<string[]>([])
  const layoutSaveTimerRef = useRef<number | null>(null)
  const isApplyingLayoutRef = useRef(false)
  const lastSavedLayoutJsonRef = useRef(initialLocalLayoutRef.current ? JSON.stringify(initialLocalLayoutRef.current.layout) : '')
  const lastSavedPresetStoreJsonRef = useRef(JSON.stringify(initialLocalPresetStoreRef.current))
  const normalizedMasterEmail = (MASTER_EMAIL || '').trim().toLowerCase()
  const normalizedAuthEmail = authEmail.trim().toLowerCase()
  const isMasterAdminUser = Boolean(import.meta.env.DEV || (normalizedMasterEmail.length > 0 && normalizedAuthEmail === normalizedMasterEmail))
  const isPrivilegedUser = isMasterAdminUser || hasAdminClaim
  const adminOnlyPanelIds = projectTabPolicy.adminOnlyPanelIds
  const canCurrentUserCloseMainTabs = isMasterAdminUser && projectTabPolicy.masterAdminCanCloseTabs

  const persistLayoutState = (api: DockviewApi, options?: { forceRemote?: boolean }) => {
    const currentLayout = api.toJSON()
    const currentLayoutJson = JSON.stringify(currentLayout)
    const hasLayoutChanged = currentLayoutJson !== lastSavedLayoutJsonRef.current

    if (!hasLayoutChanged && !options?.forceRemote) {
      return
    }

    const nextState = createPersistedLayoutState(currentLayout)

    if (hasLayoutChanged) {
      lastSavedLayoutJsonRef.current = currentLayoutJson
      writeLocalPersistedLayoutState(nextState)
    }

    if (!authUidRef.current) {
      return
    }

    if (layoutSaveTimerRef.current !== null) {
      window.clearTimeout(layoutSaveTimerRef.current)
    }

    const payload = JSON.stringify(nextState)
    layoutSaveTimerRef.current = window.setTimeout(() => {
      const currentUid = authUidRef.current
      if (!currentUid) {
        return
      }

      void saveUserPrefs(currentUid, {
        toorGenDockviewLayoutState: payload,
      })
    }, 450)
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
    void saveProjectNewLayoutConfig(studioProjectId, nextPolicy)
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
        .then((prefs) => {
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

    setProjectTabPolicy(fallbackPolicy)

    if (!studioProjectId) {
      return
    }

    const unsubscribe = subscribeToProjectNewLayoutConfig(studioProjectId, (remoteConfig) => {
      const nextPolicy = createProjectTabPolicyState(remoteConfig ?? fallbackPolicy)
      writeLocalProjectTabPolicyState(studioProjectId, nextPolicy)
      setProjectTabPolicy(nextPolicy)
    })

    return unsubscribe
  }, [studioProjectId])

  useEffect(() => {
    return () => {
      layoutChangeDisposableRef.current?.dispose()
      activePanelChangeDisposableRef.current?.dispose()
      if (layoutSaveTimerRef.current !== null) {
        window.clearTimeout(layoutSaveTimerRef.current)
      }
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

      persistLayoutState(event.api)
    })

    activePanelChangeDisposableRef.current = event.api.onDidActivePanelChange((activePanel) => {
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
      isFlowFocusModeRef.current = false
      flowFocusClosedPanelIdsRef.current = []
      restorePanelsAfterFlowFocus(event.api, closedPanelIds)
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
  }, [adminOnlyPanelIds, authDisplayName, authEmail, authPhotoUrl, canCurrentUserCloseMainTabs])

  const uiSettingsContextValue = useMemo(() => ({
    canApplyPreset: Boolean(selectedPresetId && apiRef.current),
    canManageTabClosing: isMasterAdminUser,
    canSavePreset: Boolean(presetDraftName.trim() && apiRef.current),
    canUpdatePreset: Boolean(selectedPresetId && apiRef.current),
    isTabClosingEnabled: projectTabPolicy.masterAdminCanCloseTabs,
    presetDraftName,
    presets: layoutPresets.map((preset) => ({ id: preset.id, name: preset.name })),
    selectedPresetId,
    onApplyPreset: handleApplyPreset,
    onPresetDraftNameChange: setPresetDraftName,
    onResetLayout: handleResetLayout,
    onSavePreset: handleSavePreset,
    onSelectedPresetIdChange: setSelectedPresetId,
    onSetTabClosingEnabled: handleSetTabClosingEnabled,
    onUpdatePreset: handleUpdatePreset,
  }), [isMasterAdminUser, layoutPresets, presetDraftName, projectTabPolicy.masterAdminCanCloseTabs, selectedPresetId])

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
    <LabNewLayoutDataContext.Provider value={dataContextValue}>
      <LabNewLayoutUiSettingsContext.Provider value={uiSettingsContextValue}>
          <div className="lab-newlayout-page">
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