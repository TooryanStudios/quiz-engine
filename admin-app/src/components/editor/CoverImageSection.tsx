type CoverImageSectionProps = {
  tempCoverImage: string
  defaultCoverImage: string
  coverPreviewChecking: boolean
  coverPreviewError: string
  uploadingCover: boolean
  isGeneratingCoverImage: boolean
  onCoverUrlChange: (value: string) => void
  onUploadClick: () => void
  onGenerateClick: () => void
  onUseDefaultClick: () => void
}

export function CoverImageSection({
  tempCoverImage,
  defaultCoverImage,
  coverPreviewChecking,
  coverPreviewError,
  uploadingCover,
  isGeneratingCoverImage,
  onCoverUrlChange,
  onUploadClick,
  onGenerateClick,
  onUseDefaultClick,
}: CoverImageSectionProps) {
  return (
    <div>
      <label style={{ fontSize: '0.9em', color: 'var(--text-mid)', display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>🖼️ صورة الغلاف</label>
      <div style={{ display: 'flex', gap: '0.4rem' }}>
        <input
          type="text"
          value={tempCoverImage}
          onChange={(e) => onCoverUrlChange(e.target.value)}
          placeholder="https://..."
          style={{
            flex: 1, padding: '0.75rem', borderRadius: '8px',
            border: '1px solid var(--border-strong)', backgroundColor: 'var(--bg-surface)',
            color: 'var(--text)', boxSizing: 'border-box', fontSize: '0.9em',
          }}
        />
        <button
          type="button"
          disabled={uploadingCover}
          onClick={onUploadClick}
          style={{
            padding: '0 1rem', borderRadius: '8px', border: 'none',
            background: uploadingCover ? 'rgba(59, 130, 246, 0.15)' : 'var(--text-bright)',
            color: uploadingCover ? '#7dd3fc' : '#fff',
            cursor: uploadingCover ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap', fontSize: '0.85em', fontWeight: 600,
          }}
        >
          {uploadingCover ? '⏳' : '📁 رفع'}
        </button>
        <button
          type="button"
          disabled={isGeneratingCoverImage || uploadingCover}
          onClick={onGenerateClick}
          title="توليد صورة غلاف بالذكاء الاصطناعي"
          style={{
            padding: '0 1rem', borderRadius: '8px', border: 'none',
            background: 'linear-gradient(135deg, #16a34a, #22c55e)',
            color: '#fff',
            cursor: isGeneratingCoverImage || uploadingCover ? 'not-allowed' : 'pointer',
            opacity: isGeneratingCoverImage || uploadingCover ? 0.65 : 1,
            whiteSpace: 'nowrap', fontSize: '0.85em', fontWeight: 700,
          }}
        >
          {isGeneratingCoverImage ? '⏳ توليد...' : '✨ توليد'}
        </button>
        <button
          type="button"
          onClick={onUseDefaultClick}
          title="استخدام الصورة الافتراضية"
          style={{
            padding: '0 0.75rem', borderRadius: '8px', border: '1px solid var(--border-strong)',
            background: tempCoverImage === defaultCoverImage ? 'rgba(37,99,235,0.2)' : 'var(--bg-surface)',
            color: tempCoverImage === defaultCoverImage ? '#7dd3fc' : 'var(--text-muted)',
            cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '0.8em', fontWeight: 600,
          }}
        >
          🖼️ افتراضي
        </button>
      </div>
      {tempCoverImage && (
        <p
          style={{
            marginTop: '0.45rem',
            marginBottom: 0,
            fontSize: '0.78rem',
            color: coverPreviewError ? '#fda4af' : 'var(--text-mid)',
          }}
        >
          {coverPreviewChecking
            ? '⏳ جارٍ تحميل صورة الغلاف من الرابط...'
            : coverPreviewError || '✅ تم التحقق من رابط صورة الغلاف'}
        </p>
      )}
      <div style={{ marginTop: '0.75rem', borderRadius: '10px', overflow: 'hidden', height: '110px', position: 'relative', background: 'var(--bg-deep)' }}>
        <img
          src={tempCoverImage || defaultCoverImage}
          alt="cover preview"
          style={{
            width: '100%', height: '110px',
            objectFit: tempCoverImage === defaultCoverImage ? 'contain' : 'cover',
            padding: tempCoverImage === defaultCoverImage ? '10px' : 0,
            display: 'block', boxSizing: 'border-box',
          }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = defaultCoverImage }}
        />
        {tempCoverImage && tempCoverImage !== defaultCoverImage && (
          <button
            type="button"
            onClick={onUseDefaultClick}
            style={{
              position: 'absolute', top: '6px', left: '6px',
              background: 'var(--text-bright)', border: 'none', color: '#fff',
              borderRadius: '50%', width: '24px', height: '24px',
              cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >✕</button>
        )}
      </div>
    </div>
  )
}
