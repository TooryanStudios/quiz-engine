import {describe,it,expect} from 'vitest'
import {employeeWorkItems} from '../apps/workhub/prototype/employeeWorkItems'
import type {Item} from '../apps/workhub/prototype/data'
const now=Date.parse('2026-10-10T12:00:00+04:00')
const task=(id:string,statusId:string,date:string,uid='employee')=>({id,type:'task',assigned:[uid],statusId,status:statusId,lastActivityAt:Date.parse(date),statuses:[]} as Item)
describe('employee assigned work',()=>{
 it('excludes other employees and terminal statuses from outstanding work',()=>{const items=[task('a','open','2026-10-09'),task('b','done','2026-10-09'),task('c','canceled','2026-10-09'),task('d','open','2026-10-09','other')];expect(employeeWorkItems(items,'employee','open','30',now).map(i=>i.id)).toEqual(['a'])})
 it('uses the Oman Monday boundary for this week and last week',()=>{const items=[task('last','open','2026-10-04T23:59:59+04:00'),task('current','open','2026-10-05T00:00:00+04:00')];expect(employeeWorkItems(items,'employee','all','week',now).map(i=>i.id)).toEqual(['current']);expect(employeeWorkItems(items,'employee','all','lastWeek',now).map(i=>i.id)).toEqual(['last'])})
 it('supports custom completed statuses and all-time access',()=>{const old=task('old','approved','2026-01-01');old.statuses=[{id:'approved',label:'Approved',color:'#000',icon:'check'}];expect(employeeWorkItems([old],'employee','completed','all',now)).toHaveLength(1);expect(employeeWorkItems([old],'employee','completed','30',now)).toHaveLength(0);expect(employeeWorkItems([old],'','all','all',now)).toHaveLength(0)})
})
