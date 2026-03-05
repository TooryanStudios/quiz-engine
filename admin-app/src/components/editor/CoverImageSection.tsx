import { useState } from 'react'

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
  onOpenLibraryClick: () => void
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
  onOpenLibraryClick,
  onUseDefaultClick,
}: CoverImageSectionProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const activeImage = tempCoverImage || defaultCoverImage

  return (
    <>
    {lightboxOpen && (
      <div
        onClick={() => setLightboxOpen(false)}
        style={{
          position: 'fixed', inset: 0, zIndex: 9999,
          background: 'rgba(0,0,0,0.85)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'zoom-out',
        }}
      >
        <img
          src={activeImage}
          alt="cover full"
          style={{ maxWidth: '90vw', maxHeight: '90vh', objectFit: 'contain', borderRadius: '12px', boxShadow: '0 8px 40px rgba(0,0,0,0.6)' }}
        />
        <button
          onClick={() => setLightboxOpen(false)}
          style={{
            position: 'fixed', top: '16px', right: '20px',
            background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff',
            borderRadius: '50%', width: '36px', height: '36px',
            cursor: 'pointer', fontSize: '1.1rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >✕</button>
      </div>
    )}
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
          disabled={uploadingCover || isGeneratingCoverImage}
          onClick={onOpenLibraryClick}
          title="اختيار صورة من مكتبة الأصول"
          style={{
            padding: '0 0.9rem', borderRadius: '8px', border: '1px solid var(--border-strong)',
            background: 'var(--bg-surface)',
            color: 'var(--text)',
            cursor: (uploadingCover || isGeneratingCoverImage) ? 'not-allowed' : 'pointer',
            opacity: (uploadingCover || isGeneratingCoverImage) ? 0.65 : 1,
            whiteSpace: 'nowrap', fontSize: '0.85em', fontWeight: 700,
          }}
        >
          🗂️ مكتبة
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
      <div
        style={{ marginTop: '0.75rem', borderRadius: '10px', overflow: 'hidden', height: '110px', position: 'relative', background: 'var(--bg-deep)', cursor: isGeneratingCoverImage ? 'default' : 'zoom-in' }}
        onClick={() => !isGeneratingCoverImage && setLightboxOpen(true)}
        title={isGeneratingCoverImage ? '' : 'انقر لتكبير الصورة'}
      >
        <img
          src={activeImage}
          alt="cover preview"
          style={{
            width: '100%', height: '110px',
            objectFit: 'contain',
            padding: '6px',
            display: 'block', boxSizing: 'border-box',
            filter: isGeneratingCoverImage ? 'blur(3px) brightness(0.4)' : 'none',
            transition: 'filter 0.3s',
          }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = defaultCoverImage }}
        />
        {isGeneratingCoverImage && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: '8px', pointerEvents: 'none',
          }}>
            <div style={{
              width: '36px', height: '36px', borderRadius: '50%',
              border: '3px solid rgba(255,255,255,0.15)',
              borderTop: '3px solid #a78bfa',
              animation: 'spin 0.8s linear infinite',
            }} />
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.85)', fontWeight: 600, letterSpacing: '0.02em' }}>✨ يتم التوليد...</span>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}
        {!isGeneratingCoverImage && <div style={{ position: 'absolute', bottom: '6px', right: '8px', background: 'rgba(0,0,0,0.5)', borderRadius: '4px', padding: '2px 6px', fontSize: '0.7rem', color: '#fff', pointerEvents: 'none' }}>🔍 تكبير</div>}
        {tempCoverImage && tempCoverImage !== defaultCoverImage && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onUseDefaultClick(); }}
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
    </>
  )
}
