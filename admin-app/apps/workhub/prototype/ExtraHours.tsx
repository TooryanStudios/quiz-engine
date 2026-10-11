import {attendanceSaved,useAttendanceRecords,type AttendanceRecord} from './attendanceState'
import {createContext,useContext,useEffect,useRef,useState} from 'react'
import {createPortal} from 'react-dom'
import {Plus,X,Sparkles} from 'lucide-react'
import {workhubHrAction} from '../../../src/lib/workhubRepo'
export const ExtraHoursProjects=createContext<string[]>([])
export const ExtraHoursEntities=createContext<()=>Promise<string[]>>(async()=>[])
export function openExtraAttendance(employeeId:string){window.dispatchEvent(new CustomEvent('workhub-open-extra',{detail:employeeId}))}
export function ExtraHours({employeeId,t,onClose,footer}:{employeeId:string;t:(key:string)=>string;onClose:()=>void;footer:HTMLElement|null}){
 const entities=useContext(ExtraHoursEntities)
 const [reasons,setReasons]=useState<string[]>([]),[items,setItems]=useState<string[]>(['']),[busy,setBusy]=useState(false),[error,setError]=useState(''),[session,setSession]=useState<string|null>(null),[loaded,setLoaded]=useState(false),[suggestions,setSuggestions]=useState<string[]>([]),[detection,setDetection]=useState('')
 const finishRequestedAt=useRef(Date.now())
 const attendance=useAttendanceRecords(employeeId)
 const initial=useRef(false)
 const failure=(e:unknown)=>(e as {code?:string}).code==='functions/internal'?t('hrAttendanceError'):(e as Error).message
 useEffect(()=>{if(attendance.error)setError(t('hrAccessError'));if(!attendance.loaded)return;setLoaded(true);if(!initial.current){initial.current=true;setSession(attendance.records.find(row=>row.kind==='extraHours'&&row.clockIn&&!row.clockOut)?.id||null)}},[attendance.loaded,attendance.records,attendance.error])
 const detect=async()=>{setBusy(true);setError('');try{const result=await workhubHrAction({employeeId,action:'detectExtraWork',sessionId:session,finishRequestedAt:finishRequestedAt.current,entityKeys:(await entities()).slice(0,10000)});const found=Array.from(new Set((result.items as string[]||[]))).filter(text=>!items.includes(text));setSuggestions(found);setDetection(t(result.limited?'hrDetectionLimited':found.length?'hrDetectionReview':'hrDetectionEmpty'))}catch(e){setError(failure(e))}finally{setBusy(false)}}
 const submit=async()=>{setBusy(true);setError('');try{const result=await workhubHrAction(session?{employeeId,action:'finishExtraHours',sessionId:session,finishRequestedAt:finishRequestedAt.current,workItems:items.map(i=>i.trim()).filter(Boolean)}:{employeeId,action:'startExtraHours',reasons});if(result.record)attendanceSaved(employeeId,result.record as AttendanceRecord);onClose()}catch(e){setError(failure(e))}finally{setBusy(false)}}
 return <div className="extra-session-screen">
  {!loaded?<div className="attendance-loading" aria-label={t('loading')}><div/><div/></div>:session?<><strong>{t('hrExtraDetails')}</strong><small>{t('hrExtraFinishHint')}</small><div className="extra-work-list">{items.map((item,index)=><div key={index}><input disabled={busy} aria-label={t('hrWorkItem')+' '+(index+1)} maxLength={500} value={item} onChange={e=>setItems(previous=>previous.map((text,i)=>i===index?e.target.value:text))}/><button disabled={busy} type="button" className="icon-button quiet" aria-label={t('remove')} onClick={()=>setItems(previous=>previous.length===1?['']:previous.filter((_,i)=>i!==index))}><X size={16}/></button></div>)}<button disabled={busy||items.length>=30} className="secondary" onClick={()=>setItems([...items,''])}><Plus size={16}/>{t('hrWorkItem')}</button></div><button disabled={busy} className="secondary" onClick={()=>void detect()}><Sparkles size={16}/>{t('hrDetectWork')}</button>{detection&&<small role="status">{detection}</small>}{suggestions.map(text=><button disabled={busy||items.filter(i=>i.trim()).length>=30} className="extra-work-suggestion" key={text} onClick={()=>{setItems(previous=>[...previous.filter(i=>i.trim()),text]);setSuggestions(previous=>previous.filter(i=>i!==text))}}><Plus size={16}/>{text}</button>)}</>:<><strong>{t('hrExtraReason')}</strong><small>{t('hrMultipleReasons')}</small><div className="attendance-reasons">{['urgent','catchup','research','meeting','other'].map(key=><button key={key} disabled={busy} aria-pressed={reasons.includes(key)} onClick={()=>setReasons(previous=>previous.includes(key)?previous.filter(r=>r!==key):[...previous,key])}>{t('hrExtra_'+key)}</button>)}</div></>}
  {error&&<p role="alert" className="error-note">{error}</p>}
  {footer&&createPortal(<><button className="secondary" disabled={busy} onClick={onClose}>{t('cancel')}</button><button className="primary" disabled={busy||!loaded||(session?!items.some(i=>i.trim()):!reasons.length)} onClick={()=>void submit()}>{t(busy?'saving':session?'hrFinishExtra':'hrStartExtra')}</button></>,footer)}
 </div>
}
