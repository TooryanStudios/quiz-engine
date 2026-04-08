import type { WorkhubWorkspaceTemplateDefinition, WorkhubWorkspaceTemplateId } from '../workspaceTemplates'

export function CreateWorkspaceDialog(props: {
  isOpen: boolean
  onClose: () => void
  workspaceName: string
  workspaceDescription: string
  workspaceTemplateId: WorkhubWorkspaceTemplateId
  workspaceTemplates: WorkhubWorkspaceTemplateDefinition[]
  busyKey: string
  canCreateWorkspace: boolean
  onWorkspaceNameChange: (value: string) => void
  onWorkspaceDescriptionChange: (value: string) => void
  onWorkspaceTemplateChange: (value: WorkhubWorkspaceTemplateId) => void
  onCreateWorkspace: () => void
}) {
  if (!props.isOpen) return null

  const selectedTemplate = props.workspaceTemplates.find((item) => item.id === props.workspaceTemplateId)

  return (
    <div className="workhub-modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) props.onClose() }}>
      <div className="workhub-modal workhub-workspace-create-modal" onMouseDown={(event) => event.stopPropagation()}>
        <div className="workhub-modal-head">
          <div>
            <h2>Create workspace</h2>
            <p>Choose a template and create your workspace.</p>
          </div>
        </div>

        <form
          className="workhub-modal-form workhub-workspace-create-form"
          onSubmit={(event) => {
            event.preventDefault()
            props.onCreateWorkspace()
          }}
        >
          <div className="workhub-workspace-create-layout">
            <section className="workhub-workspace-create-fields">
              <label>
                <span>Workspace name</span>
                <input
                  name="workspaceName"
                  value={props.workspaceName}
                  onChange={(event) => props.onWorkspaceNameChange(event.target.value)}
                  placeholder="Operations"
                />
              </label>

              <label>
                <span>Description</span>
                <textarea
                  name="workspaceDescription"
                  value={props.workspaceDescription}
                  onChange={(event) => props.onWorkspaceDescriptionChange(event.target.value)}
                  placeholder="What does this workspace cover?"
                  rows={4}
                />
              </label>

              <div className="workhub-template-selection-note">
                <strong>{selectedTemplate?.label || 'Template'}</strong>
                <span>{selectedTemplate?.description || 'Select a workspace template to continue.'}</span>
                {selectedTemplate?.highlights?.length ? (
                  <div className="workhub-template-selection-highlights">
                    {selectedTemplate.highlights.slice(0, 3).map((item) => (
                      <span key={item} className="workhub-template-highlight">{item}</span>
                    ))}
                  </div>
                ) : null}
              </div>
            </section>

            <section className="workhub-template-picker-wrap">
              <span className="workhub-template-picker-label">Workspace template</span>
              <div className="workhub-template-card-grid" role="radiogroup" aria-label="Workspace templates">
                {props.workspaceTemplates.map((template) => {
                  const isActive = template.id === props.workspaceTemplateId
                  return (
                    <button
                      key={template.id}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      className={`workhub-template-card${isActive ? ' is-active' : ''} workhub-template-${template.id}`}
                      onClick={() => props.onWorkspaceTemplateChange(template.id)}
                    >
                      <span className="workhub-template-graphic" aria-hidden="true">
                        <span className="workhub-template-graphic-code">{template.graphic}</span>
                      </span>
                      <div className="workhub-template-card-content">
                        <strong className="workhub-template-title">{template.label}</strong>
                        <span className="workhub-template-mode">{template.mode === 'empty' ? 'Blank canvas' : 'Preset workflow'}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>
          </div>

          <div className="workhub-create-actions">
            <div className="workhub-create-actions-group">
              <button type="button" className="workhub-ghost-btn" onClick={props.onClose}>Close</button>
              <button
                type="submit"
                className="workhub-primary-btn"
                disabled={props.busyKey === 'workspace' || !props.canCreateWorkspace}
              >
                {props.busyKey === 'workspace' ? 'Creating…' : '🏢 Create workspace'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  )
}
