type LabNewLayoutToolbarProps = {
  authDisplayName: string
  authEmail: string
  authPhotoUrl: string
}

export function LabNewLayoutToolbar(props: LabNewLayoutToolbarProps) {
  const {
    authDisplayName,
    authEmail,
    authPhotoUrl,
  } = props

  return (
    <div className="lab-newlayout-toolbar">
      <div className="lab-newlayout-toolbar-spacer" />
      <div className="lab-newlayout-user-chip" aria-label="Signed in user profile">
        {authPhotoUrl ? (
          <img src={authPhotoUrl} alt={authDisplayName || 'Signed in user'} className="lab-newlayout-user-avatar" />
        ) : (
          <div className="lab-newlayout-user-avatar lab-newlayout-user-avatar--fallback" aria-hidden="true">
            {(authDisplayName || authEmail || 'U').trim().charAt(0).toUpperCase()}
          </div>
        )}
        <div className="lab-newlayout-user-copy">
          <span className="lab-newlayout-user-name">{authDisplayName || 'Signed-out user'}</span>
          <span className="lab-newlayout-user-email">{authEmail || 'No active session'}</span>
        </div>
      </div>
    </div>
  )
}