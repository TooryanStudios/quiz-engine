import { useState, type Dispatch, type SetStateAction } from 'react'
import './WorkhubUsersSection.css'
import { Pencil } from 'lucide-react'
import { WorkhubMemberPanel } from './WorkhubMemberPanel'
import { WorkhubInvitations } from './WorkhubInvitations'
import { buildWorkhubInvitations } from '../invitationModel'
import { type WorkhubMember, type WorkhubWorkspace } from '../../../lib/workhubRepo'
import { type WorkhubUserAccessDraft, type WorkhubUserAccessMode } from '../accessTypes'

export interface WorkhubUsersSectionProps {
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
  handleSaveMemberDisplayName: (targetUid: string) => Promise<boolean>
  handleApproveRequestGlobal: (targetUid: string) => Promise<void>
  handleMemberModeration: (targetUid: string, status: 'approved' | 'suspended', role?: 'member' | 'manager' | 'admin', reason?: string) => Promise<boolean>
  handleSetUserAccessModeDraft: (targetUid: string, mode: WorkhubUserAccessMode) => void
  handleToggleUserWorkspaceDraft: (targetUid: string, workspaceId: string, enabled: boolean) => void
  handleSetUserWorkspaceLevelDraft: (targetUid: string, workspaceId: string, level: 'full' | 'custom') => void
  handleDiscardUserAccessDraft: (targetUid: string) => void
  handleSaveUserAccessDraft: (targetUid: string) => Promise<boolean>
  selectedWorkspaceId: string
  membersLoading: boolean
  membersError: string | null
  onRetryMembers: () => void
  canInvite: boolean
  allMembers: WorkhubMember[]
}

