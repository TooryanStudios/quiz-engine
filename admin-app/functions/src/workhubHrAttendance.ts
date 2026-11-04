/** Extra-hours sessions are switched off; existing open sessions can still be finished. */
export const EXTRA_HOURS_ENABLED=false
/** Oman schedule: Sunday–Thursday, 08:00–17:00 (UTC+4, no daylight saving). */
export const WORK_START_MINUTES=480,WORK_END_MINUTES=1020
const OMAN_OFFSET=4*3600000
/** Friday and Saturday are the weekend in Oman. */
export function omanWeekend(date:string){const day=new Date(date+'T00:00:00Z').getUTCDay();return day===5||day===6}
export function omanDateShift(date:string,days:number){return new Date(Date.parse(date+'T00:00:00Z')+days*86400000).toISOString().slice(0,10)}
export function omanWorkday(now:Date){
 const local=new Date(now.getTime()+OMAN_OFFSET),date=local.toISOString().slice(0,10)
 const minutes=local.getUTCHours()*60+local.getUTCMinutes(),weekend=omanWeekend(date)
 return {date,weekend,minutes,lateMinutes:weekend?0:Math.max(0,minutes-WORK_START_MINUTES)}
}
/** The scheduled end of a workday as an absolute time. */
export function workdayEnd(date:string){return new Date(Date.parse(date+'T00:00:00Z')-OMAN_OFFSET+WORK_END_MINUTES*60000)}
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
/** Working hours are over and the shift is still open: warn the employee (workdays only). */
export function workHoursPassed(date:string,clockIn:unknown,clockOut:unknown,now:Date){
 return !!clockIn&&!clockOut&&!omanWeekend(date)&&now.getTime()>=workdayEnd(date).getTime()
}
/**
 * A shift left open after its day has ended (04:00 the next morning) is closed at the
 * scheduled end time, or at clock-in if the employee started after it, so a forgotten
 * finish never counts the whole night. The employee can request a correction.
 */
export function autoCloseTime(date:string,clockIn:Date,now:Date){
 if(now.getTime()<Date.parse(omanDateShift(date,1)+'T04:00:00+04:00'))return null
 return new Date(Math.max(clockIn.getTime(),workdayEnd(date).getTime()))
}

export function canStartExtraWork(regular:{clockIn?:unknown;clockOut?:unknown}|undefined,openRecords:{clockIn?:unknown}[]){
 return EXTRA_HOURS_ENABLED&&!!regular?.clockIn&&!!regular.clockOut&&!openRecords.some(record=>!!record.clockIn)
}

/** Finish is captured when the employee opens the completion screen, validated against server time. */
export function extraFinishTime(start:Date,requested:unknown,now:Date){
 const value=typeof requested==='number'&&Number.isFinite(requested)?requested:now.getTime()
 // A slow form cannot backdate attendance arbitrarily; expired/device-skewed captures use server time.
 return new Date(value>=start.getTime()&&value<=now.getTime()+5000&&value>=now.getTime()-30*60000?Math.min(value,now.getTime()):now.getTime())
}
