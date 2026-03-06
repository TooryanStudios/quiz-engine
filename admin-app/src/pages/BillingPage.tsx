import { Link } from 'react-router-dom'
import { useSubscription } from '../lib/useSubscription'
import { useUserPrefs } from '../lib/UserPrefsContext'

export function BillingPage() {
  const { creditsRemaining, plan, loading } = useSubscription()
  const { language } = useUserPrefs()
  const isAr = language === 'ar'

  const t = {
    title: isAr ? 'الفواتير والرصيد' : 'Billing & Credits',
    subtitle: isAr
      ? 'يستخدم هذا التطبيق رصيد الذكاء الاصطناعي للميزات المدفوعة. يحصل المستخدمون الجدد على رصيد تجريبي مجاني بسيط.'
      : 'This app uses AI credits for paid AI features. New users get a small free trial credit wallet.',
    currentPlan: isAr ? 'الخطة الحالية' : 'Current plan',
    loadingStr: isAr ? 'جاري التحميل…' : 'Loading…',
    aiCredits: isAr ? 'رصيد الذكاء الاصطناعي المتبقي' : 'AI credits remaining',
    howUpgradesWork: isAr ? 'كيف تعمل الترقيات (مؤقت)' : 'How upgrades work (temporary)',
    upgradesDesc: isAr
      ? 'المدفوعات ليست آلية بعد. للترقية بعد استخدام رصيدك المجاني، يرجى الاتصال بالدعم الفني للحصول على تفاصيل التحويل البنكي. بعد إكمال التحويل، سنقوم يدويًا بتفعيل اشتراكك و/أو إضافة رصيد لحسابك.'
      : 'Payments are not automated yet. To upgrade after using your free credits, please contact support to receive bank transfer details. After you complete the transfer, we manually activate your subscription and/or add credits to your account.',
    backDashboard: isAr ? 'العودة للوحة التحكم' : 'Back to Dashboard',
    browsePacks: isAr ? 'تصفح الحزم' : 'Browse Packs',
    freePlan: isAr ? 'مجاني' : 'free',
  }

  return (
    <section className="panel" style={{ maxWidth: 920, margin: '0 auto' }}>
      <h2 style={{ marginTop: 0, marginBottom: '0.5rem' }}>{t.title}</h2>
      <p style={{ marginTop: 0, color: 'var(--text-mid)' }}>
        {t.subtitle}
      </p>

      <div style={{ display: 'grid', gap: '0.75rem', marginTop: '1rem' }}>
        <div style={{ display: 'grid', gap: 6, padding: '0.9rem', border: '1px solid var(--border)', borderRadius: 12, background: 'var(--bg-elevated)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontWeight: 800 }}>{t.currentPlan}</div>
              <div style={{ color: 'var(--text-mid)' }}>{loading ? t.loadingStr : (plan || t.freePlan)}</div>
            </div>
            <div>
              <div style={{ fontWeight: 800 }}>{t.aiCredits}</div>
              <div style={{ color: 'var(--text-mid)' }}>{loading ? t.loadingStr : (creditsRemaining ?? 0)}</div>
            </div>
          </div>
        </div>

        <div style={{ padding: '0.9rem', border: '1px solid var(--border)', borderRadius: 12, background: 'var(--bg-surface)' }}>
          <div style={{ fontWeight: 800, marginBottom: 6 }}>{t.howUpgradesWork}</div>
          <div style={{ color: 'var(--text-mid)', lineHeight: 1.6 }}>
            {t.upgradesDesc}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Link to="/" className="btn btn-secondary">{t.backDashboard}</Link>
          <Link to="/packs" className="btn">{t.browsePacks}</Link>
        </div>
      </div>
    </section>
  )
}
