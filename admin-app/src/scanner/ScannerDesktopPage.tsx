import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { scanImage, type ScanMode, type ScanResult } from './openai'
import { subscribeMobileScannerResults } from './realtimeBridge'
import './ScannerDesktop.css'

const ENV_API_KEY = (import.meta.env.VITE_OPENAI_API_KEY as string | undefined) ?? ''
const LS_KEY = 'scanner_openai_key'
const LS_MODE = 'scanner_mode'
const CHANNEL_NAME = 'scanner_desktop_channel_v1'

type ScanRequestMessage = {
  type: 'scan-request'
  requestId: string
  imageDataUrl: string
  createdAt: number
  requestedMode: ScanMode
}

type ScanResultMessage = {
  type: 'scan-result'
  requestId: string
  finishedAt: number
  mode: ScanMode
  scanMs: number
  totalMs: number
  ok: boolean
  error?: string
}

type DesktopMessage = ScanRequestMessage | ScanResultMessage

function createRequestId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

function isScanMode(value: unknown): value is ScanMode {
  return value === 'simplified' || value === 'reasoning'
}

function isDesktopMessage(value: unknown): value is DesktopMessage {
  if (!value || typeof value !== 'object') return false
  const maybe = value as { type?: unknown }
  return maybe.type === 'scan-request' || maybe.type === 'scan-result'
}

function readModePreference(): ScanMode {
  const stored = localStorage.getItem(LS_MODE)
  return isScanMode(stored) ? stored : 'simplified'
}

function publishDesktopMessage(message: DesktopMessage) {
  if (typeof window === 'undefined') return

  if ('BroadcastChannel' in window) {
    const channel = new BroadcastChannel(CHANNEL_NAME)
    channel.postMessage(message)
    channel.close()
    return
  }

  localStorage.setItem(CHANNEL_NAME, JSON.stringify({ ...message, nonce: Date.now() }))
  localStorage.removeItem(CHANNEL_NAME)
}

function useDesktopMessageBus(onMessage: (message: DesktopMessage) => void) {
  useEffect(() => {
    if (typeof window === 'undefined') return

    let channel: BroadcastChannel | null = null

    const handleIncoming = (payload: unknown) => {
      if (isDesktopMessage(payload)) onMessage(payload)
    }

    if ('BroadcastChannel' in window) {
      channel = new BroadcastChannel(CHANNEL_NAME)
      channel.onmessage = event => handleIncoming(event.data)
    }

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== CHANNEL_NAME || !event.newValue) return
      try {
        const payload = JSON.parse(event.newValue) as unknown
        handleIncoming(payload)
      } catch {
        // Ignore malformed storage payloads.
      }
    }

    window.addEventListener('storage', handleStorage)

    return () => {
      window.removeEventListener('storage', handleStorage)
      if (channel) channel.close()
    }
  }, [onMessage])
}

function formatMs(ms: number) {
  if (ms < 1000) return `${Math.round(ms)} ms`
  return `${(ms / 1000).toFixed(2)} s`
}

function openPopup(url: string, name: string, width: number, height: number, top: number, left: number) {
  const features = [
    'popup=yes',
    'resizable=yes',
    'scrollbars=no',
    `width=${width}`,
    `height=${height}`,
    `top=${top}`,
    `left=${left}`,
  ].join(',')

  return window.open(url, name, features)
}

