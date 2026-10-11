const { test } = require('node:test')
const assert = require('node:assert/strict')
const { readEmailWorkspace } = require('../lib/workhubEmailContext.js')

test('general chat can prepare email context without reading a reserved document', async () => {
  const read = async () => { throw new Error('Firestore rejected reserved document') }
  assert.equal(await readEmailWorkspace('__communication_global__', read), null)
  assert.equal(await readEmailWorkspace('', read), null)
})

test('workspace messages retain their workspace branding and propagate database failures', async () => {
  const workspace = { name: 'Animation workspace' }
  assert.equal(await readEmailWorkspace('real-workspace', async path => {
    assert.equal(path, 'workhub_workspaces/real-workspace')
    return workspace
  }), workspace)
  await assert.rejects(readEmailWorkspace('real-workspace', async () => {
    throw new Error('Database unavailable')
  }), /Database unavailable/)
})
