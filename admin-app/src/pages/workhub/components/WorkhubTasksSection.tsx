import { memo, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import {
  deleteWorkhubComment,
  subscribeWorkhubCommentsByEntity,
  updateWorkhubComment,
  type WorkhubTaskComment,
  type WorkhubTaskPriority,
  type WorkhubTaskStatus,
} from '../../../lib/workhubRepo'
import { PRIORITY_LABELS, getPriorityIcon, getTaskStatusIcon } from '../constants'
import { normalizeMemberUids } from '../projectUtils'
import { formatDueDateShort, getInitials, normalizeTaskTitle } from '../taskUtils'
import { useDetailRailMode } from '../hooks/useDetailRailMode'
import { useWorkhubMilestones } from '../hooks/useWorkhubMilestones'
import { WorkhubProjectDetailRail } from './WorkhubProjectDetailRail'
import { TaskRow, emptyTaskRowMeta } from './TaskRow'
import { QuickAddTaskRow } from './QuickAddTaskRow'
import { WorkhubDiscussionCard } from './WorkhubDiscussionCard'
import { WorkhubTaskDetailPanel } from './WorkhubTaskDetailPanel'
import { WorkhubTaskTimeline } from './WorkhubTaskTimeline'
import { getTaskSelectionSnapshot, setTaskSelectionId, subscribeTaskSelection } from '../taskSelectionStore'

const DEFAULT_STATUS_TASK_RENDER_LIMIT = 80
const STATUS_TASK_RENDER_INCREMENT = 80
const TASK_DISCUSSION_PAGE_SIZE = 6
const DETAIL_RAIL_DEFAULT_WIDTH = 320
const DETAIL_RAIL_MIN_WIDTH = 272
const DETAIL_RAIL_MIN_WIDTH_COMPACT = 228
const DETAIL_RAIL_MAX_WIDTH = 620
const DETAIL_RAIL_MAIN_COLUMN_MIN = 640

function clampDetailRailWidth(width: number, mode: 'expanded' | 'compact') {
  const minWidth = mode === 'compact' ? DETAIL_RAIL_MIN_WIDTH_COMPACT : DETAIL_RAIL_MIN_WIDTH
  if (typeof window === 'undefined') {
    return Math.min(DETAIL_RAIL_MAX_WIDTH, Math.max(minWidth, width))
  }
  const viewportAwareMax = Math.max(minWidth, window.innerWidth - DETAIL_RAIL_MAIN_COLUMN_MIN)
  const maxWidth = Math.min(DETAIL_RAIL_MAX_WIDTH, viewportAwareMax)
  return Math.min(maxWidth, Math.max(minWidth, width))
}

type WorkhubTasksSectionProps = Record<string, any>

export const WorkhubTasksSection = memo(function WorkhubTasksSection(props: WorkhubTasksSectionProps) {
  const {
    isMobileWorkhubLayout,
    workhubViewMode,
    taskItemDisplayMode,
    taskContextTrail,
    projectIntentMetaById,
    handleSelectProject,
    selectedWorkspaceDisplayName,
    selectedProjectPeriodLabel,
    selectedProjectSubmissionTimeLabel,
    selectedProjectEffectiveTaskStatuses,
    taskFilterBaseTasks,
    selectedTaskStatusTab,
    setSelectedTaskStatusTab,
    taskFilterBaseTaskCountByStatus,
    completedStatusForHighlight,
    completedHighlightCount,
    quickTaskViewTargetProject,
    busyKey,
    handleQuickTaskViewModeChange,
    activeTaskFilterCount,
    setTaskFilterMenuOpen,
    taskFilterMenuOpen,
    setTaskFilterRequireAttachments,
    setTaskFilterRequireChecklist,
    setTaskFilterPriority,
    taskFilterRequireAttachments,
    taskFilterRequireChecklist,
    taskFilterPriority,
    selectedTaskCount,
    setBulkStatusMenuOpen,
    bulkStatusMenuOpen,
    setBulkAssigneeMenuOpen,
    bulkAssigneeMenuOpen,
    bulkAssignableMembers,
    bulkUnionAssigneeUids,
    bulkAssigneeCoverageByUid,
    handleBulkStatusChange,
    handleBulkAssigneeChange,
    clearTaskSelection,
    setBulkDeleteConfirmOpen,
    selectedWorkspaceScopeType,
    filteredTasks,
    setSelectedTaskIds,
    renderedTaskStatuses,
    renderedTaskListsByStatus,
    filteredTaskCountByStatus,
    collapsibleStatusIdSet,
    expandedTaskStatusIds,
    setExpandedTaskStatusIds,
    financeStatusTotals,
    financeWorkspaceCurrency,
    taskDueDisplayMode,
    selectedTaskIdSet,
    taskContextMenuState,
    setTaskContextMenuState,
    dropTargetKey,
    dragTaskId,
    dragStatusId,
    openTaskStatusMenuId,
    openTaskPriorityMenuId,
    openTaskMoreMenuId,
    openTaskAssigneeMenuId,
    editingTaskTitleId,
    editingTaskTitleText,
    expandedTaskChecklistIdsSet,
    taskChecklistDrafts,
    editingChecklistTaskId,
    editingChecklistItemId,
    editingChecklistScope,
    editingChecklistItemText,
    memberByUid,
    assignableMembersByProjectId,
    workspaceAssignableMembers,
    taskMetaById,
    unreadCommentCountByTaskId,
    notifications,
    markWorkhubNotificationRead,
    taskRowCallbacks,
    flatVisibleProjectOptionsWithIcons,
    quickAddDefaultProjectId,
    selectedProjectId,
    currentUid,
    quickAddFocusStatusId,
    quickAddFocusTrigger,
    setQuickAddFocusStatusId,
    setDropTargetKey,
    handleTaskReorder,
    closeTaskContextMenu,
    openTaskMoveDialog,
    copyTaskDeepLink,
    copyTaskUniqueToken,
    handleQuickAddTask,
    setStatusTaskRenderLimitById,
    selectedProjectIntentMeta,
    workspaceProjectById,
    workspaceDocumentsByProjectId,
    workspaceMoodBoardsByProjectId,
    selectedWorkspaceMoodBoardEnabled,
    selectedDocumentId,
    setSelectedMoodBoardId,
    setSelectedDocumentId,
    setActiveSection,
    getWorkhubDocumentIcon,
    selectedMoodBoardId,
    detailMenuOpen,
    setDetailMenuOpen,
    setDetailMenuCoords,
    detailMenuCoords,
    handleSelectedTaskValueSave,
    handleSelectedTaskTitleSave,
    handleSelectedTaskDescriptionSave,
    resolveTaskParentEntityLabel,
    projectNameById,
    formatTime,
    buildChecklist,
    getChecklistDetailKey,
    expandedChecklistDetailKeys,
    toggleChecklistItemDetails,
    setEditingChecklistItemText,
    handleChecklistItemToggle,
    handleChecklistItemEditStart,
    handleChecklistItemEditSave,
    handleChecklistItemEditCancel,
    handleChecklistRemove,
    checklistDetailsDrafts,
    setChecklistDetailsDrafts,
    handleChecklistItemDetailsSave,
    checklistAttachmentDrafts,
    setChecklistAttachmentDrafts,
    handleChecklistAttachmentAdd,
    handleChecklistAttachmentFileUpload,
    uploadingChecklistAttachmentKey,
    attachmentViewMode,
    isImageAttachmentUrl,
    openAttachmentLightbox,
    attachmentReviews,
    handleChecklistAttachmentRemove,
    checklistLinkDrafts,
    setChecklistLinkDrafts,
    handleChecklistLinkAdd,
    handleChecklistLinkRemove,
    setTaskChecklistDrafts,
    taskChecklistValueDrafts,
    setTaskChecklistValueDrafts,
    handleChecklistAdd,
    handleTaskUpdate,
    handleAddTaskComment,
    projectDiscussionNode,
    taskAttachmentsCollapsed,
    setTaskAttachmentsCollapsed,
    setAttachmentViewMode,
    taskAttachmentTitleDrafts,
    setTaskAttachmentTitleDrafts,
    taskAttachmentDrafts,
    setTaskAttachmentDrafts,
    taskAttachmentFilePathDrafts,
    taskAttachmentFileDrafts,
    setTaskAttachmentFileDrafts,
    setTaskAttachmentFilePathDrafts,
    uploadingTaskAttachmentId,
    handleTaskAttachmentAdd,
    handleTaskAttachmentFileUpload,
    getTaskAttachments,
    getTaskAttachmentTitle,
    handleTaskAttachmentRemove,
    getTaskLinks,
    taskLinkTitleDrafts,
    setTaskLinkTitleDrafts,
    taskLinkDrafts,
    setTaskLinkDrafts,
    handleTaskLinkAdd,
    taskLinkEditingDrafts,
    handleTaskLinkEditCancel,
    getTaskLinkTitle,
    getUrlHostLabel,
    handleTaskLinkEditStart,
    handleTaskLinkRemove,
    selectedProject,
    selectedProjectColorDraft,
    canEditSelectedProject,
    canEditSelectedProjectAttachments,
    selectedProjectEffectiveIntent,
    selectedProjectNameDraft,
    setSelectedProjectNameDraft,
    handleSaveSelectedProjectDetails,
    selectedProjectTypeDraft,
    selectedProjectTypeOptions,
    setSelectedProjectTypeDraft,
    selectedProjectStartDateDraft,
    setSelectedProjectStartDateDraft,
    selectedProjectDeadlineDraft,
    setSelectedProjectDeadlineDraft,
    selectedProjectSubmissionTimeDraft,
    setSelectedProjectSubmissionTimeDraft,
    selectedProjectValueAmountDraft,
    setSelectedProjectValueAmountDraft,
    selectedProjectValueCurrencyDraft,
    setSelectedProjectValueCurrencyDraft,
    selectedProjectNarrativeDraft,
    setSelectedProjectNarrativeDraft,
    handleSelectedProjectDescriptionBlur,
    selectedProjectIntentDetailDrafts,
    setSelectedProjectIntentDetailDrafts,
    projectAttachmentsCollapsed,
    setProjectAttachmentsCollapsed,
    selectedProjectAttachmentTitleDraft,
    setSelectedProjectAttachmentTitleDraft,
    selectedProjectAttachmentDraft,
    setSelectedProjectAttachmentDraft,
    selectedProjectAttachmentFilePathDraft,
    setSelectedProjectAttachmentFilePathDraft,
    selectedProjectAttachmentFileDrafts,
    setSelectedProjectAttachmentFileDrafts,
    uploadingSelectedProjectAttachment,
    handleSelectedProjectAttachmentAdd,
    handleSelectedProjectAttachmentFileUpload,
    selectedProjectAttachments,
    deriveAttachmentTitle,
    handleSelectedProjectAttachmentRemove,
    selectedProjectColorMenuOpen,
    setSelectedProjectColorMenuOpen,
    selectedProjectColorMeaning,
    selectedWorkspaceProjectColorMeanings,
    handleSelectedProjectColorSelect,
    setProjectAccessDialogId,
    selectedProjectDetailsChanged,
    setTaskDeleteConfirmOpen,
    taskDeleteConfirmOpen,
    bulkDeleteConfirmOpen,
    handleBulkDeleteSelected,
    handleDeleteSingleTask,
    onMobileTaskDetailOpenChange,
    visibleTasks,
    selectedWorkspaceId,
    showToast,
    milestones: _milestonesProp,
    milestoneProgress: _milestoneProgressProp,
    onLinkTaskToMilestone: _onLinkTaskToMilestoneProp,
    onMilestoneStatusChange: _onMilestoneStatusChangeProp,
  } = props

  const [bulkAssigneeDraftUids, setBulkAssigneeDraftUids] = useState<string[]>([])

  useEffect(() => {
    if (selectedTaskCount > 0) return
    setBulkAssigneeDraftUids([])
    setBulkAssigneeMenuOpen(false)
  }, [selectedTaskCount, setBulkAssigneeMenuOpen])

  // ── Milestone view subscription (isolated here so only this component re-renders on data changes) ──
  const viewMilestones = useWorkhubMilestones({
    projectId: selectedProjectId !== 'all' ? selectedProjectId : null,
    workspaceId: selectedWorkspaceId || '',
    tasks: taskFilterBaseTasks,
    currentUserUid: currentUid,
    showToast,
  })
  const milestones = viewMilestones.milestones
  const milestoneProgress = viewMilestones.milestoneProgress
  const onLinkTaskToMilestone = viewMilestones.handleLinkTaskToMilestone
  const onMilestoneStatusChange = viewMilestones.handleStatusChange

  const selectedTaskId = useSyncExternalStore(subscribeTaskSelection, getTaskSelectionSnapshot)
  const setSelectedTaskId = useCallback((nextValue: string | ((prevState: string) => string)) => {
    const previousValue = getTaskSelectionSnapshot()
    const resolvedValue = typeof nextValue === 'function'
      ? nextValue(previousValue)
      : (nextValue || '')

    if (resolvedValue === previousValue) return
    setTaskSelectionId(resolvedValue)
  }, [])

  const selectedTask = useMemo(
    () => visibleTasks.find((item: { id: string }) => item.id === selectedTaskId) || null,
    [selectedTaskId, visibleTasks],
  )
  const selectedTaskContextTrail = useMemo(() => {
    if (!selectedTask) return taskContextTrail
    const trail: Array<{ id: string; name: string }> = []
    const visited = new Set<string>()
    let currentProjectId = selectedTask.projectId || ''
    while (currentProjectId && !visited.has(currentProjectId)) {
      const currentProject = workspaceProjectById[currentProjectId]
      if (!currentProject) break
      trail.unshift({ id: currentProject.id, name: currentProject.name })
      visited.add(currentProject.id)
      currentProjectId = currentProject.parentProjectId || ''
    }
    return trail.length > 0 ? trail : taskContextTrail
  }, [selectedTask, taskContextTrail, workspaceProjectById])
  const selectedTaskHeaderBreadcrumbTrail = useMemo(() => {
    const nextTrail = [...selectedTaskContextTrail]
    if (selectedWorkspaceId && selectedWorkspaceDisplayName) {
      nextTrail.unshift({ id: `workspace:${selectedWorkspaceId}`, name: selectedWorkspaceDisplayName })
    }
    return nextTrail
  }, [selectedTaskContextTrail, selectedWorkspaceDisplayName, selectedWorkspaceId])
  const openTaskContextMenuFromHeader = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    if (!selectedTask) return
    const rect = event.currentTarget.getBoundingClientRect()
    setTaskContextMenuState({
      taskId: selectedTask.id,
      x: rect.left,
      y: rect.bottom + 6,
    })
  }, [selectedTask, setTaskContextMenuState])

  useEffect(() => {
    if (!taskContextMenuState) return

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (!target) return
      const menu = document.querySelector('.workhub-task-context-menu')
      if (menu && menu.contains(target)) return
      closeTaskContextMenu()
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeTaskContextMenu()
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [taskContextMenuState, closeTaskContextMenu])

  const [taskComments, setTaskComments] = useState<WorkhubTaskComment[]>([])
  const [taskEditingCommentId, setTaskEditingCommentId] = useState('')
  const [taskEditingCommentText, setTaskEditingCommentText] = useState('')
  const [taskDiscussionBusyKey, setTaskDiscussionBusyKey] = useState('')
  const [taskDiscussionNotifyMode, setTaskDiscussionNotifyMode] = useState<'all' | 'selected' | 'none'>('all')
  const [taskDiscussionNotifyUids, setTaskDiscussionNotifyUids] = useState<string[]>([])
  const [taskDiscussionNotifyOwnerKey, setTaskDiscussionNotifyOwnerKey] = useState('')
  const [taskDiscussionFetchLimit, setTaskDiscussionFetchLimit] = useState(TASK_DISCUSSION_PAGE_SIZE)
  const [taskDiscussionHasMoreOlder, setTaskDiscussionHasMoreOlder] = useState(false)
  const {
    mode: detailRailMode,
    setExpanded: setDetailRailExpanded,
    setHidden: setDetailRailHidden,
    toggleCompact: toggleDetailRailCompact,
  } = useDetailRailMode('workhub:task-detail-rail-mode', !isMobileWorkhubLayout)
  const detailRailRef = useRef<HTMLElement | null>(null)
  const [isDetailRailResizing, setIsDetailRailResizing] = useState(false)
  const [detailRailWidth, setDetailRailWidth] = useState(() => {
    if (typeof window === 'undefined') return DETAIL_RAIL_DEFAULT_WIDTH
    const raw = window.localStorage.getItem('workhub:task-detail-rail-width')
    const parsed = raw ? parseInt(raw, 10) : NaN
    if (!Number.isFinite(parsed)) return DETAIL_RAIL_DEFAULT_WIDTH
    return clampDetailRailWidth(parsed, 'expanded')
  })
  const useTaskDetailDialog = workhubViewMode === 'workspace_tree'
  const contentDetailRailMode = useTaskDetailDialog ? 'hidden' : detailRailMode
  const resolvedDetailRailWidth = useMemo(
    () => clampDetailRailWidth(detailRailWidth, detailRailMode === 'compact' ? 'compact' : 'expanded'),
    [detailRailMode, detailRailWidth],
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem('workhub:task-detail-rail-width', String(Math.round(resolvedDetailRailWidth)))
  }, [resolvedDetailRailWidth])

  const handleDetailRailResizeStart = useCallback((event: React.PointerEvent<HTMLButtonElement>) => {
    if (isMobileWorkhubLayout || contentDetailRailMode === 'hidden') return
    event.preventDefault()
    event.stopPropagation()
    setIsDetailRailResizing(true)
    const initialRight = detailRailRef.current?.getBoundingClientRect().right ?? window.innerWidth

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const nextWidth = Math.round(initialRight - moveEvent.clientX)
      setDetailRailWidth(clampDetailRailWidth(nextWidth, detailRailMode === 'compact' ? 'compact' : 'expanded'))
    }

    const handlePointerUp = () => {
      setIsDetailRailResizing(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }, [contentDetailRailMode, detailRailMode, isMobileWorkhubLayout])

  useEffect(() => {
    if (!isMobileWorkhubLayout && contentDetailRailMode !== 'hidden') return
    setIsDetailRailResizing(false)
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [contentDetailRailMode, isMobileWorkhubLayout])

  useEffect(() => () => {
    document.body.style.cursor = ''
    document.body.style.userSelect = ''
  }, [])

  const contentAreaStyle = useMemo<React.CSSProperties | undefined>(() => {
    if (isMobileWorkhubLayout || contentDetailRailMode === 'hidden') return undefined
    return { gridTemplateColumns: `minmax(0, 1fr) ${Math.round(resolvedDetailRailWidth)}px` }
  }, [contentDetailRailMode, isMobileWorkhubLayout, resolvedDetailRailWidth])

  const selectedTaskAssignableMembers = useMemo(
    () => (selectedTask ? (assignableMembersByProjectId[selectedTask.projectId] || workspaceAssignableMembers) : workspaceAssignableMembers),
    [assignableMembersByProjectId, selectedTask, workspaceAssignableMembers],
  )

  const selectedTaskParentEntityLabel = useMemo(() => {
    if (!selectedTask) return 'Item'
    if (typeof resolveTaskParentEntityLabel === 'function') {
      return resolveTaskParentEntityLabel(selectedTask.projectId)
    }
    return 'Item'
  }, [resolveTaskParentEntityLabel, selectedTask])

  const selectedTaskFinanceInfo = useMemo(() => {
    if (!selectedTask || selectedWorkspaceScopeType !== 'finance') return null
    const totalValue = typeof selectedTask.valueAmount === 'number' && Number.isFinite(selectedTask.valueAmount) ? selectedTask.valueAmount : 0
    const currency = selectedTask.valueCurrency || 'OMR'
    let usedValue = 0
    for (const item of (selectedTask.checklist || [])) {
      if (typeof item.valueAmount === 'number' && Number.isFinite(item.valueAmount)) {
        usedValue += item.valueAmount
      }
    }
    const remaining = totalValue - usedValue
    return { totalValue, usedValue, remaining, currency }
  }, [selectedTask, selectedWorkspaceScopeType])

  const relatedProjectId = selectedTask?.projectId || (selectedProjectId !== 'all' ? selectedProjectId : '')
  const relatedDocumentsForSelection = useMemo(() => {
    if (!relatedProjectId) return []
    return workspaceDocumentsByProjectId[relatedProjectId] || []
  }, [relatedProjectId, workspaceDocumentsByProjectId])
  const relatedNotesForSelection = useMemo(
    () => relatedDocumentsForSelection.filter((item: any) => item.type === 'note'),
    [relatedDocumentsForSelection],
  )
  const relatedDocsForSelection = useMemo(
    () => relatedDocumentsForSelection.filter((item: any) => item.type !== 'note'),
    [relatedDocumentsForSelection],
  )
  const relatedMoodBoardsForSelection = useMemo(() => {
    if (!selectedWorkspaceMoodBoardEnabled || !relatedProjectId) return []
    return workspaceMoodBoardsByProjectId[relatedProjectId] || []
  }, [relatedProjectId, selectedWorkspaceMoodBoardEnabled, workspaceMoodBoardsByProjectId])
  const relatedSelectionItemCount = relatedDocsForSelection.length + relatedNotesForSelection.length + relatedMoodBoardsForSelection.length
  const hasRelatedSelectionItems = relatedSelectionItemCount > 0

  const taskDiscussionNotifyCandidateUids = useMemo(() => {
    if (!selectedTask) return [] as string[]
    const priorCommenterUids = taskComments.map((item) => item.authorUid)
    const projectAssignableUids = (assignableMembersByProjectId[selectedTask.projectId] || workspaceAssignableMembers).map((item: any) => item.uid)
    const workspaceScopedUids = normalizeMemberUids(projectAssignableUids)
    const restrictedScopedUids = normalizeMemberUids([
      ...workspaceScopedUids,
      ...(selectedTask.memberUids || []),
      selectedTask.assigneeUid,
      selectedTask.createdBy,
    ])
    const scopedUids = selectedTask.visibility === 'restricted' ? restrictedScopedUids : workspaceScopedUids
    return normalizeMemberUids([
      ...scopedUids,
      ...priorCommenterUids,
      ...(selectedTask.assigneeUids || []),
      selectedTask.assigneeUid,
      selectedTask.createdBy,
    ]).filter((uid) => uid !== currentUid)
  }, [assignableMembersByProjectId, currentUid, selectedTask, taskComments, workspaceAssignableMembers])
  const taskDiscussionNotifyCandidates = useMemo(
    () => taskDiscussionNotifyCandidateUids.map((uid) => ({
      uid,
      label: memberByUid[uid]?.displayName || memberByUid[uid]?.email || uid,
    })),
    [memberByUid, taskDiscussionNotifyCandidateUids],
  )
  const timelineQuickAddStatusId = useMemo(() => {
    if (selectedTaskStatusTab !== 'all') return selectedTaskStatusTab
    return selectedProjectEffectiveTaskStatuses[0]?.id || ''
  }, [selectedProjectEffectiveTaskStatuses, selectedTaskStatusTab])
  const timelineQuickAddProjectId = useMemo(
    () => (selectedProjectId !== 'all' ? selectedProjectId : quickAddDefaultProjectId),
    [quickAddDefaultProjectId, selectedProjectId],
  )
  const taskDiscussionNotifyCandidateUidSet = useMemo(
    () => new Set(taskDiscussionNotifyCandidateUids),
    [taskDiscussionNotifyCandidateUids],
  )
  const selectedTaskStoredNotify = useMemo(() => {
    if (!selectedTask) {
      return {
        mode: 'all' as const,
        uids: [] as string[],
      }
    }
    const storedUids = normalizeMemberUids(
      Array.isArray(selectedTask.notifyUids) && selectedTask.notifyUids.length > 0
        ? selectedTask.notifyUids
        : [...(selectedTask.assigneeUids || []), selectedTask.assigneeUid, selectedTask.createdBy, ...(selectedTask.memberUids || [])],
    ).filter((uid) => uid !== currentUid)
    return {
      mode: selectedTask.notifyMode || (storedUids.length > 0 ? 'selected' : 'all'),
      uids: storedUids,
    }
  }, [currentUid, selectedTask])
  const resolveTaskDiscussionNotificationRecipients = useCallback(() => {
    if (taskDiscussionNotifyMode === 'none') return [] as string[]
    if (taskDiscussionNotifyMode === 'selected') {
      return normalizeMemberUids(taskDiscussionNotifyUids.filter((uid) => taskDiscussionNotifyCandidateUidSet.has(uid)))
    }
    return taskDiscussionNotifyCandidateUids
  }, [taskDiscussionNotifyCandidateUidSet, taskDiscussionNotifyCandidateUids, taskDiscussionNotifyMode, taskDiscussionNotifyUids])

  const handleStartTaskCommentEdit = useCallback((comment: WorkhubTaskComment) => {
    if (!currentUid || comment.authorUid !== currentUid) return
    setTaskEditingCommentId(comment.id)
    setTaskEditingCommentText(comment.body || '')
  }, [currentUid])
  const handleCancelTaskCommentEdit = useCallback(() => {
    setTaskEditingCommentId('')
    setTaskEditingCommentText('')
  }, [])
  const handleSaveTaskCommentEdit = useCallback(async (comment: WorkhubTaskComment) => {
    if (!currentUid || comment.authorUid !== currentUid) return
    const nextBody = taskEditingCommentText.trim()
    if (!nextBody || nextBody === (comment.body || '').trim()) {
      handleCancelTaskCommentEdit()
      return
    }
    setTaskDiscussionBusyKey(`comment-edit:${comment.id}`)
    try {
      await updateWorkhubComment(comment.id, { body: nextBody })
      handleCancelTaskCommentEdit()
    } finally {
      setTaskDiscussionBusyKey('')
    }
  }, [currentUid, handleCancelTaskCommentEdit, taskEditingCommentText])
  const handleDeleteTaskComment = useCallback(async (comment: WorkhubTaskComment) => {
    if (!currentUid || comment.authorUid !== currentUid) return
    setTaskDiscussionBusyKey(`comment-delete:${comment.id}`)
    try {
      await deleteWorkhubComment(comment.id)
      if (taskEditingCommentId === comment.id) {
        handleCancelTaskCommentEdit()
      }
    } finally {
      setTaskDiscussionBusyKey('')
    }
  }, [currentUid, handleCancelTaskCommentEdit, taskEditingCommentId])
  const handleSendTaskComment = useCallback(async (nextCommentBody: string) => {
    if (!selectedTask) return
    const normalizedCommentBody = nextCommentBody.trim()
    if (!normalizedCommentBody) return
    setTaskDiscussionBusyKey('comment')
    try {
      await handleAddTaskComment(selectedTask, normalizedCommentBody, resolveTaskDiscussionNotificationRecipients())
    } finally {
      setTaskDiscussionBusyKey('')
    }
  }, [handleAddTaskComment, resolveTaskDiscussionNotificationRecipients, selectedTask])

  const taskDiscussionCardNode = selectedTask ? (
    <WorkhubDiscussionCard
      title="Task discussion"
      comments={taskComments}
      currentUid={currentUid}
      memberByUid={memberByUid}
      showAuthorAvatar
      formatTime={formatTime}
      editingId={taskEditingCommentId}
      editingText={taskEditingCommentText}
      onEditStart={handleStartTaskCommentEdit}
      onEditChange={setTaskEditingCommentText}
      onEditCancel={handleCancelTaskCommentEdit}
      onEditSave={handleSaveTaskCommentEdit}
      onDelete={handleDeleteTaskComment}
      editBusyKey={taskDiscussionBusyKey}
      deleteBusyKey={taskDiscussionBusyKey}
      onComposerSend={handleSendTaskComment}
      composerBusy={taskDiscussionBusyKey === 'comment'}
      dockedComposer={useTaskDetailDialog}
      notifyMode={taskDiscussionNotifyMode}
      notifyUids={taskDiscussionNotifyUids}
      notifyCandidates={taskDiscussionNotifyCandidates}
      onNotifyModeChange={setTaskDiscussionNotifyMode}
      onNotifyUidsChange={setTaskDiscussionNotifyUids}
      hasMoreOlderMessages={taskDiscussionHasMoreOlder}
      onLoadMoreOlderMessages={() => setTaskDiscussionFetchLimit((current) => current + TASK_DISCUSSION_PAGE_SIZE)}
      threadKey={`task:${selectedTask.id}`}
    />
  ) : null

  useEffect(() => {
    setTaskEditingCommentId('')
    setTaskEditingCommentText('')
    setTaskDiscussionBusyKey('')
    setTaskDiscussionFetchLimit(TASK_DISCUSSION_PAGE_SIZE)
    setTaskDiscussionHasMoreOlder(false)
    setTaskAttachmentsCollapsed(false)
    setDetailMenuOpen('')
    if (!selectedTask) {
      setTaskDeleteConfirmOpen(false)
    }
  }, [selectedTask?.id, setDetailMenuOpen, setTaskAttachmentsCollapsed, setTaskDeleteConfirmOpen])

  useEffect(() => {
    if (!selectedTask) {
      setTaskComments([])
      setTaskDiscussionHasMoreOlder(false)
      return
    }
    const unsubComments = subscribeWorkhubCommentsByEntity(
      'task',
      selectedTask.id,
      setTaskComments,
      {
        maxCount: taskDiscussionFetchLimit,
        onHasMore: setTaskDiscussionHasMoreOlder,
      },
    )
    return () => unsubComments()
  }, [selectedTask?.id, taskDiscussionFetchLimit])

  useEffect(() => {
    const targetKey = selectedTask ? `task:${selectedTask.id}` : ''
    const nextUids = normalizeMemberUids(
      selectedTaskStoredNotify.uids.filter((uid) => taskDiscussionNotifyCandidateUidSet.has(uid)),
    )
    setTaskDiscussionNotifyMode(selectedTaskStoredNotify.mode)
    setTaskDiscussionNotifyUids(nextUids)
    setTaskDiscussionNotifyOwnerKey(targetKey)
  }, [selectedTask, selectedTaskStoredNotify, taskDiscussionNotifyCandidateUidSet])

  useEffect(() => {
    setTaskDiscussionNotifyUids((current) => current.filter((uid) => taskDiscussionNotifyCandidateUidSet.has(uid)))
  }, [taskDiscussionNotifyCandidateUidSet])

  useEffect(() => {
    if (!selectedTask) return
    const targetKey = `task:${selectedTask.id}`
    if (taskDiscussionNotifyOwnerKey !== targetKey) return
    const nextUids = normalizeMemberUids(taskDiscussionNotifyUids.filter((uid) => taskDiscussionNotifyCandidateUidSet.has(uid)))
    const storedUids = normalizeMemberUids(
      selectedTaskStoredNotify.uids.filter((uid) => taskDiscussionNotifyCandidateUidSet.has(uid)),
    )
    if (taskDiscussionNotifyMode === selectedTaskStoredNotify.mode && nextUids.join('|') === storedUids.join('|')) {
      return
    }
    void handleTaskUpdate(selectedTask, { notifyMode: taskDiscussionNotifyMode, notifyUids: nextUids }, { silent: true })
  }, [
    handleTaskUpdate,
    selectedTask,
    selectedTaskStoredNotify,
    taskDiscussionNotifyCandidateUidSet,
    taskDiscussionNotifyMode,
    taskDiscussionNotifyOwnerKey,
    taskDiscussionNotifyUids,
  ])

  useEffect(() => {
    if (!selectedTaskId) return
    if (visibleTasks.some((item: any) => item.id === selectedTaskId)) return
    setSelectedTaskId('')
  }, [selectedTaskId, setSelectedTaskId, visibleTasks])

  useEffect(() => {
    if (!selectedTaskId) return
    const unreadTaskCommentNotifications = notifications.filter(
      (item: any) => !item.read && item.entityType === 'comment' && item.entityId === selectedTaskId,
    )
    if (unreadTaskCommentNotifications.length === 0) return
    void Promise.all(unreadTaskCommentNotifications.map((item: any) => markWorkhubNotificationRead(item.id).catch(() => undefined)))
  }, [markWorkhubNotificationRead, notifications, selectedTaskId])

  useEffect(() => {
    if (typeof onMobileTaskDetailOpenChange !== 'function') return
    onMobileTaskDetailOpenChange(Boolean(!useTaskDetailDialog && isMobileWorkhubLayout && selectedTask))
    return () => {
      onMobileTaskDetailOpenChange(false)
    }
  }, [isMobileWorkhubLayout, onMobileTaskDetailOpenChange, selectedTask, useTaskDetailDialog])

  const taskDetailPanelNode = selectedTask ? (
    <WorkhubTaskDetailPanel
      isMobileWorkhubLayout={isMobileWorkhubLayout && !useTaskDetailDialog}
      showStandaloneHeader={!useTaskDetailDialog}
      selectedTask={selectedTask}
      setSelectedTaskId={setSelectedTaskId}
      setTaskDeleteConfirmOpen={setTaskDeleteConfirmOpen}
      detailMenuOpen={detailMenuOpen}
      setDetailMenuOpen={setDetailMenuOpen}
      setDetailMenuCoords={setDetailMenuCoords}
      selectedProjectEffectiveTaskStatuses={selectedProjectEffectiveTaskStatuses}
      PRIORITY_LABELS={PRIORITY_LABELS}
      memberByUid={memberByUid}
      selectedTaskAssignableMembers={selectedTaskAssignableMembers}
      formatDueDateShort={formatDueDateShort}
      selectedTaskFinanceInfo={selectedTaskFinanceInfo}
      handleSelectedTaskValueSave={handleSelectedTaskValueSave}
      handleSelectedTaskTitleSave={handleSelectedTaskTitleSave}
      handleSelectedTaskDescriptionSave={handleSelectedTaskDescriptionSave}
      selectedTaskParentEntityLabel={selectedTaskParentEntityLabel}
      projectNameById={projectNameById}
      formatTime={formatTime}
      buildChecklist={buildChecklist}
      getChecklistDetailKey={getChecklistDetailKey}
      expandedChecklistDetailKeys={expandedChecklistDetailKeys}
      toggleChecklistItemDetails={toggleChecklistItemDetails}
      editingChecklistScope={editingChecklistScope}
      editingChecklistTaskId={editingChecklistTaskId}
      editingChecklistItemId={editingChecklistItemId}
      editingChecklistItemText={editingChecklistItemText}
      setEditingChecklistItemText={setEditingChecklistItemText}
      handleChecklistItemToggle={handleChecklistItemToggle}
      handleChecklistItemEditStart={handleChecklistItemEditStart}
      handleChecklistItemEditSave={handleChecklistItemEditSave}
      handleChecklistItemEditCancel={handleChecklistItemEditCancel}
      handleChecklistRemove={handleChecklistRemove}
      checklistDetailsDrafts={checklistDetailsDrafts}
      setChecklistDetailsDrafts={setChecklistDetailsDrafts}
      handleChecklistItemDetailsSave={handleChecklistItemDetailsSave}
      checklistAttachmentDrafts={checklistAttachmentDrafts}
      setChecklistAttachmentDrafts={setChecklistAttachmentDrafts}
      handleChecklistAttachmentAdd={handleChecklistAttachmentAdd}
      handleChecklistAttachmentFileUpload={handleChecklistAttachmentFileUpload}
      uploadingChecklistAttachmentKey={uploadingChecklistAttachmentKey}
      attachmentViewMode={attachmentViewMode}
      isImageAttachmentUrl={isImageAttachmentUrl}
      openAttachmentLightbox={openAttachmentLightbox}
      attachmentReviews={attachmentReviews}
      handleChecklistAttachmentRemove={handleChecklistAttachmentRemove}
      checklistLinkDrafts={checklistLinkDrafts}
      setChecklistLinkDrafts={setChecklistLinkDrafts}
      handleChecklistLinkAdd={handleChecklistLinkAdd}
      handleChecklistLinkRemove={handleChecklistLinkRemove}
      taskChecklistDrafts={taskChecklistDrafts}
      setTaskChecklistDrafts={setTaskChecklistDrafts}
      selectedWorkspaceScopeType={selectedWorkspaceScopeType}
      taskChecklistValueDrafts={taskChecklistValueDrafts}
      setTaskChecklistValueDrafts={setTaskChecklistValueDrafts}
      handleChecklistAdd={handleChecklistAdd}
      busyKey={busyKey}
      handleTaskUpdate={handleTaskUpdate}
      taskDiscussionNode={taskDiscussionCardNode}
      taskAttachmentsCollapsed={taskAttachmentsCollapsed}
      setTaskAttachmentsCollapsed={setTaskAttachmentsCollapsed}
      setAttachmentViewMode={setAttachmentViewMode}
      taskAttachmentTitleDrafts={taskAttachmentTitleDrafts}
      setTaskAttachmentTitleDrafts={setTaskAttachmentTitleDrafts}
      taskAttachmentDrafts={taskAttachmentDrafts}
      setTaskAttachmentDrafts={setTaskAttachmentDrafts}
      taskAttachmentFilePathDrafts={taskAttachmentFilePathDrafts}
      taskAttachmentFileDrafts={taskAttachmentFileDrafts}
      setTaskAttachmentFileDrafts={setTaskAttachmentFileDrafts}
      setTaskAttachmentFilePathDrafts={setTaskAttachmentFilePathDrafts}
      uploadingTaskAttachmentId={uploadingTaskAttachmentId}
      handleTaskAttachmentAdd={handleTaskAttachmentAdd}
      handleTaskAttachmentFileUpload={handleTaskAttachmentFileUpload}
      getTaskAttachments={getTaskAttachments}
      getTaskAttachmentTitle={getTaskAttachmentTitle}
      handleTaskAttachmentRemove={handleTaskAttachmentRemove}
      getTaskLinks={getTaskLinks}
      taskLinkTitleDrafts={taskLinkTitleDrafts}
      setTaskLinkTitleDrafts={setTaskLinkTitleDrafts}
      taskLinkDrafts={taskLinkDrafts}
      setTaskLinkDrafts={setTaskLinkDrafts}
      handleTaskLinkAdd={handleTaskLinkAdd}
      taskLinkEditingDrafts={taskLinkEditingDrafts}
      handleTaskLinkEditCancel={handleTaskLinkEditCancel}
      getTaskLinkTitle={getTaskLinkTitle}
      getUrlHostLabel={getUrlHostLabel}
      getInitials={getInitials}
      handleTaskLinkEditStart={handleTaskLinkEditStart}
      handleTaskLinkRemove={handleTaskLinkRemove}
      milestones={milestones}
      onLinkTaskToMilestone={onLinkTaskToMilestone}
    />
  ) : null

  return (
    <>
      <main className={`workhub-content-area workhub-detail-rail-${contentDetailRailMode}`} style={contentAreaStyle}>
        <div className="workhub-task-main-column">
          {!useTaskDetailDialog && !isMobileWorkhubLayout && detailRailMode === 'hidden' && (
            <div className="workhub-detail-rail-restore-wrap">
              <button
                type="button"
                className="workhub-detail-rail-restore-btn"
                onClick={setDetailRailExpanded}
                title="Show details panel"
              >
                Show details
              </button>
            </div>
          )}
          <div className={`workhub-task-sections compact-sections task-view-${taskItemDisplayMode}`}>
            {taskContextTrail.length > 0 && (() => {
              const currentContextProject = taskContextTrail[taskContextTrail.length - 1]
              const breadcrumbProjects = taskContextTrail.slice(0, -1)
              const currentContextIcon = currentContextProject ? (projectIntentMetaById[currentContextProject.id]?.icon || '📁') : '📁'

              return (
                <div className="workhub-task-context-strip" role="navigation" aria-label="Current item path">
                  {breadcrumbProjects.length > 0 && (
                    <div className="workhub-task-context-path">
                      {breadcrumbProjects.map((project: any, index: number) => {
                        const isLastBreadcrumb = index === breadcrumbProjects.length - 1
                        const icon = projectIntentMetaById[project.id]?.icon || '📁'
                        const iconKind = icon === '🚀' ? 'project' : 'folder'
                        return (
                          <div key={project.id} className="workhub-task-context-node-wrap">
                            <button
                              type="button"
                              className="workhub-task-context-node"
                              onClick={() => handleSelectProject(project.id)}
                              title={project.name}
                            >
                              <span className={`workhub-task-context-node-icon is-${iconKind}-kind`} aria-hidden="true">{icon}</span>
                              <span className="workhub-task-context-node-text">
                                <span className="workhub-task-context-node-title">{project.name}</span>
                              </span>
                            </button>
                            {!isLastBreadcrumb && <span className="workhub-task-context-sep" aria-hidden="true">›</span>}
                          </div>
                        )
                      })}
                    </div>
                  )}
                  <div className="workhub-task-context-current">
                    <div className="workhub-task-context-current-title">
                      <span className="workhub-task-context-current-icon" aria-hidden="true">{currentContextIcon}</span>
                      <span>{currentContextProject?.name || selectedWorkspaceDisplayName || 'Workspace overview'}</span>
                    </div>
                    {(selectedProjectPeriodLabel || selectedProjectSubmissionTimeLabel) && (
                      <div className="workhub-task-context-current-meta" title="Current item details">
                        {selectedProjectPeriodLabel && <span><strong>Period:</strong> {selectedProjectPeriodLabel}</span>}
                        {selectedProjectSubmissionTimeLabel && <span className="workhub-ltr-token"><strong>Time:</strong> {selectedProjectSubmissionTimeLabel}</span>}
                      </div>
                    )}
                  </div>
                </div>
              )
            })()}
            {selectedProjectId !== 'all' && Array.isArray(milestones) && milestones.length > 0 && (() => {
              const activeMilestones = milestones.filter((ms: any) => ms.status !== 'completed')
              if (activeMilestones.length === 0) return null
              const today = new Date()
              today.setHours(0, 0, 0, 0)
              const STATUS_LABELS: Record<string, string> = {
                not_started: 'Not started',
                in_progress: 'In progress',
                at_risk: 'At risk',
                completed: 'Completed',
              }
              return (
                <div className="workhub-milestone-strip">
                  {activeMilestones.map((ms: any) => {
                    const prog = (milestoneProgress as Record<string, any>)?.[ms.id] ?? { total: 0, completed: 0, pct: 0 }
                    const dotColor = ms.color || '#6366f1'
                    const isOverdue = ms.dueDate && new Date(ms.dueDate) < today
                    const dueDateLabel = ms.dueDate
                      ? new Date(ms.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
                      : null
                    return (
                      <div key={ms.id} className="workhub-milestone-strip-item">
                        <span className="workhub-milestone-strip-dot" style={{ background: dotColor }} />
                        <span className="workhub-milestone-strip-name">{ms.name}</span>
                        <span className="workhub-milestone-strip-status">{STATUS_LABELS[ms.status] ?? ms.status}</span>
                        <div className="workhub-milestone-strip-progress-wrap">
                          <div className="workhub-milestone-strip-progress-track">
                            <div className="workhub-milestone-strip-progress-fill" style={{ width: `${prog.pct}%`, background: dotColor }} />
                          </div>
                          <span className="workhub-milestone-strip-pct">{prog.pct}%</span>
                        </div>
                        {dueDateLabel && (
                          <span className={`workhub-milestone-strip-due${isOverdue ? ' is-overdue' : ''}`}>
                            {isOverdue ? '⚠ ' : ''}{dueDateLabel}
                          </span>
                        )}
                        {onMilestoneStatusChange && ms.status === 'not_started' && (
                          <button type="button" className="workhub-milestone-strip-btn is-activate" onClick={() => (onMilestoneStatusChange as any)(ms.id, 'in_progress')} title="Activate">▶</button>
                        )}
                        {onMilestoneStatusChange && (ms.status === 'in_progress' || ms.status === 'at_risk') && (
                          <button type="button" className="workhub-milestone-strip-btn is-complete" onClick={() => (onMilestoneStatusChange as any)(ms.id, 'completed')} title="Mark complete">✓</button>
                        )}
                      </div>
                    )
                  })}
                </div>
              )
            })()}
            <div className="workhub-status-tabs">
              {(() => {
                const visibleStatusTabs = selectedProjectEffectiveTaskStatuses.filter((status: any, index: number) => (
                  index === 0
                  || (taskFilterBaseTaskCountByStatus[status.id] || 0) > 0
                  || selectedTaskStatusTab === status.id
                ))
                const showAllTab = visibleStatusTabs.length > 1
                const allTaskCount = taskFilterBaseTasks.length

                return (
                  <>
                    {showAllTab && (
                      <button
                        type="button"
                        className={`workhub-status-tab${selectedTaskStatusTab === 'all' ? ' is-active' : ''}`}
                        onClick={() => setSelectedTaskStatusTab('all')}
                        data-status-color="backlog"
                        style={{ ['--status-color' as string]: '#6b7280' }}
                      >
                        {`All (${allTaskCount})`}
                      </button>
                    )}
                    {visibleStatusTabs.map((status: any) => {
                      const statusTaskCount = taskFilterBaseTaskCountByStatus[status.id] || 0
                      return (
                        <button
                          key={status.id}
                          type="button"
                          className={`workhub-status-tab${selectedTaskStatusTab === status.id ? ' is-active' : ''}`}
                          onClick={() => setSelectedTaskStatusTab(status.id)}
                          data-status-color={status.id}
                          style={{ ['--status-color' as string]: status.color }}
                        >
                          {`${status.label} (${statusTaskCount})`}
                        </button>
                      )
                    })}
                    {completedStatusForHighlight && completedHighlightCount > 0 && (
                      <button
                        type="button"
                        className={`workhub-completed-highlight${selectedTaskStatusTab === completedStatusForHighlight.id ? ' is-active' : ''}`}
                        onClick={() => setSelectedTaskStatusTab((current: any) => current === completedStatusForHighlight.id ? 'all' : completedStatusForHighlight.id)}
                        title="Open completed tasks"
                      >
                        <span className="workhub-completed-highlight-icon" aria-hidden="true">✓</span>
                        <span>{`Team wins ${completedHighlightCount}`}</span>
                        {selectedTaskStatusTab === completedStatusForHighlight.id ? (
                          <span className="workhub-completed-highlight-cta">Back to board</span>
                        ) : (
                          <span className="workhub-completed-highlight-cta">View completed</span>
                        )}
                      </button>
                    )}
                    <div className="workhub-task-view-switch" role="group" aria-label="Task view mode">
                      {([
                        { mode: 'list', label: 'List' },
                        { mode: 'cards', label: 'Cards' },
                        { mode: 'grid', label: 'Grid' },
                        { mode: 'timeline', label: 'Timeline' },
                      ] as const).map((view) => {
                        const targetProjectName = quickTaskViewTargetProject?.name || ''
                        const disabled = !quickTaskViewTargetProject || busyKey === `task-view:${quickTaskViewTargetProject.id}`
                        const title = quickTaskViewTargetProject
                          ? `Switch to ${view.label} view (applies to ${targetProjectName})`
                          : 'Select a folder to change task view mode'
                        return (
                          <button
                            key={view.mode}
                            type="button"
                            className={`workhub-task-view-btn${taskItemDisplayMode === view.mode ? ' is-active' : ''}`}
                            onClick={() => { void handleQuickTaskViewModeChange(view.mode) }}
                            title={title}
                            aria-label={`Switch task view to ${view.label}`}
                            disabled={disabled}
                          >
                            {view.label}
                          </button>
                        )
                      })}
                    </div>
                  </>
                )
              })()}
              <div className="workhub-task-filter-wrap">
                <button
                  type="button"
                  className={`workhub-status-manage-btn workhub-task-filter-btn${activeTaskFilterCount > 0 ? ' is-active' : ''}`}
                  onClick={() => setTaskFilterMenuOpen((current: boolean) => !current)}
                  aria-label="Filter tasks"
                  title="Filter tasks"
                >
                  <span className="workhub-task-filter-icon" aria-hidden="true" />
                  {activeTaskFilterCount > 0 && <span className="workhub-task-filter-badge">{activeTaskFilterCount}</span>}
                </button>
                {taskFilterMenuOpen && (
                  <div className="workhub-task-filter-menu">
                    <div className="workhub-task-filter-menu-head">
                      <strong>Task filters</strong>
                      {activeTaskFilterCount > 0 && (
                        <button
                          type="button"
                          className="workhub-task-filter-clear"
                          onClick={() => {
                            setTaskFilterRequireAttachments(false)
                            setTaskFilterRequireChecklist(false)
                            setTaskFilterPriority('all')
                          }}
                        >
                          Clear
                        </button>
                      )}
                    </div>
                    <label className="workhub-task-filter-check">
                      <input name="taskFilterRequireAttachments" type="checkbox" checked={taskFilterRequireAttachments} onChange={(event) => setTaskFilterRequireAttachments(event.target.checked)} />
                      <span>Has attachments</span>
                    </label>
                    <label className="workhub-task-filter-check">
                      <input name="taskFilterRequireChecklist" type="checkbox" checked={taskFilterRequireChecklist} onChange={(event) => setTaskFilterRequireChecklist(event.target.checked)} />
                      <span>Has checklist</span>
                    </label>
                    <div className="workhub-task-filter-group">
                      <span>Priority</span>
                      <div className="workhub-task-filter-priority-row">
                        {(['all', 'urgent', 'high', 'medium', 'low'] as const).map((value) => (
                          <button
                            key={value}
                            type="button"
                            className={`workhub-task-filter-pill${taskFilterPriority === value ? ' is-active' : ''}`}
                            onClick={() => setTaskFilterPriority(value)}
                          >
                            {value === 'all' ? 'Any' : PRIORITY_LABELS[value]}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
              {selectedTaskCount > 0 && (
                <>
                  <button
                    type="button"
                    className="workhub-status-manage-btn workhub-bulk-clear-inline-btn"
                    onClick={clearTaskSelection}
                    aria-label="Clear selected tasks"
                    title="Clear selected tasks"
                  >
                    Clear
                  </button>
                  <div className="workhub-bulk-status-wrap">
                    <button
                      type="button"
                      className="workhub-status-manage-btn workhub-bulk-status-btn"
                      onClick={() => setBulkStatusMenuOpen((current: boolean) => !current)}
                      aria-label="Bulk change status"
                      title="Bulk change status"
                    >
                      ⇆
                    </button>
                    {bulkStatusMenuOpen && (
                      <div className="workhub-bulk-status-menu">
                        {selectedProjectEffectiveTaskStatuses.map((status: any) => (
                          <button key={status.id} type="button" onClick={() => void handleBulkStatusChange(status.id)}>
                            <span className="status-dot" style={{ ['--status-color' as string]: status.color }} />
                            <span>{status.label}</span>
                          </button>
                        ))}
                        <button type="button" className="workhub-bulk-clear-btn" onClick={clearTaskSelection}>Clear selection</button>
                      </div>
                    )}
                  </div>
                  <div className="workhub-bulk-assignee-wrap">
                    <button
                      type="button"
                      className="workhub-status-manage-btn workhub-bulk-assignee-btn"
                      onClick={() => {
                        setBulkAssigneeMenuOpen((current: boolean) => {
                          const next = !current
                          if (next) {
                            setBulkAssigneeDraftUids(Array.isArray(bulkUnionAssigneeUids) ? [...bulkUnionAssigneeUids] : [])
                          }
                          return next
                        })
                      }}
                      aria-label="Bulk assign selected tasks"
                      title="Bulk assign selected tasks"
                    >
                      👥
                    </button>
                    {bulkAssigneeMenuOpen && (
                      <div className="workhub-bulk-assignee-menu">
                        <div className="workhub-bulk-assignee-legend" aria-live="polite">
                          <span><strong>common</strong> = all selected</span>
                          <span><strong>partial</strong> = some selected</span>
                        </div>
                        <button
                          type="button"
                          className={`workhub-composer-notify-option${bulkAssigneeDraftUids.length === 0 ? ' is-active' : ''}`}
                          onClick={() => setBulkAssigneeDraftUids([])}
                        >
                          No one
                        </button>
                        <div className="workhub-composer-notify-divider" />
                        {bulkAssignableMembers.map((item: any) => {
                          const checked = bulkAssigneeDraftUids.includes(item.uid)
                          const coverageCount = Number(bulkAssigneeCoverageByUid?.[item.uid] || 0)
                          const hasCoverage = coverageCount > 0 && selectedTaskCount > 0
                          const isCommon = hasCoverage && coverageCount === selectedTaskCount
                          return (
                            <label key={item.uid} className="workhub-composer-notify-check">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => {
                                  setBulkAssigneeDraftUids((current: string[]) => {
                                    if (current.includes(item.uid)) return current.filter((uid) => uid !== item.uid)
                                    return [...current, item.uid]
                                  })
                                }}
                              />
                              <span className="workhub-bulk-assignee-option-text">{item.displayName || item.email || item.uid}</span>
                              {hasCoverage && (
                                <span className={`workhub-bulk-assignee-coverage-badge${isCommon ? ' is-common' : ' is-partial'}`}>
                                  {isCommon ? 'common' : `partial ${coverageCount}/${selectedTaskCount}`}
                                </span>
                              )}
                            </label>
                          )
                        })}
                        <div className="workhub-composer-notify-divider" />
                        <button
                          type="button"
                          className="workhub-composer-notify-option is-active"
                          onClick={() => void handleBulkAssigneeChange(bulkAssigneeDraftUids)}
                        >
                          Apply assignees
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    className="workhub-status-manage-btn workhub-bulk-delete-btn"
                    onClick={() => setBulkDeleteConfirmOpen(true)}
                    aria-label="Delete selected tasks"
                    title="Delete selected tasks"
                  >
                    🗑
                  </button>
                </>
              )}
            </div>
            <div className={`workhub-task-table-wrap task-view-${taskItemDisplayMode}${selectedWorkspaceScopeType === 'finance' ? ' is-finance' : ''}`}>
              {selectedWorkspaceScopeType === 'finance' && taskItemDisplayMode !== 'timeline' && (
                <div className="workhub-task-table-head shared">
                  <span className="workhub-select-all-head">
                    <input
                      type="checkbox"
                      checked={selectedTaskCount > 0 && selectedTaskCount === filteredTasks.length}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedTaskIds(filteredTasks.map((t: any) => t.id))
                        else setSelectedTaskIds([])
                      }}
                      aria-label="Select all tasks"
                    />
                    Task name
                  </span>
                  <span>Value</span>
                  <span>Assignee</span>
                  <span>Due date</span>
                  <span>Priority</span>
                  <span>Items</span>
                </div>
              )}
              {taskItemDisplayMode === 'timeline' ? (
                <WorkhubTaskTimeline
                  filteredTasks={filteredTasks}
                  memberByUid={memberByUid}
                  selectedProjectEffectiveTaskStatuses={selectedProjectEffectiveTaskStatuses}
                  selectedTaskId={selectedTaskId}
                  setSelectedTaskId={setSelectedTaskId}
                  onRowContextMenu={(taskId, x, y) => {
                    setTaskContextMenuState({ taskId, x, y })
                  }}
                  handleTaskUpdate={handleTaskUpdate}
                  quickAddStatusId={timelineQuickAddStatusId}
                  quickAddProjectId={timelineQuickAddProjectId}
                  currentUid={currentUid}
                  handleQuickAddTask={handleQuickAddTask}
                />
              ) : (() => {
                return renderedTaskStatuses
                  .map((status: any) => ({
                    status,
                    statusTasks: renderedTaskListsByStatus[status.id] || [],
                    statusTaskCount: filteredTaskCountByStatus[status.id] || 0,
                  }))
                  .map(({ status, statusTasks, statusTaskCount }: any) => {
                    const statusIsCollapsible = collapsibleStatusIdSet.has(status.id)
                    const statusIsExpanded = !statusIsCollapsible || selectedTaskStatusTab !== 'all' || expandedTaskStatusIds.includes(status.id)
                    const isCollapsedCollapsible = statusIsCollapsible && !statusIsExpanded && selectedTaskStatusTab === 'all'
                    return (
                      <section key={status.id} className={`workhub-task-group compact-group${statusIsCollapsible ? ' is-collapsible' : ''}${isCollapsedCollapsible ? ' is-collapsed' : ''}`}>
                        <div
                          className="workhub-task-group-head"
                          onClick={() => {
                            if (!statusIsCollapsible || selectedTaskStatusTab !== 'all') return
                            setExpandedTaskStatusIds((current: string[]) => current.includes(status.id)
                              ? current.filter((item) => item !== status.id)
                              : [...current, status.id])
                          }}
                        >
                          <div className="workhub-task-group-head-left">
                            {isCollapsedCollapsible && <span className="workhub-task-group-done-icon" aria-hidden="true">✓</span>}
                            <h3 style={{ '--status-color': status.color } as any}>{status.label}</h3>
                            {isCollapsedCollapsible && statusTaskCount > 0 && (
                              <span className="workhub-task-group-done-hint">— {statusTaskCount} task{statusTaskCount === 1 ? '' : 's'} completed</span>
                            )}
                            {selectedWorkspaceScopeType === 'finance' && (financeStatusTotals[status.id] ?? 0) > 0 && (
                              <span className="workhub-task-group-total">
                                {financeWorkspaceCurrency} {(financeStatusTotals[status.id] ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            className="workhub-task-group-toggle"
                            onClick={(e) => {
                              e.stopPropagation()
                              if (!statusIsCollapsible || selectedTaskStatusTab !== 'all') return
                              setExpandedTaskStatusIds((current: string[]) => current.includes(status.id)
                                ? current.filter((item) => item !== status.id)
                                : [...current, status.id])
                            }}
                            title={statusIsExpanded ? 'Collapse status' : 'Expand status'}
                            aria-label={statusIsExpanded ? `Collapse ${status.label}` : `Expand ${status.label}`}
                          >
                            <span>{statusTaskCount}</span>
                            {statusIsCollapsible && selectedTaskStatusTab === 'all' && (
                              <span className="workhub-task-group-toggle-caret" aria-hidden="true">{statusIsExpanded ? '▾' : '▸'}</span>
                            )}
                          </button>
                        </div>
                        <div className="workhub-task-group-body">
                          {statusIsExpanded && (
                            <>
                              {statusTasks.map((task: any, index: number) => (
                                <TaskRow
                                  key={task.id}
                                  task={task}
                                  dueDisplayMode={taskDueDisplayMode}
                                  displayMode={taskItemDisplayMode}
                                  index={index}
                                  isChecked={selectedTaskIdSet.has(task.id)}
                                  isSelected={selectedTaskId === task.id}
                                  isDropTarget={dropTargetKey === task.id}
                                  isDragSource={dragTaskId === task.id}
                                  statusMenuOpen={openTaskStatusMenuId === task.id}
                                  priorityMenuOpen={openTaskPriorityMenuId === task.id}
                                  moreMenuOpen={openTaskMoreMenuId === task.id}
                                  assigneeMenuOpen={openTaskAssigneeMenuId === task.id}
                                  editingTitle={editingTaskTitleId === task.id}
                                  editingTitleText={editingTaskTitleId === task.id ? editingTaskTitleText : ''}
                                  checklistExpanded={expandedTaskChecklistIdsSet.has(task.id)}
                                  checklistDraft={taskChecklistDrafts[task.id] || ''}
                                  editingChecklistItemId={editingChecklistTaskId === task.id ? editingChecklistItemId : null}
                                  editingChecklistScope={editingChecklistTaskId === task.id ? editingChecklistScope : null}
                                  editingChecklistText={editingChecklistTaskId === task.id ? editingChecklistItemText : ''}
                                  isTaskBusy={busyKey === 'task'}
                                  taskAssignee={memberByUid[task.assigneeUid]}
                                  assignableMembers={assignableMembersByProjectId[task.projectId] || workspaceAssignableMembers}
                                  taskCreator={memberByUid[task.createdBy]}
                                  meta={taskMetaById[task.id] ?? emptyTaskRowMeta}
                                  unreadCommentCount={unreadCommentCountByTaskId[task.id] || 0}
                                  isFinanceLayout={selectedWorkspaceScopeType === 'finance'}
                                  callbacks={taskRowCallbacks}
                                />
                              ))}
                              <QuickAddTaskRow
                                key={`quick-add-${status.id}`}
                                status={status}
                                assignableMembersByProjectId={assignableMembersByProjectId}
                                workspaceAssignableMembers={workspaceAssignableMembers}
                                memberByUid={memberByUid}
                                flatVisibleProjectOptions={flatVisibleProjectOptionsWithIcons}
                                defaultProjectId={quickAddDefaultProjectId}
                                selectedProjectId={selectedProjectId}
                                selectedTaskStatusTab={selectedTaskStatusTab}
                                isFinanceLayout={selectedWorkspaceScopeType === 'finance'}
                                financeCurrency={financeWorkspaceCurrency || 'OMR'}
                                currentUid={currentUid}
                                activeDragTaskId={dragTaskId}
                                activeDragStatusId={dragStatusId}
                                dropTargetKey={dropTargetKey}
                                focusTrigger={quickAddFocusStatusId === status.id ? quickAddFocusTrigger : 0}
                                onFocusHandled={() => setQuickAddFocusStatusId('')}
                                onDragOverEnd={(statusId) => setDropTargetKey(`end:${statusId}`)}
                                onDropToEnd={(statusId) => { void handleTaskReorder(dragTaskId, statusId, null) }}
                                onCommit={handleQuickAddTask}
                              />
                              {statusTaskCount > statusTasks.length && (
                                <button
                                  type="button"
                                  className="workhub-task-group-more-btn"
                                  onClick={() => setStatusTaskRenderLimitById((current: Record<string, number>) => ({
                                    ...current,
                                    [status.id]: (current[status.id] || DEFAULT_STATUS_TASK_RENDER_LIMIT) + STATUS_TASK_RENDER_INCREMENT,
                                  }))}
                                >
                                  {`Show ${Math.min(STATUS_TASK_RENDER_INCREMENT, statusTaskCount - statusTasks.length)} more (${statusTasks.length}/${statusTaskCount})`}
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </section>
                    )
                  })
              })()}
            </div>
          </div>

          {hasRelatedSelectionItems && (
            <details className="workhub-task-related-bar">
              <summary>
                <span>{selectedTask ? 'Task related items' : `${selectedProjectIntentMeta.subjectLabel} related items`}</span>
                <small>{relatedSelectionItemCount} item{relatedSelectionItemCount === 1 ? '' : 's'}</small>
              </summary>
              <div className="workhub-task-related-groups">
                {relatedDocsForSelection.length > 0 && (
                  <div className="workhub-task-related-group">
                    <h4>Documents</h4>
                    <div className="workhub-task-related-list">
                      {relatedDocsForSelection.slice(0, 8).map((item: any) => (
                        <button
                          key={item.id}
                          type="button"
                          className={`workhub-task-related-chip${selectedDocumentId === item.id ? ' is-active' : ''}`}
                          title={item.title || 'Untitled document'}
                          onClick={() => {
                            setSelectedMoodBoardId('')
                            setSelectedDocumentId(item.id)
                            setActiveSection('notes')
                          }}
                        >
                          {getWorkhubDocumentIcon(item)} {item.title || 'Untitled document'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {relatedNotesForSelection.length > 0 && (
                  <div className="workhub-task-related-group">
                    <h4>Notes</h4>
                    <div className="workhub-task-related-list">
                      {relatedNotesForSelection.slice(0, 8).map((item: any) => (
                        <button
                          key={item.id}
                          type="button"
                          className={`workhub-task-related-chip${selectedDocumentId === item.id ? ' is-active' : ''}`}
                          title={item.title || 'Untitled note'}
                          onClick={() => {
                            setSelectedMoodBoardId('')
                            setSelectedDocumentId(item.id)
                            setActiveSection('notes')
                          }}
                        >
                          {getWorkhubDocumentIcon(item)} {item.title || 'Untitled note'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {relatedMoodBoardsForSelection.length > 0 && (
                  <div className="workhub-task-related-group">
                    <h4>Mood boards</h4>
                    <div className="workhub-task-related-list">
                      {relatedMoodBoardsForSelection.slice(0, 8).map((item: any) => (
                        <button
                          key={item.id}
                          type="button"
                          className={`workhub-task-related-chip${selectedMoodBoardId === item.id ? ' is-active' : ''}`}
                          title={item.title || 'Untitled mood board'}
                          onClick={() => {
                            setSelectedDocumentId('')
                            setSelectedMoodBoardId(item.id)
                            setActiveSection('moodboard')
                          }}
                        >
                          {item.title || 'Untitled mood board'}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </details>
          )}
        </div>

        {!useTaskDetailDialog && (
          <aside
            ref={detailRailRef}
            className={`workhub-task-detail-rail${isMobileWorkhubLayout ? ' is-mobile-drawer' : ''}${isMobileWorkhubLayout && selectedTask ? ' is-open' : ''}${!isMobileWorkhubLayout ? ` is-${detailRailMode}` : ''}`}
          >
            {!isMobileWorkhubLayout && detailRailMode !== 'hidden' && (
              <button
                type="button"
                className={`workhub-task-detail-rail-resize-handle${isDetailRailResizing ? ' is-active' : ''}`}
                onPointerDown={handleDetailRailResizeStart}
                aria-label="Resize details panel"
                title="Drag to resize details panel"
              />
            )}
            {!isMobileWorkhubLayout && detailRailMode !== 'hidden' && (
              <div className="workhub-detail-rail-toolbar">
                <button
                  type="button"
                  className={`workhub-ghost-mini${detailRailMode === 'compact' ? ' is-active' : ''}`}
                  onClick={toggleDetailRailCompact}
                  title={detailRailMode === 'compact' ? 'Expand details panel' : 'Compact details panel'}
                >
                  {detailRailMode === 'compact' ? 'Expand' : 'Compact'}
                </button>
                <button
                  type="button"
                  className="workhub-ghost-mini"
                  onClick={setDetailRailHidden}
                  title="Hide details panel"
                >
                  Hide
                </button>
              </div>
            )}
            {taskDetailPanelNode ? taskDetailPanelNode : selectedProject ? (
              <WorkhubProjectDetailRail
                selectedProject={selectedProject}
                selectedProjectIntentMeta={selectedProjectIntentMeta}
                selectedProjectColorDraft={selectedProjectColorDraft}
                canEditSelectedProject={canEditSelectedProject}
                canEditProjectAttachments={canEditSelectedProjectAttachments}
                selectedProjectEffectiveIntent={selectedProjectEffectiveIntent}
                selectedProjectNameDraft={selectedProjectNameDraft}
                setSelectedProjectNameDraft={setSelectedProjectNameDraft}
                handleSaveSelectedProjectDetails={handleSaveSelectedProjectDetails}
                selectedProjectTypeDraft={selectedProjectTypeDraft}
                selectedProjectTypeOptions={selectedProjectTypeOptions}
                setSelectedProjectTypeDraft={setSelectedProjectTypeDraft}
                selectedProjectStartDateDraft={selectedProjectStartDateDraft}
                setSelectedProjectStartDateDraft={setSelectedProjectStartDateDraft}
                selectedProjectDeadlineDraft={selectedProjectDeadlineDraft}
                setSelectedProjectDeadlineDraft={setSelectedProjectDeadlineDraft}
                selectedProjectSubmissionTimeDraft={selectedProjectSubmissionTimeDraft}
                setSelectedProjectSubmissionTimeDraft={setSelectedProjectSubmissionTimeDraft}
                selectedProjectValueAmountDraft={selectedProjectValueAmountDraft}
                setSelectedProjectValueAmountDraft={setSelectedProjectValueAmountDraft}
                selectedProjectValueCurrencyDraft={selectedProjectValueCurrencyDraft}
                setSelectedProjectValueCurrencyDraft={setSelectedProjectValueCurrencyDraft}
                selectedProjectNarrativeDraft={selectedProjectNarrativeDraft}
                setSelectedProjectNarrativeDraft={setSelectedProjectNarrativeDraft}
                handleSelectedProjectDescriptionBlur={handleSelectedProjectDescriptionBlur}
                selectedProjectIntentDetailDrafts={selectedProjectIntentDetailDrafts}
                setSelectedProjectIntentDetailDrafts={setSelectedProjectIntentDetailDrafts}
                projectDiscussionNode={projectDiscussionNode}
                projectAttachmentsCollapsed={projectAttachmentsCollapsed}
                setProjectAttachmentsCollapsed={setProjectAttachmentsCollapsed}
                attachmentViewMode={attachmentViewMode}
                setAttachmentViewMode={setAttachmentViewMode}
                selectedProjectAttachmentTitleDraft={selectedProjectAttachmentTitleDraft}
                setSelectedProjectAttachmentTitleDraft={setSelectedProjectAttachmentTitleDraft}
                selectedProjectAttachmentDraft={selectedProjectAttachmentDraft}
                setSelectedProjectAttachmentDraft={setSelectedProjectAttachmentDraft}
                selectedProjectAttachmentFilePathDraft={selectedProjectAttachmentFilePathDraft}
                setSelectedProjectAttachmentFilePathDraft={setSelectedProjectAttachmentFilePathDraft}
                selectedProjectAttachmentFileDrafts={selectedProjectAttachmentFileDrafts}
                setSelectedProjectAttachmentFileDrafts={setSelectedProjectAttachmentFileDrafts}
                uploadingSelectedProjectAttachment={uploadingSelectedProjectAttachment}
                handleSelectedProjectAttachmentAdd={handleSelectedProjectAttachmentAdd}
                handleSelectedProjectAttachmentFileUpload={handleSelectedProjectAttachmentFileUpload}
                selectedProjectAttachments={selectedProjectAttachments}
                deriveAttachmentTitle={deriveAttachmentTitle}
                isImageAttachmentUrl={isImageAttachmentUrl}
                openAttachmentLightbox={openAttachmentLightbox}
                handleSelectedProjectAttachmentRemove={handleSelectedProjectAttachmentRemove}
                selectedProjectColorMenuOpen={selectedProjectColorMenuOpen}
                setSelectedProjectColorMenuOpen={setSelectedProjectColorMenuOpen}
                selectedProjectColorMeaning={selectedProjectColorMeaning}
                selectedWorkspaceProjectColorMeanings={selectedWorkspaceProjectColorMeanings}
                handleSelectedProjectColorSelect={handleSelectedProjectColorSelect}
                selectedWorkspaceDisplayName={selectedWorkspaceDisplayName}
                projectNameById={projectNameById}
                formatTime={formatTime}
                setProjectAccessDialogId={setProjectAccessDialogId}
                selectedProjectDetailsChanged={selectedProjectDetailsChanged}
                busyKey={busyKey}
              />
            ) : (
              <div className="workhub-detail-card">
                <div className="workhub-empty-state">Select a task or workspace item to view details.</div>
              </div>
            )}
          </aside>
        )}
      </main>

      {!useTaskDetailDialog && isMobileWorkhubLayout && selectedTask && (
        <button
          type="button"
          className="workhub-task-detail-drawer-backdrop"
          aria-label="Close task details"
          onClick={() => setSelectedTaskId('')}
        />
      )}

      {useTaskDetailDialog && taskDetailPanelNode && (
        <div className="workhub-modal-backdrop workhub-task-detail-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedTaskId('') }}>
          <div className="workhub-modal workhub-task-detail-dialog" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Task details">
            <div className="workhub-task-detail-dialog-head">
              <div className="workhub-task-detail-dialog-head-main">
                <strong>Task details</strong>
                {selectedTaskHeaderBreadcrumbTrail.length > 0 && (
                  <div className="workhub-task-detail-dialog-breadcrumbs" role="navigation" aria-label="Task parent path">
                    {selectedTaskHeaderBreadcrumbTrail.map((project: any, index: number) => {
                      const isWorkspaceNode = String(project.id || '').startsWith('workspace:')
                      const icon = isWorkspaceNode ? '◻' : '▹'
                      const isLast = index === selectedTaskHeaderBreadcrumbTrail.length - 1
                      return (
                        <div key={project.id} className="workhub-task-detail-dialog-breadcrumb-node-wrap">
                          <button
                            type="button"
                            className={`workhub-task-detail-dialog-breadcrumb-node${isLast ? ' is-current' : ''}`}
                            onClick={() => {
                              setSelectedTaskId('')
                              if (isWorkspaceNode) {
                                handleSelectProject('all')
                                return
                              }
                              handleSelectProject(project.id)
                            }}
                            title={project.name}
                          >
                            <span className="workhub-task-detail-dialog-breadcrumb-icon" aria-hidden="true">{icon}</span>
                            <span className="workhub-task-detail-dialog-breadcrumb-label">{project.name}</span>
                          </button>
                          {!isLast && <span className="workhub-task-detail-dialog-breadcrumb-sep" aria-hidden="true">›</span>}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
              <div className="workhub-task-detail-dialog-head-actions">
                <button
                  type="button"
                  className="workhub-task-detail-dialog-head-icon-btn workhub-ghost-btn"
                  title="Copy"
                  aria-label="Copy"
                  onClick={openTaskContextMenuFromHeader}
                  disabled={!selectedTask}
                >
                  📋
                </button>
                <button
                  type="button"
                  className="workhub-task-detail-dialog-head-icon-btn workhub-detail-delete-task-btn"
                  title="Delete task"
                  aria-label="Delete task"
                  onClick={() => setTaskDeleteConfirmOpen(true)}
                >
                  <span className="workhub-detail-danger-icon" aria-hidden="true">🗑</span>
                </button>
                <button
                  type="button"
                  className="workhub-task-detail-dialog-head-icon-btn workhub-ghost-btn"
                  title="Close"
                  aria-label="Close"
                  onClick={() => setSelectedTaskId('')}
                >
                  ✕
                </button>
              </div>
            </div>
            <div className="workhub-task-detail-dialog-body">
              {taskDetailPanelNode}
            </div>
          </div>
        </div>
      )}

      {taskContextMenuState && (
        <div
          className="workhub-task-context-menu"
          style={{
            position: 'fixed',
            left: Math.max(12, Math.min(taskContextMenuState.x, window.innerWidth - 220)),
            top: Math.max(12, Math.min(taskContextMenuState.y, window.innerHeight - 140)),
            zIndex: 2400,
          }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              if (!taskContextMenuState?.taskId) return
              setSelectedTaskId(taskContextMenuState.taskId)
              closeTaskContextMenu()
            }}
          >
            ↗ Open task
          </button>
          <button
            type="button"
            onClick={() => {
              void copyTaskUniqueToken()
            }}
          >
            📋 Copy task token
          </button>
          <button
            type="button"
            onClick={() => {
              void copyTaskDeepLink()
            }}
          >
            🔗 Copy task URL
          </button>
          <div className="workhub-task-context-menu-separator" />
          <button
            type="button"
            onClick={() => {
              if (!taskContextMenuState?.taskId) return
              openTaskMoveDialog(taskContextMenuState.taskId)
            }}
          >
            ↔ Move task...
          </button>
          <div className="workhub-task-context-menu-separator" />
          <button
            type="button"
            className="is-danger"
            onClick={() => {
              if (!taskContextMenuState?.taskId) return
              setSelectedTaskId(taskContextMenuState.taskId)
              setTaskDeleteConfirmOpen(true)
              closeTaskContextMenu()
            }}
          >
            🗑 Delete task
          </button>
          <div className="workhub-task-context-menu-separator" />
          <button type="button" onClick={closeTaskContextMenu}>✕ Cancel</button>
        </div>
      )}

      {bulkDeleteConfirmOpen && selectedTaskCount > 0 && (
        <div className="workhub-modal-backdrop workhub-delete-prompt-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && busyKey !== 'bulk-task') setBulkDeleteConfirmOpen(false) }}>
          <div className="workhub-modal workhub-delete-prompt-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="workhub-modal-head">
              <div>
                <h2>Delete selected tasks</h2>
                <p>Are you sure you want to delete {selectedTaskCount} selected task{selectedTaskCount === 1 ? '' : 's'}?</p>
              </div>
              <button className="workhub-ghost-btn" disabled={busyKey === 'bulk-task'} onClick={() => setBulkDeleteConfirmOpen(false)}>✕</button>
            </div>
            <div className="workhub-delete-prompt-actions">
              <button type="button" className="workhub-danger-btn" disabled={busyKey === 'bulk-task'} onClick={() => { void handleBulkDeleteSelected() }}>
                {busyKey === 'bulk-task' ? 'Deleting...' : 'Delete selected'}
              </button>
              <button type="button" className="workhub-ghost-btn" disabled={busyKey === 'bulk-task'} onClick={() => setBulkDeleteConfirmOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {taskDeleteConfirmOpen && selectedTask && (
        <div className="workhub-modal-backdrop workhub-delete-prompt-backdrop" onMouseDown={(e) => { if (e.target === e.currentTarget && busyKey !== 'task-delete') setTaskDeleteConfirmOpen(false) }}>
          <div className="workhub-modal workhub-delete-prompt-modal" onMouseDown={(event) => event.stopPropagation()}>
            <div className="workhub-modal-head">
              <div>
                <h2>Delete task</h2>
                <p>Are you sure you want to delete this task?</p>
              </div>
              <button className="workhub-ghost-btn" disabled={busyKey === 'task-delete'} onClick={() => setTaskDeleteConfirmOpen(false)}>✕</button>
            </div>
            <div className="workhub-delete-prompt-filename">
              <span>✅</span>
              <span>{normalizeTaskTitle(selectedTask.title || '') || 'Untitled task'}</span>
            </div>
            <div className="workhub-delete-prompt-actions">
              <button type="button" className="workhub-danger-btn" disabled={busyKey === 'task-delete'} onClick={() => { void handleDeleteSingleTask(selectedTask) }}>
                {busyKey === 'task-delete' ? 'Deleting...' : 'Delete task'}
              </button>
              <button type="button" className="workhub-ghost-btn" disabled={busyKey === 'task-delete'} onClick={() => setTaskDeleteConfirmOpen(false)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {detailMenuOpen && detailMenuCoords && selectedTask && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 199 }}
            onMouseDown={() => { setDetailMenuOpen(''); setDetailMenuCoords(null) }}
          />
          <div
            className="workhub-detail-icon-menu workhub-detail-icon-menu-fixed"
            style={{ position: 'fixed', top: detailMenuCoords.top, right: detailMenuCoords.right, zIndex: 200 }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {detailMenuOpen === 'status' && selectedProjectEffectiveTaskStatuses.map((value: any) => (
              <button
                key={value.id}
                type="button"
                className={selectedTask.status === value.id ? 'is-active' : ''}
                onClick={() => { void handleTaskUpdate(selectedTask, { status: value.id as WorkhubTaskStatus }); setDetailMenuOpen(''); setDetailMenuCoords(null) }}
              >
                <span>{getTaskStatusIcon(value.id)}</span>
                <span>{value.label}</span>
              </button>
            ))}
            {detailMenuOpen === 'priority' && (Object.keys(PRIORITY_LABELS) as WorkhubTaskPriority[]).map((value) => (
              <button
                key={value}
                type="button"
                className={selectedTask.priority === value ? 'is-active' : ''}
                onClick={() => { void handleTaskUpdate(selectedTask, { priority: value }); setDetailMenuOpen(''); setDetailMenuCoords(null) }}
              >
                <span>{getPriorityIcon(value)}</span>
                <span>{PRIORITY_LABELS[value]}</span>
              </button>
            ))}
            {detailMenuOpen === 'assignee' && selectedTaskAssignableMembers.map((item: any) => (
              <button
                key={item.uid}
                type="button"
                className={selectedTask.assigneeUid === item.uid ? 'is-active' : ''}
                onClick={() => { void handleTaskUpdate(selectedTask, { assigneeUid: item.uid }); setDetailMenuOpen(''); setDetailMenuCoords(null) }}
              >
                {item.displayName || item.email}
              </button>
            ))}
            {detailMenuOpen === 'dueDate' && (
              <>
                <label className="workhub-detail-menu-date-field" aria-label="Task creation date">
                  <span>Created</span>
                  <input type="text" value={formatTime(selectedTask.createdAt)} readOnly />
                </label>
                <label className="workhub-detail-menu-date-field" aria-label="Task start date">
                  <span>Start date</span>
                  <input
                    type="date"
                    lang="en-GB"
                    value={selectedTask.startDate || ''}
                    onChange={(event) => void handleTaskUpdate(selectedTask, { startDate: event.target.value })}
                  />
                </label>
                <label className="workhub-detail-menu-date-field" aria-label="Task due date">
                  <span>Due date</span>
                  <input
                    type="date"
                    lang="en-GB"
                    value={selectedTask.dueDate || ''}
                    onChange={(event) => void handleTaskUpdate(selectedTask, { dueDate: event.target.value })}
                  />
                </label>
                <label className="workhub-detail-menu-date-field" aria-label="Task due time">
                  <span>Due time</span>
                  <input
                    type="time"
                    value={selectedTask.dueTime || ''}
                    onChange={(event) => void handleTaskUpdate(selectedTask, { dueTime: event.target.value })}
                  />
                </label>
                <div className="workhub-detail-menu-date-actions">
                  <button type="button" onClick={() => { void handleTaskUpdate(selectedTask, { startDate: '' }) }}>Clear start</button>
                  <button type="button" onClick={() => { void handleTaskUpdate(selectedTask, { dueDate: '', dueTime: '' }) }}>Clear due</button>
                  <button type="button" onClick={() => { setDetailMenuOpen(''); setDetailMenuCoords(null) }}>Done</button>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </>
  )
})
