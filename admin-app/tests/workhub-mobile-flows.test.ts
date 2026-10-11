import {describe,it,expect} from 'vitest'
import {phoneViewport} from '../apps/workhub/prototype/phoneViewport'
import {inboxGroups,inboxGroupSize} from '../apps/workhub/prototype/inboxGroups'
import {extraFinishTime} from '../functions/src/workhubHrAttendance'
import type {WorkhubNotification} from '../src/lib/workhubRepo'

describe('phone keyboard layout',()=>{
 it('tracks a panned visual viewport without moving navigation above the keyboard',()=>{
  expect(phoneViewport(844,510,96,1,true)).toEqual({height:510,top:96,keyboard:true})
  expect(phoneViewport(844,844,0,1,false)).toEqual({height:844,top:0,keyboard:false})
 })
 it('does not mistake browser chrome or pinch zoom for a keyboard',()=>{
  expect(phoneViewport(844,790,0,1,true).keyboard).toBe(false)
  expect(phoneViewport(844,422,0,2,true).keyboard).toBe(false)
  expect(phoneViewport(844,500,0,1,false).keyboard).toBe(false)
 })
})
describe('inbox group previews',()=>{
 const row=(id:string,workspaceId:string,threadId?:string)=>({id,workspaceId,threadId} as WorkhubNotification)
 it('keeps six-item previews separate for each workspace',()=>{
  const groups=inboxGroups([...Array.from({length:12},(_,i)=>row(String(i),'animation')),row('other','plans')])
  expect(groups.map(g=>g.items.slice(0,inboxGroupSize).length)).toEqual([6,1])
  expect(groups[0].items.slice(0,6).map(n=>n.id)).toEqual(['0','1','2','3','4','5'])
 })
 it('separates conversations even in the shared chat workspace',()=>{
  const groups=inboxGroups([row('a','__communication_global__','u|v'),row('b','__communication_global__','u|w'),row('c','__communication_global__','u|v')])
  expect(groups.map(g=>g.items.map(n=>n.id))).toEqual([['a','c'],['b']])
 })
})
describe('single-request extra-hours completion',()=>{
 const start=new Date('2026-10-12T14:00:00Z'),now=new Date('2026-10-12T16:00:00Z')
 it('retains the finish moment while the employee describes accomplishments',()=>{
  expect(extraFinishTime(start,Date.parse('2026-10-12T15:55:00Z'),now).toISOString()).toBe('2026-10-12T15:55:00.000Z')
 })
 it('uses server time for missing, future, expired or invalid captures',()=>{
  for(const value of [undefined,NaN,now.getTime()+60000,start.getTime()-1000,now.getTime()-3600000])expect(extraFinishTime(start,value,now)).toEqual(now)
 })
 it('clamps minor device clock drift to server time',()=>{
  expect(extraFinishTime(start,now.getTime()+3000,now)).toEqual(now)
 })
})
