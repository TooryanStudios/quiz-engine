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
    <div className={`editor-hero-cover${isNarrowScreen ? ' editor-hero-cover--narrow' : ''}`}>
      <div className="editor-hero-cover-card" onClick={onOpenMetadata}>
        <img src={coverImage || placeholderImage} alt="Thumbnail" className="editor-hero-cover-img" />
        <div className="editor-hero-cover-overlay">
          تغيير الصورة
        </div>
      </div>
      {uploadingCover && (
        <div className="editor-hero-cover-loading">
          <span className="save-icon-spinning">🔄</span>
        </div>
      )}
    </div>
  )
}
