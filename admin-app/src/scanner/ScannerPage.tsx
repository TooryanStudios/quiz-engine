/**
 * Scanner — self-contained image scanner page.
 *
 * Hosted at /scanner within the QYan app.
 * To remove: delete src/scanner/, remove the /scanner route and import from App.tsx,
 * and remove VITE_OPENAI_API_KEY from .env.local.
 *
 * API key resolution order:
 *   1. VITE_OPENAI_API_KEY environment variable (set in .env.local for prod)
 *   2. localStorage fallback — user can enter their own key via the settings panel
 */

import React, { useState, useCallback, useEffect } from 'react'
import { useCamera } from './useCamera'
import { scanImage, type ScanResult } from './openai'
import './Scanner.css'

const ENV_API_KEY = (import.meta.env.VITE_OPENAI_API_KEY as string | undefined) ?? ''
const LS_KEY = 'scanner_openai_key'

// ─── Settings panel ────────────────────────────────────────────────────

function SettingsPanel({
  envKeySet,
  currentKey,
  onSave,
  onClose,
}: {
  envKeySet: boolean
  currentKey: string
  onSave: (key: string) => void
  onClose: () => void
}) {
  const [value, setValue] = useState(currentKey)
  const [show, setShow] = useState(false)

  return (
    <div className="sc-settings-overlay">
      <div className="sc-settings-panel">
        <div className="sc-settings-header">
          <h2>API Key</h2>
          <button className="sc-btn-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        {envKeySet ? (
          <div className="sc-env-badge">
            ✓ API key loaded from environment
          </div>
        ) : (
          <>
            <p className="sc-settings-note">
              Your key is stored only in your browser's local storage and sent directly to OpenAI.
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
                {show ? '🙈' : '👁'}
              </button>
            </div>
            <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="sc-get-key-link">
              Get an API key →
            </a>
            <button className="sc-btn-save" onClick={() => onSave(value.trim())} disabled={!value.trim()}>
              Save Key
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Result panel ───────────────────────────────────────────────────────

function ResultPanel({
  result,
  capturedImageUrl,
  error,
  onScanAgain,
}: {
  result: ScanResult | null
  capturedImageUrl: string | null
  error: string | null
  onScanAgain: () => void
}) {
  const [tab, setTab] = useState<'fields' | 'raw'>('fields')
  const [copied, setCopied] = useState(false)

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="sc-result-panel">
      {capturedImageUrl && (
        <div className="sc-thumb-wrapper">
          <img src={capturedImageUrl} alt="Captured" className="sc-thumb" />
        </div>
      )}

      {error ? (
        <div className="sc-result-error">
          <p className="sc-result-error-msg">{error}</p>
          <button className="sc-btn-scan-again" onClick={onScanAgain}>Try Again</button>
        </div>
      ) : result ? (
        <>
          <div className="sc-summary">
            <span className="sc-summary-icon">◈</span>
            <p>{result.summary}</p>
          </div>

          <div className="sc-tabs">
            <button className={`sc-tab ${tab === 'fields' ? 'active' : ''}`} onClick={() => setTab('fields')}>
              Extracted Fields
            </button>
            <button className={`sc-tab ${tab === 'raw' ? 'active' : ''}`} onClick={() => setTab('raw')}>
              Raw Text
            </button>
          </div>

          {tab === 'fields' ? (
            <div className="sc-fields">
              {result.structured.length === 0 ? (
                <p className="sc-no-fields">No structured fields detected.</p>
              ) : (
                result.structured.map((f, i) => (
                  <div key={i} className="sc-field-row">
                    <span className="sc-field-label">{f.label}</span>
                    <span className="sc-field-value">{f.value}</span>
                  </div>
                ))
              )}
              {result.structured.length > 0 && (
                <button className="sc-btn-copy" onClick={() => copy(result.structured.map(f => `${f.label}: ${f.value}`).join('\n'))}>
                  {copied ? '✓ Copied' : 'Copy Fields'}
                </button>
              )}
            </div>
          ) : (
            <div className="sc-raw-wrapper">
              <pre className="sc-raw-text">{result.rawText || '(no text found)'}</pre>
              {result.rawText && (
                <button className="sc-btn-copy" onClick={() => copy(result.rawText)}>
                  {copied ? '✓ Copied' : 'Copy Text'}
                </button>
              )}
            </div>
          )}

          <button className="sc-btn-scan-again" onClick={onScanAgain}>Scan Another</button>
        </>
      ) : null}
    </div>
  )
}

// ─── Camera view ────────────────────────────────────────────────────────

function CameraView({
  camera,
  isScanning,
  onCapture,
}: {
  camera: ReturnType<typeof useCamera>
  isScanning: boolean
  onCapture: () => void
}) {
  const { videoRef, canvasRef, isReady, error, flipCamera } = camera

  return (
    <div className="sc-camera-view">
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
            <div className="sc-frame">
              <div className="sc-corner tl" />
              <div className="sc-corner tr" />
              <div className="sc-corner bl" />
              <div className="sc-corner br" />
              {isScanning && <div className="sc-scan-line" />}
            </div>
          </>
        )}
      </div>

      <div className="sc-controls">
        <button className="sc-btn-flip" onClick={flipCamera} disabled={isScanning} aria-label="Flip camera">↺</button>
        <button
          className={`sc-btn-capture${isScanning ? ' scanning' : ''}`}
          onClick={onCapture}
          disabled={!isReady || isScanning || !!error}
          aria-label="Capture and scan"
        >
          {isScanning ? <span className="sc-spinner" /> : <span className="sc-shutter" />}
        </button>
        <div style={{ width: 48 }} />
      </div>

      {isScanning && <p className="sc-scanning-label">Analyzing image…</p>}
    </div>
  )
}

