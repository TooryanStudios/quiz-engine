import type { WorkhubNotification } from '../../../src/lib/workhubRepo'
import type { Item } from './data'

export function notificationItem(notification: WorkhubNotification, items: Item[]): Item | undefined {
 const type=notification.entityType==='moodboard'?'board':notification.entityType
 const workspaceItems=items.filter(item=>item.workspace===notification.workspaceId)
 const direct=workspaceItems.find(item=>item.entityId===notification.entityId&&(type==='comment'||item.type===type))
 if(direct)return direct
 if(!notification.targetPath)return undefined
 try {
  const url=new URL(notification.targetPath,'https://workhub.local')
  const key=url.searchParams.get('item')
  if(key)return workspaceItems.find(item=>item.id===key)
  const match=url.pathname.match(/\/(t|d|m|p)\/([^/]+)\/?$/)
  if(!match)return undefined
  const pathType={t:'task',d:'document',m:'board',p:'project'}[match[1]]
  return workspaceItems.find(item=>item.type===pathType&&item.entityId===decodeURIComponent(match[2]))
 }catch{return undefined}
}
