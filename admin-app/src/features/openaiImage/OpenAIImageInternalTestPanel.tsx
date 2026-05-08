import { onAuthStateChanged } from 'firebase/auth'
import { useEffect, useState } from 'react'
import { useOpenAIImageAssetGeneration } from '../../hooks/useOpenAIImageAssetGeneration'
import { auth } from '../../lib/firebase'
import type { OpenAIImageQuality } from '../../lib/openai/openAIImageClient'
import { useToast } from '../../lib/ToastContext'

const SIZE_OPTIONS = [
  { label: 'Auto', value: 'auto' },
  { label: '1024 x 1024', value: '1024x1024' },
  { label: '1536 x 1024', value: '1536x1024' },
  { label: '1024 x 1536', value: '1024x1536' },
]

const QUALITY_OPTIONS: Array<{ label: string; value: OpenAIImageQuality }> = [
  { label: 'Auto', value: 'auto' },
  { label: 'Low', value: 'low' },
  { label: 'Medium', value: 'medium' },
  { label: 'High', value: 'high' },
]

export function OpenAIImageInternalTestPanel() {
  const { showToast } = useToast()
  const [authUid, setAuthUid] = useState(auth.currentUser?.uid || '')
  const [prompt, setPrompt] = useState('Editorial product still life, soft daylight, museum-grade styling, clean ivory background, precise shadows.')
  const [size, setSize] = useState('1024x1024')
  const [quality, setQuality] = useState<OpenAIImageQuality>('medium')
  const [projectId, setProjectId] = useState('')
  const [assetTitle, setAssetTitle] = useState('')

  const {
    isGenerating,
    lastResult,
    lastError,
    generateAndSave,
    health,
    isCheckingHealth,
    checkHealth,
  } = useOpenAIImageAssetGeneration({
    onError: (message) => {
      showToast({ message, type: 'error', durationMs: 8000 })
    },
  })

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthUid(user?.uid || '')
    })

    return () => {
      unsubscribe()
    }
  }, [])

  useEffect(() => {
    void checkHealth().catch(() => undefined)
  }, [checkHealth])

  const handleGenerateAndSave = async () => {
    if (!prompt.trim()) {
      showToast({ message: 'Prompt is required.', type: 'error' })
      return
    }

    try {
      const result = await generateAndSave({
        prompt,
        size,
        quality,
        outputFormat: 'png',
        n: 1,
        title: assetTitle,
        studioProjectId: projectId,
        authUid,
      })

      showToast({
        message: result.library.savedTo === 'project'
          ? 'Generated image saved to the selected project assets library.'
          : 'Generated image saved to the local assets library.',
        type: 'success',
      })
    } catch {
      // Error toast is handled by the hook.
    }
  }

  return (
    <section className="openai-image-test-panel">
      <div className="openai-image-test-panel__header">
        <div>
          <p className="openai-image-test-panel__eyebrow">Internal Test</p>
          <h2>OpenAI Image Asset Flow</h2>
          <p className="openai-image-test-panel__copy">
            Exercise prompt, size, and quality inputs, then verify the generated image can be generated, saved to Firebase on the server, and registered in the assets library.
          </p>
        </div>
        <div className="openai-image-test-panel__health" data-state={health?.openaiImageConfigured ? 'ok' : 'warn'}>
          {isCheckingHealth
            ? 'Checking service...'
            : health?.openaiImageConfigured
              ? `Ready: ${health.openaiImageModel || 'gpt-image-2'}${health.openaiImageFallbackModel ? ` -> ${health.openaiImageFallbackModel}` : ''}`
              : 'OpenAI image service not configured'}
        </div>
      </div>

      <div className="openai-image-test-panel__grid">
        <label className="openai-image-test-panel__field openai-image-test-panel__field--full">
          <span>Prompt</span>
          <textarea
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            rows={5}
            placeholder="Describe the test image you want to generate"
          />
        </label>

        <label className="openai-image-test-panel__field">
          <span>Size</span>
          <select value={size} onChange={(event) => setSize(event.target.value)}>
            {SIZE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <label className="openai-image-test-panel__field">
          <span>Quality</span>
          <select value={quality} onChange={(event) => setQuality(event.target.value as OpenAIImageQuality)}>
            {QUALITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <label className="openai-image-test-panel__field">
          <span>Project ID</span>
          <input
            value={projectId}
            onChange={(event) => setProjectId(event.target.value)}
            placeholder="Leave blank to save into the local assets library"
          />
        </label>

        <label className="openai-image-test-panel__field">
          <span>Asset Title</span>
          <input
            value={assetTitle}
            onChange={(event) => setAssetTitle(event.target.value)}
            placeholder="Optional override for the saved asset name"
          />
        </label>
      </div>

      <div className="openai-image-test-panel__actions">
        <button type="button" onClick={handleGenerateAndSave} disabled={isGenerating || !prompt.trim()}>
          {isGenerating ? 'Generating and saving...' : 'Generate + Save To Assets'}
        </button>
      </div>

      {(lastError || lastResult?.generation.saved.firebaseUrl) && (
        <div className="openai-image-test-panel__status-block">
          {lastError && <p className="openai-image-test-panel__status is-error">{lastError}</p>}
          {lastResult?.generation.saved.firebaseUrl && (
            <p className="openai-image-test-panel__status is-success">
              Saved to {lastResult.library.savedTo} assets: <a href={lastResult.generation.saved.firebaseUrl} target="_blank" rel="noreferrer">open saved file</a>
            </p>
          )}
          {lastResult?.generation.usedFallback && (
            <p className="openai-image-test-panel__status">
              Fallback used: requested {lastResult.generation.requestedModel || 'gpt-image-2'}, generated with {lastResult.generation.model}.
            </p>
          )}
        </div>
      )}

      <div className="openai-image-test-panel__result">
        <div className="openai-image-test-panel__preview">
          {lastResult?.generation.saved.firebaseUrl ? (
            <img src={lastResult.generation.saved.firebaseUrl} alt="Generated OpenAI preview" />
          ) : (
            <div className="openai-image-test-panel__empty">Generate an image to preview the save flow.</div>
          )}
        </div>

        <div className="openai-image-test-panel__meta">
          <div>
            <strong>Requested model</strong>
            <span>{lastResult?.generation.requestedModel || 'gpt-image-2'}</span>
          </div>
          <div>
            <strong>Resolved model</strong>
            <span>{lastResult?.generation.model || 'gpt-image-2'}</span>
          </div>
          <div>
            <strong>Resolved size</strong>
            <span>{lastResult?.generation.size || size}</span>
          </div>
          <div>
            <strong>Resolved quality</strong>
            <span>{lastResult?.generation.quality || quality}</span>
          </div>
          <div>
            <strong>Target library</strong>
            <span>{lastResult?.library.savedTo === 'project' ? 'Project assets library' : 'Local assets library'}</span>
          </div>
          <div>
            <strong>Auth UID</strong>
            <span>{authUid || 'Not resolved yet'}</span>
          </div>
          <div>
            <strong>Firebase path</strong>
            <span>{lastResult?.generation.saved.objectPath || 'Will be generated after save'}</span>
          </div>
          <div>
            <strong>Revised prompt</strong>
            <span>{lastResult?.generation.revisedPrompt || 'OpenAI may return a revised prompt after generation.'}</span>
          </div>
        </div>
      </div>

      <style>{`
        .openai-image-test-panel {
          margin-top: 3rem;
          padding: 1.5rem;
          border: 1px solid rgba(15, 23, 42, 0.08);
          border-radius: 1.5rem;
          background:
            linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(248, 250, 252, 0.98)),
            radial-gradient(circle at top left, rgba(191, 219, 254, 0.2), transparent 45%);
          box-shadow: 0 24px 60px rgba(15, 23, 42, 0.08);
        }

        .openai-image-test-panel__header {
          display: flex;
          justify-content: space-between;
          gap: 1rem;
          align-items: flex-start;
          margin-bottom: 1.5rem;
        }

        .openai-image-test-panel__eyebrow {
          margin: 0 0 0.35rem;
          font-size: 0.72rem;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #475569;
        }

        .openai-image-test-panel__header h2 {
          margin: 0;
          font-size: 1.55rem;
          color: #0f172a;
        }

        .openai-image-test-panel__copy {
          margin: 0.5rem 0 0;
          max-width: 42rem;
          color: #475569;
          line-height: 1.6;
        }

        .openai-image-test-panel__health {
          min-width: 12rem;
          padding: 0.75rem 0.9rem;
          border-radius: 999px;
          font-size: 0.88rem;
          font-weight: 600;
          text-align: center;
          background: rgba(226, 232, 240, 0.8);
          color: #334155;
        }

        .openai-image-test-panel__health[data-state='ok'] {
          background: rgba(220, 252, 231, 0.85);
          color: #166534;
        }

        .openai-image-test-panel__health[data-state='warn'] {
          background: rgba(254, 242, 242, 0.9);
          color: #991b1b;
        }

        .openai-image-test-panel__grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 1rem;
        }

        .openai-image-test-panel__field {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
        }

        .openai-image-test-panel__field--full {
          grid-column: 1 / -1;
        }

        .openai-image-test-panel__field span {
          font-size: 0.86rem;
          font-weight: 700;
          color: #334155;
        }

        .openai-image-test-panel__field textarea,
        .openai-image-test-panel__field input,
        .openai-image-test-panel__field select {
          width: 100%;
          border: 1px solid rgba(148, 163, 184, 0.55);
          border-radius: 0.9rem;
          padding: 0.85rem 1rem;
          font: inherit;
          color: #0f172a;
          background: rgba(255, 255, 255, 0.94);
        }

        .openai-image-test-panel__field textarea {
          resize: vertical;
          min-height: 7rem;
        }

        .openai-image-test-panel__actions {
          display: flex;
          gap: 0.85rem;
          margin-top: 1.25rem;
        }

        .openai-image-test-panel__actions button {
          border: none;
          border-radius: 999px;
          padding: 0.9rem 1.3rem;
          font: inherit;
          font-weight: 700;
          color: #ffffff;
          background: linear-gradient(135deg, #0f172a, #1d4ed8);
          cursor: pointer;
          transition: transform 120ms ease, opacity 120ms ease;
        }

        .openai-image-test-panel__actions button.secondary {
          background: linear-gradient(135deg, #475569, #0f766e);
        }

        .openai-image-test-panel__actions button:disabled {
          cursor: not-allowed;
          opacity: 0.55;
          transform: none;
        }

        .openai-image-test-panel__actions button:not(:disabled):hover {
          transform: translateY(-1px);
        }

        .openai-image-test-panel__status-block {
          margin-top: 1rem;
          display: grid;
          gap: 0.5rem;
        }

        .openai-image-test-panel__status {
          margin: 0;
          padding: 0.8rem 0.95rem;
          border-radius: 0.9rem;
          font-size: 0.92rem;
        }

        .openai-image-test-panel__status.is-error {
          background: rgba(254, 242, 242, 0.95);
          color: #991b1b;
        }

        .openai-image-test-panel__status.is-success {
          background: rgba(236, 253, 245, 0.95);
          color: #166534;
        }

        .openai-image-test-panel__status a {
          color: inherit;
          font-weight: 700;
        }

        .openai-image-test-panel__result {
          margin-top: 1.5rem;
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(18rem, 0.9fr);
          gap: 1rem;
        }

        .openai-image-test-panel__preview {
          min-height: 20rem;
          border-radius: 1.25rem;
          border: 1px solid rgba(148, 163, 184, 0.3);
          background: linear-gradient(135deg, rgba(241, 245, 249, 0.9), rgba(255, 255, 255, 0.92));
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .openai-image-test-panel__preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }

        .openai-image-test-panel__empty {
          padding: 1.5rem;
          text-align: center;
          color: #64748b;
        }

        .openai-image-test-panel__meta {
          display: grid;
          gap: 0.75rem;
        }

        .openai-image-test-panel__meta > div {
          display: grid;
          gap: 0.25rem;
          padding: 0.9rem 1rem;
          border-radius: 1rem;
          border: 1px solid rgba(148, 163, 184, 0.25);
          background: rgba(255, 255, 255, 0.86);
        }

        .openai-image-test-panel__meta strong {
          font-size: 0.76rem;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #64748b;
        }

        .openai-image-test-panel__meta span {
          color: #0f172a;
          word-break: break-word;
        }

        @media (max-width: 900px) {
          .openai-image-test-panel__header,
          .openai-image-test-panel__result,
          .openai-image-test-panel__grid {
            grid-template-columns: 1fr;
            display: grid;
          }

          .openai-image-test-panel__header {
            display: grid;
          }

          .openai-image-test-panel__actions {
            flex-direction: column;
          }
        }
      `}</style>
    </section>
  )
}