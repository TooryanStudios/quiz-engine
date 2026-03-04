type EditorHeroCoverCardProps = {
  isNarrowScreen: boolean
  coverImage: string
  placeholderImage: string
  uploadingCover: boolean
  onOpenMetadata: () => void
}

export function EditorHeroCoverCard({
  isNarrowScreen,
  coverImage,
  placeholderImage,
  uploadingCover,
  onOpenMetadata,
}: EditorHeroCoverCardProps) {
  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div style={{
        width: isNarrowScreen ? '100px' : '130px',
        height: isNarrowScreen ? '100px' : '130px',
        borderRadius: '20px',
        overflow: 'hidden',
        border: '3px solid var(--accent)',
        background: 'var(--bg-deep)',
        cursor: 'pointer',
        boxShadow: '0 8px 16px rgba(124,58,237,0.2)',
        transition: 'transform 0.2s',
      }}
      onClick={onOpenMetadata}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.02)' }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
      >
        <img src={coverImage || placeholderImage} alt="Thumbnail" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '0.65rem', padding: '4px', textAlign: 'center', fontWeight: 700 }}>
          تغيير الصورة
        </div>
      </div>
      {uploadingCover && (
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '20px' }}>
          <span className="save-icon-spinning">🔄</span>
        </div>
      )}
    </div>
  )
}
