import {describe,it,expect} from 'vitest'
import {myWorkTasks,workTimestamp} from '../apps/workhub/prototype/myWorkTasks'
import type {Item} from '../apps/workhub/prototype/data'
const now=Date.parse('2026-10-10T08:00:00Z')
const task=(id:string,patch:Partial<Item>={}):Item=>({id,entityId:id,type:'task',title:id,workspace:'one',parent:'',status:'Open',statusId:'open',owner:'owner',due:'',description:'',attachments:[],assigned:['me'],lastActivityAt:now-86400000,...patch})
describe('My Work morning defaults',()=>{
 it('shows only assigned actionable work even when workspaces use different status names',()=>{
  const items=[task('review',{statusId:'awaiting-review'}),task('other',{assigned:['other']}),task('done',{statusId:'done'}),task('cancelled',{statusId:'cancelled'}),task('custom-done',{workspace:'two',statusId:'shipped',statuses:[{id:'shipped',label:'Shipped',color:'#fff',icon:'check'}]})]
  expect(myWorkTasks(items,'me','open','recent',now).map(i=>i.id)).toEqual(['review'])
  expect(myWorkTasks(items,'me','completed','recent',now).map(i=>i.id)).toEqual(['done','custom-done'])
 })
 it('limits old work by default while keeping nearby deadlines and undated legacy tasks discoverable',()=>{
  const old=now-90*86400000,items=[task('old',{lastActivityAt:old}),task('recent'),task('due-soon',{lastActivityAt:old,due:'2026-10-15'}),task('legacy',{lastActivityAt:0})]
  expect(myWorkTasks(items,'me','open','recent',now).map(i=>i.id)).not.toContain('old')
  expect(myWorkTasks(items,'me','open','recent',now).map(i=>i.id)).toEqual(expect.arrayContaining(['recent','due-soon','legacy']))
  expect(myWorkTasks(items,'me','all','all',now)).toHaveLength(4)
 })
 it('prioritizes urgent work and filters overdue tasks without completed items',()=>{
  const items=[task('normal'),task('urgent',{priority:'urgent'}),task('overdue',{due:'2026-10-08'}),task('old-completed',{due:'2026-10-08',statusId:'done'})]
  expect(myWorkTasks(items,'me','open','recent',now)[0].id).toBe('urgent')
  expect(myWorkTasks(items,'me','overdue','all',now).map(i=>i.id)).toEqual(['overdue'])
 })
 it('reads database timestamps without losing task activity dates',()=>{expect(workTimestamp({seconds:123})).toBe(123000);expect(workTimestamp({toMillis:()=>456})).toBe(456);expect(workTimestamp('invalid')).toBe(0)})
})