export function WorkhubUsersSection({
  userWorkspaceFilter,
  setUserWorkspaceFilter,
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
  membersLoading,
  membersError,
  onRetryMembers,
  canInvite,
  allMembers,
}: WorkhubUsersSectionProps) {
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState<'members' | 'invitations' | 'requests'>('members')
  const invitations = buildWorkhubInvitations(visibleWorkspaces, allMembers)
  const [statusFilter, setStatusFilter] = useState('all')
  const [editingUid, setEditingUid] = useState<string | null>(null)
  const existingMembers = userManagementMembers.filter((item) => item.status !== 'pending')
  const normalizedSearch = search.trim().toLowerCase()
  const filteredMembers = existingMembers.filter((item) => (
    (statusFilter === 'all' || item.status === statusFilter)
    && (!normalizedSearch || `${item.displayName || ''} ${item.email || ''}`.toLowerCase().includes(normalizedSearch))
  )).sort((a, b) => {
    const order = { pending: 0, approved: 1, suspended: 2 }
    return (order[a.status] ?? 3) - (order[b.status] ?? 3)
      || (a.displayName || a.email || a.uid).localeCompare(b.displayName || b.email || b.uid)
  })
  const statusOptions = [
    { value: 'all', label: 'All members', count: existingMembers.length },
    { value: 'approved', label: 'Active', count: userManagementApprovedMembers.length },
    { value: 'suspended', label: 'Suspended', count: userManagementMembers.filter((item) => item.status === 'suspended').length },
  ]
  return (
    <main className="workhub-section-stack workhub-users-page">
      <section className="workhub-panel workhub-user-management-panel">
        <div className="workhub-panel-head compact">
          <div>
            <h2>User management</h2>
            <p>People and workspace access</p>
          </div>
          <div className="workhub-user-management-tools">
            <WorkhubInvitations workspaces={visibleWorkspaces} members={allMembers} canInvite={canInvite} mode="toolbar" />
          </div>
        </div>
        <div className="workhub-users-navigation" role="group" aria-label="User management views">
          <button type="button" aria-pressed={activeTab === 'members'} onClick={() => setActiveTab('members')}>Members <span>{allMembers.filter((item) => item.status !== 'pending').length}</span></button>
          <button type="button" aria-pressed={activeTab === 'invitations'} onClick={() => setActiveTab('invitations')}>Invitations <span>{invitations.length}</span></button>
          <button type="button" aria-pressed={activeTab === 'requests'} onClick={() => setActiveTab('requests')}>Join requests <span>{userManagementPendingMembers.length}</span></button>
        </div>
        {activeTab === 'members' && <div className="workhub-users-filterbar">
            <input aria-label="Find a member" type="search" placeholder="Search name or email" value={search} onChange={(event) => setSearch(event.target.value)} />
            <select aria-label="Member status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              {statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label} ({option.count})</option>)}
            </select>
            <label>
              <span className="workhub-users-visually-hidden">Workspace scope</span>
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
        </div>}

        {activeTab === 'invitations' && <WorkhubInvitations workspaces={visibleWorkspaces} members={allMembers} canInvite={canInvite} mode="list" />}
        {membersError && <div className="workhub-users-load-error" role="alert">
          <strong>Could not load members and join requests.</strong>
          <p>{membersError}</p>
          <button type="button" className="workhub-ghost-mini" onClick={onRetryMembers}>Retry loading</button>
        </div>}
        {membersLoading && <p role="status">Loading members and join requests…</p>}
        {activeTab === 'requests' && <section className="workhub-users-requests" aria-label="Join requests">
          <div className="workhub-members-section-head">
            <h3>Join requests</h3>
            <span className="workhub-pending-badge">{membersLoading || membersError ? '—' : userManagementPendingMembers.length} pending</span>
          </div>
          <p className="workhub-users-access-help">Requests from all workspaces appear here. Approve a request, then edit the member to assign workspace access.</p>
          {!membersLoading && !membersError && userManagementPendingMembers.length === 0 && (
            <p className="workhub-empty-state">No join requests waiting for approval. Share the WorkHub sign-in link above. New users appear here after signing in; invited users join their assigned workspace directly.</p>
          )}
          {userManagementPendingMembers.map((item) => {
            const locked = !!normalizedMasterEmail && item.email.trim().toLowerCase() === normalizedMasterEmail
            const busy = !!busyKey || membersLoading || !!membersError
            return <article key={item.uid} className="workhub-users-request-row" aria-label={`Join request from ${item.displayName || item.email}`}>
              <div className="workhub-member-avatar settings-avatar" aria-hidden="true">{(item.displayName || item.email || '?').slice(0, 1).toUpperCase()}</div>
              <div className="workhub-member-identity">
                <strong className="workhub-member-name">{item.displayName || item.email}</strong>
                <span className="workhub-member-email">{item.email}</span>
              </div>
              <div className="workhub-users-request-actions">
                <button type="button" className="workhub-approve-btn" disabled={busy || locked}
                  onClick={() => { void handleApproveRequestGlobal(item.uid) }}>Approve</button>
                <button type="button" className="workhub-decline-btn" disabled={busy || locked}
                  onClick={() => { void handleMemberModeration(item.uid, 'suspended', item.role, 'Access request declined by administrator.') }}>Decline</button>
              </div>
            </article>
          })}
        </section>}
        {activeTab === 'members' && <div className="workhub-members-section">
          <div className="workhub-members-section-head">
            <strong aria-live="polite">{filteredMembers.length} of {existingMembers.length} members</strong>
            <span className="workhub-members-count">
              {userManagementApprovedMembers.length} active
            </span>
          </div>
          {!membersLoading && !membersError && filteredMembers.length === 0 && (
            <div className="workhub-empty-state">
              <strong>{existingMembers.length === 0 ? 'No members in this workspace scope.' : 'No members match these filters.'}</strong>
              {(search || statusFilter !== 'all' || userWorkspaceFilter !== 'all') && (
                <button type="button" className="workhub-ghost-mini" onClick={() => {
                  setSearch(''); setStatusFilter('all'); setUserWorkspaceFilter('all')
                }}>Clear filters</button>
              )}
            </div>
          )}
          <div className="workhub-member-list">
            {filteredMembers.map((item) => {
              const isPending = item.status === 'pending'
              const isEditing = editingUid === item.uid
              const isSuspended = item.status === 'suspended'
              const summary = memberWorkspaceSummaryByUid[item.uid] || { count: 0, names: [] }
              const initials = (item.displayName || item.email || '?')
                .split(' ').map((word: string) => word[0]).slice(0, 2).join('').toUpperCase()
              return (
                <article key={item.uid} className="workhub-member-row-wrap" aria-label={item.displayName || item.email || item.uid}>
                  <div className={`workhub-member-row settings-row${isPending ? ' is-pending' : ''}${isSuspended ? ' is-suspended' : ''}${isEditing ? ' is-selected' : ''}`}>
                    <div className="workhub-member-avatar settings-avatar" aria-hidden="true">{initials}</div>
                    <div className="workhub-member-identity">
                      <span className="workhub-member-name">{item.displayName || item.email || item.uid}</span>
                      <span className="workhub-member-email">{item.email || '—'}</span>
                      <span className="workhub-users-role">{item.role}{item.status === 'approved' ? ' · Active' : ''}</span>
                    </div>
                    <div className="workhub-member-workspaces">
                      <span className="workhub-ws-count-label">
                        {summary.count > 0 ? `${summary.count} workspace${summary.count === 1 ? '' : 's'}` : <span className="workhub-muted">No workspaces</span>}
                      </span>
                      <span className="workhub-users-workspace-names" title={summary.names.join(', ')}>
                        {isPending ? 'Awaiting approval' : isSuspended ? 'Access suspended' : summary.names.length ? summary.names.slice(0, 2).join(', ') + (summary.names.length > 2 ? ` +${summary.names.length - 2} more` : '') : 'Assign access to get started'}
                      </span>
                    </div>
                    <button type="button" className={`workhub-users-edit-button${isEditing ? ' is-editing' : ''}`}
                      aria-label={`Edit ${item.displayName || item.email || item.uid}`}
                      id={`workhub-edit-${item.uid}`} title="Edit member" aria-haspopup="dialog" aria-expanded={isEditing}
                      disabled={!!busyKey}
                      onClick={() => setEditingUid(item.uid)}>
                      <Pencil size={16} />
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        </div>}
      </section>
      {editingUid && allMembers.find((member) => member.uid === editingUid) && <WorkhubMemberPanel
        key={editingUid}
        member={allMembers.find((member) => member.uid === editingUid)!}
        visibleWorkspaces={visibleWorkspaces}
        workspaceDisplayNameById={workspaceDisplayNameById}
        normalizedMasterEmail={normalizedMasterEmail}
        userAccessEffectiveByUid={userAccessEffectiveByUid}
        userAccessDraftDirtyByUid={userAccessDraftDirtyByUid}
        memberNameDraftByUid={memberNameDraftByUid}
        setMemberNameDraftByUid={setMemberNameDraftByUid}
        busyKey={busyKey}
        handleSaveMemberDisplayName={handleSaveMemberDisplayName}
        handleMemberModeration={handleMemberModeration}
        handleSetUserAccessModeDraft={handleSetUserAccessModeDraft}
        handleToggleUserWorkspaceDraft={handleToggleUserWorkspaceDraft}
        handleSetUserWorkspaceLevelDraft={handleSetUserWorkspaceLevelDraft}
        handleDiscardUserAccessDraft={handleDiscardUserAccessDraft}
        handleSaveUserAccessDraft={handleSaveUserAccessDraft}
        selectedWorkspaceId={selectedWorkspaceId}
        onClose={() => { setEditingUid(null); setExpandedUserPickerUid(null) }}
      />}
    </main>
  )
}
