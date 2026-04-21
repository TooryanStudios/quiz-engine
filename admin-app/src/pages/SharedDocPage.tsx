import { onSnapshot, query, collection, where, limit } from 'firebase/firestore'
import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import type { Editor as TinyMCEEditor } from 'tinymce'
import { db } from '../lib/firebase'
import { updateWorkhubDocument } from '../lib/workhubRepo'
import type { WorkhubDocument } from '../lib/workhubRepo'
import { TinyRichTextEditor } from '../components/editor/TinyRichTextEditor'
import { WorkhubDocumentAiPanel } from './workhub/components/WorkhubDocumentAiPanel'
import { normalizeDocumentBodyForStorage, toDocumentBodyEditorHtml } from './workhub/docEditorBody'

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(value: unknown): string {
  if (!value) return ''
  try {
    // Firestore Timestamp
    if (typeof value === 'object' && value !== null && 'toDate' in value) {
      return (value as { toDate(): Date }).toDate().toLocaleString('en-GB')
    }
    return new Date(value as string).toLocaleString('en-GB')
  } catch {
    return ''
  }
}

// ── Component ──────────────────────────────────────────────────────────────

export default function SharedDocPage() {
  const { token } = useParams<{ token: string }>()
  const [doc, setDoc] = useState<WorkhubDocument | null | 'not-found' | 'loading'>('loading')
  const [titleDraft, setTitleDraft] = useState('')
  const [bodyDraft, setBodyDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState('')
  const [documentEditor, setDocumentEditor] = useState<TinyMCEEditor | null>(null)
  const lastSyncedDocId = useRef<string | null>(null)

  // ── Subscribe to document by share token via Firestore (live updates) ──
  useEffect(() => {
    if (!token) { setDoc('not-found'); return }

    const q = query(
      collection(db, 'workhub_documents'),
      where('shareToken', '==', decodeURIComponent(token)),
      where('shareEnabled', '==', true),
      limit(1),
    )

    const unsub = onSnapshot(q, (snap) => {
      if (snap.empty) {
        setDoc('not-found')
        return
      }
      const d = { id: snap.docs[0].id, ...snap.docs[0].data() } as WorkhubDocument
      setDoc(d)
      setTitleDraft(d.title)
      // Sync editor body only on initial load or doc id change.
      if (lastSyncedDocId.current !== d.id) {
        lastSyncedDocId.current = d.id
        setBodyDraft(toDocumentBodyEditorHtml(d.body || ''))
        setDocumentEditor(null)
      }
    }, () => {
      setDoc('not-found')
    })

    return unsub
  }, [token])

  async function handleSave() {
    if (!doc || doc === 'loading' || doc === 'not-found') return
    const currentDoc = doc as WorkhubDocument
    if (saving) return
    const bodyHtml = normalizeDocumentBodyForStorage(bodyDraft)
    setSaving(true)
    try {
      await updateWorkhubDocument(currentDoc.id, { title: titleDraft.trim() || currentDoc.title, body: bodyHtml })
      setSaveMessage('Saved')
      setTimeout(() => setSaveMessage(''), 2000)
    } catch (err) {
      setSaveMessage('Save failed')
      setTimeout(() => setSaveMessage(''), 3000)
    } finally {
      setSaving(false)
    }
  }

  // ── Render states ──────────────────────────────────────────────────────────

  if (doc === 'loading') {
    return (
      <div className="shared-doc-shell">
        <div className="shared-doc-loading">Loading document…</div>
      </div>
    )
  }

  if (doc === 'not-found' || doc === null) {
    return (
      <div className="shared-doc-shell">
        <div className="shared-doc-not-found">
          <h1>Document not found</h1>
          <p>This link may have been disabled or is invalid.</p>
        </div>
      </div>
    )
  }

  const isLocked = !!doc.isLocked
  const resolvedDoc = doc as WorkhubDocument
  const savedTitle = resolvedDoc.title
  const savedBody = normalizeDocumentBodyForStorage(toDocumentBodyEditorHtml(resolvedDoc.body || ''))
  const bodyChanged = normalizeDocumentBodyForStorage(bodyDraft) !== savedBody
  const titleChanged = titleDraft.trim() !== savedTitle

  return (
    <div className="shared-doc-shell">
      <header className="shared-doc-header">
        <div className="shared-doc-header-left">
          <span className="shared-doc-brand">QYan WorkHub</span>
          {isLocked && <span className="shared-doc-lock-badge">🔒 Locked</span>}
        </div>
        <div className="shared-doc-header-right">
          {saveMessage && <span className="shared-doc-save-msg">{saveMessage}</span>}
          <button
            type="button"
            className="shared-doc-save-btn"
            disabled={isLocked || saving || (!bodyChanged && !titleChanged)}
            onClick={() => { void handleSave() }}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </header>

      <div className="shared-doc-body">
        <div className="shared-doc-meta">
          {!!resolvedDoc.createdAt && <span>Created: {String(formatDate(resolvedDoc.createdAt))}</span>}
          {!!resolvedDoc.updatedAt && <span>Updated: {String(formatDate(resolvedDoc.updatedAt))}</span>}
        </div>

        <input
          className="shared-doc-title-input"
          value={titleDraft}
          disabled={isLocked}
          placeholder="Document title"
          onChange={(e) => setTitleDraft(e.target.value)}
        />
        <TinyRichTextEditor
          className={`shared-doc-tiny-editor${isLocked ? ' is-locked' : ''}`}
          value={bodyDraft}
          onChange={setBodyDraft}
          disabled={isLocked}
          minHeight={520}
          placeholder="Start writing..."
          onReady={setDocumentEditor}
        />
        <WorkhubDocumentAiPanel
          editor={documentEditor}
          documentTitle={titleDraft.trim() || resolvedDoc.title}
          documentBody={bodyDraft}
          activeTabTitle="Shared document"
          readOnly={isLocked}
          persistenceKey={`shared:${resolvedDoc.id}:${token || 'shared'}`}
        />
      </div>
    </div>
  )
}
