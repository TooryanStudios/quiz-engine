import type { MouseEvent } from 'react'
import type { WorkhubProjectTreeNode } from '../projectUtils'

interface ProjectTreeNodesProps {
  nodes: WorkhubProjectTreeNode[]
  selectedProjectId: string
  expandedProjectIds: string[]
  directTaskCountByProjectId: Record<string, number>
  isPrivilegedMember: boolean
  onSelectProject: (projectId: string) => void
  onToggleExpansion: (projectId: string) => void
  onOpenActionMenu: (projectId: string, event: MouseEvent<HTMLElement>) => void
  onOpenSettings: (projectId: string) => void
  depth?: number
}

export function ProjectTreeNodes({
  nodes,
  selectedProjectId,
  expandedProjectIds,
  directTaskCountByProjectId,
  isPrivilegedMember,
  onSelectProject,
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
        const directTaskCount = directTaskCountByProjectId[node.id] || 0

        return (
          <div key={node.id} className={`workhub-tree-node-wrap${depth === 0 ? ' is-root' : ' is-nested'}`}>
            <div
              className={`workhub-tree-node${selectedProjectId === node.id ? ' is-active' : ''}${depth === 0 && childCount === 0 ? ' is-root-leaf-node' : ''}`}
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
                if (childCount > 0) {
                  onToggleExpansion(node.id)
                }
              }}
            >
              {childCount > 0 ? (
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
                  <span className="workhub-tree-node-title" title={node.name}>{node.name}</span>
                  <span className="workhub-tree-node-meta">
                    ({childCount > 0 ? `${childCount} sub-project${childCount > 1 ? 's' : ''}` : `${directTaskCount} task${directTaskCount === 1 ? '' : 's'}`})
                  </span>
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
            {childCount > 0 && isExpanded && (
              <div className="workhub-tree-children">
                <ProjectTreeNodes
                  nodes={node.children}
                  depth={depth + 1}
                  selectedProjectId={selectedProjectId}
                  expandedProjectIds={expandedProjectIds}
                  directTaskCountByProjectId={directTaskCountByProjectId}
                  isPrivilegedMember={isPrivilegedMember}
                  onSelectProject={onSelectProject}
                  onToggleExpansion={onToggleExpansion}
                  onOpenActionMenu={onOpenActionMenu}
                  onOpenSettings={onOpenSettings}
                />
              </div>
            )}
          </div>
        )
      })}
    </>
  )
}
