import { memo, useState } from 'react'
import { Trash2 } from 'lucide-react'
import type { WorkflowBuilderEdge, WorkflowBuilderNode, WorkflowBuilderNodeData } from './types'

type SelectedEdgeInfo = {
  edge: WorkflowBuilderEdge
  sourceLabel: string
  targetLabel: string
}

type WorkflowBuilderInspectorProps = {
  node: WorkflowBuilderNode | null
  selectedEdgeInfo?: SelectedEdgeInfo | null
  onChange: (nodeId: string, data: Partial<WorkflowBuilderNodeData>) => void
  onDelete: (nodeId: string) => void
  onDeleteEdge?: (edgeId: string) => void
  onRetryFirebaseSave?: (nodeId: string) => Promise<void> | void
  resolvedPrompt?: string
  liveRequest?: string
}

export const WorkflowBuilderInspector = memo(function WorkflowBuilderInspector({
  node,
  selectedEdgeInfo,
  onChange,
  onDelete,
  onDeleteEdge,
  onRetryFirebaseSave,
  resolvedPrompt: _resolvedPrompt,
  liveRequest
}: WorkflowBuilderInspectorProps) {
  const [isRetryingSave, setIsRetryingSave] = useState(false)

  // Edge selected — show edge inspector
  if (!node && selectedEdgeInfo) {
    const { edge, sourceLabel, targetLabel } = selectedEdgeInfo
    return (
      <div className="workflow-builder-canvas__inspector-panel">
        <div className="workflow-builder-canvas__inspector-header">
          <div>
            <h3>Connection</h3>
            <p>edge · {edge.id}</p>
          </div>
          <button
            type="button"
            className="workflow-builder-canvas__danger-btn"
            onClick={() => onDeleteEdge?.(edge.id)}
          >
            <Trash2 size={14} />
            Disconnect
          </button>
        </div>
        <label className="workflow-builder-canvas__field">
          <span>From</span>
          <div className="workflow-builder-canvas__readonly-field">{sourceLabel}</div>
        </label>
        <label className="workflow-builder-canvas__field">
          <span>To</span>
          <div className="workflow-builder-canvas__readonly-field">{targetLabel}</div>
        </label>
        {edge.sourceHandle ? (
          <label className="workflow-builder-canvas__field">
            <span>Source socket</span>
            <div className="workflow-builder-canvas__readonly-field">{edge.sourceHandle}</div>
          </label>
        ) : null}
        {edge.targetHandle ? (
          <label className="workflow-builder-canvas__field">
            <span>Target socket</span>
            <div className="workflow-builder-canvas__readonly-field">{edge.targetHandle}</div>
          </label>
        ) : null}
        <p className="workflow-builder-canvas__inspector-hint">Press <kbd>Delete</kbd> or <kbd>Backspace</kbd> to remove this connection.</p>
      </div>
    )
  }

  if (!node) {
    return (
      <div className="workflow-builder-canvas__inspector-empty">
        <h3>Inspector</h3>
        <p>Select a node to edit its configuration.</p>
      </div>
    )
  }

  const update = (data: Partial<WorkflowBuilderNodeData>) => onChange(node.id, data)
  const canShowGenerationOutputs = [
    'generate',
    'gen_text_to_video',
    'gen_image_to_video',
    'gen_video_to_video',
    'gen_images_to_video',
  ].includes(node.type)

  const firebaseVideoUrl = (node.data.generatedFirebaseVideoUrl || '').trim()
  const providerVideoUrl = (node.data.generatedSourceVideoUrl || '').trim()
  // Prefer firebase URL (stable), fall back to provider URL (may expire)
  const lastResultUrl = (firebaseVideoUrl || node.data.generatedVideoUrl || providerVideoUrl || '').trim()
  const videoSources = Array.from(new Set(
    [firebaseVideoUrl, node.data.generatedVideoUrl, providerVideoUrl]
      .filter((u): u is string => Boolean(u?.trim()))
      .map((u) => u.trim()),
  ))

  const openUrl = (url: string) => {
    if (!url.trim()) return
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const copyUrl = async (url: string) => {
    if (!url.trim()) return
    try {
      await navigator.clipboard.writeText(url)
    } catch {
      // ignore clipboard errors
    }
  }

  const handleRetryFirebaseSave = async () => {
    if (!onRetryFirebaseSave || isRetryingSave) return
    setIsRetryingSave(true)
    try {
      await onRetryFirebaseSave(node.id)
    } finally {
      setIsRetryingSave(false)
    }
  }

  return (
    <div className="workflow-builder-canvas__inspector-panel">
      <div className="workflow-builder-canvas__inspector-header">
        <div>
          <h3>{node.data.label || node.type}</h3>
          <p>{node.type} node</p>
        </div>
        <button type="button" className="workflow-builder-canvas__danger-btn" onClick={() => onDelete(node.id)}>
          <Trash2 size={14} />
          Remove
        </button>
      </div>

      <label className="workflow-builder-canvas__field">
        <span>Label</span>
        <input value={node.data.label || ''} onChange={(event) => update({ label: event.target.value })} />
      </label>

      <label className="workflow-builder-canvas__field">
        <span>Description</span>
        <textarea
          rows={3}
          value={node.data.description || ''}
          onChange={(event) => update({ description: event.target.value })}
          placeholder="Describe what this node does"
        />
      </label>

      <label className="workflow-builder-canvas__checkbox-field">
        <input
          type="checkbox"
          checked={node.data.required === true}
          onChange={(event) => update({ required: event.target.checked })}
        />
        <span>Required node</span>
      </label>

      {canShowGenerationOutputs ? (
        <>
          <div className="workflow-builder-canvas__inspector-subtitle">Last Result</div>

          {onRetryFirebaseSave ? (
            <button
              type="button"
              className="workflow-builder-canvas__retry-firebase-btn"
              onClick={() => { void handleRetryFirebaseSave() }}
              disabled={isRetryingSave || !lastResultUrl}
            >
              {isRetryingSave ? 'Retrying Firebase Save…' : '↑ Retry Firebase Save'}
            </button>
          ) : null}

          <label className="workflow-builder-canvas__field">
            <span>Last result URL (provider)</span>
            <div className="workflow-builder-canvas__readonly-field workflow-builder-canvas__readonly-field--mono">
              {lastResultUrl || 'No result URL available yet'}
            </div>
          </label>
          <div className="workflow-builder-canvas__mini-actions">
            <button
              type="button"
              className="workflow-builder-canvas__mini-btn"
              onClick={() => openUrl(lastResultUrl)}
              disabled={!lastResultUrl}
            >
              Open
            </button>
            <button
              type="button"
              className="workflow-builder-canvas__mini-btn"
              onClick={() => { void copyUrl(lastResultUrl) }}
              disabled={!lastResultUrl}
            >
              Copy
            </button>
          </div>

          {videoSources.length > 0 ? (
            <div className="workflow-builder-canvas__inspector-video">
              <video key={videoSources[0]} controls playsInline preload="metadata">
                {videoSources.map((src, index) => (
                  <source key={`${index}-${src}`} src={src} />
                ))}
              </video>
            </div>
          ) : null}

          <div className="workflow-builder-canvas__inspector-subtitle">Request Preview</div>
          <label className="workflow-builder-canvas__field">
            <span>Request to be sent (live)</span>
            <textarea
              className="workflow-builder-canvas__prompt-preview"
              readOnly
              rows={10}
              value={liveRequest ?? ''}
            />
          </label>
          {node.data.generationLastRequest ? (
            <label className="workflow-builder-canvas__field">
              <span>Request used in last run</span>
              <textarea
                className="workflow-builder-canvas__prompt-preview"
                readOnly
                rows={10}
                value={node.data.generationLastRequest}
              />
            </label>
          ) : null}
        </>
      ) : null}

      {node.type === 'input' ? (
        <>
          <label className="workflow-builder-canvas__field">
            <span>Data source</span>
            <select value={node.data.dataSource || 'manual'} onChange={(event) => update({ dataSource: event.target.value as WorkflowBuilderNodeData['dataSource'] })}>
              <option value="manual">Manual Input</option>
              <option value="api">API</option>
              <option value="database">Database</option>
              <option value="file">File Upload</option>
            </select>
          </label>
          <label className="workflow-builder-canvas__field">
            <span>Sample data</span>
            <textarea
              rows={6}
              value={node.data.sampleData || ''}
              onChange={(event) => update({ sampleData: event.target.value })}
              placeholder='{"key": "value"}'
            />
          </label>
        </>
      ) : null}

      {node.type === 'output' ? (
        <>
          <label className="workflow-builder-canvas__field">
            <span>Output type</span>
            <select value={node.data.outputType || 'console'} onChange={(event) => update({ outputType: event.target.value as WorkflowBuilderNodeData['outputType'] })}>
              <option value="console">Console</option>
              <option value="api">API</option>
              <option value="database">Database</option>
              <option value="file">File</option>
            </select>
          </label>
          <label className="workflow-builder-canvas__field">
            <span>Output format</span>
            <select value={node.data.outputFormat || 'json'} onChange={(event) => update({ outputFormat: event.target.value as WorkflowBuilderNodeData['outputFormat'] })}>
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
              <option value="xml">XML</option>
              <option value="text">Text</option>
            </select>
          </label>
        </>
      ) : null}

      {node.type === 'process' ? (
        <>
          <label className="workflow-builder-canvas__field">
            <span>Process type</span>
            <select value={node.data.processType || 'transform'} onChange={(event) => update({ processType: event.target.value as WorkflowBuilderNodeData['processType'] })}>
              <option value="transform">Transform</option>
              <option value="filter">Filter</option>
              <option value="aggregate">Aggregate</option>
              <option value="sort">Sort</option>
            </select>
          </label>
          <label className="workflow-builder-canvas__field">
            <span>Process configuration</span>
            <textarea
              rows={6}
              value={node.data.processConfig || ''}
              onChange={(event) => update({ processConfig: event.target.value })}
              placeholder='{"operation": "map"}'
            />
          </label>
        </>
      ) : null}

      {node.type === 'conditional' ? (
        <>
          <label className="workflow-builder-canvas__field">
            <span>Condition</span>
            <textarea
              rows={4}
              value={node.data.condition || ''}
              onChange={(event) => update({ condition: event.target.value })}
              placeholder="data.value > 0"
            />
          </label>
          <div className="workflow-builder-canvas__field-grid">
            <label className="workflow-builder-canvas__field">
              <span>Pass label</span>
              <input value={node.data.trueLabel || ''} onChange={(event) => update({ trueLabel: event.target.value })} />
            </label>
            <label className="workflow-builder-canvas__field">
              <span>Hold label</span>
              <input value={node.data.falseLabel || ''} onChange={(event) => update({ falseLabel: event.target.value })} />
            </label>
          </div>
        </>
      ) : null}

      {node.type === 'code' ? (
        <>
          <label className="workflow-builder-canvas__field">
            <span>Code language</span>
            <select value={node.data.codeLanguage || 'javascript'} onChange={(event) => update({ codeLanguage: event.target.value as WorkflowBuilderNodeData['codeLanguage'] })}>
              <option value="javascript">JavaScript</option>
              <option value="typescript">TypeScript</option>
            </select>
          </label>
          <label className="workflow-builder-canvas__field">
            <span>Code</span>
            <textarea rows={10} value={node.data.code || ''} onChange={(event) => update({ code: event.target.value })} />
          </label>
        </>
      ) : null}

      {node.type === 'generate' ? (
        <>
          <div className="workflow-builder-canvas__field-grid">
            <label className="workflow-builder-canvas__field">
              <span>Engine</span>
              <select value={node.data.generateEngine || 'internal'} onChange={(event) => update({ generateEngine: event.target.value as WorkflowBuilderNodeData['generateEngine'] })}>
                <option value="internal">Internal</option>
                <option value="openai">OpenAI</option>
                <option value="seedance">Seedance</option>
              </select>
            </label>
            <label className="workflow-builder-canvas__field">
              <span>Quality</span>
              <select value={node.data.generateQuality || 'balanced'} onChange={(event) => update({ generateQuality: event.target.value as WorkflowBuilderNodeData['generateQuality'] })}>
                <option value="draft">Draft</option>
                <option value="balanced">Balanced</option>
                <option value="high">High</option>
              </select>
            </label>
          </div>

          <label className="workflow-builder-canvas__field">
            <span>Target</span>
            <select value={node.data.generateTarget || 'image'} onChange={(event) => update({ generateTarget: event.target.value as WorkflowBuilderNodeData['generateTarget'] })}>
              <option value="image">Image</option>
              <option value="video">Video</option>
              <option value="document">Document</option>
            </select>
          </label>

          <label className="workflow-builder-canvas__field">
            <span>Last run</span>
            <div className="workflow-builder-canvas__readonly-field">
              {node.data.generateLastRunAt ? new Date(node.data.generateLastRunAt).toLocaleString() : 'Not run yet'}
            </div>
          </label>
        </>
      ) : null}

      {canShowGenerationOutputs ? (
        <>
          <div className="workflow-builder-canvas__inspector-subtitle">Generation Output</div>

          <label className="workflow-builder-canvas__field">
            <span>Provider video URL</span>
            <div className="workflow-builder-canvas__readonly-field workflow-builder-canvas__readonly-field--mono">
              {providerVideoUrl || 'No provider URL available yet'}
            </div>
          </label>
          <div className="workflow-builder-canvas__mini-actions">
            <button
              type="button"
              className="workflow-builder-canvas__mini-btn"
              onClick={() => openUrl(providerVideoUrl)}
              disabled={!providerVideoUrl}
            >
              Open
            </button>
            <button
              type="button"
              className="workflow-builder-canvas__mini-btn"
              onClick={() => { void copyUrl(providerVideoUrl) }}
              disabled={!providerVideoUrl}
            >
              Copy
            </button>
          </div>

          <label className="workflow-builder-canvas__field">
            <span>Firebase video URL</span>
            <div className="workflow-builder-canvas__readonly-field workflow-builder-canvas__readonly-field--mono">
              {firebaseVideoUrl || 'No Firebase URL (save failed or not attempted)'}
            </div>
          </label>
          <div className="workflow-builder-canvas__mini-actions">
            <button
              type="button"
              className="workflow-builder-canvas__mini-btn"
              onClick={() => openUrl(firebaseVideoUrl)}
              disabled={!firebaseVideoUrl}
            >
              Open
            </button>
            <button
              type="button"
              className="workflow-builder-canvas__mini-btn"
              onClick={() => { void copyUrl(firebaseVideoUrl) }}
              disabled={!firebaseVideoUrl}
            >
              Copy
            </button>
          </div>

          {node.data.generationStorageError ? (
            <label className="workflow-builder-canvas__field">
              <span>Storage error</span>
              <div className="workflow-builder-canvas__readonly-field workflow-builder-canvas__readonly-field--error">
                {node.data.generationStorageError}
              </div>
            </label>
          ) : null}
        </>
      ) : null}
    </div>
  )
}, (prev, next) => {
  // Only re-render if identity/data properties we actually display change
  if (prev.node?.id !== next.node?.id) return false
  if (prev.node?.type !== next.node?.type) return false
  if (prev.node?.data !== next.node?.data) return false
  if (prev.resolvedPrompt !== next.resolvedPrompt) return false
  if (prev.liveRequest !== next.liveRequest) return false
  if (prev.selectedEdgeInfo?.edge.id !== next.selectedEdgeInfo?.edge.id) return false
  return true
})