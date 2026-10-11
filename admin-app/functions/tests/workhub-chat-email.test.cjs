const { test } = require('node:test')
const assert = require('node:assert/strict')
const { buildChatEmail } = require('../lib/workhubChatEmail.js')
const { listEmailFiles, providerDownloadUrl, autoSaveEmailFiles } = require('../lib/workhubEmailFiles.js')

test('chat email presents sender and message once, with short subject and escaped content', () => {
  const arabic = '\u0645\u0631\u062d\u0628\u0627'
  const email = buildChatEmail('Muneer', arabic + ' <script>\nhttps://drive.google.com/file/test', false, 'https://qyan-om.web.app/messages')
  assert.equal(email.subject, 'Muneer: ' + arabic + ' <script> [link]')
  assert.equal(email.html.match(/Muneer/g).length, 1)
  assert.equal(email.html.split(arabic).length - 1, 1)
  assert.ok(email.html.includes('&lt;script&gt;'))
  assert.ok(email.html.includes('href="https://drive.google.com/file/test"'))
  assert.ok(buildChatEmail('Sender', 'Text', true, 'https://example.com').subject.startsWith('Urgent'))
})

test('attachment metadata stays with provider and supports multiple pages without downloading files', async () => {
  const paths = []
  const files = await listEmailFiles('email-id', async path => {
    paths.push(path)
    const second = path.includes('?after=')
    return { has_more: !second, data: [{ id: second ? 'video' : 'image', filename: second ? 'clip.mp4' : 'photo.png', content_type: second ? 'video/mp4' : 'image/png', size: 4, download_url: 'https://provider.example/signed-url' }] }
  })
  assert.equal(paths.length, 2)
  assert.equal(files[0].provider, 'resend')
  assert.equal(files[1].name, 'clip.mp4')
  assert.equal(files[0].download_url, undefined)
})

test('accepts alternate HTTPS CDN URLs returned by the provider API', () => {
  assert.equal(providerDownloadUrl('https://storage.example.com/signed-file').hostname, 'storage.example.com')
  assert.throws(() => providerDownloadUrl('http://example.com/file'), /Invalid provider/)
  assert.throws(() => providerDownloadUrl('https://user:password@example.com/file'), /Invalid provider/)
})

test('subjects clip long sender names and messages without newlines', () => {
  const email = buildChatEmail('Sender'.repeat(20), 'Message\n'.repeat(50), false, 'https://example.com')
  assert.ok([...email.subject].length <= 98)
  assert.ok(!email.subject.includes('\n'))
  assert.ok(email.subject.endsWith('…'))
})

test('automatic Drive saving preserves saved files and continues after one file fails', async () => {
  const attempted = []
  const failed = []
  const error = await autoSaveEmailFiles([{ id: 'saved', driveUrl: 'https://drive.google.com/file/d/saved/view' }, { id: 'broken' }, { id: 'good' }], async file => {
    attempted.push(file.id)
    if (file.id === 'broken') throw new Error('Temporary Drive failure')
  }, async (file, state) => { if (state === 'failed') failed.push(file.id) })
  assert.deepEqual(attempted, ['broken', 'good'])
  assert.deepEqual(failed, ['broken'])
  assert.equal(error.message, 'Temporary Drive failure')
})
