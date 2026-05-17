import type { IDockviewPanelProps } from 'dockview-react'
import { useLabNewLayoutDirectApi } from './useLabNewLayoutDirectApi'

type DirectApiPanelParams = {
  label?: string
  phase?: string
}

export function LabNewLayoutDirectApiPanel(props: IDockviewPanelProps<DirectApiPanelParams>) {
  const panelParams = props.params ?? {}
  const title = panelParams.label ?? props.api.title
  const {
    directRequestJson,
    finalRequestBodyPreview,
    resetDirectRequestJson,
    reloadComposerPreview,
    loadFullRequestJson,
    setDirectRequestJson,
    submitDirectJson,
    generationStatus,
    isMasterAdminUser,
  } = useLabNewLayoutDirectApi()

  return (
    <div className="lab-newlayout-panel lab-newlayout-panel--direct-api">
      <div className="lab-newlayout-direct-group lab-newlayout-direct-group--editor">
        <div className="lab-newlayout-direct-group-head">
          <div className="lab-newlayout-panel-head">
            <div>
              <div className="lab-newlayout-panel-kicker">Direct Submit</div>
              <span className="lab-newlayout-panel-title">{title}</span>
            </div>
            {panelParams.phase ? <span className="lab-newlayout-phase-badge">{panelParams.phase}</span> : null}
          </div>

          <div className="lab-newlayout-direct-group-actions">
            <button
              type="button"
              className="lab-newlayout-direct-action-btn"
              onClick={loadFullRequestJson}
              title="Load Full Request (including endpoint & settings)"
            >
              [+] Full Request
            </button>
            <button
              type="button"
              className="lab-newlayout-direct-action-btn"
              onClick={() => {
                reloadComposerPreview()
                resetDirectRequestJson()
              }}
            >
              Load Current Preview
            </button>
          </div>
        </div>

        <textarea
          className="lab-newlayout-direct-json-input"
          value={directRequestJson}
          onChange={(event) => setDirectRequestJson(event.target.value)}
          spellCheck={false}
          aria-label="Direct API JSON input"
        />

        <div className="lab-newlayout-direct-footer">
          <div className="lab-newlayout-direct-footer-actions">
            <button type="button" className="lab-newlayout-direct-action-btn">
              Save Preset
            </button>
            <button type="button" className="lab-newlayout-direct-action-btn">
              Load Template
            </button>
          </div>
          
          <div className="lab-newlayout-direct-footer-right">
            {generationStatus && <span className="lab-newlayout-direct-status-text">{generationStatus}</span>}
            
            <button 
              type="button" 
              className="lab-newlayout-direct-submit-btn"
              disabled={!isMasterAdminUser || !directRequestJson.trim()}
              title={isMasterAdminUser ? undefined : 'Only the master admin can generate.'}
              onClick={submitDirectJson}
            >
              Submit JSON
            </button>
          </div>
        </div>
      </div>

      <div className="lab-newlayout-direct-group lab-newlayout-direct-preview lab-newlayout-direct-preview--grow" role="region" aria-label="Final request body preview">
        <div className="lab-newlayout-direct-preview-head">
          <strong>Final Request Body</strong>
          <button
            type="button"
            className="lab-newlayout-direct-action-btn"
            onClick={reloadComposerPreview}
            title="Reload from current composer state"
          >
            Reload
          </button>
        </div>
        <pre className="lab-newlayout-direct-preview-code lab-newlayout-direct-preview-code--grow">{finalRequestBodyPreview}</pre>
      </div>
    </div>
  )
}