import {workhubLoadPlan,plansWorkspace,type WorkhubLoadRequest} from './workhubLoadPlan'
import {resolveWorkhubWorkspaceTemplateIdForWorkspace} from '../../../src/pages/workhub/workspaceTemplates'
import { useEffect, useMemo, useRef, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { collection, doc, onSnapshot, query, where, orderBy, limit, getDocs } from 'firebase/firestore'
import { auth, authReady, db } from '../../../src/lib/firebase'
import type { WorkhubMember, WorkhubWorkspace, WorkhubNotification } from '../../../src/lib/workhubRepo'
import { canAccessWorkspace } from '../../../src/pages/workhub/projectUtils'
import { GLOBAL_CHAT_WORKSPACE_ID, THREAD_EVERYONE } from '../../../src/features/communication/hooks/useGlobalTeamChat'
import { adaptWorkspaceItems, canReadEntity, type Item, type WorkspaceData } from './data'

export function useLiveWorkhub(request:WorkhubLoadRequest) {
 const [user,setUser]=useState<User|null|undefined>(undefined)
 const [memberState,setMemberState]=useState<{uid:string;value:WorkhubMember|null}|null>(null)
 const [workspaceState,setWorkspaceState]=useState<{scope:string;items:WorkhubWorkspace[]}|null>(null)
 const [feeds,setFeeds]=useState<{scope:string;buckets:Record<string,{rows:any[];ready:boolean}>}>({scope:'',buckets:{}})
 const subscriptions=useRef(new Map<string,()=>void>())
 const [errors,setErrors]=useState<Record<string,string>>({})
 const [notificationState,setNotificationState]=useState<{uid:string;full?:boolean;items:WorkhubNotification[]}>({uid:'',items:[]})
 const [peopleState,setPeopleState]=useState<{scope:string;items:WorkhubMember[]}>({scope:'',items:[]})
 const member = memberState?.uid===user?.uid ? memberState?.value : null
 const approved = member?.status==='approved'
 const scope = approved && user ? `${user.uid}:${member.role}` : ''
 const privileged = !!user && ((!!import.meta.env.VITE_MASTER_EMAIL && user.email?.toLowerCase()===String(import.meta.env.VITE_MASTER_EMAIL).trim().toLowerCase()) || ['manager','admin','administrator'].includes(member?.role?.trim().toLowerCase()||''))
 const workspaces=useMemo(()=>workspaceState?.scope===scope&&user?workspaceState.items.filter(w=>privileged||resolveWorkhubWorkspaceTemplateIdForWorkspace(w)!=='hr').filter(w=>canAccessWorkspace(w,user.uid,user.email||'',privileged)):[],[workspaceState,scope,user,privileged])
 const dataScope=`${scope}:${privileged}:${JSON.stringify(workspaces.map(w=>[w.id,w.memberAccessLevels?.[user?.uid||''],w.accessMemberUids,w.invitedEmails]))}`
 const report=(key:string,error?:{code?:string})=>setErrors(previous=>{const next={...previous};if(error)next[key]=error.code||'unavailable';else delete next[key];return next})
 useEffect(()=>{
  let unsubscribe:undefined|(()=>void);let active=true
  authReady.then(()=>{if(!active)return;unsubscribe=onAuthStateChanged(auth,next=>{setUser(next);setErrors({});if(!next){setMemberState(null);setWorkspaceState(null);setFeeds({scope:'',buckets:{}});setNotificationState({uid:'',items:[]});setPeopleState({scope:'',items:[]})}})})
  return()=>{active=false;unsubscribe?.()}
 },[])
 useEffect(()=>{
  if(!user){setMemberState(null);return}
  return onSnapshot(doc(db,'workhub_members',user.uid),{includeMetadataChanges:true},snap=>{if(snap.metadata.fromCache&&!snap.exists()&&navigator.onLine)return;setMemberState({uid:user.uid,value:snap.exists()?{...snap.data(),uid:user.uid} as WorkhubMember:null});report('member')},error=>{report('member',error);setMemberState({uid:user.uid,value:null})})
 },[user?.uid])
 useEffect(()=>{
  if(!scope)return
  return onSnapshot(collection(db,'workhub_workspaces'),{includeMetadataChanges:true},snap=>{if(snap.metadata.fromCache&&snap.empty&&navigator.onLine)return;setWorkspaceState({scope,items:snap.docs.map(d=>({...d.data(),id:d.id} as WorkhubWorkspace))});report('workspaces')},error=>{report('workspaces',error);setWorkspaceState({scope,items:[]})})
 },[scope])
 const peopleNeeded=!!scope&&(request.all||!!request.selectedId||['myWork','workspaces','myProfile','documents','company','users'].includes(request.page))
 useEffect(()=>{
  if(!peopleNeeded)return
  return onSnapshot(collection(db,'workhub_members'),snap=>{setPeopleState({scope,items:snap.docs.map(d=>({...d.data(),uid:d.id} as WorkhubMember))});report('people')},error=>{setPeopleState({scope,items:[]});report('people',error)})
 },[scope,peopleNeeded])
 const linkedWorkspaceIds=useMemo(()=>{
  if(!workspaces.some(w=>w.id===request.workspaceId&&plansWorkspace(w)))return []
  return [...new Set(Object.entries(feeds.scope===dataScope?feeds.buckets:{}).filter(([id])=>id.startsWith('metadata:')).flatMap(([,bucket])=>bucket.rows.filter(p=>p.planSettings?.sourceWorkspaceId===request.workspaceId).map(p=>String(p.workspaceId))))]
 },[feeds,dataScope,request.workspaceId,workspaces])
 const directoryReady=!!scope&&workspaceState?.scope===scope
 const plan=useMemo(()=>user&&directoryReady?workhubLoadPlan(request,workspaces,user.uid,privileged,linkedWorkspaceIds):[],[request.page,request.workspaceId,request.selectedId,request.all,workspaces,user?.uid,directoryReady,privileged,linkedWorkspaceIds])
 const planKey=JSON.stringify(plan)
 // Reconcile subscriptions: keep unchanged queries and cached snapshots when navigating.
 // Clear the entire cache whenever the account or permissions change.
 useEffect(()=>{
  setFeeds({scope:dataScope,buckets:{}})
  return()=>{subscriptions.current.forEach(stop=>stop());subscriptions.current.clear()}
 },[dataScope])
 useEffect(()=>{
  const wanted=new Set(plan.map(feed=>feed.id))
  for(const [id,stop] of subscriptions.current)if(!wanted.has(id)){stop();subscriptions.current.delete(id)}
  setErrors(previous=>Object.fromEntries(Object.entries(previous).filter(([key])=>!key.startsWith('feed:')||wanted.has(key.slice(5)))))
  for(const feed of plan){
   if(subscriptions.current.has(feed.id))continue
   let active=true,stop=()=>{}
   const emit=(rows:any[],ready:boolean)=>{
    if(!active)return
    if(feed.assignedOnly)rows=rows.filter(row=>row.assigneeUid===user?.uid||row.assigneeUids?.includes(user?.uid))
    setFeeds(previous=>previous.scope!==dataScope||!ready&&previous.buckets[feed.id]?.ready?previous:{...previous,buckets:{...previous.buckets,[feed.id]:{rows,ready}}})
   }
   const failed=(error:{code?:string})=>{emit([],true);if(active)report('feed:'+feed.id,error)}
   const listen=(filters=feed.filters,fallback=false)=>{
    const target=feed.documentId?doc(db,feed.collection,feed.documentId):query(collection(db,feed.collection),...filters.map(([field,op,value])=>where(field,op,value)))
    // Both query and document snapshots use the same reconciliation path.
    return onSnapshot(target as any,{includeMetadataChanges:true},(snap:any)=>{
     const docs=snap.docs||(snap.exists()?[snap]:[])
     const rows=docs.map((d:any)=>({...d.data(),id:d.id}))
     emit(rows,!snap.metadata.fromCache||!!rows.length||!navigator.onLine)
     if(active)report('feed:'+feed.id)
    },(error:{code?:string})=>{
     // Older deployments may lack a composite index. Preserve functionality using
     // the same authorized visibility scope, never a permissions bypass.
     if(active&&!fallback&&feed.fallback&&error.code==='failed-precondition')stop=listen(feed.fallback,true)
     else failed(error)
    })
   }
   stop=listen();subscriptions.current.set(feed.id,()=>{active=false;stop()})
  }
 },[dataScope,planKey])
 const fullInbox=request.page==='inbox'
 useEffect(()=>{
  if(!approved||!user)return
  setErrors(previous=>Object.fromEntries(Object.entries(previous).filter(([key])=>!key.startsWith('notifications:'))))
  const base=query(collection(db,'workhub_notifications'),where('recipientUid','==',user.uid))
  // The badge must retain every unread item; only the Inbox needs the full read history.
  const queries=fullInbox?[base]:[query(base,where('read','==',false)),query(base,orderBy('createdAt','desc'),limit(30))]
  let active=true;const buckets:Record<number,WorkhubNotification[]>={}
  const emit=()=>{if(active&&Object.keys(buckets).length===queries.length)setNotificationState({uid:user.uid,full:fullInbox,items:[...new Map(Object.values(buckets).flat().map(n=>[n.id,n])).values()]})}
  const stops=queries.map((target,index)=>onSnapshot(target,snap=>{buckets[index]=snap.docs.map(d=>({...d.data(),id:d.id} as WorkhubNotification));report('notifications:'+index);emit()},error=>{buckets[index]=[];report('notifications:'+index,error);emit()}))
  return()=>{active=false;stops.forEach(stop=>stop())}
 },[approved,user?.uid,fullInbox])
 const items:Item[]=useMemo(()=>{
  if(feeds.scope!==dataScope||!user)return []
  const merged:Record<string,Record<string,any>>={projects:{},tasks:{},documents:{},boards:{}}
  // Scoped workspace feeds override the personal snapshot for the same entity.
  for(const feed of plan)for(const row of feeds.buckets[feed.id]?.rows||[])merged[feed.key][row.id]=row
  return workspaces.flatMap(w=>adaptWorkspaceItems(w,Object.fromEntries(Object.entries(merged).map(([key,rows])=>[key,Object.values(rows).filter(row=>row.workspaceId===w.id).sort((a,b)=>(a.sortOrder||0)-(b.sortOrder||0))])) as WorkspaceData,user.uid,privileged))
 },[feeds,dataScope,planKey,workspaces,user?.uid,privileged])
 const directoryLoading=user===undefined || (!!user && memberState?.uid!==user.uid) || (approved && workspaceState?.scope!==scope)
 const loading=directoryLoading||plan.some(feed=>feeds.scope!==dataScope||!feeds.buckets[feed.id]?.ready)
 const loadedWorkspaceIds=workspaces.filter(w=>plan.some(feed=>feed.id===`${w.id}:tasks:0`)&&plan.filter(feed=>feed.id.startsWith(w.id+':')).every(feed=>feeds.buckets[feed.id]?.ready)).map(w=>w.id)
 // Cross-workspace activity detection needs a complete permission-filtered entity list,
 // but only when the employee explicitly asks to detect their extra work.
 const loadEntityKeys=async()=>{
  if(!user||!approved)return []
  const merged:Record<string,Record<string,any>>={projects:{},tasks:{},documents:{},boards:{}}
  await Promise.all(workhubLoadPlan({page:request.page,all:true},workspaces,user.uid,privileged).map(async feed=>{
   const snap=await getDocs(query(collection(db,feed.collection),...feed.filters.map(([field,op,value])=>where(field,op,value))))
   for(const d of snap.docs)merged[feed.key][d.id]={...d.data(),id:d.id}
  }))
  if(auth.currentUser?.uid!==user.uid)return []
  return workspaces.flatMap(w=>adaptWorkspaceItems(w,Object.fromEntries(Object.entries(merged).map(([key,rows])=>[key,Object.values(rows).filter(row=>row.workspaceId===w.id)])) as WorkspaceData,user.uid,privileged)).map(i=>(i.type==='board'?'moodboard':i.type)+':'+i.entityId)
 }
 return {user,member,workspaces,items,loading,directoryLoading,loadedWorkspaceIds,loadEntityKeys,errors,approved,privileged,notificationsReady:notificationState.uid===user?.uid&&notificationState.full===fullInbox,people:peopleState.scope===scope?peopleState.items:[],notifications:approved&&notificationState.uid===user?.uid?notificationState.items.filter(n=>n.workspaceId==='__communication_global__'||n.workspaceId==='__company__'||workspaces.some(w=>w.id===n.workspaceId)):[]}

}

export type ConversationEntry={id:string;author:string;body:string;time:number;reactions:Record<string,string>}
function timestamp(value:unknown){return value && typeof value==='object' && 'seconds' in value?Number((value as {seconds:number}).seconds)*1000:0}
export function useLiveConversation(workspace:WorkhubWorkspace|undefined,item:Item|undefined,uid:string,privileged:boolean,enabled:boolean,visibleItems:Item[],limit=100){
 const allowedEntityKeys=useMemo(()=>visibleItems.filter(i=>i.workspace===workspace?.id).map(i=>`${i.type==='board'?'moodboard':i.type}:${i.entityId}`).sort().join('|'),[visibleItems,workspace?.id])
 const key=enabled&&workspace&&uid?`${uid}:${workspace.id}:${item?.id||'workspace'}:${privileged}:${workspace.memberAccessLevels?.[uid]}:${allowedEntityKeys}:${limit}`:''
 const [feed,setFeed]=useState<{key:string;items:ConversationEntry[];error:string}>({key:'',items:[],error:''})
 useEffect(()=>{
  if(!key||!workspace)return
  let active=true
  const full=privileged||workspace.memberAccessLevels?.[uid]==='full'
  const allowed=new Set(visibleItems.filter(i=>i.workspace===workspace.id).map(i=>`${i.type==='board'?'moodboard':i.type}:${i.entityId}`))
  const queries=item ? [query(collection(db,'workhub_task_comments'),where('workspaceId','==',workspace.id),where('entityType','==',item.type),where('entityId','==',item.entityId)),...(item.type==='task'?[query(collection(db,'workhub_task_comments'),where('workspaceId','==',workspace.id),where('taskId','==',item.entityId))]:[])]:[query(collection(db,'workhub_activity'),where('workspaceId','==',workspace.id)),query(collection(db,'workhub_activity'),where('workspaceId','==',GLOBAL_CHAT_WORKSPACE_ID))]
  const buckets:Record<number,ConversationEntry[]>={};const errors:Record<number,string>={}
  const emit=()=>{if(active)setFeed({key,items:Array.from(new Map(Object.values(buckets).flat().map(entry=>[entry.id,entry])).values()).sort((a,b)=>a.time-b.time).slice(-limit),error:Object.values(errors)[0]||''})}
  const unsubs=queries.map((q,index)=>onSnapshot(q,snap=>{delete errors[index];buckets[index]=snap.docs.flatMap(d=>{
   const value=d.data()
   if(value.deletedAt)return []
   if(!item){
    if(value.action!=='chat_message'||!canReadEntity(value,uid,full))return []
    const thread=String(value.threadId||THREAD_EVERYONE)
    if(thread!==THREAD_EVERYONE)return []
    if(index===1&&value.targetPath){
     const prefix=`/workhub/w/${encodeURIComponent(workspace.id)}`
     if(value.targetPath!==prefix&&!value.targetPath.startsWith(prefix+'/')&&!value.targetPath.startsWith(prefix+'?'))return []
     const match=String(value.targetPath).match(/\/(p|t|d|m)\/([^/?#]+)/)
     if(match){const type={p:'project',t:'task',d:'document',m:'moodboard'}[match[1]];let entityId='';try{entityId=decodeURIComponent(match[2])}catch{return []}if(!allowed.has(`${type}:${entityId}`))return []}
    }
    if(index===0&&['project','task','document','moodboard'].includes(value.entityType)&&!allowed.has(`${value.entityType}:${value.entityId}`))return []
   }
   return [{id:d.id,author:String(value.authorUid||value.actorUid||''),body:String(value.body||value.message||''),time:timestamp(value.createdAt),reactions:value.reactionByUid||{}}]
  });emit()},error=>{errors[index]=error.code;buckets[index]=[];emit()}))
  return()=>{active=false;unsubs.forEach(unsubscribe=>unsubscribe())}
 },[key])
 return {entries:feed.key===key?feed.items:[],loading:!!key&&feed.key!==key,error:feed.key===key?feed.error:''}
}
