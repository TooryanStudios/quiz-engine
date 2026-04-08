import type { WorkhubTask, WorkhubTaskChecklistItem } from '../../lib/workhubRepo'

export function buildChecklist(task: WorkhubTask): WorkhubTaskChecklistItem[] {
  if (!Array.isArray(task.checklist)) return []
  return task.checklist.map((item) => ({
    ...item,
    details: item.details || '',
    attachments: Array.isArray(item.attachments) ? item.attachments : (Array.isArray(item.imageUrls) ? item.imageUrls : []),
    imageUrls: Array.isArray(item.imageUrls) ? item.imageUrls : [],
    links: Array.isArray(item.links) ? item.links : [],
  }))
}

export function getTaskAttachments(task: WorkhubTask): string[] {
  if (Array.isArray(task.attachments)) return task.attachments
  return Array.isArray(task.imageUrls) ? task.imageUrls : []
}

export function getTaskLinks(task: WorkhubTask): string[] {
  return Array.isArray(task.links) ? task.links : []
}

export function deriveAttachmentTitle(url: string): string {
  const trimmed = (url || '').trim()
  if (!trimmed) return 'Attachment'

  try {
    const parsed = new URL(trimmed)
    const pathToken = parsed.pathname.split('/').filter(Boolean).pop() || ''
    const decoded = decodeURIComponent(pathToken).replace(/[_-]+/g, ' ').trim()
    if (decoded) return decoded
  } catch {
    // Fall through to plain-string parsing when URL constructor fails.
  }

  const plainToken = trimmed.split('/').filter(Boolean).pop() || trimmed
  const plainDecoded = decodeURIComponent(plainToken).replace(/[_-]+/g, ' ').trim()
  return plainDecoded || 'Attachment'
}

export function getTaskAttachmentTitle(task: WorkhubTask, url: string): string {
  const explicitTitle = task.attachmentTitles?.[url]
  if (explicitTitle && explicitTitle.trim()) {
    return explicitTitle.trim()
  }
  return deriveAttachmentTitle(url)
}
