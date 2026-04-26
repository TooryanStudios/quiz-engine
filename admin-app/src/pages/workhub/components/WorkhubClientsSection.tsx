import { type Dispatch, type SetStateAction } from 'react'
import { type WorkhubClient, type WorkhubProject, type WorkhubWorkspace } from '../../../lib/workhubRepo'

interface WorkhubClientsSectionProps {
  selectedClientId: string
  setSelectedClientId: Dispatch<SetStateAction<string>>
  busyKey: string
  handleCreateClientFromManager: () => Promise<void>
  handleSaveClientDetails: () => Promise<void>
  handleDeleteClientDetails: () => Promise<void>
  clients: WorkhubClient[]
  projects: WorkhubProject[]
  visibleWorkspaces: WorkhubWorkspace[]
  workspaceDisplayNameById: Record<string, string>
  clientNameDraft: string
  setClientNameDraft: Dispatch<SetStateAction<string>>
  clientContactPersonDraft: string
  setClientContactPersonDraft: Dispatch<SetStateAction<string>>
  clientEmailDraft: string
  setClientEmailDraft: Dispatch<SetStateAction<string>>
  clientPhoneDraft: string
  setClientPhoneDraft: Dispatch<SetStateAction<string>>
  clientWebsiteDraft: string
  setClientWebsiteDraft: Dispatch<SetStateAction<string>>
  clientAddressDraft: string
  setClientAddressDraft: Dispatch<SetStateAction<string>>
  clientIndustryDraft: string
  setClientIndustryDraft: Dispatch<SetStateAction<string>>
  clientLogoUrlDraft: string
  setClientLogoUrlDraft: Dispatch<SetStateAction<string>>
  clientNotesDraft: string
  setClientNotesDraft: Dispatch<SetStateAction<string>>
  handleClientLogoFileUpload: (file: File) => Promise<void>
}

