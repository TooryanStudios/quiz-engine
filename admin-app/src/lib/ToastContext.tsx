import { createContext, useContext, useRef, useState, type ReactNode } from 'react'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastOptions {
  message: string
  type?: ToastType
  durationMs?: number
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

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null)
  const timeoutRef = useRef<number | null>(null)
  const fadeTimeoutRef = useRef<number | null>(null)

  const showToast = (options: ToastOptions) => {
    const id = Date.now()
    
    // Clear existing timeouts
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
    if (fadeTimeoutRef.current) window.clearTimeout(fadeTimeoutRef.current)

    const duration = options.durationMs !== undefined ? options.durationMs : 4000

    setToast({
      id,
      message: options.message,
      type: options.type || 'info',
      durationMs: duration,
      isVisible: true
    })

    // Start fade out before removing
    timeoutRef.current = window.setTimeout(() => {
      setToast(prev => prev?.id === id ? { ...prev, isVisible: false } : prev)
      
      fadeTimeoutRef.current = window.setTimeout(() => {
        setToast(current => current?.id === id ? null : current)
      }, 400) // Match CSS transition duration
    }, duration)
  }

  const hideToast = () => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current)
    if (fadeTimeoutRef.current) window.clearTimeout(fadeTimeoutRef.current)
    
    setToast(prev => prev ? { ...prev, isVisible: false } : null)
    
    fadeTimeoutRef.current = window.setTimeout(() => {
      setToast(null)
    }, 400)
  }

  return (
    <ToastContext.Provider value={{ showToast, hideToast }}>
      {children}
      <ToastView toast={toast} />
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

function ToastView({ toast }: { toast: ToastState | null }) {
  if (!toast) return null

  const getStyles = () => {
    switch (toast.type) {
      case 'success':
        return {
          bg: 'linear-gradient(135deg, #059669 0%, #10b981 100%)',
          border: '#34d399',
          icon: '?',
          shadow: 'rgba(16, 185, 129, 0.4)'
        }
      case 'error':
        return {
          bg: 'linear-gradient(135deg, #dc2626 0%, #ef4444 100%)',
          border: '#f87171',
          icon: '?',
          shadow: 'rgba(239, 68, 68, 0.4)'
        }
      case 'warning':
        return {
          bg: 'linear-gradient(135deg, #d97706 0%, #f59e0b 100%)',
          border: '#fbbf24',
          icon: '?',
          shadow: 'rgba(245, 158, 11, 0.4)'
        }
      default:
        return {
          bg: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
          border: '#60a5fa',
          icon: '?',
          shadow: 'rgba(59, 130, 246, 0.4)'
        }
    }
  }

  const { bg, border, icon, shadow } = getStyles()

  return (
    <>
      <style>{`
        .toast-container {
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: 10000;
          display: flex;
          flex-direction: column;
          gap: 8px;
          pointer-events: none;
        }

        .toast-card {
          background: ${bg};
          color: white;
          padding: 12px 20px;
          border-radius: 12px;
          box-shadow: 0 10px 25px -5px ${shadow};
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 280px;
          max-width: 450px;
          border: 1px solid ${border};
          pointer-events: auto;
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          backdrop-filter: blur(10px);
        }

        .toast-card.entering {
          animation: toastSlideIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) forwards;
        }

        .toast-card.exiting {
          animation: toastSlideOut 0.4s ease-in forwards;
        }

        .toast-icon {
          width: 24px;
          height: 24px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 14px;
          flex-shrink: 0;
        }

        .toast-message {
          font-family: inherit;
          font-size: 14px;
          font-weight: 500;
          line-height: 1.4;
        }

        .toast-progress {
          position: absolute;
          bottom: 0;
          left: 0;
          height: 3px;
          background: rgba(255, 255, 255, 0.4);
          border-radius: 0 0 0 12px;
          animation: toastProgress linear forwards;
        }

        @keyframes toastSlideIn {
          from { transform: translateX(120%) scale(0.9); opacity: 0; }
          to { transform: translateX(0) scale(1); opacity: 1; }
        }

        @keyframes toastSlideOut {
          from { transform: translateX(0) opacity: 1; }
          to { transform: translateX(120%) opacity: 0; }
        }

        @keyframes toastProgress {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
      <div className="toast-container">
        <div 
          className={`toast-card ${toast.isVisible ? 'entering' : 'exiting'}`}
          role="status"
          aria-live="polite"
        >
          <div className="toast-icon">{icon}</div>
          <div className="toast-message">{toast.message}</div>
          {toast.isVisible && (
            <div 
              className="toast-progress" 
              style={{ animationDuration: `${toast.durationMs}ms` }} 
            />
          )}
        </div>
      </div>
    </>
  )
}
