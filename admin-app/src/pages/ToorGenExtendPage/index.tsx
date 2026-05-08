import { useEffect, useRef, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, doc, getDocs, limit, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { useGenerationRunner } from '../../hooks/useGenerationRunner'
import { auth, db, storage } from '../../lib/firebase'
import { finalizeGeneratedVideoPersistence } from '../../lib/toorgen/generationPersistence'
import './style.css'

const CHATBOT_BASE = import.meta.env.VITE_CHATBOT_API_URL as string | undefined
const buildApiUrl = (path: string) => {
  const base = (CHATBOT_BASE || '').trim().replace(/\/$/, '')
  return base ? `${base}${path}` : path
}

type TaskHistoryEntry = {
  taskId: string
  resultUrl: string
  firebaseVideoUrl?: string
  thumbnailUrl?: string
  sourceVideoUrl?: string
  ownerUid?: string
  prompt: string
  videoUrl: string
  imageUrl: string
  completedAt: number
}

const TASK_HISTORY_STORAGE_KEY = 'toorgen-extend-task-history-v1'
const LAST_RESULT_URL_KEY = 'toorgen-extend-last-result-url-v1'
const FIRESTORE_HISTORY_COLLECTION = 'toorgen_extend_generations'

const PROMPT_TEMPLATES = [
  {
    title: 'Fall and recover',
    prompt: 'Use the source video as the continuation base and the reference image for consistency. A boy slips, falls down, then stands back up naturally. Keep the same character, room, lighting, and camera continuity, and extend the action smoothly.',
  },
  {
    title: 'Book struggle',
    prompt: 'Use the source video as the continuation base and the reference image for identity, wardrobe, and environment. In the room, the character is fighting over the book with tense movement. Continue the scene seamlessly.',
  },
  {
    title: 'Walk and turn',
    prompt: 'Use the source video as the continuation base and the reference image to preserve the same style, lighting, and location. The subject walks forward, pauses, and turns back toward the camera. Extend the motion smoothly.',
  },
  {
    title: 'Pick up object',
    prompt: 'Use the source video as the continuation base and the reference image to hold the visual style steady. The character picks up the object, inspects it closely, and reacts. Keep the same subject and scene continuity.',
  },
  {
    title: 'Camera push-in',
    prompt: 'Use the source video as the continuation base and the reference image to preserve the character, mood, and color palette. The camera slowly pushes in as the scene becomes more intense, then settles back slightly.',
  },
] as const

const readTaskHistory = (): TaskHistoryEntry[] => {
  try {
    const raw = window.localStorage.getItem(TASK_HISTORY_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item): item is TaskHistoryEntry => {
      return Boolean(
        item
        && typeof item === 'object'
        && typeof item.taskId === 'string'
        && typeof item.resultUrl === 'string'
        && typeof item.prompt === 'string'
        && typeof item.videoUrl === 'string'
        && typeof item.imageUrl === 'string'
        && typeof item.completedAt === 'number'
      )
    })
  } catch {
    return []
  }
}

const saveTaskHistory = async (entry: TaskHistoryEntry) => {
  try {
    const next = [entry, ...readTaskHistory().filter((item) => item.taskId !== entry.taskId)].slice(0, 20)
    window.localStorage.setItem(TASK_HISTORY_STORAGE_KEY, JSON.stringify(next))
  } catch {
    // Ignore storage failures.
  }

  try {
    await saveTaskHistoryToFirestore(entry)
  } catch {
    // Keep the local cache even if the Firestore write is temporarily unavailable.
  }
}

const mergeTaskHistories = (...lists: TaskHistoryEntry[][]) => {
  const seenTaskIds = new Set<string>()
  const merged: TaskHistoryEntry[] = []

  for (const list of lists) {
    for (const entry of list) {
      if (seenTaskIds.has(entry.taskId)) continue
      seenTaskIds.add(entry.taskId)
      merged.push(entry)
    }
  }

  return merged
}

