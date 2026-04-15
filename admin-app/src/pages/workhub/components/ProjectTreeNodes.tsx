import { memo } from 'react'
import type { MouseEvent } from 'react'
import type { WorkhubDocument, WorkhubMoodBoard, WorkhubProjectIntent } from '../../../lib/workhubRepo'
import type { WorkhubProjectColorMeaning } from '../constants'
import type { WorkhubProjectTreeNode } from '../projectUtils'

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
  documentsByProjectId: Record<string, WorkhubDocument[]>
  moodBoardsByProjectId: Record<string, WorkhubMoodBoard[]>
  isPrivilegedMember: boolean
  projectColorMeanings?: WorkhubProjectColorMeaning[]
  onSelectProject: (projectId: string) => void
  onSelectDocument: (documentId: string) => void
  onSelectMoodBoard: (boardId: string) => void
  onToggleExpansion: (projectId: string) => void
  onOpenActionMenu: (projectId: string, event: MouseEvent<HTMLElement>) => void
  onOpenSettings: (projectId: string) => void
  depth?: number
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
  documentsByProjectId = {},
  moodBoardsByProjectId = {},
  isPrivilegedMember,
  projectColorMeanings = [],
  onSelectProject,
  onSelectDocument,
  onSelectMoodBoard = () => {},
  onToggleExpansion,
  onOpenActionMenu,
  onOpenSettings,
  depth = 0,
}: ProjectTreeNodesProps) {
  return (
    <>
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
              className={`workhub-tree-node${selectedProjectId === node.id && !selectedDocumentId && !selectedMoodBoardId ? ' is-active' : ''}${depth === 0 && !hasExpandableChildren ? ' is-root-leaf-node' : ''}`}
              style={{ paddingLeft: `${10 + (depth * 14)}px` }}
              role="button"
              tabIndex={0}
              onClick={() => onSelectProject(node.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  onSelectProject(node.id)
                }
              }}
              onDoubleClick={(event) => {
                const target = event.target as HTMLElement
                if (target.closest('.workhub-tree-toggle, .workhub-tree-node-actions')) return
                if (hasExpandableChildren) {
                  onToggleExpansion(node.id)
                }
              }}
            >
              {hasExpandableChildren ? (
                <button
                  type="button"
                  className="workhub-tree-toggle"
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
                    <span className="workhub-tree-node-title-text">{node.name}</span>
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
                    onOpenActionMenu(node.id, event)
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
                    />
                  </div>
                </div>
              </div>
            )}
            {(documentCount > 0 || moodBoardCount > 0) && (
              <div className={`workhub-tree-expand-wrap${isExpanded ? ' is-open' : ''}`}>
                <div className="workhub-tree-expand-inner">
                  <div className="workhub-tree-doc-sublist" style={{ marginLeft: `${36 + (depth * 14)}px` }}>
                {nodeDocuments.map((document) => (
                  <button
                    key={document.id}
                    type="button"
                    className={`workhub-tree-doc-subitem${selectedDocumentId === document.id ? ' is-active' : ''}`}
                    onClick={(event) => {
                      event.stopPropagation()
                      onSelectDocument(document.id)
                    }}
                    title={document.title}
                  >
                    <span className="workhub-tree-doc-subitem-title">
                      📝 {document.title}
                      {!!document.attachments?.length && <span className="workhub-tree-doc-attachment-indicator" title={`${document.attachments.length} attachment${document.attachments.length === 1 ? '' : 's'}`}>📎</span>}
                    </span>
                    {document.isLocked && <span className="workhub-tree-doc-lock-badge" title="Locked">🔒</span>}
                  </button>
                ))}
                {nodeMoodBoards.map((board) => (
                  <button
                    key={board.id}
                    type="button"
                    className={`workhub-tree-doc-subitem${selectedMoodBoardId === board.id ? ' is-active' : ''}`}
                    onClick={(event) => {
                      event.stopPropagation()
                      onSelectMoodBoard(board.id)
                    }}
                    title={board.title}
                  >
                    <span className="workhub-tree-doc-subitem-title">🎨 {board.title}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
            )}
          </div>
        )
      })}
    </>
  )
})