function LauncherRole() {
  const [lastResult, setLastResult] = useState<ScanResultMessage | null>(null)

  const openCapture = useCallback(() => {
    const popup = openPopup('/scanner/desktop?role=capture', 'scanner_capture_window', 190, 220, 60, 30)
    if (!popup) alert('Popup blocked. Please allow popups for this site.')
  }, [])

  const openResults = useCallback(() => {
    const popup = openPopup('/scanner/desktop?role=results', 'scanner_results_window', 560, 800, 50, 260)
    if (!popup) alert('Popup blocked. Please allow popups for this site.')
  }, [])

  const openBoth = useCallback(() => {
    openResults()
    openCapture()
  }, [openCapture, openResults])

  useDesktopMessageBus(
    useCallback((message: DesktopMessage) => {
      if (message.type === 'scan-result') {
        setLastResult(message)
      }
    }, []),
  )

  return (
    <div className="scd-root">
      <div className="scd-panel">
        <h1>Desktop Scanner</h1>
        <p>
          Launch a tiny floating capture button and a dedicated results window.
          The two windows communicate in real time.
        </p>

        <div className="scd-actions">
          <button onClick={openBoth}>Open Both Windows</button>
          <button onClick={openCapture}>Open Capture Button</button>
          <button onClick={openResults}>Open Results Window</button>
        </div>

        <div className="scd-status-box">
          <strong>Last Scan Time</strong>
          {lastResult ? (
            <p>
              {lastResult.ok ? 'Completed' : 'Failed'} in {formatMs(lastResult.totalMs)}
              {' '}
              (scan {formatMs(lastResult.scanMs)}).
            </p>
          ) : (
            <p>No scans yet. Open both windows and send an image.</p>
          )}
        </div>
      </div>
    </div>
  )
}

