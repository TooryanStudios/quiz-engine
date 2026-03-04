import type { ReactNode } from 'react'

type MetadataDialogShellProps = {
  isOpen: boolean
  loading: boolean
  title: string
  onClose: () => void
  children: ReactNode
  footer: ReactNode
}

export function MetadataDialogShell({
  isOpen,
  loading,
  title,
  onClose,
  children,
  footer,
}: MetadataDialogShellProps) {
  if (!isOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(2, 6, 23, 0.62)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        animation: 'fadeIn 0.2s ease-in-out',
      }}
      onClick={() => !loading && onClose()}
    >
      <div
        style={{
          background: 'linear-gradient(180deg, var(--bg-deep) 0%, var(--bg-surface) 100%)',
          borderRadius: '18px',
          border: '1px solid var(--border)',
          boxShadow: '0 24px 80px rgba(2, 6, 23, 0.55)',
          minWidth: '360px',
          maxWidth: '600px',
          width: 'min(92vw, 600px)',
          maxHeight: '88vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'slideUp 0.3s ease-out',
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div style={{
          padding: '1rem 1.2rem 0.9rem',
          borderBottom: '1px solid var(--border)',
          background: 'linear-gradient(180deg, var(--bg-deep) 0%, var(--bg-surface) 100%)',
          position: 'sticky',
          top: 0,
          zIndex: 2,
        }}>
          <h2 style={{ marginTop: 0, marginBottom: 0, color: 'var(--text-bright)', fontSize: '1.22rem', fontWeight: 800 }}>
            {title}
          </h2>
        </div>

        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1rem 1.2rem 0.8rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.9rem',
        }}>
          {children}
        </div>

        {footer}
      </div>
    </div>
  )
}