import { useEffect, useRef, type MutableRefObject } from 'react'
import videojs from 'video.js'

type VideoJsPlayer = ReturnType<typeof videojs>

type UseVideoJsPlayerOptions = {
  sourceUrl: string | null
  autoplay: boolean
  onPlay?: () => void
  onPause?: () => void
  onEnded?: () => void
  onTimeUpdate?: (currentTime: number, duration: number) => void
}

type UseVideoJsPlayerResult = {
  videoElementRef: MutableRefObject<HTMLVideoElement | null>
  playerRef: MutableRefObject<VideoJsPlayer | null>
}

export function useVideoJsPlayer(options: UseVideoJsPlayerOptions): UseVideoJsPlayerResult {
  const videoElementRef = useRef<HTMLVideoElement | null>(null)
  const playerRef = useRef<VideoJsPlayer | null>(null)
  const lastSourceUrlRef = useRef<string>('')
  const callbacksRef = useRef<Pick<UseVideoJsPlayerOptions, 'onPlay' | 'onPause' | 'onEnded' | 'onTimeUpdate'>>({})

  useEffect(() => {
    callbacksRef.current = {
      onPlay: options.onPlay,
      onPause: options.onPause,
      onEnded: options.onEnded,
      onTimeUpdate: options.onTimeUpdate,
    }
  }, [options.onPlay, options.onPause, options.onEnded, options.onTimeUpdate])

  useEffect(() => {
    let rafId = 0

    const initializePlayer = () => {
      const element = videoElementRef.current
      if (!element || playerRef.current) return
      if (!element.isConnected || !document.body.contains(element)) {
        rafId = window.requestAnimationFrame(initializePlayer)
        return
      }

      const player = videojs(element, {
        autoplay: false,
        controls: false,
        preload: 'metadata',
        responsive: true,
        fluid: true,
        inactivityTimeout: 0,
        controlBar: false,
      })

      player.on('play', () => {
        callbacksRef.current.onPlay?.()
      })

      player.on('pause', () => {
        callbacksRef.current.onPause?.()
      })

      player.on('ended', () => {
        callbacksRef.current.onEnded?.()
      })

      const emitTiming = () => {
        const currentTime = player.currentTime() || 0
        const duration = Number.isFinite(player.duration()) ? (player.duration() as number) : 0
        callbacksRef.current.onTimeUpdate?.(currentTime, duration)
      }

      player.on('timeupdate', emitTiming)
      player.on('loadedmetadata', emitTiming)

      playerRef.current = player
    }

    rafId = window.requestAnimationFrame(initializePlayer)

    return () => {
      if (rafId) {
        window.cancelAnimationFrame(rafId)
      }
      if (playerRef.current) {
        playerRef.current.dispose()
        playerRef.current = null
      }
      lastSourceUrlRef.current = ''
    }
  }, [])

  useEffect(() => {
    const player = playerRef.current
    if (!player) return

    const nextSourceUrl = options.sourceUrl?.trim() || ''

    if (!nextSourceUrl) {
      player.pause()
      player.src({ src: '' })
      lastSourceUrlRef.current = ''
      return
    }

    if (lastSourceUrlRef.current !== nextSourceUrl) {
      player.src({ src: nextSourceUrl })
      player.load()
      lastSourceUrlRef.current = nextSourceUrl
    }

    if (options.autoplay) {
      const playPromise = player.play()
      if (playPromise && typeof playPromise.catch === 'function') {
        void playPromise.catch(() => {
          // Ignore autoplay restrictions.
        })
      }
    }
  }, [options.sourceUrl, options.autoplay])

  return { videoElementRef, playerRef }
}
