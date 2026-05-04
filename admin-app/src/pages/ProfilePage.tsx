import { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { auth } from '../lib/firebase'
import { subscribeUserDoc, saveUserPrefs, type UserProfile } from '../lib/adminRepo'
import { useSubscription } from '../lib/useSubscription'
import { useUserPrefs } from '../lib/UserPrefsContext'
import { AvatarPickerDialog } from '../components/AvatarPickerDialog'
import { createInvite, createOrg, subscribeToUserOrgs } from '../lib/studioService'
import { findUserByEmail } from '../lib/adminRepo'
import type { OrgSummary } from '../types/studio'
import './ProfilePage.css'

export function ProfilePage() {
  const {
    language,
    setLanguage,
    theme,
    setTheme,
    slidePanelLayout,
    setSlidePanelLayout,
    slidePanelEnabled,
    setSlidePanelEnabled,
  } = useUserPrefs()
  const { creditsRemaining, plan, loading: subLoading } = useSubscription()
  const isAr = language === 'ar'

  const t = {
    title: isAr ? '👤 الملف الشخصي والإعدادات' : '👤 Profile & Settings',
    gameplayIdentity: isAr ? 'هوية اللعب' : 'Gameplay Identity',
    gameplayDesc: isAr ? 'يتم عرضها للاعبين الآخرين أثناء المباريات المباشرة — منفصلة عن اسم حسابك.' : 'Shown to other players during live games — separate from your account name.',
    displayNameLabel: isAr ? 'اسم العرض (في اللعبة)' : 'Display Name (in-game)',
    displayNamePlaceholder: (name: string) => isAr ? `${name} أو اسمك المستعار...` : `${name} or your game name...`,
    avatarLabel: isAr ? 'الصورة الرمزية (في اللعبة)' : 'Avatar (in-game)',
    chooseIconBtn: isAr ? 'اختر أيقونة' : 'Choose Icon',
    removeBtn: isAr ? '✕ إزالة' : '✕ Remove',
    savingStr: isAr ? 'جارٍ الحفظ...' : 'Saving...',
    savedStr: isAr ? '✓ تم الحفظ' : '✓ Saved',
    saveChangesBtn: isAr ? 'حفظ التغييرات' : 'Save Changes',
    appearance: isAr ? 'المظهر' : 'Appearance',
    themeLabel: isAr ? 'السمة' : 'Theme',
    dark: isAr ? '🌙 داكن' : '🌙 Dark',
    light: isAr ? '☀️ فاتح' : '☀️ Light',
    languageLabel: isAr ? 'اللغة' : 'Language',
    slidePanelLabel: isAr ? 'لوحة الشرائح' : 'Slide Panel',
    slidePanelLeft: isAr ? '▐ يسار' : '▐ Left',
    slidePanelBottom: isAr ? '▄ أسفل' : '▄ Bottom',
    slidePanelVisibilityLabel: isAr ? 'طريقة عرض الأسئلة' : 'Question View Mode',
    slidePanelShow: isAr ? 'إظهار الشريط' : 'Show strip',
    slidePanelHide: isAr ? 'إخفاء الشريط' : 'Hide strip',
    slidePanelVisibilityDesc: isAr ? 'عند إخفاء الشريط ستظهر جميع البطاقات في عرض واحد يمكن سحبه بالكامل.' : 'When hidden, all question cards are stacked in one scrollable view.',
    aiCreditsTitle: isAr ? 'رصيد الذكاء الاصطناعي' : 'AI Credits',
    loadingStr: isAr ? 'جاري التحميل...' : 'Loading...',
    creditsRemaining: isAr ? 'رصيد متبقي' : 'credits remaining',
    accountInfo: isAr ? 'معلومات الحساب' : 'Account Info',
    studioSettings: isAr ? 'إعدادات المنظمة (Studio)' : 'Studio Organization Settings',
    studioSettingsDesc: isAr ? 'أنشئ منظمتك هنا من الملف الشخصي، وادعُ الأعضاء عبر البريد الإلكتروني.' : 'Create your organization from profile settings and invite members by email.',
    orgNameLabel: isAr ? 'اسم المنظمة' : 'Organization name',
    createOrgBtn: isAr ? 'إنشاء المنظمة' : 'Create organization',
    orgSelectLabel: isAr ? 'المنظمة' : 'Organization',
    inviteEmailLabel: isAr ? 'بريد العضو' : 'Member email',
    inviteEmailBtn: isAr ? 'إرسال دعوة' : 'Send invite',
    inviteHint: isAr ? 'سيتم إرسال الدعوة بالبريد الإلكتروني من الخادم مباشرة.' : 'Invite email is sent server-side through the configured SMTP provider.',
    emailLabel: isAr ? 'البريد الإلكتروني' : 'Email',
    signInsLabel: isAr ? 'تسجيلات الدخول' : 'Sign-ins',
    platformLabel: isAr ? 'المنصة' : 'Platform',
    lastSeenLabel: isAr ? 'آخر ظهور' : 'Last seen',
  }

  const [user, setUser] = useState<User | null>(auth.currentUser)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)
  const [orgs, setOrgs] = useState<OrgSummary[]>([])
  const [orgsLoading, setOrgsLoading] = useState(true)
  const [selectedOrgId, setSelectedOrgId] = useState('')
  const [newOrgName, setNewOrgName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [orgBusy, setOrgBusy] = useState(false)
  const [inviteBusy, setInviteBusy] = useState(false)
  const [studioMessage, setStudioMessage] = useState('')

  // Editable gameplay fields
  const [gameDisplayName, setGameDisplayName] = useState('')
  const [gameAvatar, setGameAvatar] = useState('')

  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<number | null>(null)
  const [isSwitchingLanguage, setIsSwitchingLanguage] = useState(false)

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

  useEffect(() => {
    if (!user?.uid) {
      setOrgs([])
      setOrgsLoading(false)
      setSelectedOrgId('')
      return
    }
    setOrgsLoading(true)
    const unsub = subscribeToUserOrgs(user.uid, (next) => {
      setOrgs(next)
      setOrgsLoading(false)
      setSelectedOrgId((current) => (current && next.some((o) => o.id === current) ? current : (next[0]?.id || '')))
    }, () => {
      setOrgsLoading(false)
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

  async function handleCreateOrganization() {
    if (!user) return
    const trimmed = newOrgName.trim()
    if (!trimmed) {
      setStudioMessage(isAr ? 'اسم المنظمة مطلوب.' : 'Organization name is required.')
      return
    }
    setOrgBusy(true)
    setStudioMessage('')
    try {
      const org = await createOrg({ name: trimmed }, {
        uid: user.uid,
        displayName: user.displayName || '',
        email: user.email || '',
        photoUrl: user.photoURL || '',
      })
      setNewOrgName('')
      setSelectedOrgId(org.id)
      setStudioMessage(isAr ? 'تم إنشاء المنظمة بنجاح.' : 'Organization created successfully.')
    } catch {
      setStudioMessage(isAr ? 'تعذر إنشاء المنظمة الآن.' : 'Could not create organization right now.')
    } finally {
      setOrgBusy(false)
    }
  }

  async function handleSendStudioInvite() {
    if (!user || !selectedOrgId) return
    const email = inviteEmail.trim().toLowerCase()
    if (!email || !email.includes('@')) {
      setStudioMessage(isAr ? 'يرجى إدخال بريد إلكتروني صحيح.' : 'Please enter a valid email address.')
      return
    }

    setInviteBusy(true)
    setStudioMessage('')
    try {
      const recipient = await findUserByEmail(email)
      await createInvite({
        targetKind: 'org',
        targetId: selectedOrgId,
        orgId: selectedOrgId,
        role: 'member',
        inviteeEmail: email,
        inviteeUid: recipient?.uid,
        invitedBy: user.uid,
      })
      setInviteEmail('')
      setStudioMessage(recipient
        ? (isAr ? 'تم إنشاء الدعوة وسيظهر إشعارها داخل التطبيق.' : 'Invite created and will appear in-app.')
        : (isAr ? 'تم إنشاء الدعوة لكن لم يتم العثور على حساب مطابق داخل التطبيق.' : 'Invite created, but no matching app user was found.'))
    } catch {
      setStudioMessage(isAr ? 'تعذر إرسال الدعوة الآن.' : 'Could not send invite right now.')
    } finally {
      setInviteBusy(false)
    }
  }

  function handleThemeChange(t: 'dark' | 'light') {
    setTheme(t)
    if (user) void saveUserPrefs(user.uid, { theme: t })
  }

  function handleLangChange(l: 'ar' | 'en') {
    if (l === language) return
    setIsSwitchingLanguage(true)
    
    // Slight delay to allow overlay to render before setting language (which triggers layout shifts)
    setTimeout(() => {
      setLanguage(l)
      if (user) void saveUserPrefs(user.uid, { language: l })
      
      // Delay removing the overlay to allow DOM to settle
      setTimeout(() => {
        setIsSwitchingLanguage(false)
      }, 400)
    }, 50)
  }

  function handleLayoutChange(l: 'left' | 'bottom') {
    if (!slidePanelEnabled) return
    setSlidePanelLayout(l)
    localStorage.setItem('qyan:slidePanelLayout', l)
    if (user) void saveUserPrefs(user.uid, { slidePanelLayout: l })
  }

  function handleSlidePanelEnabledChange(enabled: boolean) {
    if (enabled === slidePanelEnabled) return
    setSlidePanelEnabled(enabled)
    localStorage.setItem('qyan:slidePanelEnabled', enabled ? 'true' : 'false')
    if (user) void saveUserPrefs(user.uid, { slidePanelEnabled: enabled })
  }

  const avatarEmoji = gameAvatar
  const recentlySaved = savedAt !== null && Date.now() - savedAt < 3000

  return (
    <section className="profile-page">
      <h2>{t.title}</h2>

      {/* ── Identity header ── */}
      <div className="profile-avatar-header">
        {user?.photoURL ? (
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
        <h3>{t.gameplayIdentity}</h3>
        <p className="profile-section-desc">
          {t.gameplayDesc}
        </p>

        <label className="profile-field-label" htmlFor="gdn">{t.displayNameLabel}</label>
        <input
          id="gdn"
          className="profile-input"
          value={gameDisplayName}
          onChange={e => setGameDisplayName(e.target.value)}
          placeholder={t.displayNamePlaceholder(user?.displayName || '')}
          maxLength={40}
        />

        <span className="profile-field-label">{t.avatarLabel}</span>
        <div className="profile-avatar-pick-row">
          <div className="profile-avatar-pick-emoji">
            {avatarEmoji || '🎮'}
          </div>
          <button
            type="button"
            className="profile-btn profile-btn-secondary"
            onClick={() => setShowAvatarPicker(true)}
          >
            {t.chooseIconBtn}
          </button>
          {avatarEmoji && (
            <button
              type="button"
              className="profile-btn profile-btn-ghost profile-remove-avatar-btn"
              onClick={() => setGameAvatar('')}
            >
              {t.removeBtn}
            </button>
          )}
        </div>

        <button
          className="profile-btn profile-btn-primary profile-save-btn"
          onClick={handleSave}
          disabled={saving || profileLoading}
        >
          {saving ? t.savingStr : recentlySaved ? t.savedStr : t.saveChangesBtn}
        </button>
      </div>

      {/* ── Appearance ── */}
      <div className="profile-section">
        <h3>{t.appearance}</h3>

        <div className="profile-toggle-row">
          <span>{t.themeLabel}</span>
          <div className="theme-pill">
            <button
              className={`theme-pill-btn${theme === 'dark' ? ' active' : ''}`}
              onClick={() => handleThemeChange('dark')}
              title="Dark"
            >{t.dark}</button>
            <button
              className={`theme-pill-btn${theme === 'light' ? ' active' : ''}`}
              onClick={() => handleThemeChange('light')}
              title="Light"
            >{t.light}</button>
          </div>
        </div>

        <div className="profile-toggle-row">
          <span>{t.languageLabel}</span>
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
          <span>{t.slidePanelLabel}</span>
          <div className="theme-pill">
            <button
              className={`theme-pill-btn${slidePanelLayout === 'left' ? ' active' : ''}`}
              onClick={() => handleLayoutChange('left')}
              title="Left vertical strip"
              disabled={!slidePanelEnabled}
              style={!slidePanelEnabled ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
            >{t.slidePanelLeft}</button>
            <button
              className={`theme-pill-btn${slidePanelLayout === 'bottom' ? ' active' : ''}`}
              onClick={() => handleLayoutChange('bottom')}
              title="Bottom horizontal filmstrip"
              disabled={!slidePanelEnabled}
              style={!slidePanelEnabled ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
            >{t.slidePanelBottom}</button>
          </div>
        </div>

        <div className="profile-toggle-row">
          <span>{t.slidePanelVisibilityLabel}</span>
          <div className="theme-pill">
            <button
              className={`theme-pill-btn${slidePanelEnabled ? ' active' : ''}`}
              onClick={() => handleSlidePanelEnabledChange(true)}
              title={t.slidePanelShow}
            >{t.slidePanelShow}</button>
            <button
              className={`theme-pill-btn${!slidePanelEnabled ? ' active' : ''}`}
              onClick={() => handleSlidePanelEnabledChange(false)}
              title={t.slidePanelHide}
            >{t.slidePanelHide}</button>
          </div>
        </div>
        <p className="profile-section-desc" style={{ marginTop: '-0.25rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          {t.slidePanelVisibilityDesc}
        </p>
      </div>

      {/* ── AI Credits ── */}
      <div className="profile-section">
        <h3>{t.studioSettings}</h3>
        <p className="profile-section-desc">{t.studioSettingsDesc}</p>

        <label className="profile-field-label" htmlFor="profile-new-org">{t.orgNameLabel}</label>
        <div className="profile-inline-row">
          <input
            id="profile-new-org"
            className="profile-input"
            value={newOrgName}
            onChange={(event) => setNewOrgName(event.target.value)}
            placeholder={isAr ? 'مثال: شركة ألفا' : 'e.g. Acme Studio'}
            maxLength={80}
          />
          <button className="profile-btn profile-btn-secondary" onClick={handleCreateOrganization} disabled={orgBusy}>
            {orgBusy ? t.savingStr : t.createOrgBtn}
          </button>
        </div>

        <label className="profile-field-label" htmlFor="profile-org-select">{t.orgSelectLabel}</label>
        <select
          id="profile-org-select"
          className="profile-input"
          value={selectedOrgId}
          onChange={(event) => setSelectedOrgId(event.target.value)}
          disabled={orgsLoading || orgs.length === 0}
        >
          {orgs.length === 0 ? (
            <option value="">{orgsLoading ? (isAr ? 'جاري التحميل...' : 'Loading...') : (isAr ? 'لا توجد منظمات' : 'No organizations')}</option>
          ) : orgs.map((org) => (
            <option key={org.id} value={org.id}>{org.name}</option>
          ))}
        </select>

        <label className="profile-field-label" htmlFor="profile-org-invite-email">{t.inviteEmailLabel}</label>
        <div className="profile-inline-row">
          <input
            id="profile-org-invite-email"
            className="profile-input"
            type="email"
            value={inviteEmail}
            onChange={(event) => setInviteEmail(event.target.value)}
            placeholder="name@company.com"
          />
          <button
            className="profile-btn profile-btn-secondary"
            onClick={handleSendStudioInvite}
            disabled={inviteBusy || !selectedOrgId}
          >
            {inviteBusy ? t.savingStr : t.inviteEmailBtn}
          </button>
        </div>
        <p className="profile-section-desc">{t.inviteHint}</p>
        {studioMessage && <p className="profile-section-desc">{studioMessage}</p>}
      </div>

      {/* ── AI Credits ── */}
      <div className="profile-section">
        <h3>{t.aiCreditsTitle}</h3>
        {subLoading ? (
          <div className="profile-credits-loading">{t.loadingStr}</div>
        ) : (
          <div className="profile-credits-row">
            <div className="profile-credits-value">{creditsRemaining ?? 0}</div>
            <div className="profile-credits-label">{t.creditsRemaining}</div>
            {plan && plan !== 'free' && <div className="profile-plan-badge">{plan}</div>}
          </div>
        )}
      </div>

      {/* ── Account Info ── */}
      {!profileLoading && profile && (
        <div className="profile-section profile-section--muted">
          <h3>{t.accountInfo}</h3>
          <div className="profile-info-grid">
            <span>{t.emailLabel}</span>
            <span>{profile.email}</span>

            <span>{t.signInsLabel}</span>
            <span>{profile.signInCount ?? '—'}</span>

            <span>{t.platformLabel}</span>
            <span>{profile.platform ?? '—'}</span>

            {profile.lastSeen?.toDate && (
              <>
                <span>{t.lastSeenLabel}</span>
                <span>{(profile.lastSeen.toDate() as Date).toLocaleString('en-GB')}</span>
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
      
      {isSwitchingLanguage && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          zIndex: 99999,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          opacity: 1, transition: 'opacity 0.2s ease',
        }}>
          <div className="app-loading-spinner" style={{ 
            width: '50px', height: '50px', 
            border: '4px solid rgba(255, 255, 255, 0.3)', 
            borderTop: '4px solid #ffffff', 
            borderRadius: '50%', 
            animation: 'spin 1s linear infinite' 
          }} />
        </div>
      )}
    </section>
  )
}
