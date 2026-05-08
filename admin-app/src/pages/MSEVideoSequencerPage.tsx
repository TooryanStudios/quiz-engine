import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent, type MouseEvent, type SyntheticEvent } from 'react'
import {
  BookMarked,
  FolderOpen,
  ListPlus,
  Maximize2,
  Minus,
  Pause,
  Play,
  RefreshCcw,
  Repeat,
  Repeat1,
  Save,
  Scissors,
  SkipBack,
  Trash2, Check,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import { collection, doc, getDocs, limit, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { DEFAULT_INIT_URL, DEFAULT_MIME_CODEC, MSEVideoSequencer, type MSEVideoSequencerHandle } from '../components/MSEVideoSequencer'
import './MSEVideoSequencerPage.css'

type ClipWindow = {
  startSec?: number
  endSec?: number
}

type SequencerConfig = {
  initUrl: string
  segmentUrls: string[]
  clipWindows?: ClipWindow[]
}

type SequencerVideoOption = {
  id: string
  label: string
  url: string
}

type MSEVideoSequencerPageProps = {
  generatedVideos?: SequencerVideoOption[]
  libraryVideos?: SequencerVideoOption[]
  isVisible?: boolean
}

type SharedTimelineItem = {
  id: string
  name: string
  initUrl: string
  segmentUrls: string[]
  clipWindows: ClipWindow[]
  ownerLabel: string
  updatedAtMs: number
}

type TimelineMarker = {
  id: string
  timeSec: number
  color: string
  label: string
}

const MARKER_COLORS = ['#f5a623', '#e74c3c', '#2ecc71', '#9b59b6', '#1abc9c', '#e67e22']

const TIMELINES_COLLECTION = 'toorgen_sequencer_timelines'
const LOCAL_STORAGE_KEY = 'mse-sequencer-state'

function parseSegmentLines(value: string) {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function normalizeClipWindows(segmentUrls: string[], trimMap: Record<number, ClipWindow>) {
  return segmentUrls.map((_, index) => {
    const data: Record<string, number> = {}
    if (trimMap[index]?.startSec !== undefined) data.startSec = trimMap[index].startSec
    if (trimMap[index]?.endSec !== undefined) data.endSec = trimMap[index].endSec
    return data
  })
}

function parseSharedTimeline(raw: unknown, id: string): SharedTimelineItem | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Record<string, unknown>
  const name = typeof value.name === 'string' ? value.name.trim() : ''
  const initUrl = typeof value.initUrl === 'string' ? value.initUrl.trim() : DEFAULT_INIT_URL
  const segmentUrls = Array.isArray(value.segmentUrls)
    ? value.segmentUrls.map((item) => String(item || '').trim()).filter(Boolean)
    : []
  const clipWindows = Array.isArray(value.clipWindows)
    ? value.clipWindows.map((entry) => {
      const windowValue = entry && typeof entry === 'object' ? entry as Record<string, unknown> : {}
      const startSec = typeof windowValue.startSec === 'number' && Number.isFinite(windowValue.startSec) && windowValue.startSec >= 0
        ? windowValue.startSec
        : undefined
      const endSec = typeof windowValue.endSec === 'number' && Number.isFinite(windowValue.endSec) && windowValue.endSec >= 0
        ? windowValue.endSec
        : undefined
      return { startSec, endSec }
    })
    : []
  const ownerLabel = typeof value.ownerLabel === 'string' && value.ownerLabel.trim()
    ? value.ownerLabel.trim()
    : 'Unknown'
  const updatedAtMs = typeof value.updatedAtMs === 'number' && Number.isFinite(value.updatedAtMs)
    ? value.updatedAtMs
    : 0

  if (!name) return null

  return {
    id,
    name,
    initUrl,
    segmentUrls,
    clipWindows,
    ownerLabel,
    updatedAtMs,
  }
}

function buildTrimMapFromWindows(windows: ClipWindow[]) {
  const trimMap: Record<number, ClipWindow> = {}
  windows.forEach((window, index) => {
    const startSec = typeof window?.startSec === 'number' && Number.isFinite(window.startSec) && window.startSec >= 0
      ? window.startSec
      : undefined
    const endSec = typeof window?.endSec === 'number' && Number.isFinite(window.endSec) && window.endSec >= 0
      ? window.endSec
      : undefined
    if (startSec !== undefined || endSec !== undefined) {
      trimMap[index] = { startSec, endSec }
    }
  })
  return trimMap
}

function formatTimestamp(ms: number) {
  if (!ms || !Number.isFinite(ms)) return 'Unknown time'
  return new Date(ms).toLocaleString()
}

function formatDuration(totalSeconds: number) {
  const normalized = Number.isFinite(totalSeconds) && totalSeconds > 0 ? totalSeconds : 0
  const mins = Math.floor(normalized / 60)
  const secs = Math.floor(normalized % 60)
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

function computeRulerTicks(totalSec: number): { pct: number; label: string; major: boolean }[] {
  if (totalSec <= 0) return []
  const candidates = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600]
  const majorInterval = candidates.find((s) => Math.floor(totalSec / s) <= 10) ?? 600
  const minorDivisions = majorInterval >= 60 ? 4 : 5
  const minorInterval = majorInterval / minorDivisions
  const ticks: { pct: number; label: string; major: boolean }[] = []
  const totalSteps = Math.ceil(totalSec / minorInterval)
  for (let step = 0; step <= totalSteps; step++) {
    const t = Math.round(step * minorInterval * 1000) / 1000
    if (t > totalSec + 0.001) break
    const isMajor = step % minorDivisions === 0
    ticks.push({ pct: Math.min(100, (t / totalSec) * 100), label: isMajor ? formatDuration(t) : '', major: isMajor })
  }
  return ticks
}

export function MSEVideoSequencerPage({
  generatedVideos = [],
  libraryVideos = [],
  isVisible = true,
}: MSEVideoSequencerPageProps) {
  const [segmentsInput, setSegmentsInput] = useState('')
  const [clipTrimByIndex, setClipTrimByIndex] = useState<Record<number, ClipWindow>>({})
  const [clipDurationByIndex, setClipDurationByIndex] = useState<Record<number, number>>({})
  const [appliedConfig, setAppliedConfig] = useState<SequencerConfig>({
    initUrl: DEFAULT_INIT_URL,
    segmentUrls: [],
    clipWindows: [],
  })
  const [saveStatus, setSaveStatus] = useState<string>('Timeline starts empty. Add clips with +.')
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [dropIndex, setDropIndex] = useState<number | null>(null)
  const [selectedClipIndex, setSelectedClipIndex] = useState<number | null>(null)
  const [showClipProperties, setShowClipProperties] = useState(false)

  const [sharedTimelines, setSharedTimelines] = useState<SharedTimelineItem[]>([])
  const [selectedTimelineId, setSelectedTimelineId] = useState<string>('')
  const [isSharedLoading, setIsSharedLoading] = useState<boolean>(false)
  const [isSharedSaving, setIsSharedSaving] = useState<boolean>(false)
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState<boolean>(false)
  const [isLoadDialogOpen, setIsLoadDialogOpen] = useState<boolean>(false)
  const [saveNameInput, setSaveNameInput] = useState('')
  const [isMasterPlaying, setIsMasterPlaying] = useState(false)
  const [loopMode, setLoopMode] = useState<'none' | 'all' | 'clip'>('all')
  const [detailsTab, setDetailsTab] = useState<'properties' | 'assets'>('properties')
  const [assetsTab, setAssetsTab] = useState<'generated' | 'library'>('generated')
  const [assetsVisibleCount, setAssetsVisibleCount] = useState(12)
  const [assetsPanelSelected, setAssetsPanelSelected] = useState<Set<string>>(new Set())
  const [assetHealthByUrl, setAssetHealthByUrl] = useState<Record<string, 'checking' | 'ok' | 'bad'>>({})
  const [timelineZoom, setTimelineZoom] = useState(1)
  const [crossfadeEnabled, setCrossfadeEnabled] = useState(true)
  const [markers, setMarkers] = useState<TimelineMarker[]>([])
  const [editingMarkerId, setEditingMarkerId] = useState<string | null>(null)
  const [editingMarkerLabel, setEditingMarkerLabel] = useState('')
  const [assetDropIndex, setAssetDropIndex] = useState<number | null>(null)
  const sequencerRef = useRef<MSEVideoSequencerHandle>(null)

  // Direct DOM refs for zero-setState playhead updates
  const playheadTimeRef = useRef(0)
  const playheadRafRef = useRef<number | null>(null)
  const playheadFillRef = useRef<HTMLDivElement>(null)
  const playheadNeedleRef = useRef<HTMLDivElement>(null)
  const playheadLabelRef = useRef<HTMLSpanElement>(null)
  // Stable style strings read by JSX on re-renders so React never snaps to 0%
  const playheadWidthRef = useRef('0%')
  const playheadLeftRef = useRef('0%')
  const playheadLabelTextRef = useRef(`${formatDuration(0)} / ${formatDuration(0)}`)
  // Refs for values needed inside non-reactive callbacks
  const totalDurationRef = useRef(0)
  const isMasterPlayingRef = useRef(false)
  const isScrubbingRef = useRef(false)
  const loopModeRef = useRef<'none' | 'all' | 'clip'>('all')
  const selectedClipIndexRef = useRef<number | null>(null)
  const loopClipRangeRef = useRef<{ start: number; end: number } | null>(null)
  const timelineIndicatorRef = useRef<HTMLDivElement>(null)
  const timelineBodyRef = useRef<HTMLDivElement>(null)
  const autoApplyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Persistence: load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (parsed.segmentsInput) setSegmentsInput(parsed.segmentsInput)
        if (parsed.clipTrimByIndex) setClipTrimByIndex(parsed.clipTrimByIndex)
        if (parsed.selectedTimelineId) setSelectedTimelineId(parsed.selectedTimelineId)
        if (parsed.selectedClipIndex !== undefined) setSelectedClipIndex(parsed.selectedClipIndex)
        if (parsed.showClipProperties) setShowClipProperties(parsed.showClipProperties)
      }
    } catch (error) {
      console.warn('Failed to load sequencer state from localStorage:', error)
    }
  }, [])

  // Persistence: save to localStorage on changes
  useEffect(() => {
    try {
      const state = {
        segmentsInput,
        clipTrimByIndex,
        selectedTimelineId,
        selectedClipIndex,
        showClipProperties,
      }
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state))
    } catch (error) {
      console.warn('Failed to save sequencer state to localStorage:', error)
    }
  }, [segmentsInput, clipTrimByIndex, selectedTimelineId, selectedClipIndex, showClipProperties])

  // Auto-apply timeline changes to the player with a short debounce
  useEffect(() => {
    if (autoApplyTimerRef.current) clearTimeout(autoApplyTimerRef.current)
    autoApplyTimerRef.current = setTimeout(() => {
      const nextSegments = parseSegmentLines(segmentsInput)
      setAppliedConfig({
        initUrl: DEFAULT_INIT_URL,
        segmentUrls: nextSegments,
        clipWindows: normalizeClipWindows(nextSegments, clipTrimByIndex),
      })
    }, 500)
    return () => {
      if (autoApplyTimerRef.current) clearTimeout(autoApplyTimerRef.current)
    }
  }, [segmentsInput, clipTrimByIndex])

  const parsedSegments = useMemo(
    () => parseSegmentLines(segmentsInput),
    [segmentsInput],
  )

  const sourceLabelByUrl = useMemo(() => {
    const map = new Map<string, string>()
    generatedVideos.forEach((item) => map.set(item.url.trim(), item.label))
    libraryVideos.forEach((item) => {
      if (!map.has(item.url.trim())) {
        map.set(item.url.trim(), item.label)
      }
    })
    return map
  }, [generatedVideos, libraryVideos])

  const timelineTotalDurationSec = useMemo(() => {
    return parsedSegments.reduce((acc, _, index) => {
      const duration = clipDurationByIndex[index]
      if (!Number.isFinite(duration) || duration <= 0) return acc
      const trim = clipTrimByIndex[index] || {}
      const start = typeof trim.startSec === 'number' && trim.startSec > 0 ? trim.startSec : 0
      const end = typeof trim.endSec === 'number' && trim.endSec > start ? Math.min(trim.endSec, duration) : duration
      return acc + Math.max(0, end - start)
    }, 0)
  }, [clipDurationByIndex, clipTrimByIndex, parsedSegments])

  // Keep refs in sync so RAF callbacks always read the latest values
  useEffect(() => { totalDurationRef.current = timelineTotalDurationSec }, [timelineTotalDurationSec])
  useEffect(() => { isMasterPlayingRef.current = isMasterPlaying }, [isMasterPlaying])
  useEffect(() => { loopModeRef.current = loopMode }, [loopMode])
  useEffect(() => { selectedClipIndexRef.current = selectedClipIndex }, [selectedClipIndex])

  // Compute the timeline-global time range for the selected clip (used by loop-clip mode)
  useEffect(() => {
    if (loopMode !== 'clip' || selectedClipIndex === null) {
      loopClipRangeRef.current = null
      return
    }
    let start = 0
    for (let i = 0; i < selectedClipIndex; i++) {
      const d = clipDurationByIndex[i]
      if (!Number.isFinite(d) || d <= 0) continue
      const tr = clipTrimByIndex[i] || {}
      const s = typeof tr.startSec === 'number' && tr.startSec > 0 ? tr.startSec : 0
      const e = typeof tr.endSec === 'number' && tr.endSec > s ? Math.min(tr.endSec, d) : d
      start += Math.max(0, e - s)
    }
    const d = clipDurationByIndex[selectedClipIndex]
    if (!Number.isFinite(d) || d <= 0) { loopClipRangeRef.current = null; return }
    const tr = clipTrimByIndex[selectedClipIndex] || {}
    const s = typeof tr.startSec === 'number' && tr.startSec > 0 ? tr.startSec : 0
    const e = typeof tr.endSec === 'number' && tr.endSec > s ? Math.min(tr.endSec, d) : d
    loopClipRangeRef.current = { start, end: start + Math.max(0, e - s) }
  }, [loopMode, selectedClipIndex, clipDurationByIndex, clipTrimByIndex])

  const clipDurationsArray = useMemo(
    () => parsedSegments.map((_, i) => clipDurationByIndex[i] || 0),
    [parsedSegments, clipDurationByIndex],
  )

  const rulerTicks = useMemo(() => computeRulerTicks(timelineTotalDurationSec), [timelineTotalDurationSec])

  const allAssetsForTab = assetsTab === 'generated' ? generatedVideos : libraryVideos
  const healthyAssetsForTab = useMemo(
    () => allAssetsForTab.filter((item) => assetHealthByUrl[item.url.trim()] !== 'bad'),
    [allAssetsForTab, assetHealthByUrl],
  )

  const validateAssetUrl = useCallback(async (url: string): Promise<boolean> => {
    const trimmed = url.trim()
    if (!trimmed) return false

    return new Promise<boolean>((resolve) => {
      const element = document.createElement('video')
      let done = false
      const finish = (ok: boolean) => {
        if (done) return
        done = true
        element.removeEventListener('loadedmetadata', onLoadedMetadata)
        element.removeEventListener('error', onError)
        element.removeAttribute('src')
        try { element.load() } catch { /* ignore */ }
        resolve(ok)
      }
      const onLoadedMetadata = () => finish(true)
      const onError = () => finish(false)

      element.preload = 'metadata'
      element.muted = true
      element.playsInline = true
      element.addEventListener('loadedmetadata', onLoadedMetadata, { once: true })
      element.addEventListener('error', onError, { once: true })
      element.src = trimmed
      element.load()
      window.setTimeout(() => finish(false), 8000)
    })
  }, [])

  useEffect(() => {
    let cancelled = false
    const visibleUrls = allAssetsForTab
      .slice(0, assetsVisibleCount)
      .map((item) => item.url.trim())
      .filter(Boolean)
    const queue = visibleUrls.filter((url) => !assetHealthByUrl[url])
    if (queue.length === 0) return

    void (async () => {
      for (const url of queue) {
        if (cancelled) return
        setAssetHealthByUrl((current) => ({ ...current, [url]: 'checking' }))
        const ok = await validateAssetUrl(url)
        if (cancelled) return
        setAssetHealthByUrl((current) => ({ ...current, [url]: ok ? 'ok' : 'bad' }))
      }
    })()

    return () => {
      cancelled = true
    }
  }, [allAssetsForTab, assetHealthByUrl, assetsVisibleCount, validateAssetUrl])

  useEffect(() => {
    setAppliedConfig({
      initUrl: DEFAULT_INIT_URL,
      segmentUrls: parsedSegments,
      clipWindows: normalizeClipWindows(parsedSegments, clipTrimByIndex),
    })
  }, [clipTrimByIndex, parsedSegments])

  useEffect(() => {
    if (selectedClipIndex === null) return
    if (selectedClipIndex >= parsedSegments.length) {
      setSelectedClipIndex(parsedSegments.length > 0 ? parsedSegments.length - 1 : null)
    }
  }, [parsedSegments.length, selectedClipIndex])

  const refreshSharedTimelines = async () => {
    setIsSharedLoading(true)
    try {
      const timelinesRef = collection(db, TIMELINES_COLLECTION)
      const timelinesQuery = query(timelinesRef, orderBy('updatedAtMs', 'desc'), limit(120))
      const snap = await getDocs(timelinesQuery)
      const parsed = snap.docs
        .map((item) => parseSharedTimeline(item.data(), item.id))
        .filter((item): item is SharedTimelineItem => Boolean(item))
      setSharedTimelines(parsed)
    } catch (error) {
      setSaveStatus(`Could not load shared timelines: ${String((error as Error).message || error)}`)
    } finally {
      setIsSharedLoading(false)
    }
  }

  useEffect(() => {
    void refreshSharedTimelines()
  }, [])

  const saveSharedTimeline = async () => {
    const name = saveNameInput.trim()
    if (!name) {
      setSaveStatus('Add a timeline name before saving.')
      return
    }
    if (parsedSegments.length === 0) {
      setSaveStatus('Timeline is empty. Add clips before saving.')
      return
    }

    const owner = auth.currentUser
    const ownerLabel = owner?.displayName || owner?.email || owner?.uid || 'Unknown'
    const now = Date.now()
    const timelineId = `timeline-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`

    setIsSharedSaving(true)
    try {
      await setDoc(doc(db, TIMELINES_COLLECTION, timelineId), {
        name,
        initUrl: DEFAULT_INIT_URL,
        segmentUrls: parsedSegments,
        clipWindows: normalizeClipWindows(parsedSegments, clipTrimByIndex),
        ownerUid: owner?.uid || '',
        ownerLabel,
        updatedAtMs: now,
        createdAtMs: now,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
      setSaveStatus(`Saved shared timeline: ${name}`)
      await refreshSharedTimelines()
      setSelectedTimelineId(timelineId)
      setIsSaveDialogOpen(false)
      setSaveNameInput('')
    } catch (error) {
      setSaveStatus(`Save failed: ${String((error as Error).message || error)}`)
    } finally {
      setIsSharedSaving(false)
    }
  }

  const loadSharedTimeline = (timeline: SharedTimelineItem) => {
    setSegmentsInput(timeline.segmentUrls.join('\n'))
    setClipTrimByIndex(buildTrimMapFromWindows(timeline.clipWindows))
    setClipDurationByIndex({})
    setSelectedTimelineId(timeline.id)
    setSelectedClipIndex(null)
    setShowClipProperties(false)
    setSaveStatus(`Loaded shared timeline: ${timeline.name}`)
    setIsLoadDialogOpen(false)
  }

  const clearStudioTimeline = () => {
    setSegmentsInput('')
    setClipTrimByIndex({})
    setClipDurationByIndex({})
    setSelectedTimelineId('')
    setSelectedClipIndex(null)
    setShowClipProperties(false)
    setSaveStatus('Timeline cleared. Add clips with +.')
  }

  const resetToTimelineDefaults = () => {
    setClipTrimByIndex({})
    setSaveStatus('Clip trim defaults restored.')
  }

  const addAllSegmentUrls = (urls: string[]) => {
    const cleaned = urls.map((url) => url.trim()).filter(Boolean)
    if (cleaned.length === 0) return

    setSegmentsInput((current) => {
      const existing = parseSegmentLines(current)
      const next = [...existing]
      cleaned.forEach((url) => {
        if (!next.includes(url)) {
          next.push(url)
        }
      })
      return next.join('\n')
    })

    setSaveStatus('Clips appended to timeline.')
  }

  const addUrlsAfterValidation = useCallback(async (urls: string[]) => {
    const cleaned = Array.from(new Set(urls.map((url) => url.trim()).filter(Boolean)))
    if (cleaned.length === 0) return

    const valid: string[] = []
    const invalid: string[] = []

    for (const url of cleaned) {
      const knownStatus = assetHealthByUrl[url]
      if (knownStatus === 'bad') {
        invalid.push(url)
        continue
      }
      if (knownStatus === 'ok') {
        valid.push(url)
        continue
      }
      setAssetHealthByUrl((current) => ({ ...current, [url]: 'checking' }))
      const ok = await validateAssetUrl(url)
      setAssetHealthByUrl((current) => ({ ...current, [url]: ok ? 'ok' : 'bad' }))
      if (ok) valid.push(url)
      else invalid.push(url)
    }

    if (valid.length > 0) {
      addAllSegmentUrls(valid)
    }

    if (invalid.length > 0 && valid.length > 0) {
      setSaveStatus(`Added ${valid.length} clip${valid.length !== 1 ? 's' : ''}. Skipped ${invalid.length} unavailable source${invalid.length !== 1 ? 's' : ''}.`)
      return
    }
    if (invalid.length > 0) {
      setSaveStatus(`No clips were added. ${invalid.length} selected source${invalid.length !== 1 ? 's are' : ' is'} unavailable.`)
    }
  }, [assetHealthByUrl, validateAssetUrl])

  const removeTimelineClip = (index: number) => {
    const next = parsedSegments.filter((_, itemIndex) => itemIndex !== index)
    setSegmentsInput(next.join('\n'))
    setSaveStatus(`Removed clip. Timeline now has ${next.length} item${next.length !== 1 ? 's' : ''}.`)
    setClipTrimByIndex((current) => {
      const nextMap: Record<number, ClipWindow> = {}
      Object.entries(current).forEach(([rawKey, value]) => {
        const key = Number(rawKey)
        if (!Number.isInteger(key) || key === index) return
        nextMap[key > index ? key - 1 : key] = value
      })
      return nextMap
    })
    setClipDurationByIndex((current) => {
      const nextMap: Record<number, number> = {}
      Object.entries(current).forEach(([rawKey, value]) => {
        const key = Number(rawKey)
        if (!Number.isInteger(key) || key === index) return
        nextMap[key > index ? key - 1 : key] = value
      })
      return nextMap
    })
    if (selectedClipIndex === index) {
      setSelectedClipIndex(null)
      setShowClipProperties(false)
    }
  }

  const moveTimelineClip = (fromIndex: number, toIndex: number) => {
    if (fromIndex === toIndex) return
    if (fromIndex < 0 || toIndex < 0) return
    if (fromIndex >= parsedSegments.length || toIndex >= parsedSegments.length) return

    const next = [...parsedSegments]
    const [moved] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moved)
    setSegmentsInput(next.join('\n'))

    setClipTrimByIndex((current) => {
      const ordered = Array.from({ length: parsedSegments.length }, (_, index) => current[index])
      const [movedTrim] = ordered.splice(fromIndex, 1)
      ordered.splice(toIndex, 0, movedTrim)
      const nextMap: Record<number, ClipWindow> = {}
      ordered.forEach((value, index) => {
        if (value && (value.startSec !== undefined || value.endSec !== undefined)) {
          nextMap[index] = value
        }
      })
      return nextMap
    })

    setClipDurationByIndex((current) => {
      const ordered = Array.from({ length: parsedSegments.length }, (_, index) => current[index])
      const [movedDuration] = ordered.splice(fromIndex, 1)
      ordered.splice(toIndex, 0, movedDuration)
      const nextMap: Record<number, number> = {}
      ordered.forEach((value, index) => {
        if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
          nextMap[index] = value
        }
      })
      return nextMap
    })

    if (selectedClipIndex === fromIndex) {
      setSelectedClipIndex(toIndex)
    }
  }

  const setClipTrim = (index: number, key: 'startSec' | 'endSec', rawValue: string) => {
    const numeric = Number(rawValue)
    if (!Number.isFinite(numeric) || numeric < 0) return

    const duration = clipDurationByIndex[index]

    setClipTrimByIndex((current) => {
      const currentValue = current[index] || {}
      const nextValue: ClipWindow = {
        ...currentValue,
        [key]: numeric,
      }

      if (typeof duration === 'number' && Number.isFinite(duration) && duration > 0) {
        if (nextValue.startSec !== undefined) {
          nextValue.startSec = Math.min(Math.max(nextValue.startSec, 0), duration)
        }
        if (nextValue.endSec !== undefined) {
          nextValue.endSec = Math.min(Math.max(nextValue.endSec, 0), duration)
          if (nextValue.endSec === duration) {
            nextValue.endSec = undefined
          }
        }
      }

      if (nextValue.startSec !== undefined && nextValue.endSec !== undefined && nextValue.endSec <= nextValue.startSec) {
        return current
      }

      const next = { ...current }
      if (nextValue.startSec === undefined && nextValue.endSec === undefined) {
        delete next[index]
      } else {
        next[index] = nextValue
      }
      return next
    })
  }

  const resetClipTrim = (index: number) => {
    setClipTrimByIndex((current) => {
      const next = { ...current }
      delete next[index]
      return next
    })
  }

  const handleTimelineThumbMetadata = (index: number, event: SyntheticEvent<HTMLVideoElement>) => {
    const duration = event.currentTarget.duration
    if (!Number.isFinite(duration) || duration <= 0) return
    setClipDurationByIndex((current) => ({
      ...current,
      [index]: duration,
    }))
  }

  const handleTimelineDragStart = (event: DragEvent<HTMLElement>, index: number) => {
    setDragIndex(index)
    setDropIndex(index)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(index))
  }

  const handleTimelineDragOver = (event: DragEvent<HTMLElement>, index: number) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDropIndex(index)
  }

  const handleTimelineDrop = (event: DragEvent<HTMLElement>, index: number) => {
    event.preventDefault()
    if (dragIndex !== null) {
      moveTimelineClip(dragIndex, index)
    }
    setDragIndex(null)
    setDropIndex(null)
  }

  const handleTimelineDragEnd = () => {
    setDragIndex(null)
    setDropIndex(null)
  }

  const handleThumbEnter = (event: MouseEvent<HTMLVideoElement>) => {
    void event.currentTarget.play().catch(() => {})
  }

  const handleThumbLeave = (event: MouseEvent<HTMLVideoElement>) => {
    const element = event.currentTarget
    element.pause()
    try {
      element.currentTime = 0
    } catch {
      // Ignore reset failures from remote streams.
    }
  }

  const selectedClipUrl = selectedClipIndex !== null ? parsedSegments[selectedClipIndex] : ''
  const selectedClipDuration = selectedClipIndex !== null ? clipDurationByIndex[selectedClipIndex] : undefined
  const selectedClipTrim = selectedClipIndex !== null ? (clipTrimByIndex[selectedClipIndex] || {}) : {}
  const selectedClipTimelineDuration = selectedClipIndex !== null
    ? Math.max(0, (selectedClipTrim.endSec ?? selectedClipDuration ?? 0) - (selectedClipTrim.startSec ?? 0))
    : 0

  const handleMasterPlay = () => {
    if (parsedSegments.length === 0) {
      setSaveStatus('Timeline is empty. Add clips before playing.')
      return
    }
    if (isMasterPlaying) {
      sequencerRef.current?.pause()
      setIsMasterPlaying(false)
    } else {
      void sequencerRef.current?.play().then(() => setIsMasterPlaying(true)).catch(() => {})
    }
  }

  /** Directly update fill/needle/label DOM without going through React state. */
  const applyPlayheadDOM = (time: number) => {
    const total = totalDurationRef.current
    const pct = total > 0 ? Math.min(100, (time / total) * 100) : 0
    const pctStr = `${pct}%`
    const labelText = `${formatDuration(time)} / ${formatDuration(total)}`
    playheadWidthRef.current = pctStr
    playheadLeftRef.current = pctStr
    playheadLabelTextRef.current = labelText
    if (playheadFillRef.current) playheadFillRef.current.style.width = pctStr
    if (playheadNeedleRef.current) playheadNeedleRef.current.style.left = pctStr
    if (playheadLabelRef.current) playheadLabelRef.current.textContent = labelText
    if (timelineIndicatorRef.current) timelineIndicatorRef.current.style.left = pctStr
  }

  const handleMasterRewind = () => {
    void sequencerRef.current?.restartFromBeginning()
    playheadTimeRef.current = 0
    applyPlayheadDOM(0)
    setIsMasterPlaying(false)
  }

  const cycleLoopMode = () => {
    setLoopMode((current) => current === 'none' ? 'all' : current === 'all' ? 'clip' : 'none')
  }

  const handleSequencerTimeUpdate = (globalCurrentTime: number, _totalDuration: number) => {
    if (isScrubbingRef.current) return
    playheadTimeRef.current = globalCurrentTime
    // Loop-clip: seek back to clip start when playback reaches its end
    const loopRange = loopClipRangeRef.current
    if (loopRange !== null && loopModeRef.current === 'clip' && globalCurrentTime >= loopRange.end - 0.08) {
      void sequencerRef.current?.seekTo(loopRange.start)
      playheadTimeRef.current = loopRange.start
    }
    if (playheadRafRef.current !== null) return
    playheadRafRef.current = requestAnimationFrame(() => {
      playheadRafRef.current = null
      applyPlayheadDOM(playheadTimeRef.current)
      if (!isMasterPlayingRef.current) {
        isMasterPlayingRef.current = true
        setIsMasterPlaying(true)
      }
    })
  }

  useEffect(() => {
    if (!isVisible) {
      sequencerRef.current?.pause()
      setIsMasterPlaying(false)
    }
  }, [isVisible])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && isMasterPlayingRef.current) {
        sequencerRef.current?.pause()
        setIsMasterPlaying(false)
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])

  // Cancel any pending RAF on unmount
  useEffect(() => {
    return () => {
      if (playheadRafRef.current !== null) cancelAnimationFrame(playheadRafRef.current)
    }
  }, [])

  // ── Timeline indicator drag (directly on the body) ──
  const handleIndicatorMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    if (!timelineBodyRef.current || totalDurationRef.current <= 0) return
    isScrubbingRef.current = true
    const rect = timelineBodyRef.current.getBoundingClientRect()
    const computeTime = (clientX: number) => {
      const pct = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width))
      return pct * totalDurationRef.current
    }
    let t = computeTime(event.clientX)
    applyPlayheadDOM(t)
    const onMove = (e: globalThis.MouseEvent) => { t = computeTime(e.clientX); applyPlayheadDOM(t) }
    const onUp = () => {
      playheadTimeRef.current = t
      applyPlayheadDOM(t)
      isScrubbingRef.current = false
      void sequencerRef.current?.seekTo(t)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // Also allow clicking directly on the ruler/track to seek
  const handleTimelineBodyMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    // Only fire if the click was NOT on a clip article or marker (those handle their own events)
    const target = event.target as HTMLElement
    if (target.closest('.mse-timeline-clip') || target.closest('.mse-marker-pin') || target.closest('.mse-marker-label-input')) return
    handleIndicatorMouseDown(event)
  }

  // ── Zoom ──
  const zoomIn = () => setTimelineZoom((z) => Math.min(8, parseFloat((z * 1.5).toFixed(2))))
  const zoomOut = () => setTimelineZoom((z) => Math.max(1, parseFloat((z / 1.5).toFixed(2))))
  const zoomFit = () => setTimelineZoom(1)

  // ── Markers ──
  const markerColorIndex = useRef(0)
  const addMarker = () => {
    const timeSec = playheadTimeRef.current
    const color = MARKER_COLORS[markerColorIndex.current % MARKER_COLORS.length]
    markerColorIndex.current += 1
    const id = `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`
    setMarkers((prev) => [...prev, { id, timeSec, color, label: '' }].sort((a, b) => a.timeSec - b.timeSec))
  }

  const removeMarker = (id: string) => setMarkers((prev) => prev.filter((m) => m.id !== id))

  const startEditMarker = (id: string, currentLabel: string) => {
    setEditingMarkerId(id)
    setEditingMarkerLabel(currentLabel)
  }

  const commitEditMarker = () => {
    if (editingMarkerId) {
      setMarkers((prev) => prev.map((m) => m.id === editingMarkerId ? { ...m, label: editingMarkerLabel } : m))
    }
    setEditingMarkerId(null)
    setEditingMarkerLabel('')
  }

  const seekToMarker = (timeSec: number) => {
    void sequencerRef.current?.seekTo(timeSec)
    playheadTimeRef.current = timeSec
    applyPlayheadDOM(timeSec)
  }

  // ── Asset drag to timeline ──
  const handleAssetDragStart = (event: React.DragEvent<HTMLElement>, url: string) => {
    event.dataTransfer.effectAllowed = 'copy'
    event.dataTransfer.setData('application/mse-asset-url', url)
  }

  const handleAssetDragEnd = () => {
    setAssetDropIndex(null)
  }

  const handleTrackAssetDragOver = (event: DragEvent<HTMLElement>, index: number) => {
    if (!event.dataTransfer.types.includes('application/mse-asset-url')) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
    setAssetDropIndex(index)
  }

  const handleTrackAssetDrop = async (event: DragEvent<HTMLElement>, index: number) => {
    event.preventDefault()
    const url = event.dataTransfer.getData('application/mse-asset-url')
    if (!url) return
    const normalized = url.trim()
    if (!normalized) return

    const knownStatus = assetHealthByUrl[normalized]
    let isValid = knownStatus === 'ok'
    if (knownStatus !== 'ok') {
      setAssetHealthByUrl((current) => ({ ...current, [normalized]: 'checking' }))
      isValid = await validateAssetUrl(normalized)
      setAssetHealthByUrl((current) => ({ ...current, [normalized]: isValid ? 'ok' : 'bad' }))
    }

    if (!isValid) {
      setSaveStatus('Dropped clip is unavailable and was not added.')
      setAssetDropIndex(null)
      return
    }

    setAssetDropIndex(null)
    // Insert at the drop position
    const next = [...parsedSegments]
    next.splice(index, 0, normalized)
    setSegmentsInput(next.join('\n'))
    // Shift trim/duration maps
    setClipTrimByIndex((current) => {
      const nextMap: Record<number, ClipWindow> = {}
      Object.entries(current).forEach(([k, v]) => {
        const key = Number(k)
        nextMap[key >= index ? key + 1 : key] = v
      })
      return nextMap
    })
    setClipDurationByIndex((current) => {
      const nextMap: Record<number, number> = {}
      Object.entries(current).forEach(([k, v]) => {
        const key = Number(k)
        nextMap[key >= index ? key + 1 : key] = v
      })
      return nextMap
    })
  }

  // Handle drop at the end of the track (empty area)
  const handleTrackEndAssetDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const url = event.dataTransfer.getData('application/mse-asset-url')
    if (!url) return
    setAssetDropIndex(null)
    void addUrlsAfterValidation([url])
  }

  const handleTrackEndAssetDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!event.dataTransfer.types.includes('application/mse-asset-url')) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }

  return (
    <section className="mse-sequencer-page mse-studio-shell">
      <div className="mse-monitor-shell">
        <div className="mse-monitor-layout">

          {/* ── Details / Assets side pane ── */}
          <aside className="mse-details-pane" aria-label="Side panel">
            <nav className="mse-details-tabs">
              <button
                type="button"
                className={`mse-tab-btn${detailsTab === 'properties' ? ' is-active' : ''}`}
                onClick={() => setDetailsTab('properties')}
              >
                Details
              </button>
              <button
                type="button"
                className={`mse-tab-btn${detailsTab === 'assets' ? ' is-active' : ''}`}
                onClick={() => setDetailsTab('assets')}
              >
                Assets
              </button>
            </nav>

            {detailsTab === 'properties' ? (
              <>
                <div className="mse-details-head">
                  {selectedClipIndex !== null ? <span>Clip {selectedClipIndex + 1}</span> : <span>No clip selected</span>}
                </div>
                {selectedClipIndex !== null && selectedClipUrl ? (
                  <div className="mse-properties-panel mse-properties-panel--inline">
                    <p className="mse-properties-name" title={selectedClipUrl}>{sourceLabelByUrl.get(selectedClipUrl) || `Clip ${selectedClipIndex + 1}`}</p>
                    <div className="mse-properties-values">
                      <span>Duration {formatDuration(selectedClipTimelineDuration)}</span>
                      <span>In timeline {timelineTotalDurationSec > 0 ? `${((selectedClipTimelineDuration / timelineTotalDurationSec) * 100).toFixed(1)}%` : '0%'}</span>
                    </div>
                    <div className="mse-properties-controls">
                      <label>
                        In
                        <input
                          type="range"
                          min="0"
                          max={selectedClipDuration ? String(Math.max(0, (selectedClipTrim.endSec ?? selectedClipDuration) - 0.1)) : '0'}
                          step="0.1"
                          value={selectedClipDuration ? String(selectedClipTrim.startSec ?? 0) : '0'}
                          onChange={(event) => setClipTrim(selectedClipIndex, 'startSec', event.target.value)}
                          disabled={!selectedClipDuration}
                        />
                      </label>
                      <label>
                        Out
                        <input
                          type="range"
                          min={selectedClipDuration ? String(Math.min(selectedClipDuration, (selectedClipTrim.startSec ?? 0) + 0.1)) : '0'}
                          max={selectedClipDuration ? String(selectedClipDuration) : '0'}
                          step="0.1"
                          value={selectedClipDuration ? String(selectedClipTrim.endSec ?? selectedClipDuration) : '0'}
                          onChange={(event) => setClipTrim(selectedClipIndex, 'endSec', event.target.value)}
                          disabled={!selectedClipDuration}
                        />
                      </label>
                    </div>
                    <div className="mse-properties-values">
                      <span>In {(selectedClipTrim.startSec ?? 0).toFixed(1)}s</span>
                      <span>Out {((selectedClipTrim.endSec ?? selectedClipDuration ?? 0)).toFixed(1)}s</span>
                    </div>
                    <div className="mse-properties-actions">
                      <button type="button" className="mse-action-btn is-small is-ghost" onClick={() => resetClipTrim(selectedClipIndex)}>
                        Reset Trim
                      </button>
                      <button type="button" className="mse-action-btn is-small" onClick={() => removeTimelineClip(selectedClipIndex)}>
                        Remove Clip
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mse-source-empty">Click a clip in the timeline to edit.</p>
                )}
              </>
            ) : (
              /* ── Assets browser tab ── */
              <div className="mse-assets-panel">
                <div className="mse-assets-tabs">
                  <button
                    type="button"
                    className={`mse-action-btn is-small${assetsTab === 'generated' ? ' is-active' : ''}`}
                    onClick={() => { setAssetsTab('generated'); setAssetsVisibleCount(12) }}
                  >
                    Generated ({generatedVideos.length})
                  </button>
                  <button
                    type="button"
                    className={`mse-action-btn is-small${assetsTab === 'library' ? ' is-active' : ''}`}
                    onClick={() => { setAssetsTab('library'); setAssetsVisibleCount(12) }}
                  >
                    Library ({libraryVideos.length})
                  </button>
                </div>
                <div className="mse-assets-grid" role="list">
                  {healthyAssetsForTab.slice(0, assetsVisibleCount).map((item) => {
                    const isSelected = assetsPanelSelected.has(item.url)
                    return (
                      <article
                        key={item.id}
                        role="listitem"
                        className={`mse-thumb-card${isSelected ? ' is-selected' : ''}`}
                        draggable
                        onDragStart={(e) => handleAssetDragStart(e, item.url)}
                        onDragEnd={handleAssetDragEnd}
                        onClick={() => {
                          setAssetsPanelSelected((prev) => {
                            const next = new Set(prev)
                            if (next.has(item.url)) next.delete(item.url)
                            else next.add(item.url)
                            return next
                          })
                        }}
                      >
                        <div className="mse-thumb-check">{isSelected && <Check size={12} />}</div>
                        <video
                          className="mse-thumb-video"
                          src={item.url}
                          muted
                          playsInline
                          preload="metadata"
                          onMouseEnter={handleThumbEnter}
                          onMouseLeave={handleThumbLeave}
                        />
                        <div className="mse-thumb-foot">
                          <span className="mse-source-label" title={item.url}>{item.label}</span>
                        </div>
                      </article>
                    )
                  })}
                  {healthyAssetsForTab.length === 0 && (
                    <p className="mse-source-empty">No clips available.</p>
                  )}
                </div>
                {assetsVisibleCount < healthyAssetsForTab.length && (
                  <button
                    type="button"
                    className="mse-action-btn is-small"
                    onClick={() => setAssetsVisibleCount((c) => c + 12)}
                  >
                    Load More ({healthyAssetsForTab.length - assetsVisibleCount} more)
                  </button>
                )}
                {assetsPanelSelected.size > 0 && (
                  <button
                    type="button"
                    className="mse-action-btn"
                    onClick={() => {
                      void addUrlsAfterValidation([...assetsPanelSelected])
                      setAssetsPanelSelected(new Set())
                    }}
                  >
                    Add {assetsPanelSelected.size} to Timeline
                  </button>
                )}
              </div>
            )}
          </aside>

          {/* ── Video player ── */}
          <div className="mse-player-pane">
            <MSEVideoSequencer
              ref={sequencerRef}
              initUrl={appliedConfig.initUrl}
              segmentUrls={appliedConfig.segmentUrls}
              clipWindows={appliedConfig.clipWindows}
              clipDurations={clipDurationsArray}
              mimeCodec={DEFAULT_MIME_CODEC}
              autoPlay={false}
              loop={loopMode === 'all'}
              crossfadeEnabled={crossfadeEnabled}
              onTimeUpdate={handleSequencerTimeUpdate}
            />
          </div>
        </div>
      </div>

      {/* ── Timeline shell ── */}
      <div className="mse-timeline-shell">

        {/* 3-zone transport toolbar */}
        <div className="mse-timeline-toolbar">
          <div className="mse-toolbar-left">
            <span className="mse-clip-count">{parsedSegments.length} clips</span>
            <span className="mse-total-dur">Total {formatDuration(timelineTotalDurationSec)}</span>
          </div>

          <div className="mse-transport-center">
            <button type="button" className="mse-icon-btn" title="Rewind to start" onClick={handleMasterRewind}>
              <SkipBack size={16} />
            </button>
            <button
              type="button"
              className={`mse-icon-btn mse-play-btn${isMasterPlaying ? ' is-playing' : ''}`}
              title={isMasterPlaying ? 'Pause' : 'Play'}
              onClick={handleMasterPlay}
            >
              {isMasterPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <span ref={playheadLabelRef} className="mse-playhead-time">{playheadLabelTextRef.current}</span>
            <button
              type="button"
              className={`mse-icon-btn${loopMode !== 'none' ? ' is-loop-active' : ''}`}
              title={loopMode === 'none' ? 'Loop: Off' : loopMode === 'all' ? 'Loop: All Clips' : `Loop: Clip${selectedClipIndex !== null ? ` ${selectedClipIndex + 1}` : ' (select one)'}`}
              onClick={cycleLoopMode}
            >
              {loopMode === 'clip' ? <Repeat1 size={15} /> : <Repeat size={15} />}
            </button>
          </div>

          <div className="mse-toolbar-right">
            <button
              type="button"
              className={`mse-icon-btn${crossfadeEnabled ? ' is-crossfade-active' : ''}`}
              title={crossfadeEnabled ? 'Crossfade: On (click to switch to hard cut)' : 'Crossfade: Off — Hard Cut (click to enable)'}
              onClick={() => setCrossfadeEnabled((v) => !v)}
            >
              <Scissors size={15} />
            </button>
            <button type="button" className="mse-icon-btn" title="Add marker at playhead" onClick={addMarker}>
              <BookMarked size={15} />
            </button>
            <button type="button" className="mse-icon-btn" title="Zoom in" onClick={zoomIn} disabled={timelineZoom >= 8}>
              <ZoomIn size={15} />
            </button>
            <button type="button" className="mse-icon-btn" title="Zoom out" onClick={zoomOut} disabled={timelineZoom <= 1}>
              <ZoomOut size={15} />
            </button>
            <button type="button" className="mse-icon-btn" title="Fit timeline" onClick={zoomFit} disabled={timelineZoom === 1}>
              <Maximize2 size={15} />
            </button>
            <button type="button" className="mse-icon-btn" title="Open Assets" onClick={() => setDetailsTab('assets')}>
              <ListPlus size={16} />
            </button>
            <button type="button" className="mse-icon-btn" title="Save timeline" onClick={() => setIsSaveDialogOpen(true)}>
              <Save size={16} />
            </button>
            <button type="button" className="mse-icon-btn" title="Load saved timeline" onClick={() => setIsLoadDialogOpen(true)}>
              <FolderOpen size={16} />
            </button>
            <button type="button" className="mse-icon-btn" title="Reset trim defaults" onClick={resetToTimelineDefaults}>
              <RefreshCcw size={16} />
            </button>
            <button type="button" className="mse-icon-btn" title="Clear timeline" onClick={clearStudioTimeline}>
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Scrollable ruler + clips + playhead indicator */}
        <div className="mse-timeline-scroll">
          <div
            ref={timelineBodyRef}
            className="mse-timeline-body"
            style={{ width: timelineZoom > 1 ? `${timelineZoom * 100}%` : undefined }}
            onMouseDown={handleTimelineBodyMouseDown}
            onClick={(event) => {
              const target = event.target as HTMLElement
              if (!target.closest('.mse-timeline-clip') && !target.closest('.mse-marker-pin')) {
                setSelectedClipIndex(null)
                setShowClipProperties(false)
              }
            }}
          >
            {timelineTotalDurationSec > 0 && (
              <div className="mse-timeline-ruler" aria-hidden="true">
                {rulerTicks.map((tick) => (
                  <div
                    key={tick.pct}
                    className={`mse-ruler-tick${tick.major ? ' is-major' : ''}`}
                    style={{ left: `${tick.pct}%` }}
                  >
                    {tick.label && <span className="mse-ruler-label">{tick.label}</span>}
                  </div>
                ))}
              </div>
            )}

            {/* Markers row */}
            {markers.length > 0 && timelineTotalDurationSec > 0 && (
              <div className="mse-marker-row" aria-label="Timeline markers">
                {markers.map((marker) => {
                  const pct = Math.min(100, (marker.timeSec / timelineTotalDurationSec) * 100)
                  return (
                    <div
                      key={marker.id}
                      className="mse-marker-pin"
                      style={{ left: `${pct}%`, '--marker-color': marker.color } as React.CSSProperties}
                      title={marker.label || formatDuration(marker.timeSec)}
                      onClick={(e) => { e.stopPropagation(); seekToMarker(marker.timeSec) }}
                      onDoubleClick={(e) => { e.stopPropagation(); startEditMarker(marker.id, marker.label) }}
                    >
                      <div className="mse-marker-head" />
                      {editingMarkerId === marker.id ? (
                        <input
                          autoFocus
                          className="mse-marker-label-input"
                          value={editingMarkerLabel}
                          placeholder="Marker name"
                          title="Marker label"
                          aria-label="Marker label"
                          onChange={(e) => setEditingMarkerLabel(e.target.value)}
                          onBlur={commitEditMarker}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === 'Escape') commitEditMarker() }}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        marker.label && <span className="mse-marker-label">{marker.label}</span>
                      )}
                      <button
                        type="button"
                        className="mse-marker-remove"
                        title="Remove marker"
                        onClick={(e) => { e.stopPropagation(); removeMarker(marker.id) }}
                      >
                        <Minus size={8} />
                      </button>
                    </div>
                  )
                })}
              </div>
            )}

            <div
              className="mse-timeline-track"
              role="list"
              aria-label="Timeline clips"
              onDragOver={handleTrackEndAssetDragOver}
              onDrop={handleTrackEndAssetDrop}
            >
              {parsedSegments.length === 0 ? (
                <p className="mse-source-empty">Timeline is empty. Open Assets tab to add clips.</p>
              ) : parsedSegments.map((url, index) => {
                const duration = clipDurationByIndex[index]
                const trim = clipTrimByIndex[index] || {}
                const startValue = trim.startSec ?? 0
                const effectiveEnd = trim.endSec ?? duration ?? 0
                const startPct = duration && duration > 0 ? Math.min(100, Math.max(0, (startValue / duration) * 100)) : 0
                const endPct = duration && duration > 0 ? Math.min(100, Math.max(startPct, (effectiveEnd / duration) * 100)) : 100
                const windowWidth = Math.max(0, endPct - startPct)
                const clipTimelineDuration = Math.max(0, effectiveEnd - startValue)
                const clipWidthPct = timelineTotalDurationSec > 0
                  ? Math.max(7, (clipTimelineDuration / timelineTotalDurationSec) * 100)
                  : 100 / Math.max(parsedSegments.length, 1)

                return (
                  <article
                    key={`clip-${index}`}
                    role="listitem"
                    className={`mse-timeline-clip${dragIndex === index ? ' is-dragging' : ''}${dropIndex === index ? ' is-drop-target' : ''}${selectedClipIndex === index ? ' is-selected' : ''}${assetDropIndex === index ? ' is-asset-drop' : ''}`}
                    style={{ width: `${clipWidthPct}%`, minWidth: `${Math.max(84, clipWidthPct * 1.2)}px` }}
                    draggable
                    onDragStart={(event) => handleTimelineDragStart(event, index)}
                    onDragOver={(event) => {
                      // Let clip reorder take priority; only do asset-drop if an asset is being dragged
                      if (event.dataTransfer.types.includes('application/mse-asset-url')) {
                        handleTrackAssetDragOver(event, index)
                      } else {
                        handleTimelineDragOver(event, index)
                      }
                    }}
                    onDrop={(event) => {
                      if (event.dataTransfer.types.includes('application/mse-asset-url')) {
                        handleTrackAssetDrop(event, index)
                      } else {
                        handleTimelineDrop(event, index)
                      }
                    }}
                    onDragEnd={() => { handleTimelineDragEnd(); setAssetDropIndex(null) }}
                    onDragLeave={() => setAssetDropIndex(null)}
                    onClick={() => {
                      setSelectedClipIndex(index)
                      setShowClipProperties(true)
                    }}
                  >
                    <div className="mse-timeline-thumb-wrap">
                      <video
                        className="mse-timeline-thumb"
                        src={url}
                        muted
                        playsInline
                        preload="metadata"
                        onLoadedMetadata={(event) => handleTimelineThumbMetadata(index, event)}
                      />
                      <span className="mse-timeline-index">{index + 1}</span>
                      <div className="mse-trim-overlay" aria-hidden="true">
                        <svg className="mse-trim-svg" viewBox="0 0 100 20" preserveAspectRatio="none">
                          <rect className="mse-trim-window" x={startPct} y={9} width={windowWidth} height={7} rx={1} />
                          <rect className="mse-trim-handle" x={Math.max(0, startPct - 0.9)} y={3} width={1.8} height={14} rx={0.6} />
                          <rect className="mse-trim-handle" x={Math.max(0, endPct - 0.9)} y={3} width={1.8} height={14} rx={0.6} />
                        </svg>
                      </div>
                    </div>
                  </article>
                )
              })}
            </div>

            {/* Playhead indicator line spanning ruler + clips + marker row */}
            <div
              ref={timelineIndicatorRef}
              className="mse-timeline-indicator"
              aria-hidden="true"
              style={{ left: playheadLeftRef.current }}
              onMouseDown={handleIndicatorMouseDown}
            />
          </div>
        </div>

        <div className="mse-status-line">{saveStatus}</div>
      </div>

      {/* Save dialog */}
      {isSaveDialogOpen && (
        <div className="mse-dialog-backdrop" role="dialog" aria-modal="true" aria-label="Save timeline">
          <div className="mse-dialog mse-dialog-compact" onClick={(event) => event.stopPropagation()}>
            <div className="mse-dialog-head">
              <strong>Save Timeline</strong>
              <button type="button" className="mse-icon-btn" title="Close" aria-label="Close save timeline" onClick={() => setIsSaveDialogOpen(false)}>
                <X size={16} />
              </button>
            </div>
            <label className="mse-config-field" htmlFor="mse-save-name">Timeline Name</label>
            <input
              id="mse-save-name"
              className="mse-config-input"
              value={saveNameInput}
              onChange={(event) => setSaveNameInput(event.target.value)}
              placeholder="Episode 04 Scene 02"
            />
            <div className="mse-config-actions">
              <button type="button" className="mse-action-btn" onClick={() => void saveSharedTimeline()} disabled={isSharedSaving}>
                {isSharedSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Load dialog */}
      {isLoadDialogOpen && (
        <div className="mse-dialog-backdrop" role="dialog" aria-modal="true" aria-label="Load timeline">
          <div className="mse-dialog" onClick={(event) => event.stopPropagation()}>
            <div className="mse-dialog-head">
              <strong>Load Shared Timeline</strong>
              <div className="mse-config-actions">
                <button type="button" className="mse-action-btn is-small" onClick={() => void refreshSharedTimelines()} disabled={isSharedLoading}>
                  {isSharedLoading ? 'Refreshing...' : 'Refresh'}
                </button>
                <button type="button" className="mse-icon-btn" title="Close" aria-label="Close load timeline" onClick={() => setIsLoadDialogOpen(false)}>
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="mse-shared-list" role="list" aria-label="Shared timelines">
              {sharedTimelines.length === 0 ? (
                <p className="mse-source-empty">No shared timelines yet.</p>
              ) : sharedTimelines.map((timeline) => (
                <article
                  key={timeline.id}
                  role="listitem"
                  className={`mse-shared-item${selectedTimelineId === timeline.id ? ' is-active' : ''}`}
                >
                  <div className="mse-shared-item-main">
                    <strong title={timeline.name}>{timeline.name}</strong>
                    <span>{timeline.segmentUrls.length} clips</span>
                    <span>{timeline.ownerLabel}</span>
                    <span>{formatTimestamp(timeline.updatedAtMs)}</span>
                  </div>
                  <button
                    type="button"
                    className="mse-action-btn is-small"
                    onClick={() => loadSharedTimeline(timeline)}
                  >
                    Load
                  </button>
                </article>
              ))}
            </div>
          </div>
        </div>
      )}

    </section>
  )
}

export default MSEVideoSequencerPage
