import { useEffect, useRef } from 'react'
import type { IDockviewPanelProps } from 'dockview-react'
import { useLabNewLayoutComposer } from './useLabNewLayoutComposer'

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

function renderComposerActionIcon(actionId: 'templates' | 'refine') {
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

  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l1.8 3.7L18 8.5l-3 2.9.7 4.1L12 13.8l-3.7 1.7.7-4.1-3-2.9 4.2-1.8L12 3z" />
    </svg>
  )
}

export function LabNewLayoutComposerPanel(_props: IDockviewPanelProps<Record<string, never>>) {
  const topStackRef = useRef<HTMLDivElement | null>(null)
  const {
    activeMode,
    activeModeId,
    applyRefineAction,
    applyTemplate,
    closeMenus,
    composerConfigChips,
    composerModelChip,
    composerModeOptions,
    composerRefineActions,
    composerTemplates,
    isRefineMenuOpen,
    isTemplatesMenuOpen,
    promptText,
    selectMode,
    toggleRefineMenu,
    toggleTemplatesMenu,
    updatePromptText,
    startGeneration,
    isGenerating,
    generationStatus,
    selectedReferences,
    addReference,
    removeReference,
  } = useLabNewLayoutComposer()

  const railRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isTemplatesMenuOpen && !isRefineMenuOpen) {
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

      closeMenus()
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [closeMenus, isRefineMenuOpen, isTemplatesMenuOpen])

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
                onClick={() => applyRefineAction(action.id)}
              >
                <span className="lab-newlayout-composer-menu-item-title">{action.label}</span>
                <span className="lab-newlayout-composer-menu-item-copy">{action.description}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="lab-newlayout-composer-body lab-newlayout-composer-body--stack">
        <textarea
          className="lab-newlayout-composer-prompt lab-textarea--composer lab-newlayout-composer-prompt--stretch"
          value={promptText}
          onChange={(event) => updatePromptText(event.target.value)}
          onFocus={closeMenus}
          placeholder={activeMode.promptPlaceholder}
          aria-label="Composer prompt input"
        />

        {/* References Thumbnails Rail */}
        <div
          ref={railRef}
          className="lab-newlayout-composer-references-rail"
          onDragOver={(e) => {
            e.preventDefault()
            e.dataTransfer.dropEffect = 'copy'
          }}
          onDrop={(e) => {
            e.preventDefault()
            const data = e.dataTransfer.getData('application/json')
            if (data) {
              try {
                const item = JSON.parse(data)
                addReference(item)
                setTimeout(() => {
                  if (railRef.current) {
                    railRef.current.scrollTo({ left: railRef.current.scrollWidth, behavior: 'smooth' })
                  }
                }, 50)
              } catch(err) {}
            }
          }}
        >
          {selectedReferences.map(ref => (
            <div
              key={ref.id}
              className="lab-newlayout-composer-ref-item"
              onMouseEnter={(e) => e.currentTarget.classList.add('is-hovered')}
              onMouseLeave={(e) => e.currentTarget.classList.remove('is-hovered')}
            >
              {ref.kind === 'video' ? (
                <video src={ref.url} className="lab-newlayout-composer-ref-media" muted loop playsInline />
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
          ))}
          <div className="lab-newlayout-composer-drop-target">
            + Drop
          </div>
        </div>
      </div>

      <div className="lab-newlayout-composer-footer">
        <div className="lab-newlayout-composer-config-row" aria-label="Composer generation settings">
          {composerConfigChips.map((label) => (
            <button key={label} type="button" className="lab-newlayout-composer-config-btn lab-newlayout-composer-config-btn--compact">
              {label}
            </button>
          ))}
          <button type="button" className="lab-newlayout-composer-audio-btn lab-newlayout-composer-audio-btn--compact" title="Audio references enabled">
            {renderComposerModeIcon('audio')}
          </button>
          <button type="button" className="lab-newlayout-composer-model-chip lab-newlayout-composer-model-chip--compact">
            {composerModelChip}
          </button>
        </div>

        <div className="lab-newlayout-composer-footer-status-row">
          <div className="lab-newlayout-composer-status-slot">
            {generationStatus && (
              <span className="lab-newlayout-composer-status-text">{generationStatus}</span>
            )}
          </div>
          <button
            type="button"
            className="lab-newlayout-composer-generate-btn"
            disabled={isGenerating || !promptText.trim()}
            onClick={startGeneration}
          >
            {isGenerating ? 'Generating...' : 'Generate'}
          </button>
        </div>
      </div>
    </div>
  )
}