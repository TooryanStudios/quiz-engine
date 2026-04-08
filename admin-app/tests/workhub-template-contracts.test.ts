import { describe, expect, it } from 'vitest'
import { buildWorkhubHomeWidgets } from '../src/pages/workhub/homeTemplateWidgets'
import {
  buildWorkhubWorkspaceTemplateDeletionGuard,
  buildWorkhubWorkspaceTemplateMigrationPlan,
  resolveWorkhubWorkspaceTemplateForWorkspace,
  resolveWorkhubWorkspaceTemplateIdForWorkspace,
  WORKHUB_WORKSPACE_TEMPLATES,
} from '../src/pages/workhub/workspaceTemplates'
import { WORKHUB_WORKSPACE_TEMPLATE_MODULES } from '../src/pages/workhub/templates/registry'
import {
  getTemplateCreationIntentMeta,
  resolveWorkspaceTemplateCreateActions,
  resolveWorkspaceTemplateIntents,
} from '../src/pages/workhub/templateCreationMeta'
import type { WorkhubHomeWidgetMetrics } from '../src/pages/workhub/templates/homeWidgetTypes'
import type { WorkhubWorkspaceTemplateId } from '../src/pages/workhub/templates/types'

function buildMetrics(
  taskStatusCounts: Record<string, number> = {},
  taskStatusLabels: Record<string, string> = {},
): WorkhubHomeWidgetMetrics {
  return {
    totalTasks: 0,
    activeTasks: 0,
    inProgressTasks: 0,
    urgentTasks: 0,
    completionRate: 0,
    projectsCount: 0,
    restrictedProjectsCount: 0,
    assignedMembersCount: 0,
    workspaceClientCount: 0,
    unreadNotifications: 0,
    pendingMembersCount: 0,
    upcomingDeadlineProjectsCount: 0,
    nearTermDeadlineProjectsCount: 0,
    overdueProjectsCount: 0,
    recentActivityCount: 0,
    taskStatusCounts,
    taskStatusLabels,
  }
}

function getTemplatePrefix(templateId: WorkhubWorkspaceTemplateId): string {
  switch (templateId) {
    case 'proposals_leads':
      return 'proposals-'
    default:
      return `${templateId}-`
  }
}

