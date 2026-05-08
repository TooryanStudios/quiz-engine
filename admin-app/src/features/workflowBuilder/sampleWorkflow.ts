import type { WorkflowBuilderDefinition } from './types'

export function createWorkflowBuilderSampleWorkflow(): WorkflowBuilderDefinition {
  return {
    nodes: [
      {
        id: 'sample-input-prompt',
        type: 'input',
        position: { x: 70, y: 110 },
        data: {
          label: 'Prompt Brief',
          description: 'Primary creative direction',
          dataSource: 'manual',
          sampleData: 'Design a cinematic launch still with dramatic side light and clear product focus.',
        },
      },
      {
        id: 'sample-input-style',
        type: 'input',
        position: { x: 70, y: 250 },
        data: {
          label: 'Style Board',
          description: 'Visual language and references',
          dataSource: 'file',
          sampleData: 'Muted industrial palette, brushed metal, restrained highlights, premium editorial framing.',
        },
      },
      {
        id: 'sample-input-reference',
        type: 'input',
        position: { x: 70, y: 390 },
        data: {
          label: 'Reference Asset',
          description: 'Existing source image or board',
          dataSource: 'database',
          sampleData: 'Existing hero product packshot and two composition references from the asset library.',
        },
      },
      {
        id: 'sample-input-rules',
        type: 'input',
        position: { x: 70, y: 530 },
        data: {
          label: 'Rules',
          description: 'Safety and delivery constraints',
          dataSource: 'manual',
          sampleData: 'No extra products, preserve logo proportions, leave safe text area on the right side.',
        },
      },
      {
        id: 'sample-generate',
        type: 'generate',
        position: { x: 470, y: 250 },
        data: {
          label: 'Generate Key Visual',
          description: 'Combine prompt, style, references, and rules',
          generateEngine: 'openai',
          generateQuality: 'high',
          generateTarget: 'image',
        },
      },
      {
        id: 'sample-process',
        type: 'process',
        position: { x: 880, y: 285 },
        data: {
          label: 'Post Process',
          description: 'Prepare the generated result for delivery',
          processType: 'transform',
          processConfig: '{"action":"normalize_metadata","surface":"campaign_still"}',
        },
      },
      {
        id: 'sample-output',
        type: 'output',
        position: { x: 1260, y: 320 },
        data: {
          label: 'Delivery Output',
          description: 'Final handoff node',
          outputType: 'file',
          outputFormat: 'json',
        },
      },
    ],
    edges: [
      {
        id: 'sample-edge-prompt-generate',
        source: 'sample-input-prompt',
        sourceHandle: 'output',
        target: 'sample-generate',
        targetHandle: 'prompt',
      },
      {
        id: 'sample-edge-style-generate',
        source: 'sample-input-style',
        sourceHandle: 'output',
        target: 'sample-generate',
        targetHandle: 'style',
      },
      {
        id: 'sample-edge-reference-generate',
        source: 'sample-input-reference',
        sourceHandle: 'output',
        target: 'sample-generate',
        targetHandle: 'reference',
      },
      {
        id: 'sample-edge-rules-generate',
        source: 'sample-input-rules',
        sourceHandle: 'output',
        target: 'sample-generate',
        targetHandle: 'rules',
      },
      {
        id: 'sample-edge-generate-process',
        source: 'sample-generate',
        sourceHandle: 'result',
        target: 'sample-process',
        targetHandle: 'primary',
      },
      {
        id: 'sample-edge-rules-process',
        source: 'sample-input-rules',
        sourceHandle: 'output',
        target: 'sample-process',
        targetHandle: 'context',
      },
      {
        id: 'sample-edge-process-output',
        source: 'sample-process',
        sourceHandle: 'result',
        target: 'sample-output',
        targetHandle: 'input',
      },
    ],
  }
}