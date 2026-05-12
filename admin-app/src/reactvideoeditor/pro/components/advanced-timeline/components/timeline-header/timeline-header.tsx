import React from 'react';
import { formatInTimeZone } from 'date-fns-tz';
import { ChevronDown, ChevronUp, ChevronsLeftRight, Crosshair, Magnet } from 'lucide-react';
import { ZoomControls } from './zoom-controls';
import { PlaybackControls } from './playback-controls';
import { SplittingToggle } from './splitting-toggle';
import { SplitAtSelectionButton } from './split-at-selection-button';
import { UndoRedoControls } from './undo-redo-controls';
import { AspectRatioDropdown } from './aspect-ratio-dropdown';
import { CanvasZoomDropdown, CanvasZoom } from './canvas-zoom-dropdown';
import { AspectRatio } from '../../../../types';
import { Overlay } from '../../../../types';

interface TimelineHeaderProps {
  totalDuration: number;
  currentTime?: number;
  showZoomControls?: boolean;
  zoomScale?: number;
  setZoomScale?: (scale: number, isDragging?: boolean) => void;
  resetZoom?: () => void;
  startSliderDrag?: () => void;
  endSliderDrag?: () => void;
  // Playback controls
  isPlaying?: boolean;
  onPlay?: () => void;
  onPause?: () => void;
  onSeekToStart?: () => void;
  onSeekToEnd?: () => void;
  showPlaybackControls?: boolean;
  // Playback speed controls
  playbackRate?: number;
  setPlaybackRate?: (rate: number) => void;
  // Auto-remove empty tracks
  autoRemoveEmptyTracks?: boolean;
  onToggleAutoRemoveEmptyTracks?: (enabled: boolean) => void;
  // Splitting mode (legacy - hidden)
  splittingEnabled?: boolean;
  onToggleSplitting?: (enabled: boolean) => void;
  // Split at selection (new functionality)
  onSplitAtSelection?: () => void;
  hasSelectedItem?: boolean;
  selectedItemsCount?: number;
  showSplitAtSelection?: boolean;
  // Gap removal mode toggle
  gapRemovalEnabled?: boolean;
  onGapRemovalEnabledChange?: (enabled: boolean) => void;
  // Snapping toggle
  snappingEnabled?: boolean;
  onSnappingEnabledChange?: (enabled: boolean) => void;
  // Hover marker toggle
  hoverMarkerEnabled?: boolean;
  onHoverMarkerEnabledChange?: (enabled: boolean) => void;
  // Seek to time (from editable timestamp)
  onSeekTo?: (timeInSeconds: number) => void;
  // Undo/Redo controls
  showUndoRedoControls?: boolean;
  canUndo?: boolean;
  canRedo?: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  // Aspect ratio controls
  aspectRatio?: AspectRatio;
  onAspectRatioChange?: (ratio: AspectRatio) => void;
  showAspectRatioControls?: boolean;
  // Canvas zoom controls
  canvasZoom?: CanvasZoom;
  onCanvasZoomChange?: (zoom: CanvasZoom) => void;
  // Visibility controls
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  // Debug export
  overlays?: Overlay[];
}

