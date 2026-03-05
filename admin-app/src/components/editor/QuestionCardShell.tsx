import type { DragEvent, ReactNode } from 'react'

type QuestionCardShellProps = {
  index: number
  isDragOver?: boolean
  isDragging?: boolean
  onDragStart?: () => void
  onDragOver?: (event: DragEvent<HTMLElement>) => void
  onDrop?: () => void
  onDragEnd?: () => void
  children: ReactNode
}

type QuestionCardHeaderProps = {
  collapsed: boolean
  questionText: string
  index: number
  isPuzzleQuestion: boolean
  actions: ReactNode
}

export function QuestionCardShell({
  index,
  children,
}: QuestionCardShellProps) {
  return (
    <section
      key={index}
      className="panel"
      style={{
        backgroundColor: 'var(--bg-deep)',
        border: '1px solid #4b5563',
        borderLeft: '6px solid #3b82f6',
        padding: '1.2rem',
        borderRadius: '14px',
        marginBottom: '0.75rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        cursor: 'default',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
    >
      {children}
    </section>
  )
}

export function QuestionCardHeader({
  collapsed,
  questionText,
  index,
  isPuzzleQuestion,
  actions,
}: QuestionCardHeaderProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', paddingBottom: '0.8rem', borderBottom: '1px solid var(--border-strong)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', flex: 1, minWidth: 0 }}>
        {collapsed ? (
          <>
            <span
              style={{
                fontSize: '0.92rem',
                color: 'var(--text-bright)',
                fontWeight: 700,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '100%',
              }}
              title={questionText || 'بدون نص سؤال'}
            >
              {questionText || 'بدون نص سؤال'}
            </span>
          </>
        ) : (
          <>
            <h3 style={{ margin: '0', fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-bright)', letterSpacing: '0.5px' }}>
              {isPuzzleQuestion ? `البازل ${index + 1}` : `السؤال ${index + 1}`}
            </h3>
          </>
        )}
      </div>

      {actions}
    </div>
  )
}