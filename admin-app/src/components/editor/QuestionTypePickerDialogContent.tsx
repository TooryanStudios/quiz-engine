type QuestionTypePickerDialogContentProps = {
  options: Array<{ label: string; value: string }>
  selectedType: string
  onSelect: (type: string) => void
}

export function QuestionTypePickerDialogContent({
  options,
  selectedType,
  onSelect,
}: QuestionTypePickerDialogContentProps) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem', marginTop: '1rem' }}>
      {options.map((opt, index) => (
        <button
          key={index}
          onClick={() => onSelect(opt.value)}
          style={{
            padding: '1rem',
            background: selectedType === opt.value ? 'var(--accent)' : 'var(--bg-deep)',
            color: selectedType === opt.value ? '#fff' : 'var(--text)',
            border: '1px solid var(--border-strong)',
            borderRadius: '12px',
            textAlign: 'right',
            fontWeight: 600,
            fontSize: '0.95rem',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}