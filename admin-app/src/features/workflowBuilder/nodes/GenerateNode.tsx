import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { Sparkles } from 'lucide-react'
import { useWorkflowBuilderNode } from '../WorkflowBuilderCanvasContext'
import { WorkflowNodeFrame } from './WorkflowNodeFrame'
import type { WorkflowBuilderNodeProps } from '../types'

const BASE_INPUT_SOCKETS = [
  { id: 'prompt', label: 'Prompt', slot: 1 },
  { id: 'reference', label: 'Reference', slot: 3 },
  { id: 'rules', label: 'Rules', slot: 4 },
] as const

const STYLE_INPUT_SOCKET = { id: 'style', label: 'Style', slot: 2 } as const
const VIDEO_INPUT_SOCKET = { id: 'video', label: 'Video', slot: 2 } as const

const OUTPUT_SOCKETS = [{ id: 'result', label: 'Result', slot: 2 }] as const

function useGenerateNode(nodeId: string, data: WorkflowBuilderNodeProps['data']) {
  const { patchNode, executeNode, isExecuting } = useWorkflowBuilderNode(nodeId)

  const handleGenerate = useCallback(async () => {
    patchNode({ generateLastRunAt: new Date().toISOString() })
    await executeNode()
  }, [executeNode, patchNode])

  return {
    isExecuting,
    lastRunLabel: data.generateLastRunAt ? new Date(data.generateLastRunAt).toLocaleTimeString() : 'Never',
    handleGenerate,
    setEngine: (value: WorkflowBuilderNodeProps['data']['generateEngine']) => patchNode({ generateEngine: value }),
    setQuality: (value: WorkflowBuilderNodeProps['data']['generateQuality']) => patchNode({ generateQuality: value }),
    setTarget: (value: WorkflowBuilderNodeProps['data']['generateTarget']) => patchNode({ generateTarget: value }),
    setExtendMode: (value: 'before' | 'after') => patchNode({ extendMode: value }),
  }
}

export const GenerateNode = memo(function GenerateNode({ id, data, isConnectable }: WorkflowBuilderNodeProps) {
  const state = useGenerateNode(id, data)
  const extendMode = data.extendMode as 'before' | 'after' | undefined
  const isExtendNode = extendMode !== undefined
  const inputSockets = useMemo(() => (
    isExtendNode
      ? [BASE_INPUT_SOCKETS[0], VIDEO_INPUT_SOCKET, BASE_INPUT_SOCKETS[1], BASE_INPUT_SOCKETS[2]]
      : [BASE_INPUT_SOCKETS[0], STYLE_INPUT_SOCKET, BASE_INPUT_SOCKETS[1], BASE_INPUT_SOCKETS[2]]
  ), [isExtendNode])

  const videoSources = useMemo(
    () => [
      data.generatedVideoUrl?.trim() || '',
      data.generatedFirebaseVideoUrl?.trim() || '',
      data.generatedSourceVideoUrl?.trim() || '',
    ].filter(Boolean),
    [data.generatedFirebaseVideoUrl, data.generatedSourceVideoUrl, data.generatedVideoUrl],
  )
  const [activeVideoSrc, setActiveVideoSrc] = useState(videoSources[0] || '')

  useEffect(() => {
    setActiveVideoSrc(videoSources[0] || '')
  }, [videoSources])

  const hasGeneratedVideo = Boolean(activeVideoSrc)
  const showProviderFallbackBadge = Boolean(data.generationStorageError && data.generatedSourceVideoUrl?.trim())

  return (
    <WorkflowNodeFrame
      nodeId={id}
      kind="generate"
      title={data.label || 'Generate Visuals'}
      description=""
      icon={Sparkles}
      metaLine={`Engine: ${data.generateEngine || 'internal'} · Target: ${data.generateTarget || 'image'}`}
      required={data.required}
      isConnectable={isConnectable}
      inputSockets={inputSockets}
      outputSockets={OUTPUT_SOCKETS}
      bodyClassName="workflow-builder-node__body--generate"
      initialCollapsed={data.collapsed}
    >
      {isExtendNode && (
        <div className="workflow-builder-node__extend-mode-row">
          {(['before', 'after'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              className={`workflow-builder-node__extend-mode-btn nodrag${extendMode === mode ? ' workflow-builder-node__extend-mode-btn--active' : ''}`}
              onClick={() => state.setExtendMode(mode)}
            >
              Extend {mode === 'before' ? 'Before' : 'After'}
            </button>
          ))}
        </div>
      )}

      <div className="workflow-builder-node__preview--video">
        {showProviderFallbackBadge ? (
          <div className="workflow-builder-node__status-badge">Provider Link Active</div>
        ) : null}
        {hasGeneratedVideo ? (
          <video
            src={activeVideoSrc}
            controls
            playsInline
            preload="metadata"
            onError={() => {
              const nextSource = videoSources.find((source) => source && source !== activeVideoSrc) || ''
              if (nextSource) {
                setActiveVideoSrc(nextSource)
              }
            }}
          />
        ) : data.generateTarget === 'video' ? (
           <div className="workflow-builder-node__preview--video-placeholder">No video generated yet</div>
        ) : (
           <div className="workflow-builder-node__preview--video-placeholder">No image generated yet</div>
        )}
      </div>

      <div className="workflow-builder-node__settings">
        <label className="workflow-builder-node__setting">
          <span>Engine</span>
          <select className="nodrag" value={data.generateEngine || 'internal'} onChange={(event) => state.setEngine(event.target.value as WorkflowBuilderNodeProps['data']['generateEngine'])}>
            <option value="internal">Internal</option>
            <option value="openai">OpenAI</option>
            <option value="seedance">Seedance</option>
          </select>
        </label>
        <label className="workflow-builder-node__setting">
          <span>Quality</span>
          <select className="nodrag" value={data.generateQuality || 'balanced'} onChange={(event) => state.setQuality(event.target.value as WorkflowBuilderNodeProps['data']['generateQuality'])}>
            <option value="draft">Draft</option>
            <option value="balanced">Balanced</option>
            <option value="high">High</option>
          </select>
        </label>
        <label className="workflow-builder-node__setting">
          <span>Target</span>
          <select className="nodrag" value={data.generateTarget || 'video'} onChange={(event) => state.setTarget(event.target.value as WorkflowBuilderNodeProps['data']['generateTarget'])}>
            <option value="image">Image</option>
            <option value="video">Video</option>
            <option value="document">Document</option>
          </select>
        </label>
      </div>

      <div className="workflow-builder-node__actions">
        <button type="button" className="workflow-builder-node__primary-btn nodrag" onClick={() => { void state.handleGenerate() }} disabled={state.isExecuting}>
          {state.isExecuting ? 'Generating...' : isExtendNode ? `Extend ${extendMode === 'before' ? 'Before' : 'After'}` : 'Generate'}
        </button>
        <span className="workflow-builder-node__status workflow-builder-node__status--muted">
          {data.generationStatus?.trim() || `Last run: ${state.lastRunLabel}`}
        </span>
      </div>
    </WorkflowNodeFrame>
  )
})