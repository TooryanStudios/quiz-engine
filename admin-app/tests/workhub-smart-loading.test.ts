import {describe,it,expect} from 'vitest'
import {workhubLoadPlan,type LoadFilter} from '../apps/workhub/prototype/workhubLoadPlan'
import {adaptWorkspaceItems} from '../apps/workhub/prototype/data'
import type {WorkhubWorkspace} from '../src/lib/workhubRepo'

const workspaces=Array.from({length:12},(_,i)=>({id:'ws'+i,name:'Workspace '+i,type:'general',createdBy:'owner'} as WorkhubWorkspace))
const plan=(page:string,extra={})=>workhubLoadPlan({page,...extra},workspaces,'me',true)
describe('screen-scoped WorkHub loading',()=>{
 it('does not start entity queries without an account or accessible workspace',()=>{
  expect(workhubLoadPlan({page:'home'},[],'me',false)).toEqual([])
  expect(workhubLoadPlan({page:'home'},workspaces,'',false)).toEqual([])
 })
 it('loads assigned tasks and folder metadata at startup without a workspace-wide content sweep',()=>{
  const feeds=plan('home')
  expect(feeds).toHaveLength(3)
  expect(feeds.filter(f=>f.key==='tasks').every(f=>f.assignedOnly&&f.filters.some(([field,,uid])=>field.startsWith('assignee')&&uid==='me'))).toBe(true)
  expect(feeds.some(f=>['documents','boards'].includes(f.key))).toBe(false)
 })
 it('reuses the same task queries between Overview and My Work',()=>expect(plan('myWork')).toEqual(plan('home')))
 it('loads no workspace contents for the workspace directory',()=>expect(plan('workspaces')).toEqual([]))
 it('only loads the opened workspace',()=>{
  const feeds=plan('workspaces',{workspaceId:'ws2'})
  expect(feeds).toHaveLength(4)
  expect(feeds.every(f=>f.filters.some(([field,,id])=>field==='workspaceId'&&id==='ws2'))).toBe(true)
  expect(plan('workspaces',{workspaceId:'ws2',selectedId:'task:opened'})).toEqual(feeds)
 })
 it('defers task, document and board loading on Notes and Inbox',()=>{
  for(const page of ['myNotes','inbox'])expect(plan(page).every(f=>f.key==='projects')).toBe(true)
 })
 it('can fetch an unopened task from a direct link',()=>{
  expect(plan('myWork',{selectedId:'task:unopened'})).toContainEqual(expect.objectContaining({documentId:'unopened',collection:'workhub_tasks'}))
 })
 it('loads linked implementation workspaces only if the user can access them',()=>{
  const feeds=workhubLoadPlan({page:'workspaces',workspaceId:'ws0'},workspaces,'me',true,['ws2','inaccessible'])
  const ids=new Set(feeds.flatMap(f=>f.filters.filter(([key])=>key==='workspaceId').map(f=>f[2])))
  expect([...ids]).toEqual(['ws0','ws2'])
 })
 it('keeps legacy and multiple assignees while excluding unassigned, inaccessible and other-workspace data',()=>{
  const ws={...workspaces[0],taskStatuses:[{id:'to-do',label:'To do',color:'#999'}]}
  const feeds=workhubLoadPlan({page:'myWork'},[ws],'me',false)
  const matches=(row:any,filters:LoadFilter[])=>filters.every(([key,op,value])=>op==='array-contains'?row[key]?.includes(value):op==='!='?row[key]!==value:row[key]===value)
  const projects=[{id:'root',name:'Root',workspaceId:'ws0',visibility:'workspace',createdBy:'owner'},{id:'private',name:'Private',workspaceId:'ws0',visibility:'restricted',createdBy:'someone',memberUids:[]}]
  const base={workspaceId:'ws0',projectId:'root',title:'Task',createdBy:'owner',visibility:'workspace',status:'to-do'}
  const tasks=[{...base,id:'legacy',assigneeUid:'me'},{...base,id:'multiple',assigneeUid:'someone',assigneeUids:['me']},{...base,id:'shared',visibility:'restricted',memberUids:['me'],assigneeUid:'me'},{...base,id:'unassigned',assigneeUid:'someone'},{...base,id:'private',visibility:'restricted',assigneeUid:'me'},{...base,id:'hidden-parent',projectId:'private',assigneeUid:'me'}]
  const read=(key:'tasks'|'projects',rows:any[])=>[...new Map(feeds.filter(f=>f.key===key).flatMap(f=>rows.filter(row=>matches(row,f.filters)&&(!f.assignedOnly||row.assigneeUid==='me'||row.assigneeUids?.includes('me')))).map(row=>[row.id,row])).values()]
  const items=adaptWorkspaceItems(ws,{projects:read('projects',projects),tasks:read('tasks',tasks),documents:[],boards:[]},'me',false)
  expect(items.filter(i=>i.type==='task').map(i=>i.entityId).sort()).toEqual(['legacy','multiple','shared'])
  // Index fallback must stay within the same permission boundary.
  expect(feeds.filter(f=>f.key==='tasks'&&f.fallback).every(f=>f.fallback!.some(([key])=>key==='visibility'||key==='createdBy'))).toBe(true)
 })
})
