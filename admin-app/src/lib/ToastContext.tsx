import { createContext, useContext, useRef, useState, type ReactNode } from 'react'

type ToastType = 'success' | 'error' | 'info'

interface ToastOptions {
  message: string
  type?: ToastType
  durationMs?: number
}

interface ToastState extends ToastOptions {
  id: number
}

interface ToastContextType {
  showToast: (options: ToastOptions) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null)
  const timeoutRef = useRef<number | null>(null)

  const showToast = (options: ToastOptions) => {
    const id = Date.now()
    const nextToast: ToastState = {
      id,
      message: options.message,
      type: options.type || 'info',
      durationMs: options.durationMs || 2500,
    }
    setToast(nextToast)

    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current)
    }
    timeoutRef.current = window.setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current))
    }, nextToast.durationMs)
  }

  return (
    <ToastContext.Provider value={{ showToast }}>
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

  const bg =
    toast.type === 'success' ? '#1a4a2e' :
    toast.type === 'error' ? '#4a1a1a' : '#1a3a5c'

  const border =
    toast.type === 'success' ? '#2a6a3e' :
    toast.type === 'error' ? '#6a2a2a' : '#2a5a8c'

  const color =
    toast.type === 'success' ? '#6f6' :
    toast.type === 'error' ? '#f88' : '#7ac'

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        backgroundColor: bg,
        border: `1px solid ${border}`,
        color,
        padding: '0.75rem 1.25rem',
        borderRadius: '8px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.55)',
        zIndex: 10000,
        maxWidth: '80vw',
        textAlign: 'center',
        animation: 'toastFadeIn 0.2s ease-out',
      }}
    >
      {toast.message}
      <style>{`
        @keyframes toastFadeIn {
          from { opacity: 0; transform: translate(-50%, -46%); }
          to { opacity: 1; transform: translate(-50%, -50%); }
        }
      `}</style>
    </div>
  )
}
