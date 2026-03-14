import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

const projectRoot = resolve(import.meta.dirname, '..')
const outputFile = resolve(projectRoot, 'src', 'buildInfo.ts')

const now = new Date()
const pad = (value) => String(value).padStart(2, '0')
const yyyy = now.getUTCFullYear()
const mm = pad(now.getUTCMonth() + 1)
const dd = pad(now.getUTCDate())
const hh = pad(now.getUTCHours())
const mi = pad(now.getUTCMinutes())
const ss = pad(now.getUTCSeconds())

let previousBuildNumber = 0
if (existsSync(outputFile)) {
  const previousContent = readFileSync(outputFile, 'utf8')
  const match = previousContent.match(/BUILD_NUMBER = '([^']+)'/)
  if (match) {
    const rawValue = match[1]
    const numericValue = Number(rawValue)
    const isShortIncremental = /^\d{1,6}$/.test(rawValue)
    if (isShortIncremental && Number.isFinite(numericValue) && numericValue >= 0) {
      previousBuildNumber = numericValue
    }
  }
}

const buildNumber = String(previousBuildNumber + 1)
const buildTimeUtc = `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss} UTC`

mkdirSync(dirname(outputFile), { recursive: true })
writeFileSync(
  outputFile,
  `export const BUILD_NUMBER = '${buildNumber}'\nexport const BUILD_TIME_UTC = '${buildTimeUtc}'\n`,
  'utf8',
)

console.log(`Stamped build ${buildNumber} at ${buildTimeUtc}`)
