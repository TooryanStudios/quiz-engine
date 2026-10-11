import {resolveWorkhubWorkspaceTemplateIdForWorkspace} from '../../../src/pages/workhub/workspaceTemplates'
import { useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { collection, doc, onSnapshot, query, where, type QueryConstraint } from 'firebase/firestore'
import { auth, authReady, db } from '../../../src/lib/firebase'
import type { WorkhubMember, WorkhubWorkspace, WorkhubNotification } from '../../../src/lib/workhubRepo'
import { canAccessWorkspace } from '../../../src/pages/workhub/projectUtils'
import { GLOBAL_CHAT_WORKSPACE_ID, THREAD_EVERYONE, parseThreadParticipantUids } from '../../../src/features/communication/hooks/useGlobalTeamChat'
import { adaptWorkspaceItems, canReadEntity, emptyData, type Item, type WorkspaceData } from './data'

export function useLiveWorkhub() {
 const [user,setUser]=useState<User|null|undefined>(undefined)
 const [memberState,setMemberState]=useState<{uid:string;value:WorkhubMember|null}|null>(null)
 const [workspaceState,setWorkspaceState]=useState<{scope:string;items:WorkhubWorkspace[]}|null>(null)
 const [feeds,setFeeds]=useState<{scope:string;data:Record<string,WorkspaceData>;loaded:Record<string,boolean>}>({scope:'',data:{},loaded:{}})
 const [errors,setErrors]=useState<Record<string,string>>({})
 const [notificationState,setNotificationState]=useState<{uid:string;items:WorkhubNotification[]}>({uid:'',items:[]})
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
  authReady.then(()=>{if(!active)return;unsubscribe=onAuthStateChanged(auth,next=>{setUser(next);setErrors({});if(!next){setMemberState(null);setWorkspaceState(null);setFeeds({scope:'',data:{},loaded:{}});setNotificationState({uid:'',items:[]});setPeopleState({scope:'',items:[]})}})})
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
 useEffect(()=>{
  if(!scope)return
  return onSnapshot(collection(db,'workhub_members'),snap=>{setPeopleState({scope,items:snap.docs.map(d=>({...d.data(),uid:d.id} as WorkhubMember))});report('people')},error=>{setPeopleState({scope,items:[]});report('people',error)})
 },[scope])
 useEffect(()=>{
  if(!approved||!user)return
  let active=true
  setErrors(previous=>Object.fromEntries(Object.entries(previous).filter(([key])=>!key.includes(':'))))
  setFeeds({scope:dataScope,data:{},loaded:{}})
  const unsubs:(()=>void)[]=[]
  for(const workspace of workspaces){
   const full=privileged||workspace.memberAccessLevels?.[user.uid]==='full'
   for(const [key,name] of Object.entries({projects:'workhub_projects',tasks:'workhub_tasks',documents:'workhub_documents',boards:'workhub_mood_boards'})){
    const feedKey=key as keyof WorkspaceData
    const buckets:Record<string,unknown[]>={}
    const constraints:QueryConstraint[]=[where('workspaceId','==',workspace.id)]
    const queries=key==='boards'?(privileged?[constraints]:[
     [...constraints,where('visibility','!=','restricted')],
     [...constraints,where('memberUids','array-contains',user.uid)],
     [...constraints,where('createdBy','==',user.uid)],
    ]):full?[constraints]:[
     [...constraints,where('visibility','==','workspace')],
     [...constraints,where('visibility','==','restricted'),where('memberUids','array-contains',user.uid)],
     [...constraints,where('createdBy','==',user.uid)],
    ]
    queries.forEach((parts,index)=>{
     const id=`${workspace.id}:${key}:${index}`
     const emit=(ready=true)=>{
      if(!active)return
      const entries=Array.from(new Map(Object.values(buckets).flat().map(value=>{const item=value as {id:string};return [item.id,item]})).values())
      entries.sort((a,b)=>((a as {sortOrder?:number}).sortOrder||0)-((b as {sortOrder?:number}).sortOrder||0))
      setFeeds(previous=>previous.scope!==dataScope?previous:{...previous,data:{...previous.data,[workspace.id]:{...(previous.data[workspace.id]||emptyData()),[feedKey]:entries}},loaded:ready?{...previous.loaded,[id]:true}:previous.loaded})
     }
     unsubs.push(onSnapshot(query(collection(db,name),...parts),{includeMetadataChanges:true},snapshot=>{buckets[id]=snapshot.docs.map(d=>({...d.data(),id:d.id}));emit(!snapshot.metadata.fromCache||!snapshot.empty||!navigator.onLine);if(active)report(id)},error=>{buckets[id]=[];emit();if(active)report(id,error)}))
    })
   }
  }
  return()=>{active=false;unsubs.forEach(unsubscribe=>unsubscribe())}
 },[dataScope])
 useEffect(()=>{
  if(!approved||!user)return
  return onSnapshot(query(collection(db,'workhub_notifications'),where('recipientUid','==',user.uid)),snap=>{setNotificationState({uid:user.uid,items:snap.docs.map(d=>({...d.data(),id:d.id} as WorkhubNotification))});report('notifications')},error=>{report('notifications',error);setNotificationState({uid:user.uid,items:[]})})
 },[approved,user?.uid])
 const items:Item[]=useMemo(()=>feeds.scope===dataScope&&user?workspaces.flatMap(w=>adaptWorkspaceItems(w,feeds.data[w.id]||emptyData(),user.uid,privileged)):[],[feeds,dataScope,workspaces,user,privileged])
 const expectedFeeds=workspaces.reduce((count,w)=>count+((privileged||w.memberAccessLevels?.[user?.uid||'']==='full')? (privileged?4:6):12),0)
 const loading = user===undefined || (!!user && memberState?.uid!==user.uid) || (approved && workspaceState?.scope!==scope) || (approved && workspaces.length>0 && (feeds.scope!==dataScope || Object.keys(feeds.loaded).length<expectedFeeds))
 return {user,member,workspaces,items,loading,errors,approved,privileged,notificationsReady:notificationState.uid===user?.uid,people:peopleState.scope===scope?peopleState.items:[],notifications:approved&&notificationState.uid===user?.uid?notificationState.items.filter(n=>n.workspaceId==='__communication_global__'||workspaces.some(w=>w.id===n.workspaceId)):[]}
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
