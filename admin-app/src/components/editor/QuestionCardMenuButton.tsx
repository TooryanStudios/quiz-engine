type QuestionCardMenuButtonProps = {
  onOpen: () => void
}

export function QuestionCardMenuButton({ onOpen }: QuestionCardMenuButtonProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        background: 'var(--bg-deep)',
        border: '1px solid var(--border-strong)',
        color: 'var(--text-mid)',
        fontSize: '1.2rem',
        width: '32px',
        height: '32px',
        borderRadius: '8px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        lineHeight: 1,
      }}
    >
      ⋮
    </button>
  )
}
