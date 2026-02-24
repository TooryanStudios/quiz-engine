const admin = require('firebase-admin')
const fs = require('fs')
const path = require('path')

const sourceProjectId = process.argv[2] || 'quizengine-e7818'
const targetProjectId = process.argv[3] || 'qyan-om'
const sourceKeyPath = process.argv[4]
const targetKeyPath = process.argv[5]

function resolveCredential(keyPath) {
  if (!keyPath) return admin.credential.applicationDefault()
  const absolutePath = path.resolve(keyPath)
  const key = JSON.parse(fs.readFileSync(absolutePath, 'utf8'))
  return admin.credential.cert(key)
}

const sourceApp = admin.initializeApp(
  {
    credential: resolveCredential(sourceKeyPath),
    projectId: sourceProjectId,
  },
  'source',
)

const targetApp = admin.initializeApp(
  {
    credential: resolveCredential(targetKeyPath),
    projectId: targetProjectId,
  },
  'target',
)

const sourceDb = sourceApp.firestore()
const targetDb = targetApp.firestore()

let copiedDocs = 0
let copiedCollections = 0

async function copyDocumentByRef(sourceDocRef, writer) {
  const sourceSnap = await sourceDocRef.get()
  if (!sourceSnap.exists) return

  writer.set(targetDb.doc(sourceDocRef.path), sourceSnap.data())
  copiedDocs += 1

  if (copiedDocs % 100 === 0) {
    console.log(`Copied ${copiedDocs} documents...`)
  }

  const subcollections = await sourceDocRef.listCollections()
  for (const subcollection of subcollections) {
    await copyCollectionByRef(subcollection, writer)
  }
}

async function copyCollectionByRef(sourceCollectionRef, writer) {
  copiedCollections += 1
  console.log(`Copying collection: ${sourceCollectionRef.path}`)

  const sourceDocRefs = await sourceCollectionRef.listDocuments()
  for (const sourceDocRef of sourceDocRefs) {
    await copyDocumentByRef(sourceDocRef, writer)
  }
}

async function migrateAll() {
  console.log(`Starting Firestore migration ${sourceProjectId} -> ${targetProjectId}`)

  const writer = targetDb.bulkWriter()
  writer.onWriteError((error) => {
    console.error('Write error:', error.code, error.message)
    if (error.failedAttempts < 5) {
      return true
    }
    return false
  })

  const rootCollections = await sourceDb.listCollections()
  if (!rootCollections.length) {
    console.log('No root collections found in source project.')
    return
  }

  for (const rootCollection of rootCollections) {
    await copyCollectionByRef(rootCollection, writer)
  }

  await writer.close()
  console.log('Firestore migration complete.')
  console.log(`Collections traversed: ${copiedCollections}`)
  console.log(`Documents copied: ${copiedDocs}`)
}

migrateAll()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Migration failed:', error)
    process.exit(1)
  })
