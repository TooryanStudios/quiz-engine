import { useEffect, useMemo, useState } from 'react'
import type { IDockviewPanelProps } from 'dockview-react'
import {
  GENERATION_ASPECT_RATIO_OPTIONS,
  GENERATION_DURATION_OPTIONS,
  GENERATION_INPUT_SOCKET_RULES,
  GENERATION_MODEL_OPTIONS,
  GENERATION_MODE_OPTIONS,
  GENERATION_VIDEO_MODE_OPTIONS,
  THEME_LABEL,
  useFreshFlowStudio,
} from '../../components/flow/FreshFlowStudioContext'

type FlowInspectorEdgePanelParams = {
  label?: string
  phase?: string
  position?: string
}

export function LabNewLayoutFlowInspectorEdgePanel(props: IDockviewPanelProps<FlowInspectorEdgePanelParams>) {
  const panelParams = props.params ?? {}
  const {
    isReady,
    folderName,
    flowDocuments,
    selectedFlowId,
    currentFlowDocument,
    selectedNode,
    edgeStyleMode,
    selectFlow,
    createFlow,
    renameFlow,
    deleteFlow,
    setEdgeStyleMode,
    patchNode,
    updateImageReferenceUrls,
    addImageReferenceSlot,
    removeImageReferenceSlot,
  } = useFreshFlowStudio()
  const [flowNameDraft, setFlowNameDraft] = useState('')

  useEffect(() => {
    setFlowNameDraft(currentFlowDocument?.name ?? '')
  }, [currentFlowDocument?.id, currentFlowDocument?.name])

  const socketSummary = useMemo(
    () => Object.entries(GENERATION_INPUT_SOCKET_RULES).map(([socketId, rule]) => ({ id: socketId, ...rule })),
    [],
  )

  return (
    <div className="lab-newlayout-edge-panel lab-newlayout-edge-panel--flow-inspector" data-position={panelParams.position ?? 'edge'}>
      <div className="lab-newlayout-edge-head">
        <span className="lab-newlayout-edge-title">{panelParams.label ?? props.api.title}</span>
        {panelParams.phase ? <span className="lab-newlayout-phase-badge">{panelParams.phase}</span> : null}
      </div>

      {!isReady ? (
        <div className="lab-newlayout-flow-inspector-empty">
          <div className="lab-newlayout-flow-inspector-kicker">FLOW STUDIO</div>
          <p>Select a project and folder in Explorer to load flow documents and node details here.</p>
        </div>
      ) : (
        <>
          <div className="lab-newlayout-flow-inspector-section">
            <div className="lab-newlayout-flow-inspector-section-head">
              <div>
                <div className="lab-newlayout-flow-inspector-kicker">CURRENT FOLDER</div>
                <div className="lab-newlayout-flow-inspector-folder">{folderName || 'Untitled Folder'}</div>
              </div>
              <button type="button" className="lab-newlayout-explorer-button" onClick={createFlow}>New Flow</button>
            </div>

            <div className="lab-newlayout-flow-list" aria-label="Flow documents">
              {flowDocuments.map((flow) => (
                <button
                  key={flow.id}
                  type="button"
                  className={`lab-newlayout-explorer-folder${flow.id === selectedFlowId ? ' is-active' : ''}`}
                  onClick={() => selectFlow(flow.id)}
                >
                  {flow.name}
                </button>
              ))}
            </div>

            {currentFlowDocument ? (
              <div className="lab-newlayout-flow-form-grid">
                <label className="lab-newlayout-flow-form-field">
                  <span>Flow name</span>
                  <input
                    value={flowNameDraft}
                    onChange={(event) => setFlowNameDraft(event.target.value)}
                    onBlur={() => renameFlow(currentFlowDocument.id, flowNameDraft)}
                    placeholder="Flow name"
                  />
                </label>
                <label className="lab-newlayout-flow-form-field">
                  <span>Connector style</span>
                  <select value={edgeStyleMode} onChange={(event) => setEdgeStyleMode(event.target.value as 'curved' | 'straight')}>
                    <option value="curved">Curved</option>
                    <option value="straight">Straight</option>
                  </select>
                </label>
                <button type="button" className="lab-newlayout-flow-danger-btn" onClick={() => deleteFlow(currentFlowDocument.id)}>
                  Delete Flow
                </button>
              </div>
            ) : null}
          </div>

          <div className="lab-newlayout-flow-inspector-section">
            <div className="lab-newlayout-flow-inspector-section-head">
              <div>
                <div className="lab-newlayout-flow-inspector-kicker">NODE DETAILS</div>
                <div className="lab-newlayout-flow-inspector-folder">{selectedNode?.data.title || 'No node selected'}</div>
              </div>
            </div>

            {!selectedNode ? (
              <div className="lab-newlayout-flow-inspector-empty">
                <p>Click a node in the Flow canvas to inspect and edit it here.</p>
              </div>
            ) : (
              <div className="lab-newlayout-flow-form-grid">
                <label className="lab-newlayout-flow-form-field">
                  <span>Kind</span>
                  <div className="lab-newlayout-flow-readonly">{selectedNode.data.kind}</div>
                </label>
                <label className="lab-newlayout-flow-form-field">
                  <span>Title</span>
                  <input value={selectedNode.data.title} onChange={(event) => patchNode(selectedNode.id, { title: event.target.value })} />
                </label>
                <label className="lab-newlayout-flow-form-field">
                  <span>Theme</span>
                  <select value={selectedNode.data.theme} onChange={(event) => patchNode(selectedNode.id, { theme: event.target.value as typeof selectedNode.data.theme })}>
                    {Object.entries(THEME_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </label>

                {selectedNode.data.kind === 'image-reference' ? (
                  <div className="lab-newlayout-flow-form-field lab-newlayout-flow-form-field--full">
                    <span>Image references</span>
                    <div className="lab-newlayout-flow-slot-list">
                      {selectedNode.data.mediaUrls.map((url, index) => (
                        <div key={`${selectedNode.id}-image-${index}`} className="lab-newlayout-flow-slot-row">
                          <input
                            value={url}
                            onChange={(event) => {
                              const nextUrls = [...selectedNode.data.mediaUrls]
                              nextUrls[index] = event.target.value
                              updateImageReferenceUrls(selectedNode.id, nextUrls)
                            }}
                            placeholder={`Image reference ${index + 1}`}
                          />
                          <button type="button" className="lab-newlayout-flow-slot-remove" onClick={() => removeImageReferenceSlot(selectedNode.id, index)}>X</button>
                        </div>
                      ))}
                    </div>
                    <button type="button" className="lab-newlayout-explorer-button" onClick={() => addImageReferenceSlot(selectedNode.id)}>Add Image Slot</button>
                  </div>
                ) : null}

                {selectedNode.data.kind === 'video-reference' || selectedNode.data.kind === 'audio-reference' ? (
                  <label className="lab-newlayout-flow-form-field lab-newlayout-flow-form-field--full">
                    <span>{selectedNode.data.kind === 'audio-reference' ? 'Audio URL' : 'Video URL'}</span>
                    <input
                      value={selectedNode.data.mediaUrl}
                      onChange={(event) => patchNode(selectedNode.id, { mediaUrl: event.target.value })}
                      placeholder={selectedNode.data.kind === 'audio-reference' ? 'https://voice-reference.mp3' : 'https://reference-video.mp4'}
                    />
                  </label>
                ) : null}

                {selectedNode.data.kind === 'generation' ? (
                  <>
                    <label className="lab-newlayout-flow-form-field">
                      <span>Generation mode</span>
                      <select value={selectedNode.data.generationMode || 'normal'} onChange={(event) => patchNode(selectedNode.id, { generationMode: event.target.value as 'normal' | 'extend' })}>
                        {GENERATION_MODE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                    <label className="lab-newlayout-flow-form-field">
                      <span>Video mode</span>
                      <select value={selectedNode.data.videoMode || 'text-to-video'} onChange={(event) => patchNode(selectedNode.id, { videoMode: event.target.value as 'text-to-video' | 'image-to-video' })}>
                        {GENERATION_VIDEO_MODE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                    <label className="lab-newlayout-flow-form-field">
                      <span>Model</span>
                      <select value={selectedNode.data.model || 'atlas-2.0'} onChange={(event) => patchNode(selectedNode.id, { model: event.target.value as typeof selectedNode.data.model })}>
                        {GENERATION_MODEL_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                      </select>
                    </label>
                    <label className="lab-newlayout-flow-form-field">
                      <span>Duration</span>
                      <select value={String(selectedNode.data.duration || 5)} onChange={(event) => patchNode(selectedNode.id, { duration: Number(event.target.value) })}>
                        {GENERATION_DURATION_OPTIONS.map((value) => <option key={value} value={value}>{value}s</option>)}
                      </select>
                    </label>
                    <label className="lab-newlayout-flow-form-field">
                      <span>Aspect ratio</span>
                      <select value={selectedNode.data.aspectRatio || '16:9'} onChange={(event) => patchNode(selectedNode.id, { aspectRatio: event.target.value as typeof selectedNode.data.aspectRatio })}>
                        {GENERATION_ASPECT_RATIO_OPTIONS.map((value) => <option key={value} value={value}>{value}</option>)}
                      </select>
                    </label>
                    <div className="lab-newlayout-flow-form-field lab-newlayout-flow-form-field--full">
                      <span>Accepted inputs</span>
                      <div className="lab-newlayout-flow-socket-list">
                        {socketSummary.map((socket) => (
                          <div key={socket.id} className="lab-newlayout-flow-readonly">
                            {socket.label}: {socket.accepts}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : null}

                <label className="lab-newlayout-flow-form-field lab-newlayout-flow-form-field--full">
                  <span>Notes</span>
                  <textarea
                    rows={selectedNode.data.kind === 'group' ? 8 : selectedNode.data.kind === 'generation' ? 5 : 4}
                    value={selectedNode.data.body}
                    onChange={(event) => patchNode(selectedNode.id, { body: event.target.value })}
                    placeholder="Adjust details for this node"
                  />
                </label>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}