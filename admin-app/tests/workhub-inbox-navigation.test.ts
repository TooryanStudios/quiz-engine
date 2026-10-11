import {describe,expect,it} from 'vitest'
import {notificationItem,notificationRoute} from '../apps/workhub/prototype/inboxNavigation'
import type {Item} from '../apps/workhub/prototype/data'
import type {WorkhubNotification} from '../src/lib/workhubRepo'
const items=[{id:'task:task1',entityId:'task1',workspace:'ws',type:'task'},{id:'document:doc1',entityId:'doc1',workspace:'ws',type:'document'},{id:'task:task2',entityId:'task2',workspace:'other',type:'task'}] as Item[]
const notification=(fields:Partial<WorkhubNotification>)=>({workspaceId:'ws',entityType:'task',entityId:'task1',...fields} as WorkhubNotification)
describe('inbox item resolution',()=>{
 it('resolves a task within its workspace',()=>expect(notificationItem(notification({}),items)?.id).toBe('task:task1'))
 it('resolves document discussions without treating every comment as a task',()=>expect(notificationItem(notification({entityType:'comment',entityId:'doc1'}),items)?.id).toBe('document:doc1'))
 it('resolves comments linking to the original document route',()=>expect(notificationItem(notification({entityType:'comment',entityId:'comment1',targetPath:'/workhub/w/ws/d/doc1?p=folder'}),items)?.id).toBe('document:doc1'))
 it('resolves new interface links',()=>expect(notificationItem(notification({entityType:'comment',entityId:'comment1',targetPath:'/workhub/next?view=workspaces&item=document%3Adoc1'}),items)?.id).toBe('document:doc1'))
 it('does not resolve inaccessible or other-workspace items',()=>expect(notificationItem(notification({entityId:'task2'}),items)).toBeUndefined())
 it('navigates to an unloaded task without requiring its contents',()=>expect(notificationRoute(notification({projectId:'folder'}))).toEqual({workspace:'ws',project:'folder',item:'task:task1'}))
 it('navigates an unloaded document discussion using its original route',()=>expect(notificationRoute(notification({entityType:'comment',entityId:'comment',targetPath:'/workhub/w/ws/d/doc1?p=folder'}))).toEqual({workspace:'ws',project:'folder',item:'document:doc1'}))
 it('resolves current interface notification links before data has loaded',()=>expect(notificationRoute(notification({entityType:'comment',entityId:'comment',targetPath:'/workhub/next?item=task%3Atask1&project=folder'}))).toEqual({workspace:'ws',project:'folder',item:'task:task1'}))
 it('does not interpret unrelated links, other workspaces or chat as item routes',()=>{
  expect(notificationRoute(notification({entityType:'comment',targetPath:'/workhub/w/other/t/task2'}))).toBeUndefined()
  expect(notificationRoute(notification({entityType:'comment',targetPath:'/unrelated?item=task%3Atask1'}))).toBeUndefined()
  expect(notificationRoute(notification({threadId:'everyone'}))).toBeUndefined()
 })
})
