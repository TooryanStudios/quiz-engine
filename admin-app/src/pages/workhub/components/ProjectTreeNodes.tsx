import { memo, useEffect, useState } from 'react'
import type { MouseEvent } from 'react'
import type { WorkhubDocument, WorkhubMoodBoard, WorkhubProjectIntent } from '../../../lib/workhubRepo'
import type { WorkhubProjectColorMeaning } from '../constants'
import type { WorkhubProjectTreeNode } from '../projectUtils'

const PROJECT_DRAG_MIME = 'application/x-workhub-project-id'
const DOCUMENT_DRAG_MIME = 'application/x-workhub-document-id'
const MOODBOARD_DRAG_MIME = 'application/x-workhub-moodboard-id'

interface ProjectTreeNodesProps {
  nodes: WorkhubProjectTreeNode[]
  treeMetaDisplayMode: 'counts' | 'countdown' | 'progress'
  showProjectColorDots?: boolean
  selectedProjectId: string
  expandedProjectIds: string[]
  directTaskCountByProjectId: Record<string, number>
  unreadCommentCountByProjectId?: Record<string, number>
  taskProgressByProjectId: Record<string, { done: number; total: number }>
  projectIntentById: Record<string, WorkhubProjectIntent>
  projectIntentIconById: Record<string, string>
  selectedDocumentId: string
  selectedMoodBoardId: string
  linkedHighlightedProjectId?: string
  linkedHighlightedDocumentId?: string
  linkedHighlightedMoodBoardId?: string
  documentsByProjectId: Record<string, WorkhubDocument[]>
  moodBoardsByProjectId: Record<string, WorkhubMoodBoard[]>
  isPrivilegedMember: boolean
  projectColorMeanings?: WorkhubProjectColorMeaning[]
  onSelectProject: (projectId: string) => void
  onSelectDocument: (documentId: string) => void
  onSelectMoodBoard: (boardId: string) => void
  onToggleExpansion: (projectId: string) => void
  onOpenActionMenu: (projectId: string, event: MouseEvent<HTMLElement>) => void
  onOpenWorkspaceActionMenu?: (event: MouseEvent<HTMLElement>) => void
  onQuickAddTask?: (projectId: string) => void
  onOpenSettings: (projectId: string) => void
  onRenameProject?: (projectId: string, nextName?: string) => void
  onMoveProject?: (sourceProjectId: string, targetParentProjectId: string | null) => void
  onMoveDocument?: (documentId: string, targetProjectId: string) => void
  onMoveMoodBoard?: (boardId: string, targetProjectId: string) => void
  onReorderDocument?: (sourceDocumentId: string, targetDocumentId: string, projectId: string) => void
  onReorderMoodBoard?: (sourceBoardId: string, targetBoardId: string, projectId: string) => void
  onRenameDocument?: (documentId: string, nextTitle?: string) => void
  onDuplicateDocument?: (documentId: string) => void
  onDeleteDocument?: (documentId: string) => void
  onMoveDocumentViaDialog?: (documentId: string) => void
  onRenameMoodBoard?: (boardId: string, nextTitle?: string) => void
  onDuplicateMoodBoard?: (boardId: string) => void
  onDeleteMoodBoard?: (boardId: string) => void
  onMoveMoodBoardViaDialog?: (boardId: string) => void
  pendingInlineRename?: { itemType: 'project' | 'document' | 'moodboard'; itemId: string } | null
  onConsumePendingInlineRename?: () => void
  depth?: number
}

function getDocumentIcon(document: Pick<WorkhubDocument, 'type' | 'icon' | 'referenceSourceDocumentId' | 'hasOutgoingReferences'>) {
  if (document.referenceSourceDocumentId) return '🔗'
  if (document.hasOutgoingReferences) return '🌐'
  return (document.icon || '').trim() || (document.type === 'note' ? '🗒️' : '📝')
}

function getMoodBoardVariantMeta(panelVariant?: WorkhubMoodBoard['panelVariant']): {
  badge: string
  badgeClassName: string
  icon: string
  title: string
} {
  if (panelVariant === 'flow') {
    return {
      badge: 'FLOW',
      badgeClassName: 'is-flow',
      icon: '🧭',
      title: 'Flow Project Plan board',
    }
  }
  if (panelVariant === 'proscons') {
    return {
      badge: 'P/C',
      badgeClassName: 'is-proscons',
      icon: '⚖',
      title: 'Pros and cons board',
    }
  }
  return {
    badge: '',
    badgeClassName: '',
    icon: '🎨',
    title: 'Mood board',
  }
}

function parseProjectSubmissionTimestamp(projectDeadline?: string, submissionTime?: string): number | null {
  const deadline = (projectDeadline || '').trim()
  if (!deadline) return null
  const time = (submissionTime || '').trim() || '23:59'
  const value = Date.parse(`${deadline}T${time}`)
  return Number.isFinite(value) ? value : null
}

function formatSubmittedAgo(projectDeadline?: string, submissionTime?: string): string {
  const targetTs = parseProjectSubmissionTimestamp(projectDeadline, submissionTime)
  if (!targetTs) return 'Submitted'
  const diffMs = Date.now() - targetTs
  if (diffMs <= 0) return 'Submitted'
  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  if (totalDays === 0) return 'Submitted today'
  if (totalDays === 1) return 'Submitted 1 day ago'
  return `Submitted ${totalDays}d ago`
}

