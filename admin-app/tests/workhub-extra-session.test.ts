import {describe,it,expect} from 'vitest'
import {canStartExtraWork,EXTRA_HOURS_ENABLED} from '../functions/src/workhubHrAttendance'
describe('extra-work eligibility',()=>{
 it('requires a completed regular shift',()=>{
  expect(canStartExtraWork(undefined,[])).toBe(false)
  expect(canStartExtraWork({clockIn:1},[])).toBe(false)
  expect(canStartExtraWork({clockIn:1,clockOut:null},[])).toBe(false)
  expect(canStartExtraWork({clockIn:1,clockOut:2},[])).toBe(EXTRA_HOURS_ENABLED)
 })
 it('blocks another open shift, including one from a previous day',()=>{
  expect(canStartExtraWork({clockIn:1,clockOut:2},[{clockIn:3}])).toBe(false)
 })
 it('does not treat a recorded off-day as an open shift',()=>{
  expect(canStartExtraWork({clockIn:1,clockOut:2},[{clockIn:null}])).toBe(EXTRA_HOURS_ENABLED)
 })
})
