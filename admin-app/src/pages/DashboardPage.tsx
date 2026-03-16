import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import './DashboardPage.css'
import { auth } from '../lib/firebase'
import { incrementQuizPlayCount, listFeaturedQuizzes, listPublicQuizzes, subscribeMyQuizzes } from '../lib/quizRepo'
import { getBestCoverImage } from '../lib/utils'
import { incrementPlatformStat } from '../lib/adminRepo'
import { guardedLaunchGame } from '../lib/gameLaunch'
import { buildHostGameUrl } from '../lib/gameModeUrl'
import { getHostLaunchAuthParams } from '../lib/hostLaunchAuth'
import type { QuizDoc } from '../types/quiz'
import { useToast } from '../lib/ToastContext'
import { useSubscription } from '../lib/useSubscription'
import { useDialog } from '../lib/DialogContext'
import { useUserPrefs } from '../lib/UserPrefsContext'

type QuizItem = QuizDoc & { id: string }

const IS_LOCAL_DEV = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname)
const SERVER_BASE = IS_LOCAL_DEV
  ? (import.meta.env.VITE_LOCAL_GAME_URL || 'http://localhost:3001')
  : (import.meta.env.VITE_API_BASE_URL || 'https://play.qyan.app')

export function DashboardPage() {
  const [myQuizzes, setMyQuizzes] = useState<QuizItem[]>([])
  const [publicLibrary, setPublicLibrary] = useState<QuizItem[]>([])
  const [featuredLibrary, setFeaturedLibrary] = useState<QuizItem[]>([])
  const [loading, setLoading] = useState(true)
  const [publicLoading, setPublicLoading] = useState(true)
  const [visibleCount, setVisibleCount] = useState(6)

  const { showToast } = useToast()
  const { show: showDialog } = useDialog()
  const { isSubscribed } = useSubscription()
  const { language } = useUserPrefs()
  const isAr = language === 'ar'
  const isGuest = !auth.currentUser
  const displayName = auth.currentUser?.displayName?.trim()
  const fallbackName = auth.currentUser?.email?.split('@')[0] || ''
  const signedInName = isGuest ? '' : (displayName && displayName.length > 0 ? displayName : fallbackName)
  const greetingNameSuffix = signedInName ? ` ${signedInName}` : ''
  const currentHour = new Date().getHours()
  const isMorning = currentHour < 12
  const isAfternoon = currentHour >= 12 && currentHour < 18
  const timeGreeting = isAr
    ? `${isMorning ? 'صباح الخير' : 'مساء الخير'}${greetingNameSuffix}`
    : `${isMorning ? 'Good morning' : isAfternoon ? 'Good afternoon' : 'Good evening'}${greetingNameSuffix}`

  const t = {
    introBadge: isAr ? '' : 'An Omani Mini-Games Learning Platform',
    introTitle: isAr ? 'مرحباً بك في QYan' : 'Welcome to QYan',
    introBody: isAr
      ? 'هذه منصة تعليمية عُمانية للألعاب المصغرة والمسابقات التفاعلية. اللعب مجاني وآمن ولا يحتاج أي تسجيل.'
      : 'This is an Omani platform for mini-games and interactive competitions. Playing is free, secure, and does not require registration.',
    introHint: isAr
      ? 'لإنشاء إختبارات أو مسابقات يرجى تسجيل الدخول.'
      : 'To create challenges or interactive competitions, please sign in.',
    actionsTitle: isAr ? 'ابدأ الآن' : 'Start Now',
    topFeatured: isAr ? 'المحتوى المميز حالياً 🔥' : 'Currently Featured Content 🔥',
    moreGames: isAr ? 'ألعاب أكثر' : 'More Games',
    availableGames: isAr ? 'الألعاب المتاحة' : 'Available Games',
    playNow: isAr ? 'العب الآن' : 'Play Now',
    browseAll: isAr ? 'تصفح المكتبة' : 'Browse Library',
    createMiniGame: isAr ? 'إنشاء لعبة أو اختبار' : 'Create Game Or Challenge',
    noGames: isAr ? 'لا توجد ألعاب متاحة بعد.' : 'No games available yet.',
    createFirst: isAr ? 'أنشئ أول لعبة صغيرة للبدء.' : 'Create your first mini-game to begin.',
    noFeatured: isAr ? 'لم يتم اختيار محتوى مميز بعد.' : 'No featured content has been selected yet.',
    miniGameLabel: isAr ? 'لعبة مصغرة' : 'Mini Game',
    quizGameLabel: isAr ? 'لعبة اختبار' : 'Challenge Game',
    loadMore: isAr ? 'تحميل المزيد' : 'Load More',
    exploreMore: isAr ? 'استكشاف المزيد' : 'Explore More',
    subscriptionTitle: isAr ? 'اشتراك مطلوب' : 'Subscription Required',
    subscriptionBody: isAr ? 'هذا الاختبار محتوى مميز. يرجى ترقية حسابك لبدء التشغيل.' : 'This challenge is premium content. Please upgrade your account to launch it.',
    upgradeNow: isAr ? 'ترقية الآن' : 'Upgrade now',
    cancel: isAr ? 'إلغاء' : 'Cancel',
    serverUnavailable: isAr ? 'خادم اللعبة غير متوفر مؤقتاً. يرجى المحاولة بعد قليل.' : 'Game server is temporarily unavailable. Please try again in a moment.',
    popupBlocked: isAr ? 'تم حظر النافذة المنبثقة. يرجى السماح بالنوافذ المنبثقة ثم المحاولة مرة أخرى.' : 'Popup was blocked. Please allow popups and try again.',
  }

  useEffect(() => {
    listPublicQuizzes()
      .then((list) => {
        const toMs = (ts: any) => ts?.toMillis?.() ?? (ts?.seconds ? ts.seconds * 1000 : 0)
        const sorted = [...list].sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt))
        setPublicLibrary(sorted as QuizItem[])
      })
      .catch(() => setPublicLibrary([]))
      .finally(() => setPublicLoading(false))
  }, [])

  useEffect(() => {
    listFeaturedQuizzes()
      .then((list) => setFeaturedLibrary(list as QuizItem[]))
      .catch(() => setFeaturedLibrary([]))
  }, [])

  useEffect(() => {
    const uid = auth.currentUser?.uid
    if (!uid) {
      setLoading(false)
      return
    }

    const unsub = subscribeMyQuizzes(
      uid,
      (list) => {
        const toMs = (ts: any) => ts?.toMillis?.() ?? (ts?.seconds ? ts.seconds * 1000 : 0)
        const sorted = [...list].sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt))
        setMyQuizzes(sorted as QuizItem[])
        setLoading(false)
      },
      () => setLoading(false),
    )

    return unsub
  }, [])

  function requiresSubscription(quiz: QuizItem) {
    return quiz.priceTier === 'starter' || quiz.priceTier === 'pro'
  }

  async function handleLaunchGame(quiz: QuizItem) {
    if (requiresSubscription(quiz) && !isSubscribed) {
      showDialog({
        title: t.subscriptionTitle,
        message: t.subscriptionBody,
        confirmText: t.upgradeNow,
        cancelText: t.cancel,
        onConfirm: () => {
          window.location.assign('/billing')
        },
      })
      return
    }

    const preOpenedTab = window.open('', '_blank')

    const authParams = await getHostLaunchAuthParams({
      serverBase: SERVER_BASE,
      currentUser: auth.currentUser,
    })

    const gameUrl = buildHostGameUrl({
      serverBase: SERVER_BASE,
      quizId: quiz.id,
      gameModeId: quiz.gameModeId,
      ...authParams,
    })

    await guardedLaunchGame({
      serverBase: SERVER_BASE,
      gameUrl,
      preOpenedTab,
      onUnavailable: () => {
        showToast({
          message: t.serverUnavailable,
          type: 'error',
        })
      },
      onPopupBlocked: () => {
        showToast({
          message: t.popupBlocked,
          type: 'info',
        })
      },
      onLaunch: () => {
        void incrementPlatformStat('sessionHosted')
        void incrementQuizPlayCount(quiz.id)
      },
    })
  }

  const allGames = useMemo(() => {
    const merged = [...publicLibrary, ...myQuizzes]
    const seen = new Set<string>()
    const unique = merged.filter((quiz) => {
      if (seen.has(quiz.id)) return false
      seen.add(quiz.id)
      return true
    })

    return unique.sort((a, b) => {
      const playsA = a.totalPlays ?? 0
      const playsB = b.totalPlays ?? 0
      if (playsA !== playsB) return playsB - playsA
      const toMs = (ts: any) => ts?.toMillis?.() ?? (ts?.seconds ? ts.seconds * 1000 : 0)
      return toMs(b.createdAt) - toMs(a.createdAt)
    })
  }, [myQuizzes, publicLibrary])

  const featuredSorted = useMemo(() => {
    const toMs = (ts: any) => ts?.toMillis?.() ?? (ts?.seconds ? ts.seconds * 1000 : 0)
    return [...featuredLibrary].sort((a, b) => {
      const pa = a.featuredPriority ?? 100
      const pb = b.featuredPriority ?? 100
      if (pa !== pb) return pa - pb
      return toMs(b.updatedAt) - toMs(a.updatedAt)
    })
  }, [featuredLibrary])

  const topFeaturedGame = featuredSorted[0]
  const sideFeaturedGames = featuredSorted.slice(1, 3)
  const featuredIds = useMemo(
    () => new Set([topFeaturedGame, ...sideFeaturedGames].filter((q): q is QuizItem => Boolean(q)).map((q) => q.id)),
    [topFeaturedGame, sideFeaturedGames],
  )
  const remainingGames = useMemo(() => allGames.filter((q) => !featuredIds.has(q.id)), [allGames, featuredIds])
  const visibleGames = remainingGames.slice(0, visibleCount)
  const canLoadMore = visibleCount < remainingGames.length

  return (
    <div className="dashboard-container gameplay-first-dashboard">
      <section className="dashboard-intro-banner">
        {t.introBadge && <p className="dashboard-intro-badge">{t.introBadge}</p>}
        <h2 className="dashboard-intro-title">{t.introTitle}</h2>
        <p className="dashboard-intro-body">{t.introBody}</p>
        {isGuest && <p className="dashboard-intro-hint">{t.introHint}</p>}
      </section>

      <section className="gameplay-action-panel">
        <h3 className="gameplay-action-title">{timeGreeting}</h3>
        <p className="gameplay-action-subtitle">{t.actionsTitle}</p>
        <div className="gameplay-action-buttons">
          <Link to="/editor" className="dashboard-btn dashboard-btn-primary gameplay-action-btn">{t.createMiniGame}</Link>
          <Link to="/packs" className="dashboard-btn dashboard-btn-secondary gameplay-action-btn">{t.browseAll}</Link>
        </div>
      </section>

      {(loading || publicLoading || topFeaturedGame) && (
        <section className="dashboard-section gameplay-top-feature-wrap">
          <div className="dashboard-section-header gameplay-featured-header">
            <h3 className="dashboard-section-title">{t.topFeatured}</h3>
          </div>

          {(loading || publicLoading) && (
            <div className="gameplay-top-feature-shell">
              <div className="shimmer-card gameplay-top-feature-shimmer" />
            </div>
          )}

          {!loading && !publicLoading && topFeaturedGame && (() => {
            const coverImage = getBestCoverImage(topFeaturedGame.coverImage, topFeaturedGame.questions ?? [])

            return (
              <div className="gameplay-curated-layout">
                <article
                  className="gameplay-top-feature-card gameplay-top-feature-hero"
                  onClick={() => { void handleLaunchGame(topFeaturedGame) }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      void handleLaunchGame(topFeaturedGame)
                    }
                  }}
                >
                  <div
                    className="gameplay-top-feature-media"
                    style={coverImage ? { backgroundColor: '#0f172a', backgroundImage: `url("${coverImage}")` } : { backgroundColor: '#0f172a' }}
                  />
                  <div className="gameplay-featured-overlay" />
                  <div className="gameplay-top-feature-border" />
                  <div className="gameplay-top-feature-content">
                    <p className="gameplay-featured-tag">{topFeaturedGame.gameModeId ? t.miniGameLabel : t.quizGameLabel}</p>
                    <h4 className="gameplay-featured-title">{topFeaturedGame.title}</h4>
                    <button
                      className="gameplay-featured-play gameplay-featured-play-fire gameplay-featured-play-xl"
                      onClick={(event) => {
                        event.stopPropagation()
                        void handleLaunchGame(topFeaturedGame)
                      }}
                    >
                      {t.playNow}
                    </button>
                  </div>
                </article>

                <div className="gameplay-side-stack">
                  {sideFeaturedGames.map((quiz) => {
                    const sideCover = getBestCoverImage(quiz.coverImage, quiz.questions ?? [])
                    const sideFallback = '#0f172a'

                    return (
                      <article
                        key={quiz.id}
                        className="gameplay-featured-card gameplay-side-card"
                        onClick={() => { void handleLaunchGame(quiz) }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            void handleLaunchGame(quiz)
                          }
                        }}
                      >
                        <div
                          className="gameplay-featured-media"
                          style={sideCover ? { backgroundColor: sideFallback, backgroundImage: `url("${sideCover}")` } : { backgroundColor: sideFallback }}
                        />
                        <div className="gameplay-featured-overlay" />
                        <div className="gameplay-featured-content gameplay-featured-content-center">
                          <p className="gameplay-featured-tag">{quiz.gameModeId ? t.miniGameLabel : t.quizGameLabel}</p>
                          <h4 className="gameplay-featured-title">{quiz.title}</h4>
                          <button
                            className="gameplay-featured-play gameplay-featured-play-lg"
                            onClick={(event) => {
                              event.stopPropagation()
                              void handleLaunchGame(quiz)
                            }}
                          >
                            {t.playNow}
                          </button>
                        </div>
                      </article>
                    )
                  })}
                </div>
              </div>
            )
          })()}
        </section>
      )}

      {!loading && !publicLoading && allGames.length === 0 && (
        <div className="empty-state-container" style={{ margin: '2rem 0' }}>
          <h3 className="empty-state-title">{t.noGames}</h3>
          <p className="empty-state-desc">{t.createFirst}</p>
          <Link to="/mini-game-editor" className="dashboard-btn dashboard-btn-primary">{t.createMiniGame}</Link>
        </div>
      )}

      {!loading && !publicLoading && visibleGames.length > 0 && (
        <section className="dashboard-section gameplay-featured-wrap">
          <div className="dashboard-section-header gameplay-featured-header">
            <h3 className="dashboard-section-title">{topFeaturedGame ? t.moreGames : t.availableGames}</h3>
          </div>

          <div className="gameplay-featured-grid gameplay-vertical-grid">
              {visibleGames.map((quiz) => {
                const coverImage = getBestCoverImage(quiz.coverImage, quiz.questions ?? [])
                const fallbackGradient = '#0f172a'

                return (
                  <article
                    key={quiz.id}
                    className="gameplay-featured-card gameplay-regular-card"
                    onClick={() => { void handleLaunchGame(quiz) }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        void handleLaunchGame(quiz)
                      }
                    }}
                  >
                    <div
                      className="gameplay-featured-media"
                      style={coverImage ? { backgroundColor: fallbackGradient, backgroundImage: `url("${coverImage}")` } : { backgroundColor: fallbackGradient }}
                    />
                    <div className="gameplay-featured-overlay" />
                    <div className="gameplay-featured-content">
                      <p className="gameplay-featured-tag">{quiz.gameModeId ? t.miniGameLabel : t.quizGameLabel}</p>
                      <h4 className="gameplay-featured-title">{quiz.title}</h4>
                      <button
                        className="gameplay-featured-play gameplay-featured-play-lg"
                        onClick={(event) => {
                          event.stopPropagation()
                          void handleLaunchGame(quiz)
                        }}
                      >
                        {t.playNow}
                      </button>
                    </div>
                  </article>
                )
              })}
            </div>

          {remainingGames.length > 0 && (
            <div className="gameplay-more-actions">
              {canLoadMore ? (
                <button
                  className="dashboard-btn dashboard-btn-secondary gameplay-load-more"
                  onClick={() => setVisibleCount((prev) => prev + 6)}
                >
                  {t.loadMore}
                </button>
              ) : (
                <Link to="/packs" className="dashboard-btn dashboard-btn-primary gameplay-load-more-link">
                  {t.exploreMore}
                </Link>
              )}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
