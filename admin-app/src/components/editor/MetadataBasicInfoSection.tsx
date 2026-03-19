type MetadataBasicInfoSectionProps = {
  title: string
  description: string
  onTitleChange: (value: string) => void
  onDescriptionChange: (value: string) => void
}

export function MetadataBasicInfoSection({
  title,
  description,
  onTitleChange,
  onDescriptionChange,
}: MetadataBasicInfoSectionProps) {
  return (
    <>
      <div>
        <label style={{ fontSize: '0.9em', color: 'var(--text-mid)', display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>اسم الاختبار</label>
        <input
          type="text"
          value={title}
          onChange={(event) => onTitleChange(event.target.value)}
          placeholder="مثلاً: اختبار الحيوانات"
          style={{
            width: '100%',
            padding: '0.75rem',
            borderRadius: '8px',
            border: '1px solid var(--border-strong)',
            backgroundColor: 'var(--bg-surface)',
            color: 'var(--text)',
            boxSizing: 'border-box',
            fontSize: '1em',
          }}
        />
      </div>

      <div>
        <label style={{ fontSize: '0.9em', color: 'var(--text-mid)', display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>وصف الاختبار (اختياري)</label>
        <textarea
          value={description}
          onChange={(event) => onDescriptionChange(event.target.value)}
          placeholder="أضف وصفًا موجزًا يساعد الذكاء الاصطناعي على فهم موضوع الاختبار..."
          rows={3}
          style={{
            width: '100%',
            padding: '0.75rem',
            borderRadius: '8px',
            border: '1px solid var(--border-strong)',
            backgroundColor: 'var(--bg-surface)',
            color: 'var(--text)',
            boxSizing: 'border-box',
            fontSize: '0.92em',
            resize: 'vertical',
            lineHeight: 1.5,
          }}
        />
        <p style={{ marginTop: '0.25rem', fontSize: '0.78em', color: 'var(--text-mid)' }}>
          يُستخدم لتحسين نتائج توليد الأسئلة والصور بالذكاء الاصطناعي.
        </p>
      </div>
    </>
  )
}