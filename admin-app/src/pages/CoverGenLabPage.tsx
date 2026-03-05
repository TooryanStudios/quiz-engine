import { useEffect, useState } from 'react'
import { getDownloadURL, getMetadata, listAll, ref } from 'firebase/storage'
import { auth, storage } from '../lib/firebase'
import { useToast } from '../lib/ToastContext'
import { generateAndStoreAiCoverImage } from '../lib/ai/coverImage'

export default function CoverGenLabPage() {
  const { showToast } = useToast()
  const [activeTab, setActiveTab] = useState<'generate' | 'history'>('generate')
  const [title, setTitle] = useState('Ramadan Fasting Quiz')
  const [summary, setSummary] = useState('Questions about Ramadan, fasting rules, iftar traditions, and Islamic values for youth.')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedUrl, setGeneratedUrl] = useState('')
  const [storagePath, setStoragePath] = useState('')

  const [historyItems, setHistoryItems] = useState<{ url: string; path: string; time: number }[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)

  const loadHistory = async () => {
    setIsLoadingHistory(true)
    try {
      const uid = auth.currentUser?.uid
      if (!uid) {
        setHistoryItems([])
        return
      }

      const labRef = ref(storage, `quiz-covers/ai/${uid}`)
      const result = await listAll(labRef)

      const items = await Promise.all(
        result.items.map(async (itemRef) => {
          const url = await getDownloadURL(itemRef)
          const meta = await getMetadata(itemRef)
          return {
            url,
            path: itemRef.fullPath,
            time: new Date(meta.timeCreated).getTime(),
          }
        })
      )

      items.sort((a, b) => b.time - a.time)
      setHistoryItems(items)
    } catch (error) {
      console.error('Failed to load history:', error)
      showToast({ message: 'فشل في تحميل السجل', type: 'error' })
    } finally {
      setIsLoadingHistory(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'history' && historyItems.length === 0) {
      void loadHistory()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab])

  const handleGenerate = async () => {
    if (isGenerating) return
    if (!auth.currentUser?.uid) {
      showToast({ message: 'يرجى تسجيل الدخول أولاً', type: 'error' })
      return
    }

    setIsGenerating(true)
    try {
      const { imageUrl, storagePath } = await generateAndStoreAiCoverImage({
        title: title.trim(),
        quizSummary: summary.trim(),
      })

      setGeneratedUrl(imageUrl)
      setStoragePath(storagePath)
      showToast({ message: '✅ تم توليد صورة جديدة وحفظها في Firebase.', type: 'success' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate image.'
      const code = (error as any)?.code as string | undefined
      if (typeof code === 'string' && code.includes('resource-exhausted')) {
        showToast({ message: 'لقد استهلكت جميع رصيدك المجاني. قم بالترقية عبر التحويل البنكي (تفعيل يدوي) للمتابعة.', type: 'error' })
      }
      showToast({ message: `❌ ${message}`, type: 'error' })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <section className="panel" style={{ maxWidth: 980, margin: '0 auto' }}>
      <h2 style={{ marginTop: 0, marginBottom: '0.5rem' }}>🧪 Cover Generation Lab</h2>
      <p style={{ marginTop: 0, color: 'var(--text-mid)' }}>
        Test page for AI image generation + Firebase storage. Provider: Cloud Functions (credits enforced).
      </p>

      <div
        role="tablist"
        aria-label="Cover generation tabs"
        style={{
          display: 'flex',
          gap: '0.35rem',
          marginBottom: '1.25rem',
          padding: '0.35rem',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          background: 'var(--bg-deep)',
          alignItems: 'center',
        }}
      >
        <button
          role="tab"
          aria-selected={activeTab === 'generate'}
          onClick={() => setActiveTab('generate')}
          style={{
            flex: 1,
            background: activeTab === 'generate' ? 'var(--bg-surface)' : 'transparent',
            border: '1px solid ' + (activeTab === 'generate' ? 'var(--border-strong)' : 'transparent'),
            padding: '0.6rem 0.9rem',
            borderRadius: '10px',
            fontWeight: activeTab === 'generate' ? 800 : 600,
            color: activeTab === 'generate' ? 'var(--text-bright)' : 'var(--text-mid)',
            cursor: 'pointer',
            transition: 'all 0.16s ease',
          }}
        >
          ✨ Generate New
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'history'}
          onClick={() => setActiveTab('history')}
          style={{
            flex: 1,
            background: activeTab === 'history' ? 'var(--bg-surface)' : 'transparent',
            border: '1px solid ' + (activeTab === 'history' ? 'var(--border-strong)' : 'transparent'),
            padding: '0.6rem 0.9rem',
            borderRadius: '10px',
            fontWeight: activeTab === 'history' ? 800 : 600,
            color: activeTab === 'history' ? 'var(--text-bright)' : 'var(--text-mid)',
            cursor: 'pointer',
            transition: 'all 0.16s ease',
          }}
        >
          🖼️ History & Gallery
        </button>
      </div>

      {activeTab === 'generate' ? (
        <>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontWeight: 700 }}>Quiz title</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ramadan Fasting Quiz"
                style={{ border: '1px solid var(--border-strong)', borderRadius: 10, padding: '0.7rem', background: 'var(--bg-surface)', color: 'var(--text)' }}
              />
            </label>

            <label style={{ display: 'grid', gap: 6 }}>
              <span style={{ fontWeight: 700 }}>Theme summary</span>
              <textarea
                value={summary}
                onChange={(event) => setSummary(event.target.value)}
                rows={4}
                style={{ border: '1px solid var(--border-strong)', borderRadius: 10, padding: '0.7rem', background: 'var(--bg-surface)', color: 'var(--text)' }}
              />
            </label>

            <button
              type="button"
              onClick={() => { void handleGenerate() }}
              disabled={isGenerating}
              style={{
                borderRadius: 10,
                border: 'none',
                padding: '0.75rem 1rem',
                background: 'linear-gradient(135deg, #2563eb, #7c3aed)',
                color: '#fff',
                fontWeight: 700,
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                opacity: isGenerating ? 0.7 : 1,
              }}
            >
              {isGenerating ? '⏳ Generating...' : '✨ Generate New Cover'}
            </button>
          </div>

          <div style={{ marginTop: '1rem', display: 'grid', gap: '0.35rem' }}>
            <div><b>Model:</b> gpt-image-1 (via Cloud Function)</div>
            <div><b>Pricing:</b> Credits-based (trial credits supported)</div>
          </div>

          {generatedUrl && (
            <div style={{ marginTop: '1rem' }}>
              <div style={{ marginBottom: '0.35rem' }}><b>Firebase path:</b> {storagePath}</div>
              <div style={{ marginBottom: '0.35rem', wordBreak: 'break-all' }}><b>Firebase URL:</b> {generatedUrl}</div>
              <img
                src={generatedUrl}
                alt="Generated cover"
                style={{ width: '100%', maxWidth: 560, borderRadius: 12, border: '1px solid var(--border)' }}
              />
            </div>
          )}
        </>
      ) : (
        <div style={{ display: 'grid', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>Previous Generations</h3>
            <button
              type="button"
              onClick={() => { void loadHistory() }}
              disabled={isLoadingHistory}
              style={{
                padding: '0.4rem 0.8rem',
                fontSize: '0.9rem',
                borderRadius: '10px',
                border: '1px solid var(--border-strong)',
                background: 'transparent',
                color: 'var(--text)',
                cursor: isLoadingHistory ? 'not-allowed' : 'pointer',
                opacity: isLoadingHistory ? 0.6 : 1,
                fontWeight: 700,
              }}
            >
              {isLoadingHistory ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {isLoadingHistory && historyItems.length === 0 ? (
            <p>Loading gallery...</p>
          ) : historyItems.length === 0 ? (
            <p style={{ color: 'var(--text-mid)' }}>No images found in lab history.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
              {historyItems.map((item) => (
                <div key={item.path} style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', background: 'var(--bg-elevated)' }}>
                  <img
                    src={item.url}
                    alt="History"
                    style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }}
                    loading="lazy"
                  />
                  <div style={{ padding: '0.5rem', fontSize: '0.75rem', color: 'var(--text-mid)', wordBreak: 'break-all' }}>
                    {item.path.split('/').pop()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
