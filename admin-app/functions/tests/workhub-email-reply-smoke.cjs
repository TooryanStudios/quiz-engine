const { Webhook } = require('svix')
const { readFileSync } = require('node:fs')

async function main() {
  const secret = readFileSync(process.argv[2], 'utf8').trim()
  const endpoint = process.argv[3]
  const payload = JSON.stringify({ type: 'workhub.integration.healthcheck' })
  const id = 'msg_workhub_smoke_' + Date.now()
  const now = new Date()
  const headers = { 'content-type': 'application/json', 'svix-id': id, 'svix-timestamp': String(Math.floor(now.getTime()/1000)), 'svix-signature': new Webhook(secret).sign(id, now, payload) }
  const signed = await fetch(endpoint, { method: 'POST', body: payload, headers, signal: AbortSignal.timeout(30000) })
  if (signed.status !== 200) throw new Error('Signed health check failed: HTTP ' + signed.status)
  const unsigned = await fetch(endpoint, { method: 'POST', body: payload, headers: { 'content-type': 'application/json' }, signal: AbortSignal.timeout(30000) })
  if (unsigned.status !== 401) throw new Error('Unsigned request was not rejected: HTTP ' + unsigned.status)
  console.log('Live webhook: valid signature accepted (200); unsigned request rejected (401). No messages or emails created.')
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
