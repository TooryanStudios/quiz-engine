import { createContext, useContext, useRef, useState, type ReactNode } from 'react'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastOptions {
  message: string
  type?: ToastType
  durationMs?: number
  actionLabel?: string
  onAction?: () => void
  /** Chat-style compact display */
  senderName?: string
  senderAvatar?: string
  messagePreview?: string
}

interface ToastState extends ToastOptions {
  id: number
  isVisible: boolean
}

interface ToastContextType {
  showToast: (options: ToastOptions) => void
  hideToast: () => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

const MAX_TOASTS = 5

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastState[]>([])
  const timersRef = useRef<Map<number, { main: number; fade: number }>>(new Map())
  const toastIdRef = useRef<number>(Date.now())

  const clearTimers = (id: number) => {
    const t = timersRef.current.get(id)
    if (t) {
      window.clearTimeout(t.main)
      window.clearTimeout(t.fade)
      timersRef.current.delete(id)
    }
  }

  const removeToast = (id: number) => {
    clearTimers(id)
    setToasts((prev) => prev.map((t) => t.id === id ? { ...t, isVisible: false } : t))
    const fade = window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 400)
    timersRef.current.set(id, { main: 0, fade })
  }

  const showToast = (options: ToastOptions) => {
    toastIdRef.current += 1
    const id = toastIdRef.current
    const duration = options.durationMs ?? 6000

    setToasts((prev) => {
      const next = [...prev, {
        id,
        message: options.message,
        type: options.type || 'info',
        durationMs: duration,
        isVisible: true,
        actionLabel: options.actionLabel,
        onAction: options.onAction,
        senderName: options.senderName,
        senderAvatar: options.senderAvatar,
        messagePreview: options.messagePreview,
      }]
      // Evict oldest if over cap
      if (next.length > MAX_TOASTS) {
        const evict = next[0]
        clearTimers(evict.id)
        return next.slice(1)
      }
      return next
    })

    const main = window.setTimeout(() => removeToast(id), duration)
    timersRef.current.set(id, { main, fade: 0 })
  }

  const hideToast = () => {
    // Hide the oldest visible toast
    setToasts((prev) => {
      if (prev.length === 0) return prev
      const oldest = prev[0]
      removeToast(oldest.id)
      return prev
    })
  }

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <ToastView toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within ToastProvider')
  return context
}

function getTypeTheme(type: ToastType) {
  switch (type) {
    case 'success': return { accent: '#059669', border: '#34d399', icon: '✓' }
    case 'error':   return { accent: '#dc2626', border: '#f87171', icon: '✕' }
    case 'warning': return { accent: '#d97706', border: '#fbbf24', icon: '!' }
    default:        return { accent: '#1e40af', border: '#93c5fd', icon: '💬' }
  }
}

