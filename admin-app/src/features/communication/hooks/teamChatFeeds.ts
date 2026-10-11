import {collection,query,where,orderBy,limit,onSnapshot,type QueryConstraint} from 'firebase/firestore'
import {db} from '../../../lib/firebase'
import type {WorkhubActivity} from '../../../lib/workhubRepo'

export type ChatFeed={kind:'recent'|'thread'|'groups'|'typing';thread?:string;count?:number}
export function chatFeedKey(uid:string,feed:ChatFeed){return [uid,feed.kind,feed.thread||'',feed.count||0].join(':')}
type FeedState={rows:WorkhubActivity[];ready:boolean;error?:string;listeners:Set<(rows:WorkhubActivity[],error?:string)=>void>;stop:()=>void;timer?:ReturnType<typeof setTimeout>}
const cache=new Map<string,FeedState>()
let account=''
function forAccount(uid:string){if(account!==uid){for(const entry of cache.values()){clearTimeout(entry.timer);entry.stop()}cache.clear();account=uid}}
export function cachedChatFeed(uid:string,feed:ChatFeed){return account===uid?cache.get(chatFeedKey(uid,feed)):undefined}

/** Bounded, permission-scoped feeds. A conversation never downloads all chat history. */
export function subscribeChatFeed(uid:string,feed:ChatFeed,onData:(rows:WorkhubActivity[],error?:string)=>void){
 forAccount(uid)
 const key=chatFeedKey(uid,feed),cached=cache.get(key)
 if(cached){clearTimeout(cached.timer);cached.listeners.add(onData);if(cached.ready)onData(cached.rows,cached.error);return()=>release(key,onData)}
 const state:FeedState={rows:[],ready:false,listeners:new Set([onData]),stop:()=>{}}
 cache.set(key,state)
 const rows:WorkhubActivity[][]=[[],[]],ready=[false,false],errors=['','']
 const stops=['workspace','restricted'].map((visibility,index)=>{
  const constraints:QueryConstraint[]=[where('workspaceId','==','__communication_global__'),where('visibility','==',visibility)]
  if(visibility==='restricted')constraints.push(where('memberUids','array-contains',uid))
  if(feed.thread)constraints.push(where('threadId','==',feed.thread))
  if(feed.kind==='groups')constraints.push(where('action','in',['chat_group_upsert','chat_group_delete']))
  else {constraints.push(feed.kind==='typing'?where('action','in',['chat_typing','chat_typing_stop']):where('action','==','chat_message'));constraints.push(orderBy('createdAt','desc'),limit(feed.count||40))}
  const emit=()=>{if(!ready.every(Boolean))return;state.ready=true;state.rows=[...new Map(rows.flat().map(row=>[row.id,row])).values()];state.error=errors.find(Boolean);state.listeners.forEach(listener=>listener(state.rows,state.error))}
  return onSnapshot(query(collection(db,'workhub_activity'),...constraints),snap=>{rows[index]=snap.docs.map(d=>({...d.data(),id:d.id} as WorkhubActivity));ready[index]=true;errors[index]='';emit()},error=>{ready[index]=true;errors[index]=error.code;emit()})
 })
 state.stop=()=>stops.forEach(stop=>stop())
 return()=>release(key,onData)
}
function release(key:string,listener:(rows:WorkhubActivity[],error?:string)=>void){
 const state=cache.get(key);if(!state)return;state.listeners.delete(listener)
 // Avoid tearing down and reloading when opening/closing the same chat panel.
 if(!state.listeners.size)state.timer=setTimeout(()=>{state.stop();cache.delete(key)},30000)
}
