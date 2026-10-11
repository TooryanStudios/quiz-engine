import { useState, type FormEvent } from 'react'
import { MailPlus, Copy, X } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { manageWorkhubInvitation, type WorkhubMember, type WorkhubWorkspace } from '../../../lib/workhubRepo'
import { buildWorkhubInvitations, WORKHUB_JOIN_URL } from '../invitationModel'

type Props = { workspaces: WorkhubWorkspace[]; members: WorkhubMember[]; canInvite: boolean; mode: 'toolbar' | 'list' }
export function WorkhubInvitations({ workspaces, members, canInvite, mode }: Props) {
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [workspaceId, setWorkspaceId] = useState('')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<{ text: string; error: boolean } | null>(null)
  const invitations = buildWorkhubInvitations(workspaces, members)
  async function manage(email: string, workspaceId: string, action: 'send' | 'revoke') {
    setBusy(true); setNotice(null)
    try {
      const result = await manageWorkhubInvitation({ email: email.trim().toLowerCase(), workspaceId, action })
      setNotice({ text: result.message, error: action === 'send' && !result.emailSent })
      if (action === 'send' && result.emailSent) { setEmail(''); setOpen(false) }
    } catch (error) {
      setNotice({ text: error instanceof Error ? error.message : 'Could not save the invitation. Please retry.', error: true })
    } finally { setBusy(false) }
  }
  function submit(event: FormEvent) { event.preventDefault(); void manage(email, workspaceId, 'send') }
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(WORKHUB_JOIN_URL)
      setNotice({ text: 'Join link copied: ' + WORKHUB_JOIN_URL, error: false })
    } catch { setNotice({ text: 'Copy this join link: ' + WORKHUB_JOIN_URL, error: true }) }
  }
  const notification = notice && <p role={notice.error ? 'alert' : 'status'} className={`workhub-invite-notice${notice.error ? ' is-error' : ''}`}>{notice.text}</p>
  return <div className={`workhub-invitations workhub-invitations-${mode}`}>
    {mode === 'toolbar' && <div className="workhub-invitations-buttons">
      <button type="button" className="workhub-ghost-mini" onClick={() => { void copyLink() }}><Copy size={15} />Copy join link</button>
      {canInvite && <button type="button" className="workhub-primary-mini" onClick={() => { setNotice(null); setOpen(true) }} disabled={busy}><MailPlus size={16} />Invite member</button>}
    </div>}
    {!open && notification}
    <Dialog.Root open={open} onOpenChange={(value) => { if (!busy) setOpen(value) }}>
      <Dialog.Portal>
        <Dialog.Overlay className="workhub-invite-overlay" />
        <Dialog.Content className="workhub-invite-dialog">
          <Dialog.Title>Invite a member</Dialog.Title>
          <Dialog.Description>Choose who can join and the workspace they can access.</Dialog.Description>
          <Dialog.Close className="workhub-invite-close" aria-label="Close invitation" disabled={busy}><X size={18}/></Dialog.Close>
          {notification}
          <form className="workhub-invitation-form" onSubmit={submit}>
            <label>Email address<input type="email" required value={email} placeholder="name@company.com" disabled={busy} onChange={(event) => setEmail(event.target.value)} /></label>
            <label>Workspace<select required value={workspaceId} disabled={busy} onChange={(event) => setWorkspaceId(event.target.value)}>
              <option value="">Choose a workspace</option>
              {workspaces.map((workspace) => <option key={workspace.id} value={workspace.id}>{workspace.name}</option>)}
            </select></label>
            <p>We will email a join link. Existing verified accounts receive workspace access immediately; new users join with the invited email.</p>
            {!workspaces.length && <p>Create a workspace before inviting someone.</p>}
            <div className="workhub-invitations-buttons"><button type="button" disabled={busy} onClick={() => setOpen(false)}>Cancel</button>
              <button type="submit" className="workhub-invite-submit" disabled={busy || !workspaceId || !email.trim()}>{busy ? 'Sending…' : 'Send invitation'}</button></div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
    {mode === 'list' && <div className="workhub-invitations-list">
      {!invitations.length && <div className="workhub-empty-state">No invitations yet. Use Invite member to invite someone to a workspace.</div>}
      {invitations.map((invitation) => <article className="workhub-invitation-row" key={`${invitation.workspaceId}:${invitation.email}`}>
        <div><strong>{invitation.email}</strong><span>{invitation.workspaceName}</span></div>
        <div className="workhub-invitation-status"><span className={`workhub-invite-badge ${invitation.status}`}>{invitation.status === 'accepted' ? 'Access granted' : invitation.status === 'revoked' ? 'Revoked' : 'Awaiting sign-in'}</span>
          {invitation.delivery === 'failed' && <small>Email not delivered</small>}
          {invitation.delivery === 'sent' && <small>Email sent</small>}
        </div>
        {canInvite && <div className="workhub-invitations-buttons">
          {invitation.status !== 'revoked' && <button type="button" className="workhub-ghost-mini" disabled={busy} onClick={() => { void manage(invitation.email, invitation.workspaceId, 'send') }}>Resend email</button>}
          {invitation.status === 'pending' && <button type="button" className="workhub-decline-btn" disabled={busy} onClick={() => { void manage(invitation.email, invitation.workspaceId, 'revoke') }}>Revoke</button>}
        </div>}
      </article>)}
    </div>}
  </div>
}
