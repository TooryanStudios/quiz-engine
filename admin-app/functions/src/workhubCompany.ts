import * as admin from 'firebase-admin'
import {createHash,randomUUID} from 'node:crypto'
import {onCall,HttpsError} from 'firebase-functions/v2/https'
import {onSchedule} from 'firebase-functions/v2/scheduler'
import {isCompanyModule,validateCompanyDraft,canReadCompany,canEditCompany,companyTransitions,companyReminder,companyToday,nextCompanyDue,validDate,type CompanyActor,type CompanyRecord,type CompanyModule,type CompanyEntry} from './workhubCompanyModel'

const records=(module:CompanyModule)=>admin.firestore().collection('workhub_company').doc(module).collection('companyRecords')
const key=(value:unknown)=>typeof value==='string'&&/^[\w-]{1,128}$/.test(value)
const recordData=(snap:admin.firestore.DocumentSnapshot)=>{const data={...snap.data()};delete data.nextReminderOn;return {...data,id:snap.id} as CompanyRecord}
async function actorFor(auth:{uid:string;token:Record<string,unknown>}|undefined):Promise<CompanyActor>{
 if(!auth)throw new HttpsError('unauthenticated','Sign in first.')
 const member=(await admin.firestore().doc('workhub_members/'+auth.uid).get()).data()
 if(auth.token.admin!==true&&member?.status!=='approved')throw new HttpsError('permission-denied','Approved membership required.')
 return {uid:auth.uid,privileged:auth.token.admin===true||['admin','manager'].includes(member?.role)}
}
const allowed=(condition:boolean,message='You do not have permission for this action.')=>{if(!condition)throw new HttpsError('permission-denied',message)}
function notification(tx:admin.firestore.Transaction,uid:string,record:CompanyRecord,event:string,suffix:string){
 const id=`company_${record.module}_${record.id}_${suffix}_${uid}`
 tx.set(admin.firestore().doc('workhub_notifications/'+id),{workspaceId:'__company__',recipientUid:uid,actorUid:record.createdBy,entityType:'document',entityId:record.id,action:'company_'+event,message:event==='reminder'?'A company record needs your attention.':event==='submitted'?'A company request is ready for review.':'A company record has been updated.',targetPath:`/workhub/next?view=company&section=${record.module}&record=${record.id}`,read:false,createdAt:admin.firestore.FieldValue.serverTimestamp()})
}
// Transport is public; every operation authenticates and applies a server-side ACL.
// Direct Firestore reads/writes for this collection remain denied by the rules.
export const workhubCompanyAction=onCall({invoker:'public',maxInstances:10},async request=>{
 const actor=await actorFor(request.auth),data=request.data||{},module=data.module
 if(!isCompanyModule(module))throw new HttpsError('invalid-argument','Select a company section.')
 const collection=records(module),db=admin.firestore()
 if(data.action==='list'){
  let query:admin.firestore.Query=collection
  if(!actor.privileged)query=query.where('accessUids','array-contains',actor.uid)
  query=query.orderBy('updatedAt','desc').orderBy(admin.firestore.FieldPath.documentId(),'desc')
  if(data.cursor){if(!key(data.cursor.id)||!Number.isFinite(data.cursor.updatedAt))throw new HttpsError('invalid-argument','Invalid page.');query=query.startAfter(data.cursor.updatedAt,data.cursor.id)}
  const snap=await query.limit(41).get(),items=snap.docs.slice(0,40).map(recordData),last=items[items.length-1]
  return {items,cursor:snap.size>40&&last?{id:last.id,updatedAt:last.updatedAt}:null}
 }
 if(!key(data.id))throw new HttpsError('invalid-argument','Invalid record.')
 const ref=collection.doc(data.id)
 if(data.action==='file'||data.action==='upload'){
  const snap=await ref.get();if(!snap.exists)throw new HttpsError('not-found','Record not found.')
  const record=recordData(snap);allowed(canReadCompany(actor,record))
  if(data.action==='file'){
   if(!record.file)throw new HttpsError('not-found','No file attached.')
   const [content]=await admin.storage().bucket().file(record.file.path).download()
   return {base64:content.toString('base64'),contentType:record.file.type}
  }
  allowed(canEditCompany(actor,record))
  if(!['documents','finance'].includes(module)||record.status==='paid')throw new HttpsError('failed-precondition','This record cannot accept files.')
  const name=String(data.fileName||'').replace(/[\x00-\x1f/\\]/g,'').slice(0,180),type=String(data.contentType||'')
  if(!name||!['application/pdf','image/png','image/jpeg','image/webp'].includes(type)||typeof data.base64!=='string'||data.base64.length>5600000)throw new HttpsError('invalid-argument','Use a PDF, PNG, JPEG or WebP file up to 4 MB.')
  const content=Buffer.from(data.base64,'base64')
  const signature=type==='application/pdf'?content.subarray(0,5).toString()==='%PDF-':type==='image/png'?content.subarray(0,8).toString('hex')==='89504e470d0a1a0a':type==='image/jpeg'?content.subarray(0,3).toString('hex')==='ffd8ff':content.subarray(0,4).toString()==='RIFF'&&content.subarray(8,12).toString()==='WEBP'
  if(!signature||content.length>4*1024*1024)throw new HttpsError('invalid-argument','The file format or size is not supported.')
  const path=`workhub-company-private/${module}/${record.id}/${randomUUID()}`,file=admin.storage().bucket().file(path)
  await file.save(content,{resumable:false,contentType:type,metadata:{cacheControl:'private, max-age=0'}})
  try{return await db.runTransaction(async tx=>{
   const fresh=await tx.get(ref);if(!fresh.exists)throw new HttpsError('not-found','Record not found.')
   const current=recordData(fresh);allowed(canEditCompany(actor,current));if(current.status==='paid')throw new HttpsError('failed-precondition','Paid records are locked.')
   if(current.revision!==data.revision)throw new HttpsError('aborted','This record changed. Reopen it and try again.')
   const result={...current,file:{path,name,type,size:content.length},revision:current.revision+1,updatedAt:Date.now(),...(module==='finance'&&current.status==='approved'?{status:'submitted'}:{})}
   tx.update(ref,result);tx.set(ref.collection('history').doc(),{action:'upload',actorUid:actor.uid,at:Date.now(),from:current.status,to:result.status,changed:['file'],revision:result.revision})
   return {record:result}
  })}catch(error){await file.delete().catch(()=>undefined);throw error}
 }
 if(data.action==='get'||data.action==='history'){
  const snap=await ref.get();if(!snap.exists)throw new HttpsError('not-found','Record not found.')
  allowed(canReadCompany(actor,recordData(snap)))
  if(data.action==='get')return {record:recordData(snap)}
  const history=await ref.collection('history').orderBy('at','desc').limit(50).get()
  return {items:history.docs.map(d=>({id:d.id,...d.data()}))}
 }
 if(!['save','status','entry','nextPeriod'].includes(data.action))throw new HttpsError('invalid-argument','Invalid action.')
 let draft:ReturnType<typeof validateCompanyDraft>|undefined
 if(data.action==='save'){
  try{draft=validateCompanyDraft(module,data)}catch(error){throw new HttpsError('invalid-argument',(error as Error).message)}
  if(!key(data.ownerUid))throw new HttpsError('invalid-argument','Choose a responsible person.')
 }
 // Load recipients before the transaction; never put sensitive titles in notifications.
 const managers=await db.collection('workhub_members').where('status','==','approved').get()
 const reviewerUids=managers.docs.filter(d=>['admin','manager'].includes(d.data().role)).map(d=>d.id)
 return db.runTransaction(async tx=>{
  const snap=await tx.get(ref),previous=snap.exists?recordData(snap):undefined,now=Date.now()
  if(previous){
   allowed(canReadCompany(actor,previous))
   // A retried create uses the same client-generated ID after a lost response.
   if(data.action==='save'&&data.revision==null&&previous.createdBy===actor.uid&&previous.revision===1&&draft?.title===previous.title&&data.ownerUid===previous.ownerUid&&Object.keys(draft.fields).every(k=>draft!.fields[k]===previous.fields[k]))return {record:previous}
   if(data.revision!==previous.revision)throw new HttpsError('aborted','This record changed. Close and reopen it before saving.')
  }
  else if(data.action!=='save')throw new HttpsError('not-found','Record not found.')
  let record:CompanyRecord
  if(data.action==='save'){
   if(previous)allowed(canEditCompany(actor,previous))
   else allowed(actor.privileged||module==='initiatives'||module==='finance')
   if(previous?.module==='finance'&&previous.status==='paid')throw new HttpsError('failed-precondition','Paid records are locked. Create a separate adjustment record.')
   if(!actor.privileged&&data.ownerUid!==(previous?.ownerUid||actor.uid))throw new HttpsError('permission-denied','Only a manager can assign a record to another person.')
   const owner=(await tx.get(db.doc('workhub_members/'+data.ownerUid))).data()
   if(owner?.status!=='approved')throw new HttpsError('invalid-argument','Choose an approved member.')
   record={...(previous||{id:data.id,module,createdBy:actor.uid,createdAt:now,status:module==='finance'||module==='initiatives'?'submitted':'active',entries:[]}),...draft!,ownerUid:data.ownerUid,accessUids:[...new Set([previous?.createdBy||actor.uid,data.ownerUid])],revision:(previous?.revision||0)+1,updatedAt:now,reminderOn:companyReminder(module,draft!.fields)}
   if(module==='finance'&&previous?.status==='approved')record.status='submitted'
   if(!actor.privileged&&module==='initiatives'){
    record.fields.outcome=previous?.fields.outcome||'';record.fields.recognition=previous?.fields.recognition||''
   }
  }else{
   record={...previous!,revision:previous!.revision+1,updatedAt:now}
   if(data.action==='status'){
    allowed(companyTransitions(actor,previous!).includes(data.status),'You cannot make this status change.')
    if(module==='initiatives'&&data.status==='completed'&&!record.fields.outcome?.trim())throw new HttpsError('failed-precondition','Record the results before completing the initiative.')
    record.status=data.status
   }else if(data.action==='entry'){
    allowed(canEditCompany(actor,previous!))
    if(!['partners','relations'].includes(module))throw new HttpsError('invalid-argument','This section does not accept activity entries.')
    const entry=data.entry||{},title=String(entry.title||'').trim(),notes=String(entry.notes||'').trim()
    if(!title||title.length>180||notes.length>6000||!validDate(entry.date||''))throw new HttpsError('invalid-argument','Add a title and valid date.')
    const clean:CompanyEntry={id:ref.collection('history').doc().id,title,notes,date:entry.date,authorUid:actor.uid,createdAt:now}
    if(module==='partners'){
     for(const rating of ['quality','timeliness','cost'] as const){if(!Number.isInteger(Number(entry[rating]))||Number(entry[rating])<1||Number(entry[rating])>5)throw new HttpsError('invalid-argument','Rate quality, deadlines and cost from 1 to 5.');clean[rating]=Number(entry[rating])}
     if(entry.amount!==''&&entry.amount!==undefined){if(!Number.isFinite(Number(entry.amount))||Number(entry.amount)<0||Number(entry.amount)>1e9)throw new HttpsError('invalid-argument','Check the engagement cost.');clean.amount=Number(entry.amount)}
     clean.lessons=String(entry.lessons||'').trim().slice(0,6000)
    }
    // Bound record size; activity history remains append-only in its own collection.
    if(record.entries.length>=100)throw new HttpsError('resource-exhausted','This record has 100 activity entries. Create a new record for further activity.')
    record.entries=[clean,...record.entries]
    if(module==='relations'){
     if(entry.followUpOn&&!validDate(entry.followUpOn))throw new HttpsError('invalid-argument','Check the next follow-up date.')
     record.fields={...record.fields,lastContact:entry.date,followUpOn:entry.followUpOn||''};record.reminderOn=companyReminder(module,record.fields)
    }
   }else{
    allowed(actor.privileged)
    if(module!=='finance'||previous!.status!=='paid'||previous!.fields.kind!=='recurring')throw new HttpsError('failed-precondition','Pay the current recurring expense before creating the next period.')
    const nextRef=collection.doc(createHash('sha256').update(record.id+':next-period').digest('hex'))
    const existing=await tx.get(nextRef)
    if(existing.exists)return {record:recordData(existing)}
    let date:string;try{date=nextCompanyDue(record.fields.dueOn,record.fields.frequency)}catch(error){throw new HttpsError('invalid-argument',(error as Error).message)}
    record={...record,id:nextRef.id,status:'submitted',createdBy:actor.uid,accessUids:[...new Set([actor.uid,record.ownerUid])],fields:{...record.fields,date,dueOn:date,reference:'',url:''},revision:1,createdAt:now,updatedAt:now,entries:[],reminderOn:date}
   }
  }
  const target=collection.doc(record.id)
  const terminal=['paid','archived','cancelled','rejected','completed'].includes(record.status)
  tx.set(target,{...record,nextReminderOn:terminal?'':record.reminderOn})
  const changed=previous?[...Object.keys(record.fields).filter(k=>record.fields[k]!==previous.fields[k]),...(record.title!==previous.title?['title']:[]),...(record.ownerUid!==previous.ownerUid?['ownerUid']:[])]:['title','ownerUid',...Object.keys(record.fields)]
  tx.set(target.collection('history').doc(),{action:data.action,actorUid:actor.uid,at:now,from:previous?.status||'',to:record.status,changed,revision:record.revision})
  const recipients=new Set([record.createdBy,record.ownerUid,...(record.status==='submitted'||record.status==='review'?reviewerUids:[])])
  for(const uid of recipients)if(uid!==actor.uid)notification(tx,uid,record,record.status,`${record.revision}`)
  return {record}
 })
})

export const workhubCompanyReminders=onSchedule({schedule:'every day 08:00',timeZone:'Asia/Muscat',maxInstances:1},async()=>{
 const today=companyToday(),db=admin.firestore()
 for(const module of ['documents','finance','relations','initiatives','references'] as CompanyModule[]){
  // Clearing the queue field after delivery makes retries safe and keeps the query small.
  const due=await records(module).where('nextReminderOn','>','').where('nextReminderOn','<=',today).limit(200).get()
  for(const item of due.docs)await db.runTransaction(async tx=>{
   const fresh=await tx.get(item.ref);if(!fresh.exists)return
   const record=recordData(fresh),next=fresh.data()?.nextReminderOn
   if(!next||next>today)return
   const recipients=[...new Set([record.createdBy,record.ownerUid])]
   const members=await Promise.all(recipients.map(uid=>tx.get(db.doc('workhub_members/'+uid))))
   recipients.forEach((uid,i)=>{if(members[i].data()?.status==='approved')notification(tx,uid,record,'reminder',`${record.revision}_${next}`)})
   tx.update(item.ref,{nextReminderOn:module==='documents'&&record.fields.expiresOn>today?record.fields.expiresOn:''})
  })
 }
})
