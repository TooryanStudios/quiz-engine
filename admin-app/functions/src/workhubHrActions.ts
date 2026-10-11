import {omanWorkday,workdayDuration,approvedLeaveOn,manualWorkday,canStartExtraWork} from './workhubHrAttendance'
import * as admin from 'firebase-admin'
import {onCall,HttpsError} from 'firebase-functions/v2/https'
export const workhubHrAction=onCall({invoker:"public"},async request=>{
 if(!request.auth)throw new HttpsError('unauthenticated','Sign in first.')
 const uid=request.auth.uid,{employeeId,action,requestId,status,location,note}=request.data||{}
 if(typeof employeeId!=='string'||!employeeId||employeeId.includes('/'))throw new HttpsError('invalid-argument','Select an employee.')
 const db=admin.firestore(),employeeRef=db.collection('workhub_projects').doc(employeeId),member=await db.collection('workhub_members').doc(uid).get()
 const master=request.auth.token.admin===true,approved=member.data()?.status==='approved',hr=master||(approved&&member.data()?.role==='admin')
 if(!master&&!approved)throw new HttpsError('permission-denied','Approved account required.')
 return db.runTransaction(async tx=>{
  const snap=await tx.get(employeeRef),employee=snap.data(),p=employee?.hrProfile
  if(!employee||employee.intent!=='hr_employee_profile'||!p)throw new HttpsError('not-found','Employee profile unavailable.')
  if(action==='cancelRequest'){
   if(typeof requestId!=='string'||!requestId||requestId.includes('/'))throw new HttpsError('invalid-argument','Select a request.')
   const ref=employeeRef.collection('hrRequests').doc(requestId),record=await tx.get(ref),r=record.data()
   if(!r)throw new HttpsError('not-found','Request unavailable.')
   if(r.authorUid!==uid&&p.accountUid!==uid)throw new HttpsError('permission-denied','Only the requester or assigned employee can cancel this request.')
   if(r.status!=='pending')throw new HttpsError('failed-precondition','Only pending requests can be cancelled.')
   tx.update(ref,{status:'cancelled',cancelledBy:uid,cancelledAt:admin.firestore.FieldValue.serverTimestamp()})
   p.history=[...(p.history||[]),{at:new Date().toISOString(),actor:uid,message:r.kind+': cancelled'}]
   tx.update(employeeRef,{hrProfile:p,updatedAt:admin.firestore.FieldValue.serverTimestamp()})
   return {status:'cancelled'}
  }
  if(action==='approve'){
   if(!hr&&p.reportingToUid!==uid)throw new HttpsError('permission-denied','Only HR or the reporting manager can review this request.')
   if(typeof requestId!=='string'||!requestId||requestId.includes('/')||!['approved','rejected'].includes(status))throw new HttpsError('invalid-argument','Invalid review.')
   const ref=employeeRef.collection('hrRequests').doc(requestId),record=await tx.get(ref),r=record.data()
   if(!r||r.status!=='pending')throw new HttpsError('failed-precondition','This request has already been reviewed.')
   if(r.authorUid===uid||p.accountUid===uid)throw new HttpsError('permission-denied','Your request must be reviewed by another supervisor or HR administrator.')
   if(p.reportingToUid&&p.reportingToUid!==uid)throw new HttpsError('permission-denied','The assigned reporting supervisor must review this request.')
   if(r.kind==='attendance'){
    if(r.authorUid===uid)throw new HttpsError('permission-denied','A different supervisor or HR administrator must review your attendance.')
    if(p.reportingToUid&&p.reportingToUid!==uid&&!master)throw new HttpsError('permission-denied','Your reporting supervisor must review this attendance.')
    if(status==='approved'){
     let times;try{times=manualWorkday(r.date,r.start,r.end,new Date())}catch(e){throw new HttpsError('invalid-argument',(e as Error).message)}
     const attendanceRef=employeeRef.collection('attendance').doc(r.date),existing=(await tx.get(attendanceRef)).data()
     if(existing?.clockOut)throw new HttpsError('already-exists','This day already has completed attendance.')
     if(approvedLeaveOn(p.leaves||[],r.date))throw new HttpsError('failed-precondition','This day has approved leave.')
     tx.set(attendanceRef,{authorUid:p.accountUid,date:r.date,clockIn:admin.firestore.Timestamp.fromDate(times.from),clockOut:admin.firestore.Timestamp.fromDate(times.to),location:r.location,note:r.text,lateMinutes:times.lateMinutes,overtimeMinutes:times.overtimeMinutes,workedMinutes:times.workedMinutes,manual:true,requestId,approvedBy:uid,approvedAt:admin.firestore.FieldValue.serverTimestamp()})
     p.attendance=[...(p.attendance||[]).filter((a:{id:string})=>a.id!==r.date),{id:r.date,date:r.date,present:true,lateMinutes:times.lateMinutes,overtimeMinutes:times.overtimeMinutes}]
    }
    p.history=[...(p.history||[]),{at:new Date().toISOString(),actor:uid,message:'Attendance '+r.date+': '+status}]
    tx.update(employeeRef,{hrProfile:p,updatedAt:admin.firestore.FieldValue.serverTimestamp()});tx.update(ref,{status,reviewedBy:uid,reviewedAt:admin.firestore.FieldValue.serverTimestamp()});return {status}
   }
   if(status==='approved'){
    if(r.kind==='leave'&&(!Number.isFinite(Date.parse(r.start))||!Number.isFinite(Date.parse(r.end))||r.end<r.start))throw new HttpsError('invalid-argument','Invalid leave dates.');if(r.kind==='leave')p.leaves=[...(p.leaves||[]),{id:requestId,start:r.start,end:r.end,days:Math.floor((Date.parse(r.end)-Date.parse(r.start))/86400000)+1,type:r.leaveType||'annual',status:'approved',note:r.text,evidenceUrl:r.evidenceUrl||''}]
    else if(r.kind==='course')p.courses=[...(p.courses||[]),{id:requestId,name:r.text,date:new Date().toISOString().slice(0,10),qualification:'',institution:r.institution||'',certificateUrl:r.evidenceUrl||'',onlineUrl:r.onlineUrl||''}]
    else if(r.kind==='qualification'){p.qualifications=[p.qualifications,r.text].filter(Boolean).join('\n');if(r.evidenceUrl)p.qualificationDocuments=[...(p.qualificationDocuments||[]),{id:requestId,title:r.text,url:r.evidenceUrl}]}
   }
   p.history=[...(p.history||[]),{at:new Date().toISOString(),actor:uid,message:r.kind+': '+status}]
   tx.update(employeeRef,{hrProfile:p,updatedAt:admin.firestore.FieldValue.serverTimestamp()});tx.update(ref,{status,reviewedBy:uid,reviewedAt:admin.firestore.FieldValue.serverTimestamp()});return {status}
  }
  if(p.status==='former')throw new HttpsError('failed-precondition','Attendance is only available to active employees.');if(p.accountUid!==uid)throw new HttpsError('permission-denied','Only the assigned employee can clock in or out.')
  if(action==='startExtraHours'){
   const {reasons}=request.data
   if(!Array.isArray(reasons)||!reasons.length||reasons.length>5||reasons.some((r:unknown)=>!['urgent','catchup','research','meeting','other'].includes(String(r))))throw new HttpsError('invalid-argument','Select a reason for extra work.')
   const now=new Date(),{date}=omanWorkday(now),regular=(await tx.get(employeeRef.collection('attendance').doc(date))).data()
   const open=await tx.get(employeeRef.collection('attendance').where('clockOut','==',null))
   if(!canStartExtraWork(regular,open.docs.map(d=>d.data())))throw new HttpsError('failed-precondition','Finish regular work and any open session before starting extra hours.')
   const ref=employeeRef.collection('attendance').doc()
   tx.create(ref,{kind:'extraHours',authorUid:uid,date,clockIn:admin.firestore.Timestamp.fromDate(now),clockOut:null,reasons:Array.from(new Set(reasons)),note:'',workItems:[],location:'extra',lateMinutes:0,overtimeMinutes:0})
   tx.update(employeeRef,{activeExtraSessionId:ref.id})
   return {sessionId:ref.id}
  }
  if(['prepareFinishExtra','finishExtraHours','detectExtraWork'].includes(action)){
   const sessionId=request.data.sessionId
   if(typeof sessionId!=='string'||!sessionId||sessionId.includes('/'))throw new HttpsError('invalid-argument','Select an extra-work session.')
   const ref=employeeRef.collection('attendance').doc(sessionId),record=(await tx.get(ref)).data()
   if(!record||record.kind!=='extraHours'||record.authorUid!==uid)throw new HttpsError('not-found','Extra-work session unavailable.')
   if(record.clockOut){if(action==='finishExtraHours')return {finished:true};throw new HttpsError('failed-precondition','This session is already finished.')}
   if(action==='prepareFinishExtra'){
    tx.update(ref,{finishCandidate:admin.firestore.Timestamp.now()});return {ready:true}
   }
   if(!record.finishCandidate)throw new HttpsError('failed-precondition','Click Finish extra hours first.')
   if(action==='detectExtraWork'){
    const {entityKeys}=request.data
    if(!Array.isArray(entityKeys)||entityKeys.length>10000||entityKeys.some(k=>typeof k!=='string'))throw new HttpsError('invalid-argument','Invalid project scope.')
    const logs=await tx.get(db.collection('workhub_activity').where('createdAt','>=',record.clockIn).where('createdAt','<=',record.finishCandidate).orderBy('createdAt','desc').limit(1000))
    const allowed=new Set(entityKeys)
    return {items:logs.docs.flatMap(d=>{const r=d.data();return r.actorUid===uid&&['task','project','document','moodboard'].includes(r.entityType)&&allowed.has(r.entityType+':'+r.entityId)&&r.action!=='chat_message'&&typeof r.message==='string'?[r.message.slice(0,500)]:[]}).slice(0,30),limited:logs.size===1000}
   }
   const {workItems}=request.data
   if(!Array.isArray(workItems)||!workItems.length||workItems.length>30||workItems.some((item:unknown)=>typeof item!=='string'||!item.trim()||item.length>500))throw new HttpsError('invalid-argument','Add 1–30 accomplishments, each up to 500 characters.')
   const workedMinutes=Math.max(0,Math.floor((record.finishCandidate.toMillis()-record.clockIn.toMillis())/60000))
   tx.update(ref,{clockOut:record.finishCandidate,workedMinutes,workItems:workItems.map((i:string)=>i.trim()),finishCandidate:admin.firestore.FieldValue.delete()})
   tx.update(employeeRef,{activeExtraSessionId:admin.firestore.FieldValue.delete()})
   return {finished:true,workedMinutes}
  }
  if(action==='extraHours')throw new HttpsError('failed-precondition','Reload WorkHub and use Start extra hours to record a live session.')
  if(action==='requestAttendance'){
   const {date,start,end,reason}=request.data
   try{manualWorkday(date,start,end,new Date())}catch(e){throw new HttpsError('invalid-argument',(e as Error).message)}
   if(!['office','online','offsite'].includes(location)||typeof reason!=='string'||!reason.trim()||reason.length>1000)throw new HttpsError('invalid-argument','Choose a location and explain the missing attendance.')
   if(approvedLeaveOn(p.leaves||[],date))throw new HttpsError('failed-precondition','This day has approved leave.')
   const attendance=(await tx.get(employeeRef.collection('attendance').doc(date))).data()
   const ref=employeeRef.collection('hrRequests').doc('attendance-'+date),pending=(await tx.get(ref)).data()
   if(attendance?.clockOut)throw new HttpsError('already-exists','This day already has completed attendance.')
   if(pending?.status==='pending')throw new HttpsError('already-exists','Attendance for this day is already awaiting approval.')
   tx.set(ref,{authorUid:uid,kind:'attendance',date,start,end,location,text:reason.trim(),status:'pending',createdAt:admin.firestore.FieldValue.serverTimestamp()})
   return {status:'pending'}
  }
  if(!['clockIn','clockOut','markOff','clearOff'].includes(action))throw new HttpsError('invalid-argument','Invalid attendance action.')
  const now=new Date(),{date,lateMinutes}=omanWorkday(now)
  const ref=employeeRef.collection('attendance').doc(date),record=await tx.get(ref),r=record.data()
  if(action==='clearOff'){
   if(!r||r.location!=='off'||r.clockIn)throw new HttpsError('failed-precondition','Only an off-day record can be cleared.')
   tx.delete(ref);p.attendance=(p.attendance||[]).filter((a:{id:string})=>a.id!==date);tx.update(employeeRef,{hrProfile:p,updatedAt:admin.firestore.FieldValue.serverTimestamp()});return {date}
  }
  if((action==='clockIn'||action==='markOff')&&approvedLeaveOn(p.leaves||[],date))throw new HttpsError('failed-precondition','You are on approved leave today.')
  if(action==='markOff'){
   if(typeof note!=='string'||!note.trim()||note.length>1000)throw new HttpsError('invalid-argument','Choose a reason for not working today.')
   if(r){if(r.location==='off')return {date};throw new HttpsError('failed-precondition','Work has already been recorded today.')}
   tx.create(ref,{authorUid:uid,date,clockIn:null,clockOut:null,location:'off',note:note.trim(),lateMinutes:0,overtimeMinutes:0,workedMinutes:0,recordedAt:admin.firestore.Timestamp.fromDate(now)})
   p.attendance=[...(p.attendance||[]).filter((a:{id:string})=>a.id!==date),{id:date,date,present:false,lateMinutes:0,overtimeMinutes:0}]
   tx.update(employeeRef,{hrProfile:p,updatedAt:admin.firestore.FieldValue.serverTimestamp()});return {date}
  }
  if(action==='clockIn'){
   if(employee.activeExtraSessionId)throw new HttpsError('failed-precondition','Finish your extra-work session before starting regular work.')
   if(r)throw new HttpsError('already-exists','You have already clocked in today.')
   if(!['office','online','offsite'].includes(location)||typeof note!=='string'||note.length>1000||(location==='offsite'&&!note.trim()))throw new HttpsError('invalid-argument','Describe your off-site work and destination.')
   tx.create(ref,{authorUid:uid,date,clockIn:admin.firestore.Timestamp.fromDate(now),clockOut:null,location,note,lateMinutes,overtimeMinutes:0});p.attendance=[...(p.attendance||[]).filter((a:{id:string})=>a.id!==date),{id:date,date,present:true,lateMinutes,overtimeMinutes:0}];tx.update(employeeRef,{hrProfile:p,updatedAt:admin.firestore.FieldValue.serverTimestamp()});return {date}
  }
  if(!r?.clockIn||r.clockOut)throw new HttpsError('failed-precondition','Clock in first, or your workday has already finished.')
  const {workedMinutes,overtimeMinutes}=workdayDuration(r.clockIn.toDate(),now,date)
  tx.update(ref,{clockOut:admin.firestore.Timestamp.fromDate(now),workedMinutes,overtimeMinutes})
  p.attendance=(p.attendance||[]).map((a:{id:string})=>a.id===date?{...a,overtimeMinutes}:a);tx.update(employeeRef,{hrProfile:p,updatedAt:admin.firestore.FieldValue.serverTimestamp()})
  return {date}
 })
})
