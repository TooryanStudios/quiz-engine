import { cp, mkdir, rm, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const root = path.resolve(__dirname, '..')

const sourceDir = path.join(root, 'node_modules', 'tinymce')
const destinationDir = path.join(root, 'public', 'tinymce')

async function exists(targetPath) {
  try {
    await stat(targetPath)
    return true
  } catch {
    return false
  }
}

async function syncTinyMceAssets() {
  const sourceExists = await exists(sourceDir)
  if (!sourceExists) {
    console.warn(`[sync:tinymce] Skipped: source not found at ${sourceDir}`)
    return
  }

  await mkdir(path.dirname(destinationDir), { recursive: true })
  await rm(destinationDir, { recursive: true, force: true })
  await cp(sourceDir, destinationDir, { recursive: true, force: true })

  console.log(`[sync:tinymce] Copied TinyMCE assets to ${destinationDir}`)
}

syncTinyMceAssets().catch((error) => {
  console.error('[sync:tinymce] Failed to sync TinyMCE assets:', error)
  process.exitCode = 1
})
