// Add only WorkHub's smart-loading indexes; never remove or modify other indexes.
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const definitions = ['visibility', 'createdBy'].flatMap(scope => ['assigneeUid', 'assigneeUids'].map(assignee => ({
 collectionGroup: 'workhub_tasks', queryScope: 'COLLECTION', fields: [
  {fieldPath: scope, order: 'ASCENDING'},
  {fieldPath: assignee, ...(assignee === 'assigneeUids' ? {arrayConfig: 'CONTAINS'} : {order: 'ASCENDING'})},
 ],
})));
definitions.push({collectionGroup: 'workhub_notifications', queryScope: 'COLLECTION', fields: [{fieldPath:'recipientUid',order:'ASCENDING'},{fieldPath:'createdAt',order:'DESCENDING'}]});
for (const restricted of [false,true]) {
 for (const kind of ['recent','thread','groups']) {
  definitions.push({collectionGroup:'workhub_activity',queryScope:'COLLECTION',fields:[
   {fieldPath:'workspaceId',order:'ASCENDING'},
   {fieldPath:'visibility',order:'ASCENDING'},
   ...(restricted?[{fieldPath:'memberUids',arrayConfig:'CONTAINS'}]:[]),
   ...(kind==='thread'?[{fieldPath:'threadId',order:'ASCENDING'}]:[]),
   {fieldPath:'action',order:'ASCENDING'},
   ...(kind==='groups'?[]:[{fieldPath:'createdAt',order:'DESCENDING'}]),
  ]});
 }
}
async function main() {
 const mode = process.argv[2] || 'check';
 if (!['check', 'create'].includes(mode)) throw new Error('Use check or create.');
 const lib = process.env.FIREBASE_CLI_LIB;
 if (!lib) throw new Error('Set FIREBASE_CLI_LIB to the installed Firebase CLI lib directory.');
 const auth = require(path.join(lib, 'auth.js'));
 const account = auth.getProjectDefaultAccount(root);
 if (!account?.tokens?.refresh_token) throw new Error('Firebase CLI is not signed in.');
 const {access_token} = await auth.getAccessToken(account.tokens.refresh_token, ['https://www.googleapis.com/auth/cloud-platform']);
 async function api(resource, method='GET', body) {
  const response = await fetch('https://firestore.googleapis.com/v1/' + resource, {method, headers:{Authorization:'Bearer '+access_token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(30000)});
  const result = await response.json();
  if(!response.ok)throw new Error(result.error?.message || 'Index request failed: '+response.status);
  return result;
 }
 const existing = {};
 for (const group of new Set(definitions.map(index=>index.collectionGroup))) {
  const endpoint = `projects/qyan-om/databases/(default)/collectionGroups/${group}/indexes`;
  const rows=[];let token='';
  do {const page=await api(endpoint+(token?'?pageToken='+encodeURIComponent(token):''));rows.push(...(page.indexes||[]));token=page.nextPageToken||''}while(token);
  existing[group]={endpoint,rows};
 }
 for(const {collectionGroup,...definition} of definitions) {
  const {endpoint,rows}=existing[collectionGroup];
  const match=rows.find(index=>index.queryScope===definition.queryScope&&JSON.stringify(index.fields.filter(field=>field.fieldPath!=='__name__'))===JSON.stringify(definition.fields));
  const label=collectionGroup+': '+definition.fields.map(f=>f.fieldPath).join(', ');
  if(match)console.log(label+' — '+match.state);
  else if(mode==='check')console.log(label+' — MISSING');
  else {await api(endpoint,'POST',definition);console.log(label+' — CREATING')}
 }
}
main().catch(error=>{console.error(error.message);process.exitCode=1});
