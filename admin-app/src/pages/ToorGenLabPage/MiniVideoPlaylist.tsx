import { useCallback, useEffect, useRef, useState } from 'react'
import 'video.js/dist/video-js.css'
import { useVideoJsPlayer } from './useVideoJsPlayer'

export type PlaylistClip = {
  id: string
  url: string
  label: string
  thumbUrl?: string
}

type SourceItem = {
  id: string
  url: string
  label: string
  source: 'library' | 'generated'
}

type Props = {
  onClose: () => void
  libraryVideos?: SourceItem[]
  generatedVideos?: SourceItem[]
}

type LoopMode = 'off' | 'all' | 'single'

const PLAYLIST_STORAGE_KEY = 'toorgen_mini_playlist_v1'
const CHATBOT_API_BASE = String(import.meta.env.VITE_CHATBOT_API_URL || '').trim().replace(/\/$/, '')

const buildApiUrl = (apiPath: string) => {
  if (!CHATBOT_API_BASE) return apiPath
  return `${CHATBOT_API_BASE}${apiPath}`
}

const toAbsoluteMediaUrl = (url: string) => {
  if (!url.startsWith('/')) return url
  if (!CHATBOT_API_BASE) return url
  return `${CHATBOT_API_BASE}${url}`
}

const createClipSignature = (items: PlaylistClip[]) => items.map((clip) => clip.url).join('|')

