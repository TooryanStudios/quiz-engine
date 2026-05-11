import type { IDockviewPanelProps } from 'dockview-react'
import { useLabNewLayoutUiSettings } from './LabNewLayoutUiSettingsContext'

type UiSettingsEdgePanelParams = {
  label?: string
  phase?: string
  position?: string
}

export function LabNewLayoutUiSettingsEdgePanel(props: IDockviewPanelProps<UiSettingsEdgePanelParams>) {
  const panelParams = props.params ?? {}
  const {
    canApplyPreset,
    canManageTabClosing,
    canSavePreset,
    canSaveAsDefault,
    canUpdatePreset,
    isTabClosingEnabled,
    presetDraftName,
    presets,
    selectedPresetId,
    onApplyPreset,
    onPresetDraftNameChange,
    onResetLayout,
    onSavePreset,
    onSaveAsDefault,
    onSelectedPresetIdChange,
    onSetTabClosingEnabled,
    onUpdatePreset,
  } = useLabNewLayoutUiSettings()

  return (
    <div className="lab-newlayout-edge-panel lab-newlayout-edge-panel--ui-settings" data-position={panelParams.position ?? 'edge'}>
      <div className="lab-newlayout-edge-head">
        <span className="lab-newlayout-edge-title">{panelParams.label ?? props.api.title}</span>
        {panelParams.phase ? <span className="lab-newlayout-phase-badge">{panelParams.phase}</span> : null}
      </div>

      <div className="lab-newlayout-ui-settings-section">
        <div className="lab-newlayout-explorer-folders-label">Preset Name</div>
        <input
          className="lab-newlayout-ui-settings-field"
          value={presetDraftName}
          onChange={(event) => onPresetDraftNameChange(event.target.value)}
          placeholder="Preset name"
          aria-label="Preset name"
        />
        <div className="lab-newlayout-ui-settings-actions">
          <button
            type="button"
            className="lab-newlayout-ui-settings-action"
            onClick={onSavePreset}
            disabled={!canSavePreset}
          >
            Save Preset
          </button>
        </div>
      </div>

      <div className="lab-newlayout-ui-settings-section">
        <div className="lab-newlayout-explorer-folders-label">Saved Presets</div>
        <select
          className="lab-newlayout-ui-settings-select"
          value={selectedPresetId}
          onChange={(event) => onSelectedPresetIdChange(event.target.value)}
          aria-label="Saved UI presets"
        >
          <option value="">Saved UI presets</option>
          {presets.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
            </option>
          ))}
        </select>
        <div className="lab-newlayout-ui-settings-actions">
          <button
            type="button"
            className="lab-newlayout-ui-settings-action"
            onClick={onApplyPreset}
            disabled={!canApplyPreset}
          >
            Apply Preset
          </button>
          <button
            type="button"
            className="lab-newlayout-ui-settings-action"
            onClick={onUpdatePreset}
            disabled={!canUpdatePreset}
          >
            Update Selected Preset
          </button>
        </div>
      </div>

      <div className="lab-newlayout-ui-settings-section">
        <div className="lab-newlayout-explorer-folders-label">Layout</div>
        <div className="lab-newlayout-ui-settings-actions">
          <button
            type="button"
            className="lab-newlayout-ui-settings-action"
            onClick={onResetLayout}
          >
            Reset Default Layout
          </button>
          {canSaveAsDefault ? (
            <button
              type="button"
              className="lab-newlayout-ui-settings-action"
              onClick={onSaveAsDefault}
              title="Save current UI as the default layout for all users"
            >
              Save as Default UI
            </button>
          ) : null}
        </div>
        {canSaveAsDefault ? (
          <div className="lab-newlayout-ui-settings-note">
            Master-admin only. Becomes the fallback layout shown to every user.
          </div>
        ) : null}
      </div>

      <div className="lab-newlayout-ui-settings-section">
        <div className="lab-newlayout-explorer-folders-label">Tab Closing</div>
        <div className="lab-newlayout-ui-settings-toggle-row" role="group" aria-label="Tab closing policy">
          <button
            type="button"
            className={`lab-newlayout-ui-settings-toggle${!isTabClosingEnabled ? ' is-active' : ''}`}
            onClick={() => onSetTabClosingEnabled(false)}
            disabled={!canManageTabClosing}
          >
            Off
          </button>
          <button
            type="button"
            className={`lab-newlayout-ui-settings-toggle${isTabClosingEnabled ? ' is-active' : ''}`}
            onClick={() => onSetTabClosingEnabled(true)}
            disabled={!canManageTabClosing}
          >
            Master Admin Only
          </button>
        </div>
        <div className="lab-newlayout-ui-settings-note">
          Main workspace tabs stay non-closable by default. Side-rail tabs remain fixed.
        </div>
      </div>
    </div>
  )
}