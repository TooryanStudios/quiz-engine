import { useState } from 'react'

type CoverImageSectionProps = {
  tempCoverImage: string
  defaultCoverImage: string
  uploadingCover: boolean
  isGeneratingCoverImage: boolean
  creditCostPerImage: number
  onUploadClick: () => void
  onGenerateClick: () => void
  onUseDefaultClick: () => void
}

export function CoverImageSection({
  tempCoverImage,
  defaultCoverImage,
  isGeneratingCoverImage,
  uploadingCover,
  creditCostPerImage,
  onUploadClick,
  onGenerateClick,
  onUseDefaultClick,
}: CoverImageSectionProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
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
      <label style={{ fontSize: '0.9em', color: 'var(--text-mid)', display: 'block', marginBottom: '0.75rem', fontWeight: 600 }}>🖼️ صورة الغلاف</label>
      
      {/* Collapsed View - Thumbnail + Change Button */}
      {!expanded && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.75rem',
          borderRadius: '10px',
          border: '1px solid var(--border-strong)',
          background: 'var(--bg-surface)',
        }}>
          <div
            onClick={() => setLightboxOpen(true)}
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '8px',
              overflow: 'hidden',
              flexShrink: 0,
              cursor: 'zoom-in',
              border: '1px solid var(--border-strong)',
              background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.5) 0%, rgba(30, 41, 59, 0.5) 100%)',
            }}
          >
            <img
              src={activeImage}
              alt="cover thumbnail"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
              }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = defaultCoverImage }}
            />
          </div>
          <button
            type="button"
            onClick={() => setExpanded(true)}
            style={{
              flex: 1,
              padding: '0.7rem 1rem',
              borderRadius: '8px',
              border: '1px solid var(--border-strong)',
              background: 'var(--bg-surface)',
              color: 'var(--text)',
              fontSize: '0.85em',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-surface)' }}
          >
            <span>🔄 تغيير الصورة</span>
          </button>
        </div>
      )}
      
      {/* Expanded View - Full Settings */}
      {expanded && (
        <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
          <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }`}</style>
      
      {/* Card Container */}
      <div style={{
        padding: '1rem',
        borderRadius: '12px',
        border: '1px solid var(--border-strong)',
        background: 'var(--bg-surface)',
      }}>
      
      {/* Preview Image */}
      <div
        style={{ 
          marginBottom: '0.75rem', 
          borderRadius: '12px', 
          overflow: 'hidden', 
          height: '160px', 
          position: 'relative', 
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.5) 0%, rgba(30, 41, 59, 0.5) 100%)',
          border: '1px solid var(--border-strong)',
          cursor: isGeneratingCoverImage ? 'default' : 'zoom-in',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
        }}
        onClick={() => !isGeneratingCoverImage && setLightboxOpen(true)}
        title={isGeneratingCoverImage ? '' : 'انقر لتكبير الصورة'}
      >
        <img
          src={activeImage}
          alt="cover preview"
          style={{
            width: '100%', height: '160px',
            objectFit: 'cover',
            display: 'block',
            filter: isGeneratingCoverImage ? 'blur(4px) brightness(0.4)' : 'none',
            transition: 'filter 0.3s, transform 0.2s',
          }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = defaultCoverImage }}
          onMouseEnter={(e) => { if (!isGeneratingCoverImage) e.currentTarget.style.transform = 'scale(1.02)' }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
        />
        {isGeneratingCoverImage && (
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            gap: '10px', pointerEvents: 'none',
          }}>
            <div style={{
              width: '40px', height: '40px', borderRadius: '50%',
              border: '3px solid rgba(255,255,255,0.2)',
              borderTop: '3px solid #a78bfa',
              animation: 'spin 0.8s linear infinite',
            }} />
            <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.9)', fontWeight: 700, letterSpacing: '0.03em' }}>✨ يتم التوليد...</span>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}
        {!isGeneratingCoverImage && (
          <div style={{ 
            position: 'absolute', 
            bottom: '10px', 
            right: '10px', 
            background: 'rgba(0,0,0,0.7)', 
            backdropFilter: 'blur(8px)',
            borderRadius: '6px', 
            padding: '4px 10px', 
            fontSize: '0.75rem', 
            color: '#fff', 
            fontWeight: 600,
            pointerEvents: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}>
            🔍 تكبير
          </div>
        )}
        {tempCoverImage && tempCoverImage !== defaultCoverImage && !isGeneratingCoverImage && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onUseDefaultClick(); }}
            style={{
              position: 'absolute', top: '10px', left: '10px',
              background: 'rgba(0,0,0,0.7)', 
              backdropFilter: 'blur(8px)',
              border: 'none', 
              color: '#fff',
              borderRadius: '6px', 
              width: '32px', 
              height: '32px',
              cursor: 'pointer', 
              fontSize: '0.9rem', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.9)' }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0,0,0,0.7)' }}
          >✕</button>
        )}
      </div>

      {/* Action Buttons - Single Row */}
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button
          type="button"
          disabled={uploadingCover}
          onClick={onUploadClick}
          style={{
            flex: 1,
            padding: '0.65rem', 
            borderRadius: '10px', 
            border: '1px solid var(--border-strong)',
            background: uploadingCover ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-surface)',
            color: uploadingCover ? '#7dd3fc' : 'var(--text)',
            cursor: uploadingCover ? 'not-allowed' : 'pointer',
            fontSize: '0.8em', 
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => { if (!uploadingCover) e.currentTarget.style.background = 'var(--bg-hover)' }}
          onMouseLeave={(e) => { if (!uploadingCover) e.currentTarget.style.background = 'var(--bg-surface)' }}
        >
          {uploadingCover ? '⏳ رفع...' : '📁 رفع'}
        </button>

        <button
          type="button"
          disabled={isGeneratingCoverImage || uploadingCover}
          onClick={onGenerateClick}
          title={`توليد صورة غلاف بالذكاء الاصطناعي (${creditCostPerImage} نقطة)`}
          style={{
            flex: 1,
            padding: '0.65rem', 
            borderRadius: '10px', 
            border: 'none',
            background: isGeneratingCoverImage || uploadingCover 
              ? 'linear-gradient(135deg, rgba(22, 163, 74, 0.3), rgba(34, 197, 94, 0.3))'
              : 'linear-gradient(135deg, #16a34a, #22c55e)',
            color: '#fff',
            cursor: isGeneratingCoverImage || uploadingCover ? 'not-allowed' : 'pointer',
            opacity: isGeneratingCoverImage || uploadingCover ? 0.6 : 1,
            fontSize: '0.8em', 
            fontWeight: 700,
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.2s',
            boxShadow: isGeneratingCoverImage || uploadingCover ? 'none' : '0 2px 8px rgba(22, 163, 74, 0.25)',
          }}
          onMouseEnter={(e) => { 
            if (!isGeneratingCoverImage && !uploadingCover) {
              e.currentTarget.style.transform = 'translateY(-1px)'
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(22, 163, 74, 0.35)'
            }
          }}
          onMouseLeave={(e) => { 
            if (!isGeneratingCoverImage && !uploadingCover) {
              e.currentTarget.style.transform = 'translateY(0)'
              e.currentTarget.style.boxShadow = '0 2px 8px rgba(22, 163, 74, 0.25)'
            }
          }}
        >
          {isGeneratingCoverImage ? (
            <>⏳ توليد...</>
          ) : (
            <>
              <span>✨ توليد</span>
              <span style={{ fontSize: '0.7em', opacity: 0.9 }}>({creditCostPerImage})</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={onUseDefaultClick}
          title="استخدام الصورة الافتراضية"
          style={{
            flex: 1,
            padding: '0.65rem', 
            borderRadius: '10px', 
            border: '1px solid var(--border-strong)',
            background: tempCoverImage === defaultCoverImage ? 'rgba(37,99,235,0.15)' : 'var(--bg-surface)',
            color: tempCoverImage === defaultCoverImage ? '#60a5fa' : 'var(--text-muted)',
            cursor: 'pointer', 
            fontSize: '0.8em', 
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = tempCoverImage === defaultCoverImage ? 'rgba(37,99,235,0.2)' : 'var(--bg-hover)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = tempCoverImage === defaultCoverImage ? 'rgba(37,99,235,0.15)' : 'var(--bg-surface)' }}
        >
          🖼️ افتراضي
        </button>
      </div>
      
      </div>
      {/* End Card Container */}
      
      {/* Collapse Button */}
      <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          style={{
            padding: '0.5rem 1rem',
            borderRadius: '8px',
            border: '1px solid var(--border-strong)',
            background: 'var(--bg-surface)',
            color: 'var(--text-mid)',
            fontSize: '0.8em',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--bg-surface)' }}
        >
          ▲ إخفاء الإعدادات
        </button>
      </div>
      
      </div>
      )}
    </div>
    </>
  )
}
