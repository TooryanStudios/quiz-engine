import { memo, useCallback, useContext, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { FreshFlowCanvasContext } from './FreshFlowCanvasContext'
import { NODE_TITLE_PREFIX, type FreshFlowNodeKind } from './FreshFlowStudioContext'

type EditableNodeTitleProps = {
  nodeId: string
  kind: FreshFlowNodeKind
  title: string
}

export const EditableNodeTitle = memo(function EditableNodeTitle({ nodeId, kind, title }: EditableNodeTitleProps) {
  const { onPatchNode } = useContext(FreshFlowCanvasContext)
  const [isEditing, setIsEditing] = useState(false)
  const [draftTitle, setDraftTitle] = useState(title)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    setDraftTitle(title)
  }, [title])

  useEffect(() => {
    if (!isEditing) return
    requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.select()
    })
  }, [isEditing])

  const commit = useCallback(() => {
    const nextTitle = draftTitle.trim() || title || `${NODE_TITLE_PREFIX[kind]} title`
    onPatchNode(nodeId, { title: nextTitle })
    setIsEditing(false)
  }, [draftTitle, kind, nodeId, onPatchNode, title])

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      commit()
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      setDraftTitle(title)
      setIsEditing(false)
    }
  }

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        className="fresh-flow-node__title-edit nodrag"
        value={draftTitle}
        onChange={(event) => setDraftTitle(event.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        placeholder={`${NODE_TITLE_PREFIX[kind]} title`}
      />
    )
  }

  return (
    <button
      type="button"
      className="fresh-flow-node__title-display nodrag"
      onDoubleClick={() => setIsEditing(true)}
      title="Double-click to rename"
    >
      {title || `${NODE_TITLE_PREFIX[kind]} title`}
    </button>
  )
})