function formatCountdownMeta(
  projectDeadline?: string, submissionTime?: string): {
  label: string
  submissionTimeLabel: string
  isNear: boolean
  isOverdue: boolean
} {
  const targetTs = parseProjectSubmissionTimestamp(projectDeadline, submissionTime)
  const normalizedSubmissionTime = (submissionTime || '').trim()
  const submissionTimeLabel = normalizedSubmissionTime
    ? new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(`2000-01-01T${normalizedSubmissionTime}`))
    : ''
  if (!targetTs) return { label: 'No deadline', submissionTimeLabel: '', isNear: false, isOverdue: false }

  const diffMs = targetTs - Date.now()
  const isOverdue = diffMs < 0
  const absMs = Math.abs(diffMs)
  const totalHours = Math.max(0, Math.floor(absMs / (1000 * 60 * 60)))
  const monthHours = 24 * 30
  const months = Math.floor(totalHours / monthHours)
  const afterMonthsHours = totalHours - (months * monthHours)
  const days = Math.floor(afterMonthsHours / 24)
  const hours = afterMonthsHours % 24
  const isNear = !isOverdue && absMs <= (1000 * 60 * 60 * 72)
  const monthPart = months > 0 ? `${months}mo` : ''
  const dayPart = days > 0 ? `${days}d` : ''
  const hourPart = `${hours}h`
  const label = [monthPart, dayPart, hourPart].filter(Boolean).join(' ').trim() || '0h'

  return {
    label,
    submissionTimeLabel,
    isNear: isNear || isOverdue,
    isOverdue,
  }
}

