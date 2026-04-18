import { useEffect } from 'react'
import type { WorkhubMember, WorkhubTask, WorkhubTaskStatusConfig } from '../../../lib/workhubRepo'
import { formatDueDateShort } from '../taskUtils'
import { useWorkhubTaskTimeline } from '../hooks/useWorkhubTaskTimeline'

interface WorkhubTaskTimelineProps {
  filteredTasks: WorkhubTask[]
  memberByUid: Record<string, WorkhubMember>
  selectedProjectEffectiveTaskStatuses: WorkhubTaskStatusConfig[]
  selectedTaskId: string
  setSelectedTaskId: (taskId: string) => void
  handleTaskUpdate: (task: WorkhubTask, updates: Partial<WorkhubTask>, options?: { silent?: boolean }) => Promise<void>
}

export function WorkhubTaskTimeline({
  filteredTasks,
  memberByUid,
  selectedProjectEffectiveTaskStatuses,
  selectedTaskId,
  setSelectedTaskId,
  handleTaskUpdate,
}: WorkhubTaskTimelineProps) {
  const {
    canZoomIn,
    canZoomOut,
    dayWidth,
    namePaneWidth,
    daysMeta,
    dayCount,
    rows,
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
  } = useWorkhubTaskTimeline({
    filteredTasks,
    memberByUid,
    selectedProjectEffectiveTaskStatuses,
    selectedTaskId,
    setSelectedTaskId,
    handleTaskUpdate,
  })

  useEffect(() => {
    const node = timelineRootRef.current
    if (!node) return
    node.style.setProperty('--workhub-task-timeline-day-width', `${dayWidth}px`)
    node.style.setProperty('--workhub-task-timeline-day-count', String(dayCount))
    node.style.setProperty('--workhub-task-timeline-name-width', `${namePaneWidth}px`)
  }, [dayCount, dayWidth, namePaneWidth, timelineRootRef])

  if (rows.length === 0) {
    return <div className="workhub-empty-state">No tasks to plot in timeline.</div>
  }

  return (
    <div ref={timelineRootRef} className="workhub-task-timeline-wrap">
      <div className="workhub-task-timeline-toolbar">
        <div className="workhub-task-timeline-toolbar-copy">
          <strong>Timeline</strong>
          <span>{rows.length} task{rows.length === 1 ? '' : 's'}</span>
        </div>
        <div className="workhub-task-timeline-zoom-controls" aria-label="Timeline zoom controls">
          <button type="button" onClick={handleZoomOut} disabled={!canZoomOut} aria-label="Zoom out timeline horizontally">−</button>
          <span>{dayWidth}px</span>
          <button type="button" className="is-reset" onClick={handleResetZoom} aria-label="Reset timeline zoom">Reset</button>
          <button type="button" className="is-arrange" onClick={handleArrangeRows} aria-label="Arrange timeline rows manually">Arrange</button>
          <button type="button" onClick={handleZoomIn} disabled={!canZoomIn} aria-label="Zoom in timeline horizontally">+</button>
        </div>
      </div>

      <div className="workhub-task-timeline-layout">
        <div className="workhub-task-timeline-left-pane">
          <div className="workhub-task-timeline-name-head">Task</div>
          <div ref={namesPaneRef} className="workhub-task-timeline-names-pane" onWheel={handleNamesPaneWheel}>
            {rows.map((row) => (
              <button
                key={row.id}
                type="button"
                className={`workhub-task-timeline-name${selectedTaskId === row.id ? ' is-active' : ''}${row.timelineWarning ? ' is-warning' : ''}`}
                data-task-id={row.id}
                onClick={() => setSelectedTaskId(row.id)}
                title={row.timelineWarning ? `${row.title} · ${row.timelineWarning}` : `${row.title} · ${row.assigneeName}`}
              >
                <span className="workhub-task-timeline-name-main">
                  <span className="workhub-task-timeline-name-copy">
                    <strong>{row.title || 'Untitled task'}</strong>
                    {row.timelineWarning && <span className="workhub-task-timeline-name-warning">Add start + deadline</span>}
                  </span>
                  <span className="workhub-task-timeline-assignee" title={row.assigneeName} aria-label={`Assignee ${row.assigneeName}`}>
                    {row.assigneePhotoUrl
                      ? <img src={row.assigneePhotoUrl} alt={row.assigneeName} loading="lazy" />
                      : <span className="workhub-task-timeline-assignee-fallback">{row.assigneeInitials}</span>}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="workhub-task-timeline-resize-handle"
          onPointerDown={beginNamePaneResize}
          aria-label="Resize timeline task column"
          title="Resize task column"
        />

        <div className="workhub-task-timeline-right-pane">
          <div ref={headerPaneRef} className="workhub-task-timeline-days-head-pane" aria-hidden="true">
            <div className="workhub-task-timeline-days-head">
              {daysMeta.map((day) => (
                <div key={day.key} className={day.headClass} title={day.key}>
                  <span className={`workhub-task-timeline-month${day.isMonthStart ? ' is-visible' : ''}`}>{day.monthLabel}</span>
                  <span>{day.dayNum}</span>
                </div>
              ))}
            </div>
          </div>

          <div ref={gridPaneRef} className="workhub-task-timeline-grid-pane" onScroll={handleGridPaneScroll}>
            <div className="workhub-task-timeline-grid-content">
              <div className="workhub-task-timeline-grid-overlay" aria-hidden="true">
                {daysMeta.map((day) => (
                  <div key={day.key} className={day.colClass} />
                ))}
              </div>

              <div className="workhub-task-timeline-grid-rows">
                {rows.map((row) => {
                  const previewRange = timelineDragPreviewByTaskId[row.id]
                  const renderStartIndex = previewRange?.startIndex ?? row.startIndex
                  const renderEndIndex = previewRange?.endIndex ?? row.endIndex
                  const hasTimelineRange = renderStartIndex !== null && renderEndIndex !== null && renderEndIndex >= renderStartIndex

                  const startKey = hasTimelineRange ? daysMeta[renderStartIndex]?.key || '' : row.startDate
                  const endKey = hasTimelineRange ? daysMeta[renderEndIndex]?.key || '' : row.dueDate
                  const createdLabel = row.createdDate ? formatDueDateShort(row.createdDate) : 'Unknown'
                  const timelineDateLabel = startKey && endKey
                    ? `${formatDueDateShort(startKey)} -> ${formatDueDateShort(endKey)}`
                    : endKey
                      ? `Due ${formatDueDateShort(endKey)}`
                      : startKey
                        ? `Starts ${formatDueDateShort(startKey)}`
                        : 'No timeline dates'

                  return (
                    <div key={row.id} data-timeline-row-id={row.id} className={`workhub-task-timeline-grid-row${selectedTaskId === row.id ? ' is-active' : ''}`}>
                      <div className={`workhub-task-timeline-bar-track${selectedTaskId === row.id ? ' is-active' : ''}${row.timelineWarning ? ' is-warning' : ''}`}>
                        {hasTimelineRange && (
                          <div
                            className={`workhub-task-timeline-bar-wrap${previewRange ? ' is-dragging' : ''}`}
                            ref={(node) => {
                              if (!node) return
                              node.style.setProperty('--timeline-start-index', String(renderStartIndex))
                              node.style.setProperty('--timeline-span-days', String(renderEndIndex - renderStartIndex + 1))
                              node.style.setProperty('--task-status-color', row.statusColor)
                            }}
                          >
                            <button
                              type="button"
                              className="workhub-task-timeline-bar-handle is-start"
                              onPointerDown={(event) => beginTimelineDrag(event, row, { startIndex: renderStartIndex, endIndex: renderEndIndex }, 'resize-start')}
                              onClick={(event) => event.stopPropagation()}
                              title="Drag to move the start date"
                              aria-label={`Resize start of ${row.title || 'task'} timeline`}
                            />
                            <button
                              type="button"
                              data-timeline-bar-id={row.id}
                              className={`workhub-task-timeline-bar${previewRange ? ' is-dragging' : ''}${selectedTaskId === row.id ? ' is-active' : ''}`}
                              onClick={() => setSelectedTaskId(row.id)}
                              onPointerDown={(event) => beginTimelineDrag(event, row, { startIndex: renderStartIndex, endIndex: renderEndIndex }, 'move')}
                              title={`${row.title} · ${timelineDateLabel} · Created ${createdLabel}`}
                              aria-label={`Open task ${row.title}`}
                            >
                              {row.durationLabel && <span className="workhub-task-timeline-bar-label">{row.durationLabel}</span>}
                            </button>
                            <button
                              type="button"
                              className="workhub-task-timeline-bar-handle"
                              onPointerDown={(event) => beginTimelineDrag(event, row, { startIndex: renderStartIndex, endIndex: renderEndIndex }, 'resize-end')}
                              onClick={(event) => event.stopPropagation()}
                              title="Drag to extend or shorten"
                              aria-label={`Resize ${row.title || 'task'} timeline`}
                            />
                          </div>
                        )}
                        {!hasTimelineRange && row.timelineWarning && (
                          <button
                            type="button"
                            className={`workhub-task-timeline-warning-callout${selectedTaskId === row.id ? ' is-active' : ''}`}
                            onClick={() => setSelectedTaskId(row.id)}
                            title={row.timelineWarning}
                            aria-label={`${row.title || 'Task'} needs both a start date and deadline`}
                          >
                            {row.timelineWarning}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
