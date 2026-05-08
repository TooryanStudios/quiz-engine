import { memo, useCallback, useEffect, useState } from 'react'
import { NodeResizer } from '@xyflow/react'
import { Images, Plus, Trash2 } from 'lucide-react'
import { useWorkflowBuilderNode } from '../WorkflowBuilderCanvasContext'
import { WorkflowNodeFrame } from './WorkflowNodeFrame'
import { WorkflowMediaPickerDialog } from '../mediaLibrary/WorkflowMediaPickerDialog'
import type { WorkflowBuilderNodeProps } from '../types'
import type { MediaLibraryItem } from '../mediaLibrary/types'

const OUTPUT_SOCKETS = [{ id: 'out-images', label: 'Images', slot: 2 }] as const

type ReferenceItem = { id: string; url: string; name: string }

function RefNameInput({ name, onCommit }: { name: string; onCommit: (v: string) => void }) {
  const [val, setVal] = useState(name)
  useEffect(() => { setVal(name) }, [name])
  return (
    <input
      type="text"
      className="workflow-builder-node__ref-name nodrag"
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onBlur={() => onCommit(val)}
      onDoubleClick={(e) => e.stopPropagation()}
      placeholder="Name"
    />
  )
}

export const ImageReferenceNode = memo(function ImageReferenceNode({ id, data, isConnectable, selected }: WorkflowBuilderNodeProps) {
  const { patchNode } = useWorkflowBuilderNode(id)
  const items: ReferenceItem[] = data.referenceItems ?? []
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pendingDeleteItemId, setPendingDeleteItemId] = useState<string | null>(null)

  const updateName = useCallback((itemId: string, name: string) => {
    patchNode({
      referenceItems: items.map((item) => item.id === itemId ? { ...item, name } : item),
    })
  }, [items, patchNode])

  const removeItem = useCallback((itemId: string) => {
    patchNode({ referenceItems: items.filter((item) => item.id !== itemId) })
  }, [items, patchNode])

  const handlePickerConfirm = useCallback((picked: MediaLibraryItem[]) => {
    const next = items.length
    const newItems: ReferenceItem[] = picked.map((p, i) => ({
      id: p.id,
      url: p.url,
      name: p.name || `Image ${next + i + 1}`,
    }))
    patchNode({ referenceItems: [...items, ...newItems] })
    setPickerOpen(false)
  }, [items, patchNode])

  // Dynamic columns: 1 col for 0 items, then min(count+1, 4) including the add button
  const gridCols = Math.min(Math.max(items.length + 1, 1), 4)

  return (
    <>
      <NodeResizer
        color="#7c3aed"
        isVisible={selected}
        minWidth={220}
        minHeight={80}
      />
      <WorkflowNodeFrame
        nodeId={id}
        kind="image_reference"
        title={data.label || 'Image Reference'}
        description=""
        icon={Images}
        isConnectable={isConnectable}
        outputSockets={OUTPUT_SOCKETS}
        bodyClassName="workflow-builder-node__body--reference"
        initialCollapsed={data.collapsed}
      >
        <div
          className="workflow-builder-node__ref-grid"
          style={{ gridTemplateColumns: `repeat(${gridCols}, 1fr)` }}
        >
          {items.map((item) => (
            <div key={item.id} className="workflow-builder-node__ref-cell">
              <div className="workflow-builder-node__ref-thumb">
                {item.url ? (
                  <img src={item.url} alt={item.name} loading="lazy" />
                ) : (
                  <span className="workflow-builder-node__ref-thumb-empty">
                    <Images size={18} />
                  </span>
                )}
              </div>
              <div className="workflow-builder-node__ref-controls nodrag">
                <RefNameInput name={item.name} onCommit={(v) => updateName(item.id, v)} />
                <button
                  type="button"
                  className={`workflow-builder-node__ref-icon-btn workflow-builder-node__ref-icon-btn--danger nodrag${pendingDeleteItemId === item.id ? ' workflow-builder-node__ref-icon-btn--confirm' : ''}`}
                  title={pendingDeleteItemId === item.id ? 'Click again to confirm remove' : 'Remove'}
                  onClick={() => {
                    if (pendingDeleteItemId === item.id) {
                      removeItem(item.id)
                      setPendingDeleteItemId(null)
                      return
                    }
                    setPendingDeleteItemId(item.id)
                  }}
                >
                  <Trash2 size={10} /> {pendingDeleteItemId === item.id ? 'Confirm' : ''}
                </button>
                {pendingDeleteItemId === item.id ? (
                  <button
                    type="button"
                    className="workflow-builder-node__ref-icon-btn nodrag"
                    title="Cancel remove"
                    onClick={() => setPendingDeleteItemId(null)}
                  >
                    Cancel
                  </button>
                ) : null}
              </div>
            </div>
          ))}
          <button
            type="button"
            className="workflow-builder-node__ref-add nodrag"
            onClick={() => setPickerOpen(true)}
            title="Add image"
          >
            <Plus size={14} />
          </button>
        </div>
      </WorkflowNodeFrame>
      {pickerOpen && (
        <WorkflowMediaPickerDialog
          accept="image"
          multiSelect
          onConfirm={handlePickerConfirm}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </>
  )
})
