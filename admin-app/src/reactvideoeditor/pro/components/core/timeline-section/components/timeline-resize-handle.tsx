import React from 'react';

interface TimelineResizeHandleProps {
  onMouseDown: (e: React.MouseEvent) => void;
  onTouchStart: (e: React.TouchEvent) => void;
  isResizing: boolean;
}

/**
 * Draggable resize handle component for the timeline
 * Allows users to adjust the height of the timeline by dragging up or down
 * Supports both mouse and touch interactions for mobile devices
 */
export const TimelineResizeHandle: React.FC<TimelineResizeHandleProps> = ({ 
  onMouseDown, 
  onTouchStart,
  isResizing 
}) => {
  return (
    <div
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
      className={`
        h-1.5 bg-border/80 hover:bg-blue-500/20 transition-colors cursor-ns-resize touch-none
        flex items-center justify-center group relative
        ${isResizing ? 'bg-blue-500/30' : ''}
      `}
    >
      {/* Visual indicator for the resize handle */}
      <div
        className={`absolute left-1/2 top-1/2 h-1 w-20 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.55)] transition-colors ${
          isResizing ? 'bg-blue-500' : 'bg-blue-500/85 group-hover:bg-blue-500'
        }`}
      />

    </div>
  );
};

