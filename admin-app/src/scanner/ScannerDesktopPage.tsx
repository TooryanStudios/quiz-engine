import { useEffect, useRef, useState } from 'react'
import type { ScanMode, ScanResult } from './openai'
import { subscribeMobileScannerResults } from './realtimeBridge'
import './ScannerDesktop.css'

function formatMs(ms: number) {
  if (ms < 1000) return `${Math.round(ms)} ms`
  return `${(ms / 1000).toFixed(2)} s`
}

function ResultView({
  result,
}: {
  result: ScanResult
}) {
  if (result.mode === 'reasoning') {
    return (
      <div className="scd-result-block">
        <h3>Answer</h3>
        <p className="scd-answer">{result.answer || 'No answer detected'}</p>
        {result.explanation ? <p className="scd-explanation">{result.explanation}</p> : null}
        <h4>Detected Text</h4>
        <pre>{result.rawText || '(none)'}</pre>
      </div>
    )
  }

  return (
    <div className="scd-result-block">
      <h3>Detected Text</h3>
      <pre>{result.rawText || '(none)'}</pre>
    </div>
  )
}

function ResultsRole() {
  const [lastMode, setLastMode] = useState<ScanMode | null>(null)
  const [lastResult, setLastResult] = useState<ScanResult | null>(null)
  const [lastScanMs, setLastScanMs] = useState<number | null>(null)
  const [lastTotalMs, setLastTotalMs] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mobileSyncState, setMobileSyncState] = useState<'idle' | 'connected' | 'no-auth'>('idle')
  const [lastMobileSyncAt, setLastMobileSyncAt] = useState<number | null>(null)
  const lastMobileEventIdRef = useRef<string | null>(null)

  useEffect(() => {
    const unsubscribe = subscribeMobileScannerResults(
      payload => {
        if (!payload) return
        if (payload.eventId === lastMobileEventIdRef.current) return
        lastMobileEventIdRef.current = payload.eventId

        setMobileSyncState('connected')
        setLastMobileSyncAt(payload.publishedAtMs)
        setLastScanMs(payload.scanMs)
        setLastTotalMs(payload.totalMs)
        setLastMode(payload.mode)

        if (!payload.ok) {
          setLastResult(null)
          setError(payload.error || 'Mobile scan failed.')
          return
        }

        setError(null)

        if (payload.mode === 'reasoning') {
          setLastResult({
            mode: 'reasoning',
            rawText: payload.rawText,
            answer: payload.answer,
            explanation: payload.explanation,
          })
        } else {
          setLastResult({
            mode: 'simplified',
            rawText: payload.rawText,
          })
        }
      },
      () => {
        setMobileSyncState('no-auth')
      },
      syncError => {
        setMobileSyncState('idle')
        setError(current => current ?? `Mobile sync error: ${syncError}`)
      },
    )

    return () => unsubscribe()
  }, [])

  const mobileSyncText =
    mobileSyncState === 'connected'
      ? (lastMobileSyncAt
          ? `Connected. Last mobile update at ${new Date(lastMobileSyncAt).toLocaleTimeString()}.`
          : 'Connected. Waiting for mobile scanner results.')
      : mobileSyncState === 'no-auth'
        ? 'Sign in on both mobile and desktop with the same account to sync live results.'
        : 'Initializing mobile live sync...'

  return (
    <div className="scd-results-root">
      <header>
        <h2>Desktop Scanner</h2>
        <p>Live results from mobile scanner via Firebase.</p>
      </header>

      <section className="scd-live-sync-box">
        <strong>Mobile Live Sync</strong>
        <p>{mobileSyncText}</p>
      </section>

      <section className="scd-metrics">
        <div>
          <span>Total Time</span>
          <strong>{lastTotalMs === null ? '-' : formatMs(lastTotalMs)}</strong>
        </div>
        <div>
          <span>Scan Time</span>
          <strong>{lastScanMs === null ? '-' : formatMs(lastScanMs)}</strong>
        </div>
      </section>

      {lastMode ? <p className="scd-live">Last mode: {lastMode === 'reasoning' ? 'Reasoning' : 'Simplified'}</p> : null}
      {error ? <p className="scd-error">{error}</p> : null}
      {lastResult ? <ResultView result={lastResult} /> : null}
      {!lastResult && !error ? <p className="scd-empty">No mobile result received yet.</p> : null}
    </div>
  )
}

export function ScannerDesktopPage() {
  return <ResultsRole />
}
