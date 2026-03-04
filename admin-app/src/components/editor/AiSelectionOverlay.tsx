import { createPortal } from 'react-dom'
import type { QuizQuestion } from '../../types/quiz'

type AiSelectionOverlayProps = {
  isOpen: boolean
  isNarrowScreen: boolean
  aiConflictData: { questions: QuizQuestion[]; count: number } | null
  aiSuggestedTitle: string
  selectedAiIndices: number[]
  existingQuestionsCount: number
  onToggleAll: () => void
  onClose: () => void
  onToggleIndex: (index: number) => void
  onResolve: (mode: 'append' | 'replace' | 'new') => void
}

export function AiSelectionOverlay({
  isOpen,
  isNarrowScreen,
  aiConflictData,
  aiSuggestedTitle,
  selectedAiIndices,
  existingQuestionsCount,
  onToggleAll,
  onClose,
  onToggleIndex,
  onResolve,
}: AiSelectionOverlayProps) {
  if (!isOpen || !aiConflictData) return null

  // createPortal renders directly into document.body, escaping any parent
  // stacking context (transform / will-change on editor ancestors) that would
  // otherwise cause position:fixed to sit behind the fixed app header.
  return createPortal(
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(2, 6, 23, 0.85)',
      backdropFilter: 'blur(10px)',
      zIndex: 99999,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      padding: isNarrowScreen ? '1rem 0.75rem' : '1.5rem',
      boxSizing: 'border-box',
    }}>
      <div style={{
        width: 'min(760px, 98vw)',
        maxHeight: isNarrowScreen ? '80dvh' : 'calc(100dvh - 3rem)',
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-strong)',
        borderRadius: '16px',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        overflow: 'hidden',
      }}>
        <div style={{ padding: isNarrowScreen ? '0.75rem 1rem' : '1.2rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ direction: 'rtl' }}>
            <h3 style={{ margin: 0, color: 'var(--text-bright)', fontSize: isNarrowScreen ? '1rem' : '1.2rem' }}>✨ اختر الأسئلة التي تريد إضافتها</h3>
            {aiSuggestedTitle && (
              <div style={{ marginTop: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>اسم مقترح:</span>
                <span style={{ fontSize: '0.82rem', color: '#a78bfa', fontWeight: 700, background: 'rgba(124,58,237,0.12)', padding: '0.15rem 0.6rem', borderRadius: '20px', border: '1px solid rgba(124,58,237,0.3)' }}>
                  {aiSuggestedTitle}
                </span>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.8rem' }}>
            <button
              onClick={onToggleAll}
              style={{ background: 'none', border: 'none', color: 'var(--text-bright)', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 700 }}
            >
              {selectedAiIndices.length === aiConflictData.questions.length ? 'إلغاء الكل' : 'تحديد الكل'}
            </button>
            <button
              onClick={onClose}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}
            >✕</button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: isNarrowScreen ? '0.5rem' : '0.8rem' }}>
          <div style={{ display: 'grid', gap: isNarrowScreen ? '0.5rem' : '0.8rem' }}>
            {aiConflictData.questions.map((question, idx) => (
              <div
                key={idx}
                onClick={() => onToggleIndex(idx)}
                style={{
                  padding: isNarrowScreen ? '0.65rem' : '1rem',
                  borderRadius: '10px',
                  border: '1px solid ' + (selectedAiIndices.includes(idx) ? 'var(--text-bright)' : 'var(--border-strong)'),
                  background: selectedAiIndices.includes(idx) ? 'rgba(59, 130, 246, 0.1)' : 'var(--bg-deep)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  position: 'relative',
                }}
              >
                <div style={{ position: 'absolute', right: '1rem', top: '1rem' }}>
                  <input
                    type="checkbox"
                    checked={selectedAiIndices.includes(idx)}
                    readOnly
                    style={{ width: '1.2rem', height: '1.2rem', accentColor: 'var(--text-bright)' }}
                  />
                </div>
                <div style={{ marginLeft: '1.5rem', marginRight: '2rem' }}>
                  <p style={{ margin: '0 0 0.35rem', color: 'var(--text)', fontWeight: 700, fontSize: isNarrowScreen ? '0.88rem' : '1rem', textAlign: 'right' }}>{question.text}</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                    {question.options?.map((opt, i) => (
                      <div key={i} style={{
                        fontSize: isNarrowScreen ? '0.78rem' : '0.85rem',
                        color: (question.correctIndex ?? 0) === i ? '#10b981' : 'var(--text-muted)',
                        fontWeight: (question.correctIndex ?? 0) === i ? 700 : 400,
                        textAlign: 'right',
                      }}>
                        • {opt}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: isNarrowScreen ? '0.75rem' : '1rem', borderTop: '1px solid var(--border)', background: 'var(--bg-deep)', borderBottomLeftRadius: '16px', borderBottomRightRadius: '16px', flexShrink: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
            <span style={{ color: 'var(--text-mid)', fontWeight: 700, fontSize: isNarrowScreen ? '0.82rem' : '1rem' }}>تم اختيار {selectedAiIndices.length} من {aiConflictData.questions.length}</span>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {existingQuestionsCount > 0 ? (
                <>
                  <button
                    onClick={() => onResolve('append')}
                    style={{ padding: isNarrowScreen ? '0.55rem 0.75rem' : '0.7rem 1.2rem', borderRadius: '8px', background: 'var(--text-bright)', color: 'var(--bg-deep)', border: 'none', fontWeight: 800, cursor: 'pointer', fontSize: isNarrowScreen ? '0.78rem' : '0.9rem' }}
                  >➕ إضافة</button>
                  <button
                    onClick={() => onResolve('replace')}
                    style={{ padding: isNarrowScreen ? '0.55rem 0.75rem' : '0.7rem 1.2rem', borderRadius: '8px', background: '#ef4444', color: 'white', border: 'none', fontWeight: 800, cursor: 'pointer', fontSize: isNarrowScreen ? '0.78rem' : '0.9rem' }}
                  >🔄 استبدال</button>
                  <button
                    onClick={() => onResolve('new')}
                    style={{ padding: isNarrowScreen ? '0.55rem 0.75rem' : '0.7rem 1.2rem', borderRadius: '8px', background: '#7c3aed', color: 'white', border: 'none', fontWeight: 800, cursor: 'pointer', fontSize: isNarrowScreen ? '0.78rem' : '0.9rem' }}
                  >✨ اختبار جديد</button>
                </>
              ) : (
                <button
                  onClick={() => onResolve('append')}
                  style={{ padding: isNarrowScreen ? '0.55rem 1.25rem' : '0.7rem 2rem', borderRadius: '8px', background: 'var(--text-bright)', color: 'var(--bg-deep)', border: 'none', fontWeight: 800, cursor: 'pointer' }}
                >تأكيد الإضافة ✨</button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}