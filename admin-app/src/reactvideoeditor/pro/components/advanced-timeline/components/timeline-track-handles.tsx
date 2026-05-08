import React, { useRef, useCallback, useState } from 'react';
import { TimelineTrack as TimelineTrackType } from '../types';
import { TIMELINE_CONSTANTS } from '../constants';
import { GripVertical, Trash2, Magnet } from 'lucide-react';

interface TimelineTrackHandlesProps {
  tracks: TimelineTrackType[];
  onTrackReorder?: (fromIndex: number, toIndex: number) => void;
  onTrackDelete?: (trackId: string) => void;
  onToggleMagnetic?: (trackId: string) => void;
  enableTrackDrag?: boolean;
  enableMagneticTrack?: boolean;
  enableTrackDelete?: boolean;
}

export const TimelineTrackHandles: React.FC<TimelineTrackHandlesProps> = ({
  tracks,
  onTrackReorder,
  onTrackDelete,
  onToggleMagnetic,
}) => {
  const dragIndexRef = useRef<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = useCallback((index: number) => (e: React.DragEvent<HTMLDivElement>) => {
    dragIndexRef.current = index;
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    // For Firefox compatibility
    e.dataTransfer.setData('text/plain', String(index));
  }, []);

  const handleDragOver = useCallback((index: number) => (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback((toIndex: number) => (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const fromIndex = dragIndexRef.current ?? parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (!Number.isNaN(fromIndex) && fromIndex !== toIndex) {
      onTrackReorder?.(fromIndex, toIndex);
    }
    dragIndexRef.current = null;
    setIsDragging(false);
    setDragOverIndex(null);
  }, [onTrackReorder]);

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setDragOverIndex(null);
    dragIndexRef.current = null;
  }, []);

  return (
    <div 
      className="flex flex-col h-full bg-background border-r border-border border-l overflow-hidden"
      style={{ 
        width: `${TIMELINE_CONSTANTS.HANDLE_WIDTH}px`,
      }}
    >
      {/* Header spacer to match TimelineMarkers height - fixed at top */}
      <div 
        className="shrink-0 bg-background border-b border-border"
        style={{ height: `${TIMELINE_CONSTANTS.MARKERS_HEIGHT}px` }}
      />
      
      {/* Track handles - scrollable, matches TimelineTrack structure */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide track-handles-scroll">
        {tracks.map((track, index) => {
          const isBeingDragged = isDragging && dragIndexRef.current === index;
          const isDropTarget = dragOverIndex === index && dragIndexRef.current !== index;
          const rowToneClass = index % 2 === 0
            ? 'bg-[hsl(0_0%_14%)] hover:bg-[hsl(0_0%_19%)]'
            : 'bg-[hsl(0_0%_17%)] hover:bg-[hsl(0_0%_22%)]';
          
          // Enhanced visual feedback classes
          const getTrackClasses = () => {
            const baseClasses = `track flex items-center px-3 gap-1 border-border ${rowToneClass}`;
            
            if (isBeingDragged) {
              // Track being dragged - make it very obvious
              return `${baseClasses} border-l-[2px] border-l-border transform scale-105 z-50 opacity-90`;
            } else if (isDropTarget) {
              // Drop target - highlight clearly
              return `${baseClasses} bg-[hsl(0_0%_24%)] border-l-[2px] border-l-primary scale-102`;
            } else if (isDragging) {
              // Other tracks during drag - subtle dimming
              return `${baseClasses} opacity-70`;
            }
            
            // Default state
            return baseClasses;
          };
          
          return (
            <div
              key={track.id}
              className={getTrackClasses()}
              style={{ 
                height: `${TIMELINE_CONSTANTS.TRACK_HEIGHT}px`
              }}
              onDragOver={handleDragOver(index)}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop(index)}
            >

              {/* Drag handle */}
              <div
                className={`flex items-center justify-center w-9 h-6 rounded select-none transition-all duration-150 ${
                  isBeingDragged 
                    ? 'bg-black/30 cursor-grabbing border border-white/20' 
                    : 'hover:bg-[hsl(0_0%_22%)] cursor-grab border border-transparent hover:border-white/15'
                }`}
                draggable
                onDragStart={handleDragStart(index)}
                onDragEnd={handleDragEnd}
                title="Reorder track"
              >
                <GripVertical className={`w-3 h-3 ${isBeingDragged ? 'text-primary' : 'text-slate-200/85'}`} />
              </div>


              {/* Magic (magnetic) toggle */}
              <button
                type="button"
                className={`w-9 h-6 inline-flex items-center justify-center rounded transition-colors ${track.magnetic ? 'text-warning bg-[hsl(var(--warning)/0.15)] border border-[hsl(var(--warning)/0.35)] hover:bg-[hsl(var(--warning)/0.22)]' : 'text-slate-300 hover:bg-[hsl(0_0%_22%)] hover:text-amber-300 border border-transparent hover:border-white/15'}`}
                onClick={() => onToggleMagnetic?.(track.id)}
                title={track.magnetic ? 'Disable magnetic timeline' : 'Enable magnetic timeline'}
              >
                <Magnet className="w-3 h-3" />
              </button>

              {/* Delete track */}
              <button
                type="button"
                className="w-9 h-6 inline-flex items-center justify-center rounded border border-transparent text-slate-300 hover:border-[hsl(var(--destructive)/0.35)] hover:bg-[hsl(var(--destructive)/0.16)] hover:text-destructive transition-colors"
                onClick={() => onTrackDelete?.(track.id)}
                title="Delete track"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};