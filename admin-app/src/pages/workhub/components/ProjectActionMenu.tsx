import { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { WorkhubTemplateCreationIntent } from '../templateCreationMeta'
import type { WorkhubWorkspaceTemplateId } from '../workspaceTemplates'

interface WorkhubTemplateCreateActionOption {
  id: string
  icon: string
  label: string
  intent: WorkhubTemplateCreationIntent
}

export const ProjectActionMenu = memo(function ProjectActionMenu(props: {
  projectId: string | null
  workspaceType: 'technical' | 'hr' | 'finance'
  workspaceTemplateId: WorkhubWorkspaceTemplateId
  selectedProjectId: string
  position: { x: number; y: number }
  canManageProject: boolean
  canCreateTopCategory: boolean
  templateCreateActions: WorkhubTemplateCreateActionOption[]
  onClose: () => void
  onCreateTask: (projectId: string) => void
  onCreateSubProject: (projectId: string) => void
  onCreateDocument: (projectId?: string) => void
  onCreateNote: (projectId?: string) => void
  onCreateTemplateEntity: (intent: WorkhubTemplateCreationIntent, projectId?: string) => void
  onCreateWorkspaceReport?: (projectId?: string) => void
  onOpenSettings: (projectId: string) => void
  onRequestInlineRename?: (projectId: string) => void
  onMoveProject?: (projectId: string) => void
  onCopyProjectLink?: (projectId: string) => void
  onDeleteProject?: (projectId: string) => void
  onOpenMoodBoard: (entityType: 'workspace' | 'project', entityId: string) => void
  onOpenFlowProjectLab: (entityType: 'workspace' | 'project', entityId: string) => void
  onOpenProsConsLab: (entityType: 'workspace' | 'project', entityId: string) => void
  moodBoardEnabled?: boolean
  contextName?: string
}) {
  if (!props.projectId) return null
  const menuRef = useRef<HTMLDivElement | null>(null)
  const [resolvedPosition, setResolvedPosition] = useState(props.position)
  const [openSubmenuLeft, setOpenSubmenuLeft] = useState(false)

  const trFolder = props.workspaceType === 'hr' ? 'folder' : props.workspaceType === 'finance' ? 'ledger' : 'project'
  const trTask = props.workspaceType === 'hr' ? 'objective' : props.workspaceType === 'finance' ? 'record' : 'task'
  const isWorkspaceTarget = props.projectId === '__workspace__'
  const selectedWorkspaceProjectId = props.selectedProjectId !== 'all' ? props.selectedProjectId : ''
  const targetProjectId = isWorkspaceTarget ? selectedWorkspaceProjectId : props.projectId

  const extraToolsTemplateActions = useMemo(() => {
    if (isWorkspaceTarget) {
      return props.templateCreateActions.filter((action) => action.intent !== 'project')
    }
    return props.templateCreateActions
  }, [isWorkspaceTarget, props.templateCreateActions])

  useLayoutEffect(() => {
    setResolvedPosition(props.position)
  }, [props.position])

  useLayoutEffect(() => {
    if (!menuRef.current) return
    menuRef.current.style.left = `${resolvedPosition.x}px`
    menuRef.current.style.top = `${resolvedPosition.y}px`
  }, [resolvedPosition.x, resolvedPosition.y])

  useLayoutEffect(() => {
    const clampToViewport = () => {
      const menuEl = menuRef.current
      if (!menuEl) return
      const margin = 8
      const rect = menuEl.getBoundingClientRect()
      const maxX = Math.max(margin, window.innerWidth - rect.width - margin)
      const maxY = Math.max(margin, window.innerHeight - rect.height - margin)
      const nextX = Math.max(margin, Math.min(resolvedPosition.x, maxX))
      const nextY = Math.max(margin, Math.min(resolvedPosition.y, maxY))
      if (nextX !== resolvedPosition.x || nextY !== resolvedPosition.y) {
        setResolvedPosition({ x: nextX, y: nextY })
      }
    }

    clampToViewport()
    window.addEventListener('resize', clampToViewport)
    return () => {
      window.removeEventListener('resize', clampToViewport)
    }
  }, [resolvedPosition])

  useLayoutEffect(() => {
    const updateSubmenuDirection = () => {
      const menuEl = menuRef.current
      if (!menuEl) return
      const rect = menuEl.getBoundingClientRect()
      const submenuWidth = 230
      const submenuGap = 6
      const margin = 8
      const wouldOverflowRight = rect.right + submenuGap + submenuWidth > window.innerWidth - margin
      const hasLeftRoom = rect.left - submenuGap - submenuWidth >= margin
      setOpenSubmenuLeft(wouldOverflowRight && hasLeftRoom)
    }

    updateSubmenuDirection()
    window.addEventListener('resize', updateSubmenuDirection)
    return () => {
      window.removeEventListener('resize', updateSubmenuDirection)
    }
  }, [resolvedPosition])

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null
      if (!menuRef.current || !target || menuRef.current.contains(target)) return
      props.onClose()
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target) {
        const tagName = target.tagName
        if (
          target.isContentEditable
          || tagName === 'INPUT'
          || tagName === 'TEXTAREA'
          || tagName === 'SELECT'
        ) {
          return
        }
      }

      if (event.repeat) {
        return
      }

      if (event.key === 'Escape') {
        props.onClose()
        return
      }

      const lower = event.key.toLowerCase()
      if (lower === 'm' && !isWorkspaceTarget && !!props.onMoveProject) {
        event.preventDefault()
        props.onClose()
        props.onMoveProject(props.projectId || '')
        return
      }
      if (event.key === 'Delete' && !isWorkspaceTarget && !!props.onDeleteProject) {
        event.preventDefault()
        props.onClose()
        props.onDeleteProject(props.projectId || '')
        return
      }
      if (lower === 't') {
        event.preventDefault()
        props.onClose()
        props.onCreateTask(targetProjectId || '')
        return
      }
      if (lower === 'd') {
        event.preventDefault()
        props.onClose()
        props.onCreateDocument(targetProjectId || '')
        return
      }
      if (lower === 'n') {
        event.preventDefault()
        props.onClose()
        props.onCreateNote(targetProjectId || '')
        return
      }
      if (lower === 'p') {
        event.preventDefault()
        props.onClose()
        if (isWorkspaceTarget) {
          props.onCreateTemplateEntity('project', '')
        } else {
          props.onCreateTemplateEntity('project', props.projectId || '')
        }
        return
      }
      if (lower === 'f') {
        event.preventDefault()
        props.onClose()
        props.onCreateSubProject(isWorkspaceTarget ? '' : (props.projectId || ''))
      }
    }
    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [
    isWorkspaceTarget,
    props,
    targetProjectId,
  ])

  return (
    <div
      ref={menuRef}
      className="workhub-tree-item-context-menu workhub-project-action-context-menu"
      onPointerDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        className="workhub-tree-item-context-menu-btn"
        disabled={!props.canCreateTopCategory || !props.onCreateWorkspaceReport}
        onClick={() => { props.onClose(); props.onCreateWorkspaceReport?.(targetProjectId || '') }}
      >
        📊 Create report
      </button>

      <button
        type="button"
        className="workhub-tree-item-context-menu-btn"
        disabled={!props.canCreateTopCategory}
        onClick={() => { props.onClose(); props.onCreateTask(targetProjectId || '') }}
      >
        🧾 New {trTask}    T
      </button>

      <button
        type="button"
        className="workhub-tree-item-context-menu-btn"
        disabled={!props.canCreateTopCategory}
        onClick={() => { props.onClose(); props.onCreateDocument(targetProjectId || '') }}
      >
        📝 New document    D
      </button>

      <button
        type="button"
        className="workhub-tree-item-context-menu-btn"
        disabled={!props.canCreateTopCategory}
        onClick={() => { props.onClose(); props.onCreateNote(targetProjectId || '') }}
      >
        🗒️ New note    N
      </button>

      <button
        type="button"
        className="workhub-tree-item-context-menu-btn"
        disabled={!props.canCreateTopCategory}
        onClick={() => {
          props.onClose()
          if (isWorkspaceTarget) {
            props.onCreateTemplateEntity('project', '')
          } else {
            props.onCreateTemplateEntity('project', props.projectId || '')
          }
        }}
      >
        🚀 New {trFolder === 'project' ? 'project' : trFolder}    P
      </button>

      <button
        type="button"
        className="workhub-tree-item-context-menu-btn"
        disabled={!props.canCreateTopCategory}
        onClick={() => {
          props.onClose()
          props.onCreateSubProject(isWorkspaceTarget ? '' : (props.projectId || ''))
        }}
      >
        📁 New folder    F
      </button>

      {!isWorkspaceTarget && (!!props.onRequestInlineRename || !!props.onMoveProject || !!props.onCopyProjectLink || props.canManageProject || !!props.onDeleteProject) && (
        <>
          <div className="workhub-tree-item-context-menu-separator" />
          <div className={`workhub-tree-item-context-submenu-wrap${openSubmenuLeft ? ' opens-left' : ''}`}>
            <button type="button" className="workhub-tree-item-context-menu-btn">
              ✏ Manage ▸
            </button>
            <div className="workhub-tree-item-context-submenu">
              {!!props.onRequestInlineRename && (
                <button
                  type="button"
                  className="workhub-tree-item-context-menu-btn"
                  onClick={() => { props.onClose(); props.onRequestInlineRename?.(props.projectId || '') }}
                >
                  ✏ Rename
                </button>
              )}
              {!!props.onMoveProject && (
                <button
                  type="button"
                  className="workhub-tree-item-context-menu-btn"
                  onClick={() => { props.onClose(); props.onMoveProject?.(props.projectId || '') }}
                >
                  ↔ Move folder...    M
                </button>
              )}
              {!!props.onCopyProjectLink && (
                <button
                  type="button"
                  className="workhub-tree-item-context-menu-btn"
                  onClick={() => { props.onClose(); props.onCopyProjectLink?.(props.projectId || '') }}
                >
                  🔗 Copy folder URL
                </button>
              )}
              {props.canManageProject && (
                <button
                  type="button"
                  className="workhub-tree-item-context-menu-btn"
                  onClick={() => { props.onClose(); props.onOpenSettings(props.projectId || '') }}
                >
                  ⚙️ Folder settings
                </button>
              )}
              {!!props.onDeleteProject && (
                <button
                  type="button"
                  className="workhub-tree-item-context-menu-btn is-danger"
                  onClick={() => { props.onClose(); props.onDeleteProject?.(props.projectId || '') }}
                >
                  🗑 Delete folder    Del
                </button>
              )}
            </div>
          </div>
        </>
      )}

      <div className="workhub-tree-item-context-menu-separator" />

      <div className={`workhub-tree-item-context-submenu-wrap${openSubmenuLeft ? ' opens-left' : ''}`}>
        <button type="button" className="workhub-tree-item-context-menu-btn">
          ⋯ Extra tools ▸
        </button>
        <div className="workhub-tree-item-context-submenu">
          {isWorkspaceTarget && !!selectedWorkspaceProjectId && (
            <>
              <button
                type="button"
                className="workhub-tree-item-context-menu-btn"
                disabled={!props.canCreateTopCategory}
                onClick={() => { props.onClose(); props.onCreateTemplateEntity('project', selectedWorkspaceProjectId) }}
              >
                🚀 New sub-project
              </button>
              <button
                type="button"
                className="workhub-tree-item-context-menu-btn"
                disabled={!props.canCreateTopCategory}
                onClick={() => { props.onClose(); props.onCreateSubProject(selectedWorkspaceProjectId) }}
              >
                📁 New sub-folder
              </button>
            </>
          )}

          {extraToolsTemplateActions.map((action) => (
            <button
              key={action.id}
              type="button"
              className="workhub-tree-item-context-menu-btn"
              disabled={!props.canCreateTopCategory}
              onClick={() => {
                props.onClose()
                props.onCreateTemplateEntity(action.intent, targetProjectId || '')
              }}
            >
              {action.icon} {action.label}
            </button>
          ))}

          <button
            type="button"
            className="workhub-tree-item-context-menu-btn"
            onClick={() => {
              props.onClose()
              props.onOpenMoodBoard(isWorkspaceTarget ? (targetProjectId ? 'project' : 'workspace') : 'project', targetProjectId || '__workspace__')
            }}
          >
            🎨 Open mood board
          </button>

          <button
            type="button"
            className="workhub-tree-item-context-menu-btn"
            onClick={() => {
              props.onClose()
              props.onOpenFlowProjectLab(isWorkspaceTarget ? (targetProjectId ? 'project' : 'workspace') : 'project', targetProjectId || '__workspace__')
            }}
          >
            🧭 Open Flow Project Lab
          </button>

          <button
            type="button"
            className="workhub-tree-item-context-menu-btn"
            onClick={() => {
              props.onClose()
              props.onOpenProsConsLab(isWorkspaceTarget ? (targetProjectId ? 'project' : 'workspace') : 'project', targetProjectId || '__workspace__')
            }}
          >
            ⚖ Open Pros and Cons
          </button>
        </div>
      </div>
    </div>
  )
})
