import { type Dispatch, type SetStateAction } from 'react'
import { type WorkhubMember, type WorkhubWorkspace } from '../../../lib/workhubRepo'
import { type WorkhubUserAccessDraft, type WorkhubUserAccessMode } from '../accessTypes'

interface WorkhubUsersSectionProps {
  userWorkspaceFilter: string
  setUserWorkspaceFilter: Dispatch<SetStateAction<string>>
  expandedUserPickerUid: string | null
  setExpandedUserPickerUid: Dispatch<SetStateAction<string | null>>
  visibleWorkspaces: WorkhubWorkspace[]
  workspaceDisplayNameById: Record<string, string>
  userManagementApprovedMembers: WorkhubMember[]
  userManagementPendingMembers: WorkhubMember[]
  userManagementMembers: WorkhubMember[]
  normalizedMasterEmail: string
  memberWorkspaceSummaryByUid: Record<string, { count: number; names: string[] }>
  userAccessEffectiveByUid: Record<string, WorkhubUserAccessDraft>
  busyKey: string
  userAccessDraftDirtyByUid: Record<string, boolean>
  memberNameDraftByUid: Record<string, string>
  setMemberNameDraftByUid: Dispatch<SetStateAction<Record<string, string>>>
  handleSaveMemberDisplayName: (targetUid: string) => Promise<void>
  handleApproveRequestGlobal: (targetUid: string) => Promise<void>
  handleMemberModeration: (targetUid: string, status: 'approved' | 'suspended', role?: 'member' | 'manager' | 'admin', reason?: string) => Promise<void>
  handleSetUserAccessModeDraft: (targetUid: string, mode: WorkhubUserAccessMode) => void
  handleToggleUserWorkspaceDraft: (targetUid: string, workspaceId: string, enabled: boolean) => void
  handleSetUserWorkspaceLevelDraft: (targetUid: string, workspaceId: string, level: 'full' | 'custom') => void
  handleDiscardUserAccessDraft: (targetUid: string) => void
  handleSaveUserAccessDraft: (targetUid: string) => Promise<void>
  selectedWorkspaceId: string
}

