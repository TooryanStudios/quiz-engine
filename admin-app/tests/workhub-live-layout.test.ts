import { folderContent, remainingDays, eligiblePeople } from '../apps/workhub/prototype/taskUtils'
import { describe, expect, it } from 'vitest'
import { adaptWorkspaceItems, emptyData, originalPath, type Item } from '../apps/workhub/prototype/data'
import type { WorkhubProject, WorkhubTask, WorkhubDocument, WorkhubMoodBoard, WorkhubWorkspace } from '../src/lib/workhubRepo'

const workspace:WorkhubWorkspace={id:'ws',name:'Real workspace',description:'Original description',type:'technical',createdBy:'admin',accessMemberUids:['user'],taskStatuses:[{id:'custom',label:'Awaiting client',color:'#123456'}]}
const project=(id:string,patch:Partial<WorkhubProject>={}):WorkhubProject=>({id,workspaceId:'ws',name:id,description:'Original project description',color:'#123456',visibility:'workspace',memberUids:[],createdBy:'admin',...patch})
const task=(id:string,parent:string,patch:Partial<WorkhubTask>={}):WorkhubTask=>({id,workspaceId:'ws',projectId:parent,title:'Actual task',description:'Actual description',visibility:'workspace',memberUids:[],status:'custom',priority:'medium',assigneeUid:'user',dueDate:'2026-10-20',createdBy:'admin',...patch})

describe('live layout data and permissions',()=>{
 it('retains real names, descriptions, assignees and configured statuses',()=>{
  const data={...emptyData(),projects:[project('root')],tasks:[task('task','root')]}
  const items=adaptWorkspaceItems(workspace,data,'user',false)
  expect(items.find(i=>i.type==='task')).toMatchObject({title:'Actual task',description:'Actual description',owner:'user',assigned:['user'],status:'Awaiting client',statusColor:'#123456',parent:'root'})
 })
 it('inherits editable status IDs from the closest configured ancestor and preserves folder access',()=>{
  const statuses=[{id:'doing',label:'In progress',color:'#234567'},{id:'done',label:'Done',color:'#345678'}]
  const data={...emptyData(),projects:[project('root',{taskStatuses:statuses,visibility:'restricted',memberUids:['user']}),project('child',{parentProjectId:'root'})],tasks:[task('task','child',{status:'doing'})]}
  const items=adaptWorkspaceItems(workspace,data,'user',false)
  expect(items.find(i=>i.type==='task')).toMatchObject({statusId:'doing',statuses,status:'In progress'})
  expect(items.find(i=>i.entityId==='child')?.statuses).toEqual(statuses)
  expect(items.find(i=>i.entityId==='root')).toMatchObject({visibility:'restricted',memberUids:['user']})
 })
 it('hides a restricted ancestor and its public descendants across entity types',()=>{
  const data={...emptyData(),projects:[project('hidden',{visibility:'restricted'}),project('child',{parentProjectId:'hidden'})],tasks:[task('task','child')],documents:[{id:'doc',projectId:'child',workspaceId:'ws',title:'Hidden document',body:'Private',visibility:'workspace',memberUids:[],createdBy:'admin'} as WorkhubDocument],boards:[{id:'board',workspaceId:'ws',entityType:'task',entityId:'task',title:'Hidden board',visibility:'workspace',memberUids:[],createdBy:'admin'} as WorkhubMoodBoard]}
  expect(adaptWorkspaceItems(workspace,data,'user',false)).toEqual([])
  expect(adaptWorkspaceItems(workspace,data,'user',true)).toHaveLength(5)
 })
 it('honors member-specific full access without granting other users access',()=>{
  const data={...emptyData(),projects:[project('private',{visibility:'restricted'})],tasks:[task('private-task','private',{visibility:'restricted'})]}
  const configured={...workspace,memberAccessLevels:{user:'full' as const}}
  expect(adaptWorkspaceItems(configured,data,'user',false)).toHaveLength(2)
  expect(adaptWorkspaceItems(configured,data,'other',false)).toHaveLength(0)
 })
 it('keeps explicitly restricted tasks hidden inside a visible folder',()=>{
  const data={...emptyData(),projects:[project('root')],tasks:[task('private','root',{visibility:'restricted'}),task('assigned','root',{visibility:'restricted',memberUids:['user']})]}
  expect(adaptWorkspaceItems(workspace,data,'user',false).map(i=>i.entityId)).toEqual(['root','assigned'])
 })
 it('handles cyclic or missing project ancestry without showing orphan content',()=>{
  const data={...emptyData(),projects:[project('a',{parentProjectId:'b'}),project('b',{parentProjectId:'a'}),project('orphan',{parentProjectId:'missing'})],tasks:[task('hidden','orphan')]}
  expect(adaptWorkspaceItems(workspace,data,'user',false)).toEqual([])
 })
 it('generates original editor links with real entity IDs and encoded context',()=>{
  expect(originalPath('space / one',{type:'document',entityId:'doc / one',parent:'project / one'} as Item)).toBe('/workhub/w/space%20%2F%20one/d/doc%20%2F%20one?p=project%20%2F%20one')
  expect(originalPath('ws',{type:'task',entityId:'task',parent:'root'} as Item)).toBe('/workhub/w/ws/t/task?p=root')
 })
})

