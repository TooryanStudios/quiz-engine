import {beforeEach,describe,it,expect,vi} from 'vitest'
const state=vi.hoisted(()=>({records:new Map<string,any>(),notifications:[] as any[]}))
vi.mock('../functions/node_modules/firebase-admin/lib/index.js',()=>{
 class Timestamp{seconds:number;constructor(private millis:number){this.seconds=Math.floor(millis/1000)}toMillis(){return this.millis}toDate(){return new Date(this.millis)}static fromDate(date:Date){return new Timestamp(date.getTime())}}
 const reference=(path:string):any=>({path,id:path.split('/').pop(),doc:(id:string)=>reference(path+'/'+id),collection:(name:string)=>reference(path+'/'+name),
  get:async()=>({data:()=>state.records.get(path)}),set:async(value:any)=>{state.notifications.push({path,value})},
  where:()=>({get:async()=>({docs:[...state.records.entries()].filter(([key,value])=>key.split('/').length===2&&key.startsWith(path+'/')&&value.intent==='hr_employee_profile').map(([key,value])=>({id:key.split('/')[1],ref:reference(key),data:()=>value}))})})})
 const firestore=Object.assign(()=>({collection:reference,doc:reference,runTransaction:(fn:any)=>fn({get:(ref:any)=>ref.get(),update:(ref:any,value:any)=>state.records.set(ref.path,{...state.records.get(ref.path),...value})})}),{Timestamp,FieldValue:{serverTimestamp:()=>'now'}})
 return {firestore}
})
import * as admin from '../functions/node_modules/firebase-admin/lib/index.js'
import {runAttendanceReminders} from '../functions/src/workhubAttendanceReminders'
const ts=(text:string)=>admin.firestore.Timestamp.fromDate(new Date(text))
beforeEach(()=>{
 state.records.clear();state.notifications=[]
 state.records.set('workhub_projects/employee',{intent:'hr_employee_profile',hrProfile:{accountUid:'user',status:'active',attendance:[]}})
 state.records.set('workhub_members/user',{email:'person@example.com'})
})
describe('attendance reminders',()=>{
 it('warns in app and by email once working hours are over, only once',async()=>{
  state.records.set('workhub_projects/employee/attendance/2026-11-04',{date:'2026-11-04',clockIn:ts('2026-11-04T04:00:00Z'),clockOut:null})
  const send=vi.fn(async()=>undefined)
  expect(await runAttendanceReminders(new Date('2026-11-04T12:50:00Z'),send)).toEqual([])
  expect(await runAttendanceReminders(new Date('2026-11-04T13:05:00Z'),send)).toEqual([{employeeId:'employee',date:'2026-11-04',kind:'end'}])
  expect(await runAttendanceReminders(new Date('2026-11-04T13:20:00Z'),send)).toEqual([])
  expect(send).toHaveBeenCalledTimes(1)
  expect(send.mock.calls[0][0]).toMatchObject({to:'person@example.com'})
  expect(state.notifications[0]).toMatchObject({path:'workhub_notifications/attendance_employee_2026-11-04_end',value:{recipientUid:'user',delivery:'in_app',entityType:'attendance'}})
  expect((await runAttendanceReminders(new Date('2026-11-04T18:05:00Z'),send))[0].kind).toBe('late')
 })
 it('does not warn on the weekend or for finished work',async()=>{
  state.records.set('workhub_projects/employee/attendance/2026-11-06',{date:'2026-11-06',clockIn:ts('2026-11-06T04:00:00Z'),clockOut:null})
  state.records.set('workhub_projects/employee/attendance/2026-11-05',{date:'2026-11-05',clockIn:ts('2026-11-05T04:00:00Z'),clockOut:ts('2026-11-05T13:00:00Z')})
  const send=vi.fn(async()=>undefined)
  expect(await runAttendanceReminders(new Date('2026-11-06T14:00:00Z'),send)).toEqual([])
  expect(send).not.toHaveBeenCalled()
 })
 it('closes a shift left open overnight at the schedule end',async()=>{
  state.records.set('workhub_projects/employee/attendance/2026-11-04',{date:'2026-11-04',clockIn:ts('2026-11-04T04:00:00Z'),clockOut:null,endReminderSentAt:ts('2026-11-04T13:00:00Z'),lateReminderSentAt:ts('2026-11-04T18:00:00Z')})
  const send=vi.fn(async()=>undefined)
  expect(await runAttendanceReminders(new Date('2026-11-05T00:10:00Z'),send)).toEqual([{employeeId:'employee',date:'2026-11-04',kind:'autoClosed'}])
  const record=state.records.get('workhub_projects/employee/attendance/2026-11-04')
  expect(record).toMatchObject({autoClosed:true,workedMinutes:540,overtimeMinutes:0})
  expect(record.clockOut.toDate().toISOString()).toBe('2026-11-04T13:00:00.000Z')
 })
})
