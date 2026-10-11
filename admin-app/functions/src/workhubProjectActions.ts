import * as admin from 'firebase-admin'
import {onCall,HttpsError} from 'firebase-functions/v2/https'

// A single transaction preserves entity IDs and prevents partially moved projects.
export const workhubProjectAction=onCall({invoker:'public'},async request=>{
 if(!request.auth)throw new HttpsError('unauthenticated','Sign in first.')
 const {projectId,workspaceId,parentProjectId='',action}=request.data||{},uid=request.auth.uid
 const valid=(v:unknown)=>typeof v==='string'&&!!v&&!v.includes('/')
 if(!valid(projectId)||!['implement','delete'].includes(action))throw new HttpsError('invalid-argument','Select a project and action.')
 if(action==='implement'&&(!valid(workspaceId)||(parentProjectId&&!valid(parentProjectId))))throw new HttpsError('invalid-argument','Select a destination.')
 const db=admin.firestore()
 return db.runTransaction(async tx=>{
  const member=(await tx.get(db.doc('workhub_members/'+uid))).data(),master=request.auth!.token.admin===true
  if(!master&&member?.status!=='approved')throw new HttpsError('permission-denied','Approved account required.')
  const privileged=master||['admin','manager'].includes(member?.role)
  const visible=(d:admin.firestore.DocumentData)=>privileged||d.createdBy===uid||(d.memberUids||[]).includes(uid)||d.visibility==='workspace'
  const rootRef=db.doc('workhub_projects/'+projectId),root=(await tx.get(rootRef)).data()
  if(!root)throw new HttpsError('not-found','Project no longer exists.')
  if(!visible(root)||(!privileged&&root.createdBy!==uid))throw new HttpsError('permission-denied','Only the project creator or an administrator can move or delete this project.')
  const sourceWorkspace=(await tx.get(db.doc('workhub_workspaces/'+root.workspaceId))).data()
  const projects=await tx.get(db.collection('workhub_projects').where('workspaceId','==',root.workspaceId))
  let inheritedStatuses=root.taskStatuses;let ancestor=root.parentProjectId;const visited=new Set<string>()
  while(!inheritedStatuses?.length&&ancestor&&!visited.has(ancestor)){visited.add(ancestor);const p=projects.docs.find(p=>p.id===ancestor)?.data();if(!p)break;inheritedStatuses=p.taskStatuses;ancestor=p.parentProjectId}
  if(!inheritedStatuses?.length)inheritedStatuses=sourceWorkspace?.taskStatuses
  const ids=new Set<string>([projectId]);let changed=true
  while(changed){changed=false;for(const p of projects.docs)if(ids.has(p.data().parentProjectId)&&!ids.has(p.id)){ids.add(p.id);changed=true}}
  const descendants=projects.docs.filter(p=>ids.has(p.id))
  if(descendants.some(p=>p.data().intent?.startsWith('hr_')))throw new HttpsError('failed-precondition','Manage HR records from Human Resources.')
  if(descendants.some(p=>!visible(p.data())))throw new HttpsError('permission-denied','You must have access to every subfolder.')
  let destination:admin.firestore.DocumentData|undefined
  if(action==='implement'){
   destination=(await tx.get(db.doc('workhub_workspaces/'+workspaceId))).data()
   if(!destination||!visible(destination))throw new HttpsError('permission-denied','Destination workspace unavailable.')
   if(workspaceId===root.workspaceId||ids.has(parentProjectId))throw new HttpsError('invalid-argument','Choose a folder in another workspace.')
   if(root.planSettings?.sourceWorkspaceId)throw new HttpsError('failed-precondition','This plan has already been implemented.')
   if(parentProjectId){const parent=(await tx.get(db.doc('workhub_projects/'+parentProjectId))).data();if(!parent||parent.workspaceId!==workspaceId||!visible(parent)||parent.intent?.startsWith('hr_'))throw new HttpsError('permission-denied','Destination folder unavailable.');if(parent.visibility==='restricted')throw new HttpsError('failed-precondition','Choose a workspace-visible folder to preserve the plan’s existing access.')}
  }
  const collections=['workhub_tasks','workhub_documents','workhub_mood_boards','workhub_milestones','workhub_task_comments','workhub_activity','workhub_notifications','workhub_document_drafts','workhub_project_notification_prefs']
  const snapshots=[]
  for(const name of collections)snapshots.push(await tx.get(db.collection(name).where('workspaceId','==',root.workspaceId)))
  const entityIds=new Set(ids)
  for(const snap of snapshots.slice(0,4))for(const d of snap.docs)if(ids.has(d.data().projectId))entityIds.add(d.id)
  const related=snapshots.flatMap(s=>s.docs).filter(d=>ids.has(d.data().projectId)||entityIds.has(d.data().entityId)||entityIds.has(d.data().taskId)||entityIds.has(d.data().documentId))
  if(descendants.length+related.length>450)throw new HttpsError('resource-exhausted','This project is too large for a single safe operation. Contact an administrator.')
  const stamp=admin.firestore.FieldValue.serverTimestamp()
  for(const p of descendants){if(action==='delete')tx.delete(p.ref);else{const d=p.data();tx.update(p.ref,{workspaceId,updatedAt:stamp,...(p.id===projectId?{parentProjectId:parentProjectId||null,intent:'project',...(inheritedStatuses?.length?{taskStatuses:inheritedStatuses}:{})}:{}),planSettings:{...(d.planSettings||{ownerUids:[],requirements:''}),state:'active',sourceWorkspaceId:root.workspaceId,sourceParentProjectId:d.parentProjectId||'',implementationRootId:projectId}})}}
  for(const d of related)if(action==='delete')tx.delete(d.ref);else tx.update(d.ref,{workspaceId,updatedAt:stamp})
  return {projectId,workspaceId:action==='delete'?root.workspaceId:workspaceId,parentProjectId:root.parentProjectId||''}
 })
})
