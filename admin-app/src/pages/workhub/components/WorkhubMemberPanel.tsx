import { useRef, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { X, Check, ShieldCheck } from 'lucide-react'
import type { WorkhubMember } from '../../../lib/workhubRepo'
import type { WorkhubUsersSectionProps } from './WorkhubUsersSection'

type Props = Pick<WorkhubUsersSectionProps,
  'visibleWorkspaces' | 'workspaceDisplayNameById' | 'normalizedMasterEmail' |
  'userAccessEffectiveByUid' | 'userAccessDraftDirtyByUid' | 'memberNameDraftByUid' |
  'setMemberNameDraftByUid' | 'busyKey' | 'handleSaveMemberDisplayName' |
  'handleMemberModeration' | 'handleSetUserAccessModeDraft' | 'handleToggleUserWorkspaceDraft' |
  'handleSetUserWorkspaceLevelDraft' | 'handleDiscardUserAccessDraft' |
  'handleSaveUserAccessDraft' | 'selectedWorkspaceId'> & { member: WorkhubMember; onClose: () => void }

export function WorkhubMemberPanel(props: Props) {
  const { member, onClose } = props
  const [status, setStatus] = useState(member.status)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const [error, setError] = useState('')
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const locked = !!props.normalizedMasterEmail && member.email.trim().toLowerCase() === props.normalizedMasterEmail
  const busy = saving || !!props.busyKey
  const name = props.memberNameDraftByUid[member.uid] ?? member.displayName ?? ''
  const nameChanged = name.trim() !== (member.displayName || '').trim()
  const accessChanged = !locked && !!props.userAccessDraftDirtyByUid[member.uid]
  const statusChanged = !locked && status !== member.status
  const dirty = nameChanged || accessChanged || statusChanged
  const access = props.userAccessEffectiveByUid[member.uid] || { mode: 'workspace_based', workspaceById: {} }
  const initials = (member.displayName || member.email || '?').split(' ').map(word => word[0]).slice(0, 2).join('').toUpperCase()

  function discard() {
    if (busy) return
    props.handleDiscardUserAccessDraft(member.uid)
    props.setMemberNameDraftByUid(current => {
      const next = { ...current }; delete next[member.uid]; return next
    })
    onClose()
  }
  function requestClose() {
    if (busy) return
    if (dirty) setConfirmDiscard(true)
    else onClose()
  }
  async function save() {
    if (savingRef.current || busy || !dirty) return
    if (nameChanged && !name.trim()) { setError('Enter a display name before saving.'); return }
    if (statusChanged && status === 'suspended' && !reason.trim()) { setError('Add a reason for suspending this member.'); return }
    savingRef.current = true; setSaving(true); setError(''); setConfirmDiscard(false)
    try {
      if (nameChanged && !await props.handleSaveMemberDisplayName(member.uid)) throw new Error('The display name could not be saved.')
      if (accessChanged && !await props.handleSaveUserAccessDraft(member.uid)) throw new Error('Workspace access could not be fully saved.')
      if (statusChanged && !await props.handleMemberModeration(member.uid, status as 'approved' | 'suspended', member.role, reason)) throw new Error('The member status could not be saved.')
      onClose()
    } catch (failure) {
      setError(`${failure instanceof Error ? failure.message : 'Could not save changes.'} Review your changes and retry. Any changes already saved remain applied.`)
    } finally { savingRef.current = false; setSaving(false) }
  }

  return <Dialog.Root open onOpenChange={open => { if (!open) requestClose() }}>
    <Dialog.Portal>
      <Dialog.Overlay className="workhub-member-panel-overlay" />
      <Dialog.Content className="workhub-member-panel" onPointerDownOutside={event => { event.preventDefault(); requestClose() }}
        onEscapeKeyDown={event => { event.preventDefault(); requestClose() }}
        onCloseAutoFocus={event => {
          event.preventDefault()
          document.getElementById(`workhub-edit-${member.uid}`)?.focus()
        }}>
        <header className="workhub-member-panel-header">
          <div><span className="workhub-member-panel-eyebrow">MEMBER SETTINGS</span><Dialog.Title>Edit member</Dialog.Title></div>
          <button type="button" className="workhub-member-panel-close" aria-label="Close member editor" disabled={busy} onClick={requestClose}><X size={20} /></button>
        </header>
        <div className="workhub-member-panel-person">
          <div className="workhub-member-panel-avatar" aria-hidden="true">{initials}</div>
          <div><strong>{member.displayName || member.email}</strong><span>{member.email}</span><small><Check size={12} /> Selected member · {member.role}</small></div>
        </div>
        <Dialog.Description className="workhub-member-panel-description">Configure this member’s profile and workspace access. Changes apply when you save.</Dialog.Description>
        <div className="workhub-member-panel-body">
          {locked && <p className="workhub-member-panel-notice"><ShieldCheck size={16} /> You can edit the master admin’s display name. Status and workspace access are protected.</p>}
          <fieldset disabled={busy}>
            <legend>Profile</legend>
            <label className="workhub-member-panel-field">Display name<input maxLength={120} value={name} onChange={event => props.setMemberNameDraftByUid(current => ({ ...current, [member.uid]: event.target.value }))} /></label>
            <label className="workhub-member-panel-field">Member status<select disabled={locked} value={status} onChange={event => setStatus(event.target.value as 'approved' | 'suspended')}><option value="approved">Active</option><option value="suspended">Suspended</option></select></label>
            {statusChanged && status === 'suspended' && <label className="workhub-member-panel-field">Suspension reason<textarea value={reason} onChange={event => setReason(event.target.value)} rows={2} /></label>}
          </fieldset>
          <fieldset disabled={busy || locked}>
            <legend>Workspace access</legend>
            <div className="workhub-member-panel-modes" role="group" aria-label="Access mode">
              <button type="button" aria-pressed={access.mode === 'workspace_based'} onClick={() => props.handleSetUserAccessModeDraft(member.uid, 'workspace_based')}>Selected workspaces</button>
              <button type="button" aria-pressed={access.mode === 'full'} onClick={() => props.handleSetUserAccessModeDraft(member.uid, 'full')}>Full access</button>
            </div>
            {status === 'suspended' && <p className="workhub-member-panel-hint">Workspace settings are retained, but access is blocked while this member is suspended.</p>}
            {access.mode === 'full' ? <p className="workhub-member-panel-notice"><ShieldCheck size={18} /> Full access to all currently available workspaces.</p> : <>
              <p className="workhub-member-panel-hint">Choose the workspaces this member can enter and their access level.</p>
              {!props.visibleWorkspaces.length && <p className="workhub-member-panel-hint">No workspaces are available to assign.</p>}
              <div className="workhub-member-panel-workspaces">{props.visibleWorkspaces.map(workspace => {
                const entry = access.workspaceById[workspace.id] || { enabled: false, level: 'custom' }
                const title = props.workspaceDisplayNameById[workspace.id] || workspace.name
                return <div key={workspace.id} className={`workhub-member-panel-workspace${entry.enabled ? ' is-enabled' : ''}`}>
                  <label><input type="checkbox" checked={entry.enabled} onChange={event => props.handleToggleUserWorkspaceDraft(member.uid, workspace.id, event.target.checked)} /><span>{title}{workspace.id === props.selectedWorkspaceId && <small>Current workspace</small>}</span></label>
                  {entry.enabled && <select aria-label={`Access level for ${title}`} value={entry.level} onChange={event => props.handleSetUserWorkspaceLevelDraft(member.uid, workspace.id, event.target.value as 'full' | 'custom')}><option value="custom">Custom</option><option value="full">Full</option></select>}
                </div>
              })}</div>
            </>}
          </fieldset>
        </div>
        <footer className="workhub-member-panel-footer">
          {error && <p role="alert" className="workhub-member-panel-error">{error}</p>}
          {confirmDiscard && <div role="alert" className="workhub-member-panel-confirm"><strong>Discard unsaved changes?</strong><p>Your edits have not been saved.</p><button type="button" onClick={() => setConfirmDiscard(false)}>Keep editing</button><button type="button" onClick={discard}>Discard changes</button></div>}
          <div className="workhub-member-panel-footer-actions"><span role="status">{saving ? 'Saving changes…' : dirty ? 'Unsaved changes' : 'No unsaved changes'}</span><button type="button" disabled={busy} onClick={discard}>Discard</button><button type="button" className="workhub-member-panel-save" disabled={busy || !dirty} onClick={() => { void save() }}>{saving ? 'Saving…' : 'Save changes'}</button></div>
        </footer>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
}