export const TimelineHeader: React.FC<TimelineHeaderProps> = ({
  totalDuration,
  currentTime = 0,
  showZoomControls = false,
  zoomScale,
  setZoomScale,
  resetZoom,
  startSliderDrag,
  endSliderDrag,
  isPlaying = false,
  onPlay,
  onPause,
  onSeekToStart,
  onSeekToEnd,
  showPlaybackControls = false,
  playbackRate = 1,
  setPlaybackRate,
  splittingEnabled = false,
  onToggleSplitting,
  onSplitAtSelection,
  hasSelectedItem = false,
  selectedItemsCount = 0,
  showSplitAtSelection = true,
  gapRemovalEnabled = false,
  onGapRemovalEnabledChange,
  snappingEnabled = true,
  onSnappingEnabledChange,
  hoverMarkerEnabled = true,
  onHoverMarkerEnabledChange,
  onSeekTo,
  showUndoRedoControls = false,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  aspectRatio = "16:9",
  onAspectRatioChange,
  showAspectRatioControls = true,
  canvasZoom = '75%',
  onCanvasZoomChange,
  isCollapsed = false,
  onToggleCollapse,
  // overlays = [],
}) => {
  const formatTime = (timeInSeconds: number) => {
    // Convert seconds to milliseconds
    const milliseconds = Math.round(timeInSeconds * 1000);
    // Use date-fns-tz to format in UTC timezone, avoiding local timezone offset issues
    return formatInTimeZone(milliseconds, 'UTC', 'm:ss.SS');
  };

  // Debug export function
  // const exportOverlaysAsTemplate = () => {
  //   const template = {
  //     id: `debug-export-${Date.now()}`,
  //     name: "Debug Export",
  //     description: "Debug export of current overlays",
  //     createdAt: new Date().toISOString(),
  //     updatedAt: new Date().toISOString(),
  //     createdBy: {
  //       id: "debug-user",
  //       name: "Debug User"
  //     },
  //     category: "Debug",
  //     tags: ["debug", "export"],
  //     duration: totalDuration,
  //     aspectRatio: aspectRatio,
  //     overlays: overlays
  //   };

  //   // Create and download JSON file
  //   const dataStr = JSON.stringify(template, null, 2);
  //   const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
  //   const exportFileDefaultName = `debug-overlays-${Date.now()}.json`;
    
  //   const linkElement = document.createElement('a');
  //   linkElement.setAttribute('href', dataUri);
  //   linkElement.setAttribute('download', exportFileDefaultName);
  //   linkElement.click();

  //   // Also log to console for easy copying
  //   console.log('Exported overlays:', template);
  // };

  return (
    <div className="bg-background box-border h-11 flex justify-between items-center border border-border px-3">
      {/* Left section: Undo/Redo and Split at Selection */}
      <div className="flex items-center gap-2 flex-1 justify-start">
        {showUndoRedoControls && onUndo && onRedo && (
          <UndoRedoControls
            canUndo={canUndo}
            canRedo={canRedo}
            onUndo={onUndo}
            onRedo={onRedo}
          />
        )}
     
        {/* Legacy splitting toggle - hidden but kept for backward compatibility */}
        {false && onToggleSplitting && (
          <SplittingToggle
            enabled={splittingEnabled}
            onToggle={onToggleSplitting!}
          />
        )}

        {/* New split at selection button */}
        {showSplitAtSelection && onSplitAtSelection && (
          <SplitAtSelectionButton
            onSplitAtSelection={onSplitAtSelection}
            hasSelectedItem={hasSelectedItem}
            selectedItemsCount={selectedItemsCount}
          />
        )}

        {onGapRemovalEnabledChange && (
          <button
            type="button"
            onClick={() => onGapRemovalEnabledChange(!gapRemovalEnabled)}
            title={gapRemovalEnabled ? "Disable gap removal" : "Enable gap removal"}
            className={`h-7 w-7 inline-flex items-center justify-center rounded-md border text-xs transition-colors ${
              gapRemovalEnabled
                ? "bg-[hsl(var(--warning)/0.15)] border-[hsl(var(--warning)/0.35)] text-warning"
                : "bg-surface border-border text-text-secondary hover:bg-[hsl(0_0%_22%)]"
            }`}
          >
            <ChevronsLeftRight className="h-3.5 w-3.5" />
          </button>
        )}

        {onSnappingEnabledChange && (
          <button
            type="button"
            onClick={() => onSnappingEnabledChange(!snappingEnabled)}
            title={snappingEnabled ? "Disable snapping" : "Enable snapping"}
            className={`h-7 w-7 inline-flex items-center justify-center rounded-md border text-xs transition-colors ${
              snappingEnabled
                ? "bg-surface border-border text-text-secondary hover:bg-[hsl(0_0%_22%)]"
                : "bg-[hsl(var(--warning)/0.15)] border-[hsl(var(--warning)/0.35)] text-warning"
            }`}
          >
            <Magnet className="h-3.5 w-3.5" />
          </button>
        )}

        {onHoverMarkerEnabledChange && (
          <button
            type="button"
            onClick={() => onHoverMarkerEnabledChange(!hoverMarkerEnabled)}
            title={hoverMarkerEnabled ? "Hide hover marker" : "Show hover marker"}
            className={`h-7 w-7 inline-flex items-center justify-center rounded-md border text-xs transition-colors ${
              hoverMarkerEnabled
                ? "bg-surface border-border text-text-secondary hover:bg-[hsl(0_0%_22%)]"
                : "bg-[hsl(var(--warning)/0.15)] border-[hsl(var(--warning)/0.35)] text-warning"
            }`}
          >
            <Crosshair className="h-3.5 w-3.5" />
          </button>
        )}

        {/* Debug Export Button - Comment out this section to hide */}
        {/* {true && (
          <button
            onClick={exportOverlaysAsTemplate}
            className="px-3 py-1.5 text-xs bg-orange-500 hover:bg-orange-600 text-white rounded-md font-medium transition-colors"
            title="Export overlays as JSON template (Debug)"
          >
            Debug Export
          </button>
        )} */}
      </div>

      {/* Center section: Playback controls */}
      <div className="flex items-center justify-center gap-2 grow">
        {showPlaybackControls && (
          <PlaybackControls
            isPlaying={isPlaying}
            onPlay={onPlay}
            onPause={onPause}
            onSeekToStart={onSeekToStart}
            onSeekToEnd={onSeekToEnd}
            currentTime={currentTime}
            totalDuration={totalDuration}
            formatTime={formatTime}
            playbackRate={playbackRate}
            setPlaybackRate={setPlaybackRate}
            onSeekTo={onSeekTo}
          />
        )}
      </div>

      {/* Right section: Aspect Ratio, Zoom Controls and Scale Display */}
      <div className="flex items-center gap-3 flex-1 justify-end">
        {showAspectRatioControls && onAspectRatioChange && (
          <AspectRatioDropdown
            aspectRatio={aspectRatio}
            onAspectRatioChange={onAspectRatioChange}
          />
        )}
        {onCanvasZoomChange && (
          <CanvasZoomDropdown
            canvasZoom={canvasZoom}
            onCanvasZoomChange={onCanvasZoomChange}
          />
        )}
        {showZoomControls && zoomScale !== undefined && setZoomScale && (
          <ZoomControls
            zoomScale={zoomScale}
            setZoomScale={setZoomScale}
            resetZoom={resetZoom}
            startSliderDrag={startSliderDrag}
            endSliderDrag={endSliderDrag}
          />
        )}
        
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            className="h-7 w-7 inline-flex items-center justify-center hover:bg-[hsl(0_0%_22%)] rounded-md transition-colors text-foreground"
            title={isCollapsed ? "Expand Timeline" : "Collapse Timeline"}
            type="button"
          >
            {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  );
};