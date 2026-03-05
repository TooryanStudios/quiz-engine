type MetadataAiSectionProps = {
  aiQuestionCount: number
  aiPrompt: string
  isGenerating: boolean
  generateActionActive: boolean
  onQuestionCountChange: (count: number) => void
  onPromptChange: (value: string) => void
  onGenerate: () => void
}

export function MetadataAiSection({
  aiQuestionCount,
  aiPrompt,
  isGenerating,
  generateActionActive,
  onQuestionCountChange,
  onPromptChange,
  onGenerate,
}: MetadataAiSectionProps) {
  const disabled = generateActionActive || !aiPrompt.trim() || isGenerating

  return (
    <div style={{
      marginTop: '1rem',
      padding: '1rem',
      background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)',
      borderRadius: '12px',
      border: '1px solid rgba(124, 58, 237, 0.3)',
    }}>
      <label style={{ fontSize: '0.9em', color: 'var(--text-bright)', display: 'block', marginBottom: '0.8rem', fontWeight: 800 }}>
        ✨ إنشاء الأسئلة بالذكاء الاصطناعي
      </label>

      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        {[3, 5, 8, 10, 15].map(num => (
          <button
            key={num}
            type="button"
            onClick={() => onQuestionCountChange(num)}
            style={{
              padding: '0.4rem 0.8rem',
              borderRadius: '20px',
              border: '1px solid ' + (aiQuestionCount === num ? 'var(--text-bright)' : 'var(--border-strong)'),
              background: aiQuestionCount === num ? 'var(--text-bright)' : 'var(--bg-deep)',
              color: aiQuestionCount === num ? 'var(--bg-deep)' : 'var(--text-mid)',
              fontSize: '0.75rem',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {num} أسئلة
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '0.6rem' }}>
        <textarea
          value={aiPrompt}
          onChange={(e) => onPromptChange(e.target.value)}
          placeholder="اكتب موضوع الاختبار أو معلومات عنه ليقوم الذكاء الاصطناعي بإنشاء الأسئلة..."
          style={{
            flex: 1,
            padding: '0.75rem',
            borderRadius: '8px',
            border: '1px solid var(--border-strong)',
            background: 'var(--bg-surface)',
            color: 'var(--text)',
            fontSize: '0.9rem',
            minHeight: '80px',
            resize: 'vertical',
          }}
        />
        <button
          type="button"
          onClick={onGenerate}
          disabled={disabled}
          style={{
            padding: '0 1.2rem',
            borderRadius: '8px',
            background: 'var(--text-bright)',
            color: 'var(--bg-deep)',
            fontWeight: 800,
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}
        >
          {generateActionActive || isGenerating ? '⏳ جاري الإنشاء...' : '🚀 إنشاء'}
        </button>
      </div>
      <p style={{ marginTop: '0.5rem', fontSize: '0.75em', color: 'var(--text-mid)' }}>
        سيتم تحليل النص المكتوب وتوليد أسئلة في ثوانٍ. تنبيه: قد يخطئ الذكاء الاصطناعي — يرجى مراجعة الأسئلة والإجابات قبل الحفظ.
      </p>
    </div>
  )
}
