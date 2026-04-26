import { useEffect, useRef, useState } from 'react'

export interface WorkhubTabsCardItem {
  id: string
  title: string
}

interface WorkhubTabsCardProps {
  title?: string
  tabs: WorkhubTabsCardItem[]
  activeTabId: string
  readOnly?: boolean
  emptyStateText?: string
  addButtonLabel?: string
  onAdd?: () => void
  onSwitch: (tabId: string) => void
  onRename?: (tabId: string, nextTitle: string) => void
  onDelete?: (tabId: string) => void
  onReorder?: (fromTabId: string, toTabId: string) => void
}

export function WorkhubTabsCard({
  title = 'Tabs',
  tabs,
  activeTabId,
  readOnly = false,
  emptyStateText = 'No tabs yet.',
  addButtonLabel = 'Add tab',
  onAdd,
  onSwitch,
  onRename,
  onDelete,
  onReorder,
}: WorkhubTabsCardProps) {
  const [renamingTabId, setRenamingTabId] = useState('')
  const [renamingTabTitle, setRenamingTabTitle] = useState('')
  const [pendingDeleteTabId, setPendingDeleteTabId] = useState('')
  const renameInputRef = useRef<HTMLInputElement | null>(null)
  const dragTabIdRef = useRef('')

  useEffect(() => {
    if (!renamingTabId || !renameInputRef.current) return
    renameInputRef.current.focus()
    renameInputRef.current.select()
  }, [renamingTabId])

  useEffect(() => {
    if (renamingTabId && !tabs.some((tab) => tab.id === renamingTabId)) {
      setRenamingTabId('')
      setRenamingTabTitle('')
    }
    if (pendingDeleteTabId && !tabs.some((tab) => tab.id === pendingDeleteTabId)) {
      setPendingDeleteTabId('')
    }
  }, [pendingDeleteTabId, renamingTabId, tabs])

  function startRename(tab: WorkhubTabsCardItem) {
    if (readOnly || !onRename) return
    setPendingDeleteTabId('')
    setRenamingTabId(tab.id)
    setRenamingTabTitle(tab.title)
  }

  function commitRename() {
    if (!renamingTabId || !onRename) return
    const trimmed = renamingTabTitle.trim()
    if (!trimmed) {
      setRenamingTabId('')
      setRenamingTabTitle('')
      return
    }
    onRename(renamingTabId, trimmed)
    setRenamingTabId('')
    setRenamingTabTitle('')
  }

  function handleDeleteRequest(tabId: string) {
    if (readOnly || !onDelete || tabs.length <= 1) return
    setRenamingTabId('')
    setRenamingTabTitle('')
    setPendingDeleteTabId((current) => (current === tabId ? '' : tabId))
  }

  function handleConfirmDelete() {
    if (!pendingDeleteTabId || !onDelete) return
    onDelete(pendingDeleteTabId)
    setPendingDeleteTabId('')
  }

  function handleTabDragStart(tabId: string) {
    if (readOnly || !onReorder) return
    dragTabIdRef.current = tabId
  }

  function handleTabDragOver(event: React.DragEvent<HTMLDivElement>, targetTabId: string) {
    if (readOnly || !onReorder) return
    event.preventDefault()
    const sourceTabId = dragTabIdRef.current
    if (!sourceTabId || sourceTabId === targetTabId) return
    onReorder(sourceTabId, targetTabId)
    dragTabIdRef.current = targetTabId
  }

  function handleTabDragEnd() {
    dragTabIdRef.current = ''
  }

  return (
    <div className="workhub-detail-card workhub-doc-tabs-card">
      <div className="workhub-doc-tabs-card-head">
        <h3>{title}</h3>
        {!readOnly && onAdd && (
          <button
            type="button"
            className="workhub-ghost-mini"
            onClick={onAdd}
            title={addButtonLabel}
            aria-label={addButtonLabel}
          >
            + Add
          </button>
        )}
      </div>

      {tabs.length === 0 ? (
        <p className="workhub-doc-tabs-empty">{emptyStateText}</p>
      ) : (
        <div className="workhub-doc-tabs-list">
          {tabs.map((tab) => (
            <div
              key={tab.id}
              className={`workhub-doc-tab-row${tab.id === activeTabId ? ' is-active' : ''}`}
              draggable={!readOnly && !!onReorder && tabs.length > 1}
              onDragStart={() => handleTabDragStart(tab.id)}
              onDragOver={(event) => handleTabDragOver(event, tab.id)}
              onDragEnd={handleTabDragEnd}
            >
              {!readOnly && !!onReorder && tabs.length > 1 && (
                <span className="workhub-doc-tab-row-drag" aria-hidden="true" title="Drag to reorder">⠿</span>
              )}

              {renamingTabId === tab.id ? (
                <input
                  ref={renameInputRef}
                  className="workhub-doc-tab-rename-input"
                  aria-label="Tab title"
                  title="Tab title"
                  placeholder="Tab title"
                  value={renamingTabTitle}
                  onChange={(event) => setRenamingTabTitle(event.target.value)}
                  onBlur={commitRename}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      commitRename()
                    }
                    if (event.key === 'Escape') {
                      setRenamingTabId('')
                      setRenamingTabTitle('')
                    }
                  }}
                />
              ) : (
                <button
                  type="button"
                  className="workhub-doc-tab-row-title"
                  onClick={() => onSwitch(tab.id)}
                  onDoubleClick={() => startRename(tab)}
                  title={tab.id === activeTabId ? 'Currently viewing' : 'Switch to this tab'}
                >
                  {tab.title}
                </button>
              )}

              {!readOnly && (onRename || onDelete) && (
                <div className="workhub-doc-tab-row-actions">
                  {onRename && (
                    <button
                      type="button"
                      className="workhub-ghost-mini"
                      title="Rename"
                      aria-label="Rename tab"
                      onClick={() => startRename(tab)}
                    >
                      ✎
                    </button>
                  )}
                  {onDelete && tabs.length > 1 && pendingDeleteTabId !== tab.id && (
                    <button
                      type="button"
                      className="workhub-ghost-mini is-danger"
                      title="Remove tab"
                      aria-label="Remove tab"
                      onClick={() => handleDeleteRequest(tab.id)}
                    >
                      ×
                    </button>
                  )}
                  {onDelete && pendingDeleteTabId === tab.id && (
                    <span className="workhub-tab-delete-confirm">
                      <span className="workhub-tab-delete-confirm-label">Delete?</span>
                      <button
                        type="button"
                        className="workhub-ghost-mini is-danger"
                        title="Confirm delete"
                        aria-label="Confirm delete tab"
                        onClick={handleConfirmDelete}
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        className="workhub-ghost-mini"
                        title="Cancel"
                        aria-label="Cancel delete tab"
                        onClick={() => setPendingDeleteTabId('')}
                      >
                        ✕
                      </button>
                    </span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}