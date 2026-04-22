import { Component, type ErrorInfo, type ReactNode } from 'react'
import { reportError } from '../lib/errorReporting'

interface FeatureErrorBoundaryProps {
  children: ReactNode
  name: string
  variant?: 'feature' | 'route'
  resetKey?: string | number | null
}

interface FeatureErrorBoundaryState {
  hasError: boolean
}

function shouldInjectCrash(name: string): boolean {
  if (!import.meta.env.DEV) return false
  if (typeof window === 'undefined') return false

  const params = new URLSearchParams(window.location.search)
  const isEnabled = params.get('qyanEnableCrash') === '1'
    || window.sessionStorage.getItem('qyan:enableCrashInjection') === '1'
  if (!isEnabled) return false

  const fromQuery = params.get('qyanCrash') || ''
  const fromStorage = window.localStorage.getItem('qyan:crashTargets') || ''
  const raw = `${fromQuery},${fromStorage}`
  const targets = raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)

  if (targets.length === 0) return false
  if (targets.includes('all')) return true
  return targets.includes(name)
}

function FaultInjectionGate({ name, children }: { name: string; children: ReactNode }) {
  if (shouldInjectCrash(name)) {
    throw new Error(`Injected crash for ${name}`)
  }
  return <>{children}</>
}

export class FeatureErrorBoundary extends Component<FeatureErrorBoundaryProps, FeatureErrorBoundaryState> {
  public state: FeatureErrorBoundaryState = { hasError: false }

  public static getDerivedStateFromError(_: Error): FeatureErrorBoundaryState {
    return { hasError: true }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    reportError(this.props.variant === 'route' ? 'route' : 'feature', this.props.name, error, {
      componentStack: errorInfo.componentStack,
    })
  }

  public componentDidUpdate(prevProps: FeatureErrorBoundaryProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false })
    }
  }

  private handleRetry = () => {
    this.setState({ hasError: false })
  }

  public render() {
    if (!this.state.hasError) {
      return (
        <FaultInjectionGate name={this.props.name}>
          {this.props.children}
        </FaultInjectionGate>
      )
    }

    const isRoute = this.props.variant === 'route'
    return (
      <section className={`feature-error-boundary${isRoute ? ' is-route' : ''}`} role="alert" aria-live="polite">
        <h3>{isRoute ? 'This page hit an error.' : 'This section hit an error.'}</h3>
        <p>
          {isRoute
            ? 'You can continue using the app and try this page again.'
            : 'The rest of the page is still working.'}
        </p>
        <button type="button" onClick={this.handleRetry}>Try again</button>
      </section>
    )
  }
}
