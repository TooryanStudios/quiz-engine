import { useMemo } from 'react'
import type { WorkhubClient, WorkhubProject, WorkhubProjectIntent } from '../../../lib/workhubRepo'
import type { WorkhubProjectColorMeaning } from '../constants'
import type { WorkhubWorkspaceTemplateId } from '../workspaceTemplates'

export type WorkhubPipelineReportGroupKey =
  | 'open_proposals'
  | 'closed_proposals'
  | 'submitted_proposals'
  | 'dropped_proposals'
  | 'running_projects'

export interface WorkhubPipelineReportRow {
  id: string
  name: string
  clientName: string
  typeLabel: string
  statusLabel: string
  submissionDate: string
  submissionTime: string
  amount: number
  currency: string
}

export interface WorkhubPipelineReportGroup {
  key: WorkhubPipelineReportGroupKey
  label: string
  items: WorkhubPipelineReportRow[]
  totalAmountByCurrency: Record<string, number>
  totalAmountLabel: string
}

interface UseWorkhubPipelineReportParams {
  projects: WorkhubProject[]
  allClientById: Record<string, WorkhubClient>
  projectIntentById: Record<string, WorkhubProjectIntent>
  selectedWorkspaceTemplateId: WorkhubWorkspaceTemplateId
  projectColorMeanings: WorkhubProjectColorMeaning[]
  isWorkspaceOverview: boolean
}

interface WorkhubPipelineReportState {
  available: boolean
  groups: WorkhubPipelineReportGroup[]
  totalItems: number
  groupLabelByKey: Record<WorkhubPipelineReportGroupKey, string>
  buildMarkdownTable: (selectedGroups: Set<WorkhubPipelineReportGroupKey>) => string
}

const GROUP_ORDER: Array<{ key: WorkhubPipelineReportGroupKey; label: string }> = [
  { key: 'open_proposals', label: 'Open proposals' },
  { key: 'closed_proposals', label: 'Closed proposals' },
  { key: 'submitted_proposals', label: 'Submitted proposals' },
  { key: 'dropped_proposals', label: 'Dropped proposals' },
  { key: 'running_projects', label: 'Running projects' },
]

const PROPOSALS_FOLDER_GROUP_ALIASES: Array<{ key: WorkhubPipelineReportGroupKey; names: string[] }> = [
  { key: 'open_proposals', names: ['open proposals', 'open proposal'] },
  { key: 'closed_proposals', names: ['closed proposals', 'closed proposal', 'closed projects', 'closed project'] },
  { key: 'submitted_proposals', names: ['submitted proposals', 'submitted proposal'] },
  { key: 'dropped_proposals', names: ['dropped proposals', 'dropped proposal'] },
  { key: 'running_projects', names: ['running projects', 'running project'] },
]

function normalizeLabel(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function normalizeCurrency(value: string | undefined): string {
  const normalized = (value || '').trim().toUpperCase().replace(/[^A-Z]/g, '')
  const next = normalized === 'USD' ? 'OMR' : normalized
  return (next || 'OMR').slice(0, 3)
}

function parseMonetaryNumberFromText(value: string): number {
  const matched = value.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/)
  if (!matched) return 0
  const parsed = Number(matched[0])
  if (!Number.isFinite(parsed) || parsed <= 0) return 0
  return Math.round(parsed * 100) / 100
}

function resolveProjectMonetaryAmount(project: Pick<WorkhubProject, 'valueAmount' | 'description'>): number {
  if (typeof project.valueAmount === 'number' && Number.isFinite(project.valueAmount) && project.valueAmount > 0) {
    return Math.round(project.valueAmount * 100) / 100
  }

  const lines = (project.description || '').split('\n')
  for (const line of lines) {
    const separatorIndex = line.indexOf(':')
    if (separatorIndex <= 0) continue
    const key = line.slice(0, separatorIndex).trim().toLowerCase()
    if (!/(estimated value|potential value|value|budget|amount|invoice value|payment value)/.test(key)) continue
    const parsed = parseMonetaryNumberFromText(line.slice(separatorIndex + 1))
    if (parsed > 0) return parsed
  }

  return 0
}

function resolveProjectMonetaryCurrency(project: Pick<WorkhubProject, 'valueCurrency' | 'description'>): string {
  if ((project.valueCurrency || '').trim()) return normalizeCurrency(project.valueCurrency)
  const description = (project.description || '').toUpperCase()
  const matched = description.match(/\b[A-Z]{3}\b/)
  return normalizeCurrency(matched ? matched[0] : 'OMR')
}

