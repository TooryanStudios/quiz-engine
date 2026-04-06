import type { WorkhubProject } from '../../lib/workhubRepo'

const INVISIBLE_TASK_TITLE_CHARS = /[\u0000-\u001F\u007F-\u009F\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180E\u200B-\u200F\u202A-\u202E\u2060-\u2069\u2800\u3164\uFEFF\uFFA0]/g

export function formatTime(value: unknown): string {
  if (!value) return '—'
  if (typeof value === 'object' && value !== null && 'toDate' in value && typeof (value as { toDate?: unknown }).toDate === 'function') {
    return ((value as { toDate: () => Date }).toDate()).toLocaleString()
  }
  if (typeof value === 'object' && value !== null && 'seconds' in value) {
    const seconds = Number((value as { seconds?: unknown }).seconds || 0)
    return new Date(seconds * 1000).toLocaleString()
  }
  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    if (Number.isFinite(parsed)) return new Date(parsed).toLocaleString()
  }
  return '—'
}

export function formatDueDateShort(value: string): string {
  if (!value) return 'No due date'
  const parsed = Date.parse(value)
  if (!Number.isFinite(parsed)) return value
  return new Date(parsed).toLocaleDateString(undefined, { day: 'numeric', month: 'numeric', year: '2-digit' })
}

export function resolveProjectDeadlineMs(project: Pick<WorkhubProject, 'projectDeadline' | 'submissionTime' | 'projectType'>): number {
  const dateValue = (project.projectDeadline || '').trim()
  if (!dateValue) return Number.NaN
  if (project.projectType === 'tender') {
    const timeValue = (project.submissionTime || '').trim() || '23:59'
    const parsed = Date.parse(`${dateValue}T${timeValue}`)
    return Number.isFinite(parsed) ? parsed : Number.NaN
  }
  const parsed = Date.parse(`${dateValue}T23:59`)
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

export function formatProjectDeadlineDate(value: string): string {
  const normalized = (value || '').trim()
  const parts = normalized.split('-')
  if (parts.length === 3 && parts[0].length === 4) {
    const [year, month, day] = parts
    return `${day}-${month}-${year}`
  }
  return normalized
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  return name.slice(0, 2).toUpperCase()
}

export function isImageAttachmentUrl(value: string): boolean {
  const url = (value || '').trim().toLowerCase()
  if (!url) return false
  if (url.startsWith('data:image/')) return true
  try {
    const parsed = new URL(url)
    if (/\.(png|jpe?g|gif|webp|bmp|svg|avif)$/i.test(parsed.pathname)) return true
    const nameParam = parsed.searchParams.get('name') || parsed.searchParams.get('filename') || ''
    return /\.(png|jpe?g|gif|webp|bmp|svg|avif)$/i.test(nameParam)
  } catch {
    return /\.(png|jpe?g|gif|webp|bmp|svg|avif)(\?.*)?$/i.test(url)
  }
}

export function normalizeTaskTitle(rawTitle: string): string {
  return rawTitle
    .replace(INVISIBLE_TASK_TITLE_CHARS, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function isEffectivelyEmptyTaskTitle(rawTitle: string): boolean {
  const normalized = normalizeTaskTitle(rawTitle)
  if (!normalized) return true
  const semantic = normalized.replace(/[\p{P}\p{S}\p{M}\p{Z}\p{C}_]+/gu, '')
  return semantic.length === 0
}

export function splitTaskTitles(rawTitle: string): string[] {
  return rawTitle
    .split(/[\r\n\u2028\u2029]+/)
    .map((line) => normalizeTaskTitle(line))
    .filter(Boolean)
}
