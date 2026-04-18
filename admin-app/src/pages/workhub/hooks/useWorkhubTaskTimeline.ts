import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent, UIEvent, WheelEvent } from 'react'
import type { WorkhubMember, WorkhubTask, WorkhubTaskStatusConfig } from '../../../lib/workhubRepo'
import { getInitials } from '../taskUtils'

const MS_PER_DAY = 86_400_000
const MIN_TIMELINE_DAYS = 14
const TIMELINE_DAY_WIDTH_STEPS = [18, 22, 26, 30, 34, 40]
const DEFAULT_TIMELINE_DAY_WIDTH = 26
const DEFAULT_TIMELINE_NAME_WIDTH = 200
const MIN_TIMELINE_NAME_WIDTH = 180
const MAX_TIMELINE_NAME_WIDTH = 420
const DEFAULT_TIMELINE_BAR_COLOR = '#5d84d6'
const TIMELINE_DAY_WIDTH_STORAGE_KEY = 'workhub:timeline-day-width'
const TIMELINE_NAME_WIDTH_STORAGE_KEY = 'workhub:timeline-name-pane-width'

type TimelineDragMode = 'move' | 'resize-start' | 'resize-end'

export interface TimelineDayMeta {
  key: string
  dayNum: string
  isWeekend: boolean
  isMonthStart: boolean
  isToday: boolean
  monthLabel: string
  headClass: string
  colClass: string
}

export interface TimelineRow {
  id: string
  title: string
  statusColor: string
  assigneeName: string
  assigneePhotoUrl: string
  assigneeInitials: string
  createdDate: string
  startDate: string
  dueDate: string
  durationLabel: string
  timelineWarning: string
  task: WorkhubTask
  startIndex: number | null
  endIndex: number | null
}

interface TimelineSortableRow {
  id: string
  title: string
  startIndex: number | null
  endIndex: number | null
}

interface TimelineDragSession {
  taskId: string
  task: WorkhubTask
  mode: TimelineDragMode
  spanDays: number
  pointerOffsetDays: number
  dayCount: number
  dayWidth: number
  trackLeft: number
  dayKeys: string[]
  startIndex: number
  endIndex: number
  currentStartIndex: number
  currentEndIndex: number
  originalStartDate: string
  originalDueDate: string
}

interface UseWorkhubTaskTimelineParams {
  filteredTasks: WorkhubTask[]
  memberByUid: Record<string, WorkhubMember>
  selectedProjectEffectiveTaskStatuses: WorkhubTaskStatusConfig[]
  selectedTaskId: string
  setSelectedTaskId: (taskId: string) => void
  handleTaskUpdate: (task: WorkhubTask, updates: Partial<WorkhubTask>, options?: { silent?: boolean }) => Promise<void>
}

function readStoredTimelineNumber(
  key: string,
  fallbackValue: number,
  options?: { min?: number; max?: number; allowedValues?: number[] },
): number {
  if (typeof window === 'undefined') return fallbackValue

  try {
    const raw = window.localStorage.getItem(key)
    if (!raw) return fallbackValue
    const parsed = Number.parseInt(raw, 10)
    if (!Number.isFinite(parsed)) return fallbackValue
    if (options?.allowedValues && !options.allowedValues.includes(parsed)) return fallbackValue

    let nextValue = parsed
    if (typeof options?.min === 'number') {
      nextValue = Math.max(options.min, nextValue)
    }
    if (typeof options?.max === 'number') {
      nextValue = Math.min(options.max, nextValue)
    }
    return nextValue
  } catch {
    return fallbackValue
  }
}

function getCurrentDateInputValue(): string {
  const now = new Date()
  const timezoneOffsetMs = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - timezoneOffsetMs).toISOString().slice(0, 10)
}

function parseDateInputToUtcMs(value: string | undefined, endOfDay = false): number | null {
  const normalized = (value || '').trim()
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized)
  if (!match) return null
  const year = Number(match[1])
  const monthIndex = Number(match[2]) - 1
  const day = Number(match[3])
  if (!Number.isFinite(year) || !Number.isFinite(monthIndex) || !Number.isFinite(day)) return null
  return Date.UTC(
    year,
    monthIndex,
    day,
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 999 : 0,
  )
}