describe('task editing helpers',()=>{
 it('calculates countdowns by calendar day in Muscat, including overdue dates',()=>{
  const now=new Date('2026-10-08T21:00:00Z')
  expect(remainingDays('2026-10-09',now)).toBe(0)
  expect(remainingDays('2026-10-10',now)).toBe(1)
  expect(remainingDays('2026-10-08',now)).toBe(-1)
  expect(remainingDays('',now)).toBeNull()
  expect(remainingDays('2026-02-30',now)).toBeNull()
 })
 it('limits assignees and notification candidates through restricted ancestors',()=>{
  const data={...emptyData(),projects:[project('private',{visibility:'restricted',memberUids:['user']})],tasks:[task('task','private')]}
  const items=adaptWorkspaceItems({...workspace,accessMemberUids:['user','other']},data,'user',false)
  const people=[{uid:'user',displayName:'User',email:'user@example.com',status:'approved',role:'member'},{uid:'other',displayName:'Other',email:'other@example.com',status:'approved',role:'member'}] as import('../src/lib/workhubRepo').WorkhubMember[]
  expect(eligiblePeople({...workspace,accessMemberUids:['user','other']},items.find(i=>i.type==='task'),items,people).map(p=>p.uid)).toEqual(['user'])
 })
})

describe('folder and assignment regressions',()=>{
 it('keeps empty parents empty instead of filling them with descendant tasks',()=>{
  const data={...emptyData(),projects:[project('parent'),project('child',{parentProjectId:'parent'})],tasks:[task('child-task','child')]}
  const items=adaptWorkspaceItems(workspace,data,'user',false)
  expect(folderContent(items,'parent')).toEqual([])
  expect(folderContent(items,'child').map(i=>i.entityId)).toEqual(['child-task'])
 })
 it('retains multiple distinct assignees and original image attachment metadata',()=>{
  const data={...emptyData(),projects:[project('root')],tasks:[task('task','root',{assigneeUid:'user',assigneeUids:['user','other'],attachments:['https://example.com/image.png'],imageUrls:['https://example.com/image.png'],attachmentTitles:{'https://example.com/image.png':'Original title'}})]}
  expect(adaptWorkspaceItems(workspace,data,'user',false).find(i=>i.type==='task')).toMatchObject({assigned:['user','other'],attachments:['https://example.com/image.png'],imageUrls:['https://example.com/image.png'],attachmentTitles:{'https://example.com/image.png':'Original title'}})
 })
})
