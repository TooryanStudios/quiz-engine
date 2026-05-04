import type { WorkhubHomeWidget, WorkhubHomeWidgetMetrics } from './homeWidgetTypes'
import { asCount, asPercent, countByStatusKeywords } from './homeWidgetUtils'
import type { WorkhubWorkspaceTemplateModule } from './types'

function buildHrHomeWidgets(metrics: WorkhubHomeWidgetMetrics): WorkhubHomeWidget[] {
  const activeProfiles = countByStatusKeywords(metrics, ['employee_master', 'profile'])
  const accessReviews = countByStatusKeywords(metrics, ['authority', 'approval'])
  const leaveCases = countByStatusKeywords(metrics, ['leave', 'return_to_work'])
  const leaveBreachRisk = countByStatusKeywords(metrics, ['leave_sla_risk', 'leave escalation', 'leave overdue'])
  const kpiCycles = countByStatusKeywords(metrics, ['kpi', 'okr', 'performance'])
  const initiatives = countByStatusKeywords(metrics, ['initiative', 'engagement', 'recognition', 'motivation'])
  const learningRecords = countByStatusKeywords(metrics, ['learning', 'certification', 'upgrade'])
  const certificationDueSoon = countByStatusKeywords(metrics, ['cert_due_soon', 'renewal_due', 'expiry soon'])
  const complianceRecords = countByStatusKeywords(metrics, ['policy', 'compliance', 'document'])
  const peopleThroughput = asPercent((metrics.completionRate / 100) * 100)

  return [
    {
      id: 'hr-employee-master',
      title: 'Employee master',
      value: asCount(activeProfiles),
      detail: 'Employee records with identity, authority, and role profile coverage.',
      tone: activeProfiles > 0 ? 'good' : 'neutral',
    },
    {
      id: 'hr-access-reviews',
      title: 'Authority reviews',
      value: asCount(accessReviews),
      detail: 'Pending authority, approval, and profile-governance reviews.',
      tone: accessReviews > 0 ? 'warn' : 'good',
    },
    {
      id: 'hr-leave-lifecycle',
      title: 'Leave lifecycle',
      value: asCount(leaveCases),
      detail: 'Leave requests and return-to-work plans under active management.',
      tone: leaveCases > 0 ? 'warn' : 'neutral',
    },
    {
      id: 'hr-leave-sla-risk',
      title: 'Leave SLA risk',
      value: asCount(leaveBreachRisk),
      detail: 'Leave cases at risk of breaching response/approval SLA windows.',
      tone: leaveBreachRisk > 0 ? 'danger' : 'good',
    },
    {
      id: 'hr-kpi-cycles',
      title: 'KPI cycles',
      value: asCount(kpiCycles),
      detail: 'Live KPI / OKR cycles with cadence-based review checkpoints.',
      tone: kpiCycles > 0 ? 'good' : 'neutral',
    },
    {
      id: 'hr-motivation-programs',
      title: 'Motivation programs',
      value: asCount(initiatives),
      detail: 'Engagement, initiative, and recognition programs in execution.',
      tone: initiatives > 0 ? 'good' : 'neutral',
    },
    {
      id: 'hr-learning-compliance',
      title: 'Learning & compliance',
      value: `${asCount(learningRecords)} / ${asCount(complianceRecords)} / ${asCount(certificationDueSoon)}`,
      detail: `Learning vs compliance vs cert-due-soon. Throughput ${peopleThroughput}.`,
      tone: learningRecords >= complianceRecords ? 'good' : 'warn',
    },
  ]
}

export const HR_WORKSPACE_TEMPLATE_MODULE: WorkhubWorkspaceTemplateModule = {
  definition: {
    id: 'hr',
    label: 'HR KPI workspace',
    description: 'Manage employee master data, leave lifecycle, KPI cycles, authority governance, and learning compliance.',
    graphic: 'HR',
    highlights: ['Employee lifecycle', 'KPI + OKR cadence', 'Leave and compliance'],
    workspaceType: 'hr',
    taskStatuses: [
      { id: 'organization_design', label: 'Organization Design', color: '#334155' },
      { id: 'department_setup', label: 'Department Setup', color: '#0f766e' },
      { id: 'sub_department_setup', label: 'Sub-department Setup', color: '#0891b2' },
      { id: 'employee_master', label: 'Employee Master', color: '#0f766e' },
      { id: 'authority_review', label: 'Authority Review', color: '#b45309' },
      { id: 'joining_documentation', label: 'Joining Documentation', color: '#1d4ed8' },
      { id: 'leave_review', label: 'Leave Review', color: '#0ea5e9' },
      { id: 'leave_sla_risk', label: 'Leave SLA Risk', color: '#dc2626' },
      { id: 'return_to_work', label: 'Return To Work', color: '#14b8a6' },
      { id: 'performance_kpi_cycle', label: 'Performance KPI Cycle', color: '#7c3aed' },
      { id: 'initiative_program', label: 'Initiative Program', color: '#db2777' },
      { id: 'certification_tracking', label: 'Certification Tracking', color: '#2563eb' },
      { id: 'cert_due_soon', label: 'Certification Due Soon', color: '#f97316' },
      { id: 'policy_compliance', label: 'Policy Compliance', color: '#dc2626' },
      { id: 'archived', label: 'Archived', color: '#64748b' },
    ],
    mode: 'preset',
  },
  buildHomeWidgets: buildHrHomeWidgets,
}
