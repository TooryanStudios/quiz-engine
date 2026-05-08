import { Fragment, useState, useEffect, type ReactNode } from 'react'
import { Handle, NodeResizeControl, Position } from '@xyflow/react'
import { ChevronDown, ChevronRight, GripVertical, type LucideIcon } from 'lucide-react'
import { useWorkflowBuilderCanvasContext } from '../WorkflowBuilderCanvasContext'
import type { WorkflowBuilderNodeKind, WorkflowBuilderNodeSocket } from '../types'

const RESIZABLE_KINDS = new Set(['generate', 'gen_text_to_video', 'gen_image_to_video', 'gen_video_to_video', 'gen_images_to_video', 'gen_image', 'video_extend'])

type WorkflowNodeFrameProps = {
  nodeId?: string
  kind: WorkflowBuilderNodeKind
  title: string
  description: string
  icon: LucideIcon
  metaLine?: string
  required?: boolean
  isConnectable: boolean
  inputSockets?: readonly WorkflowBuilderNodeSocket[]
  outputSockets?: readonly WorkflowBuilderNodeSocket[]
  children?: ReactNode
  footer?: ReactNode
  bodyClassName?: string
  initialCollapsed?: boolean
  hideHeader?: boolean
  hideSocketLabels?: boolean
  fullBleed?: boolean
}

function renderSockets(
  sockets: readonly WorkflowBuilderNodeSocket[] | undefined,
  direction: 'input' | 'output',
  isConnectable: boolean,
  hideSocketLabels?: boolean,
) {
  if (!sockets?.length) return null

  return sockets.map((socket) => (
    <Fragment key={`${direction}-${socket.id}`}>
      {(() => {
        const top = typeof socket.topPercent === 'number' ? `${socket.topPercent}%` : undefined
        const slotClass = socket.slot > 0 ? ` workflow-builder-node__handle--slot-${socket.slot}` : ''
        return (
      <Handle
        id={socket.id}
        type={direction === 'input' ? 'target' : 'source'}
        position={direction === 'input' ? Position.Left : Position.Right}
        isConnectable={isConnectable}
        style={top ? { top } : undefined}
        className={`workflow-builder-node__handle workflow-builder-node__handle--${direction}${slotClass}`}
      />
        )
      })()}
      {!hideSocketLabels && (
        <span
          className={`workflow-builder-node__socket-label workflow-builder-node__socket-label--${direction} workflow-builder-node__socket-label--slot-${socket.slot}`}
        >
          {socket.label}
        </span>
      )}
    </Fragment>
  ))
}

export function WorkflowNodeFrame({
  nodeId,
  kind,
  title,
  icon: Icon,
  metaLine,
  required,
  isConnectable,
  inputSockets,
  outputSockets,
  children,
  footer,
  bodyClassName,
  initialCollapsed,
  hideHeader,
  hideSocketLabels,
  fullBleed,
}: WorkflowNodeFrameProps) {
  const { updateNodeData } = useWorkflowBuilderCanvasContext()
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed ?? false)

  useEffect(() => {
    setIsCollapsed(initialCollapsed ?? false)
  }, [initialCollapsed])
  const bodyClassNames = ['workflow-builder-node__body', bodyClassName].filter(Boolean).join(' ')
  const isResizable = RESIZABLE_KINDS.has(kind)

  return (
    <div className={`workflow-builder-node workflow-builder-node--${kind} ${isCollapsed ? 'workflow-builder-node--collapsed' : ''} ${fullBleed ? 'workflow-builder-node--full-bleed' : ''}`}>
      {isResizable && (
        <NodeResizeControl
          minWidth={240}
          minHeight={180}
          keepAspectRatio={true}
          className="workflow-builder-node__resize-handle"
          position="bottom-right"
        >
          <GripVertical size={12} />
        </NodeResizeControl>
      )}
      {renderSockets(inputSockets, 'input', isConnectable, hideSocketLabels)}
      {renderSockets(outputSockets, 'output', isConnectable, hideSocketLabels)}

      {!hideHeader && (
        <div className="workflow-builder-node__header">
          <div className="workflow-builder-node__title-line">
            <div className="workflow-builder-node__icon"><Icon size={14} /></div>
            <div className="workflow-builder-node__title">{title}</div>
          </div>
          <button
            type="button"
            onClick={() => {
              const next = !isCollapsed
              setIsCollapsed(next)
              if (nodeId) updateNodeData(nodeId, { collapsed: next })
            }}
            className="workflow-builder-node__collapse-btn"
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      )}

      {!isCollapsed && (
        <>
          {metaLine ? <div className="workflow-builder-node__meta">{metaLine}</div> : null}
          {children ? <div className={bodyClassNames}>{children}</div> : null}
          {required ? <div className="workflow-builder-node__required">Required</div> : null}
          {footer ? <div className="workflow-builder-node__footer">{footer}</div> : null}
        </>
      )}
    </div>
  )
}