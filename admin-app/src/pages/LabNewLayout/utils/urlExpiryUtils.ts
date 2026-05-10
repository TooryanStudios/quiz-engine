/**
 * URL Expiry and Generation Duration Utilities
 * Handles calculations for signed URL expiry (24h) and generation metrics
 */

const URL_EXPIRY_HOURS = 24
const WARNING_THRESHOLD_HOURS = 3

export interface ExpiryInfo {
  expiryTime: number // timestamp when URL expires
  hoursRemaining: number
  minutesRemaining: number
  shouldShowWarning: boolean // true if < 3 hours remaining
  isExpired: boolean
  formattedTimeRemaining: string // e.g., "2h 30m" or "30m"
}

export interface GenerationMetrics {
  durationMs: number
  durationSeconds: number
  durationFormatted: string // e.g., "1m 23s"
}

/**
 * Calculate expiry info for a provider-signed URL
 * Provider URLs expire after 24 hours from submission
 * @param submittedAt - timestamp when generation was submitted (milliseconds)
 * @returns ExpiryInfo object with expiry calculations
 */
export function calculateUrlExpiry(submittedAt: number): ExpiryInfo {
  const now = Date.now()
  const expiryTime = submittedAt + URL_EXPIRY_HOURS * 60 * 60 * 1000
  const remainingMs = expiryTime - now

  const isExpired = remainingMs <= 0
  const totalMinutesRemaining = Math.floor(remainingMs / (60 * 1000))
  const hoursRemaining = Math.floor(totalMinutesRemaining / 60)
  const minutesRemaining = totalMinutesRemaining % 60

  let formattedTimeRemaining = ''
  if (isExpired) {
    formattedTimeRemaining = 'Expired'
  } else if (hoursRemaining > 0) {
    formattedTimeRemaining = `${hoursRemaining}h ${minutesRemaining}m`
  } else {
    formattedTimeRemaining = `${minutesRemaining}m`
  }

  return {
    expiryTime,
    hoursRemaining,
    minutesRemaining,
    shouldShowWarning: !isExpired && hoursRemaining < WARNING_THRESHOLD_HOURS,
    isExpired,
    formattedTimeRemaining,
  }
}

/**
 * Calculate generation metrics (duration from submit to completion)
 * @param submittedAt - timestamp when generation was submitted (milliseconds)
 * @param completedAt - timestamp when generation completed (milliseconds)
 * @returns GenerationMetrics object with duration calculations
 */
export function calculateGenerationMetrics(
  submittedAt: number,
  completedAt: number,
): GenerationMetrics {
  const durationMs = completedAt - submittedAt
  const durationSeconds = Math.floor(durationMs / 1000)
  const minutes = Math.floor(durationSeconds / 60)
  const seconds = durationSeconds % 60

  let durationFormatted = ''
  if (minutes > 0) {
    durationFormatted = `${minutes}m ${seconds}s`
  } else {
    durationFormatted = `${seconds}s`
  }

  return {
    durationMs,
    durationSeconds,
    durationFormatted,
  }
}

/**
 * Get human-readable expiry status label
 * @param expiryInfo - ExpiryInfo object from calculateUrlExpiry
 * @returns string label for display
 */
export function getExpiryStatusLabel(expiryInfo: ExpiryInfo): string {
  if (expiryInfo.isExpired) {
    return 'Link Expired'
  }

  if (expiryInfo.hoursRemaining === 0) {
    return `${expiryInfo.minutesRemaining}m left`
  }

  return `${expiryInfo.hoursRemaining}h left`
}

/**
 * Get CSS class for expiry status styling
 * @param expiryInfo - ExpiryInfo object from calculateUrlExpiry
 * @returns CSS class name for styling
 */
export function getExpiryStatusClass(expiryInfo: ExpiryInfo): string {
  if (expiryInfo.isExpired) {
    return 'expiry-status--expired'
  }

  if (expiryInfo.shouldShowWarning) {
    return 'expiry-status--warning'
  }

  return 'expiry-status--ok'
}

/**
 * Format model display name from API ID format
 * Converts "bytedance/seedance-2.0-fast" to "Bytedance Seedance 2.0 Fast"
 * @param modelId - model identifier from API
 * @returns human-readable model display name
 */
export function formatModelName(modelId: string): string {
  if (!modelId) return ''
  
  // Split by "/" and take the last part
  const parts = modelId.split('/')
  const modelName = parts[parts.length - 1]
  
  // Split by "-" and capitalize each word
  const words = modelName.split('-')
  const formatted = words
    .map(word => {
      // Handle special cases like "i2v" → "I2v", "t2v" → "T2v", "vsr" → "Vsr"
      if (word.match(/^[a-z]\d[a-z]$/i)) {
        return word.charAt(0).toUpperCase() + word.slice(1)
      }
      // Handle numeric-only words (like "2", "0") - keep as is
      if (word.match(/^\d+(\.\d+)?$/)) {
        return word
      }
      // Capitalize first letter, lowercase the rest
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(' ')
  
  return formatted
}
