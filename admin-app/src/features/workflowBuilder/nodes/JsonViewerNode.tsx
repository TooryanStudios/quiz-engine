import { memo, useMemo } from 'react'
import { useEdges, useNodes } from '@xyflow/react'
import { Braces } from 'lucide-react'
import { buildToorGenRequest } from '../../../lib/toorgen/generationRequestBuilder'
import { WorkflowNodeFrame } from './WorkflowNodeFrame'
import type { WorkflowBuilderNode, WorkflowBuilderNodeProps } from '../types'

const INPUT_SOCKETS = [{ id: 'in-data', label: 'Source', slot: 2 }] as const

const DEFAULT_PROMPT = 'create a videos of a falling fantasy book'

const BASE_SETTINGS = {
  provider: 'atlas' as const,
  model: 'seedance-2.0-fast',
  ratio: '16:9',
  duration: 5,
  resolution: '720p',
  generateAudio: true,
}

const GENERATION_KINDS = new Set([
  'generate',
  'gen_text_to_video',
  'gen_image_to_video',
  'gen_video_to_video',
  'gen_images_to_video',
  'gen_image',
  'video_extend',
])

export const JsonViewerNode = memo(function JsonViewerNode({ id, data, isConnectable }: WorkflowBuilderNodeProps) {
  const edges = useEdges()
  const nodes = useNodes() as WorkflowBuilderNode[]

  // Find the generation node wired into this viewer
  const genNode = useMemo(() => {
    const sourceId = edges.find((e) => e.target === id)?.source
    if (!sourceId) return null
    const node = nodes.find((n) => n.id === sourceId) ?? null
    return node && GENERATION_KINDS.has(node.type ?? '') ? node : null
  }, [edges, id, nodes])

  // Resolve prompt: collect ALL prompt nodes wired into the generation node and join their text
  const resolvedPrompt = useMemo(() => {
    if (!genNode) return DEFAULT_PROMPT
    const linkedPrompts = edges
      .filter((e) => e.target === genNode.id)
      .map((e) => nodes.find((n) => n.id === e.source))
      .filter((n) => n?.type === 'prompt')
      .map((n) => n?.data.promptText?.trim() || '')
      .filter(Boolean)
    return linkedPrompts.length > 0 ? linkedPrompts.join('\n') : DEFAULT_PROMPT
  }, [genNode, edges, nodes])

  const resolvedReferences = useMemo(() => {
    if (!genNode) return { fields: [], mediaUrls: {}, mentionReferences: [], hasReferences: false }

    const incomingByTarget = new Map<string, string[]>()
    edges.forEach((edge) => {
      const sources = incomingByTarget.get(edge.target) || []
      sources.push(edge.source)
      incomingByTarget.set(edge.target, sources)
    })

    const visited = new Set<string>()
    const stack = [genNode.id]
    while (stack.length > 0) {
      const current = stack.pop() || ''
      const incoming = incomingByTarget.get(current) || []
      incoming.forEach((sourceId) => {
        if (visited.has(sourceId)) return
        visited.add(sourceId)
        stack.push(sourceId)
      })
    }

    const refs: Array<{ kind: 'image' | 'video'; url: string; name: string }> = []
    const seen = new Set<string>()

    const pushRef = (kind: 'image' | 'video', rawUrl: string, rawName: string) => {
      const url = rawUrl.trim()
      if (!url || seen.has(url)) return
      seen.add(url)
      refs.push({ kind, url, name: rawName?.trim() || `${kind} reference` })
    }

    visited.forEach((upstreamId) => {
      const node = nodes.find((n) => n.id === upstreamId)
      if (!node) return
      if (node.type === 'image_reference' || node.type === 'video_reference') {
        const expectedKind = node.type === 'image_reference' ? 'image' : 'video'
        ;(node.data.referenceItems || []).forEach((item) => pushRef(expectedKind, item.url || '', item.name || ''))
        return
      }
      if (node.type === 'asset') {
        ;(node.data.assetUrls || []).forEach((url, index) => pushRef('image', url || '', `Image ${index + 1}`))
      }
    })

    const imageRefs = refs.filter((entry) => entry.kind === 'image')
    const videoRefs = refs.filter((entry) => entry.kind === 'video')
    const fields: Array<{ key: string; label: string; kind: 'image' | 'video'; helpText: string; placeholder: string }> = []
    const mediaUrls: Record<string, string> = {}

    imageRefs.forEach((item, index) => {
      const key = `ref_image_${index + 1}`
      fields.push({ key, label: item.name, kind: 'image', helpText: 'Connected image reference', placeholder: '' })
      mediaUrls[key] = item.url
    })
    videoRefs.forEach((item, index) => {
      const key = `ref_video_${index + 1}`
      fields.push({ key, label: item.name, kind: 'video', helpText: 'Connected video reference', placeholder: '' })
      mediaUrls[key] = item.url
    })

    const mentionReferences = refs.map((item) => ({
      mention: `@${(item.name || item.kind).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || item.kind}`,
      name: item.name,
      url: item.url,
      kind: item.kind,
      role: item.kind === 'video' ? 'reference_video' : 'reference_image',
    }))

    return { fields, mediaUrls, mentionReferences, hasReferences: refs.length > 0 }
  }, [edges, genNode, nodes])

  // Build the full live request JSON
  const json = useMemo(() => {
    if (!genNode) return null
    try {
      const isImagesToVideoNode = genNode.type === 'gen_images_to_video'
      const imageOnlyFields = resolvedReferences.fields.filter((field) => field.kind === 'image')
      const imageOnlyMediaUrls = Object.fromEntries(
        Object.entries(resolvedReferences.mediaUrls).filter(([key]) => key.startsWith('ref_image_')),
      )
      const imageOnlyMentions = resolvedReferences.mentionReferences.filter((entry) => entry.kind === 'image')

      const tabId = isImagesToVideoNode
        ? 'workflow-images-to-video'
        : resolvedReferences.hasReferences
          ? 'workflow-generate-reference'
          : 'workflow-generate'

      const req = buildToorGenRequest({
        tab: {
          id: tabId,
          requestMode: isImagesToVideoNode ? 'reference-to-video' : resolvedReferences.hasReferences ? 'reference-to-video' : 'text-to-video',
          fields: isImagesToVideoNode ? imageOnlyFields : resolvedReferences.fields,
        },
        state: {
          prompt: resolvedPrompt,
          mediaUrls: isImagesToVideoNode ? imageOnlyMediaUrls : resolvedReferences.mediaUrls,
        },
        settings: BASE_SETTINGS,
        mentionReferences: isImagesToVideoNode ? imageOnlyMentions : resolvedReferences.mentionReferences,
        combinedReferenceTabId: (resolvedReferences.hasReferences || isImagesToVideoNode) ? tabId : undefined,
      })

      if (isImagesToVideoNode) {
        const body = req.body as Record<string, unknown>
        body.model = 'bytedance/seedance-2.0-fast/reference-to-video'
        body.reference_images = Object.values(imageOnlyMediaUrls)
        body.reference_images_label = 'reference images'
        body.providerHint = 'atlas'
        delete body.reference_videos
      }

      return JSON.stringify({ endpoint: req.endpoint, body: req.body, settings: BASE_SETTINGS }, null, 2)
    } catch {
      return null
    }
  }, [genNode, resolvedPrompt, resolvedReferences])

  const metaLine = genNode
    ? `← ${genNode.data.label || genNode.type}`
    : 'Connect a generation node'

  return (
    <WorkflowNodeFrame
      nodeId={id}
      kind="json_viewer"
      title={data.label || 'JSON Viewer'}
      description=""
      icon={Braces}
      metaLine={metaLine}
      isConnectable={isConnectable}
      inputSockets={INPUT_SOCKETS}
      initialCollapsed={data.collapsed}
    >
      <div className="workflow-builder-node__json-viewer">
        {json ? (
          <pre className="workflow-builder-node__json-pre nodrag">{json}</pre>
        ) : (
          <div className="workflow-builder-node__json-empty">Connect a generation node to see the live request.</div>
        )}
      </div>
    </WorkflowNodeFrame>
  )
})

