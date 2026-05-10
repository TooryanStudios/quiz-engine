import React, { useCallback, useEffect, useMemo, useState, useRef } from "react";
import { Player, PlayerRef } from "@remotion/player";
import { Main } from "../../utils/remotion/main";
import { useEditorContext } from "../../contexts/editor-context";
import { EditorInteractionContext } from "../../contexts/editor-interaction-context";

/**
 * Props for the VideoPlayer component
 * @interface VideoPlayerProps
 * @property {React.RefObject<PlayerRef>} [playerRef] - Optional reference to the Remotion player instance (overrides context playerRef)
 * @property {string} [className] - Optional CSS class name
 * @property {React.CSSProperties} [style] - Optional inline styles
 * @property {boolean} [isPlayerOnly] - Whether to render in player-only mode (no editor UI)
 */
export interface VideoPlayerProps {
  playerRef?: React.RefObject<PlayerRef | null>;
  className?: string;
  style?: React.CSSProperties;
  isPlayerOnly?: boolean;
}

/**
 * VideoPlayer component that renders a responsive video editor with overlay support
 * The player automatically resizes based on its container and maintains the specified aspect ratio
 * This component is fully context-aware and automatically connects to the editor state
 * 
 * When used within ReactVideoEditorProvider, it automatically:
 * - Gets the playerRef from context (no manual passing required)
 * - Connects to all editor state and handlers
 * - Handles playback control through the context
 */
