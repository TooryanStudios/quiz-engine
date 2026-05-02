import { createPortal } from 'react-dom'
import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import type {
  BibleDraft,
  CharacterCard,
  ToorGenAspectRatio,
  ToorGenGenerationMode,
  ToorGenGenerationStatus,
  ToorGenModel,
} from './ToorGenFlowCanvas'

type RefKind = 'image' | 'video'

type Props = {
  open: boolean
  title: string
  description: string
  status: ToorGenGenerationStatus
  availableCredits?: number | null
  consumedCredits?: number | null
  creditsLoading: boolean
  onRefreshCredits: () => void
  draft: BibleDraft | null
  setDraft: Dispatch<SetStateAction<BibleDraft | null>>
  selectedVideoUrl: string
  isGenerating: boolean
  model: ToorGenModel
  mode: ToorGenGenerationMode
  duration: number
  aspectRatio: ToorGenAspectRatio
  resumeTaskId: string
  onResumeTaskIdChange: (value: string) => void
  onResume: () => void
  onClose: () => void
  onSave: () => void
  refFieldUploading?: string | null
  refFieldUploadError?: string
  onUploadRefFile?: (slot: string, kind: RefKind, file: File) => Promise<void> | void
  onRequestPick?: (kind: RefKind, slot: string) => void
  charPhotoUploading?: Record<string, boolean>
  onUploadCharacterPhoto?: (cardId: string, file: File) => Promise<void> | void
  onRequestPickCharacterPhoto?: (cardId: string) => void
}

function createDraftCharacterCard(partial: Partial<CharacterCard> = {}): CharacterCard {
  return {
    id: partial.id || `char-${typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36)}`,
    name: partial.name || '',
    role: partial.role || '',
    appearance: partial.appearance || '',
    notes: partial.notes || '',
    photos: Array.isArray(partial.photos) ? partial.photos.filter((p) => typeof p === 'string' && p.trim()) : [],
  }
}

