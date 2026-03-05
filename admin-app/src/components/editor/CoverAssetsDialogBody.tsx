import { useEffect, useMemo, useState } from 'react'
import { collection, getDocs, limit, query, where } from 'firebase/firestore'
import { getDownloadURL, getMetadata, listAll, ref } from 'firebase/storage'
import { auth, db, storage } from '../../lib/firebase'

type Item = { url: string; path: string; time: number; source: 'ai' | 'upload' | 'quiz' }

export function CoverAssetsDialogBody(props: {
  initialSelectedUrl?: string
  onSelect: (url: string) => void
}) {
  const { initialSelectedUrl, onSelect } = props
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedUrl, setSelectedUrl] = useState<string>(initialSelectedUrl || '')

  const uid = auth.currentUser?.uid

  const selectedLabel = useMemo(() => {
    if (!selectedUrl) return 'لا يوجد'
    const hit = items.find((i) => i.url === selectedUrl)
    return hit ? hit.path.split('/').pop() || hit.path : 'تم اختيار صورة'
  }, [items, selectedUrl])

  const loadFromStoragePrefix = async (storagePrefix: string, source: Item['source']) => {
    const baseRef = ref(storage, storagePrefix)
    const result = await listAll(baseRef)
    const items = await Promise.all(
      result.items.map(async (itemRef) => {
        const url = await getDownloadURL(itemRef)
        const meta = await getMetadata(itemRef)
        return { url, path: itemRef.fullPath, time: new Date(meta.timeCreated).getTime(), source }
      })
    )
    return items
  }

  const loadFromMyQuizzes = async (uid: string) => {
    const snap = await getDocs(query(collection(db, 'quizzes'), where('ownerId', '==', uid), limit(200)))
    const items: Item[] = []

    const toMillisMaybe = (value: unknown): number => {
      if (!value || typeof value !== 'object') return 0
      const maybe = value as { toMillis?: unknown }
      if (typeof maybe.toMillis === 'function') {
        try {
          return (maybe.toMillis as () => number)()
        } catch {
          return 0
        }
      }
      return 0
    }

    snap.forEach((docSnap) => {
      const data = docSnap.data() as Record<string, unknown>
      const coverImage = typeof data?.coverImage === 'string' ? data.coverImage.trim() : ''
      if (!coverImage) return
      const title = typeof data?.title === 'string' ? (data.title as string) : ''
      const updatedAtMs = toMillisMaybe(data?.updatedAt)
      const createdAtMs = toMillisMaybe(data?.createdAt)
      items.push({
        url: coverImage,
        path: title ? `quiz:${title}` : `quiz:${docSnap.id}`,
        time: updatedAtMs || createdAtMs || 0,
        source: 'quiz',
      })
    })
    return items
  }

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      if (!uid) {
        setItems([])
        return
      }

      const [aiItems, uploadItems, quizItems] = await Promise.all([
        loadFromStoragePrefix(`quiz-covers/ai/${uid}`, 'ai').catch(() => []),
        loadFromStoragePrefix(`quiz-covers/uploads/${uid}`, 'upload').catch(() => []),
        loadFromMyQuizzes(uid).catch(() => []),
      ])

      const merged = [...aiItems, ...uploadItems, ...quizItems]

      const seen = new Set<string>()
      const deduped: Item[] = []
      for (const item of merged) {
        if (!item?.url) continue
        const key = item.url
        if (seen.has(key)) continue
        seen.add(key)
        deduped.push(item)
      }

      deduped.sort((a, b) => (b.time || 0) - (a.time || 0))
      setItems(deduped)
    } catch (e: unknown) {
      console.error('[CoverAssetsDialogBody] failed to load', e)
      const msg = typeof (e as { message?: unknown } | null | undefined)?.message === 'string'
        ? (e as { message: string }).message
        : 'فشل تحميل الصور'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid])

  if (!uid) {
    return <div style={{ color: 'var(--text-mid)' }}>يرجى تسجيل الدخول أولاً.</div>
  }

  return (
    <div style={{ display: 'grid', gap: '0.75rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem' }}>
        <div style={{ display: 'grid', gap: '0.25rem' }}>
          <div style={{ fontWeight: 800, color: 'var(--text-bright)' }}>مكتبة الغلاف</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-mid)' }}>
            تشمل: صور AI + الصور المرفوعة + الصور المستخدمة في اختباراتك. اضغط لتطبيقها فورًا. الإلغاء يلغي التغييرات.
          </div>
        </div>
        <button
          type="button"
          onClick={() => { void load() }}
          disabled={loading}
          style={{
            padding: '0.45rem 0.8rem',
            borderRadius: '10px',
            border: '1px solid var(--border-strong)',
            background: 'transparent',
            color: 'var(--text)',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            fontWeight: 700,
          }}
        >
          {loading ? '⏳' : 'تحديث'}
        </button>
      </div>

      <div style={{
        padding: '0.65rem 0.75rem',
        borderRadius: '12px',
        border: '1px solid var(--border)',
        background: 'var(--bg-deep)',
        color: 'var(--text-mid)',
        fontSize: '0.85rem',
        wordBreak: 'break-word',
      }}>
        <b style={{ color: 'var(--text)' }}>المحدد:</b> {selectedLabel}
      </div>

      {error && (
        <div style={{ color: '#fda4af', fontSize: '0.9rem' }}>{error}</div>
      )}

      {loading && items.length === 0 ? (
        <div style={{ color: 'var(--text-mid)' }}>⏳ جارٍ التحميل...</div>
      ) : items.length === 0 ? (
        <div style={{ color: 'var(--text-mid)' }}>لا توجد صور محفوظة بعد.</div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: '0.6rem',
          maxHeight: '52vh',
          overflowY: 'auto',
          paddingRight: '0.2rem',
        }}>
          {items.map((item) => {
            const active = item.url === selectedUrl
            const sourceLabel = item.source === 'ai' ? 'AI' : item.source === 'upload' ? 'رفع' : 'مستخدمة'
            return (
              <button
                key={item.path}
                type="button"
                onClick={() => {
                  setSelectedUrl(item.url)
                  onSelect(item.url)
                }}
                style={{
                  border: active ? '2px solid var(--accent)' : '1px solid var(--border)',
                  borderRadius: '12px',
                  overflow: 'hidden',
                  background: 'var(--bg-surface)',
                  cursor: 'pointer',
                  padding: 0,
                  textAlign: 'left',
                  transition: 'all 0.16s ease',
                }}
              >
                <img
                  src={item.url}
                  alt="cover"
                  style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }}
                  loading="lazy"
                />
                <div style={{
                  padding: '0.45rem 0.55rem',
                  fontSize: '0.75rem',
                  color: 'var(--text-mid)',
                  wordBreak: 'break-word',
                  borderTop: '1px solid var(--border)',
                }}>
                  <b style={{ color: 'var(--text)' }}>{sourceLabel}:</b> {item.path.split('/').pop()}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
