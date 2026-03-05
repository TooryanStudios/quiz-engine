import type { ChangeEvent } from 'react'

type AiAction = 'generate' | 'recheck'

type AIFeaturesDialogProps = {
  aiAction: AiAction | null
  isNarrowScreen: boolean
  aiPrompt: string
  aiQuestionCount: number
  isGeneratingAi: boolean
  isUploadingAiFile: boolean
  aiContextFiles: Array<{ name: string; type: string; data: string }>
  questionsCount: number
  onClose: () => void
  onPromptChange: (value: string) => void
  onQuestionCountChange: (count: number) => void
  onAiFileUpload: (event: ChangeEvent<HTMLInputElement>) => void
  onRemoveAiFile: (index: number) => void
  onGenerate: () => void
}

export function AIFeaturesDialog({
  aiAction,
  isNarrowScreen,
  aiPrompt,
  aiQuestionCount,
  isGeneratingAi,
  isUploadingAiFile,
  aiContextFiles,
  questionsCount,
  onClose,
  onPromptChange,
  onQuestionCountChange,
  onAiFileUpload,
  onRemoveAiFile,
  onGenerate,
}: AIFeaturesDialogProps) {
  if (!aiAction) return null

  const generationDisabled = aiAction === 'generate' && !aiPrompt.trim() && aiContextFiles.length === 0

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)', zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(10px)',
      animation: 'fadeIn 0.2s ease-out',
      padding: isNarrowScreen ? '0.5rem' : '1.5rem',
    }}>
      <div style={{
        background: 'var(--bg-surface)', border: '1px solid var(--border-strong)',
        borderRadius: '24px', width: '90%', maxWidth: '540px',
        boxShadow: '0 20px 50px rgba(0,0,0,0.5)', overflow: 'hidden',
        position: 'relative',
        display: 'flex', flexDirection: 'column',
        maxHeight: 'calc(100dvh - 2rem)',
      }}>
        <div style={{ padding: '1.25rem 1.5rem', background: 'linear-gradient(135deg, #7c3aed, #db2777)', color: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', direction: 'rtl', flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
            {aiAction === 'generate' ? '✨ توليد أسئلة بالذكاء الاصطناعي' : '🛡️ تدقيق ذكي ومراجعة الأسئلة'}
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', fontSize: '1.1rem' }}
          >✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: isNarrowScreen ? '1.25rem' : '2rem', position: 'relative', direction: 'rtl', textAlign: 'right' }}>
          {aiAction === 'generate' ? (
            <>
              <p style={{ color: 'var(--text-mid)', fontSize: '0.95rem', marginBottom: '1.5rem', lineHeight: 1.6 }}>
                صِف موضوع الاختبار أو ارفع صوراً، وسيقوم الذكاء الاصطناعي بإنشاء أسئلة لك في ثوانٍ.
                <br />
                <span style={{ color: 'var(--text-muted)', fontSize: '0.9em' }}>
                  تنبيه: قد يخطئ الذكاء الاصطناعي — يرجى مراجعة الأسئلة والإجابات قبل الحفظ.
                </span>
              </p>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.5rem', textTransform: 'uppercase' }}>موضوع أو وصف الأسئلة</label>
                <textarea
                  placeholder="امتحان في الفيزياء للفصل الأول، موضوع الخلية..."
                  value={aiPrompt}
                  onChange={(event) => onPromptChange(event.target.value)}
                  style={{ width: '100%', height: '100px', padding: '1rem', borderRadius: '12px', border: '1.5px solid var(--border-strong)', background: 'var(--bg-deep)', color: 'var(--text)', fontSize: '0.9rem', outline: 'none', transition: 'border-color 0.2s', resize: 'none', textAlign: 'right', direction: 'rtl' }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginBottom: '0.5rem', textTransform: 'uppercase' }}>
                  عدد الأسئلة
                </label>
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {[3, 5, 8, 10, 15].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => onQuestionCountChange(count)}
                      disabled={isGeneratingAi}
                      style={{
                        padding: '0.4rem 0.8rem',
                        borderRadius: '20px',
                        border: '1px solid ' + (aiQuestionCount === count ? 'var(--text-bright)' : 'var(--border-strong)'),
                        background: aiQuestionCount === count ? 'var(--text-bright)' : 'var(--bg-deep)',
                        color: aiQuestionCount === count ? 'var(--bg-deep)' : 'var(--text-mid)',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        cursor: isGeneratingAi ? 'not-allowed' : 'pointer',
                        opacity: isGeneratingAi ? 0.6 : 1,
                      }}
                    >
                      {count} أسئلة
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem', alignItems: 'center', marginBottom: '2rem' }}>
                <label
                  style={{
                    flex: 1, minWidth: '150px', height: '48px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem',
                    borderRadius: '12px', border: '1.5px dashed var(--border-strong)', background: 'var(--bg-deep)',
                    cursor: (isUploadingAiFile || isGeneratingAi) ? 'not-allowed' : 'pointer', color: 'var(--text-muted)', fontSize: '0.85rem',
                    opacity: isGeneratingAi ? 0.6 : 1,
                  }}
                >
                  <input
                    type="file"
                    style={{ display: 'none' }}
                    accept="image/*,application/pdf"
                    multiple
                    onChange={onAiFileUpload}
                    disabled={isUploadingAiFile || isGeneratingAi}
                  />
                  {isGeneratingAi ? '⛔ الإضافة متوقفة أثناء التوليد' : (isUploadingAiFile ? '⏳ جاري التحميل...' : '📷 رفع صور أو PDF')}
                </label>
              </div>

              {aiContextFiles.length > 0 && (
                <div style={{ marginBottom: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', direction: 'rtl' }}>
                  {aiContextFiles.map((file, index) => (
                    <div key={index} style={{
                      background: 'var(--bg-deep)', padding: '0.3rem 0.6rem', borderRadius: '8px',
                      display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--border-strong)',
                      fontSize: '0.8rem', color: 'var(--text-mid)', flexDirection: 'row-reverse',
                    }}>
                      <span style={{ maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {file.type.includes('pdf') ? '📄' : '🖼️'} {file.name}
                      </span>
                      <button
                        onClick={() => onRemoveAiFile(index)}
                        disabled={isGeneratingAi}
                        style={{ background: 'none', border: 'none', color: '#db2777', cursor: isGeneratingAi ? 'not-allowed' : 'pointer', fontWeight: 'bold', opacity: isGeneratingAi ? 0.5 : 1 }}
                      >✕</button>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              <p style={{ color: 'var(--text-mid)', fontSize: '1rem', textAlign: 'center', marginBottom: '2rem', lineHeight: 1.6 }}>
                سيقوم الذكاء الاصطناعي بمراجعة جميع الأسئلة الحالية ({questionsCount}) للتحقق من:
                <br />
                ✅ صحة المعلومات
                <br />
                🛠️ سلامة الصياغة اللغوية
                <br />
                🎯 تدقيق الخيارات والإجابات
              </p>

              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
                <div style={{ height: '4px', width: '200px', background: 'var(--border-strong)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: '40%', background: '#db2777', borderRadius: '2px' }} />
                </div>
              </div>
            </>
          )}
        </div>

        <div style={{ padding: isNarrowScreen ? '0.75rem 1.25rem' : '1rem 2rem', borderTop: '1px solid var(--border-strong)', background: 'var(--bg-surface)', flexShrink: 0, borderBottomLeftRadius: '24px', borderBottomRightRadius: '24px', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          <button
            onClick={onGenerate}
            disabled={isGeneratingAi || generationDisabled}
            style={{
              width: '100%', padding: '1.1rem 1rem', borderRadius: '14px', border: 'none',
              background: generationDisabled ? 'var(--bg-deep)' : 'linear-gradient(135deg, #7c3aed, #db2777)',
              color: generationDisabled ? 'var(--text-muted)' : '#fff',
              fontSize: '1.1rem', fontWeight: 800, cursor: isGeneratingAi ? 'wait' : (generationDisabled ? 'not-allowed' : 'pointer'), transition: 'all 0.2s',
              boxShadow: generationDisabled ? 'none' : '0 4px 15px rgba(124, 58, 237, 0.4)',
              opacity: isGeneratingAi ? 0.7 : 1,
              letterSpacing: '0.3px',
            }}
            onMouseEnter={(event) => {
              if (!isGeneratingAi && !generationDisabled) {
                event.currentTarget.style.transform = 'translateY(-2px)'
                event.currentTarget.style.boxShadow = '0 6px 20px rgba(124, 58, 237, 0.5)'
              }
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.transform = 'translateY(0)'
              if (!generationDisabled) {
                event.currentTarget.style.boxShadow = '0 4px 15px rgba(124, 58, 237, 0.4)'
              }
            }}
          >
            {isGeneratingAi ? '⏳ جاري التوليد...' : (aiAction === 'generate' ? '🚀 ابدأ التوليد' : '🛡️ ابدأ التدقيق')}
          </button>
          <button
            onClick={onClose}
            disabled={isGeneratingAi}
            style={{
              width: '100%', padding: '0.75rem 1rem', borderRadius: '12px',
              border: '1px solid var(--border-strong)',
              background: 'transparent',
              color: 'var(--text-mid)',
              fontSize: '0.95rem', fontWeight: 600,
              cursor: isGeneratingAi ? 'not-allowed' : 'pointer',
              opacity: isGeneratingAi ? 0.4 : 1,
              transition: 'all 0.2s',
            }}
            onMouseEnter={(event) => { if (!isGeneratingAi) event.currentTarget.style.background = 'var(--bg-deep)' }}
            onMouseLeave={(event) => { event.currentTarget.style.background = 'transparent' }}
          >
            ✕ إلغاء
          </button>
        </div>
      </div>
    </div>
  )
}