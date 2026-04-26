import type { ReactNode } from 'react'

type HomeTemplateWidget = {
  id: string
  title: string
  value: ReactNode
  detail: string
  tone?: string
}

interface WorkhubHomeSectionProps {
  selectedWorkspaceId: string
  selectedWorkspaceName: string
  selectedProjectDisplayName: string
  taskTotal: number
  membersWithAssignedTasks: number
  selectedWorkspaceHomeTemplate: { label: string; description: string }
  selectedWorkspaceWarning: string
  homeTemplateWidgets: HomeTemplateWidget[]
  navigateToWorkspaceSection: (section: 'dashboard' | 'tasks') => void
  openWorkspaceSettings: (workspaceId: string) => void
}

export function WorkhubHomeSection({
  selectedWorkspaceId,
  selectedWorkspaceName,
  selectedProjectDisplayName,
  taskTotal,
  membersWithAssignedTasks,
  selectedWorkspaceHomeTemplate,
  selectedWorkspaceWarning,
  homeTemplateWidgets,
  navigateToWorkspaceSection,
  openWorkspaceSettings,
}: WorkhubHomeSectionProps) {
  return (
    <main className="workhub-section-stack">
      <section className="workhub-panel">
        <div className="workhub-panel-head">
          <div>
            <h2>Home</h2>
            <p>
              {selectedWorkspaceId
                ? `${selectedWorkspaceHomeTemplate.label}. ${selectedWorkspaceHomeTemplate.description}`
                : 'Select a workspace to load template-focused home panels.'}
            </p>
          </div>
        </div>
        <div className="workhub-summary-strip">
          <div className="workhub-summary-tile"><strong>{selectedWorkspaceName || 'No workspace selected'}</strong><span>Current workspace</span></div>
          <div className="workhub-summary-tile"><strong>{selectedProjectDisplayName}</strong><span>Current scope</span></div>
          <div className="workhub-summary-tile"><strong>{taskTotal}</strong><span>Tasks in scope</span></div>
          <div className="workhub-summary-tile"><strong>{membersWithAssignedTasks}</strong><span>Members with assigned tasks</span></div>
        </div>
        {selectedWorkspaceId && selectedWorkspaceWarning ? (
          <div className="workhub-template-warning-note">{selectedWorkspaceWarning}</div>
        ) : null}
        {selectedWorkspaceId ? (
          <div className="workhub-home-template-grid">
            {homeTemplateWidgets.map((widget) => (
              <article key={widget.id} className={`workhub-overview-card workhub-home-widget${widget.tone ? ` is-${widget.tone}` : ''}`}>
                <div className="workhub-overview-head">
                  <h3>{widget.title}</h3>
                  <span>{widget.value}</span>
                </div>
                <p className="workhub-home-widget-note">{widget.detail}</p>
              </article>
            ))}
          </div>
        ) : (
          <div className="workhub-empty-state">Select a workspace to view template-based home widgets.</div>
        )}
        <div className="workhub-home-actions">
          <button className="workhub-primary-btn" onClick={() => navigateToWorkspaceSection('dashboard')} disabled={!selectedWorkspaceId}>Open workspace overview</button>
          <button className="workhub-ghost-btn" onClick={() => navigateToWorkspaceSection('tasks')} disabled={!selectedWorkspaceId}>Go to tasks</button>
          <button className="workhub-ghost-btn" onClick={() => selectedWorkspaceId && openWorkspaceSettings(selectedWorkspaceId)} disabled={!selectedWorkspaceId}>Workspace settings</button>
        </div>
      </section>
    </main>
  )
}
