import {ExtraHours} from './ExtraHours'
import {useEffect,useRef,useState} from 'react'
import {ArrowLeft,Clock3,ArrowUpRight,X} from 'lucide-react'
import {collection,onSnapshot,query,where} from 'firebase/firestore'
import {db} from '../../../src/lib/firebase'
import type {WorkhubProject} from '../../../src/lib/workhubRepo'
import {HrAttendance} from './HrAttendance'

export function AttendanceQuickAccess({uid,t,onProfile}:{uid:string;t:(key:string)=>string;onProfile:()=>void}){
 const [open,setOpen]=useState(false),[profiles,setProfiles]=useState<WorkhubProject[]>([]),[selected,setSelected]=useState(''),[loaded,setLoaded]=useState(false),[error,setError]=useState('')
 const [extra,setExtra]=useState(false),[footer,setFooter]=useState<HTMLDivElement|null>(null)
 useEffect(()=>{const show=(event:Event)=>{setSelected((event as CustomEvent<string>).detail);setExtra(true);setOpen(true)};window.addEventListener('workhub-open-extra',show);return()=>window.removeEventListener('workhub-open-extra',show)},[])
 const root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null)
 useEffect(()=>{
  if(!open)return
  setLoaded(false);setError('')
  return onSnapshot(query(collection(db,'workhub_projects'),where('hrProfile.accountUid','==',uid)),snapshot=>{
   const rows=snapshot.docs.map(d=>({...d.data(),id:d.id} as WorkhubProject)).filter(p=>p.intent==='hr_employee_profile'&&p.hrProfile?.status!=='former')
   setProfiles(rows);setSelected(previous=>rows.some(p=>p.id===previous)?previous:rows[0]?.id||'');setLoaded(true)
  },()=>{setError(t('hrAccessError'));setLoaded(true)})
 },[open,uid])
 useEffect(()=>{
  if(!open)return
  const outside=(e:PointerEvent)=>{if(!root.current?.contains(e.target as Node))setOpen(false)}
  const escape=(e:KeyboardEvent)=>{if(e.key==='Escape'&&!root.current?.querySelector('dialog[open]')){setOpen(false);trigger.current?.focus()}}
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',escape)
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',escape)}
 },[open])
 const employee=profiles.find(p=>p.id===selected)
 return <div ref={root} className="attendance-quick-menu">
  <button ref={trigger} className="icon-button quiet" title={t('hrQuickAttendance')} aria-label={t('hrQuickAttendance')} aria-expanded={open} aria-haspopup="dialog" onClick={()=>{setExtra(false);setOpen(!open)}}><Clock3 size={21}/></button>
  {open&&<section className="attendance-quick-panel" role="dialog" aria-label={t('hrQuickAttendance')}>
   <header>{extra&&<button className="icon-button quiet" aria-label={t('hrBackAttendance')} onClick={()=>setExtra(false)}><ArrowLeft size={18}/></button>}<strong>{t('hrQuickAttendance')}</strong><button className="icon-button quiet" aria-label={t('close')} onClick={()=>{setOpen(false);trigger.current?.focus()}}><X size={18}/></button></header>
   <div className="attendance-quick-body">{!loaded?<div className="attendance-loading" role="status" aria-label={t('loading')}><div/><div/><div/></div>:error?<p role="alert">{error}</p>:<>
    {profiles.length>1&&!extra&&<select aria-label={t('myProfile')} value={selected} onChange={e=>setSelected(e.target.value)}>{profiles.map(p=><option key={p.id} value={p.id}>{p.name}</option>)}</select>}
    {employee?extra?<ExtraHours key={employee.id} employeeId={employee.id} t={t} footer={footer} onClose={()=>setExtra(false)}/>:<HrAttendance key={employee.id} compact employeeId={employee.id} accountUid={uid} name={employee.name} leaves={employee.hrProfile?.leaves||[]} t={t}/>:<p>{t('hrNoAssignedProfile')}</p>}
   </>}</div>
   <footer><button className="quiet" onClick={()=>{setOpen(false);onProfile()}}>{t('hrOpenProfile')}<ArrowUpRight size={17}/></button><div className="attendance-footer-actions" ref={setFooter}/></footer>
  </section>}
 </div>
}
