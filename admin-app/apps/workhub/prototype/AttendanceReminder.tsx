import {useEffect,useMemo,useState} from 'react'
import {collection,onSnapshot,query,where} from 'firebase/firestore'
import {db} from '../../../src/lib/firebase'
import {missedClockOut} from '../../../functions/src/workhubHrAttendance'
export function AttendanceReminder({uid,t,onOpen,enabled=true}:{uid:string;t:(key:string)=>string;onOpen:()=>void;enabled?:boolean}){
 const [startedUid,setStartedUid]=useState('')
 useEffect(()=>{if(enabled)setStartedUid(uid)},[uid,enabled])
 const [records,setRecords]=useState<{uid:string;days:Record<string,{date:string;clockIn:unknown;clockOut:unknown}[]>}>({uid:'',days:{}}),[dismissed,setDismissed]=useState(''),[now,setNow]=useState(()=>new Date())
 useEffect(()=>{const timer=setInterval(()=>setNow(new Date()),60000);return()=>clearInterval(timer)},[])
 useEffect(()=>{
  if(startedUid!==uid)return
  let active=true;const stops=new Map<string,()=>void>()
  setRecords({uid,days:{}})
  const stop=onSnapshot(query(collection(db,'workhub_projects'),where('hrProfile.accountUid','==',uid)),snap=>{
   const ids=new Set(snap.docs.map(employee=>employee.id))
   for(const [id,unsubscribe] of stops)if(!ids.has(id)){unsubscribe();stops.delete(id)}
   setRecords(previous=>({uid,days:Object.fromEntries(Object.entries(previous.days).filter(([id])=>ids.has(id)))}))
   for(const employee of snap.docs)if(!stops.has(employee.id))stops.set(employee.id,onSnapshot(collection(db,'workhub_projects',employee.id,'attendance'),days=>{
    if(active)setRecords(previous=>({uid,days:{...previous.days,[employee.id]:days.docs.map(day=>{const r=day.data();return {date:String(r.date||day.id),clockIn:r.clockIn,clockOut:r.clockOut}})}}))
   },()=>{}))
  },()=>{})
  return()=>{active=false;stop();stops.forEach(unsubscribe=>unsubscribe())}
 },[uid,startedUid])
 const missing=useMemo(()=>records.uid===uid?Object.values(records.days).flat().filter(r=>missedClockOut(r.date,r.clockIn,r.clockOut,now)).map(r=>r.date).sort():[],[records,uid,now])
 const key=missing.join(',')
 if(!missing.length||key===dismissed)return null
 return <aside className="attendance-reminder" role="status"><strong>{t('hrMissingFinish')}</strong><p>{t('hrMissingFinishHint')} {missing.join(', ')}</p><button className="primary" onClick={()=>{setDismissed(key);onOpen()}}>{t('hrManualDay')}</button><button className="secondary" onClick={()=>setDismissed(key)}>{t('close')}</button></aside>
}
