import {beforeEach,describe,expect,it,vi} from 'vitest'

const mocks=vi.hoisted(()=>({update:vi.fn(),add:vi.fn(),transaction:vi.fn()}))
vi.mock('../src/lib/firebase',()=>({db:{},functions:{}}))
vi.mock('firebase/firestore',async()=>({
 ...await vi.importActual<typeof import('firebase/firestore')>('firebase/firestore'),
 collection:(_db:unknown,name:string)=>name,
 doc:(_db:unknown,name:string,id?:string)=>({collection:name,id:id||'generated'}),
 updateDoc:mocks.update,addDoc:mocks.add,runTransaction:mocks.transaction,
 serverTimestamp:()=>({timestamp:true}),
}))
import {updateWorkhubDocument,updateWorkhubDocumentWithOptimisticConcurrency,updateWorkhubMoodBoardFiles,saveWorkhubChatGroup} from '../src/lib/workhubRepo'

describe('gap persistence regressions',()=>{
 beforeEach(()=>vi.clearAllMocks())
 it('saves attachment titles together with document attachment references',async()=>{
  await updateWorkhubDocument('document',{attachments:['https://files.test/report.pdf'],attachmentTitles:{'https://files.test/report.pdf':'Annual report'}})
  expect(mocks.update.mock.calls[0][1]).toMatchObject({attachmentTitles:{'https://files.test/report.pdf':'Annual report'}})
 })
 it('rejects stale editor saves rather than overwriting someone else’s revision',async()=>{
  mocks.transaction.mockImplementation(async(_db,callback)=>callback({get:async()=>({exists:()=>true,data:()=>({updatedAt:{toMillis:()=>200}})}),update:mocks.update}))
  await expect(updateWorkhubDocumentWithOptimisticConcurrency('document',{body:'older edit'},100)).rejects.toThrow()
  expect(mocks.update).not.toHaveBeenCalled()
 })
 it('renames/removes board files without losing surviving canvas positions or connections',async()=>{
  const current={panelVariant:'flow',flowNodes:[{id:'a',type:'imageNode',position:{x:80,y:90},data:{imageUrl:'https://files.test/a.png',label:'Old'}},{id:'b',type:'imageNode',position:{x:1,y:2},data:{imageUrl:'https://files.test/b.png'}},{id:'text',type:'textNode',position:{x:5,y:6},data:{text:'Keep'}}],flowEdges:[{id:'keep',source:'a',target:'text',animated:true,type:'smoothstep'},{id:'remove',source:'b',target:'text'}]}
  mocks.transaction.mockImplementation(async(_db,callback)=>callback({get:async()=>({exists:()=>true,data:()=>current}),update:mocks.update}))
  await updateWorkhubMoodBoardFiles('board',[{id:'a',url:'https://files.test/a.png',label:'New',addedBy:'user'}])
  const saved=mocks.update.mock.calls[0][1]
  expect(saved.flowNodes).toHaveLength(2)
  expect(saved.flowNodes[0]).toMatchObject({position:{x:80,y:90},data:{label:'New'}})
  expect(saved.flowNodes[1].data.text).toBe('Keep')
  expect(saved.flowEdges).toEqual([current.flowEdges[0]])
 })
 it('delivers membership updates to removed members without adding them back to the group',async()=>{
  await saveWorkhubChatGroup('global','owner',{id:'g',name:'Group',memberUids:['owner','new']},{id:'g',name:'Group',memberUids:['owner','removed']})
  const activity=mocks.add.mock.calls[0][1]
  expect(activity.memberUids).toEqual(['owner','new','removed'])
  expect(JSON.parse(activity.message).memberUids).toEqual(['owner','new'])
  expect(activity.visibility).toBe('restricted')
 })
})
