import { useDialog } from '../lib/DialogContext'
import { useEffect, useState } from 'react'

export function Dialog() {
  const { dialog, hide, isOpen } = useDialog()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!isOpen) {
      setLoading(false)
    }
  }, [isOpen])

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await dialog?.onConfirm()
    } finally {
      setLoading(false)
      hide()
    }
  }

  const handleCancel = () => {
    dialog?.onCancel?.()
    hide()
  }

  if (!isOpen || !dialog) return null

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          animation: 'fadeIn 0.2s ease-in-out',
        }}
        onClick={handleCancel}
      >
        {/* Dialog Box */}
        <div
          style={{
            backgroundColor: 'var(--bg-surface)',
            borderRadius: '16px',
            border: '1px solid var(--border-strong)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            minWidth: '320px',
            maxWidth: '500px',
            padding: '1.5rem',
            animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <h2
            style={{
              marginTop: 0,
              marginBottom: '1rem',
              fontSize: '1.25em',
              color: 'var(--text-bright)',
              fontWeight: 800,
            }}
          >
            {dialog.title}
          </h2>

          {/* Message */}
          <div
            style={{
              marginTop: 0,
              marginBottom: '1.5rem',
              lineHeight: '1.5',
              color: 'var(--text-mid)',
            }}
          >
            {dialog.message}
          </div>

          {/* Actions */}
          <div
            style={{
              display: 'flex',
              gap: '0.75rem',
              justifyContent: 'flex-end',
            }}
          >
            <button
              onClick={handleCancel}
              disabled={loading}
              style={{
                padding: '0.6rem 1.2rem',
                borderRadius: '10px',
                border: '1px solid var(--border-strong)',
                backgroundColor: 'rgba(255,255,255,0.05)',
                color: 'var(--text)',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                fontSize: '0.95em',
                fontWeight: 600,
                transition: 'all 0.2s',
              }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.1)')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)')}
            >
              {dialog.cancelText || 'إلغاء'}
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              style={{
                padding: '0.6rem 1.2rem',
                borderRadius: '10px',
                border: 'none',
                backgroundColor: dialog.isDangerous ? '#ef4444' : 'var(--accent)',
                color: '#fff',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                fontSize: '0.95em',
                fontWeight: 700,
                transition: 'all 0.2s',
                boxShadow: dialog.isDangerous ? '0 4px 12px rgba(239, 68, 68, 0.2)' : '0 4px 12px rgba(124, 58, 237, 0.2)',
              }}
              onMouseEnter={(e) =>
                !loading && (e.currentTarget.style.transform = 'translateY(-1px)')
              }
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'translateY(0)')}
            >
              {loading ? '⏳ ...' : dialog.confirmText || 'موافق'}
            </button>
          </div>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </>
  )
}
