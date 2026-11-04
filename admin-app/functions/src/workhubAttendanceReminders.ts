import * as admin from 'firebase-admin'
import {omanWorkday,omanDateShift,workdayDuration,autoCloseTime,missedClockOut,workHoursPassed} from './workhubHrAttendance'

export type AttendanceReminderKind='end'|'late'|'autoClosed'
type SendEmail=(params:{to:string;subject:string;text:string;html:string})=>Promise<unknown>

const escape=(value:string)=>value.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c] as string))
const appUrl='https://qyan-om.web.app/workhub'

export function attendanceReminderText(kind:AttendanceReminderKind,date:string){
 if(kind==='end')return {
  subject:'WorkHub: working hours are over, please finish work',
  en:'Working hours ended at 5:00 PM and your work is still running. Open WorkHub and press Finish work.',
  ar:'انتهى وقت الدوام الساعة ٥:٠٠ مساءً وما زال عملك قيد التشغيل. افتح WorkHub واضغط «إنهاء العمل».'}
 if(kind==='late')return {
  subject:'WorkHub reminder: your work is still running',
  en:'It is after 10:00 PM and your work is still running. Press Finish work now. If it stays open, it will be closed at the 5:00 PM schedule end tomorrow morning.',
  ar:'تجاوزت الساعة ١٠:٠٠ مساءً وما زال عملك قيد التشغيل. اضغط «إنهاء العمل» الآن. إن بقي مفتوحًا فسيُغلق صباح الغد على نهاية الدوام ٥:٠٠ مساءً.'}
 return {
  subject:`WorkHub: your work on ${date} was closed automatically`,
  en:`Your work on ${date} was never finished, so it was closed at the 5:00 PM schedule end. If you worked longer, send a missing attendance request from your profile.`,
  ar:`لم يتم إنهاء عملك بتاريخ ${date}، لذلك أُغلق تلقائيًا على نهاية الدوام ٥:٠٠ مساءً. إذا عملت وقتًا أطول فأرسل طلب حضور من ملفك.`}
}

/**
 * Warns employees whose shift is still open after working hours (5pm, workdays only),
 * again after 10pm, and closes shifts left open overnight. Each step is claimed inside a
 * transaction before anything is sent, so overlapping or retried runs never send twice.
 */
export async function runAttendanceReminders(now:Date,sendEmail:SendEmail){
 const db=admin.firestore(),{date}=omanWorkday(now),dates=[omanDateShift(date,-1),date]
 const employees=await db.collection('workhub_projects').where('intent','==','hr_employee_profile').get()
 const sent:{employeeId:string;date:string;kind:AttendanceReminderKind}[]=[]
 for(const employee of employees.docs){
  const profile=employee.data().hrProfile
  if(!profile?.accountUid||profile.status==='former')continue
  for(const day of dates){
   const ref=employee.ref.collection('attendance').doc(day)
   const kind=await db.runTransaction(async tx=>{
    const r=(await tx.get(ref)).data(),fresh=(await tx.get(employee.ref)).data()
    if(!r||r.kind==='extraHours'||!r.clockIn||r.clockOut)return null
    const closeAt=autoCloseTime(day,r.clockIn.toDate(),now)
    if(closeAt){
     const times=workdayDuration(r.clockIn.toDate(),closeAt,day),p=fresh?.hrProfile
     tx.update(ref,{clockOut:admin.firestore.Timestamp.fromDate(closeAt),...times,autoClosed:true})
     if(p){p.attendance=(p.attendance||[]).map((a:{id:string})=>a.id===day?{...a,overtimeMinutes:times.overtimeMinutes}:a);tx.update(employee.ref,{hrProfile:p})}
     return 'autoClosed' as const
    }
    const at=admin.firestore.Timestamp.fromDate(now)
    if(missedClockOut(day,r.clockIn,r.clockOut,now)&&!r.lateReminderSentAt){tx.update(ref,{lateReminderSentAt:at,endReminderSentAt:r.endReminderSentAt||at});return 'late' as const}
    if(workHoursPassed(day,r.clockIn,r.clockOut,now)&&!r.endReminderSentAt){tx.update(ref,{endReminderSentAt:at});return 'end' as const}
    return null
   })
   if(!kind)continue
   sent.push({employeeId:employee.id,date:day,kind})
   const copy=attendanceReminderText(kind,day),uid=profile.accountUid as string
   await db.doc(`workhub_notifications/attendance_${employee.id}_${day}_${kind}`).set({
    workspaceId:'__attendance__',recipientUid:uid,actorUid:'system',entityType:'attendance',entityId:employee.id,
    action:'attendance_'+kind,message:copy.en,delivery:'in_app',read:false,createdAt:admin.firestore.FieldValue.serverTimestamp()})
   const member=(await db.doc('workhub_members/'+uid).get()).data()
   const to=[member?.email,profile.email].find(v=>typeof v==='string'&&/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) as string|undefined
   if(!to)continue
   try{
    await sendEmail({to:to.trim(),subject:copy.subject,
     text:`${copy.en}\n\n${copy.ar}\n\n${appUrl}`,
     html:`<p>${escape(copy.en)}</p><p dir="rtl" lang="ar">${escape(copy.ar)}</p><p><a href="${appUrl}">Open WorkHub</a></p>`})
   }catch(error){console.error('[attendance reminders] email failed',employee.id,day,kind,error)}
  }
 }
 return sent
}
