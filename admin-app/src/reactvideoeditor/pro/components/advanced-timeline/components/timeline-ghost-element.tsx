import React from "react";
import { TIMELINE_CONSTANTS } from "../constants";

interface GhostElementProps {
  left: number;
  width: number;
  top: number;
  isTransitioning?: boolean;
}

interface TimelineGhostElementProps {
  ghostElement: GhostElementProps;
  rowIndex: number;
  trackCount: number;
  isValidDrop?: boolean;
  isFloating?: boolean;
  floatingPosition?: { x: number; y: number };
  itemData?: {
    type?: string;
    label?: string;
  };
}

/**
 * Renders a ghost element on the timeline during drag-and-drop operations.
 * This component provides a visual cue for where an element will be placed if dropped.
 * It changes appearance based on whether the drop target is valid.
 *
 * Supports two modes:
 * 1. Row-aligned mode (original): Ghost snaps to specific rows
 * 2. Floating mode (new): Ghost follows mouse position exactly for smoother transitions
 */
export const TimelineGhostElement: React.FC<TimelineGhostElementProps> = ({
  ghostElement,
  rowIndex,
  trackCount,
  isValidDrop = true,
  isFloating = false,
  floatingPosition,
  itemData,
}) => {
  if (isFloating) {
    return (
      <div
        className="fixed rounded-[3px] pointer-events-none z-9999 flex items-center justify-center"
        style={{
          left: floatingPosition?.x || 0,
          top: floatingPosition?.y || 0,
          width: `100px`,
          height: `${TIMELINE_CONSTANTS.TRACK_ITEM_HEIGHT}px`,
          backgroundColor: "transparent",
          border: "1px solid rgba(148, 163, 184, 0.75)",
          willChange: "transform",
          transform: "translate(-50%, -50%)",
        }}
      >
        {itemData && (
          <div className="text-xs font-light text-white/90 text-center px-2 truncate">
          </div>
        )}
      </div>
    );
  }

  // Use the same calculation as ghost creation to avoid floating-point precision issues
  // Ghost creation: trackIndex * (100 / trackCount) = ghost.top
  // So: trackIndex = ghost.top * trackCount / 100
  if (Math.round(ghostElement.top * trackCount / 100) !== rowIndex) {
    return null;
  }

  return (
    <div
      className="absolute top-1/2 transform -translate-y-1/2 rounded-[3px] pointer-events-none"
      style={{
        left: `${ghostElement.left}%`,
        width: `${Math.max(ghostElement.width, 0.1)}%`,
        height: `${TIMELINE_CONSTANTS.TRACK_ITEM_HEIGHT}px`,
        zIndex: 50,
        backgroundColor: "transparent",
        border: "1px solid rgba(148, 163, 184, 0.75)",
        willChange: "transform",
      }}
    />
  );
}; 