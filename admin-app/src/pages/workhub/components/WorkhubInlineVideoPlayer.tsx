import { useMemo } from 'react'

export function useWorkhubInlineVideoPlayerEnabled(): boolean {
  // Central toggle: disable here to remove in-app video playback across WorkHub.
  return true
}

interface WorkhubInlineVideoPlayerProps {
  url: string
  title?: string
  className?: string
}

export function WorkhubInlineVideoPlayer({
  url,
  title,
  className = '',
}: WorkhubInlineVideoPlayerProps) {
  const enabled = useWorkhubInlineVideoPlayerEnabled()
  const resolvedTitle = (title || '').trim() || 'Video attachment'
  const playerClassName = useMemo(
    () => `workhub-inline-video-player ${className}`.trim(),
    [className],
  )

  if (!enabled) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="workhub-task-image-link">
        <span className="workhub-task-attachment-icon">VIDEO</span>
        <span className="workhub-attachment-copy">
          <strong>{resolvedTitle}</strong>
          <small>{url}</small>
        </span>
      </a>
    )
  }

  return (
    <div className={playerClassName}>
      <video controls preload="metadata" className="workhub-inline-video-element">
        <source src={url} />
      </video>
      <span className="workhub-attachment-copy">
        <strong>{resolvedTitle}</strong>
        <small>{url}</small>
      </span>
    </div>
  )
}