export function ToorGenBibleDefaultsDialog({
  open,
  title,
  description,
  status,
  availableCredits,
  consumedCredits,
  creditsLoading,
  onRefreshCredits,
  draft,
  setDraft,
  selectedVideoUrl,
  isGenerating,
  model,
  mode,
  duration,
  aspectRatio,
  resumeTaskId,
  onResumeTaskIdChange,
  onResume,
  onClose,
  onSave,
  refFieldUploading = null,
  refFieldUploadError = '',
  onUploadRefFile,
  onRequestPick,
  charPhotoUploading = {},
  onUploadCharacterPhoto,
  onRequestPickCharacterPhoto,
}: Props) {
  const [section, setSection] = useState<'shot' | 'style' | 'characters' | 'output'>('shot')
  const [pendingDeleteCardId, setPendingDeleteCardId] = useState<string | null>(null)
  const imageFileRef = useRef<HTMLInputElement>(null)
  const videoFileRef = useRef<HTMLInputElement>(null)
  const pendingUploadSlotRef = useRef<string>('')

  useEffect(() => {
    if (!open) return
    setSection('shot')
    setPendingDeleteCardId(null)
  }, [open])

  if (!open || !draft || typeof document === 'undefined') return null

  const requestUpload = (slot: string, kind: RefKind) => {
    pendingUploadSlotRef.current = slot
    if (kind === 'image') imageFileRef.current?.click()
    else videoFileRef.current?.click()
  }

  const handleRefFileChange = async (kind: RefKind, file: File | null) => {
    if (!file || !onUploadRefFile) return
    await onUploadRefFile(pendingUploadSlotRef.current, kind, file)
  }

  return createPortal(
    <div
      className="tgfc-defaults-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <div className="tgfc-defaults-dialog" role="dialog" aria-modal="true" aria-label="Bible & Defaults">
        <header className="tgfc-defaults-header">
          <div className="tgfc-defaults-header-title">
            <span className="tgfc-defaults-kicker">BIBLE &amp; DEFAULTS</span>
            <h3>{title || 'Collection'}</h3>
            <p>{description}</p>
          </div>
          <div className="tgfc-defaults-header-meta">
            {typeof availableCredits === 'number' ? (
              <span className="tgfc-credit-badge tgfc-credit-badge--available">{availableCredits} credits available</span>
            ) : null}
            {typeof consumedCredits === 'number' ? <span className="tgfc-credit-badge">{consumedCredits} used this session</span> : null}
            <button type="button" className="tgfc-credits-refresh" onClick={() => void onRefreshCredits()} disabled={creditsLoading} title="Refresh credit balance">
              {creditsLoading ? '…' : '↻'}
            </button>
            <span className={`tgfc-defaults-status-badge is-${status.toLowerCase()}`}>{status}</span>
            <button type="button" className="tgfc-defaults-close" onClick={onClose}>Close</button>
          </div>
        </header>
        <div className="tgfc-defaults-body">
          <nav className="tgfc-defaults-nav" aria-label="Settings sections">
            <button type="button" className={`tgfc-defaults-nav-item${section === 'shot' ? ' is-active' : ''}`} onClick={() => setSection('shot')}>
              <span className="tgfc-defaults-nav-icon">◎</span>
              <span className="tgfc-defaults-nav-label">Shot Setup</span>
              <span className="tgfc-defaults-nav-sub">Prompt, refs, instructions</span>
            </button>
            <button type="button" className={`tgfc-defaults-nav-item${section === 'style' ? ' is-active' : ''}`} onClick={() => setSection('style')}>
              <span className="tgfc-defaults-nav-icon">◈</span>
              <span className="tgfc-defaults-nav-label">Style</span>
              <span className="tgfc-defaults-nav-sub">Prefix, story bible</span>
            </button>
            <button type="button" className={`tgfc-defaults-nav-item${section === 'characters' ? ' is-active' : ''}`} onClick={() => setSection('characters')}>
              <span className="tgfc-defaults-nav-icon">◉</span>
              <span className="tgfc-defaults-nav-label">Characters</span>
              <span className="tgfc-defaults-nav-sub">Photos &amp; appearance cards</span>
            </button>
            <button type="button" className={`tgfc-defaults-nav-item${section === 'output' ? ' is-active' : ''}`} onClick={() => setSection('output')}>
              <span className="tgfc-defaults-nav-icon">⊞</span>
              <span className="tgfc-defaults-nav-label">Output</span>
              <span className="tgfc-defaults-nav-sub">Model, duration, format</span>
            </button>
          </nav>

          <div className="tgfc-defaults-content">
            {section === 'shot' && (
              <div className="tgfc-defaults-section">
                <div className="tgfc-defaults-section-head">
                  <span className="tgfc-defaults-section-kicker">Shot Setup</span>
                  <h4>Default prompt &amp; references</h4>
                  <p>These values are used as fallbacks when a generation has no connected or manually attached inputs.</p>
                </div>
                <div className="tgfc-defaults-fields">
                  <label className="tgfc-field">
                    <span>Fallback prompt</span>
                    <textarea value={draft.prompt} onChange={(event) => setDraft((d) => d ? { ...d, prompt: event.target.value } : d)} rows={4} placeholder="Describe the default scene, action, camera, lighting, and style..." />
                  </label>
                  <div className="tgfc-field">
                    <span>Image1 — reference image</span>
                    <p className="tgfc-field-hint">Used as the main attached still when present.</p>
                    <div className="tgfc-ref-input-row">
                      <input value={draft.fallbackImageUrl} onChange={(event) => setDraft((d) => d ? { ...d, fallbackImageUrl: event.target.value } : d)} placeholder="https://image-reference.jpg" />
                      {onUploadRefFile ? <button type="button" className="tgfc-ref-btn" disabled={refFieldUploading === 'image1'} onClick={() => requestUpload('image1', 'image')}>{refFieldUploading === 'image1' ? '…' : '↑ Upload'}</button> : null}
                      {onRequestPick ? <button type="button" className="tgfc-ref-btn" onClick={() => onRequestPick('image', 'image1')}>Library</button> : null}
                    </div>
                    {refFieldUploadError && refFieldUploading === null ? <p className="tgfc-field-hint" style={{ color: '#ffb2b2' }}>{refFieldUploadError}</p> : null}
                  </div>
                  <hr className="tgfc-defaults-section-rule" />
                  <div className="tgfc-field">
                    <span>Video1 — motion reference</span>
                    <div className="tgfc-ref-input-row">
                      <input value={draft.fallbackVideoUrl} onChange={(event) => setDraft((d) => d ? { ...d, fallbackVideoUrl: event.target.value } : d)} placeholder="https://motion-reference.mp4" />
                      {onUploadRefFile ? <button type="button" className="tgfc-ref-btn" disabled={refFieldUploading === 'video1'} onClick={() => requestUpload('video1', 'video')}>{refFieldUploading === 'video1' ? '…' : '↑ Upload'}</button> : null}
                      {onRequestPick ? <button type="button" className="tgfc-ref-btn" onClick={() => onRequestPick('video', 'video1')}>Pick</button> : null}
                    </div>
                  </div>
                  <div className="tgfc-field">
                    <span>Video2 — optional additional video reference</span>
                    <div className="tgfc-ref-input-row">
                      <input value={draft.fallbackVideoUrl2} onChange={(event) => setDraft((d) => d ? { ...d, fallbackVideoUrl2: event.target.value } : d)} placeholder="https://style-reference.mp4" />
                      {onUploadRefFile ? <button type="button" className="tgfc-ref-btn" disabled={refFieldUploading === 'video2'} onClick={() => requestUpload('video2', 'video')}>{refFieldUploading === 'video2' ? '…' : '↑ Upload'}</button> : null}
                      {onRequestPick ? <button type="button" className="tgfc-ref-btn" onClick={() => onRequestPick('video', 'video2')}>Pick</button> : null}
                    </div>
                  </div>
                  <div className="tgfc-field">
                    <span>Video3 — optional additional video reference</span>
                    <div className="tgfc-ref-input-row">
                      <input value={draft.fallbackVideoUrl3} onChange={(event) => setDraft((d) => d ? { ...d, fallbackVideoUrl3: event.target.value } : d)} placeholder="https://pace-reference.mp4" />
                      {onUploadRefFile ? <button type="button" className="tgfc-ref-btn" disabled={refFieldUploading === 'video3'} onClick={() => requestUpload('video3', 'video')}>{refFieldUploading === 'video3' ? '…' : '↑ Upload'}</button> : null}
                      {onRequestPick ? <button type="button" className="tgfc-ref-btn" onClick={() => onRequestPick('video', 'video3')}>Pick</button> : null}
                    </div>
                  </div>
                  <hr className="tgfc-defaults-section-rule" />
                  <label className="tgfc-field">
                    <span>Audio1</span>
                    <input value={draft.fallbackAudioUrls[0]} onChange={(event) => setDraft((d) => d ? { ...d, fallbackAudioUrls: [event.target.value, d.fallbackAudioUrls[1], d.fallbackAudioUrls[2]] } : d)} placeholder="https://score.mp3" />
                  </label>
                  <label className="tgfc-field">
                    <span>Audio2</span>
                    <input value={draft.fallbackAudioUrls[1]} onChange={(event) => setDraft((d) => d ? { ...d, fallbackAudioUrls: [d.fallbackAudioUrls[0], event.target.value, d.fallbackAudioUrls[2]] } : d)} placeholder="https://ambient.mp3" />
                  </label>
                  <label className="tgfc-field">
                    <span>Audio3</span>
                    <input value={draft.fallbackAudioUrls[2]} onChange={(event) => setDraft((d) => d ? { ...d, fallbackAudioUrls: [d.fallbackAudioUrls[0], d.fallbackAudioUrls[1], event.target.value] } : d)} placeholder="https://foley.mp3" />
                  </label>
                  <hr className="tgfc-defaults-section-rule" />
                  <label className="tgfc-field">
                    <span>Other instructions</span>
                    <input value={draft.otherInstructions} onChange={(event) => setDraft((d) => d ? { ...d, otherInstructions: event.target.value } : d)} placeholder="Weather, mood, constraints, forbidden elements..." />
                  </label>
                </div>
              </div>
            )}

            {section === 'style' && (
              <div className="tgfc-defaults-section">
                <div className="tgfc-defaults-section-head">
                  <span className="tgfc-defaults-section-kicker">Style</span>
                  <h4>Continuity, prefix &amp; story bible</h4>
                  <p>Write it once, apply it everywhere.</p>
                </div>
                <div className="tgfc-defaults-fields">
                  <label className="tgfc-field">
                    <span>Continuity block</span>
                    <p className="tgfc-field-hint">Prepended to every generation. Defines how character identity and style are locked across shots.</p>
                    <textarea value={draft.continuityBlock} onChange={(event) => setDraft((d) => d ? { ...d, continuityBlock: event.target.value } : d)} rows={5} placeholder="Continuity lock for the full clip..." />
                    <p className="tgfc-field-count">{(draft.continuityBlock || '').length.toLocaleString()} characters</p>
                  </label>
                  <label className="tgfc-field">
                    <span>Style prefix</span>
                    <textarea value={draft.stylePrefix} onChange={(event) => setDraft((d) => d ? { ...d, stylePrefix: event.target.value } : d)} rows={6} placeholder="STYLE: anamorphic, ARRI ALEXA, heavy 35mm grain..." />
                    <p className="tgfc-field-count">{draft.stylePrefix.length.toLocaleString()} characters</p>
                  </label>
                  <label className="tgfc-field">
                    <span>Story bible constraints</span>
                    <textarea value={draft.storyBible} onChange={(event) => setDraft((d) => d ? { ...d, storyBible: event.target.value } : d)} rows={6} placeholder="World rules, tone, narrative continuity..." />
                    <p className="tgfc-field-count">{draft.storyBible.length.toLocaleString()} characters</p>
                  </label>
                </div>
              </div>
            )}

            {section === 'characters' && (
              <div className="tgfc-defaults-section">
                <div className="tgfc-defaults-section-head">
                  <span className="tgfc-defaults-section-kicker">Characters</span>
                  <h4>Character bible</h4>
                  <p>Character cards and photos are reused across generations.</p>
                </div>
                <div className="tgfc-character-editor">
                  <div className="tgfc-character-editor-head">
                    <div />
                    <button type="button" onClick={() => setDraft((d) => d ? { ...d, characterCards: [...d.characterCards, createDraftCharacterCard()].slice(0, 8) } : d)} disabled={draft.characterCards.length >= 8}>Add character</button>
                  </div>
                  <div className="tgfc-character-list">
                    {draft.characterCards.map((card, index) => (
                      <section key={card.id} className="tgfc-character-card">
                        <div className="tgfc-character-card-head">
                          <strong>Character {index + 1}{card.name ? ` — ${card.name}` : ''}</strong>
                          {pendingDeleteCardId === card.id ? (
                            <div className="tgfc-char-confirm-delete">
                              <span>Remove character?</span>
                              <button type="button" className="tgfc-char-confirm-yes" onClick={() => {
                                setDraft((d) => {
                                  if (!d) return d
                                  const next = d.characterCards.filter((c) => c.id !== card.id)
                                  return { ...d, characterCards: next.length > 0 ? next : [createDraftCharacterCard()] }
                                })
                                setPendingDeleteCardId(null)
                              }}>Delete</button>
                              <button type="button" className="tgfc-char-confirm-cancel" onClick={() => setPendingDeleteCardId(null)}>Cancel</button>
                            </div>
                          ) : (
                            <button type="button" className="tgfc-char-delete-btn" onClick={() => setPendingDeleteCardId(card.id)} aria-label={`Remove character ${index + 1}`}>✕</button>
                          )}
                        </div>
                        <div className="tgfc-character-card-grid">
                          <label className="tgfc-field tgfc-character-field">
                            <span>Name</span>
                            <input value={card.name} onChange={(event) => setDraft((d) => d ? { ...d, characterCards: d.characterCards.map((c) => c.id === card.id ? { ...c, name: event.target.value } : c) } : d)} placeholder="Wisam, Amina, Leo..." />
                          </label>
                          <label className="tgfc-field tgfc-character-field">
                            <span>Role</span>
                            <input value={card.role} onChange={(event) => setDraft((d) => d ? { ...d, characterCards: d.characterCards.map((c) => c.id === card.id ? { ...c, role: event.target.value } : c) } : d)} placeholder="Protagonist, rival, guide..." />
                          </label>
                        </div>
                        <div className="tgfc-char-photos">
                          <span className="tgfc-char-photos-label">Reference photos ({(card.photos || []).length}/5)</span>
                          <div className="tgfc-char-photos-strip">
                            {(card.photos || []).map((photoUrl, photoIndex) => (
                              <div key={photoIndex} className="tgfc-char-photo-thumb">
                                <img src={photoUrl} alt={`${card.name || 'Character'} photo ${photoIndex + 1}`} />
                                <button type="button" className="tgfc-char-photo-remove" aria-label="Remove photo" onClick={() => setDraft((d) => d ? { ...d, characterCards: d.characterCards.map((c) => c.id === card.id ? { ...c, photos: (c.photos || []).filter((_, i) => i !== photoIndex) } : c) } : d)}>✕</button>
                              </div>
                            ))}
                            {(card.photos || []).length < 5 && (
                              <>
                                {onUploadCharacterPhoto ? (
                                  <label className={`tgfc-char-photo-add${charPhotoUploading[card.id] ? ' is-loading' : ''}`} title="Upload reference photo">
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="tgfc-hidden-file"
                                      disabled={charPhotoUploading[card.id]}
                                      onChange={(event) => {
                                        const file = event.target.files?.[0]
                                        if (file) void onUploadCharacterPhoto(card.id, file)
                                        event.target.value = ''
                                      }}
                                    />
                                    {charPhotoUploading[card.id] ? '…' : '+'}
                                  </label>
                                ) : null}
                                {onRequestPickCharacterPhoto ? (
                                  <button type="button" className="tgfc-char-photo-add tgfc-char-photo-library" aria-label="Pick character photo from library" title="Pick from library" onClick={() => onRequestPickCharacterPhoto(card.id)}>
                                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                      <circle cx="8.5" cy="8.5" r="1.5" />
                                      <polyline points="21 15 16 10 5 21" />
                                    </svg>
                                  </button>
                                ) : null}
                              </>
                            )}
                          </div>
                        </div>
                        <label className="tgfc-field tgfc-character-field">
                          <span>Appearance notes</span>
                          <textarea value={card.appearance} onChange={(event) => setDraft((d) => d ? { ...d, characterCards: d.characterCards.map((c) => c.id === card.id ? { ...c, appearance: event.target.value } : c) } : d)} rows={2} />
                        </label>
                        <label className="tgfc-field tgfc-character-field">
                          <span>Notes</span>
                          <textarea value={card.notes} onChange={(event) => setDraft((d) => d ? { ...d, characterCards: d.characterCards.map((c) => c.id === card.id ? { ...c, notes: event.target.value } : c) } : d)} rows={2} />
                        </label>
                      </section>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {section === 'output' && (
              <div className="tgfc-defaults-section">
                <div className="tgfc-defaults-section-head">
                  <span className="tgfc-defaults-section-kicker">Output</span>
                  <h4>Model &amp; format defaults</h4>
                  <p>These apply globally unless a surface overrides them.</p>
                </div>
                <div className="tgfc-defaults-fields">
                  <div className="tgfc-inline-preview">
                    {selectedVideoUrl ? <video key={selectedVideoUrl} controls playsInline src={selectedVideoUrl} /> : isGenerating ? <div>Rendering...</div> : <div>No preview yet</div>}
                  </div>
                  <div className="tgfc-defaults-output-grid">
                    <label className="tgfc-field">
                      <span>Model</span>
                      <select value={draft.model ?? model} onChange={(event) => setDraft((d) => d ? { ...d, model: event.target.value as ToorGenModel } : d)}>
                        <option value="atlas-2.0">Seedance 2.0 (Atlas Cloud)</option>
                        <option value="seedance-2.0-fast">Seedance 2.0 Fast (Atlas Cloud)</option>
                        <option value="seedance-2.0">Seedance 2.0 (Seedance API)</option>
                        <option value="seedance-api-2.0-fast">Seedance 2.0 Fast (Seedance API)</option>
                        <option value="seedance-1.5">Seedance 1.5 (Seedance API, 720p)</option>
                      </select>
                    </label>
                    <label className="tgfc-field">
                      <span>Generation mode</span>
                      <select value={draft.mode ?? mode} onChange={(event) => setDraft((d) => d ? { ...d, mode: event.target.value as ToorGenGenerationMode } : d)}>
                        <option value="text-to-video">Text to video</option>
                        <option value="image-to-video">Image to video</option>
                      </select>
                    </label>
                    <label className="tgfc-field">
                      <span>Duration</span>
                      <select value={draft.duration ?? duration} onChange={(event) => setDraft((d) => d ? { ...d, duration: Number(event.target.value) } : d)}>
                        <option value={5}>5 seconds</option>
                        <option value={10}>10 seconds</option>
                        <option value={15}>15 seconds</option>
                      </select>
                    </label>
                    <label className="tgfc-field">
                      <span>Aspect ratio</span>
                      <select value={draft.aspectRatio ?? aspectRatio} onChange={(event) => setDraft((d) => d ? { ...d, aspectRatio: event.target.value as ToorGenAspectRatio } : d)}>
                        <option value="16:9">16:9 — Landscape</option>
                        <option value="9:16">9:16 — Portrait</option>
                        <option value="4:3">4:3 — Classic</option>
                        <option value="3:4">3:4 — Tall classic</option>
                      </select>
                    </label>
                  </div>
                  <div className="tgfc-consistency-tools">
                    <label className="tgfc-consistency-toggle">
                      <input type="checkbox" checked={Boolean(draft.strictConsistencyPreset)} onChange={(event) => setDraft((d) => d ? { ...d, strictConsistencyPreset: event.target.checked } : d)} />
                      <div>
                        <strong>Strict consistency preset</strong>
                        <p>Uses tighter continuity wording and drops lower-priority prompt sections when needed.</p>
                      </div>
                    </label>
                    <label className="tgfc-consistency-toggle">
                      <input type="checkbox" checked={Boolean(draft.autoShotSplit)} onChange={(event) => setDraft((d) => d ? { ...d, autoShotSplit: event.target.checked } : d)} />
                      <div>
                        <strong>Auto shot-splitting helper</strong>
                        <p>When long shot lists are detected, queue multiple clip segments automatically.</p>
                      </div>
                    </label>
                    {draft.autoShotSplit ? (
                      <label className="tgfc-field tgfc-shots-per-segment-field">
                        <span>Shots per segment</span>
                        <select value={draft.shotsPerSegment ?? 3} onChange={(event) => setDraft((d) => d ? { ...d, shotsPerSegment: Number(event.target.value) } : d)}>
                          <option value={1}>1 shot</option>
                          <option value={2}>2 shots</option>
                          <option value={3}>3 shots</option>
                          <option value={4}>4 shots</option>
                          <option value={5}>5 shots</option>
                          <option value={6}>6 shots</option>
                        </select>
                      </label>
                    ) : null}
                  </div>
                  <div className="tgfc-defaults-section-rule" />
                  <label className="tgfc-field">
                    <span>Fetch task by ID</span>
                    <div className="tgfc-resume-row">
                      <input value={resumeTaskId} onChange={(event) => onResumeTaskIdChange(event.target.value)} placeholder="Paste a Seedance task ID to resume polling..." />
                      <button type="button" onClick={onResume} disabled={!resumeTaskId.trim()}>Fetch</button>
                    </div>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
        <footer className="tgfc-defaults-footer">
          <button type="button" className="tgfc-defaults-cancel-btn" onClick={onClose}>Cancel</button>
          <button type="button" className="tgfc-defaults-save-btn" onClick={onSave}>Save changes</button>
        </footer>
      </div>
      <input ref={imageFileRef} type="file" accept="image/*" hidden onChange={(event) => { const file = event.target.files?.[0] || null; event.currentTarget.value = ''; void handleRefFileChange('image', file) }} />
      <input ref={videoFileRef} type="file" accept="video/*" hidden onChange={(event) => { const file = event.target.files?.[0] || null; event.currentTarget.value = ''; void handleRefFileChange('video', file) }} />
    </div>,
    document.body,
  )
}
