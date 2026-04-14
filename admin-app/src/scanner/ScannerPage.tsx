/**
 * Scanner - self-contained image scanner page.
 * Hosted at /scanner within the QYan app.
 * To remove: delete src/scanner/, remove the /scanner route and import from App.tsx.
 */

import React, { useState, useCallback, useEffect } from 'react'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { useLocation, useNavigate } from 'react-router-dom'
import { auth } from '../lib/firebase'
import { useCamera } from './useCamera'
import { scanImage, type ScanResult, type ScanMode } from './openai'
import { publishMobileScannerResult } from './realtimeBridge'
import {
  addHistoryItem,
  clearHistoryItems,
  listHistoryItems,
  type ScannerHistoryItem,
} from './historyStore'
import './Scanner.css'

const ENV_API_KEY = (import.meta.env.VITE_OPENAI_API_KEY as string | undefined) ?? ''
const LS_KEY = 'scanner_openai_key'
const LS_MODE = 'scanner_mode'
const LS_SHOW_CAPTURED_IMAGE = 'scanner_show_captured_image'

interface ScanTiming {
  captureMs: number
  scanMs: number
  totalMs: number
  autoRotated: boolean
}

type DeviceOrientation = 'portrait' | 'landscape'

function detectDeviceOrientation(): DeviceOrientation {
  if (typeof window === 'undefined') return 'portrait'

  const orientationType = window.screen.orientation?.type
  if (typeof orientationType === 'string') {
    return orientationType.startsWith('landscape') ? 'landscape' : 'portrait'
  }

  return window.innerWidth > window.innerHeight ? 'landscape' : 'portrait'
}

function formatDuration(ms: number) {
  if (ms < 1000) return `${Math.round(ms)} ms`
  return `${(ms / 1000).toFixed(2)} s`
}

async function buildHistoryPreview(imageDataUrl: string, maxWidth = 620): Promise<string> {
  if (typeof window === 'undefined') return imageDataUrl

  return new Promise(resolve => {
    const img = new Image()
    img.onload = () => {
      const scale = maxWidth < img.width ? maxWidth / img.width : 1
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        resolve(imageDataUrl)
        return
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      resolve(canvas.toDataURL('image/jpeg', 0.74))
    }
    img.onerror = () => resolve(imageDataUrl)
    img.src = imageDataUrl
  })
}

// --- Settings panel ---

