import { memo, type DragEvent as ReactDragEvent } from 'react'
import { WORKFLOW_LIBRARY_ITEMS, getNodeIcon } from './nodeLibrary'
import type { WorkflowBuilderNodeKind } from './types'

export const WorkflowBuilderLibrary = memo(function WorkflowBuilderLibrary() {
  const onDragStart = (event: ReactDragEvent<HTMLButtonElement>, kind: WorkflowBuilderNodeKind) => {
    event.dataTransfer.setData('application/workflow-builder-node', kind)
    event.dataTransfer.effectAllowed = 'move'
  }

  return (
    <div className="workflow-builder-canvas__library-list">
      {WORKFLOW_LIBRARY_ITEMS.map((item) => {
        const Icon = getNodeIcon(item.kind)
        return (
          <button
            key={item.kind}
            type="button"
            className="workflow-builder-canvas__library-item"
            draggable
            onDragStart={(event) => onDragStart(event, item.kind)}
          >
            <span className="workflow-builder-canvas__library-icon"><Icon size={16} /></span>
            <span>
              <strong>{item.label}</strong>
            </span>
          </button>
        )
      })}
    </div>
  )
})