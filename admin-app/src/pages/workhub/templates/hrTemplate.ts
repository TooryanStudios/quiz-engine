import type { WorkhubHomeWidget, WorkhubHomeWidgetMetrics } from './homeWidgetTypes'
import { asCount, asPercent, countByStatusKeywords } from './homeWidgetUtils'
import type { WorkhubWorkspaceTemplateModule } from './types'

function buildHrHomeWidgets(metrics: WorkhubHomeWidgetMetrics): WorkhubHomeWidget[] {
  const openRoles = countByStatusKeywords(metrics, ['requisition', 'sourcing', 'screening'])
  const interviewLoop = countByStatusKeywords(metrics, ['interview'])
  const offerApprovals = countByStatusKeywords(metrics, ['offer_approval', 'offer'])
  const onboardingQueue = countByStatusKeywords(metrics, ['onboarding', 'onboarded'])
  const hiredCount = countByStatusKeywords(metrics, ['hired'])
  const closedCount = countByStatusKeywords(metrics, ['closed', 'rejected'])
  const hiringConversion = asPercent((hiredCount / Math.max(1, hiredCount + closedCount)) * 100)

  return [
    {
      id: 'hr-open-roles',
      title: 'Open roles',
      value: asCount(openRoles),
      detail: 'Requisitions and sourcing pipeline currently active.',
      tone: openRoles > 0 ? 'warn' : 'good',
    },
    {
      id: 'hr-interview-loop',
      title: 'Interview loop',
      value: asCount(interviewLoop),
      detail: 'Candidates in interview panel or evaluation stages.',
      tone: interviewLoop > 0 ? 'warn' : 'neutral',
    },
    {
      id: 'hr-offer-approvals',
      title: 'Offer approvals',
      value: asCount(offerApprovals),
      detail: 'Offers waiting for compensation and leadership approval.',
      tone: offerApprovals > 0 ? 'warn' : 'good',
    },
    {
      id: 'hr-onboarding-queue',
      title: 'Onboarding queue',
      value: asCount(onboardingQueue),
      detail: 'Candidates transitioning from offer to onboarding completion.',
      tone: onboardingQueue > 0 ? 'neutral' : 'good',
    },
    {
      id: 'hr-hiring-conversion',
      title: 'Hiring conversion',
      value: hiringConversion,
      detail: 'Hired candidates out of all closed candidate decisions.',
      tone: hiredCount >= closedCount ? 'good' : 'neutral',
    },
    {
      id: 'hr-team-workload',
      title: 'Team workload',
      value: asCount(metrics.inProgressTasks),
      detail: 'In-progress HR tasks across recruiting and people operations.',
      tone: metrics.inProgressTasks > 0 ? 'warn' : 'good',
    },
  ]
}

export const HR_WORKSPACE_TEMPLATE_MODULE: WorkhubWorkspaceTemplateModule = {
  definition: {
    id: 'hr',
    label: 'HR KPI workspace',
    description: 'Track hiring funnel KPIs, offer approvals, onboarding progress, and team capacity.',
    graphic: 'HR',
    highlights: ['Hiring funnel', 'KPI tracking', 'Onboarding'],
    workspaceType: 'hr',
    taskStatuses: [
      { id: 'requisition_planning', label: 'Requisition Planning', color: '#64748b' },
      { id: 'sourcing', label: 'Sourcing', color: '#2563eb' },
      { id: 'screening', label: 'Screening', color: '#0ea5e9' },
      { id: 'interview_panel', label: 'Interview Panel', color: '#8b5cf6' },
      { id: 'offer_approval', label: 'Offer Approval', color: '#f59e0b' },
      { id: 'onboarding', label: 'Onboarding', color: '#14b8a6' },
      { id: 'hired', label: 'Hired', color: '#10b981' },
      { id: 'closed', label: 'Closed', color: '#ef4444' },
    ],
    mode: 'preset',
  },
  buildHomeWidgets: buildHrHomeWidgets,
}
