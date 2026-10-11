// Publish only the standalone WorkHub entry and assets, preserving the live site's other files.
const fs = require('node:fs');
const path = require('node:path');
const zlib = require('node:zlib');
const crypto = require('node:crypto');
const dotenv = require('dotenv');
const admin = require('firebase-admin');
const { buildWorkhubLoginGateway } = require('./workhub-login-gateway.cjs');
const root = path.resolve(__dirname, '..');
for (const file of ['.env.local', '.env.server']) dotenv.config({ path: path.join(root, file), quiet: true });
const statePath = path.join(root, '.workhub-hosting-release.json');
const apiOrigin = 'https://firebasehosting.googleapis.com/v1beta1';
const site = 'qyan-om';
async function main() {
 const mode = process.argv[2] || 'inspect';
 let keyPath = process.env.FIREBASE_ADMIN_KEY_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;
 if (!path.isAbsolute(keyPath)) keyPath = path.resolve(root, keyPath);
 const credential = admin.credential.cert(JSON.parse(fs.readFileSync(keyPath, 'utf8')));
 let { access_token } = await credential.getAccessToken();
 if (process.env.FIREBASE_CLI_LIB) {
  const auth = require(path.join(process.env.FIREBASE_CLI_LIB, 'auth.js'));
  const account = auth.getProjectDefaultAccount(root);
  if (!account?.tokens?.refresh_token) throw new Error('Firebase CLI is not signed in.');
  ({ access_token } = await auth.getAccessToken(account.tokens.refresh_token, ['https://www.googleapis.com/auth/cloud-platform']));
 }
 async function api(resource, method = 'GET', body) {
  const response = await fetch(`${apiOrigin}/${resource}`, { method, headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(60000) });
  const raw = await response.text();
  let data;
  try { data = JSON.parse(raw); } catch { throw new Error(`${method} ${resource}: unexpected response (${response.status}, ${response.headers.get('content-type')})`); }
  if (!response.ok) throw new Error(`${method} ${resource}: ${response.status} ${data.error?.message || ''}`);
  return data;
 }
 console.log('Reading live Hosting release.');
 const live = await api(`sites/${site}/channels/live`);
 const originalVersion = live.release.version.name;
 const original = await api(originalVersion);
 if (mode === 'inspect') {
  console.log(JSON.stringify({ version: originalVersion, config: original.config }));
  return;
 }
 const previous = [];
 let pageToken = '';
 do {
  const page = await api(`${originalVersion}/files?status=ACTIVE&pageSize=1000${pageToken ? '&pageToken=' + encodeURIComponent(pageToken) : ''}`);
  previous.push(...(page.files || [])); pageToken = page.nextPageToken || '';
 } while(pageToken);
 if (!previous.some(file => file.path === '/index.html')) throw new Error('Live manifest missing index.html; refusing to replace hosting.');
 const files = Object.fromEntries(previous.map(file => [file.path, file.hash]));
 console.log(`Read ${previous.length} existing Hosting files.`);
 const uploads = new Map();
 const buildDir = path.join(root, 'dist-workhub-hosting');
 function walk(directory) {
  for(const entry of fs.readdirSync(directory, {withFileTypes:true})) {
   const file = path.join(directory, entry.name);
   if(entry.isDirectory()) walk(file);
   else {
    const rel = path.relative(buildDir, file).split(path.sep).join('/');
    if(rel.endsWith('.map')) continue;
    const data = zlib.gzipSync(fs.readFileSync(file), {level:9});
    const hash = crypto.createHash('sha256').update(data).digest('hex');
    files['/workhub-app/' + rel] = hash; uploads.set(hash, data);
   }
  }
 }
 walk(buildDir);
 const brandingDir = process.env.WORKHUB_BRANDING_BUILD ? path.resolve(root, process.env.WORKHUB_BRANDING_BUILD) : null;
 function addFile(file, destination) {
  const data = zlib.gzipSync(fs.readFileSync(file), { level: 9 });
  const hash = crypto.createHash('sha256').update(data).digest('hex');
  files[destination] = hash; uploads.set(hash, data);
 }
 if (brandingDir) {
  function addAssets(directory) {
   for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
    const file = path.join(directory, item.name);
    if (item.isDirectory()) addAssets(file);
    else if (!file.endsWith('.map')) addFile(file, '/' + path.relative(brandingDir, file).split(path.sep).join('/'));
   }
  }
  addAssets(path.join(brandingDir, 'assets'));
  addFile(path.join(brandingDir, 'index.html'), '/index.html');
  addFile(path.join(brandingDir, 'workhub.html'), '/workhub.html');
 }
 for (const rel of ['manifest.json', 'images/workhub-icon.svg', 'images/workhub-icon-192.png', 'images/workhub-icon-512.png', 'images/workhub-social.png', 'images/workhub-placeholder.svg']) {
  addFile(path.join(root, 'public', rel), '/' + rel);
 }
 // Use the currently published main shell so unrelated application changes are not deployed.
 let mainHtml;
 if (brandingDir) mainHtml = fs.readFileSync(path.join(brandingDir, 'index.html'), 'utf8');
 else {
  const mainResponse = await fetch(`https://${site}.web.app/index.html`, { cache: 'no-store', signal: AbortSignal.timeout(30000) });
  if (!mainResponse.ok) throw new Error('Could not read the live main application shell.');
  mainHtml = await mainResponse.text();
 }
 const loginGateway = buildWorkhubLoginGateway(mainHtml);
 const loginData = zlib.gzipSync(Buffer.from(loginGateway), { level: 9 });
 const loginHash = crypto.createHash('sha256').update(loginData).digest('hex');
 files['/workhub-app/legacy-login.html'] = loginHash;
 uploads.set(loginHash, loginData);
 const entry = fs.readFileSync(path.join(buildDir, 'index.html'), 'utf8');
 if(!entry.includes('/workhub-app/assets/')) throw new Error('WorkHub build does not use its isolated asset prefix.');
 const config = { ...original.config, rewrites: [
  { glob: '/workhub', path: '/workhub-app/index.html' },
  { glob: '/workhub/**', path: '/workhub-app/index.html' },
  { glob: '/login', path: '/workhub-app/legacy-login.html' },
  ...(original.config?.rewrites || []).filter(rule => !['/workhub','/workhub/**','/login'].includes(rule.glob))
 ], headers: [
  { glob: '/workhub-app/assets/**', headers: { 'Cache-Control': 'public, max-age=31536000, immutable' } },
  { glob: '/workhub', headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' } },
  { glob: '/workhub/**', headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' } },
  { glob: '/workhub-app/index.html', headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' } },
  { glob: '/login', headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' } },
  { glob: '/workhub-app/legacy-login.html', headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' } },
  ...(original.config?.headers || []).filter(rule => !['/workhub-app/assets/**','/workhub','/workhub/**','/workhub-app/index.html','/login','/workhub-app/legacy-login.html'].includes(rule.glob))
 ] };
 if(mode === 'plan') { console.log(JSON.stringify({previousVersion:originalVersion,preservedFiles:previous.length,newAssets:uploads.size,rewrites:config.rewrites}));return; }
 if(mode !== 'release') throw new Error('Use inspect, plan, or release.');
 const version = await api(`sites/${site}/versions`, 'POST', {config});
 fs.writeFileSync(statePath, JSON.stringify({previousVersion: originalVersion, version:version.name, status:'preparing'},null,2));
 const entries = Object.entries(files);
 const required = new Set(); let uploadUrl;
 for(let i=0;i<entries.length;i+=1000) {
  const populated = await api(`${version.name}:populateFiles`, 'POST', {files:Object.fromEntries(entries.slice(i,i+1000))});
  uploadUrl = populated.uploadUrl;
  for(const hash of populated.uploadRequiredHashes || []) required.add(hash);
 }
 if([...required].some(hash=>!uploads.has(hash))) throw new Error('Hosting requires an existing asset not present locally; refusing to finalize.');
 console.log(`Preserving ${previous.length} files; uploading ${required.size} WorkHub assets.`);
 const hashes=[...required];
 for(let i=0;i<hashes.length;i+=6) await Promise.all(hashes.slice(i,i+6).map(async hash=>{
  const response=await fetch(`${uploadUrl}/${hash}`,{method:'POST',headers:{Authorization:`Bearer ${access_token}`,'Content-Type':'application/octet-stream'},body:uploads.get(hash),signal:AbortSignal.timeout(120000)});
  if(!response.ok) throw new Error(`Asset upload failed: ${response.status}`);
 }));
 await api(`${version.name}?updateMask=status`,'PATCH',{status:'FINALIZED'});
 const latest=await api(`sites/${site}/channels/live`);
 if(latest.release.version.name !== originalVersion) throw new Error('Another release changed the live site; refusing to overwrite.');
 const release=await api(`sites/${site}/channels/live/releases?versionName=${encodeURIComponent(version.name)}`,'POST',{message:'WorkHub user management and dedicated join flow; preserve other applications'});
 fs.writeFileSync(statePath,JSON.stringify({previousVersion:originalVersion,version:version.name,release:release.name,status:'released',preservedFiles:previous.length},null,2));
 console.log(JSON.stringify({release:release.name,version:version.name,previousVersion:originalVersion,preservedFiles:previous.length}));
}
main().catch(error=>{console.error(error.message);process.exitCode=1});
