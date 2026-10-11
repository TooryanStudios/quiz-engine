import {beforeEach,describe,expect,it,vi} from 'vitest'
const fake=vi.hoisted(()=>({listeners:[] as {constraints:any[];next:(value:any)=>void;fail:(error:any)=>void;stop:ReturnType<typeof vi.fn>}[]}))
vi.mock('../src/lib/firebase',()=>({db:{}}))
vi.mock('firebase/firestore',()=>({
 collection:(_db:unknown,name:string)=>name,
 where:(field:string,op:string,value:unknown)=>({field,op,value}),
 orderBy:(field:string,direction:string)=>({order:field,direction}),
 limit:(value:number)=>({limit:value}),
 query:(collection:unknown,...constraints:unknown[])=>constraints,
 onSnapshot:(constraints:any[],next:any,fail:any)=>{const stop=vi.fn();fake.listeners.push({constraints,next,fail,stop});return stop},
}))
import {subscribeChatFeed} from '../src/features/communication/hooks/teamChatFeeds'
let account=0
const snap=(id:string)=>({docs:[{id,data:()=>({action:'chat_message'})}]})
beforeEach(()=>{fake.listeners=[];account++})
describe('bounded chat subscriptions',()=>{
 it('waits for both permission-scoped feeds before displaying the directory',()=>{
  const result=vi.fn(),stop=subscribeChatFeed('u'+account,{kind:'recent',count:120},result)
  fake.listeners[0].next(snap('broadcast'));expect(result).not.toHaveBeenCalled()
  fake.listeners[1].next(snap('private'));expect(result.mock.calls[0][0].map((row:any)=>row.id)).toEqual(['broadcast','private'])
  expect(fake.listeners.every(l=>l.constraints.some(c=>c.limit===120))).toBe(true)
  expect(fake.listeners[1].constraints).toContainEqual({field:'memberUids',op:'array-contains',value:'u'+account})
  stop()
 })
 it('requests only the selected conversation and reuses the active subscription',()=>{
  const feed={kind:'thread' as const,thread:'u|v',count:40},stop=subscribeChatFeed('u'+account,feed,vi.fn())
  fake.listeners.forEach(l=>l.next(snap('message')))
  const again=vi.fn(),stopAgain=subscribeChatFeed('u'+account,feed,again)
  expect(fake.listeners).toHaveLength(2)
  expect(fake.listeners.every(l=>l.constraints.some(c=>c.field==='threadId'&&c.value==='u|v'))).toBe(true)
  expect(again.mock.calls[0][0]).toHaveLength(1)
  stop();stopAgain()
 })
 it('preserves query errors and clears cached subscriptions across accounts',()=>{
  subscribeChatFeed('u'+account,{kind:'recent',count:120},vi.fn())
  fake.listeners[0].next(snap('public'));fake.listeners[1].fail({code:'permission-denied'})
  const again=vi.fn();subscribeChatFeed('u'+account,{kind:'recent',count:120},again)
  expect(again.mock.calls[0][1]).toBe('permission-denied')
  subscribeChatFeed('different'+account,{kind:'recent',count:120},vi.fn())
  expect(fake.listeners[0].stop).toHaveBeenCalled();expect(fake.listeners[1].stop).toHaveBeenCalled()
 })
})
