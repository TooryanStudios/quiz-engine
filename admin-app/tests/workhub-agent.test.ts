import { describe, expect, it } from 'vitest'
import { validatePlan, normalizePlan } from '../apps/workhub/prototype/agentActions'
import type { Item } from '../apps/workhub/prototype/data'
const items=[{type:'project',entityId:'p1',statuses:[{id:'todo',label:'To do',color:'#aaa'}]}] as Item[]
describe('Assistant action validation',()=>{
 it('accepts known targets',()=>expect(validatePlan({message:'Ready',actions:[{kind:'create_task',projectId:'p1',title:'Review',status:'todo'}]},items).actions).toHaveLength(1))
 it('rejects unknown targets',()=>expect(()=>validatePlan({message:'',actions:[{kind:'create_task',projectId:'missing',title:'Review',status:'todo'}]},items)).toThrow())
 it('rejects destructive actions',()=>expect(()=>validatePlan({message:'',actions:[{kind:'delete_task',projectId:'p1'}]},items)).toThrow())
})

it('supports a root folder followed by dependent tasks',()=>{
 const root={...items[0],entityId:'root:w1'} as Item
 expect(validatePlan({message:'Ready',actions:[{kind:'create_folder',projectId:'root:w1',ref:'new:one',title:'Story'},{kind:'create_task',projectId:'new:one',title:'Outline',status:'todo'}]},[root]).actions).toHaveLength(2)
})
it('rejects tasks directly at workspace root',()=>expect(()=>validatePlan({message:'',actions:[{kind:'create_task',projectId:'root:w1',title:'Outline',status:'todo'}]},[{...items[0],entityId:'root:w1'} as Item])).toThrow())

it('resolves workspace IDs and new folder names and orders dependencies',()=>{
 const root={...items[0],entityId:'root:w1',title:'Workspace'} as Item
 const plan=normalizePlan({message:'Ready',actions:[{kind:'create_task',projectId:'Story',title:'Outline',status:'To do'},{kind:'create_folder',projectId:'w1',title:'Story'}]},[root],'','w1')
 expect(plan.actions[0].kind).toBe('create_folder')
 expect(plan.actions[0].projectId).toBe('root:w1')
 expect(plan.actions[1].projectId).toBe(plan.actions[0].ref)
 expect(plan.actions[1].status).toBe('todo')
})
