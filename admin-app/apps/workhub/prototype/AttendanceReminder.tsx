import {useEffect,useState} from 'react'
import {collection,onSnapshot,query,where} from 'firebase/firestore'
import {db} from '../../../src/lib/firebase'
import {missedClockOut} from '../../../functions/src/workhubHrAttendance'
export function AttendanceReminder({uid,t,onOpen}:{uid:string;t:(key:string)=>string;onOpen:()=>void}){
 const [missing,setMissing]=useState<string[]>([]),[dismissed,setDismissed]=useState(''),[now,setNow]=useState(()=>new Date())
 useEffect(()=>{const timer=setInterval(()=>setNow(new Date()),60000);return()=>clearInterval(timer)},[])
 useEffect(()=>{let stops:(()=>void)[]=[];const buckets:Record<string,string[]>={};const stop=onSnapshot(query(collection(db,'workhub_projects'),where('hrProfile.accountUid','==',uid)),snap=>{
  stops.forEach(stop=>stop());for(const key of Object.keys(buckets))delete buckets[key];setMissing([])
  stops=snap.docs.map(employee=>onSnapshot(collection(db,'workhub_projects',employee.id,'attendance'),days=>{buckets[employee.id]=days.docs.filter(day=>{const r=day.data();return missedClockOut(r.date,r.clockIn,r.clockOut,now)}).map(day=>day.data().date);setMissing(Object.values(buckets).flat().sort())},()=>{}))
 },()=>{});return()=>{stop();stops.forEach(stop=>stop())}},[uid,now])
 const key=missing.join(',')
 if(!missing.length||key===dismissed)return null
 return <aside className="attendance-reminder" role="status"><strong>{t('hrMissingFinish')}</strong><p>{t('hrMissingFinishHint')} {missing.join(', ')}</p><button className="primary" onClick={()=>{setDismissed(key);onOpen()}}>{t('hrManualDay')}</button><button className="secondary" onClick={()=>setDismissed(key)}>{t('close')}</button></aside>
}
