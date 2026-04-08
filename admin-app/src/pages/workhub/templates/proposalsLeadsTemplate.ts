import type { WorkhubHomeWidget, WorkhubHomeWidgetMetrics } from './homeWidgetTypes'
import { asCount, asPercent, countByStatusKeywords } from './homeWidgetUtils'
import type { WorkhubWorkspaceTemplateModule } from './types'

function buildProposalsLeadsHomeWidgets(metrics: WorkhubHomeWidgetMetrics): WorkhubHomeWidget[] {
  const leadIntake = countByStatusKeywords(metrics, ['lead_intake', 'qualification', 'discovery'])
  const draftingQueue = countByStatusKeywords(metrics, ['proposal_drafting', 'draft', 'writing', 'internal_review'])
  const approvalQueue = countByStatusKeywords(metrics, ['approval_gate', 'approval', 'signoff'])
  const submittedQueue = countByStatusKeywords(metrics, ['submitted', 'negotiation', 'clarification'])
  const wonCount = countByStatusKeywords(metrics, ['awarded', 'won'])
  const lostCount = countByStatusKeywords(metrics, ['archived_lost', 'lost', 'rejected'])
  const winRate = asPercent((wonCount / Math.max(1, wonCount + lostCount)) * 100)

  return [
    {
      id: 'proposals-lead-intake',
      title: 'Lead intake',
      value: asCount(leadIntake),
      detail: 'New opportunities in intake, qualification, and discovery.',
      tone: leadIntake > 0 ? 'warn' : 'neutral',
    },
    {
      id: 'proposals-drafting',
      title: 'Drafting queue',
      value: asCount(draftingQueue),
      detail: 'Proposals actively being written and internally reviewed.',
      tone: draftingQueue > 0 ? 'warn' : 'good',
    },
    {
      id: 'proposals-approvals',
      title: 'Approval gate',
      value: asCount(approvalQueue),
      detail: 'Documents waiting for legal/commercial signoff.',
      tone: approvalQueue > 0 ? 'warn' : 'good',
    },
    {
      id: 'proposals-submissions',
      title: 'Submitted/negotiation',
      value: asCount(submittedQueue),
      detail: 'Opportunities with client in active response cycle.',
      tone: submittedQueue > 0 ? 'neutral' : 'good',
    },
    {
      id: 'proposals-wins',
      title: 'Won opportunities',
      value: asCount(wonCount),
      detail: 'Proposals converted into successful outcomes.',
      tone: wonCount > 0 ? 'good' : 'neutral',
    },
    {
      id: 'proposals-losses',
      title: 'Lost opportunities',
      value: asCount(lostCount),
      detail: 'Track reasons and improve qualification quality.',
      tone: lostCount > 0 ? 'danger' : 'good',
    },
    {
      id: 'proposals-win-rate',
      title: 'Pipeline win rate',
      value: winRate,
      detail: 'Won proposals as a share of decided opportunities.',
      tone: wonCount >= lostCount ? 'good' : 'neutral',
    },
  ]
}

export const PROPOSALS_LEADS_WORKSPACE_TEMPLATE_MODULE: WorkhubWorkspaceTemplateModule = {
  definition: {
    id: 'proposals_leads',
    label: 'Proposals & leads workspace',
    description: 'Manage lead qualification, proposal drafting, approvals, submissions, and outcomes.',
    graphic: 'LEAD',
    highlights: ['Lead qualification', 'Approval workflow', 'Win/loss tracking'],
    workspaceType: 'technical',
    taskStatuses: [
      { id: 'lead_intake', label: 'Lead Intake', color: '#64748b' },
      { id: 'qualification', label: 'Qualification', color: '#2563eb' },
      { id: 'discovery_call', label: 'Discovery Call', color: '#0ea5e9' },
      { id: 'proposal_drafting', label: 'Proposal Drafting', color: '#8b5cf6' },
      { id: 'internal_review', label: 'Internal Review', color: '#6366f1' },
      { id: 'approval_gate', label: 'Approval Gate', color: '#f59e0b' },
      { id: 'submitted', label: 'Submitted', color: '#f97316' },
      { id: 'negotiation', label: 'Negotiation', color: '#06b6d4' },
      { id: 'awarded', label: 'Awarded', color: '#10b981' },
      { id: 'archived_lost', label: 'Archived Lost', color: '#ef4444' },
    ],
    mode: 'preset',
  },
  buildHomeWidgets: buildProposalsLeadsHomeWidgets,
}
