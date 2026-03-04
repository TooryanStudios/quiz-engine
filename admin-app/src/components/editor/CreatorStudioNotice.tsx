export function CreatorStudioNotice() {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>
        إعدادات Creator Studio
      </label>
      <div style={{
        padding: '0.75rem 0.9rem',
        borderRadius: '10px',
        border: '1px solid var(--border-strong)',
        backgroundColor: 'var(--bg-deep)',
        color: 'var(--text-mid)',
        fontSize: '0.88rem',
      }}>
        هذا الوضع يدعم جولات الرسم فقط. يتم تشغيل النص المكتوب في السؤال كـ prompt رسم مباشر.
      </div>
      <p style={{ marginTop: '0.45rem', marginBottom: 0, fontSize: '0.76rem', color: 'var(--text-mid)' }}>
        هذه الإعدادات خاصة بوضع Creator Studio وتُستخدم مباشرة في تشغيل الجولة.
      </p>
    </div>
  )
}
