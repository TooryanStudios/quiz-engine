import {useEffect,useState} from 'react'
import {collection,onSnapshot} from 'firebase/firestore'
import {auth,db} from '../../../src/lib/firebase'

export type AttendanceRecord={id:string;date:string;kind?:string;clockIn?:{seconds:number};clockOut?:{seconds:number};location:string;note:string;lateMinutes:number;overtimeMinutes:number;workedMinutes?:number;reasons?:string[];workItems?:string[];projectName?:string}
const cache=new Map<string,AttendanceRecord[]>()
const confirmed=new Map<string,AttendanceRecord>()
const event='workhub-attendance-saved'
/** Called only after the server commits, so closing a screen cannot show an old open shift. */
export function attendanceSaved(employeeId:string,record:AttendanceRecord){
 const key=auth.currentUser?.uid+':'+employeeId
 confirmed.set(key+':'+record.id,record)
 cache.set(key,[record,...(cache.get(key)||[]).filter(row=>row.id!==record.id)])
 window.dispatchEvent(new Event(event))
}
export function useAttendanceRecords(employeeId:string){
 const key=auth.currentUser?.uid+':'+employeeId
 const [records,setRecords]=useState(()=>cache.get(key)||[]),[loaded,setLoaded]=useState(()=>cache.has(key)),[error,setError]=useState('')
 useEffect(()=>{
  setRecords(cache.get(key)||[]);setLoaded(cache.has(key));setError('')
  const receive=()=>{setRecords(cache.get(key)||[]);setLoaded(true)}
  window.addEventListener(event,receive)
  const stop=onSnapshot(collection(db,'workhub_projects',employeeId,'attendance'),snapshot=>{
   const rows=new Map(snapshot.docs.map(d=>[d.id,{...d.data(),id:d.id} as AttendanceRecord]))
   for(const [id,value] of confirmed){if(!id.startsWith(key+':'))continue;const row=rows.get(value.id);if(row?.clockOut?.seconds===value.clockOut?.seconds&&row?.clockIn?.seconds===value.clockIn?.seconds)confirmed.delete(id);else rows.set(value.id,value)}
   cache.set(key,[...rows.values()].sort((a,b)=>b.date.localeCompare(a.date)));receive();setError('')
  },error=>{setLoaded(true);setError(error.code)})
  return()=>{stop();window.removeEventListener(event,receive)}
 },[employeeId,key])
 return {records,loaded,error}
}
