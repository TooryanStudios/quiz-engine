import { memo, useEffect, useState, useCallback, useRef, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { useLabNewLayoutComposer } from './useLabNewLayoutComposer'
import { useLabNewLayoutData } from './useLabNewLayoutWorkspace'

type ComposerReferenceItem = {
  id: string
  url: string
  kind: 'image' | 'video' | 'audio'
  name: string
}

const LAB_NEWLAYOUT_HISTORY_REF_MIME = 'application/x-lab-newlayout-reference'

const inferDroppedKindFromUrl = (url: string): 'image' | 'video' | 'audio' => {
  const normalized = url.toLowerCase()
  if (/\.(mp4|webm|mov|m4v|avi|mkv)(\?|#|$)/.test(normalized)) {
    return 'video'
  }
  if (/\.(mp3|wav|ogg|m4a|aac|flac)(\?|#|$)/.test(normalized)) {
    return 'audio'
  }
  return 'image'
}

const normalizeDroppedReference = (value: unknown): ComposerReferenceItem | null => {
  if (!value || typeof value !== 'object') {
    return null
  }

  const candidate = value as Partial<ComposerReferenceItem>
  const url = typeof candidate.url === 'string' ? candidate.url.trim() : ''
  if (!url) {
    return null
  }

  const kind = candidate.kind === 'video' || candidate.kind === 'audio'
    ? candidate.kind
    : inferDroppedKindFromUrl(url)
  const name = typeof candidate.name === 'string' && candidate.name.trim()
    ? candidate.name.trim()
    : `Dropped ${kind}`
  const id = typeof candidate.id === 'string' && candidate.id.trim()
    ? candidate.id.trim()
    : `composer-ref-${Date.now()}-${Math.random().toString(36).slice(2)}`

  return { id, url, kind, name }
}

const parseDroppedReference = (dataTransfer: DataTransfer): ComposerReferenceItem | null => {
  const customPayloadRaw = dataTransfer.getData(LAB_NEWLAYOUT_HISTORY_REF_MIME)
  if (customPayloadRaw) {
    try {
      const parsed = JSON.parse(customPayloadRaw) as unknown
      return normalizeDroppedReference(parsed)
    } catch {
      // continue and try other formats
    }
  }

  const jsonPayloadRaw = dataTransfer.getData('application/json')
  if (jsonPayloadRaw) {
    try {
      const parsed = JSON.parse(jsonPayloadRaw) as unknown
      return normalizeDroppedReference(parsed)
    } catch {
      // continue and try URI text fallback
    }
  }

  const uriPayload = (dataTransfer.getData('text/uri-list') || dataTransfer.getData('text/plain') || '').trim()
  if (!uriPayload) {
    return null
  }

  return normalizeDroppedReference({
    url: uriPayload,
    kind: inferDroppedKindFromUrl(uriPayload),
    name: 'Dropped media',
  })
}

const ComposerReferencesRail = memo(function ComposerReferencesRail({
  selectedReferences,
  addReference,
  removeReference,
}: {
  selectedReferences: ComposerReferenceItem[]
  addReference: (reference: ComposerReferenceItem) => void
  removeReference: (id: string) => void
}) {
  const railRef = useRef<HTMLDivElement>(null)

  return (
    <div
      ref={railRef}
      className="lab-newlayout-composer-references-rail"
      onDragOver={(e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'copy'
      }}
      onDrop={(e) => {
        e.preventDefault()
        const droppedReference = parseDroppedReference(e.dataTransfer)
        if (!droppedReference) {
          return
        }

        if (selectedReferences.some((reference) => reference.url === droppedReference.url)) {
          return
        }

        addReference(droppedReference)
        setTimeout(() => {
          if (railRef.current) {
            railRef.current.scrollTo({ left: railRef.current.scrollWidth, behavior: 'smooth' })
          }
        }, 50)
      }}
    >
      {selectedReferences.map(ref => {
        return (
          <div
            key={ref.id}
            className="lab-newlayout-composer-ref-item"
            onMouseEnter={(e) => {
              e.currentTarget.classList.add('is-hovered')
              const media = e.currentTarget.querySelector('video')
              if (media) {
                media.muted = false
                void media.play().catch(() => {
                  media.muted = true
                  void media.play().catch(() => undefined)
                })
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.classList.remove('is-hovered')
              const media = e.currentTarget.querySelector('video')
              if (media) {
                media.pause()
                media.currentTime = 0
                media.muted = true
              }
            }}
          >
            {ref.kind === 'video' ? (
              <>
                <video src={ref.url} className="lab-newlayout-composer-ref-media" muted playsInline preload="metadata" />
                <span className="lab-newlayout-composer-video-indicator" aria-hidden="true">▶</span>
              </>
            ) : ref.kind === 'audio' ? (
              <div className="lab-newlayout-composer-ref-audio">🎵</div>
            ) : (
              <img src={ref.url} alt={ref.name} className="lab-newlayout-composer-ref-media" />
            )}
            <div className="lab-newlayout-composer-ref-outline" />
            <button
              className="lab-newlayout-composer-ref-remove-btn"
              onClick={() => removeReference(ref.id)}
              title="Remove reference"
            >
              ✕
            </button>
          </div>
        )
      })}
      <div className="lab-newlayout-composer-drop-target">
        + Drop
      </div>
    </div>
  )
})

function renderComposerModeIcon(modeId: string) {
  switch (modeId) {
    case 'text':
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="4 7 4 4 20 4 20 7" />
          <line x1="9" y1="20" x2="15" y2="20" />
          <line x1="12" y1="4" x2="12" y2="20" />
        </svg>
      )
    case 'image':
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <polyline points="21 15 16 10 5 21" />
        </svg>
      )
    case 'video':
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polygon points="23 7 16 12 23 17 23 7" />
          <rect x="1" y="5" width="15" height="14" rx="2" />
        </svg>
      )
    case 'audio':
      return (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 18V5l12-2v13" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="18" cy="16" r="3" />
        </svg>
      )
    default:
      return <span aria-hidden="true">?</span>
  }
}

function renderComposerActionIcon(actionId: 'templates' | 'refine' | 'fontSize') {
  if (actionId === 'templates') {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M8 4h11a1 1 0 0 1 1 1v11" />
        <rect x="4" y="8" width="12" height="12" rx="2" />
        <path d="M8 12h4" />
        <path d="M8 16h6" />
      </svg>
    )
  }

  if (actionId === 'fontSize') {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 20l4.5-12h3L16 20" />
        <path d="M6 15h8" />
        <path d="M18 8h2" />
        <path d="M19 8v8" />
      </svg>
    )
  }

  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l1.8 3.7L18 8.5l-3 2.9.7 4.1L12 13.8l-3.7 1.7.7-4.1-3-2.9 4.2-1.8L12 3z" />
    </svg>
  )
}