describe('workhub template contracts', () => {
  it('keeps template identifiers unique and discoverable', () => {
    const ids = WORKHUB_WORKSPACE_TEMPLATE_MODULES.map((module) => module.definition.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids).toEqual(expect.arrayContaining(['empty', 'projects', 'finance', 'hr', 'marketing', 'proposals_leads']))
  })

  it('ensures preset templates always expose statuses and no duplicate status ids', () => {
    WORKHUB_WORKSPACE_TEMPLATE_MODULES.forEach((module) => {
      if (module.definition.mode === 'empty') {
        expect(module.definition.taskStatuses).toBeUndefined()
        return
      }

      const hasStatuses = Boolean(module.definition.statusTemplateId) || (module.definition.taskStatuses?.length || 0) > 0
      expect(hasStatuses).toBe(true)

      const statusIds = (module.definition.taskStatuses || []).map((status) => status.id)
      expect(new Set(statusIds).size).toBe(statusIds.length)
    })
  })

  it('resolves workspace fallbacks for finance and hr to their domain templates', () => {
    expect(resolveWorkhubWorkspaceTemplateIdForWorkspace({ type: 'finance' })).toBe('finance')
    expect(resolveWorkhubWorkspaceTemplateIdForWorkspace({ type: 'hr' })).toBe('hr')
    expect(resolveWorkhubWorkspaceTemplateIdForWorkspace({ type: 'technical' })).toBe('projects')
    expect(resolveWorkhubWorkspaceTemplateIdForWorkspace({ type: 'technical', templateId: 'marketing' })).toBe('marketing')
  })

  it('flags missing template ids explicitly instead of silently treating them as valid template mappings', () => {
    const resolution = resolveWorkhubWorkspaceTemplateForWorkspace({ type: 'technical', templateId: 'removed_template' })
    expect(resolution.source).toBe('missing_template')
    expect(resolution.templateId).toBe('projects')
    expect(resolution.requestedTemplateId).toBe('removed_template')
    expect(resolution.warning).toContain('removed_template')
  })

  it('maps deprecated templates using explicit migration rules', () => {
    const resolution = resolveWorkhubWorkspaceTemplateForWorkspace({ type: 'hr', templateId: 'legacy_hr' })
    expect(resolution.source).toBe('deprecated_replacement')
    expect(resolution.templateId).toBe('hr')
    expect(resolution.warning).toContain('legacy_hr')

    const plan = buildWorkhubWorkspaceTemplateMigrationPlan([
      { id: 'ws-1', templateId: 'legacy_hr' },
      { id: 'ws-2', templateId: 'finance' },
    ])
    expect(plan).toEqual([
      {
        workspaceId: 'ws-1',
        fromTemplateId: 'legacy_hr',
        toTemplateId: 'hr',
        reason: expect.stringContaining('Legacy HR template'),
      },
    ])
  })

  it('blocks template deletion when template is default or actively referenced', () => {
    const defaultGuard = buildWorkhubWorkspaceTemplateDeletionGuard('projects', [])
    expect(defaultGuard.canDelete).toBe(false)
    expect(defaultGuard.reason).toContain('default')

    const referencedGuard = buildWorkhubWorkspaceTemplateDeletionGuard('finance', [
      { id: 'ws-100', templateId: 'finance' },
      { id: 'ws-101', templateId: 'projects' },
    ])
    expect(referencedGuard.canDelete).toBe(false)
    expect(referencedGuard.blockingWorkspaceIds).toEqual(['ws-100'])

    const clearGuard = buildWorkhubWorkspaceTemplateDeletionGuard('marketing', [
      { id: 'ws-200', templateId: 'finance' },
    ])
    expect(clearGuard.canDelete).toBe(true)
  })

  it('uses explicit domain status contracts for finance, proposals, and hr modules', () => {
    const modulesById = new Map(
      WORKHUB_WORKSPACE_TEMPLATE_MODULES.map((module) => [module.definition.id, module]),
    )

    const finance = modulesById.get('finance')
    expect(finance?.definition.statusTemplateId).toBeUndefined()
    expect((finance?.definition.taskStatuses || []).map((status) => status.id)).toEqual(
      expect.arrayContaining(['invoice_received', 'approval_pending', 'scheduled_payment', 'paid', 'reconciliation', 'disputed']),
    )

    const proposals = modulesById.get('proposals_leads')
    expect(proposals?.definition.statusTemplateId).toBeUndefined()
    expect((proposals?.definition.taskStatuses || []).map((status) => status.id)).toEqual(
      expect.arrayContaining(['lead_intake', 'proposal_drafting', 'approval_gate', 'submitted', 'awarded', 'archived_lost']),
    )

    const hr = modulesById.get('hr')
    expect((hr?.definition.taskStatuses || []).map((status) => status.id)).toEqual(
      expect.arrayContaining(['requisition_planning', 'interview_panel', 'offer_approval', 'onboarding', 'hired']),
    )
  })

  it('builds non-empty widget sets with stable shape per template', () => {
    WORKHUB_WORKSPACE_TEMPLATES.forEach((template) => {
      const statusCounts = Object.fromEntries((template.taskStatuses || []).map((status) => [status.id, 2]))
      const statusLabels = Object.fromEntries((template.taskStatuses || []).map((status) => [status.id, status.label]))
      const metrics = buildMetrics(statusCounts, statusLabels)

      const widgets = buildWorkhubHomeWidgets(template.id, metrics)
      expect(widgets.length).toBeGreaterThan(0)

      const ids = widgets.map((widget) => widget.id)
      expect(new Set(ids).size).toBe(ids.length)

      const expectedPrefix = getTemplatePrefix(template.id)
      widgets.forEach((widget) => {
        expect(widget.id.startsWith(expectedPrefix)).toBe(true)
        expect(widget.title.trim().length).toBeGreaterThan(0)
        expect(widget.value.trim().length).toBeGreaterThan(0)
        expect(widget.detail.trim().length).toBeGreaterThan(0)
      })
    })
  })

  it('computes domain widget values from template-specific statuses', () => {
    const financeWidgets = buildWorkhubHomeWidgets(
      'finance',
      buildMetrics(
        {
          invoice_received: 3,
          invoice_review: 2,
          approval_pending: 1,
          disputed: 1,
          paid: 4,
          reconciliation: 1,
        },
        {
          invoice_received: 'Invoice Received',
          invoice_review: 'Invoice Review',
          approval_pending: 'Approval Pending',
          disputed: 'Disputed',
          paid: 'Paid',
          reconciliation: 'Reconciliation',
        },
      ),
    )
    expect(financeWidgets.find((widget) => widget.id === 'finance-invoice-intake')?.value).toBe('5')

    const proposalsWidgets = buildWorkhubHomeWidgets(
      'proposals_leads',
      buildMetrics(
        {
          lead_intake: 2,
          qualification: 1,
          proposal_drafting: 3,
          approval_gate: 2,
          submitted: 1,
          awarded: 2,
          archived_lost: 1,
        },
        {
          lead_intake: 'Lead Intake',
          qualification: 'Qualification',
          proposal_drafting: 'Proposal Drafting',
          approval_gate: 'Approval Gate',
          submitted: 'Submitted',
          awarded: 'Awarded',
          archived_lost: 'Archived Lost',
        },
      ),
    )
    expect(proposalsWidgets.find((widget) => widget.id === 'proposals-lead-intake')?.value).toBe('3')

    const hrWidgets = buildWorkhubHomeWidgets(
      'hr',
      buildMetrics(
        {
          requisition_planning: 2,
          sourcing: 1,
          interview_panel: 3,
          offer_approval: 1,
          onboarding: 2,
          hired: 4,
          closed: 2,
        },
        {
          requisition_planning: 'Requisition Planning',
          sourcing: 'Sourcing',
          interview_panel: 'Interview Panel',
          offer_approval: 'Offer Approval',
          onboarding: 'Onboarding',
          hired: 'Hired',
          closed: 'Closed',
        },
      ),
    )
    expect(hrWidgets.find((widget) => widget.id === 'hr-open-roles')?.value).toBe('3')
  })

  it('centralizes create actions and intent labels by workspace template', () => {
    WORKHUB_WORKSPACE_TEMPLATES.forEach((template) => {
      const actions = resolveWorkspaceTemplateCreateActions(template.id)
      const intents = resolveWorkspaceTemplateIntents(template.id)
      expect(actions.length).toBeGreaterThan(0)
      expect(intents.length).toBeGreaterThan(0)
      expect(new Set(intents).size).toBe(intents.length)

      actions.forEach((action) => {
        const intentMeta = getTemplateCreationIntentMeta(action.intent)
        expect(intentMeta.title.trim().length).toBeGreaterThan(0)
        expect(intentMeta.submitLabel.trim().length).toBeGreaterThan(0)
        expect(intentMeta.subjectLabel.trim().length).toBeGreaterThan(0)
        expect(action.label.trim().length).toBeGreaterThan(0)
        expect(intents).toContain(action.intent)
      })
    })
  })

  it('keeps intent defaults stable for proposal and finance creation flows', () => {
    const proposalMeta = getTemplateCreationIntentMeta('proposal')
    expect(proposalMeta.defaults.projectType).toBe('tender')
    expect(proposalMeta.defaults.priority).toBe('high')

    const invoiceStreamMeta = getTemplateCreationIntentMeta('finance_invoice_stream')
    expect(invoiceStreamMeta.defaults.projectType).toBe('direct_award')
    expect(invoiceStreamMeta.defaults.billingCycle).toBe('monthly')
  })
})
