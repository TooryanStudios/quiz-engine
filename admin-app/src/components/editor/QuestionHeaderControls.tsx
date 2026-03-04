type TypeOption = {
  value: string
  label: string
}

type QuestionHeaderControlsProps = {
  isNarrowScreen: boolean
  currentType: string
  currentDuration: number
  selectedTypeLabel: string
  allowedDurations: number[]
  questionTypeOptions: TypeOption[]
  onTypeChange: (nextType: string) => void
  onOpenTypePicker: () => void
  onDurationChange: (seconds: number) => void
  onOpenDurationPicker: () => void
}

export function QuestionHeaderControls({
  isNarrowScreen,
  currentType,
  currentDuration,
  selectedTypeLabel,
  allowedDurations,
  questionTypeOptions,
  onTypeChange,
  onOpenTypePicker,
  onDurationChange,
  onOpenDurationPicker,
}: QuestionHeaderControlsProps) {
  return (
    <>
      <select
        value={currentType}
        onChange={(e) => onTypeChange(e.target.value)}
        style={{
          display: isNarrowScreen ? 'none' : 'block',
          minWidth: '160px',
          padding: '0.5rem 0.75rem',
          borderRadius: '8px',
          border: '1px solid var(--border-strong)',
          backgroundColor: 'var(--bg-deep)',
          color: 'var(--text)',
          fontSize: '0.92rem',
          fontWeight: 600,
          cursor: 'pointer',
          outline: 'none',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
        title="نوع السؤال"
      >
        {questionTypeOptions.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>

      {isNarrowScreen && (
        <button
          type="button"
          onClick={onOpenTypePicker}
          style={{
            padding: '0.5rem 0.75rem',
            borderRadius: '8px',
            border: '1px solid var(--border-strong)',
            backgroundColor: 'var(--bg-deep)',
            color: 'var(--text)',
            fontSize: '0.84rem',
            fontWeight: 600,
            cursor: 'pointer',
            width: '140px',
            textAlign: 'right',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {selectedTypeLabel}
        </button>
      )}

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.45rem',
        direction: 'rtl',
        background: 'var(--bg-deep)',
        border: '1px solid var(--border-strong)',
        borderRadius: '8px',
        padding: '0 0.6rem',
        height: '42px',
        minWidth: isNarrowScreen ? '70px' : '85px',
      }}>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 400 }}>⏱️</span>
        <select
          value={String(currentDuration || 20)}
          onChange={(e) => onDurationChange(Number(e.target.value))}
          style={{
            display: isNarrowScreen ? 'none' : 'block',
            minWidth: '45px',
            height: '100%',
            border: 'none',
            background: 'transparent',
            color: 'var(--text)',
            fontSize: '0.92rem',
            fontWeight: 700,
            outline: 'none',
            cursor: 'pointer',
            padding: '0 0.2rem',
            direction: 'rtl',
            textAlign: 'right',
          }}
          title="مدة السؤال"
        >
          {allowedDurations.map((seconds) => (
            <option key={seconds} value={seconds} style={{ color: '#0f172a' }}>
              {seconds} ث
            </option>
          ))}
        </select>
        {isNarrowScreen && (
          <div
            onClick={onOpenDurationPicker}
            style={{
              color: 'var(--text)',
              fontSize: '0.92rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {currentDuration || 20}
          </div>
        )}
      </div>

      {!isNarrowScreen && <div style={{ width: '1px', height: '24px', background: 'var(--border-strong)', margin: '0 0.2rem' }} />}
    </>
  )
}
