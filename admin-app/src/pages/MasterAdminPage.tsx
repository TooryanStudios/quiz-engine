import { useEffect } from 'react'
import { signOut } from 'firebase/auth'
import { useNavigate, useLocation } from 'react-router-dom'
import { auth } from '../lib/firebase'
import { markSignOut } from '../lib/signOutState'
import { useTheme } from '../lib/useTheme'
import { type MasterTab } from './master/masterShared'

// ── Per-section data hooks (each is independently removable) ──────────────────
import { useSessionsData }  from './master/hooks/useSessionsData'
import { useQuizzesData }   from './master/hooks/useQuizzesData'
import { useUsersData }     from './master/hooks/useUsersData'
import { usePlatformStats } from './master/hooks/usePlatformStats'
import { useQuestionTypeSettings } from './master/hooks/useQuestionTypeSettings'

// ── Tab components ────────────────────────────────────────────────────────────
import { OverviewTab }    from './master/OverviewTab'
import { SessionsTab }    from './master/SessionsTab'
import { QuizzesTab }     from './master/QuizzesTab'
import { EngagementTab }  from './master/EngagementTab'
import { CreatorsTab }    from './master/CreatorsTab'
import { UsersTab }       from './master/UsersTab'
import { QuestionTypesTab } from './master/QuestionTypesTab'

const BASE = import.meta.env.VITE_MASTER_PATH as string ?? '/admin-portal'

const TABS: { id: MasterTab; label: string; path: string }[] = [
  { id: 'overview',   label: '🏠 Overview',   path: 'dashboard' },
  { id: 'sessions',   label: '🎮 Sessions',   path: 'sessions' },
  { id: 'quizzes',    label: '📋 Content',    path: 'content' },
  { id: 'engagement', label: '📊 Engagement', path: 'engagement' },
  { id: 'questionTypes', label: '🧩 Question Types', path: 'question-types' },
  { id: 'creators',   label: '👤 Creators',   path: 'creators' },
  { id: 'users',      label: '👥 Users',      path: 'users' },
]

export function MasterAdminPage() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const dark = useTheme() === 'dark'

  // Derive active tab from the last URL segment: /admin-portal/users → 'users'
  const lastSegment = pathname.split('/').at(-1) ?? ''
  const activeTab = TABS.find(t => t.path === lastSegment)?.id ?? 'overview'

  // Redirect bare /admin-portal → /admin-portal/dashboard
  useEffect(() => {
    if (pathname === BASE || pathname === BASE + '/') {
      navigate(`${BASE}/dashboard`, { replace: true })
    }
  }, [pathname, navigate])

  // Each hook owns its own data fetching, subscriptions, and pagination.
  // To remove a section, delete the hook call and the matching tab entry above.
  const sessions     = useSessionsData()
  const quizzesData  = useQuizzesData()
  const usersData    = useUsersData()
  const platformStats = usePlatformStats()
  const questionTypeSettings = useQuestionTypeSettings()

  // Derived aggregates for Overview
  const totalPlays   = quizzesData.quizzes.reduce((s, q) => s + (q.totalPlays   || 0), 0)
  const totalPlayers = quizzesData.quizzes.reduce((s, q) => s + (q.totalPlayers || 0), 0)
  const totalShares  = quizzesData.quizzes.reduce((s, q) => s + (q.shareCount   || 0), 0)

  // Derived creator groups for CreatorsTab
  const creatorMap = quizzesData.quizzes.reduce<Record<string, {
    ownerId: string
    quizzes: typeof quizzesData.quizzes
    totalPlays: number; totalPlayers: number; totalShares: number
  }>>((acc, q) => {
    if (!acc[q.ownerId]) acc[q.ownerId] = { ownerId: q.ownerId, quizzes: [], totalPlays: 0, totalPlayers: 0, totalShares: 0 }
    acc[q.ownerId].quizzes.push(q)
    acc[q.ownerId].totalPlays   += q.totalPlays   || 0
    acc[q.ownerId].totalPlayers += q.totalPlayers || 0
    acc[q.ownerId].totalShares  += q.shareCount   || 0
    return acc
  }, {})
  const creators = Object.values(creatorMap).sort((a, b) => b.totalPlays - a.totalPlays)

  return (
    <>
      <header className="master-header">
        <div className="master-header-top">
          <h1>👑 Master Admin</h1>
          <button className="master-signout-btn" onClick={() => { markSignOut(); void signOut(auth) }}>Sign Out</button>
        </div>
        <nav className="master-tab-bar">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`master-tab-btn${activeTab === t.id ? ' active' : ''}`}
              onClick={() => navigate(`${BASE}/${t.path}`)}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="master-content">
        {activeTab === 'overview'   && <OverviewTab   quizzes={quizzesData.quizzes} totalPlays={totalPlays} totalPlayers={totalPlayers} totalShares={totalShares} />}
        {activeTab === 'sessions'   && <SessionsTab   sessions={sessions.sessions}   hasMore={sessions.hasMore}    loadingMore={sessions.loadingMore}    onLoadMore={sessions.loadMore} />}
        {activeTab === 'quizzes'    && <QuizzesTab    quizzes={quizzesData.quizzes}  hasMore={quizzesData.hasMore} loadingMore={quizzesData.loadingMore} onLoadMore={quizzesData.loadMore} />}
        {activeTab === 'engagement' && <EngagementTab platformStats={platformStats} />}
        {activeTab === 'questionTypes' && (
          <QuestionTypesTab
            enabledQuestionTypeIds={questionTypeSettings.enabledQuestionTypeIds}
            titlesByType={questionTypeSettings.titlesByType}
            accessByType={questionTypeSettings.accessByType}
            updatedAt={questionTypeSettings.updatedAt}
            onSave={(nextEnabled, nextTitlesByType, nextAccessByType) => questionTypeSettings.save(nextEnabled, nextTitlesByType, nextAccessByType, auth.currentUser?.uid)}
          />
        )}
        {activeTab === 'creators'   && <CreatorsTab   creators={creators} users={usersData.users} />}
        {activeTab === 'users'      && <UsersTab      users={usersData.users} quizzes={quizzesData.quizzes} dark={dark} hasMore={usersData.hasMore} loadingMore={usersData.loadingMore} onLoadMore={usersData.loadMore} error={usersData.error} />}
      </main>
    </>
  )
}