function SettingsPanel({
  envKeySet,
  currentKey,
  mode,
  showCapturedImage,
  onSaveKey,
  onSaveMode,
  onToggleShowCapturedImage,
  onClose,
}: {
  envKeySet: boolean
  currentKey: string
  mode: ScanMode
  showCapturedImage: boolean
  onSaveKey: (key: string) => void
  onSaveMode: (mode: ScanMode) => void
  onToggleShowCapturedImage: (enabled: boolean) => void
  onClose: () => void
}) {
  const [value, setValue] = useState(currentKey)
  const [show, setShow] = useState(false)

  return (
    <div className="sc-settings-overlay">
      <div className="sc-settings-panel">
        <div className="sc-settings-header">
          <h2>Settings</h2>
          <button className="sc-btn-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="sc-mode-section">
          <p className="sc-mode-label">Scan Mode</p>
          <div className="sc-mode-toggle">
            <button
              className={`sc-mode-btn ${mode === 'simplified' ? 'active' : ''}`}
              onClick={() => onSaveMode('simplified')}
            >
              <span className="sc-mode-icon">⚡</span>
              <span>
                <strong>Simplified</strong>
                <small>Extract visible text - fast</small>
              </span>
            </button>
            <button
              className={`sc-mode-btn ${mode === 'reasoning' ? 'active' : ''}`}
              onClick={() => onSaveMode('reasoning')}
            >
              <span className="sc-mode-icon">🧠</span>
              <span>
                <strong>Reasoning</strong>
                <small>Solve questions and quizzes</small>
              </span>
            </button>
          </div>
        </div>

        <div className="sc-settings-divider" />
        <div className="sc-toggle-row">
          <div>
            <p className="sc-settings-section-title">Show Captured Image</p>
            <p className="sc-settings-note">Keep off for faster answer-first review.</p>
          </div>
          <button
            className={`sc-toggle-btn${showCapturedImage ? ' active' : ''}`}
            onClick={() => onToggleShowCapturedImage(!showCapturedImage)}
            aria-pressed={showCapturedImage}
          >
            {showCapturedImage ? 'On' : 'Off'}
          </button>
        </div>

        <div className="sc-settings-divider" />
        <p className="sc-settings-section-title">API Key</p>

        {envKeySet ? (
          <div className="sc-env-badge">API key loaded from environment</div>
        ) : (
          <>
            <p className="sc-settings-note">
              Your key is stored only in your browser local storage and sent directly to OpenAI.
            </p>
            <div className="sc-key-row">
              <input
                type={show ? 'text' : 'password'}
                className="sc-key-input"
                placeholder="sk-..."
                value={value}
                onChange={e => setValue(e.target.value)}
                spellCheck={false}
                autoComplete="off"
              />
              <button className="sc-btn-show" onClick={() => setShow(s => !s)} aria-label={show ? 'Hide' : 'Show'}>
                {show ? 'hide' : 'show'}
              </button>
            </div>
            <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="sc-get-key-link">
              Get an API key
            </a>
            <button className="sc-btn-save" onClick={() => onSaveKey(value.trim())} disabled={!value.trim()}>
              Save Key
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// --- Result panel ---

function ResultPanel({
  result,
  capturedImageUrl,
  showCapturedImage,
  timing,
  history,
  isScanning,
  error,
  onScanAgain,
  onOpenHistoryItem,
  onClearHistory,
}: {
  result: ScanResult | null
  capturedImageUrl: string | null
  showCapturedImage: boolean
  timing: ScanTiming | null
  history: ScannerHistoryItem[]
  isScanning: boolean
  error: string | null
  onScanAgain: () => void
  onOpenHistoryItem: (item: ScannerHistoryItem) => void
  onClearHistory: () => void
}) {
  const [copied, setCopied] = useState(false)

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="sc-result-panel">
      {showCapturedImage && capturedImageUrl && (
        <div className="sc-thumb-wrapper">
          {timing && (
            <div className="sc-thumb-metrics">
              Capture {formatDuration(timing.captureMs)} | AI {formatDuration(timing.scanMs)} | Total {formatDuration(timing.totalMs)}
              {timing.autoRotated ? ' | Auto-rotated 90°' : ''}
            </div>
          )}
          <img src={capturedImageUrl} alt="Captured" className="sc-thumb" />
        </div>
      )}

      {isScanning && (
        <div className="sc-result-pending">
          <p>Reasoning in progress. You can prepare the next shot from the camera side.</p>
        </div>
      )}

      {error ? (
        <div className="sc-result-error">
          <p className="sc-result-error-msg">{error}</p>
          <button className="sc-btn-capture-again-primary" onClick={onScanAgain}>
            <span className="sc-btn-capture-again-dot" />
            Capture Again
          </button>
        </div>
      ) : result ? (
        <>
          {result.mode === 'reasoning' && (
            <>
              {result.answer ? (
                <div className="sc-answer-card">
                  <p className="sc-answer-label">Answer</p>
                  <p className="sc-answer-text">{result.answer}</p>
                  <button className="sc-btn-copy" onClick={() => copy(result.answer)}>
                    {copied ? 'Copied' : 'Copy Answer'}
                  </button>
                </div>
              ) : null}

              <button className="sc-btn-capture-again-primary" onClick={onScanAgain}>
                <span className="sc-btn-capture-again-dot" />
                Capture Again
              </button>

              {result.rawText ? (
                <div className="sc-raw-wrapper">
                  <p className="sc-raw-label">Question text</p>
                  <pre className="sc-raw-text">{result.rawText}</pre>
                </div>
              ) : null}
            </>
          )}

          {result.mode === 'simplified' && (
            <div className="sc-raw-wrapper">
              {result.rawText ? (
                <>
                  <button className="sc-btn-capture-again-primary" onClick={onScanAgain}>
                    <span className="sc-btn-capture-again-dot" />
                    Capture Again
                  </button>
                  <pre className="sc-raw-text">{result.rawText}</pre>
                  <button className="sc-btn-copy" onClick={() => copy(result.rawText)}>
                    {copied ? 'Copied' : 'Copy Text'}
                  </button>
                </>
              ) : (
                <>
                  <button className="sc-btn-capture-again-primary" onClick={onScanAgain}>
                    <span className="sc-btn-capture-again-dot" />
                    Capture Again
                  </button>
                  <p className="sc-no-fields">No text detected in image.</p>
                </>
              )}
            </div>
          )}

          <div className="sc-history-section">
            <div className="sc-history-header">
              <p>History (local on this device)</p>
              {history.length > 0 && (
                <button className="sc-history-clear" onClick={onClearHistory}>Clear</button>
              )}
            </div>

            {history.length === 0 ? (
              <p className="sc-history-empty">No saved captures yet.</p>
            ) : (
              <div className="sc-history-list">
                {history.map(item => (
                  <button
                    key={item.id}
                    className="sc-history-item"
                    onClick={() => onOpenHistoryItem(item)}
                    title="Open this history item"
                  >
                    <img src={item.imageDataUrl} alt="History capture" className="sc-history-thumb" />
                    <div className="sc-history-body">
                      <p className="sc-history-row">
                        <span>{new Date(item.createdAt).toLocaleString()}</span>
                        <span>{item.mode === 'simplified' ? 'Simplified' : 'Reasoning'}</span>
                      </p>
                      <p className="sc-history-title">
                        {item.mode === 'reasoning'
                          ? (item.answer || item.rawText || 'No answer')
                          : (item.rawText || 'No text detected')}
                      </p>
                      <p className="sc-history-meta">
                        Capture {formatDuration(item.captureMs)} | AI {formatDuration(item.scanMs)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  )
}

// --- Camera view ---

function CameraView({
  camera,
  isScanning,
  frozenFrame,
  orientation,
  mode,
  onCapture,
}: {
  camera: ReturnType<typeof useCamera>
  isScanning: boolean
  frozenFrame: string | null
  orientation: DeviceOrientation
  mode: ScanMode
  onCapture: () => void
}) {
  const { videoRef, canvasRef, isReady, error } = camera

  return (
    <div className={`sc-camera-view${orientation === 'landscape' ? ' sc-camera-view-landscape' : ''}`}>
      <canvas ref={canvasRef as React.RefObject<HTMLCanvasElement>} style={{ display: 'none' }} />

      <div className="sc-video-wrapper">
        {error ? (
          <div className="sc-camera-error">
            <span className="sc-error-icon">⊘</span>
            <p>{error}</p>
          </div>
        ) : (
          <>
            <video ref={videoRef as React.RefObject<HTMLVideoElement>} className="sc-video" autoPlay playsInline muted />
            {frozenFrame && (
              <img src={frozenFrame} className="sc-frozen-frame" alt="" />
            )}
            <div className="sc-frame">
              <div className="sc-corner tl" />
              <div className="sc-corner tr" />
              <div className="sc-corner bl" />
              <div className="sc-corner br" />
              {isScanning && <div className="sc-scan-line" />}
            </div>

            <div className="sc-mode-badge">
              {mode === 'simplified' ? '⚡ Simplified' : '🧠 Reasoning'}
            </div>

            <div className="sc-controls" onClick={e => e.stopPropagation()}>
              <button
                className={`sc-btn-capture${isScanning ? ' scanning' : ''}`}
                onClick={onCapture}
                disabled={!isReady || isScanning || !!error}
                aria-label="Capture and scan"
              >
                {isScanning ? <span className="sc-spinner" /> : <span className="sc-shutter" />}
              </button>
            </div>

            {isScanning && (
              <p className="sc-scanning-label">
                {mode === 'simplified' ? 'Extracting text...' : 'Solving...'}
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// --- Main ScannerPage ---

export function ScannerPage() {
  const camera = useCamera()
  const navigate = useNavigate()
  const location = useLocation()

  const [screen, setScreen] = useState<'camera' | 'result'>('camera')
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null)
  const [frozenFrame, setFrozenFrame] = useState<string | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)
  const [timing, setTiming] = useState<ScanTiming | null>(null)
  const [history, setHistory] = useState<ScannerHistoryItem[]>([])
  const [orientation, setOrientation] = useState<DeviceOrientation>(() => detectDeviceOrientation())
  const [showSettings, setShowSettings] = useState(false)
  const [lsKey, setLsKey] = useState<string>(() => localStorage.getItem(LS_KEY) ?? '')
  const [mode, setMode] = useState<ScanMode>(() => (localStorage.getItem(LS_MODE) as ScanMode) ?? 'simplified')
  const [showCapturedImage, setShowCapturedImage] = useState<boolean>(() => localStorage.getItem(LS_SHOW_CAPTURED_IMAGE) === '1')
  const [authUser, setAuthUser] = useState<User | null>(null)
  const [authResolved, setAuthResolved] = useState(false)
  const isLandscape = orientation === 'landscape'

  const apiKey = ENV_API_KEY || lsKey
  const showApiBanner = !apiKey && (screen === 'camera' || isLandscape)

  const refreshHistory = useCallback(async () => {
    const items = await listHistoryItems()
    setHistory(items)
  }, [])

  const persistHistory = useCallback(async (
    imageDataUrl: string,
    result: ScanResult,
    timingData: ScanTiming,
  ) => {
    const preview = await buildHistoryPreview(imageDataUrl)

    const entry: ScannerHistoryItem = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      createdAt: Date.now(),
      mode: result.mode,
      imageDataUrl: preview,
      rawText: result.rawText,
      answer: result.mode === 'reasoning' ? result.answer : '',
      explanation: result.mode === 'reasoning' ? result.explanation : '',
      captureMs: timingData.captureMs,
      scanMs: timingData.scanMs,
      totalMs: timingData.totalMs,
      autoRotated: timingData.autoRotated,
    }

    await addHistoryItem(entry)
    await refreshHistory()
  }, [refreshHistory])

  const publishLiveResult = useCallback((result: ScanResult, timingData: ScanTiming) => {
    void publishMobileScannerResult({
      mode: result.mode,
      rawText: result.rawText,
      answer: result.mode === 'reasoning' ? result.answer : '',
      explanation: result.mode === 'reasoning' ? result.explanation : '',
      captureMs: timingData.captureMs,
      scanMs: timingData.scanMs,
      totalMs: timingData.totalMs,
      autoRotated: timingData.autoRotated,
      ok: true,
    }).catch(() => {
      // Desktop sync is best-effort and must not block scanner UX.
    })
  }, [])

  const publishLiveError = useCallback((timingData: ScanTiming, message: string) => {
    void publishMobileScannerResult({
      mode,
      rawText: '',
      captureMs: timingData.captureMs,
      scanMs: timingData.scanMs,
      totalMs: timingData.totalMs,
      autoRotated: timingData.autoRotated,
      ok: false,
      error: message,
    }).catch(() => {
      // Desktop sync is best-effort and must not block scanner UX.
    })
  }, [mode])

  const handleCapture = useCallback(async () => {
    if (!apiKey) { setShowSettings(true); return }

    const totalStart = performance.now()
    const maxWidth = mode === 'simplified' ? 900 : 1280
    const captureStart = performance.now()
    const capture = camera.captureFrame(maxWidth, { normalizeUpright: true })
    const captureMs = performance.now() - captureStart
    if (!capture) return

    const frame = capture.dataUrl
    const autoRotated = capture.wasAutoRotated

    setFrozenFrame(frame)
    setCapturedImageUrl(frame)
    setIsScanning(true)
    setScanError(null)
    setScanResult(null)
    setTiming(null)

    const scanStart = performance.now()
    try {
      const result = await scanImage(frame, apiKey, mode)
      const scanMs = performance.now() - scanStart
      const totalMs = performance.now() - totalStart
      const timingData: ScanTiming = { captureMs, scanMs, totalMs, autoRotated }

      setScanResult(result)
      setTiming(timingData)
      setScreen('result')

      void persistHistory(frame, result, timingData)
      publishLiveResult(result, timingData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error'
      const timingData: ScanTiming = {
        captureMs,
        scanMs: performance.now() - scanStart,
        totalMs: performance.now() - totalStart,
        autoRotated,
      }
      setScanError(errorMessage)
      setTiming(timingData)
      setScreen('result')
      publishLiveError(timingData, errorMessage)
    } finally {
      setIsScanning(false)
      setFrozenFrame(null)
    }
  }, [camera, apiKey, mode, persistHistory, publishLiveError, publishLiveResult])

  const handleScanAgain = useCallback(() => {
    setScanResult(null)
    setScanError(null)
    setCapturedImageUrl(null)
    setFrozenFrame(null)
    setTiming(null)
    setScreen('camera')
  }, [])

  const handleOpenHistoryItem = useCallback((item: ScannerHistoryItem) => {
    setCapturedImageUrl(item.imageDataUrl)
    setScanError(null)
    setTiming({
      captureMs: item.captureMs,
      scanMs: item.scanMs,
      totalMs: item.totalMs,
      autoRotated: item.autoRotated,
    })
    setMode(item.mode)
    localStorage.setItem(LS_MODE, item.mode)

    if (item.mode === 'reasoning') {
      setScanResult({
        mode: 'reasoning',
        rawText: item.rawText,
        answer: item.answer,
        explanation: item.explanation,
      })
    } else {
      setScanResult({ mode: 'simplified', rawText: item.rawText })
    }

    setScreen('result')
  }, [])

  const handleClearHistory = useCallback(() => {
    const confirmed = window.confirm('Clear all scanner history on this device? This cannot be undone.')
    if (!confirmed) return
    void clearHistoryItems().then(() => setHistory([]))
  }, [])

  const handleSaveKey = useCallback((key: string) => {
    localStorage.setItem(LS_KEY, key)
    setLsKey(key)
    setShowSettings(false)
  }, [])

  const handleSaveMode = useCallback((m: ScanMode) => {
    localStorage.setItem(LS_MODE, m)
    setMode(m)
  }, [])

  const handleToggleShowCapturedImage = useCallback((enabled: boolean) => {
    localStorage.setItem(LS_SHOW_CAPTURED_IMAGE, enabled ? '1' : '0')
    setShowCapturedImage(enabled)
  }, [])

  useEffect(() => () => camera.stopCamera(), []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    void refreshHistory()
  }, [refreshHistory])

  useEffect(() => {
    const handleOrientationChange = () => {
      setOrientation(detectDeviceOrientation())
    }

    // Primary listener required by the requested implementation.
    window.addEventListener('orientationchange', handleOrientationChange)
    // Resize listener keeps fallback orientation detection current on unsupported browsers.
    window.addEventListener('resize', handleOrientationChange)
    handleOrientationChange()

    return () => {
      window.removeEventListener('orientationchange', handleOrientationChange)
      window.removeEventListener('resize', handleOrientationChange)
    }
  }, [])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      setAuthUser(user)
      setAuthResolved(true)
    })
    return () => unsubscribe()
  }, [])

  const handleSignIn = useCallback(() => {
    const returnTo = `${location.pathname}${location.search}`
    navigate('/login', { state: { returnTo } })
  }, [location.pathname, location.search, navigate])

  const authText = !authResolved
    ? 'Checking account...'
    : authUser
      ? `Signed in: ${authUser.email || authUser.displayName || authUser.uid}`
      : 'Not signed in. Sign in on mobile and desktop with the same account for live sync.'

  const authBannerStyle: React.CSSProperties = {
    position: 'absolute',
    top: 76,
    left: 10,
    right: 10,
    zIndex: 16,
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    background: 'rgba(10, 17, 27, 0.78)',
    border: '1px solid rgba(107, 142, 182, 0.35)',
    borderRadius: 10,
    padding: '6px 9px',
  }

  const authTextStyle: React.CSSProperties = {
    margin: 0,
    fontSize: 11,
    color: '#d7e4f5',
    lineHeight: 1.3,
    flex: 1,
  }

  const authButtonStyle: React.CSSProperties = {
    border: '1px solid #4f7297',
    background: '#1c3047',
    color: '#f2f7fd',
    borderRadius: 999,
    fontSize: 11,
    fontWeight: 600,
    letterSpacing: '0.02em',
    padding: '5px 10px',
    cursor: 'pointer',
  }

  return (
    <div className={`scanner-root ${orientation === 'landscape' ? 'sc-orientation-landscape' : 'sc-orientation-portrait'}`}>
      <div style={authBannerStyle}>
        <p style={authTextStyle}>{authText}</p>
        {!authUser && authResolved ? (
          <button style={authButtonStyle} onClick={handleSignIn}>Sign In</button>
        ) : null}
      </div>

      <div className="sc-top-actions">
        <button
          className="sc-btn-top sc-btn-top-flip"
          onClick={camera.flipCamera}
          disabled={isScanning}
          aria-label="Flip camera"
        >
          ↺
        </button>
        <button
          className={`sc-btn-top sc-btn-settings${!apiKey ? ' sc-pulse' : ''}`}
          onClick={() => setShowSettings(true)}
          aria-label="Settings"
        >
          ⚙
        </button>
      </div>

      {showApiBanner && (
        <div className="sc-api-banner" onClick={() => setShowSettings(true)}>
          Tap to set your OpenAI API key
        </div>
      )}

      <main className="sc-main">
        <div className={`sc-screen sc-screen-camera${(screen === 'camera' || isLandscape) ? ' active' : ' hidden'}`}>
          <CameraView
            camera={camera}
            isScanning={isScanning}
            frozenFrame={frozenFrame}
            orientation={orientation}
            mode={mode}
            onCapture={handleCapture}
          />
        </div>
        <div
          className={`sc-screen sc-screen-result${(
            screen === 'result'
            || (isLandscape && (isScanning || !!capturedImageUrl || !!scanResult || !!scanError))
          ) ? ' active' : ' hidden'}`}
        >
          <ResultPanel
            result={scanResult}
            capturedImageUrl={capturedImageUrl}
            showCapturedImage={showCapturedImage}
            timing={timing}
            history={history}
            isScanning={isScanning}
            error={scanError}
            onScanAgain={handleScanAgain}
            onOpenHistoryItem={handleOpenHistoryItem}
            onClearHistory={handleClearHistory}
          />
        </div>
      </main>

      {showSettings && (
        <SettingsPanel
          envKeySet={!!ENV_API_KEY}
          currentKey={lsKey}
          mode={mode}
          showCapturedImage={showCapturedImage}
          onSaveKey={handleSaveKey}
          onSaveMode={handleSaveMode}
          onToggleShowCapturedImage={handleToggleShowCapturedImage}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}
