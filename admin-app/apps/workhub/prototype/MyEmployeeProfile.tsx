import {LoadingSkeleton} from './LoadingSkeleton'
import {useEffect,useRef,useState} from 'react'
import {collection,query,where,onSnapshot,doc,getDoc} from 'firebase/firestore'
import {auth,db} from '../../../src/lib/firebase'
import {ensureOwnHrProfile} from '../../../src/lib/workhubRepo'
import {resolveWorkhubWorkspaceTemplateIdForWorkspace} from '../../../src/pages/workhub/workspaceTemplates'
import {HrWorkspace} from './HrWorkspace'
import type {WorkhubProject,WorkhubWorkspace,WorkhubMember} from '../../../src/lib/workhubRepo'
import type {Item} from './data'
export function MyEmployeeProfile({uid,people,t,masterAdmin=false,availableWorkspaces=[]}:{masterAdmin?:boolean;availableWorkspaces?:WorkhubWorkspace[];uid:string;people:WorkhubMember[];t:(k:string)=>string}){
 const provisioning=useRef('')
 const [creating,setCreating]=useState(false)
 const explicitSelection=useRef('')
 const [profiles,setProfiles]=useState<Item[]>([]),[workspaces,setWorkspaces]=useState<Record<string,WorkhubWorkspace>>({}),[selected,setSelected]=useState(''),[error,setError]=useState(''),[loaded,setLoaded]=useState(false)
 useEffect(()=>{let active=true;explicitSelection.current='';setLoaded(false);setProfiles([]);setSelected('');const buckets:Record<string,Item[]>={};const ready=new Set<string>();const stops=['accountUid','reportingToUid'].map(field=>onSnapshot(query(collection(db,'workhub_projects'),where('hrProfile.'+field,'==',uid)),async snap=>{
  const rows=snap.docs.map(d=>{const p={...d.data(),id:d.id} as WorkhubProject;return {id:'project:'+d.id,entityId:d.id,workspace:p.workspaceId,parent:p.parentProjectId||'',type:'project',title:p.name,intent:p.intent,projectData:p,description:p.description||'',owner:p.createdBy,due:'',status:'',assigned:[],attachments:p.attachments||[],attachmentTitles:p.attachmentTitles||{},storageMethod:p.storageMethod} as Item})
  if(!active)return;buckets[field]=rows;const all=Array.from(new Map(Object.values(buckets).flat().map(i=>[i.id,i])).values());setProfiles(all);setSelected(()=>all.some(i=>i.id===explicitSelection.current)?explicitSelection.current:all.find(i=>i.projectData?.hrProfile?.accountUid===uid)?.id||all[0]?.id||'');ready.add(field);setLoaded(ready.size===2)
  for(const id of new Set(rows.map(i=>i.workspace))){try{const w=await getDoc(doc(db,'workhub_workspaces',id));if(active&&w.exists())setWorkspaces(previous=>({...previous,[id]:{...w.data(),id} as WorkhubWorkspace}))}catch(e){if(active)setError(t('hrAccessError'))}}
 },e=>{if(active){setLoaded(true);setError(e.code==='permission-denied'?t('hrAccessError'):e.message)}}));return()=>{active=false;stops.forEach(stop=>stop())}},[uid])
 useEffect(()=>{
  if(!loaded||!masterAdmin||error||profiles.some(i=>i.projectData?.hrProfile?.accountUid===uid))return
  const hr=availableWorkspaces.find(w=>resolveWorkhubWorkspaceTemplateIdForWorkspace(w)==='hr')
  if(!hr||provisioning.current===uid)return
  provisioning.current=uid;setCreating(true)
  ensureOwnHrProfile(hr.id,uid,auth.currentUser?.displayName||auth.currentUser?.email||t('myProfile'),auth.currentUser?.email||'').catch(e=>setError(e instanceof Error?e.message:t('saveFailed'))).finally(()=>setCreating(false))
 },[loaded,masterAdmin,uid,profiles,availableWorkspaces,error])
 const employee=profiles.find(i=>i.id===selected),workspace=employee?workspaces[employee.workspace]:undefined
 return <>{error&&<p role="alert" className="error-note">{error}</p>}{profiles.length>1&&<div className="library-tabs">{profiles.map(i=><button key={i.id} aria-pressed={selected===i.id} onClick={()=>{explicitSelection.current=i.id;setSelected(i.id)}}>{i.title}</button>)}</div>}{!loaded||creating?<LoadingSkeleton label={t('loading')}/>:employee&&workspace?<HrWorkspace key={employee.id} initialTab={new URLSearchParams(location.search).get('hrTab')==='attendance'?'attendance':undefined} personal initialEmployee={employee.id} workspace={workspace} items={profiles} people={people} canManage={false} t={t}/>:!loaded?<LoadingSkeleton label={t('loading')}/>:<p className="empty">{t('hrNoAssignedProfile')}</p>}</>
}
