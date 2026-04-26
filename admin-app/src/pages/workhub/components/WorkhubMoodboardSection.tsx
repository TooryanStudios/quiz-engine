import { type Dispatch, type SetStateAction } from 'react'
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage'
import { storage } from '../../../lib/firebase'
import {
  deleteWorkhubMoodBoard,
  finalizeWorkhubMoodBoardImageUploads,
  type WorkhubMember,
  type WorkhubMoodBoard,
  type WorkhubTaskChecklistItem,
  type WorkhubTaskComment,
  updateWorkhubMoodBoardChecklist,
  updateWorkhubMoodBoardFlow,
  updateWorkhubMoodBoardTitle,
} from '../../../lib/workhubRepo'
import { FlowBoardCanvas } from '../../../components/flowboard/FlowBoardCanvas'
import { WorkhubChecklistCard } from './WorkhubChecklistCard'
import { WorkhubDiscussionCard } from './WorkhubDiscussionCard'
import { WorkhubProsConsBoard } from './WorkhubProsConsBoard'

type WorkhubSection = 'users' | 'tasks' | 'dashboard' | 'notes' | 'clients' | 'home' | 'moodboard'

interface WorkhubMoodboardSectionProps {
  isResolvingActiveMoodBoard: boolean
  activeMoodBoard: WorkhubMoodBoard | null
  selectedWorkspaceId: string
  resolvedMoodboardPanelMode: 'classic' | 'v2' | 'flow' | 'proscons'
  setSelectedMoodBoardId: (id: string) => void
  setActiveSection: Dispatch<SetStateAction<WorkhubSection>>
  showToast: (opts: { type: 'success' | 'error' | 'warning' | 'info'; message: string }) => void

  activeMoodBoardChecklist: WorkhubTaskChecklistItem[]
  moodBoardChecklistDraft: string
  setMoodBoardChecklistDraft: (value: string) => void
  moodBoardEditingChecklistId: string | null
  setMoodBoardEditingChecklistId: (value: string | null) => void
  moodBoardEditingChecklistText: string
  setMoodBoardEditingChecklistText: (value: string) => void

  comments: WorkhubTaskComment[]
  currentUid: string
  memberByUid: Record<string, WorkhubMember>
  formatTime: (value: unknown) => string
  editingCommentId: string
  editingCommentText: string
  onDiscussionEditStart: (comment: WorkhubTaskComment) => void
  onDiscussionEditChange: (value: string) => void
  onDiscussionEditCancel: () => void
  onDiscussionEditSave: (comment: WorkhubTaskComment) => Promise<void>
  onDiscussionDelete?: (comment: WorkhubTaskComment) => Promise<void>
  onDiscussionSend: (text: string) => Promise<void>
  busyKey: string

  normalizeColorInputValue: (value: unknown, fallback?: string) => string
  hexToRgba: (value: string, alpha: number) => string
  getColorAlpha: (value: unknown, fallback: number) => number
}

