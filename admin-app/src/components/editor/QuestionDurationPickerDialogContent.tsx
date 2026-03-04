type QuestionDurationPickerDialogContentProps = {
  allowedDurations: number[]
  selectedDuration: number
  onSelect: (seconds: number) => void
}

export function QuestionDurationPickerDialogContent({
  allowedDurations,
  selectedDuration,
  onSelect,
}: QuestionDurationPickerDialogContentProps) {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '0.6rem',
      marginTop: '1rem',
    }}>
      {allowedDurations.map((seconds) => (
        <button
          key={seconds}
          onClick={() => onSelect(seconds)}
          style={{
            padding: '0.8rem',
            background: selectedDuration === seconds ? 'var(--accent)' : 'var(--bg-deep)',
            color: selectedDuration === seconds ? '#fff' : 'var(--text)',
            border: '1px solid var(--border-strong)',
            borderRadius: '10px',
            fontWeight: 800,
            fontSize: '1rem',
          }}
        >
          {seconds}
        </button>
      ))}
    </div>
  )
}