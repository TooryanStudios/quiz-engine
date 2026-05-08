import React, { useRef, useState } from "react";

import { Play, Pause, SkipBack, SkipForward } from "lucide-react";

import { Button } from "../../../ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../../ui/dropdown-menu";


interface PlaybackControlsProps {
  isPlaying: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onSeekToStart?: () => void;
  onSeekToEnd?: () => void;
  currentTime: number;
  totalDuration: number;
  formatTime: (timeInSeconds: number) => string;
  playbackRate?: number;
  setPlaybackRate?: (rate: number) => void;
  onSeekTo?: (timeInSeconds: number) => void;
}

export const PlaybackControls: React.FC<PlaybackControlsProps> = ({
  isPlaying,
  onPlay,
  onPause,
  onSeekToStart,
  onSeekToEnd,
  currentTime,
  totalDuration,
  formatTime,
  playbackRate = 1,
  setPlaybackRate,
  onSeekTo,
}) => {
  const [isEditingTime, setIsEditingTime] = useState(false);
  const [editValue, setEditValue] = useState('');
  const editInputRef = useRef<HTMLInputElement>(null);

  const handlePlayPause = () => {
    if (isPlaying) {
      onPause?.();
    } else {
      onPlay?.();
    }
  };

  const handleTimeDoubleClick = () => {
    if (!onSeekTo) return;
    setEditValue(currentTime.toFixed(2));
    setIsEditingTime(true);
    setTimeout(() => editInputRef.current?.select(), 0);
  };

  const parseTimeInput = (raw: string): number | null => {
    const trimmed = raw.trim();
    // Accept m:ss or m:ss.SS
    const mss = trimmed.match(/^(\d+):(\d{1,2})(?:\.(\d+))?$/);
    if (mss) {
      const minutes = parseInt(mss[1], 10);
      const seconds = parseInt(mss[2], 10);
      const frac = mss[3] ? parseFloat('0.' + mss[3]) : 0;
      return minutes * 60 + seconds + frac;
    }

    // Accept plain seconds: "2.5"
    if (/^\d+(?:\.\d+)?$/.test(trimmed)) {
      return parseFloat(trimmed);
    }

    return null;
  };

  const commitTimeEdit = () => {
    const parsed = parseTimeInput(editValue);
    if (parsed !== null && onSeekTo) {
      const clamped = Math.max(0, Math.min(totalDuration, parsed));
      onSeekTo(clamped);
    }
    setIsEditingTime(false);
  };

  const handleTimeKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitTimeEdit();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setIsEditingTime(false);
    }
  };

  return (
    <>
      {/* Playback Speed Control */}
      {setPlaybackRate && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="text-foreground hidden sm:flex border h-7 px-2 text-[10px] font-extralight hover:bg-[hsl(0_0%_22%)]"
              title="Playback speed"
            >
              {playbackRate}x
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="min-w-25 bg-(--surface-elevated) border border-(--border)"
            align="center"
            onCloseAutoFocus={(e) => {
              e.preventDefault();
            }}
          >
            {[0.25, 0.5, 1, 1.5, 2].map((speed) => (
              <DropdownMenuItem
                key={speed}
                onClick={() => setPlaybackRate(speed)}
                className={`text-xs py-1.5 ${
                  playbackRate === speed
                    ? "text-blue-600 dark:text-blue-400 font-extralight"
                    : "font-extralight"
                }`}
              >
                {speed}x
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Skip to Start Button */}
      {onSeekToStart && (
        <Button
          onClick={onSeekToStart}
          size="sm"
          variant="ghost"
          className="h-7 w-7 bg-surface border-border text-foreground hidden sm:flex hover:bg-[hsl(0_0%_22%)]"
          onTouchStart={(e) => e.preventDefault()}
          style={{ WebkitTapHighlightColor: 'transparent' }}
          title="Jump to Start"
        >
          <SkipBack className="h-[22px] w-[22px] text-foreground" />
        </Button>
      )}

      {/* Play/Pause Button */}
      {(onPlay || onPause) && (
        <Button
          onClick={handlePlayPause}
          size="sm"
          variant="ghost"
          className="h-7 w-7 bg-surface border-border text-foreground hover:bg-[hsl(0_0%_22%)]"
          onTouchStart={(e) => e.preventDefault()}
          style={{ WebkitTapHighlightColor: 'transparent' }}
          title={isPlaying ? "Pause Video" : "Play Video"}
        >
          {isPlaying ? (
            <Pause className="h-6 w-6 text-foreground" />
          ) : (
            <Play className="ml-px h-6 w-6 text-foreground" />
          )}
        </Button>
      )}

      {/* Skip to End Button */}
      {onSeekToEnd && (
        <Button
          onClick={onSeekToEnd}
          size="sm"
          variant="ghost"
          className="h-7 w-7 bg-surface border-border text-foreground hidden sm:flex hover:bg-[hsl(0_0%_22%)]"
          onTouchStart={(e) => e.preventDefault()}
          style={{ WebkitTapHighlightColor: 'transparent' }}
          title="Jump to End"
        >
          <SkipForward className="h-[22px] w-[22px] text-foreground" />
        </Button>
      )}

      <div className="flex items-center space-x-1">
        {isEditingTime ? (
          <input
            ref={editInputRef}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitTimeEdit}
            onKeyDown={handleTimeKeyDown}
            className="w-16 text-xs font-extralight text-text-primary tabular-nums bg-surface border border-border rounded px-1 outline-none"
            title="Enter time in seconds or m:ss format"
            placeholder="0.00"
            autoFocus
          />
        ) : (
          <span
            data-playback-time="current"
            className={`text-xs font-extralight text-text-primary tabular-nums ${onSeekTo ? 'cursor-pointer select-none' : ''}`}
            onDoubleClick={handleTimeDoubleClick}
            title={onSeekTo ? 'Double-click to jump to time' : undefined}
          >
            {formatTime(currentTime)}
          </span>
        )}
        <span className="text-xs font-extralight text-text-tertiary">
          /
        </span>
        <span className="text-xs font-extralight text-text-secondary tabular-nums">
          {formatTime(totalDuration)}
        </span>
      </div>
    </>
  );
}; 