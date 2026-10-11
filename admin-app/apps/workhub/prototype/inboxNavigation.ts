import type { WorkhubNotification } from '../../../src/lib/workhubRepo'
import type { Item } from './data'

/** A notification can navigate to an item before that workspace has been fetched. */
export function notificationRoute(notification:WorkhubNotification):{workspace:string;project:string;item:string}|undefined {
 const workspace=notification.workspaceId
 if(!workspace||workspace==='__communication_global__'||notification.threadId)return undefined
 const validKey=(key:string)=>/^(task|project|document|board):[^/]+$/.test(key)
 if(notification.targetPath){
  try {
   const url=new URL(notification.targetPath,'https://workhub.local')
   if(url.pathname==='/workhub/next'&&(!url.searchParams.get('workspace')||url.searchParams.get('workspace')===workspace)){
    const item=url.searchParams.get('item')||''
    if(validKey(item))return {workspace,project:url.searchParams.get('project')||notification.projectId||'',item}
   }
   const match=url.pathname.match(/^\/workhub\/w\/([^/]+)\/(t|d|m|p)\/([^/]+)\/?$/)
   if(match&&decodeURIComponent(match[1])===workspace){
    const type=({t:'task',d:'document',m:'board',p:'project'} as Record<string,string>)[match[2]]
    const id=decodeURIComponent(match[3]);const item=type+':'+id
    if(validKey(item))return {workspace,project:type==='project'?id:url.searchParams.get('p')||notification.projectId||'',item}
   }
  }catch{/* Malformed legacy links can still use the notification's entity fields. */}
 }
 const type=notification.entityType==='moodboard'?'board':notification.entityType
 const item=type+':'+notification.entityId
 if(validKey(item))return {workspace,project:type==='project'?notification.entityId:notification.projectId||'',item}
 return undefined
}

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
