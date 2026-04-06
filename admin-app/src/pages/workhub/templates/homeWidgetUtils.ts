import type { WorkhubHomeWidgetMetrics } from './homeWidgetTypes'

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

export function asCount(value: number): string {
  if (!Number.isFinite(value)) return '0'
  return String(Math.max(0, Math.round(value)))
}

export function asPercent(value: number): string {
  return `${clampPercent(value)}%`
}

export function countByStatusKeywords(metrics: WorkhubHomeWidgetMetrics, keywords: string[]): number {
  const normalizedKeywords = keywords.map((keyword) => keyword.toLowerCase())
  return Object.entries(metrics.taskStatusCounts).reduce((total, [statusId, count]) => {
    if (!count) return total
    const label = `${statusId} ${metrics.taskStatusLabels[statusId] || ''}`.toLowerCase()
    return normalizedKeywords.some((keyword) => label.includes(keyword)) ? total + count : total
  }, 0)
}