function addMonetaryTotal(target: Record<string, number>, currency: string, amount: number) {
  if (amount <= 0) return
  target[currency] = Math.round(((target[currency] || 0) + amount) * 100) / 100
}

function formatMonetaryAmount(amount: number, currency: string): string {
  if (amount <= 0) return '--'
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${currency} ${amount.toLocaleString('en-US')}`
  }
}

function formatTotalsByCurrency(totalsByCurrency: Record<string, number>): string {
  const entries = Object.entries(totalsByCurrency)
    .filter(([, amount]) => amount > 0)
    .sort(([leftCurrency], [rightCurrency]) => leftCurrency.localeCompare(rightCurrency))

  if (entries.length === 0) return '--'

  return entries
    .map(([currency, amount]) => formatMonetaryAmount(amount, currency))
    .join(' + ')
}

function resolveTypeLabel(project: WorkhubProject, intent: WorkhubProjectIntent): string {
  if (intent === 'lead' || project.projectType === 'lead') return 'Lead'
  if (project.projectType === 'tender') return 'Tender'
  if (intent === 'proposal') return 'Proposal'
  return 'Project'
}

function resolveGroupKey(statusLabel: string): WorkhubPipelineReportGroupKey {
  const normalized = normalizeLabel(statusLabel)

  if (/(lost|dropped|drop|withdrawn|cancel|cancelled|rejected|archived)/.test(normalized)) {
    return 'dropped_proposals'
  }
  if (/(closed|completed|complete|filled|reconciled)/.test(normalized)) {
    return 'closed_proposals'
  }
  if (/(submitted)/.test(normalized)) {
    return 'submitted_proposals'
  }
  if (/(running|awarded|active|execution|ongoing)/.test(normalized)) {
    return 'running_projects'
  }
  return 'open_proposals'
}

function resolveGroupKeyFromFolderName(folderName: string): WorkhubPipelineReportGroupKey | null {
  const normalized = normalizeLabel(folderName)
  const match = PROPOSALS_FOLDER_GROUP_ALIASES.find((item) => item.names.includes(normalized))
  return match?.key || null
}

function resolveGroupKeyFromProjectLineage(
  project: Pick<WorkhubProject, 'id' | 'name' | 'parentProjectId'>,
  projectById: Record<string, WorkhubProject>,
): WorkhubPipelineReportGroupKey | null | undefined {
  const visited = new Set<string>()
  let cursor = project.parentProjectId || null
  let sawAncestor = false

  while (cursor) {
    if (visited.has(cursor)) break
    visited.add(cursor)
    sawAncestor = true

    const parent = projectById[cursor]
    if (!parent) break

    const matchedGroupKey = resolveGroupKeyFromFolderName(parent.name || '')
    if (matchedGroupKey) return matchedGroupKey

    cursor = parent.parentProjectId || null
  }

  return sawAncestor ? null : undefined
}

function escapeTableCell(value: string): string {
  return value.replace(/\|/g, '\\|').replace(/\n/g, ' ')
}

export function useWorkhubPipelineReport({
  projects,
  allClientById,
  projectIntentById,
  selectedWorkspaceTemplateId,
  projectColorMeanings,
  isWorkspaceOverview,
}: UseWorkhubPipelineReportParams): WorkhubPipelineReportState {
  const supportedTemplate = selectedWorkspaceTemplateId === 'proposals_leads' || selectedWorkspaceTemplateId === 'finance'

  return useMemo(() => {
    if (!supportedTemplate || !isWorkspaceOverview) {
      return {
        available: false,
        groups: [],
        totalItems: 0,
        groupLabelByKey: {
          open_proposals: 'Open proposals',
          closed_proposals: 'Closed proposals',
          submitted_proposals: 'Submitted proposals',
          dropped_proposals: 'Dropped proposals',
          running_projects: 'Running projects',
        },
        buildMarkdownTable: () => '',
      }
    }

    const colorToStatusLabel = new Map(
      projectColorMeanings.map((item) => [item.color.trim().toLowerCase(), item.label.trim()]),
    )
    const projectById = Object.fromEntries(projects.map((item) => [item.id, item])) as Record<string, WorkhubProject>

    const eligibleRows = projects
      .filter((project) => {
        const intent = projectIntentById[project.id] || 'project'
        if (selectedWorkspaceTemplateId === 'proposals_leads') {
          return intent === 'proposal' || intent === 'lead' || project.projectType === 'tender' || project.projectType === 'lead'
        }
        return intent === 'finance_invoice_stream' || intent === 'finance_payment_cycle'
      })
      .map((project) => {
        const intent = projectIntentById[project.id] || 'project'
        const statusLabel = colorToStatusLabel.get((project.color || '').trim().toLowerCase()) || 'Open'
        const folderGroupKey = selectedWorkspaceTemplateId === 'proposals_leads'
          ? resolveGroupKeyFromProjectLineage(project, projectById)
          : undefined
        if (selectedWorkspaceTemplateId === 'proposals_leads' && folderGroupKey === null) return null
        const amount = resolveProjectMonetaryAmount(project)
        const currency = resolveProjectMonetaryCurrency(project)
        return {
          id: project.id,
          name: (project.name || '').trim() || 'Untitled',
          clientName: (project.clientId ? (allClientById[project.clientId]?.name || '') : '').trim() || '--',
          typeLabel: resolveTypeLabel(project, intent),
          statusLabel,
          submissionDate: (project.projectDeadline || '').trim() || '--',
          submissionTime: (project.submissionTime || '').trim() || '--',
          amount,
          currency,
          groupKey: folderGroupKey || resolveGroupKey(statusLabel),
        }
      })
      .filter((row): row is NonNullable<typeof row> => row !== null)

    const groups = GROUP_ORDER.map(({ key, label }) => {
      const items = eligibleRows
        .filter((row) => row.groupKey === key)
        .sort((left, right) => {
          const dateDelta = right.submissionDate.localeCompare(left.submissionDate)
          if (dateDelta !== 0) return dateDelta
          return left.name.localeCompare(right.name)
        })
        .map((row) => ({
          id: row.id,
          name: row.name,
          clientName: row.clientName,
          typeLabel: row.typeLabel,
          statusLabel: row.statusLabel,
          submissionDate: row.submissionDate,
          submissionTime: row.submissionTime,
          amount: row.amount,
          currency: row.currency,
        }))

      const totalAmountByCurrency: Record<string, number> = {}
      items.forEach((item) => addMonetaryTotal(totalAmountByCurrency, item.currency, item.amount))

      return {
        key,
        label,
        items,
        totalAmountByCurrency,
        totalAmountLabel: formatTotalsByCurrency(totalAmountByCurrency),
      }
    })

    const totalItems = groups.reduce((sum, group) => sum + group.items.length, 0)
    const groupLabelByKey = Object.fromEntries(GROUP_ORDER.map((entry) => [entry.key, entry.label])) as Record<WorkhubPipelineReportGroupKey, string>

    const buildMarkdownTable = (selectedGroups: Set<WorkhubPipelineReportGroupKey>) => {
      const lines: string[] = []
      lines.push('| Group | Name | Client | Type | Status | Submission date | Submission time | Amount |')
      lines.push('| --- | --- | --- | --- | --- | --- | --- | --- |')

      GROUP_ORDER.forEach(({ key, label }) => {
        if (!selectedGroups.has(key)) return
        const group = groups.find((item) => item.key === key)
        if (!group) return

        if (group.items.length === 0) {
          lines.push(`| ${escapeTableCell(label)} | _No items_ | - | - | - | - | - | - |`)
          return
        }

        group.items.forEach((item, index) => {
          lines.push(`| ${index === 0 ? escapeTableCell(label) : ''} | ${escapeTableCell(item.name)} | ${escapeTableCell(item.clientName)} | ${escapeTableCell(item.typeLabel)} | ${escapeTableCell(item.statusLabel)} | ${escapeTableCell(item.submissionDate)} | ${escapeTableCell(item.submissionTime)} | ${escapeTableCell(formatMonetaryAmount(item.amount, item.currency))} |`)
        })

        lines.push(`| ${escapeTableCell(label)} total | **${group.items.length}** |  |  |  |  |  | **${escapeTableCell(group.totalAmountLabel)}** |`)
      })

      return lines.join('\n')
    }

    return {
      available: true,
      groups,
      totalItems,
      groupLabelByKey,
      buildMarkdownTable,
    }
  }, [allClientById, isWorkspaceOverview, projectColorMeanings, projectIntentById, projects, selectedWorkspaceTemplateId, supportedTemplate])
}
