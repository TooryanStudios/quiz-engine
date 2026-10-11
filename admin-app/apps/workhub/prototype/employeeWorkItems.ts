import type {Item} from './data'
import {completedWork,finishedWork} from './myWorkTasks'
export function employeeWorkItems(items:Item[],uid:string,status:string,period:string,now:number){
 const local=new Date(now+4*3600000);const day=local.getUTCDay();const monday=Date.UTC(local.getUTCFullYear(),local.getUTCMonth(),local.getUTCDate()-((day+6)%7))-4*3600000
 const start=period==='week'?monday:period==='lastWeek'?monday-7*86400000:now-30*86400000,end=period==='lastWeek'?monday:now
 return items.filter(i=>i.type==='task'&&!!uid&&i.assigned.includes(uid)&&(status==='all'||(status==='completed'?completedWork(i):status==='progress'?!finishedWork(i)&&/progress|doing|working/i.test(i.statusId||i.status):!finishedWork(i)))&&(period==='all'||!!i.lastActivityAt&&i.lastActivityAt>=start&&(period==='lastWeek'?i.lastActivityAt<end:i.lastActivityAt<=end))).sort((a,b)=>(b.lastActivityAt||0)-(a.lastActivityAt||0))
}
