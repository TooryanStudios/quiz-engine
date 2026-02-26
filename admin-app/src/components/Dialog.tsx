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
          zIndex: 9999,
          animation: 'fadeIn 0.2s ease-in-out',
        }}
        onClick={handleCancel}
      >
        {/* Dialog Box */}
        <div
          style={{
            backgroundColor: '#1a1a1a',
            borderRadius: '8px',
            border: '1px solid #333',
            boxShadow: '0 10px 40px rgba(0, 0, 0, 0.8)',
            minWidth: '300px',
            maxWidth: '500px',
            padding: '1.5rem',
            animation: 'slideUp 0.3s ease-out',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <h2
            style={{
              marginTop: 0,
              marginBottom: '1rem',
              fontSize: '1.25em',
              color: '#fff',
            }}
          >
            {dialog.title}
          </h2>

          {/* Message */}
          <p
            style={{
              marginTop: 0,
              marginBottom: '1.5rem',
              lineHeight: '1.5',
              color: '#ccc',
            }}
          >
            {dialog.message}
          </p>

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
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: '#333',
                color: '#fff',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                fontSize: '0.95em',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = '#444')}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#333')}
            >
              {dialog.cancelText || 'إلغاء'}
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: dialog.isDangerous ? '#a32525' : '#1a5a8c',
                color: '#fff',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.6 : 1,
                fontSize: '0.95em',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) =>
                !loading && (e.currentTarget.style.backgroundColor = dialog.isDangerous ? '#c73535' : '#2a7aac')
              }
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = dialog.isDangerous ? '#a32525' : '#1a5a8c')}
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