export function WorkhubUsersSection({
  userWorkspaceFilter,
  setUserWorkspaceFilter,
  expandedUserPickerUid,
  setExpandedUserPickerUid,
  visibleWorkspaces,
  workspaceDisplayNameById,
  userManagementApprovedMembers,
  userManagementPendingMembers,
  userManagementMembers,
  normalizedMasterEmail,
  memberWorkspaceSummaryByUid,
  userAccessEffectiveByUid,
  busyKey,
  userAccessDraftDirtyByUid,
  memberNameDraftByUid,
  setMemberNameDraftByUid,
  handleSaveMemberDisplayName,
  handleApproveRequestGlobal,
  handleMemberModeration,
  handleSetUserAccessModeDraft,
  handleToggleUserWorkspaceDraft,
  handleSetUserWorkspaceLevelDraft,
  handleDiscardUserAccessDraft,
  handleSaveUserAccessDraft,
  selectedWorkspaceId,
}: WorkhubUsersSectionProps) {
  return (
    <main className="workhub-section-stack">
      <section className="workhub-panel workhub-user-management-panel">
        <div className="workhub-panel-head compact">
          <div>
            <h2>User management</h2>
            <p>Approve requests and choose access mode per user: Full or Workspace-based.</p>
          </div>
          <div className="workhub-user-management-tools">
            <label>
              <span>Workspace scope</span>
              <select
                value={userWorkspaceFilter}
                onChange={(event) => {
                  setUserWorkspaceFilter(event.target.value)
                  setExpandedUserPickerUid(null)
                }}
              >
                <option value="all">All accessible workspaces</option>
                {visibleWorkspaces.map((workspace) => (
                  <option key={workspace.id} value={workspace.id}>{workspaceDisplayNameById[workspace.id] || workspace.name}</option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="workhub-members-section">
          <div className="workhub-members-section-head">
            <strong>Members</strong>
            <span className="workhub-members-count">
              {userManagementApprovedMembers.length} active
              {userManagementPendingMembers.length > 0 && (
                <span className="workhub-pending-badge">{userManagementPendingMembers.length} pending</span>
              )}
            </span>
          </div>
          {userManagementMembers.length === 0 && (
            <div className="workhub-empty-state">No members match this scope.</div>
          )}
          <div className="workhub-member-list">
            {userManagementMembers.map((item) => {
              const isPending = item.status === 'pending'
              const isSuspended = item.status === 'suspended'
              const isMasterTarget = !!normalizedMasterEmail && (item.email || '').trim().toLowerCase() === normalizedMasterEmail
              const summary = memberWorkspaceSummaryByUid[item.uid] || { count: 0, names: [] }
              const effectiveAccess = userAccessEffectiveByUid[item.uid] || { mode: 'workspace_based' as WorkhubUserAccessMode, workspaceById: {} }
              const accessMode = effectiveAccess.mode
              const isPickerOpen = expandedUserPickerUid === item.uid
              const isBusyRequest = busyKey === `member-request:${item.uid}`
              const isSavingAccess = busyKey === `user-access-save:${item.uid}`
              const isSavingName = busyKey === `member-name:${item.uid}`
              const hasDraftChanges = userAccessDraftDirtyByUid[item.uid] || false
              const memberNameDraft = memberNameDraftByUid[item.uid] ?? (item.displayName || '')
              const hasNameDraftChange = memberNameDraft.trim().length > 0 && memberNameDraft.trim() !== (item.displayName || '').trim()
              const initials = (item.displayName || item.email || '?')
                .split(' ').map((word: string) => word[0]).slice(0, 2).join('').toUpperCase()
              return (
                <div key={item.uid} className="workhub-member-row-wrap">
                  <div className={`workhub-member-row settings-row${isPending ? ' is-pending' : ''}${isSuspended ? ' is-suspended' : ''}`}>
                    <div className="workhub-member-avatar settings-avatar" aria-hidden="true">{initials}</div>
                    <div className="workhub-member-identity">
                      <span className="workhub-member-name">{item.displayName || item.email || item.uid}</span>
                      <span className="workhub-member-email">{item.email || '—'}</span>
                      <div className="workhub-inline-row" style={{ marginTop: 6, gap: 6 }}>
                        <input
                          type="text"
                          value={memberNameDraft}
                          disabled={isSavingName || isMasterTarget}
                          onChange={(event) => {
                            const nextValue = event.target.value
                            setMemberNameDraftByUid((current) => ({ ...current, [item.uid]: nextValue }))
                          }}
                          placeholder="Set display name"
                          style={{ minWidth: 170 }}
                        />
                        <button
                          type="button"
                          className="workhub-primary-mini"
                          disabled={isSavingName || isMasterTarget || !hasNameDraftChange}
                          onClick={() => { void handleSaveMemberDisplayName(item.uid) }}
                        >
                          {isSavingName ? 'Saving…' : 'Save name'}
                        </button>
                      </div>
                    </div>
                    <div className="workhub-member-workspaces">
                      <span className="workhub-ws-count-label">
                        {summary.count > 0 ? `${summary.count} workspace${summary.count === 1 ? '' : 's'}` : <span className="workhub-muted">No workspaces</span>}
                      </span>
                    </div>
                    <div className="workhub-member-actions">
                      {isPending ? (
                        <>
                          <span className="workhub-status-pill pending">Pending request</span>
                          <button
                            type="button"
                            className="workhub-approve-btn"
                            disabled={isBusyRequest || isMasterTarget}
                            onClick={() => { void handleApproveRequestGlobal(item.uid) }}
                            title="Approve user"
                          >
                            {isBusyRequest ? '…' : 'Approve'}
                          </button>
                          <button
                            type="button"
                            className="workhub-decline-btn"
                            disabled={isBusyRequest || isMasterTarget}
                            onClick={() => { void handleMemberModeration(item.uid, 'suspended', item.role) }}
                            title="Decline request"
                          >
                            Reject
                          </button>
                        </>
                      ) : isSuspended ? (
                        <>
                          <span className="workhub-status-pill suspended">Suspended</span>
                          <button
                            type="button"
                            className="workhub-approve-btn"
                            disabled={isBusyRequest || isMasterTarget}
                            onClick={() => { void handleMemberModeration(item.uid, 'approved', item.role) }}
                            title="Re-approve user"
                          >
                            Reactivate
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="workhub-user-mode-toggle" title="Access mode">
                            <button
                              type="button"
                              className={`workhub-user-mode-btn${accessMode === 'full' ? ' is-active' : ''}`}
                              disabled={isSavingAccess || isMasterTarget}
                              onClick={() => {
                                setExpandedUserPickerUid(null)
                                handleSetUserAccessModeDraft(item.uid, 'full')
                              }}
                            >
                              Full
                            </button>
                            <button
                              type="button"
                              className={`workhub-user-mode-btn${accessMode === 'workspace_based' ? ' is-active' : ''}`}
                              disabled={isSavingAccess || isMasterTarget}
                              onClick={() => {
                                handleSetUserAccessModeDraft(item.uid, 'workspace_based')
                                setExpandedUserPickerUid(item.uid)
                              }}
                            >
                              Workspace
                            </button>
                          </div>
                          {accessMode === 'workspace_based' ? (
                            <button
                              type="button"
                              className={`workhub-ws-count-btn${isPickerOpen ? ' is-open' : ''}`}
                              disabled={isSavingAccess || isMasterTarget}
                              onClick={() => setExpandedUserPickerUid(isPickerOpen ? null : item.uid)}
                            >
                              Manage access
                              <span className="workhub-ws-count-chevron">{isPickerOpen ? '▲' : '▼'}</span>
                            </button>
                          ) : (
                            <span className="workhub-user-mode-pill">All workspaces</span>
                          )}
                          <button
                            type="button"
                            className="workhub-ghost-mini"
                            disabled={!hasDraftChanges || isSavingAccess || isMasterTarget}
                            onClick={() => handleDiscardUserAccessDraft(item.uid)}
                          >
                            Discard
                          </button>
                          <button
                            type="button"
                            className="workhub-primary-mini"
                            disabled={!hasDraftChanges || isSavingAccess || isMasterTarget}
                            onClick={() => { void handleSaveUserAccessDraft(item.uid) }}
                          >
                            {isSavingAccess ? 'Saving…' : 'Save'}
                          </button>
                          <button
                            type="button"
                            className="workhub-decline-btn"
                            disabled={isBusyRequest || isMasterTarget}
                            onClick={() => { void handleMemberModeration(item.uid, 'suspended', item.role) }}
                            title="Suspend user"
                          >
                            Suspend
                          </button>
                        </>
                      )}
                      {isMasterTarget && <span className="workhub-user-mode-pill">Master (locked)</span>}
                    </div>
                  </div>
                  {isPickerOpen && accessMode === 'workspace_based' && (
                    <div className="workhub-ws-picker">
                      <div className="workhub-ws-picker-title">Workspace access for {item.displayName || item.email}</div>
                      <div className="workhub-ws-picker-list">
                        {visibleWorkspaces.map((workspace) => {
                          const workspaceEntry = effectiveAccess.workspaceById[workspace.id] || { enabled: false, level: 'custom' as const }
                          const isChecked = workspaceEntry.enabled
                          const accessLevel = workspaceEntry.level
                          return (
                            <div key={workspace.id} className="workhub-ws-picker-row">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                disabled={isSavingAccess}
                                onChange={(event) => handleToggleUserWorkspaceDraft(item.uid, workspace.id, event.target.checked)}
                              />
                              <span className="workhub-ws-picker-name">{workspaceDisplayNameById[workspace.id] || workspace.name}</span>
                              {isChecked && (
                                <div className="workhub-access-level-toggle workhub-ws-access-level-toggle" title="Access level for this workspace">
                                  <button
                                    type="button"
                                    className={`workhub-access-level-btn${accessLevel === 'full' ? ' is-active' : ''}`}
                                    disabled={isSavingAccess}
                                    onClick={() => handleSetUserWorkspaceLevelDraft(item.uid, workspace.id, 'full')}
                                  >
                                    Full
                                  </button>
                                  <button
                                    type="button"
                                    className={`workhub-access-level-btn${accessLevel === 'custom' ? ' is-active' : ''}`}
                                    disabled={isSavingAccess}
                                    onClick={() => handleSetUserWorkspaceLevelDraft(item.uid, workspace.id, 'custom')}
                                  >
                                    Custom
                                  </button>
                                </div>
                              )}
                              {workspace.id === selectedWorkspaceId && <span className="workhub-ws-picker-badge current">Current</span>}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </section>
    </main>
  )
}