export function LabNewLayoutComposerPanel() {
  const topStackRef = useRef<HTMLDivElement | null>(null)
  const footerControlsRef = useRef<HTMLDivElement | null>(null)
  const { openStudioExplorer, ensureDefaultProjectAndFolder } = useLabNewLayoutData()
  const [isGenerationBlockedDialogOpen, setGenerationBlockedDialogOpen] = useState(false)
  const {
    activeMode,
    activeModeId,
    activeFooterMenu,
    applyDurationSetting,
    applyModelSetting,
    applyPromptFontSize,
    applyRatioSetting,
    applyRefineAction,
    applyResolutionSetting,
    applyTemplate,
    closeMenus,
    composerDurationOptions,
    composerFontSizeOptions,
    composerModelChip,
    composerModelOptions,
    composerModeOptions,
    composerRatioOptions,
    composerRefineActions,
    composerResolutionOptions,
    composerSettings,
    composerTemplates,
    isFontSizeMenuOpen,
    isRefineMenuOpen,
    isTemplatesMenuOpen,
    hasActiveStudioProjectAndFolder,
    backendStatusMessage,
    backendCooldownRemainingMs,
    generationBlockedReason,
    isSubmittingGeneration,
    isPreparingReferences,
    promptFontSize,
    promptText,
    referenceAccessMessage,
    selectMode,
    toggleFontSizeMenu,
    toggleRefineMenu,
    toggleTemplatesMenu,
    updatePromptText,
    handlePromptFocus,
    handlePromptBlur,
    startGeneration,
    selectedReferences,
    addReference,
    removeReference,
    toggleComposerAudio,
    toggleFooterMenu,
  } = useLabNewLayoutComposer()

  const promptReady = Boolean(promptText.trim())
  const normalizedBackendStatusMessage = (backendStatusMessage || '').trim()
  const hasBackendIssue = Boolean(normalizedBackendStatusMessage)
  const isBackendCoolingDown = backendCooldownRemainingMs > 0
  const canGenerate = promptReady && hasActiveStudioProjectAndFolder && !isBackendCoolingDown && !isPreparingReferences && !referenceAccessMessage
  const [generationBlockedCase, setGenerationBlockedCase] = useState<'prompt' | null>(null)
  const [isAutoCreating, setIsAutoCreating] = useState(false)
  const [isBackendDetailsOpen, setBackendDetailsOpen] = useState(false)
  const [dismissedBackendMessage, setDismissedBackendMessage] = useState('')
  const isBackendAlertDismissed = hasBackendIssue && dismissedBackendMessage === normalizedBackendStatusMessage
  const showBackendIssue = hasBackendIssue && !isBackendAlertDismissed

  const preventFocusStealOnMouseDown = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
  }, [])

  const handleStartGeneration = useCallback(() => {
    if (isSubmittingGeneration || isAutoCreating) {
      return
    }

    if (!promptReady) {
      setGenerationBlockedCase('prompt')
      setGenerationBlockedDialogOpen(true)
      return
    }

    if (!hasActiveStudioProjectAndFolder) {
      setIsAutoCreating(true)
      void ensureDefaultProjectAndFolder().then((result) => {
        setIsAutoCreating(false)
        if (result) {
          startGeneration({ projectId: result.projectId, folderId: result.folderId })
        }
      })
      return
    }

    startGeneration()
  }, [ensureDefaultProjectAndFolder, hasActiveStudioProjectAndFolder, isAutoCreating, isSubmittingGeneration, promptReady, startGeneration])

  const handleOpenExplorerFromDialog = useCallback(() => {
    openStudioExplorer()
    setGenerationBlockedDialogOpen(false)
  }, [openStudioExplorer])

  useEffect(() => {
    if (!hasBackendIssue) {
      setBackendDetailsOpen(false)
      setDismissedBackendMessage('')
    }
  }, [hasBackendIssue])

  useEffect(() => {
    if (!normalizedBackendStatusMessage) {
      return
    }

    if (dismissedBackendMessage && dismissedBackendMessage !== normalizedBackendStatusMessage) {
      setDismissedBackendMessage('')
      setBackendDetailsOpen(false)
    }
  }, [dismissedBackendMessage, normalizedBackendStatusMessage])

  useEffect(() => {
    if (!isTemplatesMenuOpen && !isRefineMenuOpen && !isFontSizeMenuOpen && !activeFooterMenu) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target
      if (!(target instanceof Node)) {
        return
      }

      if (topStackRef.current?.contains(target)) {
        return
      }

      if (footerControlsRef.current?.contains(target)) {
        return
      }

      closeMenus()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [activeFooterMenu, closeMenus, isFontSizeMenuOpen, isRefineMenuOpen, isTemplatesMenuOpen])

  return (
    <div className="lab-newlayout-panel lab-newlayout-panel--composer">
      <div ref={topStackRef} className="lab-newlayout-composer-top-stack">
        <div className="lab-newlayout-composer-top-fixed">
          <div className="lab-ref-mode-toggle" role="group" aria-label="Composer modes">
            {composerModeOptions.map((mode) => (
              <button
                key={mode.id}
                type="button"
                className={`lab-ref-mode-btn${mode.id === activeModeId ? ' is-active' : ''}`}
                title={mode.label}
                onClick={() => {
                  selectMode(mode.id)
                  closeMenus()
                }}
              >
                {renderComposerModeIcon(mode.id)}
              </button>
            ))}
          </div>
          <div className="lab-newlayout-composer-heading">Composer 1.0</div>
          <div className="lab-newlayout-composer-top-actions">
            <button
              type="button"
              className="lab-newlayout-composer-menu-trigger lab-newlayout-composer-icon-trigger"
              aria-haspopup="menu"
              aria-label="Templates"
              title="Templates"
              onClick={toggleTemplatesMenu}
            >
              <span className="lab-newlayout-composer-trigger-icon" aria-hidden="true">
                {renderComposerActionIcon('templates')}
              </span>
            </button>
            <button
              type="button"
              className="lab-newlayout-composer-menu-trigger lab-newlayout-composer-icon-trigger"
              aria-haspopup="menu"
              aria-label="Prompt font size"
              title="Prompt font size"
              onClick={toggleFontSizeMenu}
            >
              <span className="lab-newlayout-composer-trigger-icon" aria-hidden="true">
                {renderComposerActionIcon('fontSize')}
              </span>
            </button>
            <button
              type="button"
              className="lab-newlayout-composer-refine-btn lab-newlayout-composer-icon-trigger"
              aria-haspopup="menu"
              aria-label="Refine"
              title="Refine"
              onClick={toggleRefineMenu}
            >
              <span className="lab-newlayout-composer-trigger-icon" aria-hidden="true">
                {renderComposerActionIcon('refine')}
              </span>
            </button>
          </div>
        </div>

        {isTemplatesMenuOpen ? (
          <div className="lab-newlayout-composer-menu" role="menu" aria-label="Composer templates">
            {composerTemplates.map((template) => (
              <button
                key={template.id}
                type="button"
                role="menuitem"
                className="lab-newlayout-composer-menu-item"
                onMouseDown={preventFocusStealOnMouseDown}
                onClick={() => applyTemplate(template.id)}
              >
                <span className="lab-newlayout-composer-menu-item-title">{template.label}</span>
                <span className="lab-newlayout-composer-menu-item-copy">{template.description}</span>
              </button>
            ))}
          </div>
        ) : null}

        {isRefineMenuOpen ? (
          <div className="lab-newlayout-composer-menu" role="menu" aria-label="Composer refine actions">
            {composerRefineActions.map((action) => (
              <button
                key={action.id}
                type="button"
                role="menuitem"
                className="lab-newlayout-composer-menu-item"
                onMouseDown={preventFocusStealOnMouseDown}
                onClick={() => applyRefineAction(action.id)}
              >
                <span className="lab-newlayout-composer-menu-item-title">{action.label}</span>
                <span className="lab-newlayout-composer-menu-item-copy">{action.description}</span>
              </button>
            ))}
          </div>
        ) : null}

        {isFontSizeMenuOpen ? (
          <div className="lab-newlayout-composer-menu" role="menu" aria-label="Prompt font sizes">
            {composerFontSizeOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                role="menuitem"
                className={`lab-newlayout-composer-menu-item${promptFontSize === option.id ? ' is-selected' : ''}`}
                onMouseDown={preventFocusStealOnMouseDown}
                onClick={() => applyPromptFontSize(option.id)}
              >
                <span className="lab-newlayout-composer-menu-item-title">{option.label}</span>
                <span className="lab-newlayout-composer-menu-item-copy">{option.description}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="lab-newlayout-composer-body lab-newlayout-composer-body--stack">
        <textarea
          className={`lab-newlayout-composer-prompt lab-textarea--composer lab-newlayout-composer-prompt--stretch lab-newlayout-composer-prompt--font-${promptFontSize}`}
          value={promptText}
          onChange={(event) => updatePromptText(event.target.value)}
          onFocus={() => { closeMenus(); handlePromptFocus() }}
          onBlur={handlePromptBlur}
          placeholder={activeMode.promptPlaceholder}
          aria-label="Composer prompt input"
        />

        {/* References Thumbnails Rail */}
        <ComposerReferencesRail
          selectedReferences={selectedReferences}
          addReference={addReference}
          removeReference={removeReference}
        />
      </div>

      <div className="lab-newlayout-composer-footer">
        <div ref={footerControlsRef} className="lab-newlayout-composer-config-row" aria-label="Composer generation settings">
          <div className="lab-newlayout-composer-footer-setting">
            <button
              type="button"
              className={`lab-newlayout-composer-config-btn lab-newlayout-composer-config-btn--compact${activeFooterMenu === 'ratio' ? ' is-active' : ''}`}
              onClick={() => toggleFooterMenu('ratio')}
              title="Aspect ratio"
            >
              {composerSettings.ratio}
            </button>
            {activeFooterMenu === 'ratio' ? (
              <div className="lab-newlayout-composer-menu lab-newlayout-composer-menu--footer" role="menu" aria-label="Aspect ratio options">
                {composerRatioOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    role="menuitem"
                    className={`lab-newlayout-composer-menu-item${composerSettings.ratio === option.id ? ' is-selected' : ''}`}
                    onMouseDown={preventFocusStealOnMouseDown}
                    onClick={() => applyRatioSetting(option.id)}
                  >
                    <span className="lab-newlayout-composer-menu-item-title">{option.label}</span>
                    <span className="lab-newlayout-composer-menu-item-copy">{option.description}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="lab-newlayout-composer-footer-setting">
            <button
              type="button"
              className={`lab-newlayout-composer-config-btn lab-newlayout-composer-config-btn--compact${activeFooterMenu === 'resolution' ? ' is-active' : ''}`}
              onClick={() => toggleFooterMenu('resolution')}
              title="Resolution"
            >
              {composerSettings.resolution}
            </button>
            {activeFooterMenu === 'resolution' ? (
              <div className="lab-newlayout-composer-menu lab-newlayout-composer-menu--footer" role="menu" aria-label="Resolution options">
                {composerResolutionOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    role="menuitem"
                    className={`lab-newlayout-composer-menu-item${composerSettings.resolution === option.id ? ' is-selected' : ''}`}
                    onMouseDown={preventFocusStealOnMouseDown}
                    onClick={() => applyResolutionSetting(option.id)}
                  >
                    <span className="lab-newlayout-composer-menu-item-title">{option.label}</span>
                    <span className="lab-newlayout-composer-menu-item-copy">{option.description}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className="lab-newlayout-composer-footer-setting">
            <button
              type="button"
              className={`lab-newlayout-composer-config-btn lab-newlayout-composer-config-btn--compact${activeFooterMenu === 'duration' ? ' is-active' : ''}`}
              onClick={() => toggleFooterMenu('duration')}
              title="Duration"
            >
              {composerSettings.duration}s
            </button>
            {activeFooterMenu === 'duration' ? (
              <div className="lab-newlayout-composer-menu lab-newlayout-composer-menu--footer" role="menu" aria-label="Duration options">
                {composerDurationOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    role="menuitem"
                    className={`lab-newlayout-composer-menu-item${composerSettings.duration === option.id ? ' is-selected' : ''}`}
                    onMouseDown={preventFocusStealOnMouseDown}
                    onClick={() => applyDurationSetting(option.id)}
                  >
                    <span className="lab-newlayout-composer-menu-item-title">{option.label}</span>
                    <span className="lab-newlayout-composer-menu-item-copy">{option.description}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <button
            type="button"
            className={`lab-newlayout-composer-audio-btn lab-newlayout-composer-audio-btn--compact${composerSettings.generateAudio ? ' is-active' : ''}`}
            title={composerSettings.generateAudio ? 'Audio generation enabled' : 'Audio generation disabled'}
            onClick={toggleComposerAudio}
          >
            {renderComposerModeIcon('audio')}
          </button>

          <div className="lab-newlayout-composer-footer-setting">
            <button
              type="button"
              className={`lab-newlayout-composer-model-chip lab-newlayout-composer-model-chip--compact${activeFooterMenu === 'model' ? ' is-active' : ''}`}
              onClick={() => toggleFooterMenu('model')}
              title="Generation model"
            >
              {composerModelChip}
            </button>
            {activeFooterMenu === 'model' ? (
              <div className="lab-newlayout-composer-menu lab-newlayout-composer-menu--footer lab-newlayout-composer-menu--footer-wide" role="menu" aria-label="Model options">
                {composerModelOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    role="menuitem"
                    className={`lab-newlayout-composer-menu-item${composerModelChip === option.label ? ' is-selected' : ''}`}
                    onMouseDown={preventFocusStealOnMouseDown}
                    onClick={() => applyModelSetting(option.id)}
                  >
                    <span className="lab-newlayout-composer-menu-item-title">{option.label}</span>
                    <span className="lab-newlayout-composer-menu-item-copy">{option.description}</span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="lab-newlayout-composer-footer-status-row">
          {showBackendIssue ? (
            <div className="lab-newlayout-composer-backend-alert" role="status" aria-live="polite">
              <div className="lab-newlayout-composer-backend-alert-head">
                <span>{normalizedBackendStatusMessage}</span>
                <div className="lab-newlayout-composer-backend-alert-actions">
                  <button
                    type="button"
                    className="lab-newlayout-composer-backend-alert-toggle"
                    onClick={() => setBackendDetailsOpen((current) => !current)}
                    aria-controls="lab-newlayout-composer-backend-details"
                  >
                    {isBackendDetailsOpen ? 'Hide details' : 'Details'}
                  </button>
                  <button
                    type="button"
                    className="lab-newlayout-composer-backend-alert-close"
                    onClick={() => {
                      setDismissedBackendMessage(normalizedBackendStatusMessage)
                      setBackendDetailsOpen(false)
                    }}
                    aria-label="Dismiss backend warning"
                    title="Dismiss"
                  >
                    ×
                  </button>
                </div>
              </div>
              {isBackendDetailsOpen ? (
                <div id="lab-newlayout-composer-backend-details" className="lab-newlayout-composer-backend-alert-details">
                  <div>Readiness check: /api/seedance/readiness</div>
                  <div>Local backend: http://localhost:8787</div>
                  <div>Cooldown: {Math.max(1, Math.ceil(backendCooldownRemainingMs / 1000))}s</div>
                </div>
              ) : null}
            </div>
          ) : null}
          <button
            type="button"
            className="lab-newlayout-composer-generate-btn"
            disabled={!canGenerate || isAutoCreating || isSubmittingGeneration}
            onClick={handleStartGeneration}
            title={canGenerate
              ? 'Generate video'
              : !promptReady
                ? 'Write a prompt to enable generation.'
                : !hasActiveStudioProjectAndFolder
                  ? 'Select a project and folder to enable generation.'
                  : isPreparingReferences
                    ? referenceAccessMessage || 'Preparing reference assets for public access.'
                    : referenceAccessMessage
                      ? referenceAccessMessage
                  : isBackendCoolingDown
                    ? `Generation cooling down. Retry in ${Math.ceil(backendCooldownRemainingMs / 1000)}s.`
                    : backendStatusMessage || 'Back end server is not working. Please run it.'}
          >
            {isAutoCreating ? 'Setting up...' : isSubmittingGeneration ? 'Starting...' : 'Generate'}
          </button>
        </div>
      </div>

      {isGenerationBlockedDialogOpen ? createPortal(
        <div className="lab-newlayout-composer-blocked-dialog-backdrop" role="presentation" onClick={() => setGenerationBlockedDialogOpen(false)}>
          <div
            className="lab-newlayout-composer-blocked-dialog"
            role="dialog"
            aria-labelledby="lab-newlayout-generate-blocked-title"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 id="lab-newlayout-generate-blocked-title" className="lab-newlayout-composer-blocked-dialog-title">
              Write a prompt first
            </h3>
            <p className="lab-newlayout-composer-blocked-dialog-copy">
              Enter a prompt in the text area above to describe what you want to generate.
            </p>
            <div className="lab-newlayout-composer-blocked-dialog-actions">
              <button
                type="button"
                className="lab-newlayout-explorer-dialog-close"
                onClick={() => setGenerationBlockedDialogOpen(false)}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      , document.body) : null}
    </div>
  )
}