import { Fragment, useState, useEffect, type ReactNode } from 'react'
import { Handle, NodeResizeControl, Position } from '@xyflow/react'
import {
  AlignLeft, Activity, ChevronDown, ChevronRight, Film, GripVertical,
  Image, Images, Palette, ScrollText, Sparkles, Zap, Video, type LucideIcon,
} from 'lucide-react'
import { useWorkflowBuilderCanvasContext } from '../WorkflowBuilderCanvasContext'
import type { WorkflowBuilderNodeKind, WorkflowBuilderNodeSocket } from '../types'

const RESIZABLE_KINDS = new Set(['generate', 'gen_text_to_video', 'gen_image_to_video', 'gen_video_to_video', 'gen_images_to_video', 'gen_image', 'video_extend'])

const SOCKET_ICONS: Record<string, LucideIcon> = {
  prompt: AlignLeft,
  'out-prompt': AlignLeft,
  style: Palette,
  reference: Image,
  'in-refs': Image,
  rules: ScrollText,
  video: Film,
  physics: Activity,
  result: Zap,
  'out-video': Film,
  'out-images': Images,
  'in-video': Video,
  'in-image': Image,
}

function getSocketIcon(socketId: string): LucideIcon {
  const direct = SOCKET_ICONS[socketId]
  if (direct) return direct
  if (socketId.startsWith('video')) return Film
  if (socketId.startsWith('image')) return Image
  if (socketId.includes('ref')) return Image
  return Sparkles
}

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
  className?: string
  initialCollapsed?: boolean
  hideHeader?: boolean
  hideSocketLabels?: boolean
  fullBleed?: boolean
}

function renderSockets(
  sockets: readonly WorkflowBuilderNodeSocket[] | undefined,
  direction: 'input' | 'output',
  isConnectable: boolean,
) {
  if (!sockets?.length) return null

  return sockets.map((socket) => {
    const top = typeof socket.topPercent === 'number' ? `${socket.topPercent}%` : undefined
    const slotClass = socket.slot > 0 ? ` workflow-builder-node__handle--slot-${socket.slot}` : ''
    const SocketIcon = getSocketIcon(socket.id)
    return (
      <Fragment key={`${direction}-${socket.id}`}>
        <Handle
          id={socket.id}
          type={direction === 'input' ? 'target' : 'source'}
          position={direction === 'input' ? Position.Left : Position.Right}
          isConnectable={isConnectable}
          style={top ? { top } : undefined}
          className={`workflow-builder-node__handle workflow-builder-node__handle--${direction}${slotClass}`}
        >
          <SocketIcon size={30} />
        </Handle>
      </Fragment>
    )
  })
}

export function WorkflowNodeFrame({
  nodeId,
  kind,
  title,
  icon: Icon,
  isConnectable,
  inputSockets,
  outputSockets,
  children,
  footer,
  bodyClassName,
  className,
  initialCollapsed,
  hideHeader,
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
    <div className={`workflow-builder-node workflow-builder-node--${kind} ${isCollapsed ? 'workflow-builder-node--collapsed' : ''} ${fullBleed ? 'workflow-builder-node--full-bleed' : ''} ${className || ''}`}>
      {isResizable && (
        <NodeResizeControl
          minWidth={240}
          minHeight={180}
          keepAspectRatio={false}
          className="workflow-builder-node__resize-handle"
          position="bottom-right"
        >
          <GripVertical size={12} />
        </NodeResizeControl>
      )}
      {renderSockets(inputSockets, 'input', isConnectable)}
      {renderSockets(outputSockets, 'output', isConnectable)}

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
          {children ? <div className={bodyClassNames}>{children}</div> : null}
          {footer ? <div className="workflow-builder-node__footer">{footer}</div> : null}
        </>
      )}
    </div>
  )
}