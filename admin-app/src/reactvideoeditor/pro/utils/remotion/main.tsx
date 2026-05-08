import React, { useCallback } from "react";
import { AbsoluteFill } from "remotion";
import type { FontInfo } from "@remotion/google-fonts";

import { Overlay } from "../../types";
import { SortedOutlines } from "../../components/selection/sorted-outlines";
import { Layer } from "./layer";
import { AlignmentGuides } from "../../components/selection/alignment-guides";
import { useAlignmentGuides } from "../../hooks/use-alignment-guides";
import { useEditorInteraction } from "../../contexts/editor-interaction-context";


/**
 * Props for the Main component.
 * Note: selectedOverlayId / setSelectedOverlayId / changeOverlay are intentionally
 * NOT here — they are read from EditorInteractionContext so that selection changes
 * do NOT invalidate Remotion's inputProps and trigger a full composition re-render.
 * They remain optional here only for SSR / root.tsx default-prop compatibility.
 */
export type MainProps = {
  /** Array of overlay objects to be rendered */
  readonly overlays: Overlay[];
  /** @deprecated Pass via EditorInteractionContext instead */
  readonly setSelectedOverlayId?: React.Dispatch<
    React.SetStateAction<number | null>
  >;
  /** @deprecated Pass via EditorInteractionContext instead */
  readonly selectedOverlayId?: number | null;
  /** @deprecated Pass via EditorInteractionContext instead */
  readonly changeOverlay?: (
    overlayId: number,
    updater: (overlay: Overlay) => Overlay
  ) => void;
  /** Duration in frames of the composition */
  readonly durationInFrames: number;
  /** Frames per second of the composition */
  readonly fps: number;
  /** Width of the composition */
  readonly width: number;
  /** Height of the composition */
  readonly height: number;
  /** Base URL for media assets (optional) */
  readonly baseUrl?: string;
  /** Whether to show alignment guides */
  readonly showAlignmentGuides?: boolean;
  /** Background color for the canvas */
  readonly backgroundColor?: string;
  /** Font infos for rendering (populated during SSR/Lambda rendering) */
  readonly fontInfos?: Record<string, FontInfo>;
};

const outer: React.CSSProperties = {
  backgroundColor: "white",
};
const layerContainer: React.CSSProperties = {
  overflow: "hidden",
  maxWidth: "3000px",
};

/**
 * Main component that renders a canvas-like area with overlays and their outlines.
 * Selection state is read from EditorInteractionContext (not inputProps) to avoid
 * triggering expensive full composition re-renders on every click.
 */
export const Main: React.FC<MainProps> = ({
  overlays,
  width,
  height,
  baseUrl,
  showAlignmentGuides = true,
  backgroundColor = "white",
  fontInfos,
  // Legacy/SSR fallbacks (used when context is unavailable)
  selectedOverlayId: selectedOverlayIdProp = null,
  setSelectedOverlayId: setSelectedOverlayIdProp,
  changeOverlay: changeOverlayProp,
}) => {
  // Prefer context values so that selection changes bypass Remotion's inputProps
  const interactionCtx = useEditorInteraction();
  const selectedOverlayId = interactionCtx?.selectedOverlayId ?? selectedOverlayIdProp;
  const setSelectedOverlayId = interactionCtx?.setSelectedOverlayId ?? setSelectedOverlayIdProp ?? (() => {});
  const changeOverlay = interactionCtx?.changeOverlay ?? changeOverlayProp ?? (() => {});
  // Initialize alignment guides hook with responsive snap threshold
  // Calculate snap threshold as a percentage of canvas size for consistent sensitivity
  const snapThreshold = Math.min(width, height) * 0.01; // 1% of the smaller dimension
  const alignmentGuides = useAlignmentGuides({
    canvasWidth: width,
    canvasHeight: height,
    snapThreshold,
  });

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) {
        return;
      }

      setSelectedOverlayId(null);
    },
    [setSelectedOverlayId]
  );

  return (
    <AbsoluteFill
      style={{
        ...outer,
        backgroundColor,
      }}
      onPointerDown={onPointerDown}
    >
      <AbsoluteFill style={layerContainer}>
        {overlays.map((overlay) => {
          return (
            <Layer
              key={overlay.id}
              overlay={overlay}
              {...(baseUrl && { baseUrl })}
              {...(fontInfos && { fontInfos })}
            />
          );
        })}
      </AbsoluteFill>
      <SortedOutlines
        selectedOverlayId={selectedOverlayId}
        overlays={overlays}
        changeOverlay={changeOverlay}
        alignmentGuides={alignmentGuides}
      />
      
      {/* Render alignment guides overlay */}
      {showAlignmentGuides && (
        <AlignmentGuides
          guideState={alignmentGuides.guideState}
          canvasWidth={width}
          canvasHeight={height}
        />
      )}
    </AbsoluteFill>
  );
};