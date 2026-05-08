import { memo } from 'react'
import { Image as ImageIcon } from 'lucide-react'
import { WorkflowNodeFrame } from './WorkflowNodeFrame'
import type { WorkflowBuilderNodeProps } from '../types'

const OUTPUT_SOCKETS = [{ id: 'out-asset', label: 'Reference', slot: 1 }] as const

export const AssetNode = memo(function AssetNode({ id, data, isConnectable }: WorkflowBuilderNodeProps) {
  return (
    <WorkflowNodeFrame
      nodeId={id}
      kind="asset"
      title={data.label || 'Reference Asset'}
      description=""
      icon={ImageIcon}
      isConnectable={isConnectable}
      outputSockets={OUTPUT_SOCKETS}
      bodyClassName="workflow-builder-node__body--asset"
      initialCollapsed={data.collapsed}
    >
      <div className="workflow-builder-node__thumbnails">
        {(!data.assetUrls || data.assetUrls.length === 0) ? (
          <>
            <div className="workflow-builder-node__thumbnail" />
            <div className="workflow-builder-node__thumbnail" />
            <div className="workflow-builder-node__thumbnail" />
          </>
        ) : (
          data.assetUrls.map((url, index) => (
            <div key={index} className="workflow-builder-node__thumbnail">
              <img src={url} alt="Reference Thumbnail" loading="lazy" />
            </div>
          ))
        )}
      </div>
    </WorkflowNodeFrame>
  )
})