const readFirestoreTaskHistory = async (uid: string): Promise<TaskHistoryEntry[]> => {
  const historyRef = collection(db, 'users', uid, FIRESTORE_HISTORY_COLLECTION)
  const historyQuery = query(historyRef, orderBy('completedAt', 'desc'), limit(20))
  const snap = await getDocs(historyQuery)

  return snap.docs
    .map((item) => {
      const data = item.data() as Record<string, unknown>
      if (
        typeof data.resultUrl !== 'string'
        || typeof data.prompt !== 'string'
        || typeof data.videoUrl !== 'string'
        || typeof data.imageUrl !== 'string'
        || typeof data.completedAt !== 'number'
      ) {
        return null
      }

      return {
        taskId: item.id,
        resultUrl: data.resultUrl,
        firebaseVideoUrl: typeof data.firebaseVideoUrl === 'string' ? data.firebaseVideoUrl : undefined,
        thumbnailUrl: typeof data.thumbnailUrl === 'string' ? data.thumbnailUrl : undefined,
        sourceVideoUrl: typeof data.sourceVideoUrl === 'string' ? data.sourceVideoUrl : undefined,
        ownerUid: typeof data.ownerUid === 'string' ? data.ownerUid : uid,
        prompt: data.prompt,
        videoUrl: data.videoUrl,
        imageUrl: data.imageUrl,
        completedAt: data.completedAt,
      } as TaskHistoryEntry
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
}

const saveTaskHistoryToFirestore = async (entry: TaskHistoryEntry) => {
  const uid = auth.currentUser?.uid
  if (!uid) return

  await setDoc(doc(db, 'users', uid, FIRESTORE_HISTORY_COLLECTION, entry.taskId), {
    ...entry,
    ownerUid: uid,
    updatedAt: serverTimestamp(),
  }, { merge: true })
}

const findCachedTaskResult = (taskId: string) => {
  const entry = readTaskHistory().find((item) => item.taskId === taskId)
  if (!entry) return null
  return {
    sourceUrl: entry.resultUrl,
    firebaseUrl: entry.firebaseVideoUrl || '',
    thumbnailUrl: entry.thumbnailUrl || '',
  }
}

const safeJsonParse = (text: string) => {
  try {
    return JSON.parse(text) as Record<string, unknown>
  } catch {
    return null
  }
}

export function ToorGenExtendPage() {
  const [prompt, setPrompt] = useState('')
  
  const [, setVideoFile] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState('https://firebasestorage.googleapis.com/v0/b/qyan-om.firebasestorage.app/o/toorgen-extend%2Fvideo%2Fextend-1777474874393-rjq91asf9oq.mp4?alt=media&token=97442a31-5b22-4223-8e1d-c102d5a9f10a')
  const [isUploadingVideo, setIsUploadingVideo] = useState(false)
  
  const [, setImageFile] = useState<File | null>(null)
  const [imageUrl, setImageUrl] = useState('https://firebasestorage.googleapis.com/v0/b/qyan-om.firebasestorage.app/o/toorgen-extend%2Fimage%2Fextend-1777474919140-22v7xf8jydw.jpg?alt=media&token=4b7bcc36-3fdb-4302-87d5-8f065185bb89')
  const [isUploadingImage, setIsUploadingImage] = useState(false)

  const [statusText, setStatusText] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [resultVideoUrl, setResultVideoUrl] = useState('')
  const [firebaseResultUrl, setFirebaseResultUrl] = useState('')
  const [resultThumbnailUrl, setResultThumbnailUrl] = useState('')
  const [lastResultUrl, setLastResultUrl] = useState<string>(() => {
    try {
      return window.localStorage.getItem(LAST_RESULT_URL_KEY) || ''
    } catch {
      return ''
    }
  })
  const [history, setHistory] = useState<TaskHistoryEntry[]>(() => readTaskHistory())
  const [resumeTaskId, setResumeTaskId] = useState('')
  const [payloadJsonText, setPayloadJsonText] = useState('')
  const [isPayloadEditorDirty, setIsPayloadEditorDirty] = useState(false)
  
  const videoInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const pollingCancelRef = useRef(false)
  const { runGeneration } = useGenerationRunner({ apiBaseUrl: CHATBOT_BASE || '' })

  const buildReferenceAwarePrompt = () => {
    const userPrompt = prompt.trim()
    const sourceVideoLine = videoUrl
      ? `- [Video1] is the source continuation video. Use [Video1] as the base for the full clip extension and keep motion continuity from it. Source video URL: ${videoUrl}`
      : '- [Video1] is the source continuation video. Source video URL: (missing)'
    const imageReferenceLine = imageUrl
      ? `- [Image1] is the main visual reference. Use [Image1] for the character identity, face, age, hair, outfit, and overall identity. Image reference URL: ${imageUrl}`
      : '- [Image1] is the main visual reference. Image reference URL: (missing)'

    return [
      'Continuity lock: keep one consistent character identity across every shot. Do not drift visual style. Use video and image references throughout the full clip.',
      '',
      'Reference routing:',
      sourceVideoLine,
      imageReferenceLine,
      imageUrl
        ? `- [Image2] is a scene/style reference only. Use [Image2] for environment, wardrobe, palette, and mood. Image reference URL: ${imageUrl}`
        : '- [Image2] is a scene/style reference only. Use [Image2] for environment, wardrobe, palette, and mood. Image reference URL: (missing)',
      '',
      'Story:',
      userPrompt || '(empty prompt)',
      '',
      'Characters:',
      '- 1. Wisam | Role: Hero',
      '',
      'Story bible constraints: {"rules":"Cinematic doc. Intentional camera, no random cuts. Secondary motion always present. Soft internal monologue.","env":{"id":"wisam-room","desc":"Bedroom lab. Walls: monster posters. Desk: gem drawings, booklet pages, pencils.","light":"Warm amber left, cool blue right.","no":"No tidy surfaces, overhead light, empty walls."}}',
      '',
      'Keep the scene grounded in the references and extend the actual action from the source video rather than starting a new scene.',
    ].join('\n')
  }

  const buildPayloadPreview = () => ({
    model: 'seedance-2.0-fast',
    mode: 'reference-to-video',
    prompt: buildReferenceAwarePrompt(),
    video_url: videoUrl || '(waiting for upload...)',
    video_urls: videoUrl ? [videoUrl] : ['(waiting for upload...)'],
    images: imageUrl ? [imageUrl] : ['(waiting for upload...)'],
    image_urls: imageUrl ? [imageUrl] : ['(waiting for upload...)'],
    duration: 5,
    aspect_ratio: '16:9',
    resolution: '720',
    public: false,
  })

  useEffect(() => {
    let cancelled = false

    const loadHistory = async (uid: string) => {
      try {
        const firestoreHistory = await readFirestoreTaskHistory(uid)
        if (cancelled) return
        setHistory(mergeTaskHistories(readTaskHistory(), firestoreHistory))
      } catch {
        if (!cancelled) {
          setHistory(readTaskHistory())
        }
      }
    }

    const unsub = onAuthStateChanged(auth, (user) => {
      if (!user?.uid) {
        setHistory(readTaskHistory())
        return
      }

      void loadHistory(user.uid)
    })

    return () => {
      cancelled = true
      unsub()
    }
  }, [])

  const payloadPreview = buildPayloadPreview()
  const payloadPreviewJson = JSON.stringify(payloadPreview, null, 2)

  useEffect(() => {
    if (isPayloadEditorDirty) return
    setPayloadJsonText(payloadPreviewJson)
  }, [isPayloadEditorDirty, payloadPreviewJson])

  const doUploadFile = async (file: File, folder: string): Promise<string> => {
    const ext = file.name.split('.').pop() || (folder === 'image' ? 'png' : 'mp4')
    const filename = `extend-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const sRef = storageRef(storage, `toorgen-extend/${folder}/${filename}`)
    await uploadBytes(sRef, file)
    return getDownloadURL(sRef)
  }

  const setFinalResult = (sourceUrl: string, firebaseUrl?: string, thumbnailUrl?: string) => {
    const displayUrl = firebaseUrl || sourceUrl
    persistResultUrl(displayUrl)
    setFirebaseResultUrl(firebaseUrl || '')
    setResultThumbnailUrl(thumbnailUrl || '')
  }

  const getPlaybackUrl = (url: string): string => {
    if (!url) return url
    if (url.includes('firebasestorage.googleapis.com')) return url
    return `${buildApiUrl('/api/video-proxy')}?url=${encodeURIComponent(url)}`
  }

  const finalizeTaskResult = async (taskId: string, sourceUrl: string, statusPrefix: string) => {
    const finalized = await finalizeGeneratedVideoPersistence<TaskHistoryEntry>({
      sourceUrl,
      storageBasePath: `toorgen-extend/generated/${Date.now()}-${taskId}`,
      apiBaseUrl: CHATBOT_BASE || '',
      captureThumbnail: true,
      buildEntry: ({ completedAt, firebaseVideoUrl, thumbnailUrl }) => ({
        taskId,
        resultUrl: sourceUrl,
        firebaseVideoUrl,
        thumbnailUrl,
        sourceVideoUrl: videoUrl,
        prompt: prompt.trim(),
        videoUrl,
        imageUrl,
        completedAt,
      }),
      persistEntry: saveTaskHistory,
    })

    setStatusText(finalized.storageSaveError
      ? `${statusPrefix} Firebase save failed: ${finalized.storageSaveError}`
      : `${statusPrefix} Saved to Firebase.`)
    setFinalResult(sourceUrl, finalized.firebaseVideoUrl || undefined, finalized.thumbnailUrl || undefined)
    setHistory(readTaskHistory())
  }

  const loadCachedTaskResult = (taskId: string) => {
    const cachedUrl = findCachedTaskResult(taskId)
    if (!cachedUrl) return false
    setResultVideoUrl(cachedUrl.firebaseUrl || cachedUrl.sourceUrl)
    setFirebaseResultUrl(cachedUrl.firebaseUrl || '')
    setResultThumbnailUrl(cachedUrl.thumbnailUrl || '')
    setLastResultUrl(cachedUrl.firebaseUrl || cachedUrl.sourceUrl)
    setStatusText(`Loaded cached result for task ${taskId}`)
    return true
  }

  const persistResultUrl = (url: string) => {
    setResultVideoUrl(url)
    setLastResultUrl(url)
    try {
      window.localStorage.setItem(LAST_RESULT_URL_KEY, url)
    } catch {
      // Ignore storage failures.
    }
  }

  const handleVideoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      setVideoFile(null)
      setVideoUrl('')
      return
    }
    setVideoFile(file)
    setVideoUrl('')
    setIsUploadingVideo(true)
    try {
      const url = await doUploadFile(file, 'video')
      setVideoUrl(url)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      alert(`Video upload failed: ${msg}`)
    } finally {
      setIsUploadingVideo(false)
    }
  }

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) {
      setImageFile(null)
      setImageUrl('')
      return
    }
    setImageFile(file)
    setImageUrl('')
    setIsUploadingImage(true)
    try {
      const url = await doUploadFile(file, 'image')
      setImageUrl(url)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      alert(`Image upload failed: ${msg}`)
    } finally {
      setIsUploadingImage(false)
    }
  }

  const runPolling = async (taskId: string) => {
    pollingCancelRef.current = false
    setIsGenerating(true)
    setStatusText(`Polling status for task ${taskId}...`)
    setResultVideoUrl('')

    if (loadCachedTaskResult(taskId)) {
      setIsGenerating(false)
      return
    }
    
    try {
      let attempts = 0
      let consecutiveStatusErrors = 0
      while (true) {
        attempts++
        await new Promise(resolve => setTimeout(resolve, 5000))

        if (pollingCancelRef.current) {
          setStatusText('Polling stopped.')
          break
        }
        
        const statusRes = await fetch(`${buildApiUrl('/api/seedance/status')}?task_id=${encodeURIComponent(taskId)}&model=seedance-2.0-fast`)
        const rawStatusBody = await statusRes.text()
        const statusData = safeJsonParse(rawStatusBody)

        if (!statusRes.ok) {
          const statusError =
            (statusData?.error as string) ||
            (typeof statusData?.message === 'string' ? statusData.message : '') ||
            rawStatusBody.trim().slice(0, 200)
          if (statusRes.status >= 500 || statusRes.status === 429) {
            consecutiveStatusErrors++
            console.warn(`Status check error (${statusRes.status}):`, statusError, statusData)
            setStatusText(`Status check error (${statusRes.status}): ${statusError || 'unknown error'}. Retry ${consecutiveStatusErrors}/5...`)
            if (consecutiveStatusErrors >= 5) {
              setStatusText(`Task status unavailable after 5 retries (${statusRes.status}): ${statusError || 'unknown'}. Keep the task ID and try again later.`)
              break
            }
            continue
          }
          throw new Error(statusError || `HTTP Status ${statusRes.status}`)
        }

        consecutiveStatusErrors = 0

        if (!statusData) {
          // Ignore transient body parse issues and try again.
          continue
        }

        const rawStatus = ((statusData?.data as any)?.status || statusData?.status || '').toString().toUpperCase()
        
        if (rawStatus.includes('SUCCESS') || rawStatus.includes('COMPLETE') || rawStatus.includes('DONE')) {
          const statusPrefix = `Done! (took ~${attempts * 5}s).`
          setStatusText(`${statusPrefix} Saving the final video to Firebase...`)
          
          console.log("Success payload:", statusData)
          
          // Atlas/Seedance responses may surface the final video in outputs[0]
          // or one of the older url-shaped fields.
          const resultUrl = 
            (statusData?.data as any)?.outputs?.[0] ||
            (statusData?.data as any)?.video?.url || 
            (statusData?.data as any)?.video_url || 
            statusData?.video_url || 
            (statusData?.data as any)?.url || 
            statusData?.url
            
          if (resultUrl) {
            await finalizeTaskResult(taskId, resultUrl as string, statusPrefix)
          } else {
            throw new Error(`Success returned but no video URL found. Data: ${JSON.stringify(statusData)}`)
          }
          break;
        } else if (rawStatus.includes('FAIL') || rawStatus.includes('ERROR')) {
          setStatusText(`Generation failed: ${rawStatus}. Try a different prompt or reference set.`)
          break
        } else {
          setStatusText(`Generating... (${rawStatus || 'PROCESSING'})`)
        }
      }
    } catch (err: any) {
      console.error(err)
      setStatusText(`Error: ${err.message}`)
      alert(`Error: ${err.message}`)
    } finally {
      setIsGenerating(false)
    }
  }

  const submitGenerationPayload = async (payload: Record<string, unknown>) => {
    pollingCancelRef.current = false
    setIsGenerating(true)
    setResultVideoUrl('')
    setFirebaseResultUrl('')
    setResultThumbnailUrl('')
    setLastResultUrl('')
    setStatusText('Submitting generation task...')

    try {
      const completed = await runGeneration({
        endpoint: '/api/seedance/generate',
        body: payload,
        settings: {
          provider: 'atlas',
          model: typeof payload.model === 'string' && payload.model.trim() ? payload.model.trim() : 'seedance-2.0-fast',
          ratio: typeof payload.aspect_ratio === 'string' && payload.aspect_ratio.trim() ? payload.aspect_ratio.trim() : '16:9',
          duration: typeof payload.duration === 'number' ? payload.duration : 5,
          resolution: typeof payload.resolution === 'string' && payload.resolution.trim() ? payload.resolution.trim() : '720',
          generateAudio: Boolean(payload.generate_audio),
        },
      }, {
        onQueued: ({ taskId }) => {
          setResumeTaskId(taskId)
          setStatusText('Task submitted. Polling status...')
        },
        onStatus: (nextStatus) => {
          setStatusText(nextStatus)
        },
        shouldCancel: () => pollingCancelRef.current,
      })

      if (!completed) {
        setStatusText('Polling stopped.')
        return
      }

      const taskId = completed.taskId || `direct-${Date.now()}`
      const elapsedSeconds = Math.max(1, Math.round((completed.receivedAt - completed.submittedAt) / 1000))
      const statusPrefix = `Done! (took ~${elapsedSeconds}s).`
      setStatusText(`${statusPrefix} Saving the final video to Firebase...`)
      await finalizeTaskResult(taskId, completed.resultUrl, statusPrefix)
    } catch (err: any) {
      console.error(err)
      setStatusText(`Error: ${err.message}`)
      alert(`Error: ${err.message}`)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleGenerate = async () => {
    if (!videoUrl) return alert('Please wait for the video to finish uploading.')
    if (!imageUrl) return alert('Please wait for the image anchor to finish uploading.')
    if (!prompt.trim()) return alert('Please enter a prompt.')

    await submitGenerationPayload(buildPayloadPreview())
  }

  const handleSendRawPayload = async () => {
    const rawText = payloadJsonText.trim()
    if (!rawText) return alert('Write or load JSON payload first.')

    let parsedPayload: unknown
    try {
      parsedPayload = JSON.parse(rawText)
    } catch {
      return alert('Payload JSON is invalid. Fix the syntax before sending.')
    }

    if (!parsedPayload || typeof parsedPayload !== 'object' || Array.isArray(parsedPayload)) {
      return alert('Payload JSON must be a JSON object.')
    }

    await submitGenerationPayload(parsedPayload as Record<string, unknown>)
  }

  return (
    <div className="extend-page">
      <h1 style={{ color: '#111' }}>Video Extension</h1>
      <p style={{ color: 'var(--text-mid)', marginBottom: '1rem' }}>
        Simplified video extending using Atlas Cloud Fast.
      </p>
      <div style={{ fontSize: '0.85rem', color: 'var(--text-dim)', marginBottom: '2rem', padding: '0.5rem', background: 'var(--bg-deep)', borderRadius: '6px' }}>
        <strong>Configuration:</strong> Duration = 5 seconds, Aspect Ratio = 16:9, Resolution = 720p
      </div>
      
      <div className="extend-form">
        <div className="extend-field">
          <label>Original Video (to extend)</label>
          <input 
            type="file" 
            accept="video/*" 
            ref={videoInputRef}
            onChange={(e) => void handleVideoChange(e)}
          />
          {isUploadingVideo && <div style={{ fontSize: '0.85rem', color: 'var(--primary)', marginTop: '4px' }}>Uploading...</div>}
          {videoUrl && (
            <div style={{ fontSize: '0.85rem', color: '#4caf50', marginTop: '4px', wordBreak: 'break-all' }}>
              ✓ Uploaded: <a href={videoUrl} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>{videoUrl}</a>
            </div>
          )}
        </div>

        <div className="extend-field">
          <label>Image Anchor (required for consistency)</label>
          <input 
            type="file" 
            accept="image/*" 
            ref={imageInputRef}
            onChange={(e) => void handleImageChange(e)}
          />
          {isUploadingImage && <div style={{ fontSize: '0.85rem', color: 'var(--primary)', marginTop: '4px' }}>Uploading...</div>}
          {imageUrl && (
            <div style={{ fontSize: '0.85rem', color: '#4caf50', marginTop: '4px', wordBreak: 'break-all' }}>
              ✓ Uploaded: <a href={imageUrl} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>{imageUrl}</a>
            </div>
          )}
        </div>

        <div className="extend-field">
          <label>Prompt</label>
          <div style={{ display: 'grid', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)' }}>
              Quick templates for source-video extension and reference-image testing.
            </div>
            <div style={{ display: 'grid', gap: '0.5rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
              {PROMPT_TEMPLATES.map((template) => (
                <button
                  key={template.title}
                  type="button"
                  onClick={() => setPrompt(template.prompt)}
                  style={{
                    textAlign: 'left',
                    background: '#f5f7fb',
                    color: '#111',
                    border: '1px solid #d8e0ee',
                    borderRadius: '8px',
                    padding: '0.7rem 0.85rem',
                    cursor: 'pointer',
                    boxShadow: '0 1px 0 rgba(0,0,0,0.03)',
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', marginBottom: '0.3rem' }}>{template.title}</div>
                  <div style={{ fontSize: '0.75rem', lineHeight: 1.4, color: '#444' }}>{template.prompt}</div>
                </button>
              ))}
            </div>
          </div>
          <textarea 
            className="extend-textarea"
            style={{ color: '#000', backgroundColor: '#fff' }}
            placeholder="Type what happens next..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
        </div>

        <div className="extend-field" style={{ background: '#1e1e1e', padding: '1rem', borderRadius: '4px', border: '1px solid #333', position: 'relative' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
            <label style={{ color: '#aaa', margin: 0 }}>Payload Preview</label>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button 
                onClick={() => {
                  setPayloadJsonText(payloadPreviewJson)
                  setIsPayloadEditorDirty(false)
                  alert('Loaded configured payload into the JSON editor.')
                }}
                style={{
                  background: '#2f2f2f',
                  color: 'white',
                  border: '1px solid #555',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                Load configured JSON
              </button>
              <button 
                onClick={() => {
                  void navigator.clipboard.writeText(payloadPreviewJson)
                  alert('Copied payload to clipboard!')
                }}
                style={{
                  background: 'var(--primary)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 8px',
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                Copy JSON
              </button>
            </div>
          </div>
          <textarea
            value={payloadJsonText}
            onChange={(event) => {
              setPayloadJsonText(event.target.value)
              setIsPayloadEditorDirty(true)
            }}
            spellCheck={false}
            style={{
              width: '100%',
              minHeight: '280px',
              resize: 'vertical',
              padding: '0.75rem',
              borderRadius: '8px',
              border: '1px solid #334155',
              background: '#0f172a',
              color: '#d1fae5',
              fontFamily: 'Consolas, Monaco, monospace',
              fontSize: '0.8rem',
              lineHeight: 1.5,
              boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
              Edit the JSON directly, then send it as-is to the API.
            </div>
            <button
              type="button"
              onClick={() => void handleSendRawPayload()}
              disabled={isGenerating || !payloadJsonText.trim() || isUploadingVideo || isUploadingImage}
              style={{
                background: 'linear-gradient(135deg, #2563eb, #4f46e5)',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '0.55rem 0.9rem',
                fontSize: '0.8rem',
                cursor: 'pointer',
                boxShadow: '0 8px 20px rgba(37, 99, 235, 0.25)',
              }}
            >
              Send JSON to API
            </button>
          </div>
        </div>

        <button 
          className="extend-btn"
          onClick={() => void handleGenerate()}
          disabled={isGenerating || !videoUrl || !imageUrl || !prompt.trim() || isUploadingVideo || isUploadingImage}
        >
          {isGenerating ? 'Extending...' : 'Extend Video'}
        </button>

        <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--bg-deep)', borderRadius: '4px', border: '1px solid #333' }}>
          <label style={{ display: 'block', fontSize: '0.85rem', color: '#aaa', marginBottom: '0.5rem' }}>Resume Previous Task</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input 
              type="text" 
              placeholder="Paste Task ID here..."
              value={resumeTaskId}
              onChange={(e) => setResumeTaskId(e.target.value)}
              style={{ flex: 1, padding: '0.5rem', background: '#fff', color: '#000', border: '1px solid #fff', borderRadius: '4px' }}
            />
            <button 
              onClick={() => {
                if (!resumeTaskId.trim()) return alert('Enter a task ID to check.')
                void runPolling(resumeTaskId.trim())
              }}
              disabled={isGenerating || !resumeTaskId.trim()}
              style={{
                background: 'var(--primary)',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '0.5rem 1rem',
                cursor: 'pointer'
              }}
            >
              Check Status
            </button>
          </div>
        </div>

        {statusText && (
          <div className="extend-status" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
            <span>{statusText}</span>
            {isGenerating && (
              <button
                type="button"
                onClick={() => { pollingCancelRef.current = true }}
                style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', padding: '0.3rem 0.6rem', fontSize: '0.8rem', cursor: 'pointer', flexShrink: 0 }}
              >
                Stop
              </button>
            )}
          </div>
        )}

        {(resultVideoUrl || lastResultUrl) && (
          <div className="extend-result">
            <h3>Result:</h3>
            <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'minmax(220px, 320px) minmax(0, 1fr)', alignItems: 'start' }}>
              <div style={{ display: 'grid', gap: '0.5rem' }}>
                {resultThumbnailUrl ? (
                  <img
                    src={resultThumbnailUrl}
                    alt="Generated video thumbnail"
                    style={{ width: '100%', borderRadius: '12px', border: '1px solid #d4dbe8', background: '#0b1020', objectFit: 'cover', aspectRatio: '16 / 9' }}
                  />
                ) : (
                  <div style={{ width: '100%', borderRadius: '12px', border: '1px dashed #7f8ca3', background: '#101828', color: '#cbd5e1', display: 'grid', placeItems: 'center', aspectRatio: '16 / 9', padding: '1rem', textAlign: 'center' }}>
                    Thumbnail will appear here after the Firebase save completes.
                  </div>
                )}
                <div style={{ fontSize: '0.85rem', color: 'var(--text-mid)' }}>
                  {firebaseResultUrl ? 'Stored in Firebase and ready to reopen anytime.' : 'Waiting on Firebase upload or thumbnail extraction.'}
                </div>
              </div>

              <div style={{ display: 'grid', gap: '0.75rem' }}>
                <video
                  src={getPlaybackUrl(resultVideoUrl || lastResultUrl)}
                  controls
                  autoPlay
                  loop
                  playsInline
                  onError={() => setStatusText('The URL was returned, but the browser could not play it. Use the link below to open or download it.')}
                  style={{ width: '100%', borderRadius: '12px', background: '#000' }}
                />
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  <label style={{ fontSize: '0.85rem', color: 'var(--text-mid)' }}>Generated video URL</label>
                  <input
                    readOnly
                    value={resultVideoUrl || lastResultUrl}
                    onFocus={(event) => event.currentTarget.select()}
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.75rem',
                      borderRadius: '6px',
                      border: '1px solid #c7d2e5',
                      background: '#fff',
                      color: '#111',
                      fontSize: '0.85rem',
                      boxSizing: 'border-box',
                    }}
                  />
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <a href={getPlaybackUrl(resultVideoUrl || lastResultUrl)} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>
                      Open Video URL
                    </a>
                    <button
                      type="button"
                      onClick={async () => {
                        const url = resultVideoUrl || lastResultUrl
                        if (!url) return
                        try {
                          await navigator.clipboard.writeText(url)
                          setStatusText('Video URL copied to clipboard.')
                        } catch {
                          alert(url)
                        }
                      }}
                      style={{
                        background: 'var(--primary)',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '4px',
                        padding: '0.4rem 0.75rem',
                        cursor: 'pointer',
                      }}
                    >
                      Copy URL
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const url = resultVideoUrl || lastResultUrl
                        if (!url) return
                        const anchor = document.createElement('a')
                        anchor.href = url
                        anchor.download = ''
                        anchor.target = '_blank'
                        anchor.rel = 'noopener noreferrer'
                        document.body.appendChild(anchor)
                        anchor.click()
                        anchor.remove()
                      }}
                      style={{
                        background: '#2f2f2f',
                        color: '#fff',
                        border: '1px solid #555',
                        borderRadius: '4px',
                        padding: '0.4rem 0.75rem',
                        cursor: 'pointer',
                      }}
                    >
                      Download/Open
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {history.length > 0 && (
          <div className="extend-result" style={{ marginTop: '1rem' }}>
            <h3>Recent Generations:</h3>
            <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
              {history.slice(0, 6).map((item) => {
                const displayUrl = item.firebaseVideoUrl || item.resultUrl
                return (
                  <a
                    key={`${item.taskId}-${item.completedAt}`}
                    href={getPlaybackUrl(displayUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      textDecoration: 'none',
                      color: 'inherit',
                      background: '#fff',
                      border: '1px solid #d4dbe8',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      boxShadow: '0 6px 20px rgba(15, 23, 42, 0.08)',
                    }}
                  >
                    {item.thumbnailUrl ? (
                      <img
                        src={item.thumbnailUrl}
                        alt={`Thumbnail for task ${item.taskId}`}
                        style={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', display: 'block', background: '#0b1020' }}
                      />
                    ) : (
                      <div style={{ width: '100%', aspectRatio: '16 / 9', display: 'grid', placeItems: 'center', background: 'linear-gradient(135deg, #0f172a, #24324b)', color: '#cbd5e1', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>
                        No thumbnail available
                      </div>
                    )}
                    <div style={{ padding: '0.75rem', display: 'grid', gap: '0.25rem' }}>
                      <strong style={{ fontSize: '0.85rem', color: '#111' }}>{item.firebaseVideoUrl ? 'Firebase saved' : 'Remote result only'}</strong>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-mid)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.taskId}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{new Date(item.completedAt).toLocaleString()}</span>
                    </div>
                  </a>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ToorGenExtendPage
