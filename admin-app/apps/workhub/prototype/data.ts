import {workTimestamp} from './myWorkTasks'
import type { WorkhubWorkspace, WorkhubProject, WorkhubTask, WorkhubDocument, WorkhubMoodBoard } from '../../../src/lib/workhubRepo'
import { canViewProjectWithAncestors } from '../../../src/pages/workhub/projectUtils'
import { buildWorkspaceTaskStatuses } from '../../../src/pages/workhub/statusTemplates'

export type Item = {
 lastActivityAt?:number; id: string; entityId: string; workspace: string; parent: string; title: string
 type: 'project' | 'task' | 'document' | 'board'; status: string; statusColor?: string
 projectData?:WorkhubProject;mainPanelView?:WorkhubProject['mainPanelView'];taskItemDisplayMode?:WorkhubProject['taskItemDisplayMode'];approvalByUid?:WorkhubTask['approvalByUid'];startDate?:string;dueTime?:string;milestoneId?:string|null;valueAmount?:number;valueCurrency?:string;boardImages?:WorkhubMoodBoard["images"];
 owner: string; due: string; description: string; body?: string; links?:string[]; attachments: string[]
 statusId?: string; statuses?: {id:string;label:string;color:string;icon?:string}[]; visibility?: 'workspace'|'restricted'; memberUids?:string[]; intent?:string; attachmentTitles?:Record<string,string>; imageUrls?:string[]; createdBy?:string; priority?:'low'|'medium'|'high'|'urgent'; storageMethod?:'firebase'|'drive';
 checklist?: { id: string; text: string; completed: boolean; details?:string; attachmentTitles?:Record<string,string>; attachments?:string[]; imageUrls?:string[]; links?:string[]; valueAmount?:number }[]; assigned: string[]
}
export type WorkspaceData = { projects: WorkhubProject[]; tasks: WorkhubTask[]; documents: WorkhubDocument[]; boards: WorkhubMoodBoard[] }
export const emptyData = (): WorkspaceData => ({projects:[],tasks:[],documents:[],boards:[]})
export function canReadEntity(entity: {visibility?:string; imageUrls?:string[]; createdBy?:string; memberUids?:string[]}, uid:string, full:boolean) {
 return full || entity.visibility !== 'restricted' || entity.createdBy === uid || !!entity.memberUids?.includes(uid)
}
export function adaptWorkspaceItems(workspace:WorkhubWorkspace, data:WorkspaceData, uid:string, privileged:boolean):Item[] {
 const full = privileged || workspace.memberAccessLevels?.[uid] === 'full'
 const projectMap = new Map(data.projects.map(p=>[p.id,p]))
 const visibleProjects = data.projects.filter(p=>canViewProjectWithAncestors(p,uid,full,projectMap))
 const visibleIds = new Set(visibleProjects.map(p=>p.id))
 const parentVisible = (id?:string|null) => !id || visibleIds.has(id)
 const base = (entity:{id:string;createdBy:string;attachments?:string[]},type:Item['type']) => ({lastActivityAt:Math.max(workTimestamp((entity as {createdAt?:unknown}).createdAt),workTimestamp((entity as {updatedAt?:unknown}).updatedAt)),id:`${type}:${entity.id}`,entityId:entity.id,workspace:workspace.id,type,createdBy:entity.createdBy,visibility:(entity as {visibility?:'workspace'|'restricted'}).visibility||'workspace',memberUids:(entity as {memberUids?:string[]}).memberUids||[],links:(entity as {links?:string[]}).links||[],owner:entity.createdBy,due:'',status:'',description:'',imageUrls:(entity as {imageUrls?:string[]}).imageUrls||[],attachments:Array.from(new Set([...(entity.attachments||[]),...((entity as {imageUrls?:string[]}).imageUrls||[])])),attachmentTitles:(entity as {attachmentTitles?:Record<string,string>}).attachmentTitles||{},assigned:[]})
 const statusesFor = (parent:string) => {
  let project=projectMap.get(parent); const seen=new Set<string>()
  while(project && !seen.has(project.id)) {
   seen.add(project.id)
   if(project.taskStatuses?.length) return project.taskStatuses
   project=project.parentProjectId?projectMap.get(project.parentProjectId):undefined
  }
  return workspace.taskStatuses?.length?workspace.taskStatuses:buildWorkspaceTaskStatuses('workspace_default',workspace.type)
 }
 return [
  ...visibleProjects.map(p=>({...base(p,'project'),parent:p.parentProjectId||'',title:p.name,projectData:p,valueAmount:p.valueAmount,valueCurrency:p.valueCurrency,statusColor:p.color,statuses:statusesFor(p.id),visibility:p.visibility,memberUids:p.memberUids,intent:p.intent,storageMethod:p.storageMethod,mainPanelView:p.mainPanelView,taskItemDisplayMode:p.taskItemDisplayMode,startDate:p.projectStartDate,description:p.description,body:p.notes,due:p.projectDeadline||''})),
  ...data.tasks.filter(p=>parentVisible(p.projectId)&&canReadEntity(p,uid,full)).map(p=>{const statuses=statusesFor(p.projectId);const status=statuses.find(s=>s.id===p.status);return {...base(p,'task'),parent:p.projectId||'',title:p.title,description:p.description,status:status?.label||p.status,statusId:p.status,statuses,startDate:p.startDate,dueTime:p.dueTime,milestoneId:p.milestoneId,approvalByUid:p.approvalByUid,valueAmount:p.valueAmount,valueCurrency:p.valueCurrency,priority:p.priority,visibility:p.visibility,memberUids:p.memberUids,statusColor:status?.color,owner:p.assigneeUid||p.createdBy,due:p.dueDate,checklist:p.checklist,assigned:Array.from(new Set([p.assigneeUid,...(p.assigneeUids||[])].filter(Boolean)))}}),
  ...data.documents.filter(p=>parentVisible(p.projectId)&&canReadEntity(p,uid,full)).map(p=>({...base(p,'document'),parent:p.projectId||'',title:p.title,body:p.body||p.tabs?.[0]?.body||'',checklist:p.checklist})),
  ...data.boards.filter(p=>{
   if(!canReadEntity(p,uid,full))return false
   if(p.entityType==='project')return visibleIds.has(p.entityId)
   if(p.entityType==='task'){const task=data.tasks.find(t=>t.id===p.entityId);return !!task&&parentVisible(task.projectId)&&canReadEntity(task,uid,full)}
   if(p.entityType==='document'){const document=data.documents.find(d=>d.id===p.entityId);return !!document&&parentVisible(document.projectId)&&canReadEntity(document,uid,full)}
   return p.entityType==='workspace'&&p.entityId===workspace.id
  }).map(p=>({...base(p,'board'),parent:p.entityType==='project'?p.entityId:p.entityType==='task'?data.tasks.find(t=>t.id===p.entityId)?.projectId||'':p.entityType==='document'?data.documents.find(d=>d.id===p.entityId)?.projectId||'':'',title:p.title,boardImages:p.images||[],attachments:Array.from(new Set([...(p.images||[]).map(i=>i.url),...(p.flowNodes||[]).flatMap(n=>typeof n.data?.imageUrl==='string'?[n.data.imageUrl]:[])])),attachmentTitles:Object.fromEntries([...(p.images||[]).map(i=>[i.url,i.label||'']),...(p.flowNodes||[]).flatMap(n=>typeof n.data?.imageUrl==='string'?[[n.data.imageUrl,String(n.data.label||'')]]:[])])})),
 ]
}
export function originalPath(workspaceId?:string|null,item?:Item|null) {
 if(!workspaceId)return '/workhub'
 const base=`/workhub/w/${encodeURIComponent(workspaceId)}`
 if(!item)return base
 if(item.type==='project')return `${base}/p/${encodeURIComponent(item.entityId)}`
 const segment={task:'t',document:'d',board:'m'}[item.type]
 return `${base}/${segment}/${encodeURIComponent(item.entityId)}${item.parent?`?p=${encodeURIComponent(item.parent)}`:''}`
}
export function plainText(value:string) {
 if(!value)return ''
 const doc=new DOMParser().parseFromString(value,'text/html')
 doc.querySelectorAll('script,style').forEach(node=>node.remove())
 doc.querySelectorAll('p,div,br,li,h1,h2,h3,tr').forEach(node=>node.append(doc.createTextNode('\n')))
 return doc.body.textContent?.trim()||''
}
