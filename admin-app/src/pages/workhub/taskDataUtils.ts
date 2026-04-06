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
