import { memo, useContext } from 'react'
import {
  Handle,
  NodeResizer,
  Position,
  type NodeProps,
} from '@xyflow/react'
import {
  type FreshFlowNode,
  GENERATION_INPUT_SOCKET_RULES,
} from './FreshFlowStudioContext'
import { FreshFlowCanvasContext } from './FreshFlowCanvasContext'
import { EditableNodeTitle } from './EditableNodeTitle'
import '../toorgen/ToorGenFlowCanvas.css'

function CtrlHandle({ nodeId, className = '', ...props }: any) {
  // Same logic from ToorGen Flow Canvas for ctrl handles if needed, 
  // but standard Handle works here since XYFlow handles edges normally.
  return <Handle className={className} {...props} />
}

const SEEDANCE_PROMPT_CHARACTER_LIMIT = 2000

function ToorGenLegacyNodeInner({ id, data, selected }: NodeProps<FreshFlowNode>) {
  const {
    onPatchNode,
    getHandleConnectionCount,
  } = useContext(FreshFlowCanvasContext)
  
  // Extract global info from FreshFlowStudioContext if needed, or fallback
  const globalModel = 'atlas-2.0'
  const globalMode = 'image-to-video'
  const globalDuration = 5

  const nodeStatus = data.generationStatus || 'IDLE'
  const nodeTaskId = data.taskId || ''
  const nodeVideoUrl = data.previewVideoUrl || ''
  const nodeErrorMessage = data.errorMessage || ''
  const nodeEffectiveModel = data.model || globalModel
  const nodeProviderLabel = '' 
  const nodeGenerationMode = data.generationMode || 'normal'
  const effectiveVideoMode = data.videoMode || globalMode

  const nodeIsGenerating = nodeStatus === 'SUBMITTING' || nodeStatus === 'IN_PROGRESS'
  
  // prompt length depends on connections, but we just use data.body or something for local prompt.
  // Actually, FreshFlowStudioContext nodes compute connected summary outside, or here.
  // For exact same UI, we replicate the fields.
  const promptLength = data.body?.length || 0
  const isPromptOverLimit = promptLength > SEEDANCE_PROMPT_CHARACTER_LIMIT

  const inputSockets = Object.entries(GENERATION_INPUT_SOCKET_RULES).map(([socketId, rule]) => ({ id: socketId, ...rule }))

  const count = inputSockets.reduce((acc, socket) => acc + getHandleConnectionCount(id, socket.id, 'target'), 0)
  const connectedSummary = count > 0 ? `${count} input${count === 1 ? '' : 's'} connected` : 'Connect prompt, image, or video nodes'

  return (
    <section className={`tgfc-node tgfc-node--generation${selected ? ' is-selected' : ''}`}>
      <NodeResizer minWidth={330} minHeight={300} isVisible={selected} lineStyle={{ borderColor: '#d9f02f' }} handleStyle={{ background: '#d9f02f', borderColor: '#07080b' }} />
      {inputSockets.map((socket) => (
        <CtrlHandle
          key={socket.id}
          nodeId={id}
          id={socket.id}
          type="target"
          position={Position.Left}
          className={`tgfc-handle tgfc-handle--generation-input is-${socket.id}`}
        />
      ))}
      <CtrlHandle nodeId={id} id="generation-output" type="source" position={Position.Right} className="tgfc-handle" />
      
      <div className="tgfc-generation-sockets" aria-hidden="true">
        {inputSockets.map((socket) => (
          <div key={socket.id} className={`tgfc-generation-socket-label is-${socket.id}`}>
            <strong>{socket.label}</strong>
            <span>{socket.accepts}</span>
          </div>
        ))}
      </div>

      <div className="tgfc-node-dragbar">
        <EditableNodeTitle kind={data.kind} nodeId={id} title={data.title} />
      </div>

      <p>{data.body || 'Connect inputs, then render.'}</p>

      <div className="tgfc-generation-node-preview">
        {nodeVideoUrl ? <video key={nodeVideoUrl} src={nodeVideoUrl} controls playsInline /> : nodeIsGenerating ? <span>Rendering...</span> : <span>Video preview</span>}
      </div>

      {nodeTaskId ? <div className="tgfc-node-task-id">Task: {nodeTaskId}</div> : null}
      
      {(nodeProviderLabel || nodeEffectiveModel) ? (
        <div className="tgfc-node-runtime-meta">
          {nodeProviderLabel ? `Backend: ${nodeProviderLabel}` : ''}
          {nodeProviderLabel && nodeEffectiveModel ? ' · ' : ''}
          {nodeEffectiveModel ? `Model: ${nodeEffectiveModel}` : ''}
        </div>
      ) : null}

      {nodeErrorMessage ? <div className="tgfc-error tgfc-node-error">{nodeErrorMessage}</div> : null}
      
      {isPromptOverLimit ? (
        <div className="tgfc-error tgfc-node-error tgfc-node-prompt-limit-alert" role="alert" aria-live="assertive">
          Prompt too long: {promptLength.toLocaleString()} / {SEEDANCE_PROMPT_CHARACTER_LIMIT.toLocaleString()} characters.
        </div>
      ) : null}

      <div className={`tgfc-node-count${isPromptOverLimit ? ' is-over-limit' : ''}`}>
        Prompt: {promptLength.toLocaleString()} / {SEEDANCE_PROMPT_CHARACTER_LIMIT.toLocaleString()} characters
      </div>
      <span className="tgfc-connected-summary">{connectedSummary}</span>

      <div className="tgfc-node-mode-row">
        <select
          className="tgfc-node-input nodrag nowheel"
          value={nodeGenerationMode}
          onChange={(event) => onPatchNode(id, { generationMode: event.target.value as any })}
          aria-label="Generation mode"
        >
          <option value="normal">Normal generation</option>
          <option value="extend">Extend clip</option>
        </select>
        <select
          className="tgfc-node-input nodrag nowheel"
          value={effectiveVideoMode}
          onChange={(event) => onPatchNode(id, { videoMode: event.target.value as any })}
          aria-label="Video mode"
        >
          <option value="text-to-video">Text to video</option>
          <option value="image-to-video">Image to video</option>
        </select>
      </div>

      <div className="tgfc-node-settings-row">
        <select
          className="tgfc-node-input nodrag nowheel"
          value={nodeEffectiveModel}
          onChange={(event) => onPatchNode(id, { model: event.target.value as any })}
          aria-label="Model"
        >
          <option value="atlas-2.0">2.0 (Atlas Cloud)</option>
          <option value="seedance-2.0-fast">2.0 Fast (Atlas Cloud)</option>
          <option value="seedance-2.0">2.0 (Seedance API)</option>
          <option value="seedance-1.5">1.5 (Seedance API)</option>
        </select>
        <select
          className="tgfc-node-input nodrag nowheel"
          value={String(data.duration || globalDuration)}
          onChange={(event) => onPatchNode(id, { duration: Number(event.target.value) })}
          aria-label="Duration"
        >
          <option value="5">5s</option>
          <option value="10">10s</option>
          <option value="15">15s</option>
        </select>
      </div>

      <div className="tgfc-node-actions">
        <button type="button" onClick={() => console.log('Copy JSON clicked', id)} disabled={!nodeIsGenerating && nodeStatus !== 'SUCCESS'}>
          Copy JSON
        </button>
        <button
          type="button"
          className="tgfc-node-primary-btn"
          onClick={() => {
            onPatchNode(id, { generationStatus: 'SUBMITTING', errorMessage: '' })
            console.log('Generate clicked', id)
          }}
          disabled={nodeIsGenerating || isPromptOverLimit}
        >
          {nodeIsGenerating ? 'Generating...' : 'Generate from inputs'}
        </button>
      </div>
    </section>
  )
}

export const ToorGenLegacyNode = memo(ToorGenLegacyNodeInner, (prev, next) => prev.selected === next.selected && prev.data === next.data)
