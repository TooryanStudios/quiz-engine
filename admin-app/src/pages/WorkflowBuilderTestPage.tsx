import { useMemo, useState } from 'react'
import {
  WorkflowBuilderCanvas,
  createWorkflowBuilderSampleWorkflow,
  type WorkflowBuilderDefinition,
  type WorkflowBuilderNotice,
} from '../features/workflowBuilder'
import { useToast } from '../lib/ToastContext'
import './WorkflowBuilderTestPage.css'

export default function WorkflowBuilderTestPage() {
  const { showToast } = useToast()
  const sampleWorkflow = useMemo(() => createWorkflowBuilderSampleWorkflow(), [])
  const [, setWorkflow] = useState<WorkflowBuilderDefinition>(sampleWorkflow)

  const handleNotify = (notice: WorkflowBuilderNotice) => {
    showToast({
      message: notice.message,
      type: notice.type || 'info',
    })
  }

  return (
    <div className="workflow-builder-test-page">
      <div className="workflow-builder-test-page__canvas">
        <WorkflowBuilderCanvas
          className="workflow-builder-canvas--fullscreen"
          initialWorkflow={sampleWorkflow}
          storageKey="workflow-builder-canvas-page-v1"
          onWorkflowChange={setWorkflow}
          onNotify={handleNotify}
          onExecuteWorkflow={async () => {
            // handle execution
          }}
        />
      </div>
    </div>
  )
}