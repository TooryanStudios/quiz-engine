import type {WorkhubNotification} from '../../../src/lib/workhubRepo'
export const inboxGroupSize=6
export const isChatNotification=(notification:WorkhubNotification)=>!!notification.threadId||notification.workspaceId==='__communication_global__'
export const inboxGroupKey=(notification:WorkhubNotification)=>isChatNotification(notification)?'chat:'+(notification.threadId||notification.actorUid||'everyone'):'workspace:'+notification.workspaceId
export function inboxGroups(notifications:WorkhubNotification[]){
 const groups=new Map<string,WorkhubNotification[]>()
 for(const notification of notifications){const key=inboxGroupKey(notification);groups.set(key,[...(groups.get(key)||[]),notification])}
 return [...groups].map(([id,items])=>({id,items}))
}
