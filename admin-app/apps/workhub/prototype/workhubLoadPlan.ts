import type {WorkhubWorkspace} from '../../../src/lib/workhubRepo'
import type {WorkspaceData} from './data'
export type LoadFilter=[string,'=='|'!='|'array-contains',string]
export type LoadFeed={id:string;key:keyof WorkspaceData;collection:string;filters:LoadFilter[];documentId?:string;assignedOnly?:boolean;fallback?:LoadFilter[]}
export type WorkhubLoadRequest={page:string;workspaceId?:string;selectedId?:string;all?:boolean}
const collections={projects:'workhub_projects',tasks:'workhub_tasks',documents:'workhub_documents',boards:'workhub_mood_boards'}
export const plansWorkspace=(w:WorkhubWorkspace)=>w.templateId==='plans'||/^(plans?|planning|الخطط|خطط|التخطيط)$/i.test(w.name.trim())
/** Describe only this screen's data. Query IDs are stable across page changes. */
export function workhubLoadPlan(request:WorkhubLoadRequest,workspaces:WorkhubWorkspace[],uid:string,privileged:boolean,linkedWorkspaceIds:string[]=[]):LoadFeed[]{
 if(!uid||!workspaces.length)return []
 const feeds:LoadFeed[]=[]
 const add=(key:keyof WorkspaceData,id:string,filters:LoadFilter[],extra:Partial<LoadFeed>={})=>feeds.push({key,id,collection:collections[key],filters,...extra})
 const selected=workspaces.find(w=>w.id===request.workspaceId)
 const metadata=request.all||!!request.selectedId&&!selected||['home','myWork','myNotes','inbox','documents'].includes(request.page)||!!selected&&plansWorkspace(selected)
 if(metadata){
  const scopes:LoadFilter[][]=privileged?[[]]:[[['visibility','==','workspace']],[['createdBy','==',uid]],[['memberUids','array-contains',uid]]]
  scopes.forEach((filters,i)=>add('projects','metadata:'+i,filters))
 }
 if(['home','myWork'].includes(request.page)&&!request.all){
  const scopes:LoadFilter[][]=privileged?[[]]:[[['visibility','==','workspace']],[['createdBy','==',uid]]]
  scopes.forEach((scope,i)=>{
   add('tasks',`assigned:${i}:single`,[...scope,['assigneeUid','==',uid]],{assignedOnly:true,fallback:scope})
   add('tasks',`assigned:${i}:multiple`,[...scope,['assigneeUids','array-contains',uid]],{assignedOnly:true,fallback:scope})
  })
  // Firestore cannot combine two array-contains clauses. Read only the explicitly shared
  // tasks for this branch and intersect assignees locally, retaining the existing ACL.
  if(!privileged)add('tasks','assigned:shared',[['memberUids','array-contains',uid]],{assignedOnly:true})
 }
 const fullWorkspaces=request.all||request.page==='documents'?workspaces:workspaces.filter(w=>w.id===selected?.id||linkedWorkspaceIds.includes(w.id))
 for(const w of fullWorkspaces){
  const full=privileged||w.memberAccessLevels?.[uid]==='full'
  for(const key of Object.keys(collections) as (keyof WorkspaceData)[]){
   if(key==='projects'&&metadata)continue
   const base:LoadFilter[]=[['workspaceId','==',w.id]]
   const scopes:LoadFilter[][]=key==='boards'?(privileged?[base]:[[...base,['visibility','!=','restricted']],[...base,['memberUids','array-contains',uid]],[...base,['createdBy','==',uid]]]):full?[base]:[[...base,['visibility','==','workspace']],[...base,['visibility','==','restricted'],['memberUids','array-contains',uid]],[...base,['createdBy','==',uid]]]
   scopes.forEach((filters,i)=>add(key,`${w.id}:${key}:${i}`,filters))
  }
 }
 if(request.selectedId&&!selected){
  const [type,...parts]=request.selectedId.split(':');const id=parts.join(':')
  const key=({task:'tasks',project:'projects',document:'documents',board:'boards'} as Record<string,keyof WorkspaceData>)[type]
  if(key&&id)add(key,'selected:'+request.selectedId,[],{documentId:id})
 }
 return feeds
}
