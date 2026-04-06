import type { QuizMedia, QuizQuestion } from '../../types/quiz'
import './EditorModern.css'

type QuestionMediaSectionProps = {
  question: QuizQuestion
  uploading: boolean
  onSelectMediaType: (value: QuizMedia['type'] | 'none') => void
  onChangeMediaUrl: (value: string) => void
  onUploadMedia: () => void
  onPasteMediaUrl: () => void

  // Optional AI helpers
  aiCheckLoading?: boolean
  aiCheckResult?: { verdict: 'ok' | 'issues' | 'uncertain'; summary: string; issues?: string[]; suggestions?: string[] } | null
  onAiCheckClick?: () => void

  aiImageLoading?: boolean
  onAiImageClick?: () => void
}

export function QuestionMediaSection({
  question,
  uploading,
  onSelectMediaType,
  onChangeMediaUrl,
  onUploadMedia,
  onPasteMediaUrl,
  aiCheckLoading,
  aiCheckResult,
  aiImageLoading,
  onAiCheckClick,
  onAiImageClick,
}: QuestionMediaSectionProps) {
  return (
    <div style={{ marginTop: '0.5rem' }}>
      <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: 600 }}>وسائط السؤال</label>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
        flexWrap: 'wrap',
        marginBottom: '1.2rem',
      }}>
        <div style={{ display: 'inline-flex', background: 'var(--bg-deep)', padding: '3px', borderRadius: '10px', border: '1px solid var(--border-strong)' }}>
        {[
          { value: 'none', label: '✕ بلا' },
          { value: 'image', label: '🖼️ صورة' },
          { value: 'gif', label: '🎞️ GIF' },
          { value: 'video', label: '🎬 فيديو' },
        ].map((option) => {
          const isSelected = (question.media?.type ?? 'none') === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onSelectMediaType(option.value as QuizMedia['type'] | 'none')}
              style={{
                padding: '0.4rem 1rem',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: isSelected ? 'var(--accent)' : 'transparent',
                color: isSelected ? '#fff' : 'var(--text-mid)',
                cursor: 'pointer',
                fontSize: '0.8rem',
                transition: 'all 0.2s ease',
                fontWeight: isSelected ? 600 : 500,
                boxShadow: isSelected ? '0 2px 6px rgba(37,99,235,0.25)' : 'none',
              }}
            >
              {option.label}
            </button>
          )
        })}
        </div>

        {(onAiCheckClick || onAiImageClick) && (
          <div style={{ display: 'inline-flex', background: 'var(--bg-deep)', padding: '3px', borderRadius: '10px', border: '1px solid var(--border-strong)' }}>
            {onAiCheckClick && (
              <button
                type="button"
                onClick={onAiCheckClick}
                disabled={!!aiCheckLoading}
                style={{
                  padding: '0.4rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: 'var(--text-mid)',
                  cursor: aiCheckLoading ? 'not-allowed' : 'pointer',
                  fontSize: '0.8rem',
                  transition: 'all 0.2s ease',
                  fontWeight: 500,
                  boxShadow: 'none',
                  opacity: aiCheckLoading ? 0.6 : 1,
                  whiteSpace: 'nowrap',
                }}
                title="تحقق من صحة السؤال والإجابات"
              >
                {aiCheckLoading
                  ? <><span className="ai-spinner" />{' '}تحقق AI</>
                  : '✅ تحقق AI'}
              </button>
            )}

            {onAiImageClick && (
              <button
                type="button"
                onClick={onAiImageClick}
                disabled={!!aiImageLoading}
                style={{
                  padding: '0.4rem 1rem',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: 'var(--text-mid)',
                  cursor: aiImageLoading ? 'not-allowed' : 'pointer',
                  fontSize: '0.8rem',
                  transition: 'all 0.2s ease',
                  fontWeight: 500,
                  boxShadow: 'none',
                  opacity: aiImageLoading ? 0.6 : 1,
                  whiteSpace: 'nowrap',
                }}
                title="توليد صورة بالذكاء الاصطناعي لهذا السؤال"
              >
                {aiImageLoading
                  ? <><span className="ai-spinner" />{' '}صورة AI</>
                  : '🎨 صورة AI'}
              </button>
            )}
          </div>
        )}
      </div>

      {aiCheckResult && (
        <div style={{
          marginTop: '-0.6rem',
          marginBottom: '0.9rem',
          padding: '0.65rem 0.75rem',
          borderRadius: '12px',
          border: '1px solid var(--border-strong)',
          background: 'var(--bg-deep)',
          color: 'var(--text-mid)',
          fontSize: '0.88rem',
          wordBreak: 'break-word',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
            <div style={{ fontWeight: 900, color: 'var(--text)' }}>
              {aiCheckResult.verdict === 'ok' ? '✅ يبدو صحيحًا' : aiCheckResult.verdict === 'issues' ? '⚠️ ربما يوجد خطأ' : '❓ غير متأكد'}
            </div>
            <div style={{ fontSize: '0.8rem' }}>AI يمكن أن يخطئ — راجع بنفسك</div>
          </div>
          <div style={{ marginTop: '0.35rem' }}>{aiCheckResult.summary}</div>
          {Array.isArray(aiCheckResult.issues) && aiCheckResult.issues.length > 0 && (
            <div style={{ marginTop: '0.5rem' }}>
              <b style={{ color: 'var(--text)' }}>ملاحظات:</b> {aiCheckResult.issues.slice(0, 5).join(' • ')}
            </div>
          )}
          {Array.isArray(aiCheckResult.suggestions) && aiCheckResult.suggestions.length > 0 && (
            <div style={{ marginTop: '0.35rem' }}>
              <b style={{ color: 'var(--text)' }}>اقتراحات:</b> {aiCheckResult.suggestions.slice(0, 5).join(' • ')}
            </div>
          )}
        </div>
      )}

      {question.media && (
        <div style={{ marginBottom: '1rem', animation: 'fadeIn 0.3s ease-out' }}>
          <div style={{ display: 'flex', gap: '0', background: 'var(--bg-deep)', borderRadius: '10px', border: '1px solid var(--border-strong)', overflow: 'hidden' }}>
            <input
              value={question.media.url}
              onChange={(e) => onChangeMediaUrl(e.target.value)}
              placeholder={question.media.type === 'video' ? 'رابط فيديو يوتيوب...' : 'أدخل رابط الوسائط هنا...'}
              style={{
                flex: 1,
                padding: '0.7rem 0.95rem',
                border: 'none',
                background: 'transparent',
                color: 'var(--text)',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />

            <button
              type="button"
              disabled={uploading}
              onClick={onUploadMedia}
              style={{
                padding: '0 1rem',
                border: 'none',
                borderLeft: '1px solid var(--border-strong)',
                backgroundColor: uploading ? 'rgba(37, 99, 235, 0.25)' : 'var(--accent)',
                color: '#fff',
                cursor: uploading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem',
                transition: 'all 0.2s',
              }}
              title={uploading ? 'جارٍ الرفع...' : 'رفع ملف'}
            >
              {uploading ? (
                <span style={{
                  display: 'inline-block',
                  width: '16px',
                  height: '16px',
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff',
                  borderRadius: '50%',
                  animation: 'spin 0.7s linear infinite',
                }} />
              ) : '📁'}
            </button>

            <button
              type="button"
              onClick={onPasteMediaUrl}
              style={{
                padding: '0 1rem',
                border: 'none',
                borderLeft: '1px solid var(--border-strong)',
                backgroundColor: 'var(--accent)',
                color: '#fff',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.1rem',
                transition: 'all 0.2s',
              }}
              title="لصق الرابط"
            >
              📋
            </button>
          </div>
        </div>
      )}

      {question.media?.url && (
        <div style={{
          marginTop: '0.8rem',
          padding: '0.6rem',
          borderRadius: '12px',
          border: '1px solid var(--border-strong)',
          backgroundColor: 'var(--bg-deep)',
          overflow: 'hidden',
          animation: 'fadeIn 0.4s ease-out',
        }}>
          {(question.media.type === 'image' || question.media.type === 'gif') && (
            <img
              src={question.media.url}
              alt="preview"
              style={{
                maxWidth: '100%',
                maxHeight: 150,
                borderRadius: 4,
                objectFit: 'cover',
                display: 'block',
              }}
              onError={(e) => {
                const target = e.target as HTMLImageElement
                target.onerror = null
                target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='320' height='160' viewBox='0 0 320 160'%3E%3Crect width='320' height='160' fill='%231e293b'/%3E%3Ctext x='50%25' y='44%25' font-family='sans-serif' font-size='28' fill='%2364748b' text-anchor='middle' dominant-baseline='middle'%3E%F0%9F%96%BC%EF%B8%8F%3C/text%3E%3Ctext x='50%25' y='68%25' font-family='sans-serif' font-size='12' fill='%2364748b' text-anchor='middle' dominant-baseline='middle'%3EImage unavailable%3C/text%3E%3C/svg%3E"
                target.style.opacity = '0.5'
              }}
            />
          )}
          {question.media.type === 'video' && (
            <iframe
              src={question.media.url}
              title="video preview"
              width="100%"
              height="150"
              style={{ border: 'none', borderRadius: 4, display: 'block' }}
              allow="autoplay; encrypted-media"
              allowFullScreen
            />
          )}
        </div>
      )}
    </div>
  )
}