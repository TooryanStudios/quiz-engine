import {describe,it,expect} from 'vitest'
import {emptyHrProfile,hrTotals,hrLeaveBalance} from '../src/lib/workhubHr'
describe('HR balances and weekly totals',()=>{it('counts only approved leave for the current year and attendance within the selected week',()=>{const p=emptyHrProfile();p.annualLeaveDays=20;p.leaves=[{id:'1',start:'2026-10-01',end:'2026-10-03',days:3,type:'Annual',status:'approved',note:''},{id:'2',start:'2026-10-05',end:'2026-10-06',days:2,type:'Annual',status:'pending',note:''},{id:'3',start:'2025-10-01',end:'2025-10-03',days:3,type:'Annual',status:'approved',note:''}];p.attendance=[{id:'1',date:'2026-10-05',lateMinutes:10,overtimeMinutes:60,present:true},{id:'2',date:'2026-09-30',lateMinutes:30,overtimeMinutes:90,present:true}];expect(hrTotals(p,'2026-10-05','2026-10-11')).toEqual({leaveTaken:3,leaveRemaining:17,lateMinutes:10,overtimeMinutes:60})})})

it('renews the allowance on the employment anniversary and splits leave across years',()=>{
 const p=emptyHrProfile();p.startDate='2025-10-10';p.leaves=[{id:'cross',start:'2026-10-08',end:'2026-10-12',days:5,type:'Annual',status:'approved',note:''}]
 expect(hrLeaveBalance(p,'2026-10-09')).toMatchObject({periodStart:'2025-10-10',periodEnd:'2026-10-09',leaveTaken:2,leaveRemaining:28})
 expect(hrLeaveBalance(p,'2026-10-10')).toMatchObject({periodStart:'2026-10-10',periodEnd:'2027-10-09',leaveTaken:3,leaveRemaining:27})
})
it('handles leap-day employment and excludes pending requests',()=>{
 const p=emptyHrProfile();p.startDate='2024-02-29';p.leaves=[{id:'pending',start:'2025-03-01',end:'2025-03-03',days:3,type:'Annual',status:'pending',note:''}]
 expect(hrLeaveBalance(p,'2025-02-28')).toMatchObject({periodStart:'2025-02-28',periodEnd:'2026-02-27',leaveRemaining:30})
 expect(hrLeaveBalance(p,'2024-01-01').ready).toBe(false)
})

it('does not deduct sick leave from the annual allowance',()=>{const p=emptyHrProfile();p.startDate='2025-10-10';p.leaves=[{id:'sick',start:'2026-10-12',end:'2026-10-14',days:3,type:'sick',status:'approved',note:''}];expect(hrLeaveBalance(p,'2026-10-10').leaveRemaining).toBe(30)})
