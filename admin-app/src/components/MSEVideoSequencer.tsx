import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './MSEVideoSequencer.css'

export interface MSEVideoSequencerHandle {
  play: () => Promise<void>;
  pause: () => void;
  rewind: () => void;
  restartFromBeginning: () => Promise<void>;
  seekTo: (timeSec: number) => void;
  getCurrentTime: () => number;
  getDuration: () => number;
}

export type MSEVideoSequencerProps = {
  initUrl?: string
  segmentUrls?: string[]
  clipWindows?: Array<{ startSec?: number; endSec?: number }>
  clipDurations?: number[]
  mimeCodec?: string
  autoPlay?: boolean
  loop?: boolean
  crossfadeEnabled?: boolean
  onTimeUpdate?: (currentTime: number, duration: number) => void
  className?: string
  style?: React.CSSProperties
}

export const DEFAULT_MIME_CODEC = 'video/mp4; codecs="avc1.42E01E, mp4a.40.2"'
export const DEFAULT_INIT_URL = '/videos/sequence/init.mp4'
export const DEFAULT_SEGMENTS = [
  '/videos/sequence/segment001.m4s',
  '/videos/sequence/segment002.m4s',
  '/videos/sequence/segment003.m4s',
  '/videos/sequence/segment004.m4s',
]

function asErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  return typeof error === 'string' ? error : 'Unknown media pipeline error.'
}

function isAbortLikeError(error: unknown) {
  if (error instanceof DOMException && error.name === 'AbortError') {
    return true
  }
  if (error instanceof Error) {
    const text = `${error.name} ${error.message}`.toLowerCase()
    return text.includes('abort') || text.includes('signal is aborted')
  }
  if (typeof error === 'string') {
    const text = error.toLowerCase()
    return text.includes('abort') || text.includes('signal is aborted')
  }
  return false
}