function ToastView({ toasts, onDismiss }: { toasts: ToastState[]; onDismiss: (id: number) => void }) {
  if (toasts.length === 0) return null

  return (
    <>
      <style>{`
        .toast-stack {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 10000;
          display: flex;
          flex-direction: column;
          gap: 8px;
          pointer-events: none;
          align-items: flex-end;
        }

        .toast-card {
          background: #fff;
          color: #111827;
          border-radius: 10px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.13), 0 1px 4px rgba(0,0,0,0.07);
          min-width: 280px;
          max-width: 360px;
          width: 360px;
          pointer-events: auto;
          overflow: hidden;
          border: 1px solid #e5e7eb;
          opacity: 1;
          transform: translateX(0);
          transition: opacity 0.35s ease, transform 0.35s ease;
          position: relative;
        }

        .toast-card.is-actionable {
          cursor: pointer;
        }

        .toast-card.exiting {
          opacity: 0;
          transform: translateX(28px);
        }

        @keyframes toastIn {
          from { opacity: 0; transform: translateX(32px); }
          to   { opacity: 1; transform: translateX(0); }
        }

        .toast-card.entering {
          animation: toastIn 0.3s cubic-bezier(0.22, 1, 0.36, 1) forwards;
        }

        .toast-accent-bar {
          height: 3px;
          width: 100%;
        }

        .toast-body {
          padding: 10px 12px 10px 12px;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        /* Chat-style row 1: avatar + name + dismiss */
        .toast-from-row {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .toast-avatar {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          background: #d1d5db;
          flex-shrink: 0;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          color: #374151;
        }

        .toast-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .toast-sender-name {
          font-size: 12px;
          font-weight: 700;
          color: #111827;
          flex: 1;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .toast-dismiss {
          background: none;
          border: none;
          color: #9ca3af;
          font-size: 13px;
          cursor: pointer;
          padding: 0 2px;
          line-height: 1;
          flex-shrink: 0;
        }
        .toast-dismiss:hover { color: #374151; }

        /* Row 2: message preview */
        .toast-preview {
          font-size: 12px;
          color: #4b5563;
          line-height: 1.45;
          padding-left: 29px; /* align under name, past avatar */
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        /* Fallback non-chat toast */
        .toast-generic-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .toast-icon-circle {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 700;
          flex-shrink: 0;
          color: #fff;
        }

        .toast-message {
          font-size: 13px;
          font-weight: 500;
          color: #111827;
          flex: 1;
          line-height: 1.4;
        }

        /* Action row */
        .toast-action-row {
          padding: 0 12px 9px 12px;
          display: flex;
          justify-content: flex-end;
          gap: 6px;
        }

        .toast-action {
          font-size: 11px;
          font-weight: 700;
          border-radius: 999px;
          padding: 4px 10px;
          cursor: pointer;
          border: 1px solid currentColor;
          background: transparent;
          line-height: 1.4;
        }

        /* Progress bar */
        .toast-progress {
          position: absolute;
          bottom: 0;
          left: 0;
          height: 2px;
          background: #d1d5db;
          animation: toastProgress linear forwards;
        }

        @keyframes toastProgress {
          from { width: 100%; }
          to   { width: 0%; }
        }
      `}</style>
      <div className="toast-stack">
        {toasts.map((toast) => {
          const theme = getTypeTheme(toast.type || 'info')
          const isChat = !!toast.senderName
          return (
            <div
              key={toast.id}
              className={`toast-card ${toast.isVisible ? 'entering' : 'exiting'}${toast.onAction ? ' is-actionable' : ''}`}
              role="status"
              aria-live="polite"
              tabIndex={toast.onAction ? 0 : -1}
              onClick={() => {
                if (!toast.onAction) return
                onDismiss(toast.id)
                toast.onAction()
              }}
              onKeyDown={(event) => {
                if (!toast.onAction) return
                if (event.key !== 'Enter' && event.key !== ' ') return
                event.preventDefault()
                onDismiss(toast.id)
                toast.onAction()
              }}
            >
              <div className="toast-accent-bar" style={{ background: theme.accent }} />
              <div className="toast-body">
                {isChat ? (
                  <>
                    <div className="toast-from-row">
                      <div className="toast-avatar">
                        {toast.senderAvatar
                          ? <img src={toast.senderAvatar} alt="" />
                          : (toast.senderName || '?').charAt(0).toUpperCase()
                        }
                      </div>
                      <span className="toast-sender-name">{toast.senderName}</span>
                      <button
                        type="button"
                        className="toast-dismiss"
                        aria-label="Dismiss"
                        onClick={(event) => {
                          event.stopPropagation()
                          onDismiss(toast.id)
                        }}
                      >✕</button>
                    </div>
                    <p className="toast-preview">{toast.messagePreview || toast.message}</p>
                  </>
                ) : (
                  <div className="toast-generic-row">
                    <div className="toast-icon-circle" style={{ background: theme.accent }}>{theme.icon}</div>
                    <span className="toast-message">{toast.message}</span>
                    <button
                      type="button"
                      className="toast-dismiss"
                      aria-label="Dismiss"
                      onClick={(event) => {
                        event.stopPropagation()
                        onDismiss(toast.id)
                      }}
                    >✕</button>
                  </div>
                )}
              </div>
              {(toast.actionLabel && toast.onAction) && (
                <div className="toast-action-row">
                  <button
                    type="button"
                    className="toast-action"
                    style={{ color: theme.accent, borderColor: theme.accent }}
                    onClick={(event) => {
                      event.stopPropagation()
                      onDismiss(toast.id)
                      toast.onAction?.()
                    }}
                  >
                    {toast.actionLabel}
                  </button>
                </div>
              )}
              {toast.isVisible && (
                <div
                  className="toast-progress"
                  style={{ animationDuration: `${toast.durationMs}ms`, background: theme.accent, opacity: 0.25 }}
                />
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
