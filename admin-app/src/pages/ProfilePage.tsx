import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { subscribeUserDoc, saveUserPrefs, type UserProfile } from '../lib/adminRepo'
import { useSubscription } from '../lib/useSubscription'
import { useUserPrefs } from '../lib/UserPrefsContext'
import { AvatarPickerDialog } from '../components/AvatarPickerDialog'
import './ProfilePage.css'

export function ProfilePage() {
  const { language, setLanguage, theme, setTheme, slidePanelLayout, setSlidePanelLayout } = useUserPrefs()
  const { creditsRemaining, plan, loading: subLoading } = useSubscription()

  const [user, setUser] = useState<User | null>(auth.currentUser)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)

  // Editable gameplay fields
  const [gameDisplayName, setGameDisplayName] = useState('')
  const [gameAvatar, setGameAvatar] = useState('')

  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)

  // Avatar emoji picker
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)

  // Track auth user
  useEffect(() => {
    return onAuthStateChanged(auth, u => setUser(u))
  }, [])

  // Subscribe to the Firestore user doc and populate editable fields on first load
  useEffect(() => {
    if (!user) {
      setProfileLoading(false)
      return
    }
    setProfileLoading(true)
    let populated = false
    const unsub = subscribeUserDoc(user.uid, doc => {
      setProfile(doc)
      setProfileLoading(false)
      if (!populated) {
        populated = true
        setGameDisplayName(doc?.gameDisplayName ?? '')
        setGameAvatar(doc?.gameAvatar ?? '')
      }
    })
    return unsub
  }, [user?.uid])

  async function handleSave() {
    if (!user) return
    setSaving(true)
    try {
      await saveUserPrefs(user.uid, {
        gameDisplayName: gameDisplayName.trim(),
        gameAvatar: gameAvatar.trim(),
      })
      setSavedAt(Date.now())
    } finally {
      setSaving(false)
    }
  }

  function handleThemeChange(t: 'dark' | 'light') {
    setTheme(t)
    if (user) void saveUserPrefs(user.uid, { theme: t })
  }

  function handleLangChange(l: 'ar' | 'en') {
    setLanguage(l)
    if (user) void saveUserPrefs(user.uid, { language: l })
  }

  function handleLayoutChange(l: 'left' | 'bottom') {
    setSlidePanelLayout(l)
    localStorage.setItem('qyan:slidePanelLayout', l)
    if (user) void saveUserPrefs(user.uid, { slidePanelLayout: l })
  }

  const avatarEmoji = gameAvatar
  const recentlySaved = savedAt !== null && Date.now() - savedAt < 3000

  return (
    <section className="profile-page">
      <h2>👤 Profile &amp; Settings</h2>

      {/* ── Identity header ── */}
      <div className="profile-avatar-header">
        {avatarEmoji ? (
          <div className="profile-avatar-emoji-large">{avatarEmoji}</div>
        ) : user?.photoURL ? (
          <img
            src={user.photoURL}
            alt=""
            className="profile-avatar-img"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="profile-avatar-fallback">
            {(user?.displayName || user?.email || '?').slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="profile-avatar-info">
          <div className="profile-display-name">
            {user?.displayName || user?.email?.split('@')[0] || 'User'}
          </div>
          <div className="profile-email">{user?.email}</div>
        </div>
      </div>

      {/* ── Gameplay Identity ── */}
      <div className="profile-section">
        <h3>Gameplay Identity</h3>
        <p className="profile-section-desc">
          Shown to other players during live games — separate from your account name.
        </p>

        <label className="profile-field-label" htmlFor="gdn">Display Name (in-game)</label>
        <input
          id="gdn"
          className="profile-input"
          value={gameDisplayName}
          onChange={e => setGameDisplayName(e.target.value)}
          placeholder={user?.displayName || 'Your game name…'}
          maxLength={40}
        />

        <span className="profile-field-label">Avatar (in-game)</span>
        <div className="profile-avatar-pick-row">
          <div className="profile-avatar-pick-emoji">
            {avatarEmoji || '🎮'}
          </div>
          <button
            type="button"
            className="profile-btn profile-btn-secondary"
            onClick={() => setShowAvatarPicker(true)}
          >
            اختر أيقونة
          </button>
          {avatarEmoji && (
            <button
              type="button"
              className="profile-btn profile-btn-ghost profile-remove-avatar-btn"
              onClick={() => setGameAvatar('')}
            >
              ✕ Remove
            </button>
          )}
        </div>

        <button
          className="profile-btn profile-btn-primary profile-save-btn"
          onClick={handleSave}
          disabled={saving || profileLoading}
        >
          {saving ? 'Saving…' : recentlySaved ? '✓ Saved' : 'Save Changes'}
        </button>
      </div>

      {/* ── Appearance ── */}
      <div className="profile-section">
        <h3>Appearance</h3>

        <div className="profile-toggle-row">
          <span>Theme</span>
          <div className="theme-pill">
            <button
              className={`theme-pill-btn${theme === 'dark' ? ' active' : ''}`}
              onClick={() => handleThemeChange('dark')}
              title="Dark"
            >🌙 Dark</button>
            <button
              className={`theme-pill-btn${theme === 'light' ? ' active' : ''}`}
              onClick={() => handleThemeChange('light')}
              title="Light"
            >☀️ Light</button>
          </div>
        </div>

        <div className="profile-toggle-row">
          <span>Language</span>
          <div className="theme-pill">
            <button
              className={`theme-pill-btn${language === 'ar' ? ' active' : ''}`}
              onClick={() => handleLangChange('ar')}
              title="العربية"
            >ع Arabic</button>
            <button
              className={`theme-pill-btn${language === 'en' ? ' active' : ''}`}
              onClick={() => handleLangChange('en')}
              title="English"
            >EN English</button>
          </div>
        </div>

        <div className="profile-toggle-row">
          <span>Slide Panel</span>
          <div className="theme-pill">
            <button
              className={`theme-pill-btn${slidePanelLayout === 'left' ? ' active' : ''}`}
              onClick={() => handleLayoutChange('left')}
              title="Left vertical strip"
            >▐ Left</button>
            <button
              className={`theme-pill-btn${slidePanelLayout === 'bottom' ? ' active' : ''}`}
              onClick={() => handleLayoutChange('bottom')}
              title="Bottom horizontal filmstrip"
            >▄ Bottom</button>
          </div>
        </div>
      </div>

      {/* ── AI Credits ── */}
      <div className="profile-section">
        <h3>AI Credits</h3>
        {subLoading ? (
          <div className="profile-credits-loading">Loading…</div>
        ) : (
          <div className="profile-credits-row">
            <div className="profile-credits-value">{creditsRemaining ?? 0}</div>
            <div className="profile-credits-label">credits remaining</div>
            {plan && plan !== 'free' && <div className="profile-plan-badge">{plan}</div>}
          </div>
        )}
      </div>

      {/* ── Account Info ── */}
      {!profileLoading && profile && (
        <div className="profile-section profile-section--muted">
          <h3>Account Info</h3>
          <div className="profile-info-grid">
            <span>Email</span>
            <span>{profile.email}</span>

            <span>Sign-ins</span>
            <span>{profile.signInCount ?? '—'}</span>

            <span>Platform</span>
            <span>{profile.platform ?? '—'}</span>

            {profile.lastSeen?.toDate && (
              <>
                <span>Last seen</span>
                <span>{(profile.lastSeen.toDate() as Date).toLocaleString()}</span>
              </>
            )}
          </div>
        </div>
      )}

      <AvatarPickerDialog
        isOpen={showAvatarPicker}
        current={avatarEmoji}
        onClose={() => setShowAvatarPicker(false)}
        onSelect={emoji => { setGameAvatar(emoji); if (user) void saveUserPrefs(user.uid, { gameAvatar: emoji }) }}
      />
    </section>
  )
}
