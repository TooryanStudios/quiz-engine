/**
 * VideoPreview Component
 *
 * A reusable component for displaying video overlay previews.
 * Shows the video thumbnail with proper aspect ratio and styling.
 *
 * @component
 */

import React, { useEffect, useRef, useState } from "react";
import { ClipOverlay } from "../../../types";
import { Play, Pause, RefreshCw } from "lucide-react";
import { Button } from "../../ui/button";

interface VideoPreviewProps {
  /** The video overlay to preview */
  overlay: ClipOverlay;
  /** Optional CSS class name for additional styling */
  className?: string;
  /** Callback function to initiate video replacement */
  onChangeVideo?: () => void;
}

/**
 * VideoPreview component for displaying video overlay thumbnails
 */
export const VideoPreview: React.FC<VideoPreviewProps> = ({
  overlay,
  className = "",
  onChangeVideo,
}) => {
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);
  const [isPreviewHovered, setIsPreviewHovered] = useState(false);
  const [showCenterControl, setShowCenterControl] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hideControlTimeoutRef = useRef<number | null>(null);

  const scheduleControlHide = () => {
    if (hideControlTimeoutRef.current !== null) {
      window.clearTimeout(hideControlTimeoutRef.current);
    }

    hideControlTimeoutRef.current = window.setTimeout(() => {
      setShowCenterControl(false);
      hideControlTimeoutRef.current = null;
    }, 1000);
  };

  useEffect(() => {
    return () => {
      if (hideControlTimeoutRef.current !== null) {
        window.clearTimeout(hideControlTimeoutRef.current);
      }
    };
  }, []);

  if(!overlay.content) {
    return null;
  }

  const canPreviewVideo = Boolean(overlay.src);

  const handleTogglePreviewPlayback = async () => {
    if (!videoRef.current || !canPreviewVideo) {
      return;
    }

    if (isPreviewPlaying) {
      videoRef.current.pause();
      setIsPreviewPlaying(false);
      setShowCenterControl(true);
      scheduleControlHide();
      return;
    }

    try {
      await videoRef.current.play();
      setIsPreviewPlaying(true);
      setShowCenterControl(true);
      scheduleControlHide();
    } catch {
      setIsPreviewPlaying(false);
    }
  };

  const handlePreviewMouseEnter = () => {
    setIsPreviewHovered(true);
    setShowCenterControl(true);

    if (hideControlTimeoutRef.current !== null) {
      window.clearTimeout(hideControlTimeoutRef.current);
      hideControlTimeoutRef.current = null;
    }
  };

  const handlePreviewMouseLeave = () => {
    setIsPreviewHovered(false);
    setShowCenterControl(false);
  };

  return (
    <div className="space-y-2">
      <div
        className={`relative aspect-16/5 overflow-hidden rounded-sm border bg-background group ${className}`}
        onMouseEnter={handlePreviewMouseEnter}
        onMouseLeave={handlePreviewMouseLeave}
      >
        {canPreviewVideo ? (
          <video
            ref={videoRef}
            src={overlay.src}
            className="absolute inset-0 w-full h-full object-contain"
            style={{
              filter: overlay.styles?.filter || 'none',
              opacity: overlay.styles?.opacity ?? 1,
            }}
            loop
            playsInline
            preload="metadata"
            onPause={() => setIsPreviewPlaying(false)}
          />
        ) : (
          <img
            src={overlay.content}
            alt="Video preview"
            className="absolute inset-0 w-full h-full object-contain"
            style={{
              filter: overlay.styles?.filter || 'none',
              opacity: overlay.styles?.opacity ?? 1,
            }}
          />
        )}

        {canPreviewVideo && (showCenterControl || isPreviewHovered) && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <Button
              onClick={handleTogglePreviewPlayback}
              variant="secondary"
              size="icon"
              className="h-9 w-9 pointer-events-auto bg-black/55 border border-white/25 hover:bg-black/70 text-white"
              title={isPreviewPlaying ? "Pause preview" : "Play preview"}
            >
              {isPreviewPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </Button>
          </div>
        )}
      </div>

      {onChangeVideo && (
        <div className="flex justify-end">
          <Button
            onClick={onChangeVideo}
            variant="secondary"
            size="sm"
            className="h-7"
          >
            <RefreshCw className="w-3 h-3" />
            Change Video
          </Button>
        </div>
      )}
    </div>
  );
};