function CaptureRole() {
  const fileRef = useRef<HTMLInputElement | null>(null)
  const [status, setStatus] = useState('Ready')
  const [lastRequestId, setLastRequestId] = useState<string | null>(null)

  const sendImage = useCallback((imageDataUrl: string) => {
    const requestId = createRequestId()
    setLastRequestId(requestId)
    setStatus('Sent')

    publishDesktopMessage({
      type: 'scan-request',
      requestId,
      imageDataUrl,
      createdAt: Date.now(),
      requestedMode: readModePreference(),
    })
  }, [])

  const onFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const payload = reader.result
      if (typeof payload === 'string') sendImage(payload)
      event.target.value = ''
    }
    reader.onerror = () => setStatus('Failed to read file')
    reader.readAsDataURL(file)
  }, [sendImage])

  useDesktopMessageBus(
    useCallback((message: DesktopMessage) => {
      if (message.type !== 'scan-result') return
      if (!lastRequestId || message.requestId !== lastRequestId) return
      setStatus(message.ok ? `Done in ${formatMs(message.totalMs)}` : 'Scan failed')
    }, [lastRequestId]),
  )

  return (
    <div className="scd-capture-root">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={onFileChange}
        className="scd-hidden-input"
      />
      <button
        className="scd-capture-btn"
        onClick={() => fileRef.current?.click()}
        aria-label="Choose image and send"
        title="Choose image and send"
      >
        Scan
      </button>
      <p className="scd-capture-status">{status}</p>
    </div>
  )
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
  const [mode, setMode] = useState<ScanMode>(() => readModePreference())
  const [lsKey, setLsKey] = useState<string>(() => localStorage.getItem(LS_KEY) ?? '')
  const [keyDraft, setKeyDraft] = useState(lsKey)
  const [isScanning, setIsScanning] = useState(false)
  const [lastImage, setLastImage] = useState<string | null>(null)
  const [lastResult, setLastResult] = useState<ScanResult | null>(null)
  const [lastScanMs, setLastScanMs] = useState<number | null>(null)
  const [lastTotalMs, setLastTotalMs] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [mobileSyncState, setMobileSyncState] = useState<'idle' | 'connected' | 'no-auth'>('idle')
  const [lastMobileSyncAt, setLastMobileSyncAt] = useState<number | null>(null)
  const busyRef = useRef(false)
  const lastMobileEventIdRef = useRef<string | null>(null)

  const apiKey = ENV_API_KEY || lsKey

  const saveKey = useCallback(() => {
    const next = keyDraft.trim()
    localStorage.setItem(LS_KEY, next)
    setLsKey(next)
  }, [keyDraft])

  const saveMode = useCallback((nextMode: ScanMode) => {
    localStorage.setItem(LS_MODE, nextMode)
    setMode(nextMode)
  }, [])

  const processRequest = useCallback(async (message: ScanRequestMessage) => {
    if (busyRef.current) return
    busyRef.current = true

    const activeMode = message.requestedMode || mode
    setMode(activeMode)
    localStorage.setItem(LS_MODE, activeMode)
    setIsScanning(true)
    setError(null)
    setLastImage(message.imageDataUrl)
    setLastResult(null)

    if (!apiKey) {
      const err = 'Missing API key. Add it in this results window.'
      setError(err)
      setIsScanning(false)
      busyRef.current = false
      publishDesktopMessage({
        type: 'scan-result',
        requestId: message.requestId,
        finishedAt: Date.now(),
        mode: activeMode,
        scanMs: 0,
        totalMs: Date.now() - message.createdAt,
        ok: false,
        error: err,
      })
      return
    }

    const scanStart = performance.now()
    try {
      const result = await scanImage(message.imageDataUrl, apiKey, activeMode)
      const scanMs = performance.now() - scanStart
      const totalMs = Date.now() - message.createdAt
      setLastResult(result)
      setLastScanMs(scanMs)
      setLastTotalMs(totalMs)

      publishDesktopMessage({
        type: 'scan-result',
        requestId: message.requestId,
        finishedAt: Date.now(),
        mode: activeMode,
        scanMs,
        totalMs,
        ok: true,
      })
    } catch (scanError) {
      const errorText = scanError instanceof Error ? scanError.message : 'Unknown scan error'
      const totalMs = Date.now() - message.createdAt
      setError(errorText)
      setLastTotalMs(totalMs)

      publishDesktopMessage({
        type: 'scan-result',
        requestId: message.requestId,
        finishedAt: Date.now(),
        mode: activeMode,
        scanMs: performance.now() - scanStart,
        totalMs,
        ok: false,
        error: errorText,
      })
    } finally {
      setIsScanning(false)
      busyRef.current = false
    }
  }, [apiKey, mode])

  useDesktopMessageBus(
    useCallback((message: DesktopMessage) => {
      if (message.type === 'scan-request') {
        void processRequest(message)
      }
    }, [processRequest]),
  )

  useEffect(() => {
    const unsubscribe = subscribeMobileScannerResults(
      payload => {
        if (!payload) return
        if (payload.eventId === lastMobileEventIdRef.current) return
        lastMobileEventIdRef.current = payload.eventId

        setMobileSyncState('connected')
        setLastMobileSyncAt(payload.publishedAtMs)
        setIsScanning(false)
        setLastImage(null)
        setLastScanMs(payload.scanMs)
        setLastTotalMs(payload.totalMs)
        setMode(payload.mode)
        localStorage.setItem(LS_MODE, payload.mode)

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
        <h2>Scanner Results</h2>
        <p>Waiting for images from the floating capture button.</p>
      </header>

      <section className="scd-live-sync-box">
        <strong>Mobile Live Sync</strong>
        <p>{mobileSyncText}</p>
      </section>

      <section className="scd-controls-row">
        <button
          className={mode === 'simplified' ? 'active' : ''}
          onClick={() => saveMode('simplified')}
        >
          Simplified
        </button>
        <button
          className={mode === 'reasoning' ? 'active' : ''}
          onClick={() => saveMode('reasoning')}
        >
          Reasoning
        </button>
      </section>

      {!ENV_API_KEY && (
        <section className="scd-key-section">
          <input
            type="password"
            value={keyDraft}
            placeholder="OpenAI API key"
            onChange={event => setKeyDraft(event.target.value)}
          />
          <button onClick={saveKey}>Save Key</button>
        </section>
      )}

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

      {isScanning ? <p className="scd-live">Scanning...</p> : null}
      {error ? <p className="scd-error">{error}</p> : null}

      {lastImage ? (
        <div className="scd-image-preview">
          <img src={lastImage} alt="Last received" />
        </div>
      ) : null}

      {lastResult ? <ResultView result={lastResult} /> : null}
    </div>
  )
}

export function ScannerDesktopPage() {
  const location = useLocation()

  const role = useMemo(() => {
    const params = new URLSearchParams(location.search)
    return params.get('role') ?? 'launcher'
  }, [location.search])

  if (role === 'capture') return <CaptureRole />
  if (role === 'results') return <ResultsRole />
  return <LauncherRole />
}