const generateId = () => `clip-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

function readStoredClips(): PlaylistClip[] {
  try {
    const raw = window.localStorage.getItem(PLAYLIST_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is PlaylistClip =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as Record<string, unknown>).id === 'string' &&
        typeof (item as Record<string, unknown>).url === 'string' &&
        typeof (item as Record<string, unknown>).label === 'string',
    )
  } catch {
    return []
  }
}

function saveClips(clips: PlaylistClip[]) {
  try {
    window.localStorage.setItem(PLAYLIST_STORAGE_KEY, JSON.stringify(clips))
  } catch {
    // ignore
  }
}

function VideoThumb({ url, isActive, onClick }: { url: string; isActive: boolean; onClick: () => void }) {
  const ref = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    if (!ref.current) return
    ref.current.currentTime = 0.5
  }, [url])

  return (
    <button
      type="button"
      className={`ved-thumb${isActive ? ' ved-thumb--active' : ''}`}
      onClick={onClick}
      title={url}
    >
      <video
        ref={ref}
        className="ved-thumb-video"
        src={url}
        muted
        playsInline
        preload="metadata"
      />
    </button>
  )
}

export function MiniVideoPlaylist({ onClose, libraryVideos = [], generatedVideos = [] }: Props) {
  const [clips, setClips] = useState<PlaylistClip[]>(() => readStoredClips())
  const [currentIndex, setCurrentIndex] = useState<number>(0)
  const [isPlaying, setIsPlaying] = useState<boolean>(false)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [sourceTab, setSourceTab] = useState<'library' | 'generated'>('generated')
  const [isPickerOpen, setIsPickerOpen] = useState<boolean>(false)
  const [currentTime, setCurrentTime] = useState<number>(0)
  const [duration, setDuration] = useState<number>(0)
  const [mergedVideoUrl, setMergedVideoUrl] = useState<string | null>(null)
  const [mergedSignature, setMergedSignature] = useState<string>('')
  const [isMerging, setIsMerging] = useState<boolean>(false)
  const [mergeError, setMergeError] = useState<string | null>(null)
  const [loopMode, setLoopMode] = useState<LoopMode>('off')
  const [pendingRemoveId, setPendingRemoveId] = useState<string | null>(null)
  const [uiNotice, setUiNotice] = useState<string | null>(null)

  const dragSrcIndex = useRef<number | null>(null)
  const isAdvancingClipRef = useRef<boolean>(false)
  const noticeTimeoutRef = useRef<number | null>(null)

  const currentClip = clips[currentIndex] ?? null
  const nextClip = clips[currentIndex + 1] ?? null
  const clipSignature = createClipSignature(clips)
  const playbackSourceUrl = loopMode === 'single' ? currentClip?.url ?? null : (mergedVideoUrl ?? currentClip?.url ?? null)
  const sourceItems = sourceTab === 'generated' ? generatedVideos : libraryVideos

  const pushNotice = useCallback((message: string) => {
    setUiNotice(message)
    if (noticeTimeoutRef.current) {
      window.clearTimeout(noticeTimeoutRef.current)
    }
    noticeTimeoutRef.current = window.setTimeout(() => {
      setUiNotice(null)
      noticeTimeoutRef.current = null
    }, 2600)
  }, [])

  useEffect(() => {
    return () => {
      if (noticeTimeoutRef.current) {
        window.clearTimeout(noticeTimeoutRef.current)
      }
    }
  }, [])

  const handleVideoEnded = useCallback(() => {
    if (mergedVideoUrl) {
      if (loopMode === 'all') {
        playerRef.current?.currentTime(0)
        const playPromise = playerRef.current?.play()
        if (playPromise && typeof playPromise.catch === 'function') {
          void playPromise.catch(() => {
            // Ignore autoplay restrictions.
          })
        }
        return
      }
      setIsPlaying(false)
      return
    }

    if (loopMode === 'single') {
      playerRef.current?.currentTime(0)
      const playPromise = playerRef.current?.play()
      if (playPromise && typeof playPromise.catch === 'function') {
        void playPromise.catch(() => {
          // Ignore autoplay restrictions.
        })
      }
      return
    }

    setCurrentIndex((idx) => {
      const next = idx + 1
      if (next < clips.length) {
        // Keep playback moving into the next clip without falling into a paused state.
        isAdvancingClipRef.current = true
        setIsPlaying(true)
        return next
      }

      if (loopMode === 'all' && clips.length > 0) {
        isAdvancingClipRef.current = true
        setIsPlaying(true)
        return 0
      }

      setIsPlaying(false)
      return idx
    })
  }, [clips.length, loopMode, mergedVideoUrl])

  const mergeClips = useCallback(async () => {
    const validUrls = clips.map((clip) => clip.url).filter((url) => /^https?:\/\//i.test(url))
    if (validUrls.length < 2) {
      return null
    }

    setIsMerging(true)
    setMergeError(null)

    try {
      const response = await fetch(buildApiUrl('/api/video/concat'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ urls: validUrls }),
      })
      const payload = (await response.json().catch(() => ({}))) as { url?: string; error?: string }

      if (!response.ok || !payload.url) {
        throw new Error(payload.error || 'Unable to merge clips into one video.')
      }

      const resolvedMergedUrl = toAbsoluteMediaUrl(payload.url)
      setMergedVideoUrl(resolvedMergedUrl)
      setMergedSignature(clipSignature)
      return resolvedMergedUrl
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to merge clips into one video.'
      setMergeError(message)
      return null
    } finally {
      setIsMerging(false)
    }
  }, [clipSignature, clips])

  const { videoElementRef, playerRef } = useVideoJsPlayer({
    sourceUrl: playbackSourceUrl,
    autoplay: isPlaying,
    onPlay: () => {
      isAdvancingClipRef.current = false
      setIsPlaying(true)
    },
    onPause: () => {
      if (isAdvancingClipRef.current) return
      setIsPlaying(false)
    },
    onEnded: handleVideoEnded,
    onTimeUpdate: (time, total) => {
      setCurrentTime(time)
      setDuration(total)
    },
  })

  useEffect(() => {
    if (mergedSignature && mergedSignature !== clipSignature) {
      setMergedVideoUrl(null)
      setMergedSignature('')
    }
  }, [clipSignature, mergedSignature])

  useEffect(() => {
    saveClips(clips)
  }, [clips])

  useEffect(() => {
    if (!clips[currentIndex]) {
      setCurrentIndex(Math.max(clips.length - 1, 0))
    }
  }, [clips, currentIndex])

  const handlePlay = async () => {
    if (!playerRef.current) return

    if (!mergedVideoUrl && clips.length > 1 && loopMode !== 'single') {
      const merged = await mergeClips()
      if (!merged) {
        if (!currentClip) return
      }
    } else if (!currentClip && !mergedVideoUrl) {
      return
    }

    setIsPlaying(true)
    const playPromise = playerRef.current.play()
    if (playPromise && typeof playPromise.catch === 'function') {
      void playPromise.catch(() => {
        // Ignore autoplay restrictions.
      })
    }
  }

  const handlePause = () => {
    isAdvancingClipRef.current = false
    playerRef.current?.pause()
    setIsPlaying(false)
  }

  const handleSelectIndex = (index: number) => {
    handlePause()
    setCurrentTime(0)
    setDuration(0)
    setCurrentIndex(index)
    setPendingRemoveId(null)
  }

  const handleRemove = (index: number) => {
    setClips((prev) => {
      const next = prev.filter((_, i) => i !== index)
      return next
    })
    setPendingRemoveId(null)
    pushNotice('Clip removed from rail.')
    handlePause()
  }

  const handleRemoveRequest = (clipId: string) => {
    setPendingRemoveId((prev) => (prev === clipId ? null : clipId))
  }

  const handleAddFromSource = (item: SourceItem) => {
    setClips((prev) => [...prev, { id: generateId(), url: item.url, label: item.label }])
    setIsPickerOpen(false)
  }

  const handleRailDragStart = (index: number) => {
    dragSrcIndex.current = index
  }

  const handleRailDragOver = (event: React.DragEvent, index: number) => {
    event.preventDefault()
    setDragOverIndex(index)
  }

  const handleRailDrop = (targetIndex: number) => {
    const src = dragSrcIndex.current
    if (src === null || src === targetIndex) {
      setDragOverIndex(null)
      return
    }

    setClips((prev) => {
      const next = [...prev]
      const [moved] = next.splice(src, 1)
      next.splice(targetIndex, 0, moved)
      return next
    })

    setCurrentIndex(targetIndex)
    setPendingRemoveId(null)
    setDragOverIndex(null)
    dragSrcIndex.current = null
  }

  const handleRailDragEnd = () => {
    setDragOverIndex(null)
    dragSrcIndex.current = null
  }

  const handleSeek = (event: React.ChangeEvent<HTMLInputElement>) => {
    const seekTime = parseFloat(event.target.value)
    playerRef.current?.currentTime(seekTime)
    setCurrentTime(seekTime)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const sec = Math.floor(seconds % 60)
    return `${mins}:${sec.toString().padStart(2, '0')}`
  }

  return (
    <div className="ved-backdrop" role="dialog" aria-modal="true" aria-label="Video Editor" onClick={onClose}>
      <div className="ved-shell" onClick={(event) => event.stopPropagation()}>

        <div className="ved-topbar">
          <span className="ved-topbar-title">Video Editor</span>
          <div className="ved-topbar-actions">
            <div className="ved-loop-group" role="group" aria-label="Loop mode">
              <button
                type="button"
                className={`ved-loop-btn${loopMode === 'all' ? ' ved-loop-btn--active' : ''}`}
                onClick={() => setLoopMode((mode) => (mode === 'all' ? 'off' : 'all'))}
                title="Loop across all clips"
              >
                Loop All
              </button>
              <button
                type="button"
                className={`ved-loop-btn${loopMode === 'single' ? ' ved-loop-btn--active' : ''}`}
                onClick={() => setLoopMode((mode) => (mode === 'single' ? 'off' : 'single'))}
                title="Loop only the current clip"
              >
                Loop Clip
              </button>
            </div>
            <button
              type="button"
              className="ved-topbar-btn"
              disabled={clips.length < 2 || isMerging}
              onClick={() => {
                void mergeClips()
              }}
              title={clips.length < 2 ? 'Add at least two clips to merge.' : 'Render all clips as one video.'}
            >
              {isMerging ? 'Merging...' : 'Make One Video'}
            </button>
            <button
              type="button"
              className={`ved-topbar-btn${isPickerOpen ? ' ved-topbar-btn--active' : ''}`}
              onClick={() => setIsPickerOpen((open) => !open)}
            >
              + Add Clip
            </button>
            <button type="button" className="ved-topbar-btn" onClick={onClose} aria-label="Close">✕</button>
          </div>
        </div>

        <div className="ved-main">
          {isPickerOpen && (
            <div className="ved-picker">
              <div className="ved-picker-tabs">
                <button
                  type="button"
                  className={`ved-picker-tab${sourceTab === 'generated' ? ' ved-picker-tab--active' : ''}`}
                  onClick={() => setSourceTab('generated')}
                >
                  Generated
                </button>
                <button
                  type="button"
                  className={`ved-picker-tab${sourceTab === 'library' ? ' ved-picker-tab--active' : ''}`}
                  onClick={() => setSourceTab('library')}
                >
                  Library
                </button>
              </div>
              <div className="ved-picker-grid">
                {sourceItems.length === 0 && (
                  <div className="ved-picker-empty">No {sourceTab} videos available.</div>
                )}
                {sourceItems.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="ved-picker-item"
                    onClick={() => handleAddFromSource(item)}
                    title={item.label}
                  >
                    <video
                      className="ved-picker-thumb"
                      src={item.url}
                      muted
                      playsInline
                      preload="metadata"
                      onLoadedMetadata={(event) => {
                        event.currentTarget.currentTime = 0.5
                      }}
                    />
                    <span className="ved-picker-label">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="ved-player-area">
            {currentClip ? (
              <div className="ved-video-wrap">
                <div data-vjs-player className="ved-video-shell">
                  <video ref={videoElementRef} className="video-js ved-video" playsInline preload="metadata" />
                </div>
                {nextClip && (
                  <video
                    className="ved-next-preload"
                    src={nextClip.url}
                    preload="auto"
                    muted
                    aria-hidden="true"
                    tabIndex={-1}
                  />
                )}
              </div>
            ) : (
              <div className="ved-player-empty">
                <span className="ved-player-empty-icon">▶</span>
                <span>Click <strong>+ Add Clip</strong> to start building your sequence.</span>
              </div>
            )}
          </div>
        </div>

        <div className="ved-transport">
          <button
            type="button"
            className="ved-transport-btn"
            disabled={currentIndex === 0}
            onClick={() => handleSelectIndex(currentIndex - 1)}
            aria-label="Previous"
          >⏮</button>
          {isPlaying ? (
            <button type="button" className="ved-transport-btn ved-transport-btn--play" onClick={handlePause} aria-label="Pause">⏸</button>
          ) : (
            <button type="button" className="ved-transport-btn ved-transport-btn--play" onClick={() => { void handlePlay() }} disabled={clips.length === 0 || isMerging} aria-label="Play">▶</button>
          )}
          <button
            type="button"
            className="ved-transport-btn"
            disabled={currentIndex >= clips.length - 1}
            onClick={() => handleSelectIndex(currentIndex + 1)}
            aria-label="Next"
          >⏭</button>
          <input
            type="range"
            className="ved-scrubber"
            min={0}
            max={duration || 1}
            step={0.05}
            value={currentTime}
            onChange={handleSeek}
            aria-label="Seek"
          />
          <span className="ved-timecode">{formatTime(currentTime)} / {formatTime(duration)}</span>
          {currentClip && (
            <span className="ved-clip-name">{mergedVideoUrl ? 'Merged Sequence' : currentClip.label}</span>
          )}
          {mergeError && (
            <span className="ved-clip-name" role="status">Merge failed: {mergeError}</span>
          )}
          {uiNotice && (
            <span className="ved-inline-toast" role="status">{uiNotice}</span>
          )}
        </div>

        <div className="ved-timeline">
          {clips.length === 0 && (
            <div className="ved-timeline-empty">Drag clips from the source panel to build your sequence</div>
          )}
          {clips.map((clip, index) => (
            <div
              key={clip.id}
              className={`ved-rail-slot${dragOverIndex === index ? ' ved-rail-slot--drag-over' : ''}`}
              draggable
              onDragStart={() => handleRailDragStart(index)}
              onDragOver={(event) => handleRailDragOver(event, index)}
              onDrop={() => handleRailDrop(index)}
              onDragEnd={handleRailDragEnd}
            >
              <VideoThumb
                url={clip.url}
                isActive={index === currentIndex}
                onClick={() => handleSelectIndex(index)}
              />
              <span className="ved-rail-index">{index + 1}</span>
              <button
                type="button"
                className="ved-rail-remove"
                onClick={() => handleRemoveRequest(clip.id)}
                aria-label="Remove clip"
              >✕</button>
              {pendingRemoveId === clip.id && (
                <div className="ved-rail-confirm" role="status" aria-label="Confirm clip removal">
                  <span>Remove?</span>
                  <button
                    type="button"
                    className="ved-rail-confirm-btn ved-rail-confirm-btn--yes"
                    onClick={() => handleRemove(index)}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    className="ved-rail-confirm-btn"
                    onClick={() => setPendingRemoveId(null)}
                  >
                    No
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