function isPlainMp4Url(url: string) {
  return /\.mp4(\?|#|$)/i.test(url) && !/\.m4s(\?|#|$)/i.test(url)
}

export const MSEVideoSequencer = React.forwardRef<MSEVideoSequencerHandle, MSEVideoSequencerProps>(({
  initUrl = DEFAULT_INIT_URL,
  segmentUrls = [],
  clipWindows,
  clipDurations,
  mimeCodec = DEFAULT_MIME_CODEC,
  autoPlay = false,
  loop = false,
  crossfadeEnabled = true,
  onTimeUpdate,
  className,
  style: _style,
}, ref) => {
  const videoPrimaryRef = useRef<HTMLVideoElement | null>(null)
  const videoSecondaryRef = useRef<HTMLVideoElement | null>(null)
  const mediaSourceRef = useRef<MediaSource | null>(null)
  const sourceBufferRef = useRef<SourceBuffer | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  const cancelledRef = useRef(false)

  const [status, setStatus] = useState('Idle')
  const [error, setError] = useState<string | null>(null)
  const [playRequired, setPlayRequired] = useState(false)
  const [visibleVideoSlot, setVisibleVideoSlot] = useState<0 | 1>(0)

  const normalizedSegments = useMemo(
    () => segmentUrls.filter(Boolean),
    [segmentUrls],
  )
  const usesMp4QueueMode = useMemo(
    () => normalizedSegments.length > 0 && normalizedSegments.every((url) => isPlainMp4Url(url)),
    [normalizedSegments],
  )

  const getVideoEl = useCallback((slot: 0 | 1) => (
    slot === 0 ? videoPrimaryRef.current : videoSecondaryRef.current
  ), [])

  // Keep onTimeUpdate in a ref so calling it never triggers a effect re-run,
  // which would restart playback on every timeupdate fire (feedback loop).
  const onTimeUpdateRef = useRef(onTimeUpdate)
  useEffect(() => { onTimeUpdateRef.current = onTimeUpdate })

  // Clip durations are timeline metadata. Keep them in a ref so metadata updates
  // do not tear down and recreate active video sources mid-playback.
  const clipDurationsRef = useRef(clipDurations)
  useEffect(() => { clipDurationsRef.current = clipDurations }, [clipDurations])

  const crossfadeEnabledRef = useRef(crossfadeEnabled)
  useEffect(() => { crossfadeEnabledRef.current = crossfadeEnabled }, [crossfadeEnabled])

  // Exposes moveToClip from inside the MP4 queue mode effect for external restarts.
  const moveToClipFnRef = useRef<((index: number, shouldAutoPlay: boolean) => Promise<void>) | null>(null)
  const seekToTimelineTimeRef = useRef<((timeSec: number) => Promise<void>) | null>(null)

  React.useImperativeHandle(ref, () => ({
    play: async () => {
      if (usesMp4QueueMode && normalizedSegments.length === 0) {
        setError('Add clips to the timeline before playing.')
        setStatus('No clips loaded')
        return
      }
      const video = getVideoEl(visibleVideoSlot)
      if (!video) return
      if (!usesMp4QueueMode && !video.currentSrc) {
        setError('No playable source is loaded yet.')
        setStatus('No source loaded')
        return
      }
      try {
        await video.play()
      } catch (playError) {
        setError(`Playback failed: ${asErrorMessage(playError)}`)
      }
    },
    pause: () => {
      videoPrimaryRef.current?.pause()
      videoSecondaryRef.current?.pause()
    },
    rewind: () => {
      const video = getVideoEl(visibleVideoSlot)
      if (video) {
        try { video.currentTime = 0 } catch {}
      }
    },
    restartFromBeginning: async () => {
      await moveToClipFnRef.current?.(0, true)
    },
    seekTo: async (timeSec: number) => {
      if (seekToTimelineTimeRef.current) {
        await seekToTimelineTimeRef.current(timeSec)
        return
      }
      const video = getVideoEl(visibleVideoSlot)
      if (video) {
        try { video.currentTime = timeSec } catch {}
      }
    },
    getCurrentTime: () => {
      const video = getVideoEl(visibleVideoSlot)
      return video ? video.currentTime : 0
    },
    getDuration: () => {
      const video = getVideoEl(visibleVideoSlot)
      return video && Number.isFinite(video.duration) ? video.duration : 0
    }
  }), [getVideoEl, visibleVideoSlot])

  const waitForUpdateEnd = useCallback((sourceBuffer: SourceBuffer) => {
    if (!sourceBuffer.updating) return Promise.resolve()
    return new Promise<void>((resolve, reject) => {
      const handleUpdateEnd = () => {
        sourceBuffer.removeEventListener('updateend', handleUpdateEnd)
        sourceBuffer.removeEventListener('error', handleError)
        rejectCleanup()
        resolve()
      }

      const handleError = () => {
        sourceBuffer.removeEventListener('updateend', handleUpdateEnd)
        sourceBuffer.removeEventListener('error', handleError)
        rejectCleanup()
        reject(new Error('SourceBuffer update failed while waiting.'))
      }

      const rejectCleanup = () => {
        sourceBuffer.removeEventListener('abort', handleError)
      }

      sourceBuffer.addEventListener('updateend', handleUpdateEnd, { once: true })
      sourceBuffer.addEventListener('error', handleError, { once: true })
      sourceBuffer.addEventListener('abort', handleError, { once: true })
    })
  }, [])

  const appendBufferAsync = useCallback(async (sourceBuffer: SourceBuffer, data: ArrayBuffer) => {
    await waitForUpdateEnd(sourceBuffer)

    return new Promise<void>((resolve, reject) => {
      const onUpdateEnd = () => {
        sourceBuffer.removeEventListener('error', onError)
        sourceBuffer.removeEventListener('abort', onAbort)
        resolve()
      }

      const onError = () => {
        sourceBuffer.removeEventListener('updateend', onUpdateEnd)
        sourceBuffer.removeEventListener('abort', onAbort)
        reject(new Error('SourceBuffer append failed.'))
      }

      const onAbort = () => {
        sourceBuffer.removeEventListener('updateend', onUpdateEnd)
        sourceBuffer.removeEventListener('error', onError)
        reject(new Error('SourceBuffer append aborted.'))
      }

      sourceBuffer.addEventListener('updateend', onUpdateEnd, { once: true })
      sourceBuffer.addEventListener('error', onError, { once: true })
      sourceBuffer.addEventListener('abort', onAbort, { once: true })

      try {
        sourceBuffer.appendBuffer(data)
      } catch (appendError) {
        sourceBuffer.removeEventListener('updateend', onUpdateEnd)
        sourceBuffer.removeEventListener('error', onError)
        sourceBuffer.removeEventListener('abort', onAbort)
        reject(appendError)
      }
    })
  }, [waitForUpdateEnd])

  useEffect(() => {
    cancelledRef.current = false
    setError(null)
    setPlayRequired(false)

    const video = getVideoEl(0)
    const altVideo = getVideoEl(1)
    if (!video || !altVideo) return undefined

    if (normalizedSegments.length === 0) {
      setStatus('Idle')
      return undefined
    }

    setVisibleVideoSlot(0)

    if (usesMp4QueueMode) {
      let active = true
      let currentIndex = 0
      let activeSlot: 0 | 1 = 0
      let switchInFlight = false
      let nextPreparedForIndex = -1

      const clipsCount = normalizedSegments.length
      const CROSSFADE_THRESHOLD_SEC = 0.12

      const getClipStart = (index: number) => {
        const value = clipWindows?.[index]?.startSec
        return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0
      }

      const getClipEnd = (index: number) => {
        const value = clipWindows?.[index]?.endSec
        return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined
      }

      const getClipMediaDuration = (index: number, fallbackDuration?: number) => {
        const value = clipDurationsRef.current?.[index]
        if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value
        if (typeof fallbackDuration === 'number' && Number.isFinite(fallbackDuration) && fallbackDuration > 0) return fallbackDuration
        return 0
      }

      const getClipTimelineDuration = (index: number, fallbackDuration?: number) => {
        const mediaDuration = getClipMediaDuration(index, fallbackDuration)
        if (mediaDuration <= 0) return 0
        const clipStart = getClipStart(index)
        const clipEndRaw = getClipEnd(index)
        const clipEnd = typeof clipEndRaw === 'number' && clipEndRaw > clipStart
          ? Math.min(clipEndRaw, mediaDuration)
          : mediaDuration
        return Math.max(0, clipEnd - clipStart)
      }

      const videos: [HTMLVideoElement, HTMLVideoElement] = [video, altVideo]

      const cleanupVideoSource = (element: HTMLVideoElement) => {
        element.pause()
        element.removeAttribute('src')
        element.load()
      }

      const waitForCanPlay = (element: HTMLVideoElement) => new Promise<void>((resolve, reject) => {
        if (element.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
          resolve()
          return
        }
        const onReady = () => {
          element.removeEventListener('canplay', onReady)
          element.removeEventListener('error', onError)
          resolve()
        }
        const onError = () => {
          element.removeEventListener('canplay', onReady)
          element.removeEventListener('error', onError)
          const mediaError = element.error
          reject(new Error(mediaError?.message || 'Could not load clip source.'))
        }
        element.addEventListener('canplay', onReady, { once: true })
        element.addEventListener('error', onError, { once: true })
      })

      const loadClip = async (element: HTMLVideoElement, clipUrl: string) => {
        if (element.src !== clipUrl) {
          element.src = clipUrl
          element.load()
        }
        await waitForCanPlay(element)
      }

      const syncPlaybackSettings = (from: HTMLVideoElement, to: HTMLVideoElement) => {
        to.muted = from.muted
        to.volume = from.volume
        to.playbackRate = from.playbackRate
      }

      const preloadFollowingClip = async (justActivatedIndex: number) => {
        const followingIndex = justActivatedIndex + 1
        if (followingIndex >= clipsCount) {
          nextPreparedForIndex = -1
          return
        }
        const inactiveSlot: 0 | 1 = activeSlot === 0 ? 1 : 0
        const inactiveVideo = videos[inactiveSlot]
        await loadClip(inactiveVideo, normalizedSegments[followingIndex])
        nextPreparedForIndex = followingIndex
      }

      const moveToClip = async (targetIndex: number, shouldAutoPlay: boolean) => {
        if (!active) return
        const clipUrl = normalizedSegments[targetIndex]
        if (!clipUrl) return

        const slot: 0 | 1 = targetIndex === 0 ? 0 : activeSlot === 0 ? 1 : 0
        const targetVideo = videos[slot]

        setStatus(`Loading clip ${targetIndex + 1}/${clipsCount} (MP4 queue mode)`)
        setPlayRequired(false)

        try {
          await loadClip(targetVideo, clipUrl)
        } catch (loadError) {
          setPlayRequired(false)
          setStatus(`Clip ${targetIndex + 1}/${clipsCount} failed to load`)
          setError(`Clip source is unavailable. ${asErrorMessage(loadError)}`)
          return
        }

        const clipStart = getClipStart(targetIndex)
        if (clipStart > 0) {
          try {
            targetVideo.currentTime = clipStart
          } catch {
            // Ignore seek failures on remote or not-seekable media.
          }
        }

        if (!shouldAutoPlay) {
          activeSlot = slot
          currentIndex = targetIndex
          setVisibleVideoSlot(slot)
          setStatus(`Ready clip ${targetIndex + 1}/${clipsCount} (MP4 queue mode)`)
          setPlayRequired(true)
          void preloadFollowingClip(currentIndex)
          return
        }

        const currentVideo = videos[activeSlot]
        syncPlaybackSettings(currentVideo, targetVideo)

        try {
          await targetVideo.play()
          setVisibleVideoSlot(slot)
          if (currentVideo !== targetVideo) {
            window.setTimeout(() => {
              if (!active) return
              currentVideo.pause()
            }, 160)
          }
          activeSlot = slot
          currentIndex = targetIndex
          setStatus(`Playing clip ${targetIndex + 1}/${clipsCount} (MP4 queue mode)`)
          void preloadFollowingClip(currentIndex)
        } catch {
          setPlayRequired(true)
          setStatus(`Ready clip ${targetIndex + 1}/${clipsCount} - press Play`)
        }
      }

      const switchToNextClip = async () => {
        if (!active || switchInFlight) return
        const nextIndex = currentIndex + 1
        if (nextIndex >= clipsCount) {
          if (loop) {
            await moveToClip(0, true)
          } else {
            setStatus('Completed (MP4 queue mode)')
          }
          return
        }

        switchInFlight = true
        try {
          if (nextPreparedForIndex !== nextIndex) {
            const targetSlot: 0 | 1 = activeSlot === 0 ? 1 : 0
            await loadClip(videos[targetSlot], normalizedSegments[nextIndex])
          }
          await moveToClip(nextIndex, true)
        } finally {
          switchInFlight = false
        }
      }

      const handleTimeUpdate = (event: Event) => {
        if (!active || switchInFlight) return
        const current = videos[activeSlot]
        if (event.currentTarget !== current) return
        if (!Number.isFinite(current.duration) || current.duration <= 0) return

        let globalCurrentTime = 0
        for (let i = 0; i < currentIndex; i++) {
          globalCurrentTime += getClipTimelineDuration(i)
        }
        const clipStart = getClipStart(currentIndex)
        globalCurrentTime += Math.max(0, current.currentTime - clipStart)

        let totalDuration = 0
        for (let i = 0; i < clipsCount; i++) {
          totalDuration += getClipTimelineDuration(i, i === currentIndex ? current.duration : undefined)
        }

        onTimeUpdateRef.current?.(globalCurrentTime, totalDuration)

        const clipEndRaw = getClipEnd(currentIndex)
        const currentClipStart = getClipStart(currentIndex)
        const clipEnd = typeof clipEndRaw === 'number' && clipEndRaw > currentClipStart
          ? Math.min(clipEndRaw, current.duration)
          : current.duration
        const remaining = clipEnd - current.currentTime
        if (crossfadeEnabledRef.current && remaining <= CROSSFADE_THRESHOLD_SEC) {
          void switchToNextClip()
        } else if (!crossfadeEnabledRef.current && remaining <= 0) {
          void switchToNextClip()
        }
      }

      const handleEnded = (event: Event) => {
        if (event.currentTarget !== videos[activeSlot]) return
        void switchToNextClip()
      }

      moveToClipFnRef.current = moveToClip
      seekToTimelineTimeRef.current = async (timeSec: number) => {
        const boundedTime = Math.max(0, timeSec)
        const wasPlaying = !videos[activeSlot].paused

        let remainingTime = boundedTime
        let targetIndex = 0

        for (let index = 0; index < clipsCount; index += 1) {
          const clipDuration = getClipTimelineDuration(index, index === currentIndex ? videos[activeSlot].duration : undefined)
          if (clipDuration <= 0) continue
          if (remainingTime <= clipDuration || index === clipsCount - 1) {
            targetIndex = index
            break
          }
          remainingTime -= clipDuration
        }

        await moveToClip(targetIndex, wasPlaying)

        const targetVideo = videos[activeSlot]
        if (!targetVideo) return
        const targetStart = getClipStart(targetIndex)
        const targetDuration = getClipMediaDuration(targetIndex, targetVideo.duration)
        const targetEndRaw = getClipEnd(targetIndex)
        const targetEnd = typeof targetEndRaw === 'number' && targetEndRaw > targetStart
          ? Math.min(targetEndRaw, targetDuration)
          : targetDuration
        const localTime = Math.min(targetEnd, Math.max(targetStart, targetStart + remainingTime))

        try {
          targetVideo.currentTime = localTime
        } catch {
          // Ignore seek failures on remote or not-seekable media.
        }

        onTimeUpdateRef.current?.(boundedTime, Math.max(0, normalizedSegments.reduce((acc, _, index) => (
          acc + getClipTimelineDuration(index, index === targetIndex ? targetVideo.duration : undefined)
        ), 0)))
      }

      videos.forEach((element) => {
        element.addEventListener('timeupdate', handleTimeUpdate)
        element.addEventListener('ended', handleEnded)
      })

      void moveToClip(0, autoPlay).catch((startupError) => {
        if (!active) return
        setStatus('Error')
        setError(`Could not start sequencer: ${asErrorMessage(startupError)}`)
      })

      return () => {
        active = false
        moveToClipFnRef.current = null
        seekToTimelineTimeRef.current = null
        videos.forEach((element) => {
          element.removeEventListener('timeupdate', handleTimeUpdate)
          element.removeEventListener('ended', handleEnded)
          cleanupVideoSource(element)
        })
      }
    }

    if (!('MediaSource' in window)) {
      setStatus('Unsupported')
      setError('This browser does not support the Media Source Extensions API.')
      return undefined
    }

    if (!MediaSource.isTypeSupported(mimeCodec)) {
      setStatus('Unsupported codec')
      setError(`Unsupported codec: ${mimeCodec}`)
      return undefined
    }

    const mediaSource = new MediaSource()
    mediaSourceRef.current = mediaSource

    const objectUrl = URL.createObjectURL(mediaSource)
    objectUrlRef.current = objectUrl
    video.src = objectUrl
    altVideo.pause()
    altVideo.removeAttribute('src')
    altVideo.load()

    const abortController = new AbortController()

    const fetchArrayBuffer = async (url: string) => {
      const response = await fetch(url, { signal: abortController.signal })
      if (!response.ok) {
        throw new Error(`Failed to fetch ${url}`)
      }
      return response.arrayBuffer()
    }

    const handleMSETimeUpdate = (event: Event) => {
      const v = event.currentTarget as HTMLVideoElement
      if (v && Number.isFinite(v.duration)) {
        onTimeUpdateRef.current?.(v.currentTime, v.duration)
      }
    }

    video.addEventListener('timeupdate', handleMSETimeUpdate);

    const handleSourceOpen = async () => {
      if (cancelledRef.current) return

      try {
        setStatus('Source open')
        const sourceBuffer = mediaSource.addSourceBuffer(mimeCodec)
        sourceBuffer.mode = 'segments'
        sourceBufferRef.current = sourceBuffer

        setStatus('Appending init segment')
        const initBuffer = await fetchArrayBuffer(initUrl)
        if (cancelledRef.current) return
        await appendBufferAsync(sourceBuffer, initBuffer)

        for (let index = 0; index < normalizedSegments.length; index += 1) {
          const segmentUrl = normalizedSegments[index]
          setStatus(`Appending segment ${index + 1}/${normalizedSegments.length}`)
          const segmentBuffer = await fetchArrayBuffer(segmentUrl)
          if (cancelledRef.current) return
          await appendBufferAsync(sourceBuffer, segmentBuffer)
        }

        if (!cancelledRef.current && mediaSource.readyState === 'open') {
          mediaSource.endOfStream()
        }

        setStatus('Ready')

        if (autoPlay) {
          try {
            await video.play()
            setStatus('Playing')
          } catch {
            setPlayRequired(true)
            setStatus('Ready - press Play')
          }
        } else {
          setPlayRequired(true)
        }
      } catch (pipelineError) {
        if (cancelledRef.current || isAbortLikeError(pipelineError)) {
          setStatus('Idle')
          return
        }
        const message = asErrorMessage(pipelineError)
        setStatus('Error')
        setError(message)
      }
    }

    mediaSource.addEventListener('sourceopen', handleSourceOpen)

    return () => {
      cancelledRef.current = true
      abortController.abort()
      mediaSource.removeEventListener('sourceopen', handleSourceOpen)
      video.removeEventListener('timeupdate', handleMSETimeUpdate)

      const sourceBuffer = sourceBufferRef.current
      if (sourceBuffer) {
        try {
          if (mediaSource.readyState === 'open' && sourceBuffer.updating) {
            sourceBuffer.abort()
          }
        } catch {
        }
      }

      if (mediaSource.readyState === 'open') {
        try {
          mediaSource.endOfStream()
        } catch {
        }
      }

      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current)
        objectUrlRef.current = null
      }

      video.removeAttribute('src')
      video.load()
      altVideo.removeAttribute('src')
      altVideo.load()

      mediaSourceRef.current = null
      sourceBufferRef.current = null
    }
  }, [appendBufferAsync, autoPlay, clipWindows, getVideoEl, initUrl, loop, mimeCodec, normalizedSegments, usesMp4QueueMode])

  const handlePlayClick = async () => {
    if (usesMp4QueueMode && normalizedSegments.length === 0) {
      setError('Add clips to the timeline before playing.')
      setStatus('No clips loaded')
      return
    }

    const video = getVideoEl(visibleVideoSlot)
    if (!video) return

    if (!usesMp4QueueMode && !video.currentSrc) {
      setError('No playable source is loaded yet.')
      setStatus('No source loaded')
      return
    }

    try {
      await video.play()
      setPlayRequired(false)
      setStatus('Playing')
    } catch (playError) {
      setError(`Playback failed: ${asErrorMessage(playError)}`)
    }
  }

  return (
    <section className={`mse-video-sequencer ${className || ''}`} aria-live="polite">
      <div className={`mse-video-stack${!crossfadeEnabled ? ' is-no-crossfade' : ''}`}>
        <video
          ref={videoPrimaryRef}
          className={`mse-video mse-video-layer${visibleVideoSlot === 0 ? ' is-visible' : ''}`}
          playsInline
          preload="auto"
          crossOrigin="anonymous"
          loop={!usesMp4QueueMode && loop}
        />
        <video
          ref={videoSecondaryRef}
          className={`mse-video mse-video-layer${visibleVideoSlot === 1 ? ' is-visible' : ''}`}
          playsInline
          preload="auto"
          crossOrigin="anonymous"
          loop={false}
        />
      </div>

      <p className="mse-status">Status: {status}</p>

      {error && (
        <p className="mse-error" role="alert">
          {error}
        </p>
      )}

      {playRequired && (
        <button className="mse-play-btn" type="button" onClick={handlePlayClick}>
          Play
        </button>
      )}
    </section>
  )
})