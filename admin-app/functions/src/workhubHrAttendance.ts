export function omanWorkday(now:Date){
 const local=new Date(now.getTime()+4*3600000),date=local.toISOString().slice(0,10)
 const minutes=local.getUTCHours()*60+local.getUTCMinutes()
 return {date,lateMinutes:Math.max(0,minutes-480)}
}
export function workdayDuration(start:Date,end:Date,date:string){
 const workedMinutes=Math.max(0,Math.floor((end.getTime()-start.getTime())/60000))
 const overtimeMinutes=Math.max(0,Math.floor((end.getTime()-Math.max(start.getTime(),Date.parse(date+'T17:00:00+04:00')))/60000))
 return {workedMinutes,overtimeMinutes}
}

export function approvedLeaveOn(leaves:{start:string;end:string;status:string;type:string}[],date:string){
 return leaves.find(leave=>leave.status==='approved'&&leave.start<=date&&leave.end>=date)
}

export function manualWorkday(date:string,start:string,end:string,now:Date){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^\d{2}:\d{2}$/.test(start)||!/^\d{2}:\d{2}$/.test(end))throw Error('Enter a valid date and start and finish times.')
 const from=new Date(`${date}T${start}:00+04:00`),to=new Date(`${date}T${end}:00+04:00`)
 if(!Number.isFinite(+from)||!Number.isFinite(+to)||omanWorkday(from).date!==date||to<=from||to>now)throw Error('Finish must be after start and cannot be in the future.')
 return {from,to,...workdayDuration(from,to,date),lateMinutes:omanWorkday(from).lateMinutes}
}
export function missedClockOut(date:string,clockIn:unknown,clockOut:unknown,now:Date){
 return !!clockIn&&!clockOut&&now.getTime()>=Date.parse(date+'T22:00:00+04:00')
}

export function canStartExtraWork(regular:{clockIn?:unknown;clockOut?:unknown}|undefined,openRecords:{clockIn?:unknown}[]){
 return !!regular?.clockIn&&!!regular.clockOut&&!openRecords.some(record=>!!record.clockIn)
}