export function WorkhubMoodboardSection({
  isResolvingActiveMoodBoard,
  activeMoodBoard,
  selectedWorkspaceId,
  resolvedMoodboardPanelMode,
  setSelectedMoodBoardId,
  setActiveSection,
  showToast,
  activeMoodBoardChecklist,
  moodBoardChecklistDraft,
  setMoodBoardChecklistDraft,
  moodBoardEditingChecklistId,
  setMoodBoardEditingChecklistId,
  moodBoardEditingChecklistText,
  setMoodBoardEditingChecklistText,
  comments,
  currentUid,
  memberByUid,
  formatTime,
  editingCommentId,
  editingCommentText,
  onDiscussionEditStart,
  onDiscussionEditChange,
  onDiscussionEditCancel,
  onDiscussionEditSave,
  onDiscussionDelete,
  onDiscussionSend,
  busyKey,
  normalizeColorInputValue,
  hexToRgba,
  getColorAlpha,
}: WorkhubMoodboardSectionProps) {
  const flowCanvasStateKey = activeMoodBoard
    ? `${resolvedMoodboardPanelMode}:${activeMoodBoard.id}`
    : `${selectedWorkspaceId}:${resolvedMoodboardPanelMode}`

  if (isResolvingActiveMoodBoard) {
    return (
      <main className="workhub-section-stack">
        <section className="workhub-panel">
          <div className="workhub-empty-state">Loading mood board…</div>
        </section>
      </main>
    )
  }

  if (resolvedMoodboardPanelMode === 'proscons') {
    if (!activeMoodBoard) {
      return (
        <main className="workhub-section-stack">
          <section className="workhub-panel">
            <div className="workhub-empty-state">Select a Pros &amp; Cons board to start.</div>
          </section>
        </main>
      )
    }

    return (
      <WorkhubProsConsBoard
        activeMoodBoard={activeMoodBoard}
        setSelectedMoodBoardId={setSelectedMoodBoardId}
        setActiveSection={setActiveSection}
        showToast={showToast}
      />
    )
  }

  return (
    <main className="workhub-section-stack">
      <section className="workhub-panel workhub-flowboard-panel">
        <FlowBoardCanvas
          key={flowCanvasStateKey}
          variant={resolvedMoodboardPanelMode === 'flow' ? 'project' : 'mood'}
          stateKey={flowCanvasStateKey}
          boardTitle={activeMoodBoard?.title || ''}
          onBoardTitleChange={(nextTitle) => {
            if (!activeMoodBoard?.id) return
            void updateWorkhubMoodBoardTitle(activeMoodBoard.id, nextTitle)
          }}
          onBoardShare={() => {
            const url = typeof window === 'undefined' ? '' : window.location.href
            if (!url) return
            if (navigator.clipboard?.writeText) {
              void navigator.clipboard.writeText(url)
              showToast({ type: 'success', message: 'Board link copied.' })
              return
            }
            showToast({ type: 'info', message: 'Copy this URL from the address bar.' })
          }}
          onBoardDelete={() => {
            if (!activeMoodBoard?.id) return
            const shouldDelete = typeof window === 'undefined' ? true : window.confirm('Delete this mood board? This cannot be undone.')
            if (!shouldDelete) return
            void (async () => {
              await deleteWorkhubMoodBoard(activeMoodBoard.id)
              setSelectedMoodBoardId('')
              setActiveSection('dashboard')
            })()
          }}
          uploadImages={async (files, options) => {
            const boardId = activeMoodBoard?.id || ''
            if (!selectedWorkspaceId || !boardId) return []
            const urls: string[] = []
            const finalizedUploads: Array<{
              nodeId: string
              imageUrl: string
              label?: string
              position?: { x: number; y: number }
              style?: Record<string, unknown>
            }> = []

            for (const file of files) {
              const ext = file.name.split('.').pop() ?? 'jpg'
              const storagePath = `workhub-moodboards/${selectedWorkspaceId}/${boardId}/${crypto.randomUUID()}.${ext}`
              const storageRef = ref(storage, storagePath)
              await uploadBytes(storageRef, file, { contentType: file.type || 'application/octet-stream' })
              urls.push(await getDownloadURL(storageRef))
            }

            const draftNodes = options?.drafts || []
            urls.forEach((url, index) => {
              const draft = draftNodes[index]
              if (!draft?.id || !url) return
              finalizedUploads.push({
                nodeId: draft.id,
                imageUrl: url,
                label: draft.label,
                position: draft.position,
                style: draft.style,
              })
            })

            if (finalizedUploads.length > 0) {
              let finalized = false
              for (let attempt = 0; attempt < 3; attempt += 1) {
                try {
                  await finalizeWorkhubMoodBoardImageUploads(boardId, finalizedUploads)
                  finalized = true
                  break
                } catch {
                  // Retry transient write failures; final fallback keeps URLs returned to canvas.
                }
              }
              if (!finalized) {
                console.error('Failed to finalize mood board image upload drafts.', {
                  boardId,
                  draftCount: finalizedUploads.length,
                })
              }
            }
            return urls
          }}
          initialState={{
            nodes: (activeMoodBoard?.flowNodes as never[] | undefined) || [],
            edges: (activeMoodBoard?.flowEdges as never[] | undefined) || [],
            viewport: activeMoodBoard?.flowViewport || undefined,
            canvasAppearance: activeMoodBoard?.flowSettings?.canvasAppearance,
            showNavigationPreview: activeMoodBoard?.flowSettings?.showNavigationPreview,
          }}
          renderDetailsPanel={({ selectedNode, selectedData, canvasAppearance, showNavigationPreview, selectedGroupLabel, updateSelectedNodeData, updateSelectedNodeStyle, updateCanvasAppearance, setShowNavigationPreview, applyCanvasPreset, sendSelectedNodeToBack, bringSelectedNodeForward, toggleSelectedGroupLock, toggleSelectedGroupCollapse, removeSelectedNode }) => (
            <>
              <div className="workhub-task-attachments-head">
                <span>Details</span>
                <span>{resolvedMoodboardPanelMode === 'flow' ? 'Flow board' : 'Mood board'}</span>
              </div>
              <div className="workhub-detail-card">
                <h3>Board details</h3>
                <div className="flowboard-details-form">
                  <label>
                    Board title
                    <input
                      value={activeMoodBoard?.title || ''}
                      onChange={(event) => {
                        if (!activeMoodBoard?.id) return
                        const nextTitle = event.target.value
                        void updateWorkhubMoodBoardTitle(activeMoodBoard.id, nextTitle)
                      }}
                    />
                  </label>
                  {resolvedMoodboardPanelMode !== 'flow' ? (
                    <div className="workhub-empty-state">Use Add group in the top toolbar to place a background container behind a set of images.</div>
                  ) : null}
                  <button type="button" className="flowboard-btn flowboard-danger" onClick={removeSelectedNode} disabled={!selectedNode}>
                    Delete selected node
                  </button>
                </div>
              </div>

              <div className="workhub-detail-card">
                <h3>Selected node</h3>
                {selectedNode ? (
                  <div className="flowboard-details-form">
                    <label>
                      Text
                      <input
                        value={selectedData.label || ''}
                        onChange={(event) => updateSelectedNodeData({ label: event.target.value })}
                      />
                    </label>
                    <label>
                      Node color
                      <input
                        type="color"
                        value={normalizeColorInputValue(
                          selectedData.noteColor,
                          selectedNode.type === 'groupNode' || selectedData.kind === 'group' ? '#c7d6ff' : '#ffffff',
                        )}
                        onChange={(event) => {
                          const nextColor = event.target.value
                          const isGroupNode = selectedNode.type === 'groupNode' || selectedData.kind === 'group'
                          const nextNodeColor = isGroupNode
                            ? hexToRgba(nextColor, getColorAlpha(selectedData.noteColor, 0.16))
                            : nextColor
                          updateSelectedNodeData({ noteColor: nextNodeColor })
                          updateSelectedNodeStyle({ backgroundColor: nextNodeColor })
                        }}
                      />
                    </label>
                    {(selectedNode.type === 'imageNode' || selectedData.kind === 'image') && selectedGroupLabel ? (
                      <div className="workhub-empty-state">Attached to group: {selectedGroupLabel}</div>
                    ) : null}
                    {(selectedNode.type === 'groupNode' || selectedData.kind === 'group') ? (
                      <div className="flowboard-preset-row">
                        <button type="button" className="flowboard-btn" onClick={toggleSelectedGroupLock}>
                          {selectedData.locked === false ? 'Lock group' : 'Unlock group'}
                        </button>
                        <button type="button" className="flowboard-btn" onClick={toggleSelectedGroupCollapse}>
                          {selectedData.collapsed ? 'Expand group' : 'Collapse group'}
                        </button>
                      </div>
                    ) : null}
                    <div className="flowboard-preset-row">
                      <button type="button" className="flowboard-btn" onClick={sendSelectedNodeToBack}>Send to back</button>
                      <button type="button" className="flowboard-btn" onClick={bringSelectedNodeForward}>Bring forward</button>
                    </div>
                  </div>
                ) : (
                  <div className="workhub-empty-state">Select a node to edit text and color.</div>
                )}
              </div>

              <div className="workhub-detail-card">
                <h3>Canvas style</h3>
                {!selectedNode ? (
                  <div className="flowboard-details-form flowboard-canvas-appearance-form">
                    <label className="flowboard-toggle-field">
                      <span>Show navigation preview</span>
                      <input
                        type="checkbox"
                        checked={showNavigationPreview}
                        onChange={(event) => setShowNavigationPreview(event.target.checked)}
                      />
                    </label>
                    <label>
                      Canvas background
                      <input
                        type="color"
                        value={canvasAppearance.backgroundColor}
                        onChange={(event) => updateCanvasAppearance({ backgroundColor: event.target.value })}
                      />
                    </label>
                    <label>
                      Pattern color
                      <input
                        type="color"
                        value={canvasAppearance.patternColor}
                        onChange={(event) => updateCanvasAppearance({ patternColor: event.target.value })}
                      />
                    </label>
                    <label>
                      Pattern
                      <select
                        value={canvasAppearance.pattern}
                        onChange={(event) => updateCanvasAppearance({ pattern: event.target.value as 'dots' | 'lines' })}
                      >
                        <option value="dots">Dots</option>
                        <option value="lines">Grid lines</option>
                      </select>
                    </label>
                    <div className="flowboard-preset-row">
                      <button type="button" className="flowboard-btn" onClick={() => applyCanvasPreset('bright')}>Bright</button>
                      <button type="button" className="flowboard-btn" onClick={() => applyCanvasPreset('dark')}>Dark</button>
                      <button type="button" className="flowboard-btn" onClick={() => applyCanvasPreset('reset')}>Reset</button>
                    </div>
                  </div>
                ) : (
                  <div className="workhub-empty-state">Click empty canvas area to edit background and pattern.</div>
                )}
              </div>

              <div className="workhub-detail-card">
                <h3>Selected image</h3>
                {selectedNode && (selectedNode.type === 'imageNode' || selectedData.kind === 'image') ? (
                  <div className="flowboard-details-form">
                    <label>
                      Label
                      <input
                        value={selectedData.label || ''}
                        onChange={(event) => updateSelectedNodeData({ label: event.target.value })}
                      />
                    </label>
                    <label>
                      Image URL
                      <input
                        value={selectedData.imageUrl || ''}
                        onChange={(event) => updateSelectedNodeData({ imageUrl: event.target.value })}
                      />
                    </label>
                    <label>
                      Caption
                      <input
                        value={String(selectedData.caption || '')}
                        onChange={(event) => updateSelectedNodeData({ caption: event.target.value })}
                      />
                    </label>
                    <label>
                      Tags
                      <input
                        value={String(selectedData.tags || '')}
                        onChange={(event) => updateSelectedNodeData({ tags: event.target.value })}
                      />
                    </label>
                    <label>
                      Width
                      <input
                        type="number"
                        min={120}
                        value={Number((selectedNode.style as Record<string, unknown> | undefined)?.width) || 220}
                        onChange={(event) => updateSelectedNodeStyle({ width: Number(event.target.value) })}
                      />
                    </label>
                    <label>
                      Height
                      <input
                        type="number"
                        min={90}
                        value={Number((selectedNode.style as Record<string, unknown> | undefined)?.height) || 150}
                        onChange={(event) => updateSelectedNodeStyle({ height: Number(event.target.value) })}
                      />
                    </label>
                  </div>
                ) : (
                  <div className="workhub-empty-state">Click an image node to view details.</div>
                )}
              </div>

              <WorkhubChecklistCard
                title="Checklist"
                items={activeMoodBoardChecklist}
                draftValue={moodBoardChecklistDraft}
                onDraftChange={setMoodBoardChecklistDraft}
                onAdd={() => {
                  if (!activeMoodBoard?.id) return
                  const text = moodBoardChecklistDraft.trim()
                  if (!text) return
                  const next = [...activeMoodBoardChecklist, { id: crypto.randomUUID(), text, completed: false }]
                  setMoodBoardChecklistDraft('')
                  void updateWorkhubMoodBoardChecklist(activeMoodBoard.id, next)
                }}
                editingItemId={moodBoardEditingChecklistId}
                editingItemText={moodBoardEditingChecklistText}
                onEditingItemTextChange={setMoodBoardEditingChecklistText}
                onEditStart={(item) => {
                  setMoodBoardEditingChecklistId(item.id)
                  setMoodBoardEditingChecklistText(item.text)
                }}
                onEditSave={(item) => {
                  if (!activeMoodBoard?.id) return
                  const text = moodBoardEditingChecklistText.trim()
                  const next = activeMoodBoardChecklist.map((entry) => entry.id === item.id ? { ...entry, text: text || entry.text } : entry)
                  setMoodBoardEditingChecklistId(null)
                  setMoodBoardEditingChecklistText('')
                  void updateWorkhubMoodBoardChecklist(activeMoodBoard.id, next)
                }}
                onEditCancel={() => {
                  setMoodBoardEditingChecklistId(null)
                  setMoodBoardEditingChecklistText('')
                }}
                onToggle={(item, checked) => {
                  if (!activeMoodBoard?.id) return
                  const next = activeMoodBoardChecklist.map((entry) => entry.id === item.id ? { ...entry, completed: checked } : entry)
                  void updateWorkhubMoodBoardChecklist(activeMoodBoard.id, next)
                }}
                onRemove={(item) => {
                  if (!activeMoodBoard?.id) return
                  const next = activeMoodBoardChecklist.filter((entry) => entry.id !== item.id)
                  void updateWorkhubMoodBoardChecklist(activeMoodBoard.id, next)
                }}
                emptyStateText="No checklist items yet for this mood board."
              />

              <WorkhubDiscussionCard
                title="Discussion"
                comments={comments}
                currentUid={currentUid}
                memberByUid={memberByUid}
                formatTime={formatTime}
                editingId={editingCommentId}
                editingText={editingCommentText}
                onEditStart={onDiscussionEditStart}
                onEditChange={onDiscussionEditChange}
                onEditCancel={onDiscussionEditCancel}
                onEditSave={onDiscussionEditSave}
                onDelete={onDiscussionDelete}
                editBusyKey={busyKey}
                deleteBusyKey={busyKey}
                onComposerSend={onDiscussionSend}
                composerBusy={busyKey === 'comment'}
                emptyStateText="No comments yet."
              />
            </>
          )}
          onStateChange={(state) => {
            if (!activeMoodBoard?.id) return
            void updateWorkhubMoodBoardFlow(
              activeMoodBoard.id,
              state.nodes as WorkhubMoodBoard['flowNodes'],
              state.edges as WorkhubMoodBoard['flowEdges'],
              state.viewport,
              {
                canvasAppearance: state.settings.canvasAppearance,
                showNavigationPreview: state.settings.showNavigationPreview,
              },
            )
          }}
        />
      </section>
    </main>
  )
}
