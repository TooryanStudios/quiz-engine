export type ErrorReportScope = 'app' | 'route' | 'feature' | 'async'

export function reportError(scope: ErrorReportScope, name: string, error: unknown, metadata?: Record<string, unknown>) {
  const payload = {
    scope,
    name,
    metadata: metadata || {},
    at: new Date().toISOString(),
  }

  console.error(`[ErrorReport:${scope}:${name}]`, payload, error)

  const captureException = (window as Window & {
    Sentry?: { captureException?: (err: unknown, context?: Record<string, unknown>) => void }
  }).Sentry?.captureException

  if (captureException) {
    captureException(error, {
      tags: { scope, name },
      extra: payload,
    })
  }
}
