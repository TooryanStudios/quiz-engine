import { useEffect, useRef, useState } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { useLocation, useNavigate } from 'react-router-dom'
import { auth } from '../lib/firebase'
import type { ScanMode, ScanResult } from './openai'
import { subscribeMobileScannerResults } from './realtimeBridge'
import { AnswerContent } from './answerRenderer'
import './ScannerDesktop.css'

interface DesktopHistoryItem {
  id: string
  mode: ScanMode
  result: ScanResult | null
  scanMs: number
  totalMs: number
  createdAt: number
  ok: boolean
  error: string
}

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

function ResultsRole({
  answersOnly = false,
  onChangeRole,
}: {
  answersOnly?: boolean
  onChangeRole?: () => void
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const [lastMode, setLastMode] = useState<ScanMode | null>(null)
  const [lastResult, setLastResult] = useState<ScanResult | null>(null)
  const [lastScanMs, setLastScanMs] = useState<number | null>(null)
  const [lastTotalMs, setLastTotalMs] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mobileSyncState, setMobileSyncState] = useState<'idle' | 'connected' | 'no-auth'>('idle')
  const [lastMobileSyncAt, setLastMobileSyncAt] = useState<number | null>(null)
  const [history, setHistory] = useState<DesktopHistoryItem[]>([])
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null)
  const [authUser, setAuthUser] = useState<User | null>(null)
  const [authResolved, setAuthResolved] = useState(false)
  const lastMobileEventIdRef = useRef<string | null>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      setAuthUser(user)
      setAuthResolved(true)
    })
    return () => unsubscribe()
  }, [])

  const handleSignIn = () => {
    const returnTo = `${location.pathname}${location.search}`
    navigate('/login', { state: { returnTo } })
  }

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

        let parsedResult: ScanResult | null = null
        if (payload.ok) {
          if (payload.mode === 'reasoning') {
            parsedResult = {
              mode: 'reasoning',
              rawText: payload.rawText,
              answer: payload.answer,
              explanation: payload.explanation,
            }
          } else {
            parsedResult = {
              mode: 'simplified',
              rawText: payload.rawText,
            }
          }
        }

        const historyItem: DesktopHistoryItem = {
          id: payload.eventId,
          mode: payload.mode,
          result: parsedResult,
          scanMs: payload.scanMs,
          totalMs: payload.totalMs,
          createdAt: payload.publishedAtMs,
          ok: payload.ok,
          error: payload.error || '',
        }

        setHistory(current => [historyItem, ...current.filter(item => item.id !== historyItem.id)].slice(0, 24))
        setActiveHistoryId(historyItem.id)

        if (!payload.ok) {
          setLastResult(null)
          setError(payload.error || 'Mobile scan failed.')
          return
        }

        setError(null)
        setLastResult(parsedResult)
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
    !authResolved
      ? 'Checking authentication...'
      : mobileSyncState === 'connected'
      ? (lastMobileSyncAt
          ? `Connected. Last mobile update at ${new Date(lastMobileSyncAt).toLocaleTimeString()}.`
          : 'Connected. Waiting for mobile scanner results.')
      : mobileSyncState === 'no-auth'
        ? 'Sign in on both mobile and desktop with the same account to sync live results.'
        : 'Initializing mobile live sync...'

  const authText = !authResolved
    ? 'Checking account...'
    : authUser
      ? `Signed in: ${authUser.email || authUser.displayName || authUser.uid}`
      : 'Not signed in. Sign in on mobile and desktop with the same account for live sync.'

  const syncIndicatorClass =
    mobileSyncState === 'connected'
      ? 'connected'
      : mobileSyncState === 'no-auth'
        ? 'no-auth'
        : 'idle'

  const latestReaderText = lastResult
    ? (lastResult.mode === 'reasoning'
        ? (lastResult.answer || 'No answer detected')
        : (lastResult.rawText || 'No text detected'))
    : null

  const openHistoryItem = (item: DesktopHistoryItem) => {
    setActiveHistoryId(item.id)
    setLastMode(item.mode)
    setLastScanMs(item.scanMs)
    setLastTotalMs(item.totalMs)
    setLastMobileSyncAt(item.createdAt)

    if (!item.ok) {
      setLastResult(null)
      setError(item.error || 'Mobile scan failed.')
      return
    }

    setError(null)
    setLastResult(item.result)
  }

  return (
    <div className="scd-results-root">
      <header className="scd-header">
        <div>
          <h2>{answersOnly ? 'Reader' : 'Desktop Scanner'}</h2>
          <p>{answersOnly ? 'Live answers from scanner.' : 'Live results from mobile scanner via Firebase.'}</p>
        </div>
        {onChangeRole ? (
          <button className="scd-role-btn" onClick={onChangeRole}>Change Role</button>
        ) : null}
      </header>

      <section className="scd-auth-box">
        <p>{authText}</p>
        {!authUser && authResolved ? (
          <button className="scd-auth-btn" onClick={handleSignIn}>Sign In</button>
        ) : null}
      </section>

      <section className="scd-live-sync-box">
        <strong>
          <span className={`scd-sync-dot ${syncIndicatorClass}`} />
          Mobile Live Sync
        </strong>
        <p>{mobileSyncText}</p>
      </section>

      {!answersOnly && history.length > 0 ? (
        <section className="scd-history-strip">
          {history.map(item => {
            const isReasoning = item.mode === 'reasoning'
            const cardTitle = item.ok
              ? (isReasoning
                  ? (item.result?.mode === 'reasoning' ? item.result.answer || 'No answer' : 'No answer')
                  : (item.result?.rawText || 'No text'))
              : (item.error || 'Scan failed')

            return (
              <button
                key={item.id}
                className={`scd-history-card${activeHistoryId === item.id ? ' active' : ''}`}
                onClick={() => openHistoryItem(item)}
              >
                <p className="scd-history-time">{new Date(item.createdAt).toLocaleTimeString()}</p>
                <p className="scd-history-title">{cardTitle}</p>
                <p className="scd-history-meta">{isReasoning ? 'Reasoning' : 'Simplified'}</p>
              </button>
            )
          })}
        </section>
      ) : null}

      {answersOnly ? (
        <section className="scd-answer-hero scd-answer-hero-reader">
          <p className="scd-answer-hero-label">Latest Output</p>
          <AnswerContent
            answer={latestReaderText || 'Waiting for scanner result...'}
            className="scd-answer-hero-text scd-answer-hero-text-reader"
          />
        </section>
      ) : (
        lastResult?.mode === 'reasoning' ? (
          <section className="scd-answer-hero">
            <p className="scd-answer-hero-label">Answer</p>
            <AnswerContent answer={lastResult.answer || 'No answer detected'} className="scd-answer-hero-text" />
          </section>
        ) : null
      )}

      {!answersOnly ? (
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
      ) : null}

      {!answersOnly && lastMode ? <p className="scd-live">Last mode: {lastMode === 'reasoning' ? 'Reasoning' : 'Simplified'}</p> : null}
      {error ? <p className="scd-error">{error}</p> : null}
      {!answersOnly && lastResult ? <ResultView result={lastResult} /> : null}
      {!answersOnly && !lastResult && !error ? <p className="scd-empty">No mobile result received yet.</p> : null}
    </div>
  )
}

export function ScannerDesktopPage({
  answersOnly,
  onChangeRole,
}: {
  answersOnly?: boolean
  onChangeRole?: () => void
}) {
  return <ResultsRole answersOnly={answersOnly} onChangeRole={onChangeRole} />
}
