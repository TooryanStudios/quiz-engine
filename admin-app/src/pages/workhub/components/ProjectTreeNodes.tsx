import type { MouseEvent } from 'react'
import type { WorkhubDocument, WorkhubProjectIntent } from '../../../lib/workhubRepo'
import type { WorkhubProjectTreeNode } from '../projectUtils'

interface ProjectTreeNodesProps {
  nodes: WorkhubProjectTreeNode[]
  treeMetaDisplayMode: 'counts' | 'countdown'
  selectedProjectId: string
  expandedProjectIds: string[]
  directTaskCountByProjectId: Record<string, number>
  projectIntentById: Record<string, WorkhubProjectIntent>
  projectIntentIconById: Record<string, string>
  selectedDocumentId: string
  documentsByProjectId: Record<string, WorkhubDocument[]>
  isPrivilegedMember: boolean
  onSelectProject: (projectId: string) => void
  onSelectDocument: (documentId: string) => void
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

function formatCountdownMeta(projectDeadline?: string, submissionTime?: string): {
  label: string
  isNear: boolean
  isOverdue: boolean
} {
  const targetTs = parseProjectSubmissionTimestamp(projectDeadline, submissionTime)
  if (!targetTs) return { label: 'No deadline', isNear: false, isOverdue: false }

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

  return { label, isNear: isNear || isOverdue, isOverdue }
}

export function ProjectTreeNodes({
  nodes,
  treeMetaDisplayMode,
  selectedProjectId,
  expandedProjectIds,
  directTaskCountByProjectId,
  projectIntentById,
  projectIntentIconById,
  selectedDocumentId,
  documentsByProjectId,
  isPrivilegedMember,
  onSelectProject,
  onSelectDocument,
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
        const documentCount = nodeDocuments.length
        const hasExpandableChildren = childCount > 0 || documentCount > 0
        const directTaskCount = directTaskCountByProjectId[node.id] || 0
        const effectiveIntent = projectIntentById[node.id] || 'project'
        const folderFallbackClosed = '🗂️'
        const folderFallbackOpen = '📂'
        const intentIcon = effectiveIntent === 'project'
          ? (hasExpandableChildren ? (isExpanded ? folderFallbackOpen : folderFallbackClosed) : (projectIntentIconById[node.id] || folderFallbackClosed))
          : (projectIntentIconById[node.id] || folderFallbackClosed)
        const intentIconKind = intentIcon === '🚀' ? 'project' : 'folder'
        const countdownMeta = formatCountdownMeta(node.projectDeadline, node.submissionTime)
        const defaultMetaText = childCount > 0
          ? `${childCount} sub-project${childCount > 1 ? 's' : ''}${documentCount > 0 ? ` • ${documentCount} doc${documentCount === 1 ? '' : 's'}` : ''}`
          : documentCount > 0
            ? `${documentCount} doc${documentCount === 1 ? '' : 's'}`
            : `${directTaskCount} task${directTaskCount === 1 ? '' : 's'}`
        const showCountdownMeta = treeMetaDisplayMode === 'countdown' && childCount === 0
        const metaText = showCountdownMeta ? countdownMeta.label : defaultMetaText
        const showMeta = !(treeMetaDisplayMode === 'countdown' && childCount > 0)
        const attachmentCount = Array.isArray(node.attachments) ? node.attachments.length : 0
        const metaClassName = `workhub-tree-node-meta${treeMetaDisplayMode === 'countdown' && countdownMeta.isNear ? ' is-near-submission' : ''}${treeMetaDisplayMode === 'countdown' && countdownMeta.isOverdue ? ' is-overdue' : ''}`

        return (
          <div key={node.id} className={`workhub-tree-node-wrap${depth === 0 ? ' is-root' : ' is-nested'}`}>
            <div
              className={`workhub-tree-node${selectedProjectId === node.id && !selectedDocumentId ? ' is-active' : ''}${depth === 0 && !hasExpandableChildren ? ' is-root-leaf-node' : ''}`}
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
                depth === 0 ? null : (
                  <span
                    className="workhub-tree-leaf-indicator"
                    aria-hidden="true"
                    title="No sub-projects"
                  >
                    •
                  </span>
                )
              )}
              <div className="workhub-tree-node-main">
                <span className={`workhub-project-dot${depth === 0 ? ' is-root' : ''}`} style={{ background: node.color }} />
                <span className="workhub-tree-node-text">
                  <span className="workhub-tree-node-title">
                      <span className={`workhub-tree-node-intent-icon is-${intentIconKind}-kind`} aria-hidden="true">{intentIcon}</span>
                    <span className="workhub-tree-node-title-text">{node.name}</span>
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
                </span>
                {showMeta && (
                  <span className={metaClassName}>
                    ({metaText})
                  </span>
                )}
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
            {childCount > 0 && isExpanded && (
              <div className="workhub-tree-children">
                <ProjectTreeNodes
                  nodes={node.children}
                  treeMetaDisplayMode={treeMetaDisplayMode}
                  depth={depth + 1}
                  selectedProjectId={selectedProjectId}
                  expandedProjectIds={expandedProjectIds}
                  directTaskCountByProjectId={directTaskCountByProjectId}
                  projectIntentById={projectIntentById}
                  projectIntentIconById={projectIntentIconById}
                  selectedDocumentId={selectedDocumentId}
                  documentsByProjectId={documentsByProjectId}
                  isPrivilegedMember={isPrivilegedMember}
                  onSelectProject={onSelectProject}
                  onSelectDocument={onSelectDocument}
                  onToggleExpansion={onToggleExpansion}
                  onOpenActionMenu={onOpenActionMenu}
                  onOpenSettings={onOpenSettings}
                />
              </div>
            )}
            {documentCount > 0 && isExpanded && (
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
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}
