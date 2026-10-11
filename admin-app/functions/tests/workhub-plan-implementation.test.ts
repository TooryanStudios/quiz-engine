import {beforeEach,describe,it,expect,vi} from 'vitest'
const state=vi.hoisted(()=>({data:{} as Record<string,any>,writes:[] as any[]}))
vi.mock('firebase-functions/v2/https',()=>({onCall:(_:unknown,handler:unknown)=>handler,HttpsError:class extends Error{constructor(public code:string,message:string){super(message)}}}))
vi.mock('firebase-admin',()=>{
 const doc=(path:string)=>({path})
 const snapshot=(path:string)=>({id:path.split('/').at(-1),ref:doc(path),data:()=>state.data[path]})
 const db={doc,collection:(name:string)=>({where:(key:string,_:string,value:string)=>({name,key,value})}),runTransaction:async(fn:any)=>{const pending:any[]=[];const result=await fn({get:async(ref:any)=>ref.path?snapshot(ref.path):{docs:Object.keys(state.data).filter(path=>path.startsWith(ref.name+'/')&&state.data[path][ref.key]===ref.value).map(snapshot)},update:(ref:any,patch:any)=>pending.push(['update',ref.path,patch]),delete:(ref:any)=>pending.push(['delete',ref.path])});state.writes=pending;return result}}
 return {firestore:Object.assign(()=>db,{FieldValue:{serverTimestamp:()=>123}})}
})
import {workhubProjectAction} from '../src/workhubProjectActions'
const invoke=(data:any,uid='admin')=>(workhubProjectAction as any)({auth:{uid,token:{}},data})
beforeEach(()=>{state.writes=[];state.data={
 'workhub_members/admin':{status:'approved',role:'admin'},
 'workhub_members/member':{status:'approved',role:'member'},
 'workhub_workspaces/plans':{visibility:'workspace',taskStatuses:[{id:'custom',label:'Draft'}]},
 'workhub_workspaces/dest':{visibility:'workspace'},
 'workhub_projects/plan':{workspaceId:'plans',parentProjectId:null,createdBy:'owner',visibility:'workspace',valueAmount:1234,planSettings:{ownerUids:['owner'],requirements:'Equipment'}},
 'workhub_projects/child':{workspaceId:'plans',parentProjectId:'plan',visibility:'workspace'},
 'workhub_projects/folder':{workspaceId:'dest',visibility:'workspace'},
 'workhub_tasks/task':{workspaceId:'plans',projectId:'child',status:'custom',assigneeUids:['owner']},
 'workhub_documents/doc':{workspaceId:'plans',projectId:'plan'},
 'workhub_task_comments/comment':{workspaceId:'plans',entityId:'task'},
 'workhub_tasks/unrelated':{workspaceId:'plans',projectId:'another'}
}})
describe('plan implementation',()=>{
 it('moves a complete subtree atomically, preserving IDs, budget, ownership and source tracking',async()=>{
  await invoke({action:'implement',projectId:'plan',workspaceId:'dest',parentProjectId:'folder'})
  const root=state.writes.find(w=>w[1]==='workhub_projects/plan')[2]
  expect(root.workspaceId).toBe('dest');expect(root.parentProjectId).toBe('folder')
  expect(root.planSettings).toMatchObject({ownerUids:['owner'],requirements:'Equipment',state:'active',sourceWorkspaceId:'plans',sourceParentProjectId:''})
  expect(root.taskStatuses[0].id).toBe('custom');expect(root).not.toHaveProperty('valueAmount')
  expect(state.writes.find(w=>w[1]==='workhub_tasks/task')[2]).toEqual({workspaceId:'dest',updatedAt:123})
  expect(state.writes.some(w=>w[1]==='workhub_task_comments/comment')).toBe(true)
  expect(state.writes.some(w=>w[1]==='workhub_tasks/unrelated')).toBe(false)
 })
 it('rejects unauthorized users and invalid destinations without changes',async()=>{
  await expect(invoke({action:'implement',projectId:'plan',workspaceId:'dest'},'member')).rejects.toThrow('creator')
  await expect(invoke({action:'implement',projectId:'plan',workspaceId:'plans'})).rejects.toThrow('another workspace')
  expect(state.writes).toEqual([])
 })
 it('rejects repeat implementation',async()=>{
  state.data['workhub_projects/plan'].planSettings.sourceWorkspaceId='original'
  await expect(invoke({action:'implement',projectId:'plan',workspaceId:'dest'})).rejects.toThrow('already been implemented')
  expect(state.writes).toEqual([])
 })
 it('deletes the subtree and related records, leaving unrelated items',async()=>{
  await invoke({action:'delete',projectId:'plan'})
  expect(state.writes).toHaveLength(5);expect(state.writes.every(w=>w[0]==='delete')).toBe(true)
  expect(state.writes.some(w=>w[1]==='workhub_projects/folder')).toBe(false)
 })
})