export const VideoPlayer: React.FC<VideoPlayerProps> = ({ 
  playerRef: externalPlayerRef,
  className,
  style,
  isPlayerOnly = false,
}) => {
  const context = useEditorContext();
  
  if (!context) {
    throw new Error('VideoPlayer must be used within ReactVideoEditorProvider');
  }

  const {
    overlays,
    setSelectedOverlayId,
    changeOverlay,
    selectedOverlayId,
    aspectRatio,
    playerDimensions,
    updatePlayerDimensions,
    getAspectRatioDimensions,
    durationInFrames,
    fps,
    playbackRate,
    playerRef: contextPlayerRef, // Get playerRef from context
    showAlignmentGuides,
    backgroundColor,
    canvasZoom,
  } = context;

  // Use external playerRef if provided, otherwise use context playerRef
  // This allows for override when needed but defaults to context
  const playerRef = externalPlayerRef || contextPlayerRef;

  // State to track actual container dimensions
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
  
  // Ref to track the container element
  const containerRef = useRef<HTMLDivElement>(null);

  /**
   * Updates the player dimensions when the container size or aspect ratio changes
   */
  useEffect(() => {
    const handleDimensionUpdate = (containerElement: Element) => {
      const { width, height } = containerElement.getBoundingClientRect();
      setContainerDimensions({ width, height });
      updatePlayerDimensions(width, height);
    };

    let containerElement: Element | null = null;
    let resizeObserver: ResizeObserver | null = null;
    
    if (isPlayerOnly) {
      // In player-only mode, use the ref to the container
      containerElement = containerRef.current;
    } else {
      // In editor mode, use the video-container as before
      containerElement = document.querySelector(".video-container");
    }
    
    if (containerElement) {
      // Initial update
      handleDimensionUpdate(containerElement);
      
      // Use ResizeObserver to watch for container size changes
      resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          handleDimensionUpdate(entry.target);
        }
      });
      
      resizeObserver.observe(containerElement);
    }

    // Fallback: also listen to window events for orientation changes
    const handleOrientationChange = () => {
      setTimeout(() => {
        if (containerElement) {
          handleDimensionUpdate(containerElement);
        }
      }, 100);
    };
    window.addEventListener("orientationchange", handleOrientationChange);

    return () => {
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      window.removeEventListener("orientationchange", handleOrientationChange);
    };
  }, [aspectRatio, updatePlayerDimensions, isPlayerOnly]);

  // Use actual project dimensions for the composition
  const { width: compositionWidth, height: compositionHeight } = getAspectRatioDimensions();

  // Constants for player configuration
  const PLAYER_CONFIG = {
    durationInFrames: Math.max(1, Math.round(durationInFrames)),
    fps: fps,
  };

  // Calculate optimal player size based on container and composition dimensions
  const playerSize = useMemo(() => {
    const containerWidth = containerDimensions.width || playerDimensions.width;
    const containerHeight = containerDimensions.height || playerDimensions.height;
    
    return {
      width: Math.min(containerWidth, compositionWidth),
      height: Math.min(containerHeight, compositionHeight),
    };
  }, [containerDimensions, playerDimensions, compositionWidth, compositionHeight]);


  // inputProps intentionally does NOT include selectedOverlayId / setSelectedOverlayId /
  // changeOverlay — those are passed via EditorInteractionContext so that selection
  // changes do NOT invalidate inputProps and force a full Remotion composition re-render.
  const editorInputProps = useMemo(() => ({
    overlays,
    durationInFrames,
    fps: fps,
    width: compositionWidth,
    height: compositionHeight,
    showAlignmentGuides,
    backgroundColor,
  }), [
    overlays,
    durationInFrames,
    fps,
    compositionWidth,
    compositionHeight,
    showAlignmentGuides,
    backgroundColor,
  ]);

  // Memoize inputProps for player-only mode (guides disabled).
  const playerOnlyInputProps = useMemo(() => ({
    overlays,
    durationInFrames,
    fps: fps,
    width: compositionWidth,
    height: compositionHeight,
    showAlignmentGuides: false,
    backgroundColor,
  }), [
    overlays,
    durationInFrames,
    fps,
    compositionWidth,
    compositionHeight,
    backgroundColor,
  ]);

  // Stable context value for interactive selection state.
  // Kept out of inputProps so Remotion doesn't re-render the composition on every click.
  const interactionContextValue = useMemo(() => ({
    selectedOverlayId,
    setSelectedOverlayId,
    changeOverlay,
  }), [selectedOverlayId, setSelectedOverlayId, changeOverlay]);

  const handleEditorBackgroundPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || e.target !== e.currentTarget) {
      return;
    }

    setSelectedOverlayId(null);
  }, [setSelectedOverlayId]);

  return (
    <EditorInteractionContext.Provider value={interactionContextValue}>
    <div ref={containerRef} className={`w-full h-full overflow-hidden ${className || ''}`} style={style}>
      {/* Conditional rendering based on player mode */}
      {!isPlayerOnly ? (
        /* Editor mode: Grid background container */
        <div
          onPointerDown={handleEditorBackgroundPointerDown}
          className={`z-0 video-container relative w-full h-full select-none
          bg-[hsl(0_0%_14%)]
          bg-[linear-gradient(to_right,#73737340_1px,transparent_1px),linear-gradient(to_bottom,#73737340_1px,transparent_1px)]
          bg-size-[32px_32px] 
          shadow-lg ${canvasZoom !== 'fit' ? 'overflow-auto' : 'overflow-hidden'}`}
        >
          {/* Player wrapper with centering */}
          <div
            className={`z-10 ${canvasZoom === 'fit' ? 'absolute inset-2 sm:inset-4 flex items-center justify-center' : 'flex items-center justify-center min-h-full min-w-full p-4'}`}
            onPointerDown={handleEditorBackgroundPointerDown}
          >
            <div
              className="relative mx-2 sm:mx-0"
              style={
                canvasZoom === 'fit'
                  ? {
                      width: Math.min(playerDimensions.width, compositionWidth),
                      height: Math.min(playerDimensions.height, compositionHeight),
                      maxWidth: "100%",
                      maxHeight: "100%",
                    }
                  : {
                      width: canvasZoom === '100%' ? compositionWidth : compositionWidth * 0.5,
                      height: canvasZoom === '100%' ? compositionHeight : compositionHeight * 0.5,
                    }
              }
            >
              <Player
                ref={playerRef}
                className="w-full h-full"
                component={Main}
                compositionWidth={compositionWidth}
                compositionHeight={compositionHeight}
                style={{
                  width: "100%",
                  height: "100%",
                }}
                durationInFrames={PLAYER_CONFIG.durationInFrames}
                fps={PLAYER_CONFIG.fps}
                playbackRate={playbackRate}
                acknowledgeRemotionLicense={true}
                inputProps={editorInputProps}
                errorFallback={() => <></>}
                overflowVisible
              />
            </div>
          </div>
        </div>
      ) : (
        /* Player-only mode: Simple centered container */
        <div className="w-full h-full flex items-center justify-center bg-black">
          <div
            className="relative"
            style={{
              width: playerSize.width,
              height: playerSize.height,
              maxWidth: "100%",
              maxHeight: "100%",
            }}
          >
            <Player
              ref={playerRef}
              className="w-full h-full"
              component={Main}
              compositionWidth={compositionWidth}
              compositionHeight={compositionHeight}
              style={{
                width: "100%",
                height: "100%",
              }}
              acknowledgeRemotionLicense={true}
              durationInFrames={PLAYER_CONFIG.durationInFrames}
              fps={PLAYER_CONFIG.fps}
              playbackRate={playbackRate}
              inputProps={playerOnlyInputProps}
              errorFallback={() => <></>}
              overflowVisible
            />
          </div>
        </div>
      )}
    </div>
    </EditorInteractionContext.Provider>
  );
};
