import '../communication.css'

interface ChatDockProps {
  open: boolean
  isAr: boolean
  onClose: () => void
  onOpenMessagesPage: () => void
  showOpenPageButton?: boolean
}

export function ChatDock({
  open,
  isAr,
  onClose,
  onOpenMessagesPage,
  showOpenPageButton = true,
}: ChatDockProps) {
  if (!open) return null

  return (
    <>
      <button
        type="button"
        aria-label={isAr ? 'إغلاق المحادثة' : 'Close chat'}
        className="shell-chat-dock-overlay"
        onClick={onClose}
      />

      <aside className="shell-chat-dock" role="dialog" aria-label={isAr ? 'لوحة المحادثة' : 'Chat panel'}>
        <header className="shell-chat-dock-header">
          <div>
            <h3>{isAr ? 'المحادثات' : 'Messages'}</h3>
            <p>{isAr ? 'الوصول السريع بدون مقاطعة سير العمل' : 'Quick access without blocking your workflow'}</p>
          </div>
          <button type="button" className="shell-chat-dock-close" onClick={onClose} aria-label={isAr ? 'إغلاق' : 'Close'}>
            ✕
          </button>
        </header>

        <div className="shell-chat-dock-body">
          <article className="shell-chat-card">
            <strong>{isAr ? 'الرسائل المباشرة' : 'Direct messages'}</strong>
            <p>
              {isAr
                ? 'ابدأ محادثة سريعة مع أحد أعضاء الفريق دون فتح نافذة منبثقة.'
                : 'Start a focused one-to-one conversation without jumping across screens.'}
            </p>
          </article>

          <article className="shell-chat-card">
            <strong>{isAr ? 'قنوات العمليات' : 'Operations channels'}</strong>
            <p>
              {isAr
                ? 'أنشئ قنوات للفِرق أو للأقسام وتابع القرارات من مكان واحد.'
                : 'Group updates by team or function and keep context in one stream.'}
            </p>
          </article>

          <article className="shell-chat-card">
            <strong>{isAr ? 'التحويل إلى مهمة' : 'Turn messages into tasks'}</strong>
            <p>
              {isAr
                ? 'حوّل الرسائل المهمة إلى مهام مباشرة حتى لا تضيع القرارات التنفيذية.'
                : 'Convert key messages into actionable tasks to keep execution accountable.'}
            </p>
          </article>
        </div>

        {showOpenPageButton ? (
          <footer className="shell-chat-dock-footer">
            <button
              type="button"
              onClick={() => {
                onClose()
                onOpenMessagesPage()
              }}
            >
              {isAr ? 'فتح صفحة الرسائل الكاملة' : 'Open Full Messages Page'}
            </button>
          </footer>
        ) : null}
      </aside>
    </>
  )
}