function parseTimelineInstantToUtcMs(value: string | undefined, endOfDayForDateOnly = false): number | null {
  const normalized = (value || '').trim()
  if (!normalized) return null
  const dateOnlyValue = parseDateInputToUtcMs(normalized, endOfDayForDateOnly)
  if (dateOnlyValue !== null) return dateOnlyValue
  const parsed = Date.parse(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

function utcMsToDateKey(ms: number): string {
  const date = new Date(ms)
  const year = date.getUTCFullYear()
  const month = String(date.getUTCMonth() + 1).padStart(2, '0')
  const day = String(date.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function clampTimelineDayIndex(value: number, minValue: number, maxValue: number): number {
  return Math.max(minValue, Math.min(maxValue, value))
}

function getUnknownTimeValue(value: unknown): number {
  if (!value) return 0
  if (typeof value === 'object' && value !== null && 'toMillis' in value && typeof (value as { toMillis?: unknown }).toMillis === 'function') {
    return (value as { toMillis: () => number }).toMillis()
  }
  if (typeof value === 'object' && value !== null && 'seconds' in value) {
    const seconds = Number((value as { seconds?: unknown }).seconds || 0)
    const nanoseconds = Number((value as { nanoseconds?: unknown }).nanoseconds || 0)
    return (seconds * 1000) + Math.floor(nanoseconds / 1_000_000)
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function formatTimelineDurationLabel(startMs: number | null, endMs: number | null): string {
  if (startMs === null || endMs === null) return ''
  const durationMs = Math.max(0, endMs - startMs)
  const durationHours = Math.max(1, Math.round(durationMs / 3_600_000))
  if (durationHours < 24) return `${durationHours}h`

  const durationDays = Math.max(1, Math.round(durationMs / 86_400_000))
  if (durationDays >= 60) {
    const months = Math.floor(durationDays / 30)
    const days = durationDays - (months * 30)
    return days > 0 ? `${months}m ${days}d` : `${months}m`
  }
  return `${durationDays}d`
}

function getTimelineWarningMessage(hasStartDate: boolean, hasDueDate: boolean): string {
  if (!hasStartDate && !hasDueDate) {
    return 'Add a start date and deadline to place this task on the timeline.'
  }
  if (!hasStartDate) {
    return 'Add a start date so the deadline has a proper timeline range.'
  }
  if (!hasDueDate) {
    return 'Add a deadline so the start date has a proper timeline range.'
  }
  return ''
}

function compareTimelineRowsBySchedule(left: TimelineSortableRow, right: TimelineSortableRow): number {
  const leftStart = left.startIndex ?? left.endIndex ?? Number.MAX_SAFE_INTEGER
  const rightStart = right.startIndex ?? right.endIndex ?? Number.MAX_SAFE_INTEGER
  if (leftStart !== rightStart) return leftStart - rightStart

  const leftEnd = left.endIndex ?? left.startIndex ?? Number.MAX_SAFE_INTEGER
  const rightEnd = right.endIndex ?? right.startIndex ?? Number.MAX_SAFE_INTEGER
  if (leftEnd !== rightEnd) return leftEnd - rightEnd

  return left.title.localeCompare(right.title)
}

export function useWorkhubTaskTimeline({
  filteredTasks,
  memberByUid,
  selectedProjectEffectiveTaskStatuses,
  selectedTaskId,
  setSelectedTaskId,
  handleTaskUpdate,
}: UseWorkhubTaskTimelineParams) {
  const [timelineDragPreviewByTaskId, setTimelineDragPreviewByTaskId] = useState<Record<string, { startIndex: number; endIndex: number }>>({})
  const [dayWidth, setDayWidth] = useState(() => readStoredTimelineNumber(
    TIMELINE_DAY_WIDTH_STORAGE_KEY,
    DEFAULT_TIMELINE_DAY_WIDTH,
    { allowedValues: TIMELINE_DAY_WIDTH_STEPS },
  ))
  const [namePaneWidth, setNamePaneWidth] = useState(() => readStoredTimelineNumber(
    TIMELINE_NAME_WIDTH_STORAGE_KEY,
    DEFAULT_TIMELINE_NAME_WIDTH,
    { min: MIN_TIMELINE_NAME_WIDTH, max: MAX_TIMELINE_NAME_WIDTH },
  ))
  const [rowOrderIds, setRowOrderIds] = useState<string[]>(() => filteredTasks.map((task) => task.id))
  const timelineDragSessionRef = useRef<TimelineDragSession | null>(null)
  const dragCleanupRef = useRef<(() => void) | null>(null)
  const nameResizeCleanupRef = useRef<(() => void) | null>(null)
  const namesPaneRef = useRef<HTMLDivElement | null>(null)
  const headerPaneRef = useRef<HTMLDivElement | null>(null)
  const gridPaneRef = useRef<HTMLDivElement | null>(null)
  const timelineRootRef = useRef<HTMLDivElement | null>(null)

  const taskTimelineData = useMemo(() => {
    const todayKey = getCurrentDateInputValue()
    const todayStartMs = parseDateInputToUtcMs(todayKey, false) ?? Date.now()
    const statusById = Object.fromEntries(selectedProjectEffectiveTaskStatuses.map((status) => [status.id, status])) as Record<string, WorkhubTaskStatusConfig>

    const timelineRows = filteredTasks
      .map((task) => {
        let startMs = parseTimelineInstantToUtcMs(task.startDate, false)
        let endMs = parseTimelineInstantToUtcMs(task.dueDate, true)
        const hasStartDate = startMs !== null
        const hasDueDate = endMs !== null

        if (startMs !== null && endMs !== null && startMs > endMs) {
          const normalizedStart = parseDateInputToUtcMs(task.dueDate, false)
          const normalizedEnd = parseDateInputToUtcMs(task.startDate, true)
          startMs = normalizedStart ?? endMs
          endMs = normalizedEnd ?? startMs
        }

        const startKey = startMs !== null ? utcMsToDateKey(startMs) : ''
        const endKey = endMs !== null ? utcMsToDateKey(endMs) : ''
        const createdAtMs = getUnknownTimeValue(task.createdAt)
        const createdDate = createdAtMs > 0 ? utcMsToDateKey(createdAtMs) : ''
        const statusMeta = statusById[task.status]
        const assignee = memberByUid[task.assigneeUid]

        return {
          task,
          startMs,
          endMs,
          startKey,
          endKey,
          createdDate,
          durationLabel: hasStartDate && hasDueDate ? formatTimelineDurationLabel(startMs, endMs) : '',
          timelineWarning: getTimelineWarningMessage(hasStartDate, hasDueDate),
          assigneeName: assignee?.displayName || assignee?.email || 'Unassigned',
          statusColor: statusMeta?.color || DEFAULT_TIMELINE_BAR_COLOR,
        }
      })

    const datedRows = timelineRows.filter((row) => row.startMs !== null && row.endMs !== null)

    let rangeStartMs = todayStartMs
    let rangeEndMs = todayStartMs + ((MIN_TIMELINE_DAYS - 1) * MS_PER_DAY)

    if (datedRows.length > 0) {
      const earliest = Math.min(...datedRows.map((row) => row.startMs as number))
      const latest = Math.max(...datedRows.map((row) => row.endMs as number))
      rangeStartMs = earliest
      rangeEndMs = latest
      if (rangeEndMs < rangeStartMs + ((MIN_TIMELINE_DAYS - 1) * MS_PER_DAY)) {
        rangeEndMs = rangeStartMs + ((MIN_TIMELINE_DAYS - 1) * MS_PER_DAY)
      }
    }

    const dayKeys: string[] = []
    for (let cursor = rangeStartMs; cursor <= rangeEndMs; cursor += MS_PER_DAY) {
      dayKeys.push(utcMsToDateKey(cursor))
    }

    const daysMeta: TimelineDayMeta[] = dayKeys.map((day, index) => {
      const dow = new Date(`${day}T12:00:00`).getDay()
      const isWeekend = dow === 0 || dow === 6
      const isMonthStart = index === 0 || day.slice(5, 7) !== dayKeys[index - 1].slice(5, 7)
      const isToday = day === todayKey
      return {
        key: day,
        dayNum: day.slice(8),
        isWeekend,
        isMonthStart,
        isToday,
        monthLabel: isMonthStart ? new Date(`${day}T12:00:00`).toLocaleString(undefined, { month: 'short' }) : '',
        headClass: `workhub-task-timeline-day-head${isWeekend ? ' is-weekend' : ''}${isMonthStart ? ' is-month-start' : ''}`,
        colClass: `workhub-task-timeline-grid-col${isWeekend ? ' is-weekend' : ''}${isMonthStart ? ' is-month-start' : ''}${isToday ? ' is-today' : ''}`,
      }
    })

    const dayIndexByKey = new Map(dayKeys.map((day, index) => [day, index]))

    const rowsById = new Map<string, TimelineRow>()

    timelineRows.forEach((row) => {
      const startIndex = row.startKey ? (dayIndexByKey.get(row.startKey) ?? null) : null
      const endIndex = row.endKey ? (dayIndexByKey.get(row.endKey) ?? null) : null
      rowsById.set(row.task.id, {
        id: row.task.id,
        title: row.task.title,
        statusColor: row.statusColor,
        assigneeName: row.assigneeName,
        assigneePhotoUrl: memberByUid[row.task.assigneeUid]?.photoURL || '',
        assigneeInitials: getInitials(row.assigneeName || 'U'),
        createdDate: row.createdDate,
        startDate: row.task.startDate || '',
        dueDate: row.task.dueDate || '',
        durationLabel: row.durationLabel,
        timelineWarning: row.timelineWarning,
        task: row.task,
        startIndex,
        endIndex,
      })
    })

    const orderedIds = rowOrderIds.filter((taskId) => rowsById.has(taskId))
    rowsById.forEach((_value, taskId) => {
      if (!orderedIds.includes(taskId)) {
        orderedIds.push(taskId)
      }
    })

    const rows = orderedIds
      .map((taskId) => rowsById.get(taskId) ?? null)
      .filter((row): row is TimelineRow => row !== null)

    return {
      daysMeta,
      dayCount: daysMeta.length,
      rows,
    }
  }, [filteredTasks, memberByUid, rowOrderIds, selectedProjectEffectiveTaskStatuses])

  const currentDayWidthStepIndex = TIMELINE_DAY_WIDTH_STEPS.indexOf(dayWidth)
  const canZoomOut = currentDayWidthStepIndex > 0
  const canZoomIn = currentDayWidthStepIndex < TIMELINE_DAY_WIDTH_STEPS.length - 1

  const handleZoomOut = useCallback(() => {
    setDayWidth((current) => {
      const currentIndex = TIMELINE_DAY_WIDTH_STEPS.indexOf(current)
      if (currentIndex <= 0) return current
      return TIMELINE_DAY_WIDTH_STEPS[currentIndex - 1]
    })
  }, [])

  const handleZoomIn = useCallback(() => {
    setDayWidth((current) => {
      const currentIndex = TIMELINE_DAY_WIDTH_STEPS.indexOf(current)
      if (currentIndex < 0 || currentIndex >= TIMELINE_DAY_WIDTH_STEPS.length - 1) return current
      return TIMELINE_DAY_WIDTH_STEPS[currentIndex + 1]
    })
  }, [])

  const handleResetZoom = useCallback(() => {
    setDayWidth(DEFAULT_TIMELINE_DAY_WIDTH)
  }, [])

  const handleGridPaneScroll = useCallback((event: UIEvent<HTMLDivElement>) => {
    const { scrollLeft, scrollTop } = event.currentTarget
    if (headerPaneRef.current && headerPaneRef.current.scrollLeft !== scrollLeft) {
      headerPaneRef.current.scrollLeft = scrollLeft
    }
    if (namesPaneRef.current && namesPaneRef.current.scrollTop !== scrollTop) {
      namesPaneRef.current.scrollTop = scrollTop
    }
  }, [])

  const handleNamesPaneWheel = useCallback((event: WheelEvent<HTMLDivElement>) => {
    const gridPane = gridPaneRef.current
    if (!gridPane) return
    if (event.deltaY === 0 && event.deltaX === 0) return
    gridPane.scrollTop += event.deltaY
    gridPane.scrollLeft += event.deltaX
    event.preventDefault()
  }, [])

  const clearActiveDragListeners = useCallback(() => {
    if (!dragCleanupRef.current) return
    dragCleanupRef.current()
    dragCleanupRef.current = null
  }, [])

  const clearNameResizeListeners = useCallback(() => {
    if (!nameResizeCleanupRef.current) return
    nameResizeCleanupRef.current()
    nameResizeCleanupRef.current = null
  }, [])

  useEffect(() => () => {
    clearActiveDragListeners()
    clearNameResizeListeners()
    timelineDragSessionRef.current = null
  }, [clearActiveDragListeners, clearNameResizeListeners])

  useEffect(() => {
    setRowOrderIds((current) => {
      const incomingIds = filteredTasks.map((task) => task.id)
      const incomingIdSet = new Set(incomingIds)
      const preservedIds = current.filter((taskId) => incomingIdSet.has(taskId))
      const preservedIdSet = new Set(preservedIds)
      const appendedIds = incomingIds.filter((taskId) => !preservedIdSet.has(taskId))
      const next = [...preservedIds, ...appendedIds]

      if (next.length === current.length && next.every((taskId, index) => taskId === current[index])) {
        return current
      }
      return next
    })
  }, [filteredTasks])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(TIMELINE_DAY_WIDTH_STORAGE_KEY, String(dayWidth))
    } catch {
      // Ignore storage errors and keep the current in-memory zoom level.
    }
  }, [dayWidth])

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem(TIMELINE_NAME_WIDTH_STORAGE_KEY, String(namePaneWidth))
    } catch {
      // Ignore storage errors and keep the current in-memory pane width.
    }
  }, [namePaneWidth])

  useEffect(() => {
    const namesPane = namesPaneRef.current
    const gridPane = gridPaneRef.current
    if (!selectedTaskId || !namesPane || !gridPane) return

    const frame = window.requestAnimationFrame(() => {
      const nameNode = namesPane.querySelector(`[data-task-id="${selectedTaskId}"]`) as HTMLElement | null
      if (nameNode) {
        nameNode.scrollIntoView({ block: 'nearest' })
      }

      const gridRow = gridPane.querySelector(`[data-timeline-row-id="${selectedTaskId}"]`) as HTMLElement | null
      if (gridRow) {
        gridRow.scrollIntoView({ block: 'nearest' })
      }

      const selectedBar = gridPane.querySelector(`[data-timeline-bar-id="${selectedTaskId}"]`) as HTMLElement | null
      if (selectedBar) {
        selectedBar.scrollIntoView({ block: 'nearest', inline: 'nearest' })
      }
    })

    return () => window.cancelAnimationFrame(frame)
  }, [selectedTaskId, taskTimelineData.rows])

  const beginNamePaneResize = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const startX = event.clientX
    const startWidth = namePaneWidth

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const delta = moveEvent.clientX - startX
      setNamePaneWidth(Math.max(MIN_TIMELINE_NAME_WIDTH, Math.min(MAX_TIMELINE_NAME_WIDTH, startWidth + delta)))
    }

    const handlePointerUp = () => {
      clearNameResizeListeners()
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)
    nameResizeCleanupRef.current = () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }

    event.preventDefault()
    event.stopPropagation()
  }, [clearNameResizeListeners, namePaneWidth])

  const handleArrangeRows = useCallback(() => {
    setRowOrderIds(
      taskTimelineData.rows
        .slice()
        .sort(compareTimelineRowsBySchedule)
        .map((row) => row.id),
    )
  }, [taskTimelineData.rows])

  const beginTimelineDrag = useCallback((
    event: ReactPointerEvent<HTMLButtonElement>,
    row: TimelineRow,
    range: { startIndex: number; endIndex: number },
    mode: TimelineDragMode,
  ) => {
    const trackElement = event.currentTarget.closest('.workhub-task-timeline-bar-track') as HTMLElement | null
    if (!trackElement) return
    const trackRect = trackElement.getBoundingClientRect()
    const computedDayWidth = Number.parseFloat(getComputedStyle(trackElement).getPropertyValue('--workhub-task-timeline-day-width')) || dayWidth
    const pointerDayIndex = clampTimelineDayIndex(
      Math.floor((event.clientX - trackRect.left) / computedDayWidth),
      0,
      taskTimelineData.dayCount - 1,
    )
    const spanDays = Math.max(1, (range.endIndex - range.startIndex) + 1)

    timelineDragSessionRef.current = {
      taskId: row.id,
      task: row.task,
      mode,
      spanDays,
      pointerOffsetDays: mode === 'move' ? pointerDayIndex - range.startIndex : 0,
      dayCount: taskTimelineData.dayCount,
      dayWidth: computedDayWidth,
      trackLeft: trackRect.left,
      dayKeys: taskTimelineData.daysMeta.map((item) => item.key),
      startIndex: range.startIndex,
      endIndex: range.endIndex,
      currentStartIndex: range.startIndex,
      currentEndIndex: range.endIndex,
      originalStartDate: row.startDate,
      originalDueDate: row.dueDate,
    }

    setSelectedTaskId(row.id)
    setTimelineDragPreviewByTaskId((current) => ({
      ...current,
      [row.id]: { startIndex: range.startIndex, endIndex: range.endIndex },
    }))

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const session = timelineDragSessionRef.current
      if (!session) return
      const nextPointerIndex = clampTimelineDayIndex(
        Math.floor((moveEvent.clientX - session.trackLeft) / session.dayWidth),
        0,
        session.dayCount - 1,
      )

      if (session.mode === 'move') {
        const nextStartIndex = clampTimelineDayIndex(
          nextPointerIndex - session.pointerOffsetDays,
          0,
          session.dayCount - session.spanDays,
        )
        const nextEndIndex = nextStartIndex + session.spanDays - 1
        if (nextStartIndex === session.currentStartIndex && nextEndIndex === session.currentEndIndex) return
        session.currentStartIndex = nextStartIndex
        session.currentEndIndex = nextEndIndex
      } else if (session.mode === 'resize-start') {
        const nextStartIndex = clampTimelineDayIndex(nextPointerIndex, 0, session.endIndex)
        if (nextStartIndex === session.currentStartIndex) return
        session.currentStartIndex = nextStartIndex
        session.currentEndIndex = session.endIndex
      } else {
        const nextEndIndex = clampTimelineDayIndex(nextPointerIndex, session.startIndex, session.dayCount - 1)
        if (nextEndIndex === session.currentEndIndex) return
        session.currentStartIndex = session.startIndex
        session.currentEndIndex = nextEndIndex
      }

      setTimelineDragPreviewByTaskId((current) => {
        const existing = current[session.taskId]
        if (existing && existing.startIndex === session.currentStartIndex && existing.endIndex === session.currentEndIndex) {
          return current
        }
        return {
          ...current,
          [session.taskId]: {
            startIndex: session.currentStartIndex,
            endIndex: session.currentEndIndex,
          },
        }
      })
    }

    const handlePointerUp = () => {
      clearActiveDragListeners()
      const session = timelineDragSessionRef.current
      timelineDragSessionRef.current = null
      if (!session) return

      setTimelineDragPreviewByTaskId((current) => {
        if (!(session.taskId in current)) return current
        const next = { ...current }
        delete next[session.taskId]
        return next
      })

      const nextStartDate = session.dayKeys[session.currentStartIndex] || ''
      const nextDueDate = session.dayKeys[session.currentEndIndex] || ''
      if (!nextStartDate || !nextDueDate) return
      if (nextStartDate === session.originalStartDate && nextDueDate === session.originalDueDate) return

      void handleTaskUpdate(session.task, { startDate: nextStartDate, dueDate: nextDueDate }, { silent: true })
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)
    dragCleanupRef.current = () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }

    event.preventDefault()
    event.stopPropagation()
  }, [clearActiveDragListeners, dayWidth, handleTaskUpdate, setSelectedTaskId, taskTimelineData.dayCount, taskTimelineData.daysMeta])

  return {
    canZoomIn,
    canZoomOut,
    dayWidth,
    namePaneWidth,
    daysMeta: taskTimelineData.daysMeta,
    dayCount: taskTimelineData.dayCount,
    rows: taskTimelineData.rows,
    timelineDragPreviewByTaskId,
    timelineRootRef,
    namesPaneRef,
    headerPaneRef,
    gridPaneRef,
    handleGridPaneScroll,
    handleNamesPaneWheel,
    handleZoomIn,
    handleZoomOut,
    handleResetZoom,
    handleArrangeRows,
    beginNamePaneResize,
    beginTimelineDrag,
  }
}
