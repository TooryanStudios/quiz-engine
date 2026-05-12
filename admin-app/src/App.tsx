import { onAuthStateChanged, signOut } from 'firebase/auth'
import type { User } from 'firebase/auth'
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react'
import { markSignOut } from './lib/signOutState'
import type { ComponentType, ReactElement, ReactNode } from 'react'
import { NavLink, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import './App.css'
import { auth } from './lib/firebase'
import { reportError } from './lib/errorReporting'
import { ErrorBoundary } from './components/ErrorBoundary'
import { FeatureErrorBoundary } from './components/FeatureErrorBoundary'
import { incrementPlatformStat, loadUserPrefs, recordUserActivity, subscribeUserDoc, grantAdminClaim } from './lib/adminRepo'
import { UserPrefsContext } from './lib/UserPrefsContext'
import { DialogProvider, useDialog } from './lib/DialogContext'
import { ToastProvider } from './lib/ToastContext'
import { Dialog } from './components/Dialog'
import { MSEVideoSequencer } from './components/MSEVideoSequencer'
import { VFXContainer } from './components/VFXContainer'
import { LoginPage } from './pages/LoginPage'
import { communicationFeatureFlags } from './features/communication/config'
import { InAppNotificationCenter } from './features/communication/components/InAppNotificationCenter'
import { ChatDock } from './features/communication/components/ChatDock'
import { useChatDockState } from './features/communication/hooks/useChatDockState'
import { buildThreadId, THREAD_EVERYONE } from './features/communication/hooks/useGlobalTeamChat'
import { CHAT_DOCK_OPEN_EVENT, type ChatDockOpenDetail } from './features/communication/utils/chatDockEvents'
import { acceptInvite, deleteStudioNotification, subscribeStudioNotifications, updateInviteStatus } from './lib/studioService'
import type { StudioNotification } from './types/studio'

function RouteLoadFailure({ routeLabel }: { routeLabel: string }) {
  return (
    <div className="app-route-load-failure">
      Could not load {routeLabel}. Please refresh the page.
    </div>
  )
}

function withRouteBoundary(routeName: string, node: ReactNode) {
  return (
    <FeatureErrorBoundary name={routeName} variant="route">
      {node}
    </FeatureErrorBoundary>
  )
}

function StudioInvitePrompt({ user, isAr }: { user: User | null, isAr: boolean }) {
  const { show, isOpen } = useDialog()
  const [pendingNotifications, setPendingNotifications] = useState<StudioNotification[]>([])
  const activeNotificationIdRef = useRef<string | null>(null)

  useEffect(() => {
    activeNotificationIdRef.current = null
    setPendingNotifications([])

    if (!user?.uid) return

    return subscribeStudioNotifications(user.uid, (notifications) => {
      setPendingNotifications(notifications.filter((n) => !n.read))
    })
  }, [user?.uid])

  useEffect(() => {
    if (!user || isOpen || activeNotificationIdRef.current || pendingNotifications.length === 0) {
      return
    }

    const notification = pendingNotifications[0]
    activeNotificationIdRef.current = notification.id
    const isInviteNotification = notification.type === 'studio_invite'
    const projectCount = notification.targetProjectIds?.length ?? 0
    const folderCount = notification.targetFolderRefs?.length ?? 0
    const accessSummary = [
      projectCount > 0 ? (isAr ? `${projectCount} مشروع` : `${projectCount} project${projectCount === 1 ? '' : 's'}`) : '',
      folderCount > 0 ? (isAr ? `${folderCount} مجلد` : `${folderCount} folder${folderCount === 1 ? '' : 's'}`) : '',
    ].filter(Boolean).join(isAr ? ' و ' : ' and ')

    show({
      title: isInviteNotification
        ? (isAr ? 'دعوة Studio' : 'Studio invitation')
        : (notification.title || (isAr ? 'إشعار Studio' : 'Studio notification')),
      message: (
        <div className="studio-invite-message">
          {isInviteNotification ? (
            <>
              <p>{isAr ? 'لديك دعوة جديدة داخل التطبيق.' : 'You have a new in-app Studio invitation.'}</p>
              <p>{isAr ? `البريد المستهدف: ${notification.inviteeEmail}` : `Invite email: ${notification.inviteeEmail}`}</p>
              <p>{isAr ? `نطاق الوصول: ${accessSummary || 'المنظمة فقط'}` : `Access scope: ${accessSummary || 'org only'}`}</p>
              <p>{isAr ? 'هل تريد قبولها الآن؟' : 'Do you want to accept it now?'}</p>
            </>
          ) : (
            <p>{notification.message || (isAr ? 'لديك إشعار جديد.' : 'You have a new notification.')}</p>
          )}
        </div>
      ),
      confirmText: isInviteNotification ? (isAr ? 'قبول' : 'Accept') : (isAr ? 'حسنًا' : 'OK'),
      cancelText: isInviteNotification ? (isAr ? 'رفض' : 'Reject') : (isAr ? 'إغلاق' : 'Dismiss'),
      onConfirm: async () => {
        if (isInviteNotification) {
          if (!user.email || !notification.inviteId) return
          const { getInviteById } = await import('./lib/studioService')
          const invite = await getInviteById(notification.inviteId)
          if (invite) {
            await acceptInvite(invite, {
              uid: user.uid,
              displayName: user.displayName || '',
              email: user.email || '',
              photoUrl: user.photoURL || '',
            })
          }
        }
        await deleteStudioNotification(notification.id).catch(() => undefined)
        activeNotificationIdRef.current = null
        setPendingNotifications((current) => current.filter((item) => item.id !== notification.id))
      },
      onCancel: async () => {
        if (isInviteNotification && notification.inviteId) {
          await updateInviteStatus(notification.inviteId, 'declined').catch(() => undefined)
        }
        await deleteStudioNotification(notification.id).catch(() => undefined)
        activeNotificationIdRef.current = null
        setPendingNotifications((current) => current.filter((item) => item.id !== notification.id))
      },
    })
  }, [isAr, isOpen, pendingNotifications, show, user])

  return null
}

// Dev pressure-test helper:
// add ?qyanEnableCrash=1&qyanCrash=<boundaryName> (or comma-separated names, or "all")
// Example: ?qyanEnableCrash=1&qyanCrash=workhub,ChatDock

function createLazyRoute(
  routeLabel: string,
  loader: () => Promise<Record<string, unknown>>,
  exportName?: string,
): React.LazyExoticComponent<ComponentType<any>> {
  return lazy(async () => {
    try {
      const mod = await loader()
      const defaultExport = mod?.default
      const explicitNamedExport = exportName ? mod?.[exportName] : undefined
      const implicitNamedExport = mod?.[routeLabel]
      const resolved = explicitNamedExport || defaultExport || implicitNamedExport
      if (!resolved) {
        const availableKeys = Object.keys(mod || {}).join(', ')
        throw new Error(`Missing export for route: ${routeLabel}. Available exports: ${availableKeys || '(none)'}`)
      }
      return { default: resolved as ComponentType }
    } catch (error) {
      console.error(`Route lazy load failed: ${routeLabel}`, error)
      return { default: () => <RouteLoadFailure routeLabel={routeLabel} /> }
    }
  })
}

const BillingPage     = createLazyRoute('BillingPage', () => import('./pages/BillingPage'), 'BillingPage')
const DashboardPage   = createLazyRoute('DashboardPage', () => import('./pages/DashboardPage'), 'DashboardPage')
const PacksPage       = createLazyRoute('PacksPage', () => import('./pages/PacksPage'), 'PacksPage')
const MyQuizzesPage   = createLazyRoute('MyQuizzesPage', () => import('./pages/MyQuizzesPage'), 'MyQuizzesPage')
const WorkHubRoutePage = createLazyRoute('WorkHubPage', () => import('./pages/WorkHubPage'))
const MessagesPage    = createLazyRoute('MessagesPage', () => import('./features/communication/pages/MessagesPage'), 'MessagesPage')
const AdHocTasksPage  = createLazyRoute('AdHocTasksPage', () => import('./features/workhubAdhoc/pages/AdHocTasksPage'), 'AdHocTasksPage')
const ProfilePage     = createLazyRoute('ProfilePage', () => import('./pages/ProfilePage'), 'ProfilePage')
const QuizEditorPage  = createLazyRoute('QuizEditorPage', () => import('./pages/QuizEditorPage'), 'QuizEditorPage')
const QuizPreviewPage = createLazyRoute('QuizPreviewPage', () => import('./pages/QuizPreviewPage'), 'QuizPreviewPage')
const GameModesPage   = createLazyRoute('GameModesPage', () => import('./pages/GameModesPage'), 'GameModesPage')
const MasterAdminPage = createLazyRoute('MasterAdminPage', () => import('./pages/MasterAdminPage'), 'MasterAdminPage')
const VoiceLabPage    = createLazyRoute('VoiceLabPage', () => import('./pages/VoiceLabPage'), 'VoiceLabPage')
const AILabPage       = createLazyRoute('AILabPage', () => import('./pages/AILabPage'))
const CoverGenLabPage = createLazyRoute('CoverGenLabPage', () => import('./pages/CoverGenLabPage'))
const WorkflowBuilderTestPage = createLazyRoute('WorkflowBuilderTestPage', () => import('./pages/WorkflowBuilderTestPage'))
const ToorGenPage = createLazyRoute('ToorGenPage', () => import('./pages/ToorGenPage'))
const ToorGenExtendPage = createLazyRoute('ToorGenExtendPage', () => import('./pages/ToorGenExtendPage'))
const LabPage = createLazyRoute('LabPage', () => import('./pages/LabPage'), 'LabPage')
const PlayTestPage    = createLazyRoute('PlayTestPage', () => import('./pages/PlayTestPage'))
const GameEmbedPage   = createLazyRoute('GameEmbedPage', () => import('./pages/GameEmbedPage'))
const ScannerPage     = createLazyRoute('ScannerPage', () => import('./scanner/ScannerPage'), 'ScannerPage')
const ScannerDesktopPage = createLazyRoute('ScannerDesktopPage', () => import('./scanner/ScannerDesktopPage'), 'ScannerDesktopPage')
const StudioPage = createLazyRoute('StudioPage', () => import('./pages/StudioPage/StudioPage'), 'StudioPage')
const VidPlayerPage = createLazyRoute('VidPlayerPage', () => import('./pages/VidPlayerPage'), 'VidPlayerPage')

const MASTER_EMAIL = import.meta.env.VITE_MASTER_EMAIL as string | undefined
const MASTER_PATH  = import.meta.env.VITE_MASTER_PATH  as string | undefined

if (!MASTER_EMAIL || !MASTER_PATH) {
  console.error('[config] VITE_MASTER_EMAIL or VITE_MASTER_PATH is not set. Admin features will be disabled.')
}

type NavItem = {
  to: string
  icon: string
  label: string
  end?: boolean
}

function getNav(isAr: boolean, isMasterUser: boolean) {
  const nav: NavItem[] = [
    { to: '/dashboard',        icon: '🏠', label: isAr ? 'الرئيسية' : 'Dashboard', end: true },
    { to: '/editor',           icon: '✏️',  label: isAr ? 'محرر الأسئلة' : 'Challenge Editor' },
    { to: '/mini-game-editor', icon: '🎮', label: isAr ? 'محرر الألعاب' : 'Game Editor' },
    { to: '/my-quizzes',       icon: '📚', label: isAr ? 'اختباراتي' : 'My Challenges' },
    { to: '/packs',            icon: '📦', label: isAr ? 'المكتبة' : 'Library' },
    { to: '/workhub',         icon: '🗂️', label: isAr ? 'وورك هَب' : 'WorkHub' },
    { to: '/studio',           icon: '🏢', label: isAr ? 'الاستوديو' : 'Studio' },
    { to: '/lab',              icon: '🧪', label: isAr ? 'المختبر' : 'Lab' },
    { to: '/toorgen',          icon: '🎬', label: isAr ? 'تورجن' : 'ToorGen' },
    { to: '/vidEdit',          icon: '🎞️', label: isAr ? 'محرر الفيديو' : 'Video Editor' },
    { to: '/canvas',           icon: '🧠', label: isAr ? 'كانفس' : 'Canvas' },
    { to: '/workflow-builder-test', icon: '🧩', label: isAr ? 'اختبار منشئ التدفق' : 'Workflow Builder Test' },
    { to: '/toorgen/extend',   icon: '🧪', label: isAr ? 'تورجن المتقدم' : 'ToorGen Extend' },
    { to: '/scanner',          icon: '📷', label: isAr ? 'الماسح' : 'Scanner' },
    { to: '/scanner/desktop',  icon: '🖥️', label: isAr ? 'الماسح المكتبي' : 'Scanner Desktop' },
    { to: '/vidplayer',        icon: '▶️', label: isAr ? 'مشغل الفيديو' : 'Vid Player' },
    { to: '/play-test',        icon: '🕹️', label: isAr ? 'اختبار اللعب' : 'Play Test' },
    ...(communicationFeatureFlags.messagesPage ? [{ to: '/messages', icon: '💬', label: isAr ? 'الرسائل' : 'Messages' }] : []),
    ...(communicationFeatureFlags.adHocTasksPage ? [{ to: '/ops-tasks', icon: '🧾', label: isAr ? 'مهام التشغيل' : 'Ops Tasks' }] : []),
    { to: '/billing',          icon: '💳', label: isAr ? 'الاشتراك' : 'Billing' },
    { to: '/profile',          icon: '👤', label: isAr ? 'الملف الشخصي' : 'Profile' },
    ...(isMasterUser
      ? [
          { to: '/game-modes', icon: '🧩', label: isAr ? 'أوضاع اللعب' : 'Game Modes' },
          { to: '/voice-lab', icon: '🎙️', label: isAr ? 'مختبر الصوت' : 'Voice Lab' },
          { to: '/ai-lab', icon: '🤖', label: isAr ? 'مختبر الذكاء' : 'AI Lab' },
          { to: '/cover-gen-lab', icon: '🖼️', label: isAr ? 'مختبر الغلاف' : 'Cover Lab' },
        ]
      : []),
  ]
  return nav
}

function resolveNavTarget(to: string) {
  if (typeof window === 'undefined') return to
  if (to === '/editor') return sessionStorage.getItem('lastEditorPath') || to
  if (to === '/mini-game-editor') return sessionStorage.getItem('lastMiniGameEditorPath') || to
  return to
}

function RequireAuth({
  user,
  children,
  loadingFallback,
}: {
  user: User | null | undefined
  children: ReactElement
  loadingFallback?: ReactElement
}) {
  const location = useLocation()
  if (user === undefined) {
    return loadingFallback || (
      <div className="app-loading-screen">
        <div className="app-loading-spinner" />
      </div>
    )
  }
  if (!user) {
    const returnTo = `${location.pathname}${location.search}`
    return <Navigate to={`/login?returnTo=${encodeURIComponent(returnTo)}`} replace state={{ returnTo }} />
  }
  return children
}

function RequireAdmin({ user, children }: { user: User | null; children: ReactElement }) {
  const location = useLocation()
  if (!user) {
    const returnTo = `${location.pathname}${location.search}`
    return <Navigate to={`/login?returnTo=${encodeURIComponent(returnTo)}`} replace state={{ returnTo }} />
  }
  if (!MASTER_EMAIL || user.email !== MASTER_EMAIL) return <Navigate to="/dashboard" replace />
  return children
}

function StandaloneDevRedirect({
  origin,
  fallbackLabel,
}: {
  origin: string
  fallbackLabel: string
}) {
  const location = useLocation()

  useEffect(() => {
    if (typeof window === 'undefined') return

    const normalizedOrigin = origin.replace(/\/$/, '')
    const target = `${normalizedOrigin}/${location.search}${location.hash}`.replace(/\/(?=[?#])/, '')
    window.location.replace(target)
  }, [location.hash, location.search, origin])

  return (
    <div className="app-loading-screen">
      <AppBrandMark />
      <div className="app-loading-spinner" />
      <p className="app-loading-note">Opening {fallbackLabel}…</p>
      <p className="app-loading-note">
        If the redirect does not happen automatically, <a href={`${origin.replace(/\/$/, '')}/${location.search}${location.hash}`.replace(/\/(?=[?#])/, '')}>open it here</a>.
      </p>
    </div>
  )
}

function AppBrandMark() {
  return (
    <div className="app-loading-brand" aria-label="QYan Gaming">
      Q<span>Yan</span> Gaming
    </div>
  )
}

function AppLoadingScreen({
  variant = 'default',
  note,
}: {
  variant?: 'default' | 'workhub'
  note?: string
}) {
  if (variant === 'workhub') {
    return (
      <div className="app-loading-screen is-workhub">
        <div className="app-loading-workhub-badge" aria-hidden="true">W</div>
        <div className="app-loading-workhub-copy">
          <strong>WorkHub</strong>
          {note && <span>{note}</span>}
        </div>
        <div className="app-loading-spinner app-loading-spinner-workhub" />
      </div>
    )
  }

  return (
    <div className="app-loading-screen">
      <AppBrandMark />
      <div className="app-loading-spinner" />
      {note ? <p className="app-loading-note">{note}</p> : null}
    </div>
  )
}

import VideoEditorPage from './pages/VideoEditorPage';

function App() {
  const redirectPendingKey = 'qyan:authRedirectPending'
  const accessDeniedReasonKey = 'qyan:accessDeniedReason'
  const [user, setUser] = useState<User | null | undefined>(() => {
    if (typeof window === 'undefined') return undefined

    const hasSessionHint = localStorage.getItem('qyan:session') === '1'
    const redirectStartedAt = Number(localStorage.getItem(redirectPendingKey) || '0')
    const redirectStillPending = redirectStartedAt > 0 && Date.now() - redirectStartedAt < 60000

    return (hasSessionHint || redirectStillPending) ? undefined : null
  })
  const navigate = useNavigate()
  const location = useLocation()
  const isLocalDevHost = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)
  const hasScopedVidEditContext = new URLSearchParams(location.search).has('studioProjectId')
  const standaloneVidEditOrigin = (import.meta.env.VITE_VIDEDIT_DEV_ORIGIN as string | undefined)?.trim() || 'http://localhost:3001'
  const useStandaloneVidEdit = import.meta.env.DEV && isLocalDevHost && Boolean(standaloneVidEditOrigin) && !hasScopedVidEditContext
  const allowUnauthedLocalPlayTest = false
  const allowUnauthedLocalCanvas = false
  const enableMSESequencerDemo = import.meta.env.VITE_ENABLE_MSE_SEQUENCER_DEMO === '1'
    || (import.meta.env.DEV
      && typeof window !== 'undefined'
      && new URLSearchParams(window.location.search).get('mseDemo') === '1')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [burgerOpen, setBurgerOpen] = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)
  const [mobileHeaderCompact, setMobileHeaderCompact] = useState(false)
  const [isMobileLayout, setIsMobileLayout] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(max-width: 768px)').matches
  })
  const [theme, setTheme] = useState<'dark' | 'light'>(
    () => 'light'
  )
  const [language, setLanguage] = useState<'ar' | 'en'>(
    () => 'ar'
  )
  const isAr = language === 'ar'
  const [slidePanelLayout, setSlidePanelLayout] = useState<'left' | 'bottom'>(
    () => (localStorage.getItem('qyan:slidePanelLayout') as 'left' | 'bottom') || 'bottom'
  )
  const [slidePanelEnabled, setSlidePanelEnabled] = useState<boolean>(() => {
    const stored = localStorage.getItem('qyan:slidePanelEnabled')
    if (stored === null) return false
    return stored !== 'false'
  })
  const {
    open: chatDockOpen,
    toggle: toggleChatDock,
    close: closeChatDock,
    openDock: openChatDock,
  } = useChatDockState({
    enabled: communicationFeatureFlags.chatDock,
  })
  const [chatThreadIntent, setChatThreadIntent] = useState<{
    threadId: string
    key: number
    targetPath?: string
    targetTaskId?: string
    targetLabel?: string
    projectTargetPath?: string
    projectTargetLabel?: string
  } | null>(null)

  useEffect(() => {
    if (!communicationFeatureFlags.chatDock) return

    const handleDockOpenRequest = (event: Event) => {
      const customEvent = event as CustomEvent<ChatDockOpenDetail>
      const detail = customEvent.detail || {}
      const currentUid = auth.currentUser?.uid || ''
      const resolvedThreadId = (detail.threadId || '').trim()
        || (currentUid && detail.actorUid ? buildThreadId([currentUid, detail.actorUid]) : THREAD_EVERYONE)
      const resolvedTargetPath = (detail.targetPath || '').trim()
      const resolvedTargetTaskId = (detail.targetTaskId || '').trim()
      const resolvedTargetLabel = (detail.targetLabel || '').trim()
      const resolvedProjectTargetPath = (detail.projectTargetPath || '').trim()
      const resolvedProjectTargetLabel = (detail.projectTargetLabel || '').trim()
      setChatThreadIntent({
        threadId: resolvedThreadId,
        key: Date.now(),
        ...(resolvedTargetPath ? { targetPath: resolvedTargetPath } : {}),
        ...(resolvedTargetTaskId ? { targetTaskId: resolvedTargetTaskId } : {}),
        ...(resolvedTargetLabel ? { targetLabel: resolvedTargetLabel } : {}),
        ...(resolvedProjectTargetPath ? { projectTargetPath: resolvedProjectTargetPath } : {}),
        ...(resolvedProjectTargetLabel ? { projectTargetLabel: resolvedProjectTargetLabel } : {}),
      })
      openChatDock()
    }

    window.addEventListener(CHAT_DOCK_OPEN_EVENT, handleDockOpenRequest as EventListener)
    return () => window.removeEventListener(CHAT_DOCK_OPEN_EVENT, handleDockOpenRequest as EventListener)
  }, [openChatDock])
  const handleSignOut = useCallback(() => {
    const returnTo = `${location.pathname}${location.search}`
    // Check if user is in editor with unsaved changes
    const isInEditor = location.pathname === '/editor' || location.pathname === '/mini-game-editor'
    const editorState = sessionStorage.getItem('qyan:editorState')
    
    if (isInEditor && editorState) {
      try {
        const state = JSON.parse(editorState)
        if (state.hasUnsavedChanges) {
          // Show warning dialog
          const confirmed = window.confirm(
            'لديك تغييرات غير محفوظة في المحرر. هل تريد تسجيل الخروج بدون حفظ؟\n\nسيتم حذف جميع البيانات غير المحفوظة.'
          )
          if (!confirmed) {
            return
          }
          // Clear editor state
          sessionStorage.removeItem('qyan:editorState')
          sessionStorage.removeItem('qyan:editorQuizId')
        }
      } catch (e) {
        console.error('Failed to parse editor state:', e)
      }
    }
    
    markSignOut()
    localStorage.removeItem('qyan:session')
    void signOut(auth).then(() => {
      navigate(`/login?returnTo=${encodeURIComponent(returnTo)}`, { replace: true, state: { signedOut: true, returnTo } })
    })
  }, [location.pathname, location.search, navigate])
  const handleGuestSignIn = useCallback(() => {
    const returnTo = `${location.pathname}${location.search}`
    navigate('/login', { state: { returnTo } })
  }, [location.pathname, location.search, navigate])
  const handleOpenMessagesPage = useCallback(() => {
    navigate('/messages')
  }, [navigate])

  const isLoginPage   = location.pathname === '/login'
  const isMasterPage  = MASTER_PATH ? location.pathname.startsWith(MASTER_PATH) : false
  const isWorkHubPage = location.pathname === '/workhub' || location.pathname.startsWith('/workhub/')
  const isLabPage = location.pathname === '/lab' || location.pathname.startsWith('/lab/')
  const isCanvasPage = location.pathname === '/canvas'
    || location.pathname.startsWith('/canvas/')
    || location.pathname === '/workflow-builder-test'
    || location.pathname.startsWith('/workflow-builder-test/')
  const isToorGenPage = location.pathname === '/toorgen' || location.pathname.startsWith('/toorgen/')
  const isVidEditPage = location.pathname.toLowerCase() === '/videdit' || location.pathname.toLowerCase().startsWith('/videdit/')
  const isVidPlayerPage = location.pathname === '/vidplayer' || location.pathname.startsWith('/vidplayer/')
  const isScannerPage = location.pathname === '/scanner' || location.pathname.startsWith('/scanner/')
  const isScannerDesktopPage = location.pathname === '/scanner/desktop' || location.pathname.startsWith('/scanner/desktop/')
  const isEmbeddedPreview = location.pathname.startsWith('/preview/') && new URLSearchParams(location.search).get('embedded') === '1'
  const isGameEmbed = location.pathname.startsWith('/embed') || location.pathname.startsWith('/play')

  // Apply theme to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('quizAdminTheme', theme)
  }, [theme])

  // Keep layout direction globally stable (no RTL/LTR flipping by language)
  useEffect(() => {
    document.documentElement.setAttribute('dir', 'ltr')
    document.documentElement.setAttribute('lang', language)
    localStorage.setItem('quizAdminLang', language)
  }, [language])

  useEffect(() => {
    const path = location.pathname
    let nextTitle = 'Admin'

    if (isWorkHubPage) nextTitle = 'WorkHub'
    else if (path === '/login') nextTitle = 'Login'
    else if (path.startsWith('/dashboard') || path === '/') nextTitle = 'Dashboard'
    else if (path.startsWith('/editor')) nextTitle = 'Challenge Editor'
    else if (path.startsWith('/mini-game-editor')) nextTitle = 'Game Editor'
    else if (path.startsWith('/my-quizzes')) nextTitle = 'My Challenges'
    else if (path.startsWith('/packs')) nextTitle = 'Library'
    else if (path.startsWith('/billing')) nextTitle = 'Billing'
    else if (path.startsWith('/messages')) nextTitle = 'Messages'
    else if (path.startsWith('/ops-tasks')) nextTitle = 'Ops Tasks'
    else if (path.startsWith('/profile')) nextTitle = 'Profile'
    else if (path.startsWith('/studio')) nextTitle = 'Studio'
    else if (path.startsWith('/lab')) nextTitle = 'Lab'
    else if (path.startsWith('/voice-lab')) nextTitle = 'Voice Lab'
    else if (path.startsWith('/ai-lab')) nextTitle = 'AI Lab'
    else if (path.startsWith('/cover-gen-lab')) nextTitle = 'Cover Generator'
    else if (path.startsWith('/canvas') || path.startsWith('/workflow-builder-test')) nextTitle = 'Canvas'
    else if (path.startsWith('/game-modes')) nextTitle = 'Game Modes'
    else if (path.startsWith('/play-test')) nextTitle = 'Play Test'
    else if (path.startsWith('/scanner')) nextTitle = 'Scanner'
    else if (path.startsWith('/preview')) nextTitle = 'Preview'
    else if (path.startsWith('/play') || path.startsWith('/embed')) nextTitle = 'Game'
    else if (isMasterPage) nextTitle = 'Master Admin'

    document.title = nextTitle
  }, [isMasterPage, isWorkHubPage, location.pathname])

  useEffect(() => {
    localStorage.setItem('qyan:slidePanelEnabled', slidePanelEnabled ? 'true' : 'false')
  }, [slidePanelEnabled])

  useEffect(() => {
    if (user) return
    closeChatDock()
  }, [closeChatDock, user])

  useEffect(() => {
    const redirectStartedAt = Number(localStorage.getItem(redirectPendingKey) || '0')
    const redirectStillPending = redirectStartedAt > 0 && Date.now() - redirectStartedAt < 60000
    const authTimeoutMs = redirectStillPending ? 30000 : 12000

    // Safety timeout: if Firebase auth is unusually slow (common on first Safari visit),
    // stop waiting state but do not force navigation from here to avoid auth race loops.
    const authTimeout = window.setTimeout(() => {
      setUser((prev) => (prev === undefined ? null : prev))
    }, authTimeoutMs)

    const unsub = onAuthStateChanged(auth, (u) => {
      clearTimeout(authTimeout)
      setUser(u)

      // Persist a cheap hint so future app loads know whether to show the
      // spinner (likely returning session) or skip straight to login.
      if (u) {
        localStorage.removeItem(redirectPendingKey)
        localStorage.setItem('qyan:session', '1')
        localStorage.removeItem(accessDeniedReasonKey)
      } else {
        if (!redirectStillPending) {
          localStorage.removeItem(redirectPendingKey)
        }
        localStorage.removeItem('qyan:session')
      }

      // Keep initial navigation fast; never block UI on network calls.
      if (u && window.location.pathname === '/login') {
        const params = new URLSearchParams(window.location.search)
        const queryReturnTo = params.get('returnTo') || ''
        const safeReturnTo = queryReturnTo.startsWith('/') ? queryReturnTo : '/dashboard'
        navigate(safeReturnTo, { replace: true })
      }

      // Ensure admin claim in background (master only), without delaying render.
      if (u && MASTER_EMAIL && u.email === MASTER_EMAIL) {
        const claimKey = `_adminClaimChecked:${u.uid}`
        if (!sessionStorage.getItem(claimKey)) {
          sessionStorage.setItem(claimKey, '1')
          void (async () => {
            try {
              const tokenResult = await u.getIdTokenResult()
              if (!tokenResult.claims['admin']) {
                await grantAdminClaim()
                await u.getIdToken(true)
              }
            } catch (e) {
              console.warn('[admin] Could not set admin claim:', e)
              sessionStorage.removeItem(claimKey)
            }
          })()
        }
      }

      // Track device type + always update user profile on sign-in
      if (u) {
        const isMobile = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
        // Avoid duplicate writes caused by effect replays in development StrictMode.
        const activityKey = `_activityTracked:${u.uid}`
        if (!sessionStorage.getItem(activityKey)) {
          sessionStorage.setItem(activityKey, '1')
          void recordUserActivity(u.uid, {
            email: u.email || '',
            displayName: u.displayName || '',
            photoURL: u.photoURL || '',
            platform: isMobile ? 'mobile' : 'desktop',
            createdAt: u.metadata.creationTime || '',
          })
        }
        // Count device visits only once per browser session (not on every re-render)
        if (!sessionStorage.getItem('_deviceTracked')) {
          sessionStorage.setItem('_deviceTracked', '1')
          void incrementPlatformStat(isMobile ? 'mobileVisits' : 'desktopVisits')
        }
        // Load saved preferences (language, theme) from Firestore and apply them
        void loadUserPrefs(u.uid).then(prefs => {
          if (prefs?.language) setLanguage(prefs.language)
          if (prefs?.theme) setTheme(prefs.theme)
          if (prefs?.slidePanelLayout) setSlidePanelLayout(prefs.slidePanelLayout)
          if (typeof prefs?.slidePanelEnabled === 'boolean') setSlidePanelEnabled(prefs.slidePanelEnabled)
        })

      }
    })
    return () => { clearTimeout(authTimeout); unsub() }
  }, [isLocalDevHost, navigate])

  // Real-time blocked-user enforcement: sign out immediately if status becomes 'blocked'
  useEffect(() => {
    if (!user) return
    const unsub = subscribeUserDoc(user.uid, (profile) => {
      const runtimeStatus = ((profile as { status?: string } | null)?.status || '').toLowerCase()
      if (runtimeStatus === 'blocked' || runtimeStatus === 'deleted' || runtimeStatus === 'suspended') {
        localStorage.setItem(accessDeniedReasonKey, 'blocked')
        void signOut(auth)
      }
    })
    return unsub
  }, [user])

  // Close burger + profile when route changes
  useEffect(() => {
    setBurgerOpen(false)
    setProfileOpen(false)
    setMobileHeaderCompact(false)
  }, [location.pathname])

  // Keep layout shell in sync with viewport width so mobile and desktop can use
  // completely different structures without changing page logic.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const query = window.matchMedia('(max-width: 768px)')
    const apply = (matches: boolean) => setIsMobileLayout(matches)
    apply(query.matches)

    const onChange = (event: MediaQueryListEvent) => apply(event.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      reportError('async', 'unhandledrejection', event.reason)
    }

    const onWindowError = (event: ErrorEvent) => {
      // ResizeObserver loop notifications are benign browser-level events fired by
      // layout-heavy libraries (e.g. ReactFlow). Suppress them to avoid log spam.
      const msg = typeof event.message === 'string' ? event.message : ''
      if (msg.includes('ResizeObserver loop')) return
      reportError('async', 'window.onerror', event.error || event.message)
    }

    window.addEventListener('unhandledrejection', onUnhandledRejection)
    window.addEventListener('error', onWindowError)

    return () => {
      window.removeEventListener('unhandledrejection', onUnhandledRejection)
      window.removeEventListener('error', onWindowError)
    }
  }, [])

  // Close profile dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  if (user === undefined && (isLoginPage || isWorkHubPage || isMasterPage || isLabPage || isCanvasPage || isVidEditPage || isVidPlayerPage || isScannerPage || isEmbeddedPreview || isGameEmbed)) {
    if (isLoginPage) {
      return (
        <ToastProvider>
          <DialogProvider>
            <div className="login-shell">
              <main className="login-main">
                <LoginPage />
              </main>
            </div>
            <Dialog />
          </DialogProvider>
        </ToastProvider>
      )
    }

    return (
      <AppLoadingScreen
        variant={isWorkHubPage ? 'workhub' : 'default'}
        note={isWorkHubPage
          ? (isAr ? 'جارٍ تجهيز مساحة العمل…' : 'Preparing your workspace…')
          : isLabPage
            ? (isAr ? 'جارٍ تجهيز المختبر…' : 'Preparing Lab…')
          : isCanvasPage
            ? (isAr ? 'جارٍ تجهيز اللوحة…' : 'Preparing Canvas…')
          : (isAr ? 'جارٍ التحقق من جلسة الدخول…' : 'Checking your session…')}
      />
    )
  }

  // ── Standalone Lab — dedicated workspace-first generation app ──
  if (isLabPage) {
    return (
      <ToastProvider>
        <DialogProvider>
          <div className="master-admin-standalone">
            <ErrorBoundary>
              <Suspense fallback={
                <AppLoadingScreen
                  variant="default"
                  note={isAr ? 'جارٍ تحميل المختبر…' : 'Loading Lab…'}
                />
              }>
                <RequireAuth user={user}><LabPage user={user as User} /></RequireAuth>
              </Suspense>
            </ErrorBoundary>
            <Dialog />
          </div>
        </DialogProvider>
      </ToastProvider>
    )
  }

  // ── Standalone Canvas — full-screen workflow builder shell ──
  if (isCanvasPage) {
    return (
      <ToastProvider>
        <DialogProvider>
          <div className="master-admin-standalone workflow-builder-standalone">
            <ErrorBoundary>
              <Suspense fallback={
                <AppLoadingScreen
                  variant="default"
                  note={isAr ? 'جارٍ تحميل اللوحة…' : 'Loading Canvas…'}
                />
              }>
                <RequireAdmin user={user ?? null}><WorkflowBuilderTestPage /></RequireAdmin>
              </Suspense>
            </ErrorBoundary>
            <Dialog />
          </div>
        </DialogProvider>
      </ToastProvider>
    )
  }

  // ── Standalone Master Admin — no sidebar, no shell chrome ──
  if (isMasterPage) {
    return (
      <ToastProvider>
        <DialogProvider>
          <div className="master-admin-standalone">
            <Suspense fallback={
              <AppLoadingScreen />
            }>
              <Routes>
                <Route path={MASTER_PATH ? `${MASTER_PATH}/*` : '__disabled__'} element={<RequireAdmin user={user ?? null}><MasterAdminPage /></RequireAdmin>} />
              </Routes>
            </Suspense>
          </div>
          <Dialog />
        </DialogProvider>
      </ToastProvider>
    )
  }

  // ── Standalone WorkHub (desktop only) — keep no sidebar chrome on desktop,
  // while mobile routes through the dedicated mobile shell below.
  if (isWorkHubPage) {
    return (
      <ToastProvider>
        <DialogProvider>
          <div className="master-admin-standalone">
            <ErrorBoundary>
              <Suspense fallback={
                <AppLoadingScreen
                  variant="workhub"
                  note={isAr ? 'جارٍ تحميل WorkHub…' : 'Loading WorkHub…'}
                />
              }>
                <RequireAuth
                  user={user}
                  loadingFallback={
                    <AppLoadingScreen
                      variant="workhub"
                      note={isAr ? 'جارٍ تحميل WorkHub…' : 'Loading WorkHub…'}
                    />
                  }
                >
                  <WorkHubRoutePage />
                </RequireAuth>
              </Suspense>
            </ErrorBoundary>
            <Dialog />
            {user && communicationFeatureFlags.chatDock && (
              <>
                <FeatureErrorBoundary
                  name="ChatDock"
                  resetKey={`${chatThreadIntent?.key || ''}`}
                >
                  <ChatDock
                    open={chatDockOpen}
                    isAr={isAr}
                    onClose={closeChatDock}
                    onOpenMessagesPage={handleOpenMessagesPage}
                    layout="floating"
                    floatingSide="left"
                    defaultTargetPath={chatThreadIntent?.targetPath}
                    defaultTargetTaskId={chatThreadIntent?.targetTaskId}
                    defaultTargetLabel={chatThreadIntent?.targetLabel}
                    projectTargetPath={chatThreadIntent?.projectTargetPath}
                    projectTargetLabel={chatThreadIntent?.projectTargetLabel}
                    currentUser={{
                      uid: user.uid,
                      displayName: user.displayName || undefined,
                      email: user.email || undefined,
                      photoURL: user.photoURL || undefined,
                    }}
                    requestedThreadId={chatThreadIntent?.threadId}
                    requestKey={chatThreadIntent?.key}
                    showOpenPageButton={communicationFeatureFlags.messagesPage}
                  />
                </FeatureErrorBoundary>
              </>
            )}
          </div>
        </DialogProvider>
      </ToastProvider>
    )
  }

  // ── Standalone ToorGen — dedicated AI generation shell ──
  if (isToorGenPage) {
    return (
      <ToastProvider>
        <DialogProvider>
          <div className="master-admin-standalone">
            <ErrorBoundary>
              <Suspense fallback={
                <AppLoadingScreen
                  variant="default"
                  note={isAr ? 'جارٍ تحميل ToorGen…' : 'Loading ToorGen…'}
                />
              }>
                <RequireAuth
                  user={user}
                  loadingFallback={
                    <AppLoadingScreen
                      variant="default"
                      note={isAr ? 'جارٍ تحميل ToorGen…' : 'Loading ToorGen…'}
                    />
                  }
                >
                  <Routes>
                    <Route path="/toorgen/extend" element={<ToorGenExtendPage />} />
                    <Route path="/toorgen/lab" element={<Navigate to="/lab" replace />} />
                    <Route path="/toorgen" element={<ToorGenPage />} />
                    <Route path="/toorgen/*" element={<ToorGenPage />} />
                  </Routes>
                </RequireAuth>
              </Suspense>
            </ErrorBoundary>
            <Dialog />
          </div>
        </DialogProvider>
      </ToastProvider>
    )
  }

  // ── Standalone VidPlayer — local dev tool, no sidebar, no auth ──
  if (isVidEditPage) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<div className="app-loading-screen" />}>
          <RequireAuth user={user}>
            {useStandaloneVidEdit
              ? <StandaloneDevRedirect origin={standaloneVidEditOrigin} fallbackLabel="Video Editor" />
              : <VideoEditorPage />}
          </RequireAuth>
        </Suspense>
      </ErrorBoundary>
    )
  }

  // ── Standalone VidPlayer — local dev tool, no sidebar, no auth ──
  if (isVidPlayerPage) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<div className="app-loading-screen" />}>
          <RequireAuth user={user}><VidPlayerPage /></RequireAuth>
        </Suspense>
      </ErrorBoundary>
    )
  }

  // ── Standalone Scanner — no sidebar, no app chrome ──
  if (isScannerPage) {
    return (
      <ErrorBoundary>
        <Suspense fallback={<div className="app-scanner-fallback" />}>
          <RequireAuth user={user}>{isScannerDesktopPage ? <ScannerDesktopPage /> : <ScannerPage />}</RequireAuth>
        </Suspense>
      </ErrorBoundary>
    )
  }

  // ── Embedded Preview — no sidebar, no shell chrome ──
  const userPrefsValue = {
    language,
    setLanguage,
    theme,
    setTheme,
    slidePanelLayout,
    setSlidePanelLayout,
    slidePanelEnabled,
    setSlidePanelEnabled,
  }

  if (isEmbeddedPreview) {
    return (
      <UserPrefsContext.Provider value={userPrefsValue}>
        <ToastProvider>
          <DialogProvider>
            <div className="master-admin-standalone embedded-preview-shell">
              <ErrorBoundary>
                <Suspense fallback={
                  <AppLoadingScreen />
                }>
                  <Routes>
                    <Route path="/preview" element={<RequireAuth user={user}><QuizPreviewPage /></RequireAuth>} />
                    <Route path="/preview/:id" element={<RequireAuth user={user}><QuizPreviewPage /></RequireAuth>} />
                  </Routes>
                </Suspense>
              </ErrorBoundary>
              <Dialog />
              <VFXContainer />
            </div>
          </DialogProvider>
        </ToastProvider>
      </UserPrefsContext.Provider>
    )
  }

  // ── Embedded Game — no sidebar, no shell chrome ──
  if (isGameEmbed) {
    return (
      <UserPrefsContext.Provider value={userPrefsValue}>
        <ToastProvider>
          <DialogProvider>
            <div className="master-admin-standalone embedded-preview-shell">
              <ErrorBoundary>
                <Suspense fallback={
                  <AppLoadingScreen />
                }>
                  <Routes>
                    <Route path="/embed/:gameId" element={<RequireAuth user={user}><GameEmbedPage /></RequireAuth>} />
                    <Route path="/play" element={<RequireAuth user={user}><GameEmbedPage /></RequireAuth>} />
                    <Route path="/play/:gameId" element={<RequireAuth user={user}><GameEmbedPage /></RequireAuth>} />
                  </Routes>
                </Suspense>
              </ErrorBoundary>
              <Dialog />
            </div>
          </DialogProvider>
        </ToastProvider>
      </UserPrefsContext.Provider>
    )
  }

  const appRoutes = (
    <Routes>
      <Route path="/vidEdit" element={withRouteBoundary('videdit', <RequireAuth user={user}>{useStandaloneVidEdit ? <StandaloneDevRedirect origin={standaloneVidEditOrigin} fallbackLabel="Video Editor" /> : <VideoEditorPage />}</RequireAuth>)} />
      <Route path="/" element={withRouteBoundary('home', <Navigate to="/dashboard" replace />)} />
      <Route path="/login" element={withRouteBoundary('login', <LoginPage />)} />
      <Route path="/dashboard" element={withRouteBoundary('dashboard', <RequireAuth user={user}><DashboardPage /></RequireAuth>)} />
      <Route path="/editor" element={withRouteBoundary('editor', <RequireAuth user={user}><QuizEditorPage /></RequireAuth>)} />
      <Route path="/editor/:id" element={withRouteBoundary('editor-id', <RequireAuth user={user}><QuizEditorPage /></RequireAuth>)} />
      <Route path="/mini-game-editor" element={withRouteBoundary('mini-game-editor', <RequireAuth user={user}><QuizEditorPage /></RequireAuth>)} />
      <Route path="/mini-game-editor/:id" element={withRouteBoundary('mini-game-editor-id', <RequireAuth user={user}><QuizEditorPage /></RequireAuth>)} />
      <Route path="/game-modes" element={withRouteBoundary('game-modes', <RequireAdmin user={user ?? null}><GameModesPage /></RequireAdmin>)} />
      <Route path="/play-test" element={withRouteBoundary('play-test', allowUnauthedLocalPlayTest ? <RequireAuth user={user}><PlayTestPage /></RequireAuth> : <RequireAdmin user={user ?? null}><PlayTestPage /></RequireAdmin>)} />
      <Route path="/play-test/:gameId" element={withRouteBoundary('play-test-game', allowUnauthedLocalPlayTest ? <RequireAuth user={user}><PlayTestPage /></RequireAuth> : <RequireAdmin user={user ?? null}><PlayTestPage /></RequireAdmin>)} />
      <Route path="/play" element={withRouteBoundary('play', <RequireAuth user={user}><GameEmbedPage /></RequireAuth>)} />
      <Route path="/play/:gameId" element={withRouteBoundary('play-game', <RequireAuth user={user}><GameEmbedPage /></RequireAuth>)} />
      <Route path="/preview" element={withRouteBoundary('preview', <RequireAuth user={user}><QuizPreviewPage /></RequireAuth>)} />
      <Route path="/preview/:id" element={withRouteBoundary('preview-id', <RequireAuth user={user}><QuizPreviewPage /></RequireAuth>)} />
      <Route path="/packs" element={withRouteBoundary('packs', <RequireAuth user={user}><PacksPage /></RequireAuth>)} />
      <Route path="/my-quizzes" element={withRouteBoundary('my-quizzes', <RequireAuth user={user}><MyQuizzesPage /></RequireAuth>)} />
      <Route path="/workhub/*" element={withRouteBoundary('workhub', <RequireAuth user={user} loadingFallback={<AppLoadingScreen variant="workhub" note={isAr ? 'جارٍ تحميل WorkHub…' : 'Loading WorkHub…'} />}><WorkHubRoutePage /></RequireAuth>)} />
      <Route path="/studio" element={withRouteBoundary('studio', <RequireAuth user={user}><StudioPage user={user ?? null} /></RequireAuth>)} />
      <Route path="/toorgen/*" element={withRouteBoundary('toorgen', <RequireAuth user={user}><ToorGenPage /></RequireAuth>)} />
      {communicationFeatureFlags.messagesPage ? (
        <Route path="/messages" element={withRouteBoundary('messages', <RequireAuth user={user}><MessagesPage /></RequireAuth>)} />
      ) : null}
      {communicationFeatureFlags.adHocTasksPage ? (
        <Route path="/ops-tasks" element={withRouteBoundary('ops-tasks', <RequireAuth user={user}><AdHocTasksPage /></RequireAuth>)} />
      ) : null}
      <Route path="/voice-lab" element={withRouteBoundary('voice-lab', <RequireAdmin user={user ?? null}><VoiceLabPage /></RequireAdmin>)} />
      <Route path="/ai-lab" element={withRouteBoundary('ai-lab', <RequireAdmin user={user ?? null}><AILabPage /></RequireAdmin>)} />
      <Route path="/cover-gen-lab" element={withRouteBoundary('cover-gen-lab', <RequireAdmin user={user ?? null}><CoverGenLabPage /></RequireAdmin>)} />
      <Route path="/canvas" element={withRouteBoundary('canvas', allowUnauthedLocalCanvas ? <RequireAuth user={user}><WorkflowBuilderTestPage /></RequireAuth> : <RequireAdmin user={user ?? null}><WorkflowBuilderTestPage /></RequireAdmin>)} />
      <Route path="/canvas/f/:flowId" element={withRouteBoundary('canvas-flow', allowUnauthedLocalCanvas ? <RequireAuth user={user}><WorkflowBuilderTestPage /></RequireAuth> : <RequireAdmin user={user ?? null}><WorkflowBuilderTestPage /></RequireAdmin>)} />
      <Route path="/workflow-builder-test" element={withRouteBoundary('workflow-builder-test', allowUnauthedLocalCanvas ? <RequireAuth user={user}><WorkflowBuilderTestPage /></RequireAuth> : <RequireAdmin user={user ?? null}><WorkflowBuilderTestPage /></RequireAdmin>)} />
      <Route path="/workflow-builder-test/f/:flowId" element={withRouteBoundary('workflow-builder-test-flow', allowUnauthedLocalCanvas ? <RequireAuth user={user}><WorkflowBuilderTestPage /></RequireAuth> : <RequireAdmin user={user ?? null}><WorkflowBuilderTestPage /></RequireAdmin>)} />
      <Route path="/billing" element={withRouteBoundary('billing', <RequireAuth user={user}><BillingPage /></RequireAuth>)} />
      <Route path="/profile" element={withRouteBoundary('profile', <RequireAuth user={user}><ProfilePage /></RequireAuth>)} />
    </Routes>
  )

  const isMasterUser = !!(user && MASTER_EMAIL && user.email === MASTER_EMAIL)
  const navItems = getNav(isAr, isMasterUser)
  const navLookup = new Map(navItems.map((item) => [item.to, item]))
  const pickNavItems = (targets: string[]): NavItem[] => {
    const selected: NavItem[] = []
    for (const to of targets) {
      const item = navLookup.get(to)
      if (item) selected.push(item)
    }
    return selected
  }

  const mobileRouteKey =
    location.pathname.startsWith('/editor') || location.pathname.startsWith('/mini-game-editor')
      ? 'editor'
      : location.pathname.startsWith('/workhub')
        ? 'workhub'
        : location.pathname.startsWith('/toorgen')
          ? 'toorgen'
        : location.pathname.startsWith('/lab')
          ? 'lab'
        : location.pathname.startsWith('/studio')
          ? 'studio'
        : location.pathname.startsWith('/packs')
          ? 'library'
          : location.pathname.startsWith('/my-quizzes')
            ? 'my-quizzes'
            : location.pathname.startsWith('/messages')
              ? 'messages'
              : location.pathname.startsWith('/ops-tasks')
                ? 'ops-tasks'
            : location.pathname.startsWith('/billing')
              ? 'billing'
              : location.pathname.startsWith('/profile')
                ? 'profile'
                : location.pathname.startsWith('/game-modes')
                  ? 'game-modes'
                  : location.pathname.startsWith('/voice-lab') || location.pathname.startsWith('/ai-lab') || location.pathname.startsWith('/cover-gen-lab')
                    ? 'labs'
                    : 'dashboard'

  const mobileHeaderTitle =
    mobileRouteKey === 'editor'
      ? (isAr ? 'استوديو التحديات' : 'Challenge Studio')
      : mobileRouteKey === 'workhub'
        ? (isAr ? 'وورك هَب التشغيلي' : 'WorkHub Operations')
      : mobileRouteKey === 'toorgen'
        ? (isAr ? 'تورجن' : 'ToorGen')
        : mobileRouteKey === 'lab'
          ? (isAr ? 'المختبر' : 'Lab')
        : mobileRouteKey === 'studio'
          ? (isAr ? 'الاستوديو' : 'Studio')
        : mobileRouteKey === 'library'
          ? (isAr ? 'المكتبة' : 'Library')
          : mobileRouteKey === 'my-quizzes'
            ? (isAr ? 'تحدياتي' : 'My Challenges')
            : mobileRouteKey === 'messages'
              ? (isAr ? 'الرسائل' : 'Messages')
              : mobileRouteKey === 'ops-tasks'
                ? (isAr ? 'مهام التشغيل' : 'Ops Tasks')
            : mobileRouteKey === 'billing'
              ? (isAr ? 'الفوترة' : 'Billing')
              : mobileRouteKey === 'profile'
                ? (isAr ? 'الملف الشخصي' : 'Profile')
                : mobileRouteKey === 'game-modes'
                  ? (isAr ? 'أوضاع اللعب' : 'Game Modes')
                  : mobileRouteKey === 'labs'
                    ? (isAr ? 'المختبر' : 'Labs')
                      : (isAr ? 'مركز التحكم' : 'Control Center')

  const mobileHeaderHint =
    mobileRouteKey === 'editor'
        ? (isAr ? 'صياغة وتحرير ثم نشر' : 'Draft, refine, publish')
      : mobileRouteKey === 'workhub'
          ? (isAr ? 'المشاريع والمهام والمراجعات' : 'Projects, tasks, approvals')
      : mobileRouteKey === 'toorgen'
        ? (isAr ? 'توليد فيديوهات الذكاء الاصطناعي' : 'AI video generation workspace')
        : mobileRouteKey === 'lab'
          ? (isAr ? 'تطبيق المختبر المستقل للمؤسسات والمشاريع' : 'Standalone Lab app for organizations and projects')
        : mobileRouteKey === 'studio'
          ? (isAr ? 'المنظمات والمشاريع والأصول' : 'Organizations, projects, and assets')
        : mobileRouteKey === 'messages'
          ? (isAr ? 'محادثات الفريق الموحدة' : 'Unified team communication')
          : mobileRouteKey === 'ops-tasks'
            ? (isAr ? 'مهام تشغيل بدون مشروع' : 'Non-project operational tasks')
        : mobileRouteKey === 'dashboard'
            ? (isAr ? 'تابع النشاط وانتقل لخطوتك التالية' : 'Review activity and continue your next task')
          : ''

  const mobileTabPriorityByRoute: Record<string, string[]> = {
      dashboard: ['/dashboard', '/workhub', '/editor', '/my-quizzes', '/packs'],
      editor: ['/editor', '/mini-game-editor', '/workhub', '/my-quizzes', '/dashboard'],
      workhub: ['/workhub', '/dashboard', '/editor', '/my-quizzes', '/packs'],
    toorgen: ['/toorgen', '/workhub', '/dashboard', '/editor', '/my-quizzes'],
      lab: ['/lab', '/studio', '/toorgen', '/workhub', '/dashboard'],
    studio: ['/studio', '/toorgen', '/workhub', '/dashboard', '/profile'],
    library: ['/packs', '/my-quizzes', '/dashboard', '/editor', '/profile'],
    'my-quizzes': ['/my-quizzes', '/editor', '/dashboard', '/packs', '/profile'],
    messages: ['/messages', '/dashboard', '/workhub', '/editor', '/profile'],
    'ops-tasks': ['/ops-tasks', '/workhub', '/dashboard', '/messages', '/profile'],
    billing: ['/billing', '/dashboard', '/packs', '/profile', '/workhub'],
    profile: ['/profile', '/dashboard', '/my-quizzes', '/packs', '/workhub'],
    'game-modes': ['/dashboard', '/editor', '/workhub', '/my-quizzes', '/profile'],
    labs: ['/dashboard', '/editor', '/workhub', '/my-quizzes', '/profile'],
  }

  const mobileTabs = (mobileTabPriorityByRoute[mobileRouteKey] || mobileTabPriorityByRoute.dashboard)
    .reduce<NavItem[]>((acc, to) => {
      const item = navLookup.get(to)
      if (item) acc.push(item)
      return acc
    }, [])
    .slice(0, 5)

  const mobileDrawerSections = [
    {
      key: 'primary',
      title: isAr ? 'التنقل الأساسي' : 'Primary',
      links: pickNavItems(['/dashboard', '/my-quizzes', '/packs', '/messages', '/ops-tasks', '/profile', '/billing']),
    },
    {
      key: 'creation',
      title: isAr ? 'التحرير والإنشاء' : 'Creation',
      links: pickNavItems(['/editor', '/mini-game-editor', '/workhub']),
    },
  ]

  const mobileAdminLinks = user?.email === MASTER_EMAIL && MASTER_PATH
    ? [
        { to: '/game-modes', icon: '🧩', label: isAr ? 'أوضاع اللعب' : 'Game Modes' },
        { to: '/voice-lab', icon: '🎙️', label: isAr ? 'مختبر الصوت' : 'Voice Lab' },
        { to: '/ai-lab', icon: '🤖', label: isAr ? 'مختبر الذكاء' : 'AI Lab' },
        { to: '/cover-gen-lab', icon: '🖼️', label: isAr ? 'مختبر الغلاف' : 'Cover Lab' },
        { to: `${MASTER_PATH}/dashboard`, icon: '👑', label: isAr ? 'الإدارة ↗' : 'Admin ↗', end: true },
      ]
    : []

  const handleMobileMainScroll = (event: { currentTarget: HTMLElement }) => {
    const nextCompact = event.currentTarget.scrollTop > 12
    setMobileHeaderCompact((prev) => (prev !== nextCompact ? nextCompact : prev))
  }

  return (
    <UserPrefsContext.Provider value={userPrefsValue}>
    <ToastProvider>
      <DialogProvider>
        <StudioInvitePrompt user={user ?? null} isAr={isAr} />
        {isLoginPage ? (
          <div className="login-shell">
            <main className="login-main">
              <ErrorBoundary>
                <Suspense fallback={
                  <AppLoadingScreen />
                }>
                  {appRoutes}
                </Suspense>
              </ErrorBoundary>
            </main>
          </div>
        ) : isMobileLayout ? (
          <div className="mobile-shell">
            <header className={`mobile-shell-header${mobileHeaderCompact ? ' is-compact' : ''}`}>
              <div className="mobile-shell-header-main">
                <button className="mobile-shell-brand" onClick={() => navigate('/dashboard')} type="button">
                  Q<span>Yan</span> Gaming
                </button>
                <div className="mobile-shell-heading">
                  <strong className="mobile-shell-page-title">{mobileHeaderTitle}</strong>
                  {mobileHeaderHint && <span className="mobile-shell-page-hint">{mobileHeaderHint}</span>}
                </div>
              </div>

              <div className="mobile-shell-actions" ref={profileRef}>
                {user ? (
                  <>
                    {communicationFeatureFlags.notificationsInShell && (
                      <FeatureErrorBoundary name="InAppNotificationCenter">
                        <InAppNotificationCenter userUid={user.uid} isAr={isAr} />
                      </FeatureErrorBoundary>
                    )}
                    {communicationFeatureFlags.chatDock && (
                      <button
                        type="button"
                        className={`shell-comm-btn${chatDockOpen ? ' is-active' : ''}`}
                        onClick={toggleChatDock}
                        aria-label={isAr ? 'لوحة الرسائل' : 'Messages panel'}
                        title={isAr ? 'الرسائل' : 'Messages'}
                      >
                        <span aria-hidden="true">💬</span>
                      </button>
                    )}
                    <button
                      className="mobile-avatar-btn"
                      onClick={() => { setProfileOpen((o) => !o); setBurgerOpen(false) }}
                      aria-label="Profile menu"
                      title="Profile"
                      type="button"
                    >
                      {user.photoURL ? (
                        <img src={user.photoURL} referrerPolicy="no-referrer" alt="" className="sidebar-user-avatar" />
                      ) : (
                        <div className="sidebar-user-avatar sidebar-user-initials small">
                          {(user.displayName || user.email || '?').slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </button>

                    {profileOpen && (
                      <div className="header-profile-dropdown">
                        <button
                          className="header-profile-action"
                          onClick={() => {
                            setProfileOpen(false)
                            navigate('/profile')
                          }}
                          type="button"
                        >
                          {isAr ? '👤 الملف الشخصي' : '👤 Visit Profile'}
                        </button>
                        <button
                          className="header-profile-action danger"
                          onClick={handleSignOut}
                          type="button"
                        >
                          {isAr ? '🚪 تسجيل الخروج' : '🚪 Sign Out'}
                        </button>
                      </div>
                    )}

                    <button
                      className="burger-btn"
                      onClick={() => { setBurgerOpen((o) => !o); setProfileOpen(false) }}
                      aria-label="Toggle menu"
                      title="Menu"
                      type="button"
                    >
                      <span className={`burger-line ${burgerOpen ? 'open-top' : ''}`} />
                      <span className={`burger-line ${burgerOpen ? 'open-mid' : ''}`} />
                      <span className={`burger-line ${burgerOpen ? 'open-bot' : ''}`} />
                    </button>
                  </>
                ) : (
                  <button className="sidebar-auth-btn" onClick={handleGuestSignIn} type="button">
                    {isAr ? 'تسجيل الدخول / إنشاء حساب' : 'Sign In / Sign Up'}
                  </button>
                )}
              </div>
            </header>

            {user && burgerOpen && (
              <div
                className="mobile-drawer-overlay"
                onClick={() => setBurgerOpen(false)}
                aria-label="Close menu"
              />
            )}

            {user && (
              <nav className={`mobile-nav-drawer ${burgerOpen ? ' drawer-open' : ''}`}>
                <div className="mobile-nav-content">
                  {mobileDrawerSections.map((section) => (
                    <section className="mobile-nav-section" key={section.key}>
                      <p className="mobile-nav-section-title">{section.title}</p>
                      {section.links.map(({ to, icon, label, end }) => (
                        <NavLink
                          key={`${section.key}-${to}`}
                          to={resolveNavTarget(to)}
                          end={end}
                          onClick={() => setBurgerOpen(false)}
                          className={() =>
                            `mobile-nav-link${(end ? location.pathname === to : location.pathname.startsWith(to)) ? ' active' : ''}`
                          }
                        >
                          <span className="mobile-nav-link-row mobile-nav-link-row--start">
                            <span className="mobile-nav-link-icon">{icon}</span>
                            <span className="mobile-nav-link-label">{label}</span>
                          </span>
                        </NavLink>
                      ))}
                    </section>
                  ))}

                  {mobileAdminLinks.length > 0 && (
                    <section className="mobile-nav-section mobile-nav-section-admin">
                      <p className="mobile-nav-section-title">{isAr ? 'أدوات الإدارة' : 'Admin Tools'}</p>
                      {mobileAdminLinks.map(({ to, icon, label, end }) => (
                        <NavLink
                          key={`admin-${to}`}
                          to={to}
                          end={end}
                          onClick={() => setBurgerOpen(false)}
                          target={to.startsWith(MASTER_PATH || '/__missing__') ? '_blank' : undefined}
                          rel={to.startsWith(MASTER_PATH || '/__missing__') ? 'noopener noreferrer' : undefined}
                          className={() =>
                            `mobile-nav-link${(end ? location.pathname === to : location.pathname.startsWith(to)) ? ' active' : ''}`
                          }
                        >
                          <span className="mobile-nav-link-row mobile-nav-link-row--start">
                            <span className="mobile-nav-link-icon">{icon}</span>
                            <span className="mobile-nav-link-label">{label}</span>
                          </span>
                        </NavLink>
                      ))}
                    </section>
                  )}
                </div>

                <div className="mobile-nav-divider"></div>

                <div className="mobile-profile-section">
                  <div className="mobile-profile-info">
                    {user.photoURL ? (
                      <img src={user.photoURL} referrerPolicy="no-referrer" alt="" className="mobile-profile-avatar" />
                    ) : (
                      <div className="sidebar-user-avatar sidebar-user-initials mobile-profile-initials">
                        {(user.displayName || user.email || '?').slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="mobile-profile-text">
                      <div className="mobile-profile-name">
                        {user.displayName || user.email?.split('@')[0]}
                      </div>
                      <div className="mobile-profile-email">
                        {user.email}
                      </div>
                    </div>
                  </div>

                  <button onClick={handleSignOut} className="mobile-signout-btn">
                    {isAr ? 'تسجيل الخروج' : 'Sign Out'}
                  </button>
                </div>
              </nav>
            )}

            <main className={`mobile-shell-main mobile-route-${mobileRouteKey}`} data-scrollable="true" onScroll={handleMobileMainScroll}>
              <ErrorBoundary>
                <Suspense fallback={
                  <AppLoadingScreen />
                }>
                  {appRoutes}
                </Suspense>
              </ErrorBoundary>
            </main>

            {user && (
              <nav className="mobile-shell-tabbar">
                {mobileTabs.map(({ to, icon, label, end }) => {
                  const resolvedTo = resolveNavTarget(to)
                  const isActive = end ? location.pathname === to : location.pathname.startsWith(to)
                  return (
                    <NavLink key={to} to={resolvedTo} end={end} className={`mobile-tab-link${isActive ? ' active' : ''}`}>
                      <span className="mobile-tab-icon">{icon}</span>
                      <span className="mobile-tab-label">{label}</span>
                    </NavLink>
                  )
                })}
              </nav>
            )}
          </div>
        ) : (
          <div className={`admin-shell${sidebarCollapsed ? ' sidebar-collapsed' : ''}`}>
            <aside className="admin-sidebar">
              <div className="sidebar-header">
                <h1 className="sidebar-brand sidebar-brand--clickable" onClick={() => navigate('/dashboard')}>Q<span>Yan</span> Gaming</h1>
                {user ? (
                  <button
                    className="sidebar-collapse-btn"
                    onClick={() => setSidebarCollapsed((c) => !c)}
                    title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                  >
                    {sidebarCollapsed ? '›' : '‹'}
                  </button>
                ) : (
                  <button
                    className="sidebar-auth-btn"
                    onClick={handleGuestSignIn}
                    type="button"
                  >
                    {isAr ? 'تسجيل الدخول / إنشاء حساب' : 'Sign In / Sign Up'}
                  </button>
                )}
              </div>

              {user && (
                <nav className="sidebar-nav-desktop">
                  {navItems.map(({ to, icon, label, end }) => {
                    const resolvedTo =
                      to === '/editor'
                        ? (sessionStorage.getItem('lastEditorPath') || to)
                        : to === '/mini-game-editor'
                          ? (sessionStorage.getItem('lastMiniGameEditorPath') || to)
                          : to
                    return (
                      <NavLink
                        key={to}
                        to={resolvedTo}
                        end={end}
                        className={() =>
                          `nav-link${(end ? location.pathname === to : location.pathname.startsWith(to)) ? ' active' : ''}`
                        }
                      >
                        <span className="nav-icon">{icon}</span>
                        <span className="nav-label">{label}</span>
                      </NavLink>
                    )
                  })}

                  {user.email === MASTER_EMAIL && MASTER_PATH && (
                    <>
                      <NavLink
                        to={`${MASTER_PATH}/dashboard`}
                        className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <span className="nav-icon">👑</span>
                        <span className="nav-label">{isAr ? 'الإدارة ↗' : 'Admin ↗'}</span>
                      </NavLink>
                    </>
                  )}
                </nav>
              )}

              {user && (
                <div className="sidebar-user">
                  <div className="sidebar-comm-row">
                    {communicationFeatureFlags.notificationsInShell && (
                      <FeatureErrorBoundary name="InAppNotificationCenterMobile">
                        <InAppNotificationCenter userUid={user.uid} isAr={isAr} />
                      </FeatureErrorBoundary>
                    )}
                    {communicationFeatureFlags.chatDock && (
                      <button
                        type="button"
                        className={`shell-comm-btn${chatDockOpen ? ' is-active' : ''}`}
                        onClick={toggleChatDock}
                        aria-label={isAr ? 'لوحة الرسائل' : 'Messages panel'}
                        title={isAr ? 'الرسائل' : 'Messages'}
                      >
                        <span aria-hidden="true">💬</span>
                      </button>
                    )}
                  </div>
                  <NavLink to="/profile" className={({ isActive }) => `sidebar-user-chip${isActive ? ' active' : ''}`}>
                    {user.photoURL ? (
                      <img src={user.photoURL} referrerPolicy="no-referrer" alt="" className="sidebar-user-avatar" />
                    ) : (
                      <div className="sidebar-user-avatar sidebar-user-initials">
                        {(user.displayName || user.email || '?').slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <span className="sidebar-user-name">
                      {user.displayName || user.email?.split('@')[0]}
                    </span>
                  </NavLink>
                  <button onClick={handleSignOut} className="sidebar-signout-btn">{isAr ? 'تسجيل الخروج' : 'Sign Out'}</button>
                </div>
              )}
            </aside>

            <main className="admin-main" data-scrollable="true">
              <ErrorBoundary>
                <Suspense fallback={
                  <AppLoadingScreen />
                }>
                  {appRoutes}
                </Suspense>
              </ErrorBoundary>
            </main>
          </div>
        )}
        {enableMSESequencerDemo && !isLoginPage && (
          <div className="mse-sequencer-demo-mount">
            <MSEVideoSequencer autoPlay={false} />
          </div>
        )}
        {user && communicationFeatureFlags.chatDock && (
          <FeatureErrorBoundary
            name="ChatDock"
            resetKey={`${chatThreadIntent?.key || ''}`}
          >
            <ChatDock
              open={chatDockOpen}
              isAr={isAr}
              onClose={closeChatDock}
              onOpenMessagesPage={handleOpenMessagesPage}
              defaultTargetPath={chatThreadIntent?.targetPath}
              defaultTargetTaskId={chatThreadIntent?.targetTaskId}
              defaultTargetLabel={chatThreadIntent?.targetLabel}
              projectTargetPath={chatThreadIntent?.projectTargetPath}
              projectTargetLabel={chatThreadIntent?.projectTargetLabel}
              currentUser={{
                uid: user.uid,
                displayName: user.displayName || undefined,
                email: user.email || undefined,
                photoURL: user.photoURL || undefined,
              }}
              requestedThreadId={chatThreadIntent?.threadId}
              requestKey={chatThreadIntent?.key}
              showOpenPageButton={communicationFeatureFlags.messagesPage}
            />
          </FeatureErrorBoundary>
        )}
        <Dialog />
        <VFXContainer />
      </DialogProvider>
    </ToastProvider>
    </UserPrefsContext.Provider>
  )
}

export default App
