import type {Item} from './data'
export function workTimestamp(value:unknown):number{
 if(!value)return 0
 if(value instanceof Date)return value.getTime()
 if(typeof value==='string'){const n=Date.parse(value);return Number.isFinite(n)?n:0}
 if(typeof value==='number')return value
 if(typeof value==='object'){const v=value as {toMillis?:()=>number;seconds?:number};if(typeof v.toMillis==='function')return v.toMillis();if(typeof v.seconds==='number')return v.seconds*1000}
 return 0
}
export function completedWork(item:Item){
 const status=(item.statusId||'').toLowerCase().replace(/[\s-]+/g,'_')
 if(['cancelled','canceled','archived','rejected'].includes(status))return false
 return ['completed','complete','done','closed'].includes(status)||item.statuses?.find(s=>s.id===item.statusId)?.icon==='check'
}
export function finishedWork(item:Item){
 return completedWork(item)||['cancelled','canceled','archived','rejected'].includes((item.statusId||'').toLowerCase())
}
export function recentWork(item:Item,now:number){
 const cutoff=now-30*86400000,due=Date.parse(item.due+'T23:59:59+04:00')
 return (!!item.lastActivityAt&&item.lastActivityAt>=cutoff)|| (Number.isFinite(due)&&due>=cutoff&&due<=now+30*86400000)||(!item.lastActivityAt&&!item.due)
}
export function myWorkTasks(items:Item[],uid:string,status:string,period:string,now:number){
 return items.filter(i=>i.type==='task'&&i.assigned.includes(uid)&&
 (status==='all'||(status==='completed'?completedWork(i):status==='progress'?!finishedWork(i)&&/progress/i.test(i.statusId||''):status==='today'?!finishedWork(i)&&i.due===new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Muscat',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now)):status==='overdue'?!finishedWork(i)&&!!i.due&&Date.parse(i.due+'T23:59:59+04:00')<now:!finishedWork(i)))&&
 (period==='all'||recentWork(i,now))).sort((a,b)=>{
 const priority={urgent:0,high:1,medium:2,low:3};const p=(priority[a.priority||'medium']-priority[b.priority||'medium']);return p||(a.due||'9999').localeCompare(b.due||'9999')||(b.lastActivityAt||0)-(a.lastActivityAt||0)
 })
}
