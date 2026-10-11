import {describe,it,expect} from 'vitest'
import {omanWorkday,workdayDuration,approvedLeaveOn,manualWorkday,missedClockOut} from '../functions/src/workhubHrAttendance'
describe('Oman employee attendance',()=>{
 it('uses the Oman workday date and an 8am start',()=>{expect(omanWorkday(new Date('2026-10-10T04:20:00Z'))).toEqual({date:'2026-10-10',lateMinutes:20});expect(omanWorkday(new Date('2026-10-09T21:00:00Z')).date).toBe('2026-10-10')})
 it('records elapsed time and only counts overtime after 5pm',()=>{expect(workdayDuration(new Date('2026-10-10T04:00:00Z'),new Date('2026-10-10T14:00:00Z'),'2026-10-10')).toEqual({workedMinutes:600,overtimeMinutes:60});expect(workdayDuration(new Date('2026-10-10T14:00:00Z'),new Date('2026-10-10T15:00:00Z'),'2026-10-10').overtimeMinutes).toBe(60)})
})

it('only blocks attendance for approved leave covering today, including both boundary days',()=>{
 const annual={start:'2026-10-10',end:'2026-10-12',status:'approved',type:'annual'}
 expect(approvedLeaveOn([annual],'2026-10-10')).toBe(annual)
 expect(approvedLeaveOn([annual],'2026-10-12')).toBe(annual)
 expect(approvedLeaveOn([annual],'2026-10-13')).toBeUndefined()
 expect(approvedLeaveOn([{...annual,status:'pending'}],'2026-10-11')).toBeUndefined()
 expect(approvedLeaveOn([{...annual,status:'rejected'}],'2026-10-11')).toBeUndefined()
 const sick={...annual,type:'sick'}
 expect(approvedLeaveOn([sick],'2026-10-11')?.type).toBe('sick')
})

it('validates manual times before counting work',()=>{
 const now=new Date('2026-10-11T12:00:00Z')
 expect(manualWorkday('2026-10-10','08:00','17:00',now).workedMinutes).toBe(540)
 expect(()=>manualWorkday('2026-10-10','17:00','08:00',now)).toThrow()
 expect(()=>manualWorkday('2026-10-12','08:00','17:00',now)).toThrow()
 expect(()=>manualWorkday('2026-02-30','08:00','17:00',now)).toThrow()
})
it('reminds after 10pm Oman time only for unfinished work',()=>{
 expect(missedClockOut('2026-10-10',{},null,new Date('2026-10-10T17:59:00Z'))).toBe(false)
 expect(missedClockOut('2026-10-10',{},null,new Date('2026-10-10T18:00:00Z'))).toBe(true)
 expect(missedClockOut('2026-10-10',{}, {},new Date('2026-10-11T04:00:00Z'))).toBe(false)
 expect(missedClockOut('2026-10-10',null,null,new Date('2026-10-11T04:00:00Z'))).toBe(false)
})