export function WorkhubClientsSection({
  selectedClientId,
  setSelectedClientId,
  busyKey,
  handleCreateClientFromManager,
  handleSaveClientDetails,
  handleDeleteClientDetails,
  clients,
  projects,
  visibleWorkspaces,
  workspaceDisplayNameById,
  clientNameDraft,
  setClientNameDraft,
  clientContactPersonDraft,
  setClientContactPersonDraft,
  clientEmailDraft,
  setClientEmailDraft,
  clientPhoneDraft,
  setClientPhoneDraft,
  clientWebsiteDraft,
  setClientWebsiteDraft,
  clientAddressDraft,
  setClientAddressDraft,
  clientIndustryDraft,
  setClientIndustryDraft,
  clientLogoUrlDraft,
  setClientLogoUrlDraft,
  clientNotesDraft,
  setClientNotesDraft,
  handleClientLogoFileUpload,
}: WorkhubClientsSectionProps) {
  return (
    <main className="workhub-section-stack">
      <section className="workhub-panel">
        <div className="workhub-panel-head compact">
          <div>
            <h2>Client management</h2>
            <p>Maintain client profiles and link them to projects for better bid and delivery tracking. Only client name is required.</p>
          </div>
          <div className="workhub-panel-tools">
            <button
              className="workhub-ghost-btn"
              onClick={() => {
                setSelectedClientId('__new__')
                setClientNameDraft('')
                setClientContactPersonDraft('')
                setClientEmailDraft('')
                setClientPhoneDraft('')
                setClientWebsiteDraft('')
                setClientAddressDraft('')
                setClientIndustryDraft('')
                setClientLogoUrlDraft('')
                setClientNotesDraft('')
              }}
            >
              ➕ New client
            </button>
            {selectedClientId === '__new__' ? (
              <button type="button" className="workhub-primary-btn" onClick={() => { void handleCreateClientFromManager() }} disabled={busyKey === 'client:create'}>
                {busyKey === 'client:create' ? 'Creating…' : '🏢 Create client'}
              </button>
            ) : (
              <button type="button" className="workhub-primary-btn" onClick={() => { void handleSaveClientDetails() }} disabled={!selectedClientId || busyKey === `client:save:${selectedClientId}`}>
                {busyKey === `client:save:${selectedClientId}` ? 'Saving…' : 'Save client'}
              </button>
            )}
            <button
              className="workhub-danger-btn"
              onClick={() => { void handleDeleteClientDetails() }}
              disabled={!selectedClientId || selectedClientId === '__new__' || busyKey === `client:delete:${selectedClientId}`}
            >
              {busyKey === `client:delete:${selectedClientId}` ? 'Deleting…' : 'Delete client'}
            </button>
          </div>
        </div>
        <div className="workhub-client-layout">
          <div className="workhub-client-list">
            {clients.map((client) => {
              const linkedCount = projects.filter((project) => project.clientId === client.id).length
              const workspace = visibleWorkspaces.find((item) => item.id === client.workspaceId) || null
              const workspaceName = workspace
                ? (workspaceDisplayNameById[workspace.id] || workspace.name)
                : 'Workspace'
              return (
                <button
                  key={client.id}
                  type="button"
                  className={`workhub-client-list-item${selectedClientId === client.id ? ' is-active' : ''}`}
                  onClick={() => setSelectedClientId(client.id)}
                >
                  <strong>{client.name}</strong>
                  <span>{client.contactPerson || client.email || 'No contact details'}</span>
                  <small className="workhub-client-workspace-label">{workspaceName}</small>
                  <small>{linkedCount} linked project{linkedCount === 1 ? '' : 's'}</small>
                </button>
              )
            })}
            {clients.length === 0 && <div className="workhub-empty-state">No clients yet. Create your first client profile.</div>}
          </div>
          <div className="workhub-modal-form workhub-client-form">
            <label>
              <span>Client name</span>
              <input value={clientNameDraft} onChange={(event) => setClientNameDraft(event.target.value)} placeholder="Acme Industries" />
            </label>
            <label>
              <span>Contact person</span>
              <input value={clientContactPersonDraft} onChange={(event) => setClientContactPersonDraft(event.target.value)} placeholder="Primary contact" />
            </label>
            <div className="workhub-field-grid two compact">
              <label>
                <span>Email</span>
                <input type="email" value={clientEmailDraft} onChange={(event) => setClientEmailDraft(event.target.value)} placeholder="contact@client.com" />
              </label>
              <label>
                <span>Phone</span>
                <input value={clientPhoneDraft} onChange={(event) => setClientPhoneDraft(event.target.value)} placeholder="+971 ..." />
              </label>
            </div>
            <div className="workhub-field-grid two compact">
              <label>
                <span>Website</span>
                <input value={clientWebsiteDraft} onChange={(event) => setClientWebsiteDraft(event.target.value)} placeholder="https://client.com" />
              </label>
              <label>
                <span>Industry</span>
                <input value={clientIndustryDraft} onChange={(event) => setClientIndustryDraft(event.target.value)} placeholder="Construction, Oil & Gas, Tech..." />
              </label>
            </div>
            <label>
              <span>Address</span>
              <textarea rows={2} value={clientAddressDraft} onChange={(event) => setClientAddressDraft(event.target.value)} placeholder="Client address" />
            </label>
            <label>
              <span>Logo URL</span>
              <input value={clientLogoUrlDraft} onChange={(event) => setClientLogoUrlDraft(event.target.value)} placeholder="https://.../logo.png" />
            </label>
            <div className="workhub-inline-row workhub-client-logo-upload-row">
              <label className="workhub-file-upload-btn workhub-client-logo-upload-btn">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    event.target.value = ''
                    if (!file) return
                    void handleClientLogoFileUpload(file)
                  }}
                />
                Upload logo
              </label>
              {busyKey === 'client:logo-upload' && <span className="workhub-meta-line">Uploading logo…</span>}
            </div>
            {clientLogoUrlDraft.trim() && (
              <div className="workhub-client-logo-preview">
                <img src={clientLogoUrlDraft} alt="Client logo preview" onError={(event) => { event.currentTarget.style.display = 'none' }} />
              </div>
            )}
            <label>
              <span>Notes</span>
              <textarea rows={4} value={clientNotesDraft} onChange={(event) => setClientNotesDraft(event.target.value)} placeholder="Commercial terms, preferred formats, compliance notes..." />
            </label>
          </div>
        </div>
      </section>
    </main>
  )
}