// ─── Main ScannerPage ───────────────────────────────────────────────────

export function ScannerPage() {
  const camera = useCamera()

  const [screen, setScreen] = useState<'camera' | 'result'>('camera')
  const [isScanning, setIsScanning] = useState(false)
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)
  const [showSettings, setShowSettings] = useState(false)

  const [lsKey, setLsKey] = useState<string>(() => localStorage.getItem(LS_KEY) ?? '')
  const apiKey = ENV_API_KEY || lsKey

  const handleCapture = useCallback(async () => {
    if (!apiKey) { setShowSettings(true); return }

    const frame = camera.captureFrame()
    if (!frame) return

    setCapturedImageUrl(frame)
    setIsScanning(true)
    setScanError(null)
    setScanResult(null)

    try {
      const result = await scanImage(frame, apiKey)
      setScanResult(result)
      setScreen('result')
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Unknown error')
      setScreen('result')
    } finally {
      setIsScanning(false)
    }
  }, [camera, apiKey])

  const handleScanAgain = useCallback(() => {
    setScanResult(null)
    setScanError(null)
    setCapturedImageUrl(null)
    setScreen('camera')
  }, [])

  const handleSaveKey = useCallback((key: string) => {
    localStorage.setItem(LS_KEY, key)
    setLsKey(key)
    setShowSettings(false)
  }, [])

  // Stop camera when navigating away
  useEffect(() => () => camera.stopCamera(), []) // eslint-disable-line react-hooks/exhaustive-deps

  const needsKey = !apiKey

  return (
    <div className="scanner-root">
      {/* Header */}
      <header className="sc-header">
        <div style={{ width: 40 }}>
          {screen === 'result' && (
            <button className="sc-btn-back" onClick={handleScanAgain} aria-label="Back">←</button>
          )}
        </div>
        <h1 className="sc-title">Scanner</h1>
        <button
          className={`sc-btn-settings${needsKey ? ' sc-pulse' : ''}`}
          onClick={() => setShowSettings(true)}
          aria-label="Settings"
        >
          ⚙
        </button>
      </header>

      {needsKey && screen === 'camera' && (
        <div className="sc-api-banner" onClick={() => setShowSettings(true)}>
          Tap to set your OpenAI API key to enable scanning →
        </div>
      )}

      <main className="sc-main">
        {screen === 'camera' ? (
          <CameraView camera={camera} isScanning={isScanning} onCapture={handleCapture} />
        ) : (
          <ResultPanel result={scanResult} capturedImageUrl={capturedImageUrl} error={scanError} onScanAgain={handleScanAgain} />
        )}
      </main>

      {showSettings && (
        <SettingsPanel
          envKeySet={!!ENV_API_KEY}
          currentKey={lsKey}
          onSave={handleSaveKey}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}
