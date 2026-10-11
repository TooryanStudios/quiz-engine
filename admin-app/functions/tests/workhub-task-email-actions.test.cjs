const {test}=require('node:test')
const assert=require('node:assert/strict')
const {parseTaskEmailAction,taskEmailTarget,defaultTaskEmailStatuses}=require('../lib/workhubTaskEmailActions')
test('ordinary replies never silently approve or change status',()=>{
 for(const text of ['approved','Yes, approve this please','WORKHUB APPROVE later','Thanks\nWORKHUB APPROVE','WORKHUB STATUS: completed extra'])assert.deepEqual(parseTaskEmailAction(text),{kind:'comment'})
})
test('only explicit first-line commands request decisions or a configured status',()=>{
 assert.deepEqual(parseTaskEmailAction('WORKHUB APPROVE\nLooks good'),{kind:'approve'})
 assert.deepEqual(parseTaskEmailAction('workhub reject'),{kind:'reject'})
 assert.deepEqual(parseTaskEmailAction('WORKHUB STATUS: in-progress\nStarted today'),{kind:'status',status:'in-progress'})
})
test('a linked task alone is not a task action request',()=>{
 assert.equal(taskEmailTarget('/workhub/w/ws/t/task','ordinary chat'),null)
 assert.deepEqual(taskEmailTarget('/workhub/w/ws/t/task?p=parent','[WORKHUB TASK REQUEST]'),{workspaceId:'ws',taskId:'task'})
 for(const path of ['/messages','https://other.test/workhub/w/ws/t/task','/workhub/w/ws/p/project','/workhub/w/%zz/t/task'])assert.equal(taskEmailTarget(path,'[WORKHUB TASK REQUEST]'),null)
})

test('legacy workspaces accept only their actual default workflow IDs',()=>{
 assert.deepEqual(defaultTaskEmailStatuses('technical').map(s=>s.id),['backlog','open','in_progress','review','completed','canceled'])
 assert.equal(defaultTaskEmailStatuses('finance').some(s=>s.id==='paid'),true)
 assert.equal(defaultTaskEmailStatuses('finance').some(s=>s.id==='completed'),false)
 assert.equal(defaultTaskEmailStatuses('hr').some(s=>s.id==='onboarded'),true)
})
