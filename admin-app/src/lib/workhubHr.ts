export type HrLeave={id:string;start:string;end:string;days:number;type:string;status:'pending'|'approved'|'rejected';note:string;evidenceUrl?:string}
export type HrAttendance={id:string;date:string;lateMinutes:number;overtimeMinutes:number;present:boolean}
export type HrCourse={id:string;name:string;date:string;qualification:string;institution?:string;certificateUrl?:string;onlineUrl?:string;evidenceUrl?:string}
export type HrProfile={accountUid?:string;reportingToUid?:string;departmentId?:string;employeeId:string;department:string;jobTitle:string;email:string;phone:string;status:'active'|'former';startDate:string;endDate:string;contract:string;qualifications:string;qualificationDocuments?:{id:string;title:string;url:string}[];annualLeaveDays:number;leaves:HrLeave[];attendance:HrAttendance[];courses:HrCourse[];history:{at:string;actor:string;message:string}[]}
export const emptyHrProfile=():HrProfile=>({employeeId:'',department:'',jobTitle:'',email:'',phone:'',status:'active',startDate:'',endDate:'',contract:'',qualifications:'',annualLeaveDays:30,leaves:[],attendance:[],courses:[],history:[]})
const dayMs=86400000
export function hrLeaveBalance(profile:HrProfile,asOf:string){
 const valid=(s:string)=>/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))
 const allowance=Number.isFinite(profile.annualLeaveDays)?Math.max(0,profile.annualLeaveDays):30
 if(!valid(profile.startDate)||!valid(asOf))return {periodStart:'',periodEnd:'',allowance,leaveTaken:0,leaveRemaining:allowance,ready:false}
 const anniversary=(year:number)=>{const [_,month,day]=profile.startDate.split('-').map(Number);return new Date(Date.UTC(year,month-1,Math.min(day,new Date(Date.UTC(year,month,0)).getUTCDate()))).toISOString().slice(0,10)}
 let year=Number(asOf.slice(0,4));if(anniversary(year)>asOf)year--
 const periodStart=asOf<profile.startDate?profile.startDate:anniversary(year),next=anniversary(asOf<profile.startDate?Number(profile.startDate.slice(0,4))+1:year+1)
 const periodEnd=new Date(Date.parse(next)-dayMs).toISOString().slice(0,10)
 const leaveTaken=asOf<profile.startDate?0:profile.leaves.filter(l=>l.status==='approved'&&l.type.toLowerCase()!=='sick'&&valid(l.start)&&valid(l.end)&&l.end>=l.start).reduce((sum,l)=>{const overlap=Math.max(0,(Math.min(Date.parse(l.end),Date.parse(periodEnd))-Math.max(Date.parse(l.start),Date.parse(periodStart)))/dayMs+1),duration=(Date.parse(l.end)-Date.parse(l.start))/dayMs+1;return sum+overlap/duration*Math.max(0,l.days)},0)
 return {periodStart,periodEnd,allowance,leaveTaken,leaveRemaining:allowance-leaveTaken,ready:asOf>=profile.startDate}
}
export function hrTotals(profile:HrProfile,weekStart:string,weekEnd:string,asOf=weekStart){const weekly=profile.attendance.filter(a=>a.date>=weekStart&&a.date<=weekEnd);const leaveTaken=profile.startDate?hrLeaveBalance(profile,asOf).leaveTaken:profile.leaves.filter(l=>l.status==='approved'&&l.start.slice(0,4)===asOf.slice(0,4)).reduce((total,l)=>total+l.days,0);return {leaveTaken,leaveRemaining:profile.annualLeaveDays-leaveTaken,lateMinutes:weekly.reduce((sum,a)=>sum+a.lateMinutes,0),overtimeMinutes:weekly.reduce((sum,a)=>sum+a.overtimeMinutes,0)}}
