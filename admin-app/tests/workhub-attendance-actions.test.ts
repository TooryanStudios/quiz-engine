import {beforeEach,describe,it,expect,vi} from 'vitest'
const state=vi.hoisted(()=>({records:new Map<string,any>(),updates:[] as any[]}))
vi.mock('../functions/node_modules/firebase-admin/lib/index.js',()=>{
 class Timestamp{seconds:number;constructor(private millis:number){this.seconds=Math.floor(millis/1000)}toMillis(){return this.millis}toDate(){return new Date(this.millis)}static fromDate(date:Date){return new Timestamp(date.getTime())}static now(){return new Timestamp(Date.now())}}
 const reference=(path:string):any=>({path,doc:(id:string)=>reference(path+'/'+id),collection:(name:string)=>reference(path+'/'+name),get:async()=>({data:()=>state.records.get(path)})})
 const firestore=Object.assign(()=>({collection:reference,runTransaction:(fn:any)=>fn({get:(ref:any)=>ref.get(),update:(ref:any,value:any)=>state.updates.push({path:ref.path,value})})}),{Timestamp,FieldValue:{delete:()=>null,serverTimestamp:()=>Timestamp.now()}})
 return {firestore}
})
import * as admin from '../functions/node_modules/firebase-admin/lib/index.js'
import {workhubHrAction} from '../functions/src/workhubHrActions'
const call=workhubHrAction.run as unknown as (request:unknown)=>Promise<any>
const timestamp=(text:string)=>admin.firestore.Timestamp.fromDate(new Date(text))
beforeEach(()=>{
 state.records.clear();state.updates=[]
 state.records.set('workhub_members/user',{status:'approved',role:'member'})
 state.records.set('workhub_projects/employee',{intent:'hr_employee_profile',hrProfile:{accountUid:'user',status:'active'}})
})
describe('attendance completion transaction',()=>{
 it('finishes extra hours in one request and returns a committed UI receipt',async()=>{
  const now=Date.now(),started=new Date(now-3600000),finish=now-60000
  state.records.set('workhub_projects/employee/attendance/extra',{kind:'extraHours',authorUid:'user',date:'2026-10-12',clockIn:admin.firestore.Timestamp.fromDate(started),clockOut:null})
  const result=await call({auth:{uid:'user',token:{}},data:{employeeId:'employee',action:'finishExtraHours',sessionId:'extra',finishRequestedAt:finish,workItems:['Finish report']}})
  expect(result.finished).toBe(true)
  expect(result.workedMinutes).toBe(59)
  expect(result.record.clockIn).toEqual({seconds:Math.floor(started.getTime()/1000)})
  expect(result.record.clockOut).toEqual({seconds:Math.floor(finish/1000)})
  expect(state.updates).toHaveLength(2)
 })
 it('returns a confirmed regular-work end time immediately after saving',async()=>{
  const date=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Muscat',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date())
  state.records.set('workhub_projects/employee/attendance/'+date,{authorUid:'user',date,clockIn:admin.firestore.Timestamp.fromDate(new Date(Date.now()-3600000)),clockOut:null})
  const result=await call({auth:{uid:'user',token:{}},data:{employeeId:'employee',action:'clockOut'}})
  expect(result.record.id).toBe(date)
  expect(result.record.clockOut.seconds).toBeGreaterThan(0)
  expect(result.record.workedMinutes).toBe(60)
  expect(state.updates).toHaveLength(2)
 })
 it('allows a retried finish without double-counting the session',async()=>{
  state.records.set('workhub_projects/employee/attendance/extra',{kind:'extraHours',authorUid:'user',clockIn:timestamp('2026-10-12T14:00:00Z'),clockOut:timestamp('2026-10-12T15:00:00Z')})
  const result=await call({auth:{uid:'user',token:{}},data:{employeeId:'employee',action:'finishExtraHours',sessionId:'extra'}})
  expect(result.finished).toBe(true);expect(state.updates).toHaveLength(0)
 })
 it('keeps the session open if accomplishments are missing',async()=>{
  state.records.set('workhub_projects/employee/attendance/extra',{kind:'extraHours',authorUid:'user',clockIn:timestamp('2026-10-12T14:00:00Z')})
  await expect(call({auth:{uid:'user',token:{}},data:{employeeId:'employee',action:'finishExtraHours',sessionId:'extra',workItems:[]}})).rejects.toMatchObject({code:'invalid-argument'})
  expect(state.updates).toHaveLength(0)
 })
 it('still requires sign-in and the assigned employee',async()=>{
  await expect(call({data:{employeeId:'employee',action:'finishExtraHours'}})).rejects.toMatchObject({code:'unauthenticated'})
  state.records.set('workhub_projects/employee',{intent:'hr_employee_profile',hrProfile:{accountUid:'other'}})
  await expect(call({auth:{uid:'user',token:{}},data:{employeeId:'employee',action:'clockOut'}})).rejects.toMatchObject({code:'permission-denied'})
  expect(state.updates).toHaveLength(0)
 })
})