export const ProjectTreeNodes = memo(function ProjectTreeNodes({
  nodes,
  treeMetaDisplayMode,
  showProjectColorDots = true,
  selectedProjectId,
  expandedProjectIds,
  directTaskCountByProjectId = {},
  unreadCommentCountByProjectId = {},
  taskProgressByProjectId = {},
  projectIntentById = {},
  projectIntentIconById = {},
  selectedDocumentId = '',
  selectedMoodBoardId = '',
  linkedHighlightedProjectId = '',
  linkedHighlightedDocumentId = '',
  linkedHighlightedMoodBoardId = '',
  documentsByProjectId = {},
  moodBoardsByProjectId = {},
  isPrivilegedMember,
  projectColorMeanings = [],
  onSelectProject,
  onSelectDocument,
  onSelectMoodBoard = () => {},
  onToggleExpansion,
  onOpenActionMenu,
  onOpenWorkspaceActionMenu,
  onQuickAddTask,
  onOpenSettings,
  onRenameProject,
  onMoveProject,
  onMoveDocument,
  onMoveMoodBoard,
  onReorderDocument,
  onReorderMoodBoard,
  onRenameDocument,
  onDuplicateDocument,
  onDeleteDocument,
  onMoveDocumentViaDialog,
  onRenameMoodBoard,
  onDuplicateMoodBoard,
  onDeleteMoodBoard,
  onMoveMoodBoardViaDialog,
  pendingInlineRename = null,
  onConsumePendingInlineRename,
  depth = 0,
}: ProjectTreeNodesProps) {
  const [dropTargetKey, setDropTargetKey] = useState('')
  const [inlineRename, setInlineRename] = useState<{
    itemId: string
    itemType: 'project' | 'document' | 'moodboard'
    value: string
  } | null>(null)
  const [subItemContextMenu, setSubItemContextMenu] = useState<{
    x: number
    y: number
    itemId: string
    itemType: 'document' | 'moodboard'
    parentProjectId: string
  } | null>(null)

  const clampContextMenuPoint = (x: number, y: number, menuWidth: number, menuHeight: number) => {
    const margin = 8
    const nextX = Math.max(margin, Math.min(x, Math.max(margin, window.innerWidth - menuWidth - margin)))
    const nextY = Math.max(margin, Math.min(y, Math.max(margin, window.innerHeight - menuHeight - margin)))
    return { x: nextX, y: nextY }
  }

  const commitInlineRename = () => {
    if (!inlineRename) return
    const nextValue = inlineRename.value.trim()
    if (!nextValue) {
      setInlineRename(null)
      return
    }
    if (inlineRename.itemType === 'project') {
      onRenameProject?.(inlineRename.itemId, nextValue)
    } else if (inlineRename.itemType === 'document') {
      onRenameDocument?.(inlineRename.itemId, nextValue)
    } else {
      onRenameMoodBoard?.(inlineRename.itemId, nextValue)
    }
    setInlineRename(null)
  }

  const cancelInlineRename = () => {
    setInlineRename(null)
  }

  const startInlineRename = (itemType: 'project' | 'document' | 'moodboard', itemId: string, value: string) => {
    setInlineRename({ itemType, itemId, value })
  }

  const runSubItemAction = (action: 'open' | 'open-parent-folder' | 'rename' | 'duplicate' | 'move' | 'delete') => {
    if (!subItemContextMenu) return
    if (action === 'open') {
      if (subItemContextMenu.itemType === 'document') {
        onSelectDocument(subItemContextMenu.itemId)
      } else {
        onSelectMoodBoard(subItemContextMenu.itemId)
      }
      setSubItemContextMenu(null)
      return
    }
    if (action === 'open-parent-folder') {
      onSelectProject(subItemContextMenu.parentProjectId)
      setSubItemContextMenu(null)
      return
    }
    if (action === 'rename') {
      if (subItemContextMenu.itemType === 'document') {
        const projectDocuments = documentsByProjectId[subItemContextMenu.parentProjectId] || []
        const targetDocument = projectDocuments.find((item) => item.id === subItemContextMenu.itemId)
        const title = (targetDocument?.title || '').trim() || 'Untitled document'
        startInlineRename('document', subItemContextMenu.itemId, title)
      } else {
        const projectBoards = moodBoardsByProjectId[subItemContextMenu.parentProjectId] || []
        const targetBoard = projectBoards.find((item) => item.id === subItemContextMenu.itemId)
        const title = (targetBoard?.title || '').trim() || 'Mood board'
        startInlineRename('moodboard', subItemContextMenu.itemId, title)
      }
      setSubItemContextMenu(null)
      return
    }
    if (action === 'duplicate') {
      if (subItemContextMenu.itemType === 'document') {
        onDuplicateDocument?.(subItemContextMenu.itemId)
      } else {
        onDuplicateMoodBoard?.(subItemContextMenu.itemId)
      }
      setSubItemContextMenu(null)
      return
    }
    if (action === 'move') {
      if (subItemContextMenu.itemType === 'document') {
        onMoveDocumentViaDialog?.(subItemContextMenu.itemId)
      } else {
        onMoveMoodBoardViaDialog?.(subItemContextMenu.itemId)
      }
      setSubItemContextMenu(null)
      return
    }
    if (subItemContextMenu.itemType === 'document') {
      onDeleteDocument?.(subItemContextMenu.itemId)
    } else {
      onDeleteMoodBoard?.(subItemContextMenu.itemId)
    }
    setSubItemContextMenu(null)
  }

  useEffect(() => {
    if (!subItemContextMenu) return
    const handleWindowPointerDown = () => setSubItemContextMenu(null)
    const handleWindowKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSubItemContextMenu(null)
        return
      }
      if (event.key === 'F2') {
        event.preventDefault()
        runSubItemAction('rename')
        return
      }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
        event.preventDefault()
        runSubItemAction('duplicate')
        return
      }
      if (event.key === 'Delete') {
        event.preventDefault()
        runSubItemAction('delete')
      }
    }
    window.addEventListener('pointerdown', handleWindowPointerDown)
    window.addEventListener('keydown', handleWindowKeyDown)
    return () => {
      window.removeEventListener('pointerdown', handleWindowPointerDown)
      window.removeEventListener('keydown', handleWindowKeyDown)
    }
  }, [runSubItemAction, subItemContextMenu])

  useEffect(() => {
    if (!pendingInlineRename || !onConsumePendingInlineRename) return

    const findProjectNode = (items: WorkhubProjectTreeNode[], projectId: string): WorkhubProjectTreeNode | null => {
      for (const item of items) {
        if (item.id === projectId) return item
        const nested = findProjectNode(item.children, projectId)
        if (nested) return nested
      }
      return null
    }

    if (pendingInlineRename.itemType === 'project') {
      const projectNode = findProjectNode(nodes, pendingInlineRename.itemId)
      if (!projectNode) return
      startInlineRename('project', projectNode.id, (projectNode.name || '').trim() || 'Untitled folder')
      onConsumePendingInlineRename()
      return
    }

    for (const [projectId, projectDocuments] of Object.entries(documentsByProjectId)) {
      if (pendingInlineRename.itemType !== 'document') continue
      const doc = projectDocuments.find((item) => item.id === pendingInlineRename.itemId)
      if (!doc) continue
      if (!findProjectNode(nodes, projectId)) return
      startInlineRename('document', doc.id, (doc.title || '').trim() || 'Untitled document')
      onConsumePendingInlineRename()
      return
    }

    for (const [projectId, boards] of Object.entries(moodBoardsByProjectId)) {
      if (pendingInlineRename.itemType !== 'moodboard') continue
      const board = boards.find((item) => item.id === pendingInlineRename.itemId)
      if (!board) continue
      if (!findProjectNode(nodes, projectId)) return
      startInlineRename('moodboard', board.id, (board.title || '').trim() || 'Mood board')
      onConsumePendingInlineRename()
      return
    }
  }, [documentsByProjectId, moodBoardsByProjectId, nodes, onConsumePendingInlineRename, pendingInlineRename])

  return (
    <div
      className="workhub-tree-node-list"
      onContextMenu={(event) => {
        if (!onOpenWorkspaceActionMenu) return
        const target = event.target as HTMLElement
        if (target.closest('.workhub-tree-node, .workhub-tree-doc-subitem, .workhub-tree-root-dropzone, .workhub-tree-item-context-menu')) return
        event.preventDefault()
        onOpenWorkspaceActionMenu(event)
      }}
    >
      {depth === 0 && onMoveProject && (
        <div
          className={`workhub-tree-root-dropzone${dropTargetKey === 'project:root' ? ' is-drop-target' : ''}`}
          onContextMenu={(event) => {
            if (!onOpenWorkspaceActionMenu) return
            event.preventDefault()
            event.stopPropagation()
            onOpenWorkspaceActionMenu(event)
          }}
          onDragOver={(event) => {
            if (!Array.from(event.dataTransfer.types || []).includes(PROJECT_DRAG_MIME)) return
            event.preventDefault()
            event.dataTransfer.dropEffect = 'move'
            if (dropTargetKey !== 'project:root') setDropTargetKey('project:root')
          }}
          onDragLeave={() => {
            if (dropTargetKey === 'project:root') setDropTargetKey('')
          }}
          onDrop={(event) => {
            const dragTypes = new Set(Array.from(event.dataTransfer.types || []))
            if (!dragTypes.has(PROJECT_DRAG_MIME)) return
            const draggedId = event.dataTransfer.getData(PROJECT_DRAG_MIME) || event.dataTransfer.getData('text/plain')
            if (!draggedId) return
            event.preventDefault()
            event.stopPropagation()
            setDropTargetKey('')
            onMoveProject(draggedId, null)
          }}
        >
          Drop here to move to workspace root
        </div>
      )}
      {nodes.map((node) => {
        const isExpanded = expandedProjectIds.includes(node.id)
        const childCount = node.children.length
        const nodeDocuments = documentsByProjectId[node.id] || []
        const nodeMoodBoards = moodBoardsByProjectId[node.id] || []
        const documentCount = nodeDocuments.length
        const moodBoardCount = nodeMoodBoards.length
        const hasExpandableChildren = childCount > 0 || documentCount > 0 || moodBoardCount > 0
        const directTaskCount = directTaskCountByProjectId[node.id] || 0
        const unreadCommentCount = unreadCommentCountByProjectId[node.id] || 0
        const progressSnapshot = taskProgressByProjectId[node.id] || { done: directTaskCount, total: directTaskCount }
        const totalTaskCount = Math.max(0, progressSnapshot.total)
        const doneTaskCount = Math.max(0, Math.min(progressSnapshot.done, totalTaskCount))
        const hasProgressTasks = totalTaskCount > 0
        const progressPercent = hasProgressTasks ? Math.max(6, Math.round((doneTaskCount / totalTaskCount) * 100)) : 0
        const effectiveIntent = projectIntentById[node.id] || 'project'
        const folderFallbackClosed = '🗂️'
        const folderFallbackOpen = '📂'
        const intentIcon = effectiveIntent === 'project'
          ? (hasExpandableChildren ? (isExpanded ? folderFallbackOpen : folderFallbackClosed) : (projectIntentIconById[node.id] || folderFallbackClosed))
          : (projectIntentIconById[node.id] || folderFallbackClosed)
        const intentIconKind = intentIcon === '🚀' ? 'project' : 'folder'
        const countdownMeta = formatCountdownMeta(node.projectDeadline, node.submissionTime)
        const nodeColorMeaning = projectColorMeanings.find((m) => m.color.toLowerCase() === (node.color || '').toLowerCase())
        const isSubmittedStatus = nodeColorMeaning?.label?.toLowerCase() === 'submitted'
        const submittedAgoLabel = isSubmittedStatus ? formatSubmittedAgo(node.projectDeadline, node.submissionTime) : null
        const defaultMetaText = childCount > 0
          ? `${childCount} sub-project${childCount > 1 ? 's' : ''}${documentCount > 0 ? ` • ${documentCount} doc${documentCount === 1 ? '' : 's'}` : ''}${moodBoardCount > 0 ? ` • ${moodBoardCount} board${moodBoardCount === 1 ? '' : 's'}` : ''}`
          : documentCount > 0 || moodBoardCount > 0
            ? `${documentCount > 0 ? `${documentCount} doc${documentCount === 1 ? '' : 's'}` : ''}${documentCount > 0 && moodBoardCount > 0 ? ' • ' : ''}${moodBoardCount > 0 ? `${moodBoardCount} board${moodBoardCount === 1 ? '' : 's'}` : ''}`
            : `${directTaskCount} task${directTaskCount === 1 ? '' : 's'}`
        const showCountdownMeta = treeMetaDisplayMode === 'countdown' && childCount === 0
        const showProgressMeta = treeMetaDisplayMode === 'progress' && hasProgressTasks
        const rawCountdownText = showCountdownMeta ? (submittedAgoLabel ?? countdownMeta.label) : defaultMetaText
        const metaText = rawCountdownText
        const showMeta = !(treeMetaDisplayMode === 'countdown' && childCount > 0) && !showProgressMeta
        const attachmentCount = Array.isArray(node.attachments) ? node.attachments.length : 0
        const metaClassName = `workhub-tree-node-meta${treeMetaDisplayMode === 'countdown' && !isSubmittedStatus && countdownMeta.isNear ? ' is-near-submission' : ''}${treeMetaDisplayMode === 'countdown' && !isSubmittedStatus && countdownMeta.isOverdue ? ' is-overdue' : ''}${isSubmittedStatus ? ' is-submitted-status' : ''}`

        return (
          <div key={node.id} className={`workhub-tree-node-wrap${depth === 0 ? ' is-root' : ' is-nested'}`}>
            <div
              className={`workhub-tree-node${selectedProjectId === node.id && !selectedDocumentId && !selectedMoodBoardId ? ' is-active' : ''}${linkedHighlightedProjectId === node.id ? ' is-linked-highlight' : ''}${depth === 0 && !hasExpandableChildren ? ' is-root-leaf-node' : ''}${dropTargetKey === `project:${node.id}` ? ' is-drop-target' : ''}`}
              style={{ paddingLeft: `${10 + (depth * 14)}px` }}
              onDragOver={(event) => {
                const dragTypes = new Set(Array.from(event.dataTransfer.types || []))
                if (dragTypes.has(PROJECT_DRAG_MIME) || dragTypes.has(DOCUMENT_DRAG_MIME) || dragTypes.has(MOODBOARD_DRAG_MIME)) {
                  event.preventDefault()
                  event.dataTransfer.dropEffect = 'move'
                  if (dropTargetKey !== `project:${node.id}`) setDropTargetKey(`project:${node.id}`)
                }
              }}
              onDragLeave={() => {
                if (dropTargetKey === `project:${node.id}`) setDropTargetKey('')
              }}
              onDrop={(event) => {
                const dragTypes = new Set(Array.from(event.dataTransfer.types || []))
                const hasProjectDrag = dragTypes.has(PROJECT_DRAG_MIME)
                const hasDocumentDrag = dragTypes.has(DOCUMENT_DRAG_MIME)
                const hasMoodBoardDrag = dragTypes.has(MOODBOARD_DRAG_MIME)

                const projectDraggedId = hasProjectDrag
                  ? (event.dataTransfer.getData(PROJECT_DRAG_MIME) || event.dataTransfer.getData('text/plain'))
                  : ''
                if (projectDraggedId && onMoveProject && projectDraggedId !== node.id) {
                  event.preventDefault()
                  event.stopPropagation()
                  setDropTargetKey('')
                  onMoveProject(projectDraggedId, node.id)
                  return
                }

                const documentDraggedId = hasDocumentDrag ? event.dataTransfer.getData(DOCUMENT_DRAG_MIME) : ''
                if (documentDraggedId && onMoveDocument) {
                  event.preventDefault()
                  event.stopPropagation()
                  setDropTargetKey('')
                  onMoveDocument(documentDraggedId, node.id)
                  return
                }

                const moodBoardDraggedId = hasMoodBoardDrag ? event.dataTransfer.getData(MOODBOARD_DRAG_MIME) : ''
                if (moodBoardDraggedId && onMoveMoodBoard) {
                  event.preventDefault()
                  event.stopPropagation()
                  setDropTargetKey('')
                  onMoveMoodBoard(moodBoardDraggedId, node.id)
                }
              }}
              onContextMenu={(event) => {
                event.preventDefault()
                event.stopPropagation()
                onOpenActionMenu(node.id, event)
              }}
              onClick={() => onSelectProject(node.id)}
              onDoubleClick={(event) => {
                const target = event.target as HTMLElement
                if (target.closest('.workhub-tree-toggle, .workhub-tree-node-actions')) return
                if (hasExpandableChildren) {
                  onToggleExpansion(node.id)
                }
              }}
            >
              {onMoveProject && (
                <button
                  type="button"
                  className="workhub-tree-drag-handle"
                  draggable
                  title="Drag to move this folder"
                  aria-label="Drag to move this folder"
                  onClick={(event) => event.stopPropagation()}
                  onMouseDown={(event) => event.stopPropagation()}
                  onDragStart={(event) => {
                    event.stopPropagation()
                    event.dataTransfer.effectAllowed = 'move'
                    event.dataTransfer.setData(PROJECT_DRAG_MIME, node.id)
                    event.dataTransfer.setData('text/plain', node.id)
                  }}
                >
                  ⋮⋮
                </button>
              )}
              {hasExpandableChildren ? (
                <button
                  type="button"
                  className="workhub-tree-toggle"
                  aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}
                  title={isExpanded ? 'Collapse folder' : 'Expand folder'}
                  onClick={(event) => {
                    event.stopPropagation()
                    onToggleExpansion(node.id)
                  }}
                >
                  <span className={`workhub-tree-toggle-icon${isExpanded ? ' is-expanded' : ''}`} aria-hidden="true">
                    <svg viewBox="0 0 12 12" focusable="false" aria-hidden="true">
                      <path d="M4 2.5L7.8 6L4 9.5" />
                    </svg>
                  </span>
                </button>
              ) : (
                <span className="workhub-tree-leaf-spacer" aria-hidden="true" />
              )}
              <div className="workhub-tree-node-main">
                {showProjectColorDots && (
                  <span className={`workhub-project-dot${depth === 0 ? ' is-root' : ''}`} style={{ background: node.color }} />
                )}
                <span className="workhub-tree-node-text">
                  <span className="workhub-tree-node-title">
                      <span className={`workhub-tree-node-intent-icon is-${intentIconKind}-kind`} aria-hidden="true">{intentIcon}</span>
                      {inlineRename?.itemType === 'project' && inlineRename.itemId === node.id ? (
                        <input
                          type="text"
                          className="workhub-tree-inline-rename-input"
                          value={inlineRename.value}
                          aria-label="Rename folder"
                          title="Rename folder"
                          placeholder="Folder name"
                          autoFocus
                          onFocus={(event) => event.currentTarget.select()}
                          onClick={(event) => event.stopPropagation()}
                          onMouseDown={(event) => event.stopPropagation()}
                          onBlur={commitInlineRename}
                          onChange={(event) => {
                            const value = event.target.value
                            setInlineRename((current) => (current ? { ...current, value } : current))
                          }}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter') {
                              event.preventDefault()
                              commitInlineRename()
                              return
                            }
                            if (event.key === 'Escape') {
                              event.preventDefault()
                              cancelInlineRename()
                            }
                          }}
                        />
                      ) : (
                        <span className="workhub-tree-node-title-text">{node.name}</span>
                      )}
                    {unreadCommentCount > 0 && (
                      <span
                        className="workhub-tree-node-comment-indicator"
                        title={`${unreadCommentCount} unread comment${unreadCommentCount === 1 ? '' : 's'}`}
                        aria-label={`${unreadCommentCount} unread comment${unreadCommentCount === 1 ? '' : 's'}`}
                      >
                        💬 {unreadCommentCount}
                      </span>
                    )}
                    {attachmentCount > 0 && (
                      <span
                        className="workhub-tree-node-attachment-indicator"
                        title={`${attachmentCount} attachment${attachmentCount === 1 ? '' : 's'}`}
                        aria-label={`${attachmentCount} attachment${attachmentCount === 1 ? '' : 's'}`}
                      >
                        📎
                      </span>
                    )}
                  </span>
                  {showProgressMeta && (
                    <span className="workhub-tree-node-progress" title={`${doneTaskCount} of ${totalTaskCount} tasks done`}>
                      <span className="workhub-tree-node-progress-track" aria-hidden="true">
                        <span className="workhub-tree-node-progress-fill" style={{ width: `${progressPercent}%` }} />
                      </span>
                      <span className="workhub-tree-node-progress-label">{doneTaskCount}/{totalTaskCount}</span>
                    </span>
                  )}
                  {showMeta && (
                    <span className={metaClassName}>
                      <span className="workhub-tree-node-meta-bracket" aria-hidden="true">(</span>
                      <span className="workhub-tree-node-meta-primary">{metaText}</span>
                      {showCountdownMeta && !isSubmittedStatus && countdownMeta.submissionTimeLabel && (
                        <>
                          <span className="workhub-tree-node-meta-separator" aria-hidden="true"> | </span>
                          <span className="workhub-tree-node-meta-time workhub-ltr-token">{countdownMeta.submissionTimeLabel}</span>
                        </>
                      )}
                      <span className="workhub-tree-node-meta-bracket" aria-hidden="true">)</span>
                    </span>
                  )}
                </span>
              </div>
              <div className="workhub-tree-node-actions">
                <button
                  type="button"
                  className="workhub-plus-btn"
                  onClick={(event) => {
                    event.stopPropagation()
                    if (onQuickAddTask) {
                      onQuickAddTask(node.id)
                    } else {
                      onOpenActionMenu(node.id, event)
                    }
                  }}
                >
                  +
                </button>
                {isPrivilegedMember && (
                  <button
                    type="button"
                    className="workhub-gear-btn"
                    onClick={(event) => {
                      event.stopPropagation()
                      onOpenSettings(node.id)
                    }}
                  >
                    ⚙
                  </button>
                )}
              </div>
            </div>
            {childCount > 0 && (
              <div className={`workhub-tree-expand-wrap${isExpanded ? ' is-open' : ''}`}>
                <div className="workhub-tree-expand-inner">
                  <div className="workhub-tree-children">
                    <ProjectTreeNodes
                      nodes={node.children}
                  treeMetaDisplayMode={treeMetaDisplayMode}
                  depth={depth + 1}
                  selectedProjectId={selectedProjectId}
                  expandedProjectIds={expandedProjectIds}
                  directTaskCountByProjectId={directTaskCountByProjectId}
                  unreadCommentCountByProjectId={unreadCommentCountByProjectId}
                  taskProgressByProjectId={taskProgressByProjectId}
                  projectIntentById={projectIntentById}
                  projectIntentIconById={projectIntentIconById}
                  showProjectColorDots={showProjectColorDots}
                  selectedDocumentId={selectedDocumentId}
                  selectedMoodBoardId={selectedMoodBoardId}
                  linkedHighlightedProjectId={linkedHighlightedProjectId}
                  linkedHighlightedDocumentId={linkedHighlightedDocumentId}
                  linkedHighlightedMoodBoardId={linkedHighlightedMoodBoardId}
                  documentsByProjectId={documentsByProjectId}
                  moodBoardsByProjectId={moodBoardsByProjectId}
                  isPrivilegedMember={isPrivilegedMember}
                  projectColorMeanings={projectColorMeanings}
                  onSelectProject={onSelectProject}
                  onSelectDocument={onSelectDocument}
                  onSelectMoodBoard={onSelectMoodBoard}
                  onToggleExpansion={onToggleExpansion}
                  onOpenActionMenu={onOpenActionMenu}
                  onOpenSettings={onOpenSettings}
                  onRenameProject={onRenameProject}
                  onMoveProject={onMoveProject}
                  onMoveDocument={onMoveDocument}
                  onMoveMoodBoard={onMoveMoodBoard}
                  onReorderDocument={onReorderDocument}
                  onReorderMoodBoard={onReorderMoodBoard}
                  onRenameDocument={onRenameDocument}
                  onDuplicateDocument={onDuplicateDocument}
                  onDeleteDocument={onDeleteDocument}
                  onMoveDocumentViaDialog={onMoveDocumentViaDialog}
                  onRenameMoodBoard={onRenameMoodBoard}
                  onDuplicateMoodBoard={onDuplicateMoodBoard}
                  onDeleteMoodBoard={onDeleteMoodBoard}
                  onMoveMoodBoardViaDialog={onMoveMoodBoardViaDialog}
                  pendingInlineRename={pendingInlineRename}
                  onConsumePendingInlineRename={onConsumePendingInlineRename}
                    />
                  </div>
                </div>
              </div>
            )}
            {(documentCount > 0 || moodBoardCount > 0) && (
              <div className={`workhub-tree-expand-wrap${isExpanded ? ' is-open' : ''}`}>
                <div className="workhub-tree-expand-inner">
                  <div className="workhub-tree-doc-sublist" style={{ marginLeft: `${36 + (depth * 14)}px` }}>
                {nodeDocuments.map((document) => {
                  const baseTitle = (document.title || '').trim() || (document.type === 'note' ? 'Untitled note' : 'Untitled document')
                  const documentTreeTitle = document.referenceSourceDocumentId
                    ? `${baseTitle} (Reference)`
                    : document.hasOutgoingReferences
                      ? `${baseTitle} (Public source)`
                    : (document.isLocked ? `${baseTitle} (Locked)` : baseTitle)
                  return (
                    <button
                      key={document.id}
                      type="button"
                      className={`workhub-tree-doc-subitem${selectedDocumentId === document.id ? ' is-active' : ''}${linkedHighlightedDocumentId === document.id ? ' is-linked-highlight' : ''}${document.hasOutgoingReferences && !document.referenceSourceDocumentId ? ' is-public-source' : ''}${dropTargetKey === `document:${document.id}` ? ' is-drop-target' : ''}`}
                      onDragOver={(event) => {
                        if (!onReorderDocument && !onMoveDocument) return
                        const dragTypes = new Set(Array.from(event.dataTransfer.types || []))
                        if (!dragTypes.has(DOCUMENT_DRAG_MIME)) return
                        event.preventDefault()
                        event.dataTransfer.dropEffect = 'move'
                        if (dropTargetKey !== `document:${document.id}`) setDropTargetKey(`document:${document.id}`)
                      }}
                      onDragLeave={() => {
                        if (dropTargetKey === `document:${document.id}`) setDropTargetKey('')
                      }}
                      onDrop={(event) => {
                        const draggedId = event.dataTransfer.getData(DOCUMENT_DRAG_MIME)
                        if (!draggedId || draggedId === document.id) return
                        event.preventDefault()
                        event.stopPropagation()
                        setDropTargetKey('')
                        if (onReorderDocument) {
                          onReorderDocument(draggedId, document.id, node.id)
                        } else if (onMoveDocument) {
                          onMoveDocument(draggedId, node.id)
                        }
                      }}
                      onContextMenu={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        const coords = clampContextMenuPoint(event.clientX, event.clientY, 240, 260)
                        setSubItemContextMenu({
                          x: coords.x,
                          y: coords.y,
                          itemId: document.id,
                          itemType: 'document',
                          parentProjectId: node.id,
                        })
                      }}
                      onClick={(event) => {
                        event.stopPropagation()
                        onSelectDocument(document.id)
                      }}
                      title={documentTreeTitle}
                    >
                      <span className="workhub-tree-doc-subitem-title">
                        <button
                          type="button"
                          draggable
                          className="workhub-tree-subitem-drag-handle"
                          title="Drag to move this document"
                          aria-label="Drag to move this document"
                          onClick={(event) => event.stopPropagation()}
                          onMouseDown={(event) => event.stopPropagation()}
                          onDragStart={(event) => {
                            event.stopPropagation()
                            event.dataTransfer.effectAllowed = 'move'
                            event.dataTransfer.setData(DOCUMENT_DRAG_MIME, document.id)
                            event.dataTransfer.setData('text/plain', document.id)
                          }}
                        >
                          ⋮⋮
                        </button>
                        {getDocumentIcon(document)} {inlineRename?.itemType === 'document' && inlineRename.itemId === document.id ? (
                          <input
                            type="text"
                            className="workhub-tree-inline-rename-input"
                            value={inlineRename.value}
                            aria-label="Rename document"
                            title="Rename document"
                            placeholder="Document title"
                            autoFocus
                            onFocus={(event) => event.currentTarget.select()}
                            onClick={(event) => event.stopPropagation()}
                            onMouseDown={(event) => event.stopPropagation()}
                            onBlur={commitInlineRename}
                            onChange={(event) => {
                              const value = event.target.value
                              setInlineRename((current) => (current ? { ...current, value } : current))
                            }}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault()
                                commitInlineRename()
                                return
                              }
                              if (event.key === 'Escape') {
                                event.preventDefault()
                                cancelInlineRename()
                              }
                            }}
                          />
                        ) : documentTreeTitle}
                        {!!document.attachments?.length && <span className="workhub-tree-doc-attachment-indicator" title={`${document.attachments.length} attachment${document.attachments.length === 1 ? '' : 's'}`}>📎</span>}
                      </span>
                      {document.hasOutgoingReferences && !document.referenceSourceDocumentId && <span className="workhub-tree-doc-lock-badge" title="Public source document">🌐</span>}
                      {document.referenceSourceDocumentId && <span className="workhub-tree-doc-lock-badge" title="Referenced document">🔗</span>}
                      {document.isLocked && <span className="workhub-tree-doc-lock-badge" title="Locked document">🔒</span>}
                    </button>
                  )
                })}
                {nodeMoodBoards.map((board) => {
                  const variantMeta = getMoodBoardVariantMeta(board.panelVariant)
                  return (
                    <button
                      key={board.id}
                      type="button"
                      className={`workhub-tree-doc-subitem${selectedMoodBoardId === board.id ? ' is-active' : ''}${linkedHighlightedMoodBoardId === board.id ? ' is-linked-highlight' : ''}${dropTargetKey === `moodboard:${board.id}` ? ' is-drop-target' : ''}`}
                      onDragOver={(event) => {
                        if (!onReorderMoodBoard && !onMoveMoodBoard) return
                        const dragTypes = new Set(Array.from(event.dataTransfer.types || []))
                        if (!dragTypes.has(MOODBOARD_DRAG_MIME)) return
                        event.preventDefault()
                        event.dataTransfer.dropEffect = 'move'
                        if (dropTargetKey !== `moodboard:${board.id}`) setDropTargetKey(`moodboard:${board.id}`)
                      }}
                      onDragLeave={() => {
                        if (dropTargetKey === `moodboard:${board.id}`) setDropTargetKey('')
                      }}
                      onDrop={(event) => {
                        const draggedId = event.dataTransfer.getData(MOODBOARD_DRAG_MIME)
                        if (!draggedId || draggedId === board.id) return
                        event.preventDefault()
                        event.stopPropagation()
                        setDropTargetKey('')
                        if (onReorderMoodBoard) {
                          onReorderMoodBoard(draggedId, board.id, node.id)
                        } else if (onMoveMoodBoard) {
                          onMoveMoodBoard(draggedId, node.id)
                        }
                      }}
                      onContextMenu={(event) => {
                        event.preventDefault()
                        event.stopPropagation()
                        const coords = clampContextMenuPoint(event.clientX, event.clientY, 240, 260)
                        setSubItemContextMenu({
                          x: coords.x,
                          y: coords.y,
                          itemId: board.id,
                          itemType: 'moodboard',
                          parentProjectId: node.id,
                        })
                      }}
                      onClick={(event) => {
                        event.stopPropagation()
                        onSelectMoodBoard(board.id)
                      }}
                      title={board.title}
                    >
                      <span className="workhub-tree-doc-subitem-title">
                        <button
                          type="button"
                          draggable
                          className="workhub-tree-subitem-drag-handle"
                          title="Drag to move this mood board"
                          aria-label="Drag to move this mood board"
                          onClick={(event) => event.stopPropagation()}
                          onMouseDown={(event) => event.stopPropagation()}
                          onDragStart={(event) => {
                            event.stopPropagation()
                            event.dataTransfer.effectAllowed = 'move'
                            event.dataTransfer.setData(MOODBOARD_DRAG_MIME, board.id)
                            event.dataTransfer.setData('text/plain', board.id)
                          }}
                        >
                          ⋮⋮
                        </button>
                        {variantMeta.icon} {inlineRename?.itemType === 'moodboard' && inlineRename.itemId === board.id ? (
                          <input
                            type="text"
                            className="workhub-tree-inline-rename-input"
                            value={inlineRename.value}
                            aria-label="Rename mood board"
                            title="Rename mood board"
                            placeholder="Mood board title"
                            autoFocus
                            onFocus={(event) => event.currentTarget.select()}
                            onClick={(event) => event.stopPropagation()}
                            onMouseDown={(event) => event.stopPropagation()}
                            onBlur={commitInlineRename}
                            onChange={(event) => {
                              const value = event.target.value
                              setInlineRename((current) => (current ? { ...current, value } : current))
                            }}
                            onKeyDown={(event) => {
                              if (event.key === 'Enter') {
                                event.preventDefault()
                                commitInlineRename()
                                return
                              }
                              if (event.key === 'Escape') {
                                event.preventDefault()
                                cancelInlineRename()
                              }
                            }}
                          />
                        ) : board.title}
                        {variantMeta.badge && (
                          <span
                            className={`workhub-tree-moodboard-variant-badge ${variantMeta.badgeClassName}`}
                            title={variantMeta.title}
                            aria-label={variantMeta.title}
                          >
                            {variantMeta.badge}
                          </span>
                        )}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
            )}
          </div>
        )
      })}
      {subItemContextMenu && (
        <div
          className="workhub-tree-item-context-menu"
          style={{ left: `${subItemContextMenu.x}px`, top: `${subItemContextMenu.y}px` }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            className="workhub-tree-item-context-menu-btn"
            onClick={() => runSubItemAction('open')}
          >
            ↗ Open
          </button>
          <button
            type="button"
            className="workhub-tree-item-context-menu-btn"
            onClick={() => runSubItemAction('open-parent-folder')}
          >
            📁 Open parent folder
          </button>
          <button
            type="button"
            className="workhub-tree-item-context-menu-btn"
            onClick={() => runSubItemAction('rename')}
          >
            ✏ Rename (F2)
          </button>
          <button
            type="button"
            className="workhub-tree-item-context-menu-btn"
            onClick={() => runSubItemAction('duplicate')}
          >
            ⧉ Duplicate (Ctrl+D)
          </button>
          <button
            type="button"
            className="workhub-tree-item-context-menu-btn"
            onClick={() => runSubItemAction('move')}
          >
            ↔ Move to folder...
          </button>
          <button
            type="button"
            className="workhub-tree-item-context-menu-btn is-danger"
            onClick={() => runSubItemAction('delete')}
          >
            🗑 Delete (Del)
          </button>
        </div>
      )}
    </div>
  )
})
